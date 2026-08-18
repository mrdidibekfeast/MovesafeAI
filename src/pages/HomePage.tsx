import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import FeatureCard from '../components/FeatureCard';
import heroImage from '../assets/hero-athlete.webp';
import '../styles/home.css';

const features = [
  {
    icon: '🎥',
    title: 'Analyze Movement',
    description:
      'Upload a movement video and generate an educational movement analysis.',
    link: '/analyze',
  },
  {
    icon: '📄',
    title: 'My Reports',
    description: 'Access previously saved reports and download them as PDF.',
    link: '/reports',
  },
  {
    icon: '📚',
    title: 'Learn',
    description:
      'Explore movement education, posture tips, warm-ups, and injury prevention resources.',
    link: '/learn',
  },
  {
    icon: '🧭',
    title: 'Dashboard',
    description:
      'View assessment history, body-area summaries, and personalized insights.',
    link: '/dashboard',
  },
];

function HomePage() {
  useDocumentTitle('Home');
  return (
    <div className="home-page">
      <section className="home-section hero" aria-labelledby="hero-title">
        <div className="layout-container hero-inner">
          <div className="hero-content">
            <p className="hero-badge">Educational Movement Screening</p>
            <h1 id="hero-title" className="hero-title">
              Understand Your Movement.{' '}
              <span className="hero-title-accent">Improve Your Performance.</span>
            </h1>
            <p className="hero-description">
              MoveSafe AI is an educational movement screening platform that helps you
              evaluate full-body movement patterns, understand your biomechanics, and
              identify areas for improvement through easy-to-read reports.
            </p>
            <div className="hero-actions">
              <Link to="/analyze" className="hero-primary-button">
                Start Analysis
              </Link>
              <Link to="/learn" className="hero-secondary-button">
                Learn More
              </Link>
            </div>
            <ul className="hero-meta">
              <li className="hero-meta-item">Simulated educational analysis</li>
              <li className="hero-meta-item">No account needed to try</li>
              <li className="hero-meta-item">Your video stays in your browser</li>
            </ul>
          </div>
          <div className="hero-image">
            <img
              src={heroImage}
              alt="Digital illustration of a running athlete with glowing joints, representing full-body movement analysis"
              className="hero-image-photo"
            />
          </div>
        </div>
      </section>

      <section className="home-section about-section" aria-labelledby="about-title">
        <div className="layout-container">
          <div className="about-content">
            <p className="section-label">About MoveSafe AI</p>
            <h2 id="about-title" className="home-section-title">
              Educational Full-Body Movement Screening
            </h2>
            <p className="home-section-description">
              MoveSafe AI analyzes uploaded full-body movement videos and turns them
              into clear, educational movement reports. Each report highlights your
              strengths and points out the areas where your movement patterns could
              improve.
            </p>
            <p className="home-section-description">
              The goal is to help you better understand your movement quality — not to
              diagnose. MoveSafe AI is intended for learning purposes only and is not a
              medical diagnosis or a substitute for professional evaluation.
            </p>
          </div>

          <div className="about-grid">
            <article className="about-card">
              <span className="about-card-icon" aria-hidden="true">
                🎥
              </span>
              <h3 className="about-card-title">Analyze Movement</h3>
              <p className="about-card-description">
                Upload a movement video and receive an easy-to-read educational
                assessment of your movement patterns.
              </p>
            </article>

            <article className="about-card">
              <span className="about-card-icon" aria-hidden="true">
                📈
              </span>
              <h3 className="about-card-title">Track Progress</h3>
              <p className="about-card-description">
                Sign in to save your reports and compare your progress over time.
              </p>
            </article>

            <article className="about-card">
              <span className="about-card-icon" aria-hidden="true">
                📚
              </span>
              <h3 className="about-card-title">Learn &amp; Improve</h3>
              <p className="about-card-description">
                Explore educational resources, warm-ups, posture tips, and
                injury-prevention content.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section features-section" aria-labelledby="features-title">
        <div className="layout-container">
          <p className="section-label">Explore</p>
          <h2 id="features-title" className="home-section-title">
            Everything You Need in One Place
          </h2>
          <p className="home-section-description">
            Jump straight to any of MoveSafe AI&apos;s main features — movement
            analysis, saved reports, progress comparisons, learning resources, and
            your personal dashboard.
          </p>

          <div className="features-grid">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                buttonText="Explore"
                buttonLink={feature.link}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="home-section cta-section" aria-labelledby="cta-title">
        <div className="layout-container">
          <div className="cta-container">
            <p className="section-label cta-label">Ready to Begin?</p>
            <h2 id="cta-title" className="cta-title">
              Start Understanding Your Movement Today
            </h2>
            <p className="cta-description">
              MoveSafe AI provides educational movement assessments that help you
              understand your movement quality, monitor your progress over time, and
              explore personalized learning resources. The platform is intended for
              educational purposes only.
            </p>
            <div className="cta-actions">
              <Link to="/analyze" className="cta-primary-button">
                Start Analysis
              </Link>
              <Link to="/learn" className="cta-secondary-button">
                Explore Learning Resources
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
