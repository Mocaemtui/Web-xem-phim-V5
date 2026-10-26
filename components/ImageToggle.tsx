"use client";

import { useState } from "react";

interface ImageToggleProps {
  onToggle: () => void;
  label: string;
}

export default function ImageToggle({ onToggle, label }: ImageToggleProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setClicked(!clicked);
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className="w-10 h-10 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white border border-white/10 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-sm transition-all duration-300 shadow-lg active:scale-90"
      title={label}
    >
      {'>'}
    </button>
  );
}
