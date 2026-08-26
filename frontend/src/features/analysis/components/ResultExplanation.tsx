'use client';

// The written finding, with everything past the opening sentences folded away.
//
// The full string states the finding and then lists three possibilities, which
// is more than a reader needs at a glance and less than they need when they
// start checking. So the lead stays visible and the rest sits one click away.
//
// Geometry lives in resultExplanation.module.css so the block can respond to
// width — inline styles cannot hold a media query.

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CaretDown } from '@phosphor-icons/react';
import { parseExplanation } from '../utils/parseExplanation';
import styles from './resultExplanation.module.css';

export default function ResultExplanation({ explanation }: { explanation: string }) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const [isExpanded, setIsExpanded] = useState(false);

  // A new analysis starts closed. Leaving the panel open carries the previous
  // result's reading position onto a finding the operator has not read yet.
  // Adjusted during render rather than in an effect — an effect here would
  // paint the new explanation expanded for a frame before collapsing it.
  const [trackedExplanation, setTrackedExplanation] = useState(explanation);
  if (trackedExplanation !== explanation) {
    setTrackedExplanation(explanation);
    setIsExpanded(false);
  }

  const { lead, rest, possibilities, hasMore } = parseExplanation(explanation);

  // Nothing parseable at all. The verdict banner and chart above still carry
  // the finding, so an empty container here would just be a gap.
  if (!lead && possibilities.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <p className={`t-micro-cap ${styles.eyebrow}`}>Analysis</p>

      <div className={styles.card}>
        {lead && <p className={styles.lead}>{lead}</p>}

        {hasMore && (
          <button
            type="button"
            onClick={() => setIsExpanded(open => !open)}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            className={`${styles.toggle} ${lead ? '' : styles.toggleFlush}`}
          >
            {isExpanded ? 'Hide the full explanation' : 'Read the full explanation'}
            <CaretDown
              size={12}
              weight="bold"
              className={styles.caret}
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
        )}

        <AnimatePresence initial={false}>
          {hasMore && isExpanded && (
            <motion.div
              id={panelId}
              key="panel"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className={styles.panel}>
                {rest && <p className={styles.rest}>{rest}</p>}

                {possibilities.length > 0 && (
                  <>
                    <p
                      className={`${styles.possibilitiesLabel} ${
                        rest ? '' : styles.possibilitiesLabelFlush
                      }`}
                    >
                      Top 3 possibilities
                    </p>
                    <ul className={styles.possibilityList}>
                      {possibilities.map((item, i) => (
                        <li key={item.label ?? i} className={styles.possibility}>
                          {item.label && (
                            <strong className={styles.possibilityLabel}>{item.label}: </strong>
                          )}
                          {item.description}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
