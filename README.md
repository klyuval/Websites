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

## Tools

- `node tools/serve.mjs [site]`: serves every site on its own port (table above), with the same single-page fallback as
  Cloudflare. `FILL=1` fetches any asset the mirror is missing from the live site (needs `NODE_USE_ENV_PROXY=1` behind a proxy).
- `node tools/shoot.mjs <url> <outDir> [desktop|mobile]`: walks a page top to bottom and saves screenshots plus a log of
  console errors and failed requests.
- `python3 tools/sheet.py <dir> <desktop|mobile> <out.png>`: tiles those screenshots into one contact sheet.
