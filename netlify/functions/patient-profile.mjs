import {
  signHealthCorePatientToken,
  verifyCareConnectPatientSession,
} from "./_shared/patient-session.mjs";
import { createCloudIntake } from "./_shared/operations.mjs";
import { asLambdaHandler } from "./_shared/lambda-adapter.mjs";

const PROFILE_FIELDS = new Set([
  "sexAtBirth",
  "pronouns",
  "preferredLanguage",
  "allergies",
  "intolerances",
  "specialists",
]);

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};

const json = (status, body) => new Response(JSON.stringify(body), { status, headers });

function netlifyEnvironment() {
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

function idempotencyKey(value) {
  const key = String(value || "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key) ? key : "";
}

function safeChanges(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([field]) => PROFILE_FIELDS.has(field)));
}

function queueBody(session, profileRequest) {
  const fields = Array.isArray(profileRequest.fields)
    ? profileRequest.fields.filter((field) => PROFILE_FIELDS.has(field))
    : [];
  return {
    bhwPatientId: session.bhwPatientId,
    patientMatchStatus: "matched",
    requestType: "other",
    priority: fields.some((field) => ["allergies", "intolerances"].includes(field)) ? "high" : "routine",
    summary: "Patient profile correction requires clinician review",
    message: `Review Health Core profile request ${profileRequest.requestId}. Submitted fields: ${fields.join(", ")}. Values remain in Health Core and are not copied into the operations queue.`,
    requester: { preferredChannel: "portal" },
    routing: {
      targetSystem: "crewos",
      assignedTeam: "clinical",
      ownerRole: "provider",
      downstreamReference: profileRequest.requestId,
    },
    sourceMetadata: {
      sourceRecordId: profileRequest.requestId,
      sourcePage: "care-connect-patient-profile",
    },
  };
}

export function createPatientProfileHandler({
  environment = netlifyEnvironment,
  fetchImpl = fetch,
  queueImpl = createCloudIntake,
  now = Date.now,
} = {}) {
  return async function patientProfile(request) {
    if (request.method !== "POST") return json(405, { ok: false, error: "POST only" });
    const env = typeof environment === "function" ? environment() : environment;
    const baseUrl = healthCoreBaseUrl(env.HEALTH_CORE_API_URL);
    if (!env.SESSION_SECRET || !env.CARE_CONNECT_PATIENT_TOKEN_SECRET || !baseUrl) {
      return json(503, { ok: false, error: "Patient profile updates are not available right now." });
    }

    const sessionToken = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const session = verifyCareConnectPatientSession(sessionToken, env.SESSION_SECRET, now());
    if (!session) return json(401, { ok: false, error: "Please sign in again." });
    if (!session.bhwPatientId) return json(409, { ok: false, error: "Your patient profile is not linked yet." });
    const key = idempotencyKey(request.headers.get("idempotency-key"));
    if (!key) return json(400, { ok: false, error: "The profile update is missing its retry-safe reference." });

    const raw = await request.text();
    if (raw.length > 32_000) return json(413, { ok: false, error: "The profile update is too large." });
    let submitted;
    try { submitted = JSON.parse(raw || "{}"); } catch { return json(400, { ok: false, error: "The profile update is invalid." }); }
    const changes = safeChanges(submitted.changes);
    if (!Object.keys(changes).length) return json(400, { ok: false, error: "Choose at least one profile section to update." });

    const upstreamToken = signHealthCorePatientToken(session.bhwPatientId, env.CARE_CONNECT_PATIENT_TOKEN_SECRET, now());
    let profileRequest;
    let replayed = false;
    try {
      const response = await fetchImpl(
        `${baseUrl}/v1/patient-portal/${encodeURIComponent(session.bhwPatientId)}/profile-change-requests`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${upstreamToken}`,
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify({ changes }),
          signal: AbortSignal.timeout(8000),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true || !body?.request) {
        if (response.status === 409) return json(409, { ok: false, error: "This retry reference was already used for different profile changes." });
        return json(502, { ok: false, error: "The profile update could not be saved." });
      }
      profileRequest = body.request;
      replayed = Boolean(body.replayed);
    } catch {
      return json(502, { ok: false, error: "The profile update could not be saved." });
    }

    try {
      const queued = await queueImpl({
        submissionId: key,
        body: queueBody(session, profileRequest),
      });
      const queueReference = queued?.patientRequest?.patientRequestId;
      if (!queueReference) throw new Error("operations queue returned no request reference");
      return json(replayed ? 200 : 201, {
        ok: true,
        savedAt: profileRequest.submittedAt,
        replayed,
        request: {
          requestId: profileRequest.requestId,
          status: profileRequest.status,
          fields: profileRequest.fields,
        },
        queueReference,
      });
    } catch {
      return json(502, {
        ok: false,
        saved: true,
        savedAt: profileRequest.submittedAt,
        requestId: profileRequest.requestId,
        error: "Your corrections were saved to BHW Cloud, but the staff review queue could not be confirmed. Please try again.",
      });
    }
  };
}

const patientProfileHandler = createPatientProfileHandler();
export default patientProfileHandler;
export const handler = asLambdaHandler(patientProfileHandler);
export const config = { path: "/api/patient-portal/profile-change-requests" };

