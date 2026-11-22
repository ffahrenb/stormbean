# Drittanbieter-Komponenten

| Komponente | Verwendung | Lizenz |
|---|---|---|
| [three.js](https://threejs.org/) r170 (inkl. `examples/jsm`: OrbitControls, Sky, GTAOPass, EffectComposer, BufferGeometryUtils, RoundedBoxGeometry) | 3D-Darstellung, im Bundle `dist/app.js` enthalten | MIT, © 2010–2024 three.js authors |
| [world-atlas](https://github.com/topojson/world-atlas) 2.0.2 / [Natural Earth](https://www.naturalearthdata.com/) 1:50m | Ländergrenzen (`public/world.json`, mit `npm run world` erzeugt) | ISC (world-atlas); Natural Earth: Public Domain |
| [topojson-client](https://github.com/topojson/topojson-client) 3.1.0 | nur Build-Skript `scripts/prep-world.mjs` | ISC |
| NASA Blue Marble / Topografie (via [three-globe](https://github.com/vasturiano/three-globe) Beispiel-Texturen) | `public/tex/earth-day.jpg`, `earth-bump.jpg`, `earth-water.jpg` (verkleinert, neu kodiert) | NASA-Bilder: Public Domain; three-globe: MIT |
| [Saira Stencil One](https://fonts.google.com/specimen/Saira+Stencil+One), [Archivo](https://fonts.google.com/specimen/Archivo) via [Fontsource](https://fontsource.org/) | `public/fonts/*.woff2`, lokal eingebunden (keine Anfragen an Google) | SIL Open Font License 1.1 |
| [esbuild](https://esbuild.github.io/) 0.24 | Bundler (nur Entwicklung) | MIT |

Alle inhaltlichen Quellen (Studien, Datensätze, Kataloge) stehen vollständig im Reiter «Quellen» der Seite und werden beim Build statisch in `dist/index.html` geschrieben (Quelle: `src/sources.js`).
