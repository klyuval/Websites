/* MyChef Israel, round 5: "Your turn, chef" — a plating toy on the MyChef table. Vanilla JS, no dependencies.
   Swoosh a sauce (spoon swoosh: thick where you start, tapering, thinner when fast), dot herb oil, scatter spice,
   drop pomegranate pearls, olives, lemon zest and the chef's ✳; turn the plate by grabbing it outside the rim (with
   inertia); "Surprise me" plates a dish with the same tools; "Serve" sends it to the pass and writes a ticket with
   the dish's name in the guest's language, which can be saved as an image or booked for real.
   Language: the site's localStorage['mychef-language'] (he / en / fr), switchable here with the site's cloth wipe.
   Keyboard: tools are toggle buttons; on the focused plate Enter/Space adds the selected ingredient, arrows turn it.
   Reduced motion: no spin inertia, no animated surprise, instant cloths. */
(() => {
  'use strict';
  const doc = document.documentElement, cls = doc.classList;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FRAME = window.self !== window.top;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CLOTH = 'cubic-bezier(.66,0,.22,1)', SETTLE = 'cubic-bezier(.2,.8,.2,1)';

  /* ------------------------------------------------------------------------------------------------- words */
  const T = {
    he: { doc: 'תורכם, שף — MyChef Israel', cover: 'תורכם, שף', skip: 'דלגו לכלים', home: 'MyChef Israel — חזרה לדף הבית',
      back: 'חזרה לשולחן', eyebrow: 'המטבח של MyChef · משחק קטן', t1: 'תורכם,', t2: 'שף.',
      lead: 'מושכים רוטב, מפזרים תבלין, מסובבים את הצלחת. כשזה נראה כמו ערב, שולחים להגשה.',
      how: 'גררו על הצלחת כדי לצייר · אחזו מחוץ לשוליים כדי לסובב', hint: 'משכו כאן רוטב', stage: 'השולחן',
      plate: 'צלחת', keys: 'Enter או רווח מוסיפים את הרכיב שנבחר, החצים מסובבים את הצלחת.', tools: 'הכלים',
      g_sauce: 'רטבים', g_spice: 'תבלינים', g_garnish: 'קישוט', undo: 'בטלו', clear: 'נקו את הצלחת',
      surprise: 'הפתיעו אותי', serve: 'להגשה', ticket: 'שולחן 1 · יוצא עכשיו', book: 'הזמינו את הדבר האמיתי',
      save: 'שמרו את הצלחת', again: 'צלחת חדשה', close: 'סגירה', added: '{x} על הצלחת', cleared: 'הצלחת נקייה',
      undone: 'בוטל', turned: 'הצלחת הסתובבה', by: 'נוצר על ידיכם · MyChef Israel',
      empty: 'צלחת ריקה. קונספטואלי מאוד.', and: ' ו',
      notes: ['יוהאן היה מגיש את זה.', 'נועז. נועז מאוד.', 'את זה מכניסים לתפריט.', 'האורחים כבר מוחאים כפיים.'] },
    en: { doc: 'Your turn, chef — MyChef Israel', cover: 'Your turn, chef', skip: 'Skip to the tools', home: 'MyChef Israel — home',
      back: 'Back to the table', eyebrow: 'The MyChef pass · a little game', t1: 'Your turn,', t2: 'chef.',
      lead: 'Swoosh a sauce, scatter the spice, turn the plate. When it looks like an evening, send it to the pass.',
      how: 'drag on the plate to paint · grab outside the rim to turn it', hint: 'swoosh a sauce here', stage: 'The table',
      plate: 'Plate', keys: 'Enter or Space adds the selected ingredient, the arrow keys turn the plate.', tools: 'Tools',
      g_sauce: 'sauces', g_spice: 'spices', g_garnish: 'garnish', undo: 'Undo', clear: 'Clear the plate',
      surprise: 'Surprise me', serve: 'Send to the pass', ticket: 'Table 1 · going out now', book: 'Book the real thing',
      save: 'Save the plate', again: 'Plate another', close: 'Close', added: '{x} on the plate', cleared: 'The plate is clean',
      undone: 'Undone', turned: 'Plate turned', by: 'Plated by you · MyChef Israel',
      empty: 'An empty plate. Very conceptual.', and: ' & ',
      notes: ['Yohann would serve this.', 'Bold. Very bold.', 'This one goes on the menu.', 'Your guests are already applauding.'] },
    fr: { doc: 'À vous, chef — MyChef Israel', cover: 'À vous, chef', skip: 'Aller aux outils', home: 'MyChef Israel — accueil',
      back: 'Retour à la table', eyebrow: 'Le passe de MyChef · un petit jeu', t1: 'À vous,', t2: 'chef.',
      lead: 'Tirez une sauce, parsemez les épices, tournez l’assiette. Quand ça ressemble à une soirée, envoyez au passe.',
      how: 'glissez sur l’assiette pour dresser · saisissez le bord pour la tourner', hint: 'une virgule de sauce ici', stage: 'La table',
      plate: 'Assiette', keys: 'Entrée ou Espace ajoute l’ingrédient choisi, les flèches tournent l’assiette.', tools: 'Outils',
      g_sauce: 'sauces', g_spice: 'épices', g_garnish: 'garniture', undo: 'Annuler', clear: 'Nettoyer l’assiette',
      surprise: 'Surprenez-moi', serve: 'Envoyer au passe', ticket: 'Table 1 · ça part', book: 'Réserver la vraie',
      save: 'Garder l’assiette', again: 'Une autre assiette', close: 'Fermer', added: '{x} dans l’assiette', cleared: 'L’assiette est propre',
      undone: 'Annulé', turned: 'Assiette tournée', by: 'Dressée par vous · MyChef Israel',
      empty: 'Une assiette vide. Très conceptuel.', and: ' et ',
      notes: ['Yohann la servirait.', 'Audacieux. Très audacieux.', 'Celle-ci entre à la carte.', 'Vos invités applaudissent déjà.'] }
  };

  /* ------------------------------------------------------------------------------------------------- tools */
  const ramekin = (c, d, h) => `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="33" r="27" fill="#efe6d2"/><circle cx="32" cy="33" r="27" fill="none" stroke="#d9ccb0" stroke-width="1.5"/><circle cx="32" cy="33" r="20.5" fill="${d}"/><circle cx="32" cy="32" r="19" fill="${c}"/><path d="M20 26c4-6 11-9 18-8" fill="none" stroke="${h}" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>`;
  const TOOLS = [
    { id: 'saffron', g: 'sauce', k: 'swoosh', c: '#efa41a', d: '#b97708', h: '#ffe3a0', icon: ramekin('#efa41a', '#b97708', '#ffe3a0'),
      n: { he: ['זעפרן', 'רוטב זעפרן'], en: ['Saffron', 'saffron beurre blanc'], fr: ['Safran', 'beurre blanc au safran'] } },
    { id: 'pom', g: 'sauce', k: 'swoosh', c: '#a8113b', d: '#6e0a26', h: '#ff8aa6', icon: ramekin('#a8113b', '#6e0a26', '#ff8aa6'),
      n: { he: ['רימון', 'ציר רימונים'], en: ['Pomegranate', 'pomegranate jus'], fr: ['Grenade', 'jus de grenade'] } },
    { id: 'herb', g: 'sauce', k: 'dots', c: '#5a8a24', d: '#3a5f14', h: '#c4e683', icon: ramekin('#5a8a24', '#3a5f14', '#c4e683'),
      n: { he: ['שמן ירוק', 'נקודות שמן עשבים'], en: ['Herb oil', 'herb oil'], fr: ['Huile verte', 'huile d’herbes'] } },
    { id: 'silan', g: 'sauce', k: 'swoosh', c: '#55210d', d: '#2b0f05', h: '#c27f4a', icon: ramekin('#55210d', '#2b0f05', '#c27f4a'),
      n: { he: ['סילאן', 'זיגוג סילאן'], en: ['Silan', 'silan glaze'], fr: ['Silan', 'laque de silan'] } },
    { id: 'turmeric', g: 'spice', k: 'dust', cols: ['#e39d12', '#f1b52b', '#cf870c', '#f6c650'], img: 'spice-1',
      n: { he: ['כורכום', 'אבקת כורכום'], en: ['Turmeric', 'turmeric dust'], fr: ['Curcuma', 'poussière de curcuma'] } },
    { id: 'paprika', g: 'spice', k: 'dust', cols: ['#b8301a', '#9c220e', '#d4462a', '#c23a1f'], img: 'spice-2',
      n: { he: ['פפריקה', 'פפריקה מעושנת'], en: ['Paprika', 'smoked paprika'], fr: ['Paprika', 'paprika fumé'] } },
    { id: 'cumin', g: 'spice', k: 'seeds', cols: ['#7a5a32', '#8f6c3d', '#5e4223', '#a0794a'], img: 'spice-3',
      n: { he: ['כמון', 'כמון קלוי'], en: ['Cumin', 'toasted cumin'], fr: ['Cumin', 'cumin torréfié'] } },
    { id: 'salt', g: 'spice', k: 'flakes', cols: ['#ffffff', '#f3f1ec', '#e6e3dc'], img: 'salt',
      n: { he: ['מלח', 'פתיתי מלח'], en: ['Salt', 'fleur de sel'], fr: ['Sel', 'fleur de sel'] } },
    { id: 'pearls', g: 'garnish', k: 'pearls', img: 'fruit-1',
      n: { he: ['פניני רימון', 'פניני רימון'], en: ['Pearls', 'pomegranate pearls'], fr: ['Perles', 'perles de grenade'] } },
    { id: 'olive', g: 'garnish', k: 'olive', img: 'olive',
      n: { he: ['זית', 'זיתים ועלים'], en: ['Olive', 'olives & leaves'], fr: ['Olive', 'olives et feuilles'] } },
    { id: 'zest', g: 'garnish', k: 'zest', img: 'fruit-3',
      n: { he: ['לימון', 'גרידת לימון'], en: ['Lemon zest', 'lemon zest'], fr: ['Zeste', 'zeste de citron'] } },
    { id: 'star', g: 'garnish', k: 'star', icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="#fffaf0"/><g stroke="#f5b72b" stroke-width="6" stroke-linecap="round"><path d="M32 16v32M16 32h32M21 21l22 22M21 43l22-22"/></g></svg>',
      n: { he: ['✳ של השף', 'הכוכבית של השף'], en: ['The ✳', 'the chef’s ✳'], fr: ['L’étoile', 'l’étoile du chef'] } }
  ];
  const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));

  let lang = /^(he|en|fr)$/.test(doc.lang) ? doc.lang : 'he';
  const L = () => T[lang];

  /* build the tool buttons */
  TOOLS.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pl-tool'; b.dataset.tool = t.id; b.setAttribute('aria-pressed', 'false');
    b.style.setProperty('--i', i);
    b.innerHTML = `<span class="pl-tool__obj">${t.icon || `<img src="/img/${t.img}.webp" alt="" decoding="async" draggable="false">`}</span><span class="pl-tool__name"></span>`;
    $(`.pl-grid[data-group="${t.g}"]`).appendChild(b);
  });

  function applyLang() {
    const w = L();
    doc.lang = lang; doc.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.title = w.doc;
    $$('[data-t]').forEach(el => { const k = el.getAttribute('data-t'); if (w[k] != null) el.textContent = w[k]; });
    $$('[data-t-label]').forEach(el => { const k = el.getAttribute('data-t-label'); if (w[k] != null) el.setAttribute('aria-label', w[k]); });
    $$('.pl-tool').forEach(b => { const t = TOOL[b.dataset.tool]; b.querySelector('.pl-tool__name').textContent = t.n[lang][0]; });
    $$('.pl-lang button').forEach(b => b.setAttribute('aria-pressed', String(b.lang === lang)));
    if (!ticket.hidden) fillTicket();
  }

  /* ------------------------------------------------------------------------------------------------- cloths */
  // The site's cloth wipe: saffron, pomegranate, linen, then teal sweep across in reading direction.
  function sweepIn(dir, word) {
    return new Promise(res => {
      const wrap = document.createElement('div');
      wrap.className = 'pl-cv pl-cv--live'; wrap.setAttribute('aria-hidden', 'true');
      wrap.style.cssText = 'display:block;position:fixed;inset:0;z-index:2147483000;overflow:hidden';
      wrap.innerHTML = '<i></i><i></i><i></i><i><b></b></i>';
      wrap.querySelector('b').textContent = word || '';
      document.body.appendChild(wrap);
      const bands = $$('i', wrap), off = innerWidth * 1.25 + 20;
      if (RM || !wrap.animate) { res(wrap); return; }
      const as = bands.map((b, i) => b.animate([{ transform: `translateX(${-dir * off}px)` }, { transform: 'none' }],
        { duration: 290, delay: i * 28, easing: CLOTH, fill: 'both' }));
      const wd = wrap.querySelector('b');
      wd.animate([{ opacity: 0, transform: `translateX(${-dir * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 174, easing: SETTLE, fill: 'both' });
      const safety = setTimeout(() => res(wrap), 700);
      as[3].finished.then(() => { clearTimeout(safety); res(wrap); }, () => res(wrap));
    });
  }
  function sweepOut(wrap, dir, dur = 290) {
    return new Promise(res => {
      const done = () => { wrap.remove(); res(); };
      if (RM || !wrap.animate) { wrap.animate ? wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).finished.then(done, done) : done(); return; }
      wrap.style.animation = 'none';
      const off = innerWidth * 1.25 + 20;
      const as = $$('i', wrap).map((b, i) => b.animate([{ transform: 'none' }, { transform: `translateX(${dir * off}px)` }],
        { duration: dur, delay: (3 - i) * 28, easing: CLOTH, fill: 'both' }));
      const safety = setTimeout(done, dur + 400);
      Promise.all(as.map(a => a.finished)).then(() => { clearTimeout(safety); done(); }, done);
    });
  }
  const readDir = l => (l === 'he' ? -1 : 1);

  /* arrival: the cover painted by the inline CSS sweeps off once the plate and fonts are ready */
  const cover = $('.pl-cv');
  const t0 = performance.now();
  let arrived = false;
  function arrive() {
    if (arrived) return; arrived = true;
    try { sessionStorage.setItem('ydx-seen', '1'); } catch (e) { /* fine */ }
    const go = () => { cls.add('pl-in'); cls.remove('pl-cover'); };
    if (!cover || getComputedStyle(cover).visibility === 'hidden') { if (cover) cover.remove(); go(); return; }
    cover.style.animation = 'none';
    go();
    sweepOut(cover, readDir(lang), FRAME ? 240 : 320).then(() => { if (!cls.contains('pl-touched')) nudge(); });
  }
  {
    const img = $('.pl-plate__img');
    const ready = Promise.all([
      document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => 0) : 0,
      img && img.decode ? img.decode().catch(() => 0) : 0
    ]);
    const MIN = RM ? 0 : FRAME ? 120 : cls.contains('pl-xfer') ? 260 : 700;
    const CAP = FRAME ? 380 : cls.contains('pl-xfer') ? 1400 : 2600;
    ready.then(() => setTimeout(arrive, Math.max(0, MIN - (performance.now() - t0))));
    setTimeout(arrive, CAP);
    addEventListener('pageshow', e => { if (e.persisted) { $$('.pl-cv--live').forEach(w => w.remove()); arrive(); } });
  }

  /* leaving: the cloths sweep in, then we navigate (the site's loader is the same teal cloth, so it reads as one) */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-leave]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    try { sessionStorage.setItem('ydx-seen', '1'); } catch (er) { /* fine */ }
    sweepIn(readDir(lang), 'mychef').then(() => { location.href = href; });
    setTimeout(() => { location.href = href; }, 1200);
  });

  /* language: same cloths, switch while covered */
  let switching = false;
  $$('.pl-lang button').forEach(b => b.addEventListener('click', () => {
    const nl = b.lang;
    if (nl === lang || switching) return;
    switching = true;
    try { localStorage.setItem('mychef-language', nl); } catch (e) { /* fine */ }
    const W = { he: 'עברית', en: 'English', fr: 'Français' };
    const hadFocus = document.activeElement === b;
    sweepIn(readDir(nl), W[nl]).then(w => {
      lang = nl; applyLang();
      requestAnimationFrame(() => sweepOut(w, readDir(nl)).then(() => {
        switching = false;
        if (hadFocus) { const nb = $(`.pl-lang button[lang="${nl}"]`); nb && nb.focus({ preventScroll: true }); }
      }));
    });
  }));

  /* ------------------------------------------------------------------------------------------------- plate */
  const plate = $('.pl-plate'), rotor = $('.pl-rotor');
  const cBase = $('.pl-c--base'), cTop = $('.pl-c--top');
  const xb = cBase.getContext('2d'), xt = cTop.getContext('2d');
  const live = $('#pl-live');
  const brush = $('.pl-brush');
  let S = 0, PX = 0;            // plate size in CSS px, canvas px
  let angle = 0, spin = 0;      // degrees, deg per ms
  let tool = 'saffron';
  const ops = [];
  const say = s => { live.textContent = ''; setTimeout(() => { live.textContent = s; }, 30); };

  function sizeCanvases() {
    const r = plate.getBoundingClientRect();
    const s = Math.round(r.width);
    if (!s || s === S) return;
    S = s;
    PX = Math.round(S * Math.min(2, devicePixelRatio || 1));
    cBase.width = cBase.height = cTop.width = cTop.height = PX;
    redraw();
  }
  new ResizeObserver(sizeCanvases).observe(plate);
  addEventListener('resize', sizeCanvases, { passive: true });

  // seeded random so a redraw (undo, resize) reproduces each op exactly
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const P = v => (v + 1) / 2 * PX;           // plate units (-1..1) -> canvas px
  const U = v => v / 2 * PX;                  // plate length -> px

  /* -- renderers. Each op has kind-specific "marks" (positions in plate units) appended as the hand moves. -- */
  function stampSauce(t, x, y, r) {
    const X = P(x), Y = P(y), R = U(r);
    xb.globalCompositeOperation = 'destination-over';   // the darker edge goes under everything already there
    xb.fillStyle = t.d; xb.beginPath(); xb.arc(X + R * .05, Y + R * .1, R * 1.07, 0, 6.2832); xb.fill();
    xb.globalCompositeOperation = 'source-over';
    xb.fillStyle = t.c; xb.beginPath(); xb.arc(X, Y, R, 0, 6.2832); xb.fill();
    // glossy streak, kept in the upper left of the sauce
    xt.globalAlpha = .14; xt.fillStyle = t.h;
    xt.beginPath(); xt.arc(X - R * .32, Y - R * .36, R * .34, 0, 6.2832); xt.fill();
    xt.globalAlpha = 1;
  }
  function dot(t, x, y, r) {
    const X = P(x), Y = P(y), R = U(r);
    xb.fillStyle = t.d; xb.beginPath(); xb.arc(X + R * .06, Y + R * .1, R * 1.06, 0, 6.2832); xb.fill();
    xb.fillStyle = t.c; xb.beginPath(); xb.arc(X, Y, R, 0, 6.2832); xb.fill();
    xt.globalAlpha = .55; xt.fillStyle = t.h; xt.beginPath(); xt.arc(X - R * .35, Y - R * .38, R * .28, 0, 6.2832); xt.fill(); xt.globalAlpha = 1;
  }
  function dust(t, m) {
    const [x, y, r, ci, a] = m;
    xt.globalAlpha = a; xt.fillStyle = t.cols[ci % t.cols.length];
    xt.beginPath(); xt.arc(P(x), P(y), Math.max(.6, U(r)), 0, 6.2832); xt.fill(); xt.globalAlpha = 1;
  }
  function seed(t, m) {
    const [x, y, r, ci, rot] = m;
    xt.save(); xt.translate(P(x), P(y)); xt.rotate(rot);
    xt.fillStyle = t.cols[ci % t.cols.length]; xt.beginPath(); xt.ellipse(0, 0, U(r) * 2.2, U(r), 0, 0, 6.2832); xt.fill();
    xt.strokeStyle = 'rgba(40,25,10,.45)'; xt.lineWidth = Math.max(.5, U(r) * .3);
    xt.beginPath(); xt.moveTo(-U(r) * 1.6, 0); xt.lineTo(U(r) * 1.6, 0); xt.stroke(); xt.restore();
  }
  function flake(t, m) {
    const [x, y, r, ci, rot] = m;
    xt.save(); xt.translate(P(x), P(y)); xt.rotate(rot);
    const R = Math.max(1, U(r));
    xt.fillStyle = 'rgba(255,255,255,.92)'; xt.strokeStyle = 'rgba(150,140,120,.55)'; xt.lineWidth = .8;
    xt.beginPath(); xt.moveTo(-R, -R * .6); xt.lineTo(R * .8, -R); xt.lineTo(R, R * .7); xt.lineTo(-R * .7, R); xt.closePath(); xt.fill(); xt.stroke();
    xt.restore(); void ci;
  }
  function pearl(m) {
    const [x, y, r] = m, X = P(x), Y = P(y), R = U(r);
    const g = xt.createRadialGradient(X - R * .3, Y - R * .35, R * .1, X, Y, R);
    g.addColorStop(0, '#ff6a86'); g.addColorStop(.45, '#c8123f'); g.addColorStop(1, '#6d0721');
    xt.fillStyle = 'rgba(60,0,15,.35)'; xt.beginPath(); xt.ellipse(X + R * .15, Y + R * .3, R * 1.02, R * .95, 0, 0, 6.2832); xt.fill();
    xt.fillStyle = g; xt.beginPath(); xt.ellipse(X, Y, R, R * .86, m[3], 0, 6.2832); xt.fill();
    xt.fillStyle = 'rgba(255,255,255,.85)'; xt.beginPath(); xt.arc(X - R * .35, Y - R * .35, R * .2, 0, 6.2832); xt.fill();
  }
  function olive(m) {
    const [x, y, r, rot, leaf] = m, X = P(x), Y = P(y), R = U(r);
    xt.save(); xt.translate(X, Y); xt.rotate(rot);
    if (leaf) {
      xt.fillStyle = '#5f7f34'; xt.beginPath(); xt.moveTo(-R * 2.4, 0);
      xt.quadraticCurveTo(0, -R * .95, R * 2.4, 0); xt.quadraticCurveTo(0, R * .95, -R * 2.4, 0); xt.fill();
      xt.strokeStyle = '#a9c07a'; xt.lineWidth = Math.max(.6, R * .12); xt.beginPath(); xt.moveTo(-R * 2.1, 0); xt.lineTo(R * 2.1, 0); xt.stroke();
    } else {
      const g = xt.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R * 1.3);
      g.addColorStop(0, '#6b4a5e'); g.addColorStop(.6, '#3a2232'); g.addColorStop(1, '#1d1018');
      xt.fillStyle = g; xt.beginPath(); xt.ellipse(0, 0, R * 1.3, R, 0, 0, 6.2832); xt.fill();
      xt.fillStyle = 'rgba(255,255,255,.55)'; xt.beginPath(); xt.ellipse(-R * .45, -R * .4, R * .32, R * .16, -.5, 0, 6.2832); xt.fill();
    }
    xt.restore();
  }
  function zest(m) {
    const [x, y, r, rot, bend] = m, R = U(r);
    xt.save(); xt.translate(P(x), P(y)); xt.rotate(rot);
    xt.strokeStyle = '#f2cf2e'; xt.lineCap = 'round'; xt.lineWidth = Math.max(1.2, R * .32);
    xt.beginPath(); xt.moveTo(-R * 1.6, 0); xt.quadraticCurveTo(0, R * bend, R * 1.6, 0); xt.stroke();
    xt.strokeStyle = 'rgba(255,250,200,.7)'; xt.lineWidth = Math.max(.5, R * .1);
    xt.beginPath(); xt.moveTo(-R * 1.3, -R * .08); xt.quadraticCurveTo(0, R * bend - R * .1, R * 1.3, -R * .08); xt.stroke();
    xt.restore();
  }
  function star(m) {
    const [x, y, r, rot] = m, R = U(r);
    xt.save(); xt.translate(P(x), P(y)); xt.rotate(rot);
    xt.strokeStyle = '#f5b72b'; xt.lineCap = 'round'; xt.lineWidth = R * .3;
    xt.shadowColor = 'rgba(120,70,0,.35)'; xt.shadowBlur = R * .2; xt.shadowOffsetY = R * .08;
    xt.beginPath();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; xt.moveTo(Math.cos(a) * R, Math.sin(a) * R); xt.lineTo(-Math.cos(a) * R, -Math.sin(a) * R); }
    xt.stroke(); xt.restore();
  }
  function drawMark(op, m) {
    const t = TOOL[op.tool];
    switch (t.k) {
      case 'swoosh': stampSauce(t, m[0], m[1], m[2]); break;
      case 'dots': dot(t, m[0], m[1], m[2]); break;
      case 'dust': dust(t, m); break;
      case 'seeds': seed(t, m); break;
      case 'flakes': flake(t, m); break;
      case 'pearls': pearl(m); break;
      case 'olive': olive(m); break;
      case 'zest': zest(m); break;
      case 'star': star(m); break;
    }
  }
  function redraw() {
    if (!PX) return;
    xb.clearRect(0, 0, PX, PX); xt.clearRect(0, 0, PX, PX);
    ops.forEach(op => op.marks.forEach(m => drawMark(op, m)));
    plate.classList.toggle('is-dirty', ops.length > 0);
    $('[data-act="undo"]').disabled = !ops.length;
  }

  /* -- the hand: a stroke turns pointer positions into marks for the current tool -- */
  function newOp(id) { const op = { tool: id, marks: [], seed: (Math.random() * 1e9) | 1 }; op.r = rng(op.seed); op.len = 0; op.lr = 0; ops.push(op); return op; }
  function addMark(op, m) { op.marks.push(m); drawMark(op, m); }
  const inPlate = (x, y) => x * x + y * y < .93 * .93;
  function strokeTo(op, x, y, vx) {
    // vx: hand speed in plate units per second
    const t = TOOL[op.tool], r = op.r;
    const prev = op.last;
    op.last = [x, y];
    if (!prev) { firstMark(op, x, y); return; }
    const dx = x - prev[0], dy = y - prev[1], d = Math.hypot(dx, dy);
    if (!d) return;
    const dir = Math.atan2(dy, dx);
    op.prevDir = op.prevDir == null ? dir : Math.atan2(Math.sin(op.prevDir) * .7 + Math.sin(dir) * .3, Math.cos(op.prevDir) * .7 + Math.cos(dir) * .3);
    if (t.k === 'swoosh') {
      // a spoon swoosh: a pool where the spoon lands, a tapering tail, thinner when the hand is fast
      const target = .07 * (.3 + .7 * Math.exp(-op.len * 2.4)) * Math.max(.5, Math.min(1.15, 1.25 - vx * .22));
      const steps = Math.ceil(d / .006);
      for (let i = 1; i <= steps; i++) {
        op.lr += (target - op.lr) * .18;
        const px = prev[0] + dx * i / steps, py = prev[1] + dy * i / steps;
        if (inPlate(px, py)) addMark(op, [px, py, op.lr]);
      }
      op.len += d;
      return;
    }
    op.acc = (op.acc || 0) + d;
    const gap = { dots: .085, dust: .02, seeds: .03, flakes: .035, pearls: .055, olive: .1, zest: .06, star: .2 }[t.k];
    while (op.acc >= gap) {
      op.acc -= gap;
      const k = 1 - op.acc / d, px = prev[0] + dx * k, py = prev[1] + dy * k;
      sprinkle(op, px, py, dir, false);
    }
    op.len += d;
  }
  /* the end of a spoon swoosh: the sauce is pulled out into a fine point in the direction of travel */
  function endStroke(op) {
    if (!op || TOOL[op.tool].k !== 'swoosh' || !op.last || op.prevDir == null) return;
    let [x, y] = op.last, r = op.lr;
    const n = Math.max(6, Math.round(r / .004));
    for (let i = 0; i < n && r > .0025; i++) {
      x += Math.cos(op.prevDir) * .006; y += Math.sin(op.prevDir) * .006;
      r *= .84;
      if (inPlate(x, y)) addMark(op, [x, y, r]);
    }
    op.prevDir = null;
  }
  function firstMark(op, x, y) {
    const t = TOOL[op.tool];
    if (t.k === 'swoosh') { op.lr = .082; if (inPlate(x, y)) addMark(op, [x, y, op.lr]); return; }
    sprinkle(op, x, y, op.r() * 6.28, true);
  }
  function sprinkle(op, x, y, dir, tap) {
    const t = TOOL[op.tool], r = op.r;
    const g = () => (r() + r() + r() - 1.5) / 1.5;          // ~gaussian -1..1
    const put = m => { if (inPlate(m[0], m[1])) addMark(op, m); };
    switch (t.k) {
      case 'dots': {
        op.n = (op.n || 0) + 1;
        const rr = tap ? .03 : Math.max(.009, .03 * Math.pow(.8, op.n - 1));   // a line of dots getting smaller
        put([x, y, rr]); break;
      }
      case 'dust': {
        const n = tap ? 70 : 14, spread = tap ? .07 : .045;
        for (let i = 0; i < n; i++) put([x + g() * spread, y + g() * spread, .002 + r() * .0045, (r() * 4) | 0, .45 + r() * .45]);
        break;
      }
      case 'seeds': {
        const n = tap ? 14 : 3;
        for (let i = 0; i < n; i++) put([x + g() * .05, y + g() * .05, .0055 + r() * .002, (r() * 4) | 0, r() * 6.28]);
        break;
      }
      case 'flakes': {
        const n = tap ? 12 : 3;
        for (let i = 0; i < n; i++) put([x + g() * .05, y + g() * .05, .004 + r() * .006, 0, r() * 6.28]);
        break;
      }
      case 'pearls': {
        const n = tap ? 5 : 1;
        for (let i = 0; i < n; i++) put([x + (tap ? g() * .04 : g() * .012), y + (tap ? g() * .04 : g() * .012), .024 + r() * .008, r() * 6.28]);
        break;
      }
      case 'olive': {
        op.n = (op.n || 0) + 1;
        put([x, y, .022, dir + g() * .5, op.n % 2 === 0 ? 1 : 0]);
        if (tap) put([x + .04, y - .02, .022, r() * 6.28, 1]);
        break;
      }
      case 'zest': {
        const n = tap ? 5 : 2;
        for (let i = 0; i < n; i++) put([x + g() * .03, y + g() * .03, .016 + r() * .008, r() * 6.28, (r() - .5) * 2]);
        break;
      }
      case 'star': put([x, y, .045 + r() * .01, r() * .8]); break;
    }
  }

  /* -- pointer on the plate: paint inside the rim, turn from outside it -- */
  const local = (cx, cy) => {
    const r = plate.getBoundingClientRect();
    let x = (cx - r.left - r.width / 2) / (r.width / 2), y = (cy - r.top - r.height / 2) / (r.height / 2);
    const a = -angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return { x: x * c - y * s, y: x * s + y * c, d: Math.hypot(x, y), ang: Math.atan2(y, x) * 180 / Math.PI };
  };
  let hand = null;
  const zoneTurn = d => d > .93;
  plate.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    stopAuto();
    const p = local(e.clientX, e.clientY);
    try { plate.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    cls.add('pl-touched');
    if (zoneTurn(p.d)) {
      hand = { turn: true, a0: p.ang, angle0: angle, lastA: p.ang, lastT: performance.now(), v: 0 };
      spin = 0; plate.classList.add('is-turning');
      e.preventDefault();
      return;
    }
    hand = { op: newOp(tool), lastT: performance.now(), lx: p.x, ly: p.y, v: 0 };
    strokeTo(hand.op, p.x, p.y, 0);
    redrawFlags(); e.preventDefault();
  });
  // the outer ring of the plate element is a grab zone only when the pointer is outside the painted disc
  plate.addEventListener('pointermove', e => {
    const p = local(e.clientX, e.clientY);
    if (!hand) { plate.classList.toggle('is-turn', zoneTurn(p.d)); moveBrush(e, p); return; }
    const now = performance.now(), dt = Math.max(1, now - hand.lastT);
    if (hand.turn) {
      let da = p.ang - hand.lastA; if (da > 180) da -= 360; if (da < -180) da += 360;
      angle += da; hand.v = hand.v * .6 + (da / dt) * .4; hand.lastA = p.ang; hand.lastT = now;
      setAngle();
      return;
    }
    const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ce of (ev.length ? ev : [e])) {
      const q = local(ce.clientX, ce.clientY);
      const v = Math.hypot(q.x - hand.lx, q.y - hand.ly) / (dt / 1000) / Math.max(1, ev.length);
      hand.v = hand.v * .7 + v * .3; hand.lx = q.x; hand.ly = q.y;
      strokeTo(hand.op, q.x, q.y, hand.v);
    }
    hand.lastT = now; moveBrush(e, p);
  });
  const endHand = () => {
    if (!hand) return;
    if (hand.turn) {
      plate.classList.remove('is-turning');
      spin = RM ? 0 : Math.max(-1.2, Math.min(1.2, hand.v));
      if (spin) kick();
    } else {
      const op = hand.op;
      endStroke(op);
      if (!op.marks.length) ops.splice(ops.indexOf(op), 1);
      else { say(L().added.replace('{x}', TOOL[op.tool].n[lang][1])); pulse(op.tool); }
      redrawFlags();
    }
    hand = null;
  };
  plate.addEventListener('pointerup', endHand);
  plate.addEventListener('pointercancel', endHand);
  plate.addEventListener('pointerleave', () => { brush.classList.remove('is-on'); });
  function moveBrush(e, p) {
    if (!FINE || e.pointerType !== 'mouse') return;
    const t = TOOL[tool];
    const on = !zoneTurn(p.d);
    brush.classList.toggle('is-on', on);
    if (!on) return;
    brush.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
  }
  function brushLook() {
    const t = TOOL[tool];
    const c = t.c || (t.cols ? t.cols[0] : { pearls: '#c8123f', olive: '#5f7f34', zest: '#f2cf2e', star: '#f5b72b' }[t.k]);
    brush.style.setProperty('--bc', c);
    brush.style.setProperty('--bs', ({ swoosh: 40, dots: 22, dust: 46, seeds: 40, flakes: 40, pearls: 22, olive: 30, zest: 30, star: 40 }[t.k] * (S || 500) / 560) + 'px');
  }
  function redrawFlags() {
    plate.classList.toggle('is-dirty', ops.length > 0);
    $('[data-act="undo"]').disabled = !ops.length;
  }

  /* plate turning with inertia */
  function setAngle() { rotor.style.setProperty('--a', angle.toFixed(2) + 'deg'); }
  let spinRaf = 0, spinLast = 0;
  function kick() {
    if (spinRaf) return;
    spinLast = performance.now();
    const f = now => {
      const dt = Math.min(40, now - spinLast); spinLast = now;
      angle += spin * dt; spin *= Math.pow(.9965, dt);
      setAngle();
      spinRaf = Math.abs(spin) > .002 ? requestAnimationFrame(f) : 0;
    };
    spinRaf = requestAnimationFrame(f);
  }

  /* keyboard on the plate */
  plate.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      angle += (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -15 : 15) * (doc.dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -1 : 1);
      setAngle(); say(L().turned); return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); stopAuto(); cls.add('pl-touched');
      const r = Math.random;
      const a = r() * 6.28, d = .15 + r() * .45;
      const op = newOp(tool), x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (TOOL[tool].k === 'swoosh') {
        const pts = arc(x, y, a + 1.8, .45 + r() * .2, .5 + r() * .5);
        pts.forEach((pt, i) => strokeTo(op, pt[0], pt[1], i ? 1.4 : 0));
        endStroke(op);
      } else firstMark(op, x, y);
      redrawFlags(); say(L().added.replace('{x}', TOOL[tool].n[lang][1])); pulse(tool);
    }
  });
  const arc = (x, y, dir, len, bend) => {
    const pts = [], n = 24;
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = dir + bend * (k - .5);
      pts.push([x + Math.cos(a) * len * k, y + Math.sin(a) * len * k]);
    }
    return pts;
  };

  /* tool selection */
  function selectTool(id, focus) {
    tool = id;
    $$('.pl-tool').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
    brushLook();
    if (focus) plate.focus({ preventScroll: true });
  }
  function pulse(id) {
    if (RM) return;
    const b = $(`.pl-tool[data-tool="${id}"]`);
    if (!b) return;
    b.classList.remove('is-pulse'); void b.offsetWidth; b.classList.add('is-pulse');
  }
  $('.pl-tools').addEventListener('click', e => {
    const b = e.target.closest('.pl-tool');
    if (!b) return;
    selectTool(b.dataset.tool);
    pulse(b.dataset.tool);
  });

  /* ------------------------------------------------------------------------------------------------- actions */
  let auto = null;
  function stopAuto() { if (auto) { auto.stop = true; auto = null; } }
  function clearPlate(animated) {
    stopAuto();
    if (!ops.length) return;
    const wipe = () => { ops.length = 0; redraw(); say(L().cleared); };
    if (RM || !animated || !cTop.animate) { wipe(); return; }
    // the napkin passes over the plate: the sauces fade and slide with it
    const a = [cBase, cTop].map(c => c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-8%) rotate(-6deg)' }],
      { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)' }));
    a[0].finished.then(wipe, wipe);
  }
  function surprise() {
    stopAuto(); clearPlate(false); cls.add('pl-touched');
    const r = Math.random, pick = a => a[(r() * a.length) | 0];
    const base = pick(['saffron', 'pom', 'silan']);
    const a0 = r() * 6.28;
    const steps = [];
    // 1. one or two swooshes
    const sw = arc(Math.cos(a0) * .42, Math.sin(a0) * .42, a0 + Math.PI * .72, .78, 1.1);
    steps.push({ tool: base, pts: sw });
    if (r() < .5) steps.push({ tool: pick(['saffron', 'pom', 'silan'].filter(x => x !== base)), pts: arc(Math.cos(a0 + 2.3) * .5, Math.sin(a0 + 2.3) * .5, a0 + 2.3 + Math.PI * .8, .42, .9) });
    // 2. herb oil dots along the swoosh
    const mid = sw[(sw.length * .35) | 0];
    steps.push({ tool: 'herb', pts: arc(mid[0] - .08, mid[1] + .14, a0 + 2.2, .36, .25) });
    // 3. garnish: pearls at the head, a spice, zest or olives, then the ✳
    steps.push({ tool: 'pearls', tap: [sw[3][0], sw[3][1]] });
    steps.push({ tool: pick(['paprika', 'turmeric', 'cumin', 'salt']), pts: arc(sw[12][0], sw[12][1], a0 + 2.6, .28, .4) });
    steps.push({ tool: pick(['zest', 'olive']), pts: arc(-sw[8][0] * .3, -sw[8][1] * .3 + .1, a0, .25, .6) });
    if (r() < .7) steps.push({ tool: 'star', tap: [sw[18][0] * .6, sw[18][1] * .6] });
    const job = auto = { stop: false };
    let i = 0;
    const next = () => {
      if (job.stop) return;
      const s = steps[i++];
      if (!s) { auto = null; selectTool(base); say(L().added.replace('{x}', dishName())); return; }
      selectTool(s.tool); pulse(s.tool);
      const op = newOp(s.tool);
      if (s.tap) { firstMark(op, s.tap[0], s.tap[1]); if (op.tool === 'pearls') sprinkle(op, s.tap[0] + .05, s.tap[1] + .03, 0, true); redrawFlags(); setTimeout(next, RM ? 0 : 260); return; }
      if (RM) { s.pts.forEach((pt, k) => strokeTo(op, pt[0], pt[1], k ? 1.2 : 0)); endStroke(op); redrawFlags(); next(); return; }
      let k = 0;
      const per = Math.max(1, Math.round(s.pts.length / 12));
      const tick = () => {
        if (job.stop) return;
        for (let j = 0; j < per && k < s.pts.length; j++, k++) strokeTo(op, s.pts[k][0], s.pts[k][1], k ? 1.3 : 0);
        redrawFlags();
        if (k < s.pts.length) requestAnimationFrame(tick); else { endStroke(op); setTimeout(next, 160); }
      };
      tick();
    };
    next();
  }

  /* the dish's name, from what is on the plate, in the guest's language */
  function dishName() {
    const seen = [];
    ops.forEach(o => { if (o.marks.length && !seen.includes(o.tool)) seen.push(o.tool); });
    if (!seen.length) return L().empty;
    const sauces = seen.filter(id => TOOL[id].g === 'sauce'), rest = seen.filter(id => TOOL[id].g !== 'sauce');
    const list = sauces.concat(rest).slice(0, 4).map(id => TOOL[id].n[lang][1]);
    const w = L();
    if (list.length === 1) return list[0];
    if (lang === 'he') return list.slice(0, -1).join(', ') + ' ו' + list[list.length - 1];
    return list.slice(0, -1).join(', ') + w.and + list[list.length - 1];
  }

  /* serve: the plate goes to the pass, a ticket comes back */
  const ticket = $('.pl-ticket');
  let noteIx = 0, lastFocus = null;
  function fillTicket() {
    const w = L();
    const empty = !ops.some(o => o.marks.length);
    $('.pl-ticket__dish').textContent = empty ? w.empty : dishName();
    $('.pl-ticket__note').textContent = empty ? w.by : w.notes[noteIx % w.notes.length];
    $('.pl-ticket__eyebrow').textContent = w.ticket;
  }
  function serve() {
    stopAuto();
    lastFocus = document.activeElement;
    noteIx = (Math.random() * 4) | 0;
    const r = plate.getBoundingClientRect();
    if (window.ydxLight) window.ydxLight.ting(r.left + r.width / 2, r.top + r.height / 2, 1.4);
    try { navigator.vibrate && navigator.vibrate(10); } catch (e) { /* fine */ }
    const open = () => {
      fillTicket(); ticket.hidden = false;
      $('.pl-ticket__dish').focus({ preventScroll: true });
    };
    if (RM || !plate.animate) { open(); return; }
    // a quarter turn and a lift, like a plate picked up at the pass
    const from = angle; angle += 90; setAngle();
    rotor.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${angle}deg)` }], { duration: 700, easing: SETTLE });
    plate.animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.04)', offset: .45 }, { transform: 'scale(.96)' }],
      { duration: 700, easing: SETTLE });
    setTimeout(open, 420);
  }
  function closeTicket(again) {
    ticket.hidden = true;
    if (again) { clearPlate(true); plate.focus({ preventScroll: true }); }
    else if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }
  ticket.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeTicket(false); }
    if (e.key === 'Tab') {   // keep focus on the ticket while it is up
      const f = $$('a,button,[tabindex="-1"]', ticket).filter(x => !x.disabled);
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });
  ticket.addEventListener('click', e => { if (e.target === ticket) closeTicket(false); });

  /* save the plate as a picture: the teal cloth, the turned plate, the name, the wordmark */
  async function savePlate() {
    const W = 1080, H = 1350, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    const [weave, plateImg] = await Promise.all([load('/img/weave.png'), load('/img/plate-empty.webp')]);
    x.fillStyle = '#0d635f'; x.fillRect(0, 0, W, H);
    if (weave) { x.fillStyle = x.createPattern(weave, 'repeat'); x.fillRect(0, 0, W, H); }
    x.strokeStyle = 'rgba(251,243,224,.32)'; x.setLineDash([7, 6]); x.lineWidth = 2; x.strokeRect(22, 22, W - 44, H - 44); x.setLineDash([]);
    const D = 820, cx = W / 2, cy = 560;
    x.save(); x.shadowColor = 'rgba(4,20,19,.55)'; x.shadowBlur = 50; x.shadowOffsetY = 26;
    x.beginPath(); x.arc(cx, cy, D / 2, 0, 6.2832); x.fillStyle = '#f4efe4'; x.fill(); x.restore();
    x.save(); x.beginPath(); x.arc(cx, cy, D / 2, 0, 6.2832); x.clip();
    x.translate(cx, cy); x.rotate(angle * Math.PI / 180);
    if (plateImg) x.drawImage(plateImg, -D / 2 - D * .0777, -D / 2 - D * .0751, D * 1.1542, D * 1.1542 * 900 / 876);
    x.drawImage(cBase, -D / 2, -D / 2, D, D); x.drawImage(cTop, -D / 2, -D / 2, D, D);
    x.restore();
    await (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('900 60px "Frank Ruhl Libre"'), document.fonts.load('600 40px Caveat')]).catch(() => 0) : 0);
    x.textAlign = 'center'; x.direction = lang === 'he' ? 'rtl' : 'ltr';
    x.fillStyle = '#fbf3e0';
    let name = $('.pl-ticket__dish').textContent || dishName();
    if (lang !== 'he') name = name.charAt(0).toUpperCase() + name.slice(1);
    // up to two centred lines, broken at a word, the type a little smaller if it still does not fit
    let fs = 58, lines = [name];
    const fit = () => {
      x.font = `900 ${fs}px "Frank Ruhl Libre", serif`;
      if (x.measureText(name).width <= W - 160) { lines = [name]; return true; }
      const words = name.split(' ');
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const w = Math.max(x.measureText(a).width, x.measureText(b).width);
        if (!best || w < best.w) best = { w, l: [a, b] };
      }
      if (best && best.w <= W - 160) { lines = best.l; return true; }
      return false;
    };
    while (!fit() && fs > 36) fs -= 2;
    lines.forEach((l, i) => x.fillText(l, W / 2, (lines.length > 1 ? 1072 : 1100) + i * fs * 1.08));
    x.fillStyle = '#f5b72b'; x.font = '600 40px Caveat, "Gveret Levin", cursive';
    x.fillText(L().by, W / 2, 1170);
    x.direction = 'ltr'; x.fillStyle = '#fbf3e0'; x.font = '900 52px "Frank Ruhl Libre", serif';
    x.fillText('mychef', W / 2 - 12, 1262); x.fillStyle = '#f5b72b'; x.font = '900 34px "Frank Ruhl Libre", serif';
    x.fillText('✳', W / 2 + 80, 1240);
    c.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'mychef-plate.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'undo': stopAuto(); ops.pop(); redraw(); say(L().undone); break;
      case 'clear': clearPlate(true); break;
      case 'surprise': surprise(); break;
      case 'serve': serve(); break;
      case 'close': closeTicket(false); break;
      case 'again': closeTicket(true); break;
      case 'save': savePlate(); break;
    }
  });

  /* first look: if nobody has touched the plate a moment after arriving, the chef's hand draws one swoosh */
  function nudge() {
    if (RM || ops.length || cls.contains('pl-touched')) return;
    setTimeout(() => {
      if (ops.length || cls.contains('pl-touched')) return;
      const op = newOp('saffron');
      const pts = arc(-.42, .3, -.55, .78, .5);
      let k = 0;
      const job = auto = { stop: false };
      const tick = () => {
        if (job.stop) return;
        for (let j = 0; j < 2 && k < pts.length; j++, k++) strokeTo(op, pts[k][0], pts[k][1], k ? 1.6 : 0);
        redrawFlags();
        if (k < pts.length) requestAnimationFrame(tick); else { endStroke(op); auto = null; }
      };
      tick();
    }, 900);
  }

  if (window.ydxLight && window.ydxLight.mood) window.ydxLight.mood('teal');
  addEventListener('load', () => { if (window.ydxLight && window.ydxLight.mood) window.ydxLight.mood('teal'); });

  applyLang();
  selectTool('saffron');
  sizeCanvases();
  redrawFlags();
})();
