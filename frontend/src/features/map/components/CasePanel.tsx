'use client';

import { ArrowLeft, ArrowSquareOut, User } from '@phosphor-icons/react';
import { type MapCase, type InvestigationStatus, STATUS_CONFIG } from '../types/mapCase';
import { type VerdictType } from '@/lib/mockData';
import VerdictBanner from '@/components/VerdictBanner';
import SARChart from '@/components/SARChart';
import SatelliteCompare from './SatelliteCompare';

// ─── Design tokens ─────────────────────────────────────────────────────────
const FONT      = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

const S = { '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '20px', '6': '24px', '7': '28px', '8': '32px' } as const;

const sectionLabel: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mute)',
  fontFamily: FONT,
  marginBottom: S['2'],
};

// ─── Verdict meta ───────────────────────────────────────────────────────────
const VERDICT_COLOR: Record<VerdictType, string> = {
  PRE_EXISTING_STRUCTURE: 'var(--error)',
  EARLY_START:            'var(--error)',
  NO_CHANGE_DETECTED:     'var(--warning)',
  LOCATION_MISMATCH:      'var(--warning)',
  DELAYED_START:          'var(--warning)',
  INSUFFICIENT_DATA:      'var(--mute)',
  CONSISTENT:             'var(--success)',
};

const VERDICT_BG: Record<VerdictType, string> = {
  PRE_EXISTING_STRUCTURE: 'color-mix(in srgb, var(--error) 10%, transparent)',
  EARLY_START:            'color-mix(in srgb, var(--error) 10%, transparent)',
  NO_CHANGE_DETECTED:     'color-mix(in srgb, var(--warning) 10%, transparent)',
  LOCATION_MISMATCH:      'color-mix(in srgb, var(--warning) 10%, transparent)',
  DELAYED_START:          'color-mix(in srgb, var(--warning) 10%, transparent)',
  INSUFFICIENT_DATA:      'color-mix(in srgb, var(--mute) 10%, transparent)',
  CONSISTENT:             'color-mix(in srgb, var(--success) 10%, transparent)',
};

const VERDICT_LABEL: Record<VerdictType, string> = {
  PRE_EXISTING_STRUCTURE: 'Pre-existing structure',
  EARLY_START:            'Early start',
  NO_CHANGE_DETECTED:     'No change detected',
  LOCATION_MISMATCH:      'Location mismatch',
  DELAYED_START:          'Delayed start',
  INSUFFICIENT_DATA:      'Insufficient data',
  CONSISTENT:             'Consistent',
};

function Divider() {
  return <div style={{ height: '1px', background: 'var(--hairline)', margin: `${S['6']} 0` }} />;
}

const STATUS_ICONS: Record<InvestigationStatus, string> = {
  new:                '○',
  under_investigation:'◑',
  escalated:          '▲',
  done:               '✓',
};

// ─── Case list ──────────────────────────────────────────────────────────────
function CaseList({ cases, onSelect }: { cases: MapCase[]; onSelect: (id: string) => void }) {
  if (cases.length === 0) {
    return (
      <div style={{ padding: `${S['8']} ${S['5']}`, textAlign: 'center', color: 'var(--mute)', fontFamily: FONT_BODY, fontSize: '13px', lineHeight: 1.6 }}>
        No locations match the current filter.
        <br />
        <span style={{ fontSize: '12px' }}>Try changing the owner or search query.</span>
      </div>
    );
  }
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {cases.map((c, i) => {
        const color = VERDICT_COLOR[c.analysisResult.verdict];
        const statusCfg = STATUS_CONFIG[c.status];
        return (
          <button
            key={c.id}
            id={`case-list-item-${c.id}`}
            onClick={() => onSelect(c.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: S['3'],
              width: '100%', padding: `${S['4']} ${S['5']}`,
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--hairline)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--canvas-soft)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
          >
            <span style={{ fontSize: '11px', color: 'var(--mute)', fontFamily: FONT, width: '16px', flexShrink: 0, paddingTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}
            </span>
            <svg width="14" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" fill={color} />
              <circle cx="12" cy="10" r="3" fill="rgba(255,255,255,0.9)" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', fontFamily: FONT, lineHeight: 1.35, marginBottom: S['1'], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.analysisResult.project_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: S['2'], flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color, fontFamily: FONT }}>
                  {VERDICT_LABEL[c.analysisResult.verdict]}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--mute)' }}>·</span>
                <span style={{ fontSize: '11px', color: 'var(--mute)', fontFamily: FONT_BODY }}>
                  {c.isCurrentUser ? 'You' : c.owner}
                </span>
              </div>
              <div style={{ marginTop: S['1'] }}>
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: statusCfg.bg, color: statusCfg.color, fontFamily: FONT }}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Case detail — fully scrollable, no locked sections ─────────────────────
function CaseDetail({
  mapCase,
  onClose,
  onStatusChange,
}: {
  mapCase: MapCase;
  onClose: () => void;
  onStatusChange: (id: string, status: InvestigationStatus) => void;
}) {
  const verdict = mapCase.analysisResult.verdict;

  return (
    // Single scrollable container — no sticky sub-header
    <div style={{ overflowY: 'auto', height: '100%', padding: S['5'] }}>

      {/* Back */}
      <button
        id="case-panel-back-btn"
        onClick={onClose}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: S['1'],
          padding: `${S['1']} ${S['2']}`, marginBottom: S['5'],
          borderRadius: '7px', border: '1px solid var(--hairline)',
          background: 'var(--canvas-soft)', cursor: 'pointer',
          color: 'var(--mute)', fontSize: '12px', fontFamily: FONT,
          transition: 'color 0.12s, border-color 0.12s',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = 'var(--ink)'; el.style.borderColor = 'var(--hairline-strong)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = 'var(--mute)'; el.style.borderColor = 'var(--hairline)'; }}
      >
        <ArrowLeft size={11} weight="bold" /> Back
      </button>

      {/* ── Title block ── */}
      <div style={{ marginBottom: S['5'] }}>
        <h2 style={{ margin: `0 0 ${S['2']}`, fontSize: '15px', fontWeight: 700, color: 'var(--ink)', fontFamily: FONT, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {mapCase.analysisResult.project_name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: S['2'], flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--mute)', background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: '9999px', padding: `1px ${S['2']}`, fontFamily: FONT }}>
            <User size={10} />{mapCase.isCurrentUser ? 'You' : mapCase.owner}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--mute)', fontFamily: FONT_BODY }}>
            {mapCase.analysisResult.coordinates.lat.toFixed(4)}°N,&nbsp;
            {mapCase.analysisResult.coordinates.lon.toFixed(4)}°E
          </span>
        </div>
      </div>

      {/* ── Verdict chip ── */}
      <div style={{ marginBottom: S['5'] }}>
        <div style={sectionLabel}>Verdict</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: S['2'], padding: `${S['2']} ${S['3']}`, borderRadius: '9999px', background: VERDICT_BG[verdict], border: `1.5px solid ${VERDICT_COLOR[verdict]}` }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: VERDICT_COLOR[verdict], flexShrink: 0, display: 'block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: VERDICT_COLOR[verdict], fontFamily: FONT, letterSpacing: '-0.01em' }}>
            {VERDICT_LABEL[verdict]}
          </span>
        </div>
      </div>

      {/* ── Investigation status ── */}
      <div style={{ marginBottom: S['5'] }}>
        <div style={sectionLabel}>Investigation status</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S['2'] }}>
          {(Object.keys(STATUS_CONFIG) as InvestigationStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            const isActive = mapCase.status === s;
            return (
              <button
                key={s}
                id={`status-btn-${s}`}
                onClick={() => onStatusChange(mapCase.id, s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: S['2'],
                  padding: `${S['3']} ${S['3']}`,
                  borderRadius: '10px',
                  border: isActive ? `2px solid ${cfg.color}` : '2px solid var(--hairline)',
                  background: isActive ? cfg.bg : 'var(--canvas-soft)',
                  color: isActive ? cfg.color : 'var(--mute)',
                  fontSize: '12px', fontWeight: isActive ? 700 : 500,
                  fontFamily: FONT, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.14s ease',
                  boxShadow: isActive ? `0 0 0 3px ${cfg.color}20` : 'none',
                  lineHeight: 1.2,
                }}
                onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = cfg.color; el.style.color = cfg.color; el.style.background = cfg.bg; } }}
                onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--hairline)'; el.style.color = 'var(--mute)'; el.style.background = 'var(--canvas-soft)'; } }}
              >
                <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0, fontFamily: 'monospace' }}>{STATUS_ICONS[s]}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* ── Summary ── */}
      <div style={{ marginBottom: S['5'] }}>
        <div style={sectionLabel}>Summary</div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, color: 'var(--body)', fontFamily: FONT_BODY }}>
          {mapCase.description}
        </p>
      </div>

      <Divider />

      {/* ── Satellite imagery ── */}
      <div style={{ marginBottom: S['5'] }}>
        <div style={sectionLabel}>Satellite imagery — location reference</div>
        <SatelliteCompare
          lat={mapCase.analysisResult.coordinates.lat}
          lon={mapCase.analysisResult.coordinates.lon}
          ntpDate={mapCase.analysisResult.claimed_date}
          detectedDate={mapCase.analysisResult.change_point.detected_date}
        />
      </div>

      <Divider />

      {/* ── Machine analysis ── */}
      <div style={{ marginBottom: S['5'] }}>
        <div style={sectionLabel}>Machine analysis</div>
        <VerdictBanner result={mapCase.analysisResult} />
        <div style={{ marginTop: S['5'] }}>
          <SARChart result={mapCase.analysisResult} />
        </div>
      </div>

      <Divider />

      {/* ── Source ── */}
      <div>
        <div style={sectionLabel}>Source</div>
        <a
          href={mapCase.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: S['2'],
            fontSize: '12px', color: 'var(--mute)', textDecoration: 'none',
            padding: `${S['2']} ${S['3']}`, borderRadius: '8px',
            border: '1px solid var(--hairline)', background: 'var(--canvas-soft)',
            fontFamily: FONT_BODY, transition: 'color 0.12s, border-color 0.12s',
          }}
          onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.color = 'var(--ink)'; a.style.borderColor = 'var(--hairline-strong)'; }}
          onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.color = 'var(--mute)'; a.style.borderColor = 'var(--hairline)'; }}
        >
          <ArrowSquareOut size={12} />
          {mapCase.sourceLabel}
        </a>
      </div>

      {/* Bottom breathing room */}
      <div style={{ height: S['8'] }} />
    </div>
  );
}

// ─── Props + export ──────────────────────────────────────────────────────────
interface CasePanelProps {
  cases: MapCase[];
  selectedCase: MapCase | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onStatusChange: (id: string, status: InvestigationStatus) => void;
}

export default function CasePanel({ cases, selectedCase, selectedId, onSelect, onClose, onStatusChange }: CasePanelProps) {
  if (selectedCase) {
    return <CaseDetail mapCase={selectedCase} onClose={onClose} onStatusChange={onStatusChange} />;
  }
  return <CaseList cases={cases} onSelect={onSelect} />;
}
