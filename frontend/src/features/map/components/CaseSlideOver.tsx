'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowSquareOut, User } from '@phosphor-icons/react';
import { type MapCase, type InvestigationStatus, STATUS_CONFIG } from '../types/mapCase';
import VerdictBanner from '@/components/VerdictBanner';
import SARChart from '@/components/SARChart';

const FONT = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

interface CaseSlideOverProps {
  mapCase: MapCase | null;
  onClose: () => void;
  onStatusChange: (id: string, status: InvestigationStatus) => void;
}

export default function CaseSlideOver({ mapCase, onClose, onStatusChange }: CaseSlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {mapCase && (
        <>
          {/* Backdrop — click to close */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.25)',
              zIndex: 40,
            }}
          />

          {/* Slide-over panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(560px, 95vw)',
              background: 'var(--canvas)',
              borderLeft: '1px solid var(--hairline)',
              zIndex: 50,
              overflowY: 'auto',
              fontFamily: FONT,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ─── Header ─── */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--canvas)',
                borderBottom: '1px solid var(--hairline)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                zIndex: 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                  }}
                >
                  {mapCase.analysisResult.project_name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {/* Owner badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: 'var(--mute)',
                      background: 'var(--canvas-soft)',
                      border: '1px solid var(--hairline)',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                    }}
                  >
                    <User size={11} />
                    {mapCase.isCurrentUser ? 'You' : mapCase.owner}
                  </span>
                  {/* Coordinates */}
                  <span style={{ fontSize: '12px', color: 'var(--mute)', fontFamily: FONT_BODY }}>
                    {mapCase.analysisResult.coordinates.lat.toFixed(4)}°N,{' '}
                    {mapCase.analysisResult.coordinates.lon.toFixed(4)}°E
                  </span>
                </div>
              </div>

              {/* Close */}
              <button
                id="slideover-close-btn"
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid var(--hairline)',
                  background: 'var(--canvas-soft)',
                  cursor: 'pointer',
                  color: 'var(--mute)',
                  flexShrink: 0,
                }}
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* ─── Body ─── */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

              {/* Description */}
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.65, color: 'var(--body)', fontFamily: FONT_BODY }}>
                {mapCase.description}
              </p>

              {/* Status selector */}
              <div
                style={{
                  background: 'var(--canvas-soft)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', flex: '0 0 auto' }}>
                  Investigation status
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                  {(Object.keys(STATUS_CONFIG) as InvestigationStatus[]).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = mapCase.status === s;
                    return (
                      <button
                        key={s}
                        id={`status-btn-${s}`}
                        onClick={() => onStatusChange(mapCase.id, s)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          border: isActive ? `1.5px solid ${cfg.color}` : '1.5px solid var(--hairline)',
                          background: isActive ? cfg.bg : 'transparent',
                          color: isActive ? cfg.color : 'var(--mute)',
                          fontSize: '12px',
                          fontWeight: 500,
                          fontFamily: FONT,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verdict banner */}
              <div>
                <VerdictBanner result={mapCase.analysisResult} />
              </div>

              {/* SAR Chart */}
              <SARChart result={mapCase.analysisResult} />

              {/* Source link */}
              <a
                href={mapCase.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--mute)',
                  textDecoration: 'none',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--hairline)',
                  background: 'var(--canvas-soft)',
                  fontFamily: FONT_BODY,
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  marginBottom: '8px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--hairline-strong)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--mute)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--hairline)';
                }}
              >
                <ArrowSquareOut size={13} />
                {mapCase.sourceLabel}
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
