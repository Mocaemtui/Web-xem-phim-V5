export default function WatchPageLoading() {
  return (
    <div className="bg-black min-h-screen pt-16">
      <div className="container mx-auto px-4 lg:px-8 py-6">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Main Video Player Skeleton */}
          <div className="flex-1">
             <div className="w-full aspect-video bg-zinc-900 rounded-2xl animate-shimmer shadow-2xl border border-white/5" />
             <div className="mt-6 space-y-4">
                <div className="h-8 w-2/3 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-4 w-1/3 bg-zinc-800 rounded animate-pulse" />
             </div>
             {/* Controls Skeleton */}
             <div className="flex gap-4 mt-6">
                <div className="h-10 w-24 bg-zinc-900 rounded-lg animate-pulse" />
                <div className="h-10 w-24 bg-zinc-900 rounded-lg animate-pulse" />
                <div className="h-10 w-24 bg-zinc-900 rounded-lg animate-pulse" />
             </div>
          </div>
          
          {/* Sidebar / Episodes Skeleton */}
          <div className="w-full xl:w-[350px] shrink-0 space-y-4">
             <div className="h-10 w-full bg-zinc-800 rounded-xl animate-pulse" />
             <div className="h-[400px] w-full bg-zinc-900 rounded-xl animate-pulse border border-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
