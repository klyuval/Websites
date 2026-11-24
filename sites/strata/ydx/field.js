/* ==========================================================================
   STRATA: ydx "slicer field" (round 5). Vanilla JS + raw WebGL 1, no deps.
   The flat section colours become a live slicer preview of the build plate:
   - every section field is painted by ONE WebGL canvas behind the page, in the
     exact section colour, overlaid with that section's infill toolpaths
     (gyroid, honeycomb, grid, topographic slices, resin layer lines, nylon
     powder), printed with layer stripes like the site's "printed" type;
   - the slice Z drifts on its own and scrubs with scroll speed (the gyroid
     morphs as you move through the build; the Z readout follows the page);
   - the pointer is the hot nozzle: it magnifies the infill under it, outlines
     the toolpaths in the section's accent and extrudes a filament trail that
     stays on the plate and cools (touch drags do the same);
   - a new filament or material colour rises in 9 layers, like the site's own
     .field-rise, and the material tabs switch the infill (PLA gyroid, PETG
     honeycomb, resin layer lines, nylon powder).
   Loaded by enhance.js after the loader has gone. Fallbacks: no WebGL, reduced
   motion, enhance.css missing or anything throwing = the site's own flat colours
   (html.ydx-gl is only set once a real frame has been drawn).
   The canvas is position:absolute in document coordinates (with overscan) rather
   than fixed, so compositor-thread scrolling on phones can never slide a section
   edge out of register with the colour painted behind it.
   ========================================================================== */
(() => {
  'use strict';
  if (window.__ydxField) return;
  const d = document, html = d.documentElement;
  const mq = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  if (mq('(prefers-reduced-motion: reduce)')) return;
  let inFrame = false;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  const COARSE = mq('(pointer: coarse)');
  const LOW = inFrame || COARSE || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2 ||
    !!(navigator.connection && navigator.connection.saveData);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HQ = /[?&]ydxhq\b/.test(location.search);   // testing only: keep full resolution (software GL is slow)

  /* ------------------------------------------------------------------ */
  /* Shaders                                                             */
  /* ------------------------------------------------------------------ */
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragSrc = (deriv) => [
    deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1' : '',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes; uniform float uScale, uTop, uViewTop, uVh, uTime, uZ, uIntro, uLife, uTrail, uPat;',
    'uniform vec3 uPtr;',                       // doc css px x, y, presence 0..1
    'uniform vec4 uB[4];',                      // band: top, bottom (doc css px), rise 0..1, intensity
    'uniform vec4 uK[4];',                      // band: kind from, kind to, -, -
    'uniform vec3 uCa[4]; uniform vec3 uCb[4]; uniform vec3 uPop[4];',
    'uniform vec3 uT[32];',                     // filament trail: doc x, doc y, age (s)
    'const vec3 INK=vec3(.0902,.0824,.1098); const vec3 BONE=vec3(.9569,.9373,.8863); const vec3 PAPER=vec3(.9373,.9137,.8549);',
    // 2D simplex (Ashima Arts, MIT)
    'vec3 perm(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);',
    ' vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;',
    ' vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;',
    ' m*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    // Each infill returns the distance (css px) from q to the nearest toolpath centre line; w = half wall width.
    'float gyroid(vec2 q,float z,float cell){float s=6.2831853/cell;z+=.19*sin(4.*z);vec3 p=vec3(q*s,z);',
    ' float g=sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x);return abs(g)/(1.25*s);}',
    'float honey(vec2 q,float z,float cell){vec2 p=q/cell+vec2(0.,z*.06);const vec2 s=vec2(1.,1.7320508);',
    ' vec4 hc=floor(vec4(p,p-vec2(.5,1.))/s.xyxy)+.5;vec4 h=vec4(p-hc.xy*s,p-(hc.zw+.5)*s);',
    ' vec2 g=dot(h.xy,h.xy)<dot(h.zw,h.zw)?h.xy:h.zw;g=abs(g);return abs(.5-max(dot(g,vec2(.5,.8660254)),g.x))*cell;}',
    'float grid(vec2 q,float z,float cell){vec2 r=vec2(q.x+q.y,q.x-q.y)*.70710678/cell+vec2(z*.05,-z*.05);',
    ' vec2 f=abs(fract(r)-.5);return (.5-max(f.x,f.y))*cell;}',
    'float topo(vec2 q,float z){float h=sn(q*.0016+vec2(z*.11,-z*.07))+.45*sn(q*.0041-vec2(z*.05,z*.09));float f=h*4.5;',
    ' float k=abs(fract(f)-.5);',
    '#ifdef DERIV',
    ' return (.5-k)/max(fwidth(f)*uScale,.0008);',
    '#else',
    ' return (.5-k)*48.;',
    '#endif',
    '}',
    'float lines(vec2 q,float cell){return (.5-abs(fract(q.y/cell)-.5))*cell;}',
    'float powder(vec2 q,float z){vec2 g=q/9.;vec2 id=floor(g);vec2 f=fract(g)-.5;float h=hash(id);',
    ' f+=vec2(hash(id+3.1),hash(id+7.7))*.5-.25;float dens=.5+.5*sn(id*.06+vec2(z*.08,0.));',
    ' return length(f)*9.+(1.-step(.45-dens*.35,h))*99.;}',
    'float infill(float k,vec2 q,float z,out float w){',
    ' if(k<.5){w=5.5;return gyroid(q,z,250.);}',
    ' if(k<1.5){w=2.4;return honey(q,z,64.);}',
    ' if(k<2.5){w=1.25;return topo(q,z);}',
    ' if(k<3.5){w=2.2;return grid(q,z,58.);}',
    ' if(k<4.5){w=.9;return lines(q,6.);}',
    ' w=1.7;return powder(q,z);}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy;',
    ' vec2 P=vec2(fc.x/uScale,uTop+(uRes.y-fc.y)/uScale);',            // document css px
    ' vec4 B=vec4(-1e6,1e6,1.,.07);vec4 K=vec4(4.);vec3 ca=PAPER,cb=PAPER,pop=vec3(.29,.172,.94);',
    ' for(int i=0;i<4;i++){if(P.y>=uB[i].x&&P.y<uB[i].y){B=uB[i];K=uK[i];ca=uCa[i];cb=uCb[i];pop=uPop[i];}}',
    // a new colour/material rises from the bottom of the section in 9 layers, like the site's .field-rise
    ' float st=floor(B.z*9.+.0001)/9.;float front=B.y-st*(B.y-B.x);float nw=step(front,P.y);',
    ' vec3 base=mix(ca,cb,nw);float kind=mix(K.x,K.y,nw);',
    ' float lum=dot(base,vec3(.2126,.7152,.0722));bool light=lum>.36;vec3 tgt=light?INK:BONE;',
    // nozzle lens: the field swells and magnifies under the pointer
    ' vec2 dp=P-uPtr.xy;float R=light?210.:180.;float lens=exp(-dot(dp,dp)/(R*R))*uPtr.z;',
    ' float t=uTime;vec2 q=P+16.*vec2(sn(P*.0032+vec2(t*.045,0.)),sn(P*.0032+vec2(7.3,-t*.04)));',
    ' q-=dp*lens*.3;',
    ' float w;float dd=infill(kind,q/uPat,uZ,w)*uPat;float thin=step(1.5,w);w*=1.+lens*.75*thin;',
    ' float aa=.8/max(uScale,.5);',
    ' float wall=1.-smoothstep(w-aa,w+aa,dd);',
    ' float edge=1.-smoothstep(.0,aa*1.6,abs(dd-w));',
    ' float stripe=mix(.55,1.,step(.34,fract(P.y/4.)));',            // printed layer lines inside the walls
    ' float A=B.w*(1.+lens*(light?1.6:1.)*thin);',
    // first appearance: the toolpaths print in from the bottom of the viewport, layer by layer
    ' float vy=P.y-uViewTop;float ifr=uVh*(1.-floor(uIntro*24.)/24.);float shown=step(ifr,vy);',
    ' vec3 col=mix(base,tgt,wall*A*stripe*shown);',
    ' col=mix(col,pop,edge*lens*.75*shown*thin);',
    ' float hot=(1.-smoothstep(0.,2.5,abs(vy-ifr)))*step(.001,uIntro)*step(uIntro,.999);',
    ' float rl=(1.-smoothstep(0.,2.5,abs(P.y-front)))*step(.001,B.z)*step(B.z,.999);',
    ' col=mix(col,pop,max(hot,rl)*.9);',
    // filament trail: extruded under the nozzle, stays on the plate, cools and fades
    ' if(uTrail>.5){float best=1e5;float age=99.;',
    '  for(int i=0;i<31;i++){vec3 a=uT[i];vec3 b=uT[i+1];if(a.z<uLife&&b.z<uLife){',
    '   vec2 pa=P-a.xy,ba=b.xy-a.xy;float h=clamp(dot(pa,ba)/max(dot(ba,ba),.001),0.,1.);float dl=length(pa-ba*h);',
    '   if(dl<best){best=dl;age=mix(a.z,b.z,h);}}}',
    '  float life=clamp(age/uLife,0.,1.);float fw=3.4*(1.-life*.5);',
    '  float fil=(1.-smoothstep(fw-aa,fw+aa,best))*(1.-smoothstep(.45,1.,life));',
    '  float r=clamp(best/fw,0.,1.);float tube=sqrt(1.-r*r);',
    '  vec3 fcol=pop*(.62+.38*tube)+vec3(.35)*pow(tube,8.)*(light?.5:.8);',
    '  fcol=mix(fcol,vec3(1.,.42,.1),(1.-smoothstep(0.,.18,life))*.7);',   // hot orange at the nozzle
    '  col=mix(col,fcol,fil);}',
    ' gl_FragColor=vec4(col,1.);',
    '}',
  ].join('\n');

  function softGL(g) {
    try {
      let r = String(g.getParameter(g.RENDERER) || '');
      if (/^webkit webgl$/i.test(r)) {   // masked (Chromium, Safari): ask the debug extension
        const e = g.getExtension('WEBGL_debug_renderer_info');
        if (e) r = String(g.getParameter(e.UNMASKED_RENDERER_WEBGL) || '');
      }
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ */
  /* Setup                                                               */
  /* ------------------------------------------------------------------ */
  const root = d.getElementById('root');
  if (!root || !root.querySelector('.site')) return;
  const $ = (s) => root.querySelector(s);
  const hex = (c) => {
    c = String(c || '').trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
    m = c.match(/[\d.]+/g);
    if (m && m.length >= 3) return [m[0] / 255, m[1] / 255, m[2] / 255];
    return null;
  };
  const cssBg = (el) => { const c = getComputedStyle(el).backgroundColor; const m = c.match(/[\d.]+/g); return m && (m[3] === undefined || +m[3] > .5) ? hex(c) : null; };
  const popOf = (el) => hex(getComputedStyle(el).getPropertyValue('--pop')) || [74 / 255, 44 / 255, 240 / 255];

  // Kinds: 0 gyroid, 1 honeycomb, 2 topographic slices, 3 grid, 4 resin layer lines, 5 nylon powder
  const MAT_KIND = [0, 1, 4, 5];
  const SPEC = [
    { sel: '.hero', v: '--field', kind: 0, amt: [0.07, 0.085] },
    { sel: '#work', kind: 1, amt: [0.065, 0.1] },
    { sel: '#materials', v: '--bg', kind: 0, mat: true, amt: [0.075, 0.1] },
    { sel: '#process', kind: 2, amt: [0.08, 0.1] },
    { sel: '.brief-banner', kind: 3, amt: [0.07, 0.085] },
    { sel: '.brief-body', kind: 4, amt: [0.05, 0.07] },
    { sel: '.faq', kind: 1, amt: [0.065, 0.1] },
    { sel: '.footer', kind: 0, amt: [0.08, 0.1] },
  ];
  const bands = [];
  for (const s of SPEC) {
    const el = $(s.sel);
    if (!el) continue;
    // Live colours (filament, material) come from the section's own inline custom property, which React
    // keeps on the same node; the .field-rise element itself is remounted on every change.
    const liveCol = () => hex(el.style.getPropertyValue(s.v));
    const col = (s.v && liveCol()) || cssBg(el);
    if (!col) continue;
    bands.push({ s, el, live: s.v ? liveCol : null, top: 0, bot: 0, ca: col, cb: col, rise: 1, t0: 0, last: s.v ? el.style.getPropertyValue(s.v) : '',
      kFrom: s.kind, kTo: s.kind, pop: popOf(el), amt: 0 });
  }
  if (bands.length < 4) return;

  // Canvas: absolute, document coordinates, inside a wrapper that clips it to the page height.
  const wrap = d.createElement('div');
  wrap.id = 'ydx-field';
  wrap.setAttribute('aria-hidden', 'true');
  const cv = d.createElement('canvas');
  wrap.appendChild(cv);
  const ws = wrap.style, cs = cv.style;
  ws.position = 'absolute'; ws.left = '0'; ws.top = '0'; ws.width = '100%'; ws.height = '0'; ws.overflow = 'hidden';
  ws.zIndex = '-1'; ws.pointerEvents = 'none'; ws.contain = 'strict';
  cs.position = 'absolute'; cs.left = '0'; cs.top = '0'; cs.width = '100%'; cs.display = 'block'; cs.willChange = 'transform';

  let gl = null;
  try {
    // A decorative full-screen shader is not worth running on a software rasteriser (blocklisted GPU):
    // those machines keep the site's flat colours. (?ydxhq lets the headless test browser through.)
    const o = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !HQ };
    gl = cv.getContext('webgl', o) || cv.getContext('experimental-webgl', o);
  } catch (e) { gl = null; }
  // Software rasterisers (SwiftShader, llvmpipe: blocklisted GPUs, VMs, headless browsers) are skipped too,
  // where failIfMajorPerformanceCaveat does not catch them.
  if (gl && !HQ && softGL(gl)) {
    try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* ignore */ }
    gl = null;
  }
  if (!gl) { html.classList.add('ydx-nogl'); return; }

  const deriv = !!gl.getExtension('OES_standard_derivatives');
  const par = gl.getExtension('KHR_parallel_shader_compile');
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, fragSrc(deriv));
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);

  const U = {};
  let OV = 0.2, scale = 1, q = LOW && !HQ ? 0.72 : 1, W = 0, H = 0, vw = 0, vh = 0, docH = 0;
  const maxS = LOW ? 1 : 1.25;
  let raf = 0, ema = 16, slow = 0, on = false, dead = false, shown = false;
  let tm = 7.3, z = 0.8, intro = 0, introT0 = 0;
  // pointer (lens) and trail
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, cx: -1, cy: -1, amt: 0, tAmt: 0, at: -1e9, touch: false };
  const TR = 32, LIFE = HQ && /ydxlife/.test(location.search) ? 30 : 1.5;
  const trail = [];
  let lastTrail = 0;
  const TRAIL_ON = !inFrame;
  let sY = scrollY, vel = 0, lastInput = performance.now();

  function ready() {
    if (par && !gl.getProgramParameter(prog, 0x91B1 /* COMPLETION_STATUS_KHR */)) return false;
    return true;
  }
  function link() {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uPat', 'uScale', 'uTop', 'uViewTop', 'uVh', 'uTime', 'uZ', 'uIntro', 'uLife', 'uTrail', 'uPtr', 'uB', 'uK', 'uCa', 'uCb', 'uPop', 'uT']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]'); });
    return true;
  }

  function measure() {
    vw = html.clientWidth || innerWidth;
    vh = innerHeight;
    docH = Math.max(html.scrollHeight, d.body.scrollHeight);
    ws.height = docH + 'px';
    for (const b of bands) {
      const r = b.el.getBoundingClientRect();
      b.top = r.top + scrollY; b.bot = r.bottom + scrollY;
      b.pop = popOf(b.el);
    }
    const hCss = Math.ceil(vh * (1 + 2 * OV));
    const s = Math.min(devicePixelRatio || 1, maxS) * q;
    const nw = Math.max(1, Math.round(vw * s)), nh = Math.max(1, Math.round(hCss * s));
    if (nw !== W || nh !== H || s !== scale) {
      W = nw; H = nh; scale = s;
      cv.width = W; cv.height = H;
      cs.height = hCss + 'px';
    }
  }

  // Colour of the section field at a viewport y (for the Z readout's ink/bone choice).
  function colorAt(clientY) {
    const y = clientY + scrollY;
    for (const b of bands) if (y >= b.top && y < b.bot) return b.rise >= 1 ? b.cb : (y > b.bot - b.rise * (b.bot - b.top) ? b.cb : b.ca);
    return null;
  }

  function syncLive(now) {
    for (const b of bands) {
      if (b.live) {
        const c = b.el.style.getPropertyValue(b.s.v);
        if (c && c !== b.last) {
          const n = b.live();
          if (n) {
            b.ca = b.rise >= 1 ? b.cb : b.ca;
            b.cb = n; b.t0 = now; b.rise = 0; b.kFrom = b.kTo;
            b.pop = popOf(b.el);
          }
          b.last = c;
        }
      }
      if (b.s.mat) {
        const sel = root.querySelector('.mat-tabs [aria-selected="true"]');
        const i = sel ? +(/(\d+)$/.exec(sel.id) || [0, 0])[1] : 0;
        const k = MAT_KIND[i] == null ? 0 : MAT_KIND[i];
        if (k !== b.kTo) { b.kFrom = b.rise >= 1 ? b.kTo : b.kFrom; b.kTo = k; if (b.rise >= 1) { b.ca = b.cb; b.t0 = now; b.rise = 0; } }
      }
      if (b.rise < 1) b.rise = clamp((now - b.t0) / 520, 0, 1);
      if (b.rise >= 1) { b.ca = b.cb; b.kFrom = b.kTo; }
      const light = (0.2126 * b.cb[0] + 0.7152 * b.cb[1] + 0.0722 * b.cb[2]) > 0.36;
      b.amt = b.s.amt[light ? 0 : 1];
    }
  }

  const bArr = new Float32Array(16), kArr = new Float32Array(16), caArr = new Float32Array(12), cbArr = new Float32Array(12),
    popArr = new Float32Array(12), tArr = new Float32Array(TR * 3);

  function draw(now, dt) {
    const y = scrollY;
    // canvas follows the viewport with overscan, clamped to the page
    const ty = clamp(Math.round(y - vh * OV), 0, Math.max(0, docH - H / scale));
    cs.transform = `translate3d(0,${ty}px,0)`;
    syncLive(now);

    // smoothed scroll velocity scrubs the slice Z
    const dy = y - sY; sY = y;
    vel += (dy - vel) * (1 - Math.exp(-dt / 90));
    tm = (tm + dt / 1000) % 1000;
    z += dt / 1000 * 0.06 + Math.min(Math.abs(vel), 80) * 0.0035;
    if (z > 6283.2) z -= 6283.2;

    // pointer lens: eases to the pointer, fades after inactivity
    if (ptr.cx >= 0) { ptr.tx = ptr.cx; ptr.ty = ptr.cy + y; }
    const k = 1 - Math.exp(-dt / 70);
    if (ptr.x < -1e3) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
    const idle = now - ptr.at;
    ptr.tAmt = ptr.cx < 0 || idle > (ptr.touch ? 900 : 2600) ? 0 : 1;
    ptr.amt += (ptr.tAmt - ptr.amt) * (1 - Math.exp(-dt / (ptr.tAmt ? 140 : 420)));

    // bands overlapping the canvas, max 4
    const cTop = ty, cBot = ty + H / scale;
    let n = 0;
    bArr.fill(0); kArr.fill(0);
    for (let i = 0; i < 16; i += 4) { bArr[i] = -2e6; bArr[i + 1] = -2e6 + 1; }
    for (const b of bands) {
      if (n >= 4 || b.bot < cTop || b.top > cBot) continue;
      bArr.set([b.top, b.bot, b.rise >= 1 ? 0 : b.rise, b.amt], n * 4);
      kArr.set([b.kFrom, b.kTo, 0, 0], n * 4);
      caArr.set(b.ca, n * 3); cbArr.set(b.cb, n * 3); popArr.set(b.pop, n * 3);
      n++;
    }
    // trail ages
    let any = 0;
    for (let i = 0; i < TR; i++) {
      const p = trail[i];
      const age = p ? (now - p.t) / 1000 : 99;
      tArr[i * 3] = p ? p.x : 0; tArr[i * 3 + 1] = p ? p.y : 0; tArr[i * 3 + 2] = age;
      if (age < LIFE) any = 1;
    }
    if (intro < 1) intro = clamp((now - introT0) / 1150, 0, 1);

    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uScale, scale);
    gl.uniform1f(U.uPat, clamp(vw / 1440, 0.62, 1));
    gl.uniform1f(U.uTop, ty);
    gl.uniform1f(U.uViewTop, y);
    gl.uniform1f(U.uVh, vh);
    gl.uniform1f(U.uTime, tm);
    gl.uniform1f(U.uZ, z);
    gl.uniform1f(U.uIntro, intro);
    gl.uniform1f(U.uLife, LIFE);
    gl.uniform1f(U.uTrail, any);
    gl.uniform3f(U.uPtr, ptr.x, ptr.y, ptr.amt);
    gl.uniform4fv(U.uB, bArr);
    gl.uniform4fv(U.uK, kArr);
    gl.uniform3fv(U.uCa, caArr);
    gl.uniform3fv(U.uCb, cbArr);
    gl.uniform3fv(U.uPop, popArr);
    gl.uniform3fv(U.uT, tArr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return any || ptr.amt > 0.01 || Math.abs(vel) > 0.2 || intro < 1 || bands.some((b) => b.rise < 1);
  }

  // Covered by something opaque: a modal sheet or the open mobile menu. Pause.
  const covered = () => !!(d.querySelector('dialog[open]') || d.querySelector('.nav.open'));
  let lastDraw = 0, costSum = 0, costN = 0;
  function frame(now) {
    raf = 0;
    if (dead || !on || d.hidden) return;
    if (covered()) { lastDraw = 0; raf = requestAnimationFrame(frame); return; }
    // When nothing is moving the field only drifts: ~30fps is plenty (half the GPU and battery). The hub
    // preview (iframe) always runs at ~30fps.
    const busy = now - lastInput < 1500;
    const gap = lastDraw ? now - lastDraw : 16;
    if ((inFrame || (!busy && shown)) && gap < 28) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(50, gap);
    lastDraw = now;
    const t0 = performance.now();
    let active = false;
    try { active = draw(now, dt); } catch (e) { kill(); return; }
    if (!shown) {
      // The first real frame is on screen in this same frame: swap the flat section colours for the canvas.
      if (gl.isContextLost()) { kill(); return; }
      shown = true;
      html.classList.add('ydx-gl');
    }
    if (active) lastInput = Math.max(lastInput, now - 1400);
    // Adaptive quality: while things move, a sustained frame interval over ~24ms (or our own JS over 6ms)
    // drops the resolution one step at a time (never back up, so it cannot oscillate).
    const cost = performance.now() - t0;
    costSum += cost; costN++;
    if (busy && !HQ) {
      ema = ema * 0.92 + Math.max(dt, cost * 4) * 0.08;
      if (ema > 24 && q > 0.5) { if (++slow > 45) { slow = 0; ema = 16; q = Math.max(0.5, q * 0.8); measure(); } } else slow = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && on && !dead) raf = requestAnimationFrame(frame); }

  function kill() {
    dead = true; on = false;
    if (raf) cancelAnimationFrame(raf);
    html.classList.remove('ydx-gl');
    wrap.remove();
    window.__ydxField = null;
  }

  // Input ------------------------------------------------------------
  function addTrail(x, y, now) {
    if (!TRAIL_ON) return;
    const p = trail[0];
    if (p && Math.hypot(p.x - x, p.y - y) < 10 && now - lastTrail < 80) return;
    if (p && now - p.t > (LIFE > 2 ? 1e9 : 300)) trail.length = 0;   // a new stroke: do not join it to the old one
    trail.unshift({ x, y, t: now });
    if (trail.length > TR) trail.length = TR;
    lastTrail = now;
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const now = performance.now();
    ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.at = now; ptr.touch = false;
    lastInput = now;
    addTrail(e.clientX, e.clientY + scrollY, now);
    start();
  }, { passive: true });
  const onTouch = (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    const now = performance.now();
    ptr.cx = t.clientX; ptr.cy = t.clientY; ptr.at = now; ptr.touch = true;
    lastInput = now;
    addTrail(t.clientX, t.clientY + scrollY, now);
    start();
  };
  addEventListener('touchstart', onTouch, { passive: true });
  addEventListener('touchmove', onTouch, { passive: true });
  html.addEventListener('pointerleave', () => { ptr.cx = -1; });
  addEventListener('scroll', () => { lastInput = performance.now(); start(); }, { passive: true });
  d.addEventListener('visibilitychange', () => { if (!d.hidden) start(); });
  addEventListener('pageshow', (e) => { if (e.persisted) start(); });

  let mTimer = 0;
  const remeasure = () => { clearTimeout(mTimer); mTimer = setTimeout(() => { try { measure(); start(); } catch (e) { kill(); } }, 60); };
  addEventListener('resize', remeasure, { passive: true });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(remeasure);
    ro.observe(d.body);
    bands.forEach((b) => ro.observe(b.el));
  }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(remeasure, () => {});

  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); kill(); });

  window.__ydxField = { colorAt, kill };
  if (HQ) window.__ydxField._s = () => ({ jsMs: costSum / Math.max(1, costN), draws: costN, trail: trail.length, ptr: { ...ptr }, q, scale, W, H, on, shown, z, intro });

  // Wait for the (possibly parallel) shader compile without blocking the main thread.
  let waited = 0;
  (function boot() {
    if (dead) return;
    try {
      if (!ready() && waited++ < 120) { setTimeout(boot, 50); return; }
      if (!link()) { kill(); return; }
      d.body.appendChild(wrap);
      measure();
      introT0 = performance.now() + 120;
      on = true;
      start();
    } catch (e) { kill(); }
  })();
})();
