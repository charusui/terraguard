'use client';

import { type AnalysisResult, type VerdictType } from '@/lib/mockData';
import { WarningDiamond, CheckCircle, Question, ArrowRight } from '@phosphor-icons/react';

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
    accent: '#f87171',
  },
  NO_CHANGE_DETECTED: {
    Icon: Question,
    label: 'No Construction Change Detected',
    className: 'verdict-yellow',
    accent: '#fbbf24',
  },
  CONSISTENT: {
    Icon: CheckCircle,
    label: 'Timeline Consistent',
    className: 'verdict-green',
    accent: '#4ade80',
  },
};

export default function VerdictBanner({ result }: { result: AnalysisResult }) {
  const cfg = CONFIG[result.verdict];
  const { Icon } = cfg;
  const diff = result.change_point.days_difference;

  return (
    <div style={{ paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Verdict flag */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div className={`verdict-flag ${cfg.className}`} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
          <Icon size={13} weight="bold" />
          {cfg.label}
        </div>
        {result.change_point.detected_date && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="t-micro-cap" style={{ color: 'var(--ink-mute)' }}>Detector Confidence</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '32px',
              fontWeight: 700,
              lineHeight: 1,
              color: cfg.accent,
              letterSpacing: '0.02em',
              marginBottom: '4px'
            }}>
              {Math.round(result.change_point.confidence * 100)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--on-primary-mute)', maxWidth: '160px', lineHeight: 1.4, marginTop: '4px' }}>
              Probability that radar shift represents physical construction
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <p className="t-body-lg" style={{ maxWidth: '680px', color: 'var(--on-primary-mute)', whiteSpace: 'pre-wrap' }}>
        {result.explanation}
      </p>

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
          accent={result.change_point.detected_date ? cfg.accent : undefined}
          mono
        />
        {diff !== null && (
          <DataItem
            label={diff < 0 ? 'Days Before NTP' : 'Days After NTP'}
            value={`${Math.abs(diff)} days`}
            accent={diff < 0 ? '#f87171' : '#4ade80'}
          />
        )}
      </div>
    </div>
  );
}

function DataItem({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div>
      <div className="t-micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: '4px' }}>{label}</div>
      <div style={{
        fontSize: '14px',
        fontWeight: 400,
        fontFamily: mono ? 'monospace' : 'var(--font-body)',
        color: accent ?? 'var(--on-primary)',
        letterSpacing: mono ? '0.02em' : undefined,
      }}>{value}</div>
    </div>
  );
}
