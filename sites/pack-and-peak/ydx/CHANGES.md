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
