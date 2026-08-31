import {
  getProgram,
  getSystem,
  isProgramVisible,
  isSystemVisible,
  visiblePrograms,
  visibleSystems,
} from "./page-registry.mjs";
import { SESSION_KEY, formatStatus, loadPortalDashboard, node, patientHref } from "./portal-data.mjs";

const $ = (id) => document.getElementById(id);
const pageType = document.body.dataset.pageType;
const requestedId = new URLSearchParams(location.search).get("id");

function linkBack() {
  location.href = patientHref("/patient/");
}

function showGate(title, message, buttonLabel = "Return to my care space") {
  $("loading").hidden = true;
  const gate = $("gate");
  gate.replaceChildren();
  const heading = node("h1", "", title);
  const copy = node("p", "", message);
  const button = node("a", "button", buttonLabel);
  button.href = patientHref("/patient/");
  gate.append(heading, copy, button);
  gate.hidden = false;
}

function renderHeader(dashboard, currentLabel) {
  $("preferred-name").textContent = dashboard.patient?.preferredName || "Patient";
  $("breadcrumb-current").textContent = currentLabel;
  $("breadcrumb-home").href = patientHref("/patient/");
}

function renderSystem(dashboard, entry) {
  const patientSystem = visibleSystems(dashboard).find((systemEntry) => systemEntry.id === entry.id);
  if (!patientSystem) return showGate("This page is not in your shared Blueprint", "A system page appears only when your BHW clinician includes that system in the Health Blueprint shared with you.");

  document.title = entry.name + " · Your BHW Care Space";
  renderHeader(dashboard, entry.shortName);
  $("page-content").replaceChildren();

  const hero = node("section", "card detail-hero");
  const figure = node("figure", "figure-stage");
  const image = node("img");
  const views = entry.views || [{
    id: "primary",
    label: "System view",
    asset: entry.asset,
    alt: "Detailed educational view of the " + entry.name.toLowerCase() + " shown through a brown-skinned adult body figure",
  }];
  image.src = "/patient/assets/" + views[0].asset;
  image.alt = views[0].alt;
  const caption = node("figcaption", "", "BHW educational body map · Visual anatomy is representative and is not a diagnostic image.");
  figure.append(image);
  if (views.length > 1) {
    const controls = node("div", "figure-tools");
    controls.setAttribute("aria-label", "Choose an anatomical view");
    views.forEach((view, index) => {
      const button = node("button", "view-button", view.label);
      button.type = "button";
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      button.addEventListener("click", () => {
        image.src = "/patient/assets/" + view.asset;
        image.alt = view.alt;
        controls.querySelectorAll("button").forEach((candidate) => candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false"));
      });
      controls.append(button);
    });
    figure.append(controls);
  }
  figure.append(caption);
  const heroCopy = node("div", "hero-copy");
  heroCopy.append(node("p", "eyebrow", entry.eyebrow), node("h1", "", entry.name), node("p", "lede", entry.overview));
  heroCopy.append(node("span", "hero-kicker", "Detailed system view"));
  hero.append(figure, heroCopy);

  const grid = node("div", "detail-grid");
  const main = node("div", "stack");
  const anatomy = node("section", "card content-card");
  anatomy.append(node("p", "eyebrow", "Anatomy & physiology"), node("h2", "", "What this system includes"));
  const anatomyList = node("div", "anatomy-list");
  entry.anatomy.forEach(([title, description]) => {
    const row = node("article", "anatomy-row");
    row.append(node("h3", "", title), node("p", "", description));
    anatomyList.append(row);
  });
  anatomy.append(anatomyList);

  const pathway = node("section", "card content-card");
  pathway.append(node("p", "eyebrow", "Functional pathways"), node("h2", "", "How the pieces work together"));
  const pathwayList = node("div", "pathway-list");
  entry.pathways.forEach(([title, description]) => {
    const row = node("article", "pathway");
    row.append(node("strong", "", title), node("p", "", description));
    pathwayList.append(row);
  });
  pathway.append(pathwayList);
  main.append(anatomy, pathway);

  const aside = node("aside", "stack");
  const focus = node("section", "card content-card patient-focus");
  focus.append(node("p", "eyebrow", "From your shared Blueprint"), node("h2", "", "Your current focus"));
  focus.append(node("span", "chip system-status", formatStatus(patientSystem.patientRecord?.status)));
  if (patientSystem.patientRecord?.summary) focus.append(node("p", "patient-summary", patientSystem.patientRecord.summary));
  if (patientSystem.patientRecord?.focus?.length) {
    const list = node("ul", "focus-list");
    patientSystem.patientRecord.focus.forEach((item) => list.append(node("li", "", item)));
    focus.append(list);
  } else {
    focus.append(node("p", "patient-summary", "Your care team has not added patient-specific focus steps to this system page yet."));
  }

  const connections = node("section", "card content-card");
  connections.append(node("p", "eyebrow", "Whole-person view"), node("h2", "", "Connections to other systems"));
  const connectionsList = node("ul", "connection-list");
  entry.connections.forEach((item) => connectionsList.append(node("li", "", item)));
  connections.append(connectionsList);

  const enrolled = visiblePrograms(dashboard).filter((program) => program.systemIds.includes(entry.id));
  if (enrolled.length) {
    const programs = node("section", "card content-card");
    programs.append(node("p", "eyebrow", "Your BHW programs"), node("h2", "", "Programs coordinating this system"));
    const links = node("div", "related-grid");
    enrolled.forEach((program) => {
      const link = node("a", "related-link");
      link.href = patientHref("/patient/program/", program.id);
      link.append(node("strong", "", program.name), node("span", "", "Open program →"));
      links.append(link);
    });
    programs.append(links);
    aside.append(programs);
  }
  connections.append(node("p", "clinical-note", "This page explains system structure and your clinician-shared focus. It does not diagnose a condition or replace your individualized medical plan."));
  aside.prepend(focus, connections);
  grid.append(main, aside);
  $("page-content").append(hero, grid);
}

function renderProgram(dashboard, entry) {
  document.title = entry.name + " · Your BHW Care Space";
  renderHeader(dashboard, entry.name);
  $("page-content").replaceChildren();

  const hero = node("section", "card program-hero");
  const heroCopy = node("div", "program-hero-copy");
  heroCopy.append(node("p", "eyebrow", entry.eyebrow), node("h1", "", entry.name), node("p", "lede", entry.overview));
  hero.append(heroCopy);
  if (entry.artwork?.length) {
    hero.classList.add("program-hero-with-art");
    const figure = node("figure", "program-art");
    const image = node("img", "program-art-main");
    image.src = "/patient/assets/" + entry.artwork[0].asset;
    image.alt = entry.artwork[0].alt;
    const caption = node("figcaption", "", "CharmEd Minds visual library · Brand artwork, not a diagnostic brain image.");
    const selector = node("div", "art-selector");
    selector.setAttribute("aria-label", "Choose CharmEd Minds artwork");
    entry.artwork.forEach((art, index) => {
      const button = node("button", "art-button");
      button.type = "button";
      button.setAttribute("aria-label", "Show " + art.label);
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      const thumbnail = node("img");
      thumbnail.src = "/patient/assets/" + art.asset;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";
      button.append(thumbnail, node("span", "", art.label));
      button.addEventListener("click", () => {
        image.src = "/patient/assets/" + art.asset;
        image.alt = art.alt;
        selector.querySelectorAll("button").forEach((candidate) => candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false"));
      });
      selector.append(button);
    });
    figure.append(image, selector, caption);
    hero.append(figure);
  }

  const grid = node("div", "detail-grid");
  const services = node("section", "card content-card");
  services.append(node("p", "eyebrow", "Coordinated care"), node("h2", "", "What this program brings together"));
  const serviceGrid = node("div", "service-grid");
  entry.services.forEach((item) => {
    const service = node("article", "service");
    service.append(node("p", "", item));
    serviceGrid.append(service);
  });
  services.append(serviceGrid);

  const systems = node("aside", "card content-card");
  systems.append(node("p", "eyebrow", "Program-to-system map"), node("h2", "", "Systems this program can coordinate"));
  systems.append(node("p", "", "A detailed system page opens only when that system is also present in your clinician-shared Blueprint."));
  const related = node("div", "related-grid");
  entry.systemIds.map(getSystem).filter(Boolean).forEach((systemEntry) => {
    const shared = isSystemVisible(dashboard, systemEntry.id);
    const row = node(shared ? "a" : "div", shared ? "related-link" : "related-locked");
    if (shared) row.href = patientHref("/patient/system/", systemEntry.id);
    row.append(node("strong", "", systemEntry.shortName), node("span", "", shared ? "Open system →" : "Not shared yet"));
    related.append(row);
  });
  systems.append(related);
  grid.append(services, systems);
  $("page-content").append(hero, grid);
}

async function start() {
  try {
    const dashboard = await loadPortalDashboard();
    const entry = pageType === "system" ? getSystem(requestedId) : getProgram(requestedId);
    if (!entry) return showGate("Page not found", "This is not a registered BHW patient page.");
    if (pageType === "system" && !isSystemVisible(dashboard, entry.id)) return showGate("This page is not in your shared Blueprint", "A system page appears only when your BHW clinician includes it in the Health Blueprint shared with you.");
    if (pageType === "program" && !isProgramVisible(dashboard, entry.id)) return showGate("This program is not assigned to your care space", "Program pages appear only for BHW programs listed in your current enrollment.");
    $("loading").hidden = true;
    $("care-view").hidden = false;
    if (pageType === "system") renderSystem(dashboard, entry);
    else renderProgram(dashboard, entry);
  } catch (error) {
    if (error.message === "SIGN_IN_REQUIRED") {
      showGate("Sign in to view this page", "Return to your BHW care space and sign in before opening a program or body-system page.", "Go to secure sign-in");
    } else {
      showGate("We could not open this page", error.message || "Please return to your care space and try again.");
    }
  }
}

$("signout-button").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  linkBack();
});

start();
