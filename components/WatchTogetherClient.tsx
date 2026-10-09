"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { MovieDetail } from "@/types/api";
import { Users, Copy, Check, RefreshCw, Smile, Eye, EyeOff, MessageSquare, LogOut } from "lucide-react";
import EpisodeSelector from "@/components/EpisodeSelector";
import { useWatchTogether } from "@/hooks/useWatchTogether";
import { saveWatchHistory } from "@/lib/watchHistory";
import { getBackdropUrl, getCleanServerName } from "@/lib/api";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });
const RoomChat = dynamic(() => import("@/components/RoomChat"), { ssr: false });
const FloatingReactions = dynamic(() => import("@/components/FloatingReactions"), { ssr: false });

interface WatchTogetherClientProps {
  movie: MovieDetail;
  posterUrl: string;
  roomId: string;
}

export default function WatchTogetherClient({ movie, posterUrl, roomId }: WatchTogetherClientProps) {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "episodes" | "watchers">("chat");
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [chatWidth, setChatWidth] = useState(384);
  const [ambientActive, setAmbientActive] = useState(true);
  const [showWatchers, setShowWatchers] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessageNotification, setNewMessageNotification] = useState<string | null>(null);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    setIsMobileDevice(/Mobi|Android|iPhone/i.test(navigator.userAgent));
  }, []);

  const handleToggleTheaterMode = async () => {
    const nextState = !isTheaterMode;
    setIsTheaterMode(nextState);

    if (isMobileDevice || window.innerWidth < 768) {
      try {
        if (nextState) {
          const el = document.documentElement;
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if ((el as any).webkitRequestFullscreen) {
            await (el as any).webkitRequestFullscreen();
          }
          
          const orientation = screen.orientation as any;
          if (orientation && orientation.lock) {
            await orientation.lock('landscape');
          }
        } else {
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitFullscreenElement) {
            await (document as any).webkitExitFullscreen();
          }
          
          const orientation = screen.orientation as any;
          if (orientation) {
            if (orientation.lock) {
              await orientation.lock('portrait').catch(() => {});
              // Only unlock if they haven't rapidly re-entered theater mode
              if (!isTheaterMode && (!document.fullscreenElement)) {
                if (orientation.unlock) orientation.unlock();
              }
            } else if (orientation.unlock) {
              orientation.unlock();
            }
          }
        }
      } catch (error) {
        console.warn("Fullscreen/Orientation API not supported or failed:", error);
      }
    }
  };

  const lastSyncTimeRef = useRef<number>(0);
  const lastSyncTimestampRef = useRef<number>(0);
  const lastSyncPlayingRef = useRef<boolean>(false);
  const isOutOfSyncRef = useRef(false);
  const [isOutOfSync, setIsOutOfSync] = useState<boolean>(false);

  // Cooldown and sync loop prevention
  const lastSyncAttemptRef = useRef<number>(0);
  const syncFailureCountRef = useRef<number>(0);
  const syncFailureWindowRef = useRef<number>(0);

  useEffect(() => {
    isOutOfSyncRef.current = isOutOfSync;
  }, [isOutOfSync]);

  const handleLocalStateSync = (time: number, playing: boolean) => {
    lastSyncTimeRef.current = time;
    lastSyncTimestampRef.current = Date.now();
    lastSyncPlayingRef.current = playing;
  };

  // Auto-hide UI Controls and Mouse Cursor in Theater Mode on inactivity
  const [showInactivityControls, setShowInactivityControls] = useState(true);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTheaterModeRef = useRef(isTheaterMode);
  useEffect(() => {
    isTheaterModeRef.current = isTheaterMode;
  }, [isTheaterMode]);

  const resetInactivityTimer = useCallback(() => {
    setShowInactivityControls(true);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (isTheaterModeRef.current) {
      inactivityTimeoutRef.current = setTimeout(() => {
        setShowInactivityControls(false);
      }, 5000);
    }
  }, []);

  // Reset timer when theater mode or chat visibility is toggled
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };
  }, [isTheaterMode, isChatHidden, resetInactivityTimer]);

  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };
    window.addEventListener("mousemove", handleActivity, { capture: true });
    window.addEventListener("touchstart", handleActivity, { capture: true });
    window.addEventListener("keydown", handleActivity, { capture: true });
    return () => {
      window.removeEventListener("mousemove", handleActivity, { capture: true });
      window.removeEventListener("touchstart", handleActivity, { capture: true });
      window.removeEventListener("keydown", handleActivity, { capture: true });
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };
  }, [resetInactivityTimer]);

  // Sound Notification settings
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat_sound_enabled");
      return saved !== "false";
    }
    return true;
  });

  const handleSoundToggle = () => {
    setIsSoundEnabled(prev => {
      const nextVal = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("chat_sound_enabled", String(nextVal));
      }
      return nextVal;
    });
  };

  // Host Sync states
  const [showHostSyncPrompt, setShowHostSyncPrompt] = useState(false);
  const [hostSavedTime, setHostSavedTime] = useState<number | null>(null);

  const episodes = movie.episodes || [];
  const currentServer = episodes[currentServerIndex];
  const serverData = currentServer?.server_data || [];
  const currentEpisode = serverData[currentEpisodeIndex];
  const EMOJIS = ['❤️', '✨', '💦', '😇', '😢', '🤨', '😏', '🤡', '😈', '💀'];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ambient_active");
      setAmbientActive(saved !== "false");
    }

    const handleAmbientChanged = () => {
      const saved = localStorage.getItem("ambient_active");
      setAmbientActive(saved !== "false");
    };

    window.addEventListener("ambient_active_changed", handleAmbientChanged);
    return () => window.removeEventListener("ambient_active_changed", handleAmbientChanged);
  }, []);

  useEffect(() => {
    const handleToggleChat = () => {
      if (!isTheaterMode) return;
      setIsChatHidden(prev => {
        const nextState = !prev;
        if (!nextState) {
          setTimeout(() => {
            const inputEl = document.getElementById("chat-input-field");
            if (inputEl) inputEl.focus();
          }, 100);
        }
        return nextState;
      });
    };
    window.addEventListener("toggle-chat-visibility", handleToggleChat);
    return () => window.removeEventListener("toggle-chat-visibility", handleToggleChat);
  }, [isTheaterMode]);

  useEffect(() => {
    if (!isTheaterMode) {
      setIsChatHidden(false);
    }
  }, [isTheaterMode]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const isReceivingEvent = useRef<boolean>(false);
  const isResizing = useRef(false);
  const hasSynced = useRef(false);
  const currentServerIndexRef = useRef(currentServerIndex);
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 240 && newWidth < window.innerWidth * 0.6) {
      setChatWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Sync ambient light canvas
  useEffect(() => {
    if (isMobileDevice) return; // Disable canvas draw loop on mobile to prevent performance lag

    let animationFrameId: number;
    let lastDrawTime = 0;
    let cachedCtx: CanvasRenderingContext2D | null = null;

    const drawFrame = (now: number) => {
      const video = videoRef.current;
      const canvas1 = ambientCanvasRef.current;

      if (video && canvas1 && isJoined) {
        if (!cachedCtx) {
          cachedCtx = canvas1.getContext("2d", { willReadFrequently: false });
        }

        if (cachedCtx && !video.paused && !video.ended && now - lastDrawTime >= 66) {
          try {
            cachedCtx.drawImage(video, 0, 0, canvas1.width, canvas1.height);
            lastDrawTime = now;
          } catch (err) {
            // Ignore CORS
          }
        }
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    animationFrameId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isJoined, ambientActive, isMobileDevice]);




  useEffect(() => {
    if (isMobileDevice) return; // Do not use custom container fullscreen on mobile to avoid layout freezing and portrait zoom issues
    
    if (isTheaterMode) {
      if (containerRef.current && !document.fullscreenElement && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().then(() => {
          if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock("landscape").catch(() => {});
          }
        }).catch(() => {});
      } else {
        // Fallback if requestFullscreen is not available or already in fullscreen
        if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock("landscape").catch(() => {});
        }
      }
    } else {
      if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).unlock) {
        try {
          (screen.orientation as any).unlock();
        } catch (e) {}
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isTheaterMode, isMobileDevice]);

  useEffect(() => {
    currentServerIndexRef.current = currentServerIndex;
    currentEpisodeIndexRef.current = currentEpisodeIndex;
    // Đồng bộ lại index khi thay đổi để tránh lệch tập nếu user nhấn nút load tập mới
  }, [currentServerIndex, currentEpisodeIndex]);

  const pendingSyncTimeRef = useRef<number | null>(null);
  const pendingSyncPlayingRef = useRef<boolean | null>(null);
  const isLocalEpisodeChangeRef = useRef<boolean>(false);

  const [isHost, setIsHost] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem('host_' + roomId) === 'true';
    }
    return false;
  });
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);
  
  const {
    watchers,
    messages,
    reactions,
    typingUsers,
    triggerPlay,
    triggerPause,
    triggerSeek,
    triggerRequestSync,
    triggerSyncResponse,
    triggerChangeEpisode,
    triggerReaction,
    triggerTyping,
    triggerSystemAction,
    sendMessage: sendMessageHook,
    onPlayRef,
    onPauseRef,
    onSeekRef,
    onRequestSyncRef,
    onSyncResponseRef,
    onChangeEpisodeRef,
    myId,
    triggerChangeHost,
    onChangeHostRef,
    triggerTimeSync,
    onHostTimeSyncRef,
  } = useWatchTogether(isJoined ? roomId : "", username, typeof window !== "undefined" && sessionStorage.getItem('host_' + roomId) === 'true');

  const sendMessage = (text: string) => {
    const currentTime = videoRef.current?.currentTime || 0;
    sendMessageHook(text, currentTime);
  };

  const watchersRef = useRef(watchers);
  useEffect(() => {
    watchersRef.current = watchers;
  }, [watchers]);

  // Restart inactivity timer when a new message arrives in RoomChat so it becomes visible
  useEffect(() => {
    if (messages.length > 0) {
      resetInactivityTimer();
    }
  }, [messages.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (pendingSyncTimeRef.current !== null) {
        isReceivingEvent.current = true;
        video.currentTime = pendingSyncTimeRef.current;
        if (pendingSyncPlayingRef.current) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        pendingSyncTimeRef.current = null;
        pendingSyncPlayingRef.current = null;
        hasSynced.current = true;
        setTimeout(() => { isReceivingEvent.current = false; }, 500);
      } else {
        if (isLocalEpisodeChangeRef.current || isHostRef.current || watchersRef.current.length <= 1) {
          hasSynced.current = true;
          isLocalEpisodeChangeRef.current = false;
        } else {
          // Guest loaded the new episode remotely, request sync from host
          triggerRequestSync();
        }
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoRef, roomId]);

  useEffect(() => {
    if (!isJoined) return;
    
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      if (watchers.length <= 1) {
        setIsOutOfSync(false);
        return;
      }

      if (lastSyncTimestampRef.current === 0) {
        setIsOutOfSync(false);
        return;
      }

      let estimatedHostTime = lastSyncTimeRef.current;
      if (lastSyncPlayingRef.current) {
        estimatedHostTime += (Date.now() - lastSyncTimestampRef.current) / 1000;
      }

      const timeDiff = Math.abs(video.currentTime - estimatedHostTime);
      const isPlayStateMismatch = video.paused !== lastSyncPlayingRef.current;

      if (timeDiff > 3 || (isPlayStateMismatch && timeDiff > 1.5)) {
        setIsOutOfSync(true);
      } else {
        setIsOutOfSync(false);
      }

      // Broadcast current time to other watchers every 2 seconds
      if (video.readyState >= 1) {
        triggerTimeSync(video.currentTime, !video.paused);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isJoined, watchers.length, triggerTimeSync]);

  // Auto-sync when out of sync is detected
  useEffect(() => {
    if (isOutOfSync && !isHost && isJoined && watchers.length > 1) {
      // Check cooldown (5s after last sync attempt)
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < 5000) {
        return;
      }

      // Check sync loop prevention (max 3 failures in 30s)
      if (syncFailureCountRef.current >= 3 && now - syncFailureWindowRef.current < 30000) {
        return; // Too many failures, wait for manual sync
      }

      // Reset failure window if it's been more than 30s
      if (now - syncFailureWindowRef.current > 30000) {
        syncFailureCountRef.current = 0;
        syncFailureWindowRef.current = now;
      }

      // Debounce to avoid excessive sync requests (increased to 2.5s)
      const syncTimeout = setTimeout(() => {
        if (isOutOfSyncRef.current) {
          lastSyncAttemptRef.current = Date.now();
          syncFailureCountRef.current++;
          syncFailureWindowRef.current = Date.now();
          triggerRequestSync();
        }
      }, 2500);

      return () => clearTimeout(syncTimeout);
    }
  }, [isOutOfSync, isHost, isJoined, watchers.length, triggerRequestSync]);

  const lastMessageCountRef = useRef(0);
  const lastBufferTimeRef = useRef(0);

  // Online/Offline tracking
  useEffect(() => {
    if (!isJoined) return;
    const handleOffline = () => {
      triggerSystemAction(`${username} đã bị mất kết nối mạng.`);
    };
    const handleOnline = () => {
      triggerSystemAction(`${username} đã kết nối mạng trở lại.`);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [username, isJoined, triggerSystemAction]);

  const handleBuffering = (isBuffering: boolean) => {
    // Buffering system message removed
  };

  useEffect(() => {
    lastMessageCountRef.current = messages.length;
  }, []);

  useEffect(() => {
    if (!isChatHidden) {
      setUnreadCount(0);
      setNewMessageNotification(null);
    }
  }, [isChatHidden]);

  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.isSystem) {
        // Play gentle notification sound when chat is hidden and sound is enabled
        if (isChatHidden && isSoundEnabled) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note (ting)
            
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
          } catch (e) {
            // Fallback if audio context is blocked
          }
        }
        // Tự động mở khung chat khi có tin nhắn mới
        setIsChatHidden(false);
      }
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, isChatHidden, isSoundEnabled]);

  // Bind remote events to local video player
  useEffect(() => {
    onPlayRef.current = (time) => {
      if (videoRef.current && videoRef.current.readyState >= 1) {
        isReceivingEvent.current = true;
        if (Math.abs(videoRef.current.currentTime - time) > 1) {
          videoRef.current.currentTime = time;
        }
        videoRef.current.play().catch(() => {});
        lastSyncTimeRef.current = time;
        lastSyncTimestampRef.current = Date.now();
        lastSyncPlayingRef.current = true;
        setIsOutOfSync(false); // Clear out of sync warning
        setTimeout(() => { isReceivingEvent.current = false; }, 500);
      } else {
        pendingSyncTimeRef.current = time;
        pendingSyncPlayingRef.current = true;
      }
    };

    onPauseRef.current = () => {
      if (videoRef.current && videoRef.current.readyState >= 1) {
        isReceivingEvent.current = true;
        videoRef.current.pause();
        lastSyncTimeRef.current = videoRef.current.currentTime;
        lastSyncTimestampRef.current = Date.now();
        lastSyncPlayingRef.current = false;
        setIsOutOfSync(false); // Clear out of sync warning
        setTimeout(() => { isReceivingEvent.current = false; }, 500);
      } else {
        pendingSyncPlayingRef.current = false;
      }
    };

    onSeekRef.current = (time) => {
      if (videoRef.current && videoRef.current.readyState >= 1) {
        isReceivingEvent.current = true;
        videoRef.current.currentTime = time;
        lastSyncTimeRef.current = time;
        lastSyncTimestampRef.current = Date.now();
        lastSyncPlayingRef.current = !videoRef.current.paused; // Update playing state
        setIsOutOfSync(false); // Clear out of sync warning
        setTimeout(() => { isReceivingEvent.current = false; }, 500);
      } else {
        pendingSyncTimeRef.current = time;
      }
    };

    // Khi ai đó xin đồng bộ, mình trả lời bằng thời gian hiện tại và tập phim hiện tại của mình
    onRequestSyncRef.current = () => {
      // LƯU Ý QUAN TRỌNG: Nếu mình đang bị lệch hình (mới vào, hoặc bị lỗi iOS block play), mình TUYỆT ĐỐI KHÔNG trả lời!
      // Nếu mình trả lời với time = 0, người mới vào sẽ bị tua về 0!
      if (isOutOfSyncRef.current) return;

      const isHost = typeof window !== "undefined" && sessionStorage.getItem('host_' + roomId) === 'true';
      if (!hasSynced.current && !isHost) return;

      if (videoRef.current) {
        triggerSyncResponse(
          videoRef.current.currentTime,
          !videoRef.current.paused,
          currentServerIndexRef.current,
          currentEpisodeIndexRef.current,
          myId
        );
      } else {
        // Nếu video chưa load xong, gửi thông tin tập phim hiện tại để người mới load tập đó trước
        triggerSyncResponse(
          0,
          false,
          currentServerIndexRef.current,
          currentEpisodeIndexRef.current,
          myId
        );
      }
    };

    // Khi nhận được phản hồi đồng bộ từ người khác
    onSyncResponseRef.current = (data) => {
      // Update sync tracking refs immediately
      lastSyncTimeRef.current = data.time;
      lastSyncTimestampRef.current = Date.now();
      lastSyncPlayingRef.current = data.isPlaying;

      const isEpisodeDifferent = data.serverIndex !== currentServerIndexRef.current || data.episodeIndex !== currentEpisodeIndexRef.current;

      if (data.serverIndex !== undefined && data.episodeIndex !== undefined) {
        setCurrentServerIndex(data.serverIndex);
        setSelectedServerIndex(data.serverIndex);
        setCurrentEpisodeIndex(data.episodeIndex);
      }

      if (isEpisodeDifferent) {
        // Store the target time/state to apply once the new episode manifest is loaded
        pendingSyncTimeRef.current = data.time;
        pendingSyncPlayingRef.current = data.isPlaying;
        hasSynced.current = false; // Will sync after episode loads
      } else {
        // Same episode, sync immediately
        if (videoRef.current && videoRef.current.readyState >= 1) {
          isReceivingEvent.current = true;
          videoRef.current.currentTime = data.time;
          if (data.isPlaying) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
          hasSynced.current = true; // Sync completed!
          setIsOutOfSync(false); // Clear out of sync warning
          // Reset failure count on successful sync
          syncFailureCountRef.current = 0;
          setTimeout(() => { isReceivingEvent.current = false; }, 500);
        } else {
          pendingSyncTimeRef.current = data.time;
          pendingSyncPlayingRef.current = data.isPlaying;
        }
      }
    };

    onChangeEpisodeRef.current = (serverIndex, episodeIndex) => {
      isLocalEpisodeChangeRef.current = false;
      hasSynced.current = false;
      // Reset sync tracking refs to avoid false out-of-sync detection during episode change
      lastSyncTimeRef.current = 0;
      lastSyncTimestampRef.current = 0;
      lastSyncPlayingRef.current = false;
      setIsOutOfSync(false);
      setCurrentServerIndex(serverIndex);
      setSelectedServerIndex(serverIndex);
      setCurrentEpisodeIndex(episodeIndex);
    };

    onChangeHostRef.current = (newHostId) => {
      const isMeNewHost = newHostId === myId;
      if (isMeNewHost) {
        sessionStorage.setItem('host_' + roomId, 'true');
        setIsHost(true);
        hasSynced.current = true;
      } else {
        sessionStorage.removeItem('host_' + roomId);
        setIsHost(false);
        // Reset sync tracking refs when no longer host to sync with new host
        lastSyncTimeRef.current = 0;
        lastSyncTimestampRef.current = 0;
        lastSyncPlayingRef.current = false;
        hasSynced.current = false;
        setIsOutOfSync(false);
      }
    };

    // Update sync tracking refs when receiving time-sync from host
    onHostTimeSyncRef.current = (time, isPlaying) => {
      if (!isHost) {
        lastSyncTimeRef.current = time;
        lastSyncTimestampRef.current = Date.now();
        lastSyncPlayingRef.current = isPlaying;
      }
    };
  }, [onPlayRef, onPauseRef, onSeekRef, onRequestSyncRef, onSyncResponseRef, onChangeEpisodeRef, roomId, myId, isHost]);

  // Sync state for single watchers (hosts)
  useEffect(() => {
    if (watchers.length === 1 && isJoined) {
      hasSynced.current = true;
    }
  }, [watchers, isJoined]);

  // Khi vừa vào phòng, tự động xin đồng bộ với những người đang xem (nếu có)
  useEffect(() => {
    if (isJoined) {
      hasSynced.current = false;
      isLocalEpisodeChangeRef.current = false;
      // Gửi nhiều lượt xin đồng bộ để đảm bảo thiết bị di động nhận đúng tập đang phát và thời gian phát từ Host
      const t1 = setTimeout(() => { triggerRequestSync(); }, 500);
      const t2 = setTimeout(() => { triggerRequestSync(); }, 1500);
      const t3 = setTimeout(() => { triggerRequestSync(); }, 3500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isJoined]);

  // Lưu lịch sử xem phim khi tập phim hoặc server thay đổi trong phòng xem chung
  useEffect(() => {
    if (isJoined && currentEpisode && currentServer) {
      saveWatchHistory(
        movie,
        currentEpisode.name || `Tập ${currentEpisodeIndex + 1}`,
        currentServer.server_name,
        currentServerIndex,
        currentEpisodeIndex
      );
    }
  }, [movie, currentEpisode, currentServer, currentServerIndex, currentEpisodeIndex, isJoined]);

  const promptedEpisodeRef = useRef("");
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isJoined && currentEpisode && promptedEpisodeRef.current !== currentEpisode.link_m3u8) {
      const isHost = typeof window !== "undefined" && sessionStorage.getItem('host_' + roomId) === 'true';
      if (isHost) {
        promptedEpisodeRef.current = currentEpisode.link_m3u8;
        const key = `playback_progress_${movie.slug}_ep_${currentEpisodeIndex}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = parseFloat(saved);
          if (parsed > 10) {
            if (videoRef.current) {
              videoRef.current.currentTime = parsed;
            }
            setTimeout(() => {
              triggerSeek(parsed);
            }, 1500);
          }
        }
      }
    }
  }, [isJoined, currentEpisode, roomId]);

  const handleHostSyncConfirm = () => {
    if (hostSavedTime) {
      if (videoRef.current) {
        videoRef.current.currentTime = hostSavedTime;
      }
      triggerSeek(hostSavedTime);
    }
    setShowHostSyncPrompt(false);
  };


  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsJoined(true);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncClick = () => {
    // Xin đồng bộ thời gian từ bất kỳ ai trong phòng
    hasSynced.current = false;
    triggerRequestSync();
  };



  if (!isJoined) {
    return (
      <div className="fixed inset-0 h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden z-50">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Phòng Xem Chung</h1>
          <p className="text-zinc-400 text-sm text-center mb-6">Phim: {movie.name}</p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Biệt danh của bạn</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên để mọi người nhận ra bạn..."
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Vào Phòng
            </button>

            <a
              href={`/phim/${movie.slug}`}
              className="w-full inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-medium py-3 rounded-lg transition-colors active:scale-95 text-sm"
            >
              Thoát
            </a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative min-h-screen bg-zinc-950 flex flex-col md:overflow-y-auto overflow-hidden scroll-smooth ${isTheaterMode && !showInactivityControls ? "hide-cursor" : ""}`} 
      style={isTheaterMode ? { cursor: showInactivityControls ? 'default' : 'none' } : undefined}
    >
      {/* Global Background Ambient Glow Canvas */}
      {ambientActive && (
        <canvas
          ref={ambientCanvasRef}
          width="16"
          height="9"
          className="absolute inset-0 w-full h-full blur-[80px] opacity-75 pointer-events-none transition-all duration-700"
          style={{ zIndex: 0 }}
        />
      )}


      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          header, footer { display: none !important; }
        }
        ${isTheaterMode ? "header { display: none !important; }" : ""}
      `}} />

      
      {/* Esc key & native fullscreen change listener */}
      <KeyboardAndTheaterHandler setIsTheaterMode={setIsTheaterMode} setIsChatHidden={setIsChatHidden} containerRef={containerRef} isTheaterMode={isTheaterMode} />


      {/* Room Header: Show when not in theater mode */}
      {!isTheaterMode && (
        <div className="hidden md:flex w-full max-w-[1600px] mx-auto px-6 pt-6 pb-4 items-center justify-between gap-4 border-b border-zinc-800/40 relative z-20">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              Xem Chung: {movie.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Đang phát: <span className="text-red-500 font-semibold">{getCleanServerName(currentServer?.server_name)}</span>
              <span className="mx-2 text-zinc-700">|</span>
              Tập: <span className="text-red-500 font-semibold">{currentEpisode?.name.toLowerCase().includes("tập") ? currentEpisode.name : `Tập ${currentEpisodeIndex + 1}`}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Link */}
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800/80 text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-red-500" />}
              <span>{copied ? "Đã copy link" : "Mời bạn bè"}</span>
            </button>

            {/* Zoom / Theater Mode Button */}
            <button
              onClick={handleToggleTheaterMode}
              className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800/80 text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
              title="Bật/Tắt chế độ phóng to rạp chiếu (Enter)"
            >
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              </svg>
              <span>Phóng to (Enter)</span>
            </button>

            {/* Exit Room Button */}
            <a
              href={`/phim/${movie.slug}`}
              className="flex items-center gap-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 hover:text-red-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát phòng</span>
            </a>
          </div>
        </div>
      )}


      {/* Main workspace: Side-by-side Player and Chat Sidebar */}
      <div className={`w-full flex flex-col md:flex-row shrink-0 md:shrink relative ${
        isTheaterMode 
          ? "h-full flex-1 overflow-visible" 
          : "max-w-[1600px] mx-auto md:px-6 md:py-6 gap-0 md:gap-6 items-stretch min-h-0 flex-1 overflow-hidden"
      }`}>
        {/* Left Area: Video Player & Controls */}
        <div 
          className={`flex flex-col group/theater relative z-10 ${
            isTheaterMode 
              ? "h-full w-full p-0 bg-transparent overflow-visible justify-center items-center flex-1" 
              : "flex-1 min-w-0 mr-0 md:mr-[var(--chat-margin)]"
          }`}
          onDoubleClick={handleToggleTheaterMode}
          style={isTheaterMode ? {} : { 
            "--chat-margin": isChatHidden ? "0px" : `${chatWidth + 24}px` 
          } as React.CSSProperties}
        >


        {/* Video Player */}
        <div className={`w-full shrink-0 ${
          isTheaterMode 
            ? "h-full max-h-screen flex items-center justify-end p-0 z-40 fixed inset-0 bg-black" 
            : "relative w-full aspect-video rounded-none md:rounded-2xl overflow-hidden border-b md:border border-zinc-850 shadow-2xl bg-zinc-950 z-30"
        }`}>

          {/* Floating Horizontal Controller at Top-Right (Only shows when chat is hidden in theater mode) */}
          {isChatHidden && isTheaterMode && (
            <div className={`absolute top-1/2 -translate-y-1/2 right-2 md:top-4 md:translate-y-0 md:right-4 z-50 flex flex-col md:flex-row items-center gap-2 md:gap-3 bg-zinc-950/90 border border-zinc-800/60 p-2 md:p-2.5 rounded-xl backdrop-blur-md transition-opacity duration-300 shadow-xl ${showInactivityControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} animate-in fade-in`}>

              {/* Watchers Popover */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isHost) {
                      handleSyncClick();
                    }
                    setShowWatchers(prev => !prev);
                    setShowEmojis(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer border ${
                    isOutOfSync
                      ? "bg-red-950/20 border-red-500/50 text-red-400 hover:bg-red-900/35 animate-pulse"
                      : "bg-emerald-950/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/35"
                  }`}
                  title={isOutOfSync ? "Bị lệch hình! Click để đồng bộ lại" : "Kết nối ổn định"}
                >
                  <Users className={`w-3.5 h-3.5 ${isOutOfSync ? "text-red-500 animate-bounce" : "text-emerald-400"}`} />
                  <span>{watchers.length}</span>
                </button>

                {showWatchers && (
                  <div className="absolute right-full md:right-0 top-0 md:top-10 mr-3 md:mr-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/40 p-3 rounded-lg shadow-2xl z-50 min-w-[200px] max-w-[280px]">
                    <h4 className="text-[11px] font-semibold text-zinc-400 mb-2 border-b border-zinc-900 pb-1">Người xem ({watchers.length})</h4>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {watchers.map((w) => (
                        <div key={w.id} className="flex items-center justify-between gap-2 text-xs text-zinc-300 py-1">
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">
                              {w.name} {w.isHost && <span className="text-amber-400 font-bold ml-1" title="Host">👑</span>}
                            </span>
                            {w.currentTime !== undefined && (
                              <span className="text-[10px] text-zinc-500">
                                {formatTime(w.currentTime)} {w.isPlaying ? '▶️' : '⏸️'}
                              </span>
                            )}
                          </div>
                          {isHost && !w.isHost && (
                            <button
                              onClick={() => {
                                if (confirm(`Bạn muốn chuyển quyền Host cho ${w.name}?`)) {
                                  triggerChangeHost(w.id, w.name);
                                }
                              }}
                              className="text-[9px] bg-zinc-800 hover:bg-amber-600 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Làm Host
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Emojis Popover */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowEmojis(prev => !prev);
                    setShowWatchers(false);
                  }}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg text-xs transition-all cursor-pointer border ${showEmojis ? "bg-zinc-800/80 border-zinc-700 text-red-500" : "bg-zinc-900/30 border-zinc-900/20 text-zinc-400 hover:text-zinc-200"}`}
                >
                  <Smile className="w-4 h-4" />
                </button>

                {showEmojis && (
                  <div className="absolute right-full md:right-0 top-0 md:top-10 mr-3 md:mr-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/40 p-2 rounded-lg shadow-2xl z-50 min-w-[200px]">
                    <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            triggerReaction(emoji);
                          }}
                          className="text-lg hover:scale-125 active:scale-95 transition-transform duration-100 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theater/Zoom Toggle Button in Overlay */}
              <button
                onClick={handleToggleTheaterMode}
                className={`flex items-center justify-center w-10 h-10 rounded-lg text-xs transition-all cursor-pointer border ${isTheaterMode ? "bg-zinc-800/80 border-zinc-700 text-red-500" : "bg-zinc-900/30 border-zinc-900/20 text-zinc-400 hover:text-zinc-200"}`}
                title="Bật/Tắt chế độ phóng to rạp chiếu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {isTheaterMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6m-6 12v4.5M15 15h4.5M15 15l6 6m-6-6v4.5M9 15H4.5M9 15l-6 6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                  )}
                </svg>
              </button>
            </div>
          )}

          {currentEpisode ? (
            <>
              <FloatingReactions reactions={reactions} />

              <VideoPlayer
                externalVideoRef={videoRef}
                poster={getBackdropUrl(movie)}
                videoUrl={currentEpisode.link_m3u8}
                playbackProgressKey={`playback_progress_${movie.slug}_ep_${currentEpisodeIndex}`}
                nextVideoUrl={serverData[currentEpisodeIndex + 1]?.link_m3u8}
                isWatchTogether={true}
                isHost={isHost}
                showControls={isTheaterMode ? showInactivityControls : undefined}
                onPlaySync={() => {
                  if (isReceivingEvent.current) return;
                  // Guests should not trigger sync on play/pause clicks - only sync when out of sync is detected
                  if (!isHost) {
                    return;
                  }
                  if (isOutOfSync) {
                    videoRef.current?.play().catch(() => {});
                    handleSyncClick();
                    return;
                  }
                  if (hasSynced.current && !isReceivingEvent.current && videoRef.current) {
                    triggerPlay(videoRef.current.currentTime);
                    handleLocalStateSync(videoRef.current.currentTime, true);
                  }
                }}
                onPauseSync={() => {
                  if (isReceivingEvent.current) return;
                  // Guests should not trigger sync on play/pause clicks - only sync when out of sync is detected
                  if (!isHost) {
                    return;
                  }
                  if (isOutOfSync) {
                    handleSyncClick();
                    return;
                  }
                  if (hasSynced.current && !isReceivingEvent.current && videoRef.current) {
                    triggerPause();
                    handleLocalStateSync(videoRef.current.currentTime, false);
                  }
                }}
                onSeekSync={(time) => {
                  if (isReceivingEvent.current) return;
                  // Guests should not trigger sync on seek - only sync when out of sync is detected
                  if (!isHost) {
                    return;
                  }
                  if (isOutOfSync) {
                    handleSyncClick();
                    return;
                  }
                  if (hasSynced.current && !isReceivingEvent.current) {
                    triggerSeek(time);
                    handleLocalStateSync(time, lastSyncPlayingRef.current);
                  }
                }}
                onBuffering={handleBuffering}
                hasNextEpisode={isHost && currentEpisodeIndex < (currentServer?.server_data.length || 0) - 1}
                onAutoNext={() => {
                  if (!isHost) return;
                  const maxEp = currentServer?.server_data.length || 0;
                  if (currentEpisodeIndex < maxEp - 1) {
                    const nextIdx = currentEpisodeIndex + 1;
                    const epName = currentServer?.server_data[nextIdx]?.name || `Tập ${nextIdx + 1}`;
                    setCurrentEpisodeIndex(nextIdx);
                    triggerChangeEpisode(currentServerIndex, nextIdx, epName);
                  }
                }}
              />
            </>
          ) : (
            <div className="w-full aspect-video bg-zinc-900 rounded-lg flex items-center justify-center">
              <span className="text-zinc-500 text-sm">Đang tải video...</span>
            </div>
          )}
        </div>

        {/* Mobile Room Header: Show on mobile below video */}
        {!isTheaterMode && (
          <div className="flex flex-col md:hidden p-3 border-b border-zinc-850 bg-zinc-900/10 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                  <span className="truncate">Xem Chung: {movie.name}</span>
                </h1>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Tập: <span className="text-red-500 font-semibold">{currentEpisode?.name.toLowerCase().includes("tập") ? currentEpisode.name : `Tập ${currentEpisodeIndex + 1}`}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Copy Link */}
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-red-500" />}
                  <span>{copied ? "Đã copy" : "Mời"}</span>
                </button>

                {/* Theater/Zoom Toggle Button */}
                <button
                  onClick={handleToggleTheaterMode}
                  className={`flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 w-[26px] h-[26px] rounded-lg transition-all active:scale-95 cursor-pointer`}
                  title="Phóng to rạp chiếu"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {isTheaterMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6m-6 12v4.5M15 15h4.5M15 15l6 6m-6-6v4.5M9 15H4.5M9 15l-6 6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}





        {/* Mobile-only Tabs Navigation and Content */}
        {!isTheaterMode && (
          <>
            <div className="flex md:hidden border-b border-zinc-800/40 bg-zinc-950/20 rounded-t-xl shrink-0">
              <button
                onClick={() => setActiveMobileTab("chat")}
                className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-colors ${activeMobileTab === "chat" ? "border-red-500 text-red-400" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
              >
                Trò chuyện
              </button>
              <button
                onClick={() => setActiveMobileTab("episodes")}
                className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-colors ${activeMobileTab === "episodes" ? "border-red-500 text-red-400" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
              >
                Tập phim
              </button>
              <button
                onClick={() => {
                  if (!isHost) {
                    handleSyncClick();
                  }
                  setActiveMobileTab("watchers");
                }}
                className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-all ${
                  activeMobileTab === "watchers" 
                    ? "border-red-500 text-red-400" 
                    : isOutOfSync 
                      ? "border-red-500 text-red-500 animate-pulse font-bold" 
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
                title={isOutOfSync ? "Bị lệch hình! Click để đồng bộ lại" : "Kết nối ổn định"}
              >
                Người xem ({watchers.length})
              </button>
            </div>

            {/* Mobile Tab Content Container */}
            <div className={`flex-1 min-h-0 md:hidden bg-zinc-900/10 rounded-b-xl border-0 p-3 flex flex-col min-h-[200px] ${activeMobileTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              {activeMobileTab === "chat" && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Emojis Reaction bar inside mobile chat tab */}
                  {isJoined && (
                    <div className="flex items-center gap-2 justify-center py-2 px-1 bg-zinc-950/20 rounded-lg border-0 mb-2 shrink-0 overflow-x-auto no-scrollbar">
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => triggerReaction(emoji)}
                          className="text-lg hover:scale-125 active:scale-95 transition-all cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <RoomChat
                      messages={messages}
                      typingUsers={typingUsers}
                      watchers={watchers}
                      onSendMessage={sendMessage}
                      onTyping={triggerTyping}
                    />
                  </div>
                </div>
              )}

              {activeMobileTab === "episodes" && (
                <div className="flex-1 overflow-y-auto">
                  {episodes.length > 0 && serverData.length > 0 && (
                    <div className="relative">
                      {!isHost && (
                        <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl cursor-not-allowed">
                          <div className="bg-zinc-900/90 text-white px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 shadow-xl">
                            Chỉ Host mới có quyền đổi tập phim
                          </div>
                        </div>
                      )}
                      <div className={!isHost ? "pointer-events-none opacity-50" : ""}>
                        <EpisodeSelector
                          episodes={episodes}
                          currentServerIndex={selectedServerIndex}
                          currentEpisodeIndex={currentServerIndex === selectedServerIndex ? currentEpisodeIndex : -1}
                          onSelectEpisode={(idx) => {
                            if (!isHost) return;
                            isLocalEpisodeChangeRef.current = true;
                            setCurrentServerIndex(selectedServerIndex);
                            setCurrentEpisodeIndex(idx);
                            const epName = episodes[selectedServerIndex]?.server_data[idx]?.name || `Tập ${idx + 1}`;
                            triggerChangeEpisode(selectedServerIndex, idx, epName);
                          }}
                          onSelectServer={(idx) => {
                            if (!isHost) return;
                            setSelectedServerIndex(idx);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeMobileTab === "watchers" && (
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-red-400" />
                    <h3 className="font-semibold text-white text-sm">Danh sách người đang xem</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {watchers.map((w) => (
                      <div key={w.id} className="flex items-center justify-between gap-3 bg-zinc-850 px-3.5 py-2 rounded-xl text-xs w-full">
                        <span className="text-zinc-200 truncate flex-1">
                          {w.name} {w.isHost && <span className="text-amber-400 font-bold ml-1" title="Host">👑</span>}
                        </span>
                        {isHost && !w.isHost && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn muốn chuyển quyền Host cho ${w.name}?`)) {
                                triggerChangeHost(w.id, w.name);
                              }
                            }}
                            className="text-[10px] bg-amber-600/20 hover:bg-amber-600 border border-amber-600/30 hover:border-transparent text-amber-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 shrink-0"
                          >
                            Làm Host
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>


      {/* Resizable Divider handle */}
      {!isTheaterMode && (
        <div 
          onMouseDown={startResizing} 
          className="hidden md:block absolute top-[100px] bottom-[200px] w-2 cursor-col-resize z-50 bg-transparent hover:bg-red-500/20 transition-all duration-150" 
          style={{ right: `${chatWidth - 4}px` }}
        />
      )}

      {/* Right Area: Desktop & Mobile Floating Sidebar */}
      <div
        className={`bg-transparent flex-col min-h-0 transition-all duration-300 ease-in-out ${
          isTheaterMode
            ? "fixed right-0 top-0 bottom-20 z-50 flex w-[280px] max-w-[80vw] p-3 gap-3 pointer-events-none"
            : "hidden md:flex absolute top-6 bottom-6 right-6 z-10 shrink-0 max-w-full"
        } ${(isChatHidden || (isTheaterMode && !showInactivityControls)) ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={isTheaterMode ? {} : { 
          width: `${chatWidth}px`,
          padding: "0px",
          gap: "0px",
          backgroundColor: "transparent" 
        }}
      >

        {/* Sleek controls row: Watchers & Emojis Popovers (Only show in Theater Mode) */}
        {isTheaterMode && (
          <div className="flex items-center gap-1.5 p-2 shrink-0 border-b border-zinc-800/40 bg-zinc-950/20 backdrop-blur-md justify-end md:justify-center w-full pointer-events-auto">
            
            {/* Watchers Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  if (!isHost) {
                    handleSyncClick();
                  }
                  setShowWatchers(prev => !prev);
                  setShowEmojis(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                  isOutOfSync 
                    ? "bg-red-950/20 border-red-500/50 text-red-400 hover:bg-red-900/35 animate-pulse" 
                    : "bg-emerald-950/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/35"
                }`}
                title={isOutOfSync ? "Bị lệch hình! Click để đồng bộ lại" : "Kết nối ổn định"}
              >
                <Users className={`w-3.5 h-3.5 ${isOutOfSync ? "text-red-500 animate-bounce" : "text-emerald-400"}`} />
                <span>{watchers.length}</span>
              </button>

              {showWatchers && (
                <div className="absolute right-0 sm:right-full top-9 sm:top-0 mt-2 sm:mt-0 mr-0 sm:mr-2 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/40 p-3 rounded-lg shadow-2xl z-50 min-w-[180px] max-w-[240px]">
                  <h4 className="text-[11px] font-semibold text-zinc-400 mb-2 border-b border-zinc-900 pb-1">Người xem ({watchers.length})</h4>
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                    {watchers.map((w) => (
                      <div key={w.id} className="flex items-center justify-between gap-2 text-xs text-zinc-300 py-1">
                        <span className="truncate">
                          {w.name} {w.isHost && <span className="text-amber-400 font-bold ml-1" title="Host">👑</span>}
                        </span>
                        {isHost && !w.isHost && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn muốn chuyển quyền Host cho ${w.name}?`)) {
                                triggerChangeHost(w.id, w.name);
                              }
                            }}
                            className="text-[9px] bg-zinc-800 hover:bg-amber-600 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            Làm Host
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Emojis Popover */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowEmojis(prev => !prev);
                  setShowWatchers(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${showEmojis ? "bg-zinc-800/80 border-zinc-700 text-red-500" : "bg-zinc-900/30 border-zinc-900/20 text-zinc-400 hover:text-zinc-200"}`}
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {showEmojis && (
                <div className="absolute right-0 sm:right-full top-9 sm:top-0 mt-2 sm:mt-0 mr-0 sm:mr-2 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/40 p-2 rounded-lg shadow-2xl z-50 min-w-[200px]">
                  <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          triggerReaction(emoji);
                        }}
                        className="text-lg hover:scale-125 active:scale-95 transition-transform duration-100 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

             {/* Theater/Zoom Toggle Button */}
            <button
              onClick={handleToggleTheaterMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${isTheaterMode ? "bg-zinc-800/80 border-zinc-700 text-red-500" : "bg-zinc-900/30 border-zinc-900/20 text-zinc-400 hover:text-zinc-200"}`}
              title="Bật/Tắt chế độ phóng to rạp chiếu"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {isTheaterMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6m-6 12v4.5M15 15h4.5M15 15l6 6m-6-6v4.5M9 15H4.5M9 15l-6 6" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                )}
              </svg>
            </button>
          </div>
        )}


        <div className={`flex-1 min-h-0 h-0 flex flex-col pointer-events-auto ${
          isTheaterMode 
            ? "bg-transparent border-0 shadow-none" 
            : "bg-zinc-900/30 border border-zinc-800/50 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden"
        }`}>
          {!isTheaterMode && (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/20 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-xs font-bold text-zinc-300">Phòng chat ({watchers.length} người)</span>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => {
                      if (!isHost) {
                        handleSyncClick();
                      }
                      setShowWatchers(prev => !prev);
                      setShowEmojis(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                      isOutOfSync 
                        ? "bg-red-950/20 border-red-500/50 text-red-400 hover:bg-red-900/35 animate-pulse" 
                        : "bg-emerald-950/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/35"
                    }`}
                    title={isOutOfSync ? "Bị lệch hình! Click để đồng bộ lại" : "Kết nối ổn định"}
                  >
                    <Users className={`w-3.5 h-3.5 ${isOutOfSync ? "text-red-500 animate-bounce" : "text-emerald-400"}`} />
                    <span>Người xem</span>
                  </button>

                  {showWatchers && (
                    <div className="absolute right-0 top-9 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/40 p-3 rounded-lg shadow-2xl z-50 min-w-[180px] max-w-[240px]">
                      <h4 className="text-[10px] font-bold text-zinc-500 mb-2 border-b border-zinc-900 pb-1 uppercase tracking-wider">Đang xem ({watchers.length})</h4>
                      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                        {watchers.map((w) => (
                          <div key={w.id} className="flex items-center justify-between gap-2 text-xs text-zinc-300 py-1">
                            <span className="truncate">
                              {w.name} {w.isHost && <span className="text-amber-400 font-bold ml-1" title="Host">👑</span>}
                            </span>
                            {isHost && !w.isHost && (
                              <button
                                onClick={() => {
                                  if (confirm(`Bạn muốn chuyển quyền Host cho ${w.name}?`)) {
                                    triggerChangeHost(w.id, w.name);
                                  }
                                }}
                                className="text-[9px] bg-zinc-800 hover:bg-amber-600 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                Làm Host
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Emojis Reaction bar */}
              <div className="px-3 py-2 border-b border-zinc-800/30 bg-zinc-950/10 flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mr-1 select-none">Cảm xúc:</span>
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => triggerReaction(emoji)}
                    className="text-base hover:scale-125 active:scale-95 transition-transform duration-100 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex-1 overflow-hidden flex flex-col">
            <RoomChat
              messages={messages}
              typingUsers={typingUsers}
              watchers={watchers}
              onSendMessage={sendMessage}
              onTyping={triggerTyping}
              isTheaterMode={isTheaterMode}
            />
          </div>
        </div>
      </div>
    </div>

      {/* Bottom Section: Full-width Standalone Episode Selector (Desktop-only, scroll down to see) */}
      {!isTheaterMode && (
        <div className="hidden md:block w-full shrink-0 max-w-[1600px] mx-auto px-4 md:px-6 pb-12 relative z-20">
          <div className="w-full px-6 py-6 bg-zinc-900/20 border border-zinc-800/40 backdrop-blur-md rounded-2xl">
            {episodes.length > 0 && serverData.length > 0 && (
              <div className="relative">
                {!isHost && (
                  <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl cursor-not-allowed">
                    <div className="bg-zinc-900/90 text-white px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 shadow-xl">
                      Chỉ Host mới có quyền đổi tập phim
                    </div>
                  </div>
                )}
                <div className={!isHost ? "pointer-events-none opacity-50" : ""}>
                  <EpisodeSelector
                    episodes={episodes}
                    currentServerIndex={selectedServerIndex}
                    currentEpisodeIndex={currentServerIndex === selectedServerIndex ? currentEpisodeIndex : -1}
                    onSelectEpisode={(idx) => {
                      if (!isHost) return;
                      isLocalEpisodeChangeRef.current = true;
                      setCurrentServerIndex(selectedServerIndex);
                      setCurrentEpisodeIndex(idx);
                      const epName = episodes[selectedServerIndex]?.server_data[idx]?.name || `Tập ${idx + 1}`;
                      triggerChangeEpisode(selectedServerIndex, idx, epName);
                    }}
                    onSelectServer={(idx) => {
                      if (!isHost) return;
                      setSelectedServerIndex(idx);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyboardAndTheaterHandler({ 
  setIsTheaterMode, 
  setIsChatHidden,
  containerRef,
  isTheaterMode
}: { 
  setIsTheaterMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsChatHidden: React.Dispatch<React.SetStateAction<boolean>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isTheaterMode: boolean;
}) {
  useEffect(() => {
    // Esc key & 'z' key to toggle theater mode (using capture to bypass focus/propagation issues)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing in input/textarea/contenteditable fields
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        setIsTheaterMode(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isTheaterMode) {
          setIsChatHidden(prev => {
            const nextState = !prev;
            if (!nextState) {
              // Tự động focus ngay khi mở chat
              setTimeout(() => {
                const inputEl = document.getElementById("chat-input-field");
                if (inputEl) {
                  inputEl.focus();
                }
              }, 100);
            }
            return nextState;
          });
        } else {
          // Khi chưa zoom nhấn enter sẽ chuyển sang zoom chưa ẩn chat và focus vào input
          setIsTheaterMode(true);
          setIsChatHidden(false);
          setTimeout(() => {
            const inputEl = document.getElementById("chat-input-field");
            if (inputEl) {
              inputEl.focus();
            }
          }, 100);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });

    // Listen to native fullscreen changes (e.g. exiting fullscreen via Esc/browser controls)
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      const isFullscreen = !!fsElement;
      const isDocFullscreen = fsElement === document.documentElement;
      
      if (!fsElement) {
        setIsTheaterMode(false);
      } else if (isDocFullscreen) {
        setIsTheaterMode(true);
      }
      
      const orientation = screen.orientation as any;
      if (!isFullscreen && orientation) {
        if (orientation.lock) {
          orientation.lock('portrait').then(() => {
            if (!document.fullscreenElement && orientation.unlock) {
              orientation.unlock();
            }
          }).catch(() => {
            if (!document.fullscreenElement && orientation.unlock) {
              orientation.unlock();
            }
          });
        } else if (orientation.unlock) {
          orientation.unlock();
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Visual Viewport resize handler to lock layout height on mobile keyboard popups without jittering
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      
      const root = containerRef.current;
      if (root && window.innerWidth < 768) {
        // Only lock height dynamically if visual viewport is significantly smaller than window height (indicating keyboard is open)
        // This avoids layout zoom issues in Safari on orientation change
        const isKeyboardOpen = window.innerHeight - viewport.height > 150;
        if (isKeyboardOpen) {
          root.style.height = `${viewport.height}px`;
        } else {
          root.style.height = "100dvh";
        }
      } else if (root) {
        // Reset styles for desktop
        root.style.height = "";
      }
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      // Run immediately
      handleResize();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (typeof window !== "undefined" && window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, [setIsTheaterMode, setIsChatHidden, containerRef, isTheaterMode]);

  return null;
}



