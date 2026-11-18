# Medication list and refill requests

myBHW's `/patient/` medication cards and Care Connect's `/bhw-care-card.html` use the same patient-safe Health Core dashboard. A stable opaque reference connects a card to the request form; names and clinical data are not placed in URLs. The form displays name, strength/form, dose, route, frequency, directions and list state when supplied by the record. It never substitutes catalog search results for the patient's actual list.

On send, the existing authenticated medication-request function reloads the current dashboard, rechecks patient access, resolves exactly one patient-scoped medication reference and version, and rejects stale, missing, duplicate or ineligible refill selections. The staff message uses the fresh server-side medication facts, not the browser's drug name or patient ID. The opaque reference/version are preserved in `routing.downstreamReference` by the existing operations intake. Unlisted medicines are labeled as patient reports needing review. Current versus stopped medicines remain distinct; questions about an old medicine can still be submitted.

The existing review, manual-notification and idempotency boundaries remain. A request is not a prescription or medication-list edit. Netlify previews and branch deployments must remain skipped during source review (`[skip netlify]` in PR title and commit). This change does not change domains, sign-in, runtime configuration, patient access or deployment.

Requires the companion Health Core update. Its `PATIENT_MEDICATION_REFILL_LINK_ENABLED` setting defaults off. After explicit approval, first verify the combined services using BHW0000 with `SYNTHETIC_ONLY=true`. Production and real-patient activation require a separate decision.

Run: `node --test test/care-card-requests.test.mjs test/patient-portal-cloud.test.mjs test/medication-refill-links.test.mjs`.
