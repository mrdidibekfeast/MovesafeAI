import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import '../styles/header.css';

const withActive =
  (base: string) =>
  ({ isActive }: { isActive: boolean }) =>
    isActive ? `${base} active` : base;

// Safe greeting name: first name, then email, then a neutral fallback.
// Never surfaces IDs, tokens, or full auth metadata.
function getGreetingName(user: User | null): string {
  const meta = user?.user_metadata as { full_name?: unknown } | undefined;
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (fullName) {
    return fullName.split(/\s+/)[0];
  }
  if (user?.email) {
    return user.email;
  }
  return 'My Account';
}

function Header() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Close the mobile menu and clear any transient error whenever the
  // authentication status changes (sign in or sign out).
  useEffect(() => {
    setIsMenuOpen(false);
    setSignOutError(null);
  }, [isAuthenticated]);

  // Close the mobile menu on every route change — covers browser
  // back/forward navigation, not just clicks on the menu's own links.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Escape closes the open mobile menu and returns focus to the menu
  // button, so keyboard users are never left focused inside hidden content.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setSignOutError(null);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError(null);

    const { error } = await signOut();

    if (error) {
      setSignOutError('We could not sign you out. Please try again.');
      setIsSigningOut(false);
      return;
    }

    setIsSigningOut(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  // The brand points at whichever page is "home" for this visitor. For a
  // signed-in user that is the dashboard — linking to "/" would only bounce
  // through PublicOnlyRoute and land there anyway.
  const brand = (
    <Link
      to={isAuthenticated ? '/dashboard' : '/'}
      className="header-brand"
      onClick={closeMenu}
    >
      <span className="header-brand-name">MoveSafe AI</span>
      <span className="header-brand-tagline">Movement insights</span>
    </Link>
  );

  // While the session is being resolved, show a subtle skeleton instead of
  // flashing the wrong (guest vs authenticated) navigation.
  if (loading) {
    return (
      <header className="header">
        <div className="layout-container header-inner">
          {brand}
          <span className="header-loading" role="status" aria-live="polite">
            Loading…
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div
        className={
          isMenuOpen ? 'layout-container header-inner menu-open' : 'layout-container header-inner'
        }
      >
        {brand}

        <button
          ref={menuButtonRef}
          type="button"
          className="header-menu-button"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="header-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        {/* One nav element drives both desktop and mobile — the mobile menu
            only changes its layout in CSS, so the auth logic cannot diverge. */}
        <nav id="header-navigation" className="header-nav" aria-label="Main navigation">
          {/* Home is the signed-out landing page only; signed-in users get
              the dashboard as their main page instead. */}
          {!isAuthenticated && (
            <NavLink to="/" end className={withActive('header-link')} onClick={closeMenu}>
              Home
            </NavLink>
          )}
          <NavLink to="/analyze" className={withActive('header-link')} onClick={closeMenu}>
            Analyze Movement
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/reports" className={withActive('header-link')} onClick={closeMenu}>
              Reports
            </NavLink>
          )}
          <NavLink to="/learn" className={withActive('header-link')} onClick={closeMenu}>
            Learn
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" className={withActive('header-link')} onClick={closeMenu}>
              Dashboard
            </NavLink>
          )}
        </nav>

        {isAuthenticated ? (
          <div className="header-actions header-auth-actions">
            <span className="header-user">
              <span className="header-user-name">Hi, {getGreetingName(user)}</span>
            </span>
            <button
              type="button"
              className="header-signout-button"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing Out…' : 'Sign Out'}
            </button>
          </div>
        ) : (
          <div className="header-actions">
            <NavLink to="/login" className={withActive('header-login-link')} onClick={closeMenu}>
              Login
            </NavLink>
            <NavLink to="/signup" className={withActive('header-signup-link')} onClick={closeMenu}>
              Sign Up
            </NavLink>
            <Link to="/analyze" className="header-start-button" onClick={closeMenu}>
              Start Analysis
            </Link>
          </div>
        )}
      </div>

      {signOutError && (
        <div className="header-auth-error" role="alert" aria-live="polite">
          {signOutError}
        </div>
      )}
    </header>
  );
}

export default Header;
