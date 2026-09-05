import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { deleteReport, getReportsByUser } from '../services/reportStorage';
import ReportHistoryCard from '../components/ReportHistoryCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatReportDay, movementLabel } from '../utils/reportDisplay';
import {
  DEFAULT_MOVEMENT_FILTER,
  DEFAULT_SORT_OPTION,
  DEFAULT_STATUS_FILTER,
  filterAndSortReports,
} from '../utils/reportFilters';
import type { MovementFilter, SortOption, StatusFilter } from '../utils/reportFilters';
import type { MovementReport } from '../types/report';
import '../styles/reports.css';

type Feedback = { type: 'success' | 'error'; text: string };

function ReportsPage() {
  useDocumentTitle('My Reports');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<MovementReport[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Search / filter / sort controls
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>(DEFAULT_MOVEMENT_FILTER);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(DEFAULT_STATUS_FILTER);
  const [sortOption, setSortOption] = useState<SortOption>(DEFAULT_SORT_OPTION);

  // Deletion flow
  const [reportToDelete, setReportToDelete] = useState<MovementReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const userId = user?.id ?? null;

  // Reload on mount and whenever the signed-in user changes, so reports
  // generated on the Analyze page appear when the user returns here.
  const loadReports = useCallback(async () => {
    if (!userId) {
      setReports([]);
      setHasLoaded(true);
      return;
    }
    setHasLoaded(false);
    try {
      // Only this user's reports — guest reports (userId null) never appear.
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

  const visibleReports = useMemo(
    () => filterAndSortReports(reports, searchQuery, movementFilter, statusFilter, sortOption),
    [reports, searchQuery, movementFilter, statusFilter, sortOption],
  );

  const filtersAtDefaults =
    searchQuery === '' &&
    movementFilter === DEFAULT_MOVEMENT_FILTER &&
    statusFilter === DEFAULT_STATUS_FILTER &&
    sortOption === DEFAULT_SORT_OPTION;

  const clearFilters = () => {
    setSearchQuery('');
    setMovementFilter(DEFAULT_MOVEMENT_FILTER);
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setSortOption(DEFAULT_SORT_OPTION);
  };

  const requestDelete = (report: MovementReport) => {
    setFeedback(null);
    setReportToDelete(report);
  };

  const confirmDelete = async () => {
    if (!reportToDelete || isDeleting) return;

    // Ownership check in the UI. Row Level Security enforces the same rule
    // server-side, so this is convenience rather than the actual boundary.
    if (!user || reportToDelete.userId !== user.id) {
      setFeedback({ type: 'error', text: 'You do not have permission to delete this report.' });
      setReportToDelete(null);
      return;
    }

    setIsDeleting(true);
    const removed = await deleteReport(reportToDelete.id, user.id);
    setIsDeleting(false);
    setReportToDelete(null);

    if (removed) {
      await loadReports();
      setFeedback({ type: 'success', text: 'The movement report was deleted.' });
    } else {
      setFeedback({ type: 'error', text: 'We could not delete this report. Please try again.' });
    }
  };

  const latest = reports[0] ?? null;

  const resultsCountText =
    visibleReports.length === 0 && reports.length > 0
      ? 'No reports match your current filters'
      : `Showing ${visibleReports.length} of ${reports.length} ${
          reports.length === 1 ? 'report' : 'reports'
        }`;

  if (loading || !hasLoaded) {
    return (
      <section className="page-section reports-page">
        <div className="layout-container">
          <p role="status" aria-live="polite">
            Loading your reports…
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section reports-page">
      <div className="layout-container reports-container">
        <header className="reports-header">
          <div>
            <p className="reports-label">Report History</p>
            <h1 className="reports-heading">My Movement Reports</h1>
            <p className="reports-description">
              Review your previous movement analyses, track patterns, and open
              detailed educational feedback.
            </p>
          </div>
          <div className="reports-header-actions">
            <Link to="/analyze" className="report-primary-button">
              New Analysis
            </Link>
          </div>
        </header>

        {feedback && (
          <div
            className={`reports-feedback reports-feedback-${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback.text}
          </div>
        )}

        {loadError ? (
          <div className="reports-error-state" role="alert">
            <p>
              We could not load your reports from this browser. Please refresh the
              page or try again.
            </p>
            <button type="button" className="reports-retry-button" onClick={loadReports}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="reports-summary" aria-label="Report summary">
              <div className="reports-summary-card">
                <span className="reports-summary-label">Total Reports</span>
                <span className="reports-summary-value">{reports.length}</span>
              </div>
              <div className="reports-summary-card">
                <span className="reports-summary-label">Latest Movement</span>
                <span className="reports-summary-value">
                  {latest ? movementLabel(latest) : '—'}
                </span>
              </div>
              <div className="reports-summary-card">
                <span className="reports-summary-label">Last Analysis</span>
                <span className="reports-summary-value">
                  {latest ? formatReportDay(latest.createdAt) : '—'}
                </span>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="reports-empty-state">
                <h2>No Reports Yet</h2>
                <p>
                  Complete your first movement analysis to begin building your report
                  history.
                </p>
                <Link to="/analyze" className="report-primary-button">
                  Start Your First Analysis
                </Link>
              </div>
            ) : (
              <>
                <div className="reports-controls">
                  <div className="reports-search">
                    <label className="form-label" htmlFor="reports-search-input">
                      Search reports
                    </label>
                    <input
                      id="reports-search-input"
                      type="search"
                      className="reports-search-input"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by movement or file name"
                    />
                  </div>

                  <div className="reports-filter-group">
                    <div className="reports-filter">
                      <label className="form-label" htmlFor="movement-filter">
                        Movement
                      </label>
                      <select
                        id="movement-filter"
                        value={movementFilter}
                        onChange={(event) =>
                          setMovementFilter(event.target.value as MovementFilter)
                        }
                      >
                        <option value="all">All Movements</option>
                        <option value="squat">Squat</option>
                        <option value="jump">Jump</option>
                        <option value="landing">Landing</option>
                        <option value="running">Running</option>
                        <option value="walking">Walking</option>
                        <option value="custom">Other Movement</option>
                      </select>
                    </div>

                    <div className="reports-filter">
                      <label className="form-label" htmlFor="status-filter">
                        Status
                      </label>
                      <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value as StatusFilter)
                        }
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    <div className="reports-sort">
                      <label className="form-label" htmlFor="sort-option">
                        Sort by
                      </label>
                      <select
                        id="sort-option"
                        value={sortOption}
                        onChange={(event) => setSortOption(event.target.value as SortOption)}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Score</option>
                        <option value="lowest">Lowest Score</option>
                        <option value="name-asc">Movement Name A–Z</option>
                        <option value="name-desc">Movement Name Z–A</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="reports-clear-filters"
                      onClick={clearFilters}
                      disabled={filtersAtDefaults}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                <p className="reports-results-count" aria-live="polite">
                  {resultsCountText}
                </p>

                {visibleReports.length === 0 ? (
                  <div className="reports-filtered-empty">
                    <h2>No Matching Reports</h2>
                    <p>Try changing your search, movement filter, or status filter.</p>
                    <button
                      type="button"
                      className="reports-retry-button"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="reports-grid">
                    {visibleReports.map((report) => (
                      <ReportHistoryCard
                        key={report.id}
                        report={report}
                        onView={(reportId) => navigate(`/report/${reportId}`)}
                        onDelete={requestDelete}
                        isDeleting={isDeleting && reportToDelete?.id === report.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <p className="reports-storage-note">
              Reports are currently stored in this browser and may not appear on
              another device.
            </p>
          </>
        )}

        <ConfirmDialog
          isOpen={reportToDelete !== null}
          title="Delete Movement Report?"
          message="This report will be permanently removed from this browser. This action cannot be undone."
          confirmLabel="Delete Report"
          cancelLabel="Cancel"
          processingLabel="Deleting…"
          isProcessing={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!isDeleting) setReportToDelete(null);
          }}
        />
      </div>
    </section>
  );
}

export default ReportsPage;
