/* Form & Field. One requestAnimationFrame loop for Lenis and the loupe; it sleeps when nothing moves.
   Layout is read on load, resize and at the start of a drag, never per frame.
   Per-frame writes are transforms on single elements, never custom properties on a parent. */
(() => {
  'use strict';
  const { clamp, insight, formatTracking, cleanWord, saveOutcome, SAVE_COPY, clampBox } = StudyLogic;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const scrollDriven = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');

  /* ---------- menu ---------- */
  const menu = $('.menu-toggle'), mobile = $('#mobile-nav');
  const setMenu = open => { menu.setAttribute('aria-expanded', String(open)); mobile.hidden = !open; menu.querySelector('span').textContent = open ? '−' : '+'; };
  menu.addEventListener('click', () => setMenu(mobile.hidden));
  mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobile.hidden) { setMenu(false); menu.focus(); } });

  /* ---------- one clock ---------- */
  let lenis = null, raf = 0;
  const steppers = new Set();           // functions that return true while they still need frames
  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    let more = false;
    if (lenis) { lenis.raf(now); if (lenis.isScrolling) more = true; }
    steppers.forEach(step => { if (step(now)) more = true; });
    if (more) schedule();
  }
  function setupLenis() {
    lenis?.destroy(); lenis = null;
    if (reduced.matches || !window.Lenis) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, anchors: { duration: 1.2 }, autoRaf: false });
    lenis.on('virtual-scroll', schedule);
    lenis.on('scroll', schedule);
  }
  /* ydx: let the enhancement layer jump instantly under a page transition (ydx/enhance.js) */
  Object.defineProperty(window, 'ffLenis', { configurable: true, get: () => lenis });
  setupLenis();
  reduced.addEventListener('change', () => { setupLenis(); loupeReset(); });
  window.addEventListener('scroll', schedule, { passive: true });
  document.addEventListener('click', schedule);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else schedule(); });

  /* ---------- section state: .in once (drawn marks), .on while visible (loops) ---------- */
  const seen = new IntersectionObserver(entries => entries.forEach(e => {
    e.target.classList.toggle('on', e.isIntersecting);
    if (e.isIntersecting && e.intersectionRatio > 0.12) e.target.classList.add('in');
  }), { threshold: [0, 0.14, 0.3] });
  $$('.sec,.ribbon,.hero').forEach(el => seen.observe(el));

  /* ---------- the loupe ---------- */
  const hero = $('.hero'), loupe = $('#loupe'), world = $('.loupe-world'), flood = $('.flood'), heroEm = $('.hero h1 em');
  const L = { x: 0, y: 0, tx: 0, ty: 0, restX: 0, restY: 0, D: 0, w: 0, h: 0, span: 0, touched: false, dragging: false, idleUntil: 0, t0: 0 };
  function loupeWrite() {
    const x = Math.round(L.x * 10) / 10, y = Math.round(L.y * 10) / 10;
    loupe.style.transform = `translate3d(${x}px,${y}px,0)`;
    world.style.transform = `translate3d(${-x}px,${-y}px,0)`;
    flood.style.transform = `translate3d(${x + L.D / 2}px,${y + L.D / 2}px,0)`;
  }
  function loupeMeasure() {                      // load and resize only
    const hr = hero.getBoundingClientRect(), er = heroEm.getBoundingClientRect();
    L.w = hr.width; L.h = hr.height; L.D = loupe.offsetWidth; L.span = er.width;
    world.style.width = hr.width + 'px'; world.style.height = hr.height + 'px';
    L.restX = er.left - hr.left + er.width * 0.4 - L.D / 2;
    L.restY = er.top - hr.top + er.height * 0.5 - L.D / 2;
    L.restX = clamp(L.restX, -L.D * 0.2, L.w - L.D * 0.8);
  }
  function loupeReset() { loupeMeasure(); L.x = L.tx = L.restX; L.y = L.ty = L.restY; loupeWrite(); }
  function loupeStep(now) {
    if (L.dragging) return false;
    if (!L.touched && now < L.idleUntil) {       // a slow pass over the word, twice, then rest
      const t = (now - L.t0) / 1000;
      L.tx = L.restX + Math.sin(t * 0.8) * L.span * 0.24;
      L.ty = L.restY + Math.sin(t * 1.6) * L.D * 0.03;
    }
    const dx = L.tx - L.x, dy = L.ty - L.y;
    if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
      if (L.x !== L.tx || L.y !== L.ty) { L.x = L.tx; L.y = L.ty; loupeWrite(); }
      return !L.touched && now < L.idleUntil && hero.classList.contains('on');
    }
    const k = reduced.matches ? 1 : 0.16;
    L.x += dx * k; L.y += dy * k; loupeWrite();
    return true;
  }
  steppers.add(loupeStep);
  const aim = (cx, cy) => {
    const hr = hero.getBoundingClientRect();
    L.tx = clamp(cx - hr.left, 0, L.w) - L.D / 2;
    L.ty = clamp(cy - hr.top, 0, L.h) - L.D / 2;
  };
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || L.dragging || hero.inert) return;
    L.touched = true; aim(e.clientX, e.clientY); schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { L.tx = L.restX; L.ty = L.restY; schedule(); } });
  let grab = null;
  loupe.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;       // the mouse already carries it
    grab = { id: e.pointerId, ox: e.clientX - L.x, oy: e.clientY - L.y };
    L.touched = true; L.dragging = true; loupe.classList.add('grab');
    try { loupe.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  });
  loupe.addEventListener('pointermove', e => {
    if (!grab || e.pointerId !== grab.id) return;
    L.x = L.tx = clamp(e.clientX - grab.ox, -L.D * 0.3, L.w - L.D * 0.7);
    L.y = L.ty = clamp(e.clientY - grab.oy, -L.D * 0.2, L.h - L.D * 0.6);
    loupeWrite();
  });
  const release = e => { if (grab && e.pointerId === grab.id) { grab = null; L.dragging = false; loupe.classList.remove('grab'); } };
  loupe.addEventListener('pointerup', release); loupe.addEventListener('pointercancel', release);
  function loupeStart() {
    loupeReset();
    if (!reduced.matches) { L.t0 = performance.now(); L.idleUntil = L.t0 + 15700; schedule(); }
  }
  (document.fonts?.ready || Promise.resolve()).then(loupeStart);
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { loupeReset(); lenis?.resize(); }, 120); }, { passive: true });

  /* While the cover is flooded (pinned mode) its links are out of reach. */
  if (scrollDriven) {
    const mark = document.createElement('i');
    mark.style.cssText = 'position:absolute;left:0;top:48svh;width:1px;height:1px;pointer-events:none';
    $('.hero-run').append(mark);
    new IntersectionObserver(([e]) => {
      const covered = !reduced.matches && !e.isIntersecting && e.boundingClientRect.top < 0;
      hero.inert = covered;
      const beat = $('#hero-beat'); if (beat) beat.textContent = covered ? '02 / REFRAME' : '01 / LOOK';
    }, { threshold: 0 }).observe(mark);
  }

  /* ---------- small helpers ---------- */
  function tabs(buttons, onSelect) {
    const select = (btn, focus) => {
      buttons.forEach(b => { const on = b === btn; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      if (focus) btn.focus();
      onSelect(btn);
    };
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return; e.preventDefault(); select(buttons[(i + d + buttons.length) % buttons.length], true);
      });
    });
    return select;
  }
  function pressGroup(buttons, onPick) {
    buttons.forEach(b => b.addEventListener('click', () => { buttons.forEach(o => o.setAttribute('aria-pressed', String(o === b))); onPick(b); }));
  }
  /* Drag with the pointer; vertical touch pans still scroll the page (touch-action: pan-y in CSS). */
  function draggable(el, { start, move, end }) {
    let d = null;
    el.addEventListener('pointerdown', e => {
      if (e.button) return;
      const s = start(e); if (s === false) return;
      d = { id: e.pointerId, x: e.clientX, y: e.clientY, s };
      try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    });
    el.addEventListener('pointermove', e => { if (d && e.pointerId === d.id) move(e.clientX - d.x, e.clientY - d.y, d.s); });
    const stop = e => { if (d && e.pointerId === d.id) { d = null; end?.(); } };
    el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
    el.addEventListener('dragstart', e => e.preventDefault());
  }

  /* ---------- study 01: frame / scale / hierarchy ---------- */
  const artboard = $('#artboard'), artWindow = $('#art-window');
  const win = { l: 34, t: 26, w: 38, h: 50 };
  const readWin = () => { const cs = getComputedStyle(artWindow); ['l', 't', 'w', 'h'].forEach(k => win[k] = parseFloat(cs.getPropertyValue('--' + k))); };
  readWin();
  tabs($$('.frame-tabs [role=tab]'), btn => { artboard.dataset.mode = btn.dataset.mode; artboard.setAttribute('aria-labelledby', btn.id); });
  draggable(artboard, {
    start() { if (artboard.dataset.mode !== 'frame') return false; readWin(); artboard.classList.add('dragging', 'used'); const r = artboard.getBoundingClientRect(); return { l: win.l, t: win.t, W: r.width, H: r.height }; },
    move(dx, dy, s) {
      win.l = clampBox(s.l + dx / s.W * 100, win.w); win.t = clampBox(s.t + dy / s.H * 100, win.h);
      artWindow.style.setProperty('--l', win.l + '%'); artWindow.style.setProperty('--t', win.t + '%');
    },
    end() { artboard.classList.remove('dragging'); }
  });

  /* ---------- study 02: question the obvious ---------- */
  const qStage = $('#q-stage'), qLess = $('#q-less'), qWhy = $('#q-why');
  $('#q-look').addEventListener('click', () => { qStage.dataset.view = String((Number(qStage.dataset.view) + 1) % 3); });
  qLess.addEventListener('click', () => {
    const n = (Number(qStage.dataset.less) + 1) % 4; qStage.dataset.less = String(n);
    qLess.querySelector('span').textContent = n === 3 ? '↺' : '−';
    qLess.setAttribute('aria-label', n === 3 ? 'Subtract: put the removed elements back' : 'Subtract: remove one element from the headline');
  });
  qWhy.addEventListener('click', () => { const on = qStage.dataset.why !== '1'; qStage.dataset.why = on ? '1' : '0'; qWhy.setAttribute('aria-pressed', String(on)); });

  /* ---------- 01 observe: squint and re-crop ---------- */
  const squint = $('#squint'), squintPoster = $('#squint-poster'), cropFrame = $('#crop-frame'), cropImg = $('img', cropFrame);
  squint.addEventListener('click', () => { const on = squint.getAttribute('aria-pressed') !== 'true'; squint.setAttribute('aria-pressed', String(on)); squintPoster.classList.toggle('squinting', on); });
  const pan = { x: -34, y: -30 };
  draggable(cropFrame, {
    start() { const f = cropFrame.getBoundingClientRect(), i = cropImg.getBoundingClientRect(); $('.plate-observe .plate-hint')?.remove(); return { x: pan.x, y: pan.y, iw: i.width, ih: i.height, minX: -(1 - f.width / i.width) * 100, minY: -(1 - f.height / i.height) * 100 }; },
    move(dx, dy, s) {
      pan.x = clamp(s.x + dx / s.iw * 100, s.minX, 0); pan.y = clamp(s.y + dy / s.ih * 100, s.minY, 0);
      cropImg.style.transform = `translate3d(${pan.x}%,${pan.y}%,0)`;
    }
  });

  /* ---------- 02 questions ---------- */
  pressGroup($$('#q-stack button'), () => {});

  /* ---------- the reader's word: 03 voices, the playground and the closing card ---------- */
  const voices = $('#voices'), voiceWord = $('#voice-word'), specimen = $('#type-specimen'), specimenWrap = $('.specimen-wrap');
  const ysWord = $('#ys-word'), ysRead = $('#ys-read'), yourStudy = $('#your-study');
  const wordInputs = $$('.word-input');
  const defaults = new Map(wordInputs.map(i => [i, i.value]));
  function letters(el, text) { el.textContent = ''; [...text].forEach(ch => { const b = document.createElement('b'); b.textContent = ch; el.append(b); }); el.style.setProperty('--n', String(Math.max(3, text.length))); }
  function setLabWord(text) {
    specimen.textContent = text; ysWord.textContent = text;
    const len = String(Math.max(4, text.length));
    specimenWrap.style.setProperty('--len', len); specimen.style.setProperty('--len', len); ysWord.style.setProperty('--len', len);
  }
  function setWord(text, from) {
    letters(voiceWord, text); setLabWord(text);
    wordInputs.forEach(i => { if (i !== from) i.value = text; });
  }
  letters(voiceWord, voiceWord.textContent);
  wordInputs.forEach(input => input.addEventListener('input', () => {
    const text = cleanWord(input.value, '');
    if (text) setWord(text, input);
    else { letters(voiceWord, defaults.get(wordInputs[0])); setLabWord(defaults.get(wordInputs[1])); }
  }));
  wordInputs.forEach(input => input.addEventListener('blur', () => { if (!cleanWord(input.value, '')) wordInputs.forEach(i => { i.value = defaults.get(i); }); }));
  pressGroup($$('.seg button', voices), b => { voices.dataset.voice = b.dataset.voice; });

  /* ---------- 003 playground ---------- */
  const weight = $('#weight'), tracking = $('#tracking');
  const words = ['Observe.', 'Question.', 'Make.', 'Refine.']; let wordIndex = 0;
  function updateType() {
    const w = Number(weight.value), t = Number(tracking.value) / 100;
    specimen.style.fontWeight = w; specimen.style.letterSpacing = t + 'em';
    ysWord.style.fontWeight = w; ysWord.style.letterSpacing = t + 'em';
    const tr = formatTracking(t);
    $('#weight-value').value = w; $('#tracking-value').value = tr;
    $('#read-w').textContent = w; $('#read-t').textContent = tr;
    ysRead.textContent = `${w} / ${tr.toUpperCase()}`;
    $('#lab-insight').textContent = insight(w, t);
  }
  weight.addEventListener('input', updateType); tracking.addEventListener('input', updateType);
  $('#change-word').addEventListener('click', () => { wordIndex = (wordIndex + 1) % words.length; setWord(words[wordIndex], null); });
  $('#reset-type').addEventListener('click', () => {
    weight.value = 500; tracking.value = -4; wordIndex = 0;
    letters(voiceWord, defaults.get(wordInputs[0])); setLabWord(words[0]);
    wordInputs.forEach(i => { i.value = defaults.get(i); });
    updateType();
  });
  updateType();

  /* ---------- 04 colour: the reader changes the field ---------- */
  const ch4 = $('#ch-4'), swatches = $$('.sw', ch4), indexColour = $('.idx-colour');
  let floodBusy = false;
  swatches.forEach(sw => sw.addEventListener('click', e => {
    const field = sw.dataset.field;
    if (field === ch4.dataset.field || floodBusy) return;
    swatches.forEach(o => o.setAttribute('aria-pressed', String(o === sw)));
    const apply = () => { ch4.dataset.field = field; yourStudy.dataset.field = field; if (indexColour) indexColour.dataset.field = field; };
    if (reduced.matches || !ch4.animate) { apply(); return; }
    const r = ch4.getBoundingClientRect(), sr = sw.getBoundingClientRect();
    const cx = sr.left + sr.width / 2 - r.left, cy = sr.top + sr.height / 2 - r.top;
    const rad = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy));
    const fx = document.createElement('i'); fx.className = 'flood-fx'; fx.dataset.field = field;
    fx.style.cssText = `left:${cx - rad}px;top:${cy - rad}px;width:${rad * 2}px;height:${rad * 2}px;background:var(--field)`;
    ch4.prepend(fx); floodBusy = true;
    const anim = fx.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 620, easing: 'cubic-bezier(.3,.7,.2,1)' });
    setTimeout(() => { ch4.style.color = getComputedStyle(fx).getPropertyValue('--on'); }, 200);
    anim.finished.finally(() => { apply(); ch4.style.color = ''; fx.remove(); floodBusy = false; });
  }));

  /* ---------- 05 motion: a save action in four states ---------- */
  const saveDemo = $('#save-demo'), saveBtn = $('#save-btn'), saveLabel = $('#save-label'), saveFeedback = $('#save-feedback');
  let attempts = 0, saveTimer = 0;
  function saveState(state) {
    saveDemo.dataset.state = state; saveLabel.textContent = SAVE_COPY[state].label; saveFeedback.textContent = SAVE_COPY[state].feedback;
    saveBtn.setAttribute('aria-busy', String(state === 'saving'));
  }
  saveBtn.addEventListener('click', () => {
    if (saveDemo.dataset.state === 'saving') return;
    attempts += 1; saveState('saving'); clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const outcome = saveOutcome(attempts); saveState(outcome);
      if (outcome === 'saved') saveTimer = setTimeout(() => saveState('ready'), 2600);
    }, 1150);
  });

  /* ---------- study 03: posters (a swipe strip on small screens) ---------- */
  const track = $('#poster-track'), posters = $$('.poster-study'), prev = $('#poster-prev'), next = $('#poster-next'), count = $('#poster-count');
  const posterStep = () => Math.max(1, posters[1].offsetLeft - posters[0].offsetLeft);
  function posterPosition() { const i = clamp(Math.round(track.scrollLeft / posterStep()), 0, 2); prev.disabled = i === 0; next.disabled = i === 2; count.textContent = `0${i + 1} / 03`; }
  const movePoster = d => { const i = Math.round(track.scrollLeft / posterStep()); track.scrollTo({ left: clamp(i + d, 0, 2) * posterStep(), behavior: reduced.matches ? 'instant' : 'smooth' }); };
  prev.addEventListener('click', () => movePoster(-1)); next.addEventListener('click', () => movePoster(1));
  let posterTick = 0;
  track.addEventListener('scroll', () => { if (!posterTick) posterTick = requestAnimationFrame(() => { posterTick = 0; posterPosition(); }); }, { passive: true });
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') movePoster(1); if (e.key === 'ArrowLeft') movePoster(-1); });
  posterPosition();

  /* ---------- study 04: notice, question, revise ---------- */
  const draft = $('#draft'), critCards = $$('.critique-card');
  const critSelect = tabs($$('.critique-steps [role=tab]'), btn => {
    draft.dataset.step = btn.dataset.step;
    critCards.forEach(c => c.classList.toggle('active', c.dataset.step === btn.dataset.step));
  });
  critCards.forEach(card => card.addEventListener('click', () => critSelect($(`.critique-steps [data-step="${card.dataset.step}"]`))));
  critCards[0].classList.add('active');

  /* ---------- 004 daily practice ---------- */
  const exercises = [
    { title: 'Find the invisible grid.', meta: 'OBSERVATION · 15 MINUTES', body: 'Choose a magazine spread. Trace the alignments between its text and images. Rebuild the layout with simple rectangles, then change one alignment and notice what breaks.' },
    { title: 'One font. Three voices.', meta: 'TYPOGRAPHY · 20 MINUTES', body: 'Write a five-word headline. Set it three ways: a whisper, a statement, and a shout. Keep the typeface the same. Use only size, weight, spacing, and position to change the tone.' },
    { title: 'Start with someone else.', meta: 'EMPATHY · 20 MINUTES', body: 'Ask a friend to show you one frustrating everyday task. Observe without offering solutions. Write down where they hesitate, then sketch one small change that could help.' },
    { title: 'Subtract until it speaks.', meta: 'COMPOSITION · 15 MINUTES', body: 'Take a design you have already made. Remove one element at a time. Stop when removing the next element would lose meaning. Compare this version with the original.' },
    { title: 'Design what happens next.', meta: 'INTERACTION · 25 MINUTES', body: 'Sketch a button before, during, and after saving a file. Add a failed state and a way to recover. Ask someone to explain what each state means without telling them first.' },
    { title: 'Trade opinions for evidence.', meta: 'CRITIQUE · 20 MINUTES', body: 'Show someone a draft for five seconds, then hide it. Ask what they remember and what they think they should do next. Revise the hierarchy to close one gap between your intent and their answer.' }
  ];
  let exerciseIndex = 0; const card = $('.exercise-card');
  $('#new-prompt').addEventListener('click', () => {
    exerciseIndex = (exerciseIndex + 1) % exercises.length; const e = exercises[exerciseIndex];
    $('#exercise-title').textContent = e.title; $('#exercise-meta').textContent = e.meta; $('#exercise-body').textContent = e.body;
    $('#exercise-number').textContent = String(exerciseIndex + 1).padStart(2, '0') + ' / 06';
    card.classList.remove('changing'); requestAnimationFrame(() => card.classList.add('changing'));
  });
  card.addEventListener('animationend', () => card.classList.remove('changing'));

  schedule();
})();
