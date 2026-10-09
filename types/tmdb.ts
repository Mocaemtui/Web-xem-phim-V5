export interface TMDBCast {
  id: number;
  name: string;
  original_name: string;
  profile_path: string | null;
  character: string;
  order: number;
}

export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string;
  site: string; // "YouTube", "Vimeo", etc.
  size: number;
  type: string; // "Trailer", "Teaser", etc.
  official: boolean;
  published_at: string;
}

export interface TMDBSimilarMovie {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string; // For movies
  first_air_date?: string; // For TV shows
  vote_average: number;
  vote_count: number;
}

export interface TMDBCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBReview {
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  id: string;
}

export interface TMDBCollectionPart {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average: number;
}

export interface TMDBCollectionDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBCollectionPart[];
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  vote_average: number;
}

export interface TMDBCrew {
  id: number;
  name: string;
  original_name: string;
  profile_path: string | null;
  job: string;
  department: string;
}

export interface TMDBDetailResponse {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  overview: string;
  belongs_to_collection?: TMDBCollection | null;
  seasons?: TMDBSeason[];
  credits?: {
    cast: TMDBCast[];
    crew: TMDBCrew[];
  };
  videos?: {
    results: TMDBVideo[];
  };
  similar?: {
    results: TMDBSimilarMovie[];
  };
  reviews?: {
    results: TMDBReview[];
  };
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  vote_average: number;
}

export interface TMDBSeasonDetail {
  _id: string;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: TMDBEpisode[];
}