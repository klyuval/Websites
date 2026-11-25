/*!
 * PEEL CLUB · ydx soda field. One full-screen WebGL 1 canvas that turns the flat flavour field into the inside of the
 * can: sunlit caustics, 14° light shafts (the brand's rip angle), carbonation rising in three depths, a lens that
 * follows the pointer (bubbles part around it), bubble trails and burst rings on demand.
 * Raw WebGL 1, no dependencies, CSP-safe (no eval, no inline handlers, no style attributes).
 * Based on the playbook's ShaderBG reference (adaptive quality, pausing, context loss, reduced motion).
 * Simplex noise: Ian McEwan, Stefan Gustavson (Ashima Arts), MIT licence.
 *
 *   const soda = ydxSoda.mount(canvas, { field: '#0a3bd0', on: '#fff343' });
 *   soda.setColors(field, on)   soda.setIntensity(0..1)   soda.setFizz(0..1)   soda.hold(bool)
 *   soda.trail(clientX, clientY, sizePx)   soda.burst(clientX, clientY, radiusPx)   soda.lens(clientX, clientY)
 * Colours: the shader only ever mixes the field towards a lighter `hi` and a darker `lo`, both picked here so the
 * text colour (`on`) keeps at least 4.5:1 against every pixel (4.95:1 before grain) (WCAG AA for body copy), whatever the frame.
 */
(function () {
  'use strict';
  if (window.ydxSoda) return;
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
  var NT = 16, NB = 4; // trail bubbles, burst rings
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes,uPtr; uniform float uPtrA,uTime,uRise,uOff,uInt,uFizz,uS,uLite,uNT,uNB;',
    'uniform vec3 uField,uHi,uLo;',
    'uniform vec4 uTrail[' + NT + ']; uniform vec4 uBurst[' + NB + '];',
    NOISE,
    'float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z);}', // sine-free hash (cheaper)
    // a ring of outer radius r and width w, antialiased over aa
    'float ring(float d,float r,float w,float aa){return smoothstep(r+aa,r,d)*smoothstep(r-w-aa,r-w,d);}',
    // one depth of carbonation: one bubble (or none) per cell, wobbling as it rises; rim + specular dot + faint body
    'float layer(vec2 p,float sc,float dens,float seed,float px){',
    ' vec2 q=p*sc; vec2 id=floor(q); vec2 f=fract(q)-.5;',
    ' float h=hash(id+seed),h2=hash(id+seed+3.1),h3=hash(id+seed+7.7);',
    ' if(h>dens) return 0.;',
    ' float r=.08+.17*h2;',
    ' f.x+=sin(uTime*(1.1+h3)+h*30.)*(.36-r);',
    ' f.y+=(h3-.5)*(.6-2.*r);',
    ' float d=length(f), a=px*sc;',
    ' float rim=ring(d,r,max(a*1.5,r*.2),a);',
    ' float spec=smoothstep(r*.28+a,r*.28,length(f-vec2(-.4,.4)*r));',
    ' return clamp(rim+spec*.9+smoothstep(r+a,r,d)*.1,0.,1.);',
    '}',
    // fake caustics: two ridged-noise webs, min() makes the bright net (playbook technique 5), lightly domain-warped
    'float caustic(vec2 c,float t){',
    ' float w=snoise(vec3(c*.55,t*.07)); c+=vec2(w,-w)*.35;',
    ' float a=pow(1.-abs(snoise(vec3(c*1.4,t*.32))),5.);',
    ' float b=pow(1.-abs(snoise(vec3(c*1.4+7.3,t*.27+4.))),5.);',
    ' return min(a,b)*2.+max(a,b)*.22;',
    '}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float m=min(uRes.x,uRes.y), px=1./m;',
    ' vec2 uv=fc/uRes;',
    ' vec2 pw=(fc-vec2(0.,uOff))/m;',                                   // field space (scrolls at 35% of the page)
    ' vec2 dl=(fc-uPtr)/m; float gL=exp(-dot(dl,dl)*7.)*uPtrA;',        // pointer lens
    ' vec2 dir=dl/(length(dl)+1e-4);',
    // burst rings (and the refraction kick they give the caustics)
    ' float br=0.; vec2 kick=vec2(0.);',
    ' for(int i=0;i<' + NB + ';i++){',
    '  if(float(i)>=uNB) break;',
    '  vec4 v=uBurst[i]; float age=uTime-v.z; if(age<0.||age>1.2) continue;',
    '  float k=1.-pow(1.-age/1.2,3.); float R=k*v.w*uS; vec2 bd=fc-vec2(v.x,v.y+uOff); float d=length(bd); float a=1.-age/1.2;',
    '  br=max(br,ring(d,R,(8.+26.*(1.-k))*uS,1.5)*a);',
    '  float e=(d-R)/(70.*uS); kick+=bd/(d+1e-3)*exp(-e*e)*.09*a;',
    ' }',
    // caustics: a deeper layer (60% of the field parallax), magnified around the pointer
    ' vec2 c=(fc-vec2(0.,uOff*.6))/m*1.15 - dir*gL*.22 - kick;',
    ' float ca=caustic(c,uTime*(1.+uFizz*.8));',
    ' float light=smoothstep(-.15,1.05,uv.y);',                          // sunlit from the surface (top)
    ' float xr=uv.x*uRes.x/uRes.y*.9703+uv.y*.2419;',                   // 14 deg shafts: cos/sin(14deg)
    ' float sh=.5+.5*sin(xr*6.5+uTime*.22+sin(xr*2.9-uTime*.15)*1.7); sh=sh*sh*sh;',
    ' float depth=(1.-uv.y)*(1.-uv.y);',
    ' vec3 col=mix(uField,uLo,clamp(depth*.55+(1.-clamp(ca,0.,1.))*.2*uInt,0.,1.));',
    ' float lit=ca*(.35+.65*light)*.72*uInt+sh*.3*light*uInt+gL*.25;',
    ' col=mix(col,uHi,clamp(lit,0.,1.)*.85);',
    // carbonation, three depths; the pointer pushes bubbles aside (sampling towards the pointer magnifies)
    ' vec2 pb=pw-dir*gL*.07;',
    ' float fz=clamp(uFizz,0.,1.5);',
    ' float bub=layer(pb+vec2(0.,-uRise),5.,.09+.2*fz,0.,px);',
    ' bub=max(bub,layer(pb+vec2(.31,-uRise*.72),9.,.11+.24*fz,13.,px)*.85);',
    ' if(uLite<.5) bub=max(bub,layer(pb+vec2(.17,-uRise*.5),17.,.1+.2*fz,29.,px)*.6);',
    ' col=mix(col,uHi,bub*(.5+.35*uInt));',
    // bubble trail (pointer, taps): rings that rise and wobble from where they were released
    ' float tr=0.;',
    ' for(int i=0;i<' + NT + ';i++){',
    '  if(float(i)>=uNT) break;',
    '  vec4 v=uTrail[i]; float age=uTime-v.z; if(age<0.||age>2.2) continue;',
    '  vec2 pos=vec2(v.x+sin(age*3.4+v.w)*6.*uS, v.y+uOff+age*(60.+v.w*2.5)*uS);',
    '  float r=v.w*uS*(.5+.5*smoothstep(0.,.25,age)); float d=length(fc-pos);',
    '  float a=smoothstep(0.,.1,age)*(1.-smoothstep(1.3,2.2,age));',
    '  tr=max(tr,ring(d,r,max(1.6*uS,r*.22),1.2)*a);',
    ' }',
    ' col=mix(col,uHi,max(tr,br)*.95);',
    ' float g=fract(52.9829189*fract(dot(fc+mod(uTime*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(col+(g-.5)*.03,1.);',
    '}'
  ].join('\n');

  /* ---- colour: keep `on` text at >= 4.6:1 against every shade the field can take ---- */
  function hex(c) {
    c = String(c || '').trim();
    var m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { var a = m[1].split(/[ ,/]+/).map(parseFloat); return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&');
    var n = parseInt(c, 16) || 0;
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function lum(c) { var l = c.map(function (x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  // the furthest mix of `field` towards `to` (capped at `cap`) that still keeps 4.95:1 with `on` (margin for grain)
  function reach(field, to, on, cap) {
    if (contrast(mix(field, to, cap), on) >= 4.95) return mix(field, to, cap);
    var lo = 0, hi = cap;
    for (var i = 0; i < 18; i++) { var k = (lo + hi) / 2; if (contrast(mix(field, to, k), on) >= 4.95) lo = k; else hi = k; }
    return mix(field, to, lo);
  }
  // highlights lean warm (sunlight through citrus), shadows lean into the field's own hue
  function palette(field, on) {
    var f = hex(field), o = hex(on);
    return { field: f, hi: reach(f, [1, 0.97, 0.86], o, 0.55), lo: reach(f, mix(f, [0, 0, 0.02], 0.9), o, 0.5) };
  }

  function mount(canvas, opts) {
    opts = opts || {};
    var lite = !!opts.lite, maxDpr = opts.maxDpr || (lite ? 1 : 1.5);
    var mq = matchMedia('(prefers-reduced-motion: reduce)');
    var gl = null, U = {}, raf = 0, pending = 0, lost = false, dead = false, visible = !document.hidden, held = false, degraded = false;
    var t = 11.3, rise = 0, last = 0, ema = 16, slow = 0, slowMs = 0, fast = 0, q = opts.quality || 1, upgraded = false;
    var pal = palette(opts.field || '#0a3bd0', opts.on || '#fff343');
    var inten = opts.intensity == null ? 1 : opts.intensity, intenT = inten, fizzT = 0, fizz = 0, vel = 0;
    var ptr = [-1e4, -1e4], ptrT = [0.5, 0.4], ptrA = 0, ptrAT = 0, client = null, lastMove = -1e9;
    var lastY = scrollY, off = scrollY;
    var trail = new Float32Array(NT * 4), bursts = new Float32Array(NB * 4), tr = new Float32Array(NT * 4), bu = new Float32Array(NB * 4), ti = 0, bi = 0;
    for (var z = 0; z < NT; z++) trail[z * 4 + 2] = -100;
    for (z = 0; z < NB; z++) bursts[z * 4 + 2] = -100;
    var W = 0, H = 0, cssW = 1, cssH = 1, dirty = true, ro = null;
    var inst = { canvas: canvas, state: 'init' };
    try { var keep = JSON.parse(sessionStorage.getItem('ydx-soda') || 'null'); if (keep && keep.t > 0) { t = keep.t; rise = keep.r || 0; } } catch (e) {}

    function setState(s) { inst.state = s; canvas.setAttribute('data-state', s); if (opts.onState) opts.onState(s); }
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
      ['uRes', 'uPtr', 'uPtrA', 'uTime', 'uRise', 'uOff', 'uInt', 'uFizz', 'uS', 'uLite', 'uNT', 'uNB', 'uField', 'uHi', 'uLo', 'uTrail', 'uBurst']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      W = H = 0; dirty = true;
    }
    function fallback(err) {
      setState('fallback'); gl = null;
      if (err && opts.debug) console.warn('[soda] fallback:', err.message || err);
    }
    function measure() { cssW = innerWidth || 1; cssH = innerHeight || 1; dirty = true; }
    function scale() { return Math.min(devicePixelRatio || 1, maxDpr) * q; }
    function size() {
      var d = scale(), w = Math.max(1, Math.round(cssW * d)), h = Math.max(1, Math.round(cssH * d));
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, w, h); }
      dirty = false;
    }
    function draw() {
      if (!gl || lost || dead || gl.isContextLost()) return;
      if (dirty) size();
      var s = W / cssW;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform2f(U.uPtr, ptr[0] * s, (cssH - ptr[1]) * s); gl.uniform1f(U.uPtrA, ptrA);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uRise, rise); gl.uniform1f(U.uOff, off * 0.35 * s);
      gl.uniform1f(U.uInt, inten); gl.uniform1f(U.uFizz, fizz); gl.uniform1f(U.uS, s); gl.uniform1f(U.uLite, lite ? 1 : 0);
      gl.uniform3fv(U.uField, pal.field); gl.uniform3fv(U.uHi, pal.hi); gl.uniform3fv(U.uLo, pal.lo);
      // trail/burst positions are stored in css px of field space; convert to device px here
      // only live trail bubbles / bursts are sent, packed first, so the shader's loops stop early (usually at once)
      var nt = 0, nb = 0, i;
      for (i = 0; i < NT; i++) if (t - trail[i * 4 + 2] < 2.2) { tr[nt * 4] = trail[i * 4] * s; tr[nt * 4 + 1] = (cssH - trail[i * 4 + 1]) * s; tr[nt * 4 + 2] = trail[i * 4 + 2]; tr[nt * 4 + 3] = trail[i * 4 + 3]; nt++; }
      for (i = 0; i < NB; i++) if (t - bursts[i * 4 + 2] < 1.2) { bu[nb * 4] = bursts[i * 4] * s; bu[nb * 4 + 1] = (cssH - bursts[i * 4 + 1]) * s; bu[nb * 4 + 2] = bursts[i * 4 + 2]; bu[nb * 4 + 3] = bursts[i * 4 + 3]; nb++; }
      gl.uniform1f(U.uNT, nt); gl.uniform1f(U.uNB, nb);
      if (nt) gl.uniform4fv(U.uTrail, tr);
      if (nb) gl.uniform4fv(U.uBurst, bu);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (inst.state !== 'ready') setState('ready');
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      var raw = last ? now - last : 16.7, dt = Math.min(raw, 50); last = now;
      var t0 = performance.now();
      t = (t + dt / 1000) % 1e4;
      ema += (dt - ema) * 0.05; // adaptive quality from the measured frame time
      // drop the resolution step by step (faster when it is very slow); at the floor, if frames still crawl, stop
      // animating and keep a still frame: the page must never pay for the soda
      if (ema > 24 && q > 0.45) { if (++slow > 45) { q *= 0.75; slow = 0; ema = 16; dirty = true; } } else slow = 0;
      // time-based guard for a GPU that cannot keep up at all (frames of 45 ms+ add up, good frames pay it back):
      // 0.7 s of that drops straight to the floor resolution, another 0.7 s at the floor stops the loop for good
      // and leaves a still frame. Counted in time, not frames, so a 2 s frame cannot stretch it out.
      if (document.readyState === 'complete') slowMs = raw >= 45 ? slowMs + raw : Math.max(0, slowMs - raw); // page-load jank is not ours
      if (slowMs > 700 && !opts.noGuard) {
        slowMs = 0;
        if (q > 0.46) { q = 0.45; ema = 16; dirty = true; }
        else { degraded = true; inst.degraded = true; update(); return; }
      }
      if (ema < 13 && q < (opts.quality || 1) && !upgraded) { if (++fast > 240) { q = Math.min(1, q / 0.75); upgraded = true; dirty = true; } } else fast = 0;
      if (client) { ptrT = client; client = null; ptrAT = 1; }
      else if (now - lastMove > 4000) { // idle / touch: the lens drifts on its own, a sun spot wandering across the can
        ptrT = [cssW * (0.5 + 0.3 * Math.sin(t * 0.19)), cssH * (0.42 + 0.2 * Math.cos(t * 0.13))]; ptrAT = 0.55;
      }
      var k = 1 - Math.exp(-dt / 120);
      if (ptr[0] < -1e3) ptr = ptrT.slice();
      ptr[0] += (ptrT[0] - ptr[0]) * k; ptr[1] += (ptrT[1] - ptr[1]) * k; ptrA += (ptrAT - ptrA) * (1 - Math.exp(-dt / 400));
      // scroll: the field moves at 35% of the page (depth) and scroll speed makes it fizz harder
      var y = scrollY, v = Math.abs(y - lastY) / dt; lastY = y; off = y;
      vel += (v - vel) * (1 - Math.exp(-dt / (v > vel ? 80 : 600)));
      fizz += (Math.min(1.5, fizzT + Math.min(vel * 0.45, 1)) - fizz) * (1 - Math.exp(-dt / 250));
      inten += (intenT - inten) * (1 - Math.exp(-dt / 500));
      rise += dt / 1000 * (0.045 + fizz * 0.22);
      if (rise > 1000) rise -= 1000;
      draw();
      inst.cost = inst.cost == null ? 0 : inst.cost + (performance.now() - t0 - inst.cost) * 0.05; // JS ms per frame (EMA)
    }
    function requestDraw() { if (!raf && !pending) pending = requestAnimationFrame(function () { pending = 0; if (mq.matches) { off = scrollY; } draw(); }); }
    function update() {
      var run = gl && !lost && !dead && visible && !held && !degraded && !mq.matches;
      canvas.setAttribute('data-anim', run ? 'on' : 'off');
      if (run && !raf) { last = 0; lastY = scrollY; raf = requestAnimationFrame(loop); }
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!run && gl && !lost && !dead && !held) requestDraw(); // keep a correct still frame
    }
    function onMove(e) { client = [e.clientX, e.clientY]; lastMove = performance.now(); }
    function onTouch(e) { var p = e.touches && e.touches[0]; if (p) { client = [p.clientX, p.clientY]; lastMove = performance.now(); } }
    function onVis() { visible = !document.hidden; update(); }
    function onResize() { measure(); update(); }
    function onLost(e) { e.preventDefault(); lost = true; setState('lost'); update(); }
    function onRestored() { lost = false; try { init(); update(); requestDraw(); } catch (err) { fallback(err); } }
    function onHide() { try { sessionStorage.setItem('ydx-soda', JSON.stringify({ t: t, r: rise })); } catch (e) {} }

    inst.setColors = function (field, on) { pal = palette(field, on); requestDraw(); };
    inst.setIntensity = function (v) { if (Math.abs(v - intenT) < 1e-3) return; intenT = v; if (!raf && !degraded) { inten = v; requestDraw(); } };
    inst.setFizz = function (v) { fizzT = v; };
    inst.lens = function (x, y) { client = [x, y]; lastMove = performance.now(); };
    inst.trail = function (x, y, size) {
      if (mq.matches || !gl) return;
      var i = ti++ % NT; trail[i * 4] = x; trail[i * 4 + 1] = y + off * 0.35; trail[i * 4 + 2] = t; trail[i * 4 + 3] = size || 10;
    };
    inst.burst = function (x, y, radius) {
      if (mq.matches || !gl) return;
      var i = bi++ % NB; bursts[i * 4] = x; bursts[i * 4 + 1] = y + off * 0.35; bursts[i * 4 + 2] = t; bursts[i * 4 + 3] = radius || 260;
    };
    inst.hold = function (h) { if (held !== !!h) { held = !!h; update(); } };
    inst.quality = function () { return q; };
    inst.running = function () { return !!raf; };
    inst.destroy = function () {
      dead = true; update(); if (pending) cancelAnimationFrame(pending);
      removeEventListener('pointermove', onMove); removeEventListener('touchmove', onTouch); removeEventListener('resize', onResize);
      removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onVis);
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      if (ro) ro.disconnect();
      var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      gl = null;
    };

    try {
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !opts.allowSoftware };
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('WebGL unavailable');
      // a software rasteriser (SwiftShader, llvmpipe...) draws this on the CPU and stalls the page: keep the CSS field
      var dbg = !opts.allowSoftware && gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')) {
        var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
        throw new Error('software renderer');
      }
      init();
    } catch (err) { fallback(err); return inst; }

    setState('init');
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('touchmove', onTouch, { passive: true });
    addEventListener('resize', onResize, { passive: true });
    addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    if (mq.addEventListener) mq.addEventListener('change', update);
    if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(canvas); }
    measure(); update();
    return inst;
  }

  window.ydxSoda = { mount: mount, palette: palette, contrast: contrast };
})();
