import crypto from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createPatientNutritionIntakeHandler } from "../netlify/functions/patient-nutrition-intake.mjs";

const NOW = Date.parse("2026-09-20T12:00:00.000Z");
const SESSION_SECRET = "synthetic-session-secret";
const PATIENT_SECRET = "synthetic-patient-secret";
const ENV = {
  SESSION_SECRET,
  HEALTH_CORE_API_URL: "https://health-core.synthetic.test/",
  CARE_CONNECT_PATIENT_TOKEN_SECRET: PATIENT_SECRET,
};

function sessionToken(overrides = {}) {
  const claims = {
    kind: "patient",
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

const headers = (token = sessionToken()) => ({ Authorization: `Bearer ${token}` });
const url = "https://care.synthetic.test/api/patient-portal/nutrition-intake";

test("Care Connect loads the patient-safe questionnaire through the signed Health Core route", async () => {
  let captured;
  const handler = createPatientNutritionIntakeHandler({
    environment: ENV,
    now: () => NOW,
    fetchImpl: async (upstreamUrl, options) => {
      captured = { upstreamUrl, options };
      return Response.json({
        ok: true,
        questionnaire: { version: "1.4.0", questions: Array.from({ length: 93 }, (_, index) => ({ id: `q${index}` })) },
        giPatternScreen: { module_id: "gi-pattern", version: "1.0.0" },
        kidneyQuestionnaire: { module_id: "kidney", version: "1.1.0" },
        boundary: { requiresClinicianReconciliation: true, createsChartFacts: false },
        intake: null,
      });
    },
  });
  const response = await handler(new Request(url, { headers: headers() }));
  assert.equal(response.status, 200);
  assert.equal(captured.upstreamUrl, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/nutrition-intake");
  assert.equal(captured.options.method, "GET");
  const token = captured.options.headers.Authorization.replace("Bearer ", "");
  const claims = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
  assert.equal(claims.aud, "bhw-health-core-patient");
  assert.equal(claims.bhwPatientId, "BHW0000");
  assert.equal(claims.exp - claims.iat, 60);
  const body = await response.json();
  assert.equal(body.questionnaire.questions.length, 93);
  assert.equal(body.boundary.createsChartFacts, false);
});

test("Care Connect saves only questionnaire fields and creates a metadata-only CrewOS review task on submit", async () => {
  let forwarded;
  let queued;
  const handler = createPatientNutritionIntakeHandler({
    environment: ENV,
    now: () => NOW,
    queueImpl: async (input) => {
      queued = input;
      return { patientRequest: { id: "nutrition-review-1" } };
    },
    fetchImpl: async (upstreamUrl, options) => {
      forwarded = { upstreamUrl, body: JSON.parse(options.body) };
      return Response.json({
        ok: true,
        readBackVerified: true,
        savedAt: "2026-09-20T12:00:01.000Z",
        intake: {
          revision: 1,
          status: "submitted-for-clinician-reconciliation",
          questionnaireVersion: "1.4.0",
          answerCount: 2,
          contentHash: "sha256:synthetic",
        },
      });
    },
  });
  const response = await handler(new Request(url, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "submit",
      bhwPatientId: "BHW9999",
      patientName: "Do not forward",
      expectedRevision: 0,
      questionnaireVersion: "1.4.0",
      questionnaireModuleVersions: { "gi-pattern": "1.0.0", kidney: "1.1.0" },
      questionnaireResponses: { "goals.primary": ["improve_gi_tolerance"], "gi.pattern_matrix": { bloating: 2 } },
    }),
  }));
  assert.equal(response.status, 200);
  assert.equal(forwarded.upstreamUrl, "https://health-core.synthetic.test/v1/patient-portal/BHW0000/nutrition-intake");
  assert.equal(forwarded.body.bhwPatientId, undefined);
  assert.equal(forwarded.body.patientName, undefined);
  assert.equal(forwarded.body.action, "submit");
  assert.equal(queued.body.requestType, "clinical-review");
  assert.equal(queued.body.routing.targetSystem, "crewos");
  assert.equal(queued.body.notificationMode, "none");
  assert.equal(queued.body.sourceMetadata.answerCount, 2);
  assert.doesNotMatch(JSON.stringify(queued.body), /improve_gi_tolerance|bloating|Do not forward/i);
  const body = await response.json();
  assert.equal(body.readBackVerified, true);
  assert.equal(body.queueReference, "nutrition-review-1");
});

test("Care Connect reports cloud save accurately if clinician task creation is not confirmed", async () => {
  const handler = createPatientNutritionIntakeHandler({
    environment: ENV,
    now: () => NOW,
    queueImpl: async () => { throw new Error("synthetic queue outage"); },
    fetchImpl: async () => Response.json({
      ok: true,
      readBackVerified: true,
      savedAt: "2026-09-20T12:00:01.000Z",
      intake: { revision: 1, status: "submitted-for-clinician-reconciliation", questionnaireVersion: "1.4.0", answerCount: 1 },
    }),
  });
  const response = await handler(new Request(url, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "submit",
      expectedRevision: 0,
      questionnaireVersion: "1.4.0",
      questionnaireModuleVersions: {},
      questionnaireResponses: { "goals.primary": ["improve_energy"] },
    }),
  }));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.saved, true);
  assert.equal(body.readBackVerified, true);
  assert.match(body.error, /saved to BHW Cloud/i);
});

test("nutrition bridge fails closed for missing auth, invalid sessions, configuration, and oversized payloads", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json({ ok: true }); };
  const handler = createPatientNutritionIntakeHandler({ environment: ENV, fetchImpl, now: () => NOW });
  assert.equal((await handler(new Request(url))).status, 401);
  assert.equal((await handler(new Request(url, { headers: headers(sessionToken({ proxyAccessAllowed: true })) }))).status, 401);
  const large = new Request(url, { method: "PUT", headers: headers(), body: JSON.stringify({ action: "save-progress", data: "x".repeat(900_001) }) });
  assert.equal((await handler(large)).status, 413);
  const missing = createPatientNutritionIntakeHandler({ environment: { ...ENV, CARE_CONNECT_PATIENT_TOKEN_SECRET: "" }, fetchImpl, now: () => NOW });
  assert.equal((await missing(new Request(url, { headers: headers() }))).status, 503);
  assert.equal(calls, 0);
});
