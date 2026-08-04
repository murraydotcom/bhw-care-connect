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
  /**
   * Program pages on BHWcrewOS, each with its own review card. These live
   * **behind sign-in** — a patient reaches them from their Blueprint profile,
   * NOT from the public hub. The hub's program cards route to `patientPortal`;
   * these URLs are linked from the Blueprint dashboard's "Your programs" section.
   */
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
   * The **signed-in patient home** — the tiled landing after sign-in (check-in,
   * care team, medications, next visit, notifications … and the care plan). This
   * is where sign-in, the hub's program cards, and every Blueprint link land.
   * Ships in this app (`public/bhw-patient-home-mockup.html`).
   */
  patientPortal: IN_APP('bhw-patient-home-mockup.html'),

  /**
   * The **Personal Health Blueprint = the care plan** — goals, measurements,
   * trends and the recommendations behind them. It sits *under* the home (the
   * home's "Personal Health Blueprint" tile opens it), not at the top level.
   * Ships in this app (`public/bhw-blueprint-portal-mockup.html`).
   */
  carePlan: IN_APP('bhw-blueprint-portal-mockup.html'),
} as const
