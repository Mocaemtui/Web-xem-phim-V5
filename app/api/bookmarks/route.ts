import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
    const user = await User.findOne({ username: session.user.name }).select("bookmarks").lean();

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    return NextResponse.json({ bookmarks: user.bookmarks || [] });
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

    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name }).select("bookmarks").lean();

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    const bookmarks = user.bookmarks || [];
    const isBookmarked = bookmarks.includes(slug);
    
    let updatedUser;
    if (isBookmarked) {
      updatedUser = await User.findOneAndUpdate(
        { username: session.user.name },
        { $pull: { bookmarks: slug } },
        { new: true }
      ).select("bookmarks").lean();
    } else {
      updatedUser = await User.findOneAndUpdate(
        { username: session.user.name },
        { $addToSet: { bookmarks: slug } },
        { new: true }
      ).select("bookmarks").lean();
    }

    const nextBookmarks = updatedUser?.bookmarks || [];

    return NextResponse.json({ 
      message: !isBookmarked ? "Đã lưu phim" : "Đã bỏ lưu", 
      isBookmarked: !isBookmarked,
      bookmarks: nextBookmarks
    });
  } catch (error) {
    console.error("Lỗi POST bookmarks:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
