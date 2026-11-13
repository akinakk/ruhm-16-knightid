(() => {
const surveyData = {
  tools: [
    { label: "Moodle", value: 29, color: "#9270e2" },
    { label: "TalTechi äpp", value: 15, color: "#4d9bb4" },
    { label: "Outlook", value: 12, color: "#c2794d" },
    { label: "ÕIS 2.0", value: 13, color: "#4f9c74" },
    { label: "Tudengiveeb", value: 4, color: "#bd5f7d" },
  ],
  frequency: [
    { label: "Mitu korda päevas", value: 3 },
    { label: "Kord päevas", value: 9 },
    { label: "Iga paari päeva tagant", value: 14 },
    { label: "Kord nädalas või harvem", value: 4 },
  ],
  schedule: [
    { label: "Puudub selge terviklik ülevaade", value: 17 },
    { label: "Raske ruumi kiiresti leida", value: 11 },
    { label: "Vaade muutub kasutamise käigus", value: 9 },
    { label: "Muu", value: 6 },
    { label: "Teavitustega seotud probleemid", value: 5 },
    { label: "Pole probleeme esinenud", value: 1 },
  ],
  technical: [
    { label: "Äpp on aeglane või hangub", value: 13 },
    { label: "Logib ootamatult välja", value: 8 },
    { label: "Veebirakendus ei kohandu", value: 7 },
    { label: "Hüpikakendega seotud tõrge", value: 6 },
    { label: "Pole tõrkeid märganud", value: 6 },
    { label: "Leht värskendab iseenesest", value: 4 },
    { label: "Muu", value: 2 },
  ],
  channels: [
    { label: "Mobiili push-teavitused", value: 19 },
    { label: "Outlooki e-post", value: 14 },
    { label: "Sotsiaalmeedia / suhtluskanalid", value: 14 },
    { label: "SMS", value: 3 },
  ],
};

const svgNS = "http://www.w3.org/2000/svg";
const donut = document.getElementById("tools-donut");
const tooltip = document.getElementById("donut-tooltip");
const legend = document.getElementById("tools-legend");

function describeCount(value, total) {
  return `${value} ${value === 1 ? "valik" : "valikut"} · ${total} valikust`;
}

function makeDonut() {
  if (!donut || !legend) return;
  const total = surveyData.tools.reduce((sum, item) => sum + item.value, 0);
  const defs = document.createElementNS(svgNS, "defs");
  surveyData.tools.forEach((item, index) => {
    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.id = `tool-gradient-${index}`;
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "100%");
    const start = document.createElementNS(svgNS, "stop");
    start.setAttribute("offset", "0%");
    start.setAttribute("stop-color", item.color);
    const end = document.createElementNS(svgNS, "stop");
    end.setAttribute("offset", "100%");
    end.setAttribute("stop-color", item.color);
    gradient.append(start, end);
    defs.append(gradient);
  });
  donut.append(defs);
  let startAngle = -90;

  surveyData.tools.forEach((item, index) => {
    const angle = (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const start = polarPoint(120, 120, 94, startAngle);
    const end = polarPoint(120, 120, 94, endAngle);
    const largeArc = angle > 180 ? 1 : 0;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M ${start.x} ${start.y} A 94 94 0 ${largeArc} 1 ${end.x} ${end.y} L ${polarPoint(120, 120, 54, endAngle).x} ${polarPoint(120, 120, 54, endAngle).y} A 54 54 0 ${largeArc} 0 ${polarPoint(120, 120, 54, startAngle).x} ${polarPoint(120, 120, 54, startAngle).y} Z`);
    path.setAttribute("fill", `url(#tool-gradient-${index})`);
    path.setAttribute("class", "donut-segment");
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-pressed", "true");
    path.setAttribute("aria-label", `Peida ${item.label}, ${item.value} vastust`);
    path.dataset.index = String(index);
    path.dataset.label = item.label;
    path.dataset.value = String(item.value);
    path.style.color = item.color;
    path.addEventListener("pointerenter", showTooltip);
    path.addEventListener("pointerleave", hideTooltip);
    path.addEventListener("focus", showTooltip);
    path.addEventListener("blur", hideTooltip);
    path.addEventListener("click", () => toggleCategory(index, path));
    path.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      path.click();
    });
    donut.append(path);
    startAngle = endAngle;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "legend-item";
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `Peida ${item.label}, ${item.value} vastust`);
    button.dataset.index = String(index);
    button.innerHTML = `<span class="legend-swatch" style="background:${item.color};color:${item.color}"></span><span>${item.label}</span><b>${item.value}</b>`;
    button.addEventListener("click", () => toggleCategory(index, button));
    legend.append(button);
  });
}

function polarPoint(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function showTooltip(event) {
  if (!tooltip) return;
  const segment = event.currentTarget;
  tooltip.textContent = `${segment.dataset.label}: ${describeCount(Number(segment.dataset.value), 73)}`;
  tooltip.classList.add("visible");
}

function hideTooltip() {
  tooltip?.classList.remove("visible");
}

function toggleCategory(index, control) {
  const segment = donut?.querySelector(`[data-index="${index}"]`);
  const button = legend?.querySelector(`[data-index="${index}"]`);
  if (!segment || !button) return;
  const muted = control.getAttribute("aria-pressed") === "true";
  [segment, button].forEach((item) => {
    item.setAttribute("aria-pressed", String(!muted));
    item.classList.toggle("is-muted", muted);
    item.setAttribute("aria-label", `${muted ? "Näita" : "Peida"} ${segment.dataset.label}, ${segment.dataset.value} vastust`);
  });
}

function renderBars(targetId, entries, options = {}) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const maxValue = options.max || Math.max(...entries.map((entry) => entry.value));
  const color = options.color || "#a98aff";
  target.replaceChildren();
  entries.forEach((entry) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "bar-row interactive-bar";
    row.setAttribute("aria-pressed", "true");
    row.setAttribute("aria-label", `Peida ${entry.label}, ${entry.value} vastust`);
    row.title = `${entry.label}: ${entry.value} vastust · vajuta rea peitmiseks või näitamiseks`;
    row.addEventListener("click", () => {
      const shown = row.getAttribute("aria-pressed") === "true";
      row.setAttribute("aria-pressed", String(!shown));
      row.classList.toggle("is-muted", shown);
      row.setAttribute("aria-label", `${shown ? "Näita" : "Peida"} ${entry.label}, ${entry.value} vastust`);
    });
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = entry.label;
    const track = document.createElement("span");
    track.className = "bar-track";
    track.setAttribute("role", "meter");
    track.setAttribute("aria-label", `${entry.label}: ${entry.value} vastust`);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(maxValue));
    track.setAttribute("aria-valuenow", String(entry.value));
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.setProperty("--bar-width", `${(entry.value / maxValue) * 100}%`);
    fill.style.setProperty("--bar-color", color);
    fill.title = `${entry.label}: ${entry.value}`;
    track.append(fill);
    const value = document.createElement("b");
    value.className = "bar-value";
    value.textContent = entry.value;
    row.append(label, track, value);
    target.append(row);
  });
}

makeDonut();
renderBars("frequency-chart", surveyData.frequency, { max: 14, color: "#8b6ddd" });
renderBars("schedule-problems-chart", surveyData.schedule, { max: 17, color: "#4b98b1" });
renderBars("technical-chart", surveyData.technical, { max: 13, color: "#c17a4d" });
renderBars("channels-chart-bars", surveyData.channels, { max: 19, color: "#6b83d3" });

const tabs = [...document.querySelectorAll(".survey-tab")];
const panels = [...document.querySelectorAll(".survey-panel")];
const panelStage = document.getElementById("panel-stage");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let panelTransitionTimer;
let panelTransitionEnd;
let panelTransitionResolve;
let panelTransitionPromise = Promise.resolve(true);
let surveyNavigationRun = 0;

function activateTab(tab, focus = false) {
  if (!tab) return Promise.resolve(false);
  const nextPanel = document.getElementById(tab.getAttribute("aria-controls") || `panel-${tab.dataset.panel}`);
  const currentPanel = panels.find((panel) => panel.classList.contains("active"));
  if (!nextPanel) return Promise.resolve(false);

  tabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  if (focus) tab.focus();
  if (currentPanel === nextPanel) return panelTransitionPromise;
  closeAllSurveyTips();

  const startHeight = panelStage?.getBoundingClientRect().height || 0;
  if (panelTransitionTimer) window.clearTimeout(panelTransitionTimer);
  if (panelTransitionEnd) panelStage.removeEventListener("transitionend", panelTransitionEnd);
  panelTransitionResolve?.(false);
  panelTransitionResolve = null;
  panels.forEach((panel) => panel.removeAttribute("aria-busy"));
  panels.forEach((panel) => panel.classList.remove("is-leaving"));

  if (!currentPanel || !panelStage || reducedMotion) {
    panels.forEach((panel) => {
      const selected = panel === nextPanel;
      panel.classList.toggle("active", selected);
      panel.setAttribute("aria-hidden", String(!selected));
    });
    panelStage?.classList.remove("is-animating");
    if (panelStage) panelStage.style.height = "";
    panelTransitionPromise = Promise.resolve(true);
    return panelTransitionPromise;
  }

  panelStage.style.height = `${startHeight}px`;
  panelStage.classList.add("is-animating");
  currentPanel.classList.remove("active");
  currentPanel.classList.add("is-leaving");
  currentPanel.setAttribute("aria-hidden", "true");
  nextPanel.classList.add("active");
  nextPanel.setAttribute("aria-hidden", "false");
  nextPanel.setAttribute("aria-busy", "true");
  panelStage.getBoundingClientRect();

  requestAnimationFrame(() => {
    panelStage.style.height = `${nextPanel.offsetHeight}px`;
  });

  const promise = new Promise((resolve) => {
    const finishTransition = (completed = true) => {
      if (panelTransitionResolve !== resolve) return;
      panels.forEach((panel) => panel.classList.remove("is-leaving"));
      nextPanel.removeAttribute("aria-busy");
      panelStage.classList.remove("is-animating");
      panelStage.style.height = "";
      if (panelTransitionEnd) panelStage.removeEventListener("transitionend", panelTransitionEnd);
      if (panelTransitionTimer) window.clearTimeout(panelTransitionTimer);
      panelTransitionEnd = undefined;
      panelTransitionTimer = undefined;
      panelTransitionResolve = null;
      panelTransitionPromise = Promise.resolve(true);
      resolve(completed);
    };
    panelTransitionResolve = resolve;
    panelTransitionEnd = (event) => {
      if (event.target === panelStage && event.propertyName === "height") finishTransition();
    };
    panelStage.addEventListener("transitionend", panelTransitionEnd);
    panelTransitionTimer = window.setTimeout(finishTransition, 480);
  });
  panelTransitionPromise = promise;
  return promise;
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    if (!tab.classList.contains("active")) {
      surveyNavigationRun += 1;
      closeAllSurveyTips();
    }
    activateTab(tab);
  });
  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    surveyNavigationRun += 1;
    closeAllSurveyTips();
    activateTab(tabs[nextIndex], true);
  });
});
if (tabs.length) activateTab(tabs.find((tab) => tab.classList.contains("active")) || tabs[0]);

const surveyDestinations = new Map([
  ["#tools-chart", { tabId: "tab-daily", targetId: "tools-chart", tipId: "tools-context-slot" }],
  ["#schedule-chart", { tabId: "tab-schedule", targetId: "schedule-chart", tipId: "schedule-context-slot" }],
  ["#channels-chart", { tabId: "tab-feedback", targetId: "channels-chart", tipId: "channels-context-slot" }],
]);

function closeSurveyTip(tip) {
  if (!tip) return;
  const target = tip.closest(".chart-card");
  const restoreFocus = tip.contains(document.activeElement);
  tip.dataset.open = "false";
  tip.style.display = "none";
  tip.setAttribute("aria-hidden", "true");
  tip.inert = true;
  const descriptionId = tip.querySelector(".survey-context-tooltip")?.id || tip.id;
  if (target?.getAttribute("aria-describedby") === descriptionId) {
    target.removeAttribute("aria-describedby");
  }
  if (restoreFocus) target?.focus({ preventScroll: true });
}

function closeAllSurveyTips() {
  document.querySelectorAll(".survey-context-slot[data-open='true']").forEach(closeSurveyTip);
}

document.querySelectorAll(".survey-context-slot").forEach((tip) => {
  tip.querySelector("button")?.addEventListener("click", () => closeSurveyTip(tip));
});

function finishAfterSurveyScroll(run, callback) {
  let settled = false;
  let idleTimer;
  let maxTimer;
  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(idleTimer);
    window.clearTimeout(maxTimer);
    window.removeEventListener("scroll", onScroll);
    if (run === surveyNavigationRun) callback();
  };
  const onScroll = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(finish, 120);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  idleTimer = window.setTimeout(finish, 160);
  maxTimer = window.setTimeout(finish, 1800);
}

function navigateToSurveyDestination(hash, updateHistory = true) {
  const destination = surveyDestinations.get(hash);
  if (!destination) return false;
  const target = document.getElementById(destination.targetId);
  const tab = document.getElementById(destination.tabId);
  const tip = destination.tipId ? document.getElementById(destination.tipId) : null;
  if (!target || !tab || (destination.tipId && !tip)) return false;

  const run = ++surveyNavigationRun;
  closeAllSurveyTips();
  if (updateHistory) {
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (window.location.hash === hash) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }

  const transition = activateTab(tab);
  transition.then((completed) => {
    if (!completed && run === surveyNavigationRun) surveyNavigationRun += 1;
  });
  requestAnimationFrame(() => {
    if (run !== surveyNavigationRun) return;
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight - 14;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: reducedMotion ? "auto" : "smooth" });
    finishAfterSurveyScroll(run, () => {
      if (!tip) return;
      target.setAttribute("aria-describedby", tip.querySelector(".survey-context-tooltip")?.id || tip.id);
      tip.inert = false;
      tip.setAttribute("aria-hidden", "false");
      tip.style.display = "block";
      tip.dataset.open = "true";
    });
  });
  return true;
}

document.querySelectorAll("a[data-survey-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (navigateToSurveyDestination(link.getAttribute("href"))) event.preventDefault();
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".survey-context-slot[data-open='true']").forEach(closeSurveyTip);
});

window.addEventListener("hashchange", () => {
  if (!navigateToSurveyDestination(window.location.hash, false)) closeAllSurveyTips();
});

if (surveyDestinations.has(window.location.hash)) {
  navigateToSurveyDestination(window.location.hash, false);
}

const animatedCharts = [...document.querySelectorAll(".horizontal-chart")];
if ("IntersectionObserver" in window) {
  const chartObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });
  animatedCharts.forEach((chart) => chartObserver.observe(chart));
} else {
  animatedCharts.forEach((chart) => chart.classList.add("is-visible"));
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
})();
