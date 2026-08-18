# MoveSafe AI — Demo Script

A conversational script for a **4–5 minute** live demo. Speak naturally —
this is a guide, not a word-for-word requirement.

**Before you start:** have two or more sample reports already saved, be
signed in to a test account in another tab if time is short, and know your
Gemini backup line (section 7).

---

## 1. Home and Project Purpose (~30 seconds)

> "This is MoveSafe AI — an educational movement-analysis app I built.
> The idea is simple: upload a movement, get an educational report, and
> learn from the patterns over time. Before we start, one important thing:
> every report in this app is simulated. This project demonstrates the
> complete workflow of a movement-analysis product, not real biomechanics."

*Scroll the Home page briefly — hero, features, and the disclaimer in the
footer.*

> "The home page explains what the app does and links to every feature.
> Notice the educational disclaimer — it appears throughout the app."

## 2. Authentication (~30 seconds)

*Click Login and sign in with the test account.*

> "The app uses Supabase authentication. I'm signing in with a test
> account. Pages like Reports, Compare, and the Dashboard are protected —
> if you're signed out, they redirect you to this login page and bring you
> back to where you were headed after you sign in."

## 3. Analyze Workflow (~45 seconds)

*Open Analyze, pick a movement type, and drop in a sample file.*

> "Here's the core workflow. I pick a movement type — say, a squat — and
> upload a photo or video. The app validates the file type and size and
> shows a preview. The file itself never leaves the browser."

*Click Analyze and let the processing state run.*

> "The analysis runs as a simulation — it generates consistent educational
> scores so the whole product experience works end to end, ready for a
> real analysis engine later."

## 4. Report Detail (~40 seconds)

*Open the new report.*

> "Every report gets an overall score with a plain-language band — Strong,
> Developing, or Needs Attention — so the meaning never depends on color
> alone. Below that are individual metrics like depth control or knee
> alignment, each with its own score and explanation, then observations
> and educational recommendations."

*Point at the disclaimer, then the action buttons.*

> "Each report carries the educational disclaimer, and it can be downloaded
> as a PDF or printed — useful for sharing with a coach or trainer."

## 5. Reports and Comparison (~45 seconds)

*Open My Reports.*

> "All my reports live here. I can search, filter by movement or status,
> and sort. Deleting always asks for confirmation first."

*Enter compare mode and select two matching reports.*

> "The comparison feature takes exactly two completed reports of the same
> movement and shows what changed — overall score and metric by metric,
> with charts and a plain-text summary. And the wording matters: these are
> educational score changes, not proof that my body improved or declined."

## 6. Dashboard (~40 seconds)

*Open the Dashboard.*

> "The Dashboard pulls everything together — total reports, average score,
> and my most analyzed movement. These charts are hand-built with CSS and
> SVG: movement distribution and score history, with a time filter."

*Point at the feedback cards.*

> "This educational feedback is computed locally, in plain TypeScript — my
> strongest recurring metric, the one worth reviewing, and suggested next
> steps. No AI involved so far."

## 7. Optional Gemini Feedback (~40 seconds)

*Point at the AI section and the privacy note.*

> "AI feedback is strictly optional — it only runs when I click this
> button. Only a limited summary of simulated scores and metric names is
> sent, through a Supabase Edge Function that checks my login and keeps the
> API key on the server. No files, no account details, no report IDs."

*Click Generate Feedback (the optional Gemini-powered section).*

> "The response is validated before it's shown — structure, length, and a
> safety check on the wording — and it always ends with the educational
> disclaimer."

**Backup line if Gemini is unavailable:**

> "If the AI service is temporarily unavailable, the Dashboard still
> provides local educational feedback generated directly from the report
> data — which is exactly what you see here."

## 8. Learn Page and Conclusion (~30 seconds)

*Open the Learn page and scroll briefly.*

> "Finally, the Learn page — movement basics, prevention tips, an injury
> library, posture education, warm-ups, and curated video resources. It's
> the educational heart of the app."

> "So that's MoveSafe AI: a complete movement-learning workflow — analyze,
> review, compare, track, and learn — built with React, TypeScript,
> Supabase, and a safely integrated AI layer. And to close the way I
> opened: the reports are simulated, and this is an educational tool, not
> a medical one. Thanks!"
