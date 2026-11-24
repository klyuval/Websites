/* ==========================================================================
   FORM — ydx enhancement layer (JS)
   - Boot loader exit (the bar gets loaded, then the curtain slides off with a
     plate-coloured edge).
   - "Plate-edge" curtain transitions for app views, sign-in <-> studio and
     language switches. The app is a React SPA with state-based views, so we
     only *observe* it: overlays are appended to <body>, outside #root, and
     never block input (pointer-events:none).
   - Entrance choreography, scroll reveals and number count-ups on existing
     nodes via the Web Animations API (no DOM insertion inside #root).
   No auth/data code is touched: no fetch, no form or click interception.
   ========================================================================== */
(() => {
  'use strict';
  const d = document, html = d.documentElement;
  const rootEl = d.getElementById('root');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => RM.matches;
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const dirSign = () => (html.dir === 'rtl' ? -1 : 1);
  const AREA = { red: '#e3242b', blue: '#1d5fd8', yellow: '#f7c600', green: '#16a34a', chalk: '#f3f1ea', steel: '#b9bcc1' };
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';
  const EASE_WIPE = 'cubic-bezier(.75,0,.2,1)';
  const EASE_PAGE = 'cubic-bezier(.55,0,.1,1)';
  const t0 = window.__ydxT0 || 0;
  let busyUntil = 0; // a full-screen wipe is playing: skip smaller ones

  /* ---------- curtain wipe (shared by loader exit and transitions) ------- */
  // Slides `cur` (a curtain that is 100% + edge wide, edge on its inline-start
  // side) off-screen in reading direction; `stage` counter-drifts for depth.
  function slideOff(cur, stage, width, duration, delay = 0, easing = EASE_WIPE) {
    const s = dirSign();
    const dist = width + (parseFloat(getComputedStyle(cur.parentNode).getPropertyValue('--ew')) || 72);
    const a = cur.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${s * dist}px)` }],
      { duration, delay, easing, fill: 'forwards' });
    if (stage) stage.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-s * dist * 0.72}px)`, opacity: 0.2 }],
      { duration, delay, easing, fill: 'forwards' });
    return a.finished.catch(() => {});
  }

  function bodyBackground(el) {
    try {
      const cs = getComputedStyle(d.body);
      el.style.backgroundImage = cs.backgroundImage;
      el.style.backgroundSize = cs.backgroundSize;
    } catch (e) { /* decorative only */ }
  }

  // Build an overlay over `rect` (viewport if null) and play it.
  function wipe({ rect = null, area = null, label = '', duration = 520, z = 70 } = {}) {
    if (reduced()) return Promise.resolve();
    const w = d.createElement('div');
    w.className = 'ydx-wipe';
    w.setAttribute('aria-hidden', 'true');
    const r = rect || { left: 0, top: 0, width: innerWidth, height: innerHeight };
    Object.assign(w.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: z });
    if (area) { w.style.setProperty('--ew', '30px'); w.style.setProperty('--area', AREA[area] || AREA.red); }
    const edge = area
      ? `<div class="ydx-edge is-area"><i style="--c:${AREA[area] || AREA.red}"></i><i></i></div>`
      : '<div class="ydx-edge"><i style="--c:#e3242b"></i><i style="--c:#1d5fd8"></i><i style="--c:#f7c600"></i><i style="--c:#16a34a"></i></div>';
    w.innerHTML = `<div class="ydx-cur">${edge}${label ? '<div class="ydx-label"><b></b></div>' : ''}</div>`;
    if (label) w.querySelector('.ydx-label b').textContent = label;
    const cur = w.firstChild;
    bodyBackground(cur);
    d.body.appendChild(w);
    return slideOff(cur, w.querySelector('.ydx-label'), r.width, duration, 0, area ? EASE_PAGE : EASE_WIPE).then(() => w.remove());
  }

  /* ---------- boot loader ------------------------------------------------ */
  const loader = d.getElementById('ydx-loader');
  let loaderGone = !loader;
  const appState = () => {
    const f = rootEl && rootEl.firstElementChild;
    if (!f) return 'none';
    if (f.classList.contains('loading-screen')) return 'loading';
    if (f.classList.contains('signin')) return 'signin';
    return 'app';
  };

  function finishLoader() {
    if (loaderGone) return;
    loaderGone = true;
    try { sessionStorage.setItem('ydx-form-seen', '1'); } catch (e) { /* private mode */ }
    const done = () => { loader.remove(); };
    const release = () => { html.classList.remove('ydx-loading'); loader.style.pointerEvents = 'none'; };
    if (reduced()) {
      release();
      loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.then(done, done);
      return;
    }
    const mode = loader.getAttribute('data-mode');
    const quick = mode === 'repeat' || mode === 'frame';
    const stage = loader.querySelector('.ydx-stage');
    const cur = loader.querySelector('.ydx-cur');
    // the bar is lifted a touch (a clean pull) before the curtain goes
    const lift = quick ? 0 : 170;
    if (lift) stage.querySelector('.ydx-bar').animate([{ transform: 'none' }, { transform: 'translateY(-10px)' }], { duration: lift + 200, easing: EASE_OUT, fill: 'forwards' });
    setTimeout(() => { release(); choreograph(true); }, lift + 60);
    slideOff(cur, stage, innerWidth, mode === 'frame' ? 300 : quick ? 380 : 620, lift).then(done, done);
  }

  if (loader) {
    // keep wheel/touch from scrolling (Lenis-driven) page content hidden under the loader
    const stop = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
    loader.addEventListener('wheel', stop, { passive: false });
    loader.addEventListener('touchmove', stop, { passive: false });
    const mode = loader.getAttribute('data-mode');
    // first visit lets the bar finish loading (~1.1s of plates); repeat/iframe/reduced are brief
    const minShow = reduced() ? 450 : mode === 'repeat' ? 260 : mode === 'frame' ? 260 : 1250;
    const hardStop = framed ? 420 : 3300; // + exit (~300 / ~800ms) keeps it under 0.8s / 4s
    const fontsReady = Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
    let fontsOk = false; fontsReady.then(() => { fontsOk = true; });
    const tick = () => {
      if (loaderGone) return;
      const el = performance.now() - t0;
      const st = appState();
      const ready = (st === 'signin' || st === 'app') && fontsOk && d.readyState !== 'loading';
      if ((ready && el >= minShow) || el >= hardStop) finishLoader();
      else setTimeout(tick, 60);
    };
    tick();
  }

  /* ---------- reveals + count-ups ---------------------------------------- */
  const REVEAL = ['.page-title', '.lead-board', '.overview-hero', '.stat', '.panel', '.club-shortcut', '.client-card',
    '.catalog-card', '.meal-card', '.add-meal-card', '.exercise-row', '.schedule-row', '.upcoming-item', '.agenda-item',
    '.library-item', '.macro-card', '.checkin', '.plan-heading', '.client-week button', '.week-track button',
    '.calendar-week button', '.next-session-banner', '.help-card', '.timer-panel', '.set-logger', '.bottom-note',
    '.client-hero', '.daily-fuel', '.score', '.session-score', '.progress-photo', '.coach-note', '.tip-box'].join(',');
  const COUNT = '.lead-number, .stat > strong, .score-number, .macro-card strong, .progress-stats strong';
  const seen = new WeakSet();
  let io = null;

  function enter(el, delay) {
    el.animate([{ opacity: 0, translate: '0 22px' }, { opacity: 1, translate: '0 0' }],
      { duration: 620, delay, easing: EASE_OUT, fill: 'backwards' });
    el.querySelectorAll ? countIn(el, delay) : 0;
  }

  // Count a purely numeric text node up to its value. Writes only to the
  // existing text node and aborts if React changes it meanwhile.
  function countUp(el, delay) {
    const node = [...el.childNodes].find(n => n.nodeType === 3 && /^\d{1,5}$/.test(n.nodeValue.trim()));
    if (!node || el.dataset.ydxCounted) return;
    const target = node.nodeValue.trim(), to = parseInt(target, 10);
    if (to < 2) return;
    el.dataset.ydxCounted = '1';
    const pad = target.length > 1 && target[0] === '0' ? target.length : 0;
    const fmt = v => (pad ? String(v).padStart(pad, '0') : String(v));
    let last = fmt(0), start = 0;
    node.nodeValue = last;
    const dur = Math.min(1100, 500 + to * 6);
    const step = now => {
      if (node.nodeValue !== last) return; // React updated it: let React win
      if (!start) start = now;
      const p = Math.min(1, (now - start) / dur);
      last = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      node.nodeValue = last;
      if (p < 1) requestAnimationFrame(step);
      else node.nodeValue = target;
    };
    setTimeout(() => requestAnimationFrame(step), delay);
  }
  function countIn(el, delay) {
    if (el.matches(COUNT)) countUp(el, delay);
    el.querySelectorAll(COUNT).forEach(n => countUp(n, delay));
  }

  function drawChart(scope) {
    scope.querySelectorAll('.trend-chart').forEach(svg => {
      if (seen.has(svg)) return; seen.add(svg);
      const line = svg.querySelector('polyline');
      if (line) {
        line.setAttribute('pathLength', '1');
        line.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }],
          { duration: 1100, delay: 200, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' });
      }
      const fill = svg.querySelector('polygon');
      if (fill) fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 700, fill: 'backwards' });
      svg.querySelectorAll('circle').forEach((c, i) => {
        c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
        c.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 380, delay: 300 + i * 90, easing: 'cubic-bezier(.2,.9,.3,1.5)', fill: 'backwards' });
      });
    });
  }

  // page: true when a whole view (re)mounted -> stagger what's on screen,
  // defer the rest to scroll. false: just new nodes (list item added, tab).
  function choreograph(page) {
    const main = d.querySelector('main.workspace');
    if (!main || reduced() || html.classList.contains('ydx-loading')) return;
    if (!io) io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.removeAttribute('data-ydx-rv');
      enter(e.target, 0);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    const vh = innerHeight;
    let i = 0;
    main.querySelectorAll(REVEAL).forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      if (!page) return; // only first-time page content is choreographed
      // nested reveal targets inherit their parent's motion; skip them
      const parent = el.parentElement && el.parentElement.closest(REVEAL);
      if (parent && main.contains(parent) && parent !== el) { if (parent.getAttribute('data-ydx-rv') === 'pending') return; }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.top < vh * 0.98) {
        if (!(parent && main.contains(parent))) enter(el, 90 + Math.min(i++, 9) * 55);
        else countIn(el, 200);
      } else if (!(parent && main.contains(parent))) {
        el.setAttribute('data-ydx-rv', 'pending');
        io.observe(el);
      }
    });
    drawChart(main);
  }

  /* ---------- watch the SPA ---------------------------------------------- */
  let lastState = null, lastKey = null, lastDir = html.dir, raf = 0;
  const mainRect = () => {
    const shell = d.querySelector('.main-shell');
    const top = d.querySelector('.topbar');
    const nav = d.querySelector('.mobile-bottom-nav');
    if (!shell) return null;
    const s = shell.getBoundingClientRect();
    const t = top ? Math.max(0, top.getBoundingClientRect().bottom) : 0;
    let b = innerHeight;
    if (nav && getComputedStyle(nav).display !== 'none') b = Math.min(b, nav.getBoundingClientRect().top);
    const left = Math.max(0, s.left), right = Math.min(innerWidth, s.right);
    return { left, top: t, width: right - left, height: Math.max(0, b - t) };
  };

  function check() {
    raf = 0;
    const st = appState();
    const main = d.querySelector('main.workspace');
    const shell = d.querySelector('.app-shell');
    const page = main ? (main.className.match(/club-page-([\w-]+)/) || [])[1] : '';
    const key = main ? page + '|' + (shell ? shell.className : '') : '';
    const now = performance.now();

    if (loaderGone && lastState && st !== lastState && (st === 'app' || st === 'signin') && !framed) {
      // sign-in <-> studio, or the app's own boot screen handing over
      busyUntil = now + 700;
      wipe({ duration: 680, z: 80 });
      if (st === 'app') setTimeout(() => choreograph(true), 40);
    } else if (loaderGone && st === 'app' && lastKey && key && key !== lastKey) {
      const pageChanged = lastKey.split('|')[0] !== page;
      if (now > busyUntil && pageChanged) {
        const area = shell && (shell.className.match(/area-(\w+)/) || [])[1];
        const crumb = d.querySelector('.breadcrumbs strong');
        const r = mainRect();
        if (r && r.width > 0 && r.height > 0) wipe({ rect: r, area, label: crumb ? crumb.textContent.trim() : '', duration: 480 });
      }
      choreograph(true);
    } else if (loaderGone && st === 'app') {
      choreograph(false);
    }
    if (html.dir !== lastDir) {
      if (loaderGone && lastDir && now > busyUntil) { busyUntil = now + 600; wipe({ duration: 560, z: 80 }); }
      lastDir = html.dir;
    }
    lastState = st; lastKey = key || lastKey;
    if (st !== 'app') lastKey = null;
    pointerParallax(st === 'signin');
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
  if (rootEl) new MutationObserver(schedule).observe(rootEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(schedule).observe(html, { attributes: true, attributeFilter: ['dir'] });
  schedule();

  /* ---------- sign-in poster: barbell sleeve follows the pointer --------- */
  let px = 0, py = 0, tx = 0, ty = 0, pRaf = 0, pOn = false;
  const onMove = e => { tx = (e.clientX / innerWidth - 0.5) * 22; ty = (e.clientY / innerHeight - 0.5) * 14; if (!pRaf) pRaf = requestAnimationFrame(pStep); };
  function pStep() {
    pRaf = 0;
    px += (tx - px) * 0.12; py += (ty - py) * 0.12;
    const poster = d.querySelector('.signin-poster');
    if (!poster) return;
    poster.style.setProperty('--ydx-px', px.toFixed(2) + 'px');
    poster.style.setProperty('--ydx-py', py.toFixed(2) + 'px');
    if (Math.abs(tx - px) > 0.1 || Math.abs(ty - py) > 0.1) pRaf = requestAnimationFrame(pStep);
  }
  function pointerParallax(on) {
    on = on && FINE.matches && !reduced();
    if (on === pOn) return;
    pOn = on;
    if (on) addEventListener('pointermove', onMove, { passive: true });
    else removeEventListener('pointermove', onMove);
  }
})();
