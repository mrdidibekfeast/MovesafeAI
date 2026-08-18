/*
 * Where to send a signed-in user who lands on a public-only page.
 *
 * Shared by PublicOnlyRoute and the Login page so the "return to the page
 * you originally asked for" behaviour is defined in exactly one place.
 */

// Never a valid post-sign-in destination: the auth pages would loop, and
// "/" now redirects signed-in users back to the dashboard (which would
// also loop).
const NON_DESTINATIONS = ['/', '/login', '/signin', '/signup', '/sign-up'];

export const DEFAULT_AUTHENTICATED_PATH = '/dashboard';

/*
 * Reads the `from` location that ProtectedRoute stores in navigation state
 * and returns it only when it is a safe internal path. Anything else —
 * external URLs, protocol-relative paths, auth pages — falls back to the
 * dashboard, so a crafted state object can never cause an open redirect.
 */
export function getSafeRedirectPath(state: unknown): string {
  const from = (state as { from?: { pathname?: unknown; search?: unknown } } | null)?.from;
  const pathname = from?.pathname;

  if (
    typeof pathname === 'string' &&
    pathname.startsWith('/') &&
    !pathname.startsWith('//') &&
    !NON_DESTINATIONS.includes(pathname)
  ) {
    // Keep the query string when it is safe (e.g. filters on a report list).
    const search =
      typeof from?.search === 'string' && from.search.startsWith('?') ? from.search : '';
    return `${pathname}${search}`;
  }

  return DEFAULT_AUTHENTICATED_PATH;
}
