/**
 * Every place the practice's real-world details appear. Change them here.
 */
const securePatientPortalEnabled = import.meta.env.VITE_SECURE_PATIENT_PORTAL_ENABLED === 'true'

export interface ContactDetails {
  practice: string
  brand: string
  street: string
  cityStateZip: string
  phone: string
  phoneHref: string
  fax: string
  hours: string
  frontDeskHours: string
  openStatus: string
  newsUpdated: string
  crisisLine: string
  baltimoreCrisisResponse: string
  portalUrl: string
  blueprintUrl: string
}

export type PublicSiteInformation = Partial<Pick<ContactDetails,
  'street' | 'cityStateZip' | 'phone' | 'fax' | 'hours' | 'frontDeskHours' | 'openStatus'>>

export const CONTACT: ContactDetails = {
  practice: 'BHW Medical Group',
  brand: 'Baltimore Healthcare & Wellness',
  street: '2131 Maryland Ave',
  cityStateZip: 'Baltimore, MD 21218',
  phone: '443.762.5343',
  phoneHref: 'tel:+14437625343',
  fax: '833.258.3941',
  hours: 'Mon–Thu 8:30–5:00 · Fri 8:30–1:00',
  frontDeskHours: '8:30–4:30',
  /** Shown in the masthead status pill. Wire to real hours when there's a source for it. */
  openStatus: 'Open now · until 5:00',
  /** Date stamp above the announcement list. */
  newsUpdated: 'From the office · updated Jul 30',
  crisisLine: '988',
  baltimoreCrisisResponse: '(410) 433-5175',
  /**
   * The Patient Care Portal — patients sign in here, then land on their
   * profile, care plan, and programs. The Personal Health Blueprint is what
   * they see inside once signed in. Same page, two doors.
   */
  portalUrl: securePatientPortalEnabled ? '/patient/' : 'bhw-patient-portal-mockup.html?next=dashboard',
  blueprintUrl: securePatientPortalEnabled ? '/patient/' : 'bhw-patient-portal-mockup.html',
}

const PUBLIC_KEYS: (keyof PublicSiteInformation)[] = [
  'street',
  'cityStateZip',
  'phone',
  'fax',
  'hours',
  'frontDeskHours',
  'openStatus',
]

/** Apply only the public, approved fields the Website Content contract allows. */
export function applyPublicSiteInformation(
  values: PublicSiteInformation = {},
  publishedAt = '',
) {
  for (const key of PUBLIC_KEYS) {
    const value = typeof values[key] === 'string' ? values[key]!.trim().slice(0, 500) : ''
    if (value) CONTACT[key] = value
  }

  const phoneDigits = CONTACT.phone.replace(/\D/g, '')
  if (phoneDigits.length === 10) CONTACT.phoneHref = `tel:+1${phoneDigits}`
  else if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) CONTACT.phoneHref = `tel:+${phoneDigits}`

  const updated = Date.parse(publishedAt)
  if (Number.isFinite(updated)) {
    const date = new Date(updated).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York',
    })
    CONTACT.newsUpdated = `From the office · updated ${date}`
  }
}
