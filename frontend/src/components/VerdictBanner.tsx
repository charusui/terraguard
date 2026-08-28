'use client';

import { useEffect, useState } from 'react';
import { type AnalysisResult, type VerdictType } from '@/lib/mockData';
import { WarningDiamond, CheckCircle, Question, MapPin, Calendar, Broadcast, ArrowLeft, ArrowRight } from '@phosphor-icons/react';

// Requires 'IBM Plex Sans' (400/500/600) and 'Roboto' (400/500) loaded app-wide.
const FONT_HEADING = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

const CONFIG: Record<VerdictType, {
  Icon: React.ElementType;
  label: string;
  className: string;
  accent: string;
  summary: string;
}> = {
  PRE_EXISTING_STRUCTURE: {
    Icon: WarningDiamond,
    label: 'Structure predates the contract',
    className: 'verdict-red',
    accent: 'var(--error)',
    summary: 'Radar backscatter already read as a hard structure before the claimed notice-to-proceed date, and barely moved afterwards.',
  },
  EARLY_START: {
    Icon: WarningDiamond,
    label: 'Ground broken before the contract',
    className: 'verdict-red',
    accent: 'var(--error)',
    summary: 'Radar backscatter shifted before the claimed notice-to-proceed date, indicating work began ahead of schedule.',
  },
  NO_CHANGE_DETECTED: {
    Icon: Question,
    label: 'No construction change detected',
    className: 'verdict-yellow',
    accent: 'var(--warning)',
    summary: 'No sustained shift in radar surface roughness was found across the observed window.',
  },
  LOCATION_MISMATCH: {
    Icon: MapPin,
    label: 'Recorded location looks wrong',
    className: 'verdict-yellow',
    accent: 'var(--warning)',
    summary: 'The coordinate does not match the structure the contract describes, so no satellite reading here can be trusted.',
  },
  INSUFFICIENT_DATA: {
    Icon: Question,
    label: 'Not enough satellite data',
    className: 'verdict-yellow',
    accent: 'var(--mute)',
    summary: 'No usable radar imagery covers this location and period, so no conclusion can be drawn either way.',
  },
  DELAYED_START: {
    Icon: WarningDiamond,
    label: 'Delayed start detected',
    className: 'verdict-yellow',
    accent: 'var(--warning)',
    summary: 'Radar backscatter shifted well after the claimed notice-to-proceed date, indicating work began behind schedule.',
  },
  CONSISTENT: {
    Icon: CheckCircle,
    label: 'Timeline consistent',
    className: 'verdict-green',
    accent: 'var(--success)',
    summary: 'The detected change in radar backscatter aligns with the claimed notice-to-proceed date.',
  },
};

// Parses 'YYYY-MM-DD' as a local date. `new Date('2024-06-01')` is treated as UTC,
// which renders as May 31 anywhere west of Greenwich.
function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

function formatFullDate(value: string): string {
  const d = parseDate(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Derives the hemisphere from the sign instead of assuming N/E.
function formatCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

// Where the ring is hidden, the gap has to say so. A blank space beside a
// verdict reads as a score too good to need printing, which is the reverse of
// what a missing change point means: the confidence values behind these
// verdicts are low, not high, and they measure an event that was never found.
// Each note names the reason rather than the absence.
const ABSENT_SCORE_NOTES: Partial<Record<VerdictType, string>> = {
  PRE_EXISTING_STRUCTURE:
    'This verdict rests on the signal level, not on a dated event, so there is no change point to score. The readings below carry the evidence.',
  NO_CHANGE_DETECTED:
    'No change point was found anywhere in the record, so there is nothing to score. That absence is itself the finding.',
  INSUFFICIENT_DATA:
    'No usable radar imagery covers this location and period, so nothing was measured and nothing can be scored.',
  LOCATION_MISMATCH:
    'The reading describes the wrong place, so scoring it would rate a claim this verdict has already withdrawn.',
};

const ABSENT_SCORE_FALLBACK =
  'The analysis did not settle on a single change point, so there is no detected start of work to score.';

const RING_RADIUS = 31;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ConfidenceRing({ confidence, accent }: { confidence: number; accent: string }) {
  const pct = Math.min(Math.max(confidence, 0), 1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  return (
    <svg width={76} height={76} viewBox="0 0 76 76" style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
      <circle cx={38} cy={38} r={RING_RADIUS} fill="none" stroke="var(--hairline)" strokeWidth={7} />
      <circle
        cx={38}
        cy={38}
        r={RING_RADIUS}
        fill="none"
        stroke={accent}
        strokeWidth={7}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)' }}
      />
      <text
        x={38}
        y={38}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: 'var(--ink)', fontFamily: FONT_HEADING, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

export default function VerdictBanner({ result }: { result: AnalysisResult }) {
  const cfg = CONFIG[result.verdict];
  const { Icon } = cfg;
  const { detected_date, days_difference: diff, confidence } = result.change_point;

  const OffsetIcon = diff !== null && diff < 0 ? ArrowLeft : ArrowRight;

  // A pre-existing structure is established by the signal level, not by a change
  // point — there is no construction event to date, which is the whole finding.
  // Showing the usual change-point tiles here would put an unrelated later date
  // beside a verdict about what stood before the contract.
  const prior = result.prior_structure;
  const isLevelEvidence = Boolean(prior?.exists_before_ntp);

  // A rejected coordinate keeps its change point in the payload on purpose, so
  // the chart can still show what is actually at the point. Scoring that change
  // point is a different matter: this verdict says the reading describes the
  // wrong place, so a confidence figure beside it would rate a claim the card
  // has just withdrawn. The backend already blanks `days_difference` for the
  // same reason; the ring keys off `detected_date` and was missed.
  const isRejectedLocation = result.verdict === 'LOCATION_MISMATCH';

  const isConfidenceScored = Boolean(detected_date) && !isLevelEvidence && !isRejectedLocation;

  return (
    <div style={{ paddingTop: '32px', fontFamily: FONT_HEADING }}>
      <div
        style={{
          background: 'var(--canvas)',
          border: '1px solid var(--hairline)',
          borderRadius: '20px',
          padding: '20px 24px',
        }}
      >
        {/* Verdict + confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <span
              className={`verdict-flag ${cfg.className}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: `color-mix(in srgb, ${cfg.accent} 12%, transparent)`,
                color: cfg.accent,
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              <Icon size={17} weight="fill" style={{ flexShrink: 0 }} />
              {cfg.label}
            </span>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: '13px',
                lineHeight: 1.55,
                fontFamily: FONT_BODY,
                color: 'var(--body)',
                maxWidth: '46ch',
              }}
            >
              {cfg.summary}
            </p>
          </div>

          {/* The ring scores the change point. A level-based verdict has no
              change point behind it, so showing that number here would rate
              confidence in a shift the finding does not rest on. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'var(--canvas-soft)',
              borderRadius: '16px',
              padding: '16px 20px',
              flex: '0 1 auto',
            }}
          >
            {isConfidenceScored ? (
              <>
                <ConfidenceRing confidence={confidence} accent={cfg.accent} />
                <div style={{ maxWidth: '160px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>Detector confidence</div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45, fontFamily: FONT_BODY, color: 'var(--mute)' }}>
                    Probability the radar shift represents physical construction
                  </div>
                </div>
              </>
            ) : (
              <>
                <Question size={22} weight="regular" style={{ flexShrink: 0, color: 'var(--mute)' }} />
                <div style={{ maxWidth: '250px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>No confidence score</div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45, fontFamily: FONT_BODY, color: 'var(--mute)' }}>
                    {ABSENT_SCORE_NOTES[result.verdict] ?? ABSENT_SCORE_FALLBACK}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <DataTile
            icon={<MapPin size={14} weight="regular" />}
            label="Coordinates"
            value={formatCoordinates(result.coordinates.lat, result.coordinates.lon)}
          />
          <DataTile icon={<Calendar size={14} weight="regular" />} label="Claimed NTP" value={formatFullDate(result.claimed_date)} />
          {isLevelEvidence ? (
            <>
              <DataTile
                icon={<Broadcast size={14} weight="regular" />}
                label="Signal before NTP"
                value={`${prior!.pre_ntp_db} dB above surroundings`}
                accent={cfg.accent}
              />
              <DataTile
                icon={<ArrowRight size={14} weight="regular" />}
                label="Change during contract"
                value={`${prior!.rise_db! >= 0 ? '+' : ''}${prior!.rise_db} dB`}
              />
            </>
          ) : (
            <>
              <DataTile
                icon={<Broadcast size={14} weight="regular" />}
                label="Detected change"
                value={detected_date ? formatFullDate(detected_date) : 'None detected'}
                muted={!detected_date}
              />
              {diff !== null && (
                <DataTile
                  icon={<OffsetIcon size={14} weight="regular" />}
                  label={diff < 0 ? 'Days before NTP' : 'Days after NTP'}
                  value={`${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'day' : 'days'}`}
                  accent={cfg.accent}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DataTile({
  icon,
  label,
  value,
  accent,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'var(--canvas-soft)',
        borderRadius: '14px',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', color: accent ?? 'var(--mute)' }}>
        <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span className="t-micro-cap" style={{ fontSize: '12px', fontFamily: FONT_BODY, color: accent ?? 'var(--mute)' }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 500,
          fontFamily: FONT_HEADING,
          letterSpacing: '-0.01em',
          color: accent ?? (muted ? 'var(--mute)' : 'var(--ink)'),
        }}
      >
        {value}
      </div>
    </div>
  );
}