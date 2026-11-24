/* ==========================================================================
   Pack & Peak — ydx design + motion layer (vanilla, no dependencies)
   - Loader: contours draw in, the trail climbs to a summit flag while the
     altimeter counts up; leaves through a Dolomite-ridge wipe.
   - Chapter-jump transition (dock / CTA jumps of 2+ chapters).
   - Scroll reveals, counters, magnetic buttons, map reticle, altimeter pill.
   The page is a React app hydrated on `document`: we never add/remove/reorder
   nodes inside <main>. We only set data-ydx-* attributes, inline `translate`,
   and Web Animations on existing nodes; our own nodes are appended to <body>.
   ========================================================================== */
(function () {
  'use strict';
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
  var SUMMIT = 2380, TRAILHEAD = 1520;               // fictional Dolomite ridgeline (860 m gain)

  if (!reduce) html.classList.add('ydx-motion');

  /* ------------------------------------------------------------------ *
   * 1. Loader
   * ------------------------------------------------------------------ */
  function runLoader() {
    var L = document.getElementById('ydx-loader');
    clearTimeout(window.__ydxFallback);
    if (!L || !html.classList.contains('ydx-loading')) { finishHold(); return; }
    var frame = html.classList.contains('ydx-frame');
    var repeat = html.classList.contains('ydx-repeat');
    var climbMs = reduce ? 0 : frame ? 300 : repeat ? 420 : 1050;
    var hardCap = frame ? 300 : repeat ? 1500 : 2600;  // ms since navigation start: never trap the user
    var trail = $('.ydx-l-trail', L), reveal = $('.ydx-l-reveal', L), dot = $('.ydx-l-dot', L), num = $('.ydx-l-num b', L);
    var len = 0; try { len = trail.getTotalLength(); } catch (e) {}
    var loaded = document.readyState === 'complete';
    if (!loaded) addEventListener('load', function () { loaded = true; }, { once: true });
    var t0 = performance.now(), released = false, relP = 0, relT = 0, cur = 0, done = false;

    function render(p) {
      reveal.style.strokeDashoffset = String(1 - p);
      if (len) { var pt = trail.getPointAtLength(len * p); dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1)); }
      num.textContent = fmt(SUMMIT * p);
    }
    // The climb takes at least climbMs; it parks at ~90-98% until the page has loaded (or hardCap hits).
    function tick(now) {
      if (done) return;
      var el = now - t0, base = climbMs ? easeInOut(clamp(el / climbMs, 0, 1)) : 1, p;
      if (!released && (loaded || now >= hardCap)) { released = true; relT = Math.max(now, t0 + climbMs); relP = cur; }
      if (!released) p = el < climbMs ? Math.min(base, .9) : .9 + .08 * (1 - Math.exp(-(el - climbMs) / 900));
      else if (relT <= t0 + climbMs) p = base;
      else p = relP + (1 - relP) * easeOut(clamp((now - relT) / 280, 0, 1));
      cur = p; render(p);
      if (released && p >= .999) { done = true; render(1); summit(); return; }
      raf(tick);
    }
    function summit() {
      L.classList.add('is-summit');
      setTimeout(exit, reduce ? 250 : frame ? 60 : repeat ? 200 : 340);
    }
    function exit() {
      try { sessionStorage.setItem('ydx-pp-seen', '1'); } catch (e) {}
      L.style.pointerEvents = 'none';
      html.classList.add('ydx-in');
      if (reduce) {
        finishHold();
        L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = cleanup;
        return;
      }
      var dur = frame ? 420 : repeat ? 700 : 880;
      var W = innerWidth, H = innerHeight, R = Math.min(H * .17, 160);
      var xs = [0, .05, .09, .14, .18, .23, .28, .32, .37, .42, .46, .51, .55, .6, .65, .7, .74, .79, .84, .89, .94, 1];
      var hs = [.22, .45, .3, .66, .5, .92, .55, .74, .4, .8, 1, .7, .86, .5, .64, .34, .6, .42, .72, .3, .5, .24];
      var ridge = function (base, k) {
        var pts = ['0px 0px', W + 'px 0px'];
        for (var i = xs.length - 1; i >= 0; i--) pts.push((xs[i] * W).toFixed(1) + 'px ' + (base - hs[i] * R * k).toFixed(1) + 'px');
        return 'polygon(' + pts.join(',') + ')';
      };
      var ease = 'cubic-bezier(.76,0,.24,1)';
      var panel = $('.ydx-l-panel', L), under = $('.ydx-l-under', L);
      panel.animate([{ clipPath: ridge(H + R, 1) }, { clipPath: ridge(0, 1) }], { duration: dur, easing: ease, fill: 'forwards' });
      $$('.ydx-l-map, .ydx-l-alt, .ydx-l-cap, .ydx-l-top', L).forEach(function (n) {
        n.animate([{ translate: '0 0', opacity: 1 }, { translate: '0 -10vh', opacity: 0 }], { duration: dur * .7, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
      });
      under.animate([{ clipPath: ridge(H + R, .8) }, { clipPath: ridge(0, .8) }], { duration: dur, delay: frame ? 45 : 75, easing: ease, fill: 'forwards' })
        .onfinish = cleanup;
      setTimeout(finishHold, frame ? 60 : 180);       // hero intro starts as the ridge passes
    }
    function cleanup() {
      if (L.parentNode) L.parentNode.removeChild(L);
      html.classList.remove('ydx-loading');
      document.dispatchEvent(new CustomEvent('ydx:ready'));
    }
    raf(tick);
  }
  function finishHold() { html.classList.remove('ydx-hold'); html.classList.add('ydx-in'); }

  /* ------------------------------------------------------------------ *
   * 2. Scroll reveals (attributes only; the app never owns data-ydx-*)
   * ------------------------------------------------------------------ */
  var REVEAL = [
    '.chapter > .pin', '.chapter-heading h2 em', '.summit h2 em', '.signpost', '.board', '.board-note',
    '.atlas-note', '.terrain-readout', '.sheet-arrow', '.terrain-caption', '.kit-grid', '.pack-core',
    '.pack-foot', '.summit-actions', '.summit-footer'
  ].join(',');
  // Elements clipped to nothing (write-in accents) never intersect, so they are observed through a parent.
  function proxyOf(el) {
    if (el.matches('h2 em')) return el.closest('h2');
    if (el.classList.contains('board-note')) return el.closest('.board');
    return el;
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.__ydxDone = true;
      (e.target.__ydxFor || [e.target]).forEach(function (el) {
        el.setAttribute('data-ydx-in', '');
        if (el.classList.contains('terrain-readout')) readoutIn(el, false);
      });
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 }) : null;
  function scanReveals() {
    $$(REVEAL).forEach(function (el) {
      if (el.__ydxSeen) return;
      el.__ydxSeen = true;
      if (!io || reduce) { el.setAttribute('data-ydx-in', ''); return; }
      var px = proxyOf(el) || el;
      if (px.__ydxDone) { el.setAttribute('data-ydx-in', ''); return; }
      if (!px.__ydxFor) { px.__ydxFor = []; io.observe(px); }
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
    function step(now) {
      if (last !== null && tn.nodeValue !== last) return;      // React updated it: stand down
      if (!start) start = now + delay;
      var t = clamp((now - start) / 1100, 0, 1);
      last = (target * easeOut(t)).toFixed(dec);
      tn.nodeValue = t >= 1 ? final : last;
      if (t < 1) raf(step);
    }
    raf(step);
  }
  function readoutIn(card, replay) {
    if (reduce) return;
    $$('.route-stats strong', card).forEach(function (s, i) { countUp(s, (replay ? 60 : 250) + i * 90); });
    var prof = $('.profile', card);
    if (prof) prof.animate([{ clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% 0 -10% 0)' }],
      { duration: 1100, delay: replay ? 0 : 200, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' });
    var tag = $('.weather span', card);
    if (tag) tag.animate([{ scale: 2.2, opacity: 0 }, { scale: .92, opacity: 1, offset: .7 }, { scale: 1, opacity: 1 }],
      { duration: 520, delay: replay ? 380 : 900, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'backwards' });
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
      cur.animate([{ opacity: 0, translate: '0 9px' }, { opacity: 1, translate: '0 0' }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
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
      s.animate([{ scale: 1 }, { scale: 1.12, rotate: '-3deg' }, { scale: 1, rotate: '0deg' }], { duration: 420, delay: 470, easing: 'cubic-bezier(.3,1.4,.5,1)' });
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
      var b = e.target.closest && e.target.closest('.round-cta, .header-cta, .next-chapter, .pill, .text-button');
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
      var s = $$('.route-stats strong')[1], v = s && s.firstChild && parseFloat(s.firstChild.nodeValue);
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
      var g = gain(), alt = Math.round((TRAILHEAD + g * p) / 5) * 5;
      if (alt !== shown) { shown = alt; b.firstChild.nodeValue = fmt(alt); }
      var top = p > .9;
      if (top !== onFlag) { onFlag = top; a.classList.toggle('is-summit', top); small.textContent = top ? 'SUMMIT' : 'ALT.'; }
    }
    function q() { if (!queued) { queued = true; raf(update); } }
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
    addEventListener('scroll', function () { if (r.classList.contains('is-on')) off(); }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 8. Chapter-jump transition (only for jumps of 2+ chapters)
   * ------------------------------------------------------------------ */
  var CH = [
    { id: 'top', name: 'The calling', bg: 'var(--sky)', fg: 'var(--ink)' },
    { id: 'trails', name: 'Choose a trail', bg: 'var(--spruce)', fg: 'var(--cream)' },
    { id: 'terrain', name: 'Read the mountain', bg: 'var(--paper)', fg: 'var(--ink)', paper: true },
    { id: 'pack', name: 'Pack with purpose', bg: 'var(--vermilion)', fg: 'var(--ink)', red: true },
    { id: 'summit', name: 'The good part', bg: 'var(--sky)', fg: 'var(--ink)' }
  ];
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
    function play(to) {
      var c = CH[to];
      anims.forEach(function (a) { a.cancel(); });
      B.style.setProperty('--s-bg', c.bg); B.style.setProperty('--s-fg', c.fg);
      B.classList.toggle('is-paper', !!c.paper);
      A.style.background = A.style.color = c.red ? 'var(--ink)' : '';
      // Page pins are numbered 01-04 from "Choose a trail"; the hero gets the brand mountain instead.
      $('.ydx-s-pin', s).innerHTML = to ? '0' + to : '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>';
      var eye = $('#' + c.id + ' .eyebrow');
      $('.ydx-s-eye', s).textContent = eye ? eye.textContent.trim() : '';
      $('.ydx-s-name', s).textContent = c.name;
      s.classList.add('is-on');
      var e = 'cubic-bezier(.7,0,.3,1)';
      // A (accent) leads in and leaves last; B (destination field) arrives second and leaves first.
      anims = [
        A.animate([{ translate: '0 115%', easing: e }, { translate: '0 0', offset: .34 }, { translate: '0 0', offset: .66, easing: e }, { translate: '0 -115%' }], { duration: 720, fill: 'both' }),
        B.animate([{ translate: '0 115%' }, { translate: '0 115%', offset: .06, easing: e }, { translate: '0 0', offset: .4 }, { translate: '0 0', offset: .6, easing: e }, { translate: '0 -115%', offset: .92 }, { translate: '0 -115%' }], { duration: 720, fill: 'both' }),
        $('.ydx-s-pin', s).animate([{ scale: 0, rotate: '-30deg' }, { scale: 0, rotate: '-30deg', offset: .26, easing: 'cubic-bezier(.3,1.6,.5,1)' }, { scale: 1, rotate: '0deg', offset: .46 }, { scale: 1, rotate: '0deg' }], { duration: 720 })
      ];
      // Without Lenis (touch / no smooth wheel) the app's native smooth scroll can outlast the cover: land it while covered.
      setTimeout(function () {
        if (html.classList.contains('lenis')) return;
        var el = document.getElementById(c.id);
        if (el) scrollTo({ top: to === 0 ? 0 : el.getBoundingClientRect().top + scrollY, behavior: 'instant' });
      }, 300);
      anims[1].onfinish = function () { s.classList.remove('is-on'); };
    }
    document.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var btn = e.target.closest && e.target.closest('button');
      if (!btn) return;
      var cur = current(), to = target(btn, cur);
      if (to < 0 || Math.abs(to - cur) < 2) return;
      play(to);
    }, true);
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
        if (el > 2200 || redone) return;
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
    runLoader();
    scanAll();
    altimeter();
    magnets();
    shutter();
    fixChooseScroll();
    // React may re-render sections (trail choice re-keys the relief and kit list): rescan.
    var main = $('main.journey') || document.body, t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(scanAll, 60); }).observe(main, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
