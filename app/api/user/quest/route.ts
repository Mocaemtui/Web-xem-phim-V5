import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { questId, xpReward } = await req.json();
    if (!questId || typeof xpReward !== "number") {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy người dùng" }, { status: 404 });
    }

    const now = new Date();
    const todayStr = now.toDateString();

    // 1. Check if already claimed today
    const alreadyClaimed = user.claimedQuests.some(
      (q: any) => q.questId === questId && new Date(q.claimedAt).toDateString() === todayStr
    );

    if (alreadyClaimed) {
      return NextResponse.json({ message: "Nhiệm vụ này đã được nhận hôm nay" }, { status: 400 });
    }

    // 2. Validate quest conditions against database logs
    if (questId === "night") {
      const hasWatchedAtNight = user.watchHistory.some((item: any) => {
        const watchedDate = new Date(item.watchedAt);
        const hour = watchedDate.getHours();
        return watchedDate.toDateString() === todayStr && (hour >= 23 || hour <= 5);
      });
      if (!hasWatchedAtNight) {
        return NextResponse.json({ message: "Bạn chưa hoàn thành điều kiện xem phim đêm" }, { status: 400 });
      }
    } else if (questId === "daily_watch") {
      const hasWatchedToday = user.watchHistory.some((item: any) => {
        const watchedDate = new Date(item.watchedAt);
        return watchedDate.toDateString() === todayStr;
      });
      if (!hasWatchedToday) {
        return NextResponse.json({ message: "Bạn chưa hoàn thành điều kiện xem phim hôm nay" }, { status: 400 });
      }
    } else if (questId === "profile_edit") {
      const updatedDate = new Date(user.updatedAt);
      const hasUpdatedToday = updatedDate.toDateString() === todayStr;
      if (!hasUpdatedToday) {
        return NextResponse.json({ message: "Bạn chưa cập nhật thông tin hồ sơ hôm nay" }, { status: 400 });
      }
    } else if (questId === "login") {
      // Login is validated during streak checking, but if called manually, ensure lastLoginDate is today
      if (!user.lastLoginDate || new Date(user.lastLoginDate).toDateString() !== todayStr) {
        return NextResponse.json({ message: "Bạn chưa đăng nhập hôm nay" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: "Nhiệm vụ không tồn tại" }, { status: 400 });
    }

    // 3. Update XP and Level
    user.claimedQuests.push({ questId, claimedAt: now });
    user.xp = (user.xp || 0) + xpReward;
    user.level = Math.floor(user.xp / 100) + 1;

    await user.save();

    return NextResponse.json({
      success: true,
      xp: user.xp,
      level: user.level,
      claimedQuests: user.claimedQuests,
    });
  } catch (error) {
    console.error("Lỗi nhận thưởng nhiệm vụ:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
