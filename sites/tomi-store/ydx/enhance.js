/* ydx enhancement layer for TOMI (tomi-store).
 * Vanilla JS, no dependencies. Everything here sits OUTSIDE the app's own logic:
 *  - it never touches cart / checkout / auth / admin code paths,
 *  - it only adds classes on <html>, inline `translate`/CSS vars on existing nodes, and its own overlay elements
 *    appended to <body>.
 * Parts: (1. loader -> ydx/boot.js)  2. header scroll behaviour (+ cart-count pin)  3. language-switch shutter
 *        4. magnetic buttons  5. ring cursor  6. page-title fit (inline font-size on overflowing titles only)
 *        7. route-curtain word mask  8. dial notes clearance (round 2)  9. footer wordmark rise (round 4)
 *        10. ripple field loader (-> ydx/field.js)  11. dock: Ring Lab entry + motion toggle  12. add-to-cart fly
 *        (round 5)
 * Round 3: loaded `async` (it must tolerate any order relative to the app bundle and must not hold
 * DOMContentLoaded/load), so it waits for the DOM itself; it runs once even if included twice; it adds
 * enhance.css if boot.js could not; overlays that need enhance.css stay off when that file is missing.
 */
(function () {
  'use strict';
  if (window.__ydxTomi) return; // a second copy would stack a second shutter and swallow the language click
  window.__ydxTomi = 1;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
function run() {
  var html = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  var EASE_IN = 'cubic-bezier(.55,0,.7,.2)';
  html.classList.add('ydx-js');
  if (!document.querySelector('link[data-ydx]')) { // boot.js failed: still get the stylesheet (no shutter/cursor until it applies)
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/ydx/enhance.css'; css.setAttribute('data-ydx', '');
    document.head.appendChild(css);
  }
  // enhance.css applied? (overlays below would otherwise render as unstyled blocks at the end of <body>)
  function styled(el) { return getComputedStyle(el).position === 'fixed'; }

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
   * sweep out. The app's own click handler runs unchanged (we just call it ~300ms later).
   * Round 3: the click is never lost. If the in-sweep cannot finish (tab sent to the background mid-sweep, where
   * animations stop; a busy main thread), the language still flips: at once when the tab is hidden, else from the
   * 2.5 s safety timer. Before, the timer hid the shutter without flipping, and the stale onfinish then flipped
   * the language by itself when the user came back to the tab. */
  (function langShutter() {
    if (reduced || !Element.prototype.animate) return;
    var passing = false, sweep = null;
    var sh = document.createElement('div');
    sh.className = 'ydx-shutter';
    sh.setAttribute('aria-hidden', 'true');
    sh.hidden = true;
    sh.innerHTML = '<b></b>';
    document.body.append(sh);
    function pass(btn) { passing = true; try { btn.click(); } finally { passing = false; } }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.lang');
      if (!btn || passing) return;
      if (sweep) { e.stopImmediatePropagation(); e.preventDefault(); return; } // one switch per sweep
      if (document.hidden || !styled(sh)) return; // no stylesheet: plain switch, the app handles it
      e.stopImmediatePropagation();
      e.preventDefault();
      var me = sweep = { flipped: false, end: done };
      function flip() { if (!me.flipped) { me.flipped = true; pass(btn); } }
      function done() { if (sweep === me) { flip(); sh.hidden = true; sweep = null; } }
      setTimeout(done, 2500); // armed first, so nothing below can leave the page covered
      var toEn = (html.lang || 'he') === 'he';
      sh.firstChild.textContent = toEn ? 'English' : 'עברית';
      sh.hidden = false;
      // panel travels in the new reading direction: ->en moves left-to-right, ->he right-to-left
      var a = toEn ? ['inset(0 100% 0 0)', 'inset(0 0 0 0)', 'inset(0 0 0 100%)'] : ['inset(0 0 0 100%)', 'inset(0 0 0 0)', 'inset(0 100% 0 0)'];
      var tx = toEn ? [-60, 0, 60] : [60, 0, -60];
      var inA = sh.animate([{ clipPath: a[0] }, { clipPath: a[1] }], { duration: 340, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
      sh.firstChild.animate([{ transform: 'translateX(' + tx[0] + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE_OUT, fill: 'forwards' });
      inA.onfinish = function () {
        if (sweep !== me) return;
        flip();
        setTimeout(function () {
          if (sweep !== me) return;
          var out = sh.animate([{ clipPath: a[1] }, { clipPath: a[2] }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
          sh.firstChild.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(' + tx[2] + 'px)', opacity: 0 }], { duration: 380, easing: EASE_IN, fill: 'forwards' });
          out.onfinish = done;
        }, 90);
      };
    }, true);
    document.addEventListener('visibilitychange', function () { if (document.hidden && sweep) sweep.end(); });
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
    function rest() { tx = ty = 0; kick(); }
    document.addEventListener('pointerdown', rest, { passive: true });
    // the pointer can leave the window while over a button (no further pointermove): let it settle back
    html.addEventListener('pointerleave', rest);
    addEventListener('blur', rest);
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
    var ok = false; // checked on first use: enhance.css is injected and may still be on its way at this point
    var mx = -100, my = -100, x = -100, y = -100, raf = 0, shown = false;
    var HOT = 'a[href], button:not(:disabled), summary, [role="tab"], label[for], select, .fc, .pc, .chip';
    function loop() {
      x += (mx - x) * 0.22; y += (my - y) * 0.22;
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      raf = Math.abs(mx - x) + Math.abs(my - y) > 0.2 ? requestAnimationFrame(loop) : 0;
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') { c.classList.remove('on'); return; }
      if (!ok && !(ok = styled(c))) return;
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
        if (col <= 0) return; // pages hidden (home): nothing to measure
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

  /* ------------------------------------------------------------------ 9. footer wordmark rise (round 4)
   * Every big Karantina title on the site rises into place when it scrolls in (the app's GSAP: yPercent 60 +
   * fade, 0.9 s expo.out), except the giant footer "TOMI", which just sat there at the end of every page. It now
   * rises the same way, once per render. Only a wordmark that is still below the fold is held back (a paused WAAPI
   * animation, nothing in CSS), so it can never be left hidden on screen; the app re-renders the footer with
   * each page, so new ones are picked up. */
  (function footRise() {
    if (reduced || !Element.prototype.animate || !window.IntersectionObserver) return;
    var hosts = [document.querySelector('.home'), document.querySelector('.pages')].filter(Boolean);
    if (!hosts.length) return;
    var held = new Map(), t = 0;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = held.get(e.target);
        io.unobserve(e.target); held.delete(e.target);
        if (a) try { a.play(); } catch (x) { a.cancel(); }
      });
    }, { rootMargin: '0px 0px -14% 0px' });
    function scan() {
      held.forEach(function (a, el) { if (!el.isConnected) { io.unobserve(el); a.cancel(); held.delete(el); } });
      document.querySelectorAll('.foot-brand').forEach(function (el) {
        if (el.__ydxRise) return;
        el.__ydxRise = 1;
        var r = el.getBoundingClientRect();
        if (!r.height || r.top < innerHeight) return; // not laid out (hidden page) or already in view: leave it be
        try {
          var a = el.animate([{ translate: '0 60%', opacity: 0 }, { translate: '0 0', opacity: 1 }],
            { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
          a.pause();
          held.set(el, a);
          io.observe(el);
        } catch (x) {}
      });
    }
    function later() { clearTimeout(t); t = setTimeout(scan, 60); }
    hosts.forEach(function (h, i) { new MutationObserver(later).observe(h, { childList: true, subtree: i > 0 }); });
    later();
  })();

  /* ------------------------------------------------------------------ 10. ripple field (round 5)
   * The reactive background lives in ydx/field.js (see its header). It is loaded late on purpose: after the app's
   * `ready` (three.js compiles its shaders in the task right after it) plus an idle slot, so it never competes
   * with the loader exit or the first 3D frames. It runs only where the app's 3D does not draw. */
  (function fieldLoader() {
    if (!window.WebGLRenderingContext) return;
    function load() {
      if (document.querySelector('script[data-ydx-field]')) return;
      var s = document.createElement('script');
      s.src = '/ydx/field.js'; s.async = true; s.setAttribute('data-ydx-field', '');
      document.head.appendChild(s);
    }
    function later() {
      setTimeout(function () { (window.requestIdleCallback || function (f) { setTimeout(f, 1); })(load, { timeout: 2500 }); }, 900);
    }
    if (html.classList.contains('ready')) later();
    else new MutationObserver(function (_, mo) {
      if (html.classList.contains('ready')) { mo.disconnect(); later(); }
    }).observe(html, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ------------------------------------------------------------------ 11. the dock: Ring Lab entry + motion toggle
   * (round 5) A small pill outside the app root, at the bottom inline-end corner, shown once the hero is scrolled
   * away (on the home) and on pages. It invites to /play/ (TOMI Ring Lab, a standalone toy page owned by ydx) and
   * carries a visible "background motion" switch for the ripple field (remembered; the field also honours
   * prefers-reduced-motion). It dodges the footer's last line, and hides while the menu, cart, sheet, age gate or
   * the 3D dial are up. Leaving for the lab plays the store's ring-motif wipe in the current model colour. */
  (function dock() {
    var M = { x: [23, 166, 115], xl: [107, 52, 184], 'xl-plus': [242, 140, 15], ultima: [224, 38, 44] };
    function modelId() {
      var v = getComputedStyle(html).getPropertyValue('--c2').trim(), m = v.match(/^#([0-9a-f]{6})$/i), c;
      if (m) { var n = parseInt(m[1], 16); c = [n >> 16 & 255, n >> 8 & 255, n & 255]; }
      else { m = v.match(/(\d+)\D+(\d+)\D+(\d+)/); c = m ? [+m[1], +m[2], +m[3]] : [107, 52, 184]; }
      var best = 'xl', bd = 1e9;
      Object.keys(M).forEach(function (k) { var q = M[k], dd = Math.pow(q[0] - c[0], 2) + Math.pow(q[1] - c[1], 2) + Math.pow(q[2] - c[2], 2); if (dd < bd) { bd = dd; best = k; } });
      return best;
    }
    try { if (localStorage.getItem('ydx-tomi-motion') === 'off') html.setAttribute('data-ydx-motion', 'off'); } catch (e) {}
    var el = document.createElement('div');
    el.className = 'ydx-dock';
    el.innerHTML = '<a class="ydx-lab" href="/play/"><span class="o" aria-hidden="true"></span><span class="t"></span></a>' +
      '<button class="ydx-mo" type="button"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="12" r="3.2"/><path d="M6.3 7.6a8 8 0 0 0 0 8.8M17.7 7.6a8 8 0 0 1 0 8.8M3.6 5.2a12 12 0 0 0 0 13.6M20.4 5.2a12 12 0 0 1 0 13.6"/>' +
      '<path class="x" d="M4 20 20 4"/></svg></button>';
    document.body.append(el);
    var a = el.querySelector('.ydx-lab'), t = el.querySelector('.t'), mo = el.querySelector('.ydx-mo');
    function text() {
      var en = html.lang === 'en', off = html.getAttribute('data-ydx-motion') === 'off';
      t.textContent = en ? 'Ring Lab' : 'מעבדת הטבעות';
      a.setAttribute('aria-label', en ? 'TOMI Ring Lab: a playful page' : 'מעבדת הטבעות של TOMI: עמוד משחק');
      mo.setAttribute('aria-pressed', String(!off));
      mo.setAttribute('aria-label', en ? 'Background motion' : 'תנועת רקע');
      mo.title = en ? (off ? 'Background motion: off' : 'Background motion: on') : (off ? 'תנועת רקע: כבויה' : 'תנועת רקע: פעילה');
    }
    text();
    new MutationObserver(text).observe(html, { attributes: true, attributeFilter: ['lang', 'data-ydx-motion'] });
    mo.addEventListener('click', function () {
      var off = html.getAttribute('data-ydx-motion') !== 'off';
      if (off) html.setAttribute('data-ydx-motion', 'off'); else html.removeAttribute('data-ydx-motion');
      try { localStorage.setItem('ydx-tomi-motion', off ? 'off' : 'on'); } catch (e) {}
    });
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      var id = modelId(), href = '/play/?m=' + id;
      try { sessionStorage.setItem('ydx-tomi-ret', location.hash || ''); } catch (x) {}
      if (reduced || !Element.prototype.animate || !styled(el)) { location.href = href; return; }
      var w = document.createElement('div');
      w.className = 'ydx-wipe'; w.setAttribute('aria-hidden', 'true');
      document.body.append(w);
      var go = function () { if (go.done) return; go.done = 1; location.href = href; };
      setTimeout(go, 700); // armed first
      try {
        w.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 420, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).onfinish = go;
      } catch (x) { go(); }
    });
    addEventListener('pageshow', function (e) {
      if (e.persisted) document.querySelectorAll('.ydx-wipe').forEach(function (w) { w.remove(); });
    });
    // visibility + footer dodge, once per frame at most
    var body = document.body, track = null, ticking = false;
    function blocked() {
      return body.classList.contains('menu-open') || body.classList.contains('gated') || body.classList.contains('in-dial') ||
        !html.classList.contains('ready') || document.querySelector('.drawer:not([hidden]), .sheet:not([hidden])');
    }
    function update() {
      ticking = false;
      track = track && track.isConnected ? track : document.querySelector('.track');
      var page = body.classList.contains('in-page');
      var show = !blocked() && (page || (track && scrollY > track.offsetHeight * 0.9));
      el.classList.toggle('on', !!show);
      var left = document.documentElement.scrollHeight - scrollY - innerHeight;
      el.style.setProperty('--dodge', Math.max(0, 84 - left).toFixed(0) + 'px');
    }
    function kick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    addEventListener('hashchange', function () { setTimeout(kick, 400); });
    new MutationObserver(kick).observe(body, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(kick).observe(html, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', function () { setTimeout(kick, 60); setTimeout(kick, 700); }, true);
    kick();
  })();

  /* ------------------------------------------------------------------ 12. add to cart: a device drops into the cart
   * (round 5) The app flies the product photo into the cart from the shop cards and model pages, but the 3D dial,
   * the flavour page and the box builder only bumped the count. There a small TOMI device (the loader's
   * silhouette) with the pink ring now arcs from the button you pressed into the header's cart (skipped whenever
   * the app's own `.fly` clone is in flight, so the two never double up). It is honest: it only
   * flies when the cart count actually goes UP within 900 ms of a press outside the cart drawer (the drawer's own
   * qty buttons change the count too, and there the count is already in view). Transform/opacity only; nothing in
   * the app's cart logic is touched; off with reduced motion, without WAAPI, and when the cart button is not on screen. */
  (function cartFly() {
    if (reduced || !Element.prototype.animate) return;
    var n = document.querySelector('.cart-n'), cart = document.querySelector('.top .cart');
    if (!n || !cart) return;
    var src = null, prev = parseInt(n.textContent, 10) || 0;
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('button');
      if (!b || b.closest('.drawer, .top')) { src = null; return; }
      var r = b.getBoundingClientRect();
      src = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: performance.now() };
    }, { passive: true, capture: true });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var b = document.activeElement;
      if (!b || b.tagName !== 'BUTTON' || b.closest('.drawer, .top')) return;
      var r = b.getBoundingClientRect();
      src = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: performance.now() };
    }, true);
    new MutationObserver(function () {
      var v = parseInt(n.textContent, 10) || 0, up = v > prev;
      prev = v;
      if (!up || !src || performance.now() - src.t > 900) return;
      var s = src; src = null;
      // the header pins itself on a count change; measure the cart once it is back in place
      setTimeout(function () { fly(s); }, 30);
    }).observe(n, { childList: true, characterData: true, subtree: true });
    function fly(s) {
      var r = cart.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || !styledFly()) return;
      if (document.querySelector('.fly')) return; // the app flies its own product image from shop cards / model pages
      var tx = r.left + r.width / 2, ty = r.top + r.height / 2;
      var p = document.createElement('div');
      p.className = 'ydx-fly'; p.setAttribute('aria-hidden', 'true');
      p.innerHTML = '<i></i>';
      document.body.append(p);
      var dx = tx - s.x, dy = ty - s.y, lift = Math.min(220, Math.abs(dx) * 0.35 + 80);
      var tf = function (k, sc, rot) { // a parabolic hop: x linear, y with a lift that peaks mid-flight
        return 'translate3d(' + (s.x + dx * k).toFixed(1) + 'px,' + (s.y + dy * k - lift * 4 * k * (1 - k)).toFixed(1) + 'px,0) scale(' + sc + ') rotate(' + rot + 'deg)';
      };
      var frames = [], N = 10;
      for (var i = 0; i <= N; i++) {
        var k = i / N, e = 1 - Math.pow(1 - k, 2.2);
        frames.push({ transform: tf(e, (1 - 0.55 * k).toFixed(3), (dx > 0 ? 1 : -1) * 200 * e), opacity: k > 0.92 ? 0 : 1 });
      }
      var an = p.animate(frames, { duration: 720, easing: 'linear', fill: 'forwards' });
      var done = function () { p.remove(); };
      an.onfinish = done; setTimeout(done, 1400);
      // the ring lands: a pink ripple on the cart (the stage ripple, small)
      setTimeout(function () {
        var rp = document.createElement('div');
        rp.className = 'ydx-fly-ring'; rp.setAttribute('aria-hidden', 'true');
        rp.style.left = tx.toFixed(1) + 'px'; rp.style.top = ty.toFixed(1) + 'px'; // static position; only `scale`/opacity animate
        document.body.append(rp);
        rp.animate([{ opacity: 1, scale: '0.4' }, { opacity: 0, scale: '2.4' }], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).onfinish = function () { rp.remove(); };
        setTimeout(function () { rp.remove(); }, 1200);
      }, 640);
    }
    function styledFly() { var x = document.createElement('div'); x.className = 'ydx-fly'; document.body.append(x); var ok = styled(x); x.remove(); return ok; }
  })();
}
})();
