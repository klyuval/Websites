/* Cassata — ydx enhancement layer (loader lift, drip page transitions, motion, small fixes).
   Vanilla JS, no dependencies, no build step.
   Rules this file follows (the app is a React 19 / TanStack Start build hydrated on `document`):
   - never adds, removes or reorders nodes inside .site — only data-ydx-* attributes, classes on
     <html>, an inline `translate` on the magnetic .btn, and Web Animations using the individual
     `translate` / `rotate` / `scale` properties, so nothing fights the site's own `transform`s or
     framer-motion's inline styles;
   - everything it adds to the DOM (loader, cursor, the closing sheet's ghost) sits directly in
     <body>, outside the app;
   - all motion is skipped under prefers-reduced-motion;
   - it can never leave the page covered: the inline failsafe in <body> fades the loader if this
     file doesn't run (DOMContentLoaded) or hasn't lifted it by 4.5s, lift() parks the curtain if
     anything throws, and a page transition whose navigation never commits lifts it again. */
(() => {
  'use strict';
  const d = document, h = d.documentElement, w = window;
  // Boot once, even if the tag is duplicated or the file gets injected a second time.
  if (w.__ydxBooted) return;
  w.__ydxBooted = true;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Motion tokens (round 4): every animation below uses one of these five curves.
  // Mirrored in enhance.css as --ydx-inout / --ydx-in / --ydx-land.
  const EASE = 'cubic-bezier(.2,.8,.2,1)';          // the site's --ease: entrances, reveals
  const SPRING = 'cubic-bezier(.34,1.56,.64,1)';    // the site's --spring: sticker pops, overshoots
  const INOUT = 'cubic-bezier(.65,0,.35,1)';        // curtains and wipes (drip lift/pour, language scoop); soft enough that a pour answers a click at once
  const IN = 'cubic-bezier(.5,0,.75,0)';            // exits (sheet ghost, the loader stack leaving)
  const LAND = 'cubic-bezier(.3,.6,.35,1)';         // squash-and-settle landings (scoops, price stamps)
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const anim = (el, kf, o) => { if (!el || !el.animate) return null; try { return el.animate(kf, o); } catch (e) { return null; } };
  const ss = (() => { try { return w.sessionStorage; } catch (e) { return null; } })();
  const isEn = () => !!$('.site.english');
  // enhance.css is inserted by the inline <head> script without blocking render (w.__ydxCss
  // settles when it loads or fails). It sets --ydx-css on :root; without it the cursor and the
  // sheet ghost would render as unstyled nodes, so they wait for it and are skipped if it failed.
  const whenCss = Promise.race([w.__ydxCss || Promise.resolve(), new Promise(r => setTimeout(r, 3000))]);
  const cssOK = () => getComputedStyle(h).getPropertyValue('--ydx-css').trim() === '1';

  if (!RM) h.classList.add('ydx-motion');

  /* ---------------------------------------------------------------- */
  /* 1. Loader: wait for the real menu, then lift the drip curtain      */
  /* ---------------------------------------------------------------- */
  const L = w.__ydxLoader || null;
  const loader = L && L.el && L.el.isConnected ? L.el : null;
  const inner = loader && $('.ydx-l__in', loader);
  const drip = loader && $('.ydx-l__drip', loader);
  const OFF = 'translate3d(0,calc(-100% - 320px),0)'; // fully above the viewport, drips included
  // If the inline failsafe already faded the loader out (this file arrived very late), don't
  // lift it again or replay the entrance on a page the visitor is already reading.
  let lifted = !loader || !!L.failsafe;
  let pageLive = lifted; // true a moment after the curtain has gone (see register()); at once if it never showed
  let leaving = false, goT = 0, safeT = 0; // page-transition state (section 3)
  let flush = null; // reveals held while the curtain was down (section 4)

  // Minimum on-screen time per mode: first visit lets the three scoops land; repeat visits,
  // page-to-page arrivals and the hub's iframe preview are much shorter.
  const MIN = { first: 1250, repeat: 380, nav: 120, frame: 240, rm: 0 };
  // the hub's iframe preview stays under ~800ms total; a page-to-page arrival is capped well
  // under the first-visit 4s so the drip transition never feels like a second loading screen
  const HARD = L && L.mode === 'frame' ? 340 : L && L.mode === 'nav' ? 1500 : 4000;
  const NAV = !!(L && L.mode === 'nav');

  // Page-to-page arrivals don't wait for every image (`load`); the DOM, fonts and data are
  // what the first screen needs, and images fade in on their own.
  const whenLoad = new Promise(r => {
    if (d.readyState === 'complete') return r();
    w.addEventListener('load', r, { once: true });
    if (NAV) setTimeout(r, 450);
  });
  const whenFonts = d.fonts && d.fonts.ready
    ? Promise.race([d.fonts.ready.catch(() => {}), new Promise(r => NAV && setTimeout(r, 600))])
    : Promise.resolve();
  // "Data settled" = the app no longer shows its yellow "checking…" state (or 2.6s passed,
  // e.g. when the API is unreachable and the app stays in its waiting/error state).
  const whenData = new Promise(r => {
    const t = performance.now();
    (function poll() {
      if (!$('.is-wait') || performance.now() - t > (NAV ? 1100 : 2600)) return r();
      setTimeout(poll, 90);
    })();
  });

  // After the curtain is gone (or was never there): release held reveals; a moment later the
  // page counts as "live", so cards React mounts on screen are left to framer's own enter.
  function settle() {
    try { if (flush) flush(); } catch (e) {}
    setTimeout(() => { pageLive = true; }, 400);
  }

  function lift() {
    if (lifted) return;
    lifted = true;
    if (L) L.done = true; // the inline failsafe stands down
    h.classList.remove('ydx-loading');
    try {
      if (leaving) return; // a link was activated under the curtain (keyboard): it is already pouring
      loader.style.pointerEvents = 'none';
      const mode = L.mode;
      if (mode === 'rm' || RM) {
        const a = anim(loader, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' });
        a ? a.finished.then(park, park) : park();
        return;
      }
      const dur = mode === 'frame' ? 420 : mode === 'nav' ? 640 : mode === 'repeat' ? 620 : 780;
      // the stack squashes, then everything is pulled up; the drips stretch as the curtain rises
      anim(inner, [{ translate: '0 0', scale: '1 1', opacity: 1 }, { translate: '0 6px', scale: '1.04 .94', opacity: 1, offset: .25 }, { translate: '0 -70px', scale: '.96 1.04', opacity: 0 }],
        { duration: dur * .55, easing: IN, fill: 'forwards' });
      anim(drip, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.9)' }], { duration: dur, easing: INOUT, fill: 'forwards' });
      const a = anim(loader, [{ transform: 'translate3d(0,0,0)' }, { transform: OFF }], { duration: dur, delay: 70, easing: INOUT, fill: 'forwards' });
      a ? a.finished.then(park, park) : park();
      try { entrance(mode === 'frame' ? 0 : 160); } catch (e) {}
    } catch (e) { park(); } // never leave the page covered
    finally { settle(); }
  }

  // Keep the curtain in <body> (hidden) so page transitions can drop it again.
  function park() {
    if (!loader || leaving) return;
    try { loader.getAnimations({ subtree: true }).forEach(a => a.cancel()); } catch (e) {}
    loader.hidden = true;
    loader.style.display = 'none';
    loader.style.pointerEvents = 'none';
    loader.style.opacity = ''; loader.style.transition = ''; // left behind by the inline failsafe
    loader.style.transform = OFF;
  }

  if (loader && !lifted) {
    const min = MIN[L.mode] != null ? MIN[L.mode] : 900;
    const since = () => performance.now() - L.t0;
    const waitMin = new Promise(r => setTimeout(r, Math.max(0, min - since())));
    Promise.all([whenLoad, whenFonts, whenData, whenCss, waitMin]).then(lift);
    setTimeout(lift, Math.max(0, HARD - since())); // never trap anyone
  } else if (loader) { // the failsafe is fading it: tidy up once it has gone
    settle(); setTimeout(park, 420);
  }
  w.__ydxTook = true; // tells the inline failsafe that this script is running and has armed its timers

  // Back/forward cache: a page restored mid-load or mid-transition must not stay covered, and
  // must not keep a stale "leaving" state that would skip the next transition.
  w.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    clearTimeout(goT); clearTimeout(safeT); goT = safeT = 0;
    leaving = false;
    h.classList.remove('ydx-loading');
    if (!loader) return;
    if (!lifted) { lifted = true; if (L) L.done = true; settle(); }
    park();
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
    add($('.hero__coupe-wrap'), [{ translate: '0 24%', scale: '.84' }, { translate: '0 0', scale: '1' }], { duration: 1050, easing: SPRING, delay: 0 });
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
  function cover(href) {
    if (leaving) return; // already pouring: one navigation per transition (a second Enter, a double tap)
    if (!loader) { location.href = href; return; }
    leaving = true;
    clearTimeout(safeT);
    const go = () => {
      goT = 0; w.removeEventListener('beforeunload', yieldNav);
      try { ss && ss.setItem('ydx-nav', String(Date.now())); } catch (e) {}
      location.href = href;
    };
    try {
      if (!loader.isConnected) d.body.appendChild(loader);
      loader.getAnimations({ subtree: true }).forEach(a => a.cancel());
      loader.setAttribute('data-mode', 'nav');
      loader.setAttribute('data-lang', isEn() ? 'en' : 'he');
      loader.hidden = false;
      loader.style.display = '';
      loader.style.opacity = ''; loader.style.transition = '';
      loader.style.pointerEvents = 'auto';
      const dur = 520;
      anim(drip, [{ transform: 'scaleY(1.7)' }, { transform: 'scaleY(1)' }], { duration: dur + 160, easing: INOUT, fill: 'forwards' });
      anim(inner, [{ translate: '0 -60px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 340, delay: dur - 200, easing: EASE, fill: 'both' });
      const a = anim(loader, [{ transform: OFF }, { transform: 'translate3d(0,0,0)' }], { duration: dur, easing: INOUT, fill: 'forwards' });
      // Start the request just before the curtain lands: the old page keeps painting (and the
      // curtain keeps falling) until the next document commits, so the network wait overlaps the
      // pour instead of following it. The next page opens already covered.
      goT = setTimeout(go, a ? dur - 110 : 0);
      w.addEventListener('beforeunload', yieldNav);
    } catch (e) { leaving = false; park(); location.href = href; return; }
    // The navigation may never commit (Stop/Esc, a 204 or download response, a cancelled
    // "leave site?" prompt): don't leave the old page covered and unclickable.
    safeT = setTimeout(uncover, 4500);
  }
  // The visitor started their own navigation (Back, a typed URL) during the pour: theirs wins.
  function yieldNav() {
    w.removeEventListener('beforeunload', yieldNav);
    if (goT) { clearTimeout(goT); goT = 0; }
  }
  function uncover() {
    safeT = 0;
    if (!leaving) return;
    yieldNav();
    leaving = false;
    try { ss && ss.removeItem('ydx-nav'); } catch (e) {}
    loader.style.pointerEvents = 'none';
    const a = anim(loader, [{ transform: 'translate3d(0,0,0)' }, { transform: OFF }], { duration: 560, easing: INOUT, fill: 'forwards' });
    a ? a.finished.then(park, park) : park();
  }
  w.addEventListener('pagehide', () => { clearTimeout(safeT); safeT = 0; });
  // Same-document Back during the pour (popstate): stay, lift the curtain again.
  w.addEventListener('popstate', () => { if (leaving && goT) uncover(); });

  d.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || typeof a.href !== 'string' || (a.target && a.target !== '_self') || a.hasAttribute('download')) return; // (SVG <a> has an object href)
    let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return; // also javascript:, mailto:, tel:
    const samePage = u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && u.search === location.search;
    if (samePage && (u.hash || a.getAttribute('href').charAt(0) === '#')) return; // in-page anchor (incl. href="#"): the site's Lenis already glides there
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

  /* ---------------------------------------------------------------- */
  /* Flavour sheet close (round 2):                                     */
  /*  - focus goes back to the card / coupe / token that opened it       */
  /*    (the app's controlled Radix dialog dropped focus on <body>);    */
  /*  - the sheet gets an exit. Radix unmounts it at once, so a frozen,  */
  /*    inert copy (appended to <body>, outside the app) plays the        */
  /*    mirror of the site's `pop` / mobile `lift` and is then removed.  */
  /* ---------------------------------------------------------------- */
  let opener = null, snap = null;
  const sheetEl = () => d.querySelector('body > .sheet[role=dialog]');
  const remember = e => {
    if (sheetEl()) { // a close is likely: freeze what is on screen right now
      if (RM || e.type === 'keydown' && e.key !== 'Escape' || !cssOK()) return;
      const sh = sheetEl(), ov = d.querySelector('body > .dialog-overlay');
      snap = { t: performance.now(), sh: sh.cloneNode(true), ov: ov && ov.cloneNode(true), r: sh.getBoundingClientRect() };
      return;
    }
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest && e.target.closest('button, a[href], [role=button]');
    if (t) opener = t;
  };
  ['pointerdown', 'click', 'keydown'].forEach(type => w.addEventListener(type, remember, true));

  function ghost(el, kf, o) {
    el.removeAttribute('id'); el.removeAttribute('role');
    el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    el.setAttribute('aria-hidden', 'true'); el.inert = true;
    el.classList.add('ydx-ghost');
    el.style.pointerEvents = 'none';
    d.body.appendChild(el);
    const a = anim(el, kf, Object.assign({ fill: 'forwards' }, o));
    const rm = () => el.remove();
    a ? a.finished.then(rm, rm) : rm();
    setTimeout(rm, (o.duration || 300) + 400);
  }
  let hadSheet = false;
  new MutationObserver(() => {
    const has = !!sheetEl();
    if (hadSheet && !has) {
      const s = snap; snap = null;
      if (s && performance.now() - s.t < 900) {
        const phone = matchMedia('(max-width: 820px)').matches;
        if (s.ov) ghost(s.ov, [{ opacity: 1 }, { opacity: 0 }], { duration: phone ? 300 : 240, easing: 'ease' });
        ghost(s.sh, phone
          ? [{ translate: '0 0' }, { translate: '0 104%' }]
          : [{ opacity: 1, scale: '1', rotate: '0deg', translate: '0 0' }, { opacity: 0, scale: '.93', rotate: '1.6deg', translate: '0 22px' }],
          { duration: phone ? 300 : 230, easing: IN });
      }
      const a = d.activeElement;
      if (opener && opener.isConnected && (!a || a === d.body)) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
    }
    if (!hadSheet && has) {
      snap = null;
      // the sheet now sits under a pointer that hasn't moved: drop the card's ✳ cursor state
      const c = d.querySelector('.ydx-cursor'); if (c) c.classList.remove('is-hot', 'is-link');
    }
    hadSheet = has;
  }).observe(d.body, { childList: true });

  if (RM) { onReadyStatic(); return; }

  /* ---------------------------------------------------------------- */
  /* 4. Scroll reveals (cards drop in like scoops, prices get stamped)  */
  /* ---------------------------------------------------------------- */
  const held = [];
  flush = () => { held.splice(0).forEach((el, i) => reveal(el, i + 2)); };
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
        { duration: 820, delay: lag, easing: EASE, fill: 'backwards' });
      const art = $('.card__art img', el);
      // the scoop lands a beat after its card, with a little squash
      anim(art, [{ translate: '0 -40px', scale: '.9 1.1' }, { translate: '0 0', scale: '1.08 .9', offset: .6 }, { translate: '0 0', scale: '1 1' }],
        { duration: 700, delay: lag + 160, easing: LAND, fill: 'backwards' });
    } else if (k === 'tickets') {
      $$('.ticket__price, .ticket__ask', el).forEach((p, j) => anim(p,
        [{ scale: '1.9', rotate: '-14deg', opacity: 0 }, { scale: '.92', rotate: '2deg', opacity: 1, offset: .7 }, { scale: '1', rotate: '0deg', opacity: 1 }],
        { duration: 560, delay: 380 + j * 160, easing: LAND, fill: 'backwards' }));
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
  let churn = null, churnEl = null;
  const live = new IntersectionObserver(entries => entries.forEach(e => {
    const el = e.target;
    if (el.classList.contains('hours')) { if (e.isIntersecting) { el.classList.add('ydx-on'); live.unobserve(el); } return; }
    if (el.classList.contains('visit__h')) {
      if (churnEl !== el) { if (churn) churn.cancel(); churnEl = el; churn = anim(el, [
        { backgroundSize: '112% auto', backgroundPosition: '20% 35%' },
        { backgroundSize: '140% auto', backgroundPosition: '80% 65%' }],
        { duration: 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }); }
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
  let trackEls = [];
  const refreshTracks = () => { // only re-read when React swapped the ticker nodes (scan runs on every mutation)
    const els = $$('.ticker__track');
    if (tracks.length && els.length === trackEls.length && els.every((e, i) => e === trackEls[i])) return;
    trackEls = els; tracks = els.flatMap(t => t.getAnimations());
  };
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
  if (FINE && w.self === w.top) (w.__ydxCss || Promise.resolve()).then(() => { if (cssOK()) cursor(); }); // however late the CSS is
  function cursor() {
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
  function scan() {
    $$('.grid .card').forEach(el => register(el, 'card', !pageLive));
    $$('.grid .tile-note').forEach(el => register(el, 'note', !pageLive));
    register($('.tickets'), 'tickets', true);
    register($('.menu__count'), 'pop', true);
    register($('.visit__seal'), 'pop', true);
    $$('.menu__filters, .menu__foot, .footer-row').forEach(el => register(el, 'up', true));
    if (!supportsTimeline) $$('.reveal').forEach(el => register(el, 'up', true));
    markToday();
    if (churnEl && !churnEl.isConnected) { if (churn) churn.cancel(); churn = churnEl = null; } // React replaced it
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

  function onReadyStatic() { /* reduced motion: only the static niceties */
    const run = () => { try { markToday(); } catch (e) {} };
    run();
    new MutationObserver(run).observe(d.body, { childList: true, subtree: true });
  }
})();
