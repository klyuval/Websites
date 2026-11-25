/* ydx "ripple field" for TOMI (tomi-store), round 5.
 *
 * The stage's signature is a ring ripple behind the 3D device. Below the hero (and on every sand page) the store
 * was flat colour. This turns those fields into a living surface: the section's own ring centre keeps sending slow
 * ripples outward, the pointer carries a soft light, moving or tapping drops a ripple into the page (it rides with
 * the content when you scroll), scroll speed makes the rings rush, and the light takes the current model's colour
 * (or the product you hover in the shop).
 *
 * How: ONE small raw-WebGL canvas, fixed over the page under the header/menus/drawers, `mix-blend-mode: soft-light`
 * and `pointer-events: none`. The shader outputs neutral grey (no change) by default and a per-section
 * light/shade around it. Soft-light never moves pure black or white, and per section the field may only push the
 * background AWAY from its text colour (sand with ink text: mostly lighter or a light tinted shade; pink/green with
 * cream text: only deeper; ink: only lifted), so text contrast never drops meaningfully below the original.
 *
 * Cost and manners:
 *  - It never runs while the app's three.js is drawing: the app renders only while `scroll <= .track height` on
 *    the home (hero/dial/flavour page), so the field sleeps there and wakes once the 3D has stopped, and on pages.
 *  - Rendered at 0.5x CSS pixels (0.4 on touch, 0.33 in the hub iframe; it is a soft field), DPR ignored,
 *    adaptive step-down on slow frames, 30 fps when nothing is happening, paused in hidden tabs, after context loss
 *    and when not needed. Software GL (failIfMajorPerformanceCaveat) gets nothing.
 *  - Reduced motion (media query or the ydx motion toggle): no autonomous motion and no ripples; a static frame
 *    re-drawn only when the page scrolls under it.
 *  - CSP: external file, no eval; all styling via CSSOM (no style attributes), so it works without enhance.css.
 */
(function () {
  'use strict';
  if (window.__ydxField) return;
  window.__ydxField = 1;
  var html = document.documentElement, body = document.body;
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = matchMedia('(pointer: coarse)').matches;
  var frameMode = html.classList.contains('ydx-frame');
  var allowSW = false;
  try { allowSW = sessionStorage.getItem('ydx-sw') === '1'; } catch (e) {}
  function reducedNow() { return rmq.matches || html.getAttribute('data-ydx-motion') === 'off'; }

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform float uScale,uT,uM,uPtrA,uPar,uVel,uN;uniform vec2 uPtr;',
    'uniform vec4 uRip[8];uniform vec4 uBand[6];uniform vec3 uTint[6];uniform vec2 uCtr[6];',
    // 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
    'vec3 pm(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    'vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    'vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);',
    'vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    'vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;',
    'vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;',
    'm*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    'vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}',
    // the stage's ring motif: slow ripples leaving the section's ring centre, sharp front and a long soft tail
    'float ring(vec2 c,vec2 o,float t,float wv){float d=length(c-o)/uM+wv;float w=fract(d*1.5-t*.16);',
    'return smoothstep(0.,.03,w)*(1.-smoothstep(.03,.5,w))*exp(-d*.8);}',
    'void main(){',
    ' vec2 c=gl_FragCoord.xy/uScale;vec2 q=c/uM;',
    ' float n=sn(q*1.3+vec2(uT*.035,uPar));float wv=n*.05;',
    ' float lo=0.,hi=0.,amb=0.;vec3 tint=vec3(1.);',
    ' for(int i=0;i<6;i++){if(float(i)>=uN)break;vec4 b=uBand[i];',
    '  float w=smoothstep(b.y-40.,b.y+40.,c.y)*(1.-smoothstep(b.x-40.,b.x+40.,c.y));',
    '  lo=mix(lo,b.z,w);hi=mix(hi,b.w,w);tint=mix(tint,uTint[i],w);amb=mix(amb,ring(c,uCtr[i],uT,wv),w);}',
    ' float l=amb*.55+n*.16;',
    ' vec2 dp=(c-uPtr)/uM;l+=uPtrA*.5*exp(-dot(dp,dp)*16.);',
    ' for(int i=0;i<8;i++){vec4 r=uRip[i];if(r.w<=0.)continue;',
    '  float d=length(c-r.xy)/uM;float x=(d-r.z*.42)/(.025+r.z*.045);',
    '  l+=r.w*-x*exp(-x*x)*1.6*exp(-r.z*1.3);}',
    ' float dir=hi>=lo?1.:-1.;l=clamp(l*dir*(1.+uVel*.6),-lo,hi);',
    ' vec3 s=.5+(l>0.?l*tint:l*(2.-tint));',
    ' float g=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(clamp(s+(g-.5)*.008,0.,1.),1.);}'
  ].join('\n');

  var cv = null, gl = null, prog = null, U = {}, lost = false, dead = false;
  var scale = frameMode ? 0.33 : coarse ? 0.4 : 0.5, stepped = 0;
  var raf = 0, on = false, last = 0, ema = 16, slow = 0, skip = 0;
  var T = 0, vel = 0, lastSY = scrollY, lastST = 0;
  var px = -1e4, py = -1e4, sx = -1e4, sy = -1e4, ptrA = 0, lastMove = -1e9, ex = -1e4, ey = -1e4;
  var rip = [], bands = [], track = null, trackH = 0, dirtyGeo = true, lastGeo = 0, lastCol = 0;
  var RIP = new Float32Array(32), BAND = new Float32Array(24), TINT = new Float32Array(18), CTR = new Float32Array(12);

  /* ------------------------------------------------------------------ GL setup */
  function build() {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one oversized triangle
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ['uScale', 'uT', 'uM', 'uPtrA', 'uPar', 'uVel', 'uN', 'uPtr', 'uRip', 'uBand', 'uTint', 'uCtr'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
  }
  function init() {
    if (cv || dead) return !!gl;
    cv = document.createElement('canvas');
    cv.className = 'ydx-field';
    cv.setAttribute('aria-hidden', 'true');
    var s = cv.style; // CSSOM, not a style attribute: fine under a strict style-src, and no dependency on enhance.css
    s.position = 'fixed'; s.left = '0'; s.top = '0'; s.width = '100%'; s.height = '100%'; s.zIndex = '15';
    s.pointerEvents = 'none'; s.mixBlendMode = 'soft-light'; s.opacity = '0'; s.visibility = 'hidden';
    s.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), visibility 0s .7s';
    try {
      gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false,
        powerPreference: 'low-power', failIfMajorPerformanceCaveat: !allowSW });
      if (gl) build();
    } catch (e) { gl = null; }
    if (!gl) { dead = true; cv = null; html.classList.add('ydx-nofield'); return false; }
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; stop(); });
    cv.addEventListener('webglcontextrestored', function () {
      lost = false;
      try { build(); wake(); } catch (e) { dead = true; hide(); }
    });
    body.appendChild(cv);
    html.classList.add('ydx-field-on');
    return true;
  }

  /* ------------------------------------------------------------------ page geometry (doc coords, cached) */
  function rgb(str) {
    var m = str && str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var v = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat);
      return [v[0] / 255, v[1] / 255, v[2] / 255, v.length > 3 ? v[3] : 1];
    }
    m = str && str.trim().match(/^#([0-9a-f]{6})$/i);
    if (m) { var h = parseInt(m[1], 16); return [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255, 1]; }
    return null;
  }
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function modelTint(light) {
    var v = getComputedStyle(html).getPropertyValue(light ? '--c1' : '--c2');
    return rgb(v) || (light ? [0.55, 0.45, 0.77, 1] : [0.42, 0.2, 0.72, 1]);
  }
  function geometry() {
    dirtyGeo = false;
    lastGeo = performance.now();
    measureTrack();
    var inPage = body.classList.contains('in-page');
    var els = inPage ? document.querySelectorAll('.pages .pg, .pages .pg > *, .pages .foot') : document.querySelectorAll('.home > *');
    var out = [], y0 = scrollY, rtl = html.dir === 'rtl';
    for (var i = 0; i < els.length; i++) {
      var el = els[i], r = el.getBoundingClientRect();
      if (r.height < 160 || r.width < innerWidth * 0.6) continue;
      var cs = getComputedStyle(el), bg = rgb(cs.backgroundColor), grad = /gradient/.test(cs.backgroundImage) && rgb(cs.backgroundImage);
      if ((!bg || bg[3] < 0.5) && !grad) continue; // transparent wrapper: its parent's band covers it
      var fill = bg && bg[3] >= 0.5 ? bg : grad, text = rgb(cs.color) || [0, 0, 0, 1];
      var lb = lum(fill), lt = lum(text), lo, hi, tint;
      var g;
      if (lt < lb) { lo = 0.3; hi = 0.5; tint = null; g = 1.6; }               // dark text on a light field: light + tinted shade
      else if (lb < 0.03) { lo = 0; hi = 0.4; tint = 'light'; g = 2.6; }       // ink: can only be lifted (cream text keeps >10:1)
      else { lo = 0.45; hi = 0.03; tint = fill; g = 1.2; }                       // cream text on colour: only ever deeper
      var rx = parseFloat(cs.getPropertyValue('--rx')), ry = parseFloat(cs.getPropertyValue('--ry'));
      var cx = isNaN(rx) ? (rtl ? 0.7 : 0.3) : rx / 100;
      var cyPx = isNaN(ry) ? Math.min(r.height / 2, 420) : r.height * ry / 100;
      out.push({ el: el, top: r.top + y0, bot: r.bottom + y0, left: r.left, w: r.width, lo: lo, hi: hi, tk: tint, g: g, tint: null, cx: cx, cy: cyPx });
    }
    bands = out;
    colours();
  }
  function colours() {
    lastCol = performance.now();
    var shop = document.querySelector('.pg.shop.lit, .finder.lit'), hc = shop && rgb(getComputedStyle(shop).getPropertyValue('--hc'));
    var dark = hc || modelTint(false), light = modelTint(true);
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var c = b.tk === null ? dark : b.tk === 'light' ? light : b.tk;
      // per-channel gain of the soft-light source: the light carries the hue, and the shade darkens the other
      // channels more than the hue, so it deepens towards the same hue instead of going muddy
      var L = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      b.tint = [0, 1, 2].map(function (j) { return Math.min(2, Math.max(0, 1 + b.g * (c[j] - L))); });
    }
  }

  /* ------------------------------------------------------------------ input */
  function now() { return performance.now(); }
  function emit(x, y, a) {
    if (reducedNow()) return;
    rip.push({ x: x, y: y + scrollY, t: now(), a: a });
    if (rip.length > 8) rip.shift();
    ex = x; ey = y;
    wake();
  }
  document.addEventListener('pointermove', function (e) {
    px = e.clientX; py = e.clientY; lastMove = now();
    if (!on) return;
    var dx = px - ex, dy = py - ey;
    if (dx * dx + dy * dy > (e.pointerType === 'mouse' ? 140 * 140 : 70 * 70)) emit(px, py, e.pointerType === 'mouse' ? 0.32 : 0.5);
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) { px = e.clientX; py = e.clientY; lastMove = now(); if (on) emit(px, py, 1); }, { passive: true });
  // touch drags are scrolls (pointer events get cancelled): follow the finger anyway, it is the touch "cursor"
  document.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (!t || !on) return;
    px = t.clientX; py = t.clientY; lastMove = now();
    var dx = px - ex, dy = py - ey;
    if (dx * dx + dy * dy > 90 * 90) emit(px, py, 0.45);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { lastMove = -1e9; });
  addEventListener('scroll', function () {
    var t = now(), y = scrollY, dt = Math.max(8, t - lastST);
    var v = Math.min(1, Math.abs(y - lastSY) / dt / 4); // 4 px/ms = full stir
    vel = Math.max(vel, v);
    lastSY = y; lastST = t;
    wake();
  }, { passive: true });
  function measureTrack() { track = document.querySelector('.track'); trackH = track ? track.offsetHeight : innerHeight; }
  function refresh() { dirtyGeo = true; requestAnimationFrame(function () { measureTrack(); wake(); }); }
  addEventListener('resize', refresh);
  addEventListener('hashchange', function () { rip.length = 0; refresh(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else wake(); });
  addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });
  new MutationObserver(refresh).observe(body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(refresh).observe(html, { attributes: true, attributeFilter: ['lang', 'data-ydx-motion'] });
  ['.home', '.pages'].forEach(function (s) {
    var el = document.querySelector(s);
    if (el) new MutationObserver(function () { dirtyGeo = true; }).observe(el, { childList: true, subtree: true });
  });
  if (rmq.addEventListener) rmq.addEventListener('change', function () { wake(); });

  /* ------------------------------------------------------------------ run state */
  // the app draws its 3D scene only while scroll <= .track height on the home (see the bundle's render guard)
  function busy3D() {
    if (body.classList.contains('in-page')) return false;
    return !trackH || scrollY <= trackH + 1; // no measurable track on the home: assume the 3D is up
  }
  function eligible() {
    return !document.hidden && !lost && !dead && html.classList.contains('ready') &&
      !body.classList.contains('gated') && !body.classList.contains('menu-open') && !busy3D();
  }
  function show() {
    if (!cv) return;
    cv.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), visibility 0s 0s';
    cv.style.visibility = 'visible'; cv.style.opacity = '1';
  }
  function hide() {
    if (!cv) return;
    cv.style.transition = 'opacity .25s linear, visibility 0s .25s';
    cv.style.opacity = '0'; cv.style.visibility = 'hidden';
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; on = false; hide(); }
  function wake() {
    if (!eligible()) { if (on || (cv && cv.style.opacity !== '0')) stop(); return; }
    if (!init()) return;
    if (!on) { on = true; last = 0; show(); }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  var jsSum = 0, jsN = 0; // QA: main-thread cost of a field frame
  function tick(t) {
    raf = 0;
    var t0 = performance.now();
    tick1(t);
    jsSum += performance.now() - t0; jsN++;
  }
  function tick1(t) {
    if (!eligible()) { stop(); return; }
    var dt = last ? Math.min(50, t - last) : 16;
    last = t;
    var rm = reducedNow();
    // adaptive quality: a sustained slow page steps the field's resolution down (never back up: no oscillation)
    ema += (dt - ema) * 0.05;
    if (ema > 26) { if (++slow > 60 && scale > 0.2) { scale *= 0.75; slow = 0; stepped++; } } else slow = 0;
    if (dirtyGeo || t - lastGeo > 3000) geometry();
    else if (t - lastCol > 800) colours();
    // scroll velocity decays smoothly; it speeds the ambient clock (rings rush while you scroll)
    vel *= Math.exp(-dt / 220);
    if (!rm) T += dt / 1000 * (1 + 4 * vel);
    // pointer light: lerped position, on while the pointer moved in the last 2.5 s
    var k = 1 - Math.exp(-dt / 90);
    if (sx < -1e3) { sx = px; sy = py; }
    sx += (px - sx) * k; sy += (py - sy) * k;
    var want = !rm && t - lastMove < (coarse ? 900 : 2500) ? 1 : 0;
    ptrA += (want - ptrA) * (1 - Math.exp(-dt / (want ? 260 : 700)));
    var alive = 0;
    for (var i = rip.length - 1; i >= 0; i--) if (t - rip[i].t > 3600) rip.splice(i, 1);
    alive = rip.length;
    var busy = alive || ptrA > 0.02 || vel > 0.01 || dirtyGeo;
    // idle: 30 fps is plenty for a slow ambient ripple; reduced motion: one frame, redrawn on scroll only
    if (rm || frameMode || !busy) { if ((skip = (skip + 1) % 2) === 1 && !rm) { raf = requestAnimationFrame(tick); return; } }
    draw(t);
    if (!rm) raf = requestAnimationFrame(tick);
  }

  function draw(t) {
    var W = innerWidth, H = innerHeight, w = Math.max(1, Math.round(W * scale)), h = Math.max(1, Math.round(H * scale));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    var y0 = scrollY, n = 0;
    BAND.fill(0); TINT.fill(1); CTR.fill(0);
    for (var i = 0; i < bands.length && n < 6; i++) {
      var b = bands[i];
      if (b.bot < y0 - 60 || b.top > y0 + H + 60) continue;
      BAND[n * 4] = H - (b.top - y0); BAND[n * 4 + 1] = H - (b.bot - y0); BAND[n * 4 + 2] = b.lo; BAND[n * 4 + 3] = b.hi;
      var c = b.tint || [1, 1, 1];
      TINT[n * 3] = c[0]; TINT[n * 3 + 1] = c[1]; TINT[n * 3 + 2] = c[2];
      CTR[n * 2] = b.left + b.w * b.cx; CTR[n * 2 + 1] = H - (b.top - y0 + b.cy);
      n++;
    }
    RIP.fill(0);
    for (var j = 0; j < rip.length; j++) {
      var r = rip[j];
      RIP[j * 4] = r.x; RIP[j * 4 + 1] = H - (r.y - y0); RIP[j * 4 + 2] = (t - r.t) / 1000; RIP[j * 4 + 3] = r.a;
    }
    var M = Math.min(W, H);
    gl.uniform1f(U.uScale, w / W);
    gl.uniform1f(U.uT, T % 1000);
    gl.uniform1f(U.uM, M);
    gl.uniform1f(U.uPtrA, ptrA);
    gl.uniform1f(U.uPar, (y0 * 0.35 / M) % 289);
    gl.uniform1f(U.uVel, vel);
    gl.uniform1f(U.uN, n);
    gl.uniform2f(U.uPtr, sx, H - sy);
    gl.uniform4fv(U.uRip, RIP);
    gl.uniform4fv(U.uBand, BAND);
    gl.uniform3fv(U.uTint, TINT);
    gl.uniform2fv(U.uCtr, CTR);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // debug/QA handle (read-only numbers; nothing in the store uses it)
  window.__ydxFieldState = function () {
    return { on: on, dead: dead, lost: lost, scale: +scale.toFixed(3), stepped: stepped, ema: +ema.toFixed(1), jsms: jsN ? +(jsSum / jsN).toFixed(3) : 0, frames: jsN, bands: bands.length, ripples: rip.length, busy3D: busy3D(), w: cv && cv.width, h: cv && cv.height };
  };
  measureTrack();
  wake();
})();
