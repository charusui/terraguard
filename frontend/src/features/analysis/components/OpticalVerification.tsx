'use client';

import { useState, type ElementType, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SquaresFour, ArrowsLeftRight, Calendar, CloudSlash, Warning } from '@phosphor-icons/react';

// IBM Plex Sans and Roboto are already pulled in by the Google Fonts @import at the
// top of globals.css and exposed as these vars — go through them rather than
// re-declaring the stacks here.
const FONT_HEADING = 'var(--font-display)';
const FONT_BODY = 'var(--font-body)';

export type OpticalCapture = { image: string; date: string; offset_days: number };
export type OpticalData = { before?: OpticalCapture; after?: OpticalCapture };

type ViewMode = 'paired' | 'swipe' | 'timeline';
type Slot = 'before' | 'after';

const SLOTS = ['before', 'after'] as const satisfies readonly Slot[];

const VIEWS: Array<{ id: ViewMode; label: string; Icon: ElementType }> = [
  { id: 'paired', label: 'Side by side', Icon: SquaresFour },
  { id: 'swipe', label: 'Swipe', Icon: ArrowsLeftRight },
  { id: 'timeline', label: 'Timeline', Icon: Calendar },
];

// 'YYYY-MM-DD' parsed via `new Date()` is treated as UTC and renders a day early
// west of Greenwich, so bare date strings get an explicit local time.
function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

function formatFullDate(value: string): string {
  const d = parseDate(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatShortDate(value: string): string {
  const d = parseDate(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function offsetLabel(days: number): string {
  const n = Math.abs(days);
  return `${n} ${n === 1 ? 'day' : 'days'} ${days <= 0 ? 'before' : 'after'} target`;
}

function CloudFallback({ when }: { when: Slot }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '20px',
        textAlign: 'center',
        background: 'var(--canvas-soft)',
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'inherit',
        color: 'var(--mute)',
      }}
    >
      <CloudSlash size={22} weight="regular" />
      <span style={{ fontSize: '12.5px', lineHeight: 1.5, fontFamily: FONT_BODY, maxWidth: '28ch' }}>
        No clear imagery available {when} this date due to cloud cover.
      </span>
    </div>
  );
}

function Badge({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: '10px',
        left: align === 'left' ? '10px' : undefined,
        right: align === 'right' ? '10px' : undefined,
        zIndex: 2,
        padding: '5px 11px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 500,
        fontFamily: FONT_HEADING,
        color: '#fff',
        background: 'rgba(20,20,20,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </span>
  );
}

// Aspect-locked frame. Holds its footprint whether the image loads, fails, or is absent.
function Frame({
  capture,
  when,
  hasFailed,
  onError,
  ratio = '4 / 3',
  radius = '14px',
}: {
  capture?: OpticalCapture;
  when: Slot;
  hasFailed: boolean;
  onError: () => void;
  ratio?: string;
  radius?: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        borderRadius: radius,
        overflow: 'hidden',
        background: 'var(--canvas-soft)',
      }}
    >
      {capture && !hasFailed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capture.image}
            alt={`Sentinel-2 capture ${when} the detected event, ${formatFullDate(capture.date)}`}
            onError={onError}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <Badge>{when === 'before' ? 'Before' : 'After'}</Badge>
        </>
      ) : (
        <CloudFallback when={when} />
      )}
    </div>
  );
}

function PairedView({
  data,
  failed,
  markFailed,
}: {
  data: OpticalData;
  failed: Record<Slot, boolean>;
  markFailed: (slot: Slot) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
      {SLOTS.map(slot => {
        const capture = data[slot];
        const isUsable = Boolean(capture) && !failed[slot];
        return (
          <div key={slot} style={{ background: 'var(--canvas-soft)', borderRadius: '16px', overflow: 'hidden' }}>
            <Frame capture={capture} when={slot} hasFailed={failed[slot]} onError={() => markFailed(slot)} radius="0" />
            <div style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, fontFamily: FONT_HEADING, color: 'var(--ink)' }}>
                {capture && isUsable ? formatFullDate(capture.date) : 'Unavailable'}
              </div>
              <div style={{ fontSize: '12px', fontFamily: FONT_BODY, color: 'var(--mute)', marginTop: '2px' }}>
                {capture && isUsable ? offsetLabel(capture.offset_days) : `No usable ${slot} capture`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SwipeView({ before, after }: { before: OpticalCapture; after: OpticalCapture }) {
  const shouldReduceMotion = useReducedMotion();
  const [revealPct, setRevealPct] = useState(50);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isEngaged = isGrabbing || isFocused;

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'var(--canvas-soft)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before.image}
          alt={`Sentinel-2 capture before the detected event, ${formatFullDate(before.date)}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={after.image}
          alt={`Sentinel-2 capture after the detected event, ${formatFullDate(after.date)}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            clipPath: `inset(0 0 0 ${revealPct}%)`,
          }}
        />

        <Badge>Before · {formatShortDate(before.date)}</Badge>
        <Badge align="right">After · {formatShortDate(after.date)}</Badge>

        {/* Divider and handle. Sits above the imagery but takes no pointer events —
            the transparent range input below owns all interaction. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${revealPct}%`,
            width: '6px',
            marginLeft: '-3px',
            background: 'rgba(255,255,255,0.95)',
            // Hairline of shade on each edge so the bar still reads against bright sky or snow.
            boxShadow: '0 0 0 1px rgba(0,0,0,0.22), 0 0 14px rgba(0,0,0,0.28)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${isEngaged && !shouldReduceMotion ? 1.08 : 1})`,
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.97)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: '#1a1a1a',
              boxShadow: isFocused
                ? '0 0 0 3px var(--canvas), 0 0 0 5px var(--ink), 0 6px 18px rgba(0,0,0,0.32)'
                : '0 0 0 1px rgba(0,0,0,0.08), 0 6px 18px rgba(0,0,0,0.32)',
              transition: shouldReduceMotion ? undefined : 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
          >
            <ArrowsLeftRight size={22} weight="bold" />
          </div>
        </div>

        {/* Transparent range input drives the swipe — gives pointer, touch and keyboard control for free. */}
        <input
          type="range"
          min={0}
          max={100}
          value={revealPct}
          onChange={e => setRevealPct(Number(e.target.value))}
          onPointerDown={() => setIsGrabbing(true)}
          onPointerUp={() => setIsGrabbing(false)}
          onPointerCancel={() => setIsGrabbing(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label="Reveal the after capture"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: isGrabbing ? 'grabbing' : 'ew-resize',
            zIndex: 4,
            margin: 0,
            // The handle above is the focus affordance; the input's own ring would
            // outline the whole frame.
            outline: 'none',
            touchAction: 'none',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          marginTop: '10px',
          fontSize: '12px',
          fontFamily: FONT_BODY,
          color: 'var(--mute)',
        }}
      >
        <span>
          {formatFullDate(before.date)} · {offsetLabel(before.offset_days)}
        </span>
        <span style={{ textAlign: 'right' }}>
          {formatFullDate(after.date)} · {offsetLabel(after.offset_days)}
        </span>
      </div>
    </div>
  );
}

function TimelineView({
  data,
  failed,
  markFailed,
  targetDate,
}: {
  data: OpticalData;
  failed: Record<Slot, boolean>;
  markFailed: (slot: Slot) => void;
  targetDate: string;
}) {
  const stamps: number[] = [parseDate(targetDate).getTime()];
  if (data.before) stamps.push(parseDate(data.before.date).getTime());
  if (data.after) stamps.push(parseDate(data.after.date).getTime());

  const min = Math.min(...stamps);
  const max = Math.max(...stamps);
  const span = max - min || 1;
  // 10% padding each side so end markers and their labels don't clip.
  const pct = (value: string) => 10 + ((parseDate(value).getTime() - min) / span) * 80;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        {SLOTS.map(slot => (
          <Frame
            key={slot}
            capture={data[slot]}
            when={slot}
            hasFailed={failed[slot]}
            onError={() => markFailed(slot)}
          />
        ))}
      </div>

      <div style={{ position: 'relative', height: '54px' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '9px',
            height: '2px',
            borderRadius: '2px',
            background: 'var(--hairline-strong)',
          }}
        />

        {/* Target / detected change point */}
        <div
          style={{
            position: 'absolute',
            left: `${pct(targetDate)}%`,
            top: 0,
            width: '2px',
            height: '20px',
            borderRadius: '2px',
            background: 'var(--error)',
            transform: 'translateX(-1px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pct(targetDate)}%`,
            top: '26px',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 500, fontFamily: FONT_HEADING, color: 'var(--error)' }}>
            Detected
          </div>
          <div style={{ fontSize: '11px', fontFamily: FONT_BODY, color: 'var(--mute)' }}>
            {formatShortDate(targetDate)}
          </div>
        </div>

        {SLOTS.map(slot => {
          const capture = data[slot];
          if (!capture || failed[slot]) return null;
          return (
            <div key={slot}>
              <div
                style={{
                  position: 'absolute',
                  left: `${pct(capture.date)}%`,
                  top: '4px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '999px',
                  background: 'var(--ink)',
                  border: '2px solid var(--canvas)',
                  transform: 'translateX(-6px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${pct(capture.date)}%`,
                  top: '26px',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 500, fontFamily: FONT_HEADING, color: 'var(--ink)' }}>
                  {formatShortDate(capture.date)}
                </div>
                <div style={{ fontSize: '11px', fontFamily: FONT_BODY, color: 'var(--mute)' }}>
                  {capture.offset_days <= 0 ? '−' : '+'}
                  {Math.abs(capture.offset_days)} d
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OpticalVerification({
  data,
  isLoading,
  error,
  targetDate,
}: {
  data: OpticalData | null;
  isLoading: boolean;
  error: string | null;
  targetDate: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [view, setView] = useState<ViewMode>('paired');
  // Failures are tracked by image URL rather than by slot so they invalidate themselves:
  // a new response carries new URLs, which are not in the set, so nothing stale carries over.
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());

  const markFailed = (slot: Slot) => {
    const url = data?.[slot]?.image;
    if (!url) return;
    setFailedUrls(prev => (prev.has(url) ? prev : new Set(prev).add(url)));
  };

  const failed: Record<Slot, boolean> = {
    before: Boolean(data?.before && failedUrls.has(data.before.image)),
    after: Boolean(data?.after && failedUrls.has(data.after.image)),
  };

  const before = data?.before && !failed.before ? data.before : undefined;
  const after = data?.after && !failed.after ? data.after : undefined;
  const canSwipe = Boolean(before && after);

  // Swipe needs both captures. If one drops out, fall back rather than render a broken frame.
  const activeView: ViewMode = view === 'swipe' && !canSwipe ? 'paired' : view;

  return (
    <div style={{ fontFamily: FONT_HEADING }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '24px',
        }}
      >
        <div>
          <h3 className="t-display-sm" style={{ marginBottom: '6px' }}>
            Optical verification
          </h3>
          <p className="t-body" style={{ margin: 0, color: 'var(--mute)', fontFamily: FONT_BODY, maxWidth: '52ch' }}>
            Sentinel-2 true-color imagery before and after the detected event.
          </p>
        </div>

        {data && !isLoading && !error && (
          <div
            role="group"
            aria-label="Image comparison view"
            style={{
              display: 'inline-flex',
              gap: '3px',
              padding: '3px',
              borderRadius: '999px',
              background: 'var(--canvas-soft-2)',
              border: '1px solid var(--hairline-strong)',
            }}
          >
            {VIEWS.map(({ id, label, Icon }) => {
              const isDisabled = id === 'swipe' && !canSwipe;
              const isActive = activeView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  disabled={isDisabled}
                  aria-pressed={isActive}
                  title={isDisabled ? 'Swipe needs both captures' : label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '7px 15px',
                    fontSize: '12px',
                    fontFamily: FONT_BODY,
                    background: isActive ? 'var(--canvas)' : 'transparent',
                    color: isActive ? 'var(--ink)' : 'var(--mute)',
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  <Icon size={14} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: '16px' }} />
          <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: '16px' }} />
        </div>
      )}

      {error && !isLoading && (
        <div className="verdict-flag verdict-red">
          <Warning size={14} weight="bold" /> Optical verification failed: {error}
        </div>
      )}

      {!isLoading && !error && data && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeView === 'paired' && <PairedView data={data} failed={failed} markFailed={markFailed} />}
            {activeView === 'swipe' && before && after && <SwipeView before={before} after={after} />}
            {activeView === 'timeline' && (
              <TimelineView data={data} failed={failed} markFailed={markFailed} targetDate={targetDate} />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {!isLoading && !error && !data && (
        <div style={{ padding: '28px 24px', background: 'var(--canvas-soft)', borderRadius: '16px', textAlign: 'center' }}>
          <span className="t-body" style={{ color: 'var(--mute)', fontFamily: FONT_BODY }}>
            Optical imagery not requested or unavailable.
          </span>
        </div>
      )}
    </div>
  );
}
