/**
 * The two knobs that were "Tweaks" in the design prototype. Defaults match the
 * design the practice signed off on.
 */

/** Announcement box treatment in the masthead. */
export type AnnouncementStyle = 'sage' | 'violet' | 'card' | 'stone' | 'gold' | 'blue'

export const config = {
  /** Soft sage with a tinted edge — the chosen default. */
  announcementStyle: 'sage' as AnnouncementStyle,
  /** Show the partner discount codes on Ask NP Am recommendations. */
  showAffiliateCodes: true,
  /**
   * Where the intake forms POST. This is the BHWcrewOS `portal-message`
   * function, which drops one row into the Patient Request Triage Queue that
   * Front Desk OS and the Patient Requests board read. It's a separate deploy,
   * so this is a full cross-origin URL (the endpoint allows *.netlify.app).
   * Override per environment with VITE_INTAKE_URL.
   */
  intakeUrl:
    import.meta.env.VITE_INTAKE_URL ||
    'https://bhwcrewos.netlify.app/.netlify/functions/portal-message',
}
