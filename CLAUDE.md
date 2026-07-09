# Project notes for Claude

This repo contains two things:

1. **ToxCase** — a toxicology case generator web app (`index.html`, `app.js`, `styles.css`).
2. **Patient log** — a dictation-to-note workflow in `patient-log/`.

## Medical note dictation workflow

When the user dictates clinical content (HPI, ROS, physical exam, labs,
assessment, plan — in any order, as free speech), do the following:

1. **Structure the dictation** into a note using `patient-log/TEMPLATE.md`.
   - Include ONLY information the user actually dictated. Never invent,
     infer, or pad findings, vitals, labs, or history. Omit sections that
     were not dictated rather than writing "normal" or "unremarkable"
     unless the user said so.
   - Clean up dictation artifacts (filler words, false starts, "period",
     "new line") but preserve the clinical meaning exactly. Keep the
     user's medical terminology; don't substitute synonyms.
   - Normalize into conventional note style: ROS and exam by system,
     meds/allergies as lists, assessment/plan numbered by problem.
   - If something is ambiguous (e.g., a drug name or dose that could be
     misheard), flag it in the note as `[VERIFY: ...]` instead of guessing.

2. **De-identify.** Notes are stored in a GitHub repo, so they must not
   contain PHI: no patient names, no dates of birth, no MRNs, no exact
   addresses or phone numbers, no facility-identifying details. Refer to
   the patient as e.g. "58-year-old male". If the user dictates a name or
   MRN, replace it with a case label and remind them once per session.

3. **Show the drafted note to the user in chat** before or as you save it,
   so they can correct anything.

4. **Save to the log**: write the note to
   `patient-log/YYYY-MM-DD-<short-slug>.md` (date = date of encounter if
   stated, otherwise today; slug = chief complaint, e.g.
   `2026-07-09-chest-pain.md`). If two notes share a date and slug, append
   `-2`, `-3`, etc.

5. **Update the index**: add a row for the note in `patient-log/README.md`.

6. **Commit and push** with a message like `Add patient log note: <slug>`.

7. **Amendments**: if the user dictates an addendum or correction to an
   existing note, append an `## Addendum (YYYY-MM-DD)` section to that
   note's file rather than editing the original text, then commit and push.
