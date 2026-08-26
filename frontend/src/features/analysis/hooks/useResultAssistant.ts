'use client';

// Owns the assistant thread for one analysis result: what has been asked, what
// came back, and how an answer is resolved.
//
// Two sources feed it. The suggested questions are answered locally from the
// result itself (see assistantAnswers.ts) — exact figures, no latency, and it
// works with no model API key. Anything typed goes to `/api/nl_query`, which
// only exists under the Vercel runtime, so mock mode says so plainly rather
// than firing a request that cannot land.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisResult } from '@/lib/mockData';
import { logTechnicalDetail } from '@/shared/utils/errorMessage';
import { buildSuggestions, findLocalAnswer, type SuggestedAnswer } from '../utils/assistantAnswers';

export type ThreadRole = 'user' | 'assistant';

export interface ThreadMessage {
  id: string;
  role: ThreadRole;
  content: string;
  /** Assistant bubbles that report a failure — styled muted, offer a retry. */
  isError?: boolean;
}

interface HistoryTurn {
  role: ThreadRole;
  content: string;
}

// Long enough that the typing indicator registers as a reply being written
// rather than a flicker, short enough not to feel like a stall.
const LOCAL_ANSWER_DELAY_MS = 450;

// The model is stateless between calls, so the thread is re-sent every time.
// Ten turns bounds the payload without truncating a realistic conversation.
const HISTORY_TURN_LIMIT = 10;

const MOCK_FREE_TEXT_REPLY =
  'Typed questions need the model API, which is not running in local demo mode. The suggested ' +
  'questions are answered from this analysis directly, so those work here.';

const ASSISTANT_ERROR_MESSAGE =
  'That question could not be answered just now. The analysis above is unaffected.';

// Whether typed questions may reach `/api/nl_query`.
//
// Two flags, because the assistant and the analysis need different credentials.
// The assistant needs GEMINI_API_KEY; the analysis needs GEE_SERVICE_ACCOUNT_KEY.
// Production already sets NEXT_PUBLIC_USE_REAL_GEE, so it keeps working with no
// new configuration — while NEXT_PUBLIC_ENABLE_AI_ASSISTANT alone turns the
// assistant on locally against mock analysis data, with no Earth Engine
// credentials involved.
const isAssistantLive = () =>
  process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === 'true' ||
  process.env.NEXT_PUBLIC_USE_REAL_GEE === 'true';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let messageCounter = 0;
const nextMessageId = () => `msg-${++messageCounter}`;

/**
 * The thread as the model should see it.
 *
 * Error bubbles are dropped — they are this app's copy, not something the
 * assistant said. A trailing user turn is dropped too: it is either in flight
 * or the one that just failed, and either way it is about to be re-sent as the
 * prompt rather than as history.
 */
function buildHistory(messages: ThreadMessage[]): HistoryTurn[] {
  const usable = messages.filter(m => !m.isError);
  while (usable.length > 0 && usable[usable.length - 1].role === 'user') usable.pop();

  return usable
    .slice(-HISTORY_TURN_LIMIT * 2)
    .map(({ role, content }) => ({ role, content }));
}

async function requestFollowup(
  result: AnalysisResult,
  question: string,
  history: HistoryTurn[],
): Promise<string> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('tg_token') ?? '' : '';

  const res = await fetch('/api/nl_query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'followup', verdict: result, history, question }),
  });

  const text = await res.text();
  let data: { answer?: string; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    // A 404 HTML page or a raw traceback lands here — keep a slice for the log.
    throw new Error(`Assistant returned non-JSON (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }

  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Assistant request failed (HTTP ${res.status})`);
  }
  if (typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('Assistant returned an empty answer');
  }

  return data.answer.trim();
}

export function useResultAssistant(result: AnalysisResult) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);

  // A fresh analysis is a fresh conversation — the previous thread describes a
  // different site. Adjusted during render rather than in an effect so the new
  // result never paints with the old thread still under it.
  const [trackedResult, setTrackedResult] = useState(result);
  if (trackedResult !== result) {
    setTrackedResult(result);
    setMessages([]);
    setAskedQuestions([]);
    setIsSending(false);
    setFailedQuestion(null);
  }

  // Lets an in-flight answer notice that its analysis has been replaced, so a
  // late reply is dropped instead of appearing under the new result.
  const currentResultRef = useRef(result);
  useEffect(() => {
    currentResultRef.current = result;
  }, [result]);

  const suggestions = useMemo<SuggestedAnswer[]>(() => buildSuggestions(result), [result]);

  const openSuggestions = useMemo(
    () => suggestions.filter(s => !askedQuestions.includes(s.question)),
    [suggestions, askedQuestions],
  );

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || isSending) return;

      const requestedFor = result;
      const history = buildHistory(messages);

      setMessages(prev => [...prev, { id: nextMessageId(), role: 'user', content: question }]);
      setAskedQuestions(prev => (prev.includes(question) ? prev : [...prev, question]));
      setIsSending(true);
      setFailedQuestion(null);

      try {
        const local = findLocalAnswer(suggestions, question);
        let answer: string;

        if (local) {
          await delay(LOCAL_ANSWER_DELAY_MS);
          answer = local;
        } else if (!isAssistantLive()) {
          await delay(LOCAL_ANSWER_DELAY_MS);
          answer = MOCK_FREE_TEXT_REPLY;
        } else {
          answer = await requestFollowup(result, question, history);
        }

        if (currentResultRef.current !== requestedFor) return;
        setMessages(prev => [...prev, { id: nextMessageId(), role: 'assistant', content: answer }]);
      } catch (e) {
        logTechnicalDetail('Assistant follow-up failed', e);
        if (currentResultRef.current !== requestedFor) return;
        setMessages(prev => [
          ...prev,
          { id: nextMessageId(), role: 'assistant', content: ASSISTANT_ERROR_MESSAGE, isError: true },
        ]);
        setFailedQuestion(question);
      } finally {
        if (currentResultRef.current === requestedFor) setIsSending(false);
      }
    },
    [isSending, messages, result, suggestions],
  );

  const retry = useCallback(() => {
    if (!failedQuestion || isSending) return;

    // Drop the failed reply and the user turn that produced it — `ask` puts
    // both back, so leaving them would duplicate the question in the thread.
    // `buildHistory` discards the same pair, so the re-sent history is clean.
    setMessages(prev => {
      const errorAt = prev.findIndex(m => m.isError);
      if (errorAt === -1) return prev;
      const from = errorAt > 0 && prev[errorAt - 1].role === 'user' ? errorAt - 1 : errorAt;
      return prev.slice(0, from);
    });
    setAskedQuestions(prev => prev.filter(q => q !== failedQuestion));

    void ask(failedQuestion);
  }, [ask, failedQuestion, isSending]);

  return { messages, openSuggestions, isSending, canRetry: failedQuestion !== null, ask, retry };
}
