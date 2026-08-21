'use client';

import { type AnalysisResult, type VerdictType } from '@/lib/mockData';
import { WarningDiamond, CheckCircle, Question } from '@phosphor-icons/react';

const CONFIG: Record<VerdictType, {
  Icon: React.ElementType;
  label: string;
  className: string;
  accent: string;
}> = {
  PRE_EXISTING: {
    Icon: WarningDiamond,
    label: 'Pre-Existing Structure Detected',
    className: 'verdict-red',
    accent: 'var(--error)',
  },
  NO_CHANGE_DETECTED: {
    Icon: Question,
    label: 'No Construction Change Detected',
    className: 'verdict-yellow',
    accent: 'var(--warning)',
  },
  CONSISTENT: {
    Icon: CheckCircle,
    label: 'Timeline Consistent',
    className: 'verdict-green',
    accent: 'var(--success)',
  },
};

export default function VerdictBanner({ result }: { result: AnalysisResult }) {
  const cfg = CONFIG[result.verdict];
  const { Icon } = cfg;
  const diff = result.change_point.days_difference;

  return (
    <div style={{ paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Verdict flag */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div className={`verdict-flag ${cfg.className}`} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
          <Icon size={16} weight="fill" />
          {cfg.label}
        </div>
        {result.change_point.detected_date && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="t-micro-cap" style={{ fontFamily: "'Roboto', sans-serif" }}>Detector Confidence</div>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '32px',
              fontWeight: 600,
              lineHeight: 1,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              marginBottom: '4px'
            }}>
              {Math.round(result.change_point.confidence * 100)}%
            </div>
            <div style={{ fontSize: '13px', color: 'var(--mute)', maxWidth: '160px', lineHeight: 1.4, marginTop: '4px', fontFamily: "'Roboto', sans-serif" }}>
              Probability that radar shift represents physical construction
            </div>
          </div>
        )}
      </div>

      {/* Data strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '24px',
        paddingTop: '24px',
        borderTop: '1px solid var(--hairline)',
      }}>
        <DataItem label="Coordinates" value={`${result.coordinates.lat.toFixed(4)}°N, ${result.coordinates.lon.toFixed(4)}°E`} mono />
        <DataItem label="Claimed NTP" value={result.claimed_date} mono />
        <DataItem
          label="Detected Change"
          value={result.change_point.detected_date ?? 'None'}
          accent={result.change_point.detected_date ? 'var(--ink)' : undefined}
          mono
        />
        {diff !== null && (
          <DataItem
            label={diff < 0 ? 'Days Before NTP' : 'Days After NTP'}
            value={`${Math.abs(diff)} days`}
            accent={diff < 0 ? 'var(--error)' : 'var(--success)'}
            mono
          />
        )}
      </div>
    </div>
  );
}

function DataItem({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div>
      <div className="t-micro-cap" style={{ marginBottom: '4px', fontFamily: "'Roboto', sans-serif" }}>{label}</div>
      <div style={{
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
        color: accent ?? 'var(--ink)',
        letterSpacing: mono ? '0.02em' : undefined,
      }}>{value}</div>
    </div>
  );
}
