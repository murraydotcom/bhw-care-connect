import {
  signHealthCorePatientToken,
  verifyCareConnectPatientSession,
} from "./_shared/patient-session.mjs";
import { createCloudIntake } from "./_shared/operations.mjs";
import { asLambdaHandler } from "./_shared/lambda-adapter.mjs";

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: responseHeaders });
const PROGRAMS = new Set(["primary", "mind", "charmed", "flow"]);
const NUTRITION_KEYS = new Set(["p", "c", "f", "fiber", "sugar", "sodium", "vitd", "vitc", "iron", "calcium", "potassium", "magnesium"]);
const VITAL_KEYS = new Set(["bp", "hr", "wt", "glu", "temp", "o2", "steps"]);
const WELL_KEYS = new Set(["feeling", "motivation", "sleep", "movement", "outside", "people", "nutrition"]);

function environmentFromNetlify() {
  const value = (name) => globalThis.Netlify?.env?.get?.(name) || process.env[name];
  return {
    SESSION_SECRET: value("SESSION_SECRET"),
    HEALTH_CORE_API_URL: value("HEALTH_CORE_API_URL"),
    CARE_CONNECT_PATIENT_TOKEN_SECRET: value("CARE_CONNECT_PATIENT_TOKEN_SECRET"),
  };
}

function healthCoreBaseUrl(value) {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

const text = (value, max = 240) => String(value || "").trim().slice(0, max);
const number = (value, min = 0, max = 100000) => {
  if (value === "" || value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Math.min(max, Math.max(min, Number(value)));
};
const strings = (value, limit = 20, max = 120) => Array.isArray(value)
  ? value.slice(0, limit).map((entry) => text(entry, max)).filter(Boolean)
  : [];

function selectedObject(value, allowedKeys, max = 120) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const selected = {};
  for (const key of allowedKeys) {
    const current = source[key];
    if (current === undefined || current === null || current === "") continue;
    selected[key] = typeof current === "number" ? current : text(current, max);
  }
  return selected;
}

function normalizeCheckin(body) {
  const program = text(body?.program, 20).toLowerCase();
  if (!PROGRAMS.has(program)) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || "")) ? body.date : null;
  if (!date) return null;
  const nutritionSource = selectedObject(body.nutrition, NUTRITION_KEYS, 30);
  const nutrition = Object.fromEntries(Object.entries(nutritionSource).map(([key, value]) => [key, number(value)]).filter(([, value]) => value !== null));
  const waterCups = number(body.waterCups, 0, 40);
  const mealPhotoCount = number(body.mealPhotoCount, 0, 20);
  return {
    schemaVersion: "bhw.patient-checkin.v1",
    program,
    date,
    well: selectedObject(body.well, WELL_KEYS, 80),
    symptoms: strings(body.symptoms, 20, 100),
    medicationsTaken: strings(body.medicationsTaken, 30, 140),
    foods: strings(body.foods, 60, 160),
    waterCups: waterCups ?? 0,
    mealPhotoCount: mealPhotoCount ?? 0,
    nutrition,
    vitals: selectedObject(body.vitals, VITAL_KEYS, 40),
    summary: text(body.summary, 5000),
  };
}

function authContext(request, env, now) {
  const baseUrl = healthCoreBaseUrl(env.HEALTH_CORE_API_URL);
  if (!env.SESSION_SECRET || !env.CARE_CONNECT_PATIENT_TOKEN_SECRET || !baseUrl) return { error: json(503, { ok: false, error: "Patient check-ins are not available right now." }) };
  const sessionToken = text(request.headers.get("authorization"), 5000).replace(/^Bearer\s+/i, "");
  const session = verifyCareConnectPatientSession(sessionToken, env.SESSION_SECRET, now());
  if (!session) return { error: json(401, { ok: false, error: "Please sign in again." }) };
  if (!session.bhwPatientId) return { error: json(409, { ok: false, error: "Your patient profile is not linked yet." }) };
  const upstreamToken = signHealthCorePatientToken(session.bhwPatientId, env.CARE_CONNECT_PATIENT_TOKEN_SECRET, now());
  return { baseUrl, session, upstreamToken };
}

function monitoringQueueBody(session, monitoring) {
  const checkInId = text(monitoring?.checkInId, 80);
  const program = text(monitoring?.program, 20).toLowerCase();
  const checkInDate = /^\d{4}-\d{2}-\d{2}$/.test(String(monitoring?.checkInDate || "")) ? monitoring.checkInDate : "";
  const submittedAt = Number.isFinite(new Date(monitoring?.submittedAt).getTime()) ? new Date(monitoring.submittedAt).toISOString() : "";
  if (!checkInId || !PROGRAMS.has(program) || !checkInDate || !submittedAt) return null;
  return {
    bhwPatientId: session.bhwPatientId,
    patientMatchStatus: "matched",
    requestType: "clinical-review",
    priority: "routine",
    summary: "Daily check-in ready for clinician review",
    message: `Review Health Core check-in ${checkInId}. Program: ${program}. Submitted: ${submittedAt}. Clinical values remain in Health Core and are not copied into the operations queue.`,
    source: "care-connect",
    sourceReference: checkInId,
    manualNotifyOnly: true,
    notificationMode: "none",
    routing: {
      targetSystem: "crewos",
      assignedTeam: "clinical",
      ownerRole: "provider",
      downstreamReference: checkInId,
    },
    sourceMetadata: {
      sourceRecordId: checkInId,
      sourcePage: "care-connect-daily-checkin",
    },
  };
}

export function createPatientCheckinsHandler({
  environment = environmentFromNetlify,
  fetchImpl = fetch,
  queueImpl = createCloudIntake,
  now = Date.now,
} = {}) {
  return async function patientCheckins(request) {
    if (!["GET", "POST"].includes(request.method)) return json(405, { ok: false, error: "GET or POST only" });
    const env = typeof environment === "function" ? environment() : environment;
    const context = authContext(request, env, now);
    if (context.error) return context.error;
    const requestUrl = new URL(request.url);
    const path = `${context.baseUrl}/v1/patient-portal/${encodeURIComponent(context.session.bhwPatientId)}/check-ins`;
    const headers = { Authorization: `Bearer ${context.upstreamToken}`, Accept: "application/json" };

    try {
      if (request.method === "GET") {
        const program = text(requestUrl.searchParams.get("program"), 20).toLowerCase();
        const days = Math.min(90, Math.max(1, Number(requestUrl.searchParams.get("days")) || 30));
        if (!PROGRAMS.has(program)) return json(400, { ok: false, error: "Unknown program." });
        const response = await fetchImpl(`${path}?program=${encodeURIComponent(program)}&days=${days}`, {
          method: "GET", headers, signal: AbortSignal.timeout(8000),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.ok !== true) return json(502, { ok: false, error: "Check-in history could not be loaded." });
        return json(200, { ok: true, targets: body.targets || {}, series: Array.isArray(body.series) ? body.series.slice(-90) : [] });
      }

      const raw = await request.text();
      if (raw.length > 64_000) return json(413, { ok: false, error: "The check-in is too large." });
      let submitted;
      try { submitted = JSON.parse(raw || "{}"); } catch { return json(400, { ok: false, error: "Invalid check-in." }); }
      const checkin = normalizeCheckin(submitted);
      if (!checkin) return json(400, { ok: false, error: "The check-in is incomplete." });
      const response = await fetchImpl(path, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(checkin),
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) return json(502, { ok: false, error: "The check-in could not be saved." });
      const savedAt = body.savedAt || new Date(now()).toISOString();
      const queueBody = monitoringQueueBody(context.session, body.monitoring);
      if (!queueBody) return json(502, {
        ok: false,
        saved: true,
        savedAt,
        error: "Your check-in was saved to BHW Cloud, but the clinician review reference could not be confirmed.",
      });
      try {
        const queued = await queueImpl({
          submissionId: `care-connect-checkin:${context.session.bhwPatientId}:${queueBody.sourceReference}`,
          body: queueBody,
        });
        const queueReference = queued?.patientRequest?.patientRequestId || queued?.patientRequest?.id || queued?.request?.id;
        if (!queueReference) throw new Error("operations queue returned no request reference");
        return json(200, { ok: true, savedAt, queueReference });
      } catch {
        return json(502, {
          ok: false,
          saved: true,
          savedAt,
          error: "Your check-in was saved to BHW Cloud, but the CrewHQ clinician review queue could not be confirmed. Please try again.",
        });
      }
    } catch {
      return json(502, { ok: false, error: request.method === "GET" ? "Check-in history could not be loaded." : "The check-in could not be saved." });
    }
  };
}

const patientCheckinsHandler = createPatientCheckinsHandler();
export default patientCheckinsHandler;
export const handler = asLambdaHandler(patientCheckinsHandler);
export const config = { path: "/api/patient-portal/check-ins" };
