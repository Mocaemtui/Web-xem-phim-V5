"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  poster: string;
  videoUrl?: string;
  embedUrl?: string;
  onPlaySync?: () => void;
  onPauseSync?: () => void;
  onSeekSync?: (time: number) => void;
  onBuffering?: (isBuffering: boolean) => void;
  externalVideoRef?: React.RefObject<HTMLVideoElement | null>;
  hasNextEpisode?: boolean;
  nextVideoUrl?: string;
  onAutoNext?: () => void;
  isWatchTogether?: boolean;
  onError?: () => void;
  playbackProgressKey?: string;
  isTheaterMode?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  isHost?: boolean;
  onToggleFullscreen?: () => void;
  showControls?: boolean;
}

export default function VideoPlayer({
  poster,
  videoUrl,
  embedUrl,
  onPlaySync,
  onPauseSync,
  onSeekSync,
  onBuffering,
  externalVideoRef,
  hasNextEpisode,
  nextVideoUrl,
  onAutoNext,
  isWatchTogether,
  onError,
  playbackProgressKey,
  isTheaterMode,
  onProgress,
  isHost = true,
  onToggleFullscreen,
  showControls: showControlsProp,
}: VideoPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const hasAutoPlayedOnceRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);


  // Double tap feedback
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    show: boolean;
    type: "left" | "right";
  }>({ show: false, type: "left" });

  // New Features States (Initialized to true, updated on mount to prevent Next.js hydration mismatches)
  const [ambientActive, setAmbientActive] = useState(true);

  const handleAmbientToggle = () => {
    const nextVal = !ambientActive;
    setAmbientActive(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("ambient_active", String(nextVal));
      window.dispatchEvent(new Event("ambient_active_changed"));
    }
  };

  const [showAutoNext, setShowAutoNext] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(5);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const handleAutoPlayNextToggle = () => {
    const nextVal = !autoPlayNext;
    setAutoPlayNext(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("auto_play_next", String(nextVal));
    }
  };
  
  // Progress Save & Resume Watch
  const lastSavedTimeRef = useRef(0);
  const [showIframe, setShowIframe] = useState(false);
  
  // Aspect Ratio Mode (Contain/Cover/Fill)
  const [aspectMode, setAspectMode] = useState<"contain" | "cover" | "fill">("contain");

  const handleAspectModeToggle = () => {
    let nextMode: "contain" | "cover" | "fill" = "contain";
    if (aspectMode === "contain") nextMode = "cover";
    else if (aspectMode === "cover") nextMode = "fill";
    else nextMode = "contain";
    
    setAspectMode(nextMode);
    localStorage.setItem("player_aspect_mode", nextMode);
  };
  
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    
    // Load local storage states on mount to avoid hydration mismatch
    try {
      const savedAmbient = localStorage.getItem("ambient_active");
      if (savedAmbient !== null) {
        setAmbientActive(savedAmbient !== "false");
      }
      const savedAutoNext = localStorage.getItem("auto_play_next");
      if (savedAutoNext !== null) {
        setAutoPlayNext(savedAutoNext !== "false");
      }
      const savedAspect = localStorage.getItem("player_aspect_mode") as "contain" | "cover" | "fill" | null;
      if (savedAspect !== null && ["contain", "cover", "fill"].includes(savedAspect)) {
        setAspectMode(savedAspect);
      }
    } catch {}

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone/i.test(navigator.userAgent));
  }, []);

  const preMuteVolumeRef = useRef(1);

  const applyVolume = (vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    // Web Audio API has been removed to fix scene repetition bugs, clamp volume to 1
    const clampedVol = Math.min(Math.max(vol, 0), 1);
    video.volume = clampedVol;
    setVolume(clampedVol);
  };
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ambient Light Canvas Draw Loop with visibility and viewport checks
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ambientActive || !isPlaying) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    let animationFrameId: number;
    let lastDrawTime = 0;
    let isVisible = true;

    // Use IntersectionObserver to track if canvas is in the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const drawFrame = (now: number) => {
      if (video.paused || video.ended) return;
      
      // Only draw if tab is visible, element is in viewport, and rate cap (15fps) is met
      if ((isVisible || document.fullscreenElement) && !document.hidden && now - lastDrawTime >= 66) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          lastDrawTime = now;
        } catch (err) {
          // Cross-origin streaming might taint the canvas
          console.warn("Ambient Light: Cannot draw frame due to CORS constraints.", err);
        }
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    animationFrameId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [isPlaying, ambientActive, videoRef]);

  // Monitor playback for Auto-Next trigger
  useEffect(() => {
    if (!hasNextEpisode || !onAutoNext) return;

    const remainingTime = duration - currentTime;
    if (autoPlayNext && isPlaying && duration > 0 && remainingTime > 0 && remainingTime <= 5) {
      if (!showAutoNext) {
        setShowAutoNext(true);
        setAutoNextCountdown(Math.ceil(remainingTime));
      }
    } else {
      // Hide if user seeks back or pauses
      if (showAutoNext && (remainingTime > 6 || remainingTime <= 0 || !isPlaying)) {
        setShowAutoNext(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }
  }, [currentTime, duration, isPlaying, hasNextEpisode, onAutoNext, showAutoNext]);

  // Countdown timer for Auto-Next
  useEffect(() => {
    if (showAutoNext) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setAutoNextCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            setShowAutoNext(false);
            if (onAutoNext) onAutoNext();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showAutoNext, onAutoNext]);

  // Load saved playback progress
  useEffect(() => {
    const activeKey = playbackProgressKey || (videoUrl ? `playback_progress_${videoUrl}` : "");
    if (!activeKey || isWatchTogether) return;
    try {
      const saved = localStorage.getItem(activeKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed > 10) {
          const video = videoRef.current;
          if (video) {
            const handleLoaded = () => {
              if (isMountedRef.current) {
                video.currentTime = parsed;
                setCurrentTime(parsed);
                video.play().catch(() => {});
              }
              video.removeEventListener("loadedmetadata", handleLoaded);
            };
            if (video.readyState >= 1) {
              video.currentTime = parsed;
              setCurrentTime(parsed);
              video.play().catch(() => {});
            } else {
              video.addEventListener("loadedmetadata", handleLoaded);
            }
          }
        }
      }
    } catch (e) {}
  }, [videoUrl, videoRef, playbackProgressKey]);

  // Prefetch next episode manifest when 90% through current video
  useEffect(() => {
    if (!nextVideoUrl || duration === 0) return;
    if (currentTime / duration >= 0.9) {
      const linkId = `prefetch-${nextVideoUrl}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "prefetch";
        link.href = nextVideoUrl;
        document.head.appendChild(link);
      }
    }
  }, [currentTime, duration, nextVideoUrl]);

  // Setup HLS / Stream source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let hls: Hls | null = null;
    let playVideo: (() => void) | null = null;

    if (Hls.isSupported() && (videoUrl.includes(".m3u8") || videoUrl.includes("m3u8"))) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isMountedRef.current) {
          if (!isWatchTogether || hasAutoPlayedOnceRef.current) {
            video.play().catch(() => {});
          }
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (hls) hls.startLoad();
              if (onError) onError();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (hls) hls.recoverMediaError();
              break;
            default:
              if (hls) hls.destroy();
              if (onError) onError();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
      // Do not force programmatical autoplay on loadedmetadata in iOS Safari to avoid locking the media element.
      // Let the native controls or user tap initialize the gesture context.
    } else {
      video.src = videoUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoUrl, embedUrl]);

  const [showControlsInternal, setShowControlsInternal] = useState(true);
  const showControls = showControlsProp !== undefined ? showControlsProp : showControlsInternal;

  const resetControlsTimer = () => {
    setShowControlsInternal(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControlsInternal(false);
      }
    }, 5000);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      if (isWatchTogether) {
        hasAutoPlayedOnceRef.current = true;
      }
      resetControlsTimer();
      if (onPlaySync) onPlaySync();
    };

    const onPause = () => {
      setIsPlaying(false);
      setShowControlsInternal(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      // Only sync pause in watch-together mode if it's triggered by user interaction (not auto-pause from buffering, etc.)
      // The actual sync will be handled by the togglePlay function when user clicks pause button
    };

    const onSeeked = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      if (onSeekSync) onSeekSync(time);
    };

    const onWaiting = () => {
      if (onBuffering) onBuffering(true);
    };

    const onPlaying = () => {
      if (onBuffering) onBuffering(false);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [videoRef, onBuffering, onPlaySync, onPauseSync, onSeekSync]);

  const togglePlay = () => {
    if (!isHost) {
      if (onPlaySync) onPlaySync();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
      // Only sync pause when user manually clicks pause button (in watch-together mode)
      if (isWatchTogether && onPauseSync) {
        onPauseSync();
      }
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    setCurrentTime(time);
    setDuration(video.duration || 0);

    // Save progress to localStorage every 5 seconds
    if (Math.abs(time - lastSavedTimeRef.current) >= 5) {
      try {
        const activeKey = playbackProgressKey || (videoUrl ? `playback_progress_${videoUrl}` : "");
        if (activeKey) {
          localStorage.setItem(activeKey, time.toString());
          if (video.duration) {
            const percent = (time / video.duration) * 100;
            localStorage.setItem(activeKey + "_percent", percent.toString());
          }
        }
        if (onProgress) {
          onProgress(time, video.duration || 0);
        }
        lastSavedTimeRef.current = time;
      } catch (e) {
        // Quietly fail if localStorage is full or blocked
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) {
      if (onSeekSync) onSeekSync(parseFloat(e.target.value));
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    applyVolume(vol);
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    
    if (isMobile) {
      // On mobile, request native fullscreen directly on the video element
      if (video.requestFullscreen) {
        video.requestFullscreen().then(() => {
          if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock("landscape").catch(() => {});
          }
        }).catch(() => {});
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      return;
    }

    // Request fullscreen on parent element to keep Ambient Light Canvas visible on desktop
    const container = video.closest(".relative.w-full.h-full.max-h-full.flex.items-center.justify-center.z-10") || video.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock("landscape").catch(() => {});
          }
        }).catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
        if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock("landscape").catch(() => {});
        }
      }
      setIsFullscreen(true);
    } else {
      if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).unlock) {
        try {
          (screen.orientation as any).unlock();
        } catch (e) {}
      }
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Listen to fullscreen changes to sync state and prevent pause on exit/enter
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      const isFullscreen = !!fsElement;
      
      setIsFullscreen(isFullscreen);
      
      // Prevent pause on exiting or entering native fullscreen if it was playing
      const video = videoRef.current;
      if (video && isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    };

    const handleWebkitBeginFullscreen = () => {
      setIsFullscreen(true);
      const video = videoRef.current;
      if (video && isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    };

    const handleWebkitEndFullscreen = () => {
      setIsFullscreen(false);
      const video = videoRef.current;
      if (video && isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    };

    const video = videoRef.current;
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
      video.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
        video.removeEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
      }
    };
  }, [isPlaying, videoRef]);

  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Picture-in-Picture event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (video && typeof document !== "undefined" && document.pictureInPictureEnabled) {
      setIsPiPSupported(true);
      
      const onEnterPiP = () => setIsPiPActive(true);
      const onLeavePiP = () => setIsPiPActive(false);

      video.addEventListener("enterpictureinpicture", onEnterPiP);
      video.addEventListener("leavepictureinpicture", onLeavePiP);

      return () => {
        video.removeEventListener("enterpictureinpicture", onEnterPiP);
        video.removeEventListener("leavepictureinpicture", onLeavePiP);
      };
    }
  }, [videoRef]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("Picture-in-Picture error:", err);
    }
  };

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      // Skip hotkeys if user is focusing an input or editable field (like RoomChat)
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // Tua nhanh theo phím số (0-9 hoặc Numpad 0-9) giống YouTube
      const isNumeric = /^[0-9]$/.test(e.key);
      const isNumpadNumeric = /^Numpad[0-9]$/.test(e.code);
      if (isNumeric || isNumpadNumeric) {
        e.preventDefault();
        if (!isHost) return; // Guests cannot seek
        const num = parseInt(isNumeric ? e.key : e.code.replace("Numpad", ""), 10);
        const percentage = num / 10;
        const targetTime = (video.duration || 0) * percentage;
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
        if (onSeekSync) onSeekSync(targetTime);
        resetControlsTimer();
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          if (!isHost) return; // Guests cannot seek
          const newTimeLeft = Math.max(0, video.currentTime - 10);
          video.currentTime = newTimeLeft;
          setCurrentTime(newTimeLeft);
          if (onSeekSync) onSeekSync(newTimeLeft);
          resetControlsTimer();
          break;
        case "arrowright":
          e.preventDefault();
          if (!isHost) return; // Guests cannot seek
          const newTimeRight = Math.min(video.duration || 0, video.currentTime + 10);
          video.currentTime = newTimeRight;
          setCurrentTime(newTimeRight);
          if (onSeekSync) onSeekSync(newTimeRight);
          resetControlsTimer();
          break;
        case "arrowup":
          e.preventDefault();
          const newVolUp = Math.min(2, volume + 0.1);
          applyVolume(newVolUp);
          resetControlsTimer();
          break;
        case "arrowdown":
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          applyVolume(newVolDown);
          resetControlsTimer();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          if (volume > 0) {
            preMuteVolumeRef.current = volume;
            applyVolume(0);
          } else {
            applyVolume(preMuteVolumeRef.current);
          }
          resetControlsTimer();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoRef, togglePlay, toggleFullscreen, onSeekSync]);

  const handleCancelAutoNext = () => {
    setShowAutoNext(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  return (
    <div 
      className={`relative w-full h-full max-h-full flex items-center justify-center z-10 ${!showControlsInternal && isPlaying ? "cursor-none" : ""}`}
      style={{ cursor: (!showControlsInternal && isPlaying && !isWatchTogether) ? 'none' : 'default' }}
    >

      {/* Ambient Light Canvas (Glow) */}
      {ambientActive && videoUrl && !isMobile && (
        <canvas
          ref={canvasRef}
          width="16"
          height="9"
          className="absolute inset-0 w-full h-full blur-[70px] opacity-80 scale-[1.18] pointer-events-none transition-opacity duration-500 rounded-lg"
          style={{ zIndex: 1 }}
        />
      )}

      {/* Player Container */}
      <div 
        className={`relative w-full h-full max-h-full bg-transparent rounded-lg group flex items-center justify-center ${
          isFullscreen || isWatchTogether ? "overflow-visible" : "overflow-hidden"
        } ${!showControlsInternal && isPlaying ? "cursor-none" : ""}`}
        style={{ zIndex: 2, cursor: (!showControlsInternal && isPlaying && !isWatchTogether) ? 'none' : undefined }}
        onMouseMove={resetControlsTimer}
        onTouchEnd={resetControlsTimer}
        onMouseLeave={() => {
          if (videoRef.current && !videoRef.current.paused) {
            setShowControlsInternal(false);
          }
        }}
      >
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              poster={poster}
              crossOrigin="anonymous"
              controls={isMobile}
              playsInline
              onError={() => {
                if (onError) onError();
              }}
              onClick={(e) => {
                // On mobile, let the native controls handle all play/pause actions.
                // Do not intercept or perform state mutations to avoid Safari user gesture cancellation.
                if (!isMobile) {
                  togglePlay();
                }
              }}
              className={`w-full h-full relative ${(!showControlsInternal && isPlaying && !isWatchTogether) ? 'cursor-none' : 'cursor-pointer'}`}
              style={{
                zIndex: 2,
                objectFit: isFullscreen ? "contain" : aspectMode,
                transform: "scale(1)"
              }}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => {
                 setIsPlaying(true);
              }}
              onPause={() => {
                 setIsPlaying(false);
              }}
              onEnded={() => {
                setIsPlaying(false);
                if (autoPlayNext && hasNextEpisode && onAutoNext && !showAutoNext) {
                  onAutoNext();
                }
              }}
            />
            {doubleTapFeedback.show && doubleTapFeedback.type === "left" && (
              <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-black/30 flex flex-col items-center justify-center pointer-events-none z-30 animate-fade-in rounded-l-lg">
                <div className="bg-zinc-950/70 border border-zinc-800/50 p-3.5 rounded-full flex flex-col items-center justify-center backdrop-blur-md">
                  <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-[10px] font-bold text-white mt-1 uppercase tracking-wider">-10s</span>
                </div>
              </div>
            )}
            {doubleTapFeedback.show && doubleTapFeedback.type === "right" && (
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-black/30 flex flex-col items-center justify-center pointer-events-none z-30 animate-fade-in rounded-r-lg">
                <div className="bg-zinc-950/70 border border-zinc-800/50 p-3.5 rounded-full flex flex-col items-center justify-center backdrop-blur-md">
                  <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[10px] font-bold text-white mt-1 uppercase tracking-wider">+10s</span>
                </div>
              </div>
            )}
          </>
        ) : embedUrl ? (
          !showIframe ? (
            <div 
              onClick={() => setShowIframe(true)}
              className="relative w-full h-full aspect-video bg-zinc-900 rounded-lg cursor-pointer overflow-hidden group/poster flex items-center justify-center"
            >
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster}
                  alt={poster.startsWith("http") ? "Movie Poster" : ""}
                  className="absolute inset-0 w-full h-full object-cover opacity-35 blur-[2px] transition-transform duration-500 group-hover/poster:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-zinc-950" />
              )}
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/40 group-hover/poster:bg-black/50 transition-colors" />
              <div className="relative z-10 w-16 h-16 rounded-full bg-red-650/90 group-hover/poster:bg-red-650 flex items-center justify-center text-white border border-white/20 shadow-2xl transition-all duration-300 group-hover/poster:scale-110 group-active/poster:scale-95">
                <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-zinc-300 bg-zinc-950/70 border border-zinc-850 px-3 py-1.5 rounded-full backdrop-blur-md opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300">
                Click để phát phim
              </span>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allowfullscreen"
            />
          )
        ) : (
          <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center">
            <p className="text-zinc-400">Không tìm thấy link phim</p>
          </div>
        )}

        {/* Auto-Next Countdown overlay */}
        {showAutoNext && (
          <div className="absolute top-4 right-4 bg-zinc-900/95 border border-zinc-800 text-white p-4 rounded-xl shadow-2xl z-30 max-w-[280px] backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
            <p className="text-sm font-medium mb-1">Tập tiếp theo sẽ phát sau</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-red-500">{autoNextCountdown}s</span>
              <button
                onClick={() => {
                  setShowAutoNext(false);
                  if (onAutoNext) onAutoNext();
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Chuyển ngay
              </button>
              <button
                onClick={handleCancelAutoNext}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}



        {/* Custom Controls - only show for video element on desktop */}
        {videoUrl && !isMobile && (
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {/* Progress Bar */}
            <div className={`mb-3 ${!isHost ? "pointer-events-none" : ""}`}>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className={`w-full h-1 bg-zinc-600 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full ${!isHost ? "cursor-not-allowed" : "cursor-pointer"}`}
              />
              <div className="flex justify-between text-xs text-zinc-300 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-zinc-900/60 px-2 py-1 rounded-md border border-zinc-800/40">
                    <svg className="w-4 h-4 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                    <span className="text-[10px] font-bold text-zinc-300 min-w-[28px] text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    style={{
                      background: `linear-gradient(to right, #3b82f6, #10b981, #eab308, #ef4444)`
                    }}
                    title={`Âm lượng: ${Math.round(volume * 100)}%`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                 {/* Auto Play Next Toggle */}
                {hasNextEpisode && (
                  <button
                    onClick={handleAutoPlayNextToggle}
                    className={`transition-colors p-1 rounded-md hover:bg-zinc-800 ${autoPlayNext ? "text-blue-400" : "text-zinc-500"}`}
                    title="Tự động chuyển tập tiếp theo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5M3 12h18" />
                    </svg>
                  </button>
                )}

                {/* Ambient Light Toggle */}
                <button
                  onClick={handleAmbientToggle}
                  className={`hidden md:block transition-colors p-1 rounded-md hover:bg-zinc-800 ${ambientActive ? "text-blue-400" : "text-zinc-500"}`}
                  title="Bật/Tắt hiệu ứng đèn nền (Ambient Light)"
                >

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-3.343" />
                  </svg>
                </button>





                {/* Picture-in-Picture button */}
                {isPiPSupported && (
                  <button
                    onClick={togglePiP}
                    className={`transition-colors p-1 rounded-md hover:bg-zinc-800 ${isPiPActive ? "text-blue-400" : "text-zinc-500"}`}
                    title="Xem trong cửa sổ nổi (Picture-in-Picture)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2h5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v3" />
                    </svg>
                  </button>
                )}

                {/* Fullscreen button */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-zinc-800"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


