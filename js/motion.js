const revealItems = [...document.querySelectorAll(".reveal")];

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const proofAside = document.querySelector(".hero-proof");
const proofCard = document.querySelector(".proof-card");
const scoreCounter = document.querySelector("[data-counter]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateScore() {
  if (!scoreCounter || scoreCounter.dataset.animated === "true") return;
  scoreCounter.dataset.animated = "true";
  const target = Number(scoreCounter.dataset.counter);
  if (reduceMotion) {
    scoreCounter.textContent = target.toFixed(2);
    return;
  }

  const duration = 1650;
  let startTime;
  function tick(now) {
    if (startTime === undefined) startTime = now;
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    scoreCounter.textContent = (target * eased).toFixed(2);
    if (progress < 1) requestAnimationFrame(tick);
    else scoreCounter.textContent = target.toFixed(2);
  }
  requestAnimationFrame(tick);
}

if (proofAside && scoreCounter) {
  if ("IntersectionObserver" in window) {
    const scoreObserver = new IntersectionObserver((entries, observer) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        proofAside.classList.add("is-visible");
        animateScore();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    scoreObserver.observe(proofAside);
  } else {
    proofAside.classList.add("is-visible");
    animateScore();
  }
}

if (proofCard && proofAside && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const maxTilt = 4.25;

  proofCard.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const bounds = proofCard.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    pointerY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      proofCard.style.transition = "none";
      proofCard.style.transform = `perspective(1100px) rotateX(${(-pointerY * maxTilt).toFixed(2)}deg) rotateY(${(pointerX * maxTilt).toFixed(2)}deg) translateZ(-6px) scale(.995)`;
      frame = 0;
    });
  });

  proofCard.addEventListener("pointerleave", () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    proofCard.style.transition = "transform 520ms cubic-bezier(.2,.8,.2,1), border-color 250ms, background 250ms";
    proofCard.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)";
  });
}
