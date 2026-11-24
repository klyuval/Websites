/* ydx r5: the Fizz Lab (/fizz-lab/). Vanilla JS, no dependencies.
 *
 *  - The shelf: 14 of the site's own cut-outs (citrus, orchard fruit, botanicals). Drag one into the glass (mouse/pen),
 *    or tap / press Enter to drop it in from above. Each one splashes, sinks, bobs back up and colours the soda.
 *  - The glass: a 2D canvas in the site's line-art style (green ink, cream highlights, like the loader's can). The surface
 *    is a spring chain (it sloshes and ripples), bubbles nucleate on the bottom and on the fruit and pop at the top.
 *    Drag the glass sideways to shake it: pressure builds, and on release it pops in a foam eruption. "Shake it" does
 *    the same for keyboard and switch users.
 *  - The page's komorebi light takes the colour of the blend, and its fizz follows the glass.
 *  - The recipe card names the blend and finds the closest club soda; "Add a six-pack" puts it in the real sample bag
 *    (the app's own localStorage basket format, so the bag shows it when you go back).
 *  Reduced motion: no sloshing, no autonomous bubbles, ingredients settle at once; everything still works.
 */
(() => {
  'use strict';
  const html = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches;
  // the glass only goes static for reduced motion; "Pause light" pauses the background light, not the toy
  const still = () => reduced();
  const $ = (s, r = document) => r.querySelector(s);
  const EASE_PEEL = 'cubic-bezier(.65,0,.25,1)';

  /* ---------------------------------------------------------------- data */
  const ING = [
    { id: 'blood-orange', name: 'Blood orange', img: 'blood-orange-half-s', col: '#d8452f', g: 'Citrus', w: 1, sz: 1 },
    { id: 'lemon', name: 'Lemon', img: 'lemon-basil-half-s', col: '#f2d23c', g: 'Citrus', w: 1, sz: 1 },
    { id: 'pink-grapefruit', name: 'Pink grapefruit', img: 'pink-grapefruit-wedge-s', col: '#ef8a8c', g: 'Citrus', w: 1, sz: 1.05 },
    { id: 'mandarin', name: 'Mandarin', img: 'mandarin-segments-s', col: '#f49a2c', g: 'Citrus', w: 1, sz: 1.05 },
    { id: 'yuzu', name: 'Yuzu', img: 'yuzu-ginger-half-s', col: '#e6c43a', g: 'Citrus', w: 1, sz: 1 },
    { id: 'cherry', name: 'Cherry', img: 'cherry-lime-cherries-s', col: '#a3213f', g: 'Orchard', w: 1.1, sz: .9 },
    { id: 'lime', name: 'Lime', img: 'cherry-lime-limehalf-s', col: '#93bd45', g: 'Orchard', w: .8, sz: .95 },
    { id: 'peach', name: 'Peach', img: 'peach-verbena-slices-s', col: '#f29f76', g: 'Orchard', w: 1, sz: 1 },
    { id: 'pineapple', name: 'Pineapple', img: 'pineapple-mint-slice-s', col: '#f3c94a', g: 'Orchard', w: 1, sz: 1 },
    { id: 'basil', name: 'Basil', img: 'lemon-basil-basil-s', col: '#4f8f3c', g: 'Botanicals', w: .35, sz: 1, herb: 1 },
    { id: 'mint', name: 'Mint', img: 'pineapple-mint-mint-s', col: '#3c9a68', g: 'Botanicals', w: .35, sz: 1, herb: 1 },
    { id: 'verbena', name: 'Lemon verbena', img: 'peach-verbena-verbena-s', col: '#86a85a', g: 'Botanicals', w: .3, sz: 1.1, herb: 1 },
    { id: 'rosemary', name: 'Rosemary', img: 'blood-orange-rosemary-s', col: '#5f7d55', g: 'Botanicals', w: .3, sz: 1.15, herb: 1 },
    { id: 'ginger', name: 'Ginger', img: 'yuzu-ginger-ginger-s', col: '#d9b46a', g: 'Botanicals', w: .45, sz: .95, herb: 1 }
  ];
  const BY = Object.fromEntries(ING.map((i) => [i.id, i]));
  const CLUB = [
    { id: 'blood-orange', name: 'Blood Orange', set: ['blood-orange', 'rosemary'] },
    { id: 'lemon-basil', name: 'Lemon & Basil', set: ['lemon', 'basil'] },
    { id: 'pink-grapefruit', name: 'Pink Grapefruit', set: ['pink-grapefruit'] },
    { id: 'mandarin', name: 'Mandarin', set: ['mandarin'] },
    { id: 'yuzu-ginger', name: 'Yuzu & Ginger', set: ['yuzu', 'ginger'] },
    { id: 'cherry-lime', name: 'Cherry & Lime', set: ['cherry', 'lime'] },
    { id: 'peach-verbena', name: 'Peach & Verbena', set: ['peach', 'verbena'] },
    { id: 'pineapple-mint', name: 'Pineapple & Mint', set: ['pineapple', 'mint'] }
  ];
  const FIZZ = ['Still', 'Lightly sparkling', 'Sparkling', 'Wild fizz'];
  const BAG_KEY = 'peel-club-agrumea:sample-basket:v1'; // the app's own basket (array of {id, quantity}, 1..12 each)

  /* ---------------------------------------------------------------- colour */
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const gam = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const WATER = hex('#f3e4b4');

  /* ---------------------------------------------------------------- state */
  const blend = new Map();          // id -> count
  let order = [];                   // most recent last
  let fizzLevel = 2, pressure = 0, liquid = WATER.slice(), liquidT = WATER.slice();
  let field = null;

  /* ---------------------------------------------------------------- shelf */
  const shelf = $('[data-shelf]');
  const groups = {};
  ING.forEach((it) => {
    if (!groups[it.g]) {
      const g = document.createElement('div'); g.className = 'lab-group';
      g.innerHTML = `<span class="lab-group__t">${it.g}</span><div class="lab-group__row"></div>`;
      shelf.appendChild(g); groups[it.g] = g.lastElementChild;
    }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lab-ing'; b.dataset.id = it.id;
    b.setAttribute('aria-label', `Add ${it.name.toLowerCase()}`);
    b.innerHTML = `<img src="/img/${it.img}.webp" alt="" width="74" height="64" decoding="async" draggable="false"><span class="tag">${it.name}</span>`;
    groups[it.g].appendChild(b);
  });
  const imgs = {};
  ING.forEach((it) => { const im = new Image(); im.decoding = 'async'; im.src = `/img/${it.img}.webp`; imgs[it.id] = im; });

  /* ---------------------------------------------------------------- glass canvas */
  const stage = $('[data-stage]'), cv = $('[data-glass]'), ctx = cv.getContext('2d');
  let W = 400, H = 560, dpr = 1, G = null;      // G = glass geometry
  const N = 34;                                // surface springs
  const sh = new Float32Array(N), sv = new Float32Array(N);
  let sprites = [], bubbles = [], pops = [], foam = [], drops = [];
  let gx = 0, gvx = 0, tilt = 0, shaking = false, shakeAuto = 0, lastPX = 0, lastPT = 0;

  function geom() {
    const r = stage.getBoundingClientRect();
    W = Math.max(200, r.width); H = Math.max(260, r.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const gh = Math.min(H * 0.86, W * 1.35), gw = gh * 0.62;
    const top = (H - gh) * 0.42, bot = top + gh;
    G = { cx: W / 2, top, bot, wt: gw / 2, wb: gw * 0.4, gh, scale: gh / 520 };
  }
  const halfAt = (y) => { const k = Math.max(0, Math.min(1, (y - G.top) / (G.bot - G.top))); return G.wt + (G.wb - G.wt) * k - 7 * G.scale; };
  const level = () => G.top + G.gh * (0.34 - Math.min(0.12, sprites.length * 0.014));
  const surfX = (i) => G.cx - halfAt(level()) + (2 * halfAt(level())) * (i / (N - 1));
  function surfY(x) {
    const hw = halfAt(level()), u = (x - (G.cx - hw)) / (2 * hw) * (N - 1);
    const i = Math.max(0, Math.min(N - 2, Math.floor(u))), f = Math.max(0, Math.min(1, u - i));
    return level() + sh[i] * (1 - f) + sh[i + 1] * f + tilt * (x - G.cx);
  }
  function kick(x, v, spread) {
    for (let i = 0; i < N; i++) { const d = (surfX(i) - x) / (spread || 40); sv[i] += v * Math.exp(-d * d); }
  }

  /* ---------------------------------------------------------------- adding */
  function add(id, atX) {
    const it = BY[id]; if (!it) return;
    blend.set(id, (blend.get(id) || 0) + 1);
    order = order.filter((x) => x !== id).concat(id);
    const size = 78 * G.scale * it.sz * (W < 420 ? 0.92 : 1);
    const x = atX == null ? G.cx + (Math.random() - 0.5) * halfAt(G.top) : Math.max(G.cx - halfAt(G.top) + size * 0.4, Math.min(G.cx + halfAt(G.top) - size * 0.4, atX));
    const s = { id, img: imgs[id], x, y: G.top - size * 1.2, vx: (Math.random() - 0.5) * 30, vy: 60, a: (Math.random() - 0.5) * 0.8, va: (Math.random() - 0.5) * 3, r: size / 2, herb: !!it.herb, fade: 1, wet: false };
    if (still()) { s.y = level() + s.r * (s.herb ? 0.2 : 0.55); s.vy = 0; s.va = 0; s.wet = true; }
    sprites.push(s);
    if (sprites.filter((p) => p.fade === 1).length > 9) { const old = sprites.find((p) => p.fade === 1); if (old) old.fade = 0.99; } // the oldest dissolves
    retint(); render(); announce(`Added ${it.name.toLowerCase()}.`);
    const btn = shelf.querySelector(`[data-id="${id}"]`);
    if (btn) btn.dataset.n = blend.get(id);
    hint(false);
    wake();
  }
  function addIce() {
    const size = 46 * G.scale;
    sprites.push({ id: 'ice', ice: true, x: G.cx + (Math.random() - 0.5) * halfAt(G.top), y: still() ? level() + size * 0.2 : G.top - size, vx: 0, vy: still() ? 0 : 80, a: Math.random(), va: (Math.random() - 0.5) * 2, r: size / 2, fade: 1, wet: still() });
    if (sprites.filter((p) => p.ice && p.fade === 1).length > 4) { const o = sprites.find((p) => p.ice && p.fade === 1); if (o) o.fade = 0.99; }
    announce('Added ice.'); hint(false); wake();
  }
  function empty() {
    blend.clear(); order = [];
    sprites.forEach((s) => { if (s.fade === 1) s.fade = 0.99; });
    shelf.querySelectorAll('[data-n]').forEach((b) => b.removeAttribute('data-n'));
    pressure = 0; retint(); render(); announce('The glass is empty.');
    if (!still()) kick(G.cx, -260, 120);
    wake();
  }

  /* ---------------------------------------------------------------- blend colour + recipe card */
  function retint() {
    let tot = 0; const acc = [0, 0, 0]; let n = 0;
    blend.forEach((c, id) => { const it = BY[id], w = it.w * c, rgb = hex(it.col); n += c; tot += w; for (let k = 0; k < 3; k++) acc[k] += lin(rgb[k]) * w; });
    if (!tot) liquidT = WATER.slice();
    else {
      const strength = 1 - Math.pow(0.3, Math.min(6, tot));
      liquidT = [0, 1, 2].map((k) => gam(lin(WATER[k]) * (1 - strength) + (acc[k] / tot) * strength));
    }
    if (still()) liquid = liquidT.slice();   // no easing without motion
  }
  const nameEl = $('[data-name]'), subEl = $('[data-sub]'), listEl = $('[data-list]'), matchEl = $('[data-match]');
  const matchLink = $('[data-match-link]'), matchName = $('[data-match-name]'), matchImg = $('[data-match-img]'), addBtn = $('[data-add]'), addedEl = $('[data-added]');
  let match = null;
  function blendName() {
    if (!blend.size) return 'Sparkling water';
    // most of it first; ties go to the most recent
    const rank = (a, b) => blend.get(b) - blend.get(a) || order.indexOf(b) - order.indexOf(a);
    const fruit = order.filter((id) => !BY[id].herb).sort(rank);
    const herb = order.filter((id) => BY[id].herb).sort(rank);
    const nm = (id) => BY[id].name.replace(/^Lemon verbena$/, 'Verbena').replace(/ (\w)/g, (m, c) => ' ' + c.toUpperCase());
    const parts = fruit.slice(0, 2).map(nm).concat(herb.slice(0, 1).map(nm));
    if (parts.length === 1) return parts[0] + (fruit.length ? ' soda' : ' tonic');
    return parts.slice(0, -1).join(', ') + ' & ' + parts[parts.length - 1];
  }
  function render() {
    nameEl.textContent = blendName();
    const n = [...blend.values()].reduce((a, b) => a + b, 0);
    subEl.textContent = n ? `${FIZZ[fizzLevel]} · ${n} ${n === 1 ? 'ingredient' : 'ingredients'}${sprites.some((s) => s.ice && s.fade === 1) ? ' · on ice' : ''}` : 'Nothing in it yet. Pick something from the shelf.';
    listEl.textContent = '';
    order.slice().reverse().forEach((id) => { const li = document.createElement('li'); li.innerHTML = '<span></span><span></span>'; li.firstChild.textContent = BY[id].name; li.lastChild.textContent = '× ' + blend.get(id); listEl.appendChild(li); });
    // closest club soda: share of the soda's ingredients present, weighted by how much of them is in the glass
    let best = null, bs = 0;
    CLUB.forEach((c) => {
      const hit = c.set.reduce((a, id) => a + (blend.has(id) ? 1 + Math.min(2, blend.get(id)) * 0.15 : 0), 0) / c.set.length;
      const recency = c.set.reduce((a, id) => Math.max(a, order.indexOf(id)), -1) * 0.001;
      if (hit + recency > bs) { bs = hit + recency; best = c; }
    });
    if (best && bs >= 0.45) {
      if (!match || match.id !== best.id) { addedEl.textContent = ''; }
      match = best;
      matchEl.hidden = false;
      matchLink.href = '/sodas/' + best.id; matchName.textContent = best.name;
      matchImg.src = `/img/can-${best.id}-front-s.webp`;
      addBtn.setAttribute('aria-label', `Add a ${best.name} six-pack to your sample bag`);
    } else { match = null; matchEl.hidden = true; }
    if (field) field.redraw();
  }
  addBtn.addEventListener('click', () => {
    if (!match) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(BAG_KEY) || '[]'); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
    list = list.filter((x) => x && typeof x === 'object' && typeof x.id === 'string' && Number.isInteger(x.quantity) && x.quantity >= 1 && x.quantity <= 12);
    const row = list.find((x) => x.id === match.id);
    if (row) row.quantity = Math.min(12, row.quantity + 1); else list.push({ id: match.id, quantity: 1 });
    let ok = true;
    try { localStorage.setItem(BAG_KEY, JSON.stringify(list)); } catch (e) { ok = false; }
    addedEl.textContent = ok ? `${match.name} is in your sample bag. It’s waiting back at the club.` : 'Your browser kept the bag closed (storage is off). Add it from the soda’s page instead.';
    if (ok) { pop(1.1); if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} }
  });

  /* ---------------------------------------------------------------- live region */
  const live = $('[data-live]'); let liveT = 0, liveMsg = '';
  function announce(msg) {
    liveMsg = msg;
    clearTimeout(liveT);
    liveT = setTimeout(() => { live.textContent = `${liveMsg} Your blend: ${blendName()}${blend.size ? ', ' + FIZZ[fizzLevel].toLowerCase() : ''}.${match ? ' Closest club soda: ' + match.name + '.' : ''}`; }, 450);
  }

  /* ---------------------------------------------------------------- controls */
  const fizzIn = $('[data-fizz]'), fizzOut = $('[data-fizz-out]');
  fizzIn.addEventListener('input', () => {
    fizzLevel = +fizzIn.value; fizzOut.textContent = FIZZ[fizzLevel]; fizzIn.setAttribute('aria-valuetext', FIZZ[fizzLevel]);
    render(); wake();
  });
  $('[data-shake]').addEventListener('click', () => {
    if (still()) { pop(1); return; }
    shakeAuto = 1; wake();
  });
  $('[data-ice]').addEventListener('click', addIce);
  $('[data-empty]').addEventListener('click', empty);
  const hintEl = $('[data-hint]');
  function hint(on) { hintEl.classList.toggle('is-gone', !on); }

  /* ---- shelf: click adds; mouse/pen drag drops where you let go */
  let drag = null;
  shelf.addEventListener('click', (e) => {
    const b = e.target.closest('.lab-ing'); if (!b) return;
    if (b.dataset.dragged) { delete b.dataset.dragged; return; }
    add(b.dataset.id);
  });
  shelf.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.lab-ing');
    if (!b || e.pointerType === 'touch' || e.button !== 0) return;
    drag = { b, x0: e.clientX, y0: e.clientY, ghost: null, id: e.pointerId };
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) {
      const g = document.createElement('img'); g.className = 'lab-ghost'; g.alt = ''; g.setAttribute('aria-hidden', 'true');
      g.src = drag.b.querySelector('img').src; document.body.appendChild(g); drag.ghost = g; drag.b.classList.add('is-dragging');
    }
    if (drag.ghost) {
      drag.ghost.style.transform = `translate3d(${e.clientX - 48}px, ${e.clientY - 42}px, 0) rotate(${(e.clientX - drag.x0) * 0.04}deg)`;
      const r = stage.getBoundingClientRect();
      stage.classList.toggle('is-target', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
    }
  }, { passive: true });
  addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.ghost) return;
    d.b.dataset.dragged = '1'; setTimeout(() => delete d.b.dataset.dragged, 0);
    d.b.classList.remove('is-dragging'); stage.classList.remove('is-target');
    const r = stage.getBoundingClientRect();
    const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    if (inside) { d.ghost.remove(); add(d.b.dataset.id, e.clientX - r.left - gx); }
    else if (d.ghost.animate && !reduced()) {
      const br = d.b.getBoundingClientRect();
      d.ghost.animate([{ transform: d.ghost.style.transform }, { transform: `translate3d(${br.left + br.width / 2 - 48}px, ${br.top + 30 - 42}px, 0) scale(.8)`, opacity: 0.2 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }).finished.then(() => d.ghost.remove(), () => d.ghost.remove());
    } else d.ghost.remove();
  });

  /* ---- glass: drag sideways to shake */
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || still()) return;
    shaking = true; stage.classList.add('is-shaking'); stage.setPointerCapture(e.pointerId);
    lastPX = e.clientX; lastPT = performance.now(); hint(false); wake();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!shaking) return;
    const t = performance.now(), dt = Math.max(8, t - lastPT);
    const dx = e.clientX - lastPX, v = dx / dt * 1000;
    gvx += (v - gvx) * 0.5; lastPX = e.clientX; lastPT = t;
    gx = Math.max(-70, Math.min(70, gx + dx * 0.8));
  });
  const endShake = () => {
    if (!shaking) return;
    shaking = false; stage.classList.remove('is-shaking');
    if (pressure > 0.4) pop(pressure);
  };
  stage.addEventListener('pointerup', endShake);
  stage.addEventListener('pointercancel', endShake);
  stage.addEventListener('lostpointercapture', endShake);

  /* ---------------------------------------------------------------- pop: the fizz eruption */
  function pop(p) {
    const sr = stage.getBoundingClientRect();
    if (field) field.burst(sr.left + G.cx + gx, sr.top + G.top, 1);
    if (still()) { announce('Pop! Extra fizz.'); pressure = 0; return; }
    const hw = halfAt(level());
    for (let i = 0; i < 26 + p * 30; i++) {
      foam.push({ x: G.cx + (Math.random() - 0.5) * hw * 1.8, y: surfY(G.cx), vx: (Math.random() - 0.5) * 160, vy: -(220 + Math.random() * 380 * p), r: (5 + Math.random() * 10) * G.scale * 1.4, life: 1 });
    }
    for (let i = 0; i < 60 * p; i++) spawnBubble(true);
    kick(G.cx, -300 * p, 90);
    pressure = 0;
    announce('Pop! Extra fizz.');
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    wake();
  }

  /* ---------------------------------------------------------------- simulation */
  function spawnBubble(burst) {
    if (bubbles.length > 220) return;
    const wet = sprites.filter((s) => s.wet && s.fade === 1);
    let x, y;
    if (wet.length && Math.random() < 0.35) { const s = wet[(Math.random() * wet.length) | 0]; x = s.x + (Math.random() - 0.5) * s.r; y = s.y + (Math.random() - 0.3) * s.r; }
    else { const hw = halfAt(G.bot - 10); x = G.cx + (Math.random() - 0.5) * hw * 1.8; y = G.bot - 10 - Math.random() * (burst ? G.gh * 0.5 : 8); }
    bubbles.push({ x, y, r: (0.9 + Math.random() * (burst ? 3.4 : 2.4)) * G.scale * 1.6, vy: -(30 + Math.random() * 50), ph: Math.random() * 6.3 });
  }
  let acc = 0;
  function step(dt) {
    const lv = level();
    // shake: the glass follows the pointer on a spring; the auto shake is a 1 s wiggle
    if (shakeAuto > 0) {
      shakeAuto -= dt; const k = 1 - Math.max(0, shakeAuto);
      const tx = Math.sin(k * Math.PI * 9) * 46 * Math.sin(k * Math.PI);
      gvx = (tx - gx) / dt; gx = tx;
      pressure = Math.min(1, pressure + dt * 1.2);
      if (shakeAuto <= 0) { gx = 0; pop(Math.max(0.7, pressure)); }
    } else if (!shaking) { gvx += (-gx * 90 - gvx * 12) * dt; gx += gvx * dt; }
    else { pressure = Math.min(1, pressure + Math.min(1, Math.abs(gvx) / 1600) * dt * 1.4); }
    if (!shaking && shakeAuto <= 0) pressure = Math.max(0, pressure - dt * 0.12);
    // tilt of the surface follows the glass acceleration
    const tiltT = Math.max(-0.35, Math.min(0.35, -gvx * 0.00045));
    tilt += (tiltT - tilt) * Math.min(1, dt * 6);
    // surface: spring chain with neighbour tension
    for (let i = 0; i < N; i++) {
      const l = i ? sh[i - 1] : sh[i], r = i < N - 1 ? sh[i + 1] : sh[i];
      sv[i] += ((l + r - 2 * sh[i]) * 520 - sh[i] * 60 - sv[i] * 3.2) * dt;
    }
    for (let i = 0; i < N; i++) { sh[i] += sv[i] * dt; sh[i] = Math.max(-40, Math.min(40, sh[i])); }
    if (Math.abs(gvx) > 40) kick(G.cx + Math.sign(gvx) * halfAt(lv) * 0.9, gvx * 0.02, 50);
    // sprites
    const live = sprites.filter((s) => s.fade > 0);
    live.forEach((s) => {
      const sy = surfY(s.x), sink = s.ice ? 0.15 : s.herb ? 0.25 : 0.55;
      const restY = sy + s.r * sink + Math.sin(performance.now() / 900 + s.r) * 2;
      if (s.y < sy - s.r * 0.3 && !s.wet) { s.vy += 1500 * dt; }
      else {
        if (!s.wet) { s.wet = true; kick(s.x, s.vy * 0.25, 36); for (let i = 0; i < 10; i++) spawnBubble(true); for (let i = 0; i < 8; i++) drops.push({ x: s.x, y: sy, vx: (Math.random() - 0.5) * 220, vy: -(120 + Math.random() * 260), life: 1 }); }
        s.vy += ((restY - s.y) * 22 - s.vy * 4.2) * dt;
        s.vx += (-gvx * 0.9 - s.vx * 2.4) * dt + (Math.random() - 0.5) * 6;
        s.va += (-s.a * 0.6 - s.va * 1.6 + tilt * 2) * dt;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
      const hw = halfAt(Math.max(G.top, s.y)) - s.r * 0.55;
      if (s.x < G.cx - hw) { s.x = G.cx - hw; s.vx = Math.abs(s.vx) * 0.4; }
      if (s.x > G.cx + hw) { s.x = G.cx + hw; s.vx = -Math.abs(s.vx) * 0.4; }
      if (s.y > G.bot - s.r * 0.8) { s.y = G.bot - s.r * 0.8; s.vy = -Math.abs(s.vy) * 0.3; }
      if (s.fade < 1) s.fade = Math.max(0, s.fade - dt * 1.4);
    });
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, m = (a.r + b.r) * 0.62;
      if (d < m) { const p = (m - d) / d * 0.5; a.x -= dx * p * 0.5; b.x += dx * p * 0.5; a.y -= dy * p * 0.3; b.y += dy * p * 0.3; }
    }
    sprites = sprites.filter((s) => s.fade > 0);
    // bubbles
    const rate = [0, 5, 16, 42][fizzLevel] * (blend.size || sprites.length ? 1 : 0.6) + pressure * 90;
    acc += rate * dt;
    while (acc > 1) { acc -= 1; spawnBubble(false); }
    bubbles.forEach((b) => {
      b.vy -= (40 + fizzLevel * 30 + pressure * 200) * dt; b.y += b.vy * dt; b.ph += dt * 7;
      b.x += Math.sin(b.ph) * 12 * dt - gvx * 0.08 * dt;
      if (b.y < surfY(b.x) + b.r) { b.dead = true; if (pops.length < 40) pops.push({ x: b.x, y: surfY(b.x), r: b.r, life: 1 }); if (Math.random() < 0.3) kick(b.x, -8, 14); }
    });
    bubbles = bubbles.filter((b) => !b.dead);
    pops.forEach((p) => { p.life -= dt * 4; }); pops = pops.filter((p) => p.life > 0);
    foam.forEach((f) => { f.vy += 900 * dt; f.x += (f.vx + gvx * 0.2) * dt; f.y += f.vy * dt; f.life -= dt * 0.75; });
    foam = foam.filter((f) => f.life > 0 && f.y < H + 40);
    drops.forEach((f) => { f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt * 1.6; if (f.y > surfY(f.x) && f.vy > 0) f.life = 0; });
    drops = drops.filter((f) => f.life > 0);
    // colour
    for (let k = 0; k < 3; k++) liquid[k] += (liquidT[k] - liquid[k]) * Math.min(1, dt * 3);
  }

  /* ---------------------------------------------------------------- drawing */
  function staticBubbles() {
    const out = [], n = [0, 10, 22, 40][fizzLevel];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const y = G.bot - 14 - rnd() * (G.bot - level() - 24), hw = halfAt(y) - 8;
      out.push({ x: G.cx + (rnd() * 2 - 1) * hw, y, r: (0.9 + rnd() * 2.4) * G.scale * 1.6 });
    }
    return out;
  }
  const INK = '#0f3b2d', CREAM = '#f4ebd6';
  function glassPath() {
    const { cx, top, bot, wt, wb } = G, rr = 26 * G.scale;
    ctx.beginPath();
    ctx.moveTo(cx - wt, top);
    ctx.lineTo(cx - wb, bot - rr);
    ctx.quadraticCurveTo(cx - wb + 2, bot, cx - wb + rr, bot);
    ctx.lineTo(cx + wb - rr, bot);
    ctx.quadraticCurveTo(cx + wb - 2, bot, cx + wb, bot - rr);
    ctx.lineTo(cx + wt, top);
  }
  function liquidPath() {
    const hw = halfAt(level());
    ctx.beginPath();
    ctx.moveTo(G.cx - hw, surfY(G.cx - hw));
    for (let i = 1; i < N; i++) { const x = surfX(i); ctx.lineTo(x, surfY(x)); }
    const bi = G.bot - 7 * G.scale, rr = 22 * G.scale, hb = halfAt(bi);
    ctx.lineTo(G.cx + hb, bi - rr); ctx.quadraticCurveTo(G.cx + hb, bi, G.cx + hb - rr, bi);
    ctx.lineTo(G.cx - hb + rr, bi); ctx.quadraticCurveTo(G.cx - hb, bi, G.cx - hb, bi - rr);
    ctx.closePath();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const col = toHex(liquid), deep = toHex(liquid.map((v) => v * 0.78)), lite = toHex(liquid.map((v) => v + (255 - v) * 0.22));
    // soft shadow on the desk
    const sg = ctx.createRadialGradient(G.cx + gx * 0.6, G.bot + 6, 2, G.cx + gx * 0.6, G.bot + 6, G.wb * 1.6);
    sg.addColorStop(0, 'rgba(8,26,18,.28)'); sg.addColorStop(1, 'rgba(8,26,18,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(G.cx + gx * 0.6, G.bot + 6, G.wb * 1.6, 16 * G.scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(G.cx + gx, G.bot); ctx.rotate(gx * 0.0016); ctx.translate(-G.cx, -G.bot);
    // glass body
    glassPath(); ctx.closePath(); ctx.fillStyle = 'rgba(244,235,214,.16)'; ctx.fill();
    // liquid, back layer
    liquidPath();
    const lg = ctx.createLinearGradient(0, level(), 0, G.bot);
    lg.addColorStop(0, lite); lg.addColorStop(0.45, col); lg.addColorStop(1, deep);
    ctx.globalAlpha = 0.9; ctx.fillStyle = lg; ctx.fill(); ctx.globalAlpha = 1;
    // fruit + herbs
    sprites.forEach((s) => {
      ctx.save(); ctx.globalAlpha = s.fade; ctx.translate(s.x, s.y); ctx.rotate(s.a);
      if (s.ice) {
        const r = s.r; ctx.fillStyle = 'rgba(255,253,246,.5)'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-r, -r, 2 * r, 2 * r, r * 0.28); else ctx.rect(-r, -r, 2 * r, 2 * r); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.6); ctx.lineTo(r * 0.3, -r * 0.6); ctx.stroke();
      } else if (s.img && s.img.complete && s.img.naturalWidth) {
        const k = (s.r * 2) / Math.max(s.img.naturalWidth, s.img.naturalHeight);
        const w = s.img.naturalWidth * k, h = s.img.naturalHeight * k;
        ctx.drawImage(s.img, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    });
    // liquid, front layer (tints what sits under the surface) + bubbles inside it
    ctx.save(); liquidPath(); ctx.clip();
    ctx.globalAlpha = 0.34; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,250,236,.85)'; ctx.fillStyle = 'rgba(255,250,236,.85)'; ctx.lineWidth = 1;
    // reduced motion: a still life of the fizz (fixed, seeded bubbles, more of them the fizzier it is)
    const list = still() ? staticBubbles() : bubbles;
    list.forEach((b) => {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, Math.PI * 2); ctx.fill();
    });
    // a caustic glint band near the surface
    const cg = ctx.createLinearGradient(0, level() - 4, 0, level() + 26 * G.scale);
    cg.addColorStop(0, 'rgba(255,250,236,.45)'); cg.addColorStop(1, 'rgba(255,250,236,0)');
    ctx.fillStyle = cg; ctx.fillRect(0, level() - 30, W, 70 * G.scale);
    ctx.restore();
    // surface line (meniscus)
    ctx.beginPath(); const hw = halfAt(level());
    ctx.moveTo(G.cx - hw, surfY(G.cx - hw)); for (let i = 1; i < N; i++) { const x = surfX(i); ctx.lineTo(x, surfY(x)); }
    ctx.strokeStyle = 'rgba(255,250,236,.9)'; ctx.lineWidth = 2; ctx.stroke();
    // pops at the surface
    pops.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y - 2, p.r * (1 + (1 - p.life) * 2.2), Math.PI, 0); ctx.strokeStyle = `rgba(255,250,236,${p.life * 0.8})`; ctx.lineWidth = 1; ctx.stroke(); });
    // glass line art: walls + rim + engraved hatching + highlight
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    glassPath(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(G.cx, G.top, G.wt, 9 * G.scale, 0, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
    // engraved shading: short strokes down the right wall, longer toward the bottom (like the can labels' hatching)
    for (let i = 0; i < 9; i++) {
      const y0 = G.top + G.gh * (0.18 + i * 0.085), len = G.gh * (0.03 + i * 0.006), x0 = G.cx + halfAt(y0) - 12 * G.scale;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - 3 * G.scale, y0 + len); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 - 8 * G.scale, y0 + len * 0.3); ctx.lineTo(x0 - 10 * G.scale, y0 + len * 0.9); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(G.cx - G.wt + 16 * G.scale, G.top + 26 * G.scale); ctx.lineTo(G.cx - G.wb + 14 * G.scale, G.bot - 60 * G.scale);
    ctx.strokeStyle = 'rgba(255,253,246,.7)'; ctx.lineWidth = 5 * G.scale; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(G.cx - G.wb + 6 * G.scale, G.bot - 4); ctx.quadraticCurveTo(G.cx, G.bot + 10 * G.scale, G.cx + G.wb - 6 * G.scale, G.bot - 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
      // foam + drops above everything (they spill over the rim)
    foam.forEach((f) => { ctx.globalAlpha = Math.min(1, f.life * 1.4); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(15,59,45,.25)'; ctx.lineWidth = 1; ctx.stroke(); });
    ctx.globalAlpha = 1;
    drops.forEach((f) => { ctx.globalAlpha = f.life; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(f.x, f.y, 2.6 * G.scale, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.restore();
    // pressure gauge: a thin arc under the glass while shaking
    if (pressure > 0.02) {
      ctx.beginPath(); ctx.arc(G.cx, G.bot + 22 * G.scale, 18 * G.scale, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * pressure));
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    }
  }

  /* ---------------------------------------------------------------- loop (sleeps when nothing moves) */
  let raf = 0, last = 0, onscreen = true, calmFrames = 0;
  function moving() {
    if (still()) return false;
    let e = Math.abs(gx) + Math.abs(gvx) * 0.01 + pressure + shakeAuto;
    for (let i = 0; i < N; i++) e += Math.abs(sv[i]) * 0.02;
    return e > 0.05 || bubbles.length || foam.length || drops.length || pops.length || sprites.some((s) => !s.wet || Math.abs(s.vy) > 2 || s.fade < 1) || fizzLevel > 0 && (blend.size || sprites.length);
  }
  function frame(t) {
    raf = 0;
    // fixed small sub-steps, so a slow device sees the same physics, just at fewer frames
    const total = Math.min(0.1, last ? (t - last) / 1000 : 0.016); last = t;
    const n = Math.max(1, Math.ceil(total / 0.017));
    for (let i = 0; i < n; i++) step(total / n);
    draw();
    if (moving() || calmFrames++ < 20) { if (moving()) calmFrames = 0; schedule(); } else last = 0;
  }
  function schedule() { if (!raf && onscreen && !document.hidden) raf = requestAnimationFrame(frame); }
  function wake() { calmFrames = 0; if (still()) { draw(); return; } schedule(); }
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { onscreen = es[0].isIntersecting; if (onscreen) { last = 0; wake(); } }).observe(stage);

  /* ---------------------------------------------------------------- pause the light (shared with the site) */
  const stillBtn = $('.lab-still');
  const syncStill = () => {
    const on = html.getAttribute('data-ydx-still') === '1';
    stillBtn.setAttribute('aria-pressed', String(on));
    stillBtn.querySelector('.lab-still__t').textContent = on ? 'Play light' : 'Pause light';
  };
  stillBtn.addEventListener('click', () => {
    const on = html.getAttribute('data-ydx-still') !== '1';
    if (on) html.setAttribute('data-ydx-still', '1'); else html.removeAttribute('data-ydx-still');
    try { localStorage.setItem('ydx-still', on ? '1' : '0'); } catch (e) {}
    syncStill(); if (field) field.redraw(); wake();
  });
  syncStill();

  /* ---------------------------------------------------------------- leaving: the same label laid on, then go */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-lab-leave]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const c = document.createElement('div'); c.className = 'ydx-cover-in'; c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    if (reduced() || !c.animate) { c.style.opacity = '0'; c.animate && c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' }); setTimeout(() => location.assign(a.href), 170); return; }
    c.classList.add('is-peeling');
    setTimeout(() => location.assign(a.href), 560);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) document.querySelectorAll('.ydx-cover-in').forEach((n) => n.remove()); });

  /* ---------------------------------------------------------------- the light behind the page */
  function startField() {
    let framed = true; try { framed = window.self !== window.top; } catch (e) {}
    const qs = new URLSearchParams(location.search);
    if (!window.YdxField || framed || (navigator.connection && navigator.connection.saveData) || qs.get('ydx-field') === 'css') { html.classList.add('ydx-field-css'); return; }
    if (qs.get('ydx-field') === 'off') return;
    html.classList.add('ydx-field');
    const main = $('.lab-desk'), foot = $('.lab-footer');
    field = window.YdxField.mount({
      bands: () => [{ el: main, kind: 0, get: () => (blend.size ? toHex(liquidT) : null) }, { el: foot, kind: 1 }],
      fizz: () => Math.min(1, fizzLevel * 0.18 + pressure * 0.8),
      allowSoftware: qs.get('ydx-gl') === 'soft',
      burstOk: (e) => e.button === 0 && !(e.target.closest && e.target.closest('input, [data-stage]')),
      onReady: () => requestAnimationFrame(() => { html.classList.add('ydx-field-on'); syncStill(); }),
      onLost: () => html.classList.remove('ydx-field-on'),
      onFail: () => { field = null; html.classList.remove('ydx-field'); html.classList.add('ydx-field-css'); }
    });
    if (field && field.state === 'fallback') { field = null; html.classList.remove('ydx-field'); html.classList.add('ydx-field-css'); }
    if (field && window.ResizeObserver) new ResizeObserver(() => field && field.invalidate()).observe(document.body);
  }

  /* ---------------------------------------------------------------- the cover peels off */
  function reveal() {
    const cover = $('#lab-cover');
    if (!cover) return;
    try { sessionStorage.setItem('ydx-lab-seen', '1'); } catch (e) {}
    const drop = () => cover.remove();
    cover.classList.add('is-leaving');
    cover.addEventListener('animationend', (e) => { if (e.target === cover) drop(); });
    setTimeout(drop, reduced() ? 300 : 900);
    // the page arrives under the peel
    if (!reduced() && document.body.animate) {
      const q = html.classList.contains('lab-quick') ? 0.6 : 1;
      [['.lab-kicker', 0], ['.lab-intro h1', 80], ['.lab-intro p', 220], ['.lab-glass', 160], ['.lab-card', 260], ['.lab-shelf', 320], ['.lab-header > *', 120]].forEach(([s, d]) => {
        document.querySelectorAll(s).forEach((el, i) => el.animate([{ opacity: 0, translate: '0 26px' }, { opacity: 1, translate: '0 0' }], { duration: 800, delay: (d + i * 60) * q + 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      });
    }
  }

  /* ---------------------------------------------------------------- boot */
  geom();
  render(); draw();
  addEventListener('resize', () => { geom(); draw(); }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(() => { geom(); draw(); }).observe(stage);
  // a first squeeze so the glass is never empty and dull: a slice of blood orange and a sprig of rosemary drop in
  const quick = html.classList.contains('lab-quick');
  const minShow = quick ? 250 : 700, t0 = performance.now();
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  const imgsReady = Promise.all(['blood-orange', 'rosemary'].map((id) => imgs[id].decode ? imgs[id].decode().catch(() => {}) : null));
  let revealed = false;
  const go = () => {
    if (revealed) return; revealed = true;
    reveal(); startField();
    setTimeout(() => { add('blood-orange', G.cx - 20); }, reduced() ? 0 : 700);
    setTimeout(() => { add('rosemary', G.cx + 30); hint(true); }, reduced() ? 0 : 1050);
  };
  Promise.all([fontsReady, imgsReady]).then(() => setTimeout(go, Math.max(0, minShow - (performance.now() - t0))));
  setTimeout(go, 2500); // hard safety: never hold the cover longer
  window.__ydxLab = { add, addIce, empty, pop, state: () => ({ blend: Object.fromEntries(blend), match: match && match.id, fizz: fizzLevel, sprites: sprites.length, bubbles: bubbles.length, liquid: toHex(liquid), target: toHex(liquidT) }) };
})();
