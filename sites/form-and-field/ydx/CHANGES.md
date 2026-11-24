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
