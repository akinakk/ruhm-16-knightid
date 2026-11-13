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
  const dayContent = document.getElementById("planner-day-content");
  const contentGrid = document.getElementById("planner-content-grid");
  const coursesToggle = document.getElementById("planner-courses-toggle");
  const coursesPanel = document.getElementById("planner-courses");
  const coursesRoot = document.getElementById("planner-course-list");
  const selectedCount = document.getElementById("planner-selected-count");
  const filterButtons = [...board.querySelectorAll("[data-course-filter]")];
  const eventCountValue = document.createElement("count-up");
  eventCountValue.format = "integer";
  const eventCountLabel = document.createElement("span");
  eventsCount.replaceChildren(eventCountValue, eventCountLabel);
  const selectedCountValue = document.createElement("count-up");
  selectedCountValue.format = "integer";
  selectedCountValue.setAttribute("suffix", `/${courseList.length}`);
  selectedCount.replaceChildren(selectedCountValue);
  let activeDay = 1;
  let activeFilter = "all";
  let timelineItemAnimations = [];
  let lastRenderedDayKey;
  const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  function cancelTimelineMotion() {
    timelineItemAnimations.forEach((animation) => animation.cancel());
    timelineItemAnimations = [];
  }

  function animateTimeline(shouldAnimate) {
    if (!shouldAnimate || motionPreference?.matches) return;
    const items = [...eventsRoot.children].filter((item) => !item.classList.contains("planner-events-exit-layer"));
    items.forEach((item, index) => {
      const key = item.dataset.eventKey || item.dataset.gapKey || item.dataset.timelineKey;
      const oldRect = key ? item._plannerOldRect : undefined;
      const rect = item.getBoundingClientRect();
      const transform = oldRect
        ? `translate(${(oldRect.left - rect.left).toFixed(1)}px, ${(oldRect.top - rect.top).toFixed(1)}px)`
        : "translateY(7px) scale(.99)";
      const animation = item.animate(
        [
          { opacity: 0, transform },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: oldRect ? 270 : 230,
          delay: Math.min(index * 24, 72),
          easing: "cubic-bezier(.23, 1, .32, 1)",
        },
      );
      delete item._plannerOldRect;
      timelineItemAnimations.push(animation);
      animation.finished.catch(() => {}).then(() => {
        timelineItemAnimations = timelineItemAnimations.filter((itemAnimation) => itemAnimation !== animation);
      });
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

  function makeOverview(events) {
    const teachingMinutes = events.reduce((sum, event) => sum + minutes(event.end) - minutes(event.start), 0);
    let freeMinutes = 0;
    for (let index = 1; index < events.length; index += 1) {
      freeMinutes += Math.max(0, minutes(events[index].start) - minutes(events[index - 1].end));
    }
    const stats = [
      { value: events.length, format: "integer", label: events.length === 1 ? "tund" : "tundi", accent: "violet" },
      { value: teachingMinutes, format: "duration", label: "õppetööd", accent: "blue" },
      { value: freeMinutes, format: "duration", label: "vaba aeg tundide vahel", accent: "neutral" },
    ];
    stats.forEach((stat, index) => {
      let item = overview.children[index];
      if (!item) {
        item = document.createElement("div");
        item.className = `planner-stat planner-stat-${stat.accent}`;
        const value = document.createElement("b");
        const counter = document.createElement("count-up");
        const label = document.createElement("span");
        label.className = "planner-stat-label";
        value.append(counter);
        item.append(value, label);
        overview.append(item);
      }
      const counter = item.querySelector("count-up");
      counter.format = stat.format;
      counter.value = stat.value;
      item.querySelector(".planner-stat-label").textContent = stat.label;
    });
  }

  function makeGap(previousEvent, event, fromMinutes = 0) {
    const gapMinutes = Math.max(0, minutes(event.start) - minutes(previousEvent.end));
    const gap = document.createElement("div");
    gap.className = "planner-gap";
    gap.dataset.gapKey = `${previousEvent.code}-${previousEvent.start}__${event.code}-${event.start}`;
    gap.setAttribute("aria-label", `${durationLabel(gapMinutes)} vaba aega`);
    const line = document.createElement("span");
    line.className = "planner-gap-line";
    const label = document.createElement("span");
    label.className = "planner-gap-label";
    const counter = document.createElement("count-up");
    counter.format = "duration";
    counter.setAttribute("from", String(Math.max(0, fromMinutes)));
    counter.value = gapMinutes;
    label.append(counter, document.createTextNode(" vaba aeg"));
    gap.append(line, label);
    return gap;
  }

  function makeEvent(event) {
    const article = document.createElement("article");
    article.className = "planner-event";
    article.dataset.eventKey = `${event.code}-${event.start}`;
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
    header.append(code);
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
    const visibleEvents = day.events.filter((event) => selected[event.code]);
    const currentEventKeys = [...eventsRoot.children]
      .filter((item) => item.classList.contains("planner-event"))
      .map((item) => item.dataset.eventKey);
    const nextEventKeys = visibleEvents.map((event) => `${event.code}-${event.start}`);
    if (lastRenderedDayKey === day.key && currentEventKeys.length === nextEventKeys.length
      && currentEventKeys.every((key, index) => key === nextEventKeys[index])) {
      updateEventsCount(day, visibleEvents.length);
      return visibleEvents;
    }

    const directChildren = [...eventsRoot.children].filter((item) => !item.classList.contains("planner-events-exit-layer"));
    const previousPositions = new Map();
    const previousGaps = new Map();
    const remember = (item, parentOpacity = 1, track = true) => {
      const rect = item.getBoundingClientRect();
      if (!track) return;
      if (item.dataset.eventKey) previousPositions.set(item.dataset.eventKey, rect);
      if (item.dataset.gapKey) {
        const count = item.querySelector("count-up");
        previousPositions.set(item.dataset.gapKey, rect);
        previousGaps.set(item.dataset.gapKey, count?.presentationValue ?? count?.value ?? 0);
      }
      if (item.dataset.timelineKey) previousPositions.set(item.dataset.timelineKey, rect);
    };
    directChildren.forEach((item) => remember(item));
    cancelTimelineMotion();

    eventsRoot.replaceChildren();
    if (!visibleEvents.length) {
      const empty = document.createElement("div");
      empty.className = "planner-empty";
      empty.dataset.timelineKey = "empty";
      empty.textContent = day.events.length
        ? "Selle päeva õppeained on valikust eemaldatud."
        : "Sellel päeval pole kalendris tunde. Võta aega endale.";
      eventsRoot.append(empty);
    } else {
      visibleEvents.forEach((event, index) => {
        if (index > 0) {
          const previousEvent = visibleEvents[index - 1];
          const gapKey = `${previousEvent.code}-${previousEvent.start}__${event.code}-${event.start}`;
          eventsRoot.append(makeGap(previousEvent, event, previousGaps.get(gapKey) || 0));
        }
        const article = makeEvent(event);
        article._plannerOldRect = previousPositions.get(article.dataset.eventKey);
        eventsRoot.append(article);
      });
    }
    if (!visibleEvents.length) {
      const empty = eventsRoot.querySelector(".planner-empty");
      empty._plannerOldRect = previousPositions.get("empty");
    }
    [...eventsRoot.querySelectorAll(".planner-gap")].forEach((gap) => {
      gap._plannerOldRect = previousPositions.get(gap.dataset.gapKey);
    });
    updateEventsCount(day, visibleEvents.length);
    lastRenderedDayKey = day.key;

    animateTimeline(shouldAnimate);
    return visibleEvents;
  }

  function updateEventsCount(day, eventTotal) {
    if (!day.events.length) {
      eventCountValue.hidden = true;
      eventCountLabel.textContent = "VABA PÄEV";
      eventsCount.setAttribute("aria-label", "Vaba päev");
      return;
    }
    eventCountValue.hidden = false;
    eventCountValue.value = eventTotal;
    eventCountLabel.textContent = eventTotal === 1 ? " TUND" : " TUNDI";
    eventsCount.setAttribute("aria-label", `${eventTotal} ${eventTotal === 1 ? "tund" : "tundi"}`);
  }

  function updateSelectedCount() {
    const selectedTotal = courseList.filter((course) => selected[course.code]).length;
    selectedCountValue.value = selectedTotal;
  }

  function renderCourses() {
    const visibleCourses = courseList.filter((course) => {
      if (activeFilter === "selected") return selected[course.code];
      if (activeFilter === "unselected") return !selected[course.code];
      return true;
    });
    updateSelectedCount();
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
        updateSelectedCount();
        const shouldAnimateTimeline = !springCheck.classList.contains("is-keyboard-change");
        const visibleEvents = renderEvents(days[activeDay], shouldAnimateTimeline);
        makeOverview(visibleEvents);

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
    if (dayContent) {
      dayContent.dataset.dayKey = day.key;
      dayContent.classList.remove("is-changing");
      if (shouldAnimate && dayChanged && !motionPreference?.matches) {
        requestAnimationFrame(() => dayContent.classList.add("is-changing"));
      }
    }
    const visibleEvents = renderEvents(day, shouldAnimate && dayChanged);
    makeOverview(visibleEvents);
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
