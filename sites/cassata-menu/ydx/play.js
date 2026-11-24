/* Cassata — ydx round 5: "The Scoop Lab" (/play/).
   A small toy in the site's sticker language: pick today's flavours (live /api/menu, with the full collection as a
   fallback), they drop onto a waffle cone; drag the cone (mouse, finger, arrow keys or phone tilt) and the stack sways
   on springs. Lean too far and the top scoops slide off and splat on the counter. The page background is the same
   living gelato field as the home hero (ydx/field.js), recoloured with a "pour" from every scoop that lands.
   Vanilla JS, no dependencies, CSP-safe. Reduced motion: no drops, no sway, nothing falls; the builder still works. */
(() => {
  'use strict';
  const d = document, w = window, h = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const site = d.querySelector('.lab-site');
  if (!site) return;

  // id: [he, en, page field, page ink (the app's own contrast pair), scoop colour]
  const FL = {
    pistachio: ['פיסטוק', 'Pistachio', '#b9cc5a', '#1e3a27', '#a9bb5c'],
    marshmallow: ['מרשמלו שרוף', 'Burnt marshmallow', '#4a2418', '#f7b8c4', '#f1dcc4'],
    rice: ['אורז קלוי', 'Roasted rice', '#7cc4c0', '#12393a', '#eadcbc'],
    butter: ['חמאה חומה', 'Brown butter', '#f5c543', '#4a2418', '#cf9452'],
    mango: ['סטיקי רייס מנגו', 'Mango sticky rice', '#ff9a2e', '#4a1708', '#ffbf3c'],
    chocolate: ['שוקולד', 'Chocolate', '#f4a7b9', '#4a2418', '#6a3a26'],
    vanilla: ['וניל', 'Vanilla', '#2b4fd8', '#fff3dc', '#f7ecd2'],
    hazelnut: ['אגוזי לוז', 'Hazelnut', '#1e3a27', '#f2d9a6', '#b07c48'],
    'earl-grey': ['ארל גריי', 'Earl Grey', '#2a6876', '#fff3dc', '#c2b4a6'],
    sourdough: ['מחמצת', 'Sourdough', '#d2382b', '#fff3dc', '#e8d3ac'],
    'creme-fraiche': ['קרם פרש, שמן זית ומלח', 'Crème fraîche, olive oil & salt', '#526f1e', '#fff8e8', '#fbf5e6'],
    'sage-butter': ['חמאה ומרווה', 'Butter & sage', '#a8d0a0', '#1e3a27', '#dcd59c'],
    'lavender-honey': ['לבנדר ודבש', 'Lavender & honey', '#c3b0f0', '#2b1a5e', '#cdb8e8'],
    'salted-sesame': ['שומשום מלוח', 'Salted sesame', '#26262e', '#f2e6cf', '#cfb48c'],
    'almond-cinnamon': ['שקדים וקינמון', 'Almond & cinnamon', '#a3471f', '#fff0d6', '#d3a272'],
    'afghan-mulberry': ['תות אפגני', 'Afghan mulberry', '#f7da4e', '#4b0f3b', '#93305f'],
    'blood-orange': ['תפוז דם', 'Blood orange', '#9ccbea', '#5a1208', '#ea5a3c'],
    'peanut-caramel': ['קרמל בוטנים', 'Peanut caramel', '#1e2a5e', '#f5c543', '#bd7b3e']
  };
  const ORDER = Object.keys(FL);
  const T = {
    he: {
      back: '← חזרה לתפריט', backShort: '← לתפריט', eyebrow: 'מעבדת הכדורים ✳ שעשוע של קסטה', title: 'בנו גביע. אל תפילו.',
      lead: 'בחרו טעמים מהוויטרינה של היום, ואז גררו את הגביע. נטייה חזקה מדי, והכדור למעלה נוחת על הדלפק.',
      hint: 'גררו את הגביע', pick: 'הוויטרינה של היום', wait: 'רגע, בודקים מה יש…', reset: 'מתחילים מחדש', tilt: 'הטו את הטלפון',
      tiltOn: 'ההטיה פועלת', empty: 'הגביע ריק', n: ['', 'כדור אחד', 'שני כדורים', 'שלושה כדורים', 'ארבעה כדורים'],
      ask: 'שאלו בדלפק', full: 'ארבעה זה המקסימום של הבית. אפילו אצלנו.', offline: 'לא הצלחנו להגיע לדלפק, אז הנה כל האוסף.',
      added: x => x + ' על הגביע.', fell: x => 'אופס! ' + x + ' על הדלפק.', floor: n => 'על הדלפק: ' + n, cleared: 'גביע חדש.',
      stage: 'הגביע: חצים ימינה ושמאלה מזיזים אותו', flavours: 'טעמים', skip: 'למעבדה', lang: 'Switch to English',
      doc: 'מעבדת הכדורים | Cassata Tel Aviv'
    },
    en: {
      back: '← Back to the menu', backShort: '← Menu', eyebrow: 'The scoop lab ✳ a Cassata toy', title: "Stack it. Don't drop it.",
      lead: "Pick from today's vitrine, then drag the cone. Lean too hard and the top scoop lands on the counter.",
      hint: 'Drag the cone', pick: "Today's vitrine", wait: 'Checking the counter…', reset: 'Start over', tilt: 'Tilt your phone',
      tiltOn: 'Tilt is on', empty: 'Empty cone', n: ['', 'One scoop', 'Two scoops', 'Three scoops', 'Four scoops'],
      ask: 'Ask at the counter', full: "Four is the house limit. Even for us.", offline: "We couldn't reach the counter, so here's the whole collection.",
      added: x => x + ' is on.', fell: x => 'Oops! ' + x + ' hit the counter.', floor: n => 'On the counter: ' + n, cleared: 'Fresh cone.',
      stage: 'The cone: left and right arrows move it', flavours: 'Flavours', skip: 'To the lab', lang: 'החלפה לעברית',
      doc: 'The Scoop Lab | Cassata Tel Aviv'
    }
  };
  let lang = 'he';
  try { if (localStorage.getItem('cassata-language') === 'en') lang = 'en'; } catch (e) {}
  const t = () => T[lang];
  const nm = id => FL[id][lang === 'en' ? 1 : 0];

  const $ = (s, r = d) => r.querySelector(s);
  const svg = $('.lab__svg'), stage = $('.lab__stage'), gStack = $('.lab__stack'), gFall = $('.lab__falling'), gSplat = $('.lab__splats');
  const tray = $('.lab__tray'), live = $('.lab__live'), note = $('.lab__note');
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#1d1b16';
  const vib = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  /* ---------------- drawing (the loader's sticker scoop + waffle cone) ---------------- */
  const S = 'M-46,6 C-50,-26 -26,-46 0,-46 C26,-46 50,-26 46,6 C40,4 38,14 30,12 C24,20 16,10 10,15 C4,21 -4,12 -10,16 C-17,21 -22,11 -29,14 C-36,15 -40,5 -46,6 Z';
  const SPLAT = 'M-70,0 C-74,-14 -52,-22 -36,-20 C-30,-34 -6,-36 4,-26 C16,-38 44,-32 46,-18 C64,-22 80,-10 72,0 Z';
  function el(tag, attrs, parent) { const e = d.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function mixHex(a, b, k) {
    const A = a.match(/\w\w/g).map(x => parseInt(x, 16)), B = b.match(/\w\w/g).map(x => parseInt(x, 16));
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }
  function scoopNode(id) {
    const col = FL[id][4], fleck = mixHex(col, '#1d1b16', 0.42);
    const g = el('g', { class: 'lab__scoop' });
    const inner = el('g', {}, g);
    const art = el('g', { transform: 'scale(1.38) translate(0,-9)' }, inner);
    el('path', { d: S, transform: 'translate(4,5)', fill: INK }, art);
    el('path', { d: S, fill: col, stroke: INK, 'stroke-width': 2.3, 'stroke-linejoin': 'round' }, art);
    el('path', { d: 'M-31,-18 C-27,-32 -14,-39 -2,-40', fill: 'none', stroke: '#fff', 'stroke-opacity': '.5', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, art);
    [[-18, -14, 3.2, 2], [12, -26, 2.6, 1.7], [22, -6, 3, 1.9], [-4, -2, 2.2, 1.5]].forEach(([x, y, rx, ry], i) =>
      el('ellipse', { cx: x, cy: y, rx, ry, fill: fleck, transform: `rotate(${i * 47} ${x} ${y})` }, art));
    return { g, inner };
  }
  function coneNode() {
    const g = el('g', { class: 'lab__cone' });
    const k = el('g', { transform: 'scale(1.5) translate(-80,-112)' }, g);
    const defs = el('defs', {}, k);
    const cp = el('clipPath', { id: 'lab-cc' }, defs);
    el('path', { d: 'M40,112 L120,112 L80,216 Z' }, cp);
    el('path', { d: 'M45,117 L125,117 L85,221 Z', fill: INK }, k);
    el('path', { d: 'M40,112 L120,112 L80,216 Z', fill: '#f5c543' }, k);
    const lines = el('g', { 'clip-path': 'url(#lab-cc)', stroke: INK, 'stroke-width': 2, opacity: '.5' }, k);
    el('path', { d: 'M20,100 l90,120 M40,100 l90,120 M60,100 l90,120 M0,100 l90,120 M-20,100 l90,120 M140,100 l-90,120 M120,100 l-90,120 M100,100 l-90,120 M160,100 l-90,120 M180,100 l-90,120' }, lines);
    el('path', { d: 'M40,112 L120,112 L80,216 Z', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, k);
    return g;
  }
  const cone = coneNode();
  gStack.appendChild(cone);

  /* ---------------- physics ---------------- */
  const FLOOR = 668, CONE_Y = 440, GAP = 54, MAXN = 4, XMIN = 80, XMAX = 520;
  const base = { x: 300, v: 0, a: 0, tx: 300, bob: 0, bobV: 0 };
  let coneRot = 0, tiltG = 0;
  const stack = [];   // {id, th, om, sq, sqv, g, inner}
  const bodies = [];  // falling: {id, x, y, vx, vy, r, vr, g, inner, drop}
  const splats = [];  // {g, x, age, col}
  let floorN = 0;

  function seats() { // world positions of every seat (bottom-centre) + the next free seat
    const out = [];
    let x = base.x, y = CONE_Y + base.bob, ang = coneRot;
    for (let i = 0; i <= stack.length; i++) {
      const th = i < stack.length ? stack[i].th : 0;
      ang += th;
      out.push({ x, y, ang });
      x += Math.sin(ang) * GAP; y -= Math.cos(ang) * GAP;
    }
    return out;
  }
  function step(dt) {
    // the cone follows the hand on a stiff spring; its acceleration is what the scoops feel
    if (RM) { base.x = base.tx; base.v = 0; base.a = 0; }
    else {
      let a = (base.tx - base.x) * 240 - base.v * 30;
      a = Math.max(-7000, Math.min(7000, a));
      base.a = a; base.v += a * dt; base.x += base.v * dt;
    }
    base.bobV += (-base.bob * 320 - base.bobV * 18) * dt; base.bob += base.bobV * dt;
    coneRot += ((RM ? 0 : Math.max(-0.22, Math.min(0.22, -base.v * 0.00022 + tiltG * 0.0002))) - coneRot) * Math.min(1, dt * 14);
    let phi = coneRot;
    for (let i = 0; i < stack.length; i++) {
      const s = stack[i];
      if (RM) { s.th = 0; s.om = 0; continue; }
      phi += s.th;
      const m = 1 + 0.4 * i, K = 78 * (1 - 0.1 * i);
      const al = -K * s.th - 7.5 * s.om - base.a * 0.0105 * m + 13 * Math.sin(phi) + tiltG * 0.012 * Math.cos(phi);
      s.om += al * dt; s.th += s.om * dt;
      s.sqv += (-s.sq * 420 - s.sqv * 16) * dt; s.sq += s.sqv * dt;
      if (Math.abs(s.th) > 0.5 || Math.abs(phi) > 1.05) { detach(i); break; }
    }
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      b.vy += 2300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      if (b.drop) { // a scoop dropping onto the stack: caught if the cone is under it
        const top = seats()[stack.length];
        if (b.y >= top.y && b.vy > 0) {
          if (Math.abs(b.x - top.x) < 50) { land(b, top); bodies.splice(i, 1); continue; }
          b.drop = false; // missed: keeps falling to the counter
        }
      }
      if (b.y >= FLOOR - 6) { splat(b); bodies.splice(i, 1); }
    }
    for (const s of splats) s.age += dt;
  }
  function land(b, top) {
    b.g.remove();
    const s = { id: b.id, th: (b.x - top.x) / 220 + (Math.random() - 0.5) * 0.06, om: (b.x - top.x) / 60, sq: 0, sqv: -9, g: b.g, inner: b.inner };
    gStack.appendChild(s.g);
    stack.push(s);
    base.bobV += 260;
    stack.forEach((o, i) => { if (o !== s) o.om += (Math.random() - 0.5) * 0.8 * (i + 1); });
    vib(8);
    afterChange(true);
  }
  function detach(i) {
    const st = seats();
    const gone = stack.splice(i);
    gone.forEach((s, k) => {
      const p = st[i + k];
      const lean = p.ang;
      bodies.push({ id: s.id, x: p.x, y: p.y, vx: base.v * 0.9 + Math.sin(lean) * 260, vy: -120 - k * 40, r: lean, vr: lean * 3 + (Math.random() - 0.5), g: s.g, inner: s.inner, drop: false });
      gFall.appendChild(s.g);
    });
    vib(20);
    say(t().fell(gone.map(s => nm(s.id)).join(' + ')));
    afterChange(false);
  }
  function splat(b) {
    b.g.remove();
    floorN++;
    const col = FL[b.id][4];
    const g = el('g', { class: 'lab__splat' }, gSplat);
    el('path', { d: SPLAT, transform: 'translate(4,4)', fill: INK }, g);
    el('path', { d: SPLAT, fill: col, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
    [[-86, -8, 6], [88, -12, 5], [60, -34, 4]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: col, stroke: INK, 'stroke-width': 2.5 }, g));
    const x = Math.max(60, Math.min(540, b.x));
    splats.push({ g, x, age: 0 });
    while (splats.length > 6) splats.shift().g.remove();
    vib(25);
    floorLabel();
    // the field swirls where it landed
    if (F && F.dab) { const c = toClient(x, FLOOR - 16); if (c) F.dab(c[0], c[1]); }
  }

  /* ---------------- render ---------------- */
  function render() {
    const st = seats();
    cone.setAttribute('transform', `translate(${base.x.toFixed(1)} ${(CONE_Y + base.bob).toFixed(1)}) rotate(${(coneRot * 57.3).toFixed(2)})`);
    stack.forEach((s, i) => {
      const p = st[i];
      s.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(p.ang * 57.3).toFixed(2)})`);
      const q = Math.max(-0.3, Math.min(0.3, s.sq));
      s.inner.setAttribute('transform', `scale(${(1 - q).toFixed(3)} ${(1 + q).toFixed(3)})`);
    });
    bodies.forEach(b => b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${(b.r * 57.3).toFixed(1)})`));
    splats.forEach(s => {
      const k = Math.min(1, s.age / 0.22), e = 1 - Math.pow(1 - k, 3);
      const sx = 0.5 + 0.5 * e + Math.sin(k * Math.PI) * 0.18, sy = 1.8 - 0.8 * e;
      s.g.setAttribute('transform', `translate(${s.x.toFixed(1)} ${FLOOR}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
    });
  }
  let raf = 0, last = 0, acc = 0;
  function busy() {
    if (bodies.length || splats.some(s => s.age < 0.3)) return true;
    if (Math.abs(base.tx - base.x) > 0.2 || Math.abs(base.v) > 1 || Math.abs(base.bob) > 0.1 || Math.abs(base.bobV) > 1) return true;
    return stack.some(s => Math.abs(s.th) > 0.0008 || Math.abs(s.om) > 0.003 || Math.abs(s.sq) > 0.002);
  }
  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    acc += dt;
    while (acc > 1 / 240) { step(1 / 240); acc -= 1 / 240; }
    render();
    if (busy() || dragging || tiltOn) kick(); else last = 0;
  }
  function kick() { if (!raf && !d.hidden) raf = requestAnimationFrame(loop); }
  d.addEventListener('visibilitychange', () => { last = 0; kick(); });

  /* ---------------- input ---------------- */
  let dragging = false, dragId = null, hinted = false, tiltOn = false;
  function toSvgX(clientX) {
    const m = svg.getScreenCTM(); if (!m) return base.tx;
    const p = svg.createSVGPoint(); p.x = clientX; p.y = 0;
    return p.matrixTransform(m.inverse()).x;
  }
  function toClient(x, y) {
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = svg.createSVGPoint(); p.x = x; p.y = y;
    const r = p.matrixTransform(m); return [r.x, r.y];
  }
  const clampX = x => Math.max(XMIN, Math.min(XMAX, x));
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; dragId = e.pointerId;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    base.tx = clampX(toSvgX(e.clientX));
    stage.classList.add('is-drag'); hint(); kick();
  });
  stage.addEventListener('pointermove', e => { if (dragging && e.pointerId === dragId) { base.tx = clampX(toSvgX(e.clientX)); kick(); } });
  const end = e => { if (e.pointerId !== dragId) return; dragging = false; dragId = null; stage.classList.remove('is-drag'); kick(); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('keydown', e => {
    const dir = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    base.tx = clampX(base.tx + dir * (e.shiftKey ? 140 : 70)); hint(); kick();
  });
  function hint() { if (hinted) return; hinted = true; stage.classList.add('is-hinted'); }

  // phone tilt (iOS asks for permission inside the tap)
  const tiltBtn = $('.lab__tilt');
  const D = w.DeviceOrientationEvent;
  if (D && matchMedia('(pointer: coarse)').matches && !RM) tiltBtn.hidden = false;
  function onTilt(e) {
    if (e.gamma == null) return;
    const g = Math.max(-35, Math.min(35, e.gamma));
    tiltG = g * 40;                            // gravity leans the stack…
    base.tx = clampX(300 + g / 35 * 220);       // …and the cone slides with the phone
    kick();
  }
  tiltBtn.addEventListener('click', () => {
    if (tiltOn) return;
    const p = typeof D.requestPermission === 'function' ? D.requestPermission() : Promise.resolve('granted');
    p.then(s => {
      if (s !== 'granted') return;
      tiltOn = true; w.addEventListener('deviceorientation', onTilt, { passive: true });
      tiltBtn.textContent = t().tiltOn; tiltBtn.setAttribute('aria-pressed', 'true'); hint(); kick();
    }).catch(() => {});
  });

  /* ---------------- flavours + ticket ---------------- */
  let prices = null, menu = [];
  function addScoop(id) {
    const sr = stage.getBoundingClientRect(); // phones: bring the cone into view before the scoop drops
    if (sr.top < 0 || sr.bottom > innerHeight + sr.height * 0.4) stage.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
    if (stack.length + bodies.filter(b => b.drop).length >= MAXN) { flash(t().full); return; }
    const { g, inner } = scoopNode(id);
    const top = seats()[stack.length];
    if (RM) {
      const s = { id, th: 0, om: 0, sq: 0, sqv: 0, g, inner };
      gStack.appendChild(g); stack.push(s); render(); afterChange(true); return;
    }
    gFall.appendChild(g);
    bodies.push({ id, x: top.x, y: 30, vx: 0, vy: 200, r: (Math.random() - 0.5) * 0.3, vr: (Math.random() - 0.5) * 2, g, inner, drop: true });
    kick();
  }
  function flash(msg) { note.textContent = msg; note.hidden = false; clearTimeout(flash.t); flash.t = setTimeout(() => { note.hidden = true; }, 2600); say(msg); }
  function say(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }
  function afterChange(added) {
    const n = stack.length;
    const k = $('.lab__ticket-k'), v = $('.lab__ticket-v'), names = $('.lab__ticket-n');
    k.textContent = n ? t().n[n] : t().empty;
    v.textContent = n ? (n <= 2 && prices && prices[n - 1] ? '₪' + prices[n - 1] : t().ask) : '';
    v.classList.toggle('is-ask', !!n && !(n <= 2 && prices && prices[n - 1]));
    names.textContent = stack.map(s => nm(s.id)).join(' + ');
    tray.querySelectorAll('button').forEach(b => b.setAttribute('aria-disabled', n >= MAXN ? 'true' : 'false'));
    if (added && n) { const top = stack[n - 1]; say(t().added(nm(top.id))); }
    const topId = n ? stack[n - 1].id : 'pistachio';
    setField(topId, true);
    if (added) { const tk = $('.lab__ticket'); tk.classList.remove('is-stamp'); void tk.offsetWidth; tk.classList.add('is-stamp'); }
  }
  function floorLabel() { const f = $('.lab__floorcount'); f.textContent = floorN ? t().floor(floorN) : ''; }
  function buildTray(list, offline) {
    tray.textContent = '';
    list.forEach(id => {
      const b = d.createElement('button');
      b.type = 'button'; b.className = 'lab__chip'; b.dataset.id = id;
      b.style.setProperty('--c', FL[id][4]);
      const dot = d.createElement('i'); dot.setAttribute('aria-hidden', 'true');
      const s = d.createElement('span'); s.textContent = nm(id);
      b.append(dot, s);
      b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') === 'true') { flash(t().full); return; } addScoop(id); });
      tray.appendChild(b);
    });
    if (offline) { note.textContent = t().offline; note.hidden = false; }
    afterChange(false);
  }
  function loadMenu() {
    let done = false;
    const fallback = () => { if (done) return; done = true; menu = ORDER.slice(); buildTray(menu, true); };
    const timer = setTimeout(fallback, 4000);
    fetch('/api/menu', { cache: 'no-store', headers: { accept: 'application/json' } })
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(j => {
        if (done) return;
        const fl = (j && j.flavors || []).filter(f => f && f.available && !f.archived && FL[f.id]).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        if (!fl.length) throw 0;
        done = true; clearTimeout(timer);
        prices = j.settings && Array.isArray(j.settings.prices) ? j.settings.prices : null;
        menu = fl.map(f => f.id); buildTray(menu, false);
      })
      .catch(() => { clearTimeout(timer); fallback(); });
  }

  /* ---------------- reset ---------------- */
  $('.lab__reset').addEventListener('click', () => {
    stack.splice(0).forEach(s => s.g.remove());
    bodies.splice(0).forEach(b => b.g.remove());
    splats.splice(0).forEach(s => s.g.remove());
    floorN = 0; floorLabel();
    note.hidden = true;
    base.bobV += 200; kick();
    say(t().cleared);
    afterChange(false);
  });

  /* ---------------- language ---------------- */
  function applyLang() {
    const en = lang === 'en';
    h.lang = en ? 'en' : 'he'; h.dir = en ? 'ltr' : 'rtl';
    site.dir = en ? 'ltr' : 'rtl'; site.classList.toggle('english', en);
    d.querySelectorAll('[data-t]').forEach(n => { const v = t()[n.dataset.t]; if (typeof v === 'string') n.textContent = v; });
    stage.setAttribute('aria-label', t().stage); tray.setAttribute('aria-label', t().flavours);
    const skip = $('.skip'); if (skip) skip.textContent = t().skip;
    const lb = $('.language'); lb.setAttribute('aria-label', t().lang);
    const sp = lb.querySelectorAll('span'); sp[0].classList.toggle('chosen', !en); sp[2].classList.toggle('chosen', en);
    if (tiltOn) tiltBtn.textContent = t().tiltOn;
    d.title = t().doc;
    tray.querySelectorAll('.lab__chip span').forEach(s => { s.textContent = nm(s.parentNode.dataset.id); });
    if (!note.hidden && note.textContent) note.hidden = true;
    floorLabel(); afterChange(false);
  }
  $('.language').addEventListener('click', () => {
    lang = lang === 'en' ? 'he' : 'en';
    try { localStorage.setItem('cassata-language', lang); } catch (e) {}
    applyLang();
  });

  /* ---------------- the living field behind the lab ---------------- */
  let F = null, lastField = '';
  function setField(id, pour) {
    const f = FL[id];
    site.style.setProperty('--field', f[2]); site.style.setProperty('--tone', f[3]);
    const meta = d.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', f[2]);
    if (!F || lastField === f[2]) { lastField = f[2]; return; }
    lastField = f[2];
    let o = null;
    if (pour && stack.length) { const top = seats()[stack.length - 1]; o = toClient(top.x, top.y - 30); }
    F.setField(f[2], f[3], o || [innerWidth / 2, innerHeight * 0.55], !pour);
  }
  function mountField() {
    if (!w.YdxField) return;
    const cv = d.createElement('canvas');
    cv.className = 'ydx-field lab-field'; cv.setAttribute('aria-hidden', 'true');
    d.body.appendChild(cv);
    const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 821;
    const frameMode = w.self !== w.top;
    const f0 = FL[stack.length ? stack[stack.length - 1].id : 'pistachio'];
    F = w.YdxField.create(cv, {
      colors: [f0[2], f0[3]], maxDpr: frameMode ? 1 : coarse ? 1.25 : 1.5, quality: frameMode ? 0.5 : coarse ? 0.65 : 0.8,
      width: coarse ? 18 : 24, pourMs: 1000,
      onState: s => { const on = s === 'ready'; h.classList.toggle('ydx-gl', on); cv.classList.toggle('is-on', on); },
      ghost: () => ({ x: innerWidth * 0.5, y: innerHeight * 0.16, rx: innerWidth * 0.34, ry: innerHeight * 0.06 })
    });
    lastField = f0[2];
    if (F.state === 'fallback') { cv.remove(); F = null; return; }
    w.__ydxField = F; // enhance.js holds it still during the language View Transition
    const size = () => F.setSize(innerWidth, innerHeight);
    size(); addEventListener('resize', size, { passive: true });
    let pend = null, pr = 0;
    addEventListener('pointermove', e => {
      pend = [e.clientX, e.clientY];
      if (!pr) pr = requestAnimationFrame(() => { pr = 0; if (pend) F.stroke(pend[0], pend[1]); pend = null; });
    }, { passive: true });
    addEventListener('pointerup', () => F.lift(), { passive: true });
    h.addEventListener('pointerleave', () => F.lift());
    F.active(true);
  }

  applyLang();
  loadMenu();
  render();
  const startField = () => { try { mountField(); } catch (e) { h.classList.remove('ydx-gl'); } };
  if (d.readyState === 'complete') setTimeout(startField, 60); else addEventListener('load', () => setTimeout(startField, 60), { once: true });
})();
