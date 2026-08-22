'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CircleNotch } from '@phosphor-icons/react';
import styles from './analyzeButton.module.css';

type AnalyzeButtonProps = {
  onClick: () => void;
  isLoading: boolean;
  isDisabled?: boolean;
  /** Shown in place of the children while a run is in flight. */
  loadingLabel?: string;
  children: ReactNode;
};

export function AnalyzeButton({
  onClick,
  isLoading,
  isDisabled = false,
  loadingLabel = 'Working...',
  children,
}: AnalyzeButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isInert = isLoading || isDisabled;

  // Written straight to CSS custom properties rather than through state — a
  // pointermove-driven re-render on every frame would be pure waste.
  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const el = buttonRef.current;
    if (!el || shouldReduceMotion) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
  };

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onPointerMove={handlePointerMove}
      disabled={isInert}
      aria-busy={isLoading}
      className={`${styles.button} ${isLoading ? styles.isLoading : ''}`}
      whileHover={shouldReduceMotion || isInert ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion || isInert ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.sheen} aria-hidden="true" />

      {isLoading && (
        <span className={styles.spinner} aria-hidden="true">
          <CircleNotch size={15} weight="bold" />
        </span>
      )}

      {isLoading ? loadingLabel : children}
    </motion.button>
  );
}
