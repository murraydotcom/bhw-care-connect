import crypto from "node:crypto";

export function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
}

export function apiBase() {
  try {
    const url = new URL(String(env("OPERATIONS_CLOUD_API_URL")));
    if (url.protocol !== "https:") return "";
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function intakeConfigured() {
  return Boolean(apiBase() && env("CARE_CONNECT_INTAKE_SECRET"));
}

export function safeSubmissionId(value) {
  const supplied = String(value || "").trim();
  if (/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(supplied)) return supplied;
  return `care-connect:${crypto.randomUUID()}`;
}

export async function createCloudIntake(input, { fetchImpl = fetch } = {}) {
  const base = apiBase();
  const secret = env("CARE_CONNECT_INTAKE_SECRET");
  if (!base || !secret) return null;

  const idempotencyKey = safeSubmissionId(input.submissionId);
  const response = await fetchImpl(`${base}/v1/intake/patient-requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-BHW-Client-Id": env("CARE_CONNECT_CLIENT_ID") || "care-connect",
    },
    body: JSON.stringify(input.body),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Never include patient-submitted content in downstream error responses.
  }

  if (!response.ok) {
    const message = typeof data.error === "string"
      ? data.error
      : data.error?.message || "operations intake failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return { ...data, idempotencyKey };
}
