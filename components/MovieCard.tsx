"use client";

import { useState, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import type { Movie } from "@/types/api";
import { getPosterUrl } from "@/lib/api";
import { getWatchHistory } from "@/lib/watchHistory";

interface MovieCardProps {
  movie: Movie;
  posterUrl?: string;
  href?: string;
  isHistory?: boolean;
  priority?: boolean;
}

// Hàm hỗ trợ chuyển URL Youtube thành Embed URL cho background play
const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return null;
  let videoId = "";
  if (url.includes("youtube.com/watch?v=")) {
    videoId = url.split("v=")[1].split("&")[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  }
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${videoId}&playsinline=1&vq=hd1080`;
};

const MovieCard = memo(function MovieCard({ movie, posterUrl, href, isHistory, priority = false }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [thumbImageUrl, setThumbImageUrl] = useState<string | null>(null);
  const [actualEpisodeCount, setActualEpisodeCount] = useState<number | null>(null);
  const [fetchedTime, setFetchedTime] = useState<string | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [historyData, setHistoryData] = useState<{ episodeName?: string; progressPercent?: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const isSingle = movie.type === "single" || 
                   movie.episode_total === "1" || 
                   historyData?.episodeName?.toLowerCase() === "full" ||
                   (movie.time && !movie.time.toLowerCase().includes("tập") && 
                    (movie.time.toLowerCase().includes("phút") || 
                     movie.time.toLowerCase().includes("ph") || 
                     movie.time.toLowerCase().includes("giờ")));



  useEffect(() => {
    try {
      const history = getWatchHistory();
      const item = history.find(h => h.slug === movie.slug);
      if (item) {
        let progressPercent = 0;
        const key = `playback_progress_${item.slug}_ep_${item.currentEpisodeIndex}_percent`;
        const val = localStorage.getItem(key);
        if (val) {
          progressPercent = parseFloat(val);
        }
        setHistoryData({
          episodeName: item.episodeName,
          progressPercent
        });
      }
    } catch (e) {}
  }, [movie.slug]);

  useEffect(() => {
    if (isHovered && cardRef.current) {
      setRect(cardRef.current.getBoundingClientRect());
    }
  }, [isHovered]);

  useEffect(() => {
    if (isHovered) {
      // Trên thiết bị di động (rộng < 768px), không tải trailer mà tải trực tiếp ảnh thumb
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      hoverTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://phimapi.com/phim/${movie.slug}`);
          const data = await res.json();
          
          if (isMobile) {
            // Ép luôn hiện ảnh Thumb trên mobile, không dùng Trailer
            if (data.movie?.thumb_url) {
              setThumbImageUrl(data.movie.thumb_url);
            }
          } else {
            // Desktop: Ưu tiên Trailer, nếu không có thì lấy ảnh Thumb
            if (data.movie?.trailer_url) {
              const embed = getYoutubeEmbedUrl(data.movie.trailer_url);
              if (embed) {
                setTrailerUrl(embed);
                setThumbImageUrl(null);
              }
            } else if (data.movie?.thumb_url) {
              setThumbImageUrl(data.movie.thumb_url);
              setTrailerUrl(null);
            }
          }
        } catch (error) {}
      }, 3000);
    } else {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setTrailerUrl(null); // Xóa iframe ngay khi chuột rời đi
      setThumbImageUrl(null);
    }
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [isHovered, movie.slug]);

  if (!movie.slug) {
    return null;
  }

  const finalPosterUrl = posterUrl || getPosterUrl(movie);

  const getRatingValue = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) || num <= 0 ? null : num;
  };

  const movieTmdbRating = movie.tmdb ? getRatingValue(movie.tmdb.vote_average) : null;
  const movieImdbRating = movie.imdb ? getRatingValue(movie.imdb.vote_average) : null;
  const displayRating = movieTmdbRating ?? movieImdbRating;

  const formatVoteCount = (count: number | undefined | null): string => {
    if (!count) return "";
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return count.toString();
  };

  const formatLang = (lang: string | undefined): string => {
    if (!lang) return "Vietsub";
    const clean = lang.replace(/\/\s*\d+$/, "").trim();
    const separators = clean.match(/[\+\/]/g) || [];
    const parts = clean.split(/[\+\/]/).map(p => p.trim());
    
    if (parts.length >= 3) {
      const shortenedParts = parts.map(part => {
        let p = part;
        p = p.replace(/Thuyết\s*Minh/gi, "TM");
        p = p.replace(/Lồng\s*Tiếng/gi, "LT");
        return p;
      });
      let result = "";
      for (let i = 0; i < shortenedParts.length; i++) {
        result += shortenedParts[i];
        if (i < separators.length) {
          result += ` ${separators[i]} `;
        }
      }
      return result;
    }
    
    let result = "";
    for (let i = 0; i < parts.length; i++) {
      result += parts[i];
      if (i < separators.length) {
        result += ` ${separators[i]} `;
      }
    }
    return result;
  };

  const tmdbVoteCount = movie.tmdb ? getRatingValue(movie.tmdb.vote_count) : null;
  const imdbVoteCount = movie.imdb ? getRatingValue(movie.imdb.vote_count) : null;
  const displayVoteCount = movieTmdbRating !== null ? tmdbVoteCount : (movieImdbRating !== null ? imdbVoteCount : null);

  const isTrailerOnly =
    movie.episode_current?.toLowerCase().includes("trailer") ||
    movie.quality?.toLowerCase().includes("trailer") ||
    movie.lang?.toLowerCase().includes("trailer");

  const formatDuration = (timeStr: string | undefined): string | null => {
    if (!timeStr || timeStr === "Đang cập nhật" || timeStr.trim() === "") return null;
    let clean = timeStr.replace(/\s+/g, "").toLowerCase();
    if (/^\d+$/.test(clean)) {
      return clean + "p";
    }
    return clean
      .replace(/phút/g, "p")
      .replace(/ph/g, "p")
      .replace(/giờ/g, "g")
      .replace(/min/g, "p");
  };

  const renderEpisodeBadge = () => {
    if (isTrailerOnly) return null;

    if (isSingle) {
      const timeToDisplay = fetchedTime || movie.time;
      const formatted = formatDuration(timeToDisplay);
      if (formatted) {
        return formatted;
      }
      return movie.quality || "Phim Lẻ";
    }

    // Phim bộ
    const total = movie.episode_total && movie.episode_total !== "?" && movie.episode_total.toLowerCase() !== "unknown" ? movie.episode_total : "?";

    const extractNumber = (str: string) => {
      const match = str.match(/\d+/);
      return match ? match[0] : null;
    };

    // Đã xem
    if (historyData?.episodeName) {
      const epNum = extractNumber(historyData.episodeName);
      const totalToDisplay = actualEpisodeCount || total;
      if (epNum) {
        // Nếu là phim lẻ (single), hiển thị số phút thay vì số tập
        if (isSingle) {
          const timeToDisplay = fetchedTime || movie.time;
          const formatted = formatDuration(timeToDisplay);
          if (formatted) {
            return formatted;
          }
          return movie.quality || "Phim Lẻ";
        }
        // Phim bộ: hiển thị tập hiện tại/tổng số tập
        return `Tập ${epNum}/${totalToDisplay}`;
      }
      return `${historyData.episodeName}/${totalToDisplay}`;
    }

    // Chưa xem
    let current = movie.episode_current || "?";
    
    if (current.includes("/")) {
      current = current.split("/")[0].trim();
    }

    // Nếu lấy được số tập thật từ mảng episodes, luôn dùng số đó
    if (actualEpisodeCount !== null) {
      return `${actualEpisodeCount} Tập`;
    }

    const epNum = extractNumber(current);
    if (epNum) {
      return `${epNum} Tập`;
    }

    if (current === "?" || current.toLowerCase().includes("cập nhật")) {
      return movie.quality || "Phim Bộ";
    }
    return current;
  };

  return (
    <div className="h-full z-10 hover:z-30 relative transition-transform duration-300 ease-out hover:scale-105">
      <Link 
        ref={cardRef}
        href={href || `/phim/${encodeURIComponent(movie.slug)}`} 
        prefetch={false}
        draggable={false}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group flex flex-col h-full relative z-10 select-none"
      >
      <div 
        className={`relative aspect-[2/3] overflow-hidden rounded-xl shadow-lg border border-white/5 transition-all duration-500 ${isLoaded ? 'bg-zinc-900/40' : 'bg-zinc-800 animate-pulse'}`}
        style={{ 
           boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
        }}
      >
        {/* Lớp hover overlay lấy màu từ biến CSS */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none border-2 border-[var(--color-cyan-neon)] shadow-[0_0_20px_var(--color-cyan-neon)]"
        />
        
        <Image
          src={finalPosterUrl}
          alt={movie.name}
          fill
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          className={`object-cover transition-all duration-700 ease-out ${trailerUrl ? 'opacity-0 scale-110' : (isLoaded ? 'opacity-100' : 'opacity-0 scale-95')}`}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          quality={60}
        />
        
        {/* Rating Badge */}
        {displayRating !== null && displayRating > 0 && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded shadow-[0_0_10px_rgba(234,179,8,0.4)]">
            <svg className="w-3 h-3 fill-current text-black" viewBox="0 0 24 24">
              <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z" />
            </svg>
            <span>{displayRating.toFixed(1)}{displayVoteCount ? ` (${formatVoteCount(displayVoteCount)})` : ""}</span>
          </div>
        )}

        {/* Quality / Lang Badge */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {renderEpisodeBadge() && (
            <span className="px-1.5 py-0.5 bg-[var(--color-cyan-neon)] text-black text-[10px] font-bold rounded shadow-[0_0_10px_var(--color-cyan-neon)] whitespace-nowrap">
              {renderEpisodeBadge()}
            </span>
          )}
          {(movie.lang || isTrailerOnly) && (
            <span className="px-1.5 py-0.5 bg-black/60 text-[10px] font-bold text-zinc-200 rounded shadow-sm backdrop-blur-md border border-white/10 whitespace-nowrap">
              {isTrailerOnly ? "Trailer" : formatLang(movie.lang)}
            </span>
          )}
        </div>

        {/* Hover Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
        
        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 pointer-events-none">
          <div className="w-14 h-14 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-[var(--color-cyan-neon)] shadow-[0_0_20px_var(--color-cyan-neon)] relative">
            <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[var(--color-cyan-neon)]" />
            <svg className="w-7 h-7 translate-x-0.5 relative z-10 text-[var(--color-cyan-neon)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Lịch sử: Nhãn tập đang xem */}
        {historyData?.episodeName && (
          <div className="absolute bottom-1 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 pointer-events-none">
            <p className="text-xs font-semibold text-[var(--color-cyan-neon)] mb-1 flex items-center gap-1 drop-shadow-md">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {historyData.episodeName}
            </p>
          </div>
        )}

        {/* Lịch sử: Vạch tiến trình */}
        {historyData?.progressPercent !== undefined && historyData.progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800 z-30 pointer-events-none">
            <div 
              className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" 
              style={{ width: `${Math.min(100, Math.max(0, historyData.progressPercent))}%` }} 
            />
          </div>
        )}

        {/* Origin Name on Hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 pointer-events-none">
          <p className="text-xs font-medium text-zinc-300 line-clamp-2">{movie.origin_name || movie.name}</p>
        </div>
      </div>
      
      {/* Youtube Auto-play Trailer or Thumb Image Pop-out (Netflix Style) rendered via Portal */}
      {(trailerUrl || thumbImageUrl) && rect && typeof window !== "undefined" && createPortal(
        <div 
          className="fixed z-[9999] bg-zinc-950 animate-in fade-in zoom-in-95 duration-300 rounded-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/5 pointer-events-auto origin-center transition-all flex flex-col"
          style={{
            top: rect.top + rect.height / 2,
            left: rect.left + rect.width / 2,
            width: rect.width * 1.75, // 175% của thẻ gốc
            transform: "translate(-50%, -50%)"
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Link href={href || `/phim/${encodeURIComponent(movie.slug)}`} prefetch={false} className="absolute inset-0 z-10" />
          <div className="relative w-full aspect-video bg-black z-0">
            {trailerUrl ? (
              <iframe
                src={trailerUrl}
                className="w-full h-full pointer-events-none opacity-100"
                allow="autoplay; encrypted-media"
              />
            ) : (
              thumbImageUrl && (
                <Image
                  src={thumbImageUrl.startsWith('http') ? thumbImageUrl : `https://img.ophim.live/uploads/movies/${thumbImageUrl}`}
                  alt={movie.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={55}
                />
              )
            )}
            {/* Lớp mờ nhẹ phía dưới video/ảnh để làm mượt phần chuyển giao */}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
          </div>
          <div className="p-4 flex flex-col gap-2 bg-zinc-950 relative z-20">
            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-1">
               <Link href={href || `/phim/${encodeURIComponent(movie.slug)}`} prefetch={false} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-lg hover:bg-zinc-200 transition-colors">
                  <svg className="w-4 h-4 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
               </Link>
               <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
               </div>
               <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
               </div>
               <div className="ml-auto w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
               </div>
            </div>
            
            <span className="text-white font-bold text-[15px] leading-tight line-clamp-1">{movie.name}</span>
            <div className="flex items-center gap-2 text-[11px] mt-0.5 font-medium">
              {movie.quality && <span className="text-[var(--color-cyan-neon)]">{movie.quality}</span>}
              <span className="text-zinc-400 border border-zinc-700 px-1.5 rounded-sm uppercase tracking-wider">
                {formatLang(movie.lang)}
              </span>
              <span className="text-zinc-300">{movie.year}</span>
              {movie.time && <span className="text-zinc-400">{movie.time}</span>}
            </div>
            {movie.category && movie.category.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {movie.category.slice(0, 3).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[10px] whitespace-nowrap">{c.name}</span>
                    {i < 2 && i < (movie.category?.length || 0) - 1 && <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      
      <div className="mt-3 flex-1 flex flex-col pointer-events-none">
        <h3 
          className="font-outfit font-semibold text-white text-base line-clamp-2 group-hover:text-[var(--color-cyan-neon)] transition-colors leading-tight drop-shadow-md"
        >
          {movie.name}
        </h3>
        <div className="flex items-center gap-2 mt-auto pt-1.5">
          <span className="text-xs font-medium text-zinc-400">{movie.year}</span>
          {movie.country && movie.country.length > 0 && (
            <>
              <span className="text-zinc-700 text-[10px]">•</span>
              <span className="text-xs text-zinc-500 line-clamp-1">{movie.country[0].name}</span>
            </>
          )}
        </div>
      </div>
      </Link>
    </div>
  );
});

export default MovieCard;
