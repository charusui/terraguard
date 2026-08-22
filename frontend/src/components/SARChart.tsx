'use client';

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ReferenceDot, ResponsiveContainer,
} from 'recharts';
import { type AnalysisResult } from '@/lib/mockData';

// Requires 'IBM Plex Sans' (400/500/600) and 'Roboto' (400/500) loaded app-wide,
// e.g. via next/font/google in app/layout.tsx.
const FONT_HEADING = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

type SeriesPoint = AnalysisResult['series'][number];

function formatFullDate(value: string | number): string {
  return new Date(value).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatMonthYear(ms: number): string {
  return new Date(ms).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// Interpolates the smoothed value at an arbitrary date so annotation dots land
// exactly on the trend line even when that date falls between two SAR passes.
function getSmoothedAtDate(series: SeriesPoint[], dateStr: string): number {
  const targetMs = new Date(dateStr).getTime();
  const sorted = [...series].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const p of sorted) {
    if (new Date(p.date).getTime() === targetMs) return p.smoothed_db;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const t1 = new Date(sorted[i].date).getTime();
    const t2 = new Date(sorted[i + 1].date).getTime();
    if (targetMs >= t1 && targetMs <= t2) {
      const frac = (targetMs - t1) / (t2 - t1);
      return sorted[i].smoothed_db + frac * (sorted[i + 1].smoothed_db - sorted[i].smoothed_db);
    }
  }
  return targetMs < new Date(sorted[0].date).getTime() ? sorted[0].smoothed_db : sorted[sorted.length - 1].smoothed_db;
}

function WarningIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}) => {
  if (!active || !payload?.length || label === undefined) return null;

  const rows: Array<{ value: number; dataKey: string }> = [];
  const seenKeys = new Set<string>();
  for (const p of payload) {
    if (!seenKeys.has(p.dataKey)) {
      seenKeys.add(p.dataKey);
      rows.push(p);
    }
  }
  rows.sort((a, b) => (a.dataKey === 'smoothed_db' ? -1 : 1) - (b.dataKey === 'smoothed_db' ? -1 : 1));

  return (
    <div
      style={{
        background: 'var(--canvas)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        fontFamily: FONT_HEADING,
        minWidth: '140px',
      }}
    >
      <div style={{ color: 'var(--mute)', marginBottom: '6px', fontSize: '11px' }}>{formatFullDate(label)}</div>
      {rows.map(p => (
        <div
          key={p.dataKey}
          style={{
            color: p.dataKey === 'smoothed_db' ? 'var(--ink)' : 'var(--mute)',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <span>{p.dataKey === 'smoothed_db' ? 'Smoothed' : 'Raw'}</span>
          <span>{typeof p.value === 'number' ? p.value.toFixed(2) : '—'} dB</span>
        </div>
      ))}
    </div>
  );
};

export default function SARChart({ result }: { result: AnalysisResult }) {
  const { series, claimed_date, change_point, verdict } = result;

  const chartData = series.map(p => ({ ...p, dateMs: new Date(p.date).getTime() }));
  const claimedMs = new Date(claimed_date).getTime();

  const changeColor =
    verdict === 'PRE_EXISTING' ? 'var(--error)' : verdict === 'CONSISTENT' ? 'var(--success)' : 'var(--warning)';
  const verdictLabel =
    verdict === 'PRE_EXISTING' ? 'Pre-existing' : verdict === 'CONSISTENT' ? 'Consistent' : 'Needs review';
  const VerdictIcon = verdict === 'CONSISTENT' ? CheckIcon : WarningIcon;

  const yMin = Math.floor(Math.min(...series.map(p => p.backscatter_db))) - 1;
  const yMax = Math.ceil(Math.max(...series.map(p => p.backscatter_db))) + 1;

  return (
    <div
      style={{
        background: 'var(--canvas)',
        border: '1px solid var(--hairline)',
        borderRadius: '20px',
        padding: '20px 24px',
        fontFamily: FONT_HEADING,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div>
          <h3 style={{ margin: '0 0 5px', fontSize: '17px', fontWeight: 600, color: 'var(--ink)' }}>SAR backscatter analysis</h3>
          <p className="t-body" style={{ margin: 0, fontSize: '13px', color: 'var(--body)', fontFamily: FONT_BODY, maxWidth: '48ch' }}>
            This chart tracks <strong>radar surface roughness</strong> over time. A sudden permanent shift in the signal indicates when ground was broken.
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: `color-mix(in srgb, ${changeColor} 12%, transparent)`,
            color: changeColor,
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <VerdictIcon color={changeColor} />
          {verdictLabel}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        <div style={{ background: 'var(--canvas-soft)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--mute)', fontFamily: FONT_BODY, marginBottom: '3px' }}>Claimed NTP</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{formatFullDate(claimed_date)}</div>
        </div>
        {change_point.detected_date && (
          <div style={{ background: 'var(--canvas-soft)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--mute)', fontFamily: FONT_BODY, marginBottom: '3px' }}>Detected</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{formatFullDate(change_point.detected_date)}</div>
          </div>
        )}
        {change_point.detected_date && (
          <div style={{ background: 'var(--canvas-soft)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--mute)', fontFamily: FONT_BODY, marginBottom: '3px' }}>Confidence</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>{Math.round(change_point.confidence * 100)}%</div>
          </div>
        )}
        {change_point.detected_date && change_point.days_difference !== null && (
          <div style={{ background: 'var(--canvas-soft)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--mute)', fontFamily: FONT_BODY, marginBottom: '3px' }}>Offset</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: changeColor }}>{Math.abs(change_point.days_difference)} days</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--mute)', label: 'Raw VV backscatter', kind: 'dot' as const },
          { color: 'var(--ink)', label: 'Smoothed (rolling median)', kind: 'line' as const },
          { color: 'var(--mute)', label: 'Claimed NTP date', kind: 'dash' as const },
          ...(change_point.detected_date ? [{ color: changeColor, label: 'Detected change point', kind: 'line' as const }] : []),
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {l.kind === 'dot' ? (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: l.color, opacity: 0.6, flexShrink: 0 }} />
            ) : (
              <span
                style={{
                  width: '14px',
                  height: '2px',
                  borderRadius: '1px',
                  background: l.kind === 'dash' ? 'none' : l.color,
                  borderTop: l.kind === 'dash' ? `2px dashed ${l.color}` : 'none',
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 500, fontFamily: FONT_BODY }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--canvas-soft)', borderRadius: '16px', padding: '16px 12px 4px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 36, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--hairline)" vertical={false} />
            <XAxis
              dataKey="dateMs"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickCount={5}
              tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: FONT_HEADING }}
              tickLine={false}
              axisLine={{ stroke: 'var(--hairline-strong)' }}
              tickFormatter={formatMonthYear}
              dy={10}
            />
            <YAxis
              tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: FONT_HEADING }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)} dB`}
              domain={[yMin, yMax]}
              width={54}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--mute)', strokeWidth: 1 }} />

            {change_point.detected_date && (
              <ReferenceArea x1={claimedMs} x2={new Date(change_point.detected_date).getTime()} fill={changeColor} fillOpacity={0.06} />
            )}

            {/* baseValue="dataMin" — SAR backscatter is always negative dB
                (see mockData's baseLevel), so the implicit default
                baseline of 0 sits above the whole y-domain. Without this,
                the "area under the curve" fills from the line to the top
                of the chart instead of a thin band beneath it. */}
            <Area type="monotone" dataKey="smoothed_db" baseValue="dataMin" stroke="none" fill="var(--ink)" fillOpacity={0.07} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="backscatter_db"
              stroke="none"
              dot={{ r: 2.5, fill: 'var(--mute)', fillOpacity: 0.5, strokeWidth: 0 }}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="smoothed_db"
              stroke="var(--ink)"
              dot={false}
              strokeWidth={2.5}
              strokeLinecap="round"
              animationDuration={900}
              animationEasing="ease-out"
            />

            <ReferenceLine
              x={claimedMs}
              stroke="var(--mute)"
              strokeDasharray="1 4"
              strokeWidth={1.5}
              strokeLinecap="round"
              label={{ value: 'NTP', fill: 'var(--mute)', fontSize: 11, fontWeight: 600, fontFamily: FONT_HEADING, position: 'top', dy: -20 }}
            />
            {change_point.detected_date && (
              <ReferenceLine
                x={new Date(change_point.detected_date).getTime()}
                stroke={changeColor}
                strokeWidth={2}
                strokeLinecap="round"
                label={{ value: 'Detected', fill: changeColor, fontSize: 11, fontWeight: 600, fontFamily: FONT_HEADING, position: 'top', dy: -6 }}
              />
            )}

            <ReferenceDot x={claimedMs} y={getSmoothedAtDate(series, claimed_date)} r={5} fill="var(--ink)" stroke="var(--canvas-soft)" strokeWidth={2.5} />
            {change_point.detected_date && (
              <ReferenceDot
                x={new Date(change_point.detected_date).getTime()}
                y={getSmoothedAtDate(series, change_point.detected_date)}
                r={5}
                fill={changeColor}
                stroke="var(--canvas-soft)"
                strokeWidth={2.5}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Callout */}
      {change_point.detected_date && change_point.days_difference !== null && (
        <div
          style={{
            marginTop: '18px',
            padding: '14px 16px',
            background: `color-mix(in srgb, ${changeColor} 10%, transparent)`,
            borderRadius: '16px',
            fontSize: '13px',
            lineHeight: 1.55,
            color: changeColor,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontFamily: FONT_BODY,
          }}
        >
          <span style={{ marginTop: '1px', flexShrink: 0 }}>
            <VerdictIcon color={changeColor} size={16} />
          </span>
          <span>
            Backscatter shifts beginning {formatFullDate(change_point.detected_date)} — {Math.abs(change_point.days_difference)} days{' '}
            {change_point.days_difference < 0 ? 'before' : 'after'} the claimed NTP date of {formatFullDate(claimed_date)}. Sentinel-1 revisit
            tolerance is ±12 days.
          </span>
        </div>
      )}
    </div>
  );
}