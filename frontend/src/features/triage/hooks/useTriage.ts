'use client';

import { useCallback, useState } from 'react';
import { type AnalysisResult } from '@/lib/mockData';
import { toUserMessage, logTechnicalDetail } from '@/shared/utils/errorMessage';
import { fetchTriage } from '../services/triageService';
import { type ContractRow, type TriageResponse } from '../types/triage';

interface UseTriage {
  triage: TriageResponse | null;
  isLoading: boolean;
  error: string | null;
  runTriage: (rows: ContractRow[], analyses: AnalysisResult[]) => Promise<void>;
  reset: () => void;
}

/**
 * Ranking state for a completed batch.
 *
 * A failure here is not a failure of the batch: the analyses are already on
 * screen and still useful unranked. So the error is held and surfaced as a note
 * rather than thrown, and the caller keeps rendering its table either way.
 */
export function useTriage(): UseTriage {
  const [triage, setTriage] = useState<TriageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTriage = useCallback(async (rows: ContractRow[], analyses: AnalysisResult[]) => {
    if (analyses.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      setTriage(await fetchTriage(rows, analyses));
    } catch (e) {
      logTechnicalDetail('Triage ranking failed', e);
      setError(toUserMessage(e));
      setTriage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTriage(null);
    setError(null);
  }, []);

  return { triage, isLoading, error, runTriage, reset };
}
