/* ydx r5: KOMOREBI, the living background of PEEL CLUB (Botanical).
 * Dappled sunlight through swaying leaves, falling on the brand's coloured "desks", with fine soda fizz rising and
 * a caustic shimmer inside the light. The leaves part around the pointer (or the finger), a tap sends a ring of
 * light and fizz, scroll speed is wind, and each desk keeps its own colour (tangerine, green, pink), tinted by the
 * flavour in play (the carousel's active can, the pairing tab, the product page, the Fizz Lab blend).
 *
 * One raw WebGL 1 context, one full-screen triangle, no dependencies, no eval. Pattern after the playbook's
 * ShaderBG reference (MIT simplex noise by Ian McEwan / Stefan Gustavson, Ashima Arts); the shader body is ours.
 *
 * Geometry: the canvas is DOCUMENT-locked, not fixed: an absolute box (body is the containing block, see enhance.css)
 * that is moved to the current scroll position every frame, with a 15% overscan above and below. Seams between desks
 * are drawn in the shader at the desks' document positions, so when touch scrolling runs on the compositor ahead of the
 * main thread (Lenis syncTouch is off), the canvas scrolls with the page and the colour seams stay glued to the
 * sections instead of lagging behind them.
 *
 * Contrast: every palette is built in JS at a target luminance (WCAG relative luminance): tangerine and pink only
 * ever get lighter than the brand token (their text is dark green), green only gets darker or a little lighter (its
 * text is paper, plus large tangerine display type that keeps >= 3:1).
 *
 * Cost control: buffer at 0.5-0.6 of CSS px (the field is soft), DPR cap 1.5, adaptive quality from frame time, 30 fps
 * while the app's three.js scene is on screen, fully held while the can carousel is being driven (drag, wheel,
 * arrows, a click on its controls) and during route transitions, paused in hidden tabs. Reduced motion: no clock, no
 * pointer, no parallax; it only redraws when the page scrolls. Software GL (SwiftShader), the hub iframe, save-data or
 * no WebGL: the designed CSS fallback (enhance.css, html.ydx-field-css).
 */
(function () {
  'use strict';
  if (window.YdxField) return;

  /* ------------------------------------------------------------------ colour helpers (WCAG luminance) */
  var lin = function (c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  var srgb = function (c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
  function hex(h) { var n = parseInt(String(h).replace('#', ''), 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  // the same hue, moved to an exact relative luminance (scale in linear light, then lift toward white if a channel clips)
  function fit(c, L) {
    var l = [lin(c[0]), lin(c[1]), lin(c[2])];
    for (var it = 0; it < 6; it++) {
      var cur = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] || 1e-4, s = L / cur;
      l = l.map(function (v) { return Math.min(1, v * s); });
      cur = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
      if (cur < L - 1e-4) { var w = (L - cur) / (1 - cur || 1); l = l.map(function (v) { return v + (1 - v) * w; }); }
    }
    return l.map(srgb);
  }
  var FLAVOR = {
    'blood-orange': '#cf4938', 'lemon-basil': '#d1cd69', 'pink-grapefruit': '#e999ac', mandarin: '#ec963d',
    'yuzu-ginger': '#b99018', 'cherry-lime': '#9b2449', 'peach-verbena': '#cf7659', 'pineapple-mint': '#147565'
  };
  // kind: 0 tangerine, 1 green, 2 pink. Returns [base, rich, light, sun] (sRGB 0..1) + per-kind look params.
  function palette(kind, flavor) {
    var f = flavor ? hex(FLAVOR[flavor] || flavor) : null;
    var t = function (c, k) { return f ? mix(c, f, k) : c; };
    if (kind === 1) {
      var g = hex('#0f3b2d');
      return { c: [g, fit(t(hex('#06302c'), 0.2), 0.02), fit(t(hex('#2a6b4a'), 0.14), 0.07), fit(t(hex('#5a8f52'), 0.12), 0.078)], shade: 0.55, lift: 0.0, amt: 0.95 };
    }
    if (kind === 2) {
      var p = hex('#f7b4bd');
      return { c: [p, fit(t(hex('#f6a2bb'), 0.12), 0.565), fit(t(hex('#ffd6d8'), 0.14), 0.68), fit(hex('#fff0e6'), 0.84)], shade: 0, lift: 0.06, amt: 0.85 };
    }
    var o = hex('#f5811f');
    return { c: [o, fit(t(hex('#ff7000'), 0.22), 0.345), fit(t(hex('#ffa22e'), 0.26), 0.47), fit(t(hex('#ffd27a'), 0.14), 0.62)], shade: 0, lift: 0.05, amt: 0.85 };
  }

  /* ------------------------------------------------------------------ shader */
  var NOISE = [
    'vec3 perm(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float snoise(vec2 v){',
    ' const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);',
    ' vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.);',
    ' vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;',
    ' vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;',
    ' m*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    ' return 130.*dot(m,g);',
    '}'
  ].join('\n');
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  function frag(low) {
    return [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
      '#define NB 5',
      'uniform vec2 uRes;',            // buffer px
      'uniform float uK;',             // buffer px per css px
      'uniform float uTime,uWind,uFizz,uScroll,uFieldY;', // seconds, wind 0..1, fizz 0..1, scroll px, field y offset (css px)
      'uniform vec3 uPtr; uniform vec2 uVel;',            // pointer (css px in canvas space, y down), strength; velocity
      'uniform vec4 uBurst[3];',       // x, y, age (s), strength
      'uniform vec4 uBand[NB];',       // top (css, canvas space), slant height, lift, shade
      'uniform vec3 uPal[NB*4];',      // base, rich, light, sun per band
      'uniform float uAmt[NB];',
      'uniform float uN,uW;',
      NOISE,
      'vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}',
      // an almond leaf (lens of two circles) along x, about 0.9 x 0.4
      'float leafSD(vec2 q){return max(length(q-vec2(0.,.42)),length(q+vec2(0.,.42)))-.62;}',
      // leaf coverage of one canopy layer (3x3 cells, one leaf per occupied cell)
      'float leaves(vec2 p,float cell,float seed,float blur,float wind,float t){',
      ' vec2 g=p/cell,id=floor(g),f=fract(g); float cov=0.;',
      ' for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){',
      '  vec2 o=vec2(float(i),float(j)),h=h2(id+o+seed);',
      '  if(h.y<.16)continue;',
      '  float sw=sin(t*(.55+h.x*.5)+h.y*11.)*(.1+.42*wind);',
      '  vec2 c=o+.5+(h-.5)*.8+vec2(sin(t*.6+h.y*8.),cos(t*.45+h.x*6.))*(.03+.09*wind);',
      '  float a=h.x*6.2832+sw,s=.62+.55*fract(h.x*5.31+h.y*2.7);',
      '  vec2 q=f-c; q=mat2(cos(a),sin(a),-sin(a),cos(a))*q/s;',
      '  cov=max(cov,1.-smoothstep(-blur,blur,leafSD(q)*s));',
      ' }',
      ' return cov;',
      '}',
      'void main(){',
      ' vec2 fc=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uK;',   // css px, canvas space, y down
      ' float t=uTime;',
      // --- which desk am I on (slanted seams, like the label-peel edge)
      ' int b=0; float bt=-1e6;',
      ' for(int i=0;i<NB;i++){ if(float(i)<uN){ float top=uBand[i].x+uBand[i].y*(1.-fc.x/uW); if(fc.y>=top){b=i;bt=top;} } }',
      ' vec3 c0=uPal[0],c1=uPal[1],c2=uPal[2],c3=uPal[3]; vec4 bd=uBand[0]; float amt=uAmt[0];',
      ' for(int i=1;i<NB;i++){ if(i==b){ c0=uPal[i*4];c1=uPal[i*4+1];c2=uPal[i*4+2];c3=uPal[i*4+3];bd=uBand[i];amt=uAmt[i]; } }',
      // --- field space: the light sits nearly still while the page slides under it (slow parallax)
      ' vec2 p=vec2(fc.x,fc.y+uFieldY);',
      // pointer: the canopy parts around it, a pool of sun opens
      ' vec2 dp=fc-uPtr.xy; float r2=dot(dp,dp); float fall=exp(-r2/32000.)*uPtr.z;',
      ' vec2 push=dp/(sqrt(r2)+1.)*fall*90.-uVel*fall*.05;',
      ' float ring=0.;',
      ' for(int i=0;i<3;i++){ vec4 B=uBurst[i]; if(B.w>0.){ vec2 d=fc-B.xy; float l=length(d),rr=B.z*520.;',
      '   float k=exp(-pow((l-rr)/40.,2.))*B.w*(1.-smoothstep(.2,1.3,B.z)); ring+=k; push+=d/(l+1.)*k*46.; } }',
      ' vec2 pl=p+push;',
      // ambient depth: domain-warped colour between base and rich (same luminance on light desks)
      ' vec2 w=vec2(snoise(p/980.+vec2(t*.018,0.)),snoise(p/980.+vec2(7.3,-t*.015)));',
      ' float n=snoise(p/560.+w*1.35+vec2(0.,t*.012));',
      ' vec3 col=mix(c0,c1,smoothstep(-.55,.65,n));',
      // sun patches drift slowly (branches moving); leaves cut them into dapples
      ' float sun=smoothstep(-.15,.8,snoise(p/760.+vec2(-t*.02,t*.011))+.35*w.x);',
      ' float near=leaves(pl,170.,3.7,.05,uWind,t);',
      low ? ' float far=0.;' : ' float far=leaves(pl*1.0+vec2(40.,90.),104.,9.1,.16,uWind*.7,t*.8);',
      ' float gap=(1.-near)*(1.-far*.8);',
      ' float lightAmt=clamp(sun*gap+fall*.75*(1.-near*.85)+ring*.55,0.,1.)*amt;',
      // ambient lift where no leaf shadow falls (so the leaves read on the light desks too)
      ' col=mix(col,c2,bd.z*(1.-near*.9)*(1.-far*.5));',
      // dark desks get real leaf shadow
      ' col=mix(col,c1*.82,bd.w*max(near,far*.6)*(1.-sun*.35));',
      ' col=mix(col,c2,lightAmt*.85);',
      ' col=mix(col,c3,pow(lightAmt,2.6)*.8);',
      // caustic shimmer inside the light (light through a glass of soda)
      ' float cs=pow(1.-abs(snoise(p/150.+vec2(t*.06,-t*.09)+w*.4)),6.);',
      ' col=mix(col,c3,cs*lightAmt*.38);',
      // fine fizz: one bubble per occupied cell, rising and wobbling
      ' vec2 bp=vec2(p.x,p.y+t*(34.+60.*uFizz)+uScroll*.25)/58.;',
      ' vec2 bid=floor(bp),bf=fract(bp)-.5; vec2 bh=h2(bid+1.7);',
      ' float on=step(.82-uFizz*.2,bh.x);',
      ' bf.x-=sin(t*2.1+bh.y*6.28)*.16;',
      ' float rad=(.04+.13*bh.y*bh.y), bl=length(bf);',
      ' float bub=on*(smoothstep(rad+.035,rad,bl)-smoothstep(rad,rad-.04,bl)*.72+smoothstep(rad*.45,0.,length(bf-vec2(-rad*.35,rad*.35)))*.5);',
      ' col=mix(col,c3,clamp(bub,0.,1.)*(.2+.3*lightAmt));',
      ' col=mix(col,c3,ring*.22);',
      // fine grain against banding (+-1.2%)
      ' float g=fract(52.9829189*fract(dot(gl_FragCoord.xy+mod(t*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
      ' gl_FragColor=vec4(col+(g-.5)*.024,1.);',
      '}'
    ].join('\n');
  }

  /* ------------------------------------------------------------------ engine */
  function mount(opts) {
    opts = opts || {};
    var html = document.documentElement;
    var mq = matchMedia('(prefers-reduced-motion: reduce)');
    var still = function () { return mq.matches || html.getAttribute('data-ydx-still') === '1'; };
    var coarse = matchMedia('(pointer: coarse)').matches;
    var OVER = 0.15;
    var wrap = document.createElement('div');
    wrap.id = 'ydx-field'; wrap.setAttribute('aria-hidden', 'true');
    var cv = document.createElement('canvas');
    wrap.appendChild(cv);
    var gl = null, U = {}, prog = null, raf = 0, dead = false, lost = false, ready = false;
    var W = 0, H = 0, cssW = 1, cssH = 1, vh = innerHeight || 800, q = coarse ? 0.5 : 0.6, upgraded = false;
    var t = 7.3, last = 0, lastDraw = 0, ema = 16, slow = 0, fast = 0;
    var ptr = [-1e4, -1e4], ptrT = [-1e4, -1e4], ptrS = 0, ptrST = 0, vel = [0, 0], client = null, lastMove = -1e9;
    var bursts = [[0, 0, 9, 0], [0, 0, 9, 0], [0, 0, 9, 0]], bi = 0;
    var wind = 0, fizz = 0, sy = scrollY, lastSy = scrollY, drawnSy = -1e9, bandsDirty = true;
    var desks = [], state = new Map();
    var inst = { el: wrap, canvas: cv, state: 'init' };

    function setState(s) { inst.state = s; wrap.setAttribute('data-state', s); }
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function init() {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag(coarse || opts.low)));
      gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uK', 'uTime', 'uWind', 'uFizz', 'uScroll', 'uFieldY', 'uPtr', 'uVel', 'uBurst', 'uBand', 'uPal', 'uAmt', 'uN', 'uW']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]'); });
      W = H = 0;
    }

    /* ---- desks (bands): measured in document space, re-measured only when the page changes */
    function measure() {
      var list = opts.bands ? opts.bands() : [];
      var y0 = scrollY;
      desks = list.map(function (d) {
        var r = d.el ? d.el.getBoundingClientRect() : null;
        return { key: d.key || d.el, kind: d.kind, flavor: d.flavor || null, get: d.get, top: r ? r.top + y0 : d.top, bottom: r ? r.bottom + y0 : d.bottom };
      }).filter(function (d) { return d.bottom > d.top; }).sort(function (a, b) { return a.top - b.top; });
      bandsDirty = false;
    }
    // per-desk palette, eased when its flavour changes (keyed by element, so it survives scrolling in and out)
    function pal(d, k) {
      var fl = d.get ? d.get() : d.flavor;
      var s = state.get(d.key), want = (d.kind + '|' + (fl || ''));
      if (!s) { var p0 = palette(d.kind, fl); s = { want: want, cur: p0.c.map(function (c) { return c.slice(); }), tgt: p0 }; state.set(d.key, s); }
      if (s.want !== want) { s.want = want; s.tgt = palette(d.kind, fl); }
      for (var i = 0; i < 4; i++) for (var c = 0; c < 3; c++) s.cur[i][c] += (s.tgt.c[i][c] - s.cur[i][c]) * k;
      return s;
    }
    var bandArr = new Float32Array(20), palArr = new Float32Array(60), amtArr = new Float32Array(5), burstArr = new Float32Array(12);

    function resize() {
      var d = Math.min(window.devicePixelRatio || 1, 1.5) * q;
      var w = Math.max(1, Math.round(cssW * d)), h = Math.max(1, Math.round(cssH * d));
      if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; gl.viewport(0, 0, w, h); }
    }
    function layout() {
      // canvas height only grows (mobile URL bars resize the viewport constantly while scrolling)
      var nvh = Math.max(innerHeight || 0, html.clientHeight || 0);
      var w = html.clientWidth || innerWidth;
      if (w !== cssW || nvh > vh + 1 || nvh < vh * 0.7) { vh = nvh; cssW = w; }
      cssH = Math.round(vh * (1 + 2 * OVER));
      cv.style.height = cssH + 'px';
      bandsDirty = true;
    }

    function draw(colorK) {
      if (!gl || lost || dead || gl.isContextLost()) return;
      if (bandsDirty) measure();
      resize();
      var over = Math.round(vh * OVER), top = Math.round(sy) - over;   // canvas top in document px
      cv.style.transform = 'translate3d(0,' + top + 'px,0)';
      var n = 0;
      for (var i = 0; i < desks.length && n < 5; i++) {
        var d = desks[i];
        if (d.bottom < top || d.top > top + cssH) continue;
        var prev = i > 0 ? desks[i - 1] : null;
        // the slanted seam (r4 label edge): only where the colour changes; pressed flat as it reaches mid-viewport
        var slant = 0;
        if (prev && prev.kind !== d.kind && !opts.flat) {
          var h = Math.max(26, Math.min(88, cssW * 0.055));
          var prog2 = Math.max(0, Math.min(1, (vh - (d.top - sy)) / (vh * 0.5)));
          slant = h * (1 - prog2);
        }
        var s = pal(d, colorK), P = s.tgt;
        bandArr[n * 4] = n === 0 ? -1e5 : d.top - top; bandArr[n * 4 + 1] = n === 0 ? 0 : slant; bandArr[n * 4 + 2] = P.lift; bandArr[n * 4 + 3] = P.shade;
        for (var k = 0; k < 4; k++) { palArr[n * 12 + k * 3] = s.cur[k][0]; palArr[n * 12 + k * 3 + 1] = s.cur[k][1]; palArr[n * 12 + k * 3 + 2] = s.cur[k][2]; }
        amtArr[n] = P.amt;
        n++;
      }
      if (!n) { bandArr[0] = -1e5; var s0 = pal({ key: 'fallback', kind: 0 }, 1); for (var k2 = 0; k2 < 4; k2++) palArr.set(s0.cur[k2], k2 * 3); amtArr[0] = s0.tgt.amt; n = 1; }
      for (var j = 0; j < 3; j++) { burstArr.set(bursts[j], j * 4); }
      var calm = still();
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uK, W / cssW);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uWind, calm ? 0 : wind); gl.uniform1f(U.uFizz, calm ? 0 : fizz);
      gl.uniform1f(U.uScroll, calm ? 0 : sy);
      gl.uniform1f(U.uFieldY, calm ? top : top - sy * 0.82);   // light ~still in the viewport; reduced motion: locked to the page
      gl.uniform3f(U.uPtr, ptr[0], ptr[1] + over, calm ? 0 : ptrS); gl.uniform2f(U.uVel, vel[0], vel[1]);
      gl.uniform4fv(U.uBurst, burstArr); gl.uniform4fv(U.uBand, bandArr); gl.uniform3fv(U.uPal, palArr); gl.uniform1fv(U.uAmt, amtArr);
      gl.uniform1f(U.uN, n); gl.uniform1f(U.uW, cssW);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawnSy = sy; draws++;
      if (!ready) { ready = true; setState('ready'); if (opts.onReady) opts.onReady(inst); }
    }

    var jsEma = 0, draws = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var j0 = performance.now(), d0 = draws;
      tick(now);
      if (draws !== d0) jsEma += (performance.now() - j0 - jsEma) * 0.05;   // main-thread cost of a drawn frame
    }
    function tick(now) {
      var dt = last ? Math.min(now - last, 50) : 16.7; last = now;
      sy = scrollY;
      var busy = opts.busy ? opts.busy() : false;
      var calm = still();
      // scroll moved far since the last frame we drew: always redraw (the canvas window must keep covering the view)
      var mustDraw = Math.abs(sy - drawnSy) > vh * OVER * 0.5;   // (DOM changes alone wait until the cans are done)
      if (calm) {   // no clock: redraw only when the page moved or changed (and a slow 2.5 fps check for flavour changes)
        if (Math.abs(sy - drawnSy) > 0.5 || bandsDirty || pendingColor || now - lastDraw > 400) { pendingColor = false; lastDraw = now; draw(1); }
        lastSy = sy; return;
      }
      if (busy && !mustDraw) { lastSy = sy; return; }   // the cans own the GPU right now: hold the last frame
      var cap = opts.fps ? opts.fps() : 60;
      if (cap < 60 && now - lastDraw < 1000 / cap - 2 && !mustDraw) return;
      var step = lastDraw ? Math.min(now - lastDraw, 50) : dt; lastDraw = now;
      t = (t + step / 1000) % 1000;
      // adaptive quality from measured frame interval (only when we draw every frame)
      if (cap >= 60) {
        ema += (dt - ema) * 0.05;
        if (ema > 24 && q > 0.32) { if (++slow > 50) { q = Math.max(0.3, q * 0.8); slow = 0; ema = 16; } } else slow = 0;
        if (ema < 12.5 && q < (coarse ? 0.5 : 0.6) && !upgraded) { if (++fast > 300) { q = Math.min(coarse ? 0.5 : 0.6, q / 0.8); upgraded = true; } } else fast = 0;
      }
      // inputs
      var k = 1 - Math.exp(-step / 120), kv = 1 - Math.exp(-step / 260);
      var sv = Math.abs(sy - lastSy) / step * 1000; lastSy = sy;      // px/s
      if (client) { ptrT = client; client = null; }
      if (now - lastMove > (coarse ? 1400 : 5000)) ptrST = 0;
      var px = ptr[0], py = ptr[1];
      if (ptr[0] < -1e3 && ptrT[0] > -1e3) { ptr = ptrT.slice(); }
      ptr[0] += (ptrT[0] - ptr[0]) * k; ptr[1] += (ptrT[1] - ptr[1]) * k;
      vel[0] += ((ptr[0] - px) / step * 1000 - vel[0]) * kv; vel[1] += ((ptr[1] - py) / step * 1000 - vel[1]) * kv;
      ptrS += (ptrST - ptrS) * (1 - Math.exp(-step / 380));
      var pv = Math.min(1, Math.hypot(vel[0], vel[1]) / 2600);
      wind += (Math.min(1, sv / 2400 + pv * 0.5) - wind) * (1 - Math.exp(-step / (sv > 50 ? 200 : 1400)));
      fizz += (Math.min(1, sv / 1800) + (opts.fizz ? opts.fizz() : 0) - fizz) * (1 - Math.exp(-step / 500));
      for (var i = 0; i < 3; i++) if (bursts[i][3] > 0) { bursts[i][2] += step / 1000; if (bursts[i][2] > 1.4) bursts[i][3] = 0; }
      draw(1 - Math.exp(-step / 650));
    }
    var pendingColor = false;
    function run() {
      var go = gl && !lost && !dead && !document.hidden;
      wrap.setAttribute('data-anim', go && !still() ? 'on' : 'off');
      if (go && !raf) { last = 0; lastDraw = 0; raf = requestAnimationFrame(frame); }
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    /* ---- input */
    function onMove(e) {
      if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
      client = [e.clientX, e.clientY]; lastMove = performance.now(); ptrST = e.pointerType === 'touch' ? 0.9 : 1;
    }
    function onDown(e) {
      onMove(e);
      if (still() || (opts.burstOk && !opts.burstOk(e))) return;
      var over = Math.round(vh * OVER);
      bursts[bi] = [e.clientX, e.clientY + over, 0, e.pointerType === 'touch' ? 0.8 : 1]; bi = (bi + 1) % 3;
    }
    function onLeave() { ptrST = 0; }
    function onResize() { layout(); }
    function onVis() { run(); }
    // context loss: hand the colour back to the page (opts.onLost) until the context is rebuilt and has drawn again
    function onLost(e) { e.preventDefault(); lost = true; ready = false; setState('lost'); run(); if (opts.onLost) opts.onLost(); }
    function onRestored() { lost = false; try { init(); bandsDirty = true; run(); } catch (err) { fail(err); } }
    function fail(err) {
      setState('fallback'); dead = true; run();
      if (opts.onFail) opts.onFail(err);
    }

    inst.invalidate = function () { bandsDirty = true; pendingColor = true; };
    inst.burst = function (x, y, s) { var over = Math.round(vh * OVER); bursts[bi] = [x, y + over, 0, s == null ? 1 : s]; bi = (bi + 1) % 3; };
    inst.redraw = function () { pendingColor = true; };
    inst.quality = function () { return q; };
    inst.stats = function () { return { q: q, js: +jsEma.toFixed(3), draws: draws, w: W, h: H }; };
    inst.destroy = function () {
      dead = true; run();
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown, true); removeEventListener('resize', onResize);
      html.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVis);
      var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      gl = null; wrap.remove();
    };
    inst.palette = palette;

    try {
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !opts.allowSoftware };
      gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('WebGL unavailable');
      init();
    } catch (err) { gl = null; setState('fallback'); if (opts.onFail) opts.onFail(err); return inst; }

    (opts.parent || document.body).appendChild(wrap);
    cv.addEventListener('webglcontextlost', onLost, false);
    cv.addEventListener('webglcontextrestored', onRestored, false);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true, capture: true });
    html.addEventListener('pointerleave', onLeave, { passive: true });
    addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    if (mq.addEventListener) mq.addEventListener('change', function () { pendingColor = true; run(); });
    layout();
    try { draw(1); } catch (err) { fail(err); return inst; }
    run();
    return inst;
  }

  window.YdxField = { mount: mount, palette: palette, FLAVOR: FLAVOR };
})();
