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
