import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import type { MovementReport } from '../types/report';
import type { DashboardSummary } from '../types/dashboard';
import type { DashboardFeedbackSummary } from '../types/dashboardFeedback';
import type {
  AiEducationalFeedback,
  AiFeedbackContext,
  AiFeedbackMetricSummary,
} from '../types/aiFeedback';
import { formatReportDay, movementLabel } from '../utils/reportDisplay';
import { clampScore } from '../utils/scoreUtils';
import { supabase } from './supabase';

/*
 * Optional Gemini-powered educational feedback.
 *
 * Gemini requests are handled by the generate-ai-feedback Supabase Edge
 * Function (supabase/functions/generate-ai-feedback). The Gemini API key
 * is stored as a server-side Supabase secret and is not included in the
 * Vite client bundle. The frontend only builds the limited context,
 * invokes the function with the authenticated session, and validates the
 * structured response before anything reaches React state.
 */

const EDGE_FUNCTION_NAME = 'generate-ai-feedback';
// The Edge Function itself gives Gemini up to 20 seconds; this covers the
// full round trip so a hung request still ends in a controlled error.
const REQUEST_TIMEOUT_MS = 30_000;

const MAX_RECENT_REPORTS = 5;
const MAX_METRICS_PER_REPORT = 5;
const MAX_STRENGTHS = 3;
const MAX_AREAS = 3;
const MAX_NEXT_STEPS = 4;
const MAX_OVERVIEW_LENGTH = 700;
const MAX_LIST_ITEM_LENGTH = 220;
const MAX_DISCLAIMER_LENGTH = 400;

const FALLBACK_DISCLAIMER =
  'This AI-generated explanation is based on simulated educational report summaries. It is not medical advice, diagnosis, or proof of physical improvement.';

export type GeminiFeedbackErrorCode =
  | 'unauthorized'
  | 'invalid-request'
  | 'rate-limit'
  | 'timeout'
  | 'invalid-response'
  | 'service-unavailable'
  | 'configuration'
  | 'network'
  | 'aborted'
  | 'unknown';

export class GeminiFeedbackError extends Error {
  code: GeminiFeedbackErrorCode;

  constructor(code: GeminiFeedbackErrorCode) {
    super(`gemini-feedback:${code}`);
    this.name = 'GeminiFeedbackError';
    this.code = code;
  }
}

// ---------- context builder ----------

// Select at most five metrics: lowest score first, highest second, then
// the remaining metrics in report order. Invalid scores are skipped.
function summarizeMetrics(report: MovementReport): AiFeedbackMetricSummary[] {
  const valid = (Array.isArray(report.metrics) ? report.metrics : []).filter(
    (metric) => metric && typeof metric.label === 'string' && Number.isFinite(metric.score),
  );
  if (valid.length <= MAX_METRICS_PER_REPORT) {
    return valid.map((m) => ({ name: m.label, score: clampScore(m.score) }));
  }

  const lowest = valid.reduce((a, b) => (b.score < a.score ? b : a));
  const highest = valid.reduce((a, b) => (b.score > a.score ? b : a));
  const picked = [lowest];
  if (highest !== lowest) picked.push(highest);
  for (const metric of valid) {
    if (picked.length >= MAX_METRICS_PER_REPORT) break;
    if (!picked.includes(metric)) picked.push(metric);
  }
  return picked.map((m) => ({ name: m.label, score: clampScore(m.score) }));
}

/*
 * Builds the limited summary sent through the Edge Function. Deliberately
 * excludes user identity, report IDs, file names, uploaded media,
 * observations, and anything else beyond simulated scores and metric names.
 * The Edge Function re-validates all of this server-side.
 */
export function buildAiFeedbackContext(
  reports: MovementReport[],
  localFeedback: DashboardFeedbackSummary,
  dashboardSummary: DashboardSummary,
): AiFeedbackContext {
  const completed = reports
    .filter(
      (report) =>
        report != null &&
        report.status === 'completed' &&
        !Number.isNaN(Date.parse(report.createdAt)) &&
        Number.isFinite(report.overallScore),
    )
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)); // newest first

  const recent = completed.slice(0, MAX_RECENT_REPORTS);
  const latest = recent[0] ?? null;

  return {
    totalReports: dashboardSummary.totalReports,
    averageScore: dashboardSummary.averageScore,
    latestMovement: latest ? movementLabel(latest) : null,
    latestScore: latest ? clampScore(latest.overallScore) : null,
    scoreTrend: localFeedback.scoreTrend,
    strongestMetric: localFeedback.strongestMetric?.metricName ?? null,
    strongestMetricAverage: localFeedback.strongestMetric?.averageScore ?? null,
    attentionMetric: localFeedback.attentionMetric?.metricName ?? null,
    attentionMetricAverage: localFeedback.attentionMetric?.averageScore ?? null,
    recentReports: recent.map((report) => ({
      movementName: movementLabel(report),
      score: clampScore(report.overallScore),
      date: formatReportDay(report.createdAt),
      metrics: summarizeMetrics(report),
    })),
  };
}

// ---------- response validation ----------

// Display strings are cleaned before they reach React state: markup and
// control characters are stripped, whitespace collapsed, length capped.
function cleanDisplayText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  let cleaned = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    cleaned += code < 32 || (code >= 127 && code < 160) ? ' ' : character;
  }
  cleaned = cleaned
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function cleanList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    const cleaned = cleanDisplayText(entry, MAX_LIST_ITEM_LENGTH);
    if (cleaned !== null) items.push(cleaned);
    if (items.length >= maxItems) break;
  }
  return items;
}

/*
 * Validates the feedback object returned by the Edge Function. The
 * function already validated Gemini's output server-side, but the
 * frontend never trusts a response just because of where it came from.
 * Exported separately so the rules can be tested without network access.
 */
export function validateAiFeedback(value: unknown): AiEducationalFeedback {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeminiFeedbackError('invalid-response');
  }
  const record = value as Record<string, unknown>;

  const overview = cleanDisplayText(record.overview, MAX_OVERVIEW_LENGTH);
  if (overview === null) {
    // A response without a usable overview is rejected entirely.
    throw new GeminiFeedbackError('invalid-response');
  }

  const disclaimer =
    cleanDisplayText(record.disclaimer, MAX_DISCLAIMER_LENGTH) ?? FALLBACK_DISCLAIMER;

  return {
    overview,
    strengths: cleanList(record.strengths, MAX_STRENGTHS),
    areasToReview: cleanList(record.areasToReview, MAX_AREAS),
    nextSteps: cleanList(record.nextSteps, MAX_NEXT_STEPS),
    disclaimer,
  };
}

// ---------- error mapping ----------

const SERVER_ERROR_CODES: Record<string, GeminiFeedbackErrorCode> = {
  unauthorized: 'unauthorized',
  'invalid-request': 'invalid-request',
  'rate-limit': 'rate-limit',
  timeout: 'timeout',
  'invalid-response': 'invalid-response',
  'service-unavailable': 'service-unavailable',
  configuration: 'configuration',
};

// Reads the Edge Function's structured error body; falls back to the HTTP
// status when the body is missing or unrecognized.
async function errorCodeFromResponse(
  response: Response | undefined,
): Promise<GeminiFeedbackErrorCode> {
  if (response) {
    try {
      const body: unknown = await response.json();
      const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
      if (typeof code === 'string' && code in SERVER_ERROR_CODES) {
        return SERVER_ERROR_CODES[code];
      }
    } catch {
      // Unreadable body — fall through to the status mapping.
    }
  }
  switch (response?.status) {
    case 400:
      return 'invalid-request';
    case 401:
      return 'unauthorized';
    case 429:
      return 'rate-limit';
    case 500:
      return 'configuration';
    case 502:
    case 503:
      return 'service-unavailable';
    case 504:
      return 'timeout';
    default:
      return 'unknown';
  }
}

// ---------- request ----------

export async function generateGeminiFeedback(
  context: AiFeedbackContext,
  signal?: AbortSignal,
): Promise<AiEducationalFeedback> {
  // Never invoke the function signed out — the session token is what
  // authenticates the request (no user id ever travels in the body).
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new GeminiFeedbackError('unauthorized');
  }

  // The Supabase client attaches the authenticated session token itself.
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { context },
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });

  // A cancelled request is ignored even if a response arrived late.
  if (signal?.aborted) {
    throw new GeminiFeedbackError('aborted');
  }

  if (error) {
    if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
      throw new GeminiFeedbackError(await errorCodeFromResponse(error.context));
    }
    if (error instanceof FunctionsFetchError) {
      // The caller's signal was checked above, so an aborted fetch here
      // means the client-side timeout fired.
      const cause = (error as { context?: { name?: unknown } }).context;
      if (cause?.name === 'AbortError') {
        throw new GeminiFeedbackError('timeout');
      }
      throw new GeminiFeedbackError('network');
    }
    throw new GeminiFeedbackError('unknown');
  }

  const payload = data as { success?: unknown; feedback?: unknown } | null;
  if (!payload || payload.success !== true) {
    throw new GeminiFeedbackError('invalid-response');
  }
  return validateAiFeedback(payload.feedback);
}

// Friendly user-facing message for each controlled error. The Dashboard
// section deliberately avoids the word "AI" in user-facing text.
export function geminiErrorMessage(error: unknown): string {
  const code = error instanceof GeminiFeedbackError ? error.code : 'unknown';
  switch (code) {
    case 'unauthorized':
      return 'Please sign in again before requesting feedback.';
    case 'invalid-request':
      return 'Your report summary could not be processed safely.';
    case 'rate-limit':
      return 'Feedback is temporarily busy. Please try again later.';
    case 'timeout':
      return 'Feedback took too long to respond. Please try again.';
    case 'invalid-response':
      return 'The response could not be displayed safely. Please try again.';
    case 'service-unavailable':
      return 'The feedback service is currently unavailable.';
    case 'configuration':
      return 'Feedback is not configured correctly.';
    case 'network':
    case 'unknown':
    default:
      return 'We could not connect to the feedback service. Please try again.';
  }
}
