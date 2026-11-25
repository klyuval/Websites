# PEEL CLUB (Botanical): design and motion pass

## What the site is

- **Stack:** a Vite + React single-page app (`assets/index-*.js`), plus a lazy three.js chunk (`ProductScene-*.js`) that
  draws the 3D can carousel and the can on product pages. It uses Lenis for smooth scroll and the View Transitions API
  for route changes. `index.html` is the only HTML page. It holds a hand-written entry cover (`#peel-entry`) and an
  inline boot script (`window.__peelEntry`) that the app calls when it has mounted and the 3D scene has drawn its
  first frame.
- **Routes:** `/`, `/sodas`, `/sodas/:flavor` (8 flavours), `/our-story`, `/good-company`, `/good-company/:story`
  (3 stories), `/faq`, `/privacy`, plus a 404 ("A little off the branch"). Dialogs: the menu sheet and the bag drawer.
  The site is English only. The bundle contains no Hebrew strings, no RTL handling and no language switch, so there
  was nothing to check for RTL.
- **Art direction:** tangerine `#f5811f`, deep green `#0f3b2d`, paper `#f4ebd6` and pink `#f7b4bd` panels
  ("desks"). Type is Fraunces Variable black italic for display, Courier Prime for typewriter labels on taped paper
  tags, and Homemade Apple for handwritten notes. Imagery is photographic fruit and botanical cut-outs held down with
  tape and pins, and engraved botanical can labels.
- **Existing motion:** the hero carousel and parallax specimens (JS custom properties). Scroll-driven `rise`,
  `plate-in`, `drift` and `wordmark` animations (`animation-timeline: view()`, Chromium/Safari only). The header
  docks into a paper pill on scroll. Menu sheet and bag drawer slide-ins, rolling hover labels, animated `<details>`,
  a "Discover" cursor over the 3D cans, a fade/slide View Transition between routes, and a can-morph arrival on
  product pages.

## Added

### Loading screen: "a can being labelled" (`index.html`, the inline `<style data-ydx>` and `ydx/enhance.js`)
The existing orange cover is restyled and extended, not duplicated. It keeps its role, status text, recovery screen and
the app's ready handshake.
- **Botanical line drawing** (inline SVG, `aria-hidden`). A green-line can draws itself and a cream label wraps
  around it, reading PEEL CLUB in rust Fraunces. A sprig grows up its side, leaves unfurl from their stems, an orange
  blossom opens at the tip, and bubbles keep rising out of the can while the 3D scene warms up. Beneath it are the
  typewriter tag "Pl. 0 · botanical sparkling soda" (the same numbering as the flavour plates), the headline with its
  paper strip laid on, and "Preparing your first taste..." with typing dots.
- **Exit: the cover peels off like a label.** A "/" edge sweeps from the bottom-right corner to the top-left. A cream
  paper flap (the underside of the label) rides on the edge and casts a soft shadow. The animation uses transforms
  only: a rotated outer box with a counter-transformed inner box. It therefore runs on the compositor and stays smooth
  while three.js compiles shaders.
- **Timing rules** (in the inline boot script):
  - It still waits for the app's ready signal, which fires once the canvas has rendered.
  - It stays up at least 1150 ms on the first visit and 250 ms on later visits in the same session
    (`sessionStorage`, in try/catch), with a quicker peel on those later visits.
  - **Hard safety:** 4 s after navigation start (or at the app's mount, if that is later), the cover leaves even if the 3D scene is not ready (the photo
    fallback shows instead). Inside the hub iframe this is 0.8 s, with a 520 ms peel.
  - `prefers-reduced-motion` gets a 280 ms fade and a static drawing.
  - The 12 s recovery screen is unchanged. A short-height (landscape phone) layout was added.
- The cover now also peels away for the `fallback` and `skipped` states (`?graphics=off`, no WebGL). Before, it
  vanished instantly in those states.
- The Fraunces italic and Courier Prime fonts are preloaded, so the loader shows in the brand type rather than
  Georgia. The app CSS loads the same files from the same URLs.

### Entrance choreography after the peel and after each route change (`intro()` in `enhance.js`)
- **Home:**
  - The "Find your / bright side." lines rise out of a mask.
  - The botanical specimens (branch, blood orange, peel, lemon, basil) pop on with a tilt, in the order the peel
    uncovers them (bottom-right first).
  - The taped note drops in, and the carousel controls and header fade up.
- **Other pages:** the h1 rises out of a mask with its `<em>` line trailing, the intro copy fades up, and the
  intro cut-outs pop on. The privacy "sheet" drops in like paper.
- Product pages are skipped on purpose, because the app's own 3D can arrival already animates them.
- The animations are WAAPI on individual `translate`/`scale`/`rotate`/`clip-path` properties. They therefore compose
  with the app's own `transform`-driven parallax and are never written into React's DOM.

### Route transition: a label peel (`enhance.css`, View Transitions)
- The app's fade (`page-out`/`page-in`) is replaced:
  - the old page is clipped along the same "/" edge, which sweeps across in 680 ms;
  - the new page settles in from 1.04 scale and slightly shaded;
  - a cream paper flap slides along the edge.
- The flap is a tiny `<i class="ydx-vt-flap">` with `view-transition-name: ydx-flap`, appended to `<body>` (outside
  `#root`) inside the app's own update callback and removed when the transition finishes. The app's call and its
  returned transition object are untouched. Under reduced motion the app does not start view transitions, and the
  wrapper is not installed.

### In-page motion and micro-interactions
- **Tape being laid:** the paper strips behind headline `<em>`s on tangerine sections ("kind of pop.",
  "questions.", "colorful club."…) wipe on from the left when they scroll in, then the little tape corner sticks
  down. This complements the app's existing scroll-driven `rise` on those headings, on a different property.
- **Fallback reveals** for browsers without scroll-driven animations (Firefox): the same `rise` and `plate-in`
  motion, driven by IntersectionObserver with staggered plates. This branch is only active when
  `animation-timeline: view()` is unsupported (test with `?ydx-nosda`).
- **theme-color follows the section** under the header (tangerine, green or pink), so the mobile browser bar matches
  the page.
- **Magnetic** pills and circular arrows (carousel and "Another side of the club") with a fine pointer. This uses the
  `translate` property, so the app's hover lift and scale still apply.
- **Text-link underline** is pulled away and drawn back on hover, like a stem growing. The `.text-link` border
  became a background line, with no layout change.
- **Fizz:** "Add to sample bag" sends a burst of bubbles up from the button, and the header "Bag (n)" count pops when
  it goes up. These nodes are appended to `<body>`.

## Bugs fixed
- **Desktop and mobile, all routes:** the loader dropped instantly, without its exit, whenever the 3D scene fell back
  (`?graphics=off`, no WebGL). It now leaves with the same peel.
- **Hub iframe:** the loader could hold up to the full ready wait. It now has a 0.8 s cap after mount.
- **Footer, all pages:** the "Privacy & concept notes" link was a 28 px-tall tap target. Its hit area is now about
  46 px through an invisible `::after`, and its underline does not move.
- **Flavour plates, mobile (390 and 360):** the plate tasting notes left an orphaned last word ("finish."). Fixed
  with `text-wrap: pretty`.
- **Loader on landscape phones (844×390):** the drawing and headline were too tall for the viewport. They now use a
  compact layout below 520 px of height.

## Checked and left alone
- **Horizontal overflow:** none at 360, 390, 1280, 1440 or 1920 wide, on every route.
- **Existing behaviour:** focus styles (`:focus-visible` outline), dialog and menu animations, the `<details>`
  animation, header docking and the product-page can arrival are already well made and are not touched.
- **Carousel number buttons (34×38 px):** shown on desktop only, for fine pointers. Left as designed.
- **Plate caption flavour names:** the "Mandarin" name link is 21 px tall, but the whole plate card above it is a
  larger link to the same page. Left as is.
- **Blocked external requests:** calls to Supabase are blocked in this preview. They do not affect these pages and
  were not touched.
- **Price line wrapping:** the "6 × 330 ml · $24 USD" price line wraps before "USD" on 160 px plates. Balancing it put
  "· $24 USD" on its own line, which reads worse, so the original wrap stays.

## Files
- `index.html` (readable source, edited directly). Every change is marked `ydx`:
  - font preloads and `<style data-ydx>` (loader critical CSS);
  - the `#ydx-peel` wrapper with the SVG art around the existing `#peel-entry`;
  - in the inline boot script: the minimum and safety timing, the session and iframe flags, and the exit handed to
    `__ydxPeel`, with the original slide-up kept as a fallback;
  - links to `ydx/enhance.css` (after the app CSS, non-blocking since round 3) and `ydx/enhance.js` (`async` since
    round 3; it was `defer`).
- `ydx/enhance.css` and `ydx/enhance.js`: the enhancement layer.
- The minified bundles are not modified.

## Round 2

A second review of the first pass: loader, route transitions and overlays were recorded as frame sequences (CDP screencast,
plus 10x slow motion through `Animation.setPlaybackRate`) on desktop 1440×900 and iPhone 13. Every route was checked at
360, 390, 768, 1024, 1280, 1440 and 1920 wide, and on a landscape phone (844×390). Also checked:
- CLS and long tasks, with the ydx layer on and with `/ydx/*` routed to 404;
- slow 3G (400 kbps, 400 ms RTT) with a 4x CPU throttle;
- scroll jank under a 4x CPU throttle;
- a keyboard-only run (Tab order, focus ring, Escape on the menu and bag, focus return);
- reduced motion, and the hub iframe.

### Found and fixed
- **The loader exit was a big layout shift (CLS 0.67, now 0.0001: only the app's own font-swap nudge on the header).** It hit desktop and mobile on every first load. Before
  the peel, `enhance.js` rewrote the cover wrapper's `left/top/width/height` so it could rotate the wrapper. The
  browser counted that as the whole viewport moving. Without the layer, the same load measured 0.002.
  - The peel geometry is now static CSS in the inline `<style data-ydx>`: an oversized box whose right edge (the peel
    line) is parked off-screen. The cover sits inside that box at the viewport.
  - The exit now only adds transforms (`translateX(-S) rotate(21deg) translateX(u)` on the box and the matching
    counter-transform on the cover), so it is no longer a layout shift.
  - It uses `100dvh` where supported. The fallback slide-up (used if `enhance.js` is missing) now moves the
    viewport-sized inner box.
- **Scroll jank from my own round-2 "breeze" (caught before it shipped).** A continuous idle sway on the leafy cut-outs
  kept the main thread producing frames (style, IntersectionObserver and hit-test work on every frame). Under a 4x CPU
  throttle while scrolling, frames over 50 ms went from 4–5 (bare app) to 39, with 19 long tasks. It became a one-shot
  settle (below). The final layer runs at p50/p90 17/17 ms, with 12 frames over 50 ms and 2 long tasks; the bare app
  runs at 17/17 ms with 4 and 1.
- **Story pages (`/good-company/*`), at 360 px and on landscape phones / small tablets (≤ about 850 px):** the
  headline ("An invitation"), the intro paragraph and the typewriter tag ("Around the table · An unhurried
  afternoon") ran past the right edge and were clipped. The cause was the nowrap tag: it set the minimum width of the
  intro column. The columns now use `minmax(0, 1fr)` and the tag may wrap.
- **Home, mobile:** the drifting orange-blossom branch lay over the "taste. / Better" lines of the manifesto headline
  and hid letters. Below 760 px it now sits behind the headline. Desktop keeps its overlap, where it only touches the
  corner of the full stop.
- **Bag drawer, all viewports:** it vanished instantly on close, while the menu has a proper exit. A static, inert,
  `aria-hidden` copy of the drawer, built from the node React just removed, now slides back out to the right in
  420 ms on the menu's own exit easing. A copy of the backdrop fades with it. This is skipped during route transitions
  and under reduced motion. Focus return is untouched (the app still sends focus to "Bag (n)").
- **Slow networks:** if the app mounted after the 12 s deadline, the cover was dropped with no exit. A "timeout" finish
  (which only happens once the app and its styles are in) now peels away like the others.
- **Loader robustness:** the boot script treated *any* failed `<script>` as an app failure. A failed `/ydx/enhance.js`
  therefore showed "The page couldn't finish loading" although the app was fine. ydx scripts are now ignored by that
  check.
- **Hub iframe:** the peel is shortened to 450 ms. In a graphics-off run, the cover was gone within 0.86 s of the
  iframe navigating.

### Added (second improvement loop)
- **Breeze:** leafy cut-outs catch a little breeze once, as they first scroll into view. These are the branch, the
  sprigs, and each flavour's herb (basil, mint, verbena, rosemary).
  - The motion is a short, damped sway on the individual `rotate` property (about ±1.6–2.6°, 2.2–3 s). Each image gets
    its own amplitude, direction and delay.
  - Hero specimens are excluded, because they already pop on. It is off under reduced motion.

### Audited and kept
- **Loader:** the timing (1150 ms minimum on the first visit, 250 ms on later ones, a 4 s safety after mount) and the
  peel look premium in the recordings. There is no blank frame and no double entrance. The hero arrives under the peel,
  bottom-right first.
  - Under slow 3G the cover stays until the app has mounted (about 13 s here, network-bound), then peels. It never shows
    an empty root.
  - Preloading the brand fonts costs roughly 1 s of competing bandwidth on 400 kbps. It is kept, because the app's
    ready handshake waits for the same fonts anyway.
  - Under SwiftShader, three.js shader compilation is one 11–16 s main-thread task, so neither timer can fire until it
    ends. This happens in this container only; the cap behaves normally on real GPUs.
- **Route peel, intro choreography, tape, magnetic pills, text-link underline, fizz and bag-count pop:** each was
  rechecked and keeps its place. None double-animates an element the app already moves.
- **Keyboard:** the order is skip link → header → hero → sections, and the focus ring is always visible. The menu and
  bag trap focus while open, close on Escape and return focus to their buttons. While the loader is up, `#root` is
  inert and focus stays on `<body>`, so nothing is trapped and nothing hidden can be focused.
- **Screen readers:** every ydx overlay (peel art, flap, VT flap, fizz, bag copy) is `aria-hidden`, and the bag copy is
  also `inert`.
- **Reduced motion:** the loader fades in 280 ms, and there is no intro, route peel, breeze or bag exit. No console
  errors appeared on any route at any width.

## Round 3

Code review of every line of the ydx layer (inline boot code in `index.html`, `enhance.js`, `enhance.css`), plus
production-condition tests. Each suspected bug got a focused Playwright test before and after the fix. The scripts are in
the round-3 scratch folder (`t-*.js`). Unless stated otherwise, the timing runs used `--disable-webgl`, because three.js
under SwiftShader is one 11–16 s main-thread task.

### Bugs found and fixed
- **A slow or hung `enhance.js` held back the whole app.** `enhance.js` was `defer`. Deferred classic scripts and module
  scripts run in document order, so the app module waited for the optional file.
  - **Repro:** route `/ydx/enhance.js` with an 8 s delay. The app mounted at 8.2 s instead of 0.3 s.
  - With a 15 s delay, the 12 s deadline showed the "The page couldn't finish loading" recovery screen to a
    working site. A file that never answered would have kept the app from ever starting.
  - **Fix:** `async`. `enhance.js` already copes with any order: it boots on `DOMContentLoaded`, and the loader falls
    back to its own slide-up when `__ydxPeel` is not there yet.
  - **After:** with the 8 s delay, the app mounts at 0.27 s and the cover leaves at 1.8 s. The layer then boots late
    with no errors.
- **`enhance.css` was render- and script-blocking.** It was a plain `<link rel=stylesheet>`, so the inline boot script
  in `<body>` could not run until the file arrived. The app's own CSS avoids this with the `media="print"` swap.
  - **Repro:** route `/ydx/enhance.css` with an 8 s delay. For 8 s there was a half-painted cover with no headline,
    `#root` was not inert, `__peelEntry` did not exist, and the app mounted at 8.2 s.
  - **Fix:** `enhance.css` now loads the same way as the app CSS (`media="print" onload="this.media='all'"`). The
    cascade order is still document order, so it still overrides the app CSS.
  - **After:** the delayed run behaves exactly like a normal one (cover gone at 2.2 s).
- **A runtime error thrown from a `/ydx/` file showed the recovery screen.** The boot script's error listener only
  ignored a *failed load* of a ydx script, not an exception thrown inside one.
  - **Repro:** serve `throw new Error()` as `enhance.js`. "The page couldn't finish loading" showed for about 1 s,
    until the app became ready.
  - **Fix:** errors whose `filename` is under `/ydx/` are ignored.
- **Overlapping route transitions lost the paper flap.** When a second navigation (a quick second click, or Back)
  skipped the running view transition, the skipped transition's `finished` handler removed `html.ydx-vt` and the flap
  while the next transition was already running. The new transition then peeled without its flap.
  - **Repro:** click `/our-story`, then `/faq` 120 ms later. In the second transition, `html.ydx-vt` was false and
    the flap was `visibility: hidden`.
  - **Fix:** a generation counter, so only the latest transition cleans up and runs the intro.
- **Running `enhance.js` twice broke every route transition.** Both copies wrapped `startViewTransition` and each
  mounted its own `ydx-flap`.
  - **Repro:** `addScriptTag('/ydx/enhance.js')` after load, then navigate. The console showed "Unexpected duplicate
    view-transition-name: ydx-flap", and the transition was aborted with `InvalidStateError`.
  - **Fix:** the layer is now idempotent (`window.__ydxBooted` guard).
- **Reduced-motion loader exit had no timer backstop.** The peel path already had a `setTimeout` fallback for
  background tabs, where animations do not advance; the 280 ms fade did not. It now has one (700 ms).

### Hardening (latent issues, found by reading the code)
- **Reveal state is now stored in `data-ydx-in` / `data-ydx-taped` attributes instead of classes.** These were
  classes added to React-owned nodes. React rewrites the whole `className` when a node's class prop changes, and that
  would leave a Firefox fallback-revealed plate stuck at `opacity: 0`. React never touches unknown attributes.
- **Magnetic pills:**
  - Release is bound to `pointerleave` on `<html>` rather than on `document`. Chromium happens to fire it on
    `document`; `<html>` is the portable target. Verified that moving out of the window releases the pill.
  - A pill that React replaced is dropped.
  - The unused `ydx-mag` / `ydx-mag-on` classes are gone (no CSS used them).
- **Dead code removed:** `lastIntro`.
- **Comments corrected:** the safety timer runs from navigation start (or the app's mount, if that is later), not from
  the mount. The inline comment and the round-1 notes above now say so.
- **No-JS polish:** without JavaScript the cover showed "Preparing your first taste..." with typing dots forever, next
  to the noscript note. A `<noscript><style>` now hides the loading note, so only the "Enable JavaScript" note shows.

### Production-condition matrix (all end visible and usable)
In every case below, the end state was checked: cover removed, `#root` not inert, no `overflow` lock, `#main`
visible, no leftover ydx overlay nodes, and no console errors beyond the forced 404s and the injected test error.
- **Live headers:** `curl -sI` shows no CSP or other security headers, only `cache-control: public, max-age=0,
  must-revalidate`, so there is nothing that could block ydx.
  - The `onload` CSS swap is an inline handler. It would need `'unsafe-inline'` (or a hash) under a future strict
    CSP, but the app already depends on the same pattern for its own CSS.

| Condition | Result |
| --- | --- |
| Normal load | cover gone at 2.2 s |
| JS disabled | cover with the noscript note only |
| `enhance.js` 404 | inline slide-up fallback, 1.8 s |
| `enhance.css` 404 | 2.2 s |
| Both 404 | 1.8 s |
| `enhance.js` +8 s | 1.8 s, layer boots late |
| `enhance.css` +8 s | 2.2 s |
| App bundle +8 s | safety finish at mount, peel, gone at 9.3 s |
| `enhance.js` throws | no recovery flash |
| Reduced motion | 1.5 s fade |
| Deep links `/faq` and `/sodas/blood-orange` | normal |
| Hub iframe (cross-origin test page) | `ydx-quick`, cover gone about 0.95 s after the frame starts |
| WebGL on (SwiftShader) | `ready` at 17.8 s (shader compile), peel, then a route transition, no ydx errors |

- **Background tab:**
  - *Frozen:* `Page.setWebLifecycleState` frozen for 6 s during load, then active.
  - *Emulated hidden tab:* `visibilityState` hidden, rAF paused, timers aligned to 1 s, then shown at 8 s.
  - Both ended with the cover gone through the timer backstops, and nothing was left at opacity 0 in view.
- **Regression pass on desktop 1440 and iPhone 13:**
  - Tape and the `?ydx-nosda` fallback reveals were checked: 14 elements revealed and no plate left hidden.
  - Add-to-bag fizz and the bag drawer exit copy were checked. The copy is removed afterwards and focus still
    returns to "Bag (1)", the same as without ydx.
  - Every route was visited without console errors.
- **Route-transition races after the fix:**
  - On a double click, every transition keeps its flap.
  - Back/forward in the middle of a transition leaves no stuck `ydx-vt` class and no stray flap.
  - A second evaluation of `enhance.js` is a no-op.

### Known limitations
- **bfcache could not be exercised here.** Playwright's Chromium never restored the page from bfcache, even with the
  live cache headers. From the code: a restore keeps the page exactly as it was left. The timers and animations
  resume, and every exit path has a timer backstop. A transition interrupted by `pagehide` is skipped, and its
  `finished` handler cleans up.
- **IntersectionObservers do not prune targets that React removed.** A heap count after 18 route changes showed the
  same number of detached elements with and without ydx (385 vs 385), so nothing measurable is retained by the layer.
  It was left as is.
- **Under SwiftShader the 4 s safety cannot fire during three.js shader compilation** (one long task), as noted in
  round 2. This applies to this container only.
- **With a slow `enhance.js`, the first load uses the plain slide-up exit instead of the peel, and the first view gets
  no intro choreography.** This is by design: the page must never wait for the enhancement layer.


## Round 4

A creative-director pass over the whole site. Every route was walked scroll by scroll on desktop (1440×900) and
iPhone 13, along with the menu, the bag (empty and filled), the pairing tabs and the 404. The site is English only, so
there was no other language to check. Scratch files and screenshots are in the round-4 scratch folder (`walk/`,
`after/`, `edge/`, `shoot/`, `reg/`).

### What I judged
- **Strong already, nothing to remove.** The loader, route peel, intro choreography, tape, breeze, fizz, magnetic pills
  and bag exit each do one job and none of them doubles the app's own motion. On reflection none of it is noise, so
  nothing was taken out. Hover and focus states, the empty bag ("Good things are waiting."), the menu and the 404 ("A
  little off the branch.", with its own intro) are all already designed. There is no data-driven part apart from the
  bag.
- **The weak spot was the hand-off between sections.** Every colour change between "desks" (tangerine, green, pink)
  was a flat horizontal cut. Meanwhile the site's one signature motion, the "/" label-peel edge, was used only by the
  loader and by route changes.
- **Green into green had no seam.** Where a green desk runs straight into the green footer (`/sodas`, story pages,
  product pages, `/privacy`), the "Make a little occasion of it." block and "There's always room for one more." read as
  one block of two stacked headlines.
- **Inconsistent easing.** The ydx layer used four near-identical "peel" curves and three near-identical overshoot
  curves.

### Changed
- **Section hand-off on the peel line** (`enhance.css`, round 4 block).
  - Where the colour changes from one desk to the next, the new desk's top edge arrives on the same "/" slant as the
    loader and route peels. It is pressed flat as it scrolls up to mid-viewport, like a label being smoothed down.
  - **How it is built:**
    - a `::before` wedge in the previous desk's colour, at `z-index: -1` inside the new desk;
    - desks are already `isolation: isolate`, so the wedge only covers the desk's own background and never covers
      content;
    - a static `clip-path` triangle, animated only by `transform: scaleY` on a named view timeline set on the desk
      (`view-timeline: --ydx-desk`), from `cover 0` to `cover 50vh`. This is compositor work.
  - **Where it applies:** the previous colour comes from sibling selectors. For the footer, which sits outside the
    desks' parent, it comes from `#root:has(...)`.
  - **Where it is off:** under reduced motion, in browsers without scroll-driven animations (the edge stays straight
    there), and where both desks share a colour.
  - Height is `clamp(26px, 5.5vw, 88px)`, about 4°, close to the tilt of the app's paper tags.
- **Seam between a green desk and the footer.** A 1 px hairline in the footer's own rule colour (`var(--line)`), inset
  by `--pad`. It draws on from the left as the footer enters. With reduced motion, or without scroll-driven
  animations, it is static.
- **Motion tokens.** There is now one set of three curves:
  - `--ydx-ease-out` is the app's own `--ease`, used for arrivals and settles;
  - `--ydx-ease-peel`, `cubic-bezier(.65,0,.25,1)`, is used for every wipe, peel and draw: the loader exit, the loader
    line drawing and label wrap, the route peel and flap, the tape, and the no-`enhance.js` fallback slide;
  - `--ydx-ease-pop`, `cubic-bezier(.3,1.45,.5,1)`, is used for cut-outs, tags, tape corners and the bag count.

  The tokens are defined in the inline `<style data-ydx>`, so they exist before anything else loads. `enhance.css`
  reads them with literal fallbacks, and `enhance.js` mirrors them as `EASE` / `PEEL` / `BACK`, because WAAPI cannot
  take `var()`.

  Two curves stay separate on purpose: the bubbles keep their own rising curves (the loader loop and the fizz burst are
  physics, not UI), and the bag exit keeps the app's `menu-exit` curve.

### Bug fixed
- **Tape, all tangerine headings, desktop and mobile.** Before a tape was laid, a 2–3 px cream sliver showed at the left
  edge of the headline `<em>` ("|kind of pop."). A fully clipped (`inset(0 100% 0 0)`) but rotated strip still painted
  its edge. The pre-state is now also `opacity: 0`, switched on at the moment the wipe starts.
  - **Verified:** untaped at 26% visibility, no sliver. Taped, the full strip shows.

### Regression results (round-3 suite, copied to `reg/`, WebGL disabled unless noted)
- **`t-prod` matrix:** identical to round 3.
  - Cover gone at: normal 2.19 s, js404 1.80 s, css404 2.55 s, both404 1.74 s, jsDelay8 1.78 s, cssDelay8 2.18 s,
    appDelay8 9.5 s (safety), jsThrows 1.80 s with no recovery flash, reduced 1.47 s, `/faq` 2.26 s, product 2.17 s.
  - No-JS shows the noscript note only.
  - In every case: `#root` is not inert, there is no overflow lock, `#main` is visible and no ghost nodes are left.
  - The only errors are the forced 404s and the injected test error.
- **`t-reg`, desktop and iPhone 13:**
  - 2 of 2 tapes laid and 14 fallback reveals, with no hidden plates;
  - fizz, bag drawer and drawer exit copy all work, and the copy is removed afterwards;
  - every route visited with no console errors.
- **`t-vt`:**
  - double-click: the skipped transition keeps its flap, and the latest cleans up;
  - back/forward mid-transition: no stuck `ydx-vt` class or stray flap;
  - a second evaluation of `enhance.js` is a no-op;
  - no errors in any of these.
- **Background tabs, focus, magnetic pills and the hub iframe:**
  - `t-bg`: the frozen and hidden runs both end clean, with nothing invisible in view.
  - `t-focus`: focus returns to "Bag (1)", with and without ydx.
  - `t-mag`: the pill is released when the pointer leaves the window.
  - `t-iframe`: `ydx-quick` is set and the cover is gone at about 1.0 s.
- **`shoot.mjs` desktop and mobile (WebGL on, SwiftShader):** only SwiftShader "GPU stall" driver warnings, and no
  errors or failed requests.
- **Reduced motion:** no wedges, and the hairline is static.
- **Page heights:** unchanged on every route, so there is no layout shift.
- **Scroll cost, 4x CPU throttle, home page, r3 CSS against r4 CSS, alternated:** frame-time p50 was 16.7 ms in both,
  and the frames-over-50 ms counts overlap (r3: 9 / 6 / 13 / 1 / 0, r4: 0 / 12 / 6 / 2 / 0). So there is no measurable
  cost.
- **Live headers (`curl -sI`):** still no CSP or security headers, only `cache-control: public, max-age=0,
  must-revalidate`.

## Round 5

The owner's request for this site: "PEEL CLUB Botanical looks bad with that orange; I want a moving background for it."
The flat tangerine, green and pink desks now carry a living, botanical light. On top of that there is one new interactive
experience, the Fizz Lab. Scratch files, tests and screenshots are in the round-5 scratch folder
(`peel-club-botanical-r5/`).

### 1. Komorebi: the moving background (`ydx/komorebi.js`, wired in `enhance.js` §11, CSS in `enhance.css` round 5)
- **What it looks like.** Dappled sunlight falls through swaying leaves onto each desk (komorebi), over a softly
  domain-warped colour field. A caustic shimmer plays inside the light pools, and fine soda bubbles rise.
  - The tangerine stays tangerine, but deeper (a saturated orange in the leaf shadows) with golden sun pools.
  - The green gets real leaf shadow and a soft green light.
  - The pink stays rose, with pale pools.
  - References: PLAYBOOK §1 techniques 1 (domain warp) and 5 (caustics and fizz), and §4 "Botanical".
- **What it reacts to:**
  - **Pointer or finger:** the canopy parts around it and a pool of sun opens. Leaves are pushed outward, and dragged
    a little along with the pointer's velocity.
  - **Tap or click:** a ring of light runs out through the leaves. "Add to sample bag" also sends one from the button.
  - **Scroll speed:** works as wind (the leaves sway harder) and as fizz (the bubbles rise faster).
  - **The flavour in play:** this retints the light, eased over about 650 ms:
    - the carousel's active can (`.gpu-product-scene[data-active-flavor]`, or `.carousel-current` text);
    - the selected pairing tab;
    - a hovered or focused flavour plate;
    - the product page's flavour;
    - the Fizz Lab blend.
  - **Sections:** each desk keeps its own palette. The r4 slanted "label edge" seam between colours is now drawn in the
    shader, with the same geometry and the same scroll progress. The CSS wedges are hidden only while the field is on.
- **How it is built:**
  - One raw WebGL 1 context and one full-screen triangle, with no libraries and no eval. The base is the playbook's
    ShaderBG pattern; the shader body is new.
  - Per pixel: 2D simplex noise (MIT, Ashima), about 7 calls; two leaf layers (3×3 cells of lens-shaped leaves);
    one bubble cell.
  - Fallback buffer at 0.6 of CSS px (0.5 on touch), DPR cap 1.5, adaptive quality down to 0.3.
- **Document-locked canvas, not fixed.**
  - The app's Lenis has `syncTouch:false`, so phones scroll on the compositor, ahead of the main thread. A fixed
    canvas would let the colour seams lag behind the sections.
  - So the canvas sits in a body-sized clipping wrapper (`body{position:relative}`, wrapper `z-index:-1`), and every
    frame it is moved to the scroll position with 15% overscan above and below. It scrolls with the page between
    frames, and the seams stay glued to the desks.
  - `body` and desk backgrounds turn transparent only after the first frame has drawn (a 0.9 s crossfade).
  - Context loss hands the flat colours back until the context is restored and draws again (tested).
- **Sharing the GPU with the app's three.js scene** (its renderer is bundled and not exposed, so this is a separate,
  light context):
  - `komorebi.js` loads lazily: after the loader leaves, after the app's scene has **settled** (`gpu-products-ready`,
    its fallback, or no scene on the route), and when the browser is idle.
  - The settle wait was added after a SwiftShader run showed two contexts competing: the app's first frame never came
    while the field rendered.
  - It is **held (no draws)** while the carousel is being driven (drag, wheel or arrow keys on the hero, a click on its
    controls) and during route view transitions.
  - It is capped at **30 fps** while a 3D section (hero or product) is on screen (IntersectionObserver plus the
    scene's `data-mode`).
  - It pauses in hidden tabs.
- **Contrast (WCAG).** Palettes are built in JS at target relative luminances:
  - Tangerine and pink only ever get lighter than the brand token (their text is dark green).
  - Green stays dark enough for the large tangerine display type.
  - An audit (`t-contrast.js` plus `contrast.py`) hid the app, captured 126 frames of the bare field (pointer, bursts,
    flavours; home, story, two product pages) and measured per desk:
    - tangerine L min 0.331 (needs ≥ 0.329 for green body text at 4.5:1);
    - pink L min 0.54 (needs ≥ 0.49 for rust display type at 3:1);
    - green p99.9 0.081. The single brightest pixel under the cursor's sun core was 0.085, so the green sun was then
      lowered to 0.078 (needs ≤ 0.084 for tangerine display at 3:1).
- **Fallbacks:**
  - The **hub iframe**, save-data, software GL (`failIfMajorPerformanceCaveat`), no WebGL, or a shader error all get
    `html.ydx-field-css`: a designed static version with soft pools of sun per desk (lighter only).
  - If `komorebi.js` is missing, the desks simply stay flat.
  - With **reduced motion** there is no clock, pointer, wind or parallax. It is a static komorebi frame, locked to the
    page and redrawn only on scroll.
  - Print restores the flat desks.
- **A visible "Pause the moving light" button** (WCAG 2.2.2, PLAYBOOK rule 19) sits in the dock. It sets
  `html[data-ydx-still]`, is remembered in `localStorage` and is shared with the lab.

### 2. The Fizz Lab: interactive experience (`/fizz-lab/index.html`, `ydx/fizz-lab.js`, `ydx/fizz-lab.css`)
- **What it is:** a page of its own, "Mix your own bright side."
  - There are 14 of the site's own cut-outs on the shelf: citrus, orchard fruit and botanicals.
  - Drag one into the glass (mouse or pen), or tap / press Enter to drop it in. It splashes, sinks, bobs back up and
    colours the soda (a linear-light blend).
  - Bubbles nucleate on the bottom and on the fruit, and pop at the surface (a spring-chain surface).
  - **Drag the glass sideways to shake it:** pressure builds (a gauge arc), and on release it pops in a foam
    eruption. **"Shake it"** does the same for keyboard and switch users.
  - Other controls: a Fizz slider (Still → Wild), "+ Ice" and "Empty the glass".
- **The recipe card:**
  - It names the blend ("Pineapple, Blood Orange & Mint") and finds the **closest club soda**, with its can and a link.
  - **"Add a six-pack to your bag"** writes the app's own basket (`peel-club-agrumea:sample-basket:v1`, `{id,
    quantity}` 1..12). Back on the site the header reads "Bag (1)" (tested end to end).
- **The light behind the page:** the komorebi field takes the blend's colour, and its fizz follows the glass's fizz
  and pressure. A pop sends a ring through the light.
- **Look and system:**
  - It uses the app's own stylesheet (tokens, Fraunces and Courier, `.display`, `.tag`, `.pill`, `.sheet`, `.header`,
    `.footer`) and the line-art style of the round-1 loader for the glass.
  - The same label-peel cover peels away on arrival (short on repeat visits).
  - The same tangerine label is wiped on along the "/" edge before leaving.
  - bfcache restores clear the cover.
- **Accessibility:**
  - The canvas is `aria-hidden`. A polite live region announces each change ("Added mint. Your blend: …, sparkling.
    Closest club soda: Pineapple & Mint.").
  - Every action is a real button or input with a visible focus ring.
  - Reduced motion: the ingredients settle at once and the fizz is a seeded still life; everything still works.
  - "Pause light" pauses the background only, not the toy.
  - No JS: the intro plus "The Fizz Lab needs JavaScript", with a link to the sodas. The dead controls are hidden.
- **Layout:**
  - Wide screens: intro and shelf on the left, the sticky glass in the middle, the card on the right.
  - Phones: intro, glass, then a single swipeable shelf row right under the glass (a tapped ingredient is seen
    landing), then the controls and the card. A compact header (← Back, wordmark, pause).
- **Entry point (`enhance.js` §12):** a small taped paper tag with a glass icon, bottom-left, outside `#root`.
  - Hidden over the home hero and while reading (scrolling down). It comes back on scroll up and on keyboard focus.
  - Next to the footer it opens into "Fizz Lab · mix your own", then steps aside at the footer's legal line. That
    collision was caught in testing and fixed.

### Removed or replaced
- The r4 CSS hand-off wedges are now drawn by the shader while the field runs. They remain the fallback (CSS / no
  WebGL).
- Nothing else competed: the loader, route peel, tape, breeze, fizz and magnetic pills are all kept.

### Performance (4× CPU throttle, 30 wheel steps on home, field on vs off, alternated)
- **Software GPU.** SwiftShader makes any full-screen shader cost about 1 s per frame here, so those numbers measure
  the software GPU, not the layer.
- **Main-thread cost was isolated** with a debug 0.04 render scale (`?ydx-q=`):

  | Viewport | JS per drawn frame | Frame p50 | Frames over 50 ms |
  | --- | --- | --- | --- |
  | Desktop, field off | n/a | 16.7 ms | 6 / 0 |
  | Desktop, field on | 0.14–0.46 ms | 16.7 ms | 6 / 5 |
  | iPhone 13, field off | n/a | 16.7 ms | 4 / 8 |
  | iPhone 13, field on | 0.57–0.78 ms | 16.7 ms | 10 / 8 |

  Script time over the run rose by about 0.1–0.5 s.
- **Buffers:** 864×702 on desktop 1440×900, 293×647 on iPhone 13.
- **Sizes (gzip):** `komorebi.js` 9.6 KB and `fizz-lab.js` 12.1 KB. Neither loads on the critical path.

### Regression results (round-3/4 suite, copied to `peel-club-botanical-r5/reg/`, WebGL disabled, so the CSS
fallback path is exercised)
- **`t-prod` matrix:** every condition ends clean.
  - Cover gone at: normal 2.9 s, js404 1.9 s, css404 2.6 s, both404 1.8 s, jsDelay8 1.8 s, cssDelay8 2.3 s,
    appDelay8 9.5 s (safety), jsThrows 1.9 s with no recovery flash, reduced 1.5 s, `/faq` 2.3 s, product 2.2 s.
  - No JS shows the noscript note.
  - In every case: `#root` is not inert, there is no overflow lock, nothing is left hidden and there are no ghosts.
- **`t-reg`, desktop and mobile:** tapes, the 14 fallback reveals, add-to-bag fizz, the bag drawer and its exit copy,
  and focus returning to "Bag (1)". No errors.
- **`t-vt`:** the double click and back/forward mid-transition both keep or clean the flap, and the latest transition
  cleans up. No errors.
- **`t-bg`:** both the frozen and hidden runs end clean, with nothing invisible in view.
- **`t-focus`:** focus returns to the bag button. **`t-mag`:** the pill is released when the pointer leaves the
  window. **`t-iframe`:** `ydx-quick` is set and the cover is gone at 1.26 s.
- **Field-on checks (`t-fieldui*.js`, SwiftShader allowed):**
  - bag open and close, Escape, focus, and the menu;
  - the pause toggle (animation off, shared attribute);
  - context loss (desks get their colour back), then restore (the field returns);
  - a route change through the app's view transition;
  - the dock → cover → `/fizz-lab/`;
  - reduced motion (`data-anim=off`, redraws only on scroll);
  - no errors in any of these.
- **Real three.js plus the field (`t-gl.js`):** the app reaches `gpu-products-ready` first and the field starts after
  it. The flavour follows the carousel (blood-orange → mandarin → yuzu-ginger on wheel). Route to `/faq` works. No
  errors.
- **Lab (`t-lab.js`, desktop and iPhone 13):** add, ice, shake to pop, the match, and add to bag, then back to the club
  showing "Bag (1)". No errors.
- **`shoot.mjs` desktop, mobile and `/fizz-lab/`:** only the SwiftShader "GPU stall" driver warnings, and no errors or
  failed requests.

### Known limits
- **Timing tested under software GL only.** The GPU cost on real devices is estimated from the shader's size, not
  measured. The adaptive scaler (0.6 → 0.3) and the 30 fps cap with 3D on screen are the guard rails.
- **The dock does overlap content briefly.** On a short page it is visible at load until the first scroll down; it
  has a small footprint (46 px).
