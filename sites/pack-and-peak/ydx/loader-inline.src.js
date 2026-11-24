/* Pack & Peak loader driver (inlined in <head> as <script data-ydx>, before /ydx/enhance.js; this file is its readable source).
   Runs from the first paint, independently of /ydx/enhance.js, so the climb is alive even on slow networks.
   Climb: at least `climb` ms, then parks at ~90-98% until the page is ready (load + fonts + hero massif
   decoded) or the hard cap hits. Exit: the sky panel and a vermilion ridge lift off with transform only
   (composited, so hydration on the main thread cannot make it stutter). */
(function () {
  var d = document.documentElement, W = window, seen = 0, frame = 0, now = function () { return performance.now(); };
  try { seen = sessionStorage.getItem('ydx-pp-seen') ? 1 : 0; } catch (e) {}
  try { frame = W.self !== W.top ? 1 : 0; } catch (e) { frame = 1; }
  var reduce = W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.className += ' ydx-js ydx-hold ydx-loading' + (seen ? ' ydx-repeat' : '') + (frame ? ' ydx-frame' : '');
  // Timings (ms). cap = latest release, measured from navigation start.
  var climb = reduce ? 0 : frame ? 260 : seen ? 300 : 1000,
      cap = frame ? 0 : reduce ? 1200 : seen ? 500 : 2400,
      pause = reduce ? 120 : frame ? 40 : seen ? 60 : 300,
      exitMs = frame ? 400 : seen ? 480 : 780;
  var loaded = 0, fontsOk = 0, imgOk = 0, L, t0, len = 0, trail, reveal, dot, num, done = 0, gone = 0, released = 0, relP = 0, relT = 0, cur = 0, img;
  W.addEventListener('load', function () { loaded = 1; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fontsOk = 1; }); else fontsOk = 1;
  var io = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function render(p) {
    reveal.style.strokeDashoffset = 1 - p;
    if (len) { var pt = trail.getPointAtLength(len * p); dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1)); }
    num.textContent = Math.round(2380 * p).toLocaleString('en-US');
  }
  function ready() {
    if (!imgOk && !img) {
      img = document.querySelector('.hero-massif img');
      if (img) { var ok = function () { imgOk = 1; }; img.decode ? img.decode().then(ok, ok) : ok(); }
    }
    return loaded && fontsOk && (imgOk || !img);
  }
  function tick() {
    if (done) return;
    try { step(); } catch (e) { done = 1; finish(); }  // a throw must never leave the cover up until the safety
  }
  function step() {
    if (!L) {
      L = document.getElementById('ydx-loader');
      if (!L) return requestAnimationFrame(tick);
      t0 = now();
      if (t0 > cap - climb && !frame && !seen && !reduce) climb = 650;  // the HTML itself arrived late: keep it brief
      trail = L.querySelector('.ydx-l-trail'); reveal = L.querySelector('.ydx-l-reveal'); dot = L.querySelector('.ydx-l-dot'); num = L.querySelector('.ydx-l-num b');
      try { len = trail.getTotalLength(); } catch (e) {}
    }
    var t = now(), el = t - t0, base = climb ? io(Math.min(el / climb, 1)) : 1, p;
    if (!released && (frame || ready() || t >= cap)) { released = 1; relT = Math.max(t, t0 + climb); relP = cur; }
    if (!released) p = reduce ? 1 : el < climb ? Math.min(base, .9) : .9 + .08 * (1 - Math.exp(-(el - climb) / 900));
    else if (relT <= t0 + climb) p = base;
    else p = relP + (1 - relP) * (1 - Math.pow(1 - Math.min((t - relT) / 280, 1), 3));
    cur = p; render(p);
    if (released && p >= .999) { done = 1; render(1); L.classList.add('is-summit'); setTimeout(finish, pause); return; }
    requestAnimationFrame(tick);
  }
  function hold() { d.classList.remove('ydx-hold'); d.classList.add('ydx-in'); }
  // Idempotent: the exit's onfinish and the safety can both arrive (exit started just before 4.5 s).
  function cleanup() {
    if (gone) return;
    gone = 1;
    clearTimeout(safety);
    L = L || document.getElementById('ydx-loader');   // never looked up if rAF never ran (background tab)
    if (L && L.parentNode) L.parentNode.removeChild(L);
    d.classList.remove('ydx-loading'); hold();
    W.__ydxDone = 1;
    document.dispatchEvent(new CustomEvent('ydx:ready'));
  }
  function finish() { try { exit(); } catch (e) { cleanup(); } }
  function exit() {
    try { sessionStorage.setItem('ydx-pp-seen', '1'); } catch (e) {}
    L.style.pointerEvents = 'none';
    hold();                                            // the hero intro plays while it is being uncovered
    if (!L.animate) return cleanup();
    if (reduce) { L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = cleanup; return; }
    var e = 'cubic-bezier(.62,.02,.2,1)', up = [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-100%,0)' }];
    var q = function (s) { return L.querySelector(s); };
    q('.ydx-l-panel').animate(up, { duration: exitMs, easing: e, fill: 'forwards' });
    q('.ydx-l-in').animate([{ transform: 'translate3d(0,0,0)', opacity: 1 }, { transform: 'translate3d(0,26vh,0)', opacity: 0 }],
      { duration: exitMs * .8, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'forwards' });
    // The top bar counter-moves so it stays put: the ridge wipes over the brand and the identical masthead brand
    // underneath takes over in place (no second entrance). The tag fades as the header CTA drops in.
    var lift = innerHeight + Math.min(innerHeight * .17, 160, innerWidth * .2);  // = --R in the inline CSS
    q('.ydx-l-top').animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,' + lift + 'px,0)' }], { duration: exitMs, easing: e, fill: 'forwards' });
    q('.ydx-l-tag').animate([{ opacity: 1 }, { opacity: 0 }], { duration: exitMs * .35, fill: 'forwards' });
    q('.ydx-l-under').animate(up, { duration: exitMs, delay: frame ? 40 : 70, easing: e, fill: 'forwards' }).onfinish = cleanup;
  }
  // Never trap the user: whatever happens (no rAF in a background tab, an exception), clear it after 4.5 s.
  var safety = setTimeout(function () {
    done = 1;
    if (L && !reduce) { L.style.transition = 'opacity .3s'; L.style.opacity = 0; L.style.pointerEvents = 'none'; setTimeout(cleanup, 300); } else cleanup();
  }, 4500);
  requestAnimationFrame(tick);
})();
