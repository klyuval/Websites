/* MyChef Israel: design + motion pass (ydx). Vanilla JS, no dependencies, no build step.
   The site is a React app hydrated over the whole document, so this file never adds, removes or reorders nodes
   inside the app. It only toggles classes on <html>, sets data-ydx-* attributes / inline custom properties on
   existing nodes, and appends its own overlays to <body> (React 19 skips unknown body children when hydrating).
   Parts: 1 loader exit · 2 language wipe · 3 handwriting write-on · 4 course stack depth · 5 hero scroll depth ·
          6 magnetic buttons */
(() => {
  'use strict';
  // Round 3: run once. A second copy (double include, a cached + a fresh copy) used to add a second capture
  // listener for the language wipe, and the two swallowed each other's click so the language never changed.
  if (window.__ydxMyChef) return;
  window.__ydxMyChef = true;
  // Round 3: this file is loaded with `async` (with `defer` it held DOMContentLoaded and `load` back when slow, and
  // the app's own listeners with them), so it can arrive before the body is parsed: wait for the DOM if needed.
  const start = () => {
    const doc = document.documentElement;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
    // WAAPI on pseudo-elements: where the option is unknown it is silently ignored and the keyframes would land on
    // the element itself (the course would fade to .45 instead of its shade), so check for it explicitly.
    const PSEUDO = typeof KeyframeEffect === 'function' && 'pseudoElement' in KeyframeEffect.prototype;
    // enhance.css present? (it sets --ydx-css on :root). Without it the wipe would be unstyled divs in the flow.
    const hasCSS = () => getComputedStyle(doc).getPropertyValue('--ydx-css').trim() === '1';
    const cls = doc.classList;
    const loader = document.querySelector('.ydx-ld');
    // Round 3: did this script arrive late? If the loader has already gone (its CSS-only bail ran because this file
    // was slow) the guest is already looking at the page, so the entrances must not be replayed on top of it: that
    // used to blank every visible headline and raise it again ~8s in. Entrance styles key off html.ydx-enter.
    const covering = !!loader && cls.contains('ydx-loading') && (cs => cs.visibility !== 'hidden' && +cs.opacity >= .5)(getComputedStyle(loader));
    const LATE = !covering && !!document.querySelector('[data-lay].is-laid');
    cls.add('ydx-on');
    if (!LATE) cls.add('ydx-enter');

    /* -------------------------------------------------------------------------------------------------------------
       1. Loader. It paints from inline CSS before anything else; here we wait until the page is really ready:
          window load + React hydrated + the stored language applied (the site server-renders Hebrew and switches to
          a stored EN/FR choice only after hydration, which used to flash Hebrew at English/French visitors) +
          fonts. Minimum display keeps the little plating sequence readable; a hard timeout means it never traps. */
    const wantLang = doc.getAttribute('data-ydx-lang') || 'he';
    const FRAME = cls.contains('ydx-ld-frame');
    const SHORT = cls.contains('ydx-ld-short');
    const now = () => performance.now();
    // Times are measured from the loader's first paint, not from navigation start: on a slow connection the first
    // paint can come seconds after navigation, and the guest should still get the plating and never more than ~4s
    // of it. (Round 2: the old navigation-based cap let the CSS bail decide on slow 3G, ~5s on screen.)
    const fp = () => {
      const e = performance.getEntriesByType ? performance.getEntriesByType('paint')[0] : null;
      return e ? e.startTime : Math.min(now(), 400);
    };
    const MIN = RM ? 0 : FRAME ? 220 : SHORT ? 300 : 1050;  // the full plating sequence lasts ~1.05s
    const HARD = FRAME ? 260 : 3500;                         // frame: total stays <= 800ms incl. the exit
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
      noApp();   // app still missing? show the text before the cloth lifts, not after
      // enhance.css loads without blocking the first paint; if it is still on its way when the cloth lifts, don't
      // let its hide-before-reveal rules land on text the guest is already reading.
      if (!hasCSS()) cls.remove('ydx-enter');
      if (!loader || !loader.isConnected) { cls.remove('ydx-loading'); return; }
      const finish = () => { loader.remove(); cls.remove('ydx-loading'); cls.add('ydx-loaded'); };
      // Round 3: any throw below (an animation the browser refuses, a missing API) used to leave the loader up with
      // its CSS bail cancelled, or html.ydx-loading set, which keeps every entrance paused at opacity 0.
      try { exit(finish); } catch (e) { finish(); }
    }
    function exit(finish) {
      // On a very slow connection the inline CSS may already have faded the loader out (its 3.9s bail) before this
      // script arrived; don't bring it back just to lift it.
      const cs = getComputedStyle(loader);
      if (cs.visibility === 'hidden' || +cs.opacity < .5) { finish(); return; }
      if (RM || !loader.animate) {
        cls.remove('ydx-loading');
        loader.style.display = 'grid';
        const a = loader.animate ? loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }) : null;
        a ? a.finished.then(finish, finish) : finish();
        return;
      }
      // The cloth is lifted off the table: the panel rises with its hem curving, the setting drifts up a little
      // faster, and the page's own "lay the table" entrance starts underneath as the hem clears the hero.
      // Round 2: the cloth is the same teal as the hero, so the lift used to be invisible and left an empty teal frame
      // before the pieces arrived. Now the hem casts a shadow and its stitching curves with it, so it reads as a cloth
      // being drawn off, and the page's own entrance is released as the lift starts: the plate, cutlery and headline
      // are being set while the hem passes over them, so there is never a blank frame.
      const dur = FRAME ? 400 : SHORT ? 520 : 760;
      const ease = 'cubic-bezier(.62,0,.2,1)';
      loader.style.display = 'grid';
      loader.style.animation = 'none';
      const stage = loader.querySelector('.ydx-ld__stage');
      // In the hub iframe the lift is transform-only, so it can run on the compositor while the app's hydration still
      // holds the main thread (the hem curve and shadow are main-thread properties and stalled it ~100-200ms there).
      const lift = loader.animate(FRAME ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-106%)' }] : [
        { transform: 'translateY(0)', borderRadius: '0 0 0 0 / 0 0 0 0', boxShadow: '0 0 0 0 rgba(4,20,19,0)' },
        { transform: 'translateY(-30%)', borderRadius: '0 0 50% 50% / 0 0 9vh 9vh', boxShadow: '0 26px 50px -6px rgba(4,20,19,.55)', offset: .4 },
        { transform: 'translateY(-106%)', borderRadius: '0 0 50% 50% / 0 0 16vh 16vh', boxShadow: '0 30px 60px -8px rgba(4,20,19,.5)' }
      ], { duration: dur, easing: ease, fill: 'forwards' });
      if (PSEUDO && !FRAME) try {
        loader.animate([
          { borderRadius: '4px' },
          { borderRadius: '4px 4px 50% 50% / 4px 4px calc(16vh - 14px) calc(16vh - 14px)' }
        ], { duration: dur, easing: ease, fill: 'forwards', pseudoElement: '::after' });
      } catch (e) { /* the stitching just stays square */ }
      // the setting rides up with the cloth (a touch faster) and only fades once it is on its way out
      if (stage) stage.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-6vh)', opacity: 1, offset: .35 },
        { transform: 'translateY(-22vh) scale(.97)', opacity: 0 }
      ], { duration: dur * .8, easing: ease, fill: 'forwards' });
      cls.remove('ydx-loading');
      lift.finished.then(finish, finish);
    }

    /* Round 3 failsafe: if the app never hydrates (its bundle blocked or failing), the site's own inline script has
       still set html.lay-ready, which keeps every table piece and [data-rise] block at opacity 0 until the app marks
       it laid, and our entrance styles kept the headlines, copy and header hidden too: a blank page. So: when the
       loader goes and the app is not there yet, our entrance choreography is switched off (the text shows at once).
       If it is still missing 6s later, lay-ready is removed so the site's pieces show as well. Should the app hydrate
       after all, its own effect adds lay-ready back and lays the table as usual. */
    let noAppTimer = 0;
    function noApp() {
      if (hydrated() || noAppTimer) return;
      cls.remove('ydx-enter');
      noAppTimer = setTimeout(() => { if (!hydrated()) cls.remove('lay-ready'); }, 6000);
    }

    if (loader && cls.contains('ydx-loading')) {
      let loaded = document.readyState === 'complete';
      let fontsReady = false;
      addEventListener('load', () => { loaded = true; }, { once: true });
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; });
      let timer = 0;
      const tick = () => {
        clearTimeout(timer);
        if (loaderDone) return;
        const t = now() - fp();
        const ready = loaded && hydrated() && langApplied() && fontsReady;
        if ((ready && t >= MIN) || t >= HARD) liftLoader();
        else timer = setTimeout(tick, 40);
      };
      tick();
      // Round 3: timers are throttled in background tabs (to 1/min after a while) and frozen pages resume late; check
      // again as soon as the page is shown, and lift at once if the CSS-only bail has already faded the loader.
      addEventListener('pageshow', tick);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
      loader.addEventListener('animationend', e => { if (e.target === loader && e.animationName === 'ydx-bail') liftLoader(); });
    } else {
      cls.remove('ydx-loading');
      if (loader) loader.remove();
      noApp();
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
      // Round 3: before hydration the button does nothing, so don't play a wipe that changes nothing; and without
      // enhance.css the wipe would be unstyled. In both cases the click goes straight to the site.
      if (!wiping && (!hydrated() || !hasCSS())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (wiping) return;
      const lang = btn.getAttribute('lang');
      const hadFocus = document.activeElement === btn;
      wipeTo(lang, () => {
        // re-query: the button may have been re-rendered while the cloths came in
        const b = document.querySelector(`.language-switch button[lang="${lang}"]`) || btn;
        passThrough = true;
        try { b.click(); } finally { passThrough = false; }
      }, () => {
        // The site re-mounts the whole page on a language change, so the focused button is gone and focus falls to
        // <body>. Give a keyboard (or screen reader) user their place back, on the newly pressed language.
        if (!hadFocus) return;
        const a = document.activeElement;
        if (a && a !== document.body && a !== doc) return;
        const nb = document.querySelector(`.language-switch button[lang="${lang}"]`);
        if (nb) try { nb.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      });
    }, true);

    function wipeTo(lang, swapLang, after) {
      wiping = true;
      // Round 3: every step below is guarded so the cover can never be left on screen. swap() runs exactly once
      // (also from the safety timer, e.g. when the tab is hidden mid-wipe and animations stop), done() removes it.
      let swapped = false, ended = false;
      const swap = () => {
        if (swapped) return;
        swapped = true;
        // the new page mounts under the cover, so its entrances can play even if they were switched off earlier
        // (script arrived late, or the app hydrated only after the loader had gone)
        if (hydrated()) cls.add('ydx-enter');
        try { swapLang(); } catch (e) { /* the site's own */ }
      };
      const safety = setTimeout(() => { swap(); done(); }, 2500);
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
          if (ended) return;
          cls.remove('ydx-hold');
          try {
            const outs = bands.map((b, i) => b.animate(
              [{ transform: 'translateX(0)' }, { transform: `translateX(${dir * off}px)` }],
              { duration: D, delay: (3 - i) * S, easing: ease, fill: 'both' }));
            Promise.all(outs.map(a => a.finished)).then(done, done);
          } catch (e) { done(); }
        }));
      }, () => { swap(); done(); });

      function done() {
        if (ended) return;
        ended = true;
        clearTimeout(safety);
        wrap.remove(); wiping = false; cls.remove('ydx-hold');
        try { after(); } catch (e) { /* ignore */ }
      }
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

    /* Round 2: sections on screen are flagged [data-ydx-vis] so ambient loops (the candle light) only run there. */
    const visIO = 'IntersectionObserver' in window && !RM
      ? new IntersectionObserver(es => es.forEach(e => e.target.toggleAttribute('data-ydx-vis', e.isIntersecting)))
      : null;
    const watched = new Set();
    let firstScan = true;
    function scan() {
      if (visIO) {
        // Round 3: unobserve the sections of a page React has thrown away (each language change re-mounts it),
        // which the observer otherwise kept alive along with their whole detached subtree.
        watched.forEach(el => { if (!el.isConnected) { visIO.unobserve(el); watched.delete(el); } });
        document.querySelectorAll('[data-lay]').forEach(el => {
          if (watched.has(el)) return;
          watched.add(el);
          visIO.observe(el);
        });
      }
      if (!RM) document.querySelectorAll(WRITE).forEach(el => {
        if (el._ydxW) return;
        el._ydxW = true;
        // arriving late: what the guest can already see stays as it is (no clip-then-write-again flash)
        if (LATE && firstScan && el.getBoundingClientRect().top < innerHeight) return;
        el.setAttribute('data-ydx-write', '');
        toWrite.push(el);
      });
      firstScan = false;
      courses = [...document.querySelectorAll('.course')];
      hero = document.querySelector('.hero');
      const ht = hero && hero.querySelector('.hero__table');
      if (ht !== heroTable) heroY = '';   // a re-mounted hero starts without our inline translate
      heroTable = ht;
      magnets();
      onScroll();
    }

    /* -------------------------------------------------------------------------------------------------------------
       4. Course stack depth (desktop sticky layout only) + 5. hero scroll depth. One rAF-throttled scroll handler. */
    let courses = [], hero = null, heroTable = null, raf = 0, sticky = false, wide = false;
    let heroY = '';
    const measure = () => {
      sticky = !!courses[0] && !!courses[0].animate && hasCSS() && getComputedStyle(courses[0]).position === 'sticky';
      wide = FINE && innerWidth > 800;
      courses.forEach(c => c.toggleAttribute('data-ydx-stack', sticky));
      if (!sticky) courses.forEach(c => sink(c, 0));
      if (!wide && heroTable) { heroTable.style.translate = ''; heroY = ''; }
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
          sink(courses[i], Math.round(p * 1000) / 1000);
        }
      }
      if (wide && hero) {
        const y = Math.min(scrollY, H * 1.2);
        const v = y > 0 ? `0 ${(y * .12).toFixed(1)}px` : '';
        // only write when it changes (it is capped, so far down the page it would rewrite the same value every frame)
        if (heroTable && v !== heroY) { heroTable.style.translate = v; heroY = v; }
      }
    }
    /* Round 2 (performance): this used to write a custom property on the course, which re-styled every node of a
       full-screen section on every scroll frame and repainted it (scale + border-radius + a dimming ::before), up to
       ~850ms of long tasks per scroll-through. Now the sink is two paused Web Animations scrubbed by currentTime: a
       transform on the (layer-promoted) course and an opacity on its ::before shade, both compositor-friendly. The
       rounded corners are a one-off transition toggled by an attribute instead of being repainted every frame. */
    function sink(c, p) {
      if (c._ydxP === p) return;
      c._ydxP = p;
      if (!p) {
        if (c._ydxA) { c._ydxA.forEach(a => a.cancel()); c._ydxA = null; }
        c.removeAttribute('data-ydx-sunk');
        return;
      }
      if (!c._ydxA) {
        const o = { duration: 1000, fill: 'both' };
        c._ydxA = [c.animate([{ transform: 'none' }, { transform: 'scale(.945)' }], o)];
        if (PSEUDO) try { c._ydxA.push(c.animate([{ opacity: 0 }, { opacity: .45 }], { ...o, pseudoElement: '::before' })); } catch (e) { /* no shade */ }
        c._ydxA.forEach(a => a.pause());
      }
      c._ydxA.forEach(a => { a.currentTime = p * 1000; });
      c.toggleAttribute('data-ydx-sunk', p > .03);
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
    scan(); measure(); onScroll();
    let pending = 0;
    new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; scan(); measure(); });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
