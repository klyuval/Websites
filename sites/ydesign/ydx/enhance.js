/* ydx enhance.js: design + motion pass for the ydesign hub (vanilla, no dependencies, no build step).
 *
 * The hub already has an elaborate loader (the designer's cursor builds the first screen), a wall that dives into the
 * case dialog, and its own GSAP scroll choreography. This file complements them and never replaces them:
 *   1. Loader pacing: repeat visits in the same tab session (a reload, the language switch) play the build at the
 *      speed the loader already uses when a visitor interacts, instead of the full first-visit show. (Framed previews
 *      and the safety net for a bundle that never starts live in the inline <script data-ydx> in <head>.)
 *   2. Case dialog: closing mirrors the opening (the panel slides back out and the shot dissolves into its tile
 *      before the wall pulls back; on phones the live site settles into its screenshot before the card lifts back),
 *      the site name is fitted to the panel, and arrow keys follow the reading direction.
 *   3. Reveal choreography for kicker rules, the site index and the "what happens next" list.
 *   4. Small fixes: process demo language left on the other language, a bidi glitch in the Hebrew studio text.
 * Everything is skipped or reduced under prefers-reduced-motion.
 *
 * Loaded with `async`, so it may run before or after the app's module bundle and before the body is parsed: the
 * page-wide bits run at once, everything that needs the DOM waits for DOMContentLoaded, and nothing assumes the app
 * has started (the app-rendered index and chips are handled when they appear or at event time).
 */
(() => {
  'use strict';
  if (window.__ydxEnhance) return; // never wire twice (the file included twice, or re-run by a tool)
  window.__ydxEnhance = true;
  const d = document, html = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = html.dir === 'rtl';
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  html.classList.add('ydx-js');
  const ready = (fn) => { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); };

  /* ---- 1. Loader pacing -------------------------------------------------------------------------------------------
   * src/loader.ts plays its build at 3x as soon as it sees the first key, pointer or wheel event (so nobody is held
   * up). For a visitor who has already watched it this session, give it that cue right away. The loader markup is
   * the first thing in <body>, so it is checked when the DOM is ready; the mark may come before or after that. */
  let seen = false;
  try { seen = sessionStorage.getItem('ydx-seen') === '1'; sessionStorage.setItem('ydx-seen', '1'); } catch (e) { /* private mode */ }
  if (seen && !reduce) ready(() => {
    if (!$('[data-loader]')) return;
    const hurry = () => setTimeout(() => window.dispatchEvent(new Event('keydown')), 0);
    if (performance.getEntriesByName('loader-start').length) hurry();
    else {
      try {
        const po = new PerformanceObserver((list) => {
          if (list.getEntries().some((e) => e.name === 'loader-start')) { po.disconnect(); hurry(); }
        });
        po.observe({ type: 'mark' });
        setTimeout(() => po.disconnect(), 6000);
      } catch (e) { /* no PerformanceObserver: the normal speed is fine */ }
    }
  });

  // Keyboard users: see enhance.css (html.ydx-kbd), content that waits for a scroll reveal must be reachable by Tab.
  addEventListener('keydown', (e) => { if (e.key === 'Tab') html.classList.add('ydx-kbd'); }, true);

  ready(() => {
    /* ---- 2. Case dialog ---------------------------------------------------------------------------------------------- */
    const dlg = $('dialog.case');
    const wall = $('[data-wall]');
    if (dlg && wall) {
      const name = $('[data-case-name]', dlg);
      const info = $('.case__info', dlg);
      const shot = $('[data-case-shot]', dlg);
      const closeBtn = $('[data-case-close]', dlg);

      // 2a. Fit the name: the panel is narrow and the display face is wide, so a one-word name (ALEXSTUDIO) used to
      // break mid-word. Shrink until the widest word fits; multi-word names still wrap between words.
      const probe = d.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;inset:auto auto 0 0';
      // (a stylesheet rule, not an inline style: the site's open animation ends with clearProps:'all' on these nodes)
      const rule = d.createElement('style');
      rule.setAttribute('data-ydx', 'case-name');
      d.head.append(rule);
      const fit = () => {
        if (!dlg.open) return;
        rule.textContent = '';
        const avail = name.clientWidth;
        if (!avail) return;
        const cs = getComputedStyle(name);
        Object.assign(probe.style, {
          fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
          fontStretch: cs.fontStretch, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
          fontVariationSettings: cs.fontVariationSettings,
        });
        info.append(probe);
        let widest = 0;
        for (const w of (name.textContent || '').split(/\s+/)) {
          if (!w) continue;
          probe.textContent = w;
          widest = Math.max(widest, probe.getBoundingClientRect().width);
        }
        probe.remove();
        if (widest > avail) rule.textContent = `.case__info h2{font-size:${Math.max(26, Math.floor(parseFloat(cs.fontSize) * avail / widest * 0.97))}px}`;
      };
      new MutationObserver(fit).observe(name, { childList: true, characterData: true, subtree: true });
      new MutationObserver(fit).observe(dlg, { attributes: true, attributeFilter: ['open'] });
      addEventListener('resize', fit, { passive: true });
      if (d.fonts) d.fonts.ready.then(fit);

      // 2b. Close like it opened. Opening from the wall dives into a tile, then the panel slides in and the dialog's
      // paper fades up around the shot. Closing used to cut straight from the dialog to the zoomed wall. Now the panel
      // slides back out, the paper fades and the live shot dissolves into the tile under it, then the site's own dive
      // pulls the wall back (desktop, opened from the wall).
      // Phones: the site's close removes the live iframe and lifts a card with the screenshot back to the wall, which
      // cut hard from the live page (often a different crop) to the screenshot. The live site now crossfades into its
      // screenshot first (the site's own .is-live transition), then the site's close runs.
      let pass = false, closing = false, anims = [], orig = null, img = null;
      const tileUnderShot = () => {
        // (geometry, not elementsFromPoint: the wall ignores the pointer while it is zoomed)
        const r = shot.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let best = null, area = 0;
        for (const t of $$('.tile', wall)) {
          const b = t.getBoundingClientRect();
          if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) continue;
          if (b.width * b.height > area) { area = b.width * b.height; best = t; }
        }
        return best;
      };
      const clear = () => { anims.forEach((a) => a.cancel()); anims = []; closing = false; };
      const done = () => {
        try {
          if (orig && img) img.setAttribute('src', orig);
          pass = true;
          closeBtn.click();
        } finally {
          pass = false;
          if (!dlg.open) clear(); else dlg.addEventListener('close', clear, { once: true });
          // never leave the dialog faded out and unclosable if the site's close did not go through
          setTimeout(() => { if (closing) clear(); }, 2000);
        }
      };
      const dissolve = () => {
        // After prev/next the case shows another site than the tile it dived into: show that site's thumbnail on the
        // tile while the shot dissolves (the site does the same swap itself once it takes over).
        const tile = tileUnderShot();
        img = tile && $('img', tile);
        const on = $$('img', shot).find((i) => i.classList.contains('is-on'));
        const id = on && /\/work\/([^/.]+)\.webp/.exec(on.getAttribute('src') || '');
        if (img && id && tile.dataset.name !== name.textContent) { orig = img.getAttribute('src'); img.src = `/work/thumb/${id[1]}.webp`; }
        const x = (rtl ? -1 : 1) * 70;
        // (end keyframes only: each starts from whatever the element shows now, also mid-way through the site's open)
        anims = [
          info.animate([{ transform: `translateX(${x}px)`, opacity: 0 }],
            { duration: 260, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' }),
          dlg.animate([{ backgroundColor: 'rgba(0, 0, 0, 0)' }], { duration: 300, delay: 40, easing: 'ease-in', fill: 'forwards' }),
          shot.animate([{ opacity: 0 }], { duration: 280, delay: 90, easing: 'ease-in', fill: 'forwards' }),
        ];
        Promise.all(anims.map((a) => a.finished)).then(done, done);
      };
      const softClose = (e) => {
        if (pass || reduce || !dlg.open) return;
        const dive = wall.classList.contains('is-diving');
        if (!dive && !(innerWidth < 900 && shot.classList.contains('is-live'))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (closing) return;
        closing = true;
        anims = []; orig = null; img = null;
        if (!dive) {
          shot.classList.remove('is-live');
          setTimeout(done, 280);
          return;
        }
        // Escape while the dive in is still running (the site keeps the dialog visibility:hidden until it lands): the
        // site's own close then took its clip-path branch, the dive landed afterwards and left the zoomed wall
        // (z-index 45) covering the page. Wait for the landing, then close the normal way.
        let frames = 0;
        const wait = () => {
          if (dlg.style.visibility !== 'hidden' || frames++ > 90) dissolve(); else requestAnimationFrame(wait);
        };
        wait();
      };
      closeBtn.addEventListener('click', softClose, true);
      dlg.addEventListener('cancel', softClose, true);

      // 2c. Focus: the site focuses "Close" when the case opens, but the opening animation hides the panel for a moment
      // (visibility), which drops focus to <body>; a keyboard user then had no focus inside the dialog. Put it back.
      const refocus = () => { if (dlg.open && !dlg.contains(d.activeElement)) closeBtn.focus({ preventScroll: true }); };
      new MutationObserver(() => { if (dlg.open) { setTimeout(refocus, 1000); setTimeout(refocus, 1600); } })
        .observe(dlg, { attributes: true, attributeFilter: ['open'] });

      // 2d. Arrow keys: the site maps ArrowRight to "next" on both pages, but in Hebrew "next" sits on the left with a
      // left-pointing arrow. Swap the keys on the RTL page, for the case dialog and the business-type radios.
      window.addEventListener('keydown', (e) => {
        // (not with Alt/Ctrl/Meta: Alt+Arrow is the browser's back/forward and must keep working)
        if (e.ydx || e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        if (closing && dlg.open) { e.stopImmediatePropagation(); return; }
        if (!rtl) return;
        const t = e.target instanceof Element ? e.target : d.body;
        if (!dlg.open && !t.closest('[data-chips]')) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        const swap = new KeyboardEvent('keydown', { key: e.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft', bubbles: true, cancelable: true });
        swap.ydx = true;
        t.dispatchEvent(swap);
      }, true);
    }

    /* ---- 3. Reveal choreography --------------------------------------------------------------------------------------- */
    const reveal = (els, margin = '0px 0px -10% 0px') => {
      if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('ydx-in')); return; }
      const io = new IntersectionObserver((entries) => {
        for (const en of entries) if (en.isIntersecting) { en.target.classList.add('ydx-in'); io.unobserve(en.target); }
      }, { rootMargin: margin });
      els.forEach((el) => io.observe(el));
    };
    // The index and the contact list are filled in by the app (the index at start-up); number the rows for the stagger.
    const number = () => {
      $$('.index > li').forEach((li, i) => li.style.setProperty('--ydx-i', String(Math.min(i, 14))));
      $$('.next li').forEach((li, i) => li.style.setProperty('--ydx-i', String(i + 2)));
    };
    number();
    const index = $('[data-index]');
    if (index && !index.children.length) new MutationObserver((_, mo) => { number(); mo.disconnect(); }).observe(index, { childList: true });
    reveal($$('.kick'), '0px 0px -12% 0px');
    reveal($$('[data-index], .next'), '0px 0px -8% 0px');
    // A visit that lands below the fold (a #link or a refresh) must not leave anything waiting above it.
    addEventListener('load', () => {
      for (const el of $$('.kick, [data-index], .next')) if (el.getBoundingClientRect().bottom < 0) el.classList.add('ydx-in');
    });

    /* ---- 4. Small fixes ----------------------------------------------------------------------------------------------- */

    // 4a. The "Build" step demonstrates the other language 1.9s after it becomes active and switches back when another
    // step does. Scrolling past step 4 in one jump (a nav link, a fast fling) never activates it, so the hero and the
    // contact preview stayed in the other language (an English preview on the Hebrew page). Put the page's own
    // language back once the process section is out of view, unless the visitor picked a language themselves.
    // The only way to switch is a click on the demo's own button, and the site takes any click there as "the visitor
    // picked" and stops its demo for good. So after ydx has had to restore once, ydx runs that demo itself, with the
    // site's own rule (1.9s after step 3 becomes active switch to the other language; back on any other step), keyed
    // off the data-step attribute the site sets on each step change. Before that first restore the site runs it alone.
    const seg = $$('[data-seg="lang"] button');
    const proc = $('.proc');
    // The Hebrew page is generated from the English one and kept English's aria-pressed="true", so the switch showed
    // "English" selected over a Hebrew preview until the first change. The demo starts in the page's language.
    seg.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === (rtl ? 'he' : 'en'))));
    if (seg.length && proc && 'IntersectionObserver' in window) {
      let picked = false, took = false, timer = 0, demo = 0;
      seg.forEach((b) => b.addEventListener('click', (e) => { if (e.isTrusted) { picked = true; clearTimeout(demo); } }));
      const own = seg.find((b) => b.dataset.lang === (rtl ? 'he' : 'en'));
      const other = seg.find((b) => b !== own);
      const on = (b) => b && b.getAttribute('aria-pressed') === 'true';
      const restore = () => { if (!picked && own && !on(own)) { took = true; own.click(); } };
      new IntersectionObserver(([en]) => {
        clearTimeout(timer);
        clearTimeout(demo);
        if (en.isIntersecting) return;
        restore();
        timer = setTimeout(restore, 2100); // the demo's own pending switch fires 1.9s after the step activates
      }).observe(proc);
      if (other && !reduce) {
        new MutationObserver(() => {
          if (!took || picked) return;
          clearTimeout(demo);
          if (proc.dataset.step === '3') demo = setTimeout(() => { if (!picked && !on(other)) other.click(); }, 1900);
          else restore();
        }).observe(proc, { attributes: true, attributeFilter: ['data-step'] });
      }
    }

    // 4b. Hebrew studio text: "ב־ydesign: Why, למה" ran "ydesign: Why" together as one left-to-right run, so "Why" sat
    // next to "ב־". A right-to-left mark after "ydesign" keeps the colon in the Hebrew sentence.
    if (rtl) {
      for (const p of $$('.studio__body p')) {
        for (const n of p.childNodes) if (n.nodeType === 3 && n.data.includes('ydesign: Why')) n.data = n.data.replace('ydesign: Why', 'ydesign‏: Why');
      }
    }
  });
})();
