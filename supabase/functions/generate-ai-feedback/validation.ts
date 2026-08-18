/*
 * Pure validation and sanitization helpers for the generate-ai-feedback
 * Edge Function. This module deliberately uses no Deno APIs so its rules
 * can be tested outside the edge runtime.
 *
 * Everything arriving from the frontend is treated as untrusted data —
 * even though the app only sends a limited summary, this function must
 * hold on its own against arbitrary authenticated callers.
 */

// ---------- request types (mirror of the limited frontend context) ----------

export interface AiFeedbackMetricSummary {
  name: string;
  score: number;
}

export interface AiFeedbackReportSummary {
  movementName: string;
  score: number;
  date: string;
  metrics: AiFeedbackMetricSummary[];
}

export interface AiFeedbackContext {
  totalReports: number;
  averageScore: number | null;
  latestMovement: string | null;
  latestScore: number | null;
  scoreTrend: string;
  strongestMetric: string | null;
  strongestMetricAverage: number | null;
  attentionMetric: string | null;
  attentionMetricAverage: number | null;
  recentReports: AiFeedbackReportSummary[];
}

export interface AiEducationalFeedback {
  overview: string;
  strengths: string[];
  areasToReview: string[];
  nextSteps: string[];
  disclaimer: string;
}

// ---------- CORS origin policy ----------

export interface CorsDecision {
  allowed: boolean;
  /** The origin to echo back, or null when there is nothing to echo. */
  allowOrigin: string | null;
}

/*
 * Pure origin decision, kept here so the policy can be unit-tested outside
 * the edge runtime. The caller supplies the allow-list (built from
 * environment configuration) and the request's Origin header.
 *
 * A null/absent Origin means the caller is not a browser making a
 * cross-origin request (curl, server-side tests, same-origin fetches).
 * Those are allowed through with no allow-origin header to echo — refusing
 * them would break legitimate non-browser callers without adding security,
 * since CORS is only ever enforced by browsers.
 */
export function resolveCorsDecision(
  origin: string | null | undefined,
  allowedOrigins: ReadonlySet<string>,
): CorsDecision {
  if (typeof origin !== 'string' || origin.length === 0) {
    return { allowed: true, allowOrigin: null };
  }
  if (allowedOrigins.has(origin)) {
    return { allowed: true, allowOrigin: origin };
  }
  return { allowed: false, allowOrigin: null };
}

/*
 * Parses a comma-separated ALLOWED_ORIGINS value and merges it with the
 * always-permitted local development origins.
 */
export function buildAllowedOrigins(
  configuredValue: string | null | undefined,
  defaults: readonly string[],
): Set<string> {
  const configured = (typeof configuredValue === 'string' ? configuredValue : '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return new Set([...defaults, ...configured]);
}

// ---------- limits ----------

export const MAX_BODY_BYTES = 50_000;
export const MAX_RECENT_REPORTS = 5;
export const MAX_METRICS_PER_REPORT = 5;

const MAX_MOVEMENT_NAME_LENGTH = 80;
const MAX_METRIC_NAME_LENGTH = 80;
const MAX_TREND_LENGTH = 30;
const MAX_DATE_LENGTH = 40;
const MAX_TOTAL_REPORTS = 10_000;

const ALLOWED_TRENDS = ['increasing', 'decreasing', 'stable', 'insufficient-data'];

export const MAX_STRENGTHS = 3;
export const MAX_AREAS = 3;
export const MAX_NEXT_STEPS = 4;
const MAX_OVERVIEW_LENGTH = 700;
const MAX_LIST_ITEM_LENGTH = 220;
const MAX_DISCLAIMER_LENGTH = 400;

export const FALLBACK_DISCLAIMER =
  'This AI-generated explanation is based on simulated educational report summaries. It is not medical advice, diagnosis, or proof of physical improvement.';

// ---------- text and score sanitizers ----------

// Control characters and markup never survive: submitted names are labels,
// not documents, and they are later embedded in a prompt as JSON data.
function normalizeText(value: string): string {
  return stripControlCharacters(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// C0 and C1 control characters (codes below 32, and 127–159) become
// spaces, which the whitespace collapse in normalizeText then removes.
function stripControlCharacters(value: string): string {
  let result = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    result += code < 32 || (code >= 127 && code < 160) ? ' ' : character;
  }
  return result;
}

/*
 * Returns the sanitized string, or null when the value is not a string,
 * is empty after cleaning, or exceeds the maximum length. Overlong input
 * is rejected rather than truncated — the real frontend never produces it.
 */
export function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = normalizeText(value);
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

/*
 * A valid score is a finite number already within 0–100. Values like NaN,
 * Infinity, or 1000 are rejected as unrelated data instead of clamped.
 */
export function sanitizeScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// null/undefined pass through as null; present values must sanitize cleanly.
function optionalText(value: unknown, maxLength: number): { ok: boolean; value: string | null } {
  if (value === null || value === undefined) return { ok: true, value: null };
  const cleaned = sanitizeText(value, maxLength);
  return cleaned === null ? { ok: false, value: null } : { ok: true, value: cleaned };
}

function optionalScore(value: unknown): { ok: boolean; value: number | null } {
  if (value === null || value === undefined) return { ok: true, value: null };
  const score = sanitizeScore(value);
  return score === null ? { ok: false, value: null } : { ok: true, value: score };
}

// ---------- request validation ----------

function validateReport(value: unknown): AiFeedbackReportSummary | null {
  if (!isPlainObject(value)) return null;

  const movementName = sanitizeText(value.movementName, MAX_MOVEMENT_NAME_LENGTH);
  const score = sanitizeScore(value.score);
  // Dates are locale-formatted display strings (e.g. "July 26, 2026"), so
  // they are validated as bounded plain text rather than parsed as dates.
  const date = sanitizeText(value.date, MAX_DATE_LENGTH);
  if (movementName === null || score === null || date === null) return null;

  if (!Array.isArray(value.metrics) || value.metrics.length > MAX_METRICS_PER_REPORT) {
    return null;
  }
  const metrics: AiFeedbackMetricSummary[] = [];
  for (const entry of value.metrics) {
    if (!isPlainObject(entry)) return null;
    const name = sanitizeText(entry.name, MAX_METRIC_NAME_LENGTH);
    const metricScore = sanitizeScore(entry.score);
    if (name === null || metricScore === null) return null;
    metrics.push({ name, score: metricScore });
  }

  return { movementName, score, date, metrics };
}

/*
 * Validates the submitted context and rebuilds it field by field, so
 * unsupported extra fields never reach the prompt. Returns null when any
 * part of the payload is malformed — the caller answers 400.
 */
export function validateAiFeedbackContext(value: unknown): AiFeedbackContext | null {
  if (!isPlainObject(value)) return null;

  const totalReports = value.totalReports;
  if (
    typeof totalReports !== 'number' ||
    !Number.isInteger(totalReports) ||
    totalReports < 0 ||
    totalReports > MAX_TOTAL_REPORTS
  ) {
    return null;
  }

  const averageScore = optionalScore(value.averageScore);
  const latestScore = optionalScore(value.latestScore);
  const strongestMetricAverage = optionalScore(value.strongestMetricAverage);
  const attentionMetricAverage = optionalScore(value.attentionMetricAverage);
  const latestMovement = optionalText(value.latestMovement, MAX_MOVEMENT_NAME_LENGTH);
  const strongestMetric = optionalText(value.strongestMetric, MAX_METRIC_NAME_LENGTH);
  const attentionMetric = optionalText(value.attentionMetric, MAX_METRIC_NAME_LENGTH);
  if (
    !averageScore.ok ||
    !latestScore.ok ||
    !strongestMetricAverage.ok ||
    !attentionMetricAverage.ok ||
    !latestMovement.ok ||
    !strongestMetric.ok ||
    !attentionMetric.ok
  ) {
    return null;
  }

  // Only the four known trend values are allowed — anything else could be
  // an instruction smuggled into a free-text field.
  const scoreTrend = sanitizeText(value.scoreTrend, MAX_TREND_LENGTH);
  if (scoreTrend === null || !ALLOWED_TRENDS.includes(scoreTrend)) return null;

  if (
    !Array.isArray(value.recentReports) ||
    value.recentReports.length === 0 ||
    value.recentReports.length > MAX_RECENT_REPORTS
  ) {
    return null;
  }
  const recentReports: AiFeedbackReportSummary[] = [];
  for (const entry of value.recentReports) {
    const report = validateReport(entry);
    if (report === null) return null;
    recentReports.push(report);
  }

  return {
    totalReports,
    averageScore: averageScore.value,
    latestMovement: latestMovement.value,
    latestScore: latestScore.value,
    scoreTrend,
    strongestMetric: strongestMetric.value,
    strongestMetricAverage: strongestMetricAverage.value,
    attentionMetric: attentionMetric.value,
    attentionMetricAverage: attentionMetricAverage.value,
    recentReports,
  };
}

// ---------- Gemini response validation ----------

// AI text is cleaned like request text but truncated instead of rejected —
// a slightly long sentence should not throw away an otherwise valid reply.
function cleanFeedbackText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = normalizeText(value);
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function cleanFeedbackList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    const cleaned = cleanFeedbackText(entry, MAX_LIST_ITEM_LENGTH);
    if (cleaned !== null) items.push(cleaned);
    if (items.length >= maxItems) break;
  }
  return items;
}

/*
 * Extracts the JSON object from Gemini's text output. Strips a recognized
 * Markdown code fence if the model added one. Returns null when the text
 * is not a JSON object. Never uses eval().
 */
export function extractFeedbackJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isPlainObject(parsed) ? parsed : null;
}

/*
 * Validates and sanitizes the parsed Gemini object. Returns null when there
 * is no usable overview; otherwise returns only the supported fields with
 * lengths and list sizes enforced and a guaranteed disclaimer.
 */
export function validateAiFeedback(value: unknown): AiEducationalFeedback | null {
  if (!isPlainObject(value)) return null;

  const overview = cleanFeedbackText(value.overview, MAX_OVERVIEW_LENGTH);
  if (overview === null) return null;

  const disclaimer =
    cleanFeedbackText(value.disclaimer, MAX_DISCLAIMER_LENGTH) ?? FALLBACK_DISCLAIMER;

  return {
    overview,
    strengths: cleanFeedbackList(value.strengths, MAX_STRENGTHS),
    areasToReview: cleanFeedbackList(value.areasToReview, MAX_AREAS),
    nextSteps: cleanFeedbackList(value.nextSteps, MAX_NEXT_STEPS),
    disclaimer,
  };
}

// ---------- unsafe-language check ----------

/*
 * Basic keyword safeguard, not a medical-content classifier. A response
 * containing clearly disallowed medical claims is rejected in full —
 * never partially displayed.
 */
const UNSAFE_PHRASES = [
  'you have been diagnosed',
  'you are medically cleared',
  'your injury is healed',
  'treatment is working',
  'you are safe to exercise',
  'no need to see a doctor',
];

export function containsUnsafeLanguage(feedback: AiEducationalFeedback): boolean {
  const combined = [
    feedback.overview,
    ...feedback.strengths,
    ...feedback.areasToReview,
    ...feedback.nextSteps,
    feedback.disclaimer,
  ]
    .join(' ')
    .toLowerCase();
  return UNSAFE_PHRASES.some((phrase) => combined.includes(phrase));
}
