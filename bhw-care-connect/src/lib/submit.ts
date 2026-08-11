import { INTAKE, ROUTES, type Field, type RouteKey } from '../data/triage'
import { config } from '../config'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONE PLACE PATIENT MESSAGES LEAVE THIS APP
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Right now nothing leaves the browser: both functions below are stubs that
 *  resolve locally so the UI can be demoed end to end. To go live, replace the
 *  body of `submitTriage` / `submitVisitNotice` with a call to your intake
 *  endpoint. Nothing in the components needs to change — they only await these
 *  two promises and render whatever comes back.
 *
 *  Before wiring a real endpoint, please note:
 *
 *  • Everything these forms collect is PHI — name, date of birth, symptoms,
 *    medications. It must only be sent to a service covered by a signed BAA,
 *    over TLS. That rules out plain form-mail relays, generic webhook catchers,
 *    analytics tools, and any third party you haven't papered.
 *  • Don't log the payload to a browser console, an error tracker, or an
 *    access log in production. `logForDevelopment` below is dev-only for that
 *    reason.
 *  • The page already tells patients this isn't monitored around the clock.
 *    Whatever queue receives these has to be watched during the hours the
 *    masthead advertises, or the copy needs to change.
 */

export interface TriageSubmission {
  /** Which queue the message routed to. */
  route: RouteKey
  routeLabel: string
  /** What the patient typed in the Just Ask box. */
  freeText: string
  /** Field id → answer, for the intake questions plus this route's questions. */
  answers: Record<string, string>
  submittedAt: string
}

export interface TriageReceipt {
  /** Shown back to the patient so they can reference it when they call. */
  reference: string
}

export interface VisitNotice {
  /** Who was seen — needed so the nurse can pull the right chart. */
  name: string
  /** Callback number — matches the chart and lets the nurse reach the patient. */
  phone: string
  place: string
  when: string
  note: string
  submittedAt: string
}

/**
 * The queue only has a name, a callback number and one free-text Summary, so the
 * structured answers are composed into a readable summary. `name` and `phone`
 * travel as their own fields (the queue matches the chart by phone); everything
 * else — route, SLA, date of birth, per-question answers — goes in the message.
 */
function composeTriageMessage(s: TriageSubmission): string {
  const route = ROUTES.find((r) => r.key === s.route)
  const fields: Field[] = [...INTAKE, ...(route?.fields ?? [])]
  const labelFor = (id: string) => fields.find((f) => f.id === id)?.label ?? id

  const lines: string[] = [`[${s.routeLabel}${route ? ` · ${route.sla}` : ''}]`]
  if (s.freeText.trim()) lines.push(`“${s.freeText.trim()}”`)
  // name and phone are sent as their own fields, not repeated in the body.
  for (const field of fields) {
    if (field.id === 'name' || field.id === 'phone') continue
    const value = s.answers[field.id]?.trim()
    if (value) lines.push(`${labelFor(field.id)}: ${value}`)
  }
  return lines.join('\n')
}

/**
 * POST one intake to the BHWcrewOS `portal-message` function → the Patient
 * Request Triage Queue. PHI leaves the browser only here, only over TLS, only to
 * that BAA-covered endpoint — and is never logged. Throws on any non-OK response
 * so the caller can show its error state.
 */
async function postToQueue(payload: {
  name: string
  phone: string
  message: string
}): Promise<{ ok: boolean; reference?: string; matched?: boolean }> {
  const response = await fetch(config.intakeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `hp` is the endpoint's honeypot — a real patient never sets it.
    body: JSON.stringify({ ...payload, hp: '' }),
  })
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    reference?: string
    matched?: boolean
    error?: string
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Intake failed (${response.status})`)
  }
  return { ok: true, reference: data.reference, matched: data.matched }
}

/**
 * Send a Just Ask message to the care team. Returns the reference the queue
 * assigns (its Request ID) so the patient can quote it when they call.
 */
export async function submitTriage(submission: TriageSubmission): Promise<TriageReceipt> {
  const result = await postToQueue({
    name: submission.answers.name ?? '',
    phone: submission.answers.phone ?? '',
    message: composeTriageMessage(submission),
  })
  return { reference: result.reference ?? '' }
}

/**
 * "Tell us you were seen" — a heads-up to the transition-of-care nurse after an
 * ER, urgent care or hospital visit.
 */
export async function submitVisitNotice(notice: VisitNotice): Promise<void> {
  const detail = [
    `Transition of care — ${notice.place || 'a recent visit'}${notice.when ? `, ${notice.when}` : ''}.`,
    notice.note.trim(),
  ]
    .filter(Boolean)
    .join(' ')
  await postToQueue({ name: notice.name, phone: notice.phone, message: detail })
}
