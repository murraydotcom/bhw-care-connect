export const PATIENT_HEALTH_BLUEPRINT_SCHEMA = "bhw.patient-health-blueprint.v1";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isReleasedHealthBlueprint(value) {
  return Boolean(
    value
    && value.schemaVersion === PATIENT_HEALTH_BLUEPRINT_SCHEMA
    && value.release?.status === "patient-shared"
    && value.release?.clinicalReviewStatus === "provider-approved"
    && value.release?.patientShareAuthorized === true
    && value.release?.criticalSafetyClosed === true
    && list(value.release?.requiredForPatientRelease).length === 0
    && text(value.document?.documentId)
    && Number.isInteger(Number(value.document?.version))
    && Number(value.document.version) >= 1
    && /^[a-f0-9]{64}$/i.test(text(value.release?.signedContentHash)),
  );
}

export function releasedHealthBlueprint(value) {
  return isReleasedHealthBlueprint(value) ? value : null;
}

export function blueprintPlanView(healthBlueprint, fallback = null) {
  if (!isReleasedHealthBlueprint(healthBlueprint)) return fallback;
  const takeaway = healthBlueprint.healthBlueprint?.onePageTakeaway || {};
  const priorities = list(healthBlueprint.healthBlueprint?.topPriorities)
    .map((item) => text(item?.title) || text(item?.detail))
    .filter(Boolean);
  const stagedActions = list(healthBlueprint.healthBlueprint?.stagedPlan)
    .flatMap((stage) => list(stage?.actions))
    .map(text)
    .filter(Boolean);
  return {
    status: "patient-shared",
    summary: text(takeaway.mainStory)
      || text(healthBlueprint.overview?.mainStory)
      || text(healthBlueprint.patient?.mainConcern),
    today: list(takeaway.doNow).map(text).filter(Boolean).length
      ? list(takeaway.doNow).map(text).filter(Boolean)
      : stagedActions.slice(0, 3),
    priorities,
    systems: list(fallback?.systems),
    source: "released-health-blueprint",
  };
}

function legacyLabPanel(labs) {
  const results = list(labs).map((lab) => ({
    observationId: text(lab?.id),
    name: text(lab?.name),
    value: lab?.value === undefined || lab?.value === null ? "Not documented" : String(lab.value),
    unit: text(lab?.unit),
    labRange: text(lab?.referenceRange),
    status: text(lab?.status) || "Shared",
    trend: "",
    meaning: text(lab?.interpretation?.summary),
    connection: text(lab?.interpretation?.connection),
  })).filter((result) => result.name);
  if (!results.length) return [];
  return [{
    id: "legacy-clinician-shared-results",
    title: "Clinician-shared results",
    status: "Shared",
    summary: "These results use the earlier Care Connect display contract.",
    results,
    source: "legacy-dashboard",
  }];
}

export function blueprintLabPanels(healthBlueprint, legacyLabs = []) {
  if (!isReleasedHealthBlueprint(healthBlueprint)) return legacyLabPanel(legacyLabs);
  return list(healthBlueprint.labAnalysis?.panels).map((panel, panelIndex) => ({
    id: text(panel?.id) || `released-panel-${panelIndex + 1}`,
    title: text(panel?.title) || "Laboratory results",
    status: text(panel?.status) || "Reviewed",
    summary: text(panel?.summary),
    source: "released-health-blueprint",
    results: list(panel?.results).map((result) => ({
      observationId: text(result?.observationId),
      name: text(result?.name),
      value: result?.value === undefined || result?.value === null ? "Not documented" : String(result.value),
      unit: text(result?.unit),
      labRange: text(result?.labRange),
      status: text(result?.status) || "Reviewed",
      trend: text(result?.trend),
      meaning: text(result?.meaning),
      connection: "",
    })).filter((result) => result.name),
  })).filter((panel) => panel.results.length);
}
