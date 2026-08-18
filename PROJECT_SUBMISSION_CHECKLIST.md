# MoveSafe AI — Project Submission Checklist

Final pass before submitting or presenting the project.

## Code

- [ ] `npm run dev` starts and every route loads
- [ ] `npm run build` succeeds (includes TypeScript type-checking)
- [ ] `npm run lint` reports no errors
- [ ] No secrets in source code (Gemini key exists only as a Supabase
      secret / gitignored `supabase/functions/.env`)
- [ ] No unnecessary console logs
- [ ] `.env` and `supabase/functions/.env` are gitignored and uncommitted

## Features

- [ ] Authentication works (signup, login, logout, forgot/reset password)
- [ ] Analyze flow works for guest and signed-in users
- [ ] Reports save, load, search, filter, sort, and delete (with confirmation)
- [ ] Compare works for compatible reports and explains incompatible ones
- [ ] Dashboard summary, charts, time filter, and local feedback work
- [ ] PDF download and browser print both produce clean output
- [ ] Gemini Edge Function is deployed and returns validated feedback
      (and the local-feedback fallback works when it fails)

## Documentation

- [ ] `README.md` completed and matches the actual project
- [ ] `.env.example` has placeholders only (no real values)
- [ ] `FINAL_TESTING.md` checklist walked at least once
- [ ] `STUDENT_PRESENTATION_OUTLINE.md` reviewed and timed (7–10 min)
- [ ] `DEMO_SCRIPT.md` practiced aloud (4–5 min)
- [ ] `TECHNICAL_OVERVIEW.md` reviewed for accuracy
- [ ] Screenshots added to the README placeholders

## Presentation

- [ ] Two or more sample reports prepared in the demo browser
- [ ] Test account credentials ready (never shown on screen)
- [ ] Gemini fallback line rehearsed (local feedback still works)
- [ ] Demo sequence practiced end to end with timing
- [ ] Educational disclaimer mentioned at open and close
- [ ] Backup screenshots ready in case the live demo fails
