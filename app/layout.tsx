import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HistoryTracker from "@/components/HistoryTracker";
import PWARegistration from "@/components/PWARegistration";
import Providers from "@/components/Providers";
import CloudSync from "@/components/CloudSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-outfit",
});

export const metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || "Mocaemtui",
  description: "Xem phim online miễn phí",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: process.env.NEXT_PUBLIC_SITE_NAME || "Mocaemtui",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="preconnect" href="https://wsrv.nl" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://img.ophim.live" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ophim1.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <Providers>
          <CloudSync />
          <PWARegistration />
          <HistoryTracker />
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
