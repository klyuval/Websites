/* ydx enhance.js: design + motion pass for the ydesign hub (vanilla, no dependencies, no build step).
 *
 * The hub already has an elaborate loader (the designer's cursor builds the first screen), a wall that dives into the
 * case dialog, and its own GSAP scroll choreography. This file complements them and never replaces them:
 *   1. Loader pacing: repeat visits in the same tab session (a reload, the language switch) and framed previews play
 *      the build at the speed the loader already uses when a visitor interacts, instead of the full first-visit show.
 *   2. Case dialog: closing mirrors the opening (the panel slides back out and the shot dissolves into its tile
 *      before the wall pulls back), the site name is fitted to the panel, and arrow keys follow the reading direction.
 *   3. Reveal choreography for kicker rules, the site index and the "what happens next" list.
 *   4. Small fixes: process demo language left on the other language, a bidi glitch in the Hebrew studio text.
 * Everything is skipped or reduced under prefers-reduced-motion.
 */
(() => {
  'use strict';
  const d = document, html = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = html.dir === 'rtl';
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  html.classList.add('ydx-js');

  /* ---- 1. Loader pacing -------------------------------------------------------------------------------------------
   * src/loader.ts plays its build at 3x as soon as it sees the first key, pointer or wheel event (so nobody is held
   * up). For a visitor who has already watched it this session, or inside a frame, give it that cue right away. */
  let seen = false;
  try { seen = sessionStorage.getItem('ydx-seen') === '1'; sessionStorage.setItem('ydx-seen', '1'); } catch (e) { /* private mode */ }
  let framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if ((seen || framed) && !reduce && $('[data-loader]')) {
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
  }

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
    const fit = () => {
      if (!dlg.open) return;
      name.style.fontSize = '';
      const avail = name.clientWidth;
      if (!avail) return;
      const cs = getComputedStyle(name);
      Object.assign(probe.style, {
        font: cs.font, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
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
      if (widest > avail) name.style.fontSize = Math.max(26, Math.floor(parseFloat(cs.fontSize) * avail / widest * 0.97)) + 'px';
    };
    new MutationObserver(fit).observe(name, { childList: true, characterData: true, subtree: true });
    new MutationObserver(fit).observe(dlg, { attributes: true, attributeFilter: ['open'] });
    addEventListener('resize', fit, { passive: true });
    if (d.fonts) d.fonts.ready.then(fit);

    // 2b. Close like it opened. Opening from the wall dives into a tile, then the panel slides in and the dialog's
    // paper fades up around the shot. Closing used to cut straight from the dialog to the zoomed wall. Now the panel
    // slides back out, the paper fades and the live shot dissolves into the tile under it, then the site's own dive
    // pulls the wall back. Only for that dive (desktop, opened from the wall); the other paths already animate.
    let pass = false, closing = false;
    const tileUnderShot = () => {
      const r = shot.getBoundingClientRect();
      const hit = d.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit.find((el) => el.classList && el.classList.contains('tile') && wall.contains(el)) || null;
    };
    const softClose = (e) => {
      if (pass || reduce || !dlg.open || !wall.classList.contains('is-diving')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (closing) return;
      closing = true;
      // After prev/next the case shows another site than the tile it dived into: show that site's thumbnail on the
      // tile while the shot dissolves (the site does the same swap itself once it takes over).
      const tile = tileUnderShot();
      const img = tile && $('img', tile);
      const on = $$('img', shot).find((i) => i.classList.contains('is-on'));
      const id = on && /\/work\/([^/.]+)\.webp/.exec(on.getAttribute('src') || '');
      let orig = null;
      if (img && id && tile.dataset.name !== name.textContent) { orig = img.getAttribute('src'); img.src = `/work/thumb/${id[1]}.webp`; }
      const bg = getComputedStyle(dlg).backgroundColor;
      const x = (rtl ? -1 : 1) * 70;
      const anims = [
        info.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${x}px)`, opacity: 0 }],
          { duration: 260, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' }),
        dlg.animate([{ backgroundColor: bg }, { backgroundColor: 'rgba(0, 0, 0, 0)' }],
          { duration: 300, delay: 40, easing: 'ease-in', fill: 'forwards' }),
        shot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, delay: 90, easing: 'ease-in', fill: 'forwards' }),
      ];
      const done = () => {
        if (orig) img.setAttribute('src', orig);
        pass = true;
        closeBtn.click();
        pass = false;
        const clear = () => { anims.forEach((a) => a.cancel()); closing = false; };
        if (!dlg.open) clear(); else dlg.addEventListener('close', clear, { once: true });
      };
      Promise.all(anims.map((a) => a.finished)).then(done, done);
    };
    closeBtn.addEventListener('click', softClose, true);
    dlg.addEventListener('cancel', softClose, true);

    // 2c. Arrow keys: the site maps ArrowRight to "next" on both pages, but in Hebrew "next" sits on the left with a
    // left-pointing arrow. Swap the keys on the RTL page, for the case dialog and the business-type radios.
    window.addEventListener('keydown', (e) => {
      if (e.ydx || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
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
  const seg = $$('[data-seg="lang"] button');
  const proc = $('.proc');
  if (seg.length && proc && 'IntersectionObserver' in window) {
    let picked = false, timer = 0;
    seg.forEach((b) => b.addEventListener('click', (e) => { if (e.isTrusted) picked = true; }));
    const own = seg.find((b) => b.dataset.lang === (rtl ? 'he' : 'en'));
    const restore = () => { if (!picked && own && own.getAttribute('aria-pressed') !== 'true') own.click(); };
    new IntersectionObserver(([en]) => {
      clearTimeout(timer);
      if (en.isIntersecting) return;
      restore();
      timer = setTimeout(restore, 2100); // the demo's own pending switch fires 1.9s after the step activates
    }).observe(proc);
  }

  // 4b. Hebrew studio text: "ב־ydesign: Why, למה" ran "ydesign: Why" together as one left-to-right run, so "Why" sat
  // next to "ב־". A right-to-left mark after "ydesign" keeps the colon in the Hebrew sentence.
  if (rtl) {
    for (const p of $$('.studio__body p')) {
      for (const n of p.childNodes) if (n.nodeType === 3 && n.data.includes('ydesign: Why')) n.data = n.data.replace('ydesign: Why', 'ydesign‏: Why');
    }
  }
})();
