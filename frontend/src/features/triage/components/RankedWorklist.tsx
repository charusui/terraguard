'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DownloadSimple, MapPin, CaretDown } from '@phosphor-icons/react';
import { type AnalysisResult } from '@/lib/mockData';
import { downloadCsv } from '@/shared/utils/csv';
import { type TriageEntry, type TriagePriority, type TriageResponse } from '../types/triage';

// Requires 'IBM Plex Sans' (400/500/600) and 'Roboto' (400/500) loaded app-wide.
const FONT_HEADING = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

const PRIORITY: Record<TriagePriority, { label: string; accent: string }> = {
  high: { label: 'Visit first', accent: 'var(--error)' },
  medium: { label: 'Worth checking', accent: 'var(--warning)' },
  low: { label: 'Low priority', accent: 'var(--mute)' },
};

// Clearing a row is a claim, and only one verdict supports it. CONSISTENT
// means the satellite watched the site and the timeline held. Nothing else
// does, including the other verdicts that score zero: an unreadable site also
// scores zero, and telling an auditor there is no action on a project nobody
// could measure is the tool reporting a check it never made.
const CLEARED = { label: 'No action', accent: 'var(--success)' };
const NOT_ASSESSED = { label: 'Not assessed', accent: 'var(--mute)' };
const RECORDS_FIRST = { label: 'Fix the record', accent: 'var(--warning)' };

function bandFor(entry: TriageEntry): { label: string; accent: string } {
  if (entry.verdict === 'CONSISTENT') return CLEARED;
  // Neither of these is a finding about the works, and neither is a clearance.
  if (entry.verdict === 'INSUFFICIENT_DATA') return NOT_ASSESSED;
  if (entry.verdict === 'LOCATION_MISMATCH') return RECORDS_FIRST;
  return PRIORITY[entry.priority];
}

// How many rows to show before the list collapses. An auditor reads the top of
// a worklist; the rest is there to be exported, not scrolled.
const VISIBLE_ROWS = 12;

interface Props {
  triage: TriageResponse;
  results: AnalysisResult[];
}

function ScoreBar({ score, accent }: { score: number; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span
        className="stat-num"
        style={{
          fontSize: '20px', fontWeight: 600, lineHeight: 1, color: accent,
          fontFamily: FONT_HEADING, fontVariantNumeric: 'tabular-nums', minWidth: '28px',
          textAlign: 'right',
        }}
      >
        {score}
      </span>
      <span
        style={{
          width: '56px', height: '5px', borderRadius: '999px',
          background: 'var(--canvas-soft-2)', overflow: 'hidden', flexShrink: 0,
        }}
      >
        <span style={{ display: 'block', height: '100%', borderRadius: '999px', background: accent, width: `${score}%` }} />
      </span>
    </div>
  );
}

function WorklistRow({ entry, result, position }: { entry: TriageEntry; result?: AnalysisResult; position: number }) {
  const reduce = useReducedMotion();
  const { label, accent } = bandFor(entry);
  const coordinates = result?.coordinates;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(position * 0.04, 0.5), ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', gap: '16px', padding: '18px 20px',
        borderTop: position === 0 ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: '30px', height: '30px', borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          color: accent, fontFamily: FONT_HEADING, fontSize: '13px', fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {entry.rank}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontFamily: FONT_HEADING, fontSize: '14.5px', fontWeight: 500, color: 'var(--ink)' }}>
            {entry.project_name}
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: '11.5px', color: accent }}>{label}</span>
        </div>

        {coordinates && (
          <p style={{
            margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '5px',
            fontFamily: FONT_BODY, fontSize: '11.5px', color: 'var(--mute)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <MapPin size={12} weight="bold" />
            {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}
          </p>
        )}

        {/* The reasons are the product. A rank with no explanation is a number
            an auditor cannot act on or defend. */}
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {entry.reasons.map((reason, i) => (
            <li
              key={i}
              style={{
                display: 'flex', gap: '8px', fontFamily: FONT_BODY, fontSize: '12.5px',
                lineHeight: 1.55, color: i === 0 ? 'var(--body)' : 'var(--mute)',
              }}
            >
              <span aria-hidden style={{ color: accent, flexShrink: 0 }}>•</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flexShrink: 0, alignSelf: 'flex-start', paddingTop: '3px' }}>
        <ScoreBar score={entry.score} accent={accent} />
      </div>
    </motion.li>
  );
}

export default function RankedWorklist({ triage, results }: Props) {
  const reduce = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const { ranked, summary } = triage;

  // Anything that scored raised a finding, so it belongs in the default view
  // even when it ranks low. Filtering on the band alone hid delayed and early
  // starts entirely, which is how a real finding became invisible.
  const withFindings = ranked.filter(entry => entry.score > 0);
  // A site the satellite could not read scores zero but is not cleared, so it
  // travels with the worklist rather than disappearing out of it.
  const notAssessed = ranked.filter(entry => entry.verdict === 'INSUFFICIENT_DATA');
  const openRows = ranked.filter(
    entry => entry.score > 0 || entry.verdict === 'INSUFFICIENT_DATA',
  );
  const visible = showAll ? ranked : openRows.slice(0, VISIBLE_ROWS);

  const headline =
    withFindings.length > 0
      ? `${withFindings.length} of ${summary.total} project${summary.total === 1 ? '' : 's'} raised a finding, ranked by how far the record and the satellite disagree.`
      : notAssessed.length > 0
        ? `No findings across ${summary.total} projects, though ${notAssessed.length} could not be assessed from the satellite record.`
        : `All ${summary.total} projects match their contract records.`;

  const exportWorklist = () => {
    downloadCsv(
      'terraguard_worklist.csv',
      ['Rank', 'Score', 'Priority', 'Project', 'Latitude', 'Longitude', 'Verdict', 'Reasons'],
      ranked.map(entry => {
        const result = results[entry.index];
        return [
          entry.rank, entry.score, entry.priority, entry.project_name,
          result?.coordinates.lat ?? '', result?.coordinates.lon ?? '',
          entry.verdict, entry.reasons.join(' | '),
        ];
      }),
    );
  };

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 className="t-display-sm" style={{ marginBottom: '6px', fontFamily: FONT_HEADING }}>
            Site-visit worklist
          </h3>
          <p className="t-body" style={{ color: 'var(--body)', fontFamily: FONT_BODY, margin: 0 }}>
            {headline}
          </p>
        </div>
        <button className="btn-ghost" onClick={exportWorklist} style={{ height: '36px', borderRadius: '999px', fontFamily: FONT_BODY }}>
          <DownloadSimple size={14} weight="bold" /> Export worklist
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {(['high', 'medium', 'low'] as TriagePriority[]).map((key, i) => (
          <motion.div
            key={key}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'var(--canvas-soft)', borderRadius: '16px', padding: '16px 18px' }}
          >
            <span style={{ fontSize: '12px', fontFamily: FONT_BODY, color: 'var(--mute)' }}>
              {PRIORITY[key].label}
            </span>
            <div
              className="stat-num"
              style={{
                fontSize: '26px', fontWeight: 600, lineHeight: 1, marginTop: '6px',
                fontFamily: FONT_HEADING,
                color: summary[key] > 0 ? PRIORITY[key].accent : 'var(--mute)',
              }}
            >
              {summary[key]}
            </div>
          </motion.div>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{
          background: 'var(--canvas-soft)', borderRadius: '20px', padding: '32px 24px',
          textAlign: 'center', fontFamily: FONT_BODY,
        }}>
          <p style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: '14px' }}>
            Nothing to visit.
          </p>
          <p className="t-caption" style={{ margin: 0 }}>
            Every project in this batch matched its contract timeline and records. Show the full
            list to review the scores anyway.
          </p>
          <button
            className="btn-ghost"
            onClick={() => setShowAll(true)}
            style={{ marginTop: '16px', height: '34px', borderRadius: '999px', fontFamily: FONT_BODY }}
          >
            Show all {ranked.length}
          </button>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: '20px', background: 'var(--canvas)', overflow: 'hidden' }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {visible.map((entry, i) => (
              <WorklistRow key={`${entry.project_name}-${entry.rank}`} entry={entry} result={results[entry.index]} position={i} />
            ))}
          </ul>

          {!showAll && ranked.length > visible.length && (
            <button
              className="btn-ghost"
              onClick={() => setShowAll(true)}
              style={{
                width: '100%', height: '44px', borderRadius: 0, borderTop: '1px solid var(--hairline)',
                fontFamily: FONT_BODY, fontSize: '12.5px', justifyContent: 'center',
              }}
            >
              <CaretDown size={13} weight="bold" /> Show the remaining {ranked.length - visible.length}
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}
