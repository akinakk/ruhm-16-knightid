(() => {
  if (!("customElements" in window) || customElements.get("plasma-wave")) return;

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv - 0.5;
      p.x *= u_resolution.x / u_resolution.y;

      float t = u_time * 0.12;
      float bendA = sin(p.y * 5.4 + t) * 0.14 + cos(p.x * 3.2 - t * 0.7) * 0.08;
      float bendB = cos(p.x * 4.1 + t * 0.8) * 0.13 + sin(p.y * 3.6 - t * 0.6) * 0.09;
      float waveA = sin((p.x * 0.78 + p.y * 1.02 + bendA) * 8.2 - t * 1.5);
      float waveB = sin((p.x * -0.86 + p.y * 0.68 + bendB) * 7.3 + t * 1.15);
      float interference = sin(waveA * 1.65 + waveB * 1.48 + sin((p.x + p.y) * 2.5 + t) * 0.4);

      float ridge = 1.0 - smoothstep(0.04, 0.34, abs(interference));
      float haze = exp(-abs(interference) * 3.5);
      float vignette = 1.0 - smoothstep(0.34, 0.91, length(p * vec2(0.78, 0.82)));
      float hue = 0.5 + 0.5 * sin(waveA * 0.65 - waveB * 0.55 + t * 0.45);
      vec3 color = mix(vec3(0.42, 0.30, 0.82), vec3(0.16, 0.63, 0.75), hue);
      color += vec3(0.18, 0.13, 0.31) * haze;
      color += vec3(0.48, 0.42, 0.72) * pow(ridge, 2.2);

      float alpha = (0.055 + ridge * 0.19 + haze * 0.075) * vignette;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  class PlasmaWave extends HTMLElement {
    connectedCallback() {
      if (!this.canvas) {
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("aria-hidden", "true");
        this.append(this.canvas);
      }
      if (this.resizeObserver) return;

      this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.inView = true;
      this.frame = 0;
      this.startedAt = 0;
      this.gl = this.gl || this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
        premultipliedAlpha: false,
      });

      if (!this.gl || (!this.program && !this.initializeProgram())) {
        this.classList.add("is-fallback");
        return;
      }

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this);
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        this.updatePlayback();
      }, { rootMargin: "120px" });
      this.intersectionObserver.observe(this);

      this.onVisibilityChange = () => this.updatePlayback();
      this.onMotionChange = () => this.updatePlayback();
      document.addEventListener("visibilitychange", this.onVisibilityChange);
      this.motionQuery.addEventListener?.("change", this.onMotionChange);

      this.canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        this.stop();
      });
      this.canvas.addEventListener("webglcontextrestored", () => {
        this.gl = this.canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
        if (this.gl && this.initializeProgram()) {
          this.resize();
          this.updatePlayback();
        } else {
          this.classList.add("is-fallback");
        }
      });

      this.resize();
      this.updatePlayback();
    }

    disconnectedCallback() {
      this.stop();
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
      this.resizeObserver = null;
      this.intersectionObserver = null;
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.motionQuery?.removeEventListener?.("change", this.onMotionChange);
    }

    compileShader(type, source) {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        this.gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    initializeProgram() {
      const vertex = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
      const fragment = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertex || !fragment) return false;

      const program = this.gl.createProgram();
      this.gl.attachShader(program, vertex);
      this.gl.attachShader(program, fragment);
      this.gl.linkProgram(program);
      this.gl.deleteShader(vertex);
      this.gl.deleteShader(fragment);
      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        this.gl.deleteProgram(program);
        return false;
      }

      this.program = program;
      this.positionLocation = this.gl.getAttribLocation(program, "a_position");
      this.resolutionLocation = this.gl.getUniformLocation(program, "u_resolution");
      this.timeLocation = this.gl.getUniformLocation(program, "u_time");
      this.buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), this.gl.STATIC_DRAW);
      this.gl.useProgram(program);
      this.gl.enableVertexAttribArray(this.positionLocation);
      this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      return true;
    }

    resize() {
      if (!this.gl) return;
      const bounds = this.getBoundingClientRect();
      const mobile = window.innerWidth < 700;
      const maxPixels = mobile ? 480_000 : 850_000;
      const areaScale = Math.sqrt(maxPixels / Math.max(1, bounds.width * bounds.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 0.68 : 0.8, areaScale);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (this.canvas.width === width && this.canvas.height === height) return;
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
      this.gl.useProgram(this.program);
      this.gl.uniform2f(this.resolutionLocation, width, height);
      this.draw(this.motionQuery.matches ? 2.4 : 0);
    }

    draw(time) {
      if (!this.gl || !this.program) return;
      this.gl.useProgram(this.program);
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.uniform1f(this.timeLocation, time);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    updatePlayback() {
      const canAnimate = !this.motionQuery?.matches && this.inView && document.visibilityState === "visible";
      if (!canAnimate) {
        this.stop();
        if (this.motionQuery?.matches) this.draw(2.4);
        return;
      }
      if (this.frame) return;
      this.startedAt = performance.now();
      const tick = (now) => {
        this.draw((now - this.startedAt) / 1000);
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    }

    stop() {
      if (!this.frame) return;
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  customElements.define("plasma-wave", PlasmaWave);
})();
