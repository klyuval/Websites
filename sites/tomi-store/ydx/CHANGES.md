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
