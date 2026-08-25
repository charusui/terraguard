import { type VerdictType } from '@/lib/mockData';

export type TriagePriority = 'high' | 'medium' | 'low';

/** One scored project, as returned by /api/triage. */
export interface TriageEntry {
  /** Position in the ranked list, 1 = look here first. */
  rank: number;
  /** Index back into the analyses array that was submitted. */
  index: number;
  project_name: string;
  score: number;
  priority: TriagePriority;
  verdict: VerdictType;
  /** Why this project scored what it did, strongest reason first. */
  reasons: string[];
}

export interface TriageSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  flagged: number;
}

export interface TriageResponse {
  ranked: TriageEntry[];
  summary: TriageSummary;
}

/** A row as parsed from the operator's CSV, including any extra columns. */
export type ContractRow = Record<string, string | number | undefined>;
