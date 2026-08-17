'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Broadcast, ArrowRight, ShieldCheck, ChartLine, Warning, Circle } from '@phosphor-icons/react';
import SingleLookup from '@/components/SingleLookup';
import BatchMode from '@/components/BatchMode';
import LoginScreen from '@/components/LoginScreen';

export default function HomePage() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('tg_token');
    setToken(stored);
    setAuthChecked(true);
  }, []);

  if (!authChecked) return null; // prevent flash
  if (!token) return <LoginScreen onSuccess={(t) => setToken(t)} />;

  return (
    <div style={{ background: 'var(--canvas-night)', minHeight: '100vh' }}>

      {/* ─── NAV ─── */}
      <nav className="nav-overlay">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Broadcast size={18} color="#00c4b4" weight="bold" />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--on-primary)',
          }}>TerraGuard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <span className="t-micro-cap" style={{ color: 'var(--ink-mute)' }}>Philippines · DPWH</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <span className="t-micro-cap" style={{ color: '#4ade80' }}>Sentinel-1 Live</span>
          </div>
        </div>
      </nav>

      {/* ─── HERO — full-bleed SAR photography ─── */}
      <section style={{ position: 'relative', width: '100%', minHeight: '100dvh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        {/* Hero image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        {/* Bottom gradient for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.85) 75%, #000 100%)',
        }} />

        {/* Hero content */}
        <div className="band-inner" style={{ position: 'relative', zIndex: 1, paddingBottom: '80px', width: '100%' }}>
          <motion.p
            className="t-micro-cap"
            style={{ color: '#00c4b4', marginBottom: '20px' }}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Sentinel-1 SAR · Bayesian Change Detection
          </motion.p>

          <motion.h1
            className="t-display-xxl"
            style={{ maxWidth: '820px', marginBottom: '24px' }}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Did the structure<br />exist before the contract?
          </motion.h1>

          <motion.p
            className="t-body-lg"
            style={{ maxWidth: '520px', marginBottom: '40px' }}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            TerraGuard compares satellite-detected construction dates against contract
            Notice-to-Proceed dates to surface pre-existing infrastructure fraud and ghost billing.
          </motion.p>

          <motion.div
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="btn-ghost" onClick={() => document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' })}>
              Run Analysis <ArrowRight size={14} weight="bold" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS — 4-column grid, no eyebrows ─── */}
      <section className="section-dark" style={{ padding: '96px 0' }}>
        <div className="band-inner">
          <h2 className="t-display-xl" style={{ marginBottom: '56px', maxWidth: '480px' }}>
            Four-step detection pipeline
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px',
            background: 'var(--hairline)',
            border: '1px solid var(--hairline)',
          }}>
            {[
              { n: '01', title: 'Pull SAR Data', body: 'Query Sentinel-1 GRD backscatter at the coordinate via Google Earth Engine' },
              { n: '02', title: 'Smooth Series', body: 'Apply rolling median filter to reduce SAR speckle noise before detection' },
              { n: '03', title: 'Detect Change', body: 'Run ruptures.Pelt (Penalized Exact Linear Time) change point detection on the VV time series' },
              { n: '04', title: 'Return Verdict', body: 'Compare detected date vs. NTP date with ±12-day satellite revisit tolerance' },
            ].map(step => (
              <div key={step.n} style={{ background: 'var(--canvas-night)', padding: '32px 28px' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '48px',
                  fontWeight: 700,
                  color: 'var(--hairline)',
                  lineHeight: 1,
                  marginBottom: '20px',
                  letterSpacing: '0.02em',
                }}>{step.n}</div>
                <div className="t-display-lg" style={{ marginBottom: '12px', fontSize: '20px' }}>{step.title}</div>
                <p className="t-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--hairline)' }}>
        <div className="band-inner">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="t-display-xl" style={{ marginBottom: '16px' }}>How TerraGuard Detects Fraud</h2>
            <p className="t-body-lg" style={{ color: 'var(--ink-mute)', maxWidth: '600px', margin: '0 auto' }}>
              We use radar satellite imagery and change-point detection algorithms to verify infrastructure progress independently of ground reports.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {/* Step 1 */}
            <div style={{ background: 'var(--canvas-section)', padding: '32px', border: '1px solid var(--hairline)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', marginBottom: '24px', color: 'var(--on-primary)' }}>
                <Broadcast size={24} />
              </div>
              <h3 className="t-heading" style={{ marginBottom: '12px' }}>1. Radar Satellite Data</h3>
              <p className="t-body" style={{ color: 'var(--ink-mute)' }}>
                We pull Sentinel-1 SAR (Synthetic Aperture Radar) data from Google Earth Engine. Radar penetrates clouds and weather, giving us a reliable backscatter time series for the coordinates.
              </p>
            </div>
            
            {/* Step 2 */}
            <div style={{ background: 'var(--canvas-section)', padding: '32px', border: '1px solid var(--hairline)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(0,196,180,0.1)', borderRadius: '50%', marginBottom: '24px', color: '#00c4b4' }}>
                <ChartLine size={24} />
              </div>
              <h3 className="t-heading" style={{ marginBottom: '12px' }}>2. Anomaly Detection</h3>
              <p className="t-body" style={{ color: 'var(--ink-mute)' }}>
                The raw radar data is smoothed using rolling medians, and fed into a Ruptures Pelt algorithm. This mathematical model identifies the exact date the backscatter fundamentally shifted—indicating ground disruption.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'var(--canvas-section)', padding: '32px', border: '1px solid var(--hairline)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(74,222,128,0.1)', borderRadius: '50%', marginBottom: '24px', color: '#4ade80' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 className="t-heading" style={{ marginBottom: '12px' }}>3. Verdict Generation</h3>
              <p className="t-body" style={{ color: 'var(--ink-mute)' }}>
                We compare the algorithm's detected date to the contractor's official Notice To Proceed (NTP) date. Ghost projects and pre-existing structures are instantly flagged for auditors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANALYSIS SECTION ─── */}
      <section id="analysis" style={{ background: 'var(--canvas-night)', borderTop: '1px solid var(--hairline)', minHeight: '800px', padding: '64px 0' }}>
        <div className="band-inner">
          {/* Section header — no eyebrow per taste-skill rule (used one in hero) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
            <h2 className="t-display-xl">Satellite Analysis</h2>
            {/* Tab pills */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--hairline)', padding: '5px', borderRadius: '32px' }}>
              <button className={`tab-pill ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Single Lookup</button>
              <button className={`tab-pill ${tab === 'batch' ? 'active' : ''}`} onClick={() => setTab('batch')}>Batch Mode</button>
            </div>
          </div>

          <div className="hairline" />

          {tab === 'single' && <SingleLookup />}
          {tab === 'batch' && <BatchMode />}
        </div>
      </section>

      {/* ─── STATS BAND — full-width dark section ─── */}
      <section style={{ background: 'var(--canvas-section)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', padding: '64px 0' }}>
        <div className="band-inner">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1px',
            background: 'var(--hairline)',
          }}>
            {[
              { label: 'Satellite revisit', value: '6–12', unit: 'days' },
              { label: 'Buffer radius', value: '30', unit: 'm' },
              { label: 'Confidence floor', value: '30', unit: '%' },
              { label: 'Tolerance', value: '±12', unit: 'days' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--canvas-section)', padding: '32px 28px' }}>
                <div className="t-micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: '10px' }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="stat-num">{s.value}</span>
                  <span className="t-body" style={{ color: 'var(--ink-mute)' }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '40px 0', borderTop: '1px solid var(--hairline)' }}>
        <div className="band-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Broadcast size={14} color="#00c4b4" weight="bold" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>TerraGuard</span>
            <span style={{
              fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: '4px',
              border: '1px solid rgba(0,196,180,0.3)', color: '#00c4b4', background: 'rgba(0,196,180,0.06)',
            }}>Live Environment</span>
          </div>
          <p className="t-caption" style={{ maxWidth: '480px', textAlign: 'right' }}>
            Powered by live Google Earth Engine Sentinel-1 GRD telemetry via earthengine-api.
            Algorithm: ruptures.Pelt (RBF cost function).
          </p>
        </div>
      </footer>
    </div>
  );
}
