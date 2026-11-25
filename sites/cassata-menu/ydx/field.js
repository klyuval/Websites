/* Cassata — ydx round 5: the "living gelato field".
   One WebGL canvas per page, raw WebGL 1, no dependencies, CSP-safe (external file, no eval, no style attributes).

   What it draws (the site's own motifs, nothing generic):
   - the flavour's field colour as a slow, churning gelato surface (domain-warped simplex noise read as soft folds);
   - a "variegato" ribbon: the pointer (or a finger, or an idle ghost spoon) drags a lighter ribbon through the
     gelato that folds with the surface and heals back in ~2s;
   - a "pour" when the flavour changes: the next colour spreads out from the coupe as a sticker blob with drips,
     the site's ink outline and its hard offset shadow (the same language as the loader's drip curtain);
   - scroll velocity stirs the surface.
   Contrast: every effect only pushes the field AWAY from its text colour (lighter on light fields, darker on dark
   fields), so the app's own field/ink pairs (chosen for contrast) can only gain contrast, never lose it.

   API: window.YdxField.create(canvas, opts) → { setField(field, ink, origin?, instant?), stroke(x, y), lift(),
        dab(x, y), stir(v), active(bool), setRegion(w, h), ready, destroy() }   (coordinates: CSS px in the canvas)
   Home page binding (bottom of file): mounts behind `.hero` only; /host is never touched (file not linked there).

   Simplex noise: Ian McEwan, Stefan Gustavson (Ashima Arts), MIT licence. */
(function () {
  'use strict';
  var w = window, d = document;
  if (w.YdxField) return;

  var NOISE = [
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float snoise(vec3 v){',
    ' const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);',
    ' vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
    ' vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
    ' vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
    ' i=mod289(i);',
    ' vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    ' float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
    ' vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);',
    ' vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);',
    ' vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
    ' vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));',
    ' vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    ' vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
    ' vec4 nm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    ' p0*=nm.x; p1*=nm.y; p2*=nm.z; p3*=nm.w;',
    ' vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;',
    ' return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}'
  ].join('\n');
  var N = 32; // ribbon points
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes,uO,uPtr; uniform float uK,uTime,uProg,uStir,uMaxD,uSeed,uPull,uGate,uAmt;',
    'uniform vec3 uF0,uF1,uA0,uA1,uInk;',
    'uniform vec4 uP[' + N + '];',
    NOISE,
    'float fbm(vec3 p){float s=.5*snoise(p);p=p*2.03+vec3(1.7,9.2,4.1);s+=.25*snoise(p);return s;}',
    'float blob(vec2 o,float R){', // pour front: a circle whose edge carries drips and a little wobble
    ' float a=atan(o.y,o.x);',
    ' float lob=pow(abs(sin(a*5.+uSeed)),7.)*.10+pow(abs(sin(a*9.+uSeed*1.7)),12.)*.07+sin(a*3.+uSeed*2.3)*.015;',
    ' return length(o)/(1.+lob)-R;', // < 0 inside (≈ px)
    '}',
    'void main(){',
    ' vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uK;', // CSS px, y down
    ' vec2 dp=px-uPtr; float pull=exp(-dot(dp,dp)/32000.)*uPull;',
    ' vec2 q=(px-dp*pull*.22)/430.;',
    ' float t=uTime*.045;',
    ' vec3 Q=vec3(q,t);',
    ' vec2 wv=vec2(fbm(Q),fbm(Q+vec3(5.2,1.3,2.8+uStir*.6)));',
    ' float n=fbm(vec3(q*1.35+1.5*wv+vec2(0.,uStir*.12),t*1.4));',
    ' float fold=1.-abs(sin(n*3.6+wv.x*2.));',               // broad soft ridges, like gelato sculpted in the vitrine
    ' float sh=smoothstep(.45,1.,fold)*smoothstep(-.35,.45,n)*.75+smoothstep(-.1,.7,n)*.35;',
    // variegato ribbon: distance to the pointer polyline, bent by the same flow as the folds
    ' vec2 rq=px+wv*46.;',
    ' float bd=1e4,bn=1e4;',
    ' for(int i=0;i<' + (N - 1) + ';i++){',
    '  vec4 a=uP[i]; vec4 b=uP[i+1];',
    '  if(a.w>.5&&a.z>.5){',
    '   vec2 pa=rq-a.xy, ba=b.xy-a.xy; float h=clamp(dot(pa,ba)/max(dot(ba,ba),.001),0.,1.);',
    '   float dd=length(pa-ba*h); float wd=mix(a.z,b.z,h);',
    '   bd=min(bd,dd-wd); bn=min(bn,dd/wd);',
    '  }',
    ' }',
    ' float rib=1.-smoothstep(-1.3,1.3,bd);',
    ' float hi=(1.-smoothstep(.0,.2,abs(bn-.45)))*rib;',  // a soft sheen line inside the ribbon
    // pour of the next flavour from the coupe, sticker-style: ink outline + hard offset shadow
    ' float R=uProg*uMaxD;',
    ' float e=blob(px-uO,R), es=blob(px-uO-vec2(5.,6.),R);',
    ' float inside=(1.-smoothstep(-.8,.8,e))*uGate;',
    ' float rim=(1.-smoothstep(1.,2.4,abs(e)))*uGate;',
    ' float shadow=(1.-smoothstep(-.8,.8,es))*(1.-inside)*uGate;',
    ' vec3 base=mix(uF0,uF1,inside), away=mix(uA0,uA1,inside);',
    ' vec3 col=mix(base,away,(sh*.12+rib*.40+hi*.14)*uAmt);',
    ' col=mix(col,uInk,max(rim,shadow));',
    ' float g=fract(52.9829189*fract(dot(gl_FragCoord.xy+mod(uTime*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(col+(g-.5)*.022,1.);',
    '}'
  ].join('\n');

  function hex(c) {
    c = String(c || '').trim().replace('#', '');
    if (c.length === 3) c = c.replace(/./g, '$&$&');
    if (!/^[0-9a-f]{6}$/i.test(c)) return null;
    var n = parseInt(c, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function lum(c) { var f = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
  // the direction every effect pushes toward: away from the text colour, so contrast only grows
  function away(field, ink) { return lum(ink) < lum(field) ? [1, 0.985, 0.95] : [0.04, 0.035, 0.03]; }
  // darkening reads as a stain sooner than lightening reads as cream: dark fields get a gentler ribbon
  function amount(field, ink) { return lum(ink) < lum(field) ? 1 : 0.5; }
  var INK = hex('#1d1b16');

  function create(canvas, opts) {
    opts = opts || {};
    var mq = matchMedia('(prefers-reduced-motion: reduce)');
    var maxDpr = opts.maxDpr || 1.5, q = opts.quality || 1, qMin = 0.35;
    var gl = null, U = {}, raf = 0, pend = 0, lost = false, dead = false, on = false, visible = !d.hidden;
    var W = 0, H = 0, cssW = 1, cssH = 1, dirty = true, held = false;
    var t = 7 + Math.random() * 40, last = 0, ema = 16, slow = 0, strikes = 0, bad = 0;
    var F0 = hex('#b9cc5a'), F1 = F0, A0 = [1, 1, 1], A1 = A0, ink = hex('#1e3a27');
    var amt = 1, amtT = 1;
    var prog = 0, pouring = false, O = [0, 0], seed = 1.3;
    var stirP = 0, stirV = 0, ptr = [-1e4, -1e4], ptrT = [-1e4, -1e4], pull = 0, pullT = 0;
    var pts = [], strokeId = 0, lastPt = null, lastInput = -1e9, ghostT = 0;
    var P = new Float32Array(N * 4);
    var inst = { canvas: canvas, ready: false, state: 'init' };
    var listeners = [];

    function setState(s) { inst.state = s; canvas.setAttribute('data-state', s); if (opts.onState) opts.onState(s); }
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function init() {
      var pr = gl.createProgram();
      gl.attachShader(pr, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      'uRes uO uPtr uK uTime uProg uStir uMaxD uSeed uPull uGate uAmt uF0 uF1 uA0 uA1 uInk uP'.split(' ').forEach(function (n) {
        U[n] = gl.getUniformLocation(pr, n === 'uP' ? 'uP[0]' : n);
      });
      W = H = 0; dirty = true;
    }
    function size() {
      var k = Math.min(w.devicePixelRatio || 1, maxDpr) * q;
      var nw = Math.max(1, Math.round(cssW * k)), nh = Math.max(1, Math.round(cssH * k));
      if (nw !== W || nh !== H) { W = canvas.width = nw; H = canvas.height = nh; gl.viewport(0, 0, nw, nh); }
      dirty = false;
    }
    function packPoints(now) {
      var life = opts.life || 1900;
      while (pts.length && now - pts[0].t > life) pts.shift();
      for (var i = 0; i < N; i++) {
        var p = pts[i], o = i * 4;
        if (!p) { P[o] = P[o + 1] = P[o + 2] = P[o + 3] = 0; continue; }
        var a = (now - p.t) / life, nx = pts[i + 1];
        P[o] = p.x; P[o + 1] = p.y;
        P[o + 2] = p.w * Math.pow(Math.max(0, 1 - a), 0.75) * Math.min(1, (now - p.t) / 90 + 0.35);
        P[o + 3] = nx && nx.s === p.s ? 1 : 0;
      }
    }
    function draw(now) {
      if (!gl || lost || dead || gl.isContextLost()) return;
      if (dirty) size();
      now = now || performance.now();
      packPoints(now);
      var k = W / cssW;
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uK, k);
      gl.uniform2f(U.uO, O[0], O[1]); gl.uniform2f(U.uPtr, ptr[0], ptr[1]);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uProg, 1 - Math.pow(1 - prog, 3)); // ease-out: the pour reaches the copy before the app recolours it
      gl.uniform1f(U.uAmt, amt); gl.uniform1f(U.uStir, stirP);
      gl.uniform1f(U.uMaxD, maxD()); gl.uniform1f(U.uSeed, seed); gl.uniform1f(U.uPull, pull);
      gl.uniform1f(U.uGate, pouring ? 1 : 0);
      gl.uniform3fv(U.uF0, F0); gl.uniform3fv(U.uF1, F1); gl.uniform3fv(U.uA0, A0); gl.uniform3fv(U.uA1, A1);
      gl.uniform3fv(U.uInk, INK);
      gl.uniform4fv(U.uP, P);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!inst.ready) { inst.ready = true; setState('ready'); }
    }
    // far enough that the blob (drips included) has left every corner of the canvas
    function maxD() {
      var dx = Math.max(O[0], cssW - O[0]), dy = Math.max(O[1], cssH - O[1]);
      return Math.sqrt(dx * dx + dy * dy) * 1.25 + 40;
    }
    function ghost(now, dt) {
      // idle "ghost spoon": a slow figure-eight swirl, so touch screens and still mice see the field being churned
      if (!opts.ghost || now - lastInput < 4500) { ghostT = 0; return; }
      ghostT += dt;
      var s = ghostT / 1000 * 0.55, g = opts.ghost();
      if (!g) return;
      var x = g.x + Math.sin(s) * g.rx, y = g.y + Math.sin(s * 2) * g.ry;
      addPoint(x, y, 0.85, true);
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      var raw = last ? Math.min(now - last, 1000) : 16.7, dt = Math.min(raw, 50); last = now;
      t = (t + dt / 1000) % 1e4;
      // adaptive quality: drop the render scale when frames are slow (never steps back up: no oscillation);
      // very slow frames count more, so a struggling device reacts within a second or two
      ema += (raw - ema) * 0.08;
      if (ema > 26) slow += raw > 60 ? 6 : 1; else slow = Math.max(0, slow - 1);
      bad = raw > 100 ? bad + 1 : 0; // a dozen frames in a row under 10fps: the device can't carry it
      if (bad >= 12 && !w.__ydxGLkeep) { inst.ready = false; setState('slow'); inst.destroy(); return; }
      if (slow > 50) {
        slow = 0; ema = 16;
        if (q > qMin) { q = Math.max(qMin, q * 0.75); dirty = true; }
        // still too slow at the lowest scale: give the page back its flat CSS field — the field must never cost
        // the app its smoothness (a test hook, __ydxGLkeep, keeps it for screenshots)
        else if (++strikes >= 2 && !w.__ydxGLkeep) { inst.ready = false; setState('slow'); inst.destroy(); return; }
      }
      var kk = 1 - Math.exp(-dt / 110);
      ptr[0] += (ptrT[0] - ptr[0]) * kk; ptr[1] += (ptrT[1] - ptr[1]) * kk;
      pull += (pullT - pull) * (1 - Math.exp(-dt / 260)); pullT *= Math.exp(-dt / 900);
      amt += (amtT - amt) * (1 - Math.exp(-dt / 500));
      stirV *= Math.exp(-dt / 400); stirP += stirV * dt / 1000;
      if (pouring) {
        prog += dt / (opts.pourMs || 1150);
        if (prog >= 1) { pouring = false; prog = 0; F0 = F1; A0 = A1; }
      }
      ghost(now, dt);
      if (opts.tick) opts.tick(now, dt);
      draw(now);
      if (opts.onFrame) opts.onFrame(dt);
    }
    function frame() { if (!raf && !pend) pend = requestAnimationFrame(function (n) { pend = 0; draw(n); }); }
    function update() {
      var run = !!gl && !lost && !dead && on && visible && !held && !mq.matches;
      canvas.setAttribute('data-anim', run ? 'on' : 'off');
      if (run && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!run && !held && gl && !lost && !dead) frame(); // a correct still frame (reduced motion, resize while paused)
      if (held && pend) { cancelAnimationFrame(pend); pend = 0; }
    }
    function addPoint(x, y, scale, isGhost) {
      var now = performance.now();
      if (!isGhost) lastInput = now;
      if (lastPt && lastPt.s === strokeId) {
        var dx = x - lastPt.x, dy = y - lastPt.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12) return;
        // fill long jumps so the ribbon stays a curve, not a zig-zag
        var steps = Math.min(4, Math.floor(dist / 40));
        for (var i = 1; i <= steps; i++) push(lastPt.x + dx * i / (steps + 1), lastPt.y + dy * i / (steps + 1), scale, now);
      }
      push(x, y, scale, now);
    }
    function push(x, y, scale, now) {
      var p = { x: x, y: y, t: now, s: strokeId, w: (opts.width || 20) * (scale || 1) };
      pts.push(p); lastPt = p;
      if (pts.length > N) pts.shift();
    }

    inst.setField = function (field, inkHex, origin, instant) {
      var f = hex(field), i = hex(inkHex) || ink;
      if (!f) return;
      if (F1 && f.join() === F1.join() && !pouring) return;
      var a = away(f, i);
      ink = i; amtT = amount(f, i);
      if (instant || !inst.ready || mq.matches || !raf) { F0 = F1 = f; A0 = A1 = a; amt = amtT; pouring = false; prog = 0; frame(); return; }
      if (pouring) { F0 = F1; A0 = A1; } // a new flavour mid-pour: settle the previous one first
      F1 = f; A1 = a; prog = 0; pouring = true; seed = Math.random() * 6.28;
      if (origin) { O[0] = origin[0]; O[1] = origin[1]; }
    };
    inst.stroke = function (x, y) { if (mq.matches) return; addPoint(x, y, 1); ptrT[0] = x; ptrT[1] = y; pullT = 1; };
    inst.lift = function () { strokeId++; lastPt = null; };
    // a tap: a short spoon twist where the finger landed
    inst.dab = function (x, y) {
      if (mq.matches) return;
      inst.lift();
      for (var i = 0; i < 9; i++) { var a = i * 0.8, r = 6 + i * 3.2; addPoint(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.05); }
      inst.lift(); ptrT[0] = x; ptrT[1] = y; pullT = 1.2;
    };
    inst.stir = function (v) { stirV = Math.max(-3, Math.min(3, stirV + v)); };
    inst.active = function (b) { on = !!b; update(); };
    // freeze without drawing (a View Transition is snapshotting the page)
    inst.hold = function (b) { held = !!b; update(); };
    inst.setSize = function (cw, ch) { if (cw !== cssW || ch !== cssH) { cssW = Math.max(1, cw); cssH = Math.max(1, ch); dirty = true; frame(); } };
    inst.quality = function () { return q; };
    inst.render = function () { frame(); };
    inst.destroy = function () {
      dead = true; update(); if (pend) cancelAnimationFrame(pend);
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
      var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      gl = null;
    };
    function listen(t2, ev, fn) { t2.addEventListener(ev, fn); listeners.push([t2, ev, fn]); }

    try {
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power',
        // software GL (no GPU) would make the whole page sluggish: keep the flat CSS field there instead
        failIfMajorPerformanceCaveat: !w.__ydxGLsoft };
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('no webgl');
      // some browsers hand out a CPU rasteriser (SwiftShader, llvmpipe…) without flagging the caveat: same answer
      if (!w.__ydxGLsoft) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        var rn = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(rn)) {
          var lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext();
          throw new Error('software gl');
        }
      }
      init();
    } catch (err) { gl = null; setState('fallback'); return inst; }

    listen(canvas, 'webglcontextlost', function (e) { e.preventDefault(); lost = true; inst.ready = false; setState('lost'); update(); });
    listen(canvas, 'webglcontextrestored', function () { lost = false; try { init(); update(); frame(); } catch (err) { setState('fallback'); } });
    listen(d, 'visibilitychange', function () { visible = !d.hidden; update(); });
    if (mq.addEventListener) { var mqf = function () { update(); }; mq.addEventListener('change', mqf); listeners.push([mq, 'change', mqf]); }
    if (opts.colors) inst.setField(opts.colors[0], opts.colors[1], null, true);
    update();
    return inst;
  }

  w.YdxField = { create: create, hex: hex, lum: lum };

  /* ------------------------------------------------------------------ */
  /* Home page: the hero's flat flavour field becomes the living field.  */
  /* The canvas sits in <body> (outside the React tree), absolutely      */
  /* positioned over the hero's box and painted under the app; the hero  */
  /* turns transparent only once the first frame has been drawn, so with */
  /* no WebGL / an error / no JS the original flat field stays.          */
  /* ------------------------------------------------------------------ */
  function bindHero() {
    var hero = d.querySelector('.site:not(.host-site) .hero');
    if (!hero || w.__ydxField) return;
    var h = d.documentElement;
    var frameMode = w.self !== w.top;
    var coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 821;
    var cv = d.createElement('canvas');
    cv.className = 'ydx-field';
    cv.setAttribute('aria-hidden', 'true');
    d.body.appendChild(cv);
    var box = { top: 0, left: 0, w: 1, h: 1 };
    var pending = null, lastY = scrollY, onScreen = true;

    function layout() {
      var r = hero.getBoundingClientRect();
      box.top = r.top + scrollY; box.left = r.left + scrollX; box.w = r.width; box.h = r.height;
      cv.style.top = box.top + 'px'; cv.style.left = (r.left + scrollX) + 'px';
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      F.setSize(r.width, r.height);
    }
    function coupeCentre() {
      var img = hero.querySelector('.hero__coupe img') || hero.querySelector('.hero__coupe');
      var hr = hero.getBoundingClientRect();
      if (!img) return [hr.width / 2, hr.height * 0.55];
      var r = img.getBoundingClientRect();
      return [r.left + r.width / 2 - hr.left, r.top + r.height * 0.42 - hr.top];
    }
    var lastField = '', lastInk = '';
    function readField(instant) {
      var f = hero.style.getPropertyValue('--field').trim(), i = hero.style.getPropertyValue('--tone').trim();
      if (!f) f = getComputedStyle(hero).getPropertyValue('--field').trim();
      if (!i) i = getComputedStyle(hero).getPropertyValue('--tone').trim();
      if (f === lastField && i === lastInk) return;
      lastField = f; lastInk = i;
      F.setField(f, i, instant ? null : coupeCentre(), instant);
    }

    var F = create(cv, {
      maxDpr: frameMode ? 1 : coarse ? 1.25 : 1.5,
      quality: frameMode ? 0.5 : coarse ? 0.7 : 0.85,
      width: coarse ? 16 : 22,
      onState: function (s) {
        if (s === 'ready') { h.classList.add('ydx-gl'); cv.classList.add('is-on'); }
        else if (s === 'lost' || s === 'fallback' || s === 'slow') { h.classList.remove('ydx-gl'); cv.classList.remove('is-on'); }
      },
      ghost: function () { // idle spoon churns the empty band above the copy, away from the coupe
        if (!box.w) return null;
        return coarse ? { x: box.w * 0.5, y: box.h * 0.2, rx: box.w * 0.32, ry: box.h * 0.06 }
          : { x: box.w * 0.5, y: box.h * 0.2, rx: box.w * 0.36, ry: box.h * 0.08 };
      },
      tick: function () {
        if (!hero.isConnected) { var nh = d.querySelector('.site:not(.host-site) .hero'); if (nh) { hero = nh; io.observe(hero); ro.observe(hero); mo.observe(hero, { attributes: true, attributeFilter: ['style'] }); layout(); readField(false); } }
        if (pending) { // hero box cached by the ResizeObserver: no layout read per frame
          var x = pending[0] + scrollX - box.left, y = pending[1] + scrollY - box.top;
          if (x >= 0 && y >= 0 && x <= box.w && y <= box.h) F.stroke(x, y); else F.lift();
          pending = null;
        }
      }
    });
    w.__ydxField = F;
    if (F.state === 'fallback') { cv.remove(); return; }
    readField(true);
    // the app recolours the hero (inline --field/--tone) when the featured flavour changes: pour it in
    var mo = new MutationObserver(function () { readField(false); });
    mo.observe(hero, { attributes: true, attributeFilter: ['style'] });

    addEventListener('pointermove', function (e) { pending = [e.clientX, e.clientY]; }, { passive: true });
    addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      var x = e.clientX + scrollX - box.left, y = e.clientY + scrollY - box.top;
      if (x >= 0 && y >= 0 && x <= box.w && y <= box.h) F.dab(x, y);
    }, { passive: true });
    addEventListener('pointerup', function () { F.lift(); }, { passive: true });
    d.documentElement.addEventListener('pointerleave', function () { F.lift(); });
    addEventListener('scroll', function () {
      var y = scrollY, dy = y - lastY; lastY = y;
      if (onScreen) F.stir(dy * 0.004);
    }, { passive: true });

    var ro = new ResizeObserver(layout); ro.observe(hero);
    addEventListener('resize', layout, { passive: true });
    // hold still during the language View Transition (enhance.js flags it on <html>): the browser snapshots the
    // page there, and a canvas still being drawn into can stall that capture
    // (enhance.js calls hold() synchronously before startViewTransition; this observer is the backup)
    new MutationObserver(function () { F.hold(h.classList.contains('ydx-vt-lang')); })
      .observe(h, { attributes: true, attributeFilter: ['class'] });
    var io = new IntersectionObserver(function (es) { onScreen = es[es.length - 1].isIntersecting; F.active(onScreen); }, { rootMargin: '40px 0px' });
    io.observe(hero);
    layout();
    // bfcache: resume cleanly (the context survives; the observers fire again)
    addEventListener('pageshow', function (e) { if (e.persisted) { layout(); F.render(); } });
  }

  function boot() {
    if (!d.querySelector('.site:not(.host-site) .hero')) return;
    var go = function () { try { bindHero(); } catch (e) { d.documentElement.classList.remove('ydx-gl'); } };
    // after the app has painted and the browser is idle: the field is never on the critical path
    var idle = w.requestIdleCallback || function (f) { return setTimeout(f, 200); };
    var start = function () { idle(go, { timeout: 1200 }); };
    if (d.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
