export default function MovieDetailLoading() {
  return (
    <div className="bg-black min-h-screen">
      {/* Hero Banner Skeleton */}
      <div className="relative w-full h-[60vh] md:h-[80vh] bg-zinc-900 animate-shimmer border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Poster Skeleton */}
          <div className="hidden md:block">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl bg-zinc-900 animate-shimmer border border-white/5" />
          </div>

          {/* Info Skeleton */}
          <div className="flex flex-col gap-6">
            {/* Mobile Poster Skeleton */}
            <div className="md:hidden">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-2xl max-w-[200px] bg-zinc-900 animate-shimmer" />
            </div>

            {/* Title */}
            <div>
              <div className="h-10 w-3/4 bg-zinc-800 rounded-lg animate-pulse mb-3" />
              <div className="h-6 w-1/3 bg-zinc-800/80 rounded animate-pulse" />
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3">
              <div className="h-7 w-16 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-7 w-16 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-7 w-20 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-7 w-20 bg-zinc-800 rounded-full animate-pulse" />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse mr-2" />
              <div className="h-7 w-24 bg-zinc-900 rounded-full animate-pulse" />
              <div className="h-7 w-24 bg-zinc-900 rounded-full animate-pulse" />
              <div className="h-7 w-24 bg-zinc-900 rounded-full animate-pulse" />
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-2">
               <div className="h-12 w-32 bg-[var(--color-cyan-neon)]/20 rounded-xl animate-pulse" />
               <div className="h-12 w-12 bg-zinc-800 rounded-xl animate-pulse" />
               <div className="h-12 w-12 bg-zinc-800 rounded-xl animate-pulse" />
            </div>

            {/* Content Text */}
            <div className="space-y-3 mt-4">
              <div className="h-4 w-full bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-4 w-full bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-zinc-800/80 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
