/* Form & Field: ydx enhancement layer.
   1. loader: a type-specimen proof sheet. The wordmark "inks up" from weight 200 to 800 as the page loads, the
      pink baseline rules across as the progress line, then the paper is pulled off in five strips over the
      printer's colour bar (violet, pink, mint, ink, white) and the cover is printed in.
   2. page transitions: long jumps through the guide (nav, chapter index, round links) cover the page with five
      plates in the destination's field colour, jump, and lift. Short jumps keep Lenis' glide.
   3. reveals: headline words rise out of their line, copy blocks settle, all once.
   4. small things: magnetic buttons, the ribbon follows scroll speed, the footer prints its colour bar.
   Everything here uses transform / opacity / one-shot clip-path and respects prefers-reduced-motion. */
(() => {
  'use strict';
  if (window.__ydxEnh) return;                             // loaded twice: the first copy already owns the page
  window.__ydxEnh = true;
  const d = document, html = d.documentElement;
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = () => !reduce.matches;
  const mode = html.getAttribute('data-ydx-mode') || 'first';
  /* round 4: motion tokens. Four curves for the whole layer, mirrored in enhance.css (--ease is the site's own):
     OUT settles anything arriving, INOUT moves plates and wipes, IN takes things away, SPRING is kept for the one
     object that is dropped onto the page (the lens). */
  const OUT = 'cubic-bezier(.2,.8,.2,1)', INOUT = 'cubic-bezier(.7,0,.2,1)', IN = 'cubic-bezier(.5,0,.75,0)', SPRING = 'cubic-bezier(.3,1.35,.5,1)';
  const canAnimate = typeof Element.prototype.animate === 'function';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* enhance.css loaded? (the link sits before this script, so it has loaded or failed by now). Without it the shutter,
     the progress bar and the torn-proof clones would land in the page flow unstyled, so they are skipped. */
  const cssOK = getComputedStyle(html).getPropertyValue('--ydx-css').trim() === '1';
  if (cssOK) html.classList.add('ydx-on');                 // hide-before-reveal states in enhance.css key on this, not on the inline ydx-js
  if ('ffLenis' in window) html.classList.add('ydx-app');  // app.js ran: its .in classes will arrive, so marks may wait for them

  /* ================= 1. loader ================= */
  const loader = $('#ydx-loader');
  let heroPlayed = false;
  /* the inline failsafe covers a missing enhance.js; from here this script owns the loader, with its own last-resort
     timer below in case anything in the exit throws */
  clearTimeout(window.__ydxFS);
  const unlock = () => { html.classList.remove('ydx-loading'); if (loader) loader.remove(); };
  if (loader && (html.classList.contains('ydx-fail') || !html.classList.contains('ydx-loading'))) {
    /* the inline failsafe is fading the sheet (ydx-fail) or has already lifted it (the sheet is still in the DOM but
       ydx-loading is gone): the cover has been on screen, so no intro, which would hide the headline again */
    heroPlayed = true;
    setTimeout(unlock, 450);
  } else if (loader) {
    try { runLoader(); } catch (e) { unlock(); }
  } else d.addEventListener('DOMContentLoaded', () => heroIntro(0), { once: true });

  function runLoader() {
    /* times are counted from the moment the sheet was painted (inline head script), not from navigation start,
       so a slow HTML download does not eat the minimum, and a slow script download cannot stretch the cap */
    const T0 = window.__ydxT0 || 0;
    const MIN = T0 + ({ first: 1450, quick: 380, frame: 220, reduced: 300, cut: 70 }[mode] || 1200);   // cut (round 5): back from the press under its plates
    const HARD = T0 + (mode === 'frame' ? 420 : 4000);   // never trap anyone (the hub's iframe preview stays under ~.8s in all)
    const late = performance.now() > HARD - 250;          // enhance.js arrived too late for the full show
    const word = $('#ydx-word'), base = $('#ydx-base'), wght = $('#ydx-wght'), pct = $('#ydx-pct'), status = $('#ydx-status');
    const chips = $$('.ydx-chips b', loader);
    let loaded = d.readyState === 'complete', p = mode === 'first' ? 0 : 1, gone = false, lastW = -1;
    if (mode === 'first') {                                // pick up where the CSS-only ink creep (slow networks) got to
      const cw = parseFloat(getComputedStyle(word).getPropertyValue('--w')) || 200;
      p = Math.min(0.9, Math.max(0, (cw - 200) / 600));
      word.style.animation = base.style.animation = 'none';
    }
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    const paint = () => {
      const w = Math.round((200 + 600 * p) / 10) * 10;      // a variable axis, read off in steps of ten
      if (w !== lastW) { word.style.setProperty('--w', w); wght.textContent = w; lastW = w; }
      base.style.transform = `scaleX(${p.toFixed(4)})`;
      pct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
      chips.forEach((c, i) => c.classList.toggle('on', p >= (i + 1) / 5 - 0.001));
      if (p >= 1 && status.textContent !== 'Ready to print.') status.textContent = 'Ready to print.';
    };
    paint();

    let lastT = 0;
    const tick = now => {
      if (gone) return;
      /* the type waits for the sorts to be set (~.55s), then inks up with time; it can only finish once the page has loaded */
      if (mode === 'first') {                                // repeat visits arrive already inked (p = 1)
        const t = Math.max(0, now - T0 - 420) / (MIN - T0 - 420);
        const goal = loaded ? Math.min(1, t) : Math.min(0.9, t * 0.9);
        const k = 1 - Math.pow(0.86, Math.min(6, (now - (lastT || now - 16.7)) / 16.7)); lastT = now;   // frame-rate independent
        p = Math.max(p, p + (goal - p) * k);                // ink never runs backwards
        if (goal === 1 && 1 - p < 0.004) p = 1;
        paint();
      }
      if ((p === 1 && loaded && now >= MIN) || now >= HARD) return leave();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => leave(), Math.max(0, HARD + 200 - performance.now()));   // rAF does not run in a background tab
    setTimeout(unlock, Math.max(0, HARD + 1600 - performance.now()));         // last resort: the exit takes < 1s

    function leave() {
      if (gone) return; gone = true;
      try { exit(); } catch (e) { unlock(); }              // whatever happens, the sheet never stays over the page
    }
    function exit() {
      p = 1; paint();
      if (mode === 'cut' && location.hash) {                // back from the press: land the field flush, as the in-page plates do
        try {
          const t = d.getElementById(decodeURIComponent(location.hash.slice(1)));
          if (t && t.matches('.sec[data-field]')) {
            const y = t.getBoundingClientRect().top + scrollY, lenis = window.ffLenis;
            if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
          }
        } catch (e) { /* keep the native landing */ }
      }
      try { sessionStorage.setItem('ydx-ff-seen', '1'); } catch (e) { /* storage blocked */ }
      if (!motion() || !canAnimate || !cssOK) {
        heroIntro(0);
        if (canAnimate) loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(unlock, unlock);
        else unlock();
        return;
      }
      const first = mode === 'first' && !late, frame = mode === 'frame';
      const dur = first ? 660 : frame ? 340 : 460, st = first ? 56 : frame ? 22 : 34, lag = first ? 120 : frame ? 50 : mode === 'cut' ? 0 : 70, sheetOut = first ? 60 : 0;
      /* the printed proof is torn into the five strips and carried off with them (each strip holds a copy of the
         sheet, offset to its own column), so the wordmark leaves as paper instead of fading to grey */
      const sheet = $('.ydx-sheet', loader), cols = $$('.ydx-cols > i', loader);
      if (sheet && mode !== 'cut') {
        const star = $('.ydx-star', sheet), turn = star ? getComputedStyle(star).rotate : 'none';   // the clones stand still: keep the star's angle
        cols.forEach((c, i) => {
          const k = sheet.cloneNode(true);
          k.classList.add('ydx-clone');
          k.querySelectorAll('[id]').forEach(n => { n.id = ''; });
          const ks = $('.ydx-star', k); if (ks) ks.style.rotate = turn;
          k.style.left = (-i * 100) + '%';
          c.append(k);
        });
        sheet.style.visibility = 'hidden';
      }
      /* paper strips, then the colour bar under them */
      cols.forEach((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
        { duration: dur, delay: sheetOut + i * st, easing: INOUT, fill: 'forwards' }));
      $$('.ydx-plates > i', loader).forEach((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
        { duration: dur, delay: sheetOut + lag + i * st, easing: INOUT, fill: 'forwards' }));
      heroIntro(sheetOut + lag + st + dur * 0.28);              // the cover starts printing while the plates are still passing
      setTimeout(unlock, sheetOut + lag + st * 4 + dur + 40);
    }
  }

  /* The cover prints in: the two headline lines are inked left to right (clip only, so the loupe's measurements
     stay true), the lens drops onto the page, the small print settles. */
  function heroIntro(delay) {
    if (heroPlayed) return; heroPlayed = true;
    if (!motion() || !canAnimate || scrollY > innerHeight * 0.5) return;
    const b = { fill: 'backwards' };
    $$('.hero h1 .l1, .hero h1 .l2, .bp-h1 .l1, .bp-h1 .l2').forEach(el => {
      const i = el.classList.contains('l2') ? 1 : 0;
      el.animate([{ clipPath: 'inset(-30% 100% -40% -8%)' }, { clipPath: 'inset(-30% -8% -40% -8%)' }],
        { ...b, duration: 950, delay: delay + i * 150, easing: INOUT });
    });
    const lens = $('.loupe-view'), img = $('.loupe-img');
    if (img) img.style.transformOrigin = '37.4% 38.97%';      // the lens centre inside the photographed loupe
    [lens, img].forEach(el => el && el.animate(
      [{ opacity: 0, scale: '.55', rotate: '-24deg' }, { opacity: 1, offset: 0.1 }, { opacity: 1, scale: '1', rotate: '0deg' }],   // opaque at once: a see-through lens read as a muddy ghost
      { ...b, duration: 1000, delay: delay + 380, easing: SPRING }));
    const flood = $('.flood');                                 // the violet disc behind the lens must not show around it
    if (flood) flood.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { ...b, duration: 1000, delay: delay + 380, easing: 'linear' });
    $$('.hero-top>span, .hero-lede>*, .hero-marks>span, .proof-strip>*').forEach((el, i) => el.animate(
      [{ opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }],
      { ...b, duration: 800, delay: delay + 260 + i * 45, easing: OUT }));
    $$('.hero > .crops i').forEach((el, i) => el.animate([{ opacity: 0, scale: '1.9' }, { opacity: 0.75, scale: '1' }],
      { ...b, duration: 700, delay: delay + 120 + i * 60, easing: OUT }));
    const hint = $('.hero-hint');
    if (hint) {
      hint.animate([{ clipPath: 'inset(-60% 100% -140% -70%)' }, { clipPath: 'inset(-60% -10% -140% -70%)' }],
        { ...b, duration: 700, delay: delay + 1100, easing: INOUT });
      const path = $('path', hint);
      if (path && path.getTotalLength && getComputedStyle(hint.querySelector('svg')).display !== 'none') {
        const L = Math.ceil(path.getTotalLength());
        path.style.strokeDasharray = L;
        path.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { ...b, duration: 600, delay: delay + 1600, easing: OUT })
          .finished.then(() => { path.style.strokeDasharray = ''; }, () => {});
      }
    }
  }

  /* ================= 2. page transitions (long anchor jumps) ================= */
  const shutter = d.createElement('div');
  shutter.className = 'ydx-shutter'; shutter.setAttribute('aria-hidden', 'true');
  shutter.innerHTML = '<div class="ydx-sh-cols"><i></i><i></i><i></i><i></i><i></i></div><div class="ydx-sh-label"><span class="mono ydx-sh-k"></span><strong class="display ydx-sh-t"></strong><i class="reg"></i></div>';
  let busy = false, settle = () => {};                     // settle: set by the reveals below
  const progress = d.createElement('i');                   // round 2: reading progress as the proof colour bar (enhance.css)
  progress.className = 'ydx-progress'; progress.setAttribute('aria-hidden', 'true');
  const ready = () => d.body.append(shutter, progress);
  if (cssOK) { if (d.body) ready(); else d.addEventListener('DOMContentLoaded', ready, { once: true }); }

  /* flush: a transition lands a colour field exactly at the top. With the 70px scroll padding a strip of the previous
     field showed above it, so pink plates lifted onto a mint band. The floating header pills sit fine over the field. */
  const targetTop = (el, flush) => {
    const pad = flush ? 0 : parseFloat(getComputedStyle(html).scrollPaddingTop) || 0, m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, el.getBoundingClientRect().top + scrollY - pad - m);
  };
  const textOf = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('.chapter-no-sr,.bp-note,svg').forEach(n => n.remove()); c.querySelectorAll('br').forEach(n => n.replaceWith(' ')); return c.textContent.replace(/\s+/g, ' ').trim(); };

  d.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip') || a.target) return;
    let id = ''; try { id = decodeURIComponent(a.hash.slice(1)); } catch (err) { return; }   // a malformed %-escape: leave it to the browser
    const target = id && d.getElementById(id);
    if (!target) return;
    /* a second activation while the plates are up (Enter held or pressed twice: the plates block pointer clicks) would
       otherwise fall through to Lenis' glide and the native jump under the shutter */
    if (busy) { e.preventDefault(); e.stopPropagation(); return; }
    if (!cssOK || !motion() || !canAnimate || html.classList.contains('ydx-loading')) return;
    if (Math.abs(targetTop(target) - scrollY) < innerHeight * 1.2) return;   // a short glide reads better than a cut
    e.preventDefault(); e.stopPropagation();                                 // Lenis listens on window, after us
    play(target, a.hash);
  });
  /* round 5: to the proof press (another page). The plates close in the press room's ink, the word and weight from
     the playground travel in the URL, and the press opens under the same plates (sessionStorage 'ydx-ff-cut', read by
     its inline boot script). Without motion, CSS or WAAPI it is a plain link, still carrying the word. */
  d.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-ydx-go]');
    if (!a || e.defaultPrevented || e.button !== 0 || a.target) return;
    try {
      const u = new URL(a.getAttribute('href'), location.href), w = $('#lab-word'), g = $('#weight');
      if (w && w.value.trim()) u.searchParams.set('w', w.value.trim().slice(0, 14));
      if (g) u.searchParams.set('wght', g.value);
      a.href = u.pathname + u.search;
    } catch (err) { /* keep the plain link */ }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // a new tab still gets the word
    if (busy) { e.preventDefault(); return; }
    if (!cssOK || !motion() || !canAnimate || html.classList.contains('ydx-loading')) return;
    const c = a.getAttribute('data-ydx-go');
    if (!/^#[0-9a-f]{6}$/i.test(c)) return;
    e.preventDefault(); e.stopPropagation(); busy = true;
    shutter.style.setProperty('--field', c); shutter.style.setProperty('--on', 'var(--paper)'); shutter.style.setProperty('--accent', 'var(--pink)');
    $('.ydx-sh-k', shutter).textContent = '005 / The proof press';
    const t = $('.ydx-sh-t', shutter), em = d.createElement('em'); t.textContent = 'Pull a '; em.textContent = 'proof.'; t.append(em);
    shutter.classList.add('on');
    $$('.ydx-sh-cols i', shutter).forEach((el, i) => el.animate([{ transform: 'translate3d(0,101%,0)' }, { transform: 'translate3d(0,0,0)' }],
      { duration: 220, delay: i * 16, easing: INOUT, fill: 'forwards' }));
    $('.ydx-sh-label', shutter).animate([{ opacity: 0, transform: 'translate3d(0,calc(-50% + 22px),0)' }, { opacity: 1, transform: 'translate3d(0,-50%,0)' }],
      { duration: 150, delay: 220, easing: OUT, fill: 'forwards' });
    setTimeout(() => {
      try { sessionStorage.setItem('ydx-ff-cut', JSON.stringify({ c, t: Date.now() })); } catch (err) { /* the press just opens on its own loader */ }
      location.href = a.href;
      setTimeout(liftAway, 4000);                              // navigation blocked or cancelled: never leave the plates up
    }, 360);
  }, true);
  /* back from the press through the bfcache: the plates that covered the page on the way out must not still be up */
  const liftAway = () => {
    busy = false; shutter.classList.remove('on');
    shutter.querySelectorAll('*').forEach(el => el.getAnimations && el.getAnimations().forEach(a => a.cancel()));
  };
  addEventListener('pageshow', e => { if (e.persisted) liftAway(); });

  /* Back / Forward while the plates are closing: the jump and the history entry are dropped, the plates just lift */
  let aborted = false;
  addEventListener('popstate', () => { if (busy) aborted = true; });

  /* the plates never stay up: if anything below throws, the shutter is released and the page jumps natively */
  async function play(target, hash) {
    busy = true; aborted = false;
    try { await run(target, hash); } catch (e) {
      try { target.scrollIntoView(); } catch (e2) { /* nothing more to do */ }
    } finally {
      shutter.classList.remove('on');
      shutter.querySelectorAll('*').forEach(el => el.getAnimations && el.getAnimations().forEach(a => a.cancel()));
      busy = false;
    }
  }
  async function run(target, hash) {
    const cs = getComputedStyle(target.closest('[data-field]') || target);
    const field = cs.getPropertyValue('--field').trim() || 'var(--yellow)', on = cs.getPropertyValue('--on').trim() || 'var(--ink)';
    shutter.style.setProperty('--field', field); shutter.style.setProperty('--on', on);
    shutter.style.setProperty('--accent', cs.getPropertyValue('--accent').trim() || 'var(--pink)');
    const isTop = target.id === 'top';
    $('.ydx-sh-k', shutter).textContent = isTop ? 'A field guide for the curious' : textOf($('.ch-head .mono, .kicker > span', target));
    const h = $('h1, h2, h3', target), t = $('.ydx-sh-t', shutter);
    t.innerHTML = '';
    if (h) {                                                   // keep the heading's italic word italic
      const c = h.cloneNode(true);
      c.querySelectorAll('.chapter-no-sr,.bp-note,svg').forEach(n => n.remove());
      c.querySelectorAll('br').forEach(n => n.replaceWith(' '));
      const em = c.querySelector('em'), emText = em ? em.textContent.trim() : '';
      const full = c.textContent.replace(/\s+/g, ' ').trim();
      const k = emText ? full.lastIndexOf(emText) : -1;
      if (k >= 0) { t.append(full.slice(0, k)); const e2 = d.createElement('em'); e2.textContent = emText; t.append(e2, full.slice(k + emText.length)); }
      else t.textContent = full;
    }
    shutter.classList.add('on');
    const cols = $$('.ydx-sh-cols i', shutter), label = $('.ydx-sh-label', shutter);
    const COVER = 200, REVEAL = 260, ST = 16;
    cols.forEach((c, i) => c.animate([{ transform: 'translate3d(0,101%,0)' }, { transform: 'translate3d(0,0,0)' }],
      { duration: COVER, delay: i * ST, easing: INOUT, fill: 'forwards' }));
    label.animate([{ opacity: 0, transform: 'translate3d(0,calc(-50% + 22px),0)' }, { opacity: 1, transform: 'translate3d(0,-50%,0)' }],
      { duration: 150, delay: COVER, easing: OUT, fill: 'forwards' });   // only once the plates have closed
    await wait(COVER + ST * 4 + 20);
    if (!aborted) {
      /* jump while covered. The URL takes the hash, as a native anchor click would (a new history entry, or a
         replacement for the same hash); it is pushed before the jump so the entry we leave keeps its own scroll position */
      try { if (location.hash === hash) history.replaceState(history.state, '', hash); else history.pushState(null, '', hash); } catch (e) { /* sandboxed */ }
      const top = targetTop(target, target.matches('.sec[data-field], #top')), lenis = window.ffLenis;
      settle(target);                                          // the plates already showed this headline: no second entrance
      if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
      else { try { window.scrollTo({ top, behavior: 'instant' }); } catch (e) { window.scrollTo(0, top); } }   // older engines reject 'instant'
      if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); target.setAttribute('data-ydx-ft', ''); }
      try { target.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
    }
    await wait(70);
    /* the label is gone before the plates open: on a plate of the same colour as the field it would otherwise
       cross-dissolve with the real headline underneath */
    label.animate([{ opacity: 1, transform: 'translate3d(0,-50%,0)' }, { opacity: 0, transform: 'translate3d(0,calc(-50% - 20px),0)' }],
      { duration: 120, easing: IN, fill: 'forwards' });
    const anims = cols.map((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
      { duration: REVEAL, delay: 85 + i * ST, easing: INOUT, fill: 'forwards' }));
    /* the plates' finish, or their planned end if the tab is hidden and animation promises are held back */
    await Promise.race([Promise.all(anims.map(a => a.finished.catch(() => {}))), wait(85 + ST * 4 + REVEAL + 400)]);
  }

  /* ================= 3. reveals ================= */
  if (!cssOK || !motion() || !canAnimate || !('IntersectionObserver' in window)) return finishStatic();

  /* headline words: split into word masks (Latin display type; letters would be fine too, words read calmer) */
  const heads = $$('.sec h2.display, .ch-head h3');
  heads.forEach(h => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = d.createElement('span'), wi = d.createElement('span');
            w.className = 'ydx-w'; wi.className = 'ydx-wi'; wi.textContent = part; w.append(wi); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.matches('svg, .chapter-no-sr, br, .ydx-w')) walk(n);
      });
    };
    walk(h);
    if (h.getBoundingClientRect().top > innerHeight * 0.9) h.classList.add('ydx-split-wait');
  });

  /* copy blocks settle in, staggered inside their group */
  const groups = [
    '.man-copy', '.manifesto .man-grid', '.frame-head', '.q-cards', '.guide-head', '.lesson', '.gallery-head', '.play-head', '.type-lab',
    '.critique-intro', '.crit-grid', '.practice-head', '.closing', '.closing-row', '.ch-grid', '.frame-grid', '.q-stage'
  ];
  const items = new Map([
    ['.man-copy', '.man-copy > p'], ['.manifesto .man-grid', '.aside-note'], ['.frame-head', '.frame-tabs'], ['.q-cards', '.q-cards > article'],
    ['.guide-head', '.guide-head > p'], ['.lesson', '.lesson > *'], ['.gallery-head', '.gallery-head > p'], ['.play-head', '.play-head > p'],
    ['.type-lab', '.type-lab > *'], ['.critique-intro', '.critique-intro > p, .critique-steps'], ['.crit-grid', '.draft-wrap, .critique-deck'],
    ['.practice-head', '.practice-head > p'], ['.closing', '.closing > .mono'], ['.closing-row', '.closing-row > *'],
    ['.ch-grid', '.plate'], ['.frame-grid', '.artboard'], ['.q-stage', '.q-clutter']
  ]);
  const rvEls = new Set();
  groups.forEach(g => $$(g).forEach(group => {
    $$(items.get(g), group).filter(el => group.contains(el) && el.closest(g) === group).forEach((el, i) => {
      if (rvEls.has(el)) return;
      el.dataset.ydxRv = String(i);
      rvEls.add(el);
    });
  }));
  rvEls.forEach(el => { if (el.getBoundingClientRect().top > innerHeight * 0.92) el.classList.add('ydx-rv-wait'); });

  const playEl = (el, extra = 0) => {
    const i = Number(el.dataset.ydxRv) || 0;
    const wipe = el.matches('.artboard, .plate-observe');
    const kf = wipe
      ? [{ opacity: 0, clipPath: 'inset(0 0 100% 0)', translate: '0 40px' }, { opacity: 1, clipPath: 'inset(0 0 0% 0)', translate: '0 0' }]
      : [{ opacity: 0, translate: '0 34px' }, { opacity: 1, translate: '0 0' }];
    el.animate(kf, { duration: wipe ? 1100 : 900, delay: extra + Math.min(i, 6) * 90, easing: OUT, fill: 'backwards' });
    el.classList.remove('ydx-rv-wait');
  };
  const playHead = h => {
    const ws = $$('.ydx-wi', h);
    if (!h.classList.contains('ydx-split-wait')) return;
    h.classList.add('ydx-split-run'); h.classList.remove('ydx-split-wait');
    const anims = ws.map((w, i) => w.animate([{ transform: 'translate3d(0,135%,0) rotate(4deg)' }, { transform: 'none' }],
      { duration: 1000, delay: i * 70, easing: OUT, fill: 'backwards' }));
    Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => h.classList.remove('ydx-split-run'));
  };
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    if (!motion()) { en.target.classList.remove('ydx-split-wait', 'ydx-rv-wait'); return; }   // reduced motion switched on meanwhile
    if (en.target.classList.contains('ydx-split-wait')) playHead(en.target); else playEl(en.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  heads.forEach(h => h.classList.contains('ydx-split-wait') && io.observe(h));
  settle = target => {
    const h = $('h1, h2, h3', target);
    if (h && h.classList.contains('ydx-split-wait')) { io.unobserve(h); h.classList.remove('ydx-split-wait'); }
  };
  rvEls.forEach(el => el.classList.contains('ydx-rv-wait') && io.observe(el));

  /* footer colour bar */
  const foot = $('.site-footer');
  if (foot) new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { foot.classList.add('ydx-in'); o.disconnect(); } }, { threshold: 0.3 }).observe(foot);

  /* round 4, the end of the page answers the loader: the footer wordmark inks up from weight 200 to 800 once, the way
     the proof sheet did at the start, and the brand star turns. The word's box is locked at its inked width first,
     a screen before the footer, so the letters ink inside it and nothing beside them moves (no layout shift). */
  const fw = foot && $('.wordmark', foot), fstar = fw && $('.brand-star', fw);
  if (fw && fw.animate) {
    let primed = false;
    const prime = new IntersectionObserver(en => {
      if (!en[0].isIntersecting || primed) return;
      primed = true; prime.disconnect();
      if (!motion() || en[0].boundingClientRect.top < innerHeight) return;   // already on screen (restored at the bottom): leave it inked
      const fs = parseFloat(getComputedStyle(fw).fontSize) || 1;
      fw.style.minWidth = (fw.getBoundingClientRect().width / fs).toFixed(3) + 'em';   // in em, so a resize keeps it true
      fw.style.fontWeight = '200';
      inkObs.observe(fw);
    }, { rootMargin: '0px 0px 100% 0px' });
    const inkObs = new IntersectionObserver(en => {
      if (!en[0].isIntersecting) return;
      inkObs.disconnect();
      const done = () => { fw.style.fontWeight = ''; fw.style.minWidth = ''; };
      if (!motion()) return done();
      fw.style.fontWeight = '';
      fw.animate([{ fontWeight: 200 }, { fontWeight: 800 }], { duration: 1100, delay: 120, easing: OUT, fill: 'backwards' })
        .finished.then(done, done);
      if (fstar) fstar.animate([{ rotate: '0deg' }, { rotate: '180deg' }], { duration: 900, delay: 900, easing: OUT });
    }, { threshold: 0.9 });
    prime.observe(foot);
  }

  /* ================= 4. small things ================= */
  /* magnetic: the pill buttons and round arrows lean toward the pointer */
  if (fine.matches) $$('.pill-button, .round-link, .main-nav .nav-cta').forEach(el => {
    const tgt = el.classList.contains('round-link') ? $('.round-icon', el) : el;
    if (!tgt) return;
    const k = el.classList.contains('round-link') ? 0.32 : 0.22;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const step = () => {
      raf = 0; x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      const settled = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05;
      if (settled) { x = tx; y = ty; }
      tgt.style.translate = (x || y) ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : '';
      if (!settled) raf = requestAnimationFrame(step);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(step); };
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || reduce.matches) return;
      const r = tgt.getBoundingClientRect();
      tx = Math.max(-14, Math.min(14, (e.clientX - (r.left - x + r.width / 2)) * k));
      ty = Math.max(-10, Math.min(10, (e.clientY - (r.top - y + r.height / 2)) * k));
      go();
    });
    el.addEventListener('pointerleave', () => { tx = ty = 0; go(); });
  });

  /* the ribbon follows the reader: faster with a fast scroll, backwards when scrolling back */
  const ribbon = $('.ribbon'), track = $('.ribbon-track');
  if (ribbon && track && track.getAnimations) {
    let lastY = scrollY, vel = 0, dir = 1, rate = 1, raf = 0;
    const step = () => {
      raf = 0;
      const a = track.getAnimations()[0];
      if (!a) return;
      vel *= 0.9;
      const goal = dir * (1 + Math.min(9, Math.abs(vel) * 0.16));
      rate += (goal - rate) * 0.12;
      a.playbackRate = Math.round(rate * 100) / 100;
      if (Math.abs(goal - rate) > 0.02 || Math.abs(vel) > 0.1) raf = requestAnimationFrame(step);
    };
    addEventListener('scroll', () => {
      const dy = scrollY - lastY; lastY = scrollY;
      if (!ribbon.classList.contains('on') || !dy) return;
      vel = dy; dir = dy > 0 ? 1 : -1;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
  }

  function finishStatic() {
    const foot = $('.site-footer'); if (foot) foot.classList.add('ydx-in');
  }
})();
