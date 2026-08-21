'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { At, Microphone, MicrophoneSlash, PaperPlaneTilt } from '@phosphor-icons/react';

/* ─────────────────────────────────────────────────────────
 * PROMPT BAR — composer for the natural-language query field
 *
 * An auto-resizing textarea with two lightweight completion menus:
 *   @  references one of the known COA-flagged cases by name
 *   /  inserts a starter template for a common investigation
 * Dictation uses the browser's real SpeechRecognition API (hidden
 * entirely where unsupported, so it never claims a capability that
 * isn't there) — there's no attach/model-picker here since nothing in
 * the backend actually reads a file or switches models.
 * ───────────────────────────────────────────────────────── */

const TEMPLATES = [
  { name: '/recent', desc: 'Projects claimed in the last 90 days', text: 'Show projects with a claimed start date in the last 90 days' },
  { name: '/discrepancy', desc: 'Timeline mismatches worth flagging', text: 'Investigate projects where construction appears to have started more than 30 days before the claimed date' },
  { name: '/region', desc: 'Scope the search to one area', text: 'Investigate DPWH projects near ' },
];

interface SpeechRecognitionResultLike { transcript: string }
interface SpeechRecognitionEventLike { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> }
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser feature detection has to differ between the server render (no
// window, so "unsupported") and the client — useSyncExternalStore is the
// React-sanctioned way to read that without a hydration mismatch or a
// setState-in-effect flagged as an impure render.
const noopSubscribe = () => () => {};
function useSpeechSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, () => !!getSpeechRecognitionCtor(), () => false);
}

/** the trailing @token or /token being typed, if any — mirrors how chat
 *  composers trigger completion menus only at the end of the draft */
function parseToken(draft: string): { kind: 'at' | 'slash'; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return { kind: match[2] === '@' ? 'at' : 'slash', query: match[3].toLowerCase(), start: match.index + match[1].length };
}

interface PromptBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** known case names, offered through the @ menu */
  knownCaseNames: string[];
}

export default function PromptBar({ value, onChange, onSend, placeholder, disabled, knownCaseNames }: PromptBarProps) {
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [listening, setListening] = useState(false);
  const speechSupported = useSpeechSupported();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // auto-resize the textarea to fit its content, capped at a sane max
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 160)}px`;
  }, [value]);

  const token = dismissed ? null : parseToken(value);
  const menu: 'at' | 'slash' | null = token?.kind ?? null;
  const rows =
    menu === 'at'
      ? knownCaseNames.filter(n => n.toLowerCase().includes(token?.query ?? '')).slice(0, 6).map(n => ({ label: n, desc: undefined as string | undefined, insert: `@${n} ` }))
      : menu === 'slash'
        ? TEMPLATES.filter(t => t.name.slice(1).startsWith(token?.query ?? '')).map(t => ({ label: t.name, desc: t.desc, insert: `${t.text} ` }))
        : [];

  // Wrap the raw counter into range instead of resetting it in an effect —
  // it self-corrects the moment `rows` changes, no extra render needed.
  const safeActive = rows.length > 0 ? active % rows.length : 0;

  const pick = (insert: string) => {
    onChange(token ? value.slice(0, token.start) + insert : value + insert);
    setDismissed(false);
    textareaRef.current?.focus();
  };

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (transcript) onChange(value ? `${value.trimEnd()} ${transcript}` : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="prompt-bar" data-prompt-bar>
      {menu && (
        <div className="prompt-bar-menu">
          {rows.length > 0 ? (
            rows.map((row, i) => (
              <button
                key={row.label}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(row.insert)}
                className={`prompt-bar-menu-row ${i === safeActive ? 'active' : ''}`}
              >
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{row.label}</span>
                {row.desc && <span style={{ color: 'var(--mute)', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.desc}</span>}
              </button>
            ))
          ) : (
            <div className="prompt-bar-menu-row" style={{ color: 'var(--mute)' }}>No matches</div>
          )}
        </div>
      )}

      <div className="prompt-bar-card">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => { onChange(e.target.value); setDismissed(false); }}
          onKeyDown={e => {
            if (menu && rows.length > 0) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(a => (a + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length);
                return;
              }
              if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
                e.preventDefault();
                pick(rows[safeActive].insert);
                return;
              }
            }
            if (e.key === 'Escape') { setDismissed(true); return; }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) onSend(); }
          }}
          placeholder={listening ? 'Listening…' : (placeholder ?? 'Type @ to reference a case, / for a template…')}
          rows={1}
          className="prompt-bar-textarea"
        />

        <div className="prompt-bar-controls">
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              type="button"
              aria-label="Reference a known case"
              title="Reference a known case (@)"
              onClick={() => { onChange(value ? `${value.trimEnd()} @` : '@'); textareaRef.current?.focus(); }}
              className="prompt-bar-btn"
            >
              <At size={15} />
            </button>
            {speechSupported && (
              <button
                type="button"
                aria-label={listening ? 'Stop dictation' : 'Start dictation'}
                aria-pressed={listening}
                onClick={toggleDictation}
                className="prompt-bar-btn"
                style={listening ? { color: 'var(--error)' } : undefined}
              >
                {listening ? <MicrophoneSlash size={15} /> : <Microphone size={15} />}
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label="Send"
            disabled={!canSend}
            onClick={onSend}
            className="prompt-bar-send"
          >
            <PaperPlaneTilt size={14} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
