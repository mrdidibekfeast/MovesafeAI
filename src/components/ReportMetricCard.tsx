import type { MetricStatus } from '../types/report';
import { METRIC_STATUS_LABELS } from '../utils/reportDisplay';

interface ReportMetricCardProps {
  label: string;
  score: number;
  status: MetricStatus;
  description: string;
}

function ReportMetricCard({ label, score, status, description }: ReportMetricCardProps) {
  // Keep the visual bar within 0–100% no matter what was stored.
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <article className="metric-card">
      <div className="metric-header">
        <h3 className="metric-label">{label}</h3>
        <span className="metric-score">{clamped}</span>
      </div>

      <span className={`metric-status metric-status-${status}`}>
        {METRIC_STATUS_LABELS[status]}
      </span>

      <div
        className="metric-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`${label} score: ${clamped} out of 100`}
      >
        <div
          className={`metric-progress-bar metric-progress-${status}`}
          style={{ width: `${clamped}%` }}
        />
      </div>

      <p className="metric-description">{description}</p>
    </article>
  );
}

export default ReportMetricCard;
