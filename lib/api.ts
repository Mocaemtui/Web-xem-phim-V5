import type {
  ApiResponse,
  HomeData,
  MovieListResponse,
  MovieDetail,
  MovieImages,
  MoviePeoples,
  MovieKeywords,
  Genre,
  Country,
  Year,
  Movie,
} from "@/types/api";
import { MOVIE_SOURCES, PRIMARY_SOURCE } from "./sources";
import { mapNguoncListToV1, mapNguoncDetailToV1 } from "./nguonc-mapper";
const API_BASE_URL = PRIMARY_SOURCE.url;
const TMDB_API_BASE_URL = process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org";

export async function fetchAPI<T>(
  endpoint: string,
  revalidate: number = 60,
  customBaseUrl?: string
): Promise<ApiResponse<T> | null> {
  try {
    const isBrowser = typeof window !== "undefined";
    const baseUrl = customBaseUrl || API_BASE_URL;

    if (isBrowser) {
      try {
        let encodedBaseUrl = baseUrl;
        if (baseUrl === 'https://phimapi.com') {
          encodedBaseUrl = 'primary';
        } else if (baseUrl === 'https://ophim1.com') {
          encodedBaseUrl = 'backup';
        } else if (baseUrl === 'https://phim.nguonc.com') {
          encodedBaseUrl = 'nguonc';
        } else {
          try {
            encodedBaseUrl = window.btoa(baseUrl);
          } catch {}
        }
        const proxyUrl = `/api/proxy?endpoint=${encodeURIComponent(endpoint)}&baseUrl=${encodeURIComponent(encodedBaseUrl)}&revalidate=${revalidate}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;
        return await response.json();
      } catch (err) {
        console.error('Client proxy fetch error:', err);
        return null;
      }
    }

    const hasQuery = endpoint.includes('?');
    const url = `${baseUrl}${endpoint}${hasQuery ? '&' : '?'}cb=1`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const options: RequestInit = {
      headers
    };

    if (revalidate === 0) {
      options.cache = 'no-store';
    } else {
      options.next = { revalidate };
    }

    let response = await fetch(url, options);

    // Fallback to Ophim if PhimAPI returns 404 or fails
    if (!response.ok && baseUrl === MOVIE_SOURCES.PHIMAPI.url) {
      const fallbackUrl = `${MOVIE_SOURCES.OPHIM.url}${endpoint}${hasQuery ? '&' : '?'}cb=1`;
      response = await fetch(fallbackUrl, options);
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Check if API returns error status
    if (data.status === 'error' && baseUrl === MOVIE_SOURCES.PHIMAPI.url) {
      const fallbackUrl = `${MOVIE_SOURCES.OPHIM.url}${endpoint}${hasQuery ? '&' : '?'}cb=1`;
      const fallbackResponse = await fetch(fallbackUrl, options);
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.status !== 'error') return fallbackData;
      }
      return null;
    } else if (data.status === 'error') {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

export async function getHome(): Promise<ApiResponse<HomeData> | null> {
  return fetchAPI<HomeData>("/v1/api/home");
}

export async function getPhimMoi(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<MovieListResponse> | null> {
  if (PRIMARY_SOURCE.id === 'nguonc') {
    try {
      const res = await fetchAPI<any>(`/api/film/phim-moi-cap-nhat?page=${page}`, 3600, PRIMARY_SOURCE.url);
      const mapped = mapNguoncListToV1(res);
      if (mapped) return mapped as any;
    } catch (e) {
      console.warn("Nguonc getPhimMoi fetch failed:", e);
    }
  }

  if (PRIMARY_SOURCE.id === 'phimapi') {
    try {
      // PhimAPI's phim-moi-cap-nhat endpoint ignores limit and always returns 10 items.
      // We must fetch multiple pages to satisfy the requested limit.
      const API_ITEMS_PER_PAGE = 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const startApiPage = Math.floor(startIndex / API_ITEMS_PER_PAGE) + 1;
      const endApiPage = Math.ceil(endIndex / API_ITEMS_PER_PAGE);
      
      const pagePromises = [];
      for (let p = startApiPage; p <= endApiPage; p++) {
        pagePromises.push(
          fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${p}&v=3`, {
            next: { revalidate: 3600 },
            headers: { 'Accept': 'application/json' }
          }).then(res => res.json())
        );
      }
      
      const results = await Promise.all(pagePromises);
      
      let allItems: any[] = [];
      let totalItems = 0;
      
      for (const data of results) {
        if (data.status === true && data.items) {
          allItems.push(...data.items);
          if (data.pagination) {
            totalItems = data.pagination.totalItems;
          }
        }
      }
      
      const combinedStartIndex = (startApiPage - 1) * API_ITEMS_PER_PAGE;
      const sliceStart = startIndex - combinedStartIndex;
      const slicedItems = allItems.slice(sliceStart, sliceStart + limit);
      
      if (slicedItems.length > 0) {
        return {
          status: "success",
          data: {
            items: slicedItems,
            params: {
              pagination: {
                totalItems: totalItems,
                totalItemsPerPage: limit,
                currentPage: page,
                pageRanges: 1
              }
            }
          }
        } as any;
      }
    } catch (e) {
      console.warn("PhimAPI getPhimMoi fetch failed:", e);
    }
  }

  // Fallback to standard V1 endpoint
  return fetchAPI<MovieListResponse>(
    `/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}&limit=${limit}`
  );
}

// Hàm chuẩn hóa và tối ưu ảnh bằng WEBP converter của PhimAPI
export const resolveImgUrl = (url: string | undefined): string => {
  if (!url) return "";

  let finalUrl = "";
  if (url.startsWith('http')) {
    finalUrl = url;
  } else if (url.startsWith('upload/')) {
    finalUrl = `https://phimimg.com/${url}`;
  } else if (url.includes('phimimg.com')) {
    // URL đã có domain phimimg.com nhưng thiếu https
    finalUrl = url.startsWith('https') ? url : `https://${url}`;
  } else {
    const cleanOphimUrl = url.startsWith('movies/') ? url : `movies/${url}`;
    finalUrl = `https://img.ophim.live/uploads/${cleanOphimUrl}`;
  }

  return finalUrl;
};

const DEFAULT_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="%2318181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2371717a" font-family="sans-serif" font-size="16">No Poster</text></svg>';

const DEFAULT_BACKDROP = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%2318181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2371717a" font-family="sans-serif" font-size="24">No Image</text></svg>';

// Lấy ảnh dọc (Poster) - Ophim/Nguonc dùng thumb_url làm poster; PhimAPI dùng poster_url làm poster
export const getPosterUrl = (movie: { thumb_url?: string; poster_url?: string; source?: string }): string => {
  const isTmdb = movie.source === 'tmdb' || movie.thumb_url?.includes('tmdb.org') || movie.poster_url?.includes('tmdb.org');
  const isPhimApi = movie.source === 'phimapi' || movie.thumb_url?.includes('upload/') || movie.poster_url?.includes('upload/') || movie.thumb_url?.includes('phimimg.com') || movie.poster_url?.includes('phimimg.com');
  const useCorrect = isPhimApi || isTmdb;

  // Try both URLs and return the first valid one
  const primaryUrl = useCorrect
    ? resolveImgUrl(movie.poster_url || movie.thumb_url)
    : resolveImgUrl(movie.thumb_url || movie.poster_url);

  const fallbackUrl = useCorrect
    ? resolveImgUrl(movie.thumb_url || movie.poster_url)
    : resolveImgUrl(movie.poster_url || movie.thumb_url);

  return primaryUrl || fallbackUrl || DEFAULT_POSTER;
};

// Lấy ảnh ngang (Backdrop) - Ophim/Nguonc dùng poster_url làm backdrop; PhimAPI dùng thumb_url làm backdrop
export const getBackdropUrl = (movie: { thumb_url?: string; poster_url?: string; source?: string }): string => {
  const isTmdb = movie.source === 'tmdb' || movie.thumb_url?.includes('tmdb.org') || movie.poster_url?.includes('tmdb.org');
  const isPhimApi = movie.source === 'phimapi' || movie.thumb_url?.includes('upload/') || movie.poster_url?.includes('upload/') || movie.thumb_url?.includes('phimimg.com') || movie.poster_url?.includes('phimimg.com');
  const useCorrect = isPhimApi || isTmdb;

  // Try both URLs and return the first valid one
  const primaryUrl = useCorrect
    ? resolveImgUrl(movie.thumb_url || movie.poster_url)
    : resolveImgUrl(movie.poster_url || movie.thumb_url);

  const fallbackUrl = useCorrect
    ? resolveImgUrl(movie.poster_url || movie.thumb_url)
    : resolveImgUrl(movie.thumb_url || movie.poster_url);

  return primaryUrl || fallbackUrl || DEFAULT_BACKDROP;
};

export function getCleanServerName(rawName: string | undefined): string {
  if (!rawName) return "Ophim";
  const lower = rawName.toLowerCase();
  
  let suffix = "";
  if (rawName.includes(" - ")) {
    suffix = rawName.split(" - ")[1];
    suffix = suffix.replace(/ #\d+/, '').replace('Vietsub', 'VS').replace('Thuyết Minh', 'TM').replace('Lồng Tiếng', 'LT');
  }
  
  if (lower.includes("phimapi") || lower.includes("kkphim") || lower.includes("kk phim")) {
    return `PhimAPI ${suffix ? `(${suffix})` : ""}`.trim();
  }
  if (lower.includes("nguonc") || lower.includes("nguồn c")) {
    return `Nguồn C ${suffix ? `(${suffix})` : ""}`.trim();
  }
  if (lower.includes("ophim")) {
    return `Ophim ${suffix ? `(${suffix})` : ""}`.trim();
  }
  return rawName;
}

export function sortEpisodes(eps: any[]): any[] {
  if (!eps) return [];
  const priority: Record<string, number> = {
    nguonc: 3,
    phimapi: 2,
    kkphim: 2,
    ophim: 1
  };
  
  return [...eps].sort((a, b) => {
    const getPriority = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes("nguonc") || lower.includes("nguồn c")) return priority.nguonc;
      if (lower.includes("phimapi") || lower.includes("kkphim") || lower.includes("kk phim")) return priority.phimapi;
      if (lower.includes("ophim")) return priority.ophim;
      return 0;
    };
    return getPriority(b.server_name) - getPriority(a.server_name);
  });
}


function getBaseKeyword(query: string): string {
  // 1. Remove season patterns like: (Phần 3), Phần 3, Mùa 3, Season 3, Part 3, Tập 3, P3, P 3, etc.
  let base = query.replace(/\s*[\(\[-]?\s*(Phần|Mùa|Season|Tập|Part|P)\s*\d+\s*[\)\]]?/gi, "");
  // 2. Remove any remaining parentheses content
  base = base.replace(/[\(\[].*?[\)\]]/g, "");
  // 3. Clean up spaces
  return base.replace(/\s+/g, " ").trim();
}

function extractSeasonNumber(title: string): number | null {
  const regex = /(?:Phần|Mùa|Season|Part|Tập|P)\s*(\d+)/i;
  const match = title.match(regex);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num < 100) return num;
  }
  const endNumMatch = title.match(/\b(\d+)\b$/);
  if (endNumMatch) {
    const num = parseInt(endNumMatch[1], 10);
    if (num < 100) return num;
  }
  return null;
}

function calculateMatchScore(item: Movie, searchKeyword: string, baseKeyword: string, targetSeason: number | null): number {
  let score = 0;
  const itemName = (item.name || "").toLowerCase();
  const itemOriginName = (item.origin_name || "").toLowerCase();
  const query = searchKeyword.toLowerCase();
  const cleanItemName = getBaseKeyword(item.name || "").toLowerCase();
  const cleanItemOrigin = getBaseKeyword(item.origin_name || "").toLowerCase();
  const cleanQuery = baseKeyword.toLowerCase();

  // 1. Exact match with original query
  if (itemName === query || itemOriginName === query) {
    score += 1000;
  }
  
  // 2. Original query is a substring of the title
  if (itemName.includes(query) || itemOriginName.includes(query)) {
    score += 500;
  }
  
  // 3. Match on season number if specified
  if (targetSeason !== null) {
    let itemSeason = extractSeasonNumber(item.name || "") || extractSeasonNumber(item.origin_name || "");
    if (itemSeason === null && targetSeason === 1) {
      itemSeason = 1;
    }
    if (itemSeason === targetSeason) {
      score += 2000;
    } else if (itemSeason !== null) {
      // Different season of same show
      score -= 2000;
    } else {
      // itemSeason is null, targetSeason is not 1 (e.g. 0, 2, 3)
      // This is likely Season 1, penalize it so it doesn't beat the actual season
      score -= 2000;
    }
  }
  
  // 4. Exact/partial match with base name
  if (cleanItemName === cleanQuery || cleanItemOrigin === cleanQuery) {
    score += 200;
  } else if (cleanItemName.includes(cleanQuery) || cleanItemOrigin.includes(cleanQuery)) {
    score += 100;
  }
  
  return score;
}

export async function searchPhim(
  keyword: string,
  isQuick: boolean = false
): Promise<ApiResponse<MovieListResponse> | null> {
  const cleanKeyword = keyword.trim();
  const imdbMatch = cleanKeyword.match(/tt\d{7,10}/i);
  const isImdbId = !!imdbMatch;
  const imdbId = isImdbId ? imdbMatch[0].toLowerCase() : '';
  
  const searchKeyword = isImdbId ? imdbId : cleanKeyword;

  // Helper: Tự động fetch nhiều trang của Nguồn C (do API của họ limit cứng 10 phim/trang)
  const searchNguoncAll = async (keyword: string, isQuick: boolean = false) => {
    const firstPage = await fetchAPI<any>(`/api/film/search?keyword=${encodeURIComponent(keyword)}&page=1`, 3600, MOVIE_SOURCES.NGUONC.url);
    const firstPageAny = firstPage as any;
    if (!firstPageAny?.items) return mapNguoncListToV1(firstPage);

    const totalPages = firstPageAny.paginate?.total_page || 1;
    const items = firstPageAny.items || [];
    console.log(`[Nguonc] keyword: ${keyword}, totalPages: ${totalPages}, items: ${items.length}`);

    if (totalPages > 1) {
      // Tìm kiếm nhanh: chỉ fetch 2 trang (max 20 items)
      // Tìm kiếm thường: fetch tối đa 10 trang (max 100 items)
      const maxPages = isQuick ? Math.min(totalPages, 2) : Math.min(totalPages, 10);
      const promises = [];
      for (let i = 2; i <= maxPages; i++) {
        promises.push(fetchAPI<any>(`/api/film/search?keyword=${encodeURIComponent(keyword)}&page=${i}`, 3600, MOVIE_SOURCES.NGUONC.url));
      }
      const results = await Promise.all(promises);
      for (const res of results) {
        const resAny = res as any;
        if (resAny?.items) {
          items.push(...resAny.items);
        }
      }
      console.log(`[Nguonc] after fetch, total items: ${items.length}`);
    }

    firstPageAny.items = items;
    return mapNguoncListToV1(firstPageAny);
  };

  // Helper: Tự động fetch nhiều trang cho API chuẩn V1 (Ophim, PhimAPI)
  const searchV1All = async (keyword: string, baseUrl: string, isQuick: boolean = false) => {
    const firstPage = await fetchAPI<MovieListResponse>(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=1`, 3600, baseUrl);
    if (!firstPage?.data) return firstPage;

    const pagination = firstPage.data.params?.pagination;
    const totalItems = pagination?.totalItems || 0;
    const itemsPerPage = pagination?.totalItemsPerPage || 24;
    const actualTotalPages = Math.ceil(totalItems / (itemsPerPage || 24));

    const items = firstPage.data.items || [];

    if (actualTotalPages > 1) {
      // Tìm kiếm nhanh: chỉ fetch 2 trang (max 48 items)
      // Tìm kiếm thường: fetch tối đa 10 trang (max 240 items)
      const maxPages = isQuick ? Math.min(actualTotalPages, 2) : Math.min(actualTotalPages, 10);
      const promises = [];
      for (let i = 2; i <= maxPages; i++) {
        promises.push(fetchAPI<MovieListResponse>(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${i}`, 3600, baseUrl));
      }
      const results = await Promise.all(promises);
      for (const res of results) {
        if (res?.data?.items) {
          items.push(...res.data.items);
        }
      }
    }

    firstPage.data.items = items;
    return firstPage;
  };
  
  const uniqueItemsMap = new Map<string, Movie & { source?: string; available_sources?: string[] }>();

  const sourcePriority: Record<string, number> = { phimapi: 3, nguonc: 2, ophim: 1, tmdb: 0 };

  const addItems = (res: any, sourceName: string) => {
    const items = res?.data?.items || res?.items || [];
    for (const item of items) {
      if (!item.slug) continue;

      let foundKey = item.slug;
      
      if (item.tmdb?.id && Number(item.tmdb.id) > 0) {
         for (const [k, v] of uniqueItemsMap.entries()) {
            if (v.tmdb?.id && Number(v.tmdb.id) === Number(item.tmdb.id)) {
               foundKey = k;
               break;
            }
         }
      }

      const existing = uniqueItemsMap.get(foundKey);
      if (existing) {
        if (!existing.available_sources) existing.available_sources = [existing.source || ''];
        if (!existing.available_sources.includes(sourceName)) existing.available_sources.push(sourceName);
        
        const existingPriority = sourcePriority[existing.source || ''] || 0;
        const newPriority = sourcePriority[sourceName] || 0;
        
        if (newPriority > existingPriority) {
          const newItem = { ...existing, ...item, source: sourceName, available_sources: existing.available_sources };
          uniqueItemsMap.delete(foundKey);
          uniqueItemsMap.set(item.slug, newItem);
        } else {
          // Merge tmdb data and other fields from lower priority source
          existing.tmdb = existing.tmdb || item.tmdb;
          // Ensure available_sources is updated even if priority is lower
          existing.available_sources = existing.available_sources || [];
          if (!existing.available_sources.includes(sourceName)) {
            existing.available_sources.push(sourceName);
          }
        }
      } else {
        uniqueItemsMap.set(item.slug, { ...item, source: sourceName, available_sources: [sourceName] });
      }
    }
  };

  const { searchTMDB } = await import('./tmdb');

  if (isImdbId) {
    const endpoint = `/v1/api/tim-kiem?keyword=${encodeURIComponent(imdbId)}`;
    const [ophimRes, phimapiRes, nguoncRes, tmdbMovies] = await Promise.all([
      searchV1All(imdbId || cleanKeyword, MOVIE_SOURCES.OPHIM.url, false),
      searchV1All(imdbId || cleanKeyword, MOVIE_SOURCES.PHIMAPI.url, false),
      searchNguoncAll(imdbId || cleanKeyword, false),
      searchTMDB(imdbId || cleanKeyword)
    ]);
    addItems(phimapiRes, 'phimapi');
    addItems(ophimRes, 'ophim');
    addItems(nguoncRes, 'nguonc');
    addItems({ data: { items: tmdbMovies } }, 'tmdb');
  } else {
    if (isQuick) {
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> => {
        return Promise.race([
          promise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
        ]).catch(() => null);
      };

      const [ophimRes, phimapiRes, nguoncRes, tmdbMovies] = await Promise.all([
        withTimeout(searchV1All(searchKeyword, MOVIE_SOURCES.OPHIM.url, true), 2000),
        withTimeout(searchV1All(searchKeyword, MOVIE_SOURCES.PHIMAPI.url, true), 2000),
        withTimeout(searchNguoncAll(searchKeyword, true), 2500),
        withTimeout(searchTMDB(searchKeyword), 2000)
      ]);
      addItems(phimapiRes, 'phimapi');
      addItems(ophimRes, 'ophim');
      addItems(nguoncRes, 'nguonc');
      addItems({ data: { items: tmdbMovies || [] } }, 'tmdb');
    } else {
      const baseKeyword = getBaseKeyword(searchKeyword);
      const hasDifferentBase = baseKeyword && baseKeyword.toLowerCase() !== searchKeyword.toLowerCase();

      const endpoints = [
        `/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}`
      ];
      if (hasDifferentBase) {
        endpoints.push(`/v1/api/tim-kiem?keyword=${encodeURIComponent(baseKeyword)}`);
      }

      const fetchPromises = endpoints.flatMap((ep, idx) => {
        const keywordToSearch = idx === 0 ? searchKeyword : baseKeyword;
        return [
          searchV1All(keywordToSearch, MOVIE_SOURCES.OPHIM.url, false),
          searchV1All(keywordToSearch, MOVIE_SOURCES.PHIMAPI.url, false),
          searchNguoncAll(keywordToSearch, false),
          searchTMDB(keywordToSearch, 20)
        ];
      });

      const results = await Promise.all(fetchPromises);

      addItems(results[1], 'phimapi');
      addItems(results[0], 'ophim');
      addItems(results[2], 'nguonc');
      addItems({ data: { items: results[3] } }, 'tmdb');

      if (hasDifferentBase && results.length >= 8) {
        addItems(results[5], 'phimapi');
        addItems(results[4], 'ophim');
        addItems(results[6], 'nguonc');
        addItems({ data: { items: results[7] } }, 'tmdb');
      }
    }
  }

  const allItems = Array.from(uniqueItemsMap.values());

  let filteredAllItems = allItems;

  // Rank/Sort the merged results if not an IMDB search
  if (!isImdbId && allItems.length > 0) {
    const baseKeyword = getBaseKeyword(searchKeyword);
    const targetSeason = extractSeasonNumber(searchKeyword);
    
    const scoreMap = new Map<string, number>();
    allItems.forEach(item => {
      const score = calculateMatchScore(item, searchKeyword, baseKeyword, targetSeason);
      scoreMap.set(item.slug, score);
    });

    // Giữ nguyên tất cả kết quả từ API gốc, không lọc bỏ nữa
    filteredAllItems = allItems;

    filteredAllItems.sort((a, b) => {
      const scoreA = scoreMap.get(a.slug) || 0;
      const scoreB = scoreMap.get(b.slug) || 0;
      return scoreB - scoreA;
    });
  }

  if (filteredAllItems.length === 0) return null;

  return {
    status: "success",
    data: {
      items: filteredAllItems,
      params: {
        pagination: {
          totalItems: filteredAllItems.length,
          totalItemsPerPage: filteredAllItems.length,
          currentPage: 1,
          pageRanges: 1
        }
      }
    }
  };
}


export async function getTheLoai(): Promise<ApiResponse<{ items: Genre[] }> | null> {
  if (PRIMARY_SOURCE.id === 'phimapi') {
    try {
      const res = await fetch(`https://phimapi.com/the-loai`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const items = await res.json();
        // Lọc bỏ danh mục Phim 18+
        const filteredItems = items.filter((item: Genre) => item.slug !== 'phim-18');
        return { status: "success", data: { items: filteredItems } } as any;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return fetchAPI<{ items: Genre[] }>("/v1/api/the-loai", 3600);
}

export async function getQuocGia(): Promise<ApiResponse<{ items: Country[] }> | null> {
  if (PRIMARY_SOURCE.id === 'phimapi') {
    try {
      const res = await fetch(`https://phimapi.com/quoc-gia`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const items = await res.json();
        return { status: "success", data: { items } } as any;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return fetchAPI<{ items: Country[] }>("/v1/api/quoc-gia", 3600);
}

// Search with optional pagination
export async function searchPhimWithPagination(
  keyword: string,
  options: { page?: number; limit?: number } = {}
): Promise<ApiResponse<MovieListResponse> | null> {
  if (PRIMARY_SOURCE.id === 'nguonc') {
    const page = options.page || 1;
    const res = await fetchAPI<any>(`/api/film/search?keyword=${encodeURIComponent(keyword)}&page=${page}`, 3600, PRIMARY_SOURCE.url);
    const mapped = mapNguoncListToV1(res);
    if (mapped) return mapped as any;
  }

  const cleanKeyword = keyword.trim();
  const imdbMatch = cleanKeyword.match(/tt\d{7,10}/i);
  const searchKeyword = imdbMatch ? imdbMatch[0].toLowerCase() : cleanKeyword;

  const params = new URLSearchParams();
  params.append('keyword', searchKeyword);
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.limit !== undefined) params.append('limit', options.limit.toString());
  const endpoint = `/v1/api/tim-kiem?${params.toString()}`;
  // Tìm kiếm phân trang, cache 3600 giây
  return fetchAPI<MovieListResponse>(endpoint, 3600);
}

// Get category details with filters
export async function getTheLoaiDetails(
  slug: string,
  options: {
    page?: number;
    limit?: number;
    sort_field?: string;
    sort_type?: string;
    country?: string;
    year?: string;
  } = {}
): Promise<ApiResponse<MovieListResponse> | null> {
  if (PRIMARY_SOURCE.id === 'nguonc') {
    const page = options.page || 1;
    const res = await fetchAPI<any>(`/api/film/the-loai/${slug}?page=${page}`, 3600, PRIMARY_SOURCE.url);
    const mapped = mapNguoncListToV1(res);
    if (mapped) return mapped as any;
  }

  const params = new URLSearchParams();
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.limit !== undefined) params.append('limit', options.limit.toString());
  if (options.sort_field) params.append('sort_field', options.sort_field);
  if (options.sort_type) params.append('sort_type', options.sort_type);
  if (options.country) params.append('country', options.country);
  if (options.year) params.append('year', options.year);
  const endpoint = `/v1/api/the-loai/${slug}${params.toString() ? '?' + params.toString() : ''}`;
  return fetchAPI<MovieListResponse>(endpoint);
}

// Get country details with filters
export async function getQuocGiaDetails(
  slug: string,
  options: {
    page?: number;
    limit?: number;
    sort_field?: string;
    sort_type?: string;
    category?: string;
    year?: string;
  } = {}
): Promise<ApiResponse<MovieListResponse> | null> {
  if (PRIMARY_SOURCE.id === 'nguonc') {
    const page = options.page || 1;
    const res = await fetchAPI<any>(`/api/film/quoc-gia/${slug}?page=${page}`, 3600, PRIMARY_SOURCE.url);
    const mapped = mapNguoncListToV1(res);
    if (mapped) return mapped as any;
  }

  const params = new URLSearchParams();
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.limit !== undefined) params.append('limit', options.limit.toString());
  if (options.sort_field) params.append('sort_field', options.sort_field);
  if (options.sort_type) params.append('sort_type', options.sort_type);
  if (options.category) params.append('category', options.category);
  if (options.year) params.append('year', options.year);
  const endpoint = `/v1/api/quoc-gia/${slug}${params.toString() ? '?' + params.toString() + '&v=3' : '?v=3'}`;
  return fetchAPI<MovieListResponse>(endpoint);
}

export async function getNamPhatHanh(): Promise<ApiResponse<{ items: Year[] }> | null> {
  // Danh sách năm phát hành cố định, cache 1 giờ
  return fetchAPI<{ items: Year[] }>("/v1/api/nam-phat-hanh", 3600);
}
export async function getDanhSach(
  slug: string,
  options: {
    page?: number;
    limit?: number;
    sort_field?: string;
    sort_type?: string;
    category?: string;
    country?: string;
    year?: string;
  } = {}
): Promise<ApiResponse<MovieListResponse> | null> {
  if (PRIMARY_SOURCE.id === 'nguonc') {
    const page = options.page || 1;
    const res = await fetchAPI<any>(`/api/film/danh-sach/${slug}?page=${page}`, 3600, PRIMARY_SOURCE.url);
    const mapped = mapNguoncListToV1(res);
    if (mapped) return mapped as any;
  }

  const params = new URLSearchParams();
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.limit !== undefined) params.append('limit', options.limit.toString());
  if (options.sort_field) params.append('sort_field', options.sort_field);
  if (options.sort_type) params.append('sort_type', options.sort_type);
  if (options.category) params.append('category', options.category);
  if (options.country) params.append('country', options.country);
  if (options.year) params.append('year', options.year);
  const query = params.toString();
  const endpoint = `/v1/api/danh-sach/${slug}${query ? '?' + query + '&v=3' : '?v=3'}`;
  return fetchAPI<MovieListResponse>(endpoint);
}




export async function getChiTietPhim(
  slug: string
): Promise<ApiResponse<{ item: MovieDetail }> | null> {
  let tmdbMovieDetail: MovieDetail | null = null;

  if (slug.startsWith('tmdb-')) {
    const parts = slug.split('-');
    const type = parts[1] as "movie" | "tv";
    const id = parts[2];
    const seasonMatch = slug.match(/-s(\d+)$/);
    const seasonStr = seasonMatch ? parseInt(seasonMatch[1], 10) : undefined;
    
    const { getTMDBDetails, getTMDBSeasonDetails } = await import('./tmdb');
    const tmdbData = await getTMDBDetails(id, type);
    if (!tmdbData) return null;
    
    let seasonPoster = tmdbData.poster_path;
    let seasonOverview = tmdbData.overview;
    if (type === "tv" && seasonStr !== undefined) {
      const seasonData = await getTMDBSeasonDetails(id, seasonStr);
      if (seasonData) {
        if (seasonData.poster_path) seasonPoster = seasonData.poster_path;
        if (seasonData.overview) seasonOverview = seasonData.overview;
      }
    }

    const tmdbAny = tmdbData as any;
    tmdbMovieDetail = {
      _id: slug,
      name: tmdbAny.title || tmdbAny.name || "",
      slug: slug,
      origin_name: tmdbAny.original_title || tmdbAny.original_name || "",
      type: type === "tv" ? "series" : "single",
      poster_url: seasonPoster ? `https://image.tmdb.org/t/p/w500${seasonPoster}` : "",
      thumb_url: tmdbAny.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbAny.backdrop_path}` : "",
      year: parseInt(tmdbAny.release_date?.substring(0,4) || tmdbAny.first_air_date?.substring(0,4) || "0"),
      content: seasonOverview || "",
      category: tmdbAny.genres?.map((g: any) => ({ id: g.id.toString(), name: g.name, slug: g.name })) || [],
      country: [],
      episodes: [], 
      tmdb: {
        id: Number(id),
        type: type,
        season: seasonStr,
        vote_average: tmdbData.vote_average || 0,
        vote_count: tmdbData.vote_count || 0
      }
    };
  }

  let [ophimRes, phimapiRes, nguoncRes] = await Promise.all([
    !slug.startsWith('tmdb-') ? fetchAPI<{ item: MovieDetail }>(`/v1/api/phim/${slug}`, 3600, MOVIE_SOURCES.OPHIM.url) : Promise.resolve(null),
    !slug.startsWith('tmdb-') ? fetchAPI<{ item: MovieDetail }>(`/v1/api/phim/${slug}`, 3600, MOVIE_SOURCES.PHIMAPI.url) : Promise.resolve(null),
    !slug.startsWith('tmdb-') ? fetchAPI<any>(`/api/film/${slug}`, 3600, MOVIE_SOURCES.NGUONC.url).then(mapNguoncDetailToV1) : Promise.resolve(null)
  ]);

  let baseMovie: MovieDetail | null = phimapiRes?.data?.item || nguoncRes?.data?.item || ophimRes?.data?.item || tmdbMovieDetail;

  // --- SMART CROSS-API MATCHING (FALLBACK) ---
  if (baseMovie) {
    const originName = baseMovie.origin_name || baseMovie.name;
    const movieName = baseMovie.name;
    const targetSeason = baseMovie.tmdb?.season || null;
    const baseKeyword = getBaseKeyword(originName);
    
    if ((!ophimRes?.data?.item || !phimapiRes?.data?.item || !nguoncRes?.data?.item) && originName) {
      // Step 1: Parallelize searches
      const [searchOphim, searchPhimapi, searchNguonc] = await Promise.all([
        !ophimRes?.data?.item 
          ? fetchAPI<MovieListResponse>(`/v1/api/tim-kiem?keyword=${encodeURIComponent(originName)}`, 3600, MOVIE_SOURCES.OPHIM.url) 
          : Promise.resolve(null),
        !phimapiRes?.data?.item 
          ? fetchAPI<MovieListResponse>(`/v1/api/tim-kiem?keyword=${encodeURIComponent(originName)}`, 3600, MOVIE_SOURCES.PHIMAPI.url) 
          : Promise.resolve(null),
        !nguoncRes?.data?.item
          ? fetchAPI<any>(`/api/film/search?keyword=${encodeURIComponent(originName)}`, 3600, MOVIE_SOURCES.NGUONC.url).then(mapNguoncListToV1)
          : Promise.resolve(null)
      ]);

      let fetchOphimPromise: Promise<ApiResponse<{ item: MovieDetail }> | null> | null = null;
      let fetchPhimapiPromise: Promise<ApiResponse<{ item: MovieDetail }> | null> | null = null;
      let fetchNguoncPromise: Promise<{ status: string; data: { item: MovieDetail } } | null> | null = null;

      if (searchOphim?.data?.items) {
        let bestMatch = null;
        let bestScore = 0;
        searchOphim.data.items.forEach(m => {
          const score = calculateMatchScore(m as any, originName, baseKeyword, targetSeason);
          if (score > bestScore) { bestScore = score; bestMatch = m; }
        });
        if (bestMatch && (bestMatch as any).slug !== slug && bestScore > 0) {
          fetchOphimPromise = fetchAPI<{ item: MovieDetail }>(`/v1/api/phim/${(bestMatch as any).slug}`, 3600, MOVIE_SOURCES.OPHIM.url);
        }
      }

      if (searchPhimapi?.data?.items) {
        let bestMatch = null;
        let bestScore = 0;
        searchPhimapi.data.items.forEach(m => {
          const score = calculateMatchScore(m as any, originName, baseKeyword, targetSeason);
          if (score > bestScore) { bestScore = score; bestMatch = m; }
        });
        if (bestMatch && (bestMatch as any).slug !== slug && bestScore > 0) {
          fetchPhimapiPromise = fetchAPI<{ item: MovieDetail }>(`/v1/api/phim/${(bestMatch as any).slug}`, 3600, MOVIE_SOURCES.PHIMAPI.url);
        }
      }

      if (searchNguonc?.data?.items) {
        let bestMatch = null;
        let bestScore = 0;
        searchNguonc.data.items.forEach((m: any) => {
          const score = calculateMatchScore(m as any, originName, baseKeyword, targetSeason);
          if (score > bestScore) { bestScore = score; bestMatch = m; }
        });
        if (bestMatch && (bestMatch as any).slug !== slug && bestScore > 0) {
          fetchNguoncPromise = fetchAPI<any>(`/api/film/${(bestMatch as any).slug}`, 3600, MOVIE_SOURCES.NGUONC.url).then(mapNguoncDetailToV1);
        }
      }

      // Step 2: Parallelize detail fetches
      if (fetchOphimPromise || fetchPhimapiPromise || fetchNguoncPromise) {
        const [fallbackOphim, fallbackPhimapi, fallbackNguonc] = await Promise.all([
          fetchOphimPromise || Promise.resolve(null),
          fetchPhimapiPromise || Promise.resolve(null),
          fetchNguoncPromise || Promise.resolve(null)
        ]);
        
        if (fallbackOphim?.data?.item) ophimRes = fallbackOphim;
        if (fallbackPhimapi?.data?.item) phimapiRes = fallbackPhimapi;
        if (fallbackNguonc?.data?.item) nguoncRes = fallbackNguonc as any;
      }
    }
  }
  // -------------------------------------------

  const allEpisodes: any[] = [];

  const formatServerName = (prefix: string, name: string) => {
    let clean = name.replace(/ #\d+/, '').replace('Vietsub', 'VS').replace('Thuyết Minh', 'TM').replace('Lồng Tiếng', 'LT');
    return `${prefix} - ${clean}`;
  };

  if (nguoncRes?.data?.item) {
    allEpisodes.push(...(nguoncRes.data.item.episodes?.map((e: any) => ({ ...e, server_name: formatServerName('Nguồn C', e.server_name) })) || []));
  }

  if (phimapiRes?.data?.item) {
    allEpisodes.push(...(phimapiRes.data.item.episodes?.map((e: any) => ({ ...e, server_name: formatServerName('PhimAPI', e.server_name) })) || []));
  }

  if (ophimRes?.data?.item) {
    allEpisodes.push(...(ophimRes.data.item.episodes?.map((e: any) => ({ ...e, server_name: formatServerName('Ophim', e.server_name) })) || []));
  }

  // Re-evaluate baseMovie based on priority: TMDB > PhimAPI > NguonC > Ophim
  baseMovie = tmdbMovieDetail || phimapiRes?.data?.item || nguoncRes?.data?.item || ophimRes?.data?.item || null;

  if (!baseMovie) return null;

  // Swap primary and alternate images to prioritize PhimAPI > Ophim
  // Bỏ qua nếu là TMDB vì ảnh của TMDB là ảnh gốc, đặc thù cho từng Season và chất lượng cực cao
  if (!tmdbMovieDetail) {
    if (phimapiRes?.data?.item) {
      if (baseMovie !== phimapiRes.data.item) {
        // Save original images as alternates
        baseMovie.alt_poster_url = baseMovie.poster_url;
        baseMovie.alt_thumb_url = baseMovie.thumb_url;
        
        // Set PhimAPI's images as primary
        baseMovie.poster_url = phimapiRes.data.item.poster_url;
        baseMovie.thumb_url = phimapiRes.data.item.thumb_url;
      } else {
        if (ophimRes?.data?.item) {
          baseMovie.alt_poster_url = ophimRes.data.item.poster_url;
          baseMovie.alt_thumb_url = ophimRes.data.item.thumb_url;
        }
      }
    } else if (ophimRes?.data?.item) {
      if (baseMovie !== ophimRes.data.item) {
        baseMovie.alt_poster_url = baseMovie.poster_url;
        baseMovie.alt_thumb_url = baseMovie.thumb_url;
        baseMovie.poster_url = ophimRes.data.item.poster_url;
        baseMovie.thumb_url = ophimRes.data.item.thumb_url;
      }
    }
  }

  baseMovie.episodes = sortEpisodes(allEpisodes);

  return {
    status: "success",
    data: { item: baseMovie }
  };
}

export async function getHinhAnhPhim(
  slug: string
): Promise<ApiResponse<MovieImages> | null> {
  // Hình ảnh phim phụ trợ, cache 24 giờ
  return fetchAPI<MovieImages>(`/v1/api/phim/${slug}/images`, 3600);
}

export async function getPeoplesPhim(
  slug: string
): Promise<ApiResponse<MoviePeoples> | null> {
  // Diễn viên/Đạo diễn, cache 24 giờ
  return fetchAPI<MoviePeoples>(`/v1/api/phim/${slug}/peoples`, 3600);
}

export async function getPhimByTheLoai(
  slug: string,
  page: number = 1,
  limit: number = 24
): Promise<ApiResponse<MovieListResponse> | null> {
  return fetchAPI<MovieListResponse>(
    `/v1/api/the-loai/${slug}?page=${page}&limit=${limit}`
  );
}

export async function getPhimByQuocGia(
  slug: string,
  page: number = 1,
  limit: number = 24
): Promise<ApiResponse<MovieListResponse> | null> {
  return fetchAPI<MovieListResponse>(
    `/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}`
  );
}

export async function getPhimByNam(
  year: number,
  page: number = 1,
  limit: number = 24
): Promise<ApiResponse<MovieListResponse> | null> {
  return fetchAPI<MovieListResponse>(
    `/v1/api/nam-phat-hanh/${year}?page=${page}&limit=${limit}`
  );
}

// Get movies by release year with filters
export async function getNamPhatHanhDetails(
  year: number,
  options: {
    page?: number;
    limit?: number;
    sort_field?: string;
    sort_type?: string;
    category?: string;
    country?: string;
  } = {}
): Promise<ApiResponse<MovieListResponse> | null> {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.limit !== undefined) params.append('limit', options.limit.toString());
  if (options.sort_field) params.append('sort_field', options.sort_field);
  if (options.sort_type) params.append('sort_type', options.sort_type);
  if (options.category) params.append('category', options.category);
  if (options.country) params.append('country', options.country);
  const query = params.toString();
  const endpoint = `/v1/api/nam-phat-hanh/${year}${query ? '?' + query : ''}`;
  return fetchAPI<MovieListResponse>(endpoint);
}

// Helper function to get TMDB poster URL for a movie
export async function getMoviePosterUrl(slug: string): Promise<string | null> {
  const imagesData = await fetchAPI<MovieImages>(`/v1/api/phim/${slug}/images`);
  if (!imagesData?.data) return null;

  const poster = imagesData.data.images?.find(img => img.type === 'poster')?.file_path;
  const baseUrl = imagesData.data.image_sizes?.poster?.w500;

  return poster && baseUrl ? `${baseUrl}${poster}` : null;
}

// Get movie keywords
export async function getKeywordsPhim(
  slug: string
): Promise<ApiResponse<MovieKeywords> | null> {
  // Từ khóa phim, cache 24 giờ
  return fetchAPI<MovieKeywords>(`/v1/api/phim/${slug}/keywords`, 3600);
}

// Get movie by ID
export async function getPhimById(
  id: string
): Promise<ApiResponse<{ item: MovieDetail }> | null> {
  // Lấy phim theo ID, cache 1 giờ
  return fetchAPI<{ item: MovieDetail }>(`/phim/id/${id}`, 3600);
}

// Get movie by TMDB ID
export async function getPhimByTMDB(
  tmdbId: string
): Promise<ApiResponse<{ item: MovieDetail }> | null> {
  // Tra cứu TMDB trực tiếp, cache 1 giờ
  return fetchAPI<{ item: MovieDetail }>(`/tmdb/movie/${tmdbId}`, 3600);
}

// Get movie by IMDB ID
export async function getPhimByIMDB(
  imdbId: string
): Promise<ApiResponse<{ item: MovieDetail }> | null> {
  // Tra cứu IMDB trực tiếp, cache 1 giờ
  return fetchAPI<{ item: MovieDetail }>(`/imdb/title/${imdbId}`, 3600);
}
