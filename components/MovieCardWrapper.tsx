import MovieCard from "./MovieCard";
import type { Movie } from "@/types/api";
import { memo } from "react";

interface MovieCardWrapperProps {
  movie: Movie;
  priority?: boolean;
}

const MovieCardWrapper = memo(function MovieCardWrapper({ movie, priority }: MovieCardWrapperProps) {
  return <MovieCard movie={movie} priority={priority} />;
});

export default MovieCardWrapper;
