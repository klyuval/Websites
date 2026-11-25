/* ydx darkroom.js (round 5): "The darkroom", an interactive page for AlexStudio (/darkroom/).
 *
 * Make a black-and-white print the way it was done before screens:
 *   01 choose a negative from the strip (the enlarger's red focus filter projects it on the paper, without exposing)
 *   02 pick an aperture and switch the enlarger lamp on and off; while it burns, the visitor's hand (pointer or finger)
 *      over the paper is a dodging tool that holds light back from that area
 *   03 slide the paper into the developer: the image comes up out of white paper, shadows first; dragging across the
 *      tray agitates it (ripples, faster development); left too long, the whites fog
 *   04 pull and fix: the white light comes on, the print is judged like a darkroom tutor would, and it is hung on the
 *      drying line (kept in this browser), downloadable.
 *
 * One fixed WebGL canvas draws the whole room (safelight, bench, easel, tray, liquid, paper) behind the DOM; the DOM
 * keeps all text and controls (keyboard operable, screen-reader labelled). The exposure is simulated on the CPU at
 * 64x64 (lamp-seconds x dodging, smooth by nature) and the negative's full-resolution detail is applied in the shader,
 * so the print stays sharp. Fallbacks: no WebGL -> the same steps with a CSS-developed print; reduced motion -> no
 * ripples, swaying or drifting light, transitions become fades; no JS -> a static print and links back.
 * Simplex noise: Ian McEwan, Stefan Gustavson (Ashima Arts), MIT licence.
 */
(function () {
  'use strict';
  if (window.__drBooted) return;
  window.__drBooted = true;
  var d = document, html = d.documentElement;
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var COARSE = matchMedia('(pointer: coarse)').matches;
  var FRAME = html.classList.contains('dr-frame');
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var store = {
    get: function (k, s) { try { return (s || localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s || localStorage).setItem(k, v); return true; } catch (e) { return false; } }
  };
  html.classList.remove('dr-gaveup');

  /* ---------------------------------------------------------------------------------------------------------------
   * Copy (EN / HE / RU, the site's three languages; HE is RTL)
   * ------------------------------------------------------------------------------------------------------------- */
  var T = {
    en: {
      skip: 'Skip to content', home: 'AlexStudio home', sign: 'Darkroom · in use', back: 'Back to the studio', printsLabel: 'Prints & frames',
      eyebrow: 'Darkroom session', t1: 'The', t2: 'darkroom.',
      lede: 'Before screens, every print Alex made started here: a negative, an enlarger, three trays and a red lamp. Make one yourself.',
      s1: 'Negative', s2: 'Expose', s3: 'Develop', s4: 'Fix & dry',
      p1h: 'Choose a negative', p1n: 'Hold the strip up to the lamp. Light and dark are reversed: what is bright here prints black.',
      p2h: 'Expose under the enlarger', p2n: 'Pick an aperture, switch the lamp on, count, switch it off. While it burns, move your hand (pointer or finger) over the paper to dodge: hold back light and that area stays lighter.',
      aperture: 'Aperture', lampOn: 'Lamp on', lampOff: 'Lamp off', p2hint: 'Alex\'s test strip says f/8 for about 6 seconds.',
      toDev: 'Into the developer', other: 'Other negative',
      p3h: 'Rock the tray', p3n: 'The image comes up out of white paper, shadows first. Drag across the tray to agitate: fresh developer works faster. Pull it when the blacks are rich and the whites still clean.',
      rock: 'Rock the tray', fix: 'Pull & fix',
      p4h: 'Lights on.', again: 'Print another', download: 'Download the print',
      cta: 'Want it on real paper, in a handmade frame? Alex prints and frames.',
      bench: 'Enlarger easel and developer tray', line: 'Drying line', empty: 'Your prints dry here.',
      negs: ['The cliff', 'At sea', 'Hands', 'The potter', 'Above the fields'],
      cap: { pick: 'Easel · red focus filter', expose: 'Easel · enlarger lamp', develop: 'Developer · 20°C', done: 'Fixed · white light' },
      stage: { pick: 'Blank photographic paper on the easel, the chosen negative projected through the red focus filter.', expose: 'The paper on the easel under the enlarger.', develop: 'The print developing in the tray.', done: 'The finished print under white light.' },
      v: {
        good: 'Rich blacks, clean whites. Alex would frame this one.', dodge: ' And the dodging shows: a careful hand.',
        thin: 'Thin and grey: the paper needed more light. Try a longer exposure or a wider aperture.',
        heavy: 'Heavy and dark: too much light. Shorter, or stop down to f/11.',
        early: 'Pulled early: the shadows never got deep. Give the developer a little longer.',
        fog: 'Left in too long: the whites have gone grey with fog.'
      },
      dodged: 'dodged', dev: 'dev'
    },
    he: {
      skip: 'דילוג לתוכן', home: 'AlexStudio — בית', sign: 'חדר חושך · בשימוש', back: 'חזרה לסטודיו', printsLabel: 'הדפסות ומסגרות',
      eyebrow: 'סשן בחדר החושך', t1: 'חדר', t2: 'החושך.',
      lede: 'לפני המסכים, כל הדפסה של אלכס התחילה כאן: נגטיב, מגדיל, שלוש אמבטיות ומנורה אדומה. נסו בעצמכם.',
      s1: 'נגטיב', s2: 'חשיפה', s3: 'פיתוח', s4: 'קיבוע וייבוש',
      p1h: 'בחרו נגטיב', p1n: 'הרימו את הסרט אל האור. האור והצל הפוכים: מה שבהיר כאן יודפס שחור.',
      p2h: 'חשיפה מתחת למגדיל', p2n: 'בחרו צמצם, הדליקו את המנורה, ספרו, כבו. בזמן שהיא דולקת, העבירו את היד (סמן או אצבע) מעל הנייר כדי להסתיר: אזור שמקבל פחות אור יישאר בהיר יותר.',
      aperture: 'צמצם', lampOn: 'הדלקת מנורה', lampOff: 'כיבוי מנורה', p2hint: 'רצועת הניסיון של אלכס אומרת f/8 לכ־6 שניות.',
      toDev: 'אל המפתח', other: 'נגטיב אחר',
      p3h: 'נענעו את האמבטיה', p3n: 'התמונה עולה מתוך נייר לבן, הצללים קודם. גררו על פני האמבטיה כדי לנענע: מפתח טרי עובד מהר יותר. הוציאו כשהשחורים עמוקים והלבנים עדיין נקיים.',
      rock: 'נענוע האמבטיה', fix: 'הוצאה וקיבוע',
      p4h: 'האור דולק.', again: 'הדפסה נוספת', download: 'הורדת ההדפסה',
      cta: 'רוצים אותה על נייר אמיתי, במסגרת בעבודת יד? אלכס מדפיס וממסגר.',
      bench: 'שולחן המגדיל ואמבטיית הפיתוח', line: 'חבל הייבוש', empty: 'ההדפסות שלכם מתייבשות כאן.',
      negs: ['הצוק', 'בים', 'ידיים', 'הקדרית', 'מעל השדות'],
      cap: { pick: 'שולחן · מסנן מיקוד אדום', expose: 'שולחן · מנורת המגדיל', develop: 'מפתח · 20°C', done: 'מקובע · אור לבן' },
      stage: { pick: 'נייר צילום ריק על השולחן, הנגטיב שנבחר מוקרן דרך המסנן האדום.', expose: 'הנייר על השולחן מתחת למגדיל.', develop: 'ההדפסה מתפתחת באמבטיה.', done: 'ההדפסה הגמורה באור לבן.' },
      v: {
        good: 'שחורים עמוקים, לבנים נקיים. אלכס היה ממסגר את זו.', dodge: ' וההסתרה ניכרת: יד זהירה.',
        thin: 'דהויה ואפורה: הנייר היה צריך יותר אור. נסו חשיפה ארוכה יותר או צמצם פתוח יותר.',
        heavy: 'כבדה וכהה: יותר מדי אור. קצרו, או סגרו ל־f/11.',
        early: 'הוצאה מוקדם מדי: הצללים לא העמיקו. תנו למפתח עוד קצת זמן.',
        fog: 'נשארה יותר מדי זמן: הלבנים האפירו.'
      },
      dodged: 'הסתרה', dev: 'פיתוח'
    },
    ru: {
      skip: 'Перейти к содержимому', home: 'AlexStudio — главная', sign: 'Тёмная комната · занято', back: 'Назад в студию', printsLabel: 'Печать и рамы',
      eyebrow: 'Сеанс в тёмной комнате', t1: 'Тёмная', t2: 'комната.',
      lede: 'До экранов каждый отпечаток Алекса начинался здесь: негатив, увеличитель, три кюветы и красный фонарь. Сделайте свой.',
      s1: 'Негатив', s2: 'Экспозиция', s3: 'Проявка', s4: 'Фиксаж',
      p1h: 'Выберите негатив', p1n: 'Посмотрите плёнку на свет. Свет и тень поменялись местами: светлое здесь станет чёрным.',
      p2h: 'Экспонируйте под увеличителем', p2n: 'Выберите диафрагму, включите лампу, считайте, выключите. Пока она горит, ведите рукой (курсором или пальцем) над бумагой: где вы задержите свет, отпечаток останется светлее.',
      aperture: 'Диафрагма', lampOn: 'Включить лампу', lampOff: 'Выключить лампу', p2hint: 'По пробной полоске Алекса: f/8, около 6 секунд.',
      toDev: 'В проявитель', other: 'Другой негатив',
      p3h: 'Покачайте кювету', p3n: 'Изображение проступает из белой бумаги, сначала тени. Проведите по кювете, чтобы покачать её: свежий проявитель работает быстрее. Достаньте, когда чёрное глубокое, а белое ещё чистое.',
      rock: 'Покачать кювету', fix: 'Достать и закрепить',
      p4h: 'Свет включён.', again: 'Ещё отпечаток', download: 'Скачать отпечаток',
      cta: 'Хотите на настоящей бумаге, в раме ручной работы? Алекс печатает и оформляет.',
      bench: 'Стол увеличителя и кювета с проявителем', line: 'Сушка', empty: 'Здесь сохнут ваши отпечатки.',
      negs: ['Утёс', 'В море', 'Руки', 'Гончар', 'Над полями'],
      cap: { pick: 'Рамка · красный фильтр', expose: 'Рамка · лампа увеличителя', develop: 'Проявитель · 20°C', done: 'Закреплено · белый свет' },
      stage: { pick: 'Чистая фотобумага в рамке, выбранный негатив проецируется через красный фильтр.', expose: 'Бумага в рамке под увеличителем.', develop: 'Отпечаток проявляется в кювете.', done: 'Готовый отпечаток при белом свете.' },
      v: {
        good: 'Глубокий чёрный, чистый белый. Этот Алекс оформил бы в раму.', dodge: ' И маскирование видно: аккуратная рука.',
        thin: 'Бледно и серо: бумаге не хватило света. Дольше или откройте диафрагму.',
        heavy: 'Тяжело и темно: слишком много света. Короче или прикройте до f/11.',
        early: 'Достали рано: тени не успели проявиться. Дайте проявителю ещё немного времени.',
        fog: 'Передержали в проявителе: белое посерело от вуали.'
      },
      dodged: 'маска', dev: 'прояв.'
    }
  };
  var NEG = [
    { src: '/media/editorial-couple.webp', w: 1400, h: 933 },
    { src: '/media/about-alex/sea.webp', w: 1448, h: 1086 },
    { src: '/media/wedding-embrace.webp', w: 1400, h: 933 },
    { src: '/media/collection/portrait-study.webp', w: 1200, h: 800 },
    { src: '/media/about-alex/sky.webp', w: 1448, h: 1086 }
  ];
  var THUMB = ['/media/editorial-couple-small.webp', '/media/about-alex/sea.webp', '/media/wedding-embrace.webp', '/media/collection/portrait-study-small.webp', '/media/about-alex/sky.webp'];
  var STOPS = [4, 5.6, 8, 11, 16];
  var lang = html.lang === 'he' || html.lang === 'ru' ? html.lang : 'en';
  var t = function (k) { return T[lang][k] != null ? T[lang][k] : T.en[k]; };

  /* ---------------------------------------------------------------------------------------------------------------
   * State
   * ------------------------------------------------------------------------------------------------------------- */
  var S = {
    phase: 'pick', neg: 0, fstop: 8, lamp: false, lampSec: 0, devT: 0, fog: 0, agit: 0, dodged: 0,
    tray: 0, light: 0, lampVis: 0, focus: 1, hand: 0, captured: false
  };
  var EXN = 64, expo = new Float32Array(EXN * EXN), expoBytes = new Uint8Array(EXN * EXN), expoDirty = true;
  var stage = $('.dr-stage'), capEl = $('.dr-stagecap');
  var ptr = { x: -1e4, y: -1e4, over: false, down: false, lastX: 0, lastY: 0, travel: 0 };

  /* ---------------------------------------------------------------------------------------------------------------
   * DOM: strip, f-stops, language, steps
   * ------------------------------------------------------------------------------------------------------------- */
  var strip = $('.dr-strip'), fst = $('.dr-fstops');
  NEG.forEach(function (n, i) {
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'dr-neg'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.tabIndex = i === 0 ? 0 : -1; b.dataset.i = i;
    var im = d.createElement('img'); im.src = THUMB[i]; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
    var sp = d.createElement('span'); sp.textContent = (i + 1) * 2 + 'A';
    b.appendChild(im); b.appendChild(sp); strip.appendChild(b);
  });
  STOPS.forEach(function (f) {
    var b = d.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = 'f/' + f; b.dataset.f = f;
    b.setAttribute('aria-checked', f === 8 ? 'true' : 'false'); b.tabIndex = f === 8 ? 0 : -1;
    fst.appendChild(b);
  });
  // radio groups: arrow keys move the selection (roving tabindex)
  function radios(group, onPick) {
    group.addEventListener('click', function (e) { var b = e.target.closest('[role=radio]'); if (b) onPick(b); });
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      var all = $$('[role=radio]', group), i = all.indexOf(d.activeElement), step = keys[e.key];
      var n = all[(i + step + all.length) % all.length];
      n.focus(); onPick(n, true);
    });
  }
  function check(group, b) { $$('[role=radio]', group).forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; }); }
  radios(strip, function (b, viaKey) {
    check(strip, b); setNeg(+b.dataset.i);
    if (!viaKey) go(2); // a click (or tap) loads the negative into the enlarger
  });
  strip.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(2); } });
  radios(fst, function (b) { check(fst, b); S.fstop = +b.dataset.f; });

  function applyLang() {
    lang = html.lang === 'he' || html.lang === 'ru' ? html.lang : 'en';
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-i18n-label]').forEach(function (el) { el.dataset.drLabel = t(el.dataset.i18nLabel); });
    $$('.dr-lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'); });
    $$('.dr-neg').forEach(function (b, i) { b.setAttribute('aria-label', T[lang].negs[i]); });
    $('.dr-lamp span').textContent = S.lamp ? t('lampOff') : t('lampOn');
    d.title = (lang === 'he' ? 'חדר החושך' : lang === 'ru' ? 'Тёмная комната' : 'The Darkroom') + ' — AlexStudio';
    updateStage();
    if (S.phase === 'done') verdict();
    drawLine();
  }
  $('.dr-lang').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-lang]');
    if (!b || b.dataset.lang === lang) return;
    store.set('alexstudio-language', b.dataset.lang); // shared with the site: it opens in the same language
    var swap = function () { html.lang = b.dataset.lang; html.dir = b.dataset.lang === 'he' ? 'rtl' : 'ltr'; applyLang(); };
    if (RM.matches || !d.body.animate) return swap();
    var m = $('.dr-main');
    m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in' }).finished.then(function () {
      swap(); m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }, swap);
  });

  /* ---------------------------------------------------------------------------------------------------------------
   * Flow
   * ------------------------------------------------------------------------------------------------------------- */
  var tweens = [];
  function tweenTo(key, to, ms) { // eased state change, drawn by the frame loop (instant under reduced motion)
    tweens = tweens.filter(function (x) { return x.key !== key; });
    if (RM.matches || !gl) { S[key] = to; return; }
    tweens.push({ key: key, from: S[key], to: to, ms: ms, t0: performance.now() });
  }
  function go(step) {
    var phases = { 1: 'pick', 2: 'expose', 3: 'develop', 4: 'done' };
    var ph = phases[step];
    if (ph === 'pick' || (ph === 'expose' && S.phase !== 'expose')) {
      if (S.lamp) toggleLamp(false);
      if (S.phase === 'done' || S.phase === 'develop' || ph === 'pick') resetPaper();
    }
    if (ph === 'develop') { if (S.lamp) toggleLamp(false); S.devT = 0; S.fog = 0; tweenTo('tray', 1, 900); tweenTo('focus', 0, 300); }
    if (ph === 'done') { tweenTo('light', 1, 1300); tweenTo('tray', 0, 900); S.captured = false; verdict(); if (nogl) setTimeout(capture, 400); }
    if (ph === 'expose') tweenTo('focus', 0.7, 400);
    if (ph === 'pick') tweenTo('focus', 1, 400);
    S.phase = ph;
    $$('.dr-panel').forEach(function (p) { p.hidden = +p.dataset.panel !== step; });
    $$('.dr-steps li').forEach(function (li) {
      var n = +li.dataset.step;
      if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('is-done', n < step);
    });
    updateStage();
    if (nogl) stage.dataset.phase = ph === 'pick' ? 'blank' : ph === 'done' ? 'develop' : ph;
    if (ph === 'develop' && nogl) setTimeout(function () { if (S.phase === 'develop') S.devT = 4; }, 6000);
    var panel = $('.dr-panel[data-panel="' + step + '"]'), h = panel && $('.dr-h', panel);
    if (h && d.activeElement && d.activeElement !== d.body && panel.contains(d.activeElement) === false) {
      h.tabIndex = -1; h.focus({ preventScroll: true }); // keyboard users land on the new step
    }
    if (COARSE && step > 1 && stage.getBoundingClientRect().top < -40) stage.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'center' });
  }
  function resetPaper() {
    expo.fill(0); expoDirty = true; S.lampSec = 0; S.devT = 0; S.fog = 0; S.dodged = 0; S.captured = false;
    tweenTo('light', 0, 700); tweenTo('tray', 0, 500);
    $('.dr-go[data-go="3"]').disabled = true;
    $('.dr-clock b').textContent = '00.0';
  }
  function updateStage() {
    stage.setAttribute('aria-label', T[lang].stage[S.phase]);
    if (capEl) capEl.textContent = T[lang].cap[S.phase];
  }
  $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(+b.dataset.go); }); });

  var lampBtn = $('.dr-lamp');
  function toggleLamp(on) {
    S.lamp = on == null ? !S.lamp : on;
    lampBtn.setAttribute('aria-pressed', S.lamp ? 'true' : 'false');
    $('span', lampBtn).textContent = S.lamp ? t('lampOff') : t('lampOn');
    if (!S.lamp && S.lampSec > 0.2) $('.dr-go[data-go="3"]').disabled = false;
    if (nogl && S.lamp) S.lampT0 = performance.now();
  }
  lampBtn.addEventListener('click', function () { if (S.phase === 'expose') toggleLamp(); });

  $('.dr-rock').addEventListener('click', function () { // keyboard / no-drag way to agitate
    var r = stage.getBoundingClientRect();
    for (var i = 0; i < 3; i++) (function (i) {
      setTimeout(function () { ripple(r.left + r.width * (0.15 + 0.35 * i), r.top + r.height * (i % 2 ? 0.25 : 0.75), 1); S.agit = 1; }, i * 160);
    })(i);
  });

  function verdict() {
    var V = T[lang].v, e0 = S.lampSec * Math.pow(8 / S.fstop, 2) / 6, msg;
    var expo0 = S.exposureAtPull != null ? S.exposureAtPull : e0;
    if (S.fog > 0.12) msg = V.fog;
    else if (S.devAtPull < 2.4) msg = V.early;
    else if (expo0 < 0.55) msg = V.thin;
    else if (expo0 > 1.9) msg = V.heavy;
    else msg = V.good + (S.dodged > 0.6 ? V.dodge : '');
    $('.dr-verdict').textContent = msg;
    $('.dr-recipe').textContent = 'f/' + S.fstop + ' · ' + S.lampSec.toFixed(1) + ' s · ' + t('dev') + ' ' + devClock(S.devAtPull || 0) + (S.dodged > 0.6 ? ' · ' + t('dodged') : '');
  }
  function devClock(s) { var x = Math.round(s * 15); return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2); }

  /* ---------------------------------------------------------------------------------------------------------------
   * Drying line (kept in this browser; storage failures just mean the line starts empty)
   * ------------------------------------------------------------------------------------------------------------- */
  var prints = [];
  try { prints = JSON.parse(store.get('ydx-darkroom-prints') || '[]') || []; } catch (e) { prints = []; }
  function drawLine(fresh) {
    var box = $('.dr-pegs');
    box.textContent = '';
    if (!prints.length) { var p = d.createElement('p'); p.className = 'dr-empty'; p.textContent = t('empty'); box.appendChild(p); }
    prints.forEach(function (pr, i) {
      var f = d.createElement('figure'); f.className = 'dr-print' + (fresh && i === 0 ? ' is-new' : ''); f.setAttribute('role', 'listitem');
      f.style.setProperty('--d', (-(i * 1.7) % 5).toFixed(2) + 's');
      var im = d.createElement('img'); im.src = pr.img; im.alt = T[lang].negs[pr.neg] || ''; im.height = 96;
      var c = d.createElement('figcaption'); c.textContent = pr.recipe;
      f.appendChild(im); f.appendChild(c); box.appendChild(f);
    });
    $('.dr-count').textContent = String(prints.length);
  }

  /* ---------------------------------------------------------------------------------------------------------------
   * Transitions: the site's two-panel shutter, continued across documents with the same sessionStorage record the
   * site's own pages read (so leaving the darkroom closes the shutter here and the site's page opens it).
   * ------------------------------------------------------------------------------------------------------------- */
  function veil(brand, label) {
    var v = d.createElement('dr-veil'); v.setAttribute('aria-hidden', 'true'); v.innerHTML = '<i></i><i></i>';
    v.firstChild.textContent = brand; v.lastChild.textContent = label; d.body.appendChild(v); return v;
  }
  function panels(v, open, ms) {
    var ps = v.querySelectorAll('i');
    return Promise.all([].map.call(ps, function (p, i) {
      var off = 'translate3d(0,' + (i ? 101 : -101) + '%,0)', on = 'translate3d(0,0,0)';
      var a = p.animate([{ transform: open ? on : off }, { transform: open ? off : on }], { duration: ms, easing: open ? 'cubic-bezier(.65,0,.15,1)' : 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
      return Promise.race([a.finished, new Promise(function (r) { setTimeout(r, ms + 400); })]);
    }));
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname === location.pathname || u.hash && u.pathname === location.pathname) return;
    if (RM.matches || e.detail === 0 || !d.body.animate) return; // keyboard activation / reduced motion: plain navigation
    e.preventDefault();
    var label = a.dataset.drLabel || '';
    store.set('ydx-route', JSON.stringify({ to: u.pathname, t: Date.now(), brand: 'AlexStudio', label: label === 'AlexStudio' ? '' : label }), sessionStorage);
    var v = veil('AlexStudio', label === 'AlexStudio' ? '' : label);
    v.style.pointerEvents = 'auto';
    panels(v, false, 560).then(function () { location.href = u.href; });
    setTimeout(function () { location.href = u.href; }, 1400);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) $$('dr-veil').forEach(function (v) { v.remove(); }); });

  function loader() {
    store.set('ydx-seen', '1', sessionStorage);
    var cont = $('dr-veil');
    var ready = new Promise(function (r) {
      var fonts = d.fonts && d.fonts.load ? d.fonts.load('40px Optical').catch(function () {}) : Promise.resolve();
      Promise.race([Promise.all([fonts, firstFrame]), new Promise(function (x) { setTimeout(x, FRAME ? 500 : 3200); })]).then(r);
    });
    if (cont) return ready.then(function () { return panels(cont, true, 620); }).then(function () { cont.remove(); });
    if (html.classList.contains('dr-rm')) return;
    var quick = html.classList.contains('dr-quick') || FRAME;
    var l = d.createElement('dr-load'); l.setAttribute('aria-hidden', 'true');
    l.innerHTML = '<b></b><span></span><small></small>';
    l.querySelector('span').textContent = t('sign').split('·')[0].trim();
    l.querySelector('small').textContent = 'AlexStudio';
    d.body.appendChild(l);
    var t0 = performance.now();
    // the door sign: the red safelight flickers on (twice, like an old bulb), then the room fades in
    var flick = quick ? [[60, true]] : [[160, true], [230, false], [300, true]];
    flick.forEach(function (f) { setTimeout(function () { l.classList.toggle('is-on', f[1]); }, f[0]); });
    var min = FRAME ? 300 : quick ? 420 : 1000;
    var out = function () { l.classList.add('is-out'); setTimeout(function () { l.remove(); }, 500); };
    var safety = setTimeout(out, FRAME ? 800 : 4000);
    ready.then(function () { setTimeout(function () { clearTimeout(safety); out(); }, Math.max(0, min - (performance.now() - t0))); });
  }

  /* ---------------------------------------------------------------------------------------------------------------
   * WebGL room
   * ------------------------------------------------------------------------------------------------------------- */
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
  var RIPS = 6;
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes,uPtr; uniform vec4 uStage,uPaper; uniform float uTime,uLamp,uFocus,uHand,uHandR,uDev,uFog,uTray,uLight,uHasNeg,uMotion;',
    'uniform sampler2D uNeg,uExp; uniform vec4 uRip[' + RIPS + '];',
    NOISE,
    'float web(vec2 p,float t){',
    ' float a=1.-abs(snoise(vec3(p*2.4,t*.3))); float b=1.-abs(snoise(vec3(p*2.4+vec2(7.3,3.1),t*.25+4.)));',
    ' a=a*a*a*a; a*=a; b=b*b*b*b; b*=b; return min(a,b)*1.7+max(a,b)*.22;',
    '}',
    'float lumi(vec3 c){return dot(c,vec3(.299,.587,.114));}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; float m=min(uRes.x,uRes.y); vec2 p=(fc-.5*uRes)/m;',
    ' vec3 safe=vec3(.86,.34,.21); vec3 white=vec3(1.,.985,.95);',
    ' vec3 amb=mix(safe,white,uLight);',
    // ripples on the liquid (only matter in the tray)
    ' float h=0.; vec2 g=vec2(0.);',
    ' for(int i=0;i<' + RIPS + ';i++){',
    '  vec4 r=uRip[i]; float age=uTime-r.z; if(r.w<=0.||age<0.||age>3.5) continue;',
    '  vec2 dd=(fc-r.xy)/m; float dist=length(dd)+1e-4; float x=dist-age*.3;',
    '  float env=exp(-x*x*140.)*exp(-age*1.3)*r.w; h+=sin(x*90.)*env; g+=dd/dist*cos(x*90.)*env;',
    ' }',
    // room: olive-black, the safelight pool from above the bench, a faint caustic shimmer, the visitor's hand lamp
    ' vec2 lampP=(vec2(uStage.x+uStage.z*.62,uRes.y*1.02)-.5*uRes)/m; vec2 dl=p-lampP;',
    ' float pool=exp(-dot(dl*vec2(.8,1.1),dl*vec2(.8,1.1))*1.5);',
    ' vec3 col=mix(vec3(.047,.055,.037),vec3(.085,.095,.07),uLight*.8);',
    ' col+=amb*pool*mix(.13,.06,uLight);',
    ' col+=amb*web(p*.8,uTime*uMotion)*pool*.035;',
    ' vec2 dp=(fc-uPtr)/m; col+=amb*exp(-dot(dp,dp)*9.)*.03*uMotion;',
    // stage (easel board -> developer tray)
    ' vec2 sp=(fc-uStage.xy)/uStage.zw;',
    ' float inS=step(0.,sp.x)*step(sp.x,1.)*step(0.,sp.y)*step(sp.y,1.);',
    ' vec2 so=max(abs(sp-.5)-.5,0.)*uStage.zw/m; col*=1.-.55*exp(-dot(so,so)*600.)*(1.-inS);', // soft contact shadow
    ' if(inS>0.){',
    '  float edge=min(min(sp.x,1.-sp.x)*uStage.z,min(sp.y,1.-sp.y)*uStage.w);',
    '  vec3 board=vec3(.125,.13,.1)+.012*snoise(vec3(sp*vec2(40.,3.),1.));',             // easel board, grain
    '  vec3 tray=vec3(.06,.058,.05);',
    '  float liquid=uTray;',
    '  vec3 st=mix(board,tray,liquid);',
    '  st+=vec3(.06)*smoothstep(10.,0.,edge)*smoothstep(0.,2.,edge)*(.4+liquid);',     // rim
    '  col=st*(amb*(.55+pool*.9));',
    ' }',
    // paper
    ' vec2 pu=(fc-uPaper.xy)/uPaper.zw;',
    ' vec2 wob=g*.018*uTray;',
    ' vec2 puv=pu+wob;',
    ' if(puv.x>0.&&puv.x<1.&&puv.y>0.&&puv.y<1.){',
    '  float bm=.045; vec2 iu=(puv-bm)/(1.-2.*bm); float inI=step(0.,iu.x)*step(iu.x,1.)*step(0.,iu.y)*step(iu.y,1.);',
    '  vec3 src=texture2D(uNeg,vec2(clamp(iu.x,0.,1.),1.-clamp(iu.y,0.,1.))).rgb; float L=lumi(src)*uHasNeg;',
    '  float Tn=(.03+.94*pow(1.-L,1.08))*inI;',                                       // transmission of the negative
    '  float e=texture2D(uExp,clamp(iu,0.,1.)).r*4.;',
    '  float E=e*Tn;',
    '  float Dinf=1.-exp(-pow(E*1.45,1.7));',                                           // paper curve
    '  float dev=1.-exp(-uDev*(.32+1.4*Dinf)/2.4);',                                     // shadows come up first
    '  float D=clamp(Dinf*dev+uFog*(.35+.3*(1.-Dinf))*inI,0.,1.);',
    '  float R=1.-.93*D;',
    '  vec3 paper=vec3(.95,.93,.87)+.012*snoise(vec3(pu*90.,3.));',
    '  vec3 ink=vec3(.075,.07,.06);',
    '  vec3 refl=mix(ink,paper,R);',
    '  vec3 lit=refl*amb*(mix(.46,.97,uLight)+pool*.3*(1.-uLight));',
    // enlarger lamp (white light through the negative) and the red focus filter; the hand casts a soft shadow
    '  vec2 hp=(fc-uPtr)/m; float hand=1.-.9*smoothstep(1.25,.35,length(hp)/uHandR)*uHand;',
    '  float proj=Tn*hand;',
    '  lit=mix(lit,lit*.2*hand,uLamp)+white*proj*uLamp*.95;',
    '  lit+=vec3(.8,.17,.08)*Tn*uFocus*.42*hand*(1.-uLamp);',
    // under the liquid: slightly darker, the caustic web and ring crests catch the light
    '  float cw=web(pu*vec2(uPaper.z/m,uPaper.w/m)*1.3+g*.05,uTime*uMotion);',
    '  lit=mix(lit,lit*.88+amb*(cw*.07+max(0.,h)*.12),uTray);',
    '  float pe=min(min(pu.x,1.-pu.x)*uPaper.z,min(pu.y,1.-pu.y)*uPaper.w);',
    '  col=mix(col*.6,lit,smoothstep(0.,1.5,pe));',
    ' }',
    ' float gr=fract(52.9829189*fract(dot(fc+mod(uTime*60.,64.)*5.588238,vec2(.06711056,.00583715))));',
    ' gl_FragColor=vec4(col+(gr-.5)*.02,1.);',
    '}'
  ].join('\n');

  var gl = null, U = {}, texNeg = null, texExp = null, canvas = null, host = null, nogl = false, lost = false;
  var W = 0, H = 0, q = COARSE ? 0.75 : 1, maxDpr = COARSE ? 1.25 : 1.5, raf = 0, last = 0, ema = 16, slow = 0;
  var now0 = performance.now(), time = 0, rips = [], ripBuf = new Float32Array(RIPS * 4), hasNeg = 0;
  var firstFrameRes, firstFrame = new Promise(function (r) { firstFrameRes = r; });
  var stageRect = { left: 0, top: 0, width: 1, height: 1 }, paperRect = stageRect;
  var negAspect = 1.5;
  window.__drQA = { frames: 0, frameMs: 0, state: S, quality: function () { return q; } };

  function ripple(x, y, a) {
    if (RM.matches) return;
    var slot = 0, oldest = 1e9;
    for (var i = 0; i < RIPS; i++) { if (!rips[i]) { slot = i; break; } if (rips[i][2] < oldest) { oldest = rips[i][2]; slot = i; } }
    rips[slot] = [x, y, time, a];
  }
  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function mkTex(unit) {
    var tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }
  function initGL() {
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    'uRes uPtr uStage uPaper uTime uLamp uFocus uHand uHandR uDev uFog uTray uLight uHasNeg uMotion uNeg uExp uRip'.split(' ').forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]');
    });
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // no flips at upload (a GPU-side flip can stall); the shader flips v
    texNeg = mkTex(0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    texExp = mkTex(1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, EXN, EXN, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, expoBytes);
    gl.uniform1i(U.uNeg, 0); gl.uniform1i(U.uExp, 1);
    W = H = 0; hasNeg = 0; expoDirty = true;
    if (negImg && negImg.complete && negImg.naturalWidth) uploadNeg(negImg);
  }
  var negImg = null;
  function uploadNeg(img) {
    if (!gl) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texNeg);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); hasNeg = 1; } catch (e) { hasNeg = 0; }
  }
  function setNeg(i) {
    S.neg = i; hasNeg = 0;
    var n = NEG[i]; negAspect = n.w / n.h;
    var img = new Image(); img.decoding = 'async'; negImg = img;
    img.onload = function () { if (negImg === img) { uploadNeg(img); var s = $('.dr-static'); if (s) s.src = n.src; } };
    img.src = n.src;
    if (S.phase !== 'pick') go(1);
    expo.fill(0); expoDirty = true;
  }

  function layout() { // stage + paper rects (CSS px), read once per frame
    var r = stage.getBoundingClientRect();
    stageRect = r;
    // paper: fitted to the negative's aspect, inside the easel/tray with a margin
    var mw = r.width * 0.84, mh = r.height * 0.8, w = mw, h = w / negAspect;
    if (h > mh) { h = mh; w = h * negAspect; }
    var sink = S.tray * 0.03; // the paper sinks a little into the tray
    w *= 1 - sink; h *= 1 - sink;
    paperRect = { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }
  function size() {
    var dp = Math.min(devicePixelRatio || 1, maxDpr) * q;
    var w = Math.max(1, Math.round(innerWidth * dp)), h = Math.max(1, Math.round(innerHeight * dp));
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  function simulate(dt) {
    var s = dt / 1000;
    // pointer over the paper -> paper uv (the hand)
    var pr = paperRect, hu = (ptr.x - pr.left) / pr.width, hv = (ptr.y - pr.top) / pr.height;
    var overPaper = ptr.over && hu > -0.1 && hu < 1.1 && hv > -0.1 && hv < 1.1 && (!COARSE || ptr.down);
    var handT = (S.phase === 'expose' || S.phase === 'pick') && overPaper ? 1 : 0;
    S.hand += (handT - S.hand) * (1 - Math.exp(-dt / 90));
    S.lampVis += ((S.lamp ? 1 : 0) - S.lampVis) * (1 - Math.exp(-dt / (S.lamp ? 60 : 160)));
    if (S.lamp) {
      S.lampSec += s;
      var rate = s * Math.pow(8 / S.fstop, 2) / 6;
      // image-area uv of the hand; radius in paper-min units
      var bm = 0.045, iu = (hu - bm) / (1 - 2 * bm), iv = 1 - (hv - bm) / (1 - 2 * bm);
      // distances in CSS px, the same falloff the shader draws as the hand's shadow
      var R2 = Math.pow(handRadius(), 2), iw = pr.width * (1 - 2 * bm), ih = pr.height * (1 - 2 * bm);
      var held = 0;
      for (var y = 0; y < EXN; y++) for (var x = 0; x < EXN; x++) {
        var k = y * EXN + x, sh = 1;
        if (S.hand > 0.02) {
          var dx = ((x + 0.5) / EXN - iu) * iw, dy = ((y + 0.5) / EXN - iv) * ih;
          var u = clamp((Math.sqrt((dx * dx + dy * dy) / R2) - 1.25) / -0.9, 0, 1), f = u * u * (3 - 2 * u); // = shader smoothstep
          sh = 1 - 0.9 * f * S.hand; held += 1 - sh;
        }
        expo[k] += rate * sh;
      }
      if (held > 4) S.dodged += s;
      expoDirty = true;
      if (S.lampSec >= 30) toggleLamp(false);
      $('.dr-clock b').textContent = ('0' + S.lampSec.toFixed(1)).slice(-4);
    }
    if (S.phase === 'develop' && S.tray > 0.9) {
      S.agit *= Math.exp(-dt / 900);
      S.devT += s * (1 + S.agit * 0.9);
      if (S.devT > 13) S.fog = Math.min(1, S.fog + s * 0.03 * (1 + S.agit * 0.5));
      $('.dr-devclock b').textContent = devClock(S.devT);
    }
    if (S.phase === 'develop') { S.devAtPull = S.devT; S.exposureAtPull = S.lampSec * Math.pow(8 / S.fstop, 2) / 6; }
    var tnow = performance.now();
    tweens = tweens.filter(function (tw) {
      var u = clamp((tnow - tw.t0) / tw.ms, 0, 1), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      S[tw.key] = tw.from + (tw.to - tw.from) * e; return u < 1;
    });
  }
  function handRadius() { return Math.max(40, Math.min(paperRect.width, paperRect.height) * 0.2); }
  function draw() {
    if (!gl || lost || gl.isContextLost()) return;
    size();
    var sx = W / innerWidth, sy = H / innerHeight;
    if (expoDirty) {
      for (var i = 0; i < expo.length; i++) expoBytes[i] = Math.min(255, Math.round(expo[i] / 4 * 255));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texExp);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, EXN, EXN, gl.LUMINANCE, gl.UNSIGNED_BYTE, expoBytes); // stored bottom-up
      expoDirty = false;
    }
    var r = stageRect, p = paperRect;
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uPtr, ptr.x * sx, (innerHeight - ptr.y) * sy);
    gl.uniform4f(U.uStage, r.left * sx, (innerHeight - r.top - r.height) * sy, r.width * sx, r.height * sy);
    gl.uniform4f(U.uPaper, p.left * sx, (innerHeight - p.top - p.height) * sy, p.width * sx, p.height * sy);
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uMotion, RM.matches ? 0 : 1);
    gl.uniform1f(U.uLamp, S.lampVis); gl.uniform1f(U.uFocus, S.focus * (S.phase === 'pick' || S.phase === 'expose' ? 1 : 0));
    gl.uniform1f(U.uHand, S.hand); gl.uniform1f(U.uHandR, handRadius() * sx / Math.min(W, H));
    gl.uniform1f(U.uDev, S.phase === 'develop' || S.phase === 'done' ? S.devT : 0); gl.uniform1f(U.uFog, S.fog);
    gl.uniform1f(U.uTray, S.tray); gl.uniform1f(U.uLight, S.light); gl.uniform1f(U.uHasNeg, hasNeg);
    for (var j = 0; j < RIPS; j++) {
      var rp = rips[j];
      ripBuf[j * 4] = rp ? rp[0] * sx : 0; ripBuf[j * 4 + 1] = rp ? (innerHeight - rp[1]) * sy : 0;
      ripBuf[j * 4 + 2] = rp ? rp[2] : 0; ripBuf[j * 4 + 3] = rp ? rp[3] : 0;
    }
    gl.uniform4fv(U.uRip, ripBuf);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    window.__drQA.frames++;
    if (host.getAttribute('data-state') !== 'ready') { host.setAttribute('data-state', 'ready'); html.classList.add('dr-gl'); firstFrameRes(); }
    // the finished print: copy it out of the frame just drawn (same task, so the drawing buffer is still valid)
    if (S.phase === 'done' && !S.captured && S.light > 0.995 && S.tray < 0.005 && !tweens.length) { S.captured = true; setTimeout(capture, 0); }
  }
  /* The finished print, computed on the CPU from the same model the shader draws (negative + exposure grid + paper
     curve + development + fog). No read-back of the WebGL canvas (that stalls the GPU), full resolution whatever the
     screen size, and it works in the no-WebGL fallback too. ~30-60ms once, at the end of the session. */
  function capture() {
    S.captured = true;
    try {
      var img = negImg;
      if (!img || !img.naturalWidth) return;
      var w = Math.min(1200, img.naturalWidth), h = Math.round(w / negAspect), bm = 0.045;
      var big = d.createElement('canvas'); big.width = w; big.height = h;
      var cx = big.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
      var bx = Math.round(w * bm), by = Math.round(h * bm), iw = w - 2 * bx, ih = h - 2 * by;
      cx.drawImage(img, bx, by, iw, ih);
      var id = cx.getImageData(0, 0, w, h), px = id.data;
      var dev = Math.min(S.devAtPull || S.devT || 0, 60), fog = S.fog;
      var flat = nogl ? (S.exposureAtPull || 0) : -1;
      var ex = function (u, v) { // bilinear sample of the exposure grid (row 0 = bottom)
        if (flat >= 0) return flat;
        var fx = clamp(u * EXN - 0.5, 0, EXN - 1), fy = clamp(v * EXN - 0.5, 0, EXN - 1), x0 = fx | 0, y0 = fy | 0;
        var x1 = Math.min(EXN - 1, x0 + 1), y1 = Math.min(EXN - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
        var a = expo[y0 * EXN + x0] + (expo[y0 * EXN + x1] - expo[y0 * EXN + x0]) * tx;
        var b = expo[y1 * EXN + x0] + (expo[y1 * EXN + x1] - expo[y1 * EXN + x0]) * tx;
        return Math.min(4, a + (b - a) * ty);
      };
      for (var y = 0; y < h; y++) {
        var iv = 1 - ((y + 0.5) / h - bm) / (1 - 2 * bm);
        for (var x = 0; x < w; x++) {
          var o = (y * w + x) * 4, iu = ((x + 0.5) / w - bm) / (1 - 2 * bm);
          var inI = iu >= 0 && iu <= 1 && iv >= 0 && iv <= 1 ? 1 : 0;
          var L = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255;
          var Tn = inI ? 0.03 + 0.94 * Math.pow(1 - L, 1.08) : 0;
          var E = inI ? ex(iu, iv) * Tn : 0;
          var Dinf = 1 - Math.exp(-Math.pow(E * 1.45, 1.7));
          var D = Math.min(1, Dinf * (1 - Math.exp(-dev * (0.32 + 1.4 * Dinf) / 2.4)) + fog * (0.35 + 0.3 * (1 - Dinf)) * inI);
          var R = 1 - 0.93 * D;
          px[o] = 255 * (0.075 + (0.95 - 0.075) * R); px[o + 1] = 255 * (0.07 + (0.93 - 0.07) * R); px[o + 2] = 255 * (0.06 + (0.87 - 0.06) * R);
        }
      }
      cx.putImageData(id, 0, 0);
      var out = d.createElement('canvas');
      out.height = 192; out.width = Math.round(192 * negAspect);
      out.getContext('2d').drawImage(big, 0, 0, out.width, out.height);
      var recipe = $('.dr-recipe').textContent;
      prints.unshift({ img: out.toDataURL('image/jpeg', 0.82), recipe: recipe, neg: S.neg });
      prints = prints.slice(0, 8);
      while (prints.length && !store.set('ydx-darkroom-prints', JSON.stringify(prints))) prints.pop();
      if (!prints.length) prints.unshift({ img: out.toDataURL('image/jpeg', 0.82), recipe: recipe, neg: S.neg }); // storage full/blocked: show it anyway
      drawLine(true);
      var dl = $('.dr-dl');
      if (big.toBlob) big.toBlob(function (bl) { if (bl) { if (dl.dataset.url) URL.revokeObjectURL(dl.dataset.url); dl.dataset.url = URL.createObjectURL(bl); dl.href = dl.dataset.url; } }, 'image/png');
      else dl.href = big.toDataURL();
    } catch (e) { /* no thumbnail; the session itself is unaffected */ }
  }
  function loop(nowT) {
    raf = requestAnimationFrame(loop);
    var c0 = performance.now();
    var real = last ? Math.min(nowT - last, 250) : 16.7; // exposure and development follow the wall clock
    var dt = Math.min(real, 50); last = nowT;
    time = (time + dt / 1000) % 1000;
    ema += (dt - ema) * 0.05;
    if (ema > 26 && q > 0.45) { if (++slow > 50) { q *= 0.8; slow = 0; ema = 16; } } else slow = 0;
    for (var i = 0; i < RIPS; i++) if (rips[i] && time - rips[i][2] > 3.5) rips[i] = null;
    layout(); simulate(real); draw();
    window.__drQA.frameMs += (performance.now() - c0 - window.__drQA.frameMs) * 0.1;
  }
  function run() {
    var on = gl && !lost && !d.hidden;
    if (on && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* pointer on the stage: the hand (dodging) on the easel, agitation in the tray */
  function onPtr(e) {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.over = true;
    if (S.phase === 'develop') {
      var dd = Math.hypot(e.clientX - ptr.lastX, e.clientY - ptr.lastY);
      if (COARSE ? ptr.down : true) {
        ptr.travel += dd; S.agit = Math.min(1, S.agit + dd / 900);
        if (ptr.travel > (COARSE ? 40 : 70)) { ripple(e.clientX, e.clientY, Math.min(1, 0.4 + dd / 40)); ptr.travel = 0; }
      }
    }
    ptr.lastX = e.clientX; ptr.lastY = e.clientY;
  }
  stage.addEventListener('pointermove', onPtr);
  stage.addEventListener('pointerdown', function (e) {
    ptr.down = true; onPtr(e);
    if (S.phase === 'develop') { ripple(e.clientX, e.clientY, 1); S.agit = Math.min(1, S.agit + 0.3); }
    try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
  });
  var up = function () { ptr.down = false; if (COARSE) ptr.over = false; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', function () { if (!ptr.down) ptr.over = false; });
  addEventListener('pointermove', function (e) { if (!stage.contains(e.target)) { ptr.x = e.clientX; ptr.y = e.clientY; } }, { passive: true });
  // keyboard: Space/L on the page toggles the lamp while exposing (the button stays the primary control)
  addEventListener('keydown', function (e) {
    if (S.phase === 'expose' && (e.key === 'l' || e.key === 'L') && !/INPUT|TEXTAREA/.test((e.target || {}).tagName)) toggleLamp();
  });

  function startGL() {
    if (!d.body.animate && !window.WebGLRenderingContext) return false;
    host = d.createElement('dr-room'); host.setAttribute('aria-hidden', 'true');
    canvas = d.createElement('canvas'); host.appendChild(canvas);
    try {
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'default' };
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('no webgl');
      initGL();
    } catch (e) { gl = null; return false; }
    d.body.insertBefore(host, d.body.firstChild);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; run(); });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; try { initGL(); run(); } catch (x) { fallback(); } });
    d.addEventListener('visibilitychange', run);
    addEventListener('resize', function () { W = H = 0; }, { passive: true });
    if (RM.addEventListener) RM.addEventListener('change', function () { tweens = []; });
    run();
    return true;
  }
  function fallback() {
    nogl = true; html.classList.add('dr-nogl'); html.classList.remove('dr-gl');
    if (host) host.remove();
    firstFrameRes();
    // the CSS print: lamp timing still counts, so the verdict works too
    setInterval(function () {
      if (S.lamp) { S.lampSec += 0.1; $('.dr-clock b').textContent = ('0' + S.lampSec.toFixed(1)).slice(-4); }
      if (S.phase === 'develop') { S.devT += 0.1; S.devAtPull = S.devT; S.exposureAtPull = S.lampSec * Math.pow(8 / S.fstop, 2) / 6; $('.dr-devclock b').textContent = devClock(S.devT); }
    }, 100);
  }

  /* ---------------------------------------------------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------------------------------------------------- */
  function boot() {
    applyLang();
    setNeg(0);
    if (!startGL()) fallback();
    go(1);
    loader();
    // a hint of life before any input: one slow ripple-free focus projection is already showing; on touch, show
    // that the paper takes a finger by drawing the hand once across it
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
