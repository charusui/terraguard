'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { type AnalysisResult } from '@/lib/mockData';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--canvas)',
      border: '1px solid var(--hairline-strong)',
      borderRadius: '6px',
      padding: '10px 14px',
      fontSize: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      fontFamily: 'var(--font-mono)'
    }}>
      <div style={{ color: 'var(--mute)', marginBottom: '6px', fontSize: '11px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.dataKey === 'smoothed_db' ? 'var(--ink)' : 'var(--mute)', fontWeight: 500 }}>
          {p.dataKey === 'smoothed_db' ? 'Smoothed' : 'Raw'}: {typeof p.value === 'number' ? p.value.toFixed(2) : '—'} dB
        </div>
      ))}
    </div>
  );
};

export default function SARChart({ result }: { result: AnalysisResult }) {
  const { series, claimed_date, change_point, verdict } = result;
  const chartData = series.map((p, i) => ({
    ...p,
    backscatter_db: i % 2 === 0 ? p.backscatter_db : undefined,
  }));

  // Match Vercel CSS variables directly (or approximate via hex if recharts requires strict hex, 
  // but CSS variables generally work fine in Recharts SVG props)
  const changeColor = verdict === 'PRE_EXISTING' ? 'var(--error)' : verdict === 'CONSISTENT' ? 'var(--success)' : 'var(--warning)';
  const yMin = Math.floor(Math.min(...series.map(p => p.backscatter_db))) - 1;
  const yMax = Math.ceil(Math.max(...series.map(p => p.backscatter_db))) + 1;

  return (
    <div>
      {/* Explainer */}
      <div style={{ marginBottom: '24px' }}>
        <div className="t-body" style={{ color: 'var(--body)', fontFamily: "'Roboto', sans-serif" }}>
          This chart tracks <strong>radar surface roughness</strong> over time. A sudden permanent shift in the signal indicates when ground was broken.
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--hairline-strong)', label: 'Raw VV backscatter', dashed: false },
          { color: 'var(--ink)', label: 'Smoothed (rolling median)', dashed: false },
          { color: 'var(--mute)', label: 'Claimed NTP date', dashed: true },
          ...(change_point.detected_date ? [{ color: changeColor, label: 'Detected change point', dashed: false }] : []),
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px', height: '2px',
              background: l.dashed ? 'none' : l.color,
              borderTop: l.dashed ? `2px dashed ${l.color}` : 'none',
            }} />
            <span style={{ fontSize: '12px', color: 'var(--mute)', fontWeight: 500, fontFamily: "'Roboto', sans-serif" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: '8px', padding: '24px 24px 16px 8px' }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--hairline)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--hairline-strong)' }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
              }}
              interval={Math.floor(series.length / 7)}
              dy={10}
            />
            <YAxis
              tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)} dB`}
              domain={[yMin, yMax]}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="backscatter_db" stroke="var(--hairline-strong)" dot={false} strokeWidth={1.5} connectNulls={false} />
            <Line type="monotone" dataKey="smoothed_db" stroke="var(--ink)" dot={false} strokeWidth={2.5} />
            {change_point.detected_date && (
              <ReferenceArea
                x1={claimed_date}
                x2={change_point.detected_date}
                fill={changeColor}
                fillOpacity={0.05}
              />
            )}
            <ReferenceLine x={claimed_date} stroke="var(--mute)" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: 'NTP', fill: 'var(--mute)', fontSize: 11, fontWeight: 500, fontFamily: "'Roboto', sans-serif", position: 'top', dy: -10 }} />
            {change_point.detected_date && (
              <ReferenceLine x={change_point.detected_date} stroke={changeColor} strokeWidth={2}
                label={{ value: `Δ ${Math.round(change_point.confidence * 100)}%`, fill: changeColor, fontSize: 11, fontWeight: 600, fontFamily: "'Roboto', sans-serif", position: 'top', dy: -10 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gap annotation */}
      {change_point.detected_date && change_point.days_difference !== null && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderLeft: `3px solid ${changeColor}`,
          background: 'var(--canvas-soft)',
          borderRadius: '0 4px 4px 0',
          fontSize: '14px',
          color: 'var(--body)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: "'Roboto', sans-serif"
        }}>
          <span style={{ color: changeColor, fontWeight: 600 }}>
            {Math.abs(change_point.days_difference)} days {change_point.days_difference < 0 ? 'before' : 'after'} NTP
          </span>
          <span style={{ color: 'var(--mute)' }}>— Sentinel-1 revisit tolerance ±12 days</span>
        </div>
      )}
    </div>
  );
}
