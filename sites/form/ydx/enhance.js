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
  // run once, even if the script ends up on the page twice; the inline boot
  // script in index.html also reads this flag to tell "enhance.js failed".
  if (window.__ydxForm) return;
  window.__ydxForm = true;
  const d = document, html = d.documentElement;
  const rootEl = d.getElementById('root');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => RM.matches;
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const dirSign = () => (html.dir === 'rtl' ? -1 : 1);
  const AREA = { red: '#e3242b', blue: '#1d5fd8', yellow: '#f7c600', green: '#16a34a', chalk: '#f3f1ea', steel: '#b9bcc1' };
  // motion tokens, mirrored in enhance.css (--ydx-out / --ydx-pop / --ydx-draw).
  // Round 4: the loader exit, sign-in/language curtains and view curtains had
  // two different curves for the same kind of slide; one curve now.
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';
  const EASE_POP = 'cubic-bezier(.2,.9,.3,1.3)';
  const EASE_DRAW = 'cubic-bezier(.6,0,.2,1)';
  const EASE_WIPE = 'cubic-bezier(.65,0,.15,1)';
  const t0 = window.__ydxT0 || 0;
  let busyUntil = 0; // a full-screen wipe is playing: skip smaller ones
  // enhance.css sets --ydx-css; without it overlays would render unstyled
  // (static, clickable, label text in the page flow), so skip them.
  const cssOn = () => getComputedStyle(html).getPropertyValue('--ydx-css').trim() === '1';

  /* ---------- curtain wipe (shared by loader exit and transitions) ------- */
  // Slides `cur` (a curtain that is 100% + edge wide, edge on its inline-start
  // side) off-screen in reading direction; `stage` counter-drifts for depth.
  // The curtain is exactly overlay width + edge wide, so that is the distance.
  function slideOff(cur, stage, duration, delay = 0, easing = EASE_WIPE) {
    const s = dirSign();
    const dist = cur.offsetWidth;
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

  // Build an overlay over `rect` (the whole viewport if null) and play it.
  // z: 45 sits under the app's mobile drawer (50) so a drawer closing over a
  // view switch stays whole; 55 (full screen) covers it. Toasts and dialogs
  // live in the top layer and stay above both.
  function wipe({ rect = null, area = null, label = '', duration = 520, z = 45 } = {}) {
    if (reduced() || !cssOn()) return Promise.resolve();
    const w = d.createElement('div');
    w.className = 'ydx-wipe';
    w.setAttribute('aria-hidden', 'true');
    // full screen uses inset:0 (CSS) rather than innerWidth/innerHeight, which
    // follow the visual viewport when pinch-zoomed
    if (rect) Object.assign(w.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    else w.style.inset = '0';
    w.style.zIndex = z;
    if (area) { w.style.setProperty('--ew', '30px'); w.style.setProperty('--area', AREA[area] || AREA.red); }
    const edge = area
      ? `<div class="ydx-edge is-area"><i style="--c:${AREA[area] || AREA.red}"></i><i></i></div>`
      : '<div class="ydx-edge"><i style="--c:#e3242b"></i><i style="--c:#1d5fd8"></i><i style="--c:#f7c600"></i><i style="--c:#16a34a"></i></div>';
    w.innerHTML = `<div class="ydx-cur">${edge}${label ? '<div class="ydx-label"><b></b></div>' : ''}</div>`;
    if (label) w.querySelector('.ydx-label b').textContent = label;
    const cur = w.firstChild;
    bodyBackground(cur);
    d.body.appendChild(w);
    try {
      return slideOff(cur, w.querySelector('.ydx-label'), duration).then(() => w.remove());
    } catch (e) { w.remove(); return Promise.resolve(); }
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

  // Hand the page back: everything that could leave it locked or hidden is
  // undone first and synchronously, before any (optional) exit animation.
  function release() {
    html.classList.remove('ydx-loading');
    if (rootEl) rootEl.inert = false;
    loader.style.pointerEvents = 'none';
  }

  function finishLoader() {
    if (loaderGone) return;
    loaderGone = true;
    try { sessionStorage.setItem('ydx-form-seen', '1'); } catch (e) { /* private mode */ }
    const done = () => { loader.remove(); };
    release();
    try {
      if (reduced()) {
        loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.then(done, done);
        return;
      }
      const mode = loader.getAttribute('data-mode');
      const quick = mode === 'repeat' || mode === 'frame';
      const stage = loader.querySelector('.ydx-stage');
      const cur = loader.querySelector('.ydx-cur');
      const tStart = performance.now();
      // the bar is lifted a touch (a clean pull) before the curtain goes; the
      // lift runs on the compositor while we do the heavy work underneath
      const lift = quick ? 0 : 150;
      if (lift) stage.querySelector('.ydx-bar').animate([{ transform: 'none' }, { transform: 'translateY(-10px)' }], { duration: lift + 220, easing: EASE_OUT, fill: 'forwards' });
      // The app was released (paused entrances un-paused) above, while the
      // floor still covers everything; our choreography is set up in the next
      // frame and the curtain pulled in the one after (each is a big style
      // pass). Doing it after the curtain started let finished content show
      // for a frame and then re-enter. In a background tab these frames wait
      // until the tab is shown; the inline script's backstop still removes
      // the loader meanwhile.
      requestAnimationFrame(() => {
        try {
          pageWindow = performance.now() + 500;
          choreograph(true, quick ? 60 : 140);
        } catch (e) { /* decorative */ }
        requestAnimationFrame(() => {
          try {
            const wait = Math.max(0, lift - (performance.now() - tStart));
            slideOff(cur, stage, mode === 'frame' ? 300 : quick ? 380 : 600, wait).then(done, done);
          } catch (e) { done(); }
        });
      });
    } catch (e) { done(); }
  }

  if (loader) {
    // keep wheel/touch from scrolling (Lenis-driven) page content hidden under the loader
    const stop = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
    loader.addEventListener('wheel', stop, { passive: false });
    loader.addEventListener('touchmove', stop, { passive: false });
    const mode = loader.getAttribute('data-mode');
    // first visit: the bar is loaded and locked at ~1.05s; repeat/iframe/reduced are brief
    const minShow = reduced() ? 450 : mode === 'repeat' ? 260 : mode === 'frame' ? 260 : 1080;
    const hardStop = framed ? 420 : 3300; // + exit (~300 / ~750ms) keeps it under 0.8s / 4s
    // enhance.js owns the exit from here: drop the CSS fallback fade, which
    // would otherwise fight the curtain on slow connections. If that fade has
    // already begun (this script arrived late), cancelling it would bring the
    // loader back over a visible page, so let it finish and just clean up.
    const ls = getComputedStyle(loader);
    if (ls.visibility === 'hidden' || parseFloat(ls.opacity) < 1) {
      loaderGone = true;
      release();
      setTimeout(() => loader.remove(), 400);
    } else {
      loader.style.animation = 'none';
      // keyboard focus must not land on the (covered) app while the bar loads
      if (rootEl) rootEl.inert = true;
    }
    const fontsReady = Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
    let fontsOk = false; fontsReady.then(() => { fontsOk = true; });
    const tick = () => {
      if (loaderGone) return;
      try {
        const el = performance.now() - t0;
        const st = appState();
        const ready = (st === 'signin' || st === 'app') && fontsOk && d.readyState !== 'loading';
        // past the hard stop we still wait while #root is empty (bundle still
        // downloading): revealing a blank floor is worse than the bar. 15s cap.
        if ((ready && el >= minShow) || (el >= hardStop && st !== 'none') || el >= 15000) finishLoader();
        else setTimeout(tick, 60);
      } catch (e) { finishLoader(); }
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
  const pending = new Set(); // observed below-the-fold blocks (pruned on view changes)
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
          { duration: 1100, delay: 200, easing: EASE_DRAW, fill: 'backwards' });
      }
      const fill = svg.querySelector('polygon');
      if (fill) fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 700, fill: 'backwards' });
      svg.querySelectorAll('circle').forEach((c, i) => {
        c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
        c.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 360, delay: 300 + i * 90, easing: EASE_POP, fill: 'backwards' });
      });
    });
  }

  // page: true when a whole view (re)mounted -> stagger what's on screen,
  // defer the rest to scroll. false: just new nodes (list item added, tab).
  function choreograph(page, base = 90) {
    const main = d.querySelector('main.workspace');
    if (!main || reduced() || html.classList.contains('ydx-loading')) return;
    // a view seen before this session: content is simply there (no stagger,
    // count-ups, chart draws or scroll reveals); just remember the nodes
    if (calm) { main.querySelectorAll(REVEAL).forEach(el => seen.add(el)); return; }
    if (!io) io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      pending.delete(e.target);
      e.target.removeAttribute('data-ydx-rv');
      enter(e.target, 0);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    // blocks React unmounted before they were scrolled to: stop observing them
    // (the observer would otherwise keep the detached trees alive)
    if (page) pending.forEach(el => { if (!el.isConnected) { io.unobserve(el); pending.delete(el); } });
    const vh = innerHeight;
    // read phase: measure everything first (no layout thrash) ...
    const jobs = [];
    main.querySelectorAll(REVEAL).forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      if (!page) return; // only first-time page content is choreographed
      // nested reveal targets inherit their parent's motion
      const parent = el.parentElement && el.parentElement.closest(REVEAL);
      const nested = !!(parent && main.contains(parent));
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      jobs.push([el, nested, r.top < vh * 0.98]);
    });
    // ... then write (animations, observers). The "pending" hide rule lives in
    // enhance.css (loaded non-blocking): without it, leave off-screen blocks be.
    const css = cssOn();
    let i = 0;
    jobs.forEach(([el, nested, onScreen]) => {
      if (onScreen) { if (!nested) enter(el, base + Math.min(i++, 9) * 55); else countIn(el, base + 110); }
      else if (!nested && css) { el.setAttribute('data-ydx-rv', 'pending'); pending.add(el); io.observe(el); }
    });
    drawChart(main);
  }

  /* ---------- watch the SPA ---------------------------------------------- */
  let lastState = null, lastKey = null, lastDir = html.dir, raf = 0;
  // Round 4, daily-use speed: the full entrance (stagger, count-ups, chart
  // build-ups) plays the first time each view is opened in this page load.
  // Coming back to a view, it is just there, under a quicker curtain.
  // Decided synchronously in the MutationObserver callback, before the new
  // view's nodes get their first style, so the CSS build-ups (html.ydx-calm
  // in enhance.css) never start and then stop; only re-decided when the view
  // itself changes, so a second render of the same view keeps its state.
  const visited = new Set();
  let calm = false, calmPage = null;
  function classify() {
    const f = rootEl && rootEl.firstElementChild;
    const main = f && f.classList.contains('app-shell') ? d.querySelector('main.workspace') : null;
    if (!main) { if (calmPage !== null) { visited.clear(); calmPage = null; calm = false; html.classList.remove('ydx-calm'); } return; }
    const page = (main.className.match(/club-page-([\w-]+)/) || [])[1] || '';
    if (page === calmPage) return;
    calmPage = page;
    // the view the loader reveals counts as a first visit
    calm = loaderGone && visited.has(page);
    visited.add(page);
    html.classList.toggle('ydx-calm', calm);
  }
  // views often render twice (plan drafts / slots arrive from effects): keep
  // choreographing new nodes for a short window after a view change
  let pageWindow = 0;
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
      wipe({ duration: 680, z: 55 });
      if (st === 'app') { pageWindow = now + 700; setTimeout(() => choreograph(true), 40); }
    } else if (loaderGone && st === 'app' && lastKey && key && key !== lastKey) {
      const pageChanged = lastKey.split('|')[0] !== page;
      if (now > busyUntil && pageChanged) {
        const area = shell && (shell.className.match(/area-(\w+)/) || [])[1];
        const crumb = d.querySelector('.breadcrumbs strong');
        const r = mainRect();
        if (r && r.width > 0 && r.height > 0) wipe({ rect: r, area, label: crumb ? crumb.textContent.trim() : '', duration: calm ? 380 : 480 });
      }
      pageWindow = now + 700;
      choreograph(true);
    } else if (loaderGone && st === 'app') {
      choreograph(now < pageWindow);
    }
    if (html.dir !== lastDir) {
      // language switch: the floor names the language it is switching to
      if (loaderGone && lastDir && now > busyUntil) { busyUntil = now + 600; wipe({ duration: 560, z: 55, label: html.dir === 'rtl' ? 'עברית' : 'English' }); }
      lastDir = html.dir;
    }
    lastState = st; lastKey = key || lastKey;
    if (st !== 'app') lastKey = null;
    pointerParallax(st === 'signin');
    try { round5(st, shell); } catch (e) { /* decorative */ }
  }
  const schedule = () => { try { classify(); } catch (e) { /* decorative */ } if (!raf) raf = requestAnimationFrame(check); };
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


  /* ======================================================================
     Round 5: the living chalk floor, celebrations and the barbell toy.
     Big moments live on the sign-in screen (the floor runs at full, the
     "Load the bar" toy) and when work gets done (a set, a finished workout,
     a published plan). Data views get the same floor in "calm" mode: lower
     haze, half the detail, and it rests on a still frame a few seconds after
     the last input.
     ====================================================================== */
  const allowSW = (() => { try { return !!window.__ydxAllowSW || localStorage.getItem('ydx-gl-sw') === '1'; } catch (e) { return !!window.__ydxAllowSW; } })();
  let chalk = null, floorCv = null, floorAsked = false, bgMode = 'signin', bgTint = AREA.red;
  const loadScript = src => new Promise((res, rej) => {
    const s = d.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; d.head.appendChild(s);
  });
  const loadCss = href => new Promise(res => {
    if (d.querySelector(`link[href="${href}"]`)) return res();
    const l = d.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; l.onerror = res; d.head.appendChild(l);
  });
  const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 300));

  // The floor canvas is a fixed sibling of #root at z-index -1: it paints
  // over the body's (root-propagated) speckle floor and under every block,
  // so it shows through the transparent poster and main area, while the
  // chalk cards, sidebar and topbar stay opaque above it. Started after the
  // loader is gone, in idle time, so it never competes with the app's boot.
  function startFloor() {
    if (floorAsked || !cssOn()) return;
    floorAsked = true;
    idle(() => {
      floorCv = d.createElement('canvas');
      floorCv.className = 'ydx-floor';
      floorCv.setAttribute('aria-hidden', 'true');
      d.body.insertBefore(floorCv, d.body.firstChild);
      loadScript('/ydx/chalk.js').then(() => {
        if (!window.ydxChalk) return;
        chalk = window.ydxChalk.mount(floorCv, { allowSoftware: allowSW, still: framed, mode: bgMode, tint: bgTint });
        if (chalk.state === 'fallback') { floorCv.remove(); floorCv = null; chalk = null; return; }
        schedule(); protLater();
      }).catch(() => { if (floorCv) floorCv.remove(); floorCv = null; });
    });
  }
  function setBg(mode, tint) {
    if (window.ydxPlay && window.ydxPlay.isOpen()) { bgMode = mode; return; }
    bgMode = mode; if (tint) bgTint = tint;
    if (chalk) { chalk.setMode(mode); if (tint) chalk.setTint(tint); }
  }

  /* ---------- plate confetti (shared by sets, workouts, plans, the toy) -- */
  // Bumper plates, not paper: discs with a steel hub that flip like coins.
  const PLATE_C = ['#e3242b', '#1d5fd8', '#f7c600', '#16a34a', '#f3f1ea'];
  let cfCv = null, cfCtx = null, cfRaf = 0, cfLast = 0, cfDpr = 1;
  const parts = [];
  function cfLoop(now) {
    cfRaf = 0;
    const dt = cfLast ? Math.min((now - cfLast) / 1000, .05) : 1 / 60; cfLast = now;
    const W = innerWidth, H = innerHeight;
    if (cfCv.width !== Math.round(W * cfDpr) || cfCv.height !== Math.round(H * cfDpr)) { cfCv.width = Math.round(W * cfDpr); cfCv.height = Math.round(H * cfDpr); }
    cfCtx.setTransform(cfDpr, 0, 0, cfDpr, 0, 0);
    cfCtx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age < 0) continue;
      p.vy += 1500 * dt; p.vx *= Math.exp(-dt * 1.2); p.vy *= Math.exp(-dt * .6);
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
      const a = Math.min(1, (p.life - p.age) / .35);
      if (a <= 0 || p.y > H + 60) { parts.splice(i, 1); continue; }
      const sx = Math.cos(p.flip);
      cfCtx.save(); cfCtx.globalAlpha = a; cfCtx.translate(p.x, p.y); cfCtx.rotate(p.rot); cfCtx.scale(Math.abs(sx) < .08 ? .08 : sx, 1);
      cfCtx.beginPath(); cfCtx.arc(0, 0, p.r, 0, Math.PI * 2); cfCtx.fillStyle = p.c; cfCtx.fill();
      cfCtx.beginPath(); cfCtx.arc(0, 0, p.r * .3, 0, Math.PI * 2); cfCtx.fillStyle = '#c9ccd0'; cfCtx.fill();
      cfCtx.beginPath(); cfCtx.arc(0, 0, p.r * .13, 0, Math.PI * 2); cfCtx.fillStyle = '#111'; cfCtx.fill();
      cfCtx.restore();
    }
    if (parts.length) cfRaf = requestAnimationFrame(cfLoop);
    else { cfLast = 0; cfCv.remove(); }
  }
  function burst(x, y, { count = 14, power = 1, size = 1, spread = Math.PI * 2, dir = -Math.PI / 2, delay = 0 } = {}) {
    if (reduced() || !cssOn()) return;
    if (!cfCv) { cfCv = d.createElement('canvas'); cfCv.className = 'ydx-confetti'; cfCv.setAttribute('aria-hidden', 'true'); cfCtx = cfCv.getContext('2d'); }
    cfDpr = Math.min(devicePixelRatio || 1, 1.5);
    if (!cfCv.isConnected) d.body.appendChild(cfCv);
    count = Math.min(count, 90 - parts.length);
    for (let i = 0; i < count; i++) {
      const ang = dir + (Math.random() - .5) * spread, sp = (260 + Math.random() * 520) * power;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: (4 + Math.random() * 6) * size,
        rot: Math.random() * 6, vr: (Math.random() - .5) * 8, flip: Math.random() * 6, vf: 4 + Math.random() * 9,
        c: PLATE_C[i % PLATE_C.length], age: -delay - Math.random() * .05, life: 1.1 + Math.random() * .7 });
    }
    if (!cfRaf) { cfLast = 0; cfRaf = requestAnimationFrame(cfLoop); }
  }
  // the big one: plate cannons from both bottom corners, a chalk burst in the
  // floor and the outlined headline slamming in, then wiped off by the plates
  function cheer(text, sub) {
    try { navigator.vibrate && navigator.vibrate([14, 50, 22]); } catch (e) { /* unsupported */ }
    if (!cssOn()) return;
    const W = innerWidth, H = innerHeight;
    if (chalk) { chalk.clap(W / 2, H * .55, 1.6); chalk.setTint(AREA.green); setTimeout(() => chalk && chalk.setTint(bgTint), 2400); }
    const big = Math.min(1.7, .9 + W / 1800);
    burst(0, H, { count: 30, power: 1.5, size: big, dir: -Math.PI / 3, spread: .9 });
    burst(W, H, { count: 30, power: 1.5, size: big, dir: -Math.PI * 2 / 3, spread: .9, delay: .08 });
    burst(W / 2, H * .45, { count: 22, power: .9, size: big * .9, delay: .25 });
    const el = d.createElement('div');
    el.className = 'ydx-cheer'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="ydx-cheer-bg"></i><div class="ydx-cheer-in"><b></b><span></span></div>';
    el.querySelector('b').textContent = text;
    el.querySelector('span').textContent = sub || '';
    d.body.appendChild(el);
    const inner = el.querySelector('.ydx-cheer-in');
    // the floor dims behind the headline for a beat, so it reads over any view
    el.firstChild.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: reduced() ? 1600 : 2200, easing: 'ease-out', fill: 'forwards' });
    if (reduced()) {
      inner.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1600, fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
      return;
    }
    const s = dirSign();
    const b = inner.querySelector('b');
    b.animate([{ transform: 'scale(1.6)', opacity: 0, letterSpacing: '.12em' }, { transform: 'scale(.96)', opacity: 1, offset: .55 }, { transform: 'scale(1)', opacity: 1, letterSpacing: '0em' }],
      { duration: 520, easing: EASE_POP, fill: 'backwards' });
    b.animate([{ color: 'transparent' }, { color: '#f3f1ea' }], { duration: 380, delay: 380, easing: 'ease-out', fill: 'both' });
    inner.querySelector('span').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 420, easing: EASE_OUT, fill: 'backwards' });
    inner.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${s * 18}vw)`, opacity: 0 }], { duration: 520, delay: 1650, easing: EASE_WIPE, fill: 'forwards' })
      .finished.then(() => el.remove(), () => el.remove());
  }
  window.ydxFX = { burst, cheer, chalk: () => chalk, mode: () => bgMode };

  // sets, the last set, the finished workout, a published plan
  let finishAt = 0, publishAt = 0, publishRect = null, scoreWas = null;
  const T5 = {
    he: { done: 'אימון הושלם.', sets: n => `${n} סטים · כל חזרה נחשבת`, chip: 'להעמיס את המוט' },
    en: { done: 'Workout done.', sets: n => `${n} sets · every rep counts`, chip: 'Load the bar' }
  };
  const t5 = () => T5[html.lang === 'en' ? 'en' : 'he'];
  d.addEventListener('click', e => {
    const tgt = e.target && e.target.closest ? e.target : null;
    if (!tgt) return;
    const set = tgt.closest('.set-check');
    if (set && !set.classList.contains('checked')) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!set.isConnected || !set.classList.contains('checked')) return;
        const r = set.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, { count: 12, power: .62, size: .8 });
        if (chalk) chalk.poke();
        const all = d.querySelectorAll('main.workspace .set-check');
        if (all.length && [...all].every(b => b.classList.contains('checked'))) {
          const sc = d.querySelector('.session-score');
          const rr = sc ? sc.getBoundingClientRect() : r;
          burst(rr.left + rr.width / 2, rr.top + rr.height / 2, { count: 26, power: .95, delay: .12 });
          const fin = d.querySelector('.session-actions .btn.primary');
          if (fin && !reduced()) fin.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 520, delay: 250, easing: EASE_POP });
        }
      }));
    }
    if (tgt.closest('.session-actions .btn.primary')) finishAt = performance.now();
    const pub = tgt.closest('.plan-actions .btn.primary');
    if (pub) { publishAt = performance.now(); publishRect = pub.getBoundingClientRect(); }
    // a tap on the sign-in poster claps chalk into the air
    if (tgt.closest('.signin-poster') && chalk) chalk.clap(e.clientX, e.clientY, 1.1);
  }, true);

  /* ---------- the "Load the bar" chip on the sign-in poster -------------- */
  let chip = null, playReady = null;
  function loadPlay() {
    // play.css sets --ydx-play: without it the toy would render unstyled, so it does not open
    if (!playReady) playReady = Promise.all([loadCss('/ydx/play.css'), loadScript('/ydx/play.js')]).then(() => {
      if (!window.ydxPlay || getComputedStyle(html).getPropertyValue('--ydx-play').trim() !== '1') throw new Error('toy unavailable');
    }).catch(e => { playReady = null; throw e; });
    return playReady;
  }
  // the sign-in spotlight dims the poster away from the pointer; the copy
  // block and footer line are spared so their text keeps AA contrast
  function protectText() {
    const els = [...d.querySelectorAll('.signin-poster .poster-copy, .signin-poster .poster-foot')].map(e => e.getBoundingClientRect()).filter(r => r.width);
    if (!els.length) { chalk.setProtect(null); return; }
    chalk.setProtect({ left: Math.min(...els.map(r => r.left)), top: Math.min(...els.map(r => r.top)), right: Math.max(...els.map(r => r.right)), bottom: Math.max(...els.map(r => r.bottom)) });
  }
  let protRaf = 0;
  const protLater = () => { if (!protRaf && chalk) protRaf = requestAnimationFrame(() => { protRaf = 0; if (chalk && appState() === 'signin') protectText(); }); };
  addEventListener('resize', protLater, { passive: true });
  addEventListener('scroll', protLater, { passive: true });
  function placeChip() {
    if (!chip) return;
    const copy = d.querySelector('.signin-poster .poster-copy');
    if (!copy) return;
    const r = copy.getBoundingClientRect();
    const ch = chip.offsetHeight || 44;
    chip.style.top = (r.top + scrollY - ch - 12) + 'px';
    chip.style.left = 'auto';
    chip.style.right = (d.documentElement.clientWidth - r.right) + 'px';
  }
  function ensureChip(on) {
    if (!on) { if (chip) { chip.remove(); chip = null; removeEventListener('resize', placeChip); } return; }
    if (!cssOn()) return;
    if (!chip) {
      chip = d.createElement('button');
      chip.type = 'button'; chip.className = 'ydx-play-chip';
      chip.innerHTML = '<span class="ydx-chip-plate" aria-hidden="true"></span><span class="ydx-chip-txt"></span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      chip.addEventListener('pointerenter', () => { loadPlay().catch(() => {}); }, { passive: true });
      chip.addEventListener('focus', () => { loadPlay().catch(() => {}); });
      chip.addEventListener('click', () => {
        const poster = d.querySelector('.signin-poster');
        const rect = poster ? poster.getBoundingClientRect() : null;
        loadPlay().then(() => window.ydxPlay.open({ rect, opener: chip })).catch(() => { chip.classList.add('is-off'); });
      });
      d.body.appendChild(chip);
      addEventListener('resize', placeChip, { passive: true });
      idle(() => loadPlay().catch(() => { if (chip) chip.classList.add('is-off'); })); // a dead chip is never shown for long
    }
    const txt = t5().chip;
    if (chip.querySelector('.ydx-chip-txt').textContent !== txt) chip.querySelector('.ydx-chip-txt').textContent = txt;
    placeChip();
  }

  function round5(st, shell) {
    if (loaderGone) startFloor();
    if (st === 'signin') setBg('signin', AREA.red);
    else if (st === 'loading' || st === 'none') setBg('app', AREA.red);
    else if (st === 'app') {
      const area = shell && (shell.className.match(/area-(\w+)/) || [])[1];
      setBg('app', AREA[area] || AREA.red);
    }
    ensureChip(st === 'signin' && loaderGone);
    if (chalk && st === 'signin') protectText();
    // finished workout: only when the Finish button was just pressed, so
    // opening a day that is already complete never celebrates
    const sc = d.querySelector('main.workspace .session-score');
    const fin = !!(sc && sc.classList.contains('is-finished'));
    if (sc && fin && scoreWas === false && performance.now() - finishAt < 8000) {
      finishAt = 0;
      const n = d.querySelectorAll('main.workspace .set-check.checked').length;
      cheer(t5().done, n ? t5().sets(n) : '');
    }
    scoreWas = sc ? fin : null;
    // published plan: the app shows a success toast when the save landed
    if (publishAt && performance.now() - publishAt < 8000) {
      const toast = d.querySelector('.toast:not(.error)');
      if (toast) {
        publishAt = 0;
        const r = publishRect;
        if (r) burst(r.left + r.width / 2, r.top + r.height / 2, { count: 30, power: .9 });
        if (chalk) chalk.poke();
      } else if (d.querySelector('.toast.error')) publishAt = 0;
    }
  }
  // the loader finishing does not always coincide with a DOM change
  const r5Kick = setInterval(() => { if (loaderGone) { clearInterval(r5Kick); schedule(); } }, 200);
})();
