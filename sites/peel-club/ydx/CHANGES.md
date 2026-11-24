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

## Round 2

A second review of the first pass, done as a first-time visitor would see it and as a QA engineer would test it.

### What was audited

- **Loader and transitions, as frame sequences.** Recorded with CDP screencast on desktop (1440) and iPhone 13, at normal
  speed and on slow 3G (400 kbps, 400 ms RTT) with 4x CPU throttling. Also recorded a late-arriving `enhance.js` (delayed
  6 s), repeat visit, back/forward, hub iframe and reduced motion.
- **CLS.** Measured per page and viewport, with and without the layer (`/ydx/*` routed to 404), with the shifts attributed
  to their source nodes. Long tasks and scroll frame times were measured under 4x CPU throttling, with and without the layer.
- **Keyboard.** Tabbed through every focus stop on the home page, opened and closed the dialogs and mobile menu with Escape,
  and checked that focus came back.
- **Layout.** Checked for overflow at 360, 390, 768, 1024, 1280, 1440 and 1920, plus an 844×390 landscape phone, on all 5
  pages, and took scroll-walk screenshots at 768, 1024 and landscape. The site is English-only, so there is no RTL.

### Found and fixed

| Where | Problem | Fix |
| --- | --- | --- |
| Loader, slow network | **The section headings could stay invisible for good.** When `enhance.js` arrived after the inline 4.2 s safety timer had already removed the curtain, `leaveCurtain()` returned early. The `held` promise then never resolved, so no `.ydx-sq` or `.ydx-kick` element was ever revealed. | `enhance.js` now releases the hold when the curtain is missing or already gone. The early return also releases it. |
| Loader, slow network | The safety timer started when the body script ran. On slow 3G, CSS blocks painting for about 5 s, so the timer fired with almost no visible loader and then *snapped* the curtain away (`remove()`). | The inline script stamps `window.__ydxT0` on the curtain's first frame (rAF) and starts the 4.0 s safety net there. The net now fades out over 300 ms instead of cutting. `enhance.js` measures its minimum and cap from that stamp, not from navigation start. |
| Loader, every first visit | As the sheet peeled, the strip it uncovered first showed an empty hero, because the page's entrance was only un-paused 30% into the peel. | The page's entrance is released as the peel starts. The headline is already squeezing open when it comes into view. |
| Loader, first ~250 ms | The printed half-wheel's spokes floated on their own in empty space before the soda reached them, next to a lid that was not yet attached to a can. | The wheel is masked by the liquid (an SVG `<mask>` driven by the same `c-liq` animation). It now only shows "printed" where the soda is. |
| Loader, CLS | The loop that squeezes PEEL↔CLUB by font width changed the wordmark's width every frame. That moved the centred stack, can included, and the 84%→100% counter widened the meta line. It added about 0.01 CLS on phones. | The wordmark is a fixed 5.62em box with PEEL anchored left and CLUB anchored right (`direction:rtl`, so its start edge never moves). The counter has a min-width that fits "100%". The loader now adds **0** CLS: mobile home went from 0.0098 to 0, and desktop is the same as without the layer. The rest of the desktop figure comes from the site's own footer squeeze. |
| Page transitions | A click took about 1.6–1.8 s to reach an open page. The wheel took 600 ms, then the next page held its label for up to 1 s while it waited for the hero image to decode. | The wheel is a little quicker (navigation at 540 ms). An arriving page waits for fonts and the lead image for at most **320 ms** after its first frame, then peels in 560 ms. The page's own `drop-in` covers an image that is still decoding. |
| Home hero, 701–1180 px (tablet, small laptop, landscape phone) | The desktop 3-column foot was too narrow. "A grown-up bite. A refreshingly wild side." broke into four ragged lines, and the scroll cue became a six-line sliver jammed against the swatches. | The tagline sits above its button. Under 900 px, the cue gets its own centred line above the row. |
| Mobile menu (≤900 px) | The panel is the same flat field as the hero beneath it, so it ended on an invisible line that sliced the hero can in half. | The panel closes on the brand's rip edge, a pith band and zest line, as in the flavour wipe. |

Checked and fine:
- Focus is never trapped by the curtain or the transitions. The curtain and overlays are `aria-hidden` and contain no focusables.
- Escape closes the product and bag dialogs and the mobile menu, and focus returns to the trigger.
- Focus rings are visible on every stop.
- No overflow at any width.
- No console errors or warnings in any mode, including slow network, late script, iframe, reduced motion and back/forward.
- Scroll frame times and long tasks under 4x CPU throttling are no worse than without the layer.

### Added (second improvement loop)

- **Poured section edges.** The site's wavy section edges are flat as they come up the screen. They swell to full
  amplitude with a slight overshoot as they arrive, like a poured surface settling. It is scroll-driven (`view()`
  timeline, the same mechanism as the site's own `rise` and `roll`), so it costs nothing on the main thread. It is off under
  reduced motion and needs `animation-timeline` support.

### Kept / deliberately not added

- The hero fizz, magnetic pills, heading squeezes, kicker wipes and dialog exits from pass 1 still feel on-brand and
  restrained (the fizz is capped and subtle). Nothing was removed.
- No cursor follower and no fly-to-bag animation: the header (and its bag) is hidden while scrolling down, so a can flying
  into it would usually land offscreen. The site already bumps the bag count and drops a can top into the mix slots.
- "A little twist of fate." overlapping the half orange on phones, and the gap in "A lot   alive." at tablet portrait,
  are the site's own layered art direction.

## Round 3

A line-by-line review of the layer (inline head/body scripts, `enhance.js`, `enhance.css`) for production, plus failure-mode
testing. Each bug below was reproduced with a focused Playwright (or raw CDP) script before the fix and re-run after it.
Scripts are in the round-3 scratch folder (`t-*.cjs`, `t-bgraw.mjs`).

### Production conditions

- **Live headers** (`curl -sI https://peel-club.ydesign.workers.dev/`): `cache-control: public, max-age=0, must-revalidate`, no CSP,
  no `X-Frame-Options`. Nothing in ydx (inline scripts/styles, the `onload` handler on the stylesheet link) can be blocked.
  Bfcache tests ran headful under Xvfb with the HTML served using the live `cache-control` header, because the preview
  server's `no-store` disables bfcache.
- **Failure matrix**, run on `/` and `/story/`. In every mode the page ends up uncovered, un-held, with the hero visible and
  nothing left at `opacity:0` after scrolling the whole page:

| Mode | Before (usable at, app boot) | After |
| --- | --- | --- |
| normal | 2.1–2.3 s, app 0.2 s | same |
| JS disabled | no curtain, no hold, content visible | same (enhance.css now comes through `<noscript>`) |
| `enhance.js` 404 / both 404 | 4.6 s (inline safety net) | same |
| `enhance.css` 404 | 2.2 s | same |
| `enhance.js` +8 s | 4.7 s, app 0.17 s, **DOMContentLoaded 8.1 s** | 4.5 s, DOMContentLoaded 0.03 s |
| app bundle +8 s | 4.7 s | 2.1 s (the curtain no longer waits on the bundle) |
| **`enhance.css` +8 s** | **10.1 s, app boot 8.06 s, blank page 8 s** | 2.1 s, app 0.05 s |
| page frozen 5 s during load (`Page.setWebLifecycleState`) | 5.4 s | 5.5 s |
| real background tab (raw CDP, `background:true`), `enhance.js` 404 or +8 s | **4.5 s of loader after the tab is brought forward** | 0.01–0.1 s |
| hub iframe (cross-origin parent) / sandboxed iframe | frame mode, ~1 s; works sandboxed | same |

### Found and fixed

| # | Where | Bug (and how it was reproduced) | Fix |
| --- | --- | --- | --- |
| 1 | Head links | **A slow `enhance.css` blanked the page and held up the site's app.** A parser-inserted stylesheet blocks rendering and every later script: the inline curtain script, and through it parsing and the deferred app module. Delaying the file 8 s pushed the app's boot to 8.06 s. A slow `enhance.js` (`defer`) also delayed `DOMContentLoaded`/`load` to 8.1 s. | `enhance.css` loads non-blocking (`media="print" onload="this.media='all'"`, plus a `<noscript>` link so it still applies without JS). The critical loader CSS is inline anyway. `enhance.js` is `async` and waits for the parsed DOM itself (`readyState`/`DOMContentLoaded`), so it tolerates any arrival order. CLS stays 0 on first load and on back/forward. |
| 2 | Page transition, back button | **Back pressed during the wheel, then forward, navigated to the clicked page by itself.** The page went into bfcache with the `setTimeout(go, 540)` still pending, and a forward restore fired it. Reproduced headful with bfcache: back at 150 ms, forward, and the page ended up on `/mix/`. | The timers are cancelled on `pagehide`. |
| 3 | Page transition | **Overlay stuck forever when the navigation does not commit** (204 response, Esc/stop, a download), with every later click swallowed. Reproduced by routing `/mix/` to a 204: the overlay was still up at 8 s and the next click timed out. | `unleave()`: if the page is still alive 5 s after `location.assign`, or on Esc, the overlay fades out and links work again. The hand-off label is also cleared. |
| 4 | Page transition → next page | **Wrong label on an unrelated page.** The `ydx-nav` hand-off was not tied to its destination. After a navigation that did not happen, any page loaded within 6 s opened in "nav" mode with the wrong label ("Build a mix" over `/story/`) and skipped its loader. The same happens with a new tab, which gets a copy of sessionStorage. | The hand-off stores the destination path. The inline mode script only uses it on that path. |
| 5 | Inline safety net | **Background tab: the net never started.** It ran from the first `requestAnimationFrame`, which never fires in a hidden tab. With `enhance.js` failing or late, a visitor who switched to the tab got 4.5 s of loader on a page that had loaded long before. Reproduced with raw CDP (Playwright always reports pages as visible). | The net starts on the first frame or, if the document is hidden (now or before the first frame), straight away. The net also marks the session as seen. For the short modes (`nav`/`short`/`frame`) it is 2.5 s instead of 4 s, so a failed `enhance.js` covers an arriving page for less time. |
| 6 | Curtain exit | **A throw inside `leaveCurtain` left the curtain covering the page.** It had already set `data-out`, so the inline net stood down, and only the CSS failsafe hid it at about 4.9 s. It then stayed in the DOM. Reproduced by making `animate()` throw on the sheet. | The exit is `…then(leaveCurtain).catch().then(done)`: the curtain is always removed and the hold always released. |
| 7 | Click interception | `href="#"` (and `/#` on the home page) played the full wheel and reloaded the page. A bare `#` gives an empty `URL.hash`, so the in-page check missed it. | Same path + search with any fragment, bare `#` included, is left to the browser. |
| 8 | Click interception | SVG `<a>`: `a.href` is an `SVGAnimatedString`, so it resolved to `/[object SVGAnimatedString]` and the wheel led to a 404. Latent: there are no SVG links on the site today. | Only `HTMLAnchorElement`s are intercepted or prefetched. The prefetcher now uses the same filter (no files or downloads). |
| 9 | Reduced-motion transition | Navigation waited on the fade's `finished` promise, which never settles in a background tab. | Timer (170 ms). |
| 10 | `enhance.js` included twice | Every listener, observer and fizz zone was doubled. The click itself was already safe. | Run-once guard (`window.__ydxPeel`). |

### Checked and fine

- Modifier, middle and shift clicks, `target=_blank`, `download`, `javascript:`, external links and files are not intercepted. A
  double click gives exactly one navigation. Keyboard Enter starts the wheel from the link's centre. A link inside an open
  dialog closes the dialog first. Links in the mobile menu work. Reduced motion is a plain fade both ways.
- No storage access without try/catch (a sandboxed iframe throws on sessionStorage, and the layer still works there).
  There are no monkey-patches of app globals.
- The features are guarded or degrade: `animation-timeline` sits under `@supports`. `@starting-style`, `allow-discrete` and
  `@property` are simply ignored or static where unsupported (Firefox/Safari: the dialog exit and the loader counter just
  don't animate). Range media queries need Safari 16.4+. The `pageswap` view-transition skip only runs when the event exists.
- No new console errors on any page (desktop and iPhone 13 scroll-walks, transitions, back/forward, iframe, failure modes).

### Known limitations

- Because `enhance.css` is non-blocking, a late copy can arrive after first paint when there is no curtain: a back/forward
  visit that misses bfcache and finds the file uncached. Its small layout fixes then snap in. With the file
  artificially delayed 400 ms this measured 0.0033 CLS on `/story/` desktop (the lifted half orange) and 0 elsewhere. With a
  normal network it is 0.
- The 5 s "navigation did not commit" recovery cannot tell a dead navigation from a server that takes more than 5 s to
  answer. In that case the old page reappears briefly before the new one opens, with its full loader.
- A page loaded in a background tab skips the loader and peel: they complete unseen, and the page is ready when the tab
  is shown.
- Pre-existing, not ydx: navigating to a non-HTML file (such as an image URL) logs "Transition was aborted because of
  invalid state" from the site's own `@view-transition`. It happens without the layer too, and the site has no such links.
- Safari and Firefox behaviour was reasoned from the code; only Chromium was available.

## Round 4

A final creative-director pass. I walked every page scroll by scroll at 1440 and on an iPhone 13 (the site is
English-only, so there is one language), opened the bag and the dialogs, and clicked through the links. After three rounds
the site is coherent: every section has its own entrance, the loader and the wheel/peel transitions carry the brand, and
nothing reads as generic. Only a few things still let it down, so this round is small.

### What I judged, and what changed

| Where | What was wrong | Change |
| --- | --- | --- |
| `/flavors/`, `/serve/`, `/mix/`, phones (360–700px) | The end-of-page links that lead on to the next page ("Mix things up ↗", "Bring the whole club ↗", "Give them a twist ↗") broke into a ragged stair at the site's 25vw: "Mix / things / up ↗", "Bring the / whole / club ↗", and "Give them / **a** / twist ↗" with a lone "a". It was the weakest typography left on the site. | Sized so that each one keeps the desktop's two-line shape (condensed line over wide line) at every width from 360 to 700px (`19vw`, wide line `.5em`). Line counts were measured at 360, 390, 430 and 700 on all three pages. There is no overflow at any width. |
| Same pages, desktop | These big links only nudged their arrow on hover. They were the one large display element with no hover gesture, while the footer wordmark right below them squeezes. | On hover and on keyboard focus the condensed line widens a little and the wide line stretches (`font-stretch`, .7s `--out`). This is the same gesture, with the same timing, as the footer wordmark. It causes no layout shift (the section height is unchanged). |
| Wordmark on `/`, "Build a mix" on `/mix/`, the active nav link, the bag's "Build your mix" on `/mix/` | A link to the page you are already on played the full citrus-wheel transition (labelled with the page you were already on) and then **reloaded the same page** with its loader. From the bag, the dialog closed and you landed back where you started. It was a dead end that looked like navigation. | Now nothing reloads. Any open dialog closes through the site's own handler, which restarts Lenis and returns focus to the trigger. The mobile menu closes through its own toggle, so `aria-expanded` stays correct. The link gives the brand's squash (`scale` 1.05/.95, 460ms) as a "you're here", and the page glides back to the top. The glide waits until Lenis has finished easing a wheel (`lenis-scrolling`), because Lenis would otherwise cancel it. The wait is capped at 1.2s. Under reduced motion there is no squash and the jump is instant. |
| `enhance.js` motion language | The easings were seven loose cubic-beziers. | They are now named tokens: `OUT` and `IN_OUT` (the site's own `--out` / `--in-out`), `PEEL` (the layer's one signature curve, for everything that peels) and `FLOAT` (fizz only). The kicker wipe now references `IN_OUT` (the value is unchanged), and the wheel spin moved from a near-identical one-off curve to `IN_OUT`. The wheel's flood keeps its own tuned curve, with a comment explaining why. I recorded the transition as a screencast with `PEEL` and with `OUT` on the flood. `PEEL` left the destination label sitting over a half-covered wheel. `OUT` flooded at once and hid the wheel. |
| `/story/` opener | **Removed as noise:** the mouse-move fizz trail on "A little twist of fate." Nothing on that section invites it. On the home hero it answers "Move a little. Feel the fizz.", and the "It starts with a spark" chapter already floats fizz rings. On the opener it was just decoration. | The trail is now only on the hero and the spark chapter. |

### Looked at and left alone

- **Section hand-offs.** Some sections meet on straight cuts (hero to cream, cream to yellow) and others on the poured wavy
  edge. That is the site's own rhythm of flat fields, and a wipe added on top would fight the `rise`/`roll` entrances that
  already play there.
- **Empty and data states.** The empty bag ("Your next favorite is waiting…" plus a CTA), the empty 0/24 crate and the
  disclosure lines all read well and are on-brand. Nothing here is fetched from a remote API.
- The loader, the wheel/peel transitions, the heading squeezes, the magnetic pills and the dialog exits still hold up and are
  not duplicated anywhere. I added no cursor follower and no fly-to-bag animation (the reasons are in round 2).

### Regression (round-3 suite re-run against the round-4 code: `peel-club-r4/reg/`)

- **Failure matrix** (`t-matrix`, `/` and `/story/`): every mode ends up uncovered, un-held, with the hero visible and nothing
  left at `opacity:0` after a full scroll. Usable at: normal 2.2–2.4s, js404 4.6s, css404 2.2–2.3s, both404 4.6–4.8s,
  js +8s 4.6s (DCL 0.06–0.13s), app +8s 2.2s, frozen 5.4s, css +8s 2.1–2.3s. These are the same as round 3.
- **Click edge cases** (`t-clicks`, `t-vterr`): double click gives one navigation. Ctrl, shift and middle clicks, `_blank`,
  `download`, `javascript:`, `#`, `/#flavors`, files and SVG links are not intercepted. Enter starts the wheel from the link
  centre. A link in an open dialog closes the dialog first. The only page error is the known pre-existing view-transition
  abort on an image URL, and it appears with ydx off too.
- `t-abort` (204, overlay cleared, next click works), `t-stale` (no stale label), `t-throw` (curtain gone, no hold),
  `t-frame` (hub iframe curtain gone at about 1.2s; included twice gives one overlay and one wheel), `t-rm`, `t-nojs` and
  `t-basic`: all pass. The sandboxed-iframe case logs CORS errors for the site's own assets from origin `null`. That comes
  from the test harness, not from ydx.
- **bfcache** (headful, Xvfb, live `cache-control`): `t-bf2` restores from bfcache. `t-backmid` passes (back during the wheel,
  then forward, stays on `/flavors/`, restored from bfcache, no stray navigation). `t-bf` times out on Playwright's
  `goBack` waiting for `load`, and does so identically with the round-3 files routed in, so it is a harness limitation.
- **Background tab** (`t-bgraw`, raw CDP under Xvfb): usable 8ms (normal) and 108ms (`enhance.js` late) after the tab comes
  forward.
- **CLS** (`t-cls`): 0 on `/`, `/story/` and `/mix/`, desktop and mobile, on first load and on back without bfcache. One run
  logged 0.0066 on `/mix/` desktop (the site's own disclosure line) while other tests were running in parallel. It did not
  reproduce in two quiet re-runs, with either the round-3 or the round-4 files.
- **New behaviour**: the same-page links (desktop nav, the bag on `/mix/`, the mobile wordmark with the menu open, reduced
  motion, keyboard Enter on the footer mark) do not navigate, close what is open and end at `scrollY` 0. Lenis wheel
  scrolling still works afterwards, and normal links still transition.
- **`shoot.mjs` walks**, desktop and mobile, all 5 pages: 0 console errors or warnings, 0 failed requests. No horizontal
  overflow at 360, 390, 768, 1280 or 1920.
- **Live headers** (`curl -sI`): `cache-control: public, max-age=0, must-revalidate`, no CSP and no `X-Frame-Options`. This is
  unchanged, so nothing in the layer can be blocked.
