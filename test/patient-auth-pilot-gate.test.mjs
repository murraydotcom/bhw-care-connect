import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

test("real Google patient sign-in cannot send a code while the organization pilot switch is off", async () => {
  const prior = {
    STYTCH_PROJECT_ID: process.env.STYTCH_PROJECT_ID,
    STYTCH_SECRET: process.env.STYTCH_SECRET,
    PATIENT_PORTAL_PILOT_ENABLED: process.env.PATIENT_PORTAL_PILOT_ENABLED,
  };
  process.env.STYTCH_PROJECT_ID = "project-test-synthetic";
  process.env.STYTCH_SECRET = "secret-test-synthetic";
  process.env.PATIENT_PORTAL_PILOT_ENABLED = "false";
  try {
    const { handler } = require("../netlify/functions/patient-auth.js");
    const response = await handler({
      httpMethod: "POST",
      body: JSON.stringify({
        action: "send",
        email: "synthetic.patient@example.test",
        portalContract: "google-v1",
      }),
    });
    assert.equal(response.statusCode, 503);
    assert.match(JSON.parse(response.body).error, /not available/i);
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
