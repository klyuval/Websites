/* ==========================================================================
   Pack & Peak — ydx design + motion layer (vanilla, no dependencies)
   - Loader: driven by the inline <script data-ydx> in index.html (readable source: ydx/loader-inline.src.js).
   - Chapter-jump transition (dock / CTA jumps of 2+ chapters).
   - Scroll reveals, counters, magnetic buttons, map reticle, altimeter pill.
   The page is a React app hydrated on `document`: we never add/remove/reorder
   nodes inside <main>. We only set data-ydx-* attributes, inline `translate`,
   and Web Animations on existing nodes; our own nodes are appended to <body>.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__ydxEnhance) return;                     // idempotent: a second copy of this file must not double everything
  window.__ydxEnhance = 1;
  var html = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = requestAnimationFrame;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
  // Motion tokens: the same vocabulary as the :root --ydx-* custom properties in enhance.css (round 4).
  var EASE = { out: 'cubic-bezier(.2,.8,.2,1)', draw: 'cubic-bezier(.6,0,.2,1)', pop: 'cubic-bezier(.3,1.6,.5,1)', sweep: 'cubic-bezier(.7,0,.3,1)' };
  var SUMMIT = 2380, TRAILHEAD = 1520;               // fictional Dolomite ridgeline (860 m gain)
  var lastInput = 0;                                 // time of the user's latest wheel / touch / key / pointer press
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) {
    addEventListener(t, function () { lastInput = performance.now(); }, { passive: true, capture: true });
  });

  /* ------------------------------------------------------------------ *
   * 1. Loader: driven by the inline <script data-ydx> in <head>
   *    (so it is alive from the first paint, even before this file arrives).
   *    It dispatches `ydx:ready` and sets window.__ydxDone when it is gone.
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ *
   * 2. Scroll reveals (attributes only; the app never owns data-ydx-*)
   * ------------------------------------------------------------------ */
  var REVEAL = [
    '.chapter > .pin', '.chapter-heading h2 em', '.summit h2 em', '.signpost', '.board', '.board-note',
    '.atlas-note', '.terrain-readout', '.sheet-arrow', '.terrain-caption', '.kit-grid', '.pack-core',
    '.pack-foot', '.summit-actions', '.summit-footer'
  ].join(',');
  // Elements hidden as zero-size boxes do not intersect reliably, so they are observed through a parent:
  // write-in accents are clipped to nothing, and pins are scale(0) points (round 3: pin 04 sits exactly on the
  // overflow:clip edge of #summit and never stamped on phones or tall desktops).
  function proxyOf(el) {
    if (el.matches('h2 em')) return el.closest('h2');
    if (el.classList.contains('board-note')) return el.closest('.board');
    if (el.classList.contains('pin')) return el.parentElement;
    return el;
  }
  function onIn(es, obs) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      e.target.__ydxDone = true;
      (e.target.__ydxFor || [e.target]).forEach(function (el) {
        el.setAttribute('data-ydx-in', '');
        if (el.classList.contains('terrain-readout')) readoutIn(el, false);
      });
    });
  }
  var hasIO = 'IntersectionObserver' in window;
  var io = hasIO ? new IntersectionObserver(onIn, { rootMargin: '0px 0px -12% 0px', threshold: .08 }) : null;
  // The footer ends the page: scrolled to the bottom it fills only the last ~100px of the viewport, which lie inside
  // the -12% margin above, so it never intersected (round 3: the desktop footer stayed invisible). Watch it unshrunk.
  var ioEnd = hasIO ? new IntersectionObserver(onIn, { threshold: .2 }) : null;
  // Reveals hide content until it scrolls in. If this file runs after the loader has already uncovered the page
  // (enhance.js very late) and a reveal target is on screen, hiding it now would make visible content blink out
  // and replay, so the reveals are skipped and everything simply stays visible.
  function onScreen(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; }
  var late = html.classList.contains('ydx-in') && $$(REVEAL).some(onScreen);
  var motion = !reduce && !late && hasIO && !html.classList.contains('ydx-late-css');
  if (motion) html.classList.add('ydx-motion');
  function scanReveals() {
    $$(REVEAL).forEach(function (el) {
      if (el.__ydxSeen) return;
      el.__ydxSeen = true;
      if (!motion) { el.setAttribute('data-ydx-in', ''); return; }
      var px = proxyOf(el) || el;
      if (px.__ydxDone) { el.setAttribute('data-ydx-in', ''); return; }
      if (!px.__ydxFor) { px.__ydxFor = []; (px.matches('.summit-footer') ? ioEnd : io).observe(px); }
      px.__ydxFor.push(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. Terrain readout: counters + profile re-plot (also on trail change)
   * ------------------------------------------------------------------ */
  function hydrated(el) { for (var k in el) if (k.indexOf('__reactFiber') === 0) return true; return false; }
  function countUp(strong, delay) {
    var tn = strong.firstChild;
    if (!tn || tn.nodeType !== 3 || !hydrated(strong)) return;
    var final = tn.nodeValue, m = /^(\d+)(?:\.(\d+))?$/.exec(final);
    if (!m) return;
    var target = parseFloat(final), dec = m[2] ? m[2].length : 0, last = null, start = 0;
    strong.__ydxFinal = final;                                 // readers (altimeter, summit tag) use the real value
    function step(now) {
      if (last !== null && tn.nodeValue !== last) { strong.__ydxFinal = null; return; }   // React updated it: stand down
      if (!start) start = now + delay;
      var t = clamp((now - start) / 1100, 0, 1);
      last = (target * easeOut(t)).toFixed(dec);
      tn.nodeValue = t >= 1 ? final : last;
      if (t < 1) raf(step); else strong.__ydxFinal = null;
    }
    raf(step);
  }
  function readoutIn(card, replay) {
    if (reduce) return;
    $$('.route-stats strong', card).forEach(function (s, i) { countUp(s, (replay ? 60 : 250) + i * 90); });
    var prof = $('.profile', card);
    if (prof) prof.animate([{ clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% 0 -10% 0)' }],
      { duration: 1100, delay: replay ? 0 : 200, easing: EASE.draw, fill: 'backwards' });
    var tag = $('.weather span', card);
    if (tag) tag.animate([{ scale: 2.2, opacity: 0 }, { scale: .92, opacity: 1, offset: .7 }, { scale: 1, opacity: 1 }],
      { duration: 520, delay: replay ? 380 : 900, easing: EASE.draw, fill: 'backwards' });
  }
  function watchReadout() {
    var card = $('.terrain-readout'), h3 = card && $('h3', card);
    if (!h3 || card.__ydxW) return;
    card.__ydxW = true;
    var title = h3.textContent;
    new MutationObserver(function () {
      if (h3.textContent === title) return;
      title = h3.textContent;
      if (card.hasAttribute('data-ydx-in')) readoutIn(card, true);
    }).observe(h3, { childList: true, characterData: true, subtree: true });
  }

  /* ------------------------------------------------------------------ *
   * 4. Micro-feedback on app state changes (dock label, pack counter)
   * ------------------------------------------------------------------ */
  function watchDock() {
    var cur = $('.current-chapter');
    if (!cur || cur.__ydxW || reduce) return;
    cur.__ydxW = true;
    var label = cur.textContent;
    new MutationObserver(function () {
      if (cur.textContent === label) return;
      label = cur.textContent;
      cur.animate([{ opacity: 0, translate: '0 9px' }, { opacity: 1, translate: '0 0' }], { duration: 360, easing: EASE.out });
    }).observe(cur, { childList: true, characterData: true, subtree: true });
  }
  function watchCount() {
    var s = $('.pack-count strong');
    if (!s || s.__ydxW || reduce) return;
    s.__ydxW = true;
    var v = s.textContent;
    new MutationObserver(function () {
      if (s.textContent === v) return;
      v = s.textContent;
      s.animate([{ scale: 1 }, { scale: 1.12, rotate: '-3deg' }, { scale: 1, rotate: '0deg' }], { duration: 420, delay: 470, easing: EASE.pop });
    }).observe(s, { childList: true, characterData: true, subtree: true });
  }

  /* ------------------------------------------------------------------ *
   * 5. Magnetic buttons (fine pointers): writes the `translate` property only
   * ------------------------------------------------------------------ */
  function magnets() {
    if (!fine || reduce) return;
    var active = new Set(), running = false;
    function loop() {
      running = false;
      active.forEach(function (b) {
        var m = b.__ydxMag;
        m.x += (m.tx - m.x) * .18; m.y += (m.ty - m.y) * .18;
        if (Math.abs(m.tx - m.x) < .05 && Math.abs(m.ty - m.y) < .05) { m.x = m.tx; m.y = m.ty; if (!m.tx && !m.ty) active.delete(b); }
        b.style.translate = (m.x || m.y) ? m.x.toFixed(2) + 'px ' + m.y.toFixed(2) + 'px' : '';
      });
      if (active.size) { running = true; raf(loop); }
    }
    function kick(b) { active.add(b); if (!running) { running = true; raf(loop); } }
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('.round-cta, .header-cta, .next-chapter, .pill, .text-button, #ydx-lab');
      if (!b || e.pointerType !== 'mouse') return;
      var m = b.__ydxMag || (b.__ydxMag = { x: 0, y: 0, tx: 0, ty: 0 });
      if (!b.__ydxLeave) { b.__ydxLeave = true; b.addEventListener('pointerleave', function () { m.tx = m.ty = 0; kick(b); }); }
      var r = b.getBoundingClientRect(), k = b.classList.contains('round-cta') ? .3 : .22, max = 12;
      m.tx = clamp((e.clientX - (r.left + r.width / 2)) * k, -max, max);
      m.ty = clamp((e.clientY - (r.top + r.height / 2)) * k, -max, max);
      kick(b);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 6. Altimeter pill + progress-tip marker
   * ------------------------------------------------------------------ */
  function altimeter() {
    var tip = document.createElement('span');
    tip.id = 'ydx-tip'; tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
    var a = document.createElement('div');
    a.id = 'ydx-alt'; a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<span class="ydx-a-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7 4 7 4-4 5 11H3L8 7z"/><path class="ydx-a-flag" stroke="none" d="M12 1.5l6 2.2-6 2.3z"/><path d="M12 1.5V7" stroke-width="1.8"/></svg></span><small>ALT.</small><b>1,520<i>m</i></b>';
    document.body.appendChild(a);
    var b = $('b', a), small = $('small', a), shown = -1, onFlag = null, footerIn = false;
    var foot = $('.summit-footer');
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { footerIn = es[0].isIntersecting; update(); }).observe(foot);
    function gain() {
      // while the counter is running its text is an in-between number: read the value it is counting to
      var s = $$('.route-stats strong')[1], v = s && parseFloat(s.__ydxFinal || (s.firstChild && s.firstChild.nodeValue));
      return v > 0 ? v : SUMMIT - TRAILHEAD;
    }
    var queued = false;
    function update() {
      queued = false;
      var max = document.documentElement.scrollHeight - innerHeight, y = scrollY;
      var p = max > 0 ? clamp(y / max, 0, 1) : 0;
      html.classList.toggle('ydx-scrolled', y > 8);
      var on = y > innerHeight * .6 && !footerIn && !html.classList.contains('ydx-loading');
      a.classList.toggle('is-on', on);
      var g = gain(), alt = Math.round((TRAILHEAD + g * Math.min(1, p / .92)) / 5) * 5;   // reach the summit as the last chapter lands
      if (alt !== shown) { shown = alt; b.firstChild.nodeValue = fmt(alt); }
      summitTag(g);
      var top = p >= .92;
      if (top !== onFlag) { onFlag = top; a.classList.toggle('is-summit', top); small.textContent = top ? 'SUMMIT' : 'ALT.'; }
    }
    function q() { if (!queued) { queued = true; raf(update); } }
    // Round 4, trail's end: the summit route's end marker (CSS pseudo-elements of the app's .route box) is labelled
    // with the chosen trail's summit altitude, the same number the pill reads at the top. Attribute only; it is
    // re-applied on every update, so a React re-render of the route box loses it for at most one frame of scroll.
    var endBox = null;
    function summitTag(g) {
      if (!endBox || !endBox.isConnected) endBox = $('.summit-rockimg .route');
      var t = 'Summit · ' + fmt(Math.round((TRAILHEAD + g) / 5) * 5) + ' m';
      if (endBox && endBox.getAttribute('data-ydx-summit') !== t) endBox.setAttribute('data-ydx-summit', t);
    }
    addEventListener('scroll', q, { passive: true });
    addEventListener('resize', q, { passive: true });
    document.addEventListener('ydx:ready', q);
    update();
  }

  /* ------------------------------------------------------------------ *
   * 7. Map reticle over the "Read the mountain" sheet (fine pointers)
   * ------------------------------------------------------------------ */
  function reticle() {
    var sec = $('.terrain-chapter');
    if (!fine || !sec || sec.__ydxR) return;
    sec.__ydxR = true;
    var r = document.createElement('div');
    r.id = 'ydx-reticle'; r.setAttribute('aria-hidden', 'true');
    r.innerHTML = '<span class="ydx-r-ring"></span><span class="ydx-r-label"></span>';
    document.body.appendChild(r);
    var lab = $('.ydx-r-label', r), x = 0, y = 0, pend = false;
    function parse(sel) {
      var t = ($(sel) || {}).textContent || '', m = /(\d+)°(\d+)/.exec(t);
      return m ? [+m[1], +m[2]] : [46, 29];
    }
    function draw() {
      pend = false;
      r.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      var b = sec.getBoundingClientRect();
      var n = parse('.sheet-north'), e = parse('.sheet-east');
      var lat = n[1] + (.5 - (y - b.top) / b.height) * 1.6, lon = e[1] + ((x - b.left) / b.width - .5) * 2.4;
      lab.textContent = n[0] + '°' + lat.toFixed(2) + '′ N · ' + e[0] + '°' + lon.toFixed(2) + '′ E';
    }
    function off() { r.classList.remove('is-on'); html.classList.remove('ydx-reticle-on'); }
    sec.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return off();
      var over = ev.target.closest('button, a, .terrain-readout, .chapter-heading, .terrain-caption');
      if (over) return off();
      x = ev.clientX; y = ev.clientY;
      r.classList.add('is-on'); html.classList.add('ydx-reticle-on');
      if (!pend) { pend = true; raf(draw); }
    }, { passive: true });
    sec.addEventListener('pointerleave', off);
    // Scrolling, a key press (e.g. opening the packing list from the keyboard) or leaving the window hides it until
    // the mouse moves again, so a frozen crosshair never lingers under the dialog or after switching windows.
    function offIfOn() { if (r.classList.contains('is-on')) off(); }
    addEventListener('scroll', offIfOn, { passive: true });
    addEventListener('keydown', offIfOn, { passive: true });
    addEventListener('blur', offIfOn);
  }

  /* ------------------------------------------------------------------ *
   * 8. Chapter-jump transition (only for jumps of 2+ chapters)
   * ------------------------------------------------------------------ */
  var CH = [
    { id: 'top', name: 'The calling', bg: 'var(--sky)', fg: 'var(--ink)' },
    { id: 'trails', name: 'Choose a trail', bg: 'var(--spruce)', fg: 'var(--cream)' },
    { id: 'terrain', name: 'Read the mountain', bg: 'var(--paper)', fg: 'var(--ink)', paper: true },
    { id: 'pack', name: 'Pack with purpose', bg: 'var(--vermilion)', fg: 'var(--ink)', red: true },
    { id: 'summit', name: 'The good part', bg: 'var(--sky)', fg: 'var(--ink)' },
    // Round 5: not a chapter but the route lab page (/play/); its arrival cover is this same paper band.
    { id: 'lab', name: 'Plot your own line', bg: 'var(--paper)', fg: 'var(--ink)', paper: true, eye: 'ROUTE LAB' }
  ];
  var LAB_PIN = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19c3-1 4-5 7-6s5 2 9-3"/><circle cx="4" cy="19" r="1.6" fill="currentColor"/><path d="M20 10V4l-4 2 4 2"/></svg>';
  var RIDGE_TOP = '<svg class="top" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 10V7l5-3 4 2 6-5 4 3 5-2.5 6 4 5-5.5 5 3 3-1.5 6 4.5 5-6 5 4 4-2 6 3 5-4 4 2.5 6-3 4 2 4-2v8z"/></svg>';
  var RIDGE_BOT = '<svg class="bot" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 0v3c6 2 11 4 18 3s12-4 20-3 13 4 21 4 12-4 20-4 14 3 21 2V0z"/></svg>';
  function shutter() {
    if (reduce) return;
    var s = document.createElement('div');
    s.id = 'ydx-shutter'; s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<div class="ydx-s-band ydx-s-a">' + RIDGE_TOP + RIDGE_BOT + '</div><div class="ydx-s-band ydx-s-b">' + RIDGE_TOP + RIDGE_BOT + '<span class="ydx-s-pin"></span><span class="ydx-s-eye"></span><span class="ydx-s-name"></span></div>';
    document.body.appendChild(s);
    var A = $('.ydx-s-a', s), B = $('.ydx-s-b', s), anims = [];
    function current() {
      var bs = $$('.chapter-nav button'), i = bs.findIndex(function (b) { return b.hasAttribute('aria-current'); });
      return i < 0 ? 0 : i;
    }
    function target(btn, cur) {
      var nav = btn.closest('.chapter-nav');
      if (nav) return $$('button', nav).indexOf(btn);
      if (btn.classList.contains('next-chapter')) return cur === 4 ? 0 : cur + 1;
      if (btn.classList.contains('brand')) return 0;
      if (btn.matches('.header-cta, .round-cta, .summit .text-button')) return 1;
      if (btn.matches('.terrain-readout .pill')) return 3;
      return -1;
    }
    var landT = 0, started = 0, asked = 0, dest = 0;
    // Without Lenis (touch / no smooth wheel) the app's native smooth scroll can outlast the cover: land it while
    // covered. Only the latest destination is landed, and not if the user has touched / wheeled since asking for it
    // (round 3: a stale timer used to snap to an earlier destination after a quick second tap).
    function land() {
      landT = 0;
      if (html.classList.contains('lenis') || lastInput > asked) return;
      var el = document.getElementById(CH[dest].id);
      if (!el) return;
      // Chromium keeps the remaining delta of a running smooth scroll after an instant scrollTo, so phones landed
      // ~100-300px past the chapter (round 3). Stopping it in place first, then landing a frame later, is exact.
      scrollTo(scrollX, scrollY);
      raf(function () {
        var top = dest === 0 ? 0 : el.getBoundingClientRect().top + scrollY;
        try { scrollTo({ top: top, behavior: 'instant' }); } catch (e) { scrollTo(0, top); }
      });
    }
    function stop() {
      clearTimeout(landT); landT = 0;
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      s.classList.remove('is-on');
    }
    function covering() { return s.classList.contains('is-on') && performance.now() - started < 430; }
    function label(to) {
      var c = CH[to];
      B.style.setProperty('--s-bg', c.bg); B.style.setProperty('--s-fg', c.fg);
      B.classList.toggle('is-paper', !!c.paper);
      A.style.background = A.style.color = c.red ? 'var(--ink)' : '';
      // Page pins are numbered 01-04 from "Choose a trail"; the hero gets the brand mountain instead.
      $('.ydx-s-pin', s).innerHTML = to === 5 ? LAB_PIN : to ? '0' + to : '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>';
      var eye = c.eye ? null : $('#' + c.id + ' .eyebrow');
      $('.ydx-s-eye', s).textContent = c.eye || (eye ? eye.textContent.trim() : '');
      $('.ydx-s-name', s).textContent = c.name;
      // Warm the destination's lazy images while it is covered, so nothing pops in as the strata lift.
      $$('#' + c.id + ' img[loading=lazy]').forEach(function (im) { if (!im.complete) { var pre = new Image(); pre.src = im.currentSrc || im.src; } });
    }
    function play(to) {
      var now = performance.now();
      dest = to; asked = now;
      clearTimeout(landT);
      label(to);
      // Another jump while the strata still cover the page (first ~430 ms): follow the new destination without
      // restarting the sweep. Later, while it is lifting, the sweep starts over.
      if (covering()) { landT = setTimeout(land, Math.max(0, started + 300 - now)); return; }
      anims.forEach(function (a) { a.cancel(); });
      started = now;
      s.classList.add('is-on');
      var e = EASE.sweep;
      // A (accent) leads in and leaves last; B (destination field) arrives second and leaves first.
      anims = [
        A.animate([{ translate: '0 115%', easing: e }, { translate: '0 0', offset: .34 }, { translate: '0 0', offset: .66, easing: e }, { translate: '0 -115%' }], { duration: 720, fill: 'both' }),
        B.animate([{ translate: '0 115%' }, { translate: '0 115%', offset: .06, easing: e }, { translate: '0 0', offset: .4 }, { translate: '0 0', offset: .6, easing: e }, { translate: '0 -115%', offset: .92 }, { translate: '0 -115%' }], { duration: 720, fill: 'both' }),
        $('.ydx-s-pin', s).animate([{ scale: 0, rotate: '-30deg' }, { scale: 0, rotate: '-30deg', offset: .26, easing: EASE.pop }, { scale: 1, rotate: '0deg', offset: .46 }, { scale: 1, rotate: '0deg' }], { duration: 720 })
      ];
      landT = setTimeout(land, 300);
      anims[1].onfinish = function () { s.classList.remove('is-on'); };
    }
    document.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var btn = e.target.closest && e.target.closest('button');
      if (!btn) return;
      var cur = current(), to = target(btn, cur);
      if (to < 0) return;
      // a short jump normally keeps the plain smooth scroll, but while covered it must retarget the cover
      if (Math.abs(to - cur) < 2 && !covering()) return;
      play(to);
    }, true);
    // Leaving the page (bfcache) mid-sweep: do not keep the cover in the cached snapshot.
    addEventListener('pagehide', stop);
    // Round 5: the route lab. The strata sweep in, freeze while the paper band covers the screen, and the lab page
    // starts under the identical band and lifts it, so the page change reads as one continuous sweep.
    window.__ydxToLab = function (href) {
      play(5);
      try { sessionStorage.setItem('ydx-pp-xfer', 'lab'); } catch (e) {}
      setTimeout(function () { anims.forEach(function (a) { a.pause(); }); location.href = href; }, 310);
    };
  }

  /* ------------------------------------------------------------------ *
   * 8b. Route lab entry chip (round 5): a real link, appended to <body>, shown while the map sheet or the summit
   *     is mid-screen (hidden = visibility:hidden, so it is never an invisible tab stop).
   * ------------------------------------------------------------------ */
  function labChip() {
    if ($('#ydx-lab')) return;
    var a = document.createElement('a');
    a.id = 'ydx-lab'; a.href = '/play/';
    a.innerHTML = '<span class="ydx-lab-ico" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path class="r1" d="M16 4.5c6.5 0 12 4.6 11.4 11.2-.5 6-5.6 11-11.8 10.8C9.4 26.3 4.3 21.5 4.6 15.4 4.9 9 9.6 4.5 16 4.5Z"/><path class="r2" d="M16.4 9c3.9 0 7 2.8 6.6 6.8-.4 3.7-3.4 6.4-7.2 6.2-3.6-.2-6.3-3-6.1-6.6C9.9 11.6 12.6 9 16.4 9Z"/><path class="r3" d="M16 12.8c1.9 0 3.3 1.3 3.1 3.2-.2 1.7-1.6 2.9-3.3 2.8-1.6-.1-2.9-1.4-2.8-3.1.1-1.6 1.3-2.9 3-2.9Z"/><circle cx="16" cy="15.8" r="1.7" fill="#f0441e" stroke="none"/></svg></span>' +
      '<span class="ydx-lab-t"><small>Route lab</small>Plot your own line</span>' +
      '<svg class="ydx-lab-go" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
    document.body.appendChild(a);
    var on = {};
    if ('IntersectionObserver' in window) {
      // Shown only while the strip of screen the chip sits on (78-92% of the height) is decorative picture: the
      // map sheet's relief (desktop) or the PEAK / summit-rock stage, and never while the footer's text is there.
      // So it never covers a heading, the readout card, the summit links or the footer.
      var o = new IntersectionObserver(function (es) {
        es.forEach(function (e) { on[e.target.__ydxKey] = e.isIntersecting; });
        a.classList.toggle('is-on', !on.foot && !!((on.relief && innerWidth > 760) || on.stage));
      }, { rootMargin: '-78% 0px -8% 0px' });
      [['relief', '.relief-stage'], ['stage', '.summit-stage'], ['foot', '.summit-footer']].forEach(function (k) { var el = $(k[1]); if (el) { el.__ydxKey = k[0]; o.observe(el); } });
    } else a.classList.add('is-on');
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce || !window.__ydxToLab) return;
      e.preventDefault();
      window.__ydxToLab(a.href);
    });
  }

  /* ------------------------------------------------------------------ *
   * 9. Bug fix: picking a *different* trail re-renders the later chapters,
   *    Lenis' ResizeObserver resets its target mid-flight and the auto-scroll
   *    to "Read the mountain" stalls ~750px short. Re-issue the app's own
   *    jump (via the dock button, so the app stays in charge) once it stalls.
   * ------------------------------------------------------------------ */
  function fixChooseScroll() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.board') || !html.classList.contains('lenis')) return;
      var t0 = performance.now(), redone = false;
      (function check() {
        var el = performance.now() - t0;
        // the user scrolling / pressing keys in the meantime means they went elsewhere: never yank them back
        // (round 3: wheeling up right after choosing a trail used to be pulled back down to the map)
        if (el > 2200 || redone || lastInput > t0) return;
        if (el > 320 && !html.classList.contains('lenis-smooth')) {
          var terr = document.getElementById('terrain'), btn = $$('.chapter-nav button')[2];
          if (terr && btn && Math.abs(terr.getBoundingClientRect().top) > 24) { redone = true; btn.click(); }
          return;
        }
        setTimeout(check, 80);
      })();
    }, true);
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function scanAll() { scanReveals(); watchReadout(); watchDock(); watchCount(); reticle(); }
  function boot() {
    scanAll();
    altimeter();
    magnets();
    shutter();
    labChip();
    fixChooseScroll();
    // React may re-render sections (trail choice re-keys the relief and kit list): rescan.
    var main = $('main.journey') || document.body, t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(scanAll, 60); }).observe(main, { childList: true, subtree: true });
  }
  // Loaded `async` (a slow file must not hold back DOMContentLoaded / load), so it may run before the body is parsed.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
