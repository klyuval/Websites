/* ydx immersive.js: the hub's living ink (round 5). Loaded lazily by enhance.js once the site's loader has finished.
 *
 * Signature: "the work as one fluid canvas". Behind the ink scenes (the work wall + index, and the contact), a real
 * fluid simulation (ydx/fluid.js) runs in the studio's colours. The pointer stirs it; hovering a site on the wall or in
 * the index pours that site's own palette in; scroll speed drags the ink along with the page (and a flick on a phone
 * smears it); typing the brief seeps ink from behind the form; typing "ydesign" anywhere spills all twelve palettes.
 *
 * Layering: one WebGL canvas, `position: sticky` inside an absolutely placed holder that is the first child of the
 * section (z-index -1 inside the section's own isolation), so it scrolls natively with the section, sits above the
 * section's flat ink and below every piece of content. The canvas moves to whichever ink scene is on screen.
 * Contrast: the display shader caps the luminance of the ink under every text block (feathered boxes measured from
 * the DOM), so cream copy and the muted index numbers keep WCAG AA against every frame; ink glows freely only in
 * empty space and between the wall's tiles.
 *
 * Degrades: no WebGL / no half-float targets / a software GPU -> a static CSS glow; reduced motion or the footer's
 * motion switch -> one still, marbled frame; inside a frame (the hub preview) -> not loaded at all; slow frames ->
 * steps down resolution (fluid.js tiers), then gives up and fades to the static look.
 */
(() => {
  'use strict';
  if (window.__ydxImmersive) return;
  window.__ydxImmersive = true;
  const d = document, html = d.documentElement, F = window.YdxFluid;
  const rtl = html.dir === 'rtl';
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const still = () => mqReduce.matches || html.dataset.motion === 'reduce';
  const nav = navigator, conn = nav.connection || {};
  const weak = conn.saveData || (nav.deviceMemory && nav.deviceMemory <= 2) || (coarse && (nav.hardwareConcurrency || 8) <= 4);

  const work = $('.work'), contact = $('.contact');
  if (!F || !work || !contact) return;

  /* ---- scenes ------------------------------------------------------------------------------------------------------
   * Each scene: its section, base colours, and the text blocks whose background must stay dark (cap = the highest
   * relative luminance allowed under them: .2 under display headings (3:1 for large cream text), .06 under body copy
   * (4.5:1), .012 under the index and lists, whose numbers are cream at 55% opacity). */
  const scenes = [
    { el: work, wall: $('.wall', work), rects: [
      ['.head .kick', 0.1], ['.head h2', 0.2], ['.head > p:not(.kick)', 0.06], ['.index', 0.014], ['.ydx-play', 0.012], ['.wall__tag', 0.3],
    ] },
    { el: contact, rects: [
      ['.kick', 0.1], ['h2', 0.2], ['.contact__copy > p:not(.kick)', 0.06], ['.contact__preview figcaption', 0.06], ['.next', 0.014], ['.contact__preview .mini', 0.3],
    ] },
  ];
  const canvas = d.createElement('canvas');
  canvas.className = 'ydx-fluid__cv';
  canvas.setAttribute('aria-hidden', 'true');
  for (const s of scenes) {
    s.holder = d.createElement('div');
    s.holder.className = 'ydx-fluid';
    s.holder.setAttribute('aria-hidden', 'true');
    s.el.prepend(s.holder);
    s.boxes = [];
    s.ratio = 0;
  }
  let scene = scenes[0];
  scene.holder.append(canvas);

  const allowSoftware = window.__ydxAllowSoftware === true || /[?&]ydxsw\b/.test(location.search);
  const fx = F.create(canvas, { tier: typeof window.__ydxFluidTier === 'number' ? window.__ydxFluidTier : weak ? 2 : coarse ? 1 : 0, allowSoftware, power: 'low-power' });
  if (!fx) { scenes.forEach((s) => s.holder.classList.add('is-fallback')); return; }

  const DISPLAY = `
uniform sampler2D uDye; uniform vec2 uRes, uTexel, uEdge; uniform vec3 uBase, uBase2; uniform vec4 uWall;
uniform vec4 uRect[6]; uniform float uCap[6]; uniform float uCapHi, uGain;
float box(vec2 p, vec4 r, float f){ vec2 d = max(r.xy - p, p - r.zw); return 1. - smoothstep(0., f, max(d.x, d.y)); }
float ink(vec2 uv){ vec3 c = texture2D(uDye, uv).rgb; return c.r + c.g + c.b; }
void main(){
  vec2 p = gl_FragCoord.xy, uv = p / uRes;
  vec3 c = texture2D(uDye, uv).rgb * uGain;
  float m = max(c.r, max(c.g, c.b));
  c = c / max(m, .0001) * (1. - exp(-m * 1.7));                     // tonemap the strength, keep the hue: thick ink
  float l = dot(c, vec3(.3, .59, .11));                              // stays orange instead of washing out to white
  c = max(mix(vec3(l), c, 1.5), 0.);
  vec2 e = uTexel * 3.;
  vec3 n = normalize(vec3(ink(uv - vec2(e.x, 0.)) - ink(uv + vec2(e.x, 0.)), ink(uv - vec2(0., e.y)) - ink(uv + vec2(0., e.y)), .9));
  float lit = clamp(dot(n, normalize(vec3(-.45, .55, 1.))), 0., 1.);
  float amt = clamp(l * 1.5, 0., 1.);
  c = c * (.7 + .4 * lit) + pow(lit, 40.) * amt * .18;               // soft relief, a glint on thick strokes
  c *= smoothstep(0., 200., p.y - uEdge.x) * smoothstep(0., 200., uEdge.y - p.y);  // fade at the scene's edges
  float cap = uCapHi;
  for (int i = 0; i < 6; i++) cap = mix(cap, min(cap, uCap[i]), box(p, uRect[i], 44.));
  vec3 base = mix(uBase, uBase2, box(p, uWall, 1.));
  vec3 col = base + c;
  // scale the ink (not the ground) until the pixel's relative luminance is under the cap (a few refinement steps,
  // since the ground's own luminance adds to the ink's)
  float s = 1.;
  for (int i = 0; i < 4; i++) {
    float L = dot(pow(max(base + c * s, 0.), vec3(2.2)), vec3(.2126, .7152, .0722));
    if (L > cap) s *= pow(cap / L, 1. / 2.2) * .98;
  }
  col = base + c * s;
  float g = fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715))));  // dither against banding
  gl_FragColor = vec4(col + (g - .5) / 255., 1.);
}`;
  if (!fx.display(DISPLAY, ['uRect', 'uCap'])) { fx.destroy(); scenes.forEach((s) => s.holder.classList.add('is-fallback')); return; }

  const INK = F.rgb('#17130f'), WALL = F.rgb('#0d0a08');
  // Moods: the studio's colours in analogous pairs (mixing complementary inks turns them grey); one mood at a time,
  // turning every 12s. A site's palette is its two key colours (its neutrals would wash the ink out).
  const MOODS = [['#f04e23', '#ffc22e'], ['#ff8fae', '#f04e23'], ['#1c46e0', '#8fe3bd'], ['#8fe3bd', '#ffc22e']].map((m) => m.map(F.rgb));
  const studio = F.STUDIO.map(F.rgb);
  const sites = F.SITES.map(([, p]) => p.slice(0, 2).map(F.rgb));
  let mood = 0, palette = MOODS[0], pi = 0, paletteBack = 0, strokeAt = 0, hovering = false;
  const pick = () => palette[pi % palette.length];
  // one colour per stroke: a new colour after a pause or every 1.6s of drawing (mixing every frame turns ink grey)
  let lastMove = 0;
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  /* ---- geometry: the canvas box, the scene's edges and its text boxes, in GL pixels ------------------------------- */
  const rects = new Float32Array(24), caps = new Float32Array(6), wallR = new Float32Array(4), edge = new Float32Array(2);
  let lastBoxes = 0;
  const measure = (s) => {
    const sr = s.el.getBoundingClientRect();
    s.boxes = [];
    for (const [sel, cap] of s.rects) {
      for (const el of $$(sel, s.el)) {
        const r = el.getBoundingClientRect();
        if (r.width && r.height && s.boxes.length < 6) s.boxes.push([r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top, cap]);
      }
    }
    lastBoxes = performance.now();
  };
  let cr = { left: 0, top: 0, width: 1, height: 1 }, sr = cr;
  const geometry = () => {
    if (performance.now() - lastBoxes > 600) measure(scene);
    cr = canvas.getBoundingClientRect();
    sr = scene.el.getBoundingClientRect();
    const k = canvas.width / Math.max(1, cr.width), H = canvas.height;
    const ox = sr.left - cr.left, oy = sr.top - cr.top;
    rects.fill(-1e5); caps.fill(1);
    scene.boxes.forEach((b, i) => {
      rects.set([(b[0] + ox - 6) * k, H - (b[3] + oy + 6) * k, (b[2] + ox + 6) * k, H - (b[1] + oy - 6) * k], i * 4);
      caps[i] = b[4];
    });
    wallR.fill(-1e5);
    const w = scene.wall;
    if (w && !w.classList.contains('is-diving')) {
      const r = w.getBoundingClientRect();
      wallR.set([(r.left - cr.left) * k, H - (r.bottom - cr.top) * k, (r.right - cr.left) * k, H - (r.top - cr.top) * k]);
    }
    edge[0] = H - (sr.bottom - cr.top) * k;
    edge[1] = H - (sr.top - cr.top) * k;
  };
  const uniforms = (gl, u) => {
    gl.uniform3fv(u('uBase'), INK); gl.uniform3fv(u('uBase2'), WALL);
    gl.uniform4fv(u('uWall'), wallR); gl.uniform4fv(u('uRect'), rects); gl.uniform1fv(u('uCap'), caps);
    gl.uniform2fv(u('uEdge'), edge); gl.uniform1f(u('uCapHi'), 0.3); gl.uniform1f(u('uGain'), 1);
  };

  /* ---- input --------------------------------------------------------------------------------------------------------- */
  const ptr = { x: -1, y: -1, px: -1, py: -1, moved: 0, down: false };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.moved = performance.now(); }, { passive: true });
  addEventListener('pointerdown', (e) => {
    ptr.x = ptr.px = e.clientX; ptr.y = ptr.py = e.clientY; ptr.moved = performance.now();
    if (e.pointerType !== 'mouse') queueBurst(e.clientX, e.clientY, 3, 0.5);   // a tap drops ink
  }, { passive: true });
  const bursts = [];
  const queueBurst = (x, y, n, k, pal) => bursts.push({ x, y, n, k, pal });

  // The site palette under the pointer: wall tiles and index rows both carry data-i (the hub's order of the twelve).
  const siteAt = (el) => {
    const b = el && el.closest && el.closest('.tile, .index button');
    if (!b) return null;
    const i = parseInt(b.dataset.i, 10);
    return Number.isFinite(i) && sites[i] ? sites[i] : MOODS[0];
  };
  let hoverKey = null;
  d.addEventListener('pointerover', (e) => {
    const pal = siteAt(e.target);
    if (pal) {
      clearTimeout(paletteBack);
      if (pal !== hoverKey) { hoverKey = pal; palette = pal; pi = 0; queueBurst(e.clientX, e.clientY, 3, 0.45, pal); }
    } else if (hoverKey) {
      hoverKey = null;
      clearTimeout(paletteBack);
      paletteBack = setTimeout(() => { if (!hoverKey) palette = MOODS[mood]; }, 900);
    }
  }, { passive: true });
  // Keyboard: focusing a site in the index pours its palette in the same way.
  d.addEventListener('focusin', (e) => {
    const pal = siteAt(e.target);
    if (!pal || !e.target.matches(':focus-visible')) return;
    const r = e.target.getBoundingClientRect();
    palette = pal; pi = 0; queueBurst(r.left + r.width / 2, r.top + r.height / 2, 3, 0.4, pal);
  });
  // Typing the brief: ink seeps out from behind the form card.
  const form = $('.contact .form');
  if (form) form.addEventListener('input', () => {
    if (scene.el !== contact) return;
    const r = form.getBoundingClientRect(), side = Math.random() < 0.5;
    const x = side ? (Math.random() < 0.5 ? r.left - 8 : r.right + 8) : r.left + Math.random() * r.width;
    const y = side ? r.top + Math.random() * r.height : r.bottom + 10;
    queueBurst(x, y, 1, 0.22);
  });
  // "ydesign" typed anywhere outside a field: every site's palette spills at once.
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-7);
    if (typed !== 'ydesign') return;
    typed = '';
    const r = canvas.getBoundingClientRect();
    sites.forEach((pal, i) => setTimeout(() => queueBurst(r.left + r.width * (0.1 + 0.8 * Math.random()), Math.max(r.top, 0) + Math.min(r.height, innerHeight) * (0.2 + 0.6 * Math.random()), 3, 0.7, pal), i * 70));
  });

  /* ---- scroll: velocity of the page relative to the canvas ---------------------------------------------------------- */
  let relLast = null, relVel = 0;

  /* ---- loop ------------------------------------------------------------------------------------------------------------ */
  let raf = 0, last = 0, ema = 16, slow = 0, verySlow = 0, gaveUp = false, t = 0;
  const dlg = $('dialog.case');
  const busy = () => (dlg && dlg.open) || (scene.wall && scene.wall.classList.contains('is-diving')) || html.classList.contains('is-loading');
  const visibleScene = () => scenes.reduce((a, s) => (s.ratio > a.ratio ? s : a), { ratio: 0 });

  const toCanvas = (x, y) => [(x - cr.left) / cr.width, (y - cr.top) / cr.height];
  const emit = (dt) => {
    const W = cr.width, H = cr.height;
    // pointer strokes
    const now = performance.now();
    if (ptr.x !== ptr.px || ptr.y !== ptr.py) { if (now - lastMove > 350) { pi++; strokeAt = now; } else if (now - strokeAt > 1600) { pi++; strokeAt = now; } lastMove = now; }
    const stroke = pick();
    if (ptr.x >= 0 && ptr.px >= 0) {
      const dx = ptr.x - ptr.px, dy = ptr.y - ptr.py;
      if ((dx || dy) && ptr.y >= Math.max(cr.top, sr.top) && ptr.y <= Math.min(cr.bottom, sr.bottom)) {
        const [u, v] = toCanvas(ptr.x, ptr.y);
        const sp = Math.min(1, Math.hypot(dx, dy) / 60);
        fx.splat(u, v, dx / W * 5200, dy / H * 5200, mul(stroke, 0.08 + 0.2 * sp), 0.16 + 0.12 * sp);
      }
    }
    ptr.px = ptr.x; ptr.py = ptr.y;
    // bursts (hover, tap, typing, the easter egg)
    while (bursts.length) {
      const b = bursts.shift(), [u, v] = toCanvas(b.x, b.y), pal = b.pal || palette;
      for (let i = 0; i < b.n; i++) {
        const a = Math.random() * Math.PI * 2, f = 600 + Math.random() * 600;
        fx.splat(u, v, Math.cos(a) * f, Math.sin(a) * f, mul(pal[i % pal.length], b.k), 0.35 + Math.random() * 0.3);
      }
    }
    const m2 = Math.floor(t / 12) % MOODS.length;
    if (m2 !== mood) { mood = m2; if (!hoverKey) palette = MOODS[mood]; }
    // ambient: two slow currents keep the ink alive when nobody moves; they ease off while the pointer is busy
    const idle = Math.min(1, (performance.now() - ptr.moved) / 2500);
    const amb = 0.008 + 0.016 * idle;
    for (let i = 0; i < 2; i++) {
      const s = t * (i ? 0.13 : 0.17) + i * 2.1;
      const x = 0.5 + 0.42 * Math.sin(s * 1.7 + i), y = 0.5 + 0.36 * Math.sin(s * 2.3 + i * 1.3);
      const vx = 0.42 * 1.7 * Math.cos(s * 1.7 + i), vy = 0.36 * 2.3 * Math.cos(s * 2.3 + i * 1.3);
      fx.splat(x, y, vx * 90, vy * 90, mul(MOODS[mood][i], amb), 0.28);
    }
    // a fast scroll (a flick on a phone) smears the ink along with the page
    if (Math.abs(relVel) > 500) {
      const n = Math.abs(relVel) > 1500 ? 2 : 1;
      for (let i = 0; i < n; i++) fx.splat(0.1 + 0.8 * Math.random(), 0.25 + 0.5 * Math.random(), (Math.random() - 0.5) * 300, relVel * 0.35, mul(pick(), 0.08), 0.4);
    }
  };

  let jsMs = 0;
  const tick = (now) => {
    raf = 0;
    const c0 = performance.now();
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    ema += ((dt * 1000) - ema) * 0.08;
    if (!window.__ydxFluidNoAdapt) {
      if (ema > 26) slow++; else slow = Math.max(0, slow - 2);
      if (slow > 50) { slow = 0; ema = 16; if (!fx.degrade()) verySlow++; }
      if (verySlow > 2) { giveUp(); return; }
    }
    geometry();
    const rel = sr.top - cr.top;
    if (relLast != null && dt > 0) relVel += (((rel - relLast) / dt) - relVel) * 0.3;
    relLast = rel;
    emit(dt);
    fx.frame(dt, { shift: [0, relVel * 0.9], curl: coarse ? 12 : 16, dyeDiss: 1.15, velDiss: 0.35 }, uniforms);
    jsMs += (performance.now() - c0 - jsMs) * 0.05;
    start();
  };
  const start = () => {
    if (raf || gaveUp || fx.lost || d.hidden || still() || busy() || !scene.ratio) return;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; relLast = null; relVel = 0; };
  function giveUp() {
    gaveUp = true;
    stop();
    html.classList.remove('ydx-fluid-on');
    scenes.forEach((s) => s.holder.classList.add('is-fallback'));
    canvas.classList.remove('is-on');
    setTimeout(() => fx.destroy(), 900);
  }

  // Reduced motion / the motion switch: one still, marbled frame, redrawn (display pass only) when the page scrolls
  // so the dark boxes behind the text stay aligned.
  let stillSeeded = false, stillRaf = 0;
  const paintStill = () => {
    if (gaveUp || fx.lost) return;
    if (!stillSeeded) {
      stillSeeded = true;
      fx.fade(0);
      const seeds = [[0.12, 0.2], [0.86, 0.3], [0.2, 0.82], [0.8, 0.78], [0.5, 0.55]];
      seeds.forEach(([x, y], i) => {
        for (let j = 0; j < 3; j++) {
          const a = i * 1.9 + j * 2.2;
          fx.splat(x, y, Math.cos(a) * 900, Math.sin(a) * 900, mul(studio[(i + j) % studio.length], 0.5), 0.5);
        }
      });
      for (let i = 0; i < 50; i++) fx.frame(1 / 60, { curl: 30, dyeDiss: 0.2, velDiss: 0.6 }, null);
    }
    geometry();
    fx.draw(uniforms);
  };
  const queueStill = () => { if (!stillRaf && still() && scene.ratio) stillRaf = requestAnimationFrame(() => { stillRaf = 0; paintStill(); }); };
  addEventListener('scroll', queueStill, { passive: true });
  addEventListener('resize', () => { fx.resize(); measure(scene); queueStill(); }, { passive: true });

  const update = () => {
    const best = visibleScene();
    if (best.ratio && best !== scene) {
      stop();
      scene = best;
      scene.holder.append(canvas);   // (moving a canvas keeps its WebGL context)
      measure(scene);
      fx.fade(0.15);
      stillSeeded = false;
    }
    if (still()) { stop(); queueStill(); } else { stillSeeded = false; start(); }
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) { const s = scenes.find((x) => x.holder === en.target); if (s) s.ratio = en.isIntersecting ? en.intersectionRatio + 0.001 : 0; }
    update();
  }, { threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1] });
  scenes.forEach((s) => io.observe(s.holder));
  d.addEventListener('visibilitychange', () => { if (d.hidden) stop(); else update(); });
  mqReduce.addEventListener?.('change', update);
  new MutationObserver(update).observe(html, { attributes: true, attributeFilter: ['data-motion', 'class'] });
  if (dlg) new MutationObserver(() => { if (!busy()) update(); }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  if (scene.wall) new MutationObserver(() => { if (!busy()) update(); else stop(); }).observe(scene.wall, { attributes: true, attributeFilter: ['class'] });
  addEventListener('pagehide', stop);
  addEventListener('pageshow', (e) => { if (e.persisted) update(); });

  measure(scene);
  html.classList.add('ydx-fluid-on');
  requestAnimationFrame(() => canvas.classList.add('is-on'));
  // a first splash so the ink is already there when the wall comes into view
  setTimeout(() => {
    for (let i = 0; i < 4; i++) { const a = i * 1.6; fx.splat(0.2 + 0.2 * i, 0.3 + 0.12 * (i % 3), Math.cos(a) * 700, Math.sin(a) * 700, mul(MOODS[i % 2 ? 0 : 1][i % 2], 0.35), 0.5); }
  }, 60);
  update();
  window.__ydxFluid = { fx, debug: () => ({ rects: Array.from(rects), caps: Array.from(caps), edge: Array.from(edge), boxes: scene.boxes, cw: canvas.width, ch: canvas.height }), get scene() { return scene.el.className; }, get running() { return !!raf; }, get tier() { return fx.tier; }, get ema() { return ema; }, get jsMs() { return jsMs; }, get gaveUp() { return gaveUp; } };
})();
