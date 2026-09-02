'use client';

import { useState, useRef, useEffect } from 'react';
import { type FilterState, type SortBy } from '../hooks/useMapCases';
import { type MapCase, STATUS_CONFIG } from '../types/mapCase';
import { SortAscending, MagnifyingGlass, CaretDown, Check } from '@phosphor-icons/react';

const FONT = "'IBM Plex Sans', sans-serif";

interface FilterBarProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  allCases: MapCase[];
  filteredCases: MapCase[];
  allOwners: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

// Dropdown options: All, Mine, ─── divider ───, person A, person B…
interface OwnerOption {
  value: string;
  label: string;
  dividerBefore?: boolean;
}

function buildOwnerOptions(allOwners: string[]): OwnerOption[] {
  return [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'Mine' },
    ...allOwners.map((o, i) => ({ value: o, label: o, dividerBefore: i === 0 })),
  ];
}

function OwnerDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: OwnerOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        id="map-owner-dropdown-trigger"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: '8px',
          border: '1px solid var(--hairline)',
          background: 'var(--canvas)',
          color: 'var(--ink)',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: FONT,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {selected.label}
        <CaretDown size={11} style={{ color: 'var(--mute)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: 'var(--canvas)',
            border: '1px solid var(--hairline)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '140px',
            overflow: 'hidden',
            padding: '4px',
          }}
        >
          {options.map(opt => (
            <div key={opt.value}>
              {opt.dividerBefore && (
                <div style={{ height: '1px', background: 'var(--hairline)', margin: '4px 0' }} />
              )}
              <button
                id={`map-owner-option-${opt.value}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: value === opt.value ? 'var(--canvas-soft-2)' : 'transparent',
                  color: value === opt.value ? 'var(--ink)' : 'var(--body)',
                  fontSize: '12px',
                  fontWeight: value === opt.value ? 600 : 400,
                  fontFamily: FONT,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--canvas-soft)'; }}
                onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {opt.label}
                {value === opt.value && <Check size={12} style={{ color: 'var(--ink)' }} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  filter,
  setFilter,
  allCases,
  filteredCases,
  allOwners,
  searchQuery,
  setSearchQuery,
}: FilterBarProps) {
  const ownerOptions = buildOwnerOptions(allOwners);

  const flaggedCount = filteredCases.filter(c =>
    c.analysisResult.verdict === 'PRE_EXISTING_STRUCTURE' ||
    c.analysisResult.verdict === 'EARLY_START' ||
    c.analysisResult.verdict === 'NO_CHANGE_DETECTED'
  ).length;

  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'var(--canvas-soft)',
        flexShrink: 0,
      }}
    >
      {/* Search bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: 'var(--canvas)',
          border: '1px solid var(--hairline)',
          borderRadius: '8px',
          padding: '8px 11px',
        }}
      >
        <MagnifyingGlass size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
        <input
          id="map-search-input"
          type="text"
          placeholder="Search by project or owner…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '12px',
            fontFamily: FONT,
            color: 'var(--ink)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: '14px', lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Row: owner dropdown + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <OwnerDropdown
          value={filter.ownerFilter}
          onChange={v => setFilter({ ...filter, ownerFilter: v })}
          options={ownerOptions}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
          <SortAscending size={12} style={{ color: 'var(--mute)', flexShrink: 0 }} />
          <select
            id="map-sort-select"
            value={filter.sortBy}
            onChange={e => setFilter({ ...filter, sortBy: e.target.value as SortBy })}
            style={{
              flex: 1,
              appearance: 'none',
              background: 'var(--canvas)',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              padding: '5px 8px',
              fontSize: '12px',
              fontFamily: FONT,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <option value="verdict">Verdict severity</option>
            <option value="location">Location (N→S)</option>
            <option value="status">Status</option>
            <option value="owner">Owner</option>
          </select>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--mute)', fontFamily: FONT }}>
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{filteredCases.length}</span>
          {' '}of {allCases.length} location{allCases.length !== 1 ? 's' : ''}
          {flaggedCount > 0 && <span style={{ color: 'var(--error)' }}> · {flaggedCount} flagged</span>}
        </span>
        <div style={{ flex: 1 }} />
        {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
          const count = filteredCases.filter(c => c.status === key).length;
          if (!count) return null;
          return (
            <span key={key} style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '9999px', background: cfg.bg, color: cfg.color, fontFamily: FONT }}>
              {cfg.label} · {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
