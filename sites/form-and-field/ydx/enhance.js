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
  const d = document, html = d.documentElement;
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = () => !reduce.matches;
  const mode = html.getAttribute('data-ydx-mode') || 'first';
  const OUT = 'cubic-bezier(.2,.8,.2,1)', INOUT = 'cubic-bezier(.7,0,.2,1)';
  const canAnimate = typeof Element.prototype.animate === 'function';
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ================= 1. loader ================= */
  const loader = $('#ydx-loader');
  let heroPlayed = false;
  if (loader && html.classList.contains('ydx-loading')) runLoader();
  else d.addEventListener('DOMContentLoaded', () => heroIntro(0), { once: true });

  function runLoader() {
    const MIN = { first: 1450, quick: 380, frame: 220, reduced: 300 }[mode] || 1200;
    const HARD = mode === 'frame' ? 800 : 4000;           // never trap anyone
    const word = $('#ydx-word'), base = $('#ydx-base'), wght = $('#ydx-wght'), pct = $('#ydx-pct'), status = $('#ydx-status');
    const chips = $$('.ydx-chips b', loader);
    let loaded = d.readyState === 'complete', p = mode === 'first' ? 0 : 1, gone = false, lastW = -1;
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

    const tick = now => {
      if (gone) return;
      /* the type waits for the sorts to be set (~.55s), then inks up with time; it can only finish once the page has loaded */
      if (mode === 'first') {                                // repeat visits arrive already inked (p = 1)
        const t = Math.max(0, now - 420) / (MIN - 420);
        const goal = loaded ? Math.min(1, t) : Math.min(0.9, t * 0.9);
        p += (goal - p) * 0.14;
        if (goal === 1 && 1 - p < 0.004) p = 1;
        paint();
      }
      if ((p === 1 && loaded && now >= MIN) || now >= HARD) return leave();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => leave(), Math.max(0, HARD + 200 - performance.now()));   // in case rAF is throttled

    function leave() {
      if (gone) return; gone = true;
      p = 1; paint();
      try { sessionStorage.setItem('ydx-ff-seen', '1'); } catch (e) { /* storage blocked */ }
      const done = () => { html.classList.remove('ydx-loading'); loader.remove(); };
      if (!motion() || !canAnimate) {
        heroIntro(0);
        if (canAnimate) loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(done, done);
        else done();
        return;
      }
      const first = mode === 'first', frame = mode === 'frame';
      const dur = first ? 640 : frame ? 340 : 460, st = first ? 56 : frame ? 22 : 34, lag = first ? 110 : frame ? 50 : 70, sheetOut = first ? 210 : frame ? 40 : 90;
      const sheet = $('.ydx-sheet', loader);
      /* the proof lifts off first: letters leave in reading order */
      $$('.ydx-word > *', loader).forEach((b, i) => b.animate(
        [{ transform: 'none', opacity: 1 }, { transform: 'translate3d(0,-.35em,0)', opacity: 0 }],
        { duration: first ? 380 : 220, delay: i * (first ? 14 : 6), easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }));
      sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: first ? 380 : 220, delay: first ? 60 : 0, easing: 'linear', fill: 'forwards' });
      /* paper strips, then the colour bar under them */
      $$('.ydx-cols i', loader).forEach((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
        { duration: dur, delay: sheetOut + i * st, easing: INOUT, fill: 'forwards' }));
      $$('.ydx-plates i', loader).forEach((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
        { duration: dur, delay: sheetOut + lag + i * st, easing: INOUT, fill: 'forwards' }));
      heroIntro(sheetOut + lag + st * 2 + dur * 0.35);
      setTimeout(done, sheetOut + lag + st * 4 + dur + 40);
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
      [{ opacity: 0, scale: '.55', rotate: '-24deg' }, { opacity: 1, offset: 0.45 }, { opacity: 1, scale: '1', rotate: '0deg' }],
      { ...b, duration: 1000, delay: delay + 380, easing: 'cubic-bezier(.3,1.35,.5,1)' }));
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
        { ...b, duration: 700, delay: delay + 1100, easing: 'cubic-bezier(.4,0,.2,1)' });
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
  let busy = false;
  const ready = () => d.body.append(shutter);
  if (d.body) ready(); else d.addEventListener('DOMContentLoaded', ready, { once: true });

  const targetTop = el => {
    const pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0, m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, el.getBoundingClientRect().top + scrollY - pad - m);
  };
  const textOf = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('.chapter-no-sr,.bp-note,svg').forEach(n => n.remove()); c.querySelectorAll('br').forEach(n => n.replaceWith(' ')); return c.textContent.replace(/\s+/g, ' ').trim(); };

  d.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip') || a.target) return;
    const id = decodeURIComponent(a.hash.slice(1)), target = id && d.getElementById(id);
    if (!target || busy || !motion() || !canAnimate || html.classList.contains('ydx-loading')) return;
    if (Math.abs(targetTop(target) - scrollY) < innerHeight * 1.2) return;   // a short glide reads better than a cut
    e.preventDefault(); e.stopPropagation();                                 // Lenis listens on window, after us
    play(target);
  });

  async function play(target) {
    busy = true;
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
    const COVER = 220, REVEAL = 270, ST = 20;
    cols.forEach((c, i) => c.animate([{ transform: 'translate3d(0,101%,0)' }, { transform: 'translate3d(0,0,0)' }],
      { duration: COVER, delay: i * ST, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }));
    label.animate([{ opacity: 0, transform: 'translate3d(0,calc(-50% + 22px),0)' }, { opacity: 1, transform: 'translate3d(0,-50%,0)' }],
      { duration: 160, delay: COVER, easing: OUT, fill: 'forwards' });   // only once the plates have closed
    await wait(COVER + ST * 4 + 30);
    /* jump while covered */
    const top = targetTop(target), lenis = window.ffLenis;
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true }); else window.scrollTo({ top, behavior: 'instant' });
    if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); target.setAttribute('data-ydx-ft', ''); }
    try { target.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
    await wait(90);
    label.animate([{ opacity: 1, transform: 'translate3d(0,-50%,0)' }, { opacity: 0, transform: 'translate3d(0,calc(-50% - 26px),0)' }],
      { duration: 180, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    const anims = cols.map((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
      { duration: REVEAL, delay: 40 + i * ST, easing: INOUT, fill: 'forwards' }));
    await Promise.all(anims.map(a => a.finished.catch(() => {})));
    shutter.classList.remove('on');
    cols.concat(label).forEach(el => el.getAnimations().forEach(a => a.cancel()));
    busy = false;
  }

  /* ================= 3. reveals ================= */
  if (!motion() || !canAnimate || !('IntersectionObserver' in window)) return finishStatic();

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
      { duration: 1000, delay: i * 70, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => h.classList.remove('ydx-split-run'));
  };
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    if (en.target.classList.contains('ydx-split-wait')) playHead(en.target); else playEl(en.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  heads.forEach(h => h.classList.contains('ydx-split-wait') && io.observe(h));
  rvEls.forEach(el => el.classList.contains('ydx-rv-wait') && io.observe(el));

  /* footer colour bar */
  const foot = $('.site-footer');
  if (foot) new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { foot.classList.add('ydx-in'); o.disconnect(); } }, { threshold: 0.3 }).observe(foot);

  /* ================= 4. small things ================= */
  /* magnetic: the pill buttons and round arrows lean toward the pointer */
  if (fine.matches) $$('.pill-button, .round-link, .main-nav .nav-cta, .q-btn').forEach(el => {
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
