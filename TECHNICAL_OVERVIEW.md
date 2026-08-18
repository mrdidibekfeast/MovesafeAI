# MoveSafe AI — Technical Overview

A deeper explanation of the implementation for mentors, evaluators, and
developers. Written against the actual code — file names refer to real
project files.

## Route Structure

All routes are declared in `src/App.tsx` inside a single `MainLayout`
(header, skip link, `<main id="main-content">`, footer). A
`RouteFocusManager` inside the router scrolls to top and moves focus to the
main region on navigation.

| Route | Page | Access |
|---|---|---|
| `/` | HomePage | public |
| `/analyze` | AnalyzePage | public (guests can analyze) |
| `/report/:reportId` | ReportDetailPage | public route, ownership-checked in-page |
| `/learn` | LearnPage | public |
| `/login`, `/signin` | LoginPage | public (redirects signed-in users) |
| `/signup`, `/sign-up` | SignupPage | public (redirects signed-in users) |
| `/forgot-password`, `/reset-password` | password pages | public |
| `/dashboard`, `/reports`, `/compare` | protected group | `ProtectedRoute` |
| `/privacy`, `/terms`, `/disclaimer` | legal pages | public |
| `*` | NotFoundPage | public |

## Authentication Flow

`src/context/AuthContext.tsx` creates the Supabase session state:
`getSession()` on mount plus an `onAuthStateChange` listener. It exposes
`user`, `session`, `loading`, `isAuthenticated`, and the auth actions
(`signIn`, `signUp`, `signOut`, `requestPasswordReset`, `updatePassword`).
The context object lives in `auth-context.ts` (split for Fast Refresh);
components consume it through `hooks/useAuth.ts`.

Signup stores an optional `full_name` in user metadata. An empty
`identities` array on signup is treated as "account may already exist"
(anti-enumeration). Password reset uses `resetPasswordForEmail` with a
`redirectTo` of `{origin}/reset-password`.

## Protected Routes

`src/components/ProtectedRoute.tsx` renders a loading state until the
session resolves (no private-content flash), then either an `<Outlet />` or
a `<Navigate to="/login" state={{ from: location }} />`. After login,
`LoginPage` returns the user to `state.from` — but only if it is a safe
internal path (must start with `/`, must not start with `//`, must not be
an auth page); anything else falls back to `/dashboard`.

## Report Model

`src/types/report.ts` — `MovementReport`:

- `id` (UUID), `userId` (string, or `null` for guest reports), `createdAt` (ISO)
- `movementType` (`squat | jump | landing | running | walking | custom`)
  plus `customMovementName?` for custom
- `fileName`, `fileType`, `fileSize?` — metadata only, never file contents
- `status` (`processing | completed | failed`), `overallScore` (0–100)
- `summary`, `metrics[]` (`id`, `label`, `score`, `status`, `description`),
  `observations[]`, `recommendations[]`

## Simulated Analysis Service

`src/services/movementAnalysis.ts` generates reports deterministically: a
mulberry32 PRNG seeded from `fileName|movement|timestamp` produces metric
scores in the 55–95 range for movement-specific metric sets; the overall
score is the rounded metric average. A keyword check on the user's notes
(pain/hurt/injur/dizz/numb) adds a "consider seeking qualified guidance"
recommendation. No computer vision, no MediaPipe, no landmark processing.

## localStorage Service

`src/services/reportStorage.ts` is the only file that touches
localStorage. Storage key `movesafe_reports`, versioned format
`{ version: 1, reports: [...] }` with two safety behaviors:

- **Legacy support:** a bare array (the pre-versioning format) still loads.
- **Corruption tolerance:** entries failing a minimal structural check are
  skipped individually; unreadable JSON or an unknown version yields an
  empty list without deleting the stored data.

Writes return `false` on quota/privacy failures instead of throwing, and
all scores are clamped 0–100 on the way in.

## Report Ownership

Reports carry a `userId`; pages request data via `getReportsByUser(userId)`
or check ownership before rendering a report detail (guest reports with
`userId: null` are viewable only in that browser). This filtering reduces
accidental cross-user display **in the browser only** — localStorage is
client-side and is not a secure multi-user database. Production ownership
must be enforced server-side (database + row-level security).

## Comparison Engine

`src/services/reportComparison.ts` compares an earlier/later pair (ordered
by `createdAt`). Eligibility (in `utils/reportCompare.ts`): exactly two
*completed* reports of the same movement; custom movements match on
normalized names (trim/lowercase/collapse spaces). Metrics are matched by
ID first, then by normalized label; unmatched metrics are listed
separately. A difference within ±1 point counts as unchanged. The engine
produces highlights (largest improvement/decline), stable metrics, and a
plain-language educational interpretation.

## Dashboard Aggregation

`src/services/dashboardSummary.ts`:

- **Summary:** totals, average score, most analyzed movement, latest date
  (completed reports only).
- **Time-range filter:** all / 30 days / 90 days / 6 calendar months, with
  day-granular boundaries (`setHours(0,0,0,0)`); charts only — summary
  cards always use all completed reports.
- **Movement distribution:** normalized movement names → counts →
  percentages, sorted by count then recency; categories beyond the top 5
  group into "Other Movements".
- **Score history:** completed reports sorted by date, capped at the 12
  most recent points.

## SVG Chart Logic

Charts are hand-rolled (no library). `MovementDistributionChart` renders
CSS horizontal bars with ARIA progressbar semantics.
`ScoreHistoryChart` computes SVG coordinates in a responsive `viewBox`
against a fixed 0–100 scale, renders keyboard-focusable points
(selectable to show details), and includes an `sr-only` text summary. All
charts pair color with text labels.

## Local Feedback Algorithm

`src/services/dashboardFeedback.ts` — fully deterministic:

- **Latest report category:** bands at 85 / 70 / 50.
- **Recurring metrics:** labels normalized, a metric must appear in ≥2
  completed reports to qualify; strongest and lowest-average recurring
  metrics are selected with defined tie-breaks.
- **Trend:** the last ≤5 completed reports split into earlier/later halves;
  average difference ≥ +3 is increasing, ≤ −3 decreasing, otherwise stable.
- **Recommendations:** rule-based, deduplicated, capped at 4; a stale-data
  note appears when the newest report is older than 30 days.

This runs entirely in the browser and is the permanent default/fallback —
Gemini never replaces it.

## Gemini Edge Function

`supabase/functions/generate-ai-feedback/` (Deno; `index.ts` handler +
`validation.ts` pure helpers). Flow:

1. Frontend (`src/services/geminiFeedback.ts`) builds a limited context:
   ≤5 recent reports, ≤5 metrics each — no files, IDs, or account data.
2. `supabase.functions.invoke('generate-ai-feedback')` sends it with the
   session token (abort signal + 30s client timeout supported).
3. The function requires a Bearer token and verifies it with
   `supabase.auth.getUser(token)` — a decoded JWT alone is not trusted.
4. Payload size is capped (50 KB, checked via header and after reading).
5. Every field is validated and sanitized: scores must be finite 0–100,
   the trend value must be on an allowlist, text is stripped of control
   characters and markup with length caps, report/metric counts are
   re-enforced server-side, and unknown fields are dropped.
6. The prompt is constructed server-side; submitted names are embedded only
   inside a JSON context block explicitly labeled as untrusted data that
   must never be followed as instructions (prompt-injection precaution).
7. Gemini is called with the `GEMINI_API_KEY` **Supabase secret** (default
   model `gemini-flash-latest` — Google's rolling alias, since fixed model
   names get retired for new keys — with a 20-second `AbortController`
   timeout).
8. The response is parsed defensively (code fences stripped, shape and
   lengths enforced, fallback disclaimer guaranteed).
9. Responses containing disallowed medical phrasing are rejected entirely.
10. The frontend re-validates the returned feedback before it reaches
    React state, and maps error codes to friendly messages (unauthorized,
    invalid-request, rate-limit, timeout, invalid-response,
    service-unavailable, configuration).

Failures never remove the local feedback, cancelled requests are ignored
even if a response arrives late, and stale AI feedback is cleared whenever
the report data changes.

## PDF and Print Flow

**PDF** (`src/services/reportPdf.ts`, using `jspdf` + `html2canvas`): the
report detail page passes its printable container ref to
`exportReportToPdf(element, { fileName })`. The element temporarily gets a
`pdf-exporting` class (white background, no shadows/animations), is
captured by `html2canvas` at 2× scale, and the capture is sliced vertically
onto A4 portrait pages with 12 mm margins, preserving aspect ratio.
Elements marked `data-html2canvas-ignore` / `.pdf-exclude` (buttons,
navigation, transient messages) never appear. `buildReportPdfFileName`
produces `movesafe-{movement-slug}-report-YYYY-MM-DD.pdf` — never user
IDs, emails, upload names, or report IDs. The class is removed in a
`finally` block so the page never sticks in export mode.

**Print:** the Print button calls `window.print()`. `@media print` rules
plus an `@page` A4 rule with 14 mm margins hide `.print-exclude` elements
(header, actions), control page breaks, and keep the disclaimer included.
An effect sets a meaningful `document.title` (movement name, no IDs) so the
browser's default print/PDF file name is useful, and restores it after.

## Error Handling

- `src/components/AppErrorBoundary.tsx` (class component) wraps the entire
  tree in `main.tsx`; unexpected render errors show a safe fallback with
  Reload/Go Home and no error details.
- Expected failures stay in-page: loading/empty/error states on Dashboard,
  Reports, Report Detail, Compare, and Analyze (shared `PageState` and
  `LoadingState` components where a specialized state wasn't already
  established).
- Storage reads never throw; missing reports, invalid compare selections,
  and unknown routes each have dedicated helpful states.

## Accessibility Architecture

- One `<main id="main-content" tabIndex={-1}>` in the layout; a skip link
  is the first tab stop; `RouteFocusManager` moves focus there on route
  changes; `useDocumentTitle` gives every page a distinct title.
- Header nav uses `NavLink` (automatic `aria-current="page"`); the mobile
  menu button has `aria-expanded`/`aria-controls`, closes on link click,
  route change, and Escape (focus returns to the button).
- Forms: visible labels, `aria-invalid`, `aria-describedby` to stable error
  IDs, `role="alert"` for errors, and focus moved to the first invalid
  field on submit.
- Live feedback: `role="status"` + `aria-live="polite"` for loading and
  success, `role="alert"` for errors; a hidden `#app-announcements` region
  exists for global announcements.
- Charts and score displays pair every color with text; `sr-only`
  summaries describe chart content; a global `prefers-reduced-motion` rule
  disables animation and transitions.
- The delete flow uses an accessible `ConfirmDialog`
  (`role="dialog"`, `aria-modal`, labeled title, focus trap + restore,
  Escape to close).
