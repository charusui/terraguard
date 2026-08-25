import { type AnalysisResult } from '@/lib/mockData';
import { type ContractRow, type TriageResponse } from '../types/triage';

/**
 * Score and rank a batch of analysed projects.
 *
 * The ranking rubric lives in `backend/triage/rank.py` and is deliberately not
 * duplicated here: the same weights have to drive the offline batch runs that
 * process the full contract list, and two copies would drift apart within a
 * week. That does mean this needs the Python API — it is unavailable when the
 * app runs without the serverless functions.
 */
export async function fetchTriage(
  rows: ContractRow[],
  analyses: AnalysisResult[],
): Promise<TriageResponse> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('tg_token') ?? '' : '';

  const res = await fetch('/api/triage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rows, analyses }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `Ranking failed (HTTP ${res.status})`;
    try {
      message = (JSON.parse(text).error as string) ?? message;
    } catch {
      // A crashed function returns Vercel's HTML error page, not JSON. Carry a
      // slice of it so the failure says something more than the status code.
      const detail = text.trim().replace(/\s+/g, ' ').slice(0, 160);
      if (detail) message = `${message}: ${detail}`;
    }
    throw new Error(message);
  }

  return res.json();
}
