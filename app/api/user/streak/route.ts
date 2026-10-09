import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy người dùng" }, { status: 404 });
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let claimedToday = false;
    let xpReward = 0;

    if (user.lastLoginDate) {
      const lastLogin = new Date(user.lastLoginDate);
      const lastLoginMidnight = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      
      const diffTime = todayMidnight.getTime() - lastLoginMidnight.getTime();
      const dayDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (dayDiff === 0) {
        // Already logged in today
        return NextResponse.json({
          streak: user.streak || 1,
          xpReward: 0,
          claimedToday: false,
          xp: user.xp || 0,
          level: user.level || 1,
        });
      } else if (dayDiff === 1) {
        // Continued streak
        user.streak = (user.streak || 0) + 1;
        xpReward = 10;
        claimedToday = true;
      } else {
        // Streak broken
        user.streak = 1;
        xpReward = 10;
        claimedToday = true;
      }
    } else {
      // First time login tracking
      user.streak = 1;
      xpReward = 10;
      claimedToday = true;
    }

    user.lastLoginDate = now;
    user.xp = (user.xp || 0) + xpReward;
    user.level = Math.floor(user.xp / 100) + 1;

    // Check if the user already has a login quest claimed today in claimedQuests
    const todayStr = now.toDateString();
    const hasQuestToday = user.claimedQuests.some(
      (q: any) => q.questId === "login" && new Date(q.claimedAt).toDateString() === todayStr
    );
    if (!hasQuestToday) {
      user.claimedQuests.push({ questId: "login", claimedAt: now });
    }

    await user.save();

    return NextResponse.json({
      streak: user.streak,
      xpReward,
      claimedToday,
      xp: user.xp,
      level: user.level,
    });
  } catch (error) {
    console.error("Lỗi cập nhật streak đăng nhập:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
