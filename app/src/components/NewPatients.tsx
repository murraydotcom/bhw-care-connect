import { STEPS } from '../data/newPatient'
import styles from './NewPatients.module.css'

/**
 * Hub teaser for new patients — the three steps, then a link through to the
 * full New Patients page (what to bring, forms, insurance & sliding fee).
 */
export function NewPatients() {
  return (
    <section className={styles.section} aria-labelledby="new-patients-title">
      <div className={styles.head}>
        <p className={styles.eyebrow}>New Patients</p>
        <h3 className={styles.title} id="new-patients-title">
          New to BHW? Start here.
        </h3>
        <p className={styles.lede}>
          Becoming a patient is simple. Here&rsquo;s the short version — the full guide has what to
          bring, our forms, and the insurance we accept.
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

      <a className={styles.cta} href="#/new-patients">
        New patient guide, forms &amp; insurance <span aria-hidden="true">→</span>
      </a>
    </section>
  )
}
