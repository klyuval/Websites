/* MyChef Israel, round 5: "the table is lit". One fixed, low-resolution WebGL canvas over the whole page, blended with
   mix-blend-mode: soft-light, so it only moves light and shade across what is already there (the woven cloths, the
   plates, the type) and never repaints the palette. It draws:
     - dappled window light through an olive tree, attached to the table (it scrolls with the page) and stirred by
       scroll speed, like a breeze through the leaves
     - a candle that follows the pointer / the last touch (with a flame's flicker), drifting on its own when idle;
       scroll speed stretches it along the scroll
     - a glass "ting": a ring of light from every click or tap on the cloth (stronger when you tap a glass or a candle)
     - the evening getting later as you scroll: each cloth has its own light (cool linen daylight, amber on the
       pomegranate, candle-warm on the wine cloth, low and dark on the night footer), eased between sections.
   Soft-light with 0.5 grey is an identity, so the output is kept to a narrow band around it (0.41-0.60), and over
   the pomegranate cloths it never brightens at all (their pale copy is at 4.58:1 already): text keeps WCAG AA on
   every frame (worked out per cloth and sampled from screenshots, see CHANGES.md round 5).
   Fallbacks: no WebGL / software GPU -> the static CSS light on the wrapper (enhance.css 5a); reduced motion -> one
   still frame, no loop; hub iframe -> half resolution, 30 fps; hidden tab -> stopped. Adaptive quality from a frame
   time EMA. API (used by enhance.js and /play/): window.ydxLight.ting(x, y, strength), .mood(name), .ready.
   No eval, no inline handlers: CSP-safe. Simplex noise: Ashima Arts / Stefan Gustavson (MIT). */
(() => {
  'use strict';
  if (window.ydxLight) return;
  const api = window.ydxLight = { ready: false, ting() {}, mood() {}, pause() {} };
  const doc = document.documentElement;
  const RMq = matchMedia('(prefers-reduced-motion: reduce)');
  const FRAME = window.self !== window.top;
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const isApp = location.pathname.indexOf('/play') !== 0;   // the React page (the /play/ table is ours)

  /* Moods: [warm light tint rgb, cool shade tint rgb, dapple amount, candle amount, vignette] */
  const MOODS = {
    teal:    [[1, .80, .52], [.75, .88, 1], .95, 1.0, 1.0],
    linen:   [[1, .90, .70], [.70, .82, 1], 1.25, .85, .8],
    saffron: [[1, .86, .56], [.80, .85, 1], 1.0, .9, .85],
    pom:     [[1, .76, .52], [.80, .80, 1], .85, 1.0, 1.0],
    wine:    [[1, .72, .45], [.85, .80, 1], .6, 1.25, 1.25],
    night:   [[1, .74, .48], [.80, .85, 1], .35, 1.1, 1.3]
  };
  let moodName = 'teal';
  const cur = { w: MOODS.teal[0].slice(), c: MOODS.teal[1].slice(), a: MOODS.teal[2], k: MOODS.teal[3], v: MOODS.teal[4] };

  const NOISE = [
    'vec3 pm(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float sn(vec2 v){',
    ' const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);',
    ' vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.);',
    ' vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;',
    ' vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;',
    ' m*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    ' return 130.*dot(m,g);}'
  ].join('\n');
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    // packed uniforms (fewer WebGL calls per frame): uA = time, stir, scroll, velocity; uB = dapple, candle, pointer
    // presence, vignette; uC = pointer xy, resolution
    'uniform vec4 uA,uB,uC; uniform float uHi;',
    '#define uTime uA.x', '#define uStir uA.y', '#define uScroll uA.z', '#define uVel uA.w',
    '#define uAmt uB.x', '#define uCan uB.y', '#define uPtrA uB.z', '#define uVig uB.w',
    '#define uPtr uC.xy', '#define uRes uC.zw',
    'uniform vec3 uWarm,uCool; uniform vec4 uTing; uniform vec4 uNo[3];',
    NOISE,
    'void main(){',
    ' float m=min(uRes.x,uRes.y);',
    ' vec2 p=(gl_FragCoord.xy-.5*uRes)/m;',
    // the leaf pattern belongs to the table: it scrolls with the page
    ' vec2 q=vec2(p.x,p.y-uScroll)*1.25;',
    ' float t=uTime, s=uStir;',
    ' vec2 w=vec2(sn(q*.9+vec2(t*.018,-t*.014)),sn(q*1.1+vec2(4.1-t*.016,s*.6)));',
    ' vec2 wq=q*2.6+.7*w+vec2(t*.03+s*.45,t*.012);',
    ' float leaf=sn(wq)*.62+sn(wq*2.3+vec2(7.3,s*.9+t*.05))*.38;',
    ' float dap=smoothstep(-.12,.3,leaf)-.5;',
    // window light falls from the top of the room, stronger on one side
    ' float sun=.45+.55*smoothstep(.95,-.7,p.x*.45-p.y*.85);',
    ' float L=dap*uAmt*sun;',
    ' vec3 col=vec3(.5)+max(L,0.)*.13*uWarm+min(L,0.)*.15*uCool;',
    // the candle: pointer / last touch, stretched along the scroll when the page moves fast
    ' vec2 d=p-(uPtr-.5*uRes)/m; d.y/=1.+abs(uVel)*.9; d.x*=1.+abs(uVel)*.25;',
    ' float fl=.86+.1*sn(vec2(t*2.7,1.7))+.05*sn(vec2(t*8.3,4.2));',
    ' float rr=dot(d,d);',
    ' float can=(exp(-rr*3.4)*.85+exp(-rr*22.)*.5)*fl*uCan*uPtrA;',
    ' col+=can*.19*uWarm;',
    // ting: a ring of light from a click / tap, like a struck glass
    ' vec2 e=p-(uTing.xy-.5*uRes)/m; float r=length(e), R=uTing.z*.55;',
    ' float ring=exp(-pow((r-R)/(.018+.05*uTing.z),2.))*(1.-uTing.z)*(1.-uTing.z)*uTing.w;',
    ' col+=ring*.16*vec3(1.,.93,.8);',
    // the evening: a soft vignette, deeper on the darker cloths
    ' vec2 uv=gl_FragCoord.xy/uRes-.5;',
    ' col-=smoothstep(.18,.62,dot(uv,uv)*1.6)*.075*uVig;',
    // no brightening at all over the pomegranate cloths: their pale body copy sits right at AA (4.58:1) already
    ' float cap=uHi; for(int i=0;i<3;i++){ vec4 b=uNo[i]; if(gl_FragCoord.x>b.x&&gl_FragCoord.x<b.z&&gl_FragCoord.y>b.y&&gl_FragCoord.y<b.w) cap=.5; }',
    ' col=clamp(col,vec3(.41),vec3(cap));',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  const begin = () => {
    if (!document.body) return;
    const RM = RMq.matches;
    const host = document.createElement('ydx-light');   // custom element: React's hydration never mistakes it for its root
    host.className = 'ydx-light';
    host.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    host.appendChild(cv);
    document.body.appendChild(host);

    let gl = null;
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !window.__ydxAllowSoftware };
    try { gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
    if (!gl) { host.setAttribute('data-state', 'fallback'); doc.classList.add('ydx-nogl'); return; }

    let prog = null, U = {};
    const sent = { w: '', c: '', no: '' };
    function build() {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
      const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ['uA', 'uB', 'uC', 'uHi', 'uWarm', 'uCool', 'uTing', 'uNo'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1f(U.uHi, .6);
      sent.w = sent.c = sent.no = '';
      return true;
    }
    if (!build()) { host.setAttribute('data-state', 'fallback'); doc.classList.add('ydx-nogl'); return; }

    /* resolution: the light is low-frequency, so it renders well below CSS resolution and the compositor scales it */
    let scale = window.__ydxLightScale || (FRAME ? .25 : COARSE ? .32 : .5);   // (__ydxLightScale: test hook)
    const MINSCALE = .2;
    let W = 0, H = 0, need = true;
    const size = () => {
      const w = Math.max(1, Math.round(innerWidth * scale)), h = Math.max(1, Math.round(innerHeight * scale));
      if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; gl.viewport(0, 0, W, H); }
      need = false;
    };
    addEventListener('resize', () => { need = true; if (RMq.matches) still(); }, { passive: true });

    /* inputs: one pointer state, one scroll state, one clock */
    let px = innerWidth * .62, py = innerHeight * .38, tx = px, ty = py, lastInput = -1e9, presence = 0;
    let sy = scrollY, vel = 0, stir = 0;
    const tingS = { x: 0, y: 0, t0: -1e9, s: 0 };
    const onMove = (x, y) => { tx = x; ty = y; lastInput = performance.now(); wake(); };
    addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
    addEventListener('touchstart', e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
    addEventListener('touchmove', e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
    let rmT = 0;
    addEventListener('scroll', () => {
      if (!RMq.matches) return wake();
      // reduced motion: no loop; once the page comes to rest, show that cloth's light (a state change, not motion)
      clearTimeout(rmT); rmT = setTimeout(still, 220);
    }, { passive: true });
    api.ting = (x, y, s) => { tingS.x = x; tingS.y = y; tingS.t0 = performance.now(); tingS.s = s == null ? 1 : s; wake(); };
    // a click or tap on the cloth rings like a glass (not on form fields, not inside the booking sheet)
    addEventListener('pointerdown', e => {
      const el = e.target;
      if (!el || !el.closest || el.closest('input,textarea,select,[data-booking],.booking,.ydx-noting')) return;
      const glass = el.closest('.piece, .ydx-glass');
      const g = glass && glass.querySelector && glass.querySelector('img[src*="/wine"],img[src*="/water"],img[src*="/coupe"],img[src*="/light-"],img[src*="/kiddush"]');
      api.ting(e.clientX, e.clientY, g ? 1.25 : el.closest('a,button') ? .55 : .8);
    }, { passive: true });

    /* mood: which cloth is under the middle of the screen (checked a few times a second, not every frame) */
    api.mood = n => { if (MOODS[n]) moodName = n; manualMood = true; wake(); };
    let manualMood = !isApp, moodTick = 0;
    const findMood = () => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight * .55);
      if (!el || !el.closest) return;
      if (el.closest('.foot')) { moodName = 'night'; return; }
      const c = el.closest('.cloth');
      if (!c) return;
      const m = /cloth--(teal|linen|saffron|pom|wine)/.exec(c.className);
      if (m) moodName = m[1];
    };

    /* frame rate: the light moves slowly, so it is drawn at 60fps only while the hand or the page is moving (desktop),
       otherwise at 30fps; phones and the hub iframe at 30 / 20fps. The adaptive step adds to this when frames are slow. */
    const BASE = FRAME || COARSE ? 2 : 1;
    let raf = 0, last = 0, t = 0, ema = 16, slow = 0, fast = 0, stepped = false, extra = 0, every = BASE, skip = 0;
    let shown = false, stillMode = false;
    const stats = api.stats = { frames: 0, ms: 0, rects: 0, mood: 0, gl: 0 };
    // pomegranate cloths on screen (re-listed now and then: React re-mounts the page on a language change)
    let poms = [], pomTick = 0;
    const noB = new Float32Array(12);
    const pomRects = () => {
      noB.fill(-1);
      if (!isApp) return;
      if (pomTick-- <= 0) { poms = [...document.querySelectorAll('.cloth--pom')]; pomTick = 60; }
      let k = 0;
      for (let i = 0; i < poms.length && k < 3; i++) {
        const r = poms[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || r.width < 1) continue;
        noB[k * 4] = r.left * scale - 1; noB[k * 4 + 1] = H - r.bottom * scale - 1;
        noB[k * 4 + 2] = r.right * scale + 1; noB[k * 4 + 3] = H - r.top * scale + 1; k++;
      }
    };
    function draw() {
      if (need) size();
      gl.uniform4f(U.uC, px * scale, H - py * scale, W, H);
      // scroll in "min side" units, wrapped so mediump stays precise on long pages (the pattern is non-periodic; the
      // wrap jump would come every ~40 screens, far off a normal read)
      gl.uniform4f(U.uA, t % 1000, stir % 1000, stillMode ? 0 : (scrollY / Math.min(innerWidth, innerHeight)) % 40, Math.max(-1.2, Math.min(1.2, vel)));
      gl.uniform4f(U.uB, cur.a, cur.k, presence, cur.v);
      const r0 = performance.now();
      pomRects();
      stats.rects += performance.now() - r0;
      // colours and the no-brighten rects change rarely: only sent when they do
      const kn = noB.join(), kw = cur.w.concat(cur.c).map(v => v.toFixed(3)).join();
      if (kn !== sent.no) { gl.uniform4fv(U.uNo, noB); sent.no = kn; }
      if (kw !== sent.w) { gl.uniform3fv(U.uWarm, cur.w); gl.uniform3fv(U.uCool, cur.c); sent.w = kw; }
      const age = (performance.now() - tingS.t0) / 1400;
      gl.uniform4f(U.uTing, tingS.x * scale, H - tingS.y * scale, Math.min(1, Math.max(0, age)), age < 1 ? tingS.s : 0);
      const g0 = performance.now();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      stats.gl += performance.now() - g0;
      if (!shown) { shown = true; host.setAttribute('data-state', 'ready'); api.ready = true; }
    }
    function ease(k) {
      const M = MOODS[moodName];
      for (let i = 0; i < 3; i++) { cur.w[i] += (M[0][i] - cur.w[i]) * k; cur.c[i] += (M[1][i] - cur.c[i]) * k; }
      cur.a += (M[2] - cur.a) * k; cur.k += (M[3] - cur.k) * k; cur.v += (M[4] - cur.v) * k;
    }
    function frame(now) {
      raf = 0;
      if (document.hidden || paused) return;
      const dt = Math.min(50, last ? now - last : 16);
      last = now;
      const active = now - lastInput < 1500 || Math.abs(vel) > .02 || now - tingS.t0 < 1400;
      every = BASE + (active ? 0 : 1) + extra;
      if (++skip % every) { raf = requestAnimationFrame(frame); return; }
      const c0 = performance.now();
      const step = Math.min(120, now - (frame.lastDraw || now - 16 * every));
      frame.lastDraw = now;
      t += step / 1000;
      // pointer: the candle trails the hand a little (tau ~140ms); after 4s idle it drifts on its own
      const idle = now - lastInput > 4000;
      if (idle) {
        const k = t * .11;
        tx = innerWidth * (.5 + .32 * Math.sin(k * 1.3)); ty = innerHeight * (.42 + .22 * Math.sin(k * 1.9 + 1.1));
      }
      const kp = 1 - Math.exp(-step / (idle ? 900 : 140));
      px += (tx - px) * kp; py += (ty - py) * kp;
      presence += ((idle ? .55 : 1) - presence) * (1 - Math.exp(-step / 600));
      // scroll velocity (screens per second, smoothed) stirs the leaves and stretches the candle
      const y = scrollY, v = (y - sy) / Math.max(1, innerHeight) / (step / 1000);
      sy = y;
      vel += (Math.max(-3, Math.min(3, v)) * .35 - vel) * (1 - Math.exp(-step / 120));
      stir += Math.abs(vel) * step / 1000 * .9;
      if (!manualMood && ++moodTick % 12 === 0) { const m0 = performance.now(); findMood(); stats.mood += performance.now() - m0; }
      ease(1 - Math.exp(-step / 650));
      draw();
      stats.frames++; stats.ms += performance.now() - c0;
      // adaptive quality: EMA of the frame time; step the resolution down when slow, once back up when fast
      ema += (dt - ema) * .05;
      if (ema > 24) { if (++slow > 45) { slow = 0; if (scale > MINSCALE) { scale = Math.max(MINSCALE, scale * .75); need = true; } else if (extra < 2) extra++; } } else slow = 0;
      if (ema < 12 && !stepped) { if (++fast > 240) { fast = 0; stepped = true; if (scale < .5 && !COARSE && !FRAME) { scale = Math.min(.5, scale / .75); need = true; } } } else fast = 0;
      raf = requestAnimationFrame(frame);
    }
    // test hook: the JS cost of one frame's work (inputs, mood, uniforms, draw call), timed over n synchronous runs
    api.bench = n => { const p0 = paused; paused = false; const a = performance.now(); for (let i = 0; i < n; i++) { moodTick = 11; frame.lastDraw = 0; skip = -1; const r = raf; frame(performance.now()); cancelAnimationFrame(raf); raf = r; } const ms = (performance.now() - a) / n; paused = p0; return ms; };
    let paused = false;
    api.pause = on => { paused = !!on; if (!paused) wake(); };
    function wake() { if (!raf && !document.hidden && !paused && !RMq.matches) { last = 0; raf = requestAnimationFrame(frame); } }
    function still() {   // reduced motion: one quiet frame, candle resting at the upper middle, no scroll coupling
      cancelAnimationFrame(raf); raf = 0;
      px = tx = innerWidth * .55; py = ty = innerHeight * .32; presence = .7; vel = 0;
      need = true;
      if (!manualMood) findMood();
      ease(1);
      stillMode = true;   // the leaves stay put: not coupled to the scroll either
      draw();
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    RMq.addEventListener && RMq.addEventListener('change', () => { if (RMq.matches) still(); else { stillMode = false; wake(); } });

    /* context loss: stop, then rebuild and carry on */
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; host.setAttribute('data-state', 'lost'); }, false);
    cv.addEventListener('webglcontextrestored', () => { U = {}; if (build()) { W = H = 0; need = true; host.setAttribute('data-state', 'ready'); RMq.matches ? still() : wake(); } }, false);
    addEventListener('pageshow', e => { if (e.persisted) wake(); });

    if (RM) still(); else wake();
  };

  /* In the app, wait until React has hydrated (a node appended to <body> before that is harmless with React 19, but
     there is no reason to risk it) or 8s, whichever comes first. The light then fades in under the lifting loader. */
  const hydrated = () => {
    const b = document.querySelector('.language-switch button');
    return !!b && Object.keys(b).some(k => k.startsWith('__reactProps'));
  };
  const t0 = performance.now();
  const wait = () => {
    if (!document.body) return setTimeout(wait, 50);
    if (!isApp || hydrated() || performance.now() - t0 > 8000) begin();
    else setTimeout(wait, 80);
  };
  wait();
})();
