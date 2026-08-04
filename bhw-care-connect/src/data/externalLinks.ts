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

/**
 * The full set of patient-facing destinations — the single place they're all
 * registered so nothing is missed. The journey:
 *
 *   Care Connect hub (public)
 *     → Patient Portal login (phone / email)
 *       → Patient profile (signed-in home)
 *         → per program: Program page  +  Individualized plan (that program's Blueprint)
 *
 *   New patients: hub → New Patient page (public intake, no sign-in).
 */
export const EXTERNAL_LINKS = {
  // ── Public (BHWcrewOS) ──────────────────────────────────────────────
  /** Care Connect hub + reviews section. */
  hub: PATIENT_SITE,
  /** Patient Portal — the sign-in page (log in by phone or email). After a real
   *  login this would hand off to `patientProfile` below. */
  patientPortalLogin: `${PATIENT_SITE}/bhw-patient-portal-mockup.html`,

  // ── Program pages (BHWcrewOS), each with its review card ─────────────
  /** Reached from a patient's profile, and linked beside each program's plan. */
  charmedMinds: `${PATIENT_SITE}/bhw-charmed-patient-mockup.html`,
  mindMood: `${PATIENT_SITE}/bhw-mindmood-patient-mockup.html`,
  flow: `${PATIENT_SITE}/bhw-flow-patient-mockup.html`,

  // ── In-app pages (this repo's public/ folder) ───────────────────────
  /** Public, pre-visit New Patient landing — intake questionnaire + upload. No sign-in. */
  newPatient: IN_APP('bhw-new-patient-mockup.html'),

  /**
   * The **signed-in patient profile** — the page a patient lands on after
   * sign-in. Lists demographics, care team, allergies, medications, supplements,
   * recommended nutrition & movement, next visit, special notifications, the
   * daily check-in, and the programs they're enrolled in. Sign-in, the hub's
   * program cards and every Blueprint link resolve here.
   */
  patientProfile: IN_APP('bhw-patient-home-mockup.html'),
  /** Back-compat alias — same destination as `patientProfile`. */
  patientPortal: IN_APP('bhw-patient-home-mockup.html'),

  /**
   * A program's **individualized plan** — the Personal Health Blueprint made for
   * one program (goals, measurements, trends, recommendations). Opened from the
   * profile's "Individualized plan" link box beside each program. One shared page
   * for now; split into a per-program file when each program's plan diverges.
   */
  carePlan: IN_APP('bhw-blueprint-portal-mockup.html'),
} as const
