export interface ApiResponse<T = unknown> {
  status: string;
  data: T;
  message?: string;
}

export interface Movie {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  type?: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  content?: string;
  category?: Category[];
  country?: Country[];
  is_copyright?: boolean;
  chieu_rap?: boolean;
  trailer_url?: string;
  time?: string;
  current_episode?: string;
  quality?: string;
  lang?: string;
  episode_current?: string;
  episode_total?: string;
  director?: string[];
  actor?: string[];
  tmdb?: {
    type: string;
    id: number;
    season?: number;
    vote_average: number;
    vote_count: number;
  };
  imdb?: {
    id: string;
    vote_average: number;
    vote_count: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Country {
  id: string;
  name: string;
  slug: string;
}

export interface HomeData {
  items: {
    title: string;
    items: Movie[];
  }[];
}

export interface MovieListResponse {
  items: Movie[];
  params: {
    pagination: {
      totalItems: number;
      totalItemsPerPage: number;
      currentPage: number;
      pageRanges: number;
    };
  };
}

export interface MovieDetail extends Movie {
  alt_poster_url?: string;
  alt_thumb_url?: string;
  episodes: {
    server_name: string;
    server_data: {
      name: string;
      slug: string;
      filename: string;
      link: string;
      link_embed: string;
      link_m3u8: string;
    }[];
  }[];
}

export interface MovieImages {
  tmdb_id?: number;
  tmdb_type?: string;
  tmdb_season?: number;
  ophim_id?: string;
  slug?: string;
  imdb_id?: string;
  image_sizes?: {
    backdrop: {
      original: string;
      w1280: string;
      w300: string;
      w780: string;
    };
    poster: {
      original: string;
      w154: string;
      w185: string;
      w342: string;
      w500: string;
      w780: string;
      w92: string;
    };
  };
  images: {
    width: number;
    height: number;
    aspect_ratio: number;
    type: string;
    file_path: string;
    iso_639_1?: string;
  }[];
}

export interface MoviePeoples {
  peoples: {
    tmdb_people_id: number;
    name: string;
    original_name: string;
    character?: string;
    known_for_department: string;
    profile_path?: string;
  }[];
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Year {
  year: number;
}

export interface MovieKeywords {
  keywords: {
    id: number;
    name: string;
  }[];
}
