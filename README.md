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
  bhw-care-app-demo.html        Care Connect app demo (Opal & Ironstone)
assets/                      Brand tokens (bhw-tokens.css) + logos
  opal-ironstone/                   "Opal & Ironstone" patient design system
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

## Design system — "Opal & Ironstone"

`assets/opal-ironstone/` is the patient-facing design system, imported verbatim
from its Claude Design project. Link `styles.css` and the tokens and components
come with it:

```html
<link rel="stylesheet" href="assets/opal-ironstone/styles.css">
```

```
opal-ironstone/
  styles.css          Components (.card, .btn, .badge, .alert, .input, .plan-item…)
  tokens/tokens.css   Semantic tokens — colour, type, space, radius, shadow, motion
  tokens/fonts.css    Playfair Display + Caveat, self-hosted (woff2 data URIs)
```

Style with the semantic tokens (`var(--bg)`, `var(--fg)`, `var(--accent)`) rather
than the raw palette, and light/dark handle themselves: the tokens follow the
OS setting, or a `data-theme="light" | "dark"` pinned on `<html>`. Montserrat and
Lora are not bundled — load them in the page (see
`pages/bhw-care-app-demo.html`).

`assets/bhw-tokens.css` is the older, separate token set the health dashboards
use; the two are independent.

## Prototypes

`pages/bhw-care-app-demo.html` is the Care Connect patient app prototype —
an iOS frame around five tabs (Today, Plan, Food, Check in, More) plus Trends,
Labs, Questions and Messages, with a care-team layer that reveals the clinical
detail (coding, contraindications, raw values) over the patient view. It reads
three query parameters, so a specific state can be linked or screenshotted:

| Parameter | Values | Default |
|-----------|--------|---------|
| `screen`  | `today` `plan` `food` `check` `more` `trends` `labs` `questions` `messages` | `today` |
| `care`    | `1` to open in the care-team view | patient view |
| `theme`   | `light` `dark` | the visitor's OS setting |

Avery is a fictional patient. The plan, medicines and results are illustrative:
lab values are described qualitatively rather than given as numbers, drug names
are generalised, and the coding panel shows example codes only. Nothing here
belongs to a real person, and nothing patient-identifying should be added to it —
this page ships to a public deploy.

**What actually works.** Navigation, the care-team layer and the theme are
real. So are the four interactions that used to be dead buttons — all of them
local to the page, resetting on refresh:

- **Log a meal** opens a manual entry panel (protein / fiber / fluids / plants)
  and adds it to one nutrition store, so the Food rings and the Today summary
  move together. Each logged meal can be undone.
- **Mark as taken** toggles, **Send** appends to the message thread, and
  **Add your own question** appends a checked row.
- **Send today's check-in** reports what genuinely happened — `Recorded on this
  device`, with the answered count — rather than claiming it was sent.

**Wiring it to the real backend.** The endpoints already exist, built for
`pages/bhw-checkin.html`: `checkin-save.js` (writes 🩺 Care Check-ins — Data),
`checkin-history.js` (the series behind Trends, plus per-patient nutrient
targets from the Care Plan) and `food-vision.js` ("Snap your plate" — photo to
estimated macros, patient confirms). The prototype does **not** call them, for
two reasons worth knowing before you flip it on:

1. `checkin-save` falls back to a hard-coded DB id (`_lib.js` `DB.checkins`), so
   it always writes to the live table. This page is public, unauthenticated and
   has a hard-coded sample patient, so every submit would land as an identical
   junk row.
2. The seven questions here (sleep, thinking, energy, mood, bowels, pain,
   anything-new) are a **different instrument** from `checkin-save`'s
   `well:{feeling, motivation, sleep, movement, outside, connection, nutrition}`
   plus `symptoms[]`. Mapping them is a clinical decision, not a rename.

The seam is one function — `submitCheckin()` in the page — which returns the
same `{ ok, stored }` shape `checkin-save` does. The alert already keys off
`stored`, so it starts telling the truth about a real submission with no
further change.

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
