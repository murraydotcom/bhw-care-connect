import { CONTACT } from '../data/contact'
import {
  FIRST_VISIT_PREP,
  FORMS,
  PLANS_ACCEPTED,
  PLANS_NOT_ACCEPTED,
  STEPS,
  WHAT_TO_BRING,
} from '../data/newPatient'
import styles from './NewPatientsPage.module.css'

interface NewPatientsPageProps {
  onBack: () => void
}

export function NewPatientsPage({ onBack }: NewPatientsPageProps) {
  return (
    <main className="page" id="main">
      <div className={styles.backRow}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Back to Care Connect
        </button>
      </div>

      <section className={styles.hero} aria-labelledby="np-title">
        <p className={styles.eyebrow}>New Patients</p>
        <h1 className={styles.heroTitle} id="np-title">
          New to BHW? Welcome.
        </h1>
        <p className={styles.heroBody}>
          Becoming a patient is simple. Here&rsquo;s everything you need — from first call to first
          visit — including what to bring, the forms we&rsquo;ll ask you to fill out, and the
          insurance we accept.
        </p>
        <div className={styles.heroActions}>
          <a className={styles.cta} href={CONTACT.phoneHref}>
            Call {CONTACT.phone}
          </a>
          <a className={styles.ctaGhost} href="/#/">
            Ask us a question
          </a>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="np-steps">
        <h2 className={styles.h2} id="np-steps">
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li className={styles.step} key={step.num}>
              <span className={styles.num} aria-hidden="true">
                {step.num}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.twoUp}>
        <section className={styles.panel} aria-labelledby="np-bring">
          <h2 className={styles.h2} id="np-bring">
            What to bring
          </h2>
          <ul className={styles.checkList}>
            {WHAT_TO_BRING.map((item) => (
              <li className={styles.checkItem} key={item}>
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="np-prep">
          <h2 className={styles.h2} id="np-prep">
            First-visit prep
          </h2>
          <ul className={styles.prepList}>
            {FIRST_VISIT_PREP.map((item) => (
              <li className={styles.prepItem} key={item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="np-forms">
        <div className={styles.formsHead}>
          <h2 className={styles.h2} id="np-forms">
            New patient forms
          </h2>
          <p className={styles.note}>
            Downloadable forms are on the way. For now, we&rsquo;ll have these ready at your first
            visit or email them ahead — just{' '}
            <a className={styles.link} href={CONTACT.phoneHref}>
              call {CONTACT.phone}
            </a>
            .
          </p>
        </div>
        <ul className={styles.forms}>
          {FORMS.map((form) => (
            <li className={styles.form} key={form.label}>
              <div className={styles.formText}>
                <span className={styles.formLabel}>{form.label}</span>
                <span className={styles.formNote}>{form.note}</span>
              </div>
              {form.href ? (
                <a className={styles.formLink} href={form.href} target="_blank" rel="noopener">
                  Download →
                </a>
              ) : (
                <span className={styles.formSoon}>Coming soon</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel} aria-labelledby="np-insurance">
        <div className={styles.insHead}>
          <h2 className={styles.h2} id="np-insurance">
            Insurance we accept
          </h2>
          <p className={styles.note}>
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
          <h3 className={styles.slidingTitle}>Paying out of pocket? Sliding-fee discount</h3>
          <p className={styles.slidingBody}>
            We offer a sliding-fee discount based on your household size and income, following the
            federal poverty guidelines — a reduced or nominal charge for those who qualify.{' '}
            <strong>No one is turned away for inability to pay.</strong> Ask the front desk to see
            if you qualify and to request an application.
          </p>
        </div>
      </section>
    </main>
  )
}
