import type { MovementReport } from '../types/report';
import type {
  DashboardSummary,
  DashboardTimeRange,
  MovementDistributionItem,
  ScoreHistoryItem,
} from '../types/dashboard';
import { formatReportDay, movementLabel, normalizeMovementKey } from '../utils/reportDisplay';
import { clampScore } from '../utils/scoreUtils';

/*
 * Dashboard statistics for the signed-in user's reports.
 * Only completed reports count — failed and processing reports never
 * affect the totals. Original report objects are never modified.
 */

// Completed reports only, skipping anything malformed.
function completedReports(reports: MovementReport[]): MovementReport[] {
  return reports.filter(
    (report) => report != null && report.status === 'completed',
  );
}

function hasValidDate(report: MovementReport): boolean {
  return !Number.isNaN(Date.parse(report.createdAt));
}

export function calculateDashboardSummary(reports: MovementReport[]): DashboardSummary {
  const completed = completedReports(reports);

  // ----- total -----
  const totalReports = completed.length;

  // ----- average score (clamped to 0–100 before averaging) -----
  const averageScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, report) => sum + clampScore(report.overallScore), 0) /
            completed.length,
        )
      : null;

  // ----- most analyzed movement -----
  // Grouped by normalized display name so "tennis serve" and "Tennis Serve"
  // count as one movement. Ties go to the most recently analyzed movement.
  const groups = new Map<string, { count: number; latest: number; displayName: string }>();
  for (const report of completed) {
    const displayName = movementLabel(report);
    const key = normalizeMovementKey(displayName);
    const created = hasValidDate(report) ? Date.parse(report.createdAt) : 0;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { count: 1, latest: created, displayName });
    } else {
      existing.count += 1;
      if (created > existing.latest) {
        existing.latest = created;
        existing.displayName = displayName;
      }
    }
  }

  let mostAnalyzedMovement: string | null = null;
  let best: { count: number; latest: number } | null = null;
  for (const group of groups.values()) {
    if (
      best === null ||
      group.count > best.count ||
      (group.count === best.count && group.latest > best.latest)
    ) {
      best = { count: group.count, latest: group.latest };
      mostAnalyzedMovement = group.displayName;
    }
  }

  // ----- latest completed report date (invalid dates are skipped) -----
  let latestReportDate: string | null = null;
  let latestTime = -Infinity;
  for (const report of completed) {
    if (!hasValidDate(report)) continue;
    const time = Date.parse(report.createdAt);
    if (time > latestTime) {
      latestTime = time;
      latestReportDate = report.createdAt;
    }
  }

  return { totalReports, averageScore, mostAnalyzedMovement, latestReportDate };
}

/* ===== Dashboard chart data ===== */

// Chart calculations use only completed reports with a finite score and a
// readable date; anything malformed is skipped rather than crashing a chart.
function validChartReports(reports: MovementReport[]): MovementReport[] {
  return completedReports(reports).filter(
    (report) => Number.isFinite(report.overallScore) && hasValidDate(report),
  );
}

// Filter reports to the selected dashboard time range. Future-dated reports
// are never included in the charts. referenceDate exists for testing.
export function filterReportsByTimeRange(
  reports: MovementReport[],
  range: DashboardTimeRange,
  referenceDate: Date = new Date(),
): MovementReport[] {
  const valid = validChartReports(reports);
  const end = referenceDate.getTime();

  const notFuture = valid.filter((report) => Date.parse(report.createdAt) <= end);
  if (range === 'all') return notFuture;

  const start = new Date(referenceDate);
  if (range === '30-days') {
    start.setDate(start.getDate() - 30);
  } else if (range === '90-days') {
    start.setDate(start.getDate() - 90);
  } else {
    // "6-months" uses calendar-month subtraction, not a fixed day count.
    start.setMonth(start.getMonth() - 6);
  }
  // Ranges are calendar-based, so a report from any time on the boundary
  // day still counts — compare from the start of that day.
  start.setHours(0, 0, 0, 0);

  const startTime = start.getTime();
  return notFuture.filter((report) => Date.parse(report.createdAt) >= startTime);
}

// Movement distribution for the filtered reports. Returns every category —
// the chart component groups small ones into "Other Movements" for display.
export function calculateMovementDistribution(
  reports: MovementReport[],
): MovementDistributionItem[] {
  const valid = validChartReports(reports);
  if (valid.length === 0) return [];

  const groups = new Map<string, { count: number; latest: number; displayName: string }>();
  for (const report of valid) {
    const displayName = movementLabel(report);
    const key = normalizeMovementKey(displayName);
    const created = Date.parse(report.createdAt);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { count: 1, latest: created, displayName });
    } else {
      existing.count += 1;
      if (created > existing.latest) {
        existing.latest = created;
        existing.displayName = displayName;
      }
    }
  }

  const items = [...groups.values()].map((group) => ({
    movementName: group.displayName,
    count: group.count,
    percentage: Math.round((group.count / valid.length) * 1000) / 10,
    latest: group.latest,
  }));

  // Highest count first; ties go to the most recently analyzed movement,
  // then alphabetical order as a final fallback.
  items.sort(
    (a, b) =>
      b.count - a.count ||
      b.latest - a.latest ||
      a.movementName.localeCompare(b.movementName),
  );

  return items.map(({ movementName, count, percentage }) => ({
    movementName,
    count,
    percentage,
  }));
}

/*
 * Display-only grouping for the distribution chart: with more than
 * `maxCategories` movements, the top ones stay and the rest combine into
 * "Other Movements". The full distribution data is never altered.
 */
export function groupDistributionForChart(
  items: MovementDistributionItem[],
  maxCategories = 6,
): MovementDistributionItem[] {
  if (items.length <= maxCategories) return items;

  const shown = items.slice(0, maxCategories - 1);
  const rest = items.slice(maxCategories - 1);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);
  const otherPercentage =
    Math.round(rest.reduce((sum, item) => sum + item.percentage, 0) * 10) / 10;

  return [
    ...shown,
    { movementName: 'Other Movements', count: otherCount, percentage: otherPercentage },
  ];
}

// Score history ordered oldest → newest by report date (never storage order).
export function createScoreHistory(reports: MovementReport[]): ScoreHistoryItem[] {
  return [...validChartReports(reports)]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((report) => ({
      reportId: report.id,
      movementName: movementLabel(report),
      score: clampScore(report.overallScore),
      createdAt: report.createdAt,
      formattedDate: formatReportDay(report.createdAt),
    }));
}

// Newest completed reports for the Recent Reports section (never mutates).
// Reports with unreadable dates sort last instead of unpredictably.
export function getRecentCompletedReports(
  reports: MovementReport[],
  limit = 3,
): MovementReport[] {
  const safeTime = (report: MovementReport) => {
    const time = Date.parse(report.createdAt);
    return Number.isNaN(time) ? 0 : time;
  };
  return [...completedReports(reports)]
    .sort((a, b) => safeTime(b) - safeTime(a))
    .slice(0, limit);
}
