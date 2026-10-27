# MoveSafe AI — Project Status

_Updated 2026-10-27. Live at https://movesafeai.app (Vercel, deploys from `main`)._

## Where things stand

MoveSafe AI is an educational movement-screening web app. A user films a
movement (squat, jump, landing, running, walking, or custom) from the **front**
and from the **side**, uploads both clips, and gets a report with measured joint
angles, a score and confidence per metric, observations, and practice
suggestions. Pose detection (MediaPipe) runs in the browser; videos never leave
the device. It is educational screening — never diagnosis or medical advice.

The simulated analysis generator used during the student-project phase has been
**replaced by a real engine** (`src/services/poseDetection.ts`,
`biomechanics.ts`, `movementAnalysis.ts`). Reports created before that keep a
"Simulated Educational Analysis" badge; new ones say "Automated Movement
Screening".

## Shipped and verified

- **Real analysis engine** — front + side video required; per-view metrics;
  foreshortening and camera-yaw guards; 67 synthetic unit cases; validated on
  CC-licensed real squat footage in-browser. Reports built from any wrong-angle
  video are flagged, and measurements that camera angle would fake are omitted.
- **Accounts and storage** — Supabase Auth; signed-in reports saved to the
  `reports` table under Row Level Security (owner-only policies); guests keep
  reports in this browser only. Videos are never stored anywhere.
- **Gemini feedback** (Dashboard, optional) — `generate-ai-feedback` Edge
  Function: JWT required, CORS allow-list, per-user throttle (10 / 10 min),
  **global daily cap** (300 generations/day across all users, enforced in
  Postgres), model fallback chain starting at `gemini-3.5-flash-lite`.
- **Visual refresh** — neutral dark design modelled on 21st.dev; Inter;
  CSS-only report preview on the landing page.
- **Learn page** — exercise cards link to YouTube/Google searches so people
  compare several demonstrations instead of one illustration.
- **Signups** — working (email confirmation currently OFF in the Supabase
  dashboard; custom SMTP is the proper fix before a large rollout).

## Known gaps

1. **Calibration.** Scoring bands are literature defaults, not tuned on this
   pipeline. First 10–20 athletes will say whether thresholds should move.
2. **Oblique front camera** is detected, not corrected. Filming guidance on the
   Analyze page matters.
3. **Left/right valgus asymmetry is not reported** for bilateral movements:
   on test footage it was dominated by camera angle.
4. **Engine unit tests live outside the repo** (a scratch runner); they should
   be wired into vitest.
5. **No error tracking or analytics** in production yet.
6. Custom SMTP (Resend) not yet configured for auth email.

## Where to look

- [HANDOFF.md](HANDOFF.md) — engineering handoff: setup, traps, deploy steps,
  non-negotiables, priorities.
- [SECURITY.md](SECURITY.md) — what was tested against the live project and
  the current protections.
- [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) — code-level architecture.
- [docs/archive/](docs/archive/) — student-submission documents (historical).
