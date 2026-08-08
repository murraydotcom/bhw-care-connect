// netlify/functions/checkin-save.js — persist a daily patient check-in so the
// vessels/bars can trend over time and the care team can see history.
//
//   POST { program, patient:{name,phone,id?}, date, well:{...}, symptoms:[],
//          meds:[], water, nutrients:{...}, vitals:{...}, summary, hp }
//     → { ok, stored, id? }
//
// Fails closed: if CHECKIN_DB_ID is not set the endpoint returns
// { ok:true, stored:false, reason:"not-configured" } (200) so the front-end
// keeps working (it still sends the human summary to the office inbox) without
// ever erroring — nothing is written until you create the DB and set the id.
//
// Hardened like the other public writers: POST-only, honeypot, known-program
// allowlist, length caps, and it never logs the body. Patient is matched to the
// Master List by phone (then name) and linked by relation when found.
//
// Notion "Care Check-ins — Data" schema (create it, share with the integration,
// set CHECKIN_DB_ID):
//   Check-in (title), Patient (relation → Master List), Patient Name (text),
//   Phone (phone), Program (select), Date (date),
//   Feeling/Motivation/Sleep/Movement/Outside/Connection/Nutrition Plan (select),
//   Symptoms (multi-select), Meds Taken (text), Water Cups (number),
//   Protein g/Carbs g/Fat g/Fiber g/Sugar g/Sodium mg/Vitamin D µg/Vitamin C mg/
//   Iron mg/Calcium mg/Potassium mg/Magnesium mg (number),
//   BP (text), Heart Rate/Weight/Glucose/Temp/O2 Sat/Steps (number),
//   Summary (text), Source (select — option "Care Connect Check-in").

const { json, createPage, queryDb, P, W, DB } = require("./_lib");

const CHECKIN_DB = process.env.CHECKIN_DB_ID || "";
const MASTER_DB = process.env.MASTER_DB_ID || DB.masterList;
const PROGRAMS = { primary: "Primary Care", flow: "Flow · Vascular", mind: "Mind & Mood", charmed: "CharmEd" };

const digits = (s) => String(s || "").replace(/\D/g, "");
const clampNum = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

async function matchPatient({ id, phone, name }) {
  try {
    if (id) return id;
    const rows = await queryDb(MASTER_DB);
    const dig = digits(phone).slice(-10);
    const byPhone = dig
      ? rows.find((pg) => {
          const f = (pg.properties || {})["Phone"];
          return f && digits(f.phone_number || P.text(f)).slice(-10) === dig;
        })
      : null;
    if (byPhone) return byPhone.id;
    const nm = String(name || "").trim().toLowerCase();
    const byName = nm
      ? rows.find((pg) => P.title((pg.properties || {})["Patient Name"]).trim().toLowerCase() === nm)
      : null;
    return byName ? byName.id : null;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  if (b.hp) return json(200, { ok: true, stored: false }); // honeypot — silently drop

  if (!CHECKIN_DB) return json(200, { ok: true, stored: false, reason: "not-configured" });

  const progKey = String(b.program || "primary").toLowerCase();
  if (!PROGRAMS[progKey]) return json(400, { error: "Unknown program" });

  const patient = b.patient || {};
  const name = String(patient.name || "").slice(0, 120).trim();
  const phone = String(patient.phone || "").slice(0, 40).trim();
  const date = /^\d{4}-\d{2}-\d{2}/.test(b.date || "") ? b.date : new Date().toISOString().slice(0, 10);
  const well = b.well || {}, nutri = b.nutrients || {}, vit = b.vitals || {};
  const cap = (v, n) => String(v || "").slice(0, n);

  const props = {
    "Check-in": W.title(`${name || "Patient"} · ${date}`),
    "Patient Name": W.text(name),
    "Program": W.sel(PROGRAMS[progKey]),
    "Date": W.date(date),
    "Source": W.sel("Care Connect Check-in"),
    "Summary": W.text(cap(b.summary, 1900)),
    "Water Cups": W.num(clampNum(b.water)),
  };
  if (phone) props["Phone"] = { phone_number: phone };

  // well-being selects
  const wellMap = { Feeling: "feeling", Motivation: "motivation", Sleep: "sleep", Movement: "movement", Outside: "outside", Connection: "people", "Nutrition Plan": "nutrition" };
  for (const [prop, key] of Object.entries(wellMap)) if (well[key]) props[prop] = W.sel(cap(well[key], 60));

  if (Array.isArray(b.symptoms) && b.symptoms.length)
    props["Symptoms"] = { multi_select: b.symptoms.slice(0, 12).map((s) => ({ name: cap(s, 60) })) };
  if (Array.isArray(b.meds) && b.meds.length) props["Meds Taken"] = W.text(b.meds.join(", "));

  // nutrients → numbers
  const nutriMap = { "Protein g": "p", "Carbs g": "c", "Fat g": "f", "Fiber g": "fiber", "Sugar g": "sugar", "Sodium mg": "sodium", "Vitamin D µg": "vitd", "Vitamin C mg": "vitc", "Iron mg": "iron", "Calcium mg": "calcium", "Potassium mg": "potassium", "Magnesium mg": "magnesium" };
  for (const [prop, key] of Object.entries(nutriMap)) {
    const n = clampNum(nutri[key]);
    if (n !== null) props[prop] = W.num(n);
  }

  // vitals
  if (vit.bp) props["BP"] = W.text(cap(vit.bp, 20));
  const vitMap = { "Heart Rate": "hr", "Weight": "wt", "Glucose": "glu", "Temp": "temp", "O2 Sat": "o2", "Steps": "steps" };
  for (const [prop, key] of Object.entries(vitMap)) {
    const n = clampNum(vit[key]);
    if (n !== null) props[prop] = W.num(n);
  }

  try {
    const pid = await matchPatient({ id: patient.id, phone, name });
    if (pid) props["Patient"] = W.rel([pid]);
    const page = await createPage(CHECKIN_DB, props);
    return json(200, { ok: true, stored: true, id: page.id });
  } catch (err) {
    return json(500, { ok: false, stored: false, error: String(err.message || err) });
  }
};
