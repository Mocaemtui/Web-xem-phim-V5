export default function Loading() {
  return (
    <div className="overflow-hidden bg-black pb-16 min-h-screen">
      {/* Skeleton Hero Banner */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video lg:aspect-[21/9] max-h-[85vh] flex items-end pb-12 md:pb-24 pt-20 overflow-hidden bg-zinc-900 animate-shimmer border-b border-white/5">
        <div className="container mx-auto px-4 relative z-10 w-full">
          <div className="max-w-3xl">
            <div className="h-12 md:h-20 w-3/4 bg-zinc-800/80 rounded-lg mb-4 animate-pulse" />
            <div className="h-6 w-1/3 bg-zinc-800/80 rounded mb-4 animate-pulse" />
            <div className="h-4 w-full bg-zinc-800/80 rounded mb-2 animate-pulse" />
            <div className="h-4 w-5/6 bg-zinc-800/80 rounded mb-6 animate-pulse" />
            
            <div className="flex gap-4">
              <div className="h-12 w-32 bg-zinc-800/80 rounded-xl animate-pulse" />
              <div className="h-12 w-32 bg-zinc-800/80 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-20">
        {/* Skeleton Sections */}
        {[1, 2, 3].map((section) => (
          <section key={section} className="mb-14">
            <div className="h-8 w-48 bg-zinc-900 rounded mb-6 animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((card) => (
                <div 
                  key={card} 
                  className="w-[calc((100%-16px)/2)] md:w-[calc((100%-48px)/4)] lg:w-[calc((100%-80px)/6)] shrink-0 aspect-[2/3] bg-zinc-900 rounded-xl animate-shimmer"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
