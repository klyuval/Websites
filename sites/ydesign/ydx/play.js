/* ydx play.js: the ink lab (/play/ and /he/play/), the hub's interactive toy.
 *
 * Pick one of the twelve sites; drag across the dark and that site's palette pours out of the pointer as real fluid
 * (ydx/fluid.js). Where the ink is thick, the site itself shows through it, bent and colour-split by the flow; switching
 * sites turns what is already painted into the next one through a liquid sweep. While nobody paints, the designer's
 * cursor from the hub's loading screen paints on its own (and steps aside the moment you touch it).
 *
 * Fallbacks: no WebGL -> the pots swap a still screenshot behind a soft mask; reduced motion -> no autonomous painter,
 * a still composition, and the fluid only moves while you paint; hidden tab -> paused; slow frames -> lower tiers.
 */
(() => {
  'use strict';
  const d = document, html = d.documentElement, F = window.YdxFluid;
  const rtl = html.dir === 'rtl';
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPref = null;
  try { motionPref = localStorage.getItem('ydx-motion'); } catch (e) { /* storage blocked */ }
  const still = () => mq.matches || motionPref === 'reduce';
  const coarse = matchMedia('(pointer: coarse)').matches;
  html.classList.add('pl-js');

  const cv = $('.pl-cv'), stillImg = $('.pl-still'), pots = $$('.pl-pot'), cursor = $('.pl-cursor');
  const nowName = $('[data-now-name]'), nowSector = $('[data-now-sector]'), nowLink = $('[data-now-link]'), live = $('[data-live]');
  const hint = $('.pl-hint');
  const sites = pots.map((b) => ({ el: b, id: b.dataset.id, name: b.dataset.name, sector: b.dataset.sector, url: b.dataset.url, pal: b.dataset.colors.split(',') }));
  let cur = Math.max(0, sites.findIndex((s) => s.el.getAttribute('aria-checked') === 'true'));

  /* ---- the yellow wipe back to the hub (the same move as the hub's wipe into the lab) ------------------------------ */
  for (const a of $$('a[data-wipe]')) {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const w = d.createElement('div');
      w.className = 'ydx-wipe';
      // back to the work: the hub opens a #link with its dark deck loader, so the wipe is ink; to the top it is the
      // yellow of the hub's own loading screen
      if (a.hash) w.style.background = '#17130f';
      const r = a.getBoundingClientRect();
      w.style.setProperty('--x', (e.clientX || r.left + r.width / 2) + 'px');
      w.style.setProperty('--y', (e.clientY || r.top + r.height / 2) + 'px');
      d.body.append(w);
      if (still()) { w.classList.add('is-fade'); setTimeout(() => { location.href = a.href; }, 160); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('is-on')));
      setTimeout(() => { location.href = a.href; }, 430);
      addEventListener('pageshow', (ev) => { if (ev.persisted) w.remove(); }, { once: true });
    });
  }

  /* ---- choosing a site ------------------------------------------------------------------------------------------------ */
  let onPick = null;
  const choose = (i, focus) => {
    cur = (i + sites.length) % sites.length;
    const s = sites[cur];
    sites.forEach((x, j) => { x.el.setAttribute('aria-checked', String(j === cur)); x.el.tabIndex = j === cur ? 0 : -1; });
    if (focus) { s.el.focus(); s.el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    nowName.textContent = s.name;
    nowSector.textContent = s.sector;
    nowLink.href = s.url;
    html.style.setProperty('--now', s.pal[0]);
    if (live) live.textContent = `${nowName.closest('.pl-now').querySelector('.pl-now__k').textContent}: ${s.name}`;
    if (stillImg) stillImg.src = `/work/${s.id}.webp`;
    if (onPick) onPick(s);
  };
  pots.forEach((b, i) => b.addEventListener('click', () => { choose(i); b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: still() ? 'auto' : 'smooth' }); }));
  $('.pl-pots').addEventListener('keydown', (e) => {
    const k = e.key;
    let step = 0;
    if (k === 'ArrowRight' || k === 'ArrowDown') step = 1;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') step = -1;
    if (rtl && (k === 'ArrowRight' || k === 'ArrowLeft')) step = -step;
    if (k === 'Home') { e.preventDefault(); choose(0, true); return; }
    if (k === 'End') { e.preventDefault(); choose(sites.length - 1, true); return; }
    if (!step) return;
    e.preventDefault();
    choose(cur + step, true);
  });
  choose(cur);

  /* ---- the fluid ------------------------------------------------------------------------------------------------------ */
  const allowSoftware = window.__ydxAllowSoftware === true || /[?&]ydxsw\b/.test(location.search);
  const fx = F && cv ? F.create(cv, { tier: coarse ? 1 : 0, allowSoftware, power: 'high-performance', dprCap: 1.5 }) : null;
  const noGl = () => {
    if (hint) hint.textContent = hint.dataset.nogl || hint.textContent;
    if (cv) cv.style.cursor = 'default';
    if (cursor) cursor.remove();
  };
  if (!fx) { noGl(); return; }

  const REVEAL = `
uniform sampler2D uDye, uVel, uImgA, uImgB; uniform vec2 uRes, uTexel; uniform float uMix, uTime; uniform vec4 uCoverA, uCoverB;
uniform vec3 uInk; uniform float uRtl;
float ink(vec2 uv){ vec3 c = texture2D(uDye, uv).rgb; return c.r + c.g + c.b; }
vec3 shot(sampler2D t, vec4 cov, vec2 uv, vec2 off){
  vec2 q = uv * cov.xy + cov.zw;
  return vec3(texture2D(t, q - off * 1.4).r, texture2D(t, q - off).g, texture2D(t, q - off * .6).b);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 dye = texture2D(uDye, uv).rgb;
  vec2 vel = texture2D(uVel, uv).xy;
  float m = max(dye.r, max(dye.g, dye.b));
  vec3 t = dye / max(m, .0001) * (1. - exp(-m * 1.6));          // tonemap the strength, keep the hue
  float l = dot(t, vec3(.3, .59, .11));
  t = max(mix(vec3(l), t, 1.45), 0.);
  float dens = clamp((dye.r + dye.g + dye.b) * .55, 0., 1.);
  vec2 off = clamp(vel * .00018, -.02, .02);
  // the switch between two sites: a sweep whose edge is bent by the ink itself
  float q = mix(uv.x, 1. - uv.x, uRtl) * .55 + (1. - uv.y) * .45 + (dye.g - dye.b) * .25;
  float sweep = 1. - smoothstep(uMix - .12, uMix + .12, q);   // 1 behind the front (the new site), 0 ahead of it
  vec3 img = mix(shot(uImgB, uCoverB, uv, off), shot(uImgA, uCoverA, uv, off), sweep);
  float reveal = smoothstep(.3, .85, dens);
  vec2 e = uTexel * 2.5;
  vec3 n = normalize(vec3(ink(uv - vec2(e.x, 0.)) - ink(uv + vec2(e.x, 0.)), ink(uv - vec2(0., e.y)) - ink(uv + vec2(0., e.y)), 1.1));
  float lit = clamp(dot(n, normalize(vec3(-.45, .55, 1.))), 0., 1.);
  vec3 col = uInk + t * (.55 + .45 * lit);
  col = mix(col, img * (.86 + .2 * lit), reveal);
  col += t * reveal * (1. - reveal) * 2.2;                     // a coloured rim where the ink thins out
  col += pow(lit, 36.) * dens * .22;                            // wet glint
  float g = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  gl_FragColor = vec4(col + (g - .5) / 255., 1.);
}`;
  if (!fx.display(REVEAL)) { fx.destroy(); noGl(); return; }
  html.classList.add('pl-gl');

  const INK = F.rgb('#17130f');
  const tex = { A: null, B: null, aspA: 1.6, aspB: 1.6 };
  let mix = 1, mixFrom = 0, mixT0 = 0;
  const blank = d.createElement('canvas');
  blank.width = blank.height = 2;
  blank.getContext('2d').fillStyle = '#17130f';
  blank.getContext('2d').fillRect(0, 0, 2, 2);
  tex.A = fx.texture(blank); tex.B = fx.texture(blank);
  const images = new Map();
  const loadImg = (id) => {
    if (images.has(id)) return images.get(id);
    const p = new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = `/work/${id}.webp`; });
    images.set(id, p);
    return p;
  };
  let pickToken = 0;
  onPick = (s) => {
    const token = ++pickToken;
    palette = s.pal.map(F.rgb);
    pi = 0;
    loadImg(s.id).then((im) => {
      if (token !== pickToken || fx.lost) return;
      // the outgoing site becomes B, the incoming A; the sweep runs from 0 to 1
      const t = tex.B; tex.B = tex.A; tex.A = fx.texture(im, t); tex.aspB = tex.aspA; tex.aspA = im.naturalWidth / im.naturalHeight;
      mix = 0; mixT0 = performance.now(); mixFrom = 0;
      splash(0.5 + (Math.random() - 0.5) * 0.3, 0.55 + (Math.random() - 0.5) * 0.2, 1);
      kick();
    }, () => {});
    // warm the neighbours so the next switch is instant
    [1, -1].forEach((k) => loadImg(sites[(cur + k + sites.length) % sites.length].id));
  };
  let palette = sites[cur].pal.map(F.rgb), pi = 0;
  const cover = (asp) => {
    const ca = cv.width / cv.height;
    return ca > asp ? [1, asp / ca, 0, 0.5 - 0.5 * asp / ca] : [ca / asp, 1, 0.5 - 0.5 * ca / asp, 0];
  };
  const uniforms = (gl, u, bind) => {
    gl.uniform1i(u('uImgA'), bind(2, tex.A));
    gl.uniform1i(u('uImgB'), bind(3, tex.B));
    gl.uniform4fv(u('uCoverA'), cover(tex.aspA));
    gl.uniform4fv(u('uCoverB'), cover(tex.aspB));
    gl.uniform1f(u('uMix'), mix * 1.4 - 0.2);
    gl.uniform3fv(u('uInk'), INK);
    gl.uniform1f(u('uRtl'), rtl ? 1 : 0);
  };

  /* ---- painting ------------------------------------------------------------------------------------------------------- */
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const P = { x: 0, y: 0, px: 0, py: 0, down: false, inside: false, last: 0 };
  let userAt = -1e9, strokeAt = 0;
  const splash = (x, y, k) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random(), f = 900 + Math.random() * 700;
      fx.splat(x, y, Math.cos(a) * f, Math.sin(a) * f, mul(palette[i % palette.length], 0.55 * k), 0.5 + Math.random() * 0.35);
    }
  };
  cv.addEventListener('pointerdown', (e) => {
    P.down = true; P.x = P.px = e.clientX; P.y = P.py = e.clientY; userAt = performance.now(); pi++;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const r = cv.getBoundingClientRect();
    fx.splat((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 0, 0, mul(palette[pi % palette.length], 0.6), 0.45);
    kick();
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && !P.down) return;
    if (!P.inside) { P.px = e.clientX; P.py = e.clientY; }
    P.inside = true; P.x = e.clientX; P.y = e.clientY; userAt = performance.now();
    kick();
  });
  const up = () => { P.down = false; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { P.inside = false; up(); });

  $('[data-splash]')?.addEventListener('click', () => { userAt = performance.now(); splash(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, 1.2); kick(); });
  let clearing = 0;
  $('[data-clear]')?.addEventListener('click', () => { clearing = 24; kick(); });

  /* ---- the designer's cursor paints while nobody does ----------------------------------------------------------------- */
  const bot = { on: false, x: 0, y: 0, px: 0, py: 0, t: Math.random() * 10 };
  const botActive = () => !still() && cursor && performance.now() - userAt > 5000;

  /* ---- loop ------------------------------------------------------------------------------------------------------------ */
  let raf = 0, last = 0, ema = 16, slow = 0, quietUntil = 0;
  function kick() { quietUntil = performance.now() + 2500; start(); }
  const tick = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    ema += (dt * 1000 - ema) * 0.08;
    if (!window.__ydxFluidNoAdapt) { if (ema > 26) slow++; else slow = Math.max(0, slow - 2); if (slow > 50) { slow = 0; ema = 16; fx.degrade(); } }
    const r = cv.getBoundingClientRect();
    // user strokes
    if (P.inside || P.down) {
      const dx = P.x - P.px, dy = P.y - P.py;
      if (dx || dy) {
        if (now - strokeAt > 1400) { pi++; strokeAt = now; }
        const sp = Math.min(1, Math.hypot(dx, dy) / 50);
        const k = P.down ? 0.22 + 0.22 * sp : 0.08 + 0.16 * sp;
        fx.splat((P.x - r.left) / r.width, (P.y - r.top) / r.height, dx / r.width * 6000, dy / r.height * 6000, mul(palette[pi % palette.length], k), P.down ? 0.22 + 0.16 * sp : 0.16 + 0.1 * sp);
      }
      P.px = P.x; P.py = P.y;
    }
    // the bot
    const want = botActive();
    if (want !== bot.on) { bot.on = want; cursor.classList.toggle('is-on', want); if (want) { bot.px = bot.x; bot.py = bot.y; } }
    if (bot.on) {
      bot.t += dt * 0.55;
      const t = bot.t;
      bot.x = r.width * (0.5 + 0.36 * Math.sin(t * 1.3) * Math.cos(t * 0.37));
      bot.y = r.height * (0.56 + 0.26 * Math.sin(t * 1.9 + 1.1));
      const dx = bot.x - bot.px, dy = bot.y - bot.py;
      if (Math.floor(t / 2.6) !== Math.floor((t - dt * 0.55) / 2.6)) pi++;
      fx.splat(bot.x / r.width, bot.y / r.height, dx / r.width * 6000, dy / r.height * 6000, mul(palette[pi % palette.length], 0.16), 0.26);
      cursor.style.transform = `translate3d(${bot.x.toFixed(1)}px, ${bot.y.toFixed(1)}px, 0)`;
      bot.px = bot.x; bot.py = bot.y;
      quietUntil = now + 1000;
    }
    if (clearing > 0) { fx.fade(0.84); clearing--; }
    if (mix < 1) mix = Math.min(1, (now - mixT0) / 1100);
    fx.frame(dt, { curl: still() ? 8 : 20, dyeDiss: still() ? 0.25 : 0.42, velDiss: still() ? 1.2 : 0.4 }, uniforms);
    start();
  };
  function start() {
    if (raf || d.hidden || fx.lost) return;
    // with reduced motion the fluid only moves while someone paints (and settles for 2.5s after)
    if (still() && performance.now() > quietUntil && mix >= 1 && !clearing) { last = 0; return; }
    raf = requestAnimationFrame(tick);
  }
  d.addEventListener('visibilitychange', () => { if (!d.hidden) start(); else { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; } });
  addEventListener('resize', () => { fx.resize(); fx.draw(uniforms); kick(); }, { passive: true });
  mq.addEventListener?.('change', kick);

  // A first composition, so the lab never opens on an empty screen (also the still frame under reduced motion).
  const seed = () => {
    const pts = rtl ? [[0.3, 0.55], [0.55, 0.7], [0.18, 0.78]] : [[0.7, 0.55], [0.45, 0.7], [0.82, 0.78]];
    pts.forEach(([x, y], i) => splash(x, y, 1.1 - i * 0.2));
    for (let i = 0; i < 40; i++) fx.frame(1 / 60, { curl: 20, dyeDiss: 0.1, velDiss: 0.5 }, uniforms);
  };
  loadImg(sites[cur].id).then((im) => {
    tex.A = fx.texture(im, tex.A); tex.aspA = im.naturalWidth / im.naturalHeight; mix = 1;
    seed();
    if (!still()) { userAt = performance.now() - 3800; } // the designer's cursor picks up the brush after ~1s
    kick();
  }, () => { seed(); kick(); });
  window.__ydxLab = { fx, get running() { return !!raf; }, get site() { return sites[cur].id; }, get bot() { return bot.on; }, get tier() { return fx.tier; } };
})();
