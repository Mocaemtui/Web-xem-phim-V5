"use client";
import { useEffect, useState } from "react";
import { getCleanServerName } from "@/lib/api";
import Image from "next/image";

interface Episode {
  name: string;
  slug: string;
  filename: string;
  link: string;
  link_embed: string;
  link_m3u8: string;
}

interface Server {
  server_name: string;
  is_ai?: boolean;
  server_data: Episode[];
}

interface EpisodeSelectorProps {
  episodes: Server[];
  currentServerIndex: number;
  currentEpisodeIndex: number;
  onSelectEpisode: (episodeIndex: number) => void;
  onSelectServer: (serverIndex: number) => void;
  seasonData?: any;
  moviePosterUrl?: string;
}

const parseEpisodeNumber = (name: string) => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export default function EpisodeSelector({ 
  episodes, 
  currentServerIndex, 
  currentEpisodeIndex,
  onSelectEpisode,
  onSelectServer,
  seasonData,
  moviePosterUrl
}: EpisodeSelectorProps) {
  const serverData = episodes[currentServerIndex]?.server_data || [];
  const currentEpisode = serverData[currentEpisodeIndex];

  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());

  // Load watched history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("watched_episodes_v3");
      if (stored) {
        setWatchedEpisodes(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  // Mark current episode as watched
  useEffect(() => {
    if (!currentEpisode) return;
    const epKey = currentEpisode.link_m3u8 || currentEpisode.link_embed || currentEpisode.slug;
    if (!epKey) return;
    try {
      const stored = localStorage.getItem("watched_episodes_v3");
      const watched = stored ? JSON.parse(stored) : [];
      if (!watched.includes(epKey)) {
        watched.push(epKey);
        if (watched.length > 1000) watched.shift();
        localStorage.setItem("watched_episodes_v3", JSON.stringify(watched));
        setWatchedEpisodes(new Set(watched));
      }
    } catch {}
  }, [currentEpisode]);

  const hasTmdbImages = seasonData?.episodes?.some((ep: any) => ep.still_path);

  return (
    <div className="mb-8 relative z-20">
      <h3 className="text-lg font-semibold text-white mb-4">
        {serverData.length <= 1 ? "Server nguồn / Tập" : "Danh sách tập"}
      </h3>
      
      {/* Server Selection */}
      {episodes.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {episodes.map((server, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSelectServer(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentServerIndex === index
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

      {/* Episode Selection */}
      {hasTmdbImages ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {serverData.map((episode, index) => {
            const epKey = episode.link_m3u8 || episode.link_embed || episode.slug;
            const isWatched = watchedEpisodes.has(epKey);
            const isCurrent = currentEpisodeIndex === index;
            
            const epNum = parseEpisodeNumber(episode.name);
            const tmdbEp = seasonData?.episodes?.find((e: any) => e.episode_number === epNum);
            const imageUrl = tmdbEp?.still_path 
              ? `https://image.tmdb.org/t/p/w300${tmdbEp.still_path}` 
              : moviePosterUrl || "/placeholder.png";

            return (
              <button
                key={`${episode.slug}-${index}`}
                type="button"
                onClick={() => onSelectEpisode(index)}
                className={`relative group overflow-hidden rounded-xl aspect-video cursor-pointer border transition-all ${
                  isCurrent
                    ? "border-red-500 ring-2 ring-red-500/50 shadow-lg shadow-red-900/20 scale-[1.02]"
                    : "border-zinc-800 hover:border-zinc-600 hover:scale-[1.02]"
                }`}
              >
                <Image
                  src={imageUrl}
                  alt={episode.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                
                {/* Watch progress/status indicator */}
                {isWatched && !isCurrent && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isCurrent ? "text-red-400" : isWatched ? "text-emerald-300" : "text-white"}`}>
                      {episode.name}
                    </span>
                    {tmdbEp?.vote_average > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-yellow-500 font-semibold border border-white/10">
                        ★ {tmdbEp.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {tmdbEp?.name && tmdbEp.name !== `Episode ${epNum}` && (
                    <p className="text-xs text-zinc-300 truncate mt-1 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {tmdbEp.name}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {serverData.map((episode, index) => {
            const epKey = episode.link_m3u8 || episode.link_embed || episode.slug;
            const isWatched = watchedEpisodes.has(epKey);
            return (
              <button
                key={`${episode.slug}-${index}`}
                type="button"
                onClick={() => onSelectEpisode(index)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                  currentEpisodeIndex === index
                    ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-900/20"
                    : isWatched
                      ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/40"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700/50 hover:bg-zinc-700"
                }`}
              >
                {episode.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

