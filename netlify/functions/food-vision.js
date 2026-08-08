// netlify/functions/food-vision.js — "Snap your plate" AI estimate.
//
// Takes a single food photo and returns an ESTIMATED per-item nutrition
// breakdown so the patient can confirm/adjust before it counts toward their
// day. Backed by OpenAI vision (same provider already used by the crewOS
// Paperwork prefill). No nutrition database — the model estimates from the
// image, so the front-end always lets the patient edit the numbers.
//
//   POST { image: "data:image/jpeg;base64,…" }  (or raw base64 + mime)
//     → { items:[{name, portion, grams, protein, carbs, fat, calories}],
//         note }  // note = short caveat / assumptions string
//
// PHI handling: the photo is held only in memory for the request and is NEVER
// logged. It travels browser → this function → OpenAI. Real-patient use
// requires a BAA covering the OpenAI *API* with zero data retention, and a
// Netlify BAA for the compute layer — same posture as note-extract.js.
//
// Fails closed: returns 503 until OPENAI_API_KEY is set, so it never spends
// against the API until you deliberately configure it. Cost/abuse note: this
// is a public endpoint; add a session gate or rate-limit before opening it to
// unauthenticated traffic at scale (see the header comment in bhw-checkin).
//
// Config (Netlify env): OPENAI_API_KEY (required),
//   OPENAI_VISION_MODEL (optional, default "gpt-4o-mini"),
//   FOOD_VISION_MAX_MB (optional, default 8).

const https = require("https");
const { json } = require("./_lib");

function openai(path, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.openai.com",
      path,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () => {
        let parsed; try { parsed = JSON.parse(out || "{}"); } catch { parsed = { raw: out }; }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

const SYSTEM = `You are a clinical nutrition estimator. You are shown ONE photo of a meal or food.
Identify each distinct food or drink you can see and estimate its portion and macronutrients.
Rules:
- Estimate from what is visible only. Do NOT invent foods that are not in the image.
- If the image is not food (or you cannot tell), return an empty items array and set note to a short explanation.
- Portions are approximate — prefer common household measures in "portion" (e.g. "1 cup", "6 oz", "1 medium").
- Output ONLY a JSON object of this exact shape:
  {
    "items": [
      { "name": string, "portion": string, "grams": number,
        "protein": number, "carbs": number, "fat": number, "calories": number,
        "fiber": number, "sugar": number, "sodium": number }
    ],
    "note": string
  }
- grams/protein/carbs/fat/fiber/sugar are grams; sodium is milligrams; calories is kcal. Use numbers (no units) and round to whole numbers.
- Keep items to the distinct foods actually visible (typically 1–6). "note" must remind that these are photo estimates to confirm.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return json(503, { needsKey: true, error: "Photo estimates aren't turned on yet — set OPENAI_API_KEY in Netlify (under a BAA that covers the API). Barcode & search still work." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  // Accept a full data URL, or raw base64 + mime.
  let dataUrl = String(body.image || "").trim();
  if (dataUrl && !dataUrl.startsWith("data:")) {
    const mime = /^image\/(jpe?g|png|webp|gif|heic|heif)$/i.test(body.mime || "") ? body.mime : "image/jpeg";
    dataUrl = `data:${mime};base64,${dataUrl}`;
  }
  if (!dataUrl.startsWith("data:image/")) return json(400, { error: "Send a food photo." });

  const maxMB = Number(process.env.FOOD_VISION_MAX_MB || 8);
  if (dataUrl.length > maxMB * 1024 * 1024) return json(413, { error: `Photo too large — keep it under ${maxMB} MB.` });

  try {
    const res = await openai("/v1/chat/completions", {
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: [
          { type: "text", text: "Estimate the nutrition for the foods in this photo." },
          { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
        ] },
      ],
    }, apiKey);

    if (!res.ok) {
      const msg = res.data?.error?.message || `OpenAI error ${res.status}`;
      return json(502, { error: `Photo estimate failed: ${msg}` });
    }

    let parsed = {};
    try { parsed = JSON.parse(res.data.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }

    const n = (v) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= 0 ? x : 0; };
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((it) => it && it.name)
          .slice(0, 8)
          .map((it) => ({
            name: String(it.name).slice(0, 80).trim(),
            portion: String(it.portion || "").slice(0, 40).trim(),
            grams: n(it.grams), protein: n(it.protein), carbs: n(it.carbs), fat: n(it.fat), calories: n(it.calories),
            fiber: n(it.fiber), sugar: n(it.sugar), sodium: n(it.sodium),
          }))
      : [];
    const note = String(parsed.note || "These are photo estimates — please check and adjust.").slice(0, 240);

    return json(200, { items, note });
  } catch (err) {
    return json(500, { error: String(err.message || err) });
  }
};
