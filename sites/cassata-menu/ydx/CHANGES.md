# Cassata — design + motion pass

## The site

- **Build:** TanStack Start (React 19.2, SSR, `hydrateRoot(document)`), framer-motion, Lenis smooth scroll
  (`anchors: {offset:-70}`), Radix dialogs. Compiled bundles in `/assets`; not edited.
- **Pages:** `/` (the live daily menu) and `/host` (staff counter: key login → flavour table with stock switches,
  prices, archive/edit dialogs). Both pages read `GET /api/menu` (polled every 5s) and `/host` writes with `POST`.
  In the local preview `/api/menu` returns the SPA fallback HTML, so the app shows its "waiting / can't reach" states.
  For review the live JSON was injected through Playwright only; no request handling was changed.
- **Art direction:** a Tel Aviv gelato bar drawn as sticker art: cream pills and cards with a 2.5px ink border and a hard
  offset ink shadow, slight rotations, a lime / forest / red / butter / pink / cream palette, Rubik 900 display,
  Fraunces italic wordmark, Gveret Levin / Reenie Beanie handwritten notes, ✳ asterisk and rotating text seals,
  real photos of steel coupes, and RTL Hebrew with an English toggle.
- **Existing motion (left alone):** the hero cycles through today's flavours. It recolours the field, the name rises
  (`rise`), framer swaps the coupe with a spring, and a progress ring fills on the active token. The page also has a
  pointer parallax on the hero, rotating seals, two CSS marquees, `.reveal` blocks driven by `animation-timeline: view()`,
  framer layout/enter animations on the grid cells, the sheet `pop` / mobile `lift`, and spring hovers on cards,
  tickets, buttons and the brand.

## Added

All of it is in `ydx/enhance.css`, `ydx/enhance.js`, and two inline blocks marked `ydx` in `index.html` and
`host/index.html`: the loader's critical `<style data-ydx>` plus `ydx-js` flag in `<head>`, and a tiny inline loader
script as the first thing in `<body>`. Nothing is inserted inside the React tree. JS only adds `data-ydx-*`
attributes, classes on `<html>` and Web Animations that use the individual `translate` / `rotate` / `scale` properties,
so it never fights the site's own `transform`s or framer's inline styles.

1. **Loader: "a triple scoop on a waffle cone".** It is drawn in the site's sticker style (ink outlines, hard
   shadows) on the hero's lime. The cone rises, then cream, pink and red scoops drop in one after another and squash
   as they land. A cream ✳ pops on top, and a forest-green ring of the hero seal's copy (`קסטה תל אביב ✳ גלידה עם אופי`
   / `CASSATA TEL AVIV ✳ GELATO WITH CHARACTER`) turns behind them. Underneath sit the brand badge and the site's own
   handwritten line `רגע, בודקים מה יש…` / `Checking the counter…`, in the stored language.
   - **Exit:** the stack squashes and the lime curtain lifts. Its bottom edge is an ink-outlined **drip** of
     melting gelato that stretches as it rises. Because the curtain is the hero's own colour, the hero looks like it
     melts into place.
   - **When it leaves:** after `load`, fonts, and the app leaving its yellow "checking" state, so visitors meet the
     real first flavour and not the placeholder. There is a minimum of 1.25s on the first visit, about 0.4s on repeat
     visits (sessionStorage), and a hard limit of 4s. In the hub iframe it is capped at about 0.75s in total.
     Reduced motion gets a plain fade. If `enhance.js` never runs, an inline failsafe removes the loader at 4.5s.
   - It is `aria-hidden`, causes no layout shift, and does not lock scrolling. The hero name's `rise` animation is
     paused under the loader so it plays when the curtain lifts.
2. **Entrance choreography as the curtain lifts.** The brand sticker swings in and the nav and language pills drop in.
   The coupe springs up from below, the seal spins in, the hero copy staggers up, the flavour tokens pop in one by one,
   and the marquee slides up. On `/host`, the title staggers in and the login card drops in with its ✳ star spinning.
3. **Page transitions (`/` ↔ `/host`, brand link, `/#menu` from host).** Same-origin link clicks (not modifier/new-tab
   clicks, downloads or same-page anchors) pour the drip curtain *down* over the page in 0.52s, then navigate. The next
   page starts already covered and lifts it once ready. Back/forward cache restores never stay covered.
4. **Language switch transition.** The new language opens as a circular "scoop" from the toggle, using the View
   Transitions API. The first click is held and replayed inside `startViewTransition`, so React does the real work.
   It takes 0.66s and works with the keyboard. Browsers without the API, and reduced motion, switch as before.
5. **Menu grid.** Cards drop in like scoops as they scroll into view: they rise and tilt, then settle, and the photo
   lands a beat later with a squash. They stagger in reading order (right-to-left in Hebrew). Cards that mount on
   screen because of a filter or tab change are left to the app's own framer enter animation, so nothing animates
   twice. The handwritten tile and the filters/footers reveal too.
6. **Servings:** prices (or "שאלו בדלפק") are stamped onto the tickets as they arrive.
7. **Visit:** the pistachio-swirl texture inside `ניפגש בקסטה.` slowly churns, and only while it is on screen. The
   pink "COME AS YOU ARE" seal spins in. **Today's row in the opening hours** gets a butter highlighter stroke, worked
   out in Asia/Jerusalem time (Sun–Wed / Thu / Fri; none on Saturday).
8. **Scroll-linked (CSS `view-timeline`, progressive):** the hero content sinks and softens as it scrolls away, and the
   giant footer `cassata` rises out of the pink like soft-serve.
9. **Marquees:** scrolling speeds both tickers up, then they ease back to their own pace.
10. **Micro-interactions:** magnetic main CTAs, a press squish on filter chips, tabs and staff link, count badges that
    wobble when the live count changes, the flavour-sheet copy staggering in under the site's `pop`, a soft blur behind
    dialogs, and staff dashboard panels and table rows that pop in after login.
11. **Scoop cursor** (fine pointers only, never in the iframe): a small red ink-ringed dot, the site's live-dot,
    follows the mouse. It becomes a ring over links and buttons, and a cream ✳ sticker over anything that opens or
    selects a flavour (cards, the hero coupe, tokens). The native cursor is kept, and the dot hides over form fields.

## Bugs fixed

| Where | Viewport | Fix |
| --- | --- | --- |
| Hero seal, English | all | `LIVE FROM THE COUNTER ✳ TODAY'S SCOOPS ✳` was squeezed by `textLength=240` until the letters ran together. A smaller size lets `lengthAdjust=spacing` breathe. |
| Opening hours, English | 360px | `12:00–00:00` broke over two lines. Added `white-space:nowrap`. |
| Hero hand note, English | phones | It kept the desktop `16ch` cap, so it sat in a narrow block on the left while the Hebrew note is centred. It is now uncapped on phones. |
| `/host` footer | all, RTL | The wordmark is `direction:ltr`, so `text-align:start` put it on the left of an RTL page. It now aligns right. |
| `/host` layout | desktop | The main column was capped at 1180px and centred, about 130px inside the header and footer edges. It is now aligned to the site gutter. The flavour table gains width. |
| Focus ring | `.visit`, `.servings` | The ink outline on forest or red was nearly invisible. It is now cream in those sections and stays ink inside the cream hours card. |
| Tap targets | phones | Tabs were 42px, chips 43px, the staff link 38px and the hours link 26px tall. All are now at least 44px. |
| Servings lead | desktop | A lone last word dropped onto its own line. Added `text-wrap: balance`. |

## Deliberately left alone

- **Compiled bundles and the app's data states.** "מתעדכנים…" and "לא הצלחנו להתחבר" in the preview come from the
  blocked `/api/menu`. They are not bugs in the live site.
- **The console warning on `/host`** ("coupe-pistachio.webp preloaded but not used") comes from the app's own `<head>`
  output. React owns that `<head>`, so removing the preload by hand risked a hydration fight for a warning only.
- **Hero name invisible without JS.** The app's fit-text starts at `visibility:hidden` until it measures. This was
  already the case before this pass.
- **Smooth anchor scrolling** is already handled by the site's Lenis, so nothing was added that would fight it.
- **Card dialog close** has no exit animation, because Radix unmounts it at once. Adding one would mean patching the
  bundle.
- **Sticky header pills over content** while scrolling are the original floating-sticker design.

## Verified

Playwright checks at 1440, 1280, 1920, iPhone 13 and 360px, in Hebrew and English, on `/` and `/host` (login and
dashboard states with mocked data, plus the real blocked-API state). They covered the first, repeat, reduced-motion,
iframe, no-JS and failed-`enhance.js` loader paths, the page transition there and back plus bfcache, the language
switch by mouse and keyboard, filters, tabs, and opening and closing the dialog. There was no horizontal overflow and
no new console errors or warnings. The only warning is the app's existing preload notice on `/host`.

## Round 2

A second review of pass 1 with fresh eyes: QA plus a creative pass. Live `/api/menu` JSON (fetched through the proxy)
was injected with Playwright `page.route` for realistic states, including a mocked `authenticated:true` for the
staff dashboard.

### What was audited

- **Loader and transitions as frame sequences:** CDP screencast, about 16ms per frame, on desktop and iPhone 13,
  in Hebrew and English. Covered the first visit, repeat visit, `/` → `/host` drip transition, language scoop
  (View Transition), flavour-sheet open and close, and the hero flavour swap.
- **Throttled:** network at 400kbps / 400ms RTT and CPU at 4×. The loader is never stuck and always lifts within
  its 4s cap. A JS profile while scrolling under 4× CPU showed about 16ms of total `enhance.js` time. The long
  tasks belong to the app bundle.
- **CLS (PerformanceObserver), with and without the ydx layer** (`/ydx/*` routed to 404). Desktop was about 0.005
  both ways.
- **Keyboard and screen reader:** full Tab order on `/` and `/host`, visible focus everywhere, no focus trap. The
  loader and cursor are `aria-hidden`. Checked Escape on the sheet and where focus goes after closing it.
- **Layout:** viewport-stepped screenshots at 360, 390, 768, 1024, 1280, 1440, 1920 and 844×390 landscape, plus
  960×600, in both languages, on `/` and `/host` (login and dashboard).

### Found and fixed

| Where | Viewport | Problem | Fix |
| --- | --- | --- | --- |
| Hero flavour swap | ≤820px (phones, tablets) | **Original bug, missed in pass 1.** Framer keeps the outgoing name mounted beside the incoming one, and the stage is a one-column grid there. So on every flavour change (every 5s) two names stacked, and the coupe, copy and rail jumped 196px down and back. Mobile CLS was **0.43–0.70**. | `.hero__stage > .hero__name { grid-area: 1/1 }`. Both names share one cell and cross-fade, as on desktop. Mobile CLS is now **0.000**. |
| Hero | landscape phones and short windows (≥821px wide, ≤674px tall) | **Original bug.** The hero has a 620px minimum height, but the coupe was sized at 76svh. At 844×390 it shrank to a 296px cup at the bottom of the stage. In English the bottom-anchored copy grew up into the split name ("BROWN" sat on "Something"). | In that range only: `--coupe-h: min(470px, 50vw)`, the name band moved up (`inset: 3% 0 40%`), and the copy is slightly wider with a smaller h1, so the CTA stays on one line. |
| Flavour sheet | all | **Original a11y bug.** After closing (Escape, ×, overlay), focus fell to `<body>`, so keyboard users lost their place in the grid. | `enhance.js` remembers the card, coupe or token that opened the sheet and refocuses it (`preventScroll`) when the sheet unmounts. This also works under reduced motion. |
| Loader text | first visit | The handwritten line, and on arrival pages the ring, rendered in a fallback font first, then swapped to Gveret Levin/Rubik about 150ms later. This was visible in the frames. | The inline loader script calls `document.fonts.load()` for the three faces. The hand line and ring stay transparent until the fonts are ready, then fade in over 0.3s, with a 1.2s fallback. The ring is not gated on page-to-page arrivals, so it doesn't blink out. |
| Loader art | all | The rotating ring text ran *through* the waffle cone ("CHARACTER" and "WIT" were cut by ink lines). | The cone gets a lime die-cut halo, like a sticker border, so the ring passes cleanly behind it. |
| Drip page transition | all | The arriving page stayed covered until `load`, which means every image and an uncapped data wait, plus a 4s cap. In practice it was ~1.4s of a static loader after a 0.5s pour, which felt like a second loading screen. Navigation also only started *after* the pour finished. | Navigation now starts 110ms before the curtain lands, so the network wait overlaps the pour. Arrival (`nav` mode) waits for DOM, fonts (capped at 0.6s), data (capped at 1.1s) and `load` (capped at 0.45s), with a hard cap of 1.5s. The "Checking the counter…" line is hidden during page-to-page transitions: it is first-load copy. |
| Slow networks | 3G-ish | `enhance.js` (defer) queued behind ~575KB of modulepreloads and arrived about 3.9s after the loader painted. That is right at the inline failsafe, which then *removed* the loader in one frame. | `fetchpriority="high"` on the `enhance.js` tag: it now runs about 1.4s after first paint under the same throttle. The inline failsafe now fades the loader out (0.35s) instead of cutting it. |
| Scoop cursor | desktop | The 64px ✳ "hot" sticker sat on top of the flavour name while hovering a card. It also stayed in its card state after a click opened the sheet, because the pointer hadn't moved. | Hot state reduced to about 42px with a lighter shadow. The state is cleared when the sheet opens. |
| `enhance.js` | — | `refreshTracks()` called `getAnimations()` on the tickers on every DOM mutation. The app re-renders every 5s, and the hero swaps. | It only re-reads when React actually replaced the ticker nodes. |

### Added

- **Flavour-sheet exit.** Pass 1 left this out because Radix unmounts the sheet instantly. Now an inert,
  `aria-hidden` frozen copy of the sheet and overlay is captured at the close gesture (Escape, ×, outside
  pointerdown). It is appended to `<body>`, outside the app, after Radix removes the real one, then plays the
  mirror of the site's entrance and is removed:
  - **Desktop:** the sticker drops away, at 0.93 scale with a +1.6° tilt and fading, in 230ms.
  - **Phones:** the bottom sheet slides back down (the reverse of `lift`) in 300ms.
  - **Overlay:** fades out.

  Its CSS entrances are fast-forwarded with a negative `animation-delay`, so it leaves exactly as it looked. Nothing
  happens under reduced motion.

### Reviewed and kept

- **Pass-1 motion:** card drop-ins, price stamps, magnetic CTAs, the ticker boost, the language scoop and the
  entrance choreography. In the frame sequences each reads as on-brand, and none double-animates the app.
- **Language View Transition:** about 160–280ms before the wipe starts. That is React re-rendering the whole page,
  not the wrapper.
- **Under-loader shifts:** the `/host` footer shift (CLS 0.019) happens under the loader and is the same without
  ydx.
- **Mobile hero name:** a two-line name partly tucked behind the coupe is the original art direction (name behind
  the cup).

### Verified

- No console errors or warnings in any tested state, apart from the app's own `/host` preload warning.
- No horizontal overflow at any width tested.
- Every `[data-ydx-r]` element is revealed after scrolling.
- Mobile CLS is 0.000 (from 0.43–0.70). Desktop CLS is 0.005.
- Loader lift times:

  | Mode | Lift |
  | --- | --- |
  | Reduced motion | fade |
  | Iframe | <0.5s |
  | Repeat visit | ~0.7–0.9s |
  | Failsafe without `enhance.js` | fades at 4.5s |
  | 3G-throttled | ~4s cap, never stuck |

## Round 3

This round was a production-hardening pass before the layer goes live. It covered a line-by-line review of
`enhance.js`, `enhance.css` and the inline `ydx` blocks in both HTML files, then tests under live-like conditions.
Every suspected bug got a focused Playwright repro, which was run against the round-2 files first and the round-3
files after.

Test setup:
- Each local HTML response got the live response headers from `curl -sI`: `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`, and the rest.
- `/api/menu` was stubbed with live JSON.
- The scripts are in `scratchpad/cassata-menu-r3/`: `bugs.mjs`, `matrix.mjs`, `regress.mjs`, `order.mjs` and
  `cssdelay.mjs`.
- `OLD=1` serves the round-2 snapshot for the before runs.

### Bugs found and fixed

| # | Bug | How it was reproduced | Fix |
| --- | --- | --- | --- |
| 1 | **A drip transition whose navigation never commits left the page covered and unclickable.** This happens when the visitor presses Stop or Esc, when the response is 204 or a download, or when a "leave site?" prompt is cancelled. The curtain stayed down with `pointer-events:auto`, and `leaving` stayed true. | `/host` routed to a 204. Clicking the staff link left the curtain down 8s later (`nav204`). | A 4.5s safety timer, cancelled on `pagehide`, lifts the curtain again with `uncover()` and resets the state. A same-document `popstate` during the pour does the same. |
| 2 | **Clicking a link while the first-load curtain was still lifting killed the pour.** `cover()` cancels the lift animation, which rejects its `finished` promise. That rejection handler ran `park()` and hid the curtain that had just started pouring. | A link was clicked 150ms after the lift started. There was no curtain 330ms later (`clickDuringLift`). | `park()` does nothing while `leaving` is true. `lift()` doesn't animate if a pour has already started. |
| 3 | **A bfcache restore during first load left cards invisible.** Reveals that intersected under the curtain are held until `lift()` releases them. The `pageshow` handler parked the loader without releasing them, so they stayed at `opacity:0`. | Load `/#menu` and fire `pageshow {persisted:true}` before the lift. Six cards in view stayed hidden (`bfcacheHeld`). | `pageshow` now runs `settle()`, which releases the held reveals and marks the page live. |
| 4 | **A bfcache restore after a transition kept `leaving=true`,** so later link clicks navigated with no transition. | `bfcacheLeaving`: no second pour. | `pageshow` resets `leaving` and clears the pending timers. |
| 5 | **A second activation during the pour navigated at once,** cutting the pour short. This was a second Enter on the still-focused link, or a second link. | Enter pressed twice 60ms apart started the request at 76ms instead of about 410ms (`doubleEnter`). | `cover()` now ignores calls once a pour is under way. The click is still `preventDefault`ed, so only one navigation happens. |
| 6 | **If `enhance.js` arrived just after the inline failsafe fired** (in the 4.5–4.9s window), the failsafe then *removed* the loader. Later transitions animated a detached node, so there was no curtain. `lift()` also replayed the whole entrance: the header and hero vanished and flew in again on a page the visitor had been reading for 4.5s. | With `enhance.js` delayed 4.6s, there was no pour on the next click (`lateJs`). With it delayed 4.8s, the brand got a WAAPI entrance animation (`lateEntrance`). | The failsafe now *hides* the loader (`hidden`, `display:none`) and sets `__ydxLoader.failsafe`. `enhance.js` then treats the loader as already lifted and parks it after the fade (`park()` clears the failsafe's inline opacity and transition). The page counts as live at once, and `cover()` re-attaches the loader if it was ever detached. |
| 7 | **`enhance.js` failing to run** (404, blocked, or a parse error) kept the loader up for the full 4.5s failsafe. | With `/ydx/enhance.js` returning 404, the page was covered for about 4.2–5.0s (`js404time`). | Deferred scripts run before `DOMContentLoaded`. If `__ydxTook` is still unset at that point, the inline script fades the loader out, with a 0.7s minimum. The page is now uncovered after about 0.5–1.3s. |
| 8 | **`enhance.css` failing to load left an unstyled cursor node in the page:** a static `✳` glyph at the bottom of `<body>`, moved around by its inline transform. | With `/ydx/enhance.css` returning 404, `.ydx-cursor` had `position:static` and was visible (`css404cursor`). | `enhance.css` sets `:root{--ydx-css:1}`. The cursor is only created once that is set, and the sheet ghost checks it too. |
| 9 | **`enhance.css` loaded slowly delayed the whole app.** It was a parser-inserted, render-blocking stylesheet, and that also blocks the inline scripts after it: the loader script, and TanStack's `$_TSR` stream barrier that hydration waits for. A slow or hung `enhance.css` therefore held back the loader, first paint and hydration. (Coordinator note. `enhance.js` itself did **not** delay the app here, because the app's module is `async`, not deferred.) | With `enhance.css` delayed 8s, first paint and hydration came at **8.2s** (`order.mjs`). With `enhance.js` delayed 8s, hydration was still at 0.24s. | The `<head>` `ydx-js` inline script now inserts the stylesheet itself, which makes it non-render-blocking and non-script-blocking, and exposes `window.__ydxCss`, which settles on load or error. A `<noscript><link>` keeps the design fixes without JS. The loader's lift also waits for the CSS (capped at 3s), so there is no unstyled flash. The cursor waits for it, however late it is. With `enhance.css` delayed 8s, first paint is now 0.24s and hydration 0.39s. |
| 10 | **Running `enhance.js` twice** (a duplicated tag or a re-injection) booted everything twice: two cursors and duplicate listeners. | `addScriptTag('/ydx/enhance.js')` produced 2 cursors (`twice`). | There is now a `window.__ydxBooted` guard. |
| 11 | **A thrown error at a bad moment could leave the curtain down.** `__ydxTook` (which disarms the inline failsafe) was set *before* the lift timers were armed. A throw inside `lift()` before its animation started also skipped `park()`. | Not reproducible with the current DOM. An injected throw in `entrance()` was already harmless because the curtain animation starts first. | `__ydxTook` is now set after the timers are armed. The 4.5s failsafe triggers on "`ydx-loading` still on `<html>`", whatever `enhance.js` did. `lift()` removes `ydx-loading` first, wraps its steps in `try` (calling `park()` on error, and `settle()` in `finally`), and `entrance()` is isolated. |

### Smaller hardening

- **Link interception:**
  - It skips SVG `<a>` elements (their `href` is an object, not a string).
  - It treats `href="#…"` (including a bare `#`) as an in-page link, so the page doesn't reload.
  - On a cross-document Back or typed URL *during* the pour, a temporary `beforeunload` listener cancels the
    deferred `location.href`, so the visitor's own navigation wins. Chromium already let Back win in testing
    (`backMidPour` passed before and after), so this is for other engines.
- **Swirl "churn" animation:** it is now tied to the actual `.visit__h` node. It is cancelled and recreated if React
  replaces that node, instead of running forever on a detached one.
- **Removed the `window.__ydxFlush` global.** It is a closure now.
- **The "page is live" switch** (cards React mounts on screen are left to framer) used to wait on `load`, so it never
  flipped if `load` never fired. It now follows the curtain: 400ms after the lift, or immediately when there was no
  curtain.

### Production-condition matrix (all with the live CSP, on `/` and `/host/`)

| Condition | Result |
| --- | --- |
| Baseline, desktop and iPhone 13 | Passed. |
| JS disabled | Content visible. The design fixes still apply through the `<noscript>` stylesheet. |
| `enhance.js` 404 | Uncovered after about 1.2s. |
| `enhance.css` 404 | Uncovered after about 2.1–2.5s. No cursor. |
| Both 404 | Uncovered after about 1.2s. |
| `enhance.js` delayed 8s | The failsafe fades the loader at about 5s. The late script neither re-lifts nor replays the entrance. The app was never delayed. |
| App bundle delayed 8s | The loader lifts at its 4s cap. The page is visible and hydrates later. |
| `/api/menu` down | Passed. |
| Reduced motion | Passed. |
| English | Passed. |
| Hub iframe (local wrapper page) | `frame` mode, covered for about 0.1s, no cursor. The transition inside the iframe works and arrives in `frame` mode. |
| CDP `Page.setWebLifecycleState` frozen for 5s mid-load, then active | Passed. |
| Background tab | The page ends up visible and usable, with no reveal left hidden. See the note below on how this was simulated. |

Background tab: headless Chromium here always reports `visible`, even with a second tab in front or the window
minimized. The test therefore simulated it: `visibilityState` set to `hidden`, rAF stalled, timers aligned to 1s
for 8s, then shown.

Across every run: no CSP violations (a `securitypolicyviolation` listener caught none), no `inert`, no
`overflow` or `pointer-events` lock, nothing left at `opacity:0` in view after scrolling, and no new console
errors. The only warning is the app's own `/host` preload notice.

### Regression checks after the changes

These were run on desktop and iPhone 13:
- The first-visit loader, then the lift.
- The language scoop, by mouse and by keyboard.
- The flavour sheet opening, then Escape. The ghost exit plays and is removed, and focus goes back to the card.
- `/` → `/host` pour and arrival, the brand link back, and browser Back.

Mobile CLS stays at 0.000 and desktop at about 0.004.

### Known limitations (left as is)

- **A real background tab could not be reproduced in this headless Chromium.** In a real background tab, Chromium
  holds new Web Animations until the first frame. A page loaded in the background therefore shows its curtain
  lifting (0.8s) when the visitor switches to it. That is intended and harmless.
- **If `enhance.css` is very late** (more than about 4s while the app's own CSS is fine), the page can show for a
  moment without the layer's design fixes. That includes the round-2 mobile hero-name CLS fix: CLS was 0.57 on
  mobile with the CSS delayed 8s. This is the original site's behaviour. It was accepted to guarantee the layer
  can never delay the app.
- **If a navigation takes more than 4.5s to commit,** the curtain lifts again over the old page before the new
  page replaces it.
- **Safari and Firefox were reasoned about, not run.** Only Chromium is available here.
  - `startViewTransition`, `animation-timeline`, `backdrop-filter`, `text-wrap` and `inert` are all
    feature-checked or progressive.
  - `getAnimations({subtree})` is wrapped in `try`.
  - Storage access is wrapped everywhere.

## Round 4

This was a creative-director pass over the whole site. I walked the home page scroll by scroll at 1440 and on an iPhone 13, in
Hebrew and English. I also checked `/host`, the data states (live, API down, everything sold out) and the
reduced-motion view. Scripts and shots are in `scratchpad/cassata-menu-r4/`.

### What I judged

- **The weakest moment was the hand-offs between colour fields.** The page moves paper → red (servings) → forest
  (visit) → pink (footer) through three straight ink cuts. Everything else on the page has a motion moment of its
  own, but these cuts were the abrupt, generic part. The site already owns the right motif: the loader's
  melting-gelato drip curtain.
- **Motion language.** `enhance.js` used 14 different cubic-béziers for what are really five kinds of motion.
- **Idle states.** The "All scooped up" card and the "Checking the counter…" box were the only static corners of the
  live menu. The app already handles the sold-out hero beautifully with its empty coupe.
- **Noise review.** I reviewed each earlier addition (cursor, magnetic CTAs, ticker boost, hero sink, dialog blur,
  card drops, price stamps, sheet ghost) against the frame sequences and screenshots. Each still earns its place,
  none duplicates the app's motion, and nothing was removed.

### Changed

1. **Melting section hand-offs** (`enhance.css`, CSS only). The colour above now melts over each edge, drawn with the
   loader curtain's own drip: an ink stroke and the site's hard offset shadow.
   - The three edges are paper drips into the red, red drips into the forest, and forest drips into the pink
     around the licked-clean coupe.
   - Each drip is a `::before` pseudo-element painted under the section's content (`z-index:-1` inside an isolated
     section), so no node goes into the React tree.
   - Each strip is offset differently so the edges don't repeat.
   - **Motion:** with `animation-timeline` support, a named `view-timeline` per section drives a scroll-linked
     stretch. The drips start as short nubs as the edge enters and reach full length by about 70% of the entry.
   - The strip has `will-change: scale`, so the stretch scales a rasterised layer instead of repainting the SVG.
     Scroll frame-gap p95 matched round 3 in A/B runs.
   - **Fallbacks:** without timeline support, with reduced motion, and without JS (via the `<noscript>` stylesheet),
     the drips are simply drawn at full length.
   - The drips are not used on `/host`.
2. **Motion tokens.** `enhance.js` now uses five named curves, mirrored as CSS custom properties:
   - `EASE` (the site's `--ease`)
   - `SPRING` (the site's `--spring`)
   - `INOUT` `(.65,0,.35,1)` for curtains and wipes: drip lift and pour, and the language scoop
   - `IN` `(.5,0,.75,0)` for exits: the sheet ghost and the loader stack leaving
   - `LAND` `(.3,.6,.35,1)` for squash landings: scoop art and price stamps

   I first tried `(.76,0,.24,1)` for INOUT. It made the pour start visibly later after a click, which is worse
   feedback, so I settled on the softer curve.
3. **Idle states.** The ✳ on the app's empty card turns slowly with the site's own `turn` keyframes, like its seals.
   The waiting box gets the same turning ✳ above its line, so "checking" reads as alive while the app polls every
   5s. Both are behind `ydx-motion` and reduced motion.

### Regression (round-3 suite, copied to `scratchpad/cassata-menu-r4/suite/`, live CSP, stubbed `/api/menu`)

- **`bugs.mjs`:** 12/12 PASS.
  - `lateJs` and `clickDuringLift` failed intermittently while the machine was at load average ~25 from parallel
    agents.
  - rAF sampling showed the same pour curve and the same intermittent miss with the round-3 files, so these were
    timing samples, not regressions. Both passed on the full run.
- **`matrix.mjs`:** 27/27 PASS. That covers base, no-JS, 404s, 8s delays, API down, reduced motion, English, iframe,
  background tab and frozen.
- **`regress.mjs`:** desktop and mobile ok on rerun. The language scoop, sheet, ghost exit, focus return, pour to
  `/host` and back, and bfcache all work. The first run's mobile screenshot timed out under load.
- **`order.mjs`:** app hydration and FCP are not delayed by slow `enhance.js` or `enhance.css`.
- **`cssdelay.mjs`:** ok.
- **`shoot.mjs`:** `/` and `/host/`, desktop and mobile, showed no console errors. The only warning is the app's own
  `/host` preload notice.
- **Layout:** no horizontal overflow at 360, 390, 1440 or 1920 in either language.
- **CLS:** 0.000 on mobile and 360px, and 0.004 on desktop in Hebrew.

### Known, not changed

- **Desktop English CLS is about 0.26–0.46.** The hero's fit-text columns, copy and note re-lay out once when the
  English data arrives, at about 350–600ms. This happens under the loader, so nobody sees it. It is identical with
  the round-3 files: the sources are `fit__col`, `hero__copy` and `hero__note`. It comes from the app's English
  fit-text measuring, not from the ydx layer. Fixing it would mean patching the bundle's fit logic, which is out of
  scope for a visual pass that can't be seen.
- **The app shows "Checking the counter…" in the menu box even when its notice says the connection failed.** That
  is app copy in the bundle.

## Round 5

The owner's note was "still too boring": the site needed living, reactive backgrounds and at least one real
interactive experience. Inputs: `BRIEF5.md`, `PLAYBOOK.md` (techniques 1, 3, 4, 21, 22 and the lean WebGL reference),
and this file's rounds 1–4. Scripts and shots are in `scratchpad/cassata-menu-r5/`.

### Built

1. **The living gelato field** (`ydx/field.js`, new; linked from `index.html` only, never from `/host`).
   The hero's flat flavour field (`--field`, recoloured by the app every 5s) is now a WebGL surface:
   - **Gelato surface.** Domain-warped simplex noise (PLAYBOOK §1.1, two-octave fbm) is read as broad, soft folds,
     like gelato sculpted in the vitrine. It churns slowly on its own, and scroll velocity stirs it.
   - **Variegato ribbon** (a cheap variant of technique 3, no FBOs). The pointer drags a lighter ribbon through the
     gelato. The ribbon is the distance to the last 32 pointer points, bent by the same flow as the folds, with a sheen
     line inside. It heals back in about 1.9s. The site's red scoop cursor rides at its head like a spoon tip.
     - On touch, a tap twists a small spoon swirl where the finger landed.
     - When nobody has touched it for 4.5s, a "ghost spoon" slowly churns a figure-eight in the empty band above the copy.
   - **The pour** (technique 21, in the site's own language). When the app features the next flavour, the new colour
     no longer cross-fades. It pours out of the coupe as a sticker blob with drips on its edge, the site's 2.5px ink
     outline and its hard offset shadow, the same vocabulary as the loader's drip curtain. The blob grows with an
     ease-out, so it reaches the copy before the app's own 0.5s text recolour.
   - **Contrast by construction.** Every effect only pushes the field *away* from the hero's text colour: lighter on
     light fields and darker on dark ones, gentler on dark ones. The app's own field/ink pairs were chosen for
     contrast, so they can only gain contrast and never lose it, in any frame. The only exception is the pour's moving
     ink rim, which is there for a split second.
   - **How it is mounted.** One canvas in `<body>`, outside the React tree, absolutely positioned over the hero's box
     (from a ResizeObserver), so it scrolls natively with the page and needs no scroll syncing. It sits at
     `z-index:-1`, and `body`'s paper is moved to the root, which already paints the same colour.
     - The hero only turns transparent (`html.ydx-gl`) after the first frame is drawn. The hero's own 0.7s
       `background-color` transition then hands over without a flash.
     - Pointer coordinates come from that cached box, so there are no per-frame layout reads.
2. **The Scoop Lab: `/play/`** (new standalone page: `play/index.html`, `ydx/play.js`, `ydx/play.css`).
   *"בנו גביע. אל תפילו." / "Stack it. Don't drop it."*
   - **What you do.** Today's flavours come from the live `/api/menu`, with the full 18-flavour collection and a note
     as the fallback. Tapping one drops a sticker scoop (the loader's scoop shape, flavour colour, gloss and flecks)
     onto a waffle cone, where it lands with a squash.
   - **The physics.** Drag the cone with a mouse or finger, move it with the arrow keys, or turn on phone tilt (iOS
     permission is asked inside the tap). The stack is a chain of damped springs that feels the cone's acceleration
     and gravity. Lean too far and the scoops above the broken joint fly off, with the cone's velocity, and **splat**
     on the counter: an ink-outlined puddle with droplets that squashes in. A hand-written "On the counter: 3" keeps
     count. A scoop dropped while you move the cone away misses and splats too.
   - **The ticket.** It stamps in with the live prices (₪19 / ₪26), or the site's "Ask at the counter" for 3 or 4
     scoops, and lists the combo.
   - **The background** is the same living field in the top scoop's colours. Every scoop that lands *pours* its
     colour out from the stack, and every splat swirls the field where it landed.
   - **Native to the site.** It uses the site's own CSS, tokens and components: header stickers, `.brand`, the
     language pill, chips and tickets. It also gets the same loader and drip page transitions, because `enhance.js`
     and the inline loader blocks are included, and the language switch gets the same View Transition scoop.
     Hebrew/English follows `cassata-language`, and RTL is mirrored.
   - **Accessibility.** Keyboard order is skip, brand, back, language, stage (arrows), chips, reset. There is a
     polite live region ("Pistachio is on." / "Oops! Mango hit the counter."), and all tap targets are at least 44px.
     Haptics: an 8ms tick on landing and 25ms on a splat (Android).
3. **The way in.** On the home page only, a cream sticker pill with a tiny wobbling two-scoop cone,
   "בנו גביע / Stack a cone", is added outside the app root by `enhance.js`. It appears once the hero has scrolled
   away, and hides over the flavour sheet and the footer. It is a real link, so it gets the drip pour to `/play/`.
   Every `/play/` link back ("← Back to the menu", the brand) pours back.

### Removed / changed from earlier rounds
- The hero's flat cross-fade on every flavour change was replaced by the pour. It is still the app's own transition
  when the field is not running.
- Nothing else competed: the cursor became the ribbon's spoon tip, and the drips, seals and ticker stay as they were.
  `/host` is untouched: no field, no chip, no new motion.
- `enhance.js`: the language View Transition now **holds the field still** (`__ydxField.hold`) while the page is
  snapshotted. With a canvas still drawing, the capture stalled badly on software GL (25s in one run).

### Fallbacks and safety
- **No WebGL, or a software rasteriser** (`failIfMajorPerformanceCaveat`, plus a renderer check for
  SwiftShader/llvmpipe/"software", since headless Chromium hands out SwiftShader without flagging it): no canvas, and
  the original flat field with its CSS transition. `/play/` keeps its CSS `--field` background, which follows the top
  scoop.
- **A GPU that can't keep up:** adaptive quality drops the render scale ×0.75 down to 0.35. Three or more frames in a
  row under 10fps (more than 2s in total) give the page back its CSS field for good (state `slow`). Tested: released
  after 5–12s on SwiftShader with the test override that skips the renderer check.
- **Reduced motion:** the field is still drawn, but as static frames (redrawn on each flavour change, no pour, ribbon
  or ghost). On `/play/` scoops appear without dropping, the stack never sways or falls, and the builder still works.
- **Other cases:**
  - No JS: the home page is the original site; `/play/` shows a `<noscript>` invitation back to the menu, and its
    stage and panel are hidden.
  - Context loss and restore are handled.
  - Hidden tab or offscreen hero: paused.
  - bfcache is handled.
  - Hub iframe: render scale 0.5 at DPR 1.
  - `field.js` missing: the original site.
- **CSP:** external files only, no eval, inline style only through CSSOM.

### Performance (headless, SwiftShader: GPU cost not representative, so JS cost was measured)
- **Render size:** DPR cap 1.5 on desktop and 1.25 on phones, render scale 0.85 on desktop and 0.7 on phones.
- **Shader cost per pixel:** 3 two-octave fbm (6 simplex) plus a 31-segment ribbon loop. `field.js` is 8.8KB gzip and
  `play.js` 9.0KB gzip.
- **JS per frame, field running vs paused.** These were measured with a 16×16 render target, so the numbers include
  GL-call overhead but no rasterisation:

  | Viewport | CPU | Field running | Paused |
  | --- | --- | --- | --- |
  | Phone | 1× | 0.35–0.47ms | 0.07ms |
  | Phone | 4× | 1.0–1.5ms | 0.2–0.3ms |
  | Desktop | 1× | 1.5–1.9ms | 0.1ms |

  A CPU profile shows that most of the desktop number is native time blocked on SwiftShader. `field.js`'s own
  functions are a small share.
- **Scroll at 4× CPU** (the production path here, where software GL is refused, against `field.js` blocked):
  p50 16.7ms both ways, p95 233 vs 133ms. The machine was shared, at load ~35 during the first runs. The field is
  paused as soon as the hero leaves the viewport.

### Regression (round-3/4 suite copied to `scratchpad/cassata-menu-r5/suite/`, live CSP, stubbed `/api/menu`)
Final run on the round-5 files (`r5-final.txt`):

| Script | Result |
| --- | --- |
| `bugs.mjs` | 12/12 PASS |
| `matrix.mjs` | 27/27 PASS (base, no-JS, 404s, 8s delays, API down, reduced motion, English, iframe, background tab, frozen; `/` and `/host/`) |
| `regress2.mjs` | desktop + mobile ok: language scoop by mouse and keyboard, sheet + ghost exit + focus return, pour to `/host` and back, bfcache |
| `order.mjs` | app hydration and FCP not delayed by slow `enhance.js` or `enhance.css` |
| `cssdelay.mjs` | ok |

`regress2.mjs` runs the same checks as `regress.mjs`, with longer waits and screenshot timeouts tolerated. At load ~35,
the original's 900ms language check and its screenshots timed out on both the old and the new files.

**`GL=1`: software WebGL forced on, the worst case, which production refuses.**
- `regress2` passes on desktop and mobile.
- `bugs` fails 3 timing probes (`js404time` at 3.3s, `lateJs`, `clickDuringLift`). SwiftShader frames take 2–5s each
  and starve the main thread. With the real renderer check active, the field never runs on such a machine.
- `lateJs` and `clickDuringLift` were already intermittent under load in round 4.

**Checked separately:**
- **Fallbacks:** reduced motion (static field frames; `/play/` builder without physics), no WebGL (original flat
  field), no JS (original site; `/play/` noscript note), and API down on `/play/` (all 18 flavours plus the note).
- **`/play/` layout:** no horizontal overflow and no tap target under 40px at 360, 390, 768, 1280, 1440, 1920 and
  844×390, in Hebrew and English. RTL/LTR mirroring is correct, and the keyboard flow is complete.
- **`shoot.mjs` walk** of `/`, `/host/` and `/play/` (desktop and mobile): no console errors. The only warning is the
  app's own `/host` preload notice.
- **Software-GL bail-out:** the page gets its CSS field back after 5–12s (`bail.mjs`).

### Files
- **New:**
  - `ydx/field.js`: the field engine and the hero binding.
  - `play/index.html`: the lab, with the same inline loader blocks plus `enhance.css`/`enhance.js`.
  - `ydx/play.js` and `ydx/play.css`.
- **Edited:**
  - `index.html`: one `<script src="/ydx/field.js" defer>`, marked `ydx r5`.
  - `ydx/enhance.js`: the lab chip, and the field hold during the language View Transition.
  - `ydx/enhance.css`: the field canvas, `html.ydx-gl`, the chip.
- **Untouched:** `host/index.html` and the bundles.

### Known, not changed
- **GPU cost on real phones** could not be measured here (SwiftShader only). The adaptive scale and the bail-out are
  the guard.
- **Hidden render cost:** the field still renders the part of the hero under the coupe photo. A scissor would save a
  little but would complicate the pour edge.
- **`/play/` in landscape on phones** (844×390): the stage starts below the fold under the title. It is reachable by
  scrolling, and the page is a portrait-first toy.
