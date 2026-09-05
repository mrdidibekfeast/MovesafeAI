import type { MovementReport } from '../types/report';
import { sampleReports } from '../data/sampleReports';
import { clampScore } from '../utils/scoreUtils';
import { supabase } from './supabase';

/*
 * Report storage — hybrid by design.
 *
 *   Signed-in user (userId set) -> Supabase `reports` table.
 *       Synced across devices, protected server-side by Row Level Security.
 *   Guest (userId null)         -> this browser's localStorage.
 *       RLS blocks anonymous writes, so guests keep the original behaviour:
 *       reports live only in the browser that created them.
 *
 * Uploaded videos are NEVER stored, in either path. Only file metadata
 * (name, MIME type, size) is kept, exactly as before.
 *
 * Every public function is async because the database path is. Pages must
 * handle the pending and failed states.
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

// ---------- shared helpers ----------

// Return a copy of the report with all scores normalized to 0-100.
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

// ---------- localStorage (guest reports) ----------

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
 * versioned format and the original bare-array format are understood.
 */
function readLocalReports(): MovementReport[] {
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
function writeLocalReports(reports: MovementReport[]): boolean {
  try {
    const collection: StoredReportCollection = { version: STORAGE_VERSION, reports };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    return true;
  } catch {
    return false;
  }
}

// ---------- database row mapping ----------

interface ReportRow {
  id: string;
  user_id: string;
  created_at: string;
  movement_type: string;
  custom_movement_name: string | null;
  file_name: string;
  file_type: string;
  file_size: number | null;
  status: string;
  overall_score: number;
  summary: string;
  metrics: unknown;
  observations: unknown;
  recommendations: unknown;
  notes: string | null;
}

function rowToReport(row: ReportRow): MovementReport {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    movementType: row.movement_type as MovementReport['movementType'],
    customMovementName: row.custom_movement_name ?? undefined,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size ?? undefined,
    status: row.status as MovementReport['status'],
    overallScore: clampScore(row.overall_score),
    summary: row.summary,
    metrics: (Array.isArray(row.metrics) ? row.metrics : []) as MovementReport['metrics'],
    observations: (Array.isArray(row.observations) ? row.observations : []) as string[],
    recommendations: (Array.isArray(row.recommendations)
      ? row.recommendations
      : []) as string[],
    notes: row.notes ?? undefined,
  };
}

function reportToRow(report: MovementReport, userId: string) {
  return {
    id: report.id,
    user_id: userId,
    created_at: report.createdAt,
    movement_type: report.movementType,
    custom_movement_name: report.customMovementName ?? null,
    // File metadata only — never file contents.
    file_name: report.fileName,
    file_type: report.fileType,
    file_size: report.fileSize ?? null,
    status: report.status,
    overall_score: clampScore(report.overallScore),
    summary: report.summary,
    metrics: report.metrics,
    observations: report.observations,
    recommendations: report.recommendations,
    notes: report.notes ?? null,
  };
}

// ---------- one-time lift of pre-database local reports ----------

const migratedUsers = new Set<string>();

/*
 * Moves any localStorage reports belonging to this user into the database.
 * Runs at most once per session per user, is idempotent (upsert on the
 * primary key), and clears the local copies only after the write succeeds —
 * a failure here must never lose data.
 */
async function migrateLocalReportsForUser(userId: string): Promise<void> {
  if (migratedUsers.has(userId)) return;
  migratedUsers.add(userId);

  const local = readLocalReports();
  const owned = local.filter((report) => report.userId === userId);
  if (owned.length === 0) return;

  const { error } = await supabase.from('reports').upsert(
    owned.map((report) => reportToRow(normalizeReport(report), userId)),
    { onConflict: 'id' },
  );

  if (error) {
    migratedUsers.delete(userId); // allow a retry on the next load
    return;
  }

  // Confirmed saved server-side: drop only the copies just uploaded.
  writeLocalReports(local.filter((report) => report.userId !== userId));
}

// ---------- public API ----------

/*
 * All reports for a signed-in user, newest first.
 *
 * On first load this also lifts any reports still sitting in this browser's
 * localStorage for the same user (created before the database existed) so
 * nobody silently loses their history.
 */
export async function getReportsByUser(userId: string): Promise<MovementReport[]> {
  await migrateLocalReportsForUser(userId);

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('reports-load-failed');
  return (data ?? []).map((row) => rowToReport(row as unknown as ReportRow));
}

/*
 * A single report. Guest reports live in this browser, so localStorage is
 * checked first; the database is consulted only when the visitor is signed
 * in. RLS guarantees the query can only ever return that user's own row.
 */
export async function getReportById(
  reportId: string,
  userId: string | null,
): Promise<MovementReport | null> {
  const local = readLocalReports().find((report) => report.id === reportId);
  if (local) return local;

  if (!userId) return null;

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw new Error('reports-load-failed');
  return data ? rowToReport(data as unknown as ReportRow) : null;
}

// Save a report to whichever store its owner belongs to.
export async function saveReport(report: MovementReport): Promise<SaveReportResult> {
  const normalized = normalizeReport(report);

  // Guest: browser-only, exactly as before.
  if (normalized.userId === null) {
    const reports = readLocalReports();
    if (reports.some((existing) => existing.id === normalized.id)) {
      return { success: false, error: 'duplicate-id' };
    }
    if (!writeLocalReports([...reports, normalized])) {
      return { success: false, error: 'storage-failed' };
    }
    return { success: true, report: normalized };
  }

  const { error } = await supabase
    .from('reports')
    .insert(reportToRow(normalized, normalized.userId));

  if (error) {
    // 23505 = unique violation on the primary key.
    if (error.code === '23505') return { success: false, error: 'duplicate-id' };
    return { success: false, error: 'storage-failed' };
  }
  return { success: true, report: normalized };
}

/*
 * Delete a report. Guest reports are removed locally; a signed-in user's
 * report is removed from the database, where RLS independently prevents
 * deleting anyone else's row.
 */
export async function deleteReport(
  reportId: string,
  userId: string | null,
): Promise<boolean> {
  const localReports = readLocalReports();
  const remaining = localReports.filter((report) => report.id !== reportId);
  if (remaining.length !== localReports.length) {
    return writeLocalReports(remaining);
  }

  if (!userId) return false;

  const { error, count } = await supabase
    .from('reports')
    .delete({ count: 'exact' })
    .eq('id', reportId);

  if (error) return false;
  return (count ?? 0) > 0;
}

// ---------- local-only helpers (development) ----------

// Guest reports held in this browser. Not used by pages.
export function getGuestReports(): MovementReport[] {
  return sortNewestFirst(readLocalReports().filter((report) => report.userId === null));
}

// Every report in this browser, guest or otherwise. Development helper.
export function getAllReports(): MovementReport[] {
  return sortNewestFirst(readLocalReports());
}

// Remove all guest reports from this browser. Returns how many were removed.
export function clearGuestReports(): number {
  const reports = readLocalReports();
  const next = reports.filter((report) => report.userId !== null);
  const removed = reports.length - next.length;
  if (removed === 0) return 0;
  return writeLocalReports(next) ? removed : 0;
}

// Adds the fictional sample reports as GUEST reports, but only when this
// browser has none. Call manually during development.
export function seedSampleReports(): boolean {
  if (readLocalReports().length > 0) return false;
  return writeLocalReports(
    sampleReports.map((report) => normalizeReport({ ...report, userId: null })),
  );
}
