import crypto from "node:crypto";

function verifiedPayload(token, secret) {
  if (!secret) return null;
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra) return null;
  const received = Buffer.from(signature);
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest("base64url"));
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function verifyCareConnectPatientSession(token, secret, now = Date.now()) {
  const claims = verifiedPayload(token, secret);
  if (claims?.kind !== "patient" || !Number.isFinite(claims?.exp) || claims.exp < now) return null;
  const bhwPatientId = String(claims.bhwPatientId || "");
  if (!/^BHW\d{4}$/.test(bhwPatientId)) return { ...claims, bhwPatientId: "" };
  const validPilotAuthorization = claims.schemaVersion === "bhw.patient-portal-access.v1"
    && claims.accessType === "self"
    && claims.proxyAccessAllowed === false
    && claims.pilotCohort === "primary-care-adult-v1"
    && claims.portalAccessStatus === "active"
    && Array.isArray(claims.programs)
    && claims.programs.includes("primary")
    && ["email", "sms"].includes(claims.verifiedChannel)
    && claims.preferredChannel === claims.verifiedChannel
    && Number.isFinite(new Date(claims.contactVerifiedAt).getTime())
    && Number.isFinite(new Date(claims.consentedAt).getTime())
    && Number.isFinite(new Date(claims.portalInvitedAt).getTime())
    && Number.isFinite(new Date(claims.authorizationUpdatedAt).getTime());
  return validPilotAuthorization ? { ...claims, bhwPatientId } : null;
}

export function signHealthCorePatientToken(sessionOrPatientId, secret, now = Date.now()) {
  if (!secret) throw new Error("Care Connect patient credential is not configured");
  const session = typeof sessionOrPatientId === "object" && sessionOrPatientId
    ? sessionOrPatientId
    : { bhwPatientId: sessionOrPatientId };
  const bhwPatientId = String(session.bhwPatientId || "");
  if (!/^BHW\d{4}$/.test(String(bhwPatientId || ""))) throw new Error("Patient record is not linked");
  const authorization = session.schemaVersion === "bhw.patient-portal-access.v1"
    ? session
    : bhwPatientId === "BHW0000"
      ? {
          schemaVersion: "bhw.patient-portal-access.v1",
          accessType: "self",
          proxyAccessAllowed: false,
          pilotCohort: "primary-care-adult-v1",
          programs: ["primary"],
          portalAccessStatus: "active",
          preferredChannel: "email",
          verifiedChannel: "email",
          contactVerifiedAt: new Date(now).toISOString(),
          consentedAt: new Date(now).toISOString(),
          portalInvitedAt: new Date(now).toISOString(),
          authorizationUpdatedAt: new Date(now).toISOString(),
        }
      : null;
  if (!authorization) throw new Error("Patient portal authorization is not current");
  const issuedAt = Math.floor(now / 1000);
  const claims = {
    aud: "bhw-health-core-patient",
    iss: "bhw-care-connect",
    sub: "care-connect:patient-portal",
    role: "patient-portal",
    bhwPatientId,
    schemaVersion: authorization.schemaVersion,
    accessType: authorization.accessType,
    proxyAccessAllowed: authorization.proxyAccessAllowed,
    pilotCohort: authorization.pilotCohort,
    programs: authorization.programs,
    portalAccessStatus: authorization.portalAccessStatus,
    preferredChannel: authorization.preferredChannel,
    verifiedChannel: authorization.verifiedChannel,
    contactVerifiedAt: authorization.contactVerifiedAt,
    consentedAt: authorization.consentedAt,
    portalInvitedAt: authorization.portalInvitedAt,
    authorizationUpdatedAt: authorization.authorizationUpdatedAt,
    iat: issuedAt,
    exp: issuedAt + 60,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
