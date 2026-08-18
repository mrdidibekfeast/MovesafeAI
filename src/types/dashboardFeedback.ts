// Types for locally generated Dashboard educational feedback.
// All feedback is produced by deterministic TypeScript — no AI involved.

export type FeedbackTone = 'positive' | 'neutral' | 'attention';

export type ScoreTrend = 'increasing' | 'decreasing' | 'stable' | 'insufficient-data';

export interface DashboardFeedbackItem {
  id: string;
  title: string;
  message: string;
  tone: FeedbackTone;
  // How much evidence the insight is based on, e.g.
  // "Based on your 5 most recent completed reports".
  evidence?: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface RecurringMetricInsight {
  metricName: string;
  averageScore: number;
  occurrenceCount: number;
}

export interface DashboardFeedbackSummary {
  latestReportFeedback: DashboardFeedbackItem | null;
  strongestMetric: RecurringMetricInsight | null;
  attentionMetric: RecurringMetricInsight | null;
  // Shown when there are not enough recurring metrics to compare.
  recurringMetricNote: string | null;
  scoreTrend: ScoreTrend;
  trendDifference: number | null;
  trendFeedback: DashboardFeedbackItem;
  recommendations: DashboardFeedbackItem[];
}
