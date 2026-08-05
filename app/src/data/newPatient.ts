/**
 * Content for the New Patients page. The insurance lists are the practice's
 * real accepted-plans sheet. FORMS is a PLACEHOLDER list — wire each to a real
 * PDF (or an online form) when the documents are ready.
 */

export const STEPS = [
  {
    num: '01',
    title: 'Reach out',
    body: "Call us or use Just Ask to tell us what you need. We'll help you pick the right program and book your first visit.",
  },
  {
    num: '02',
    title: 'Insurance & coverage',
    body: 'Share your insurance and we’ll verify it before your visit. Paying out of pocket? Ask about our sliding-fee discount.',
  },
  {
    num: '03',
    title: 'Your first visit',
    body: 'Bring the essentials below, and plan for about an hour so we can get the full picture.',
  },
] as const

/** What to bring to a first visit. */
export const WHAT_TO_BRING = [
  'A photo ID (driver’s license or state ID)',
  'Your insurance card(s)',
  'A list of your current medications and doses — or bring the bottles',
  'The names of your current doctors and your pharmacy',
  'Any recent test results or records you already have',
  'Your copay, if your plan has one',
  'For a minor: a parent or legal guardian',
] as const

/** First-visit prep tips. */
export const FIRST_VISIT_PREP = [
  'Arrive about 15 minutes early to finish paperwork — or fill your forms out ahead of time.',
  'Plan for roughly an hour for your first appointment.',
  'For a telehealth visit, test your camera and mic and find a quiet, private spot.',
  'Jot down your questions and your main concern so nothing gets missed.',
  'You’re welcome to bring someone with you.',
] as const

/**
 * New-patient paperwork. PLACEHOLDER — set `href` to the real PDF/online form
 * when available. Until then they render as "coming soon".
 */
export interface PatientForm {
  label: string
  note: string
  href?: string
}

export const FORMS: PatientForm[] = [
  { label: 'Patient registration', note: 'Your contact, insurance, and emergency details.' },
  { label: 'Medical history questionnaire', note: 'Conditions, medications, allergies, and family history.' },
  {
    label: 'Notice of Privacy Practices (HIPAA) & consent',
    note: 'How we protect your information, and your consent to treat.',
  },
  {
    label: 'Authorization to release records',
    note: 'Lets us request records from your previous providers.',
  },
  {
    label: 'Sliding-fee discount application',
    note: 'Only if you’re paying out of pocket and want to apply.',
  },
]

/** From the practice's "We accept the following insurance plans" sheet. */
export const PLANS_ACCEPTED = [
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
export const PLANS_NOT_ACCEPTED = ['Wellpoint', 'Aetna Better Health', 'Priority Partners'] as const
