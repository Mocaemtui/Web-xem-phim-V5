"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommentItem {
  _id: string;
  movieSlug: string;
  movieName: string;
  username: string;
  content: string;
  createdAt: string;
}

interface MovieCommentsProps {
  movieSlug: string;
  movieName: string;
  session: any;
  onOpenAuthModal: () => void;
}

export default function MovieComments({
  movieSlug,
  movieName,
  session,
  onOpenAuthModal,
}: MovieCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/comments?movieSlug=${movieSlug}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Lỗi tải bình luận:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (movieSlug) {
      fetchComments();
    }
  }, [movieSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      onOpenAuthModal();
      return;
    }

    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieSlug,
          movieName,
          content: content.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setContent("");
      } else {
        const data = await res.json();
        setError(data.message || "Không thể gửi bình luận");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate color based on username hash
  const getAvatarColor = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "bg-pink-500/20 text-pink-400 border-pink-500/30",
      "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "bg-teal-500/20 text-teal-400 border-teal-500/30",
      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "bg-rose-500/20 text-rose-400 border-rose-500/30",
      "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Format date nicely in Vietnamese
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div id="comments" className="mt-12 md:mt-16 border-t border-zinc-900 pt-8">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2.5">
        <MessageSquare className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]" />
        Bình luận từ người xem
        <span className="text-sm font-normal text-zinc-500">
          ({comments.length})
        </span>
      </h2>

      {/* Comment Form */}
      <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 md:p-6 mb-8 hover:border-zinc-700/50 transition-colors">
        {session?.user ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs uppercase ${getAvatarColor(session.user.name)}`}>
                {session.user.name.charAt(0)}
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                {session.user.name}
              </span>
            </div>

            <div className="relative group">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim..."
                rows={3}
                required
                maxLength={500}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all duration-300 resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-zinc-600 font-medium">
                {content.length}/500
              </span>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="self-end h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gửi bình luận
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <User className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-400 mb-4">
              Vui lòng đăng nhập để gửi bình luận và nhận thông báo tập mới
            </p>
            <button
              onClick={onOpenAuthModal}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-sm font-semibold shadow-lg shadow-red-950/20 active:scale-95 transition-all"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : comments.length > 0 ? (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {comments.map((comment, idx) => (
              <motion.div
                key={comment._id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-800 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm uppercase ${getAvatarColor(comment.username)}`}>
                      {comment.username.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {comment.username}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed pl-12 whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                  {comment.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-zinc-800/40 rounded-2xl bg-zinc-900/10">
          <MessageSquare className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
          </p>
        </div>
      )}
    </div>
  );
}
