import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  PROGRAMS,
  SYSTEMS,
  getProgram,
  getSystem,
  isProgramVisible,
  isSystemVisible,
  resolveProgramId,
  resolveSystemId,
  visiblePrograms,
  visibleSystems,
} from "../patient/page-registry.mjs";

const dashboard = {
  patient: { preferredName: "Synthetic", programs: ["APCM", "Mind & Mood", "Unknown program"] },
  plan: {
    systems: [
      { id: "cardiovascular", label: "Legacy label", status: "shared", summary: "Synthetic cardiovascular focus." },
      { label: "Energy & metabolism", status: "shared", summary: "Synthetic endocrine focus." },
      { id: "not-registered", label: "Synthetic unknown system", status: "shared" },
    ],
  },
};

test("registry contains the four approved programs and seven approved systems", () => {
  assert.deepEqual(PROGRAMS.map(({ id }) => id), ["primary-care", "mind-mood", "charmed-minds", "flow"]);
  assert.deepEqual(SYSTEMS.map(({ id }) => id), [
    "cardiovascular", "respiratory", "digestive", "neurological",
    "endocrine", "immune-lymphatic", "musculoskeletal",
  ]);
});

test("the patient journey starts with the interactive living Blueprint", () => {
  const source = readFileSync(new URL("../patient/index.html", import.meta.url), "utf8");
  const blueprint = source.indexOf('id="blueprint-title"');
  const checkin = source.indexOf("data-checkin-link", blueprint);
  const vitals = source.indexOf('data-open-dialog="vitals-dialog"');
  const systems = source.indexOf('id="systems-title"');
  const programs = source.indexOf('id="programs-title"');
  assert.ok(blueprint > -1, "living Blueprint is missing");
  assert.ok(blueprint < checkin && checkin < programs && programs < systems, "the program lens, connected body map, and patient actions should lead the portal");
  assert.ok(vitals > blueprint && vitals < systems, "vital-sign entry should be available in the first Blueprint viewport");
  assert.match(source, /<h1><span id="preferred-name">Your<\/span>\. Your medical story\. Your Health Blueprint\.<\/h1>/);
  assert.doesNotMatch(source, /evolving story|health story/i);
  assert.equal((source.match(/id="plan"/g) || []).length, 1, "the Health Blueprint summary should not be duplicated");
  assert.match(source, /Printable Blueprint/);
  assert.match(source, /bhw-transparent-anatomy\.js/);
  assert.match(source, /id="atlas-coordinate-program">Primary Care</);
  assert.match(source, /id="atlas-popover"/);
  const controller = readFileSync(new URL("../patient/app.mjs", import.meta.url), "utf8");
  assert.match(controller, /\$\("atlas-coordinate-program"\)\.textContent = program\.name/);
  assert.match(controller, /renderAtlasPopover/);
  assert.match(controller, /aria-controls", "atlas-popover"/);
  assert.match(controller, /atlasPopoverOpen = true/);
  assert.match(controller, /event\.key === "Escape"/);
});

test("the main portal shares patient profile details and routes to the full lifestyle check-in", () => {
  const source = readFileSync(new URL("../patient/index.html", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../patient/app.mjs", import.meta.url), "utf8");
  const preview = readFileSync(new URL("../patient/portal-data.mjs", import.meta.url), "utf8");
  const checkin = readFileSync(new URL("../pages/bhw-checkin.html", import.meta.url), "utf8");
  for (const id of ["patient-demographics", "patient-allergies", "patient-intolerances", "patient-specialists"]) {
    assert.match(source, new RegExp(`id="${id}"`));
  }
  for (const id of ["profile-overall-status", "demographics-verification", "allergies-verification", "intolerances-verification", "specialists-verification", "profile-dialog", "profile-form"]) {
    assert.match(source, new RegExp(`id="${id}"`));
  }
  assert.match(source, /Nutrition plan · food and barcode scan · water · movement · sleep/);
  assert.match(controller, /CHECKIN_PROGRAM_IDS/);
  assert.match(controller, /renderPatientProfile/);
  assert.match(controller, /submitProfileChanges/);
  assert.match(controller, /Saved to BHW Cloud/);
  assert.match(controller, /changes-pending/);
  assert.match(preview, /bhwPatientId: "BHW0000"/);
  assert.match(preview, /allergies:/);
  assert.match(preview, /intolerances:/);
  assert.match(preview, /specialists:/);
  assert.match(preview, /verification:/);
  for (const capability of ["Open Food Facts", "BarcodeDetector", "waterCups", "Movement", "Sleep", "nutrition plan"]) {
    assert.match(checkin, new RegExp(capability, "i"));
  }
  assert.match(checkin, /\/api\/patient-portal\/check-ins/);
  assert.match(checkin, /\/api\/patient-portal\/dashboard/);
  assert.match(checkin, /renderMedicationChecklist/);
  assert.match(checkin, /Clinician-shared nutrition targets/);
  assert.doesNotMatch(checkin, /Rosuvastatin|Icosapent|Connected ✓|sync automatically/);
  assert.doesNotMatch(checkin, /checkin-save|checkin-history|portal-message|Jordan Rivera|940-637-5470/);
});

test("preview interactions persist only synthetic local state and fail closed for cloud writes", () => {
  const source = readFileSync(new URL("../patient/app.mjs", import.meta.url), "utf8");
  assert.match(source, /bhw_patient_blueprint_preview_state_v2/);
  assert.match(source, /if \(!isLocalPreview\)/);
  assert.match(source, /Saved on this device only/);
  assert.match(source, /secure BHW Cloud write connection required/);
  assert.doesNotMatch(source, /checkin-save|CHECKIN_DB|Notion/i);
});

test("the registry routes to the eleven original full dashboard pages", () => {
  assert.deepEqual(PROGRAMS.map(({ href }) => href), [
    "/bhw-primary-care-demo.html",
    "/bhw-mindmood-program.html",
    "/bhw-charmed-program.html",
    "/bhw-flow-program.html",
  ]);
  assert.deepEqual(PROGRAMS.map(({ patientHref }) => patientHref), [
    "/bhw-primary-care-demo.html",
    "/bhw-mindmood-patient-mockup.html",
    "/bhw-charmed-patient-mockup.html",
    "/bhw-flow-patient-mockup.html",
  ]);
  assert.deepEqual(SYSTEMS.map(({ href }) => href), [
    "/bhw-cardio.html",
    "/bhw-respiratory.html",
    "/bhw-gi.html",
    "/bhw-neuro.html",
    "/bhw-endocrine.html",
    "/bhw-immune.html",
    "/bhw-msk.html",
  ]);
  for (const entry of [...PROGRAMS, ...SYSTEMS]) {
    assert.equal(existsSync(new URL("../pages" + entry.href, import.meta.url)), true, entry.href + " is missing");
  }
});

test("original dashboards share the BHW brand layer and use synthetic preview identity", () => {
  for (const entry of [...PROGRAMS, ...SYSTEMS]) {
    const source = readFileSync(new URL("../pages" + entry.href, import.meta.url), "utf8");
    assert.match(source, /assets\/bhw-dashboard-brand\.css/);
    assert.match(source, /Synthetic Patient/);
    assert.match(source, /BHW0000/);
    assert.doesNotMatch(source, /Jordan Rivera|#10428/);
  }
});

test("each original system dashboard uses its approved detailed body map", () => {
  for (const system of SYSTEMS) {
    const source = readFileSync(new URL("../pages" + system.href, import.meta.url), "utf8");
    const approvedAsset = system.id === "musculoskeletal" ? system.views[0].asset : system.asset;
    assert.match(source, new RegExp("patient/assets/" + approvedAsset.replaceAll(".", "\\.")));
    assert.match(source, /assets\/bhw-transparent-anatomy\.js/);
  }
});

test("Care Connect preserves program identity across every system dashboard", () => {
  const controller = readFileSync(new URL("../assets/bhw-program-brand.js", import.meta.url), "utf8");
  const brandLayer = readFileSync(new URL("../assets/bhw-dashboard-brand.css", import.meta.url), "utf8");

  for (const system of SYSTEMS) {
    const source = readFileSync(new URL("../pages" + system.href, import.meta.url), "utf8");
    assert.match(source, /assets\/bhw-program-brand\.js/);
  }

  const contexts = new Map([
    ["primary-care", "primary"], ["mind-mood", "mind"],
    ["charmed-minds", "charmed"], ["flow", "flow"],
  ]);
  for (const program of PROGRAMS) {
    const source = readFileSync(new URL("../pages" + program.href, import.meta.url), "utf8");
    assert.match(source, new RegExp('data-program-context="' + contexts.get(program.id) + '"'));
    assert.match(source, /assets\/bhw-program-brand\.js/);
  }

  assert.match(controller, /BHW Care Connect/);
  assert.match(controller, /aria-pressed/);
  assert.match(controller, /url\.searchParams\.set\("p", current\)/);
  for (const id of ["primary", "mind", "charmed", "flow"]) {
    assert.match(brandLayer, new RegExp(':root\\[data-program="' + id + '"\\]'));
    assert.match(controller, new RegExp(id + ':'));
  }
});

test("program marks use the approved logos and dashboards contain no emoji artwork", () => {
  const controller = readFileSync(new URL("../assets/bhw-program-brand.js", import.meta.url), "utf8");
  assert.match(controller, /hm-assets\/bhw-emblem\.png/);
  assert.match(controller, /assets\/mind-mood-logo\.png/);
  assert.match(controller, /assets\/charmed-minds-logo\.png/);
  assert.match(controller, /assets\/brand\/flow\.png/);

  for (const entry of [...PROGRAMS, ...SYSTEMS]) {
    const source = readFileSync(new URL("../pages" + entry.href, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\p{Extended_Pictographic}/u, entry.href + " still contains emoji artwork");
  }
  assert.match(controller, /data-ui-icon/);
  assert.match(controller, /UI_ICONS/);
});

test("the cardiovascular dashboard keeps staff ordering logic out of patient copy", () => {
  const source = readFileSync(new URL("../pages/bhw-cardio.html", import.meta.url), "utf8");
  assert.doesNotMatch(source, /If it branches here|\[125561\]|conditional<\/span>/);
  assert.match(source, /Possible next steps/);
  assert.match(source, /system-cardiovascular-cutout-v1\.png/);
});

test("legacy enrollment and Blueprint labels resolve to stable page IDs", () => {
  assert.equal(resolveProgramId("Advanced Primary Care Management"), "primary-care");
  assert.equal(resolveProgramId("CharmEd"), "charmed-minds");
  assert.equal(resolveSystemId("blood-vessels-circulation"), "cardiovascular");
  assert.equal(resolveSystemId("Energy & metabolism"), "endocrine");
  assert.equal(resolveSystemId("Mind & Mood"), "neurological");
});

test("page selection fails closed for unknown or unassigned values", () => {
  assert.deepEqual(visiblePrograms(dashboard).map(({ id }) => id), ["primary-care", "mind-mood"]);
  assert.deepEqual(visibleSystems(dashboard).map(({ id }) => id), ["cardiovascular", "endocrine"]);
  assert.equal(isProgramVisible(dashboard, "flow"), false);
  assert.equal(isSystemVisible(dashboard, "respiratory"), false);
  assert.equal(isSystemVisible(dashboard, "not-registered"), false);
  assert.equal(getProgram("unknown"), null);
  assert.equal(getSystem("unknown"), null);
});

test("a completed Blueprint can add a clinician-reviewed system without changing the core registry", () => {
  const expanded = structuredClone(dashboard);
  expanded.plan.systems.push({ id: "renal-urinary", label: "Kidneys & urinary", reviewStatus: "approved", status: "shared" });
  assert.deepEqual(visibleSystems(expanded).map(({ id }) => id), ["cardiovascular", "endocrine", "renal-urinary"]);
  assert.equal(isSystemVisible(expanded, "renal-urinary"), true);
  assert.deepEqual(SYSTEMS.map(({ id }) => id), [
    "cardiovascular", "respiratory", "digestive", "neurological",
    "endocrine", "immune-lymphatic", "musculoskeletal",
  ]);
});

test("every registered system has detailed content and a saved local body map", () => {
  for (const system of SYSTEMS) {
    assert.ok(system.anatomy.length >= 7, system.id + " should not be generalized");
    assert.ok(system.pathways.length >= 3, system.id + " should include functional pathways");
    assert.ok(system.connections.length >= 4, system.id + " should include whole-person connections");
    assert.equal(existsSync(new URL("../patient/assets/" + system.asset, import.meta.url)), true, system.asset + " is missing");
    for (const view of system.views || []) {
      assert.equal(existsSync(new URL("../patient/assets/" + view.asset, import.meta.url)), true, view.asset + " is missing");
    }
  }
  const cardiovascular = getSystem("cardiovascular");
  assert.match(JSON.stringify(cardiovascular), /myocardial/i);
  assert.match(JSON.stringify(cardiovascular), /cerebral microvasculature/i);
  const musculoskeletal = getSystem("musculoskeletal");
  assert.deepEqual(musculoskeletal.views.map(({ id }) => id), ["posterior", "anterior"]);
  assert.match(JSON.stringify(musculoskeletal.views), /spine/i);
});

test("CharmEd Minds has the four supplied brain-network artworks", () => {
  const charmed = getProgram("charmed-minds");
  assert.equal(charmed.artwork.length, 4);
  for (const artwork of charmed.artwork) {
    assert.equal(existsSync(new URL("../patient/assets/" + artwork.asset, import.meta.url)), true, artwork.asset + " is missing");
  }
  const source = readFileSync(new URL("../pages" + charmed.href, import.meta.url), "utf8");
  assert.match(source, /assets\/bhw-transparent-anatomy\.js/);
});
