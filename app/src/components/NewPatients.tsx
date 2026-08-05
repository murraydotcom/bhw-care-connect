import { CONTACT } from '../data/contact'
import styles from './NewPatients.module.css'

/**
 * New-patient onramp. PLACEHOLDER COPY — confirm the real details (plans
 * accepted, sliding-scale policy, what to bring) with the practice before
 * this goes live.
 */
const STEPS = [
  {
    num: '01',
    title: 'Reach out',
    body: `Call us at ${CONTACT.phone} or use Just Ask above to tell us what you need. We'll help you pick the right program and book your first visit.`,
  },
  {
    num: '02',
    title: 'Insurance & coverage',
    body: 'We accept most major insurance plans, and a sliding-scale option is available if you’re paying out of pocket. Ask us and we’ll check your coverage before your visit.',
  },
  {
    num: '03',
    title: 'Your first visit',
    body: 'Bring a photo ID, your insurance card, and a list of your current medications. Plan for about an hour so we can get the full picture.',
  },
] as const

export function NewPatients() {
  return (
    <section className={styles.section} aria-labelledby="new-patients-title">
      <div className={styles.head}>
        <p className={styles.eyebrow}>New Patients</p>
        <h3 className={styles.title} id="new-patients-title">
          New to BHW? Start here.
        </h3>
        <p className={styles.lede}>
          Becoming a patient is simple. Here&rsquo;s what to expect from first call to first
          visit.
        </p>
      </div>

      <ol className={styles.grid}>
        {STEPS.map((step) => (
          <li className={styles.card} key={step.num}>
            <span className={styles.num} aria-hidden="true">
              {step.num}
            </span>
            <h4 className={styles.cardTitle}>{step.title}</h4>
            <p className={styles.cardBody}>{step.body}</p>
          </li>
        ))}
      </ol>

      <p className={styles.foot}>
        Questions before you start?{' '}
        <a className={styles.link} href={CONTACT.phoneHref}>
          Call {CONTACT.phone}
        </a>{' '}
        or use Just Ask above.
      </p>
    </section>
  )
}
