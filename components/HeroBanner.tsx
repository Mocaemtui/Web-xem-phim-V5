"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Movie } from "@/types/api";
import { getBackdropUrl } from "@/lib/api";
import { Play, Info, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

import dynamic from "next/dynamic";
const YouTube = dynamic(() => import("react-youtube"), { ssr: false });

interface HeroBannerProps {
  movies: Movie[];
}

export default function HeroBanner({ movies }: HeroBannerProps) {
  const [validMovies, setValidMovies] = useState(movies);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setValidMovies(movies);
    setCurrentIndex(0);
  }, [movies]);
  
  const displayedMovies = validMovies.slice(0, 6);
  const [trailerVideoId, setTrailerVideoId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const playerRef = useRef<any>(null);

  // Parallax effect - tắt hoàn toàn để tránh nhảy giựt khi scroll
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 0]); // Luôn = 0, tắt parallax

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Delay loading video to improve PageSpeed Insights
  useEffect(() => {
    // Giảm delay trên mobile để load nhanh hơn
    const delayTime = isMobile ? 1000 : 3000;
    const timer = setTimeout(() => {
      setLoadVideo(true);
    }, delayTime);

    const handleInteraction = () => {
      setLoadVideo(true);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('mousemove', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [isMobile]);

  // Read mute preference from localStorage on mount
  useEffect(() => {
    try {
      const savedMuted = localStorage.getItem('trailer_muted');
      if (savedMuted !== null) {
        setIsMuted(savedMuted === 'true');
      }
    } catch (e) {}
  }, []);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      localStorage.setItem('trailer_muted', String(newMuted));
    } catch (e) {}
    
    if (playerRef.current) {
      if (newMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
  };

  // Auto-slide functionality
  useEffect(() => {
    if (isPaused || !displayedMovies || displayedMovies.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayedMovies.length);
      setIsVideoPlaying(false); // Reset video state on slide change
    }, 10000); // Changed to 10s for better trailer watching experience
    
    return () => clearInterval(interval);
  }, [displayedMovies, isPaused, currentIndex]);

  const movie = displayedMovies[currentIndex] || displayedMovies[0];
  const backdropUrl = movie ? getBackdropUrl(movie) : "";

  // Fetch trailer for current hero movie
  useEffect(() => {
    if (!movie?.slug) return;
    setTrailerVideoId(null);
    setIsVideoPlaying(false);
    let isMounted = true;
    
    fetch(`https://phimapi.com/phim/${movie.slug}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        let videoId = "";
        if (data.movie?.trailer_url) {
          const url = data.movie.trailer_url;
          if (url.includes("youtube.com/watch?v=")) {
            videoId = url.split("v=")[1].split("&")[0];
          } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
          } else if (url.includes("youtube.com/embed/")) {
            videoId = url.split("embed/")[1].split("?")[0];
          }
        }

        if (videoId) {
          setTrailerVideoId(videoId);
        } else {
          // Khong co trailer hoac sai dinh dang => Loai bo khoi Banner
          console.warn(`Movie ${movie.slug} has no valid trailer. Removing from banner.`);
          setValidMovies(prev => {
            const next = prev.filter(m => m.slug !== movie.slug);
            if (currentIndex >= Math.min(next.length, 6) && next.length > 0) {
              setCurrentIndex(0);
            }
            return next;
          });
        }
      })
      .catch(() => {});
      
    return () => { isMounted = false; };
  }, [movie?.slug]);

  if (!displayedMovies || displayedMovies.length === 0) return null;

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + displayedMovies.length) % displayedMovies.length);
    setIsVideoPlaying(false);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % displayedMovies.length);
    setIsVideoPlaying(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "ArrowRight") {
        nextSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayedMovies.length]);

  const youtubeOpts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1 as const,
      mute: 1 as const, // Always start muted to ensure autoplay works on modern browsers
      controls: 0 as const,
      modestbranding: 1 as const,
      loop: 1 as const,
      playlist: trailerVideoId || undefined,
      playsinline: 1 as const,
      rel: 0 as const,
      disablekb: 1 as const,
      iv_load_policy: 3 as const,
      vq: 'hd1080' as const
    },
  };

  return (
    <div 
      className="relative w-full aspect-video flex items-end pb-4 sm:pb-8 md:pb-16 lg:pb-24 pt-12 sm:pt-16 overflow-hidden group bg-zinc-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Image & Trailer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={movie._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          
          {/* Youtube Auto-play Background (Always opacity 1, hidden behind image initially) */}
          {trailerVideoId && loadVideo && (
            <div 
              className="absolute z-0 pointer-events-none block"
              style={{ 
                opacity: isVideoPlaying ? 1 : 0,
                top: '50%',
                left: '50%',
                width: '300vw',
                height: '300vh',
                // Trick YouTube into giving 4K/1080p by making the iframe 300% size, then scale it down to 120% to act like object-fit: cover
                transform: 'translate(-50%, -50%) scale(0.4)', 
                filter: 'contrast(1.15) saturate(1.2) brightness(1.05)',
                transition: 'opacity 1s ease-in-out'
              }}
            >
              <YouTube
                videoId={trailerVideoId}
                opts={youtubeOpts}
                onReady={(e) => {
                  playerRef.current = e.target;
                  e.target.setPlaybackQuality('hd1080');
                  if (!isMuted) {
                    e.target.unMute();
                  }
                  // Thử autoplay ngay khi ready
                  try {
                    e.target.playVideo();
                  } catch (err) {
                    console.warn("Autoplay failed, user interaction required");
                  }
                }}
                onPlay={(e) => {
                  e.target.setPlaybackQuality('hd1080');
                  if (!isMuted) {
                    e.target.unMute();
                  }
                  setIsVideoPlaying(true);
                }}
                onError={(e) => {
                  console.warn("YouTube blocked this video. Removing from banner.");
                  setValidMovies(prev => {
                    const next = prev.filter(m => m.slug !== movie.slug);
                    if (currentIndex >= Math.min(next.length, 6) && next.length > 0) {
                      setCurrentIndex(0);
                    }
                    return next;
                  });
                  setIsVideoPlaying(false);
                  setTrailerVideoId(null);
                }}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            </div>
          )}

          {/* Background Image (Fades out strictly ONLY when video starts playing) */}
          <motion.div
            animate={{ opacity: isVideoPlaying ? 0 : 1 }}
            transition={{ duration: 0 }}
            className="absolute inset-0 z-10"
          >
            <Image
              src={backdropUrl}
              alt={movie.name}
              fill
              className="object-cover"
              priority
              quality={65}
            />
          </motion.div>

          {/* Gradient overlays for cinematic effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10" />
          
          {/* Bottom fade to match body background perfectly */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent z-10" />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {displayedMovies.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/70 text-white rounded-full items-center justify-center transition-all backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100"
            aria-label="Previous movie"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={nextSlide}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/70 text-white rounded-full items-center justify-center transition-all backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100"
            aria-label="Next movie"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Content */}
      <motion.div 
        style={{ y: isMobile ? 0 : y }}
        className="container mx-auto px-4 relative z-10 w-full will-change-transform"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${movie._id}`}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="max-w-3xl"
          >
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
              className="text-xl sm:text-4xl md:text-5xl lg:text-7xl font-bold font-outfit text-white mb-2 sm:mb-4 leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tight line-clamp-2"
            >
              {movie.origin_name || movie.name}
            </motion.h1>
            
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex items-center gap-3 text-[10px] sm:text-sm md:text-base text-zinc-200 mb-2 sm:mb-4 drop-shadow-md"
            >
              <span className="font-bold text-white">{movie.year}</span>
              {movie.quality && (
                <span className="px-1.5 py-0.5 border border-white/30 rounded bg-white/10 backdrop-blur-md shadow-sm">
                  {movie.quality}
                </span>
              )}
              {movie.lang && <span className="font-medium text-zinc-300">{movie.lang.replace(/\/\s*\d+$/, "").trim()}</span>}
            </motion.div>

            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="text-zinc-300 text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-6 drop-shadow-md max-w-xl leading-relaxed hidden sm:block"
            >
              {movie.origin_name && <span className="block mb-1 font-bold text-white text-lg">{movie.name}</span>}
              Theo dõi ngay tác phẩm nổi bật này. Chúc bạn có những phút giây giải trí tuyệt vời nhất trên Mocaemtui.
            </motion.p>

            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <Link 
                href={`/phim/${encodeURIComponent(movie.slug)}`}
                className="group flex items-center gap-1.5 px-3 py-1.5 sm:px-6 sm:py-3 bg-[var(--color-cyan-neon)] text-black rounded-lg sm:rounded-xl font-bold hover:bg-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_var(--color-cyan-neon)] hover:shadow-[0_0_30px_rgba(255,255,255,0.8)] text-xs sm:text-base relative overflow-hidden"
              >
                {/* Ping effect background */}
                <div className="absolute inset-0 bg-[var(--color-cyan-neon)] animate-ping opacity-20 group-hover:opacity-0 transition-opacity" />
                <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current relative z-10" />
                <span className="relative z-10">Phát Ngay</span>
              </Link>
              
              <Link
                href={`/phim/${encodeURIComponent(movie.slug)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-6 sm:py-3 bg-black/40 text-white rounded-lg sm:rounded-xl font-bold backdrop-blur-md hover:bg-black/60 border border-[var(--color-cyan-neon)] transition-all hover:scale-105 active:scale-95 text-xs sm:text-base hover:shadow-[0_0_15px_var(--color-cyan-neon)]"
              >
                <Info className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                Chi Tiết
              </Link>
              
              {trailerVideoId && (
                <button
                  onClick={toggleMute}
                  className="flex items-center justify-center w-7 h-7 sm:w-12 sm:h-12 bg-black/40 text-white rounded-lg sm:rounded-xl backdrop-blur-md hover:bg-black/60 border border-white/20 transition-all hover:scale-105 active:scale-95 text-xs sm:text-base hover:border-white/50"
                  aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  )}
                </button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Indicators */}
        {displayedMovies.length > 1 && (
          <div className="flex gap-2 mt-4 sm:mt-8">
            {displayedMovies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  currentIndex === idx ? "w-6 h-1.5 sm:w-8 sm:h-2 bg-[var(--color-magenta-neon)] shadow-[0_0_15px_var(--color-magenta-neon)]" : "w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
