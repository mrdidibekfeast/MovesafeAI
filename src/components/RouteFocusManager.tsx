import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/*
 * After client-side navigation, scrolls back to the top (matching normal
 * browser page-load behavior) and moves focus to the main content region so
 * keyboard and screen-reader users land at the start of the new page.
 *
 * The very first render is skipped — on a fresh page load the browser's
 * default focus behavior is already correct. Focus is moved, never trapped.
 */
function RouteFocusManager() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

export default RouteFocusManager;
