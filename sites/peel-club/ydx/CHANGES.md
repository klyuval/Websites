# PEEL CLUB Citrus: design and motion pass (ydx)

## What the site is

A static, multi-page storefront for a fictional citrus soda: `/`, `/flavors/`, `/story/`, `/serve/`, `/mix/`. Each page is its
own `index.html` and they share one Vite bundle (`assets/main-yy70UqBS.js`, `assets/main-DFg1sV6z.css`).

- **Art direction:** loud, flat flavor fields. Each flavor sets `--field / --on / --ink / --pop` on `html[data-flavor]` (blue +
  yellow, burgundy + peach, green + lime, pink + plum), with pith cream `#fff4d9` sections and yellow "flip" sections. Wavy SVG
  section edges. Type is Anybody 900 (variable width, swinging between condensed `.tight` 58% and extended `.wide` 132–150%)
  over Bricolage. The motifs are cutout citrus wheels, wedges and halves, the unbroken peel spiral, fizz rings, and the 14° "rip"
  band with its pith and zest stripes.
- **Existing motion (kept as is):** Lenis smooth scroll. CSS `squeeze-in` and `drop-in` entrances on each page's first
  section. View-timeline `rise`, `roll`, `drift` and `sink` on copy blocks, can lineups, the ribbon, the type track and the
  chapter numbers. Infinite `bob`, `spin-slow`, `rock` and `fizz` loops, paused when offscreen through `.is-off`. Pointer
  parallax in the hero. The flavor-change "rip" wipe, which also re-runs the squeeze/drop WAAPI. The header hides on scroll
  down. A cross-document `@view-transition` with a diagonal clip. The `pop-in` dialog animation. The footer wordmark squeeze.

## Added

All additions live in `ydx/enhance.css` and `ydx/enhance.js`, plus the marked `ydx` lines in every HTML page: an inline
`<style data-ydx>` and a mode script at the end of `<head>`, and the curtain script as the first child of `<body>`.

1. **Loader: "Pouring your flavor".** A line-drawn can, tilted like the site's cans, draws itself. It then fills with soda in the
   visitor's own flavor colours: wavy surface, rising field-coloured bubbles, and the brand's printed half-wheel showing through
   as the level rises. Fizz rings drift around the can. The wordmark squeezes PEEL↔CLUB the same way the footer mark does. A
   `@property` counter reads "POURING BLOOD ORANGE 84%", using the actual flavor name. When the page is ready, the can tops up,
   the tab pops and the whole sheet **peels away on the site's 14° rip angle**, trailing the same pith and zest stripes as the
   `.rip` flavor wipe. The page's own entrance choreography (`squeeze-in`, `drop-in`) is paused behind the curtain
   (`html.ydx-hold`), so it plays as the peel passes and not unseen.
   - First visit: at least 1.0s, ready means fonts + decoded hero image (or `load`), capped at 2.6s. Repeat visit in the same
     session: wordmark only, with a quick peel. Hub iframe: a version of about 700ms. Reduced motion: static can and wordmark,
     then a 260ms fade. Back/forward: no curtain, because the browser's view transition handles it.
   - Safety: the inline script removes the curtain at 4.2s even if `enhance.js` never loads, and a pure-CSS `ydx-failsafe`
     animation hides it at 4.6s even with JS stopped. `aria-hidden`, no layout shift (fixed overlay), and scroll stays where the
     browser put it.
2. **Page transitions: citrus wheel out, peel in.** Same-origin link clicks are intercepted (not modifier/middle clicks,
   `target`, `download`, in-page hashes or files). A cutout **citrus wheel** in the current flavor (orange, blood orange, lime
   or grapefruit rind, pith and flesh) spins in from the click point, the flavor field floods out of its centre, and the
   destination name squeezes in ("The good pour"). The next page opens on the same field and label and **peels it away** on the
   rip angle. It takes about 600ms out and 620ms in. Links carrying `?flavor=N` use that flavor's wheel. A link clicked inside
   an open dialog closes the dialog first, because the top layer would otherwise sit above the overlay. Keyboard Enter starts
   the wheel from the link's centre. The cross-document view transition is skipped (`pageswap` → `skipTransition()`) only for
   intercepted clicks, so back/forward keeps the site's own diagonal. A bfcache restore never shows a covered page. Internal
   links are prefetched on hover or focus.
3. **Hero fizz.** The hero said "Move a little. Feel the fizz." but nothing fizzed. Now moving the mouse over the hero, the
   story opener and "It starts with a spark" releases fizz rings in the section's ink colour (capped at 36 at once). A tap on
   touch screens gives a small burst. "Add to your mix" buttons (stage, dialog, mix rows) also burst fizz out of the pill.
4. **Heading squeeze reveals.** Every section `h2.display` line (and the big "Mix things up ↗" links and the signoff) squeezes
   open from a condensed cut on entering the viewport, staggered by line. This is the brand's own `scaleX(.62)` gesture. The
   origin follows the text alignment.
5. **Kicker wipes and staggers.** Section labels wipe in left to right. The serve glasses rise one by one. The recipe tabs, the
   minicrate cans and the mix-builder slots pop in. These use individual `translate`/`scale` properties so the site's hover
   `transform`s still work.
6. **Hero scroll scatter.** As the hero scrolls away, the half orange and the wedge fly apart, the can tips back and shrinks
   slightly, and both headline lines squeeze in towards their outer edge.
7. **Scroll-reactive citrus.** The story wheel turns with the scroll on top of its slow spin, the manifesto wedge tips and
   drifts, and the stage half-orange turns.
8. **Magnetic pills.** `.button` and "Your mix" lean towards the mouse, using `translate` so the existing squash hover is kept.
   The bag and menu pills get the same squash/stretch hover and press as `.button`.
9. **Dialogs.** They used to vanish instantly on close. They now drop away and the backdrop fades (`allow-discrete`
   transitions). On open, the product can drops in rotating and the dialog copy staggers in.
10. **Mobile menu.** Links and the bag pill arrive one after another, not as a block.
11. **Browser chrome colour** (`theme-color`) follows the section under the header (field, pith, flip), not just the flavor.

All motion is behind `prefers-reduced-motion: no-preference` or a JS check. Hide-before-reveal styles apply only under
`html.ydx-js`, which `enhance.js` sets itself. Scroll work runs in rAF and bails out when nothing changed. There are no
libraries.

## Bugs fixed

| Page / viewport | Bug | Fix |
| --- | --- | --- |
| All pages, keyboard | Focus rings were `currentColor`, which on pill buttons is the button's text colour, the same as the section background. The ring was invisible on every `.button`, "Your mix", "Menu", the quantity +/- buttons and the dialog close. | Ring colours set per component (`--fg`, `--on`, `--ink`). |
| /story/, desktop 1280–1920 | The half orange in the opener sat on top of the "PEEL CLUB / CITRUS SODA" rail (yellow text on orange). | Orange resized and lifted clear of the rail and the "twist" line. |
| /flavors/, /serve/, /mix/, mobile | In the "Mix things up ↗", "Bring the whole club ↗" and "Give them a twist ↗" links, the wide line is a flex row. The words wrapped inside an anonymous flex item and the arrow floated detached at the far right. | On phones the line flows as text with the arrow after the last word. |
| All pages, mobile | Tap targets under 44px: Menu pill (42px), footer links (23px), wordmark (22px), bag "Remove" (~40px). | Heights and padding increased. |
| All pages | Dialog close had no exit animation (abrupt). | Close transition (see above). |

Checked and clean: no horizontal overflow at 360, 390, 1280, 1440 and 1920 on any page. No console errors or warnings
(desktop and iPhone 13, every page, through transitions, dialogs, back/forward, reload, iframe and reduced motion).

## Deliberately left alone

- The minified bundle and CSS are untouched (no patches needed). The site's own entrances, view-timeline animations, rip wipe
  and loops stay as they are. Everything added complements them on different properties or elements.
- The hero's overlapping type and can ("A lot alive." behind the can on phones) is intentional art direction.
- The mobile menu has no backdrop scrim. It reads as a deliberate drop-down panel in the brand style.
- The site's `@view-transition` stays, so back/forward navigations keep the original diagonal wipe.

## Reusing in the source project

Copy `ydx/` into `public/`, and copy the `ydx` lines from any page's `<head>` and the first `<script data-ydx>` in `<body>`
into the HTML template.
