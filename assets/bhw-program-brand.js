(function () {
  "use strict";

  var LOGOS = {
    primary: '<img class="program-logo-image program-logo-primary" src="hm-assets/bhw-emblem.png" alt="">',
    mind: '<img class="program-logo-image program-logo-mind" src="assets/mind-mood-logo.png" alt="">',
    charmed: '<img class="program-logo-image program-logo-charmed" src="assets/charmed-minds-logo.png" alt="">',
    flow: '<img class="program-logo-image program-logo-flow" src="assets/brand/flow.png" alt="">'
  };

  var UI_ICONS = {
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.5 2"/>',
    cardiac: '<path d="M12 20s-6.5-4-6.5-9a3.7 3.7 0 0 1 6.5-2.5A3.7 3.7 0 0 1 18.5 11c0 5-6.5 9-6.5 9z"/><path d="M7 12h3l1.4-2.5 2.1 5 1.3-2H18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>',
    pressure: '<path d="M12 3.5s5 5.7 5 10a5 5 0 0 1-10 0c0-4.3 5-10 5-10z"/><path d="M9.5 14.5c.8 1.2 2 1.8 3.5 1.5"/>',
    lab: '<path d="M9 3h6M10 3v5.5l-4 7.3A2 2 0 0 0 7.8 19h8.4a2 2 0 0 0 1.8-3.2l-4-7.3V3"/><path d="M8.5 14h7"/>',
    nutrition: '<path d="M5 14c5.2.3 9.2-2.2 14-7 0 6.8-2.8 12-8 12-3.5 0-5.7-1.8-6-5z"/><path d="M6 18c2.5-3 5.5-5.5 9.5-7.5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M13 13h3M8 16h3"/>',
    air: '<path d="M3.5 8.5h10c2.5 0 2.5-3.5.2-3.5-1.2 0-2 .6-2.3 1.5M3.5 12h15c3.2 0 3.2 4.5.2 4.5-1.4 0-2.3-.7-2.7-1.8M3.5 15.5h7"/>',
    lungs: '<path d="M12 4v7M10.5 8.5C9 8 7.7 9 7 10.8c-1 2.4-1.4 5.7-.6 8.2.4 1.2 1.6 1.7 2.7 1.1 1-.5 1.4-1.5 1.4-2.8V9M13.5 8.5c1.5-.5 2.8.5 3.5 2.3 1 2.4 1.4 5.7.6 8.2-.4 1.2-1.6 1.7-2.7 1.1-1-.5-1.4-1.5-1.4-2.8V9"/>',
    activity: '<circle cx="13.5" cy="5" r="2"/><path d="M11.5 9 9 13l3 2 1.5 5M11.5 9l4 2 2.5-2M12 15l-4 5M9 13l-4-1"/>',
    clinician: '<path d="M8 4v5a4 4 0 0 0 8 0V4M6 4h4M14 4h4M12 13v2a4 4 0 0 0 4 4h1"/><circle cx="19" cy="19" r="2"/>',
    restrict: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
    microbiome: '<circle cx="12" cy="12" r="5"/><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5"/><circle cx="10" cy="11" r=".7"/><circle cx="14" cy="13" r=".7"/>',
    brain: '<path d="M12 5v14M11.8 7.5c-1-2-4-2.2-5.2-.3-2.4.2-3.4 3.2-1.7 4.8-1.2 2 .3 4.6 2.7 4.3.8 2 3 2.4 4.4 1M12.2 7.5c1-2 4-2.2 5.2-.3 2.4.2 3.4 3.2 1.7 4.8 1.2 2-.3 4.6-2.7 4.3-.8 2-3 2.4-4.4 1"/>',
    sleep: '<path d="M18.5 16.5A7.8 7.8 0 0 1 8 6a8 8 0 1 0 10.5 10.5z"/>',
    dna: '<path d="M7 3c0 6 10 6 10 12 0 2.5-1 4.5-3 6M17 3c0 6-10 6-10 12 0 2.5 1 4.5 3 6M8 7h8M7 12h10M8 17h8"/>',
    temperature: '<path d="M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0z"/><path d="M12 8v8"/>',
    message: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    shield: '<path d="M12 3.5 19 6v5.5c0 4.2-2.7 7.3-7 9-4.3-1.7-7-4.8-7-9V6l7-2.5z"/><path d="m8.8 12 2.1 2.1 4.4-4.5"/>',
    inflammation: '<path d="M13 3.5c.7 3-2.7 4.7-1.2 7.2.9 1.5 2.8.6 3.1-.8 2.5 2.2 3.5 4.3 2.8 6.6-.8 2.7-3 4.2-5.7 4.2-3.7 0-6.2-2.2-6.2-5.5 0-2.7 1.8-4.7 4.3-6.7-.2 2 .5 3.3 1.5 3.7"/>',
    balance: '<path d="M12 4v16M6 6h12M7 6l-4 7h8L7 6zM17 6l-4 7h8l-4-7zM8 20h8"/>',
    bone: '<path d="M8.5 8.5 15.5 15.5M8.5 8.5A2.2 2.2 0 1 0 5.8 5.8a2.2 2.2 0 1 0 2.7 2.7zM15.5 15.5a2.2 2.2 0 1 0 2.7 2.7 2.2 2.2 0 1 0-2.7-2.7z"/>',
    mobility: '<circle cx="12" cy="5" r="2"/><path d="M12 7.5v5M12 10l-4 3M12 10l4 3M12 12.5l-3 7M12 12.5l4 6M5 9l3 4M19 9l-3 4"/>',
    strength: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    "mood-rough": '<circle cx="12" cy="12" r="8"/><path d="M8.5 9.5h2M13.5 9.5h2M8.5 16c2.3-2.2 4.7-2.2 7 0"/>',
    "mood-low": '<circle cx="12" cy="12" r="8"/><path d="M8.5 9.5h2M13.5 9.5h2M9 16c2-1.4 4-1.4 6 0"/>',
    "mood-ok": '<circle cx="12" cy="12" r="8"/><path d="M8.5 9.5h2M13.5 9.5h2M9.5 15.5h5"/>',
    "mood-good": '<circle cx="12" cy="12" r="8"/><path d="M8.5 9.5h2M13.5 9.5h2M9 14.5c2 1.8 4 1.8 6 0"/>',
    "mood-great": '<circle cx="12" cy="12" r="8"/><path d="m8.5 9.5 1 .8 1-.8M13.5 9.5l1 .8 1-.8M8.8 14.5c2.1 2.3 4.3 2.3 6.4 0"/>'
  };

  function uiIcon(name) {
    var paths = UI_ICONS[name];
    return paths ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>' : "";
  }

  var PROGRAMS = {
    primary: { label: "Primary Care", detail: "Your medical home" },
    mind: { label: "Mind & Mood", detail: "Recovery and medication management" },
    charmed: { label: "CharmEd Minds", detail: "Cognitive and neurodevelopmental care" },
    flow: { label: "Flow", detail: "Vascular stabilization" }
  };

  var ALIASES = {
    primary: "primary", "primary-care": "primary", "primary care": "primary", pc: "primary",
    mind: "mind", "mind-mood": "mind", "mind and mood": "mind", "mind & mood": "mind",
    charmed: "charmed", "charmed-minds": "charmed", "charmed minds": "charmed",
    flow: "flow"
  };

  function normalize(value) {
    return ALIASES[String(value || "").trim().toLowerCase()] || "primary";
  }

  function programFromButton(button) {
    return normalize(button.dataset.program || button.dataset.p || button.textContent);
  }

  var params = new URLSearchParams(location.search);
  var current = normalize(params.get("p") || params.get("program") || document.documentElement.dataset.programContext);
  var program = PROGRAMS[current];
  var root = document.documentElement;
  root.dataset.program = current;
  document.body.dataset.program = current;

  var header = document.querySelector(".hd-logo");
  if (header) {
    header.classList.add("care-connect-brand");
    header.innerHTML = '<span class="program-mark program-logo-' + current + '" aria-hidden="true">' + LOGOS[current] + '</span>' +
      '<div><b>BHW Care Connect</b><span class="program-subtitle"><strong>' + program.label + '</strong> · ' + program.detail + '</span></div>';
  }

  var railBrand = document.querySelector(".rail .brand");
  if (railBrand) {
    railBrand.classList.add("program-rail-mark");
    railBrand.innerHTML = LOGOS[current];
    railBrand.setAttribute("aria-label", program.label + " program");
    railBrand.setAttribute("title", program.label);
  }

  document.querySelectorAll(".progs button").forEach(function (button) {
    var id = programFromButton(button);
    var item = PROGRAMS[id];
    button.dataset.program = id;
    button.classList.toggle("on", id === current);
    button.setAttribute("aria-pressed", id === current ? "true" : "false");
    button.innerHTML = '<span class="program-tab-icon program-logo-' + id + '" aria-hidden="true">' + LOGOS[id] + '</span><span>' + item.label + '</span>';
    button.addEventListener("click", function () {
      var next = new URL(location.href);
      next.searchParams.set("p", id);
      next.searchParams.delete("program");
      location.href = next.href;
    });
  });

  var systemPage = /^bhw-(cardio|respiratory|gi|neuro|endocrine|immune|msk)\.html$/i;
  document.querySelectorAll("a[href]").forEach(function (link) {
    try {
      var url = new URL(link.getAttribute("href"), location.href);
      var page = url.pathname.split("/").pop();
      if (systemPage.test(page)) {
        url.searchParams.set("p", current);
        link.href = url.pathname.split("/").pop() + url.search + url.hash;
      }
    } catch (error) {
      /* Leave non-URL navigation untouched. */
    }
  });

  var suffix = document.title.split("—").slice(1).join("—").trim();
  if (suffix) document.title = "BHW Care Connect — " + program.label + " · " + suffix;

  document.querySelectorAll("[data-ui-icon]").forEach(function (element) {
    var name = element.dataset.uiIcon;
    element.innerHTML = uiIcon(name);
    element.classList.add("ui-icon-ready");
    var button = element.closest("button[data-v]");
    if (button && !button.getAttribute("aria-label")) button.setAttribute("aria-label", button.dataset.v);
  });

  window.BHWCareConnectProgram = Object.freeze({ id: current, label: program.label });
})();
