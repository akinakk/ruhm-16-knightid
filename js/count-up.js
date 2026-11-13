(() => {
  if (customElements.get("count-up")) return;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const cubic = (time, first, second) => 3 * (1 - time) ** 2 * time * first + 3 * (1 - time) * time ** 2 * second + time ** 3;
  const cubicDerivative = (time, first, second) =>
    3 * (1 - time) ** 2 * first + 6 * (1 - time) * time * (second - first) + 3 * time ** 2 * (1 - second);

  function easeOut(progress) {
    let lower = 0;
    let upper = 1;
    let time = progress;
    for (let index = 0; index < 8; index += 1) {
      const error = cubic(time, 0.33, 0.68) - progress;
      if (Math.abs(error) < 0.0001) break;
      if (error < 0) lower = time;
      else upper = time;
      const derivative = cubicDerivative(time, 0.33, 0.68);
      const next = derivative > 0 ? time - error / derivative : Number.NaN;
      time = next > lower && next < upper ? next : (lower + upper) / 2;
    }
    return cubic(time, 1, 1);
  }

  function formatValue(value, format, decimals) {
    if (format === "duration") {
      const total = Math.max(0, Math.round(value));
      const hours = Math.floor(total / 60);
      const minutes = total % 60;
      if (hours && minutes) return `${hours} h ${minutes} min`;
      if (hours) return `${hours} h`;
      return `${minutes} min`;
    }
    if (format === "decimal") {
      const places = Number.isFinite(decimals) ? decimals : 1;
      return Number(value).toFixed(places).replace(".", ",");
    }
    return String(Math.max(0, Math.round(value)));
  }

  class CountUp extends HTMLElement {
    static get observedAttributes() {
      return ["value", "from", "format", "decimals", "prefix", "suffix", "duration"];
    }

    constructor() {
      super();
      this._current = 0;
      this._target = 0;
      this._frame = 0;
      this._visible = false;
      this._hasAnimated = false;
      this._initialized = false;
    }

    connectedCallback() {
      if (!this._initialized) {
        this._visual = document.createElement("span");
        this._visual.className = "count-up__visual";
        this._visual.setAttribute("aria-hidden", "true");
        this._accessible = document.createElement("span");
        this._accessible.className = "count-up__sr";
        this.append(this._visual, this._accessible);
        const initial = Number(this.getAttribute("from"));
        this._current = Number.isFinite(initial) ? initial : 0;
        this._target = this._readTarget();
        this._render();
        this._initialized = true;
      }

      if ("IntersectionObserver" in window) {
        this._observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          if (this._visible) return;
          this._visible = true;
          this._animateTo(this._target);
        }, { threshold: 0.12 });
        this._observer.observe(this);
      } else {
        this._visible = true;
        this._animateTo(this._target);
      }
    }

    disconnectedCallback() {
      this._observer?.disconnect();
      this._observer = null;
      cancelAnimationFrame(this._frame);
      this._frame = 0;
    }

    attributeChangedCallback(name, previous, next) {
      if (previous === next || !this._initialized) return;
      if (name === "value") {
        this._target = this._readTarget();
        this._accessible.textContent = this._format(this._target);
        if (this._visible) this._animateTo(this._target);
        else if (this._hasAnimated) {
          this._current = this._target;
          this._render();
        }
        return;
      }
      if (name === "from") {
        const initial = Number(next);
        if (Number.isFinite(initial) && !this._hasAnimated) this._current = initial;
        this._render();
        return;
      }
      if (name === "duration" && this._frame) {
        this._animateTo(this._target);
        return;
      }
      this._render();
    }

    get value() {
      return this._target;
    }

    get presentationValue() {
      return this._current;
    }

    set value(value) {
      const numeric = Number(value);
      this.setAttribute("value", String(Number.isFinite(numeric) ? numeric : 0));
    }

    get format() {
      return this.getAttribute("format") || "integer";
    }

    set format(value) {
      this.setAttribute("format", value);
    }

    _readTarget() {
      const numeric = Number(this.getAttribute("value"));
      return Number.isFinite(numeric) ? numeric : 0;
    }

    _format(value) {
      const decimals = Number(this.getAttribute("decimals"));
      const text = formatValue(value, this.format, Number.isFinite(decimals) ? decimals : undefined);
      return `${this.getAttribute("prefix") || ""}${text}${this.getAttribute("suffix") || ""}`;
    }

    _render() {
      if (!this._visual || !this._accessible) return;
      this._visual.textContent = this._format(this._current);
      this._accessible.textContent = this._format(this._target);
    }

    _animateTo(target) {
      cancelAnimationFrame(this._frame);
      this._frame = 0;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const from = this._current;
      const durationAttribute = this.getAttribute("duration");
      const requestedDuration = durationAttribute === null ? 620 : Number(durationAttribute);
      const duration = Number.isFinite(requestedDuration) ? Math.max(0, requestedDuration) : 620;
      if (reduceMotion || from === target || duration === 0) {
        this._current = target;
        this._hasAnimated = true;
        this._render();
        return;
      }

      let startedAt;
      const tick = (time) => {
        if (startedAt === undefined) startedAt = time;
        const progress = clamp01((time - startedAt) / duration);
        this._current = from + (target - from) * easeOut(progress);
        this._visual.textContent = this._format(this._current);
        if (progress < 1) {
          this._frame = requestAnimationFrame(tick);
          return;
        }
        this._frame = 0;
        this._current = target;
        this._hasAnimated = true;
        this._render();
      };
      this._frame = requestAnimationFrame(tick);
    }
  }

  customElements.define("count-up", CountUp);
})();
