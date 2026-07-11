# Crisis Winners — and the 2026 AI question

An interactive five-tab atlas of assets that rose when markets collapsed — ten historical crises on a common t−60 → t+60 month scale, plus the potential 2026 AI-bubble configuration, an algorithmic battery, and an ex-ante identification playbook. It is a zero-build static site: plain HTML plus one JSX file transpiled in the browser by Babel Standalone.

> **Disclaimer:** historical/analytical synthesis, not investment advice; eToro links are navigation, not endorsement.

## Preview locally

`file://` will not work (Babel fetches `dashboard.jsx` via XHR, blocked by CORS). Use any static server, run from the repo root:

```
python3 -m http.server 8000
```

then open <http://localhost:8000>.

## Deploy

Push to `main` — that's it. GitHub Pages must be set once to **Settings → Pages → Source: "Deploy from a branch" → `main` / `(root)`** (not "GitHub Actions"). All URLs are relative, so the site works at `https://<user>.github.io/<repo>/` or any custom domain with zero configuration.

## Pinned CDN versions (unpkg)

| Package | Version |
|---|---|
| react / react-dom (UMD, production) | 18.3.1 |
| prop-types | 15.8.1 |
| recharts (UMD — loads `umd/Recharts.js`; 2.12.x publishes no `.min.js`) | 2.12.7 |
| @babel/standalone | 7.29.7 (exact pin, required for SRI) |

Every script tag carries a Subresource Integrity hash, so the browser refuses to run a script whose bytes don't match the pin. To bump a version: edit the version number in the `<script>` tag in `index.html` **and** recompute its hash from the new file (`openssl dgst -sha384 -binary <file> | openssl base64 -A`, prefix with `sha384-`) — or drop the `integrity`/`crossorigin` attributes from that tag if you'd rather not maintain hashes. For React or Recharts major bumps, first verify the new UMD bundle still exposes the same globals/named exports used in `dashboard.jsx` (React 19 dropped UMD builds; Recharts 3.x changes exports).

## License

MIT — see [LICENSE](./LICENSE).
