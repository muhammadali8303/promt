# SUNFIZZ — Real Fruit Soda

A single-page, scroll-driven product site for SUNFIZZ sparkling fruit soda.
Four story sections run on one continuous scroll timeline: a 3D bottle carousel,
a sticky back-label story, a manifesto, and a receding bottle lineup you land on
at the end.

Live site: https://sunfizz-fofp0f.freebuff.site

## The build

The whole site is one self-contained file, `index.html`: markup, CSS, and the
Three.js r160 module are all inlined. Opening that single file is enough to run
and deploy the site — there is no build step and no dependencies to install.

## Run locally

    python3 -m http.server 3000

Then open http://localhost:3000

## Hosting

`worker.js` + `manifest.json` are an optional Cloudflare Worker wrapper that
serves the static files. Any static host works; just publish `index.html`.

## Notes

- Three.js and the fonts load from public CDNs, so the page needs an internet connection.
- Bottle label artwork loads from a public image URL; if that fails, the page draws a canvas fallback label automatically.
- Drag or use the arrows to spin the bottles; SHOP jumps to the final lineup.
