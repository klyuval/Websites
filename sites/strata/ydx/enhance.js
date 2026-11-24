/* ==========================================================================
   STRATA — ydx enhancement layer (vanilla JS, no dependencies)
   - Loader: an FDM nozzle prints the STRATA logotype layer by layer
     (markup + critical CSS inline in index.html), then the ink "layers"
     retract and hand over to the hero, whose own nozzle starts printing.
   - Layer shutter: motion-graphic transition for long in-page jumps.
   - Reveals, seams, hero intro, slab depth, parallax, ticker velocity,
     magnetic buttons, Z-axis readout, menu close, ticket ticks.
   Never inserts/removes nodes inside #root: only attributes / inline styles
   the app does not own; overlays are appended to <body>.
   ========================================================================== */
(() => {
  'use strict';
  const d = document, html = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let inFrame = false;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  window.__ydxLoader = true;      // tells the inline failsafe that we took over
  html.classList.add('ydx-js');   // hide-before-reveal styles only apply from here on

  /* ------------------------------------------------------------------ */
  /* 1. Loader                                                           */
  /* ------------------------------------------------------------------ */
  let released = false;
  function release(intro) {
    if (released) return;
    released = true;
    // The inline script set ydx-hold + ydx-intro at first paint, so the intro elements sit paused in their
    // first frame under the loader (no "visible, then hidden, then animated" double entrance even when this
    // timer runs late on a busy main thread). Removing ydx-hold resumes them and brings the hero word back,
    // whose own IntersectionObserver then starts printing it.
    if (intro && !RM) {
      html.classList.add('ydx-intro');
      setTimeout(() => html.classList.remove('ydx-intro'), 2400);
    } else {
      html.classList.remove('ydx-intro');
    }
    html.classList.remove('ydx-hold');
  }

  (function loader() {
    const L = d.getElementById('ydx-loader');
    if (!L) { release(false); return; }
    const LAYERS = 38;
    const q = (s) => L.querySelector(s);
    const ink = q('.yl-ink'), gantry = q('.yl-gantry'), car = q('.yl-car'), ui = q('.yl-ui'), grid = q('.yl-grid');
    const status = q('.yl-status'), nums = L.querySelectorAll('.yl-count b');
    const seam = [...L.querySelectorAll('.yl-seam i')], bands = [...L.querySelectorAll('.yl-bands i')];

    const repeat = store.get('ydx-strata-seen') === '1';
    const mode = RM ? 'reduced' : inFrame ? 'frame' : repeat ? 'repeat' : 'full';
    // Times are measured from navigation start (performance.now()). This script only runs once the
    // render-blocking CSS has arrived, which is also when the loader first paints (T0). On a fast line T0
    // is ~0.3s and the base numbers apply. On a slow one T0 can be 4s+: the timings then count from T0, so
    // the build still gets a short, real run instead of being cut off the moment it appears.
    let T0 = performance.now();
    try {   // the script can arrive after the first paint on a congested line: count from that paint
      const fp = performance.getEntriesByName('first-paint')[0];
      if (fp) T0 = Math.min(T0, fp.startTime);
    } catch (e) { /* no paint timing */ }
    const MIN = Math.max({ full: 1150, repeat: 260, frame: 240, reduced: 300 }[mode],
      T0 + { full: 700, repeat: 200, frame: 200, reduced: 250 }[mode]);
    const HARD = Math.max({ full: 4000, repeat: 900, frame: 420, reduced: 3000 }[mode],
      T0 + { full: 2600, repeat: 700, frame: 400, reduced: 2000 }[mode]);
    // Past HARD, the cover only stays while the app has not rendered at all (an empty page is all it
    // would reveal), and never beyond CEIL: at most ~4.2s after it first appeared.
    const CEIL = mode === 'frame' ? HARD : Math.max(HARD, T0 + 4200);
    let ready = d.readyState === 'complete';
    addEventListener('load', () => { ready = true; }, { once: true });

    let layer = -1, done = false, sweep = null;
    const words = ['Slicing ideas', 'Printing layer by layer', 'Ready to hold'];
    function setLayer(n) {
      if (n === layer) return;
      layer = n;
      const r = (1 - n / LAYERS) * 100;
      ink.style.clipPath = `inset(${r}% 0 0 0)`;
      gantry.style.transform = `translate3d(0,${r}%,0)`;
      nums[0].textContent = String(n).padStart(2, '0');
      nums[1].textContent = (n * 0.2).toFixed(1);
      seam.forEach((s, i) => { s.style.transform = `scaleX(${clamp(n / LAYERS * 1.1 - i * 0.05, 0, 1)})`; });
      status.textContent = words[n < 3 ? 0 : n < LAYERS ? 1 : 2];
    }

    if (mode === 'full' || mode === 'frame') {
      setLayer(0);
      sweep = car.animate(
        [{ transform: 'translateX(4%)' }, { transform: 'translateX(94%)' }],
        { duration: mode === 'frame' ? 300 : 560, direction: 'alternate', iterations: Infinity, easing: 'cubic-bezier(.45,0,.55,1)' }
      );
    } else {
      setLayer(LAYERS);
      car.style.transform = 'translateX(96%)';
    }

    // A keyboard visitor who presses a key (Tab to the skip link, say) while the build is still running
    // should not tab around behind the cover: hurry the build to its end as soon as the app has rendered.
    let hurry = false;
    const onKey = () => { hurry = true; };
    addEventListener('keydown', onKey, { once: true });
    const appUp = () => !!d.querySelector('#root .site');

    function tick() {
      if (done) return;
      const t = performance.now();
      const up = appUp();
      if (t >= HARD && (up || t >= CEIL)) { finish(); return; }
      // Never wait for slow images past HARD - 700ms; never finish the build over an unrendered app.
      const ok = (ready || t >= HARD - 700 || (hurry && up)) && (up || t >= CEIL);
      let target = hurry ? LAYERS : Math.floor(LAYERS * Math.min(1, (t - T0) / Math.max(200, MIN - T0)));
      if (!ok) target = Math.min(target, LAYERS - 6);
      const next = Math.min(target, layer + (ok ? (hurry ? 5 : 2) : 1));
      if (next > layer) setLayer(next);
      if (layer >= LAYERS && ok && (hurry || t >= MIN)) { finish(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // rAF can be throttled in background tabs: a timer backstop with the same rules.
    (function backstop() {
      const t = performance.now();
      if (done) return;
      if (t >= CEIL || (t >= HARD && appUp())) { finish(); return; }
      setTimeout(backstop, Math.max(100, Math.min(HARD, CEIL) - t + 150));
    })();

    function cleanup() { L.remove(); }
    function finish() {
      if (done) return;
      done = true;
      removeEventListener('keydown', onKey);
      store.set('ydx-strata-seen', '1');
      if (sweep) sweep.cancel();
      car.style.transform = 'translateX(96%)';
      setLayer(LAYERS);
      const atTop = scrollY < innerHeight * 0.5;

      // Reduced motion: a plain fade. Hub iframe preview running late (slow first paint): a short fade
      // too, so the whole thing stays under ~800ms.
      if (mode === 'reduced' || (mode === 'frame' && performance.now() > 520)) {
        release(mode !== 'reduced' && atTop);
        L.classList.add('is-out');
        L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: mode === 'reduced' ? 260 : 180, fill: 'forwards' }).finished.then(cleanup, cleanup);
        return;
      }
      const hold = mode === 'full' ? 170 : mode === 'repeat' ? 30 : 0;
      const quick = mode !== 'full';
      const dur = quick ? 220 : 320, stag = quick ? 9 : 20, lead = quick ? 60 : 130;
      setTimeout(() => {
        L.classList.add('is-out');
        ui.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,-14px,0)' }],
          { duration: lead + 40, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
        grid.animate([{ opacity: 1 }, { opacity: 0 }], { duration: lead + 40, fill: 'forwards' });
        // Layers retract right, bottom layer first: the build plate empties, the hero shows through.
        const anims = bands.map((b, i) => b.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
          duration: dur, delay: lead + (bands.length - 1 - i) * stag, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards',
        }));
        setTimeout(() => release(atTop), lead);
        Promise.all(anims.map((a) => a.finished)).then(cleanup, cleanup);
      }, hold);
    }
  })();

  /* ------------------------------------------------------------------ */
  /* 2. Wait for React to render the app, then wire everything up        */
  /* ------------------------------------------------------------------ */
  function whenApp(cb) {
    const root = d.getElementById('root');
    if (!root) return;
    if (root.querySelector('.site')) { cb(root); return; }
    const mo = new MutationObserver(() => {
      if (root.querySelector('.site')) { mo.disconnect(); cb(root); }
    });
    mo.observe(root, { childList: true, subtree: true });
  }

  whenApp((root) => {
    fixDeepLink();
    setupReveals(root);
    setupCaptionFit();
    setupShutter();
    setupMenuClose();
    setupTicket();
    if (!RM) {
      setupScrollFx();
      if (FINE) setupMagnetic();
    }
  });

  /* Deep links (/#materials) never scrolled on the live site: the browser looks for the
     fragment before React has rendered it. Jump there while the loader still covers the page. */
  function fixDeepLink() {
    let el = null;
    try { el = location.hash.length > 1 && location.hash !== '#top' ? d.querySelector(location.hash) : null; } catch (e) { el = null; }
    if (!el) return;
    const go = () => {
      const y = Math.round(el.getBoundingClientRect().top + scrollY - 72);
      if (Math.abs(scrollY - y) > 4) scrollTo({ top: y, behavior: 'instant' });
    };
    const start = scrollY;
    requestAnimationFrame(go);
    // Once more after images/fonts settle, unless the visitor has scrolled meanwhile.
    addEventListener('load', () => { if (Math.abs(scrollY - start) < 8 || Math.abs(scrollY - (el.getBoundingClientRect().top + scrollY - 72)) < 400) go(); }, { once: true });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Reveals (IntersectionObserver, attributes only)                  */
  /* ------------------------------------------------------------------ */
  function setupReveals(root) {
    const GROUPS = [
      ['type', '.work-head > .label, .materials-head > .label, .process-head > .label:first-child, .brief-banner > .label, .brief-intro > .label, .process-foot, .studies-note'],
      ['print', '.work-head > .lede, .materials-head > .lede, .brief-banner > .lede, .brief-intro > h3, .faq-title, .footer-top > p'],
      ['lift', '.mat-tabs > button, .faq-list > details, .ticket, .brief-note, .brief-form > *, .brief-intro > p:not(.label), .footer-top > .brand, .footer-top > .link, .footer-bottom > *'],
      ['seam', '.seam'],
    ];
    const show = (el) => el.setAttribute('data-ydx-in', '');
    // Typing is measured in characters of the mono face, so it only works on single lines. Martian Mono
    // arrives after the first scan (fonts no longer block paint) and is wider than the fallback, so a
    // label that fitted on one line may wrap later: re-check before it reveals and fall back to a lift.
    const wraps = (el) => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
      return el.getBoundingClientRect().height > lh * 1.6;
    };
    const retype = (el) => {
      if (el.getAttribute('data-ydx-r') !== 'type' || el.hasAttribute('data-ydx-in') || !wraps(el)) return false;
      el.setAttribute('data-ydx-r', 'lift');
      return true;
    };
    const io = 'IntersectionObserver' in window && !RM
      ? new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target;
            io.unobserve(el);
            // Switched to a lift: give it one frame in its hidden state so the transition runs.
            if (retype(el)) requestAnimationFrame(() => requestAnimationFrame(() => show(el)));
            else show(el);
          }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
      : null;
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => root.querySelectorAll('[data-ydx-r="type"]').forEach(retype));

    function scan() {
      for (const [kind, sel] of GROUPS) {
        const els = [...root.querySelectorAll(sel)].filter((el) => !el.hasAttribute('data-ydx-r'));
        els.forEach((el) => {
          let k = kind;
          if (k === 'type') {
            if (wraps(el)) k = 'lift';
            else el.style.setProperty('--ydx-ch', String(el.textContent.trim().length + (el.querySelector('svg') ? 4 : 0)));
          }
          if (k === 'lift') {
            // Stagger siblings of the same group (max 6 steps).
            const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(sel)) : [el];
            const i = Math.max(0, sibs.indexOf(el));
            if (i) el.style.setProperty('--ydx-d', Math.min(i, 6) * 70 + 'ms');
          }
          el.setAttribute('data-ydx-r', k);
          if (io) io.observe(el); else show(el);
        });
      }
    }
    scan();
    // Items in the last few pixels of the page (footer bottom row) can never cross the -8% margin:
    // reveal whatever is left once the visitor reaches the end.
    // One check per frame with a cached page height: reading scrollHeight on every scroll event forced a
    // layout each time and showed up as long tasks while scrolling.
    let docH = d.documentElement.scrollHeight, endRaf = 0;
    if ('ResizeObserver' in window) new ResizeObserver(() => { docH = d.documentElement.scrollHeight; }).observe(d.body);
    const atEnd = () => {
      endRaf = 0;
      if (scrollY + innerHeight < docH - 4) return;
      for (const el of root.querySelectorAll('[data-ydx-r]:not([data-ydx-in])')) {
        if (el.getBoundingClientRect().top < innerHeight + 60) { show(el); if (io) io.unobserve(el); }
      }
    };
    addEventListener('scroll', () => { if (!endRaf) endRaf = requestAnimationFrame(atEnd); }, { passive: true });
    // The app re-renders parts of the tree (brief result, tabs): pick up new nodes.
    let pending = 0;
    new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; scan(); });
    }).observe(root, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Hero caption: hide it when it would run off the right edge       */
  /* ------------------------------------------------------------------ */
  function setupCaptionFit() {
    const fit = () => {
      const c = d.querySelector('.hero-vase figcaption');
      if (!c) return;
      c.removeAttribute('data-ydx-fit');
      if (getComputedStyle(c).display === 'none') return;
      const r = c.getBoundingClientRect();
      if (r.right > innerWidth - 12) c.setAttribute('data-ydx-fit', '0');
    };
    fit();
    // Martian Mono arrives late and is wider than the fallback: measure again once fonts/images settle.
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
    addEventListener('load', fit, { once: true });
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Layer shutter for long in-page jumps (nav, CTAs, back to top)    */
  /* ------------------------------------------------------------------ */
  function setupShutter() {
    if (RM) return; // reduced motion: the site already jumps instantly (Lenis is off)
    const sh = d.createElement('div');
    sh.id = 'ydx-shutter';
    sh.setAttribute('aria-hidden', 'true');
    sh.innerHTML = '<i></i>'.repeat(8) + '<p><small></small><span></span></p>';
    d.body.appendChild(sh);
    const bands = [...sh.querySelectorAll('i')], label = sh.querySelector('p');
    const small = label.querySelector('small'), big = label.querySelector('span');
    const NAMES = { top: ['Z 000.0', 'Strata'], work: ['Layer 01', 'Our work'], materials: ['Layer 02', 'Materials'],
      process: ['Layer 03', 'The process'], brief: ['Layer 04', 'Your brief'] };
    let busy = false;

    function play(y, hash, key, focusEl) {
      busy = true;
      const n = bands.length, dur = 210, st = 14;
      const [s, b] = NAMES[key] || ['', ''];
      small.textContent = s; big.textContent = b;
      sh.classList.add('on');
      bands.forEach((el) => { el.style.transformOrigin = '0 50%'; });
      const cover = bands.map((el, i) => el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: dur, delay: (n - 1 - i) * st, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }));
      const lab = label.animate([{ opacity: 0, transform: 'translate(-50%,-30%)' }, { opacity: 1, transform: 'translate(-50%,-50%)' }],
        { duration: 180, delay: 170, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
      Promise.all(cover.map((a) => a.finished)).then(() => {
        scrollTo({ top: y, behavior: 'instant' });
        if (hash) { try { history.pushState(null, '', hash); } catch (e) { /* ignore */ } }
        if (focusEl) {
          if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
          focusEl.focus({ preventScroll: true });
        }
        setTimeout(() => {
          label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
          bands.forEach((el) => { el.style.transformOrigin = '100% 50%'; });
          const out = bands.map((el, i) => el.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
            { duration: dur + 30, delay: (n - 1 - i) * st, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }));
          Promise.all(out.map((a) => a.finished)).then(() => {
            cover.concat(out, [lab]).forEach((a) => a.cancel());
            sh.classList.remove('on');
            busy = false;
          });
        }, 40);
      });
    }

    const plain = (e) => !(e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
    const far = (y) => Math.abs(y - scrollY) > innerHeight * 1.6;

    // "#top" links (brand, footer word, back to top) call Lenis from a React handler; catch them first.
    addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href="#top"]');
      if (!a || !plain(e) || busy || !far(0)) return;
      e.preventDefault();
      e.stopPropagation();
      play(0, null, 'top', null);
    }, true);

    // Other hash links: let React run (menus close, material is chosen), then stop Lenis' window
    // handler and play the shutter instead of a long smooth scroll.
    d.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || !plain(e)) return;
      const href = a.getAttribute('href');
      if (href === '#' || href === '#top' || href === '#main') return;
      let el = null;
      try { el = d.querySelector(href); } catch (err) { return; }
      if (!el) return;
      const max = d.documentElement.scrollHeight - innerHeight;
      const y = clamp(Math.round(el.getBoundingClientRect().top + scrollY - 72), 0, max);
      if (busy) { e.preventDefault(); e.stopPropagation(); return; }
      if (!far(y)) return; // short hops keep the site's smooth scroll
      e.preventDefault();
      e.stopPropagation();
      play(y, href, href.slice(1), e.detail === 0 ? el : null);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 6. Mobile menu: animate the close from the menu button              */
  /* ------------------------------------------------------------------ */
  function setupMenuClose() {
    if (RM) return;
    let pass = false;
    addEventListener('click', (e) => {
      if (pass) return;
      const btn = e.target.closest && e.target.closest('.nav-menu');
      const nav = btn && btn.closest('.nav');
      if (!nav || !nav.classList.contains('open')) return;
      e.preventDefault();
      e.stopPropagation();
      if (nav.hasAttribute('data-ydx-closing')) return;
      nav.setAttribute('data-ydx-closing', '');
      setTimeout(() => {
        pass = true;
        btn.click();                       // let React close it for real
        pass = false;
        nav.removeAttribute('data-ydx-closing');
      }, 250);
    }, true);
  }

  /* ------------------------------------------------------------------ */
  /* 7. Project-brief ticket: values print in as they change             */
  /* ------------------------------------------------------------------ */
  function setupTicket() {
    if (RM) return;
    const last = new WeakMap();
    let ticket = null, mo = null;
    const bind = () => {
      const t = d.querySelector('.ticket');
      if (!t || t === ticket) return;
      ticket = t;
      if (mo) mo.disconnect();
      mo = new MutationObserver((list) => {
        const now = performance.now();
        for (const m of list) {
          const node = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          const dd = node && node.closest('dd');
          if (!dd || now - (last.get(dd) || 0) < 700) continue;
          last.set(dd, now);
          dd.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0)' }], { duration: 300, easing: 'steps(4, end)' });
        }
      });
      mo.observe(t, { subtree: true, childList: true, characterData: true });
    };
    bind();
    new MutationObserver(bind).observe(d.getElementById('root'), { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Scroll-linked effects (one rAF per frame while scrolling)        */
  /*    slab depth, parallax, ticker velocity, Z-axis readout            */
  /* ------------------------------------------------------------------ */
  function setupScrollFx() {
    const z = d.createElement('div');
    z.id = 'ydx-z';
    z.setAttribute('aria-hidden', 'true');
    z.innerHTML = '<b></b><span>Z 000.0 MM</span>';
    d.body.appendChild(z);
    const zLabel = z.querySelector('span');
    // Pick ink or bone for the readout from whatever section colour sits under it. Sampled once the
    // scroll settles (not every 30px as before: elementsFromPoint + getComputedStyle forced a layout each
    // time and added up to long tasks while scrolling).
    let zTimer = 0;
    function zTone() {
      if (getComputedStyle(z).display === 'none') return;
      const r = z.getBoundingClientRect();
      const stack = d.elementsFromPoint(Math.round(r.left + r.width / 2), Math.round(innerHeight / 2));
      for (const el of stack) {
        if (el === z || z.contains(el)) continue;
        const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
        if (!m || (m[3] !== undefined && +m[3] < 0.5)) continue;
        const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        z.style.color = lum > 0.4 ? '#17151c' : '#f4efe2';
        return;
      }
    }
    let docH = d.documentElement.scrollHeight;
    if ('ResizeObserver' in window) new ResizeObserver(() => { docH = d.documentElement.scrollHeight; kick(); }).observe(d.body);

    let lastY = scrollY, vel = 0, rate = 1, raf = 0, tickerAnim = null;
    const $ = (s) => d.querySelector(s);
    const $$ = (s) => [...d.querySelectorAll(s)];

    function frame() {
      raf = 0;
      const y = scrollY, vh = innerHeight;
      vel = vel * 0.8 + (y - lastY) * 0.2;
      lastY = y;

      // Read phase: all geometry first, so the writes below never force a layout mid-frame.
      // Process slabs: the covered slab sinks as the next one lands on it.
      const slabs = $$('.slab');
      const rects = slabs.map((s) => s.getBoundingClientRect());
      const ps = slabs.map((s, i) => {
        if (i === slabs.length - 1) return 0;
        const a = rects[i], b = rects[i + 1];
        if (a.bottom > 0 && a.top < vh) return clamp((a.bottom - b.top) / Math.max(1, a.height - 46), 0, 1);
        return a.bottom <= 0 ? 1 : 0;
      });
      // Gentle parallax: concept objects drift against their plates (measured on the plate, which does
      // not move, so the drift never feeds back into its own measurement); the hero vase lifts away.
      const objs = $$('.plate-obj').map((o) => {
        const r = (o.parentElement || o).getBoundingClientRect();
        return r.bottom < -200 || r.top > vh + 200 ? null : [o, (r.top + r.height / 2 - vh / 2) / vh];
      });

      // Write phase.
      slabs.forEach((s, i) => {
        s.style.setProperty('--ydx-p', ps[i].toFixed(3));
        s.style.scale = ps[i] ? String(1 - ps[i] * 0.05) : '';
      });
      for (const it of objs) if (it) it[0].style.translate = `0 ${(it[1] * -38).toFixed(1)}px`;
      const vase = $('.hero-vase');
      if (vase) vase.style.translate = y < vh * 1.2 ? `0 ${(-y * 0.14).toFixed(1)}px` : '';

      // Z-axis readout (desktop only via CSS).
      const f = clamp(y / Math.max(1, docH - vh), 0, 1);
      z.style.setProperty('--z', f.toFixed(4));
      z.classList.toggle('on', y > vh * 0.7);
      zLabel.textContent = 'Z ' + (f * 240).toFixed(1).padStart(5, '0') + ' MM';
      clearTimeout(zTimer);
      zTimer = setTimeout(zTone, 120);

      // Ticker: scroll velocity speeds it up, scrolling back reverses it.
      const track = $('.ticker-track');
      if (track) {
        if (!tickerAnim || !tickerAnim.effect || tickerAnim.effect.target !== track) tickerAnim = track.getAnimations()[0] || null;
        const target = clamp(1 + vel * 0.09, -3, 5);
        rate += (target - rate) * 0.14;
        if (tickerAnim && Math.abs(tickerAnim.playbackRate - rate) > 0.01) tickerAnim.updatePlaybackRate(rate);
      }
      if (Math.abs(vel) > 0.05 || Math.abs(rate - 1) > 0.01) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick, { passive: true });
    kick();
  }

  /* ------------------------------------------------------------------ */
  /* 9. Magnetic buttons (pointer: fine only)                            */
  /* ------------------------------------------------------------------ */
  function setupMagnetic() {
    let cur = null;
    const reset = (el) => { el.style.translate = ''; };
    d.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.btn, .nav-cta');
      if (cur && cur !== el) { reset(cur); cur = null; }
      if (!el) return;
      cur = el;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.translate = `${(dx * 6).toFixed(1)}px ${(dy * 4).toFixed(1)}px`;
    }, { passive: true });
    d.addEventListener('pointerleave', () => { if (cur) { reset(cur); cur = null; } });
  }
})();
