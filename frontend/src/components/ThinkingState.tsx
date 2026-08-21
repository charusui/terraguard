'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDown, CheckCircle, Sparkle } from '@phosphor-icons/react';

/* ─────────────────────────────────────────────────────────
 * THINKING STATE — expandable step trace for a background call
 *
 * Walks through `steps` one at a time while `working` is true (pacing
 * only — the real work is whatever async call the caller kicked off in
 * parallel), auto-expands while active, then settles into a one-line
 * "Thought for Xs" summary that stays expandable so the trace isn't lost.
 *
 * The step counter and timer only ever need to reset at the START of a
 * new run — give this component a fresh `key` from the caller each time
 * a run begins (e.g. an incrementing "run id") and remounting resets both
 * for free, with no in-component reset-on-prop-change logic needed.
 * ───────────────────────────────────────────────────────── */

const STEP_INTERVAL_MS = 550;

function useSettledElapsed(working: boolean): string {
  // seeded at 0, not Date.now() — reading the clock has to happen in an
  // effect/callback, not during render, or it's an impure render (and a
  // server/client hydration mismatch waiting to happen)
  const startRef = useRef(0);
  const [display, setDisplay] = useState('0.0s');

  useEffect(() => {
    if (working) startRef.current = Date.now();
  }, [working]);

  useEffect(() => {
    if (!working) return; // freeze the last displayed value once settled
    const id = setInterval(() => {
      const totalSeconds = (Date.now() - startRef.current) / 1000;
      setDisplay(
        totalSeconds < 60
          ? `${totalSeconds.toFixed(1)}s`
          : `${Math.floor(totalSeconds / 60)}m ${(totalSeconds % 60).toFixed(1)}s`
      );
    }, 100);
    return () => clearInterval(id);
  }, [working]);

  return display;
}

interface ThinkingStateProps {
  /** step labels walked through, in order, while `working` is true */
  steps: string[];
  /** true while the real async call this trace illustrates is in flight */
  working: boolean;
  /** header label shown while working (default "Thinking") */
  activeLabel?: string;
}

export default function ThinkingState({ steps, working, activeLabel = 'Thinking' }: ThinkingStateProps) {
  const [step, setStep] = useState(0);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const elapsed = useSettledElapsed(working);

  useEffect(() => {
    if (!working || step >= steps.length - 1) return;
    const t = setTimeout(() => setStep(s => s + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [working, step, steps.length]);

  const visibleDone = working ? step : steps.length;
  const autoExpanded = working;
  const expanded = manualExpanded ?? autoExpanded;

  return (
    <div className="thinking-state">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded(current => !(current ?? autoExpanded))}
        className="thinking-toggle"
      >
        <Sparkle size={14} weight={working ? 'fill' : 'regular'} color={working ? 'var(--ink)' : 'var(--mute)'} />
        {working ? (
          <span className="loading-label" style={{ fontSize: '13px' }}>{activeLabel}</span>
        ) : (
          <span className="t-caption" style={{ color: 'var(--ink)', fontWeight: 500 }}>Thought for {elapsed}</span>
        )}
        <CaretDown
          size={12}
          weight="bold"
          color="var(--mute)"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
        />
      </button>

      <div
        className="thinking-trace"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="thinking-trace-inner">
            {steps.map((label, i) => {
              const done = i < visibleDone || !working;
              const active = working && i === visibleDone && i < steps.length;
              return (
                <div
                  key={label}
                  className="thinking-row"
                  style={{ animation: `fade-up 320ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms both` }}
                >
                  {done ? (
                    <CheckCircle size={14} weight="fill" color="var(--ink)" style={{ flexShrink: 0 }} />
                  ) : active ? (
                    <span className="thinking-spinner" />
                  ) : (
                    <span className="thinking-dot" />
                  )}
                  <span className="t-caption" style={{ color: done ? 'var(--ink)' : 'var(--mute)' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
