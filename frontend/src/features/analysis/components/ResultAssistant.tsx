'use client';

// A short conversation about the result, sitting under the written finding.
//
// The opening message deliberately says nothing about the verdict. The block
// above has already stated it, and an opener that summarises it again rebuilds
// the duplication this replaced. So the assistant offers routes in, and the
// figures come back only when someone asks for them.
//
// Layout note: replies render as plain text on the card rather than in chat
// bubbles. Two stacks of facing bubbles is a lot of chrome for what is usually
// one question and one answer; the only turn that needs marking as separate is
// the operator's own, which gets a quiet chip.
//
// Geometry lives in resultAssistant.module.css, not in `style` props, because
// this block has to reflow on a phone and inline styles cannot hold a media
// query. Only values that genuinely depend on state stay inline.

import { useState, type CSSProperties, type FormEvent } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Check, Copy } from '@phosphor-icons/react';
import type { AnalysisResult } from '@/lib/mockData';
import logoDark from '@/assets/logo.png';
import logoLight from '@/assets/logo-light-mode.png';
import { useResultAssistant } from '../hooks/useResultAssistant';
import { useStreamedText } from '../hooks/useStreamedText';
import styles from './resultAssistant.module.css';

const OPENING_MESSAGE =
  'I can explain how this verdict was reached, what the confidence score means, or what to ' +
  'check next. Ask below, or start with one of these.';

const DISCLAIMER = 'Generated from this analysis. Verify against source records before acting on it.';

const COPIED_RESET_MS = 1600;

// The project has no visually-hidden utility class and this block is not the
// place to add one to globals.css, so announcements carry their own.
const SCREEN_READER_ONLY: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** The ↵ turn-back mark on each follow-up row. */
function ReturnArrow() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.75 }}
      aria-hidden="true"
    >
      <path d="M9 10l-5 5 5 5" />
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </svg>
  );
}

/** The TerraGuard mark, crossfading with the theme like every other placement. */
function LogoChip() {
  return (
    <span aria-hidden="true" className={styles.logoChip}>
      <span className={styles.logoInner}>
        <Image
          src={logoDark}
          alt=""
          fill
          sizes="17px"
          style={{ objectFit: 'contain' }}
          className="logo-mark logo-mark-dark"
        />
        <Image
          src={logoLight}
          alt=""
          fill
          sizes="17px"
          style={{ objectFit: 'contain' }}
          className="logo-mark logo-mark-light"
        />
      </span>
    </span>
  );
}

function TypingIndicator() {
  const reduce = useReducedMotion();
  return (
    <span style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', height: '20px' }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ width: '5px', height: '5px', borderRadius: '999px', background: 'var(--mute)' }}
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
          transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
      <span style={SCREEN_READER_ONLY}>The assistant is writing a reply</span>
    </span>
  );
}

/** An assistant reply, revealed at reading pace. */
function Answer({ text, shouldStream }: { text: string; shouldStream: boolean }) {
  const reduce = useReducedMotion();
  const { visibleText, isStreaming } = useStreamedText(text, shouldStream && !reduce);

  return (
    <p className={styles.answer}>
      {visibleText}
      {isStreaming && (
        <motion.span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '2px',
            height: '13px',
            marginLeft: '3px',
            borderRadius: '999px',
            background: 'var(--mute)',
            verticalAlign: 'text-bottom',
          }}
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </p>
  );
}

function CopyAction({ text }: { text: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard access can be refused outright (insecure origin, denied
      // permission). Nothing is broken and the text is still selectable, so
      // this stays silent rather than throwing an error at the operator.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={hasCopied ? 'Answer copied' : 'Copy answer'}
      className={styles.iconButton}
    >
      {hasCopied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
    </button>
  );
}

export default function ResultAssistant({ result }: { result: AnalysisResult }) {
  const { messages, openSuggestions, isSending, canRetry, ask, retry } = useResultAssistant(result);
  const [draft, setDraft] = useState('');

  const isSendDisabled = isSending || draft.trim().length === 0;

  const lastMessage = messages[messages.length - 1];
  const isLastAnswerCopyable =
    !isSending && lastMessage?.role === 'assistant' && !lastMessage.isError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSendDisabled) return;
    const question = draft.trim();
    setDraft('');
    void ask(question);
  };

  return (
    <div className={styles.wrap}>
      <p className={`t-micro-cap ${styles.eyebrow}`}>Ask about this result</p>

      <div className={styles.card}>
        <div className={styles.header}>
          <LogoChip />
          <span className={styles.headerName}>TerraGuard assistant</span>
          <span className={`t-micro-cap ${styles.project}`} title={result.project_name}>
            {result.project_name}
          </span>
        </div>

        <div className={styles.body}>
          <div aria-live="polite" className={styles.thread}>
            <Answer text={OPENING_MESSAGE} shouldStream={false} />

            {messages.map(message =>
              message.role === 'user' ? (
                <div key={message.id} className={styles.userRow}>
                  <span className={styles.userChip}>{message.content}</span>
                </div>
              ) : message.isError ? (
                <div key={message.id}>
                  <p className={`${styles.answer} ${styles.answerMuted}`}>{message.content}</p>
                  {canRetry && (
                    <button
                      type="button"
                      onClick={retry}
                      disabled={isSending}
                      className={styles.pill}
                    >
                      Try again
                    </button>
                  )}
                </div>
              ) : (
                <Answer key={message.id} text={message.content} shouldStream />
              ),
            )}

            {isSending && <TypingIndicator />}
          </div>

          {isLastAnswerCopyable && (
            <div className={styles.actions}>
              <CopyAction text={lastMessage.content} />
            </div>
          )}

          {openSuggestions.length > 0 && (
            <div className={styles.followups}>
              <p className={styles.followupsLabel}>Follow-ups</p>
              <div className={styles.followupList}>
                {openSuggestions.map(suggestion => (
                  <button
                    key={suggestion.question}
                    type="button"
                    onClick={() => void ask(suggestion.question)}
                    disabled={isSending}
                    className={styles.followup}
                  >
                    <ReturnArrow />
                    {suggestion.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.composer}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              disabled={isSending}
              placeholder="Ask about this result…"
              aria-label="Ask about this result"
              className={styles.composerInput}
            />
            <button
              type="submit"
              disabled={isSendDisabled}
              aria-label="Send question"
              className={styles.send}
            >
              <ArrowUp size={13} weight="bold" />
            </button>
          </form>

          <p className={styles.disclaimer}>{DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
