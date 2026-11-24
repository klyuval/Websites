/* ==========================================================================
   Pack & Peak route lab (/play/), round 5. Vanilla JS; uses YdxTopo (ydx/topo.js) for the WebGL map.
   - A living topographic sheet: hypsometric tints, sienna contours every 50 m (index every 250 m), hillshade,
     tarns with moving hatch, cloud shadows drifting over it.
   - Draw a route (pointer, pen or touch drag); the readout measures it live from the same height function the
     shader draws (JS port of the noise): distance, elevation gain, trail time (Naismith), highest point, a
     difficulty stamp and a profile in the journey's readout style. "Walk it" runs a hiker along the line.
   - Raise / Dig tools sculpt the land: press and hold to grow a peak or sink a tarn (springy, contours ripple);
     the route's numbers follow the land as it changes. "New land" morphs the terrain into a new seed.
   - Keyboard: every action is a button; "Plot one for me" lays switchbacks from a valley to the highest summit.
   Fallbacks: no WebGL -> a 2D-canvas contour render from the same heights; reduced motion -> static map,
   instant results; no JS -> the static topo sheet and a note (see index.html).
   ========================================================================== */
(function () {
  'use strict';
  var W = window, D = document, html = D.documentElement;
  var T = W.YdxTopo;
  var $ = function (s) { return D.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(D.querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var U = 380, MPX = 9, BASE = 1500, RANGE = 850, LAKE = 1110, MAXB = 16;   // 1 css px = 9 m: 1 km = 111 px
  var t0 = performance.now();

  /* ---------- the land (JS twin of the shader's height()) ---------- */
  var seed = [11.3, 4.2], seedT = seed.slice(), bumps = [];
  function terr(x, y) {
    if (!T) return 0;
    var N = T.noise2, ux = x + seed[0], uy = y + seed[1], n = 0, a = .5, px = ux * .55, py = uy * .55;
    for (var i = 0; i < 4; i++) { n += a * N(px, py); var nx = 1.6 * px - 1.2 * py + 3.1, ny = 1.2 * px + 1.6 * py + 1.7; px = nx; py = ny; a *= .5; }
    var q = N(ux * .9 + 7.3, uy * .9 + 7.3), r = 1 - Math.sqrt(q * q + .03); r *= r;   // softened ridges (no creases)
    return n * .95 + r * .5 - .25;
  }
  function height(x, y) {
    var h = terr(x, y);
    for (var i = 0; i < bumps.length; i++) { var b = bumps[i], dx = x - b.x, dy = y - b.y; h += b.a * Math.exp(-(dx * dx + dy * dy) / (b.r * b.r)); }
    return h;
  }
  function metres(x, y) { return Math.max(LAKE, BASE + height(x, y) * RANGE); }
  function cx() { return innerWidth / 2; }
  function cy() { return innerHeight / 2; }
  function toU(px, py) { return [(px - cx()) / U, (py - cy()) / U]; }
  function toPx(u) { return [cx() + u[0] * U, cy() + u[1] * U]; }

  var FRAG = [
    'uniform vec2 uRes,uCenter,uSeed; uniform float uDpr,uTime; uniform vec4 uB[16];',
    'const float U=380.;',
    'float terr(vec2 u){u+=uSeed;float n=0.,a=.5;vec2 p=u*.55;',
    ' for(int i=0;i<4;i++){n+=a*snoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,1.7);a*=.5;}',
    ' float q=snoise(u*.9+7.3),r=1.-sqrt(q*q+.03);r*=r;return n*.95+r*.5-.25;}',
    'float height(vec2 u){float h=terr(u);for(int i=0;i<16;i++){vec2 d=u-uB[i].xy;h+=uB[i].w*exp(-dot(d,d)/(uB[i].z*uB[i].z+1e-4));}return h;}',
    'void main(){',
    ' vec2 css=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr; vec2 u=(css-uCenter)/U;',
    ' float m=1500.+height(u)*850., t=uTime;',
    ' vec3 col=mix(vec3(.84,.89,.74),vec3(.953,.925,.859),smoothstep(1150.,1500.,m));',      // valleys: pale green
    ' col=mix(col,vec3(.93,.86,.74),smoothstep(1800.,2150.,m));',                            // high ground: warm
    ' col=mix(col,vec3(1.,.985,.955),smoothstep(2200.,2360.,m));',                           // summits: snow
    ' float lv=m/50., f=abs(fract(lv-.5)-.5), idx=step(mod(floor(lv+.5),5.),.5);',
    '#ifdef DERIV',
    ' float fw=max(fwidth(lv),1e-4); float line=(1.-smoothstep(mix(.6,1.1,idx)*uDpr-.6,mix(.6,1.1,idx)*uDpr+.6,f/fw))*smoothstep(.45,.2,fw);',
    ' vec2 g=vec2(dFdx(m),-dFdy(m))*uDpr/9.; vec3 n=normalize(vec3(-g*.8,1.)); vec3 L=normalize(vec3(-1.,-1.,1.3));',
    ' col*=1.+clamp(dot(n,L)-L.z,-.5,.3)*.32;',                                                          // hillshade, light from the NW
    ' float shore=1.-smoothstep(.8,1.8,abs(m-1110.)/max(fwidth(m),1e-3));',
    '#else',
    ' float line=1.-smoothstep(.03,.06,f); float shore=1.-smoothstep(2.,6.,abs(m-1110.));',
    '#endif',
    ' col=mix(col,vec3(.69,.41,.2),line*mix(.36,.7,idx));',                                  // sienna contours
    ' float wm=smoothstep(1112.,1108.,m);',
    ' vec3 wc=mix(vec3(.66,.82,.95),vec3(.5,.72,.92),smoothstep(1110.,940.,m));',
    ' float hatch=smoothstep(.72,.96,sin((css.y+3.*sin(css.x*.03+t*.9))*.6+t*.4))*.35;',     // moving water hatch
    ' wc=mix(wc,vec3(.16,.44,.71),hatch);',
    ' col=mix(col,wc,wm); col=mix(col,vec3(.16,.44,.71),shore*.9);',
    ' float c=smoothstep(.15,.75,snoise(u*.42+vec2(t*.018,t*.007))*.6+snoise(u*.9-vec2(t*.011,0.))*.4);',
    ' col*=1.-c*vec3(.1,.085,.06);',                                                         // cloud shadows drift over
    ' float dith=(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5)/255.;',
    ' gl_FragColor=vec4(col+dith,1.);',
    '}'
  ].join('\n');

  /* ---------- renderer: WebGL, else a 2D contour render ---------- */
  var glc = $('#lab-gl'), c2 = $('#lab-2d'), eng = null, dirty = true, t = 0, B = new Float32Array(MAXB * 4);
  var dbg = W.__ydxTopoDebug || {};
  if (T && glc) eng = T.engine(glc, FRAG, ['uRes', 'uDpr', 'uTime', 'uCenter', 'uSeed', 'uB'], {
    allowSoftware: !!dbg.allowSoftware, fixedQuality: !!dbg.fixedQuality, maxDpr: fine ? 1.5 : 1.25, fps: 30, debug: dbg.debug,
    onLost: function () { glc.removeAttribute('data-on'); }, onRestore: function () { dirty = true; start(); }, onFail: function () { eng = null; draw2d(); }
  });
  var drawn = false;
  function drawGL() {
    for (var i = 0; i < MAXB; i++) {
      var b = bumps[i];
      B[i * 4] = b ? b.x : 0; B[i * 4 + 1] = b ? b.y : 0; B[i * 4 + 2] = b ? b.r : .1; B[i * 4 + 3] = b ? b.a : 0;
    }
    var ok = eng.draw(function (Un, gl, dpr, bw, bh) {
      gl.uniform2f(Un.uRes, bw, bh); gl.uniform1f(Un.uDpr, dpr); gl.uniform1f(Un.uTime, t);
      gl.uniform2f(Un.uCenter, cx(), cy()); gl.uniform2f(Un.uSeed, seed[0], seed[1]); gl.uniform4fv(Un.uB, B);
    });
    if (ok && !drawn) { drawn = true; glc.setAttribute('data-on', ''); }
  }
  var c2t = 0;
  function draw2d() {                                   // 1/3-resolution contour map from the JS heights (~80k samples)
    if (!T || !c2) { drawn = true; return; }
    var s = 3, w = Math.ceil(innerWidth / s), h = Math.ceil(innerHeight / s), x, y;
    c2.width = w; c2.height = h;
    var ctx = c2.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, row = new Float32Array(w + 1), prev = null;
    for (y = 0; y <= h; y++) {
      for (x = 0; x <= w; x++) { var u = toU(x * s, y * s); row[x] = BASE + height(u[0], u[1]) * RANGE; }
      if (prev && y > 0) for (x = 0; x < w; x++) {
        var m = prev[x], k = ((y - 1) * w + x) * 4, col;
        if (m < LAKE) col = [168, 209, 242];
        else if (m < 1500) col = [214 + (m - LAKE) / 390 * 29, 227 - (m - LAKE) / 390 * 3, 189 + (m - LAKE) / 390 * 30];
        else if (m < 2200) col = [243, 236, 219];
        else col = [255, 251, 244];
        var a = Math.floor(m / 50), line = a !== Math.floor(prev[x + 1] / 50) || a !== Math.floor(row[x] / 50);
        if (line && m >= LAKE) { var idx = (Math.floor(Math.max(m, prev[x + 1], row[x]) / 50) % 5) === 0, al = idx ? .75 : .45; col = [col[0] + (176 - col[0]) * al, col[1] + (104 - col[1]) * al, col[2] + (52 - col[2]) * al]; }
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
      prev = row.slice();
    }
    ctx.putImageData(img, 0, 0);
    c2.setAttribute('data-on', ''); drawn = true;
  }
  function req2d() { if (!eng && !c2t) c2t = setTimeout(function () { c2t = 0; draw2d(); }, 90); }

  /* ---------- route ---------- */
  var route = [], svg = $('#lab-route'), pCase = $('.lr-case'), pDash = $('.lr-dash'), startDot = $('.lr-start'), top = $('.lr-top'),
    hiker = $('.lr-hiker'), topLabel = $('.lr-label'), stats = null, statsDirty = false, routeDirty = false;
  function pathD(pts) {
    if (!pts.length) return '';
    var p = pts.map(toPx), s = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 1; i < p.length - 1; i++) s += 'Q' + p[i][0].toFixed(1) + ' ' + p[i][1].toFixed(1) + ' ' + ((p[i][0] + p[i + 1][0]) / 2).toFixed(1) + ' ' + ((p[i][1] + p[i + 1][1]) / 2).toFixed(1);
    if (p.length > 1) s += 'L' + p[p.length - 1][0].toFixed(1) + ' ' + p[p.length - 1][1].toFixed(1);
    return s;
  }
  function renderRoute() {
    routeDirty = false;
    var d = pathD(route);
    pCase.setAttribute('d', d); pDash.setAttribute('d', d);
    svg.classList.toggle('has-route', route.length > 1);
    if (route.length) { var a = toPx(route[0]); startDot.setAttribute('cx', a[0]); startDot.setAttribute('cy', a[1]); }
    if (stats && stats.hiAt) { var h = toPx(stats.hiAt); top.setAttribute('transform', 'translate(' + h[0].toFixed(1) + ' ' + h[1].toFixed(1) + ')'); topLabel.textContent = fmt(stats.hi) + ' m'; }
  }
  // Resample the line every ~6 px and measure it against the land.
  function measure() {
    statsDirty = false;
    if (route.length < 2) { stats = null; return readout(); }
    var pts = [], i, j;
    for (i = 1; i < route.length; i++) {
      var a = route[i - 1], b = route[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]) * U, n = Math.max(1, Math.ceil(seg / 6));
      for (j = 0; j < n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    pts.push(route[route.length - 1]);
    var el = pts.map(function (p) { return metres(p[0], p[1]); }), dist = 0, gain = 0, hi = -1e9, hiAt = pts[0], lo = 1e9, wet = false, cum = [0];
    for (i = 1; i < pts.length; i++) { dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * U * MPX; cum.push(dist); }
    var ref = el[0];
    for (i = 0; i < el.length; i++) {
      var e = (el[Math.max(0, i - 1)] + el[i] + el[Math.min(el.length - 1, i + 1)]) / 3;   // 3-tap smoothing
      if (e - ref > 8) { gain += e - ref; ref = e; } else if (e < ref) ref = e;            // 8 m hysteresis, like a GPS log
      if (el[i] > hi) { hi = el[i]; hiAt = pts[i]; }
      if (el[i] < lo) lo = el[i];
      if (el[i] <= LAKE + .5) wet = true;
    }
    stats = { pts: pts, el: el, cum: cum, km: dist / 1000, gain: gain, hi: hi, hiAt: hiAt, lo: lo, wet: wet };
    readout();
    routeDirty = true;
  }
  var elDist = $('#ls-dist'), elGain = $('#ls-gain'), elTime = $('#ls-time'), elName = $('#lab-name'), elHigh = $('#lab-high'),
    elStamp = $('#lab-stamp'), elKind = $('#lab-kind'), prof = $('#lab-profile'), walkBtn = $('[data-act=walk]'), lastStamp = '';
  function setStat(el, v, unit) { el.firstChild.nodeValue = v; el.lastChild.textContent = unit; }
  function hoursText(h) {
    if (h < 1) return [String(Math.max(5, Math.round(h * 12) * 5)), 'min'];
    var a = Math.floor(h), b = Math.ceil(h + .25);
    return [a === b ? String(a) : a + '–' + b, 'h'];
  }
  function readout() {
    var s = stats;
    if (!s) {
      setStat(elDist, '0', 'km'); setStat(elGain, '0', 'm'); setStat(elTime, '0', 'h');
      elName.textContent = 'Draw to begin'; elHigh.textContent = 'Highest point · –'; elStamp.textContent = 'Unplotted';
      elStamp.className = 'lab-stamp is-idle'; lastStamp = ''; elKind.textContent = 'Your line'; walkBtn.disabled = true;
      $('polygon', prof).setAttribute('points', '0,32 100,32'); $('polyline', prof).setAttribute('points', '');
      return;
    }
    setStat(elDist, s.km < 10 ? s.km.toFixed(1) : String(Math.round(s.km)), 'km');
    setStat(elGain, fmt(s.gain), 'm');
    var ht = hoursText(s.km / 4.5 + s.gain / 600); setStat(elTime, ht[0], ht[1]);
    var score = s.km + s.gain / 100;
    var stamp = score < 6 ? 'Easy going' : score < 14 ? 'Moderate' : score < 24 ? 'Challenging' : 'Epic';
    var name = s.hi > 2330 ? 'Summit push' : s.wet ? 'Tarn traverse' : s.gain < 120 ? 'Valley ramble' : s.km > 14 ? 'The long way round' : s.gain > 700 ? 'High traverse' : 'Ridge line';
    if (!walking) elName.textContent = name;
    elKind.textContent = s.wet ? 'Your line · bring a swimsuit' : 'Your line';
    elHigh.textContent = 'Highest point · ' + fmt(s.hi) + ' m';
    if (stamp !== lastStamp) { lastStamp = stamp; elStamp.textContent = stamp; elStamp.className = 'lab-stamp'; void elStamp.offsetWidth; elStamp.className = 'lab-stamp is-new'; }
    walkBtn.disabled = false;
    // profile, in the journey readout's style (0..100 x 2..30)
    var n = 60, pl = [], mx = Math.max(s.hi, s.lo + 60), mn = s.lo;
    for (var i = 0; i <= n; i++) {
      var e = s.el[Math.round(i / n * (s.el.length - 1))];
      pl.push((i / n * 100).toFixed(1) + ',' + (30 - (e - mn) / (mx - mn) * 28).toFixed(1));
    }
    $('polyline', prof).setAttribute('points', pl.join(' '));
    $('polygon', prof).setAttribute('points', '0,32 ' + pl.join(' ') + ' 100,32');
  }

  /* ---------- tools + input ---------- */
  var tool = 'draw', pad = $('#pad') || $('#lab-pad'), drawing = null, sculpt = null, hint = $('#lab-hint');
  function setTool(name) {
    tool = name;
    $$('[data-tool]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-tool') === name)); });
    html.classList.toggle('lab-sculpt', name !== 'draw'); html.classList.toggle('lab-dig', name === 'dig');
  }
  $$('[data-tool]').forEach(function (b, i, all) {
    b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); });
    b.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!k) return;
      e.preventDefault(); var nb = all[(i + k + all.length) % all.length]; nb.focus(); setTool(nb.getAttribute('data-tool'));
    });
  });
  function gone() { if (hint) hint.classList.add('is-gone'); }
  function bumpAt(u) {
    var best = null, bd = 1e9;
    bumps.forEach(function (b) { var d = Math.hypot(b.x - u[0], b.y - u[1]); if (d < bd) { bd = d; best = b; } });
    if (best && bd < .12) return best;
    if (bumps.length >= MAXB) return best;
    var nb = { x: u[0], y: u[1], r: .3, a: 0, ta: 0, v: 0 };
    bumps.push(nb); return nb;
  }
  pad.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    try { pad.setPointerCapture(e.pointerId); } catch (err) {}
    stopWalk(); gone();
    var u = toU(e.clientX, e.clientY);
    if (tool === 'draw') { drawing = { id: e.pointerId }; route = [u]; stats = null; statsDirty = routeDirty = true; }
    else { sculpt = { id: e.pointerId, b: bumpAt(u), last: u, sign: tool === 'dig' ? -1 : 1, t: performance.now() }; sculpt.base = sculpt.b ? sculpt.b.ta : 0; html.classList.add('lab-pressing'); }
    kick();
  });
  pad.addEventListener('pointermove', function (e) {
    moveReticle(e);
    var u = toU(e.clientX, e.clientY);
    if (drawing && e.pointerId === drawing.id) {
      var l = route[route.length - 1];
      if (Math.hypot(u[0] - l[0], u[1] - l[1]) * U > 5) { route.push(u); statsDirty = routeDirty = true; kick(); }
    } else if (sculpt && e.pointerId === sculpt.id) {
      if (Math.hypot(u[0] - sculpt.last[0], u[1] - sculpt.last[1]) > .16) { sculpt.b = bumpAt(u); sculpt.last = u; sculpt.t = performance.now(); sculpt.base = sculpt.b ? sculpt.b.ta : 0; }
    }
  });
  function up(e) {
    if (drawing && e.pointerId === drawing.id) { drawing = null; if (route.length < 3) { route = []; stats = null; } statsDirty = routeDirty = true; }
    if (sculpt && e.pointerId === sculpt.id) { sculpt = null; html.classList.remove('lab-pressing'); }
  }
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);

  /* reticle: live altitude under the pointer */
  var ret = $('#lab-reticle'), retRead = $('.lr-read', ret);
  var retAt = null;
  function moveReticle(e) {
    if (!fine || e.pointerType !== 'mouse') return;
    ret.classList.add('is-on');
    ret.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    retAt = [e.clientX, e.clientY]; readReticle();
  }
  function readReticle() {                              // also re-read every frame while the land under it moves
    if (!retAt) return;
    var u = toU(retAt[0], retAt[1]), m = BASE + height(u[0], u[1]) * RANGE;
    retRead.textContent = m < LAKE ? 'Tarn · ' + fmt(LAKE) + ' m' : fmt(m) + ' m';
  }
  pad.addEventListener('pointerleave', function () { ret.classList.remove('is-on'); retAt = null; });

  /* ---------- actions ---------- */
  function freeSamples() {                              // map points not under a panel
    var rs = $$('.lab-ui > section, .lab-top > *').map(function (el) { return el.getBoundingClientRect(); }), out = [];
    for (var y = 96; y < innerHeight - 50; y += 22) for (var x = 40; x < innerWidth - 40; x += 22) {
      if (rs.some(function (r) { return x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24; })) continue;
      out.push([x, y]);
    }
    return out;
  }
  var plotAnim = null;
  // Prefer a valley start whose line to the summit stays off the panels (switchbacks swing ~46 px either side).
  function clearStart(pts, ms, e, fallback) {
    var rs = $$('.lab-ui > section, .lab-top > *').map(function (el) { return el.getBoundingClientRect(); }), far = Math.min(innerWidth, innerHeight) * .3;
    var cand = pts.map(function (p, i) { return { p: p, m: ms[i], d: Math.hypot(p[0] - e[0], p[1] - e[1]) }; })
      .filter(function (c) { return c.m > LAKE + 15 && c.d > far && c.d < far * 2.6; })
      .sort(function (a, b) { return (a.m - a.d * .4) - (b.m - b.d * .4); });
    for (var pass = 0; pass < 2; pass++) for (var i = 0; i < cand.length; i++) {   // pass 0 also keeps its feet dry
      var ok = true, c = cand[i].p;
      for (var k = 0; k <= 20 && ok; k++) {
        var x = c[0] + (e[0] - c[0]) * k / 20, y = c[1] + (e[1] - c[1]) * k / 20, u = toU(x, y);
        ok = !rs.some(function (r) { return x > r.left - 60 && x < r.right + 60 && y > r.top - 60 && y < r.bottom + 60; }) &&
          (pass || BASE + height(u[0], u[1]) * RANGE > LAKE + 5);
      }
      if (ok) return c;
    }
    return fallback;
  }
  function surprise() {
    stopWalk(); gone();
    var pts = freeSamples();
    if (pts.length < 6) pts = [[innerWidth * .3, innerHeight * .6], [innerWidth * .7, innerHeight * .4]];
    var ms = pts.map(function (p) { var u = toU(p[0], p[1]); return BASE + height(u[0], u[1]) * RANGE; });
    var hiI = 0; ms.forEach(function (m, i) { if (m > ms[hiI]) hiI = i; });
    var e = pts[hiI], far = Math.min(innerWidth, innerHeight) * .35, loI = -1;
    ms.forEach(function (m, i) {
      var d = Math.hypot(pts[i][0] - e[0], pts[i][1] - e[1]);
      if (m > LAKE + 15 && d > far && (loI < 0 || m - d * .4 < ms[loI] - Math.hypot(pts[loI][0] - e[0], pts[loI][1] - e[1]) * .4)) loI = i;
    });
    var s = loI < 0 ? pts[0] : pts[loI];
    s = clearStart(pts, ms, e, s);
    var dx = e[0] - s[0], dy = e[1] - s[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    var turns = Math.max(2, Math.round(len / 120)), full = [];
    for (var i = 0; i <= 90; i++) {
      var k = i / 90, w = Math.sin(k * Math.PI * turns) * Math.min(46, len * .12) * Math.sin(k * Math.PI);
      full.push(toU(clamp(s[0] + dx * k + nx * w, 8, innerWidth - 8), clamp(s[1] + dy * k + ny * w, 8, innerHeight - 8)));
    }
    if (reduce) { route = full; statsDirty = routeDirty = true; kick(); return; }
    route = [full[0]]; plotAnim = { full: full, t: 0 }; kick();
  }
  function newLand() {
    stopWalk();
    seedT = [Math.round((Math.random() * 40 - 20) * 10) / 10, Math.round((Math.random() * 40 - 20) * 10) / 10];
    if (reduce) seed = seedT.slice();
    statsDirty = true; dirty = true; kick(); req2d();
  }
  function clearAll() { stopWalk(); route = []; stats = null; bumps.forEach(function (b) { b.ta = 0; }); statsDirty = routeDirty = dirty = true; kick(); req2d(); }

  // walk it: a hiker rides the line; the title becomes a live altimeter, the profile shows where you are
  var walking = null;
  function walk() {
    if (!stats) return;
    stopWalk();
    var total = stats.cum[stats.cum.length - 1] / MPX, dur = clamp(total / 260, 2.6, 7) * 1000;
    if (reduce) { finishWalk(); return; }
    walking = { t0: performance.now(), dur: dur };
    svg.classList.add('is-walking'); prof.classList.add('is-walking'); kick();
  }
  function stepWalk(now) {
    var s = stats; if (!s || !walking) return stopWalk();
    var k = clamp((now - walking.t0) / walking.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    var target = e * s.cum[s.cum.length - 1], i = 1;
    while (i < s.cum.length - 1 && s.cum[i] < target) i++;
    var a = s.pts[i - 1], b = s.pts[i], f = (target - s.cum[i - 1]) / Math.max(1e-6, s.cum[i] - s.cum[i - 1]);
    var p = toPx([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    hiker.setAttribute('cx', p[0].toFixed(1)); hiker.setAttribute('cy', p[1].toFixed(1));
    var m = s.el[i - 1] + (s.el[i] - s.el[i - 1]) * f;
    elName.textContent = fmt(m) + ' m';
    var mk = $('.lp-mark', prof); mk.setAttribute('x1', e * 100); mk.setAttribute('x2', e * 100);
    if (k >= 1) finishWalk();
  }
  function finishWalk() {
    stopWalk();
    if (!stats) return;
    elName.textContent = 'Logged · ' + (stats.km < 10 ? stats.km.toFixed(1) : Math.round(stats.km)) + ' km';
    elStamp.className = 'lab-stamp'; void elStamp.offsetWidth; elStamp.className = 'lab-stamp is-new';
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) {}
  }
  function stopWalk() { walking = null; svg.classList.remove('is-walking'); prof.classList.remove('is-walking'); }
  var ACT = { surprise: surprise, land: newLand, clear: clearAll, walk: walk };
  $$('[data-act]').forEach(function (b) { b.addEventListener('click', function () { var f = ACT[b.getAttribute('data-act')]; if (f) f(); }); });

  /* ---------- loop ---------- */
  var lastBusy = performance.now();
  function frame(dt, now) {
    if (!reduce) t = (t + dt / 1000) % 1e4;
    var busy = false, k = 1 - Math.exp(-dt / 450);
    if (Math.abs(seedT[0] - seed[0]) + Math.abs(seedT[1] - seed[1]) > .002) { seed[0] += (seedT[0] - seed[0]) * k; seed[1] += (seedT[1] - seed[1]) * k; busy = true; statsDirty = true; req2d(); }
    if (sculpt && sculpt.b) { sculpt.b.ta = clamp(sculpt.base + sculpt.sign * Math.max(0, performance.now() - sculpt.t) / 1000 * .8, -1, 1.2); statsDirty = true; }   // wall-clock growth
    var s = dt / 16.7;
    bumps.forEach(function (b) {                       // springy land: overshoots a little, then settles
      if (reduce) { b.a = b.ta; return; }
      b.v = (b.v + (b.ta - b.a) * .1 * s) * Math.pow(.8, s); b.a += b.v * s;
      if (Math.abs(b.ta - b.a) > .001 || Math.abs(b.v) > .001) { busy = true; statsDirty = true; req2d(); }
    });
    bumps = bumps.filter(function (b) { return (sculpt && sculpt.b === b) || b.ta !== 0 || Math.abs(b.a) > .002 || Math.abs(b.v) > .002; });
    if (plotAnim) {
      plotAnim.t += dt / 1100;
      var n = Math.min(plotAnim.full.length, Math.ceil(easeOut(Math.min(plotAnim.t, 1)) * plotAnim.full.length));
      route = plotAnim.full.slice(0, Math.max(2, n)); statsDirty = routeDirty = true; busy = true;
      if (plotAnim.t >= 1) plotAnim = null;
    }
    if (walking) { stepWalk(now); busy = true; }
    if (drawing || sculpt) busy = true;
    if (statsDirty) measure();
    if (routeDirty) renderRoute();
    if (busy) { lastBusy = now; readReticle(); }
    if (eng) {
      eng.fps = now - lastBusy < 1500 ? 60 : 30;
      if (!reduce || dirty || busy) { drawGL(); dirty = false; }
      else if (!busy && reduce && !walking) eng.stop();
    } else if (!busy && !walking && !plotAnim) { running = false; return false; }
  }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  var running = false, raf2 = 0, last2 = 0;
  function start() {
    if (eng) { if (!eng.running()) eng.loop(frame); return; }
    if (running) return;
    running = true; last2 = 0;
    (function tick(now) { var dt = last2 ? Math.min(now - last2, 100) : 16.7; last2 = now; if (frame(dt, now) === false) { running = false; return; } raf2 = requestAnimationFrame(tick); })(performance.now());
  }
  function kick() { if (!D.hidden) start(); }
  D.addEventListener('visibilitychange', function () { if (D.hidden) { if (eng) eng.stop(); } else kick(); });
  addEventListener('resize', function () { if (eng) eng.resize(); dirty = routeDirty = true; req2d(); kick(); }, { passive: true });

  /* ---------- arrival + departure (the journey's strata, continued) ---------- */
  var cover = $('#lab-cover'), xfer = false;
  try { xfer = sessionStorage.getItem('ydx-pp-xfer') === 'lab'; sessionStorage.removeItem('ydx-pp-xfer'); sessionStorage.setItem('ydx-pp-seen', '1'); } catch (err) {}
  function arrive() {
    if (!cover || html.classList.contains('lab-in')) { html.classList.add('lab-on', 'lab-in'); return; }
    html.classList.add('lab-on');
    var done = function () { html.classList.add('lab-in'); if (cover.parentNode) cover.parentNode.removeChild(cover); };
    if (reduce || !cover.animate) { if (cover.animate) cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = done; else done(); return; }
    var e = 'cubic-bezier(.62,.02,.2,1)', up = [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,calc(-100% - max(9vh, 46px)),0)' }];
    $('.lc-b', cover).animate(up, { duration: 760, easing: e, fill: 'forwards' });
    $('.lc-a', cover).animate(up, { duration: 760, delay: 90, easing: e, fill: 'forwards' }).onfinish = done;
  }
  function whenReady() {
    var min = xfer ? 120 : 650, waited = performance.now() - t0, fontsOk = false;
    if (!xfer && cover && !reduce && cover.animate) $('.lc-pin', cover).animate([{ scale: 0, rotate: '-30deg' }, { scale: 1, rotate: '0deg' }], { duration: 520, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'backwards' });
    (D.fonts && D.fonts.ready ? D.fonts.ready : Promise.resolve()).then(function () { fontsOk = true; });
    (function check() {
      var el = performance.now() - t0;
      if ((drawn && fontsOk && el >= min) || el > 1800) arrive(); else setTimeout(check, 50);
    })();
  }
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lab-leave]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce || !D.body.animate) return;
    e.preventDefault();
    var href = a.getAttribute('href'), ov = D.createElement('div'), edge = '<svg viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 10V7l5-3 4 2 6-5 4 3 5-2.5 6 4 5-5.5 5 3 3-1.5 6 4.5 5-6 5 4 4-2 6 3 5-4 4 2.5 6-3 4 2 4-2v8z"/></svg>';
    ov.className = 'lab-leave'; ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = '<div class="ll-a">' + edge + '</div><div class="ll-b">' + edge + '</div>';
    D.body.appendChild(ov);
    var e2 = 'cubic-bezier(.7,0,.3,1)', inn = [{ translate: '0 115%' }, { translate: '0 0' }];
    ov.firstChild.animate(inn, { duration: 420, easing: e2, fill: 'forwards' });
    ov.lastChild.animate(inn, { duration: 420, delay: 110, easing: e2, fill: 'forwards' }).onfinish = function () { location.href = href; };
    addEventListener('pagehide', function () { setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 0); }, { once: true });
  });
  addEventListener('pageshow', function (e) { if (e.persisted) $$('.lab-leave').forEach(function (n) { n.parentNode.removeChild(n); }); });

  /* ---------- boot ---------- */
  setTool('draw');
  readout();
  if (eng) { drawGL(); start(); } else draw2d();
  whenReady();
  W.__ydxLab = { height: height, metres: metres, toU: toU, toPx: toPx, stats: function () { return stats; }, gl: !!eng, eng: eng, bumps: function () { return bumps; }, route: function () { return route; } };
})();
