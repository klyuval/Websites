/* PEEL CLUB · ydx enhancement layer
   1. curtain out (loader / arrival from a page transition): the can tops up, the tab pops, the sheet peels away
      on the site's own 14° "rip" angle with its pith + zest edge
   2. page transitions: a citrus wheel spins in from the click point, the field floods it, the next page peels open
   3. hero fizz trail, add-to-mix fizz burst
   4. reveal choreography (brand "squeeze" on headings, kicker wipes, staggered lineups), hero scroll scatter
   5. magnetic pills
   Vanilla, no dependencies. Loaded `async`: it may arrive before or after the site's bundle, so it waits for the
   parsed DOM itself and depends on nothing the bundle sets up. */
(() => {
  if (window.__ydxPeel) return; // included twice: run once
  window.__ydxPeel = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  function run() {
    const d = document.documentElement;
    const RM = matchMedia('(prefers-reduced-motion: reduce)');
    const FINE = matchMedia('(hover: hover) and (pointer: fine)');
    // motion tokens. OUT and IN_OUT are the site's own --out / --in-out; PEEL is the one curve of the layer's own
    // (a hard pull then a long settle, used for everything that peels or floods: the curtain, the wheel's flood).
    // FLOAT is only for fizz bubbles (they decelerate as they rise, never overshoot).
    const OUT = 'cubic-bezier(.16,1,.3,1)';
    const IN_OUT = 'cubic-bezier(.65,0,.35,1)';
    const PEEL = 'cubic-bezier(.7,0,.22,1)';
    const FLOAT = 'cubic-bezier(.3,.6,.4,1)';
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const ss = {
      get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
      set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    };
    const anim = (el, kf, opt) => { const a = el.animate(kf, opt); a.finished.catch(() => {}); return a; };
    d.classList.add('ydx-js');

    /* ---------------- 1. curtain out ---------------- */
    let releaseHold;
    const held = new Promise(r => { releaseHold = () => { d.classList.remove('ydx-hold'); r(); }; });
    const curtain = document.getElementById('ydx-curtain');
    // no curtain, or the inline safety net already took it away (slow network: this file arrived late) -> nothing to wait for.
    // Without this the reveals below would wait on `held` forever and the section headings would stay invisible.
    if (!curtain || curtain.dataset.out) releaseHold();
    else {
      const mode = d.dataset.ydx;
      const minMs = RM.matches ? 350 : ({ load: 1000, frame: 240, short: 300, nav: 90 }[mode] ?? 300);
      // time is counted from the curtain's first painted frame (set by the inline script), not from navigation start:
      // on a slow connection the CSS can block painting for seconds, and the curtain should still get its moment.
      // (In a background tab nothing is painted, so the inline script stamps it straight away instead.)
      const since = () => performance.now() - (window.__ydxT0 ?? performance.now());
      const loaded = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
      const hero = document.querySelector('main img[fetchpriority="high"]') || document.querySelector('main img');
      const heroReady = hero && hero.decode ? hero.decode().catch(() => {}) : Promise.resolve();
      const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
      // full load for a first visit; for quick modes only the fonts + lead image matter. Never wait past the cap.
      // Arriving from a page transition the cap is short: the visitor already watched the wheel, so the peel opens
      // promptly and the page's own drop-in covers an image that is still decoding.
      const gate = mode === 'load' ? Promise.race([loaded, Promise.all([fonts, heroReady])]) : Promise.all([fonts, heroReady]);
      const capMs = { load: 2600, frame: 260, nav: 320, short: 900 }[mode] ?? 900;
      const cap = wait(Math.max(0, capMs - since()));
      // whatever happens in leaveCurtain (a throw included), the curtain goes and the page's entrance is released
      const done = () => { curtain.remove(); releaseHold(); d.removeAttribute('data-ydx'); d.removeAttribute('data-ydx-label'); };
      Promise.race([gate, cap]).then(() => wait(Math.max(0, minMs - since()))).then(leaveCurtain).catch(() => {}).then(done);

      async function leaveCurtain() {
        if (curtain.dataset.out) return wait(320); // the inline safety net is already fading it: let it finish
        curtain.dataset.out = '1';
        ss.set('ydx-seen', '1');
        if (RM.matches) {
          releaseHold();
          await anim(curtain, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
          return;
        }
        if (mode === 'load' || mode === 'frame') { curtain.classList.add('ydx-done'); await wait(mode === 'frame' ? 70 : 260); }
        const sheet = curtain.querySelector('.ydx-sheet');
        const center = curtain.querySelector('.ydx-center');
        const dur = { frame: 360, load: 700, nav: 560 }[mode] ?? 620;
        curtain.style.pointerEvents = 'none';
        releaseHold();
        const a = anim(sheet, [{ transform: 'rotate(14deg) translateX(0)' }, { transform: 'rotate(14deg) translateX(134vmax)' }], { duration: dur, easing: PEEL, fill: 'forwards' });
        anim(center, [
          { transform: 'translate(-50%,-50%) rotate(-14deg)' },
          { transform: 'translate(-50%,-50%) rotate(-14deg) scale(.86,1.04)', offset: .35 },
          { transform: 'translate(-50%,-50%) rotate(-14deg) scale(1.08,.94)' },
        ], { duration: dur, easing: PEEL, fill: 'forwards' });
        await a.finished.catch(() => {});
      }
    }

    /* ---------------- 2. page transitions ---------------- */
    const NAMES = { '/': 'PEEL CLUB', '/flavors/': 'Flavors', '/story/': 'Our story', '/serve/': 'The good pour', '/mix/': 'Build a mix' };
    let leaving = null, goTimer = 0, stuckTimer = 0;
    const isFile = u => /\.(?!html?$)[a-z0-9]{2,5}$/i.test(u.pathname); // images, pdf, ...
    // an HTML <a> to another page of this site (SVG <a>.href is an object, not a URL string)
    const pageLink = a => {
      if (!(a instanceof HTMLAnchorElement) || a.hasAttribute('download')) return null;
      let u; try { u = new URL(a.href, location.href); } catch (err) { return null; }
      if (u.origin !== location.origin || !/^https?:$/.test(u.protocol) || isFile(u)) return null;
      // same page + any fragment, "#" included (its URL keeps the bare "#" but has an empty .hash): an in-page jump
      if (u.pathname === location.pathname && u.search === location.search && (u.hash || u.href.endsWith('#'))) return null;
      return u;
    };
    // a link to the page you are already on (the wordmark on /, "Build a mix" on /mix/, the bag's "Build your mix"):
    // the wheel used to play and reload the same page. Now whatever is open closes, the page glides back to the top
    // and the link gives the brand's squash as a "you're here".
    const isHere = u => u.pathname === location.pathname && u.search === location.search;
    function stayHere(a) {
      const open = [...document.querySelectorAll('dialog[open]')];
      open.forEach(dl => dl.close()); // the site's own close handler restarts Lenis and returns focus to the trigger
      const menu = document.querySelector('.header.menu-open .menu-toggle');
      if (menu) menu.click(); // closed through the site's own toggle, so its aria-expanded stays right
      if (!RM.matches && !a.closest('dialog')) anim(a, [{ scale: '1' }, { scale: '1.05 .95', offset: 0.3 }, { scale: '.98 1.02', offset: 0.65 }, { scale: '1' }], { duration: 460, easing: OUT });
      // Glide up once the page is still: the site's Lenis keeps writing its own position while it eases out a wheel
      // (up to a second, in sub-pixel steps that can look still), which would cancel a native smooth scroll. Lenis
      // marks that with `lenis-scrolling` on <html>. It is also stopped while a dialog is open and restarts on the
      // dialog's close event, so the first check waits a beat. Never waits more than 1.2s.
      const t0 = performance.now();
      let y = -1, still = 0;
      const settle = () => {
        still = scrollY === y && !d.classList.contains('lenis-scrolling') ? still + 1 : 0; y = scrollY;
        if (still < 2 && performance.now() - t0 < 1200) return requestAnimationFrame(settle);
        scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
      };
      setTimeout(settle, open.length ? 80 : 0);
    }
    // undo a leave whose navigation never committed (204 / Esc / stopped): the page must never stay covered
    const unleave = () => {
      clearTimeout(goTimer); clearTimeout(stuckTimer);
      const o = leaving; leaving = null;
      ss.set('ydx-nav', '');
      if (o) anim(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.catch(() => {}).then(() => o.remove());
    };

    function wheelSVG() {
      let lines = '';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        lines += `<line class="w-line" x1="${(Math.cos(a) * 12).toFixed(2)}" y1="${(Math.sin(a) * 12).toFixed(2)}" x2="${(Math.cos(a) * 85).toFixed(2)}" y2="${(Math.sin(a) * 85).toFixed(2)}"/>`;
      }
      return `<svg viewBox="-100 -100 200 200" aria-hidden="true"><circle class="w-rind" r="100"/><circle class="w-pith" r="92"/><circle class="w-flesh" r="85"/>${lines}<circle class="w-pith" r="12"/></svg>`;
    }

    function leave(url, x, y) {
      if (leaving) return;
      document.querySelectorAll('dialog[open]').forEach(dl => dl.close());
      const label = NAMES[url.pathname] || 'PEEL CLUB';
      ss.set('ydx-nav', JSON.stringify({ t: Date.now(), l: label, p: url.pathname })); // the next page shows the label only if it is this one
      const q = url.searchParams.get('flavor');
      const flavor = /^[0-3]$/.test(q || '') ? q : d.dataset.flavor || '0';
      const o = document.createElement('div');
      o.className = 'ydx-out';
      o.dataset.flavor = flavor;
      o.setAttribute('aria-hidden', 'true');
      leaving = o;
      // timers, not animation promises: those never settle in a background tab
      const go = () => { location.assign(url.href); stuckTimer = setTimeout(unleave, 5000); };
      if (RM.matches) {
        o.classList.add('ydx-out--calm');
        document.body.append(o);
        anim(o, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' });
        goTimer = setTimeout(go, 170);
        return;
      }
      const W = innerWidth, H = innerHeight;
      const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * 1.06; // reach the farthest corner
      const wheel = document.createElement('div');
      wheel.className = 'ydx-wheel';
      wheel.innerHTML = wheelSVG();
      const disk = document.createElement('div');
      disk.className = 'ydx-disk';
      for (const el of [wheel, disk]) Object.assign(el.style, { width: R * 2 + 'px', height: R * 2 + 'px', left: x - R + 'px', top: y - R + 'px' });
      const dest = document.createElement('p');
      dest.className = 'ydx-dest';
      dest.textContent = label;
      o.append(wheel, disk, dest);
      document.body.append(o);
      anim(wheel, [{ transform: 'scale(.02) rotate(-200deg)' }, { transform: 'scale(1) rotate(0deg)' }], { duration: 480, easing: IN_OUT, fill: 'forwards' });
      // the flood keeps its own curve, tuned by eye so the wheel reads before the field covers it (PEEL floods too
      // late and leaves the label over a half-covered wheel; OUT floods at once and hides the wheel)
      anim(disk, [{ transform: 'scale(0)' }, { transform: 'scale(1.02)' }], { duration: 300, delay: 220, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'both' });
      anim(dest, [{ opacity: 0, transform: 'scaleX(.6)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: 340, easing: OUT, fill: 'forwards' });
      goTimer = setTimeout(go, 540);
    }

    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self')) return;
      const url = pageLink(a);
      if (!url) return;
      e.preventDefault();
      if (isHere(url)) { if (!leaving) stayHere(a); return; }
      let x = e.clientX, y = e.clientY;
      if (!e.detail && !x && !y) { const r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; } // keyboard
      leave(url, x, y);
    });

    // our own transition replaces the cross-document view transition for intercepted clicks
    addEventListener('pageswap', e => {
      if (leaving && e.viewTransition) { e.viewTransition.ready?.catch(() => {}); e.viewTransition.finished?.catch(() => {}); e.viewTransition.skipTransition(); }
    });
    // back pressed mid-transition: the page can go into the back/forward cache with the navigation still pending,
    // and a later forward restore would fire it. Cancel it on the way out.
    addEventListener('pagehide', () => { clearTimeout(goTimer); clearTimeout(stuckTimer); });
    // back/forward cache: never come back to a covered page
    addEventListener('pageshow', e => {
      if (e.persisted) { leaving?.remove(); leaving = null; document.getElementById('ydx-curtain')?.remove(); releaseHold(); }
    });
    // Esc can stop a pending navigation: uncover the page
    addEventListener('keydown', e => { if (e.key === 'Escape' && leaving) unleave(); });

    // prefetch the next page on intent so the peel opens onto a ready page
    const fetched = new Set();
    const prefetch = e => {
      const a = e.target.closest && e.target.closest('a[href]');
      const u = a && pageLink(a);
      if (!u || u.pathname === location.pathname || fetched.has(u.pathname)) return;
      fetched.add(u.pathname);
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.pathname; document.head.append(l);
    };
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);

    /* ---------------- 3. fizz ---------------- */
    let fizzLayer, alive = 0;
    function bubble(x, y, color, { size = 9 + Math.random() * 22, rise = 80 + Math.random() * 120, drift = (Math.random() - 0.5) * 50, dur = 700 + Math.random() * 600, delay = 0 } = {}) {
      if (RM.matches || alive > 36) return;
      if (!fizzLayer) { fizzLayer = document.createElement('div'); fizzLayer.className = 'ydx-fizz'; fizzLayer.setAttribute('aria-hidden', 'true'); document.body.append(fizzLayer); }
      const b = document.createElement('i');
      b.style.width = b.style.height = size.toFixed(1) + 'px';
      b.style.color = color;
      fizzLayer.append(b);
      alive++;
      const sx = x - size / 2, sy = y - size / 2;
      anim(b, [
        { transform: `translate(${sx}px,${sy}px) scale(.3)`, opacity: 0 },
        { transform: `translate(${sx + drift * 0.3}px,${sy - rise * 0.25}px) scale(1)`, opacity: 0.9, offset: 0.2 },
        { transform: `translate(${sx + drift}px,${sy - rise}px) scale(1.1)`, opacity: 0 },
      ], { duration: dur, delay, easing: FLOAT }).finished.then(() => { b.remove(); alive--; }, () => { b.remove(); alive--; });
    }
    const zones = document.querySelectorAll('.hero, .chapter--zing');
    zones.forEach(z => {
      let lx = 0, ly = 0;
      z.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || !FINE.matches) return;
        if (Math.hypot(e.clientX - lx, e.clientY - ly) < 26) return;
        lx = e.clientX; ly = e.clientY;
        bubble(e.clientX, e.clientY, getComputedStyle(z).color);
      }, { passive: true });
      z.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || e.target.closest('a,button')) return;
        const c = getComputedStyle(z).color;
        for (let i = 0; i < 7; i++) bubble(e.clientX + (Math.random() - 0.5) * 30, e.clientY, c, { delay: i * 35 });
      }, { passive: true });
    });
    // "Add to your mix": a little burst of fizz out of the pill
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-add], #dialog-add');
      if (!b || b.disabled) return;
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      const c = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : cs.color;
      for (let i = 0; i < 9; i++) bubble(r.left + r.width * (0.2 + Math.random() * 0.6), r.top + 4, c, { size: 5 + Math.random() * 11, rise: 50 + Math.random() * 70, dur: 600 + Math.random() * 400, delay: i * 22 });
    });

    /* browser chrome follows the section under the header (field / pith / flip), not just the flavour */
    const theme = document.querySelector('meta[name="theme-color"]');
    const zonesAll = [...document.querySelectorAll('main [data-zone], .footer')];
    if (theme && zonesAll.length) {
      let tt = false;
      const sync = () => {
        tt = false;
        const y = 40;
        const z = zonesAll.find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
        if (!z) return;
        const bg = getComputedStyle(z).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && theme.content !== bg) theme.content = bg;
      };
      addEventListener('scroll', () => { if (!tt) { tt = true; requestAnimationFrame(sync); } }, { passive: true });
      document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-product],[data-recipe]')) setTimeout(sync, 1100); });
    }

    if (RM.matches) return; // everything below is motion only

    /* ---------------- 4. reveals ---------------- */
    // headings squeeze open from the condensed cut (the same gesture as the site's own hero + footer wordmark)
    const sq = [...document.querySelectorAll('main > :not(:first-child) h2.display > :is(.tight,.wide), .route-next a > :is(.tight,.wide), .peel-story__signoff > span')];
    // section kickers wipe in left-to-right
    const kick = [...document.querySelectorAll('.loose__copy > .label, .serve-preview__copy > .label, .manifesto > .label, .route-next > .label, .chapter-number, .stage__intro > .label')]
      .filter(el => !el.closest('main > :first-child'));
    // groups that rise in a stagger (individual `translate`, so the site's hover `transform`s stay intact)
    const groups = [...document.querySelectorAll('.serve-preview__glasses, .recipe-tabs, .minicrate, #mix-slots')];
    sq.forEach(el => el.classList.add('ydx-sq'));
    kick.forEach(el => el.classList.add('ydx-kick'));
    groups.forEach(el => el.classList.add('ydx-up'));

    const reveal = el => {
      if (el.classList.contains('ydx-in')) return;
      el.classList.add('ydx-in');
      if (el.classList.contains('ydx-sq')) {
        const sibs = [...el.parentElement.children].filter(s => s.classList.contains('ydx-sq'));
        const right = getComputedStyle(el).textAlign === 'right' || getComputedStyle(el.parentElement).textAlign === 'right';
        el.style.transformOrigin = right ? '100% 50%' : '0 50%';
        anim(el, [{ transform: 'scaleX(.58)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 950, delay: sibs.indexOf(el) * 110, easing: OUT, fill: 'backwards' });
      } else if (el.classList.contains('ydx-kick')) {
        anim(el, [{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 700, easing: IN_OUT, fill: 'backwards' });
      } else {
        const kids = [...el.children];
        const round = el.matches('.minicrate, #mix-slots');
        kids.forEach((k, i) => anim(k, round
          ? [{ scale: '.4', opacity: 0 }, { scale: '1.08', opacity: 1, offset: 0.6 }, { scale: '1', opacity: 1 }]
          : [{ translate: '0 36px', opacity: 0 }, { translate: '0 0', opacity: 1 }],
          { duration: round ? 520 : 800, delay: i * (round ? 28 : 80), easing: OUT, fill: 'backwards' }));
      }
    };
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      held.then(() => reveal(en.target));
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    [...sq, ...kick, ...groups].forEach(el => io.observe(el));
    // near the very bottom of a page the shrunken root margin can never be crossed: reveal whatever is on screen
    addEventListener('scroll', () => {
      if (innerHeight + scrollY < document.documentElement.scrollHeight - 4) return;
      held.then(() => document.querySelectorAll('.ydx-sq:not(.ydx-in), .ydx-kick:not(.ydx-in), .ydx-up:not(.ydx-in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) { io.unobserve(el); reveal(el); } }));
    }, { passive: true });

    /* hero scroll scatter: as the hero leaves, the can tips back and the fruit flies apart, the headline squeezes */
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      const half = heroEl.querySelector('.hero__bit--half'), wedge = heroEl.querySelector('.hero__bit--wedge');
      const bobs = heroEl.querySelectorAll('.hero__obj .bob');
      const ha = heroEl.querySelector('.hero__a'), hb = heroEl.querySelector('.hero__b');
      let ticking = false, last = -1;
      const paint = () => {
        ticking = false;
        const h = heroEl.offsetHeight || innerHeight;
        const p = Math.min(1, Math.max(0, scrollY / h));
        if (Math.abs(p - last) < 0.001) return;
        last = p;
        const e = p * p * (3 - 2 * p);
        if (half) { half.style.translate = `${(e * 9).toFixed(2)}vw ${(-e * 26).toFixed(2)}vh`; half.style.rotate = `${(e * 50).toFixed(1)}deg`; }
        if (wedge) { wedge.style.translate = `${(-e * 8).toFixed(2)}vw ${(-e * 16).toFixed(2)}vh`; wedge.style.rotate = `${(-e * 40).toFixed(1)}deg`; }
        bobs.forEach(b => { b.style.rotate = `${(-e * 9).toFixed(2)}deg`; b.style.scale = (1 - e * 0.08).toFixed(3); });
        if (ha) ha.style.scale = `${(1 - e * 0.22).toFixed(3)} 1`;
        if (hb) hb.style.scale = `${(1 - e * 0.22).toFixed(3)} 1`;
      };
      // paint() bails out once the hero is fully scrolled past (p stays clamped at 1), so this costs nothing further down
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
      paint();
    }

    /* scroll-reactive citrus: the story wheel turns and the manifesto wedge tips with the scroll (individual `rotate`,
       layered on top of the site's own slow spin / rock keyframes, which use `transform`) */
    const spinners = [
      ...[...document.querySelectorAll('.chapter__wheel')].map(el => ({ el, box: el.parentElement, deg: 120, y: 0 })),
      ...[...document.querySelectorAll('.manifesto__bit')].map(el => ({ el, box: el, deg: 28, y: 8 })),
      ...[...document.querySelectorAll('.stage__half')].map(el => ({ el, box: el.parentElement, deg: 36, y: 0 })),
    ];
    if (spinners.length) {
      let tick = false;
      const spin = () => {
        tick = false;
        const vh = innerHeight;
        for (const s of spinners) {
          const r = s.box.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100 || !r.height) continue;
          const p = (vh - r.top) / (vh + r.height) - 0.5; // -0.5 entering … 0.5 leaving
          s.el.style.rotate = `${(p * s.deg).toFixed(2)}deg`;
          if (s.y) s.el.style.translate = `0 ${(-p * s.y).toFixed(2)}vh`;
        }
      };
      addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(spin); } }, { passive: true });
      spin();
    }

    /* ---------------- 5. magnetic pills (mouse only) ---------------- */
    if (FINE.matches) {
      document.querySelectorAll('.button, .bag-trigger').forEach(btn => {
        btn.addEventListener('pointermove', e => {
          if (e.pointerType !== 'mouse') return;
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          btn.style.translate = `${(dx * 7).toFixed(1)}px ${(dy * 5).toFixed(1)}px`;
        });
        btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
      });
    }
  }
})();
