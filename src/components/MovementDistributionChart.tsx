import type { MovementDistributionItem } from '../types/dashboard';
import { groupDistributionForChart } from '../services/dashboardSummary';

interface MovementDistributionChartProps {
  items: MovementDistributionItem[];
  totalReports: number;
}

function MovementDistributionChart({ items, totalReports }: MovementDistributionChartProps) {
  const displayItems = groupDistributionForChart(items);

  return (
    <div className="movement-distribution-chart">
      <p className="sr-only">
        Movement distribution for {totalReports}{' '}
        {totalReports === 1 ? 'completed report' : 'completed reports'} in the selected
        range.
      </p>
      {displayItems.map((item) => (
        <div key={item.movementName} className="movement-distribution-row">
          <div className="movement-distribution-label">
            <span className="movement-distribution-name">{item.movementName}</span>
            <span className="movement-distribution-value">
              {item.count} {item.count === 1 ? 'report' : 'reports'} · {item.percentage}%
            </span>
          </div>
          <div
            className="movement-distribution-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.percentage}
            aria-label={`${item.movementName}: ${item.count} ${
              item.count === 1 ? 'report' : 'reports'
            }, ${item.percentage}% of the selected range`}
          >
            <div
              className="movement-distribution-fill"
              style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MovementDistributionChart;
