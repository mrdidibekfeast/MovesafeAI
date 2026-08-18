export interface LearnAnnotation {
  kind: 'line' | 'circle' | 'arrow';
  color?: 'warn' | 'good' | 'guide';
  /* Coordinates use the 480 x 300 space shared with the illustrations. */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  dashed?: boolean;
}

export interface LearnImageCardProps {
  image: string;
  title: string;
  description: string;
  why: string;
  tip: string;
  alt: string;
  badge?: string;
  tone?: 'issue' | 'good';
  annotations?: LearnAnnotation[];
}

const ANNOTATION_COLORS: Record<NonNullable<LearnAnnotation['color']>, string> = {
  warn: '#ff5d5d',
  good: '#37d67a',
  guide: '#8ab4ff',
};

function LearnImageCard({
  image,
  title,
  description,
  why,
  tip,
  alt,
  badge,
  tone = 'issue',
  annotations = [],
}: LearnImageCardProps) {
  return (
    <article className={`lic lic-${tone}`}>
      <div className="lic-media">
        <img src={image} alt={alt} className="lic-image" loading="lazy" />

        {annotations.length > 0 && (
          <svg
            className="lic-annotations"
            viewBox="0 0 480 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              {Object.entries(ANNOTATION_COLORS).map(([name, color]) => (
                <marker
                  key={name}
                  id={`lic-arrow-${name}`}
                  markerWidth="5"
                  markerHeight="5"
                  refX="2.5"
                  refY="2.5"
                  orient="auto"
                >
                  <path d="M0,0 L5,2.5 L0,5 Z" fill={color} />
                </marker>
              ))}
            </defs>

            {annotations.map((a, i) => {
              const color = ANNOTATION_COLORS[a.color ?? 'guide'];
              if (a.kind === 'circle') {
                return (
                  <circle
                    key={i}
                    cx={a.cx}
                    cy={a.cy}
                    r={a.r ?? 14}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                  />
                );
              }
              return (
                <line
                  key={i}
                  x1={a.x1}
                  y1={a.y1}
                  x2={a.x2}
                  y2={a.y2}
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={a.dashed ? '7 7' : undefined}
                  markerEnd={
                    a.kind === 'arrow' ? `url(#lic-arrow-${a.color ?? 'guide'})` : undefined
                  }
                />
              );
            })}
          </svg>
        )}

        <div className="lic-overlay" />

        <div className="lic-media-caption">
          {badge && <span className="lic-badge">{badge}</span>}
          <h3 className="lic-title">{title}</h3>
        </div>
      </div>

      <div className="lic-body">
        <p className="lic-description">{description}</p>
        <p className="lic-why">
          <span className="lic-why-label">Why it matters</span>
          {why}
        </p>
        <div className="lic-tip">
          <span className="lic-tip-label">Try this</span>
          {tip}
        </div>
      </div>
    </article>
  );
}

export default LearnImageCard;
