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
  
  const [nlQuery, setNlQuery] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [nlMessage, setNlMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // Optical verification layer state
  const [opticalData, setOpticalData] = useState<{
    before?: { image: string; date: string; offset_days: number };
    after?: { image: string; date: string; offset_days: number };
  } | null>(null);
  const [opticalLoading, setOpticalLoading] = useState(false);
  const [opticalError, setOpticalError] = useState<string | null>(null);

  const handleParseNL = async () => {
    if (!nlQuery.trim()) return;
    setAiParsing(true);
    setNlMessage(null);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('tg_token') ?? '' : '';
      const res = await fetch('/api/nl_query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'parse', text: nlQuery })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.parsed.start_date) setClaimedDate(data.parsed.start_date);
      if (data.parsed.location_name) setProjectName(data.parsed.location_name);
      
      if (data.geocoded.lat && data.geocoded.lon) {
        setLat(data.geocoded.lat.toString());
        setLon(data.geocoded.lon.toString());
        if (data.geocoded.display_name) {
          setNlMessage(`Showing results for ${data.geocoded.display_name} — not what you meant? Enter coordinates directly.`);
        }
      } else {
        setNlMessage(`Could not find coordinates for "${data.parsed.location_name || 'that location'}". Please enter them manually.`);
      }
    } catch (e) {
      setNlMessage(`AI Parsing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setAiParsing(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true); setResult(null); setError(null); setProgressStep(0); setAiSummary(null);
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
      
      // Request AI summary in the background
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('tg_token') ?? '' : '';
      fetch('/api/nl_query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'summarize', verdict: res })
      })
      .then(r => r.json())
      .then(d => {
        if (d.summary) setAiSummary(d.summary);
      })
      .catch(console.error);

      // Request Optical Verification in the background
      const targetDate = res.change_point.detected_date || res.claimed_date;
      setOpticalLoading(true);
      setOpticalData(null);
      setOpticalError(null);
      
      if (process.env.NEXT_PUBLIC_USE_REAL_GEE === 'true') {
        fetch('/api/optical', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ lat: res.coordinates.lat, lon: res.coordinates.lon, detected_date: targetDate })
        })
        .then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Failed to fetch optical verification');
          setOpticalData(d);
        })
        .catch(err => {
          setOpticalError(err.message);
        })
        .finally(() => {
          setOpticalLoading(false);
        });
      } else {
        // MOCK MODE FOR LOCAL PREVIEW
        setTimeout(() => {
          setOpticalData({
            before: {
              image: 'https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=1470&auto=format&fit=crop',
              date: '2023-01-07',
              offset_days: -140
            },
            after: {
              image: 'https://images.unsplash.com/photo-1502472584811-0a2f2feb8968?q=80&w=1470&auto=format&fit=crop',
              date: '2023-06-15',
              offset_days: 18
            }
          });
          setOpticalLoading(false);
        }, 3000);
      }

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
                <Stat label="Source" value={kase.source} link={kase.source_url} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
            {/* AI Assistant Input */}
            <div style={{ padding: '24px', background: 'var(--canvas-soft)', borderRadius: '8px', border: '1px solid var(--hairline-strong)' }}>
              <label className="t-micro-cap" style={{ display: 'block', marginBottom: '12px', color: 'var(--ink)' }}>
                ASK AI ASSISTANT
              </label>
              <textarea
                className="field"
                placeholder="Describe what you want to investigate (e.g., 'investigate the Manila flood control between 2023-01-01 and 2023-12-31')"
                value={nlQuery}
                onChange={e => setNlQuery(e.target.value)}
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', marginBottom: '12px' }}
              />
              <button 
                className="btn-ghost" 
                onClick={handleParseNL}
                disabled={aiParsing}
                style={{ opacity: aiParsing ? 0.6 : 1, width: '100%', justifyContent: 'center' }}
              >
                {aiParsing ? 'Extracting...' : 'Extract Fields'}
              </button>
              {nlMessage && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--mute)' }}>
                  {nlMessage}
                </div>
              )}
            </div>

            <div className="hairline" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
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
          
          {/* Explanation (Top 3 possibilities) */}
          <div style={{ marginBottom: '40px' }}>
            <p className="t-body-lg" style={{ maxWidth: '680px', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
              {result.explanation}
            </p>
          </div>

          {aiSummary && (
            <div style={{ marginTop: '40px', padding: '24px', background: 'var(--canvas-soft)', borderRadius: '8px', borderLeft: '2px solid var(--ink)' }}>
              <div className="t-micro-cap" style={{ marginBottom: '8px' }}>AI SUMMARY</div>
              <p className="t-body" style={{ color: 'var(--body)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiSummary}</p>
            </div>
          )}


          {/* OPTICAL VERIFICATION LAYER */}
          <div className="hairline" style={{ margin: '40px 0' }} />
          <div>
            <h3 className="t-display-sm" style={{ marginBottom: '8px' }}>Optical Verification (if available)</h3>
            <p className="t-body" style={{ color: 'var(--mute)', marginBottom: '24px' }}>
              Sentinel-2 true-color imagery before and after the detected event.
            </p>
            
            {opticalLoading && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="skeleton" style={{ flex: 1, aspectRatio: '1', borderRadius: '8px' }} />
                <div className="skeleton" style={{ flex: 1, aspectRatio: '1', borderRadius: '8px' }} />
              </div>
            )}
            
            {opticalError && !opticalLoading && (
              <div className="verdict-flag verdict-red">
                <Warning size={14} weight="bold" /> Optical verification failed: {opticalError}
              </div>
            )}
            
            {!opticalLoading && !opticalError && opticalData && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {opticalData.before ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <img src={opticalData.before.image} alt="Before" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--hairline-strong)' }} />
                    <div className="t-micro-cap" style={{ textAlign: 'center', color: 'var(--ink)' }}>
                      BEFORE — {opticalData.before.date}
                    </div>
                    <div className="t-caption" style={{ textAlign: 'center' }}>
                      {Math.abs(opticalData.before.offset_days)} days {opticalData.before.offset_days <= 0 ? 'before' : 'after'} target
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', background: 'var(--canvas-soft)', borderRadius: '8px', border: '1px solid var(--hairline)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="t-body" style={{ color: 'var(--mute)' }}>No clear imagery available before this date due to cloud cover.</span>
                  </div>
                )}
                
                {opticalData.after ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <img src={opticalData.after.image} alt="After" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--hairline-strong)' }} />
                    <div className="t-micro-cap" style={{ textAlign: 'center', color: 'var(--ink)' }}>
                      AFTER — {opticalData.after.date}
                    </div>
                    <div className="t-caption" style={{ textAlign: 'center' }}>
                      {Math.abs(opticalData.after.offset_days)} days {opticalData.after.offset_days <= 0 ? 'before' : 'after'} target
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', background: 'var(--canvas-soft)', borderRadius: '8px', border: '1px solid var(--hairline)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="t-body" style={{ color: 'var(--mute)' }}>No clear imagery available after this date due to cloud cover.</span>
                  </div>
                )}
              </div>
            )}
            {!opticalLoading && !opticalError && !opticalData && (
              <div style={{ padding: '24px', background: 'var(--canvas-soft)', borderRadius: '8px', border: '1px solid var(--hairline)', textAlign: 'center' }}>
                <span className="t-body" style={{ color: 'var(--mute)' }}>Optical imagery not requested or unavailable.</span>
              </div>
            )}
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

function Stat({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div>
      <div className="t-micro-cap" style={{ marginBottom: '4px' }}>{label}</div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 400, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', color: 'var(--brand)', textDecoration: 'underline' }}>
          {value}
        </a>
      ) : (
        <div style={{ fontSize: '14px', fontWeight: 400, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', color: 'var(--ink)' }}>{value}</div>
      )}
    </div>
  );
}
