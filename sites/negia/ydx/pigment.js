/* ydx round 5 — "liquid pigment": the living background of Negia's pink (s-field) scenes.
   One fixed WebGL canvas behind the page (body child, outside .page, pointer-events:none). Two tiny passes per frame:
     1. a low-res flowmap (ping-pong, ~192px wide) that the pointer / a touch drag / an idle "brush" smears like a finger
        through lipstick: velocity in rg, pigment density in b, advected by itself, decaying, and scrolled with the page so
        a smear stays where it was painted;
     2. the display pass: a slow domain-warped satin field in the active shade family, dragged by the flow, with pigment
        laid down where the density is and a specular gloss from the flow-derived normal (light from top-left).
   Colour = the active family (html[data-family]) and previews the family under a hovered swatch. Contrast-safe by
   construction: for the dark-text families (rose, nude, peach) the field only ever lifts toward --hi / gloss and the
   pigment body is at most 22% toward --pig (>= 4.9:1 against --on); for berry (light text) it only darkens toward --deep.
   Degrades: no WebGL / software GL / context loss -> the CSS gradient on .ydx-bg stays (designed fallback); reduced motion
   -> one still frame with a pre-painted stroke; hidden tab, or no pink scene on screen -> the loop stops.
   Simplex noise (2D): Ian McEwan, Stefan Gustavson (Ashima Arts), MIT. Everything else original. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  if (w.__ydxPig || !d.querySelector('.hero.s-field, [data-ydx-pigment]')) return;
  w.__ydxPig = 1;

  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = w.matchMedia('(pointer: coarse)').matches;
  var inFrame = w.self !== w.top;
  var allowSW = /[?&]ydx-gl=sw\b/.test(location.search); // test hook: allow SwiftShader (headless) to render
  var conn = navigator.connection || {};
  var lowPower = !!conn.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (coarse && (navigator.hardwareConcurrency || 8) <= 4);

  /* ---------------------------------------------------------------- DOM: wrapper (its CSS gradient is the fallback) */
  var wrap = d.createElement('div'); wrap.className = 'ydx-bg'; wrap.setAttribute('aria-hidden', 'true');
  var cv = d.createElement('canvas'); wrap.appendChild(cv);
  function fam() { return html.dataset.family || 'rose'; }
  wrap.dataset.tone = fam();
  d.body.appendChild(wrap);
  html.classList.add('ydx-bg-on');

  /* ---------------------------------------------------------------- palette per family, read from the site's own tokens */
  function hex(c) { c = String(c).trim().replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); var n = parseInt(c, 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  var PAL = {};
  ['rose', 'nude', 'peach', 'berry'].forEach(function (k) {
    var pr = d.createElement('i'); pr.dataset.tone = k; pr.hidden = true; wrap.appendChild(pr);
    var cs = getComputedStyle(pr), g = function (n) { return hex(cs.getPropertyValue(n) || '#e27a90'); };
    var field = g('--field'), pig = g('--pig'), deep = g('--deep'), tint = g('--tint'), hi = g('--hi');
    var darkText = k !== 'berry';
    PAL[k] = darkText
      ? { field: field, lift: mix(hi, tint, .18), paint: mix(field, pig, .22), gloss: mix(tint, [1, 1, 1], .4), ga: 1 }
      : { field: field, lift: mix(field, deep, .5), paint: mix(field, deep, .62), gloss: mix(field, pig, .9), ga: .3 };
    pr.remove();
  });

  /* ---------------------------------------------------------------- GL */
  var gl, ext = {}, progU, progD, bufTri, fbo = [], tex = [], cur = 0, half = false;
  var U = {}, V = {};
  var VERT = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 vUv;\n';
  var UPDATE = HEAD + [
    'uniform sampler2D uFlow;uniform vec2 uTexel,uA,uB,uVel,uShift;uniform float uRad,uAmt,uAspect,uVD,uDD,uQ;',
    'float segd(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);return length(pa-ba*h);}',
    'void main(){',
    ' vec2 uv=vUv-uShift;',                                            // the page scrolled: the paint moves with it
    ' vec2 v0=texture2D(uFlow,uv).rg*2.-1.;',
    ' vec4 s=texture2D(uFlow,uv-v0*uTexel*2.5);',                      // self-advection (semi-Lagrangian)
    ' vec2 v=(s.rg*2.-1.)*uVD; float dn=s.b*uDD;',
    ' v=sign(v)*max(abs(v)-uQ,0.); dn=max(dn-uQ*.35,0.);',             // 8-bit safety: never get stuck above zero
    ' vec2 p=vUv; p.x*=uAspect; vec2 a=uA; a.x*=uAspect; vec2 b=uB; b.x*=uAspect;',
    ' float r=segd(p,a,b)/uRad; float f=exp(-r*r*2.6)*uAmt;',
    ' v=mix(v,uVel,f); dn=min(1.,dn+f*.6);',
    ' gl_FragColor=vec4(v*.5+.5,dn,1.);',
    '}'].join('\n');
  var NOISE2 = [
    'vec3 pm(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);',
    ' vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;',
    ' vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;',
    ' m*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sn(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return s;}'
  ].join('\n');
  var DISPLAY = HEAD + [
    'uniform sampler2D uFlow;uniform vec2 uRes,uFT;uniform float uTime,uScroll,uInt,uGrain,uGA;uniform vec3 uField,uLift,uPaint,uGloss;',
    NOISE2,
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes; float m=min(uRes.x,uRes.y);',
    ' vec2 p=(gl_FragCoord.xy-.5*uRes)/m;',
    ' vec4 f=texture2D(uFlow,uv); vec2 v=f.rg*2.-1.;',
    ' float e=texture2D(uFlow,uv+vec2(uFT.x,0.)).b, wq=texture2D(uFlow,uv-vec2(uFT.x,0.)).b;',
    ' float nn=texture2D(uFlow,uv+vec2(0.,uFT.y)).b, s2=texture2D(uFlow,uv-vec2(0.,uFT.y)).b;',
    ' float dn=(f.b*2.+e+wq+nn+s2)/6.;',                                // 5-tap soften: no texel stair-steps on the stroke edge
    ' float dx=e-wq, dy=nn-s2;',
    ' float t=uTime*.045;',
    ' vec2 q=p*1.05+vec2(0.,uScroll*.32)-v*.22;',                       // the smear drags the satin with it
    ' vec2 wv=vec2(fbm(q+vec2(t,-t*.6)),fbm(q*1.2+vec2(4.1-t*.8,1.3+t*.5)));',
    ' float n=fbm(q+1.5*wv+vec2(t*.5,-t*.3));',
    ' float fold=smoothstep(-.25,.8,n);',
    ' vec3 col=mix(uField,uLift,fold*.5*uInt);',                         // folds only lift away from the text colour
    ' float body=smoothstep(.03,.55,dn);',
    ' col=mix(col,uPaint,body*.9);',                                     // pigment laid down
    ' vec3 nr=normalize(vec3(-dx*7.-wv.x*.22*uInt,-dy*7.-wv.y*.22*uInt,1.));',
    ' vec3 H=normalize(vec3(-.42,.55,.72)+vec3(0.,0.,1.));',
    ' float sp=pow(max(dot(nr,H),0.),26.);',
    ' col=mix(col,uGloss,clamp(sp*(.25+body*.9)*uGA,0.,.85));',          // satin + wet gloss along the stroke
    ' col*=1.-.06*dot(p,p)*uGA;',
    ' float g=fract(52.9829189*fract(dot(gl_FragCoord.xy+mod(uTime*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(col+(g-.5)*uGrain,1.);',
    '}'].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(fs, names) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
    var u = {}; names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); }); u._p = p; return u;
  }
  var FW = (coarse || inFrame || lowPower) ? 128 : 208, FH = 1;
  function makeTargets() {
    FH = Math.max(32, Math.round(FW * (innerHeight / Math.max(1, innerWidth))));
    var types = half ? [ext.half.HALF_FLOAT_OES] : [];
    types.push(gl.UNSIGNED_BYTE);
    for (var ti = 0; ti < types.length; ti++) {
      var ok = true;
      for (var i = 0; i < 2; i++) {
        if (tex[i]) gl.deleteTexture(tex[i]); if (fbo[i]) gl.deleteFramebuffer(fbo[i]);
        tex[i] = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex[i]);
        var lin = types[ti] === gl.UNSIGNED_BYTE || ext.halfLin;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lin ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FW, FH, 0, gl.RGBA, types[ti], null);
        fbo[i] = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[i], 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { ok = false; break; }
        gl.viewport(0, 0, FW, FH); gl.clearColor(.5, .5, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); // zero velocity, no pigment
      }
      if (ok) { half = types[ti] !== gl.UNSIGNED_BYTE; break; }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function initGL() {
    progU = prog(UPDATE, ['uFlow', 'uTexel', 'uA', 'uB', 'uVel', 'uShift', 'uRad', 'uAmt', 'uAspect', 'uVD', 'uDD', 'uQ']);
    progD = prog(DISPLAY, ['uFlow', 'uRes', 'uFT', 'uTime', 'uScroll', 'uInt', 'uGrain', 'uGA', 'uField', 'uLift', 'uPaint', 'uGloss']);
    bufTri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufTri);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ext.half = gl.getExtension('OES_texture_half_float'); ext.halfLin = !!gl.getExtension('OES_texture_half_float_linear');
    half = !!ext.half && ext.halfLin; makeTargets(); W = H = 0; // unfiltered half floats would show the flow grid as stair-steps
  }
  function fail() {
    wrap.dataset.state = 'fallback'; html.classList.add('ydx-no-webgl');
    try { var lx = gl && gl.getExtension('WEBGL_lose_context'); if (lx) lx.loseContext(); } catch (er) {} // free the context now
    gl = null;
  }
  try {
    var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'low-power', failIfMajorPerformanceCaveat: !allowSW };
    gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs);
    if (!gl) throw new Error('no webgl');
    // a software rasteriser (SwiftShader, llvmpipe, WARP) would spend the CPU the page needs: keep the CSS field there
    var dbg = gl.getExtension('WEBGL_debug_renderer_info'), rn = '';
    try { rn = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || ''); } catch (er) {}
    if (!allowSW && /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(rn)) throw new Error('software gl');
    initGL();
  } catch (e) { fail(); return; }

  /* ---------------------------------------------------------------- state */
  var W = 0, H = 0, q = coarse || lowPower ? .5 : .7, qMin = .35, ema = 16, slow = 0, fast = 0, upgraded = false;
  if (inFrame) q = .45;
  var t = 7.3, last = 0, raf = 0, lost = false, visible = !d.hidden, onscreen = true;
  var col = { field: 0, lift: 0, paint: 0, gloss: 0, ga: 1 }, tgtName = fam();
  ['field', 'lift', 'paint', 'gloss'].forEach(function (k) { col[k] = PAL[tgtName][k].slice(); }); col.ga = PAL[tgtName].ga;
  var inten = 1, intenT = 1, scroll = scrollY, lastScroll = scrollY, sVel = 0;
  // brush: the stamp segment for this frame (uv, y up). Pointer when active, else an autonomous slow swipe.
  var ptr = null, prevPtr = null, lastMove = -1e9, idleA = 0, idlePrev = null, intro = 0;

  function decodeColors() {
    var p = PAL[tgtName] || PAL.rose, kc = 1 - Math.exp(-dtLast / 600);
    ['field', 'lift', 'paint', 'gloss'].forEach(function (k) { for (var i = 0; i < 3; i++) col[k][i] += (p[k][i] - col[k][i]) * kc; });
    col.ga += (p.ga - col.ga) * kc;
  }
  var dtLast = 16;

  function size() {
    var dpr = Math.min(w.devicePixelRatio || 1, 1.5) * q;
    var cw = Math.max(1, Math.round(innerWidth * dpr)), ch = Math.max(1, Math.round(innerHeight * dpr));
    if (cw !== W || ch !== H) { W = cv.width = cw; H = cv.height = ch; }
  }
  function bindTri() { gl.bindBuffer(gl.ARRAY_BUFFER, bufTri); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); }
  function update(a, b, vel, rad, amt, shiftY, vd, dd) {
    var src = cur, dst = 1 - cur;
    gl.useProgram(progU._p); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[dst]); gl.viewport(0, 0, FW, FH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[src]); gl.uniform1i(progU.uFlow, 0);
    gl.uniform2f(progU.uTexel, 1 / FW, 1 / FH); gl.uniform2f(progU.uA, a[0], a[1]); gl.uniform2f(progU.uB, b[0], b[1]);
    gl.uniform2f(progU.uVel, vel[0], vel[1]); gl.uniform2f(progU.uShift, 0, shiftY);
    gl.uniform1f(progU.uRad, rad); gl.uniform1f(progU.uAmt, amt); gl.uniform1f(progU.uAspect, innerWidth / Math.max(1, innerHeight));
    gl.uniform1f(progU.uVD, vd); gl.uniform1f(progU.uDD, dd); gl.uniform1f(progU.uQ, half ? 0 : 1.2 / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 3); cur = dst;
  }
  function display() {
    size();
    gl.useProgram(progD._p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.uniform1i(progD.uFlow, 0);
    gl.uniform2f(progD.uRes, W, H); gl.uniform2f(progD.uFT, 1.8 / FW, 1.8 / FH);
    gl.uniform1f(progD.uTime, t); gl.uniform1f(progD.uScroll, scroll / Math.max(1, innerHeight)); gl.uniform1f(progD.uInt, inten);
    gl.uniform1f(progD.uGrain, .035); gl.uniform1f(progD.uGA, col.ga);
    gl.uniform3fv(progD.uField, col.field); gl.uniform3fv(progD.uLift, col.lift); gl.uniform3fv(progD.uPaint, col.paint); gl.uniform3fv(progD.uGloss, col.gloss);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (wrap.dataset.state !== 'ready') wrap.dataset.state = 'ready';
  }
  // the idle brush: a slow lipstick swipe, right to left (the Hebrew direction), drifting down and back
  function idlePoint(a) { return [.86 - .72 * (.5 + .5 * Math.sin(a * .9)), .62 + .2 * Math.sin(a * .37 + 1.3) + .06 * Math.sin(a * 2.1)]; }
  function step(dt) {
    t = (t + dt / 1000) % 1e4;
    var y = scrollY, dy = y - lastScroll; lastScroll = y;
    sVel += ((dy / Math.max(dt, 1)) - sVel) * (1 - Math.exp(-dt / 120)); // px per ms, smoothed
    scroll += (y - scroll) * (1 - Math.exp(-dt / 160));
    var shift = dy / Math.max(1, innerHeight); // content moved up by dy px -> paint moves up (GL y is up)
    var a, b, vel, rad = coarse ? .1 : .085, amt = 0;
    var now = performance.now();
    if (ptr && now - lastMove < 1400) {
      a = prevPtr || ptr; b = ptr;
      vel = [(b[0] - a[0]) * 22, (b[1] - a[1]) * 22]; var sp = Math.hypot(vel[0], vel[1]);
      if (sp > 1) { vel[0] /= sp; vel[1] /= sp; }
      amt = Math.min(1, .12 + sp * 1.6); prevPtr = ptr.slice(); idlePrev = null;
    } else {
      // autonomous swipe when nobody paints (touch devices, keyboard, idle); scroll speed hurries it along
      prevPtr = null;
      idleA += dt / 1000 * (.55 + Math.min(2.5, Math.abs(sVel) * 1.4));
      b = idlePoint(idleA); a = idlePrev || b; idlePrev = b;
      vel = [(b[0] - a[0]) * 40, (b[1] - a[1]) * 40 - sVel * .25];
      amt = .2 + Math.min(.4, Math.abs(sVel) * .25); rad = .07;
      if (intro < 1) { intro = Math.min(1, intro + dt / 1600); amt = .55; rad = .09; }
    }
    update(a, b, vel, rad, amt, shift, .955, .992);
    intenT = Math.max(.55, Math.min(1.35, sectionInt + Math.min(.4, Math.abs(sVel) * .6)));
    inten += (intenT - inten) * (1 - Math.exp(-dt / 300));
    dtLast = dt; decodeColors();
  }
  function frame(now) {
    raf = 0; if (!running()) return;
    raf = requestAnimationFrame(frame);
    var dt = last ? Math.min(now - last, 50) : 16.7; last = now;
    var t0 = performance.now();
    step(dt); display();
    // adaptive quality from the measured frame interval (EMA); step down 0.75x after ~0.75s slow, up once after ~4s fast
    ema += (dt - ema) * .05;
    if (ema > 24 && q > qMin) { if (++slow > 45) { q = Math.max(qMin, q * .75); slow = 0; ema = 16; } } else slow = 0;
    if (ema < 13 && !upgraded && q < .7) { if (++fast > 240) { q = Math.min(.7, q / .75); upgraded = true; } } else fast = 0;
    // still too slow at the lowest resolution (weak or software GPU): give up the motion, keep a designed still frame
    if (q <= qMin && ema > 34) { if (++starved > 90) { gaveUp = true; wrap.dataset.mode = 'still'; cancelAnimationFrame(raf); raf = 0; return; } } else starved = 0;
    w.__ydxPigCost = (w.__ydxPigCost || 0) * .95 + (performance.now() - t0) * .05; // JS-side cost per frame (ms), for measurement
  }
  var starved = 0, gaveUp = false;
  function running() { return gl && !lost && visible && onscreen && !reduce.matches && !gaveUp; }
  function kick() { if (running() && !raf) { last = 0; raf = requestAnimationFrame(frame); } else if (!running() && gl && !lost) still(); }
  // one composed still frame (reduced motion, or when paused): the opening swipe pre-painted, colours settled
  var stillDone = '';
  function still() {
    var key = tgtName + W + 'x' + H + (reduce.matches ? 'r' : '');
    if (!reduce.matches && wrap.dataset.state === 'ready') return; // paused mid-animation: the last frame is still on screen
    if (stillDone === key) return; stillDone = key;
    var p = PAL[tgtName]; ['field', 'lift', 'paint', 'gloss'].forEach(function (k) { col[k] = p[k].slice(); }); col.ga = p.ga;
    var A = 0, prev = null; for (var i = 0; i < 90; i++) { A += .016; var b = idlePoint(A * 1.6 + 1.2); update(prev || b, b, prev ? [(b[0] - prev[0]) * 40, (b[1] - prev[1]) * 40] : [0, 0], .07, .5, 0, .99, .999); prev = b; }
    display();
  }

  /* ---------------------------------------------------------------- inputs */
  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    ptr = [e.clientX / Math.max(1, innerWidth), 1 - e.clientY / Math.max(1, innerHeight)]; lastMove = performance.now();
  }, { passive: true });
  // touch: a tap or the start of a drag lays a dab where the finger lands
  addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { ptr = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; prevPtr = null; lastMove = performance.now(); } }, { passive: true });
  addEventListener('resize', function () { if (gl) { makeTargets(); W = H = 0; stillDone = ''; kick(); } }, { passive: true });
  d.addEventListener('visibilitychange', function () { visible = !d.hidden; kick(); });
  if (reduce.addEventListener) reduce.addEventListener('change', function () { stillDone = ''; kick(); });
  // follow the active family; hovering / focusing a swatch previews its family in the background
  new MutationObserver(function () { if (tgtName === 'custom') return; tgtName = fam(); wrap.dataset.tone = tgtName; stillDone = ''; kick(); }).observe(html, { attributes: true, attributeFilter: ['data-family'] });
  function preview(e) {
    if (tgtName === 'custom') return;
    var s = e.target.closest && e.target.closest('[data-shade]');
    var n = s ? s.dataset.shade : fam(); if (PAL[n] && n !== tgtName) { tgtName = n; kick(); }
  }
  d.addEventListener('pointerover', preview, { passive: true }); d.addEventListener('focusin', preview);
  // which pink scene is on screen sets the energy: full in the hero, calmer where there is reading
  var sectionInt = 1, ENERGY = { top: 1.15, atelier: .7, approach: .9, contact: .75 }, vis = new Map();
  var fields = [].slice.call(d.querySelectorAll('section.s-field, main.s-field'));
  var sio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { vis.set(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
    var best = null, br = 0; vis.forEach(function (r, el) { if (r > br) { br = r; best = el; } });
    onscreen = br > 0; sectionInt = best ? (ENERGY[best.id] || .85) : 1; kick();
  }, { threshold: [0, .01, .25, .5, .75] });
  fields.forEach(function (el) { sio.observe(el); });

  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; wrap.dataset.state = 'lost'; if (raf) cancelAnimationFrame(raf); raf = 0; }, false);
  cv.addEventListener('webglcontextrestored', function () { try { lost = false; initGL(); stillDone = ''; kick(); } catch (er) { fail(); } }, false);
  addEventListener('pagehide', function (e) { if (!e.persisted && raf) { cancelAnimationFrame(raf); raf = 0; } });
  addEventListener('pageshow', function (e) { if (e.persisted) kick(); });

  // the shade lab (/lab/) drives the background with its own mix: {field, pig, dark}
  function setCustom(o) {
    var field = hex(o.field), pig = hex(o.pig);
    PAL.custom = o.dark
      ? { field: field, lift: mix(field, [1, .98, .97], .3), paint: mix(field, pig, .2), gloss: [1, .97, .96], ga: 1 }
      : { field: field, lift: mix(field, [.17, .02, .09], .45), paint: mix(field, [.17, .02, .09], .6), gloss: mix(field, pig, .8), ga: .3 };
    tgtName = 'custom'; wrap.dataset.tone = 'custom'; stillDone = ''; kick();
  }
  w.__ydxPigment = { quality: function () { return q; }, state: function () { return wrap.dataset.state; }, half: function () { return half; }, setCustom: setCustom };
  if (w.__ydxLabPalette) setCustom(w.__ydxLabPalette);
  size(); kick();
})();
