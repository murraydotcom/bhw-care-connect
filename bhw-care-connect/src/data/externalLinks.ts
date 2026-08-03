/**
 * Patient-facing destinations Care Connect links out to — from the program
 * cards, the Health Blueprint, and the footer.
 *
 * Two kinds live here:
 *  1. Pages on the separate **BHWcrewOS** site (`PATIENT_SITE`).
 *  2. Pages that ship **inside this app** (`public/…`), referenced with a
 *     base-relative URL so they work at a domain root or a sub-path.
 *
 * ⚠️ The BHWcrewOS links point at a Netlify **deploy preview**
 * (`deploy-preview-3--bhwcrewos.netlify.app`). A deploy preview is per-pull-
 * request and ephemeral — it goes away when that PR is merged or closed, and
 * every one of those links breaks with it. Before this ships, swap
 * `PATIENT_SITE` for the production host (the primary `bhwcrewos.netlify.app`
 * deploy, or the real `bhwmedical.org` path). Nothing else needs to change.
 */
const PATIENT_SITE = 'https://deploy-preview-3--bhwcrewos.netlify.app'

/** Pages served from this app's own `public/` folder. */
const IN_APP = (file: string) => `${import.meta.env.BASE_URL}${file}`

export const EXTERNAL_LINKS = {
  /** Care Connect hub + reviews section on the BHWcrewOS site. */
  hub: PATIENT_SITE,
  /** Program pages on BHWcrewOS, each with its own review card. */
  charmedMinds: `${PATIENT_SITE}/bhw-charmed-patient-mockup.html`,
  mindMood: `${PATIENT_SITE}/bhw-mindmood-patient-mockup.html`,
  flow: `${PATIENT_SITE}/bhw-flow-patient-mockup.html`,

  /**
   * New Patient page — the public, pre-visit landing for Primary Care with the
   * intake questionnaire and document upload. **No sign-in.** Ships in this app
   * (`public/bhw-new-patient-mockup.html`); move it to the BHWcrewOS host and
   * swap for `${PATIENT_SITE}/…` if you'd rather it live beside the others.
   */
  newPatient: IN_APP('bhw-new-patient-mockup.html'),

  /**
   * Personal Health Blueprint — the **signed-in** patient dashboard
   * (measurements, trends, and subjective/objective goals). Never call it a
   * "patient portal". Ships in this app (`public/bhw-blueprint-portal-mockup.html`).
   * The BHWcrewOS version is at `${PATIENT_SITE}/bhw-patient-portal-mockup.html`
   * if you'd rather point back to it.
   */
  patientPortal: IN_APP('bhw-blueprint-portal-mockup.html'),
} as const
