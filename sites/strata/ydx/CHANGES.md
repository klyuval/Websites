# STRATA: design and motion pass (ydx)

## What the site is

- **Structure:** a single-page Vite + React 19 app (`assets/index-*.js`, `assets/index-*.css`) with one HTML entry
  (`index.html`). Sections: hero (#top), ticker, Our work (#work, two concept studies that open a `<dialog>`),
  Materials (#materials, a 4-tab library), The process (#process, three sticky slabs), Project brief (#brief, a local
  brief generator), FAQ and footer. The only "routes" are in-page hash anchors. The site is English only: there is no
  Hebrew version and no language switch. `sitemap.xml` in the mirror is the SPA fallback HTML, not a sitemap. The live
  site serves it the same way, so it was left alone.
- **Art direction:** acid lime `#c6f24e`, violet `#4a2cf0`, orange `#ff6a1a`, ink `#17151c` and bone/paper on top of
  Gabarito 900 display type and Martian Mono labels. The motifs come from 3D printing: outlined "ghost" type next to
  striped "printed" type, layered lime/orange/violet shadow stacks under buttons and cards, 7px colour seams between
  sections, a CAD selection box with handles around the hero title, and a real print-head image that prints words
  layer by layer.
- **Existing motion (kept, not doubled):** Lenis smooth scroll (anchors offset by -72px); `.printed` words that print
  layer by layer with a sweeping head (hero "PHYSICAL.", "MATTER.", the footer "STRATA" and the slab cubes); stepped
  display-heading reveals (`.d-win`/`.d-ink` with a nozzle line); the study cards fading up; the field colour rising
  on a filament or material change; the material tab animations; the ticker; the sheet open animation; the FAQ
  `::details-content` height transition; spool hover spin.

## What was added (`ydx/enhance.css`, `ydx/enhance.js`, lines marked `ydx` in `index.html`)

- **Loading screen.** Its critical CSS is inline and its markup is the first child of `<body>`, outside `#root`. On an
  ink build plate with a 32/160px grid, the site's own print head (`o-head.webp`) runs on its rail and prints the
  STRATA logotype (`w-strata-lime` over the `w-strata-ghost` silhouette, the same pair as the footer word) in 38
  layers. A CAD selection box echoes the hero, there is a mono readout (`LAYER 29 / 38 · Z 5.8 MM`, "Slicing ideas →
  Printing layer by layer → Ready to hold"), and a lime/orange/violet seam fills in as the progress bar. On exit, the
  ink layers retract to the right one by one from the bottom, each showing a coloured perimeter, and the hero shows
  through.
  - Timing: the first visit lasts at least 1150ms, follows the `load` event and has a hard cap of 4s, plus a failsafe
    in the inline script at 4.5s. A repeat visit in the same session (sessionStorage, wrapped in try/catch) lasts about
    300ms. Inside the hub iframe it takes 800ms or less, with a fade fallback when the frame paints late. With reduced
    motion it is a plain fade. A `<noscript>` rule hides it.
  - Hand-off: while the loader is up, the hero's printed word is held off-screen (`html.ydx-hold`), so the
    site's own IntersectionObserver starts printing "PHYSICAL." just as the loader nozzle finishes "STRATA". The hero
    intro then plays: the nav drops in, "IDEAS, / MADE" print in, the selection marquee drags open, the vase swaps
    in and the copy and controls lift. The hold is not applied on deep links, and the intro is skipped if the page
    opens scrolled down.
- **Layer shutter (section transition).** A nav, CTA or back-to-top jump longer than 1.6 viewports plays a shutter
  instead of a long smooth scroll. 8 ink bands extrude left to right from the bottom up, like layers, each with a
  lime/orange/violet perimeter, and show "LAYER 02 / MATERIALS". The page jumps, then the bands retract. It takes about
  650ms in total. Short jumps keep the site's Lenis scroll. React handlers still run first, so the menu closes and
  "Start with PETG" still picks the material. Only Lenis's window handler is skipped. The URL hash is updated, and
  keyboard activation moves focus to the section. Modifier clicks and `#main` are left alone, and the shutter is off
  with reduced motion.
- **Reveals,** driven by IntersectionObserver through `data-ydx-*` attributes (no app classes are touched):
  - Mono section labels type on character by character, using an `@property` integer and a `ch`-based clip. Labels
    that wrap fall back to a lift.
  - Ledes, the brief heading, the footer line and the FAQ title print in from the bottom in stepped layers. The FAQ
    title also gets the violet nozzle line that the other display headings already have.
  - Material tabs, FAQ items, form rows, the ticket, the note and footer items lift in with a stagger.
  - The section seams extrude left to right, one perimeter after another.
  - Anything left at the very bottom of the page is revealed once the visitor reaches the end.
- **Process slabs:** as the next slab lands on a sticky slab, the covered one sinks to 95% scale under a 30% ink
  veil.
- **Parallax:** the concept objects drift against their plates, and the hero vase lifts away slightly on scroll.
- **Ticker:** the speed follows scroll velocity, and scrolling back runs it in reverse (`updatePlaybackRate` on the
  site's own CSS animation).
- **Magnetic buttons** (`.btn`, `.nav-cta`, pointer:fine only), using the individual `translate` property so they
  don't clash with the site's transforms.
- **Z-axis build readout:** a thin ruler on the right edge, desktop with pointer:fine at 1100px and up, showing
  `Z 144.2 MM` as the page builds up. It switches between ink and bone to suit the section underneath.
- **Mobile menu:** the panel prints down in 9 steps over a faint build-plate grid and the links stagger in. Closing
  from the menu button retracts it before React unmounts it.
- **Project sheet (dialog):** the object prints in layer by layer when the sheet opens, and closing now fades and
  settles out (`display`/`overlay` allow-discrete transitions) instead of vanishing.
- **Small touches:** FAQ answers settle in, ticket values print in when they change, the nav CTA gets a hover state
  (ink with lime text), and the FAQ "+" turns violet on hover.

## Bugs fixed

- **Deep links never scrolled (live too):** `/#materials` stayed at the top because the browser looks for the
  fragment before React renders it. Fixed by jumping to the target while the loader covers the page, and again
  on `load` if the visitor hasn't moved.
- **Hero caption clipped (desktop 1280×800 and other short screens up to about 1845px wide, also 861–1169px tall
  ones):** "FORM EXPLORATION_001 / INFINITE POSSIBILITIES." ran off the right edge and under the print head. It is
  now hidden whenever it would not fit. The check runs after the fonts load, since Martian Mono is wider than the
  fallback.
- **Vase covering the h1 (mobile 360px):** the vase hid most of the "E" in MADE. It now sits smaller and further
  right at 380px and below.
- **Uneven nav heights (all viewports):** the brand was 41.6px, the links 44px, the CTA 45px and the menu button
  46px. All are now 46px and line up.
- **Materials panel focus ring (keyboard):** the ring cut straight through the big material name that overhangs the
  panel. It now wraps the name and the panel together.
- **Touch targets under 44px (phones):** text links (26px) get a padded hit area. "BACK TO TOP" (17px), the
  material tabs (41px), the "Layer view" chip (43px) and the layer slider (30px) were enlarged.
- **Brief ticket placeholder** ("Something worth making" at 32% opacity) was nearly illegible. It is now at 42% and
  still reads as a placeholder.
- **FAQ title** was the only big heading with no reveal. It now uses the same stepped print reveal.
- Added visible focus styles for the FAQ summaries and the footer wordmark link.

## Left alone, and why

- The minified bundle and CSS were not patched. Every change is in the enhancement layer.
- **Nav pills disappear on the ink sections** (ink on ink). This is the original art direction: the labels stay
  readable and the pills reappear on light sections.
- **The vase overlapping "PHYSICAL." and the comma of "IDEAS,"** on desktop is a deliberate collage, so it was kept.
- **The brand link doesn't close the open mobile menu.** This is the app's own behaviour. Changing it would mean
  driving React state from outside.
- **No custom cursor.** The hero word already makes the pointer drive the print carriage. A cursor follower would
  compete with that and with the hover states.
- **Google Fonts are render-blocking** in this container, where they are slow. The loader paints as soon as they
  arrive. This is the same for the original page.

## Round 2

### What was audited

- **Loader and hand-off**, recorded as CDP screencast frame sequences (about 60–80ms apart) on desktop (1440×900) and
  iPhone 13. Timeline probes cover first paint, `load`, `is-out`, removal and long tasks for first visits, repeat
  visits, the hub iframe, reduced motion, a deep link, a keypress during the build and a 404 on `enhance.js`.
- **Throttled run:** 400kbps with 400ms RTT through CDP `Network.emulateNetworkConditions`, plus CPU ×4.
- **CLS and long tasks with and without the layer.** The "without" run routes `/ydx/*` to a 404 and strips the
  inline loader. A CPU profile of a full wheel-scroll walk attributes long tasks.
- **Keyboard:** a 70-step Tab walk recording focus order, focus-ring style, visibility and whether the loader was up.
  Escape on the project sheet, with focus returning to the card.
- **Viewports:** 360×740, 390×844, 844×390 (landscape phone), 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080.
  Each was scroll-walked with an overflow scan.
- **States:** the shutter (nav jump), mobile menu open/close, the project sheet open/close, the brief generator
  (filled and generated) and the FAQ.

### What was found and fixed

- **Double entrance at the loader hand-off (all viewports).** When the main thread was busy at hand-off (the
  bundle's ~150–250ms long task), the `release()` timer ran late. The hero copy, CTAs and nav then showed under the
  retracting layers, snapped invisible and animated in a second time. Fix: the inline script now sets `ydx-intro`
  together with `ydx-hold` at first paint. All intro animations wait in their first frame
  (`animation-play-state: paused`) until the hold is released, so a late timer only delays the entrance and never
  repeats it.
- **Blank white screen before the loader.** Google Fonts were render-blocking, so the loader first painted at about
  870–920ms on a normal line and about 4.7s throttled. The font stylesheet now loads non-blocking (preload plus
  `media="print"` swap, with a `<noscript>` fallback; `index.html`, marked `ydx`), and the loader covers the swap.
  First paint is now about 250–370ms.
- **Loader cut off on slow lines.** All loader times counted from navigation start, so on a slow line the 4s cap had
  already passed when the loader first appeared, and it left at once to an empty page. Times now count from the
  later of navigation start and the first paint (MIN = T0 + 0.7s, HARD = T0 + 2.6s). Past HARD the cover stays only
  while `#root` has not rendered, up to an absolute ceiling of T0 + 4.2s. Throttled result: the loader paints at
  5.5s, builds and leaves at 9.2s. The rAF loop and a timer backstop follow the same rules, so the loader is never
  stuck. Layer progress now runs from when the build becomes visible.
- **Loader silhouette popped in.** The ghost STRATA is a CSS mask, so its image was found late and appeared about
  300ms after the plate. It is now preloaded (with `crossorigin` to match the mask's CORS fetch, so there is no
  console warning) and fades in when it loads.
- **The failsafe could kill a healthy loader.** The inline failsafe ran at 4.5s, which a slow line could reach before
  `enhance.js` executed. A failed load is now caught at once by `onerror` on the script tag (adding `ydx-fail`, which
  drops the loader and the hero hold through CSS). The hang failsafe moved to 8s.
- **Keyboard during the loader.** Pressing Tab during the build used to focus the skip link under the cover for
  about 1s. A keypress now hurries the build (5 layers a frame, as soon as the app has rendered) and uses the short
  exit.
- **Hero kicker clipped (844×390 landscape phone).** "INDEPENDENT 3D PRINTING & DE…" was cut off for the whole
  2.4s intro, because the marquee's `both`-filled clip kept the box's insets and the kicker is wider than the box
  there. The marquee now uses `backwards` fill. The generic stepped print clip also has negative horizontal insets,
  so outlines and overhangs are never shaved at rest.
- **Typing labels showed line 2 before line 1 finished (360px).** Example: "A COLLABORATION, NOT JUST A PRINT JOB."
  The single-line check ran against the fallback font. Labels are measured again on `document.fonts.ready` and right
  before they reveal, and any that now wrap switch to the lift reveal.
- **Scroll cost.** The end-of-page reveal read `scrollHeight` (and later `scrollY`) on every scroll event. Each read
  forced a layout: about 240–300ms of JS over one full scroll walk, the largest ydx cost. It is replaced by an
  IntersectionObserver on the footer's last row. The scroll-fx frame now reads all geometry before writing (it
  previously interleaved slab writes with the next slab's `getBoundingClientRect`) and uses a ResizeObserver-cached
  page height. The Z-readout tone sampling (`elementsFromPoint`) ran every 30px and now runs once the scroll
  settles. ydx JS over a full scroll walk went from about 470ms to about 15ms. Remaining long tasks in headless runs
  are raster or compositing work (software GL), not JS.
- **Project sheet re-laid out while closing (desktop).** Its two-column grid existed only on `[open]`, so during the
  pass 1 fade-out it collapsed to one column and the vase jumped. The columns are now kept on `:not([open])`.
- **Nav focus ring nearly invisible on bone and lime sections.** The site's ring is `currentColor` (bone) on the
  brand, the nav links and the menu button. It is now two-tone: a 2px bone line inside a 6px ink halo, legible on
  every section colour.
- **CLS:** desktop 0.0005–0.0009 with the layer against 0.006 without. Mobile 0.0009 against 0.020 without (the
  loader hides the app's own early hero shift). No new console errors or warnings on desktop or mobile.

### What was toned down or removed

- **Magnetic pull** cut from ±10/7px to ±6/4px. The buttons are physical layer stacks, and a big float fought the
  site's own "top layer lifts 3px" hover.
- **Dead rule** `#ydx-loader.no-img`, which no code ever set, was removed.

### What was added

- **Text-link hover in the buttons' layer language.** On hover the underline drops from .28em to .42em and takes a
  layer colour: violet on light fields, lime on the ink footer. It applies to pointer:fine devices without reduced
  motion.

### Left as is, and why

- The shutter's timing (about 690ms in total, with the label held about 40ms), the mobile menu print-down and the
  slab sink read well in the frame sequences, so they were not changed.
- Loader images (about 160KB) still compete with the bundle on very slow lines. They are the same files the footer
  and hero use, so no bytes are wasted, and the loader degrades to the rail, nozzle and readout until they arrive.

## Round 3

A line-by-line review of the ydx layer (the inline boot code in `index.html`, `enhance.js` and `enhance.css`),
plus production-condition tests. Each suspected bug was first reproduced with a focused Playwright script,
then fixed and re-run. The scripts are in the round 3 scratch folder.

### Production checks

- **Live headers** (`curl -sI https://strata.ydesign.workers.dev/`): there is no CSP, X-Frame-Options or
  nosniff, and `cache-control` is `public, max-age=0, must-revalidate`, so nothing in ydx can be blocked. One
  thing does matter for ydx: **the host answers a missing file with the SPA fallback (200 `text/html`)**.
  Today the live site does this for `/ydx/enhance.js`, which is not deployed yet. The local pages were also
  served with these live headers and that fallback (a small static server).
- **Test matrix.** Every case below ends with the page usable and visible and no new console errors. The only
  messages are the expected 404 lines and the parse error of an HTML page served as JS:
  - JS disabled, `enhance.js` 404, `enhance.css` 404, both 404, and each one served as the HTML fallback
    (`jshtml`, `csshtml`, `bothhtml`);
  - `enhance.js` delayed 8s, `enhance.css` delayed 8s, and the app bundle delayed 8s;
  - a browser without Web Animations (`Element.prototype.animate` deleted);
  - the hub iframe (`self !== top`);
  - a real background tab (headful under xvfb, without Playwright's anti-throttling flags);
  - reduced motion, a deep link, a keypress during the loader, and the shutter and mobile menu flows.

### Bugs found and fixed

1. **The app waited for ydx.** `enhance.js` was `defer` in `<head>`, ahead of the module bundle. Deferred and
   module scripts run in document order, so a slow `enhance.js` delayed the whole app. With an 8s delay the
   app rendered at 8.2s behind a static loader stuck at "LAYER 00". Fix: `enhance.js` is now `async` and
   tolerates any load order. It boots at `readystatechange` → `interactive` (if it runs during parsing, the
   loader and `#root` do not exist yet; DOMContentLoaded would wait for the bundle). After the change the app
   renders at about 0.5s. If the app is up and `enhance.js` has not run 1.5s later, the inline poll drops
   the loader. When `enhance.js` arrives, it runs in a "late" mode (`html.ydx-fail` is set): no
   hide-before-reveal and no intro, only the interactions.
2. **A slow `enhance.css` also blocked the app.** Module scripts wait for render-blocking stylesheets: with an
   8s delay, first paint, the inline boot script and the app all came at 8.3s. Fix: the stylesheet now loads
   non-blocking (`media="print"` swap, with a `<noscript>` fallback), and the loader's critical CSS is inline
   as before. `enhance.js` sets up everything that needs the sheet (reveals, shutter, Z readout, magnetic
   buttons, intro, menu-close animation) only once the sheet applies, checked with a `:root{--ydx-css:1}`
   probe. If the sheet arrives after the loader has gone, reveals are skipped so nothing visible blinks out.
3. **An 8s loader when `enhance.js` is replaced by the SPA fallback** (the live 404 behaviour). The `onerror`
   only catches network errors. An HTML page served as JS is a syntax error, so the loader stayed up until
   the 8s failsafe. Fix: a head helper `__ydxFail()`, called from `onerror` and from `onload` when the script
   ran without setting `window.__ydxLoader`. Now the loader is gone at the first sample (500ms).
4. **Page covered forever if the loader code threw.** For example, `car.animate is not a function` in a
   browser without Web Animations. The inline failsafe skipped its cleanup because `__ydxLoader` was already
   set. Fix:
   - `loader()`, `tick`, the backstop and `finish` are wrapped and fall back to `kill()` (remove the cover,
     release the hero);
   - without WAAPI the loader exit is instant and the shutter is not installed;
   - the exit has a 2s cleanup backstop;
   - the inline failsafe now drops a cover that is still up 12s after it painted, whatever the cause;
   - each setup runs on its own `try`, so one failing setup cannot take the others down.
5. **Unstyled overlays when `enhance.css` is missing.** `#ydx-z` ("Z 000.0 MM") and the shutter markup were
   appended to `<body>` without their styles and showed at the end of the page (+25px). They are now created
   only once the CSS probe passes.
6. **The shutter jump was undone by Lenis (desktop, common).** Clicking the nav CTA within about 0.5s of a
   mouse-wheel scroll played "Your brief", then the page ended at y=1200 instead of the brief (6565). Lenis
   ignores native scroll events while its own glide runs and re-applies its target. Fix: before the instant
   jump, ydx resets Lenis through its middle-button `pointerdown` handler on window (a synthetic event; the
   instance is not exposed), then scrolls. Wheel scrolling and short smooth hops behave as before.
7. **Shutter stuck on screen.** If its animations were cancelled from outside or a step threw, the `.then`
   had no rejection handler, so the shutter stayed `.on` with pointer-events on and `busy` set, which
   blocked the page. Fix: the jump and the clean-up each run exactly once, on any outcome, with a 2s safety
   timer.
8. **"#top" during a shutter.** Keyboard Enter on the brand during a long jump ran React's Lenis glide to the
   top, which overrode the shutter's jump (the label read "Our work" and the page ended at 0). Clicks on
   "#top" are now swallowed while the shutter is busy, like the other hash links.
9. **The mobile menu reopened (phones).** Pressing Escape, or tapping a menu link, within 250ms of tapping
   the close button closed the menu, then the delayed `btn.click()` opened it again. The delayed click now
   only happens if the menu is still open, inside `try/finally`.
10. **Double include.** A second copy of `enhance.js` added a second shutter, Z readout and set of listeners.
    The script is now idempotent: it returns early if `window.__ydxLoader` is set.
11. **Background tab.** In a hidden tab rAF and animations stop while timers run. The 2400ms intro timer could
    then expire before the intro had a frame, and the intro was cut short when the visitor came back. The
    countdown now starts in a rAF, and the loader's cleanup backstop removes the cover while hidden. The
    visitor comes back to the hero intro playing, with no frozen exit.
12. **Robustness and compatibility:**
    - `scrollTo({behavior:'instant'})` (which throws in older engines) is replaced by `scrollTo(0, y)`;
    - the ticker's `getAnimations` and `updatePlaybackRate` are feature-checked, because a throw there would
      have repeated on every scroll;
    - the loader's T0 falls back to the inline script's mark where there is no paint timing (Safari), so the
      inline and JS ceilings cannot cross.

### Changed behaviour

- The loader now stays up while the app has not rendered, for up to 9s after it painted (previously 4.2s,
  then an empty page). It used to give way to a blank page at 4.5s when the bundle was slow. Now it holds at
  layer 32 with the nozzle sweeping and hands over as soon as the app renders. The hub iframe preview still
  never waits.
- **Small polish (inline loader CSS):**
  - safe-area insets for the loader's corner labels and footer (`viewport-fit=cover` is set, so landscape
    iPhones put the notch over them);
  - an `svh`-free fallback width for the stage.

### Remaining known limitations

- A real bfcache restore could not be exercised: the headless Chromium here reports `masked` for every
  restore. By reasoning, timers and rAF resume on restore and `performance.now()` keeps counting, so a
  restored loader hits its ceiling and leaves at once. The shutter has its 2s safety timer, and the delayed
  menu close checks the state first.
- The Lenis reset uses an internal handler (a middle-button `pointerdown` on window). If a future bundle
  changes it, the synthetic event does nothing, and only the "click right after a wheel scroll" case returns.
- Safari and Firefox were reasoned about from the code, since only Chromium is available. `:is()`,
  `@property`, individual transform properties and `allow-discrete` all degrade to "no animation", never to
  hidden content.
- In a browser without Web Animations the site's own bundle throws (`R.animate is not a function`). That is
  not ydx's code, and ydx no longer adds to it.

## Round 4

A final whole-site pass, scroll by scroll at 1440×900 and on iPhone 13. The site is English only, so there was
no other language to check. Interactive states were driven with Playwright (hovering every control family,
pressing the material tabs, submitting the brief empty and filled, typing into the form, the end of the page).
The aim was to find what still felt flat or inconsistent, not to add more motion.

### What was judged

After three rounds the page has a motion moment in every section: the loader hands over to the hero, then the
shutter, reveals, seams, slab sink, parallax, the ticker, the menu and the sheet. The section hand-offs are
the site's own 7px seams, which extrude. I did not add another section transition: one would compete with
the seams and the shutter. What was left were inconsistencies in the interaction layer, plus one
regression introduced by ydx itself.

### What was changed

- **Bug, introduced in round 1: reveals overrode the site's own transforms for good.** A revealed "lift" element
  kept `transform: none` and a .75s transition with a stagger delay, at higher specificity than the site's rules.
  The visible result was that the material tabs lost their `:active` scale(.97) press. Before:
  `transform: none, 0.5s/0.75s, delay 0.14s`. After: `matrix(.97…)`. Each reveal now settles to
  `data-ydx-r="done"` once it has played, and no reveal rule matches that state, so the site's own styles apply
  again. The end-of-page sweep skips settled elements.
- **Material tabs had no hover** (chips fill and buttons lift; the tabs did nothing). An unselected tab now lifts
  3px over an ink layer, in the buttons' "top layer lifts" language, and its swatch dot swells. This uses
  `translate`, so the site's `:active` scale still applies. It is pointer:fine only, with no transition under
  reduced motion.
- **The footer word now answers the pointer, like the hero word.** In the hero, the pointer drives the print: the
  layers above it un-print and reprint when it leaves. The footer STRATA is the same component and the closing
  image of the page, but it did nothing. Now the pointer un-prints it down to the cursor, a lime nozzle line rides
  the current layer, and on leave it reprints at about 26ms a layer (the hero's rate), with the line stepping
  up with it. It is built from paused Web Animations on the app's `.printed-clip` and its image. An animation
  overrides their inline transforms without writing them, and `cancel()` hands back the app's own fully
  printed state. It only starts once the app has finished printing the word. A click (back to top) restores
  the word at once. It is pointer:fine only, needs WAAPI, and is off with reduced motion.
- **The Z readout has an end state.** At the very bottom it reads `BUILD COMPLETE` instead of `Z 240.0 MM`. This
  coincides with the footer word printing its last layers. The label is now only written when it changes.
- **Ticket noise removed.** The project-brief ticket reprinted a value every 700ms while someone typed into a text
  field. That was flicker, not feedback. While typing, a value now prints in only when it goes from
  empty/placeholder to filled or back. Selects and the quantity still print on each change. Over the same
  typing sequence: 7 print-ins in round 3, 3 now.
- **Motion tokens.** The layer used three near-identical in-out curves for "machine" moves:
  `(.65,0,.25,1)` for the seams and marquee, `(.7,0,.3,1)` for the shutter cover and `(.7,0,.2,1)` for the shutter
  and loader retract. They are now one: `--ydx-move` in CSS and `EASE_MOVE` in JS, both `(.7,0,.2,1)`. Entrances
  use the site's own `--ease` (`EASE_OUT` in JS). This is documented at the top of `enhance.css`.

### What was tried and removed

- A "printout feed" reveal for the generated brief (stepped, top to bottom). The site already animates
  `.brief-result` with its own `info` keyframes, so this doubled it, and the site's animation replayed when the
  reveal settled. Removed. `.brief-result` is also now excluded from the generic lift group, which had been
  doubling the site's entrance since round 1.

### Left as is

- No custom cursor and no new section transition (see round 1). The empty-submit state is the browser's native
  validation bubble with the site's violet focus ring, which reads fine. A failed clipboard copy is silent;
  that is app state and cannot be changed from outside.
- With JavaScript disabled, Chromium warns that the two image preloads went unused, because without JS the SPA
  renders nothing. This is not new, and there is no page to show in that case.

### Regression results (round-3 suite, re-run on the round-4 files)

- `scen.cjs` (desktop): nojs, js404, jshtml, css404, csshtml, both404, bothhtml, jsdelay8, cssdelay8, noanimate,
  appdelay8 and iframe. Every case ends with the loader gone, the app and hero visible, nothing inert and the
  page scrollable. The only log lines are the expected 404s, `Unexpected token '<'` for HTML served as JS, and
  the bundle's own `R.animate` error in noanimate.
- `inter.cjs`: menuesc, menulink, topbusy, dbl, cancel, dialogkbd, twice and deeplate all pass with values
  identical to round 3, for example brief top at 72, `#process 3`, one shutter and one Z readout. `inter2.cjs`
  topbusy2 passes (work top at 72). `misc.cjs` passes: reduced motion is a plain fade with no shutter, a keypress
  hurries the loader, and the mobile menu jump to #process lands at 72. `wheel.cjs` passes (brief top at 72), and
  `after.cjs` passes (the Lenis reset holds; a short hop stays smooth). No console errors.
- New checks (scripts in the round 4 scratch folder): tab press scale restored; footer scrub and reprint frames;
  ticket print counts; no double entrance on the brief result.
- `shoot.mjs` walk: desktop is 13 shots and mobile 15, with 0 log lines. The page heights are unchanged
  (10023 / 8719).
- Live headers (`curl -sI https://strata.ydesign.workers.dev/`) are unchanged: no CSP or XFO, and
  `cache-control: public, max-age=0, must-revalidate`.

## Round 5

The owner found the site still too calm. This round gives it one signature idea that runs through the whole page,
plus one real toy. Both come from what the studio does. **The page is a slicer preview of the build plate, and you
can print your own name.**

### 1. The slicer field: a living background (`ydx/field.js`, about 9.8 KB gzip, raw WebGL 1)

- **What it looks like.** Each flat section field (hero, Our work, Materials, The process, the brief banner and
  body, the FAQ, the footer) is now painted by one WebGL canvas behind the page. The canvas uses each section's
  exact colour and overlays that section's **infill toolpaths**, printed with the same layer stripes as the site's
  striped type. The infill is a gyroid in the hero and footer, a honeycomb on Our work and the FAQ, topographic
  slice contours on the ink Process section, a 45° grid on the violet banner, and faint resin layer lines behind
  the form. The walls sit 5–10% off the field colour, so they read as texture. Cards, plates, slabs, seams and the
  ticker stay opaque on top.
- **It moves on its own.** The slice height Z drifts slowly, so the gyroid morphs between its wave and network
  phases, and it lingers on the network phase. The toolpaths also flow through a slow domain warp.
- **It reacts.**
  - Scroll speed scrubs Z, so a fast scroll slices through the part. The right-edge Z readout (round 1) now
    describes the same build.
  - The pointer is the hot nozzle. The infill swells and magnifies under it, and its toolpaths are outlined in
    the section's accent colour (violet on light fields, lime on ink).
  - The pointer also extrudes a **filament trail**: a shaded tube with an orange-hot tip that cools and fades
    over 1.5s. The trail is laid in document coordinates, so it stays on the plate when you scroll.
  - On touch screens, a finger drag does the same.
- **It changes with the content.**
  - A new hero filament or material colour **rises in 9 layers**, with a nozzle line at the front. This replaces
    the site's own `.field-rise`, keeps its steps and timing, and is drawn in GL.
  - The **material tabs switch the infill**: PLA gyroid, PETG honeycomb, resin layer lines, nylon sintered powder.
  - The first appearance prints in from the bottom of the viewport in 24 layers, after the loader has gone.
- **How it is built.**
  - Technique 1 (domain warp) feeds technique 6 (a layer-line field that bends around the cursor) and technique 3
    (a trail; here an analytic polyline of 32 points instead of an FBO).
  - Infill functions: a gyroid level set, a hex distance, a rotated grid, simplex contours (exact AA with
    `OES_standard_derivatives` where it exists), and hashed powder.
  - The canvas is **absolute in document coordinates with 20% overscan**, not fixed. A fixed canvas repainted
    from JS lags a frame behind compositor-thread scrolling on phones, which would slide section edges out of
    register. This one scrolls natively with the content.
  - The flat colours become transparent only through `html.ydx-gl`, which is set in the same frame as the first
    drawn frame. The canvas paints the identical colours, so the swap is invisible.
  - Live colours come from the sections' own inline `--field` / `--bg` (React remounts `.field-rise` on every
    change; reading that node was a bug found in testing).
- **Fallbacks.** Without WebGL, with reduced motion, if a shader fails, if the context is lost, if `field.js` is
  missing or if `enhance.css` is missing, there is no `ydx-gl` and the site's own flat colours stay. On a **software
  rasteriser** (SwiftShader, llvmpipe, a blocklisted GPU), the field is skipped on purpose: a decorative
  full-screen shader is not worth CPU rendering. This includes the headless test browser here, so add `?ydxhq` to
  the URL to see it in tests. In the hub iframe it runs a light version: 0.72 resolution, 30 fps and no trail.
- **Performance.**
  - Loads only after the loader has gone, in `requestIdleCallback`. Compiles with `KHR_parallel_shader_compile`
    where available.
  - One full-screen triangle and one draw call. DPR is capped at 1.25 (1 on phones and low-power devices,
    quality 0.72).
  - When nothing is moving it draws at about 30 fps. It pauses in hidden tabs and while the project sheet or the
    mobile menu covers the page.
  - Adaptive resolution: a sustained frame interval over 24ms drops it one step at a time, never back up.
  - Measured: field JS (including GL command submission) is **0.56 ms per draw, 0.79 ms with CPU throttled 4×**.
  - Main-thread script time over a wheel and pointer walk at 4× throttle: 0.39s with the field against 0.43s
    without it, so the same within noise.
  - GPU cost cannot be measured here, because the container's GL is SwiftShader on the CPU.
- **Contrast** (WCAG, worst case = the wall colour under the nozzle, calculated from the shader's mix; idle walls
  are lighter):

  | Field | Idle wall | Under nozzle |
  | --- | --- | --- |
  | Hero lime | 11.9 | 9.1 |
  | Hero violet (dark filament) | 5.6 | 4.7 |
  | Hero orange | 5.7 | 4.6 |
  | Work paper | 13.1 | 10.5 |
  | Materials PETG / resin | 7.1 / 7.7 | 5.6 / 6.1 |
  | Process ink | 12.2 | 8.8 |
  | Banner violet | 5.5 | 4.7 |
  | FAQ orange | 5.6 | 4.7 |
  | Footer ink | 12.2 | 8.8 |

  Everything is at least 4.5:1. The intensities of the hero and the FAQ were lowered to get there. The thin
  accent outlines under the pointer are transient and decorative.
- **Z readout:** its ink/bone choice now asks the field for the section colour (`__ydxField.colorAt`), because the
  sections are transparent while the field is on.

### 2. The playground: "Print your name" (`/play/`, `ydx/play.js` about 12 KB gzip, `ydx/play.css`)

A standalone page, owned completely by the ydx layer (the worker serves real files before the SPA fallback).

- **What you do.**
  - Type a name of up to 12 characters, choose a **material** (PLA, PETG, resin or nylon, with the site's material
    library colours), an **infill** (gyroid, honeycomb, grid or solid), a **density** and a **layer height**
    (0.12, 0.20 or 0.28 mm, giving 67, 40 or 29 layers).
  - Watch the name print in 3D on an ink build plate, layer by layer.
  - Drag (or use the arrow keys on the focused plate) to orbit. After the print, **Layer view** cuts down through
    the part to show the infill, and **Save a snapshot** downloads a PNG.
  - Typing reprints after a 1.1s pause. Enter reprints at once.
- **The process follows the material, as in the site's materials library.**
  - PLA and PETG are FDM: the site's own print head (`o-head.webp` and its rail) rides the toolpath, the moving
    front glows hot orange, and each layer runs boustrophedon (alternate layers in opposite directions).
  - Resin is SLA: whole layers cure under a violet UV flash, with no head.
  - Nylon is SLS: a lime laser dot sinters the layer.
  - The HUD reads `LAYER 19 / 40 · Z 3.8 MM`, `NOZZLE 210°C`, `UV 405 NM` or `LASER 30 W`, with a 60× time-lapse
    clock.
  - The lime/orange/violet seam under the plate fills as the progress bar, like the loader's.
- **How it is built.**
  - The name is rasterised in Gabarito 900 into a mask texture. Its G channel is the glyphs eroded by about 6px,
    made by intersecting shifted copies with `destination-in` (no `ctx.filter`, so it works in Safari). That
    interior is where the infill goes.
  - The part is N stacked layer quads in one draw call. The fragment shader discards what is not printed yet,
    cuts the infill out of the interior so you see down into it, and shades layers that are visible from the side
    as darker stepped walls with alternating layer lines. The top skin carries diagonal toolpath lines.
  - A ghost outline of the finished top layer and a 3D **CAD selection box with lime handles** (the hero's
    marquee) show the slicer preview.
  - The bed is a procedural grid with derivative AA.
- **The page carries the site.** It has the same fonts, tokens, brand pill, nav CTA, layered `.btn`, chips,
  material tabs, hero "slicer" sliders and outlined/striped display title. On phones, tablets and anything up to
  1023px, the plate is **sticky** at the top, so every change is visible while the controls scroll under it.
- **Transitions.**
  - The way in is the site's **layer shutter**: ink bands extrude ("LAYER 05 / PLAYGROUND"), the browser
    navigates, and `/play/` opens under the same bands (inline critical CSS) and retracts them bottom-first.
  - "Back to the studio" and the brand play the reverse ("LAYER 00 / STUDIO"), and the studio's loader then runs
    its short repeat-visit version.
  - Both pages reset the cover on a bfcache restore.
- **Fallbacks.**
  - Without WebGL, the name prints in 2D in the site's striped type (CSS steps).
  - With reduced motion, the finished part appears at once with no sway, and the cover is a 200ms fade.
  - Without JS, a `<noscript>` note shows and the cover is hidden.
  - If `play.js` fails to load (404 / `onerror`), or has not started after 2.5s, an inline failsafe lifts the
    cover.
  - On a software rasteriser the playground still runs, at 0.6 resolution with DPR 1.
  - It pauses offscreen and in hidden tabs, and only renders while something moves: printing, orbit inertia, or
    the 9s sway after a print.
- **Entry point: a playground chip** (enhance.js `setupPlayChip`). It sits outside `#root`, in the brand pill's
  language: ink, the three layer bars, which reprint on hover, and a lime/orange/violet layer stack.
  - It slides up once the hero is behind you. On touch screens it steps aside while you scroll down and returns
    when you scroll up.
  - At the end of the page it turns lime, as the closing invitation.
  - It is hidden under the loader and the open mobile menu, and is focusable and shown on `:focus-visible`.
  - It sits bottom-left on desktop and bottom-right on phones.

### Kept and removed

Nothing from rounds 1–4 competed with the field, so nothing was removed. The Z readout, the ticker velocity, the
seams and the shutter all read as part of the same build now. The field replaces the site's `.field-rise` colour
animation visually, with the same 9 steps. The DOM animation still runs underneath, on a transparent element.

### Verification (scripts in `scratchpad/strata-r5/js`, results in `strata-r5/regress`)

- **Round 3 scenarios** (`scen.cjs`):
  - Cases run: nojs, js404, jshtml, css404, csshtml, both404, bothhtml, jsdelay8, cssdelay8, noanimate,
    appdelay8 and iframe.
  - Every case ends as in round 4: the loader gone, the app and hero visible, nothing inert, docH 10023.
  - The only log lines are the same expected ones: 404s, `Unexpected token '<'` and the bundle's `R.animate`.
- **Round 3 interactions** (`inter.cjs` menuesc, menulink, topbusy, dbl, cancel, dialogkbd, twice, deeplate;
  `inter2` topbusy2; `misc`; `wheel`; `after`): all pass with round-4 values, for example brief top 72,
  `#process 3`, one shutter and one Z readout, Lenis reset 6565 → 5965, and no console errors.
- **With the field running** (`?ydxhq` under SwiftShader): dbl, deeplate, dialogkbd, menuesc and wheel pass with
  the same values. The wheel test needed a longer wait because software GL frames take seconds.
- **Round 4 checks:** the tab press scale is restored, the footer scrub reprints, the ticket prints 3 times and
  the brief result has no double entrance.
- **`shoot.mjs`:** desktop 13 shots and mobile 15, with 0 log lines and unchanged heights (10023 / 8719).
  `/play/`: desktop 5 and mobile 5.
- **Playground checks:**
  - No WebGL gives the 2D print.
  - Reduced motion gives the finished part (layer 40/40).
  - With JS off, the cover is hidden. With a `play.js` 404, the cover is gone at 600ms.
  - Tab order: skip, brand, back, name, material, infill, density, layer height, print, snapshot, plate, layer
    view, footer.
  - Arrow keys move the radio groups, and Enter reprints.
  - The page flow chip → shutter → `/play/` → back → studio works, history back/forward works, and the shutter
    is never left on.
- **Known environment noise:** any WebGL canvas in this headless Chromium logs Chrome's own
  `GPU stall due to ReadPixels` warning, up to 4 times. Software compositing reads back the GL frame. The ydesign
  hub's three.js logs the same line. It appears only on `/play/` and with `?ydxhq`; the studio page in a default
  run logs nothing, because the field skips software GL.
- **Not verifiable here:** real-GPU frame times and iOS Safari. Both are reasoned from the code: one context per
  page, DPR caps, adaptive resolution, and pausing.
