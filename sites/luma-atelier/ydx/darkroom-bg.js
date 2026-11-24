/* ydx darkroom-bg.js (round 5): the living darkroom behind AlexStudio's olive sections.
 *
 * Idea: the site is a darkroom and framing workshop. Its flat olive-black grounds become the surface of a developer
 * tray under a safelight: a faint caustic web of warm light drifts on the liquid, the pointer is a hand-held safelight
 * (the web brightens around it, like the hero film's own pointer light), moving the pointer or tapping sends ripples
 * through the "liquid", scrolling makes the bath flow (phase follows scroll, speed stirs it). Each section keeps its
 * exact own colour (the shader reads it per screen row), so the art direction does not change, it just breathes.
 * The selected frame finish / print surface (prints page) retints the safelight.
 *
 * One fixed WebGL canvas behind the page (raw WebGL 1, no dependencies, CSP-safe), built from the playbook's tested
 * reference (scratchpad/PLAYBOOK-bg-reference.js): DPR cap, adaptive resolution, pause when hidden/offscreen/covered,
 * context loss, reduced motion. Only dark full-width blocks whose ancestors are transparent are made transparent
 * (attribute data-ydx-clear + html.ydx-bg-live, added only after the first frame has been drawn), so without WebGL,
 * without this file or with reduced motion the page is exactly the original design.
 *
 * API: window.ydxDarkroomBG.mount({ mode: 'site' | 'room', tint, allowSoftware }) -> { rescan, setTint, ripple, destroy }
 * Simplex noise: Ian McEwan, Stefan Gustavson (Ashima Arts), MIT licence.
 */
(function () {
  'use strict';
  if (window.ydxDarkroomBG) return;
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
  var ROWS = 8, RIPS = 6;
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes,uPtr; uniform float uTime,uScroll,uVel,uLamp,uAmb,uGain,uGrain;',
    'uniform vec3 uTint; uniform vec3 uRow[' + ROWS + ']; uniform vec4 uRip[' + RIPS + '];',
    NOISE,
    // section colour for this pixel: rows are sampled top->bottom on screen; blend softly between neighbours
    'vec3 rowCol(float y){',
    ' float f=clamp(y*' + ROWS + '.-.5,0.,' + (ROWS - 1) + '.); vec3 a=uRow[0],b=uRow[0];',
    ' for(int i=0;i<' + ROWS + ';i++){float fi=float(i); if(fi<=f){a=uRow[i];} if(fi<=f+1.){b=uRow[i];}}',
    ' return mix(a,b,smoothstep(.25,.75,fract(f)));',
    '}',
    // the caustic web: two ridged noise layers drifting against each other, combined with min (bright filaments)
    'float web(vec2 p,float t){',
    ' float a=1.-abs(snoise(vec3(p*2.2,t*.28)));',
    ' float b=1.-abs(snoise(vec3(p*2.2+vec2(7.3,3.1),t*.23+4.)));',
    ' a=a*a*a*a; a*=a; b=b*b*b*b; b*=b;',
    ' return min(a,b)*1.7+max(a,b)*.22;',
    '}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float m=min(uRes.x,uRes.y);',
    ' vec3 base=rowCol(1.-fc.y/uRes.y);',
    ' vec2 p=(fc-.5*uRes)/m;',
    // ripples in the bath: expanding rings; their slope bends the caustic lookup and catches the light
    ' float h=0.; vec2 g=vec2(0.);',
    ' for(int i=0;i<' + RIPS + ';i++){',
    '  vec4 r=uRip[i]; float age=uTime-r.z; if(r.w<=0.||age<0.||age>4.) continue;',
    '  vec2 d=(fc-r.xy)/m; float dist=length(d)+1e-4; float front=age*.36;',
    '  float x=dist-front; float env=exp(-x*x*90.)*exp(-age*1.15)*r.w;',
    '  h+=sin(x*70.)*env; g+=d/dist*cos(x*70.)*env;',
    ' }',
    ' vec2 lp=(uPtr-.5*uRes)/m; vec2 dl=p-lp;',
    ' float lamp=exp(-dot(dl,dl)*2.6)*uLamp;',                              // the hand-held safelight
    ' float t=uTime+uScroll*1.6;',
    ' vec2 q=p*vec2(1.,1.+min(abs(uVel),2.)*.18)-vec2(0.,uScroll*.22)+g*.035;', // flow with scroll, stretch on flicks
    ' float c=web(q,t);',
    ' float light=uAmb+lamp*(1.+abs(uVel)*.2);',
    ' vec3 col=base+uTint*(c*.07*light*uGain+lamp*.04+h*.026*(.4+lamp));',
    ' col+=uTint*max(0.,h)*.03;',                                            // ring crests catch the light
    ' float gr=fract(52.9829189*fract(dot(fc+mod(uTime*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(col+(gr-.5)*uGrain,1.);',
    '}'
  ].join('\n');

  var hex = function (c) {
    c = String(c).trim().replace('#', '');
    if (c.length === 3) c = c.replace(/./g, '$&$&');
    var n = parseInt(c, 16) || 0;
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };
  var rgb = function (s) { var m = String(s).match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  var lum = function (c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };

  // Blocks that must keep their own background: overlays, the hero film (it draws its own WebGL), dialogs, menus.
  var KEEP = '.studio-arrival,.route-shutter,.light-room,.film-room,.mobile-menu,[role=dialog],[data-radix-portal],ydx-veil,ydx-iris';

  function mount(opts) {
    opts = opts || {};
    var d = document, html = d.documentElement;
    var RM = matchMedia('(prefers-reduced-motion: reduce)');
    var COARSE = matchMedia('(pointer: coarse)').matches;
    var room = opts.mode === 'room';
    var inst = { state: 'init' };
    var host = d.createElement('ydx-bg');
    host.setAttribute('aria-hidden', 'true');
    var canvas = d.createElement('canvas');
    host.appendChild(canvas);
    var gl = null, U = {}, raf = 0, lost = false, dead = false, visible = !d.hidden;
    var t = 7.3, last = 0, ema = 16, slow = 0, fast = 0, upgraded = false;
    var q = opts.quality || (COARSE ? 0.6 : 0.8), maxDpr = COARSE ? 1 : 1.25;
    var W = 0, H = 0, dirty = true;
    var ptr = [innerWidth * 0.62, innerHeight * 0.35], ptrT = ptr.slice(), lastMove = -1e9, lampA = 0.35, lampT = 0.35;
    var scroll = scrollY / (innerHeight || 1), scrollT = scroll, vel = 0, lastY = scrollY;
    var tint = hex(opts.tint || '#c9a56a'), tintT = tint.slice();
    var rips = [], ripTravel = 0, lastRipAt = 0;
    var rowCols = new Float32Array(ROWS * 3), rowsT = [], drawNeeded = true;
    var records = [];
    var amb = room ? 0.55 : 0.36, gain = room ? 1.5 : 1, boot = 0; // boot: the bath fades in over ~1.6s
    inst.frameMs = 0; inst.frames = 0; // QA: JS cost per frame (EMA) and frames drawn

    /* ---------- which blocks become transparent (site mode) ---------- */
    function scan() {
      if (room) return;
      var vw = innerWidth, out = [];
      var visit = function (el, depth, open) {
        if (depth > 9) return;
        var kids = el.children;
        for (var i = 0; i < kids.length; i++) {
          var k = kids[i];
          if (k.tagName === 'SCRIPT' || k.tagName === 'STYLE' || k.tagName === 'YDX-BG' || k.tagName === 'LINK') continue;
          var r = k.getBoundingClientRect();
          if (r.width < vw * 0.9 || r.height < 40) continue;
          var cs = getComputedStyle(k);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          var fixed = (cs.position === 'fixed' || cs.position === 'sticky') && !(k.parentElement && k.parentElement.classList.contains('pin-spacer'));
          var c = k.hasAttribute('data-ydx-clear') ? rgb(k.getAttribute('data-ydx-clear')).concat(1) : rgb(cs.backgroundColor);
          var opaque = (c[3] == null ? 1 : c[3]) > 0.98;
          if (k.matches(KEEP) || fixed) { if (opaque || k.matches('.light-room,.film-room')) out.push({ el: k, depth: depth, clear: false }); continue; }
          if (!opaque) { visit(k, depth + 1, open); continue; }
          if (open && lum(c) < 0.22 && cs.backgroundImage === 'none') {
            if (!k.hasAttribute('data-ydx-clear')) k.setAttribute('data-ydx-clear', c[0] + ',' + c[1] + ',' + c[2]);
            out.push({ el: k, depth: depth, clear: true, col: [c[0] / 255, c[1] / 255, c[2] / 255] });
            visit(k, depth + 1, true);
          } else out.push({ el: k, depth: depth, clear: false }); // paper sections, photos with colour: keep, opaque
        }
      };
      var bc = d.body.hasAttribute('data-ydx-clear') ? rgb(d.body.getAttribute('data-ydx-clear')) : rgb(getComputedStyle(d.body).backgroundColor);
      if (!d.body.hasAttribute('data-ydx-clear')) d.body.setAttribute('data-ydx-clear', bc[0] + ',' + bc[1] + ',' + bc[2]);
      html.style.setProperty('--ydx-ground', 'rgb(' + bc[0] + ',' + bc[1] + ',' + bc[2] + ')');
      out.unshift({ el: d.body, depth: -1, clear: true, col: [bc[0] / 255, bc[1] / 255, bc[2] / 255] });
      visit(d.body, 0, true);
      records = out;
      /* Chrome occlusion quirk (seen on the home page's "possibility" cards): an opaque box with overflow:clip can be
         treated as opaque over its whole overflow area, which culls this canvas below it and leaves black holes.
         A background alpha of .995 (invisible) keeps the compositor from treating the box as opaque. */
      var all = d.body.getElementsByTagName('*');
      for (var i = 0; i < all.length; i++) {
        var e = all[i], st = getComputedStyle(e);
        if ((st.overflowX === 'clip' || st.overflowY === 'clip') && !/^(IMG|VIDEO|CANVAS|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) {
          var bgc = rgb(st.backgroundColor);
          if ((bgc[3] == null ? 1 : bgc[3]) > 0.98 && !e.hasAttribute('data-ydx-ovh')) {
            e.setAttribute('data-ydx-ovh', '');
            e.style.setProperty('--ydx-bga', 'rgba(' + bgc[0] + ',' + bgc[1] + ',' + bgc[2] + ',.995)');
          }
        }
      }
      drawNeeded = true;
    }
    /* per frame: the colour (or "covered") at each of ROWS screen rows, from live rects (pins and transforms included) */
    function sampleRows() {
      var Hh = innerHeight, cx = innerWidth / 2, any = false;
      var rects = [];
      for (var i = 0; i < records.length; i++) {
        var rc = records[i];
        if (!rc.el.isConnected) continue;
        var r = rc.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > Hh || r.left > cx || r.right < cx) continue;
        rects.push([r.top, r.bottom, rc]);
      }
      var lastCol = null;
      for (var j = 0; j < ROWS; j++) {
        var y = (j + 0.5) / ROWS * Hh, best = null;
        for (var k = 0; k < rects.length; k++) {
          var e = rects[k];
          if (y >= e[0] && y < e[1] && (!best || e[2].depth >= best.depth)) best = e[2];
        }
        var col = best && best.clear ? best.col : null;
        if (col) { any = true; lastCol = col; }
        rowsT[j] = col;
      }
      // covered rows borrow a neighbour's colour (they are hidden anyway; keeps the blend clean at the seams)
      for (var a = 0; a < ROWS; a++) if (!rowsT[a]) rowsT[a] = lastCol || (records[0] && records[0].col) || [0.09, 0.106, 0.07];
      for (var b = 0; b < ROWS; b++) for (var c2 = 0; c2 < 3; c2++) rowCols[b * 3 + c2] = rowsT[b][c2];
      return any;
    }

    /* ---------- GL ---------- */
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
      ['uRes', 'uPtr', 'uTime', 'uScroll', 'uVel', 'uLamp', 'uAmb', 'uGain', 'uGrain', 'uTint', 'uRow', 'uRip'].forEach(function (n) {
        U[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]');
      });
      W = H = 0; dirty = true;
    }
    function size() {
      var dp = Math.min(devicePixelRatio || 1, maxDpr) * q;
      var w = Math.max(1, Math.round(innerWidth * dp)), h = Math.max(1, Math.round(innerHeight * dp));
      if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, w, h); }
      dirty = false;
    }
    var ripBuf = new Float32Array(RIPS * 4);
    function draw() {
      if (!gl || lost || dead || gl.isContextLost()) return;
      if (dirty) size();
      var sx = W / innerWidth, sy = H / innerHeight;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform2f(U.uPtr, ptr[0] * sx, (innerHeight - ptr[1]) * sy);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uScroll, scroll); gl.uniform1f(U.uVel, vel);
      gl.uniform1f(U.uLamp, lampA * boot); gl.uniform1f(U.uAmb, amb * boot); gl.uniform1f(U.uGain, gain);
      gl.uniform1f(U.uGrain, COARSE ? 0.012 : 0.018);
      gl.uniform3fv(U.uTint, tint);
      gl.uniform3fv(U.uRow, rowCols);
      for (var i = 0; i < RIPS; i++) {
        var r = rips[i];
        ripBuf[i * 4] = r ? r[0] * sx : 0; ripBuf[i * 4 + 1] = r ? (innerHeight - r[1]) * sy : 0;
        ripBuf[i * 4 + 2] = r ? r[2] : 0; ripBuf[i * 4 + 3] = r ? r[3] : 0;
      }
      gl.uniform4fv(U.uRip, ripBuf);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      inst.frames++;
      if (inst.state !== 'ready') { inst.state = 'ready'; host.setAttribute('data-state', 'ready'); if (!room) html.classList.add('ydx-bg-live'); }
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      var t0 = performance.now();
      var dt = last ? Math.min(now - last, 50) : 16.7; last = now;
      var ts = performance.now(); var any = room ? true : sampleRows(); inst.sampleMs = (inst.sampleMs || 0) + (performance.now() - ts - (inst.sampleMs || 0)) * 0.1;
      // track scroll every frame (cheap) so speed is right when the bath becomes visible again
      var y = scrollY, v = (y - lastY) / Math.max(dt, 1) * (1000 / (innerHeight || 1)); lastY = y; // viewports per second
      var kv = 1 - Math.exp(-dt / 160);
      vel += (Math.max(-3, Math.min(3, v)) - vel) * kv;
      scrollT = y / (innerHeight || 1);
      if (!any) { host.setAttribute('data-covered', ''); last = now; return; } // hero film / paper fills the screen
      host.removeAttribute('data-covered');
      t = (t + dt / 1000) % 1000;
      boot = Math.min(1, boot + dt / 1600);
      ema += (dt - ema) * 0.05; // adaptive quality from measured frame time (never steps back up more than once)
      if (ema > 24 && q > 0.36) { if (++slow > 45) { q *= 0.75; slow = 0; ema = 16; dirty = true; } } else slow = 0;
      if (ema < 13 && q < 0.8 && !upgraded) { if (++fast > 240) { q = Math.min(0.8, q / 0.75); upgraded = true; dirty = true; } } else fast = 0;
      var idle = now - lastMove > 3500;
      if (idle) { // no pointer (touch, or resting): the safelight drifts slowly by itself
        ptrT[0] = innerWidth * (0.55 + 0.3 * Math.sin(t * 0.13)); ptrT[1] = innerHeight * (0.45 + 0.28 * Math.cos(t * 0.11));
        lampT = COARSE ? 0.55 : 0.4;
      } else lampT = 1;
      var k = 1 - Math.exp(-dt / (idle ? 900 : 120));
      ptr[0] += (ptrT[0] - ptr[0]) * k; ptr[1] += (ptrT[1] - ptr[1]) * k;
      lampA += (lampT - lampA) * (1 - Math.exp(-dt / 500));
      scroll += (scrollT - scroll) * (1 - Math.exp(-dt / 220));
      var kc = 1 - Math.exp(-dt / 700);
      for (var c = 0; c < 3; c++) tint[c] += (tintT[c] - tint[c]) * kc;
      for (var i = 0; i < rips.length; i++) if (rips[i] && t - rips[i][2] > 4) rips[i] = null;
      draw();
      var cost = performance.now() - t0;
      inst.frameMs += (cost - inst.frameMs) * 0.1;
    }
    function still() { // reduced motion / paused: one correct frame
      if (!gl || lost || dead) return;
      boot = 1;
      if (!room) sampleRows();
      draw();
    }
    function update() {
      var run = gl && !lost && !dead && visible && !RM.matches;
      if (run && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (RM.matches && !room) { teardownLive(); return; } // site: reduced motion = the original flat design
      if (!run) requestAnimationFrame(still);
    }
    function teardownLive() { html.classList.remove('ydx-bg-live'); inst.state = 'off'; host.removeAttribute('data-state'); }

    /* ---------- input ---------- */
    function addRipple(x, y, amp) {
      var slot = 0, oldest = 1e9;
      for (var i = 0; i < RIPS; i++) { if (!rips[i]) { slot = i; break; } if (rips[i][2] < oldest) { oldest = rips[i][2]; slot = i; } }
      rips[slot] = [x, y, t, amp];
    }
    var lx = null, ly = null;
    function onMove(e) {
      var x = e.clientX, y = e.clientY, now = performance.now();
      ptrT[0] = x; ptrT[1] = y; lastMove = now;
      if (lx != null) {
        var dd = Math.hypot(x - lx, y - ly); ripTravel += dd;
        if (ripTravel > (COARSE ? 70 : 140) && now - lastRipAt > 110) { // agitating the bath: a soft ripple every few cm
          addRipple(x, y, Math.min(1, 0.35 + dd / 60) * 0.7); ripTravel = 0; lastRipAt = now;
        }
      }
      lx = x; ly = y;
    }
    function onDown(e) { addRipple(e.clientX, e.clientY, 1.1); ptrT[0] = e.clientX; ptrT[1] = e.clientY; lastMove = performance.now(); }
    function onVis() { visible = !d.hidden; update(); }
    function onResize() { dirty = true; if (!room) scan(); update(); }
    function onLost(e) { e.preventDefault(); lost = true; teardownLive(); update(); }
    function onRestored() { lost = false; try { init(); update(); } catch (err) { fail(err); } }
    function fail() { teardownLive(); host.setAttribute('data-state', 'fallback'); html.classList.add('ydx-bg-off'); }

    inst.rescan = function () { if (!dead && !room) { scan(); if (!raf) update(); } };
    inst.setTint = function (c) { tintT = hex(c); if (RM.matches || !raf) tint = tintT.slice(); };
    inst.ripple = function (x, y, a) { addRipple(x, y, a == null ? 1 : a); };
    inst.quality = function () { return q; };
    inst.debug = function () { return { rows: Array.from(rowCols).map(function (v) { return Math.round(v * 255); }), W: W, H: H, recs: records.length, raf: !!raf }; }; // QA
    inst.destroy = function () {
      dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; teardownLive();
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown); removeEventListener('resize', onResize);
      d.removeEventListener('visibilitychange', onVis);
      var ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      gl = null; host.remove();
    };

    try {
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !opts.allowSoftware };
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('WebGL unavailable');
      init();
    } catch (err) { gl = null; fail(err); return inst; }
    (opts.parent || d.body).appendChild(host);
    if (!room) scan();
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('resize', onResize, { passive: true });
    d.addEventListener('visibilitychange', onVis);
    if (RM.addEventListener) RM.addEventListener('change', function () { if (!RM.matches && !room) scan(); update(); });
    // pagehide: free the context (bfcache restores call pageshow -> the page's own boot re-mounts if needed)
    addEventListener('pagehide', function (e) { if (!e.persisted) inst.destroy(); });
    update();
    return inst;
  }

  window.ydxDarkroomBG = { mount: mount, FRAG: FRAG };
})();
