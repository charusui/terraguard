/**
 * Maps technical failures (Python tracebacks, GEE messages, HTTP statuses) onto
 * plain-language copy that is safe to render.
 *
 * Nothing raw from the API should ever reach the screen: a message like
 * "time data 'null' does not match format '%Y-%m-%d'" tells the operator
 * nothing they can act on. Every branch below ends in an instruction.
 *
 * The original text is still worth keeping for debugging, so callers pair this
 * with `logTechnicalDetail` rather than discarding the error.
 */

type ErrorRule = {
  /** Matched case-insensitively against the raw message. */
  match: RegExp;
  message: string;
};

// Ordered — first match wins, so the specific rules sit above the generic ones.
const ERROR_RULES: ErrorRule[] = [
  {
    // strptime failures, including the literal "null" the parser used to emit.
    match: /does not match format|invalid date|unconverted data|strptime/i,
    message:
      'The contract NTP date is missing or unreadable. Pick a date in the Contract NTP Date field, then run the analysis again.',
  },
  {
    match: /missing lat, lon, or claimed_date/i,
    message:
      'Latitude, longitude, and the contract NTP date are all required. Fill in the empty field and try again.',
  },
  {
    match: /no sentinel-1|no images found|over land/i,
    message:
      'No satellite radar coverage was found for this point. Check that the coordinates fall on land rather than open water, and that the NTP date is not in the future.',
  },
  {
    match: /null vv values|edge of a scene/i,
    message:
      'This point sits at the edge of the satellite’s coverage, so the radar reading is incomplete. Try a coordinate a short distance inside the site boundary.',
  },
  {
    match: /no module named|importerror|modulenotfound|not importable/i,
    message:
      'The analysis service is temporarily unavailable. Please try again in a few minutes — if it persists, the deployment needs attention.',
  },
  {
    match: /unauthorized|401/,
    message: 'Your session has expired. Please sign in again to continue.',
  },
  {
    match: /quota|rate limit|429|resourceexhausted/i,
    message:
      'The analysis service is busy right now. Wait a moment and run the analysis again.',
  },
  {
    match: /timed? ?out|timeout|504|deadline/i,
    message:
      'The analysis took longer than expected and was stopped. Satellite queries for busy regions can be slow — please try again.',
  },
  {
    match: /credentials|service account|gee_service_account|initialize/i,
    message:
      'The satellite data connection is not available right now. Please try again shortly.',
  },
  {
    match: /invalid coordinates|could not convert|float\(\)/i,
    message:
      'Those coordinates could not be read. Enter latitude and longitude as decimal numbers, for example 14.5995 and 120.9842.',
  },
  {
    match: /failed to fetch|networkerror|load failed/i,
    message:
      'Could not reach the analysis service. Check your connection and try again.',
  },
  {
    match: /gemini_api_key|not configured/i,
    message:
      'The AI assistant is not available right now. You can still enter the coordinates and date manually.',
  },
];

const FALLBACK_MESSAGE =
  'The analysis could not be completed. Please check the coordinates and NTP date, then try again.';

/**
 * Turns any thrown value into copy that is safe to show an operator.
 * Always returns a complete sentence — never an empty string.
 */
export function toUserMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!raw.trim()) return FALLBACK_MESSAGE;

  const rule = ERROR_RULES.find(r => r.match.test(raw));
  return rule ? rule.message : FALLBACK_MESSAGE;
}

/**
 * Keeps the raw failure reachable in the browser console for debugging while
 * the operator sees only `toUserMessage`.
 */
export function logTechnicalDetail(context: string, error: unknown): void {
  if (typeof console !== 'undefined') {
    console.error(`[TerraGuard] ${context}:`, error);
  }
}
