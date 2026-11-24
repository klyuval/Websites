/* TOMI Ring Lab (ydx round 5): press, hold and let go to send a ring through the air in your model's colour.
 *
 * The store's motif is the ring: the logo ring, the stage's concentric ripple, the loader's progress ring. Here the
 * air itself is the toy. A small GPU fluid (stable-fluids style: advection, vorticity confinement, Jacobi pressure
 * projection; written for this page, WebGL 1 + half-float textures) moves "vapour" in the model's cream tint over the
 * stage's colour flood. A puff stamps an elliptical ring of vapour and a jet through its middle; the jet rolls the
 * ring's ends into a vortex pair, so it travels and curls like a real ring. The flood and its terraced rings refract
 * where the air moves. Drag to stir; the cursor alone nudges the air.
 *
 * Degrades: no WebGL or no renderable half floats -> a light canvas-2D version (rings that rise and fade over the
 * CSS flood); no JS -> the static designed page (CSS flood + rings + copy); reduced motion -> the air only moves
 * while you interact (no idle puffs); hub iframe / phones -> smaller grids; slow frames -> fewer pressure
 * iterations and a smaller canvas (stepped down, never back up). Paused in hidden tabs. No inline script, no eval.
 */
(function () {
  'use strict';
  var d = document.documentElement, html = d;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var reduced = html.classList.contains('lab-rm');
  var coarse = matchMedia('(pointer: coarse)').matches;
  var frameMode = html.classList.contains('ydx-frame');
  function ready() { html.classList.add('lab-ready'); }

  /* ------------------------------------------------------------------ copy (he / en, the store's key) */
  var T = {
    he: { back: 'חזרה לחנות', k: 'TOMI · מעבדת הטבעות', title: 'נשפו טבעת.', line: 'לחצו והחזיקו כדי לטעון, שחררו כדי לשלוח טבעת. גררו כדי לערבב את האוויר.',
      blow: 'שליחת טבעת', clear: 'ניקוי', rings: 'טבעות', hint: 'לחצו, החזיקו, שחררו', colour: 'צבע', shop: 'לחנות ', lang: 'EN',
      sent: function (n) { return 'טבעת נשלחה. ' + n + ' טבעות.'; }, rmHint: 'תנועה מופחתת: האוויר זז רק כשאתם נוגעים' },
    en: { back: 'Back to the store', k: 'TOMI · Ring Lab', title: 'Blow a ring.', line: 'Press and hold to charge, let go to send a ring. Drag to stir the air.',
      blow: 'Send a ring', clear: 'Clear', rings: 'rings', hint: 'Press, hold, let go', colour: 'Colour', shop: 'Shop ', lang: 'עב',
      sent: function (n) { return 'Ring sent. ' + n + ' rings.'; }, rmHint: 'Reduced motion: the air only moves while you touch it' }
  };
  var NAMES = { x: 'TOMI X', xl: 'TOMI XL', 'xl-plus': 'TOMI XL PLUS', ultima: 'TOMI ULTIMA' };
  var HEX = { x: '#17a673', xl: '#6b34b8', 'xl-plus': '#f28c0f', ultima: '#e0262c' };
  var lang = html.lang === 'en' ? 'en' : 'he', model = html.getAttribute('data-m') || 'xl';
  function t(k) { return T[lang][k]; }
  function applyText() {
    $$('[data-i]').forEach(function (el) {
      var k = el.getAttribute('data-i');
      if (k === 'back') { el.lastChild.textContent = ' ' + t('back'); return; }
      if (k === 'shop') { el.textContent = t('shop') + NAMES[model]; return; }
      if (k === 'hint' && reduced) { el.textContent = t('rmHint'); return; }
      el.textContent = t(k);
    });
    $$('[data-i-label]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i-label'))); });
    var lb = $('.lab-lang');
    if (lb) { lb.hidden = false; lb.textContent = t('lang'); lb.setAttribute('lang', lang === 'he' ? 'en' : 'he'); lb.setAttribute('aria-label', lang === 'he' ? 'English' : 'עברית'); }
  }

  /* ------------------------------------------------------------------ palette (the four models) */
  function hex3(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function mixc(a, k, b) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function css(c) { return '#' + c.map(function (v) { return ('0' + Math.round(v * 255).toString(16)).slice(-2); }).join(''); }
  function palette(id) {
    var c = hex3(HEX[id]), W = [1, 1, 1], K = [0, 0, 0], cream = [1, 0.973, 0.937];
    return { c1: mixc(c, 0.28, W), c2: c, c3: mixc(c, 0.32, K), ink: id === 'xl-plus', vap: mixc(cream, 0.14, mixc(c, 0.28, W)) };
  }
  var pal = palette(model), cur = { c1: pal.c1.slice(), c2: pal.c2.slice(), c3: pal.c3.slice(), ink: pal.ink ? 1 : 0 };
  function setModel(id, user) {
    if (!HEX[id]) return;
    model = id; pal = palette(id);
    var st = d.style;
    st.setProperty('--c1', css(pal.c1)); st.setProperty('--c2', css(pal.c2)); st.setProperty('--c3', css(pal.c3));
    html.classList.toggle('ink', pal.ink);
    html.setAttribute('data-m', id);
    var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', HEX[id]);
    $$('.lab-chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === id)); });
    var shop = $('.lab-shop'); if (shop) { shop.setAttribute('href', '/#/shop/' + id); shop.textContent = t('shop') + NAMES[id]; }
    try { sessionStorage.setItem('ydx-lab-m', id); } catch (e) {}
    if (user && sim) sim.puff(0.5, 0.2, 0.55, true); // a ring in the new colour says "this is the colour now"
  }

  /* ------------------------------------------------------------------ page transitions (the store's wipe) */
  function leave(href) {
    if (reduced || !document.body.animate) { location.href = href; return; }
    var w = document.createElement('div');
    w.className = 'lab-wipe'; w.setAttribute('aria-hidden', 'true');
    document.body.appendChild(w);
    var go = function () { if (go.done) return; go.done = 1; location.href = href; };
    setTimeout(go, 700);
    try { w.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 420, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).onfinish = go; }
    catch (e) { go(); }
  }
  addEventListener('pageshow', function (e) { if (e.persisted) $$('.lab-wipe').forEach(function (w) { w.remove(); }); });
  function backHref() {
    var h = '';
    try { h = sessionStorage.getItem('ydx-tomi-ret') || ''; } catch (e) {}
    return '/' + (/^#[\w\/-]{0,60}$/.test(h) ? h : '');
  }

  /* ------------------------------------------------------------------ UI wiring */
  function ui() {
    applyText();
    setModel(model);
    $$('.lab-back, .lab-brand').forEach(function (a) { a.setAttribute('href', backHref()); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.lab-back, .lab-brand, .lab-shop');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      leave(a.getAttribute('href'));
    });
    $$('.lab-chip').forEach(function (b) { b.addEventListener('click', function () { setModel(b.getAttribute('data-m'), true); }); });
    var lb = $('.lab-lang');
    if (lb) lb.addEventListener('click', function () {
      lang = lang === 'he' ? 'en' : 'he';
      try { localStorage.setItem('tomi-lang', lang); } catch (e) {}
      html.lang = lang; html.dir = lang === 'he' ? 'rtl' : 'ltr'; html.setAttribute('data-ydx-l', lang);
      applyText(); setModel(model);
    });
    $('.lab-blow').addEventListener('click', function () {
      if (!sim) return;
      var x = 0.5 + (Math.random() - 0.5) * 0.2;
      sim.puff(x, 0.18, 0.85);
      count++; paintCount();
      var sr = $('.lab-sr'); if (sr) sr.textContent = t('sent')(count);
      dismissHint();
    });
    $('.lab-clear').addEventListener('click', function () { if (sim) sim.clear(); });
  }
  var count = 0;
  function paintCount() {
    var b = $('.lab-count b');
    if (!b) return;
    b.textContent = String(count);
    if (!reduced && b.animate) b.animate([{ transform: 'translateY(10%)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  var hintGone = false;
  function dismissHint() { if (hintGone) return; hintGone = true; var h = $('.lab-hint'); if (h) h.classList.add('gone'); }

  /* ------------------------------------------------------------------ input on the canvas */
  var cv = $('.lab-gl'), sim = null, lastInput = -1e9;
  function input() {
    var charge = $('.lab-charge'), ringEl = charge && charge.querySelector('.r');
    var down = null, chargeRaf = 0, hx = -1, hy = -1, ht = 0;
    function uv(e) { return [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }
    function chargeLoop() {
      chargeRaf = 0;
      if (!down) return;
      var k = Math.min(1, (performance.now() - down.t) / 900);
      if (ringEl) ringEl.style.strokeDasharray = (k * 100).toFixed(1) + ' 100';
      if (charge) charge.style.transform = 'translate(' + down.x + 'px,' + down.y + 'px) scale(' + (0.6 + 0.4 * k).toFixed(3) + ')';
      chargeRaf = requestAnimationFrame(chargeLoop);
    }
    cv.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      down = { x: e.clientX, y: e.clientY, t: performance.now(), dist: 0, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
      lastInput = performance.now();
      if (sim) sim.wake();
      if (charge) { charge.classList.add('on'); chargeLoop(); }
    });
    cv.addEventListener('pointermove', function (e) {
      var now = performance.now();
      lastInput = now;
      if (!sim) return;
      if (down) {
        var dx = e.clientX - down.lx, dy = e.clientY - down.ly, dt = Math.max(8, now - down.lt);
        down.dist += Math.hypot(dx, dy);
        down.vx = dx / dt; down.vy = dy / dt;
        down.lx = e.clientX; down.ly = e.clientY; down.lt = now;
        down.x = e.clientX; down.y = e.clientY;
        if (down.dist > 40) { // a drag: stir the air (and drop the charge)
          if (charge) charge.classList.remove('on');
          var p = uv(e);
          sim.stir(p[0], p[1], dx / innerWidth, -dy / innerHeight, true);
          dismissHint();
        }
        sim.wake();
      } else if (e.pointerType === 'mouse' && !reduced) {
        // the cursor alone moves the air a little (no vapour)
        if (hx >= 0) { var p2 = uv(e); sim.stir(p2[0], p2[1], (e.clientX - hx) / innerWidth * 0.35, -(e.clientY - hy) / innerHeight * 0.35, false); }
        hx = e.clientX; hy = e.clientY; ht = now;
      }
    });
    function up(e) {
      if (!down) return;
      var d0 = down; down = null;
      if (charge) charge.classList.remove('on');
      lastInput = performance.now();
      if (!sim || d0.dist > 40 || (e && e.type === 'pointercancel')) return;
      var k = Math.min(1, (performance.now() - d0.t) / 900);
      var p = [d0.x / innerWidth, 1 - d0.y / innerHeight];
      sim.puff(p[0], p[1], 0.32 + 0.68 * k);
      count++; paintCount(); dismissHint();
      if (navigator.vibrate && coarse) try { navigator.vibrate(8); } catch (x) {}
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('lostpointercapture', function () { if (down) up(); });
    cv.addEventListener('pointerleave', function () { hx = -1; });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ------------------------------------------------------------------ the fluid (WebGL 1) */
  function Fluid(canvas) {
    var Q = frameMode ? { sim: 72, dye: 256, it: 8, dpr: 1 } : coarse ? { sim: 96, dye: 384, it: 12, dpr: 1.25 } : { sim: 128, dye: 640, it: 18, dpr: 1.5 };
    var gl = canvas.getContext('webgl', { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    var hf = gl.getExtension('OES_texture_half_float');
    if (!hf) return null;
    var linear = !!gl.getExtension('OES_texture_half_float_linear');
    gl.getExtension('EXT_color_buffer_half_float');
    var TYPE = hf.HALF_FLOAT_OES;
    var HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
    var VS = 'precision highp float;attribute vec2 a;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 uTx;' +
      'void main(){vUv=a*.5+.5;vL=vUv-vec2(uTx.x,0.);vR=vUv+vec2(uTx.x,0.);vT=vUv+vec2(0.,uTx.y);vB=vUv-vec2(0.,uTx.y);gl_Position=vec4(a,0.,1.);}';
    var FS = {
      clear: 'varying vec2 vUv;uniform sampler2D uT;uniform float uVal;void main(){gl_FragColor=uVal*texture2D(uT,vUv);}',
      // stamps a gaussian (or an elliptical ring) oriented along uD; uR = (across, along) radii in screen-height units
      splat: 'varying vec2 vUv;uniform sampler2D uT;uniform float uAsp,uRing;uniform vec2 uP,uD,uR;uniform vec3 uC;' +
        'void main(){vec2 p=vUv-uP;p.x*=uAsp;vec2 n=vec2(-uD.y,uD.x);float u=dot(p,n)/uR.x,v=dot(p,uD)/uR.y;float e=u*u+v*v;' +
        'float g=uRing>.5?exp(-pow((sqrt(e)-1.)/.3,2.)):exp(-e);gl_FragColor=vec4(texture2D(uT,vUv).rgb+g*uC,1.);}',
      advect: 'varying vec2 vUv;uniform sampler2D uV,uS;uniform vec2 uTx,uStx;uniform float uDt,uDis;' +
        'vec4 bl(sampler2D s,vec2 uv,vec2 ts){vec2 st=uv/ts-.5;vec2 i=floor(st),f=fract(st);' +
        'vec4 a=texture2D(s,(i+vec2(.5,.5))*ts),b=texture2D(s,(i+vec2(1.5,.5))*ts),c=texture2D(s,(i+vec2(.5,1.5))*ts),d=texture2D(s,(i+vec2(1.5,1.5))*ts);' +
        'return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}' +
        'void main(){\n#ifdef MANUAL\nvec2 co=vUv-uDt*bl(uV,vUv,uTx).xy*uTx;vec4 r=bl(uS,co,uStx);\n#else\nvec2 co=vUv-uDt*texture2D(uV,vUv).xy*uTx;vec4 r=texture2D(uS,co);\n#endif\ngl_FragColor=r/(1.+uDis*uDt);}',
      div: 'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uV;void main(){float L=texture2D(uV,vL).x,R=texture2D(uV,vR).x,T=texture2D(uV,vT).y,B=texture2D(uV,vB).y;' +
        'vec2 C=texture2D(uV,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
      curl: 'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uV;void main(){float L=texture2D(uV,vL).y,R=texture2D(uV,vR).y,T=texture2D(uV,vT).x,B=texture2D(uV,vB).x;' +
        'gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
      vort: 'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uV,uC;uniform float uCurl,uDt;void main(){float L=texture2D(uC,vL).x,R=texture2D(uC,vR).x,T=texture2D(uC,vT).x,B=texture2D(uC,vB).x,C=texture2D(uC,vUv).x;' +
        'vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=uCurl*C;f.y*=-1.;vec2 v=texture2D(uV,vUv).xy+f*uDt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}',
      pres: 'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uP,uD;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;' +
        'gl_FragColor=vec4((L+R+B+T-texture2D(uD,vUv).x)*.25,0.,0.,1.);}',
      grad: 'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uP,uV;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;' +
        'vec2 v=texture2D(uV,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}',
      // the stage flood + the store's terraced rings, refracted by the moving air, with lit vapour on top
      show: 'varying vec2 vUv;uniform sampler2D uDye,uV;uniform vec3 uC1,uC2,uC3;uniform float uAsp,uT,uInk;uniform vec2 uDtx,uPx;uniform vec4 uM0,uM1;' +
        'float box(vec4 r){vec2 e=uPx*36.;return smoothstep(r.x-e.x,r.x+e.x,vUv.x)*(1.-smoothstep(r.z-e.x,r.z+e.x,vUv.x))*smoothstep(r.y-e.y,r.y+e.y,vUv.y)*(1.-smoothstep(r.w-e.y,r.w+e.y,vUv.y));}' +
        'float den(vec2 uv){vec3 c=texture2D(uDye,uv).rgb;return max(c.r,max(c.g,c.b));}' +
        'void main(){vec2 vel=texture2D(uV,vUv).xy;vec2 uv=vUv-vel*.0004;' +
        'vec2 q=vec2((uv.x-.5)/1.2,(uv.y-.58)/.7);float rr=length(q);' +
        'vec3 col=rr<.46?mix(uC1,uC2,rr/.46):mix(uC2,uC3,clamp((rr-.46)/.54,0.,1.));' +
        'vec2 p=uv-vec2(.5,.56);p.x*=uAsp;float d=length(p)/(.5*length(vec2(uAsp,1.)));' +
        'float tr=.08*step(d,.15)+.055*step(.15,d)*step(d,.3)+.035*step(.3,d)*step(d,.48)+.018*step(.48,d)*step(d,.68);' +
        'float w=fract(d*1.4-uT*.12);tr+=.04*smoothstep(0.,.02,w)*(1.-smoothstep(.02,.4,w))*max(0.,1.-d);' +
        'col=mix(col,uInk>.5?vec3(.055,.05,.047):vec3(1.,.973,.937),tr);' +
        'vec3 dy=texture2D(uDye,vUv).rgb;float a=max(dy.r,max(dy.g,dy.b));vec3 vc=dy/max(a,.001);' +
        'float gx=den(vUv+vec2(uDtx.x,0.))-den(vUv-vec2(uDtx.x,0.)),gy=den(vUv+vec2(0.,uDtx.y))-den(vUv-vec2(0.,uDtx.y));' +
        'vec3 n=normalize(vec3(-gx,-gy,.22));float li=clamp(dot(n,normalize(vec3(-.35,.6,.7))),0.,1.);' +
        'float A=(1.-exp(-a*2.2))*(1.-.72*max(box(uM0),box(uM1)));col=mix(col,vc*(.86+.2*li),A);' +
        'float g=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));gl_FragColor=vec4(col+(g-.5)/255.,1.);}'
    };
    var P = {}, vel, dye, pres, div, curlT, quad, simW, simH, dyeW, dyeH, iters = Q.it, scale = 1, stepped = 0;
    function prog(fs, defs) {
      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
        return s;
      }
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, (defs || '') + HEAD + fs));
      gl.bindAttribLocation(p, 0, 'a');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
      return { p: p, u: u };
    }
    function tex(w, h) {
      var filter = linear ? gl.LINEAR : gl.NEAREST;
      gl.activeTexture(gl.TEXTURE0);
      var tx = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, TYPE, null);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('half-float target not renderable');
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t: tx, f: fb, w: w, h: h, at: function (i) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); return i; } };
    }
    function dbl(w, h) {
      var a = tex(w, h), b = tex(w, h);
      return { w: w, h: h, tx: [1 / w, 1 / h], get r() { return a; }, get wr() { return b; }, swap: function () { var x = a; a = b; b = x; } };
    }
    function res(n) {
      var asp = canvas.clientWidth / Math.max(1, canvas.clientHeight), lo = n, hi = Math.round(n * (asp < 1 ? 1 / asp : asp));
      return asp >= 1 ? [hi, lo] : [lo, hi];
    }
    function build() {
      var md = linear ? '' : '#define MANUAL\n';
      P = { clear: prog(FS.clear), splat: prog(FS.splat), advect: prog(FS.advect, md), div: prog(FS.div), curl: prog(FS.curl), vort: prog(FS.vort), pres: prog(FS.pres), grad: prog(FS.grad), show: prog(FS.show) };
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      var s = res(Q.sim), dd = res(Q.dye);
      simW = s[0]; simH = s[1]; dyeW = dd[0]; dyeH = dd[1];
      vel = dbl(simW, simH); dye = dbl(dyeW, dyeH); pres = dbl(simW, simH);
      div = tex(simW, simH); curlT = tex(simW, simH);
      vel.tx = [1 / simW, 1 / simH]; div.tx = vel.tx;
    }
    function blit(target) {
      if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); }
      else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function use(p) { gl.useProgram(p.p); return p.u; }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, Q.dpr) * scale;
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    var asp = function () { return canvas.clientWidth / Math.max(1, canvas.clientHeight); };
    function splat(target, x, y, dx, dy, rx, ry, c, ring) {
      var u = use(P.splat);
      gl.uniform1i(u.uT, target.r.at(0));
      gl.uniform1f(u.uAsp, asp());
      gl.uniform1f(u.uRing, ring ? 1 : 0);
      gl.uniform2f(u.uP, x, y);
      gl.uniform2f(u.uD, dx, dy);
      gl.uniform2f(u.uR, rx, ry);
      gl.uniform3f(u.uC, c[0], c[1], c[2]);
      blit(target.wr); target.swap();
    }
    function step(dt) {
      var u;
      u = use(P.curl); gl.uniform2fv(u.uTx, vel.tx); gl.uniform1i(u.uV, vel.r.at(0)); blit(curlT);
      u = use(P.vort); gl.uniform2fv(u.uTx, vel.tx); gl.uniform1i(u.uV, vel.r.at(0)); gl.uniform1i(u.uC, curlT.at(1));
      gl.uniform1f(u.uCurl, 7); gl.uniform1f(u.uDt, dt); blit(vel.wr); vel.swap();
      u = use(P.div); gl.uniform2fv(u.uTx, vel.tx); gl.uniform1i(u.uV, vel.r.at(0)); blit(div);
      u = use(P.clear); gl.uniform1i(u.uT, pres.r.at(0)); gl.uniform1f(u.uVal, 0.8); blit(pres.wr); pres.swap();
      u = use(P.pres); gl.uniform2fv(u.uTx, vel.tx); gl.uniform1i(u.uD, div.at(0));
      for (var i = 0; i < iters; i++) { gl.uniform1i(u.uP, pres.r.at(1)); blit(pres.wr); pres.swap(); }
      u = use(P.grad); gl.uniform2fv(u.uTx, vel.tx); gl.uniform1i(u.uP, pres.r.at(0)); gl.uniform1i(u.uV, vel.r.at(1)); blit(vel.wr); vel.swap();
      u = use(P.advect); gl.uniform2fv(u.uTx, vel.tx); gl.uniform2fv(u.uStx, vel.tx); gl.uniform1i(u.uV, vel.r.at(0)); gl.uniform1i(u.uS, vel.r.at(0));
      gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uDis, 0.35); blit(vel.wr); vel.swap();
      gl.uniform2fv(u.uStx, [1 / dyeW, 1 / dyeH]); gl.uniform1i(u.uV, vel.r.at(0)); gl.uniform1i(u.uS, dye.r.at(1));
      gl.uniform1f(u.uDis, 0.62); blit(dye.wr); dye.swap();
    }
    var clock = 0;
    // the copy and the counter keep a clear view: vapour thins to ~28% over them (uv rects, y up)
    var masks = [[0, 0, 0, 0], [0, 0, 0, 0]];
    function measure() {
      var W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
      ['.lab-copy', '.lab-count'].forEach(function (s, i) {
        var el = document.querySelector(s), r = el && el.getBoundingClientRect();
        masks[i] = r && r.width ? [r.left / W, 1 - r.bottom / H, r.right / W, 1 - r.top / H] : [0, 0, 0, 0];
      });
    }
    measure();
    new MutationObserver(measure).observe(html, { attributes: true, attributeFilter: ['dir', 'lang'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    function show() {
      size();
      var u = use(P.show);
      gl.uniform2fv(u.uTx, [1 / canvas.width, 1 / canvas.height]);
      gl.uniform1i(u.uDye, dye.r.at(0)); gl.uniform1i(u.uV, vel.r.at(1));
      gl.uniform3fv(u.uC1, cur.c1); gl.uniform3fv(u.uC2, cur.c2); gl.uniform3fv(u.uC3, cur.c3);
      gl.uniform1f(u.uAsp, asp()); gl.uniform1f(u.uT, clock % 1000); gl.uniform1f(u.uInk, cur.ink);
      gl.uniform2f(u.uDtx, 1.5 / dyeW, 1.5 / dyeH);
      gl.uniform2f(u.uPx, 1 / canvas.clientWidth, 1 / canvas.clientHeight);
      gl.uniform4fv(u.uM0, masks[0]); gl.uniform4fv(u.uM1, masks[1]);
      blit(null);
    }
    // a puff: an elliptical ring of vapour across the direction of travel, and a jet through its middle
    function puff(x, y, k, quiet) {
      var dx = (Math.random() - 0.5) * 0.25, dy = 1, l = Math.hypot(dx, dy); dx /= l; dy /= l;
      var R = 0.05 + 0.07 * k;
      var v = pal.vap;
      var q = 0.5 + 0.45 * k;
      splat(dye, x, y, dx, dy, R, R * 0.34, [v[0] * q, v[1] * q, v[2] * q], true);
      splat(dye, x, y - R * 0.15, dx, dy, R * 0.55, R * 0.3, [v[0] * 0.22 * k, v[1] * 0.22 * k, v[2] * 0.22 * k], false);
      var f = 110 + 190 * k;
      splat(vel, x, y, dx, dy, R * 0.8, R * 0.55, [dx * f, dy * f, 0], false);
      if (!quiet) lastPuff = performance.now();
      wake();
    }
    function stir(x, y, dx, dy, ink) {
      var f = 5200, l = Math.hypot(dx, dy);
      if (l < 1e-5) return;
      splat(vel, x, y, dx / l, dy / l, 0.04, 0.04, [dx * f, dy * f, 0], false);
      if (ink) { var v = pal.vap, a = Math.min(0.25, l * 6); splat(dye, x, y, dx / l, dy / l, 0.03, 0.03, [v[0] * a, v[1] * a, v[2] * a], false); }
      wake();
    }
    function clear() {
      [vel, dye, pres].forEach(function (D) { [D.r, D.wr].forEach(function (T) { gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.viewport(0, 0, T.w, T.h); gl.clear(gl.COLOR_BUFFER_BIT); }); });
      wake();
    }
    // loop: paused in hidden tabs; with reduced motion it only runs for a moment after each input
    var raf = 0, last = 0, ema = 16, slow = 0, lastPuff = -1e9, nextIdle = 0;
    function frame(ts) {
      raf = 0;
      if (document.hidden || gl.isContextLost()) return;
      var dt = last ? Math.min(1 / 30, (ts - last) / 1000) : 1 / 60;
      last = ts;
      // adaptive: sustained slow frames -> fewer pressure iterations, then a smaller canvas (two steps at most)
      ema += ((ts - (frame.p || ts)) - ema) * 0.05; frame.p = ts;
      if (ema > 34 && ++slow > 45 && stepped < 2) { slow = 0; stepped++; iters = Math.max(6, iters - 6); scale *= 0.75; }
      // palette eases to the chosen model
      var k = 1 - Math.exp(-dt / 0.22);
      ['c1', 'c2', 'c3'].forEach(function (n) { cur[n] = mixc(cur[n], k, pal[n]); });
      cur.ink += ((pal.ink ? 1 : 0) - cur.ink) * k;
      if (!reduced) clock += dt;
      // idle: after a few quiet seconds the lab sends a ring of its own now and then (never under reduced motion)
      if (!reduced && ts - lastInput > 6000 && ts - lastPuff > 3000 && ts > nextIdle) {
        nextIdle = ts + 3200 + Math.random() * 1800;
        puff(0.25 + Math.random() * 0.5, 0.12 + Math.random() * 0.08, 0.5 + Math.random() * 0.35, true);
      }
      step(dt);
      show();
      if (!reduced || ts - lastInput < 2500) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0; });
    canvas.addEventListener('webglcontextrestored', function () { try { build(); wake(); } catch (e) {} });
    addEventListener('resize', function () { size(); measure(); if (!raf) { try { show(); } catch (e) {} } });
    build();
    size();
    show();
    return { puff: puff, stir: stir, clear: clear, wake: wake, info: function () { return { sim: [simW, simH], dye: [dyeW, dyeH], iters: iters, scale: scale, linear: linear, ema: +ema.toFixed(1) }; } };
  }

  /* ------------------------------------------------------------------ light fallback: canvas 2D rings */
  function Rings2D(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    html.classList.add('lab-2d');
    var rings = [], raf = 0, last = 0;
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(ts) {
      raf = 0;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var ink = html.classList.contains('ink');
      for (var i = rings.length - 1; i >= 0; i--) {
        var r = rings[i];
        r.age += reduced ? 10 : dt;
        if (r.age > 4) { rings.splice(i, 1); continue; }
        var y = r.y - (reduced ? 0 : r.age * 70 * r.k), rx = r.r * (1 + r.age * 0.5), a = reduced ? 0.7 : Math.max(0, 1 - r.age / 4);
        ctx.beginPath();
        ctx.ellipse(r.x, y, rx, rx * 0.34, 0, 0, Math.PI * 2);
        ctx.lineWidth = r.r * 0.35 * (1 - r.age / 5);
        ctx.strokeStyle = ink ? 'rgba(14,13,12,' + (a * 0.5) + ')' : 'rgba(255,248,239,' + (a * 0.75) + ')';
        ctx.stroke();
      }
      if (rings.length && !reduced) raf = requestAnimationFrame(draw);
    }
    function wake() { if (!raf) { last = 0; raf = requestAnimationFrame(draw); } }
    addEventListener('resize', function () { size(); wake(); });
    size();
    return {
      puff: function (x, y, k) { rings.push({ x: x * innerWidth, y: (1 - y) * innerHeight, r: 30 + 60 * k, k: k, age: 0 }); if (rings.length > 24) rings.shift(); wake(); },
      stir: function () {}, clear: function () { rings.length = 0; wake(); }, wake: wake, info: function () { return { mode: '2d' }; }
    };
  }

  /* ------------------------------------------------------------------ boot */
  function start() {
    ui();
    try { sim = Fluid(cv); } catch (e) { sim = null; }
    if (!sim) {
      // a failed WebGL context can't be swapped for a 2D one on the same canvas
      var c2 = document.createElement('canvas');
      c2.className = 'lab-gl'; c2.setAttribute('aria-hidden', 'true');
      cv.replaceWith(c2); cv = c2;
      sim = Rings2D(cv);
    }
    input();
    window.__lab = function () { return sim && sim.info(); }; // QA handle (read-only)
    // first frame is on screen: let the loader go
    requestAnimationFrame(function () { requestAnimationFrame(ready); });
    if (sim && !reduced) setTimeout(function () { sim.puff(0.5, 0.16, 0.8, true); }, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
