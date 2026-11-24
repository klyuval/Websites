/* ydx enhancement layer for TOMI (tomi-store).
 * Vanilla JS, no dependencies. Everything here sits OUTSIDE the app's own logic:
 *  - it never touches cart / checkout / auth / admin code paths,
 *  - it only adds classes on <html>, inline `translate`/CSS vars on existing nodes, and its own overlay elements
 *    appended to <body>.
 * Parts: 1. loader controller  2. header scroll behaviour  3. language-switch shutter
 *        4. magnetic buttons  5. cart-count nudge
 */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var EASE_IO = 'cubic-bezier(.76,0,.24,1)';
  var EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  var EASE_IN = 'cubic-bezier(.55,0,.7,.2)';
  html.classList.add('ydx-js');
  if (reduced) html.classList.add('ydx-rm');

  /* ------------------------------------------------------------------ 1. loader
   * The site already gates its first paint on the 3D models (html.ready, set by the app after the GLBs decode,
   * or after its own fallback when WebGL fails). Our loader replaces the old red "0%" counter visually and
   * mirrors the app's real progress (it reads the hidden .loader-n counter the app keeps updating).
   * It leaves on the app's ready signal, after a short minimum (first visit ~1s, repeat 350ms, iframe 0),
   * and has a safety exit if the app never reports anything (script failed to load). */
  (function loader() {
    var L = document.querySelector('.ydx-loader');
    if (!L) return;
    L.classList.add('ydx-ctl');
    var frame = html.classList.contains('ydx-frame');
    var repeat = html.classList.contains('ydx-repeat');
    var MIN = frame ? 0 : repeat ? 350 : 1000;
    var ring = L.querySelector('.r'), lv = L.querySelector('.ydx-lv'), surf = L.querySelector('.ydx-surf'), topE = L.querySelector('.ydx-top');
    var num = L.querySelector('.ydx-count b'), cap = L.querySelector('.ydx-cap');
    var src = document.querySelector('.loader-n');
    if (cap) cap.textContent = html.getAttribute('data-ydx-l') === 'en' ? 'TOMI · Loading' : 'TOMI · טוען';
    var target = 0, shown = 0, readyAt = 0, exiting = false, finished = false;

    function read() {
      var v = parseFloat(src && src.textContent) || 0;
      if (v > target) target = Math.min(100, v);
    }
    if (src) new MutationObserver(read).observe(src, { childList: true, characterData: true, subtree: true });

    var TOP = 34, BOT = 168; // device silhouette span in the SVG viewBox
    function paint() {
      if (finished) return;
      read();
      shown += (target - shown) * (reduced ? 1 : 0.14);
      if (Math.abs(target - shown) < 0.25) shown = target;
      var p = shown / 100, y = BOT - (BOT - TOP) * p;
      ring.style.strokeDasharray = shown.toFixed(2) + ' 100';
      lv.setAttribute('y', y.toFixed(2));
      surf.setAttribute('cy', y.toFixed(2));
      surf.setAttribute('rx', y < 63 ? 12 : 22);
      var mid = p > 0.01 && p < 0.995, rx = y < 63 ? 12 : 22;
      surf.style.strokeOpacity = mid ? '0.9' : '0';
      // the liquid's top face: a filled ellipse makes the rising level read as a 3D cylinder section
      topE.setAttribute('cy', y.toFixed(2)); topE.setAttribute('rx', rx); topE.style.opacity = mid ? '1' : '0';
      num.textContent = String(Math.round(shown));
      if (readyAt && shown >= 99.5 && performance.now() >= MIN) exit();
      requestAnimationFrame(paint);
    }
    requestAnimationFrame(paint);

    function onReady() {
      if (readyAt) return;
      readyAt = performance.now();
      target = 100;
      window.__ydxReadyAt = Math.round(readyAt);
      // never wait on our own fill animation for long
      setTimeout(exit, Math.max(MIN - readyAt, 0) + (reduced ? 0 : 700));
    }
    if (html.classList.contains('ready')) onReady();
    else new MutationObserver(function (_, mo) {
      if (html.classList.contains('ready')) { mo.disconnect(); onReady(); }
    }).observe(html, { attributes: true, attributeFilter: ['class'] });

    // safety: the app never reported progress nor readiness 4s after load -> its script failed; do not trap the user
    addEventListener('load', function () {
      setTimeout(function () { if (!readyAt && target === 0) exit(); }, 4000);
    });

    function exit() {
      if (exiting) return;
      exiting = true;
      try { sessionStorage.setItem('ydx-tomi-seen', '1'); } catch (e) {}
      if (reduced || !L.animate) {
        var f = L.animate ? L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }) : null;
        if (f) f.onfinish = finish; else finish();
        return;
      }
      var fast = frame || repeat, D = fast ? 520 : 820;
      var mark = L.querySelector('.ydx-mark');
      mark.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.14)', opacity: 0 }],
        { duration: D * 0.55, easing: EASE_IN, fill: 'forwards' });
      ring.animate([{ transform: 'rotate(-90deg) scale(1)' }, { transform: 'rotate(-90deg) scale(1.35)' }],
        { duration: D * 0.55, easing: EASE_IN, fill: 'forwards' });
      L.querySelectorAll('.ydx-count,.ydx-cap').forEach(function (el, i) {
        el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-16px)', opacity: 0 }],
          { duration: D * 0.4, delay: i * 50, easing: EASE_IN, fill: 'forwards' });
      });
      var wipe = L.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
        { duration: D, delay: D * 0.28, easing: EASE_IO, fill: 'forwards' });
      wipe.onfinish = finish;
      setTimeout(finish, D * 1.6); // in case the tab is hidden and animations are throttled
    }
    function finish() {
      if (finished) return;
      finished = true;
      L.hidden = true;
      L.setAttribute('aria-hidden', 'true');
      html.classList.remove('ydx-load');
      html.classList.add('ydx-loaded');
    }
  })();

  /* ------------------------------------------------------------------ 2. header
   * The fixed header is transparent over the home sections and its links collide with section copy while
   * scrolling (worst on mobile). Below the hero we tuck it away on scroll-down and bring it back on scroll-up,
   * with a soft progressive blur under it so it stays legible on any section colour.
   * Never hidden while: menu/cart/age gate open, in the 3D dial, near the top, or focus is inside it. */
  (function header() {
    var top = document.querySelector('.top');
    if (!top) return;
    var body = document.body, lastY = scrollY, acc = 0, ticking = false, pinnedUntil = 0;
    function locked() {
      return body.classList.contains('menu-open') || body.classList.contains('gated') ||
        body.classList.contains('in-dial') || html.classList.contains('lenis-stopped') ||
        document.querySelector('.drawer:not([hidden])') || top.contains(document.activeElement) ||
        performance.now() < pinnedUntil;
    }
    function update() {
      ticking = false;
      var y = scrollY, dy = y - lastY;
      lastY = y;
      var past = y > innerHeight * 0.85;
      html.classList.toggle('ydx-hdr-bg', y > innerHeight * 0.6 && !body.classList.contains('in-page'));
      if (!past || locked()) { acc = 0; html.classList.remove('ydx-hdr-hide'); return; }
      acc = (acc > 0) === (dy > 0) ? acc + dy : dy; // accumulate in one direction only
      if (acc > 28) html.classList.add('ydx-hdr-hide');
      else if (acc < -14) html.classList.remove('ydx-hdr-hide');
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    top.addEventListener('focusin', function () { html.classList.remove('ydx-hdr-hide'); });
    // keep the cart visible for a moment when something is added (the count bump is the only feedback)
    var n = document.querySelector('.cart-n'), prev = n && n.textContent;
    if (n) new MutationObserver(function () {
      if (n.textContent !== prev) { prev = n.textContent; pinnedUntil = performance.now() + 2600; html.classList.remove('ydx-hdr-hide'); }
    }).observe(n, { childList: true, characterData: true, subtree: true });
    // a route change resets the header
    addEventListener('popstate', function () { acc = 0; html.classList.remove('ydx-hdr-hide'); });
  })();

  /* ------------------------------------------------------------------ 3. language shutter
   * Switching he/en flips the whole layout (RTL <-> LTR). Instead of a hard jump we sweep a panel in the
   * current model colour across the screen in the NEW reading direction, flip the language under cover, and
   * sweep out. The app's own click handler runs unchanged (we just call it ~300ms later). */
  (function langShutter() {
    if (reduced || !Element.prototype.animate) return;
    var passing = false, busy = false;
    var sh = document.createElement('div');
    sh.className = 'ydx-shutter';
    sh.setAttribute('aria-hidden', 'true');
    sh.hidden = true;
    sh.innerHTML = '<b></b>';
    document.body.append(sh);
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.lang');
      if (!btn || passing) return;
      if (busy) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      e.stopImmediatePropagation();
      e.preventDefault();
      busy = true;
      var toEn = (html.lang || 'he') === 'he';
      sh.firstChild.textContent = toEn ? 'English' : 'עברית';
      sh.hidden = false;
      // panel travels in the new reading direction: ->en moves left-to-right, ->he right-to-left
      var a = toEn ? ['inset(0 100% 0 0)', 'inset(0 0 0 0)', 'inset(0 0 0 100%)'] : ['inset(0 0 0 100%)', 'inset(0 0 0 0)', 'inset(0 100% 0 0)'];
      var tx = toEn ? [-60, 0, 60] : [60, 0, -60];
      var inA = sh.animate([{ clipPath: a[0] }, { clipPath: a[1] }], { duration: 340, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' });
      sh.firstChild.animate([{ transform: 'translateX(' + tx[0] + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE_OUT, fill: 'forwards' });
      inA.onfinish = function () {
        passing = true;
        try { btn.click(); } finally { passing = false; }
        setTimeout(function () {
          var out = sh.animate([{ clipPath: a[1] }, { clipPath: a[2] }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
          sh.firstChild.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(' + tx[2] + 'px)', opacity: 0 }], { duration: 380, easing: EASE_IN, fill: 'forwards' });
          out.onfinish = function () { sh.hidden = true; busy = false; };
        }, 90);
      };
      setTimeout(function () { if (busy) { sh.hidden = true; busy = false; } }, 2500);
    }, true);
  })();

  /* ------------------------------------------------------------------ 4. magnetic buttons (pointer: fine)
   * Uses the independent CSS `translate` property so it composes with the app's GSAP transforms. */
  (function magnetic() {
    if (reduced || !fine) return;
    var SEL = '.cta, .hero-nav .arrow, .dial-step .arrow, .detail-step .arrow, .gate-yes, .drawer-empty .cta';
    var cur = null, raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    function loop() {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      if (cur) cur.style.translate = x.toFixed(2) + 'px ' + y.toFixed(2) + 'px';
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(loop);
      else { raf = 0; if (cur && !tx && !ty) { cur.style.translate = ''; cur = null; } }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var el = e.target.closest && e.target.closest(SEL);
      if (el && el !== cur) { if (cur) cur.style.translate = ''; cur = el; x = y = 0; }
      if (!el) { tx = ty = 0; kick(); return; }
      var r = el.getBoundingClientRect();
      var k = el.classList.contains('arrow') ? 0.3 : 0.22;
      tx = (e.clientX - (r.left + r.width / 2)) * k;
      ty = (e.clientY - (r.top + r.height / 2)) * k;
      kick();
    }, { passive: true });
    document.addEventListener('pointerdown', function () { tx = ty = 0; kick(); }, { passive: true });
  })();
})();
