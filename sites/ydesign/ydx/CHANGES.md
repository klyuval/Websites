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
- If the bundle stalls *after* the build started, the 20s lift uncovers the page, but Lenis (stopped by the site
  during loading) can keep swallowing wheel scrolling. Keyboard and the scrollbar still work. This only happens if
  the site's own timeline dies mid-way.
- In a frame the URL gains `?noloader=1`. The language switch carries it to the other language, which is the
  intended behaviour inside a frame.
- Without JS the page shows the site's own no-JS state (the app-rendered wall and index are empty, and the nav colours
  are unset). It is readable and scrollable, but it is not a designed fallback.
- Hidden tabs are emulated: headless Chromium always reports `visible`, so throttling was simulated with an init
  script.

### Follow-up: process demo kept alive after a language restore
The round 1 fix for the wrong-language preview (4a) clicked the demo's own language button. The site treats any click
there as "the visitor picked" and stops its step 3 demo for good, so after a restore the demo never ran again. This
was a regression introduced by ydx. The site's flag is internal, and the button click is its only language switch, so
the flag cannot be reset. Instead, once ydx has had to restore, it runs the demo itself with the site's own rule:
1.9s after step 3 becomes active it switches to the other language, and it switches back on any other step. This is
keyed off the `data-step` attribute that the site sets on each step change. Until the first restore the site runs the
demo alone, so nothing is doubled. A real (trusted) click by the visitor still stops both, and reduced motion is left
alone. Verified with `t-lang3.cjs` in HE and EN, with and without ydx, on a fresh page per scenario:
- Normal pass through: unchanged.
- Step 3 switched, then a jump to #contact: the bug reproduces without ydx in both languages and is fixed with ydx.
  Coming back afterwards, step 3 switches again and step 4 switches back.
- Jump via the nav link while the switch is still pending: the bug reproduces without ydx in HE and is fixed with
  ydx. The demo works afterwards.
- The visitor picks a language: it sticks through step 4 and the jump.

## Round 4: creative-director pass

### What I judged
I walked both languages at 1440 and on an iPhone 13 (the shoot.mjs walk, plus targeted shots and a frame recording of a
wheel scroll). The hub already has a signature moment in every section: the cursor loader, the hero preview, the tapes,
the wall dive, the pinned bench, the arc, the "why" cards and the footer weight wave. Each round-1 to round-3 addition
still earns its place (the close dissolve, the loading line, the kicker rules, the index and "next" staggers, the fixes),
so nothing was removed. The motion language is already consistent: ydx reveals use the site's own `--ease`
(`cubic-bezier(.22,1,.36,1)`), and only the dialog's exit uses an ease-in curve, on purpose.

What still felt abrupt was the **hand-off between scenes**. The page changes colour three times with a hard horizontal
cut: the ink wall to the paper process, the paper to the orange studio, and the orange studio to the ink contact.
Only the studio had a rounded top (40px, 26px on phones), so the three hand-offs did not match.

### Changed
- **The next sheet lifts in** (`enhance.css` 2b, `enhance.js` 3b). The process, studio and contact sections now share
  the studio's rounded top. It is drawn as the previous scene's colour painted into the sheet's top corners: ink over
  the process, paper over the studio and orange over the contact. It uses a `::before` on each section, so the layout,
  the page height and the ScrollTriggers are untouched (the page height is the same before and after). While the
  sheet rises from the bottom of the screen, its corner radius eases from a wide arch (22vw, max 360px; 36vw on phones)
  to the resting 40px/26px. It settles once the sheet's top reaches the upper third, so the sheet flattens as it lifts.
  This takes one rAF per scroll frame, three rect reads and a style write only when the rounded radius changes. It is
  symmetrical, so it needs no RTL handling.
  The studio's own `border-radius` is set to 0 because the drawn corner replaces it. The old 40px clip left a faint
  orange anti-aliasing arc under the drawn corner.
- **Fallbacks:** with reduced motion, without JS (the `<noscript>` loads enhance.css) or with enhance.js missing, the
  corners rest at 40px/26px. That is still the consistent shape, just without the lift. If enhance.css is missing, the
  site looks as it did originally.

### Looked at and left alone
- A mobile shot of the index showed a band of empty rows. A per-frame opacity trace shows this is the index stagger
  caught mid-reveal (and a raster tile in headless). The rows are all at opacity 1 within about 1s.
- The contact's top corners are flat orange, while the studio above has faint conic rays. At this contrast it reads
  as one colour, so a textured match was not worth the complexity.
- No 404 page was added. The live worker returns an empty 404, and its assets config (`not_found_handling`) is not
  in this mirror, so a `404.html` might never be served.

### Regression results (round-3 suite, re-run after the change)
- `t-base` HE/EN: loader leaves and the page scrolls. No errors other than the headless `GL Driver` warnings.
- `t-prod`: live headers, js404, css404, both404, jsDelay8, cssDelay8, mainDelay8 and twice all end usable. For
  main404/mainThrows the inline watchdog lifts the screen (loader `display:none`), the same as in round 3.
- `t-rm`: reduced (0.98s), reduced+slowimg, main404 (ydx lift at 4.1s) and repeat all pass.
- `t-frame` (hub iframe): `?noloader` path, about 0.4s after DOMContentLoaded (first run 1.3s, with the machine at
  load average 24).
- `t-dlg`: all 10 close scenarios end closed, not diving, and with no animations left.
- `t-idx` 360/1024/1280/1920 and `t-alt`: pass.
- `t-lang3` HE: all four scenarios OK.
- `t-bg3` hidden tab: waits, then finishes 1.3s after it is shown.
- `t-ovf`: only the decorative studio "Y" (clipped on purpose, unchanged).
- `t-nl`: pass.
- `shoot.mjs` desktop + mobile, HE + EN: same page heights as before, no console errors beyond the GL warnings.
- A scrollY trace during a wheel scroll is monotonic with and without ydx.
- `t-bg2` needs a headed browser (no X server here). It was superseded by `t-bg3` in round 3.

## Round 5: immersive pass (living ink, the ink lab)

### Signature: the work as one fluid canvas (playbook techniques 3 + 19, 11, 22)
The hub showcases the other eleven, so its signature is the most literal one: **the studio's palette is a real
fluid**. Behind the two ink scenes (the work wall + index, and the contact) a GPU fluid simulation runs. This is
Stam's "stable fluids": semi-Lagrangian advection, vorticity confinement, a Jacobi pressure solve and gradient
subtraction, all on half-float ping-pong textures. It is written from scratch in raw WebGL in `ydx/fluid.js`
(about 6 KB gzip). References: Stam (1999), GPU Gems ch. 38, Dobryakov's WebGL fluid (MIT, used only as a reference
for the pass order), and Codrops' flowmap articles from the playbook.

- **Everything replies.** Moving the pointer pours ink, and the strokes carry the pointer's velocity. **Hovering a
  site on the wall, or a row in the index, pours in that site's own two key colours** (keyboard focus on an index row
  does the same). A tap drops ink. Scroll speed drags the ink along with the page (the advection gets a shift equal to
  the page's velocity relative to the sticky canvas), and a flick on a phone smears it. Typing the brief makes ink
  seep from behind the form card. Typing "ydesign" anywhere outside a field spills all twelve palettes.
- **It is alive when nobody is moving.** Two slow currents follow Lissajous paths and pour in the current "mood". The
  moods are analogous pairs of the bench's step colours (orange+yellow, pink+orange, blue+mint, mint+yellow) and turn
  every 12s. Mixing complementary inks turned the first version grey. The fix uses one colour per stroke and a
  hue-preserving tonemap: the strength is tonemapped and the hue is kept, so thick ink stays orange instead of
  washing out to white.
- **Look:** soft relief lighting from the dye gradient with a small wet glint, a 1/255 dither against banding, and a
  fade at the scene's top and bottom edges so the ink never cuts against the paper sections.
- **Layering without scroll syncing:** a holder `div.ydx-fluid` is the first child of `.work` and of `.contact`
  (absolute, `z-index:-1` inside the section's own `isolation`). The canvas inside it is `position: sticky; height:
  100vh`, so it scrolls natively with its section and sits above the flat ink and below all content. There is one
  WebGL context. The canvas moves (DOM move, the context survives) to whichever ink scene is on screen. The wall's
  `#0d0a08` ground becomes transparent while the ink runs, so the colours glow through the gaps between the tilted
  tiles. The shader paints the wall's darker tone itself, and during the dive the wall keeps its solid ground.
- **Contrast is guaranteed per pixel.** The display shader receives up to six feathered boxes measured from the DOM
  (cached relative to the section, re-measured every 600ms and on resize). It caps the WCAG relative luminance of the
  ink under each one: .2 under display headings, .06 under body copy, and .014 under the index, the "next" list and
  the lab invitation (their numbers are cream at 55% opacity). Outside the boxes the cap is .3. Four refinement steps
  account for the ground's own luminance. So the ink glows freely in empty space and between tiles, and only a hue
  shows under the copy, "flowing around" the text.

### Interactive experience: the ink lab (`/play/`, `/he/play/`, new standalone pages)
"Paint with the portfolio." Pick one of the twelve sites (a radio group of "paint pots" showing each site's swatches)
and drag across the dark. That site's palette pours out as fluid, and **wherever the ink is thick, the site itself
shows through it** (its 1280px screenshot, cover-fitted, bent and RGB-split by the flow velocity). Switching sites
turns what is already painted into the next site through a liquid sweep, whose edge is bent by the ink and which runs
in the reading direction. While nobody paints, **the designer's cursor from the hub's loading screen ("Yuval"/"יובל")
paints on its own**. It steps aside the moment you touch the canvas and comes back after 5s idle. There are Splash and
Clear buttons, a "Now pouring" card (name, sector in the page's language, a link to the live site) whose offset shadow
takes the site's colour, and a polite live region. Arrow keys follow the reading direction (RTL swapped), with
Home/End.
- **Look:** built on the site's own stylesheet (fonts, tokens, `.btn`, `.kick`, `.link`, the grain), with the nav
  mark, the language switch and "Back to the work". The copy sits on an ink glass panel (82% ink + blur, solid
  fallback), so its contrast never depends on the painting.
- **Loader + transitions:** the lab's loading screen is the hub's yellow with the designer's cursor. It pops in,
  clicks, and the yellow closes into the click (pure CSS, so it always leaves on its own, also without JS: 1.4s first
  visit; 0.5s on repeat or inside a frame via `sessionStorage`; hidden under reduced motion, because the site's own
  reduced-motion rule kills all animations). The hub's invitation and the footer link open the lab with a **yellow
  circle wipe from the click point** (0.43s), which lands on the lab's yellow loader. "Back to the work" wipes in ink
  and lands on the hub's own dark deck loader for `#work`. The logo goes to the top in yellow, onto the hub's yellow
  loader. Modifier and new-tab clicks are left alone, and bfcache back removes the wipe.
- **Entry points:** an end-of-section invitation under the index ("The ink lab / Paint with all twelve.", twelve
  palette dots that hop on hover, an orange arrow disc in the site's offset-shadow style; it reveals with the index),
  and a footer link.
- The two HTML files come from one template (`scratchpad/ydesign-r5/gen/make-play.py`); `noindex`, hreflang pair.

### Supporting motion
- **Index preview** (playbook 11): hovering an index row floats that site's screenshot by the pointer, with weight.
  It trails, tilts with the pointer's horizontal speed and springs in with an orange offset shadow. Mouse only, and
  never with reduced motion or the motion switch.
- **"Reduce motion" switch** in the footer (playbook rule 19): `html[data-motion=reduce]`, remembered in
  `localStorage`, `aria-pressed`, a 44px touch target. It turns the ink into one still frame and stops the index
  preview and the lab's painting cursor. It is pressed and disabled when the OS already asks for reduced motion.
- Nothing from rounds 1-4 competed with this, so nothing was removed. The hero (which already has its own WebGL dot
  field and colour wash), the bench, the arc and the studio stay as they were: the new energy lives in the ink scenes
  that were flat before.

### Fallbacks
- **No WebGL, no renderable half-float targets, or a software rasteriser:** SwiftShader/llvmpipe/WARP do not always
  set `failIfMajorPerformanceCaveat` (here it did not), so fluid.js also checks the renderer string. The holders
  then show a still CSS glow of the studio's colours, placed away from the copy. The lab keeps working as a still
  gallery: the pots swap a masked screenshot.
- **Too slow:** adaptive quality by time. After 1.2s of frames over 26ms (EMA), it steps one tier down (sim
  128→96→64→48, dye 512→384→256→192, Jacobi 14→10→6→4, canvas DPR 1.5→1→0.75→0.6). Slow at the last tier → it fades to
  the still look. It never steps back up. Phones start at tier 1 and weak devices (Save-Data, ≤2 GB, ≤4 cores on
  touch) at tier 2.
- **Reduced motion** (OS or the switch): one still, marbled frame, simulated once with fixed seeds. On scroll it
  redraws with the display pass only, so the dark boxes stay under the text. In the lab there is no autonomous
  painter, and the fluid only moves while you paint (and settles for 2.5s).
- **Hub iframe:** the fluid is never loaded (the light version). **Loader:** the fluid loads only after the site's
  loader has handed over (`is-loading` removed), in idle time. **Hidden tab, offscreen, case dialog open, wall
  diving:** paused. **Context loss:** handled (rebuild on restore). **bfcache:** resumes on `pageshow`. **JS off:** the
  original site; the lab shows a designed still. CSP-safe (no eval, no inline handlers in the new files).

### Measured
- **Contrast** (`ctr.cjs`): it fills each scene with ink, hides the text, samples the ground under every text box over
  several frames and composites the text colour with its opacity. Every text block passes over the ink in HE and EN
  desktop and HE mobile. The worst real cases are the index numbers at 5.35:1 (needs 4.5), the work body copy at
  9.1:1 and the contact body copy at 5.7:1. The only "fails" are text sitting under the fixed nav's orange button,
  and they happen identically without the fluid. The lab kicker was changed from orange to cream with an orange dot:
  13.5px orange on ink sits at 4.4:1 even without ink.
- **JS per frame** (the fluid's own tick, including GL command submission, CPU throttled 4×, SwiftShader): 3.7-4.9ms
  on desktop at tier 0 and 1.7-2.9ms on mobile. Unthrottled it is about 1-1.3ms. GPU time can't be measured here:
  SwiftShader renders on the CPU, so with the fluid forced on at 4× throttle the frame rate collapses. That is why
  software renderers are excluded in production. With adaptation on, the mobile run stepped down to tier 3 and then
  gave up to the still look within the scroll, as designed.
- **Scroll with 4× throttle, fluid off** (what headless and software users get): the same as the page without ydx,
  within this machine's noise (load average 30+ from parallel agents). Median frame 16.7ms on both; mobile 331
  frames with 6 long tasks for ydx, against the earlier clean run.
- **Weight:** fluid.js 6.1 KB, immersive.js 7.3 KB, play.js 5.6 KB gzip. The lab adds about 8 KB of CSS and
  lazy-loads its screenshots (60-140 KB each, the neighbours prefetched).
