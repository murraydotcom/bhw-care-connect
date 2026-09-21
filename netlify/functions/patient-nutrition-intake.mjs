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
const ACTIONS = new Set(["save-progress", "submit"]);

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

const text = (value, max = 240) => String(value ?? "").trim().slice(0, max);

function authContext(request, env, now) {
  const baseUrl = healthCoreBaseUrl(env.HEALTH_CORE_API_URL);
  if (!env.SESSION_SECRET || !env.CARE_CONNECT_PATIENT_TOKEN_SECRET || !baseUrl) {
    return { error: json(503, { ok: false, error: "The nutrition questionnaire is not available right now." }) };
  }
  const sessionToken = text(request.headers.get("authorization"), 5000).replace(/^Bearer\s+/i, "");
  const session = verifyCareConnectPatientSession(sessionToken, env.SESSION_SECRET, now());
  if (!session) return { error: json(401, { ok: false, error: "Please sign in again." }) };
  if (!session.bhwPatientId) return { error: json(409, { ok: false, error: "Your patient profile is not linked yet." }) };
  const upstreamToken = signHealthCorePatientToken(session, env.CARE_CONNECT_PATIENT_TOKEN_SECRET, now());
  return { baseUrl, session, upstreamToken };
}

function patientSubmission(value = {}) {
  const action = text(value.action, 40).toLowerCase();
  if (!ACTIONS.has(action)) return null;
  const expectedRevision = Number(value.expectedRevision ?? 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return null;
  const questionnaireVersion = text(value.questionnaireVersion, 40);
  const questionnaireModuleVersions = value.questionnaireModuleVersions && typeof value.questionnaireModuleVersions === "object" && !Array.isArray(value.questionnaireModuleVersions)
    ? Object.fromEntries(Object.entries(value.questionnaireModuleVersions).slice(0, 10).map(([key, version]) => [text(key, 120), text(version, 40)]).filter(([key, version]) => key && version))
    : {};
  const questionnaireResponses = value.questionnaireResponses && typeof value.questionnaireResponses === "object" && !Array.isArray(value.questionnaireResponses)
    ? value.questionnaireResponses
    : {};
  return { action, expectedRevision, questionnaireVersion, questionnaireModuleVersions, questionnaireResponses };
}

function clinicianReviewQueue(session, intake) {
  return {
    bhwPatientId: session.bhwPatientId,
    patientMatchStatus: "matched",
    requestType: "clinical-review",
    priority: "routine",
    summary: "Nutrition questionnaire ready for clinician reconciliation",
    message: `Review Health Core Nutrition Intelligence patient intake revision ${intake.revision}. The patient-reported answers remain in Health Core and have not been copied into the operations queue or accepted as chart facts.`,
    source: "care-connect",
    sourceReference: `nutrition-intake-r${intake.revision}`,
    manualNotifyOnly: true,
    notificationMode: "none",
    routing: {
      targetSystem: "crewos",
      assignedTeam: "clinical",
      ownerRole: "provider",
      downstreamReference: `nutrition-intake-r${intake.revision}`,
    },
    sourceMetadata: {
      sourceRecordId: `nutrition-intake-r${intake.revision}`,
      sourcePage: "care-connect-nutrition-intelligence",
      questionnaireVersion: intake.questionnaireVersion,
      answerCount: intake.answerCount,
      status: intake.status,
    },
  };
}

export function createPatientNutritionIntakeHandler({
  environment = environmentFromNetlify,
  fetchImpl = fetch,
  queueImpl = createCloudIntake,
  now = Date.now,
} = {}) {
  return async function patientNutritionIntake(request) {
    if (!["GET", "PUT"].includes(request.method)) return json(405, { ok: false, error: "GET or PUT only" });
    const env = typeof environment === "function" ? environment() : environment;
    const context = authContext(request, env, now);
    if (context.error) return context.error;
    const path = `${context.baseUrl}/v1/patient-portal/${encodeURIComponent(context.session.bhwPatientId)}/nutrition-intake`;
    const headers = { Authorization: `Bearer ${context.upstreamToken}`, Accept: "application/json" };

    try {
      if (request.method === "GET") {
        const response = await fetchImpl(path, { method: "GET", headers, signal: AbortSignal.timeout(10_000) });
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.ok !== true) return json(502, { ok: false, error: "The nutrition questionnaire could not be loaded." });
        return json(200, {
          ok: true,
          questionnaire: body.questionnaire,
          giPatternScreen: body.giPatternScreen,
          kidneyQuestionnaire: body.kidneyQuestionnaire,
          boundary: body.boundary,
          intake: body.intake || null,
        });
      }

      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > 900_000) return json(413, { ok: false, error: "The nutrition questionnaire is too large." });
      let parsed;
      try { parsed = JSON.parse(raw || "{}"); } catch { return json(400, { ok: false, error: "The nutrition questionnaire is not valid." }); }
      const submission = patientSubmission(parsed);
      if (!submission) return json(400, { ok: false, error: "The nutrition questionnaire is incomplete." });
      const response = await fetchImpl(path, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(submission),
        signal: AbortSignal.timeout(12_000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true || body?.readBackVerified !== true) {
        const status = [400, 409, 413].includes(response.status) ? response.status : 502;
        return json(status, { ok: false, error: status === 409 ? "This questionnaire changed in another session. Reload before saving again." : "The nutrition questionnaire could not be saved." });
      }
      const intake = body.intake || {};
      if (submission.action !== "submit") return json(200, { ok: true, intake, savedAt: body.savedAt, readBackVerified: true });

      const queueBody = clinicianReviewQueue(context.session, intake);
      try {
        const queued = await queueImpl({
          submissionId: `care-connect-nutrition:${context.session.bhwPatientId}:r${intake.revision}`,
          body: queueBody,
        });
        const queueReference = queued?.patientRequest?.patientRequestId || queued?.patientRequest?.id || queued?.request?.id;
        if (!queueReference) throw new Error("operations queue returned no request reference");
        return json(200, { ok: true, intake, savedAt: body.savedAt, readBackVerified: true, queueReference });
      } catch {
        return json(502, {
          ok: false,
          saved: true,
          intake,
          savedAt: body.savedAt,
          readBackVerified: true,
          error: "Your nutrition questionnaire was saved to BHW Cloud, but the clinician review queue could not be confirmed. Please try Submit again.",
        });
      }
    } catch {
      return json(502, { ok: false, error: request.method === "GET" ? "The nutrition questionnaire could not be loaded." : "The nutrition questionnaire could not be saved." });
    }
  };
}

const patientNutritionIntakeHandler = createPatientNutritionIntakeHandler();
export default patientNutritionIntakeHandler;
export const handler = asLambdaHandler(patientNutritionIntakeHandler);
export const config = { path: "/api/patient-portal/nutrition-intake" };
