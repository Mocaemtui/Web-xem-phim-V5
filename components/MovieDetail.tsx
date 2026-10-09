"use client";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  Play,
  Share2,
  Plus,
  Clock,
  Calendar,
  Star,
  Languages,
  Users,
  Heart,
  Film,
  AlignLeft,
  ListPlus,
  Check
} from "lucide-react";
import type { MovieDetail, MovieImages, MoviePeoples } from "@/types/api";
import ImageToggle from "./ImageToggle";
import YouTube from "react-youtube";
import { getWatchHistory } from "@/lib/watchHistory";
import { useSession } from "next-auth/react";
import AuthModal from "./AuthModal";
import MovieComments from "./MovieComments";
import {
  getPosterUrl,
  getBackdropUrl,
  resolveImgUrl,
  sortEpisodes,
  getCleanServerName,
} from "@/lib/api";
import { TMDBDetailResponse, TMDBCollectionDetail } from "@/types/tmdb";
interface MovieDetailProps {
  movie: MovieDetail;
  images: MovieImages;
  peoples: MoviePeoples;
  tmdbData?: TMDBDetailResponse | null;
  tmdbCollectionData?: TMDBCollectionDetail | null;
}
export default function MovieDetail({
  movie,
  images,
  peoples,
  tmdbData,
  tmdbCollectionData,
}: MovieDetailProps) {
  // 0 = Primary, 1 = TMDB, 2 = Alternate
  const [backdropSource, setBackdropSource] = useState<0 | 1 | 2>(0);
  const [posterSource, setPosterSource] = useState<0 | 1 | 2>(0);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [trailerVideoId, setTrailerVideoId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const { data: session } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoadingBookmark, setIsLoadingBookmark] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistDropdownOpen, setPlaylistDropdownOpen] = useState(false);
  const playlistDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session && playlistDropdownOpen) {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          setPlaylists(data.playlists || []);
        })
        .catch(console.error);
    }
  }, [session, playlistDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (playlistDropdownRef.current && !playlistDropdownRef.current.contains(event.target as Node)) {
        setPlaylistDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTogglePlaylist = async (playlistName: string, movieSlug: string) => {
    const playlist = playlists.find(p => p.name === playlistName);
    if (!playlist) return;
    const hasMovie = playlist.movies.includes(movieSlug);
    const action = hasMovie ? "remove" : "add";

    try {
      const res = await fetch("/api/user/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistName, movieSlug, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlaylists(data.playlists || []);
      } else {
        alert(data.message || "Lỗi cập nhật danh sách phát");
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (session?.user && movie.slug) {
      fetch("/api/bookmarks")
        .then((res) => res.json())
        .then((data) => {
          if (data.bookmarks && data.bookmarks.includes(movie.slug)) {
            setIsBookmarked(true);
          }
        })
        .catch(console.error);
    }
  }, [session, movie.slug]);
  const toggleBookmark = async () => {
    if (!session?.user) {
      setAuthModalOpen(true);
      return;
    }
    setIsLoadingBookmark(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: movie.slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsBookmarked(data.isBookmarked);
        if (data.isBookmarked) {
          subscribeToMovieNotifications(movie.slug, movie.origin_name || movie.name);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingBookmark(false);
    }
  };
  // Parallax effect
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, -100]);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    // Prioritize TMDB Trailer
    let tmdbTrailerId = null;
    if (tmdbData?.videos?.results) {
      // Find official trailer first, if not find any trailer
      let trailer = tmdbData.videos.results.find(
        (v) => v.type === "Trailer" && v.site === "YouTube" && v.official,
      );
      if (!trailer) {
        trailer = tmdbData.videos.results.find(
          (v) => v.type === "Trailer" && v.site === "YouTube",
        );
      }
      if (trailer) tmdbTrailerId = trailer.key;
    }
    if (tmdbTrailerId) {
      setTrailerVideoId(tmdbTrailerId);
      return;
    }
    if (!movie.trailer_url) return;
    let videoId = "";
    const url = movie.trailer_url;
    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("embed/")[1].split("?")[0];
    }
    if (videoId) setTrailerVideoId(videoId);
  }, [movie.trailer_url, tmdbData]);
  const primaryPosterUrl = getBackdropUrl(movie);
  const primaryThumbUrl = getPosterUrl(movie);
  // Alternate URLs (from fallback/secondary API)
  const altPosterUrl = movie.alt_poster_url
    ? resolveImgUrl(movie.alt_poster_url)
    : null;
  const altThumbUrl = movie.alt_thumb_url
    ? resolveImgUrl(movie.alt_thumb_url)
    : null;
  // TMDB URLs
  const tmdbPosterFile = images?.images?.find(
    (img) => img.type === "poster",
  )?.file_path;
  const tmdbPosterBase =
    images?.image_sizes?.poster?.w500 || "https://image.tmdb.org/t/p/w500";
  const tmdbPosterUrl = tmdbPosterFile
    ? `${tmdbPosterBase}${tmdbPosterFile}`
    : null;
  let tmdbBackdropUrl = null;
  if (tmdbData?.backdrop_path) {
    tmdbBackdropUrl = `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`;
  } else {
    const tmdbBackdropFile = images?.images?.find(
      (img) => img.type === "backdrop",
    )?.file_path;
    const tmdbBackdropBase =
      images?.image_sizes?.backdrop?.w1280 ||
      "https://image.tmdb.org/t/p/w1280";
    tmdbBackdropUrl = tmdbBackdropFile
      ? `${tmdbBackdropBase}${tmdbBackdropFile}`
      : null;
  }
  // Determine available options
  const hasAltBackdrop = Boolean(
    altPosterUrl && altPosterUrl !== primaryPosterUrl,
  );
  const hasAltPoster = Boolean(altThumbUrl && altThumbUrl !== primaryThumbUrl);
  const availableBackdrops = [primaryPosterUrl];
  const backdropNames = ["PhimAPI"];
  if (tmdbBackdropUrl) {
    availableBackdrops.push(tmdbBackdropUrl);
    backdropNames.push("TMDB");
  }
  if (movie.alt_thumb_url && movie.alt_thumb_url !== movie.thumb_url) {
    backdropNames.push("Dự phòng");
  }
  const availablePosters = [primaryThumbUrl];
  const posterNames = ["PhimAPI"];
  if (tmdbPosterUrl) {
    availablePosters.push(tmdbPosterUrl);
    posterNames.push("TMDB");
  }
  if (movie.alt_poster_url && movie.alt_poster_url !== movie.poster_url) {
    posterNames.push("Dự phòng");
  }
  // Current active images
  const currentBackdropIndex = backdropSource % availableBackdrops.length;
  const currentPosterIndex = posterSource % availablePosters.length;
  const currentBackdropUrl = availableBackdrops[currentBackdropIndex];
  const currentPosterUrl = availablePosters[currentPosterIndex];
  const currentBackdropName = backdropNames[currentBackdropIndex];
  const currentPosterName = posterNames[currentPosterIndex];
  // Transition states
  const [backdropFade, setBackdropFade] = useState(true);
  const [posterFade, setPosterFade] = useState(true);
  // Handle transitions smoothly
  const toggleBackdrop = () => {
    setBackdropFade(false);
    setTimeout(() => {
      setBackdropSource(
        (prev) => ((prev + 1) % availableBackdrops.length) as 0 | 1 | 2,
      );
      setBackdropFade(true);
    }, 250);
  };
  const togglePoster = () => {
    setPosterFade(false);
    setTimeout(() => {
      setPosterSource(
        (prev) => ((prev + 1) % availablePosters.length) as 0 | 1 | 2,
      );
      setPosterFade(true);
    }, 250);
  };
  const handleBackdropError = () => {
    if (backdropSource < availableBackdrops.length - 1) {
      setBackdropSource((prev) => (prev + 1) as 0 | 1 | 2);
    }
  };
  const handlePosterError = () => {
    if (posterSource < availablePosters.length - 1) {
      setPosterSource((prev) => (prev + 1) as 0 | 1 | 2);
    }
  };
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined") {
      const lastBrowse = sessionStorage.getItem("last_browse_page");
      if (lastBrowse) {
        router.push(lastBrowse);
        return;
      }
    }
    router.push("/");
  };
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [episodes, setEpisodes] = useState(sortEpisodes(movie.episodes || []));
  const [currentOriginName, setCurrentOriginName] = useState(movie.origin_name);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    const history = getWatchHistory();
    const item = history.find((i: any) => i.slug === movie.slug);
    setHistoryItem(item || null);
    const baseEps = [...(movie.episodes || [])];
    const tmdbId = tmdbData?.id || movie.tmdb?.id;
    const imdbId = movie.imdb?.id;
    if (tmdbId || imdbId) {
      const templateServer = baseEps.find(s => s.server_data && s.server_data.length > 0);
      const isTVShow = movie.type === 'series' || movie.type === 'hoathinh' || (templateServer && templateServer.server_data.length > 1);
      
      const generateServerData = () => {
        if (!isTVShow) {
          return [{ name: "Full", slug: "full", filename: "Full", link_embed: "", link_m3u8: "", link: "" }];
        } else if (templateServer) {
          return templateServer.server_data.map((ep: any) => ({ ...ep, link_embed: "", link_m3u8: "", link: "" }));
        } else {
          return [{ name: `Tập 1`, slug: `tap-1`, filename: `Tập 1`, link_embed: "", link_m3u8: "", link: "" }];
        }
      };
      
      baseEps.push({
        server_name: "VidLink",
        server_data: generateServerData()
      });
    }

    const sortedEps = sortEpisodes(baseEps);
    setEpisodes(sortedEps);
    setCurrentOriginName(movie.origin_name);
    let initialServer = 0;
    if (
      item &&
      item.currentServerIndex !== undefined &&
      sortedEps[item.currentServerIndex]
    ) {
      initialServer = item.currentServerIndex;
    }
    setSelectedServerIndex(initialServer);
    try {
      const stored = localStorage.getItem("watched_episodes_v3");
      if (stored) {
        setWatchedEpisodes(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, [movie.slug, movie.origin_name, movie.episodes]);

  const validDirectors = movie.director?.filter(
    (d) => d && d.trim() !== "" && d.trim() !== "Đang cập nhật"
  ) || [];
  const validActors = movie.actor?.filter(
    (a) => a && a.trim() !== "" && a.trim() !== "Đang cập nhật"
  ) || [];
  const hasValidDirector = validDirectors.length > 0;
  const hasValidActor = validActors.length > 0;

  const getRatingValue = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) || num <= 0 ? null : num;
  };

  const detailRating = tmdbData ? getRatingValue(tmdbData.vote_average) : null;
  const movieTmdbRating = movie.tmdb ? getRatingValue(movie.tmdb.vote_average) : null;
  const movieImdbRating = movie.imdb ? getRatingValue(movie.imdb.vote_average) : null;
  const displayRating = movieTmdbRating ?? movieImdbRating ?? detailRating;

  const formatVoteCount = (count: number | undefined | null): string => {
    if (!count) return "";
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return count.toString();
  };

  const tmdbVoteCount = movie.tmdb ? getRatingValue(movie.tmdb.vote_count) : null;
  const imdbVoteCount = movie.imdb ? getRatingValue(movie.imdb.vote_count) : null;
  const detailVoteCount = tmdbData ? getRatingValue(tmdbData.vote_count) : null;
  const displayVoteCount = movieTmdbRating !== null ? tmdbVoteCount : (movieImdbRating !== null ? imdbVoteCount : detailVoteCount);

  const tmdbId = movie.tmdb?.id || tmdbData?.id;
  const isSeries = movie.type === "series" || movie.type === "tvshows" || (movie.episodes?.[0]?.server_data?.length || 0) > 1;
  const tmdbDataType = tmdbData ? (tmdbData.seasons ? "tv" : "movie") : null;
  const tmdbType = movie.tmdb?.type || tmdbDataType || (isSeries ? "tv" : "movie");
  const tmdbUrl = tmdbId && Number(tmdbId) !== 0 ? `https://www.themoviedb.org/${tmdbType}/${tmdbId}` : null;

  const isTrailerOnly =
    movie.episode_current?.toLowerCase().includes("trailer") ||
    movie.quality?.toLowerCase().includes("trailer") ||
    movie.lang?.toLowerCase().includes("trailer");

  const ActionButtons = ({ isMobileView }: { isMobileView: boolean }) => {
    return (
      <div
        className={
          isMobileView ? "md:hidden my-3 w-full" : "hidden md:block my-2 md:my-6 w-full"
        }
      >
        {((episodes &&
          episodes.length > 0 &&
          episodes[0].server_data &&
          episodes[0].server_data.length > 0 &&
          (episodes[0].server_data[0].link_m3u8 ||
            episodes[0].server_data[0].link_embed)) ||
          movie.tmdb?.id ||
          tmdbData?.id ||
          movie.imdb?.id) ? (
          <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full">
            {movie.slug && (
              <Link
                href={`/xem-phim/${movie.slug}`}
                className="w-full md:w-auto md:flex-none h-11 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-900/20"
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                <span className="text-sm md:text-base">Xem ngay</span>
              </Link>
            )}
            <div className="flex gap-2 w-full md:w-auto md:contents">
              {movie.slug && (
                <button
                  onClick={() => {
                    const roomId = Math.random()
                      .toString(36)
                      .substring(2, 9);
                    sessionStorage.setItem(`host_${roomId}`, "true");
                    window.location.href = `/watch-together/${movie.slug}/${roomId}`;
                  }}
                  className="flex-1 md:flex-none h-11 inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 md:px-5 rounded-xl transition-all active:scale-95 border border-zinc-700"
                >
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  <span className="text-sm md:text-base">Xem chung</span>
                </button>
              )}
              {movie.slug && (
                <button
                  onClick={toggleBookmark}
                  disabled={isLoadingBookmark}
                  title={isBookmarked ? "Bỏ lưu phim" : "Lưu phim"}
                  className={`flex-none inline-flex items-center justify-center w-11 h-11 rounded-xl transition-all active:scale-95 border ${
                    isBookmarked
                      ? "bg-pink-500/10 border-pink-500/50 text-pink-500 hover:bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 md:w-5 md:h-5 ${isBookmarked ? "fill-current" : ""}`}
                  />
                </button>
              )}
              {movie.slug && session && (
                <div className="relative" ref={playlistDropdownRef}>
                  <button
                    onClick={() => setPlaylistDropdownOpen(!playlistDropdownOpen)}
                    title="Thêm vào danh sách phát"
                    className="flex-none inline-flex items-center justify-center w-11 h-11 rounded-xl transition-all active:scale-95 border bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 cursor-pointer"
                  >
                    <ListPlus className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  <AnimatePresence>
                    {playlistDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1.5 shadow-2xl backdrop-blur-xl z-50 text-left"
                      >
                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Thêm vào playlist</span>
                        </div>
                        
                        {playlists.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-zinc-500 text-center">
                            Bạn chưa có danh sách phát nào. Hãy tạo ở trang Cá nhân!
                          </div>
                        ) : (
                          playlists.map((playlist: any) => {
                            const hasMovie = playlist.movies.includes(movie.slug);
                            return (
                              <button
                                key={playlist.name}
                                type="button"
                                onClick={() => handleTogglePlaylist(playlist.name, movie.slug)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer bg-transparent border-none text-left"
                              >
                                <span className="truncate">{playlist.name}</span>
                                {hasMovie && <Check className="w-4 h-4 text-[var(--color-cyan-neon)] shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full mt-2 md:mt-0">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 text-amber-200 text-xs md:text-sm max-w-xl">
              <p className="font-semibold mb-1 flex items-center gap-1.5 text-amber-400">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping text-[10px]"></span>
                Phim chưa phát sóng chính thức
              </p>
              <p className="text-zinc-400 mt-1">
                Hiện tại phim chưa có tập phát sóng (chỉ có trailer/sắp chiếu). Bạn có thể thưởng thức Trailer chính thức dưới đây.
              </p>
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      {/* Top Bar with Back Button */}
      <div className="fixed top-[76px] left-4 z-40 pointer-events-none flex items-start">
        <button
          onClick={handleBack}
          className="pointer-events-auto opacity-100 md:opacity-0 md:hover:opacity-100 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg hover:scale-105 active:scale-95 duration-300"
          title="Quay lại"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
      {/* Backdrop */}
      <div className="relative z-0 w-full aspect-video overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 z-0">
          {/* Youtube Background - clip-path giấu hoàn toàn cho tới khi video phát */}
          {isPlayingTrailer && trailerVideoId && (
            <div
              className="absolute inset-0 z-0 bg-black"
              style={{
                clipPath: isVideoReady ? "inset(0)" : "inset(100%)",
                opacity: isVideoReady ? 1 : 0,
              }}
            >
              <YouTube
                videoId={trailerVideoId}
                opts={{
                  height: "100%",
                  width: "100%",
                  playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    loop: 1,
                    playlist: trailerVideoId,
                    playsinline: 1,
                    rel: 0,
                    disablekb: 1,
                    iv_load_policy: 3,
                    vq: "hd1080",
                  },
                }}
                onReady={(e) => {
                  e.target.setPlaybackQuality("hd1080");
                }}
                onPlay={(e) => {
                  e.target.setPlaybackQuality("hd1080");
                  setIsVideoReady(true);
                }}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {/* Click to stop trailer */}
              <div
                className="absolute inset-0 z-30 cursor-pointer"
                onClick={() => {
                  setIsPlayingTrailer(false);
                  setIsVideoReady(false);
                }}
              />
            </div>
          )}
          {/* Bức ảnh nền (Biến mất lập tức khi video chạy) */}
          <div
            className={`absolute inset-0 z-10 ${isVideoReady ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <img
              src={currentBackdropUrl}
              alt={movie.name}
              className={`absolute inset-0 z-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out cursor-pointer md:cursor-default ${backdropFade ? "opacity-100" : "opacity-0"}`}
              onClick={() => {
                if (window.innerWidth < 768 && availableBackdrops.length > 1)
                  toggleBackdrop();
              }}
              onError={handleBackdropError}
            />
            {/* Nút Play ẩn - chỉ hiện khi đưa chuột vào đúng vùng giữa ảnh */}
            {trailerVideoId && !isPlayingTrailer && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div
                  className="w-24 h-24 pointer-events-auto cursor-pointer flex items-center justify-center group/play"
                  onClick={() => setIsPlayingTrailer(true)}
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 md:bg-white/10 group-hover/play:bg-[var(--color-cyan-neon)] rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover/play:shadow-[0_0_50px_var(--color-cyan-neon)] transition-all duration-300 text-white/80 md:text-white/30 group-hover/play:text-black opacity-100 md:opacity-0 group-hover/play:opacity-100 scale-100 md:scale-75 group-hover/play:scale-100">
                    <svg
                      className="w-8 h-8 md:w-10 md:h-10 translate-x-[2px]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Cinematic Gradients - keep outside parallax to maintain overlay structure */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 via-zinc-950/10 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/30 via-transparent to-transparent pointer-events-none z-20" />
        {availableBackdrops.length > 1 && (
          <div className="hidden md:flex absolute top-0 right-0 w-48 h-48 z-30 group/corner items-start justify-end p-4">
            <div className="opacity-0 invisible group-hover/corner:opacity-100 group-hover/corner:visible pointer-events-none group-hover/corner:pointer-events-auto transition-all duration-300">
              <ImageToggle
                onToggle={toggleBackdrop}
                label={`Đổi ảnh nền (Nguồn: ${currentBackdropName})`}
              />
            </div>
          </div>
        )}
      </div>
      {/* Content */}
      <motion.div
        style={{ y: isMobile ? 0 : y }}
        className="max-w-[1600px] mx-auto px-4 md:px-6 relative z-10 -mt-20 md:-mt-32 pb-12"
      >
        {/* Main Info Grid - Re-architected to avoid floating issues and click jacking */}
        <div className="grid grid-cols-[40%_1fr] md:grid-cols-[300px_1fr] lg:grid-cols-[400px_1fr] gap-4 md:gap-12 relative z-20">
          {/* Left Column: Poster + Mobile Ratings + Director/Actor */}
          <div className="col-span-1 flex flex-col">
            <div className="block relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.6)] md:shadow-[0_0_30px_rgba(0,0,0,0.8)] group bg-zinc-900 border border-white/10 hover:border-[var(--color-cyan-neon)]">
              <img
                src={currentPosterUrl}
                alt={movie.name}
                className={`w-full h-full object-cover transition-opacity duration-300 ease-in-out ${posterFade ? "opacity-100" : "opacity-0"}`}
                onError={handlePosterError}
              />
              {availablePosters.length > 1 && (
                <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 invisible group-hover:visible pointer-events-none group-hover:pointer-events-auto transition-all duration-300">
                  <ImageToggle
                    onToggle={togglePoster}
                    label={`Đổi ảnh poster (Nguồn: ${currentPosterName})`}
                  />
                </div>
              )}
            </div>

          </div>
          {/* Right Column: Title + Info + Action Buttons + Description */}
          <div className="contents md:flex md:flex-col md:col-start-2 md:col-span-1 md:justify-start md:min-w-0">
            {/* Title Block & Mobile Action Buttons Wrapper */}
            <div className="col-start-2 col-span-1 md:contents flex flex-col justify-start pt-6 md:pt-0">
              <div className="flex flex-col md:col-start-auto md:col-span-1">
                <h1 className="text-lg sm:text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2 leading-snug md:leading-tight break-words">
                  {movie.origin_name || movie.name}
                </h1>
                {movie.origin_name && (
                  <p className="text-xs md:text-lg text-zinc-400 font-medium mb-2 break-words leading-normal">
                    {movie.name}
                  </p>
                )}
              </div>
              
              <ActionButtons isMobileView={true} />
            </div>

            {/* Meta Info (Quality, Lang, Time) */}
            <div className="col-start-1 col-span-2 md:col-start-auto md:col-span-1 flex flex-wrap items-center gap-2 md:gap-3 mb-4 mt-2 md:mt-0">
              {displayRating !== null && displayRating > 0 && (
                <span className="px-3 md:px-4 py-1.5 md:py-2 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/30 text-xs md:text-sm font-bold flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                  <Star className="w-4 h-4 fill-current" />
                  {displayRating.toFixed(1)}{displayVoteCount ? ` (${formatVoteCount(displayVoteCount)})` : ""}
                </span>
              )}

              {movie.year && (
                <span className="px-2 md:px-4 py-1 md:py-1.5 bg-zinc-800/80 text-zinc-200 rounded-md md:rounded-full border border-zinc-700/50 text-xs md:text-sm font-bold">
                  {movie.year}
                </span>
              )}
              {movie.quality && (
                <span className="px-2 md:px-4 py-1 md:py-1.5 bg-zinc-800/80 text-zinc-200 rounded-md md:rounded-full border border-zinc-700/50 text-xs md:text-sm uppercase">
                  {movie.quality}
                </span>
              )}
              {(movie.lang || isTrailerOnly) && (
                <span className="px-2 md:px-4 py-1 md:py-1.5 bg-zinc-800/80 text-zinc-200 rounded-md md:rounded-full border border-zinc-700/50 text-xs md:text-sm font-bold">
                  {isTrailerOnly ? "Trailer" : movie.lang?.replace(/\/\s*\d+$/, "").trim()}
                </span>
              )}
              {movie.time && (
                <span className="px-2 md:px-4 py-1 md:py-1.5 bg-zinc-800/80 text-zinc-200 rounded-md md:rounded-full border border-zinc-700/50 text-xs md:text-sm">
                  {movie.time}
                </span>
              )}

              {tmdbUrl && (
                <a
                  href={tmdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Xem thông tin trên TMDB"
                  className="px-2.5 md:px-3.5 py-1 md:py-1.5 bg-zinc-800/80 hover:bg-yellow-500 hover:text-black text-zinc-300 hover:border-yellow-500/30 rounded-md md:rounded-full border border-zinc-700/50 flex items-center justify-center font-black text-xs md:text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  !
                </a>
              )}
            </div>
            {/* Categories */}
            {movie.category && movie.category.length > 0 && (
              <div className="col-start-1 col-span-2 md:col-start-auto md:col-span-1 flex flex-wrap gap-2 items-center mb-2">
                <span className="text-zinc-400 font-medium text-xs md:text-sm">
                  Thể loại:
                </span>
                {movie.category.map((cat, index) => (
                  <div
                    key={`${cat.id || cat.slug}-${index}`}
                    className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-full px-2.5 py-0.5 md:px-3 md:py-1 text-xs md:text-sm transition-colors text-zinc-300"
                  >
                    <Link
                      href={`/filter?theLoai=${cat.slug}`}
                      className="text-zinc-300 hover:text-white transition-colors hover:underline"
                    >
                      {cat.name}
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {/* Countries */}
            {movie.country && movie.country.length > 0 && (
              <div className="col-start-1 col-span-2 md:col-start-auto md:col-span-1 flex flex-wrap items-center gap-2 mb-4">
                <span className="text-zinc-400 font-medium text-xs md:text-sm mr-1">
                  Quốc gia:
                </span>
                {movie.country.map((country, index) => (
                  <span
                    key={`${country.id || country.slug}-${index}`}
                    className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-full px-2.5 py-0.5 md:px-3 md:py-1 text-xs md:text-sm transition-colors text-zinc-300"
                  >
                    {country.name}
                  </span>
                ))}
              </div>
            )}
            <ActionButtons isMobileView={false} />
            {/* Description */}
            {movie.content && (
              <div className="col-start-1 col-span-2 md:col-start-auto md:col-span-1 mt-4 mb-4">
                <div className="backdrop-blur-md bg-zinc-950/40 p-5 md:p-7 rounded-2xl border border-zinc-800/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                  <h4 className="text-zinc-200 font-bold text-sm md:text-base uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-zinc-800/50 pb-2">
                    <AlignLeft className="w-4 h-4 text-emerald-400" />
                    Nội dung phim
                  </h4>
                  <div
                    className="text-zinc-300/95 text-xs md:text-sm leading-relaxed md:leading-loose font-normal tracking-wide space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
                    dangerouslySetInnerHTML={{ __html: movie.content }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-full mt-8 md:mt-12 flex flex-col min-w-0">
          {/* TV Seasons */}
          {(() => {
            const validSeasons = tmdbData?.seasons?.filter(s => s.season_number >= 0) || [];
            const hasSeasonIndicator = 
              /(?:Phần|Mùa|Season|Part|Tập|P)\s*\d+/i.test(movie.name) || 
              /(?:Phần|Mùa|Season|Part|Tập|P)\s*\d+/i.test(movie.origin_name || "");
            const shouldShowSeasons = validSeasons.length >= 2 || (validSeasons.length >= 1 && hasSeasonIndicator);
            if (!shouldShowSeasons) return null;
            return (
              <div className="mt-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Film className="w-5 h-5 text-emerald-400" /> Các phần phim (Seasons)
                </h3>
                <div className="relative w-full rounded-xl overflow-hidden group border border-zinc-800 transition-colors mb-4">
                  <div className="absolute inset-0 bg-zinc-900">
                    <img
                      src={tmdbData?.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbData.backdrop_path}` : currentBackdropUrl}
                      alt={movie.name}
                      className="w-full h-full object-cover opacity-20 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                  </div>
                  <div className="relative z-10 p-4">
                    <div className="flex overflow-x-auto gap-3 md:gap-4 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      {validSeasons.map((season) => {
                    const cleanMovieName = (movie.origin_name || movie.name)
                      .replace(/\s*[\(\[-]?\s*(Phần|Mùa|Season|Tập|Part)\s*\d+\s*[\)\]]?/gi, "")
                      .trim();
                    const vietnameseMovieName = movie.name
                      .replace(/\s*[\(\[-]?\s*(Phần|Mùa|Season|Tập|Part)\s*\d+\s*[\)\]]?/gi, "")
                      .trim();

                    let seasonNameClean = season.name;
                    const movieNameEscaped = cleanMovieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    seasonNameClean = seasonNameClean.replace(new RegExp(movieNameEscaped, 'gi'), '').trim();
                    const viMovieNameEscaped = vietnameseMovieName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    seasonNameClean = seasonNameClean.replace(new RegExp(viMovieNameEscaped, 'gi'), '').trim();

                    let cleanSeasonName = "";
                    const numberMatch = seasonNameClean.match(/\d+/);
                    if (numberMatch) {
                      cleanSeasonName = `Phần ${numberMatch[0]}`;
                    } else {
                      if (seasonNameClean.length > 0) {
                        cleanSeasonName = seasonNameClean
                          .replace(/Mùa\s*/gi, "Phần ")
                          .replace(/Season\s*/gi, "Phần ");
                      } else {
                        cleanSeasonName = `Phần ${season.season_number}`;
                      }
                    }

                    const seasonSlug = `tmdb-tv-${tmdbData?.id}-s${season.season_number}`;
                    return (
                      <a 
                        key={season.id} 
                        href={`/xem-phim/${seasonSlug}`}
                        className="flex-none w-[100px] md:w-[130px] snap-start group cursor-pointer block"
                      >
                        <div className="w-full aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-zinc-900 border border-zinc-800 relative">
                          <img 
                            src={season.poster_path ? `https://image.tmdb.org/t/p/w185${season.poster_path}` : currentPosterUrl} 
                            alt={season.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-2 left-0 right-0 px-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-bold text-yellow-400">{season.vote_average ? season.vote_average.toFixed(1) : "0.0"}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-blue-400 transition-colors" title={season.name}>{season.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{season.episode_count} tập</p>
                      </a>
                    );
                  })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Collections (Moved here to be under seasons, before actors) */}
          {tmdbCollectionData && (
            <div className="mt-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" /> Các phần tiếp theo (Bộ sưu tập)
              </h3>
              <div className="relative w-full rounded-xl overflow-hidden group border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors mb-4">
                <div className="absolute inset-0 bg-zinc-900">
                  <img
                    src={tmdbCollectionData.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbCollectionData.backdrop_path}` : currentBackdropUrl}
                    alt={tmdbCollectionData.name}
                    className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
                </div>
                <div className="relative z-10 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs text-purple-400 font-bold mb-0.5 uppercase tracking-wider">Bộ sưu tập phim</p>
                    <h4 className="text-base md:text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{tmdbCollectionData.name}</h4>
                  </div>
                  <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm group-hover:bg-purple-600 group-hover:text-white transition-all text-zinc-300">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <a href={`/tim-kiem/${encodeURIComponent(tmdbCollectionData.name.replace(" Collection", "").replace(" Bộ Sưu Tập", ""))}`} className="absolute inset-0 z-20" />
              </div>
              
              {/* Collection Parts */}
              {tmdbCollectionData.parts && tmdbCollectionData.parts.length > 0 && (
                <div className="mt-3 flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {tmdbCollectionData.parts.map((part) => (
                    <a 
                      key={part.id} 
                      href={`/xem-phim/tmdb-movie-${part.id}`}
                      className="flex-none w-[100px] md:w-[130px] snap-start group block"
                    >
                      <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-zinc-900 border border-zinc-800 relative">
                        <img 
                          src={part.poster_path ? `https://image.tmdb.org/t/p/w185${part.poster_path}` : currentPosterUrl} 
                          alt={part.title || part.name || ""}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-2 left-0 right-0 px-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-bold text-yellow-400">{part.vote_average ? part.vote_average.toFixed(1) : "0.0"}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-zinc-200 line-clamp-2 group-hover:text-blue-400 transition-colors" title={part.title || part.name}>{part.title || part.name}</p>
                      {part.release_date && <p className="text-[10px] text-zinc-500 mt-0.5">{part.release_date.split("-")[0]}</p>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {tmdbData?.credits?.cast?.length ||
          tmdbData?.credits?.crew?.length ||
          peoples?.peoples?.length ||
          hasValidActor ||
          hasValidDirector ? (
            <div className="mt-4 mb-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Đạo diễn & Diễn viên
              </h3>
              <div className="flex overflow-x-auto gap-3 md:gap-4 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {(() => {
                  const getProfileImageUrl = (path: string | null | undefined) => {
                    if (!path) return null;
                    if (path.startsWith("http")) return path;
                    return `https://image.tmdb.org/t/p/w185${path}`;
                  };

                  const list: any[] = [];
                  const seen = new Set<string>();

                  const addPerson = (name: string, role: string, profilePath: string | null | undefined, isDirector: boolean) => {
                    if (!profilePath || typeof profilePath !== "string" || profilePath.trim() === "") return;
                    
                    const key = name.toLowerCase().trim();
                    if (seen.has(key)) return;
                    
                    seen.add(key);
                    list.push({
                      name,
                      role,
                      profile_path: profilePath,
                      isDirector
                    });
                  };

                  // 1. Đạo diễn từ TMDB credits
                  tmdbData?.credits?.crew?.filter((c) => c.job === "Director").forEach(d => {
                    addPerson(d.name, "Đạo diễn", d.profile_path, true);
                  });

                  // 2. Đạo diễn từ validDirectors (kết hợp lấy ảnh trong peoples)
                  validDirectors.forEach(dName => {
                    const match = peoples?.peoples?.find(p => p.name.toLowerCase().trim() === dName.toLowerCase().trim() || p.original_name.toLowerCase().trim() === dName.toLowerCase().trim());
                    addPerson(dName, "Đạo diễn", match?.profile_path, true);
                  });

                  // 3. Đạo diễn từ peoples.peoples
                  peoples?.peoples?.filter(p => p.known_for_department === "Directing" || p.character === "Đạo diễn").forEach(p => {
                    addPerson(p.name, "Đạo diễn", p.profile_path, true);
                  });

                  // 4. Diễn viên từ TMDB credits
                  tmdbData?.credits?.cast?.slice(0, 20).forEach(a => {
                    addPerson(a.name, a.character || "Diễn viên", a.profile_path, false);
                  });

                  // 5. Diễn viên từ peoples.peoples (lọc đạo diễn)
                  peoples?.peoples?.filter(p => p.known_for_department !== "Directing" && p.character !== "Đạo diễn").slice(0, 20).forEach(p => {
                    addPerson(p.name, p.character || "Diễn viên", p.profile_path, false);
                  });

                  // 6. Diễn viên từ validActors
                  validActors.forEach(aName => {
                    const match = peoples?.peoples?.find(p => p.name.toLowerCase().trim() === aName.toLowerCase().trim() || p.original_name.toLowerCase().trim() === aName.toLowerCase().trim());
                    addPerson(aName, "Diễn viên", match?.profile_path, false);
                  });

                  const finalList = list.slice(0, 10);
                  if (finalList.length === 0) return null;

                  return finalList.map((person, idx) => (
                    <div
                      key={`${person.name}-${idx}`}
                      className="flex-none w-[100px] md:w-[130px] snap-start group block relative z-30"
                    >
                      <div
                        className={`relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-zinc-900 border transition-all ${person.isDirector ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-zinc-800"}`}
                      >
                        {person.profile_path ? (
                          <img
                            src={getProfileImageUrl(person.profile_path)!}
                            alt={person.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Users className="w-8 h-8" />
                          </div>
                        )}
                        {person.isDirector && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-bl-xl z-10 tracking-wider shadow-md">
                            ĐẠO DIỄN
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <p
                        className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-blue-400 transition-colors"
                        title={person.name}
                      >
                        {person.name}
                      </p>
                      <p
                        className={`text-xs line-clamp-1 mt-0.5 ${person.isDirector ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}
                        title={person.role}
                      >
                        {person.role}
                      </p>
                    </div>
                  ));
                })()}
                {/* Fallback to text if no data exists */}
                {(!tmdbData?.credits?.cast && !tmdbData?.credits?.crew && !peoples?.peoples) && (
                  <div className="flex flex-col gap-2 w-full text-zinc-300">
                    {hasValidDirector && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-sm text-zinc-500 mr-2">
                          Đạo diễn:
                        </span>
                        <span className="text-white font-medium">
                          {validDirectors.join(", ")}
                        </span>
                      </div>
                    )}
                    {hasValidActor && (
                      <div className="flex flex-wrap gap-2 mt-2 text-sm">
                        <span className="text-sm text-zinc-500 mr-2">
                          Diễn viên:
                        </span>
                        <span className="text-zinc-300">
                          {validActors.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {/* Episode Selector for Series Movies directly in Detail Page */}
          {episodes && episodes.length > 0 && (
            <div className="mt-8 border-t border-zinc-900 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {episodes[selectedServerIndex]?.server_data?.length <= 1
                  ? "Server nguồn / Tập"
                  : "Danh sách tập"}
              </h3>
              {/* Server Selection */}
              {episodes.length >= 1 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {episodes.map((server, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setSelectedServerIndex(sIdx)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedServerIndex === sIdx
                            ? "bg-red-600 text-white shadow-md shadow-red-900/20"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {getCleanServerName(server.server_name)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Episodes selection grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {episodes[selectedServerIndex]?.server_data?.map(
                  (episode: any, idx: number) => {
                    const epKey1 = `${movie.slug}_${episode.name}`;
                    const epKey2 =
                      episode.link_m3u8 || episode.link_embed || episode.slug;
                    const isCurrentlyWatching =
                      historyItem?.currentServerIndex === selectedServerIndex &&
                      historyItem?.currentEpisodeIndex === idx;
                    const isWatched =
                      watchedEpisodes.has(epKey1) ||
                      watchedEpisodes.has(epKey2);
                    return (
                      <Link
                        key={`${episode.slug}-${idx}`}
                        href={`/xem-phim/${movie.slug}?tap=${idx + 1}&server=${selectedServerIndex}`}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center cursor-pointer border ${
                          isCurrentlyWatching
                            ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-900/20"
                            : isWatched
                              ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/40"
                              : "bg-zinc-900 hover:bg-red-600 text-zinc-300 hover:text-white border-transparent"
                        }`}
                      >
                        {episode.name}
                      </Link>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </div>


        {/* Movie Comments */}
        <MovieComments
          movieSlug={movie.slug}
          movieName={movie.origin_name || movie.name}
          session={session}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />

        {/* TMDB Reviews */}
        {tmdbData?.reviews?.results && tmdbData.reviews.results.length > 0 && (
          <div className="mt-12 md:mt-16 border-t border-zinc-900 pt-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              Đánh giá từ cộng đồng
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pr-2">
              {tmdbData.reviews.results.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
function ReviewCard({ review }: { review: any }) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const handleTranslate = async () => {
    if (translatedText) {
      setTranslatedText(null);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: review.content, targetLang: "vi" }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedText(data.translatedText);
      }
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
  };
  const displayText = translatedText
    ? translatedText.replace(/<[^>]*>?/gm, "")
    : review.content.replace(/<[^>]*>?/gm, "");
  const shouldTruncate = displayText.length > 250;
  return (
    <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 hover:bg-zinc-900/60 transition-all duration-300 shadow-lg hover:shadow-zinc-900/50 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700/50 shadow-inner flex-shrink-0">
            {review.author_details?.avatar_path ? (
              <img
                src={
                  review.author_details.avatar_path.startsWith("/https")
                    ? review.author_details.avatar_path.substring(1)
                    : `https://image.tmdb.org/t/p/w154${review.author_details.avatar_path}`
                }
                alt={review.author}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold uppercase text-lg">
                {review.author.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-wide line-clamp-1">
              {review.author}
            </h4>
            <p className="text-xs text-zinc-500 font-medium">
              {new Date(review.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        {review.author_details?.rating && (
          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1.5 rounded-xl flex-shrink-0 ml-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
            <span className="text-sm font-bold text-yellow-400">
              {review.author_details.rating}.0
            </span>
          </div>
        )}
      </div>
      <div className="flex-grow">
        <div
          className={`text-base text-zinc-300 ${expanded ? "" : "line-clamp-[6]"} leading-relaxed md:leading-loose whitespace-pre-wrap mb-2 font-light tracking-wide`}
        >
          {displayText}
        </div>
        {shouldTruncate && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-medium mb-4 transition-colors flex items-center gap-1"
          >
            {expanded ? "Thu gọn" : "Đọc tiếp"}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-auto pt-4 border-t border-zinc-800/50">
        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 active:scale-95 w-fit"
        >
          {isTranslating ? (
            <>
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Đang dịch...
            </>
          ) : (
            <>
              <Languages className="w-3.5 h-3.5" />
              {translatedText
                ? "Xem bản gốc (Tiếng Anh)"
                : "Dịch sang Tiếng Việt"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToMovieNotifications(movieSlug: string, movieName: string) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported on this device/browser");
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    const keyRes = await fetch("/api/subscribe");
    if (!keyRes.ok) throw new Error("Failed to fetch VAPID public key");
    const { publicKey } = await keyRes.json();

    if (!publicKey) {
      console.error("VAPID public key is missing");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, movieSlug }),
    });
    console.log(`Successfully subscribed to push notifications for: ${movieName}`);
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
  }
}
