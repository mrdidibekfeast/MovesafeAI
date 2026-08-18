import type { ReactNode } from 'react';

interface DashboardChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

// Consistent container for the Dashboard charts.
function DashboardChartCard({ title, description, children }: DashboardChartCardProps) {
  return (
    <section className="dashboard-chart-card" aria-label={title}>
      <div className="dashboard-chart-card-header">
        <h3 className="dashboard-chart-title">{title}</h3>
        {description && <p className="dashboard-chart-description">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default DashboardChartCard;
