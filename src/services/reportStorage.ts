import type { MovementReport } from '../types/report';
import { sampleReports } from '../data/sampleReports';
import { clampScore } from '../utils/scoreUtils';

/*
 * Temporary project storage.
 *
 * Reports are kept in localStorage for now so the app works without a
 * database. This service is the ONLY place that touches localStorage for
 * reports — pages must always go through these functions, which makes it
 * easy to swap this file for a Supabase-backed implementation later.
 *
 * Never store uploaded image/video contents, passwords, tokens, or
 * sessions here — only educational movement-analysis data and basic file
 * metadata (name, type, size).
 */

const STORAGE_KEY = 'movesafe_reports';

// Stored shape: { version: 1, reports: [...] }. Bumping the version later
// allows a deliberate migration instead of silently misreading old data.
const STORAGE_VERSION = 1 as const;

interface StoredReportCollection {
  version: typeof STORAGE_VERSION;
  reports: MovementReport[];
}

export type SaveReportResult =
  | { success: true; report: MovementReport }
  | { success: false; error: 'duplicate-id' | 'storage-failed' };

// ---------- ID helper ----------

// Unique report IDs. crypto.randomUUID is available in all modern browsers;
// the fallback covers older environments without adding a package.
export function createReportId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- internal helpers ----------

// Return a copy of the report with all scores normalized to 0–100.
function normalizeReport(report: MovementReport): MovementReport {
  return {
    ...report,
    overallScore: clampScore(report.overallScore),
    metrics: report.metrics.map((metric) => ({
      ...metric,
      score: clampScore(metric.score),
    })),
  };
}

// Newest first, based on createdAt.
function sortNewestFirst(reports: MovementReport[]): MovementReport[] {
  return [...reports].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

// Minimal structural check so one corrupt entry never discards the rest.
function isReportLike(value: unknown): value is MovementReport {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { id?: unknown }).id === 'string' &&
    Array.isArray((value as { metrics?: unknown }).metrics)
  );
}

/*
 * Read and parse the stored reports. Invalid or missing data never crashes
 * the app — unreadable data behaves like an empty list, and individual
 * invalid entries are skipped while valid ones are kept. Both the current
 * versioned format and the original bare-array format are understood, so
 * reports saved before versioning keep working.
 */
function readReports(): MovementReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    // Legacy format: a bare array of reports.
    if (Array.isArray(parsed)) {
      return parsed.filter(isReportLike);
    }

    // Current format: { version: 1, reports: [...] }.
    if (typeof parsed === 'object' && parsed !== null) {
      const collection = parsed as { version?: unknown; reports?: unknown };
      if (collection.version === STORAGE_VERSION && Array.isArray(collection.reports)) {
        return collection.reports.filter(isReportLike);
      }
    }
    return [];
  } catch {
    return [];
  }
}

// Write the reports in the versioned format. Returns false when storage is
// unavailable or full (quota, privacy mode); existing stored data is left
// untouched in that case.
function writeReports(reports: MovementReport[]): boolean {
  try {
    const collection: StoredReportCollection = { version: STORAGE_VERSION, reports };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    return true;
  } catch {
    return false;
  }
}

// ---------- public API ----------

export function getAllReports(): MovementReport[] {
  return sortNewestFirst(readReports());
}

export function getReportsByUser(userId: string): MovementReport[] {
  return sortNewestFirst(readReports().filter((report) => report.userId === userId));
}

export function getGuestReports(): MovementReport[] {
  return sortNewestFirst(readReports().filter((report) => report.userId === null));
}

export function getReportById(reportId: string): MovementReport | null {
  return readReports().find((report) => report.id === reportId) ?? null;
}

export function saveReport(report: MovementReport): SaveReportResult {
  const reports = readReports();

  if (reports.some((existing) => existing.id === report.id)) {
    return { success: false, error: 'duplicate-id' };
  }

  const normalized = normalizeReport(report);
  const next = [...reports, normalized];

  if (!writeReports(next)) {
    return { success: false, error: 'storage-failed' };
  }
  return { success: true, report: normalized };
}

export function updateReport(
  reportId: string,
  updates: Partial<Omit<MovementReport, 'id'>>,
): MovementReport | null {
  const reports = readReports();
  const index = reports.findIndex((report) => report.id === reportId);
  if (index === -1) return null;

  // Merge the supplied fields, keep everything else, and never let the
  // report ID change. Scores are re-normalized after the merge.
  const updated = normalizeReport({
    ...reports[index],
    ...updates,
    id: reports[index].id,
  });

  const next = reports.map((report, i) => (i === index ? updated : report));
  if (!writeReports(next)) return null;
  return updated;
}

export function deleteReport(reportId: string): boolean {
  const reports = readReports();
  const next = reports.filter((report) => report.id !== reportId);
  if (next.length === reports.length) return false;
  return writeReports(next);
}

// Remove all guest reports (userId === null). Returns how many were removed.
export function clearGuestReports(): number {
  const reports = readReports();
  const next = reports.filter((report) => report.userId !== null);
  const removed = reports.length - next.length;
  if (removed === 0) return 0;
  return writeReports(next) ? removed : 0;
}

// ---------- development helper ----------

// Adds the fictional sample reports, but only when no reports exist yet.
// Call manually during development — never automatically in production code.
export function seedSampleReports(): boolean {
  if (readReports().length > 0) return false;
  return writeReports(sampleReports.map(normalizeReport));
}
