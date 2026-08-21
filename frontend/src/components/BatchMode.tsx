'use client';

import { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { UploadSimple, Play, DownloadSimple, FileCsv } from '@phosphor-icons/react';
import { type AnalysisResult, type VerdictType, analyzeCoordinate } from '@/lib/mockData';
import LoadingState from './LoadingState';

interface BatchRow { name: string; lat: number; lon: number; claimed_ntp_date: string; }

const SAMPLE = `name,lat,lon,claimed_ntp_date
Bulacan Road Rehab A,14.9021,120.8456,2023-01-15
Bulacan Drainage B,14.8874,120.8312,2023-03-01
Davao Bridge Approach,7.1907,125.4553,2022-06-01
Manila Flood Control,14.5995,120.9842,2023-08-10
Quezon City Sidewalk,14.6760,121.0437,2022-11-20`;

function parseCSV(text: string): BatchRow[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return { name: row.name, lat: parseFloat(row.lat), lon: parseFloat(row.lon), claimed_ntp_date: row.claimed_ntp_date };
  }).filter(r => r.name && !isNaN(r.lat) && !isNaN(r.lon));
}

const VERDICT_CFG: Record<VerdictType, { label: string; cls: string }> = {
  PRE_EXISTING:      { label: 'Pre-Existing',  cls: 'verdict-red' },
  NO_CHANGE_DETECTED:{ label: 'No Change',     cls: 'verdict-yellow' },
  CONSISTENT:        { label: 'Consistent',    cls: 'verdict-green' },
};

export default function BatchMode() {
  const reduce = useReducedMotion();
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<AnalysisResult & { error?: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSample = () => { setCsv(SAMPLE); setRows(parseCSV(SAMPLE)); setResults([]); };
  const onPaste = (t: string) => { setCsv(t); try { setRows(parseCSV(t)); setResults([]); } catch { /* ignore */ } };
  const loadFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = ev => { const t = ev.target?.result as string; setCsv(t); setRows(parseCSV(t)); setResults([]); };
    reader.readAsText(f);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFile(f);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  const runBatch = async () => {
    setLoading(true); setProgress(0); setResults([]);
    const out: Array<AnalysisResult & { error?: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      setProgress(Math.round((i / rows.length) * 100));
      try {
        const res = await analyzeCoordinate(rows[i].lat, rows[i].lon, rows[i].claimed_ntp_date, rows[i].name);
        out.push(res);
      } catch (e) {
        out.push({ series: [], change_point: { detected_date: null, confidence: 0, days_difference: null }, verdict: 'NO_CHANGE_DETECTED', explanation: '', claimed_date: rows[i].claimed_ntp_date, coordinates: { lat: rows[i].lat, lon: rows[i].lon }, project_name: rows[i].name, error: e instanceof Error ? e.message : 'Error' });
      }
      setResults([...out]);
    }
    setProgress(100); setLoading(false);
  };

  const exportToCsv = () => {
    if (results.length === 0) return;
    const headers = ['Project', 'Latitude', 'Longitude', 'Claimed NTP', 'Detected Change', 'Confidence (%)', 'Verdict', 'Days Difference'];
    const rows = results.map(r => [
      `"${r.project_name}"`,
      r.coordinates.lat,
      r.coordinates.lon,
      r.claimed_date,
      r.change_point.detected_date || 'None',
      r.change_point.detected_date ? Math.round(r.change_point.confidence * 100) : '',
      r.verdict,
      r.change_point.days_difference ?? ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'terraguard_batch_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const counts = { pre: results.filter(r => r.verdict === 'PRE_EXISTING').length, no: results.filter(r => r.verdict === 'NO_CHANGE_DETECTED').length, ok: results.filter(r => r.verdict === 'CONSISTENT').length };

  return (
    <div style={{ paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Section header */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="t-display-sm" style={{ marginBottom: '6px', fontFamily: "'IBM Plex Sans', sans-serif" }}>Batch Analysis</h2>
        <p className="t-body" style={{ color: 'var(--body)', fontFamily: "'Roboto', sans-serif" }}>
          Upload or paste a CSV to audit multiple projects against their contract dates in one pass.
        </p>
      </motion.div>

      {/* Upload area — a drop zone, not just an upload button */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          padding: '24px',
          background: dragOver ? 'var(--canvas-soft-2)' : 'var(--canvas-soft)',
          border: `1px dashed ${dragOver ? 'var(--ink)' : 'var(--hairline-strong)'}`,
          borderRadius: '10px',
          transition: 'background-color 0.15s ease, border-color 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--canvas)', border: '1px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--mute)' }}>
              <FileCsv size={16} weight="bold" />
            </div>
            <div>
              <p className="t-micro-cap" style={{ marginBottom: '4px', fontFamily: "'Roboto', sans-serif" }}>CSV Format</p>
              <code style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>name, lat, lon, claimed_ntp_date</code>
              <p className="t-caption" style={{ marginTop: '4px', fontFamily: "'Roboto', sans-serif" }}>Drag a file in, paste below, or load a sample set.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn-ghost" onClick={loadSample} style={{ padding: '8px 16px', height: '36px', fontFamily: "'Roboto', sans-serif" }}>
              Load Sample
            </button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', height: '36px', fontFamily: "'Roboto', sans-serif" }}>
              <UploadSimple size={14} weight="bold" /> Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" onChange={onFile} style={{ display: 'none' }} />
          </div>
        </div>
        <textarea
          className="field"
          value={csv}
          onChange={e => onPaste(e.target.value)}
          rows={7}
          placeholder="Paste CSV here or click Load Sample..."
          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', resize: 'vertical', lineHeight: '1.6' }}
        />
        {rows.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span className="t-body" style={{ color: 'var(--mute)', fontFamily: "'Roboto', sans-serif" }}>{rows.length} project{rows.length !== 1 ? 's' : ''} ready</span>
            <button className="btn-ghost btn-ghost-accent" onClick={runBatch} disabled={loading} style={{ fontFamily: "'Roboto', sans-serif" }}>
              <Play size={14} weight="fill" />
              {loading ? 'Analyzing...' : `Analyze All (${rows.length})`}
            </button>
          </div>
        )}
      </motion.div>

      {/* Progress */}
      {loading && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <LoadingState label="Processing batch" />
            <span className="loading-elapsed">{progress}%</span>
          </div>
          <div style={{ height: '2px', background: 'var(--canvas-soft-2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--ink)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
          <p className="t-caption" style={{ fontFamily: "'Roboto', sans-serif" }}>{results.length}/{rows.length} complete · errors skipped</p>
        </motion.div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--hairline)', border: '1px solid var(--hairline)', borderRadius: '8px', overflow: 'hidden' }}>
          {([
            { label: 'Pre-Existing', val: counts.pre, color: 'var(--error)' },
            { label: 'No Change', val: counts.no, color: 'var(--warning)' },
            { label: 'Consistent', val: counts.ok, color: 'var(--success)' },
          ] as { label: string; val: number; color: string }[]).map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'var(--canvas)', padding: '24px', textAlign: 'center' }}
            >
              <div className="stat-num" style={{ color: s.color }}>{s.val}</div>
              <div className="t-micro-cap" style={{ marginTop: '8px', fontFamily: "'Roboto', sans-serif" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-ghost" onClick={exportToCsv} style={{ height: '36px', fontFamily: "'Roboto', sans-serif" }}>
              <DownloadSimple size={14} weight="bold" /> Export CSV
            </button>
          </div>
          <div style={{ border: '1px solid var(--hairline)', borderRadius: '8px', overflowX: 'auto', background: 'var(--canvas)' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['#', 'Project', 'Coordinates', 'Claimed NTP', 'Detected', 'Confidence', 'Verdict'].map(h => (
                  <th key={h} style={{ fontFamily: "'Roboto', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const v = VERDICT_CFG[r.verdict];
                return (
                  <motion.tr
                    key={i}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.6) }}
                  >
                    <td style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ fontWeight: 500, maxWidth: '200px', fontFamily: "'Roboto', sans-serif" }}>{r.project_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{r.coordinates.lat.toFixed(4)}, {r.coordinates.lon.toFixed(4)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{r.claimed_date}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{r.change_point.detected_date ?? '—'}</td>
                    <td>{r.change_point.detected_date ? <span style={{ color: 'var(--ink)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{Math.round(r.change_point.confidence * 100)}%</span> : <span style={{ color: 'var(--mute)' }}>—</span>}</td>
                    <td>
                      {r.error
                        ? <span className="verdict-flag verdict-red" style={{ fontSize: '11px', fontFamily: "'Roboto', sans-serif" }}>Error</span>
                        : <span className={`verdict-flag ${v.cls}`} style={{ fontSize: '11px', fontFamily: "'Roboto', sans-serif" }}>{v.label}</span>
                      }
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
