# Form & Field: design and motion pass

## The site as found

- **Structure:** one long editorial page (~18,800px desktop): a pinned cover (yellow, the loupe over "A designer in the
  making.") that floods violet into "Look closer. See differently.", a marquee ribbon, the manifesto, four interactive
  studies (frame/scale/hierarchy, question the obvious, three posters, the feedback loop), the six-chapter field guide,
  the variable-type playground, daily practice and the closing card. All navigation is in-page anchors (`#field-guide`,
  `#playground`, `#practice`, `#ch-1`…`#ch-6`, `#top`).
- **Art direction:** a printer's proof. Fields of flat colour (yellow, violet, pink, mint, paper, ink), crop marks,
  registration marks, a five-colour proof bar, Display (variable, 200–800) set tight, Editorial italic for one word per
  headline, Mono kickers, Hand annotations, cut-out tools that land on the page.
- **Existing motion (kept, not doubled):** Lenis smooth scroll; the loupe (pointer follower plus idle sweep); CSS
  scroll-driven animations for the cover flood, the discovery lines, headline `rise`, cut-outs `land`, chapter numbers
  `drift`, the index and posters; `.in`/`.on` classes from one IntersectionObserver (strike-throughs, loop marks,
  critique marks, ribbon marquee); the swatch flood in chapter 04; the card "deal"; the save-button states.
  The source is hand-written and readable. Its own rules (only transform, opacity and one-shot clip-path; no blend modes
  or filters; loops gated by `.on`) were followed here too.

## Added

- **Loader: a type-specimen proof sheet** (inline critical CSS + markup as the first child of `<body>`, animated by
  `enhance.js`). Paper sheet with a 4.9vw ruling grid that draws in, crop marks that register, the wordmark
  `form&field✳` set letter by letter like sorts dropping into a composing stick, an x-height guide and a pink baseline,
  with Hand-lettered "x-height" / "baseline" notes. As the page loads, the wordmark **inks up on its variable axis from
  wght 200 to 800**. A mono readout counts `WGHT 200→800` and `000→100%`, the pink baseline rules across as the progress
  line, and the five proof-bar chips fill. The status ends on "Ready to print." Exit: the letters lift, the paper is
  pulled off in five strips, the colour bar under it (violet, pink, mint, ink, white) follows, and the cover is printed in.
  - First visit: about 1.45s minimum, then the exit. Repeat visit in the same session (sessionStorage, in try/catch):
    the sheet is already inked, 380ms plus a short exit. In an iframe (hub preview): about 740ms in total. Reduced
    motion: a static sheet that fades. Hard safety at 4s (0.8s in an iframe), plus a 6s inline failsafe if
    `enhance.js` never runs. Without JS the loader never shows, because it is keyed on `html.ydx-loading`.
- **Cover print-in** (after the loader): the two headline lines are inked left to right with clip-path only, so the
  loupe's measurements stay true. The blueprint copy inside the lens follows them. The lens drops in with a small
  overshoot, using individual `scale`/`rotate` properties with the origin at the lens centre, and the violet flood disc
  is held back until the lens has landed. The small print and the proof strip settle in, the crop marks register,
  "look closer" is written in, and its arrow draws.
- **Page transitions:** an anchor jump longer than 1.2 viewports (nav, mobile nav, chapter index, "Explore / Revisit
  the field guide", wordmark → `#top`) covers the page with five plates in the **destination's field colour**, edged
  with the proof-bar colours. The destination's kicker and headline are set on them, with the italic word kept in the
  field's accent colour. The page jumps while covered and the plates lift away (about 740ms). Short jumps keep Lenis'
  glide. Focus moves to the destination section. Modifier clicks, the skip link and reduced motion keep the default.
- **Reveals:** section and chapter headlines rise word by word out of their own line (word masks, Latin only, never
  letters). This sits alongside the existing scroll-driven `rise` on the heading itself, not on top of it. Copy blocks,
  slips, plates, tabs, the type lab and the critique deck settle in with a stagger. The Observe plate and the Frame
  artboard wipe open like a print coming out. Everything is one-shot WAAPI on `opacity`/`translate`/clip-path, so none
  of the site's own transitions are overridden.
- **Printer's marks on arrival:** crop marks register (scale in), kicker rules draw left to right, registration marks
  turn a half turn, foot-row rules fade in. All of these are keyed on the site's own `.in` class. The manifesto
  strike-through now waits for the words it crosses out.
- **Small things:** magnetic pill buttons, round arrows, the "Daily practice" CTA and the study buttons (pointer: fine
  only). The ribbon follows scroll speed and runs backwards when you scroll up (`playbackRate` on its existing CSS
  animation, only while the ribbon is on screen). The ribbon's ✳ turn like the brand star. The mobile menu sheet unrolls
  and sets its lines one by one, and the +/− turns. The footer prints its colour bar. Chapter-index numbers slide on
  hover/focus.

## Bugs fixed

- **Mobile (390 and 360):** the "look closer" hand note sat on top of "THE WORK BEHIND THE WORK". It now hangs beside
  "in the", pointing at the lens.
- **Mobile:** the cover's proof strip ("01 / LOOK") ran into its own bottom crop marks. It now sits inside them.
- **Mobile:** the playground ruler covered the `500 / −0.04 EM` readout. It now sits lower, across the seam.
- **All viewports:** the playground's specimen line "Aa Bb Cc Dd…" was forced to "AA BB CC" by `.mono`
  text-transform, which defeats a mixed-case specimen. It is now mixed case.
- **All viewports:** "Design the in-between." broke at the hyphen inside its chapter-index card ("in- / between.").
  Wrapped in `.ydx-nowrap`.
- **Touch (`pointer: coarse`):** tap targets under 44px are fixed. Study buttons (36px), Squint (34px), critique steps
  (38px), the menu toggle (43px), voice segments (32px), text buttons (38px), word inputs (32px) and range inputs (34px)
  were enlarged or given invisible hit areas. The three scaled questions in chapter 02 (29px tall at scale .56) got a
  hit area that does not change their look.
- No horizontal overflow at 360, 390, 1280, 1440 or 1920, before or after.

## Readable-source edits

- `index.html`: the ydx head block (mode script, critical loader CSS, `enhance.css`/`enhance.js` links) and the
  loader markup as the first child of `<body>`, all marked `ydx`. In the chapter index, `in-between.` is wrapped in
  `<span class="ydx-nowrap">`.
- `app.js`: one line after `setupLenis()` exposes the live Lenis instance as a read-only `window.ffLenis` getter, so a
  page transition can jump with `lenis.scrollTo(y, { immediate: true, force: true })` even while Lenis is gliding.

## Left alone, on purpose

- **No custom cursor:** on the cover the loupe already is the cursor follower, and a second follower would compete
  with it. The drag hints ("drag the frame", "drag the picture") already explain the drag zones.
- **Hard cuts between fields:** they are the art direction (a stack of coloured proofs). Colour cross-fades would soften it.
- The posters, critique cards, exercise card and chapter-index lift keep their own transforms and transitions. Reveals
  wrap around them, or only touch their containers, so the hover and active states stay as designed.
- The mobile menu closes instantly. That is still the site's own `hidden` toggle, kept because a link tap goes straight
  into the page transition.

## Round 2

A second review, done the way a first-time visitor meets the site. I recorded the loader and every transition as
screencast frame sequences (CDP `Page.startScreencast`) on desktop 1440×900, iPhone 13, landscape 844×390 and the hub
iframe. I also tested the loader on slow 3G (400 kbps, 400 ms RTT, cache off) with the CPU throttled 4×. CLS and long
tasks were measured with and without the ydx layer (`/ydx/*` routed to 404). I did a keyboard-only pass, then walked
the page at 360, 390, 768, 1024, 1280, 1440 and 1920, and in landscape at 667×375, 740×360, 844×390 and 932×430.
The site is English only and has one route.

### Found and fixed

- **Loader layout shift.** CLS went from 0.002 without ydx to 0.008–0.010 with it. The cause was the wordmark inking
  from wght 200 to 800: each heavier letter pushed the next one along. Each sort now sits in a fixed slot as wide as
  its weight-800 glyph (`--a2`/`--a8` em widths, measured from the font and hard-coded on the `<b>`s). A `translate`
  derived from `--w` keeps the glyph centred, so inking moves nothing. The slots switch on only once Display has
  loaded (`html.ydx-df`), so the fallback face never overlaps. CLS with ydx now matches the baseline (desktop 0.0002,
  mobile 0.001).
- **The sheet fading to grey.** On exit the wordmark faded through ~300 ms of grey ghost before the strips moved. Now
  the proof tears: each of the five paper strips carries its own slice of the printed sheet (a clone offset to its
  column, with animations frozen and the star's angle kept) and leaves with it. The colour plates follow. The beat
  before the tear went from 210 ms to 60 ms, and the cover starts printing while the plates are still passing.
  One trap here: the strips are `<i>` elements, so the clones had to be reset to `font-style:normal`.
- **The lens arrived as a muddy ghost.** The lens photo and the violet view faded in over 45% of the drop, so for
  ~400 ms a see-through brown lens sat on the yellow. It is now opaque within the first ~10% of the drop.
- **Repeat, iframe and reduced-motion loaders flashed a weight-200 word** before JS jumped it to 800. These modes now
  open on an inked sheet in CSS.
- **Slow networks.** On slow 3G the loader froze at "wght 200 / 000%" for about 5 s, until the deferred scripts
  arrived. The inline failsafe then cut it off with a hard jump, in the middle of enhance.js's own exit. Fixes:
  - the sheet keeps inking on its own in CSS: registered `@property --w` plus a baseline creep, picked up seamlessly
    by JS;
  - all times now count from when the sheet was painted (`__ydxT0`), not from navigation start;
  - enhance.js cancels the inline failsafe as soon as it runs;
  - the failsafe (4.2 s, or 1.5 s in an iframe) now fades out over .4 s instead of cutting;
  - if the script arrives after the cap, the short exit plays.
  The ink easing is frame-rate independent, so a slow CPU no longer stretches the loader.
- **Hub iframe.** Its cap was 800 ms before an exit of about 500 ms. The cap is now 420 ms, so the whole run stays
  under ~0.8 s.
- **Transition landed on a strip of the previous field.** With `scroll-padding-top:70px`, a jump to the pink
  "practice" field showed a 70 px mint band at the top, so pink plates lifted onto mint. Transitions now land flush
  on `.sec[data-field]` and `#top`. The floating header pills sit over the field and clear the crop marks. Short
  native glides keep the padding.
- **Double entrance after a transition.** The plates showed the destination headline, then the page raised the same
  headline word by word. The headline that was shown on the plates is now settled. Body copy still settles in.
- **Label cross-dissolve.** On a plate the same colour as the field, the plate label faded while the plates opened,
  so the two headlines showed through each other. The label now leaves (120 ms) before the plates open. The timings
  were tightened as well (cover 200 / stagger 16 / reveal 260, about 770 ms in total).
- **Chapter index, 861–1440 px.** `repeat(6,1fr)` took the min-content of "relationships.", so at 1024 px the row
  was 1059 px wide in a 954 px box and card 06 ran off the right edge. The fix is `minmax(0,1fr)` with the titles
  scaled to the card (`clamp(16px, 2.5vw - 6px, 36px)`). Measured: no card overflows from 861 to 1920.
- **Landscape phones (≤500 px tall).** The cover kept its 560 px minimum and the portrait lens (400 px) on a 390 px
  screen. The lens hid the whole headline, and the lede, the CTA and the proof strip were pinned below the fold and
  never seen. The cover now fits the screen: a two-line headline on the left, the lede on the right, "look closer"
  top right, and a lens sized to the height. The blueprint inside the lens follows it, because app.js re-measures.
  The loader's "x-height" note no longer collides with the crop marks.
- **Phones (≤480).** Chapter 06's crumpled paper ball landed on "with intent." (or on "with", depending on the wrap)
  and on its kicker. It now lies under "Make better." beside the knife, like a discarded first draft.
- **Mobile menu exit.** The sheet vanished instantly on close. It now rolls back up (240 ms ease-in) using a discrete
  `display` transition. It opens with `@starting-style`. The old keyframe animation on the sheet was removed, because
  it blocked the exit transition in Chromium. The lines' stagger is kept.

### Performance

- **Fonts.** The site shipped three variable TTFs (1.55 MB raw, about 760 KB brotli on the live site), and the loader
  waits on them. I added Latin-subset WOFF2 builds made with fontTools, keeping every axis and every layout feature:
  `display.woff2` 168 KB, `editorial.woff2` 186 KB and `body.woff2` 56 KB, about 410 KB in total, roughly half the
  bytes. The subset covers U+0020–007E, U+00A0–017F, punctuation, arrows, −, ◐, ✳ and the fi/fl ligatures.
  `styles.css` lists the WOFF2 first and keeps the TTF as fallback, and the two `<link rel=preload>` lines now point
  at the WOFF2. A pixel diff at 200/400/600/800 and wdth 75/100 showed sub-pixel antialiasing differences only. The
  TTFs stay in `assets/`.
- **Long tasks.** These swung between 13 and 53 per run on this shared machine whether or not ydx was loaded, so I
  could not attribute any of them to ydx. Style, layout and script totals over a full scroll stay under 0.5 s either
  way. The init work (word split, one layout read per reveal element) runs once.

### Added (second loop, less but better)

- **Reading progress as the proof colour bar.** A 3 px strip along the top edge prints the five proof colours left
  to right as you read, with a 1 px ink keyline so a segment never disappears into its own field. It is a pure CSS
  scroll timeline, with no per-frame script, and is hidden where scroll timelines are not supported. It suits an
  18,800 px long-read.
- The mobile menu now has an exit (above), and the proof tears on the loader's exit (above).

### Toned down / removed

- The study buttons in "Question the obvious" (`.q-btn`) are no longer magnetic. In a row of choices the drift read
  as jitter. Magnetism is kept on the pill CTAs, the round arrows and the nav CTA.
- The loader's exit lost its slow fade, and the transition label lost ~40 ms of hold.

### Audited, left as is

- Keyboard: Tab order follows the reading order. Every stop has a visible ring, or its own focus style (the word
  inputs). Tab during the loader goes to the skip link, never into the overlay. Enter on a nav link plays the
  transition and moves focus to the section, and the next Tab continues from there. Escape closes the mobile menu and
  returns focus to the toggle. The loader and the shutter are `aria-hidden`, so nothing is announced twice.
- Reduced motion: a static sheet that fades. Anchors jump natively. No menu animation. No console errors.
- No horizontal overflow at any width tested. Zero console errors or failed requests (`tools/shoot.mjs` desktop and
  mobile, plus every Playwright run above).
- Still true from round 1: the hard cuts between fields are the art direction, and the loupe stays the only cursor
  follower.

### Files touched in round 2

- `ydx/enhance.js`
- `ydx/enhance.css`
- `index.html`: the inline loader script and CSS, the `--a2`/`--a8` slots on the loader letters, the font preloads
- `styles.css`: the three `@font-face` `src` lists
- new `assets/display.woff2`, `assets/editorial.woff2`, `assets/body.woff2`

## Round 3

A line-by-line review of the whole ydx layer (inline boot script and CSS, `enhance.js`, `enhance.css`) for production.
Each suspected bug got a focused Playwright test first, which failed before the fix and passes after (11/11). The
scripts are in the round-3 scratch folder: `bugs.mjs`, `prod.mjs`, `bg.mjs`, `back.mjs`, `twice.mjs`, `order.mjs`.

### Bugs found and fixed

- **The loader could trap the page.** enhance.js cancels the inline failsafe as soon as it starts. After that, any
  exception in the loader's exit (the clone step, `getComputedStyle`, the hero intro) left the sheet at z-index 9999
  over the page for good. *Repro:* `cloneNode` made to throw for `.ydx-sheet` meant the loader was still up after 7 s.
  *Fix:* `runLoader()` and the exit are wrapped in try/catch and unlock on error. A last-resort `unlock` timer now runs
  at HARD + 1.6 s.
- **The transition plates could lock the page.** `play()` had no error path. A throw left `.ydx-shutter.on`
  (pointer-events: auto) over the page and `busy` stuck at true. *Repro:* a throwing `ffLenis.scrollTo` meant every
  later click hit the shutter (Playwright click timed out). *Fix:* try/finally. The shutter is always released and its
  animations cancelled. On error the page jumps natively with `scrollIntoView`.
- **A second activation during a transition fell through.** While `busy`, the handler returned without
  `preventDefault`, so Enter pressed twice (or held) on a nav link set off the native jump (hashchange) and a Lenis
  glide under the plates. *Repro:* scrollY went 13844 → 3486 → 6088 → 8034 → 13914, with 1 hashchange. *Fix:* while
  busy, the activation is swallowed.
- **Transitions did not update the URL.** Short jumps (native anchor plus Lenis) set `#hash` and add a history entry.
  Long jumps under the plates did neither, so Back left the site and the address could not be shared. *Fix:* the hash
  is set with `pushState` (or `replaceState` for the same hash). This happens under the plates, just before the jump,
  so the entry being left keeps its own scroll position. Back and Forward now restore the position, and Lenis stays in
  sync (a wheel after Back scrolls from the restored spot). If Back or Forward is pressed while the plates are closing
  (`popstate` while busy), the jump and the push are dropped. Not using `history.scrollRestoration`.
- **Late scripts replayed the intro over a visible cover.** If enhance.js arrived after the inline failsafe had already
  lifted the sheet (enhance.js or app.js delayed 8 s, since enhance.js is deferred after app.js), the hero intro ran on
  a cover that had been on screen for seconds. The headline was clipped away and re-inked. *Repro:* 150 ms after
  enhance.js ran, `.l1` had a running animation with `clip-path: inset(-30% 98% …)`. *Fix:* if the sheet is still in
  the DOM but `ydx-loading` is gone, or `ydx-fail` is set, there is no intro and the sheet is just removed.
- **Footer bars stayed hidden when enhance.js failed to load.** The hide-before-reveal rules keyed on `html.ydx-js`,
  which the inline script sets. With enhance.js 404 (CSS present), nothing ever added `.ydx-in`, so the footer colour
  bars stayed at `scaleY(0)`. *Fix:* enhance.css hide states now key on `html.ydx-on`, which enhance.js sets.
- **Printer's marks stayed hidden when app.js failed to load.** The crop marks, kicker rules, registration marks and
  foot rules wait for app.js' `.in`. With app.js 404 they stayed invisible (crop opacity 0). *Fix:* those rules key on
  `html.ydx-app`, which is set only when app.js ran (`'ffLenis' in window`).
- **enhance.css missing broke the layout.** The unstyled shutter (29 px, with a registration mark and, during a jump,
  the destination headline) and the progress bar landed in the page flow. The loader's torn-proof clones would also
  have been unpositioned. *Fix:* enhance.css sets a sentinel, `:root{--ydx-css:1}`, and enhance.js checks for it. This
  is reliable because the stylesheet is linked before the script, so it has loaded or failed by the time the script
  runs. Without it, the script adds no shutter or progress bar, the loader just fades, there are no reveals, and
  anchors behave natively.
- **Printing before scrolling printed blank.** Content waiting for its reveal printed blank (opacity 0, words shifted
  out of their masks), and the progress bar printed on page one. *Fix:* the hide-before-reveal block is now
  `@media screen and (prefers-reduced-motion:no-preference)`, and the loader, shutter and progress bar are
  `display:none` in print.
- **Smaller fixes:**
  - The inline boot script added `ydx-df` (fixed glyph slots) even when the Display font failed. It now requires a
    loaded face (`f.length`).
  - A malformed `%` escape in a hash link would throw in `decodeURIComponent`. It is now caught and left to the browser.
  - `scrollTo({behavior:'instant'})` (the fallback when Lenis is absent) falls back to `scrollTo(0, y)` on engines
    that reject `'instant'`.
  - The transition's final wait races a timer, so a hidden tab cannot hold `busy` waiting on WAAPI `finished`.
  - If reduced motion is switched on mid-session, items still waiting are shown without animating.
  - enhance.js guards against running twice (`window.__ydxEnh`). Injecting it a second time gives one shutter, one
    progress bar, no nested word spans and one transition per click.

### Production checks (all pass, zero console errors)

- **Live headers:** `curl -sI` shows only Cloudflare cache and NEL headers: no CSP, X-Frame-Options or COOP. Every run
  had the live headers applied to the HTML via `page.route`.
- **Failure and delay cases:**
  - JS disabled.
  - enhance.js 404, enhance.css 404, both.
  - enhance.js +8 s, app.js +8 s, Lenis +8 s.
  - enhance.js hung forever: app.js still runs at about 250 ms, because enhance.js is the last deferred script in the
    document, so nothing of the app waits for it.
  - Fonts 404.
- **Environments:**
  - Reduced motion.
  - iPhone 13 with menu and transition.
  - Slow 3G with 4× CPU.
  - Page frozen with `Page.setWebLifecycleState` during the loader and in the middle of a transition.
  - A background tab, emulated: `visibilityState` hidden, rAF held, timers aligned to 1 s, shown after 1.2 s, 2.5 s
    and 7 s.
  - A leave-and-return through history.
  - The hub iframe at 1440 and 390: mode `frame`, about 0.6–0.7 s wall-clock from start to the sheet being removed.
- **Pass criteria:** in every case the page ends visible and usable: nothing covers the centre, no `ydx-loading`, the
  headline unclipped, no reveal item left hidden in view. `tools/shoot.mjs` desktop and mobile logged 0 lines.

### Deliberately kept

- **`defer` (not `async`) on enhance.js.** It sits after app.js, so it never delays the app. Running after app.js is
  how it knows app.js ran (`ydx-app`), and the stylesheet sentinel depends on the script being blocked by the
  stylesheet before it.
- **enhance.css stays render-blocking,** like `styles.css`. It is small and same-origin, and loading it async would
  make the hide-before-reveal states flash.

### Remaining known limitations

- If a CSP is ever added, the inline `<script data-ydx>` and `<style data-ydx>` blocks need hashes or
  `'unsafe-inline'`. The loader letters also carry `style=""` attributes (`style-src-attr`).
- The loader's `--F` uses `svh`. In Safari before 15.4 the wordmark falls back to the inherited size. It still works
  and is still dismissed.
- Headless Chromium here did not restore pages from bfcache (`pageshow.persisted` never fired), so the bfcache path is
  reasoned from the code rather than observed. Restoring mid-loader or mid-transition resumes the same timers, and
  `unlock` and `finally` release them.
- Back to a section restored with the browser's fragment scroll (70 px scroll padding) rather than the flush
  transition landing. The same is true natively.
- In a background tab the loader's exit plays while hidden, so the reader comes back to the finished cover.

### Files touched in round 3

- `ydx/enhance.js`
- `ydx/enhance.css`
- `index.html`: the inline boot script's `fonts.load` check (CRLF kept)

## Round 4

A last pass as a jury would take it: the whole page scroll by scroll at 1440×900 and on iPhone 13. The site is English
only, so there was one language to check. After three rounds the page carries itself. Every section has its own motion
moment, the loader and the plates are in the site's motif, and the hard cuts between fields stay, as the art direction
intends. So this round is small. It makes the motion consistent, fixes the interaction states, and gives the page an
ending.

### Judged and changed

- **Motion tokens.** The ydx layer used seven different curves. There were three near-duplicates of the site's own
  `--ease`, plus one-offs for the headline words (`.16,1,.3,1`), the plate cover (`.7,0,.3,1`) and the hint
  (`.4,0,.2,1`). It now uses four, defined once in `enhance.js` and mirrored as CSS custom properties in
  `enhance.css`:
  - `OUT` is the site's `--ease`. It settles anything arriving: reveals, headline words, small print, the menu.
  - `INOUT` (`--ydx-io`) moves plates and wipes: loader strips, transition plates, headline inking, kicker rules.
  - `IN` (`--ydx-in`) takes things away: the transition label, the menu closing.
  - `SPRING` is kept for the one object dropped onto the page, the lens.

  The durations were left as they were. Each already belongs to one kind of movement.
- **One set of interaction states.** Every control had a hover look, but keyboard focus only had the ring, and only
  three controls answered a press. Now:
  - **Focus mirrors hover.** The pill CTA lifts and turns yellow. The round arrows fill and nudge. The nav links get
    the pink/violet mis-registration, and the nav CTA turns pink. The study, chip and swatch buttons lift or grow.
    The brand star turns on the wordmark. Frame tabs, critique cards, scaled questions and text buttons show their
    hover state.
  - **Every press answers.** Chip, nav CTA, frame tabs, critique steps and text buttons sink 1px, which is the site's
    own pill and q-btn press. Round arrows and swatches give a little (scale .92/.94), echoing the site's own save
    button.
  - These are CSS only, and they only touch transforms and colours the site already transitions.
- **The footer gets an end-of-page moment.** It answers the loader. As the footer arrives, its wordmark inks up from
  weight 200 to 800, the same act as the proof sheet at the start, and the brand star turns half a turn.
  - The word's box is locked at its inked width (in em, so resizing keeps it true) a screen before the footer
    arrives, and the weight drops while it is off screen. The letters ink inside the box, so nothing beside them moves.
    Measured: the tagline and the bars do not move at all, and desktop/mobile CLS is identical with and without the
    change (0.0022 / 0.0000 over the same scripted scroll).
  - It plays once. With reduced motion, or a page restored already at the bottom, the wordmark simply stays inked.
    Print forces weight 800.
- **Footer bug: the proof bar lost its ink chip.** The fourth chip is ink on the ink footer, so the bar read as violet,
  pink, mint, a gap, white (desktop and mobile). It now has the same faint paper keyline as the header's wordmark pill.

### Removed (noise)

- The chapter-index card's number sliding 6px on hover. The card already lifts 14px, so a second motion on the same
  hover was noise.

### Considered and left

- Colour transitions between fields: still no. The hard cuts are the stack of proofs, and the long jumps already
  get the plates.
- A cursor follower: still no. The loupe is the cursor on the cover.
- No data-driven parts here (no external APIs), so there are no empty or error states to design. The save-button demo
  in chapter 05 is the site's own lesson on those states.

### Regression (round-3 suite re-run after the changes, all with zero console errors)

- `bugs.mjs`: **11/11 pass** (double Enter, hash + Back, throw in the loader exit, throw in a transition, late
  enhance.js and app.js, 404s, print, Back mid-transition).
- `prod.mjs`: **18/18 pass**. This covers:
  - live headers;
  - JS off;
  - enhance.js, enhance.css or both returning 404;
  - enhance.js, app.js or Lenis arriving 8s late;
  - fonts returning 404;
  - reduced motion;
  - iPhone 13;
  - slow 3G with 4× CPU;
  - a page frozen during the loader and mid-transition;
  - a background tab;
  - bfcache;
  - the hub iframe at 1440 and 390, about 0.58s wall-clock (re-run alone).
- `bg.mjs`: 4/4 pass (hidden until 1.2s, 2.5s or 7s, and a bfcache round trip).
- `back.mjs`, `twice.mjs` and `order.mjs`: same results as round 3. Back and Forward restore the position. A second
  injection gives one shutter, one progress bar and no nested spans. app.js runs at about 0.4s with enhance.js 8s
  late or hung.
- `tools/shoot.mjs` desktop and mobile: 0 log lines. Live headers (`curl -sI`) are unchanged, with Cloudflare cache
  and NEL headers only.
- New checks:
  - the footer inking: frame sequence, the neighbours' positions sampled every 70ms, CLS against the round-3 files;
  - reduced motion: the weight stays at 800;
  - focus-visible and active computed styles on every control type.

### Files touched in round 4

- `ydx/enhance.js` (tokens, the footer inking)
- `ydx/enhance.css` (tokens, interaction states, the footer keyline, the removed index slide, print)
- `index.html`, `styles.css` and `app.js` were not touched.

## Round 5

The owner found the sites still too quiet. Rounds 1–4 gave this page its motion. This round adds two new things,
both built on the printer's-proof idea the page already uses: a **living print** behind the long read, and a
**proof press** you work by hand on its own page. Neither repeats the existing studies. Those studies are about
type, frame, colour and states; this round is about ink, paper and pressure.
References: playbook §1.6 (Bayer/halftone fields, Codrops dithering articles), §1.3 (flowmap trail, Codrops "mouse
flowmap deformation"), §1.21 (shader wipes), §2.1 (`PLAYBOOK-bg-reference.js` for the context, DPR and adaptive
scaffolding). Simplex noise: Ashima/Gustavson, MIT.

### 1. The living proof (`ydx/field.js`, about 400 lines)

- **What it is:** the flat colour fields of every `main > .sec` become ink on paper that is still on the press. One
  WebGL canvas paints each section's own `--field` with two halftone screens, in document space, so the dots scroll
  with the page:
  - *Show-through* (15° screen): where the ink runs thin, the paper shows through in slow, drifting pools.
  - *The brayer* (75° screen): the pointer rolls a second screen into the page. The ink map is a small ping-pong FBO
    (canvas/8). It is anchored to the document: it shifts with the canvas and dries off over about 2s. A still pointer
    over a scrolling page draws a line. On touch, a tap presses a blot of ink.
  - *Scroll speed* starves the ink (more show-through), and the plates slip: section edges mis-register by up to 14px
    in halftone and settle back when you stop. A transition jump makes them slip and settle once.
  - *Chapter 04's "change the field"* flood is printed by the shader as a growing halftone front (app.js's flood
    disc is hidden in live mode; its timing, easing and the text-colour switch are unchanged).
- **Why this stacking:** the site's own rules forbid fixed full-screen layers. The canvas is `position:absolute`
  inside `main` (now `isolation:isolate`) at `z-index:-1`, so it scrolls natively. JS only moves it to keep a
  viewport-plus-overscan window covered (18% each side on desktop, 36% on touch). The band edges are drawn in the same
  layer that scrolls, so section edges never lag or seam. Sections turn `background-color:transparent` only after the
  first frame is on screen (`html.ydx-field-live`). Print restores the flat fields.
- **Contrast:** every dot colour moves away from the field's text colour: paler on yellow, mint and paper, deeper on
  violet and ink. Pink's italics (yellow, white) are lighter than the field and its body text is ink, so pink gets a
  narrow, slightly deeper band. The worst case for body text, including the ±1.1% paper tooth, is **4.58:1** (ink on
  pink). Every other body text pair is 5.8:1 or more. Display italics that were already under 3:1 in the original
  design keep their contrast or gain a little. The slip strip (≤14px) never reaches text, because sections have at
  least 70px of padding. Full table: `scratchpad/form-and-field-r5/contrast.txt`.
- **Fallbacks:**
  - The *static frame* (`html.ydx-field-static`) is the same idea in CSS: an 8px dot screen of thin ink under two soft
    pools of solid field. It is used with reduced motion (also when switched on live), in the hub iframe, with
    `saveData` or ≤2GB memory, without WebGL, and on a GPU that is too slow.
  - No JS, or no `enhance.css`: the original flat fields.
- **Performance:**
  - DPR is capped at 1.5, with an adaptive step to 0.8 and then 0.66.
  - A *GPU probe*: one 256×256 frame is timed with a readPixels round trip and scaled to the real canvas. Over
    ~40ms per frame gives the static frame; over 12ms starts at a lower resolution.
  - A runtime guard (EMA over 45ms after 40 frames) also hands over to the static frame.
  - The loop pauses when the tab is hidden, drops to 30fps after 2.5s with no input, and skips the page pass while
    the cover (hero, no fields) fills the screen. It starts only after the loader, in idle time.
  - Main-thread cost, measured here with `?ydxgl=force`: **0.44 ms/frame**, and **2.0 ms/frame with the CPU
    throttled 4×**.
  - This container renders WebGL on SwiftShader at about 0.5 fps for the full page. The probe correctly sends it
    to the static frame, so every regression run here exercised the fallback. The live look was judged from `force`
    screenshots.
- `?ydxgl=off` forces the static frame. `?ydxgl=sw` allows software GL. `?ydxgl=force` skips the probe and guard
  (for visual tests only).

### 2. The proof press (`press/index.html`, `ydx/press.js` ~560 lines, `ydx/press.css`)

A new standalone page. It is a hands-on print study, the "bigger moment" the existing studies do not have.
- **01 Set the plate:**
  - Your word (it arrives from the playground: the word and the weight travel in the URL).
  - One of the guide's three poster layouts (Loud, Quiet, Rhythm). The plate shows it **wrong-reading**, as a real
    plate does.
- **02 Ink the plate:**
  - Drag the brayer across the plate. It is a CSS roller on a handle that turns its axle across your stroke.
  - It carries pink, violet, mint, black, yellow, or a **split fountain** (three colours on one roller).
  - The roller is streaky and runs dry as you roll, so coverage is uneven, like a real one.
  - The plate is lit relief, with wet ink and specular sheen.
  - "Roll it for me" does it for keyboard users.
  - A meter reads the coverage.
- **03 Pull the proof:** pick a stock (white, newsprint, yellow), then pull.
  - The sheet is laid on and a roller presses it. The type bites through as a blind emboss.
  - The sheet is turned over like a page, in perspective with shading and a cast shadow.
  - The proof lands beside the plate, **right-reading**. Thin ink prints salty, rolled ink prints solid, and
    overprints multiply.
  - The plate keeps a ghost of the ink, so you re-ink for the next pull.
- **Keep it:**
  - Each proof is pinned to "Today's proofs" (a drying line, kept for the session).
  - "Save the proof" downloads a 1200×1600 PNG, rendered on the CPU with a proof caption.
  - The proof number counts up.
- **Look and system:**
  - The site's tokens, fonts, pill/segment/text buttons, crop marks, proof bar and the loader's 4.9vw ruling.
  - The same proof-sheet **loader** (same inline critical CSS and markup, `quick` on repeat).
  - The same **five plates**. Leaving the guide for the press, the plates close in the press room's ink with "Pull a
    *proof.*". The press opens under them (new `cut` loader mode, via `sessionStorage 'ydx-ff-cut'`, 8s expiry).
  - "← Back to the field guide" plays them in violet and lands the playground flush. The wordmark goes to the top.
  - Both pages lift any plates left up when restored from the bfcache.
- **Phones:** the title, then the press bed, then the steps. The bed shows one sheet at a time, with a Plate/Proof
  toggle, and it pans to the proof after a pull. Pulling scrolls the bed into view first.
- **Degradation:**
  - No WebGL: a still plate and a CPU-printed proof, side by side.
  - Reduced motion: no pull animation, the result appears at once.
  - No JS: a `noscript` line pointing to the posters in the guide.
  - The canvas is `role=img`, with a label that describes the last proof.
  - A polite live region announces inking, pulls and saves.
  - Every control is a real button in a fieldset. While a pull runs they are `aria-disabled`.
- The press canvas renders on demand only: while you roll, during a pull or a pan.

### 3. Entry points and other changes

- **Entry points** (`index.html`, CRLF kept):
  - "Pull a proof of it ↗" in the playground's actions, next to "Reset study".
  - "Pull a proof at the press" in the closing row, opposite "Revisit the field guide". It is a `round-link`, so it is
    magnetic.
- **`enhance.js`:**
  - The out-transition to the press (capture-phase handler on `a[data-ydx-go]`, which also adds `?w=&wght=` for
    new-tab clicks).
  - The `cut` loader mode (70ms minimum, plates only, flush landing on the target field).
  - A bfcache `pageshow` release.
- **Inline boot script** (`index.html` and `press/index.html`): reads `ydx-ff-cut`, sets `--ydx-cut`, and gives the
  `cut` mode a 1.5s failsafe. The cut-mode CSS is inline, next to the loader's.

### Regression (all re-run after the changes)

- Round 3:
  - `bugs.mjs`: 11/11.
  - `prod.mjs`: 18/18 (JS off, 404s, late scripts, fonts 404, reduced motion, iPhone 13, slow 3G with 4× CPU, frozen
    page, background tab, bfcache, hub iframe at 1440 and 390, about 0.53s).
  - `bg.mjs`: 4/4.
  - `back.mjs`, `twice.mjs`, `order.mjs`: same results as round 4.
- Round 4:
  - `foot.mjs`: the footer inks to 800 with its neighbours fixed.
  - `rm.mjs`: reduced motion stays at 800.
  - `states.mjs`: no errors.
- `tools/shoot.mjs`:
  - Guide, desktop and mobile: **0 log lines**.
  - Press, desktop and mobile: 1 line each, a headless-only `GL Driver Message … GPU stall due to ReadPixels`
    warning. A bare 5-line WebGL clear loop produces the same lines in this container with any context attributes,
    so it comes from SwiftShader compositing, not from the page.
- New round-5 scripts (`scratchpad/form-and-field-r5/`):
  - `press.cjs` (inking, pull screencast, result; desktop and iPhone 13; no errors, no horizontal overflow).
  - `trip.cjs`: guide → press (`cut` mode, the word arrives) → back to the playground flush (y = 0 at the field) →
    history Back and Forward. Nothing covered, no errors.
  - `cost.cjs`, `fl3.cjs` (flood stills), `edge.cjs` (the slip settles to 0), `look.cjs` (live shots), and
    `probe.cjs` / `static.cjs` (fallback).
