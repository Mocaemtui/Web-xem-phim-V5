"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function CloudSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Throttle sync to once every 10 minutes to save Vercel Edge Requests
      const lastSyncStr = localStorage.getItem("last_cloud_sync_time");
      const now = Date.now();
      if (lastSyncStr) {
        const lastSync = parseInt(lastSyncStr, 10);
        if (now - lastSync < 10 * 60 * 1000) {
          return; // Skip if synced recently
        }
      }

      // Kéo lịch sử từ Cloud về LocalStorage, thêm cache-buster để tránh lỗi cache
      fetch("/api/history?t=" + now)
        .then((res) => res.json())
        .then((data) => {
          if (data.history && Array.isArray(data.history)) {
            localStorage.setItem("movie_watch_history", JSON.stringify(data.history));
            localStorage.setItem("last_cloud_sync_time", now.toString());
            
            // Dispatch event để các trang khác (như trang Lịch sử) tự động cập nhật UI
            window.dispatchEvent(new Event("storage"));
          }
        })
        .catch(console.error);
    }
  }, [status, session]);

  return null;
}
