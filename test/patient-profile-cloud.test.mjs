import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createPatientProfileHandler } from "../netlify/functions/patient-profile.mjs";

const NOW = Date.parse("2026-08-31T12:00:00.000Z");
const SESSION_SECRET = "synthetic-session-secret";
const PATIENT_SECRET = "synthetic-health-core-patient-secret";
const ENV = {
  SESSION_SECRET,
  HEALTH_CORE_API_URL: "https://health-core.synthetic.test/",
  CARE_CONNECT_PATIENT_TOKEN_SECRET: PATIENT_SECRET,
};

function patientSession(overrides = {}) {
  const claims = {
    kind: "patient",
    bhwPatientId: "BHW0000",
    exp: NOW + 60_000,
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function profileRequest(body = { changes: { pronouns: "they/them", allergies: [] } }, token = patientSession()) {
  return new Request("https://care.synthetic.test/api/patient-portal/profile-change-requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": "profile:synthetic-0001",
    },
    body: JSON.stringify(body),
  });
}

test("profile bridge saves to Health Core and queues only a metadata reference in CrewOS", async () => {
  let upstream;
  let queue;
  const fetchImpl = async (url, options) => {
    upstream = { url, options, body: JSON.parse(options.body) };
    return Response.json({
      ok: true,
      replayed: false,
      request: {
        requestId: "PVR-11111111111111111111111111111111",
        status: "pending-review",
        fields: ["pronouns", "allergies"],
        submittedAt: "2026-08-31T12:00:00.000Z",
      },
    }, { status: 201 });
  };
  const queueImpl = async (input) => {
    queue = input;
    return { patientRequest: { patientRequestId: "REQ-synthetic-profile-0001" } };
  };
  const handler = createPatientProfileHandler({ environment: ENV, fetchImpl, queueImpl, now: () => NOW });
  const response = await handler(profileRequest({
    patientName: "Do not forward",
    bhwPatientId: "BHW9999",
    changes: {
      pronouns: "they/them",
      allergies: [{ substance: "Synthetic allergen", reaction: "Synthetic reaction" }],
      email: "omit@example.test",
    },
  }));
  assert.equal(response.status, 201);
  assert.equal(upstream.url, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/profile-change-requests");
  assert.equal(upstream.options.headers["Idempotency-Key"], "profile:synthetic-0001");
  assert.deepEqual(Object.keys(upstream.body.changes).sort(), ["allergies", "pronouns"]);

  const queued = JSON.stringify(queue);
  assert.match(queued, /PVR-11111111111111111111111111111111/);
  assert.match(queued, /pronouns, allergies/);
  assert.match(queued, /"bhwPatientId":"BHW0000"/);
  assert.doesNotMatch(queued, /they\/them|Synthetic allergen|Synthetic reaction|Do not forward|omit@example/);
  assert.equal(queue.body.routing.assignedTeam, "clinical");
  assert.equal(queue.body.routing.ownerRole, "provider");
  assert.equal(queue.body.requestType, "clinical-review");
  assert.equal(queue.body.notificationMode, "none");
  assert.equal((await response.json()).queueReference, "REQ-synthetic-profile-0001");
});

test("profile bridge reports saved state accurately when the staff queue cannot be confirmed", async () => {
  const fetchImpl = async () => Response.json({
    ok: true,
    request: {
      requestId: "PVR-11111111111111111111111111111111",
      status: "pending-review",
      fields: ["specialists"],
      submittedAt: "2026-08-31T12:00:00.000Z",
    },
  }, { status: 201 });
  const handler = createPatientProfileHandler({
    environment: ENV,
    fetchImpl,
    queueImpl: async () => { throw new Error("synthetic queue failure"); },
    now: () => NOW,
  });
  const response = await handler(profileRequest({ changes: { specialists: [] } }));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.saved, true);
  assert.match(body.error, /saved to BHW Cloud/);
});

test("profile bridge fails closed for missing auth, identity, key, and unsupported fields", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json({ ok: true }); };
  const handler = createPatientProfileHandler({ environment: ENV, fetchImpl, queueImpl: async () => null, now: () => NOW });
  assert.equal((await handler(profileRequest({}, ""))).status, 401);
  assert.equal((await handler(profileRequest({}, patientSession({ bhwPatientId: null })))).status, 409);
  const missingKey = new Request("https://care.synthetic.test/api/patient-portal/profile-change-requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${patientSession()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ changes: { pronouns: "they/them" } }),
  });
  assert.equal((await handler(missingKey)).status, 400);
  assert.equal((await handler(profileRequest({ changes: { email: "unsupported@example.test" } }))).status, 400);
  assert.equal(calls, 0);
});
