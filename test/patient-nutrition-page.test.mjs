import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasNutritionAnswer } from "../patient/nutrition-questionnaire-v14.mjs";

test("empty structured nutrition controls do not count as answered", () => {
  assert.equal(hasNutritionAnswer({}), false);
  assert.equal(hasNutritionAnswer({ choices: [], detail: "" }), false);
  assert.equal(hasNutritionAnswer({ rows: { bloating: "" } }), false);
  assert.equal(hasNutritionAnswer({ rows: { bloating: 0 } }), true);
  assert.equal(hasNutritionAnswer(["improve_gi_tolerance"]), true);
});

test("authoritative Care Connect patient page includes the adaptive Nutrition Intelligence app", async () => {
  const [html, controller, renderer, styles, preview] = await Promise.all([
    readFile(new URL("../patient/index.html", import.meta.url), "utf8"),
    readFile(new URL("../patient/app.mjs", import.meta.url), "utf8"),
    readFile(new URL("../patient/nutrition-questionnaire-v14.mjs", import.meta.url), "utf8"),
    readFile(new URL("../patient/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../patient/nutrition-preview-contract.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(html, /BHW Health Core \| Patient Care Space/);
  assert.match(html, /id="nutrition-intelligence"/);
  assert.match(html, /Tell us what eating is really like for you/);
  assert.match(html, /Save and finish later/);
  assert.match(html, /Submit to my care team/);
  assert.match(controller, /\/api\/patient-portal\/nutrition-intake/);
  assert.match(controller, /Saved to BHW Cloud/);
  assert.match(controller, /Saved on this device only/);
  assert.match(controller, /pending clinician reconciliation|clinician reconciliation/i);
  assert.match(renderer, /mergeNutritionQuestionnaireModules/);
  assert.match(renderer, /gi-pattern-matrix/);
  assert.doesNotMatch(renderer, /answer\.raw && typeof answer\.raw === "object"/);
  assert.match(styles, /\.nutrition-intake-app/);
  assert.match(preview, /"version":"1\.4\.0"/);
});
