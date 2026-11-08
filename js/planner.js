(() => {
  const days = [
    {
      key: "2026-11-09", short: "E", weekday: "Esmaspäev", date: "9. november",
      events: [
        { code: "ICY0004", title: "IT eetilised, sotsiaalsed ja professionaalsed aspektid", start: "10:00", end: "13:30", room: "ICO-314" },
        { code: "YMA0090", title: "Matemaatika täiendusõpe", start: "16:00", end: "17:55", room: "U04-103" },
      ],
    },
    {
      key: "2026-11-10", short: "T", weekday: "Teisipäev", date: "10. november",
      events: [
        { code: "MLI0007", title: "Inglise keel IT spetsialistidele", start: "08:15", end: "11:30", room: "ICO-217" },
        { code: "ITI0102", title: "Programmeerimise algkursus", start: "12:00", end: "13:30", room: "U06A-201 · ICT-121 · ICT-122" },
        { code: "ICY0010", title: "Keskkonnamõju ja säästev areng", start: "14:00", end: "15:30", room: "ICO-314" },
        { code: "ICY0019", title: "Majandusõpetus", start: "16:00", end: "17:30", room: "ICO-314" },
      ],
    },
    {
      key: "2026-11-11", short: "K", weekday: "Kolmapäev", date: "11. november",
      events: [
        { code: "IAX0010", title: "Diskreetne matemaatika", start: "12:00", end: "13:30", room: "U06A-201 · U06A-229" },
        { code: "ICY0019", title: "Majandusõpetus", start: "14:15", end: "15:45", room: "ICO-221 · ICO-314" },
      ],
    },
    {
      key: "2026-11-12", short: "N", weekday: "Neljapäev", date: "12. november",
      events: [
        { code: "IAX0010", title: "Diskreetne matemaatika", start: "08:00", end: "09:30", room: "NRG-131" },
        { code: "ITI0102", title: "Programmeerimise algkursus", start: "10:00", end: "11:30", room: "ICT-121 · ICT-122" },
        { code: "ITI0101", title: "Sissejuhatus infotehnoloogiasse", start: "12:00", end: "15:15", room: "U06A-229" },
      ],
    },
    {
      key: "2026-11-13", short: "R", weekday: "Reede", date: "13. november",
      events: [
        { code: "ITI0112", title: "Programmeerimise täienduskursus", start: "08:00", end: "09:30", room: "ICT-121 · ICT-122" },
        { code: "ICY0010", title: "Keskkonnamõju ja säästev areng", start: "12:00", end: "13:30", room: "ICO-314" },
        { code: "YFR0080", title: "Füüsika täiendusõpe", start: "14:00", end: "15:55", room: "U02-102" },
      ],
    },
  ];

  const colors = ["#ae96ff", "#70b9d0", "#e2ae70", "#83c8a4", "#db8ca8"];
  const courses = new Map();
  days.forEach((day) => day.events.forEach((event) => {
    if (!courses.has(event.code)) courses.set(event.code, { code: event.code, title: event.title });
  }));
  const courseList = [...courses.values()];
  // The ICS file supplies scheduled events, not ÕIS registration status. Start
  // with every calendar course visible; the toggles are a local view prototype.
  const selected = Object.fromEntries(courseList.map((course) => [course.code, true]));
  const board = document.getElementById("planner-demo");
  if (!board) return;

  const dayButtons = document.getElementById("planner-days");
  const dayIndicator = document.getElementById("planner-day-indicator");
  const dateTitle = document.getElementById("planner-date-title");
  const overview = document.getElementById("planner-overview");
  const eventsRoot = document.getElementById("planner-events");
  const eventsCount = document.getElementById("planner-events-count");
  const contentGrid = document.getElementById("planner-content-grid");
  const coursesToggle = document.getElementById("planner-courses-toggle");
  const coursesPanel = document.getElementById("planner-courses");
  const coursesRoot = document.getElementById("planner-course-list");
  const selectedCount = document.getElementById("planner-selected-count");
  const filterButtons = [...board.querySelectorAll("[data-course-filter]")];
  let activeDay = 1;
  let activeFilter = "all";
  let timelineSizeAnimation;
  const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  function animateTimeline(shouldAnimate) {
    if (!shouldAnimate || motionPreference?.matches) return;
    const items = [...eventsRoot.querySelectorAll(".planner-event")];
    items.forEach((item, index) => {
      item.animate(
        [
          { opacity: 0, transform: "translateY(7px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 360,
          delay: index * 38,
          easing: "cubic-bezier(.16, 1, .3, 1)",
        },
      );
    });
  }

  function minutes(time) {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  }

  function durationLabel(value) {
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (hours && mins) return `${hours} h ${mins} min`;
    if (hours) return `${hours} h`;
    return `${mins} min`;
  }

  function moveDayIndicator(index, shouldAnimate = false) {
    const button = dayButtons.querySelector(`[data-day-index="${index}"]`);
    if (!button || !dayIndicator) return;
    dayIndicator.style.transitionDuration = shouldAnimate && !motionPreference?.matches ? "" : "0ms";
    dayIndicator.style.width = `${button.offsetWidth}px`;
    dayIndicator.style.transform = `translateX(${button.offsetLeft}px)`;
    if (!shouldAnimate) {
      dayIndicator.getBoundingClientRect();
      requestAnimationFrame(() => dayIndicator.style.removeProperty("transition-duration"));
    }
  }

  function setCoursesOpen(open) {
    coursesToggle.setAttribute("aria-expanded", String(open));
    coursesPanel.setAttribute("aria-hidden", String(!open));
    coursesPanel.inert = !open;

    const canAnimate = !motionPreference?.matches && !board.classList.contains("is-keyboard-change");
    if (!canAnimate) {
      contentGrid.dataset.coursesOpen = String(open);
      coursesPanel.style.removeProperty("height");
      coursesPanel.style.overflow = open ? "visible" : "hidden";
      return;
    }

    const currentHeight = coursesPanel.getBoundingClientRect().height;
    coursesPanel.style.transition = "none";
    coursesPanel.style.height = `${currentHeight}px`;
    coursesPanel.style.overflow = "hidden";
    coursesPanel.getBoundingClientRect();

    if (open) {
      contentGrid.dataset.coursesOpen = "true";
      coursesPanel.style.height = "auto";
      const expandedHeight = coursesPanel.getBoundingClientRect().height;
      coursesPanel.style.height = `${currentHeight}px`;
      coursesPanel.getBoundingClientRect();
      coursesPanel.style.removeProperty("transition");
      requestAnimationFrame(() => {
        if (coursesToggle.getAttribute("aria-expanded") === "true") {
          coursesPanel.style.height = `${expandedHeight}px`;
        }
      });
      return;
    }

    contentGrid.dataset.coursesOpen = "false";
    coursesPanel.style.removeProperty("transition");
    requestAnimationFrame(() => {
      if (coursesToggle.getAttribute("aria-expanded") === "false") coursesPanel.style.height = "0px";
    });
  }

  coursesPanel.addEventListener("transitionend", (event) => {
    if (event.target !== coursesPanel || event.propertyName !== "height") return;
    if (coursesToggle.getAttribute("aria-expanded") === "true") {
      coursesPanel.style.height = "auto";
      coursesPanel.style.overflow = "visible";
    } else {
      coursesPanel.style.removeProperty("height");
      coursesPanel.style.overflow = "hidden";
    }
  });

  function makeDayButtons() {
    days.forEach((day, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "planner-day-button";
      button.dataset.dayIndex = String(index);
      button.setAttribute("aria-pressed", String(index === activeDay));
      button.setAttribute("aria-label", `${day.weekday}, ${day.date}`);
      const weekday = document.createElement("span");
      weekday.className = "planner-day-name";
      weekday.textContent = day.weekday;
      const date = document.createElement("b");
      date.className = "planner-day-date";
      date.textContent = day.date.split(" ")[0];
      button.append(weekday, date);
      button.addEventListener("click", (event) => selectDay(index, event.detail > 0));
      dayButtons.append(button);
    });
  }

  function makeOverview(day) {
    const teachingMinutes = day.events.reduce((sum, event) => sum + minutes(event.end) - minutes(event.start), 0);
    let freeMinutes = 0;
    for (let index = 1; index < day.events.length; index += 1) {
      freeMinutes += Math.max(0, minutes(day.events[index].start) - minutes(day.events[index - 1].end));
    }
    const stats = [
      { value: String(day.events.length), label: day.events.length === 1 ? "tund" : "tundi", accent: "violet" },
      { value: durationLabel(teachingMinutes), label: "õppetööd", accent: "blue" },
      { value: durationLabel(freeMinutes), label: "vaba aeg tundide vahel", accent: "neutral" },
    ];
    overview.replaceChildren();
    stats.forEach((stat) => {
      const item = document.createElement("div");
      item.className = `planner-stat planner-stat-${stat.accent}`;
      const value = document.createElement("b");
      value.textContent = stat.value;
      const label = document.createElement("span");
      label.textContent = stat.label;
      item.append(value, label);
      overview.append(item);
    });
  }

  function makeGap(previousEvent, event) {
    const gap = document.createElement("div");
    gap.className = "planner-gap";
    gap.setAttribute("aria-label", `${durationLabel(minutes(event.start) - minutes(previousEvent.end))} vaba aega`);
    const line = document.createElement("span");
    line.className = "planner-gap-line";
    const label = document.createElement("span");
    label.className = "planner-gap-label";
    label.textContent = `${durationLabel(minutes(event.start) - minutes(previousEvent.end))} vaba aeg`;
    gap.append(line, label);
    return gap;
  }

  function makeEvent(event) {
    const isSelected = selected[event.code];
    const article = document.createElement("article");
    article.className = `planner-event${isSelected ? "" : " is-unselected"}`;
    article.dataset.courseCode = event.code;
    article.style.setProperty("--course-accent", colors[courseList.findIndex((course) => course.code === event.code) % colors.length]);

    const time = document.createElement("div");
    time.className = "planner-event-time";
    const start = document.createElement("b");
    start.textContent = event.start;
    const end = document.createElement("span");
    end.textContent = event.end;
    time.append(start, end);

    const rail = document.createElement("span");
    rail.className = "planner-event-rail";
    rail.setAttribute("aria-hidden", "true");

    const card = document.createElement("div");
    card.className = "planner-event-card";
    const header = document.createElement("div");
    header.className = "planner-event-header";
    const code = document.createElement("span");
    code.className = "planner-course-code";
    code.textContent = event.code;
    const status = document.createElement("span");
    status.className = `planner-event-status${isSelected ? " is-status-hidden" : ""}`;
    status.textContent = "VÄLJAS";
    status.setAttribute("aria-hidden", String(isSelected));
    header.append(code, status);
    const title = document.createElement("h5");
    title.textContent = event.title;
    const room = document.createElement("p");
    room.className = "planner-room";
    const pin = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pin.setAttribute("viewBox", "0 0 24 24");
    pin.setAttribute("aria-hidden", "true");
    const pinPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pinPath.setAttribute("d", "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z");
    const pinDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pinDot.setAttribute("cx", "12");
    pinDot.setAttribute("cy", "10");
    pinDot.setAttribute("r", "2.5");
    pin.append(pinPath, pinDot);
    const roomName = document.createElement("span");
    roomName.textContent = event.room;
    room.append(pin, roomName);
    card.append(header, title, room);
    article.append(time, rail, card);
    return article;
  }

  function renderEvents(day, shouldAnimate = false) {
    const previousHeight = eventsRoot.getBoundingClientRect().height;
    timelineSizeAnimation?.cancel();
    timelineSizeAnimation = null;
    eventsRoot.replaceChildren();
    if (!day.events.length) {
      const empty = document.createElement("div");
      empty.className = "planner-empty";
      empty.textContent = "Sellel päeval pole kalendris tunde. Võta aega endale.";
      eventsRoot.append(empty);
      eventsCount.textContent = "VABA PÄEV";
    } else {
      day.events.forEach((event, index) => {
        if (index > 0) eventsRoot.append(makeGap(day.events[index - 1], event));
        eventsRoot.append(makeEvent(event));
      });
      eventsCount.textContent = `${day.events.length} ${day.events.length === 1 ? "TUND" : "TUNDI"}`;
    }

    if (shouldAnimate && !motionPreference?.matches) {
      const nextHeight = eventsRoot.scrollHeight;
      timelineSizeAnimation = eventsRoot.animate(
        [{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }],
        { duration: 380, easing: "cubic-bezier(.22, 1, .36, 1)" },
      );
    }
    animateTimeline(shouldAnimate);
  }

  function renderCourses() {
    const visibleCourses = courseList.filter((course) => {
      if (activeFilter === "selected") return selected[course.code];
      if (activeFilter === "unselected") return !selected[course.code];
      return true;
    });
    const selectedTotal = courseList.filter((course) => selected[course.code]).length;
    selectedCount.textContent = `${selectedTotal}/${courseList.length}`;
    coursesRoot.replaceChildren();

    if (!visibleCourses.length) {
      const empty = document.createElement("p");
      empty.className = "planner-course-empty";
      empty.textContent = activeFilter === "unselected" ? "Kõik näidise ained on valitud." : "Valitud aineid pole.";
      coursesRoot.append(empty);
      return;
    }

    visibleCourses.forEach((course) => {
      const label = document.createElement("label");
      label.className = `planner-course-option${selected[course.code] ? " is-selected" : ""}`;
      const springCheck = document.createElement("spring-check");
      springCheck.className = "planner-spring-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected[course.code];
      checkbox.dataset.courseCode = course.code;
      checkbox.setAttribute("aria-label", `${course.title}: ${selected[course.code] ? "valitud" : "pole valitud"}`);
      springCheck.append(checkbox);
      const copy = document.createElement("span");
      copy.className = "planner-course-copy";
      const code = document.createElement("b");
      code.textContent = course.code;
      const title = document.createElement("span");
      title.textContent = course.title;
      copy.append(code, title);
      const state = document.createElement("span");
      state.className = "planner-course-state";
      state.textContent = selected[course.code] ? "Valitud" : "Pole valitud";
      label.append(springCheck, copy, state);
      coursesRoot.append(label);
      checkbox.addEventListener("change", () => {
        selected[course.code] = checkbox.checked;
        label.classList.toggle("is-selected", checkbox.checked);
        checkbox.setAttribute("aria-label", `${course.title}: ${checkbox.checked ? "valitud" : "pole valitud"}`);
        state.textContent = checkbox.checked ? "Valitud" : "Pole valitud";
        const totalSelected = courseList.filter((item) => selected[item.code]).length;
        selectedCount.textContent = `${totalSelected}/${courseList.length}`;
        eventsRoot.querySelectorAll(`[data-course-code="${course.code}"]`).forEach((eventItem) => {
          eventItem.classList.toggle("is-unselected", !checkbox.checked);
          const status = eventItem.querySelector(".planner-event-status");
          if (status) {
            status.classList.toggle("is-status-hidden", checkbox.checked);
            status.setAttribute("aria-hidden", String(checkbox.checked));
          }
        });

        const filterRemovesCourse = (activeFilter === "selected" && !checkbox.checked)
          || (activeFilter === "unselected" && checkbox.checked);
        if (filterRemovesCourse) {
          const nextInput = label.nextElementSibling?.querySelector('input[type="checkbox"]');
          const previousInput = label.previousElementSibling?.querySelector('input[type="checkbox"]');
          (nextInput || previousInput || filterButtons.find((button) => button.dataset.courseFilter === activeFilter))?.focus();
          checkbox.disabled = true;
          if (!motionPreference?.matches && !springCheck.classList.contains("is-keyboard-change")) {
            label.classList.add("is-filter-exiting");
            window.setTimeout(() => label.remove(), 180);
          } else {
            label.remove();
          }
        }
      });
    });
  }

  function selectDay(index, shouldAnimate = false) {
    const dayChanged = index !== activeDay;
    activeDay = index;
    const day = days[activeDay];
    [...dayButtons.querySelectorAll(".planner-day-button")].forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === activeDay));
    });
    moveDayIndicator(activeDay, shouldAnimate && dayChanged);
    dateTitle.textContent = `${day.weekday}, ${day.date}`;
    renderEvents(day, shouldAnimate && dayChanged);
    makeOverview(day);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.courseFilter;
      filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      renderCourses();
    });
  });

  coursesToggle.addEventListener("click", () => {
    setCoursesOpen(coursesToggle.getAttribute("aria-expanded") !== "true");
  });

  board.addEventListener("keydown", (event) => {
    const isDayArrow = event.target.matches(".planner-day-button") && ["ArrowLeft", "ArrowRight"].includes(event.key);
    const isButtonActivation = event.target.matches(".planner-day-button, [data-course-filter], .planner-courses-toggle") && ["Enter", " "].includes(event.key);
    if (!isDayArrow && !isButtonActivation) return;
    board.classList.add("is-keyboard-change");
    if (!isDayArrow) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (activeDay + direction + days.length) % days.length;
    selectDay(next, false);
    dayButtons.querySelector(`[data-day-index="${next}"]`)?.focus();
  });

  board.addEventListener("pointerdown", () => board.classList.remove("is-keyboard-change"), { capture: true });
  window.addEventListener("resize", () => moveDayIndicator(activeDay), { passive: true });
  document.fonts?.ready.then(() => moveDayIndicator(activeDay));

  makeDayButtons();
  selectDay(activeDay);
  renderCourses();
})();
