// Procedural coffee plant: orthotropic stem, decussate plagiotropic branches, opposite leaves,
// cherry clusters in the leaf axils of older wood, young (green or bronze) leaves at the tips.
// Units: metres. Many plants can be merged into one stem mesh + one leaf and one cherry InstancedMesh.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

let LEAF_TEX = null, BARK = null;
const GEOS = {};
function leafTexture() {
  if (LEAF_TEX) return LEAF_TEX;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 128, 0);
  grd.addColorStop(0, '#d9d9d9'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#d9d9d9');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 256);
  // midrib
  g.strokeStyle = 'rgba(255,255,230,0.95)'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 256); g.lineTo(64, 0); g.stroke();
  // lateral veins, arched towards the tip
  g.strokeStyle = 'rgba(235,240,200,0.55)'; g.lineWidth = 2;
  for (let y = 236; y > 20; y -= 21) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * 30, y - 10, 64 + s * 58, y - 34); g.stroke(); }
  }
  // subtle mottling
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
  LEAF_TEX = new THREE.CanvasTexture(c); LEAF_TEX.colorSpace = THREE.SRGBColorSpace; LEAF_TEX.anisotropy = 4;
  return LEAF_TEX;
}
function barkTexture() {
  if (BARK) return BARK;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#8a7058'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${30 + Math.random() * 25},20,${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 2, 6 + Math.random() * 20); }
  BARK = new THREE.CanvasTexture(c); BARK.colorSpace = THREE.SRGBColorSpace; BARK.wrapS = BARK.wrapT = THREE.RepeatWrapping;
  return BARK;
}
// leaf: petiole at origin, blade along +Z (length 1), width along X, normal +Y; V-fold, droop, wavy margin
function leafGeometry(widthF = 1, low = false) {
  const NS = low ? 6 : 10, NU = low ? 2 : 4;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const w = 0.205 * widthF * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.85) * (s > 0.86 ? 1 - (s - 0.86) * 2.2 : 1);
    for (let j = 0; j <= NU; j++) {
      const u = j / NU * 2 - 1;
      const x = u * w;
      const y = Math.abs(u) * w * 0.38 - 0.16 * s * s + Math.sin(s * 26 + u * 3) * 0.012 * u * u;
      pos.push(x, y, 0.04 + s * 0.96); uv.push(j / NU, s);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NU; j++) { const a = i * (NU + 1) + j, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const TIP = { green: ['#9cc254', '#86b046'], bronze: ['#a5653c', '#8e5232'], dbronze: ['#7a3f24', '#6a3520'], gb: ['#9cc254', '#a5653c'], v: ['#9cc254', '#a5653c', '#8e5232'], none: ['#a6c25e', '#93b552'] };

// spec: { h, dwarf, tip, cherry, cherry2, leaf, leafW, bean, sp, id, seed, density, ripe }
export function plantData(spec, opt = {}) {
  const R = rng(spec.seed || 7);
  const dens = opt.density ?? 1;
  const H = spec.h || 2.4;
  const dwarf = !!spec.dwarf;
  const inter = dwarf ? 0.05 : 0.078;
  const Lmax = (dwarf ? 0.62 : 0.85) * (spec.sp === 'robusta' ? 1.15 : spec.sp === 'eugenioides' ? 0.8 : 1);
  const leafLen = 0.15 * (spec.leaf || 1);
  const leafStep = (dwarf ? 0.042 : 0.054) * Math.max(0.8, Math.sqrt(spec.leaf || 1));
  const cherryR = 0.0078 * ({ s: 0.92, m: 1, l: 1.08, xl: 1.22 }[spec.bean] || 1) * (spec.sp === 'robusta' ? 0.85 : spec.sp === 'eugenioides' ? 0.7 : 1);
  const perCluster = Math.round((spec.sp === 'robusta' ? 14 : spec.sp === 'eugenioides' ? 3 : 7) * (opt.cherries ?? 1));
  const tipCols = TIP[spec.tip || 'none'] || TIP.none;
  const ripe = new THREE.Color(spec.cherry || '#b5212c');
  const ripe2 = spec.cherry2 ? new THREE.Color(spec.cherry2) : null;
  const unripe = [new THREE.Color('#6f9a3a'), new THREE.Color('#9fae3c'), new THREE.Color('#d2a63a')];
  const leafBase = new THREE.Color(spec.sp === 'robusta' ? '#3c6a2a' : spec.sp === 'eugenioides' ? '#4a6e34' : '#2e5626');

  const stems = [];
  const leaves = []; // {m: Matrix4, c: Color}
  const cherries = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tmpQ = new THREE.Quaternion();

  // main stem (slight wobble)
  const lean = new THREE.Vector3((R() - 0.5) * 0.06, 0, (R() - 0.5) * 0.06);
  const stemPts = [];
  for (let i = 0; i <= 8; i++) { const y = H * i / 8; stemPts.push(new THREE.Vector3(lean.x * y + Math.sin(i * 1.7 + R()) * 0.012, y, lean.z * y + Math.cos(i * 1.3 + R()) * 0.012)); }
  const stemCurve = new THREE.CatmullRomCurve3(stemPts);
  const rBase = dwarf ? 0.022 : 0.026;
  stems.push(taperedTube(stemCurve, rBase, 0.006, 16, 6));

  const addLeaf = (p, dir, side, len, col, roll = 0) => {
    const D = dir.clone().normalize();
    let Y = up.clone().sub(D.clone().multiplyScalar(up.dot(D))).normalize();
    if (roll) Y.applyAxisAngle(D, roll);
    const X = new THREE.Vector3().crossVectors(Y, D).normalize();
    const m = new THREE.Matrix4().makeBasis(X, Y, D);
    m.scale(new THREE.Vector3(len, len, len)); m.setPosition(p);
    leaves.push({ m, c: col });
  };

  const y0 = dwarf ? 0.22 : 0.3;
  // one plagiotropic branch with leaf pairs, fruit clusters in the axils and optional secondaries
  const branch = (p0, dir, L, elev, droop, rad, depth) => {
    const p1 = p0.clone().add(dir.clone().multiplyScalar(L * 0.45)).add(new THREE.Vector3(0, L * elev * 0.55, 0));
    const p2 = p0.clone().add(dir.clone().multiplyScalar(L)).add(new THREE.Vector3(0, L * (elev * 0.55 - droop), 0));
    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    stems.push(taperedTube(curve, rad, 0.002, depth ? 3 : 5, depth ? 3 : 4));
    const len = curve.getLength();
    const nPairs = Math.max(2, Math.floor(len / leafStep));
    for (let k = 1; k <= nPairs; k++) {
      const t = k / nPairs;
      const p = curve.getPointAt(Math.min(0.999, t));
      const T = curve.getTangentAt(Math.min(0.999, t));
      const side = new THREE.Vector3().crossVectors(T, up).normalize();
      const isTip = k >= nPairs - 1;
      if (t > 0.16 && t < 0.72 && R() < 0.82 * (opt.cherries ?? 1) * (depth ? 0.6 : 1)) {
        const n = Math.max(1, Math.round(perCluster * (0.6 + R() * 0.8)));
        for (let j = 0; j < n; j++) {
          const a2 = (j / n) * Math.PI * 2 + R() * 0.6;
          const off = new THREE.Vector3().addScaledVector(side, Math.cos(a2) * cherryR * 1.7).add(new THREE.Vector3(0, Math.sin(a2) * cherryR * 1.5 - cherryR * 1.2, 0)).addScaledVector(T, (R() - 0.5) * cherryR * 2);
          const col = R() < (spec.ripe ?? 0.78) ? ripe.clone().offsetHSL(0, 0, (R() - 0.5) * 0.06) : unripe[Math.floor(R() * 3)].clone();
          cherries.push({ m: new THREE.Matrix4().compose(p.clone().add(off), tmpQ.setFromAxisAngle(T, R() * 6), new THREE.Vector3(cherryR, cherryR * 1.12, cherryR)), c: col });
        }
      }
      if (t < 0.38 && R() < 0.22) continue; // some leaf loss on older wood
      if (dens < 1 && R() > dens && !isTip) continue;
      const ll = leafLen * (isTip ? 0.45 + R() * 0.2 : 0.82 + R() * 0.36) * (depth ? 0.85 : 1);
      for (const sgn of [-1, 1]) {
        const d = side.clone().multiplyScalar(sgn).add(T.clone().multiplyScalar(0.55 + R() * 0.35)).add(new THREE.Vector3(0, -0.12 - R() * 0.3, 0));
        const col = isTip ? new THREE.Color(tipCols[Math.floor(R() * tipCols.length)]) : leafBase.clone().offsetHSL((R() - 0.5) * 0.03, (R() - 0.5) * 0.1, (R() - 0.5) * 0.07 + (t > 0.7 ? 0.04 : 0));
        addLeaf(p, d, sgn, ll, col, (R() - 0.5) * 0.6 * sgn);
      }
      // secondary branches from older nodes
      if (!depth && L > 0.36 && (k === Math.round(nPairs * 0.32) || k === Math.round(nPairs * 0.55)) && R() < 0.75) {
        const sd = side.clone().multiplyScalar(R() < 0.5 ? -1 : 1).add(T.clone().multiplyScalar(1.1)).normalize();
        branch(p, new THREE.Vector3(sd.x, 0, sd.z).normalize(), L * (0.3 + R() * 0.15), elev * 0.6, droop * 0.6, rad * 0.55, 1);
      }
    }
    const pe = curve.getPointAt(1), Te = curve.getTangentAt(1);
    addLeaf(pe, Te.clone().add(new THREE.Vector3(0, 0.25, 0)), 1, leafLen * 0.3, new THREE.Color(tipCols[0]));
  };
  let node = 0;
  for (let y = y0; y < H - inter * 1.5; y += inter * (0.85 + R() * 0.3), node++) {
    const rel = (y - y0) / (H - y0);
    const L = Lmax * Math.pow(Math.max(0, 1 - Math.pow(rel, 1.8)), 0.65) * (0.8 + R() * 0.4) + 0.07;
    const base = stemCurve.getPointAt(Math.min(1, y / H));
    const ang = node * Math.PI / 2 + (R() - 0.5) * 0.35;
    for (const s of [0, Math.PI]) {
      if (R() > 0.97) continue;
      const a = ang + s;
      branch(base.clone(), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), L, 0.12 + rel * 0.62, 0.14 + (1 - rel) * 0.24, 0.0075 * (0.7 + 0.5 * (1 - rel)), 0);
    }
  }
  // crown: young leaf pairs at the top of the main stem
  const top = stemCurve.getPointAt(1);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 2;
    for (const s of [-1, 1]) addLeaf(top.clone().add(new THREE.Vector3(0, -i * inter * 0.7, 0)), new THREE.Vector3(Math.cos(a) * s, 0.9 - i * 0.25, Math.sin(a) * s), s, leafLen * (0.35 + i * 0.18), new THREE.Color(tipCols[i % tipCols.length]));
  }
  const stem = mergeGeometries(stems);
  return { stem, leaves, cherries, leafW: spec.leafW || 1 };
}

function taperedTube(curve, r0, r1, seg, rad) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const p = g.attributes.position, n = g.attributes.normal;
  const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) {
    const r = r0 + (r1 - r0) * (i / seg);
    const c = pts[i];
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      p.setXYZ(k, c.x + n.getX(k) * r, c.y + n.getY(k) * r, c.z + n.getZ(k) * r);
    }
  }
  g.deleteAttribute('uv');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; uv[k * 2] = j / rad; uv[k * 2 + 1] = i / seg * 4; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

let MATS = null;
export function plantMaterials() {
  if (MATS) return MATS;
  MATS = {
    bark: new THREE.MeshStandardMaterial({ map: barkTexture(), color: '#a08a74', roughness: 0.92 }),
    leaf: new THREE.MeshStandardMaterial({ map: leafTexture(), roughness: 0.38, metalness: 0, side: THREE.DoubleSide }),
    cherry: new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0 }),
  };
  return MATS;
}

// Build a group from several plants: items = [{ data, matrix }]
export function buildPlants(items, opt = {}) {
  const M = plantMaterials();
  const lk = opt.lowPoly ? 'lo' : 'hi';
  if (!GEOS[lk]) GEOS[lk] = { wide: leafGeometry(1, !!opt.lowPoly), narrow: leafGeometry(0.58, !!opt.lowPoly), cherry: new THREE.IcosahedronGeometry(1, opt.lowPoly ? 0 : 1) };
  const G = GEOS[lk];
  const group = new THREE.Group();
  const stems = items.map(({ data, matrix }) => data.stem.clone().applyMatrix4(matrix));
  const stem = new THREE.Mesh(mergeGeometries(stems), M.bark);
  stem.castShadow = true; stem.receiveShadow = true; group.add(stem);
  const m4 = new THREE.Matrix4();
  for (const narrow of [false, true]) {
    const list = items.filter((it) => (it.data.leafW < 0.75) === narrow);
    const n = list.reduce((s, it) => s + it.data.leaves.length, 0);
    if (!n) continue;
    const geo = narrow ? G.narrow : G.wide;
    const lm = new THREE.InstancedMesh(geo, M.leaf, n);
    let k = 0;
    for (const { data, matrix } of list) for (const l of data.leaves) { m4.multiplyMatrices(matrix, l.m); lm.setMatrixAt(k, m4); lm.setColorAt(k++, l.c); }
    lm.castShadow = opt.shadows !== false; lm.receiveShadow = true;
    lm.instanceMatrix.needsUpdate = true; if (lm.instanceColor) lm.instanceColor.needsUpdate = true;
    lm.computeBoundingSphere();
    group.add(lm);
  }
  const nc = items.reduce((s, it) => s + it.data.cherries.length, 0);
  if (nc) {
    const cm = new THREE.InstancedMesh(G.cherry, M.cherry, nc);
    let k = 0;
    for (const { data, matrix } of items) for (const c of data.cherries) { m4.multiplyMatrices(matrix, c.m); cm.setMatrixAt(k, m4); cm.setColorAt(k++, c.c); }
    cm.castShadow = false; cm.receiveShadow = true; cm.computeBoundingSphere();
    group.add(cm);
  }
  return group;
}

export function disposePlants(group) {
  const shared = new Set(Object.values(GEOS).flatMap((g) => Object.values(g)));
  group.traverse((o) => { if (o.isMesh && !shared.has(o.geometry)) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
}
