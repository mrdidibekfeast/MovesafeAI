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
        <div className="layout-container footer-inner">
          <p className="footer-disclaimer">{FULL_EDUCATIONAL_DISCLAIMER}</p>
          <nav className="footer-nav" aria-label="Legal information">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms of Use</Link>
            <Link to="/disclaimer">Disclaimer</Link>
          </nav>
        </div>
      </footer>

      {/* Reserved for route-level or global announcements; individual pages
          keep their own local live regions for page actions. */}
      <div id="app-announcements" className="visually-hidden" aria-live="polite" aria-atomic="true" />
    </div>
  );
}

export default MainLayout;
