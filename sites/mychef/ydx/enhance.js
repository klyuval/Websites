/* MyChef Israel: design + motion pass (ydx). Vanilla JS, no dependencies, no build step.
   The site is a React app hydrated over the whole document, so this file never adds, removes or reorders nodes
   inside the app. It only toggles classes on <html>, sets data-ydx-* attributes / inline custom properties on
   existing nodes, and appends its own overlays to <body> (React 19 skips unknown body children when hydrating).
   Parts: 1 loader exit · 2 language wipe · 3 handwriting write-on · 4 course stack depth · 5 hero scroll depth ·
          6 magnetic buttons */
(() => {
  'use strict';
  const doc = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cls = doc.classList;
  cls.add('ydx-on');

  /* -------------------------------------------------------------------------------------------------------------
     1. Loader. It paints from inline CSS before anything else; here we wait until the page is really ready:
        window load + React hydrated + the stored language applied (the site server-renders Hebrew and switches to
        a stored EN/FR choice only after hydration, which used to flash Hebrew at English/French visitors) +
        fonts. Minimum display keeps the little plating sequence readable; a hard timeout means it never traps. */
  const loader = document.querySelector('.ydx-ld');
  const wantLang = doc.getAttribute('data-ydx-lang') || 'he';
  const FRAME = cls.contains('ydx-ld-frame');
  const SHORT = cls.contains('ydx-ld-short');
  const now = () => performance.now();
  const MIN = RM ? 0 : FRAME ? 260 : SHORT ? 300 : 1200;  // ms since navigation start
  const HARD = FRAME ? 320 : 4000;                       // frame: total stays <= 800ms incl. the exit
  let loaderDone = false;

  const hydrated = () => {
    const b = document.querySelector('.language-switch button');
    return !!b && Object.keys(b).some(k => k.startsWith('__reactProps'));
  };
  const langApplied = () => doc.lang === wantLang;

  function liftLoader() {
    if (loaderDone) return;
    loaderDone = true;
    try { sessionStorage.setItem('ydx-seen', '1'); } catch (e) { /* storage blocked: fine */ }
    if (!loader || !loader.isConnected) { cls.remove('ydx-loading'); return; }
    const finish = () => { loader.remove(); cls.remove('ydx-loading'); cls.add('ydx-loaded'); };
    if (RM || !loader.animate) {
      cls.remove('ydx-loading');
      cls.add('ydx-leaving');
      loader.style.display = 'grid';
      const a = loader.animate ? loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }) : null;
      a ? a.finished.then(finish, finish) : finish();
      return;
    }
    // The cloth is lifted off the table: the panel rises with its hem curving, the setting drifts up a little
    // faster, and the page's own "lay the table" entrance starts underneath as the hem clears the hero.
    const dur = FRAME ? 460 : SHORT ? 480 : 700;
    loader.style.display = 'grid';
    loader.style.animation = 'none';
    const stage = loader.querySelector('.ydx-ld__stage');
    const lift = loader.animate([
      { transform: 'translateY(0)', borderRadius: '0 0 0 0 / 0 0 0 0' },
      { transform: 'translateY(-104%)', borderRadius: '0 0 50% 50% / 0 0 16vh 16vh' }
    ], { duration: dur, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
    if (stage) stage.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(-16vh)', opacity: 0 }
    ], { duration: dur * .7, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
    setTimeout(() => cls.remove('ydx-loading'), dur * .3);
    lift.finished.then(finish, finish);
  }

  if (loader && cls.contains('ydx-loading')) {
    let loaded = document.readyState === 'complete';
    let fontsReady = false;
    addEventListener('load', () => { loaded = true; }, { once: true });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; });
    const tick = () => {
      if (loaderDone) return;
      const t = now();
      const ready = loaded && hydrated() && langApplied() && fontsReady;
      if ((ready && t >= MIN) || t >= HARD) liftLoader();
      else setTimeout(tick, 40);
    };
    tick();
  } else {
    cls.remove('ydx-loading');
  }

  /* -------------------------------------------------------------------------------------------------------------
     2. Language wipe. The site re-mounts the whole page on a language change and jumps to the top. We let the
        four table cloths (saffron, pomegranate, linen, teal) sweep across in the new language's reading
        direction, switch underneath, then sweep off. ~700ms, input blocked only while covered. */
  const WORDS = { he: 'עברית', en: 'English', fr: 'Français' };
  let passThrough = false, wiping = false;

  addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('.language-switch button[lang]') : null;
    if (!btn || passThrough || RM || !document.body.animate) return;
    if (btn.getAttribute('aria-pressed') === 'true') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (wiping) return;
    wipeTo(btn.getAttribute('lang'), () => { passThrough = true; try { btn.click(); } finally { passThrough = false; } });
  }, true);

  function wipeTo(lang, swap) {
    wiping = true;
    const dir = lang === 'he' ? -1 : 1;           // he: enter from the right, travel left; en/fr: the other way
    const W = innerWidth, off = W * 1.25 + 20;
    const wrap = document.createElement('div');
    wrap.className = 'ydx-wipe';
    wrap.setAttribute('aria-hidden', 'true');
    const names = ['saffron', 'pom', 'linen', 'teal'];
    const bands = names.map(n => {
      const b = document.createElement('div');
      b.className = 'ydx-wipe__band ydx-wipe__band--' + n;
      wrap.appendChild(b);
      return b;
    });
    const word = document.createElement('span');
    word.className = 'ydx-wipe__word';
    word.setAttribute('lang', lang);
    word.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    word.innerHTML = '<i>✳</i>';
    word.appendChild(document.createTextNode(WORDS[lang] || ''));
    bands[3].appendChild(word);
    document.body.appendChild(wrap);

    const ease = 'cubic-bezier(.7,0,.25,1)', D = 290, S = 28;
    const ins = bands.map((b, i) => b.animate(
      [{ transform: `translateX(${-dir * off}px)` }, { transform: 'translateX(0)' }],
      { duration: D, delay: i * S, easing: ease, fill: 'both' }));
    word.animate([{ opacity: 0, transform: `translateX(${-dir * 40}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 260, delay: 3 * S + 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });

    ins[3].finished.then(() => {
      cls.add('ydx-hold');
      swap();
      // two frames for React to commit the new language and the site to reset its scroll
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cls.remove('ydx-hold');
        const outs = bands.map((b, i) => b.animate(
          [{ transform: 'translateX(0)' }, { transform: `translateX(${dir * off}px)` }],
          { duration: D, delay: (3 - i) * S, easing: ease, fill: 'both' }));
        Promise.all(outs.map(a => a.finished)).then(done, done);
      }));
    }, () => { swap(); done(); });

    function done() { wrap.remove(); wiping = false; cls.remove('ydx-hold'); }
  }

  /* -------------------------------------------------------------------------------------------------------------
     3. Handwriting (signature, scribbles, the quilt hint) is written in when it scrolls into view.
        Re-scanned after React re-mounts the page (language change). */
  const WRITE = '.signature, .invitation__note, .dish figcaption, .gallery__b figcaption, .quilt__hint';
  // They are clipped to nothing until written (and a fully clipped target never reports to an
  // IntersectionObserver), so the scroll handler below checks their boxes instead: five elements, one rAF.
  let toWrite = [];
  const checkWrite = H => {
    if (!toWrite.length) return;
    toWrite = toWrite.filter(el => {
      if (!el.isConnected) return false;
      const r = el.getBoundingClientRect();
      if (r.top < H * .88 && r.bottom > 0) { el.setAttribute('data-ydx-in', ''); return false; }
      return true;
    });
  };

  function scan() {
    if (!RM) document.querySelectorAll(WRITE).forEach(el => {
      if (el.hasAttribute('data-ydx-write')) return;
      el.setAttribute('data-ydx-write', '');
      toWrite.push(el);
    });
    courses = [...document.querySelectorAll('.course')];
    hero = document.querySelector('.hero');
        heroTable = hero && hero.querySelector('.hero__table');
    magnets();
    onScroll();
  }

  /* -------------------------------------------------------------------------------------------------------------
     4. Course stack depth (desktop sticky layout only) + 5. hero scroll depth. One rAF-throttled scroll handler. */
  let courses = [], hero = null, heroTable = null, raf = 0, sticky = false, wide = false;
  const measure = () => {
    sticky = !!courses[0] && getComputedStyle(courses[0]).position === 'sticky';
    wide = FINE && innerWidth > 800;
    if (!sticky) courses.forEach(c => { c.style.removeProperty('--ydx-cover'); c._ydx = undefined; });
    if (!wide) heroTable && (heroTable.style.translate = '');
  };
  function frame() {
    raf = 0;
    const H = innerHeight;
    checkWrite(H);
    if (sticky) {
      for (let i = 0; i < courses.length; i++) {
        const next = courses[i + 1];
        let p = 0;
        if (next) {
          const top = next.getBoundingClientRect().top;
          p = Math.min(1, Math.max(0, 1 - top / H));
        }
        p = Math.round(p * 1000) / 1000;
        if (courses[i]._ydx !== p) {
          courses[i]._ydx = p;
          if (p > 0) courses[i].style.setProperty('--ydx-cover', p);
          else courses[i].style.removeProperty('--ydx-cover');
        }
      }
    }
    if (wide && hero) {
      const y = Math.min(scrollY, H * 1.2);
      if (heroTable) heroTable.style.translate = y > 0 ? `0 ${(y * .12).toFixed(1)}px` : '';
    }
  }
  function onScroll() { if (!RM && !raf) raf = requestAnimationFrame(frame); }
  if (!RM) {
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
  }

  /* -------------------------------------------------------------------------------------------------------------
     6. Magnetic buttons: the main calls to action lean toward the pointer (CSS `translate`, so the site's own
        :active scale and the dock's show/hide transform are untouched). */
  function magnets() {
    if (!FINE || RM) return;
    document.querySelectorAll('.btn--pop, .top__book, .course__turn a, .foot__up').forEach(el => {
      if (el._ydxMag) return;
      el._ydxMag = true;
      let tx = 0, ty = 0, x = 0, y = 0, id = 0;
      const step = () => {
        x += (tx - x) * .2; y += (ty - y) * .2;
        el.style.translate = Math.abs(x) + Math.abs(y) < .05 && !tx && !ty ? '' : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        id = Math.abs(tx - x) + Math.abs(ty - y) > .05 ? requestAnimationFrame(step) : 0;
        if (!id && !tx && !ty) el.style.translate = '';
      };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const k = el.matches('.btn') ? .22 : .3;
        tx = Math.max(-10, Math.min(10, (e.clientX - r.left - r.width / 2) * k));
        ty = Math.max(-8, Math.min(8, (e.clientY - r.top - r.height / 2) * k));
        id ||= requestAnimationFrame(step);
      });
      el.addEventListener('pointerleave', () => { tx = 0; ty = 0; id ||= requestAnimationFrame(step); });
    });
  }

  /* Boot + re-scan when React re-renders (language switch re-mounts the whole page). */
  const boot = () => { scan(); measure(); onScroll(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  let pending = 0;
  new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; scan(); measure(); });
  }).observe(document.body, { childList: true, subtree: true });
})();
