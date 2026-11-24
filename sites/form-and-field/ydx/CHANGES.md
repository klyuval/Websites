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
