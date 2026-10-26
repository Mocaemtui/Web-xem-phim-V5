import { TMDBDetailResponse, TMDBSeasonDetail } from "@/types/tmdb";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function getTMDBDetails(tmdbId: string | number, type: "movie" | "tv" = "movie"): Promise<TMDBDetailResponse | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    console.warn("Missing TMDB API credentials in .env.local");
    return null;
  }

  try {
    let tmdbType = type === "movie" ? "movie" : "tv";
    
    const url = new URL(`${TMDB_BASE_URL}/${tmdbType}/${tmdbId}`);
    // Bỏ filter ngôn ngữ để TMDB trả về toàn bộ dữ liệu gốc (không bị sót bất cứ thứ gì)
    url.searchParams.append("append_to_response", "credits,similar,videos,reviews");
    
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    
    if (TMDB_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
    } else {
      url.searchParams.append("api_key", TMDB_API_KEY!);
    }

    let res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 86400 },
    });

    // Nếu TMDB báo lỗi 404 do bị sai loại (movie vs tv), thử ngay loại còn lại
    if (!res.ok && res.status === 404) {
      tmdbType = tmdbType === "movie" ? "tv" : "movie";
      const fallbackUrl = new URL(`${TMDB_BASE_URL}/${tmdbType}/${tmdbId}`);
      fallbackUrl.searchParams.append("append_to_response", "credits,similar,videos,reviews");
      if (!TMDB_ACCESS_TOKEN) fallbackUrl.searchParams.append("api_key", TMDB_API_KEY!);
      
      res = await fetch(fallbackUrl.toString(), { headers, next: { revalidate: 86400 } });
    }

    if (!res.ok) return null;

    const data: TMDBDetailResponse = await res.json();
    
    // Tìm kiếm thêm bình luận Tiếng Việt để đưa lên đầu
    try {
      const viUrl = new URL(`${TMDB_BASE_URL}/${tmdbType}/${tmdbId}/reviews`);
      viUrl.searchParams.append("language", "vi-VN");
      if (!TMDB_ACCESS_TOKEN) viUrl.searchParams.append("api_key", TMDB_API_KEY!);
      
      const viRes = await fetch(viUrl.toString(), { headers, next: { revalidate: 86400 } });
      if (viRes.ok) {
        const viData = await viRes.json();
        if (viData.results && viData.results.length > 0) {
          // Lấy danh sách English hiện có (từ append_to_response)
          const enReviews = data.reviews?.results || [];
          
          // Lọc bỏ trùng lặp (nếu có)
          const viIds = new Set(viData.results.map((r: any) => r.id));
          const filteredEnReviews = enReviews.filter(r => !viIds.has(r.id));
          
          // Ưu tiên Tiếng Việt lên đầu
          data.reviews = { results: [...viData.results, ...filteredEnReviews] };
        }
      }
    } catch (e) {
      console.error("Failed to fetch vi-VN reviews", e);
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch TMDB details:", error);
    return null;
  }
}

import { TMDBCollectionDetail } from "@/types/tmdb";

export async function getTMDBCollection(collectionId: string | number): Promise<TMDBCollectionDetail | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) return null;

  try {
    const url = new URL(`${TMDB_BASE_URL}/collection/${collectionId}`);
    
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    
    if (TMDB_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
    } else {
      url.searchParams.append("api_key", TMDB_API_KEY!);
    }

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    let data: TMDBCollectionDetail = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch TMDB collection:", error);
    return null;
  }
}

export async function getTMDBSeasonDetails(tvId: string | number, seasonNumber: number): Promise<TMDBSeasonDetail | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) return null;

  try {
    const url = new URL(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}`);
    
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    
    if (TMDB_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
    } else {
      url.searchParams.append("api_key", TMDB_API_KEY!);
    }

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    let data: TMDBSeasonDetail = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch TMDB season details:", error);
    return null;
  }
}

export function getTMDBImageUrl(path: string | null, size: "original" | "w500" | "w300" | "w185" = "w500"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function resolveTMDBId(movie: any): Promise<{ id: number, type: "movie" | "tv", season?: number } | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) return null;

  // Extract season number from name if possible
  let extractedSeason = undefined;
  const rawQuery = movie.origin_name || movie.name || "";
  const seasonMatch = rawQuery.match(/(?:Phần|Mùa|Season|Part|P)\s*(\d+)/i);
  if (seasonMatch) {
    extractedSeason = parseInt(seasonMatch[1], 10);
  } else {
    const nameMatch = movie.name?.match(/(?:Phần|Mùa|Season|Part|P)\s*(\d+)/i);
    if (nameMatch) {
      extractedSeason = parseInt(nameMatch[1], 10);
    }
  }

  // 1. Direct TMDB ID
  if (movie.tmdb?.id && Number(movie.tmdb.id) > 0) {
    return { 
      id: Number(movie.tmdb.id), 
      type: (movie.tmdb.type === 'tv' || movie.type === 'series') ? 'tv' : 'movie',
      season: extractedSeason || movie.tmdb?.season
    };
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (TMDB_ACCESS_TOKEN) headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;

  // 2. Fallback to IMDB ID
  if (movie.imdb?.id && movie.imdb.id.toString().trim() !== "" && movie.imdb.id.toString().trim() !== "0") {
    const findUrl = new URL(`${TMDB_BASE_URL}/find/${movie.imdb.id}`);
    findUrl.searchParams.append("external_source", "imdb_id");
    if (!TMDB_ACCESS_TOKEN) findUrl.searchParams.append("api_key", TMDB_API_KEY!);
    
    try {
      const res = await fetch(findUrl.toString(), { headers, next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        if (data.movie_results?.length > 0) return { id: data.movie_results[0].id, type: "movie", season: extractedSeason };
        if (data.tv_results?.length > 0) return { id: data.tv_results[0].id, type: "tv", season: extractedSeason };
      }
    } catch (e) {
      console.error("Failed to find by IMDB ID", e);
    }
  }

  if (rawQuery) {
    const cleanQuery = rawQuery
      .replace(/\s*[\(\[-]?\s*(Phần|Mùa|Season|Tập|Part|P)\s*\d+\s*[\)\]]?/gi, "")
      .replace(/\s*[\(\[-]?\s*(Vietsub|Thuyết\s*Minh|Lồng\s*Tiếng|HD|RAW|CAM|Bluray|1080p|720p)\s*[\)\]]?/gi, "")
      .replace(/[\(\[].*?[\)\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanQuery) {
      const primaryType = (movie.type === "series" || movie.type === "tvshows") ? "tv" : "movie";
      const secondaryType = primaryType === "tv" ? "movie" : "tv";

      const searchTMDB = async (searchType: "movie" | "tv") => {
        const searchUrl = new URL(`${TMDB_BASE_URL}/search/${searchType}`);
        searchUrl.searchParams.append("query", cleanQuery);
        if (movie.year && !isNaN(Number(movie.year))) {
          if (searchType === "movie") {
            searchUrl.searchParams.append("primary_release_year", movie.year.toString());
          } else {
            searchUrl.searchParams.append("first_air_date_year", movie.year.toString());
          }
        }
        if (!TMDB_ACCESS_TOKEN) searchUrl.searchParams.append("api_key", TMDB_API_KEY!);

        try {
          const res = await fetch(searchUrl.toString(), { headers, next: { revalidate: 86400 } });
          if (res.ok) {
            const data = await res.json();
            if (data.results?.length > 0) {
              let validResults = [...data.results];
              
              // Đẩy các phim rác/giả mạo (0 vote, popularity quá thấp) xuống cuối cùng
              // Điều này giúp ưu tiên phim thật (ví dụ "Deadpool & Wolverine" thay vì "Deadpool 3" fake)
              validResults.sort((a: any, b: any) => {
                const aIsFake = a.vote_count === 0 && a.popularity < 5;
                const bIsFake = b.vote_count === 0 && b.popularity < 5;
                if (aIsFake && !bIsFake) return 1;
                if (!aIsFake && bIsFake) return -1;
                return 0; // Giữ nguyên thứ tự liên quan (relevance) của TMDB
              });

              return { id: validResults[0].id, type: searchType, season: extractedSeason };
            }
          }
        } catch (e) {
          console.error(`Failed to search TMDB by name as ${searchType}`, e);
        }
        return null;
      };

      // Try primary type first
      let resolved = await searchTMDB(primaryType);
      
      // If primary failed and we appended a year, try without the year (in case the year is off by 1-2 years)
      if (!resolved && movie.year) {
        const searchUrlWithoutYear = new URL(`${TMDB_BASE_URL}/search/${primaryType}`);
        searchUrlWithoutYear.searchParams.append("query", cleanQuery);
        if (!TMDB_ACCESS_TOKEN) searchUrlWithoutYear.searchParams.append("api_key", TMDB_API_KEY!);
        try {
          const res = await fetch(searchUrlWithoutYear.toString(), { headers, next: { revalidate: 86400 } });
          if (res.ok) {
            const data = await res.json();
            if (data.results?.length > 0) {
              let validResults = [...data.results];
              
              validResults.sort((a: any, b: any) => {
                const aIsFake = a.vote_count === 0 && a.popularity < 5;
                const bIsFake = b.vote_count === 0 && b.popularity < 5;
                if (aIsFake && !bIsFake) return 1;
                if (!aIsFake && bIsFake) return -1;
                return 0;
              });

              resolved = { id: validResults[0].id, type: primaryType, season: extractedSeason };
            }
          }
        } catch {}
      }

      // If still not resolved, try the secondary type
      if (!resolved) {
        resolved = await searchTMDB(secondaryType);
      }

      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

import { Movie } from "@/types/api";

export async function searchTMDB(keyword: string, limit: number = 20): Promise<Movie[]> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) return [];
  
  try {
    const seasonMatch = keyword.match(/(?:Phần|Mùa|Season|Part|Tập|P)\s*(\d+)/i);
    const extractedSeason = seasonMatch ? parseInt(seasonMatch[1], 10) : undefined;
    
    const cleanQuery = keyword
      .replace(/\s*[\(\[-]?\s*(Phần|Mùa|Season|Tập|Part|P)\s*\d+\s*[\)\]]?/gi, "")
      .replace(/\s*[\(\[-]?\s*(Vietsub|Thuyết\s*Minh|Lồng\s*Tiếng|HD|RAW|CAM|Bluray|1080p|720p)\s*[\)\]]?/gi, "")
      .replace(/[\(\[].*?[\)\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanQuery) return [];

    const url = new URL(`${TMDB_BASE_URL}/search/multi`);
    url.searchParams.append("query", cleanQuery);
    url.searchParams.append("language", "vi-VN");
    url.searchParams.append("page", "1");
    if (!TMDB_ACCESS_TOKEN) url.searchParams.append("api_key", TMDB_API_KEY!);
    
    const headers: Record<string, string> = { accept: "application/json" };
    if (TMDB_ACCESS_TOKEN) headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
    
    const res = await fetch(url.toString(), { headers, next: { revalidate: 3600 } });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.results) return [];
    
    let validResults = data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
    
    validResults = validResults.filter((item: any) => {
        const isFake = item.vote_count === 0 && item.popularity < 5;
        return !isFake;
    });

    return validResults
      .slice(0, limit)
      .map((item: any) => {
         const slugSuffix = (item.media_type === 'tv' && extractedSeason) ? `-s${extractedSeason}` : '';
         return {
           _id: `tmdb-${item.id}${slugSuffix}`,
           name: item.title || item.name || "",
           slug: `tmdb-${item.media_type}-${item.id}${slugSuffix}`,
           origin_name: item.original_title || item.original_name || "",
           type: item.media_type === 'tv' ? 'series' : 'single',
           poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
           thumb_url: item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : "",
           year: parseInt(item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4) || "0"),
           tmdb: { id: item.id, type: item.media_type, vote_average: item.vote_average, vote_count: item.vote_count, season: extractedSeason }
         };
      });
  } catch (error) {
    console.error("TMDB search failed:", error);
    return [];
  }
}
