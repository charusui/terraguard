'use client';

import { BookOpen, ChatCircle, MagnifyingGlass, WarningDiamond, ShieldCheck, ChartLine } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';

export default function GuidePage() {
  const reduce = useReducedMotion();

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', color: 'var(--ink)' }}>


      <main style={{ paddingTop: '128px', paddingBottom: '96px' }}>
        <div className="band-inner" style={{ maxWidth: '800px' }}>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="t-micro-cap" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mute)' }}>
              <BookOpen size={16} />
              Documentation
            </div>
            <h1 className="t-display-xl" style={{ marginBottom: '24px' }}>
              Investigation Guide & Prompt Library
            </h1>
            <p className="t-body-lg" style={{ color: 'var(--body)', marginBottom: '64px' }}>
              Learn how to interpret satellite analysis verdicts and explore our pre-made prompt library for the upcoming AI investigation assistant.
            </p>
          </motion.div>

          <div className="hairline" style={{ marginBottom: '64px' }} />

          {/* ─── INTERPRETING FINDINGS ─── */}
          <section style={{ marginBottom: '96px' }}>
            <h2 className="t-display-md" style={{ marginBottom: '32px' }}>Interpreting Findings</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              
              {/* Verdict 1: Pre-Existing */}
              <div style={{ background: 'var(--canvas-soft)', padding: '32px', borderRadius: '12px', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--error-soft)', color: 'var(--error)', padding: '8px', borderRadius: '8px' }}>
                    <WarningDiamond size={24} weight="fill" />
                  </div>
                  <div>
                    <h3 className="t-display-sm" style={{ marginBottom: '8px' }}>Pre-Contract Activity</h3>
                    <p className="t-body" style={{ color: 'var(--body)' }}>
                      <strong>What it means:</strong> The algorithm detected significant structural changes <em>before</em> the official Notice-to-Proceed (NTP) date. May warrant review (ground activity appears to pre-date the official funding timeline).
                    </p>
                  </div>
                </div>
                {/* SVG Visual */}
                <svg viewBox="0 0 800 200" width="100%" height="auto" style={{ display: 'block', background: 'var(--canvas)', borderRadius: '8px', border: '1px solid var(--hairline)' }}>
                  <path d="M 0 160 L 80 150 L 160 170 L 240 60 L 320 80 L 400 70 L 480 85 L 560 65 L 640 80 L 720 75 L 800 85" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
                  
                  <line x1="240" y1="0" x2="240" y2="200" stroke="var(--error)" strokeWidth="2" strokeDasharray="6 6" />
                  <rect x="180" y="10" width="120" height="24" fill="var(--error)" rx="12" />
                  <text x="240" y="26" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">DETECTED START</text>
                  
                  <line x1="600" y1="0" x2="600" y2="200" stroke="var(--link)" strokeWidth="2" strokeDasharray="6 6" />
                  <rect x="540" y="160" width="120" height="24" fill="var(--link)" rx="12" />
                  <text x="600" y="176" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">CONTRACT DATE</text>

                  <text x="420" y="110" fill="var(--error)" fontSize="14" fontWeight="600" textAnchor="middle">Anomaly: Pre-Contract Activity</text>
                </svg>
              </div>

              {/* Verdict 2: Ghost Project */}
              <div style={{ background: 'var(--warning-soft)', padding: '32px', borderRadius: '12px', border: '1px solid var(--warning-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--canvas)', color: 'var(--warning-deep)', padding: '8px', borderRadius: '8px' }}>
                    <MagnifyingGlass size={24} weight="fill" />
                  </div>
                  <div>
                    <h3 className="t-display-sm" style={{ marginBottom: '8px', color: 'var(--warning-deep)' }}>No Signal Detected</h3>
                    <p className="t-body" style={{ color: 'var(--warning-deep)', opacity: 0.9 }}>
                      <strong>What it means:</strong> No significant construction signal was detected at the coordinates throughout the entire duration of the contract period. May warrant review (no structural changes found).
                    </p>
                  </div>
                </div>
                {/* SVG Visual */}
                <svg viewBox="0 0 800 200" width="100%" height="auto" style={{ display: 'block', background: 'var(--canvas)', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.3)' }}>
                  <path d="M 0 160 L 80 150 L 160 165 L 240 145 L 320 160 L 400 150 L 480 165 L 560 145 L 640 160 L 720 155 L 800 160" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" opacity="0.6" />
                  
                  <line x1="240" y1="0" x2="240" y2="200" stroke="var(--link)" strokeWidth="2" strokeDasharray="6 6" />
                  <rect x="180" y="160" width="120" height="24" fill="var(--link)" rx="12" />
                  <text x="240" y="176" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">CONTRACT DATE</text>

                  <text x="520" y="110" fill="var(--warning-deep)" fontSize="14" fontWeight="600" textAnchor="middle">Anomaly: No Significant Signal</text>
                </svg>
              </div>

              {/* Verdict 3: Verified Timeline */}
              <div style={{ background: 'var(--canvas-soft)', padding: '32px', borderRadius: '12px', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--canvas)', color: 'var(--success)', padding: '8px', borderRadius: '8px', border: '1px solid var(--hairline)' }}>
                    <ShieldCheck size={24} weight="fill" />
                  </div>
                  <div>
                    <h3 className="t-display-sm" style={{ marginBottom: '8px' }}>Verified Timeline</h3>
                    <p className="t-body" style={{ color: 'var(--body)' }}>
                      <strong>What it means:</strong> The satellite-detected construction start date aligns cleanly with the contract's Notice-to-Proceed date. The project execution matches the paperwork.
                    </p>
                  </div>
                </div>
                {/* SVG Visual */}
                <svg viewBox="0 0 800 200" width="100%" height="auto" style={{ display: 'block', background: 'var(--canvas)', borderRadius: '8px', border: '1px solid var(--hairline)' }}>
                  <path d="M 0 160 L 80 150 L 160 170 L 240 155 L 320 165 L 400 145 L 480 60 L 560 80 L 640 70 L 720 85 L 800 65" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
                  
                  <line x1="400" y1="0" x2="400" y2="200" stroke="var(--link)" strokeWidth="2" strokeDasharray="6 6" />
                  <rect x="340" y="160" width="120" height="24" fill="var(--link)" rx="12" />
                  <text x="400" y="176" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">CONTRACT DATE</text>

                  <line x1="480" y1="0" x2="480" y2="200" stroke="var(--success)" strokeWidth="2" strokeDasharray="6 6" />
                  <rect x="420" y="10" width="120" height="24" fill="var(--success)" rx="12" />
                  <text x="480" y="26" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">DETECTED START</text>

                  <text x="640" y="110" fill="var(--success)" fontSize="14" fontWeight="600" textAnchor="middle">Verified: Built After Contract</text>
                </svg>
              </div>

              {/* Confidence Score */}
              <div style={{ background: 'var(--canvas)', padding: '32px', borderRadius: '12px', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <ChartLine size={20} color="var(--ink)" />
                  <h3 className="t-display-sm">Understanding Confidence Scores</h3>
                </div>
                <p className="t-body" style={{ color: 'var(--body)' }}>
                  TerraGuard uses Synthetic Aperture Radar (SAR), which penetrates clouds but can be noisy. 
                  A score <strong>above 80%</strong> means a massive change in backscatter (e.g., pouring concrete, erecting steel). 
                  A score <strong>below 50%</strong> means the algorithm struggled to find a clear breakpoint, usually due to small project footprint or heavy vegetation interference.
                </p>
              </div>
            </div>
          </section>

          {/* ─── PROMPT LIBRARY ─── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <ChatCircle size={24} color="var(--ink)" />
              <h2 className="t-display-md">AI Prompt Library</h2>
            </div>
            <p className="t-body" style={{ color: 'var(--body)', marginBottom: '32px' }}>
              TerraGuard is integrating an AI chatbot that can run audits via natural language. 
              Use these pre-made prompts to structure your investigations and help the AI retrieve the correct geographic and temporal data.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {[
                {
                  category: "General Audit",
                  prompt: "Investigate the Manila flood control project between Jan 2022 and Dec 2023. Did construction start on time?"
                },
                {
                  category: "Pre-Existing Search",
                  prompt: "Show me any construction activity at coordinates [14.902, 120.845] prior to the Notice-to-Proceed date of March 15, 2023."
                },
                {
                  category: "Missing Signal Scan",
                  prompt: "Scan all DPWH Region 3 contracts for 2023. Are there any projects where the confidence score for construction is below 20%?"
                },
                {
                  category: "Timeline Verification",
                  prompt: "Verify if the Bulacan bridge structure existed before November 2022. Compare the SAR backscatter jump against the contract date."
                }
              ].map((item, idx) => (
                <div key={idx} style={{ 
                  background: 'var(--canvas-soft)', 
                  padding: '24px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--hairline)' 
                }}>
                  <div className="t-micro-cap" style={{ marginBottom: '12px', color: 'var(--mute)' }}>{item.category}</div>
                  <code style={{ 
                    display: 'block', 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '14px', 
                    lineHeight: '1.6', 
                    color: 'var(--ink)' 
                  }}>
                    "{item.prompt}"
                  </code>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
