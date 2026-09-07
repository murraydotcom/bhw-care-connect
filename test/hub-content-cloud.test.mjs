import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const require = createRequire(import.meta.url);
const { handler } = require("../netlify/functions/hub-content.js");

test("Care Connect reads only the published Google website-content projection", { concurrency: false }, async () => {
  const previousUrl = process.env.OPERATIONS_CLOUD_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.OPERATIONS_CLOUD_API_URL = "https://operations.synthetic.test";
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return {
          schemaVersion: "bhw.public-site-content.v1",
          siteId: "care-connect",
          available: true,
          managedContentTypes: ["announcement", "site-detail", "invalid"],
          updatedAt: "2026-09-07T14:00:00.000Z",
          announcements: [{
            contentId: "WEB-synthetic-0001",
            tag: "Hours",
            date: "Sep 7",
            title: "Synthetic schedule",
            body: "Synthetic public wording only.",
            createdBy: "must-not-cross-public-boundary",
          }],
          resources: [{
            contentId: "WEB-synthetic-resource",
            tag: "Form",
            title: "Synthetic resource",
            body: "Safe public description.",
            url: "javascript:alert('no')",
          }],
          siteInformation: {
            hours: "Synthetic hours",
            patientName: "must-not-cross-public-boundary",
          },
        };
      },
    };
  };

  try {
    const result = await handler({ httpMethod: "GET" });
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers["Cache-Control"].includes("s-maxage=60"), true);
    assert.equal(request.url, "https://operations.synthetic.test/v1/public/site-content?siteId=care-connect");
    assert.deepEqual(request.options.headers, { Accept: "application/json" });
    const body = JSON.parse(result.body);
    assert.equal(body.source, "bhw-google-cloud");
    assert.equal(body.available, true);
    assert.deepEqual(body.managedContentTypes, ["announcement", "site-detail"]);
    assert.equal(body.announcements[0].title, "Synthetic schedule");
    assert.equal(body.siteInformation.hours, "Synthetic hours");
    assert.equal(body.resources[0].url, "");
    assert.equal(JSON.stringify(body).includes("createdBy"), false);
    assert.equal(JSON.stringify(body).includes("patientName"), false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.OPERATIONS_CLOUD_API_URL;
    else process.env.OPERATIONS_CLOUD_API_URL = previousUrl;
  }
});

test("Care Connect keeps reviewed compiled defaults when Google content is unavailable", { concurrency: false }, async () => {
  const previousUrl = process.env.OPERATIONS_CLOUD_API_URL;
  const previousFetch = globalThis.fetch;
  delete process.env.OPERATIONS_CLOUD_API_URL;
  globalThis.fetch = async () => { throw new Error("should not be called"); };
  try {
    const result = await handler({ httpMethod: "GET" });
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(body.available, false);
    assert.equal(body.source, "compiled-defaults");
    assert.deepEqual(body.announcements, []);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.OPERATIONS_CLOUD_API_URL;
    else process.env.OPERATIONS_CLOUD_API_URL = previousUrl;
  }
});

test("the Care Connect app applies only the approved public practice-detail allowlist", async () => {
  const [contact, hook, masthead, hubPage] = await Promise.all([
    readFile(new URL("../app/src/data/contact.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/src/lib/useHubContent.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/src/components/Masthead.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/src/pages/HubPage.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(contact, /const PUBLIC_KEYS/);
  assert.match(contact, /applyPublicSiteInformation/);
  assert.doesNotMatch(contact.match(/const PUBLIC_KEYS:[\s\S]*?\]/)?.[0] || "", /crisisLine|portalUrl|blueprintUrl/);
  assert.match(hook, /data\.available === true/);
  assert.match(masthead, /announcements === undefined \? NEWS : announcements/);
  assert.match(hubPage, /managedContentTypes\.includes\('announcement'\) \? hubContent\.announcements : undefined/);
});
