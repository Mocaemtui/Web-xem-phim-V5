"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Clock, ChevronRight } from "lucide-react";
import { getWatchHistory, type WatchHistoryItem } from "@/lib/watchHistory";
import SectionTitle from "@/components/SectionTitle";
import { getPosterUrl } from "@/lib/api";

import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/types/api";

export default function HomeHistorySection() {
  const [history, setHistory] = useState<(WatchHistoryItem & { progressPercent?: number })[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const fetchHistory = () => {
      const savedHistory = getWatchHistory().slice(0, 6);
      if (savedHistory.length === 0) {
        setHistory([]);
        return;
      }
      
      // Load instantly without fetching from API
      const mappedHistory = savedHistory.map(item => ({
        ...item,
        episode_current: item.episodeName || "?",
      }));
      setHistory(mappedHistory as any);
    };

    fetchHistory();

    const handleStorageChange = () => {
      fetchHistory();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div 
      className={`grid transition-all duration-300 ease-in-out ${
        mounted && history.length > 0 
          ? "grid-rows-[1fr] opacity-100 mb-12" 
          : "grid-rows-[0fr] opacity-0 mb-0"
      }`}
    >
      <div className="overflow-hidden">
        <section className="relative z-10">
          <SectionTitle title="Phim Đang Xem" viewAllLink="/ca-nhan?tab=history" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
            {history.map((item) => (
              <MovieCard
                key={item.slug}
                movie={item as unknown as Movie}
                href={`/xem-phim/${item.slug}`}
                isHistory={true}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
