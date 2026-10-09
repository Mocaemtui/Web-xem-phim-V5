"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) console.log("Dev Mode: Unregistered active Service Worker to prevent caching");
            });
          }
        });
        return;
      }

      const handleLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registered successfully with scope:", reg.scope);
          })
          .catch((err) => {
            console.error("Service Worker registration failed:", err);
          });
          
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            // Không tự động tải lại nếu người dùng đang xem phim để tránh làm mất luồng video
            if (!window.location.pathname.includes("/xem-phim/")) {
              window.location.reload();
            }
          }
        });
      };

      // Register service worker after window load to prevent blocking main thread
      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad);
        return () => window.removeEventListener("load", handleLoad);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for custom install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store event globally for custom install buttons to trigger
      (window as any).deferredPrompt = e;
      
      // Dispatch custom event to notify components that the app is installable
      window.dispatchEvent(new Event("pwa_installable"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  return null;
}
