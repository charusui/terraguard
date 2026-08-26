// The backend hands `explanation` over as one preformatted string shaped:
//
//   <summary paragraph>
//
//   Top 3 Possibilities:
//   • <label>: <description>
//
// backend/analyze.py owns that shape, so this parse is deliberately defensive.
// Every miss degrades to "render the whole string as the lead" — a marker that
// moves must never throw here, and must never leave an empty block on screen.

const POSSIBILITIES_MARKER = 'Top 3 Possibilities:';

// Sentence boundary: punctuation, then real whitespace, then a capital. The
// figures in the copy carry decimals ("5.19 dB") and those have no whitespace
// after the period, so they never register as a break.
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z])/;

const BULLET_PREFIX = /^[•\-]\s*/;

// Bullets arrive as "Label: description". Descriptions routinely contain an em
// dash and sometimes a second colon, so only the first colon separates them,
// and the label has to be short enough to actually read as a label.
const LABEL_SEPARATOR = /^([^:]{2,60}):\s+([\s\S]+)$/;

// Below this a lead reads as a fragment rather than a finding, so a short
// opening sentence pulls the next one in with it.
const LEAD_MIN_CHARS = 90;

// The mock explanations behind Custom Lookup carry no possibilities list, so
// the toggle would sometimes hide one short trailing sentence — a click that
// gives back almost nothing. When there is nothing else behind it and the
// remainder is this short, the paragraph is shown whole instead.
const MIN_WORTHWHILE_HIDDEN_CHARS = 180;

export interface Possibility {
  label: string | null;
  description: string;
}

export interface ParsedExplanation {
  /** Always populated when the source string had any content. */
  lead: string;
  /** Remainder of the summary paragraph. Empty when the lead covers all of it. */
  rest: string;
  possibilities: Possibility[];
  /** False when there is nothing behind the toggle, so the caller can omit it. */
  hasMore: boolean;
}

function parsePossibilities(block: string): Possibility[] {
  return block
    .split('\n')
    .map(line => line.trim().replace(BULLET_PREFIX, '').trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = LABEL_SEPARATOR.exec(line);
      return match
        ? { label: match[1].trim(), description: match[2].trim() }
        : { label: null, description: line };
    });
}

function splitLead(body: string): { lead: string; rest: string } {
  if (!body) return { lead: '', rest: '' };

  const sentences = body.split(SENTENCE_BOUNDARY).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return { lead: body, rest: '' };

  const take = sentences[0].length < LEAD_MIN_CHARS && sentences.length > 2 ? 2 : 1;
  const lead = sentences.slice(0, take).join(' ').trim();
  const rest = sentences.slice(take).join(' ').trim();

  return rest ? { lead, rest } : { lead: body, rest: '' };
}

export function parseExplanation(explanation: string): ParsedExplanation {
  const source = typeof explanation === 'string' ? explanation.trim() : '';
  if (!source) return { lead: '', rest: '', possibilities: [], hasMore: false };

  const markerAt = source.indexOf(POSSIBILITIES_MARKER);

  // No marker means the whole string is the summary — show it intact rather
  // than guessing at a structure that is not there. A marker at position 0
  // means the reverse: no summary, only possibilities, and the lead is empty.
  const body = (markerAt === -1 ? source : source.slice(0, markerAt)).trim();
  const possibilities =
    markerAt === -1 ? [] : parsePossibilities(source.slice(markerAt + POSSIBILITIES_MARKER.length));

  const split = splitLead(body);
  const isHidingTooLittle =
    possibilities.length === 0 && split.rest.length < MIN_WORTHWHILE_HIDDEN_CHARS;

  const { lead, rest } = isHidingTooLittle ? { lead: body, rest: '' } : split;

  return { lead, rest, possibilities, hasMore: rest.length > 0 || possibilities.length > 0 };
}
