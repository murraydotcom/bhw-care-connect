# BHW Care Connect

The **public, patient-facing** site for BHW Medical Group — a Vite/React hub
(programs, the Personal Health Blueprint, resources, reviews, and Just Ask)
plus a small set of Netlify Functions backed by Notion.

This repo is **deliberately separate** from the employee side. BHW HQ and
crewOS (the internal ops app, staff tools, front desk, billing) live in the
`bhwcrewos` repo and its own Netlify deploy. Care Connect links to **none** of
them — patients never see an employee surface, and staff tools are never
served from this domain.

## Structure

```
app/                         Vite + React Care Connect hub (the site root, /)
pages/                       Patient destination pages copied into the build:
  bhw-patient-portal-mockup.html    Personal Health Blueprint
  bhw-charmed-patient-mockup.html   CharmEd program
  bhw-flow-patient-mockup.html      Flow program
  bhw-mindmood-patient-mockup.html  Mind & Mood program
assets/                      Brand tokens (bhw-tokens.css) + logos
netlify/functions/           Patient-facing endpoints (see below)
build-merge.mjs              After `vite build`, copies pages/ + assets/ into app/dist
netlify.toml                 Build + publish config for the Care Connect Netlify site
```

The build runs `vite build` (→ `app/dist`), then `build-merge.mjs` copies the
patient pages and assets alongside the compiled hub, so everything ships in one
`app/dist` publish folder.

## Functions

CommonJS, Node, dependency-free (raw `https` to Notion). Each imports the shared
core `_lib.js` (Notion `DB` map, `queryDb`/`createPage`/`updatePage`, property
readers/writers, and the HMAC session helpers `sign`/`verify`).

| Function | Purpose |
|----------|---------|
| `patient-auth.js`  | Patient login (Stytch Email OTP, with a demo fallback). |
| `hub-content.js`   | Reads the Care Connect Hub Content DB (announcements + resources). |
| `submit-review.js` | Writes patient reviews (ratings + comments), with Google hand-off. |
| `submit-triage.js` | "Just Ask" → the Patient Request Triage Queue. |

> The public **screeners** (`screener.html`) and **intake questionnaires**
> (`bhw-questionnaire.html`) and their submit functions currently still live in
> the `bhwcrewos` repo/deploy. They are patient-facing and could be migrated
> here later; they were left in place to avoid changing the employee deploy's
> proven config during the split.

## Environment variables (Netlify → Site settings → Environment)

Core (required):
- `NOTION_TOKEN` — Notion integration token (share the Data Layer DBs with it).
- `SESSION_SECRET` — HMAC secret for patient session tokens.

Per-function:
- `patient-auth`: `MASTER_DB_ID` (Patients Master List), and Stytch —
  `STYTCH_PROJECT_ID`, `STYTCH_SECRET`, `STYTCH_ENV` (falls back to a demo flow
  if unset).
- `submit-triage`: `QUEUE_DB_ID` (falls back to the built-in queue DB id).
- `hub-content`: `HUB_CONTENT_DB_ID` (falls back to the id in `_lib.js`).
- `submit-review`: `REVIEWS_DB_ID` (falls back to the id in `_lib.js`),
  optional `GOOGLE_REVIEW_URL` for the "leave us a Google review" hand-off.

## Deploy (Netlify)

1. Create a **new** Netlify site from this repo (separate from `bhwcrewos`).
2. Leave the base directory blank; `netlify.toml` sets the build command,
   `app/dist` publish, and `netlify/functions`.
3. Set the environment variables above.
4. In Notion, share the Care Connect / patient DBs with the integration.

## Local dev

```
cd app && npm install && npm run dev      # hub only
# or the whole thing (pages + functions):
npm --prefix app run build && node build-merge.mjs && npx netlify dev
```
