import { scoreBand } from './reportDisplay';

// Shared score helpers so clamping and labels stay consistent everywhere.

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

// "Strong" / "Developing" / "Needs Attention"
export function getScoreLabel(score: number): string {
  return scoreBand(clampScore(score)).label;
}
