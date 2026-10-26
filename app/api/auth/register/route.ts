import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." },
        { status: 400 }
      );
    }

    if (username.length < 4 || password.length < 6) {
      return NextResponse.json(
        { message: "Tài khoản phải >4 ký tự và Mật khẩu >6 ký tự." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Kiểm tra xem user đã tồn tại chưa
    const existingUser = await User.findOne({ username }).select("_id").lean();
    if (existingUser) {
      return NextResponse.json(
        { message: "Tài khoản này đã có người sử dụng. Vui lòng chọn tên khác." },
        { status: 400 }
      );
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = new User({
      username,
      password: hashedPassword,
      watchHistory: [],
    });

    await newUser.save();

    return NextResponse.json(
      { message: "Đăng ký thành công!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return NextResponse.json(
      { message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
