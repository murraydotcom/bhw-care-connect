import { PROGRAMS, SYSTEMS } from "./page-registry.mjs?v=interactive-atlas-1";

export const SESSION_KEY = "bhw_pt_session";

export const isLocalPreview = new URLSearchParams(location.search).get("preview") === "1"
  && ["localhost", "127.0.0.1"].includes(location.hostname);

export function patientHref(path, id) {
  const url = new URL(path, location.origin);
  if (id) url.searchParams.set("id", id);
  if (isLocalPreview) url.searchParams.set("preview", "1");
  return `${url.pathname}${url.search}`;
}

export function previewDashboard() {
  return {
    schemaVersion: "bhw.patient-portal.v1",
    generatedAt: new Date().toISOString(),
    patient: {
      preferredName: "Synthetic",
      firstName: "Synthetic",
      lastName: "Patient",
      bhwPatientId: "BHW0000",
      dateOfBirth: "1986-01-01",
      sexAtBirth: "Not specified",
      genderIdentity: "Not specified",
      pronouns: "Not specified",
      preferredLanguage: "English",
      phone: "(410) 555-0000",
      email: "synthetic.patient@example.test",
      address: "Synthetic address · Baltimore, MD 21218",
      anatomyDisplay: "neutral",
      programs: PROGRAMS.map(({ id }) => id),
      allergies: [{ substance: "Penicillin (synthetic)", reaction: "Rash", severity: "Moderate", status: "Active" }],
      intolerances: [{ substance: "Lactose (synthetic)", reaction: "Digestive discomfort", severity: "Mild", status: "Active" }],
      specialists: [
        { name: "Synthetic Cardiology Team", specialty: "Cardiology", organization: "BHW synthetic network", status: "Active" },
        { name: "Synthetic Sleep Team", specialty: "Sleep medicine", organization: "BHW synthetic network", status: "Consulting" },
      ],
      verification: {
        schemaVersion: "bhw.patient-profile-verification.v1",
        overallStatus: "verified",
        clinicianReviewRequired: false,
        lastVerifiedAt: "2026-08-20T12:00:00.000Z",
        fields: {
          sexAtBirth: "verified",
          pronouns: "verified",
          preferredLanguage: "verified",
          allergies: "verified",
          intolerances: "verified",
          specialists: "verified",
        },
      },
    },
    plan: {
      status: "ready-to-share",
      summary: "Your blood-pressure pattern is moving in the right direction. This week, your Blueprint connects medication consistency, gradual movement, recovery, and cardiovascular follow-up instead of treating each piece separately.",
      today: ["Take your medication as directed.", "Complete a 10-minute walk after lunch.", "Bring your home readings to your next visit."],
      priorities: ["Keep blood pressure in your target range.", "Build a consistent movement routine."],
      systems: [
        ...SYSTEMS.map((entry, index) => ({
          id: entry.id,
          label: entry.shortName,
          status: index === 0 ? "improving" : index === 1 ? "steady" : "shared",
          summary: index === 0
            ? "Your synthetic care team is watching blood-pressure patterns, exercise tolerance, and small-vessel health."
            : `Your synthetic Blueprint includes a clinician-shared ${entry.shortName.toLowerCase()} focus.`,
          focus: index === 0
            ? ["Review home blood-pressure technique", "Build gradual aerobic and resistance activity", "Discuss cardiovascular risk markers at follow-up"]
            : ["Review the patient-specific plan with your BHW care team", "Track the symptoms or measures your clinician selected"],
        })),
        {
          id: "renal-urinary",
          label: "Kidneys & urinary",
          eyebrow: "Renal / urinary",
          reviewStatus: "approved",
          status: "shared",
          summary: "Your clinician added kidney function and fluid balance because they influence blood pressure and medication decisions.",
          programContext: {
            "primary-care": "Kidney function, urine findings, fluid and electrolyte balance, blood-pressure regulation, and medication safety.",
            flow: "Kidney control of blood volume, sodium, fluid balance, blood pressure, and the safety of vascular interventions.",
          },
        },
      ],
    },
    blueprintMapping: {
      status: "clinician-reviewed",
      completedAt: new Date().toISOString(),
      items: [
        {
          id: "bp-pattern",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "measurement",
          label: "Home blood-pressure pattern",
          status: "improving",
          primarySystemId: "cardiovascular",
          relatedSystemIds: ["renal-urinary", "neurological"],
          programIds: ["primary-care", "flow"],
          markers: { cardiovascular: { x: 46, y: 31 }, neurological: { x: 48, y: 18 } },
          physiologicalConnection: "Blood pressure reflects the interaction between the heart, blood vessels, kidneys, nervous system, medications, activity, and fluid balance.",
          intervention: "Continue the clinician-directed home-reading plan.",
          interventionDetail: "The trend—not one isolated number—is what your care team is using to adjust the Blueprint.",
          destination: "care-team-update",
        },
        {
          id: "standing-lightheadedness",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "symptom",
          label: "Lightheadedness when standing",
          status: "monitoring",
          primarySystemId: "cardiovascular",
          relatedSystemIds: ["neurological", "musculoskeletal"],
          programIds: ["flow"],
          markers: { cardiovascular: { x: 65, y: 24 }, neurological: { x: 64, y: 18 }, musculoskeletal: { x: 67, y: 68 } },
          physiologicalConnection: "Standing shifts blood toward the legs. Vascular tone, heart rate, circulating volume, the calf-muscle pump, and autonomic signaling work together to preserve brain perfusion.",
          intervention: "Hydration, clinician-directed sodium guidance, standing readings, and graded recumbent movement.",
          interventionDetail: "Your symptom and measurement trends determine whether the intervention is helping.",
          destination: "care-team-update",
        },
        {
          id: "movement-tolerance",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "intervention",
          label: "Gradual movement tolerance",
          status: "active",
          primarySystemId: "musculoskeletal",
          relatedSystemIds: ["cardiovascular", "respiratory"],
          programIds: ["primary-care", "flow"],
          markers: { musculoskeletal: { x: 39, y: 67 }, cardiovascular: { x: 37, y: 67 }, respiratory: { x: 38, y: 39 } },
          physiologicalConnection: "Muscle contraction supports venous return while gradual activity helps the cardiovascular and respiratory systems adapt without exceeding the clinician-set symptom limit.",
          intervention: "Complete the current 10-minute movement interval if symptoms remain within the shared limit.",
          interventionDetail: "The plan advances only after the current level is tolerated.",
        },
        {
          id: "brain-fog-standing",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "symptom",
          label: "Brain fog after standing",
          status: "monitoring",
          primarySystemId: "neurological",
          relatedSystemIds: ["cardiovascular"],
          programIds: ["flow"],
          markers: { neurological: { x: 46, y: 17 }, cardiovascular: { x: 45, y: 18 } },
          physiologicalConnection: "The neurological symptoms are being interpreted alongside standing blood pressure, heart rate, vascular tone, and cerebral blood-flow demands rather than as an isolated complaint.",
          intervention: "Pair symptom timing with the standing-reading series.",
          interventionDetail: "That pairing helps the care team see whether symptoms and physiology change together.",
        },
        {
          id: "task-initiation",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "symptom",
          label: "Task initiation becomes harder with fatigue",
          status: "shared",
          primarySystemId: "neurological",
          relatedSystemIds: ["endocrine"],
          programIds: ["charmed-minds"],
          markers: { neurological: { x: 60, y: 20 }, endocrine: { x: 59, y: 29 } },
          physiologicalConnection: "Executive function depends on cognitive energy, working memory, sleep, sensory load, and the ability to make the first action visible.",
          intervention: "Use a written next action and a three-minute visible start.",
          interventionDetail: "This supports initiation without treating a neurodivergent processing pattern as a motivation problem.",
        },
        {
          id: "sleep-mood-energy",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "symptom",
          label: "Sleep disruption changes mood and energy",
          status: "active",
          primarySystemId: "neurological",
          relatedSystemIds: ["endocrine", "respiratory"],
          programIds: ["mind-mood"],
          markers: { neurological: { x: 37, y: 20 }, endocrine: { x: 37, y: 29 }, respiratory: { x: 38, y: 33 } },
          physiologicalConnection: "Sleep timing, breathing, stress-hormone rhythms, medication response, and mood symptoms are being reviewed as one connected pattern.",
          intervention: "Track sleep timing with the daily mood and energy check-in.",
          interventionDetail: "Your care team can compare those patterns before changing the plan.",
          destination: "medication-request",
        },
        {
          id: "kidney-bp-link",
          reviewStatus: "approved",
          visibleToPatient: true,
          kind: "lab",
          label: "Kidney function in the blood-pressure plan",
          status: "steady",
          primarySystemId: "renal-urinary",
          relatedSystemIds: ["cardiovascular"],
          programIds: ["primary-care", "flow"],
          physiologicalConnection: "The kidneys influence sodium, fluid balance, vascular signaling, and blood pressure while also determining the safety of several medication choices.",
          intervention: "Continue trend review with blood pressure and medication monitoring.",
          destination: "lab",
        },
      ],
    },
    labs: [
      {
        id: "synthetic-apob",
        name: "Apolipoprotein B",
        value: "92",
        unit: "mg/dL",
        referenceRange: "individualized by risk",
        status: "monitoring",
        interpretation: {
          summary: "This synthetic result is being followed as part of the overall atherogenic-particle and cardiovascular-risk pattern, not interpreted alone.",
          connection: "Health360 will supply the individualized interpretation; the patient portal displays the clinician-shared explanation and its connected systems.",
        },
      },
      {
        id: "synthetic-egfr",
        name: "Estimated GFR",
        value: "88",
        unit: "mL/min/1.73 m²",
        referenceRange: "trend with clinical context",
        status: "steady",
        interpretation: {
          summary: "This synthetic result is included because kidney filtration, fluid balance, blood pressure, and medication safety are being reviewed together.",
          connection: "The completed Blueprint maps it primarily to the renal system and secondarily to cardiovascular care.",
        },
      },
    ],
    medications: [
      {
        name: "Synthetic medication",
        clinicalStatus: "active",
        instructions: "Take one tablet each morning as directed.",
        request: { status: "sent-to-pharmacy", message: "Your synthetic refill request was reviewed and sent to the pharmacy." },
      },
      { name: "Synthetic supplement", clinicalStatus: "on-hold", instructions: "Pause until your care team reviews your next result." },
    ],
    requests: [{
      type: "referral",
      status: "referral-sent",
      message: "Your synthetic cardiology referral was sent. This does not mean an appointment is scheduled.",
      destinationName: "Synthetic Cardiology Team",
      specialty: "Cardiology",
      organization: "BHW synthetic network",
      phone: "(410) 555-0100",
      statusChangedAt: "2026-08-20T14:00:00.000Z",
    }],
  };
}

let dashboardPromise;

export async function loadPortalDashboard() {
  if (dashboardPromise) return dashboardPromise;
  dashboardPromise = (async () => {
    if (isLocalPreview) return previewDashboard();
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) throw new Error("SIGN_IN_REQUIRED");
    const response = await fetch("/api/patient-portal/dashboard", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.dashboard) {
      if (response.status === 401 || response.status === 403) sessionStorage.removeItem(SESSION_KEY);
      throw new Error(body.error || "The care space could not be loaded.");
    }
    return body.dashboard;
  })();
  try {
    return await dashboardPromise;
  } catch (error) {
    dashboardPromise = null;
    throw error;
  }
}

export function formatStatus(value) {
  const labels = {
    active: "Active", "on-hold": "On hold", stopped: "Stopped", completed: "Completed",
    cancelled: "Cancelled", unknown: "Confirm with care team", received: "Received",
    "clinical-review": "Clinical review", "needs-information": "Needs information",
    "waiting-on-payer": "Waiting on insurance", "sent-to-pharmacy": "Sent to pharmacy",
    ready: "Ready", improving: "Improving", steady: "Steady", shared: "Shared", monitoring: "Monitoring",
    "needs-attention": "Needs attention", "not-assessed": "Not assessed",
  };
  return labels[value] || String(value || "Update").replaceAll("-", " ");
}

export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
