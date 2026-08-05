import { CONTACT } from '../data/contact'
import styles from './PortalCallout.module.css'

/**
 * The returning-patient door on the hub. Leads to the Patient Care Portal,
 * which opens on its sign-in screen, then the patient's profile, care plan,
 * and programs.
 */
export function PortalCallout() {
  return (
    <section className={styles.callout} aria-labelledby="portal-callout-title">
      <div className={styles.text}>
        <p className={styles.eyebrow}>Already a patient?</p>
        <h3 className={styles.title} id="portal-callout-title">
          Your Patient Care Portal
        </h3>
        <p className={styles.body}>
          Sign in to see your profile, your care plan and this week&rsquo;s focus, your
          programs, and messages from your BHW care team — all in one place.
        </p>
        <div className={styles.actions}>
          <a className={styles.cta} href={CONTACT.portalUrl}>
            Sign in to the portal <span aria-hidden="true">→</span>
          </a>
          <p className={styles.fine}>
            Passwordless sign-in — we email you a 6-digit code. Use the email your care team
            has on file, or call {CONTACT.phone}.
          </p>
        </div>
      </div>
    </section>
  )
}
