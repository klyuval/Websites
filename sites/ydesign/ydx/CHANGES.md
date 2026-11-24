# ydesign (the hub): design + motion pass

## The site

One long page per language: `/` (English) and `/he/` (Hebrew, RTL, the main one). `he/index.html` is generated from
`index.html` by the studio's own script (scripts/make-he.py), so both files got identical ydx insertions. The page is
static HTML with a Vite bundle (`assets/main-*.js`, which includes GSAP, ScrollTrigger, SplitText and Lenis) and
one CSS file.

- **Art direction:** a loud poster style. Flat colour fields (orange/red `--field`, cream `--on`, yellow `--pop`, ink
  `#17130f`, paper `#f6f1e7`), condensed Archivo display type (Rubik in Hebrew), a handwritten face for notes, hard
  offset shadows, 22px radii and starbursts. The studio's motif is the designer's cursor and a live site being built.
- **Existing motion (left alone):** the cursor loader that builds the first screen (src/loader.ts), plus a deck loader
  for deep links. The hero's rotating live preview recolours the whole field. Two tapes speed up with scroll. The work
  wall can be dragged, has a tilt and a cursor tag, and dives into a tile to open the case dialog on desktop. On
  phones a card flies into the dialog, and from the index the dialog clips open from the row. Next and previous slide
  between sites. The process bench is pinned and builds the visitor's site. Then come the arc carousel, the SplitText
  heading reveals, the studio "why" cards, magnetic buttons, the footer wordmark weight wave and the contact glow.

## Added / changed

All in `ydx/enhance.css`, `ydx/enhance.js` and an inline `<style data-ydx>` in both HTML heads. No bundle edits.

1. **Loader (polished, not replaced)**
   - While the bundle is still arriving, the designer's cursor idles with a small multiplayer-cursor drift
     (inline `<style data-ydx>`). Before, it sat frozen on a flat yellow screen for 0.5 to 1.5s. The loader's own
     `animation:none` takes over when the build starts.
   - Repeat visits in the same tab session (a reload, the language switch) and framed previews now get the speed-up
     the loader already applies on the first key, pointer or wheel event: the build plays at 3x. enhance.js sends
     that cue once the `loader-start` mark appears. First visits keep the full show. Reduced motion is unchanged.
2. **Case dialog**
   - Closing now mirrors the opening (desktop wall dive): the info panel slides back out, the paper fades and the
     shot dissolves into its tile (260 to 370ms), then the site's own dive pulls the wall back. It used to cut
     straight from the dialog to the zoomed wall. After next/previous, the tile shows the current site's thumbnail
     during the dissolve, just as the site itself does once it takes over. Works for the Close button and Escape. The
     phone "lift" and the index clip-open already animate, so they are untouched.
   - A thin orange loading line runs along the top of the shot while the live site loads. It goes away once the
     iframe is live and never shows for sites that only open in their own tab.
3. **Reveal choreography** for the parts the GSAP pass leaves static. The rule after each section kicker draws out
   from the number as the heading rises (mirrored in RTL). The 12-site index rows rise in one after another, and so
   do the "what happens next" steps. Everything is gated by `html.ydx-js` and reduced motion.

## Bugs fixed

| Where | Bug | Fix |
| --- | --- | --- |
| Case dialog, desktop, both langs | One-word names broke mid-word ("ALEXSTUDI / O") because of `overflow-wrap:anywhere` at 6.4vw | enhance.js fits the size to the widest word (a `<style data-ydx>` rule, since the site's open animation clears inline styles) |
| Case dialog, keyboard | The open animation hides the panel for a moment, so focus fell to `<body>` and keyboard users had no focus inside the dialog | Focus goes back to Close once the dialog has opened |
| Case dialog + business-type radios, Hebrew | ArrowRight meant "next" although "next" sits on the left with a left arrow in RTL | Arrow keys are swapped on the RTL page |
| Process + hero + contact preview | Scrolling past step 4 in one jump (nav link, fling) left the demo in the other language, so the Hebrew page showed an English preview in the hero and contact (and vice versa) | The page language comes back once the process section is out of view, unless the visitor picked one |
| Process, Hebrew | The language switch showed "English" pressed over a Hebrew preview (the generated page kept English's `aria-pressed`) | Starts pressed on the page's language |
| Contact form, keyboard | The form waits invisible (GSAP autoAlpha) until scrolled into view, so Tab skipped all four fields and the submit button | After the first Tab the form is just visible |
| Nav, keyboard | The bar hides on the way down and stayed hidden while Tab walked through its links | `.nav.is-away:focus-within` shows it |
| Touch devices | Sticky `:hover`: case arrows, buttons and index rows stayed inverted after a tap | Hover look reset under `@media (hover:none)` |
| Phones | Tap targets: language switch 28px, footer links 23px, text links 38px | Invisible 44px+ hit areas on coarse pointers, no layout change |
| Index, English at 360px | "ALEXSTUDIO" cut to "ALEXSTU…" | On narrow phones the name keeps its width and the sector wraps |
| Arc carousel label, 360px | "בית קפה, הבחירה / שלכם" and "CAFÉ, YOUR PICK" left an orphan word | `text-wrap: balance` |
| Studio text, Hebrew | "ב־ydesign: Why, למה" rendered "ydesign: Why" as one LTR run, so "Why" sat next to "ב־" | A right-to-left mark after "ydesign" (runtime, so the generator does not drop it) |
| Nav, Hebrew at 360px | "מתחילים פרויקט" squeezed inside the bar button | Side padding trimmed at ≤380px |
| Process, phones | The steps cut hard under the pinned bench | A 22px paper fade under the bench |

## Left alone on purpose

- The loader itself, the dive/lift/clip open transitions, the hero preview cycle, the wall, the bench and the arc:
  they are the site's signature and already work. Additions only fill gaps around them.
- The ~1s finale after the cursor clicks "Start a project" runs on its own GSAP timeline inside the bundle and is not
  reachable from outside. Only the build part is sped up on repeat visits.
- The hero preview shows a blank coloured frame for about 300ms on each switch. That is the preview building itself
  in, not a bug.
- The live sites inside the case iframes are other projects; their own loaders show inside the frame.
- The `.sr` portrait description is a visually-hidden paragraph and is meant to overflow its 1px box.

## Round 3: code review, production hardening, second-reviewer audit

Line-by-line review of `enhance.js`, `enhance.css` and the inline `ydx` blocks. Production checks used Playwright with the
live response headers (`referrer-policy`, `x-content-type-options: nosniff`; the site sends no CSP), JS disabled, each
ydx file 404 or delayed 8s, the bundle 404, throwing or delayed 8s, `enhance.js` included twice, an emulated background
tab (`visibilityState` hidden, rAF paused, timers clamped to 1s, then shown), and the page inside an iframe. I also
recorded the loader, the dialog open/close (desktop dive and phone lift) and the process bench, and scanned HE and EN
for overflow at 360/390/768/1024/1280/1920. The test scripts are in the scratchpad `ydesign-r3/` folder (`t-*.cjs`).

### Bugs found and fixed

| Bug | How it was reproduced | Fix |
| --- | --- | --- |
| With JS disabled the yellow loading screen covered the page forever, with `overflow:hidden` on `<html>` | `javaScriptEnabled:false`: loader present, scrollY stuck at 0 | `<noscript>` in `<head>` hides `.loader`, restores scrolling and loads `enhance.css` |
| If the bundle 404s or throws before it boots, the loading screen never leaves (the site has no timeout of its own) | Bundle routed to a 404 or to `throw new Error()`: loader never left | Inline `<script data-ydx>` watchdog starts at DOMContentLoaded and counts only *visible* time. After 4s with no `loader-start` mark and no `is-ready` it lifts the screen: fade, `display:none` (the node stays, so a late bundle cannot throw) and `is-loading` is removed. Once the build has started, the ceiling is 20s. It is inline, so it works even when `enhance.js` is missing. A background tab never trips it (checked with the hidden-tab emulation: the loader waits, then finishes 1.4s after the tab is shown). |
| In a frame (the hub preview) the loader took about 2.3s, against the ≤800ms rule | Page in an iframe: 2.28s from `loader-start` until the loader was gone | When framed, the inline script adds `?noloader` (`history.replaceState`) before the bundle runs, so the site uses its own short no-build path: about 0.35 to 0.45s after DOMContentLoaded. It is skipped if the URL already has `loader`/`noloader`. |
| Escape pressed while the desktop dive was still opening (the first ~0.95s) left the zoomed wall (`.is-diving`, z-index 45) over the page after the dialog closed | `t-dlg.cjs escEarly`: Escape 250ms after the tile click left `diving:true` with a `scale(2.28)` transform. This happens **with or without ydx** (it is a bundle bug: its close takes the clip branch because the dive has not landed yet). | `softClose` waits for the landing (the site keeps the dialog `visibility:hidden` until then; capped at 90 frames), then closes the normal way. The dissolve now uses end-only keyframes, so it starts from whatever is on screen. Verified with Escape at 100/250/600/900/1100ms, double Escape, double click, Close then Escape, and next then Escape. |
| The ydx arrow-key swap (RTL dialog) also caught Alt/Ctrl/Meta+Arrow and called `preventDefault`, which blocked the browser's Alt+Arrow back/forward | Dispatched Alt+ArrowLeft in the open dialog: `defaultPrevented` was true | Modified keys are passed through untouched |
| `enhance.js` was `defer` and `enhance.css` blocked rendering, so a slow ydx file held up first paint/DOMContentLoaded (coordinator finding) | Delayed each file by 8s | `enhance.js` is now `async` and guarded against running twice (`window.__ydxEnhance`). Its DOM work waits for DOMContentLoaded itself (`ready()`), so it tolerates any order with the bundle. `enhance.css` loads non-blocking (`media="print" onload`, with a `<noscript>` fallback). With either file delayed 8s, first paint stays around 0.15 to 0.4s and the site's loader runs on time. |
| `softClose` could leave the dialog faded and unclosable if the site's close did not go through | Code review (no repro) | `done()` runs in `try/finally`, and a 2s backstop cancels the fade animations and resets the closing flag |

### Polish
- **Phone dialog close:** the site's lift close removed the live iframe at once and swapped it for the screenshot,
  usually a different crop, so the page jumped. Now the live site first crossfades into its screenshot (280ms, using
  the site's own `.is-live` opacity transitions), then the card lifts back to the wall.
- **Phone bench fade:** made taller (22 → 36px), so the last sliver of a big step numeral fades out under the pinned
  bench instead of showing as a hard fragment.
- **Comments:** updated to match the code. The `framed` hurry branch was removed (frames now take the `?noloader` path).

### Checked and fine
Live headers do not block anything in ydx. JS disabled, each file 404, both 404, each delayed 8s, the bundle delayed 8s,
`enhance.js` included twice and reduced motion (loader gone at 0.4s, or 2.8s with slow images) all end usable and
scrollable. No new console errors: only the headless GPU `GL Driver` warnings, which are present without ydx too. There
is no horizontal overflow at any width in either language (the big decorative "Y" in the studio section is clipped by
its section on purpose). Storage access is wrapped in try/catch. The MutationObservers never write to what they observe.
The only "patch" is the synthetic `keydown` that triggers the loader's own speed-up.

### Remaining known limitations
- 4a (process demo language): the only way to switch back is a click on the demo's own button, and the bundle also
  treats that as "the visitor picked". After such a restore, step 3 stops demonstrating the switch for the rest of the
  visit. Correct page language was judged more important.
- If the bundle stalls *after* the build started, the 20s lift uncovers the page, but Lenis (stopped by the site
  during loading) can keep swallowing wheel scrolling. Keyboard and the scrollbar still work. This only happens if
  the site's own timeline dies mid-way.
- In a frame the URL gains `?noloader=1`. The language switch carries it to the other language, which is the
  intended behaviour inside a frame.
- Without JS the page shows the site's own no-JS state (the app-rendered wall and index are empty, and the nav colours
  are unset). It is readable and scrollable, but it is not a designed fallback.
- Hidden tabs are emulated: headless Chromium always reports `visible`, so throttling was simulated with an init
  script.
