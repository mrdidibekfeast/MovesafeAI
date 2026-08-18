import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getReportById } from '../services/reportStorage';
import { buildReportPdfFileName, exportReportToPdf } from '../services/reportPdf';
import ReportMetricCard from '../components/ReportMetricCard';
import LoadingState from '../components/LoadingState';
import { formatFileSize } from '../utils/format';
import { formatReportDate, movementLabel, scoreBand } from '../utils/reportDisplay';
import '../styles/report-detail.css';

function ReportDetailPage() {
  // Base title for loading/missing/denied states; the effect below swaps in
  // the movement name for owners (which also improves print file names).
  useDocumentTitle('Movement Report');
  const { reportId } = useParams<{ reportId: string }>();
  const { user, loading, isAuthenticated } = useAuth();
  // Captured so signing in returns the visitor to this same report.
  const location = useLocation();

  // PDF export
  const reportContentRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // All storage access goes through the report storage service.
  const report = useMemo(
    () => (reportId ? getReportById(reportId) : null),
    [reportId],
  );

  // A meaningful document title improves the browser's default print/PDF
  // file name. Restored when the route changes. Never includes IDs.
  useEffect(() => {
    if (!report) return;
    const owner = report.userId === null || (user !== null && report.userId === user.id);
    if (!owner) return;
    const previousTitle = document.title;
    document.title = `MoveSafe AI – ${movementLabel(report)} Movement Report`;
    return () => {
      document.title = previousTitle;
    };
  }, [report, user]);

  // Never show a report before the ownership check can run.
  if (loading) {
    return (
      <section className="page-section report-page">
        <div className="layout-container">
          <LoadingState message="Loading your report…" />
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="page-section report-page">
        <div className="layout-container">
          <div className="report-empty-state" role="status" aria-live="polite">
            <h1>Report Not Found</h1>
            <p>
              This movement report may have been removed or is no longer available in
              this browser.
            </p>
            <div className="report-actions">
              <Link to="/analyze" className="report-primary-button">
                Start a New Analysis
              </Link>
              <Link to="/" className="report-secondary-button">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Guest reports (userId null) stay viewable in this browser. A report that
  // belongs to a user may only be viewed by that same signed-in user.
  const isOwner = report.userId === null || (user !== null && report.userId === user.id);

  if (!isOwner) {
    return (
      <section className="page-section report-page">
        <div className="layout-container">
          <div className="report-access-denied" role="status" aria-live="polite">
            <h1>Access Restricted</h1>
            <p>You do not have access to this report.</p>
            <div className="report-actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="report-primary-button">
                  Back to Dashboard
                </Link>
              ) : (
                <Link to="/" className="report-primary-button">
                  Go Home
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const overall = Math.min(100, Math.max(0, report.overallScore));
  const { label: overallLabel, band } = scoreBand(overall);
  const isGuestReport = report.userId === null;

  /*
   * Signed-out visitors see the overall score only. Everything else —
   * metrics, observations, recommendations, notes, analysis details, and
   * the PDF/print exports — requires an account. Signing in returns the
   * visitor here, where the full report renders.
   */
  if (!isAuthenticated) {
    return (
      <section className="page-section report-page">
        <div className="layout-container report-container">
          <header className="report-header">
            <span className="report-badge">Simulated Educational Analysis</span>
            <h1 className="report-title">{movementLabel(report)} Movement Report</h1>
            <p className="report-meta">{formatReportDate(report.createdAt)}</p>
          </header>

          <section className="score-section" aria-labelledby="overall-score-title">
            <h2 id="overall-score-title">Overall Movement Score</h2>
            <div className="score-content">
              <div
                className={`score-circle score-band-${band}`}
                style={{ '--score-angle': `${overall * 3.6}deg` } as CSSProperties}
                role="img"
                aria-label={`Overall movement score: ${overall} out of 100`}
              >
                <div className="score-circle-inner">
                  <span className="score-value">{overall}</span>
                  <span className="score-out-of">/ 100</span>
                </div>
              </div>
              <div>
                <p className={`score-label score-label-${band}`}>{overallLabel}</p>
                <p className="score-explainer">
                  This is the average of the movement metrics in this report. It is
                  educational feedback, not a medical measurement.
                </p>
              </div>
            </div>
          </section>

          <div className="report-locked">
            <h2 className="report-locked-title">Sign in to see your full report</h2>
            <p className="report-locked-text">Your complete report also includes:</p>
            <ul className="report-locked-list">
              <li>Every movement metric, with its own score and explanation</li>
              <li>Key observations from the analysis</li>
              <li>Suggested next steps</li>
              <li>Any notes you added</li>
              <li>PDF download and printing</li>
            </ul>
            <div className="report-actions">
              <Link
                to="/login"
                state={{ from: location }}
                className="report-primary-button"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                state={{ from: location }}
                className="report-secondary-button"
              >
                Create Account
              </Link>
            </div>
            <p className="report-locked-note">
              An account also keeps your reports so you can compare them over time.
            </p>
          </div>

          <p className="report-disclaimer">
            This report provides simulated educational movement feedback. It is not a
            medical diagnosis, injury assessment, or substitute for evaluation by a
            qualified healthcare professional.
          </p>
        </div>
      </section>
    );
  }

  // Browser print — one dialog per click, independent of the PDF export.
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isExporting) return; // one export per click, never in parallel
    setPdfMessage(null);
    setPdfError(null);

    const element = reportContentRef.current;
    if (!element) {
      setPdfError('We could not create the PDF. Please try again.');
      return;
    }

    setIsExporting(true);
    try {
      await exportReportToPdf(element, { fileName: buildReportPdfFileName(report) });
      setPdfMessage('Your PDF report was downloaded successfully.');
    } catch {
      // Raw html2canvas / jsPDF errors are never shown to the user.
      setPdfError('We could not create the PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="page-section report-page">
      <div className="layout-container report-container">
        {/* Printable report content — everything inside appears in the PDF. */}
        <div ref={reportContentRef} className="report-print-content">
        <div className="report-pdf-header">
          <p className="report-pdf-brand">MoveSafe AI</p>
          <p className="report-pdf-subtitle">Educational Movement Report</p>
        </div>

        {/* Header */}
        <header className="report-header">
          <span className="report-badge">Simulated Educational Analysis</span>
          <h1 className="report-title">{movementLabel(report)} Movement Report</h1>
          <p className="report-meta">
            {formatReportDate(report.createdAt)} ·{' '}
            <span className="report-status-chip">
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </span>
          </p>
          <p className="report-summary">{report.summary}</p>
        </header>

        {/* Overall score */}
        <section className="score-section" aria-labelledby="overall-score-title">
          <h2 id="overall-score-title">Overall Movement Score</h2>
          <div className="score-content">
            <div
              className={`score-circle score-band-${band}`}
              style={{ '--score-angle': `${overall * 3.6}deg` } as CSSProperties}
              role="img"
              aria-label={`Overall movement score: ${overall} out of 100`}
            >
              <div className="score-circle-inner">
                <span className="score-value">{overall}</span>
                <span className="score-out-of">/ 100</span>
              </div>
            </div>
            {/* PDF-friendly score block: the CSS conic-gradient circle does not
                capture reliably, so the export swaps it for text and a bar. */}
            <div className="report-pdf-score">
              <p className="report-pdf-score-value">{overall} / 100</p>
              <p className={`score-label score-label-${band}`}>{overallLabel}</p>
              <div className="report-pdf-score-bar">
                <div
                  className="report-pdf-score-fill"
                  style={{ width: `${overall}%` }}
                />
              </div>
            </div>
            <div>
              <p className={`score-label score-label-${band}`}>{overallLabel}</p>
              <p className="score-explainer">
                The overall score is the average of the movement metrics below. It is
                educational feedback, not a medical measurement.
              </p>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="metrics-section" aria-labelledby="metrics-title">
          <h2 id="metrics-title">Movement Metrics</h2>
          <div className="metrics-grid">
            {report.metrics.map((metric) => (
              <ReportMetricCard
                key={metric.id}
                label={metric.label}
                score={metric.score}
                status={metric.status}
                description={metric.description}
              />
            ))}
          </div>
        </section>

        {/* Observations */}
        <section className="observations-section" aria-labelledby="observations-title">
          <h2 id="observations-title">Key Observations</h2>
          {report.observations.length > 0 ? (
            <ul className="observations-list">
              {report.observations.map((observation) => (
                <li key={observation}>{observation}</li>
              ))}
            </ul>
          ) : (
            <p className="report-muted">
              No additional observations were generated for this report.
            </p>
          )}
        </section>

        {/* Recommendations */}
        <section className="recommendations-section" aria-labelledby="recommendations-title">
          <h2 id="recommendations-title">Suggested Next Steps</h2>
          <ol className="recommendations-list">
            {report.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ol>
          <p className="report-muted">
            Stop any activity that causes pain and seek qualified guidance when needed.
          </p>
        </section>

        {/* User notes — part of the printable PDF/print content */}
        {report.notes && (
          <section className="report-notes-section" aria-labelledby="notes-title">
            <h2 id="notes-title">Notes</h2>
            <p className="report-note-text">{report.notes}</p>
            <p className="report-muted">
              Written by you when this movement was submitted for analysis.
            </p>
          </section>
        )}

        {/* File details */}
        <section className="report-details" aria-labelledby="details-title">
          <h2 id="details-title">Analysis Details</h2>
          <dl className="report-details-grid">
            {/* Uploaded file name is kept off the PDF for privacy. */}
            <div className="pdf-exclude" data-html2canvas-ignore="true">
              <dt>File name</dt>
              <dd>{report.fileName}</dd>
            </div>
            <div>
              <dt>File type</dt>
              <dd>{report.fileType}</dd>
            </div>
            <div>
              <dt>File size</dt>
              <dd>{report.fileSize ? formatFileSize(report.fileSize) : 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Movement</dt>
              <dd>{movementLabel(report)}</dd>
            </div>
            <div>
              <dt>Report date</dt>
              <dd>{formatReportDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt>Report ID</dt>
              <dd>{report.id.slice(0, 8)}…</dd>
            </div>
          </dl>
        </section>

        {/* Disclaimer — part of the printable PDF content */}
        <p className="report-disclaimer">
          This report provides simulated educational movement feedback. It is not a
          medical diagnosis, injury assessment, or substitute for evaluation by a
          qualified healthcare professional. Scores and recommendations are generated
          for demonstration and educational purposes.
        </p>

        {/* Small footer that appears only on printed output */}
        <p className="report-print-footer">
          Generated by MoveSafe AI · Educational use only ·{' '}
          {formatReportDate(report.createdAt)}
        </p>
        </div>
        {/* End of printable report content */}

        {/* Guest callout — never part of the PDF or printed output */}
        {isGuestReport && (
          <aside className="guest-report-callout pdf-exclude print-exclude" role="note">
            <p>
              This report is stored only in this browser.{' '}
              <Link to="/login">Sign in</Link> or <Link to="/signup">create an account</Link>{' '}
              to save future reports and compare your progress.
            </p>
          </aside>
        )}

        {/* PDF export feedback */}
        {pdfMessage && (
          <p
            className="report-pdf-feedback report-pdf-feedback-success print-exclude"
            role="status"
            aria-live="polite"
          >
            {pdfMessage}
          </p>
        )}
        {pdfError && (
          <p className="report-pdf-feedback report-pdf-feedback-error print-exclude" role="alert">
            {pdfError}
          </p>
        )}

        {/* Actions — outside the printable container */}
        <div className="report-actions pdf-exclude print-exclude">
          {report.status === 'completed' && (
            <button
              type="button"
              className="report-primary-button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              aria-label={`Download ${movementLabel(report)} movement report as PDF`}
            >
              {isExporting ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          )}
          {report.status === 'completed' && (
            <button
              type="button"
              className="report-secondary-button print-report-button"
              onClick={handlePrint}
              aria-label={`Print ${movementLabel(report)} movement report`}
            >
              Print Report
            </button>
          )}
          <Link to="/analyze" className="report-secondary-button">
            Analyze Another Movement
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/reports" className="report-secondary-button">
                View My Reports
              </Link>
              <Link to="/dashboard" className="report-secondary-button">
                Back to Dashboard
              </Link>
            </>
          ) : (
            <Link to="/login" className="report-secondary-button">
              Sign In to Save Reports
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default ReportDetailPage;
