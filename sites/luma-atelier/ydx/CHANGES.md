# AlexStudio (luma-atelier): design and motion pass

## The site as found

- **Structure:** a vinext (React 19 RSC) app. All 15 routes are prerendered (`/`, `/services/` plus 7 service pages,
  `/prints/`, `/work/`, `/contact/`, `/credits/`, `/equipment/`, `/about/`) and hydrated with `hydrateRoot(document)`,
  so React owns `<html>`, `<head>` and `<body>`. Three languages (EN / עברית RTL / РУ) are switched on the client
  (`.language-picker`, stored in `localStorage["alexstudio-language"]`; `html[lang|dir]` is set by an effect).
- **Art direction:** a darkroom and framing workshop. Olive-black grounds (#14180f / #171b12), paper creams
  (#eee8d8 / #d8d2bc), proof gold (#b8a67d / #8d805f), Optical (Anton) display caps with Atelier Sans text, numbered
  indexes ("01 / 04"), crop corners, "+" register marks.
- **Existing motion (left in place):** `StudioArrival` loader (a proof whose wordmark develops with an `--exposure`
  bar), `RouteTransition` (two-panel cream/olive shutter with the destination name), Lenis smooth scroll, GSAP
  ScrollTrigger scenes on home and service pages, LightRoomHero film + pointer light, word reveals, loupe, frame
  builder, work archive, editorial reveals. All of it is respected by the reduced-motion rules the site already ships.
- **Hosting note:** on the live worker, navigation is client side. Served as static files (this mirror, and any static
  deploy of it), the RSC fetch answers with a non-RSC content type, so the router falls back to a full page load: every
  click played the shutter **and then the whole arrival loader again**. The layer below handles both cases.

## What was added (`/ydx/enhance.css`, `/ydx/enhance.js`, a small inline bootstrap in every page)

1. **Loader: light meter + aperture.** The site's own arrival is kept and extended rather than replaced:
   - A light-meter dial (f/2.8 to f/22) is centred between the developing wordmark and the exposure bar. Its needle
     reads the arrival's live `--exposure` value through a damped spring, trembles slightly while metering and lands
     on f/8 ("correct exposure") when the page is ready; the readout switches to `f/8 · 1/125`.
   - The exit is a seven-blade aperture instead of the flat wipe: the arrival is clipped by a rotating heptagonal hole
     (`clip-path: path(evenodd, …)`), with translucent blade facets and a gold hairline on the opening.
   - Timing: first visit at least 1.1s (the arrival keeps its own readiness: fonts + hero film), safety at 4s. Repeat
     visit in the session: the proof content is hidden, a closed lens is drawn and opens as soon as React answers
     (about 0.9–1.1s to fully open). Hub iframe: ≤ ~650ms. Reduced motion: no iris, a 350ms fade.
   - Once React marks the arrival complete it is `inert`, so clicks would fall through to the hidden page while we
     still hold it; a transparent shield catches them and opens the aperture immediately (also on Enter/Esc/Space).
   - On short landscape screens there is no room for the dial, so it is not shown.
2. **Route continuation (hard navigations).** When the site's shutter starts, its labels are recorded in
   `sessionStorage`; the next document paints the same closed shutter first (inline script, `<ydx-veil>` reusing
   the site's own `.route-shutter` classes), keeps it closed while React hydrates and the locale/RTL switch lands,
   then opens it with the site's own reveal easing. Result: one continuous shutter instead of shutter + loader.
   On SPA navigation (live worker) the record is discarded and the site's shutter works as before.
3. **Shutter polish (CSS only):** the shutter labels develop like a print (clip reveal, RTL-aware), and a warm light
   sweep crosses both panels.
4. **Language switch:** an opaque aperture closes (300ms), the language changes behind it, and it opens (460ms). This
   hides the text swap and the LTR/RTL mirror flip. Skipped under reduced motion.
5. **Autofocus brackets (fine pointers only):** four corner brackets follow the pointer and lock onto links/buttons
   like an AF point (with a small "confirm" pulse on press). `mix-blend-mode: difference` keeps them visible on both
   paper and olive sections. Muted over the loader, loupes and drag scenes. Native cursor unchanged.
6. **Mobile menu:** numbered like the site's service indexes (01–08, proof gold), staggered rise on open, current page
   marked (gold + dot + `aria-current="page"`), background aligned to the site's olive-black.
7. **Footer wordmark** develops left to right the first time it scrolls into view (echo of the arrival proof).
8. **Credits** contact prints develop (grey and underexposed to full tone) as they scroll in, staggered by column.
9. Brand-coloured `::selection`.

## Bugs fixed

| Page / viewport | Bug | Fix |
| --- | --- | --- |
| All pages, static hosting | Every internal click replayed the full arrival loader after the shutter | Route continuation (2) + short repeat loader |
| `/about/`, every width, all languages | The opaque paper nav (80–100px, absolutely positioned) covered the top of the "MEET ALEX." / "АЛЕКС." / "אלכס." poster heading; on phones the glyph tops were visibly cut | Nav made transparent on this page (its colour was the page colour); poster pushed down 24px on ≤700px |
| `/credits/`, RU, phones (360–390) | "ВООБРАЖАЕМЫЙ" ran ~120px past the screen edge and was cropped | `font-size: min(64px, 11.4vw)` for that heading |
| Loader, phones in landscape (≤500px tall) | Proof frame, "+" mark, bottom corners and exposure bar overlapped | Shorter proof, smaller wordmark, mark hidden, bar lowered |
| Header, touch | Language buttons only 38px tall | Hit area extended to 44px (pseudo-element, no layout change) |
| Hero footnote, touch | "Illustrative studio film" / "Contact Alex" links 16px tall | Hit area extended |
| Footer, phones | Footer nav links 36px tall | `min-height: 44px` |
| Mobile menu | Neutral #151513 panel against the olive palette; no current-page indicator | See (6) |

## Integration details

- Inline bootstrap at the end of `<head>` (marked `<!-- ydx … -->`): critical CSS, a script that sets `html` classes
  (`ydx-js`, `ydx-hold`, `ydx-quick`, `ydx-frame`, `ydx-rm`, `ydx-cont`), a preload for the Optical font, and the two
  file links. A second inline script at the top of `<body>` paints the continuation veil only when needed. A 3s
  fallback in the bootstrap removes the hold classes and veil if `enhance.js` never runs.
- Nothing is inserted into React's tree: overlays are custom elements (`ydx-meter`, `ydx-iris`, `ydx-veil`, `ydx-af`,
  `ydx-shield`) appended to `<body>`; React 19 skips them during hydration (verified: `main`/`.site-nav` keep their
  server nodes, no hydration warnings). App nodes only receive `data-ydx-*` / `aria-current` attributes.
- `window.__ydxMarks` holds loader timings (ms since navigation start) for QA.
- No minified bundle was edited.

## Left alone, on purpose

- The site's own scroll scenes, reveals, hero film, loupe, frame builder and work archive: already rich and tuned;
  adding motion there would double-animate.
- The `.rsc` content type of static hosting (a server setting, not something to patch from the page).
- `[vinext] RSC prefetch setup error` console errors appear only when a page is embedded in an `about:blank` iframe;
  they happen identically with the original HTML.
- Number counters for "30+": the text is React-owned; rewriting it would fight React's text nodes.
- Carousels with items off-screen (prints, work, artwork) are intentional and not overflow.

## Round 2 (fresh-eyes review + second loop)

### What was audited

- Loader, repeat-visit lens, hub-iframe version, route shutter (hard navigation, as served here) and client-side
  navigation (live worker behaviour, reproduced by answering the router's `/<route>.rsc?_rsc=…` requests with the RSC
  payload and `text/x-component`; that content type is what this static mirror gets wrong), language switch, mobile
  menu open/close. Recorded as frame sequences (CDP screencast + in-page per-frame logs, since screencast frames in
  this container drop and stall under the WebGL hero), plus 0.2x slow-motion captures of the hand-offs.
- Slow network + CPU (400 kbps, 400 ms RTT, 4x CPU): first paint, loader timeline, long tasks.
- CLS with the layer vs. with `/ydx/*` routed to 404 (9 routes, load + full scroll): both ≈ 0 (max 0.013, font swaps
  under the loader); no regression. Long tasks comparable.
- Keyboard-only run through home (focus ring visible on all 36 stops; no trap), Tab during the loader, Escape on the
  menu, reduced motion (fades only, no iris/AF/veil elements created).
- Layout sweep: 15 routes x EN/HE/RU x 360, 390, 768, 844x390 (landscape), 1024, 1280, 1440, 1920 (360 combinations)
  checked for horizontal scroll, text pushed off-screen, clipped headings and console errors: none found outside the
  intentional carousels (folio, work stage, surface orbit, contact prints). Visual review of 360/1024/1920/landscape
  sheets in all three languages.

### Found and fixed

| Where | Finding | Fix |
| --- | --- | --- |
| Route shutter labels (pass 1 CSS) | The "develop" clip ended exactly at the label box, so the overhanging last glyph stayed cut for the whole time the shutter was closed ("ALEXSTUDI", "PRINTS & FRAME") | End state clips past both edges (LTR + RTL keyframes); slightly crisper easing |
| Loader, first visit | After the page was ready the proof sat static for 0.7–1.4 s waiting for a soft needle spring (up to 700 + 140 ms), and the aperture curve hesitated most of its run before opening | Stiffer needle (lands in ~250 ms), wait for it capped at ~510 ms, iris 860 → 800 ms with `cubic-bezier(.5,0,.1,1)`. Ready → open is now ~0.4 s |
| Loader, slow network | Minimum/safety times were measured from navigation start. With first paint at ~31 s (uncompressed mirror on slow 3G) the safety had long expired, so the proof flashed and opened at exposure 0.08 | Times now count from first contentful paint: min = max(1.1 s, FCP + 0.75 s), safety = max(4 s, FCP + 3.2 s) (repeat: FCP + 0.9 s). Verified: visible ≈ 3.7 s then opens |
| Loader, very slow `enhance.js` | If the inline 3 s fallback had already released the site's own arrival, a late `enhance.js` re-added `ydx-hold` and pulled the finished arrival back over the page | Fallback sets `window.__ydxGaveUp`; `runLoader` leaves the native arrival alone then (one-line change in the inline bootstrap of all 15 pages) |
| Loader, keyboard | Tab while the proof was held moved focus to invisible page links behind it | Tab (like Enter/Esc/Space) opens the aperture immediately; focus lands on the skip link |
| Client-side navigation (live) | The record used to continue the shutter after a hard load was never cleared on SPA navigations (the router does not call the patched `history.pushState`), leaving a stale record in sessionStorage | After a recorded click, the layer watches for the new page's heading in this document and drops the record |
| Hard navigation hand-off | Pictures in the first screen popped in right after the shutter opened | The veil waits up to 650 ms for in-view images to decode |
| Credits contact prints (pass 1) | 1.4 s develop from 15 % opacity: fast scrollers saw murky thumbnails | 0.6 s / 1 s from 30 % opacity and a softer grey; caption delay 0.3 → 0.15 s |
| Language switch (pass 1) | 300 + 460 ms full blackout felt heavy for a toggle | 250 + 400 ms |

### Added (second loop)

1. **First-screen hand-off.** Every page's hero heading is static once mounted, and on a first load or hard
   navigation it mounted behind the loader, so the page simply "was there" when the aperture/shutter opened. Now, as
   the opening clears (iris at 12 %, veil +170 ms, live SPA shutter +140 ms), the hero `h1` rises into its line using
   the site's own `optical-type-in` motion (clip from below + 25 px), line by line when the heading is built from block
   spans (`<span>`/`<em>`), and the copy in the same block follows with the site's `atelier-arrive` (fade + 18 px),
   staggered. WAAPI with `fill: backwards` on `clip-path`/`translate`/`opacity` only: nothing persists on React nodes,
   no CLS, skipped under reduced motion. Works in all three languages (whole words/lines, never split letters).
2. **Mobile menu as a blind.** The panel now comes down with a clip wipe (0.5 s, the arrival's curve) while the
   numbered items stagger in, and retracts upward on close (0.38 s) with the items lifting out first, instead of a
   180 ms cross-fade that left menu type muddled over the hero type. The dim overlay is timed to match. Radix waits
   for the content's `animationend`, so focus return and unmount still work (Escape verified).

### Kept / deliberately not changed

- The aperture loader, light meter, AF brackets, shutter light sweep and footer wordmark develop were judged on-brand
  and kept (only retimed as above).
- The home hero's WebGL/video start causes long frames in this container (software GL); it is the site's own scene
  and does not reproduce as a ydx cost on the lighter pages (iris runs at the display rate there).
- Carousels flagged by the overflow sweep are intentional.

### Risk notes

- The hand-off finds the first in-view `main h1`; a page without one simply gets no hand-off.
- Client-side navigation was verified with the RSC payload served correctly (as on the live worker); the hard-load
  path was verified as served here. No minified bundle was edited.

## Round 3 (code review + production hardening)

Every line of `enhance.js`, `enhance.css` and the two inline `ydx` blocks was reviewed. Each suspected bug got a
Playwright repro first (scripts in the round-3 scratch dir: `bugs.mjs`, `prod.mjs`, `flow.mjs`, `hyd.mjs`,
`iframe.mjs`, `freeze.mjs`, `bf2.mjs`, `nojs.mjs`), then the same test was run again after the fix.

### Bugs found and fixed

| # | Bug | Repro | Fix |
| --- | --- | --- | --- |
| 1 | A slow or hung `enhance.css` held back the whole site: it was a render- and script-blocking stylesheet, so first paint **and** hydration waited for it (FCP 8.2s with the file delayed 8s) | `hyd.mjs cssDelay8` | Loaded non-blocking (`rel=preload as=style` swapped to `stylesheet` on load, `<noscript>` link for no-JS). FCP/hydration now ~0.3s whatever the file does. enhance.js waits up to 1.5s for the `--ydx-css` marker |
| 2 | `enhance.js` was `defer`: a slow file held `DOMContentLoaded` and `load` back 8s (the app itself boots from an inline `import()` and was not delayed) | `hyd.mjs jsDelay8` | `async` (boot already waits for `DOMContentLoaded` when needed) |
| 3 | `enhance.js` 404: the bootstrap only gave up after its 3s timer, so repeat visits showed a blank olive panel for 3s | `bugs.mjs js404`: 3.1s, now 0.27s | `onerror` on the script tag calls the bootstrap's give-up at once (`window.__ydxGiveUp`) |
| 4 | `enhance.css` 404: the iris SVG, light meter, click shield and AF brackets were appended unstyled into the page flow (page grew by ~900px during the loader) | `bugs.mjs css404` | `:root{--ydx-css:1}` marker; without it the layer hands the arrival back to the site and creates no overlays (the shutter continuation still runs, it only needs the inline CSS) |
| 5 | A throw inside a rAF callback (tween) left its promise pending forever, so the loader's catch never ran: arrival stayed half-clipped, iris over the page, `ydx-iris-run` stuck | `bugs.mjs throwIris` (fault injected in `draw`) | `tween` catches and rejects; a single `release()` restores everything |
| 6 | A throw between creating the click shield and removing it left the transparent full-screen shield (z 10002) up: every click swallowed forever | `bugs.mjs throwShield` | `release()` removes shield, keydown listener, nudge interval, meter loop, veil, iris, all hold classes, and hides the arrival. Plus a last-resort watchdog (safety + 4s; 9s for the continuation) |
| 7 | Language switch: a throw mid-blink left the opaque plate (z 10003) over the page and the buttons dead (`busy` never reset) | `bugs.mjs throwLang` | `try/finally`; the language still changes if the blink fails |
| 8 | App bundle never/late arriving: after the iris opened an arrival React had not completed, the site's 1s `visibility` transition brought the whole proof back for a second | `bugs.mjs noApp` | `transition:none` on `html.ydx-arrival-off .studio-arrival` (inline CSS + enhance.css) |
| 9 | Background tab / offscreen iframe: rAF never fires, so the loader stayed held until the tab was focused, then replayed | `bugs.mjs noRaf` (rAF stubbed) | `frames()` and `tween()` also finish on timers; the continuation's WAAPI wait is capped |
| 10 | Running `enhance.js` twice (re-injected) doubled every listener, the AF cursor and the `history` patch | `bugs.mjs twice` | `window.__ydxEnhance` guard |
| 11 | Hub iframe: after a hard navigation inside the frame `ydx-quick` stayed on `<html>` | `iframe.mjs` | removed at the end of the continuation |

Smaller hardening: features start independently (`safe()`), so one failing cannot stop the loader; the meter loop
stops if its node is gone; `arrive()` can never throw into the loader; wheel on the held proof opens it like a click;
the light-meter readout is `direction:ltr` in Hebrew; the footer "develop" (transparent text + background-clip) is
skipped in forced-colors mode.

### Checked, not bugs

- Double click / second link during the shutter: the site's shutter covers the page with `pointer-events:auto`, so a
  second navigation or a wrong continuation record cannot happen (`bugs.mjs doubleRoute`).
- Back-forward cache (needs a real headed browser; Playwright disables bfcache by default, and the preview server
  sends `no-store`; tested with a header-free static server, headed under Xvfb): the restored page is clean, no closed
  shutter, links work.
- Back pressed 120ms into a transition: hard path loads the previous page normally (record discarded); in-place path
  ends on the clicked route because the site's own shutter pushes after its cover animation (site behaviour, same
  without ydx).
- Keyboard activation of links (`detail 0`) skips both the site's shutter and the record, as intended.
- Live headers (`curl -sI`): no CSP, X-Frame-Options or cache-control on documents, so nothing in ydx (inline
  scripts/handlers, preload swap) is blocked. Tests were run with those document headers applied.
- Feature support: `clip-path: path(evenodd)` is checked with `CSS.supports` (fade otherwise); `:has()` rules only
  carry the about-nav fix and the menu overlay timing (degrade to the site's original look); WAAPI `translate`
  keyframes are ignored where unsupported; all storage access is wrapped.

### Production matrix (all end visible and usable, no new console errors)

Normal first visit (open ~1.2s, done ~2.0s), repeat (~1.0s), reduced motion (fade), JS disabled (arrival hidden by the
site's noscript rule; enhance.css via noscript), enhance.js 404 / enhance.css 404 / both, enhance.js delayed 8s
(bootstrap gives up at 3s, site's own arrival), enhance.css delayed 8s (site paints and hydrates at once; layer gives
up its overlays after 1.5s), app bundle delayed 8s (iris opens at the 4s safety), app bundle 404, rAF stopped, page
frozen and resumed, hub iframe (cross-origin, done in ~0.6s, navigation inside works), and end-to-end flows on both
the hard-navigation path (this mirror) and the in-place RSC path (live), desktop + iPhone 13: route change, Hebrew/
English switch, keyboard navigation, back mid-transition. Zero console errors in all normal flows.

### Remaining known limitations

- When `enhance.css` fails, Chrome logs a "preloaded but not used" warning (only in that failure case).
- If `enhance.js` is very slow (>3s) the site's own arrival is used for that page, without the iris.
- A real background tab could not be produced in headless Chromium; it was emulated (rAF stubbed, lifecycle freeze).
- Safari/Firefox behaviour was reasoned from the code (only Chromium is available here).

## Round 4 (creative-director pass)

### What was judged

Walked all 15 routes scroll by scroll at 1440 and iPhone 13 (EN everywhere; HE and RU on the routes whose layout
changes), plus the frame sequences of the hand-offs. The first screens are strong (hero film, poster, folio, the
loader and shutter from earlier rounds). Below the first screen, two things still read flat:

1. **Hard cuts between paper and darkroom.** The site alternates olive-black and paper sections, and every switch was a
   plain horizontal edge: home folio to "What do you have in mind?", events/restoration hero to their paper editorial,
   the work archive to "Browse by service", and the olive "On land. In the air. At sea." band inside the paper About
   page.
2. **Static section headings.** The site's own type moves only at mount time (hero h1s, page intros) or inside its
   GSAP scenes; every display h2 further down (home brief, "Photography. Prints & products.", "Try a frame.", the
   closing "Let's discuss your project.", service capability/studies titles, the services directory cards, "Browse by
   service.", About's craft heading) was simply there when scrolled to, so the bottom half of most pages had no motion
   moment at all.
3. **Motion vocabulary.** ydx used nine different cubic-beziers; the site itself mostly uses three.

### Changed

| What | How |
| --- | --- |
| Paper laid on the darkroom table (`enhance.css`) | `.project-brief`, `.event-editorial`, `.restoration-editorial`, `.work-index`, `.biography-field` enter inset 5% at the sides and widen to full bleed as they scroll in. CSS scroll-driven animation (`animation-timeline: view()`, range `entry 0%`-`entry 75%`), so it is scrubbed and reversible like the site's own poster entry, costs no JS and is ignored where unsupported. `fill: backwards` only: once the section is in, nothing is clipped. Under `prefers-reduced-motion: no-preference` only. |
| Section headings rise (`enhance.js` `riseScan`, `enhance.css`) | `main h2`s that start below the first screen and that the site does not animate (own animation, GSAP inline transform, `data-reveal`, folio, poster, workbench, archive, dialogs) get `data-ydx-rise`; an IntersectionObserver plays the site's optical-type-in (clip from below + 26px, 0.9s, its own curve) once, then the clip is dropped (`data-ydx-done`). Whole element, so Hebrew/Russian are never split. Never hides something already on screen (position check), re-checked after in-place navigation once the router has reset the scroll, revealed on `beforeprint`, skipped with reduced motion, no enhance.css, no IO or no WAAPI. 1-7 headings per route. |
| Motion tokens | `--ydx-out` (.16,1,.3,1), `--ydx-soft` (.2,.8,.2,1), `--ydx-inout` (.65,0,.15,1), `--ydx-in` (.7,0,.84,0), all taken from the site's own CSS. Every ydx CSS curve now uses them (shutter label develop, light sweep, menu blind and items, meter, AF pulse, footer develop, credits). The loader's aperture keeps its own tuned curve. |

### Removed / kept

Nothing removed: re-judged the light meter, aperture, shutter develop + sweep, language iris, AF brackets, menu blind,
footer and credits develop; each is in the site's darkroom/camera language and none overlaps another. Hover and focus
states were re-checked on the walk (round 2's keyboard pass still holds); nothing new to fix. A "missing" brief photo
seen in one desktop walk shot was a decode-timing artefact of the loaded container (image loaded and painted in
repeated probes), not a site bug.

### Regression (round-3 suite, copied to `scratchpad/luma-atelier-r4/reg/`, `runall.sh after`)

- `bugs.mjs` B1-B10: all PASS. `prod.mjs`: all 13 scenarios end usable (normal, repeat, no-JS, js/css/both 404,
  js/css/app delayed 8s, rm, repeats), console output identical to round 3 (404s and the preload warning only in the
  failure scenarios). `flow.mjs`: all 24 steps OK on hard and in-place (RSC as `text/x-component`) paths, desktop and
  iPhone 13, EN/HE, zero errors. `hyd.mjs`: FCP/hydration unaffected. `iframe.mjs`: done at ~590ms, navigation works.
  `freeze.mjs`: clean. `nojs.mjs`: unchanged. `bf2.mjs` (headless): same result as round 3 (bfcache needs headed).
- New: `marked.mjs` (every route, desktop EN, mobile HE, desktop RU: every marked heading ends revealed with no clip
  or offset, zero console errors), `sparise.mjs` (in-place navigation: no hidden heading in view, all end revealed),
  frame recordings of the laydown (home, work, About in HE). `shoot.mjs` desktop + mobile on home, about, work,
  events: 0 log lines.
- Live headers re-checked (`curl -sI`): still no CSP / X-Frame-Options / cache-control; `.rsc` served as
  `text/x-component`.
