# MoveSafe AI

Educational movement screening from two phone videos. Film a squat, jump,
landing, run, or walk from the **front** and from the **side**; MoveSafe
measures joint angles with pose detection that runs in your browser and
returns a report with a score and a confidence level on every metric.

Live: **https://movesafeai.app**

> **Not medical advice.** MoveSafe AI is automated educational screening. It
> does not diagnose injuries, measure health, or replace evaluation by a
> qualified professional. A single phone camera cannot measure depth, force,
> or the foot arch, and the app does not pretend to.

## What it does

1. **Two videos in.** The Analyze page requires a front-view clip and a
   side-view clip of the same movement (MP4/WebM/MOV, up to 50 MB each; the
   first 12 seconds are analyzed).
2. **Pose detection on the device.** MediaPipe Pose Landmarker tracks 33 body
   landmarks at 10 fps, entirely in the browser. The videos are never uploaded
   or stored anywhere — only file name, type, and size are kept with the
   report.
3. **Real angles out.** Each camera angle measures only what lies in its
   plane:

   | View | Metrics |
   |---|---|
   | Front | Knee valgus (from both shins together), lateral trunk control, pelvic tilt / pelvic drop, per-leg stance valgus (gait) |
   | Side | Squat depth / knee bend range, forward trunk lean, knee bend at landing contact, landing absorption, cadence, knee bend in stance |

   Every metric carries a confidence (high / medium / low) derived from how
   clearly the joints were seen. Frames in which a segment is foreshortened
   are skipped, a "front" video filmed from a corner is detected and the
   measurements it would fake are left out, and a video in the wrong slot is
   rejected with a clear message.
4. **A report you can keep.** Overall score, per-metric cards with the
   measured value, observations, practice suggestions (each linked to a
   YouTube search so people compare several demonstrations), your own notes,
   and PDF export. Signed-in users' reports are saved to their account; guests
   keep reports in that browser only.
5. **Dashboard and Learn.** Score history, local plain-language feedback,
   optional Gemini-generated feedback (server-side, rate-limited, capped), and
   an education section whose exercise cards link out to searches rather than
   teaching from one illustration.

## Technology

- React 19, TypeScript, Vite, React Router 7, plain CSS with design tokens
  (`src/styles/global.css`)
- `@mediapipe/tasks-vision` — Pose Landmarker (WASM + model fetched from CDN
  on first use, cached by the browser)
- Supabase — Auth, Postgres (`reports` table under Row Level Security), one
  Edge Function (`generate-ai-feedback`, Deno)
- Gemini API — called only from the Edge Function with a server-side secret
- jsPDF + html2canvas — PDF export
- Vercel — hosting; `vercel.json` rewrites every path to `index.html`

## Project structure

```
src/
  pages/        Route components (thin)
  components/   Presentational components
  layouts/      MainLayout (header, <Outlet>, footer)
  services/     Business logic:
                  poseDetection.ts    MediaPipe loader + per-frame landmark extraction
                  biomechanics.ts     pure angle maths, view/yaw classification, gait, scoring
                  movementAnalysis.ts per-movement metric sets, confidence, narrative
                  reportStorage.ts    hybrid storage (DB for signed-in, localStorage for guests)
                  geminiFeedback.ts   client for the Edge Function
                  reportPdf.ts, dashboardStats.ts, dashboardFeedback.ts, supabase.ts
  utils/        Pure helpers (display labels, score utils, search links, validation)
  types/        report.ts, pose.ts
  context/      AuthContext
  hooks/        useAuth, useDocumentTitle
  constants/    disclaimers.ts
  styles/       One stylesheet per page/feature
supabase/
  config.toml
  migrations/   reports table + RLS; engine/side-video columns; AI feedback daily cap
  functions/generate-ai-feedback/   index.ts (Deno) + validation.ts (pure, unit-testable)
docs/archive/   Student-submission documents, kept for history
```

## How the analysis works, briefly

`poseDetection.ts` decodes each video into a canvas frame by frame and runs the
landmarker, returning landmarks in source-pixel coordinates. `biomechanics.ts`
turns landmarks into angles: knee flexion, the frontal shank angle used for
valgus, trunk and pelvis angles, view classification from shoulder width, a
camera-yaw estimate from how the trunk foreshortens when it pitches, ground
contacts for cadence, and landing detection. `movementAnalysis.ts` chooses the
metrics valid for the movement and the view, uses the 95th percentile rather
than the maximum so one bad frame never defines a metric, scores against
screening bands (good ≥ 80, review 65–79, attention < 65), and writes the
narrative.

What it deliberately does **not** do: estimate anything out of plane, report
millimetres, measure the foot arch, or report left/right valgus asymmetry from
a bilateral movement (on test footage that number was dominated by camera
angle, not the knees).

Scoring bands are literature defaults and have not yet been calibrated on
athletes filmed for this app. The measured values are shown on every card so
that calibration can be done by looking at real reports.

## Local setup

Prerequisites: Node.js LTS, npm, a Supabase project.

```bash
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
npm run dev              # http://localhost:5173
```

`.env` needs exactly two values, both safe to ship in the browser bundle:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

There is no `VITE_GEMINI_API_KEY` and none should ever be added.

Other commands:

```bash
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npx tsc -b         # type-check only
```

> Developing inside a OneDrive folder? See the traps section of
> [HANDOFF.md](HANDOFF.md) (`supabase link` fails there; use `--workdir`).

## Supabase setup

```bash
npx supabase login
npx supabase db push --project-ref YOUR_PROJECT_REF          # applies supabase/migrations
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY   # server-side only
npx supabase functions deploy generate-ai-feedback            # never with --no-verify-jwt
```

Optional secrets for the function:

| Secret | Default | Purpose |
|---|---|---|
| `GEMINI_MODEL` | unset | Model to try first, ahead of the built-in fallback list |
| `ALLOWED_ORIGINS` | unset | Extra comma-separated origins allowed by CORS (production origins are built in) |
| `AI_FEEDBACK_DAILY_CAP` | `300` | Global daily ceiling on feedback generations across all users |

Dashboard settings that matter: Authentication → URL configuration should
include `http://localhost:5173/reset-password`; email confirmation is a
product decision (currently off; custom SMTP is the proper fix for sign-up
email at scale).

## Gemini feedback: limits and cost

The Edge Function:

- requires a verified Supabase session (anonymous calls get 401);
- answers only to an explicit origin allow-list (no `*`);
- throttles each user to 10 generations per 10 minutes;
- enforces a **global daily cap** (default 300 generations/day) through an
  atomic Postgres counter, so the bill has a hard maximum regardless of how
  many accounts are created; if the cap check itself fails, it fails closed;
- bounds every request (≤ 50 KB body, ≤ 5 reports × 5 metrics, ≤ 3,072 output
  tokens) and sends no identity, file names, or raw report text;
- tries `gemini-3.5-flash-lite` first and falls back through
  `gemini-3.5-flash` and `gemini-flash-lite-latest` when a model is overloaded,
  rate-limited, or retired.

At current flash-lite pricing one generation costs well under one cent, so
the default cap is under about $3 per day at worst.

## Security and privacy

- Row Level Security on `reports`: owners only, with `with check` on insert and
  update. Verified live: anonymous inserts fail with `42501`.
- Videos never leave the browser; preview URLs are revoked.
- The Gemini key exists only as a Supabase secret and in the gitignored
  `supabase/functions/.env`; the client bundle is swept for secrets after
  every build.

Details, probes, and the production checklist: [SECURITY.md](SECURITY.md).

## Testing

- `npx tsc -b` and `npm run lint` on every change.
- The engine's pure maths is unit-tested with synthetic skeletons (67 cases)
  and was validated in-browser on CC-licensed Wikimedia Commons squat clips;
  the runner currently lives outside the repo and should be moved into vitest
  (see HANDOFF.md).
- Services are exercised in the dev browser console with
  `await import('/src/services/<file>.ts')`.

## Deployment

Pushing to `main` deploys to movesafeai.app through Vercel. Database changes
go out with `supabase db push`; function changes with
`supabase functions deploy` — neither happens automatically.

## Documentation

- [HANDOFF.md](HANDOFF.md) — engineering handoff: architecture, traps,
  deploy steps, priorities, non-negotiables
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — current state and known gaps
- [SECURITY.md](SECURITY.md) — security notes and checklist
- [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) — code-level architecture
- [docs/archive/](docs/archive/) — student-submission documents (historical)

## License

Provided for educational and portfolio use. Add a formal license before
public redistribution or reuse.
