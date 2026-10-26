"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackUrl?: string;
  label?: string;
}

export default function BackButton({ fallbackUrl = "/", label = "Thoát" }: BackButtonProps) {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      onClick={handleGoBack}
      className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition-all text-xs font-semibold cursor-pointer active:scale-95 duration-200"
      title={label}
    >
      <ArrowLeft size={14} />
      <span>{label}</span>
    </button>
  );
}
