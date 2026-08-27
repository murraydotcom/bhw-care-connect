import { createRequire } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  operationsBase,
  resolveGooglePatientIdentity,
} = require("../netlify/functions/_shared/google-patient-registry.cjs");

const ENV = {
  OPERATIONS_CLOUD_API_URL: "https://operations.synthetic.test/",
  CARE_CONNECT_PATIENT_IDENTITY_SECRET: "synthetic-identity-secret",
  CARE_CONNECT_CLIENT_ID: "care-connect",
};

test("Google registry adapter sends only verified contact and DOB with its separate credential", async () => {
  let captured;
  const match = await resolveGooglePatientIdentity({
    email: "Synthetic.Patient@Example.Test",
    dateOfBirth: "1980-01-02",
  }, {
    environment: ENV,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return Response.json({ ok: true, patient: { bhwPatientId: "BHW0000", preferredName: "Synthetic" } });
    },
  });
  assert.deepEqual(match, { bhwPatientId: "BHW0000", preferredName: "Synthetic" });
  assert.equal(captured.url, "https://operations.synthetic.test/v1/patient-identity/resolve");
  assert.equal(captured.options.headers.Authorization, "Bearer synthetic-identity-secret");
  assert.equal(captured.options.headers["X-BHW-Client-Id"], "care-connect");
  assert.deepEqual(JSON.parse(captured.options.body), {
    verifiedEmail: "synthetic.patient@example.test",
    dateOfBirth: "1980-01-02",
  });
});

test("Google registry adapter fails closed for missing configuration, ambiguous matches, and invalid IDs", async () => {
  assert.equal(operationsBase("http://operations.example.test"), "");
  await assert.rejects(
    resolveGooglePatientIdentity({ email: "synthetic@example.test", dateOfBirth: "1980-01-02" }, {
      environment: { ...ENV, CARE_CONNECT_PATIENT_IDENTITY_SECRET: "" },
    }),
    (error) => error.status === 503,
  );
  await assert.rejects(
    resolveGooglePatientIdentity({ phone: "+14435550100", dateOfBirth: "1980-01-02" }, {
      environment: ENV,
      fetchImpl: async () => Response.json({ ok: false, code: "identity_not_matched" }, { status: 403 }),
    }),
    (error) => error.status === 403 && !/443|1980/.test(error.message),
  );
  await assert.rejects(
    resolveGooglePatientIdentity({ email: "synthetic@example.test", dateOfBirth: "1980-01-02" }, {
      environment: ENV,
      fetchImpl: async () => Response.json({ ok: true, patient: { bhwPatientId: "bad" } }),
    }),
    (error) => error.status === 502,
  );
});
