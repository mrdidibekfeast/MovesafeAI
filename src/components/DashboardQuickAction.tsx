import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface DashboardQuickActionProps {
  title: string;
  description: string;
  buttonLabel: string;
  route: string;
  icon?: ReactNode;
}

function DashboardQuickAction({
  title,
  description,
  buttonLabel,
  route,
  icon,
}: DashboardQuickActionProps) {
  return (
    <article className="dashboard-quick-action">
      {icon && (
        <span className="dashboard-quick-action-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="dashboard-quick-action-title">{title}</h3>
      <p className="dashboard-quick-action-description">{description}</p>
      <Link
        to={route}
        className="dashboard-quick-action-button"
        aria-label={`${buttonLabel}: ${title}`}
      >
        {buttonLabel}
      </Link>
    </article>
  );
}

export default DashboardQuickAction;
