# FORM — ydx design + motion pass

## The site

- **What it is:** FORM, a private coaching web app (coach and client roles) built with Vite, React 19 and Supabase.
  It ships as one `index.html` with `#root`, a 620 KB minified bundle, an 86 KB CSS file, self-hosted fonts and five
  `/art/*.webp` photos. Views are React state, not URLs: overview / clients / calendar / training / nutrition /
  library / progress for coaches, and today / train / fuel / book / progress for clients. Messages, settings,
  notifications, search and invite open as `<dialog>` modals. The sign-in screen has a poster beside a form card.
- **Data:** everything comes from `…supabase.co/functions/v1/form-api` (`/config`, `/state`, …). That host is blocked
  in this container, so the preview only shows the sign-in poster with its "studio offline" error. To review the
  real screens I stubbed `/config`, `/state` and `/slots` with fake JSON using Playwright `page.route()`, in test
  scripts only. Nothing in the site was changed for that.
- **Art direction:** a dark "gym floor" (`#111` with a speckled chalk-dust dot pattern), chalk-white cards and
  Olympic bumper-plate colours as the system: red 25 kg, blue 20, yellow 15, green 10, plus steel. Each view has an
  area colour. Type is Big Shoulders Display for Latin headlines, Karantina for Hebrew headlines, IBM Plex Sans
  Hebrew for text and IBM Plex Mono for eyebrows. Motifs are a barbell sleeve with plates (the `.loadbar` progress
  bars, the `.plate-stack` weekly charts), the wordmark's "O" drawn as a bumper plate, and a plate-coloured strip
  on each card's edge. Default language is Hebrew (RTL) and English (LTR) can be switched on.
- **Motion that was already there (kept as is):** the Lenis smooth wheel scroll (desktop), a 240 ms
  opacity/translate WAAPI fade on `main.workspace` per view, `plate-on` for new loadbar plates, `set-pop` for
  completed sets and meals, `sheet-in` for dialogs, `toast-in`, `sleeve-in` for the sign-in barbell photo, the
  sliding mobile drawer, and a looping in-app loading screen (wordmark plus 4 plates). All of it already respects
  `prefers-reduced-motion`.

## Files

- `index.html` (the only HTML page). Each insertion is marked `ydx`:
  - two `preload`s for the display fonts (Big Shoulders 900 and Karantina 700), so headlines don't swap after the
    first paint;
  - inline `<style data-ydx>` with the loader's critical CSS;
  - `/ydx/enhance.css`, linked after the app CSS;
  - `/ydx/enhance.js`, loaded with `defer`;
  - the loader markup as the first child of `<body>`, outside `#root`, followed by a tiny inline boot script.
- `ydx/enhance.css` and `ydx/enhance.js`: the enhancement layer, in vanilla JS with no libraries.
- No changes to the minified bundle or the app CSS.

## Added

**Boot loader ("loading the bar"):** it paints before the 620 KB bundle runs.
- The wordmark's plate-"O" drops in.
- A barbell shaft draws on. Four bumper plates slam onto the sleeve with overshoot, red → blue → yellow → green,
  thickest first like real plates. The spring collar then clamps on and turns green ("locked"), the same signal the
  app's `.loadbar.is-locked` uses.
- A mono caption counts the weight, "מעמיסים את המוט · 20 → 160 ק״ג" ("Loading the bar · … KG" in English). It is
  pure CSS: an `@property` integer drives a `counter()`.
- **Exit:** the bar lifts 10 px, then the floor slides off in reading direction. Its trailing edge is a stripe of
  the four plate colours.
- **Timing:** about 1.25 s minimum on a first visit. It waits for the app to mount sign-in or the studio and for
  fonts, with a hard stop at about 3.3 s (about 4 s total).
- Repeat visits in the same session (sessionStorage) get a near-instant version. In an iframe (the hub) it is under
  0.8 s. With reduced motion it shows a static bar and fades out.
- The language is read from the app's own `form-language` key, so the caption and direction match before React
  boots.
- **Safety:**
  - a CSS animation hides the loader at 5.2 s;
  - the inline script removes it at 6 s even if `enhance.js` never loads;
  - wheel and touch input on the loader can't scroll the page underneath;
  - the app's own CSS entrance animations are paused under it (`html.ydx-loading`), so they play when it lifts.
- If the API hangs, the app's in-app loading screen takes over. It is visually the same composition, so the
  hand-off is seamless.

**Plate-edge transitions:** overlays appended to `<body>`, `pointer-events: none`, never blocking input.
- **Between views:** a dark curtain over the main area only (sidebar and topbar stay put) with the destination
  view's name in outlined display type. It slides off in reading direction (480 ms) behind a strip in that view's
  area colour plus a steel collar line. It detects changes of `main.workspace`'s `club-page-*` class with a
  MutationObserver and never intercepts clicks.
- **Sign-in ↔ studio (login, sample-studio, logout), the app's loading screen handing over, and Hebrew ↔ English
  switches:** a full-screen curtain with the four-colour edge.

**Choreography and micro-interactions:**
- **View entrances:**
  - blocks on screen (page title, stat tiles, panels, cards, rows) fade up with a 55 ms stagger;
  - blocks below the fold reveal on scroll (IntersectionObserver + WAAPI on the independent `translate` property,
    so the app's hover `transform`s are untouched);
  - this keeps running for 0.7 s after a view change, because training, nutrition and calendar render a second
    time when their data arrives.
- **Numbers count up** (lead "sessions completed", stat tiles, macro cards, progress stats). Only the existing text
  node is written to, and the count aborts if React changes it.
- **Charts and rings:**
  - the weekly `.plate-stack` columns build up plate by plate;
  - the chalk smear behind the big number wipes on;
  - plate rings fill from 0 (`@property --p`) and ease on later changes;
  - macro bars grow;
  - the progress trend line draws on, with points popping in after it.
- **Sign-in:** the FORM poster letters rise out of the floor, the poster copy and form card cascade in, the barbell
  sleeve follows the pointer slightly (fine pointers only), and the error alert gets a short shake.
- **Buttons and navigation:**
  - arrows nudge forward in reading direction on hover;
  - chalk cards (client, catalog, meal) lift like the stat tiles already do;
  - the logo's plate-O spins on hover;
  - the active sidebar plate slides on;
  - the active mobile tab icon bumps;
  - chosen days, slots, tabs and filters "lock in" with a small pop;
  - a completed set row flashes green;
  - drawer links and dialog lists (notifications, search, messages) cascade in;
  - the dialog backdrop fades in;
  - the live, sample and unread dots pulse.
- **Gating:** all motion sits behind `prefers-reduced-motion: no-preference`, and hide-before-reveal only applies
  under `html.ydx-js`.

## Bugs fixed

1. **Training and nutrition, all viewports:** the editable plan and day titles (`.title-input`,
   `.day-title-input`) used a −6 px start margin plus padding. Their dashed underline overshot the column and stuck
   out past the exercise cards' edge. They are now flush, and the focus ring got an offset instead.
2. **Client "Today", mobile (≤560 px):** the decorative vertical mono caption (`.hero-vertical`) ran underneath the
   eyebrow chip and headline. It is hidden at that width.
3. **Touch:** the headline-style `.name-button`s (client, exercise and meal names, 23–28 px tall) and short
   `.text-btn` links ("ביטול", 35 px wide) were under 44 px. They get an invisible 44 px hit area on coarse pointers
   with no layout change.
4. **Font swap on first paint:** the display faces were `font-display: swap` without preload. They are now
   preloaded, and the loader waits (max 1.5 s) for `document.fonts.ready`.
5. **The dialog backdrop snapped on while the sheet eased in.** It now fades in with the sheet.
6. **Form labels gave no cue for the focused field.** The label now darkens on `:focus-within`.

## Checked and left alone

- **The "studio offline" error and empty data in preview:** the Supabase host is blocked here. This is expected and
  I did not "fix" it.
- **App bug, not fixed:** the sign-in error message is translated when it is created, so after switching language
  it stays in the old language until the next attempt. Fixing it needs a bundle change. It is cosmetic, so I left
  it.
- **`favicon.svg` in the mirror is actually an HTML fallback page (a crawl artifact).** Nothing references it
  (`icon.svg` is the real icon), so I left it.
- **Layout:** no horizontal overflow at 1920, 1440, 1280, 390 or 360 px on any view or role.
- **Accessibility already in place:** focus styles (yellow and blue rings) are already good, and the app already
  handles reduced motion and RTL/LTR mirroring of arrows.
- **Not added on purpose:** dialog close animations and a cursor follower. Close animations would need to intercept
  React's unmount. A cursor follower would be noise in a daily-use tool.
