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
