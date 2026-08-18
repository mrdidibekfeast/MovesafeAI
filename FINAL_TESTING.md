# MoveSafe AI — Final Testing Checklist

Manual walkthrough for the polished application. Run `npm run dev` for live
testing and `npm run build` before sign-off. No secrets or real user data
belong in this file or in any test evidence.

## Routes

- [ ] `/` Home loads with hero, about, features, CTA
- [ ] `/analyze` works signed out (guest) and signed in
- [ ] `/learn` renders all eight sections
- [ ] `/login`, `/signin`, `/signup`, `/sign-up`, `/forgot-password`, `/reset-password` load
- [ ] `/privacy`, `/terms`, `/disclaimer` show real content
- [ ] `/dashboard`, `/reports`, `/compare` redirect to login when signed out
- [ ] Unknown URL shows Page Not Found (with Go Home / Open Dashboard)
- [ ] Protected pages never flash private content while auth resolves

## Authentication

- [ ] Signup validates all fields and focuses the first invalid one
- [ ] Login redirects to the originally requested protected page
- [ ] Malformed/external redirect targets fall back to `/dashboard`
- [ ] Forgot Password shows the privacy-safe confirmation
- [ ] Reset Password works from the email link; invalid link state is helpful
- [ ] Sign out returns to Home; header switches to guest state

## Analyze flow

- [ ] File requirements (types + size limits) are visible before choosing
- [ ] Invalid type/size shows a clear error; retry works
- [ ] Preview appears; removing/replacing the file revokes the old preview
- [ ] Analyze button disabled until the form is valid; processing state shows
- [ ] Completed analysis links to the new report

## Reports

- [ ] Report detail shows score circle, metrics, observations, recommendations
- [ ] Missing/invalid report ID shows the Report Not Found state
- [ ] Another user's report is not viewable
- [ ] Search, movement/status filters, sort, and Clear Filters work
- [ ] Results count updates; filtered-empty differs from no-reports-yet
- [ ] Delete asks for confirmation; Escape/Cancel closes safely
- [ ] PDF download and browser print both work; excluded elements stay out

## Compare

- [ ] Exactly two compatible completed reports can be selected
- [ ] Missing/invalid/incompatible IDs in the URL are each explained
- [ ] Detailed and Chart views agree; charts have text equivalents
- [ ] Differences show signed values and educational wording

## Dashboard

- [ ] Summary cards, recent reports, quick actions correct with 0 / 1 / many reports
- [ ] Time-range filter changes charts only
- [ ] Local feedback appears; a feedback failure doesn't break the page
- [ ] AI feedback: generate, cancel, regenerate, failure keeps prior result
- [ ] Gemini runs only through the Supabase Edge Function; no key in the client
- [ ] Privacy note matches actual behavior

## Storage

- [ ] Reports persist across reloads (versioned `movesafe_reports` format)
- [ ] Legacy bare-array data still loads; one corrupt entry doesn't wipe the rest
- [ ] Storage failure (quota/privacy mode) shows an error, app keeps working

## Accessibility

- [ ] Skip link appears on first Tab and jumps to main content
- [ ] Focus moves to main content after route changes
- [ ] Every page has one visible `<h1>`; heading levels are logical
- [ ] Header marks the current page (`aria-current`)
- [ ] Mobile menu: opens, closes on link/route change/Escape, focus returns to button
- [ ] All forms: visible labels, associated errors, `aria-invalid`, focus to first error
- [ ] Buttons show loading text and block repeat submissions
- [ ] Loading states announce via `role="status"`, errors via `role="alert"`
- [ ] Charts expose `sr-only` summaries; meaning never depends on color alone
- [ ] Keyboard-only pass: every interactive control reachable and visible focus everywhere
- [ ] Reduced-motion preference disables transitions/animations
- [ ] Page titles update per route

## Responsive

- [ ] 1440 / 1200 / 992 / 768 / 480 / 360 px: no horizontal scrolling anywhere
- [ ] Cards, report actions, and compare controls wrap/stack cleanly
- [ ] Learn images resize without distortion
- [ ] Usable at 200% zoom

## Production

- [ ] `npm run build` succeeds with no TypeScript or lint errors
- [ ] No console errors on any route
- [ ] Bundle contains no Gemini key, no `VITE_GEMINI` reference, no direct Gemini endpoint
- [ ] No user IDs, emails, tokens, or full report IDs rendered or logged
- [ ] All copy remains educational and non-medical
