# ydesign websites

Mirrors of the sites listed on [ydesign](https://ydesign.ydesign.workers.dev/he/), each with a design and motion pass on top.
Grain Flex is not included. `sites/ydesign` is the hub itself, kept for reference.

| Site | Live | Local preview |
| --- | --- | --- |
| Cassata | https://cassata-menu.ydesign.workers.dev/ | http://localhost:4101/ |
| FORM | https://form.ydesign.workers.dev/ | http://localhost:4102/ |
| Form & Field | https://form-and-field.ydesign.workers.dev/ | http://localhost:4103/ |
| AlexStudio | https://luma-atelier.ydesign.workers.dev/ | http://localhost:4104/ |
| MyChef | https://mychef.ydesign.workers.dev/ | http://localhost:4105/ |
| Negia | https://negia.ydesign.workers.dev/ | http://localhost:4106/ |
| Pack & Peak | https://pack-and-peak.ydesign.workers.dev/ | http://localhost:4107/ |
| PEEL CLUB Citrus | https://peel-club.ydesign.workers.dev/ | http://localhost:4108/ |
| PEEL CLUB Botanical | https://peel-club-botanical.ydesign.workers.dev/ | http://localhost:4109/ |
| STRATA | https://strata.ydesign.workers.dev/ | http://localhost:4110/ |
| TOMI | https://tomi-store.ydesign.workers.dev/ | http://localhost:4111/ |

## How the sites got here

Each site was crawled from its live address (`sites/<site>/` is what the worker serves as static assets). The live builds
are compiled (Vite / Next-style bundles), so the original source projects are not in this repository.

## The enhancement layer

Every site has a `ydx/` folder with the design and motion pass:

- `ydx/enhance.css` and `ydx/enhance.js`: the site's loading screen, page transitions, motion and the design fixes.
  They are plain files with no build step, linked from every HTML page of the site.
- `ydx/CHANGES.md`: what was reviewed, what changed and which bugs were fixed.

To carry the pass into a site's source project, copy its `ydx/` folder into that project's `public/` folder and copy the
lines marked `ydx` from the site's HTML here into the project's HTML entry (or layout).

## What changed on each site

Each site's `ydx/CHANGES.md` has the full analysis, every change and every fix (round 1 = first design pass,
round 2 = an independent review that audited round 1 frame by frame, on throttled network/CPU, for layout shift and by
keyboard, then fixed and refined it).

| Site | Loading screen | Transitions | Notable fixes |
| --- | --- | --- | --- |
| Cassata | Scoops drop onto a sticker cone; lifts with a melting-drip edge into the hero | Drip curtain between pages, circle reveal on language switch, flavour-sheet exit | Hero jumped 196px every 5s on phones (CLS 0.7 → 0); landscape hero; focus lost after closing a flavour |
| FORM | Plates slam onto a barbell, counter to 160 kg | Plate-coloured curtain between app views, language curtain | Hero caption on the wrong side in Hebrew; coach dashboard squeezed at 1001–1120px; tap targets |
| Form & Field | Proof sheet: wordmark inks from weight 200 to 800, tears away in five strips | Colour plates for long in-page jumps | Chapter index overflow at 1024px; landscape cover; mobile overlaps; fonts now WOFF2 (~760 → ~410 KB) |
| AlexStudio | Light meter needle to f/8, 7-blade aperture opens | Site's shutter carried across reloads, aperture on language switch, hero headings rise in | "MEET ALEX." clipped under the nav; Russian credits heading off-screen; mobile menu palette |
| MyChef | A table is set on the cloth, then the cloth is drawn off | Cloth-colour sweep on language switch | English/French visitors saw Hebrew for ~0.5s on load; course-stack scroll jank; hero card off-screen at 1024 |
| Negia | Lipstick swipe lays the smear, wordmark, kiss stamp; exits through a smear-shaped hole | Two-coat smear wipe between pages, pigment-drop mobile menu | Style-tile intro card invisible; chip overflow at 360; footer line never revealed; focus on faded controls |
| Pack & Peak | Contours draw, trail climbs to the summit, altimeter to 2,380 m; ridge-line exit | Two-band sweep for long chapter jumps | Changing trail stopped auto-scroll 750px short (also live); signpost overran its chapter; landscape hero card |
| PEEL CLUB Citrus | A can fills with the visitor's flavour; peels away on the rip angle | Citrus wheel spins in from the click, flavour floods out | Invisible focus rings on every main button; story orange covered text; tablet hero row crushed |
| PEEL CLUB Botanical | Can drawn in line, label wraps, sprig grows; peels off like a label | Label peel between routes, bag drawer exit | Loader exit was a full-screen layout shift (CLS 0.67 → 0); story pages clipped on phones |
| STRATA | Print head lays STRATA down in 38 layers; layers retract into the hero's own nozzle | Layer shutter for long section jumps | Deep links (/#materials) never scrolled (also live); hero caption clipped; uneven nav heights |
| TOMI | Device wireframe fills solid with the real 3D-model download progress | Language shutter, ring motif on the route curtain | Empty-cart checkout layout; step pills wrapping; English titles clipped on phones |
| ydesign (hub) | Kept the existing loader; repeat visits play it at 3x | Case dialog now closes as softly as it opens | Preview showed the wrong language after a fast scroll (also live); RTL arrow keys; case names broke mid-word |

## Tools

- `node tools/serve.mjs [site]`: serves every site on its own port (table above), with the same single-page fallback as
  Cloudflare. `FILL=1` fetches any asset the mirror is missing from the live site (needs `NODE_USE_ENV_PROXY=1` behind a proxy).
- `node tools/shoot.mjs <url> <outDir> [desktop|mobile]`: walks a page top to bottom and saves screenshots plus a log of
  console errors and failed requests.
- `python3 tools/sheet.py <dir> <desktop|mobile> <out.png>`: tiles those screenshots into one contact sheet.
