import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export const revalidate = 600; // Cache Bảng xếp hạng 10 phút để tải tức thì

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch users sorted by XP using DB index, limit to 10
    const users = await User.find({})
      .sort({ xp: -1 })
      .limit(10)
      .select("username displayName avatarUrl accentColor bio level xp featuredBadge")
      .lean();

    const leaderboard = users.map((u: any) => {
      return {
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl || "",
        accentColor: u.accentColor || "cyan",
        bio: u.bio || "",
        level: u.level || 1,
        xp: u.xp || 0,
        featuredBadge: u.featuredBadge || "",
      };
    });

    // If less than 5, pad with mock competitors to keep it full
    const mockRivals = [
      { username: "Luffy_Mũ_Rơm", displayName: "Luffy_Mũ_Rơm", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Luffy", accentColor: "sunset", bio: "Tôi sẽ trở thành Vua Hải Tặc!", level: 5, xp: 450, featuredBadge: "🏆" },
      { username: "Gojo_Satoru", displayName: "Gojo_Satoru", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Gojo", accentColor: "purple", bio: "Đừng lo, thầy đây là vô địch mà.", level: 3, xp: 280, featuredBadge: "⚡" },
      { username: "Nezuko_Chan", displayName: "Nezuko_Chan", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nezuko", accentColor: "pink", bio: "Mmmm... Mmm! 🎋", level: 2, xp: 150, featuredBadge: "🌸" },
      { username: "Mikasa_Ackerman", displayName: "Mikasa_Ackerman", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mikasa", accentColor: "red", bio: "Tôi sẽ bảo vệ Eren.", level: 2, xp: 120, featuredBadge: "🧣" }
    ];

    while (leaderboard.length < 5 && mockRivals.length > 0) {
      const mock = mockRivals.shift();
      if (mock && !leaderboard.some(u => u.username === mock.username)) {
        leaderboard.push(mock);
      }
    }

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Lỗi lấy bảng xếp hạng:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
