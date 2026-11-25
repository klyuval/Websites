/* ==========================================================================
   Pack & Peak: living topographic map (round 5). Raw WebGL 1, no dependencies, CSP-safe (no eval, no inline).
   - YdxTopo.engine(canvas, frag, names, opts): one full-screen triangle, DPR cap, adaptive quality (frame-time EMA),
     hidden-tab pause, fps cap, context loss/restore. Shared by the page background and the route lab (/play/).
   - YdxTopo.noise2(x, y) / YdxTopo.GLSL: the same 2D simplex noise in JS and GLSL (Ashima Arts / Stefan Gustavson,
     MIT), so the lab can read heights under the pointer that match the contours it draws.
   - The page driver (only on the journey page): one fixed canvas between the chapter colour fields and the chapter
     content (z-index 0; every chapter child already sits at z-index >= 1). It draws the site's contour lines, alive:
     the terrain drifts and erodes slowly, the pointer raises a summit (rings tighten and turn cream), scroll speed
     stirs it, the field scrolls at 78% of the page (depth), each chapter keeps its own line colour, and picking a
     trail reshapes the land with a contour ripple from the board. The colour fields themselves stay CSS, so they
     never lag the content; only the old static topo texture is swapped out (html.ydx-gl).
   Fallbacks: reduced motion, no WebGL, software GL or any error -> nothing is mounted and the original CSS topo
   texture stays. Hub iframe -> 30 fps at 60% resolution. Coarse pointers -> 2 noise octaves, DPR cap 1.25.
   ========================================================================== */
(function () {
  'use strict';
  if (window.YdxTopo) return;
  var W = window, D = document, html = D.documentElement;

  /* ---------- shared noise: GLSL and an exact JS port ---------- */
  var GLSL = [
    'vec3 permute3(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float snoise(vec2 v){',
    ' const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);',
    ' vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.);',
    ' vec3 p=permute3(permute3(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;',
    ' vec3 x=2.*fract(p*C.www)-1.; vec3 h=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox;',
    ' m*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    ' return 130.*dot(m,g);',
    '}'
  ].join('\n');
  function m289(x) { return x - Math.floor(x / 289) * 289; }
  function perm(x) { return m289((x * 34 + 1) * x); }
  function fr(x) { return x - Math.floor(x); }
  function noise2(vx, vy) {
    var Cx = .211324865405187, Cy = .366025403784439, Cz = -.577350269189626, Cw = .024390243902439;
    var s = (vx + vy) * Cy, ix = Math.floor(vx + s), iy = Math.floor(vy + s), t = (ix + iy) * Cx;
    var x0 = vx - ix + t, y0 = vy - iy + t, i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    var x1 = x0 + Cx - i1, y1 = y0 + Cx - j1, x2 = x0 + Cz, y2 = y0 + Cz;
    ix = m289(ix); iy = m289(iy);
    var p = [perm(perm(iy) + ix), perm(perm(iy + j1) + ix + i1), perm(perm(iy + 1) + ix + 1)];
    var xs = [x0, x1, x2], ys = [y0, y1, y2], r = 0;
    for (var k = 0; k < 3; k++) {
      var m = Math.max(.5 - (xs[k] * xs[k] + ys[k] * ys[k]), 0); m *= m; m *= m;
      var x = 2 * fr(p[k] * Cw) - 1, h = Math.abs(x) - .5, a0 = x - Math.floor(x + .5);
      m *= 1.79284291400159 - .85373472095314 * (a0 * a0 + h * h);
      r += m * (a0 * xs[k] + h * ys[k]);
    }
    return 130 * r;
  }

  /* ---------- engine ---------- */
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  function engine(canvas, frag, names, o) {
    o = o || {};
    var attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !o.allowSoftware };
    var gl, U = {}, deriv = false, lost = false, dead = false, raf = 0, last = 0, acc = 0;
    var q = o.quality || 1, ema = 16, slow = 0, fast = 0, hopeless = 0, upgraded = false, cssW = 1, cssH = 1, BW = 0, BH = 0, dirty = true;
    var e = { canvas: canvas, ok: false, frames: 0, js: 0, fps: o.fps || 60 };
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function build() {
      deriv = !!gl.getExtension('OES_standard_derivatives');
      var head = (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') +
        '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
        (o.defines || '') + GLSL + '\n';
      var pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, head + frag));
      gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      names.forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
      gl.clearColor(0, 0, 0, 0);
      BW = BH = 0; dirty = true;
    }
    function measure() { cssW = canvas.clientWidth || innerWidth; cssH = canvas.clientHeight || innerHeight; dirty = true; }
    e.dpr = function () { return Math.min(W.devicePixelRatio || 1, o.maxDpr || 1.5) * q; };
    e.size = function () { return [cssW, cssH]; };
    // draw(set): `set(U, gl, dpr)` writes the uniforms; the engine sizes the buffer lazily and draws one triangle.
    e.draw = function (set) {
      if (!gl || lost || dead || gl.isContextLost()) return false;
      if (dirty) {
        var d = e.dpr(), w = Math.max(1, Math.round(cssW * d)), h = Math.max(1, Math.round(cssH * d));
        if (w !== BW || h !== BH) { BW = canvas.width = w; BH = canvas.height = h; gl.viewport(0, 0, w, h); }
        dirty = false;
      }
      set(U, gl, BW / cssW, BW, BH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      e.frames++;
      return true;
    };
    // loop(fn): fn(dt, now) -> false to skip drawing. fps cap via e.fps; adaptive quality from the frame-time EMA.
    e.loop = function (fn) {
      e.fn = fn;
      function tick(now) {
        raf = requestAnimationFrame(tick);
        var real = last ? Math.min(now - last, 1000) : 16.7, dt = Math.min(real, 100); last = now;
        ema += (dt - ema) * (real > 50 ? .25 : .05);            // react fast to very long frames
        if (!o.fixedQuality && !(o.hold && o.hold())) {         // (not while the page itself is busy loading)
          // Measured in real elapsed time (not frames), so a very slow device steps down every ~0.5 s.
          if (ema > 26 && q > .42) { slow += real; if (slow > 500) { q *= .75; slow = 0; ema = 20; dirty = true; } } else if (q > .42) slow = 0;
          // Still far too slow at the lowest resolution for ~1.5 s: give the effect up (the page shows its static fallback).
          if (q <= .42 && o.onSlow) { if (ema > 40) { if ((hopeless += real) > 1500) { var cb = o.onSlow; o.onSlow = null; cb(); return; } } else hopeless = 0; }
          if (ema < 13 && q < (o.quality || 1) && !upgraded) { if (++fast > 240) { q = Math.min(o.quality || 1, q / .75); upgraded = true; dirty = true; } } else fast = 0;
        }
        acc += dt;
        if (acc < 1000 / e.fps - 4) return;                        // fps cap (30 fps when idle or in the hub)
        var step = acc; acc = 0;
        var t0 = performance.now();
        fn(Math.min(step, 100), now);
        e.js += (performance.now() - t0 - e.js) * .05;            // JS cost per drawn frame (EMA, ms)
      }
      e.stop(); last = 0; acc = 1e3; raf = requestAnimationFrame(tick);
    };
    e.stop = function () { if (raf) cancelAnimationFrame(raf); raf = 0; };
    e.running = function () { return !!raf; };
    e.quality = function () { return q; };
    e.hasDeriv = function () { return deriv; };
    e.resize = measure;
    e.destroy = function () {
      dead = true; e.stop();
      var x = gl && gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
      gl = null;
    };
    try {
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) return null;
      build();
    } catch (err) { if (o.debug) console.warn('[ydx topo]', err); return null; }
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); lost = true; e.stop(); if (o.onLost) o.onLost(); });
    canvas.addEventListener('webglcontextrestored', function () {
      lost = false;
      try { build(); if (o.onRestore) o.onRestore(); } catch (err) { if (o.onFail) o.onFail(); }
    });
    measure();
    e.ok = true;
    return e;
  }

  W.YdxTopo = { engine: engine, noise2: noise2, GLSL: GLSL };

  /* ======================================================================
     Page driver: the journey's living topo field
     ====================================================================== */
  var FRAG = [
    'uniform vec2 uRes; uniform float uDpr,uTime,uVel,uScroll,uFade,uEdgeW;',
    'uniform vec3 uPtr; uniform vec4 uRip; uniform vec2 uSeed;',
    'uniform float uE[6]; uniform vec4 uLine[5]; uniform vec4 uHi[5]; uniform vec4 uShade[5];',
    'const float S=520.;',
    'float fbm(vec2 p){float s=0.,a=.55;for(int i=0;i<OCT;i++){s+=a*snoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,1.7);a*=.5;}return s;}',
    'void main(){',
    ' vec2 css=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;',   // CSS px, top-left origin
    ' vec2 F=vec2(css.x,css.y+uScroll);',                            // field space: scrolls at 78% (JS) = depth
    ' float t=uTime*.05; vec2 q=F/S;',
    ' vec2 w=vec2(snoise(q*.6+vec2(t,1.7)),snoise(q*.6+vec2(4.3,-t*.8)));',   // slow erosion: domain warp drifts
    ' q+=w*(.42+.55*abs(uVel))+uSeed;',                              // scroll speed stirs the land
    ' float h=fbm(q+vec2(0.,t*.3));',
    ' vec2 dp=(F-uPtr.xy)/S; float bump=exp(-dot(dp,dp)*8.)*uPtr.z;',
    ' h+=bump*.9;',                                                  // the pointer raises a summit
    ' vec2 dr=(F-uRip.xy)/S; float rr=length(dr)-uRip.z*.9;',
    ' h+=uRip.w*sin(rr*18.)*exp(-rr*rr*22.)*exp(-uRip.z*1.1);',      // contour ripple when a trail is picked
    ' float lv=h*7.+30., f=abs(fract(lv-.5)-.5);',
    ' float idx=step(mod(floor(lv+.5),5.),.5);',                     // every 5th line is an index contour
    '#ifdef DERIV',
    ' float fw=max(fwidth(lv),1e-4); float dpx=f/fw; float hw=mix(.55,1.,idx)*uDpr;',
    ' float line=(1.-smoothstep(hw-.6,hw+.6,dpx))*smoothstep(.34,.18,fw);',   // AA lines; fade where too dense
    ' vec2 g=vec2(dFdx(h),-dFdy(h))*S/uDpr;',
    ' vec3 n=normalize(vec3(-g*.5,1.)); float lit=dot(n,normalize(vec3(-.55,-.55,.63)))-.63/length(vec3(-.55,-.55,.63));',
    '#else',
    ' float line=1.-smoothstep(.035,.07,f*(1.-idx*.4)); float lit=0.;',
    '#endif',
    ' float y=css.y, ed=1e4; vec4 L=uLine[0],H=uHi[0],Sh=uShade[0];',
    ' for(int i=0;i<6;i++){ed=min(ed,abs(y-uE[i]));}',
    ' for(int i=1;i<5;i++){if(y>=uE[i]){L=uLine[i];H=uHi[i];Sh=uShade[i];}}',
    ' float ef=smoothstep(uEdgeW,uEdgeW+10.,ed);',                   // no lines on the colour seams (hides scroll lag)
    ' float cl=.5+.5*snoise(F/(S*2.6)+t*vec2(.7,.25));',             // drifting light: sun through moving cloud
    ' float sa=clamp(Sh.a>0.?lit:-lit,0.,1.)*abs(Sh.a)*(.35+.65*cl);',
    ' float a=line*L.a*mix(1.,1.6,idx);',
    ' float hi=smoothstep(.12,.65,bump);',
    ' vec3 lc=mix(L.rgb,H.rgb,hi); a=mix(a,line*H.a*mix(1.,1.35,idx),hi);',
    ' a*=ef; sa*=ef;',
    ' float dith=(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5)/255.;',
    ' sa=max(sa+dith,0.);',
    ' vec3 rgb=lc*a+Sh.rgb*sa*(1.-a); float A=a+sa*(1.-a);',
    ' gl_FragColor=vec4(rgb,A)*uFade;',
    '}'
  ].join('\n');

  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  // Per chapter: line colour + alpha (matches the old topo-ink / topo-sienna textures), the colour the rings take
  // around the pointer summit (cream, like the loader's contours; vermilion on the paper sheet), and the light:
  // + = sunlit slopes lighten, - = shaded slopes darken, chosen so text contrast only ever goes up.
  var INK = '#081622', CREAM = '#fff6e3', SIENNA = '#b06834', VERM = '#f0441e';
  var CH = [
    { line: [INK, .13], hi: [CREAM, .75], shade: ['#ffffff', .11] },   // sky (ink text)
    { line: [INK, .16], hi: [CREAM, .42], shade: ['#04140c', -.2] },   // spruce (cream text)
    { line: [SIENNA, .22], hi: [VERM, .6], shade: [SIENNA, -.07] },   // paper (ink text, light ground)
    { line: [INK, .14], hi: [CREAM, .7], shade: ['#ffffff', .1] },     // vermilion (ink text)
    { line: [INK, .13], hi: [CREAM, .75], shade: ['#ffffff', .11] }    // summit sky
  ];
  var IDS = ['top', 'trails', 'terrain', 'pack', 'summit'];
  var SEEDS = [[0, 0], [3.7, -2.3], [-4.6, 5.2]];                       // one land per trail board
  var PAR = .78;

  function page() {
    if (W.__ydxTopoPage || !D.querySelector('main.journey') || !D.getElementById('top')) return;
    W.__ydxTopoPage = 1;
    var rm = matchMedia('(prefers-reduced-motion: reduce)');
    if (rm.matches) return;                                             // static texture = the reduced-motion frame
    var frame = html.classList.contains('ydx-frame') || W.self !== W.top;
    var coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches;
    var cv = D.createElement('canvas');
    cv.id = 'ydx-topo'; cv.setAttribute('aria-hidden', 'true');
    D.body.appendChild(cv);
    html.classList.add('ydx-topo');
    var dbg = W.__ydxTopoDebug || {};
    var names = ['uRes', 'uDpr', 'uTime', 'uVel', 'uScroll', 'uFade', 'uEdgeW', 'uPtr', 'uRip', 'uSeed', 'uE', 'uLine', 'uHi', 'uShade'];
    var eng = engine(cv, FRAG, names, {
      allowSoftware: !!dbg.allowSoftware, maxDpr: coarse ? 1.25 : 1.5, quality: frame ? .6 : 1, fps: frame ? 30 : 60,
      defines: '#define OCT ' + (coarse || frame ? 2 : 3) + '\n', debug: dbg.debug, fixedQuality: !!dbg.fixedQuality,
      onLost: function () { html.classList.remove('ydx-gl-on', 'ydx-gl'); },
      onRestore: function () { first = true; kick(); },
      onFail: off, hold: function () { return loading(); },
      // a GPU that cannot hold even the lowest resolution: hand back to the static texture (it fades back in)
      onSlow: function () { html.classList.remove('ydx-gl', 'ydx-gl-on'); setTimeout(off, 950); }
    });
    if (!eng) return off();
    function off() {
      if (eng) eng.destroy();
      html.classList.remove('ydx-topo', 'ydx-gl-on', 'ydx-gl');
      if (cv.parentNode) cv.parentNode.removeChild(cv);
    }

    // packed uniform data
    var lines = new Float32Array(20), his = new Float32Array(20), shades = new Float32Array(20), E = new Float32Array(6);
    CH.forEach(function (c, i) {
      var l = hex(c.line[0]), h = hex(c.hi[0]), s = hex(c.shade[0]);
      lines.set([l[0], l[1], l[2], c.line[1]], i * 4); his.set([h[0], h[1], h[2], c.hi[1]], i * 4); shades.set([s[0], s[1], s[2], c.shade[1]], i * 4);
    });

    // chapter tops in document px, re-measured only when something resizes (never per frame)
    var tops = [0, 0, 0, 0, 0, 0], secs = IDS.map(function (id) { return D.getElementById(id); });
    function measure() {
      var sy = scrollY;
      secs.forEach(function (s, i) {
        if (!s || !s.isConnected) secs[i] = s = D.getElementById(IDS[i]);
        if (s) { var r = s.getBoundingClientRect(); tops[i] = r.top + sy; if (i === 4) tops[5] = r.bottom + sy; }
      });
      eng.resize();
    }
    if (W.ResizeObserver) { var ro = new ResizeObserver(function () { measure(); }); secs.forEach(function (s) { if (s) ro.observe(s); }); }
    addEventListener('resize', measure, { passive: true });

    // input
    var t = (Date.now() / 1000) % 600, ptrX = innerWidth * .62, ptrY = innerHeight * .4, ptrS = 0, tx = ptrX, ty = ptrY, ts = .55;
    var vx = 0, vy = 0, cx = -1, cy = -1, lastMove = -1e9, lastTouch = -1e9, speed = 0, lastY = scrollY, vel = 0, velPx = 0;
    var seed = SEEDS[0].slice(), seedT = SEEDS[0].slice(), rip = [0, 0, 99, 0], lastActive = 0, tilt = null;
    addEventListener('pointermove', function (e) {
      cx = e.clientX; cy = e.clientY; lastMove = performance.now();
      if (e.pointerType !== 'mouse') lastTouch = lastMove;
    }, { passive: true });
    addEventListener('pointerdown', function (e) { cx = e.clientX; cy = e.clientY; lastMove = performance.now(); if (e.pointerType !== 'mouse') lastTouch = lastMove; }, { passive: true });
    D.addEventListener('pointerleave', function () { lastMove = -1e9; });
    // Phones: tilt moves the summit where the browser allows it without a permission prompt (Android); iOS keeps the drift.
    if (coarse && W.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      addEventListener('deviceorientation', function (e) { if (e.gamma != null) tilt = [e.gamma, e.beta]; }, { passive: true });
    }
    function chosen() {
      var bs = D.querySelectorAll('.board'), i;
      for (i = 0; i < bs.length; i++) if (bs[i].classList.contains('is-chosen') || bs[i].getAttribute('aria-pressed') === 'true') return i;
      return 0;
    }
    D.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.board');
      if (!b) return;
      var x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2;
      setTimeout(function () {
        var s = SEEDS[chosen()] || SEEDS[0];
        if (s[0] === seedT[0] && s[1] === seedT[1]) return;
        seedT = s.slice();
        rip = [x, y + scrollY * PAR, 0, .22];                          // ripple centred on the board, in field space
        lastActive = performance.now(); kick();
      }, 30);
    }, true);
    seed = (SEEDS[chosen()] || SEEDS[0]).slice(); seedT = seed.slice();

    var first = true, fade = 0, loading = function () { return html.classList.contains('ydx-loading'); };
    function frameFn(dt, now) {
      t = (t + dt / 1000) % 1e4;
      var k = function (tau) { return 1 - Math.exp(-dt / tau); };
      // scroll velocity (px/ms), smoothed
      var y = scrollY, v = (y - lastY) / Math.max(dt, 1); lastY = y;
      vel += (v - vel) * k(120); velPx = Math.abs(v) * 16.7;
      if (Math.abs(v) > .05) lastActive = now;
      // pointer summit: mass-spring follow; it rises while the pointer rests, flattens a little while it moves fast
      var vw = innerWidth, vh = innerHeight;
      if (cx >= 0 && now - lastMove < 3500 && !(coarse && now - lastTouch > 2500)) {
        speed += (Math.hypot(cx - tx, cy - ty) / Math.max(dt, 1) - speed) * k(160);
        tx = cx; ty = cy; ts = .6 + .4 * Math.exp(-speed * .9);
        lastActive = now;
      } else if (tilt) {
        tx = vw * (.5 + Math.max(-1, Math.min(1, tilt[0] / 35)) * .4); ty = vh * (.45 + Math.max(-1, Math.min(1, (tilt[1] - 45) / 35)) * .3); ts = .7;
      } else {                                                          // idle / touch: a slow wandering summit
        tx = vw * (.56 + .3 * Math.sin(t * .13)); ty = vh * (.45 + .25 * Math.cos(t * .11)); ts = .5;
      }
      var kk = .085 * dt / 16.7;
      vx = (vx + (tx - ptrX) * kk) * .8; vy = (vy + (ty - ptrY) * kk) * .8;
      ptrX += vx; ptrY += vy; ptrS += (ts - ptrS) * k(450);
      seed[0] += (seedT[0] - seed[0]) * k(520); seed[1] += (seedT[1] - seed[1]) * k(520);
      rip[2] += dt / 1000;
      // calm page: 30 fps (the drift is slow); input, a ripple or a morph in flight: 60 fps
      var busy = now - lastActive < 2500 || rip[2] < 2.5 || Math.abs(seedT[0] - seed[0]) > .01;
      eng.fps = frame ? 30 : busy ? 60 : 30;
      if (loading() && !first) return;                                // nothing to show under the loader: save the main thread
      var sy = scrollY;
      for (var i = 0; i < 6; i++) E[i] = tops[i] - sy;
      fade = loading() ? 1 : Math.min(1, fade + dt / 900);
      eng.draw(function (U, gl, dpr, bw, bh) {
        gl.uniform2f(U.uRes, bw, bh); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uTime, t);
        gl.uniform1f(U.uVel, Math.max(-1, Math.min(1, vel / 4))); gl.uniform1f(U.uScroll, sy * PAR);
        gl.uniform1f(U.uFade, 1); gl.uniform1f(U.uEdgeW, 2 + Math.min(velPx * 1.4, 90));
        gl.uniform3f(U.uPtr, ptrX, ptrY + sy * PAR, ptrS); gl.uniform4f(U.uRip, rip[0], rip[1], rip[2], rip[3]);
        gl.uniform2f(U.uSeed, seed[0], seed[1]); gl.uniform1fv(U.uE, E);
        gl.uniform4fv(U.uLine, lines); gl.uniform4fv(U.uHi, his); gl.uniform4fv(U.uShade, shades);
      });
      if (first) {
        first = false;
        // Under the loader the swap is invisible; later (slow GL start) the canvas fades in over the old texture
        // first, and the texture is dropped once it is fully covered.
        html.classList.add('ydx-gl-on');
        if (loading()) html.classList.add('ydx-gl');
        else setTimeout(function () { if (html.classList.contains('ydx-gl-on')) html.classList.add('ydx-gl'); }, 950);
        cv.setAttribute('data-state', 'ready');
      }
    }
    function kick() { if (!D.hidden && !eng.running()) eng.loop(frameFn); }
    D.addEventListener('visibilitychange', function () { if (D.hidden) eng.stop(); else kick(); });
    rm.addEventListener && rm.addEventListener('change', function () { if (rm.matches) off(); });
    addEventListener('pagehide', function () { eng.stop(); });
    addEventListener('pageshow', function (e) { if (e.persisted) kick(); });
    measure();
    kick();
    W.__ydxTopo = { eng: eng, stats: function () { return { q: eng.quality(), frames: eng.frames, js: eng.js, fps: eng.fps, deriv: eng.hasDeriv() }; } };
  }

  // Start after `load` (under the loader, so the swap from the static texture is never seen), but never block it.
  // Needs enhance.css (canvas placement + the texture swap): wait for html.ydx-css, set by the inline boot script.
  function boot() {
    if (!D.querySelector('main.journey')) return;                     // not the journey page (e.g. the route lab)
    if (!html.classList.contains('ydx-css')) {
      var mo = new MutationObserver(function () { if (html.classList.contains('ydx-css')) { mo.disconnect(); boot(); } });
      return mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    }
    try { page(); } catch (err) { if (W.__ydxTopoDebug) console.warn(err); }
  }
  if (D.readyState === 'complete') setTimeout(boot, 0);
  else addEventListener('load', function () { setTimeout(boot, 0); });
})();
