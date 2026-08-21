'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import SingleLookup from '@/components/SingleLookup';
import BatchMode from '@/components/BatchMode';
import LoginScreen from '@/components/LoginScreen';

// Decorative mark for the dashboard header — monochrome via currentColor,
// colored by the wrapper's `color` style so it follows the theme.
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
      <section id="analysis" style={{ padding: '128px 0 96px 0', overflow: 'hidden' }}>
        <div className="band-inner" style={{ position: 'relative' }}>
          {/* Large ambient watermark filling the empty space to the right
              of the form — a faint floating mark, not competing UI chrome. */}
          <motion.div
            aria-hidden="true"
            className="dashboard-watermark"
            animate={reduce ? undefined : { y: [0, -18, 0] }}
            transition={reduce ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SatelliteMark />
          </motion.div>

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
