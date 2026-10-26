export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh] bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-white/10 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
        <span className="text-sm font-medium text-zinc-500 animate-pulse">Đang tải...</span>
      </div>
    </div>
  );
}
