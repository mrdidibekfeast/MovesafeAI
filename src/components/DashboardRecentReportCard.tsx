import { Link } from 'react-router-dom';
import type { MovementReport } from '../types/report';
import { formatReportDate, movementLabel, scoreBand } from '../utils/reportDisplay';
import { clampScore } from '../utils/scoreUtils';

interface DashboardRecentReportCardProps {
  report: MovementReport;
}

function DashboardRecentReportCard({ report }: DashboardRecentReportCardProps) {
  const overall = clampScore(report.overallScore);
  const { label: bandLabel, band } = scoreBand(overall);

  return (
    <article className="dashboard-recent-card">
      <div className="dashboard-recent-header">
        <h3 className="dashboard-recent-movement">{movementLabel(report)}</h3>
        <p className="dashboard-recent-date">{formatReportDate(report.createdAt)}</p>
      </div>

      <p className="dashboard-recent-score">
        {overall} / 100{' '}
        <span className={`dashboard-recent-score-label score-label-${band}`}>
          {bandLabel}
        </span>
      </p>

      <p className="dashboard-recent-summary">{report.summary}</p>

      <Link
        to={`/report/${report.id}`}
        className="dashboard-recent-link"
        aria-label={`View ${movementLabel(report)} report from ${formatReportDate(report.createdAt)}`}
      >
        View Report
      </Link>
    </article>
  );
}

export default DashboardRecentReportCard;
