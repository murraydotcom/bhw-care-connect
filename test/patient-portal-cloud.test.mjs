import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createPatientPortalHandler } from "../netlify/functions/patient-portal.mjs";

const NOW = Date.parse("2026-08-26T12:00:00.000Z");
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

function request(token = patientSession()) {
  return new Request("https://care.synthetic.test/api/patient-portal/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test("secure bridge exchanges a patient session for a 60-second Health Core token", async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return Response.json({
      ok: true,
      dashboard: {
        schemaVersion: "bhw.patient-portal.v1",
        generatedAt: "2026-08-26T12:00:00.000Z",
        patient: { preferredName: "Synthetic", programs: ["Primary Care"] },
        plan: null,
        medications: [{ name: "Synthetic medication", clinicalStatus: "active" }],
        requests: [],
      },
    });
  };
  const handler = createPatientPortalHandler({ environment: ENV, fetchImpl, now: () => NOW });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(captured.url, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/dashboard");

  const token = captured.options.headers.Authorization.replace("Bearer ", "");
  const [payload, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const expected = crypto.createHmac("sha256", PATIENT_SECRET).update(payload).digest("base64url");
  assert.equal(signature, expected);
  assert.equal(claims.aud, "bhw-health-core-patient");
  assert.equal(claims.iss, "bhw-care-connect");
  assert.equal(claims.role, "patient-portal");
  assert.equal(claims.bhwPatientId, "BHW0000");
  assert.equal(claims.exp - claims.iat, 60);

  const body = await response.json();
  assert.equal(body.dashboard.medications[0].clinicalStatus, "active");
  assert.doesNotMatch(JSON.stringify(body), /BHW0000|dateOfBirth|diagnos|ownerRole/i);
});

test("secure bridge fails closed for missing, expired, or unlinked sessions", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json({ ok: true }); };
  const handler = createPatientPortalHandler({ environment: ENV, fetchImpl, now: () => NOW });

  assert.equal((await handler(new Request("https://care.synthetic.test/api/patient-portal/dashboard"))).status, 401);
  assert.equal((await handler(request(patientSession({ exp: NOW - 1 })))).status, 401);
  const unlinked = await handler(request(patientSession({ bhwPatientId: null })));
  assert.equal(unlinked.status, 409);
  assert.match((await unlinked.json()).error, /not linked/);
  assert.equal(calls, 0);
});

test("secure bridge fails closed when configuration or Health Core is unavailable", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json({ ok: false }, { status: 503 }); };
  const missing = createPatientPortalHandler({
    environment: { ...ENV, CARE_CONNECT_PATIENT_TOKEN_SECRET: "" }, fetchImpl, now: () => NOW,
  });
  assert.equal((await missing(request())).status, 503);
  assert.equal(calls, 0);

  const handler = createPatientPortalHandler({ environment: ENV, fetchImpl, now: () => NOW });
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
  assert.deepEqual(await response.json(), { ok: false, error: "The patient dashboard could not be loaded." });
});
