'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Broadcast, ShieldCheck, ChartLine, WarningDiamond } from '@phosphor-icons/react';

export default function HomePage() {
  const reduce = useReducedMotion();

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', color: 'var(--ink)' }}>

      {/* ─── ASYMMETRIC HERO ─── */}
      <section style={{ paddingTop: '128px', paddingBottom: '96px', overflow: 'hidden' }}>
        <div className="band-inner">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '64px',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ maxWidth: '600px' }}
            >
              <h1 className="t-display-xxl" style={{ marginBottom: '24px', color: 'var(--ink)' }}>
                Verify public projects from space.
              </h1>

              <p className="t-body-lg" style={{ marginBottom: '40px', color: 'var(--body)' }}>
                TerraGuard uses satellite data to check if government infrastructure is actually being built, or if the structures were already there before the contract started.
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/dashboard" className="btn-ghost btn-ghost-accent" style={{ textDecoration: 'none' }}>
                  Start Analysis
                </Link>
                <button className="btn-ghost" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                  How it works
                </button>
              </div>
            </motion.div>

            {/* Right Asset — Public-Facing Graphic */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'var(--canvas-soft)',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.05)',
                border: '1px solid var(--hairline-strong)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'var(--error-soft)', color: 'var(--error)'
                }}>
                  <WarningDiamond size={24} weight="fill" />
                </div>
                <div>
                  <div className="t-micro-cap" style={{ color: 'var(--error)', fontWeight: 700 }}>Flagged for Review</div>
                  <div className="t-display-sm" style={{ color: 'var(--ink)' }}>Pre-Existing Structure</div>
                </div>
              </div>

              <div className="hairline" style={{ margin: '8px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div className="t-micro-cap" style={{ marginBottom: '4px' }}>Claimed Start</div>
                  <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--ink)' }}>Jan 15, 2023</div>
                </div>
                <div>
                  <div className="t-micro-cap" style={{ marginBottom: '4px' }}>Detected Start</div>
                  <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--ink)' }}>Nov 04, 2022</div>
                </div>
              </div>

              <div style={{
                marginTop: '8px', padding: '16px', borderRadius: '8px',
                background: 'var(--canvas)', border: '1px solid var(--hairline)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span className="t-body" style={{ color: 'var(--mute)' }}>Discrepancy</span>
                <span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '18px' }}>72 days early</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS — ASYMMETRIC BENTO ─── */}
      <section id="how-it-works" className="section-dark" style={{ padding: '96px 0', borderTop: '1px solid var(--hairline)' }}>
        <div className="band-inner">
          <h2 className="t-display-xl" style={{ marginBottom: '64px', maxWidth: '480px' }}>
            Independent verification pipeline
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            background: 'var(--hairline)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Cell 1 */}
            <div style={{ background: 'var(--canvas)', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <Broadcast size={24} style={{ marginBottom: '24px', color: 'var(--ink)' }} />
                <h3 className="t-display-sm" style={{ marginBottom: '12px' }}>01. Pull SAR Data</h3>
                <p className="t-body" style={{ color: 'var(--body)', maxWidth: '600px' }}>
                  Query Sentinel-1 GRD backscatter at the given coordinates via Google Earth Engine. Radar penetrates clouds, providing a reliable historical time series regardless of weather.
                </p>
              </div>
            </div>

            {/* Cell 2 */}
            <div style={{ background: 'var(--canvas-soft)', padding: '48px' }}>
              <ChartLine size={24} style={{ marginBottom: '24px', color: 'var(--ink)' }} />
              <h3 className="t-display-sm" style={{ marginBottom: '12px' }}>02. Detect Change</h3>
              <p className="t-body" style={{ color: 'var(--body)', maxWidth: '600px' }}>
                Apply rolling median filters to reduce SAR speckle noise, then run ruptures.Pelt change point detection on the VV time series to find the exact moment of ground disruption.
              </p>
            </div>

            {/* Cell 3 */}
            <div style={{ background: 'var(--canvas-soft-2)', padding: '48px' }}>
              <ShieldCheck size={24} style={{ marginBottom: '24px', color: 'var(--ink)' }} />
              <h3 className="t-display-sm" style={{ marginBottom: '12px' }}>03. Return Verdict</h3>
              <p className="t-body" style={{ color: 'var(--body)', maxWidth: '600px' }}>
                Compare the mathematically detected construction date against the official Notice-to-Proceed (NTP) date. Timeline discrepancies and missing construction signals are flagged for review.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* ─── STATS BAND ─── */}
      <section style={{ background: 'var(--canvas)', padding: '0 0 96px 0' }}>
        <div className="band-inner">
          <div className="hairline" style={{ marginBottom: '64px' }} />
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1px',
            background: 'var(--hairline)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {[
              { label: 'Satellite revisit', value: '6–12', unit: 'days', desc: 'Frequency of new satellite imagery.' },
              { label: 'Buffer radius', value: '30', unit: 'm', desc: 'Scan area around target coordinates.' },
              { label: 'Confidence floor', value: '30', unit: '%', desc: 'Filters out seasonal vegetation and minor ground shifts to prevent false alarms.' },
              { label: 'Tolerance', value: '±12', unit: 'days', desc: 'Grace period from contract date.' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 180px', background: 'var(--canvas-soft)', padding: '32px' }}>
                <div className="t-micro-cap" style={{ marginBottom: '12px' }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                  <span className="stat-num">{s.value}</span>
                  <span className="t-body">{s.unit}</span>
                </div>
                <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--mute)' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '48px 0', background: 'var(--canvas)', borderTop: '1px solid var(--hairline)' }}>
        <div className="band-inner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Broadcast size={18} color="var(--ink)" weight="fill" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600 }}>TerraGuard</span>
          </div>
          <p className="t-caption" style={{ maxWidth: '520px', textAlign: 'right', lineHeight: 1.6 }}>
            Powered by live Google Earth Engine Sentinel-1 GRD telemetry via earthengine-api.
            Algorithm: ruptures.Pelt (RBF cost function).<br /><br />
            <span style={{ color: 'var(--mute)' }}>
              Results are indicative only and intended to support authorized audits. They do not constitute legal findings or accusations of wrongdoing.
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
