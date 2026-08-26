'use client';

// Reveals an answer word by word instead of dropping it in fully formed.
//
// The answer is already in hand when this starts — nothing is being waited on.
// The reveal exists because a paragraph that appears all at once reads as a
// canned block, and one that arrives at reading pace reads as a reply. It is
// presentation only, so reduced-motion callers get the whole string at once.

import { useEffect, useMemo, useState } from 'react';

// ~45 words per second. Fast enough that a long answer never becomes a wait,
// slow enough that the text visibly arrives rather than blinking into place.
const WORD_INTERVAL_MS = 22;

export function useStreamedText(text: string, isEnabled: boolean) {
  const words = useMemo(() => text.split(' '), [text]);
  const [wordCount, setWordCount] = useState(isEnabled ? 0 : words.length);

  // Restart when the text itself changes. Adjusted during render rather than
  // in an effect so a new answer never paints its final frame first.
  const [trackedText, setTrackedText] = useState(text);
  if (trackedText !== text) {
    setTrackedText(text);
    setWordCount(isEnabled ? 0 : words.length);
  }

  const isStreaming = wordCount < words.length;

  useEffect(() => {
    if (!isEnabled || !isStreaming) return;
    const id = setTimeout(() => setWordCount(count => count + 1), WORD_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [isEnabled, isStreaming, wordCount]);

  return {
    visibleText: isEnabled ? words.slice(0, wordCount).join(' ') : text,
    isStreaming: isEnabled && isStreaming,
  };
}
