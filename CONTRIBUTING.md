# Contributing

You need Node.js (version in `.nvmrc`) and npm. The optional slicer test also needs PowerShell 7 and Bambu Studio.

```sh
npm ci
npm run dev       # local server with hot reload
npm run validate  # type check, lint and formatting, unit tests, production build
```

`npm run format` fixes formatting. Run `npm run validate` before opening a pull request; CI runs the same checks.

## The promise this project keeps

Every change must preserve these rules:

- **Nothing leaves the browser.** No analytics, CDNs, third-party scripts or fonts, remote APIs, or storage of user input, including `localStorage` and URLs. The Content Security Policy in `vite.config.ts` enforces this in production; don't loosen it.
- **At most four colors, all solid.** The four-slot limit lives in `src/lib/coaster/settings.ts`.
- **Every file prints and scans.** Meshes must be watertight and codes must decode.

## How it fits together

`src/lib` is framework-free TypeScript that turns settings into a file. `buildCoaster` in `src/lib/coaster/build.ts` lays out the code, logo, and text, resolves them into one non-overlapping region per filament on the top surface, and extrudes those regions into the inlay over a solid base. `src/lib/threemf/writer.ts` packages the parts. In the app this runs in a Web Worker (`src/app/builder.worker.ts`), and the Svelte components in `src/components` only edit settings and show results.

A few choices aren't obvious from the code:

- Polygon math uses integer micrometers through Clipper2. Colored regions grow by a few micrometers before overlaps resolve, so modules touching only at a corner merge instead of pinching into non-manifold edges.
- Caps are triangulated with a constrained Delaunay triangulation (cdt2d). Ear clipping leaves T-junctions when separate holes share a line, and slicers report those as open edges.
- The file is a standard 3MF: each part is its own object carrying a color from a materials-extension color group, and all parts join in one assembly. Bambu Studio maps those colors to filaments on import. Don't switch to Bambu's project format (`Application` metadata starting with `BambuStudio-`), because Bambu then ignores the colors and expects embedded printer presets.

## Tests

Tests are Vitest files named `*.test.ts`, next to the code they cover. They run under Node; files that need a DOM start with `// @vitest-environment jsdom`. `src/lib/coaster/build.test.ts` builds every pattern and corner style, checks that each mesh is watertight, and decodes the result with two QR libraries. Add a new style to the lists in `src/lib/qr/styles.ts` and it's covered automatically.

## Slicer smoke test

CI slices sample coasters with Bambu Studio's command-line slicer (version pinned in `.github/workflows/ci.yml`). That proves real import and slicing; color mapping happens in Bambu's GUI, so the writer tests cover it instead. To run it locally:

```sh
npm run samples
pwsh scripts/Test-BambuSlice.ps1 -BambuStudio <path to Bambu Studio executable> -ProfileDirectory <Bambu Studio resources>/profiles/BBL
```

## CI/CD

Pull requests run validation and the slicer test. Merging to `main` also deploys to GitHub Pages, which requires the repository's Pages source to be set to GitHub Actions. Pull requests are squash-merged.

CI rejects any `package-lock.json` entry that doesn't resolve from `https://registry.npmjs.org/`. If you install through a private mirror, rewrite those URLs before committing.
