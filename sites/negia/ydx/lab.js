/* ydx round 5 — מעבדת הגוונים (the shade lab, /lab/). A lipstick shade mixer:
   tap a pigment to drop it into the dish (DOM drops under an SVG "goo" filter, so they merge like wet pigment), drag in the
   dish to stir, set depth and finish, and the mix is painted onto the lips photo and a swatch smear (per-pixel recolour on
   a 2D canvas: the photo's own luminance becomes the shading, its highlights become the gloss). The whole page — text
   colour, buttons and the liquid-pigment background (ydx/pigment.js) — takes the mix, with the ink chosen for >= 5:1.
   "Take it to the conversation" hands the closest family + a recipe note to the home page's inquiry form (sessionStorage).
   Vanilla JS, no dependencies. Reduced motion: drops appear without falling, no stir inertia. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  var lab = d.querySelector('main.lab'); if (!lab || w.__ydxLab) return; w.__ydxLab = 1;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- colour helpers (sRGB hex <-> linear) */
  var PIG = { rose: '#c94f69', nude: '#a85c3d', peach: '#ee6646', berry: '#a0255a' }; // the site's --pig per family
  var NAMES = {
    rose: ['ורד', 'ורד רך', 'ROSE', 'SOFT ROSE'], nude: ['ניוד', 'ניוד חם', 'NUDE', 'WARM NUDE'],
    peach: ['אפרסק', 'אפרסק מואר', 'PEACH', 'LUMINOUS PEACH'], berry: ['ברי', 'ברי עמוק', 'BERRY', 'DEEP BERRY']
  };
  var ORDER = ['rose', 'nude', 'peach', 'berry'];
  function toLin(c) { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  function toSRGB(l) { l = l <= 0 ? 0 : l >= 1 ? 1 : l; return Math.round(255 * (l <= .0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - .055)); }
  function hexRGB(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgbHex(c) { return '#' + c.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); }
  function lum(c) { return .2126 * toLin(c[0]) + .7152 * toLin(c[1]) + .0722 * toLin(c[2]); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function mixRGB(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  var DEEP = hexRGB('#4a0d22'), TINT = hexRGB('#fde5e6'), PAPER = hexRGB('#fffaf6'), NIGHT = hexRGB('#2b0616');
  var LUT = new Uint8ClampedArray(4097); for (var li = 0; li <= 4096; li++) LUT[li] = toSRGB(li / 4096);

  /* ---------------------------------------------------------------- state */
  var drops = []; // family keys, oldest first
  var MAX = 16, depth = .7, finish = 'satin';
  // pigments mix like paint, not light: weighted geometric mean of linear reflectances
  function mixColor() {
    if (!drops.length) return null;
    var acc = [0, 0, 0];
    drops.forEach(function (k) { var c = hexRGB(PIG[k]); for (var i = 0; i < 3; i++) acc[i] += Math.log(Math.max(1e-4, toLin(c[i]))); });
    return acc.map(function (v) { return toSRGB(Math.exp(v / drops.length)); });
  }
  function shares() {
    var s = {}; ORDER.forEach(function (k) { s[k] = 0; });
    drops.forEach(function (k) { s[k]++; });
    return ORDER.map(function (k) { return [k, drops.length ? s[k] / drops.length : 0]; }).filter(function (e) { return e[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; });
  }
  // the shown shade: the mix at the chosen depth (sheer = thinned toward the paper)
  function shade(m) { return mixRGB(PAPER, m, .35 + .65 * depth); }
  // page field + ink for a mix, chosen so body text keeps >= 5:1 whatever is in the dish
  function pageColors(m) {
    var best = null;
    for (var k = .18; k <= .92; k += .02) { var f = mixRGB(m, PAPER, k); if (contrast(f, DEEP) >= 5.2) { best = { field: f, ink: DEEP, dark: true, k: k }; break; } }
    for (var j = 0; j <= .85; j += .02) {
      var g = mixRGB(m, NIGHT, j);
      if (contrast(g, TINT) >= 5.2) { if (!best || j < best.k - .12) best = { field: g, ink: TINT, dark: false, k: j }; break; }
    }
    return best || { field: mixRGB(m, PAPER, .8), ink: DEEP, dark: true };
  }

  /* ---------------------------------------------------------------- the mirror: per-pixel recolour of the lips and the smear */
  function Surface(canvas, src) {
    this.cv = canvas; this.ctx = canvas.getContext('2d', { willReadFrequently: true }); this.ok = false;
    var self = this, img = new Image(); img.decoding = 'async'; img.src = src;
    this.ready = (img.decode ? img.decode() : new Promise(function (r) { img.onload = r; })).then(function () {
      var W = canvas.width = img.naturalWidth, H = canvas.height = img.naturalHeight;
      self.ctx.drawImage(img, 0, 0); var id = self.ctx.getImageData(0, 0, W, H), p = id.data, n = W * H;
      self.id = id; self.r = new Float32Array(n); self.g = new Float32Array(n); self.b = new Float32Array(n); self.l = new Float32Array(n);
      var sum = 0, cnt = 0;
      for (var i = 0; i < n; i++) {
        var r = toLin(p[i * 4]), g = toLin(p[i * 4 + 1]), b = toLin(p[i * 4 + 2]);
        self.r[i] = r; self.g[i] = g; self.b[i] = b; self.l[i] = .2126 * r + .7152 * g + .0722 * b;
        if (p[i * 4 + 3] > 128) { sum += self.l[i]; cnt++; }
      }
      self.mean = cnt ? sum / cnt : .3; self.ok = true;
    }).catch(function () {});
  }
  var FIN = { matte: { ce: .72, sp: .12, lo: .9 }, satin: { ce: 1, sp: .5, lo: .78 }, gloss: { ce: 1.12, sp: 1, lo: .66 } };
  Surface.prototype.paint = function (target, dep, fin, bareMix) {
    if (!this.ok) return;
    var t = target ? target.map(toLin) : null, f = FIN[fin], p = this.id.data, n = this.l.length, m = this.mean;
    var span = 1 - f.lo;
    for (var i = 0; i < n; i++) {
      var a = p[i * 4 + 3]; if (!a) continue;
      var r0 = this.r[i], g0 = this.g[i], b0 = this.b[i], L = this.l[i], r = r0, g = g0, b = b0;
      if (t) {
        var s = Math.min(3, Math.pow(L / m, f.ce)), hl = (L - f.lo) / span; hl = hl <= 0 ? 0 : hl >= 1 ? 1 : hl * hl * (3 - 2 * hl);
        var sp = hl * f.sp, k = dep * bareMix;
        r = t[0] * s; g = t[1] * s; b = t[2] * s;
        r = r + (1 - r) * sp; g = g + (1 - g) * sp; b = b + (1 - b) * sp;
        r = r0 + (r - r0) * k; g = g0 + (g - g0) * k; b = b0 + (b - b0) * k;
      }
      p[i * 4] = LUT[(Math.min(1, r) * 4096) | 0]; p[i * 4 + 1] = LUT[(Math.min(1, g) * 4096) | 0]; p[i * 4 + 2] = LUT[(Math.min(1, b) * 4096) | 0];
    }
    this.ctx.putImageData(this.id, 0, 0);
  };
  var lips = new Surface(d.getElementById('lab-lips'), '/img/lips-rose-s.webp');
  var smear = new Surface(d.getElementById('lab-smear'), '/img/smear-a-rose-s.webp');

  /* ---------------------------------------------------------------- the dish: drops under a goo filter */
  var dish = d.getElementById('lab-dish'), goo = d.getElementById('lab-goo');
  var pool = d.createElement('i'), sats = [];
  pool.className = 'pool'; goo.appendChild(pool);
  for (var si = 0; si < 3; si++) { var s = d.createElement('i'); s.className = 'sat'; s.style.setProperty('--a', (si * 120) + 'deg'); goo.appendChild(s); sats.push(s); }
  function dishSize() { var r = dish.getBoundingClientRect(); return { w: r.width || 300, h: r.height || 200 }; }
  function setPool(hex, n) {
    var z = dishSize(), base = Math.min(z.w, z.h);
    var size = n ? base * Math.min(.8, .36 + .09 * Math.sqrt(n)) : 0;
    goo.style.setProperty('--pool', size.toFixed(1) + 'px');
    goo.style.setProperty('--mix', hex || 'transparent');
  }
  function dropIn(k) {
    var z = dishSize(), el = d.createElement('i'), sz = Math.min(z.w, z.h) * (.12 + Math.random() * .05);
    var ang = Math.random() * Math.PI * 2, rx = z.w * .3, ry = z.h * .26;
    var x = z.w / 2 + Math.cos(ang) * rx - sz / 2, y = z.h / 2 + Math.sin(ang) * ry - sz / 2;
    el.className = 'drop'; el.style.width = el.style.height = sz.toFixed(1) + 'px';
    el.style.background = PIG[k]; el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
    goo.appendChild(el);
    if (reduce.matches || !el.animate) { el.remove(); return; }
    var cx = z.w / 2 - sz / 2 - x, cy = z.h / 2 - sz / 2 - y;
    // falls in with a little splash, rests, then is drawn into the pool (the goo filter merges it on the way)
    var a = el.animate([
      { transform: 'translate(0,-' + (z.h * .55).toFixed(0) + 'px) scale(.5,.8)', opacity: 0 },
      { transform: 'translate(0,0) scale(1.25,.7)', opacity: 1, offset: .26 },
      { transform: 'translate(0,0) scale(.92,1.08)', offset: .36 },
      { transform: 'translate(0,0) scale(1)', offset: .5 },
      { transform: 'translate(' + (cx * .92).toFixed(1) + 'px,' + (cy * .92).toFixed(1) + 'px) scale(.7)', opacity: 1 }
    ], { duration: 1700, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
    a.onfinish = function () { el.remove(); };
  }
  // stirring: dragging in the dish turns the satellites around the pool, with inertia
  var rot = 0, vel = 0, dragging = false, lastAng = null, spin = 0;
  function angAt(e) { var r = dish.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2); }
  dish.addEventListener('pointerdown', function (e) { dragging = true; lastAng = angAt(e); try { dish.setPointerCapture(e.pointerId); } catch (er) {} dish.classList.add('is-stirring'); loop(); });
  dish.addEventListener('pointermove', function (e) {
    if (!dragging) return; var a = angAt(e), da = a - lastAng; lastAng = a;
    if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    vel = vel * .5 + da * 57.3 * .5; rot += da * 57.3; paintRot();
  });
  function endDrag() { dragging = false; dish.classList.remove('is-stirring'); }
  dish.addEventListener('pointerup', endDrag); dish.addEventListener('pointercancel', endDrag);
  function paintRot() { goo.style.setProperty('--rot', rot.toFixed(2) + 'deg'); }
  function loop() {
    if (spin) return;
    (function tick() {
      spin = 0;
      if (!dragging) { if (reduce.matches) vel = 0; vel *= .94; rot += vel; paintRot(); }
      if (dragging || Math.abs(vel) > .05) spin = requestAnimationFrame(tick);
    })();
  }

  /* ---------------------------------------------------------------- read-outs */
  var $ = function (id) { return d.getElementById(id); };
  var outName = $('lab-name'), outLatin = $('lab-latin'), outNo = $('lab-no'), outHex = $('lab-hex'), outRecipe = $('lab-recipe');
  var depthIn = $('lab-depth'), depthOut = $('lab-depth-out');
  var FINISH_HE = { matte: 'מט', satin: 'סאטן', gloss: 'ברק' };
  function naming() {
    var sh = shares();
    if (!sh.length) return { he: 'צלחת נקייה', la: 'BARE', top: 'rose' };
    if (sh[0][1] >= .75 || sh.length === 1) return { he: NAMES[sh[0][0]][1], la: NAMES[sh[0][0]][3], top: sh[0][0] };
    return { he: NAMES[sh[0][0]][0] + '־' + NAMES[sh[1][0]][0], la: NAMES[sh[0][0]][2] + ' × ' + NAMES[sh[1][0]][2], top: sh[0][0] };
  }
  function recipeText() {
    var sh = shares(); if (!sh.length) return 'הצלחת ריקה. הוסיפי טיפה של פיגמנט.';
    return drops.length + (drops.length === 1 ? ' טיפה' : ' טיפות') + ' · ' + sh.map(function (e) { return Math.round(e[1] * 100) + '% ' + NAMES[e[0]][0]; }).join(' · ') +
      ' · עומק ' + Math.round(depth * 100) + '% · ' + FINISH_HE[finish];
  }
  function number() { var h = 7; drops.forEach(function (k) { h = (h * 31 + ORDER.indexOf(k) + 3) % 9973; }); return h % 97 + 1; }

  /* ---------------------------------------------------------------- apply */
  var raf = 0, recipeTimer = 0;
  function apply() { if (!raf) raf = requestAnimationFrame(render); }
  function render() {
    raf = 0;
    var m = mixColor(), shown = m ? shade(m) : null, pc = pageColors(shown || hexRGB('#e27a90'));
    var hex = shown ? rgbHex(shown) : '#e27a90';
    // page tokens: everything on the page follows the dish
    var hi = shown ? mixRGB(shown, [255, 255, 255], .42) : hexRGB('#f08ba0');
    for (var k = .42; contrast(hi, DEEP) < 4.6 && k < .95; k += .06) hi = mixRGB(shown || hi, [255, 255, 255], k);
    html.style.setProperty('--lab-field', rgbHex(pc.field)); html.style.setProperty('--lab-ink', rgbHex(pc.ink));
    html.style.setProperty('--lab-pig', hex); html.style.setProperty('--lab-hi', rgbHex(hi));
    html.style.setProperty('--lab-rule', pc.dark ? 'rgba(74,13,34,.3)' : 'rgba(253,229,230,.3)');
    lab.dataset.ink = pc.dark ? 'dark' : 'light';
    w.__ydxLabPalette = { field: rgbHex(pc.field), pig: hex, dark: pc.dark };
    if (w.__ydxPigment && w.__ydxPigment.setCustom) w.__ydxPigment.setCustom(w.__ydxLabPalette);
    var meta = d.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', rgbHex(pc.field));
    // mirror
    lips.paint(shown, 1, finish, .55 + .45 * depth); smear.paint(shown, 1, finish, 1);
    var nm = naming();
    outName.textContent = nm.he; outLatin.textContent = nm.la; outHex.textContent = hex.toUpperCase();
    outNo.textContent = 'N°' + ('0' + (drops.length ? number() : 0)).slice(-2);
    d.getElementById('lab-lips').setAttribute('aria-label', 'המחשת התערובת ' + nm.he + ' על שפתיים, גימור ' + FINISH_HE[finish]);
    depthOut.textContent = Math.round(depth * 100) + '%';
    // counts
    d.querySelectorAll('.pigment').forEach(function (b) {
      var n = drops.filter(function (k) { return k === b.dataset.pigment; }).length, c = b.querySelector('.pg-count');
      c.textContent = n; c.dataset.n = n;
    });
    setPool(drops.length ? rgbHex(m) : '', drops.length);
    sats.forEach(function (s, i) { var k2 = drops[drops.length - 1 - i]; s.style.setProperty('--c', k2 ? PIG[k2] : 'transparent'); s.dataset.on = k2 ? '1' : '0'; });
    // the recipe is a live region: announce after the visitor pauses, not on every slider step
    clearTimeout(recipeTimer); recipeTimer = setTimeout(function () { outRecipe.textContent = recipeText(); }, 350);
  }

  /* ---------------------------------------------------------------- input */
  d.querySelectorAll('.pigment').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.pigment; drops.push(k); if (drops.length > MAX) drops.shift();
      dropIn(k);
      if (!reduce.matches && b.animate) {
        var im = b.querySelector('img'); if (im) im.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '0 -10px', rotate: '-6deg', offset: .35 }, { translate: '0 0', rotate: '0deg' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.4,1)' });
      }
      if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) try { navigator.vibrate(8); } catch (e) {}
      // the mirror updates when the drop reaches the pool, so the cause reads before the effect
      setTimeout(apply, reduce.matches ? 0 : 520);
    });
  });
  depthIn.addEventListener('input', function () { depth = depthIn.value / 100; depthIn.setAttribute('aria-valuetext', depthIn.value + ' אחוז עומק'); apply(); });
  d.querySelectorAll('.finish input').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) { finish = r.value; apply(); } }); });
  $('lab-undo').addEventListener('click', function () { drops.pop(); apply(); });
  $('lab-reset').addEventListener('click', function () {
    drops = []; d.querySelectorAll('.dish-goo .drop').forEach(function (e) { e.remove(); }); apply();
  });
  // hand the mix to the home page's inquiry form (read once by enhance.js on arrival at /#contact)
  $('lab-take').addEventListener('click', function () {
    var nm = naming(), sh = shares();
    var note = 'ערבבתי במעבדת הגוונים: ' + nm.he + ' (' + outHex.textContent + ') — ' + recipeText() + '.';
    try { sessionStorage.setItem('ydx-lab-mix', JSON.stringify({ family: sh.length ? sh[0][0] : 'unsure', note: note, t: Date.now() })); } catch (e) {}
  });
  addEventListener('resize', function () { apply(); }, { passive: true });

  // a first mix in the dish, so the mirror is never empty on arrival: two rose, one peach
  drops = ['rose', 'rose', 'peach'];
  Promise.all([lips.ready, smear.ready]).then(function () { lab.classList.add('is-ready'); apply(); });
  apply();
})();
