/* ydx enhancement layer for TOMI (tomi-store).
 * Vanilla JS, no dependencies. Everything here sits OUTSIDE the app's own logic:
 *  - it never touches cart / checkout / auth / admin code paths,
 *  - it only adds classes on <html>, inline `translate`/CSS vars on existing nodes, and its own overlay elements
 *    appended to <body>.
 * Parts: (1. loader -> ydx/boot.js)  2. header scroll behaviour (+ cart-count pin)  3. language-switch shutter
 *        4. magnetic buttons  5. ring cursor  6. page-title fit (inline font-size on overflowing titles only)
 *        7. route-curtain word mask  8. dial notes clearance (round 2)
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
        document.querySelector('.drawer:not([hidden])') || kbFocus() ||
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
    // keyboard focus in the header pins it; a mouse/touch click on lang or cart (which keeps focus there, and the
    // cart drawer hands focus back to its button on close) must not pin it for good (round 2)
    function kbFocus() {
      var a = document.activeElement;
      if (!a || !top.contains(a)) return false;
      try { return a.matches(':focus-visible'); } catch (e) { return true; }
    }
    top.addEventListener('focusin', function () { if (kbFocus()) html.classList.remove('ydx-hdr-hide'); });
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
      var inA = sh.animate([{ clipPath: a[0] }, { clipPath: a[1] }], { duration: 340, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
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

  /* ------------------------------------------------------------------ 7. route curtain: masked word (round 2)
   * The app's GSAP route curtain grows with scaleY (0 -> 1 -> 0), so its "TOMI" was squashed into a flat smear for
   * most of the move. We counter-scale the word so it keeps its shape and travels with the curtain's band, which
   * clips it like a mask. We only read the curtain's transform (GSAP still owns it) and
   * write a transform on its <b>, which nothing else animates. Runs only while GSAP is writing the curtain. */
  (function curtainMask() {
    if (reduced) return; // the app skips its curtain under reduced motion
    function hook(kr) {
      var b = kr.querySelector('b');
      if (!b || kr.__ydx) return;
      kr.__ydx = 1;
      new MutationObserver(function () {
        if (kr.style.display === 'none') { b.style.transform = ''; return; }
        var m = getComputedStyle(kr).transform;
        var v = m && m !== 'none' ? m.slice(m.indexOf('(') + 1, -1).split(',').map(parseFloat) : [1, 0, 0, 1];
        var sy = v.length === 6 ? v[3] : v[5]; // matrix() or matrix3d()
        // un-squash about the word's own centre: it then rides in the middle of the visible band (bottom ->
        // centre on the way in, centre -> top on the way out) and the band's edges clip it like a mask
        if (!(sy > 0.999) && sy > 0) {
          b.style.transform = 'scaleY(' + (1 / Math.max(sy, 0.02)).toFixed(4) + ')';
        } else b.style.transform = '';
      }).observe(kr, { attributes: true, attributeFilter: ['style'] });
    }
    var kr = document.querySelector('.curtain');
    if (kr) hook(kr);
    else new MutationObserver(function (_, mo) {
      var k = document.querySelector('.curtain');
      if (k) { mo.disconnect(); hook(k); }
    }).observe(document.body, { childList: true });
  })();

  /* ------------------------------------------------------------------ 8. dial: keep the notes line clear of the
   * active flavour label (round 2). On the 3D dial the selected flavour's label sits at the needle, next to the
   * panel. Between 761 and ~1300px wide it ran into the panel's notes line ("ענבים סגולים, עגול" under
   * "ענבים Grape"; worst with long names like "Al Fakher Double Apple"). The dial geometry follows the 3D device,
   * so we measure it once per dial layout (not per flavour, so nothing reflows while you spin) and give the notes
   * line just enough inline padding on the dial's side. */
  (function dialNotes() {
    var stage = document.querySelector('.stage');
    if (!stage) return;
    var t = 0;
    function fit() {
      if (!stage.classList.contains('is-dial') || stage.classList.contains('is-detail') || innerWidth <= 760) return;
      var a = document.querySelector('.dial-labels .dial-label.active'), p = document.querySelector('.panel');
      if (!a || !p || p.hidden) return;
      var rtl = html.dir === 'rtl', ar = a.getBoundingClientRect(), pr = p.getBoundingClientRect(), maxW = 0;
      document.querySelectorAll('.dial-labels .dial-label').forEach(function (l) { maxW = Math.max(maxW, l.getBoundingClientRect().width); });
      maxW *= 1.12; // inactive labels are drawn smaller than the active one
      var need = rtl ? pr.right - (ar.right - maxW - 14) : ar.left + maxW + 14 - pr.left;
      need = Math.min(Math.max(0, Math.round(need)), Math.round(pr.width * 0.45));
      html.style.setProperty('--ydx-np', need + 'px');
    }
    function later(ms) { clearTimeout(t); t = setTimeout(fit, ms || 900); }
    new MutationObserver(function () { later(); }).observe(stage, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(function () { later(); }).observe(html, { attributes: true, attributeFilter: ['lang'] });
    addEventListener('resize', function () { later(250); });
  })();
})();
