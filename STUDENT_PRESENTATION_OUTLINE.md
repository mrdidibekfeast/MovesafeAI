# MoveSafe AI — Student Presentation Outline

Target length: **7–10 minutes** (roughly 30–45 seconds per slide).
Each slide lists the main point, speaking bullets, an optional transition,
and what to show on screen.

---

## Slide 1 — Title

**MoveSafe AI — Educational Movement Analysis and Injury-Prevention Learning Platform**

*Main point:* Introduce the project and set expectations honestly.

- "MoveSafe AI is a web application I built that walks users through a
  complete movement-analysis workflow."
- "Its purpose is educational — teaching movement concepts and demonstrating
  a full-stack application."
- "One thing up front: the movement reports are simulated. This is a
  demonstration of the workflow, not a medical measurement tool."

*Show:* Title slide or the Home page hero.

---

## Slide 2 — Problem

*Main point:* Why an educational movement app is worth building.

- "Most people don't have an easy way to understand movement quality —
  terms like knee alignment or landing control."
- "Many fitness tools show numbers without explaining what they mean."
- "And an educational project must never drift into medical claims — that
  constraint shaped every design decision."

*Transition:* "To address this, I designed MoveSafe AI as an educational
workflow rather than a diagnostic system."

*Show:* A simple problem slide (no app UI needed).

---

## Slide 3 — Solution

*Main point:* The user journey, end to end.

- "A user uploads a movement photo or video and picks the movement type."
- "They get a simulated educational report — a score, metrics, observations,
  and suggestions."
- "They can save reports, compare two sessions, watch trends on a Dashboard,
  and learn prevention concepts on the Learn page."

*Show:* The Analyze page.

---

## Slide 4 — Main Features

*Main point:* Breadth of the finished application.

- "Full authentication with protected routes."
- "Analyze, report detail, searchable history, and side-by-side comparison."
- "A Dashboard with charts and feedback, PDF and print export, a large Learn
  page, and optional AI feedback."

*Show:* A feature-grid slide or quick flick through two pages.

---

## Slide 5 — Technical Architecture

*Main point:* Clean, layered architecture.

- "React 19 with TypeScript and Vite; React Router for navigation."
- "Supabase handles authentication; reports persist in localStorage behind a
  single storage service."
- "All business logic lives in services — pages stay thin."
- "AI requests go through a Supabase Edge Function, so the Gemini key never
  reaches the browser."

*Transition:* "Here's how data flows through the system."

*Show:* The architecture diagram from the README.

---

## Slide 6 — Analysis and Reports

*Main point:* What a report is and what it honestly is not.

- "The analysis is currently simulated — deterministic scores generated from
  the upload details, clearly labeled as educational."
- "Each report has an overall score, per-metric scores with statuses,
  observations, and educational suggestions."
- "The report structure is deliberately shaped so a real pose-analysis
  backend could replace the simulation later."

*Transition:* "Once reports exist, users can review how results change
across sessions."

*Show:* A report detail page.

---

## Slide 7 — Reports and Comparison

*Main point:* Managing and comparing report history.

- "Users can search, filter, sort, and safely delete reports — deletion asks
  for confirmation."
- "Comparison accepts exactly two completed reports of the same movement."
- "It shows overall and metric-by-metric differences — presented as
  educational changes, never proof of physical improvement."

*Show:* The Compare page with two reports.

---

## Slide 8 — Dashboard and Feedback

*Main point:* Patterns at a glance, with feedback that needs no AI.

- "Summary cards show totals, average score, and the most analyzed movement."
- "Hand-built charts — no chart library — show movement distribution and
  score history, with a time-range filter."
- "Local deterministic feedback highlights the strongest recurring metric,
  the one needing attention, and suggested next steps — all computed in
  TypeScript, no AI required."

*Show:* The Dashboard with charts and feedback cards.

---

## Slide 9 — Gemini Integration

*Main point:* AI added safely, as an optional layer.

- "AI feedback runs only when the user clicks the button — never
  automatically."
- "Only a limited summary goes out: simulated scores and metric names. No
  files, no account data, no report IDs."
- "A Supabase Edge Function verifies the user, validates and sanitizes the
  input, calls Gemini with a server-side secret, and validates the response
  before anything is displayed."
- "If AI fails, the local feedback is still there."

*Show:* The Dashboard AI section (or a flow diagram).

---

## Slide 10 — Accessibility and Safety

*Main point:* Built to be usable and honest.

- "Keyboard support throughout: a skip link, focus management on route
  changes, an accessible mobile menu."
- "Forms have visible labels and properly linked error messages."
- "Charts include text summaries; meaning never relies on color alone;
  reduced-motion preferences are respected."
- "Every result carries an educational disclaimer — no diagnosis, no
  medical claims, anywhere."

*Show:* Tab through a form showing focus rings, or the skip link.

---

## Slide 11 — Challenges and Learning

*Main point:* What was genuinely hard.

- "Organizing a multi-page React project so logic stayed out of the UI."
- "Designing fair comparison rules, especially for custom movement names."
- "Building accessible charts from scratch without a chart library."
- "Handling AI responses safely — validating structure, rejecting unsafe
  wording, and protecting the API key behind a serverless function."
- "Keeping every sentence educational instead of medical."

*Show:* A short bullet slide.

---

## Slide 12 — Future Work

*Main point:* A realistic roadmap — none of this exists yet.

- "Real pose estimation, for example with MediaPipe."
- "A secure server-side report database with cross-device sync."
- "Research-based scoring, automated tests, and AI rate limiting."

*Show:* A bullet slide.

---

## Slide 13 — Demo Plan

*Main point:* What the live demo will cover (see DEMO_SCRIPT.md).

1. Home page → 2. Sign in → 3. Analyze page → 4. Generate a report →
5. Report detail → 6. Report history → 7. Compare two reports →
8. Dashboard charts → 9. Optional Gemini feedback → 10. Learn page

*Backup plan:* Keep two or more sample reports ready before the
presentation in case there is not enough time to generate them live.

*Show:* The running application.

---

## Slide 14 — Conclusion

*Main point:* Wrap up confidently and honestly.

- "MoveSafe AI demonstrates a complete educational movement-analysis
  workflow using modern web development, authentication, data visualization,
  report comparison, accessibility, and safe AI integration."
- "And one final reminder: the current reports are simulated, and the
  application is not a medical diagnostic tool."
- "Thank you — happy to take questions."

*Show:* Closing slide with the project name.
