export const CHECKIN_PROGRAM_IDS = Object.freeze({
  "primary-care": "primary",
  "mind-mood": "mind",
  "charmed-minds": "charmed",
  flow: "flow",
});

const VITAL_FIELDS = {
  systolic: [60, 260, true],
  diastolic: [30, 160, true],
  pulse: [30, 220, true],
  weight: [50, 700, false],
  oxygen: [50, 100, true],
  temperature: [90, 110, false],
};

export function vitalsCheckinPayload(fields, programId, date, submission = null) {
  const values = Object.fromEntries(Object.keys(VITAL_FIELDS).map((key) => [key, String(fields[key] ?? "").trim()]));
  if (!Object.values(values).some(Boolean)) throw new Error("Enter at least one measurement.");
  if (Boolean(values.systolic) !== Boolean(values.diastolic)) throw new Error("Enter both numbers for blood pressure.");
  for (const [key, [min, max, integer]] of Object.entries(VITAL_FIELDS)) {
    if (!values[key]) continue;
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new Error("Check the measurement ranges shown on the form.");
    }
  }
  const program = CHECKIN_PROGRAM_IDS[programId];
  if (!program) throw new Error("Choose a BHW program before saving vital signs.");
  const vitals = {};
  if (values.systolic) vitals.bp = `${values.systolic}/${values.diastolic}`;
  for (const [field, key] of [["pulse", "hr"], ["weight", "wt"], ["oxygen", "o2"], ["temperature", "temp"]]) {
    if (values[field]) vitals[key] = values[field];
  }
  return { schemaVersion: "bhw.patient-checkin.v2", program, date, vitals, ...(submission ? { submissionType: "vitals", ...submission } : {}) };
}

export function createVitalsSubmitHandler({
  isPreview,
  getProgramId,
  getSessionToken,
  savePreview,
  onSaved,
  fetchImpl = fetch,
  now = () => new Date(),
  createSubmissionId = () => crypto.randomUUID(),
  readFields = (form) => Object.fromEntries(new FormData(form)),
}) {
  let submitting = false;
  let pendingReview = false;
  let pendingSubmission = null;
  const savedTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : ` at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };
  return async function submitVitals(event) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const status = form.querySelector("#vitals-status");
    const button = form.querySelector('[type="submit"]');
    if (!form.reportValidity()) return;
    let values;
    let payload;
    try {
      values = readFields(form);
      const clock = now();
      const recorded = new Date(values.recordedAt || clock.toISOString());
      if (Number.isNaN(recorded.getTime()) || recorded > clock) throw new Error("Enter a valid measurement time that is not in the future.");
      const recordedAt = recorded.toISOString();
      payload = vitalsCheckinPayload(values, getProgramId(), recordedAt.slice(0, 10));
      const fingerprint = JSON.stringify({ ...payload, recordedAt });
      if (pendingSubmission?.fingerprint !== fingerprint) {
        pendingSubmission = { fingerprint, payload: { ...payload, submissionType: "vitals", submissionId: createSubmissionId(), recordedAt } };
        pendingReview = false;
      }
      payload = pendingSubmission.payload;
    } catch (error) {
      status.textContent = pendingReview ? `Review notice not confirmed. ${error.message}` : error.message;
      status.dataset.state = pendingReview ? "saved-review-pending" : "not-saved";
      return;
    }
    submitting = true;
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.dataset.state = "saving";
    let saveUnconfirmed = false;
    try {
      if (isPreview) {
        const savedAt = savePreview(values);
        status.textContent = `Saved on this device only${savedTime(savedAt)}. BHW Cloud was not changed.`;
        status.dataset.state = "device-only";
        return;
      }
      const token = getSessionToken();
      if (!token) throw new Error("Please sign in again.");
      const serialized = JSON.stringify(payload);
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      status.textContent = "Saving vital signs to BHW Cloud…";
      saveUnconfirmed = true;
      const response = await fetchImpl("/api/patient-portal/check-ins", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: serialized,
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json().catch(() => null);
      if (result?.ok === false || result?.ok === true) saveUnconfirmed = result.saveUnconfirmed === true;
      const confirmed = response.ok && result?.ok === true;
      if (!confirmed && result?.saved !== true) throw new Error(result?.error || "The vital signs could not be saved.");
      pendingReview = !confirmed;
      status.textContent = confirmed
        ? `Saved to BHW Cloud${savedTime(result.savedAt)} · ready for clinician review in CrewHQ.`
        : `Saved to BHW Cloud${savedTime(result.savedAt)}. The clinician review notice is not confirmed; retry Save with the same readings.`;
      status.dataset.state = confirmed ? "cloud-saved" : "saved-review-pending";
      onSaved(values, result.savedAt, confirmed, payload.recordedAt);
    } catch (error) {
      status.textContent = `${pendingReview ? "Review notice not confirmed." : saveUnconfirmed ? "Save not confirmed. Retry Save with the same readings." : "Not saved."} ${error.message || "Please try again."}`;
      status.dataset.state = pendingReview ? "saved-review-pending" : saveUnconfirmed ? "save-unconfirmed" : "not-saved";
    } finally {
      submitting = false;
      button.disabled = false;
      form.removeAttribute("aria-busy");
    }
  };
}
