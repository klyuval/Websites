/* TOMI Ring Lab: boot (ydx round 5). Loaded synchronously in <head>: the live CSP (script-src 'self') blocks inline
 * scripts, and the loader colour, language and direction must be right before the first paint.
 *  1. flags + language/direction (same localStorage key as the store) + model colour (from ?m=, else the last one)
 *  2. 18+ only: the store's age gate decides; without its answer we go to the store, where the gate is
 *  3. loader controller (the store's TOMI loader: the device fills inside the ring, then the panel lifts) */
(function () {
  'use strict';
  var d = document.documentElement, c = d.classList;
  c.add('lab-js', 'ydx-b', 'ydx-load');
  try { if (sessionStorage.getItem('ydx-tomi-seen')) c.add('ydx-repeat'); } catch (e) {}
  try { if (window.self !== window.top) c.add('ydx-frame'); } catch (e) { c.add('ydx-frame'); }
  var reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduced) c.add('lab-rm');

  // 2. the store asks "18+?" once and remembers it; this page shows nothing a minor should see first
  var ok = false;
  try { ok = localStorage.getItem('tomi-age') === '1'; } catch (e) { ok = true; } // storage blocked: the store could not remember either
  if (!ok && !c.contains('ydx-frame')) { location.replace('/'); return; }

  var en = false;
  try { en = localStorage.getItem('tomi-lang') === 'en'; } catch (e) {}
  d.lang = en ? 'en' : 'he';
  d.dir = en ? 'ltr' : 'rtl';
  d.setAttribute('data-ydx-l', en ? 'en' : 'he');

  // 1. model colour (the store passes the model you were looking at)
  var M = { x: '#17a673', xl: '#6b34b8', 'xl-plus': '#f28c0f', ultima: '#e0262c' };
  var id = (location.search.match(/[?&]m=([a-z-]+)/) || [])[1];
  if (!M[id]) { try { id = sessionStorage.getItem('ydx-lab-m'); } catch (e) {} }
  if (!M[id]) id = 'xl';
  d.setAttribute('data-m', id);
  function mix(a, t, b) {
    var o = '#';
    for (var i = 1; i < 7; i += 2) {
      var x = parseInt(a.substr(i, 2), 16), y = parseInt(b.substr(i, 2), 16);
      o += ('0' + Math.round(x + (y - x) * t).toString(16)).slice(-2);
    }
    return o;
  }
  var hex = M[id], st = d.style;
  st.setProperty('--ydx-l1', mix(hex, 0.14, '#ffffff'));
  st.setProperty('--ydx-l2', hex);
  st.setProperty('--ydx-l3', mix(hex, 0.52, '#000000'));
  st.setProperty('--c1', mix(hex, 0.28, '#ffffff'));
  st.setProperty('--c2', hex);
  st.setProperty('--c3', mix(hex, 0.32, '#000000'));
  if (id === 'xl-plus') { c.add('ink'); st.setProperty('--ydx-lf', '#0e0d0c'); st.setProperty('--ydx-acc', '#0e0d0c'); }
  else if (id === 'ultima') st.setProperty('--ydx-acc', '#fff8ef');

  // 3. loader controller: progress is the lab's own boot (fonts, shaders, first frame); lab.js adds html.lab-ready
  var frame = c.contains('ydx-frame'), repeat = c.contains('ydx-repeat');
  var MIN = frame ? 0 : repeat ? 300 : 800;
  var EASE_LIFT = 'cubic-bezier(.66,0,.22,1)', EASE_IN = 'cubic-bezier(.55,0,.7,.2)';
  function start() {
    var L = document.querySelector('.ydx-loader');
    if (!L || L.__ydx) return;
    L.__ydx = 1;
    L.classList.add('ydx-ctl');
    var ring = L.querySelector('.r'), lv = L.querySelector('.ydx-lv'), surf = L.querySelector('.ydx-surf'),
      topE = L.querySelector('.ydx-top'), num = L.querySelector('.ydx-count b'), cap = L.querySelector('.ydx-cap'),
      mark = L.querySelector('.ydx-mark'), sr = L.querySelector('.ydx-sr');
    var label = en ? 'TOMI · Ring Lab' : 'TOMI · מעבדת הטבעות';
    if (cap) cap.textContent = label;
    if (sr) sr.textContent = label + (en ? ' · Loading' : ' · טוען');
    var t0 = performance.now(), shown = 0, readyAt = 0, exiting = false, finished = false, last = t0;
    var TOP = 34, BOT = 168;
    function paint(now) {
      if (finished) return;
      now = now || performance.now();
      if (!c.contains('ydx-f')) {
        var f = now - t0 > 2600 || !document.fonts;
        if (!f) document.fonts.forEach(function (x) { if (/Karantina/.test(x.family) && x.status === 'loaded') f = true; });
        if (f) c.add('ydx-f');
      }
      var target = readyAt ? 100 : 70 * (1 - Math.exp(-(now - t0) / 700));
      var dt = Math.min(200, now - last); last = now;
      shown += (target - shown) * (reduced ? 1 : 1 - Math.exp(-dt / 110));
      if (Math.abs(target - shown) < 0.25) shown = target;
      var p = shown / 100, y = BOT - (BOT - TOP) * p, rx = y < 63 ? 12 : 22, mid = p > 0.01 && p < 0.995;
      ring.style.strokeDasharray = shown.toFixed(2) + ' 100';
      lv.setAttribute('y', y.toFixed(2));
      surf.setAttribute('cy', y.toFixed(2)); surf.setAttribute('rx', rx);
      surf.style.strokeOpacity = mid ? '0.9' : '0';
      topE.setAttribute('cy', y.toFixed(2)); topE.setAttribute('rx', rx);
      topE.style.opacity = mid ? '1' : '0';
      num.textContent = String(Math.round(shown));
      requestAnimationFrame(paint);
    }
    requestAnimationFrame(paint);
    function onReady() {
      if (readyAt) return;
      readyAt = performance.now();
      if (document.hidden) { exiting = true; finish(); return; }
      setTimeout(function () { requestAnimationFrame(function () { requestAnimationFrame(exit); }); }, Math.max(0, MIN - readyAt));
    }
    if (c.contains('lab-ready')) onReady();
    else new MutationObserver(function (_, mo) { if (c.contains('lab-ready')) { mo.disconnect(); onReady(); } })
      .observe(d, { attributes: true, attributeFilter: ['class'] });
    // never trap the user: lab.js missing or broken still uncovers the (static, designed) page
    addEventListener('load', function () { setTimeout(function () { if (!readyAt) { c.add('lab-ready'); onReady(); } }, 4000); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && (readyAt || exiting)) { exiting = true; finish(); } });
    function exit() {
      if (exiting) return;
      exiting = true;
      L.style.pointerEvents = 'none';
      if (document.hidden) return finish();
      var D = reduced || !L.animate ? 240 : frame || repeat ? 520 : 720;
      setTimeout(finish, D * 2.2);
      try {
        if (D === 240) {
          if (!L.animate) return finish();
          L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D, fill: 'forwards' }).onfinish = finish;
          return;
        }
        mark.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.12)', opacity: 0 }], { duration: D * 0.5, easing: EASE_IN, fill: 'forwards' });
        L.querySelectorAll('.ydx-count,.ydx-cap').forEach(function (el, i) {
          el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }], { duration: D * 0.4, delay: i * 40, easing: EASE_IN, fill: 'forwards' });
        });
        var lift = L.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-100%,0)' }], { duration: D, delay: D * 0.16, easing: EASE_LIFT, fill: 'forwards' });
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
  if (document.querySelector('.ydx-count')) start();
  else {
    var mo = new MutationObserver(function () { if (document.querySelector('.ydx-count')) { mo.disconnect(); start(); } });
    mo.observe(d, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); start(); });
  }
})();
