/* ydx enhancement layer for Negia (נגיעה) — loader exit, page transitions, reveals and micro-motion.
   Plain JS, no dependencies. The site's own bundle (Lenis, shade view-transitions, menu dialog, form) is left untouched:
   everything here only adds attributes / individual transform properties (translate, scale) that the app never writes. */
(function () {
  'use strict';
  var d = document, html = d.documentElement, w = window;
  if (w.__ydxE) return; // idempotent: a second copy of this file must not double every listener, observer and cursor
  w.__ydxE = 1; // also tells the inline boot script that this layer owns the loader exit
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)');
  var motionOK = function () { return !reduce.matches; };
  var OUT = 'cubic-bezier(.16,1,.3,1)';
  var MASK = '/ydx/smear-mask.webp';
  var MASK_RATIO = 309 / 820;
  if (motionOK()) html.classList.add('ydx-motion');
  // decode the smear mask early: the loader exit and the page wipe are both cut from it
  // (the loader's inline .ydx-l-warm element also uses it as a CSS mask: Chrome hides an element whose mask image is still
  //  pending, so the URL must already be loaded in the style system before the exit applies it, or the page flashes)
  var maskImg = new Image(), maskOK = false; maskImg.src = MASK;
  var maskReady = (maskImg.decode ? maskImg.decode() : Promise.resolve()).then(function () { maskOK = true; }, function () {});

  /* ------------------------------------------------------------------ helpers */
  function ss(fn) { try { return fn(w.sessionStorage); } catch (e) { return null; } }
  // enhance.css sets --ydx-css:1; without it (404, blocked) the wipe, the cursor and the reveal states have no styles, so skip them
  function cssOK() { try { return getComputedStyle(html).getPropertyValue('--ydx-css').trim() === '1'; } catch (e) { return false; } }
  function anim(el, kf, opt) { try { return el.animate(kf, opt); } catch (e) { return null; } }
  // size the smear mask must reach so its solid core covers the whole viewport from point (x,y)
  function coverWidth(x, y) {
    var dx = Math.max(x, innerWidth - x), dy = Math.max(y, innerHeight - y);
    return Math.max(dx / 0.28, dy / (0.24 * MASK_RATIO)) * 1.1;
  }
  // standard mask properties where supported (Chrome 120+, Safari 15.4+, Firefox), prefixed otherwise
  var STD = w.CSS && CSS.supports && CSS.supports('mask-composite', 'exclude');
  var P = STD ? { img: 'maskImage', pos: 'maskPosition', size: 'maskSize', rep: 'maskRepeat', comp: 'maskComposite', exc: 'exclude' }
    : { img: 'webkitMaskImage', pos: 'webkitMaskPosition', size: 'webkitMaskSize', rep: 'webkitMaskRepeat', comp: 'webkitMaskComposite', exc: 'xor' };
  function maskFrames(x, y, w0, w1, hole) {
    var f = function (wd) {
      var ht = wd * MASK_RATIO, pos = (x - wd / 2).toFixed(1) + 'px ' + (y - ht / 2).toFixed(1) + 'px';
      var size = wd.toFixed(1) + 'px ' + ht.toFixed(1) + 'px';
      var o = {}; o[P.pos] = hole ? pos + ', 0 0' : pos; o[P.size] = hole ? size + ', 100% 100%' : size; return o;
    };
    return [f(w0), f(w1)];
  }

  /* ------------------------------------------------------------------ 1. loader exit */
  var L = w.__ydxL || { mode: 'full', t0: Date.now() };
  var loader = d.getElementById('ydx-loader');
  // minimum display, counted from the moment the choreography starts (L.go, set inline once its assets are ready)
  var MIN = { full: 1400, short: 200, frame: 300, nav: 60, reduced: 300 }[L.mode] || 900;
  var released = false;
  function releaseHero() { if (!released) { released = true; html.classList.remove('ydx-loading'); } }
  function finishLoader() {
    if (!loader || loader.dataset.out) return;
    loader.dataset.out = '1';
    var done = function () { releaseHero(); if (loader) loader.remove(); loader = null; };
    try { exitLoader(done); } catch (e) { done(); } // whatever goes wrong, the loader must not stay over the page
  }
  function exitLoader(done) {
    // background tab: nobody sees the exit, and its animation would not advance (no frames) — just take the loader away
    if (d.hidden) return done();
    // no mask yet (very slow network, safety timeout): a plain fade rather than a mask that would blank the loader
    if (L.mode === 'reduced' || !loader.animate || !maskOK) {
      releaseHero();
      var a0 = anim(loader, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease', fill: 'forwards' });
      return a0 ? (a0.onfinish = done) : done();
    }
    var stage = loader.querySelector('.ydx-l-stage');
    var cx = innerWidth / 2, cy = innerHeight / 2;
    var w0 = L.mode === 'nav' ? 0 : (stage ? stage.getBoundingClientRect().width * 0.92 : 0);
    var w1 = coverWidth(cx, cy);
    var dur = { frame: 260, nav: 520, short: 520 }[L.mode] || 760;
    // the swatch becomes a window: a smear-shaped hole opens in the burgundy and grows until the page is revealed
    loader.style[P.img] = 'url(' + MASK + '), linear-gradient(#000,#000)';
    loader.style[P.rep] = 'no-repeat';
    loader.style[P.comp] = P.exc;
    var f0 = maskFrames(cx, cy, w0, w1, true)[0]; for (var k in f0) loader.style[k] = f0[k];
    if (stage) anim(stage, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.06)' }], { duration: dur * 0.45, easing: 'ease-in', fill: 'forwards' });
    var a = anim(loader, maskFrames(cx, cy, w0, w1, true), { duration: dur, easing: 'cubic-bezier(.7,0,.25,1)', fill: 'forwards' });
    // hand over to the hero's own entrance a beat into the reveal
    setTimeout(releaseHero, L.mode === 'nav' ? 40 : dur * 0.12);
    if (a) a.onfinish = done; else done();
  }
  if (loader) {
    var ready = new Promise(function (res) {
      if (L.mode === 'frame' || L.mode === 'nav') return res(); // iframe preview / page transition: never wait for load
      if (d.readyState === 'complete') res(); else w.addEventListener('load', res, { once: true });
    });
    // the hub preview (frame) and the arrival cover (nav) are short by design: do not let a slow font hold them
    var fontCap = { frame: 150, nav: 400 }[L.mode] || 1200;
    var fonts = (d.fonts && d.fonts.ready) ? Promise.race([d.fonts.ready, new Promise(function (r) { setTimeout(r, fontCap); })]) : Promise.resolve();
    var minWait = new Promise(function (res) {
      (function chk() { if (L.go || !loader) setTimeout(res, Math.max(0, MIN - (Date.now() - (L.go || L.t0)))); else setTimeout(chk, 40); })();
    });
    // two frames after everything is ready, so the freshly applied mask is resolved before the hole starts to open
    Promise.all([ready, fonts, minWait, maskReady]).then(function () { requestAnimationFrame(function () { requestAnimationFrame(finishLoader); }); });
    // hard safety, counted from first paint: never trap the visitor (the hub preview must be done in under 800ms)
    setTimeout(finishLoader, Math.max(0, (L.mode === 'frame' ? 450 : 4000) - (Date.now() - L.t0)));
    // a keyboard visitor who starts tabbing skips the intro, so focus never lands on controls hidden behind the loader
    d.addEventListener('keydown', function (e) { if (/^(Tab|Enter|Escape| )$/.test(e.key)) finishLoader(); });
  } else releaseHero();
  // bfcache restore (style-tile page; the home bundle reloads itself on pageshow.persisted)
  w.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    endNav(); // a wipe frozen mid-way must not finish after the restore and navigate on its own
    d.querySelectorAll('.ydx-wipe').forEach(function (el) { el.remove(); });
    if (loader) { loader.remove(); loader = null; } releaseHero();
  });

  /* ------------------------------------------------------------------ 2. page transitions (multi-page: / <-> /style-tile.html) */
  var nav = null; // the transition in flight: { els, anims, go, gone, timer }
  // give the page back: cancel the wipe (cancel() never fires onfinish, so no navigation follows) and remove it
  function endNav() {
    if (!nav) return; var n = nav; nav = null; clearTimeout(n.timer);
    n.anims.forEach(function (a) { try { a && a.cancel(); } catch (er) {} });
    n.els.forEach(function (el) { el.remove(); });
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !(a instanceof HTMLAnchorElement) || a.target && a.target !== '_self' || a.hasAttribute('download')) return;
    var url; try { url = new URL(a.href, location.href); } catch (er) { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    // a second activation while the wipe runs (double click, Enter pressed twice) must not start a second transition
    if (nav) { e.preventDefault(); return; }
    if (!motionOK() || !cssOK()) { ss(function (s) { s.setItem('ydx-nav', String(Date.now())); }); return; }
    e.preventDefault();
    // two coats, like a lipstick stroke: a pigment lead in the active family, then the burgundy that the next page opens from
    // (the lead keeps the wipe visible on the burgundy footer, where a burgundy-only wipe disappeared)
    var mk = function (cls) { var el = d.createElement('div'); el.className = 'ydx-wipe ' + cls; el.setAttribute('aria-hidden', 'true'); el.dataset.tone = html.dataset.family || html.dataset.tone || 'rose'; d.body.appendChild(el); return el; };
    var lead = mk('ydx-wipe-lead'), wipe = mk('ydx-wipe-deep');
    var x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2, cw = coverWidth(x, y);
    var n = nav = { els: [lead, wipe], anims: [], gone: false };
    var go = n.go = function () {
      if (nav !== n || n.gone) return; n.gone = true;
      ss(function (s) { s.setItem('ydx-nav', String(Date.now())); }); location.href = url.href;
    };
    n.anims.push(anim(lead, maskFrames(x, y, 0, cw, false), { duration: 440, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }));
    var an = anim(wipe, maskFrames(x, y, 0, cw, false), { duration: 420, delay: 110, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
    n.anims.push(an);
    if (an && !d.hidden) an.onfinish = go; else go();
    n.timer = setTimeout(endNav, 3500); // navigation cancelled or stalled → give the page back
  });
  // back/forward pressed mid-wipe (same-document history entry): the visitor changed their mind, so do not navigate
  w.addEventListener('popstate', function () { if (nav && !nav.gone) endNav(); });
  // tab hidden mid-wipe: its animation stops advancing, so go now instead of stalling until the tab is shown again
  d.addEventListener('visibilitychange', function () { if (d.hidden && nav) nav.go(); });

  /* ------------------------------------------------------------------ 3. reveals (IntersectionObserver + WAAPI, never CSS transitions so the site's own transitions survive) */
  var REVEALS = [
    // [selector, variant, stagger-group]
    ['.section-meta', 'up'],
    ['.section-heading > .eyebrow, .compass-intro > .eyebrow, .approach-intro > .eyebrow, .journal-heading .eyebrow, .questions-intro > .eyebrow, .contact-copy > .eyebrow', 'up'],
    ['.section-heading > p:last-child, .compass-intro > p:not(.eyebrow), .approach-intro > p:not(.eyebrow), .journal-heading > p, .contact-copy > p:not(.eyebrow), .material-copy > p', 'up'],
    ['.manifesto-note, .approach-signature, .footer-line, .footer-links, .footer-bottom', 'up'],
    ['.values-line > span', 'swatch', 'group'],
    ['.principles > span', 'up', 'group'],
    ['.principles > i', 'stamp', 'group'],
    ['.manifesto-portrait', 'curtain'],
    ['.shade-stage', 'curtain'],
    ['.shade-controls > *', 'up', 'group'],
    ['.compass fieldset .chip', 'up', 'group'],
    ['.compass-result', 'curtain'],
    ['.process-step', 'card', 'group'],
    ['.journal-card', 'card', 'group'],
    ['.faq-list > details', 'up', 'group'],
    ['.contact-form-wrap', 'card'],
    ['.dab', 'paint', 'group'],
    ['.compass-kiss, .questions-kiss', 'stamp'],
    ['.approach-brush', 'paintL'],
    ['.footer-wordmark .display', 'swipe'],
    ['.material-image figcaption, .fine-print, .disclaimer', 'fade'],
    // style tile
    ['.tile-intro, .tile section, .family, .component', 'card', 'group'],
    ['.tile-intro .brand-master', 'stamp']
  ];
  var VARIANTS = {
    up: { kf: [{ opacity: 0, translate: '0 26px', offset: 0 }], dur: 900 },
    fade: { kf: [{ opacity: 0, offset: 0 }], dur: 900 },
    card: { kf: [{ opacity: 0, translate: '0 48px', clipPath: 'inset(18% 0 0 0 round 4px)' }, { opacity: 1, translate: '0 0', clipPath: 'inset(0 0 0 0 round 4px)' }], dur: 1050 },
    curtain: { kf: [{ opacity: 1, clipPath: 'inset(100% 0 0 0 round 6px)', translate: '0 40px' }, { opacity: 1, clipPath: 'inset(0 0 0 0 round 6px)', translate: '0 0' }], dur: 1150 },
    swatch: { kf: [{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], dur: 800 },
    stamp: { kf: [{ opacity: 0, scale: '1.55' }, { opacity: 1, scale: '.94', offset: .62 }, { opacity: 1, scale: '1' }], dur: 620, ease: 'cubic-bezier(.3,.7,.4,1)' },
    paint: { kf: [{ opacity: 1, clipPath: 'inset(0 0 0 100%)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], dur: 900, ease: 'cubic-bezier(.65,0,.35,1)' },
    paintL: { kf: [{ opacity: 1, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], dur: 1100, ease: 'cubic-bezier(.65,0,.35,1)' },
    swipe: { kf: [{ opacity: 1, clipPath: 'inset(-10% 0 -10% 100%)' }, { opacity: 1, clipPath: 'inset(-10% 0 -10% 0)' }], dur: 1200, ease: 'cubic-bezier(.65,0,.35,1)' },
    chars: null
  };
  var io = null;
  function reveal(el) {
    if (el.classList.contains('ydx-in')) return;
    var v = VARIANTS[el.dataset.ydxR] || VARIANTS.up, i = +el.dataset.ydxI || 0, delay = i * 90;
    if (el.dataset.ydxR === 'chars') {
      el.querySelectorAll('.ydx-c').forEach(function (c, k) {
        anim(c, [{ opacity: 0, transform: 'translateY(.55em) rotate(8deg)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 80 + k * 22, easing: OUT, fill: 'backwards', id: 'ydx-r' });
      });
    } else {
      anim(el, v.kf, { duration: v.dur, delay: delay, easing: v.ease || OUT, fill: 'backwards', id: 'ydx-r' });
    }
    el.classList.add('ydx-in');
  }
  function splitChars(el) {
    if (el.dataset.ydxSplit) return;
    var text = el.textContent; el.dataset.ydxSplit = '1';
    var sr = d.createElement('span'); sr.className = 'ydx-sr'; sr.textContent = text;
    var vis = d.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    text.split(/(\s+)/).forEach(function (word) {
      if (/^\s+$/.test(word)) { vis.appendChild(d.createTextNode(' ')); return; }
      if (!word) return;
      var wd = d.createElement('span'); wd.className = 'ydx-w';
      Array.from(word).forEach(function (ch) { var c = d.createElement('span'); c.className = 'ydx-c'; c.textContent = ch; wd.appendChild(c); });
      vis.appendChild(wd);
    });
    el.textContent = ''; el.appendChild(sr); el.appendChild(vis);
  }
  function setupReveals() {
    if (!motionOK() || !('IntersectionObserver' in w) || !cssOK()) return;
    // this file arriving late (slow network: the inline fallback already took the loader away and the page is on screen):
    // what is already in view or scrolled past stays put instead of blinking out and fading back in
    var lEl = d.getElementById('ydx-loader'), late = !lEl || lEl.classList.contains('ydx-l-bye');
    var cb = function (ents, obs) {
      ents.forEach(function (en) { if (en.isIntersecting) { reveal(en.target); obs.unobserve(en.target); } });
    };
    var ioMain = new IntersectionObserver(cb, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    // things in the last screen of the page (footer copyright line) may never get 8% above the fold: no margin for those
    var ioEnd = new IntersectionObserver(cb, { threshold: 0 });
    var endY = d.documentElement.scrollHeight - innerHeight * 0.5;
    io = { observe: function (el) { (el.getBoundingClientRect().bottom + scrollY > endY ? ioEnd : ioMain).observe(el); } };
    REVEALS.forEach(function (r) {
      var list = d.querySelectorAll(r[0]);
      list.forEach(function (el, k) {
        if (el.dataset.ydxR || el.closest('.hero, #mobile-menu')) return;
        el.dataset.ydxR = r[1];
        if (r[2] && el.parentElement) el.dataset.ydxI = String(Array.prototype.indexOf.call(el.parentElement.children, el) % 6);
        if (late && el.getBoundingClientRect().top < innerHeight) el.classList.add('ydx-in');
        io.observe(el);
      });
    });
    // keyboard: a focused control must never sit inside a still-hidden or half-faded reveal
    d.addEventListener('focusin', function (e) {
      for (var el = e.target; el && el !== d.body; el = el.parentElement) {
        if (!el.dataset || !el.dataset.ydxR) continue;
        if (!el.classList.contains('ydx-in')) { el.classList.add('ydx-in'); continue; }
        if (el.getAnimations) el.getAnimations().forEach(function (a) { if (a.id === 'ydx-r') a.finish(); });
      }
    });
    // Latin (Bodoni italic) taglines: letters are fine to split for Latin — never Hebrew
    d.querySelectorAll('.section-meta .latin, .material-copy > .latin:first-child, .material-index, .footer-bottom .latin, .stage-label').forEach(function (el) {
      if (el.closest('.hero') || el.dataset.ydxR) return;
      if (late && el.getBoundingClientRect().top < innerHeight) return;
      splitChars(el); el.dataset.ydxR = 'chars'; io.observe(el);
    });
    w.addEventListener('beforeprint', function () { d.querySelectorAll('[data-ydx-r]').forEach(function (el) { el.classList.add('ydx-in'); }); });
  }

  /* ------------------------------------------------------------------ 4. reactive details on the app's own state changes */
  function setupReactive() {
    if (!motionOK() || !('MutationObserver' in w)) return;
    var name = d.querySelector('.sample-name'), core = d.querySelector('.pigment-core'),
      stick = d.querySelector('#compass-lipstick'), result = d.querySelector('#inquiry-result'),
      rkiss = d.querySelector('.result-kiss'), idx = d.querySelector('.sample-index');
    var last = name && name.textContent;
    var mo = new MutationObserver(function (recs) {
      recs.forEach(function (r) {
        var t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        if (name && t === name && name.textContent !== last) {
          last = name.textContent; // Latin shade name writes itself in, left to right, like a swatch
          anim(name, [{ clipPath: 'inset(-20% 100% -20% 0)', translate: '-.15em 0' }, { clipPath: 'inset(-20% -5% -20% 0)', translate: '0 0' }], { duration: 760, easing: 'cubic-bezier(.65,0,.35,1)' });
          if (idx) anim(idx, [{ opacity: 0, translate: '0 .4em' }, { opacity: 1, translate: '0 0' }], { duration: 500, easing: OUT });
        } else if (core && t === core && r.attributeName === 'src') {
          anim(core, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 820, easing: 'cubic-bezier(.65,0,.35,1)' });
        } else if (stick && t === stick && r.attributeName === 'src') {
          anim(stick, [{ translate: '0 55%', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 800, easing: OUT });
        } else if (result && t === result && r.attributeName === 'hidden' && !result.hidden && rkiss) {
          // the prepared note gets sealed with a kiss
          anim(rkiss, [{ opacity: 0, scale: '2.1' }, { opacity: 1, scale: '.92', offset: .6 }, { opacity: 1, scale: '1' }], { duration: 700, delay: 260, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
        }
      });
    });
    if (name) mo.observe(name, { childList: true, characterData: true, subtree: true });
    if (core) mo.observe(core, { attributes: true, attributeFilter: ['src'] });
    if (stick) mo.observe(stick, { attributes: true, attributeFilter: ['src'] });
    if (result) mo.observe(result, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ------------------------------------------------------------------ 5. hero scroll choreography (individual `translate`, the app owns `transform`) */
  function setupHeroScroll() {
    var hero = d.querySelector('.hero'); if (!hero || !motionOK()) return;
    var l1 = hero.querySelector('.hero-line'), l2 = hero.querySelector('.hero-line.last-line'),
      smear = hero.querySelector('.hero-smear'), note = hero.querySelector('.photo-note'), raf = 0, on = true;
    // (repaint on re-entry too: a fast scroll back up can bring the hero in after the last scroll event)
    var vis = new IntersectionObserver(function (e) { on = e[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(paint); }); vis.observe(hero);
    function paint() {
      raf = 0; if (!on) return;
      var p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight || innerHeight)));
      if (l1) l1.style.translate = (p * 7).toFixed(2) + 'vw 0';
      if (l2) l2.style.translate = (p * -9).toFixed(2) + 'vw 0';
      if (smear) smear.style.translate = '0 ' + (p * 18).toFixed(2) + '%';
      if (note) note.style.translate = '0 ' + (p * -40).toFixed(1) + 'px';
    }
    w.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    paint();
  }

  /* ------------------------------------------------------------------ 6. pointer: magnetic buttons + a swatch cursor (fine pointers only) */
  function setupPointer() {
    if (!fine.matches || !motionOK() || !cssOK()) return;
    // magnetic pull on pill buttons
    d.querySelectorAll('.button, .small-cta').forEach(function (b) {
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      function step() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        b.style.translate = cx.toFixed(2) + 'px ' + cy.toFixed(2) + 'px';
        raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(step) : 0;
        if (!raf && !tx && !ty) b.style.translate = '';
      }
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        tx = Math.max(-9, Math.min(9, (e.clientX - r.left - r.width / 2) * 0.22));
        ty = Math.max(-7, Math.min(7, (e.clientY - r.top - r.height / 2) * 0.3));
        if (!raf) raf = requestAnimationFrame(step);
      });
      b.addEventListener('pointerleave', function () { tx = ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    });
    // cursor: a small pigment dot tinted with the active shade family; previews a family while hovering its swatch
    var dot = d.createElement('div'); dot.className = 'ydx-cursor'; dot.setAttribute('aria-hidden', 'true');
    d.body.appendChild(dot);
    var x = -100, y = -100, dx = -100, dy = -100, raf = 0, shown = false;
    function tone() { return html.dataset.family || 'rose'; }
    function step() {
      dx += (x - dx) * 0.24; dy += (y - dy) * 0.24;
      dot.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
      raf = Math.abs(x - dx) + Math.abs(y - dy) > 0.1 ? requestAnimationFrame(step) : 0;
    }
    d.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; dx = x; dy = y; dot.classList.add('is-on'); }
      var t = e.target, sh = t.closest && t.closest('[data-shade]');
      dot.dataset.tone = sh ? sh.dataset.shade : tone();
      dot.classList.toggle('is-link', !!(t.closest && t.closest('a, button, summary, label, select, input[type=range]')));
      dot.classList.toggle('is-text', !!(t.closest && t.closest('input:not([type=range]), textarea')));
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    d.addEventListener('pointerleave', function () { shown = false; dot.classList.remove('is-on'); });
    d.addEventListener('pointerdown', function () { dot.classList.add('is-down'); });
    d.addEventListener('pointerup', function () { dot.classList.remove('is-down'); });
    d.addEventListener('pointercancel', function () { dot.classList.remove('is-down'); });
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    // each part is optional polish: one that throws must not take the others (or the page) down with it
    [setupReveals, setupReactive, setupHeroScroll, setupPointer, function () {
      // menu links get an index for the CSS stagger
      d.querySelectorAll('#mobile-menu nav a').forEach(function (a, i) { a.style.setProperty('--ydx-i', i); });
    }].forEach(function (f) {
      try { f(); } catch (e) {
        if (w.console) console.warn('[ydx]', e);
        // never leave anything parked in its hidden pre-reveal state
        if (f === setupReveals) d.querySelectorAll('[data-ydx-r]').forEach(function (el) { el.classList.add('ydx-in'); });
      }
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
