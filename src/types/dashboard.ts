// Types for the authenticated Dashboard summary.

export interface DashboardSummary {
  totalReports: number;
  averageScore: number | null;
  mostAnalyzedMovement: string | null;
  latestReportDate: string | null; // ISO string of the newest completed report
}

export interface MovementReportCount {
  movementName: string;
  count: number;
}

export interface MovementDistributionItem {
  movementName: string;
  count: number;
  percentage: number; // 0–100, rounded to one decimal place
}

export interface ScoreHistoryItem {
  reportId: string;
  movementName: string;
  score: number; // clamped 0–100
  createdAt: string;
  formattedDate: string;
}

export type DashboardTimeRange = 'all' | '30-days' | '90-days' | '6-months';
