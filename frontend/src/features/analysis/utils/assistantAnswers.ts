// Answers for the assistant's suggested questions, interpolated from the
// analysis the operator is actually looking at.
//
// These are written here rather than fetched for two reasons: the figures come
// out exact instead of paraphrased by a model, and the block stays fully
// functional on localhost with no model API key in the environment. Free-text
// questions are what the network call is for — see useResultAssistant.
//
// Tone rule, same as the backend's system instruction: describe what the radar
// recorded and what to check. Never accuse anyone of anything.

import type { AnalysisResult } from '@/lib/mockData';

export interface SuggestedAnswer {
  question: string;
  answer: string;
}

const QUESTION_CONFIDENCE = 'How confident is this?';
const QUESTION_BACKSCATTER = 'What is backscatter?';
const QUESTION_NO_DAY_GAP = 'Why is there no day gap?';
const QUESTION_STILL_BUILT = 'Could something still have been built?';
const QUESTION_CHECK_NEXT = 'What should I check next?';

function formatDate(value: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function confidenceAnswer(result: AnalysisResult): string {
  const pct = Math.round((result.change_point.confidence ?? 0) * 100);
  return (
    `The detection scored ${pct}% confidence. That number describes how cleanly the radar ` +
    'record separates into a "before" and an "after" — a high score means the shift was sharp ' +
    'and held, rather than ordinary week-to-week noise from rain, vegetation or the satellite ' +
    'passing at a slightly different angle. It measures the strength of the signal, not the ' +
    'likelihood that anything improper happened.'
  );
}

function backscatterAnswer(): string {
  return (
    'Backscatter is the share of a radar pulse that bounces back to the satellite. Open ground ' +
    'scatters most of the pulse away and returns little; hard edges — concrete, rock armour, ' +
    'machinery, freshly cut earth — bounce a lot of it straight back. Sentinel-1 passes over the ' +
    'same coordinate every few days and reads through cloud and darkness, so tracking that ' +
    'returned energy over time builds a physical history of the site.'
  );
}

function noDayGapAnswer(result: AnalysisResult): string {
  if (result.verdict === 'PRE_EXISTING') {
    const detected = result.change_point.detected_date;
    const tail = detected
      ? ` The change point the detector did find, on ${formatDate(detected)}, lands after that — it is a later movement at a site that was already built, not the start of it.`
      : '';
    return (
      'Because this verdict does not rest on a date. The evidence is the level: the coordinate ' +
      'already read as a hard structure before the Notice-to-Proceed, so there is no start of ' +
      `work to measure a gap from.${tail}`
    );
  }
  if (result.verdict === 'NO_CHANGE_DETECTED') {
    return (
      'Because no change point was found at all. A day gap is the distance between the contract ' +
      'date and a detected start of work, and this record never produced a start of work to ' +
      'measure against.'
    );
  }
  return (
    'Because the analysis did not settle on a single change point, so there is no detected start ' +
    'of work to measure the contract date against.'
  );
}

function stillBuiltAnswer(): string {
  return (
    'It is possible. Radar reads surface texture, so work that does not change it stays invisible ' +
    'here — interior fit-out, drainage lining, sub-surface works, or anything under dense tree ' +
    'cover. A flat record is good evidence that no large surface-level earthworks or structures ' +
    'appeared at this coordinate. It is not evidence that nothing at all was done, and physical ' +
    'verification is what settles that.'
  );
}

function checkNextAnswer(result: AnalysisResult): string {
  const { lat, lon } = result.coordinates;
  const opening =
    `Start with the coordinate. Confirm that ${lat}, ${lon} is the site the contract actually ` +
    'describes — an adjacent structure a short distance away produces a reading like this one.';

  switch (result.verdict) {
    case 'PRE_EXISTING':
      return (
        `${opening} Then look for an earlier contract at the same location, and compare the ` +
        `as-built records against the ${formatDate(result.claimed_date)} Notice-to-Proceed. An ` +
        'authorized auditor can request the pre-NTP inspection photographs, which settle it ' +
        'either way.'
      );
    case 'NO_CHANGE_DETECTED':
      return (
        `${opening} Then check whether the billed scope was surface-level work at all, and ` +
        'request site photography covering the contract period. An authorized auditor can set ' +
        'the progress billings against what the record shows.'
      );
    case 'DELAYED_START':
      return (
        `${opening} Then compare the progress billings against the detected start date, and ` +
        'check whether an approved time extension or suspension order covers the gap.'
      );
    default:
      return (
        `${opening} Then confirm the detected start against the contractor's own mobilization ` +
        'records. A timeline that holds up is worth documenting as carefully as one that does not.'
      );
  }
}

/**
 * The suggested questions for a given result, in the order they are offered.
 * The conditional ones sit before "What should I check next?", which reads as
 * the closing question of the set.
 */
export function buildSuggestions(result: AnalysisResult): SuggestedAnswer[] {
  const suggestions: SuggestedAnswer[] = [
    { question: QUESTION_CONFIDENCE, answer: confidenceAnswer(result) },
    { question: QUESTION_BACKSCATTER, answer: backscatterAnswer() },
  ];

  if (result.change_point.days_difference === null) {
    suggestions.push({ question: QUESTION_NO_DAY_GAP, answer: noDayGapAnswer(result) });
  }
  if (result.verdict === 'NO_CHANGE_DETECTED') {
    suggestions.push({ question: QUESTION_STILL_BUILT, answer: stillBuiltAnswer() });
  }

  suggestions.push({ question: QUESTION_CHECK_NEXT, answer: checkNextAnswer(result) });
  return suggestions;
}

/** Exact-match lookup so a pill and a typed-out identical question agree. */
export function findLocalAnswer(suggestions: SuggestedAnswer[], question: string): string | null {
  const needle = question.trim().toLowerCase();
  return suggestions.find(s => s.question.toLowerCase() === needle)?.answer ?? null;
}
