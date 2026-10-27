import { Link, Outlet } from 'react-router-dom';
import Header from '../components/Header';
import { FULL_EDUCATIONAL_DISCLAIMER } from '../constants/disclaimers';
import '../styles/layout.css';

function MainLayout() {
  return (
    <div className="app-shell">
      {/* Visually hidden until keyboard focus; first tab stop on every page. */}
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header />

      {/* tabIndex={-1} lets RouteFocusManager move focus here after navigation. */}
      <main id="main-content" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="layout-container">
          <div className="footer-inner">
            <div>
              <Link to="/" className="footer-brand" aria-label="MoveSafe AI home">
                <img src="/favicon.svg" alt="" className="footer-brand-mark" aria-hidden="true" />
                MoveSafe AI
              </Link>
              <p className="footer-disclaimer">{FULL_EDUCATIONAL_DISCLAIMER}</p>
            </div>
            <nav className="footer-column" aria-label="Product">
              <p className="footer-heading">Product</p>
              <div className="footer-nav">
                <Link to="/analyze">Analyze</Link>
                <Link to="/learn">Learn</Link>
                <Link to="/reports">Reports</Link>
                <Link to="/dashboard">Dashboard</Link>
              </div>
            </nav>
            <nav className="footer-column" aria-label="Legal information">
              <p className="footer-heading">Legal</p>
              <div className="footer-nav">
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms">Terms of Use</Link>
                <Link to="/disclaimer">Disclaimer</Link>
              </div>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} MoveSafe AI</span>
            <span>Educational movement screening. Not medical advice.</span>
          </div>
        </div>
      </footer>

      {/* Reserved for route-level or global announcements; individual pages
          keep their own local live regions for page actions. */}
      <div id="app-announcements" className="visually-hidden" aria-live="polite" aria-atomic="true" />
    </div>
  );
}

export default MainLayout;
