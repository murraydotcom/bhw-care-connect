import { getProgramSystemContext, resolveProgramId, visiblePrograms, visibleSystems } from "./page-registry.mjs?v=interactive-atlas-1";
import { SESSION_KEY, formatStatus, isLocalPreview, loadPortalDashboard, node, patientHref, previewDashboard } from "./portal-data.mjs?v=interactive-atlas-1";

const auth = { mode: "email", sent: false, methodId: null };
const PREVIEW_STATE_KEY = "bhw_patient_blueprint_preview_state_v2";
const PROGRAM_MARKS = {
  "primary-care": "/hm-assets/bhw-emblem.png",
  "mind-mood": "/assets/mind-mood-logo.png",
  "charmed-minds": "/assets/charmed-minds-logo.png",
  flow: "/assets/brand/flow.png",
};
const CHECKIN_PROGRAM_IDS = {
  "primary-care": "primary",
  "mind-mood": "mind",
  "charmed-minds": "charmed",
  flow: "flow",
};
const $ = (id) => document.getElementById(id);
let currentDashboard = null;
let sharedSystems = [];
let activeProgramId = null;
let activeSystemId = null;
let activeMappingId = null;
let atlasPopoverOpen = false;
let interactionState = loadInteractionState();
let profileSubmissionKey = null;

function patientFirstName(patient = {}) {
  return String(patient.preferredName || patient.firstName || "").trim();
}

function fullCheckinHref(programId = activeProgramId) {
  const url = new URL("/bhw-checkin.html", location.origin);
  url.searchParams.set("program", CHECKIN_PROGRAM_IDS[programId] || "primary");
  url.searchParams.set("return", "portal");
  if (isLocalPreview) url.searchParams.set("preview", "1");
  return `${url.pathname}${url.search}`;
}

function updateCheckinLinks(programId) {
  const href = fullCheckinHref(programId);
  document.querySelectorAll("[data-checkin-link]").forEach((link) => { link.href = href; });
}

function readableDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
}

function renderDemographics(patient = {}) {
  const target = $("patient-demographics");
  target.replaceChildren();
  const patientId = [patient.bhwPatientId, patient.patientId, patient.mrn]
    .map((value) => String(value || "").trim().toUpperCase())
    .find((value) => /^BHW\d{4}$/.test(value));
  const name = String(patient.legalName || [patient.firstName, patient.lastName].filter(Boolean).join(" ") || patient.name || "").trim();
  const fields = [
    ["Name", name],
    ["Preferred name", patient.preferredName],
    ["BHW patient ID", patientId],
    ["Date of birth", readableDate(patient.dateOfBirth || patient.dob)],
    ["Sex assigned at birth", patient.sexAtBirth],
    ["Gender identity", patient.genderIdentity || patient.gender],
    ["Pronouns", patient.pronouns],
    ["Preferred language", patient.preferredLanguage || patient.language],
    ["Phone", patient.phone],
    ["Email", patient.email],
    ["Address", typeof patient.address === "string" ? patient.address : patient.address?.formatted],
  ].filter(([, value]) => String(value || "").trim());
  if (!fields.length) {
    target.append(node("div", "profile-empty", "Demographic information has not been shared in this portal view yet."));
    return;
  }
  fields.forEach(([label, value]) => {
    const row = node("div", "profile-fact");
    row.append(node("dt", "", label), node("dd", "", String(value)));
    target.append(row);
  });
}

function clinicalItems(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(/[;\n]+/).map((entry) => entry.trim()).filter(Boolean);
  return value ? [value] : [];
}

function renderClinicalList(targetId, value, emptyMessage, type) {
  const target = $(targetId);
  target.replaceChildren();
  const items = clinicalItems(value);
  if (!items.length) {
    target.append(node("p", "profile-empty", emptyMessage));
    return;
  }
  items.forEach((item) => {
    const card = node("article", `clinical-entry clinical-entry-${type}`);
    if (typeof item === "string") {
      card.append(node("strong", "", item));
    } else {
      const title = type === "specialist"
        ? item.name || item.specialty || "Specialist"
        : item.substance || item.name || "Recorded item";
      const details = type === "specialist"
        ? [item.specialty, item.organization || item.practice, item.phone].filter(Boolean)
        : [item.reaction, item.severity].filter(Boolean);
      const head = node("div", "clinical-entry-head");
      head.append(node("strong", "", title));
      if (item.status) head.append(node("span", "chip", formatStatus(item.status)));
      card.append(head);
      if (details.length) card.append(node("p", "", details.join(" · ")));
      if (item.lastVisit || item.nextVisit) {
        const dates = [item.lastVisit ? `Last visit ${readableDate(item.lastVisit)}` : "", item.nextVisit ? `Next visit ${readableDate(item.nextVisit)}` : ""].filter(Boolean);
        card.append(node("small", "", dates.join(" · ")));
      }
    }
    target.append(card);
  });
}

const REFERRAL_TERMINAL_STATUSES = new Set(["completed", "referral-completed", "closed", "closed-without-scheduling", "cancelled"]);

function activeReferrals(requests = []) {
  return (Array.isArray(requests) ? requests : []).filter((request) => {
    const type = String(request?.type || "").toLowerCase().replace(/[_ ]+/g, "-");
    const status = String(request?.status || "").toLowerCase().replace(/[_ ]+/g, "-");
    return type === "referral" && !REFERRAL_TERMINAL_STATUSES.has(status);
  });
}

function renderActiveReferrals(requests = []) {
  const target = $("patient-referrals");
  target.replaceChildren();
  const referrals = activeReferrals(requests);
  if (!referrals.length) {
    target.append(node("p", "profile-empty", "No active patient-visible referral is currently shared here. This does not mean a referral is absent from your clinical record."));
    return;
  }
  referrals.forEach((referral) => {
    const card = node("article", "clinical-entry clinical-entry-referral");
    const head = node("div", "clinical-entry-head");
    head.append(
      node("strong", "", referral.destinationName || referral.specialty || referral.organization || "Referral in progress"),
      node("span", "chip", formatStatus(referral.status)),
    );
    card.append(head);
    const details = [referral.specialty, referral.organization, referral.phone].filter(Boolean);
    if (details.length) card.append(node("p", "", details.join(" · ")));
    if (referral.message) card.append(node("p", "referral-message", referral.message));
    if (referral.statusChangedAt) card.append(node("small", "", `Updated ${readableDate(referral.statusChangedAt)}`));
    target.append(card);
  });
}

function renderPatientProfile(patient = {}, requests = []) {
  const verification = patient.verification || {};
  const fieldStatus = verification.fields || {};
  renderProfileVerification(verification);
  renderDemographics(patient);
  renderClinicalList("patient-allergies", patient.allergies, profileEmptyCopy("allergies", fieldStatus.allergies), "allergy");
  renderClinicalList("patient-intolerances", patient.intolerances, profileEmptyCopy("intolerances", fieldStatus.intolerances), "intolerance");
  renderClinicalList("patient-specialists", patient.specialists, profileEmptyCopy("specialists", fieldStatus.specialists), "specialist");
  renderActiveReferrals(requests);
}

const PROFILE_STATUS_LABELS = {
  verified: "Verified",
  "not-reviewed": "Not yet reviewed",
  "changes-pending": "Changes awaiting review",
  "needs-information": "More information needed",
  "partially-verified": "Partially verified",
};

function profileStatusLabel(value) {
  return PROFILE_STATUS_LABELS[value] || "Not yet reviewed";
}

function sectionVerificationStatus(fields, names) {
  const statuses = names.map((name) => fields?.[name] || "not-reviewed");
  if (statuses.includes("needs-information")) return "needs-information";
  if (statuses.includes("changes-pending")) return "changes-pending";
  if (statuses.every((status) => status === "verified")) return "verified";
  if (statuses.some((status) => status === "verified")) return "partially-verified";
  return "not-reviewed";
}

function renderVerificationBadge(id, status) {
  const target = $(id);
  if (!target) return;
  target.textContent = profileStatusLabel(status);
  target.dataset.status = status;
}

function renderProfileVerification(verification = {}) {
  const fields = verification.fields || {};
  renderVerificationBadge("profile-overall-status", verification.overallStatus || "not-reviewed");
  renderVerificationBadge("demographics-verification", sectionVerificationStatus(fields, ["sexAtBirth", "pronouns", "preferredLanguage"]));
  renderVerificationBadge("allergies-verification", fields.allergies || "not-reviewed");
  renderVerificationBadge("intolerances-verification", fields.intolerances || "not-reviewed");
  renderVerificationBadge("specialists-verification", fields.specialists || "not-reviewed");
}

function profileEmptyCopy(field, status) {
  const label = field === "specialists" ? "specialists" : field;
  if (status === "verified") return `No ${label} are currently recorded in the verified profile.`;
  if (status === "changes-pending") return `Your submitted ${label} changes are awaiting clinician review.`;
  if (status === "needs-information") return `Your care team needs more information before confirming ${label}.`;
  return `${label[0].toUpperCase()}${label.slice(1)} have not been reviewed yet.`;
}

function clinicalEditorLines(value, type) {
  return clinicalItems(value).map((item) => {
    if (typeof item === "string") return item;
    if (type === "specialist") return [item.name, item.specialty, item.organization || item.practice, item.phone].filter(Boolean).join(" | ");
    return [item.substance || item.name, item.reaction, item.severity].filter(Boolean).join(" | ");
  }).filter(Boolean).join("\n");
}

function prepareProfileForm() {
  const patient = currentDashboard?.patient || {};
  $("profile-sex-at-birth").value = patient.sexAtBirth || "";
  $("profile-pronouns").value = patient.pronouns || "";
  $("profile-language").value = patient.preferredLanguage || "";
  $("profile-allergies").value = clinicalEditorLines(patient.allergies, "allergy");
  $("profile-intolerances").value = clinicalEditorLines(patient.intolerances, "intolerance");
  $("profile-specialists").value = clinicalEditorLines(patient.specialists, "specialist");
  for (const id of ["profile-no-allergies", "profile-no-intolerances", "profile-no-specialists"]) $(id).checked = false;
  const pending = patient.verification?.pendingRequest;
  $("profile-form-status").textContent = pending?.status === "pending-review"
    ? "Your previous correction request is saved and awaiting clinician review."
    : pending?.status === "needs-information"
      ? "Your care team needs more information. Update the applicable fields and send again."
      : isLocalPreview
        ? "Preview only: synthetic changes stay on this device."
        : "Nothing has been submitted yet.";
}

function parseClinicalLines(value, type) {
  return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (type === "specialist") {
      const [name, specialty, organization, phone] = parts;
      return Object.fromEntries(Object.entries({ name, specialty, organization, phone }).filter(([, entry]) => entry));
    }
    const [substance, reaction, severity] = parts;
    return Object.fromEntries(Object.entries({ substance, reaction, severity }).filter(([, entry]) => entry));
  });
}

function profileChangesFromForm() {
  const patient = currentDashboard?.patient || {};
  const changes = {};
  const scalars = [
    ["sexAtBirth", $("profile-sex-at-birth").value],
    ["pronouns", $("profile-pronouns").value],
    ["preferredLanguage", $("profile-language").value],
  ];
  for (const [field, raw] of scalars) {
    const value = raw.trim();
    if (value && value !== String(patient[field] || "").trim()) changes[field] = value;
  }
  const lists = [
    ["allergies", "profile-allergies", "profile-no-allergies", "allergy"],
    ["intolerances", "profile-intolerances", "profile-no-intolerances", "intolerance"],
    ["specialists", "profile-specialists", "profile-no-specialists", "specialist"],
  ];
  for (const [field, inputId, emptyId, type] of lists) {
    const raw = $(inputId).value.trim();
    const confirmedEmpty = $(emptyId).checked;
    const current = parseClinicalLines(clinicalEditorLines(patient[field], type), type);
    if (!raw && !confirmedEmpty && current.length) throw new Error(`Select the no-${field} confirmation if you intend to clear that list.`);
    const next = confirmedEmpty ? [] : parseClinicalLines(raw, type);
    if (confirmedEmpty || JSON.stringify(next) !== JSON.stringify(current)) changes[field] = next;
  }
  return changes;
}

function applyPendingProfileRequest(request, savedAt) {
  const patient = currentDashboard.patient;
  patient.verification ||= { fields: {} };
  patient.verification.overallStatus = "changes-pending";
  patient.verification.pendingRequest = {
    requestId: request.requestId,
    status: request.status || "pending-review",
    fields: request.fields || [],
    submittedAt: savedAt,
  };
  for (const field of request.fields || []) patient.verification.fields[field] = "changes-pending";
  renderPatientProfile(patient, currentDashboard.requests);
}

async function submitProfileChanges(event) {
  event.preventDefault();
  const button = $("profile-submit-button");
  const status = $("profile-form-status");
  let changes;
  try {
    changes = profileChangesFromForm();
  } catch (error) {
    status.textContent = error.message;
    return;
  }
  if (!Object.keys(changes).length) {
    status.textContent = "No changes were entered.";
    return;
  }
  button.disabled = true;
  profileSubmissionKey ||= `profile:${crypto.randomUUID()}`;
  try {
    if (isLocalPreview) {
      const savedAt = new Date().toISOString();
      const request = { requestId: "PVR-SYNTHETIC-PREVIEW", status: "pending-review", fields: Object.keys(changes) };
      applyPendingProfileRequest(request, savedAt);
      status.textContent = "Preview only · not saved. This temporary screen state clears when the preview reloads; no BHW record or staff queue changed.";
      profileSubmissionKey = null;
      return;
    }
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) throw new Error("Please sign in again.");
    status.textContent = "Saving your correction request to BHW Cloud…";
    const response = await fetch("/api/patient-portal/profile-change-requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": profileSubmissionKey,
      },
      body: JSON.stringify({ changes }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) {
      if (body.saved) {
        status.textContent = `Saved to BHW Cloud at ${formatSavedTime(body.savedAt)}. The staff review queue was not confirmed; use Send again without changing the form.`;
        return;
      }
      throw new Error(body.error || "The correction request was not saved.");
    }
    applyPendingProfileRequest(body.request, body.savedAt);
    status.textContent = `Saved to BHW Cloud at ${formatSavedTime(body.savedAt)}. Your BHW clinician review is pending.`;
    profileSubmissionKey = null;
  } catch (error) {
    status.textContent = `Not saved. ${error.message || "Please try again."}`;
  } finally {
    button.disabled = false;
  }
}

function blueprintSummary(plan = {}) {
  return String(plan.summary || plan.mainStory || "").trim();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function blankInteractionState() {
  return { version: 1, date: todayKey(), completed: [], checkin: null, vitals: null, updatedAt: null };
}

function loadInteractionState() {
  if (!isLocalPreview) return blankInteractionState();
  try {
    const parsed = JSON.parse(localStorage.getItem(PREVIEW_STATE_KEY) || "null");
    if (!parsed || parsed.version !== 1) return blankInteractionState();
    if (parsed.date !== todayKey()) parsed.completed = [];
    return { ...blankInteractionState(), ...parsed, date: todayKey() };
  } catch {
    return blankInteractionState();
  }
}

function formatSavedTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function setPersistence(message, state = "not-saved") {
  document.querySelectorAll("[data-persistence-copy]").forEach((target) => {
    target.textContent = message;
    target.dataset.state = state;
  });
}

function reflectPersistence() {
  if (!isLocalPreview) {
    setPersistence("New entries are not connected to BHW Cloud yet", "not-saved");
    return;
  }
  if (interactionState.updatedAt) {
    setPersistence(`Saved on this device only · ${formatSavedTime(interactionState.updatedAt)}`, "device");
  } else {
    setPersistence("Preview data · not saved", "not-saved");
  }
}

function persistInteractionState() {
  if (!isLocalPreview) {
    reflectPersistence();
    return false;
  }
  interactionState.updatedAt = new Date().toISOString();
  localStorage.setItem(PREVIEW_STATE_KEY, JSON.stringify(interactionState));
  reflectPersistence();
  return true;
}

function setStatus(message) {
  $("login-status").textContent = message;
}

function empty(target, message) {
  target.replaceChildren(node("p", "empty", message));
}

function renderPlan(plan) {
  const target = $("plan");
  target.replaceChildren();
  if (!plan) return empty(target, "Your care team has not shared a Health Blueprint yet.");
  const summary = blueprintSummary(plan);
  if (summary) target.append(node("p", "section-intro", summary));
  if (plan.today?.length) {
    target.append(node("h3", "", "What to do now"));
    const list = node("ul", "actions");
    plan.today.forEach((action) => list.append(node("li", "", action)));
    target.append(list);
  }
  if (plan.priorities?.length) {
    target.append(node("h3", "", "First priorities"));
    const list = node("ul", "actions");
    plan.priorities.forEach((action) => list.append(node("li", "", action)));
    target.append(list);
  }
}

function renderTodayPath(plan) {
  const actions = plan?.today || [];
  const target = $("today-path");
  target.replaceChildren();
  $("blueprint-summary").textContent = blueprintSummary(plan) || "Your care team has not shared a Health Blueprint summary yet.";

  actions.forEach((action, index) => {
    const button = node("button", "path-item");
    button.type = "button";
    const actionId = `today-${index}`;
    const completed = interactionState.completed.includes(actionId);
    button.setAttribute("aria-pressed", String(completed));
    button.append(node("span", "path-item-marker", "✓"), node("span", "path-item-copy", action));
    button.addEventListener("click", () => {
      if (!isLocalPreview) {
        setPersistence("Not saved · secure BHW Cloud write connection required", "not-saved");
        return;
      }
      const selected = new Set(interactionState.completed);
      selected.has(actionId) ? selected.delete(actionId) : selected.add(actionId);
      interactionState.completed = [...selected];
      persistInteractionState();
      renderTodayPath(currentDashboard?.plan);
    });
    target.append(button);
  });

  const done = actions.filter((_, index) => interactionState.completed.includes(`today-${index}`)).length;
  $("today-progress").textContent = `${done} of ${actions.length}`;
  $("path-progress-bar").style.width = actions.length ? `${Math.round(done / actions.length * 100)}%` : "0%";

  const priorities = $("priority-chips");
  priorities.replaceChildren();
  (plan?.priorities || []).forEach((priority) => priorities.append(node("span", "priority-chip", priority)));
  renderRecentSignals();
}

function summarizeVitals(vitals) {
  if (!vitals) return "";
  const values = [];
  if (vitals.systolic && vitals.diastolic) values.push(`BP ${vitals.systolic}/${vitals.diastolic}`);
  if (vitals.pulse) values.push(`Pulse ${vitals.pulse} bpm`);
  if (vitals.weight) values.push(`Weight ${vitals.weight} lb`);
  if (vitals.oxygen) values.push(`Oxygen ${vitals.oxygen}%`);
  if (vitals.temperature) values.push(`Temperature ${vitals.temperature}°F`);
  return values.join(" · ");
}

function renderRecentSignals() {
  const target = $("recent-signals");
  target.replaceChildren();
  if (interactionState.checkin) {
    const item = node("div", "recent-signal");
    item.append(node("strong", "", "Latest check-in"), node("span", "", `${interactionState.checkin.overall} · Energy: ${interactionState.checkin.energy}`));
    target.append(item);
  }
  if (interactionState.vitals) {
    const item = node("div", "recent-signal");
    item.append(node("strong", "", "Latest vital signs"), node("span", "", summarizeVitals(interactionState.vitals)));
    target.append(item);
  }
  if (!target.childElementCount) {
    const item = node("div", "recent-signal");
    item.append(node("strong", "", "Your next signal"), node("span", "", "A check-in or measurement begins the pattern."));
    target.append(item);
  }
}

function renderMedications(medications) {
  const target = $("medications");
  target.replaceChildren();
  if (!medications?.length) return empty(target, "No medications are available in this view.");
  medications.forEach((medication) => {
    const item = node("article", "item");
    const head = node("div", "item-head");
    head.append(node("h3", "", medication.name), node("span", "chip", formatStatus(medication.clinicalStatus)));
    item.append(head);
    if (medication.instructions) item.append(node("p", "", medication.instructions));
    if (medication.request) {
      const request = node("div", "request");
      request.append(node("strong", "", formatStatus(medication.request.status)), node("p", "", medication.request.message));
      item.append(request);
    }
    target.append(item);
  });
}

function renderRequests(requests) {
  const target = $("requests");
  target.replaceChildren();
  const otherRequests = (Array.isArray(requests) ? requests : []).filter((request) => !activeReferrals([request]).length);
  if (!otherRequests.length) return empty(target, "No other patient-visible requests are open.");
  otherRequests.forEach((request) => {
    const item = node("article", "item");
    const head = node("div", "item-head");
    head.append(node("h3", "", formatStatus(request.type)), node("span", "chip", formatStatus(request.status)));
    item.append(head, node("p", "", request.message));
    target.append(item);
  });
}

function renderLabs(labs) {
  const target = $("labs");
  target.replaceChildren();
  if (!labs?.length) return empty(target, "No individualized laboratory interpretation has been shared in this view yet.");
  labs.forEach((lab) => {
    const item = node("article", "lab-result");
    const button = node("button", "lab-result-button");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    const heading = node("span", "lab-result-heading");
    heading.append(node("strong", "", lab.name), node("span", "chip", formatStatus(lab.status)));
    button.append(
      heading,
      node("span", "lab-result-value", `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`),
      node("span", "lab-result-range", lab.referenceRange ? `Reference ${lab.referenceRange}` : "Patient-specific interpretation available"),
    );
    const interpretation = node("div", "lab-interpretation");
    interpretation.hidden = true;
    interpretation.append(
      node("span", "insight-eyebrow", "From your completed Health Blueprint"),
      node("p", "", lab.interpretation?.summary || "Your care team has not shared an individualized interpretation yet."),
    );
    if (lab.interpretation?.connection) interpretation.append(node("p", "lab-connection", lab.interpretation.connection));
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      interpretation.hidden = expanded;
    });
    item.append(button, interpretation);
    target.append(item);
  });
}

function applyProgramTheme(program) {
  const studio = document.querySelector(".blueprint-studio");
  if (!studio || !program) return;
  studio.dataset.program = program.id;
  studio.style.setProperty("--program-ink", program.theme?.ink || "#102a3b");
  studio.style.setProperty("--program-accent", program.theme?.accent || "#82b6b6");
  studio.style.setProperty("--program-glow", program.theme?.glow || "#bdd8dc");
  studio.style.setProperty("--program-signal", program.theme?.signal || "#e6c98a");
}

function selectProgram(id) {
  const programs = visiblePrograms(currentDashboard);
  const resolved = resolveProgramId(id);
  const program = programs.find((entry) => entry.id === resolved) || programs[0];
  if (!program) return;
  atlasPopoverOpen = false;
  activeProgramId = program.id;
  updateCheckinLinks(program.id);
  applyProgramTheme(program);
  $("atlas-program-name").textContent = program.name;
  $("atlas-coordinate-program").textContent = program.name;
  document.querySelectorAll(".program-selector").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.programId === program.id));
  });
  if (activeSystemId && sharedSystems.length) selectSystem(activeSystemId, true);
}

function renderPrograms(dashboard) {
  const target = $("programs");
  target.replaceChildren();
  const programs = visiblePrograms(dashboard);
  if (!programs.length) return empty(target, "No BHW program page is assigned to your care space yet.");
  const requested = resolveProgramId(new URLSearchParams(location.search).get("p"));
  activeProgramId = programs.some((entry) => entry.id === requested) ? requested : (programs.find((entry) => entry.id === "primary-care")?.id || programs[0].id);
  programs.forEach((program, index) => {
    const card = node("article", `program-card program-${program.id}`);
    const selector = node("button", "program-selector");
    selector.type = "button";
    selector.dataset.programId = program.id;
    selector.setAttribute("aria-pressed", "false");
    selector.setAttribute("aria-label", `View the Health Blueprint through ${program.name}`);
    const mark = node("img", "program-mark");
    mark.src = PROGRAM_MARKS[program.id];
    mark.alt = "";
    const copy = node("div");
    copy.append(node("span", "program-index", String(index + 1).padStart(2, "0")), node("p", "eyebrow", program.eyebrow), node("h4", "", program.name));
    selector.append(mark, copy, node("span", "program-lens-copy", "Use this lens"));
    selector.addEventListener("click", () => selectProgram(program.id));
    const link = node("a", "program-page-link", "Open full program page →");
    link.href = patientHref(program.patientHref || program.href);
    link.setAttribute("aria-label", `Open the full ${program.name} page`);
    card.append(selector, link);
    target.append(card);
  });
  selectProgram(activeProgramId);
}

function approvedBlueprintMappings() {
  const mapping = currentDashboard?.blueprintMapping;
  if (!mapping || !["clinician-reviewed", "completed", "approved", "ready-to-share"].includes(mapping.status)) return [];
  return (mapping.items || []).filter((item) => item?.visibleToPatient !== false && ["approved", "clinician-reviewed", "shared"].includes(item?.reviewStatus));
}

function mappingMatches(item, systemId, programId) {
  const systems = [item.primarySystemId, ...(item.relatedSystemIds || [])].filter(Boolean);
  const programs = (item.programIds || []).map(resolveProgramId).filter(Boolean);
  return systems.includes(systemId) && (!programs.length || programs.includes(programId));
}

function destinationFor(item) {
  return {
    medication: "#medication-requests",
    "medication-request": "#medication-requests",
    "care-team-update": "#care-team-updates",
    lab: "#lab-results",
  }[item.destination] || "";
}

function populateInsight(target, item) {
  target.replaceChildren();
  if (!item) {
    target.append(node("p", "empty-insight", "No patient-specific symptom or intervention has been shared for this program and system yet."));
    return;
  }
  const head = node("div", "selected-insight-head");
  head.append(node("span", "insight-eyebrow", item.kind || "Blueprint connection"), node("span", "chip", formatStatus(item.status || "shared")));
  target.append(head, node("h4", "", item.label));
  if (item.physiologicalConnection) target.append(node("p", "", item.physiologicalConnection));
  if (item.intervention) {
    const intervention = node("div", "intervention-connection");
    intervention.append(node("span", "insight-eyebrow", "What your plan is doing"), node("strong", "", item.intervention));
    if (item.interventionDetail) intervention.append(node("p", "", item.interventionDetail));
    target.append(intervention);
  }
  const destination = destinationFor(item);
  if (destination) {
    const copy = item.destination === "lab" ? "Open the related lab interpretation →" : item.destination?.startsWith("medication") ? "Open Medication Request profile →" : "Open care-team updates →";
    const link = node("a", "insight-destination", copy);
    link.href = destination;
    target.append(link);
  }
}

function renderSelectedInsight(item) {
  populateInsight($("selected-insight"), item);
}

function closeAtlasPopover(restoreFocus = false) {
  atlasPopoverOpen = false;
  const popover = $("atlas-popover");
  popover.hidden = true;
  document.querySelectorAll(".atlas-callout").forEach((marker) => {
    marker.setAttribute("aria-expanded", "false");
    if (restoreFocus && marker.dataset.mappingId === activeMappingId) marker.focus();
  });
}

function renderAtlasPopover(item, system, items) {
  const popover = $("atlas-popover");
  popover.replaceChildren();
  if (!atlasPopoverOpen || !item) {
    popover.hidden = true;
    return;
  }
  const position = mappingPosition(item, system.id);
  popover.dataset.side = position?.x > 55 ? "left" : "right";

  const header = node("div", "atlas-popover-head");
  const heading = node("div");
  heading.append(
    node("span", "atlas-popover-label", "System atlas · Clinician shared"),
    node("strong", "", `Connection ${String(items.indexOf(item) + 1).padStart(2, "0")} of ${String(items.length).padStart(2, "0")}`),
  );
  const close = node("button", "atlas-popover-close", "Close");
  close.type = "button";
  close.setAttribute("aria-label", "Close Blueprint connection");
  close.addEventListener("click", () => closeAtlasPopover(true));
  header.append(heading, close);

  const program = visiblePrograms(currentDashboard).find((entry) => entry.id === activeProgramId);
  const context = node("p", "atlas-popover-context");
  context.append("Viewed through ", node("strong", "", program?.name || "your program"), " · ", system.shortName || system.name);
  const content = node("div", "selected-insight atlas-popover-content");
  populateInsight(content, item);
  popover.append(header, context, content);
  popover.hidden = false;
  popover.scrollIntoView({ block: "center", behavior: "auto" });
}

function mappingPosition(item, systemId) {
  const position = item.markers?.[systemId] || item.marker;
  if (!position || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.y))) return null;
  return { x: Math.min(94, Math.max(6, Number(position.x))), y: Math.min(88, Math.max(10, Number(position.y))) };
}

function renderSystemMappings(system) {
  const items = approvedBlueprintMappings().filter((item) => mappingMatches(item, system.id, activeProgramId));
  if (!items.some((item) => item.id === activeMappingId)) activeMappingId = items[0]?.id || null;
  const callouts = $("atlas-callouts");
  callouts.replaceChildren();
  items.forEach((item, index) => {
    const position = mappingPosition(item, system.id);
    if (!position) return;
    const marker = node("button", `atlas-callout atlas-callout-${item.kind || "connection"}`, String(index + 1).padStart(2, "0"));
    marker.type = "button";
    marker.style.left = `${position.x}%`;
    marker.style.top = `${position.y}%`;
    marker.dataset.side = position.x > 55 ? "left" : "right";
    marker.dataset.mappingId = item.id;
    marker.setAttribute("aria-label", `${item.label}: open Blueprint connection`);
    marker.setAttribute("aria-pressed", String(item.id === activeMappingId));
    marker.setAttribute("aria-controls", "atlas-popover");
    marker.setAttribute("aria-expanded", String(atlasPopoverOpen && item.id === activeMappingId));
    marker.addEventListener("click", () => {
      activeMappingId = item.id;
      atlasPopoverOpen = true;
      renderSystemMappings(system);
    });
    callouts.append(marker);
  });
  const list = $("system-insights");
  list.replaceChildren();
  items.forEach((item, index) => {
    const button = node("button", "insight-row");
    button.type = "button";
    button.setAttribute("aria-pressed", String(item.id === activeMappingId));
    button.append(node("span", "insight-number", String(index + 1).padStart(2, "0")), node("span", "insight-row-copy", item.label), node("span", "insight-kind", item.kind || "connection"));
    button.addEventListener("click", () => {
      activeMappingId = item.id;
      atlasPopoverOpen = true;
      renderSystemMappings(system);
    });
    list.append(button);
  });
  const selected = items.find((item) => item.id === activeMappingId);
  renderSelectedInsight(selected);
  renderAtlasPopover(selected, system, items);
}

function systemAsset(system) {
  const anatomyDisplay = String(currentDashboard?.patient?.anatomyDisplay || "neutral").toLowerCase();
  const assets = system.patientRecord?.assets || system.assets || {};
  const programAsset = system.patientRecord?.programAssets?.[activeProgramId];
  return programAsset || assets[anatomyDisplay] || assets.neutral || system.patientRecord?.asset || system.asset || "";
}

function prepareTransparentImage(image) {
  delete image.dataset.bhwBackgroundExtracted;
  if (window.BHWTransparentAnatomy) window.BHWTransparentAnatomy.prepare(image);
  else image.addEventListener("load", () => window.BHWTransparentAnatomy?.prepare(image), { once: true });
}

function selectSystem(id, immediate = false) {
  const system = sharedSystems.find((entry) => entry.id === id) || sharedSystems[0];
  if (!system) return;
  atlasPopoverOpen = false;
  activeSystemId = system.id;
  document.querySelectorAll(".system-node").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.systemId === system.id)));
  $("active-system-eyebrow").textContent = system.eyebrow;
  $("active-system-title").textContent = system.shortName;
  $("active-system-status").textContent = formatStatus(system.patientRecord?.status);
  $("active-system-summary").textContent = getProgramSystemContext(activeProgramId, system.id, system.patientRecord) || system.patientRecord?.summary || system.overview;
  const detailLink = $("active-system-link");
  detailLink.hidden = !system.href;
  if (system.href) detailLink.href = patientHref(system.href);
  renderSystemMappings(system);
  const image = $("active-system-image");
  const placeholder = $("atlas-image-placeholder");
  const asset = systemAsset(system);
  const applyImage = () => {
    image.hidden = !asset;
    placeholder.hidden = Boolean(asset);
    if (!asset) {
      image.classList.remove("is-changing");
      return;
    }
    image.src = asset.startsWith("/") ? asset : `./assets/${asset}`;
    image.alt = `${system.name} anatomy selected in your Health Blueprint`;
    prepareTransparentImage(image);
    image.addEventListener("load", () => image.classList.remove("is-changing"), { once: true });
  };
  if (immediate) applyImage();
  else {
    image.classList.add("is-changing");
    window.setTimeout(applyImage, 130);
  }
}

function renderSystems(dashboard) {
  const target = $("systems");
  target.replaceChildren();
  sharedSystems = visibleSystems(dashboard);
  if (!sharedSystems.length) {
    empty(target, "Your shared Blueprint does not include a registered body-system page yet.");
    return;
  }
  sharedSystems.forEach((system) => {
    const button = node("button", "system-node");
    button.type = "button";
    button.dataset.systemId = system.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Show ${system.name} in the body atlas`);
    const asset = systemAsset(system);
    const visual = asset ? node("img") : node("span", "system-node-placeholder", system.shortName.slice(0, 2).toUpperCase());
    if (asset) {
      visual.src = asset.startsWith("/") ? asset : `./assets/${asset}`;
      visual.alt = "";
      prepareTransparentImage(visual);
    }
    button.append(visual, node("span", "", system.shortName));
    button.addEventListener("click", () => selectSystem(system.id));
    target.append(button);
  });
  selectSystem(sharedSystems[0].id, true);
}

function renderDashboard(dashboard) {
  currentDashboard = dashboard;
  document.body.classList.add("portal-open");
  const firstName = patientFirstName(dashboard.patient);
  $("preferred-name").textContent = firstName || "Your";
  const generated = new Date(dashboard.generatedAt);
  $("updated").textContent = Number.isNaN(generated.getTime()) ? "" : `Blueprint updated ${generated.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
  $("printable-blueprint-link").href = patientHref("/bhw-patient-portal-mockup.html");
  $("summary-printable-link").href = patientHref("/bhw-patient-portal-mockup.html");
  renderPatientProfile(dashboard.patient, dashboard.requests);
  renderPrograms(dashboard);
  renderSystems(dashboard);
  renderPlan(dashboard.plan);
  renderTodayPath(dashboard.plan);
  renderLabs(dashboard.labs);
  renderMedications(dashboard.medications);
  renderRequests(dashboard.requests);
  reflectPersistence();
  $("login-view").hidden = true;
  $("dashboard-view").hidden = false;
}

function openDialog(id) {
  const dialog = $(id);
  if (!dialog) return;
  const status = id === "vitals-dialog" ? $("vitals-status") : null;
  if (status) status.textContent = isLocalPreview ? "Preview only: use synthetic information. Nothing has been saved yet." : "Secure BHW Cloud saving is not connected yet.";
  if (id === "profile-dialog") prepareProfileForm();
  dialog.showModal();
}

function closeDialog(button) {
  button.closest("dialog")?.close();
}

function submitVitals(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value).trim()]));
  const anyValue = Object.values(values).some(Boolean);
  if (!anyValue) {
    $("vitals-status").textContent = "Enter at least one measurement.";
    return;
  }
  if ((values.systolic && !values.diastolic) || (!values.systolic && values.diastolic)) {
    $("vitals-status").textContent = "Enter both numbers for blood pressure.";
    return;
  }
  if (!isLocalPreview) {
    $("vitals-status").textContent = "Not saved. This needs the secure BHW Cloud vital-sign connection.";
    setPersistence("Not saved · secure BHW Cloud write connection required", "not-saved");
    return;
  }
  interactionState.vitals = { ...values, recordedAt: new Date().toISOString() };
  persistInteractionState();
  renderRecentSignals();
  $("vitals-status").textContent = `Saved on this device only at ${formatSavedTime(interactionState.updatedAt)}.`;
}

function identityPayload() {
  const value = $("identity").value.trim();
  return auth.mode === "phone" ? { phone: value } : { email: value.toLowerCase() };
}

async function submitLogin(event) {
  event.preventDefault();
  const button = $("submit-button");
  const identity = $("identity").value.trim();
  const dob = $("dob").value;
  if (auth.mode === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) return setStatus("Enter a valid email address.");
  if (auth.mode === "phone" && identity.replace(/\D/g, "").length < 10) return setStatus("Enter a valid mobile number.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return setStatus("Enter your date of birth.");

  button.disabled = true;
  try {
    if (!auth.sent) {
      setStatus("Sending your BHW sign-in code…");
      const response = await fetch("/.netlify/functions/patient-auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", portalContract: "google-v1", ...identityPayload(), dob }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The code could not be sent.");
      auth.sent = true;
      auth.methodId = body.methodId || null;
      $("code-field").hidden = false;
      $("mode-button").hidden = true;
      $("identity").readOnly = true;
      $("dob").readOnly = true;
      $("submit-button").textContent = "Open my care space";
      $("code").focus();
      setStatus(body.demo ? "Preview mode: enter any 6 digits." : `Enter the code sent by ${auth.mode === "phone" ? "text." : "email."}`);
      return;
    }

    const code = $("code").value.trim();
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code.");
    setStatus("Opening your private care space…");
    const response = await fetch("/.netlify/functions/patient-auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", portalContract: "google-v1", methodId: auth.methodId, code, dob, ...identityPayload() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.token) throw new Error(body.error || "That code did not match.");
    sessionStorage.setItem(SESSION_KEY, body.token);
    renderDashboard(await loadPortalDashboard());
  } catch (error) {
    setStatus(error.message || "Please try again.");
  } finally {
    button.disabled = false;
  }
}

function toggleMode() {
  if (auth.sent) return;
  auth.mode = auth.mode === "email" ? "phone" : "email";
  const phone = auth.mode === "phone";
  $("identity-label").textContent = phone ? "Mobile number" : "Email";
  $("identity").type = phone ? "tel" : "email";
  $("identity").autocomplete = phone ? "tel" : "email";
  $("identity").placeholder = phone ? "(410) 555-0123" : "you@example.com";
  $("identity").value = "";
  $("submit-button").textContent = phone ? "Text my code" : "Email my code";
  $("mode-button").textContent = phone ? "Have an email? Use it instead" : "No email? Use a mobile number";
  setStatus("");
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

$("login-form").addEventListener("submit", submitLogin);
$("mode-button").addEventListener("click", toggleMode);
$("signout-button").addEventListener("click", signOut);
$("vitals-form").addEventListener("submit", submitVitals);
$("profile-form").addEventListener("submit", submitProfileChanges);
document.querySelectorAll("[data-open-dialog]").forEach((button) => button.addEventListener("click", () => openDialog(button.dataset.openDialog)));
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => closeDialog(button)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && atlasPopoverOpen) closeAtlasPopover(true);
});

if (isLocalPreview) {
  renderDashboard(previewDashboard());
} else if (sessionStorage.getItem(SESSION_KEY)) {
  setStatus("Opening your private care space…");
  loadPortalDashboard().then(renderDashboard).catch((error) => {
    sessionStorage.removeItem(SESSION_KEY);
    setStatus(error.message || "Please sign in again.");
  });
}
