const SESSION_KEY = "bhw_pt_session";
const auth = { mode: "email", sent: false, methodId: null };
const $ = (id) => document.getElementById(id);

function setStatus(message) {
  $("login-status").textContent = message;
}

function label(value) {
  const labels = {
    active: "Active", "on-hold": "On hold", stopped: "Stopped", completed: "Completed",
    cancelled: "Cancelled", unknown: "Confirm with care team", received: "Received",
    "clinical-review": "Clinical review", "needs-information": "Needs information",
    "waiting-on-payer": "Waiting on insurance", "sent-to-pharmacy": "Sent to pharmacy",
    ready: "Ready",
  };
  return labels[value] || String(value || "Update").replaceAll("-", " ");
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function empty(target, message) {
  target.replaceChildren(element("p", "empty", message));
}

function renderPlan(plan) {
  const target = $("plan");
  target.replaceChildren();
  if (!plan) return empty(target, "Your care team has not shared a Health Blueprint yet.");
  if (plan.mainStory) target.append(element("p", "section-intro", plan.mainStory));
  if (plan.today?.length) {
    target.append(element("h3", "", "What to do now"));
    const list = element("ul", "actions");
    plan.today.forEach((action) => list.append(element("li", "", action)));
    target.append(list);
  }
  if (plan.priorities?.length) {
    target.append(element("h3", "", "First priorities"));
    const list = element("ul", "actions");
    plan.priorities.forEach((action) => list.append(element("li", "", action)));
    target.append(list);
  }
}

function renderMedications(medications) {
  const target = $("medications");
  target.replaceChildren();
  if (!medications?.length) return empty(target, "No medications are available in this view.");
  medications.forEach((medication) => {
    const item = element("article", "item");
    const head = element("div", "item-head");
    head.append(element("h3", "", medication.name), element("span", "chip", label(medication.clinicalStatus)));
    item.append(head);
    if (medication.instructions) item.append(element("p", "", medication.instructions));
    if (medication.request) {
      const request = element("div", "request");
      request.append(element("strong", "", label(medication.request.status)));
      request.append(element("p", "", medication.request.message));
      item.append(request);
    }
    target.append(item);
  });
}

function renderRequests(requests) {
  const target = $("requests");
  target.replaceChildren();
  if (!requests?.length) return empty(target, "No other patient-visible requests are open.");
  requests.forEach((request) => {
    const item = element("article", "item");
    const head = element("div", "item-head");
    head.append(element("h3", "", label(request.type)), element("span", "chip", label(request.status)));
    item.append(head, element("p", "", request.message));
    target.append(item);
  });
}

function renderSystems(systems) {
  const target = $("systems");
  target.replaceChildren();
  if (!systems?.length) return empty(target, "Your shared Blueprint does not include system details yet.");
  systems.forEach((system) => {
    const item = element("article", "item system");
    const head = element("div", "item-head");
    head.append(element("h3", "", label(system.label)), element("span", "chip", label(system.status)));
    item.append(head);
    if (system.summary) item.append(element("p", "", system.summary));
    target.append(item);
  });
}

function renderDashboard(dashboard) {
  $("preferred-name").textContent = dashboard.patient?.preferredName || "Patient";
  const generated = new Date(dashboard.generatedAt);
  $("updated").textContent = Number.isNaN(generated.getTime()) ? "" : `Updated ${generated.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
  renderPlan(dashboard.plan);
  renderMedications(dashboard.medications);
  renderRequests(dashboard.requests);
  renderSystems(dashboard.plan?.systems);
  $("login-view").hidden = true;
  $("dashboard-view").hidden = false;
}

async function loadDashboard(token) {
  const response = await fetch("/api/patient-portal/dashboard", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.dashboard) throw new Error(body.error || "The dashboard could not be loaded.");
  renderDashboard(body.dashboard);
}

function identityPayload() {
  const value = $("identity").value.trim();
  return auth.mode === "phone" ? { phone: value } : { email: value.toLowerCase() };
}

async function submitLogin(event) {
  event.preventDefault();
  const button = $("submit-button");
  const identity = $("identity").value.trim();
  const dob = $("dob").value;
  if (auth.mode === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) return setStatus("Enter a valid email address.");
  if (auth.mode === "phone" && identity.replace(/\D/g, "").length < 10) return setStatus("Enter a valid mobile number.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return setStatus("Enter your date of birth.");

  button.disabled = true;
  try {
    if (!auth.sent) {
      setStatus("Sending your BHW sign-in code…");
      const response = await fetch("/.netlify/functions/patient-auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", ...identityPayload(), dob }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The code could not be sent.");
      auth.sent = true;
      auth.methodId = body.methodId || null;
      $("code-field").hidden = false;
      $("mode-button").hidden = true;
      $("identity").readOnly = true;
      $("dob").readOnly = true;
      $("submit-button").textContent = "Open my care space";
      $("code").focus();
      setStatus(body.demo ? "Preview mode: enter any 6 digits." : `Enter the code sent by ${auth.mode === "phone" ? "text" : "email"}.`);
      return;
    }

    const code = $("code").value.trim();
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code.");
    setStatus("Opening your private care space…");
    const response = await fetch("/.netlify/functions/patient-auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", methodId: auth.methodId, code, dob, ...identityPayload() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.token) throw new Error(body.error || "That code did not match.");
    sessionStorage.setItem(SESSION_KEY, body.token);
    await loadDashboard(body.token);
  } catch (error) {
    setStatus(error.message || "Please try again.");
  } finally {
    button.disabled = false;
  }
}

function toggleMode() {
  if (auth.sent) return;
  auth.mode = auth.mode === "email" ? "phone" : "email";
  const phone = auth.mode === "phone";
  $("identity-label").textContent = phone ? "Mobile number" : "Email";
  $("identity").type = phone ? "tel" : "email";
  $("identity").autocomplete = phone ? "tel" : "email";
  $("identity").placeholder = phone ? "(410) 555-0123" : "you@example.com";
  $("identity").value = "";
  $("submit-button").textContent = phone ? "Text my code" : "Email my code";
  $("mode-button").textContent = phone ? "Have an email? Use it instead" : "No email? Use a mobile number";
  setStatus("");
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

$("login-form").addEventListener("submit", submitLogin);
$("mode-button").addEventListener("click", toggleMode);
$("signout-button").addEventListener("click", signOut);

const existing = sessionStorage.getItem(SESSION_KEY);
if (existing) {
  setStatus("Opening your private care space…");
  loadDashboard(existing).catch((error) => {
    sessionStorage.removeItem(SESSION_KEY);
    setStatus(error.message || "Please sign in again.");
  });
}
