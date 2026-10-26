"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function HistoryTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && !pathname.startsWith('/phim/') && !pathname.startsWith('/xem-phim/')) {
      const query = searchParams ? searchParams.toString() : "";
      const url = `${pathname}${query ? '?' + query : ''}`;
      
      const currentLast = sessionStorage.getItem("last_browse_page");
      if (currentLast && currentLast !== url) {
        sessionStorage.setItem("prev_browse_page", currentLast);
      }
      sessionStorage.setItem("last_browse_page", url);
    }
  }, [pathname, searchParams]);

  return null;
}

export default function HistoryTracker() {
  return (
    <Suspense fallback={null}>
      <HistoryTrackerContent />
    </Suspense>
  );
}
