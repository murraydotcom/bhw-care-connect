import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { handler } = require("../netlify/functions/food-vision.js");

function sessionToken(secret, overrides = {}) {
  const claims = {
    kind: "patient",
    bhwPatientId: "BHW0000",
    exp: Date.now() + 60_000,
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function event(token = "") {
  return {
    httpMethod: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ image: "data:image/jpeg;base64,c3ludGhldGlj" }),
  };
}

test("plate-photo AI rejects unsigned and unlinked patient sessions", async () => {
  const original = { ...process.env };
  process.env.SESSION_SECRET = "synthetic-session-secret";
  try {
    assert.equal((await handler(event())).statusCode, 401);
    const unlinked = sessionToken(process.env.SESSION_SECRET, { bhwPatientId: "" });
    assert.equal((await handler(event(unlinked))).statusCode, 401);
  } finally {
    process.env = original;
  }
});

test("plate-photo AI remains disabled until every privacy release flag is approved", async () => {
  const original = { ...process.env };
  process.env.SESSION_SECRET = "synthetic-session-secret";
  process.env.OPENAI_API_KEY = "synthetic-key-that-must-not-be-used";
  process.env.FOOD_VISION_ENABLED = "true";
  process.env.OPENAI_API_BAA_APPROVED = "true";
  delete process.env.OPENAI_ZERO_DATA_RETENTION_APPROVED;
  try {
    const response = await handler(event(sessionToken(process.env.SESSION_SECRET)));
    assert.equal(response.statusCode, 503);
    const body = JSON.parse(response.body);
    assert.equal(body.releaseGate, true);
    assert.match(body.error, /privacy and BAA review/i);
  } finally {
    process.env = original;
  }
});
