# MoveSafe AI — Project Instructions

> **Before continuing any work, read `HANDOFF.md`** (setup, traps, deploy steps,
> non-negotiables) and `PROJECT_STATUS.md` (current state and known gaps).
> Other docs: `README.md`, `TECHNICAL_OVERVIEW.md`, `SECURITY.md`. The
> student-submission documents live in `docs/archive/` and are historical only.
> The site is live at https://movesafeai.app and deploys from `main` via Vercel.

## Purpose

MoveSafe AI is an educational movement-screening web app. Users upload a **front**
video and a **side** video of a movement (squat, jump, landing, running, walking, or
custom); MediaPipe pose detection runs in the browser and the app measures real
joint angles (knee valgus / FPPA, knee flexion, trunk lean, pelvic tilt, cadence,
landing absorption) with a confidence per metric. Everything is explicitly
educational screening — never medical advice, diagnosis, or treatment.

## Technology Stack

- React 19 + TypeScript 6 + Vite 8 (dev server: port 5173)
- React Router DOM 7 (`BrowserRouter`, declarative routes in `src/App.tsx`)
- Plain CSS files (one per page/feature in `src/styles/`) — **no CSS frameworks**
- Supabase (`@supabase/supabase-js`) — Auth, Postgres `reports` table under RLS,
  `ai_feedback_usage` quota table, one Edge Function
- `@mediapipe/tasks-vision` — Pose Landmarker, runs in the browser (WASM/model from CDN)
- jsPDF + html2canvas — PDF export of report detail page
- Gemini via the `generate-ai-feedback` Supabase Edge Function (optional Dashboard
  feature; key is a server-side Supabase secret, never in the client bundle; per-user
  throttle + global daily cap + model fallback)
- oxlint for linting; `tsc -b` for type checking
- Report storage is **hybrid** via `reportStorage.ts`: signed-in → Supabase `reports`
  table; guest → localStorage (key `movesafe_reports`). Videos are never stored.

## Architecture

```
src/
  pages/        Route components (thin; no business logic, no direct localStorage)
  components/   Reusable presentational components
  layouts/      MainLayout (Header + <Outlet> + footer)
  services/     ALL business logic & side effects (poseDetection, biomechanics,
                movementAnalysis, reportStorage, dashboard stats/feedback, PDF,
                Gemini client, supabase client)
  utils/        Pure helpers (validation, display labels, filters, score utils)
  types/        Shared TypeScript types
  context/      AuthContext (provider) + auth-context (context object, split for HMR)
  hooks/        useAuth, useDocumentTitle
  constants/    disclaimers.ts (shared educational-disclaimer wording)
  styles/       Plain CSS; design tokens in global.css :root
  data/         sampleReports (dev seeding only, never auto-loaded)
supabase/
  config.toml   Supabase CLI config (verify_jwt = true for the AI function)
  functions/generate-ai-feedback/   Deno Edge Function (index.ts + validation.ts);
                secrets in gitignored functions/.env, never in source
```

- Pages call services; services are pure/testable where possible.
- Protected routes (`/dashboard`, `/reports`) wrap in `ProtectedRoute`. (The
  Compare page was removed.)
- Frontend route guards are **not** security — Supabase RLS protects report rows.

## Permanent Rules (do not reverse)

1. **Educational language only.** Never "diagnosis", "injury detected", "recovery",
   "treatment", "medically safe". Keep the visible "Automated Movement Screening"
   badge and disclaimers; reports with no `engine` (pre-pose) keep their
   "Simulated Educational Analysis" badge via `engineLabel()`.
2. **Privacy:** never display/log/send user IDs, emails, tokens, sessions, full
   report IDs, uploaded file contents, or preview URLs. Never store files/Base64 in
   localStorage. Gemini receives only the limited context in `geminiFeedback.ts`.
3. **No new heavy dependencies** — no chart libraries, no CSS frameworks, no axios,
   no icon libraries. Charts are CSS/SVG. Icons are emoji/inline SVG.
4. **All report storage goes through `src/services/reportStorage.ts`** (hybrid DB /
   localStorage, all async). Pages never touch localStorage or Supabase tables directly.
5. **Scores always clamp 0–100** via `clampScore` in `utils/scoreUtils.ts`.
6. Score bands: **80+ Strong / 65–79 Developing / <65 Needs Attention**. Metric
   statuses: good ≥80 / attention 65–79 / warning <65. Comparison "unchanged"
   threshold: **±1**; trend threshold: **±3** over ≤5 recent reports.
7. **Accessibility patterns:** real buttons/inputs, visible labels, `role="alert"`
   for errors, `role="status"` + `aria-live="polite"` for loading/success, ARIA
   progressbars on all score bars, focus-visible rings, never color-only meaning,
   `prefers-reduced-motion` respected.
8. Design tokens live in `src/styles/global.css` `:root`. Visual language (modelled
   on 21st.dev): neutral near-black canvas (#0f0f11), Inter with tight tracking, one
   vivid blue (#3b5bff), hairline white-alpha borders, flat surfaces, 10px-radius
   buttons with a 1px inset top highlight (`--radius-button`, `--button-inset`), pills
   only for small chips, no gradient text, no glows, no emoji icons (inline SVG).
   Hover = border brightens or 1px lift, never a bounce.
9. Auth pages share `auth-forms.css`; shared validation in `utils/authValidation.ts`.
10. **Verification loop after every change:** `npx tsc -b` && `npm run lint`, then
    test in the browser (services are tested by dynamic-importing `/src/...ts`
    modules in the dev browser console). Clean up test data from localStorage.

## Commands

```bash
npm run dev        # Vite dev server (NEVER use Live Server)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npx tsc -b         # type-check only
```

Dev server is launched via the Claude browser pane config `.claude/launch.json`
(name: `movesafe-dev`). Restart the server after `.env` changes.

## Major Decisions (locked)

- Movement analysis is **real 2-D pose analysis** (`poseDetection.ts` →
  `biomechanics.ts` → `movementAnalysis.ts`), requiring both a front and a side
  video. Only metrics valid for a view are reported; nothing is estimated in
  millimetres or out of plane. The `@mediapipe/tasks-vision` dependency is the one
  sanctioned exception to the no-heavy-dependencies rule.
- Guest users may analyze; guest reports use `userId: null` and are viewable only
  in-browser. Signed-in reports require owner match. Guests never appear on
  protected pages (`/reports`, `/dashboard`).
- **Signed-out visitors see the overall score ONLY** on a report page. Metrics,
  observations, recommendations, notes, analysis details, and PDF/print all
  require an account. Implemented as an early return in `ReportDetailPage`
  keyed on `!isAuthenticated`, after the ownership check; the Sign In /
  Create Account links carry `state={{ from: location }}` so the visitor
  returns to the same report and it then renders in full.
- Exercise guidance links **out to searches** (`utils/searchLinks.ts`: YouTube +
  Google) instead of single hand-picked videos, so nothing is taught from one example.
- Gemini is called **only** by the `generate-ai-feedback` Edge Function with the
  `GEMINI_API_KEY` Supabase secret. The key must never appear in any `VITE_`
  variable, the client bundle, source code, or docs. The function requires an
  authenticated Supabase user and is deployed **without** `--no-verify-jwt`.
- Local deterministic Dashboard feedback is the default; Gemini is optional,
  user-triggered only, and must never replace the local feedback.
