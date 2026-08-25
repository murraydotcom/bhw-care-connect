import assert from "node:assert/strict";
import test from "node:test";
import submitTriage, { cloudBody } from "../netlify/functions/submit-triage.mjs";

function cloudEnvironment(t) {
  const values = new Map([
    ["OPERATIONS_CLOUD_API_URL", "https://operations.synthetic.test"],
    ["CARE_CONNECT_INTAKE_SECRET", "synthetic-care-connect-secret"],
    ["CARE_CONNECT_CLIENT_ID", "care-connect"],
  ]);
  const originalNetlify = globalThis.Netlify;
  const originalFetch = global.fetch;
  globalThis.Netlify = { env: { get: (key) => values.get(key) || "" } };
  t.after(() => {
    global.fetch = originalFetch;
    globalThis.Netlify = originalNetlify;
  });
  return values;
}

function request(body) {
  return new Request("https://care-connect.synthetic.test/api/patient-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("Just Ask forwards one synthetic request through the signed Cloud intake", async (t) => {
  cloudEnvironment(t);
  let captured;
  global.fetch = async (url, options) => {
    captured = { url, options };
    return Response.json({
      ok: true,
      replayed: false,
      patientRequest: { patientRequestId: "REQ-SYNTHETIC-BHW0000" },
    }, { status: 201 });
  };

  const response = await submitTriage(request({
    submissionId: "care-connect:synthetic-bhw0000-0001",
    route: "billing",
    name: "Synthetic BHW0000",
    dob: "01/01/2000",
    summary: "Synthetic billing question for contract verification.",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    reference: "REQ-SYNTHETIC-BHW0000",
    replayed: false,
  });
  assert.equal(captured.url, "https://operations.synthetic.test/v1/intake/patient-requests");
  assert.equal(captured.options.headers.Authorization, "Bearer synthetic-care-connect-secret");
  assert.equal(captured.options.headers["X-BHW-Client-Id"], "care-connect");
  assert.equal(captured.options.headers["Idempotency-Key"], "care-connect:synthetic-bhw0000-0001");

  const body = JSON.parse(captured.options.body);
  assert.equal(body.patientMatchStatus, "unmatched");
  assert.equal(body.bhwPatientId, undefined);
  assert.equal(body.requestType, "billing");
  assert.equal(body.routing.targetSystem, "rcm");
  assert.equal(body.routing.assignedTeam, "billing");
  assert.equal(body.requester.displayName, "Synthetic BHW0000");
  assert.match(body.message, /Patient-entered DOB: 01\/01\/2000/);
  assert.equal(body.sourceMetadata.sourcePage, "care-connect-just-ask");
});

test("refills route to the medication service without duplicating medication UI", () => {
  const body = cloudBody({
    route: "refill",
    name: "Synthetic BHW0000",
    dob: "",
    summary: "Synthetic refill request.",
    submissionId: "care-connect:synthetic-refill-0001",
  });

  assert.equal(body.requestType, "medication");
  assert.equal(body.priority, "high");
  assert.equal(body.routing.targetSystem, "medication-service");
  assert.equal(body.routing.assignedTeam, "clinical");
});

test("a configured Cloud intake fails closed instead of writing a second legacy copy", async (t) => {
  cloudEnvironment(t);
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return Response.json(
      { error: { code: "unavailable", message: "synthetic outage" } },
      { status: 503 },
    );
  };

  const response = await submitTriage(request({
    submissionId: "care-connect:synthetic-failure-0001",
    route: "general",
    name: "Synthetic BHW0000",
    summary: "Synthetic request used to verify fail-closed behavior.",
  }));

  assert.equal(response.status, 502);
  assert.equal(calls, 1);
  assert.deepEqual(await response.json(), {
    error: "Could not send your message — please try again or call the office.",
  });
});

test("missing server configuration returns unavailable without a legacy write", async (t) => {
  const originalNetlify = globalThis.Netlify;
  const originalFetch = global.fetch;
  globalThis.Netlify = { env: { get: () => "" } };
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error("should not be called");
  };
  t.after(() => {
    globalThis.Netlify = originalNetlify;
    global.fetch = originalFetch;
  });

  const response = await submitTriage(request({
    submissionId: "care-connect:synthetic-unconfigured-0001",
    route: "general",
    name: "Synthetic BHW0000",
    summary: "Synthetic request used to verify unconfigured behavior.",
  }));

  assert.equal(response.status, 503);
  assert.equal(called, false);
  assert.deepEqual(await response.json(), {
    error: "Messaging is not connected yet — please call the office.",
  });
});

test("oversized public submissions are rejected before any downstream call", async (t) => {
  cloudEnvironment(t);
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error("should not be called");
  };
  const response = await submitTriage(request({ summary: "x".repeat(33 * 1024) }));
  assert.equal(response.status, 413);
  assert.equal(called, false);
});
