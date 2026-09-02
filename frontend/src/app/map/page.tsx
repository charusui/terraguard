'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMapCases } from '@/features/map/hooks/useMapCases';
import FilterBar from '@/features/map/components/FilterBar';
import CasePanel from '@/features/map/components/CasePanel';

const MapView = dynamic(() => import('@/features/map/components/MapView'), { ssr: false });

const FONT = "'IBM Plex Sans', sans-serif";
const NAV_HEIGHT = 64; // px — matches GlobalNav height
const SIDEBAR_MIN = 320;
const SIDEBAR_MAX = 720;
const SIDEBAR_DEFAULT = 440;

const LEGEND = [
  { color: '#ee0000', label: 'Pre-existing / Early start' },
  { color: '#f5a623', label: 'No change / Delayed / Mismatch' },
  { color: '#0070f3', label: 'Consistent' },
  { color: '#888888', label: 'Insufficient data' },
];

export default function MapPage() {
  const {
    filteredCases, allCases, allOwners,
    filter, setFilter,
    searchQuery, setSearchQuery,
    selectedId, setSelectedId, selectedCase,
    updateStatus,
  } = useMapCases();

  // ── Sidebar resize ──────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(SIDEBAR_DEFAULT);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      // dragging the left edge — moving left increases width
      const delta = startX.current - e.clientX;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta));
      setSidebarWidth(next);
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        paddingTop: `${NAV_HEIGHT + 8}px`, // +8 gap between nav and content
        fontFamily: FONT,
        background: 'var(--canvas)',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT: Map ── */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <MapView
          cases={filteredCases}
          selectedId={selectedId}
          onSelect={id => setSelectedId(prev => (prev === id ? null : id))}
        />

        {/* Legend overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            zIndex: 20,
            background: 'var(--canvas)',
            border: '1px solid var(--hairline)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            fontFamily: FONT,
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
            Verdict
          </div>
          {LEGEND.map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="13" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" fill={color} />
                <circle cx="12" cy="10" r="3" fill="rgba(255,255,255,0.85)" />
              </svg>
              <span style={{ fontSize: '12px', color: 'var(--body)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Resizable sidebar ── */}
      <div
        style={{
          width: `${sidebarWidth}px`,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
        }}
      >
        {/* Drag handle — wider, obviously interactive */}
        <div
          onMouseDown={onMouseDown}
          title="Drag to resize panel"
          style={{
            width: '14px',
            flexShrink: 0,
            cursor: 'col-resize',
            position: 'relative',
            background: 'var(--canvas-soft)',
            borderLeft: '1px solid var(--hairline)',
            borderRight: '1px solid var(--hairline)',
            transition: 'background 0.15s',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.background = 'var(--canvas-soft-2)';
            el.style.borderColor = 'var(--hairline-strong)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.background = 'var(--canvas-soft)';
            el.style.borderColor = 'var(--hairline)';
          }}
        >
          {/* Grip pill — center of the handle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            pointerEvents: 'none',
          }}>
            {/* ‹ › arrows */}
            <span style={{ fontSize: '9px', color: 'var(--mute)', lineHeight: 1, userSelect: 'none' }}>‹</span>
            {/* grip dots */}
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--hairline-strong)' }} />
            ))}
            <span style={{ fontSize: '9px', color: 'var(--mute)', lineHeight: 1, userSelect: 'none' }}>›</span>
          </div>
        </div>

        {/* Sidebar content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--hairline)',
            background: 'var(--canvas)',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Sidebar title header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', fontFamily: FONT }}>
              Investigation Map
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--mute)', fontFamily: "'Roboto', sans-serif" }}>
              Philippines · DPWH flood control · {allCases.length} locations
            </p>
          </div>

          {/* Filter bar */}
          <FilterBar
            filter={filter}
            setFilter={setFilter}
            allCases={allCases}
            filteredCases={filteredCases}
            allOwners={allOwners}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Case panel */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CasePanel
              cases={filteredCases}
              selectedCase={selectedCase}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onClose={() => setSelectedId(null)}
              onStatusChange={updateStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
