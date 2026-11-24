/* PEEL CLUB · ydx fizz lab (/lab/)
   "Move a little. Feel the fizz." taken literally: grab the can and shake it. Shaking builds the fizz (the meter, the
   can starts to tremble, the soda field behind the page fizzes harder). At 100% crack it open: a spray of bubbles,
   a burst ring through the soda field, and the brand's squeeze headline. Bubbles can be popped with the pointer.
   Inputs: mouse/pen/touch drag, keyboard (Space / arrows shake, Enter cracks), and on phones an opt-in device shake.
   The bubbles are a small 2D canvas inside the section (behind the type), the field is the shared ydx/soda.js layer.
   Vanilla, no dependencies; the loop sleeps whenever nothing moves. */
(() => {
  if (window.__ydxLab) return;
  window.__ydxLab = true;
  const go = () => {
    const lab = document.querySelector('.lab');
    if (!lab) return;
    const $ = s => lab.querySelector(s);
    const d = document.documentElement;
    const RM = matchMedia('(prefers-reduced-motion: reduce)');
    const can = $('#lab-can'), inner = $('.lab__canin'), cv = $('.lab__fizz'), stage = $('.lab__stage');
    const numEl = $('#lab-num'), barEl = $('#lab-bar'), crackBtn = $('#lab-crack'), tiltBtn = $('#lab-tilt');
    const statusEl = $('#lab-status'), poppedEl = $('#lab-popped'), crackedEl = $('#lab-cracked'), popEl = $('.lab__pop');
    const ctx = cv.getContext('2d');
    const soda = () => (d.classList.contains('ydx-gl') ? window.__ydxSodaField : null);
    const anim = (el, kf, o) => { const a = el.animate(kf, o); a.finished.catch(() => {}); return a; };
    const OUT = 'cubic-bezier(.16,1,.3,1)';
    d.classList.add('ydx-lab');

    /* ---- state ---- */
    let pressure = 0, ready = false, popped = 0, cracked = 0, announced = 0;
    const p = { x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 }; // can offset from its rest position (css px) + rotation (deg)
    let drag = null, moved = 0, suppressClick = false, lastInput = performance.now();
    const bubbles = [], pops = [];
    let ptr = null; // pointer in section coordinates while it is over the lab (mouse) or pressed (touch)
    let ink = 'rgba(255,255,255,.8)';
    let W = 0, H = 0, dpr = 1, rect = lab.getBoundingClientRect();
    let raf = 0, last = 0, visible = true;

    const say = msg => { statusEl.textContent = ''; setTimeout(() => { statusEl.textContent = msg; }, 30); };
    function colours() {
      const cs = getComputedStyle(d);
      const field = cs.getPropertyValue('--field'), on = cs.getPropertyValue('--on');
      if (window.ydxSoda) { const h = window.ydxSoda.palette(field, on).hi; ink = `rgb(${h.map(v => Math.round(v * 255)).join(',')})`; }
      else ink = on.trim() || ink;
    }
    colours();
    new MutationObserver(colours).observe(d, { attributes: true, attributeFilter: ['data-flavor'] });
    addEventListener('load', colours, { once: true }); // soda.js (which knows the AA-safe tint) may arrive after this file

    function size() {
      rect = lab.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
      if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; }
    }
    new ResizeObserver(() => { size(); wake(); }).observe(lab);
    size();

    /* ---- the meter ---- */
    let shown = -1;
    function meter() {
      const pc = Math.round(pressure * 100);
      if (pc === shown) return;
      shown = pc;
      numEl.textContent = pc + '%';
      barEl.style.transform = `scaleX(${(pc / 100).toFixed(2)})`;
      const step = Math.floor(pc / 25);
      if (step > announced && step < 4) { announced = step; say(`Fizz ${step * 25}%`); }
      if (pressure < 0.2) announced = Math.min(announced, 0);
      if (!ready && pressure >= 1) {
        ready = true; lab.classList.add('is-ready'); crackBtn.disabled = false;
        say('Fizz 100%. Ready to crack. Press Enter on the can or use the Crack it open button.');
        navigator.vibrate?.(14);
      }
      soda()?.setFizz(Math.min(1.2, pressure * 1.1));
    }
    function addPressure(v) { if (ready) return; pressure = Math.min(1, pressure + v); lastInput = performance.now(); }

    /* ---- bubbles ---- */
    const MAX = RM.matches ? 40 : 260;
    function bubble(x, y, vx, vy, r, life) {
      if (bubbles.length >= MAX) bubbles.shift();
      bubbles.push({ x, y, vx, vy, r, age: 0, life: life || 5 + Math.random() * 3, wob: Math.random() * 6.28, sp: Math.hypot(vx, vy) > 300 });
    }
    // the can's top centre (where the tab is) in section coordinates, following its rotation
    function canTop() {
      // layout offsets (untransformed rest position) + the spring offset; no rect read after a transform write
      const cx = stage.offsetLeft + can.offsetLeft + can.offsetWidth / 2 + p.x, cy = stage.offsetTop + can.offsetTop + can.offsetHeight / 2 + p.y;
      const h = can.offsetHeight * 0.47, a = p.r * Math.PI / 180;
      return { x: cx + Math.sin(a) * h, y: cy - Math.cos(a) * h, a };
    }

    /* ---- crack ---- */
    function crack() {
      lastInput = performance.now();
      const t = canTop();
      if (!ready) {
        for (let i = 0; i < 6; i++) bubble(t.x + (Math.random() - 0.5) * 30, t.y, (Math.random() - 0.5) * 40, -60 - Math.random() * 60, 3 + Math.random() * 5, 2);
        if (!RM.matches) { p.vr += (Math.random() < 0.5 ? -1 : 1) * 6; }
        say(pressure < 0.05 ? 'Shake it first: drag the can back and forth, or press Space.' : `Only ${Math.round(pressure * 100)}% fizz. Shake harder.`);
        wake();
        return;
      }
      ready = false; lab.classList.remove('is-ready'); crackBtn.disabled = true;
      cracked++; crackedEl.textContent = cracked; pressure = 0; announced = 0;
      const n = RM.matches ? 24 : 160;
      for (let i = 0; i < n; i++) {
        const a = t.a + (Math.random() - 0.5) * 1.1, s = RM.matches ? 60 : 420 + Math.random() * 1150;
        bubble(t.x + (Math.random() - 0.5) * 16, t.y, Math.sin(a) * s, -Math.cos(a) * s, 2.5 + Math.random() * Math.random() * 15, 4 + Math.random() * 4);
      }
      const sf = soda();
      if (sf) { sf.burst(t.x + rect.left, t.y + rect.top, Math.max(innerWidth, innerHeight) * 0.75); sf.setFizz(1.5); }
      if (!RM.matches) {
        p.vy += 22; p.vr += (Math.random() - 0.5) * 18;
        anim(inner, [{ transform: 'scale(1)' }, { transform: 'scale(1.12,.86)', offset: 0.18 }, { transform: 'scale(.95,1.06)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 700, easing: OUT });
        anim(popEl, [
          { opacity: 0, transform: 'scaleX(.45) translateY(10px)' },
          { opacity: 1, transform: 'none', offset: 0.22 },
          { opacity: 1, transform: 'none', offset: 0.72 },
          { opacity: 0, transform: 'translateY(-24px) scaleX(1.05)' },
        ], { duration: 2100, easing: OUT });
      } else anim(popEl, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1800 });
      navigator.vibrate?.([12, 40, 26]);
      say(`Pssssht. Cracked! That is can number ${cracked}. Shake it up again.`);
      meter();
      wake();
    }

    /* ---- input: drag ---- */
    can.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      can.setPointerCapture?.(e.pointerId);
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, tx: p.x, ty: p.y };
      moved = 0; lastInput = performance.now();
      wake();
    });
    can.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      moved = Math.max(moved, Math.hypot(dx, dy));
      const lx = stage.clientWidth * 0.5, ly = stage.clientHeight * 0.42;
      drag.tx = Math.max(-lx, Math.min(lx, drag.ox + dx));
      drag.ty = Math.max(-ly, Math.min(ly, drag.oy + dy));
    });
    const endDrag = e => { if (!drag || (e && e.pointerId !== drag.id)) return; suppressClick = moved > 6; drag = null; wake(); };
    can.addEventListener('pointerup', endDrag);
    can.addEventListener('pointercancel', endDrag);
    can.addEventListener('lostpointercapture', endDrag);
    can.addEventListener('click', e => {
      if (suppressClick) { suppressClick = false; return; }
      if (spaceClick) { spaceClick = false; return; }
      crack();
    });
    crackBtn.addEventListener('click', crack);

    /* ---- input: keyboard (Space / arrows shake; Enter cracks through the button's click) ---- */
    let spaceClick = false;
    const KICK = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ' ': null };
    can.addEventListener('keydown', e => {
      if (!(e.key in KICK)) return;
      e.preventDefault();
      if (e.key === ' ') spaceClick = true;
      const k = KICK[e.key] || [(Math.random() < 0.5 ? -1 : 1), (Math.random() - 0.5)];
      const f = RM.matches ? 4 : 13;
      p.vx += k[0] * f; p.vy += k[1] * f; p.vr += k[0] * (RM.matches ? 2 : 7);
      addPressure(0.07);
      const t = canTop();
      bubble(t.x, t.y, (Math.random() - 0.5) * 50, -80, 3 + Math.random() * 6, 2.5);
      wake();
    });
    can.addEventListener('keyup', e => { if (e.key === ' ') { e.preventDefault(); setTimeout(() => { spaceClick = false; }, 0); } });

    /* ---- input: pointer pops bubbles (hover with a mouse, press and drag with a finger) ---- */
    lab.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && !e.pressure) return;
      ptr = { x: e.clientX - rect.left, y: e.clientY - rect.top }; wake();
    }, { passive: true });
    lab.addEventListener('pointerdown', e => { ptr = { x: e.clientX - rect.left, y: e.clientY - rect.top }; wake(); }, { passive: true });
    lab.addEventListener('pointerleave', () => { ptr = null; });
    lab.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') ptr = null; });

    /* ---- input: phone shake (opt-in; iOS asks for permission inside the tap) ---- */
    const DM = window.DeviceMotionEvent;
    if (DM && matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0) {
      tiltBtn.hidden = false;
      let lastA = null, on = false;
      const onMotion = e => {
        const a = e.accelerationIncludingGravity || e.acceleration;
        if (!a || a.x == null) return;
        if (lastA) {
          const jx = a.x - lastA.x, jy = a.y - lastA.y, jz = (a.z || 0) - (lastA.z || 0), j = Math.hypot(jx, jy, jz);
          if (j > 5) { addPressure(Math.min(j, 40) * 0.0016); p.vx -= jx * 0.8; p.vy += jy * 0.8; p.vr -= jx * 0.5; wake(); }
        }
        lastA = { x: a.x, y: a.y, z: a.z };
      };
      tiltBtn.addEventListener('click', () => {
        if (on) return;
        const ask = typeof DM.requestPermission === 'function' ? DM.requestPermission() : Promise.resolve('granted');
        ask.then(s => {
          if (s !== 'granted') { say('Motion access was not allowed. Drag the can to shake it instead.'); return; }
          on = true; addEventListener('devicemotion', onMotion, { passive: true });
          tiltBtn.textContent = 'Phone shake is on'; say('Phone shake is on. Shake your phone to build the fizz.');
        }).catch(() => say('Motion is not available here. Drag the can to shake it instead.'));
      });
    }

    /* ---- the loop: can springs, shake energy, bubbles; sleeps when everything is still ---- */
    function wake() { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
    function loop(now) {
      raf = 0;
      const dt = last ? Math.min(now - last, 50) / 1000 : 1 / 60; last = now;
      const f = dt * 60;
      rect = lab.getBoundingClientRect();
      // can: a stiff spring towards the finger while dragging, a wobbly one back to rest after
      const tx = drag ? drag.tx : 0, ty = drag ? drag.ty : 0;
      const k = drag ? 0.32 : 0.075, damp = Math.pow(drag ? 0.62 : 0.84, f);
      const pvx = p.vx, pvy = p.vy;
      p.vx = (p.vx + (tx - p.x) * k * f) * damp; p.vy = (p.vy + (ty - p.y) * k * f) * damp;
      p.x += p.vx * f; p.y += p.vy * f;
      const rT = Math.max(-38, Math.min(38, p.vx * 1.4));
      p.vr = (p.vr + (rT - p.r) * 0.16 * f) * Math.pow(0.78, f); p.r += p.vr * f;
      // shake energy = how hard the can changes direction
      if (drag) {
        const acc = Math.hypot(p.vx - pvx, p.vy - pvy) / f;
        if (acc > 1.5) { addPressure(Math.min(acc, 40) * 0.0003 * f); }
        if (acc > 6 && Math.random() < 0.5) { const t = canTop(); bubble(t.x + (Math.random() - 0.5) * 20, t.y + 10, -p.vx * 6 + (Math.random() - 0.5) * 60, -p.vy * 6 - 40, 2 + Math.random() * 5, 1.6); }
      } else if (!ready && pressure > 0 && now - lastInput > 1600) pressure = Math.max(0, pressure - dt * 0.035); // it settles, slowly
      // a little leak through the tab once it is really fizzy
      if (pressure > 0.35 && Math.random() < pressure * dt * 14) { const t = canTop(); bubble(t.x + (Math.random() - 0.5) * 18, t.y + 4, (Math.random() - 0.5) * 40, -70 - Math.random() * 80, 2 + Math.random() * 4, 2.2); }
      const shake = !RM.matches && pressure > 0.55 ? (pressure - 0.55) * 5 : 0;
      const jx = shake ? (Math.random() - 0.5) * shake : 0, jy = shake ? (Math.random() - 0.5) * shake : 0;
      const sq = Math.min(0.07, Math.hypot(p.vx, p.vy) * 0.0022);
      can.style.transform = `translate(${(p.x + jx).toFixed(2)}px,${(p.y + jy).toFixed(2)}px) rotate(${(p.r + jx * 0.6).toFixed(2)}deg) scale(${(1 - sq * 0.6).toFixed(3)},${(1 + sq).toFixed(3)})`;
      meter();
      // bubbles
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W / dpr, H / dpr);
      ctx.strokeStyle = ctx.fillStyle = ink;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.age += dt;
        const term = -(38 + b.r * 9); // terminal rise speed: big bubbles rise faster
        const tau = b.sp && b.age < 0.5 ? 0.42 : 0.3;
        b.vy += (term - b.vy) * (1 - Math.exp(-dt / tau));
        b.vx *= Math.exp(-dt / (b.sp ? 0.5 : 0.8));
        b.x += (b.vx + Math.sin(b.age * 3 + b.wob) * 14) * dt; b.y += b.vy * dt;
        let gone = b.y < -40 || b.age > b.life || b.x < -40 || b.x > rect.width + 40;
        if (!gone && ptr && b.age > 0.15) {
          const dx = b.x - ptr.x, dy = b.y - ptr.y;
          if (dx * dx + dy * dy < (b.r + 12) * (b.r + 12)) {
            gone = true; popped++; poppedEl.textContent = popped;
            pops.push({ x: b.x, y: b.y, r: b.r, age: 0 });
          }
        }
        if (gone) { bubbles.splice(i, 1); continue; }
        const a = Math.min(1, b.age * 6) * (1 - Math.max(0, (b.age - b.life + 0.8) / 0.8));
        ctx.globalAlpha = Math.max(0, a) * 0.9;
        ctx.lineWidth = Math.max(1.4, b.r * 0.2);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.stroke();
        if (b.r > 4) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.38, b.y - b.r * 0.38, b.r * 0.2, 0, 6.2832); ctx.fill(); }
      }
      for (let i = pops.length - 1; i >= 0; i--) { // popped: a quick ring and four droplets
        const o = pops[i]; o.age += dt;
        if (o.age > 0.26) { pops.splice(i, 1); continue; }
        const k2 = o.age / 0.26, R = o.r * (1 + k2 * 1.6);
        ctx.globalAlpha = 1 - k2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(o.x, o.y, R, 0, 6.2832); ctx.stroke();
        for (let j = 0; j < 4; j++) { const an = j * 1.5708 + 0.6; ctx.beginPath(); ctx.arc(o.x + Math.cos(an) * R * 1.3, o.y + Math.sin(an) * R * 1.3, 1.6, 0, 6.2832); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      const moving = drag || Math.abs(p.x) + Math.abs(p.y) + Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.r) + Math.abs(p.vr) > 0.05;
      if (moving || bubbles.length || pops.length || (pressure > 0 && !ready) || ready) raf = requestAnimationFrame(loop);
      else { p.x = p.y = p.vx = p.vy = p.r = p.vr = 0; can.style.transform = ''; }
    }
    new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }).observe(lab);
    document.addEventListener('visibilitychange', () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else wake(); });

    // an idle can asks to be picked up: a little hop every few seconds until someone does
    if (!RM.matches) {
      setInterval(() => {
        if (drag || pressure > 0 || cracked || document.hidden || !visible || performance.now() - lastInput < 6000) return;
        anim(inner, [{ transform: 'none' }, { transform: 'translateY(-14px) rotate(-6deg)', offset: 0.3 }, { transform: 'rotate(5deg)', offset: 0.6 }, { transform: 'none' }], { duration: 760, easing: OUT });
        const t = canTop();
        for (let i = 0; i < 4; i++) bubble(t.x + (Math.random() - 0.5) * 20, t.y, (Math.random() - 0.5) * 30, -50, 2 + Math.random() * 4, 2);
        wake();
      }, 4200);
    }
    meter();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
})();
