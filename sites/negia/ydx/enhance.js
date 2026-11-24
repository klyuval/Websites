/* ydx enhancement layer for Negia (נגיעה) — loader exit, page transitions, reveals and micro-motion.
   Plain JS, no dependencies. The site's own bundle (Lenis, shade view-transitions, menu dialog, form) is left untouched:
   everything here only adds attributes / individual transform properties (translate, scale) that the app never writes. */
(function () {
  'use strict';
  var d = document, html = d.documentElement, w = window;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)');
  var motionOK = function () { return !reduce.matches; };
  var OUT = 'cubic-bezier(.16,1,.3,1)';
  var MASK = '/ydx/smear-mask.webp';
  var MASK_RATIO = 309 / 820;
  if (motionOK()) html.classList.add('ydx-motion');
  // decode the smear mask early: the loader exit and the page wipe are both cut from it
  var maskImg = new Image(); maskImg.src = MASK;
  var maskReady = maskImg.decode ? maskImg.decode().catch(function () {}) : Promise.resolve();

  /* ------------------------------------------------------------------ helpers */
  function ss(fn) { try { return fn(w.sessionStorage); } catch (e) { return null; } }
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
  var MIN = { full: 1150, short: 200, frame: 330, nav: 60, reduced: 300 }[L.mode] || 900;
  var released = false;
  function releaseHero() { if (!released) { released = true; html.classList.remove('ydx-loading'); } }
  function finishLoader() {
    if (!loader || loader.dataset.out) return;
    loader.dataset.out = '1';
    var done = function () { releaseHero(); if (loader) loader.remove(); loader = null; html.classList.add('ydx-ready'); };
    if (L.mode === 'reduced' || !loader.animate) {
      releaseHero();
      var a0 = anim(loader, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease', fill: 'forwards' });
      return a0 ? (a0.onfinish = done) : done();
    }
    var stage = loader.querySelector('.ydx-l-stage');
    var cx = innerWidth / 2, cy = innerHeight / 2;
    var w0 = L.mode === 'nav' ? 0 : (stage ? stage.getBoundingClientRect().width * 0.92 : 0);
    var w1 = coverWidth(cx, cy);
    var dur = { frame: 300, nav: 520, short: 520 }[L.mode] || 760;
    // the swatch becomes a window: a smear-shaped hole opens in the burgundy and grows until the page is revealed
    loader.style[P.img] = 'url(' + MASK + '), linear-gradient(#000,#000)';
    loader.style[P.rep] = 'no-repeat';
    loader.style[P.comp] = P.exc;
    var f0 = maskFrames(cx, cy, w0, w1, true)[0]; for (var k in f0) loader.style[k] = f0[k];
    if (stage) anim(stage, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.06)' }], { duration: dur * 0.45, easing: 'ease-in', fill: 'forwards' });
    var a = anim(loader, maskFrames(cx, cy, w0, w1, true), { duration: dur, easing: 'cubic-bezier(.7,0,.25,1)', fill: 'forwards' });
    // hand over to the hero's own entrance a beat into the reveal
    setTimeout(releaseHero, L.mode === 'nav' ? 40 : dur * 0.28);
    if (a) a.onfinish = done; else done();
  }
  if (loader) {
    var ready = new Promise(function (res) {
      if (L.mode === 'frame' || L.mode === 'nav') return res(); // iframe preview / page transition: never wait for load
      if (d.readyState === 'complete') res(); else w.addEventListener('load', res, { once: true });
    });
    var fonts = (d.fonts && d.fonts.ready) ? Promise.race([d.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]) : Promise.resolve();
    var minWait = new Promise(function (res) { setTimeout(res, Math.max(0, MIN - (Date.now() - L.t0))); });
    Promise.all([ready, fonts, minWait, maskReady]).then(finishLoader);
    setTimeout(finishLoader, 4000); // hard safety: never trap the visitor
  } else releaseHero();
  // bfcache restore (style-tile page; the home bundle reloads itself on pageshow.persisted)
  w.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var wipe = d.getElementById('ydx-wipe'); if (wipe) wipe.remove();
    if (loader) { loader.remove(); loader = null; } releaseHero();
  });

  /* ------------------------------------------------------------------ 2. page transitions (multi-page: / <-> /style-tile.html) */
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target && a.target !== '_self' || a.hasAttribute('download')) return;
    var url; try { url = new URL(a.href, location.href); } catch (er) { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    if (!motionOK()) { ss(function (s) { s.setItem('ydx-nav', String(Date.now())); }); return; }
    e.preventDefault();
    var wipe = d.createElement('div');
    wipe.id = 'ydx-wipe'; wipe.setAttribute('aria-hidden', 'true');
    d.body.appendChild(wipe);
    var x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2;
    var go = function () { ss(function (s) { s.setItem('ydx-nav', String(Date.now())); }); location.href = url.href; };
    // a burgundy swatch smears out from the click point and floods the screen
    var an = anim(wipe, maskFrames(x, y, 0, coverWidth(x, y), false), { duration: 480, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
    if (an) an.onfinish = go; else go();
    setTimeout(function () { if (wipe.isConnected) wipe.remove(); }, 3500); // navigation cancelled → give the page back
  });

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
        anim(c, [{ opacity: 0, transform: 'translateY(.55em) rotate(8deg)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 80 + k * 22, easing: OUT, fill: 'backwards' });
      });
    } else {
      anim(el, v.kf, { duration: v.dur, delay: delay, easing: v.ease || OUT, fill: 'backwards' });
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
    if (!motionOK() || !('IntersectionObserver' in w)) return;
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    REVEALS.forEach(function (r) {
      var list = d.querySelectorAll(r[0]);
      list.forEach(function (el, k) {
        if (el.dataset.ydxR || el.closest('.hero, #mobile-menu')) return;
        el.dataset.ydxR = r[1];
        if (r[2]) el.dataset.ydxI = String(Array.prototype.indexOf.call(el.parentElement.children, el) % 6);
        io.observe(el);
      });
    });
    // Latin (Bodoni italic) taglines: letters are fine to split for Latin — never Hebrew
    d.querySelectorAll('.section-meta .latin, .material-copy > .latin:first-child, .material-index, .footer-bottom .latin, .stage-label').forEach(function (el) {
      if (el.closest('.hero') || el.dataset.ydxR) return;
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
    var vis = new IntersectionObserver(function (e) { on = e[0].isIntersecting; }); vis.observe(hero);
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
    if (!fine.matches || !motionOK()) return;
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
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    setupReveals(); setupReactive(); setupHeroScroll(); setupPointer();
    // menu links get an index for the CSS stagger
    d.querySelectorAll('#mobile-menu nav a').forEach(function (a, i) { a.style.setProperty('--ydx-i', i); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
