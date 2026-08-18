import { Link } from 'react-router-dom';
import type { DashboardFeedbackItem } from '../types/dashboardFeedback';

interface DashboardRecommendationCardProps {
  recommendation: DashboardFeedbackItem;
}

function DashboardRecommendationCard({ recommendation }: DashboardRecommendationCardProps) {
  const { title, message, actionLabel, actionRoute } = recommendation;
  return (
    <article className="dashboard-recommendation-card">
      <h3 className="dashboard-recommendation-title">{title}</h3>
      <p className="dashboard-recommendation-message">{message}</p>
      {actionLabel && actionRoute && (
        <Link
          to={actionRoute}
          className="dashboard-recommendation-action"
          aria-label={`${actionLabel} — ${title}`}
        >
          {actionLabel}
        </Link>
      )}
    </article>
  );
}

export default DashboardRecommendationCard;
