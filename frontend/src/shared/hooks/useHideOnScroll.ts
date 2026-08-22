'use client';

import { useEffect, useRef, useState } from 'react';

// Movement smaller than this is treated as jitter. Without it, the sub-pixel
// wobble of a finger resting on a touchscreen flips the bar in and out.
const JITTER_PX = 6;

type Options = {
  /** Keep the element pinned open regardless of scrolling — e.g. while a menu is expanded. */
  isDisabled?: boolean;
  /** Within this many pixels of the top, always reveal, whichever way the user is going. */
  revealAbovePx?: number;
};

/**
 * Reveals on scroll up, hides on scroll down. Intended for a fixed header that
 * should stay reachable without sending the user back to the top of the page.
 *
 * Returns visibility only — the caller decides how (and at which breakpoints) to
 * express it, so the same hook works for a header, a toolbar, or a bottom bar.
 */
export function useHideOnScroll({ isDisabled = false, revealAbovePx = 80 }: Options = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastYRef = useRef(0);
  const isTickingRef = useRef(false);

  useEffect(() => {
    // While disabled there is nothing to track — the returned value is forced
    // visible below, so no listener and no state write are needed here.
    if (isDisabled) return;

    // Seed from the current position so a mid-page mount (or a back-navigation
    // that restores scroll) doesn't read as one enormous jump.
    lastYRef.current = Math.max(0, window.scrollY);

    const update = () => {
      isTickingRef.current = false;
      // Clamp: iOS rubber-banding reports negative scrollY past the top.
      const y = Math.max(0, window.scrollY);

      if (y <= revealAbovePx) {
        lastYRef.current = y;
        setIsVisible(true);
        return;
      }

      const delta = y - lastYRef.current;
      // Deliberately leave lastYRef alone below the threshold so slow drags
      // accumulate into a real move instead of being discarded frame by frame.
      if (Math.abs(delta) < JITTER_PX) return;

      setIsVisible(delta < 0);
      lastYRef.current = y;
    };

    const onScroll = () => {
      if (isTickingRef.current) return;
      isTickingRef.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isDisabled, revealAbovePx]);

  // Derived rather than stored, so disabling never has to write state from an effect.
  // Safe against a stale `false`: the element has to be on screen for the caller to
  // disable it in the first place, so the tracked value is already true by then.
  return { isVisible: isDisabled || isVisible };
}
