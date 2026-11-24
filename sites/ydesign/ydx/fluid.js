/* ydx fluid.js: a small stable-fluids engine (raw WebGL, no dependencies) shared by the hub page and the ink lab.
 *
 * Technique: Jos Stam's "stable fluids" on the GPU (semi-Lagrangian advection, vorticity confinement, a Jacobi
 * pressure solve, gradient subtraction), written from scratch for this site. Velocity and dye live in half-float
 * ping-pong textures; the visible image is drawn by a display shader the caller supplies, so the hub's ink sections
 * and the lab each colour the dye their own way.
 *
 *   const fx = YdxFluid.create(canvas, { tier: 0 });   // null when WebGL / half-float targets are not available
 *   fx.display(FRAG, ['uBase', ...]);                   // the caller's display shader (gets uDye, uVel, uRes, uTime)
 *   fx.splat(x, y, dx, dy, [r, g, b], radius);          // x, y in 0..1 of the canvas (y down, like the DOM)
 *   fx.frame(dt, { shift: [0, px/s], ... }, (gl, u) => { gl.uniform3f(u('uBase'), ...) });
 *
 * Costs (1440x900, tier 0): sim 128 px on the short side, dye 512, 14 pressure iterations: ~30 tiny draw calls per
 * frame. Adaptive quality: the caller measures frame time and calls fx.degrade(), which steps sim/dye/canvas
 * resolution down (never back up). Context loss is handled (rebuilds on restore). CSP-safe (no eval). */
(() => {
  'use strict';
  if (window.YdxFluid) return;

  // [sim short side, dye short side, pressure iterations, canvas DPR cap]
  const TIERS = [[128, 512, 14, 1.5], [96, 384, 10, 1], [64, 256, 6, 0.75], [48, 192, 4, 0.6]];

  const VERT = `
precision highp float;
attribute vec2 aPos;
uniform vec2 uTexel;
varying vec2 vUv, vL, vR, vT, vB;
void main(){
  vUv = aPos * .5 + .5;
  vL = vUv - vec2(uTexel.x, 0.); vR = vUv + vec2(uTexel.x, 0.);
  vT = vUv + vec2(0., uTexel.y); vB = vUv - vec2(0., uTexel.y);
  gl_Position = vec4(aPos, 0., 1.);
}`;
  const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv, vL, vR, vT, vB;
`;
  const FRAG = {
    splat: `uniform sampler2D uTarget; uniform float uAspect, uRadius; uniform vec3 uColor; uniform vec2 uPoint;
void main(){
  vec2 p = vUv - uPoint; p.x *= uAspect;
  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + exp(-dot(p, p) / uRadius) * uColor, 1.);
}`,
    advect: `uniform sampler2D uVelocity, uSource; uniform vec2 uTexel, uShift; uniform float uDt, uDissipation;
void main(){
  vec2 coord = vUv - uDt * (texture2D(uVelocity, vUv).xy + uShift) * uTexel;
  gl_FragColor = vec4(texture2D(uSource, coord).xyz / (1. + uDissipation * uDt), 1.);
}`,
    divergence: `uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x;
  if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y;
  gl_FragColor = vec4(.5 * (R - L + T - B), 0., 0., 1.);
}`,
    curl: `uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(.5 * (R - L - T + B), 0., 0., 1.);
}`,
    vorticity: `uniform sampler2D uVelocity, uCurl; uniform float uCurlK, uDt;
void main(){
  float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x, C = texture2D(uCurl, vUv).x;
  vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + .0001; f *= uCurlK * C; f.y = -f.y;
  vec2 v = texture2D(uVelocity, vUv).xy + f * uDt;
  gl_FragColor = vec4(clamp(v, -1000., 1000.), 0., 1.);
}`,
    pressure: `uniform sampler2D uPressure, uDivergence;
void main(){
  float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
  gl_FragColor = vec4((L + R + B + T - texture2D(uDivergence, vUv).x) * .25, 0., 0., 1.);
}`,
    gradient: `uniform sampler2D uPressure, uVelocity;
void main(){
  float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
  gl_FragColor = vec4(texture2D(uVelocity, vUv).xy - vec2(R - L, T - B), 0., 1.);
}`,
    scale: `uniform sampler2D uTexture; uniform float uValue;
void main(){ gl_FragColor = uValue * texture2D(uTexture, vUv); }`,
  };

  function create(canvas, opts = {}) {
    const attrs = {
      alpha: false, depth: false, stencil: false, antialias: false, premultipliedAlpha: false,
      preserveDrawingBuffer: false, powerPreference: opts.power || 'low-power',
      failIfMajorPerformanceCaveat: !opts.allowSoftware,
    };
    let gl = canvas.getContext('webgl2', attrs), gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) return null;
    // A software rasteriser (SwiftShader, llvmpipe, WARP) does not always set the performance caveat: a full-screen
    // fluid would cost the page its frame rate there, so treat it like no WebGL (the callers show their still look).
    if (!opts.allowSoftware) {
      let name = '';
      try { const ri = gl.getExtension('WEBGL_debug_renderer_info'); name = String(gl.getParameter(ri ? ri.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); } catch (e) { /* ignore */ }
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) {
        try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) { /* ignore */ }
        return null;
      }
    }

    let tier = Math.max(0, Math.min(TIERS.length - 1, opts.tier || 0));
    let fmt = null, progs = {}, disp = null, dispSrc = null, dispNames = [], buf = null;
    let vel, dye, divg, curlT, pres, simW = 0, simH = 0, dyeW = 0, dyeH = 0, lost = false, t0 = performance.now();

    function formats() {
      if (gl2) {
        if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null;
        gl.getExtension('OES_texture_float_linear');
        return { internal: gl.RGBA16F, type: gl.HALF_FLOAT, filter: gl.LINEAR };
      }
      const hf = gl.getExtension('OES_texture_half_float');
      if (!hf) return null;
      const lin = gl.getExtension('OES_texture_half_float_linear');
      gl.getExtension('EXT_color_buffer_half_float');
      return { internal: gl.RGBA, type: hf.HALF_FLOAT_OES, filter: lin ? gl.LINEAR : gl.NEAREST };
    }

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        if (opts.debug) console.warn('[ydx fluid]', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    function program(frag, names) {
      const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, HEAD + frag);
      if (!vs || !fs) return null;
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const name = info.name.replace(/\[0\]$/, '');
        u[name] = gl.getUniformLocation(p, info.name);
      }
      (names || []).forEach((k) => { if (!(k in u)) u[k] = gl.getUniformLocation(p, k); });
      return { p, u };
    }

    function target(w, h) {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, fmt.filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, fmt.filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, gl.RGBA, fmt.type, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      return ok ? { tex, fb, w, h } : null;
    }
    function pair(w, h) {
      const a = target(w, h), b = target(w, h);
      if (!a || !b) return null;
      return { read: a, write: b, w, h, swap() { const t = this.read; this.read = this.write; this.write = t; } };
    }
    function free(t) { if (!t) return; for (const x of t.read ? [t.read, t.write] : [t]) { gl.deleteTexture(x.tex); gl.deleteFramebuffer(x.fb); } }

    function res(short) {
      const w = canvas.width || 1, h = canvas.height || 1, a = w / h;
      return a >= 1 ? [Math.round(short * a), short] : [short, Math.round(short / a)];
    }
    function targets() {
      [vel, dye, divg, curlT, pres].forEach(free);
      const [s, d] = TIERS[tier];
      [simW, simH] = res(s);
      [dyeW, dyeH] = res(d);
      vel = pair(simW, simH); dye = pair(dyeW, dyeH); pres = pair(simW, simH);
      divg = target(simW, simH); curlT = target(simW, simH);
      return !!(vel && dye && pres && divg && curlT);
    }

    function init() {
      fmt = formats();
      if (!fmt) return false;
      for (const k in FRAG) { progs[k] = program(FRAG[k]); if (!progs[k]) return false; }
      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);
      sizeCanvas();
      if (!targets()) return false;
      if (dispSrc) disp = program(dispSrc, dispNames);
      return true;
    }

    let cssW = 0, cssH = 0;
    function sizeCanvas() {
      const r = canvas.getBoundingClientRect();
      cssW = r.width; cssH = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, TIERS[tier][3], opts.dprCap || 9);
      const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width === w && canvas.height === h) return false;
      canvas.width = w; canvas.height = h;
      return true;
    }

    function blit(t) {
      if (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function use(pr, texelW, texelH) {
      gl.useProgram(pr.p);
      if (pr.u.uTexel) gl.uniform2f(pr.u.uTexel, 1 / texelW, 1 / texelH);
      return pr.u;
    }
    function bind(unit, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; }

    const api = {
      canvas, get gl() { return gl; }, get tier() { return tier; }, get lost() { return lost; },
      get size() { return [cssW, cssH]; },
      display(src, names) { dispSrc = src; dispNames = names || []; disp = program(src, dispNames); return !!disp; },
      // x, y: 0..1 across the canvas, y down; dx, dy: pixel deltas of the stroke this frame; color: linear-ish rgb 0..1
      splat(x, y, dx, dy, color, radius = 0.25) {
        if (lost || !vel) return;
        const aspect = canvas.width / canvas.height;
        let r = radius / 100; if (aspect > 1) r *= aspect;
        let u = use(progs.splat, simW, simH);
        gl.uniform1f(u.uAspect, aspect); gl.uniform1f(u.uRadius, r); gl.uniform2f(u.uPoint, x, 1 - y);
        gl.uniform1i(u.uTarget, bind(0, vel.read.tex));
        gl.uniform3f(u.uColor, dx, -dy, 0);
        blit(vel.write); vel.swap();
        gl.uniform1i(u.uTarget, bind(0, dye.read.tex));
        gl.uniform3f(u.uColor, color[0], color[1], color[2]);
        blit(dye.write); dye.swap();
      },
      // One simulation step plus the display pass. o: { shift:[sx, sy] (canvas px/s, y down), curl, velDiss, dyeDiss, pressure }
      frame(dt, o = {}, setUniforms) {
        if (lost || !vel) return;
        if (sizeCanvas()) targets();
        dt = Math.min(dt, 1 / 30);
        // canvas px/s -> sim texels/s (the advection works in texels of the velocity grid)
        const sx = (o.shift ? o.shift[0] : 0) / Math.max(1, cssW) * simW;
        const sy = -(o.shift ? o.shift[1] : 0) / Math.max(1, cssH) * simH;
        let u = use(progs.curl, simW, simH);
        gl.uniform1i(u.uVelocity, bind(0, vel.read.tex)); blit(curlT);
        u = use(progs.vorticity, simW, simH);
        gl.uniform1i(u.uVelocity, bind(0, vel.read.tex)); gl.uniform1i(u.uCurl, bind(1, curlT.tex));
        gl.uniform1f(u.uCurlK, o.curl == null ? 24 : o.curl); gl.uniform1f(u.uDt, dt);
        blit(vel.write); vel.swap();
        u = use(progs.divergence, simW, simH);
        gl.uniform1i(u.uVelocity, bind(0, vel.read.tex)); blit(divg);
        u = use(progs.scale, simW, simH);
        gl.uniform1i(u.uTexture, bind(0, pres.read.tex)); gl.uniform1f(u.uValue, o.pressure == null ? 0.8 : o.pressure);
        blit(pres.write); pres.swap();
        u = use(progs.pressure, simW, simH);
        gl.uniform1i(u.uDivergence, bind(1, divg.tex));
        for (let i = 0; i < TIERS[tier][2]; i++) { gl.uniform1i(u.uPressure, bind(0, pres.read.tex)); blit(pres.write); pres.swap(); }
        u = use(progs.gradient, simW, simH);
        gl.uniform1i(u.uPressure, bind(0, pres.read.tex)); gl.uniform1i(u.uVelocity, bind(1, vel.read.tex));
        blit(vel.write); vel.swap();
        u = use(progs.advect, simW, simH);
        gl.uniform2f(u.uShift, sx, sy); gl.uniform1f(u.uDt, dt);
        gl.uniform1i(u.uVelocity, bind(0, vel.read.tex)); gl.uniform1i(u.uSource, bind(0, vel.read.tex));
        gl.uniform1f(u.uDissipation, o.velDiss == null ? 0.25 : o.velDiss);
        blit(vel.write); vel.swap();
        gl.uniform1i(u.uVelocity, bind(0, vel.read.tex)); gl.uniform1i(u.uSource, bind(1, dye.read.tex));
        gl.uniform1f(u.uDissipation, o.dyeDiss == null ? 0.9 : o.dyeDiss);
        blit(dye.write); dye.swap();
        api.draw(setUniforms);
      },
      // Display pass only (used for the static reduced-motion frame and after a resize while paused).
      draw(setUniforms) {
        if (lost || !disp || !dye) return;
        gl.useProgram(disp.p);
        const u = disp.u;
        if (u.uTexel) gl.uniform2f(u.uTexel, 1 / dyeW, 1 / dyeH);
        if (u.uDye) gl.uniform1i(u.uDye, bind(0, dye.read.tex));
        if (u.uVel) gl.uniform1i(u.uVel, bind(1, vel.read.tex));
        if (u.uRes) gl.uniform2f(u.uRes, canvas.width, canvas.height);
        if (u.uTime) gl.uniform1f(u.uTime, ((performance.now() - t0) / 1000) % 1000);
        if (setUniforms) setUniforms(gl, (k) => u[k], bind);
        blit(null);
      },
      // Upload an <img> into a texture (the lab's screenshots); returns the texture.
      texture(img, old) {
        if (lost) return null;
        const tex = old || gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        return tex;
      },
      // Fade everything out (the lab's "clear").
      fade(k) {
        if (lost || !dye) return;
        const u = use(progs.scale, dyeW, dyeH);
        gl.uniform1i(u.uTexture, bind(0, dye.read.tex)); gl.uniform1f(u.uValue, k); blit(dye.write); dye.swap();
      },
      degrade() {
        if (tier >= TIERS.length - 1) return false;
        tier++;
        sizeCanvas();
        targets();
        return true;
      },
      resize() { if (sizeCanvas()) targets(); },
      destroy() {
        lost = true;
        try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) { /* ignore */ }
      },
    };

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; vel = null; if (opts.onLost) opts.onLost(); }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      progs = {}; vel = dye = pres = divg = curlT = null; canvas.width = canvas.height = 0;
      lost = !init();
      if (!lost && opts.onRestored) opts.onRestored();
    }, false);

    if (!init()) { api.destroy(); return null; }
    return api;
  }

  // '#f04e23' -> [r, g, b] in 0..1
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  // The twelve sites' palettes (picked from each site's own key colours), in the hub's order.
  const SITES = [
    ['grain-flex', ['#3f7a4c', '#c9a24a', '#a09772']],
    ['cassata', ['#b9cc5a', '#ee8aa2', '#f3e3c3']],
    ['mychef', ['#0e8a85', '#c7b66a', '#e9dfbf']],
    ['alexstudio', ['#c8873a', '#b9ab9b', '#7d5f3e']],
    ['form', ['#d8262c', '#9c938b', '#efe8de']],
    ['tomi', ['#8053bf', '#c7a6ff', '#5b3f8c']],
    ['peel-botanical', ['#f5811f', '#5f9a43', '#e6d3b1']],
    ['pack-and-peak', ['#278de3', '#ffe9b8', '#b0806f']],
    ['peel-club', ['#0b3ccf', '#e4dc51', '#f2a41c']],
    ['strata', ['#c8f250', '#8fa0a0', '#e2ff9a']],
    ['negia', ['#e27b90', '#a8304f', '#f6bdc8']],
    ['form-and-field', ['#ffe500', '#5a3ad0', '#f6f1e7']],
  ];
  // The studio's own palette: the colours the process bench walks through (orange, yellow, mint, pink, blue).
  const STUDIO = ['#f04e23', '#ffc22e', '#8fe3bd', '#ff8fae', '#1c46e0'];

  window.YdxFluid = { create, rgb, SITES, STUDIO, TIERS };
})();
