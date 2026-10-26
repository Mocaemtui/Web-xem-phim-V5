"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { MovieDetail } from "@/types/api";
import { getBackdropUrl, getCleanServerName, sortEpisodes } from "@/lib/api";
import { saveWatchHistory } from "@/lib/watchHistory";
import EpisodeSelector from "@/components/EpisodeSelector";
import MovieComments from "@/components/MovieComments";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });

interface WatchPageClientProps {
  movie: MovieDetail;
  posterUrl: string;
  tmdbData?: any;
  seasonData?: any;
  tmdbCollectionData?: any;
}

export default function WatchPageClient({ 
  movie, 
  posterUrl, 
  tmdbData, 
  seasonData, 
  tmdbCollectionData 
}: WatchPageClientProps) {
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const sortedEpisodes = sortEpisodes(movie.episodes || []);
  const currentServer = sortedEpisodes[currentServerIndex];
  const currentEpisode = currentServer?.server_data[currentEpisodeIndex];

  const videoSrc = currentEpisode?.link_m3u8 || currentEpisode?.link_embed || currentEpisode?.link;

  useEffect(() => {
    if (currentEpisode && movie.slug) {
      saveWatchHistory(movie.slug, currentEpisode.name, currentEpisodeIndex);
    }
  }, [currentEpisode, movie.slug, currentEpisodeIndex]);

  const handleTimeUpdate = (currentTime: number) => {
    // Update watch position if needed
  };

  const handleEpisodeChange = (serverIndex: number, episodeIndex: number) => {
    setCurrentServerIndex(serverIndex);
    setCurrentEpisodeIndex(episodeIndex);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 to-black ${isTheaterMode ? 'theater-mode' : ''}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Video Player Section */}
        <div className={`relative bg-black rounded-lg overflow-hidden ${isTheaterMode ? 'max-w-7xl mx-auto' : ''}`}>
          {videoSrc ? (
            <VideoPlayer
              src={videoSrc}
              poster={getBackdropUrl(movie.thumb_url)}
              autoPlay
              onTimeUpdate={handleTimeUpdate}
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-gray-900">
              <p className="text-white">No video source available</p>
            </div>
          )}
        </div>

        {/* Episode Selector */}
        <div className="mt-6">
          <EpisodeSelector
            episodes={sortedEpisodes}
            currentServerIndex={currentServerIndex}
            currentEpisodeIndex={currentEpisodeIndex}
            onEpisodeChange={handleEpisodeChange}
          />
        </div>

        {/* Movie Info */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-white mb-2">{movie.name}</h1>
            <p className="text-gray-400 mb-4">{movie.origin_name}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.category?.map((cat) => (
                <span key={cat.id} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                  {cat.name}
                </span>
              ))}
              {movie.country?.map((country) => (
                <span key={country.id} className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                  {country.name}
                </span>
              ))}
              <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
                {movie.year}
              </span>
              <span className="px-3 py-1 bg-orange-600 text-white text-sm rounded-full">
                {movie.quality}
              </span>
            </div>

            {movie.content && (
              <div className="text-gray-300 mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Nội dung</h3>
                <p>{movie.content}</p>
              </div>
            )}

            {/* Comments */}
            <MovieComments movieSlug={movie.slug} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {tmdbData && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">TMDB Rating</h3>
                <p className="text-yellow-400 text-2xl font-bold">
                  {tmdbData.vote_average?.toFixed(1)}/10
                </p>
                <p className="text-gray-400 text-sm">
                  {tmdbData.vote_count} votes
                </p>
              </div>
            )}

            {movie.director && movie.director.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Đạo diễn</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.director.map((director, idx) => (
                    <span key={idx} className="text-gray-300">
                      {director}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {movie.actor && movie.actor.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Diễn viên</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.actor.map((actor, idx) => (
                    <span key={idx} className="text-gray-300">
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
