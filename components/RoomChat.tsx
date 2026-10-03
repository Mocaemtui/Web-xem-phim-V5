import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Watcher } from '@/hooks/useWatchTogether';
import { Send, AtSign } from 'lucide-react';

interface RoomChatProps {
  messages: ChatMessage[];
  typingUsers: string[];
  watchers: Watcher[];
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  isTheaterMode?: boolean;
}

const formatMovieTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function RoomChat({ messages, typingUsers, watchers, onSendMessage, onTyping, isTheaterMode }: RoomChatProps) {
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Auto scroll to bottom of chat container only, avoiding scrolling the whole webpage
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setText(newValue);

    // Check for @mention
    const cursorPos = inputRef.current?.selectionStart || newValue.length;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by space
      const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
      if (lastAtIndex === 0 || charBeforeAt === ' ' || charBeforeAt === undefined) {
        const filter = textBeforeCursor.substring(lastAtIndex + 1);
        setMentionFilter(filter);
        setShowMentions(true);
        setMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }

    // Clear typing state after 2s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions) {
      const filteredWatchers = watchers.filter(w =>
        w.name.toLowerCase().includes(mentionFilter.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredWatchers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredWatchers.length) % filteredWatchers.length);
      } else if (e.key === 'Enter' && filteredWatchers.length > 0) {
        e.preventDefault();
        selectMention(filteredWatchers[mentionIndex].name);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
      return;
    }

    if (e.key === "Enter" && !text.trim() && isTheaterMode) {
      e.preventDefault();
      window.dispatchEvent(new Event("toggle-chat-visibility"));
    }
  };

  const selectMention = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const newText = text.substring(0, lastAtIndex) + `@${name} ` + text.substring(cursorPos);
      setText(newText);
      setShowMentions(false);
      inputRef.current?.focus();
      // Move cursor after the mention
      const newCursorPos = lastAtIndex + name.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
      setShowMentions(false);
      isTypingRef.current = false;
      onTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  // Filter watchers for mention suggestions
  const filteredWatchers = watchers.filter(w =>
    w.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Highlight mentions in message text
  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-400 font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };


  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-transparent overflow-hidden border-0 shadow-none pointer-events-none" style={{ backgroundColor: "transparent" }}>
      
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth pointer-events-auto">
        {messages.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center mt-4">Chưa có tin nhắn nào. Hãy gửi lời chào!</p>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-xs text-zinc-500 italic bg-zinc-900/50 px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-blue-400">{msg.sender}</span>
                  <span className="text-xs text-zinc-600">
                    {msg.currentTime !== undefined && msg.currentTime !== null
                      ? formatMovieTime(msg.currentTime)
                      : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-zinc-300 text-sm mt-1 bg-zinc-900/40 w-fit py-1.5 px-3 rounded-lg rounded-tl-none break-words max-w-[90%]">
                  {highlightMentions(msg.text)}
                </p>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs mt-2 transition-all">
            <div className="bg-zinc-900/60 border border-zinc-800/40 px-3.5 py-2 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm backdrop-blur-md">
              <span className="font-semibold text-zinc-300">{typingUsers.length > 1 ? `${typingUsers.length} người` : typingUsers[0]}</span>
              <span className="text-zinc-400">đang nhập</span>
              <div className="flex gap-1.5 items-center ml-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }}></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }}></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }}></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`p-3 bg-transparent pointer-events-auto ${isTheaterMode ? "mb-4 md:mb-0" : ""}`}>
        <form onSubmit={handleSubmit} className="relative w-full">
          <input
            ref={inputRef}
            id="chat-input-field"
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full bg-zinc-900/30 hover:bg-zinc-900/50 text-zinc-200 text-sm md:text-sm rounded-xl px-4 py-2.5 pr-12 outline-none transition-all duration-200 placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
              text.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>

          {/* Mention Dropdown */}
          {showMentions && filteredWatchers.length > 0 && (
            <div className="absolute bottom-full left-0 right-12 mb-2 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-50 max-h-48 overflow-y-auto">
              {filteredWatchers.map((watcher, index) => (
                <div
                  key={watcher.id}
                  onClick={() => selectMention(watcher.name)}
                  className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                    index === mentionIndex ? 'bg-blue-600/30' : 'hover:bg-zinc-800'
                  }`}
                >
                  <AtSign className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-200">{watcher.name}</span>
                  {watcher.isHost && (
                    <span className="text-xs bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded">Host</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}


