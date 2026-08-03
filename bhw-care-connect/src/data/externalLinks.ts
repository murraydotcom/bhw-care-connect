/**
 * Patient-facing pages that live in the separate BHWcrewOS site, not in this
 * app. Care Connect links out to them from the program cards, the Health
 * Blueprint, and the footer.
 *
 * ⚠️ These currently point at a Netlify **deploy preview**
 * (`deploy-preview-3--bhwcrewos.netlify.app`). A deploy preview is per-pull-
 * request and ephemeral — it goes away when that PR is merged or closed, and
 * every one of these links breaks with it. Before this ships, swap
 * `PATIENT_SITE` for the production host (the primary `bhwcrewos.netlify.app`
 * deploy, or the real `bhwmedical.org` path). Nothing else needs to change.
 */
const PATIENT_SITE = 'https://deploy-preview-3--bhwcrewos.netlify.app'

export const EXTERNAL_LINKS = {
  /** Care Connect hub + reviews section on the BHWcrewOS site. */
  hub: PATIENT_SITE,
  /** Personal Health Blueprint — login by phone or email. Never "patient portal". */
  patientPortal: `${PATIENT_SITE}/bhw-patient-portal-mockup.html`,
  /** Program pages, each with its own review card. */
  charmedMinds: `${PATIENT_SITE}/bhw-charmed-patient-mockup.html`,
  mindMood: `${PATIENT_SITE}/bhw-mindmood-patient-mockup.html`,
  flow: `${PATIENT_SITE}/bhw-flow-patient-mockup.html`,
  /**
   * Primary Care's page ships **inside this app** (`public/bhw-primarycare-patient-mockup.html`),
   * so it's served from Care Connect's own origin — a base-relative URL keeps it
   * working whether the app sits at a domain root or a sub-path. If you'd rather
   * all four programs share the BHWcrewOS host, move that file beside its siblings
   * and swap this for `${PATIENT_SITE}/bhw-primarycare-patient-mockup.html`.
   */
  primaryCare: `${import.meta.env.BASE_URL}bhw-primarycare-patient-mockup.html`,
} as const
