import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Tài khoản",
      credentials: {
        username: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Vui lòng nhập tài khoản và mật khẩu");
        }

        await connectToDatabase();

        const user = await User.findOne({ username: credentials.username }).lean();

        if (!user) {
          throw new Error("Tài khoản không tồn tại");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Mật khẩu không chính xác");
        }

        return {
          id: user._id.toString(),
          name: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl || "",
          accentColor: user.accentColor || "cyan",
          bio: user.bio || "",
          featuredBadge: user.featuredBadge || "",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.displayName = (user as any).displayName;
        token.avatarUrl = (user as any).avatarUrl;
        token.accentColor = (user as any).accentColor;
        token.bio = (user as any).bio;
        token.featuredBadge = (user as any).featuredBadge;
      }
      
      // Handle session updates dynamically
      if (trigger === "update" && session) {
        if (session.displayName !== undefined) token.displayName = session.displayName;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
        if (session.accentColor !== undefined) token.accentColor = session.accentColor;
        if (session.bio !== undefined) token.bio = session.bio;
        if (session.featuredBadge !== undefined) token.featuredBadge = session.featuredBadge;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.name = token.name;
        (session.user as any).displayName = token.displayName;
        (session.user as any).avatarUrl = token.avatarUrl;
        (session.user as any).accentColor = token.accentColor;
        (session.user as any).bio = token.bio;
        (session.user as any).featuredBadge = token.featuredBadge;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Đăng nhập ngay trên trang chủ bằng Modal
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
