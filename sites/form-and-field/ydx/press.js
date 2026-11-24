/* Form & Field, round 5: the proof press (press/index.html).
   1. loader + plates: the guide's proof sheet (inline critical CSS) leaves the same way; arriving from the guide the
      page opens under the five plates that closed over it, and leaving plays them again (same keys as enhance.js).
   2. the press: a plate set with your word in one of the guide's three poster layouts (wrong-reading, as a real plate
      is), a brayer you roll across it with the pointer (or "Roll it for me"), and a pull: the paper is laid on, a
      roller presses it, the sheet is turned over like a page and the proof lands beside the plate, right-reading.
      Thin ink prints speckled, rolled ink prints solid, a split fountain prints three colours from one roller.
      One WebGL canvas, drawn only when something changes. Without WebGL: a still plate and a CPU-rendered proof.
   3. proofs: pinned on the drying line (session), saved as a PNG (rendered on the CPU at 1200 x 1600). */
(() => {
  'use strict';
  if (window.__ydxPress) return;
  window.__ydxPress = true;
  const d = document, html = d.documentElement;
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = () => !reduce.matches;
  const mode = html.getAttribute('data-ydx-mode') || 'first';
  const OUT = 'cubic-bezier(.2,.8,.2,1)', INOUT = 'cubic-bezier(.7,0,.2,1)', IN = 'cubic-bezier(.5,0,.75,0)';
  const canAnimate = typeof Element.prototype.animate === 'function';
  const cssOK = getComputedStyle(html).getPropertyValue('--ydx-css').trim() === '1';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } } };
  if (cssOK) html.classList.add('ydx-on');

  /* ================= 1. loader (the guide's proof sheet) ================= */
  const loader = $('#ydx-loader');
  clearTimeout(window.__ydxFS);
  const unlock = () => { html.classList.remove('ydx-loading'); if (loader) loader.remove(); };
  if (loader && (html.classList.contains('ydx-fail') || !html.classList.contains('ydx-loading'))) setTimeout(unlock, 450);
  else if (loader) { try { runLoader(); } catch (e) { unlock(); } }

  function runLoader() {
    const T0 = window.__ydxT0 || 0;
    const MIN = T0 + ({ first: 1150, quick: 360, frame: 200, reduced: 280, cut: 70 }[mode] || 900);
    const HARD = T0 + (mode === 'frame' ? 420 : 3600);
    const word = $('#ydx-word'), base = $('#ydx-base'), wght = $('#ydx-wght'), pct = $('#ydx-pct'), status = $('#ydx-status');
    const chips = $$('.ydx-chips b', loader);
    let loaded = d.readyState === 'complete', p = mode === 'first' ? 0 : 1, gone = false, lastW = -1, lastT = 0;
    if (mode === 'first' && word) {
      const cw = parseFloat(getComputedStyle(word).getPropertyValue('--w')) || 200;
      p = Math.min(0.9, Math.max(0, (cw - 200) / 600));
      word.style.animation = base.style.animation = 'none';
    }
    addEventListener('load', () => { loaded = true; }, { once: true });
    const paint = () => {
      if (!word) return;
      const w = Math.round((200 + 600 * p) / 10) * 10;
      if (w !== lastW) { word.style.setProperty('--w', w); wght.textContent = w; lastW = w; }
      base.style.transform = `scaleX(${p.toFixed(4)})`;
      pct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
      chips.forEach((c, i) => c.classList.toggle('on', p >= (i + 1) / 5 - 0.001));
      if (p >= 1) status.textContent = 'Ready to pull.';
    };
    paint();
    const tick = now => {
      if (gone) return;
      if (mode === 'first') {
        const t = Math.max(0, now - T0 - 380) / (MIN - T0 - 380);
        const goal = loaded ? Math.min(1, t) : Math.min(0.9, t * 0.9);
        const k = 1 - Math.pow(0.86, Math.min(6, (now - (lastT || now - 16.7)) / 16.7)); lastT = now;
        p = Math.max(p, p + (goal - p) * k);
        if (goal === 1 && 1 - p < 0.004) p = 1;
        paint();
      }
      if ((p === 1 && loaded && now >= MIN) || now >= HARD) return leave();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => leave(), Math.max(0, HARD + 200 - performance.now()));
    setTimeout(unlock, Math.max(0, HARD + 1600 - performance.now()));
    function leave() { if (gone) return; gone = true; try { exit(); } catch (e) { unlock(); } }
    function exit() {
      p = 1; paint();
      store.set('ydx-ff-seen', '1');
      if (!motion() || !canAnimate || !cssOK) {
        if (canAnimate) loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(unlock, unlock); else unlock();
        return;
      }
      const first = mode === 'first', cut = mode === 'cut', frame = mode === 'frame';
      const dur = first ? 640 : frame ? 340 : 460, st = first ? 54 : frame ? 22 : 34, lag = cut ? 0 : first ? 110 : 70, sheetOut = first ? 60 : 0;
      const sheet = $('.ydx-sheet', loader), cols = $$('.ydx-cols > i', loader);
      if (sheet && !cut) {                                   // the sheet tears into the five strips and leaves with them
        const star = $('.ydx-star', sheet), turn = star ? getComputedStyle(star).rotate : 'none';
        cols.forEach((c, i) => {
          const k = sheet.cloneNode(true);
          k.classList.add('ydx-clone'); k.querySelectorAll('[id]').forEach(n => { n.id = ''; });
          const ks = $('.ydx-star', k); if (ks) ks.style.rotate = turn;
          k.style.left = (-i * 100) + '%'; c.append(k);
        });
        sheet.style.visibility = 'hidden';
      }
      const up = (els, delay) => els.forEach((c, i) => c.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-101%,0)' }],
        { duration: dur, delay: delay + i * st, easing: INOUT, fill: 'forwards' }));
      if (!cut) up(cols, sheetOut);
      up($$('.ydx-plates > i', loader), sheetOut + lag);
      intro(sheetOut + lag + dur * 0.35);
      setTimeout(unlock, sheetOut + lag + st * 4 + dur + 40);
    }
  }

  /* the desk settles in under the lifting plates */
  function intro(delay) {
    if (!motion() || !canAnimate) return;
    $$('.pr-desk .kicker, #press-title, .pr-lede, .pr-step, .pr-bed, .pr-foot').forEach((el, i) => el.animate(
      [{ opacity: 0, translate: '0 26px' }, { opacity: 1, translate: '0 0' }],
      { duration: 820, delay: delay + Math.min(i, 7) * 60, easing: OUT, fill: 'backwards' }));
  }

  /* ================= 2. leaving: the five plates, in the destination's colour ================= */
  let shutter = null, leaving = false;
  function plates() {
    if (shutter) return shutter;
    shutter = d.createElement('div');
    shutter.className = 'ydx-shutter'; shutter.setAttribute('aria-hidden', 'true');
    shutter.innerHTML = '<div class="ydx-sh-cols"><i></i><i></i><i></i><i></i><i></i></div><div class="ydx-sh-label"><span class="mono ydx-sh-k"></span><strong class="display ydx-sh-t"></strong><i class="reg"></i></div>';
    d.body.append(shutter);
    return shutter;
  }
  const release = () => {
    leaving = false;
    if (!shutter) return;
    shutter.classList.remove('on');
    shutter.querySelectorAll('*').forEach(el => el.getAnimations && el.getAnimations().forEach(a => a.cancel()));
  };
  addEventListener('pageshow', e => { if (e.persisted) release(); });   // back from the guide out of the bfcache: no plates left up
  d.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-ydx-go]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
    if (leaving) { e.preventDefault(); return; }
    if (!cssOK || !motion() || !canAnimate || html.classList.contains('ydx-loading')) return;
    const c = a.getAttribute('data-ydx-go');
    if (!/^#[0-9a-f]{6}$/i.test(c)) return;
    e.preventDefault(); leaving = true;
    const sh = plates(), dark = c.toLowerCase() === '#121210' || c.toLowerCase() === '#4a22ee';
    sh.style.setProperty('--field', c); sh.style.setProperty('--on', dark ? 'var(--paper)' : 'var(--ink)'); sh.style.setProperty('--accent', 'var(--yellow)');
    const toTop = a.getAttribute('href') === '/';
    $('.ydx-sh-k', sh).textContent = toTop ? 'A field guide for the curious' : '003 / Learning by doing';
    const t = $('.ydx-sh-t', sh); t.textContent = toTop ? 'A designer in the ' : 'Less theory. More ';
    const em = d.createElement('em'); em.textContent = toTop ? 'making.' : 'feeling.'; t.append(em);
    sh.classList.add('on');
    const cols = $$('.ydx-sh-cols i', sh), label = $('.ydx-sh-label', sh);
    cols.forEach((el, i) => el.animate([{ transform: 'translate3d(0,101%,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: 220, delay: i * 16, easing: INOUT, fill: 'forwards' }));
    label.animate([{ opacity: 0, transform: 'translate3d(0,calc(-50% + 22px),0)' }, { opacity: 1, transform: 'translate3d(0,-50%,0)' }], { duration: 150, delay: 220, easing: OUT, fill: 'forwards' });
    setTimeout(() => {
      store.set('ydx-ff-cut', JSON.stringify({ c, t: Date.now() }));
      location.href = a.href;
      setTimeout(release, 4000);                             // navigation blocked or cancelled: never leave the plates up
    }, 360);
  });

  /* ================= 3. the press ================= */
  const stage = $('#pr-stage'), cv = $('#pr-canvas');
  if (!stage || !cv) return;
  const AW = 600, AH = 800;                                  // the plate, in poster units (3:4, like the guide's posters)
  const art = d.createElement('canvas'); art.width = AW; art.height = AH;
  const cov = d.createElement('canvas'); cov.width = 300; cov.height = 400;   // ink on the plate, in plate-screen space
  const pArt = d.createElement('canvas'); pArt.width = AW; pArt.height = AH;  // frozen copies for the proof on the table
  const pCov = d.createElement('canvas'); pCov.width = 300; pCov.height = 400;
  const actx = art.getContext('2d'), cctx = cov.getContext('2d', { willReadFrequently: true });

  const qs = new URLSearchParams(location.search);
  const clean = (w, f) => { const s = String(w || '').replace(/[^\p{L}\p{N} .,!?&'’\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14); return s || f; };
  const S = {
    word: clean(qs.get('w'), 'Observe.'), layout: 'loud', ink: '#ff3d9a', paper: '#fffdf6',
    wght: Math.max(200, Math.min(800, Math.round(Number(qs.get('wght')) / 10) * 10 || 800)),
    n: Math.max(1, Number(store.get('ydx-ff-proofs')) + 1 || 1), busy: false, printed: null, view: 'plate'
  };
  const wordInput = $('#pr-word'); wordInput.value = S.word;
  const pad = n => String(n).padStart(3, '0');
  const setCount = () => { $('#pr-count').textContent = 'PROOF Nº ' + pad(S.n); };
  setCount();
  const status = $('#pr-status'), say = msg => { status.textContent = ''; setTimeout(() => { status.textContent = msg; }, 40); };

  /* ---------- the artwork (right-reading; the plate shows it mirrored) ---------- */
  function drawArt(c, w, h, o) {
    const k = w / AW;
    c.save(); c.clearRect(0, 0, w, h); c.scale(k, k); c.fillStyle = '#fff'; c.textBaseline = 'alphabetic';
    const ls = px => { if ('letterSpacing' in c) c.letterSpacing = px + 'px'; };
    const fit = (txt, font, max, maxW) => { c.font = font.replace('#', 100); ls(-5.2); const m = c.measureText(txt).width || 1; return Math.min(max, 100 * maxW / m); };
    const M = 36, word = o.word, up = word.toUpperCase();
    c.font = '500 14px Mono'; ls(1.6); c.fillText('FORM & FIELD / OPEN STUDIO', M, M + 12);
    c.fillRect(M, AH - M - 30, AW - 2 * M, 2);
    c.font = '500 13px Mono'; ls(1.4); c.fillText('PULLED BY HAND', M, AH - M);
    c.textAlign = 'right'; c.fillText('PROOF Nº ' + pad(o.n), AW - M, AH - M); c.textAlign = 'left';
    if (o.layout === 'loud') {
      const s = fit(up, `${o.wght} #px Display`, 250, AW - 2 * M); c.font = `${o.wght} ${s}px Display`; ls(-s * 0.052);
      c.fillText(up, M - s * 0.03, 150 + s * 0.78);
      c.font = 'italic 600 104px Editorial'; ls(-4); c.fillText('out loud.', M, 150 + s * 0.78 + 112);
      c.fillRect(M, 560, 250, 22);
      c.font = '800 230px Display'; ls(0); c.textAlign = 'right'; c.fillText('↗', AW - M + 8, AH - M - 52); c.textAlign = 'left';
    } else if (o.layout === 'quiet') {
      c.beginPath(); c.arc(398, 238, 132, 0, Math.PI * 2); c.fill();
      const s = fit(word, `${o.wght} #px Display`, 86, 340); c.font = `${o.wght} ${s}px Display`; ls(-s * 0.03);
      c.fillText(word, M, 590);
      c.font = 'italic 600 46px Editorial'; ls(-1); c.fillText('a little room', M, 590 + 58); c.fillText('to think.', M, 590 + 104);
    } else {
      const s = fit(up, `${o.wght} #px Display`, 210, AW - 2 * M), lh = s * 0.8;
      c.font = `${o.wght} ${s}px Display`; ls(-s * 0.052);
      const y0 = 108 + s * 0.74;
      c.fillText(up, M - s * 0.03, y0); c.fillText(up, M - s * 0.03, y0 + lh);
      const head = up.slice(0, 2), rest = up.slice(2);
      c.font = `italic 600 ${s * 1.02}px Editorial`; ls(-s * 0.05); c.fillText(head, M - s * 0.03, y0 + 2 * lh);
      const hw = c.measureText(head).width;
      c.font = `${o.wght} ${s}px Display`; ls(-s * 0.052); c.fillText(rest, M - s * 0.03 + hw, y0 + 2 * lh);
    }
    c.restore();
  }
  let relief = null;                                          // a coarse sample of the plate's relief, for the ink meter
  function setArt() {
    drawArt(actx, AW, AH, { word: S.word, layout: S.layout, wght: S.wght, n: S.n });
    const s = d.createElement('canvas'); s.width = 75; s.height = 100;
    const sc = s.getContext('2d', { willReadFrequently: true }); sc.scale(-1, 1); sc.drawImage(art, -75, 0, 75, 100);   // mirrored, like the plate
    const px = sc.getImageData(0, 0, 75, 100).data; relief = new Uint8Array(75 * 100);
    for (let i = 0; i < relief.length; i++) relief[i] = px[i * 4 + 3] > 128 ? 1 : 0;
    gfx && gfx.upload('art'); fallback2d && drawFallbackPlate(); meter(); draw();
  }

  /* ---------- the brayer ---------- */
  const R = { ang: 0, load: 1, streak: [], roll: 0 };
  const SPLIT = ['#ff3d9a', '#ffe500', '#62e9b4'];
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a.toFixed(3)})`; };
  function reload() { R.load = 1; R.streak = Array.from({ length: 9 }, () => Math.random()); }
  function roll(ax, ay, bx, by) {                             // in cov px
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    if (len < 0.4) return;
    const target = Math.atan2(dy, dx) + Math.PI / 2;           // the roller's axle is across the stroke
    let da = target - R.ang; da = ((da % Math.PI) + Math.PI * 1.5) % Math.PI - Math.PI / 2;
    R.ang += da * Math.min(1, len / 24);
    const hw = 40, ux = Math.cos(R.ang) * hw, uy = Math.sin(R.ang) * hw;
    const g = cctx.createLinearGradient(ax - ux, ay - uy, ax + ux, ay + uy);
    for (let i = 0; i <= 8; i++) {
      const a = Math.min(1, R.load * (0.46 + 0.24 * R.streak[i])) * (i === 0 || i === 8 ? 0.3 : 1);
      g.addColorStop(i / 8, rgba(S.ink === 'split' ? SPLIT[Math.min(2, Math.floor(i / 3))] : S.ink, a));
    }
    cctx.fillStyle = g; cctx.beginPath();
    cctx.moveTo(ax - ux, ay - uy); cctx.lineTo(ax + ux, ay + uy); cctx.lineTo(bx + ux, by + uy); cctx.lineTo(bx - ux, by - uy); cctx.closePath(); cctx.fill();
    R.load = Math.max(0.38, R.load - len / 2400);
    R.roll += len;
    gfx && gfx.dirtyCov(); fallback2d && drawFallbackPlate();
  }
  let meterT = 0, lastPct = 0;
  function meter(now) {
    if (now && now - meterT < 180) return;
    meterT = now || 0;
    const px = cctx.getImageData(0, 0, 300, 400).data;
    let sum = 0, n = 0;
    for (let y = 0; y < 100; y++) for (let x = 0; x < 75; x++) if (relief && relief[y * 75 + x]) { sum += px[((y * 4 + 2) * 300 + x * 4 + 2) * 4 + 3] / 255; n++; }
    lastPct = n ? Math.round(Math.min(1, sum / n * 1.12) * 100) : 0;
    $('#pr-meter').textContent = pad(lastPct) + '%';
    $('#pr-meter-bar').style.transform = `scaleX(${lastPct / 100})`;
  }

  /* ---------- geometry (stage css px) ---------- */
  const G = { W: 1, H: 1, plate: [0, 0, 1, 1], paper: [0, 0, 1, 1], print: [0, 0, 1, 1], gap: 24, single: false, pan: 0, panT: 0 };
  function layout() {
    const r = stage.getBoundingClientRect(); G.W = r.width; G.H = r.height;
    G.single = G.W < 640;
    const mrgK = 0.045;
    let pw;
    if (G.single) pw = Math.min((G.W - 36) / (1 + 2 * mrgK), (G.H - 40) / (4 / 3 + 2 * mrgK));
    else pw = Math.min((G.W - 40 - G.gap) / (2 * (1 + 2 * mrgK)), (G.H - 56) / (4 / 3 + 2 * mrgK));
    const ph = pw * 4 / 3, m = pw * mrgK, Pw = pw + 2 * m, Ph = ph + 2 * m;
    const left = G.single ? (G.W - Pw) / 2 : (G.W - (2 * Pw + G.gap)) / 2 + Pw + G.gap;
    const top = (G.H - Ph) / 2 + (G.single ? 0 : 6);
    G.paper = [left, top, Pw, Ph]; G.plate = [left + m, top + m, pw, ph];
    G.print = [left - Pw - G.gap, top, Pw, Ph];
    G.panT = G.single && S.view === 'print' ? -(Pw + G.gap) : 0; G.pan = G.panT;
    place();
    gfx && gfx.resize(); draw();
  }
  function place() {                                          // the DOM labels follow the world (and its pan on phones)
    const tp = $('#pr-tag-plate'), tq = $('#pr-tag-print'), slot = $('#pr-slot');
    const X = x => x - G.pan;
    tp.style.transform = `translate3d(${X(G.plate[0])}px,${G.paper[1] - 18}px,0)`;
    tq.style.transform = `translate3d(${X(G.print[0])}px,${G.print[1] - 18}px,0)`;
    slot.style.width = G.print[2] + 'px'; slot.style.height = G.print[3] + 'px';
    slot.style.transform = `translate3d(${X(G.print[0])}px,${G.print[1]}px,0)`;
    slot.classList.toggle('gone', !!S.printed);
    tq.style.opacity = S.printed ? '' : '0';
  }

  /* ---------- WebGL ---------- */
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uDpr,uPan,uPh,uK,uHasPrint,uOldA;
uniform vec4 uPlate,uPaper,uPrint,uFly;
uniform vec3 uPaperNow,uPaperOld;
uniform sampler2D tArt,tCov,tPArt,tPCov;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float box(vec2 p,vec4 r,float rad){vec2 h=r.zw*.5,q=abs(p-r.xy-h)-h+rad;return length(max(q,0.))+min(max(q.x,q.y),0.)-rad;}
vec4 over(vec4 t,vec4 u){return t+u*(1.-t.a);}
vec4 shade(vec2 p,vec4 r,vec2 off,float blur,float a){float dd=box(p-off,r,3.);return vec4(0.,0.,0.,a*(1.-smoothstep(-blur,blur,dd)));}
float aa(float dd){return 1.-clamp(dd*uDpr+.5,0.,1.);}
/* what the paper picks up from the plate at plate-uv q (the plate shows the art mirrored) */
vec4 inkAt(vec2 q,sampler2D art,sampler2D cov,vec2 grainP){
  float m=texture2D(art,vec2(1.-q.x,q.y)).r; vec4 c=texture2D(cov,q);
  float amt=c.a;
  float rel=smoothstep(.44-amt*.08,.6-amt*.08,m);
  float n=vn(grainP*.55)*.55+hash(floor(grainP))*.45;
  float got=smoothstep(n*.82,n*.82+.14,amt*1.18);
  return vec4(c.rgb,rel*got*.96);
}
vec3 printCol(vec2 q,sampler2D art,sampler2D cov,vec3 paper,vec2 grainP){
  vec4 k=inkAt(q,art,cov,grainP);
  vec3 col=paper*mix(vec3(1.),k.rgb,k.a);
  float e=1./600.;                                           /* the blind bite where relief printed no ink */
  float gx=texture2D(art,vec2(1.-q.x+e,q.y)).r-texture2D(art,vec2(1.-q.x-e,q.y)).r;
  float gy=texture2D(art,vec2(1.-q.x,q.y+e)).r-texture2D(art,vec2(1.-q.x,q.y-e)).r;
  col*=1.-(gx*.05-gy*.07)*(1.-k.a);
  return col*(.975+.04*hash(floor(grainP*1.7)));
}
vec4 plateAt(vec2 p){
  float dd=box(p,uPlate,5.);
  if(dd>1.)return vec4(0.);
  vec2 q=(p-uPlate.xy)/uPlate.zw;
  float e=1./600.;
  float m=texture2D(tArt,vec2(1.-q.x,q.y)).r;
  float gx=texture2D(tArt,vec2(1.-q.x-e,q.y)).r-texture2D(tArt,vec2(1.-q.x+e,q.y)).r;
  float gy=texture2D(tArt,vec2(1.-q.x,q.y+e)).r-texture2D(tArt,vec2(1.-q.x,q.y-e)).r;
  vec3 n=normalize(vec3(-gx*2.2,-gy*2.2,1.)),l=normalize(vec3(-.45,-.6,.9));
  float dif=max(dot(n,l),0.);
  float g=vn(p*.9)*.5+vn(p*.13)*.5;
  vec3 base=vec3(.115,.11,.1)+g*.025, top=vec3(.25,.24,.22);
  vec3 col=mix(base,top,smoothstep(.3,.7,m))*(.62+.5*dif);
  vec4 c=texture2D(tCov,q);
  float a=c.a*smoothstep(.35,.65,m), film=c.a*(1.-smoothstep(.35,.65,m))*.12;
  vec3 wet=c.rgb*(.8+.3*dif);
  col=mix(col,wet,clamp(a*.97+film,0.,1.));
  float spec=pow(max(dot(reflect(-l,n),vec3(0.,0.,1.)),0.),14.);
  col+=spec*(a*.38+.04)*(.7+.6*vn(p*.35));
  col*=1.-.32*smoothstep(-4.,0.,dd);                           /* the block's bevel */
  col+=.06*smoothstep(-2.,0.,dd)*step(dd,0.)*step(p.y,uPlate.y+6.);
  return vec4(col,1.)*aa(dd);
}
vec4 paperFront(vec2 p,vec4 r,float emb,vec3 paper){      /* the back of the sheet; emb: how much of the plate has bitten through */
  float dd=box(p,r,1.5); if(dd>1.)return vec4(0.);
  vec2 q=(p-uPlate.xy)/uPlate.zw; float e=1./600.;
  float gx=texture2D(tArt,vec2(1.-q.x-e,q.y)).r-texture2D(tArt,vec2(1.-q.x+e,q.y)).r;
  float gy=texture2D(tArt,vec2(1.-q.x,q.y+e)).r-texture2D(tArt,vec2(1.-q.x,q.y-e)).r;
  vec3 col=paper*(.985+.03*hash(floor(p*1.3)));
  col*=1.+(-gx*.06+gy*.08)*emb;
  return vec4(col,1.)*aa(dd);
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr; p.x+=uPan;
  vec4 o=vec4(0.);
  /* the last proof, lying on the table */
  if(uHasPrint>.5){
    vec4 r=uPrint; r.y-=18.*(1.-uOldA);                     /* lifted off the table when the next pull starts */
    o=over(shade(p,r,vec2(4.,6.),10.,.16*uOldA),o);
    float dd=box(p,r,1.5);
    if(dd<1.){vec2 u=(p-r.xy)/r.zw; vec2 pu=(u*r.zw-(uPaper.zw-uPlate.zw)*.5)/uPlate.zw;
      vec3 col=uPaperOld*(.985+.03*hash(floor(p*1.3)));
      if(pu.x>=0.&&pu.x<=1.&&pu.y>=0.&&pu.y<=1.)col=printCol(vec2(1.-pu.x,pu.y),tPArt,tPCov,uPaperOld,pu*vec2(600.,800.));
      o=over(vec4(col,1.)*aa(dd)*uOldA,o);}
  }
  /* the plate */
  o=over(plateAt(p),over(shade(p,uPlate,vec2(3.,5.),8.,.28),o));
  /* the pull: 1 lay the sheet, 2 press with the roller, 3 turn it over, 4 set it down */
  if(uPh>.5&&uPh<1.5){
    float e=uK; vec4 r=uPaper; float lift=(1.-e)*34.;
    r.y-=lift; r.xy-=r.zw*.02*(1.-e); r.zw*=1.+.04*(1.-e);
    o=over(paperFront(p,r,0.,uPaperNow)*e,over(shade(p,uPaper,vec2(2.,4.+lift*.5),6.+lift*.6,.3*e),o));
  } else if(uPh>1.5&&uPh<2.5){
    float yR=uPaper.y-26.+(uPaper.w+52.)*uK;
    vec4 pf=paperFront(p,uPaper,step(p.y,yR),uPaperNow);
    o=over(pf,over(shade(p,uPaper,vec2(2.,3.),5.,.3),o));
    float t=(p.y-yR)/22.; float inX=step(uPaper.x-18.,p.x)*step(p.x,uPaper.x+uPaper.z+18.);
    if(abs(t)<1.&&inX>.5){float cyl=sqrt(1.-t*t);vec3 rc=vec3(.09,.085,.08)*(.6+.9*cyl)+pow(cyl,18.)*.22*step(t,-.1);o=over(vec4(rc,1.)*smoothstep(1.,.92,abs(t)),o);}
    else o=over(shade(p,vec4(uPaper.x-18.,yR+16.,uPaper.z+36.,10.),vec2(0.),10.,.22*inX),o);
  } else if(uPh>2.5&&uPh<3.5){
    float th=3.14159265*uK, ct=cos(th), stn=sin(th), D=1500.;
    float u=p.x-uPaper.x, den=ct-u*stn/D, s=u/den;
    float cy=uPaper.y+uPaper.w*.5, f=1.+s*stn/D, y=cy+(p.y-cy)*f;
    /* the shadow of the lifted sheet, falling short of it */
    float reach=uPaper.z*ct; float sx=(reach>0.)?(u/(reach+1.)):(-u/(-reach+1.));
    float sh=.3*stn*(1.-smoothstep(.55,1.08,sx))*step(0.,sx)*step(uPaper.y-6.,p.y)*step(p.y,uPaper.y+uPaper.w+10.);
    o=over(vec4(0.,0.,0.,sh),o);
    if(den*sign(ct+1e-4)>0.&&s>=0.&&s<=uPaper.z&&y>=uPaper.y&&y<=uPaper.y+uPaper.w){
      vec2 pp=vec2(uPaper.x+s,y);
      vec3 col;
      if(ct>0.){col=paperFront(pp,uPaper,1.,uPaperNow).rgb*(.6+.4*ct);}
      else{vec2 q=(pp-uPlate.xy)/uPlate.zw;
        col=uPaperNow*(.985+.03*hash(floor(pp*1.3)));
        if(q.x>=0.&&q.x<=1.&&q.y>=0.&&q.y<=1.)col=printCol(q,tPArt,tPCov,uPaperNow,vec2(1.-q.x,q.y)*vec2(600.,800.));
        col*=.62+.38*(-ct);}
      col*=1.-.1*stn*(s/uPaper.z);
      o=over(vec4(col,1.),o);
    }
  } else if(uPh>3.5){
    vec4 r=uFly;
    o=over(shade(p,r,vec2(4.,6.+8.*(1.-uK)),10.+8.*(1.-uK),.18),o);
    float dd=box(p,r,1.5);
    if(dd<1.){vec2 u=(p-r.xy)/r.zw; vec2 pu=(u*r.zw-(uPaper.zw-uPlate.zw)*.5)/uPlate.zw;
      vec3 col=uPaperNow*(.985+.03*hash(floor(p*1.3)));
      if(pu.x>=0.&&pu.x<=1.&&pu.y>=0.&&pu.y<=1.)col=printCol(vec2(1.-pu.x,pu.y),tPArt,tPCov,uPaperNow,pu*vec2(600.,800.));
      o=over(vec4(col,1.)*aa(dd),o);}
  }
  gl_FragColor=o;
}`;
  let gl = null, gfx = null, fallback2d = false;
  function makeGL() {
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'default' };
    gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs);
    if (!gl) throw new Error('no webgl');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(pr, 0, 'a'); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const U = {}; ['uRes', 'uDpr', 'uPan', 'uPh', 'uK', 'uHasPrint', 'uOldA', 'uPlate', 'uPaper', 'uPrint', 'uFly', 'uPaperNow', 'uPaperOld', 'tArt', 'tCov', 'tPArt', 'tPCov'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const T = {}, src = { art, cov, part: pArt, pcov: pCov };
    ['art', 'cov', 'part', 'pcov'].forEach((k, i) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src[k]);
      T[k] = [t, i];
    });
    gl.uniform1i(U.tArt, 0); gl.uniform1i(U.tCov, 1); gl.uniform1i(U.tPArt, 2); gl.uniform1i(U.tPCov, 3);
    let dpr = 1, covDirty = false;
    const hexv = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
    return {
      upload(k) { const [t, i] = T[k]; gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src[k]); },
      dirtyCov() { covDirty = true; },
      resize() {
        dpr = Math.min(devicePixelRatio || 1, 1.75);
        const w = Math.max(1, Math.round(G.W * dpr)), h = Math.max(1, Math.round(G.H * dpr));
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      },
      render(ph, k, fly) {
        if (gl.isContextLost()) return;
        if (covDirty) { this.upload('cov'); covDirty = false; }
        gl.viewport(0, 0, cv.width, cv.height);
        gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uDpr, cv.width / G.W); gl.uniform1f(U.uPan, G.pan);
        gl.uniform1f(U.uPh, ph); gl.uniform1f(U.uK, k); gl.uniform1f(U.uHasPrint, S.printed && ph < 2.5 ? 1 : 0); gl.uniform1f(U.uOldA, ph < 1.5 ? 1 : ph < 2.5 ? 1 - k : 0);
        gl.uniform4fv(U.uPlate, G.plate); gl.uniform4fv(U.uPaper, G.paper); gl.uniform4fv(U.uPrint, G.print); gl.uniform4fv(U.uFly, fly || G.print);
        gl.uniform3fv(U.uPaperNow, hexv(pull.paper || S.paper)); gl.uniform3fv(U.uPaperOld, hexv(S.printed ? S.printed.paper : S.paper));
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  /* ---------- drawing: on demand ---------- */
  const pull = { ph: 0, k: 0, fly: null, paper: null };
  let raf = 0;
  function draw() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (gfx) gfx.render(pull.ph, pull.k, pull.fly); }); }

  /* ---------- no WebGL: a still plate and a CPU-printed proof ---------- */
  function drawFallbackPlate() {
    const c = $('#pr-plate2d'); if (!c) return;
    c.width = 300; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#1f1d1a'; x.fillRect(0, 0, 300, 400);
    x.save(); x.scale(-1, 1); x.globalAlpha = 0.45; x.drawImage(art, -300, 0, 300, 400); x.restore();
    x.globalAlpha = 1; x.drawImage(cov, 0, 0);
  }
  function cpuPrint(w, h, o) {                              // the proof, right-reading, at any size (PNG, thumbnails, fallback)
    const c = d.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    const m = Math.round(w * 0.045 / 1.09), iw = w - 2 * m, ih = h - 2 * m;
    const a = d.createElement('canvas'); a.width = iw; a.height = ih; drawArt(a.getContext('2d'), iw, ih, o);
    const k = d.createElement('canvas'); k.width = iw; k.height = ih;
    const kx = k.getContext('2d'); kx.imageSmoothingQuality = 'high'; kx.scale(-1, 1); kx.drawImage(o.cov, -iw, 0, iw, ih);
    const A = a.getContext('2d').getImageData(0, 0, iw, ih).data, K = kx.getImageData(0, 0, iw, ih).data;
    const pn = parseInt(o.paper.slice(1), 16), pr = pn >> 16 & 255, pg = pn >> 8 & 255, pb = pn & 255;
    const img = x.createImageData(w, h), D = img.data;
    const hash = (u, v) => { const s = Math.sin(u * 12.9898 + v * 78.233) * 43758.5453; return s - Math.floor(s); };
    const sx = AW / iw;
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      const i = (y * w + X) * 4, g = 0.975 + 0.04 * hash(Math.floor(X * 1.3), Math.floor(y * 1.3));
      let r = pr, gg = pg, b = pb;
      const ix = X - m, iy = y - m;
      if (ix >= 0 && iy >= 0 && ix < iw && iy < ih) {
        const j = (iy * iw + ix) * 4, amt = K[j + 3] / 255, mm = A[j + 3] / 255;
        if (mm > 0.02 && amt > 0.01) {
          const lo = 0.44 - amt * 0.08, rel = Math.min(1, Math.max(0, (mm - lo) / 0.16));
          const n = hash(Math.floor(ix * sx), Math.floor(iy * sx)) * 0.45 + hash(Math.floor(ix * sx * 0.55), Math.floor(iy * sx * 0.55) + 7) * 0.55;
          const got = Math.min(1, Math.max(0, (amt * 1.18 - n * 0.82) / 0.14)), cv2 = rel * got * 0.96;
          r = r * (1 - cv2 + cv2 * K[j] / 255); gg = gg * (1 - cv2 + cv2 * K[j + 1] / 255); b = b * (1 - cv2 + cv2 * K[j + 2] / 255);
        }
      }
      D[i] = r * g; D[i + 1] = gg * g; D[i + 2] = b * g; D[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (o.caption) {
      x.fillStyle = 'rgba(18,18,16,.55)'; x.font = `500 ${Math.round(w / 90)}px Mono`;
      if ('letterSpacing' in x) x.letterSpacing = Math.round(w / 700) + 'px';
      x.fillText(o.caption, m, h - m * 0.38);
    }
    return c;
  }

  /* ---------- input on the plate ---------- */
  const brayer = $('#pr-brayer');
  const world = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left + G.pan, e.clientY - r.top]; };
  const onPlate = (x, y) => x >= G.plate[0] - 10 && x <= G.plate[0] + G.plate[2] + 10 && y >= G.plate[1] - 10 && y <= G.plate[1] + G.plate[3] + 10;
  const toCov = (x, y) => [(x - G.plate[0]) / G.plate[2] * 300, (y - G.plate[1]) / G.plate[3] * 400];
  function showBrayer(x, y, on) {
    brayer.classList.toggle('on', on);
    brayer.classList.toggle('split', S.ink === 'split');
    if (S.ink !== 'split') brayer.style.setProperty('--c', S.ink);
    brayer.style.transform = `translate3d(${x - G.pan}px,${y}px,0) rotate(${(R.ang * 180 / Math.PI).toFixed(1)}deg)`;
  }
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    if (S.busy || e.button) return;
    const [x, y] = world(e);
    if (!onPlate(x, y)) return;
    if (G.single && S.view !== 'plate') return;
    e.preventDefault();
    drag = { id: e.pointerId, p: toCov(x, y) }; reload();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    showBrayer(x, y, true);
  });
  cv.addEventListener('pointermove', e => {
    const [x, y] = world(e);
    const over = onPlate(x, y) && !S.busy && (!G.single || S.view === 'plate');
    stage.classList.toggle('on-plate', over && e.pointerType === 'mouse');
    if (drag && e.pointerId === drag.id) {
      const q = toCov(x, y); roll(drag.p[0], drag.p[1], q[0], q[1]); drag.p = q;
      meter(performance.now()); draw(); showBrayer(x, y, true);
    } else if (e.pointerType === 'mouse') showBrayer(x, y, over);
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) { drag = null; meter(); if (e.pointerType !== 'mouse') showBrayer(0, 0, false); if (lastPct > 0) say(`The plate is ${lastPct}% inked.`); } };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { if (!drag) { showBrayer(0, 0, false); stage.classList.remove('on-plate'); } });

  /* roll it for me: four passes down the plate and one across, on the same brush */
  async function autoRoll() {
    if (S.busy) return;
    S.busy = true; setBusy(true); reload();
    const path = [];
    [0.18, 0.42, 0.62, 0.84].forEach((fx, i) => { const a = i % 2 ? [fx, 1.04] : [fx, -0.04], b = i % 2 ? [fx, -0.04] : [fx, 1.04]; path.push([a, b]); });
    path.push([[-0.04, 0.5], [1.04, 0.5]]);
    for (const [a, b] of path) {
      reload();
      const A = [a[0] * 300, a[1] * 400], B = [b[0] * 300, b[1] * 400];
      const steps = 26, dur = motion() ? 260 : 0;
      let prev = A; const t0 = performance.now();
      for (let s = 1; s <= steps; s++) {
        const q = [A[0] + (B[0] - A[0]) * s / steps, A[1] + (B[1] - A[1]) * s / steps];
        roll(prev[0], prev[1], q[0], q[1]); prev = q;
        if (dur) {
          showBrayer(G.plate[0] + q[0] / 300 * G.plate[2], G.plate[1] + q[1] / 400 * G.plate[3], true); draw();
          const due = t0 + dur * s / steps - performance.now(); if (due > 0) await wait(due);
        }
      }
    }
    showBrayer(0, 0, false); meter(); draw();
    S.busy = false; setBusy(false);
    say(`The plate is ${lastPct}% inked.`);
  }

  /* ---------- the pull ---------- */
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const outE = t => 1 - Math.pow(1 - t, 3);
  function phase(ph, ms, fn = x => x) {
    return new Promise(res => {
      if (!motion() || !gfx) { pull.ph = ph; pull.k = 1; res(); return; }
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / ms);
        pull.ph = ph; pull.k = fn(k);
        if (ph === 4 && G.single) { G.pan = G.panStart + (G.panT - G.panStart) * fn(k); place(); }
        if (ph === 4) { const a = G.flyFrom, b = G.print, e = fn(k); pull.fly = a.map((v, i) => v + (b[i] - v) * e); }
        if (gfx) gfx.render(pull.ph, pull.k, pull.fly);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }
  async function doPull() {
    if (S.busy) return;
    S.busy = true; setBusy(true);
    const o = { word: S.word, layout: S.layout, wght: S.wght, n: S.n, paper: S.paper, pct: lastPct, ink: S.ink };
    pArt.getContext('2d').clearRect(0, 0, AW, AH); pArt.getContext('2d').drawImage(art, 0, 0);
    const pc = pCov.getContext('2d'); pc.clearRect(0, 0, 300, 400); pc.drawImage(cov, 0, 0);
    pull.paper = S.paper;
    say('Pulling the proof.');
    const sr = stage.getBoundingClientRect();                  // phones: the bed sits above the button, bring it into view first
    if (sr.top < 0 || sr.bottom > innerHeight) { stage.scrollIntoView({ block: 'center', behavior: motion() ? 'smooth' : 'auto' }); if (motion()) await wait(420); }
    try {
      await phase(1, 380, outE);
      await phase(2, 700, ease);
      /* the paper took most of the ink: the plate keeps a ghost */
      cctx.save(); cctx.globalCompositeOperation = 'destination-out'; cctx.fillStyle = 'rgba(0,0,0,.66)'; cctx.fillRect(0, 0, 300, 400); cctx.restore();
      gfx && gfx.dirtyCov();
      if (gfx) { gfx.upload('part'); gfx.upload('pcov'); }   // the old proof has left the table by now
      $('#pr-slot').classList.add('gone');
      await phase(3, 1050, ease);
      G.flyFrom = [G.paper[0] - G.paper[2], G.paper[1], G.paper[2], G.paper[3]];
      if (G.single) { S.view = 'print'; G.panStart = G.pan; G.panT = -(G.paper[2] + G.gap); syncView(); }
      await phase(4, 460, outE);
    } finally {
      pull.ph = 0; pull.k = 0; pull.fly = null; pull.paper = null;
      S.printed = o;
      if (G.single) { G.pan = G.panT; }
      place(); meter();
      if (fallback2d) showFallbackPrint();
      pin(o);
      S.n += 1; store.set('ydx-ff-proofs', String(S.n - 1)); setCount(); setArt();
      $('#pr-save').disabled = false;
      S.busy = false; setBusy(false); draw();
      const inkName = { '#ff3d9a': 'pink', '#4a22ee': 'violet', '#62e9b4': 'mint', '#121210': 'black', '#ffe500': 'yellow', split: 'a split fountain' }[o.ink] || 'ink';
      const paperName = { '#fffdf6': 'white', '#f3eee1': 'newsprint', '#ffe500': 'yellow' }[o.paper] || 'paper';
      cv.setAttribute('aria-label', `Proof Nº ${pad(o.n)}: “${o.word}”, ${o.layout} layout, on ${paperName} stock, ${o.pct}% inked.`);
      say(o.pct < 3 ? `Proof Nº ${pad(o.n)} pulled blind: no ink, just the bite of the type.` : `Proof Nº ${pad(o.n)} pulled in ${inkName} on ${paperName} stock, ${o.pct}% inked.`);
    }
  }
  function setBusy(on) {
    stage.classList.toggle('busy', on);
    const p = $('#pr-pull'); p.setAttribute('aria-disabled', String(on));
    ['#pr-set', '#pr-ink'].forEach(s => $(s).setAttribute('aria-disabled', String(on)));
  }

  /* ---------- the drying line and the PNG ---------- */
  const wall = $('#pr-wall');
  let pins = [];
  try { pins = JSON.parse(store.get('ydx-ff-wall') || '[]').slice(-8); } catch (e) { pins = []; }
  const hang = (p, fresh) => {
    const li = d.createElement('li'); if (fresh) li.className = 'new';
    li.style.setProperty('--r', ((p.n * 37) % 9 - 4) + 'deg');
    const img = new Image(); img.src = p.src; img.alt = `Proof Nº ${pad(p.n)}: ${p.word}`; img.width = 66; img.height = 88;
    li.append(img); wall.append(li);
    while (wall.children.length > 8) wall.firstElementChild.remove();
    wall.scrollLeft = wall.scrollWidth;
  };
  pins.forEach(p => hang(p, false));
  function pin(o) {
    const src = cpuPrint(132, 176, { ...o, cov: pCov }).toDataURL('image/png');
    const p = { n: o.n, word: o.word, src };
    pins.push(p); pins = pins.slice(-8);
    store.set('ydx-ff-wall', JSON.stringify(pins));
    hang(p, motion());
  }
  function save() {
    if (!S.printed) return;
    const o = S.printed, date = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const c = cpuPrint(1200, 1600, { ...o, cov: pCov, caption: `FORM & FIELD · PROOF Nº ${pad(o.n)} · PULLED ${date}` });
    const name = `form-and-field-proof-${pad(o.n)}.png`;
    const go = url => { const a = d.createElement('a'); a.href = url; a.download = name; d.body.append(a); a.click(); a.remove(); };
    if (c.toBlob) c.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b); go(u); setTimeout(() => URL.revokeObjectURL(u), 4000); }, 'image/png');
    else go(c.toDataURL('image/png'));
    say(`Saved ${name}.`);
  }
  function showFallbackPrint() {
    const c = $('#pr-print2d'); if (!c || !S.printed) return;
    const p = cpuPrint(300, 400, { ...S.printed, cov: pCov });
    c.width = 300; c.height = 400; c.getContext('2d').drawImage(p, 0, 0);
  }

  /* ---------- controls ---------- */
  const press = (sel, attr, fn) => $$(sel).forEach(b => b.addEventListener('click', () => {
    if (S.busy) return;
    $$(sel).forEach(o => o.setAttribute('aria-pressed', String(o === b))); fn(b.getAttribute(attr));
  }));
  press('[data-layout]', 'data-layout', v => { S.layout = v; setArt(); say(`${v[0].toUpperCase() + v.slice(1)} layout set on the plate.`); });
  press('.pr-ink', 'data-ink', v => { S.ink = v; reload(); });
  press('[data-paper]', 'data-paper', v => { S.paper = v; });
  let typing = 0;
  wordInput.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(() => { S.word = clean(wordInput.value, 'Observe.'); setArt(); }, 120); });
  wordInput.addEventListener('blur', () => { if (!clean(wordInput.value, '')) wordInput.value = S.word; });
  $('#pr-auto').addEventListener('click', autoRoll);
  $('#pr-pull').addEventListener('click', () => { if ($('#pr-pull').getAttribute('aria-disabled') !== 'true') doPull(); });
  $('#pr-save').addEventListener('click', save);
  $('#pr-clean').addEventListener('click', () => { if (S.busy) return; cctx.clearRect(0, 0, 300, 400); gfx && gfx.dirtyCov(); fallback2d && drawFallbackPlate(); meter(); draw(); say('The plate is clean.'); });
  function syncView() { $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === S.view))); }
  $$('[data-view]').forEach(b => b.addEventListener('click', () => {
    if (S.busy) return;
    S.view = b.dataset.view; syncView();
    const from = G.pan, to = S.view === 'print' ? -(G.paper[2] + G.gap) : 0; G.panT = to;
    if (!motion()) { G.pan = to; place(); draw(); return; }
    const t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 420); G.pan = from + (to - from) * ease(k); place(); if (gfx) gfx.render(0, 0, null); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }));

  /* ---------- go ---------- */
  try { gfx = makeGL(); } catch (e) {
    gl = null; gfx = null; fallback2d = true;
    cv.hidden = true; $('#pr-fallback').hidden = false;
  }
  if (gl) {
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); }, false);
    cv.addEventListener('webglcontextrestored', () => { try { gfx = makeGL(); gfx.resize(); setArt(); } catch (e) { /* stays blank; the controls still work */ } }, false);
  }
  reload();
  layout(); setArt();
  if (window.ResizeObserver) new ResizeObserver(() => layout()).observe(stage); else addEventListener('resize', layout);
  if (d.fonts && d.fonts.load) Promise.all(['800 100px Display', '500 100px Display', 'italic 600 100px Editorial', '500 14px Mono']
    .map(f => d.fonts.load(f).catch(() => {}))).then(setArt, setArt);
})();
