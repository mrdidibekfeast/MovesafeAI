# MoveSafe AI — Project Status

_Last checkpoint: 2026-07-26. The planned roadmap (through Prompt 15.2,
final documentation) is complete. Post-roadmap enhancement: the simulated
analysis generator was rewritten to produce screening-style report content
(user-provided sample format) — see item 17 in the build history._

## What the App Is

MoveSafe AI is an educational movement-screening SPA (student project, built by
following a numbered sequence of build prompts). A user uploads an image or short
video of a movement and receives a **simulated** educational movement-quality
report (overall score, per-metric scores, observations, recommendations). Users can
save history (signed in), search/filter/delete reports, compare two reports with
charts, download/print a report PDF, and view a Dashboard with stats, charts, local
deterministic feedback, and optional Gemini AI feedback. Everything is labeled
simulated/educational; no medical claims anywhere.

## Build History (all completed)

1. **Project setup** — Vite react-ts scaffold, React Router, 8 src folders, all
   placeholder pages + routes (incl. `/signin`, `/sign-up` aliases).
2. **Global styles + MainLayout** — design tokens, layout shell, footer pinned.
3. **Header** — responsive nav, mobile ☰ menu, NavLink active states.
4. **Home page** — hero (real photo `assets/hero-athlete.webp`, extracted from a
   chat paste), About, Feature Navigation (reusable `FeatureCard`), CTA; polished.
5. **Learn page** — 8 sections: hero, Movement Basics (`LearnCard`), Prevention
   Tips (`PreventionCard`), Injury Library (`InjuryCard`), Posture Gallery
   (rebuilt with `learn/LearnImageCard` + SVG annotation overlays, 10 cards),
   Nutrition (`NutritionCard` + disclaimer note), Guided Warm-ups (`WarmupCard`
   + "Before You Begin"), Video Resources (`VideoResourceCard`, external links)
   + "Keep Learning". Polished/consolidated CSS.
6. **Supabase auth setup** — client, AuthContext/useAuth, .env, .gitignore.
7. **Auth pages** — Login (redirect-preserving), Signup (live password checklist,
   terms), sign-out + auth-aware Header, ProtectedRoute (`/dashboard`, `/reports`,
   `/compare`), Forgot/Reset Password, full polish pass (shared auth-forms.css,
   authValidation.ts).
8. **Report model + storage** — `types/report.ts`, `reportStorage.ts`
   (localStorage `movesafe_reports`), `sampleReports.ts` + manual seed helper.
9. **Analyze flow** — full form (movement radio cards, custom name, drag-drop
   upload with validation: jpg/png/webp ≤10MB, mp4/webm/mov ≤50MB, object-URL
   previews with revocation), simulated processing (2.5s, rotating messages) →
   deterministic generator (`movementAnalysis.ts`) → save → completion panel.
10. **Report detail page** — `/report/:reportId`, ownership checks, conic-gradient
    score circle, `ReportMetricCard`, observations/recommendations/details,
    guest callout, disclaimer.
11. **My Reports** — history cards, summary row, search/movement/status filters +
    6 sort options (`reportFilters.ts`), delete with `ConfirmDialog` (focus trap,
    Escape), ownership-checked.
12. **Compare** — selection mode on Reports page (exactly 2 compatible completed
    reports; rules in `reportCompare.ts`), `/compare?first=&second=`,
    earlier/later by date, metric-by-metric comparison (`reportComparison.ts`,
    ±1 unchanged threshold, ID-then-normalized-label metric matching), highlights,
    stable/unmatched sections, local interpretation, Detailed/Chart view toggle,
    CSS/SVG charts (`ScoreComparisonChart`, `MetricComparisonChart`,
    `MetricChangeSummary`), chart-only sorting.
13. **PDF + print** — `reportPdf.ts` (html2canvas + jsPDF A4 multi-page slicing,
    sanitized filenames), Download PDF button (completed reports only),
    `pdf-exclude`/`pdf-exporting` classes, PDF-friendly score block; browser print
    (`window.print()`, `@media print` rules, `print-exclude`, document-title
    effect, print-only footer).
14. **Dashboard** — welcome (safe first name from `full_name` metadata), 4 summary
    cards (`dashboardSummary.ts`), Recent Reports (max 3), Quick Actions,
    Report Trends (time-range filter: all/30d/90d/6 calendar months, day-granular
    boundaries; `MovementDistributionChart` with top-5+Other grouping;
    `ScoreHistoryChart` SVG, fixed 0–100 axis, keyboard-selectable points, max 12
    points), local deterministic feedback (`dashboardFeedback.ts`: latest-report
    bands 85/70/50, recurring metrics ≥2 reports with tie-breaks, ±3 trend over
    ≤5 reports, 1–4 deduped recommendations), optional Gemini feedback
    (`geminiFeedback.ts` + `DashboardAiFeedback`, user-triggered only).
15. **Gemini Edge Function (14.3)** — Gemini calls moved server-side into the
    Supabase Edge Function `supabase/functions/generate-ai-feedback/`
    (`index.ts` handler + `validation.ts` pure helpers). The function verifies
    the caller's Supabase JWT (`auth.getUser(token)`, plus `verify_jwt = true`
    in `supabase/config.toml`), enforces a 50KB body limit, re-validates and
    sanitizes the entire context server-side (≤5 reports, ≤5 metrics each,
    scores 0–100 finite, trend allowlist, text length caps, markup/control-char
    stripping, unknown fields dropped), builds the prompt server-side with an
    untrusted-data instruction, calls Gemini (`gemini-2.5-flash` default,
    `GEMINI_MODEL` overridable, 20s AbortController timeout, key in header via
    the `GEMINI_API_KEY` secret), validates/sanitizes the AI JSON, applies an
    unsafe-medical-phrase rejection list, and returns
    `{success, feedback|error{code,message}}` with CORS headers on every
    response. Frontend `geminiFeedback.ts` now invokes it via
    `supabase.functions.invoke` (signal + 30s timeout), checks for a session
    first, maps server error codes/status to friendly messages, and re-validates
    the returned feedback before it reaches React state.
    `VITE_GEMINI_API_KEY` was removed everywhere; the production bundle was
    grepped to confirm no key, no `VITE_GEMINI` reference, and no direct
    `generativelanguage` endpoint remains.
16. **App-wide polish (15.1)** — `AppErrorBoundary` (class component wrapping
    everything in `main.tsx`; safe fallback with Reload/Go Home, live-tested
    with a forced crash), shared `PageState` + `LoadingState` components
    (`page-state.css`), skip link → `<main id="main-content" tabIndex={-1}>`
    (auth pages' nested `<main>` demoted to `<div>`), `RouteFocusManager`
    (scroll-to-top + focus main on route change), `useDocumentTitle` on every
    page (`Title | MoveSafe AI`; report detail keeps its movement-name print
    title), Header mobile menu closes on Escape (focus returns to button) and
    on route changes with `Open/Close navigation menu` labels, footer now
    carries the full educational disclaimer + Privacy/Terms/Disclaimer nav,
    `#app-announcements` polite live region in the layout, `.sr-only`/
    `.visually-hidden` moved to `global.css`, global `prefers-reduced-motion`
    kill switch, spacing/radius/shadow token aliases in `:root`,
    focus-to-first-invalid-field on Login/Signup/Forgot Password, real
    content for Privacy/Terms/Disclaimer (`legal.css`, narrow readable
    column, shared `constants/disclaimers.ts`), rebuilt Not Found page
    (Go Home + Open Dashboard, never echoes the bad URL), versioned report
    storage (`{version:1, reports}` with legacy-array fallback and per-entry
    corruption tolerance — live-tested), `loading="lazy"` on all Learn card
    images, meta description in `index.html`, and `FINAL_TESTING.md`
    checklist. Verified: tsc/lint/build clean; titles, route focus, skip
    link, Escape handling, storage migration, and no horizontal overflow at
    360/768/1440 all confirmed in the browser.
17. **Screening-format simulated reports (post-roadmap)** — `movementAnalysis.ts`
    rewritten to follow the user's movement-screening sample format, with NO
    layout/CSS/UI/type changes: every movement type now generates 6
    measurement-style metrics with simulated values and units (valgus °,
    arch-height %, ankle shift mm, cadence, overstride cm, pelvic drop °,
    stabilization s, etc.), left/right paired metrics, screening bands in the
    text (valgus: <8° Good, 8–10° Caution, 10°+ Poor — the sample's bands),
    grade vocabulary Good/Caution/Poor mapped onto the existing
    good/attention/warning statuses, per-metric confidence (high/medium), a
    deterministic weaker side + pattern strength per report, cross-measurement
    "main finding" observations, one Unable-to-Measure note, priority-ranked
    recommendations, and a final-user-summary style summary. Metric scores
    are DERIVED from grades (good 80–95 / caution 65–79 / poor 50–64) so
    status chips, 80/65 bands, comparison, dashboard, and AI context all stay
    consistent. Every value is explicitly labeled "Simulated" — the file
    still measures nothing. Verified: 48 generated reports passed structural
    band/grade-consistency assertions in the browser; full guest Analyze →
    report flow tested end-to-end via synthetic upload; tsc + lint clean;
    test localStorage cleaned. Note: side-specific metric labels (e.g.
    "Heel-Recovery Path (Left)") vary by report, so comparison lists them as
    unmatched when the weak side differs between two reports — accepted
    behavior. A real video was NOT analyzed (none provided); this remains
    the simulated engine.
18. **Video-only uploads + notes in report (post-roadmap)** — Analyze page
    now accepts ONLY video (MP4/WebM/MOV ≤50 MB): image types removed from
    validation, `accept` attribute, and all UI text; image preview branch
    deleted; images rejected with "Please upload an MP4, WebM, or MOV video
    file. Images are not supported." The user's optional notes (≤500 chars)
    are now stored on the report (`MovementReport.notes?`, preserved
    verbatim by the generator) and rendered in a new "Notes" section on the
    report detail page between Suggested Next Steps and Analysis Details —
    inside `.report-print-content`, so it appears in the PDF export and
    browser print (break-inside: avoid added; `white-space: pre-wrap` keeps
    the user's line breaks). Notes are NOT sent to Gemini (the AI context
    builder never included them). Old stored reports without notes render
    unchanged. Verified live: PNG rejected, MP4 accepted, notes flowed to
    the rendered report, PDF export succeeded with the section included;
    tsc + lint clean; test localStorage cleaned.
19. **Gemini fix + de-AI'd wording (post-roadmap)** — Diagnosed the
    Dashboard's "could not connect" error: (a) the Edge Function was never
    deployed (hosted 404 → mapped to 'unknown'), and (b) the old default
    model `gemini-2.5-flash` is now GATED for new API keys (Gemini API
    returns 404 "no longer available to new users"). Verified live with the
    real key: `gemini-flash-latest` (rolling alias, resolved to
    gemini-3.6-flash) returns HTTP 200 with valid JSON in our exact shape —
    the key itself is VALID. Function updated: default model
    `gemini-flash-latest`, `maxOutputTokens` 700 → 3072 (current flash
    models burn ~1000 tokens on internal reasoning; 700 truncated replies
    to empty). Dashboard wording de-AI'd per user request: section heading
    "Educational Feedback" (NOTE: now duplicates the local section's
    heading — flagged to user), chip "Optional feature", button "Generate
    Feedback", loading "Reviewing your limited educational report
    summary…", result card "Feedback Overview" / "Generated by Gemini ·
    Optional explanation", all error messages AI-free. The Gemini/Edge
    Function privacy note stays (accurate disclosure). Privacy/Disclaimer
    pages intentionally still disclose AI use.
20. **Edge Function DEPLOYED (post-roadmap)** — user supplied a Supabase
    personal access token via `.env` (`SUPABASE_ACCESS_TOKEN`, gitignored;
    it was initially pasted into `.env.example` and was moved out — never
    committed, no git repo exists). `supabase link` fails in this repo with
    a `FileSystem.makeDirectory AlreadyExists supabase/.temp` error (OneDrive
    sync race with CLI v2.108/2.109); workaround that succeeded: copy
    `supabase/config.toml` + `functions/` to a non-OneDrive temp dir and run
    with explicit `--project-ref zuvrcetdkcphnjcngvym` (link is unnecessary
    then). `secrets set --env-file` (GEMINI_API_KEY) and
    `functions deploy generate-ai-feedback` both succeeded (API-based
    bundling, no Docker). Live verification: OPTIONS → 200; POST no auth →
    gateway 401; POST with anon key → our function's own 401
    `{"success":false,"error":{"code":"unauthorized"...}}`. Future deploys:
    reuse the temp-dir + `--project-ref` workaround.
21. **Gemini feedback CONFIRMED WORKING END-TO-END** — with the user's own
    signed-in session live in the preview browser, "Generate Feedback"
    returned real Gemini output: overview, Recurring Strengths / Areas to
    Review / Suggested Next Steps (9 items total), and the educational
    disclaimer. The whole chain (session → Edge Function auth → validation →
    Gemini `gemini-flash-latest` → response validation → render) is proven.
22. **Credential hygiene pass (post-roadmap)** — final layout:
    - `GEMINI_API_KEY`: ONLY in gitignored `supabase/functions/.env` (local)
      + hosted Supabase project secrets (deployed). Untouched/not rotated.
    - `SUPABASE_ACCESS_TOKEN` (sbp_): REMOVED from root `.env`. Full-project
      sweep (183 files, node_modules excluded) finds zero `sbp_` strings.
    - `.env.example`: all real values replaced with `YOUR_*` placeholders,
      plus explicit "never put these here" notes for the Gemini key,
      service_role/secret keys, and the CLI access token.
    - `.env` (gitignored): only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
      (browser-safe by design).
    - Bundle sweep of `dist/`: no Gemini key, no `sbp_`, no real
      `sb_secret_`/service_role value, no JWT, no `VITE_GEMINI`. The only
      `sb_secret_` hit is supabase-js's own `startsWith()` format-detection
      code, not a credential.
    - **CLI auth caveat:** the Supabase CLI had been picking the token up by
      auto-loading the project `.env`; with it removed the CLI is NOT
      authenticated (a `Supabase CLI:supabase` entry exists in Windows
      Credential Manager but holds no usable token). The USER must run
      `npx supabase login` in a real terminal (non-TTY blocks it) before the
      next `functions deploy`. The already-deployed function is unaffected.
23. **Security audit + CORS allow-list (post-roadmap)** — Audited the live
    project by probing it, not by trusting comments. Findings: NO database
    tables exist (13 likely names all `PGRST205`), NO Storage buckets exist
    (bucket list `[]`; the `200 []` from object-list probes is meaningless —
    a control probe of a nonsense bucket returns the same), only
    `generate-ai-feedback` is deployed, and its auth holds under 6 tests
    (no header / anon-key-as-bearer / forged JWT / malformed header / GET /
    preflight) with defense in depth (gateway 401 AND the function's own
    `auth.getUser()` 401). **RLS is therefore N/A — nothing server-side to
    protect**; the real risk is architectural (localStorage has no security
    boundary; same-browser users can read each other's reports via DevTools).
    **No per-user rate limiting exists** — the `rate-limit` code only relays
    Gemini's own 429. Created `SECURITY.md` (checks completed, 10 dashboard
    items requiring manual inspection, proposed-but-NOT-applied RLS/Storage
    SQL, rate-limit proposal, production checklist). CORS rewritten from
    wildcard to an explicit allow-list: localhost:5173 + 127.0.0.1:5173
    always allowed, production origins from an `ALLOWED_ORIGINS` secret,
    unknown origins get `403 forbidden-origin` before any work, and requests
    with NO Origin header still pass (curl/server-side tests must not
    break). Decision logic lives in `validation.ts` (Deno-free) with 23 new
    unit tests covering subdomain/suffix/scheme/port attacks and the literal
    `*` and `null` origins; the original 70 assertions still pass.
    **NOT DEPLOYED** — the deployed function keeps the wildcard until the
    user runs `npx supabase login` + `functions deploy`. `verify_jwt = true`
    and the `auth.getUser()` check were left untouched. No SQL was run, no
    dashboard settings were changed.

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/` | HomePage | public |
| `/analyze` | AnalyzePage (guests allowed, full flow works) | public |
| `/report/:reportId` | ReportDetailPage (ownership-checked in-page) | public route, guarded content |
| `/learn` | LearnPage | public |
| `/login`, `/signin` | LoginPage | public (redirects authed users) |
| `/signup`, `/sign-up` | SignupPage | public (redirects authed users) |
| `/forgot-password` | ForgotPasswordPage | public |
| `/reset-password` | ResetPasswordPage (recovery session) | public |
| `/dashboard` | DashboardPage | ProtectedRoute |
| `/reports` | ReportsPage | ProtectedRoute |
| `/compare` | ComparePage | ProtectedRoute |
| `/privacy`, `/terms`, `/disclaimer` | placeholders | public |
| `*` | NotFoundPage | public |

## Key Files

**Services** (all logic lives here):
- `reportStorage.ts` — CRUD on localStorage `movesafe_reports`; clamps scores;
  `createReportId()`; `seedSampleReports()` (manual dev only). TEMPORARY storage —
  designed to be swapped for Supabase later.
- `movementAnalysis.ts` — deterministic simulated report generator (mulberry32
  seeded by fileName|movement|timestamp; scores 55–95; overall = metric average;
  notes keyword check adds "seek guidance" recommendation).
- `reportComparison.ts` — `compareMovementReports` (returns null on incompatible),
  `buildComparisonInterpretation`.
- `dashboardSummary.ts` — summary stats, time-range filter, distribution, score
  history, `groupDistributionForChart`, `getRecentCompletedReports`.
- `dashboardFeedback.ts` — deterministic feedback + recommendations engine.
- `geminiFeedback.ts` — `buildAiFeedbackContext` (privacy-limited: ≤5 reports,
  ≤5 metrics each, no IDs/names/files), `generateGeminiFeedback`
  (session check → `supabase.functions.invoke('generate-ai-feedback')` with
  abort signal + 30s timeout), `validateAiFeedback` (frontend re-validation:
  markup/control-char stripping, 3/3/4 clipping, fallback disclaimer),
  `GeminiFeedbackError` codes (unauthorized/invalid-request/rate-limit/timeout/
  invalid-response/service-unavailable/configuration/network/aborted/unknown),
  `geminiErrorMessage`.

**Edge Function** (`supabase/functions/generate-ai-feedback/`):
- `index.ts` — Deno.serve handler: CORS + OPTIONS, POST-only, Bearer-token
  verification via `auth.getUser(token)`, body-size guard, server-side prompt,
  Gemini call with 20s timeout, status mapping (400/401/403→500 configuration,
  429→429 rate-limit, timeout→504, other→502), AI-output validation, unsafe-
  language rejection, generic logging only (never keys/tokens/user data).
- `validation.ts` — pure, Deno-free helpers (unit-tested outside the runtime):
  `sanitizeText`, `sanitizeScore`, `validateAiFeedbackContext`,
  `extractFeedbackJson`, `validateAiFeedback`, `containsUnsafeLanguage`.
- `deno.json` — import map (`@supabase/supabase-js` → npm specifier).
- `supabase/config.toml` — `[functions.generate-ai-feedback]` with
  `verify_jwt = true` (never deploy with `--no-verify-jwt`).
- `reportPdf.ts` — `exportReportToPdf`, `buildReportPdfFileName`.
- `supabase.ts` — single client from env vars.

**Utils:** `authValidation.ts` (email + password rules shared by 4 auth pages),
`reportDisplay.ts` (movementLabel w/ trim+collapse, scoreBand, STATUS_LABELS,
METRIC_STATUS_LABELS, DIRECTION_* maps, formatSignedPoints, date formatters,
normalizeMovementKey), `reportFilters.ts` (search/filter/sort for Reports page),
`reportCompare.ts` (compatibility + pair validation + chart sort), `scoreUtils.ts`
(clampScore etc.), `format.ts` (formatFileSize).

**Auth:** `context/auth-context.ts` (context object + types; separate file for
Fast Refresh), `context/AuthContext.tsx` (provider: getSession + onAuthStateChange;
signIn/signUp/signOut/requestPasswordReset/updatePassword), `hooks/useAuth.ts`.

**Types:** `report.ts` (MovementReport incl. `customMovementName?`), `comparison.ts`,
`dashboard.ts`, `dashboardFeedback.ts`, `aiFeedback.ts`.

## Supabase / Auth / Storage Setup

- **Auth only.** Email/password via `supabase.auth`. Project URL + publishable anon
  key in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); `.env` gitignored;
  `.env.example` documents placeholders.
- signUp stores `full_name` in user metadata; empty-`identities` result is treated
  as "account may already exist" (anti-enumeration).
- Password reset: `resetPasswordForEmail` with `redirectTo` `${origin}/reset-password`.
  **The Supabase dashboard redirect-URL allowlist must include
  `http://localhost:5173/reset-password`** (and the production URL later).
- Email-confirmation behavior depends on the Supabase project setting; Signup
  handles both paths (confirmation screen vs immediate `/dashboard`).
- **No database tables, no RLS policies, no Supabase Storage yet.** Reports are
  localStorage-only. Comments in code note RLS is required when DB arrives.
- **Edge Function `generate-ai-feedback`** exists in the repo but is **NOT yet
  deployed** (requires the user to run `npx supabase login` — see below). The
  Gemini key lives in gitignored `supabase/functions/.env` for local serving and
  must be set as a Supabase secret for production. It is no longer in the
  frontend `.env` and never uses a `VITE_` prefix.

### Edge Function — local development & deployment (user actions)

Local development (requires Docker Desktop, which is NOT installed on this
machine as of this checkpoint):

```
npx supabase start
npx supabase functions serve generate-ai-feedback --env-file supabase/functions/.env
npm run dev   # separately, for the React app
```

Deployment to the hosted project:

```
npx supabase login
npx supabase link --project-ref zuvrcetdkcphnjcngvym
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
npx supabase functions deploy generate-ai-feedback
```

Deploy **without** `--no-verify-jwt` — unauthenticated requests must be
rejected. Never put the real key in docs, screenshots, or git history.

## Design Decisions & Preferences

- Clean sports-health look: off-white bg `#f6f8fb`, primary blue `#1f6feb`,
  14px radius, soft shadows, pill buttons, uppercase section labels.
- Score bands 80/65; metric statuses at 80/65; comparison unchanged ±1; feedback
  latest-report bands 85/70/50; trend ±3 over ≤5 reports; recurring metrics need
  ≥2 reports.
- Earlier=gray / Later=blue consistently in comparison visuals; direction always
  text + arrow, never color-only.
- Educational tone everywhere; every AI/simulated output carries a disclaimer.
- The user supplies content via sequenced prompts and switches models occasionally;
  work proceeds strictly one prompt-step at a time without building ahead.

## Rejected Approaches (do not revisit without reason)

- **Chart/PDF/icon/CSS libraries** — spec repeatedly forbids; everything is
  hand-rolled CSS/SVG; only jspdf + html2canvas were approved additions.
- **Pie chart** for distribution — rejected for accessibility; horizontal bars.
- **Hotlinked stock photos / fabricated Unsplash URLs** — rejected (unverifiable);
  local SVG illustrations used instead; real photos to be supplied by the user
  later for the Posture Gallery (annotation coordinates in LearnPage data will
  need retuning to each photo).
- **window.confirm** for deletion — replaced by accessible `ConfirmDialog`.
- **Whole-card click targets** where they'd nest interactive controls.
- **Auto-running Gemini or persisting AI output** — explicitly out of scope.
- **`npm audit fix --force`** — not run; 2 high-severity transitive advisories are
  known and accepted for now (student project).

## Known Issues / Caveats

1. **The Edge Function has not been executed anywhere yet** — Docker and Deno
   are not installed locally and deployment needs `npx supabase login` (user
   action). All pure validation logic (`validation.ts`) passed 70 Node
   assertions against the tsc-compiled module, and the frontend service was
   live-tested, but the deployed auth path + a real Gemini 200 through the
   function still need one end-to-end run by the user after deploying.
2. **A successful Gemini 200 has still never been observed** (the direct
   browser calls in 14.2 hit 429 twice). The key format (`AQ.…`) may be a
   Vertex-style key; if errors persist after deployment, an AI Studio key
   (`AIza…`) may be required for the `generativelanguage.googleapis.com`
   endpoint. A bad key now surfaces as the friendly "AI feedback is not
   configured correctly." (500/configuration) message.
3. **Signed-in flows were never live-tested by the assistant** (no credentials used
   on principle). All auth-gated pages are type-checked wiring over live-tested
   pure services. The human should periodically walk: signup → login → analyze →
   reports → compare → dashboard → sign out.
4. Stale Vite HMR errors accumulate in the browser console history during editing
   sessions; a hard reload + grep of source confirms they're not real. Pattern
   noted repeatedly; don't chase them without checking timestamps.
5. Dynamic `import('/src/...')` in the dev console caches module instances —
   hard-reload the page before re-testing edited services.
6. 2 npm high-severity advisories in transitive deps (accepted, see above).
7. Privacy, Terms, Disclaimer, and Not Found now have real content (15.1).
   Dashboard/Compare/Reports have no PDF/print support (by spec).
8. Time-range and staleness boundaries snap to **local-time** start of day.

## Current Task

Prompt 15.2 (final documentation) is **complete** — the planned roadmap is
finished. Documentation set: rewritten `README.md` (overview, stack,
features, setup, env vars, Edge Function deployment, architecture + Mermaid
diagram, storage/auth/AI behavior, accessibility, limitations, future work,
disclaimer, license placeholder), updated `.env.example` (YOUR_* placeholders),
`STUDENT_PRESENTATION_OUTLINE.md` (14 slides, 7–10 min, speaking points),
`DEMO_SCRIPT.md` (4–5 min spoken script with Gemini backup line),
`TECHNICAL_OVERVIEW.md` (routes, auth, storage versioning, comparison,
charts, feedback algorithm, Edge Function flow, PDF/print — verified against
code), `PROJECT_SUBMISSION_CHECKLIST.md`, plus the existing
`FINAL_TESTING.md`. Secret sweep clean: real Gemini key exists only in
gitignored `supabase/functions/.env`; docs use YOUR_* placeholders; build,
lint, and dev server verified after the docs pass.

## Remaining User Actions (no build prompts pending)

1. Deploy `generate-ai-feedback` (`login → link → secrets set → deploy`) and
   verify one successful Gemini 200 end-to-end; swap in an AI Studio
   (`AIza…`) key if the `AQ.…` key keeps failing.
2. Walk the `FINAL_TESTING.md` checklist signed in (analyze → reports →
   compare → dashboard → AI feedback → PDF/print).
3. Add real screenshots to the README placeholders; practice
   `DEMO_SCRIPT.md` and the presentation outline.
4. Optional future work (documented in README): Supabase report database +
   RLS, real posture photos for the Learn gallery, real pose analysis.

## Verification Conventions

After every change: `npx tsc -b` && `npm run lint`; then browser-test via the
`movesafe-dev` preview server. Pure services are tested by dynamic-importing
`/src/services/*.ts` in the page console with fabricated data (fixed reference
dates for time logic), asserting exact expected outputs, then cleaning
`localStorage.removeItem('movesafe_reports')`.
