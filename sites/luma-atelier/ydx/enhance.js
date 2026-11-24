/* ydx enhance.js: AlexStudio motion pass (vanilla, no dependencies).
 *
 * The site already ships its own loader (StudioArrival: a proof "developing" with an exposure bar) and its own route
 * shutter (RouteTransition). This file complements them rather than stacking new ones:
 *   1. Loader: a light-meter needle that reads the arrival's --exposure, and an aperture iris that opens the proof
 *      onto the page (instead of the plain wipe). Shorter on repeat visits, <=800ms inside the hub iframe.
 *   2. Route continuation: on a hard navigation (static hosting answers the RSC fetch with a non-RSC type, so the
 *      router falls back to a full load) the next document starts with the shutter closed and opens it, instead of
 *      replaying the whole arrival after the shutter.
 *   3. Language switch: a quick iris blink hides the text swap / RTL flip.
 *   4. Pointer: autofocus brackets that lock onto links and buttons (fine pointers only).
 *   5. Small things: footer wordmark "develops" into view, mobile-menu current page.
 * Round 2: first-screen hand-off (hero type rises as the opening clears), retimed loader, SPA record cleanup.
 * Round 3 (hardening): idempotent, every rAF wait has a timer fallback (background tabs), one release() path that
 * uncovers the page whatever throws or stalls, no overlays without enhance.css.
 * Nothing here inserts into React-rendered nodes: overlays are custom elements appended to <body>, app nodes only get
 * data-ydx-* attributes. Everything is skipped or reduced to fades under prefers-reduced-motion.
 */
(() => {
  'use strict';
  // r3: a second copy (re-injected by a host page, extension or hub) would install every listener and patch twice
  if (window.__ydxEnhance) return;
  window.__ydxEnhance = true;
  const d = document, html = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const cls = html.classList;
  const has = (c) => cls.contains(c);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const raf = (fn) => requestAnimationFrame(fn);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // r3: rAF never fires in a background tab (and is throttled in offscreen iframes), so waits on frames also end on a
  // timer; otherwise a page loaded in a background tab stayed covered until it was brought to the front.
  const frames = (n = 2) => new Promise((r) => { setTimeout(r, n * 50 + 150); const s = () => (--n <= 0 ? r() : raf(s)); raf(s); });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  /* cubic-bezier(x1,y1,x2,y2) as a function of t (Newton + bisection on x) */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (u) => ((ax * u + bx) * u + cx) * u, Y = (u) => ((ay * u + by) * u + cy) * u, dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (x) => {
      let u = x;
      for (let i = 0; i < 6; i++) { const e = X(u) - x, dv = dX(u); if (Math.abs(e) < 1e-5 || Math.abs(dv) < 1e-6) break; u -= e / dv; }
      if (u < 0 || u > 1 || Math.abs(X(u) - x) > 1e-3) { let lo = 0, hi = 1; u = x; for (let i = 0; i < 30; i++) { if (X(u) < x) lo = u; else hi = u; u = (lo + hi) / 2; } }
      return Y(u);
    };
  }
  const ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    aperture: bezier(.5, 0, .1, 1), // r2: shorter hesitation (was .62,0,.18,1, which read as a stall), then a firm open
  };
  const marks = (window.__ydxMarks = {}); // timings for QA (ms since navigation start)
  const mark = (k) => { marks[k] = Math.round(performance.now()); };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = d.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  cls.add('ydx-js');

  /* ------------------------------------------------------------------------------------------------------------
   * Aperture iris. Seven blades: the hole is a regular heptagon; each blade edge is the extension of one side of it,
   * so the wedges between consecutive edges tile everything outside the hole (like real blades). `over` = drawn over
   * the arrival (translucent facets, arrival clipped by the hole) or as an opaque plate (language switch).
   * ---------------------------------------------------------------------------------------------------------- */
  const N = 7;
  function makeIris(over) {
    const root = d.createElement('ydx-iris');
    root.setAttribute('aria-hidden', 'true');
    if (over) root.className = 'is-over';
    const svg = svgEl('svg', { width: '100%', height: '100%', preserveAspectRatio: 'none' });
    const blades = [], edges = [];
    for (let i = 0; i < N; i++) {
      blades.push(svg.appendChild(svgEl('path', { class: 'ydx-blade' + (i % 2 ? ' alt' : '') })));
    }
    for (let i = 0; i < N; i++) edges.push(svg.appendChild(svgEl('path', { class: 'ydx-edge' })));
    const ring = svg.appendChild(svgEl('path', { class: 'ydx-ring' }));
    root.appendChild(svg);
    d.body.appendChild(root);
    let W = innerWidth, H = innerHeight;
    const full = () => Math.hypot(W, H) / 2 / Math.cos(Math.PI / N) + 6;
    /* p: 0 closed .. 1 fully open. Returns the hole as an SVG path string (also used to clip the arrival). */
    function draw(p, rot) {
      W = innerWidth; H = innerHeight;
      const cx = W / 2, cy = H / 2, R = full() * p, L = Math.hypot(W, H) * 2;
      const V = [], A = [];
      for (let i = 0; i < N; i++) {
        const a = rot + (i * 2 * Math.PI) / N - Math.PI / 2;
        A.push(a); V.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      // direction of side (i-1 -> i), extended past vertex i = edge of blade i
      const dir = (i) => { const b = A[i] - Math.PI / N + Math.PI / 2; return [Math.cos(b), Math.sin(b)]; };
      const far = (i) => { const u = dir(i); return [V[i][0] + u[0] * L, V[i][1] + u[1] * L]; };
      const f = (pt) => pt[0].toFixed(1) + ' ' + pt[1].toFixed(1);
      let hole = '';
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, Fi = far(i), Fj = far(j);
        blades[i].setAttribute('d', `M${f(V[i])}L${f(Fi)}L${f(Fj)}L${f(V[j])}Z`);
        edges[i].setAttribute('d', `M${f(V[i])}L${f(Fi)}`);
        hole += (i ? 'L' : 'M') + f(V[i]);
      }
      hole += 'Z';
      ring.setAttribute('d', p > 0.002 ? hole : '');
      return hole;
    }
    return { root, draw, size: () => [W, H], remove: () => root.remove() };
  }

  /* fn(easedProgress, linearProgress) on every frame for ms. Resolves at the end; rejects if fn throws (r3: a throw
     inside a rAF callback used to leave the promise pending forever, so the caller's cleanup never ran). If frames
     stop (background tab), a timer draws the last frame. */
  function tween(ms, fn, easing = ease.inOut) {
    return new Promise((res, rej) => {
      const s = performance.now();
      let over = false;
      const step = (now) => {
        if (over) return;
        try {
          const t = clamp((now - s) / ms, 0, 1);
          fn(easing(t), t);
          if (t < 1) { raf(step); return; }
        } catch (e) { over = true; clearTimeout(dog); rej(e); return; }
        over = true; clearTimeout(dog); res();
      };
      const dog = setTimeout(() => step(s + ms), ms + 400);
      raf(step);
    });
  }

  /* ------------------------------------------------------------------------------------------------------------
   * 1. Loader
   * ---------------------------------------------------------------------------------------------------------- */
  const arrival = () => d.querySelector('.studio-arrival');
  const isDone = (a) => !a || a.classList.contains('arrival-complete');
  const MODE = has('ydx-cont') ? 'cont' : has('ydx-frame') ? 'frame' : has('ydx-quick') ? 'repeat' : 'first';
  const clipOK = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")');
  // r3: enhance.css sets --ydx-css. Without it (404, blocked, hung) the iris, meter, shield and AF brackets would land
  // unstyled in the page flow, so the layer then leaves the site's own arrival alone and skips its overlays.
  // The stylesheet is loaded non-blocking (preload + swap, so a slow file can never hold back the site's first paint
  // or hydration) and this script is async, so wait briefly for it.
  let CSSOK = false;
  function cssReady() {
    return new Promise((res) => {
      const s = performance.now();
      const poll = () => {
        if (getComputedStyle(html).getPropertyValue('--ydx-css').trim()) return res(true);
        if (window.__ydxCssFail || performance.now() - s > 1500) return res(false);
        setTimeout(poll, 30);
      };
      poll();
    });
  }

  /* r3: the single way out of the loader. Whatever throws or stalls, this leaves the page uncovered, unlocked and
     visible: hold classes off, our overlays gone, the arrival unclipped and hidden, timers and listeners dropped. */
  const loose = { nudge: 0, meter: null, onKey: null, ended: false };
  function release() {
    loose.ended = true;
    clearInterval(loose.nudge);
    if (loose.onKey) removeEventListener('keydown', loose.onKey);
    if (loose.meter) loose.meter.kill();
    cls.remove('ydx-hold', 'ydx-lens', 'ydx-quick', 'ydx-cont', 'ydx-iris-run', 'ydx-fade');
    d.querySelectorAll('ydx-iris.is-over,ydx-veil,ydx-meter,ydx-shield').forEach((n) => n.remove());
    const a = arrival();
    if (a) { a.style.clipPath = ''; cls.add('ydx-arrival-off'); }
  }

  /* Light meter: replaces the "+" register mark under the wordmark while the proof develops. */
  function makeMeter(a) {
    const reg = a.querySelector('.proof-register');
    if (!reg) return null;
    const m = d.createElement('ydx-meter');
    m.setAttribute('aria-hidden', 'true');
    const svg = svgEl('svg', { viewBox: '-60 -52 120 62' });
    const STOPS = ['2.8', '4', '5.6', '8', '11', '16', '22']; // f/8 sits at the centre: correct exposure
    const span = 100; // degrees of the scale
    const arc = svgEl('path', { class: 'ydx-m-arc', d: describeArc(44, -span / 2, span / 2) });
    svg.appendChild(arc);
    STOPS.forEach((s, i) => {
      const deg = -span / 2 + (span * i) / (STOPS.length - 1);
      const r = (deg * Math.PI) / 180;
      const x1 = Math.sin(r) * 44, y1 = -Math.cos(r) * 44, x2 = Math.sin(r) * 50, y2 = -Math.cos(r) * 50;
      svg.appendChild(svgEl('line', { class: 'ydx-m-tick' + (s === '8' ? ' key' : ''), x1, y1, x2, y2 }));
      const t = svgEl('text', { class: 'ydx-m-num', x: (Math.sin(r) * 34).toFixed(1), y: (-Math.cos(r) * 34 + 2.5).toFixed(1) });
      t.textContent = s;
      svg.appendChild(t);
      for (let k = 1; k < 3 && i < STOPS.length - 1; k++) { // minor ticks
        const dd = ((deg + (span / (STOPS.length - 1)) * (k / 3)) * Math.PI) / 180;
        svg.appendChild(svgEl('line', { class: 'ydx-m-minor', x1: Math.sin(dd) * 46, y1: -Math.cos(dd) * 46, x2: Math.sin(dd) * 50, y2: -Math.cos(dd) * 50 }));
      }
    });
    const needle = svgEl('line', { class: 'ydx-m-needle', x1: 0, y1: 4, x2: 0, y2: -47 });
    svg.appendChild(needle);
    svg.appendChild(svgEl('circle', { class: 'ydx-m-pivot', cx: 0, cy: 0, r: 3.2 }));
    m.appendChild(svg);
    const read = d.createElement('b');
    m.appendChild(read);
    d.body.appendChild(m);
    // centred in the gap between the developing wordmark and the exposure bar
    const mark = a.querySelector('.proof-wordmark'), bar = a.querySelector('.arrival-progress');
    const place = () => {
      const r = reg.getBoundingClientRect();
      if (!r.width && !r.height) { m.style.display = 'none'; return; }
      const top = mark ? mark.getBoundingClientRect().bottom : r.top;
      const bot = bar ? bar.getBoundingClientRect().top : r.bottom + 60;
      m.style.left = r.left + r.width / 2 + 'px';
      m.style.top = (top + bot) / 2 + 'px';
      m.style.display = bot - top < 96 ? 'none' : ''; // short landscape screens: no room, keep the plain "+"
      reg.toggleAttribute('data-ydx-meter', bot - top >= 96);
    };
    place();
    addEventListener('resize', place);
    // needle physics: a damped spring toward the exposure value, plus a faint tremble while metering.
    let ang = -span / 2 - 6, vel = 0, target = -span / 2, alive = true, settled = false, lastShown = '';
    const exposure = () => parseFloat(a.style.getPropertyValue('--exposure')) || 0.08;
    const tick = () => {
      if (!alive || !m.isConnected) return;
      const e = clamp(exposure(), 0, 1);
      // exposure 1 => needle on f/8 (centre of the scale): "correct exposure"
      target = -span / 2 + (span / 2) * clamp((e - 0.08) / 0.92, 0, 1) + (e < 1 ? Math.sin(performance.now() / 90) * 0.8 : 0);
      vel += (target - ang) * 0.13; vel *= 0.7; ang += vel; // r2: stiffer (lands in ~250ms instead of ~700ms)
      needle.setAttribute('transform', `rotate(${ang.toFixed(2)})`);
      settled = e >= 1 && Math.abs(target - ang) < 0.6 && Math.abs(vel) < 0.15;
      const idx = clamp(Math.round(((ang + span / 2) / span) * (STOPS.length - 1)), 0, STOPS.length - 1);
      const txt = 'f/' + STOPS[idx] + (e >= 1 ? '  ·  1/125' : '');
      if (txt !== lastShown) { read.textContent = txt; lastShown = txt; }
      m.classList.toggle('is-set', e >= 1);
      raf(tick);
    };
    raf(tick);
    const kill = () => { alive = false; m.remove(); reg.removeAttribute('data-ydx-meter'); removeEventListener('resize', place); };
    return {
      settled: () => settled,
      hide() { m.classList.add('is-out'); setTimeout(kill, 400); },
      kill,
    };
    function describeArc(r, a0, a1) {
      const p = (deg) => { const t = (deg * Math.PI) / 180; return (Math.sin(t) * r).toFixed(2) + ' ' + (-Math.cos(t) * r).toFixed(2); };
      return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`;
    }
  }

  /* Opens the arrival through the iris (an already drawn, closed iris can be passed in). */
  async function irisOut(a, ms, iris) {
    const fresh = !iris;
    iris = iris || makeIris(true);
    cls.add('ydx-iris-run');
    const rot0 = 0.35;
    const clip = (hole) => {
      if (loose.ended) throw new Error('ydx: released'); // the watchdog already uncovered the page: stop drawing
      const [W, H] = iris.size(); a.style.clipPath = `path(evenodd, "M0 0H${W}V${H}H0Z ${hole}")`;
    };
    clip(iris.draw(0, rot0));
    await frames(1);
    cls.remove('ydx-hold', 'ydx-lens');
    let handed = false;
    await tween(ms, (p, t) => {
      if (!handed && p > 0.12) { handed = true; arrive(0); }
      clip(iris.draw(p, rot0 - p * 0.75));
      if (fresh) iris.root.style.opacity = String(clamp(t * 8, 0, 1));
    }, fresh ? ease.aperture : ease.out);
    iris.remove();
    a.style.clipPath = '';
    cls.add('ydx-arrival-off');
    cls.remove('ydx-iris-run', 'ydx-quick');
  }

  /* r2: first-screen hand-off. The page's hero type is static once mounted, and on a first load / hard navigation it
     mounted behind the loader, so the page simply "was there" when the aperture or shutter opened. As the opening
     clears, the hero heading rises into its line (the site's own optical-type-in: clip from below + 25px rise) and
     the copy under it follows (the site's atelier-arrive). WAAPI only, fill backwards: nothing stays on the nodes. */
  const TYPE_EASE = 'cubic-bezier(.16,1,.3,1)';
  function arrive(delay = 0) {
    if (RM.matches || !d.body.animate) return;
    try { arriveNow(delay); } catch (e) { /* decorative: never let it break the loader or navigation */ }
  }
  function arriveNow(delay) {
    const H = innerHeight;
    const inView = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < H * 0.92; };
    const h1 = [...d.querySelectorAll('main h1')].find(inView);
    if (!h1 || h1.hasAttribute('data-ydx-arrived')) return;
    h1.setAttribute('data-ydx-arrived', '');
    setTimeout(() => h1.removeAttribute('data-ydx-arrived'), 1600);
    const kids = [...h1.children];
    const textAtTop = [...h1.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const blocky = kids.length > 1 && !textAtTop && kids.every((k) => /^(block|flex|grid|table)/.test(getComputedStyle(k).display));
    const lines = blocky ? kids : [h1];
    lines.forEach((el, i) => el.animate(
      [{ clipPath: 'inset(-10% -4% 100% -4%)', translate: '0 25px' }, { clipPath: 'inset(-10% -4% -12% -4%)', translate: '0 0' }],
      { duration: 900, delay: delay + i * 90, easing: TYPE_EASE, fill: 'backwards' }));
    // the copy that follows the heading in the same block (eyebrow above it too), at most four pieces
    const box = h1.parentElement;
    if (!box || box === d.querySelector('main')) return;
    let k = 0;
    [...box.children].forEach((el) => {
      if (el === h1 || k >= 4 || !inView(el) || el.querySelector('h1') || getComputedStyle(el).position === 'absolute') return;
      const before = el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING;
      el.animate([{ opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }],
        { duration: 700, delay: delay + (before ? 0 : 160 + lines.length * 90 + k++ * 80), easing: TYPE_EASE, fill: 'backwards' });
    });
  }

  async function runLoader() {
    const a = arrival();
    store.set('ydx-seen', '1');
    if (!a) { cls.remove('ydx-quick', 'ydx-cont'); return; }
    // r2: the inline bootstrap gave up waiting for this file (very slow network): the site's own arrival is already
    // running (or done) natively. Taking it over now would bring a finished arrival back over the page.
    if (window.__ydxGaveUp) { cls.remove('ydx-quick', 'ydx-cont'); d.querySelectorAll('ydx-veil').forEach((v) => v.remove()); return; }
    if (MODE === 'cont') return runContinuation(a); // needs only the inline CSS and the site's own shutter styles
    // r3: no enhance.css: hand the arrival back to the site (its own develop + wipe) instead of unstyled overlays.
    if (!CSSOK) { cls.remove('ydx-hold', 'ydx-quick', 'ydx-lens'); return; }
    const reduce = RM.matches || !clipOK;
    const quick = MODE !== 'first';
    // Hold the arrival on screen (even once React marks it complete) until the iris opens it.
    cls.add('ydx-hold');
    const done = new Promise((res) => {
      if (isDone(a)) return res();
      const mo = new MutationObserver(() => { if (isDone(a)) { mo.disconnect(); res(); } });
      mo.observe(a, { attributes: true, attributeFilter: ['class'] });
    });
    const meter = loose.meter = !quick && !reduce ? makeMeter(a) : null;
    // Repeat visits / hub iframe: a closed lens instead of the full proof, opened as soon as React is listening.
    let lens = null;
    const kick = () => { if (!isDone(a)) window.dispatchEvent(new Event('studio:navigation')); };
    if (quick) {
      kick(); loose.nudge = setInterval(kick, 60);
      if (!reduce) { lens = makeIris(true); lens.draw(0, 0.35); cls.add('ydx-lens'); }
    }
    // r2: count from when the loader was first painted, not from navigation start. On a slow network the first paint
    // can come many seconds after navigation; measured from navigation start the safety had already expired, so the
    // proof flashed for a frame and opened onto a half-built page.
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime;
    const t0 = fcp ? Math.min(fcp, performance.now()) : performance.now();
    const minShow = MODE === 'frame' ? 200 : quick ? 320 : Math.max(1100, t0 + 750);
    const safety = MODE === 'frame' ? 300 : quick ? Math.max(1200, t0 + 900) : Math.max(4000, t0 + 3200);
    // r3: last-resort watchdog. Every wait below is bounded, so this only fires if something unforeseen hangs.
    setTimeout(() => { if (!loose.ended) release(); }, Math.max(minShow, safety) - performance.now() + 4000);
    // Safety: never trap the visitor. Ask the arrival to finish; if React never answers, open it anyway.
    const timeout = wait(Math.max(0, safety - performance.now())).then(() => { kick(); return wait(MODE === 'frame' ? 0 : 250); });
    await Promise.race([done, timeout]);
    clearInterval(loose.nudge);
    mark('arrival-done');
    // Once React has marked the arrival complete it is inert, so clicks would fall through to the hidden page.
    // While we still hold it on screen, a transparent shield catches them and opens the iris right away instead.
    let skip;
    const skipped = new Promise((r) => { skip = r; });
    const shield = d.createElement('ydx-shield');
    shield.setAttribute('aria-hidden', 'true');
    shield.addEventListener('pointerdown', (e) => { e.preventDefault(); skip(); });
    shield.addEventListener('wheel', skip, { passive: true }); // r3: scrolling means "let me in" too
    const onKey = loose.onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ' || e.key === 'Tab') skip(); }; // r2: Tab too (focus was moving behind the held proof)
    d.body.appendChild(shield);
    addEventListener('keydown', onKey);
    const left = minShow - performance.now();
    if (left > 0) await Promise.race([wait(left), skipped]);
    if (meter) { // let the needle land on f/8 before the shutter opens (max ~510ms)
      const s = performance.now();
      let skippedNow = false;
      skipped.then(() => { skippedNow = true; });
      while (!skippedNow && !meter.settled() && performance.now() - s < 420) await frames(1);
      if (!skippedNow) await Promise.race([wait(90), skipped]); // r2: was up to 700 + 140ms of static hold
      meter.hide();
    }
    shield.remove();
    removeEventListener('keydown', onKey);
    if (loose.ended) return;
    mark('open');
    if (reduce) {
      cls.add('ydx-fade');
      cls.remove('ydx-hold', 'ydx-quick');
      setTimeout(() => { cls.add('ydx-arrival-off'); cls.remove('ydx-fade'); loose.ended = true; }, 400);
      return;
    }
    await irisOut(a, MODE === 'frame' ? 380 : quick ? 560 : 800, lens);
    loose.ended = true;
    mark('end');
  }

  /* Hard navigation continuation: the shutter that closed on the previous page opens here. */
  async function runContinuation(a) {
    const veil = d.querySelector('ydx-veil');
    const kick = () => { if (!isDone(a)) window.dispatchEvent(new Event('studio:navigation')); };
    loose.nudge = setInterval(kick, 50);
    kick();
    setTimeout(() => { if (!loose.ended) release(); }, 9000); // r3: last-resort watchdog (all waits below are capped)
    const done = new Promise((res) => {
      if (isDone(a)) return res();
      const mo = new MutationObserver(() => { if (isDone(a)) { mo.disconnect(); res(); } });
      mo.observe(a, { attributes: true, attributeFilter: ['class'] });
    });
    await Promise.race([done, wait(2200)]);
    clearInterval(loose.nudge);
    await Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), wait(900)]);
    await frames(2); // let the locale re-render (he/ru, RTL) land behind the shutter
    // r2: the pictures in the first screen popped in right after the shutter opened. Give them a short chance to
    // decode behind the closed shutter (capped; images that are slow just fade in as before).
    await Promise.race([firstScreenImages(), wait(650)]);
    if (!veil) { cls.remove('ydx-cont'); loose.ended = true; return; }
    const panels = veil.querySelectorAll('.route-shutter-panel');
    const anims = [...panels].map((p, i) => p.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(0,${i ? 101 : -101}%,0)` }],
      { duration: 620, easing: 'cubic-bezier(.65,0,.15,1)', fill: 'forwards' }));
    arrive(170);
    // r3: capped: animations do not advance in a background tab
    await Promise.race([Promise.all(anims.map((x) => x.finished.catch(() => {}))), wait(620 + 500)]);
    veil.remove();
    cls.add('ydx-arrival-off');
    cls.remove('ydx-cont', 'ydx-quick');
    loose.ended = true;
  }

  function firstScreenImages() {
    const H = innerHeight, W = innerWidth;
    const imgs = [...d.querySelectorAll('main img')].filter((im) => {
      const r = im.getBoundingClientRect();
      return r.width > 40 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
    });
    return Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  }

  /* Record route intent so the next document (after a hard navigation) can continue the shutter.
     Mirrors RouteTransition's own conditions. */
  function watchRoutes() {
    addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.detail === 0 || RM.matches) return;
      const link = e.target && e.target.closest && e.target.closest('a[href]');
      if (!link || link.download || (link.target && link.target !== '_self') || link.hasAttribute('data-no-transition')) return;
      const u = new URL(link.href, location.href);
      if (u.origin !== location.origin || u.pathname === location.pathname) return;
      const rec = { to: u.pathname, t: Date.now(), brand: 'AlexStudio', label: '' };
      const fromH1 = d.querySelector('main h1');
      // RouteTransition writes its label synchronously during this same click; read it right after.
      setTimeout(() => {
        const sh = d.querySelector('div.route-shutter');
        if (!sh || !sh.hasAttribute('data-active')) return; // their shutter did not run (prevented etc.)
        rec.brand = (sh.querySelector('b') || {}).textContent || rec.brand;
        rec.label = (sh.querySelector('.route-shutter-panel span') || {}).textContent || '';
        store.set('ydx-route', JSON.stringify(rec));
        spaWatch(fromH1);
      }, 0);
    }, true);
    // A client-side (SPA) navigation consumes the shutter in-page: drop the record if this document survives it.
    const forget = () => setTimeout(() => store.del('ydx-route'), 1800);
    // r2: a client-side navigation (live worker) does not go through history.pushState as patched here (the router
    // keeps its own reference), so watch for it directly after a recorded click: once this document shows the new
    // heading while the site's shutter is still closed, drop the record and play the first-screen hand-off.
    function spaWatch(old) {
      const s0 = performance.now();
      const poll = () => {
        const sh = d.querySelector('div.route-shutter');
        const h = d.querySelector('main h1');
        if (h && h !== old) {
          store.del('ydx-route');
          if (sh && sh.hasAttribute('data-active')) arrive(140);
          setTimeout(() => { try { riseScan(); } catch (e) { /* decorative */ } }, 450); // r4: after the scroll reset
          return;
        }
        if (performance.now() - s0 < 4000) raf(poll);
      };
      raf(poll);
    }
    for (const k of ['pushState', 'replaceState']) {
      const orig = history[k];
      history[k] = function (...args) { const before = location.pathname; const r = orig.apply(this, args); if (location.pathname !== before) forget(); return r; };
    }
    addEventListener('popstate', forget);
  }

  /* ------------------------------------------------------------------------------------------------------------
   * 3. Language switch: iris closes (opaque plate), language changes behind it, iris opens.
   * ---------------------------------------------------------------------------------------------------------- */
  function watchLanguage() {
    let bypass = false, busy = false;
    addEventListener('click', async (e) => {
      if (bypass) return;
      const btn = e.target && e.target.closest && e.target.closest('.language-picker button');
      if (!btn || btn.getAttribute('aria-pressed') === 'true' || RM.matches || !clipOK) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (busy) return;
      busy = true;
      let iris = null, switched = false;
      const apply = () => { switched = true; bypass = true; try { btn.click(); } finally { bypass = false; } };
      // r3: whatever happens, the language still changes and the opaque plate (z 10003) never stays up
      try {
        iris = makeIris(false);
        const rot0 = 0.2;
        // r2: 300 + 460ms of full blackout felt heavy for a language toggle; tightened to 250 + 400ms
        await tween(250, (p) => iris.draw(1 - p, rot0 + p * 0.5), ease.in);
        apply();
        await frames(3);
        await tween(400, (p) => iris.draw(p, rot0 + 0.5 - p * 0.5), ease.out);
      } catch (err) {
        if (!switched) apply();
      } finally {
        if (iris) iris.remove();
        busy = false;
      }
    }, true);
  }

  /* ------------------------------------------------------------------------------------------------------------
   * 4. Autofocus brackets (pointer: fine). They follow the pointer and lock onto interactive elements.
   * ---------------------------------------------------------------------------------------------------------- */
  function cursor() {
    if (!FINE.matches || RM.matches) return;
    const af = d.createElement('ydx-af');
    af.setAttribute('aria-hidden', 'true');
    af.innerHTML = '<i></i><i></i><i></i><i></i><s></s>';
    d.body.appendChild(af);
    const SEL = 'a[href],button,[role="button"],select,summary,label[for],input:not([type=range]),textarea';
    const SKIP = '.studio-arrival,ydx-iris,.loupe-scene,.photo-loupe,[data-lenis-prevent] input[type=range]';
    let x = -100, y = -100, cx = -100, cy = -100, w = 26, h = 26, cw = 26, ch = 26, lock = null, running = false, shown = false;
    const loop = () => {
      const big = af.classList.contains('is-wide') ? 40 : 26;
      let tx = x, ty = y, tw = big, th = big;
      if (lock) {
        if (!lock.isConnected) lock = null;
        else {
          const r = lock.getBoundingClientRect();
          tx = r.left + r.width / 2; ty = r.top + r.height / 2; tw = r.width + 14; th = r.height + 10;
        }
      }
      w = tw; h = th;
      const k = lock ? 0.3 : 0.24;
      cx += (tx - cx) * k; cy += (ty - cy) * k; cw += (w - cw) * 0.25; ch += (h - ch) * 0.25;
      af.style.transform = `translate3d(${(cx - cw / 2).toFixed(1)}px,${(cy - ch / 2).toFixed(1)}px,0)`;
      af.style.width = cw.toFixed(1) + 'px'; af.style.height = ch.toFixed(1) + 'px';
      if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(w - cw) + Math.abs(h - ch) > 0.4) raf(loop);
      else running = false;
    };
    const go = () => { if (!running) { running = true; raf(loop); } };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || (!shown && e.clientX <= 0 && e.clientY <= 0)) return;
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; cx = x; cy = y; af.classList.add('is-on'); }
      go();
    }, { passive: true });
    d.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(SKIP)) { af.classList.add('is-muted'); lock = null; return; }
      af.classList.remove('is-muted');
      const hit = t.closest(SEL);
      const r = hit && hit.getBoundingClientRect();
      lock = hit && r.width < 560 && r.height < 220 ? hit : null;
      af.classList.toggle('is-lock', !!lock);
      af.classList.toggle('is-wide', !!hit && !lock);
      go();
    }, { passive: true });
    d.addEventListener('pointerdown', () => { af.classList.remove('is-fire'); void af.offsetWidth; af.classList.add('is-fire'); }, { passive: true });
    d.documentElement.addEventListener('pointerleave', () => { af.classList.remove('is-on'); shown = false; });
    addEventListener('scroll', () => { if (lock) go(); }, { passive: true });
  }

  /* ------------------------------------------------------------------------------------------------------------
   * 5. Small reveals and route-aware state (re-run on DOM changes: routes re-render on the client).
   * ---------------------------------------------------------------------------------------------------------- */
  let io = null;
  function scan() {
    if (!io && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((list) => {
        list.forEach((en) => { if (en.isIntersecting) { en.target.setAttribute('data-ydx-in', ''); io.unobserve(en.target); } });
      }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    }
    // credits: each contact print develops (grey, underexposed -> full tone) as it scrolls in
    if (!RM.matches) d.querySelectorAll('.credit-item:not([data-ydx-watch])').forEach((el) => {
      el.setAttribute('data-ydx-watch', ''); el.setAttribute('data-ydx-dev', '');
      if (io) io.observe(el); else el.setAttribute('data-ydx-in', '');
    });
    d.querySelectorAll('.site-footer .footer-top .brand:not([data-ydx-watch])').forEach((el) => {
      el.setAttribute('data-ydx-watch', '');
      if (io) io.observe(el); else el.setAttribute('data-ydx-in', '');
    });
    try { riseScan(); } catch (e) { /* decorative */ }
    try { bgRescan(); } catch (e) { /* decorative */ }
    // mobile menu: mark the current page (the desktop nav already has aria-current)
    const here = location.pathname.replace(/\/$/, '') || '/';
    d.querySelectorAll('.mobile-menu nav a[href]').forEach((a) => {
      const p = new URL(a.href, location.href).pathname.replace(/\/$/, '') || '/';
      const on = p === here;
      a.toggleAttribute('data-ydx-current', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* r4: section headings rise into their line as they scroll in (see enhance.css). Only h2s that start below the
     first screen (never hide something that may already be visible), that the site does not animate itself (own
     animation, GSAP scene, data-reveal, the service folio and poster), and only once per node. */
  const RISE_SKIP = '.service-folio,.alex-poster,[data-reveal],.spread-copy,.studio-workbench,.work-archive,.loupe-scene,[role=dialog],.mobile-menu';
  const riseSeen = new WeakSet();
  let riseIO = null;
  const riseDone = (h) => { h.setAttribute('data-ydx-in', ''); setTimeout(() => h.setAttribute('data-ydx-done', ''), 1000); };
  function riseScan() {
    if (RM.matches || !CSSOK || !d.body.animate || !('IntersectionObserver' in window)) return;
    if (!riseIO) {
      riseIO = new IntersectionObserver((list) => list.forEach((en) => {
        if (en.isIntersecting || en.boundingClientRect.bottom < 0) { riseIO.unobserve(en.target); riseDone(en.target); }
      }), { rootMargin: '0px 0px -8% 0px' });
      addEventListener('beforeprint', () => d.querySelectorAll('[data-ydx-rise]:not([data-ydx-done])').forEach(riseDone));
    }
    const H = innerHeight;
    const moving = (e) => getComputedStyle(e).animationName !== 'none';
    d.querySelectorAll('main h2').forEach((h) => {
      if (riseSeen.has(h)) return;
      const r = h.getBoundingClientRect();
      // on screen or above it: leave it, but look again later (after an in-place navigation the router resets the
      // scroll only after the new page has mounted, so this is re-checked once the new heading is up)
      if (!r.width || r.top < H) return;
      riseSeen.add(h);
      if (h.closest(RISE_SKIP) || h.style.transform || h.style.translate) return;
      if (moving(h) || [...h.querySelectorAll('*')].some(moving)) return;
      h.setAttribute('data-ydx-rise', '');
      riseIO.observe(h);
    });
  }

  /* ------------------------------------------------------------------------------------------------------------
   * r5: the living darkroom. ydx/darkroom-bg.js (loaded late, after the loader and in idle time) draws a developer
   * bath under a safelight behind the olive sections; this part feeds it the route/selection tint and rescans the
   * blocks it may make transparent after React re-renders. Skipped: reduced motion, hub iframe, no enhance.css.
   * ---------------------------------------------------------------------------------------------------------- */
  let bg = null;
  const TINT = { base: '#c9a56a', '/services/events': '#d39a5c', '/services/restoration': '#bd9b72', '/about': '#cfa865' };
  // frame finishes (oak, walnut, gallery black, chalk white, brushed silver, raw timber) and print surfaces
  const FINISH = ['#d3aa6b', '#a8714a', '#8f8d84', '#e2dac6', '#b4bcc2', '#d9bb8b'];
  const SURFACE = { paper: '#dccfae', canvas: '#cdb27f', glass: '#9fb9be', wood: '#c48b55' };
  const routeTint = () => TINT[location.pathname.replace(/\/$/, '')] || TINT.base;
  function living() {
    if (RM.matches || MODE === 'frame' || !CSSOK || !window.WebGLRenderingContext) return;
    const go = () => {
      const sc = d.createElement('script');
      sc.src = '/ydx/darkroom-bg.js'; sc.async = true;
      sc.onload = () => {
        try {
          bg = window.__ydxBg = window.ydxDarkroomBG.mount({ mode: 'site', tint: routeTint(), allowSoftware: !!window.__ydxAllowSoftware, quality: window.__ydxBgQ });
        } catch (e) { bg = null; }
      };
      d.head.appendChild(sc);
    };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 300);
    // selections that retint the safelight (prints page frame builder and surfaces)
    d.addEventListener('click', (e) => {
      if (!bg || !(e.target instanceof Element)) return;
      const corner = e.target.closest('.corner-sample'), surf = e.target.closest('.surface-object');
      if (corner) { const i = [...corner.parentElement.querySelectorAll('.corner-sample')].indexOf(corner); if (FINISH[i]) bg.setTint(FINISH[i]); }
      else if (surf) { const k = Object.keys(SURFACE).find((c) => surf.classList.contains(c)); if (k) bg.setTint(SURFACE[k]); }
    }, true);
  }
  let lastPath = location.pathname;
  function bgRescan() {
    if (!bg) return;
    if (location.pathname !== lastPath) { lastPath = location.pathname; bg.setTint(routeTint()); }
    bg.rescan();
  }

  /* r5: entry to the darkroom (/darkroom/, a standalone page owned by this layer). A small chip outside the app root
     with the safelight sign; it appears once the visitor has scrolled into the page (never over the first screen's
     hero), closes the site's own two-panel shutter on click and hands the record to the darkroom page, which opens it
     (same continuation the site's pages use). */
  const CHIP = { en: ['Darkroom', 'Develop a print'], he: ['חדר חושך', 'פתחו הדפסה'], ru: ['Тёмная комната', 'Проявите снимок'] };
  function darkroomChip() {
    if (MODE === 'frame') return;
    const a = d.createElement('a');
    a.className = 'ydx-chip'; a.href = '/darkroom/'; a.setAttribute('data-no-transition', '');
    a.innerHTML = '<i aria-hidden="true"></i><b></b><span></span>';
    const label = () => {
      const l = CHIP[html.lang] || CHIP.en;
      a.querySelector('b').textContent = l[0]; a.querySelector('span').textContent = l[1];
      a.setAttribute('lang', html.lang || 'en');
    };
    label();
    new MutationObserver(label).observe(html, { attributes: true, attributeFilter: ['lang'] });
    d.body.appendChild(a);
    let shown = null;
    const check = () => {
      const menu = d.querySelector('.mobile-menu[data-state="open"],[role=dialog][data-state="open"]');
      const on = scrollY > innerHeight * 0.6 && !menu && !d.querySelector('div.route-shutter[data-active]');
      if (on !== shown) { shown = on; a.classList.toggle('is-on', on); a.tabIndex = on ? 0 : -1; a.toggleAttribute('aria-hidden', !on); }
    };
    let pend = 0;
    addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; check(); }); }, { passive: true });
    setInterval(check, 800); // menus/dialogs open without scrolling
    check();
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.detail === 0 || RM.matches || !d.body.animate) return;
      e.preventDefault();
      const l = CHIP[html.lang] || CHIP.en;
      store.set('ydx-route', JSON.stringify({ to: '/darkroom/', t: Date.now(), brand: 'AlexStudio', label: l[0] }));
      const sh = d.createElement('ydx-out');
      sh.className = 'route-shutter'; sh.setAttribute('data-active', ''); sh.setAttribute('aria-hidden', 'true');
      sh.innerHTML = '<div class="route-shutter-panel"><b></b></div><div class="route-shutter-panel"><span></span></div>';
      sh.querySelector('b').textContent = 'AlexStudio'; sh.querySelector('span').textContent = l[0];
      d.body.appendChild(sh);
      const to = () => { location.href = a.href; };
      Promise.all([...sh.children].map((p, i) => p.animate(
        [{ transform: `translate3d(0,${i ? -101 : 101}%,0)` }, { transform: 'translate3d(0,0,0)' }],
        { duration: 560, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished)).then(to, to);
      setTimeout(to, 1300);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) d.querySelectorAll('ydx-out').forEach((n) => n.remove()); });
  }

  async function boot() {
    window.__ydxBooted = true;
    mark('boot');
    CSSOK = await cssReady();
    // r5: the living background starts once the loader is out of the way (never competes with it)
    runLoader().catch(release).then(() => { try { living(); } catch (e) { /* decorative */ } });
    // r3: features are independent: one failing must not take the others (or the loader) down with it
    const safe = (fn) => { try { fn(); } catch (e) { /* skip this feature */ } };
    safe(watchRoutes);
    if (CSSOK) { safe(watchLanguage); safe(cursor); safe(darkroomChip); }
    safe(scan);
    let pend = 0;
    safe(() => new MutationObserver(() => { if (!pend) pend = setTimeout(() => { pend = 0; safe(scan); }, 120); })
      .observe(d.body, { childList: true, subtree: true }));
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
