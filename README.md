# Creative Review Studio

A standalone web tool for reviewing, comparing and QA-checking VDX ad creatives across all sizes simultaneously.

## Features

- **Universal ad renderer** — single `adframe.html` handles all products and sizes, no per-size HTML files
- **Grid view** — all ad sizes rendered live as iframes, grouped by platform
- **Compare mode** — side-by-side comparison of up to 3 sizes
- **QA panel** — per-size tracking pixel checklist, notes, and pass/fail status
- **Multiple variation support** — switch between creative revisions from the same campaign
- **Two showcase URL formats** supported:
  - Generic: `showcase.vdx.tv/{campaign}/#hash`
  - CCRV: `showcase.vdx.tv/cc/{revision}/{variation}/#hash`

## Usage

1. Open the tool at `https://khojichand.github.io/Creative-Review-Studio/`
2. Paste a showcase URL into the input field
3. Click **Load** — all sizes render automatically
4. Use **Compare Mode** to select up to 3 sizes for side-by-side review
5. Click **QA** on any card to open the QA panel for that size

## Architecture

```
index.html          — Main app (grid, compare, QA panel)
adframe.html        — Universal ad renderer (all products, all sizes)
js/
  app.js            — Core app logic
  ccrv.js           — CCRV API + URL parsing
  renderer.js       — adframe URL builder
css/
  app.css           — Styles
```

## Supported Products

| Product | Renders | Notes |
|---|---|---|
| VdxDesktopInframe | ✅ | All display sizes |
| VdxDesktopExpandable | ✅ | All display sizes |
| VdxMobileInframe | ✅ | All display sizes |
| VdxMobileExpandable | ✅ | All display sizes |
| VdxDesktopInstream | 📺 | Video unit — placeholder shown |
| VdxMobileInstream | 📺 | Video unit — placeholder shown |
| VdxDesktopInread | 📺 | Video unit — placeholder shown |
| VdxMobileInread | 📺 | Video unit — placeholder shown |
| OTT | 📺 | Not currently renderable |

## Chrome Extension Integration

The companion Chrome extension can open this tool directly with a campaign pre-loaded:

```
https://khojichand.github.io/Creative-Review-Studio/?showcase={showcaseUrl}
```

## Roadmap

- [ ] Live tracking pixel overlay (events from extension)
- [ ] Expotask integration for QA checklist auto-population
- [ ] Annotation / issue flagging per frame
- [ ] Copy verification against Expotask feedback
- [ ] Shareable review link
- [ ] AI-powered QA anomaly detection
