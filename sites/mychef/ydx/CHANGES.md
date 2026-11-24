# MyChef Israel: design + motion pass (ydx)

## The site

- **Structure.** A single page built with vinext (React 19, RSC, hydrated over the whole `document`). The same
  `index.html` is served at `/`, `/en/` and `/he/`. The language (Hebrew RTL, French, English) is chosen on the
  client from `localStorage['mychef-language']`, and switching it re-mounts the whole page and jumps to the top.
  Sections: hero (`#home`), the "quilt" of four experiences (`#experiences`), four sticky "course" cloths
  (`#exp-0` to `#exp-3`), the chef (`#yohann`), how it works (`#details`), the FAQ, the invitation (`#contact`) and the footer.
  There is also a booking dialog (Base UI) and a floating "plan the evening" dock button.
- **Art direction.** Woven table cloths (`weave.png`) in teal, linen, pomegranate, saffron and wine, with dashed
  stitched borders. Top-down table settings of cut-out photos (plates, cutlery, glasses, candles, spices). Paper
  place cards and price "bills" in Caveat / Gveret Levin handwriting. Frank Ruhl Libre 900 headlines. The
  `mychef✳` wordmark, with a saffron ✳ (the favicon is a plate with that ✳ on it).
- **Existing motion.** The site already does a lot, so I built on it and did not repeat any of it:
  - table pieces "set down" when a section enters (`[data-lay].is-laid`)
  - `[data-rise]` blocks fade up
  - hero pieces follow the pointer
  - Lenis smooth scroll
  - the courses stack as sticky cloths
  - the dock slides in
  - the booking sheet fades and tilts in

## Added

- **Loading screen** (inline critical CSS + `<ydx-loader>` markup in `index.html`; exit in `enhance.js`).
  - A table is set on the teal cloth: an SVG plate (like the favicon) sets down, then the fork and knife. A
    saffron sauce swoosh is brushed across the well, pomegranate and herb-oil dots pop, the ✳ garnish spins
    on, steam rises, and the wordmark fades up. It leaves by lifting like a cloth: the panel rises with a
    curved hem, the setting drifts up faster, and the page's own "set the table" entrance starts underneath.
  - It waits for `load`, React hydration, the stored language being applied, and `document.fonts.ready`.
  - Timing: at least 1.2s on the first visit; about 0.3s + 0.48s exit on repeat visits (`sessionStorage`); at
    most 0.8s in an iframe; a plain fade with reduced motion. Hard timeout is 4s, plus a CSS-only bail at 4.6s
    in case the script never loads. It is hidden without JS, `aria-hidden`, and causes no layout shift.
  - It uses a custom element on purpose. A `<div>` as the first child of `<body>` was picked up by React's
    hydration as its app root, which caused error #418 and a full client re-render.
- **Language transition.** Clicking a language (pointer or keyboard) sweeps the site's four cloths (saffron,
  pomegranate, linen, teal) across the screen in the new language's reading direction (right to left for
  Hebrew), with the language's name and ✳ on the teal cloth. The switch happens while the screen is covered,
  then the cloths sweep off. It takes about 0.7s and hides the site's jump to the top and its re-mount. The
  page's entrances are held until the screen is revealed.
- **Entrances** (CSS keyed off the site's own `.is-laid`, so they fire with the table pieces):
  - Hero, course, invitation and quilt headlines rise line by line through a mask. Lines are never split
    into letters, so Hebrew stays intact. The four clipped quilt titles stay in sync.
  - Then come the tag "stamp", the copy, the detail line and the actions.
  - The hero header drops in, and the hero tabs and quilt strip names stagger in.
  - Everything is paused while the loader or the wipe covers the page.
- **Handwriting writes itself in** in its own direction when scrolled to: the "Yohann" signature, the
  scribbles, the dish captions and the quilt hint.
- **Course stack depth** (desktop sticky layout only): as the next cloth is pulled over, the one underneath
  sinks to 94.5%, rounds its corners and dims.
- **Hero depth:** the table setting drifts slower than the page as the hero scrolls away. This is desktop
  only, and uses `translate` so it does not fight the site's pointer parallax.
- **Micro-interactions** (fine pointers only):
  - The main buttons and the round arrow buttons are magnetic (`translate`, so `:active` and the dock are untouched).
  - The ✳ turns on wordmark hover.
  - Nav underlines and underlined links draw in from the reading start.
  - Step cards, price bills and the gallery print lift and straighten on hover.
  - The tab numbers nudge up, and the occasion swatches lift.
- **Booking dialog:** its contents arrive in order after the sheet lands, and the place card sets down.
- **FAQ:** answers open and close smoothly (`::details-content` + `interpolate-size` where supported), and the
  minus sign turns in.

## Bugs fixed

1. **Hebrew flashed at English and French visitors (all viewports).** The server always renders Hebrew, and a
   stored EN/FR choice was applied about 0.5s after hydration. The loader now waits until the stored
   language is applied.
2. **Small tap targets on touch (mobile).** The language buttons were 31px tall, the text links ("Enter the
   table", "More from the kitchen", WhatsApp) 32px, and the footer email and phone 28px. They now have
   invisible hit areas of at least 44px, with the look unchanged. The course arrows went from 42 to 44px.
3. **The floating dock covered the footer's image-credit line (mobile, end of page).** The footer now has
   bottom padding.
4. **Spice bowls hid part of the chef headline (desktop).** At 1280 to 1920 the bowls covered "israélie|n"
   (FR at 1920) and parts of the other lines. The headline now sits above the bowls, like the hero's type over
   its cutlery.

## Left alone, on purpose

- **The page title** is English ("MyChef Israel — A table to remember") in all three languages. It needs
  copy from the client, and it is rendered by the app's metadata.
- **Headline/photo overlaps** in the hero and the courses (a period touching a platter, a headline running
  under a knife) are part of the collage composition, so they are kept.
- **The date field** shows `mm/dd/yyyy` in Hebrew. That is the browser's native date input following the OS
  locale.
- **`/_next/static/chunks/e.currentHref`** is a crawl artefact (a copy of the HTML), not a page.
- **No custom cursor and no marquee:** neither belongs to this site's quiet, tactile direction, and the hero
  already responds to the pointer.

## Files

- `ydx/enhance.css`, `ydx/enhance.js` (about 26KB together, unminified and commented).
- `index.html`: the lines marked `ydx`:
  - in `<head>`: a boot script that sets html flags and the stored language and preloads two fonts, the
    loader's critical `<style data-ydx>`, and links to `enhance.css` and `enhance.js` (`defer`)
  - as the first child of `<body>`: the `<ydx-loader>` markup
- No minified bundle was edited.

## Round 2

A second review of the first pass, done as a first-time visitor and as QA.

### What I audited

- **Loader and transitions as frame sequences.** I recorded them with CDP screencast at 25–90ms per frame, on
  desktop 1440 and on iPhone 13. That covered:
  - the first visit, a repeat visit, the iframe version and reduced motion
  - the language wipe for each language
  - the booking dialog opening and closing with Escape
  - scrolling through the course stack
- **Slow network.** I throttled to 400kbps with 400ms RTT and 4x CPU.
- **CLS and long tasks.** I measured both with and without the ydx layer. To remove the layer, `/ydx/*` was routed
  to 404 and the inline boot, style and loader were stripped. I also used CDP `Performance.getMetrics` to time a
  scripted scroll through the whole page, comparing the round-1 files with the new ones.
- **Keyboard and screen reader.** I tabbed through the whole page, checking the focus ring, the order, and what
  happens when Tab is pressed during the loader. I also checked that Escape closes the dialog and that the
  overlays are `aria-hidden`.
- **Layout sweep.** I checked 360, 390, 768, 844x390 (landscape phone), 1024, 1280, 1440 and 1920, each in
  Hebrew, English and French. Each run looked for horizontal scroll, text pushed off the screen and clipped text,
  and took scroll-walk screenshots to judge by eye.

### Found and fixed

1. **Scrolling the course stack was janky (desktop).** This was the biggest problem.
   - **Cause:** the round-1 "sink" wrote a custom property on each full-screen course on every scroll frame.
     That re-styled every node inside the course and repainted it (scale, border-radius and a dimming
     `::before`).
   - **Before:** long tasks of up to ~850ms in one scroll-through. The scripted scroll cost about 225–675ms of
     style recalc and about 1.2–2.5s of main-thread work.
   - **Change:** the sink is now two paused Web Animations, scrubbed through `currentTime`:
     - a `transform` on the course, which is layer-promoted only while it is sticky
     - an `opacity` on its `::before` shade, which has its own layer
     The rounded corners are a single transition, switched by `[data-ydx-sunk]`.
   - **After:** style recalc is about 25–35ms. There are no long tasks during scroll, against several before.
     CLS is still 0 with and without the layer.
2. **The hand-off from the loader had a blank frame and the lift could not be seen.** The cloth is the same teal
   as the hero, and the page's entrance was held until 30% of the lift. So guests saw the setting fade, then an
   empty teal screen for about 150–250ms, and only then the table being set.
   - The entrance is now released the moment the lift starts, so the plate, cutlery and headline are being set as
     the hem passes over them.
   - The hem now casts a shadow, and its dashed stitching curves with it (WAAPI on `::after`), so it reads as a
     cloth being drawn off.
   - The setting rides up with the cloth and fades only on the way out.
   - The ease is gentler: 760ms on the first visit, 520ms on a repeat visit, 460ms in an iframe.
3. **On a slow connection the loader stayed up about 5s, and could have hidden the page for good.**
   - The timings were measured from navigation start. On slow 3G the first paint came at about 4.4s, so the
     script cap had already run out and the CSS bail decided instead.
   - Now the minimum (1.05s, the full plating sequence) and the cap (3.5s) are measured from the loader's first
     paint (`performance.getEntriesByType('paint')`). The CSS-only bail moved from 4.6s to 3.9s.
   - If the CSS bail has already faded the loader before `enhance.js` arrives, the script no longer brings it
     back just to lift it.
   - The "hold the entrances while covered" rule is now keyed to `html.ydx-on`. Before, a missing or slow
     `enhance.js` would have left every table piece paused at opacity 0 forever.
4. **Hero place card ran off the screen in the desktop layout below about 1100px.**
   - At 1024x768: "Your seat is waiti|" in English, "|המקום שלכם מח" in Hebrew, and the same in French. It
     happened on 844x390 landscape phones too.
   - Fix: `inset-inline-start: min(52%, 100% - 330px)`. Nothing moves at 1440 and above.
5. **The wine glass sat on the language buttons** from 844 to about 1279px wide (landscape), worst in French.
   Below 1280px it now sits clear of the header (`top: max(var(--y), 96px)`).
6. **French hero place card was cut at 360px** ("Votre place vous atte…" with an ellipsis). It is now 28px below
   381px wide, and fits.
7. **The first quilt strip's name disappeared on phones.** The middle of "ארוחה פרטית" / "Private dining" ran
   over the fish plate's cream rim, cream text on a cream plate. This was already the case before round 1. On the
   two-column phone quilt the plate is now a little higher and smaller, which matches the challah strip next to
   it.

### Added (second improvement loop)

- **The tea lights are lit.** A warm pool of light opens under each candle once its table is set, then breathes
  irregularly, like a flame in a draught.
  - It appears on the hero, the first two courses, the hosting section and the invitation.
  - It is a `::before` under the candle. It animates only `transform` and `opacity`.
  - It runs only while its section is on screen (`[data-ydx-vis]` from an IntersectionObserver) and is off with
    reduced motion.
  - It is very quiet on purpose: an ambient detail you notice on the second look, not an effect.

### Checked and kept

- **The rest of round 1** was kept after review:
  - the language wipe (about 0.7s of motion; the covered hold in between is React re-mounting the page)
  - the line-by-line headline rise
  - the handwriting write-on
  - the magnetic buttons
  - the booking stagger
  - the smooth FAQ
- **The booking dialog's own exit** (a fade and tilt) is good as it is, so I did not add one.
- **Keyboard:**
  - Focus is always visible (a 3px ring in each cloth's colour), and the order is logical.
  - Escape closes the dialog and gives focus back to its trigger.
  - The loader never traps focus. Tab during it lands on the skip link, and the loader lifts within about 1–2s.
- **Reduced motion:** the loader is a 260ms fade, with no sink, no glow and no wipe.
- **Iframe:** the loader is gone within about 0.8s.
- **Errors:** no console errors on desktop or mobile, across language switches, FAQ, dialog and dock.

### Left alone

- **Collage overlaps of headline and cutlery** at short landscape heights, such as "Votre histoire." touching the
  knife at 844x390. Same reasoning as round 1.
- **The handwriting write-on still reveals both lines of a wrapped hint at the same time.** I judged that
  acceptable for a two-line scribble.

## Round 3

A line-by-line review of the ydx layer and a production-hardening pass. Each suspected bug was reproduced with a
focused Playwright test first, then fixed, then retested. The tests are in the round-3 scratch folder
(`js/bugs.cjs`, `js/modes.cjs` and others).

### Production conditions tested

- **Live response headers.** `mychef.ydesign.workers.dev` sends no CSP, no `X-Frame-Options` and no other
  restrictive header, only `cache-control: public, max-age=0, must-revalidate`, `report-to`, `nel`, and
  `content-type: text/html` with no charset. The page already declares its charset in its first bytes.
  - I replayed exactly these headers on the local HTML. Nothing was blocked and there were no console messages.
- **Every load scenario now ends usable and visible.** For each one, the hero headline, header, copy and pieces
  were checked every 50ms:
  - JS disabled
  - `enhance.js` returning 404, `enhance.css` returning 404, and both
  - `enhance.js` delayed 8s, `enhance.css` delayed 8s
  - the app's chunks delayed 8s, and the app's chunks blocked for good (in Hebrew and with English stored)
  - the page frozen for 7s during load (`Page.setWebLifecycleState`)
  - the page frozen in the middle of a language wipe
  - the hub iframe
  - 400kbps with 4x CPU
  - live headers, reduced motion, and a repeat visit
- **No new console errors** on the desktop and mobile scroll-walks, the language switches, or any of the
  scenarios above. The only messages were the 404s and blocked requests that the tests caused on purpose.

### Bugs found and fixed

1. **A slow `enhance.js` made the hero blank and replay (enhance.js delayed 8s).**
   - The loader's CSS bail had shown the page at about 4.4s. When the script arrived at 8s it set `ydx-on`, and the
     already-visible headlines were clipped to nothing and rose again.
   - Entrance styles now key off a new `html.ydx-enter`. The script only sets it when it arrives while the loader
     still covers the page.
   - Handwriting already in view on a late arrival is left as it is.
   - The class is restored under the cover of the next language wipe.
2. **The page was blank if the app never hydrated (bundle blocked or broken).**
   - The site's own inline script sets `html.lay-ready` before React runs, which hides every table piece. Our
     entrance rules also hid the headlines, copy and header, for good.
   - Now, when the loader lifts and the app is not there, `ydx-enter` is dropped, so the text shows as the
     cloth lifts.
   - If the app is still missing 6s later, `lay-ready` is removed so the site's pieces show too.
   - If the app hydrates later after all, its own effect adds `lay-ready` back and lays the table as usual.
3. **A slow `enhance.css` held the whole first paint.**
   - With the file delayed 8s, the screen stayed blank, with no loader, and hydration waited too.
   - It is now `<link rel="preload" as="style" onload="this.rel='stylesheet'">`, so the inline loader paints at
     once.
   - If the CSS has not arrived when the cloth lifts, `ydx-enter` is dropped so late hide rules cannot land on
     text that is already showing.
   - Trade-off: with JS disabled, `enhance.css` (hit areas, layout fixes) does not load. The page is still complete.
4. **`enhance.js` was `defer`, so a slow file delayed `DOMContentLoaded` until it arrived (8s in the test).**
   - It is now `async` and waits for the DOM itself. The app's own scripts are async modules and were not delayed.
   - The window `load` event still waits for it, as it does for any subresource.
5. **A missing `enhance.js` kept the loader up for about 4.4s (404).** The script tag now has `onerror` that
   removes `ydx-loading`, so the page shows at once.
6. **Running `enhance.js` twice broke the language switch.** The two capture listeners swallowed each other's
   click and the language never changed. The script now has a run-once guard.
7. **A throw during the loader exit left the page invisible.**
   - Reproduced by making `.animate()` throw on the stage. The loader's CSS bail had already been cancelled and
     `html.ydx-loading` stayed set, which paused every entrance at opacity 0.
   - The exit is now wrapped. On any error it finishes at once.
8. **The language wipe could stay on screen.** Before, it relied on animation promises and two rAFs, which stall
   in hidden or frozen tabs and could reject. Now:
   - the language swap runs exactly once
   - every step is guarded
   - a 2.5s safety timer swaps and removes the cover in any case
   - the button is looked up again at swap time
9. **Keyboard focus was lost after a language switch.**
   - The site re-mounts the page, so focus fell to `<body>`. This happens without ydx too.
   - When the button had focus, focus now moves to the newly pressed language button.
10. **Smaller fixes.**
    - **Clicks before hydration:** a language click before the app hydrated played a wipe that changed nothing.
      It is now passed straight through.
    - **Without `enhance.css`,** the wipe was unstyled divs added to the bottom of the page. The script now detects
      the stylesheet (`--ydx-css` on `:root`) and skips the wipe and the course sink when it is missing.
11. **Robustness fixes found by review.**
    - **Background tabs.** The loader's 40ms poll is throttled to 1/min in background tabs. It is now also
      re-checked on `visibilitychange` and `pageshow`, and when the CSS bail's `animationend` fires.
    - **Leak.** The visibility IntersectionObserver kept every page React had thrown away, one detached tree per
      language switch. Disconnected sections are now unobserved.
    - **Pseudo-element animations.** WAAPI `pseudoElement` is now feature-checked. Where it is unsupported,
      Safari and Firefox ignore the option, and the course itself would have faded to 0.45 instead of its shade.
    - **Hero depth.** The scroll effect no longer rewrites the same inline value on every scroll frame below the
      hero.
12. **The hub iframe loader ran past 800ms.**
    - Measured 0.8–1.2s from first paint: hydration long tasks stalled the main-thread hem and shadow animation.
    - In the iframe it now lifts with a transform only (compositor), with shorter timings (min 220, cap 260,
      exit 400ms).
    - Measured 0.70–0.83s after the change.
13. **Dead code removed:** the `ydx-leaving` class (never styled) and `--ydx-swing` (never used).

### Checked and fine

- **Interception.** Only the language buttons are intercepted. ydx never touches links, forms, hash links or the
  dialog, so modifier clicks, new tabs, downloads and `javascript:` links are not affected. The booking dialog
  can't be over a language button.
- **Double clicks.** Rapid clicks during a wipe (FR, then EN twice) end on one language with no stuck cover.
- **No monkey-patches.** No history, Lenis or `startViewTransition` patches.
- **No stuck locks.** No `inert`, `overflow` or `pointer-events` locks are left behind. The wipe and the loader
  are the only covering layers.
- **Storage.** All storage access is in try/catch.
- **MutationObserver.** It only reacts to `childList`. Its own work only sets attributes, so there is no feedback
  loop. There were 0 mutations in 3s idle.
- **Handwriting.** All five handwriting targets are written in by the bottom of the page at 1440 and 390.
- **Browser support** (reasoned from the code; only Chromium was available):
  - `:has()` rules (candle glow, wine glass, quilt plate) are dropped as a whole where unsupported.
  - The smooth FAQ is behind `@supports selector(::details-content)`.
  - There are no view transitions, scroll-driven animations, `@starting-style` or `inert`.

### Remaining known limitations

- **bfcache is untested.** Playwright's Chromium never restored the page from bfcache, even with the live
  headers. The preview server's `no-store` also prevents it. A restore re-runs the loader check on `pageshow`, and
  the wipe has its safety timer.
- **A real background tab is also untested.** It cannot be reproduced headless (pages always report `visible`),
  so it was covered with the frozen-lifecycle tests.
- **Slow 3G is mostly the site's own problem.** At 400kbps the app itself hydrates only after about 26s, because
  images use up the bandwidth. The loader's CSS bail shows the page at about 4s, now with all text visible
  (before, it was hidden until about 26s). Until the app hydrates, the site's own table pieces stay hidden, and
  English or French visitors see Hebrew.
- **If the app hydrates only after the loader has gone,** the first view has no headline line-rise. It is
  restored on the next language switch.

## Round 4

A last look at the whole site, the way an awards jury would see it. I scrolled it section by section at 1440 and on
an iPhone 13, in Hebrew, English and French, and recorded the motion as frame sequences.

### What I judged

- **It is close to done.** The loader, the table being set, the course stack, the language wipe, the handwriting
  and the candles all belong to one tactile "table" direction, and none of it reads as noise. I removed nothing
  from earlier rounds.
- **The headline motion was inconsistent.** The hero, the courses, the quilt and the invitation set their headlines
  line by line. The chef ("French soul. / Israeli heart. / Endlessly curious."), the hosting cloth ("Be guests. / In
  your own home.") and the gallery's "A little precision. / A lot of heart." faded up as one block, which was the
  site's own `[data-rise]`. In the middle of the page that read as a different, more generic hand.
- **The easing was close but not tokenised.** The loader lift (`.62,0,.2,1`), the language wipe (`.7,0,.25,1`) and
  the handwriting each carried their own literal curve.
- **The end of the page was flat.** The footer had no moment of its own, although the loader opens with a ✳
  garnish being placed.
- **The booking form had no error state.** A required field left empty only got the browser's bubble, and the field
  itself did not change.

### Changed

1. **One headline language** (`enhance.css` 4a). The chef, hosting and gallery headlines now rise line by line
   through a mask, like the others. The rest of each block follows, and the gallery link fades up after the lines.
   - The effect keys off the site's own `.is-in`, under `html.lay-ready.ydx-enter`.
   - So with no JS, a missing or late `enhance.js`, a missing `enhance.css`, an app that never hydrates, or reduced
     motion, the site's block rise (or nothing) applies exactly as before.
   - Lines are never split, so Hebrew stays intact.
2. **Motion tokens** (`:root` in `enhance.css`, mirrored as constants in `enhance.js`). There are four curves, one
   for each kind of motion:
   - `--ydx-ease` ("settle"): the same curve as the site's `--ease`.
   - `--ydx-ease-cloth`: `.66,0,.22,1`, now shared by the loader lift and the language wipe.
   - `--ydx-ease-pen`: the handwriting.
   - `--ydx-ease-garnish`: `.3,1.4,.4,1`, the loader's ✳ overshoot.
   The two covers now move with the same cloth curve. Their timings are unchanged.
3. **End of the page** (`enhance.css` 4b, `enhance.js` part 3). When the footer first comes into view, its ✳ is
   placed with the loader's garnish spin and overshoot, so the evening closes the way it opened.
   - It plays once for each page mount. The footer is re-observed after a language switch.
   - Nothing is hidden beforehand. Without JS or with reduced motion it simply sits there.
4. **Booking form error state** (`enhance.css` 4c). `:user-invalid` turns the underline of a required field
   pomegranate, so nothing is red before the guest tries to submit.

### Tried and removed

- **"Sewing" the stitched hem of each cloth.** As a cloth was laid, a conic mask on its dashed `::after`, driven by
  an `@property` angle, ran the thread out from the top centre in both directions.
  - It looked right, but a mask animation repaints every frame. In a trace of a full scroll at 1440 it raised
    raster time from about 4–6s to about 14s.
  - Giving the stitch its own layer while it ran did not help enough.
  - The stitching is faint (about 30% alpha), so the gain was small for the cost. I removed it completely.

### Regression results (after the changes)

- **Round-3 `bugs.cjs`:** all PASS. That covers:
  - doubleRun, kbFocus, rapid, frozen, hidden, css404wipe, preHydrate, writeAll 1440/390 and frozenWipe
  - iframe: loader gone 813ms after paint, under 4x machine load
  - bfcache and liftThrows
  - churn: 0 mutations idle
- **Round-3 `modes.cjs`:** every mode ends usable. That covers:
  - normal, en and nojs
  - js404, css404 and both404
  - jsLate8, appLate8, appNever and appNeverEn
- **`headers.cjs`:** PASS with the live headers, which are unchanged. `curl -sI` still shows no CSP and no XFO.
- **`cssLate.cjs`:** usable.
- **`ifr.cjs`:** the iframe loader is gone 669–731ms after navigation.
- **New `r4modes.cjs`:** the new headline lines, the gallery link and the footer ✳ all end visible. It passes in
  normal, mobile, reduced motion, nojs, js404, css404, jsLate8, appNever, fr and en, with no console errors.
- **Language switch, then scroll:** the re-mounted headlines rise again and the new footer is flagged.
- **`shoot.mjs` walk, desktop and mobile:** 0 log lines, with no errors and no failed requests.
- **Paint trace of a full scroll:** within noise of round 3. Desktop raster is about 3.2–3.9s against 3.2s, and
  mobile is 0.24s against 0.30s.
