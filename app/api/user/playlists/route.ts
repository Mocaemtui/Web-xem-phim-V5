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

    const { name, description } = await req.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ message: "Tên danh sách phát phải từ 2 ký tự" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    // Check if playlist already exists
    const playlists = user.playlists || [];
    const exists = playlists.some((p: any) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return NextResponse.json({ message: "Danh sách phát này đã tồn tại" }, { status: 400 });
    }

    user.playlists.push({
      name: name.trim(),
      description: description?.trim() || "",
      movies: []
    });

    await user.save();

    return NextResponse.json({
      message: "Tạo danh sách phát thành công",
      playlists: user.playlists
    });
  } catch (error) {
    console.error("Lỗi tạo danh sách phát:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { playlistName, movieSlug, action } = await req.json();

    if (!playlistName || !movieSlug || !action) {
      return NextResponse.json({ message: "Dữ liệu thiếu" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    const playlist = user.playlists.find((p: any) => p.name === playlistName);
    if (!playlist) {
      return NextResponse.json({ message: "Không tìm thấy danh sách phát" }, { status: 404 });
    }

    if (action === "add") {
      if (playlist.movies.includes(movieSlug)) {
        return NextResponse.json({ message: "Phim đã có trong danh sách phát" }, { status: 400 });
      }
      playlist.movies.push(movieSlug);
    } else if (action === "remove") {
      playlist.movies = playlist.movies.filter((slug: string) => slug !== movieSlug);
    }

    await user.save();

    return NextResponse.json({
      message: action === "add" ? "Đã thêm phim vào danh sách phát" : "Đã xóa phim khỏi danh sách phát",
      playlists: user.playlists
    });
  } catch (error) {
    console.error("Lỗi cập nhật danh sách phát:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { playlistName } = await req.json();

    if (!playlistName) {
      return NextResponse.json({ message: "Dữ liệu thiếu" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ username: session.user.name });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
    }

    user.playlists = user.playlists.filter((p: any) => p.name !== playlistName);

    await user.save();

    return NextResponse.json({
      message: "Đã xóa danh sách phát",
      playlists: user.playlists
    });
  } catch (error) {
    console.error("Lỗi xóa danh sách phát:", error);
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
