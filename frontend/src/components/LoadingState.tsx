'use client';

import { useElapsed } from '@/lib/useElapsed';

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * A 3×3 grid of cells lights up in a chevron wavefront (two fronts are
 * always in flight since the animation cycle is shorter than the sweep),
 * paired with a shimmering label and a live elapsed timer in tabular
 * mono figures. Reduced motion freezes the grid to its dim state — the
 * timer keeps ticking either way, since that's real information, not
 * decoration.
 * ───────────────────────────────────────────────────────── */

// (c + |r - 1|) * 90ms — lights the middle column first, then fans out
// left/right in step, reading as an arrow driving across the grid.
const CHEVRON_DELAYS = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

interface LoadingStateProps {
  /** what's currently happening, e.g. "Querying COPERNICUS/S1_GRD collection..." */
  label: string;
}

export default function LoadingState({ label }: LoadingStateProps) {
  const elapsed = useElapsed();

  return (
    <div role="status" className="loading-state">
      <span aria-hidden className="loading-grid">
        {CHEVRON_DELAYS.map((delay, i) => (
          <span
            key={i}
            className="loading-cell"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="loading-label">{label}</span>
      <span className="loading-elapsed">{elapsed}</span>
    </div>
  );
}
