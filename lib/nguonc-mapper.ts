import type { MovieListResponse, MovieDetail, Movie, Category, Country } from "@/types/api";

// Nguonc API Category object looks like:
// { "1": { "group": { "name": "Định dạng" }, "list": [{ "id": "...", "name": "..." }] }, ... }
export function mapNguoncListToV1(data: any): { status: string; data: MovieListResponse } | null {
  if (!data || data.status !== 'success') return null;
  
  const items: Movie[] = (data.items || []).map((item: any) => {
    // Extract year, categories, countries from category object
    let year = 0;
    let type = 'series';
    const categories: Category[] = [];
    const countries: Country[] = [];
    
    if (item.category) {
      Object.values(item.category).forEach((catGroup: any) => {
        if (catGroup.group?.name === 'Năm phát hành' && catGroup.list?.[0]) {
          year = parseInt(catGroup.list[0].name, 10);
        } else if (catGroup.group?.name === 'Định dạng' && catGroup.list?.[0]) {
          type = catGroup.list[0].name === 'Phim lẻ' ? 'single' : 'series';
        } else if (catGroup.group?.name === 'Thể loại') {
          (catGroup.list || []).forEach((c: any) => categories.push({ id: c.id, name: c.name, slug: c.slug || c.name }));
        } else if (catGroup.group?.name === 'Quốc gia') {
          (catGroup.list || []).forEach((c: any) => countries.push({ id: c.id, name: c.name, slug: c.slug || c.name }));
        }
      });
    }

    return {
      _id: item.id || item.slug,
      name: item.name,
      slug: item.slug,
      origin_name: item.original_name,
      type: type,
      poster_url: item.poster_url,
      thumb_url: item.thumb_url,
      year: year,
      time: item.time,
      episode_current: item.current_episode,
      quality: item.quality,
      lang: item.language,
      category: categories,
      country: countries,
      source: 'nguonc',
      available_sources: ['nguonc'],
    };
  });

  return {
    status: "success",
    data: {
      items,
      params: {
        pagination: {
          totalItems: data.paginate?.total_items || 0,
          totalItemsPerPage: data.paginate?.items_per_page || 10,
          currentPage: data.paginate?.current_page || 1,
          pageRanges: 1, // mapping approximation
        }
      }
    }
  };
}

export function mapNguoncDetailToV1(data: any): { status: string; data: { item: MovieDetail } } | null {
  if (!data || data.status !== 'success' || !data.movie) return null;
  
  const movie = data.movie;
  let year = 0;
  let type = 'series';
  const categories: Category[] = [];
  const countries: Country[] = [];
  
  if (movie.category) {
    Object.values(movie.category).forEach((catGroup: any) => {
      if (catGroup.group?.name === 'Năm phát hành' && catGroup.list?.[0]) {
        year = parseInt(catGroup.list[0].name, 10);
      } else if (catGroup.group?.name === 'Định dạng' && catGroup.list?.[0]) {
        type = catGroup.list[0].name === 'Phim lẻ' ? 'single' : 'series';
      } else if (catGroup.group?.name === 'Thể loại') {
        (catGroup.list || []).forEach((c: any) => categories.push({ id: c.id, name: c.name, slug: c.slug || c.name }));
      } else if (catGroup.group?.name === 'Quốc gia') {
        (catGroup.list || []).forEach((c: any) => countries.push({ id: c.id, name: c.name, slug: c.slug || c.name }));
      }
    });
  }

  const episodes = (movie.episodes || []).map((ep: any) => {
    return {
      server_name: ep.server_name || "Server VIP",
      server_data: (ep.items || []).map((item: any) => ({
        name: item.name,
        slug: item.slug,
        filename: item.name,
        link: item.embed,
        link_embed: item.embed,
        link_m3u8: item.m3u8,
      }))
    };
  });

  return {
    status: "success",
    data: {
      item: {
        _id: movie.id || movie.slug,
        name: movie.name,
        slug: movie.slug,
        origin_name: movie.original_name,
        type: type,
        poster_url: movie.poster_url,
        thumb_url: movie.thumb_url,
        year: year,
        content: movie.description,
        time: movie.time,
        episode_current: movie.current_episode,
        episode_total: movie.total_episodes?.toString(),
        quality: movie.quality,
        lang: movie.language,
        director: movie.director ? movie.director.split(',').map((s: string) => s.trim()) : [],
        actor: movie.casts ? movie.casts.split(',').map((s: string) => s.trim()) : [],
        category: categories,
        country: countries,
        episodes: episodes,
      }
    }
  };
}
