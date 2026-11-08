(() => {
  if (!("customElements" in window) || customElements.get("spring-check")) return;

  class SpringCheck extends HTMLElement {
    connectedCallback() {
      if (this.input) return;
      this.input = this.querySelector('input[type="checkbox"]');
      if (!this.input) return;
      this.input.classList.add("spring-check-input");
      this.input.style.setProperty("--spring-check-scale", this.input.checked ? "1" : "0");
      this.classList.toggle("is-checked", this.input.checked);
      this.keyboardInitiated = false;
      this.onKeyDown = (event) => {
        if (event.key === " ") {
          this.keyboardInitiated = true;
          this.classList.add("is-keyboard-change");
        }
      };
      this.onKeyUp = (event) => {
        if (event.key !== " ") return;
        window.clearTimeout(this.keyboardReset);
        this.keyboardReset = window.setTimeout(() => { this.keyboardInitiated = false; }, 0);
      };
      this.onPointerDown = () => this.classList.remove("is-keyboard-change");
      this.onChange = () => {
        this.classList.toggle("is-checked", this.input.checked);
        const target = this.input.checked ? 1 : 0;
        if (this.keyboardInitiated) {
          cancelAnimationFrame(this.springFrame);
          this.springFrame = 0;
          this.springVelocity = 0;
          this.input.style.setProperty("--spring-check-scale", String(target));
          return;
        }
        this.classList.remove("is-keyboard-change");
        this.animateFill(target);
      };
      this.input.addEventListener("keydown", this.onKeyDown);
      this.input.addEventListener("keyup", this.onKeyUp);
      this.input.addEventListener("pointerdown", this.onPointerDown);
      this.input.addEventListener("change", this.onChange);
    }

    disconnectedCallback() {
      this.input?.removeEventListener("keydown", this.onKeyDown);
      this.input?.removeEventListener("keyup", this.onKeyUp);
      this.input?.removeEventListener("pointerdown", this.onPointerDown);
      this.input?.removeEventListener("change", this.onChange);
      cancelAnimationFrame(this.springFrame);
      window.clearTimeout(this.keyboardReset);
      this.springVelocity = 0;
      this.input = null;
    }

    animateFill(target) {
      cancelAnimationFrame(this.springFrame);
      const input = this.input;
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      let position = Number(input.style.getPropertyValue("--spring-check-scale")) || 0;
      let velocity = this.springVelocity || 0;
      let previousTime = 0;

      if (reducedMotion) {
        input.style.setProperty("--spring-check-scale", String(target));
        this.springVelocity = 0;
        return;
      }

      const step = (time) => {
        if (!previousTime) previousTime = time;
        const delta = Math.min((time - previousTime) / 1000, 1 / 30);
        previousTime = time;

        // A damped spring gives the fill a small, interruptible overshoot.
        const mass = 1;
        const stiffness = 170;
        const damping = 24;
        const acceleration = ((target - position) * stiffness - velocity * damping) / mass;
        velocity += acceleration * delta;
        position += velocity * delta;
        this.springVelocity = velocity;
        input.style.setProperty("--spring-check-scale", String(Math.max(0, Math.min(1.08, position))));

        if (Math.abs(target - position) < .001 && Math.abs(velocity) < .01) {
          input.style.setProperty("--spring-check-scale", String(target));
          this.springFrame = 0;
          this.springVelocity = 0;
          return;
        }
        this.springFrame = requestAnimationFrame(step);
      };

      this.springFrame = requestAnimationFrame(step);
    }
  }

  customElements.define("spring-check", SpringCheck);
})();
