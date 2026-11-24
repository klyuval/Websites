# Negia (נגיעה) — design + motion pass

## The site as found

- **Structure.** Two static pages built with Vite: `index.html` (a long Hebrew RTL one-pager) and `style-tile.html` (a brand
  sheet). The home page runs through: hero, values strip, manifesto (01), colour atelier with shade tabs and a depth
  slider (02), "colour compass" quiz, material story (swatch dabs), approach and process cards (03), journal cards with
  `<details>`, FAQ accordion (04), the contact / "prepare an inquiry" form (05) and the footer wordmark. The mobile menu is
  a `<dialog>`. There is **no English mode** in this build: `/en`, `/en/` and `?lang=en` on the live worker all return the
  Hebrew page through the SPA fallback, and the bundle has no strings for a language switch. `sitemap.xml`, `robots.txt`
  and `manifest.webmanifest` in the mirror are that same fallback HTML (the live site has none of these files). They are not
  linked from the pages, so I left them alone.
- **Art direction.** Four shade families (rose, nude, peach, berry), each with field, pigment, deep and tint tokens; picking
  a family recolours the whole page through a circular `startViewTransition` from the click point. The display type is
  Noto Serif Hebrew 900 at 68% width, set very large. Bodoni Moda italic is used for Latin asides and Heebo for UI.
  The page is collaged from cut-out photographs: glossy lips, lipstick bullets, smears, kiss prints, a brush and a hand.
  The panels are paper cards with 4–6px radii.
- **Existing motion (kept as is, never double-animated).** Lenis smooth wheel scroll on desktop; a CSS entrance for the
  hero (lines rise, lips scale in, the smear slides like a door); `[data-reveal]` heading lines that rise when they get
  `.is-in`; the contact hand/smear sliding in; pointer parallax on the hero lips (inline `transform`, owned by the
  app); `.swap` fade-ups on shade or answer change; scroll-timeline drift on the kisses, brush, portrait and footer lips;
  and the view-transition circle wipe on shade change.

## What I added (all in `ydx/`, plus the `ydx`-marked lines in both HTML files)

- **Loading screen: a lipstick writes the logotype.** On burgundy, a lipstick bullet (`lipstick-rose.webp`) drags
  right-to-left (the Hebrew direction) and lays down the glossy smear (`smear-a-rose-s.webp`, mirrored). The wordmark
  "נגיעה" is drawn in behind it, a kiss print stamps on with a slight overshoot, and "NEGIA · LIP ATELIER" fades in. On
  exit, a **smear-shaped hole** opens where the swatch was and grows until the page shows through. It is cut from
  `ydx/smear-mask.webp`, a mirrored alpha of the site's own smear. The pink inside the hole matches the hero field, so it
  reads as a match cut. The hero's own entrance is paused (`html.ydx-loading`) and starts as the hole opens.
  - Modes are chosen by an inline boot script before first paint. First visit: about 1.15s minimum display, then a
    0.76s reveal. Repeat visit in the same session (sessionStorage): a static frame, then a 0.52s reveal. Inside an
    iframe (the hub preview): a compressed animation and exit, done in under 0.8s, without waiting for `load`.
    Reduced motion: static, then a fade. Arriving through a page transition: burgundy cover, then the hole opens at
    once.
  - It cannot trap the visitor: there is a 4s safety timeout in `enhance.js`, and the inline script removes the loader at
    5s even if `enhance.js` never loads. The loader is injected by script, so it never appears without JS. It is
    `aria-hidden`, it is `position:fixed` (no layout shift), and it never locks scroll.
- **Page transitions (`/` and `/style-tile.html`).** Same-origin link clicks to the other page (not modifier clicks,
  `target`, downloads or same-page hashes) flood the screen with a burgundy smear growing from the click point (480ms).
  The next page opens a smear-shaped hole from the centre (520ms). If navigation is cancelled, the page is handed back
  after 3.5s. bfcache restores are handled.
- **Scroll reveals** (IntersectionObserver plus WAAPI; never CSS `transition`, so the site's own transitions survive):
  - Eyebrows, section metas and body copy rise in.
  - Value pills reveal like a swatch from their pigment edge.
  - Process, journal and form cards rise with a clip.
  - The atelier stage, compass result and manifesto portrait open as curtains.
  - The four material dabs are **painted on one after another**, the approach brush draws in, and the kisses on the
    values strip, compass and FAQ **stamp** on (`scale`, so the app's scroll-drift `transform` still runs).
  - The giant footer "נגיעה" is swiped in right to left.
  - The Latin Bodoni taglines are split into letters, which rise in a stagger, with a screen-reader copy kept. Hebrew is
    never split.
- **Heading highlights.** The pigment band behind `<em>` in pink sections now paints across, starting from the right,
  once its heading reveals. The smear under "מקום." in the manifesto draws itself in after the line rises.
- **Reactions to the app's own state** (MutationObserver; DOM untouched):
  - On a shade change, the Latin shade name ("DEEP BERRY") writes itself in left to right and the pigment swatch
    wipes on like a fresh stroke. Both play inside the app's circle view transition.
  - A compass answer makes its lipstick rise out of the panel.
  - A prepared inquiry gets **sealed with a kiss**: the kiss print stamps onto the note.
- **Hero scroll choreography.** As the hero leaves, the two display lines drift apart horizontally, the smear sinks
  slowly and the "פשוט. את." note lifts. This uses only the `translate` property, so the app's `transform` parallax and
  the CSS entrance are untouched.
- **Micro-interactions.**
  - Fine pointers: magnetic pill buttons, and a small pigment-dot cursor tinted with the active family that previews a
    family while hovering its swatch. It grows over links and shrinks in text fields. The native cursor is kept.
  - Hover: CTA arrows nudge in their arrow's direction; journal cards lift and their art tilts; process steps lift and
    their numbers flip to pigment; value-pill swatches widen; FAQ "+" buttons swell; footer links thicken; the footer lips
    swell.
  - The docked header pill now swells out from the wordmark instead of only fading.
- **Menu dialog.** Opens as a burgundy swatch dropping from the top (clip-path with `@starting-style`), the links
  follow in a stagger, and it closes the same way. Closing animates too, using `allow-discrete` on display and overlay.
- **Accordions.** FAQ and journal `<details>` get a real height animation where `::details-content` is supported. They
  degrade to the app's existing fade elsewhere.

## Bugs fixed

1. **Style tile, all viewports: the page background was wrong.** The page's inline `body{background:var(--tint)}` was
   overridden by the shared stylesheet's `body{background:var(--field)}`, which loads later. The pink intro card
   disappeared into a pink page. Fixed: the tint background now applies to the style tile only (`html:has(main.tile)`).
2. **Home, 360–400px: "אפרסק מואר" overflowed its hero chip** (a `nowrap` label wider than the chip). The chip labels
   now wrap at ≤420px.
3. **Style tile, mobile: bidi wrap split "Bodoni Moda Italic"** across the line around the Latin sample. Wrapped the font
   name in `<bdi>` with `nowrap`. This is a direct edit to the static HTML, marked with a `ydx` comment.
4. **Touch targets under 44px** (coarse pointers): the header CTA (40px), footer and footer-bottom links (23–26px), the
   hero "לגלות עוד", inline text links, journal summaries (38px) and the form inputs (36px). They now reach 44px through
   padding with matching negative margin, so the look and layout are unchanged.
5. **Focus visibility on burgundy panels:** focus outlines inside the atelier stage and compass result now use the tint
   colour, and the depth slider has a visible focus ring.
6. **Mobile menu, while closing:** the column layout only applied to `[open]`, which would have collapsed the closing
   animation into a row. The column is now set on the dialog itself.

## Deliberately left alone

- The minified bundle and `style-*.css`: no patches were needed.
- The app's circle view transition, Lenis and the `[data-reveal]` and `.swap` animations. I complement them rather than
  replace them.
- The hero lips' pointer parallax (inline `transform` owned by the app).
- The FAQ kiss bleeding off-screen on mobile. It sits behind the heading on purpose (`z-index`) and is clipped by
  `.page { overflow-x: clip }`, so it causes no horizontal scroll.
- The fallback-HTML `sitemap.xml`, `robots.txt` and `manifest.webmanifest`. They mirror the live worker as it is.
- `html { scrollbar-width: none }`. It is a deliberate art-direction choice of the original.
