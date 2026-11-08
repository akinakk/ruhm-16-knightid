(() => {
const contributions = {
  artemi: {
    name: "Artemi Baburin",
    role: "Küsimustik ja visuaalne kujundus",
    contribution: "Koostab küsimustiku ja viib selle õpilaste seas läbi. Loob Rühm 16 veebilehe ja kujunduse ning vormistab visuaalselt lõppraporti ja esitluse.",
  },
  artjom: {
    name: "Artjom Sokolov",
    role: "Vastuste kogumine ja kirjanduse ülevaade",
    contribution: "Levitab ankeeti ja kogub vastuseid, haldab isiklikku suhtlust ning tagasisidet. Otsib teadusartikleid, vormistab kirjandusviited ja koostab mõistete sõnastiku. Annab ülevaate lõplikust lahendusest (6. punkt).",
  },
  ott: {
    name: "Ott Külaots",
    role: "Planeerimine, sisu ja tagasiside",
    contribution: "Panustab üldisesse planeerimisse ning arutab meeskonnaga, mida ja kuidas teha. Tegeleb sisuga: viited, materjalide analüüs, tekstilõigud ja sõnastik. Vaatab meeskonna ühise töö kiirelt üle ning annab tagasisidet selle parandamiseks ja arendamiseks.",
  },
  toomas: {
    name: "Toomas Keba",
    role: "Sissejuhatus ja metoodika",
    contribution: "Koostab tiitellehe ja sissejuhatuse (1. punkt). Kirjeldab projekti tegevuskava, etappe ja metoodikat (3. punkt).",
  },
  konstantin: {
    name: "Konstantin Kubarski",
    role: "Persoonad ja empiiriline uurimine",
    contribution: "Koostab persoonad ja väärtuspakkumise (4. punkt), viib läbi pilootimise ning esitab empiirilise uurimise tulemused (5. punkt).",
  },
};

const memberDialog = document.getElementById("member-dialog");
const modalName = document.getElementById("member-modal-name");
const modalRole = document.getElementById("member-modal-role");
const modalContribution = document.getElementById("member-modal-contribution");
const modalAvatar = document.getElementById("member-modal-avatar");
const closeModal = memberDialog?.querySelector(".modal-close");
const fallbackBackdrop = document.createElement("div");
fallbackBackdrop.className = "member-dialog-backdrop";
fallbackBackdrop.setAttribute("aria-hidden", "true");
let lastMemberTrigger;
let activeDialogMotion;
let isClosing = false;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function animateDialog(keyframes, duration, easing) {
  if (!memberDialog || reduceMotion || typeof memberDialog.animate !== "function") {
    return Promise.resolve();
  }
  activeDialogMotion?.cancel();
  const motion = memberDialog.animate(keyframes, {
    duration,
    easing,
    fill: "both",
  });
  activeDialogMotion = motion;
  return motion.finished.catch(() => {}).then(() => {
    if (activeDialogMotion === motion) {
      motion.cancel();
      activeDialogMotion = null;
    }
  });
}

function openContribution(memberKey, trigger) {
  const member = contributions[memberKey];
  if (!member || !memberDialog || !modalName || !modalRole || !modalContribution) return;
  isClosing = false;
  memberDialog.classList.remove("is-closing");
  lastMemberTrigger = trigger;
  modalName.textContent = member.name;
  modalRole.textContent = member.role;
  modalContribution.textContent = member.contribution;
  if (modalAvatar) {
    modalAvatar.textContent = member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  }
  let openedNatively = false;
  if (typeof memberDialog.showModal === "function") {
    try {
      memberDialog.showModal();
      openedNatively = true;
    } catch (error) {
      openedNatively = memberDialog.matches?.(":modal") ?? false;
    }
  }
  if (!openedNatively) {
    // Escape transformed/stacked ancestors in browsers without a working top layer.
    document.body.append(fallbackBackdrop, memberDialog);
    memberDialog.classList.add("is-fallback");
    memberDialog.setAttribute("open", "");
    memberDialog.setAttribute("role", "dialog");
    memberDialog.setAttribute("aria-modal", "true");
    document.body.classList.add("member-modal-open");
    fallbackBackdrop.classList.remove("is-closing");
    fallbackBackdrop.classList.add("is-visible");
  }
  if (trigger && memberDialog.open) {
    const triggerRect = trigger.getBoundingClientRect();
    const dialogRect = memberDialog.getBoundingClientRect();
    const originX = Math.min(90, Math.max(10, ((triggerRect.left + triggerRect.width / 2 - dialogRect.left) / dialogRect.width) * 100));
    const originY = Math.min(90, Math.max(10, ((triggerRect.top + triggerRect.height / 2 - dialogRect.top) / dialogRect.height) * 100));
    memberDialog.style.setProperty("--modal-origin", `${originX}% ${originY}%`);
  }
  animateDialog(
    [
      { opacity: 0, transform: "translateY(12px) scale(.965)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    360,
    "cubic-bezier(.2,.8,.2,1)",
  );
  closeModal?.focus();
}

function closeContribution() {
  if (!memberDialog || !memberDialog.open || isClosing) return;
  isClosing = true;
  memberDialog.classList.add("is-closing");
  if (memberDialog.classList.contains("is-fallback")) fallbackBackdrop.classList.add("is-closing");
  animateDialog(
    [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(7px) scale(.985)" },
    ],
    190,
    "cubic-bezier(.4,0,1,1)",
  ).then(() => {
    if (!memberDialog.open) return;
    if (typeof memberDialog.close === "function" && !memberDialog.classList.contains("is-fallback")) {
      memberDialog.close();
    } else {
      memberDialog.removeAttribute("open");
      memberDialog.removeAttribute("role");
      memberDialog.removeAttribute("aria-modal");
      memberDialog.classList.remove("is-fallback", "is-closing");
      fallbackBackdrop.classList.remove("is-visible", "is-closing");
      document.body.classList.remove("member-modal-open");
      isClosing = false;
      if (lastMemberTrigger?.isConnected) lastMemberTrigger.focus();
    }
  });
}

document.querySelectorAll(".member-card[data-member]").forEach((card) => {
  card.addEventListener("click", (event) => {
    event.preventDefault();
    openContribution(card.dataset.member, card);
  });
  card.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      openContribution(card.dataset.member, card);
    }
  });
});

closeModal?.addEventListener("click", closeContribution);
fallbackBackdrop.addEventListener("click", closeContribution);
memberDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeContribution();
});
memberDialog?.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && memberDialog.classList.contains("is-fallback")) {
    event.preventDefault();
    closeContribution();
  }
});
memberDialog?.addEventListener("click", (event) => {
  if (event.target === memberDialog) closeContribution();
});
memberDialog?.addEventListener("close", () => {
  isClosing = false;
  activeDialogMotion?.cancel();
  activeDialogMotion = null;
  memberDialog.classList.remove("is-closing", "is-fallback");
  memberDialog.removeAttribute("role");
  memberDialog.removeAttribute("aria-modal");
  memberDialog.style.removeProperty("--modal-origin");
  fallbackBackdrop.classList.remove("is-visible", "is-closing");
  document.body.classList.remove("member-modal-open");
  if (lastMemberTrigger?.isConnected) lastMemberTrigger.focus();
});
})();
