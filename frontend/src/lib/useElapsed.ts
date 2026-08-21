'use client';

import { useEffect, useState } from 'react';

/**
 * Ticks a live elapsed-time string ("2.3s", "1m 4.0s") from the moment the
 * hook mounts. Shared by LoadingState and ThinkingState so both long-running
 * indicators report time the same way.
 */
export function useElapsed(): string {
  const [deciseconds, setDeciseconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDeciseconds(d => d + 1), 100);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = deciseconds / 10;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  return `${minutes}m ${seconds}s`;
}
