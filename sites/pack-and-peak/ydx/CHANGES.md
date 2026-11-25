# Pack & Peak: design and motion pass

## What the site is

A one-page scroll story about trail planning. It is a React 19 app built with vinext (Next-style RSC) and hydrated on the
whole `document`. There are five chapters, each a full-bleed colour field with a topo texture:

| # | id | Field | Content |
| --- | --- | --- | --- |
| 0 | `#top` | sky | Hero: giant cream "OUT", the massif cut-out, the hand-lettered "out there." |
| 1 | `#trails` | spruce | Signpost with three trail boards; picking one updates the whole journey |
| 2 | `#terrain` | paper | Map sheet: a 3D contour relief that follows the pointer, a route readout card and an elevation profile |
| 3 | `#pack` | vermilion | Kit grid; tapped items fly into the pack; the packing-list dialog (Base UI) |
| 4 | `#summit` | sky | "Less what if. More wow.", the PEAK wordmark and the summit cross, then the footer |

Art direction: Alfa Slab One for display, Hanken Grotesk for UI, Sedgwick Ave for marker accents, Source Serif italic
for map labels. Trail-blaze motifs throughout: a dashed vermilion route with a white casing, numbered vermilion pins and
red-white-red blazes. Palette tokens: `--sky --spruce --paper --vermilion --ink --cream`.

Motion the site already had (left as it was): hero letters rising, the massif rising and "out there." writing in; each
chapter's route drawn by a scroll-driven `clip-path` (`view()` timeline); chapter headings arriving on scroll; the relief
stack-in and band lift; the scroll progress bar; the kit fly-to-pack (WAAPI) and the pack squish; Lenis smooth wheel
(fine pointers only); board hover slides.

## What was added (`ydx/enhance.css`, `ydx/enhance.js` and the inline loader in `index.html`)

The HTML changes are marked `<!-- ydx:head -->…<!-- /ydx:head -->` at the end of `<head>` and `<!-- ydx: loading screen -->…<!-- /ydx -->`
as the first child of `<body>`. React 19 skips the extra body node during hydration, and no hydration errors were seen.
Nothing is inserted inside `<main>`. Changes to app nodes are limited to `data-ydx-in` attributes, inline `translate`,
Web Animations, and temporary text-node values for the counters, which stop if React writes to the node. Transforms on
app nodes use the individual `translate`, `scale` and `rotate` properties, so they combine with the site's own
`transform` hovers and animations.

### Loader: "plotting your route"
- A sky panel with the hero's grid and topo texture. Cream contour rings draw in. A dashed trail with a white casing
  climbs from a trailhead to the summit, a hiker dot rides its tip, and a summit flag pops in at the top.
- A large slab-serif altimeter counts from 0 to 2,380 m in step with the climb.
- The brand sits exactly where the masthead brand is, so the hand-off is seamless.
- Exit: the panel lifts off with a jagged Dolomite-ridge `clip-path`, and a vermilion ridge follows 75 ms behind.
  The hero's own intro animations are paused (`html.ydx-hold`) until that moment, so they play as the hero is uncovered.
  The masthead, the hero card, the round CTA and the dock now enter in sequence too.
- Rules: the climb takes at least ~1.05 s, then waits for `load`, with a hard cap at 2.6 s after navigation (fully gone by
  ~3.9 s at worst). A repeat visit in the same session (sessionStorage) takes ~0.4 s. Inside an iframe (the hub) it plays a
  ~0.7 s version without waiting for `load`. Reduced motion gets a 300 ms fade. If `enhance.js` fails, the inline
  fallback removes the loader at 4 s. The loader is `aria-hidden` and the page scroll is never locked. With no JS the
  loader stays `display:none`.

### Transitions
- **Chapter-jump transition.** A dock, CTA or "back to the beginning" jump of two or more chapters plays a 720 ms
  two-strata sweep with ridge and contour edges. The leading band is vermilion (ink when the destination is the vermilion
  chapter). The second band is the destination's field colour and texture and carries its pin, its eyebrow and its name.
  On touch devices, where there is no Lenis, the page lands under cover. The overlay has `pointer-events:none`. Jumps to
  the next chapter keep the plain smooth scroll.
- **Packing-list dialog:** it opens like a map sheet unfolding (rises, de-rotates, scales in 0.55 s), and the rows
  stagger in. Closing is a quick 0.26 s drop. The strike-through on a checked item now draws across instead of snapping on.

### Scroll choreography (IntersectionObserver, run once, hidden only under `html.ydx-motion`)
- Chapter pins stamp onto the route.
- The hand-lettered accents ("you.", "a plan.", "Room to breathe.", "what if." / "wow.", and the board notes) write
  themselves in with the same clip reveal as the hero's "out there."
- Signpost: the pole drops in, the boards swing off it, the scenery cut-outs rise from behind each board, and the notes
  are written in.
- Map sheet: the readout card settles. Distance and elevation count up and the elevation profile is re-plotted. The
  difficulty stamp thumps down. The north arrow swings and settles like a compass needle. All of this replays when you
  pick another trail.
- Packing: the kit lands item by item (and again when the trail changes the list), and the pack settles in. The count
  bumps when an item lands in the pack.
- Summit: PEAK climbs out from behind the summit rock (scroll-linked), then the actions and footer rise and fade in.
- Hero: OUT sinks behind the massif as you scroll away (scroll-linked depth).

### Small interactions
- **Altimeter pill** (desktop 1000px and up): styled like the dock and fixed bottom-right. It reads from 1,520 m at the
  trailhead to trailhead plus the chosen trail's elevation gain, following scroll progress, and shows SUMMIT with a flag
  on the last chapter. It is hidden over the hero and the footer.
- **Map reticle** (fine pointers, terrain chapter): a crosshair with a live coordinate label (for example
  `46°31.37′ N · 11°46.37′ E`) in the sheet's blue italic. It is based on the chosen trail's coordinates and is hidden
  over the card, the heading and buttons.
- A white-and-vermilion trail marker rides the tip of the progress bar.
- The dock label rolls when the chapter changes. Hovering or focusing a dock pip shows its chapter name.
- Magnetic pull on the round CTA, the header CTA, the pills, the text button and the dock arrow. It is written to
  `translate`, so the existing hover transforms still work.
- The trailhead pings three times once the hero route reaches it. The coordinates target "breathes".

## Bugs fixed
1. **Signpost pole overflow** (desktop at every width, checked at 1280, 1440 and 1920): the pole overshot the green
   chapter by about 14 px into the map sheet, because its `bottom` calc assumed a 4.2rem atlas note that is really
   ~3.35rem. Fixed in CSS.
2. **Route line through text** (desktop): the chapter-1 route ran straight through "THREE WAYS OUT… / …journey yours."
   Added `padding-right:7vw` to the note.
3. **Choosing a different trail stalled the auto-scroll** (desktop, Lenis). Picking a trail other than the current one
   re-renders the later chapters. Lenis' ResizeObserver then resets its target mid-flight, and the jump to "Read the
   mountain" stopped about 750 px short. The original site does this too (reproduced against the untouched HTML).
   `enhance.js` now detects the stall and replays the app's own jump through the dock button. Verified: it lands exactly
   on `#terrain`.
4. **360–380 px phones:** "Good things are" wrapped to two lines and crowded the OUT wordmark. The 9.6vw size the site
   used only below 350 px now applies up to 380 px.
5. **Phones:** the hero coordinates label sat on the rock face with poor contrast. It now has a sky-coloured text halo.
6. **Phones:** the dock chapter pips were 36 px tap targets. They are now 44 px tall without growing the dock.
7. **Orphans** such as "…make the journey / yours." on phones: `text-wrap: pretty` on the short copy blocks.

## Deliberately left alone
- The minified bundles. No patches were needed; every fix above is applied from outside the bundles.
- The site's hidden scrollbar (`scrollbar-width:none`). It is an art-direction choice, and the progress bar plus the
  dock stand in for it.
- The two numbering systems (pins 01–04 on the page, the dock's 01–05). Both are intentional in the original. The
  transition pin uses the page-pin numbers and the dock's names.
- The hard-edged colour blocks between chapters. They are a core part of the poster-like art direction, so the jump
  transition carries the ridge motif instead of reshaping the section edges.
- The external data, downloads and Lenis behaviour themselves.

## Verification
Checked with Playwright at 1440×900, 1280×800, 1920×1080, iPhone 13 and 360×740. I recorded the loader, the chapter
transition (seeked frame by frame), the dialog and the counters as frame sequences. I also tested keyboard tabbing (all
focus styles intact, including the board focus), reduced motion (nothing hidden, loader fades), no JS (loader hidden, all
content visible), the iframe and repeat-visit loader timings, and a run with `enhance.js` blocked (the fallback clears the
loader at 4 s). No horizontal overflow and zero console errors or warnings in every run.

## Round 2

A second reviewer audited the first pass as a first-time visitor would see it. The audit recorded the loader and the
transitions as frame sequences on desktop (1440×900) and mobile (iPhone 13, 360). Screencast frames are not reliable
on this heavily loaded container, so the exits were also sought frame by frame by pausing their Web Animations. Other
checks:
- Slow 3G (400 kbps, 400 ms RTT) with 4× CPU throttling.
- CLS and long tasks compared with the untouched page (`index.html` with the ydx blocks stripped, served via
  `page.route`).
- A keyboard-only run, including the packing-list dialog.
- Screen-reader basics.
- 360, 390, 768, 1024, 1280, 1440 and 1920 wide, plus a landscape phone (844×390).
- Reduced motion, no JS, the iframe (hub) mode and a repeat visit.

The site has one language (English, LTR), so no RTL checks were needed.

### What the audit found
1. **The loader looked stuck on slow networks.** Its whole climb was driven by `enhance.js` (deferred, 23 KB). On slow
   3G the HTML arrived at about 5.8 s, and the loader then sat at "0 m" with no motion for 4 s. After that the inline
   fallback cut it away abruptly, leaving a blank sky frame. On normal loads the counter also stayed near 0 for the
   first ~350 ms, until `enhance.js` ran.
2. **The loader caused load CLS of 0.018 on desktop and 0.020 on mobile, against 0 on the original.** The altimeter
   digits are proportional, so the "m" after them moved on every frame.
3. **Main-thread exit.** The exit animated `clip-path` polygons, which run on the main thread, so it stuttered while
   React hydrated. A ~300 ms lull also opened before the ridge appeared, because the polygon started fully off-screen
   under a slow-start easing.
4. **The hero massif popped in after the reveal, and the wipe uncovered an empty hero.** The 384 KB massif was not
   decoded until it first became visible, by which time its rise animation had already finished, so it appeared
   suddenly about 1 s after the loader left. The hero letters were also released 180 ms *after* the wipe began, so the
   wipe exposed a blank sky.
5. **The brand had a double entrance.** The loader's brand sat 2 px above the masthead brand and used a different ®
   glyph (slab instead of Hanken). It faded out with the loader, and then the masthead brand dropped in again.
6. **On phones the trailhead was off-screen** (the map was centred at 150vw), and the exit ridge became a saw blade:
   22 peaks across 390 px at full height.
7. **The packing-list dialog stagger was out of order.** The base rule used `:is(… .packing-list label …)`, which took
   the label's specificity and overrode the per-element delays. The title, description, progress, advice, CTA and note
   therefore all started at .12 s, and the advice and CTA appeared *before* the rows above them.
8. **Landscape phones (844×390):** the hero card sat on top of the OUT wordmark (`top: calc(100svh - 190px)`), and the
   dock covered "out there.". This comes from the original layout.
9. **Phones:** the full-pack badge wrapped as "READY FOR OUT / THERE".
10. **Chapter jumps to the summit could reveal the lazy summit rock before it had loaded.**

Things that passed: keyboard order and focus rings (the board focus is the site's white face plus the ring); no focus
is trapped by the loader, whose only reachable target is the skip link; the dialog traps focus, Escape closes it and
focus returns to its trigger; every ydx overlay is `aria-hidden`; there was no horizontal overflow at any width; and
there were no console errors or warnings in any run.

### What changed
- **The loader driver moved into the inline `<script data-ydx>` at the top of `<head>`** (3 KB minified; readable source in
  `ydx/loader-inline.src.js`, which is not loaded). It starts on the first frame, independently of `enhance.js`, and
  `runLoader` was removed from `enhance.js`. Release now waits for `load`, `document.fonts.ready` **and**
  `decode()` of the hero massif, so the hero is never revealed half-built. The hard cap is still 2.4 s from navigation.
  If the HTML itself arrives late, the climb shortens to 650 ms. A repeat visit uses a 300 ms climb and a 480 ms exit,
  and the iframe version takes about 0.7 s. Reduced motion shows the summit state and fades in 300 ms. A 4.5 s safety
  fades the loader out instead of cutting it, which also covers background tabs where rAF never runs. The script still
  sets `window.__ydxDone` and dispatches `ydx:ready`.
- **The exit is now composited.** The sky panel and the vermilion under-layer are taller than the viewport by the ridge
  height `--R`. Each carries a *static* ridge `clip-path`, and they lift with `transform` only (780 ms,
  `cubic-bezier(.62,.02,.2,1)`). The two ridges use offset patterns so the red band has a varying thickness. The map,
  altimeter and caption sink 26vh and fade (parallax), while the top bar counter-moves so it stays fixed. The ridge
  therefore wipes over the loader brand, and the pixel-identical masthead brand underneath takes over in place: the
  masthead brand no longer has its own drop-in. `--R` is `min(17vh,160px,20vw)` so phones get a ridge rather than a
  saw. The hero hold is released as the exit *starts*, so the letters and massif rise while they are being uncovered.
- **The loader brand is pixel-matched to the masthead** (desktop 100px / phone 72px bar, Hanken ®, ≤380 and ≤350 sizes).
  The trailhead is visible on phones (map at `left:70%`). The altimeter number box has a fixed width (`2.88em`), so the
  "m" no longer moves and the load CLS is back to **0** (desktop and mobile). Added `contain:strict` on the loader.
- **Dialog:** the base rule now uses `:where()`, so the stagger runs top to bottom. It is also tighter: .45 s rows that
  finish by about 0.93 s instead of 1.1 s.
- **Landscape phones:** `@media (max-height:500px) and (min-width:761px)` anchors the hero card to the foot of the hero,
  `bottom:96px`.
- **Chapter jump:** while the strata cover the screen, the destination's lazy images are warmed with `new Image()`, so
  the summit rock is ready when the cover lifts.
- **Phones:** `text-wrap: balance` on the pack-count badge, so it reads "READY FOR / OUT THERE".

### Added (second improvement loop)
- **8/8 packed:** a red-white-red trail-blaze tag on a short ink cord swings from the pack's top-left buckle and
  settles at 7°. It uses the site's own blaze motif. It is a `.pack-core::after` pseudo-element: nothing is inserted
  into the React tree. On desktop it is sized in container units (`container-type` is set on `.pack-core` on desktop
  only, because on phones it is a shrink-to-fit flex item that inline-size containment would collapse to 0), and in px
  on phones. Unpacking an item takes the tag off again. Under reduced motion it appears without the swing.

### Considered and left alone
- The chapter-jump strata (720 ms) and the reveal choreography were re-checked and kept. The cover lifts while the
  Lenis jump (1.15 s, expo-out) is in its last ~5%, which reads as a landing, not a slide.
- The map reticle, the altimeter pill, magnetic buttons and the hero sink were kept. Each is quiet and on-motif.
- The massif cannot be helped on slow 3G: the hero is revealed at the cap and the image arrives when it arrives.
- The altimeter pill (scroll phase) and the readout counters still log a few layout-shift entries of ≤0.0003, which is
  noise (total 0.0008 desktop and 0.0043 mobile, against 0 and 0.0031 for the original).
- Timings measured here are inflated about 2× by the container (load average around 19 on 4 cores). The design
  timings above are the nominal values.

## Round 3: code review and production hardening

I read every line of `enhance.js`, `enhance.css`, `loader-inline.src.js` and the inline blocks, and wrote a Playwright
test for each suspected bug. Each test failed before its fix and passed after it. The scripts are in the round-3
scratch folder (`t-*.cjs`, `prod.cjs`).

### Bugs found and fixed
1. **Summit pin 04 never appeared** (iPhone 13, 1920×1200, and intermittently at 1440). Its hidden state is
   `scale:0`, so its IntersectionObserver target collapsed to a point. That point sits exactly on the
   `overflow:clip` top edge of `#summit`, so it never counted as intersecting. *Repro:* walk the page, then list the
   reveal targets that have no `data-ydx-in`. *Fix:* pins are now observed through their chapter.
2. **The desktop footer stayed invisible.** At the bottom of the page the footer fills only the last ~100 px, and that
   strip lies inside the observer's `-12%` bottom margin. *Repro:* the same walk; the footer's children stayed at
   opacity 0 at 1440×900 and 1920×1200. *Fix:* a second observer without the margin watches the footer.
3. **A slow `enhance.css` blocked the whole app.** A parser-inserted stylesheet blocks both rendering and the app's
   module scripts. With the file 8 s slow, the first paint came at 8.1 s, React hydrated at 8.2 s, and the loader was
   never seen. *Fix:* the inline boot script now attaches `enhance.css` without blocking. A `<link rel=preload>` keeps
   the early fetch, and a `<noscript>` copy keeps the CSS fixes for visitors without JS. The page now paints at 0.7 s
   and hydrates at 0.45 s.
   - `html.ydx-css` (set on load) gates the ydx overlays (altimeter, tip, reticle, shutter). With the CSS missing (404)
     they used to render unstyled at the end of `<body>`.
   - If the CSS arrives after the loader has gone, `html.ydx-late-css` drops the reveals and the hero intro, so the
     visible content does not blink and replay.
4. **`enhance.js` changed from `defer` to `async`.** The app's bundles are all `async` modules, so hydration was never
   blocked. However, a hung deferred file held `DOMContentLoaded` back by 8 s. The file already tolerates running before
   the body is parsed.
5. **A late `enhance.js` made visible content blink out and replay.** If the file ran after the loader had uncovered
   the page and a reveal target was already on screen, adding `ydx-motion` hid it for a frame and then replayed its
   entrance. *Repro:* delay the file 8 s, scroll to the trails chapter at 5 s, and sample the opacity every frame; it
   dropped to 0. *Fix:* in that case the reveals are skipped.
6. **The choose-trail stall fix yanked users back.** After picking a trail, wheeling back up was pulled down to the map
   about 2 s later. *Repro:* the same test run with and without the fix; without it the user stays at y=0. *Fix:* the
   fix stands down after any wheel, touch, key or pointer press made after the click.
7. **The chapter jump on phones landed in the wrong place.** Chromium keeps the remaining distance of a running smooth
   scroll after an instant `scrollTo`, so the landing under the cover overshot by 100–300 px. This was already present
   in rounds 1–2; for example, "The good part" landed 295 px into the summit. *Fix:* stop the scroll in place first,
   then land on the next frame. It now lands exactly on the summit, pack and top.
8. **A stale landing timer on phones.** Tapping "The good part" and then quickly "Choose a trail" ended on the summit
   with `#trails` in the URL, and the cover kept naming the first destination. *Fix:* only the latest destination is
   landed. A second jump while the strata still cover the page retargets the cover (name, pin and colour) instead of
   restarting it. Landing is skipped once the user has touched or wheeled. `pagehide` drops the cover so it is never
   kept in a bfcache snapshot. `scrollTo({behavior:'instant'})` has a fallback for older engines.
9. **The inline loader could dispatch `ydx:ready` twice and leave nodes behind.**
   - If the exit started just before the 4.5 s safety, both the safety and the exit's `onfinish` ran cleanup. *Repro:*
     hide rAF until 3.3 s; `ydx:ready` fired twice.
   - In a tab where rAF never ran, the loader node was only hidden, never removed.
   - A throw during the exit kept the cover up until the safety fired (4.96 s in the repro).
   - *Fix:* cleanup is idempotent and looks the node up itself. The tick and the exit are wrapped so that an error
     clears the cover immediately (1.48 s in the same repro).
10. **Running `enhance.js` twice duplicated every overlay and listener.** *Fix:* a `window.__ydxEnhance` guard.
11. **Printing.** Content that had not been scrolled into view printed blank, and the fixed altimeter and tip would
    repeat on every page. *Fix:* print CSS shows every reveal target and hides the overlays.
12. **Small fixes:**
    - The kit stagger was a global `animation-delay … !important` on `.kit-grid .pack-object`. It is now scoped to the
      reveal.
    - The map reticle now also hides on a key press (for example, opening the packing list from the keyboard while the
      mouse rests on the map) and on window blur.
    - Comments that said the loader script sits "at the top of `<head>`" now give its real position.
    - Loose shutter rules were moved into their section.

### Production-condition matrix (all passed after the fixes)
The live site sends no CSP or security headers (`curl -sI`). Static, non-hashed files are served
`max-age=0, must-revalidate`, so updates to `/ydx/*` propagate. I still tested a strict policy applied with
`page.route`:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:
```

together with `nosniff`, `X-Frame-Options: SAMEORIGIN` and a Referrer-Policy. Nothing in ydx was blocked.

I also ran these scenarios:
- normal load, mobile, reduced motion and a repeat visit;
- no JS (the noscript CSS applies, and the same 17 opacity-0 nodes appear as in the stripped original);
- `enhance.js` 404, `enhance.css` 404, and both;
- `enhance.js` delayed 8 s, `enhance.css` delayed 8 s, and the app bundles delayed 8 s;
- a background tab (rAF withheld and `visibilityState` hidden until 2 s, 4.3 s and 8 s);
- a frozen page (`Page.setWebLifecycleState`) for 5 s;
- the hub iframe (loader gone in about 1.2 s).

In every scenario the page ended up visible and usable: the hero was at opacity 1 and running, there was no leftover
`ydx-loading` or `ydx-hold`, no overflow lock, `ydx:ready` fired exactly once, and there were no console errors.

### Known limitations
- bfcache could not be exercised here, because Playwright's Chromium never restored from it, even with the feature
  forced on. The reasoning: timers and animations resume, the loader re-checks its cap against `performance.now()`
  and exits, and the shutter is dropped on `pagehide`.
- Safari and Firefox were reasoned about from the code only. The following are behind `@supports` or degrade to
  static: `:has()` (the pack tag simply never shows), container units, scroll timelines (no hero sink, no PEAK climb,
  no tip marker) and `text-wrap`.
- If `enhance.css` arrives during the 0.8 s exit itself (as opposed to after it), the hero intro starts a little late.
  It does not replay.

## Round 4: final creative-director pass

I walked the whole page again, scroll by scroll, at 1440×900 and on an iPhone 13 (plus 1920×1200, reduced motion and
the trail-2 journey). The site has one language (English, LTR). It no longer feels flat anywhere in the middle: every
chapter has its own moment, and the hard colour blocks between chapters stay, as an art-direction choice (round 1).
I found three things still worth doing, and nothing that I judged to be noise.

### What I judged
- **The ending was the one flat spot.** The hero route starts at a trailhead that pings, and the loader climbs to a
  summit with a flag. But the last route, on the summit rock, just stopped at the cross. Below it the footer was two
  plain lines of caps, and the altimeter pill slid away at that point without handing over to anything.
- **The motion language had drifted.** Things of the same kind used slightly different values: arrivals ran at .8,
  .9, .95 and 1 s, pops used four overshoot curves (1.4, 1.5, 1.6 and 1.7), and the stamp and draw easings were mixed.
  None of it was wrong on its own, but together it was not one system.
- **A real bug in the altimeter.** The altimeter pill read the elevation gain from the readout card's text, and while
  the card's counter is running that text is an in-between number. The pill could therefore aim at the wrong summit,
  and the new summit label showed 2,060 m, 1,995 m and 2,080 m on three runs, when the real answer was 2,380 m.
- **Hover, focus and active states:** checked against the site's CSS. The site already covers every control (pills,
  CTAs, boards, kit, dock, text button, checkboxes), and ydx adds magnetic pull and the dock labels. No gaps were worth
  filling.
- **Removal review:** I looked again at the altimeter pill, the progress-tip marker, the map reticle, the trailhead
  ping, the breathing target and the magnets. Each is quiet, on-motif and does one job, so none was removed.

### What changed
1. **Trail's end (end-of-page moment).** When the footer arrives, the summit route's end point (the app's own path
   end, 67.3% / 36.6% of the rock image) is stamped with the hero's trailhead marker. The marker pings twice, and the
   final altitude of the chosen trail writes itself in, in the hero's map-label italic: for example
   "Summit · 2,380 m", or "Summit · 1,840 m" for the forest trail. As the altimeter pill hides over the footer, this
   label takes over its number, so the climb that the loader started ends on the rock.
   - It is built from the `::before` and `::after` pseudo-elements of the app's `.route` box, plus a `data-ydx-summit`
     attribute that `enhance.js` keeps in step with the chosen trail. Nothing is inserted into the React tree.
   - With no attribute (no JS, or `enhance.js` missing) nothing is drawn. Under reduced motion it is static. It is
     behind `@supports selector(:has(a))`.
2. **The footer's leave-no-trace line carries the red-white-red trail blaze**, the same mark that every eyebrow on the
   page uses. CSS only (an absolutely positioned `::before`), so it also works without JS through the noscript CSS.
3. **Motion tokens.** `:root` now defines `--ydx-out`, `--ydx-write`, `--ydx-draw`, `--ydx-pop` and `--ydx-sweep`. The
   out, write and draw easings are copied from the site's own `letter-up`, `write` and route-walk easings. Durations
   are `--ydx-s` (.45 s), `--ydx-m` (.8 s) and `--ydx-l` (1.1 s). Every ydx reveal, pop and transition now uses them,
   and `enhance.js` mirrors the easings in an `EASE` table for its Web Animations (shutter, pin, profile, stamp, dock
   label, count bump).
   - Deliberate exceptions, each commented: the compass needle's 1.6 s damped swing, the trailhead ping, the pack tag
     swing, the dialog's ease-in close, and the inline loader, which was left untouched.
4. **Altimeter fix.** `countUp` records the value it is counting to (`__ydxFinal`, cleared when it ends or when React
   takes over), and the altimeter and the summit label read that value. Now 3/3 runs give 2,380 m, and 1,840 m after
   picking the forest trail.

`index.html` and the inline loader were not changed. The loader was rebuilt from `ydx/loader-inline.src.js` with
esbuild 0.24.0 and is still byte-identical to the inline block.

### Regression results (round-3 suite, re-run from `pack-and-peak-r4/reg/`)
- `t-misc`: no dialog z-fight, no yank after choosing a trail, a second run makes no duplicates, and print shows
  everything. `t-reveal`: no unrevealed targets and the footer is visible at 1440, 1920×1200, phone and landscape.
  `t-pins`: all four pins stamp.
- `t-shutter` and `t-shutter2`: they land exactly on the summit, the top and the pack with mouse, keyboard and touch.
  The stale-tap case ends on trails.
- `t-land`: the phone landing is exact (5077). `t-yank` passes. `t-bfcache` and `t-bfcache2` leave nothing covering.
- `t-loader`: `ydx:ready` fires once, and an exit throw clears the cover at 1.6 s.
- `t-order`: hydration is never held back by a slow ydx file. `t-nojs`: the noscript CSS applies and 16 nodes are
  hidden, the same as the stripped original.
- `prod.cjs`, all 18 scenarios: normal, CSP, no JS, JS/CSS/both 404, JS late, app late, mobile, reduced, repeat,
  background, hidden 2/4/8 s, frozen, iframe and bfcache.
  - Each ended visible and usable, with `ydx:ready` firing once and no console errors apart from the intended 404s.
  - In the first full run, `bfcache` was probed while its repeat loader was still up (the container load average was
    24). Re-run alone, it passed, and so did `repeat`.
- New: `t-end.cjs` (the end marker on desktop, phone, 1920 and reduced motion; no overflow, no errors) and
  `t-trail.cjs` (the label follows the trail on desktop and phone).
- The `shoot.mjs` walks on desktop and mobile have 0 log lines.
- Live headers (`curl -sI`): still no CSP or security headers. `/ydx/*` is not deployed live yet, which is the
  `both404` case and passes.

## Round 5: a living map and a route lab

The brief: make the site immersive (reactive, moving backgrounds and a genuinely interactive experience) without
breaking rounds 1–4. Pack & Peak already had one strong signature, the topographic map: every chapter field carries a
static contour texture, the loader draws contour rings and a trail to a summit, the terrain chapter is a map sheet. So
both additions are that map, alive, following the playbook's mapping for this site (technique 1 variant: a
contour-line shader from a domain-warped noise height field; technique 22 details; 21 for the page change).

### 1. The living topographic field (`ydx/topo.js`, all chapters)
- **What it is.** One fixed WebGL 1 canvas (`#ydx-topo`) draws the site's own contour lines, alive. A domain-warped
  2D simplex height field erodes slowly; contours every level with an index contour every fifth, anti-aliased with
  `fwidth` (`OES_standard_derivatives`, with a fixed-band fallback); a soft hillshade from the height gradient; and a
  slow "sun through moving cloud" light drifting over it.
- **It reacts.**
  - *Pointer:* the cursor raises a summit. The rings tighten around it and turn cream (the loader's contour colour;
    vermilion on the paper map sheet). It follows with mass (a damped spring), rises while the pointer rests and
    flattens a little while it moves fast.
  - *Scroll:* the field scrolls at 78% of the page, which reads as depth under the content. Scroll speed stirs it
    (the warp grows with velocity).
  - *Trail choice:* picking a different board on the signpost reshapes the land (each trail has its own seed, eased
    over ~1.5 s) and sends a contour ripple out from the board you tapped.
  - *Touch:* without a hover pointer the summit wanders on its own (Lissajous drift) and jumps to where you touch;
    on Android it follows device tilt (no permission prompt there; iOS keeps the drift, so there is no permission UI).
- **Per chapter.** Line colour and alpha match the old textures exactly (ink at ~13% on sky, spruce and vermilion;
  sienna on the paper sheet). The light only ever raises text contrast: sunlit slopes lighten on ink-text chapters,
  shaded slopes darken on the spruce chapter (cream text). No lines are drawn within a few px of a chapter seam (the
  band widens with scroll speed), which hides any one-frame lag between the canvas and the scrolled content.
- **Stacking without touching React.** Every chapter child already sits at `z-index >= 1`; the chapters themselves
  are positioned with `z-index:auto`. A fixed canvas at `z-index:0` appended to `<body>` therefore paints *above* the
  CSS colour fields and *below* all content. The one in-flow piece of chapter content, the hero kicker, gets
  `position:relative; z-index:3`. The colour fields and map grids stay CSS, so they never lag the scroll; only the
  topo texture layer is dropped (`html.ydx-gl`, screen only, so print keeps it).
- **Hand-off.** It starts after `load` and draws its first frame under the loader, so the swap from the texture is
  never seen; if it starts after the loader has gone, the canvas fades in over the texture first and the texture is
  removed once it is fully covered. Under the loader it draws nothing more (no cost during hydration).

### 2. The route lab (`/play/`, `ydx/lab.js`, `ydx/lab.css`)
A standalone page I own completely ("05 / Route lab — Plot your own line."). The whole viewport is a living
topographic sheet in the site's map language: pale-green valleys, paper mid-slopes, warm high ground, snow summits,
sienna contours every 50 m (index every 250 m), hillshade, tarns with moving hatch lines and a shoreline, cloud
shadows drifting over, the map grid, a north arrow, a 1 km scale bar and the sheet's blue italic coordinates.
- **Draw** a route with mouse, pen or finger: it is drawn in the site's trail style (white casing, dashed vermilion,
  white-and-vermilion trailhead marker, a summit flag with its altitude at the highest point). The readout card is a
  twin of the terrain chapter's: a name ("Summit push", "Tarn traverse", "Valley ramble"…), the elevation profile,
  distance, elevation gain (8 m hysteresis, like a GPS log), trail time (Naismith's rule), highest point and a
  difficulty stamp that thumps in when it changes. All of it updates live while you draw.
- **Raise / Dig:** press and hold to grow a peak or sink a tarn. The land springs up (slight overshoot), the contours
  ripple outward, and an existing route's numbers change with the land under it.
- **New land** morphs the terrain into a new seed (the contours flow into new shapes); **Clear** lets the sculpted
  land settle back.
- **Walk it:** a hiker rides the line; the card title becomes a live altimeter and a marker runs along the profile;
  it ends "Logged · 7.5 km" with the stamp and a haptic tick where supported.
- **Plot one for me** (and the keyboard route through the whole toy): it finds the highest summit in the open map,
  picks a valley start whose line keeps off the panels and out of the water, and draws switchbacks up to it.
- **Reticle** (fine pointers): crosshair with the live altitude under the pointer ("2,140 m", or "Tarn · 1,110 m"),
  re-read while you sculpt underneath it.
- **One height function, twice.** The shader's terrain and a JS port of the same simplex noise give identical
  heights, so every number matches the contour you see. Verified by sampling 1,592 grid points of a rendered
  frame against the JS water test: 1,592/1,592 agree.
- **Look and back.** Same fonts (the site's own latin subsets), palette tokens, brand mark (links home), blaze
  eyebrows, readout card, pill buttons and dock-style "Back to the journey" pill. "Pack for it" links to `/#pack`.
- **Phones:** the panels compact to a title + tool bar on top and a slim readout at the bottom (stamp in the card's
  corner), leaving the map in between (~250 px on a 390×664 viewport, ~190 px at 360×640). No page scroll, no
  horizontal overflow.

### 3. Entry point and the page change (`ydx/enhance.js`)
- **Chip:** "Route lab · Plot your own line" with a contour-ring icon, styled like the dock and the altimeter pill.
  It is a real link appended to `<body>`, shown while the map sheet or the summit is mid-screen (bottom-right above
  the altimeter pill on desktop, over the decorative relief rather than the readout card's CTA; on phones only at the
  summit, centred above the dock; `visibility:hidden` otherwise, so it is never an invisible tab stop). Hover/focus
  makes its rings breathe; it has the magnetic pull of the other pills.
- **Transition:** clicking it plays the chapter-jump strata (vermilion, then a paper band with the route pin,
  "ROUTE LAB", "Plot your own line"), freezes them while the paper band covers the screen, and navigates. The lab
  page starts under the identical band (critical CSS + markup first in `<body>`) and lifts it with the ridge edge,
  vermilion under-layer 90 ms behind, as the panels rise in. Leaving the lab, a ridge-edged vermilion and sky band
  sweep up and the journey's own loader (short repeat version) takes over; `/#terrain` lands exactly on the chapter.
  Modifier/middle clicks and reduced motion navigate normally; bfcache restores drop any cover.

### Fallbacks
| Condition | Journey page | Route lab |
| --- | --- | --- |
| No WebGL / software GL flagged by the browser / shader error | not mounted, original topo texture | 2D-canvas contour render of the same heights (1/3 res), everything works |
| GPU too slow | steps resolution 1 → .32; still too slow for 1.5 s → hands back to the texture (fades) | stays at the lowest resolution |
| Reduced motion | not mounted (the static texture is the still frame) | static map, rendered on demand; walk / plot / morph jump to the result; cover fades |
| Hub iframe | 30 fps, 60% resolution, 2 octaves | — |
| `enhance.css` missing | not mounted (waits for `html.ydx-css`); chip hidden by the inline critical CSS | — |
| No JS | original site | static topo sheet, the title card and "The route lab needs JavaScript. Back to the journey" |
| Context lost | texture comes back; restored → rebuilt | 2D fallback / rebuilt |

### Performance
- DPR cap 1.5 (1.25 on coarse pointers); 3 noise octaves on desktop, 2 on phones and in the hub; adaptive
  resolution from a frame-time EMA measured in real time; 60 fps only while something moves (input, scroll, ripple,
  morph), otherwise 30 fps; paused in hidden tabs and under the loader; one WebGL context per page; no layout reads
  per frame (chapter tops are cached by a ResizeObserver).
- **JS per drawn frame** (EMA): 0.2–0.6 ms on the page unthrottled, 1.4–5 ms at 4× CPU throttle (this includes
  SwiftShader's in-process GL calls). The lab: ~0.2 ms idle, more while a route is measured (~500 height samples).
- **4× CPU throttle, scripted scroll, vs. the same page with `topo.js` blocked** (`perf.cjs`, SwiftShader):
  - The first build kept drawing at the lowest resolution and SwiftShader made the page crawl (median frame 300 ms vs
    33 ms on desktop). That is a software rasteriser on a loaded container, not a GPU, but it showed that the layer
    needed a way out on weak hardware. The engine now counts slow time in real milliseconds and gives up after
    1.5 s at the lowest resolution.
  - With that: desktop median frame 33.3 ms with the layer vs 33.3 ms without (p95 283–400 vs 150–250 ms; the layer
    bails out during the run and its canvas is removed); mobile median 16.7 vs 16.7 ms, p95 83 vs 50–133 ms.
  - On a real GPU the shader is a few ms (one full-screen triangle, ~9 simplex evaluations per pixel on desktop at
    DPR 1.5); it was not possible to measure a GPU here.

### Removed or changed from earlier rounds
Nothing was removed. I re-checked the competing pointer effects: on the map sheet the round-1 reticle and the new
summit both follow the pointer, but they say the same thing (a point on the map, its coordinates, a peak under it),
so they reinforce each other. The static topo texture is no longer drawn while the live field runs.

### Files
- New: `ydx/topo.js` (engine + page driver), `ydx/lab.js`, `ydx/lab.css`, `play/index.html`.
- `index.html`: one `<script src="/ydx/topo.js" async>` inside the ydx head block, and `#ydx-lab,#ydx-topo` added
  to the inline "hidden until enhance.css" rule. The inline loader is unchanged and still byte-identical to the
  esbuild 0.24.0 build of `ydx/loader-inline.src.js` (checked).
- `ydx/enhance.js`: the lab destination in the shutter, `__ydxToLab`, the chip, the chip in the magnet list.
- `ydx/enhance.css`: canvas placement and texture swap (5b), the chip, print rules.

### Verification and regression results (scripts in `scratchpad/pack-and-peak-r5/`)
- Visual: `look.cjs` (all chapters, desktop and iPhone 13), `bgseq.cjs` (summit following the cursor; trail
  ripple), `lab1.cjs` (draw, raise, walk, plot; desktop and phone), `frames.cjs` (strata into the lab, seeked
  frame by frame), `flow.cjs` (chip → lab → back to `/#terrain`: lands at 0 px).
- Fallbacks (`fb.cjs`): no WebGL (page keeps the texture; the lab draws in 2D and measures routes), reduced motion,
  hub iframe (q .6, 30 fps), `enhance.css` 404, JS off on the lab. No console errors apart from the intended 404s.
- Round 3/4 suite re-run from `pack-and-peak-r5/reg/`: `t-misc`, `t-reveal`, `t-pins`, `t-shutter`, `t-shutter2`,
  `t-yank`, `t-bfcache`, `t-bfcache2`, `t-loader` (ready fires once; an exit throw clears the cover), `t-order`
  (hydration never held back), `t-nojs`, `t-end`, `t-trail` all pass. `t-land` first ran slowly with the GL layer
  under SwiftShader (the phone landing was late); after the slow-GPU bail-out it lands exactly (5077) again.
  `t-nojs` counts of opacity-0 nodes fluctuate run to run on both the stripped original (14–16) and ours (16–17)
  because the original's own CSS intro animations are mid-flight at `load`.
- `prod.cjs`, 18 scenarios: every one ends visible and usable with `ydx:ready` once and no console errors besides
  the intended 404s. `bfcache` is still probed while its repeat loader is up (Playwright never restores from
  bfcache; the same artefact as round 4) and then ends clean.
- `shoot.mjs` walks: see the final report.
