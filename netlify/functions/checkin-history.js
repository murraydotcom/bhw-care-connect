// netlify/functions/checkin-history.js — powers per-patient targets + trending.
//
//   POST { patient:{name,phone,id?}, program, days? }
//     → { ok, override:{...}, series:[ {date, feeling, sleep, water, p, c, f,
//          fiber, sugar, sodium, vitd, vitc, iron, calcium, potassium,
//          magnesium}, … ] }
//
// override = per-patient nutrient-target overrides, read from the patient's
// Care Plan row: a rich_text field "Nutrition Targets (JSON)" holding a JSON
// object like {"p":120,"sodium":1300}. The front-end merges it over the program
// defaults, so the care team tunes a patient's goals where they already work.
// Absent/blank/malformed → {} (program defaults stand).
//
// series = recent stored check-ins (from CHECKIN_DB) for that patient, oldest
// first, for the sparklines. Empty when CHECKIN_DB_ID isn't set or there's no
// history yet — the page just hides the trend.
//
// Read-only, never logs the body, degrades to {override:{}, series:[]} on any
// Notion error so the check-in page always renders.

const { json, queryDb, P, DB } = require("./_lib");

const CHECKIN_DB = process.env.CHECKIN_DB_ID || "";
const CAREPLAN_DB = process.env.CAREPLAN_DB_ID || DB.carePlans;
const MASTER_DB = process.env.MASTER_DB_ID || DB.masterList;
const PROGRAMS = { primary: "Primary Care", flow: "Flow · Vascular", mind: "Mind & Mood", charmed: "CharmEd" };
// Only these keys may come from the care plan override (guards against junk).
const TARGET_KEYS = ["p", "c", "f", "fiber", "sugar", "sodium", "vitd", "vitc", "iron", "calcium", "potassium", "magnesium"];

const digits = (s) => String(s || "").replace(/\D/g, "");

async function resolvePid({ id, phone, name }) {
  if (id) return id;
  try {
    const rows = await queryDb(MASTER_DB);
    const dig = digits(phone).slice(-10);
    const byPhone = dig && rows.find((pg) => {
      const f = (pg.properties || {})["Phone"];
      return f && digits(f.phone_number || P.text(f)).slice(-10) === dig;
    });
    if (byPhone) return byPhone.id;
    const nm = String(name || "").trim().toLowerCase();
    const byName = nm && rows.find((pg) => P.title((pg.properties || {})["Patient Name"]).trim().toLowerCase() === nm);
    return byName ? byName.id : null;
  } catch { return null; }
}

async function readOverride(pid, name, programLabel) {
  if (!pid && !name) return {};
  try {
    const rows = await queryDb(CAREPLAN_DB);
    const nm = String(name || "").trim().toLowerCase();
    const mine = rows.filter((pg) => {
      const rel = P.rel((pg.properties || {})["Patient"]);
      if (pid && rel.includes(pid)) return true;
      return nm && P.title((pg.properties || {})["Patient Name"]).trim().toLowerCase() === nm;
    });
    if (!mine.length) return {};
    // Prefer a plan for this program, else the most recent.
    const forProg = mine.find((pg) => P.sel((pg.properties || {})["Program"]) === programLabel);
    const pick = forProg || mine[mine.length - 1];
    const raw = P.text((pick.properties || {})["Nutrition Targets (JSON)"]);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out = {};
    for (const k of TARGET_KEYS) if (typeof parsed[k] === "number" && parsed[k] >= 0) out[k] = parsed[k];
    return out;
  } catch { return {}; }
}

async function readSeries(pid, name, days) {
  if (!CHECKIN_DB) return [];
  try {
    const rows = await queryDb(CHECKIN_DB, null, [{ property: "Date", direction: "ascending" }]);
    const nm = String(name || "").trim().toLowerCase();
    const mine = rows.filter((pg) => {
      const rel = P.rel((pg.properties || {})["Patient"]);
      if (pid && rel.includes(pid)) return true;
      return nm && P.text((pg.properties || {})["Patient Name"]).trim().toLowerCase() === nm;
    });
    const num = (pg, prop) => P.num((pg.properties || {})[prop]);
    const mapped = mine.map((pg) => {
      const q = (prop) => P.sel((pg.properties || {})[prop]);
      return {
        date: P.date((pg.properties || {})["Date"]),
        feeling: q("Feeling"), sleep: q("Sleep"),
        water: num(pg, "Water Cups"),
        p: num(pg, "Protein g"), c: num(pg, "Carbs g"), f: num(pg, "Fat g"),
        fiber: num(pg, "Fiber g"), sugar: num(pg, "Sugar g"), sodium: num(pg, "Sodium mg"),
        vitd: num(pg, "Vitamin D µg"), vitc: num(pg, "Vitamin C mg"), iron: num(pg, "Iron mg"),
        calcium: num(pg, "Calcium mg"), potassium: num(pg, "Potassium mg"), magnesium: num(pg, "Magnesium mg"),
      };
    });
    const n = Math.max(1, Math.min(90, Number(days) || 30));
    return mapped.slice(-n);
  } catch { return []; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const patient = b.patient || {};
  const programLabel = PROGRAMS[String(b.program || "primary").toLowerCase()] || PROGRAMS.primary;
  try {
    const pid = await resolvePid({ id: patient.id, phone: patient.phone, name: patient.name });
    const [override, series] = await Promise.all([
      readOverride(pid, patient.name, programLabel),
      readSeries(pid, patient.name, b.days),
    ]);
    return json(200, { ok: true, override, series });
  } catch (err) {
    return json(200, { ok: true, override: {}, series: [], note: String(err.message || err) });
  }
};
