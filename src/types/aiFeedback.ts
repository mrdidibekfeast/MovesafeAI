// Types for the optional Gemini-generated educational feedback.
// The deterministic local feedback remains the default and fallback.

export type AiFeedbackStatus = 'idle' | 'loading' | 'success' | 'error';

// Minimal, privacy-limited summary sent to Gemini. Never contains user
// identity, report IDs, file names, or uploaded media.
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

export interface AiFeedbackReportSummary {
  movementName: string;
  score: number;
  date: string;
  metrics: AiFeedbackMetricSummary[];
}

export interface AiFeedbackMetricSummary {
  name: string;
  score: number;
}

// Structured, validated response shape rendered by the Dashboard.
export interface AiEducationalFeedback {
  overview: string;
  strengths: string[];
  areasToReview: string[];
  nextSteps: string[];
  disclaimer: string;
}
