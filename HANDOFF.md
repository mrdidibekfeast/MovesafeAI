# MoveSafe AI — Engineering Handoff

**For:** Caleb
**Repo:** `github.com/mrdidibekfeast/MovesafeAI`
**Live:** https://movesafeai.app
**As of commit:** `fd41c3d`

Read this first. It covers what the project is, how to run it, what is
genuinely broken right now, and the traps that will cost you an hour each if
nobody warns you.

> **Honesty note:** the other docs in this repo (`README.md`,
> `TECHNICAL_OVERVIEW.md`, `SECURITY.md`, etc.) were written earlier and are
> **partly out of date** — see [Stale documentation](#stale-documentation).
> Where they disagree with this file, this file is correct.

---

## 1. What this actually is

An educational movement-screening web app. A user uploads a short video of a
movement (squat, jump, landing, running, walking, or custom) and gets back a
movement-quality report: an overall score, per-metric scores, observations,
and suggestions.

**The analysis is simulated.** There is no computer vision, no pose
estimation, no MediaPipe. `src/services/movementAnalysis.ts` is a
deterministic generator seeded from the file name, movement type, and
timestamp — the same input always produces the same report. This is
intentional and disclosed throughout the UI.

This matters for every product decision: the app must never read as medical
advice, and the "simulated" framing is load-bearing, not decoration.

**The uploaded video is never stored or transmitted.** It lives in browser
memory as an object URL that gets revoked. Only file metadata (name, MIME
type, size) is persisted. Keep it that way unless there is a deliberate
decision to change it, including updating the Privacy page.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router 7 |
| Styling | Plain CSS, one file per page/feature. Design tokens in `src/styles/global.css` |
| Auth | Supabase Auth |
| Database | Supabase Postgres (one table: `reports`) |
| Serverless | One Supabase Edge Function (Deno) |
| AI | Google Gemini, called **only** from the Edge Function |
| Export | `jspdf` + `html2canvas` |
| Hosting | Vercel, auto-deploys on push to `main` |

Deliberately **no** CSS framework, chart library, icon library, or state
manager. Charts are hand-written CSS and SVG. Icons are emoji. Adding heavy
dependencies is a decision to make consciously, not by habit.

---

## 3. Get running

```bash
git clone https://github.com/mrdidibekfeast/MovesafeAI.git
cd MovesafeAI
npm install
cp .env.example .env     # Windows: Copy-Item .env.example .env
```

Fill `.env` with two values (ask Marcus — both are safe to share, they ship
in the browser bundle by design):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Then:

```bash
npm run dev      # http://localhost:5173
npm run build    # type-checks, then builds
npm run lint     # oxlint
```

There is no test suite. Verification has been: `npm run build` (which runs
`tsc -b`), `npm run lint`, and manual checks in the browser.

### Access you will need

1. **GitHub** — collaborator on the repo
2. **Supabase** — member of the org (project ref `zuvrcetdkcphnjcngvym`); needed for the database, auth settings, and Edge Function deploys
3. **Vercel** — optional; you can work entirely through GitHub

The **Gemini API key** is a server-side Supabase secret. Never put it in any
`VITE_` variable or anywhere in `src/`. For local Edge Function work, copy
`supabase/functions/.env.example` to `supabase/functions/.env` (gitignored)
and paste the key from the Supabase dashboard.

---

## 4. Architecture

```
src/
  pages/        Route screens. Thin — no business logic, no direct storage access
  components/   Reusable UI
  layouts/      MainLayout: header + <Outlet> + footer + skip link
  services/     ALL business logic and side effects
  utils/        Pure helpers
  types/        Shared TypeScript models
  context/      AuthContext (provider) + auth-context (object, split for HMR)
  hooks/        useAuth, useDocumentTitle
  styles/       Plain CSS; tokens in global.css :root
supabase/
  migrations/   SQL migrations (the reports table + RLS)
  functions/generate-ai-feedback/   Deno Edge Function
```

**The rule that keeps this maintainable:** pages call services; services own
side effects. In particular, nothing outside `src/services/reportStorage.ts`
is allowed to touch storage.

### Routes

Public: `/` `/analyze` `/report/:reportId` `/learn` `/privacy` `/terms`
`/disclaimer` `*`
Signed-out only: `/` `/login` `/signin` `/signup` `/sign-up`
Signed-in only: `/dashboard` `/reports`
Unguarded by design: `/forgot-password` `/reset-password`

`/` redirects signed-in users to `/dashboard`. Guards are
`ProtectedRoute` and `PublicOnlyRoute`; both wait for the session to resolve
before deciding, and `App.tsx` holds all routes until the initial auth check
finishes so the guest nav never flashes.

**`/reset-password` must stay unguarded.** Supabase signs the user in with a
temporary recovery session, so a "signed-out only" guard would bounce them
out mid-reset.

### Report storage is hybrid

```
Signed-in user  ->  Supabase `reports` table (synced, RLS-protected)
Guest           ->  localStorage in that browser only
```

Guests keep local storage because RLS blocks anonymous writes by design. On
a signed-in user's first dashboard load, any leftover local reports of
theirs are uploaded and the local copies cleared **only after** the server
confirms — so a failure can't lose data.

Every function in `reportStorage.ts` is `async`. Pages must handle pending
and failed states.

### Security model

- `reports` has RLS enabled with four owner-scoped policies. `with check`
  is on INSERT **and** UPDATE so a row can't be reassigned to another user.
- The Edge Function enforces auth in two independent layers: the Supabase
  gateway (`verify_jwt = true`) and its own `auth.getUser()` call. Verified
  against a forged JWT.
- CORS is an explicit allow-list (production + localhost). Never `*`.
- Per-user rate limit on AI feedback: 10 requests / 10 minutes, keyed on the
  verified user id, enforced **before** Gemini is called so abuse consumes
  no quota. It's in-isolate memory — best effort, not a hard global cap.
- Gemini receives only a limited summary: at most 5 reports, 5 metrics each.
  No user ids, emails, file names, or video.

---

## 5. 🔴 Broken right now

### Signups do not work

Supabase's built-in email sender returns **`email rate limit exceeded`**.
"Confirm email" is ON, so new users need a confirmation email that isn't
being sent — they cannot complete registration.

The built-in sender allows only a couple of messages per hour and **paying
for Supabase Pro does not raise it**. The fix is custom SMTP:

> Supabase dashboard → Authentication → Emails → SMTP Settings.
> Resend's free tier (~3,000/month) takes about 10 minutes to wire up.

**This is the highest-priority item.** Until it's fixed, nobody new can use
the app.

### Unverified: the signed-in database save path

The migration from localStorage to Postgres shipped without an end-to-end
test of the signed-in save, because testing it needs a real session. The
pieces around it are verified (RLS, table, guest path, types, build), and
the design can't destroy data — but **somebody should confirm this
manually**:

1. Sign in on the live site
2. Run an analysis
3. Sign in on a *different device* and confirm the report is there

If it's broken, revert is one commit:
```bash
git revert --no-edit 11a49d1 && git push
```

---

## 6. Traps that will cost you an hour

**1. There are two copies of this project on Marcus's machine.**
`OneDrive/Desktop/Passion Project` is the git repo. `OneDrive/Documents/Claude WorkSpace/Passion Project` is not — it has no `.git`. Work has
historically happened in both and been copied across by hand. **Only the
Desktop one deploys.** Consider consolidating to a single clone.

**2. `supabase link` fails inside OneDrive folders.**
You'll get `FileSystem.makeDirectory AlreadyExists supabase/.temp` — a sync
race, not a real error. Workaround: copy `supabase/config.toml` and
`supabase/functions/` (or `migrations/`) to a non-OneDrive temp directory
and run with an explicit `--project-ref zuvrcetdkcphnjcngvym`.

**3. PowerShell blocks `npx`.**
`npx.ps1 cannot be loaded because running scripts is disabled` is an
execution-policy issue, not a Node problem. Use `npx.cmd supabase ...`, or
run once: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

**4. Vercel needs `vercel.json` for SPA routing.**
Without the rewrite, every deep link (`/dashboard`, `/reset-password`, …)
returns Vercel's 404 and password-reset emails dead-end. It's committed at
the root *and* in `public/` so it ships whether Vercel builds from source or
someone uploads `dist/` directly. Don't delete either copy.

**5. The dark theme must flip back to light for PDF and print.**
Report pages are dark on screen but render on white paper. `.pdf-exporting`
and `@media print` redefine the design tokens to light values. If you change
the palette, check PDF export still produces readable output.

---

## 7. Deploying

**Frontend:** push to `main`. Vercel builds and deploys automatically (~30s).

**Edge Function** (not deployed by Vercel — separate step):
```bash
npx.cmd supabase login
npx.cmd supabase functions deploy generate-ai-feedback --project-ref zuvrcetdkcphnjcngvym
```
Never deploy with `--no-verify-jwt`.

**Database migrations:**
```bash
npx.cmd supabase db push --linked --project-ref zuvrcetdkcphnjcngvym
```
(Run from a non-OneDrive directory — see trap #2.)

### Quick production health check

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://movesafeai.app/dashboard   # expect 200, not 404
curl -s -D - -o /dev/null -X OPTIONS \
  https://zuvrcetdkcphnjcngvym.supabase.co/functions/v1/generate-ai-feedback \
  -H "Origin: https://evil.com"                                            # expect 403
```

---

## 8. Suggested priorities

1. **Fix signup email (SMTP).** Blocks all new users.
2. **Verify the signed-in save path** end to end across two devices.
3. **Check Gemini billing.** The key is on Marcus's Google account; confirm
   whether it has hard caps or a card attached. The rate limit helps, but
   this is the only real cost exposure.
4. **Add error tracking.** There is none — if the app breaks for a user,
   nobody finds out. Sentry's free tier is ~10 minutes.
5. **Add analytics.** Vercel Analytics is a toggle.
6. **Update the stale docs** (below).
7. Consider a test suite. There is currently none.

---

## 9. Stale documentation

These files describe things that are no longer true. Treat them as history:

- **All 8 markdown files reference a "Compare reports" feature** that was
  deleted. There is no `ComparePage`, no comparison service, no `/compare`
  route.
- **`SECURITY.md` §1.1 says "Database tables — none exist."** False — the
  `reports` table exists with RLS. §3.1 and §4 also predate the migration.
- **`README.md`** says reports are localStorage-only and don't sync.
- **`PROJECT_STATUS.md`** says the same and reads as a build log.

`CLAUDE.md` is instructions for AI assistants working in this repo; it also
mentions Compare and localStorage-only storage.

---

## 10. Non-negotiables

Things that should not change without a deliberate decision:

1. **Educational framing.** No "diagnosis", "injury detected", "recovery",
   "treatment", "medically safe". The simulated-analysis labels and
   disclaimers stay until the analysis is actually real.
2. **No video leaves the browser.** Not to Supabase, not to Gemini.
3. **The Gemini key stays server-side.** Never a `VITE_` variable.
4. **All report storage goes through `reportStorage.ts`.**
5. **RLS stays on**, with `with check` on insert and update.
6. **Accessibility holds.** Real buttons and inputs, visible labels,
   `role="alert"` for errors, `role="status"` for loading, visible focus
   rings, meaning never conveyed by color alone, `prefers-reduced-motion`
   respected. Contrast currently passes WCAG AA throughout.

Welcome aboard.
