'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChatCircle, Check, Copy, MagnifyingGlass, WarningDiamond, ShieldCheck, ChartLine } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';

// Height of the fixed top nav. Drives the sticky rail offset, the scroll-spy
// band, and where anchor jumps land. Adjust if the header height changes.
const HEADER_OFFSET = 96;

const ANCHORS = [
  { id: 'pre-contract-activity', label: 'Pre-Contract Activity' },
  { id: 'no-signal-detected', label: 'No Signal Detected' },
  { id: 'verified-timeline', label: 'Verified Timeline' },
  { id: 'confidence-scores', label: 'Confidence Scores' },
  { id: 'prompt-library', label: 'Prompt Library' },
];

const NAV = [
  { label: 'Interpreting Findings', target: 'pre-contract-activity' },
  { label: 'Confidence Scores', target: 'confidence-scores' },
  { label: 'Prompt Library', target: 'prompt-library' },
];

type Verdict = {
  id: string;
  title: string;
  alias: string;
  status: string;
  accent: string;
  iconBg: string;
  Icon: React.ElementType;
  /** null renders the flat "no signal" case. 0–1 across the plot width. */
  detectedAt: number | null;
  caption: string;
  meaning: React.ReactNode;
  nextStep: string;
};

const VERDICTS: Verdict[] = [
  {
    id: 'pre-contract-activity',
    title: 'Pre-Contract Activity',
    alias: 'Pre-Existing',
    status: 'May warrant review',
    accent: 'var(--error)',
    iconBg: 'var(--error-soft)',
    Icon: WarningDiamond,
    detectedAt: 0.28,
    caption: 'Detected construction start falls before the contract date',
    meaning: (
      <>
        The algorithm detected significant structural changes <em>before</em> the official Notice-to-Proceed (NTP) date.
        Ground activity appears to pre-date the official funding timeline.
      </>
    ),
    nextStep:
      'Compare the optical imagery for the same window, then check the contract documents before treating this as a finding.',
  },
  {
    id: 'no-signal-detected',
    title: 'No Signal Detected',
    alias: 'No Change',
    status: 'May warrant review',
    accent: 'var(--warning-deep)',
    iconBg: 'var(--warning-soft)',
    Icon: MagnifyingGlass,
    detectedAt: null,
    caption: 'No sustained change in the signal across the contract period',
    meaning: (
      <>
        No significant construction signal was detected at the coordinates throughout the entire duration of the
        contract period. No structural changes found.
      </>
    ),
    nextStep:
      'Confirm the coordinates and the project footprint — a small or heavily vegetated site can hide real work from the sensor.',
  },
  {
    id: 'verified-timeline',
    title: 'Verified Timeline',
    alias: 'Consistent',
    status: 'No action needed',
    accent: 'var(--success)',
    iconBg: 'color-mix(in srgb, var(--success) 12%, transparent)',
    Icon: ShieldCheck,
    detectedAt: 0.78,
    caption: 'Detected construction start follows the contract date',
    meaning: (
      <>
        The satellite-detected construction start date aligns cleanly with the contract&apos;s Notice-to-Proceed date.
        The project execution matches the paperwork.
      </>
    ),
    nextStep: 'Nothing to chase. Keep the result on file as part of the audit trail.',
  },
];

const PROMPTS = [
  {
    category: 'General Audit',
    slug: 'general-audit',
    prompt: 'Investigate the Manila flood control project between Jan 2022 and Dec 2023. Did construction start on time?',
  },
  {
    category: 'Pre-Existing Search',
    slug: 'pre-existing-search',
    prompt: 'Show me any construction activity at coordinates [14.902, 120.845] prior to the Notice-to-Proceed date of March 15, 2023.',
  },
  {
    category: 'Missing Signal Scan',
    slug: 'missing-signal-scan',
    prompt: 'Scan all DPWH Region 3 contracts for 2023. Are there any projects where the confidence score for construction is below 20%?',
  },
  {
    category: 'Timeline Verification',
    slug: 'timeline-verification',
    prompt: 'Verify if the Bulacan bridge structure existed before November 2022. Compare the SAR backscatter jump against the contract date.',
  },
];

/**
 * One geometry for all three signatures: identical axis, identical contract-date
 * position, identical sample count. Only the step location changes.
 *
 * Markers sit as ticks on the baseline with labels below it, so nothing can land
 * on top of the trace. The contract marker uses --mute rather than --link, which
 * renders near-invisible against --canvas in dark mode.
 */
function SignatureChart({ detectedAt, accent, caption }: { detectedAt: number | null; accent: string; caption: string }) {
  const W = 520;
  const H = 150;
  const L = 14;
  const R = 14;
  const T = 20;
  const B = 30;
  const pw = W - L - R;
  const ph = H - T - B;
  const CONTRACT = 0.55; // identical in every chart

  const n = 26;
  const points = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const x = L + t * pw;
    const wobble = (i % 3 === 0 ? 4 : 0) - (i % 4 === 0 ? 3 : 0);
    const y = detectedAt === null ? T + ph * 0.62 + wobble : T + (t < detectedAt ? ph * 0.78 : ph * 0.24) + wobble;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M${points.join(' L')}`;
  const base = T + ph;
  const contractX = L + CONTRACT * pw;
  const detectedX = detectedAt === null ? null : L + detectedAt * pw;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={caption}
      style={{ display: 'block', overflow: 'visible', fontFamily: "'Roboto', sans-serif" }}
    >
      <line x1={L} y1={base} x2={L + pw} y2={base} stroke="var(--hairline-strong)" strokeWidth={1} />

      <path d={`${path} L${L + pw},${base} L${L},${base} Z`} fill="var(--ink)" fillOpacity={0.07} />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      <line x1={contractX} y1={T} x2={contractX} y2={base} stroke="var(--mute)" strokeWidth={1.5} strokeDasharray="3 3" strokeLinecap="round" />
      <circle cx={contractX} cy={base} r={3.5} fill="var(--mute)" />
      <text x={contractX} y={base + 16} textAnchor="middle" style={{ fill: 'var(--mute)', fontSize: '10px' }}>
        Contract date
      </text>

      {detectedX !== null && (
        <>
          <line x1={detectedX} y1={T} x2={detectedX} y2={base} stroke={accent} strokeWidth={2} strokeLinecap="round" />
          <circle cx={detectedX} cy={base} r={3.5} fill={accent} />
          <text x={detectedX} y={base + 16} textAnchor="middle" style={{ fill: accent, fontSize: '10px', fontWeight: 500 }}>
            Detected
          </text>
        </>
      )}
    </svg>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const { Icon } = verdict;

  return (
    <article id={verdict.id} className="tg-spec">
      <header className="tg-spechead">
        <span className="tg-specicon" style={{ background: verdict.iconBg, color: verdict.accent }}>
          <Icon size={18} weight="fill" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <h3 className="t-display-sm" style={{ margin: 0, lineHeight: 1.2 }}>{verdict.title}</h3>
          {/* Maps the guide's wording to the label shown in results. Delete if unwanted. */}
          <span className="tg-alias">shown in results as &ldquo;{verdict.alias}&rdquo;</span>
        </span>
        <span
          className="tg-status"
          style={{ background: `color-mix(in srgb, ${verdict.accent} 12%, transparent)`, color: verdict.accent }}
        >
          {verdict.status}
        </span>
      </header>

      <div className="tg-specbody">
        <p className="t-body" style={{ margin: 0, color: 'var(--body)' }}>
          <strong style={{ color: 'var(--ink)' }}>What it means:</strong> {verdict.meaning}
        </p>
        <div className="tg-plot">
          <SignatureChart detectedAt={verdict.detectedAt} accent={verdict.accent} caption={verdict.caption} />
        </div>
      </div>

      <footer className="tg-specfoot">
        <ArrowRight size={15} weight="bold" style={{ color: 'var(--mute)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontFamily: "'Roboto', sans-serif", fontSize: '12.5px', lineHeight: 1.6, color: 'var(--body)' }}>
          <strong style={{ color: 'var(--ink)' }}>Next step:</strong> {verdict.nextStep}
        </p>
      </footer>
    </article>
  );
}

/**
 * Tints the parts of a prompt a user actually has to swap out — coordinates,
 * dates, thresholds — plus the domain entities. Built as React nodes rather
 * than an HTML string so prompt text is never injected as markup.
 */
const MONTHS = 'Jan|Feb|Mar|March|Apr|May|Jun|June|Jul|July|Aug|Sept?|Oct|Nov|November|Dec';
const TOKEN_RE = new RegExp(
  [
    '(\\[[^\\]]+\\])',
    `((?:${MONTHS})\\.?\\s+\\d{1,2},\\s*\\d{4}|(?:${MONTHS})\\.?\\s+\\d{4}|\\b\\d{4}\\b)`,
    '(\\d{1,3}%)',
    '(Notice-to-Proceed|DPWH Region 3|Manila|Bulacan|SAR)',
  ].join('|'),
  'g'
);

const TOKEN_COLOR: Record<number, string> = {
  1: 'var(--warning-deep)', // coordinates
  2: 'var(--success)',      // dates
  3: 'var(--warning-deep)', // thresholds
  4: 'var(--link)',         // entities
};

function highlight(text: string) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const group = [1, 2, 3, 4].find(g => match![g] !== undefined) ?? 4;
    nodes.push(
      <span key={`${match.index}-${group}`} style={{ color: TOKEN_COLOR[group] }}>
        {match[group]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function PromptWindow({ item, showCaret }: { item: typeof PROMPTS[number]; showCaret: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt);
    } catch {
      // the clipboard API needs a secure context; fall back to a temp textarea
      const ta = document.createElement('textarea');
      ta.value = item.prompt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="tg-term">
      <div className="tg-termbar">
        <span className="tg-dots" aria-hidden="true">
          <span style={{ background: 'var(--error)' }} />
          <span style={{ background: 'var(--warning-deep)' }} />
          <span style={{ background: 'var(--success)' }} />
        </span>
        <span className="tg-termtitle">{item.slug}</span>
        <button
          type="button"
          className="tg-copy"
          onClick={copy}
          aria-label={copied ? `${item.category} prompt copied` : `Copy the ${item.category} prompt`}
          data-copied={copied}
        >
          {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="tg-termbody">
        <div className="tg-termhost">terraguard@audit ~ %</div>
        <p className="tg-termline">
          <span style={{ color: 'var(--success)' }}>$ </span>
          {highlight(item.prompt)}
          {showCaret && <span className="tg-caret" aria-hidden="true" />}
        </p>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(ANCHORS[0].id);

  // Scroll-spy: the topmost heading inside the reading band wins.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: `-${HEADER_OFFSET + 20}px 0px -60% 0px`, threshold: 0 }
    );

    ANCHORS.forEach(a => {
      const el = document.getElementById(a.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  const activeNav =
    active === 'prompt-library' ? 'prompt-library'
      : active === 'confidence-scores' ? 'confidence-scores'
        : 'pre-contract-activity';

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', color: 'var(--ink)' }}>
      <style>{`
        .tg-shell {
          display: grid;
          grid-template-columns: 200px minmax(0, 1fr) 190px;
          gap: 48px;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px;
          align-items: start;
        }
        .tg-rail { position: sticky; top: ${HEADER_OFFSET}px; }
        .tg-navbtn {
          display: block; width: 100%; text-align: left; border: none; background: none;
          padding: 8px 12px; border-radius: 10px; cursor: pointer;
          font-family: 'Roboto', sans-serif; font-size: 13px; color: var(--mute); line-height: 1.4;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .tg-navbtn:hover { color: var(--ink); }
        .tg-navbtn[data-on="true"] { background: var(--canvas-soft); color: var(--ink); font-weight: 500; }
        .tg-tocbtn {
          display: block; width: 100%; text-align: left; border: none; background: none;
          padding: 6px 0 6px 14px; cursor: pointer; border-left: 2px solid var(--hairline);
          font-family: 'Roboto', sans-serif; font-size: 12px; color: var(--mute); line-height: 1.45;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .tg-tocbtn:hover { color: var(--ink); }
        .tg-tocbtn[data-on="true"] { border-left-color: var(--ink); color: var(--ink); }

        /* ── verdict spec cards ── */
        .tg-spec {
          background: var(--canvas-soft);
          border: 1px solid var(--hairline);
          border-radius: 20px;
          overflow: hidden;
          scroll-margin-top: ${HEADER_OFFSET + 24}px;
        }
        .tg-spechead {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          padding: 16px 22px; background: var(--canvas);
          border-bottom: 1px solid var(--hairline);
        }
        .tg-specicon {
          width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .tg-alias {
          display: block; margin-top: 3px;
          font-family: 'Roboto', sans-serif; font-size: 11.5px; color: var(--mute);
        }
        .tg-status {
          flex-shrink: 0; padding: 5px 13px; border-radius: 999px;
          font-family: 'Roboto', sans-serif; font-size: 11.5px; font-weight: 500; white-space: nowrap;
        }
        .tg-specbody {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
          align-items: center; padding: 22px;
        }
        .tg-plot { background: var(--canvas); border-radius: 14px; padding: 12px 10px; }
        .tg-specfoot {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 14px 22px; background: var(--canvas);
          border-top: 1px solid var(--hairline);
        }

        /* ── terminal-style prompt windows ── */
        .tg-term {
          border: 1px solid var(--hairline); border-radius: 14px;
          overflow: hidden; background: var(--canvas-soft);
        }
        .tg-termbar {
          display: flex; align-items: center; gap: 10px; padding: 9px 12px;
          background: var(--canvas); border-bottom: 1px solid var(--hairline);
        }
        .tg-dots { display: flex; gap: 5px; }
        .tg-dots span { width: 9px; height: 9px; border-radius: 999px; opacity: 0.7; }
        .tg-termtitle {
          font-family: 'Roboto', sans-serif; font-size: 12px; color: var(--mute);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .tg-copy {
          margin-left: auto; flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 5px;
          border: 1px solid var(--hairline); border-radius: 8px;
          background: var(--canvas-soft); color: var(--mute);
          font-family: 'Roboto', sans-serif; font-size: 11px;
          padding: 5px 10px; cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .tg-copy:hover { color: var(--ink); }
        .tg-copy[data-copied="true"] {
          color: var(--success);
          background: color-mix(in srgb, var(--success) 14%, transparent);
          border-color: transparent;
        }
        .tg-termbody { padding: 14px 16px 16px; }
        .tg-termhost {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11.5px; color: var(--mute); margin-bottom: 6px;
        }
        .tg-termline {
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 13px; line-height: 1.75; color: var(--ink);
          /* hanging indent keeps wrapped lines clear of the $ prefix */
          padding-left: 1.4em; text-indent: -1.4em;
          overflow-wrap: anywhere;
        }
        .tg-caret {
          display: inline-block; width: 7px; height: 14px;
          background: var(--ink); vertical-align: -2px; margin-left: 4px;
          animation: tg-blink 1.1s step-end infinite;
        }
        @keyframes tg-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .tg-caret { animation: none; } }

        @media (max-width: 1180px) {
          .tg-shell { grid-template-columns: 190px minmax(0, 1fr); gap: 40px; }
          .tg-toc { display: none; }
        }
        @media (max-width: 900px) {
          .tg-specbody { grid-template-columns: minmax(0, 1fr); gap: 18px; }
        }
        @media (max-width: 860px) {
          .tg-shell { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0 20px; }
          .tg-nav { display: none; }
          .tg-spechead, .tg-specbody, .tg-specfoot { padding-left: 18px; padding-right: 18px; }
          .tg-termline { font-size: 12.5px; }
        }
      `}</style>

      <main style={{ paddingTop: '128px', paddingBottom: '96px' }}>
        <div className="tg-shell">
          {/* Section nav */}
          <nav className="tg-rail tg-nav" aria-label="Guide sections">
            <div className="t-micro-cap" style={{ marginBottom: '12px', color: 'var(--mute)' }}>Guide</div>
            {NAV.map(item => (
              <button
                key={item.target}
                type="button"
                className="tg-navbtn"
                data-on={activeNav === item.target}
                onClick={() => jumpTo(item.target)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div style={{ minWidth: 0 }}>
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
                Investigation Guide &amp; Prompt Library
              </h1>
              <p className="t-body-lg" style={{ color: 'var(--body)', marginBottom: '64px', maxWidth: '60ch' }}>
                Learn how to interpret satellite analysis verdicts and explore our pre-made prompt library for the upcoming AI investigation assistant.
              </p>
            </motion.div>

            <div className="hairline" style={{ marginBottom: '64px' }} />

            {/* ─── INTERPRETING FINDINGS ─── */}
            <section style={{ marginBottom: '96px' }}>
              <h2 className="t-display-md" style={{ marginBottom: '12px' }}>Interpreting Findings</h2>
              <p className="t-body" style={{ color: 'var(--mute)', marginBottom: '32px', maxWidth: '60ch' }}>
                Every chart below uses the same axis with the contract date in the same position, so the difference
                between the three verdicts is the shape of the signal — not the framing.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {VERDICTS.map(v => <VerdictCard key={v.id} verdict={v} />)}

                {/* Confidence Score */}
                <div
                  id="confidence-scores"
                  style={{
                    background: 'var(--canvas)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '20px',
                    padding: '32px',
                    scrollMarginTop: `${HEADER_OFFSET + 24}px`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <ChartLine size={20} color="var(--ink)" />
                    <h3 className="t-display-sm" style={{ margin: 0 }}>Understanding Confidence Scores</h3>
                  </div>
                  <p className="t-body" style={{ color: 'var(--body)', maxWidth: '60ch' }}>
                    TerraGuard uses Synthetic Aperture Radar (SAR), which penetrates clouds but can be noisy.
                    A score <strong>above 80%</strong> means a massive change in backscatter (e.g., pouring concrete, erecting steel).
                    A score <strong>below 50%</strong> means the algorithm struggled to find a clear breakpoint, usually due to small project footprint or heavy vegetation interference.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── PROMPT LIBRARY ─── */}
            <section id="prompt-library" style={{ scrollMarginTop: `${HEADER_OFFSET + 24}px` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <ChatCircle size={24} color="var(--ink)" />
                <h2 className="t-display-md" style={{ margin: 0 }}>AI Prompt Library</h2>
              </div>
              <p className="t-body" style={{ color: 'var(--body)', marginBottom: '32px', maxWidth: '60ch' }}>
                TerraGuard is integrating an AI chatbot that can run audits via natural language.
                Use these pre-made prompts to structure your investigations and help the AI retrieve the correct geographic and temporal data.
                Highlighted values &mdash; locations, dates, coordinates and thresholds &mdash; are the parts to swap for your own case.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {PROMPTS.map((item, i) => (
                  <PromptWindow key={item.slug} item={item} showCaret={i === 0} />
                ))}
              </div>
            </section>
          </div>

          {/* On this page */}
          <aside className="tg-rail tg-toc" aria-label="On this page">
            <div className="t-micro-cap" style={{ marginBottom: '12px', color: 'var(--mute)' }}>On this page</div>
            {ANCHORS.map(a => (
              <button key={a.id} type="button" className="tg-tocbtn" data-on={active === a.id} onClick={() => jumpTo(a.id)}>
                {a.label}
              </button>
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}