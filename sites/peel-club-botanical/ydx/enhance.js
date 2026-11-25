/* ydx enhancement layer for PEEL CLUB (Botanical)
 * Vanilla JS, no dependencies. Everything here sits on top of the compiled React app:
 * it never inserts nodes inside #root (only attributes / inline individual-transform styles / WAAPI),
 * and its own nodes are appended to <body>.
 *
 *  1. __ydxPeel      the loader exit: the orange cover peels off like a can label (called by the inline loader script)
 *  2. intro()        entrance choreography for the first view (after the peel, and after each route transition)
 *  3. route peel     the app's View Transitions get a label-peel wipe plus a paper flap (CSS in enhance.css)
 *  4. tape           the cream paper strips behind headline <em>s are laid down when they scroll in
 *  5. fallback       IntersectionObserver reveals for browsers without scroll-driven animations
 *  6. theme-color    the browser chrome follows the section colour under the header
 *  7. magnetic       pills and carousel arrows lean toward a fine pointer
 *  8. fizz           bubbles rise out of "Add to sample bag"; the header bag count pops when it goes up
 *  9. breeze (r2)    leafy cut-outs sway once, settling, as they first scroll into view
 * 10. bag exit (r2)  the bag drawer slides back out instead of vanishing
 *
 * r3: loaded with `async` (index.html), so it may run before or after the app module and before <body> is parsed:
 * nothing here may assume an order. It is also idempotent: a second evaluation is a no-op (a second startViewTransition
 * wrapper would add a second `ydx-flap` and Chromium aborts transitions with duplicate view-transition-names).
 */
(() => {
  'use strict';
  if (window.__ydxBooted) return;
  window.__ydxBooted = true;
  const html = document.documentElement;
  html.classList.add('ydx-js');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mqReduce.matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  // r4: motion tokens, mirrored from the inline :root tokens in index.html (--ydx-ease-out / -peel / -pop).
  // WAAPI cannot take var(), so the curves are repeated here; keep the two in step.
  const EASE = 'cubic-bezier(.22,1,.36,1)';   // out: arrivals, rises, settles (= the app's --ease)
  const PEEL = 'cubic-bezier(.65,0,.25,1)';   // peel: wipes and peels along the label edge
  const BACK = 'cubic-bezier(.3,1.45,.5,1)';  // pop: cut-outs, tags and counts landing
  const anim = (el, kf, opts) => { try { return el.animate(kf, Object.assign({ fill: 'backwards' }, opts)); } catch (e) { return null; } };

  /* ---------------------------------------------------------------- 1. loader peel */
  // Geometry: an outer box whose right edge is the peel line is rotated by PHI and slid along its own x axis;
  // the cover inside it is counter-transformed, so the artwork stays still while the edge sweeps across.
  // Both are transform-only animations (compositor), so they stay in sync even while WebGL warms up.
  window.__ydxPeel = (wrap, opts = {}) => new Promise((resolve) => {
    const inner = wrap.querySelector('.ydx-peel__inner');
    const flap = wrap.querySelector('.ydx-peel__flap');
    wrap.style.pointerEvents = 'none';
    const done = () => { resolve(); };
    if (reduced() || !wrap.animate || !inner) {
      const a = anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
      queueMicrotask(() => intro(0, true));
      // r3: timer backstop as on the peel path (animations do not advance in background tabs)
      setTimeout(done, 700);
      return a ? a.finished.then(done, done) : done();
    }
    // r2: the box geometry is static CSS in index.html (no layout change here, so the exit is not a layout shift).
    // S = distance from the inner box centre (viewport centre) to the parked peel edge; the counter-transform uses it.
    const wr = wrap.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    const W = ir.width, H = ir.height, D = Math.hypot(W, H);
    const S = wr.right - (ir.left + W / 2);
    const PHI = 21;
    flap.style.display = 'block';
    const fw = flap.getBoundingClientRect().width || 100;
    wrap.style.boxShadow = '0 0 46px rgba(8,26,18,.3)';
    const u0 = D / 2 + fw * 0.6, u1 = -D / 2 - 30;
    const duration = opts.framed ? 450 : opts.quick ? 720 : 980;
    const t = { duration, easing: PEEL, fill: 'forwards' };
    const a = wrap.animate([{ transform: `translateX(${-S}px) rotate(${PHI}deg) translateX(${u0}px)` }, { transform: `translateX(${-S}px) rotate(${PHI}deg) translateX(${u1}px)` }], t);
    inner.animate([{ transform: `translateX(${S - u0}px) rotate(${-PHI}deg)` }, { transform: `translateX(${S - u1}px) rotate(${-PHI}deg)` }], t);
    // the lifted part of the label: narrow as it starts to lift, widest mid-peel
    flap.animate([{ transform: 'scaleX(.3)' }, { transform: 'scaleX(1)', offset: 0.5 }, { transform: 'scaleX(.75)' }], t);
    // the page underneath arrives while the label lifts (bottom-right first, like the peel)
    intro(duration * 0.18, opts.quick || opts.framed);
    a.finished.then(done, done);
    setTimeout(done, duration + 400);
  });

  /* ---------------------------------------------------------------- 2. intro choreography */
  const byPeelOrder = (els) => {
    // order elements the way the peel uncovers them: bottom-right first
    const W = innerWidth || 1, H = innerHeight || 1;
    return [...els].map((el) => { const r = el.getBoundingClientRect(); return { el, k: (r.left + r.width / 2) / W + (r.top + r.height / 2) / H }; })
      .sort((a, b) => b.k - a.k).map((o) => o.el);
  };
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };

  function lineReveal(el, delay, dur = 950) {
    anim(el, [
      { clipPath: 'inset(-20% -12% 100% -12%)', translate: '0 .42em' },
      { clipPath: 'inset(-20% -12% -30% -12%)', translate: '0 0' }
    ], { duration: dur, delay, easing: EASE });
  }
  function popIn(el, delay, i) {
    const tilt = (i % 2 ? 1 : -1) * (10 + (i * 7) % 12);
    anim(el, [
      { opacity: 0, scale: '.55', rotate: tilt + 'deg' },
      { opacity: 1, scale: '1', rotate: '0deg' }
    ], { duration: 820, delay, easing: BACK });
  }
  function fadeUp(el, delay, dist = 18) {
    anim(el, [{ opacity: 0, translate: `0 ${dist}px` }, { opacity: 1, translate: '0 0' }], { duration: 700, delay, easing: EASE });
  }

  function intro(delay = 0, quick = false) {
    if (reduced()) return;
    const path = location.pathname;
    const main = document.getElementById('main');
    if (!main) return;
    const k = quick ? 0.6 : 1;
    if (path === '/') {
      const hero = main.querySelector('.carousel-hero');
      if (!hero) return;
      hero.querySelectorAll('.carousel-title > span').forEach((s, i) => lineReveal(s, delay + 120 * k + i * 120 * k));
      byPeelOrder(hero.querySelectorAll('.hero-specimens .hs')).forEach((s, i) => popIn(s, delay + i * 85 * k, i));
      const tag = hero.querySelector('.club-invitation');
      if (tag) anim(tag, [{ opacity: 0, translate: '0 -22px', rotate: '-7deg' }, { opacity: 1, translate: '0 0', rotate: '0deg' }], { duration: 700, delay: delay + 380 * k, easing: BACK });
      hero.querySelectorAll('.carousel-bottom, .carousel-foot').forEach((el, i) => fadeUp(el, delay + (260 + i * 90) * k));
      document.querySelectorAll('#root > .header > *').forEach((el, i) => fadeUp(el, delay + (200 + i * 60) * k, -12));
      return;
    }
    if (/^\/sodas\/[^/]+/.test(path)) return; // product pages have their own 3D arrival; don't double-animate
    const h1 = main.querySelector('h1');
    if (!h1 || !inView(h1)) return;
    const sec = h1.closest('section, article') || h1.parentElement;
    lineReveal(h1, delay + 60 * k, 1000);
    const em = h1.querySelector('em');
    if (em) anim(em, [{ translate: '0 .3em' }, { translate: '0 0' }], { duration: 1000, delay: delay + 160 * k, easing: EASE });
    const sheet = h1.closest('.sheet');
    if (sheet) anim(sheet, [{ opacity: 0, translate: '0 40px', rotate: '2.5deg' }, { opacity: 1, translate: '0 0', rotate: '0deg' }], { duration: 900, delay, easing: EASE });
    [...h1.parentElement.children].filter((c) => c !== h1 && /^(P|A|DIV|SPAN|UL)$/.test(c.tagName) && !c.matches('.intro-cuts') && inView(c))
      .slice(0, 4).forEach((c, i) => fadeUp(c, delay + (300 + i * 90) * k));
    byPeelOrder(sec.querySelectorAll('.intro-cuts > *, .recipe-hero > *, .recipe-photo')).filter(inView).forEach((c, i) => popIn(c, delay + (120 + i * 110) * k, i + 1));
  }
  window.__ydxIntro = intro;

  /* ---------------------------------------------------------------- 3. route peel (View Transitions) */
  // The app already wraps route changes in document.startViewTransition. We keep its call untouched and only
  // add a paper "flap" element (named ydx-flap, outside #root) during the update, so the CSS in enhance.css can
  // peel the old page off like a label and slide the flap along the peel line.
  // r3: transitions can overlap (a second click, or Back, skips the running one). Only the latest transition may
  // clean up, otherwise the skipped one's `finished` strips the class/flap from the transition that replaced it.
  if (document.startViewTransition && !reduced()) {
    const orig = document.startViewTransition.bind(document);
    let flapEl = null, gen = 0;
    const mountFlap = () => {
      if (!flapEl) { flapEl = document.createElement('i'); flapEl.className = 'ydx-vt-flap'; flapEl.setAttribute('aria-hidden', 'true'); }
      document.body.appendChild(flapEl);
    };
    const unmountFlap = () => { if (flapEl && flapEl.isConnected) flapEl.remove(); };
    document.startViewTransition = function (arg) {
      const update = typeof arg === 'function' ? arg : arg && arg.update;
      const wrapped = function () { try { mountFlap(); } catch (e) {} return update ? update.apply(this, arguments) : undefined; };
      let vt;
      try {
        vt = (arg && typeof arg === 'object') ? orig(Object.assign({}, arg, { update: wrapped })) : orig(wrapped);
      } catch (e) { return orig(arg); }
      const mine = ++gen;
      html.classList.add('ydx-vt');
      vt.ready.then(() => { if (mine === gen) intro(140, true); }, () => {});
      vt.finished.finally(() => { if (mine === gen) { html.classList.remove('ydx-vt'); unmountFlap(); } }).catch(() => {});
      return vt;
    };
  }

  /* ---------------------------------------------------------------- 4. tape + 5. fallback reveals */
  const TAPE = '.desk-tang :is(h1,h2).display em, .brand-phrase.desk-tang .display em';
  const SDA_HEAD = '.manifesto h2,.section-heading h2,.twist-story__heading h2,.company-overlay h2,.faq-preview h2,.story-essay h2,.brand-phrase .display,.notes-heading h2,.fr-heading h2,.footer-top h2';
  const SDA_PLATE = '.plate,.journal-article,.fr-flavor';
  const noSDA = !(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) || /[?&]ydx-nosda\b/.test(location.search);
  if (noSDA) html.classList.add('ydx-nosda');

  let io = null, ioReveal = null;
  const seen = new WeakSet();
  function scan() {
    if (!io) return;
    document.querySelectorAll(TAPE).forEach((el) => { if (!seen.has(el)) { seen.add(el); io.observe(el); } });
    if (ioReveal) document.querySelectorAll(SDA_HEAD + ',' + SDA_PLATE).forEach((el) => { if (!seen.has(el)) { seen.add(el); ioReveal.observe(el); } });
  }
  function startObservers() {
    if (io) return;
    if (!('IntersectionObserver' in window)) { html.classList.add('ydx-tape-off'); html.classList.remove('ydx-nosda'); return; }
    // r3: state goes in data-* attributes, not classes: React rewrites the whole `className` whenever a node's class
    // prop changes (e.g. `plate ${compact}`), which would drop an added class and leave a revealed plate at opacity 0.
    const once = (attr) => (entries, obs) => {
      for (const e of entries) if (e.isIntersecting) { e.target.setAttribute(attr, ''); obs.unobserve(e.target); }
    };
    // tapes wait until most of the word is on screen
    io = new IntersectionObserver(once('data-ydx-taped'), { rootMargin: '0px 0px -8% 0px', threshold: 0.4 });
    // fallback reveals fire as soon as any part enters (tall headings may never reach a ratio threshold)
    if (noSDA) ioReveal = new IntersectionObserver(once('data-ydx-in'), { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    scan();
  }
  // wait until the loader has started to leave, so the first tapes are laid where people can see them
  const whenRevealed = (fn) => {
    if (html.dataset.peelEntry !== 'loading' && html.dataset.peelEntry !== 'recovery') return void setTimeout(fn, 250);
    const mo = new MutationObserver(() => {
      if (html.dataset.peelEntry !== 'loading' && html.dataset.peelEntry !== 'recovery') { mo.disconnect(); setTimeout(fn, 350); }
    });
    mo.observe(html, { attributes: true, attributeFilter: ['data-peel-entry'] });
  };

  /* ---------------------------------------------------------------- 6. theme-color follows the section */
  const meta = document.querySelector('meta[name="theme-color"]');
  const tones = [['desk-green', '#0f3b2d'], ['desk-pink', '#f7b4bd'], ['desk-tang', '#f5811f']];
  let toneRaf = 0;
  function syncTone() {
    toneRaf = 0;
    if (!meta) return;
    const stack = document.elementsFromPoint(innerWidth / 2, 2);
    const desk = stack.map((n) => n.closest && n.closest('.desk')).find(Boolean);
    if (!desk) return;
    const hit = tones.find(([c]) => desk.classList.contains(c));
    if (hit && meta.content !== hit[1]) meta.content = hit[1];
  }
  const queueTone = () => { if (!toneRaf) toneRaf = requestAnimationFrame(syncTone); };

  /* ---------------------------------------------------------------- 7. magnetic pills + arrows */
  const MAG = '.pill, .carousel-selector button:not(.carousel-current), .fr-controls button';
  let magEl = null;
  const magOff = () => { if (magEl) { magEl.style.translate = ''; magEl = null; } };
  function magMove(e) {
    if (!magEl) return;
    if (!magEl.isConnected) return void (magEl = null); // r3: React replaced it (route change)
    const r = magEl.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    const m = Math.min(10, r.width * 0.06 + 4);
    magEl.style.translate = `${(dx * m).toFixed(2)}px ${(dy * m * 0.8).toFixed(2)}px`;
  }
  function magOver(e) {
    if (reduced() || !fine.matches) return;
    const t = e.target.closest && e.target.closest(MAG);
    if (t === magEl) return;
    magOff();
    magEl = t && !t.disabled ? t : null;
  }

  /* ---------------------------------------------------------------- 8. fizz on add-to-bag */
  function fizz(btn) {
    if (reduced()) return;
    const r = btn.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'ydx-fizz';
    box.setAttribute('aria-hidden', 'true');
    box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    for (let i = 0; i < 14; i++) {
      const b = document.createElement('i');
      const s = 4 + Math.random() * 9;
      b.style.width = b.style.height = s + 'px';
      b.style.left = (8 + Math.random() * 84) + '%';
      box.appendChild(b);
      b.animate([
        { transform: 'translate(-50%, 0) scale(.3)', opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 46}px), ${-(40 + Math.random() * 90)}px) scale(1)`, opacity: 0 }
      ], { duration: 700 + Math.random() * 600, delay: Math.random() * 160, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' });
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1600);
  }

  /* ---------------------------------------------------------------- bag count pops when it goes up */
  let bagCount = null;
  function checkBag() {
    const btn = document.querySelector('.bag-button');
    if (!btn) return;
    const n = parseInt((btn.textContent.match(/\d+/) || ['0'])[0], 10);
    if (bagCount !== null && n > bagCount && !reduced()) {
      anim(btn, [{ scale: '1', rotate: '0deg' }, { scale: '1.16', rotate: '-4deg', offset: 0.35 }, { scale: '1', rotate: '0deg' }], { duration: 560, easing: BACK, fill: 'none' });
    }
    bagCount = n;
  }

  /* ---------------------------------------------------------------- 9. breeze (r2) */
  // Leafy cut-outs catch a little breeze once, as they first scroll into view: a short damped sway on the individual
  // `rotate` property (composes with the app's own transforms and scroll-driven drift). One-shot on purpose: a
  // continuous sway kept the main thread producing frames and cost ~5x the scroll work under a throttled CPU.
  const SWAY_SRC = /\/(branch|sprig)[^/]*\.webp$|-(basil|mint|leaves|verbena|rosemary)(-s)?\.webp$/;
  let swayIO = null, swayN = 0;
  const swaySeen = new WeakSet();
  function sway(img) {
    const i = swayN++;
    const a = (1.6 + (i % 3) * 0.5) * (i % 2 ? 1 : -1);
    anim(img, [
      { rotate: '0deg' }, { rotate: a + 'deg', offset: 0.22 }, { rotate: (-a * 0.55) + 'deg', offset: 0.5 },
      { rotate: (a * 0.22) + 'deg', offset: 0.76 }, { rotate: '0deg' }
    ], { duration: 2200 + (i % 4) * 260, delay: 120 + (i % 3) * 90, easing: 'ease-in-out', fill: 'none' });
  }
  function scanSway() {
    if (reduced() || !('IntersectionObserver' in window)) return;
    if (!swayIO) swayIO = new IntersectionObserver((entries, obs) => {
      for (const e of entries) if (e.isIntersecting) { obs.unobserve(e.target); sway(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.25 });
    document.querySelectorAll('#root img.cut').forEach((img) => {
      if (swaySeen.has(img) || !SWAY_SRC.test(img.getAttribute('src') || '') || img.closest('.hs')) return; // hero specimens already pop on
      swaySeen.add(img);
      swayIO.observe(img);
    });
  }

  /* ---------------------------------------------------------------- 10. bag drawer exit (r2) */
  // React unmounts the bag <dialog> at once. When that happens (and no route transition is running), a static, inert
  // copy of the drawer slides back out to the right while a copy of the backdrop fades, mirroring the menu's own exit.
  let bagScroll = 0;
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('.bag-dialog .dialog-inner')) bagScroll = t.scrollTop;
  }, { capture: true, passive: true });
  function bagExit(node) {
    if (reduced() || html.classList.contains('ydx-vt') || !document.body.animate) return;
    const ghost = document.createElement('div');
    ghost.className = node.className.replace(/\bis-closing\b/, '') + ' ydx-bag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    for (const c of node.childNodes) ghost.appendChild(c.cloneNode(true));
    ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    const back = document.createElement('div');
    back.className = 'ydx-bag-ghost-backdrop';
    back.setAttribute('aria-hidden', 'true');
    document.body.append(back, ghost);
    const inner = ghost.querySelector('.dialog-inner');
    if (inner) inner.scrollTop = bagScroll;
    const ease = 'cubic-bezier(.64,0,.78,0)';
    const a = ghost.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: 420, easing: ease, fill: 'forwards' });
    back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
    const drop = () => { ghost.remove(); back.remove(); };
    a.finished.then(drop, drop);
    setTimeout(drop, 900);
  }
  function watchRemovals(muts) {
    for (const m of muts) for (const n of m.removedNodes) {
      if (n.nodeType !== 1) continue;
      const d = n.matches('.bag-dialog') ? n : n.querySelector && n.querySelector('.bag-dialog');
      if (d) { bagExit(d); bagScroll = 0; return; }
    }
  }

  /* ---------------------------------------------------------------- 11. komorebi field (r5) */
  // The flat desks become a living field: dappled light through swaying leaves, fizz and caustics, drawn by
  // /ydx/komorebi.js in ONE small WebGL canvas behind #root (outside it). It is loaded lazily after the loader has gone
  // and the browser is idle, so it never competes with the app's boot or the three.js shader compile.
  // Fallbacks: hub iframe, save-data, software GL, no WebGL or a failing shader -> html.ydx-field-css (designed static
  // light, enhance.css). If komorebi.js never arrives, nothing changes (the desks keep their flat colours).
  const qs = new URLSearchParams(location.search);
  let field = null, busyUntil = 0, dragging = false, hoverFlavor = null, sceneEl = null;
  const now = () => performance.now();
  const SLUG = {};
  [['blood-orange', 'Blood Orange'], ['lemon-basil', 'Lemon & Basil'], ['pink-grapefruit', 'Pink Grapefruit'], ['mandarin', 'Mandarin'],
    ['yuzu-ginger', 'Yuzu & Ginger'], ['cherry-lime', 'Cherry & Lime'], ['peach-verbena', 'Peach & Verbena'], ['pineapple-mint', 'Pineapple & Mint']]
    .forEach(([s, n]) => { SLUG[n] = s; SLUG[s] = s; });
  const slugOf = (href) => { const m = /\/sodas\/([a-z-]+)/.exec(href || ''); return m && SLUG[m[1]] ? m[1] : null; };
  const scene = () => (sceneEl && sceneEl.isConnected) ? sceneEl : (sceneEl = document.querySelector('.gpu-product-scene'));
  // the 3D sections on screen right now (IntersectionObserver, so the per-frame check never reads layout)
  const scenesInView = new Set(), scenesSeen = new WeakSet();
  const sceneIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? scenesInView.add(e.target) : scenesInView.delete(e.target)))) : null;
  function watchScenes() {
    if (!sceneIO) return;
    document.querySelectorAll('#root .carousel-hero, #root .product-detail').forEach((el) => { if (!scenesSeen.has(el)) { scenesSeen.add(el); sceneIO.observe(el); } });
    scenesInView.forEach((el) => { if (!el.isConnected) scenesInView.delete(el); });
  }
  const sceneLive = () => {
    const s = scene();
    if (!(s && html.classList.contains('gpu-products-ready') && s.dataset.mode && s.dataset.mode !== 'off')) return false;
    return sceneIO ? scenesInView.size > 0 : true;
  };
  function deskFlavor(desk) {
    if (desk.classList.contains('carousel-hero')) {
      const s = scene(), a = s && s.dataset.activeFlavor;
      if (a && SLUG[a]) return a;
      const cur = desk.querySelector('.carousel-current');
      return cur ? SLUG[cur.textContent.trim()] || null : null;
    }
    if (desk.classList.contains('twist-story')) {
      const a = desk.querySelector('.twist-story__panel[data-active="true"] a[href^="/sodas/"]');
      return a ? slugOf(a.getAttribute('href')) : null;
    }
    if (desk.classList.contains('flavors')) return hoverFlavor;
    if (/^\/sodas\/[a-z-]+/.test(location.pathname) && !desk.matches('.footer')) return slugOf(location.pathname);
    return null;
  }
  function bands() {
    return [...document.querySelectorAll('#root .desk')].map((el) => ({
      el, kind: el.classList.contains('desk-green') ? 1 : el.classList.contains('desk-pink') ? 2 : 0,
      get: () => deskFlavor(el)
    }));
  }
  const fieldBusy = () => html.classList.contains('ydx-vt') || dragging || now() < busyUntil;
  function watchBusy() {
    const CAN = '.carousel-hero, .product-detail';
    const hold = (ms) => { busyUntil = Math.max(busyUntil, now() + ms); };
    document.addEventListener('pointerdown', (e) => {
      if (!sceneLive() || !e.target.closest) return;
      if (e.target.closest(CAN) && !e.target.closest('a, button, input, select, textarea, label, summary, .club-invitation')) dragging = true;
    }, { capture: true, passive: true });
    const up = () => { if (dragging) { dragging = false; hold(900); } };
    addEventListener('pointerup', up, { capture: true, passive: true });
    addEventListener('pointercancel', up, { capture: true, passive: true });
    document.addEventListener('wheel', (e) => { if (e.target.closest && e.target.closest('.carousel-hero') && sceneLive()) hold(1000); }, { capture: true, passive: true });
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.carousel-selector, .carousel-foot nav, .can-turn-controls')) hold(1300);
    }, true);
    document.addEventListener('keydown', (e) => {
      const a = document.activeElement;
      if (/^Arrow/.test(e.key) && a && a.closest && a.closest('.carousel-hero')) hold(1100);
    }, true);
    // the flavour plates retint their desk's light while hovered or focused
    const plate = (e) => {
      const a = e.target.closest && e.target.closest('.flavors a[href^="/sodas/"]');
      const f = a ? slugOf(a.getAttribute('href')) : null;
      if (f !== hoverFlavor) { hoverFlavor = f; }
    };
    document.addEventListener('pointerover', plate, { passive: true });
    document.addEventListener('focusin', plate);
  }
  function fieldCSS() { html.classList.add('ydx-field-css'); html.classList.remove('ydx-field', 'ydx-field-on'); }
  function startField() {
    if (qs.get('ydx-field') === 'off') return;
    let framed = true; try { framed = window.self !== window.top; } catch (e) {}
    const conn = navigator.connection;
    if (framed || (conn && conn.saveData) || qs.get('ydx-field') === 'css') return fieldCSS();
    const go = () => {
      const s = document.createElement('script');
      s.src = '/ydx/komorebi.js'; s.async = true;
      s.onerror = () => {}; // missing file: desks simply stay flat
      s.onload = () => {
        if (!window.YdxField || field) return;
        html.classList.add('ydx-field');
        field = window.YdxField.mount({
          bands, busy: fieldBusy,
          fps: () => (sceneLive() ? 30 : 60),
          allowSoftware: qs.get('ydx-gl') === 'soft',
          q: +qs.get('ydx-q') || 0, // debug: force a render scale (perf tests isolate main-thread cost with a tiny buffer)
          burstOk: (e) => e.button === 0 && !(e.target.closest && e.target.closest('dialog, input, textarea, select, .carousel-hero')),
          onReady: () => requestAnimationFrame(() => html.classList.add('ydx-field-on')),
          onLost: () => html.classList.remove('ydx-field-on'),
          onFail: () => { field = null; fieldCSS(); }
        });
        if (field && field.state === 'fallback') { field = null; fieldCSS(); }
        if (field) {
          window.__ydxField = field;
          watchScenes();
          const root = document.getElementById('root');
          if (root && window.ResizeObserver) new ResizeObserver(() => field && field.invalidate()).observe(root);
          watchBusy();
        }
      };
      document.head.appendChild(s);
    };
    // after the loader has gone, the app's own three.js scene has settled (first frame drawn, or fallen back: its shader
    // compile must never compete with ours), and the main thread has a breather
    const settled = (t0) => {
      if (qs.get('graphics') === 'off' || html.classList.contains('gpu-products-ready')) return true;
      if (/^(fallback|skipped)$/.test(html.dataset.peelEntry || '')) return true;
      const sc = scene();
      if (sc) return sc.dataset.renderer === 'fallback';
      return now() - t0 > 3000; // no scene mounted on this route
    };
    const waitScene = () => {
      const t0 = now();
      const poll = () => {
        if (settled(t0) || now() - t0 > 15000) return void (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 300));
        setTimeout(poll, 400);
      };
      poll();
    };
    whenRevealed(waitScene);
  }

  /* ---------------------------------------------------------------- 12. dock: Fizz Lab + pause the light (r5) */
  // A small paper dock outside #root, bottom-left: the way into the Fizz Lab (/fizz-lab/, a page of its own) and a
  // pause button for the moving light (WCAG 2.2.2), remembered per browser. Hidden over the home hero (it would cover
  // the carousel's captions) and while reading (scrolling down), so it never sits on text people are reading; it comes
  // back on scroll up and on keyboard focus, and opens into a fuller invitation once the footer is in view.
  const STILL_KEY = 'ydx-still';
  let stillOn = false;
  try { stillOn = localStorage.getItem(STILL_KEY) === '1'; } catch (e) {}
  if (stillOn) html.setAttribute('data-ydx-still', '1');
  function coverAndGo(href) {
    // the page is covered by a tangerine label laid on along the "/" edge, then we navigate (the lab peels it off)
    const c = document.createElement('div');
    c.className = 'ydx-cover-in'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i class="ydx-cover-in__flap"></i>';
    document.body.appendChild(c);
    const go = () => location.assign(href);
    if (reduced() || !c.animate) {
      const a = c.animate ? c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' }) : null;
      setTimeout(go, a ? 170 : 0);
      return;
    }
    c.classList.add('is-peeling');
    setTimeout(go, 560);
  }
  addEventListener('pageshow', (e) => { if (e.persisted) document.querySelectorAll('.ydx-cover-in').forEach((n) => n.remove()); });
  function buildDock() {
    const dock = document.createElement('div');
    dock.className = 'ydx-dock';
    dock.innerHTML =
      '<a class="ydx-dock__lab" href="/fizz-lab/" data-ydx-lab>' +
      '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M9 6h14l-2 21a2 2 0 0 1-2 1.8h-6A2 2 0 0 1 11 27Z" class="g"/><path d="M10.4 13h11.2" class="l"/><circle cx="14" cy="22" r="1.6" class="b"/><circle cx="18.4" cy="18.2" r="1.2" class="b"/><circle cx="15.6" cy="16" r=".9" class="b"/><path d="M19 6c1-3 4-4 6-3" class="s"/></svg>' +
      '<span class="ydx-dock__t"><span class="ydx-dock__k">Fizz Lab</span><span class="ydx-dock__m"> · mix your own</span></span></a>' +
      '<button type="button" class="ydx-dock__still" aria-pressed="false"><span class="ydx-dock__i" aria-hidden="true"></span><span class="sr-only-ydx">Pause the moving light</span></button>';
    document.body.appendChild(dock);
    const btn = dock.querySelector('.ydx-dock__still');
    const sync = () => {
      btn.setAttribute('aria-pressed', String(stillOn));
      btn.title = stillOn ? 'Let the light move again' : 'Pause the moving light';
      btn.querySelector('.sr-only-ydx').textContent = btn.title;
    };
    sync();
    btn.addEventListener('click', () => {
      stillOn = !stillOn;
      if (stillOn) html.setAttribute('data-ydx-still', '1'); else html.removeAttribute('data-ydx-still');
      try { localStorage.setItem(STILL_KEY, stillOn ? '1' : '0'); } catch (e) {}
      if (field) field.redraw();
      sync();
    });
    dock.querySelector('[data-ydx-lab]').addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      coverAndGo('/fizz-lab/');
    });
    // visibility: not over the home hero; away while reading (scrolling down), back on scroll up, open at the footer
    let lastY = scrollY, rafD = 0;
    const footerIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      dock.classList.toggle('is-open', es.some((x) => x.isIntersecting));
    }, { threshold: 0.35 }) : null;
    // ...and steps aside at the very end, where it would sit on the footer's legal line
    const legalIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      dock.classList.toggle('is-end', es.some((x) => x.isIntersecting));
    }, { rootMargin: '0px 0px -10px 0px' }) : null;
    let watchedFooter = null;
    const update = () => {
      rafD = 0;
      const y = scrollY, heroish = location.pathname === '/' && y < innerHeight * 0.7;
      const down = y > lastY + 2;
      if (down && !dock.classList.contains('is-open')) dock.classList.add('is-away');
      else if (y < lastY - 2) dock.classList.remove('is-away');
      dock.classList.toggle('is-hidden', heroish || html.dataset.peelEntry === 'loading');
      lastY = y;
      const f = document.querySelector('#root > .footer');
      if (footerIO && f !== watchedFooter) {
        if (watchedFooter) { footerIO.unobserve(watchedFooter); const l = watchedFooter.querySelector('.footer-bottom'); if (l && legalIO) legalIO.unobserve(l); }
        if (f) { footerIO.observe(f); const l = f.querySelector('.footer-bottom'); if (l && legalIO) legalIO.observe(l); }
        watchedFooter = f; dock.classList.remove('is-end');
      }
    };
    const queue = () => { if (!rafD) rafD = requestAnimationFrame(update); };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('popstate', () => setTimeout(queue, 400));
    const root = document.getElementById('root');
    if (root) new MutationObserver(queue).observe(root, { childList: true });
    update();
    requestAnimationFrame(() => dock.classList.add('is-ready'));
  }

  /* ---------------------------------------------------------------- wiring */
  function boot() {
    startField();
    whenRevealed(buildDock);
    whenRevealed(startObservers);
    // React re-renders on every route: rescan for new headings/plates (debounced)
    let pending = 0;
    const root = document.getElementById('root');
    if (root) new MutationObserver((muts) => {
      watchRemovals(muts); // r2: synchronous, so the drawer copy is painted in the same frame the real one disappears
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; scan(); queueTone(); checkBag(); scanSway(); watchScenes(); if (field) field.invalidate(); });
    }).observe(root, { childList: true, subtree: true });
    whenRevealed(scanSway);
    addEventListener('scroll', queueTone, { passive: true });
    addEventListener('resize', queueTone, { passive: true });
    addEventListener('popstate', () => setTimeout(queueTone, 400));
    whenRevealed(queueTone);
    document.addEventListener('pointerover', magOver, { passive: true });
    document.addEventListener('pointermove', magMove, { passive: true });
    // r3: pointerleave on <html> (not document) fires in every engine when the pointer leaves the window
    html.addEventListener('pointerleave', magOff, { passive: true });
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.purchase .pill');
      if (btn && !btn.disabled) {
        fizz(btn);
        if (field && !reduced()) { const r = btn.getBoundingClientRect(); field.burst(r.left + r.width / 2, r.top + r.height / 2, 1); } // r5: the light ripples too
      }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
