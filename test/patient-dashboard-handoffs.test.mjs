import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPatientPortalHandler } from '../netlify/functions/patient-portal.mjs';
const claims = { kind: 'patient', patientAuthVersion: 2, bhwPatientId: 'BHW0000', schemaVersion: 'bhw.patient-portal-access.v1', accessType: 'self', proxyAccessAllowed: false,
  pilotCohort: 'primary-care-adult-v1', programs: ['primary'], portalAccessStatus: 'active', preferredChannel: 'email', verifiedChannel: 'email', contactVerifiedAt: new Date().toISOString(),
  consentedAt: new Date().toISOString(), portalInvitedAt: new Date().toISOString(), authorizationUpdatedAt: new Date().toISOString(), exp: Date.now() + 60000 };
const payload = Buffer.from(JSON.stringify(claims)).toString('base64url'); const token = payload + '.' + crypto.createHmac('sha256', 'synthetic-session-secret').update(payload).digest('base64url');
const env = { SESSION_SECRET: 'synthetic-session-secret', CARE_CONNECT_PATIENT_TOKEN_SECRET: 'synthetic-patient-secret', HEALTH_CORE_API_URL: 'https://health.example.test' };
const request = () => new Request('https://care.example.test/api/patient-portal/dashboard', { headers: { Authorization: 'Bearer ' + token } });
test('dashboard handoff stays bound to the patient session and rejects credential-bearing URLs and redirects', async () => {
  let observed;
  const handler = createPatientPortalHandler({ environment: env, fetchImpl: async (url, init) => { observed = { url, init }; return Response.json({ ok: true, dashboard: { labReports: [], visitSummaries: [] } }); } });
  const response = await handler(request()); assert.equal(response.status, 200); assert.equal(observed.url, 'https://health.example.test/v1/patient-portal/BHW0000/dashboard');
  assert.equal(observed.init.redirect, 'error'); assert.equal(observed.init.cache, 'no-store'); assert.equal(response.headers.get('cache-control'), 'no-store, private');
  for (const HEALTH_CORE_API_URL of ['https://user:secret@health.example.test', 'https://health.example.test?token=unsafe', 'https://health.example.test/other-path', 'https://health.example.test#fragment']) {
    let called = false; const denied = createPatientPortalHandler({ environment: { ...env, HEALTH_CORE_API_URL }, fetchImpl: async () => { called = true; } });
    assert.equal((await denied(request())).status, 503); assert.equal(called, false);
  }
});
