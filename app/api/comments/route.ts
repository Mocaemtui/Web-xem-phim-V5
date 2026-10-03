import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import Comment from "@/models/Comment";
import fs from "fs";
import path from "path";
import { initWebPush, webpush } from "@/lib/webpush";

const SUB_FILE = path.join(process.cwd(), "data", "subscriptions.json");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const movieSlug = searchParams.get("movieSlug");

    if (!movieSlug) {
      return NextResponse.json({ message: "movieSlug là bắt buộc" }, { status: 400 });
    }

    await connectToDatabase();
    const comments = await Comment.find({ movieSlug })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Lỗi GET comments:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { movieSlug, movieName, content } = await req.json();

    if (!movieSlug || !movieName || !content || !content.trim()) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await connectToDatabase();
    const newComment = await Comment.create({
      movieSlug,
      movieName,
      username: session.user.name,
      content: content.trim(),
    });

    // Send Push Notifications to other users who have bookmarked/subscribed to this movie
    try {
      if (fs.existsSync(SUB_FILE)) {
        let subscriptions: any[] = [];
        try {
          subscriptions = JSON.parse(fs.readFileSync(SUB_FILE, "utf8"));
        } catch (e) {
          subscriptions = [];
        }

        const targets = subscriptions.filter(
          (sub: any) => sub.movieSlug === movieSlug
        );

        if (targets.length > 0) {
          initWebPush();

          const payload = JSON.stringify({
            title: `${movieName} - Bình luận mới! 💬`,
            body: `${session.user.name}: "${content.substring(0, 60)}${content.length > 60 ? "..." : ""}"`,
            url: `/phim/${movieSlug}#comments`,
          });

          const results = await Promise.allSettled(
            targets.map(async (target: any) => {
              try {
                await webpush.sendNotification(target.subscription, payload);
                return { status: "success", target };
              } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  return { status: "expired", target };
                }
                throw err;
              }
            })
          );

          // Clean up expired subscriptions
          const expiredEndpoints = new Set<string>();
          results.forEach((res) => {
            if (res.status === "fulfilled" && res.value.status === "expired") {
              expiredEndpoints.add(res.value.target.subscription.endpoint);
            }
          });

          if (expiredEndpoints.size > 0) {
            const activeSubscriptions = subscriptions.filter(
              (sub: any) => !expiredEndpoints.has(sub.subscription.endpoint)
            );
            fs.writeFileSync(SUB_FILE, JSON.stringify(activeSubscriptions, null, 2), "utf8");
          }
        }
      }
    } catch (pushError) {
      console.error("Lỗi gửi push notification cho bình luận:", pushError);
    }

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error) {
    console.error("Lỗi POST comments:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
