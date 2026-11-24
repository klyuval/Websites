# MyChef Israel: design + motion pass (ydx)

## The site

- **Structure.** A single page built with vinext (React 19, RSC, hydrated over the whole `document`). The same
  `index.html` is served at `/`, `/en/` and `/he/`. The language (Hebrew RTL, French, English) is chosen on the
  client from `localStorage['mychef-language']`, and switching it re-mounts the whole page and jumps to the top.
  Sections: hero (`#home`), the "quilt" of four experiences (`#experiences`), four sticky "course" cloths
  (`#exp-0` to `#exp-3`), the chef (`#yohann`), how it works (`#details`), the FAQ, the invitation (`#contact`) and the footer.
  There is also a booking dialog (Base UI) and a floating "plan the evening" dock button.
- **Art direction.** Woven table cloths (`weave.png`) in teal, linen, pomegranate, saffron and wine, with dashed
  stitched borders. Top-down table settings of cut-out photos (plates, cutlery, glasses, candles, spices). Paper
  place cards and price "bills" in Caveat / Gveret Levin handwriting. Frank Ruhl Libre 900 headlines. The
  `mychef✳` wordmark, with a saffron ✳ (the favicon is a plate with that ✳ on it).
- **Existing motion.** The site already does a lot, so I built on it and did not repeat any of it:
  - table pieces "set down" when a section enters (`[data-lay].is-laid`)
  - `[data-rise]` blocks fade up
  - hero pieces follow the pointer
  - Lenis smooth scroll
  - the courses stack as sticky cloths
  - the dock slides in
  - the booking sheet fades and tilts in

## Added

- **Loading screen** (inline critical CSS + `<ydx-loader>` markup in `index.html`; exit in `enhance.js`).
  - A table is set on the teal cloth: an SVG plate (like the favicon) sets down, then the fork and knife. A
    saffron sauce swoosh is brushed across the well, pomegranate and herb-oil dots pop, the ✳ garnish spins
    on, steam rises, and the wordmark fades up. It leaves by lifting like a cloth: the panel rises with a
    curved hem, the setting drifts up faster, and the page's own "set the table" entrance starts underneath.
  - It waits for `load`, React hydration, the stored language being applied, and `document.fonts.ready`.
  - Timing: at least 1.2s on the first visit; about 0.3s + 0.48s exit on repeat visits (`sessionStorage`); at
    most 0.8s in an iframe; a plain fade with reduced motion. Hard timeout is 4s, plus a CSS-only bail at 4.6s
    in case the script never loads. It is hidden without JS, `aria-hidden`, and causes no layout shift.
  - It uses a custom element on purpose. A `<div>` as the first child of `<body>` was picked up by React's
    hydration as its app root, which caused error #418 and a full client re-render.
- **Language transition.** Clicking a language (pointer or keyboard) sweeps the site's four cloths (saffron,
  pomegranate, linen, teal) across the screen in the new language's reading direction (right to left for
  Hebrew), with the language's name and ✳ on the teal cloth. The switch happens while the screen is covered,
  then the cloths sweep off. It takes about 0.7s and hides the site's jump to the top and its re-mount. The
  page's entrances are held until the screen is revealed.
- **Entrances** (CSS keyed off the site's own `.is-laid`, so they fire with the table pieces):
  - Hero, course, invitation and quilt headlines rise line by line through a mask. Lines are never split
    into letters, so Hebrew stays intact. The four clipped quilt titles stay in sync.
  - Then come the tag "stamp", the copy, the detail line and the actions.
  - The hero header drops in, and the hero tabs and quilt strip names stagger in.
  - Everything is paused while the loader or the wipe covers the page.
- **Handwriting writes itself in** in its own direction when scrolled to: the "Yohann" signature, the
  scribbles, the dish captions and the quilt hint.
- **Course stack depth** (desktop sticky layout only): as the next cloth is pulled over, the one underneath
  sinks to 94.5%, rounds its corners and dims.
- **Hero depth:** the table setting drifts slower than the page as the hero scrolls away. This is desktop
  only, and uses `translate` so it does not fight the site's pointer parallax.
- **Micro-interactions** (fine pointers only):
  - The main buttons and the round arrow buttons are magnetic (`translate`, so `:active` and the dock are untouched).
  - The ✳ turns on wordmark hover.
  - Nav underlines and underlined links draw in from the reading start.
  - Step cards, price bills and the gallery print lift and straighten on hover.
  - The tab numbers nudge up, and the occasion swatches lift.
- **Booking dialog:** its contents arrive in order after the sheet lands, and the place card sets down.
- **FAQ:** answers open and close smoothly (`::details-content` + `interpolate-size` where supported), and the
  minus sign turns in.

## Bugs fixed

1. **Hebrew flashed at English and French visitors (all viewports).** The server always renders Hebrew, and a
   stored EN/FR choice was applied about 0.5s after hydration. The loader now waits until the stored
   language is applied.
2. **Small tap targets on touch (mobile).** The language buttons were 31px tall, the text links ("Enter the
   table", "More from the kitchen", WhatsApp) 32px, and the footer email and phone 28px. They now have
   invisible hit areas of at least 44px, with the look unchanged. The course arrows went from 42 to 44px.
3. **The floating dock covered the footer's image-credit line (mobile, end of page).** The footer now has
   bottom padding.
4. **Spice bowls hid part of the chef headline (desktop).** At 1280 to 1920 the bowls covered "israélie|n"
   (FR at 1920) and parts of the other lines. The headline now sits above the bowls, like the hero's type over
   its cutlery.

## Left alone, on purpose

- **The page title** is English ("MyChef Israel — A table to remember") in all three languages. It needs
  copy from the client, and it is rendered by the app's metadata.
- **Headline/photo overlaps** in the hero and the courses (a period touching a platter, a headline running
  under a knife) are part of the collage composition, so they are kept.
- **The date field** shows `mm/dd/yyyy` in Hebrew. That is the browser's native date input following the OS
  locale.
- **`/_next/static/chunks/e.currentHref`** is a crawl artefact (a copy of the HTML), not a page.
- **No custom cursor and no marquee:** neither belongs to this site's quiet, tactile direction, and the hero
  already responds to the pointer.

## Files

- `ydx/enhance.css`, `ydx/enhance.js` (about 26KB together, unminified and commented).
- `index.html`: the lines marked `ydx`:
  - in `<head>`: a boot script that sets html flags and the stored language and preloads two fonts, the
    loader's critical `<style data-ydx>`, and links to `enhance.css` and `enhance.js` (`defer`)
  - as the first child of `<body>`: the `<ydx-loader>` markup
- No minified bundle was edited.
