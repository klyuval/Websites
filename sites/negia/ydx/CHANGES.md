# Negia (נגיעה) — design + motion pass

## The site as found

- **Structure.** Two static pages built with Vite: `index.html` (a long Hebrew RTL one-pager) and `style-tile.html` (a brand
  sheet). The home page runs through: hero, values strip, manifesto (01), colour atelier with shade tabs and a depth
  slider (02), "colour compass" quiz, material story (swatch dabs), approach and process cards (03), journal cards with
  `<details>`, FAQ accordion (04), the contact / "prepare an inquiry" form (05) and the footer wordmark. The mobile menu is
  a `<dialog>`. There is **no English mode** in this build: `/en`, `/en/` and `?lang=en` on the live worker all return the
  Hebrew page through the SPA fallback, and the bundle has no strings for a language switch. `sitemap.xml`, `robots.txt`
  and `manifest.webmanifest` in the mirror are that same fallback HTML (the live site has none of these files). They are not
  linked from the pages, so I left them alone.
- **Art direction.** Four shade families (rose, nude, peach, berry), each with field, pigment, deep and tint tokens; picking
  a family recolours the whole page through a circular `startViewTransition` from the click point. The display type is
  Noto Serif Hebrew 900 at 68% width, set very large. Bodoni Moda italic is used for Latin asides and Heebo for UI.
  The page is collaged from cut-out photographs: glossy lips, lipstick bullets, smears, kiss prints, a brush and a hand.
  The panels are paper cards with 4–6px radii.
- **Existing motion (kept as is, never double-animated).** Lenis smooth wheel scroll on desktop; a CSS entrance for the
  hero (lines rise, lips scale in, the smear slides like a door); `[data-reveal]` heading lines that rise when they get
  `.is-in`; the contact hand/smear sliding in; pointer parallax on the hero lips (inline `transform`, owned by the
  app); `.swap` fade-ups on shade or answer change; scroll-timeline drift on the kisses, brush, portrait and footer lips;
  and the view-transition circle wipe on shade change.

## What I added (all in `ydx/`, plus the `ydx`-marked lines in both HTML files)

- **Loading screen: a lipstick writes the logotype.** On burgundy, a lipstick bullet (`lipstick-rose.webp`) drags
  right-to-left (the Hebrew direction) and lays down the glossy smear (`smear-a-rose-s.webp`, mirrored). The wordmark
  "נגיעה" is drawn in behind it, a kiss print stamps on with a slight overshoot, and "NEGIA · LIP ATELIER" fades in. On
  exit, a **smear-shaped hole** opens where the swatch was and grows until the page shows through. It is cut from
  `ydx/smear-mask.webp`, a mirrored alpha of the site's own smear. The pink inside the hole matches the hero field, so it
  reads as a match cut. The hero's own entrance is paused (`html.ydx-loading`) and starts as the hole opens.
  - Modes are chosen by an inline boot script before first paint. First visit: about 1.15s minimum display, then a
    0.76s reveal. Repeat visit in the same session (sessionStorage): a static frame, then a 0.52s reveal. Inside an
    iframe (the hub preview): a compressed animation and exit, done in under 0.8s, without waiting for `load`.
    Reduced motion: static, then a fade. Arriving through a page transition: burgundy cover, then the hole opens at
    once.
  - It cannot trap the visitor: there is a 4s safety timeout in `enhance.js`, and the inline script removes the loader at
    5s even if `enhance.js` never loads. The loader is injected by script, so it never appears without JS. It is
    `aria-hidden`, it is `position:fixed` (no layout shift), and it never locks scroll.
- **Page transitions (`/` and `/style-tile.html`).** Same-origin link clicks to the other page (not modifier clicks,
  `target`, downloads or same-page hashes) flood the screen with a burgundy smear growing from the click point (480ms).
  The next page opens a smear-shaped hole from the centre (520ms). If navigation is cancelled, the page is handed back
  after 3.5s. bfcache restores are handled.
- **Scroll reveals** (IntersectionObserver plus WAAPI; never CSS `transition`, so the site's own transitions survive):
  - Eyebrows, section metas and body copy rise in.
  - Value pills reveal like a swatch from their pigment edge.
  - Process, journal and form cards rise with a clip.
  - The atelier stage, compass result and manifesto portrait open as curtains.
  - The four material dabs are **painted on one after another**, the approach brush draws in, and the kisses on the
    values strip, compass and FAQ **stamp** on (`scale`, so the app's scroll-drift `transform` still runs).
  - The giant footer "נגיעה" is swiped in right to left.
  - The Latin Bodoni taglines are split into letters, which rise in a stagger, with a screen-reader copy kept. Hebrew is
    never split.
- **Heading highlights.** The pigment band behind `<em>` in pink sections now paints across, starting from the right,
  once its heading reveals. The smear under "מקום." in the manifesto draws itself in after the line rises.
- **Reactions to the app's own state** (MutationObserver; DOM untouched):
  - On a shade change, the Latin shade name ("DEEP BERRY") writes itself in left to right and the pigment swatch
    wipes on like a fresh stroke. Both play inside the app's circle view transition.
  - A compass answer makes its lipstick rise out of the panel.
  - A prepared inquiry gets **sealed with a kiss**: the kiss print stamps onto the note.
- **Hero scroll choreography.** As the hero leaves, the two display lines drift apart horizontally, the smear sinks
  slowly and the "פשוט. את." note lifts. This uses only the `translate` property, so the app's `transform` parallax and
  the CSS entrance are untouched.
- **Micro-interactions.**
  - Fine pointers: magnetic pill buttons, and a small pigment-dot cursor tinted with the active family that previews a
    family while hovering its swatch. It grows over links and shrinks in text fields. The native cursor is kept.
  - Hover: CTA arrows nudge in their arrow's direction; journal cards lift and their art tilts; process steps lift and
    their numbers flip to pigment; value-pill swatches widen; FAQ "+" buttons swell; footer links thicken; the footer lips
    swell.
  - The docked header pill now swells out from the wordmark instead of only fading.
- **Menu dialog.** Opens as a burgundy swatch dropping from the top (clip-path with `@starting-style`), the links
  follow in a stagger, and it closes the same way. Closing animates too, using `allow-discrete` on display and overlay.
- **Accordions.** FAQ and journal `<details>` get a real height animation where `::details-content` is supported. They
  degrade to the app's existing fade elsewhere.

## Bugs fixed

1. **Style tile, all viewports: the page background was wrong.** The page's inline `body{background:var(--tint)}` was
   overridden by the shared stylesheet's `body{background:var(--field)}`, which loads later. The pink intro card
   disappeared into a pink page. Fixed: the tint background now applies to the style tile only (`html:has(main.tile)`).
2. **Home, 360–400px: "אפרסק מואר" overflowed its hero chip** (a `nowrap` label wider than the chip). The chip labels
   now wrap at ≤420px.
3. **Style tile, mobile: bidi wrap split "Bodoni Moda Italic"** across the line around the Latin sample. Wrapped the font
   name in `<bdi>` with `nowrap`. This is a direct edit to the static HTML, marked with a `ydx` comment.
4. **Touch targets under 44px** (coarse pointers): the header CTA (40px), footer and footer-bottom links (23–26px), the
   hero "לגלות עוד", inline text links, journal summaries (38px) and the form inputs (36px). They now reach 44px through
   padding with matching negative margin, so the look and layout are unchanged.
5. **Focus visibility on burgundy panels:** focus outlines inside the atelier stage and compass result now use the tint
   colour, and the depth slider has a visible focus ring.
6. **Mobile menu, while closing:** the column layout only applied to `[open]`, which would have collapsed the closing
   animation into a row. The column is now set on the dialog itself.

## Deliberately left alone

- The minified bundle and `style-*.css`: no patches were needed.
- The app's circle view transition, Lenis and the `[data-reveal]` and `.swap` animations. I complement them rather than
  replace them.
- The hero lips' pointer parallax (inline `transform` owned by the app).
- The FAQ kiss bleeding off-screen on mobile. It sits behind the heading on purpose (`z-index`) and is clipped by
  `.page { overflow-x: clip }`, so it causes no horizontal scroll.
- The fallback-HTML `sitemap.xml`, `robots.txt` and `manifest.webmanifest`. They mirror the live worker as it is.
- `html { scrollbar-width: none }`. It is a deliberate art-direction choice of the original.

## Round 2

A second review of pass 1, looking at it as a first-time visitor would. Scratch files and frame strips are in
`scratchpad/negia-r2/`.

### What I audited

- **Loader and transitions as frame sequences** (CDP screencast, about 16–60ms per frame). I recorded:
  - the loader on desktop 1440×900 and iPhone 13, first visit and repeat visit;
  - the loader with slow 3G (400kbps, 400ms RTT) plus 4× CPU throttling;
  - the page wipe in both directions (home → style tile, style tile → home);
  - the menu dialog opening and closing;
  - the shade-change view transition.
- **Loader modes, timed.** First visit is about 2.2–2.6s. Repeat visit and iframe are under 1s each. Reduced motion is about
  0.75s.
- **CLS.** I measured it with the `/ydx/*` layer on, and off (routed to 404). The home page is 0 in both cases. The style
  tile shows 0.0012 in both cases: a font swap that predates this layer.
- **Long tasks.** I recorded performance traces of the scroll-through with the layer on and off. The layer added no long
  tasks; run-to-run noise in this container was larger than any difference.
- **Keyboard.** I tabbed through all 44 stops and checked each one's computed opacity at the moment it received focus.
  I also checked the menu: Escape closes it and focus returns to the toggle.
- **Layouts.** Full-page shots plus an overflow scan at 360, 390, 844×390 (landscape), 768, 1024, 1280, 1440 and 1920,
  on both pages. The site has only one language (Hebrew); see round 1.

### What I found and fixed

1. **Loader flash (mobile and page transitions).** For one frame at the start of the exit, the whole page showed with no
   loader. Chrome does not paint an element whose CSS mask image is still loading. Decoding the mask with `new Image()`
   did not warm the style system's copy. Fixes:
   - a 2px `.ydx-l-warm` element in the loader uses the same mask from the first paint;
   - the exit waits two frames after everything is ready;
   - if the mask still has not loaded (the safety timeout fires on a very slow network), the loader fades instead.
2. **The loader played on its own clock while its images were still loading.** On desktop the first ~600ms was empty
   burgundy, then the animation popped in already half done. On slow 3G the dark wordmark sat almost invisible on dark
   burgundy while the smear arrived in strips. Fixes:
   - The choreography is now paused (`.ydx-loader:not(.is-go)`) until the smear, lipstick and kiss have decoded and the
     display font is ready.
   - If that takes more than 1.3s, the loader switches to `is-lite`: the cut-outs are hidden and the wordmark writes
     itself alone in tint.
   - The minimum display is now counted from that start. It went from 1150ms to 1400ms, so the finished composition holds
     for a beat before the hole opens; before, the exit cut into the kiss stamp.
   - The 4s safety cap is now measured from first paint, not from when `enhance.js` runs. Under throttling it had
     stretched to about 4.6s.
3. **Loader kiss weight:** it used the 108KB, 480px `kiss-rose.webp` for a ~134px stamp. It now uses `ydx/kiss-loader.webp`
   (300px, 46KB). On mobile the kiss also sits fully inside the viewport; it was clipped at the left edge.
4. **The footer copyright line never appeared on desktop or tablet** (`.footer-bottom` and its Latin tagline). Those
   elements sit in the bottom 8% of the page, so the observer's `-8%` bottom margin was never crossed. Elements in the last
   half-screen of the page now use a separate observer with no margin.
5. **Keyboard focus landed on invisible elements.**
   - Tabbing into reveals that had just started (FAQ, form fields, footer links) put focus on controls at opacity 0–0.4.
     A `focusin` handler now reveals the ancestor immediately, or finishes its reveal animation.
   - Tab, Enter, Space or Escape during the intro now skips the loader, so focus never sits behind it.
6. **The page wipe was invisible from the burgundy footer**, which is where the style-tile link lives. The wipe was
   burgundy on burgundy, so the visitor saw nothing and then a cut. The wipe is now two coats, like a lipstick stroke: a
   lead in the active family's `--hi`, then the burgundy that the next page opens from 110ms later. It is done in 530ms.
7. **The smear mask's core was only 98–99% opaque**, so a faint ghost of the page showed through the wipe. I raised the
   core to 255 and rescaled the edge ramp. It was also re-encoded, from 33KB to 12KB.

### Refined

- **Menu dialog:** the drop was a flat-edged blind, because the percentage corner radii collapsed as the clip shrank. It
  now has a fixed convex bottom edge (`round 0 0 60vw 60vw / 0 0 16vh 16vh`), so it falls like a drop of pigment and
  retracts the same way. The open state overshoots the box so the curve ends off-screen.
- **Loader to hero hand-off:** the hero's own entrance is released at 12% of the exit instead of 28%. The headline is
  already rising inside the smear-shaped hole, rather than the hole opening onto empty pink.

### Considered and left alone

- **Hero scroll drift, Latin letter reveals, the cursor dot, magnetic buttons.** All are subtle and on-brand, and none
  janks under 4× CPU throttling.
- **The shade-change sequence** (circle view transition, name write-on, swatch stroke). It reads as one gesture.
- **The manifesto word-smear sitting high behind "מקום."** This is the original art direction.
- **The style-tile CLS of 0.0012.** It is a pre-existing font swap.
- **The 1–2.5s desktop timings in these recordings.** They are inflated by software rendering in this container. On the
  mobile profile the first visit takes about 2.2s from first paint to the page being interactive.

## Round 3

A line-by-line review of the ydx layer before it ships to the live site, plus tests under production conditions. Each
suspected bug got a Playwright test that reproduced it before the fix and passed after it. The tests are in
`scratchpad/negia-r3/t/`: `races.cjs`, `nav.cjs`, `nav2.cjs`, `hidden.cjs`, `frame.cjs`, `xo.cjs`, `frametime.cjs`,
`bottom.cjs`, `rotate.cjs`, `details.cjs`, `order.cjs` and `bootorder.cjs`.

### Bugs found and fixed

1. **The loader outstayed its 4s cap when enhance.js could not run.** With `enhance.js` returning 404, or delayed 8s,
   or with the app bundle delayed 8s, the loader stayed up for 5s and then vanished in a hard cut. The app bundle case
   matters because the deferred `enhance.js` has to wait behind the app's module script, so its own 4s safety never got
   a chance to run. (`races.cjs js404|jsslow|appslow`: before, about 5.2s and a cut; after, a 0.35s fade starting at
   about 4.1s.)
   - The inline boot script now owns the fallback. At 4s it fades the loader out, unless `enhance.js` is running and
     has claimed the exit (`window.__ydxE`).
   - At 6.5s it removes the loader and `ydx-loading` whatever happened. This covers a stalled exit animation.
2. **A transition could fire twice.** Pressing Enter twice on a link during the wipe started two wipes and two
   navigations (`nav.cjs dblenter`: before, 4 wipe layers; after, 2). One transition at a time now; a repeat activation
   is swallowed.
3. **Pressing Back during the wipe did not cancel it.** The wipe finished and navigated anyway (`nav.cjs popstate`:
   before, `/ → /#atelier → / → /style-tile.html`; after, it stops at `/`). On `popstate` the wipe is now cancelled
   (`Animation.cancel()` never fires `onfinish`) and the page is given back.
4. **A bfcache restore mid-wipe navigated by itself.** The `pageshow` handler removed the wipe layers, but their
   animation's `onfinish` still fired and called `location.href`. Headless Chromium here has no bfcache, so I fired a
   synthetic persisted `pageshow` 150ms into the wipe (`nav2.cjs pageshow`). Before, the restored page went on to `/`;
   after, it stays. The handler now cancels the transition.
5. **Hiding the tab mid-wipe stalled the navigation.** Animations stop advancing in a hidden tab, so the navigation
   waited until the tab came back (`nav2.cjs hiddenwipe`). On `visibilitychange` to hidden, it now navigates at once.
6. **Background-tab loads.** In a hidden tab the rAF-gated exit never ran and the safety exit's animation was frozen,
   so the loader was only cut by the old 5s inline fallback. `hidden.cjs` emulates a hidden tab: rAF is queued,
   animations are frozen through CDP, timers are clamped to 1s and `visibilityState` reads hidden. Real tab hiding
   cannot be emulated in this container. Fix: `finishLoader` removes the loader at once when `document.hidden`, because
   nobody sees the exit. It is now gone at about 4.2s while hidden, and after returning to the tab the page is fully
   visible.
7. **`enhance.js` arriving late made visible content blink.** Content already on screen faded out and back in.
   `nav2.cjs late` counted 153 frames with in-view targets faded; after the fix, 0. When the loader is already gone
   at boot, anything in view or scrolled past is marked revealed without animating.
8. **`enhance.css` 404 left `enhance.js` working without its styles.** The wipe layers were unstyled static divs, so
   every navigation was delayed 530ms invisibly, and the cursor div was unstyled. `enhance.css` now sets a sentinel
   (`:root{--ydx-css:1}`). Without it, `enhance.js` skips the wipe (plain navigation), the cursor and the reveals.
9. **`enhance.js` was not idempotent.** Running it twice gave two cursor dots and doubled every listener
   (`nav.cjs twice`). A `window.__ydxE` guard fixes this.
10. **The hub iframe preview ran about 0.75–1.4s against the ≤800ms target.** The 1.2s font wait also applied in
    frame mode, and the safety cap was 4s. In frame mode the font wait is now capped at 150ms (400ms for the arrival
    cover), the safety exit runs at 450ms, the choreography is `--k:.26`, and the exit takes 260ms.
    `frametime.cjs` measures from the inline boot to removal in a cross-origin iframe: about 630–790ms, with one
    outlier at 866ms. This container's software rendering inflates all timings.
11. **Hardening (no reproducible failure, but each could leave the page covered or content hidden):**
    - Every `boot()` part is wrapped in try/catch. If the reveal setup throws, everything it marked is revealed at once.
    - The loader exit runs in a try/catch that falls back to removing the loader.
    - The wipe only handles real `HTMLAnchorElement`s. An SVG `<a>`'s `href` is not a string.
    - The hero scroll drift repaints when the hero re-enters view (it could keep a stale offset after a fast scroll back).
    - The cursor clears its pressed state on `pointercancel`.
12. **CSS support and selector fixes.**
    - The `::details-content` height animation now also requires `interpolate-size`. Safari 18.4+ has the
      pseudo-element but cannot animate to `auto`, so it keeps the app's own fade.
    - The LTR rule for the `<em>` highlight could never match: `[dir=ltr] .js-ready`, when both are on `<html>`. It is
      now `.js-ready[dir=ltr]`.
    - The chip media query now uses `max-width:420px` instead of range syntax, for older Safari.
13. **Dead code removed:** the unused `html.ydx-ready` class and the unused `#ydx-wipe` id.
14. **The layer's files could hold up the whole page** (checked after a coordinator note from another site).
    `order.cjs` measured each case:
    - **`enhance.css` delayed 8s** delayed first paint, the loader injection and the app's own boot (`js-ready`) to
      about 8.2s. A render-blocking stylesheet also blocks the module script after it.
    - **`enhance.js` delayed 8s** delayed `DOMContentLoaded` to 8s, because `defer` scripts block it. The app itself was
      not delayed, since its module comes first in document order.

    Fixes, in both HTML files:
    - `enhance.css` now loads as `rel=preload as=style`, swapped to a stylesheet `onload`, with a `<noscript>` copy.
      The link stays in place, so it still overrides the site CSS. The loader's critical CSS is inline, so the loader
      never depended on it.
    - `enhance.js` is now `async`.

    Changes in `enhance.js` to tolerate any arrival order:
    - It polls for the injected loader, because it may now run before `<body>` is parsed.
    - `boot()` still runs only after `DOMContentLoaded`, i.e. after the app's module. An async script can run between
      the end of parsing and that event, so this is checked through Navigation Timing, not `readyState`.
    - `boot()` waits for the CSS sentinel, up to 3s.

    After: with `enhance.css` delayed 8s, first paint is at about 0.3–0.5s and the app is ready at about 0.4s. With
    `enhance.js` delayed 8s, `DOMContentLoaded` is at about 0.4s. `bootorder.cjs` confirms the boot comes after
    `js-ready` with the app on time, delayed 1.2s or delayed 3s, and with `enhance.js` delayed 8s.

### Production checks (all passed after the fixes)

- **Live headers.** `curl -sI` shows no CSP, X-Frame-Options or other restrictive headers, only `cache-control` and the
  Cloudflare NEL headers. Replaying them on the local HTML (`page.route`) changed nothing and logged no errors.
  `/style-tile.html` on the live site answers with a 307 to `/style-tile`. The transition handles this: the
  same-page check compares against the current path, and the `ydx-nav` flag survives the redirect.
- **JS disabled.** No loader, no `ydx-*` classes and no hidden content. `enhance.css` still applies through
  `<noscript>`. The only `opacity:0` element is the closing line of the closed menu `<dialog>`, which is
  `display:none` anyway.
- **Failure cases** (the loader's 4s cap is counted from first paint, so these times include page load):

  | Case | Result |
  |---|---|
  | `enhance.js` 404 | Leaves by about 4.1–4.6s |
  | `enhance.css` 404 | Normal exit; no wipe, cursor or reveal states |
  | Both 404 | Leaves by about 4.1–4.6s |
  | `enhance.js` +8s | Leaves by about 4.1–4.6s; no blink when it arrives |
  | App bundle +8s | Leaves by about 4.1–4.6s |
  | Background tab | Gone by about 4.2s |

  The hero is visible in every case.
- **Hub iframe**, same-origin and cross-origin. The ≤800ms version plays. The transition works inside the frame, and
  the next page uses the `nav` cover rather than `frame`.
- **Regression checks.**
  - Desktop and iPhone 13 scroll-walks of both pages: 0 console messages.
  - Loader modes: full about 2.4s, short about 0.9s, reduced about 0.8s, frame about 0.7s.
  - Wipe frame strip: unchanged.
  - Keyboard focus walk: every stop visible.
  - Reveal end-state at eight viewports, plus after rotation or resize: nothing left hidden.

### Known limitations

- A **cross-document** Back pressed during the 530ms wipe, while the previous page loads slowly from the network, can
  still be overridden by the wipe's navigation. Same-document Back is handled, and so is a bfcache restore. Detecting
  this case needs the Navigation API's traverse events, which are not reliable cross-document.
- Browsers without `:has()` (Firefox before 121) keep the original style-tile background bug. The page works; only the
  tint is wrong.
- Safari and Firefox were reviewed from the code only; Chromium is the only browser here. Each feature has a fallback:
  - The masks use standard properties when `mask-composite: exclude` is supported and `-webkit-` ones otherwise.
  - `@starting-style` and `allow-discrete` only drop the menu animation.
  - Individual transform properties need Safari 14.1+.

## Round 4

A final look at the whole site as a jury would see it: scroll by scroll at 1440×900 and on iPhone 13, on both pages. The
site has one language (Hebrew), so there was no second language to check; see round 1. Scratch files are in
`scratchpad/negia-r4/`.

### What I judged

- **Every section already has its own motion moment** after rounds 1–3: hero entrance and scroll drift, the pills
  swatching in, the manifesto smear, the shade view transition, compass curtain and lipstick, the painted dabs, the
  brush, the cards, the FAQ stamp, the sealed inquiry, and the footer swipe. Adding more would be noise.
- **The weak spot was the hand-off between scenes.** The page alternates tint, field and burgundy. Five times it cuts
  hard between pink and burgundy, on a ruler-straight edge: compass → material, material → approach, journal →
  questions, questions → contact, and contact → footer. Those were the only places where the page still felt like
  stacked blocks rather than one surface of pigment.
- **Motion language:** the layer used seven different easing curves and eight reveal durations for what are really four
  kinds of movement. The menu, the page wipe and the loader exit are all whole-screen covers, yet each had its own curve.
- **Noise check:** I reviewed the cursor dot, the magnetic pills, the hero drift, the Latin letter reveals and the hover
  set again. Each is small, on-brand and does one job, so I removed nothing.

### What I changed

1. **Scene changes rise as a swatch** (`enhance.css`, CSS only). At each of the five pink and burgundy boundaries, the
   incoming colour enters as a rounded dome and flattens as it scrolls up. It is flat by the time its top edge reaches
   about a quarter of the viewport.
   - It uses the same convex edge as the menu drop, so the two read as one gesture.
   - It is a `::before` on the incoming section, painted in the outgoing section's colour (`var(--tint)`,
     `var(--field)` or `var(--deep)`), so it follows every shade family. Checked in berry.
   - It runs on `animation-timeline: view()` inside `@supports`, the same mechanism the site uses for its own drift. It
     needs no JS, is skipped under reduced motion, is hidden in print, and leaves browsers without scroll timelines
     unchanged.
   - Its height is `min(18vh, 20vw)`. At 30vw it looked like a tombstone arch on phones.
   - The footer selector uses `:has()`, so it falls back to doing nothing where `:has()` is unsupported. The footer gets
     `position: relative` only inside that block. Its only absolutely positioned child is a 1px screen-reader copy.
2. **Motion tokens.** There are now four easings and three hover durations, defined once as CSS custom properties
   (`--ydx-out|paint|cover|stamp`, `--ydx-t1|t2|t3`) and mirrored in `enhance.js` as `E`:
   - **out**: settle; this is the site's own `--out`.
   - **paint**: a stroke laid on.
   - **cover**: whole-screen cover or uncover. The menu drop, both coats of the page wipe and the loader's hole now all
     share this curve.
   - **stamp**: a kiss landing.

   Durations were normalised as well:
   - Small reveals take 900ms: swatch went from 800 to 900.
   - Large reveals take 1100ms: card from 1050, curtain from 1150 and swipe from 1200.
   - The shade-name write-on and the pigment stroke both take 800ms (they were 760 and 820, and they play together).
   - Hover durations are .3, .5 and .8s, replacing .25/.35/.4/.45/.5/.6/.8/.9s.

   No wall-clock duration of the loader, the wipe or navigation changed.

### Regression results (round-3 suite, rerun after the changes)

| Test | Result |
|---|---|
| `races` normal / js404 / css404 / both404 / jsslow / appslow | Loader leaves at about 2.5s normally and at 4.2–4.6s when a file is missing. The hero is visible in every case. Only the injected 404s and the expected unused-preload warning are logged. |
| `nav` dblenter / popstate / bfcache / twice | One transition. Back cancels it. Restore is clean. One cursor. |
| `nav2` pageshow / css404 / late / hiddenwipe | No self-navigation. A plain navigation without CSS. 0 blink frames. A hidden tab navigates. |
| `hidden 7000` | Gone at 4.3s; hero visible after showing. |
| `frametime` (cross-origin hub iframe) | Exit starts at 324–511ms; removal at 635–954ms. The load average was about 24 from parallel agents. The exit code and timings are unchanged from round 3. |
| `xo /` | Frame mode; the transition inside the frame works. `xo /style-tile.html` cannot run, because the test clicks a link that only exists on `/`; this is a test limitation. |
| `bottom` and `rotate` (8 viewports and 4 rotations, both pages) | All ok. |
| `details` | Height animation intact. |
| `order` and `bootorder` | No blocking: FCP about 0.12–0.32s with js+8s or css+8s. The boot always follows `js-ready`. |
| `frame` (no-JS, live headers) | No loader and no hidden content without JS. Headers replay clean. |
| `shoot.mjs` desktop and mobile, both pages | 0 console messages, 0 failed requests. |

`curl -sI` on the live site still shows only `cache-control`, `report-to`/`nel` and Cloudflare headers. There is no CSP
and no frame restrictions.
