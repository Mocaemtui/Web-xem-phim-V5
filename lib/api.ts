import type { MovieListResponse, MovieDetail, Movie, MovieImages, MoviePeoples, HomeData, Genre, Country } from "@/types/api";
import { PRIMARY_SOURCE } from "./sources";
import { mapNguoncListToV1, mapNguoncDetailToV1 } from "./nguonc-mapper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ophim1.com';

export async function fetchAPI(endpoint: string, options?: RequestInit): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

export async function getPhimMoi(page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/danh-sach/phim-moi?page=${page}`);
  return data.data || data;
}

export async function getDanhSach(type: string, page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/danh-sach/${type}?page=${page}`);
  return data.data || data;
}

export async function getQuocGiaDetails(slug: string, page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/quoc-gia/${slug}?page=${page}`);
  return data.data || data;
}

export async function getChiTietPhim(slug: string): Promise<{ data: { item: MovieDetail } }> {
  const data = await fetchAPI(`/phim/${slug}`);
  return data;
}

export async function getHinhAnhPhim(slug: string): Promise<MovieImages> {
  const data = await fetchAPI(`/phim/${slug}/images`);
  return data.data || data;
}

export async function getPeoplesPhim(slug: string): Promise<MoviePeoples> {
  const data = await fetchAPI(`/phim/${slug}/peoples`);
  return data.data || data;
}

export async function getPhimByNam(year: number, page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/danh-sach/phim-nam?year=${year}&page=${page}`);
  return data.data || data;
}

export async function getNamPhatHanh(): Promise<{ items: number[] }> {
  const data = await fetchAPI('/nam-phat-hanh');
  return data.data || data;
}

export async function getPhimByQuocGia(slug: string, page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/quoc-gia/${slug}?page=${page}`);
  return data.data || data;
}

export async function getQuocGia(): Promise<{ items: Country[] }> {
  const data = await fetchAPI('/quoc-gia');
  return data.data || data;
}

export async function getPhimByTheLoai(slug: string, page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/the-loai/${slug}?page=${page}`);
  return data.data || data;
}

export async function getTheLoai(): Promise<{ items: Genre[] }> {
  const data = await fetchAPI('/the-loai');
  return data.data || data;
}

export async function searchPhim(keyword: string, page: number = 1): Promise<MovieListResponse> {
  const data = await fetchAPI(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
  return data.data || data;
}

export function getPosterUrl(posterUrl: string | undefined): string {
  if (!posterUrl) return '/placeholder.jpg';
  if (posterUrl.startsWith('http')) return posterUrl;
  return `${API_BASE_URL}${posterUrl}`;
}

export function getBackdropUrl(backdropUrl: string | undefined): string {
  if (!backdropUrl) return '/placeholder.jpg';
  if (backdropUrl.startsWith('http')) return backdropUrl;
  return `${API_BASE_URL}${backdropUrl}`;
}

export function resolveImgUrl(url: string | undefined): string {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

export function sortEpisodes(episodes: MovieDetail['episodes']): MovieDetail['episodes'] {
  return episodes.map(server => ({
    ...server,
    server_data: server.server_data.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    })
  }));
}

export function getCleanServerName(serverName: string): string {
  return serverName
    .replace(/Server|server/g, '')
    .replace(/VIP|vip/g, '')
    .replace(/Premium|premium/g, '')
    .trim();
}

export async function getHomeData(): Promise<HomeData> {
  const data = await fetchAPI('/');
  return data.data || data;
}
