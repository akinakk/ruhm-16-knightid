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
    path.setAttribute("role", "img");
    path.setAttribute("aria-label", `${item.label}: ${describeCount(item.value, total)}`);
    path.dataset.index = String(index);
    path.dataset.label = item.label;
    path.dataset.value = String(item.value);
    path.style.color = item.color;
    path.addEventListener("pointerenter", showTooltip);
    path.addEventListener("pointerleave", hideTooltip);
    path.addEventListener("focus", showTooltip);
    path.addEventListener("blur", hideTooltip);
    donut.append(path);
    startAngle = endAngle;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "legend-item";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${item.label}: ${item.value} valikut. Vajuta kategooria peitmiseks või näitamiseks.`);
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

function toggleCategory(index, button) {
  const segment = donut?.querySelector(`[data-index="${index}"]`);
  if (!segment) return;
  const isSelected = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!isSelected));
  button.classList.toggle("is-muted", !isSelected);
  segment.classList.toggle("is-muted", !isSelected);
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
let panelSkeletonTimer;
let panelSkeleton;

function clearPanelSkeleton() {
  if (panelSkeletonTimer) window.clearTimeout(panelSkeletonTimer);
  panelSkeletonTimer = undefined;
  panelStage?.classList.remove("is-loading");
  panels.forEach((panel) => panel.removeAttribute("aria-busy"));
  panelSkeleton?.remove();
  panelSkeleton = undefined;
}

function createPanelSkeleton() {
  const skeleton = document.createElement("div");
  skeleton.className = "panel-skeleton";
  skeleton.setAttribute("aria-hidden", "true");
  skeleton.innerHTML = `
    <div class="panel-skeleton-head">
      <i class="skeleton-line skeleton-kicker"></i>
      <i class="skeleton-line skeleton-title"></i>
      <i class="skeleton-line skeleton-copy"></i>
    </div>
    <div class="panel-skeleton-grid">
      <div class="skeleton-card"><i class="skeleton-line skeleton-icon"></i><i class="skeleton-line skeleton-label"></i><i class="skeleton-line skeleton-chart"></i><i class="skeleton-line skeleton-copy"></i></div>
      <div class="skeleton-card"><i class="skeleton-line skeleton-icon"></i><i class="skeleton-line skeleton-label"></i><i class="skeleton-line skeleton-chart short"></i><i class="skeleton-line skeleton-copy medium"></i></div>
    </div>`;
  return skeleton;
}

function activateTab(tab, focus = false) {
  if (!tab) return;
  const nextPanel = document.getElementById(tab.getAttribute("aria-controls") || `panel-${tab.dataset.panel}`);
  const currentPanel = panels.find((panel) => panel.classList.contains("active"));
  if (!nextPanel) return;

  tabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  if (focus) tab.focus();
  if (currentPanel === nextPanel) return;

  if (panelTransitionTimer) window.clearTimeout(panelTransitionTimer);
  if (panelTransitionEnd) panelStage.removeEventListener("transitionend", panelTransitionEnd);
  clearPanelSkeleton();
  panels.forEach((panel) => panel.classList.remove("is-leaving"));

  if (!currentPanel || !panelStage || reducedMotion) {
    panels.forEach((panel) => {
      const selected = panel === nextPanel;
      panel.classList.toggle("active", selected);
      panel.setAttribute("aria-hidden", String(!selected));
    });
    panelStage?.classList.remove("is-animating");
    if (panelStage) panelStage.style.height = "";
    return;
  }

  const startHeight = panelStage.getBoundingClientRect().height;
  panelStage.style.height = `${startHeight}px`;
  panelStage.classList.add("is-animating");
  panelStage.classList.add("is-loading");
  panelSkeleton = createPanelSkeleton();
  panelStage.append(panelSkeleton);
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

  const finishTransition = () => {
    panels.forEach((panel) => panel.classList.remove("is-leaving"));
    panelStage.classList.remove("is-animating");
    panelStage.style.height = "";
    if (panelTransitionEnd) panelStage.removeEventListener("transitionend", panelTransitionEnd);
    panelTransitionEnd = undefined;
    if (panelTransitionTimer) window.clearTimeout(panelTransitionTimer);
    panelTransitionTimer = undefined;
  };
  panelTransitionEnd = (event) => {
    if (event.target === panelStage && event.propertyName === "height") finishTransition();
  };
  panelStage.addEventListener("transitionend", panelTransitionEnd);
  panelTransitionTimer = window.setTimeout(finishTransition, 520);
  panelSkeletonTimer = window.setTimeout(() => {
    const skeleton = panelSkeleton;
    panelStage.classList.remove("is-loading");
    nextPanel.removeAttribute("aria-busy");
    skeleton?.classList.add("is-hiding");
    panelSkeletonTimer = window.setTimeout(() => {
      skeleton?.remove();
      if (panelSkeleton === skeleton) panelSkeleton = undefined;
      panelSkeletonTimer = undefined;
    }, 190);
  }, 250);
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    activateTab(tabs[nextIndex], true);
  });
});
if (tabs.length) activateTab(tabs.find((tab) => tab.classList.contains("active")) || tabs[0]);

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
