# Ewwwaste: E-Waste Collection Portal

Web Technology (23CS2048) IA3 skill-based project for **John Chrispin Durai A (URK24CS1060)**, a friend of
the repo owner. Forked from the owner's Cuprum project (`../Esort`, repo Kukyos/Cuprum), which stays separate.
The problem statement is "E-waste collection portal"; the Cuprum scanner/simulator is kept as the landing page.

- Repo: https://github.com/Kukyos/Ewwwaste. **Work on `main` and push to `origin main`.** No side branches.
- Keep the "Cuprum" name (the owner's choice).
- Commits: no Claude / AI attribution lines.

## Stack

- Front end: plain HTML/CSS/JS portal pages in `public/` (`login`, `pickup`, `profile`, `admin` + `auth.js`,
  `pickups-list.js`, `pickup.js`, `portal.css`). Kept framework-free on purpose: the course grades HTML/CSS/JS basics.
- Landing page: the original React + Three.js Cuprum app (`src/`, built by Vite into `dist/`).
- Back end: Vercel serverless functions in `api/` (`signup`, `login`, `profile`, `pickups`, `admin`, shared `_lib.js`).
  bcrypt passwords, JWT in `localStorage`, every input validated in the browser (`auth.js` RULES) and again on the server
  (`_lib.js` RULES). Keep the two rule sets in sync.
- Database: MongoDB Atlas (the report template asks for MongoDB). DB `ewaste`, collections `users` (unique email index,
  `role: "user" | "admin"`) and `pickups` (`userId` → users._id, status `scheduled | completed | cancelled`).
  The cluster is in John's Atlas account; connection string is in `.env` (git-ignored) as `MONGODB_URI`, plus `JWT_SECRET`.

## Run

```
npm run build     # once, for the landing page
npm run portal    # scripts/portal-dev.mjs: whole site + /api on http://localhost:3000, uses .env
```
`portal-dev.mjs` forces public DNS (8.8.8.8) because this Windows machine's resolver can't answer the SRV lookup
for `mongodb+srv://`. A TLS "alert internal error" from Atlas means the IP isn't in Atlas Network Access (should be 0.0.0.0/0).
Admins: `node --env-file=.env scripts/make-admin.mjs <email> <password> "Name"`.

## Accounts in the database

Logins are in `private/ACCOUNTS.md` (git-ignored). In short: one admin (John), one demo customer used for the report
screenshots, and the owner's own test account ("LilyFernandez"), which stays untouched unless asked.

## Deployment

Not live yet (as of 2026-10-28 21:50 IST). The Vercel connector gets 403 creating projects, so the user imports
Kukyos/Ewwwaste at vercel.com/new and adds `MONGODB_URI` + `JWT_SECRET`. Vercel team: `team_oW5Vtxpd5wywxRXYZ9rK8DQM`.
Once live, put the URL in the PPT conclusion slide (`LIVE_URL=... node private/tools/deck.js`).

## Submission (deadline 2026-10-28 23:00, review 2026-10-29 9:30, CS104)

Everything is in `private/` (git-ignored):
- `IA3 Report Format.docx`: the teacher's template.
- `submission/`: the report (.docx + .pdf, exactly 7 pages, printed copy goes in an L-folder), the PPT, and the source ZIP
  (`git archive --format=zip --prefix=ewaste-collection-portal/ -o private/submission/URK24CS1060_IA3_WT_SourceCode.zip HEAD`).
- `tools/`: `build.py` (fills the template from `tools/shots/`), `deck.js` (pptxgenjs, `npm i pptxgenjs` first),
  `capture.mjs` / `admin.mjs` (puppeteer-core screenshots against localhost:3000; `capture.mjs` signs up the demo
  account, so delete that user first). Report screenshots are real captures, never mock-ups.
- Still outstanding: the Vercel host link, John's YouTube video, and admin-page screenshots in the report/PPT (asked, not answered).
