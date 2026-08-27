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
  return { ...claims, bhwPatientId: /^BHW\d{4}$/.test(bhwPatientId) ? bhwPatientId : "" };
}

export function signHealthCorePatientToken(bhwPatientId, secret, now = Date.now()) {
  if (!secret) throw new Error("Care Connect patient credential is not configured");
  if (!/^BHW\d{4}$/.test(String(bhwPatientId || ""))) throw new Error("Patient record is not linked");
  const issuedAt = Math.floor(now / 1000);
  const claims = {
    aud: "bhw-health-core-patient",
    iss: "bhw-care-connect",
    sub: "care-connect:patient-portal",
    role: "patient-portal",
    bhwPatientId,
    iat: issuedAt,
    exp: issuedAt + 60,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
