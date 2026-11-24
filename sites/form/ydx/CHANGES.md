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

## Round 2

**What I audited**
- **Loader and transitions:** recorded with real paint frames (CDP screencast, about 66 ms per frame) on desktop
  1440 and iPhone 13, for coach, client and the offline sign-in. I recorded the boot, a view switch, a language
  switch and a mobile bottom-nav switch.
- **Throttled load:** 400 kbps / 400 ms RTT (and a harsher 50 KB/s) with 4× CPU.
- **CLS and long tasks:** measured with and without the ydx layer (`/ydx/*` routed to 404). CLS is 0 to 0.0002
  either way.
- **Keyboard:** a Tab walk through the coach studio. Every stop has a visible yellow or blue ring.
- **Layout sweep:** 360, 390, 768, 844×390 landscape, 1024, 1040, 1100, 1440 and 1920, in Hebrew and English. I
  checked every coach and client view plus the sign-in. There is no horizontal overflow anywhere.
- **Loader modes:** the repeat visit (about 0.25 s), iframe (0.59 s total) and reduced motion (fade) all exit
  cleanly. No new console errors.

**Found and fixed**
1. **The loader hand-off flashed the finished page, then re-played its entrances.**
   - **Cause:** the curtain started sliding (on the compositor) before `release()` and `choreograph()` ran. That
     work was one 190–350 ms task: the style pass from un-pausing `#root *` plus a measure-then-animate loop that
     forced layout per element. Final numbers showed for a frame, then dropped to 0 and counted up again.
   - **Fix:** the app is released under the still-closed floor in one frame, and the choreography is set up in
     the next. The curtain is pulled only after both. `choreograph()` now measures every candidate first and
     then animates them, with no layout thrash.
   - **Result:** the long task at reveal went from 192–355 ms to none above 50 ms. Count-ups are now seen
     running (9 → 10 → 12) as the floor slides.
2. **On a slow network the loader exposed a blank floor for many seconds.**
   - **Cause:** `enhance.js` is `defer`, so it runs after the 620 KB module bundle. The CSS safety fade (5.2 s) and
     the inline 6 s removal therefore fired while `#root` was still empty. At 400 kbps that meant about 9 s of
     blank page before the app's own loading screen appeared.
   - **The safety nets now only fire early once the app has mounted something:**
     - the CSS fade uses `html:has(#root>*)`;
     - the inline fallback polls instead of using a fixed timeout;
     - an absolute 15 s cap remains.
   - `enhance.js` takes over the exit as soon as it runs, which also cancels the CSS fade so it can't fight the
     curtain.
   - After about 1.6 s the caption's red tick pulses, so a long wait still reads as "working".
3. **Dead hold in the loader:** the plates finished at about 0.95 s, but the exit waited about 1 s more. I
   tightened the sequence (plates every 120 ms, collar locks at 0.92 s, counter done at 1.0 s) and set
   `minShow` to 1.08 s. The first visit is now about 1.1 s plus a 0.75 s exit, down from about 2.2 s.
4. **The loader caption jiggled:** it is centred and the kg counter changed from 2 to 3 digits. The number now
   has a 3ch tabular slot.
5. **The logo ghosted over the plate edge:** the counter-drifting stage (and the transition labels) were painted
   over the four-colour edge as it passed. The edge now sits above the stage with a floor-coloured backing, so
   the mark slips behind the plates.
6. **Tab during the loader focused the hidden app** (the brand button). `#root` is now `inert` while the
   loader covers it and released at the hand-off.
7. **Client "Today" hero, Hebrew, every width:**
   - **Problem:** the vertical mono caption sat under the eyebrow chip and the first letter of the headline.
   - **Root cause:** its logical insets resolve against its *own* vertical writing mode (`inset-block` becomes
     left/right), so in RTL it landed on the right instead of the inline-end gutter.
   - **Fix:** it is pinned physically into the gutter (left in Hebrew, right in English). Round 1 only hid it
     below 560 px. That hide is removed because it now fits at 360 px too.
8. **Coach overview, 1001–1120 px:** the app stacks `.dashboard-columns` at a 1000 px *viewport*. The 232 px
   sidebar left about 740 px, so "Your people" wrapped names onto two lines and goals onto three, and scrolled
   sideways. It now stacks up to 1120 px.

**Added**
- **Language-switch curtain** now carries the target language in outline display type ("English" / "עברית"),
  like view switches carry the view name. Before, it showed about 200 ms of blank floor.

**Reviewed and kept as is**
- **View-switch curtain:** it cuts to the floor with the view name, then slides off in reading direction in
  480 ms. A sweep-in is not possible without showing the new view first, and the overhead is about 50 ms per
  switch.
- **Choreography and hover language:** consistent and not gimmicky.
- **No ambient or idle additions:** this is a daily-use tool, and the live dots already breathe.

**Left alone**
- **Dialog close animations:** still skipped. React unmounts the `<dialog>` and I won't intercept it.
- **Sign-in poster crop at 360–390 px:** the "FORM" word runs behind the plate photo. This is the app's own art
  direction.
