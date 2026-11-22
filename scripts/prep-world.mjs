import fs from 'fs';
import * as topojson from 'topojson-client';
const topo = JSON.parse(fs.readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const fc = topojson.feature(topo, topo.objects.countries);
const Q = 30;
const enc = (ring) => { const out=[]; let px=0, py=0; for (const [x,y] of ring){ const qx=Math.round(x*Q), qy=Math.round(y*Q); if(out.length && qx===px && qy===py) continue; out.push(qx-px, qy-py); px=qx; py=qy;} return out; };
const countries = [];
let pts=0;
for (const f of fc.features) {
  const g = f.geometry; if (!g) continue;
  const polys = g.type==='Polygon' ? [g.coordinates] : g.coordinates;
  const rings = [];
  for (const p of polys) for (const r of p) { const e=enc(r); if (e.length>=6){ rings.push(e); pts+=e.length/2; } }
  countries.push({ id: f.id ? +f.id : 0, n: f.properties.name, r: rings });
}
const mesh = topojson.mesh(topo, topo.objects.countries);
const lines = mesh.coordinates.map(enc).filter(e=>e.length>=4);
let lp = lines.reduce((a,l)=>a+l.length/2,0);
fs.writeFileSync(new URL('../dist/world.json', import.meta.url), JSON.stringify({q:Q, c:countries}));
console.log('countries', countries.length, 'ring pts', pts, 'line pts', lp);
