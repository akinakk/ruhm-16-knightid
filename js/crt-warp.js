(() => {
  const ROOT = "crt-warp-container";
  const CANVAS = "crt-warp-canvas";
  const MASKS = { none: 0, aperture: 1, shadow: 2, slot: 3 };
  const CELL_ASPECT = 0.56;
  const INTRO_SECONDS = 1.6;
  const FLIP_SECONDS = 0.8;
  const TAU = Math.PI * 2;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const CONTENT = `#version 300 es
precision highp float;
uniform vec2 uGrid;
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uLevels;
uniform float uDecay;
uniform float uReveal;
uniform float uRise;
uniform vec4 uSeed;
uniform sampler2D uPrevious;
out vec4 outColor;

float field(vec2 uv, float t) {
  uv = (uv - 0.5) * uFrequency + 0.5;
  float f = 0.0;
  f += 0.7 * sin(0.5 * uv.x + t / 5.0 + uSeed.x);
  f += 3.0 * sin(1.6 * uv.y + t / 5.0 + uSeed.y);
  f += sin(10.0 * (uv.y * sin(t / 2.0 + uSeed.z) + uv.x * cos(t / 5.0)) + t / 2.0);
  float cx = uv.x + 0.5 * sin(t / 2.0 + uSeed.w);
  float cy = uv.y + 0.5 * cos(t / 4.0 + uSeed.x * 0.7);
  f += 0.4 * sin(sqrt(100.0 * cx * cx + 100.0 * cy * cy + 1.0) + t);
  f += 0.9 * sin(sqrt(75.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  f -= 1.4 * sin(sqrt(256.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  f += 0.3 * sin(0.5 * uv.y + uv.x + sin(t));
  return f;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell + 0.5) / uGrid;
  float s = (0.5 + 0.499 * sin(field(uv, uTime) * uAmplitude)) * mix(1.0 / uLevels, 1.0, uReveal);
  float level = floor(s * uLevels) / max(uLevels - 1.0, 1.0);
  float previous = texelFetch(uPrevious, ivec2(cell), 0).r;
  float lifted = min(level, previous + uRise);
  outColor = vec4(max(lifted, previous * uDecay - 0.004), level, 0.0, 1.0);
}`;

const GLOW = `#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform vec2 uSize;
out vec4 outColor;
void main() {
  float v = texture(uContent, gl_FragCoord.xy / uSize).r;
  outColor = vec4(v * v, 0.0, 0.0, 1.0);
}`;

const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uSize;
uniform vec2 uDirection;
uniform float uSigma;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  float stride = max(uSigma * 0.55, 0.5);
  float total = 0.0;
  float sum = 0.0;
  for (int i = -7; i <= 7; i++) {
    float x = float(i) * stride;
    float w = exp(-0.5 * x * x / (uSigma * uSigma));
    sum += texture(uSource, uv + uDirection * x / uSize).r * w;
    total += w;
  }
  outColor = vec4(sum / total, 0.0, 0.0, 1.0);
}`;

const DISPLAY = `#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform sampler2D uGlow;
uniform vec2 uGrid;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform float uLines;
uniform float uScanline;
uniform float uCurve;
uniform float uCorners;
uniform int uMaskType;
uniform float uMask;
uniform float uBloom;
uniform float uBrightness;
uniform float uNoise;
uniform float uFlicker;
uniform float uInterference;
uniform float uVignette;
uniform float uShift;
uniform float uWarm;
uniform float uFocus;
uniform float uStatic;
uniform float uRoll;
uniform float uTear;
uniform float uGain;
uniform vec4 uMagnet;
uniform float uPurity;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 curve(vec2 uv) {
  if (uCurve <= 0.0) return uv;
  vec2 p = (uv - 0.5) * 2.0;
  float corner = uCurve / sqrt(max(uCurve * uCurve - 2.0, 0.001));
  p = uCurve * p / sqrt(max(uCurve * uCurve - dot(p, p), 0.001));
  p /= corner;
  return p * 0.5 + 0.5;
}

float lineValue(float x, float y) {
  if (x < 0.0 || x > 1.0 || y < 0.0 || y > 1.0) return 0.0;
  float cx = x * uGrid.x - 0.5;
  float c0 = floor(cx);
  int row = int(clamp(floor(y * uGrid.y), 0.0, uGrid.y - 1.0));
  float a = texelFetch(uContent, ivec2(int(clamp(c0, 0.0, uGrid.x - 1.0)), row), 0).r;
  float b = texelFetch(uContent, ivec2(int(clamp(c0 + 1.0, 0.0, uGrid.x - 1.0)), row), 0).r;
  float soft = mix(0.5, 0.14, uFocus);
  return pow(mix(a, b, smoothstep(0.5 - soft, 0.5 + soft, cx - c0)), 1.25);
}

float beam(vec2 uv) {
  float ly = uv.y * uLines - 0.5;
  float r0 = floor(ly);
  float f = ly - r0;
  float a = lineValue(uv.x, (r0 + 0.5) / uLines);
  float b = lineValue(uv.x, (r0 + 1.5) / uLines);
  float nearest = f < 0.5 ? a : b;
  float sa = mix(0.16, 0.34, sqrt(a));
  float sb = mix(0.16, 0.34, sqrt(b));
  float lit = a * exp(-0.5 * f * f / (sa * sa)) + b * exp(-0.5 * (1.0 - f) * (1.0 - f) / (sb * sb));
  return mix(nearest, lit * 1.18, uScanline * mix(0.3, 1.0, uFocus));
}

vec3 maskAt(vec2 px) {
  if (uMaskType == 0 || uMask <= 0.0) return vec3(1.0);
  float size = max(1.0, floor(uPixel + 0.5));
  vec2 q = floor(px / size);
  float low = 1.0 - uMask;
  vec3 m = vec3(low);
  float column = q.x;
  if (uMaskType == 2) column += mod(floor(q.y / 2.0), 2.0) * 1.5;
  int stripe = int(mod(floor(column), 3.0));
  if (stripe == 0) m.r = 1.0;
  else if (stripe == 1) m.g = 1.0;
  else m.b = 1.0;
  if (uMaskType == 2 && mod(q.y, 2.0) > 0.5) m *= mix(1.0, 0.72, uMask);
  if (uMaskType == 3) {
    float slot = mod(q.y + mod(floor(q.x / 3.0), 2.0) * 2.0, 4.0);
    if (slot < 1.0) m *= mix(1.0, 0.45, uMask);
  }
  return m / sqrt((1.0 + 2.0 * low) / 3.0);
}

vec3 phosphor(vec3 cov) {
  float peak = max(max(uColor.r, uColor.g), max(uColor.b, 0.001));
  vec3 weight = 1.0 - uColor / peak;
  return uColor * cov * pow(max(cov, vec3(0.0001)), 0.7 * weight);
}

void main() {
  vec2 frag = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = curve(frag);
  float shape = 1.0;
  if (uCorners > 0.0) {
    float margin = uCorners * 0.035;
    float radius = uCorners * 0.1;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    vec2 box = (0.5 - margin) * vec2(aspect, 1.0);
    vec2 q = abs(p) - box + radius;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    float aa = max(fwidth(sd), 0.0005);
    shape = (1.0 - smoothstep(-aa, aa, sd)) * mix(1.0, smoothstep(0.0, 0.06, -sd), 0.35);
    uv = (uv - 0.5) / (1.0 - 2.0 * margin) + 0.5;
  }
  float rolling = step(0.0001, abs(uRoll));
  uv.y += uRoll;
  float wrapped = fract(uv.y);
  uv.y = mix(uv.y, wrapped, rolling);
  float offset = fract(uRoll);
  float reach = smoothstep(0.0, 0.08, min(offset, 1.0 - offset));
  float blank = mix(1.0, smoothstep(0.0, 0.05, wrapped) * smoothstep(1.0, 0.95, wrapped), rolling * reach);

  float line = floor(uv.y * uLines);
  float tick = floor(uTime * 30.0);
  uv.x += uTear * (sin(uv.y * 21.0 + uTime * 37.0) * 0.6 + hash(vec2(line, tick)) - 0.5) * 0.05;
  uv.x += uInterference * 0.003 * (hash(vec2(line * 0.37, floor(uTime * 24.0))) - 0.5);

  vec2 dp = (frag - uMagnet.xy) * vec2(aspect, 1.0);
  float fall = exp(-dot(dp, dp) / max(uMagnet.w * uMagnet.w, 0.0001));
  vec2 swirl = vec2(-dp.y, dp.x) / vec2(aspect, 1.0) * fall * uMagnet.z * 0.5;
  vec3 spread = mix(vec3(0.85), vec3(1.0, 0.6, 0.2), uPurity);

  vec3 level = vec3(
    beam(uv + swirl * spread.r + vec2(uShift, 0.0)),
    beam(uv + swirl * spread.g),
    beam(uv + swirl * spread.b - vec2(uShift, 0.0))
  );

  float turn = uTime * 0.35;
  vec2 axis = vec2(cos(turn), sin(turn));
  float lobe = dot(dp, axis) / max(uMagnet.w, 0.0001);
  float side = dot(dp, vec2(-axis.y, axis.x)) / max(uMagnet.w, 0.0001);
  vec3 purity = vec3(lobe, -0.35 * lobe + 0.6 * side, -lobe);
  level *= 1.0 + uPurity * fall * uMagnet.z * 0.9 * purity;

  float glow = texture(uGlow, uv).r * uBloom;
  float hum = 1.0 - uInterference * 0.24 * smoothstep(0.2, 1.0, 0.5 + 0.5 * sin((frag.y - uTime * 0.09) * 6.2831853));
  float flick = 1.0 + uFlicker * 0.1 * (hash(vec2(floor(uTime * 60.0), 7.3)) - 0.5);
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 173.0) - 0.5;
  vec2 v = frag - 0.5;
  float vignette = mix(1.0, smoothstep(0.0, 1.0, clamp(1.0 - dot(v, v) * 2.0, 0.0, 1.0)), uVignette);
  float gain = uBrightness * hum * flick * vignette * blank * uGain * uWarm;

  float noise = hash(floor(gl_FragCoord.xy / (uPixel * 1.5)) + fract(uTime * 13.7) * 91.0);
  level = mix(level, vec3(noise * noise * 1.15), uStatic);
  level *= gain * (1.0 + grain * uNoise * 2.0);
  level *= maskAt(gl_FragCoord.xy);
  glow *= gain * shape * (1.0 + 0.6 * (1.0 - uFocus));
  level *= shape;

  vec3 color;
  float alpha;
  if (uLight < 0.5) {
    vec3 cov = clamp(level, 0.0, 1.0);
    vec3 light = phosphor(cov) + uColor * glow * 0.5 * (1.0 - cov);
    vec3 excess = max(level - 1.1, 0.0);
    light += (1.0 - light) * (1.0 - exp(-excess * 0.6));
    light = clamp(light, 0.0, 1.0);
    color = uBackground + light * (1.0 - uBackground);
    alpha = max(max(light.r, light.g), light.b);
    if (uOpaque < 0.5) color = light;
  } else {
    vec3 cov = clamp(level * 0.86, 0.0, 0.88);
    cov += clamp(glow * 0.12, 0.0, 0.2) * (1.0 - cov);
    color = mix(uBackground, uColor, cov);
    alpha = max(max(cov.r, cov.g), cov.b);
    if (uOpaque < 0.5) color = uColor * cov;
  }
  outColor = uOpaque > 0.5 ? vec4(color, 1.0) : vec4(color, alpha);
}`;


const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smooth = t => t * t * (3 - 2 * t);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
let probe = null;

const parseColor = (value, fallback) => {
  if (value === 'transparent') return null;
  if (typeof document === 'undefined') return fallback;
  if (!probe) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return fallback;
  probe.fillStyle = '#000000';
  probe.fillStyle = value;
  const text = probe.fillStyle;
  if (text.startsWith('#')) {
    const hex = parseInt(text.slice(1), 16);
    return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  }
  const match = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(text);
  if (!match) return fallback;
  if (match[4] !== undefined && Number(match[4]) === 0) return null;
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
};

const seedFor = channel => {
  const a = Math.sin(channel * 12.9898 + 1.7) * 43758.5453;
  const b = Math.sin(channel * 78.233 + 4.1) * 24634.6345;
  const c = Math.sin(channel * 37.719 + 2.9) * 17431.7731;
  const d = Math.sin(channel * 91.113 + 0.3) * 31337.1337;
  const f = v => (v - Math.floor(v)) * TAU;
  return channel === 0 ? [0, 0, 0, 0] : [f(a), f(b), f(c), f(d)];
};

const introAt = t => {
  if (t >= INTRO_SECONDS) return [1, 1, 1];
  const reveal = smooth(clamp(t / INTRO_SECONDS, 0, 1));
  const warm = smooth(clamp(t / 0.6, 0, 1));
  const focus = smooth(clamp((t - 0.15) / (INTRO_SECONDS - 0.15), 0, 1));
  return [reveal, warm, focus];
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, fragment, names) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const shader = compile(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vertex || !shader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, shader);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  names.forEach(name => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });
  return { program, uniforms };
};

const createTarget = (gl, width, height) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer, width, height };
};

const deleteTarget = (gl, target) => {
  if (!target) return;
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
};

const prefersReduced = () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);


  const container = document.querySelector(`.${ROOT}`);
  const canvas = container?.querySelector(`.${CANVAS}`);
  if (!container || !canvas) return;

  // Static-site port of the CRTWarp shader from 16_group_theme.md.
  // Its original React wrapper is replaced with this small vanilla WebGL host.
  const settings = {
    ink: parseColor("#c755f7", [0.78, 0.33, 0.97]),
    paper: parseColor("#120f17", [0.07, 0.06, 0.09]),
    lightMode: false,
    speed: 0.32,
    variation: 0,
    amplitude: Math.max(0, 0.3) / 0.28,
    frequency: Math.max(0.01, 2.5) / 2.2,
    levels: 3,
    columns: 80,
    persistence: 0.4,
    curve: 1.1 + 0.42 / 0.25,
    corners: 0,
    scanline: 0.6,
    lines: 200,
    mask: MASKS.aperture,
    maskStrength: 0.3,
    bloom: 1.5,
    bloomRadius: 1,
    rgbShift: 0.003,
    noise: 0.08,
    flicker: 0.08,
    interference: 0.12,
    vignette: 0.3,
    brightness: 0.82,
    intro: true,
    mouseReact: false,
    mouseStrength: 0,
    dpr: 1.25,
    fps: 30,
  };

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });

  if (!gl) {
    container.classList.add("is-fallback");
    return;
  }

  const content = createProgram(gl, CONTENT, [
    "uGrid", "uTime", "uAmplitude", "uFrequency", "uLevels", "uDecay", "uReveal", "uRise", "uSeed", "uPrevious",
  ]);
  const glowSource = createProgram(gl, GLOW, ["uContent", "uSize"]);
  const blur = createProgram(gl, BLUR, ["uSource", "uSize", "uDirection", "uSigma"]);
  const display = createProgram(gl, DISPLAY, [
    "uContent", "uGlow", "uGrid", "uResolution", "uPixel", "uTime", "uColor", "uBackground",
    "uOpaque", "uLight", "uLines", "uScanline", "uCurve", "uCorners", "uMaskType", "uMask",
    "uBloom", "uBrightness", "uNoise", "uFlicker", "uInterference", "uVignette", "uShift",
    "uWarm", "uFocus", "uStatic", "uRoll", "uTear", "uGain", "uMagnet", "uPurity",
  ]);

  if (!content || !glowSource || !blur || !display) {
    container.classList.add("is-fallback");
    canvas.remove();
    return;
  }

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
    container.classList.add("is-fallback");
    canvas.remove();
    return;
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const state = {
    width: 1,
    height: 1,
    pixel: 1,
    grid: [0, 0],
    cells: [null, null],
    glows: [null, null],
    flip: 0,
    time: 0,
    clock: 0,
    last: 0,
    raf: 0,
    visible: true,
    introAt: -1,
    flipAt: -1,
    flipped: true,
    channel: 0,
    magnet: [0.5, 0.5, 0, 0, 0],
    lost: false,
    disposed: false,
  };

  const ensureTargets = () => {
    const cols = settings.columns;
    const rows = clamp(Math.round((cols * CELL_ASPECT * state.height) / Math.max(state.width, 1)), 4, 300);
    if (cols !== state.grid[0] || rows !== state.grid[1]) {
      state.cells.forEach((target) => deleteTarget(gl, target));
      state.cells = [createTarget(gl, cols, rows), createTarget(gl, cols, rows)];
      state.grid = [cols, rows];
    }

    const glowWidth = Math.max(1, Math.round(state.width / 4));
    const glowHeight = Math.max(1, Math.round(state.height / 4));
    const currentGlow = state.glows[0];
    if (!currentGlow || currentGlow.width !== glowWidth || currentGlow.height !== glowHeight) {
      state.glows.forEach((target) => deleteTarget(gl, target));
      state.glows = [createTarget(gl, glowWidth, glowHeight), createTarget(gl, glowWidth, glowHeight)];
    }
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, settings.dpr);
    const width = Math.max(1, Math.round(container.clientWidth * ratio));
    const height = Math.max(1, Math.round(container.clientHeight * ratio));
    state.pixel = ratio;
    if (width === state.width && height === state.height) return false;
    state.width = width;
    state.height = height;
    canvas.width = width;
    canvas.height = height;
    return true;
  };

  const drawTarget = (target, width, height) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const bindTexture = (unit, texture, location) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(location, unit);
  };

  const render = (dt, reduced) => {
    ensureTargets();
    gl.bindVertexArray(vao);
    const [columns, rows] = state.grid;
    const seed = seedFor(settings.variation + state.channel);
    const introClock = state.introAt < 0 ? 0 : state.clock - state.introAt;
    const [reveal, warm, focus] = settings.intro && !reduced ? introAt(introClock) : [1, 1, 1];
    const previous = state.cells[state.flip];
    const next = state.cells[1 - state.flip];
    const [glowA, glowB] = state.glows;
    if (!previous || !next || !glowA || !glowB) return;

    gl.useProgram(content.program);
    gl.uniform2f(content.uniforms.uGrid, columns, rows);
    gl.uniform1f(content.uniforms.uTime, state.time);
    gl.uniform1f(content.uniforms.uAmplitude, settings.amplitude);
    gl.uniform1f(content.uniforms.uFrequency, settings.frequency);
    gl.uniform1f(content.uniforms.uLevels, settings.levels);
    gl.uniform1f(content.uniforms.uDecay, reduced ? 0 : settings.persistence ** (dt * 60));
    gl.uniform1f(content.uniforms.uReveal, reveal);
    gl.uniform1f(content.uniforms.uRise, reveal < 1 ? dt / 0.22 : 1);
    gl.uniform4f(content.uniforms.uSeed, seed[0], seed[1], seed[2], seed[3]);
    bindTexture(0, previous.texture, content.uniforms.uPrevious);
    drawTarget(next, columns, rows);
    state.flip = 1 - state.flip;

    gl.useProgram(glowSource.program);
    gl.uniform2f(glowSource.uniforms.uSize, glowA.width, glowA.height);
    bindTexture(0, next.texture, glowSource.uniforms.uContent);
    drawTarget(glowA, glowA.width, glowA.height);

    const sigma = Math.max(0.6, (glowA.height / 48) * settings.bloomRadius);
    gl.useProgram(blur.program);
    gl.uniform2f(blur.uniforms.uSize, glowA.width, glowA.height);
    gl.uniform1f(blur.uniforms.uSigma, sigma);
    gl.uniform2f(blur.uniforms.uDirection, 1, 0);
    bindTexture(0, glowA.texture, blur.uniforms.uSource);
    drawTarget(glowB, glowB.width, glowB.height);
    gl.uniform2f(blur.uniforms.uDirection, 0, 1);
    bindTexture(0, glowB.texture, blur.uniforms.uSource);
    drawTarget(glowA, glowA.width, glowA.height);

    gl.useProgram(display.program);
    const uniforms = display.uniforms;
    bindTexture(0, next.texture, uniforms.uContent);
    bindTexture(1, glowA.texture, uniforms.uGlow);
    gl.uniform2f(uniforms.uGrid, columns, rows);
    gl.uniform2f(uniforms.uResolution, state.width, state.height);
    gl.uniform1f(uniforms.uPixel, state.pixel);
    gl.uniform1f(uniforms.uTime, reduced ? 0 : state.clock);
    gl.uniform3f(uniforms.uColor, settings.ink[0], settings.ink[1], settings.ink[2]);
    gl.uniform3f(uniforms.uBackground, settings.paper[0], settings.paper[1], settings.paper[2]);
    gl.uniform1f(uniforms.uOpaque, 1);
    gl.uniform1f(uniforms.uLight, settings.lightMode ? 1 : 0);
    gl.uniform1f(uniforms.uLines, settings.lines);
    gl.uniform1f(uniforms.uScanline, settings.scanline);
    gl.uniform1f(uniforms.uCurve, settings.curve);
    gl.uniform1f(uniforms.uCorners, settings.corners);
    gl.uniform1i(uniforms.uMaskType, settings.mask);
    gl.uniform1f(uniforms.uMask, settings.maskStrength);
    gl.uniform1f(uniforms.uBloom, settings.bloom);
    gl.uniform1f(uniforms.uBrightness, settings.brightness);
    gl.uniform1f(uniforms.uNoise, settings.noise);
    gl.uniform1f(uniforms.uFlicker, reduced ? 0 : settings.flicker);
    gl.uniform1f(uniforms.uInterference, settings.interference);
    gl.uniform1f(uniforms.uVignette, settings.vignette);
    gl.uniform1f(uniforms.uShift, settings.rgbShift);
    gl.uniform1f(uniforms.uWarm, warm);
    gl.uniform1f(uniforms.uFocus, focus);
    gl.uniform1f(uniforms.uStatic, 0);
    gl.uniform1f(uniforms.uRoll, 0);
    gl.uniform1f(uniforms.uTear, 0);
    gl.uniform1f(uniforms.uGain, 1);
    gl.uniform4f(uniforms.uMagnet, 0.5, 0.5, 0, 0.24);
    gl.uniform1f(uniforms.uPurity, 1);
    drawTarget(null, state.width, state.height);
    gl.bindVertexArray(null);
  };

  const stop = () => {
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.last = 0;
  };

  const tick = (now) => {
    state.raf = 0;
    if (state.disposed || !state.visible || document.hidden || state.lost) return;
    const reduced = prefersReduced();
    const interval = reduced ? 0 : 1000 / settings.fps;
    if (!reduced && state.last && now - state.last < interval - 1) {
      state.raf = window.requestAnimationFrame(tick);
      return;
    }

    const dt = state.last ? Math.min((now - state.last) / 1000, 0.1) : 1 / 60;
    state.last = now;
    state.clock += dt;
    if (state.introAt < 0) state.introAt = state.clock;
    if (!reduced) state.time += dt * settings.speed;
    render(dt, reduced);
    if (!reduced) state.raf = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (state.disposed || state.raf || !state.visible || document.hidden || state.lost) return;
    if (resize()) render(1 / 60, prefersReduced());
    state.last = 0;
    state.raf = window.requestAnimationFrame(tick);
  };

  resize();
  render(1 / 60, prefersReduced());

  const visibility = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
    state.visible = entries.some((entry) => entry.isIntersecting);
    if (state.visible) start();
    else stop();
  });
  visibility?.observe(container);
  const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
    const changed = resize();
    if (!changed) return;
    if (prefersReduced()) render(1 / 60, true);
    else if (state.visible) start();
  });
  sizes?.observe(container);
  if (!visibility) start();

  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else if (state.visible) start();
  };
  const onMotionChange = () => {
    if (prefersReduced()) {
      stop();
      state.introAt = 0;
      render(1 / 60, true);
    } else {
      start();
    }
  };
  const onContextLost = (event) => {
    event.preventDefault();
    state.lost = true;
    stop();
    container.classList.add("is-fallback");
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener?.("change", onMotionChange);
  canvas.addEventListener("webglcontextlost", onContextLost);

  window.addEventListener("pagehide", () => {
    state.disposed = true;
    stop();
    visibility?.disconnect();
    sizes?.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    motionQuery.removeEventListener?.("change", onMotionChange);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    state.cells.forEach((target) => deleteTarget(gl, target));
    state.glows.forEach((target) => deleteTarget(gl, target));
    [content, glowSource, blur, display].forEach((item) => gl.deleteProgram(item.program));
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
  }, { once: true });
})();
