/* Pure logic for the studies, shared by the page and the tests (node --test tests/*.test.cjs). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StudyLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* The playground's sentence about what the reader just did. Wording is the original site's. */
  function insight(weight, tracking) {
    const first = weight < 360 ? 'A light weight feels delicate. Notice how the counters open up.'
      : weight > 650 ? 'A heavy weight gives the word more presence. Watch the spaces inside the letters.'
        : 'A middle weight leaves room for the letterforms to speak.';
    const second = tracking < 0 ? 'Tight spacing makes the word feel like a single shape.'
      : tracking > 0.03 ? 'Open spacing slows the rhythm. Too much can make a word feel disconnected.'
        : 'Neutral spacing keeps the rhythm steady and easy to read.';
    return first + ' ' + second;
  }
  const formatTracking = t => (t < 0 ? '−' : '') + Math.abs(t).toFixed(2) + ' em';
  const cleanWord = (value, fallback) => {
    const w = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 14);
    return w || fallback;
  };

  /* The save demo: every third attempt fails once, so the failed state and the recovery can be seen. */
  function saveOutcome(attempt) { return attempt % 3 === 0 ? 'failed' : 'saved'; }
  const SAVE_COPY = {
    ready: { label: 'Save', feedback: 'Nothing saved yet.' },
    saving: { label: 'Saving…', feedback: 'Saving your work…' },
    saved: { label: 'Saved', feedback: 'Saved. Safe to close.' },
    failed: { label: 'Try again', feedback: 'Not saved. Your work is still here.' }
  };

  /* Keep a dragged box inside its bounds. */
  function clampBox(pos, size, min = 0, max = 100) { return clamp(pos, min, max - size); }

  return { clamp, insight, formatTracking, cleanWord, saveOutcome, SAVE_COPY, clampBox };
});
