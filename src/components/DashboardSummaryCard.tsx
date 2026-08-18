import type { ReactNode } from 'react';

interface DashboardSummaryCardProps {
  title: string;
  value: string;
  description: string;
  icon?: ReactNode;
}

function DashboardSummaryCard({ title, value, description, icon }: DashboardSummaryCardProps) {
  return (
    <div className="dashboard-summary-card">
      {icon && (
        <span className="dashboard-summary-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="dashboard-summary-title">{title}</span>
      <span className="dashboard-summary-value">{value}</span>
      <span className="dashboard-summary-description">{description}</span>
    </div>
  );
}

export default DashboardSummaryCard;
