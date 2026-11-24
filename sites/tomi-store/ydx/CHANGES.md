# TOMI (tomi-store): design and motion pass

## The site as found

- **Structure.** One static `index.html` and one Vite bundle (`assets/index-*.js`, which bundles three.js, GSAP with
  ScrollTrigger and Lenis) plus `assets/index-*.css`. The app is vanilla JS, not React. It fills the static shell
  (`.top`, `.stage`, `.home`, `.pages`, `.sheet`) and appends its own drawer, menu, age gate and route curtain to
  `<body>`.
- **Routes.** Hash routes: `#x`, `#xl`, `#xl-plus` and `#ultima` open the 3D flavour dial of a model, and
  `#<model>/<flavour>` opens a flavour page. Pages are `#/shop`, `#/shop/<model>`, `#/model/<id>`, `#/compare`,
  `#/guide`, `#/privacy`, `#/shipping`, `#/account`, `#/checkout`, `#/order/<id>` and `#/admin[/stock]`. The 404
  page appears when you are not an admin. The pages use `/api/*` (Better Auth with Google OTP, orders, quote and
  admin). In this preview the API answers with the SPA HTML, so the test scripts stubbed it with Playwright
  `page.route()`. No stub was added to the site.
- **Art direction.** Karantina display type at very large sizes and Assistant for text. Each model has its own
  colour flood (`--c1/--c2/--c3`, recoloured live from the 3D scene), with sand/ink pages and pink `#e83e7a`
  accents. The motifs are concentric rings (the stage ripple and the page-head halos) and the logo mark (an ink
  square with a pink ring around a cream pill).
- **Existing motion (left as it is).** There is already a lot of GSAP work: the carousel, dial and flavour-page
  choreography, a GSAP route curtain (`.curtain` with "TOMI"), drawer, menu, sheet and gate wipes, ScrollTrigger
  sections, counters, a read bar, hover states and a full reduced-motion branch. I did not
  re-animate any of it.
- **Existing loader.** It was a red `0%` counter on `var(--c2)`. It stayed until the app added `html.ready` after
  the GLB models had decoded. It flashed red and then jumped to the purple stage, because the default palette is
  red but the start model (XL) is purple. The number often sat at 0 and then jumped to 100.

## What was added (all in `ydx/` plus the marked lines in `index.html`)

1. **Brand loader (it replaces the old counter instead of sitting on top of it).** The old `.loader` stays in the
   DOM, because the app writes `.loader-n` into it, but it is hidden. The new loader is the TOMI mark turned into
   a loading state:
   - A device wireframe whose meridians turn like a rotating cylinder. It fills with a solid cream body as the
     **real** model-download progress rises, with an ink cap, an ink display stripe and a 3D liquid-top ellipse.
   - The pink ring around it is the progress arc, and a Karantina percentage sits underneath.
   - The background is the colour of the model in the URL, drawn like the stage flood and the ring motif. This
     removes the red-to-purple jump. XL PLUS (orange) switches to ink type.
   - Critical CSS and markup are inline, so it paints first. A tiny head script sets the colour and the flags.
   - Timing: it leaves on the app's own ready signal. The minimum display is 1 s on a first visit, 350 ms on a
     repeat visit in the same session (sessionStorage, wrapped in try/catch) and 0 in the hub iframe, where the
     whole exit is under 800 ms. Progress easing is time-based, so a slow first WebGL frame can't stretch it.
   - Exit: the mark swells and fades, then the panel wipes upward (the curtain's direction). Pointer events turn
     off as soon as the exit starts.
   - Safety: if the app script never reports progress or readiness, the loader leaves 4 s after `load`. This was
     tested by blocking the bundle. With reduced motion it does a plain fade. There is a `noscript` fallback and a
     CSS fallback that hides it on `html.ready` if enhance.js fails.
   - Accessibility: `role=status` with a short label. The mark and the number are `aria-hidden`. The old counter
     announced every percent, and that is gone.
   - On a first visit the loader wipes away to reveal the age gate. The ink panels line up.
2. **Language-switch shutter.** Switching he/en flips the whole layout (RTL to LTR), and before this it was a hard
   jump. Now a panel in the current model colour, carrying the same ring motif, sweeps across in the *new* reading
   direction with "English" / "עברית" in Karantina. The language flips while the panel covers the page, then the
   panel sweeps out (about 0.9 s). The app's own handler runs unchanged, because the shutter re-dispatches the
   click. It is skipped under reduced motion.
3. **Ring motif on the route curtain.** The app's GSAP curtain was a flat colour block. It now carries the stage's
   concentric rings, in CSS only (with an ink variant on light models).
4. **Header behaviour on scroll.** Below the hero, the transparent header tucks away when you scroll down and comes
   back when you scroll up. A progressive-blur band sits under it on the home sections, so the nav no longer
   collides with section copy. On mobile it used to sit over headings and pills. The header is never hidden while
   the menu, cart, age gate or dial is open, while focus is inside it, or under reduced motion. It also stays
   pinned for 2.6 s after the cart count changes, because the bump is the only add-to-cart feedback. It moves with
   the CSS `translate` property, so it never fights GSAP's transform.
5. **Magnetic buttons** (fine pointer only): the hero, page and empty-cart CTAs, the carousel, dial and flavour
   arrows, and the gate "yes". They also use `translate`, so they compose with the app's GSAP transforms.
6. **Ring cursor** (fine pointer only, the native cursor stays visible): a trailing ring in difference blend,
   echoing the logo ring. It grows over anything clickable, becomes a dashed spinning ring with a ↔ over the 3D
   dial and the horizontal rails, and hides over text fields.

## Bugs fixed

- **Checkout with an empty cart (all viewports).** The empty state reuses the dark drawer's block. Its 22px side
  padding pushed it off the page's column edge, and its cream button almost vanished on the sand page. It is now
  aligned and uses an ink button.
- **Checkout steps at 360px (he and en).** The 4th step pill wrapped onto its own line. Tightened under 400px.
- **English page titles on phones.** "Checkout" ran past the viewport edge and was clipped, and "Compare" touched
  it. Titles are now shrunk only when they overflow their column (measured, re-run on each page render and resize).
- **Header colliding with section copy while scrolling** (home, mobile worst). See item 4.
- **Loader colour flash** (red before purple) and the counter stuck at 0. See item 1.

## Verified

- Desktop at 1440, 1280 and 1920; mobile on an iPhone 13 and at 360; Hebrew and English. I checked all routes,
  the dial and flavour page, the cart drawer, mobile menu, age gate and checkout.
- Scripted flows: add to cart, then open the drawer, then qty +, then checkout, then language there and back,
  then menu navigation. All work. With swiftshader on desktop, real clicks time out on both the baseline and this
  version (the main thread is saturated by WebGL), so desktop was checked with programmatic clicks.
- There is no horizontal overflow. The only console messages are the pre-existing GSAP "target not found" warning
  and the stubbed 401s.

## Left alone on purpose

- **Commerce, auth and admin logic.** Nothing in the bundle was patched. Cart, checkout, auth and dashboard
  behaviour is untouched. The only interception is the language button's click, which is delayed by about 340 ms
  and then passed through.
- **The app's GSAP choreography** (dial, carousel, curtain timing, drawers and sections). It is coherent and
  already respects reduced motion.
- **Pre-existing bug, not fixed:** when WebGL is unavailable, `new WebGLRenderer()` throws at module top level, so
  the app's own "no 3D" fallback (`hero-still` images) can never run and the page never becomes ready. Our loader's
  4 s safety exit stops users from being trapped, but the page beneath is unrendered. Fixing it needs a source
  change (a try/catch around the renderer creation), so it is reported rather than patched.
- The Hebrew privacy page's phone number can break at its hyphen on 360px. This is minor, and fixing it would
  mean editing app-rendered text.
- The minor copy inconsistency between "Tomi Vape" and "TOMI" in the privacy/shipping text is content, so it was
  not changed.

## Round 2

A second review with fresh eyes. I recorded the loader, the route curtain, the language shutter and the menu as
frame sequences (CDP screencast, so each frame has its real render time), on desktop and mobile. I also ran
throttled loads (400 kbps, 400 ms RTT, 4x CPU) and CLS and long-task measurements with and without the ydx layer.
Other checks: a keyboard-only pass, a load with the live site's CSP header applied, and layout probes at 360, 390,
768, 1024, 1280, 1440 and 1920 px wide, plus 844x390 landscape, in Hebrew and English. A note on method:
SwiftShader renders this scene at 1–2 fps here. For the motion timing, the WebGL draw calls were stubbed out in
the test browser so the DOM and CSS motion ran at real speed. The app was not changed for these tests.

### Found and fixed

- **The loader scripts were blocked on the live site (all pages, all viewports).** The worker sends
  `Content-Security-Policy: script-src 'self' …` with no `'unsafe-inline'`. Because of that, the two inline
  `<script data-ydx>` blocks would not run in production. The effects were a CSP console error, no loader colour
  for `#x`, `#xl-plus` and `#ultima` (the purple flash would come back), and no repeat or iframe flags.
  - Fix: the boot code now lives in **`ydx/boot.js`**, a small synchronous same-origin script in `<head>`.
  - Verified with the live CSP header injected: no CSP error from ydx, and the loader is the right colour.
  - The app's own WASM decoder is also blocked by that CSP (`'unsafe-eval'`) and falls back to plain GLBs. That
    is pre-existing and was not touched.
- **On a slow connection the loader started late and looked frozen at 0%.** The loader controller lived in the
  `defer` enhance.js, and deferred scripts run after the 870 KB module bundle. On slow 3G that meant about 20 s
  with no caption, no progress and no safety timer.
  - The controller now runs from `boot.js` as soon as the loader markup is parsed.
  - The app only reports progress for the model downloads. To cover the part before that (bundle and fonts), the
    loader creeps slowly toward 14% over time. Real model progress then maps onto 14–100%, and the value only
    ever rises.
- **The percentage swapped fonts inside the loader (slow networks).** The numbers drew in Arial Narrow first and
  then jumped to Karantina. They now fade in once the Karantina face has loaded, with a 2.6 s fallback.
- **The loader exit froze on weak devices.** Right after `ready`, three.js compiles its shaders in one long
  main-thread task, which is 0.5–6 s here. The old clip-path wipe stood still during that task.
  - The exit is now transform and opacity only: the panel lifts the same way the gate and curtain move. The
    compositor runs it, so it no longer depends on the main thread.
- **The loader then popped away before the lift had finished.** This was the round-2 regression caught in frame
  review. The exit animation was created inside the app's long `ready` task, so the main thread dated its start
  far earlier than the compositor actually began it. `onfinish` then fired while the panel was only about 20% of
  the way up, and the loader disappeared in a single frame.
  - The exit now starts from a rendered frame (two requestAnimationFrame calls).
  - The panel is hidden two frames after `onfinish`, and the fallback timer is now 2.2×D.
  - Re-recorded: the lift now runs to the end without a jump.
- **The route curtain squashed its word (all routes).** The app's GSAP curtain scales the whole panel on Y, so
  "TOMI" was a flat smear for most of the move.
  - enhance.js now reads the curtain's live scale, which GSAP still owns, and counter-scales only the `<b>`.
  - The word keeps its shape and rides in the middle of the band, from bottom to centre on the way in and from
    centre to top on the way out. The band's edges clip it like a mask. No app code was changed.
- **The language shutter felt laggy.** Its in-phase used a strong ease-in, so nothing moved for about 250 ms after
  the click. It now starts moving at once and lands with the same 340 ms. The language still flips under cover
  within 500 ms of the input, so that shift counts as user-initiated.
- **The header stayed pinned after a mouse click on its buttons (desktop).** The hide-on-scroll pin treated any
  focus inside the header as keyboard focus. Clicking Lang or Cart leaves focus there, and the cart drawer hands
  focus back to its button when it closes, so the header never tucked away again. It now pins only for
  `:focus-visible`, which is real keyboard focus.
- **Dial flavour label overlapping the panel (761–1300 px, he and en).** The selected flavour's label at the
  dial needle ran into the panel's notes line. At 1024 px this happened for every flavour; at 1280 px for long
  names such as "Al Fakher Double Apple" and "Kiwi Strawberry".
  - enhance.js measures the dial once per dial layout (on entering the dial, on resize and on a language change),
    not per flavour, so nothing reflows while you spin.
  - It writes `--ydx-np` on `<html>`, and CSS pads only `.panel .fl-notes` on the dial's side. The padding is
    capped at 45% of the panel width.
- **Hero arrows over the stats (761–~860 px, e.g. iPad mini portrait, he and en).** The centred prev/next
  arrows sat on the "2%" and price cells. The stat grid is tightened in that range.
- **Header tap targets on touch tablets (>760 px).** The desktop links were 18 px tall. The hit area is now larger
  (padding with an equal negative margin, so the layout does not move), and the underline stays where it was.

### Audited and left as is

- **CLS** with the ydx layer is the same as or lower than without it: desktop home 0.0074 vs 0.0073, mobile shop
  0.0002 vs 0.0058, and the first-visit gate 0.13 vs 0.21. The remaining shifts belong to the app (hero copy and
  gate render) and happen under the loader. Long tasks are the same within noise.
- **Keyboard:** the Tab order is logical and every stop has a visible ring. Escape closes the cart and the menu,
  and focus returns to the opener. The loader holds no focus: Tab during load goes to the header behind it, which
  is not a trap. The decorative overlays (shutter, cursor, curtain) are `aria-hidden`. The old app counter is
  `display: none`, so the status is announced only once.
- **Reduced motion:** the loader does a plain 240 ms fade; the shutter, cursor, magnet and curtain word are off.
- **Throttled load:** the loader is never stuck. The only time limit it adds is the 4 s safety exit when the app
  reports nothing; otherwise it waits for the app's own `ready`. The app waits up to 90 s for the models, and the
  page is not usable before that. So on slow 3G the loader honestly shows progress for as long as that takes,
  rather than revealing an empty stage.
- **Landscape phones (844x390):** the stage has `min-height: 560px`, so the hero CTA and stats sit below the fold
  and need a scroll. This is the app's deliberate floor for the 3D composition. Shrinking the canvas would mean
  re-tuning the 3D camera, so it was not changed.
- **Pass-1 cursor and magnet:** reviewed again. They are subtle and on-motif, so they stay.
- **Nothing new added for ambient or idle motion.** The 3D carousel, ripple rings and GSAP sections already
  carry plenty of motion, and more would compete with them.

### Files (round 2)

- `ydx/boot.js` (new): flags, loader colour and the loader controller.
- `index.html`: the inline boot script is replaced by `<script src="/ydx/boot.js">`, and two lines were added to
  the loader's inline CSS (the numeral fade-in).
- `ydx/enhance.js`: the loader block is removed (it moved to boot.js). Added: header pin only on keyboard focus,
  the shutter ease, §7 curtain word mask and §8 dial notes clearance.
- `ydx/enhance.css`: hero stats at 761–900 px, tablet header hit areas and the dial notes padding.
