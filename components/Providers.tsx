"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

const THEME_COLORS: Record<string, string> = {
  cyan: "#00f3ff",
  pink: "#ff007f",
  green: "#39ff14",
  sunset: "#ff5e00",
  purple: "#9d00ff",
  yellow: "#ffff00",
  red: "#ff003c",
  blue: "#0066ff"
};

function ThemeSynchronizer() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      const accent = (session.user as any).accentColor || "cyan";
      const color = THEME_COLORS[accent] || "#00f3ff";
      document.documentElement.style.setProperty("--accent-neon", color);
    } else {
      // Default to cyan for guest
      document.documentElement.style.setProperty("--accent-neon", "#00f3ff");
    }
  }, [session]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeSynchronizer />
      {children}
    </SessionProvider>
  );
}
