import type { MovementReport } from '../types/report';
import {
  STATUS_LABELS,
  formatReportDate,
  movementLabel,
  scoreBand,
} from '../utils/reportDisplay';

interface ReportHistoryCardProps {
  report: MovementReport;
  onView: (reportId: string) => void;
  onDelete: (report: MovementReport) => void;
  isDeleting?: boolean;
}

function ReportHistoryCard({
  report,
  onView,
  onDelete,
  isDeleting = false,
}: ReportHistoryCardProps) {
  const overall = Math.min(100, Math.max(0, report.overallScore));
  const { label: bandLabel, band } = scoreBand(overall);
  const cardName = `${movementLabel(report)} report from ${formatReportDate(report.createdAt)}`;

  return (
    <article className="report-history-card">
      <div className="report-history-header">
        <div>
          <h2 className="report-history-title">{movementLabel(report)}</h2>
          <p className="report-history-date">{formatReportDate(report.createdAt)}</p>
        </div>
        <span className={`report-history-status report-history-status-${report.status}`}>
          {STATUS_LABELS[report.status]}
        </span>
      </div>

      <p className="report-history-score">
        {overall} / 100{' '}
        <span className={`report-history-score-label score-label-${band}`}>
          {bandLabel}
        </span>
      </p>

      <p className="report-history-summary">{report.summary}</p>

      <p className="report-history-meta">
        {report.fileName} · {report.metrics.length}{' '}
        {report.metrics.length === 1 ? 'metric' : 'metrics'}
      </p>

      <div className="report-history-actions">
        <button
          type="button"
          className="report-history-button"
          onClick={() => onView(report.id)}
          aria-label={`View ${cardName}`}
        >
          View Report
        </button>
        <button
          type="button"
          className="report-history-delete-button"
          onClick={() => onDelete(report)}
          disabled={isDeleting}
          aria-label={`Delete ${cardName}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default ReportHistoryCard;
