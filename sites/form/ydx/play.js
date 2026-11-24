/* ==========================================================================
   FORM — ydx round 5: "The platform", a barbell-loading toy on sign-in.
   Opened from the "Load the bar" chip on the sign-in poster (enhance.js).
   - Tap (or drag) a bumper plate from the rack: a pair flies onto both
     sleeves, turning from face-on to edge-on, and clangs into place; the
     bar dips and rattles. Real-ish geometry: plate thicknesses in mm, a
     415 mm sleeve (it really fills up: "sleeve full").
   - Drag the bar up, press Lift or Space: heavier loads move slower, whip
     (the bar bends with acceleration), and past ~280 kg it won't leave the
     floor. Hold at the top = lockout; a new best gets plate confetti.
   - Release: the bar drops, bumpers bounce, and chalk bursts from the
     platform (claps in the shared WebGL floor, window.ydxFX.chalk()).
   - Tap a plate stack to strip its outer pair; "Strip" clears the bar.
   Everything is a sibling of #root (never inside React's tree). The toy is
   a 2D canvas drawn only while something moves; the rack and actions are
   real buttons (keyboard + screen readers), the total is announced politely.
   Reduced motion: plates snap on/off, the lift is a still frame, no shake,
   no confetti.
   ========================================================================== */
(() => {
  'use strict';
  if (window.ydxPlay) return;
  const d = document, html = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE_WIPE = 'cubic-bezier(.65,0,.15,1)';
  // kg, colour, thickness (mm), diameter (fraction of a 450 mm bumper)
  const PLATES = [
    { kg: 25, c: '#e3242b', mm: 64, dia: 1 },
    { kg: 20, c: '#1d5fd8', mm: 54, dia: 1 },
    { kg: 15, c: '#f7c600', mm: 44, dia: 1 },
    { kg: 10, c: '#16a34a', mm: 34, dia: 1 },
    { kg: 5, c: '#f3f1ea', mm: 26, dia: .55 },
    { kg: 2.5, c: '#b9bcc1', mm: 19, dia: .45 }
  ];
  const SHAFT = 655, STOP = 30, SLEEVE = 415, COLLAR = 40; // mm from the bar's centre
  const T = {
    he: {
      title: 'חדר המשקולות', close: 'חזרה לכניסה', lift: 'להרים', strip: 'לפרק', unit: 'ק״ג', rack: 'צלחות',
      hint: 'לגעת בצלחת כדי להעמיס זוג · לגרור את המוט למעלה',
      best: 'השיא שלך', add: kg => `להוסיף זוג צלחות של ${kg} ק״ג`,
      tags: ['מוט ריק', 'חימום', 'סט עבודה', 'כבד', 'טריטוריית שיא', 'אגדה'],
      full: 'השרוול מלא', heavy: 'כבד מדי. אולי צלחת אחת פחות?', locked: 'נעול!', pr: 'שיא חדש!',
      say: kg => `על המוט ${kg} ק״ג`
    },
    en: {
      title: 'The platform', close: 'Back to sign-in', lift: 'Lift', strip: 'Strip', unit: 'KG', rack: 'Plates',
      hint: 'Tap a plate to load a pair · drag the bar up',
      best: 'Your best', add: kg => `Add a pair of ${kg} kg plates`,
      tags: ['Empty bar', 'Warm-up', 'Working set', 'Heavy', 'PR territory', 'Legend'],
      full: 'Sleeve full', heavy: 'Too heavy. One plate less?', locked: 'Locked out!', pr: 'New PR!',
      say: kg => `${kg} kg on the bar`
    }
  };
  const lang = () => (html.lang === 'en' ? 'en' : 'he');
  const tr = () => T[lang()];
  const fx = () => window.ydxFX || {};
  const chalk = () => (fx().chalk && fx().chalk()) || null;
  const reduced = () => RM.matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- state (kept between openings) ----
  const load = [];            // plate indices on each sleeve, inner -> outer
  const flying = [];          // plates on their way to the bar
  const falling = [];         // stripped plates tumbling off
  let best = 0;
  try { best = +localStorage.getItem('ydx-form-best') || 0; } catch (e) { /* private mode */ }
  let h = 0, v = 0, holding = false, ht = 0, bend = 0, bendV = 0, rattle = 0, shake = 0, lockT = 0, locked = 0;
  let auto = 0, stallT = 0, dispKg = 20, lastV = 0, tagMsg = '', tagUntil = 0;
  let root = null, cv = null, ctx = null, ui = {}, raf = 0, last = 0, W = 0, H = 0, dpr = 1, G = null, opener = null;
  let drag = null;

  const total = () => 20 + 2 * load.reduce((s, i) => s + PLATES[i].kg, 0);
  const used = () => load.reduce((s, i) => s + PLATES[i].mm, 0) + flying.filter(f => f.side === 1).reduce((s, f) => s + PLATES[f.pi].mm, 0);

  // ---- geometry (CSS px) ----
  function layout() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const narrow = W < 640;
    const barLen = Math.min(W - (narrow ? 14 : 80), 1180);
    const u = barLen / 2200;                     // px per mm
    const dia = Math.min(520 * u * (narrow ? 1.25 : 1), H * .26); // stylised bumper diameter
    const dockH = narrow ? 178 : 128;
    const floorY = Math.min(H - dockH - 26, H * .8);
    // overhead, the bar stops just under the readout (never across the number)
    const read = root && root.querySelector('.ydx-play-read');
    const readBottom = read ? read.getBoundingClientRect().bottom : (narrow ? 150 : 190);
    const liftPx = Math.max(60, Math.min(floorY - dia * .5 - readBottom - 24 - (narrow ? 0 : 20), H * .4));
    G = { u, dia, floorY, liftPx, cx: W / 2, barLen, shaftR: Math.max(3, 14 * u * (narrow ? 1.3 : 1)), sleeveR: Math.max(6, 25 * u * (narrow ? 1.3 : 1)) };
    draw();
  }
  const restY = () => {
    let r = G.sleeveR;
    for (const i of load) r = Math.max(r, G.dia * PLATES[i].dia / 2);
    return G.floorY - r;
  };
  const barY = () => restY() - h;
  // bar curve: centre at barY, ends sag by `bend` (whip)
  const yAt = mm => barY() + bend * Math.pow(Math.min(1, Math.abs(mm) / 1100), 2);
  const xAt = (mm, side) => G.cx + side * mm * G.u;
  function slotMM(index) { // centre of plate `index` on a sleeve (mm from bar centre)
    let s = SHAFT + STOP;
    for (let k = 0; k < index; k++) s += PLATES[load[k]].mm;
    return s + PLATES[load[index]].mm / 2;
  }

  // ---- drawing ----
  function rr(x, y, w, hh, r) {
    r = Math.min(r, w / 2, hh / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function plateShape(cx, cy, w, hh, r, col, rot) {
    ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot);
    rr(-w / 2, -hh / 2, w, hh, r);
    ctx.fillStyle = col; ctx.fill();
    // moulded light: top highlight, bottom shade (like the loader's plates)
    const g = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
    g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.18, 'rgba(255,255,255,0)');
    g.addColorStop(.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  function steel(y0, y1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#f0f1f2'); g.addColorStop(.45, '#c5c8cc'); g.addColorStop(1, '#7f838a');
    return g;
  }
  function drawBar() {
    const u = G.u, sR = G.shaftR, slR = G.sleeveR;
    // shadows on the platform
    const lift = clamp(h / G.liftPx, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${.45 - lift * .3})`;
    for (const side of [-1, 1]) {
      const x = xAt(SHAFT + SLEEVE * .45, side);
      ctx.beginPath(); ctx.ellipse(x, G.floorY + 4, 90 * u * (1 + lift * .8) + 20, 6 + lift * 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    // shaft (a sagging curve) with knurl marks
    ctx.lineCap = 'round';
    ctx.strokeStyle = steel(barY() - sR, barY() + sR); ctx.lineWidth = sR * 2;
    ctx.beginPath();
    for (let mm = -SHAFT; mm <= SHAFT; mm += 55) { const x = xAt(mm, 1), y = yAt(mm); mm === -SHAFT ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(17,17,17,.22)'; ctx.lineWidth = 1;
    for (const side of [-1, 1]) for (let mm = 160; mm < 600; mm += 14) {
      const x = xAt(mm, side), y = yAt(mm);
      ctx.beginPath(); ctx.moveTo(x, y - sR * .8); ctx.lineTo(x + side * 3, y + sR * .8); ctx.stroke();
    }
    for (const side of [-1, 1]) {
      // inner stop
      const sx = xAt(SHAFT + STOP / 2, side), sy = yAt(SHAFT);
      ctx.fillStyle = steel(sy - slR * 1.9, sy + slR * 1.9);
      rr(sx - STOP * u / 2 - 1, sy - slR * 1.9, STOP * u + 2, slR * 3.8, 2); ctx.fill();
      // sleeve
      const a = SHAFT + STOP, b = SHAFT + STOP + SLEEVE;
      ctx.strokeStyle = steel(yAt(a) - slR, yAt(a) + slR); ctx.lineWidth = slR * 2; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(xAt(a, side), yAt(a)); ctx.lineTo(xAt(b, side), yAt(b)); ctx.stroke();
      ctx.strokeStyle = 'rgba(17,17,17,.18)'; ctx.lineWidth = 1;
      for (let mm = a + 20; mm < b; mm += 30) { const x = xAt(mm, side), y = yAt(mm); ctx.beginPath(); ctx.moveTo(x, y - slR); ctx.lineTo(x, y + slR); ctx.stroke(); }
      // plates, inner -> outer; outer ones rattle more on impact
      load.forEach((pi, k) => {
        const p = PLATES[pi], mm = slotMM(k);
        const jig = rattle * Math.sin(last * .09 + k * 2.1 + side) * (1 + k * .5) * 1.6;
        const slope = 2 * bend * mm / (1100 * 1100) / u;
        plateShape(xAt(mm, side) + jig, yAt(mm), p.mm * u - .5, G.dia * p.dia, Math.max(2, p.mm * u * .25), p.c, Math.atan(slope) * side * .6);
      });
      // spring collar after the last plate: locks (green) at the top
      if (load.length) {
        const mm = slotMM(load.length - 1) + PLATES[load[load.length - 1]].mm / 2 + COLLAR / 2;
        const x = xAt(mm, side), y = yAt(mm);
        rr(x - COLLAR * u / 2, y - slR * 1.5, COLLAR * u, slR * 3, 2);
        ctx.fillStyle = locked > 0 ? `rgb(${Math.round(185 - 163 * locked)},${Math.round(188 - 25 * locked)},${Math.round(193 - 119 * locked)})` : '#b9bcc1'; ctx.fill();
      }
    }
  }
  function drawFlying(now) {
    for (const f of flying) {
      const s = clamp((now - f.t0) / f.dur, 0, 1);
      const e = 1 - Math.pow(1 - s, 3);
      const p = PLATES[f.pi], dia = G.dia * p.dia;
      // target: where this plate will sit (computed live, the bar may move)
      const k = load.length + f.order;
      let mm = SHAFT + STOP; for (let i = 0; i < load.length; i++) mm += PLATES[load[i]].mm;
      for (const o of flying) if (o.side === f.side && o.order < f.order) mm += PLATES[o.pi].mm;
      mm += p.mm / 2;
      const tx = xAt(mm, f.side), ty = yAt(mm);
      const x = f.x0 + (tx - f.x0) * e, y = f.y0 + (ty - f.y0) * e - Math.sin(Math.PI * s) * f.arc;
      const fromW = f.size, w = fromW + (p.mm * G.u - fromW) * e, hh = fromW + (dia - fromW) * e;
      plateShape(x, y, Math.max(1, w), hh, Math.max(2, w / 2 * (1 - e) + 3 * e), p.c, (1 - e) * f.spin);
      if (s === 1) f.done = k;
    }
  }
  function drawFalling(dt) {
    for (const f of falling) {
      f.vy += 2600 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      const p = PLATES[f.pi];
      ctx.globalAlpha = clamp(1 - (f.y - G.floorY) / 160, 0, 1);
      plateShape(f.x, f.y, p.mm * G.u, G.dia * p.dia, 3, p.c, f.rot);
      ctx.globalAlpha = 1;
    }
    for (let i = falling.length - 1; i >= 0; i--) if (falling[i].y > H + 200 || falling[i].y - G.floorY > 160) falling.splice(i, 1);
  }
  function drawPlatform() {
    const y = G.floorY, x0 = G.cx - G.barLen * .62, x1 = G.cx + G.barLen * .62;
    ctx.fillStyle = '#1a1a19'; ctx.fillRect(x0, y, x1 - x0, 20);
    ctx.fillStyle = '#262624'; ctx.fillRect(x0 + (x1 - x0) * .22, y, (x1 - x0) * .56, 20); // wooden centre
    ctx.fillStyle = 'rgba(243,241,234,.16)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
    ctx.fillStyle = 'rgba(243,241,234,.06)'; ctx.fillRect(0, y + 20, W, 1);
  }
  function draw(now = performance.now()) {
    if (!ctx || !G) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (shake > .05) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawPlatform();
    drawBar();
    drawFlying(now);
  }

  // ---- simulation ----
  function step(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
    const kg = total(), plateKg = kg - 20;
    const strength = clamp((290 - kg) / 270, 0, 1);
    const prevV = v;
    if (holding && G) {
      const target = ht * G.liftPx;
      const vmax = G.liftPx * (.25 + 2.6 * strength);
      if (strength < .05) { // too heavy: it grinds, a few px at most
        v = 0; h = clamp(h + (Math.min(target, 4) - h) * .2, 0, 4);
        stallT += dt;
        if (stallT > .5 && tagMsg !== tr().heavy) say(tr().heavy, 2200);
      } else {
        v += ((target - h) * 70 - v * 14) * dt;
        v = clamp(v, -vmax * 1.4, vmax);
        h = clamp(h + v * dt, 0, G.liftPx);
        if (h >= G.liftPx * .97 && ht > .95) {
          lockT += dt;
          if (lockT > .45 && !locked) lockout(kg);
        } else lockT = 0;
      }
    } else if (G && (h > 0 || v !== 0)) {
      v -= 2400 * dt; h += v * dt;
      if (h <= 0) {
        h = 0;
        if (v < -140) impact(-v, kg); else v = 0;
        v = v < -140 ? -v * .24 : 0;
      }
    }
    if (auto && holding) {
      auto -= dt;
      if (auto <= 0 || (locked && lockT > 1.05) || stallT > 1.6) { holding = false; auto = 0; }
    }
    // whip: the ends lag behind the centre's acceleration (more plates, more whip)
    const acc = (v - prevV) / Math.max(dt, .001);
    const whip = clamp(acc * .0016 * (plateKg / (kg || 1)) * (1 + plateKg / 120), -G.dia * .35, G.dia * .35);
    bendV += ((whip - bend) * 190 - bendV * 7) * dt; bend += bendV * dt;
    rattle *= Math.exp(-dt * 7); shake *= Math.exp(-dt * 12);
    if (!holding) { locked *= Math.exp(-dt * 2.5); if (locked < .02) locked = 0; }
    dispKg += (kg - dispKg) * (1 - Math.exp(-dt * 10));
    if (Math.abs(kg - dispKg) < .05) dispKg = kg;
    updateReadout();
    // landed plates
    for (let f; (f = flying.find(o => o.done !== undefined && o.side === 1 && o.order === 0));) {
      const twin = flying.find(o => o.side === -1 && o.order === 0);
      load.push(f.pi);
      flying.splice(flying.indexOf(f), 1); if (twin) flying.splice(flying.indexOf(twin), 1);
      flying.forEach(o => { o.order--; });
      clang(f.pi);
    }
    draw(now);
    drawFalling(dt);
    lastV = v;
    const busy = flying.length || falling.length || holding || h > 0 || Math.abs(v) > 1 || Math.abs(bend) > .2 || Math.abs(bendV) > 1 || rattle > .02 || shake > .05 || Math.abs(kg - dispKg) > 0 || locked > 0;
    if (busy && root) raf = requestAnimationFrame(step); else last = 0;
  }
  const kick = () => { if (!raf && root) { last = 0; raf = requestAnimationFrame(step); } };

  function clang(pi) {
    const p = PLATES[pi];
    bendV += 90 * (p.kg / 25); rattle = Math.min(1.4, rattle + .7);
    const c = chalk();
    if (c && p.dia === 1) for (const side of [-1, 1]) c.clap(xAt(SHAFT + 200, side), G.floorY, .35);
    if (c) c.setTint(p.c);
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* unsupported */ }
    announce();
  }
  function impact(speed, kg) {
    const k = clamp(speed / 900, .2, 1.2) * clamp(kg / 140, .25, 1.4);
    if (!reduced()) shake = Math.min(12, 3 + k * 8);
    rattle = 1.3; bendV += speed * .35 * (load.length ? 1 : .3);
    const c = chalk();
    if (c) for (const side of [-1, 1]) c.clap(xAt(SHAFT + 220, side), G.floorY, clamp(k, .3, 1.6));
    try { navigator.vibrate && navigator.vibrate(Math.round(10 + k * 20)); } catch (e) { /* unsupported */ }
  }
  function lockout(kg) {
    locked = 1;
    const isPR = kg > best && kg > 20;
    if (isPR) { best = kg; try { localStorage.setItem('ydx-form-best', String(best)); } catch (e) { /* private mode */ } }
    say(isPR ? tr().pr : tr().locked, 1800);
    if (isPR && kg >= 60 && fx().burst && !reduced()) {
      fx().burst(G.cx, barY() - 40, { count: 46, power: 1.25 });
    }
    const c = chalk(); if (c) c.clap(G.cx, barY(), .8);
    updateReadout(true);
  }

  // ---- actions ----
  function addPair(pi, from) {
    if (h > 2 || holding) { lower(); }
    const p = PLATES[pi];
    if (used() + p.mm + COLLAR > SLEEVE) { say(tr().full, 1600); nudge(); return; }
    if (reduced()) { load.push(pi); clang(pi); draw(); kick(); return; }
    const order = flying.filter(f => f.side === 1).length;
    const r = from || { x: G.cx, y: H - 60, size: 40 };
    const now = performance.now();
    for (const side of [-1, 1]) flying.push({ pi, side, order, x0: r.x, y0: r.y, size: r.size, t0: now + (side === 1 ? 40 : 0), dur: 520, arc: 70 + Math.random() * 40, spin: (Math.random() - .5) * 1.4 });
    kick();
  }
  function popPair(fly = true) {
    if (!load.length) return;
    const pi = load.pop(), k = load.length;
    if (fly && !reduced()) {
      let mm = SHAFT + STOP; for (let i = 0; i < k; i++) mm += PLATES[load[i]].mm; mm += PLATES[pi].mm / 2;
      for (const side of [-1, 1]) falling.push({ pi, x: xAt(mm, side), y: yAt(mm), vx: side * (180 + Math.random() * 140), vy: -420 - Math.random() * 200, rot: 0, vr: side * (3 + Math.random() * 3) });
    }
    rattle = .6; announce(); kick();
  }
  function strip() {
    lower();
    const n = load.length;
    for (let i = 0; i < n; i++) setTimeout(() => popPair(), reduced() ? 0 : i * 70);
  }
  function lower() { holding = false; auto = 0; drag = null; }
  function liftRep() {
    if (holding) return;
    stallT = 0; lockT = 0; locked = 0;
    if (reduced()) { // still frame at the top, then back down
      h = G.liftPx * (total() < 280 ? 1 : 0); if (h) lockout(total()); else say(tr().heavy, 2000);
      draw(); setTimeout(() => { h = 0; v = 0; locked = 0; draw(); updateReadout(); }, 900);
      return;
    }
    holding = true; ht = 1; auto = 2.8; kick();
  }
  function nudge() { if (!reduced()) { bendV -= 40; rattle = 1; kick(); } }

  // ---- readout / announcements ----
  function tagFor(kg) { return tr().tags[kg <= 20 ? 0 : kg < 60 ? 1 : kg < 120 ? 2 : kg < 180 ? 3 : kg < 250 ? 4 : 5]; }
  function say(msg, ms) { tagMsg = msg; tagUntil = performance.now() + ms; updateReadout(true); setTimeout(() => updateReadout(true), ms + 20); }
  let lastRead = '';
  function updateReadout(force) {
    if (!ui.kg) return;
    const kgNow = total();
    const shown = Math.abs(kgNow - dispKg) < .3 ? kgNow : Math.round(dispKg); // ½ only on the final value
    const txt = String(shown).replace('.5', '½');
    if (txt !== lastRead || force) { ui.kg.textContent = txt; lastRead = txt; }
    if (force || Math.round(dispKg) === total()) {
      const msg = performance.now() < tagUntil ? tagMsg : tagFor(total());
      if (ui.tag.textContent !== msg) ui.tag.textContent = msg;
      ui.tag.classList.toggle('is-msg', performance.now() < tagUntil);
      ui.best.textContent = best ? `${tr().best} · ${best} ${tr().unit}` : '';
    }
  }
  let annT = 0;
  function announce() { clearTimeout(annT); annT = setTimeout(() => { if (ui.live) ui.live.textContent = tr().say(total()); }, 450); }

  // ---- DOM ----
  function build() {
    const t = tr();
    root = d.createElement('div');
    root.className = 'ydx-play';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'ydx-play-title');
    root.innerHTML = `
      <canvas class="ydx-play-cv" aria-hidden="true"></canvas>
      <div class="ydx-play-top">
        <p class="ydx-play-mark" aria-hidden="true">F<i></i>RM</p>
        <h2 class="ydx-play-title" id="ydx-play-title"></h2>
        <button type="button" class="ydx-play-x"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      </div>
      <div class="ydx-play-read" aria-hidden="true"><p class="ydx-play-num"><b></b><span></span></p><p class="ydx-play-tag"></p><p class="ydx-play-best"></p></div>
      <p class="ydx-play-live" aria-live="polite"></p>
      <div class="ydx-play-dock">
        <div class="ydx-play-rack" role="group"></div>
        <div class="ydx-play-acts"><button type="button" class="ydx-play-strip"></button><button type="button" class="ydx-play-lift"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span></button></div>
        <p class="ydx-play-hint"></p>
      </div>`;
    cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
    ui = {
      kg: root.querySelector('.ydx-play-num b'), unit: root.querySelector('.ydx-play-num span'), tag: root.querySelector('.ydx-play-tag'),
      best: root.querySelector('.ydx-play-best'), live: root.querySelector('.ydx-play-live'), rack: root.querySelector('.ydx-play-rack'),
      x: root.querySelector('.ydx-play-x'), lift: root.querySelector('.ydx-play-lift'), strip: root.querySelector('.ydx-play-strip'),
      title: root.querySelector('.ydx-play-title'), hint: root.querySelector('.ydx-play-hint')
    };
    PLATES.forEach((p, i) => {
      const b = d.createElement('button');
      b.type = 'button'; b.className = 'ydx-plate-btn'; b.dataset.i = i;
      b.style.setProperty('--c', p.c); b.style.setProperty('--s', p.dia === 1 ? 1 : p.dia + .22);
      b.style.setProperty('--n', i);
      b.innerHTML = '<i aria-hidden="true"></i><span></span>';
      ui.rack.appendChild(b);
    });
    texts();
    // rack: tap to load a pair; drag a plate up onto the bar to load it too
    ui.rack.addEventListener('click', e => {
      const b = e.target.closest('.ydx-plate-btn'); if (!b) return;
      if (b.dataset.dragged === '1') { b.dataset.dragged = ''; return; }
      addPair(+b.dataset.i, rackFrom(b));
    });
    ui.rack.addEventListener('pointerdown', e => {
      const b = e.target.closest('.ydx-plate-btn'); if (!b || e.button) return;
      const sx = e.clientX, sy = e.clientY;
      const move = ev => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 14 && !b.dataset.dragged) {
          b.dataset.dragged = '1'; cleanup();
          addPair(+b.dataset.i, { x: ev.clientX, y: ev.clientY, size: 46 });
        }
      };
      const cleanup = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', cleanup); removeEventListener('pointercancel', cleanup); };
      addEventListener('pointermove', move, { passive: true }); addEventListener('pointerup', cleanup); addEventListener('pointercancel', cleanup);
    });
    ui.lift.addEventListener('click', liftRep);
    ui.strip.addEventListener('click', strip);
    ui.x.addEventListener('click', close);
    // canvas: drag the bar up to lift; a tap on a plate stack strips its outer pair
    cv.addEventListener('pointerdown', e => {
      if (!G) return;
      const y = barY(), near = Math.abs(e.clientY - y) < Math.max(40, G.dia * .55);
      const span = Math.abs(e.clientX - G.cx) < G.barLen / 2 + 10;
      if (!near || !span) return;
      cv.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, y0: e.clientY, h0: h, moved: false, onPlates: Math.abs(e.clientX - G.cx) > (SHAFT) * G.u };
      stallT = 0; lockT = 0;
    });
    cv.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = drag.y0 - e.clientY;
      if (!drag.moved && Math.abs(dy) > 6) { drag.moved = true; holding = true; auto = 0; }
      if (drag.moved) { ht = clamp((drag.h0 + dy) / G.liftPx, 0, 1); kick(); }
    });
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const tap = !drag.moved && drag.onPlates;
      drag = null; holding = false; kick();
      if (tap) popPair();
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if ((e.key === ' ' || e.key === 'ArrowUp') && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); liftRep(); }
      else if (e.key === 'Tab') trap(e);
    });
    // the page underneath (Lenis smooth scroll) must not move
    const stop = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
    root.addEventListener('wheel', stop, { passive: false });
    root.addEventListener('touchmove', stop, { passive: false });
  }
  function texts() {
    if (!root) return;
    const t = tr();
    ui.title.textContent = t.title; ui.unit.textContent = ' ' + t.unit; ui.hint.textContent = t.hint;
    ui.x.setAttribute('aria-label', t.close); ui.rack.setAttribute('aria-label', t.rack);
    ui.lift.querySelector('span').textContent = t.lift; ui.strip.textContent = t.strip;
    ui.rack.querySelectorAll('.ydx-plate-btn').forEach(b => {
      const p = PLATES[+b.dataset.i];
      b.querySelector('span').textContent = String(p.kg);
      b.setAttribute('aria-label', t.add(p.kg));
    });
    root.setAttribute('dir', html.dir || 'rtl'); root.setAttribute('lang', lang());
    updateReadout(true);
  }
  function rackFrom(b) {
    const r = b.querySelector('i').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width };
  }
  function trap(e) {
    const f = [...root.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent);
    if (!f.length) return;
    const a = d.activeElement, first = f[0], lastB = f[f.length - 1];
    if (e.shiftKey && (a === first || !root.contains(a))) { e.preventDefault(); lastB.focus(); }
    else if (!e.shiftKey && (a === lastB || !root.contains(a))) { e.preventDefault(); first.focus(); }
  }
  const insetOf = r => r ? `inset(${Math.max(0, r.top)}px ${Math.max(0, innerWidth - r.right)}px ${Math.max(0, innerHeight - r.bottom)}px ${Math.max(0, r.left)}px)` : 'inset(50% 50% 50% 50%)';

  // ---- open / close ----
  let isOpen = false, rootInert = false;
  function open(opts = {}) {
    if (isOpen) return;
    isOpen = true;
    opener = opts.opener || d.activeElement;
    if (!root) build(); else texts();
    d.body.appendChild(root);
    html.classList.add('ydx-playing');
    const app = d.getElementById('root');
    if (app) { rootInert = app.inert; app.inert = true; }
    if (opener && opener.classList && opener.classList.contains('ydx-play-chip')) opener.inert = true;
    layout();
    addEventListener('resize', layout);
    const c = chalk(); if (c) { c.setMode('play'); c.setTint(load.length ? PLATES[load[load.length - 1]].c : '#e3242b'); }
    root.classList.toggle('has-gl', !!(c && c.canvas.getAttribute('data-state') === 'ready'));
    // the poster opens up into the room: clip from the poster's rect to full
    const from = insetOf(opts.rect);
    const floor = c && c.canvas;
    if (!reduced()) {
      const k = [{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px)' }];
      root.animate(k, { duration: 720, easing: EASE_WIPE });
      if (floor) floor.animate(k, { duration: 720, easing: EASE_WIPE });
      root.classList.add('is-entering');
      setTimeout(() => root && root.classList.remove('is-entering'), 1400);
    } else root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    // first visit: put a warm-up on the bar so there is something to lift
    if (!load.length && !opts.keep && !flying.length) {
      setTimeout(() => { if (isOpen && !load.length) { addPair(0, { x: G.cx - 160, y: -80, size: G.dia }); } }, reduced() ? 0 : 620);
    }
    updateReadout(true); announce(); kick();
    setTimeout(() => { const b = ui.rack.querySelector('.ydx-plate-btn'); if (b && isOpen) b.focus({ preventScroll: true }); }, reduced() ? 0 : 380);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    lower();
    removeEventListener('resize', layout);
    const c = chalk();
    const done = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      last = 0;
      root && root.remove();
      html.classList.remove('ydx-playing');
      const app = d.getElementById('root');
      if (app) app.inert = rootInert;
      if (opener) { opener.inert = false; if (opener.isConnected) opener.focus({ preventScroll: true }); }
      if (c) { c.setMode(fx().mode ? fx().mode() : 'signin'); c.setTint('#e3242b'); }
      h = 0; v = 0; bend = 0; bendV = 0; flying.length = 0; falling.length = 0;
    };
    const poster = d.querySelector('.signin-poster');
    if (reduced()) { root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.then(done, done); return; }
    const k = [{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: insetOf(poster && poster.getBoundingClientRect()) }];
    const a = root.animate(k, { duration: 560, easing: EASE_WIPE, fill: 'forwards' });
    if (c) c.canvas.animate(k, { duration: 560, easing: EASE_WIPE });
    a.finished.then(done, done);
  }
  new MutationObserver(() => { if (isOpen) texts(); }).observe(html, { attributes: true, attributeFilter: ['lang', 'dir'] });

  window.ydxPlay = { open, close, isOpen: () => isOpen, total, _state: () => ({ load: load.slice(), h, v, bend, flying: flying.length, holding, locked, best, G }) };
})();
