import crypto from 'node:crypto';
import { verifyCareConnectPatientSession } from './patient-session.mjs';
import { createCloudIntake, env, intakeConfigured } from './operations.mjs';
import { createPatientPortalHandler } from '../patient-portal.mjs';

const TYPES = { refill: 'Refill request', pharmacy: 'Pharmacy problem', question: 'Medication question', side: 'Reported side effect', change: 'Medication change question' };
const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';

export function createCareCardRequestsHandler({ secret = () => env('SESSION_SECRET'), configured = intakeConfigured, queue = createCloudIntake, dashboard = createPatientPortalHandler(), now = Date.now } = {}) {
  return async request => {
    if (request.method !== 'POST') return json(405, { error: 'POST only' });
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const session = verifyCareConnectPatientSession(token, secret(), now());
    if (!session?.bhwPatientId) return json(401, { error: 'Please sign in again.' });
    if (!configured()) return json(503, { error: 'Medication requests are not connected. Please call the office.' });
    const key = request.headers.get('idempotency-key') || '';
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,100}$/.test(key)) return json(400, { error: 'A request reference is required.' });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16000) return json(413, { error: 'Your message is too long.' });
    let body;
    try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid request.' }); }
    if (!body || !Object.hasOwn(TYPES, body.type)) return json(400, { error: 'Choose what you need.' });
    const medication = clean(body.medication, 500), pharmacy = clean(body.pharmacy, 300), message = clean(body.message, 2500), remaining = clean(body.remaining, 80);
    if (!medication || !message) return json(400, { error: 'Enter the medication and what you need.' });
    try {
      // Recheck current patient access with Health Core before writing; do not trust a browser patient ID.
      const access = await dashboard(new Request(new URL('/api/patient-portal/dashboard', request.url), { headers: { Authorization: `Bearer ${token}` } }));
      if (!access.ok) return json(access.status, { error: 'Your patient access could not be confirmed. Please sign in again or call the office.' });
      const digest = crypto.createHash('sha256').update(`${session.bhwPatientId}:${key}`).digest('hex');
      const result = await queue({ submissionId: `care-card:${digest}`, body: {
        bhwPatientId: session.bhwPatientId, patientMatchStatus: 'matched', requestType: 'medication',
        priority: body.type === 'side' ? 'urgent' : 'high',
        summary: TYPES[body.type],
        message: [`Patient-reported medication: ${medication}`, `Request: ${TYPES[body.type]}`, remaining && `Amount left: ${remaining}`, pharmacy && `Pharmacy: ${pharmacy}`, message].filter(Boolean).join('\n'),
        requester: { preferredChannel: 'portal' }, source: 'care-connect', manualNotifyOnly: true, notificationMode: 'none',
        routing: { targetSystem: 'crewos', assignedTeam: 'clinical', ownerRole: 'provider' },
        sourceMetadata: { sourceRecordId: `care-card:${digest}`, sourcePage: 'care-connect-care-card', medicationRequestType: body.type },
      }});
      const reference = result?.patientRequest?.patientRequestId;
      if (!reference) throw new Error('No saved reference');
      return json(200, { ok: true, reference, replayed: Boolean(result.replayed) });
    } catch {
      return json(502, { error: 'We could not confirm your request was saved. Retry with the same details or call the office.' });
    }
  };
}
