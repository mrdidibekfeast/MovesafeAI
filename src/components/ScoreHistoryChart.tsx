import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { KeyboardEvent } from 'react';
import type { ScoreHistoryItem } from '../types/dashboard';

interface ScoreHistoryChartProps {
  items: ScoreHistoryItem[]; // oldest → newest, already limited by the page
  showLimitNote?: boolean;
}

// Fixed SVG coordinate space; the element scales responsively via viewBox.
const WIDTH = 480;
const HEIGHT = 260;
const PAD_LEFT = 36;
const PAD_RIGHT = 14;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;
const INNER_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const INNER_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

// Y always maps the fixed 0–100 scale so small changes are not exaggerated.
function yPosition(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return PAD_TOP + ((100 - clamped) / 100) * INNER_HEIGHT;
}

// A single report is centered; otherwise points spread evenly (no ÷0).
function xPosition(index: number, pointCount: number): number {
  if (pointCount <= 1) return PAD_LEFT + INNER_WIDTH / 2;
  return PAD_LEFT + index * (INNER_WIDTH / (pointCount - 1));
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ScoreHistoryChart({ items, showLimitNote = false }: ScoreHistoryChartProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default selection: the most recent displayed report.
  useEffect(() => {
    setSelectedId(items.length > 0 ? items[items.length - 1].reportId : null);
  }, [items]);

  const selected = items.find((item) => item.reportId === selectedId) ?? null;
  const scores = items.map((item) => item.score);
  const showAllDateLabels = items.length <= 6;

  const handlePointKeyDown = (event: KeyboardEvent, reportId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedId(reportId);
    }
  };

  return (
    <div className="score-history-chart">
      <p className="sr-only">
        {items.length} {items.length === 1 ? 'report' : 'reports'} shown
        {items.length > 0
          ? `. Scores range from ${Math.min(...scores)} to ${Math.max(...scores)} out of 100.`
          : '.'}
      </p>

      {showLimitNote && (
        <p className="score-history-limit-note">
          Showing the 12 most recent reports in this range.
        </p>
      )}

      <div className="score-history-svg-wrapper">
        <svg
          className="score-history-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Overall score history chart, scale 0 to 100"
        >
          {/* Grid lines + Y-axis labels (fixed 0–100 scale) */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                className="score-history-grid-line"
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yPosition(value)}
                y2={yPosition(value)}
              />
              <text
                className="score-history-axis-label"
                x={PAD_LEFT - 6}
                y={yPosition(value) + 3}
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}

          {/* Connecting line only when there are at least two points */}
          {items.length >= 2 && (
            <polyline
              className="score-history-line"
              fill="none"
              points={items
                .map((item, index) => `${xPosition(index, items.length)},${yPosition(item.score)}`)
                .join(' ')}
            />
          )}

          {/* Points — keyboard focusable and selectable */}
          {items.map((item, index) => {
            const isSelected = item.reportId === selectedId;
            const cx = xPosition(index, items.length);
            const cy = yPosition(item.score);
            const pointLabel = `${item.movementName} report on ${item.formattedDate}: score ${item.score} out of 100`;
            return (
              <g key={item.reportId}>
                {isSelected && (
                  <circle className="score-history-point-ring" cx={cx} cy={cy} r={10} />
                )}
                <circle
                  className={
                    isSelected
                      ? 'score-history-point score-history-point-selected'
                      : 'score-history-point'
                  }
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6.5 : 5}
                  tabIndex={0}
                  role="button"
                  aria-label={pointLabel}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(item.reportId)}
                  onKeyDown={(event) => handlePointKeyDown(event, item.reportId)}
                >
                  <title>{pointLabel}</title>
                </circle>
              </g>
            );
          })}

          {/* X-axis date labels: always first and last, middles when roomy */}
          {items.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === items.length - 1;
            if (!isFirst && !isLast && !showAllDateLabels) return null;
            return (
              <text
                key={`label-${item.reportId}`}
                className="score-history-date-label"
                x={xPosition(index, items.length)}
                y={HEIGHT - 12}
                textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
              >
                {shortDate(item.createdAt)}
              </text>
            );
          })}
        </svg>
      </div>

      {items.length === 1 && (
        <p className="score-history-single-note">
          Add another report to begin seeing score changes over time.
        </p>
      )}

      {/* Details for the selected point */}
      {selected && (
        <div className="score-history-details" role="status" aria-live="polite">
          <p className="score-history-details-title">{selected.movementName}</p>
          <p className="score-history-details-meta">
            {selected.formattedDate} · Score {selected.score} / 100
          </p>
          <Link
            to={`/report/${selected.reportId}`}
            className="score-history-details-link"
            aria-label={`View ${selected.movementName} report from ${selected.formattedDate}`}
          >
            View Report
          </Link>
        </div>
      )}
    </div>
  );
}

export default ScoreHistoryChart;
