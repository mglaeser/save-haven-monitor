# Constraints for this repo (zero-build GitHub Pages site)

Deployment = `git push` to `main`, nothing else. **No bundler, no package.json, no
node_modules, no GitHub Actions, no build step, no service workers, no TypeScript,
no router, no analytics/trackers, no CSS frameworks.**

## Architecture (do not change)

- `index.html` — the only page. Loads pinned UMD CDN scripts (unpkg), then
  `dashboard.jsx` via `<script type="text/babel" data-presets="react">`.
- `dashboard.jsx` — the single source of truth for all content, data, and
  calculations. **Do not rewrite, reformat (no Prettier), or "improve" it.
  Do not touch any data constant, string, number, or calculation.** If you
  believe you've found a logic bug, report it — do not silently fix behavior.
- `.nojekyll` — empty, disables Jekyll processing.
- All URLs relative (`./dashboard.jsx`) — the site must work at any base path.

## Pinned CDN versions

react/react-dom 18.3.1 UMD · prop-types 15.8.1 · recharts 2.12.7 UMD
(`umd/Recharts.js` — 2.12.x ships no `.min.js`) · @babel/standalone 7.29.7
(exact pin — required for SRI). Every script tag carries an `integrity`
hash that must be recomputed on any version change (see README). No React
19 / Recharts 3.x — verify UMD named exports before any version change.

## Notes

- The Babel "precompile for production" console notice is accepted by design;
  do not "fix" it by adding a build step.
- Local preview: `python3 -m http.server 8000` (file:// is blocked by CORS).
- GitHub Pages: Settings → Pages → Source "Deploy from a branch" → `main` / root.
- Plan B (pre-compiling with esbuild) is allowed ONLY if the repo owner
  explicitly asks for it.
