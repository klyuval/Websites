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
