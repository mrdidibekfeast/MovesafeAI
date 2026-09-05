import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getReportsByUser } from '../services/reportStorage';
import {
  calculateDashboardSummary,
  calculateMovementDistribution,
  createScoreHistory,
  filterReportsByTimeRange,
  getRecentCompletedReports,
} from '../services/dashboardSummary';
import DashboardSummaryCard from '../components/DashboardSummaryCard';
import DashboardRecentReportCard from '../components/DashboardRecentReportCard';
import DashboardQuickAction from '../components/DashboardQuickAction';
import DashboardChartCard from '../components/DashboardChartCard';
import MovementDistributionChart from '../components/MovementDistributionChart';
import ScoreHistoryChart from '../components/ScoreHistoryChart';
import DashboardFeedbackCard from '../components/DashboardFeedbackCard';
import DashboardRecommendationCard from '../components/DashboardRecommendationCard';
import DashboardAiFeedback from '../components/DashboardAiFeedback';
import LoadingState from '../components/LoadingState';
import PageState from '../components/PageState';
import { generateDashboardFeedback } from '../services/dashboardFeedback';
import {
  GeminiFeedbackError,
  buildAiFeedbackContext,
  generateGeminiFeedback,
  geminiErrorMessage,
} from '../services/geminiFeedback';
import type { AiEducationalFeedback, AiFeedbackStatus } from '../types/aiFeedback';
import { formatReportDay } from '../utils/reportDisplay';
import type { MovementReport } from '../types/report';
import type { DashboardTimeRange } from '../types/dashboard';
import '../styles/dashboard.css';

const SCORE_HISTORY_LIMIT = 12;

// Safe first name from Supabase metadata — never the email or user ID.
function getWelcomeName(metadata: unknown): string | null {
  const fullName = (metadata as { full_name?: unknown } | undefined)?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }
  return null;
}

const QUICK_ACTIONS = [
  {
    icon: '🎥',
    title: 'Analyze Movement',
    description: 'Upload a movement file and create a new educational report.',
    buttonLabel: 'Analyze',
    route: '/analyze',
  },
  {
    icon: '📄',
    title: 'View Reports',
    description: 'Search and review your completed movement reports.',
    buttonLabel: 'Open Reports',
    route: '/reports',
  },
  {
    icon: '📚',
    title: 'Learn About Movement',
    description: 'Explore posture, warm-ups, prevention tips, and learning resources.',
    buttonLabel: 'Open Learn',
    route: '/learn',
  },
];

function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user, loading } = useAuth();

  const [reports, setReports] = useState<MovementReport[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const userId = user?.id ?? null;

  // Fresh data on first open and whenever the signed-in user changes —
  // returning from the Analyze page remounts this route, so new reports
  // appear without polling.
  const loadReports = useCallback(async () => {
    if (!userId) {
      setReports([]);
      setHasLoaded(true);
      return;
    }
    setHasLoaded(false);
    try {
      // Only this user's reports, via the existing storage service.
      setReports(await getReportsByUser(userId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    setHasLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!loading) {
      void loadReports();
    }
  }, [loading, loadReports]);

  const summary = useMemo(() => calculateDashboardSummary(reports), [reports]);
  const recentReports = useMemo(() => getRecentCompletedReports(reports, 3), [reports]);

  // Chart data — responds to the time-range filter; summary cards do not.
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('all');
  const filteredReports = useMemo(
    () => filterReportsByTimeRange(reports, timeRange),
    [reports, timeRange],
  );
  const distribution = useMemo(
    () => calculateMovementDistribution(filteredReports),
    [filteredReports],
  );
  const fullHistory = useMemo(() => createScoreHistory(filteredReports), [filteredReports]);
  const scoreHistory = useMemo(
    () => fullHistory.slice(-SCORE_HISTORY_LIMIT),
    [fullHistory],
  );
  const historyLimited = fullHistory.length > SCORE_HISTORY_LIMIT;

  // Local educational feedback. Isolated so a calculation problem never
  // takes down the rest of the Dashboard.
  const feedback = useMemo(() => {
    try {
      return generateDashboardFeedback(reports);
    } catch {
      return null;
    }
  }, [reports]);

  // ----- optional Gemini feedback (never automatic) -----
  const [aiStatus, setAiStatus] = useState<AiFeedbackStatus>('idle');
  const [aiFeedback, setAiFeedback] = useState<AiEducationalFeedback | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const aiGenerateRef = useRef<HTMLButtonElement | null>(null);

  // Report data changed (new load or different user): stale AI feedback
  // must never appear to describe data it was not generated from.
  useEffect(() => {
    aiAbortRef.current?.abort();
    setAiFeedback(null);
    setAiError(null);
    setAiStatus('idle');
  }, [reports]);

  // Abort any in-flight request when leaving the Dashboard.
  useEffect(() => {
    return () => aiAbortRef.current?.abort();
  }, []);

  // Announce and focus the result once generation succeeds.
  useEffect(() => {
    if (aiStatus === 'success' && aiFeedback) {
      aiHeadingRef.current?.focus();
    }
  }, [aiStatus, aiFeedback]);

  const handleGenerateAi = async () => {
    if (aiStatus === 'loading' || !feedback) return;
    const previousFeedback = aiFeedback;

    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiStatus('loading');
    setAiError(null);

    try {
      const context = buildAiFeedbackContext(reports, feedback, summary);
      const result = await generateGeminiFeedback(context, controller.signal);
      // Replace the previous result only after the new one succeeds.
      setAiFeedback(result);
      setAiStatus('success');
    } catch (error) {
      if (error instanceof GeminiFeedbackError && error.code === 'aborted') {
        // User cancellation is not a failure; keep any prior result.
        setAiStatus(previousFeedback ? 'success' : 'idle');
        return;
      }
      setAiError(geminiErrorMessage(error));
      setAiStatus(previousFeedback ? 'success' : 'error');
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null;
      }
    }
  };

  const handleCancelAi = () => {
    aiAbortRef.current?.abort();
    aiGenerateRef.current?.focus();
  };

  const welcomeName = getWelcomeName(user?.user_metadata);

  if (loading || !hasLoaded) {
    return (
      <section className="page-section dashboard-page">
        <div className="layout-container">
          <LoadingState message="Loading your dashboard…" />
        </div>
      </section>
    );
  }

  return (
    <section className="page-section dashboard-page">
      <div className="layout-container dashboard-container">
        {/* Welcome */}
        <header className="dashboard-hero">
          <div className="dashboard-welcome">
            <h1 className="dashboard-title">
              {welcomeName ? `Welcome back, ${welcomeName}` : 'Welcome back'}
            </h1>
            <p className="dashboard-description">
              Review your recent movement reports and continue your educational
              analysis journey.
            </p>
          </div>
          <Link to="/analyze" className="dashboard-primary-action">
            Start New Analysis
          </Link>
        </header>

        {loadError ? (
          <PageState
            tone="error"
            title="Dashboard Unavailable"
            message="We could not load your dashboard information. Your stored reports have not been removed."
            actionLabel="Try Again"
            onAction={loadReports}
          />
        ) : (
          <>
            {/* Summary cards */}
            <div className="dashboard-summary-grid">
              <DashboardSummaryCard
                icon="📄"
                title="Total Reports"
                value={`${summary.totalReports} ${summary.totalReports === 1 ? 'Report' : 'Reports'}`}
                description="Completed educational movement analyses"
              />
              <DashboardSummaryCard
                icon="📊"
                title="Average Score"
                value={summary.averageScore !== null ? `${summary.averageScore} / 100` : 'No score yet'}
                description="Average across completed reports"
              />
              <DashboardSummaryCard
                icon="🏃"
                title="Most Analyzed Movement"
                value={summary.mostAnalyzedMovement ?? 'No movement yet'}
                description="Movement analyzed most often"
              />
              <DashboardSummaryCard
                icon="🗓️"
                title="Latest Report"
                value={
                  summary.latestReportDate
                    ? formatReportDay(summary.latestReportDate)
                    : 'No recent report'
                }
                description="Most recent completed analysis"
              />
            </div>

            {/* Educational feedback */}
            <section className="dashboard-feedback-section" aria-labelledby="feedback-title">
              <div className="dashboard-feedback-header">
                <h2 id="feedback-title" className="dashboard-section-title">
                  Educational Feedback
                </h2>
                <p className="dashboard-feedback-description">
                  These insights are generated locally from your completed simulated
                  movement reports.
                </p>
              </div>

              {feedback === null ? (
                <p className="dashboard-feedback-empty" role="status">
                  Educational feedback is temporarily unavailable.
                </p>
              ) : feedback.latestReportFeedback === null ? (
                <div className="dashboard-feedback-empty">
                  <p>
                    Complete your first movement analysis to receive educational
                    feedback.
                  </p>
                  <Link to="/analyze" className="dashboard-primary-action">
                    Start New Analysis
                  </Link>
                </div>
              ) : (
                <>
                  <div className="dashboard-feedback-grid">
                    <DashboardFeedbackCard
                      label="Latest Result"
                      title={feedback.latestReportFeedback.title}
                      message={feedback.latestReportFeedback.message}
                      tone={feedback.latestReportFeedback.tone}
                      evidence={feedback.latestReportFeedback.evidence}
                    />
                    <DashboardFeedbackCard
                      label="Pattern"
                      title={feedback.trendFeedback.title}
                      message={feedback.trendFeedback.message}
                      tone={feedback.trendFeedback.tone}
                      evidence={feedback.trendFeedback.evidence}
                    />
                    {feedback.strongestMetric && (
                      <DashboardFeedbackCard
                        label="Strong Area"
                        title={feedback.strongestMetric.metricName}
                        message={`${feedback.strongestMetric.metricName} is your strongest recurring metric, averaging ${feedback.strongestMetric.averageScore} across ${feedback.strongestMetric.occurrenceCount} completed reports.`}
                        tone="positive"
                        evidence={`Based on ${feedback.strongestMetric.occurrenceCount} completed reports containing this metric`}
                      />
                    )}
                    {feedback.attentionMetric && (
                      <DashboardFeedbackCard
                        label="Review"
                        title={feedback.attentionMetric.metricName}
                        message={`${feedback.attentionMetric.metricName} is your most consistent opportunity for attention, averaging ${feedback.attentionMetric.averageScore} across ${feedback.attentionMetric.occurrenceCount} completed reports.`}
                        tone="attention"
                        evidence={`Based on ${feedback.attentionMetric.occurrenceCount} completed reports containing this metric`}
                        actionLabel="Open Learn"
                        actionRoute="/learn"
                      />
                    )}
                  </div>
                  {feedback.recurringMetricNote && (
                    <p className="dashboard-feedback-note">{feedback.recurringMetricNote}</p>
                  )}
                </>
              )}

              <p className="dashboard-trends-note">
                These insights are generated from simulated educational reports and
                should not be interpreted as medical advice or proof of physical
                improvement.
              </p>
            </section>

            {/* Optional AI-enhanced feedback */}
            <section className="dashboard-ai-section" aria-labelledby="ai-feedback-title">
              <div className="dashboard-ai-header">
                <span className="dashboard-ai-label">Optional feature</span>
                <h2 id="ai-feedback-title" className="dashboard-section-title">
                  Educational Feedback
                </h2>
                <p className="dashboard-ai-description">
                  Generate an optional explanation based on a limited summary of your
                  completed simulated reports.
                </p>
                {/* Implementation note: Gemini requests are handled by a
                    Supabase Edge Function. The Gemini API key is stored as a
                    server-side Supabase secret and is not included in the
                    Vite client bundle. */}
                <p className="dashboard-ai-privacy-note">
                  Only a limited summary of simulated scores and metric names is
                  sent securely through a Supabase Edge Function to Gemini.
                  Uploaded files, account details, and report IDs are not
                  included.
                </p>
              </div>

              {summary.totalReports === 0 ? (
                <p className="dashboard-ai-description">
                  Complete a movement analysis before requesting feedback.
                </p>
              ) : (
                <div className="dashboard-ai-actions">
                  <button
                    ref={aiGenerateRef}
                    type="button"
                    className="dashboard-ai-generate-button"
                    onClick={handleGenerateAi}
                    disabled={aiStatus === 'loading' || feedback === null}
                  >
                    {aiStatus === 'loading'
                      ? 'Generating Feedback…'
                      : aiFeedback
                        ? 'Generate New Feedback'
                        : 'Generate Feedback'}
                  </button>
                  {aiStatus === 'loading' && (
                    <button
                      type="button"
                      className="dashboard-ai-cancel-button"
                      onClick={handleCancelAi}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {aiStatus === 'loading' && (
                <p className="dashboard-ai-loading" role="status" aria-live="polite">
                  Reviewing your limited educational report summary…
                </p>
              )}

              {aiError && (
                <p className="dashboard-ai-error" role="alert">
                  {aiError}
                </p>
              )}

              {aiFeedback && (
                <DashboardAiFeedback feedback={aiFeedback} headingRef={aiHeadingRef} />
              )}
            </section>

            {/* Suggested next steps */}
            {feedback !== null && feedback.recommendations.length > 0 && (
              <section
                className="dashboard-recommendations"
                aria-labelledby="next-steps-title"
              >
                <div className="dashboard-section-header">
                  <h2 id="next-steps-title" className="dashboard-section-title">
                    Suggested Next Steps
                  </h2>
                </div>
                <div className="dashboard-recommendation-grid">
                  {feedback.recommendations.map((recommendation) => (
                    <DashboardRecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Report trends */}
            <section className="dashboard-trends" aria-labelledby="report-trends-title">
              <div className="dashboard-trends-header">
                <div>
                  <h2 id="report-trends-title" className="dashboard-section-title">
                    Report Trends
                  </h2>
                  <p className="dashboard-trends-description">
                    Explore how your completed educational movement reports are
                    distributed and how overall scores have changed over time.
                  </p>
                </div>
                <div className="dashboard-time-filter">
                  <label className="dashboard-time-filter-label" htmlFor="dashboard-time-range">
                    Time range
                  </label>
                  <select
                    id="dashboard-time-range"
                    className="dashboard-time-filter-select"
                    value={timeRange}
                    onChange={(event) => setTimeRange(event.target.value as DashboardTimeRange)}
                  >
                    <option value="all">All Time</option>
                    <option value="30-days">Last 30 Days</option>
                    <option value="90-days">Last 90 Days</option>
                    <option value="6-months">Last 6 Months</option>
                  </select>
                  <span className="dashboard-time-filter-note">
                    The filter below updates the charts only.
                  </span>
                </div>
              </div>

              <p className="sr-only">
                The selected range contains {filteredReports.length} completed{' '}
                {filteredReports.length === 1 ? 'report' : 'reports'}.
                {distribution.length > 0 &&
                  ` ${distribution[0].movementName} is the most analyzed movement with ${distribution[0].count} ${distribution[0].count === 1 ? 'report' : 'reports'}.`}
                {scoreHistory.length > 0 &&
                  ` Scores range from ${Math.min(...scoreHistory.map((i) => i.score))} to ${Math.max(...scoreHistory.map((i) => i.score))}.`}
              </p>

              {filteredReports.length === 0 ? (
                <div className="dashboard-chart-empty-state" role="status" aria-live="polite">
                  <h3>No Reports in This Time Range</h3>
                  <p>Choose another time range or create a new movement report.</p>
                  <Link to="/analyze" className="dashboard-primary-action">
                    Start New Analysis
                  </Link>
                </div>
              ) : (
                <div className="dashboard-chart-grid">
                  <DashboardChartCard
                    title="Movement Distribution"
                    description="Completed reports by movement in the selected range."
                  >
                    <MovementDistributionChart
                      items={distribution}
                      totalReports={filteredReports.length}
                    />
                  </DashboardChartCard>
                  <DashboardChartCard
                    title="Score History"
                    description="Overall scores of completed reports, oldest to newest."
                  >
                    <ScoreHistoryChart items={scoreHistory} showLimitNote={historyLimited} />
                  </DashboardChartCard>
                </div>
              )}

              <p className="dashboard-trends-note">
                Score history reflects simulated educational report results and should
                not be interpreted as medical progress.
              </p>
            </section>

            {/* Recent reports or empty state */}
            {recentReports.length > 0 ? (
              <section className="dashboard-section" aria-labelledby="recent-reports-title">
                <div className="dashboard-section-header">
                  <h2 id="recent-reports-title" className="dashboard-section-title">
                    Recent Reports
                  </h2>
                  <Link to="/reports" className="dashboard-section-link">
                    View All Reports
                  </Link>
                </div>
                <div className="dashboard-recent-grid">
                  {recentReports.map((report) => (
                    <DashboardRecentReportCard key={report.id} report={report} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="dashboard-empty-state">
                <h2>No Movement Reports Yet</h2>
                <p>
                  Complete your first educational movement analysis to begin building
                  your report history.
                </p>
                <Link to="/analyze" className="dashboard-primary-action">
                  Start Your First Analysis
                </Link>
              </div>
            )}

            {/* Quick actions */}
            <section className="dashboard-section" aria-labelledby="quick-actions-title">
              <div className="dashboard-section-header">
                <h2 id="quick-actions-title" className="dashboard-section-title">
                  Quick Actions
                </h2>
              </div>
              <div className="dashboard-quick-actions">
                {QUICK_ACTIONS.map((action) => (
                  <DashboardQuickAction
                    key={action.title}
                    icon={action.icon}
                    title={action.title}
                    description={action.description}
                    buttonLabel={action.buttonLabel}
                    route={action.route}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  );
}

export default DashboardPage;
