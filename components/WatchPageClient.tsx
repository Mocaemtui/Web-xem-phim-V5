"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import EpisodeSelector from "@/components/EpisodeSelector";
import type { MovieDetail } from "@/types/api";
import { saveWatchHistory, getWatchHistory } from "@/lib/watchHistory";
import { sortEpisodes, getBackdropUrl } from "@/lib/api";
import { Star, AlignLeft, ListPlus, Check, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-zinc-900 rounded-lg flex items-center justify-center">
    </div>
  )
});


interface WatchPageClientProps {
  movie: MovieDetail;
  posterUrl: string;
  tmdbData?: any;
  seasonData?: any;
  tmdbCollectionData?: any;
}

import { useRouter } from "next/navigation";
import { Film } from "lucide-react";

const getServerPriority = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("nguonc") || lower.includes("nguồn c")) return 3;
  if (lower.includes("phimapi") || lower.includes("kkphim") || lower.includes("kk phim")) return 2;
  if (lower.includes("ophim")) return 1;
  return 0;
};

const isSameServerProvider = (nameA: string, nameB: string): boolean => {
  const clean = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("nguonc") || lower.includes("nguồn c")) return "nguonc";
    if (lower.includes("phimapi") || lower.includes("kkphim") || lower.includes("kk phim")) return "phimapi";
    if (lower.includes("ophim")) return "ophim";
    return lower;
  };
  return clean(nameA) === clean(nameB);
};

export default function WatchPageClient({ movie, posterUrl, tmdbData, seasonData, tmdbCollectionData }: WatchPageClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
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
  
  const handleBack = () => {
    router.push(`/phim/${movie.slug}`);
  };

  const getExtendedEpisodes = () => {
    const baseEpisodes = [...(movie.episodes || [])];
    const tmdbId = tmdbData?.id || movie.tmdb?.id;
    const imdbId = movie.imdb?.id || movie.imdb?.id;

    if (tmdbId || imdbId) {
      const templateServer = baseEpisodes.find(s => s.server_data && s.server_data.length > 0);
      const isTVShow = movie.type === 'series' || movie.type === 'hoathinh' || (templateServer && templateServer.server_data.length > 1);
      const seasonNum = movie.tmdb?.season || tmdbData?.season_number || 1;

      const generateServerData = (baseUrlFunc: (epNum: number) => string) => {
        if (!isTVShow) {
          return [{
            name: "Full",
            slug: "full",
            filename: "Full",
            link_embed: baseUrlFunc(1),
            link_m3u8: "",
            link: baseUrlFunc(1)
          }];
        } else {
          if (templateServer) {
            return templateServer.server_data.map((ep, idx) => {
              let epNum = idx + 1;
              const match = ep.name.match(/\d+/);
              if (match) epNum = parseInt(match[0], 10);
              return {
                name: ep.name,
                slug: ep.slug,
                filename: ep.filename,
                link_embed: baseUrlFunc(epNum),
                link_m3u8: "",
                link: baseUrlFunc(epNum)
              };
            });
          } else if (seasonData?.episodes || tmdbData?.number_of_episodes) {
             const maxEps = seasonData?.episodes?.length || tmdbData?.number_of_episodes || 1;
             return Array.from({length: maxEps}, (_, i) => {
               const epNum = i + 1;
               return {
                 name: `Tập ${epNum}`,
                 slug: `tap-${epNum}`,
                 filename: `Tập ${epNum}`,
                 link_embed: baseUrlFunc(epNum),
                 link_m3u8: "",
                 link: baseUrlFunc(epNum)
               }
             });
          } else {
             return [{
                 name: `Tập 1`,
                 slug: `tap-1`,
                 filename: `Tập 1`,
                 link_embed: baseUrlFunc(1),
                 link_m3u8: "",
                 link: baseUrlFunc(1)
             }];
          }
        }
      };

      if (tmdbId) {
        baseEpisodes.push({
          server_name: "VidLink",
          server_data: generateServerData((epNum) =>
            isTVShow ? `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${epNum}`
                     : `https://vidlink.pro/movie/${tmdbId}`
          )
        });
      } else if (imdbId) {
        baseEpisodes.push({
          server_name: "VidLink",
          server_data: generateServerData((epNum) =>
            isTVShow ? `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${epNum}`
                     : `https://vidlink.pro/movie/${tmdbId}`
          )
        });
      }
    }
    return sortEpisodes(baseEpisodes);
  };

  const [episodes, setEpisodes] = useState(getExtendedEpisodes());

  
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const [playerMode, setPlayerMode] = useState<"iframe" | "hls">("iframe");
  const [subtitlesData, setSubtitlesData] = useState<any[]>([]);
  const [fetchingSubtitles, setFetchingSubtitles] = useState(false);
  const [subOffset, setSubOffset] = useState(0);
  const [subSize, setSubSize] = useState("20px");
  const [subColor, setSubColor] = useState("#FFFF00");
  const [subBg, setSubBg] = useState("#00000080");
  const [subShadow, setSubShadow] = useState("#000000");
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [currentOriginName, setCurrentOriginName] = useState(movie.origin_name);
  const prevTimeRef = useRef<number>(0);
  const lastVidlinkSaveRef = useRef(0);

  // Reset trạng thái khi chuyển phim mới
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRestored(false);
    setCurrentEpisodeIndex(0);
    const extendedEps = getExtendedEpisodes();
    
    setEpisodes(extendedEps);
    // Luôn chọn server đầu tiên (đã sắp xếp theo thứ tự ưu tiên: PhimAPI > Ophim)
    // khi mở phim mới, trừ phi được phục hồi từ lịch sử xem của chính phim này.
    setCurrentServerIndex(0);
    setSelectedServerIndex(0);
    setCurrentOriginName(movie.origin_name);
  }, [movie.slug, movie.origin_name, movie.episodes]);



  useEffect(() => {
    if (!isRestored) {
      // Check query parameters first (e.g. ?tap=3&server=0)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tapParam = params.get("tap");
        const serverParam = params.get("server");
        
        let sIdx = serverParam ? parseInt(serverParam, 10) : 0;
        let tIdx = tapParam ? parseInt(tapParam, 10) - 1 : 0;
        
        if (tapParam || serverParam) {
          if (episodes?.[sIdx]?.server_data?.[tIdx]) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentServerIndex(sIdx);
            setCurrentEpisodeIndex(tIdx);
            setIsRestored(true);
            return;
          } else if (episodes?.[0]?.server_data?.[tIdx]) {
            setCurrentServerIndex(0);
            setCurrentEpisodeIndex(tIdx);
            setIsRestored(true);
            return;
          }
        }
      }

      const history = getWatchHistory();
      const item = history.find(i => i.slug === movie.slug);
      if (item) {
        let foundServerIdx = -1;
        let foundEpisodeIdx = -1;

        const targetServerName = item.serverName || 
          (item.currentServerIndex === 2 ? "Ophim" : 
           item.currentServerIndex === 0 ? "PhimAPI" : undefined);

        if (targetServerName) {
          foundServerIdx = episodes.findIndex(e => 
            e.server_name === targetServerName || 
            isSameServerProvider(e.server_name, targetServerName)
          );
        }

        if (foundServerIdx === -1 && item.currentServerIndex !== undefined && episodes[item.currentServerIndex]) {
          foundServerIdx = item.currentServerIndex;
        }

        if (foundServerIdx !== -1 && episodes[foundServerIdx]) {
          const sData = episodes[foundServerIdx].server_data || [];
          if (item.episodeName) {
            foundEpisodeIdx = sData.findIndex((ep: any) => ep.name === item.episodeName);
          } else {
            foundEpisodeIdx = item.currentEpisodeIndex;
          }
          
          if (foundEpisodeIdx !== -1 && sData[foundEpisodeIdx]) {
            setCurrentServerIndex(foundServerIdx);
            setSelectedServerIndex(foundServerIdx);
            setCurrentEpisodeIndex(foundEpisodeIdx);
            if (item.currentTime) {
              localStorage.setItem(`playback_progress_${movie.slug}_ep_${foundEpisodeIdx}`, item.currentTime.toString());
            }
          } else {
            setCurrentServerIndex(foundServerIdx);
            setSelectedServerIndex(foundServerIdx);
            setCurrentEpisodeIndex(0);
            if (item.currentTime) {
              localStorage.setItem(`playback_progress_${movie.slug}_ep_0`, item.currentTime.toString());
            }
          }
        }
      }
      setIsRestored(true);
    }
  }, [movie, isRestored, episodes]);

  const currentServer = episodes[currentServerIndex];

  const serverData = currentServer?.server_data || [];
  const currentEpisode = serverData[currentEpisodeIndex];
  const currentServerName = currentServer?.server_name;

  useEffect(() => {
    const isExternalSource = currentServerName?.toLowerCase().includes("vidlink");
    const imdbId = movie.imdb?.id;
    
    if (isExternalSource && currentEpisode && imdbId) {
      setFetchingSubtitles(true);
      setSubtitlesData([]);

      let epNum = currentEpisodeIndex + 1;
      const match = currentEpisode.name?.match(/\d+/);
      if (match) epNum = parseInt(match[0], 10);

      const templateServer = movie.episodes?.find((s: any) => s.server_data && s.server_data.length > 0);
      const isTVShow = movie.type === 'series' || movie.type === 'hoathinh' || (templateServer && templateServer.server_data.length > 1);
      const seasonNum = movie.tmdb?.season || tmdbData?.season_number || 1;

      const fetchUrl = isTVShow 
        ? `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${seasonNum}:${epNum}.json`
        : `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;

      fetch(fetchUrl)
        .then(res => res.json())
        .then(data => {
           let newSubs: any[] = [];
           if (data.subtitles && data.subtitles.length > 0) {
             const vieSubs = data.subtitles.filter((s: any) => s.lang === 'vie').slice(0, 2);
             const engSubs = data.subtitles.filter((s: any) => s.lang === 'eng').slice(0, 1);
             const selectedSubs = [...vieSubs, ...engSubs];
             if (selectedSubs.length > 0) {
               newSubs = selectedSubs.map((s: any, idx: number) => ({
                 file: s.url,
                 label: s.lang === 'vie' ? `Tiếng Việt (Stremio ${idx + 1})` : "English (Stremio)",
                 kind: "captions"
               }));
             }
           }

           // Fetch thêm từ SubDL Proxy
           let subdlUrl = `/api/subtitles?imdbId=${imdbId}`;
           if (movie.type === 'series' || movie.type === 'hoathinh') {
             const season = movie.tmdb?.season || tmdbData?.season_number || 1;
             subdlUrl += `&season=${season}&episode=${epNum}`;
           }

           fetch(subdlUrl)
            .then(res => res.json())
            .then(subdlData => {
               if (subdlData.subtitles && subdlData.subtitles.length > 0) {
                  newSubs.push(subdlData.subtitles[0]);
               }
               setSubtitlesData(newSubs);
               setFetchingSubtitles(false);
            })
            .catch(() => {
               setSubtitlesData(newSubs);
               setFetchingSubtitles(false);
            });
        })
        .catch(err => {
          console.error("Subtitle fetch error", err);
          setFetchingSubtitles(false);
        });
    } else {
      setSubtitlesData([]);
      setFetchingSubtitles(false);
    }
  }, [currentEpisode, currentServerName, movie, tmdbData, currentEpisodeIndex]);

  // Listener tracking thời gian xem cho iframe VidLink
  useEffect(() => {
    const handleVidlinkMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vidlink.pro') return;
      if (event.data?.type === 'PLAYER_EVENT') {
        const { event: eventType, currentTime, duration } = event.data.data;
        if (eventType === 'timeupdate' && currentEpisode && currentServer) {
           const now = Date.now();
           // Chỉ lưu vào localStorage mỗi 5 giây để tránh giật lag (Throttle I/O)
           if (now - lastVidlinkSaveRef.current > 5000) {
             lastVidlinkSaveRef.current = now;
             saveWatchHistory(
                movie,
                currentEpisode.name || `Tập ${currentEpisodeIndex + 1}`,
                currentServer.server_name,
                currentServerIndex,
                currentEpisodeIndex,
                currentTime,
                duration
             );
           }
        }
      }
    };
    window.addEventListener('message', handleVidlinkMessage);
    return () => window.removeEventListener('message', handleVidlinkMessage);
  }, [movie, currentEpisode, currentServer, currentServerIndex, currentEpisodeIndex]);

  // Save watch history whenever episode or server changes
  useEffect(() => {
    if (isRestored && currentEpisode && currentServer) {
      saveWatchHistory(
        movie,
        currentEpisode.name || `Tập ${currentEpisodeIndex + 1}`,
        currentServer.server_name,
        currentServerIndex,
        currentEpisodeIndex
      );
    }
  }, [movie, currentEpisode, currentServer, currentServerIndex, currentEpisodeIndex, isRestored]);

  useEffect(() => {
    if (currentEpisode) {
      if (currentEpisode.link_m3u8) {
        setPlayerMode("hls");
      } else if (currentEpisode.link_embed) {
        setPlayerMode("iframe");
      }
    }
  }, [currentEpisode, currentServerName]);





  const handleEpisodeSelect = (episodeIndex: number) => {
    setCurrentServerIndex(selectedServerIndex);
    setCurrentEpisodeIndex(episodeIndex);
  };

  const handleServerChange = (serverIndex: number) => {
    setSelectedServerIndex(serverIndex);
    if (typeof window !== "undefined") {
      const preferred = episodes[serverIndex]?.server_name;
      if (preferred) {
        localStorage.setItem("preferred_server_name", preferred);
      }
    }
  };

  const [malAnimeUrl, setMalAnimeUrl] = useState("");
  useEffect(() => {
    if (currentServerName === "VidLink Anime (Chuẩn MAL)") {
      const searchTitle = movie.origin_name || movie.name || '';
      fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTitle)}&limit=1`)
        .then(res => res.json())
        .then(data => {
            if (data.data && data.data.length > 0) {
               const malId = data.data[0].mal_id;
               let epNum = currentEpisodeIndex + 1;
               const match = currentEpisode?.name?.match(/\d+/);
               if (match) epNum = parseInt(match[0], 10);
               setMalAnimeUrl(`https://vidlink.pro/anime/${malId}/${epNum}/sub?fallback=true`);
            }
        })
        .catch(console.error);
    }
  }, [currentServerName, movie.origin_name, currentEpisodeIndex, currentEpisode]);

  let finalEmbedUrl = currentEpisode?.link_embed;
  if (currentServerName === "VidLink Anime (Chuẩn MAL)" && malAnimeUrl) {
    finalEmbedUrl = malAnimeUrl;
  }
  
  if (finalEmbedUrl) {
    const separator = finalEmbedUrl.includes('?') ? '&' : '?';
    
    if (currentServerName?.toLowerCase().includes("vidlink")) {
      if (subtitlesData.length > 0) {
        const firstSub = subtitlesData[0];
        const customizedUrl = `${firstSub.file}&offset=${subOffset}&fs=${encodeURIComponent(subSize)}&c=${encodeURIComponent(subColor)}&bg=${encodeURIComponent(subBg)}&b=${encodeURIComponent(subShadow)}`;
        finalEmbedUrl += `&sub_file=${encodeURIComponent(customizedUrl)}&sub_label=${encodeURIComponent(firstSub.label)}`;
      }
    }
  }
  const finalVideoUrl = playerMode === "hls" ? currentEpisode?.link_m3u8 : undefined;

  const isSingleEpisode = currentEpisode?.name?.toLowerCase().includes("full") || (episodes.length > 0 && serverData.length === 1 && currentEpisode?.name === "1");

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      {/* Top Bar with Back Button */}
      <div className="fixed top-[76px] left-4 z-40 pointer-events-none flex items-start">
        <button 
          onClick={handleBack}
          className="pointer-events-auto opacity-100 md:opacity-0 md:hover:opacity-100 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg hover:scale-105 active:scale-95 duration-300"
          title="Quay lại"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="container mx-auto px-4 py-4 mt-2 md:mt-4">
        
        {/* Video Player */}
        <div className="mb-8 relative z-10 w-full aspect-video">
          {fetchingSubtitles ? (
            <div className="relative w-full h-full bg-zinc-900/80 rounded-lg flex flex-col items-center justify-center space-y-4 text-zinc-400 border border-zinc-800 backdrop-blur-sm">
               <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="font-medium animate-pulse text-sm">Đang tìm kiếm phụ đề Tiếng Việt tự động...</p>
            </div>
          ) : currentEpisode ? (
            <VideoPlayer
              key={`${currentServerIndex}-${currentEpisodeIndex}-${playerMode}`}
              poster={getBackdropUrl(movie)}
              videoUrl={finalVideoUrl}
              embedUrl={finalEmbedUrl}
              playbackProgressKey={`playback_progress_${movie.slug}_ep_${currentEpisodeIndex}`}
              onError={() => {
                if (playerMode === "hls" && currentEpisode.link_embed) {
                  setPlayerMode("iframe");
                }
              }}
              hasNextEpisode={currentEpisodeIndex < serverData.length - 1}
              nextVideoUrl={serverData[currentEpisodeIndex + 1]?.link_m3u8}
              onAutoNext={() => {
                if (currentEpisodeIndex < serverData.length - 1) {
                  setCurrentEpisodeIndex((prev) => prev + 1);
                }
              }}
              onProgress={(time, duration) => {
                // Track real-time watch duration
                const diff = time - prevTimeRef.current;
                if (diff > 0 && diff <= 5) { // Normal playback speed, not skipping
                  const todayStr = new Date().toDateString();
                  const key = `moviehub_watch_seconds_today_${todayStr}`;
                  const currentTotal = parseInt(localStorage.getItem(key) || "0", 10);
                  localStorage.setItem(key, (currentTotal + diff).toString());
                }
                prevTimeRef.current = time;

                saveWatchHistory(
                  movie,
                  currentEpisode.name || `Tập ${currentEpisodeIndex + 1}`,
                  currentServer.server_name,
                  currentServerIndex,
                  currentEpisodeIndex,
                  time,
                  duration
                );
              }}
            />
          ) : (
            <div className="relative w-full aspect-video bg-zinc-900 rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-zinc-400 text-lg mb-2">Không tìm thấy link phim</p>
                <p className="text-zinc-500 text-sm">Phim này hiện không có sẵn để xem</p>
              </div>
            </div>
          )}
        </div>

        {/* Movie Info (Below Video Player) */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {isSingleEpisode 
                ? movie.name 
                : `${movie.name} - ${currentEpisode?.name?.toLowerCase().includes("tập") ? currentEpisode.name : `Tập ${currentEpisode?.name || currentEpisodeIndex + 1}`}`
              }
            </h1>
            
            {movie.slug && session && (
              <div className="relative self-start md:self-auto shrink-0 z-30" ref={playlistDropdownRef}>
                <button
                  onClick={() => setPlaylistDropdownOpen(!playlistDropdownOpen)}
                  title="Thêm vào danh sách phát"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border bg-zinc-900/60 hover:bg-zinc-850/80 text-zinc-300 border-zinc-800/80 cursor-pointer"
                >
                  <ListPlus className="w-4 h-4" />
                  Lưu vào playlist
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
          {currentOriginName && (
            <p className="text-lg text-zinc-400 mb-4">{currentOriginName}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
            {displayRating !== null && displayRating > 0 && (
              <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/30 font-bold flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                <Star className="w-4 h-4 fill-current" />
                {displayRating.toFixed(1)}{displayVoteCount ? ` (${formatVoteCount(displayVoteCount)})` : ""}
              </span>
            )}
            <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full">
              {movie.year}
            </span>
            {movie.quality && (
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full">
                {movie.quality}
              </span>
            )}
            {movie.lang && (
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full">
                {movie.lang.replace(/\/\s*\d+$/, "").trim()}
              </span>
            )}
            {movie.time && (
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full">
                {movie.time}
              </span>
            )}
          </div>

          {/* Categories */}
          {movie.category && movie.category.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.category.map((cat: any) => (
                <span
                  key={cat.id || cat.slug}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Countries */}
          {movie.country && movie.country.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.country.map((country: any) => (
                <span
                  key={country.id || country.slug}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400"
                >
                  {country.name}
                </span>
              ))}
            </div>
          )}

          {/* Actors */}
          {movie.actor && movie.actor.length > 0 && (
            <div className="mb-4">
              <span className="text-sm text-zinc-500">Diễn viên: </span>
              <span className="text-sm text-zinc-400">
                {movie.actor.join(", ")}
              </span>
            </div>
          )}

          {/* Content Description */}
          {movie.content && (
            <div className="mt-6 mb-6 max-w-4xl">
              <div className="backdrop-blur-md bg-zinc-950/40 p-5 md:p-7 rounded-2xl border border-zinc-800/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                <h4 className="text-zinc-200 font-bold text-sm md:text-base uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-zinc-800/50 pb-2">
                  <AlignLeft className="w-4 h-4 text-emerald-400" />
                  Nội dung phim
                </h4>
                <div 
                  className="text-zinc-300/95 text-xs md:text-sm leading-relaxed md:leading-loose font-normal tracking-wide space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
                  dangerouslySetInnerHTML={{ __html: movie.content }}
                />
              </div>
            </div>
          )}

          {/* Subtitle Settings panel */}
          {subtitlesData.length > 0 && currentServerName?.toLowerCase().includes("vidlink") && (
            <div className="mt-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5 transition-all">
              <button
                onClick={() => setShowSubSettings(!showSubSettings)}
                className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors focus:outline-none"
              >
                <Settings size={16} /> Tuỳ chỉnh Phụ đề Nâng cao (Dành cho VidLink)
              </button>
              
              {showSubSettings && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                  {/* Offset */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400">Đồng bộ Thời gian (Độ trễ)</label>
                    <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg p-1.5 w-max">
                      <button onClick={() => setSubOffset(p => p - 500)} className="px-2 py-1 bg-white/5 hover:bg-white/20 rounded text-sm transition-colors text-white">-0.5s</button>
                      <span className="text-sm font-mono text-center min-w-[50px] text-[var(--color-cyan-neon)]">{(subOffset/1000).toFixed(1)}s</span>
                      <button onClick={() => setSubOffset(p => p + 500)} className="px-2 py-1 bg-white/5 hover:bg-white/20 rounded text-sm transition-colors text-white">+0.5s</button>
                    </div>
                  </div>
                  
                  {/* Size */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400">Kích thước chữ</label>
                    <select value={subSize} onChange={e => setSubSize(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-cyan-neon)] cursor-pointer">
                      <option value="16px">Nhỏ</option>
                      <option value="20px">Vừa</option>
                      <option value="24px">Lớn (Mặc định)</option>
                      <option value="32px">Rất Lớn</option>
                    </select>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400">Màu chữ</label>
                    <div className="flex gap-2 h-10">
                      <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)} className="w-full h-full rounded border-none bg-transparent cursor-pointer p-0" />
                    </div>
                  </div>

                  {/* Background */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400">Nền phụ đề</label>
                    <select value={subBg} onChange={e => setSubBg(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-cyan-neon)] cursor-pointer">
                      <option value="transparent">Trong suốt</option>
                      <option value="rgba(0,0,0,0.5)">Đen mờ (50%)</option>
                      <option value="rgba(0,0,0,0.8)">Đen đậm (80%)</option>
                      <option value="rgba(255,0,0,0.3)">Đỏ mờ (30%)</option>
                    </select>
                  </div>
                  
                  <div className="col-span-full text-xs text-yellow-500/80 mt-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                    Thay đổi tuỳ chỉnh sẽ tự động tải lại video, nhưng thời gian xem hiện tại vẫn được giữ nguyên.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Episode Selector */}
        <div className="relative z-30">
          {episodes.length > 0 && serverData.length > 0 ? (
            <EpisodeSelector
              episodes={episodes}
              currentServerIndex={selectedServerIndex}
              currentEpisodeIndex={currentServerIndex === selectedServerIndex ? currentEpisodeIndex : -1}
              onSelectEpisode={handleEpisodeSelect}
              onSelectServer={handleServerChange}
              seasonData={seasonData}
              moviePosterUrl={posterUrl}
            />
          ) : (
            <div className="mb-8 p-4 bg-zinc-900 rounded-lg">
              <p className="text-zinc-400 text-sm">Không có tập phim nào</p>
            </div>
          )}
        </div>
        {/* TV Seasons */}
        {(() => {
          const validSeasons = tmdbData?.seasons?.filter((s: any) => s.season_number >= 0) || [];
          const hasSeasonIndicator = 
            /(?:Phần|Mùa|Season|Part|Tập|P)\s*\d+/i.test(movie.name) || 
            /(?:Phần|Mùa|Season|Part|Tập|P)\s*\d+/i.test(movie.origin_name || "");
          const shouldShowSeasons = validSeasons.length >= 2 || (validSeasons.length >= 1 && hasSeasonIndicator);
          if (!shouldShowSeasons) return null;
          return (
            <div className="mt-8 mb-6 relative z-30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-emerald-400" /> Các phần phim (Seasons)
              </h3>
              <div className="relative w-full rounded-xl overflow-hidden group border border-zinc-800 transition-colors mb-4">
                <div className="absolute inset-0 bg-zinc-900">
                  <img
                    src={tmdbData?.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbData.backdrop_path}` : getBackdropUrl(movie)}
                    alt={movie.name}
                    className="w-full h-full object-cover opacity-20 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                </div>
                <div className="relative z-10 p-4">
                  <div className="flex overflow-x-auto gap-3 md:gap-4 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {validSeasons.map((season: any) => {
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
                          src={season.poster_path ? `https://image.tmdb.org/t/p/w185${season.poster_path}` : posterUrl} 
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

        {/* Collections */}
        {tmdbCollectionData && (
          <div className="mt-8 mb-6 relative z-30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" /> Các phần tiếp theo (Bộ sưu tập)
            </h3>
            <div className="relative w-full rounded-xl overflow-hidden group border border-zinc-800 transition-colors mb-4">
              <div className="absolute inset-0 bg-zinc-900">
                <img
                  src={tmdbCollectionData.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbCollectionData.backdrop_path}` : getBackdropUrl(movie)}
                  alt={tmdbCollectionData.name}
                  className="w-full h-full object-cover opacity-40 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
              </div>
              <div className="relative z-10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] md:text-xs text-purple-400 font-bold mb-0.5 uppercase tracking-wider">Bộ sưu tập phim</p>
                    <h4 className="text-base md:text-lg font-bold text-white">{tmdbCollectionData.name}</h4>
                  </div>
                </div>
                
                {/* Collection Parts */}
                {tmdbCollectionData.parts && tmdbCollectionData.parts.length > 0 && (
                  <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {tmdbCollectionData.parts.map((part: any) => (
                      <a 
                        key={part.id} 
                        href={`/xem-phim/tmdb-movie-${part.id}`}
                        className="flex-none w-[100px] md:w-[130px] snap-start group block"
                      >
                        <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-zinc-900 border border-zinc-800 relative">
                          <img 
                            src={part.poster_path ? `https://image.tmdb.org/t/p/w185${part.poster_path}` : posterUrl} 
                            alt={part.title || part.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-2 left-0 right-0 px-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-bold text-yellow-400">{part.vote_average ? part.vote_average.toFixed(1) : "0.0"}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm font-bold text-zinc-200 line-clamp-2 group-hover:text-purple-400 transition-colors" title={part.title || part.name}>
                          {part.title || part.name}
                        </p>
                        {part.release_date && (
                          <p className="text-[10px] md:text-xs text-zinc-500 mt-1">{new Date(part.release_date).getFullYear()}</p>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
