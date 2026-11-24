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
