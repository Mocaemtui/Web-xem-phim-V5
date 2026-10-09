import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name })
      .select("displayName avatarUrl accentColor bio featuredBadge playlists xp level streak claimedQuests")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    return NextResponse.json({
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl || "",
      accentColor: user.accentColor || "cyan",
      bio: user.bio || "",
      featuredBadge: user.featuredBadge || "",
      playlists: user.playlists || [],
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      claimedQuests: user.claimedQuests || [],
    });
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

    const { displayName, avatarUrl, oldPassword, newPassword, accentColor, bio, featuredBadge } = await req.json();

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // Handle password change
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ message: "Mật khẩu mới phải từ 6 ký tự trở lên" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // Handle profile info change
    if (displayName !== undefined) {
      if (displayName.trim().length < 2) {
        return NextResponse.json({ message: "Tên hiển thị phải có từ 2 ký tự trở lên" }, { status: 400 });
      }
      user.displayName = displayName.trim();
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    if (accentColor !== undefined) {
      user.accentColor = accentColor;
    }

    if (bio !== undefined) {
      if (bio.length > 200) {
        return NextResponse.json({ message: "Tiểu sử không được vượt quá 200 ký tự" }, { status: 400 });
      }
      user.bio = bio.trim();
    }

    if (featuredBadge !== undefined) {
      user.featuredBadge = featuredBadge;
    }

    await user.save();

    return NextResponse.json({
      message: "Cập nhật hồ sơ thành công",
      user: {
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl || "",
        accentColor: user.accentColor || "cyan",
        bio: user.bio || "",
        featuredBadge: user.featuredBadge || "",
        xp: user.xp || 0,
        level: user.level || 1,
        streak: user.streak || 0,
        claimedQuests: user.claimedQuests || [],
      }
    });
  } catch (error) {
    console.error("Lỗi cập nhật hồ sơ:", error);
    return NextResponse.json({ message: "Lỗi hệ thống, vui lòng thử lại sau" }, { status: 500 });
  }
}
