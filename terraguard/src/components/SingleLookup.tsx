'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Broadcast, ChartLine, Warning } from '@phosphor-icons/react';
import { type AnalysisResult, KNOWN_CASES, analyzeCoordinate, type VerdictType } from '@/lib/mockData';
import { useState } from 'react';
import VerdictBanner from './VerdictBanner';
import SARChart from './SARChart';

const SCENARIOS: Record<string, VerdictType> = {
  [KNOWN_CASES[0].name]: 'PRE_EXISTING',
  [KNOWN_CASES[1].name]: 'PRE_EXISTING',
  [KNOWN_CASES[2].name]: 'NO_CHANGE_DETECTED',
};

const PROGRESS_STEPS = [
  'Initializing GEE session...',
  'Querying COPERNICUS/S1_GRD collection...',
  'Filtering VV polarization · IW mode...',
  'Aggregating backscatter · 30 m buffer...',
  'Applying rolling median smoothing...',
  'Running ruptures.Pelt change point detection...',
  'Computing confidence interval...',
];

export default function AnalysisPanel() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<'known' | 'custom'>('known');
  const [selectedCase, setSelectedCase] = useState(KNOWN_CASES[0].name);
  const [lat, setLat] = useState('14.5995');
  const [lon, setLon] = useState('120.9842');
  const [claimedDate, setClaimedDate] = useState('2023-06-01');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true); setResult(null); setError(null); setProgressStep(0);
    try {
      let finalLat: number, finalLon: number, finalDate: string, finalName: string, scenario: VerdictType | undefined;
      if (mode === 'known') {
        const kase = KNOWN_CASES.find(c => c.name === selectedCase)!;
        finalLat = kase.lat; finalLon = kase.lon;
        finalDate = kase.claimed_ntp_date; finalName = kase.name;
        scenario = SCENARIOS[selectedCase];
      } else {
        finalLat = parseFloat(lat); finalLon = parseFloat(lon);
        finalDate = claimedDate; finalName = projectName || 'Custom Lookup';
        if (isNaN(finalLat) || isNaN(finalLon)) throw new Error('Invalid coordinates');
      }
      // Simulate progress
      for (let i = 0; i < PROGRESS_STEPS.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        setProgressStep(i);
      }
      const res = await analyzeCoordinate(finalLat, finalLon, finalDate, finalName, scenario);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const kase = KNOWN_CASES.find(c => c.name === selectedCase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Input section */}
      <div style={{ padding: '32px 0 32px' }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'var(--canvas-soft-2)', padding: '4px', borderRadius: '9999px', width: 'fit-content', border: '1px solid var(--hairline-strong)' }}>
          <button className={`tab-pill ${mode === 'known' ? 'active' : ''}`} onClick={() => { setMode('known'); setResult(null); }}>
            Known Cases
          </button>
          <button className={`tab-pill ${mode === 'custom' ? 'active' : ''}`} onClick={() => { setMode('custom'); setResult(null); }}>
            Custom Lookup
          </button>
        </div>

        {mode === 'known' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="t-micro-cap" style={{ display: 'block', marginBottom: '8px' }}>
                COA-Flagged Project
              </label>
              <select
                className="field"
                value={selectedCase}
                onChange={e => { setSelectedCase(e.target.value); setResult(null); }}
                style={{ maxWidth: '480px', appearance: 'none', cursor: 'pointer' }}
              >
                {KNOWN_CASES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {kase && (
              <div style={{
                borderLeft: '2px solid var(--ink)',
                paddingLeft: '16px',
                display: 'flex', gap: '32px', flexWrap: 'wrap',
              }}>
                <Stat label="NTP Date" value={kase.claimed_ntp_date} mono />
                <Stat label="Coordinates" value={`${kase.lat}°N, ${kase.lon}°E`} mono />
                <Stat label="Source" value={kase.source} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '640px' }}>
            {[
              { label: 'Latitude', val: lat, set: setLat, ph: '14.5995' },
              { label: 'Longitude', val: lon, set: setLon, ph: '120.9842' },
              { label: 'Contract NTP Date', val: claimedDate, set: setClaimedDate, type: 'date' },
              { label: 'Project Name', val: projectName, set: setProjectName, ph: 'Optional' },
            ].map(f => (
              <div key={f.label}>
                <label className="t-micro-cap" style={{ display: 'block', marginBottom: '8px' }}>{f.label}</label>
                <input
                  className="field"
                  type={f.type ?? 'text'}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                />
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: '32px' }}>
          <button
            className="btn-ghost btn-ghost-accent"
            onClick={handleAnalyze}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Processing...' : 'Run Satellite Analysis'}
          </button>
        </div>
      </div>

      <div className="hairline" />

      {/* Loading state */}
      {loading && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--ink)',
            }} />
            <span className="t-micro-cap" style={{ color: 'var(--ink)' }}>
              {PROGRESS_STEPS[progressStep]}
            </span>
          </div>
          {/* Progress track */}
          <div style={{ height: '2px', background: 'var(--canvas-soft-2)', position: 'relative', maxWidth: '400px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              background: 'var(--ink)',
              width: `${((progressStep + 1) / PROGRESS_STEPS.length) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {/* Skeleton chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <div className="skeleton" style={{ height: '220px', width: '100%' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton" style={{ height: '12px', width: '60px' }} />
              <div className="skeleton" style={{ height: '12px', width: '80px' }} />
              <div className="skeleton" style={{ height: '12px', width: '50px' }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '24px 0' }}>
          <div className="verdict-flag verdict-red">
            <Warning size={14} weight="bold" /> {error}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
        >
          <VerdictBanner result={result} />
          <div className="hairline" style={{ margin: '40px 0' }} />
          <div style={{ marginBottom: '16px' }}>
            <p className="t-micro-cap" style={{ color: 'var(--mute)', marginBottom: '4px' }}>
              Sentinel-1 VV Backscatter · IW Mode · 30 m Buffer
            </p>
          </div>
          <SARChart result={result} />
          <div className="hairline" style={{ margin: '40px 0' }} />
          {/* Method tags */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {['COPERNICUS/S1_GRD', 'VV Polarization', 'IW Mode', 'ruptures.Pelt (rbf)', '±12 day tolerance', '30 m buffer'].map(tag => (
              <span key={tag} style={{
                fontSize: '12px', fontWeight: 500,
                padding: '4px 10px', borderRadius: '4px',
                border: '1px solid var(--hairline-strong)',
                color: 'var(--mute)',
                background: 'var(--canvas-soft)',
              }}>{tag}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Default empty state */}
      {!loading && !result && !error && (
        <div style={{ padding: '64px 0', display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--mute)' }}>
          <ChartLine size={24} />
          <span className="t-body">Select a project and run analysis to see backscatter data.</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="t-micro-cap" style={{ marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 400, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}
