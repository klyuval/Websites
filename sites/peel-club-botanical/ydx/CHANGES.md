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
  - **Hard safety:** 4 s after the app has mounted, the cover leaves even if the 3D scene is not ready (the photo
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
  - links to `ydx/enhance.css` (after the app CSS) and `ydx/enhance.js` (deferred, before the app module).
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
