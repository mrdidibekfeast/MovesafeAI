import type { MetricStatus, MovementReport, MovementType, ReportStatus } from '../types/report';

// Shared display helpers for report pages and cards.

const MOVEMENT_LABELS: Record<MovementType, string> = {
  squat: 'Squat',
  jump: 'Jump',
  landing: 'Landing',
  running: 'Running',
  walking: 'Walking',
  custom: 'Custom Movement',
};

export function movementLabel(report: MovementReport): string {
  // Custom names are trimmed and inner whitespace collapsed so padded or
  // messy input still displays cleanly.
  if (report.movementType === 'custom' && report.customMovementName?.trim()) {
    const name = report.customMovementName.trim().replace(/\s+/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return MOVEMENT_LABELS[report.movementType];
}

// Grouping key so "tennis serve", "Tennis Serve", and "TENNIS   SERVE"
// count as the same movement in dashboard statistics.
export function normalizeMovementKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type ScoreBand = 'strong' | 'developing' | 'attention';

// Educational score bands — deliberately non-medical wording.
export function scoreBand(score: number): { label: string; band: ScoreBand } {
  if (score >= 80) return { label: 'Strong', band: 'strong' };
  if (score >= 65) return { label: 'Developing', band: 'developing' };
  return { label: 'Needs Attention', band: 'attention' };
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

export const METRIC_STATUS_LABELS: Record<MetricStatus, string> = {
  good: 'Good',
  attention: 'Needs Attention',
  warning: 'Warning',
};

export function formatReportDate(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatReportDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

