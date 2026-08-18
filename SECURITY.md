# MoveSafe AI — Security Notes

Audit date: **2026-07-26**. Scope: the hosted Supabase project
(`zuvrcetdkcphnjcngvym`), the `generate-ai-feedback` Edge Function, and the
frontend's handling of credentials and user data.

This document records **what was actually tested**, what could not be
verified without dashboard access, and what should be done before any
production use. Nothing in the "proposed" sections has been applied.

> MoveSafe AI is a student demonstration project. No formal security
> certification or compliance status (HIPAA, SOC 2, etc.) is claimed.

---

## 1. Checks completed

Each item below was verified empirically against the live project, not
inferred from source comments.

### 1.1 Database tables — none exist

Thirteen likely table names were probed through the PostgREST API using the
publishable (anon) key: `profiles`, `users`, `reports`, `movement_reports`,
`analysis_results`, `analyses`, `videos`, `video_metadata`, `uploads`,
`files`, `user_profiles`, `movesafe_reports`, `metrics`.

**Result:** every one returned `PGRST205 — "Could not find the table in the
schema cache"`. The frontend confirms this independently: there are zero
`.from()`, `.rpc()`, and `.storage` calls anywhere in `src/`.

**Consequence:** Row Level Security, `auth.uid()` ownership rules, and
per-user policies are **not applicable today** — there is no server-side
user data to protect. Report data lives in browser `localStorage`
(see §3.1). Policies must be created at the same time as the tables; see
§4.

### 1.2 Supabase Storage — no buckets exist

- `GET /storage/v1/bucket` returned `[]`.
- An upload attempt with the anon key returned `"Bucket not found"`.
- Object-list probes against `videos`, `uploads`, `reports`,
  `movement-videos`, `avatars`, `public`, and `files` all returned
  `200 []` — **but so did a control probe of the nonsense bucket name
  `zzz-does-not-exist-9f3a`**. That response therefore means "no such
  bucket", not "an empty bucket you can read".

**Consequence:** there are no Storage objects and no Storage policies to
audit. Uploaded videos are never sent to Supabase; they stay in the
browser as temporary object URLs that the app revokes.

### 1.3 Edge Function authentication — enforced, layered

Six tests against the deployed function:

| # | Request | Result |
|---|---------|--------|
| 1 | No `Authorization` header | `401` — gateway (`UNAUTHORIZED_NO_AUTH_HEADER`) |
| 2 | Anon publishable key as bearer token | `401` — **the function's own check** |
| 3 | Forged JWT (valid shape, invalid signature) | `401` — gateway (`Invalid JWT`) |
| 4 | Malformed `Authorization` header | `401` — the function's own check |
| 5 | `GET` instead of `POST` | `405 method-not-allowed` |
| 6 | `OPTIONS` preflight | `200` |

Test 2 is the significant one: the gateway accepts the anon key as a
structurally valid JWT, and the function's own `supabase.auth.getUser()`
call then rejects it because it is not a real user session. Authentication
is therefore enforced **at two independent layers** — the function would
still refuse anonymous callers even if gateway JWT verification were
misconfigured.

`verify_jwt = true` is set for this function in `supabase/config.toml`, and
the deployment was performed without `--no-verify-jwt`.

### 1.4 Deployed function inventory

Probed for additional functions (`hello-world`, `test`, `debug`, `admin`,
`ai-feedback`, `gemini`): all returned `404`. Only
`generate-ai-feedback` is deployed.

### 1.5 Credential placement

- **Gemini API key:** present only in the gitignored
  `supabase/functions/.env` (local development) and in the hosted Supabase
  project secrets (deployed function). A sweep of 183 project files
  (excluding `node_modules`) found it in exactly one place: that gitignored
  file.
- **Supabase personal access token (`sbp_…`):** removed from the project
  entirely; zero occurrences remain in any file.
- **Production bundle (`dist/`):** contains no Gemini key, no `sbp_` token,
  no service-role or `sb_secret_` value, and no JWT. The only `sb_secret_`
  match is supabase-js's own `startsWith("sb_secret_")` key-format
  detection code — library logic, not a credential.
- The bundle does contain the Supabase project URL and the **publishable
  (anon) key**, which are designed to be public. Their safety depends
  entirely on RLS being correct once tables exist.

### 1.6 Per-user rate limiting — **does not exist**

The function has no per-user or per-IP request throttling. The existing
`rate-limit` error code only **relays Gemini's own HTTP 429** upstream
response; it does not enforce any limit of our own. Any authenticated user
can call the function in a loop and consume the project's Gemini quota.
A proposal is in §5. **No code has been changed for this.**

---

## 2. Requires manual verification in the Supabase dashboard

These could not be inspected because the Supabase CLI is not currently
authenticated and the management API requires it. **Nothing here has been
changed.**

1. **Email confirmation** — Authentication → Sign In / Providers → Email.
   Confirm whether "Confirm email" is enabled. If it is off, anyone can
   register with an address they do not control.
2. **Minimum password length and strength** — Authentication → Policies.
3. **Leaked-password protection** (HaveIBeenPwned check) — Authentication →
   Policies. Recommended: enabled.
4. **Signup enabled/disabled** — whether public registration is intended
   for a demonstration project.
5. **Redirect URL allowlist** — Authentication → URL Configuration. Must
   contain `http://localhost:5173/reset-password` and every deployed
   equivalent, and must not contain wildcard or unrelated domains.
6. **Site URL** — should match the real deployed frontend.
7. **JWT expiry** — Authentication → Sessions (default 3600s).
8. **MFA settings**, if account security matters for the demo.
9. **`verify_jwt` as stored server-side** for `generate-ai-feedback` —
   Edge Functions → generate-ai-feedback. Behaviour was verified
   empirically (§1.3); this confirms the stored flag.
10. **Project API keys** — confirm no service-role key has ever been used
    in frontend code or shared. Rotate if in doubt.

> **Note on `supabase/config.toml`:** the `enable_confirmations`,
> `minimum_password_length`, and `site_url` values in that file configure
> the **local development stack only**. They say nothing about the hosted
> project's settings, which is why items 1–7 above require the dashboard.

---

## 3. Known risks in the current design

### 3.1 Report data has no server-side security boundary (by design)

All movement reports are stored in browser `localStorage`. Ownership is
enforced by a client-side `userId` filter in
`src/services/reportStorage.ts`. This shapes what the UI displays; it is
**not** a security boundary.

Concretely:

- If two people share a browser profile, User A's reports remain readable
  in DevTools after User B signs in. The filter hides them from the
  interface, not from the machine.
- Any successful XSS could read all stored reports.
- Data does not sync across devices and is lost when browser data is
  cleared.

This is a documented, deliberate limitation of the student-project scope,
not a regression. It is resolved by migrating to database storage with the
policies proposed in §4.

### 3.2 CORS was previously a wildcard — now an allow-list (not yet deployed)

The deployed function currently answers preflight requests with
`Access-Control-Allow-Origin: *`. The source has been changed to an
explicit allow-list (§6), **but that change has not been deployed** — the
Supabase CLI needs `npx supabase login` first (see §7).

Impact of the wildcard is limited: it does not expose user data, because an
attacker's page cannot obtain a victim's JWT (it lives in the victim's own
origin storage). It permits any page to call the function using *its own*
authenticated account, which is an abuse/quota concern rather than a data
breach.

### 3.3 No rate limiting

See §1.6 and the proposal in §5.

---

## 4. Proposed future RLS policies (not applied — no tables exist)

**Do not run this SQL until the corresponding tables are actually being
created.** It is recorded here so the migration starts from a secure
baseline.

Two details matter in these policies:

- `with check` on both `insert` and `update` prevents a user from
  reassigning a row to a different `user_id`.
- Wrapping as `(select auth.uid())` lets Postgres evaluate the call once
  per statement rather than once per row.

### 4.1 Reports table

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  movement_type text not null,
  custom_movement_name text,
  overall_score int not null check (overall_score between 0 and 100),
  payload jsonb not null
);

alter table public.reports enable row level security;

create policy "select own reports" on public.reports
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "insert own reports" on public.reports
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "update own reports" on public.reports
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete own reports" on public.reports
  for delete to authenticated using ((select auth.uid()) = user_id);

create index on public.reports (user_id, created_at desc);
```

### 4.2 Profiles table (if added)

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
```

### 4.3 Storage bucket for video uploads (if added)

Private bucket, one folder per user (`{user_id}/filename`):

```sql
insert into storage.buckets (id, name, public)
values ('movement-videos', 'movement-videos', false);

create policy "read own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'movement-videos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "upload own files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'movement-videos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'movement-videos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
```

Serve these files with **signed URLs only** — never `getPublicUrl()`.

### 4.4 Verification after applying any of the above

1. Confirm `rowsecurity = true`:
   ```sql
   select relname, relrowsecurity from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r';
   ```
2. Sign in as User A, create a row, then sign in as User B and confirm the
   row is invisible through the API.
3. Attempt an `update` that sets `user_id` to another user — it must fail.
4. Attempt to read another user's storage path — it must fail.

---

## 5. Proposed per-user rate limiting (not implemented)

Currently absent (§1.6). Three options, cheapest first:

**Option A — Supabase Edge Runtime KV / Deno KV (recommended start).**
Keep a fixed-window counter keyed on the authenticated user ID:

- Key: `ai-feedback:{user_id}:{unix_minute_bucket}`
- Limit: e.g. 5 requests per 10 minutes, 30 per day.
- On exceed: return the existing `429 rate-limit` shape so the frontend's
  message ("Feedback is temporarily busy. Please try again later.") already
  handles it — no frontend change required.
- Cost: no new infrastructure. Caveat: per-instance state may not be
  perfectly global.

**Option B — a `ai_feedback_requests` Postgres table.** Insert a row per
request and count recent rows for the user inside the function (using the
service-role client, server-side only). Strictly accurate and auditable;
requires a table plus RLS (users should read only their own rows, and
inserts should come from the function).

**Option C — a gateway/WAF-level limit.** Appropriate only for a real
deployment with infrastructure in front of Supabase.

Whichever is chosen, the counter must key on the **verified**
`user.id` from `auth.getUser()` — never on a client-supplied value — and
the limit must be enforced **after** authentication but **before** the
Gemini call, so unauthenticated or invalid requests never consume quota.

---

## 6. CORS allow-list (implemented in source, deployment pending)

`supabase/functions/generate-ai-feedback/` now resolves CORS per request:

- **Always allowed (development):** `http://localhost:5173`,
  `http://127.0.0.1:5173`.
- **Production origins:** supplied server-side via the `ALLOWED_ORIGINS`
  secret, comma-separated:
  ```
  npx supabase secrets set ALLOWED_ORIGINS=https://your-app.example.com
  ```
- **Allowed origin:** echoed back exactly in
  `Access-Control-Allow-Origin`, with `Vary: Origin`.
- **Unknown origin:** refused with `403 forbidden-origin` before any other
  work — including preflight — and no allow-origin header is sent.
- **No `Origin` header at all:** allowed through unchanged. curl,
  server-side tests, and same-origin requests look like this; refusing them
  would break legitimate non-browser callers without adding security, since
  CORS is enforced only by browsers.
- **The wildcard `*` is never sent.**

The decision logic lives in `validation.ts` (which uses no Deno APIs) and
is covered by **23 unit tests**, including rejection of subdomain
impersonation (`https://evil.movesafe.example.com`), suffix attacks
(`https://movesafe.example.com.evil.com`), scheme and port mismatches, the
literal strings `*` and `null`, and trailing-slash variants. The existing
70 validation assertions still pass.

> **Not yet live.** The deployed function still uses the old wildcard until
> it is redeployed (§7).

---

## 7. Deployment steps still required

The Supabase CLI is **not authenticated** (the personal access token was
removed from the project, and the CLI had only ever been reading it from
that file). The browser login cannot be automated:

```bash
npx supabase login
```

Then, from the project root:

```bash
npx supabase secrets set ALLOWED_ORIGINS=https://your-app.example.com
```

```bash
npx supabase functions deploy generate-ai-feedback --project-ref zuvrcetdkcphnjcngvym
```

> Known local issue: `supabase link` fails inside this working copy with
> `FileSystem.makeDirectory AlreadyExists supabase/.temp`, caused by
> OneDrive sync. Workaround: copy `supabase/config.toml` and
> `supabase/functions/` to a non-OneDrive directory and deploy from there
> with an explicit `--project-ref`.

After deploying, re-verify:

```bash
curl -s -D - -o /dev/null -X OPTIONS \
  https://zuvrcetdkcphnjcngvym.supabase.co/functions/v1/generate-ai-feedback \
  -H "Origin: https://evil-example.com"
```

Expect **no** `Access-Control-Allow-Origin` header and a `403`. Repeat with
`-H "Origin: http://localhost:5173"` and expect that exact origin echoed
back.

---

## 8. Production security checklist

Before treating this application as production software:

**Data**
- [ ] Migrate reports from `localStorage` to Postgres tables
- [ ] Enable RLS on **every** new table (§4)
- [ ] Verify ownership policies with two real accounts (§4.4)
- [ ] Use a private Storage bucket with per-user folders and signed URLs
- [ ] Confirm no table is exposed to the `anon` role unintentionally

**Authentication**
- [ ] Complete every dashboard check in §2
- [ ] Enable email confirmation
- [ ] Enable leaked-password protection; raise the minimum password length
- [ ] Restrict the redirect-URL allowlist to known domains
- [ ] Confirm no service-role key exists in any client-side code

**Edge Function**
- [ ] Deploy the CORS allow-list and set `ALLOWED_ORIGINS` (§6, §7)
- [ ] Keep `verify_jwt = true`; never deploy with `--no-verify-jwt`
- [ ] Implement per-user rate limiting (§5)
- [ ] Confirm logs contain no keys, tokens, user IDs, emails, or full
      report contents

**Secrets**
- [ ] Gemini key only in Supabase secrets and the gitignored local file
- [ ] No `SUPABASE_ACCESS_TOKEN` in any project file
- [ ] `.env.example` contains placeholders only
- [ ] Re-run a bundle sweep after every build
- [ ] Rotate any credential that has ever been pasted into chat, a
      screenshot, a commit, or a shared document

**Application**
- [ ] Keep all wording educational; no medical or diagnostic claims
- [ ] Confirm object URLs are revoked on file change, removal, and unmount
- [ ] Run an accessibility and dependency audit before release
