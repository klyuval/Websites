/* ydx boot for TOMI (tomi-store): loaded synchronously in <head>, right after the loader's inline critical CSS.
 *
 * Round 2: this used to be two inline <script>s plus a block in enhance.js. It is an external file now because
 *  - the live site sends `Content-Security-Policy: script-src 'self' …` (no 'unsafe-inline'), so inline scripts
 *    are blocked there (no loader colour/flags, plus a CSP console error);
 *  - enhance.js is `defer`, and deferred scripts run in document order AFTER the 870 KB app bundle, so on a slow
 *    connection the loader's controller (caption, progress, safety exit) only started once the bundle had arrived.
 *
 * Parts: 1. flags, enhance.css, loader colour (before first paint)  2. loader controller (starts as soon as the markup is parsed)
 *
 * Round 3: `ydx-b` (set here and only here) is what shows the brand loader and hides the app's own counter, so if
 * this file fails to load the page falls back to the app's original loader instead of an uncontrolled cover. The
 * exit can no longer throw before the loader is hidden, a page that becomes ready in a background tab is uncovered
 * at once (rAF and animations do not run there), and a last cap covers an app that reaches 100% but never `ready`.
 */
(function () {
  'use strict';
  var d = document.documentElement, c = d.classList;
  c.add('ydx-b', 'ydx-js', 'ydx-load');
  try { if (sessionStorage.getItem('ydx-tomi-seen')) c.add('ydx-repeat'); } catch (e) {}
  try { if (window.self !== window.top) c.add('ydx-frame'); } catch (e) { c.add('ydx-frame'); }
  // enhance.css, appended after the app's CSS. Script-inserted, so it never blocks first paint or the app's module
  // (a parser <link> here held both for as long as the file took; enhance.js adds it too if this script failed)
  if (!document.querySelector('link[data-ydx]')) {
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/ydx/enhance.css'; css.setAttribute('data-ydx', '');
    document.head.appendChild(css);
  }

  /* ---------------------------------------------------------------- 1. loader colour = the model in the URL */
  var h = location.hash || '', id = h.indexOf('#/') === 0 ? '' : h.slice(1).split('/')[0];
  var M = { x: '#17a673', xl: '#6b34b8', 'xl-plus': '#f28c0f', ultima: '#e0262c' }, hex = M[id] || '#6b34b8';
  function mix(a, t, b) {
    var o = '#';
    for (var i = 1; i < 7; i += 2) {
      var x = parseInt(a.substr(i, 2), 16), y = parseInt(b.substr(i, 2), 16);
      o += ('0' + Math.round(x + (y - x) * t).toString(16)).slice(-2);
    }
    return o;
  }
  var st = d.style;
  st.setProperty('--ydx-l1', mix(hex, 0.14, '#ffffff'));
  st.setProperty('--ydx-l2', hex);
  st.setProperty('--ydx-l3', mix(hex, 0.52, '#000000'));
  if (id === 'xl-plus') { st.setProperty('--ydx-lf', '#0e0d0c'); st.setProperty('--ydx-acc', '#0e0d0c'); }
  else if (id === 'ultima') st.setProperty('--ydx-acc', '#fff8ef');
  var en = false;
  try { en = localStorage.getItem('tomi-lang') === 'en'; } catch (e) {}
  d.setAttribute('data-ydx-l', en ? 'en' : 'he');

  /* ---------------------------------------------------------------- 2. loader controller
   * The app gates its first paint on the 3D models: it writes download progress into the (hidden) old
   * .loader-n counter and adds html.ready once the GLBs have decoded. We mirror that progress, and leave on ready.
   *  - Progress: a slow time-based creep to 14% covers the part the app cannot report (bundle + fonts), then the
   *    app's real model progress maps onto 14–100%. Monotonic, so it never sits frozen at 0 on slow networks.
   *  - Minimum display: 1 s on a first visit, 350 ms on a repeat visit in this session, 0 in the hub iframe.
   *  - Safety: if the app's script has not come alive 4 s after `load`, leave anyway (see the load listener).
   *  - Exit: transform/opacity only, so the compositor keeps it smooth while three.js compiles its shaders on the
   *    main thread right after `ready` (the old clip-path wipe froze there for seconds on slow phones). It starts
   *    from a rendered frame and the panel is hidden only after the lift has had time to finish on screen. */
  var reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var frame = c.contains('ydx-frame'), repeat = c.contains('ydx-repeat');
  var MIN = frame ? 0 : repeat ? 350 : 1000;
  var EASE_LIFT = 'cubic-bezier(.66,0,.22,1)', EASE_IN = 'cubic-bezier(.55,0,.7,.2)';

  function start() {
    var L = document.querySelector('.ydx-loader');
    if (!L || L.__ydx) return;
    L.__ydx = 1;
    L.classList.add('ydx-ctl');
    var ring = L.querySelector('.r'), lv = L.querySelector('.ydx-lv'), surf = L.querySelector('.ydx-surf'),
      topE = L.querySelector('.ydx-top'), num = L.querySelector('.ydx-count b'), cap = L.querySelector('.ydx-cap'),
      mark = L.querySelector('.ydx-mark');
    var src = document.querySelector('.loader-n'), sr = L.querySelector('.ydx-sr');
    if (cap) cap.textContent = en ? 'TOMI · Loading' : 'TOMI · טוען';
    if (sr) sr.textContent = en ? 'TOMI · Loading' : 'TOMI · טוען';
    var t0 = performance.now(), real = 0, target = 0, shown = 0, readyAt = 0, exiting = false, finished = false, fontOk = false;

    function read() {
      var v = parseFloat(src && src.textContent) || 0;
      if (v > real) {
        real = Math.min(100, v);
        // the app's own decode cap is 15 s after 100%; if `ready` still has not come 20 s later the app broke
        if (real >= 100) setTimeout(function () { if (!readyAt) exit(); }, 20000);
      }
    }
    if (src) new MutationObserver(read).observe(src, { childList: true, characterData: true, subtree: true });

    // the Karantina numerals only appear once the face has loaded (no fallback-font jump inside the loader)
    function fontCheck(now) {
      if (fontOk) return;
      if (now - t0 > 2600) fontOk = true;
      else if (document.fonts && document.fonts.forEach) {
        document.fonts.forEach(function (f) { if (!fontOk && /Karantina/.test(f.family) && f.status === 'loaded') fontOk = true; });
      } else fontOk = true;
      if (fontOk) c.add('ydx-f');
    }

    var TOP = 34, BOT = 168, last = t0; // device silhouette span in the SVG viewBox
    function paint(now) {
      if (finished) return;
      now = now || performance.now();
      read();
      fontCheck(now);
      var creep = 14 * (1 - Math.exp(-(now - t0) / 5000));
      var goal = readyAt ? 100 : real > 0 ? 14 + real * 0.86 : creep;
      if (goal > target) target = goal;
      // time-based easing, so a slow first WebGL frame on weak devices never stretches the loader
      var dt = Math.min(200, now - last);
      last = now;
      shown += (target - shown) * (reduced ? 1 : 1 - Math.exp(-dt / 110));
      if (Math.abs(target - shown) < 0.25) shown = target;
      var p = shown / 100, y = BOT - (BOT - TOP) * p, rx = y < 63 ? 12 : 22, mid = p > 0.01 && p < 0.995;
      ring.style.strokeDasharray = shown.toFixed(2) + ' 100';
      lv.setAttribute('y', y.toFixed(2));
      surf.setAttribute('cy', y.toFixed(2));
      surf.setAttribute('rx', rx);
      surf.style.strokeOpacity = mid ? '0.9' : '0';
      // the liquid's top face: a filled ellipse makes the rising level read as a 3D cylinder section
      topE.setAttribute('cy', y.toFixed(2));
      topE.setAttribute('rx', rx);
      topE.style.opacity = mid ? '1' : '0';
      num.textContent = String(Math.round(shown));
      requestAnimationFrame(paint);
    }
    requestAnimationFrame(paint);

    function onReady() {
      if (readyAt) return;
      readyAt = performance.now();
      // ready while the tab is in the background: nobody sees the exit, and rAF/animations are paused there, so
      // the user would come back to a loader that only then starts leaving. Uncover at once.
      if (document.hidden) { exiting = true; finish(); return; }
      var wait = MIN - readyAt; // performance.now() counts from navigation start
      // Start the exit from a rendered frame, never from inside the app's long `ready` task: an animation created
      // during a long task gets its start time on the main thread long before the compositor actually begins it,
      // so `onfinish` fired while the panel was still only a fifth of the way up and the loader popped away.
      setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(exit); }); }, Math.max(0, wait));
    }
    if (c.contains('ready')) onReady();
    else new MutationObserver(function (_, mo) {
      if (c.contains('ready')) { mo.disconnect(); onReady(); }
    }).observe(d, { attributes: true, attributeFilter: ['class'] });

    // safety: 4 s after load the app has neither reported progress nor finished its init -> its script failed
    // (bundle missing, or no WebGL: the renderer throws at module top level); never trap the user. Round 3: "no
    // progress" alone was not proof: models served without Content-Length, and the app's fallback download of the
    // uncompressed GLBs (taken on the live site, whose CSP blocks the WASM decoder), report none, so on a slow link
    // the loader left long before the page was ready. The app creates its route curtain right after the WebGL
    // renderer and just before it starts loading the models, and from then on it always reaches `ready` (its own
    // try/catch and 90 s cap), so a curtain in the DOM means "alive, keep waiting". Last resort: 100 s after load.
    addEventListener('load', function () {
      setTimeout(function () { if (!readyAt && real === 0 && !document.querySelector('.curtain')) exit(); }, 4000);
      setTimeout(function () { if (!readyAt) exit(); }, 100000);
    });
    // the tab goes to the background while the exit is pending or running: finish now (see onReady)
    document.addEventListener('visibilitychange', function () { if (document.hidden && (readyAt || exiting)) { exiting = true; finish(); } });

    function exit() {
      if (exiting) return;
      exiting = true;
      L.style.pointerEvents = 'none'; // the page is usable the moment the exit starts
      if (document.hidden) return finish();
      var D = reduced || !L.animate ? 240 : frame || repeat ? 520 : 760;
      setTimeout(finish, D * 2.2); // armed first: hidden tab, throttled animations, or a throw below
      try {
        if (D === 240) {
          if (!L.animate) return finish();
          L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D, fill: 'forwards' }).onfinish = finish;
          return;
        }
        // the mark swells into the ring and fades, the numerals rise away, then the panel lifts like the curtain
        mark.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.12)', opacity: 0 }],
          { duration: D * 0.5, easing: EASE_IN, fill: 'forwards' });
        L.querySelectorAll('.ydx-count,.ydx-cap').forEach(function (el, i) {
          el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }],
            { duration: D * 0.4, delay: i * 40, easing: EASE_IN, fill: 'forwards' });
        });
        var lift = L.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-100%,0)' }],
          { duration: D, delay: D * 0.16, easing: EASE_LIFT, fill: 'forwards' });
        // hide one frame pair after the main thread thinks the lift is done (it holds at -100% until then anyway)
        lift.onfinish = function () { requestAnimationFrame(function () { requestAnimationFrame(finish); }); };
      } catch (e) { finish(); }
    }
    function finish() {
      if (finished) return;
      finished = true;
      L.hidden = true;
      L.setAttribute('aria-hidden', 'true');
      c.remove('ydx-load');
      c.add('ydx-loaded');
      try { sessionStorage.setItem('ydx-tomi-seen', '1'); } catch (e) {}
    }
  }

  // the loader markup is the first thing in <body>; start as soon as it (and the app's counter) are parsed
  if (document.querySelector('.loader-n')) start();
  else {
    var mo = new MutationObserver(function () { if (document.querySelector('.loader-n')) { mo.disconnect(); start(); } });
    mo.observe(d, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); start(); });
  }
})();
