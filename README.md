# SUNFIZZ — Real Fruit Soda

A single-page, scroll-driven product site for SUNFIZZ sparkling fruit soda.
Four story sections run on one continuous scroll timeline: a 3D bottle carousel,
a sticky back-label story, a manifesto, and a receding bottle lineup you land on
at the end.

Live site: https://sunfizz-fofp0f.freebuff.site

## Source layout

The deployed site is one self-contained file, `index.html`: markup, CSS and the
Three.js r160 module all inlined. That file is built from the parts in
`site/partials`, which are concatenated in name order:

    site/partials/00-head.html   markup, CSS and the import map
    site/partials/10-app.js      script, part 1 (setup, environment, labels, geometry)
    site/partials/20-app.js      script, part 2 (backdrop shader, bottles, copy deck)
    site/partials/30-app.js      script, part 3 (choreography, UI, events, boot)
    site/partials/90-tail.html   closing script/body/html tags

## Build

    python3 build.py

That writes `index.html`. Serve it with any static server, for example:

    python3 -m http.server 3000

Then open http://localhost:3000

## Hosting

`worker.js` + `manifest.json` are an optional Cloudflare Worker wrapper for the
static output (`assetsDirectory` points at `./public`; copy the built
`index.html` there before deploying). Any static host works — the deployed file
is just `index.html`.

## Notes

- Three.js and the fonts load from public CDNs, so the page needs an internet connection.
- Bottle label artwork loads from a public image URL; if that fails, the page draws a canvas fallback label automatically.
- Drag or use the arrows to spin the bottles; SHOP jumps to the final lineup.
