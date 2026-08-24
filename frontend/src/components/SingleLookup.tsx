'use client';

import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChartLine, Warning } from '@phosphor-icons/react';
import { type AnalysisResult, KNOWN_CASES, analyzeCoordinate, type VerdictType } from '@/lib/mockData';
import { useState } from 'react';
import VerdictBanner from './VerdictBanner';
import SARChart from './SARChart';
import LoadingState from './LoadingState';
import ThinkingState from './ThinkingState';
import PromptBar from './PromptBar';
import OpticalVerification, { type OpticalData } from '@/features/analysis/components/OpticalVerification';
import { Select } from '@/shared/components/Select';
import { AnalyzeButton } from '@/shared/components/AnalyzeButton';

const SatelliteMark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" viewBox="-0.0 -42.0 287.1 287.1"><g transform="translate(0.000000,203.000000) scale(0.100000,-0.100000)"><path d="M1733 1831 c-36 -22 -45 -44 -42 -98 2 -30 -6 -51 -36 -95 -21 -32
-40 -58 -42 -58 -3 0 -62 34 -133 75 -150 88 -168 95 -197 84 -16 -6 -24 -22
-34 -63 -29 -130 45 -284 175 -366 53 -34 67 -52 46 -65 -5 -3 -44 3 -85 15
-63 18 -82 19 -110 10 -55 -18 -58 -24 -125 -257 -18 -63 -24 -73 -44 -73 -12
0 -30 6 -39 13 -17 12 -17 17 3 99 23 99 18 129 -27 146 -65 25 -680 204 -701
204 -13 0 -30 -6 -39 -14 -13 -14 -103 -360 -119 -456 -8 -49 15 -74 84 -92
49 -13 442 -124 569 -161 40 -11 82 -18 93 -14 28 9 48 41 64 106 28 107 30
109 71 96 43 -13 43 -8 -10 -198 -19 -68 -35 -137 -35 -155 0 -60 19 -71 240
-134 113 -33 222 -60 243 -60 59 0 77 28 121 187 56 206 48 188 90 187 20 -1
39 -4 42 -7 3 -3 -2 -34 -12 -69 -9 -34 -19 -84 -22 -110 -3 -40 -1 -48 20
-61 30 -20 723 -227 759 -227 15 0 35 7 43 15 23 23 146 433 146 486 0 43 -27
63 -120 87 -47 12 -197 51 -335 86 -353 91 -343 90 -371 71 -17 -11 -31 -40
-51 -106 l-27 -91 -34 6 c-53 8 -53 -11 2 200 37 139 24 165 -106 207 -116 37
-111 54 15 50 118 -3 187 15 247 66 61 52 55 69 -42 128 -46 27 -107 64 -136
82 l-53 33 41 60 c35 51 45 60 71 60 45 0 89 47 89 95 0 27 -8 44 -29 66 -35
34 -72 37 -118 10z m-1146 -653 c-10 -40 -17 -80 -17 -89 0 -11 28 -23 96 -43
53 -15 97 -26 99 -24 1 2 14 39 27 83 16 55 29 81 41 83 22 4 22 -14 -2 -106
-22 -83 -27 -77 74 -107 70 -21 84 -30 67 -47 -8 -8 -28 -7 -79 7 -37 10 -73
20 -80 22 -7 3 -21 -27 -38 -81 -26 -87 -39 -106 -56 -89 -7 7 -3 39 11 93 12
46 18 86 13 91 -6 6 -175 59 -189 59 -2 0 -15 -38 -29 -85 -14 -46 -31 -87
-36 -91 -24 -14 -27 16 -9 91 11 44 19 85 20 91 0 6 -41 23 -90 38 -82 24
-114 45 -96 63 3 3 48 -6 101 -20 56 -15 97 -21 101 -16 3 5 14 39 24 75 22
75 38 100 53 85 7 -7 5 -34 -6 -83z m1527 -326 c3 -5 -4 -44 -15 -87 -11 -44
-18 -84 -15 -91 4 -9 175 -64 202 -64 5 0 18 25 27 55 25 82 45 125 56 125 15
0 13 -45 -4 -110 -23 -87 -24 -87 58 -110 93 -27 140 -48 132 -60 -9 -15 -36
-12 -131 11 -49 13 -89 18 -93 13 -5 -5 -21 -46 -36 -91 -17 -52 -32 -83 -41
-83 -20 0 -18 42 6 125 11 38 16 72 12 76 -7 6 -190 59 -204 59 -4 0 -19 -38
-33 -85 -26 -86 -39 -105 -56 -88 -7 7 -3 39 10 91 12 44 21 85 21 91 0 5 -38
21 -85 36 -56 17 -85 31 -85 40 0 19 30 19 100 0 86 -23 86 -23 111 53 12 37
26 75 31 85 9 18 24 22 32 9z M1091 367 c-6 -8 -12 -32 -13 -52 -2 -49 27 -73
120 -102 134 -43 179 -39 202 17 22 54 14 61 -120 101 -168 51 -175 52 -189
36z"></path></g></svg>
);

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
  // Bumped at the start of each parse — remounts ThinkingState so its step
  // counter and timer reset for the new run without any reset-on-prop-
  // change logic inside that component.
  const [parseRunId, setParseRunId] = useState(0);

  // Optical verification layer state
  const [opticalData, setOpticalData] = useState<OpticalData | null>(null);
  const [opticalLoading, setOpticalLoading] = useState(false);
  const [opticalError, setOpticalError] = useState<string | null>(null);

  const handleParseNL = async () => {
    if (!nlQuery.trim()) return;
    setAiParsing(true);
    setNlMessage(null);
    setParseRunId(id => id + 1);
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
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`API returned non-JSON: ${text.slice(0, 100)}`); }
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
      let finalLat: number, finalLon: number, finalDate: string, finalName: string;
      if (mode === 'known') {
        const kase = KNOWN_CASES.find(c => c.name === selectedCase)!;
        finalLat = kase.lat; finalLon = kase.lon;
        finalDate = kase.claimed_ntp_date; finalName = kase.name;
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
      const res = await analyzeCoordinate(finalLat, finalLon, finalDate, finalName);
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
      .then(async r => {
        const t = await r.text();
        try { const d = JSON.parse(t); if (d.summary) setAiSummary(d.summary); } catch { /* non-JSON, ignore */ }
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
          const t = await r.text();
          let d;
          try { d = JSON.parse(t); } catch { throw new Error(`Optical API returned non-JSON (HTTP ${r.status})`); }
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
      <div style={{ padding: '32px 0 32px', display: 'flex', gap: '30px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'var(--canvas-soft-2)', padding: '4px', borderRadius: '9999px', width: 'fit-content', border: '1px solid var(--hairline-strong)' }}>
            <button className={`tab-pill ${mode === 'known' ? 'active' : ''}`} onClick={() => { setMode('known'); setResult(null); }}>
              Known Cases
            </button>
            <button className={`tab-pill ${mode === 'custom' ? 'active' : ''}`} onClick={() => { setMode('custom'); setResult(null); }}>
              Custom Lookup
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {mode === 'known' ? (
              <motion.div
                key="known"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div style={{ maxWidth: '480px' }}>
                  <label className="t-micro-cap" style={{ display: 'block', marginBottom: '8px' }}>
                    COA-Flagged Project
                  </label>
                  <Select
                    value={selectedCase}
                    onChange={v => { setSelectedCase(v); setResult(null); }}
                    options={KNOWN_CASES.map(c => ({ value: c.name, label: c.name }))}
                    aria-label="COA-Flagged Project"
                  />
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
              </motion.div>
            ) : (
              <motion.div
                key="custom"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}
              >
                {/* AI Assistant Input */}
                <div style={{ padding: '24px', background: 'var(--canvas-soft)', borderRadius: '8px', border: '1px solid var(--hairline-strong)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label className="t-micro-cap" style={{ color: 'var(--ink)' }}>
                    ASK AI ASSISTANT
                  </label>
                  <PromptBar
                    value={nlQuery}
                    onChange={setNlQuery}
                    onSend={handleParseNL}
                    disabled={aiParsing}
                    knownCaseNames={KNOWN_CASES.map(c => c.name)}
                    placeholder="Describe what you want to investigate (e.g., 'investigate the Manila flood control between 2023-01-01 and 2023-12-31')"
                  />
                  {(aiParsing || nlMessage) && (
                    <ThinkingState
                      key={parseRunId}
                      working={aiParsing}
                      steps={['Reading your query', 'Extracting location & dates', 'Geocoding the location', 'Filling in the form']}
                      activeLabel="Extracting fields"
                    />
                  )}
                  {nlMessage && !aiParsing && (
                    <div style={{ fontSize: '12px', color: 'var(--mute)' }}>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <div style={{ marginTop: '32px' }}>
            <AnalyzeButton
              onClick={handleAnalyze}
              isLoading={loading}
              loadingLabel="Processing..."
            >
              Run Satellite Analysis
            </AnalyzeButton>
          </div>
        </div>

        <div className="panel-mark-wrap" style={{ marginRight: '32px' }}>
          <span className="panel-glow panel-glow-left" />
          <span className="panel-glow panel-glow-right" />
          <span className="panel-glow panel-glow-top" />
          <motion.div
            aria-hidden="true"
            className="panel-mark"
            animate={reduce ? undefined : { y: [0, -16, 0], rotate: [0, -2, 0, 2, 0] }}
            transition={reduce ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SatelliteMark />
          </motion.div>
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
          <LoadingState label={PROGRESS_STEPS[progressStep]} />
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
            <p className="t-micro-cap" style={{ color: 'var(--mute)', marginBottom: '4px', fontFamily: "'Roboto', sans-serif" }}>
              Sentinel-1 VV Backscatter · IW Mode · 30 m Buffer
            </p>
          </div>
          <SARChart result={result} />

          <div className="hairline" style={{ margin: '40px 0' }} />

          {/* Explanation (Top 3 possibilities) */}
          <div style={{ marginBottom: '40px' }}>
            <p className="t-body-lg" style={{ maxWidth: '680px', color: 'var(--ink)', whiteSpace: 'pre-wrap', fontFamily: "'Roboto', sans-serif" }}>
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
          {/* targetDate has to match what handleAnalyze sent to /api/optical, or the
              timeline marker and the reported offsets will disagree. */}
          <OpticalVerification
            data={opticalData}
            isLoading={opticalLoading}
            error={opticalError}
            targetDate={result.change_point.detected_date || result.claimed_date}
          />
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
