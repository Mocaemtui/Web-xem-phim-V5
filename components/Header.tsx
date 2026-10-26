"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Menu, X, Filter, Clock, Download, LogOut, User, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Movie } from "@/types/api";
import { getPosterUrl, searchPhim } from "@/lib/api";
import { useSession, signOut } from "next-auth/react";
import AuthModal from "./AuthModal";

export default function Header() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRequestIdRef = useRef(0);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Mocaemtui";
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const { data: session } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Thêm background khi cuộn xuống
      const scrolled = currentScrollY > 20;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));

      // Ẩn header khi cuộn xuống, hiện khi cuộn lên
      const shouldHide = currentScrollY > lastScrollY.current && currentScrollY > 150;
      setHidden((prev) => (prev !== shouldHide ? shouldHide : prev));

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Click outside profile dropdown handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstallability = () => {
      if ((window as any).deferredPrompt) {
        setIsInstallable(true);
      }
    };

    const handleInstallable = () => {
      setIsInstallable(true);
    };

    window.addEventListener("pwa_installable", handleInstallable);
    
    // Check initial state
    checkInstallability();

    // Detect iOS devices (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(isIosDevice);

    return () => {
      window.removeEventListener("pwa_installable", handleInstallable);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosPrompt(true);
      return;
    }

    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;

    // Show prompt
    promptEvent.prompt();

    // Wait for user choice
    const { outcome } = await promptEvent.userChoice;
    console.log(`PWA install user choice outcome: ${outcome}`);

    // Clear prompt event since it can only be used once
    (window as any).deferredPrompt = null;
    setIsInstallable(false);
  };

  const checkIsInternalLink = (keyword: string) => {
    const text = keyword.trim();
    const validPaths = ['/phim/', '/xem-phim/', '/watch-together/'];
    
    try {
      const url = new URL(text);
      if (validPaths.some(p => url.pathname.startsWith(p))) {
        return url.pathname + url.search;
      }
    } catch {
      if (validPaths.some(p => text.startsWith(p))) {
        return text;
      }
    }
    return null;
  };

  useEffect(() => {
    if (searchKeyword.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (checkIsInternalLink(searchKeyword)) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const currentRequestId = ++searchRequestIdRef.current;
      try {
        const data = await searchPhim(searchKeyword, true);
        if (currentRequestId === searchRequestIdRef.current) {
          const items = data?.data?.items || [];
          setSearchResults(items.slice(0, 8));
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (currentRequestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchKeyword]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    if (keyword) {
      const internalPath = checkIsInternalLink(keyword);
      if (internalPath) {
        router.push(internalPath);
      } else {
        router.push(`/tim-kiem/${encodeURIComponent(keyword)}`);
      }
      setSearchOpen(false);
      setSearchKeyword("");
    } else {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  return (
    <header 
      className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow,transform] duration-300 border-b ${
        isScrolled 
          ? "bg-black/80 backdrop-blur-xl border-white/5 shadow-lg py-2" 
          : "bg-gradient-to-b from-black/80 to-transparent border-transparent py-2"
      }`}
      style={{
        transform: hidden ? "translateY(-100%)" : "translateY(0)"
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white transition-transform hover:scale-105">
            <img src="/icon-192x192.png" alt="Mocaemtui Logo" className="w-8 h-8 rounded-full object-cover shadow-glow" />
            <span className="tracking-tight font-outfit text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{siteName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-[var(--color-cyan-neon)] hover:drop-shadow-[0_0_8px_var(--color-cyan-neon)] transition-all">
              Trang chủ
            </Link>
            <Link href="/filter" className="text-sm font-medium text-zinc-300 hover:text-[var(--color-cyan-neon)] hover:drop-shadow-[0_0_8px_var(--color-cyan-neon)] transition-all flex items-center gap-1.5">
              <Filter size={16} />
              Bộ lọc
            </Link>
            {(isInstallable || isIos) && (
              <button
                onClick={handleInstallClick}
                className="text-sm font-medium text-zinc-300 hover:text-[var(--color-cyan-neon)] hover:drop-shadow-[0_0_8px_var(--color-cyan-neon)] transition-all flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
              >
                <Download size={16} />
                Tải App
              </button>
            )}

            {/* User Auth with unified Dropdown */}
            {session ? (
              <div className="relative ml-2 border-l border-white/10 pl-4" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/10 transition-all cursor-pointer text-sm font-medium text-white"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] p-[1px]">
                    {session.user && (session.user as any).avatarUrl ? (
                      <img 
                        src={(session.user as any).avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover bg-zinc-950"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-[10px] font-bold text-white">
                        {session.user?.name ? session.user.name.slice(0, 2).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>
                  <span className="max-w-[100px] truncate">
                    {(session.user as any).displayName || session.user?.name}
                  </span>
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="px-3 py-2 border-b border-white/5 mb-1 text-left">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Tài khoản</span>
                        <span className="text-sm font-bold text-white block truncate">
                          {(session.user as any).displayName || session.user?.name}
                        </span>
                      </div>
                      
                      <Link
                        href="/ca-nhan?tab=account"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-all text-left"
                      >
                        <User size={16} className="text-zinc-500" />
                        Trang cá nhân
                      </Link>
                      <Link
                        href="/ca-nhan?tab=bookmarks"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-all text-left"
                      >
                        <Heart size={16} className="text-zinc-500" />
                        Phim đã lưu
                      </Link>
                      <Link
                        href="/ca-nhan?tab=history"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-all text-left"
                      >
                        <Clock size={16} className="text-zinc-500" />
                        Lịch sử xem
                      </Link>

                      <div className="border-t border-white/5 my-1" />
                      
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/5 transition-all text-left cursor-pointer bg-transparent border-none"
                      >
                        <LogOut size={16} />
                        Đăng xuất
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="ml-2 text-sm font-medium text-zinc-300 hover:text-[var(--color-cyan-neon)] hover:drop-shadow-[0_0_8px_var(--color-cyan-neon)] transition-all flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
              >
                <User size={16} />
                Đăng nhập
              </button>
            )}
          </nav>

          {/* Search & Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white transition-colors rounded-full bg-white/5 hover:bg-white/10 border border-white/5"
              title="Tìm kiếm"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-300 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Search Modal (Spotlight) */}
        {searchOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[8vh] animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setSearchOpen(false)} />
            
            <div className="relative w-full max-w-2xl mx-4 bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200">
              <form onSubmit={handleSearch} className="flex items-center px-4 border-b border-white/5 bg-black/40">
                <Search className="text-[var(--color-cyan-neon)] drop-shadow-[0_0_8px_var(--color-cyan-neon)]" size={24} />
                <input
                  type="text"
                  placeholder="Tìm kiếm phim, diễn viên..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-transparent text-white text-lg md:text-xl placeholder-zinc-500 px-4 py-5 focus:outline-none"
                  autoFocus
                />
                {searchKeyword && (
                  <button type="button" onClick={() => setSearchKeyword("")} className="text-zinc-400 hover:text-white p-2">
                    <X size={20} />
                  </button>
                )}
              </form>

              {/* Live Search Results */}
              <AnimatePresence>
                {searchKeyword.trim().length >= 2 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="max-h-[60vh] overflow-y-auto bg-black/60 backdrop-blur-xl border-b border-white/5"
                  >
                    {isSearching ? (
                      <div className="p-6 flex justify-center items-center">
                        <div className="w-5 h-5 border-2 border-zinc-500 border-t-[var(--color-cyan-neon)] rounded-full animate-spin" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="flex flex-col">
                        {searchResults.map((movie, index) => (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={movie._id}
                          >
                            <Link
                              href={`/phim/${movie.slug}`}
                              onClick={() => setSearchOpen(false)}
                              className="group flex items-center gap-4 p-3 hover:bg-[var(--color-cyan-neon)]/10 transition-colors border-b border-white/5 last:border-0"
                            >
                              <div className="relative w-12 h-16 rounded-md overflow-hidden shrink-0">
                                <img
                                  src={getPosterUrl(movie)}
                                  alt={movie.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-zinc-200 group-hover:text-white group-hover:text-[var(--color-cyan-neon)] font-medium line-clamp-1 transition-colors">
                                  {movie.name}
                                </span>
                                <span className="text-zinc-500 text-xs line-clamp-1">
                                  {movie.origin_name} ({movie.year})
                                </span>
                              </div>
                              {(movie.episode_current || movie.quality) && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/10 text-zinc-300 rounded shrink-0 group-hover:bg-[var(--color-cyan-neon)] group-hover:text-black transition-colors">
                                  {movie.episode_current || movie.quality}
                                </span>
                              )}
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-zinc-500 text-sm">Không tìm thấy kết quả nào cho &quot;{searchKeyword}&quot;</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 bg-zinc-950/50 flex items-center justify-between text-[11px] md:text-xs text-zinc-500">
                <span>Nhấn <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-zinc-300">Enter</kbd> để xem tất cả</span>
                <span className="flex items-center gap-1">Nhấn <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-zinc-300">ESC</kbd> để đóng</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-2">
              <Link href="/" className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors">
                Trang chủ
              </Link>
              <Link href="/filter" className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2">
                <Filter size={18} />
                Bộ lọc
              </Link>
              <Link href="/ca-nhan?tab=history" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2">
                <Clock size={18} />
                Lịch sử xem
              </Link>

              {session ? (
                <div className="flex flex-col gap-1 border-y border-white/5 py-2 my-1 bg-black/20 rounded-xl px-2">
                  <div className="px-2 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--color-cyan-neon)] drop-shadow-[0_0_8px_var(--color-cyan-neon)] font-medium text-sm">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[var(--color-cyan-neon)] to-[var(--color-pink-neon)] p-[1px]">
                        {session.user && (session.user as any).avatarUrl ? (
                          <img 
                            src={(session.user as any).avatarUrl} 
                            alt="Avatar" 
                            className="w-full h-full rounded-full object-cover bg-zinc-950"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-[8px] font-bold text-white">
                            {session.user?.name ? session.user.name.slice(0, 2).toUpperCase() : "U"}
                          </div>
                        )}
                      </div>
                      <span>{(session.user as any).displayName || session.user?.name}</span>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                    >
                      <LogOut size={14} />
                      Đăng xuất
                    </button>
                  </div>
                  
                  <Link
                    href="/ca-nhan?tab=account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <User size={14} />
                    Trang cá nhân
                  </Link>
                  <Link
                    href="/ca-nhan?tab=bookmarks"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Heart size={14} />
                    Phim đã lưu
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2 w-full text-left bg-transparent border-none"
                >
                  <User size={18} />
                  Đăng nhập
                </button>
              )}

              {(isInstallable || isIos) && (
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2 w-full text-left bg-transparent border-none"
                >
                  <Download size={18} />
                  Tải App Mocaemtui
                </button>
              )}
            </div>
          </nav>
        )}
      </div>

      {/* iOS Install Prompt Modal */}
      <AnimatePresence>
        {showIosPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowIosPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowIosPrompt(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <img src="/icon-192x192.png" alt="Logo" className="w-10 h-10 rounded-xl" />
                </div>
                <h3 className="text-lg font-bold text-white">Cài đặt Mocaemtui</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Apple không hỗ trợ cài đặt tự động. Để tải ứng dụng vào màn hình chính, vui lòng làm theo 2 bước:
                </p>
                <div className="flex flex-col gap-3 w-full text-left bg-black/40 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-cyan-neon)]/10 text-[var(--color-cyan-neon)] font-bold">
                      1
                    </div>
                    <p className="text-sm text-zinc-300">Nhấn biểu tượng <b className="text-white">Chia sẻ</b> (Share) ở Safari.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-cyan-neon)]/10 text-[var(--color-cyan-neon)] font-bold">
                      2
                    </div>
                    <p className="text-sm text-zinc-300">Chọn <b className="text-white">Thêm vào MH chính</b> (Add to Home Screen).</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIosPrompt(false)}
                  className="w-full py-3 rounded-xl bg-[var(--color-cyan-neon)] hover:bg-[var(--color-cyan-neon)]/90 transition-colors text-black font-semibold mt-2"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
}
