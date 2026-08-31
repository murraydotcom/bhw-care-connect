// Receives a Care Connect "Just Ask" submission and sends it through the
// signed Google-native patient-request intake.

import {
  createCloudIntake,
  intakeConfigured,
  safeSubmissionId,
} from "./_shared/operations.mjs";
import { asLambdaHandler } from "./_shared/lambda-adapter.mjs";

export const config = {
  path: "/api/patient-requests",
};

export const ROUTE = {
  refill: {
    requestType: "medication",
    priority: "high",
    assignedTeam: "clinical",
    targetSystem: "medication-service",
  },
  clinical: {
    requestType: "clinical-question",
    priority: "urgent",
    assignedTeam: "clinical",
    targetSystem: "crewos",
  },
  scheduling: {
    requestType: "scheduling",
    priority: "routine",
    assignedTeam: "front-desk",
    targetSystem: "crewos",
  },
  billing: {
    requestType: "billing",
    priority: "routine",
    assignedTeam: "billing",
    targetSystem: "rcm",
  },
  portal: {
    requestType: "general",
    priority: "high",
    assignedTeam: "front-desk",
    targetSystem: "crewos",
  },
  general: {
    requestType: "general",
    priority: "routine",
    assignedTeam: "front-desk",
    targetSystem: "crewos",
  },
};

const clean = (value, limit) => String(value || "").trim().slice(0, limit);

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function cloudBody({ route, name, dob, summary, submissionId }) {
  const routeConfig = ROUTE[route] || ROUTE.general;
  const identity = [
    name ? `Patient-entered name: ${name}` : "",
    dob ? `Patient-entered DOB: ${dob}` : "",
  ].filter(Boolean).join("\n");
  const message = [summary, identity ? `Identity supplied for staff matching:\n${identity}` : ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);

  return {
    patientMatchStatus: "unmatched",
    requestType: routeConfig.requestType,
    priority: routeConfig.priority,
    summary: summary.slice(0, 500),
    message,
    requester: {
      displayName: name,
      preferredChannel: "portal",
    },
    routing: {
      targetSystem: routeConfig.targetSystem,
      assignedTeam: routeConfig.assignedTeam,
    },
    sourceMetadata: {
      sourceRecordId: submissionId,
      sourcePage: "care-connect-just-ask",
    },
  };
}

export async function submitTriage(request) {
  if (request.method !== "POST") return json(405, { error: "POST only" });

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 32 * 1024) {
    return json(413, { error: "That message is too large." });
  }

  let body;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return json(400, { error: "Bad JSON" });
  }

  const route = Object.hasOwn(ROUTE, body.route) ? body.route : "general";
  const name = clean(body.name, 120);
  const dob = clean(body.dob, 20);
  const summary = clean(body.summary || body.freeText, 1900);
  const submissionId = safeSubmissionId(body.submissionId);
  if (!summary) return json(400, { error: "Please tell us what you need." });

  if (!intakeConfigured()) {
    return json(503, { error: "Messaging is not connected yet — please call the office." });
  }

  try {
    const result = await createCloudIntake({
      submissionId,
      body: cloudBody({ route, name, dob, summary, submissionId }),
    });
    const reference = result?.patientRequest?.patientRequestId;
    if (!reference) throw new Error("operations intake returned no request reference");
    return json(200, {
      ok: true,
      reference,
      replayed: Boolean(result?.replayed),
    });
  } catch {
    // The stable submission ID makes an ambiguous retry safe. Never write a
    // second legacy copy after a Cloud attempt.
    return json(502, { error: "Could not send your message — please try again or call the office." });
  }
}

export default submitTriage;
export const handler = asLambdaHandler(submitTriage);
