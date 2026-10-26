"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MovieCardWrapper from "@/components/MovieCardWrapper";
import type { Movie } from "@/types/api";

interface ExtendedMovie extends Movie {
  source?: string;
  available_sources?: string[];
}


interface SearchGridProps {
  initialMovies: Movie[];
  keyword: string;
}

export default function SearchGrid({ initialMovies, keyword }: SearchGridProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const prevBrowse = sessionStorage.getItem("prev_browse_page");
      if (prevBrowse) {
        router.push(prevBrowse);
        return;
      }
    }
    router.push("/");
  };

  const [movies, setMovies] = useState<ExtendedMovie[]>(initialMovies);

  const [selectedSource, setSelectedSource] = useState<string>("all");

  useEffect(() => {
    setMovies(initialMovies);
  }, [initialMovies]);

  // No smart default selection needed, always default to "all" as requested by user


  const filteredMovies = useMemo(() => {
    const getSmartKey = (item: ExtendedMovie) => {
      const originName = item.origin_name || item.name || '';
      const normalizedOriginName = originName.toLowerCase().replace(/\s+/g, ' ').trim();
      
      const extractNumber = (str: string | undefined): number | null => {
        if (!str) return null;
        const match = str.match(/(?:phần|mùa|season|part|tập|p|ep|volume|vol)\s*(\d+)/i);
        if (match) return parseInt(match[1], 10);
        const endMatch = str.match(/\s+(\d+)$/);
        if (endMatch) return parseInt(endMatch[1], 10);
        return null;
      };

      const partNum = extractNumber(item.name) || extractNumber(item.slug) || '';
      return `${normalizedOriginName}-p${partNum}`;
    };

    // 1. Build a map of fallback images prioritizing PhimAPI > Ophim
    const imageMap = new Map<string, { poster_url: string; thumb_url: string; source: string }>();
    
    // First, populate with Ophim images (lowest priority)
    movies.forEach(m => {
      if (m.source === 'ophim' && m.poster_url && m.thumb_url) {
        imageMap.set(getSmartKey(m), { poster_url: m.poster_url, thumb_url: m.thumb_url, source: 'ophim' });
      }
    });

    // Next, NguonC images
    movies.forEach(m => {
      if (m.source === 'nguonc' && m.poster_url && m.thumb_url) {
        imageMap.set(getSmartKey(m), { poster_url: m.poster_url, thumb_url: m.thumb_url, source: 'nguonc' });
      }
    });


    
    // Finally, populate/overwrite with PhimAPI images (highest priority)
    movies.forEach(m => {
      if (m.source === 'phimapi' && m.poster_url && m.thumb_url) {
        imageMap.set(getSmartKey(m), { poster_url: m.poster_url, thumb_url: m.thumb_url, source: 'phimapi' });
      }
    });

    // 2. Resolve movies (overwrite images with higher priority source if available)
    const resolvedMovies = movies.map(movie => {
      const key = getSmartKey(movie);
      const mappedImg = imageMap.get(key);
      if (mappedImg && movie.source !== mappedImg.source) {
        const getPriority = (src: string) => {
          if (src === 'phimapi') return 3;
          if (src === 'nguonc') return 2;
          if (src === 'ophim') return 1;
          return 0;
        };
        if (getPriority(mappedImg.source) > getPriority(movie.source || '')) {
          return {
            ...movie,
            poster_url: mappedImg.poster_url,
            thumb_url: mappedImg.thumb_url,
          };
        }
      }
      return movie;
    });

    // 3. Extract and sort movies for each source
    const phimapiMovies = resolvedMovies.filter(m => m.source === 'phimapi' || m.available_sources?.includes('phimapi'));
    const nguoncMovies = resolvedMovies.filter(m => m.source === 'nguonc' || m.available_sources?.includes('nguonc'));
    const ophimMovies = resolvedMovies.filter(m => m.source === 'ophim' || m.available_sources?.includes('ophim'));
    const tmdbMovies = resolvedMovies.filter(m => m.source === 'tmdb');

    // 4. Return results based on selectedSource
    if (selectedSource === "all") {
      // Group movies by source priority: phimapi (first) -> nguonc (second) -> ophim (third) -> tmdb (fourth)
      const sortedGroupedMovies = [
        ...phimapiMovies,
        ...nguoncMovies,
        ...ophimMovies,
        ...tmdbMovies
      ];

      // Deduplicate (first occurrence wins, which will be phimapi if available, then ophim)
      const itemsMap = new Map<string, ExtendedMovie>();
      sortedGroupedMovies.forEach(movie => {
        const key = getSmartKey(movie);
        if (!itemsMap.has(key)) {
          itemsMap.set(key, movie);
        }
      });

      return Array.from(itemsMap.values());
    } else if (selectedSource === "phimapi") {
      return phimapiMovies; // Original API relevance order
    } else if (selectedSource === "nguonc") {
      return nguoncMovies; 
    } else if (selectedSource === "ophim") {
      return ophimMovies; // Original API relevance order (no sorting)
    } else {
      return resolvedMovies.filter((movie: ExtendedMovie) => movie.source === selectedSource || movie.available_sources?.includes(selectedSource));
    }
  }, [movies, selectedSource, keyword]);

  const sourceFilters = [
    { id: "all", name: "Tất cả" },
    { id: "phimapi", name: "PhimAPI" },
    { id: "nguonc", name: "Nguồn C" },
    { id: "ophim", name: "Ophim" },
    { id: "tmdb", name: "TMDB" },
  ];

  if (filteredMovies.length === 0) {
    return (
      <div>
        {/* Top Bar with Back Button */}
        <div className="fixed top-[90px] left-4 z-40 pointer-events-none flex items-start">
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
        {/* Source Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center sm:justify-start">
          {sourceFilters.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSource(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
                selectedSource === tab.id
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="text-center py-16">
          <p className="text-zinc-400 text-lg">
            Không tìm thấy phim nào từ nguồn này với từ khóa "{keyword}"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Bar with Back Button */}
      <div className="fixed top-[90px] left-4 z-40 pointer-events-none flex items-start">
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
      {/* Source Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center sm:justify-start">
        {sourceFilters.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSource(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
              selectedSource === tab.id
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMovies.map((movie) => (
          <MovieCardWrapper key={`${movie.source || 'default'}-${movie.slug || movie._id}`} movie={movie} />
        ))}
      </div>

    </div>
  );
}
