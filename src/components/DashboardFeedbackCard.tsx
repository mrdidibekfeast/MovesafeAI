import { Link } from 'react-router-dom';
import type { FeedbackTone } from '../types/dashboardFeedback';

interface DashboardFeedbackCardProps {
  /** Visible category chip, e.g. "Latest Result", "Pattern", "Strong Area". */
  label: string;
  title: string;
  message: string;
  tone: FeedbackTone;
  evidence?: string;
  actionLabel?: string;
  actionRoute?: string;
}

// Tone is communicated by the visible label and wording — never color alone.
function DashboardFeedbackCard({
  label,
  title,
  message,
  tone,
  evidence,
  actionLabel,
  actionRoute,
}: DashboardFeedbackCardProps) {
  return (
    <article className={`dashboard-feedback-card dashboard-feedback-card-${tone}`}>
      <span className="dashboard-feedback-card-label">{label}</span>
      <h3 className="dashboard-feedback-card-title">{title}</h3>
      <p className="dashboard-feedback-card-message">{message}</p>
      {evidence && <p className="dashboard-feedback-card-evidence">{evidence}</p>}
      {actionLabel && actionRoute && (
        <Link
          to={actionRoute}
          className="dashboard-feedback-card-action"
          aria-label={`${actionLabel} — ${title}`}
        >
          {actionLabel}
        </Link>
      )}
    </article>
  );
}

export default DashboardFeedbackCard;
