"use client";

import { useCallback, useRef, useEffect } from 'react';

export function useUISound() {
  const tickAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      tickAudio.current = new Audio("https://actions.google.com/sounds/v1/ui/click.ogg");
      tickAudio.current.volume = 0.05; // Cực kỳ nhỏ và tinh tế
    }
  }, []);

  const playTick = useCallback(() => {
    if (tickAudio.current) {
      tickAudio.current.currentTime = 0;
      tickAudio.current.play().catch(() => {});
    }
  }, []);

  return { playTick };
}
