import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createPatientCheckinsHandler } from "../netlify/functions/patient-checkins.mjs";
import { vitalsCheckinPayload } from "../patient/vitals-form.mjs";

const NOW = Date.parse("2026-08-30T12:00:00.000Z");
const SESSION_SECRET = "synthetic-session-secret";
const PATIENT_SECRET = "synthetic-patient-secret";
const ENV = {
  SESSION_SECRET,
  HEALTH_CORE_API_URL: "https://health-core.synthetic.test/",
  CARE_CONNECT_PATIENT_TOKEN_SECRET: PATIENT_SECRET,
};

function sessionToken(overrides = {}) {
  const claims = {
    kind: "patient", patientAuthVersion: 2,
    bhwPatientId: "BHW0000",
    schemaVersion: "bhw.patient-portal-access.v1",
    accessType: "self",
    proxyAccessAllowed: false,
    pilotCohort: "primary-care-adult-v1",
    programs: ["primary"],
    portalAccessStatus: "active",
    preferredChannel: "email",
    verifiedChannel: "email",
    contactVerifiedAt: new Date(NOW).toISOString(),
    consentedAt: new Date(NOW).toISOString(),
    portalInvitedAt: new Date(NOW).toISOString(),
    authorizationUpdatedAt: new Date(NOW).toISOString(),
    exp: NOW + 60_000,
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

const auth = (token = sessionToken()) => ({ Authorization: `Bearer ${token}` });

test("standalone vitals go to the signed BHW0000 Health Core route; operations receives review metadata only", async () => {
  const payload = vitalsCheckinPayload({ systolic: "124", diastolic: "82", pulse: "74", weight: "165.5", oxygen: "97", temperature: "98.6" }, "flow", "2026-08-30", { submissionId: "synthetic-vitals-0001", recordedAt: "2026-08-30T12:00:00.000Z" });
  let clinicalRecord;
  let queued;
  const handler = createPatientCheckinsHandler({
    environment: ENV,
    now: () => NOW,
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/check-ins/vitals");
      const token = options.headers.Authorization.replace(/^Bearer /, "");
      const [claims, signature] = token.split(".");
      assert.equal(signature, crypto.createHmac("sha256", PATIENT_SECRET).update(claims).digest("base64url"));
      const identity = JSON.parse(Buffer.from(claims, "base64url").toString());
      assert.equal(identity.bhwPatientId, "BHW0000");
      assert.equal(identity.role, "patient-portal");
      assert.equal(identity.exp - identity.iat, 60);
      clinicalRecord = JSON.parse(options.body);
      return Response.json({ ok: true, savedAt: "2026-08-30T12:00:01.000Z", submissionId: payload.submissionId, recordedAt: payload.recordedAt, monitoring: {
        checkInId: "2026-08-30-flow", program: "flow", checkInDate: "2026-08-30", submittedAt: "2026-08-30T12:00:01.000Z",
        reviewPriority: "routine", signalCount: 0,
        // Even unexpected upstream clinical fields must not enter Operations.
        vitals: payload.vitals, summary: "Synthetic clinical narrative", symptoms: ["Synthetic symptom"],
      } });
    },
    queueImpl: async (input) => { queued = input; return { patientRequest: { id: "synthetic-vitals-review" } }; },
  });
  const response = await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
    method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(clinicalRecord.vitals, payload.vitals);
  assert.equal(clinicalRecord.program, "flow");
  assert.equal(clinicalRecord.patient, undefined);
  assert.equal(clinicalRecord.well, undefined);
  assert.equal(clinicalRecord.foods, undefined);
  assert.equal(queued.submissionId, `care-connect-checkin:BHW0000:2026-08-30-flow:${payload.submissionId}`);
  assert.deepEqual(Object.keys(queued.body.sourceMetadata).sort(), ["reviewPriority", "signalCount", "sourcePage", "sourceRecordId"]);
  assert.equal(queued.body.sourceReference, "2026-08-30-flow");
  assert.equal(queued.body.notificationMode, "none");
  assert.equal(queued.body.routing.ownerRole, "provider");
  for (const key of ["vitals", "well", "nutrition", "symptoms", "foods", "medicationsTaken"]) assert.equal(queued.body[key], undefined);
  assert.doesNotMatch(JSON.stringify(queued), /124\/82|165\.5|98\.6|clinical narrative|Synthetic symptom/);
  assert.deepEqual(await response.json(), { ok: true, savedAt: "2026-08-30T12:00:01.000Z", queueReference: "synthetic-vitals-review", submissionId: payload.submissionId, recordedAt: payload.recordedAt, replayed: false });
});

test("standalone vitals cannot reach Health Core or operations with an expired or forged session", async () => {
  let calls = 0;
  const handler = createPatientCheckinsHandler({ environment: ENV, now: () => NOW,
    fetchImpl: async () => { calls += 1; return Response.json({ ok: true }); },
    queueImpl: async () => { calls += 1; return {}; },
  });
  for (const token of [sessionToken({ exp: NOW - 1 }), `${sessionToken()}forged`]) {
    const response = await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
      method: "POST", headers: auth(token), body: JSON.stringify(vitalsCheckinPayload({ pulse: "74" }, "primary-care", "2026-08-30")),
    }));
    assert.equal(response.status, 401);
  }
  assert.equal(calls, 0);
});

test("older backend releases fail closed on the vitals suffix without queueing a review", async () => {
  let queues = 0;
  const handler = createPatientCheckinsHandler({ environment: ENV, now: () => NOW,
    fetchImpl: async (url) => { assert.match(url, /check-ins\/vitals$/); return Response.json({ ok: false }, { status: 404 }); },
    queueImpl: async () => { queues += 1; return {}; },
  });
  const payload = vitalsCheckinPayload({ pulse: "74" }, "primary-care", "2026-08-30", { submissionId: "synthetic-vitals-0001", recordedAt: new Date(NOW).toISOString() });
  const response = await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
    method: "POST", headers: auth(), body: JSON.stringify({ ...payload, foods: ["Do not replace"], well: { feeling: "Do not replace" } }),
  }));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).saved, undefined);
  assert.equal(queues, 0);
});

test("review retries keep a submission key; a new reading gets a distinct bounded key", async () => {
  const queued = [];
  const handler = createPatientCheckinsHandler({ environment: ENV, now: () => NOW,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      return Response.json({ ok: true, savedAt: new Date(NOW).toISOString(), submissionId: body.submissionId, recordedAt: body.recordedAt,
        monitoring: { checkInId: "2026-08-30-primary", program: "primary", checkInDate: "2026-08-30", submittedAt: new Date(NOW).toISOString() } });
    },
    queueImpl: async (input) => { queued.push(input); if (queued.length === 1) throw new Error("Synthetic queue outage"); return { patientRequest: { id: "synthetic-review" } }; },
  });
  const send = (submissionId) => handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
    method: "POST", headers: auth(), body: JSON.stringify(vitalsCheckinPayload({ pulse: "74" }, "primary-care", "2026-08-30", { submissionId, recordedAt: new Date(NOW).toISOString() })),
  }));
  assert.equal((await (await send("synthetic-vitals-0001")).json()).saved, true);
  assert.equal((await send("synthetic-vitals-0001")).status, 200);
  assert.equal((await send("s".repeat(80))).status, 200);
  assert.deepEqual(queued[0], queued[1]);
  assert.notEqual(queued[1].submissionId, queued[2].submissionId);
  assert.match(queued[2].submissionId, /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/);
});

test("lost upstream responses report an unconfirmed save and never queue a review", async () => {
  for (const upstream of [async () => { throw new Error("Synthetic lost response"); }, async () => new Response("invalid JSON")]) {
    let queues = 0;
    const handler = createPatientCheckinsHandler({ environment: ENV, now: () => NOW, fetchImpl: upstream, queueImpl: async () => { queues += 1; } });
    const response = await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
      method: "POST", headers: auth(), body: JSON.stringify({ program: "primary", date: "2026-08-30" }),
    }));
    assert.equal(response.status, 502);
    assert.equal((await response.json()).saveUnconfirmed, true);
    assert.equal(queues, 0);
  }
});

test("check-in bridge forwards a normalized record without patient identity fields", async () => {
  let captured;
  let queued;
  const handler = createPatientCheckinsHandler({
    environment: ENV,
    now: () => NOW,
    queueImpl: async (input) => {
      queued = input;
      return { patientRequest: { id: "synthetic-checkin-review" } };
    },
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return Response.json({
        ok: true,
        savedAt: "2026-08-30T12:00:01.000Z",
        monitoring: {
          checkInId: "2026-08-30-mind",
          program: "mind",
          checkInDate: "2026-08-30",
          submittedAt: "2026-08-30T12:00:01.000Z",
          reviewState: "pending-clinician-review",
          reviewPriority: "same-day",
          signalCount: 1,
          monitoringPlanVersion: 2,
        },
      });
    },
  });
  const request = new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: "bhw.patient-checkin.v2",
      program: "mind",
      date: "2026-08-30",
      patient: { id: "BHW0000", name: "Must not forward" },
      well: { sleep: "Good", movement: "20 min" },
      symptoms: ["Synthetic fatigue"],
      waterCups: 6,
      foods: ["Synthetic oatmeal"],
      nutrition: { p: 25, sodium: 120 },
      vitals: { bp: "120/80" },
      monitoringPlanId: "mind-monitoring-plan",
      monitoringPlanVersion: 2,
      moduleResponses: [{
        moduleId: "mind-daily-recovery",
        answers: { "mind-treatment-change": "Uncomfortable change", "bad key": "omit" },
      }],
    }),
  });
  const response = await handler(request);
  assert.equal(response.status, 200);
  assert.equal(captured.url, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/check-ins");
  assert.equal(captured.body.schemaVersion, "bhw.patient-checkin.v2");
  assert.equal(captured.body.waterCups, 6);
  assert.equal(captured.body.patient, undefined);
  assert.equal(captured.body.moduleResponses[0].answers["mind-treatment-change"], "Uncomfortable change");
  assert.equal(captured.body.moduleResponses[0].answers["bad key"], undefined);
  assert.doesNotMatch(JSON.stringify(captured.body), /Must not forward|BHW0000/);
  assert.equal(queued.body.requestType, "clinical-review");
  assert.equal(queued.body.routing.assignedTeam, "clinical");
  assert.equal(queued.body.notificationMode, "none");
  assert.equal(queued.body.priority, "high");
  assert.equal(queued.body.sourceMetadata.reviewPriority, "same-day");
  assert.equal(queued.body.sourceMetadata.signalCount, 1);
  assert.equal(queued.body.sourceMetadata.monitoringPlanVersion, 2);
  assert.match(queued.submissionId, /BHW0000:2026-08-30-mind/);
  assert.doesNotMatch(JSON.stringify(queued.body), /fatigue|oatmeal|120\/80/i);
});

test("reports a saved check-in accurately when CrewHQ review queuing is not confirmed", async () => {
  const handler = createPatientCheckinsHandler({
    environment: ENV,
    now: () => NOW,
    queueImpl: async () => { throw new Error("synthetic queue outage"); },
    fetchImpl: async () => Response.json({
      ok: true,
      savedAt: "2026-08-30T12:00:01.000Z",
      monitoring: {
        checkInId: "2026-08-30-primary",
        program: "primary",
        checkInDate: "2026-08-30",
        submittedAt: "2026-08-30T12:00:01.000Z",
      },
    }),
  });
  const response = await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ program: "primary", date: "2026-08-30" }),
  }));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.saved, true);
  assert.match(body.error, /saved to BHW Cloud/i);
});

test("check-in history uses the signed patient route and bounded query", async () => {
  let captured;
  const handler = createPatientCheckinsHandler({
    environment: ENV,
    now: () => NOW,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return Response.json({
        ok: true,
        targets: { p: 90 },
        series: [{ date: "2026-08-30", water: 6 }],
        monitoringPlan: { planId: "flow-monitoring-plan", program: "flow" },
      });
    },
  });
  const response = await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins?program=flow&days=999", { headers: auth() }));
  assert.equal(response.status, 200);
  assert.equal(captured.url, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/check-ins?program=flow&days=90");
  assert.deepEqual(await response.json(), {
    ok: true,
    targets: { p: 90 },
    series: [{ date: "2026-08-30", water: 6 }],
    monitoringPlan: { planId: "flow-monitoring-plan", program: "flow" },
  });
});

test("check-in bridge fails closed for missing auth, configuration, invalid programs, and large payloads", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json({ ok: true }); };
  const handler = createPatientCheckinsHandler({ environment: ENV, fetchImpl, now: () => NOW });
  assert.equal((await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins?program=primary"))).status, 401);
  assert.equal((await handler(new Request("https://care.synthetic.test/api/patient-portal/check-ins?program=unknown", { headers: auth() }))).status, 400);
  const large = new Request("https://care.synthetic.test/api/patient-portal/check-ins", {
    method: "POST", headers: auth(), body: JSON.stringify({ program: "primary", date: "2026-08-30", summary: "x".repeat(65_000) }),
  });
  assert.equal((await handler(large)).status, 413);
  const missing = createPatientCheckinsHandler({ environment: { ...ENV, CARE_CONNECT_PATIENT_TOKEN_SECRET: "" }, fetchImpl, now: () => NOW });
  assert.equal((await missing(new Request("https://care.synthetic.test/api/patient-portal/check-ins?program=primary", { headers: auth() }))).status, 503);
  assert.equal(calls, 0);
});
