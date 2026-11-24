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
