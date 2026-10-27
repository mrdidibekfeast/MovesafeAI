# MoveSafe AI — Technical Overview

Code-level description of how the app works. File names refer to real
project files. For setup, deploy steps, and traps see [HANDOFF.md](HANDOFF.md).

## Route structure

All routes are declared in `src/App.tsx` inside a single `MainLayout`
(header, skip link, `<main id="main-content">`, footer). `RouteFocusManager`
scrolls to top and moves focus to the main region on navigation.

| Route | Page | Access |
|---|---|---|
| `/` | HomePage (landing) | public; signed-in users are sent to `/dashboard` |
| `/analyze` | AnalyzePage | public (guests can analyze) |
| `/report/:reportId` | ReportDetailPage | public route; ownership checked in-page; signed-out visitors see the overall score only |
| `/learn` | LearnPage | public |
| `/login`, `/signin`, `/signup`, `/sign-up` | auth pages | public (redirect signed-in users) |
| `/forgot-password`, `/reset-password` | password pages | public (`/reset-password` must stay unguarded) |
| `/dashboard`, `/reports` | protected group | `ProtectedRoute` |
| `/privacy`, `/terms`, `/disclaimer` | legal pages | public |
| `*` | NotFoundPage | public |

## Authentication

`src/context/AuthContext.tsx` holds the Supabase session (`getSession()` on
mount plus `onAuthStateChange`) and exposes `user`, `session`, `loading`,
`isAuthenticated`, `signIn`, `signUp`, `signOut`, `requestPasswordReset`,
`updatePassword`. The context object lives in `auth-context.ts` (split for
Fast Refresh); components use `hooks/useAuth.ts`.

`ProtectedRoute` renders a loading state until the session resolves, then an
`<Outlet />` or `<Navigate to="/login" state={{ from }} />`. After login the
user returns to `state.from` only if it is a safe internal path.

## Report model

`src/types/report.ts` — `MovementReport`:

- `id`, `userId` (`null` for guests), `createdAt`
- `movementType` (`squat | jump | landing | running | walking | custom`),
  `customMovementName?`
- `fileName`, `fileType`, `fileSize?` and `sideFileName?`, `sideFileType?`,
  `sideFileSize?` — metadata only, never file contents
- `engine?: 'simulated' | 'pose'` — reports from before the real engine carry
  no value and display as "Simulated Educational Analysis"
- `status`, `overallScore` (0–100, always clamped), `summary`
- `metrics[]` — `id`, `label`, `score`, `status` (`good ≥ 80`, `attention
  65–79`, `warning < 65`), `description`, and for pose-measured metrics
  `value`, `unit`, `confidence` (`high | medium | low`)
- `observations[]`, `recommendations[]`, `notes?`

## The analysis engine

Three services, each with one job.

### `services/poseDetection.ts`

Loads MediaPipe Pose Landmarker once per page (GPU delegate, CPU fallback).
`extractPoseSequence(file)` decodes the video into a canvas, seeking at 10 fps
for up to 12 s, runs `detectForVideo` on each frame, and returns every frame in
which a person was found with 33 landmarks converted to source-pixel
coordinates. Landmarks that fall outside the frame (feet cut off) have their
visibility capped so downstream confidence drops. Timestamps are kept
monotonic across files because the landmarker requires it. Nothing leaves the
browser; the object URL is revoked afterwards.

### `services/biomechanics.ts`

Pure maths over landmarks — no DOM, no MediaPipe, unit-testable with
synthetic points:

- `angleAtVertex`, `kneeFlexion`, `angleFromVertical`, `angleFromHorizontal`
- `frontalShankAngle` — the valgus measure actually reported: tilt of the
  knee→ankle segment from vertical, signed positive when the knee is nearer
  the body's midline than the ankle. Chosen over the classic FPPA because the
  thigh foreshortens to nothing in a deep squat seen from the front.
- `framesWithVisibleSegment` — skips frames in which a segment projects
  shorter than 60–80 % of its clip reference length (pointed at the camera).
- `classifyView` — front vs side from shoulder width ÷ torso length, with a
  confidence.
- `estimateFrontYaw` — camera yaw from how much the trunk appears to lean
  sideways relative to how much it foreshortens when pitched forward
  (`tan λ = tan φ · sin θ`). Null when the clip has no forward pitch.
- Gait: `groundLevelY`, `detectContacts`, `cadenceStepsPerMinute`,
  `stanceFrames`. Landing: `detectLanding` (apex, first contact, extra flexion
  in the following 0.6 s).
- Scoring: `scoreLowerIsBetter`, `scoreHigherIsBetter`, `scoreInRange`,
  `statusFromScore` map onto the app's fixed bands.

### `services/movementAnalysis.ts`

`generateMovementAnalysis({ movementType, front, side, notes, userId })`:

1. Rejects unusable footage (`no-person-*`, `too-little-*`) and confidently
   mis-slotted videos (`front-looks-like-side`, `side-looks-like-front`).
2. Estimates front-camera yaw. At ≥ 20° the sideways trunk and pelvic metrics
   are omitted (camera angle would fake them); at 10–20° their confidence is
   capped at medium.
3. Builds the per-movement metric set (squat, jump/landing, running/walking,
   custom), each metric a 95th-percentile value over usable frames, with a
   confidence from landmark visibility. Knee valgus for bilateral movements
   averages both shins, which cancels camera yaw to first order; left/right
   asymmetry is therefore not reported.
4. Scores, averages into the overall score, and writes observations (frame
   counts, oblique-camera note, low-confidence and omitted-metric counts) and
   recommendations (two priorities, a re-film prompt when warranted, a
   discomfort note if the user's notes mention pain).

Every attempted-but-impossible measurement is counted and disclosed as
"left out rather than estimated".

## Storage

`services/reportStorage.ts` is the only module that touches persistence.

```
Signed-in user  ->  Supabase `reports` table (RLS: owner-only select/insert/update/delete)
Guest           ->  localStorage key `movesafe_reports` (versioned, corruption-tolerant)
```

All functions are async. On a signed-in user's first load, local reports of
theirs are upserted to the database and the local copies removed only after
the server confirms. `rowToReport` / `reportToRow` map the snake_case columns,
including `engine` and the side-video metadata.

Migrations: `20260905000000_create_reports.sql` (table, index, RLS policies
with `with check` and `(select auth.uid())`),
`20261026000000_add_engine_and_side_video.sql`,
`20261027000000_ai_feedback_daily_cap.sql` (usage table + `SECURITY DEFINER`
quota function, executable by `authenticated` only).

## Gemini feedback (Edge Function)

`supabase/functions/generate-ai-feedback/index.ts` (Deno) with pure helpers in
`validation.ts`. Request path:

1. CORS allow-list (`resolveCorsDecision`) — production origins built in,
   extra ones via `ALLOWED_ORIGINS`; never `*`.
2. `verify_jwt` at the gateway **and** `auth.getUser()` inside the function.
3. Per-user throttle: 10 requests / 10 min, in-isolate, keyed on the verified
   user id.
4. Global daily cap: `supabase.rpc('consume_ai_feedback_quota', { p_limit })`
   claims one unit atomically (`INSERT … ON CONFLICT DO UPDATE … WHERE count <
   limit`); default 300/day via `AI_FEEDBACK_DAILY_CAP`; fails closed.
5. Context validation and sanitisation (size, counts, string lengths; no
   identity, file names, or raw report text).
6. Model fallback: `GEMINI_MODEL` (if set) → `gemini-3.5-flash-lite` →
   `gemini-3.5-flash` → `gemini-flash-lite-latest`; moves on after 503/429/404,
   network errors, or an empty answer; stops on timeout or auth/config errors.
7. Output validated for shape and unsafe language before it is returned.

The client (`services/geminiFeedback.ts`) maps the function's error codes
(`rate-limit`, `daily-cap`, `timeout`, …) to plain-language messages.

## Frontend conventions

- Pages call services; services are pure or side-effect-isolated.
- Scores clamp 0–100 via `utils/scoreUtils.ts`.
- Accessibility: real controls, visible labels, `role="alert"` for errors,
  `role="status"` + `aria-live` for progress, ARIA progressbars, focus-visible
  rings, reduced-motion respected.
- Design tokens in `styles/global.css`: neutral near-black canvas, Inter, one
  vivid blue, hairline borders, 10 px-radius buttons; no gradient text, glows,
  or emoji icons.
- Outbound exercise links go through `utils/searchLinks.ts` (YouTube/Google
  searches), by design, instead of single hand-picked videos.
