import {
  signHealthCorePatientToken,
  verifyCareConnectPatientSession,
} from "./_shared/patient-session.mjs";
import { asLambdaHandler } from "./_shared/lambda-adapter.mjs";

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

export function createPatientPortalHandler({
  environment = netlifyEnvironment,
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  return async function patientPortal(request) {
    if (request.method !== "GET") return json(405, { ok: false, error: "GET only" });
    const env = typeof environment === "function" ? environment() : environment;
    const baseUrl = healthCoreBaseUrl(env.HEALTH_CORE_API_URL);
    if (!env.SESSION_SECRET || !env.CARE_CONNECT_PATIENT_TOKEN_SECRET || !baseUrl) {
      return json(503, { ok: false, error: "The patient dashboard is not available right now." });
    }

    const sessionToken = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const session = verifyCareConnectPatientSession(sessionToken, env.SESSION_SECRET, now());
    if (!session) return json(401, { ok: false, error: "Please sign in again." });
    if (!session.bhwPatientId) {
      return json(409, { ok: false, error: "We verified you, but your dashboard is not linked yet. Please call the office for help." });
    }

    const upstreamToken = signHealthCorePatientToken(
      session,
      env.CARE_CONNECT_PATIENT_TOKEN_SECRET,
      now(),
    );
    try {
      const response = await fetchImpl(
        `${baseUrl}/v1/patient-portal/${encodeURIComponent(session.bhwPatientId)}/dashboard`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${upstreamToken}`, Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true || !body?.dashboard) {
        if (response.status === 404) return json(404, { ok: false, error: "Your dashboard is not ready yet." });
        return json(502, { ok: false, error: "The patient dashboard could not be loaded." });
      }
      return json(200, { ok: true, dashboard: body.dashboard });
    } catch {
      return json(502, { ok: false, error: "The patient dashboard could not be loaded." });
    }
  };
}

const patientPortalHandler = createPatientPortalHandler();
export default patientPortalHandler;
export const handler = asLambdaHandler(patientPortalHandler);

export const config = { path: "/api/patient-portal/dashboard" };
