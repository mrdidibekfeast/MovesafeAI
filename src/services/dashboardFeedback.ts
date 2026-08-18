import type { MovementReport } from '../types/report';
import type {
  DashboardFeedbackItem,
  DashboardFeedbackSummary,
  RecurringMetricInsight,
  ScoreTrend,
} from '../types/dashboardFeedback';
import { movementLabel, normalizeMovementKey } from '../utils/reportDisplay';
import { clampScore } from '../utils/scoreUtils';

/*
 * Local educational Dashboard feedback.
 *
 * Every insight below is produced by deterministic TypeScript logic from
 * the user's own completed reports — no external AI service is called and
 * nothing here is a diagnosis or medical advice.
 */

const TREND_WINDOW = 5; // most recent completed reports considered
const TREND_THRESHOLD = 3; // points needed to call a change a pattern
const RECURRING_MINIMUM = 2; // reports a metric must appear in
const STALE_REPORT_DAYS = 30;
const MAX_RECOMMENDATIONS = 4;

// Valid, non-future completed reports sorted oldest → newest.
function usableReports(reports: MovementReport[], referenceDate: Date): MovementReport[] {
  const end = referenceDate.getTime();
  return reports
    .filter(
      (report) =>
        report != null &&
        report.status === 'completed' &&
        !Number.isNaN(Date.parse(report.createdAt)) &&
        Date.parse(report.createdAt) <= end,
    )
    .slice()
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

// ----- latest report feedback -----

function buildLatestFeedback(latest: MovementReport): DashboardFeedbackItem {
  const score = clampScore(latest.overallScore);
  const movement = movementLabel(latest);

  let title: string;
  let message: string;
  let tone: DashboardFeedbackItem['tone'];

  if (score >= 85) {
    title = 'Strong result';
    tone = 'positive';
    message = `Your latest ${movement} report received a score of ${score}. This simulated result shows strong performance across the analyzed movement metrics.`;
  } else if (score >= 70) {
    title = 'Solid result';
    tone = 'neutral';
    message = `Your latest ${movement} report received a score of ${score}. Several movement areas were strong, with some opportunities for continued practice.`;
  } else if (score >= 50) {
    title = 'Developing result';
    tone = 'attention';
    message = `Your latest ${movement} report received a score of ${score}. Review the lower-scoring metrics and use the Learn page before your next analysis.`;
  } else {
    title = 'More attention suggested';
    tone = 'attention';
    message = `Your latest ${movement} report received a score of ${score}. Consider reviewing movement basics and repeating the analysis after practicing the suggested steps.`;
  }

  return {
    id: 'latest-report',
    title,
    message,
    tone,
    evidence: 'Based on your latest completed report',
  };
}

// ----- recurring metrics -----

interface MetricAggregate {
  displayName: string;
  scoreSum: number;
  scoreCount: number;
  reportIds: Set<string>;
}

function aggregateMetrics(reports: MovementReport[]): Map<string, MetricAggregate> {
  const groups = new Map<string, MetricAggregate>();
  for (const report of reports) {
    if (!Array.isArray(report.metrics)) continue;
    for (const metric of report.metrics) {
      if (!metric || typeof metric.label !== 'string') continue;
      if (!Number.isFinite(metric.score)) continue; // invalid scores are ignored
      const key = normalizeMovementKey(metric.label);
      if (!key) continue;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          displayName: metric.label.trim().replace(/\s+/g, ' '),
          scoreSum: clampScore(metric.score),
          scoreCount: 1,
          reportIds: new Set([report.id]),
        });
      } else {
        existing.scoreSum += clampScore(metric.score);
        existing.scoreCount += 1;
        existing.reportIds.add(report.id);
      }
    }
  }
  return groups;
}

function toInsight(aggregate: MetricAggregate): RecurringMetricInsight {
  return {
    metricName: aggregate.displayName,
    averageScore: Math.round(aggregate.scoreSum / aggregate.scoreCount),
    occurrenceCount: aggregate.reportIds.size,
  };
}

// ----- score trend -----

function averageOf(scores: number[]): number {
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function buildTrend(sortedReports: MovementReport[]): {
  scoreTrend: ScoreTrend;
  trendDifference: number | null;
  trendFeedback: DashboardFeedbackItem;
} {
  const recent = sortedReports.slice(-TREND_WINDOW);

  if (recent.length < 2) {
    return {
      scoreTrend: 'insufficient-data',
      trendDifference: null,
      trendFeedback: {
        id: 'score-trend',
        title: 'Recent score pattern',
        message: 'Complete at least two reports to begin seeing a recent score pattern.',
        tone: 'neutral',
        evidence:
          recent.length === 1
            ? 'Based on your 1 completed report'
            : 'No completed reports yet',
      },
    };
  }

  // Earlier half vs later half: 2 → 1/1, 3 → 1/2, 4 → 2/2, 5 → 2/3.
  const splitIndex = Math.floor(recent.length / 2);
  const earlier = recent.slice(0, splitIndex).map((r) => clampScore(r.overallScore));
  const later = recent.slice(splitIndex).map((r) => clampScore(r.overallScore));
  const difference = averageOf(later) - averageOf(earlier);
  const displayDifference = Math.abs(Math.round(difference));

  let scoreTrend: ScoreTrend;
  let message: string;
  let tone: DashboardFeedbackItem['tone'];

  if (difference >= TREND_THRESHOLD) {
    scoreTrend = 'increasing';
    tone = 'positive';
    message = `Your recent educational report scores show an upward pattern, with the later group averaging ${displayDifference} points higher.`;
  } else if (difference <= -TREND_THRESHOLD) {
    scoreTrend = 'decreasing';
    tone = 'attention';
    message = `Your recent report scores are averaging ${displayDifference} points lower than the earlier group. Review the lower-scoring metrics before your next analysis.`;
  } else {
    scoreTrend = 'stable';
    tone = 'neutral';
    message =
      'Your recent report scores have remained relatively stable, with only a small average difference between reports.';
  }

  return {
    scoreTrend,
    trendDifference: difference,
    trendFeedback: {
      id: 'score-trend',
      title: 'Recent score pattern',
      message,
      tone,
      evidence: `Based on your ${recent.length} most recent completed reports`,
    },
  };
}

// ----- main entry point -----

export function generateDashboardFeedback(
  reports: MovementReport[],
  referenceDate: Date = new Date(),
): DashboardFeedbackSummary {
  const sorted = usableReports(reports, referenceDate);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  // Latest report feedback
  const latestReportFeedback = latest ? buildLatestFeedback(latest) : null;

  // Recurring metrics (must appear in at least two completed reports)
  const aggregates = [...aggregateMetrics(sorted).values()].filter(
    (aggregate) => aggregate.reportIds.size >= RECURRING_MINIMUM,
  );
  const insights = aggregates.map(toInsight);

  let strongestMetric: RecurringMetricInsight | null = null;
  let attentionMetric: RecurringMetricInsight | null = null;
  let recurringMetricNote: string | null = null;

  if (insights.length === 0) {
    recurringMetricNote =
      'More completed reports are needed to identify recurring metric patterns.';
  } else if (insights.length === 1) {
    // Never label the same metric as both strongest and lowest.
    strongestMetric = insights[0];
    recurringMetricNote = 'More reports are needed to compare recurring metrics.';
  } else {
    const byStrongest = [...insights].sort(
      (a, b) =>
        b.averageScore - a.averageScore ||
        b.occurrenceCount - a.occurrenceCount ||
        a.metricName.localeCompare(b.metricName),
    );
    const byAttention = [...insights].sort(
      (a, b) =>
        a.averageScore - b.averageScore ||
        b.occurrenceCount - a.occurrenceCount ||
        a.metricName.localeCompare(b.metricName),
    );
    strongestMetric = byStrongest[0];
    attentionMetric = byAttention[0];
  }

  // Trend
  const { scoreTrend, trendDifference, trendFeedback } = buildTrend(sorted);

  // Recommendations (1–4, no near-duplicates)
  const recommendations: DashboardFeedbackItem[] = [];

  if (!latest) {
    recommendations.push({
      id: 'rec-first-analysis',
      title: 'Complete your first movement analysis',
      message: 'Upload an image or short video to create your first educational report.',
      tone: 'neutral',
      actionLabel: 'Start New Analysis',
      actionRoute: '/analyze',
    });
  } else {
    if (clampScore(latest.overallScore) < 70) {
      recommendations.push({
        id: 'rec-learn-basics',
        title: 'Review movement basics',
        message: 'Review movement basics before repeating the analysis.',
        tone: 'neutral',
        actionLabel: 'Open Learn',
        actionRoute: '/learn',
      });
    }

    if (attentionMetric) {
      recommendations.push({
        id: 'rec-focus-metric',
        title: `Focus on ${attentionMetric.metricName}`,
        message: `Focus your next practice session on ${attentionMetric.metricName}.`,
        tone: 'neutral',
        actionLabel: 'Open Learn',
        actionRoute: '/learn',
      });
    }

    // Latest report older than 30 calendar days (day-granularity boundary).
    const staleCutoff = new Date(referenceDate);
    staleCutoff.setDate(staleCutoff.getDate() - STALE_REPORT_DAYS);
    staleCutoff.setHours(0, 0, 0, 0);
    const latestIsStale = Date.parse(latest.createdAt) < staleCutoff.getTime();
    if (latestIsStale) {
      recommendations.push({
        id: 'rec-refresh',
        title: 'Create a fresh analysis',
        message: 'Create a new analysis to refresh your report history.',
        tone: 'neutral',
        actionLabel: 'Start New Analysis',
        actionRoute: '/analyze',
      });
    }

    // Avoid a second, near-identical /analyze recommendation.
    if (
      !latestIsStale &&
      (scoreTrend === 'stable' || scoreTrend === 'increasing')
    ) {
      recommendations.push({
        id: 'rec-continue',
        title: 'Keep building your history',
        message:
          'Continue building report history to better understand long-term patterns.',
        tone: 'positive',
        actionLabel: 'Start New Analysis',
        actionRoute: '/analyze',
      });
    }

    // Always offer at least one next step.
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-continue',
        title: 'Keep building your history',
        message:
          'Continue building report history to better understand long-term patterns.',
        tone: 'neutral',
        actionLabel: 'Start New Analysis',
        actionRoute: '/analyze',
      });
    }
  }

  return {
    latestReportFeedback,
    strongestMetric,
    attentionMetric,
    recurringMetricNote,
    scoreTrend,
    trendDifference,
    trendFeedback,
    recommendations: recommendations.slice(0, MAX_RECOMMENDATIONS),
  };
}
