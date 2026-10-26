"use client";

import { useCallback, memo } from "react";
import MovieCardWrapper from "./MovieCardWrapper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/types/api";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

interface MovieSliderProps {
  movies: Movie[];
}

const MovieSlider = memo(function MovieSlider({ movies }: MovieSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      dragFree: true,
      containScroll: "trimSnaps",
    },
    [WheelGesturesPlugin()]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!movies || movies.length === 0) return null;

  const items = movies.slice(0, 12);

  return (
    <div className="relative group/slider">
      {/* Navigation Arrow Left */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-[40%] -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 text-white/80 hover:text-[var(--color-cyan-neon)] border border-white/10 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover/slider:opacity-100 transition-all duration-300 ml-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_var(--color-cyan-neon)] backdrop-blur-sm active:scale-90"
        aria-label="Scroll left"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Embla Viewport */}
      <div className="overflow-hidden pb-6 pt-6 -mx-2 px-2" ref={emblaRef}>
        <div className="flex touch-pan-y" style={{ marginLeft: '-1rem' }}>
          {items.map((movie, index) => (
            <div
              key={movie._id}
              className="flex-[0_0_50%] md:flex-[0_0_25%] lg:flex-[0_0_16.6666%] min-w-0 pl-4"
            >
              <MovieCardWrapper movie={movie} priority={index < 4} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrow Right */}
      <button
        onClick={scrollNext}
        className="absolute right-0 top-[40%] -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 text-white/80 hover:text-[var(--color-cyan-neon)] border border-white/10 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover/slider:opacity-100 transition-all duration-300 mr-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_var(--color-cyan-neon)] backdrop-blur-sm active:scale-90"
        aria-label="Scroll right"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
});

export default MovieSlider;
