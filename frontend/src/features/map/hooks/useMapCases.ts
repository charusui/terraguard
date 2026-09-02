'use client';

import { useState, useMemo } from 'react';
import { type MapCase, type InvestigationStatus } from '../types/mapCase';
import { type AnalysisResult, type VerdictType } from '@/lib/mockData';

// ─── Hardcoded mock SAR series generator ───────────────────────────────────
function makeSeries(claimedDate: string, scenario: VerdictType, numPoints = 60) {
  const claimed = new Date(claimedDate);
  const startDate = new Date(claimed);
  startDate.setMonth(startDate.getMonth() - 10);

  const isAlreadyBuilt = scenario === 'PRE_EXISTING_STRUCTURE';
  const baseLevel = (isAlreadyBuilt ? -10.5 : -14) + (Math.random() - 0.5) * 2;

  let changeIndex: number;
  if (scenario === 'EARLY_START') changeIndex = Math.floor(numPoints * 0.28);
  else if (scenario === 'CONSISTENT') changeIndex = Math.floor(numPoints * 0.62);
  else if (scenario === 'DELAYED_START') changeIndex = Math.floor(numPoints * 0.78);
  else changeIndex = -1;

  const series: AnalysisResult['series'] = [];
  for (let i = 0; i < numPoints; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor((i / numPoints) * 365 + i * 0.5));
    const noise = (Math.random() - 0.5) * 1.8;
    const spike = Math.random() < 0.05 ? (Math.random() - 0.5) * 3 : 0;
    let signal: number;
    if (changeIndex >= 0 && i >= changeIndex) {
      const ramp = Math.min(1, (i - changeIndex) / 5);
      signal = baseLevel + 3.5 * ramp + noise + spike;
    } else {
      signal = baseLevel + noise + spike;
    }
    const prevVals = series.slice(Math.max(0, i - 2), i).map(p => p.backscatter_db);
    const smoothed = prevVals.length > 0
      ? (prevVals.reduce((a, b) => a + b, 0) / prevVals.length + signal) / 2
      : signal;
    series.push({
      date: date.toISOString().split('T')[0],
      backscatter_db: Math.round(signal * 100) / 100,
      smoothed_db: Math.round(smoothed * 100) / 100,
    });
  }
  return series;
}

function makeChangePoint(
  series: AnalysisResult['series'],
  scenario: VerdictType,
  claimedDate: string,
): AnalysisResult['change_point'] {
  if (scenario === 'NO_CHANGE_DETECTED' || scenario === 'PRE_EXISTING_STRUCTURE') {
    return { detected_date: null, confidence: 0.18, days_difference: null };
  }
  const idx = scenario === 'EARLY_START'
    ? Math.floor(series.length * 0.28)
    : scenario === 'DELAYED_START'
    ? Math.floor(series.length * 0.78)
    : Math.floor(series.length * 0.62);
  const detected_date = series[idx]?.date ?? null;
  const claimed = new Date(claimedDate);
  const detected = detected_date ? new Date(detected_date) : null;
  const days_difference = detected ? Math.round((detected.getTime() - claimed.getTime()) / 86400000) : null;
  return { detected_date, confidence: 0.72 + Math.random() * 0.22, days_difference };
}

function makeResult(
  name: string,
  lat: number,
  lon: number,
  claimedDate: string,
  scenario: VerdictType,
  explanation: string,
  priorStructure?: AnalysisResult['prior_structure'],
): AnalysisResult {
  const series = makeSeries(claimedDate, scenario);
  const change_point = makeChangePoint(series, scenario, claimedDate);
  return {
    series,
    change_point,
    verdict: scenario,
    explanation,
    claimed_date: claimedDate,
    coordinates: { lat, lon },
    project_name: name,
    prior_structure: priorStructure,
  };
}

// ─── Hardcoded cases — real COA coordinates, mock SAR series ───────────────
const SEED_CASES: Omit<MapCase, 'status'>[] = [
  {
    id: 'case-001',
    owner: 'Jobert E.',
    isCurrentUser: true,
    sourceLabel: 'COA Fraud Audit · Contract 24CC0149',
    sourceUrl: 'https://www.philstar.com/nation/2025/09/26/2475562/irregularities-detailed-audit-reports-bulacan-flood-control-projects',
    description: 'COA found satellite imagery from 29 February 2024 — two months before the 23 April Notice-to-Proceed — already showing a flood control structure at the approved site. A ₱98.99M joint venture.',
    analysisResult: makeResult(
      'Bambang, Bocaue — Slope Protection',
      14.7636, 120.92071,
      '2024-04-23',
      'PRE_EXISTING_STRUCTURE',
      'Radar backscatter at this coordinate already read as a hard structure before the contract Notice-to-Proceed, and barely moved across the contract period. The site appears to have been built before the contract was awarded, rather than by it.',
      { exists_before_ntp: true, pre_ntp_db: 4.1, post_ntp_db: 4.4, rise_db: 0.3 },
    ),
  },
  {
    id: 'case-002',
    owner: 'Mark S.',
    isCurrentUser: false,
    sourceLabel: 'COA Fraud Audit · Contract 24CC0144',
    sourceUrl: 'https://newsinfo.inquirer.net/2111439/coa-fraud-audit-tags-4-more-flood-infra-projects-in-bulacan',
    description: 'Reported complete on 11 June 2024, but historical satellite imagery showed no flood control structure at the site as of 7 April 2025. Undertaken by Wawao Builders.',
    analysisResult: makeResult(
      'Sipat Section, Plaridel — Angat River',
      14.9036, 120.82639,
      '2024-03-20',
      'NO_CHANGE_DETECTED',
      'No statistically significant change in backscatter was detected at this coordinate during the entire analysis window. Despite billing claims, the satellite record shows no evidence of construction activity.',
    ),
  },
  {
    id: 'case-003',
    owner: 'Ana R.',
    isCurrentUser: false,
    sourceLabel: 'DPWH Contract 22CH0082',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Flood_protection_in_Betis_River_(Pampanga;_2023-08-22)_E911a_08.jpg',
    description: 'A legitimate project with construction photo-documented on site, running 1 June to 27 November 2022. The engine detects ground disturbance 22 days before the Notice-to-Proceed — routine mobilisation.',
    analysisResult: makeResult(
      'Betis River Slope Protection, Guagua',
      14.9748, 120.6427,
      '2022-06-01',
      'CONSISTENT',
      'The detected construction start date is consistent with the contract timeline. Backscatter change was observed within the expected window following the Notice-to-Proceed date. No anomaly detected for this location.',
    ),
  },
  {
    id: 'case-004',
    owner: 'Jobert E.',
    isCurrentUser: true,
    sourceLabel: 'COA Fraud Audit · Contract 24CC0217',
    sourceUrl: 'https://www.bworldonline.com/spotlight/2026/02/16/730771/coa-files-4-fraud-audit-reports-worth-over-p275-million-for-bulacan-flood-control-projects-flags-ghost-projects-unauthorized-relocations-and-questionable-accomplishments/',
    description: 'Radar shows significant ground disturbance at this Angat River section beginning 94 days before the official Notice-to-Proceed. Mobilisation records and pre-award activity logs flagged for review.',
    analysisResult: makeResult(
      'Sta. Maria Section — Angat River Embankment',
      14.8214, 120.9578,
      '2024-05-10',
      'EARLY_START',
      'Satellite backscatter data shows significant ground disturbance approximately 94 days BEFORE the contract Notice-to-Proceed date. Work appears to have broken ground ahead of the contract timeline.',
    ),
  },
  {
    id: 'case-005',
    owner: 'Renz T.',
    isCurrentUser: false,
    sourceLabel: 'COA Fraud Audit · Contract 24CC0188',
    sourceUrl: 'https://www.bworldonline.com/spotlight/2026/02/16/730771/coa-files-4-fraud-audit-reports-worth-over-p275-million-for-bulacan-flood-control-projects-flags-ghost-projects-unauthorized-relocations-and-questionable-accomplishments/',
    description: 'Ground disturbance on this Pampanga River section was not detected until 78 days after the Notice-to-Proceed. Billing timelines and cash advance records under review.',
    analysisResult: makeResult(
      'Hagonoy — Pampanga River Bank Protection',
      14.8336, 120.7312,
      '2024-02-15',
      'DELAYED_START',
      'Satellite backscatter data shows ground disturbance approximately 78 days AFTER the contract Notice-to-Proceed date. Work appears to have started well behind the contract timeline.',
    ),
  },
];

export type SortBy = 'verdict' | 'location' | 'status' | 'owner';
// 'all' | 'mine' | any owner name string
export type OwnerFilter = string;

export interface FilterState {
  ownerFilter: OwnerFilter;
  sortBy: SortBy;
}

const VERDICT_SEVERITY: Record<VerdictType, number> = {
  PRE_EXISTING_STRUCTURE: 0,
  EARLY_START: 1,
  NO_CHANGE_DETECTED: 2,
  LOCATION_MISMATCH: 3,
  DELAYED_START: 4,
  INSUFFICIENT_DATA: 5,
  CONSISTENT: 6,
};

const STATUS_ORDER: Record<InvestigationStatus, number> = {
  escalated: 0,
  under_investigation: 1,
  new: 2,
  done: 3,
};

export function useMapCases() {
  const [cases, setCases] = useState<MapCase[]>(() =>
    SEED_CASES.map(c => ({ ...c, status: 'new' as InvestigationStatus }))
  );
  const [filter, setFilter] = useState<FilterState>({ ownerFilter: 'all', sortBy: 'verdict' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Unique, sorted owner names (excluding 'You' — shown as 'Mine')
  const allOwners = useMemo(() => {
    const names = new Set(cases.filter(c => !c.isCurrentUser).map(c => c.owner));
    return Array.from(names).sort();
  }, [cases]);

  const filteredCases = useMemo(() => {
    let list = [...cases];

    // Owner filter
    if (filter.ownerFilter === 'mine') {
      list = list.filter(c => c.isCurrentUser);
    } else if (filter.ownerFilter !== 'all') {
      list = list.filter(c => c.owner === filter.ownerFilter);
    }

    // Search query — matches project name or owner
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.analysisResult.project_name.toLowerCase().includes(q) ||
        c.owner.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (filter.sortBy === 'verdict') {
        return VERDICT_SEVERITY[a.analysisResult.verdict] - VERDICT_SEVERITY[b.analysisResult.verdict];
      }
      if (filter.sortBy === 'location') {
        return b.analysisResult.coordinates.lat - a.analysisResult.coordinates.lat;
      }
      if (filter.sortBy === 'status') {
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      if (filter.sortBy === 'owner') {
        return a.owner.localeCompare(b.owner);
      }
      return 0;
    });
    return list;
  }, [cases, filter, searchQuery]);

  const selectedCase = cases.find(c => c.id === selectedId) ?? null;

  function updateStatus(id: string, status: InvestigationStatus) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }

  return {
    filteredCases, allCases: cases, allOwners,
    filter, setFilter,
    searchQuery, setSearchQuery,
    selectedId, setSelectedId, selectedCase, updateStatus,
  };
}
