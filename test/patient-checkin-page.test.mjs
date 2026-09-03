import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("daily check-in uses the Care Connect design and explicit save states", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../pages/bhw-checkin.html", import.meta.url), "utf8"),
    readFile(new URL("../pages/bhw-checkin-care-connect.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /bhw-checkin-care-connect\.css/);
  assert.match(html, /bhw-medical-logo\.png/);
  assert.match(html, /Your daily pattern/);
  assert.match(html, /ready for clinician review in CrewHQ/);
  assert.match(html, /Saved to BHW Cloud/);
  assert.match(css, /body\[data-checkin-program="flow"\]/);
  assert.match(html, /Mind & Mood Recovery/);
  assert.match(html, /Your recovery focus/);
  assert.match(html, /Your brain-and-body focus/);
  assert.match(html, /Clinician selected/);
  assert.match(html, /deeper questions rotate without making every check-in long/);
  assert.match(html, /bhw\.patient-checkin\.v2/);
  assert.match(html, /monitoringPlanId/);
  assert.match(css, /program-focus-card/);
  assert.match(html, /accent:'#E09A5C', deep:'#9A5236'/);
  assert.match(css, /--checkin-program: #e09a5c/);
  assert.match(css, /--checkin-program-deep: #9a5236/);
  assert.doesNotMatch(`${html}\n${css}`, /#9b7da5|#6a5480/i);
  assert.match(css, /"BHW Montserrat"/);
  assert.match(css, /"BHW Lora"/);
});

test("plate-photo AI is visibly gated while barcode scanning remains available", async () => {
  const html = await readFile(new URL("../pages/bhw-checkin.html", import.meta.url), "utf8");

  assert.match(html, /authenticated privacy and BAA release review/);
  assert.match(html, /Food search and barcode scanning are ready now/);
  assert.match(html, /id="offScan"/);
  assert.doesNotMatch(html, /type="file"/);
  assert.doesNotMatch(html, /food-vision|estimatePlate|VISION_API/);
});
