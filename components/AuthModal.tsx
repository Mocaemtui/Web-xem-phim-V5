"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (isLogin) {
      // Logic Đăng Nhập
      const res = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        window.location.reload(); // Reload để nhận session mới
      }
    } else {
      // Logic Đăng Ký
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message);
        } else {
          setSuccess("Đăng ký thành công! Đang tự động đăng nhập...");
          // Tự động đăng nhập sau khi đăng ký
          setTimeout(async () => {
            const loginRes = await signIn("credentials", {
              username: formData.username,
              password: formData.password,
              redirect: false,
            });
            if (!loginRes?.error) {
              window.location.reload();
            }
          }, 1500);
        }
      } catch (err) {
        setError("Lỗi kết nối máy chủ.");
      }
      setIsLoading(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hiệu ứng viền phát sáng */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-cyan-neon)] to-transparent opacity-50" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isLogin ? "Đăng Nhập" : "Đăng Ký"}
              </h2>
              <p className="text-zinc-400 text-sm">
                Đồng bộ lịch sử xem phim của bạn trên mọi thiết bị
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                  {success}
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Tên tài khoản (vd: admin)"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)] transition-all"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)] transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[var(--color-cyan-neon)] hover:bg-[var(--color-cyan-neon)]/90 text-black font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_var(--color-cyan-neon)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isLogin ? (
                  "Đăng Nhập"
                ) : (
                  "Tạo Tài Khoản"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-400">
              {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                }}
                className="text-[var(--color-cyan-neon)] hover:underline font-semibold"
              >
                {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
