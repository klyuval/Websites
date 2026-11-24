/* Cassata — ydx enhancement layer (loader lift, drip page transitions, motion, small fixes).
   Vanilla JS, no dependencies, no build step.
   Rules this file follows (the app is a React 19 / TanStack Start build hydrated on `document`):
   - never adds, removes or reorders nodes inside .site — only data-ydx-* attributes, classes on
     <html>, and Web Animations using the individual `translate` / `rotate` / `scale` properties,
     so nothing fights the site's own `transform`s or framer-motion's inline styles;
   - everything it adds to the DOM (loader, cursor) sits directly in <body>, outside the app;
   - all motion is skipped under prefers-reduced-motion. */
(() => {
  'use strict';
  const d = document, h = d.documentElement, w = window;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';          // the site's --ease
  const SPRING = 'cubic-bezier(.34,1.56,.64,1)';    // the site's --spring
  const INOUT = 'cubic-bezier(.76,0,.24,1)';
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const anim = (el, kf, o) => { if (!el || !el.animate) return null; try { return el.animate(kf, o); } catch (e) { return null; } };
  const ss = (() => { try { return w.sessionStorage; } catch (e) { return null; } })();
  const isEn = () => !!$('.site.english');

  if (!RM) h.classList.add('ydx-motion');

  /* ---------------------------------------------------------------- */
  /* 1. Loader: wait for the real menu, then lift the drip curtain      */
  /* ---------------------------------------------------------------- */
  const L = w.__ydxLoader || null;
  w.__ydxTook = true; // tells the inline failsafe that this script is in charge
  const loader = L && L.el && L.el.isConnected ? L.el : null;
  const inner = loader && $('.ydx-l__in', loader);
  const drip = loader && $('.ydx-l__drip', loader);
  const OFF = 'translate3d(0,calc(-100% - 320px),0)'; // fully above the viewport, drips included
  let lifted = !loader;

  // Minimum on-screen time per mode: first visit lets the three scoops land; repeat visits,
  // page-to-page arrivals and the hub's iframe preview are much shorter.
  const MIN = { first: 1250, repeat: 380, nav: 120, frame: 240, rm: 0 };
  const HARD = 4000;

  const whenLoad = new Promise(r => (d.readyState === 'complete' ? r() : w.addEventListener('load', r, { once: true })));
  const whenFonts = d.fonts && d.fonts.ready ? d.fonts.ready.catch(() => {}) : Promise.resolve();
  // "Data settled" = the app no longer shows its yellow "checking…" state (or 2.6s passed,
  // e.g. when the API is unreachable and the app stays in its waiting/error state).
  const whenData = new Promise(r => {
    const t = performance.now();
    (function poll() {
      if (!$('.is-wait') || performance.now() - t > 2600) return r();
      setTimeout(poll, 90);
    })();
  });

  function lift() {
    if (lifted) return;
    lifted = true;
    h.classList.remove('ydx-loading');
    loader.style.pointerEvents = 'none';
    const mode = L.mode;
    if (mode === 'rm' || RM) {
      const a = anim(loader, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' });
      const end = () => park();
      a ? a.finished.then(end, end) : end();
      return;
    }
    const dur = mode === 'frame' ? 460 : mode === 'nav' ? 640 : 780;
    // the stack squashes, then everything is pulled up; the drips stretch as the curtain rises
    anim(inner, [{ translate: '0 0', scale: '1 1', opacity: 1 }, { translate: '0 6px', scale: '1.04 .94', opacity: 1, offset: .25 }, { translate: '0 -70px', scale: '.96 1.04', opacity: 0 }],
      { duration: dur * .55, easing: 'cubic-bezier(.5,0,.7,.2)', fill: 'forwards' });
    anim(drip, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.9)' }], { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    const a = anim(loader, [{ transform: 'translate3d(0,0,0)' }, { transform: OFF }], { duration: dur, delay: 70, easing: INOUT, fill: 'forwards' });
    entrance(mode === 'frame' ? 0 : 160);
    if (w.__ydxFlush) w.__ydxFlush();
    const end = () => park();
    a ? a.finished.then(end, end) : end();
  }

  // Keep the curtain in <body> (hidden) so page transitions can drop it again.
  function park() {
    if (!loader) return;
    loader.getAnimations({ subtree: true }).forEach(a => a.cancel());
    loader.hidden = true;
    loader.style.display = 'none';
    loader.style.transform = OFF;
  }

  if (loader) {
    const min = MIN[L.mode] != null ? MIN[L.mode] : 900;
    const since = () => performance.now() - L.t0;
    const waitMin = new Promise(r => setTimeout(r, Math.max(0, min - since())));
    Promise.all([whenLoad, whenFonts, whenData, waitMin]).then(lift);
    setTimeout(lift, Math.max(0, HARD - since())); // never trap anyone
  }

  // Back/forward cache: a page restored mid-transition must not stay covered.
  w.addEventListener('pageshow', e => {
    if (!e.persisted || !loader) return;
    lifted = true; h.classList.remove('ydx-loading'); park();
  });

  /* ---------------------------------------------------------------- */
  /* 2. Entrance choreography as the curtain leaves                     */
  /* ---------------------------------------------------------------- */
  function entrance(base) {
    if (RM) return;
    const add = (el, kf, o) => el && anim(el, kf, Object.assign({ fill: 'backwards', easing: EASE }, o, { delay: base + (o.delay || 0) }));
    const up = (px) => [{ translate: `0 ${px}px`, opacity: 0 }, { translate: '0 0', opacity: 1 }];
    add($('.header .brand'), [{ translate: '0 -40px', rotate: '-12deg', opacity: 0 }, { translate: '0 0', rotate: '0deg', opacity: 1 }], { duration: 760, easing: SPRING, delay: 60 });
    add($('.header .nav'), up(-30), { duration: 640, easing: SPRING, delay: 140 });
    add($('.header .language'), [{ translate: '0 -30px', rotate: '8deg', opacity: 0 }, { translate: '0 0', rotate: '0deg', opacity: 1 }], { duration: 640, easing: SPRING, delay: 220 });

    // home hero
    add($('.hero__top'), [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 320 });
    add($('.hero__coupe-wrap'), [{ translate: '0 24%', scale: '.84' }, { translate: '0 0', scale: '1' }], { duration: 1050, easing: 'cubic-bezier(.2,1.25,.35,1)', delay: 0 });
    add($('.hero .seal'), [{ scale: '0', rotate: '-150deg' }, { scale: '1', rotate: '0deg' }], { duration: 820, easing: SPRING, delay: 520 });
    $$('.hero__copy > *').forEach((el, i) => add(el, up(28), { duration: 720, delay: 340 + i * 90 }));
    add($('.hero__rail-label'), [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 520 });
    $$('.hero .token').forEach((el, i) => add(el, [{ scale: '0' }, { scale: '1' }], { duration: 620, easing: SPRING, delay: 560 + i * 55 }));
    add($('.ticker'), [{ translate: '0 100%' }, { translate: '0 0' }], { duration: 700, easing: EASE, delay: 300 });

    // staff page
    $$('.host-title > *').forEach((el, i) => add(el, up(30), { duration: 700, delay: 200 + i * 90 }));
    add($('.host-main > .notice, .login-panel'), [{ translate: '0 40px', rotate: '-3deg', opacity: 0 }, { translate: '0 0', rotate: '0deg', opacity: 1 }], { duration: 760, easing: SPRING, delay: 420 });
    add($('.login-panel .tiny-star'), [{ scale: '0', rotate: '-180deg' }, { scale: '1', rotate: '0deg' }], { duration: 700, easing: SPRING, delay: 700 });
  }

  /* ---------------------------------------------------------------- */
  /* 3. Page transitions: the drip curtain pours down, then lifts       */
  /* ---------------------------------------------------------------- */
  let leaving = false;
  function cover(href) {
    if (!loader || leaving) { location.href = href; return; }
    leaving = true;
    const go = () => { try { ss && ss.setItem('ydx-nav', String(Date.now())); } catch (e) {} location.href = href; };
    loader.getAnimations({ subtree: true }).forEach(a => a.cancel());
    loader.setAttribute('data-mode', 'nav');
    loader.setAttribute('data-lang', isEn() ? 'en' : 'he');
    const hand = $('.ydx-l__hand', loader);
    if (hand) hand.textContent = isEn() ? 'Checking the counter…' : 'רגע, בודקים מה יש…';
    loader.hidden = false;
    loader.style.display = '';
    loader.style.pointerEvents = 'auto';
    const dur = 520;
    anim(drip, [{ transform: 'scaleY(1.7)' }, { transform: 'scaleY(1)' }], { duration: dur + 160, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' });
    anim(inner, [{ translate: '0 -60px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 340, delay: dur - 200, easing: EASE, fill: 'both' });
    const a = anim(loader, [{ transform: OFF }, { transform: 'translate3d(0,0,0)' }], { duration: dur, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
    const t = setTimeout(go, dur + 260); // in case `finished` never resolves
    if (a) a.finished.then(() => { clearTimeout(t); go(); }, () => {});
  }

  d.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    const samePage = u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && u.search === location.search;
    if (samePage && u.hash) return; // in-page anchor: the site's Lenis already glides there
    if (RM || /\.(xml|txt|jpe?g|png|webp|svg|pdf)$/i.test(u.pathname)) return;
    e.preventDefault();
    cover(u.href);
  });

  /* Language switch: the other language scoops open from the toggle (View Transitions).
     We hold the first click, then replay it inside startViewTransition. */
  let replaying = false;
  w.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.language');
    if (!b || replaying || RM || !d.startViewTransition) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const r = b.getBoundingClientRect();
    h.style.setProperty('--ydx-vx', Math.round(r.left + r.width / 2) + 'px');
    h.style.setProperty('--ydx-vy', Math.round(r.top + r.height / 2) + 'px');
    h.classList.add('ydx-vt-lang');
    let vt;
    try {
      vt = d.startViewTransition(() => new Promise(res => {
        replaying = true; b.click(); replaying = false;
        setTimeout(res, 30); // React commits the discrete update synchronously; one tick is plenty
      }));
    } catch (err) { h.classList.remove('ydx-vt-lang'); replaying = true; b.click(); replaying = false; return; }
    vt.finished.finally(() => h.classList.remove('ydx-vt-lang'));
  }, true);

  if (RM) { onReadyStatic(); return; }

  /* ---------------------------------------------------------------- */
  /* 4. Scroll reveals (cards drop in like scoops, prices get stamped)  */
  /* ---------------------------------------------------------------- */
  const held = [];
  w.__ydxFlush = () => { held.splice(0).forEach((el, i) => reveal(el, i + 2)); };
  const supportsTimeline = w.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  const io = new IntersectionObserver(entries => {
    const hits = entries.filter(e => e.isIntersecting);
    const rtl = !isEn();
    hits.sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) ||
      (rtl ? b.boundingClientRect.left - a.boundingClientRect.left : a.boundingClientRect.left - b.boundingClientRect.left));
    hits.forEach((e, i) => {
      io.unobserve(e.target);
      if (lifted) reveal(e.target, i); else held.push(e.target); // still under the curtain: wait
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

  function reveal(el, i) {
    const k = el.getAttribute('data-ydx-r');
    el.setAttribute('data-ydx-seen', '');
    const lag = Math.min(i, 6) * 85;
    if (k === 'card' || k === 'note') {
      const tilt = k === 'note' ? -9 : (i % 2 ? 4 : -4);
      anim(el, [{ translate: '0 80px', rotate: tilt + 'deg', opacity: 0 }, { translate: '0 -6px', rotate: (-tilt / 5) + 'deg', opacity: 1, offset: .65 }, { translate: '0 0', rotate: '0deg', opacity: 1 }],
        { duration: 820, delay: lag, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
      const art = $('.card__art img', el);
      // the scoop lands a beat after its card, with a little squash
      anim(art, [{ translate: '0 -40px', scale: '.9 1.1' }, { translate: '0 0', scale: '1.08 .9', offset: .6 }, { translate: '0 0', scale: '1 1' }],
        { duration: 700, delay: lag + 160, easing: 'cubic-bezier(.3,.6,.35,1)', fill: 'backwards' });
    } else if (k === 'tickets') {
      $$('.ticket__price, .ticket__ask', el).forEach((p, j) => anim(p,
        [{ scale: '1.9', rotate: '-14deg', opacity: 0 }, { scale: '.92', rotate: '2deg', opacity: 1, offset: .7 }, { scale: '1', rotate: '0deg', opacity: 1 }],
        { duration: 560, delay: 380 + j * 160, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'backwards' }));
    } else if (k === 'pop') {
      anim(el, [{ scale: '0', rotate: '-120deg', opacity: 0 }, { scale: '1', rotate: '0deg', opacity: 1 }], { duration: 800, delay: 120 + lag, easing: SPRING, fill: 'backwards' });
    } else { // 'up'
      anim(el, [{ translate: '0 34px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 760, delay: lag, easing: EASE, fill: 'backwards' });
    }
  }

  const reg = new WeakSet();
  function register(el, kind, animateIfVisible) {
    if (!el || reg.has(el)) return;
    reg.add(el);
    const r = el.getBoundingClientRect();
    const visible = r.top < innerHeight && r.bottom > 0;
    // Mounted while already on screen after the page is live (e.g. a filter change):
    // the app's own framer-motion enter animation covers it — don't double-animate.
    if (visible && !animateIfVisible) { el.setAttribute('data-ydx-seen', ''); el.setAttribute('data-ydx-r', kind); return; }
    el.setAttribute('data-ydx-r', kind);
    io.observe(el);
  }

  /* ---------------------------------------------------------------- */
  /* 5. Small live details                                             */
  /* ---------------------------------------------------------------- */
  // Today's row in the opening hours (Asia/Jerusalem): Sun–Wed / Thu / Fri.
  function markToday() {
    const ps = $$('.hours p');
    if (!ps.length) return;
    let wd;
    try { wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' }).format(new Date()); }
    catch (e) { wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]; }
    const idx = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 1, Fri: 2 }[wd];
    ps.forEach((p, i) => {
      if (i === idx) { if (!p.hasAttribute('data-ydx-today')) p.setAttribute('data-ydx-today', ''); }
      else if (p.hasAttribute('data-ydx-today')) p.removeAttribute('data-ydx-today');
    });
  }

  // In-view toggles: hours highlighter, visit headline swirl "churning" (paused off-screen).
  let churn = null;
  const live = new IntersectionObserver(entries => entries.forEach(e => {
    const el = e.target;
    if (el.classList.contains('hours')) { if (e.isIntersecting) { el.classList.add('ydx-on'); live.unobserve(el); } return; }
    if (el.classList.contains('visit__h')) {
      if (!churn) churn = anim(el, [
        { backgroundSize: '112% auto', backgroundPosition: '20% 35%' },
        { backgroundSize: '140% auto', backgroundPosition: '80% 65%' }],
        { duration: 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      if (churn) e.isIntersecting ? churn.play() : churn.pause();
    }
  }), { threshold: 0.2 });
  const liveSeen = new WeakSet();
  const watchLive = el => { if (el && !liveSeen.has(el)) { liveSeen.add(el); live.observe(el); } };

  // Count badges wobble when the number changes (menu refreshes every few seconds).
  const counts = new WeakMap();
  function wobbleCounts() {
    $$('.menu__count, .tabs button span, .hero__count').forEach(el => {
      const t = el.textContent, prev = counts.get(el);
      counts.set(el, t);
      if (prev != null && prev !== t) anim(el, [{ scale: '1' }, { scale: '1.35', rotate: '-12deg' }, { scale: '1', rotate: '0deg' }], { duration: 520, easing: SPRING });
    });
  }

  // Flavour sheet: its copy staggers in under the site's own `pop`.
  const sheets = new WeakSet();
  function sheetIn() {
    const s = $('.sheet');
    if (!s || sheets.has(s)) return;
    sheets.add(s);
    $$('.sheet__copy > *', s).forEach((el, i) => anim(el, [{ translate: '0 18px', opacity: 0 }, { translate: '0 0', opacity: 1 }],
      { duration: 520, delay: 140 + i * 55, easing: EASE, fill: 'backwards' }));
  }

  // Magnetic CTAs (fine pointers only): the pill leans toward the cursor.
  const mags = new WeakSet();
  function magnet(el) {
    if (!FINE || mags.has(el)) return;
    mags.add(el);
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.translate = `${(x * 14).toFixed(1)}px ${(y * 10).toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  }

  // Ticker: scrolling speeds the marquee up, then it eases back to its own pace.
  let tracks = [], rate = 1, vel = 0, lastY = scrollY, tRaf = 0;
  const refreshTracks = () => { tracks = $$('.ticker__track').flatMap(t => t.getAnimations()); };
  function tickTicker() {
    tRaf = 0;
    const target = 1 + Math.min(vel, 80) / 9;
    rate += (target - rate) * 0.12;
    vel *= 0.86;
    tracks.forEach(a => { a.playbackRate = rate; });
    if (Math.abs(rate - 1) > 0.01 || vel > 0.3) tRaf = requestAnimationFrame(tickTicker);
    else { rate = 1; tracks.forEach(a => { a.playbackRate = 1; }); }
  }
  w.addEventListener('scroll', () => {
    const y = scrollY; vel = Math.max(vel, Math.abs(y - lastY)); lastY = y;
    if (!tRaf && tracks.length) tRaf = requestAnimationFrame(tickTicker);
  }, { passive: true });

  /* ---------------------------------------------------------------- */
  /* 6. Scoop cursor (fine pointers): a red dot that turns into a ✳      */
  /*    sticker over anything that opens a flavour                       */
  /* ---------------------------------------------------------------- */
  if (FINE && w.self === w.top) {
    const c = d.createElement('div');
    c.className = 'ydx-cursor';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i></i><b>✳</b>';
    d.body.appendChild(c);
    let x = -100, y = -100, cx = -100, cy = -100, raf = 0;
    const loop = () => {
      cx += (x - cx) * 0.24; cy += (y - cy) * 0.24;
      c.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    d.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      const t = e.target;
      const field = t.closest && t.closest('input, textarea, select, [contenteditable]');
      const hot = !field && t.closest && t.closest('.card, .hero__coupe:not([disabled]), .token');
      const link = !field && !hot && t.closest && t.closest('a, button, [role=button], label');
      c.classList.toggle('is-on', !field);
      c.classList.toggle('is-hot', !!hot);
      c.classList.toggle('is-link', !!link);
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    d.addEventListener('pointerdown', () => c.classList.add('is-down'));
    d.addEventListener('pointerup', () => c.classList.remove('is-down'));
    d.documentElement.addEventListener('pointerleave', () => c.classList.remove('is-on'));
    w.addEventListener('blur', () => c.classList.remove('is-on'));
  }

  /* ---------------------------------------------------------------- */
  /* 7. Scan the app (and re-scan when React re-renders)                */
  /* ---------------------------------------------------------------- */
  let pageLive = false; // becomes true once the curtain has gone
  function scan() {
    $$('.grid .card').forEach(el => register(el, 'card', !pageLive));
    $$('.grid .tile-note').forEach(el => register(el, 'note', !pageLive));
    register($('.tickets'), 'tickets', true);
    register($('.menu__count'), 'pop', true);
    register($('.visit__seal'), 'pop', true);
    $$('.menu__filters, .menu__foot, .footer-row').forEach(el => register(el, 'up', true));
    if (!supportsTimeline) $$('.reveal').forEach(el => register(el, 'up', true));
    markToday();
    watchLive($('.hours'));
    watchLive($('.visit__h'));
    $$('.btn').forEach(magnet);
    wobbleCounts();
    sheetIn();
    refreshTracks();
  }
  let sRaf = 0;
  const mo = new MutationObserver(() => { if (!sRaf) sRaf = requestAnimationFrame(() => { sRaf = 0; scan(); }); });
  mo.observe(d.body, { childList: true, subtree: true, characterData: true });
  scan();
  const goLive = () => { pageLive = true; };
  if (!loader) goLive(); else Promise.all([whenLoad]).then(() => setTimeout(goLive, Math.max(0, (MIN[L.mode] || 0) + 400 - (performance.now() - L.t0))));

  function onReadyStatic() { /* reduced motion: only the static niceties */
    const run = () => { try { markToday(); } catch (e) {} };
    run();
    new MutationObserver(run).observe(d.body, { childList: true, subtree: true });
  }
})();
