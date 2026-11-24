/* ==========================================================================
   FORM — ydx round 5: "chalk floor" living background (raw WebGL 1, no deps)
   The app's floor is #111 with a speckle of chalk dust and a few plate-
   coloured specks (body background SVG). This draws the same floor alive:
   - a slow, domain-warped haze of chalk dust drifting up through the room,
   - two parallax layers of specks (chalk + red/blue/yellow/green plate
     chips) that drift, twinkle and scatter away from the pointer,
   - a soft overhead light that follows the pointer (gym spotlight),
   - "claps": a chalk puff that bursts outward (taps on the poster, plates
     hitting the platform in the toy, a finished workout),
   - an area-colour light from the top corner (the view's plate colour).
   Modes (set by enhance.js): signin (full, always running), play (strongest,
   the barbell toy), app (calm: low haze, runs only for a few seconds after
   input, then rests on a still frame — FORM is a daily-use tool).
   Contrast: the haze is kept in a narrow band (max ~#262624 in app views,
   ~#2c2b29 on the poster) so chalk and dim text keep WCAG AA on every frame.
   Fallbacks: no WebGL / software GPU (unless allowed) -> the canvas stays
   transparent and the body's own speckle floor shows (data-state=fallback).
   Reduced motion -> one still frame, re-drawn only on resize / mode change.
   Simplex noise: Ian McEwan, Stefan Gustavson (Ashima Arts), MIT licence.
   ========================================================================== */
(function () {
  'use strict';
  if (window.ydxChalk) return;
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
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes,uPtr,uPar; uniform float uTime,uDpr,uHaze,uLight,uSpeck,uWarp,uStir,uScroll,uTintAmt;',
    'uniform vec3 uTint; uniform vec4 uClap[3],uProt; uniform float uOver,uShade;',
    NOISE,
    'float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,4.1);a*=.5;}return s;}',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    // one layer of specks on a jittered grid; returns rgb*alpha in .rgb, alpha in .a
    'vec4 specks(vec2 fc,float cell,float seed,float rad,float t){',
    ' vec2 g=fc/cell; vec2 id=floor(g); vec2 f=fract(g)-.5;',
    ' float h=hash(id+seed); if(h<.42) return vec4(0.);',
    ' vec2 o=vec2(hash(id+seed+1.3),hash(id+seed+7.1))-.5;',
    ' float d=length((f-o*.62)*cell);',
    ' float r=rad*(.65+.7*fract(h*7.3))*uDpr;',
    ' float a=smoothstep(r+.9*uDpr,r-.3*uDpr,d);',
    ' float k=fract(h*13.7); vec3 c=vec3(.953,.945,.918); float op=.42;',
    ' if(k>.8){ float s=fract(h*31.1); op=.8;',
    '   c= s<.25?vec3(.89,.141,.169): s<.5?vec3(.114,.373,.847): s<.75?vec3(.969,.776,0.):vec3(.086,.639,.29);}',
    ' op*=.72+.28*sin(t*1.7+h*40.);',          // twinkle
    ' return vec4(c*a*op,a*op);',
    '}',
    // big, soft, out-of-focus dust motes in front of the poster (overlay mode)
    'float bokeh(vec2 fc,float cell,float seed){',
    ' vec2 g=fc/cell; vec2 id=floor(g); vec2 f=fract(g)-.5; float h=hash(id+seed); if(h<.7) return 0.;',
    ' vec2 o=vec2(hash(id+seed+2.7),hash(id+seed+5.9))-.5; float r=(.08+.12*fract(h*9.1));',
    ' return smoothstep(r,r*.35,length(f-o*.5))*(.5+.5*fract(h*3.3));',
    '}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float m=min(uRes.x,uRes.y);',
    ' vec2 p=(fc-.5*uRes)/m; vec2 d=p-(uPtr-.5*uRes)/m;',
    ' float near=exp(-dot(d,d)*7.);',
    // claps: a ring of chalk dust that expands and fades; pushes the field outward
    ' float puff=0.,ringS=0.; vec2 push=vec2(0.);',
    ' for(int i=0;i<3;i++){ vec4 c=uClap[i]; if(c.w<=0.) continue;',
    '  vec2 dc=p-(c.xy-.5*uRes)/m; float r=length(dc); float R=.05+c.z*.5;',
    '  float ring=exp(-pow((r-R)/(.05+c.z*.22),2.))*exp(-c.z*1.9)*c.w;',
    '  float core=exp(-r*r/(R*R*.6+.002))*exp(-c.z*2.6)*c.w;',
    '  puff+=ring*.75+core; ringS+=ring; push+=dc/(r+.001)*(ring+core*.5); }',
    ' vec2 sw=vec2(-d.y,d.x)*near*uStir;',       // pointer stirs the dust
    ' float t=uTime*.045;',
    ' vec2 hp=p+sw-push*.05+vec2(0.,-t*.9-uScroll*.18);',
    ' vec3 q=vec3(hp*1.25,t);',
    ' vec2 w=vec2(0.); if(uWarp>.5) w=vec2(fbm(q),fbm(q+vec3(5.2,1.3,2.8)));',
    ' float n=fbm(vec3(hp*2.1+1.7*w,t*1.3));',
    ' float haze=smoothstep(-.15,.85,n); haze*=haze;',
    ' float vig=1.-.35*dot(p*.8,p*.8);',
    ' vec3 col=vec3(.0667);',
    ' float L=(haze*uHaze*vig + near*uLight*(.35+.65*haze) + min(puff,1.4)*.11);',
    ' col+=vec3(.953,.945,.918)*L;',
    // area colour light from the top inline-end corner (uTint), very low
    ' vec2 tc=fc/uRes; float glow=exp(-dot(tc-vec2(1.,1.15),tc-vec2(1.,1.15))*3.2)+exp(-dot(tc-vec2(0.,-.2),tc-vec2(0.,-.2))*5.)*.5;',
    ' col+=uTint*glow*uTintAmt*(.55+.45*haze);',
    // specks: two parallax layers, scattered by the pointer and the claps
    ' vec2 dpx=fc-uPtr; float dd=length(dpx)+.001; vec2 away=dpx/dd*exp(-dd*dd/(uDpr*uDpr*16000.))*18.*uDpr*uStir;',
    ' vec2 pushPx=push*m*.06;',
    ' vec4 s1=specks(fc+uPar*uDpr*6.-vec2(0.,uTime*3.)*uDpr-away-pushPx-vec2(0.,uScroll*uRes.y*.12),46.*uDpr,3.1,1.,uTime);',
    ' vec4 s2=specks(fc+uPar*uDpr*14.-vec2(uTime*1.2,uTime*6.)*uDpr-away*1.6-pushPx*1.5-vec2(0.,uScroll*uRes.y*.24),83.*uDpr,9.7,1.45,uTime*.8);',
    ' vec4 s=(s1+s2)*uSpeck*(1.+near*.6);',
    ' col=col*(1.-min(s.a,1.))+s.rgb;',
    ' if(uOver>.5){',
    // overlay over the sign-in poster (premultiplied alpha, composed with
    // "over"): an overhead spotlight that follows the pointer (everything
    // away from it dims a little), chalk haze and light in front, specks and
    // soft out-of-focus motes drifting between the camera and the poster
    '  float spot=exp(-dot(d,d)*2.);',
    // the poster copy and footer keep AA: the dimming eases off over them
    '  vec2 pq=max(uProt.xy-fc,fc-uProt.zw); float prot=1.-smoothstep(0.,40.*uDpr,max(pq.x,pq.y));',
    '  float shade=uShade*(1.-spot)*(1.-prot*.6);',
    '  vec4 o=vec4(0.,0.,0.,min(.85,shade+min(ringS,1.)*.26));',
    // chalk puff: a cloudy, noise-textured burst (shaded rim, lit core) so it
    // reads on the dark floor and on the chalk-white letters alike
    '  float cloud=min(puff,1.5)*smoothstep(-.35,.55,n);',
    '  float Lh=clamp(haze*uHaze*1.2+near*uLight*(1.-prot*.5)+cloud*.62,0.,.7);',
    '  o=vec4(vec3(.953,.945,.918)*Lh,Lh)+o*(1.-Lh);',
    '  vec2 bp=fc+uPar*uDpr*40.-vec2(uTime*4.,uTime*14.)*uDpr-pushPx*2.5;',
    '  float bk=bokeh(bp,190.*uDpr,4.2)*.16*(.6+.8*near);',
    '  o=vec4(vec3(.953,.945,.918)*bk,bk)+o*(1.-bk);',
    '  o=s+o*(1.-min(s.a,1.));',
    '  gl_FragColor=o; return;',
    ' }',
    ' float g=fract(52.9829189*fract(dot(fc+mod(uTime*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(col+(g-.5)*.018,1.);',
    '}'
  ].join('\n');

  function hex(c) {
    c = String(c || '#000').trim().replace('#', '');
    if (c.length === 3) c = c.replace(/./g, '$&$&');
    var n = parseInt(c, 16) || 0;
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  // per-mode targets: haze, light, speck, stir, tint amount, warp(0/1), quality cap
  var MODES = {
    signin: { haze: .085, light: .1, speck: .75, stir: .55, tint: .10, warp: 1, q: 1, over: 1, shade: .42 },
    play: { haze: .12, light: .11, speck: 1.15, stir: .8, tint: .16, warp: 1, q: 1, over: 0, shade: 0 },
    app: { haze: .05, light: .028, speck: .75, stir: .18, tint: .07, warp: 0, q: .75, over: 0, shade: 0 }
  };

  function mount(canvas, opts) {
    opts = opts || {};
    var mq = matchMedia('(prefers-reduced-motion: reduce)');
    var gl = null, U = {}, raf = 0, pending = 0, lost = false, dead = false, visible = !document.hidden;
    var t = 7.3, last = 0, ema = 16, slow = 0, fast = 0, q = 1, upgraded = false, starve = 0, gaveUp = false;
    var stats = { frames: 0, js: 0, draw: 0 }; // main-thread cost: loop logic, and the uniform upload + draw call
    var mode = 'signin', M = MODES.signin, still = !!opts.still;
    var cur = { haze: M.haze, light: M.light, speck: M.speck, stir: M.stir, tint: M.tint };
    var tint = hex('#e3242b'), tintT = tint.slice();
    var ptr = [.5, .4], ptrT = [.5, .4], client = null, lastMove = -1e9, par = [0, 0];
    var scroll = 0, scrollT = 0, lastInput = performance.now(), speed = 1;
    var claps = [[0, 0, 9, 0], [0, 0, 9, 0], [0, 0, 9, 0]], clapI = 0, clapBuf = new Float32Array(12);
    var W = 0, H = 0, cssW = 1, cssH = 1, dirty = true, ro = null, dprNow = 1, prot = [-9, -9, -9, -9];
    var inst = { canvas: canvas, state: 'init' };

    function setState(s) { inst.state = s; canvas.setAttribute('data-state', s); }
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function init() {
      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uPtr', 'uPar', 'uTime', 'uDpr', 'uHaze', 'uLight', 'uSpeck', 'uWarp', 'uStir', 'uScroll', 'uTintAmt', 'uTint', 'uClap', 'uOver', 'uShade', 'uProt']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      W = H = 0; dirty = true;
    }
    function fallback(err) {
      setState('fallback');
      document.documentElement.classList.add('ydx-no-gl');
      if (err && opts.debug) console.warn('[ydxChalk] fallback:', err.message || err);
    }
    function measure() { cssW = innerWidth || 1; cssH = innerHeight || 1; dirty = true; }
    function size() {
      var cap = Math.min(q, M.q);
      dprNow = Math.min(devicePixelRatio || 1, 1.5) * cap;
      var w = Math.max(1, Math.round(cssW * dprNow)), h = Math.max(1, Math.round(cssH * dprNow));
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, w, h); }
      dirty = false;
    }
    function draw() {
      if (!gl || lost || dead || gl.isContextLost()) return;
      if (dirty) size();
      gl.uniform2f(U.uRes, W, H);
      gl.uniform2f(U.uPtr, ptr[0] * W, (1 - ptr[1]) * H);
      gl.uniform2f(U.uPar, par[0], par[1]);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uDpr, dprNow);
      gl.uniform1f(U.uHaze, cur.haze); gl.uniform1f(U.uLight, cur.light); gl.uniform1f(U.uSpeck, cur.speck);
      gl.uniform1f(U.uStir, cur.stir); gl.uniform1f(U.uWarp, M.warp); gl.uniform1f(U.uScroll, scroll);
      gl.uniform1f(U.uTintAmt, cur.tint); gl.uniform3fv(U.uTint, tint);
      gl.uniform1f(U.uOver, M.over); gl.uniform1f(U.uShade, M.shade);
      var s = dprNow; gl.uniform4f(U.uProt, prot[0] * s, H - prot[3] * s, prot[2] * s, H - prot[1] * s);
      for (var i = 0; i < 3; i++) {
        var c = claps[i];
        clapBuf[i * 4] = c[0] * W; clapBuf[i * 4 + 1] = (1 - c[1]) * H; clapBuf[i * 4 + 2] = c[2]; clapBuf[i * 4 + 3] = c[2] < 3 ? c[3] : 0;
      }
      gl.uniform4fv(U.uClap, clapBuf);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (inst.state !== 'ready') setState('ready');
    }
    function loop(now) {
      raf = 0;
      var now0 = performance.now();
      var raw = last ? now - last : 16.7, dt = Math.min(raw, 50); last = now;
      // app mode rests: after a few quiet seconds the field slows to a stop and
      // the loop ends on a still frame (no GPU work while someone reads a plan)
      var idle = now - lastInput;
      // and on a GPU too slow even at the lowest resolution, app views keep
      // a still floor (the work comes first); sign-in and the toy keep going
      if (q < .43 && ema > 30 && ++starve > 60) gaveUp = true;
      var target = mode === 'app' && (idle > 5000 || gaveUp) ? 0 : 1;
      speed += (target - speed) * (1 - Math.exp(-Math.min(raw, 1000) / 500)); // wall time: rests on time even on slow GPUs
      t = (t + dt / 1000 * speed) % 1e4;
      ema += (dt - ema) * .05;
      if (ema > 24 && q > .4) { if (++slow > 45) { q *= .75; slow = 0; ema = 16; dirty = true; } } else slow = 0;
      if (ema < 13 && q < 1 && !upgraded) { if (++fast > 240) { q = Math.min(1, q / .75); upgraded = true; dirty = true; } } else fast = 0;
      if (client) {
        ptrT[0] = client[0] / cssW; ptrT[1] = client[1] / cssH; client = null;
      } else if (now - lastMove > 4000 && mode !== 'app') {
        ptrT[0] = .5 + .3 * Math.sin(t * .23); ptrT[1] = .42 + .2 * Math.cos(t * .17);
      }
      var k = 1 - Math.exp(-dt / 160), kc = 1 - Math.exp(-dt / 700);
      ptr[0] += (ptrT[0] - ptr[0]) * k; ptr[1] += (ptrT[1] - ptr[1]) * k;
      par[0] += ((ptr[0] - .5) * -2 - par[0]) * k; par[1] += ((ptr[1] - .5) * 2 - par[1]) * k;
      scroll += (scrollT - scroll) * (1 - Math.exp(-dt / 90));
      for (var key in cur) cur[key] += (M[key] - cur[key]) * kc;
      for (var c = 0; c < 3; c++) tint[c] += (tintT[c] - tint[c]) * kc;
      var anyClap = false;
      for (var i = 0; i < 3; i++) { if (claps[i][2] < 3) { claps[i][2] += dt / 1000; anyClap = true; } }
      var j0 = performance.now();
      draw();
      stats.frames++; stats.js += j0 - now0; stats.draw += performance.now() - j0;
      if (target === 0 && speed < .01 && !anyClap) { canvas.setAttribute('data-anim', 'rest'); return; }
      raf = requestAnimationFrame(loop);
    }
    function canRun() { return gl && !lost && !dead && visible && !mq.matches && !still; }
    function wake() {
      lastInput = performance.now();
      if (canRun() && !raf) { canvas.setAttribute('data-anim', 'on'); last = 0; raf = requestAnimationFrame(loop); }
    }
    function requestDraw() {
      if (raf || pending || !gl) return;
      pending = requestAnimationFrame(function () {
        pending = 0;
        // still frame: settle every eased value at its target first
        for (var key in cur) cur[key] = M[key];
        tint = tintT.slice(); scroll = scrollT;
        draw();
      });
    }
    function update() {
      if (canRun()) wake();
      else {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        canvas.setAttribute('data-anim', 'off');
        requestDraw();
      }
    }
    function onMove(e) { client = [e.clientX, e.clientY]; lastMove = performance.now(); if (mode !== 'app' || e.pointerType === 'mouse') wake(); }
    function onScroll() {
      scrollT = (window.scrollY || 0) / (innerHeight || 1);
      if (mode === 'app') { scrollT = Math.min(scrollT, 6); }
      wake();
    }
    function onVis() { visible = !document.hidden; update(); }
    function onResize() { measure(); update(); if (!raf) requestDraw(); }
    function onLost(e) { e.preventDefault(); lost = true; setState('lost'); update(); }
    function onRestored() { lost = false; try { init(); update(); requestDraw(); } catch (err) { fallback(err); } }

    function placeLayer() { canvas.classList.toggle('is-over', !!M.over); }
    inst.setMode = function (m) {
      if (!MODES[m] || m === mode) return;
      mode = m; M = MODES[m]; dirty = true; placeLayer();
      if (m !== 'app') lastMove = -1e9;
      update(); wake();
    };
    inst.mode = function () { return mode; };
    var tintHex = '';
    inst.setTint = function (c) {
      if (c === tintHex) return;            // called on every app re-render: only a real change counts
      tintHex = c; tintT = hex(c);
      if (raf) return;
      if (canRun()) { canvas.setAttribute('data-anim', 'on'); last = 0; raf = requestAnimationFrame(loop); } else requestDraw();
    };
    // x, y in viewport CSS px; strength ~0.4 (tap) .. 1.6 (heavy drop)
    inst.clap = function (x, y, strength) {
      if (!gl || mq.matches) return;
      claps[clapI] = [x / cssW, y / cssH, 0, strength == null ? 1 : strength];
      clapI = (clapI + 1) % 3;
      wake();
    };
    inst.poke = wake;
    // a viewport rect (CSS px: left, top, right, bottom) the sign-in dimming spares (text)
    inst.setProtect = function (r) { prot = r ? [r.left, r.top, r.right, r.bottom] : [-9, -9, -9, -9]; if (!raf) requestDraw(); };
    inst.quality = function () { return q; };
    inst.stats = function () { return { frames: stats.frames, jsMs: stats.js, drawMs: stats.draw, q: q }; };
    inst.running = function () { return !!raf; };
    inst.destroy = function () {
      dead = true; update(); if (pending) cancelAnimationFrame(pending);
      removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      removeEventListener('keydown', wake); removeEventListener('pointerdown', wake);
      document.removeEventListener('visibilitychange', onVis);
      if (ro) ro.disconnect();
      var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      gl = null;
    };

    try {
      var attrs = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true,
        preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !opts.allowSoftware };
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('WebGL unavailable');
      // a software rasteriser (SwiftShader, llvmpipe...) would cost more than
      // the floor is worth: keep the CSS floor instead (failIfMajor... does
      // not catch every case)
      if (!opts.allowSoftware) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        var ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(ren)) {
          var lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext();
          throw new Error('software renderer: ' + ren);
        }
      }
      init();
    } catch (err) { gl = null; fallback(err); return inst; }

    setState('init');
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', wake, { passive: true });
    addEventListener('keydown', wake, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    if (mq.addEventListener) mq.addEventListener('change', update);
    if (opts.mode) { mode = opts.mode; M = MODES[mode] || M; for (var key in cur) cur[key] = M[key]; }
    if (opts.tint) { tintT = hex(opts.tint); tint = tintT.slice(); }
    placeLayer(); measure(); onScroll(); scroll = scrollT; update();
    return inst;
  }

  window.ydxChalk = { mount: mount };
})();
