import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import heroImage from '../assets/hero-athlete.webp';
import '../styles/home.css';

function HomePage() {
  useDocumentTitle('Home');
  return (
    <div className="home-page">
      <section className="home-section hero" aria-labelledby="hero-title">
        <div className="layout-container hero-inner">
          <div className="hero-content">
            <p className="hero-badge">Real pose tracking, in your browser</p>
            <h1 id="hero-title" className="hero-title">
              See the landing{' '}
              <span className="hero-title-accent">your coach missed.</span>
            </h1>
            <p className="hero-description">
              Film a landing or a squat on your phone. MoveSafe tracks your hips, knees
              and ankles on every frame and shows you the exact moment your knee caves
              in. Your video never leaves your device.
            </p>
            <div className="hero-actions">
              <Link to="/analyze" className="hero-primary-button">
                Analyze a video
              </Link>
            </div>
            <ul className="hero-meta">
              <li className="hero-meta-item">No account needed to try</li>
              <li className="hero-meta-item">Your video stays on your device</li>
              <li className="hero-meta-item">Educational, not a medical assessment</li>
            </ul>
          </div>
          <div className="hero-image">
            <img
              src={heroImage}
              alt="Illustration of a running athlete with the tracked joints highlighted"
              className="hero-image-photo"
            />
          </div>
        </div>
      </section>

      <section className="home-section about-section" aria-labelledby="how-title">
        <div className="layout-container">
          <div className="about-content">
            <p className="section-label">How it works</p>
            <h2 id="how-title" className="home-section-title">
              Five seconds of video, measured frame by frame
            </h2>
          </div>

          <ol className="about-grid">
            <li className="about-card">
              <h3 className="about-card-title">1. Film from head to toe</h3>
              <p className="about-card-description">
                Front view for knee alignment, side view for how deep you bend. Good
                light, phone steady, one movement.
              </p>
            </li>
            <li className="about-card">
              <h3 className="about-card-title">2. Every frame gets tracked</h3>
              <p className="about-card-description">
                A pose model runs right in your browser and finds 33 points on your
                body in each frame, including both hips, knees and ankles.
              </p>
            </li>
            <li className="about-card">
              <h3 className="about-card-title">3. See the moment that matters</h3>
              <p className="about-card-description">
                You get the measured angles, left and right side by side, and the frame
                where the worst moment happened, with the joint marked.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="home-section cta-section" aria-labelledby="cta-title">
        <div className="layout-container">
          <div className="cta-container">
            <p className="section-label cta-label">Try it</p>
            <h2 id="cta-title" className="cta-title">
              Film one landing and see what it shows
            </h2>
            <p className="cta-description">
              The numbers are 2D estimates from one camera angle, for learning how you
              move. If something hurts, see a qualified professional.
            </p>
            <div className="cta-actions">
              <Link to="/analyze" className="cta-primary-button">
                Analyze a video
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
