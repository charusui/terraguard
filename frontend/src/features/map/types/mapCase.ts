import { type AnalysisResult } from '@/lib/mockData';

export type InvestigationStatus = 'new' | 'under_investigation' | 'done' | 'escalated';

export const STATUS_CONFIG: Record<InvestigationStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'var(--mute)', bg: 'var(--canvas-soft-2)' },
  under_investigation: { label: 'Under Investigation', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' },
  done: { label: 'Done', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)' },
  escalated: { label: 'Escalated', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)' },
};

export interface MapCase {
  id: string;
  owner: string;
  isCurrentUser: boolean;
  analysisResult: AnalysisResult;
  status: InvestigationStatus;
  sourceLabel: string;
  sourceUrl: string;
  description: string;
}
