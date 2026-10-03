import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import User, { IWatchHistoryItem } from "@/models/User";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name }).select("watchHistory").lean();

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    return NextResponse.json({ history: user.watchHistory || [] });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { movie, episodeName, serverName, currentServerIndex, currentEpisodeIndex, currentTime, duration } = await req.json();

    if (!movie?.slug) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name }).select("watchHistory");

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    // Xóa bộ phim này nếu đã có trong lịch sử (để đẩy lên đầu)
    const filteredHistory = user.watchHistory.filter((item: IWatchHistoryItem) => item.slug !== movie.slug);

    const newItem = {
      slug: movie.slug,
      name: movie.name,
      origin_name: movie.origin_name,
      poster_url: movie.poster_url,
      thumb_url: movie.thumb_url,
      year: movie.year,
      country: movie.country?.[0]?.name || movie.country,
      time: movie.time,
      quality: movie.quality,
      episodeName,
      serverName,
      currentServerIndex,
      currentEpisodeIndex,
      currentTime,
      duration,
      watchedAt: Date.now(),
    };

    // Thêm vào đầu và giới hạn 50 bộ phim
    user.watchHistory = [newItem, ...filteredHistory].slice(0, 50);
    await user.save();

    return NextResponse.json({ message: "Đã lưu lịch sử lên Đám mây", history: user.watchHistory });
  } catch (error) {
    console.error("Lỗi POST history:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const clearAll = searchParams.get("clearAll");

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name }).select("watchHistory");

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    if (clearAll === "true") {
      user.watchHistory = [];
    } else if (slug) {
      user.watchHistory = user.watchHistory.filter((item: IWatchHistoryItem) => item.slug !== slug);
    } else {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await user.save();

    return NextResponse.json({ message: "Đã xóa lịch sử", history: user.watchHistory });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
