/* Form & Field, round 5: the living proof.
   The flat colour fields of the long page become ink on paper that is still on the press. One WebGL canvas sits
   behind main's sections (absolute in main, not fixed, so it scrolls natively with the page; it is moved only to keep
   a viewport-plus-overscan window covered) and paints each section's own field colour with two halftone screens:
     - show-through: where the ink runs thin the paper shows through as a 15-degree dot screen, in slow drifting pools;
     - the brayer: the pointer rolls a second screen (75 degrees) into the page. The ink map lives in document space,
       so the marks scroll away with the page and dry off in a few seconds; scrolling under a still pointer draws a line.
   Scroll speed starves the ink (more show-through) and lets the plates slip: section edges mis-register by up to 14px
   and settle back. Chapter 04's "change the field" flood is printed by the shader as a growing halftone.
   Contrast: every dot colour moves away from the field's text colour (light fields go paler, dark fields go deeper),
   so body text only gains contrast. Fallbacks: no WebGL / reduced motion / hub iframe / ?ydxgl=off -> a static CSS
   halftone (html.ydx-field-static); no JS or no enhance.css -> the original flat fields. Costs and tests: CHANGES.md. */
(() => {
  'use strict';
  if (window.__ydxField) return;
  window.__ydxField = true;
  const d = document, html = d.documentElement, main = d.querySelector('main');
  const cssOK = getComputedStyle(html).getPropertyValue('--ydx-css').trim() === '1';
  if (!main || !cssOK) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const qp = /[?&]ydxgl=([a-z]+)/.exec(location.search), flag = qp ? qp[1] : '';
  const lowPower = !!(navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2);

  const goStatic = why => { html.classList.add('ydx-field-static'); html.dataset.ydxField = 'static:' + why; };
  if (flag === 'off') return goStatic('flag');
  if (framed) return goStatic('iframe');                    // the hub preview gets the light version
  if (lowPower) return goStatic('low-power');

  /* ---------- palette: C is the section's own --field; P (show-through) and B (brayer) move away from its text ---------- */
  const hex = h => { h = String(h).trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return isNaN(n) ? null : [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const WHITE = hex('#fffdf6'), PURE = [1, 1, 1];
  const TONES = {                                            // [show-through, brayer] for each field
    yellow: c => [mix(c, WHITE, 0.5), WHITE],
    mint: c => [mix(c, WHITE, 0.45), WHITE],
    paper: c => [mix(c, PURE, 0.75), PURE],
    paper2: c => [mix(c, PURE, 0.75), PURE],
    pink: c => [mix(c, hex('#9e0a5a'), 0.14), mix(c, hex('#9e0a5a'), 0.24)],   // its italics (yellow, white) are lighter than the field and its body text is ink: a narrow, slightly deeper band keeps ink >= 4.6:1 and lifts the italics
    violet: c => [mix(c, hex('#160a5c'), 0.55), hex('#12063f')],
    ink: c => [hex('#2a2924'), hex('#3418b8')]
  };
  const tones = (el, field) => {
    const c = hex(getComputedStyle(el).getPropertyValue('--field')) || [1, 0.9, 0];
    const [p, b] = (TONES[field] || TONES.paper)(c);
    return { c, p, b, k: field === 'pink' ? 0.5 : field === 'paper' || field === 'paper2' ? 0.6 : 0.55 };
  };

  /* ---------- shaders ---------- */
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  /* ink map: shift with the page (document space), dry off, roll the brayer segment in */
  const INK = HEAD + [
    'uniform sampler2D uPrev;uniform vec2 uIRes,uCss;uniform float uShift,uDecay,uRad,uStr;uniform vec4 uSeg;',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uIRes, s=uv-vec2(0.,uShift);',
    ' float prev=(s.y<0.||s.y>1.)?0.:texture2D(uPrev,s).r;',
    ' prev=max(0.,prev*uDecay-1.2/255.);',                       // the constant beats 8-bit rounding, so it really dries
    ' vec2 p=vec2(uv.x,1.-uv.y)*uCss, pa=p-uSeg.xy, ba=uSeg.zw-uSeg.xy;',
    ' float h=clamp(dot(pa,ba)/max(dot(ba,ba),.001),0.,1.);',
    ' float s2=(1.-smoothstep(uRad*.3,uRad,length(pa-ba*h)))*uStr;',
    ' gl_FragColor=vec4(min(1.,prev+s2*(1.-prev)),0.,0.,1.);',
    '}'].join('\n');
  const NOISE = [                                            // 2D simplex noise: Ashima Arts / Stefan Gustavson, MIT
    'vec3 pm(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);',
    ' vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;',
    ' vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;',
    ' m*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}'].join('\n');
  const NB = 6;
  const FRAG = HEAD + [
    'uniform vec2 uRes,uCss;uniform float uDpr,uTop,uTime,uAmp,uVel,uReg,uCell;',
    'uniform vec4 uBand[' + NB + '];uniform vec3 uC[' + NB + '],uP[' + NB + '],uB[' + NB + '];',
    'uniform vec4 uFl;uniform vec3 uFC,uFP,uFB;uniform float uFK;uniform sampler2D uInk;',
    NOISE,
    /* one dot of a screen at angle (c,s): returns coverage, and the cell centre in local css px */
    'float dotAt(vec2 p,float c,float s,float cell,out vec2 cc){',
    ' vec2 q=vec2(c*p.x+s*p.y,-s*p.x+c*p.y)/cell, k=floor(q)+.5, f=q-k;',
    ' cc=vec2(c*k.x-s*k.y,s*k.x+c*k.y)*cell; return length(f);}',
    'float cover(float dist,float amt,float cell){float r=sqrt(clamp(amt,0.,1.)*.3183)*1.05, aa=.75/(cell*uDpr);',
    ' return 1.-smoothstep(r-aa,r+aa,dist);}',
    'void main(){',
    ' vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;',   // local css px, y down
    ' vec3 C=vec3(0.),P=C,B=C,N=C;float K=0.,found=0.,nf=0.;float yr=p.y-uReg;',
    ' for(int i=0;i<' + NB + ';i++){vec4 b=uBand[i];',
    '  if(p.y>=b.x&&p.y<b.y){C=uC[i];P=uP[i];B=uB[i];K=b.z;found=1.;',
    '   if(abs(b.w-uFl.w)<.5){float dd=length(p-uFl.xy);float fr=uFl.z;',
    '    if(dd<fr-28.){C=uFC;P=uFP;B=uFB;K=uFK;}else if(dd<fr+28.){nf=1.-(dd-fr+28.)/56.;N=uFC;}}}',
    '  if(yr>=b.x&&yr<b.y&&!(p.y>=b.x&&p.y<b.y)){N=uC[i];nf=max(nf,.6);}}',  // mis-registration strip: the neighbour's plate
    ' if(found<.5){gl_FragColor=vec4(0.);return;}',
    ' vec2 doc=vec2(p.x,p.y+uTop), cc; float t=uTime;',
    /* show-through: slow drifting pools in document space (15-degree screen) */
    ' float d1=dotAt(doc,.9659,.2588,uCell,cc);',
    ' float n=sn(cc*.0019+vec2(t*.021,-t*.013))*.65+sn(cc*.0061+vec2(-t*.017,t*.011))*.35;',
    ' float a1=smoothstep(.05,.9,n+.18)*K*uAmp*(1.+min(abs(uVel)*.03,1.1));',
    ' vec3 col=mix(C,P,cover(d1,min(a1,.62),uCell));',
    /* the brayer: ink map sampled at the 75-degree cell centre */
    ' float d2=dotAt(doc,.2588,.9659,uCell*.92,cc);',
    ' vec2 iuv=vec2(cc.x/uCss.x,1.-(cc.y-uTop)/uCss.y);',
    ' float ink=texture2D(uInk,clamp(iuv,0.,1.)).r;',
    ' col=mix(col,B,cover(d2,ink*.9,uCell*.92));',
    /* the flood front and the slipped plate print as dots of the incoming colour */
    ' if(nf>0.){float d3=dotAt(doc,.7071,.7071,uCell*.8,cc);col=mix(col,N,cover(d3,nf,uCell*.8));}',
    ' float g=fract(52.9829189*fract(dot(floor(doc*uDpr),vec2(.06711056,.00583715))));',   // paper tooth, fixed to the page
    ' col+=(g-.5)*.022*uAmp;',
    ' gl_FragColor=vec4(col,1.);',
    '}'].join('\n');

  /* ---------- state ---------- */
  let cv = null, gl = null, P1 = null, P2 = null, U = {}, V = {}, tex = [], fbo = [], cur = 0, buf = null;
  let raf = 0, last = 0, t = 7.3, amp = 0, ema = 16.7, slow = 0, q = 1, lost = false, dead = false, live = false;
  let W = 0, H = 0, cssW = 1, cssH = 1, dpr = 1, iw = 0, ih = 0, top = 0, prevTop = null, over = 0;
  let mainTop = 0, mainH = 0, bands = [], dirty = true, idle = 0, frameN = 0;
  let sy = scrollY, lastSy = scrollY, vel = 0, reg = 0;
  let px = -1, py = -1, ppx = null, ppy = null, inside = false, lastInput = 0, burst = null;
  const flood = { on: false, el: null, cx: 0, cy: 0, r: 0, t0: 0, R: 0, c: null };

  const cubic = (x1, y1, x2, y2) => x => {                  // the site's flood easing (a CSS cubic-bezier), solved for x
    const bx = a => 3 * x1 * a * (1 - a) * (1 - a) + 3 * x2 * a * a * (1 - a) + a * a * a;
    const dbx = a => 3 * x1 * (1 - a) * (1 - a) + 6 * (x2 - x1) * a * (1 - a) + 3 * (1 - x2) * a * a;
    let a = x;
    for (let i = 0; i < 6; i++) { const g = dbx(a); if (Math.abs(g) < 1e-6) break; a = Math.min(1, Math.max(0, a - (bx(a) - x) / g)); }
    return 3 * y1 * a * (1 - a) * (1 - a) + 3 * y2 * a * a * (1 - a) + a * a * a;
  };
  const floodEase = cubic(0.3, 0.7, 0.2, 1);

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(fs, names) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; names.forEach(n => { u[n] = gl.getUniformLocation(p, n); });
    return [p, u];
  }
  function build() {
    [P1, V] = program(INK, ['uPrev', 'uIRes', 'uCss', 'uShift', 'uDecay', 'uRad', 'uStr', 'uSeg']);
    [P2, U] = program(FRAG, ['uRes', 'uCss', 'uDpr', 'uTop', 'uTime', 'uAmp', 'uVel', 'uReg', 'uCell', 'uBand', 'uC', 'uP', 'uB', 'uFl', 'uFC', 'uFP', 'uFB', 'uFK', 'uInk']);
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    tex = []; fbo = []; iw = ih = 0; W = H = 0; dirty = true;
  }
  function inkTargets(w, h) {
    if (w === iw && h === ih) return;
    tex.forEach(x => gl.deleteTexture(x)); fbo.forEach(x => gl.deleteFramebuffer(x)); tex = []; fbo = [];
    for (let i = 0; i < 2; i++) {
      const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      tex.push(tx); fbo.push(fb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    iw = w; ih = h; prevTop = null;
  }

  /* ---------- layout: read on init, resize and when a section changes size; never per frame ---------- */
  function measure() {
    const mr = main.getBoundingClientRect();
    mainTop = mr.top + scrollY; mainH = mr.height; cssW = main.clientWidth || mr.width;
    over = coarse ? Math.round(innerHeight * 0.36) : Math.max(140, Math.round(innerHeight * 0.18));
    cssH = Math.min(Math.max(1, mainH), innerHeight + over * 2);
    bands = [...main.children].filter(el => el.matches('.sec[data-field]')).map(el => {
      const r = el.getBoundingClientRect(), f = el.getAttribute('data-field');
      return Object.assign({ el, y0: r.top - mr.top, y1: r.bottom - mr.top, field: f }, tones(el, f));
    });
    if (cv) { cv.style.height = cssH + 'px'; }
    dirty = true;
  }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5) * q;
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; }
    inkTargets(Math.max(8, Math.round(cssW / 8)), Math.max(8, Math.round(cssH / 8)));
    dirty = false;
  }

  /* ---------- one frame ---------- */
  function frame(now) {
    if (!gl || lost || dead || gl.isContextLost()) return;
    const dt = last ? Math.min(now - last, 50) : 16.7; last = now;
    if (!reduce.matches) t = (t + dt / 1000) % 1000;
    frameN++;
    sy = scrollY;
    const dy = sy - lastSy; lastSy = sy;
    const kv = 1 - Math.exp(-dt / 120);
    vel += (dy / dt * 16.7 - vel) * kv;
    reg += (Math.max(-14, Math.min(14, vel * 0.35)) - reg) * (1 - Math.exp(-dt / 90));
    if (Math.abs(vel) < 0.02) vel = 0;
    amp = Math.min(1, amp + dt / 1400);

    /* idle: nothing moving for 2.5s -> 30fps is plenty for the slow drift */
    const active = Math.abs(vel) > 0.05 || Math.abs(reg) > 0.05 || now - lastInput < 2500 || flood.on || amp < 1 || burst;
    if (!active && (frameN & 1)) return;

    if (dirty) size();
    top = Math.round(Math.max(0, Math.min(mainH - cssH, sy - mainTop - over)));
    const shift = prevTop == null ? 0 : top - prevTop;
    if (shift !== 0 || prevTop == null) cv.style.transform = `translate3d(0,${top}px,0)`;
    prevTop = top;

    /* visible bands (local css px) */
    const vis = [];
    for (const b of bands) if (b.y1 - top > 0 && b.y0 - top < cssH && vis.length < NB) vis.push(b);
    const onView = vis.some(b => b.y1 > sy - mainTop && b.y0 < sy - mainTop + innerHeight);

    /* brayer: the pointer in document space; a still pointer over a scrolling page draws a line */
    let seg = [0, 0, 0, 0], str = 0, rad = coarse ? 58 : 40;
    if (burst) {
      seg = [burst.x, burst.y - top, burst.x, burst.y - top]; str = 0.55; rad = 66;
      if (--burst.n <= 0) burst = null;
    } else if (inside && px >= 0) {
      const dx = px, dyy = py + sy - mainTop;
      if (ppx != null) {
        const len = Math.hypot(dx - ppx, dyy - ppy);
        if (len > 420) { /* a jump (transition, Home/End): no streak across the page */ } else if (len > 0.5) { seg = [ppx, ppy - top, dx, dyy - top]; str = Math.min(1, len / 36) * 0.5; }
      }
      ppx = dx; ppy = dyy;
    }
    if (reduce.matches) str = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    /* pass 1: the ink map */
    gl.useProgram(P1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]); gl.viewport(0, 0, iw, ih);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(V.uPrev, 0); gl.uniform2f(V.uIRes, iw, ih); gl.uniform2f(V.uCss, cssW, cssH);
    gl.uniform1f(V.uShift, shift / cssH); gl.uniform1f(V.uDecay, Math.exp(-dt / 2100));
    gl.uniform1f(V.uRad, rad); gl.uniform1f(V.uStr, str); gl.uniform4f(V.uSeg, seg[0], seg[1], seg[2], seg[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
    if (!onView) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); return; }

    /* pass 2: the page */
    gl.useProgram(P2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.uniform1i(U.uInk, 0);
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uCss, cssW, cssH); gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uTop, top); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uAmp, amp);
    gl.uniform1f(U.uVel, reduce.matches ? 0 : vel); gl.uniform1f(U.uReg, reduce.matches ? 0 : reg);
    gl.uniform1f(U.uCell, coarse ? 6.5 : 8);
    const bd = new Float32Array(NB * 4), cc = new Float32Array(NB * 3), pp = new Float32Array(NB * 3), bb = new Float32Array(NB * 3);
    for (let i = 0; i < NB; i++) {
      const b = vis[i];
      if (!b) { bd.set([-1e5, -1e5, 0, -9], i * 4); continue; }
      bd.set([b.y0 - top, b.y1 - top, b.k, bands.indexOf(b)], i * 4);
      cc.set(b.c, i * 3); pp.set(b.p, i * 3); bb.set(b.b, i * 3);
    }
    gl.uniform4fv(U.uBand, bd); gl.uniform3fv(U.uC, cc); gl.uniform3fv(U.uP, pp); gl.uniform3fv(U.uB, bb);
    if (flood.on) {
      const k = Math.min(1, (now - flood.t0) / 620), r = flood.R * floodEase(k);
      const bi = bands.findIndex(b => b.el === flood.el), b = bands[bi];
      gl.uniform4f(U.uFl, flood.cx, (b ? b.y0 : 0) + flood.cy - top, r, bi);
      gl.uniform3fv(U.uFC, flood.c.c); gl.uniform3fv(U.uFP, flood.c.p); gl.uniform3fv(U.uFB, flood.c.b); gl.uniform1f(U.uFK, flood.c.k);
      if (k >= 1 && now - flood.t0 > 900) flood.on = false;  // app.js applies the field at the end; held a little longer
    } else gl.uniform4f(U.uFl, 0, 0, 0, -99);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!live) {                                             // the first good frame: only now do the sections let it show
      live = true; html.classList.add('ydx-field-live'); cv.dataset.state = 'live';
    }

    /* adaptive quality: a sustained slow frame steps the resolution down (twice at most, never back up) */
    ema += (dt - ema) * 0.05;
    if (frameN > 40 && ema > 45 && flag !== 'force') return teardown('slow');   // still far too slow at the lowest step: hand over to the static frame
    if (ema > 26 && q > 0.7) { if (++slow > 50) { q = q > 0.9 ? 0.8 : 0.66; slow = 0; ema = 16.7; dirty = true; cv.dataset.q = String(q); } } else slow = 0;
  }
  function probe() {                                        // ms for one 256x256 frame, GPU round trip included
    cv.width = cv.height = 256; inkTargets(8, 8);
    gl.useProgram(P2); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, 256, 256);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]); gl.uniform1i(U.uInk, 0);
    gl.uniform2f(U.uRes, 256, 256); gl.uniform2f(U.uCss, 256, 256); gl.uniform1f(U.uDpr, 1); gl.uniform1f(U.uTop, 0);
    gl.uniform1f(U.uTime, 3); gl.uniform1f(U.uAmp, 1); gl.uniform1f(U.uVel, 0); gl.uniform1f(U.uReg, 2); gl.uniform1f(U.uCell, 8);
    const bd = new Float32Array(NB * 4); for (let i = 0; i < NB; i++) bd.set(i ? [-1e5, -1e5, 0, -9] : [0, 256, 0.55, 0], i * 4);
    gl.uniform4fv(U.uBand, bd); gl.uniform3fv(U.uC, new Float32Array(NB * 3).fill(0.8)); gl.uniform3fv(U.uP, new Float32Array(NB * 3).fill(1)); gl.uniform3fv(U.uB, new Float32Array(NB * 3).fill(0.5));
    gl.uniform4f(U.uFl, 0, 0, 0, -99);
    const px = new Uint8Array(4), run = () => { gl.drawArrays(gl.TRIANGLES, 0, 3); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    run();                                                    // warm-up (compile, upload)
    const t0 = performance.now(); run(); run();
    W = H = 0; iw = ih = 0; dirty = true;
    return (performance.now() - t0) / 2;
  }
  const stats = window.__ydxFieldStats = { frames: 0, jsMs: 0 };   // main-thread cost of a frame (EMA), read by the tests
  function loop(now) { raf = 0; const t0 = performance.now(); frame(now); stats.frames++; stats.jsMs += (performance.now() - t0 - stats.jsMs) * 0.05; schedule(); }
  function schedule() { if (!raf && !dead && !lost && !d.hidden && gl) raf = requestAnimationFrame(loop); }

  /* ---------- start (after the loader has left, in idle time) ---------- */
  function start() {
    if (cv || dead) return;
    cv = d.createElement('canvas');
    cv.className = 'ydx-field-cv'; cv.setAttribute('aria-hidden', 'true'); cv.dataset.state = 'init';
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false,
      powerPreference: 'low-power', failIfMajorPerformanceCaveat: flag !== 'sw' };
    try {
      gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('no webgl');
      build();
    } catch (e) { gl = null; cv = null; return goStatic('no-webgl'); }
    measure();
    /* a GPU that cannot afford it (software rendering, a tired phone) gets the static frame: one small frame of the page
       shader is timed with a GPU round trip and scaled to the real size. ?ydxgl=force skips this (visual tests). */
    if (flag !== 'force') {
      const ms = probe(), full = ms * (cssW * cssH * Math.min(devicePixelRatio || 1, 1.5) ** 2) / 65536;
      cv.dataset.probe = ms.toFixed(2) + 'ms/64k, ~' + full.toFixed(1) + 'ms/frame';
      if (full > 40) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); gl = null; cv = null; return goStatic('slow-gpu'); }
      if (full > 12) q = Math.max(0.6, Math.sqrt(12 / full));
    }
    html.classList.add('ydx-field');                        // main becomes the canvas' stacking context
    main.append(cv);
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; live = false; html.classList.remove('ydx-field-live'); cv.dataset.state = 'lost'; }, false);
    cv.addEventListener('webglcontextrestored', () => { lost = false; try { build(); schedule(); } catch (e) { teardown('restore'); } }, false);

    let pend = 0;
    const remeasure = () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; measure(); }); };
    if (window.ResizeObserver) { const ro = new ResizeObserver(remeasure); ro.observe(main); [...main.children].forEach(el => el !== cv && ro.observe(el)); }
    addEventListener('resize', remeasure, { passive: true });
    addEventListener('load', remeasure);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(remeasure, () => {});
    /* a field changes (chapter 04's swatches): re-read its colours; a flood disc appears: print it ourselves */
    new MutationObserver(recs => {
      let re = false;
      recs.forEach(r => {
        if (r.type === 'attributes') { re = true; if (flood.el === r.target) flood.on = false; }
        r.addedNodes && r.addedNodes.forEach(n => {
          if (n.nodeType !== 1 || !n.classList.contains('flood-fx') || reduce.matches) return;
          const sec = n.parentElement, f = n.dataset.field;
          const l = parseFloat(n.style.left) || 0, tp = parseFloat(n.style.top) || 0, w = parseFloat(n.style.width) || 0;
          Object.assign(flood, { on: true, el: sec, cx: l + w / 2, cy: tp + w / 2, R: w / 2, t0: performance.now(), c: tones(sec, f) });
          /* tones() read the section's current field; read the incoming one from the disc itself */
          const c = hex(getComputedStyle(n).getPropertyValue('--field')); if (c) { const [p, b] = (TONES[f] || TONES.paper)(c); flood.c = { c, p, b, k: f === 'pink' ? 0.5 : 0.55 }; }
          schedule();
        });
      });
      if (re) measure();
      schedule();
    }).observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-field'] });

    /* input */
    const mark = () => { lastInput = performance.now(); schedule(); };
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY;
      if (!inside) { inside = true; ppx = null; }
      mark();
    }, { passive: true });
    html.addEventListener('pointerleave', () => { inside = false; ppx = null; });
    addEventListener('blur', () => { inside = false; ppx = null; });
    let down = null;                                          // touch: a tap presses a blot of ink
    addEventListener('pointerdown', e => { if (e.pointerType === 'touch') down = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
    addEventListener('pointerup', e => {
      if (!down || e.pointerType !== 'touch') return;
      if (performance.now() - down.t < 300 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && !reduce.matches)
        burst = { x: e.clientX, y: e.clientY + scrollY - mainTop, n: 3 };
      down = null; mark();
    }, { passive: true });
    addEventListener('scroll', mark, { passive: true });
    d.addEventListener('visibilitychange', () => { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; } else { last = 0; schedule(); } });
    addEventListener('pageshow', e => { if (e.persisted) { last = 0; measure(); schedule(); } });
    schedule();
  }
  function teardown(why) {
    dead = true; cancelAnimationFrame(raf); raf = 0;
    html.classList.remove('ydx-field-live', 'ydx-field');
    if (cv) { const ext = gl && gl.getExtension('WEBGL_lose_context'); cv.remove(); if (ext) ext.loseContext(); }
    gl = null; cv = null; goStatic(why);
  }

  /* reduced motion: a static CSS frame from the start; switching it on later hands over to the same frame */
  if (reduce.matches) goStatic('reduced');
  reduce.addEventListener && reduce.addEventListener('change', () => {
    if (reduce.matches && cv) teardown('reduced');
    else if (!reduce.matches && !cv && !dead) { html.classList.remove('ydx-field-static'); delete html.dataset.ydxField; begin(); }
  });
  function begin() {
    const go = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 700 }) : setTimeout(start, 60));
    if (!html.classList.contains('ydx-loading')) return go();
    const mo = new MutationObserver(() => { if (!html.classList.contains('ydx-loading')) { mo.disconnect(); go(); } });
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
  }
  if (!reduce.matches) begin();
})();
