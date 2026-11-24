/* ydx enhancement layer for TOMI (tomi-store).
 * Vanilla JS, no dependencies. Everything here sits OUTSIDE the app's own logic:
 *  - it never touches cart / checkout / auth / admin code paths,
 *  - it only adds classes on <html>, inline `translate`/CSS vars on existing nodes, and its own overlay elements
 *    appended to <body>.
 * Parts: (1. loader -> ydx/boot.js)  2. header scroll behaviour (+ cart-count pin)  3. language-switch shutter
 *        4. magnetic buttons  5. ring cursor  6. page-title fit (inline font-size on overflowing titles only)
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

  /* 1. loader: moved to ydx/boot.js in round 2 (sync in <head>; it must not wait for the app bundle) */

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
      if (!past || reduced || locked()) { acc = 0; html.classList.remove('ydx-hdr-hide'); return; }
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
      // measure from the element's resting centre (rect includes our current offset)
      tx = (e.clientX - (r.left - x + r.width / 2)) * k;
      ty = (e.clientY - (r.top - y + r.height / 2)) * k;
      kick();
    }, { passive: true });
    document.addEventListener('pointerdown', function () { tx = ty = 0; kick(); }, { passive: true });
  })();

  /* ------------------------------------------------------------------ 5. ring cursor (pointer: fine)
   * A trailing ring, the TOMI mark's ring, that follows the native cursor (which stays visible). It swells over
   * anything clickable, turns into a "drag" ring over the 3D dial, and disappears over text fields. */
  (function ringCursor() {
    if (reduced || !fine) return;
    var c = document.createElement('div');
    c.className = 'ydx-cursor';
    c.setAttribute('aria-hidden', 'true');
    document.body.append(c);
    var mx = -100, my = -100, x = -100, y = -100, raf = 0, shown = false;
    var HOT = 'a[href], button:not(:disabled), summary, [role="tab"], label[for], select, .fc, .pc, .chip';
    function loop() {
      x += (mx - x) * 0.22; y += (my - y) * 0.22;
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      raf = Math.abs(mx - x) + Math.abs(my - y) > 0.2 ? requestAnimationFrame(loop) : 0;
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') { c.classList.remove('on'); return; }
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; x = mx; y = my; }
      var t = e.target;
      var field = t.closest && t.closest('input, textarea, [contenteditable="true"]');
      var drag = !field && t.closest && t.closest('.stage.is-dial .dial, .finder-rail, [data-lenis-prevent-horizontal]');
      var hot = !field && !drag && t.closest && t.closest(HOT);
      c.classList.toggle('on', !field);
      c.classList.toggle('hot', !!hot);
      c.classList.toggle('drag', !!drag);
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerdown', function () { c.classList.add('down'); }, { passive: true });
    document.addEventListener('pointerup', function () { c.classList.remove('down'); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { c.classList.remove('on'); });
    addEventListener('blur', function () { c.classList.remove('on'); });
  })();
  /* ------------------------------------------------------------------ 6. page-title fit
   * The giant Karantina page titles are sized in vw; in English on phones ("Checkout", "Compare", "Shipping")
   * they ran past the viewport edge and were clipped. Shrink a title only when it overflows its column. */
  (function fitTitles() {
    var host = document.querySelector('.pages');
    if (!host) return;
    function fit() {
      host.querySelectorAll('.pg-title').forEach(function (h) {
        h.style.fontSize = '';
        var par = h.parentElement, ps = getComputedStyle(par);
        var col = par.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
        var w = h.scrollWidth;
        // measure the widest line's real ink width
        var r = document.createRange(); r.selectNodeContents(h);
        w = Math.max(w > col ? w : 0, r.getBoundingClientRect().width);
        if (w > col + 1) {
          var fs = parseFloat(getComputedStyle(h).fontSize);
          h.style.fontSize = Math.floor(fs * (col - 2) / w) + 'px';
        }
      });
    }
    var t = 0;
    function later() { clearTimeout(t); t = setTimeout(fit, 30); }
    new MutationObserver(later).observe(host, { childList: true });
    addEventListener('resize', later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  })();
})();
