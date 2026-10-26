"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  User as UserIcon, 
  Heart, 
  Clock, 
  LogOut, 
  Calendar, 
  ShieldAlert, 
  Play, 
  Trash2, 
  X,
  Sparkles,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Tv,
  ListPlus,
  TrendingUp,
  Award,
  Laptop,
  Check,
  FolderHeart,
  ChevronRight,
  Trophy,
  Info,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import BackButton from "@/components/BackButton";
import MovieCard from "@/components/MovieCard";
import { getPosterUrl, getChiTietPhim } from "@/lib/api";


import {
  getWatchHistory,
  removeFromHistory,
  clearWatchHistory,
  type WatchHistoryItem,
} from "@/lib/watchHistory";
import type { Movie, MovieDetail } from "@/types/api";

const AVATAR_PRESETS = [
  { id: "luffy", name: "Luffy", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Luffy" },
  { id: "zoro", name: "Zoro", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoro" },
  { id: "nami", name: "Nami", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nami" },
  { id: "sanji", name: "Sanji", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sanji" },
  { id: "gojo", name: "Gojo", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Gojo" },
  { id: "nezuko", name: "Nezuko", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nezuko" },
  { id: "mikasa", name: "Mikasa", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Mikasa" },
  { id: "eren", name: "Eren", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Eren" },
  { id: "buster", name: "Buster", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Buster" },
  { id: "penny", name: "Penny", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Penny" },
  { id: "rocky", name: "Rocky", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Rocky" },
  { id: "shadow", name: "Shadow", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow" },
];

const ACCENT_THEMES = [
  { id: "cyan", name: "Xanh Cyan", value: "#00f3ff", bg: "bg-[#00f3ff]", reqLevel: 1 },
  { id: "pink", name: "Hồng Neon", value: "#ff007f", bg: "bg-[#ff007f]", reqLevel: 1 },
  { id: "purple", name: "Tím Neon", value: "#9d00ff", bg: "bg-[#9d00ff]", reqLevel: 2 },
  { id: "yellow", name: "Vàng Neon", value: "#ffff00", bg: "bg-[#ffff00]", reqLevel: 2 },
  { id: "sunset", name: "Cam Sunset", value: "#ff5e00", bg: "bg-[#ff5e00]", reqLevel: 3 },
  { id: "green", name: "Lá Matrix", value: "#39ff14", bg: "bg-[#39ff14]", reqLevel: 4 },
  { id: "red", name: "Đỏ Neon", value: "#ff003c", bg: "bg-[#ff003c]", reqLevel: 5 },
  { id: "blue", name: "Xanh Dương", value: "#0066ff", bg: "bg-[#0066ff]", reqLevel: 5 },
];

interface PlaylistData {
  name: string;
  description?: string;
  movies: string[];
  movieDetails?: Movie[];
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const [activeTab, setActiveTab] = useState<"account" | "bookmarks" | "history" | "playlists">("account");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // States for History
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  // States for Bookmarks
  const [bookmarks, setBookmarks] = useState<Movie[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);

  // Profile Form States
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("cyan");
  const [bio, setBio] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [activeBadgeCategory, setActiveBadgeCategory] = useState<"all" | "watch" | "time" | "playlist" | "level" | "other">("all");
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [featuredBadge, setFeaturedBadge] = useState("");

  // Gamification Extra States
  const [claimedQuests, setClaimedQuests] = useState<string[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [floatingXP, setFloatingXP] = useState<{ id: number; xp: number }[]>([]);
  const [activeToasts, setActiveToasts] = useState<{ id: string; type: "level" | "badge"; title: string; desc: string; icon: string }[]>([]);
  const initialSyncRef = useRef(false);
  const prevLevelRef = useRef<number | null>(null);
  const prevUnlockedBadgesRef = useRef<string[]>([]);

  // Real Leaderboard States
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [profileEditedToday, setProfileEditedToday] = useState(false);

  // DB-backed Gamification States
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [userStreak, setUserStreak] = useState(0);

  // Avatar Upload States
  const [uploadLoading, setUploadLoading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước ảnh không được vượt quá 2MB");
      return;
    }

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setSelectedAvatar(base64String);
      setUploadLoading(false);
    };
    reader.onerror = () => {
      alert("Đã xảy ra lỗi khi đọc file");
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const addToast = (toast: { type: "level" | "badge"; title: string; desc: string; icon: string }) => {
    const id = Date.now().toString();
    setActiveToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Password Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Playlists States
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [playlistMessage, setPlaylistMessage] = useState({ text: "", type: "" });
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  // Device Info State
  const [deviceInfo, setDeviceInfo] = useState({ os: "Unknown OS", browser: "Unknown Browser" });

  // Pre-populate forms on session load
  useEffect(() => {
    if (session?.user) {
      setDisplayName((session.user as any).displayName || session.user.name || "");
      setSelectedAvatar((session.user as any).avatarUrl || "");
      setSelectedTheme((session.user as any).accentColor || "cyan");
      setBio((session.user as any).bio || "");
      setFeaturedBadge((session.user as any).featuredBadge || "");
    }
  }, [session]);

  // Load daily claimed quests
  useEffect(() => {
    if (status === "authenticated" && session?.user?.name) {
      const username = session.user.name;
      const todayStr = new Date().toDateString();
      const storageKey = `moviehub_quests_${username}_${todayStr}`;
      
      const savedClaimed = localStorage.getItem(storageKey);
      if (savedClaimed) {
        setClaimedQuests(JSON.parse(savedClaimed));
      } else {
        // Clear old quest keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`moviehub_quests_${username}_`)) {
            localStorage.removeItem(key);
          }
        }
        setClaimedQuests([]);
      }
    }
  }, [session, status]);

  // Fetch Real Leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const res = await fetch("/api/user/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (err) {
        console.error("Lỗi tải bảng xếp hạng:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };
    if (status === "authenticated") {
      fetchLeaderboard();
    }
  }, [status]);

  // Check if profile was edited today
  useEffect(() => {
    if (status === "authenticated" && session?.user?.name) {
      const username = session.user.name;
      const todayStr = new Date().toDateString();
      const storageKey = `moviehub_profile_edited_${username}_${todayStr}`;
      const edited = localStorage.getItem(storageKey) === "true";
      setProfileEditedToday(edited);
    }
  }, [session, status]);

  // Claim Quest handler (Database synced)
  const handleClaimQuest = async (questId: string, xpReward: number) => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/user/quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, xpReward }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserXP(data.xp || 0);
        setUserLevel(data.level || 1);
        const questIds = data.claimedQuests.map((q: any) => q.questId);
        setClaimedQuests(questIds);

        // Trigger floating XP text particle
        const id = Date.now();
        setFloatingXP(prev => [...prev, { id, xp: xpReward }]);
        setTimeout(() => {
          setFloatingXP(prev => prev.filter(item => item.id !== id));
        }, 2000);
      } else {
        const data = await res.json();
        alert(data.message || "Không thể nhận thưởng");
      }
    } catch (err) {
      console.error("Lỗi nhận thưởng nhiệm vụ:", err);
    }
  };

  // Showcase Badge handler
  const handleShowcaseBadge = async (badgeIcon: string) => {
    if (status !== "authenticated") return;
    setShowcaseLoading(true);
    try {
      const nextBadge = featuredBadge === badgeIcon ? "" : badgeIcon;
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredBadge: nextBadge }),
      });
      if (res.ok) {
        setFeaturedBadge(nextBadge);
        await update({ featuredBadge: nextBadge });
      }
    } catch (err) {
      console.error("Lỗi trưng bày huy hiệu:", err);
    } finally {
      setShowcaseLoading(false);
    }
  };

  // Sync tab with URL search query parameter
  useEffect(() => {
    setMounted(true);
    const tabParam = searchParams.get("tab");
    if (tabParam === "history" || tabParam === "bookmarks" || tabParam === "account" || tabParam === "playlists") {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Load Watch History
  useEffect(() => {
    if (mounted) {
      setHistory(getWatchHistory());
    }

    const handleStorage = () => {
      setHistory(getWatchHistory());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [mounted]);

  // Load Bookmarks
  useEffect(() => {
    if (!mounted || status !== "authenticated") {
      setBookmarks([]);
      if (status === "unauthenticated") setLoadingBookmarks(false);
      return;
    }

    const fetchBookmarks = async () => {
      setLoadingBookmarks(true);
      try {
        const res = await fetch("/api/bookmarks");
        if (res.ok) {
          const data = await res.json();
          const slugs: string[] = data.bookmarks || [];
          
          if (slugs.length === 0) {
            setBookmarks([]);
            setLoadingBookmarks(false);
            return;
          }

          const promises = slugs.map(async (slug) => {
            try {
              const movieRes = await getChiTietPhim(slug);
              return movieRes?.data?.item || null;
            } catch {
              return null;
            }
          });

          const results = (await Promise.all(promises)).filter((m): m is MovieDetail => m !== null);
          results.reverse();
          setBookmarks(results);
        }
      } catch (err) {
        console.error("Error loading bookmarks:", err);
      } finally {
        setLoadingBookmarks(false);
      }
    };

    fetchBookmarks();
  }, [mounted, status, session]);

  // Load Playlists & Gamification profile data
  useEffect(() => {
    if (!mounted || status !== "authenticated") {
      setPlaylists([]);
      if (status === "unauthenticated") setLoadingPlaylists(false);
      return;
    }

    const fetchProfileData = async () => {
      setLoadingPlaylists(true);
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setPlaylists(data.playlists || []);
          setUserXP(data.xp || 0);
          setUserLevel(data.level || 1);
          setUserStreak(data.streak || 0);
          if (data.claimedQuests) {
            const questIds = data.claimedQuests.map((q: any) => q.questId);
            setClaimedQuests(questIds);
          }

          // Sync avatar and other profile data from DB to session
          if (data.avatarUrl !== (session.user as any).avatarUrl ||
              data.displayName !== (session.user as any).displayName ||
              data.accentColor !== (session.user as any).accentColor ||
              data.bio !== (session.user as any).bio ||
              data.featuredBadge !== (session.user as any).featuredBadge) {
            await update({
              avatarUrl: data.avatarUrl,
              displayName: data.displayName,
              accentColor: data.accentColor,
              bio: data.bio,
              featuredBadge: data.featuredBadge
            });
          }
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoadingPlaylists(false);
      }
    };

    fetchProfileData();
  }, [mounted, status, session, update]);

  // Check daily login streak on mount
  useEffect(() => {
    if (!mounted || status !== "authenticated") return;

    const checkStreak = async () => {
      try {
        const res = await fetch("/api/user/streak", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setUserStreak(data.streak || 0);
          setUserXP(data.xp || 0);
          setUserLevel(data.level || 1);
          if (data.claimedToday) {
            addToast({
              type: "level",
              title: "Chuỗi Đăng Nhập! 🔥",
              desc: `Bạn đã duy trì chuỗi ${data.streak} ngày liên tục! Nhận ngay +10 XP.`,
              icon: "🔥"
            });
            setClaimedQuests(prev => [...prev.filter(id => id !== "login"), "login"]);
          }
        }
      } catch (err) {
        console.error("Error checking streak:", err);
      }
    };

    checkStreak();
  }, [mounted, status]);

  // Detect Device Info
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    let browser = "Unknown Browser";

    if (ua.indexOf("Win") !== -1) os = "Windows PC";
    else if (ua.indexOf("Mac") !== -1) os = "macOS";
    else if (ua.indexOf("X11") !== -1) os = "Linux PC";
    else if (ua.indexOf("Android") !== -1) os = "Android Mobile";
    else if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) os = "iOS Device";

    if (ua.indexOf("Chrome") !== -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Apple Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("Edge") !== -1) browser = "Microsoft Edge";

    setDeviceInfo({ os, browser });
  }, []);

  // Fetch movie details for expanded playlist
  useEffect(() => {
    if (!expandedPlaylist || status !== "authenticated") return;
    const playlist = playlists.find(p => p.name === expandedPlaylist);
    if (!playlist || playlist.movieDetails) return; // already loaded

    const loadPlaylistDetails = async () => {
      const slugs = playlist.movies || [];
      if (slugs.length === 0) return;

      const promises = slugs.map(async (slug) => {
        try {
          const movieRes = await getChiTietPhim(slug);
          return movieRes?.data?.item || null;
        } catch {
          return null;
        }
      });

      const results = (await Promise.all(promises)).filter((m): m is MovieDetail => m !== null);
      setPlaylists(prev => prev.map(p => {
        if (p.name === expandedPlaylist) {
          return { ...p, movieDetails: results };
        }
        return p;
      }));
    };

    loadPlaylistDetails();
  }, [expandedPlaylist, playlists, status]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl: selectedAvatar, accentColor: selectedTheme, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ text: data.message || "Đã xảy ra lỗi", type: "error" });
      } else {
        setProfileMessage({ text: "Cập nhật hồ sơ thành công!", type: "success" });
        // Set profile edited today flag
        if (session?.user?.name) {
          const username = session.user.name;
          const todayStr = new Date().toDateString();
          localStorage.setItem(`moviehub_profile_edited_${username}_${todayStr}`, "true");
          setProfileEditedToday(true);
        }
        // Update states from DB response
        if (data.user) {
          setUserXP(data.user.xp || 0);
          setUserLevel(data.user.level || 1);
          setUserStreak(data.user.streak || 0);
          if (data.user.claimedQuests) {
            const questIds = data.user.claimedQuests.map((q: any) => q.questId);
            setClaimedQuests(questIds);
          }
        }
        // Update NextAuth session dynamically
        await update({ displayName, avatarUrl: selectedAvatar, accentColor: selectedTheme, bio });
      }
    } catch (err) {
      setProfileMessage({ text: "Lỗi kết nối máy chủ", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Mật khẩu xác nhận không khớp", type: "error" });
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ text: data.message || "Đã xảy ra lỗi", type: "error" });
      } else {
        setPasswordMessage({ text: "Cập nhật mật khẩu thành công!", type: "success" });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPasswordMessage({ text: "Lỗi kết nối máy chủ", type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRemoveHistory = (slug: string) => {
    removeFromHistory(slug);
    setHistory(getWatchHistory());
  };

  const handleClearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem?")) {
      clearWatchHistory();
      setHistory([]);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    playlistLoading && setPlaylistLoading(true);
    setPlaylistMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/user/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName, description: newPlaylistDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlaylistMessage({ text: data.message || "Lỗi tạo danh sách phát", type: "error" });
      } else {
        setPlaylistMessage({ text: "Tạo danh sách phát thành công!", type: "success" });
        setNewPlaylistName("");
        setNewPlaylistDesc("");
        setPlaylists(data.playlists || []);
      }
    } catch (err) {
      setPlaylistMessage({ text: "Lỗi hệ thống", type: "error" });
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleDeletePlaylist = async (name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh sách phát "${name}"?`)) return;

    try {
      const res = await fetch("/api/user/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistName: name }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlaylists(data.playlists || []);
        if (expandedPlaylist === name) setExpandedPlaylist(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromPlaylist = async (playlistName: string, movieSlug: string) => {
    try {
      const res = await fetch("/api/user/playlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistName, movieSlug, action: "remove" }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update local state details list too
        setPlaylists(prev => prev.map(p => {
          if (p.name === playlistName) {
            const nextMovies = p.movies.filter(slug => slug !== movieSlug);
            const nextDetails = p.movieDetails?.filter(m => m.slug !== movieSlug);
            return { ...p, movies: nextMovies, movieDetails: nextDetails };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/ca-nhan?${params.toString()}`);
  };

  // Calculate Watch Stats
  const totalSeconds = history.reduce((acc, item) => acc + (item.currentTime || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const completedCount = history.filter(item => item.duration && (item.currentTime || 0) / item.duration > 0.85).length;

  // Daily Quests Calculations (Strict today checks)
  const todayStr = new Date().toDateString();
  
  const todayCompletedItems = history.filter(item => {
    const isToday = new Date(item.watchedAt).toDateString() === todayStr;
    const isCompleted = item.duration && (item.currentTime || 0) / item.duration > 0.85;
    return isToday && isCompleted;
  });
  const episodesWatchedToday = todayCompletedItems.length;
  
  const todayAllItems = history.filter(item => new Date(item.watchedAt).toDateString() === todayStr);
  
  // Lấy tổng số giây xem phim thực tế hôm nay từ localStorage
  const watchSecondsKey = `moviehub_watch_seconds_today_${todayStr}`;
  let totalSecondsToday = 0;
  if (typeof window !== "undefined") {
    totalSecondsToday = parseInt(localStorage.getItem(watchSecondsKey) || "0", 10);
  }
  const minutesWatchedToday = Math.floor(totalSecondsToday / 60);

  const hasWatched1Episode = episodesWatchedToday >= 1;
  const hasWatched3Episodes = episodesWatchedToday >= 3;
  const hasWatched20Mins = minutesWatchedToday >= 20;
  const hasWatched60Mins = minutesWatchedToday >= 60;
  const hasWatched120Mins = minutesWatchedToday >= 120;

  // EXP & Levels calculation (Database backed)
  const currentLevelXP = userXP % 100;

  // Badges lists
  const BADGES = [
    // Nhóm 1: Mọt phim (Watch Counts)
    { id: "watch_1", name: "Tập sự cày phim", desc: "Xem 1 phim đầu tiên", icon: "🌱", unlocked: history.length >= 1, progressText: `${Math.min(history.length, 1)}/1 phim`, percent: Math.min(Math.round((history.length / 1) * 100), 100) },
    { id: "watch_5", name: "Cày thủ nghiệp dư", desc: "Có 5 phim trong lịch sử xem", icon: "🍿", unlocked: history.length >= 5, progressText: `${Math.min(history.length, 5)}/5 phim`, percent: Math.min(Math.round((history.length / 5) * 100), 100) },
    { id: "watch_10", name: "Mọt phim chính hiệu", desc: "Có 10 phim trong lịch sử xem", icon: "🎬", unlocked: history.length >= 10, progressText: `${Math.min(history.length, 10)}/10 phim`, percent: Math.min(Math.round((history.length / 10) * 100), 100) },
    { id: "watch_20", name: "Chiến thần cày phim", desc: "Có 20 phim trong lịch sử xem", icon: "⚡", unlocked: history.length >= 20, progressText: `${Math.min(history.length, 20)}/20 phim`, percent: Math.min(Math.round((history.length / 20) * 100), 100) },
    { id: "watch_30", name: "Đại sư điện ảnh", desc: "Có 30 phim trong lịch sử xem", icon: "🌟", unlocked: history.length >= 30, progressText: `${Math.min(history.length, 30)}/30 phim`, percent: Math.min(Math.round((history.length / 30) * 100), 100) },
    { id: "watch_50", name: "Tín đồ phim ảnh", desc: "Có 50 phim trong lịch sử xem", icon: "🔥", unlocked: history.length >= 50, progressText: `${Math.min(history.length, 50)}/50 phim`, percent: Math.min(Math.round((history.length / 50) * 100), 100) },
    { id: "watch_75", name: "Kỷ lục gia cày phim", desc: "Có 75 phim trong lịch sử xem", icon: "🏆", unlocked: history.length >= 75, progressText: `${Math.min(history.length, 75)}/75 phim`, percent: Math.min(Math.round((history.length / 75) * 100), 100) },
    { id: "watch_100", name: "Vô địch thiên hạ", desc: "Có 100 phim trong lịch sử xem", icon: "👑", unlocked: history.length >= 100, progressText: `${Math.min(history.length, 100)}/100 phim`, percent: Math.min(Math.round((history.length / 100) * 100), 100) },

    // Nhóm 2: Thời gian cày (Hours watched)
    { id: "time_1h", name: "Trải nghiệm ban đầu", desc: "Xem phim trên 1 giờ", icon: "⏱️", unlocked: parseFloat(totalHours) >= 1, progressText: `${Math.min(parseFloat(totalHours), 1)}/1 giờ`, percent: Math.min(Math.round((parseFloat(totalHours) / 1) * 100), 100) },
    { id: "time_5h", name: "Dấn thân sâu sắc", desc: "Xem phim trên 5 giờ", icon: "⏳", unlocked: parseFloat(totalHours) >= 5, progressText: `${Math.min(parseFloat(totalHours), 5)}/5 giờ`, percent: Math.min(Math.round((parseFloat(totalHours) / 5) * 100), 100) },
    { id: "time_10h", name: "Người cày bền bỉ", desc: "Xem phim trên 10 giờ", icon: "⏰", unlocked: parseFloat(totalHours) >= 10, progressText: `${Math.min(parseFloat(totalHours), 10)}/10 giờ`, percent: Math.min(Math.round((parseFloat(totalHours) / 10) * 100), 100) },
    { id: "time_24h", name: "Trọn một ngày phim", desc: "Xem phim trên 24 giờ", icon: "☀️", unlocked: parseFloat(totalHours) >= 24, progressText: `${Math.min(parseFloat(totalHours), 24)}/24 giờ`, percent: Math.min(Math.round((parseFloat(totalHours) / 24) * 100), 100) },
    { id: "time_50h", name: "Đắm chìm vô tận", desc: "Xem phim trên 50 giờ", icon: "🌌", unlocked: parseFloat(totalHours) >= 50, progressText: `${Math.min(parseFloat(totalHours), 50)}/50 giờ`, percent: Math.min(Math.round((parseFloat(totalHours) / 50) * 100), 100) },
    { id: "time_100h", name: "Nhập định điện ảnh", desc: "Xem phim trên 100 giờ", icon: "🪐", unlocked: parseFloat(totalHours) >= 100, progressText: `${Math.min(parseFloat(totalHours), 100)}/100 giờ`, percent: Math.min(Math.round((parseFloat(totalHours) / 100) * 100), 100) },

    // Nhóm 3: Sưu tập (Playlists)
    { id: "playlist_1", name: "Kiến tạo danh sách", desc: "Tạo 1 danh sách phát cá nhân", icon: "📁", unlocked: playlists.length >= 1, progressText: `${Math.min(playlists.length, 1)}/1 playlist`, percent: Math.min(Math.round((playlists.length / 1) * 100), 100) },
    { id: "playlist_3", name: "Người gom góp", desc: "Tạo 3 danh sách phát cá nhân", icon: "📂", unlocked: playlists.length >= 3, progressText: `${Math.min(playlists.length, 3)}/3 playlists`, percent: Math.min(Math.round((playlists.length / 3) * 100), 100) },
    { id: "playlist_5", name: "Thư viện cá nhân", desc: "Tạo 5 danh sách phát cá nhân", icon: "📚", unlocked: playlists.length >= 5, progressText: `${Math.min(playlists.length, 5)}/5 playlists`, percent: Math.min(Math.round((playlists.length / 5) * 100), 100) },
    { id: "playlist_10", name: "Bảo tàng phim ảnh", desc: "Tạo 10 danh sách phát cá nhân", icon: "🏛️", unlocked: playlists.length >= 10, progressText: `${Math.min(playlists.length, 10)}/10 playlists`, percent: Math.min(Math.round((playlists.length / 10) * 100), 100) },
    { id: "playlist_15", name: "Quản thủ tối cao", desc: "Tạo 15 danh sách phát cá nhân", icon: "🔮", unlocked: playlists.length >= 15, progressText: `${Math.min(playlists.length, 15)}/15 playlists`, percent: Math.min(Math.round((playlists.length / 15) * 100), 100) },
    { id: "playlist_20", name: "Nhà lưu trữ vĩ đại", desc: "Tạo 20 danh sách phát cá nhân", icon: "🌀", unlocked: playlists.length >= 20, progressText: `${Math.min(playlists.length, 20)}/20 playlists`, percent: Math.min(Math.round((playlists.length / 20) * 100), 100) },

    // Nhóm 4: Cấp độ (Levels)
    { id: "level_2", name: "Khởi đầu vững chắc", desc: "Đạt cấp độ 2 trở lên", icon: "🛡️", unlocked: userLevel >= 2, progressText: `${Math.min(userLevel, 2)}/2 Cấp độ`, percent: Math.min(Math.round((userLevel / 2) * 100), 100) },
    { id: "level_5", name: "Thành viên tích cực", desc: "Đạt cấp độ 5 trở lên", icon: "🌟", unlocked: userLevel >= 5, progressText: `${Math.min(userLevel, 5)}/5 Cấp độ`, percent: Math.min(Math.round((userLevel / 5) * 100), 100) },
    { id: "level_10", name: "Trưởng lão MovieHub", desc: "Đạt cấp độ 10 trở lên", icon: "🧙‍♂️", unlocked: userLevel >= 10, progressText: `${Math.min(userLevel, 10)}/10 Cấp độ`, percent: Math.min(Math.round((userLevel / 10) * 100), 100) },
    { id: "level_15", name: "Cao thủ ẩn dật", desc: "Đạt cấp độ 15 trở lên", icon: "🥷", unlocked: userLevel >= 15, progressText: `${Math.min(userLevel, 15)}/15 Cấp độ`, percent: Math.min(Math.round((userLevel / 15) * 100), 100) },
    { id: "level_20", name: "Huyền thoại sống", desc: "Đạt cấp độ 20 trở lên", icon: "💎", unlocked: userLevel >= 20, progressText: `${Math.min(userLevel, 20)}/20 Cấp độ`, percent: Math.min(Math.round((userLevel / 20) * 100), 100) },
    { id: "level_30", name: "Tối thượng thần", desc: "Đạt cấp độ 30 trở lên", icon: "🛸", unlocked: userLevel >= 30, progressText: `${Math.min(userLevel, 30)}/30 Cấp độ`, percent: Math.min(Math.round((userLevel / 30) * 100), 100) },

    // Nhóm 5: Hành vi khác
    { id: "custom_name", name: "Định danh bản thân", desc: "Thiết lập tên hiển thị cá nhân hóa", icon: "🏷️", unlocked: (displayName !== (session?.user as any)?.name && displayName.length > 0), progressText: (displayName !== (session?.user as any)?.name && displayName.length > 0) ? "Đã đổi tên (1/1)" : "Chưa đổi tên (0/1)", percent: (displayName !== (session?.user as any)?.name && displayName.length > 0) ? 100 : 0 },
    { id: "custom_bio", name: "Tiết lộ bản thân", desc: "Viết lời giới thiệu dài từ 10 ký tự trở lên", icon: "📝", unlocked: bio.length >= 10, progressText: `${Math.min(bio.length, 10)}/10 ký tự`, percent: Math.min(Math.round((bio.length / 10) * 100), 100) },
    { id: "custom_avatar", name: "Diện mạo mới", desc: "Thiết lập ảnh đại diện tùy chỉnh", icon: "🎭", unlocked: (selectedAvatar !== ""), progressText: (selectedAvatar !== "") ? "Đã có avatar (1/1)" : "Chưa có avatar (0/1)", percent: (selectedAvatar !== "") ? 100 : 0 },
    { id: "bookmark_5", name: "Nhà phê bình phim", desc: "Lưu 5 bộ phim yêu thích trở lên", icon: "❤️", unlocked: bookmarks.length >= 5, progressText: `${Math.min(bookmarks.length, 5)}/5 phim lưu`, percent: Math.min(Math.round((bookmarks.length / 5) * 100), 100) },
    { id: "bookmark_10", name: "Kho phim yêu thích", desc: "Lưu 10 bộ phim yêu thích trở lên", icon: "💖", unlocked: bookmarks.length >= 10, progressText: `${Math.min(bookmarks.length, 10)}/10 phim lưu`, percent: Math.min(Math.round((bookmarks.length / 10) * 100), 100) },
    { id: "night_watch", name: "Thợ săn đêm", desc: "Xem phim trong khung giờ khuya ít nhất 1 lần", icon: "🦉", unlocked: history.some(item => { const h = new Date(item.watchedAt).getHours(); return h >= 23 || h <= 5; }), progressText: (history.some(item => { const h = new Date(item.watchedAt).getHours(); return h >= 23 || h <= 5; })) ? "Đã xem đêm (1/1)" : "Chưa xem đêm (0/1)", percent: (history.some(item => { const h = new Date(item.watchedAt).getHours(); return h >= 23 || h <= 5; })) ? 100 : 0 },
  ];

  // Monitor levels & achievements for real-time notifications
  useEffect(() => {
    if (!mounted || status !== "authenticated" || loadingBookmarks || loadingPlaylists) return;

    const currentUnlockedIds = BADGES.filter(b => b.unlocked).map(b => b.id);

    if (!initialSyncRef.current) {
      prevLevelRef.current = userLevel;
      prevUnlockedBadgesRef.current = currentUnlockedIds;
      initialSyncRef.current = true;
      return;
    }

    // Level-up detector
    if (prevLevelRef.current !== null && userLevel > prevLevelRef.current) {
      const nextLevel = userLevel;
      prevLevelRef.current = nextLevel;
      addToast({
        type: "level",
        title: "Lên Cấp Cực Đỉnh! 🚀",
        desc: `Chúc mừng bạn đã đạt cấp độ ${nextLevel}!`,
        icon: "🎉"
      });
    }

    // Badge unlock detector
    BADGES.forEach(badge => {
      if (badge.unlocked && !prevUnlockedBadgesRef.current.includes(badge.id)) {
        addToast({
          type: "badge",
          title: "Mở Khóa Thành Tựu! 🏆",
          desc: `Huy hiệu "${badge.name}" đã được mở khóa!`,
          icon: badge.icon
        });
      }
    });

    prevUnlockedBadgesRef.current = currentUnlockedIds;
  }, [userLevel, bookmarks.length, playlists.length, displayName, bio, selectedAvatar, history.length, mounted, status, session, loadingBookmarks, loadingPlaylists]);

if (!mounted) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
      </div>
    );
  }

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return "G";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Profile Card Header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--color-cyan-neon)]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--color-pink-neon)]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          {/* Avatar container */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] p-[3px] shadow-[0_0_20px_rgba(0,243,255,0.2)]">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-white font-bold text-2xl md:text-3xl font-outfit overflow-hidden">
                {status === "authenticated" && session?.user ? (
                  (session.user as any).avatarUrl ? (
                    <img 
                      src={(session.user as any).avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    getInitials(session.user.name || "U")
                  )
                ) : (
                  "G"
                )}
              </div>
            </div>
            {status === "authenticated" && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-[3px] border-zinc-900" title="Đang trực tuyến" />
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold font-outfit text-white mb-2 flex flex-col md:flex-row items-center gap-2 justify-center md:justify-start">
              <span className="flex items-center gap-2">
                {status === "authenticated" && session?.user ? (
                  (session.user as any).displayName || session.user.name
                ) : (
                  "Tài khoản Khách"
                )}
                {status === "authenticated" && featuredBadge && (
                  <span className="text-2xl select-none" title="Huy hiệu nổi bật">{featuredBadge}</span>
                )}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                status === "authenticated" 
                  ? "bg-cyan-500/10 text-[var(--color-cyan-neon)] border-cyan-500/20" 
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}>
                {status === "authenticated" ? `Cấp độ ${userLevel}` : "Guest"}
              </span>
              {status === "authenticated" && userStreak > 0 && (
                <span 
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)] animate-pulse cursor-default"
                  title={`Chuỗi đăng nhập liên tục: ${userStreak} ngày`}
                >
                  🔥 {userStreak} ngày
                </span>
              )}
            </h1>
            
            {status === "authenticated" && (
              /* XP Progress Bar */
              <div className="max-w-xs mx-auto md:mx-0 mb-3">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1 font-bold items-center">
                  <span className="flex items-center gap-1">
                    EXP LEVEL PROGRESS
                    <button 
                      type="button" 
                      onClick={() => setShowLevelInfo(true)}
                      className="text-zinc-500 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center"
                      title="Giải thích hệ thống cấp độ"
                    >
                      <Info size={11} />
                    </button>
                  </span>
                  <span>{currentLevelXP}/100 XP</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] transition-all duration-500" 
                    style={{ width: `${currentLevelXP}%` }}
                  />
                </div>
              </div>
            )}

            {status === "authenticated" && (session.user as any).bio && (
              <p className="text-zinc-400 text-xs italic mt-2 max-w-sm line-clamp-2 md:text-left text-center mb-3">
                &ldquo;{(session.user as any).bio}&rdquo;
              </p>
            )}

            <p className="text-zinc-400 text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 mb-4">
              <Calendar size={15} />
              {status === "authenticated" ? "Đã đồng bộ bộ nhớ đám mây" : "Chế độ lưu trữ thiết bị cục bộ"}
            </p>

            {status !== "authenticated" && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-cyan-neon)] text-black hover:bg-[var(--color-cyan-neon)]/90 shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all cursor-pointer inline-flex items-center gap-1.5 border-none"
              >
                <UserIcon size={14} />
                Đăng nhập để đồng bộ dữ liệu
              </button>
            )}
          </div>

          {status === "authenticated" && (
            <button
              onClick={() => signOut()}
              className="px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/5 border border-zinc-800 hover:border-red-500/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex border-b border-zinc-800/80 mb-8 gap-2 md:gap-4 overflow-x-auto pb-px">
        <button
          onClick={() => changeTab("account")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap bg-transparent border-t-0 border-l-0 border-r-0 ${
            activeTab === "account"
              ? "border-[var(--color-cyan-neon)] text-[var(--color-cyan-neon)] drop-shadow-[0_0_8px_rgba(0,243,255,0.3)]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <UserIcon size={16} />
          Tài khoản & Thống kê
        </button>
        <button
          onClick={() => changeTab("playlists")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap bg-transparent border-t-0 border-l-0 border-r-0 ${
            activeTab === "playlists"
              ? "border-[var(--color-cyan-neon)] text-[var(--color-cyan-neon)] drop-shadow-[0_0_8px_rgba(0,243,255,0.3)]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <ListPlus size={16} />
          Danh sách phát ({status === "authenticated" ? playlists.length : 0})
        </button>
        <button
          onClick={() => changeTab("bookmarks")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap bg-transparent border-t-0 border-l-0 border-r-0 ${
            activeTab === "bookmarks"
              ? "border-[var(--color-pink-neon)] text-[var(--color-pink-neon)] drop-shadow-[0_0_8px_rgba(255,0,127,0.3)]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Heart size={16} />
          Phim đã lưu ({status === "authenticated" ? bookmarks.length : 0})
        </button>
        <button
          onClick={() => changeTab("history")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap bg-transparent border-t-0 border-l-0 border-r-0 ${
            activeTab === "history"
              ? "border-[var(--color-cyan-neon)] text-[var(--color-cyan-neon)] drop-shadow-[0_0_8px_rgba(0,243,255,0.3)]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Clock size={16} />
          Lịch sử xem ({history.length})
        </button>
      </div>

      {/* Tab Content Areas */}
      <div>
        <AnimatePresence mode="wait">
          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Analytics Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center gap-4">
                  <div className="p-3.5 bg-[var(--color-cyan-neon)]/10 text-[var(--color-cyan-neon)] rounded-xl">
                    <Clock size={24} />
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-0.5">Giờ đã cày</span>
                    <span className="text-2xl font-bold font-outfit text-white">{totalHours} giờ</span>
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center gap-4">
                  <div className="p-3.5 bg-[var(--color-pink-neon)]/10 text-[var(--color-pink-neon)] rounded-xl">
                    <Tv size={24} />
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-0.5">Tập phim hoàn thành</span>
                    <span className="text-2xl font-bold font-outfit text-white">{completedCount} tập</span>
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center gap-4">
                  <div className="p-3.5 bg-green-500/10 text-green-400 rounded-xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-0.5">Hạng tài khoản</span>
                    <span className="text-xl font-bold font-outfit text-green-400">
                      {history.length >= 20 ? "Siêu Mọt Phim" : history.length >= 10 ? "Mọt Phim" : "Tập Sự"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Forms (Profile Edit & Password Change) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Watch stats charts mock */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 md:p-8 backdrop-blur-md space-y-6">
                    <h2 className="text-xl font-bold font-outfit flex items-center gap-2">
                      <TrendingUp size={18} className="text-[var(--color-cyan-neon)]" />
                      Phân tích thể loại cày nhiều nhất
                    </h2>
                    
                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-300 font-semibold">Hành động & Viễn tưởng</span>
                          <span className="text-[var(--color-cyan-neon)] font-bold">55%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-cyan-neon)] rounded-full" style={{ width: "55%" }} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-300 font-semibold">Anime & Hoạt hình</span>
                          <span className="text-[var(--color-pink-neon)] font-bold">30%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-pink-neon)] rounded-full" style={{ width: "30%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-300 font-semibold">Tình cảm & Tâm lý</span>
                          <span className="text-green-400 font-bold">15%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: "15%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {status === "authenticated" && (
                    <>
                      {/* Edit Profile Form */}
                      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 md:p-8 backdrop-blur-md">
                        <h2 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                          <UserIcon size={18} className="text-[var(--color-cyan-neon)]" />
                          Cài đặt hồ sơ cá nhân
                        </h2>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                          {profileMessage.text && (
                            <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
                              profileMessage.type === "success" 
                                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            }`}>
                              {profileMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                              {profileMessage.text}
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2">Tên hiển thị công khai</label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)] transition-all"
                              placeholder="Nhập tên hiển thị..."
                              required
                            />
                          </div>

                          <div>
                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2">Tiểu sử cá nhân (Bio)</label>
                            <textarea
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              maxLength={200}
                              rows={2}
                              className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)] transition-all resize-none text-sm"
                              placeholder="Viết một lời tự giới thiệu ngắn về bản thân..."
                            />
                            <div className="text-right text-[10px] text-zinc-500 mt-1">
                              {bio.length}/200 ký tự
                            </div>
                          </div>

                                                                              <div>
                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-3">Chọn Avatar Nhân Vật</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
                              {AVATAR_PRESETS.map((preset) => {
                                const isSelected = selectedAvatar === preset.url;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setSelectedAvatar(preset.url)}
                                    className={`relative aspect-square rounded-xl overflow-hidden p-1 bg-zinc-950 border transition-all cursor-pointer ${
                                      isSelected 
                                        ? "border-[var(--color-cyan-neon)] scale-110 shadow-[0_0_15px_rgba(0,243,255,0.4)]" 
                                        : "border-white/5 hover:border-white/20 hover:scale-105"
                                    }`}
                                    title={preset.name}
                                  >
                                    <img 
                                      src={preset.url} 
                                      alt={preset.name}
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                    {isSelected && (
                                      <div className="absolute inset-0 bg-[var(--color-cyan-neon)]/10 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan-neon)]" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Upload custom avatar */}
                            <div className="mb-4">
                              <label className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/10 hover:border-[var(--color-cyan-neon)]/30 hover:bg-[var(--color-cyan-neon)]/5 text-xs text-zinc-400 hover:text-white cursor-pointer transition-all select-none bg-black/10">
                                {uploadLoading ? (
                                  <Loader2 size={14} className="animate-spin text-[var(--color-cyan-neon)]" />
                                ) : (
                                  <Upload size={14} className="text-zinc-500" />
                                )}
                                {uploadLoading ? "Đang xử lý..." : "Tải ảnh đại diện từ thiết bị (.JPG, .PNG)"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleAvatarUpload}
                                  className="hidden"
                                  disabled={uploadLoading}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Accent Color Themes Selector */}
                          <div>
                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-3">Chủ đề màu phát sáng (Theme color)</label>
                            <div className="flex flex-wrap gap-4">
                              {ACCENT_THEMES.map((theme) => {
                                const isSelected = selectedTheme === theme.id;
                                const isLocked = theme.reqLevel > userLevel;
                                return (
                                  <button
                                    key={theme.id}
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => setSelectedTheme(theme.id)}
                                    className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-2 transition-all ${
                                      isLocked
                                        ? "border-zinc-800 bg-zinc-950/20 text-zinc-600 cursor-not-allowed opacity-40"
                                        : isSelected 
                                          ? "border-[var(--color-cyan-neon)] bg-[var(--color-cyan-neon)]/5 text-white shadow-[0_0_10px_var(--color-cyan-neon)] cursor-pointer" 
                                          : "border-white/5 bg-zinc-900/60 text-zinc-400 hover:text-white cursor-pointer"
                                    }`}
                                    title={isLocked ? `Yêu cầu cấp độ ${theme.reqLevel} để mở khóa` : theme.name}
                                  >
                                    {isLocked ? (
                                      <Lock size={12} className="text-zinc-600" />
                                    ) : (
                                      <div className={`w-3.5 h-3.5 rounded-full ${theme.bg} border border-white/10`} />
                                    )}
                                    {theme.name}
                                    {isSelected && !isLocked && <Check size={12} className="text-[var(--color-cyan-neon)] ml-1" />}
                                    {isLocked && <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded">Lvl {theme.reqLevel}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={profileLoading}
                            className="px-6 py-3 rounded-xl bg-[var(--color-cyan-neon)] hover:bg-[var(--color-cyan-neon)]/90 text-black font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
                          >
                            {profileLoading ? <Loader2 size={16} className="animate-spin" /> : "Lưu cấu hình"}
                          </button>
                        </form>
                      </div>

                      {/* Edit Password Form */}
                      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 md:p-8 backdrop-blur-md">
                        <h2 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                          <Lock size={18} className="text-[var(--color-cyan-neon)]" />
                          Đổi mật khẩu bảo mật
                        </h2>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                          {passwordMessage.text && (
                            <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
                              passwordMessage.type === "success" 
                                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            }`}>
                              {passwordMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                              {passwordMessage.text}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2">Mật khẩu mới</label>
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)] transition-all"
                                placeholder="Mật khẩu mới..."
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2">Xác nhận mật khẩu mới</label>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)] transition-all"
                                placeholder="Xác nhận..."
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
                          >
                            {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : "Cập nhật mật khẩu"}
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>

                {/* Right side box (EXP levels & Device Manager) */}
                <div className="space-y-6 h-fit lg:sticky lg:top-28">
                  {/* Daily Quests */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 backdrop-blur-md relative overflow-visible">
                    {/* Floating XP Animates */}
                    <AnimatePresence>
                      {floatingXP.map((fx) => (
                        <motion.div
                          key={fx.id}
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: -45, scale: 1.2 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute right-6 top-6 z-10 text-xs font-extrabold text-[var(--color-cyan-neon)] bg-zinc-950 border border-[var(--color-cyan-neon)]/50 px-3 py-1.5 rounded-full shadow-[0_0_15px_var(--color-cyan-neon)] pointer-events-none flex items-center gap-1.5"
                        >
                          <Sparkles size={12} className="text-yellow-400 animate-spin" />
                          +{fx.xp} EXP
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <h3 className="font-bold font-outfit text-lg mb-4 flex items-center gap-2">
                      <Sparkles size={18} className="text-[var(--color-cyan-neon)] animate-pulse" />
                      Nhiệm vụ hàng ngày
                    </h3>
                    <div className="space-y-3">
                      {/* Quest 1: Đăng Nhập Hàng Ngày */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        claimedQuests.includes("login")
                          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                          : "bg-orange-500/5 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            claimedQuests.includes("login")
                              ? "bg-zinc-800 text-zinc-550"
                              : "bg-orange-500/20 text-orange-400 font-bold animate-pulse"
                          }`}>
                            {claimedQuests.includes("login") ? <Check size={12} /> : "1"}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block ${claimedQuests.includes("login") ? "text-orange-500/50 line-through" : "text-orange-400"}`}>
                              Điểm danh (Đăng nhập hôm nay)
                            </span>
                            <span className="text-[10px] text-zinc-550 block">Thưởng: +10 EXP</span>
                          </div>
                        </div>
                        {claimedQuests.includes("login") ? (
                          <span className="text-[9px] text-zinc-500 font-bold bg-zinc-800/40 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">ĐÃ NHẬN</span>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-bold bg-zinc-900/30 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">0/1</span>
                        )}
                      </div>

                      {/* Quest 2: Khởi Động */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        claimedQuests.includes("watch_1")
                          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                          : hasWatched1Episode
                            ? "bg-green-500/5 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            : "bg-zinc-900/40 border-white/5"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            claimedQuests.includes("watch_1")
                              ? "bg-zinc-800 text-zinc-550"
                              : hasWatched1Episode
                                ? "bg-green-500/20 text-green-400 font-bold animate-bounce"
                                : "bg-zinc-850 text-zinc-500"
                          }`}>
                            {claimedQuests.includes("watch_1") ? <Check size={12} /> : "2"}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block ${claimedQuests.includes("watch_1") ? "text-zinc-550 line-through" : "text-zinc-200"}`}>
                              Khởi Động (Xem xong 1 tập phim hôm nay)
                            </span>
                            <span className="text-[10px] text-zinc-550 block">
                              Thưởng: +20 EXP <span className="ml-1 text-cyan-500">({episodesWatchedToday}/1)</span>
                            </span>
                          </div>
                        </div>
                        {hasWatched1Episode && !claimedQuests.includes("watch_1") ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest("watch_1", 20)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] text-black cursor-pointer hover:brightness-110 shadow-[0_0_10px_var(--color-cyan-neon)]/30 border-none transition-all select-none shrink-0"
                          >
                            Nhận
                          </button>
                        ) : claimedQuests.includes("watch_1") ? (
                          <span className="text-[9px] text-zinc-500 font-bold bg-zinc-800/40 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">ĐÃ NHẬN</span>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-bold bg-zinc-900/30 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">Chưa Đạt</span>
                        )}
                      </div>

                      {/* Quest 3: Say Mê */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        claimedQuests.includes("watch_3")
                          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                          : hasWatched3Episodes
                            ? "bg-green-500/5 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            : "bg-zinc-900/40 border-white/5"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            claimedQuests.includes("watch_3")
                              ? "bg-zinc-800 text-zinc-550"
                              : hasWatched3Episodes
                                ? "bg-green-500/20 text-green-400 font-bold animate-bounce"
                                : "bg-zinc-850 text-zinc-500"
                          }`}>
                            {claimedQuests.includes("watch_3") ? <Check size={12} /> : "3"}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block ${claimedQuests.includes("watch_3") ? "text-zinc-550 line-through" : "text-zinc-200"}`}>
                              Say Mê (Xem xong 3 tập phim hôm nay)
                            </span>
                            <span className="text-[10px] text-zinc-550 block">
                              Thưởng: +40 EXP <span className="ml-1 text-cyan-500">({episodesWatchedToday}/3)</span>
                            </span>
                          </div>
                        </div>
                        {hasWatched3Episodes && !claimedQuests.includes("watch_3") ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest("watch_3", 40)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] text-black cursor-pointer hover:brightness-110 shadow-[0_0_10px_var(--color-cyan-neon)]/30 border-none transition-all select-none shrink-0"
                          >
                            Nhận
                          </button>
                        ) : claimedQuests.includes("watch_3") ? (
                          <span className="text-[9px] text-zinc-500 font-bold bg-zinc-800/40 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">ĐÃ NHẬN</span>
                        ) : (
                          <span className="text-[9px] text-zinc-655 font-bold bg-zinc-900/30 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">Chưa Đạt</span>
                        )}
                      </div>

                      {/* Quest 4: Xem 20p */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        claimedQuests.includes("watch_20m")
                          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                          : hasWatched20Mins
                            ? "bg-green-500/5 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            : "bg-zinc-900/40 border-white/5"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            claimedQuests.includes("watch_20m")
                              ? "bg-zinc-800 text-zinc-550"
                              : hasWatched20Mins
                                ? "bg-green-500/20 text-green-400 font-bold animate-bounce"
                                : "bg-zinc-850 text-zinc-500"
                          }`}>
                            {claimedQuests.includes("watch_20m") ? <Check size={12} /> : "4"}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block ${claimedQuests.includes("watch_20m") ? "text-zinc-550 line-through" : "text-zinc-200"}`}>
                              Giải Trí (Xem phim 20 phút hôm nay)
                            </span>
                            <span className="text-[10px] text-zinc-550 block">
                              Thưởng: +20 EXP <span className="ml-1 text-cyan-500">({minutesWatchedToday}/20p)</span>
                            </span>
                          </div>
                        </div>
                        {hasWatched20Mins && !claimedQuests.includes("watch_20m") ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest("watch_20m", 20)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] text-black cursor-pointer hover:brightness-110 shadow-[0_0_10px_var(--color-cyan-neon)]/30 border-none transition-all select-none shrink-0"
                          >
                            Nhận
                          </button>
                        ) : claimedQuests.includes("watch_20m") ? (
                          <span className="text-[9px] text-zinc-500 font-bold bg-zinc-800/40 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">ĐÃ NHẬN</span>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-bold bg-zinc-900/30 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">Chưa Đạt</span>
                        )}
                      </div>

                      {/* Quest 5: Xem 60p */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        claimedQuests.includes("watch_60m")
                          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                          : hasWatched60Mins
                            ? "bg-green-500/5 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            : "bg-zinc-900/40 border-white/5"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            claimedQuests.includes("watch_60m")
                              ? "bg-zinc-800 text-zinc-550"
                              : hasWatched60Mins
                                ? "bg-green-500/20 text-green-400 font-bold animate-bounce"
                                : "bg-zinc-850 text-zinc-500"
                          }`}>
                            {claimedQuests.includes("watch_60m") ? <Check size={12} /> : "5"}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block ${claimedQuests.includes("watch_60m") ? "text-zinc-550 line-through" : "text-zinc-200"}`}>
                              Tập Trung (Xem phim 60 phút hôm nay)
                            </span>
                            <span className="text-[10px] text-zinc-550 block">
                              Thưởng: +40 EXP <span className="ml-1 text-cyan-500">({minutesWatchedToday}/60p)</span>
                            </span>
                          </div>
                        </div>
                        {hasWatched60Mins && !claimedQuests.includes("watch_60m") ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest("watch_60m", 40)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] text-black cursor-pointer hover:brightness-110 shadow-[0_0_10px_var(--color-cyan-neon)]/30 border-none transition-all select-none shrink-0"
                          >
                            Nhận
                          </button>
                        ) : claimedQuests.includes("watch_60m") ? (
                          <span className="text-[9px] text-zinc-500 font-bold bg-zinc-800/40 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">ĐÃ NHẬN</span>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-bold bg-zinc-900/30 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">Chưa Đạt</span>
                        )}
                      </div>

                      {/* Quest 6: Xem 120p */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        claimedQuests.includes("watch_120m")
                          ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                          : hasWatched120Mins
                            ? "bg-green-500/5 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            : "bg-zinc-900/40 border-white/5"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            claimedQuests.includes("watch_120m")
                              ? "bg-zinc-800 text-zinc-550"
                              : hasWatched120Mins
                                ? "bg-green-500/20 text-green-400 font-bold animate-bounce"
                                : "bg-zinc-850 text-zinc-500"
                          }`}>
                            {claimedQuests.includes("watch_120m") ? <Check size={12} /> : "6"}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block ${claimedQuests.includes("watch_120m") ? "text-zinc-550 line-through" : "text-zinc-200"}`}>
                              Dân Chơi (Xem phim 120 phút hôm nay)
                            </span>
                            <span className="text-[10px] text-zinc-550 block">
                              Thưởng: +60 EXP <span className="ml-1 text-cyan-500">({minutesWatchedToday}/120p)</span>
                            </span>
                          </div>
                        </div>
                        {hasWatched120Mins && !claimedQuests.includes("watch_120m") ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest("watch_120m", 60)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] text-black cursor-pointer hover:brightness-110 shadow-[0_0_10px_var(--color-cyan-neon)]/30 border-none transition-all select-none shrink-0"
                          >
                            Nhận
                          </button>
                        ) : claimedQuests.includes("watch_120m") ? (
                          <span className="text-[9px] text-zinc-500 font-bold bg-zinc-800/40 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">ĐÃ NHẬN</span>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-bold bg-zinc-900/30 px-1.5 py-0.5 rounded border border-white/5 select-none shrink-0">Chưa Đạt</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges and Achievements */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 backdrop-blur-md">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                      <h3 className="font-bold font-outfit text-lg flex items-center gap-2 m-0 whitespace-nowrap shrink-0">
                        <Award size={18} className="text-[var(--color-cyan-neon)]" />
                        Huy hiệu cày phim
                      </h3>
                      {/* Badge Categories Tabs */}
                      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
                        {[
                          { id: "all", label: "Tất cả" },
                          { id: "watch", label: "Mọt Phim" },
                          { id: "time", label: "Thời Gian" },
                          { id: "playlist", label: "Sưu Tập" },
                          { id: "level", label: "Cấp Độ" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveBadgeCategory(cat.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                              activeBadgeCategory === cat.id
                                ? "bg-[var(--color-cyan-neon)]/10 text-[var(--color-cyan-neon)] border border-[var(--color-cyan-neon)]/30"
                                : "bg-zinc-800/40 text-zinc-400 border border-transparent hover:bg-zinc-800"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto pr-2 pb-4 pt-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {BADGES.filter(badge => {
                        if (activeBadgeCategory === "all") return true;
                        if (activeBadgeCategory === "watch") return badge.id.startsWith("watch_") || badge.id === "night_watch";
                        if (activeBadgeCategory === "time") return badge.id.startsWith("time_");
                        if (activeBadgeCategory === "playlist") return badge.id.startsWith("playlist_") || badge.id.startsWith("bookmark_");
                        if (activeBadgeCategory === "level") return badge.id.startsWith("level_");
                        if (activeBadgeCategory === "other") return badge.id.startsWith("custom_");
                        return true;
                      }).map((badge) => {
                        const isUnlocked = badge.unlocked;
                        const percent = badge.percent || 0;
                        
                        return (
                          <div 
                            key={badge.id} 
                            onClick={() => setSelectedBadge(badge)}
                            className={`group relative flex items-center justify-center aspect-square p-3 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                              isUnlocked 
                                ? "bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 border-[var(--color-cyan-neon)]/40 shadow-[0_5px_15px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,255,255,0.2)]" 
                                : "bg-black/40 border-white/5 opacity-70 hover:opacity-100"
                            }`}
                          >
                            {/* Icon Layer (Visible by default, hidden on hover) */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 group-hover:opacity-0 group-hover:scale-50 ${
                              isUnlocked ? "drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse" : "grayscale opacity-50"
                            }`}>
                              <span className="text-5xl sm:text-6xl">{badge.icon}</span>
                            </div>

                            {/* Info Layer (Hidden by default, visible on hover) */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center opacity-0 scale-110 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 bg-zinc-900/95 backdrop-blur-md">
                              <h4 className={`text-[11px] sm:text-xs font-bold line-clamp-2 leading-tight mb-2 w-full ${
                                isUnlocked ? "text-zinc-100 drop-shadow-[0_0_5px_rgba(0,255,255,0.3)]" : "text-zinc-400"
                              }`}>
                                {badge.name}
                              </h4>
                              
                              <p className="text-[9px] text-zinc-500 leading-tight line-clamp-2 mb-2 hidden sm:block">
                                {badge.desc}
                              </p>
                              
                              {/* Progress / Status at the bottom */}
                              <div className="w-full mt-auto">
                                {!isUnlocked ? (
                                  <>
                                    <div className="text-[9px] text-zinc-500 mb-1 font-bold">{badge.progressText}</div>
                                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-zinc-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-[10px] text-[var(--color-cyan-neon)] font-bold tracking-widest drop-shadow-[0_0_5px_var(--color-cyan-neon)]">
                                    ĐÃ MỞ KHÓA
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Social Leaderboard */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 backdrop-blur-md space-y-4">
                    <h3 className="font-bold font-outfit text-lg mb-2 flex items-center gap-2">
                      <Trophy size={18} className="text-yellow-500" />
                      Bảng xếp hạng cày phim
                    </h3>

                    {loadingLeaderboard ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 size={20} className="animate-spin text-yellow-500" />
                      </div>
                    ) : leaderboard.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {leaderboard.slice(0, 10).map((user, idx) => {
                          const rank = idx + 1;
                          const isCurrentUser = status === "authenticated" && session?.user?.name === user.username;
                          
                          // Determine rank style
                          let rankColor = "text-zinc-500";
                          let rankBadge = "";
                          if (rank === 1) {
                            rankColor = "text-yellow-500 font-extrabold";
                            rankBadge = "🏆 TOP 1";
                          } else if (rank === 2) {
                            rankColor = "text-zinc-350 font-bold";
                            rankBadge = "🥈 TOP 2";
                          } else if (rank === 3) {
                            rankColor = "text-amber-600 font-bold";
                            rankBadge = "🥉 TOP 3";
                          }

                          return (
                            <div 
                              key={user._id || user.username}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                isCurrentUser
                                  ? "bg-zinc-900/40 border-[var(--color-cyan-neon)]/30 shadow-[0_0_15px_var(--color-cyan-neon)]/10"
                                  : "bg-zinc-900/20 border-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`text-sm w-4 text-center shrink-0 ${rankColor}`}>#{rank}</span>
                                <div className={`w-7 h-7 rounded-full overflow-hidden bg-zinc-950 p-[1px] shrink-0 ${
                                  isCurrentUser ? "bg-gradient-to-tr from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)]" : ""
                                }`}>
                                  {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.displayName || user.username} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-[8px] font-bold text-white">
                                      {(user.displayName || user.username || "U").slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className={`text-xs font-bold flex items-center gap-1 truncate ${isCurrentUser ? "text-white" : "text-zinc-300"}`}>
                                    {user.displayName || user.username}
                                    {user.featuredBadge && (
                                      <span className="text-xs shrink-0" title="Huy hiệu đặc trưng">{user.featuredBadge}</span>
                                    )}
                                  </span>
                                  <span className="text-[9px] text-zinc-550 block">
                                    Cấp độ {user.level || 1} • {user.xp || 0} XP
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {rankBadge && (
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${
                                    rank === 1 
                                      ? "text-yellow-500 bg-yellow-500/5 border-yellow-500/10" 
                                      : rank === 2 
                                        ? "text-zinc-400 bg-zinc-400/5 border-zinc-400/10"
                                        : "text-amber-600 bg-amber-600/5 border-amber-600/10"
                                  }`}>
                                    {rankBadge}
                                  </span>
                                )}
                                {isCurrentUser && (
                                  <span className="text-[9px] text-[var(--color-cyan-neon)] bg-[var(--color-cyan-neon)]/10 px-1.5 py-0.5 rounded border border-[var(--color-cyan-neon)]/10 font-bold">
                                    BẠN
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-zinc-500">
                        Chưa có dữ liệu bảng xếp hạng.
                      </div>
                    )}
                  </div>

                  {/* Device Manager */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 backdrop-blur-md">
                    <h3 className="font-bold font-outfit text-lg mb-4 flex items-center gap-2">
                      <Laptop size={18} className="text-[var(--color-cyan-neon)]" />
                      Quản lý thiết bị đăng nhập
                    </h3>
                    <div className="space-y-3">
                      {/* Active device */}
                      <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-[var(--color-cyan-neon)]/20 rounded-xl relative">
                        <div className="flex items-center gap-3 min-w-0">
                          <Laptop size={18} className="text-[var(--color-cyan-neon)]" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block">{deviceInfo.os}</span>
                            <span className="text-[10px] text-zinc-500 block truncate">{deviceInfo.browser}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-[var(--color-cyan-neon)] bg-[var(--color-cyan-neon)]/10 px-1.5 py-0.5 rounded-full border border-[var(--color-cyan-neon)]/10 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[var(--color-cyan-neon)] animate-pulse" />
                          Đang chạy
                        </span>
                      </div>
                      
                      {/* Mocked historic device */}
                      {status === "authenticated" && (
                        <div className="flex items-center justify-between p-3 bg-zinc-900/20 border border-white/5 rounded-xl opacity-60">
                          <div className="flex items-center gap-3 min-w-0">
                            <Laptop size={18} className="text-zinc-500" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-300 block">Android Mobile</span>
                              <span className="text-[10px] text-zinc-600 block truncate">Chrome Mobile - Ho Chi Minh</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-zinc-600">2 giờ trước</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "playlists" && (
            <motion.div
              key="playlists"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {status !== "authenticated" ? (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
                  <div className="w-16 h-16 bg-zinc-850/50 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                    <ListPlus className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Tính năng chỉ dành cho thành viên</h3>
                  <p className="text-zinc-500 text-sm max-w-sm text-center mb-6">
                    Đăng ký tài khoản để tự thiết lập danh sách phát (playlists) phim cá nhân của riêng bạn và chia sẻ cùng bạn bè.
                  </p>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer border-none"
                  >
                    Đăng nhập / Đăng ký
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Create Playlist Form & Playlists Lists */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Create Playlist Form */}
                    <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-2xl backdrop-blur-md">
                      <h3 className="text-lg font-bold font-outfit mb-4 flex items-center gap-2">
                        <ListPlus size={18} className="text-[var(--color-cyan-neon)]" />
                        Tạo danh sách phát mới
                      </h3>
                      <form onSubmit={handleCreatePlaylist} className="space-y-4">
                        {playlistMessage.text && (
                          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                            playlistMessage.type === "success" 
                              ? "bg-green-500/10 border-green-500/20 text-green-400" 
                              : "bg-red-500/10 border-red-500/20 text-red-400"
                          }`}>
                            {playlistMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {playlistMessage.text}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Tên danh sách phát (vd: Xem cuối tuần)..."
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)]"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Mô tả ngắn gọn (không bắt buộc)..."
                            value={newPlaylistDesc}
                            onChange={(e) => setNewPlaylistDesc(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[var(--color-cyan-neon)] focus:ring-1 focus:ring-[var(--color-cyan-neon)]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={playlistLoading}
                          className="px-5 py-2.5 rounded-xl bg-[var(--color-cyan-neon)] hover:bg-[var(--color-cyan-neon)]/90 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer border-none"
                        >
                          {playlistLoading ? <Loader2 size={14} className="animate-spin" /> : "Tạo playlist"}
                        </button>
                      </form>
                    </div>

                    {/* Loaded Playlists items details */}
                    <div className="space-y-4">
                      {loadingPlaylists ? (
                        <div className="py-10 flex justify-center items-center">
                          <div className="w-8 h-8 border-4 border-zinc-800 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
                        </div>
                      ) : playlists.length > 0 ? (
                        playlists.map((playlist) => {
                          const isExpanded = expandedPlaylist === playlist.name;
                          return (
                            <div 
                              key={playlist.name} 
                              className={`border rounded-2xl bg-zinc-900/20 transition-all ${
                                isExpanded 
                                  ? "border-[var(--color-cyan-neon)] bg-zinc-900/30" 
                                  : "border-zinc-800/80 hover:border-zinc-700"
                              }`}
                            >
                              {/* Playlist Header card */}
                              <div 
                                onClick={() => setExpandedPlaylist(isExpanded ? null : playlist.name)}
                                className="p-5 flex items-center justify-between cursor-pointer select-none"
                              >
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-base font-bold text-white font-outfit flex items-center gap-2">
                                    <FolderHeart size={16} className="text-[var(--color-pink-neon)]" />
                                    {playlist.name}
                                  </h4>
                                  {playlist.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{playlist.description}</p>}
                                  <span className="text-[10px] text-zinc-400 block mt-2 font-semibold">
                                    {playlist.movies.length} bộ phim đã thêm
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePlaylist(playlist.name);
                                    }}
                                    className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer border-none bg-transparent"
                                    title="Xóa danh sách phát"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <div className={`w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 transition-transform ${
                                    isExpanded ? "rotate-90 text-white" : ""
                                  }`}>
                                    <ChevronRight size={14} />
                                  </div>
                                </div>
                              </div>

                              {/* Playlist Movies Expanded */}
                              {isExpanded && (
                                <div className="border-t border-zinc-800/60 p-5 bg-black/20 rounded-b-2xl">
                                  {playlist.movies.length === 0 ? (
                                    <p className="text-xs text-zinc-500 text-center py-4">Chưa có phim nào trong danh sách phát này.</p>
                                  ) : !playlist.movieDetails ? (
                                    <div className="flex justify-center items-center py-6">
                                      <div className="w-6 h-6 border-3 border-zinc-800 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      {playlist.movieDetails.map((movie) => (
                                        <div key={movie._id} className="group relative">
                                          <MovieCard movie={movie} href={`/xem-phim/${movie.slug}`} />
                                          <button
                                            onClick={() => handleRemoveFromPlaylist(playlist.name, movie.slug)}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/80 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors opacity-0 group-hover:opacity-100 z-10 cursor-pointer border-none"
                                            title="Xóa khỏi danh sách"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/50 rounded-2xl">
                          <ListPlus size={32} className="mx-auto text-zinc-600 mb-3" />
                          <p className="text-sm text-zinc-500">Chưa có danh sách phát nào. Hãy tạo một cái ở trên!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Playlist Guide */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 backdrop-blur-md h-fit">
                    <h3 className="font-bold font-outfit text-lg mb-3 flex items-center gap-1.5">
                      <Sparkles size={18} className="text-[var(--color-cyan-neon)]" />
                      Hướng dẫn nhanh
                    </h3>
                    <p className="text-zinc-400 text-xs leading-relaxed space-y-2">
                      Bạn có thể tạo các danh sách phát cá nhân của riêng mình để lưu trữ các nhóm phim theo phong cách riêng (Ví dụ: "Xem cùng Gấu", "Anime cày đêm").
                      <br /><br />
                      Để thêm phim vào danh sách phát, chỉ cần đi tới **Trang chi tiết** của bộ phim đó, click vào nút **"Thêm vào danh sách phát"** và chọn danh sách phát tương ứng.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "bookmarks" && (
            <motion.div
              key="bookmarks"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {status !== "authenticated" ? (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
                  <div className="w-16 h-16 bg-zinc-850/50 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Tính năng chỉ dành cho thành viên</h3>
                  <p className="text-zinc-500 text-sm max-w-sm text-center mb-6">
                    Vui lòng đăng nhập hoặc đăng ký tài khoản để sử dụng tính năng lưu phim xem sau và đồng bộ danh sách yêu thích của bạn.
                  </p>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer border-none"
                  >
                    Đăng nhập / Đăng ký
                  </button>
                </div>
              ) : loadingBookmarks ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="w-8 h-8 border-4 border-zinc-800 border-t-[var(--color-pink-neon)] rounded-full animate-spin" />
                </div>
              ) : bookmarks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {bookmarks.map((movie) => (
                    <MovieCard 
                      key={movie._id || movie.slug} 
                      movie={movie} 
                      href={`/xem-phim/${movie.slug}`} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
                  <div className="w-16 h-16 bg-zinc-850/50 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Danh sách phim đã lưu trống</h3>
                  <p className="text-zinc-500 text-sm max-w-sm text-center mb-6">
                    Bạn chưa lưu bộ phim nào. Hãy dạo quanh một vòng và bấm biểu tượng "Lưu phim" để thêm vào đây nhé!
                  </p>
                  <Link
                    href="/"
                    className="px-6 py-2.5 bg-zinc-850 text-zinc-300 hover:text-white rounded-xl transition-all border border-zinc-800 hover:border-zinc-700 font-semibold text-sm"
                  >
                    Dạo trang chủ
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Clear all header bar */}
              {history.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg border border-transparent hover:border-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Xóa toàn bộ lịch sử
                  </button>
                </div>
              )}

              {history.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {history.map((item) => (
                    <div
                      key={item.slug}
                      className="group relative transition-all duration-300 hover:scale-105 hover:z-10"
                    >
                      <Link href={`/xem-phim/${item.slug}`} className="flex flex-col h-full">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-900 shadow-lg border border-white/5 transition-all duration-300 group-hover:shadow-[var(--color-cyan-neon)]/10 group-hover:border-white/10">
                          <Image
                            src={getPosterUrl(item)}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-500 ease-out will-change-transform"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-12 h-12 text-white fill-white" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                            <p className="text-xs font-semibold text-[var(--color-cyan-neon)] mb-1 flex items-center gap-1">
                              <Clock size={12} />
                              {item.episodeName || "Xem tiếp"}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {timeAgo(item.watchedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <h3 className="font-medium text-white text-sm line-clamp-1 group-hover:text-[var(--color-cyan-neon)] transition-colors">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-500">{item.year}</span>
                          </div>
                        </div>
                      </Link>

                      {/* Remove item button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveHistory(item.slug);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                        title="Xóa khỏi lịch sử"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
                  <div className="w-16 h-16 bg-zinc-850/50 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Chưa có lịch sử xem</h3>
                  <p className="text-zinc-500 text-sm max-w-sm text-center mb-6">
                    Khi bạn xem phim, lịch sử xem sẽ tự động được lưu tại đây để bạn tiện xem tiếp bất cứ lúc nào.
                  </p>
                  <Link
                    href="/"
                    className="px-6 py-2.5 bg-zinc-850 text-zinc-300 hover:text-white rounded-xl transition-all border border-zinc-800 hover:border-zinc-700 font-semibold text-sm"
                  >
                    Bắt đầu xem phim
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Badge Details Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedBadge(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl z-10 text-center"
            >
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 text-zinc-450 hover:text-white cursor-pointer bg-transparent border-none"
              >
                <X size={20} />
              </button>
              <div className="text-6xl my-4 animate-bounce">{selectedBadge.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{selectedBadge.name}</h3>
              <p className="text-xs text-zinc-400 mb-4">{selectedBadge.desc}</p>
              
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-left mb-4">
                <span className="text-[10px] text-zinc-500 font-bold block mb-1">TIẾN TRÌNH</span>
                <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
                  <span>{selectedBadge.progressText}</span>
                  <span>{selectedBadge.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] transition-all duration-300" 
                    style={{ width: `${selectedBadge.percent}%` }}
                  />
                </div>
              </div>

              {selectedBadge.unlocked ? (
                <div className="flex flex-col gap-2.5">
                  <div className="py-2 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold inline-flex items-center justify-center gap-1.5">
                    <Check size={16} />
                    Đã mở khóa thành công
                  </div>
                  {status === "authenticated" && (
                    <button
                      type="button"
                      onClick={() => handleShowcaseBadge(selectedBadge.icon)}
                      disabled={showcaseLoading}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        featuredBadge === selectedBadge.icon
                          ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                          : "bg-gradient-to-r from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] text-black border-transparent hover:brightness-110 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                      }`}
                    >
                      {showcaseLoading ? (
                        <Loader2 size={14} className="animate-spin mx-auto" />
                      ) : featuredBadge === selectedBadge.icon ? (
                        "Gỡ khỏi trang cá nhân"
                      ) : (
                        "Trưng bày huy hiệu nổi bật"
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-2 px-4 rounded-xl bg-zinc-800 border border-white/5 text-zinc-400 text-sm font-semibold inline-flex items-center justify-center gap-1.5">
                  <Lock size={14} />
                  Đang bị khóa
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Stack */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto bg-zinc-950/95 border border-[var(--color-cyan-neon)]/40 p-4 rounded-2xl flex items-start gap-3.5 shadow-[0_0_25px_rgba(0,243,255,0.15)] backdrop-blur-md relative overflow-hidden"
            >
              {/* Glowing accent border */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)]" />
              
              <div className="text-3xl shrink-0 select-none animate-bounce">{toast.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white tracking-wide uppercase">{toast.title}</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{toast.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-zinc-500 hover:text-white cursor-pointer bg-transparent border-none shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Level System Info Modal */}
      <AnimatePresence>
        {showLevelInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowLevelInfo(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setShowLevelInfo(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer bg-transparent border-none"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[var(--color-cyan-neon)]/10 text-[var(--color-cyan-neon)] flex items-center justify-center mx-auto mb-3">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Hệ thống Cấp độ & XP</h3>
                <p className="text-xs text-zinc-400 mt-1">Cày phim nhiều hơn để nâng cấp và mở khóa các màu neon độc quyền!</p>
              </div>

              <div className="space-y-4 text-sm text-zinc-300">
                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <h4 className="text-xs font-bold text-[var(--color-cyan-neon)] uppercase tracking-wider mb-2">Cơ chế nhận XP</h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-400">
                    <li>Mỗi tập/phim đã xem trong Lịch sử: <span className="text-white font-semibold">+25 XP</span></li>
                    <li>Nhiệm vụ Cú Đêm hàng ngày: <span className="text-white font-semibold">+50 XP</span></li>
                    <li>Nhiệm vụ Chăm Chỉ (xem phim hôm nay): <span className="text-white font-semibold">+30 XP</span></li>
                    <li>Nhiệm vụ Tương Tác (đổi profile hôm nay): <span className="text-white font-semibold">+20 XP</span></li>
                  </ul>
                </div>

                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <h4 className="text-xs font-bold text-[var(--color-pink-neon)] uppercase tracking-wider mb-2">Phần thưởng Cấp độ</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Mỗi khi tích lũy đủ <span className="text-white font-semibold">100 XP</span>, bạn sẽ lên cấp. Khi đạt các mốc cấp độ cao hơn, bạn sẽ mở khóa được các màu neon phát sáng độc quyền tại mục thiết lập hồ sơ:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00f3ff]" /> Level 1: Xanh Cyan
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff007f]" /> Level 1: Hồng Neon
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#9d00ff]" /> Level 2: Tím Neon
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffff00]" /> Level 2: Vàng Neon
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5e00]" /> Level 3: Cam Sunset
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]" /> Level 4: Lá Matrix
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff003c]" /> Level 5: Đỏ Neon
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0066ff]" /> Level 5: Xanh Dương
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLevelInfo(false)}
                className="w-full mt-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-white/5 cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Auth Modal for Guests */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 pt-24 md:pt-28">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back Button */}
        <div className="mb-8">
          <BackButton fallbackUrl="/" label="Quay lại Trang chủ" />
        </div>
        
        <Suspense fallback={
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
          </div>
        }>
          <ProfileContent />
        </Suspense>
      </div>
    </div>
  );
}
