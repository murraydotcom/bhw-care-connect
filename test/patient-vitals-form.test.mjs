import assert from "node:assert/strict";
import test from "node:test";
import { createVitalsSubmitHandler, vitalsCheckinPayload } from "../patient/vitals-form.mjs";

const DATE = "2026-10-07";
const SAVED_AT = `${DATE}T12:00:01.000Z`;
const FIELDS = { systolic: "124", diastolic: "82", pulse: "74", weight: "165.5", oxygen: "97", temperature: "98.6" };
const VITALS = { bp: "124/82", hr: "74", wt: "165.5", o2: "97", temp: "98.6" };

function harness(overrides = {}) {
  const status = { textContent: "", dataset: {} };
  const button = { disabled: false };
  const attributes = new Map();
  const form = {
    reportValidity: () => true,
    querySelector: (selector) => selector === "#vitals-status" ? status : button,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
  const calls = [];
  const saves = [];
  const previewSaves = [];
  const submit = createVitalsSubmitHandler({
    isPreview: false,
    getProgramId: () => "primary-care",
    getSessionToken: () => "synthetic-BHW0000-session",
    now: () => new Date(`${DATE}T12:00:00.000Z`),
    readFields: () => ({ ...FIELDS }),
    savePreview: (values) => { previewSaves.push(values); return SAVED_AT; },
    onSaved: (...args) => saves.push(args),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return options.method === "POST"
        ? Response.json({ ok: true, savedAt: SAVED_AT, queueReference: "synthetic-review-reference" })
        : Response.json({ ok: true, series: [] });
    },
    ...overrides,
  });
  const event = { currentTarget: form, preventDefault() {} };
  return { submit: () => submit(event), status, button, attributes, form, calls, saves, previewSaves };
}

test("vital signs map to the check-in contract for all four program lenses", async (t) => {
  for (const [programId, program] of [["primary-care", "primary"], ["mind-mood", "mind"], ["charmed-minds", "charmed"], ["flow", "flow"]]) {
    await t.test(programId, async () => {
      const h = harness({ getProgramId: () => programId });
      await h.submit();
      assert.equal(h.calls.length, 2);
      assert.equal(h.calls[0].url, `/api/patient-portal/check-ins?program=${program}&days=1`);
      assert.equal(h.calls[1].url, "/api/patient-portal/check-ins");
      assert.equal(h.calls[1].options.method, "POST");
      assert.equal(h.calls[1].options.headers.Authorization, "Bearer synthetic-BHW0000-session");
      assert.equal(h.calls[1].options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(h.calls[1].options.body), { schemaVersion: "bhw.patient-checkin.v2", program, date: DATE, vitals: VITALS });
      assert.equal(h.status.dataset.state, "cloud-saved");
      assert.match(h.status.textContent, /Saved to BHW Cloud.*ready for clinician review/);
      assert.deepEqual(h.saves, [[FIELDS, SAVED_AT, true]]);
      assert.equal(h.previewSaves.length, 0);
      assert.equal(h.button.disabled, false);
      assert.equal(h.attributes.has("aria-busy"), false);
    });
  }
});

test("blank vitals are omitted; an unknown program and invalid or incomplete measurements are rejected", async () => {
  assert.deepEqual(vitalsCheckinPayload({ pulse: " 74 ", weight: "", unrelated: "ignore" }, "flow", DATE).vitals, { hr: "74" });
  for (const fields of [{}, { systolic: "124" }, { diastolic: "82" }, { oxygen: "101" }, { pulse: "NaN" }, { pulse: "74.5" }, { weight: "Infinity" }]) {
    const h = harness({ readFields: () => fields });
    await h.submit();
    assert.equal(h.calls.length, 0);
    assert.equal(h.saves.length, 0);
    assert.equal(h.status.dataset.state, "not-saved");
  }
  const h = harness({ getProgramId: () => "unknown" });
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.match(h.status.textContent, /Choose a BHW program/);
});

test("native form validation and a missing session prevent all bridge calls", async () => {
  const invalid = harness();
  invalid.form.reportValidity = () => false;
  await invalid.submit();
  assert.equal(invalid.calls.length, 0);
  const unauthenticated = harness({ getSessionToken: () => null });
  await unauthenticated.submit();
  assert.equal(unauthenticated.calls.length, 0);
  assert.match(unauthenticated.status.textContent, /Not saved.*sign in again/);
  assert.equal(unauthenticated.button.disabled, false);
});

test("synthetic preview saves only on the device and does not obtain a token or call the bridge", async () => {
  const h = harness({ isPreview: true, getSessionToken: () => { throw new Error("Preview must not read a session"); } });
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.equal(h.saves.length, 0);
  assert.deepEqual(h.previewSaves, [FIELDS]);
  assert.equal(h.status.dataset.state, "device-only");
  assert.match(h.status.textContent, /Saved on this device only.*BHW Cloud was not changed/);
  const failed = harness({ isPreview: true, savePreview: () => { throw new Error("Synthetic storage unavailable"); } });
  await failed.submit();
  assert.equal(failed.status.dataset.state, "not-saved");
  assert.match(failed.status.textContent, /Not saved.*storage unavailable/);
  assert.equal(failed.button.disabled, false);
});

test("an existing same-day check-in is never replaced by the standalone form", async () => {
  let calls = 0;
  const h = harness({ fetchImpl: async () => { calls += 1; return Response.json({ ok: true, series: [{ date: DATE, water: 6, p: 25 }] }); } });
  await h.submit();
  assert.equal(calls, 1);
  assert.equal(h.saves.length, 0);
  assert.match(h.status.textContent, /already saved.*Use Daily check-in/);
  assert.equal(h.status.dataset.state, "not-saved");
});

test("unavailable or malformed history fails closed before any POST", async () => {
  for (const fetchImpl of [
    async () => Response.json({ ok: false, error: "Please sign in again." }, { status: 401 }),
    async () => Response.json({ ok: true }),
    async () => new Response("not JSON"),
    async () => { throw new Error("Synthetic network outage"); },
  ]) {
    const h = harness({ fetchImpl });
    await h.submit();
    assert.equal(h.saves.length, 0);
    assert.equal(h.status.dataset.state, "not-saved");
    assert.match(h.status.textContent, /^Not saved\./);
    assert.equal(h.button.disabled, false);
  }
});

test("save rejection, invalid JSON, and network failure never report cloud success", async () => {
  for (const post of [
    async () => Response.json({ ok: false, saved: false, error: "Synthetic maintenance" }, { status: 503 }),
    async () => new Response("not JSON", { status: 502 }),
    async () => { throw new Error("Synthetic network outage"); },
  ]) {
    const h = harness({ fetchImpl: async (_url, options) => options.method === "POST" ? post() : Response.json({ ok: true, series: [{ date: "2026-10-06" }] }) });
    await h.submit();
    assert.equal(h.saves.length, 0);
    assert.equal(h.status.dataset.state, "not-saved");
    assert.match(h.status.textContent, /^Not saved\./);
    assert.equal(h.button.disabled, false);
    assert.equal(h.attributes.has("aria-busy"), false);
  }
});

test("a confirmed Health Core save with an unconfirmed review notice retries only the unchanged payload", async () => {
  const calls = [];
  let postCount = 0;
  let fields = { ...FIELDS };
  const h = harness({
    readFields: () => fields,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method !== "POST") return Response.json({ ok: true, series: [] });
      postCount += 1;
      return postCount === 1
        ? Response.json({ ok: false, saved: true, savedAt: SAVED_AT }, { status: 502 })
        : Response.json({ ok: true, savedAt: SAVED_AT, queueReference: "synthetic-review-reference" });
    },
  });
  await h.submit();
  assert.equal(h.status.dataset.state, "saved-review-pending");
  assert.match(h.status.textContent, /^Saved to BHW Cloud.*not confirmed/);
  assert.deepEqual(h.saves, [[FIELDS, SAVED_AT, false]]);
  fields = {};
  await h.submit();
  assert.equal(calls.length, 2);
  assert.equal(h.status.dataset.state, "saved-review-pending");
  fields = { ...FIELDS, pulse: "75" };
  await h.submit();
  assert.equal(calls.length, 2);
  assert.equal(h.status.dataset.state, "saved-review-pending");
  assert.match(h.status.textContent, /already saved.*original readings/);
  fields = { ...FIELDS };
  await h.submit();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.body, calls[1].options.body);
  assert.equal(h.status.dataset.state, "cloud-saved");
  assert.equal(h.saves[1][2], true);
});

test("repeat submits are suppressed while saving and controls are restored after completion", async () => {
  let complete;
  let calls = 0;
  const waiting = new Promise((resolve) => { complete = resolve; });
  const h = harness({ fetchImpl: async (_url, options) => {
    calls += 1;
    if (options.method === "POST") return waiting;
    return Response.json({ ok: true, series: [] });
  } });
  const first = h.submit();
  assert.equal(h.button.disabled, true);
  assert.equal(h.attributes.get("aria-busy"), "true");
  await h.submit();
  assert.equal(calls, 1);
  // Let history JSON parsing finish and the single POST reach its wait.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  complete(Response.json({ ok: true, savedAt: SAVED_AT }));
  await first;
  assert.equal(h.button.disabled, false);
  assert.equal(h.attributes.has("aria-busy"), false);
});
