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
      background: '#0d0d0d',
      border: '1px solid #2a2a2f',
      borderRadius: '4px',
      padding: '10px 14px',
      fontSize: '12px',
    }}>
      <div style={{ color: '#a0a0aa', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.dataKey === 'smoothed_db' ? '#00c4b4' : '#3a3a3f', fontWeight: 400 }}>
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

  const changeColor = verdict === 'PRE_EXISTING' ? '#f87171' : verdict === 'CONSISTENT' ? '#4ade80' : '#fbbf24';
  const yMin = Math.floor(Math.min(...series.map(p => p.backscatter_db))) - 1;
  const yMax = Math.ceil(Math.max(...series.map(p => p.backscatter_db))) + 1;

  return (
    <div>
      {/* Explainer */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: 'var(--on-primary-mute)', fontSize: '14px' }}>
          This chart tracks <strong>radar surface roughness</strong> over time. A sudden permanent shift in the signal indicates when ground was broken.
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(255,255,255,0.2)', label: 'Raw VV backscatter', dashed: false },
          { color: '#00c4b4', label: 'Smoothed (rolling median)', dashed: false },
          { color: '#ffffff', label: 'Claimed NTP date', dashed: true },
          ...(change_point.detected_date ? [{ color: changeColor, label: 'Detected change point', dashed: false }] : []),
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px', height: '1px',
              background: l.dashed ? 'none' : l.color,
              borderTop: l.dashed ? `1px dashed ${l.color}` : 'none',
            }} />
            <span style={{ fontSize: '11px', color: '#a0a0aa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{l.label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#a0a0aa', fontSize: 10, letterSpacing: '0.06em' }}
            tickLine={false}
            axisLine={{ stroke: '#2a2a2f' }}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
            }}
            interval={Math.floor(series.length / 7)}
          />
          <YAxis
            tick={{ fill: '#a0a0aa', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)} dB`}
            domain={[yMin, yMax]}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="backscatter_db" stroke="rgba(255,255,255,0.15)" dot={false} strokeWidth={1} connectNulls={false} />
          <Line type="monotone" dataKey="smoothed_db" stroke="#00c4b4" dot={false} strokeWidth={2} />
          {change_point.detected_date && (
            <ReferenceArea
              x1={claimed_date}
              x2={change_point.detected_date}
              fill={changeColor}
              fillOpacity={0.1}
            />
          )}
          <ReferenceLine x={claimed_date} stroke="rgba(255,255,255,0.5)" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: 'NTP', fill: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: '0.1em', position: 'top' }} />
          {change_point.detected_date && (
            <ReferenceLine x={change_point.detected_date} stroke={changeColor} strokeWidth={1.5}
              label={{ value: `Δ ${Math.round(change_point.confidence * 100)}%`, fill: changeColor, fontSize: 10, letterSpacing: '0.08em', position: 'top' }} />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Gap annotation */}
      {change_point.detected_date && change_point.days_difference !== null && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderLeft: `2px solid ${changeColor}`,
          background: 'rgba(255,255,255,0.02)',
          fontSize: '13px',
          color: '#a0a0aa',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ color: changeColor, fontWeight: 600 }}>
            {Math.abs(change_point.days_difference)} days {change_point.days_difference < 0 ? 'before' : 'after'} NTP
          </span>
          <span>— Sentinel-1 revisit tolerance ±12 days</span>
        </div>
      )}
    </div>
  );
}
