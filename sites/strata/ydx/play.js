/* ==========================================================================
   STRATA playground (/play/): "Print your name" (round 5, ydx layer)
   Vanilla JS + raw WebGL 1, no dependencies.
   - The name is rasterised (Gabarito 900) into a mask texture: R = glyphs,
     G = glyphs eroded by a few px (the interior, where infill goes).
   - The print is a stack of N layer quads (one draw call). The fragment shader
     discards what is not printed yet (the nozzle sweeps each layer, boustrophedon),
     cuts the infill (gyroid / honeycomb / grid / solid) out of the interior so you
     can see down into it, and shades visible layer edges as stepped side walls.
   - Material = process: PLA/PETG print with the site's print head (FDM), resin
     cures whole layers under a UV flash (SLA), nylon is sintered by a laser dot (SLS).
   - Drag (or arrow keys) to orbit, "Layer view" to cut down through the finished
     part, "Save a snapshot" for a PNG.
   Fallbacks: no WebGL = the name printed in the site's 2D striped type; reduced
   motion = finished part at once, no sway; play.js missing = the inline failsafe
   lifts the cover and the page reads as a static explainer.
   ========================================================================== */
(() => {
  'use strict';
  window.__plRun = true;
  const d = document, html = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const EASE_MOVE = 'cubic-bezier(.7,0,.2,1)';
  const WAAPI = typeof Element.prototype.animate === 'function';
  const $ = (s) => d.querySelector(s);
  html.classList.add('pl-js');

  /* ------------------------------------------------------------------ */
  /* Cover: retract on arrival, extrude on the way back                  */
  /* ------------------------------------------------------------------ */
  const cover = $('#pl-cover');
  const bands = cover ? [...cover.querySelectorAll('i')] : [];
  const label = cover && cover.querySelector('p');
  function enter() {
    const done = () => { html.classList.add('pl-gone', 'pl-in'); };
    if (!cover || !WAAPI) { done(); return; }
    if (RM) { cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.then(done, done); html.classList.add('pl-in'); return; }
    try {
      label.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-62%)' }], { duration: 160, fill: 'forwards', easing: 'cubic-bezier(.5,0,.75,0)' });
      const n = bands.length;
      const anims = bands.map((b, i) => b.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: 300, delay: 110 + (n - 1 - i) * 18, easing: EASE_MOVE, fill: 'forwards' }));
      setTimeout(() => html.classList.add('pl-in'), 160);
      Promise.all(anims.map((a) => a.finished)).then(done, done);
      setTimeout(done, 1600);
    } catch (e) { done(); }
  }
  let entered = false;
  const go = () => { if (entered) return; entered = true; enter(); };
  // Fonts (the title) or 700ms, whichever is first; never wait for the WebGL warm-up.
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => setTimeout(go, 60), go);
  setTimeout(go, 700);

  function leave(href) {
    if (!cover || !WAAPI || RM) { location.href = href; return; }
    try {
      html.classList.remove('pl-gone');
      label.innerHTML = '<small>Layer 00</small>Studio';
      label.getAnimations().forEach((a) => a.cancel());
      label.style.opacity = '0';
      const n = bands.length;
      bands.forEach((b) => { b.getAnimations().forEach((a) => a.cancel()); b.style.transformOrigin = '0 50%'; });
      const anims = bands.map((b, i) => b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 220, delay: (n - 1 - i) * 14, easing: EASE_MOVE, fill: 'forwards' }));
      label.animate([{ opacity: 0, transform: 'translate(-50%,-30%)' }, { opacity: 1, transform: 'translate(-50%,-50%)' }],
        { duration: 180, delay: 170, fill: 'forwards' });
      let went = false;
      const nav = () => { if (!went) { went = true; location.href = href; } };
      Promise.all(anims.map((a) => a.finished)).then(() => setTimeout(nav, 90), nav);
      setTimeout(nav, 900);
    } catch (e) { location.href = href; }
  }
  d.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-pl-back]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault();
    leave(a.getAttribute('href'));
  });
  // Back/forward cache: never come back to a covered page.
  addEventListener('pageshow', (e) => {
    if (!e.persisted || !cover) return;
    bands.forEach((b) => b.getAnimations().forEach((a) => a.cancel()));
    html.classList.add('pl-gone', 'pl-in');
  });

  // Stagger index for the entrance
  d.querySelectorAll('.pl-side > *, .pl-form > *').forEach((el, i) => el.style.setProperty('--d', String(i % 14)));

  /* ------------------------------------------------------------------ */
  /* State + controls                                                    */
  /* ------------------------------------------------------------------ */
  const MATS = [
    { name: 'PLA', col: '#c4f051', proc: 0, spec: 'FDM', heat: 'Nozzle 210°C' },
    { name: 'PETG', col: '#eb9b60', proc: 0, spec: 'FDM', heat: 'Nozzle 240°C' },
    { name: 'RESIN', col: '#b8b0da', proc: 1, spec: 'SLA', heat: 'UV 405 nm' },
    { name: 'NYLON', col: '#ded8c5', proc: 2, spec: 'SLS', heat: 'Laser 30 W' },
  ];
  const S = { name: 'HELLO', mat: 0, infill: 0, dens: 0.2, lh: 0.2 };
  const HEIGHT_MM = 8;
  const el = {
    name: $('#pl-name'), form: $('#pl-form'), go: $('#pl-go'), snap: $('#pl-snap'), status: $('#pl-status'),
    dens: $('#pl-dens'), densOut: $('#pl-dens-out'), file: $('#pl-file'), plate: $('#pl-plate'), cv: $('#pl-canvas'),
    head: $('#pl-head'), laser: $('#pl-laser'), layer: $('#pl-layer'), layers: $('#pl-layers'), z: $('#pl-z'),
    spec: $('#pl-spec'), proc: $('#pl-proc'), drag: $('.pl-drag'), seam: [...d.querySelectorAll('.pl-seam i')],
    inspect: $('#pl-inspect'), cut: $('#pl-cut'), cutOut: $('#pl-cut-out'),
  };
  if (!el.plate || !el.cv) return;
  const rail = d.createElement('span');
  rail.className = 'pl-rail';
  rail.setAttribute('aria-hidden', 'true');
  Object.assign(rail.style, { position: 'absolute', left: '0', top: '0', width: '200%', pointerEvents: 'none', opacity: '0',
    background: 'linear-gradient(#33313b 0 22%,#1d1b23 22% 78%,#0e0d12 78%)', willChange: 'transform', transition: 'opacity .25s linear' });
  el.plate.insertBefore(rail, el.head);
  let timeEl = $('#pl-time');

  const clean = (v) => String(v || '').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 12);
  const layersN = () => Math.max(6, Math.round(HEIGHT_MM / S.lh));

  function radio(group, attr, onPick) {
    const btns = [...d.querySelectorAll(`[${attr}]`)];
    const pick = (b, focus) => {
      btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      btns.forEach((x) => { x.tabIndex = x === b ? 0 : -1; });
      if (focus) b.focus();
      onPick(b.getAttribute(attr));
    };
    btns.forEach((b) => {
      b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
      b.addEventListener('click', () => pick(b, false));
      b.addEventListener('keydown', (e) => {
        const i = btns.indexOf(b);
        const k = e.key;
        let j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % btns.length;
        if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
        if (j >= 0) { e.preventDefault(); pick(btns[j], true); }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* WebGL                                                               */
  /* ------------------------------------------------------------------ */
  let gl = null;
  try {
    gl = el.cv.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false, powerPreference: 'default' }) ||
      el.cv.getContext('experimental-webgl', { antialias: true, alpha: false });
  } catch (e) { gl = null; }

  if (!gl) { fallback2D(); wireControls(null); return; }

  // On a software rasteriser (blocklisted GPU, VM) the playground still runs, at a lighter resolution.
  let SOFT = false;
  try {
    let r = String(gl.getParameter(gl.RENDERER) || '');
    if (/^webkit webgl$/i.test(r)) { const x = gl.getExtension('WEBGL_debug_renderer_info'); if (x) r = String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL) || ''); }
    SOFT = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
  } catch (e) { SOFT = false; }
  const deriv = !!gl.getExtension('OES_standard_derivatives');
  const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

  const PRINT_VS = `attribute vec3 aP;uniform mat4 uMVP;uniform float uLh,uDt;varying vec2 vUv;varying float vL;varying vec3 vW;
void main(){float y=(aP.z+1.)*uLh;vW=vec3(aP.x,y,aP.y);vL=aP.z;vUv=vec2(aP.x+.5,aP.y/uDt+.5);gl_Position=uMVP*vec4(vW,1.);}`;
  const PRINT_FS = PREC + `uniform sampler2D uMask;uniform float uTop,uN,uKind,uDens,uProc,uFlash,uLh;uniform vec3 uCol;
varying vec2 vUv;varying float vL;varying vec3 vW;
float hexd(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.8660254)),p.x);}
float solidAt(vec3 w,float li){
  if(uKind<.5){vec3 p=w*vec3(44.,44.*.55,44.);float g=sin(p.x)*cos(p.z)+sin(p.z)*cos(p.y)+sin(p.y)*cos(p.x);return step(abs(g),.06+uDens*1.4);}
  if(uKind<1.5){vec2 p=w.xz/.05;const vec2 s=vec2(1.,1.7320508);vec4 hc=floor(vec4(p,p-vec2(.5,1.))/s.xyxy)+.5;
    vec4 h=vec4(p-hc.xy*s,p-(hc.zw+.5)*s);vec2 g=dot(h.xy,h.xy)<dot(h.zw,h.zw)?h.xy:h.zw;return step(.5-.03-uDens*.22,hexd(g));}
  if(uKind<2.5){float a=mod(li,2.)<.5?(w.x+w.z):(w.x-w.z);float f=abs(fract(a*.70710678/.045)-.5);return step(.5-.04-uDens*.3,f);}
  return 1.;}
bool hole(float li,vec4 m){if(uKind>2.5||m.g<.5||li<2.5||li>uN-3.5)return false;return solidAt(vec3(vW.x,(li+.5)*uLh,vW.z),li)<.5;}
float xpOf(float li){return mod(li,2.)<.5?vUv.x:1.-vUv.x;}
void main(){
  vec4 m=texture2D(uMask,vUv);
  if(m.r<.5)discard;
  float full=floor(uTop+.0001);float f=uTop-full;
  if(vL>full+.5)discard;
  bool cur=abs(vL-full)<.5;
  if(cur){if(uProc>.5&&uProc<1.5)discard;if(xpOf(vL)>f)discard;}
  if(hole(vL,m))discard;
  float a=vL+1.;
  bool cov=a<full-.5||(abs(a-full)<.5&&!(uProc>.5&&uProc<1.5)&&xpOf(a)<=f);
  if(a>uN-.5)cov=false;
  if(cov&&hole(a,m))cov=false;
  vec3 c=uCol;float sh;
  if(!cov){
    float tp=.955+.045*step(.5,fract((mod(vL,2.)<.5?vW.x+vW.z:vW.x-vW.z)*160.));
    sh=tp*mix(.8,1.,smoothstep(.5,.9,m.r))*(m.g<.5?.97:1.);
  }else{
    float h=(vL+1.)/uN;sh=(.44+.2*h)*(mod(vL,2.)<.5?1.:.84);
  }
  vec3 col=c*sh;
  if(cur){float g=1.-smoothstep(0.,.018,f-xpOf(vL));col=mix(col,uProc>1.5?vec3(.85,1.,.45):vec3(1.,.45,.12),g*.85);}
  if(uFlash>0.&&abs(vL-(full-1.))<.5&&!cov)col=mix(col,vec3(.55,.45,1.),uFlash*.7);
  gl_FragColor=vec4(col,1.);
}`;
  const GHOST_FS = PREC + `uniform sampler2D uMask;uniform float uA;varying vec2 vUv;varying float vL;varying vec3 vW;
void main(){vec4 m=texture2D(uMask,vUv);float e=smoothstep(.15,.5,m.r)*(1.-smoothstep(.5,.85,m.r));float fill=step(.5,m.r)*.07;
float a=max(e*.85,fill)*uA;if(a<.01)discard;gl_FragColor=vec4(vec3(.957,.937,.886)*a,a);}`;
  const BED_VS = `attribute vec2 aP;uniform mat4 uMVP;varying vec2 vP;void main(){vP=aP;gl_Position=uMVP*vec4(aP.x,0.,aP.y,1.);}`;
  const BED_FS = (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') + PREC +
    `uniform vec2 uExt;varying vec2 vP;
float gl1(vec2 p,float s,float w){vec2 g=abs(fract(p/s-.5)-.5)*s;
#ifdef DERIV
vec2 fw=fwidth(p);return 1.-min(smoothstep(0.,fw.x*w,g.x),smoothstep(0.,fw.y*w,g.y));
#else
return 1.-min(smoothstep(0.,.002*w,g.x),smoothstep(0.,.002*w,g.y));
#endif
}
void main(){vec3 bg=vec3(.0902,.0824,.1098);vec3 bed=vec3(.125,.118,.149);
float r=length(vP/uExt);float fade=1.-smoothstep(.62,1.,r);
float minor=gl1(vP,.05,1.2)*.07,major=gl1(vP,.25,1.4)*.13;
vec3 col=mix(bg,bed+vec3(.957,.937,.886)*(minor+major),fade);
gl_FragColor=vec4(col,1.);}`;
  const LINE_VS = `attribute vec3 aP;uniform mat4 uMVP;uniform float uPs;void main(){gl_Position=uMVP*vec4(aP,1.);gl_PointSize=uPs;}`;
  const LINE_FS = PREC + `uniform vec4 uC;void main(){gl_FragColor=vec4(uC.rgb*uC.a,uC.a);}`;

  function prog(vs, fs) {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link');
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); }
    return { p, u, a: gl.getAttribLocation(p, 'aP') };
  }
  let P1, P2, P3, P4;
  try {
    P1 = prog(PRINT_VS, PRINT_FS); P2 = prog(PRINT_VS, GHOST_FS); P3 = prog(BED_VS, BED_FS); P4 = prog(LINE_VS, LINE_FS);
  } catch (e) { fallback2D(); wireControls(null); return; }

  const layerBuf = gl.createBuffer(), bedBuf = gl.createBuffer(), lineBuf = gl.createBuffer(), ghostBuf = gl.createBuffer();
  const tex = gl.createTexture();
  let Dt = 0.25, N = 40, lineCount = 0;

  /* Mask: the name, rasterised; G = eroded interior (intersection of shifted copies) */
  function makeMask(name) {
    const fs = 150;
    const font = `900 ${fs}px Gabarito, system-ui, -apple-system, "Segoe UI", sans-serif`;
    const m = d.createElement('canvas').getContext('2d');
    m.font = font;
    const mt = m.measureText(name);
    const asc = mt.actualBoundingBoxAscent || fs * 0.72, desc = mt.actualBoundingBoxDescent || 0;
    const left = mt.actualBoundingBoxLeft || 0, right = mt.actualBoundingBoxRight || mt.width;
    const pad = 22;
    let W = Math.ceil(left + right + pad * 2), H = Math.ceil(asc + desc + pad * 2);
    const k = Math.min(1, 1400 / W);
    W = Math.max(8, Math.round(W * k)); H = Math.max(8, Math.round(H * k));
    const c1 = d.createElement('canvas'); c1.width = W; c1.height = H;
    const x1 = c1.getContext('2d');
    x1.scale(k, k); x1.font = font; x1.fillStyle = '#fff'; x1.textBaseline = 'alphabetic';
    x1.fillText(name, pad + left, pad + asc);
    const c2 = d.createElement('canvas'); c2.width = W; c2.height = H;
    const x2 = c2.getContext('2d');
    x2.drawImage(c1, 0, 0);
    x2.globalCompositeOperation = 'destination-in';
    const r = 6 * k + 2;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x2.drawImage(c1, Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI * 2; x2.drawImage(c1, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); }
    const a = x1.getImageData(0, 0, W, H).data, b = x2.getImageData(0, 0, W, H).data;
    const out = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { out[i * 4] = a[i * 4 + 3]; out[i * 4 + 1] = b[i * 4 + 3]; out[i * 4 + 3] = 255; }
    return { W, H, data: out };
  }

  function rebuild() {
    const mk = makeMask(S.name || 'HELLO');
    Dt = mk.H / mk.W;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mk.W, mk.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, mk.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    N = layersN();
    // N layer quads, top layer first (helps the depth test reject covered fragments early).
    const v = new Float32Array(N * 18);
    const x0 = -0.5, x1 = 0.5, z0 = -Dt / 2, z1 = Dt / 2;
    for (let i = 0; i < N; i++) {
      const L = N - 1 - i, o = i * 18;
      v.set([x0, z0, L, x1, z0, L, x1, z1, L, x0, z0, L, x1, z1, L, x0, z1, L], o);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, layerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    const gL = N - 1;
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x0, z0, gL, x1, z0, gL, x1, z1, gL, x0, z0, gL, x1, z1, gL, x0, z1, gL]), gl.STATIC_DRAW);
    // CAD selection box around the full part (the hero's selection marquee, in 3D), plus corner handles
    const PH = N * lhW(), m = 0.025;
    const X0 = x0 - m, X1 = x1 + m, Z0 = z0 - m, Z1 = z1 + m, Y1 = PH + m * 0.6;
    const c = [[X0, 0, Z0], [X1, 0, Z0], [X1, 0, Z1], [X0, 0, Z1], [X0, Y1, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X0, Y1, Z1]];
    const E = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
    const lv = [];
    E.forEach((i) => lv.push(...c[i]));
    c.forEach((p) => lv.push(...p));
    lineCount = E.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lv), gl.STATIC_DRAW);
    fitCamera();
  }
  // World height of one layer: the part is HEIGHT_MM tall on a 120 mm wide name.
  const lhW = () => (HEIGHT_MM / 120) / N;
  const EXT = [1.15, 0.85];
  gl.bindBuffer(gl.ARRAY_BUFFER, bedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-EXT[0], -EXT[1], EXT[0], -EXT[1], EXT[0], EXT[1], -EXT[0], -EXT[1], EXT[0], EXT[1], -EXT[0], EXT[1]]), gl.STATIC_DRAW);

  /* Camera (column-major mat4) */
  const persp = (fy, a, n, f) => { const t = 1 / Math.tan(fy / 2), nf = 1 / (n - f); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; };
  const look = (e, c, u) => {
    let z0 = e[0] - c[0], z1 = e[1] - c[1], z2 = e[2] - c[2]; let l = Math.hypot(z0, z1, z2); z0 /= l; z1 /= l; z2 /= l;
    let x0 = u[1] * z2 - u[2] * z1, x1 = u[2] * z0 - u[0] * z2, x2 = u[0] * z1 - u[1] * z0; l = Math.hypot(x0, x1, x2); x0 /= l; x1 /= l; x2 /= l;
    const y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    return [x0, y0, z0, 0, x1, y1, z1, 0, x2, y2, z2, 0, -(x0 * e[0] + x1 * e[1] + x2 * e[2]), -(y0 * e[0] + y1 * e[1] + y2 * e[2]), -(z0 * e[0] + z1 * e[1] + z2 * e[2]), 1];
  };
  const mul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const cam = { yaw: -0.32, pitch: 0.62, dist: 1.6, vy: 0, vp: 0, fov: 0.6 };
  let MVP = null, aspect = 1;
  function fitCamera() {
    const r = Math.hypot(0.5, Dt / 2) * (aspect < 1.1 ? 1.08 : 0.92);
    const hf = 2 * Math.atan(Math.tan(cam.fov / 2) * aspect);
    cam.dist = r / Math.sin(Math.min(cam.fov, hf) / 2) * (aspect < 1 ? 1.02 : 0.98);
  }
  function camEye() {
    const cp = Math.cos(cam.pitch);
    return [Math.sin(cam.yaw) * cp * cam.dist, Math.sin(cam.pitch) * cam.dist + 0.02, Math.cos(cam.yaw) * cp * cam.dist];
  }
  function project(p, w, h) {
    const m = MVP;
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const ww = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [(x / ww * 0.5 + 0.5) * w, (1 - (y / ww * 0.5 + 0.5)) * h, ww];
  }

  /* Canvas size + adaptive quality */
  let W = 0, H = 0, cssW = 1, cssH = 1, q = SOFT ? 0.6 : 1, ema = 16, slow = 0;
  const maxDpr = SOFT ? 1 : 1.75;
  function resize() {
    const r = el.plate.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    const s = Math.min(devicePixelRatio || 1, maxDpr) * q;
    const w = Math.round(cssW * s), h = Math.round(cssH * s);
    if (w !== W || h !== H) { W = w; H = h; el.cv.width = W; el.cv.height = H; }
    aspect = cssW / cssH;
    fitCamera();
    kick();
  }

  /* ------------------------------------------------------------------ */
  /* Print simulation                                                    */
  /* ------------------------------------------------------------------ */
  let top = 0, state = 'preview', t0 = 0, flash = 0, lastLayer = -1, cut = 1e9, doneAt = 0, userAt = -1e9;
  const SLOW = /[?&]slow\b/.test(location.search) ? 6 : 1;   // testing only (software GL screenshots are slow)
  const totalMs = () => [6200, 6200, 3800, 5600][S.mat] * SLOW;   // PLA, PETG (FDM), resin (SLA), nylon (SLS)
  let prevFull = 0;
  function startPrint() {
    state = 'printing';
    top = 0; t0 = performance.now(); lastLayer = -1; cut = 1e9; flash = 0; prevFull = 0;
    el.inspect.hidden = true;
    el.snap.disabled = true;
    el.go.disabled = true;
    el.go.querySelector('span').firstChild.nodeValue = 'Printing… ';
    say('Printing ' + (S.name || 'HELLO') + ' in ' + MATS[S.mat].name + '.');
    if (RM) { top = N; finish(); }
    kick();
  }
  function finish() {
    state = 'done'; top = N; doneAt = performance.now();
    el.go.disabled = false;
    el.go.querySelector('span').firstChild.nodeValue = 'Print again ';
    el.snap.disabled = false;
    el.inspect.hidden = false;
    el.cut.max = String(N); el.cut.value = String(N); el.cutOut.textContent = N + ' / ' + N;
    say('Ready to hold. ' + N + ' layers, ' + HEIGHT_MM + ' mm tall.');
    kick();
  }
  function say(t) { if (el.status.textContent !== t) el.status.textContent = t; }
  const restartSoon = () => { if (state !== 'preview') startPrint(); else kick(); };

  function hud(now) {
    const shownTop = Math.min(top, cut);
    const L = Math.min(N, Math.floor(shownTop + 0.0001));
    if (L !== lastLayer) {
      lastLayer = L;
      el.layer.textContent = String(L).padStart(2, '0');
      el.z.textContent = (L * S.lh).toFixed(1);
    }
    el.layers.textContent = String(N);
    const m = MATS[S.mat];
    const spec = `${m.name} · ${m.spec} · ${S.lh.toFixed(2)} MM`;
    if (el.spec.textContent !== spec) el.spec.textContent = spec;
    const secs = state === 'printing' ? (now - t0) / 1000 * 60 : state === 'done' ? totalMs() / 1000 * 60 : 0;   // a 60x time-lapse
    const tt = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    if (!timeEl || !timeEl.isConnected) timeEl = $('#pl-time');
    const proc = el.proc;
    if (proc.dataset.h !== m.heat) { proc.dataset.h = m.heat; proc.innerHTML = m.heat + ' · <span id="pl-time"></span>'; timeEl = $('#pl-time'); }
    if (timeEl.textContent !== tt) timeEl.textContent = tt;
    const p = N ? shownTop / N : 0;
    el.seam.forEach((s, i) => s.style.setProperty('--p', clamp(p * 1.1 - i * 0.05, 0, 1).toFixed(3)));
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  const hexCol = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  let raf = 0, last = 0, visible = true;
  function kick() { if (!raf && visible && !d.hidden) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = Math.min(50, last ? now - last : 16);
    last = now;
    let busy = false;
    // print progress
    if (state === 'printing') {
      top = clamp((now - t0) / totalMs() * N, 0, N);
      const fl = Math.floor(top);
      if (MATS[S.mat].proc === 1 && fl > prevFull) flash = 1;   // resin: each layer cures under a UV flash
      prevFull = fl;
      if (top >= N) finish();
      busy = true;
    }
    if (flash > 0) { flash = Math.max(0, flash - dt / 260); busy = true; }
    // camera: drag inertia, then a gentle sway while printing and for a while after
    if (!drag) {
      if (Math.abs(cam.vy) > 1e-4 || Math.abs(cam.vp) > 1e-4) {
        cam.yaw += cam.vy; cam.pitch = clamp(cam.pitch + cam.vp, 0.16, 1.3);
        cam.vy *= 0.92; cam.vp *= 0.92; busy = true;
      } else if (!RM && now - userAt > 2500 && (state === 'printing' || now - doneAt < 9000 || state === 'preview')) {
        const target = -0.32 + Math.sin(now / 2600) * 0.28;
        cam.yaw += (target - cam.yaw) * (1 - Math.exp(-dt / 900));
        busy = true;
      }
    } else busy = true;
    try { render(now); } catch (e) { return; }
    hud(now);
    // adaptive quality while animating
    if (busy) {
      ema = ema * 0.9 + dt * 0.1;
      if (ema > 30 && q > 0.55) { if (++slow > 40) { slow = 0; ema = 16; q *= 0.8; resize(); } } else slow = 0;
    }
    if (busy) kick();
  }
  function render(now) {
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.0902, 0.0824, 0.1098, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const Pm = persp(cam.fov, aspect, 0.05, 20);
    const tgt = [0, 0.02, 0];
    MVP = mul(Pm, look(camEye(), tgt, [0, 1, 0]));
    const lh = lhW();
    // bed
    gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
    gl.useProgram(P3.p);
    gl.uniformMatrix4fv(P3.u.uMVP, false, MVP);
    gl.uniform2f(P3.u.uExt, EXT[0], EXT[1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, bedBuf);
    gl.enableVertexAttribArray(P3.a); gl.vertexAttribPointer(P3.a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // print
    const shownTop = Math.min(top, cut);
    gl.useProgram(P1.p);
    gl.uniformMatrix4fv(P1.u.uMVP, false, MVP);
    gl.uniform1f(P1.u.uLh, lh); gl.uniform1f(P1.u.uDt, Dt);
    gl.uniform1f(P1.u.uTop, shownTop); gl.uniform1f(P1.u.uN, N);
    gl.uniform1f(P1.u.uKind, S.infill); gl.uniform1f(P1.u.uDens, S.dens);
    gl.uniform1f(P1.u.uProc, MATS[S.mat].proc); gl.uniform1f(P1.u.uFlash, flash);
    gl.uniform3fv(P1.u.uCol, hexCol(MATS[S.mat].col));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P1.u.uMask, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, layerBuf);
    gl.enableVertexAttribArray(P1.a); gl.vertexAttribPointer(P1.a, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, N * 6);
    // ghost of the finished part (slicer preview) + CAD box
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    const ga = state === 'done' && cut >= N ? 0 : 1;
    if (ga) {
      gl.useProgram(P2.p);
      gl.uniformMatrix4fv(P2.u.uMVP, false, MVP);
      gl.uniform1f(P2.u.uLh, lh); gl.uniform1f(P2.u.uDt, Dt); gl.uniform1f(P2.u.uA, 0.75);
      gl.uniform1i(P2.u.uMask, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, ghostBuf);
      gl.enableVertexAttribArray(P2.a); gl.vertexAttribPointer(P2.a, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.useProgram(P4.p);
    gl.uniformMatrix4fv(P4.u.uMVP, false, MVP);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.enableVertexAttribArray(P4.a); gl.vertexAttribPointer(P4.a, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4f(P4.u.uC, 0.957, 0.937, 0.886, 0.42); gl.uniform1f(P4.u.uPs, 1);
    gl.drawArrays(gl.LINES, 0, lineCount);
    gl.uniform4f(P4.u.uC, 0.776, 0.949, 0.306, 0.95); gl.uniform1f(P4.u.uPs, Math.max(4, 6 * Math.min(devicePixelRatio || 1, maxDpr) * q));
    gl.drawArrays(gl.POINTS, lineCount, 8);
    gl.depthMask(true);
    placeTool(now, shownTop, lh);
  }

  // Print head (FDM), laser dot (SLS) or nothing (SLA), placed by projecting the nozzle position.
  function placeTool(now, shownTop, lh) {
    const proc = MATS[S.mat].proc;
    const printing = state === 'printing';
    const full = Math.floor(shownTop), f = shownTop - full;
    const xp = full % 2 === 0 ? f : 1 - f;
    const x = -0.5 + xp, y = (full + 1) * lh;
    const zz = Math.sin(now / 1000 * 26) * Dt * 0.42;
    const tip = project([x, y, zz], cssW, cssH);
    const showHead = proc === 0;
    const showLaser = proc === 2 && printing;
    el.head.classList.toggle('on', showHead);
    rail.style.opacity = showHead ? '1' : '0';
    el.laser.classList.toggle('on', showLaser);
    if (showHead) {
      // Head height from the projected size of ~44 mm at the nozzle's depth.
      const up = project([x, y + 0.22, zz], cssW, cssH);
      const hh = clamp(Math.abs(up[1] - tip[1]), 46, cssH * 0.3);
      // parked to the right of the plate before and after the print, riding the toolpath during it
      const park = !printing ? project([0.6, (state === 'done' ? N : 1) * lh + 0.02, -Dt * 0.2], cssW, cssH) : null;
      const hx = park ? park[0] : tip[0], hy = park ? park[1] : tip[1];
      el.head.style.height = hh.toFixed(1) + 'px';
      el.head.style.transform = `translate3d(${(hx - hh * (399 / 520) * 0.338).toFixed(1)}px,${(hy - hh).toFixed(1)}px,0)`;
      rail.style.height = (hh * 0.15).toFixed(1) + 'px';
      rail.style.transform = `translate3d(${(hx - hh * 0.2).toFixed(1)}px,${(hy - hh * 0.47 - hh * 0.15).toFixed(1)}px,0)`;
    }
    if (showLaser) el.laser.style.transform = `translate3d(${tip[0].toFixed(1)}px,${tip[1].toFixed(1)}px,0)`;
  }

  /* ------------------------------------------------------------------ */
  /* Orbit: drag (pointer) and arrow keys                                */
  /* ------------------------------------------------------------------ */
  let drag = null;
  el.plate.tabIndex = 0;
  el.plate.setAttribute('aria-label', 'Build plate. Drag, or use the arrow keys, to look around the print.');
  el.plate.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
    try { el.plate.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    el.plate.classList.add('is-drag');
    el.drag.classList.add('off');
    cam.vy = cam.vp = 0;
    userAt = performance.now();
    kick();
  });
  el.plate.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    cam.vy = -dx * 0.0075; cam.yaw += cam.vy;
    if (!drag.touch) { cam.vp = dy * 0.005; cam.pitch = clamp(cam.pitch + cam.vp, 0.16, 1.3); } else cam.vp = 0;
    userAt = performance.now();
    kick();
  });
  const up = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    drag = null;
    el.plate.classList.remove('is-drag');
    userAt = performance.now();
    kick();
  };
  el.plate.addEventListener('pointerup', up);
  el.plate.addEventListener('pointercancel', up);
  el.plate.addEventListener('lostpointercapture', up);
  el.plate.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft') cam.vy = 0.05; else if (k === 'ArrowRight') cam.vy = -0.05;
    else if (k === 'ArrowUp') cam.vp = 0.035; else if (k === 'ArrowDown') cam.vp = -0.035;
    else return;
    e.preventDefault();
    userAt = performance.now();
    kick();
  });

  /* Snapshot */
  el.snap.addEventListener('click', () => {
    try {
      render(performance.now());
      const url = el.cv.toDataURL('image/png');
      const a = d.createElement('a');
      a.href = url; a.download = `strata-${(S.name || 'hello').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      d.body.appendChild(a); a.click(); a.remove();
      say('Snapshot saved.');
    } catch (e) { say('Snapshot not available in this browser.'); }
  });
  el.cut.addEventListener('input', () => {
    cut = +el.cut.value;
    el.cutOut.textContent = cut + ' / ' + N;
    if (cut >= N) cut = 1e9;
    kick();
  });

  /* Pause offscreen / hidden */
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = 0; kick(); } }).observe(el.plate);
  d.addEventListener('visibilitychange', () => { if (!d.hidden) { last = 0; kick(); } });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(el.plate); else addEventListener('resize', resize);
  el.cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallback2D(); });

  wireControls(() => { rebuild(); });
  resize();
  rebuild();
  // First print starts once the cover is away, so the visitor sees it begin.
  const autostart = () => { if (state === 'preview') startPrint(); };
  setTimeout(autostart, RM ? 0 : 1000);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => { rebuild(); kick(); }, () => {});

  /* ------------------------------------------------------------------ */
  /* Controls → state                                                    */
  /* ------------------------------------------------------------------ */
  function wireControls(onShape) {
    let typeT = 0;
    const setName = () => {
      S.name = clean(el.name.value) || 'HELLO';
      if (el.file) el.file.textContent = S.name.replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'NAME';
      if (onShape) onShape();
    };
    el.name.addEventListener('input', () => {
      setName();
      if (!onShape) return;
      state = 'preview'; top = 0; cut = 1e9;
      el.inspect.hidden = true;
      el.go.disabled = false;
      el.go.querySelector('span').firstChild.nodeValue = 'Print it ';
      say('');
      clearTimeout(typeT);
      typeT = setTimeout(() => { if (state === 'preview') startPrint(); }, 1100);
      kick();
    });
    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(typeT);
      setName();
      if (onShape) startPrint(); else fallback2D();
    });
    radio('mat', 'data-mat', (v) => { S.mat = +v; if (onShape) restartSoon(); else fallback2D(); });
    radio('infill', 'data-infill', (v) => { S.infill = +v; el.dens.disabled = S.infill === 3; if (onShape) restartSoon(); });
    radio('lh', 'data-lh', (v) => { S.lh = +v; if (onShape) { onShape(); restartSoon(); } });
    el.dens.addEventListener('input', () => { S.dens = +el.dens.value / 100; el.densOut.textContent = el.dens.value + '%'; if (onShape) kick(); });
    el.dens.addEventListener('change', () => { if (onShape && state === 'done') startPrint(); });
    setName();
  }

  /* No WebGL: the name in the site's own striped "printed" type, printing in with CSS steps. */
  function fallback2D() {
    let fb = el.plate.querySelector('.pl-fallback');
    if (!fb) {
      fb = d.createElement('div');
      fb.className = 'pl-fallback';
      el.plate.appendChild(fb);
      el.cv.style.display = 'none';
      el.head.classList.remove('on');
    }
    const m = MATS[S.mat];
    fb.innerHTML = '';
    const w = d.createElement('p');
    w.textContent = S.name || 'HELLO';
    Object.assign(w.style, { margin: '0', font: '900 clamp(2.4rem, 9vw, 7rem)/.9 var(--display)', letterSpacing: '-.03em',
      color: 'transparent', backgroundImage: `repeating-linear-gradient(to bottom, ${m.col} 0 .052em, color-mix(in srgb, ${m.col} 70%, transparent) .052em .066em)`,
      webkitBackgroundClip: 'text', backgroundClip: 'text' });
    const n = d.createElement('small');
    n.className = 'label';
    n.textContent = 'This browser cannot show the 3D build plate, so here is the flat print.';
    Object.assign(n.style, { display: 'block', marginTop: '18px', opacity: '.75' });
    fb.append(w, n);
    if (WAAPI && !RM) w.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0)' }], { duration: 900, easing: 'steps(13, end)' });
    el.snap.disabled = true;
    say('Printed ' + (S.name || 'HELLO') + ' in ' + m.name + '.');
  }
})();
