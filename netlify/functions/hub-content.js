// Public Care Connect content bridge.
// Staff manage content in CrewHQ; this function reads only the public,
// published projection from BHW's Google Operations API. It never receives a
// patient session, patient identifier, staff token, or server-side secret.

const { json } = require("./_lib");

const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

function operationsBaseUrl() {
  const value = String(process.env.OPERATIONS_CLOUD_API_URL || "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("operations API is not configured");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("operations API must use HTTPS");
  return parsed.toString().replace(/\/+$/, "");
}

function response(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL,
    },
    body: JSON.stringify(body),
  };
}

function publicUrl(value) {
  const text = String(value || "").trim().slice(0, 1000);
  if (!text) return "";
  if (text.startsWith("/") && !text.startsWith("//")) return text;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function publicShape(data) {
  if (!data || data.schemaVersion !== "bhw.public-site-content.v1" || data.siteId !== "care-connect") {
    throw new Error("unexpected public content response");
  }
  const announcements = (Array.isArray(data.announcements) ? data.announcements : []).map((item) => ({
    contentId: String(item?.contentId || "").slice(0, 100),
    tag: String(item?.tag || "General").slice(0, 40),
    date: String(item?.date || "").slice(0, 40),
    title: String(item?.title || "").slice(0, 220),
    body: String(item?.body || "").slice(0, 2000),
    ctaLabel: String(item?.ctaLabel || "").slice(0, 80),
    ctaUrl: publicUrl(item?.ctaUrl),
  }));
  const resources = (Array.isArray(data.resources) ? data.resources : []).map((item) => ({
    contentId: String(item?.contentId || "").slice(0, 100),
    tag: String(item?.tag || "General").slice(0, 40),
    title: String(item?.title || "").slice(0, 220),
    body: String(item?.body || "").slice(0, 2000),
    url: publicUrl(item?.url),
  }));
  const publicDetailKeys = ["street", "cityStateZip", "phone", "fax", "hours", "frontDeskHours", "openStatus"];
  const sourceInformation = data.siteInformation && typeof data.siteInformation === "object"
    ? data.siteInformation
    : {};
  const siteInformation = Object.fromEntries(publicDetailKeys
    .filter((key) => typeof sourceInformation[key] === "string" && sourceInformation[key].trim())
    .map((key) => [key, sourceInformation[key].trim().slice(0, 500)]));

  return {
    schemaVersion: data.schemaVersion,
    siteId: data.siteId,
    available: data.available === true,
    managedContentTypes: (Array.isArray(data.managedContentTypes) ? data.managedContentTypes : [])
      .filter((value) => ["announcement", "resource", "site-detail"].includes(value)),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    announcements,
    resources,
    siteInformation,
    source: "bhw-google-cloud",
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "GET only" });
  try {
    const upstream = await fetch(`${operationsBaseUrl()}/v1/public/site-content?siteId=care-connect`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) throw new Error(`operations API returned ${upstream.status}`);
    return response(publicShape(await upstream.json()));
  } catch {
    // Non-fatal: the app keeps its reviewed, compiled defaults when Google
    // content is unavailable or nothing has been published yet.
    return response({
      schemaVersion: "bhw.public-site-content.v1",
      siteId: "care-connect",
      available: false,
      managedContentTypes: [],
      updatedAt: "",
      announcements: [],
      resources: [],
      siteInformation: {},
      source: "compiled-defaults",
    });
  }
};
