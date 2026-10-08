import assert from "node:assert/strict";
import test from "node:test";
import { createVitalsSubmitHandler, vitalsCheckinPayload } from "../patient/vitals-form.mjs";

const DATE = "2026-10-07";
const RECORDED_AT = `${DATE}T12:00:00.000Z`;
const SAVED_AT = `${DATE}T12:00:01.000Z`;
const FIELDS = { systolic: "124", diastolic: "82", pulse: "74", weight: "165.5", oxygen: "97", temperature: "98.6", recordedAt: RECORDED_AT };
const VITALS = { bp: "124/82", hr: "74", wt: "165.5", o2: "97", temp: "98.6" };

function harness(overrides = {}) {
  const status = { textContent: "", dataset: {} }, button = { disabled: false }, attributes = new Map();
  const form = { reportValidity: () => true, querySelector: (selector) => selector === "#vitals-status" ? status : button,
    setAttribute: (name, value) => attributes.set(name, value), removeAttribute: (name) => attributes.delete(name) };
  const calls = [], saves = [], previewSaves = [];
  let nonce = 0;
  const submit = createVitalsSubmitHandler({
    isPreview: false, getProgramId: () => "primary-care", getSessionToken: () => "synthetic-BHW0000-session",
    now: () => new Date(RECORDED_AT), createSubmissionId: () => `synthetic-submission-${++nonce}`, readFields: () => ({ ...FIELDS }),
    savePreview: (values) => { previewSaves.push(values); return SAVED_AT; }, onSaved: (...args) => saves.push(args),
    fetchImpl: async (url, options) => { calls.push({ url, options }); return Response.json({ ok: true, savedAt: SAVED_AT }); },
    ...overrides,
  });
  return { submit: () => submit({ currentTarget: form, preventDefault() {} }), status, button, attributes, form, calls, saves, previewSaves };
}

test("all four program lenses map to the authenticated timestamped append contract", async (t) => {
  for (const [programId, program] of [["primary-care", "primary"], ["mind-mood", "mind"], ["charmed-minds", "charmed"], ["flow", "flow"]]) {
    await t.test(programId, async () => {
      const h = harness({ getProgramId: () => programId }); await h.submit();
      assert.equal(h.calls.length, 1);
      assert.equal(h.calls[0].url, "/api/patient-portal/check-ins");
      assert.equal(h.calls[0].options.method, "POST");
      assert.equal(h.calls[0].options.headers.Authorization, "Bearer synthetic-BHW0000-session");
      assert.deepEqual(JSON.parse(h.calls[0].options.body), { schemaVersion: "bhw.patient-checkin.v2", submissionType: "vitals", submissionId: "synthetic-submission-1", program, date: DATE, recordedAt: RECORDED_AT, vitals: VITALS });
      assert.equal(h.status.dataset.state, "cloud-saved");
      assert.match(h.status.textContent, /Saved to BHW Cloud.*ready for clinician review/);
      assert.deepEqual(h.saves, [[FIELDS, SAVED_AT, true, RECORDED_AT]]);
      assert.equal(h.previewSaves.length, 0); assert.equal(h.button.disabled, false); assert.equal(h.attributes.has("aria-busy"), false);
    });
  }
});

test("invalid measurements, programs, timestamps, native validity, and missing sessions cannot call the bridge", async () => {
  assert.deepEqual(vitalsCheckinPayload({ pulse: " 74 ", weight: "", unrelated: "ignore" }, "flow", DATE).vitals, { hr: "74" });
  for (const fields of [{}, { systolic: "124" }, { diastolic: "82" }, { oxygen: "101" }, { pulse: "NaN" }, { pulse: "74.5" }, { weight: "Infinity" }, { pulse: "74", recordedAt: "invalid" }, { pulse: "74", recordedAt: "2026-10-08T12:00:00Z" }]) {
    const h = harness({ readFields: () => fields }); await h.submit();
    assert.equal(h.calls.length, 0); assert.equal(h.saves.length, 0); assert.equal(h.status.dataset.state, "not-saved");
  }
  for (const patch of [{ getProgramId: () => "unknown" }, { getSessionToken: () => null }]) {
    const h = harness(patch); await h.submit(); assert.equal(h.calls.length, 0);
  }
  const invalid = harness(); invalid.form.reportValidity = () => false; await invalid.submit(); assert.equal(invalid.calls.length, 0);
});

test("preview saves only on the device and never reads a session or calls the bridge", async () => {
  const h = harness({ isPreview: true, getSessionToken: () => { throw new Error("Preview must not read a session"); } }); await h.submit();
  assert.equal(h.calls.length, 0); assert.equal(h.saves.length, 0); assert.deepEqual(h.previewSaves, [FIELDS]);
  assert.equal(h.status.dataset.state, "device-only"); assert.match(h.status.textContent, /Saved on this device only.*BHW Cloud was not changed/);
  const failed = harness({ isPreview: true, savePreview: () => { throw new Error("Synthetic storage unavailable"); } }); await failed.submit();
  assert.equal(failed.status.dataset.state, "not-saved"); assert.equal(failed.button.disabled, false);
});

test("repeated Save reuses its ID while a later measurement gets a new ID without a history gate", async () => {
  let fields = { ...FIELDS };
  const h = harness({ readFields: () => fields, now: () => new Date("2026-10-07T18:00:00Z") });
  await h.submit(); await h.submit(); assert.equal(h.calls[0].options.body, h.calls[1].options.body);
  fields = { ...FIELDS, recordedAt: "2026-10-07T17:00:00Z" }; await h.submit();
  const later = JSON.parse(h.calls[2].options.body);
  assert.equal(later.submissionId, "synthetic-submission-2"); assert.equal(later.recordedAt, "2026-10-07T17:00:00.000Z"); assert.equal(h.calls.length, 3);
});

test("explicit rejection reports not saved and restores controls", async () => {
  const h = harness({ fetchImpl: async () => Response.json({ ok: false, saved: false, error: "Synthetic maintenance" }, { status: 503 }) }); await h.submit();
  assert.equal(h.saves.length, 0); assert.equal(h.status.dataset.state, "not-saved"); assert.match(h.status.textContent, /Not saved.*Synthetic maintenance/);
  assert.equal(h.button.disabled, false); assert.equal(h.attributes.has("aria-busy"), false);
});

test("lost responses and invalid JSON are unconfirmed; unchanged retries reuse the same ID", async () => {
  for (const failed of [async () => { throw new Error("Synthetic network outage"); }, async () => new Response("not JSON"), async () => Response.json({ ok: false, saveUnconfirmed: true }, { status: 502 })]) {
    const calls = [];
    const h = harness({ fetchImpl: async (_url, options) => { calls.push(options.body); return calls.length === 1 ? failed() : Response.json({ ok: true, savedAt: SAVED_AT }); } });
    await h.submit(); assert.equal(h.saves.length, 0); assert.equal(h.status.dataset.state, "save-unconfirmed"); assert.match(h.status.textContent, /Save not confirmed.*same readings/);
    await h.submit(); assert.equal(calls[0], calls[1]); assert.equal(h.status.dataset.state, "cloud-saved");
  }
});

test("saved clinical data with a failed review notice retries without creating a new reading", async () => {
  const calls = []; let fields = { ...FIELDS };
  const h = harness({ readFields: () => fields, fetchImpl: async (_url, options) => {
    calls.push(options.body); return calls.length === 1 ? Response.json({ ok: false, saved: true, savedAt: SAVED_AT }, { status: 502 }) : Response.json({ ok: true, savedAt: SAVED_AT });
  } });
  await h.submit(); assert.equal(h.status.dataset.state, "saved-review-pending"); assert.match(h.status.textContent, /^Saved to BHW Cloud.*not confirmed/);
  fields = {}; await h.submit(); assert.equal(calls.length, 1); assert.equal(h.status.dataset.state, "saved-review-pending");
  fields = { ...FIELDS }; await h.submit(); assert.equal(calls[0], calls[1]); assert.equal(h.status.dataset.state, "cloud-saved");
});

test("duplicate submits are suppressed during the POST and controls recover", async () => {
  let complete, calls = 0;
  const waiting = new Promise((resolve) => { complete = resolve; });
  const h = harness({ fetchImpl: async () => { calls += 1; return waiting; } });
  const first = h.submit(); assert.equal(h.button.disabled, true); assert.equal(h.attributes.get("aria-busy"), "true");
  await h.submit(); assert.equal(calls, 1);
  complete(Response.json({ ok: true, savedAt: SAVED_AT })); await first;
  assert.equal(h.button.disabled, false); assert.equal(h.attributes.has("aria-busy"), false);
});
