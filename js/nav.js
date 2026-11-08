const menuButton = document.getElementById("mobile-menu-btn");
const mainNav = document.getElementById("main-nav");

if (menuButton && mainNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    mainNav.classList.toggle("open", !isOpen);
  });
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton && mainNav) {
    mainNav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});

const dock = document.querySelector(".floating-dock");
const indicator = dock?.querySelector(".dock-indicator");
const dockItems = [...(dock?.querySelectorAll("a[data-dock-index]") || [])]
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter((item) => item.section);
const dockLinks = dockItems.map((item) => item.link);
const dockSections = dockItems.map((item) => item.section);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let dockFrame = 0;
let dockPositions = [];
let lastDockActiveIndex = -1;

function measureDock() {
  if (!dock || !indicator || !dockLinks.length) return;
  const dockRect = dock.getBoundingClientRect();
  dockPositions = dockLinks.map((link) => {
    const rect = link.getBoundingClientRect();
    return {
      x: rect.left - dockRect.left - dock.clientLeft,
      y: rect.top - dockRect.top - dock.clientTop,
      width: rect.width,
      height: rect.height,
    };
  });

  const base = dockPositions[0];
  indicator.style.width = `${base.width}px`;
  indicator.style.height = `${base.height}px`;
  updateDock();
}

function updateDock() {
  if (!dock || !indicator || !dockPositions.length) return;

  const scrollY = window.scrollY;
  const scrollOffset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const activationPoints = dockSections.map((section) => {
    const scrollMargin = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    return Math.max(0, section.getBoundingClientRect().top + scrollY - scrollOffset - scrollMargin);
  });

  let leftIndex = 0;
  while (leftIndex < activationPoints.length - 1 && scrollY >= activationPoints[leftIndex + 1]) {
    leftIndex += 1;
  }

  const rightIndex = Math.min(leftIndex + 1, dockPositions.length - 1);
  const rangeStart = activationPoints[leftIndex] ?? 0;
  const rangeEnd = activationPoints[rightIndex] ?? rangeStart;
  const scrollProgress = rightIndex === leftIndex || rangeEnd <= rangeStart
    ? 0
    : Math.max(0, Math.min(1, (scrollY - rangeStart) / (rangeEnd - rangeStart)));
  const progress = reducedMotion.matches ? 0 : scrollProgress;
  const from = dockPositions[leftIndex];
  const to = dockPositions[rightIndex];
  const base = dockPositions[0];
  const x = from.x + (to.x - from.x) * progress;
  const y = from.y + (to.y - from.y) * progress;
  const width = from.width + (to.width - from.width) * progress;
  const height = from.height + (to.height - from.height) * progress;

  indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${width / base.width}, ${height / base.height})`;

  const activeIndex = progress < 0.5 ? leftIndex : rightIndex;
  dockLinks.forEach((link, index) => {
    const active = index === activeIndex;
    link.classList.toggle("is-current", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");

    if (active && activeIndex !== lastDockActiveIndex) {
      lastDockActiveIndex = activeIndex;
      const dockRect = dock.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const innerLeft = dockRect.left + dock.clientLeft;
      const innerRight = innerLeft + dock.clientWidth;
      if (linkRect.left < innerLeft || linkRect.right > innerRight) {
        const target = link.offsetLeft - (dock.clientWidth - link.offsetWidth) / 2;
        dock.scrollTo({ left: target, behavior: reducedMotion.matches ? "auto" : "smooth" });
      }
    }
  });
}

function requestDockUpdate() {
  if (dockFrame) return;
  dockFrame = window.requestAnimationFrame(() => {
    updateDock();
    dockFrame = 0;
  });
}

if (dock && indicator && dockSections.length) {
  measureDock();
  window.addEventListener("scroll", requestDockUpdate, { passive: true });
  window.addEventListener("resize", measureDock);
  dock.addEventListener("scroll", measureDock, { passive: true });
  window.addEventListener("load", measureDock, { once: true });
  document.fonts?.ready.then(measureDock);
  reducedMotion.addEventListener?.("change", requestDockUpdate);
}
