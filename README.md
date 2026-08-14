# Mermaid Studio

A lightweight, browser-based editor for [Mermaid](https://mermaid.js.org/) diagrams with live preview and one-click export.

## Features

- Live rendering as you type
- Syntax-highlighted source editor
- Diagram templates and multiple tabs
- Export to **SVG**, **PNG**, and standalone **HTML** (with zoom/fit/pan)
- Copy PNG to clipboard
- Share diagrams via URL hash
- Light/dark themes
- Mermaid config via `%%init` frontmatter
- 100% client-side — no server needed

## Quick start

```bash
npm install
npm run dev
```

## Scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start the dev server                         |
| `npm run build`    | Type-check and build to `dist/`              |
| `npm run preview`  | Preview the production build                 |
| `npm test`         | Run unit smoke tests                         |
| `npm run test:e2e` | Run end-to-end browser tests                 |
| `npm run typecheck`| Type-check only                              |

## Deployment

The app is fully static and works on GitHub Pages. A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys `dist/` to Pages on every push to `main`.

---

Made with 💛 by Pranav Yaddanapudi