'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import SingleLookup from '@/components/SingleLookup';
import BatchMode from '@/components/BatchMode';
import LoginScreen from '@/components/LoginScreen';

export default function DashboardPage() {
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
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', color: 'var(--ink)' }}>
      {/* ─── ANALYSIS SECTION ─── */}
      <section id="analysis" style={{ padding: '128px 0 96px 0' }}>
        <div className="band-inner">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}
          >
            <div>
              <h1 className="t-display-xl" style={{ marginBottom: '8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>Dashboard</h1>
              <p className="t-body" style={{ color: 'var(--body)', fontFamily: "'Roboto', sans-serif" }}>Secure analysis environment</p>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', padding: '4px', borderRadius: '9999px' }}>
              {[
                { id: 'single', label: 'Single Lookup' },
                { id: 'batch', label: 'Batch Mode' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`tab-pill ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id as any)}
                  style={{ position: 'relative', fontFamily: "'Roboto', sans-serif" }}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="dashboard-tab-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--canvas-soft-2)',
                        border: '1px solid var(--hairline-strong)',
                        borderRadius: '9999px',
                        zIndex: 0
                      }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <div className="hairline" style={{ marginBottom: '40px' }} />

          <AnimatePresence mode="wait">
            {tab === 'single' && (
              <motion.div
                key="single"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <SingleLookup />
              </motion.div>
            )}
            {tab === 'batch' && (
              <motion.div
                key="batch"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <BatchMode />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
