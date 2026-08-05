import { CONTACT } from '../data/contact'
import styles from './NewPatients.module.css'

/**
 * New-patient onramp. The step copy is a friendly summary; the insurance list
 * below is the practice's real accepted-plans sheet. Sliding-fee wording
 * follows HRSA's Sliding Fee Discount Program (income + household size against
 * the Federal Poverty Guidelines; no one turned away for inability to pay).
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
    body: 'Bring your insurance card and we’ll verify your plan before your visit. See the plans we accept below — and if you’re paying out of pocket, ask about our sliding-fee discount.',
  },
  {
    num: '03',
    title: 'Your first visit',
    body: 'Bring a photo ID, your insurance card, and a list of your current medications. Plan for about an hour so we can get the full picture.',
  },
] as const

/** From the practice's "We accept the following insurance plans" sheet. */
const PLANS_ACCEPTED = [
  'Maryland Medicaid',
  'Maryland Medicare',
  'UnitedHealthcare — Community Health Plan',
  'UnitedHealthcare — Commercial',
  'CareFirst — Commercial (BlueCross BlueShield)',
  'CareFirst — Community Health Plan & Medicare Advantage',
  'Humana',
  'Alterwood Advantage',
  'Aetna Medicare Advantage',
  'Maryland Physicians Care',
  'Cigna Healthcare',
] as const

/** Plans the practice does not accept — listed so new patients aren't surprised. */
const PLANS_NOT_ACCEPTED = ['Wellpoint', 'Aetna Better Health', 'Priority Partners'] as const

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

      <div className={styles.insurance}>
        <div className={styles.insHead}>
          <h4 className={styles.insTitle}>Insurance we accept</h4>
          <p className={styles.insNote}>
            Not sure about your plan?{' '}
            <a className={styles.link} href={CONTACT.phoneHref}>
              Call {CONTACT.phone}
            </a>{' '}
            and we&rsquo;ll check before your visit.
          </p>
        </div>

        <ul className={styles.plans}>
          {PLANS_ACCEPTED.map((plan) => (
            <li className={styles.plan} key={plan}>
              <span className={styles.check} aria-hidden="true">
                ✓
              </span>
              {plan}
            </li>
          ))}
        </ul>

        <p className={styles.notAccepted}>
          <strong>Not accepted:</strong> {PLANS_NOT_ACCEPTED.join(' · ')}
        </p>

        <div className={styles.sliding}>
          <h4 className={styles.slidingTitle}>Paying out of pocket? Sliding-fee discount</h4>
          <p className={styles.slidingBody}>
            We offer a sliding-fee discount based on your household size and income, following
            the federal poverty guidelines — a reduced or nominal charge for those who qualify.{' '}
            <strong>No one is turned away for inability to pay.</strong> Ask the front desk to
            see if you qualify and to request an application.
          </p>
        </div>
      </div>

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
