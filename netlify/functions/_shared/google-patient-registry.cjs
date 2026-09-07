function serviceError(status, message) {
  return Object.assign(new Error(message), { status });
}

function operationsBase(value) {
  try {
    const url = new URL(String(value || ""));
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function resolveGooglePatientIdentity(input, {
  environment = process.env,
  fetchImpl = fetch,
} = {}) {
  const base = operationsBase(environment.OPERATIONS_CLOUD_API_URL);
  const secret = String(environment.CARE_CONNECT_PATIENT_IDENTITY_SECRET || "");
  if (!base || !secret) {
    throw serviceError(503, "Patient sign-in is not connected to the BHW patient registry yet.");
  }
  const response = await fetchImpl(`${base}/v1/patient-identity/resolve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-BHW-Client-Id": String(environment.CARE_CONNECT_CLIENT_ID || "care-connect"),
    },
    body: JSON.stringify({
      ...(input.email ? { verifiedEmail: String(input.email).trim().toLowerCase() } : {}),
      ...(input.phone ? { verifiedPhone: String(input.phone).trim() } : {}),
      dateOfBirth: String(input.dateOfBirth || ""),
    }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) {
      throw serviceError(403, "We could not securely match this sign-in to one BHW patient record. Please call the office for help.");
    }
    if (response.status === 429) {
      throw serviceError(429, "Sign-in matching is temporarily locked. Please try again later or call the office.");
    }
    if (response.status === 503) {
      throw serviceError(503, "Patient portal access is not available right now. Please call the office for help.");
    }
    throw serviceError(502, "The BHW patient registry could not be reached. Please try again.");
  }
  const bhwPatientId = String(body.patient?.bhwPatientId || "").toUpperCase();
  if (!/^BHW\d{4}$/.test(bhwPatientId)) {
    throw serviceError(502, "The BHW patient registry returned an invalid match.");
  }
  const authorization = body.patient?.portalAuthorization;
  const now = Date.now();
  const currentTime = (value) => {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) && parsed <= now;
  };
  const validAuthorization = authorization
    && authorization.schemaVersion === "bhw.patient-portal-access.v1"
    && authorization.accessType === "self"
    && authorization.proxyAccessAllowed === false
    && authorization.pilotCohort === "primary-care-adult-v1"
    && authorization.portalAccessStatus === "active"
    && Array.isArray(authorization.programs)
    && authorization.programs.includes("primary")
    && ["email", "sms"].includes(authorization.preferredChannel)
    && authorization.verifiedChannel === authorization.preferredChannel
    && currentTime(authorization.contactVerifiedAt)
    && currentTime(authorization.consentedAt)
    && currentTime(authorization.portalInvitedAt)
    && currentTime(authorization.authorizationUpdatedAt);
  if (!validAuthorization) {
    throw serviceError(502, "The BHW patient registry did not return a current patient portal authorization.");
  }
  return {
    bhwPatientId,
    preferredName: String(body.patient?.preferredName || "Patient").trim().slice(0, 100) || "Patient",
    portalAuthorization: authorization,
  };
}

module.exports = { operationsBase, resolveGooglePatientIdentity };
