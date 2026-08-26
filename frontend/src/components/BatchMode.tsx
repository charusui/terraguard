'use client';

import { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { UploadSimple, DownloadSimple, FileCsv, Warning } from '@phosphor-icons/react';
import { type AnalysisResult, type VerdictType, analyzeCoordinate } from '@/lib/mockData';
import { toUserMessage, logTechnicalDetail } from '@/shared/utils/errorMessage';
import LoadingState from './LoadingState';
import { AnalyzeButton } from '@/shared/components/AnalyzeButton';

// Requires 'IBM Plex Sans' (400/500/600) and 'Roboto' (400/500) loaded app-wide.
const FONT_HEADING = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

interface BatchRow { name: string; lat: number; lon: number; claimed_ntp_date: string; }
type BatchResult = AnalysisResult & { error?: string };

// Real projects with published audit findings, not invented rows. Coordinates
// and contract start dates come from the DPWH transparency dataset; the
// findings come from COA fraud-audit reporting. See backend/tests/verified_cases.py
// for the per-case citation and the expected verdict each one is testing.
const SAMPLE = `name,lat,lon,claimed_ntp_date
Bambang Bocaue 24CC0149,14.76360,120.92071,2024-04-23
Turo Bocaue 24CC0401,14.81336,120.94254,2024-04-23
Sipat Plaridel 24CC0144,14.90360,120.82639,2024-03-20
Slope Protection Pampanga,15.2215,120.5755,2016-06-01
Betis River Pampanga,14.9818,120.6433,2022-06-01`;

// Splits a CSV line on commas outside double quotes, so quoted project names
// containing commas survive. Handles "" as an escaped quote.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCSV(text: string): BatchRow[] {
  // \r\n from Windows-exported files leaves a stray \r on the last field,
  // which silently corrupts claimed_ntp_date.
  const lines = text.replace(/\r\n?/g, '\n').trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1).map(line => {
    const vals = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return { name: row.name, lat: parseFloat(row.lat), lon: parseFloat(row.lon), claimed_ntp_date: row.claimed_ntp_date };
  }).filter(r => r.name && !isNaN(r.lat) && !isNaN(r.lon));
}

const VERDICT_CFG: Record<VerdictType, { label: string; accent: string }> = {
  PRE_EXISTING:       { label: 'Pre-existing', accent: 'var(--error)' },
  NO_CHANGE_DETECTED: { label: 'No change',    accent: 'var(--warning)' },
  LOCATION_MISMATCH:  { label: 'Bad location', accent: 'var(--warning)' },
  INSUFFICIENT_DATA:  { label: 'No data',       accent: 'var(--mute)' },
  DELAYED_START:      { label: 'Delayed start', accent: 'var(--warning)' },
  CONSISTENT:         { label: 'Consistent',   accent: 'var(--success)' },
};

function formatCoordinates(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

function offsetLabel(days: number): string {
  const n = Math.abs(days);
  return `${n} ${n === 1 ? 'day' : 'days'} ${days < 0 ? 'before' : 'after'}`;
}

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Deliberately not using the .verdict-flag/.verdict-* classes — those carry a hard
// 1px border, and this pill reads as a soft tint instead.
function VerdictPill({ result }: { result: BatchResult }) {
  const accent = result.error ? 'var(--error)' : VERDICT_CFG[result.verdict].accent;
  const label = result.error ? 'Error' : VERDICT_CFG[result.verdict].label;

  return (
    <span
      title={result.error}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 12px',
        borderRadius: '999px',
        fontSize: '11.5px',
        fontWeight: 500,
        fontFamily: FONT_BODY,
        whiteSpace: 'nowrap',
        // Slightly stronger than a bordered pill would need — the fill is now the
        // only thing giving the shape an edge.
        background: `color-mix(in srgb, ${accent} 16%, transparent)`,
        color: accent,
      }}
    >
      {label}
    </span>
  );
}

export default function BatchMode() {
  const reduce = useReducedMotion();
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
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
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = ''; // allows re-selecting the same file
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  const runBatch = async () => {
    setLoading(true); setProgress(0); setResults([]);
    const out: BatchResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      setProgress(Math.round((i / rows.length) * 100));
      try {
        const res = await analyzeCoordinate(rows[i].lat, rows[i].lon, rows[i].claimed_ntp_date, rows[i].name);
        out.push(res);
      } catch (e) {
        logTechnicalDetail(`Batch row failed: ${rows[i].name}`, e);
        out.push({
          series: [],
          change_point: { detected_date: null, confidence: 0, days_difference: null },
          verdict: 'NO_CHANGE_DETECTED',
          explanation: '',
          claimed_date: rows[i].claimed_ntp_date,
          coordinates: { lat: rows[i].lat, lon: rows[i].lon },
          project_name: rows[i].name,
          error: toUserMessage(e),
        });
      }
      setResults([...out]);
    }
    setProgress(100); setLoading(false);
  };

  const exportToCsv = () => {
    if (results.length === 0) return;
    const headers = ['Project', 'Latitude', 'Longitude', 'Claimed NTP', 'Detected Change', 'Confidence (%)', 'Verdict', 'Days Difference', 'Error'];
    const lines = results.map(r => [
      r.project_name,
      r.coordinates.lat,
      r.coordinates.lon,
      r.claimed_date,
      r.change_point.detected_date ?? 'None',
      r.change_point.detected_date ? Math.round(r.change_point.confidence * 100) : '',
      r.error ? 'ERROR' : r.verdict,
      r.change_point.days_difference ?? '',
      r.error ?? '',
    ].map(csvCell).join(','));

    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'terraguard_batch_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // otherwise the blob is held for the life of the page
  };

  // Errored rows are counted separately rather than folded into "No change",
  // which would otherwise inflate a real verdict with failed lookups.
  const ok = results.filter(r => !r.error);
  const counts = {
    pre: ok.filter(r => r.verdict === 'PRE_EXISTING').length,
    no: ok.filter(r => r.verdict === 'NO_CHANGE_DETECTED').length,
    delayed: ok.filter(r => r.verdict === 'DELAYED_START').length,
    noData: ok.filter(r => r.verdict === 'INSUFFICIENT_DATA').length,
    badLocation: ok.filter(r => r.verdict === 'LOCATION_MISMATCH').length,
    consistent: ok.filter(r => r.verdict === 'CONSISTENT').length,
    errors: results.length - ok.length,
  };
  const total = ok.length || 1;

  return (
    <div style={{ paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: FONT_HEADING }}>
      <style>{`
        .bm-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
        .bm-table th {
          text-align: left; font-family: ${FONT_BODY}; font-size: 12px; font-weight: 400;
          color: var(--mute); padding: 0 14px 10px; white-space: nowrap;
        }
        .bm-table td { padding: 13px 14px; color: var(--ink); border-top: 1px solid var(--hairline); }
        .bm-table tbody tr { transition: background-color 0.15s ease; }
        .bm-table tbody tr:hover { background: var(--canvas-soft); }
        .bm-table tbody tr:hover td:first-child { border-radius: 12px 0 0 12px; }
        .bm-table tbody tr:hover td:last-child { border-radius: 0 12px 12px 0; }
        .bm-iso { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; white-space: nowrap; }
      `}</style>

      {/* Section header */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="t-display-sm" style={{ marginBottom: '6px', fontFamily: FONT_HEADING }}>Batch analysis</h2>
        <p className="t-body" style={{ color: 'var(--body)', fontFamily: FONT_BODY }}>
          Upload or paste a CSV to audit multiple projects against their contract dates in one pass.
        </p>
      </motion.div>

      {/* Upload area */}
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
          borderRadius: '20px',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: 'var(--canvas)', border: '1px solid var(--hairline-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--mute)' }}>
              <FileCsv size={16} weight="bold" />
            </div>
            <div>
              <p className="t-micro-cap" style={{ marginBottom: '4px', fontFamily: FONT_BODY }}>CSV format</p>
              <code style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: FONT_HEADING, letterSpacing: '0.01em' }}>name, lat, lon, claimed_ntp_date</code>
              <p className="t-caption" style={{ marginTop: '4px', fontFamily: FONT_BODY }}>Drag a file in, paste below, or load a sample set. Sentinel-1 radar coverage begins October 2014 — rows with an earlier NTP date cannot be analysed.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn-ghost" onClick={loadSample} style={{ padding: '8px 16px', height: '36px', borderRadius: '999px', fontFamily: FONT_BODY }}>
              Load sample
            </button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', height: '36px', borderRadius: '999px', fontFamily: FONT_BODY }}>
              <UploadSimple size={14} weight="bold" /> Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
          </div>
        </div>

        <textarea
          className="field"
          value={csv}
          onChange={e => onPaste(e.target.value)}
          rows={7}
          placeholder="Paste CSV here or click Load sample..."
          aria-label="CSV input"
          style={{ fontFamily: FONT_HEADING, fontSize: '13px', resize: 'vertical', lineHeight: 1.6, borderRadius: '14px', fontVariantNumeric: 'tabular-nums' }}
        />

        {rows.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span className="t-body" style={{ color: 'var(--mute)', fontFamily: FONT_BODY }}>
              {rows.length} project{rows.length !== 1 ? 's' : ''} ready
            </span>
            <AnalyzeButton
              onClick={runBatch}
              isLoading={loading}
              loadingLabel="Analyzing..."
            >
              Analyze all ({rows.length})
            </AnalyzeButton>
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
            <span className="loading-elapsed" style={{ fontFamily: FONT_HEADING, fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--canvas-soft-2)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--ink)', borderRadius: '999px', width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
          <p className="t-caption" style={{ fontFamily: FONT_BODY }}>{results.length}/{rows.length} complete</p>
        </motion.div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            {([
              { label: 'Pre-existing', val: counts.pre, color: 'var(--error)' },
              { label: 'No change', val: counts.no, color: 'var(--warning)' },
              { label: 'Delayed start', val: counts.delayed, color: 'var(--warning)' },
              ...(counts.badLocation > 0 ? [{ label: 'Bad location', val: counts.badLocation, color: 'var(--warning)' }] : []),
              ...(counts.noData > 0 ? [{ label: 'No data', val: counts.noData, color: 'var(--mute)' }] : []),
              { label: 'Consistent', val: counts.consistent, color: 'var(--success)' },
              ...(counts.errors > 0 ? [{ label: 'Errors', val: counts.errors, color: 'var(--mute)' }] : []),
            ] as { label: string; val: number; color: string }[]).map((s, i) => (
              <motion.div
                key={s.label}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: 'var(--canvas-soft)', borderRadius: '16px', padding: '16px 18px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontFamily: FONT_BODY, color: 'var(--mute)' }}>{s.label}</span>
                </div>
                <div className="stat-num" style={{ fontSize: '26px', fontWeight: 600, lineHeight: 1, color: s.val > 0 ? s.color : 'var(--mute)', fontFamily: FONT_HEADING }}>
                  {s.val}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Proportion bar */}
          <div style={{ height: '8px', borderRadius: '999px', overflow: 'hidden', display: 'flex', gap: '2px', background: 'var(--canvas-soft-2)' }}>
            {counts.pre > 0 && <div style={{ width: `${(counts.pre / total) * 100}%`, background: 'var(--error)' }} />}
            {counts.no > 0 && <div style={{ width: `${(counts.no / total) * 100}%`, background: 'var(--warning)' }} />}
            {counts.delayed > 0 && <div style={{ width: `${(counts.delayed / total) * 100}%`, background: 'var(--warning)' }} />}
            {counts.consistent > 0 && <div style={{ width: `${(counts.consistent / total) * 100}%`, background: 'var(--success)' }} />}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '12px', fontFamily: FONT_BODY, color: 'var(--mute)' }}>
            {counts.pre + counts.delayed} of {ok.length} project{ok.length !== 1 ? 's' : ''} flagged as off-timeline
            {counts.pre > 0 && ` · ${counts.pre} pre-existing`}
            {counts.delayed > 0 && ` · ${counts.delayed} delayed start`}
            {counts.errors > 0 && ` · ${counts.errors} failed to analyze`}
          </p>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-ghost" onClick={exportToCsv} style={{ height: '36px', borderRadius: '999px', fontFamily: FONT_BODY }}>
              <DownloadSimple size={14} weight="bold" /> Export CSV
            </button>
          </div>

          <div style={{ border: '1px solid var(--hairline)', borderRadius: '20px', overflowX: 'auto', background: 'var(--canvas)', padding: '18px 10px 10px' }}>
            <table className="bm-table">
              <thead>
                <tr>
                  {['Project', 'Coordinates', 'Claimed NTP', 'Detected', 'Offset', 'Confidence', 'Verdict'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const diff = r.change_point.days_difference;
                  const accent = r.error ? 'var(--mute)' : VERDICT_CFG[r.verdict].accent;
                  return (
                    <motion.tr
                      key={`${r.project_name}-${i}`}
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.6) }}
                    >
                      <td style={{ fontWeight: 500, maxWidth: '220px' }}>{r.project_name}</td>
                      <td style={{ color: 'var(--mute)', fontFamily: FONT_BODY, whiteSpace: 'nowrap' }}>
                        {formatCoordinates(r.coordinates.lat, r.coordinates.lon)}
                      </td>
                      <td className="bm-iso" style={{ color: 'var(--mute)' }}>{r.claimed_date}</td>
                      <td className="bm-iso">{r.change_point.detected_date ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', color: diff !== null ? accent : 'var(--mute)' }}>
                        {diff !== null ? offsetLabel(diff) : '—'}
                      </td>
                      <td>
                        {r.change_point.detected_date ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ width: '44px', height: '5px', borderRadius: '999px', background: 'var(--canvas-soft-2)', overflow: 'hidden', flexShrink: 0 }}>
                              <span style={{ display: 'block', height: '100%', borderRadius: '999px', background: 'var(--ink)', width: `${Math.round(r.change_point.confidence * 100)}%` }} />
                            </span>
                            {Math.round(r.change_point.confidence * 100)}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--mute)' }}>—</span>
                        )}
                      </td>
                      <td><VerdictPill result={r} /></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {counts.errors > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12.5px', fontFamily: FONT_BODY, color: 'var(--mute)' }}>
              <Warning size={14} weight="bold" />
              Hover an Error pill to see why that row failed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}