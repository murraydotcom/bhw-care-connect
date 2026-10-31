import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const resource = new URL("../patient-resources/charmed-minds/neurodivergence-workbook/", import.meta.url);
const ageFiles = [
  "Workbook App 0-5.dc.html",
  "Workbook App 6-7.dc.html",
  "Workbook App 8-12.dc.html",
  "Workbook App 13-18.dc.html",
  "Workbook App 19-29.dc.html",
  "Workbook App 30-54.dc.html",
  "Workbook App 55plus.dc.html",
];

test("CharmEd Minds myBHW page links the reviewed workbook resource", () => {
  const page = readFileSync(new URL("../pages/bhw-charmed-patient-mockup.html", import.meta.url), "utf8");
  assert.match(page, /id="neurodivergence-workbook-title"/);
  assert.match(page, /\/patient-resources\/charmed-minds\/neurodivergence-workbook\//);
  assert.match(page, /Answers save only in this browser/);
  assert.match(page, /@media\(max-width:720px\)\{\.workbook-resource\{grid-template-columns:1fr/);
});

test("Care Connect build publishes the complete multi-file workbook bundle", () => {
  const build = readFileSync(new URL("../build-merge.mjs", import.meta.url), "utf8");
  assert.match(build, /patient-resources/);
  assert.match(build, /cpSync\(patientResourcesSrc/);
  for (const file of ["index.html", ...ageFiles, "Neurodivergence Self-Reflection Workbook.dc.html", "support.js", "workbook-data.js", "workbook-bands.js", "workbook-choices.js", "workbook-icons.js", "doc-page.js", "vendor/react.production.min.js", "vendor/react-dom.production.min.js"]) {
    assert.equal(existsSync(new URL(file, resource)), true, `${file} is missing`);
  }
});

test("workbook preserves age routing, device-only autosave, and PDF printing", () => {
  const index = readFileSync(new URL("index.html", resource), "utf8");
  for (const file of ageFiles) assert.match(index, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const file of ageFiles) {
    const page = readFileSync(new URL(file, resource), "utf8");
    assert.match(page, /localStorage\.setItem/);
    assert.match(page, /doPrint: \(\) => window\.print\(\)/);
    assert.match(page, /Clear every answer on this device/);
  }
  const printable = readFileSync(new URL("Neurodivergence Self-Reflection Workbook.dc.html", resource), "utf8");
  assert.match(printable, /Print \/ Save PDF/);
  assert.match(printable, /For education only\. Not a substitute for medical advice/);
  const support = readFileSync(new URL("support.js", resource), "utf8");
  assert.match(support, /\.\/vendor\/react\.production\.min\.js/);
  assert.match(support, /remote JSX imports are disabled/);
  assert.doesNotMatch(support, /unpkg\.com/);
});
