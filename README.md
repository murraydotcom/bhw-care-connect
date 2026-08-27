# BHW Care Connect

The **public, patient-facing** site for BHW Medical Group — a Vite/React hub
(programs, the Personal Health Blueprint, resources, reviews, and Just Ask)
plus a small set of Netlify Functions. Patient requests use the shared
Google/Firestore operations API; remaining content and review functions are
still backed by Notion during the transition.

This repo is **deliberately separate** from the employee side. BHW HQ and
crewOS (the internal ops app, staff tools, front desk, billing) live in the
`bhwcrewos` repo and its own Netlify deploy. Care Connect links to **none** of
them — patients never see an employee surface, and staff tools are never
served from this domain.

## Structure

```
app/                         Vite + React Care Connect hub (the site root, /)
patient/                     Secure patient portal shell copied to /patient/
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
| `patient-auth.js`  | Patient login (Stytch Email/SMS OTP, with an explicitly enabled synthetic preview). |
| `patient-portal.mjs` | Same-origin, patient-session-protected bridge to Health Core's patient-safe read model. |
| `hub-content.js`   | Reads the Care Connect Hub Content DB (announcements + resources). |
| `submit-review.js` | Writes patient reviews (ratings + comments), with Google hand-off. |
| `submit-triage.mjs` | "Just Ask" → signed Google-native patient-request intake. |

> The public **screeners** (`screener.html`) and **intake questionnaires**
> (`bhw-questionnaire.html`) and their submit functions currently still live in
> the `bhwcrewos` repo/deploy. They are patient-facing and could be migrated
> here later; they were left in place to avoid changing the employee deploy's
> proven config during the split.

## Environment variables (Netlify → Site settings → Environment)

Core (required):
- `NOTION_TOKEN` — Notion integration token (share the Data Layer DBs with it).
- `SESSION_SECRET` — HMAC secret for patient session tokens.
- `OPERATIONS_CLOUD_API_URL` — HTTPS base URL for `bhw-operations-api`.
- `CARE_CONNECT_INTAKE_SECRET` — server-only intake credential; mark it secret
  and scope it to Netlify Functions.
- `CARE_CONNECT_PATIENT_IDENTITY_SECRET` — separate server-only credential for
  matching a Stytch-verified direct contact plus DOB to the migrated Google
  patient registry. Do not reuse the intake or Health Core credential.
- `CARE_CONNECT_CLIENT_ID` — optional; defaults to `care-connect`.
- `HEALTH_CORE_API_URL` — HTTPS base URL for the independent, read-only Health Core service.
- `CARE_CONNECT_PATIENT_TOKEN_SECRET` — separate server-only HMAC credential shared only with Health Core's patient portal endpoint. Do not reuse the intake or staff credential.
- `VITE_SECURE_PATIENT_PORTAL_ENABLED` — set to `true` only after Health Core and the Care Connect bridge pass release verification. Until then, Care Connect keeps its current portal link.

Per-function:
- `patient-auth`: the new `/patient/` flow resolves identity through the
  migrated Google registry; legacy portal pages temporarily retain
  `MASTER_DB_ID`. Stytch uses
  `STYTCH_PROJECT_ID`, `STYTCH_SECRET`, `STYTCH_ENV`. Missing Stytch keys fail
  closed unless `ALLOW_DEMO_AUTH=1` is explicitly set for a local or preview
  environment.
- `patient-portal`: validates the current Care Connect patient session, requires
  a canonical `BHW0000`-style patient identifier, then retrieves only the
  patient-safe projection. The dashboard response never includes that
  identifier, and the browser never receives the server-to-server credential.
- `submit-triage`: `/api/patient-requests` sends through the Cloud API. It does
  not fall back to Notion after cutover, preventing duplicate split-system rows.
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

The production Just Ask flow fails closed when Cloud delivery cannot be
confirmed. Local Vite development uses a synthetic `REQ-BHW0000-LOCAL` receipt
so the UI remains testable without sending patient data.

## Secure patient portal release boundary

The `/patient/` shell separates clinical medication state (`active`, `on-hold`,
`stopped`, and related states) from patient request workflow state (`received`,
`clinical-review`, `needs-information`, `waiting-on-payer`,
`sent-to-pharmacy`, `ready`, `completed`). Only tasks explicitly marked
`patientVisible: true` with a patient-safe message can appear. Internal task
titles, staff identities, diagnoses, observations, encounters, DOB, and the
canonical BHW patient identifier are excluded from the browser response.

Health Core is read-only. Future patient check-ins and messages remain write
workflows for the shared operations API. RCM consumes downstream specialist
data and does not own Care Connect's portal pages.
