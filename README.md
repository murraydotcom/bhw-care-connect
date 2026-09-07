# BHW Care Connect

The **public, patient-facing** site for BHW Medical Group — a Vite/React hub
(programs, the Personal Health Blueprint, resources, reviews, and Just Ask)
plus a small set of Netlify Functions. Patient requests and public website
content use the shared Google/Firestore operations API; remaining review
functions are still backed by Notion during the transition.

This repo is **deliberately separate** from the employee side. BHW HQ and
crewOS (the internal ops app, staff tools, front desk, billing) live in the
`bhwcrewos` repo and its own Netlify deploy. Care Connect links to **none** of
them — patients never see an employee surface, and staff tools are never
served from this domain.

## Structure

```
app/                         Vite + React Care Connect hub (the site root, /)
patient/                     Secure portal, shared page registry, and body maps:
  index.html                 Patient overview and passwordless sign-in
  program/                   Reusable, enrollment-gated program page
  system/                    Reusable, Blueprint-gated body-system page
  page-registry.mjs          Stable IDs, aliases, relationships, and detailed content
design-assets/               Source/reference art and archived versions (not deployed)
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
| `hub-content.js`   | Reads published announcements, resources, and practice details from the public Google Operations projection. |
| `submit-review.js` | Writes patient reviews (ratings + comments), with Google hand-off. |
| `submit-triage.mjs` | "Just Ask" → signed Google-native patient-request intake. |
| `patient-checkins.mjs` | Authenticated daily check-in history/save bridge to Health Core. |
| `patient-profile.mjs` | Authenticated profile correction bridge; saves proposed values in Health Core and sends only a review reference to CrewOS. |

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
- `HEALTH_CORE_API_URL` — HTTPS base URL for the independent, patient-safe Health Core service.
- `CARE_CONNECT_PATIENT_TOKEN_SECRET` — separate server-only HMAC credential shared only with Health Core's patient portal endpoint. Do not reuse the intake or staff credential.
- `PATIENT_PORTAL_PILOT_ENABLED` — organization kill switch for real Google-registry patient sign-in; leave unset or `false` until the reviewed adult Primary Care pilot is released.
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
- `patient-checkins`: uses that same signed patient session to retrieve the
  selected program's nutrition targets and 30-day trends or save a bounded
  daily check-in. Patient identity in the browser payload is ignored.
- `patient-profile`: submits only the six approved Registry profile fields,
  binds identity from the signed session, requires an idempotency key, and
  creates a metadata-only clinical review task after Health Core confirms save.
- `submit-triage`: `/api/patient-requests` sends through the Cloud API. It does
  not fall back to Notion after cutover, preventing duplicate split-system rows.
- `hub-content`: uses `OPERATIONS_CLOUD_API_URL`; it sends no credential and can read only the public, published `care-connect` projection.
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

The first real-patient cohort is limited to 5–10 personally selected adult Primary Care patients using self access. Each patient must have exactly one verified direct contact method, DOB, current portal consent evidence, explicit allowlisting, and recorded invitation delivery in CrewHQ. Proxy and guardian access remain disabled. Organization switches in Care Connect, Operations API, and Health Core default off; an individual pause or revocation invalidates an existing session at Health Core. The API can preview generic invitation wording but does not send an invitation.

The `/patient/` shell combines verified specialists with active patient-visible
referrals in the coordinated-care profile card, while keeping completed or
closed referral updates in care-team history. It separates clinical medication
state (`active`, `on-hold`, `stopped`, and related states) from patient request
workflow state. Only requests with an explicit patient-safe message or linked
patient-visible communication can appear. Referral milestones remain distinct:
sent is not ready to schedule, and ready to schedule is not scheduled. Internal task
titles, staff identities, diagnoses, observations, encounters, DOB, and the
canonical BHW patient identifier are excluded from the browser response.

Health Core owns bounded patient check-ins and pending profile correction
requests. Profile values never change directly from the browser: an authorized
BHW clinician must review them first. CrewOS receives a task reference and
field names only; it does not become a second clinical-data store. RCM remains
a downstream specialist consumer and does not own Care Connect's portal pages.

### Living Health Blueprint home

The signed-in `/patient/` experience begins with an interactive, connected
physiology map rather than the printable Blueprint. Patients can switch among
only the body systems their clinician shared, open the approved detailed system
page, review today's care path, and launch Check in, Add vital signs, or View my
summary. Program pages remain distinct and appear below the connected system
map. The legacy printable Blueprint remains a separate, explicit action.

Local and Netlify draft-deploy `?preview=1` testing use synthetic data only. The
host gate does not enable this mode on `mybhw.com` or the canonical Netlify site. Daily-path selections,
synthetic check-ins, and synthetic vital signs are stored under the device-only
`bhw_patient_blueprint_preview_state_v2` browser key, and the interface labels
that state as `Saved on this device only`. Outside local preview, these actions
fail closed and display `Not saved` until the shared operations API provides an
authenticated BHW Cloud write contract. Do not connect this home to the legacy
Notion-backed `checkin-save` function.

### Program and body-system page rules

The secure overview does not infer pages from diagnoses, medications, or RCM
data:

- A program page appears only when a value in dashboard.patient.programs
  resolves to one of the four registered program IDs: primary-care,
  mind-mood, charmed-minds, or flow.
- A body-system page appears only when an entry in dashboard.plan.systems
  resolves to one of the seven registered system IDs: cardiovascular,
  respiratory, digestive, neurological, endocrine, immune-lymphatic, or
  musculoskeletal.
- Legacy labels such as Heart & circulation, blood-vessels-circulation, and
  energy-metabolism are mapped to stable IDs. Unknown labels fail closed and
  never create a route.
- Detail routes reload the same session-protected dashboard and repeat the
  assignment check; knowing a URL is not enough to open an unassigned page.

All patient-facing examples and local preview content use the synthetic
BHW0000 fixture. The body maps are educational artwork and require BHW
clinical approval before a production release.
