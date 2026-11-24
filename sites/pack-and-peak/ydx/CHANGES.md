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
