import assert from "node:assert/strict";
import test from "node:test";
import {
  PATIENT_HEALTH_BLUEPRINT_SCHEMA,
  blueprintLabPanels,
  blueprintPlanView,
  isReleasedHealthBlueprint,
} from "../patient/health-blueprint-contract.mjs";

function healthCoreProjection() {
  return {
    schemaVersion: PATIENT_HEALTH_BLUEPRINT_SCHEMA,
    document: { documentId: "SYN-BLUEPRINT-1", version: 3, generatedAt: "2026-10-02T15:00:00.000Z" },
    release: {
      status: "patient-shared",
      clinicalReviewStatus: "provider-approved",
      patientShareAuthorized: true,
      criticalSafetyClosed: true,
      signedContentHash: "a".repeat(64),
      requiredForPatientRelease: [],
    },
    patient: { displayName: "Synthetic Patient", mainConcern: "Synthetic story." },
    overview: { mainStory: "Provider-approved synthetic story." },
    healthBlueprint: {
      topPriorities: [{ rank: 1, title: "First signed priority", detail: "Synthetic rationale." }],
      stagedPlan: [{ window: "Weeks 1 to 4", status: "Foundation", actions: ["Begin the first signed action."] }],
      onePageTakeaway: { mainStory: "Exact signed patient story.", doNow: ["Begin the first signed action."] },
    },
    labAnalysis: {
      panels: [{
        id: "nutrients",
        title: "Nutrients",
        status: "Needs attention",
        summary: "Ferritin needs follow-up.",
        results: [{
          observationId: "SYN-OBS-1",
          name: "Ferritin",
          value: "38",
          unit: "ng/mL",
          labRange: "15-150 ng/mL",
          status: "Needs support",
          trend: "Not separately documented in this signed version",
          meaning: "This result helps us understand stored iron.",
        }],
      }],
    },
  };
}

test("Care Connect consumes the Health Core patient-health-blueprint v1 contract", () => {
  const projection = healthCoreProjection();
  assert.equal(isReleasedHealthBlueprint(projection), true);
  assert.deepEqual(blueprintPlanView(projection, { systems: [{ id: "cardiovascular" }] }), {
    status: "patient-shared",
    summary: "Exact signed patient story.",
    today: ["Begin the first signed action."],
    priorities: ["First signed priority"],
    systems: [{ id: "cardiovascular" }],
    source: "released-health-blueprint",
  });
  assert.deepEqual(blueprintLabPanels(projection)[0].results[0], {
    observationId: "SYN-OBS-1",
    name: "Ferritin",
    value: "38",
    unit: "ng/mL",
    labRange: "15-150 ng/mL",
    status: "Needs support",
    trend: "Not separately documented in this signed version",
    meaning: "This result helps us understand stored iron.",
    connection: "",
  });
});

test("Care Connect refuses to label an incomplete Health Core payload as released", () => {
  const valid = healthCoreProjection();
  for (const mutate of [
    (value) => { value.schemaVersion = "bhw.patient-health-blueprint.v2"; },
    (value) => { value.release.status = "pending"; },
    (value) => { value.release.clinicalReviewStatus = "pending"; },
    (value) => { value.release.patientShareAuthorized = false; },
    (value) => { value.release.criticalSafetyClosed = false; },
    (value) => { value.release.requiredForPatientRelease = ["provider approval"]; },
    (value) => { value.release.signedContentHash = ""; },
    (value) => { value.release.signedContentHash = "synthetic-hash"; },
    (value) => { value.document.version = 0; },
  ]) {
    const candidate = structuredClone(valid);
    mutate(candidate);
    assert.equal(isReleasedHealthBlueprint(candidate), false);
  }
});

test("older dashboard labs remain visibly compatible without acquiring release status", () => {
  const legacyPlan = { summary: "Earlier summary", today: ["Earlier action"], priorities: [] };
  assert.equal(blueprintPlanView(null, legacyPlan), legacyPlan);
  const panels = blueprintLabPanels(null, [{
    id: "legacy-1",
    name: "Legacy result",
    value: 7,
    unit: "mg/dL",
    referenceRange: "5-10",
    status: "monitoring",
    interpretation: { summary: "Earlier explanation.", connection: "Earlier connection." },
  }]);
  assert.equal(panels[0].source, "legacy-dashboard");
  assert.equal(panels[0].results[0].meaning, "Earlier explanation.");
  assert.equal(panels[0].results[0].connection, "Earlier connection.");
});
