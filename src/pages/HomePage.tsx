import type { ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import FeatureCard from '../components/FeatureCard';
import '../styles/home.css';

// Inline line icons — no icon library (see CLAUDE.md rule 3).
function Icon({ children, size = 18, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

const icons = {
  camera: (
    <Icon>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </Icon>
  ),
  file: (
    <Icon>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </Icon>
  ),
  book: (
    <Icon>
      <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2z" />
      <path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  grid: (
    <Icon>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  check: (
    <Icon size={16}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  ),
  device: (
    <Icon size={16}>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18h2" />
    </Icon>
  ),
  shield: (
    <Icon size={16}>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
    </Icon>
  ),
  angles: (
    <Icon size={16}>
      <path d="M4 4v16h16" />
      <path d="M4 20L18 6" />
    </Icon>
  ),
  gauge: (
    <Icon size={16}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M12 15l4-5" />
    </Icon>
  ),
  // Metric glyphs
  angle: (
    <Icon size={22}>
      <path d="M5 19L12 5" />
      <path d="M5 19h14" />
      <path d="M9.5 19a5 5 0 0 0-1.7-3.5" />
    </Icon>
  ),
  level: (
    <Icon size={22}>
      <path d="M4 12h16" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 8l-2 4 2 4M18 8l2 4-2 4" />
    </Icon>
  ),
  land: (
    <Icon size={22}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 19h16" />
    </Icon>
  ),
  steps: (
    <Icon size={22}>
      <path d="M4 19V12M9 19V8M14 19v-5M19 19V6" />
    </Icon>
  ),
};

const features = [
  {
    icon: icons.camera,
    title: 'Analyze',
    description: 'Upload a front and a side video and get a measured report in about a minute.',
    link: '/analyze',
  },
  {
    icon: icons.file,
    title: 'Reports',
    description: 'Every screening you have saved, with PDF export and the measured values on each card.',
    link: '/reports',
  },
  {
    icon: icons.book,
    title: 'Learn',
    description: 'Movement basics, warm-ups, posture, and injury-prevention resources.',
    link: '/learn',
  },
  {
    icon: icons.grid,
    title: 'Dashboard',
    description: 'Score history across sessions and plain-language feedback on what changed.',
    link: '/dashboard',
  },
];

const steps = [
  {
    number: '01',
    title: 'Film two angles',
    text: 'Phone at hip height, whole body in frame. One clip from directly in front, one from the side. Ten seconds is plenty.',
  },
  {
    number: '02',
    title: 'Pose detection in your browser',
    text: '33 body landmarks are tracked frame by frame on your device. The videos are never uploaded.',
  },
  {
    number: '03',
    title: 'Read the report',
    text: 'Measured angles, a score per metric, what to practice next, and a confidence level on every number.',
  },
];

const metrics: { icon: ReactNode; title: string; text: string; view: 'Front' | 'Side' }[] = [
  { icon: icons.angle, title: 'Knee valgus', text: 'How far the knees collapse inward, measured from both shins together.', view: 'Front' },
  { icon: icons.angle, title: 'Squat depth', text: 'Peak knee bend, so you know whether parallel was reached.', view: 'Side' },
  { icon: icons.angle, title: 'Forward trunk lean', text: 'Peak trunk angle from vertical through the movement.', view: 'Side' },
  { icon: icons.level, title: 'Pelvic control', text: 'Hip-line tilt at its peak. A level pelvis is the goal.', view: 'Front' },
  { icon: icons.land, title: 'Landing absorption', text: 'How much the knee keeps bending after first contact.', view: 'Side' },
  { icon: icons.steps, title: 'Cadence', text: 'Steps per minute for running and walking clips.', view: 'Side' },
];

// Static, illustrative preview of a finished report. The numbers are the
// engine's output on a real test clip — not a promise about anyone's body.
const previewMetrics = [
  { name: 'Knee valgus', value: '4.7°', score: 86, status: 'good' as const, confidence: 'High' },
  { name: 'Squat depth', value: '128.9°', score: 95, status: 'good' as const, confidence: 'High' },
  { name: 'Forward trunk lean', value: '65.6°', score: 51, status: 'warning' as const, confidence: 'High' },
  { name: 'Lateral trunk control', value: '8.5°', score: 69, status: 'attention' as const, confidence: 'Medium' },
  { name: 'Pelvic control', value: '5.6°', score: 73, status: 'attention' as const, confidence: 'Medium' },
];

const statusLabel = { good: 'Good', attention: 'Review', warning: 'Attention' } as const;

function ReportPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-bar">
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-url">movesafeai.app/report</span>
      </div>
      <div className="preview-body">
        <aside className="preview-side">
          <span className="preview-badge">Automated Movement Screening</span>
          <p className="preview-title">Squat Movement Report</p>
          <div className="preview-score">
            <div className="preview-ring" style={{ '--pct': '75%' } as React.CSSProperties}>
              <div className="preview-ring-inner">75</div>
            </div>
            <div className="preview-score-text">
              <strong>Developing</strong>
              <span>Overall score out of 100</span>
            </div>
          </div>
          <ul className="preview-facts">
            <li>Front view · 120 frames</li>
            <li>Side view · 119 frames</li>
            <li>Camera about 13° off-centre</li>
          </ul>
        </aside>
        <div className="preview-metrics">
          <div className="preview-metrics-head">
            <span>Metric</span>
            <span>Confidence</span>
          </div>
          {previewMetrics.map((metric) => (
            <div className="preview-metric" key={metric.name}>
              <span className="preview-metric-name">{metric.name}</span>
              <span className="preview-metric-value">{metric.value}</span>
              <span className="preview-bar-track">
                <span
                  className={`preview-bar-fill preview-bar-${metric.status}`}
                  style={{ width: `${metric.score}%` }}
                />
              </span>
              <span className={`preview-chip preview-chip-${metric.status}`}>
                {statusLabel[metric.status]} · {metric.confidence}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  useDocumentTitle('Home');
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="layout-container hero-inner">
          <p className="hero-eyebrow">
            <span className="hero-eyebrow-tag">New</span>
            Real joint-angle measurement, on your device
          </p>
          <h1 id="hero-title" className="hero-title">
            Film the movement.
            <br />
            Get the angles.
          </h1>
          <p className="hero-description">
            Upload a front and a side video of a squat, jump, landing, run, or walk.
            MoveSafe measures knee valgus, depth, trunk lean, and more — in your browser,
            with a confidence level on every number.
          </p>
          <div className="hero-actions">
            <Link to="/analyze" className="hero-primary-button">
              Start analysis
            </Link>
            <a href="#how-it-works" className="hero-secondary-button">
              How it works
            </a>
          </div>
          <div className="hero-frame">
            <ReportPreview />
          </div>
        </div>
      </section>

      <section className="trust" aria-label="Key facts">
        <div className="layout-container trust-inner">
          <div className="trust-item">
            <span className="trust-icon">{icons.device}</span>
            Runs entirely on your device
          </div>
          <div className="trust-item">
            <span className="trust-icon">{icons.shield}</span>
            Videos are never uploaded
          </div>
          <div className="trust-item">
            <span className="trust-icon">{icons.angles}</span>
            Front and side camera angles
          </div>
          <div className="trust-item">
            <span className="trust-icon">{icons.gauge}</span>
            Confidence on every metric
          </div>
        </div>
      </section>

      <section id="how-it-works" className="home-section" aria-labelledby="steps-title">
        <div className="layout-container">
          <div className="section-head">
            <p className="section-label">How it works</p>
            <h2 id="steps-title" className="home-section-title">
              Two angles. One honest report.
            </h2>
            <p className="home-section-description">
              Each camera sees a different plane of motion, so each video measures what the
              other cannot. Nothing is estimated out of plane.
            </p>
          </div>
          <ol className="steps-grid">
            {steps.map((step) => (
              <li className="step" key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-text">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-section measure-section" aria-labelledby="measure-title">
        <div className="layout-container">
          <div className="section-head">
            <p className="section-label">What gets measured</p>
            <h2 id="measure-title" className="home-section-title">
              Real angles, in degrees.
            </h2>
            <p className="home-section-description">
              The metrics a coach would check by eye, measured from pose landmarks and
              scored against screening bands you can read on every card.
            </p>
          </div>
          <div className="measure-grid">
            {metrics.map((metric) => (
              <article className="measure-tile" key={metric.title}>
                <div className="measure-tile-head">
                  <span className="measure-tile-icon">{metric.icon}</span>
                  <span className="measure-tile-view">{metric.view} view</span>
                </div>
                <h3 className="measure-tile-title">{metric.title}</h3>
                <p className="measure-tile-text">{metric.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section honest-section" aria-labelledby="honest-title">
        <div className="layout-container honest-inner">
          <div className="section-head honest-head">
            <p className="section-label">Built to be trusted</p>
            <h2 id="honest-title" className="home-section-title">
              Screening, not diagnosis.
            </h2>
            <p className="home-section-description">
              A phone camera cannot measure depth, force, or the foot arch, so MoveSafe
              does not pretend to. It reports fewer numbers and tells you how sure it is
              about each one.
            </p>
            <Link to="/disclaimer" className="honest-link">
              Read the full disclaimer
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="honest-list">
            <li className="honest-item">
              {icons.check}
              <span>Only metrics valid for each camera angle are reported — nothing is estimated out of plane.</span>
            </li>
            <li className="honest-item">
              {icons.check}
              <span>A video filmed from a corner is detected, and the measurements it would fake are left out rather than guessed.</span>
            </li>
            <li className="honest-item">
              {icons.check}
              <span>Every report says exactly how it was measured. It is educational screening, never medical advice.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="home-section features-section" aria-labelledby="features-title">
        <div className="layout-container">
          <div className="section-head">
            <p className="section-label">Explore</p>
            <h2 id="features-title" className="home-section-title">
              Everything in one place.
            </h2>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                buttonText="Open"
                buttonLink={feature.link}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section" aria-labelledby="cta-title">
        <div className="layout-container">
          <div className="cta-container">
            <h2 id="cta-title" className="cta-title">
              Start your first screening.
            </h2>
            <p className="cta-description">
              Free, and no account needed to try. Sign in to keep your reports across
              devices and compare sessions over time.
            </p>
            <div className="cta-actions">
              <Link to="/analyze" className="cta-primary-button">
                Start analysis
              </Link>
              <Link to="/signup" className="cta-secondary-button">
                Create an account
              </Link>
            </div>
            <p className="cta-note">Educational movement screening. Not medical advice.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
