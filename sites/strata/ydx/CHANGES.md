# STRATA: design and motion pass (ydx)

## What the site is

- **Structure:** a single-page Vite + React 19 app (`assets/index-*.js`, `assets/index-*.css`) with one HTML entry
  (`index.html`). Sections: hero (#top), ticker, Our work (#work, two concept studies that open a `<dialog>`),
  Materials (#materials, a 4-tab library), The process (#process, three sticky slabs), Project brief (#brief, a local
  brief generator), FAQ and footer. The only "routes" are in-page hash anchors. The site is English only: there is no
  Hebrew version and no language switch. `sitemap.xml` in the mirror is the SPA fallback HTML, not a sitemap. The live
  site serves it the same way, so it was left alone.
- **Art direction:** acid lime `#c6f24e`, violet `#4a2cf0`, orange `#ff6a1a`, ink `#17151c` and bone/paper on top of
  Gabarito 900 display type and Martian Mono labels. The motifs come from 3D printing: outlined "ghost" type next to
  striped "printed" type, layered lime/orange/violet shadow stacks under buttons and cards, 7px colour seams between
  sections, a CAD selection box with handles around the hero title, and a real print-head image that prints words
  layer by layer.
- **Existing motion (kept, not doubled):** Lenis smooth scroll (anchors offset by -72px); `.printed` words that print
  layer by layer with a sweeping head (hero "PHYSICAL.", "MATTER.", the footer "STRATA" and the slab cubes); stepped
  display-heading reveals (`.d-win`/`.d-ink` with a nozzle line); the study cards fading up; the field colour rising
  on a filament or material change; the material tab animations; the ticker; the sheet open animation; the FAQ
  `::details-content` height transition; spool hover spin.

## What was added (`ydx/enhance.css`, `ydx/enhance.js`, lines marked `ydx` in `index.html`)

- **Loading screen.** Its critical CSS is inline and its markup is the first child of `<body>`, outside `#root`. On an
  ink build plate with a 32/160px grid, the site's own print head (`o-head.webp`) runs on its rail and prints the
  STRATA logotype (`w-strata-lime` over the `w-strata-ghost` silhouette, the same pair as the footer word) in 38
  layers. A CAD selection box echoes the hero, there is a mono readout (`LAYER 29 / 38 · Z 5.8 MM`, "Slicing ideas →
  Printing layer by layer → Ready to hold"), and a lime/orange/violet seam fills in as the progress bar. On exit, the
  ink layers retract to the right one by one from the bottom, each showing a coloured perimeter, and the hero shows
  through.
  - Timing: the first visit lasts at least 1150ms, follows the `load` event and has a hard cap of 4s, plus a failsafe
    in the inline script at 4.5s. A repeat visit in the same session (sessionStorage, wrapped in try/catch) lasts about
    300ms. Inside the hub iframe it takes 800ms or less, with a fade fallback when the frame paints late. With reduced
    motion it is a plain fade. A `<noscript>` rule hides it.
  - Hand-off: while the loader is up, the hero's printed word is held off-screen (`html.ydx-hold`), so the
    site's own IntersectionObserver starts printing "PHYSICAL." just as the loader nozzle finishes "STRATA". The hero
    intro then plays: the nav drops in, "IDEAS, / MADE" print in, the selection marquee drags open, the vase swaps
    in and the copy and controls lift. The hold is not applied on deep links, and the intro is skipped if the page
    opens scrolled down.
- **Layer shutter (section transition).** A nav, CTA or back-to-top jump longer than 1.6 viewports plays a shutter
  instead of a long smooth scroll. 8 ink bands extrude left to right from the bottom up, like layers, each with a
  lime/orange/violet perimeter, and show "LAYER 02 / MATERIALS". The page jumps, then the bands retract. It takes about
  650ms in total. Short jumps keep the site's Lenis scroll. React handlers still run first, so the menu closes and
  "Start with PETG" still picks the material. Only Lenis's window handler is skipped. The URL hash is updated, and
  keyboard activation moves focus to the section. Modifier clicks and `#main` are left alone, and the shutter is off
  with reduced motion.
- **Reveals,** driven by IntersectionObserver through `data-ydx-*` attributes (no app classes are touched):
  - Mono section labels type on character by character, using an `@property` integer and a `ch`-based clip. Labels
    that wrap fall back to a lift.
  - Ledes, the brief heading, the footer line and the FAQ title print in from the bottom in stepped layers. The FAQ
    title also gets the violet nozzle line that the other display headings already have.
  - Material tabs, FAQ items, form rows, the ticket, the note and footer items lift in with a stagger.
  - The section seams extrude left to right, one perimeter after another.
  - Anything left at the very bottom of the page is revealed once the visitor reaches the end.
- **Process slabs:** as the next slab lands on a sticky slab, the covered one sinks to 95% scale under a 30% ink
  veil.
- **Parallax:** the concept objects drift against their plates, and the hero vase lifts away slightly on scroll.
- **Ticker:** the speed follows scroll velocity, and scrolling back runs it in reverse (`updatePlaybackRate` on the
  site's own CSS animation).
- **Magnetic buttons** (`.btn`, `.nav-cta`, pointer:fine only), using the individual `translate` property so they
  don't clash with the site's transforms.
- **Z-axis build readout:** a thin ruler on the right edge, desktop with pointer:fine at 1100px and up, showing
  `Z 144.2 MM` as the page builds up. It switches between ink and bone to suit the section underneath.
- **Mobile menu:** the panel prints down in 9 steps over a faint build-plate grid and the links stagger in. Closing
  from the menu button retracts it before React unmounts it.
- **Project sheet (dialog):** the object prints in layer by layer when the sheet opens, and closing now fades and
  settles out (`display`/`overlay` allow-discrete transitions) instead of vanishing.
- **Small touches:** FAQ answers settle in, ticket values print in when they change, the nav CTA gets a hover state
  (ink with lime text), and the FAQ "+" turns violet on hover.

## Bugs fixed

- **Deep links never scrolled (live too):** `/#materials` stayed at the top because the browser looks for the
  fragment before React renders it. Fixed by jumping to the target while the loader covers the page, and again
  on `load` if the visitor hasn't moved.
- **Hero caption clipped (desktop 1280×800 and other short screens up to about 1845px wide, also 861–1169px tall
  ones):** "FORM EXPLORATION_001 / INFINITE POSSIBILITIES." ran off the right edge and under the print head. It is
  now hidden whenever it would not fit. The check runs after the fonts load, since Martian Mono is wider than the
  fallback.
- **Vase covering the h1 (mobile 360px):** the vase hid most of the "E" in MADE. It now sits smaller and further
  right at 380px and below.
- **Uneven nav heights (all viewports):** the brand was 41.6px, the links 44px, the CTA 45px and the menu button
  46px. All are now 46px and line up.
- **Materials panel focus ring (keyboard):** the ring cut straight through the big material name that overhangs the
  panel. It now wraps the name and the panel together.
- **Touch targets under 44px (phones):** text links (26px) get a padded hit area. "BACK TO TOP" (17px), the
  material tabs (41px), the "Layer view" chip (43px) and the layer slider (30px) were enlarged.
- **Brief ticket placeholder** ("Something worth making" at 32% opacity) was nearly illegible. It is now at 42% and
  still reads as a placeholder.
- **FAQ title** was the only big heading with no reveal. It now uses the same stepped print reveal.
- Added visible focus styles for the FAQ summaries and the footer wordmark link.

## Left alone, and why

- The minified bundle and CSS were not patched. Every change is in the enhancement layer.
- **Nav pills disappear on the ink sections** (ink on ink). This is the original art direction: the labels stay
  readable and the pills reappear on light sections.
- **The vase overlapping "PHYSICAL." and the comma of "IDEAS,"** on desktop is a deliberate collage, so it was kept.
- **The brand link doesn't close the open mobile menu.** This is the app's own behaviour. Changing it would mean
  driving React state from outside.
- **No custom cursor.** The hero word already makes the pointer drive the print carriage. A cursor follower would
  compete with that and with the hover states.
- **Google Fonts are render-blocking** in this container, where they are slow. The loader paints as soon as they
  arrive. This is the same for the original page.
