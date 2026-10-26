"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ca-nhan?tab=history");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex justify-center items-center text-white">
      <div className="w-8 h-8 border-4 border-zinc-800 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
    </div>
  );
}
