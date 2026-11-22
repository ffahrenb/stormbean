import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeSky, applySky, envFromSky } from './env.js';
import { plantData, buildPlants } from './plant.js';

const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
let seed = 7;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;

// station anchors (x, z), camera offset, look offset
const ST = {
  field: { a: [-12, -26], cam: [11, 7, 15], look: [0, 1.3, 0] },
  reception: { a: [-6, -6], cam: [7, 5.5, 10], look: [0, 0.8, 0] },
  pulper: { a: [2, -4], cam: [5.2, 2.9, 7.4], look: [0, 1.2, 0] },
  tanks: { a: [10, -2], cam: [-1, 4.6, 9.5], look: [0, 0.6, 0] },
  anaer: { a: [17.5, -6], cam: [5.5, 3.6, 6.5], look: [0, 1.3, 0] },
  channel: { a: [19, 4], cam: [-3, 5.5, 9.5], look: [0, 0.2, 0] },
  beds: { a: [-15, 13], cam: [8, 6.5, 11], look: [0, 0.8, 0] },
  patio: { a: [3, 15], cam: [-6, 8, 12], look: [0, 0, 0] },
  dryer: { a: [21, 15], cam: [7, 4.5, 8.5], look: [0, 1.4, 0] },
  wethuller: { a: [11, 24], cam: [5.5, 3.8, 7], look: [0, 1, 0] },
  bodega: { a: [32, 3], cam: [-5, 5, 13], look: [0, 1.6, 0] },
  mill: { a: [34, 20], cam: [-12, 3.8, 10], look: [-2, 1.6, -1] },
  sorting: { a: [38, 30], cam: [-8, 5.5, 8.5], look: [0, 1, 0] },
  port: { a: [28, 40], cam: [-21, 13, -15], look: [1, 2, 4] },
  roaster: { a: [10, 92], cam: [4.2, 2.3, 6.8], look: [-1.3, 1.4, -0.6] },
};
export const STATION_IDS = Object.keys(ST);

// bean layer palettes [base, variation colours]
const BEANPAL = {
  cherry: ['#7a0f16', ['#b3121d', '#c8202a', '#a10f19', '#d33a2a', '#8f1a1a', '#6f9a3a', '#c9a227']],
  cherryMid: ['#4a0f18', ['#7a1424', '#8a1f2a', '#5e1220', '#9b2a2a', '#6b1b25']],
  cherryDry: ['#1e0f0c', ['#3b1a14', '#4a2018', '#2c1410', '#55261a', '#3d1d17']],
  parch: ['#c9b48a', ['#eadcbc', '#e2d0aa', '#f0e6cc', '#d9c69e', '#e8d8b2']],
  parchWet: ['#b9a67a', ['#e5d7b0', '#d8c79c', '#efe2c2', '#cbb88d']],
  mucilage: ['#c7b071', ['#efdc9c', '#f4e6b4', '#e3cc85', '#f8edc6']],
  honey: ['#7a4313', ['#b8701f', '#c98a2f', '#a35a17', '#d49a42', '#8f4c16']],
  greenWet: ['#2e4536', ['#4f6e58', '#5a7a63', '#3f5c49', '#6a8a70']],
  green: ['#6b7c62', ['#9aac8e', '#a8b89a', '#8b9e80', '#b5c2a5']],
  roast: ['#2a160c', ['#5a3420', '#6e4228', '#4a2a18', '#7a4a2c']],
};

export class Diorama {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.opts = opts;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
    this.t = 0;
    this.anims = [];
    this.people = [];
    this.lamps = [];
    this.layerMats = [];
    this.texCache = {};
    this.station = 'field';
    this.route = [];
    this.dryT = 0;
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, maxPolarAngle: 1.42, minDistance: 3, maxDistance: 80, screenSpacePanning: false, enabled: false });
    this.controls.addEventListener('start', () => { this.userMoving = true; });
    this.build();
    const s = ST.field;
    const a = this.anchor('field');
    this.camera.position.set(a.x + s.cam[0], a.y + s.cam[1], a.z + s.cam[2]);
    this.controls.target.set(a.x + s.look[0], a.y + s.look[1], a.z + s.look[2]);
    this.controls.update();
  }

  h(x, z) {
    let y = 0;
    const back = sm(-10, -75, z);
    y += back * (20 + 6 * Math.sin(x * 0.045) + 3 * Math.sin(x * 0.11 + 1.3));
    y += sm(-45, -95, x) * 10 * (1 - sm(30, 60, z));
    y += sm(62, 110, x) * 12 * (1 - sm(30, 60, z));
    const w = sm(-12, -18, z) * (1 - sm(22, 30, x)) * (1 - sm(-60, -68, x));
    if (w > 0) { const s = 1.6, q = y / s, f = q - Math.floor(q); y = ((Math.floor(q) + sm(0.55, 1, f)) * s) * w + y * (1 - w); }
    y -= sm(44, 58, z) * 7;
    const di = Math.hypot(x - 10, z - 92);
    y += (1 - sm(7, 22, di)) * 8.4 * sm(62, 80, z);
    y += Math.sin(x * 0.37 + z * 0.11) * Math.cos(z * 0.29 - x * 0.07) * 0.12 * (1 - sm(-8, 44, z) * (1 - sm(44, 50, z)));
    return y;
  }
  anchor(id) { const [x, z] = ST[id].a; return new THREE.Vector3(x, this.h(x, z), z); }

  // ---------- materials & textures ----------
  mat(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }); }
  canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 4;
    return t;
  }
  beanTex(key) {
    if (this.texCache[key]) return this.texCache[key];
    const [base, cols] = BEANPAL[key];
    const tex = this.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      let s = 11;
      const r = () => (s = s * 16807 % 2147483647) / 2147483647;
      const round = key.startsWith('cherry');
      for (let i = 0; i < 2600; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI;
        const rx = round ? 7 + r() * 3 : 8 + r() * 3, ry = round ? rx * (0.85 + r() * 0.2) : 5 + r() * 2;
        for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) {
          if (x + dx < -12 || x + dx > w + 12 || y + dy < -12 || y + dy > h + 12) continue;
          g.fillStyle = cols[(r() * cols.length) | 0];
          g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, a, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.beginPath(); g.ellipse(x + dx - rx * 0.3, y + dy - ry * 0.3, rx * 0.35, ry * 0.3, a, 0, Math.PI * 2); g.fill();
        }
      }
    }, [1, 1]);
    this.texCache[key] = tex;
    return tex;
  }
  layerMat(key, rep = [4, 4]) {
    const m = this.mat('#ffffff', { map: this.beanTex(key).clone(), roughness: key === 'mucilage' || key === 'parchWet' || key === 'greenWet' ? 0.35 : 0.8 });
    m.map.repeat.set(rep[0], rep[1]); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
    m.userData.rep = rep;
    return m;
  }
  setLayer(m, key) {
    const t = this.beanTex(key).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.copy(m.map.repeat); t.colorSpace = THREE.SRGBColorSpace;
    m.map = t;
    m.roughness = key === 'mucilage' || key === 'parchWet' || key === 'greenWet' ? 0.35 : 0.8;
  }

  mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
  box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = this.mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); return m; }
  cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20) { const m = this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z); return m; }
  place(obj, id, dx = 0, dz = 0, ry = 0) { const [x, z] = ST[id].a; obj.position.set(x + dx, this.h(x + dx, z + dz), z + dz); obj.rotation.y = ry; this.scene.add(obj); return obj; }

  build() {
    const M = this.M = {
      concrete: this.mat('#b9b2a6'), concreteDark: this.mat('#8f887c'), wood: this.mat('#8a5a32'), woodDark: this.mat('#5c3a20'),
      tin: this.mat('#9aa3a8', { metalness: 0.5, roughness: 0.45 }), tinRust: this.mat('#9b6a4a', { metalness: 0.3, roughness: 0.6 }),
      steel: this.mat('#d5dade', { metalness: 0.9, roughness: 0.22 }), paint: this.mat('#2f6f8f', { roughness: 0.5 }), paintRed: this.mat('#b0302a', { roughness: 0.5 }),
      paintGreen: this.mat('#3f6e4a', { roughness: 0.55 }), black: this.mat('#262626', { roughness: 0.6 }), white: this.mat('#efece4'), plaster: this.mat('#e6dccb'),
      tarp: this.mat('#2d5f9a', { roughness: 0.7, side: THREE.DoubleSide }), net: this.mat('#3a3a3a', { roughness: 0.9 }),
      plastic: new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: 0.15, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
      water: new THREE.MeshStandardMaterial({ color: '#3c7d8c', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82 }),
      pulp: this.mat('#5b1414', { roughness: 0.6 }), sackWhite: this.mat('#ebe6da', { roughness: 0.95 }), lamp: new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: '#ffcc77', emissiveIntensity: 0 }),
    };
    M.tile = this.mat('#ffffff', { map: this.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9aa3a0'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = ['#f3f2ee', '#eceae4', '#f7f6f2'][(x + y) % 3]; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28); } }, [2, 1]), roughness: 0.3 });
    M.roof = this.mat('#ffffff', { map: this.canvasTex(64, 256, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 150 + 60 * Math.sin(x / w * Math.PI * 8); g.fillStyle = `rgb(${v},${v + 6},${v + 10})`; g.fillRect(x, 0, 1, h); } }, [6, 1]), metalness: 0.45, roughness: 0.45, side: THREE.DoubleSide });
    M.jute = this.mat('#ffffff', { map: this.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b8935a'; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 3) { g.fillStyle = 'rgba(80,50,20,0.25)'; g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } }, [2, 2]), roughness: 1 });
    M.container = this.mat('#ffffff', { map: this.canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < w; x++) { const v = Math.sin(x / w * Math.PI * 24) > 0 ? 255 : 205; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); } }), roughness: 0.6, metalness: 0.3 });
    M.drum = this.mat('#ffffff', { map: this.canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#6f7a80'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; for (let y = 6; y < h; y += 10) for (let x = (y / 10 % 2) * 5 + 4; x < w; x += 10) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); } }), metalness: 0.6, roughness: 0.4 });

    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildWater();
    this.buildField();
    this.buildReception();
    this.buildPulper();
    this.buildTanks();
    this.buildAnaer();
    this.buildChannel();
    this.buildBeds();
    this.buildPatio();
    this.buildDryer();
    this.buildWetHuller();
    this.buildBodega();
    this.buildMill();
    this.buildSorting();
    this.buildPort();
    this.buildRoaster();
    this.buildFlow();
    this.buildRing();
  }

  buildSky() {
    this.sky = makeSky(560); this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog('#d9dfe2', 90, 300);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#dcecff', '#6b5a3a', 1.1);
    this.sun = new THREE.DirectionalLight('#fff4e0', 2.4);
    this.sun.position.set(55, 75, 40);
    this.sun.target.position.set(10, 0, 10);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(this.opts.mobile ? 1024 : 2048, this.opts.mobile ? 1024 : 2048);
    Object.assign(s.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 220 });
    s.bias = -0.0005; s.normalBias = 0.04;
    this.scene.add(this.hemi, this.sun, this.sun.target);
  }

  buildTerrain() {
    const W = 340, D = 300, NX = 170, NZ = 150;
    const geo = new THREE.PlaneGeometry(W, D, NX, NZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(10, 0, 10);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color('#6e8a3c'), grass2 = new THREE.Color('#87994a'), soil = new THREE.Color('#7b5a3a'), sand = new THREE.Color('#d6c79f'), under = new THREE.Color('#4c7c80'), path = new THREE.Color('#b8a079'), yard = new THREE.Color('#a8956f');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const y = this.h(x, z);
      p.setY(i, y);
      c.copy(grass).lerp(grass2, 0.5 + 0.5 * Math.sin(x * 0.07) * Math.cos(z * 0.05));
      if (z < -13 && z > -66 && x > -60 && x < 22) { const f = (y / 1.6) % 1; if (f > 0.15 && f < 0.6) c.lerp(soil, 0.35); }
      if (x > -32 && x < 48 && z > -12 && z < 44) c.lerp(yard, 0.55);
      const dz = Math.abs(z - (-10 + 0.0 * x)); if (x > -30 && x < 50 && dz < 1.6) c.lerp(path, 0.7);
      if (Math.abs(x - 6) < 1.4 && z < 44 && z > -12) c.lerp(path, 0.6);
      if (z > 42 && y > -0.9) c.lerp(sand, 0.8);
      if (y < -0.8) c.lerp(under, 0.85);
      if (z > 70 && y > -0.5) c.copy(grass).lerp(sand, Math.max(0, 0.6 - y * 0.2));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const detail = this.canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 7000; i++) { const v = 150 + Math.random() * 105; g.fillStyle = `rgba(${v},${v},${v},0.55)`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 3); }
    }, [90, 80]);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 0.95 }));
    m.receiveShadow = true;
    this.scene.add(m);
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(420, 220, 70, 36); geo.rotateX(-Math.PI / 2); geo.translate(10, -0.6, 150);
    this.waterGeo = geo; this.waterBase = Float32Array.from(geo.attributes.position.array);
    const nc = document.createElement('canvas'); nc.width = nc.height = 256;
    const ng = nc.getContext('2d'); const img = ng.createImageData(256, 256);
    const hgt = (x, y) => { const u = x / 256 * Math.PI * 2, v = y / 256 * Math.PI * 2; return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 7 - v * 5 + 1.3) * 0.25 + Math.sin(u * 13 + v * 11 + 0.7) * 0.12 + Math.sin(-u * 19 + v * 23) * 0.06; };
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      const n = new THREE.Vector3(-dx * 6, -dy * 6, 1).normalize(); const k = (y * 256 + x) * 4;
      img.data[k] = (n.x * 0.5 + 0.5) * 255; img.data[k + 1] = (n.y * 0.5 + 0.5) * 255; img.data[k + 2] = (n.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
    this.seaNormal = new THREE.CanvasTexture(nc); this.seaNormal.wrapS = this.seaNormal.wrapT = THREE.RepeatWrapping; this.seaNormal.repeat.set(36, 20);
    this.seaMat = new THREE.MeshPhysicalMaterial({ color: '#2b6878', roughness: 0.06, metalness: 0, normalMap: this.seaNormal, normalScale: new THREE.Vector2(0.45, 0.45), transparent: true, opacity: 0.93, envMapIntensity: 1.1 });
    const w = new THREE.Mesh(geo, this.seaMat); w.receiveShadow = true; this.scene.add(w);
  }

  // ---------- people ----------
  person(o = {}) {
    const skin = this.mat(o.skin || ['#6b4429', '#8d5a3b', '#a8754f', '#c58c63', '#4e3020'][(rnd() * 5) | 0], { roughness: 0.7 });
    const shirt = this.mat(o.shirt || ['#2f6fa6', '#c2452d', '#e0b43a', '#efece4', '#3f7f5a', '#8a3f7a', '#e07a2a'][(rnd() * 7) | 0], { roughness: 0.9 });
    const pants = this.mat(o.pants || ['#2b2f3a', '#4a4036', '#2f3f5a', '#5a4a3a'][(rnd() * 4) | 0], { roughness: 0.9 });
    const g = new THREE.Group();
    const legL = this.mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.85, 8), pants); legL.position.set(-0.1, 0.43, 0);
    const legR = legL.clone(); legR.position.x = 0.1;
    const body = this.mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.66, 10), shirt); body.position.y = 1.18;
    const head = this.mesh(new THREE.SphereGeometry(0.13, 14, 10), skin); head.position.y = 1.64;
    const mkArm = (side) => {
      const pivot = new THREE.Group(); pivot.position.set(side * 0.25, 1.46, 0);
      const arm = this.mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.62, 8), shirt); arm.position.y = -0.3;
      const hand = this.mesh(new THREE.SphereGeometry(0.055, 8, 6), skin); hand.position.y = -0.63;
      pivot.add(arm, hand); return pivot;
    };
    const armL = mkArm(-1), armR = mkArm(1);
    g.add(legL, legR, body, head, armL, armR);
    if (o.hat !== false) {
      if ((o.hat || (rnd() > 0.5 ? 'straw' : 'cap')) === 'straw') {
        const hm = this.mat('#d9c28a', { roughness: 0.9 });
        const brim = this.mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 16), hm); brim.position.y = 1.72;
        const crown = this.mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 12), hm); crown.position.y = 1.8;
        g.add(brim, crown);
      } else {
        const sc = this.mesh(new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.mat(['#f0e6d0', '#c24a3a', '#2f6fa6', '#e0b43a'][(rnd() * 4) | 0])); sc.position.y = 1.66;
        g.add(sc);
      }
    }
    if (o.basket) {
      const b = this.mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.28, 12, 1, true), this.mat('#a27a46', { side: THREE.DoubleSide })); b.position.set(0, 0.98, 0.25);
      const fill = this.mesh(new THREE.CircleGeometry(0.19, 12), this.mat('#a3141e')); fill.rotation.x = -Math.PI / 2; fill.position.set(0, 1.08, 0.25);
      g.add(b, fill);
    }
    if (o.tool === 'rake') {
      const A = new THREE.Vector3(0.05, 1.0, 0.35), B = new THREE.Vector3(0.05, 0.12, 1.75);
      const len = A.distanceTo(B);
      const handle = this.mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), this.M.wood);
      handle.position.copy(A).lerp(B, 0.5);
      handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      const head2 = this.mesh(new THREE.BoxGeometry(0.9, 0.12, 0.06), this.M.wood); head2.position.copy(B);
      g.add(handle, head2);
      armR.rotation.x = -0.75; armL.rotation.x = -0.9;
    }
    if (o.tool === 'paddle') {
      const pd = this.mesh(new THREE.CylinderGeometry(0.025, 0.025, 2, 6), this.M.wood); pd.position.set(-0.2, -0.6, 0.5); pd.rotation.x = 0.9;
      armR.add(pd);
    }
    if (o.sack) { const s = this.mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 8), o.sackMat || this.M.sackWhite); s.rotation.z = Math.PI / 2; s.position.set(0.05, 1.62, -0.08); g.add(s); armL.rotation.z = -2.6; armR.rotation.z = 2.6; }
    g.userData = { armL, armR, legL, legR, body, type: o.type || 'idle', ph: rnd() * 6.28, base: null };
    return g;
  }
  addPerson(id, dx, dz, ry, o) {
    const p = this.person(o); this.place(p, id, dx, dz, ry);
    p.userData.base = p.position.clone(); p.userData.ry = ry;
    this.people.push(p); return p;
  }

  // ---------- coffee plants ----------
  shrubGeo() {
    const parts = [];
    const dark = new THREE.Color('#244d22'), light = new THREE.Color('#5f9a45');
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const r = 0.3 + rnd() * 0.2 + (1 - t) * 0.08;
      let g = mergeVertices(new THREE.IcosahedronGeometry(r, this.opts.mobile ? 0 : 1));
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const f = 1 + (rnd() - 0.5) * 0.38; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.85, p.getZ(k) * f); }
      const a = rnd() * 6.28, d = (0.5 * (1 - t * 0.7)) * (0.4 + rnd() * 0.6);
      g.translate(Math.cos(a) * d, 0.45 + t * 1.6, Math.sin(a) * d);
      g = g.toNonIndexed();
      const n = g.attributes.position.count; const cc = new Float32Array(n * 3); const c = new THREE.Color();
      for (let k = 0; k < n; k++) { const y = g.attributes.position.getY(k); c.copy(dark).lerp(light, Math.min(1, y / 2.3) * 0.8 + rnd() * 0.2); cc[k * 3] = c.r; cc[k * 3 + 1] = c.g; cc[k * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      g.deleteAttribute('uv'); g.deleteAttribute('normal');
      parts.push(g);
    }
    const trunk = new THREE.CylinderGeometry(0.04, 0.06, 0.7, 6).translate(0, 0.35, 0).toNonIndexed();
    trunk.deleteAttribute('uv'); trunk.deleteAttribute('normal');
    const tc = new Float32Array(trunk.attributes.position.count * 3).fill(0.28); trunk.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    parts.push(trunk);
    const g = mergeGeometries(parts); g.computeVertexNormals();
    return g;
  }
  foliageMat(params) {
    const foliage = new THREE.MeshStandardMaterial(params);
    foliage.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wpF = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpF = instanceMatrix * wpF;
        #endif
        vWP = (modelMatrix * wpF).xyz;`);
      sh.fragmentShader = `varying vec3 vWP; float leafN;
        float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
        ` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          leafN = smoothstep(0.22, 0.78, vn(vWP * 9.0) * 0.55 + vn(vWP * 15.0 + 3.1) * 0.45);
          diffuseColor.rgb *= mix(0.5, 1.18, leafN);`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float hx = dFdx(leafN), hy = dFdy(leafN);
            vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);
            vec3 grad = sign(det) * (hx * r1 + hy * r2); normal = normalize(abs(det) * normal - grad * 0.9); }`);
    };
    foliage.customProgramCacheKey = () => 'foliage';
    return foliage;
  }

  buildField() {
    const shrub = this.shrubGeo();
    const pos = [];
    for (let z = -17; z > -64; z -= 2.9) for (let x = -58; x < 20; x += 1.75) {
      const xx = x + (rnd() - 0.5) * 0.5, zz = z + (rnd() - 0.5) * 0.4;
      if (Math.abs(xx - ST.field.a[0] - 0.5) < 1.2 && zz > -30 && zz < -21) continue; // aisle for pickers
      if (xx > 8 && zz > -24) continue; // farmhouse yard
      pos.push([xx, zz, 0.85 + rnd() * 0.35, rnd() * 6.28]);
    }
    // the shrubs closest to the field camera become detailed plants
    const fa0 = ST.field.a;
    const near = pos.map((p, i) => [Math.hypot(p[0] - (fa0[0] + 3), p[1] - (fa0[1] + 5)), i]).sort((a, b) => a[0] - b[0]).slice(0, this.opts.mobile ? 6 : 16).filter((x) => x[0] < 9.5).map((x) => x[1]);
    const nearSet = new Set(near);
    if (near.length) {
      const variants = [
        plantData({ h: 2.1, dwarf: true, tip: 'green', cherry: '#b5212c', leaf: 1, bean: 'm', seed: 5, ripe: 0.62 }, { density: this.opts.mobile ? 0.55 : 0.8, cherries: 0.7 }),
        plantData({ h: 2.3, dwarf: true, tip: 'green', cherry: '#b5212c', leaf: 1, bean: 'm', seed: 17, ripe: 0.62 }, { density: this.opts.mobile ? 0.55 : 0.8, cherries: 0.7 }),
        plantData({ h: 2.6, dwarf: false, tip: 'bronze', cherry: '#b5212c', leaf: 1, bean: 'l', seed: 41, ripe: 0.62 }, { density: this.opts.mobile ? 0.55 : 0.8, cherries: 0.7 }),
      ];
      const items = near.map((i, k) => { const [x, z, sc, r] = pos[i]; return { data: variants[k % 3], matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, this.h(x, z) - 0.03, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), new THREE.Vector3(1, 0.85 + sc * 0.15, 1)) }; });
      this.nearPlants = buildPlants(items, { lowPoly: true, shadows: !this.opts.mobile });
      this.scene.add(this.nearPlants);
      for (let i = pos.length - 1; i >= 0; i--) if (nearSet.has(i)) pos.splice(i, 1);
    }
    const foliage = this.foliageMat({ vertexColors: true, roughness: 0.55 });
    const im = new THREE.InstancedMesh(shrub, foliage, pos.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    pos.forEach(([x, z, sc, r], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r); s.set(sc, sc, sc); v.set(x, this.h(x, z) - 0.05, z); m4.compose(v, q, s); im.setMatrixAt(i, m4); });
    im.castShadow = !this.opts.mobile; im.receiveShadow = true; this.scene.add(im);
    // cherries
    const per = this.opts.mobile ? 6 : 9;
    const n = pos.length * per;
    const cg = new THREE.SphereGeometry(0.036, this.opts.mobile ? 5 : 7, this.opts.mobile ? 4 : 5);
    const ci = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ roughness: 0.35 }), n);
    const col = new THREE.Color();
    let k = 0;
    for (const [x, z, sc] of pos) for (let j = 0; j < per; j++) {
      const a = rnd() * 6.28, y = (0.7 + rnd() * 1.1) * sc, r = (0.52 + rnd() * 0.12) * sc * (1 - (y / sc - 0.7) * 0.25);
      v.set(x + Math.cos(a) * r, this.h(x, z) + y, z + Math.sin(a) * r);
      m4.makeTranslation(v.x, v.y, v.z); ci.setMatrixAt(k, m4);
      const rr = rnd(); col.set(rr < 0.62 ? '#b3121d' : rr < 0.76 ? '#d2452a' : rr < 0.88 ? '#e0b43a' : rr < 0.96 ? '#6f9a3a' : '#4a0d14');
      ci.setColorAt(k++, col);
    }
    ci.castShadow = false; this.scene.add(ci);
    // shade trees
    this.canopy = this.canopy || ['#3e6a32', '#4d7a3a', '#365e2c'].map((c) => this.foliageMat({ color: c, roughness: 0.6 }));
    for (let i = 0; i < 16; i++) {
      const x = -55 + rnd() * 75, z = -20 - rnd() * 45;
      const t = new THREE.Group();
      const tr = this.cyl(0.18, 0.28, 5, this.M.woodDark); t.add(tr);
      for (let j = 0; j < 4; j++) { const b = this.mesh(new THREE.IcosahedronGeometry(1.6 + rnd(), 3), this.canopy[j % 3]); b.position.set((rnd() - 0.5) * 2.4, 5.2 + rnd() * 1.4, (rnd() - 0.5) * 2.4); b.scale.y = 0.6; t.add(b); }
      t.position.set(x, this.h(x, z), z); this.scene.add(t);
    }
    // farmhouse
    const fh = new THREE.Group();
    fh.add(this.box(6, 2.8, 5, this.M.plaster), this.box(6.4, 0.2, 0.2, this.M.woodDark, 0, 2.8, 2.5));
    const roof = this.mesh(new THREE.CylinderGeometry(0.01, 4.4, 1.8, 4, 1), this.M.tinRust); roof.rotation.y = Math.PI / 4; roof.scale.set(1.0, 1, 0.82); roof.position.y = 3.7; fh.add(roof);
    fh.add(this.box(1, 1.9, 0.1, this.M.woodDark, 0.8, 0, 2.52), this.box(0.9, 0.8, 0.1, this.M.paint, -1.6, 1.1, 2.52));
    this.place(fh, 'field', 26, 6, -0.3);
    // pickers in the aisle
    const fa = ST.field.a;
    this.addPerson('field', 0.4, 2, -1.2, { type: 'picker', basket: true, hat: 'straw' });
    this.addPerson('field', -0.4, -1.5, 1.6, { type: 'picker', basket: true });
    this.addPerson('field', 0.5, -4.6, -1.5, { type: 'picker', basket: true, hat: 'straw' });
    this.addPerson('field', 5, 3, 0.3, { type: 'carrier', sack: true, sackMat: this.M.jute, path: [[fa[0] + 5, fa[1] + 3], [fa[0] + 9, fa[1] + 14]] });
    // strip picking tarp (Brazil/Vietnam/Uganda)
    this.strip = new THREE.Group();
    const tarp = this.mesh(new THREE.PlaneGeometry(3.2, 2.2), this.M.tarp); tarp.rotation.x = -Math.PI / 2; tarp.position.y = 0.06;
    const pile = this.mesh(new THREE.SphereGeometry(0.7, 12, 8, 0, 6.3, 0, 1.2), this.layerMat('cherry', [1.5, 1.5])); pile.scale.y = 0.35; pile.position.set(0.4, 0, 0.2);
    this.strip.add(tarp, pile);
    this.place(this.strip, 'field', 5.2, -1.2, 0.1);
    const sp = this.person({ type: 'stripper', hat: 'cap' }); sp.position.set(-0.6, 0, -0.4); sp.rotation.y = 2.8; this.strip.add(sp); this.people.push(sp); sp.userData.base = sp.position.clone();
    this.strip.visible = false;
    // harvester (Brazil)
    const hv = new THREE.Group();
    const frame = this.mat('#d8452a', { roughness: 0.5 });
    hv.add(this.box(0.4, 3.6, 3.4, frame, -1.3, 0.6, 0), this.box(0.4, 3.6, 3.4, frame, 1.3, 0.6, 0), this.box(3, 0.5, 3.6, frame, 0, 4.0, 0), this.box(1.2, 1, 1.4, this.M.black, 0, 4.5, 0.8));
    for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3]) { const wh = this.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16), this.M.black); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.55, sz); hv.add(wh); }
    const rods = new THREE.Group();
    for (let i = 0; i < 14; i++) for (const sx of [-0.75, 0.75]) { const r = this.mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), this.M.black); r.rotation.z = Math.PI / 2; r.position.set(sx * 0.5, 0.9 + i * 0.18, 0); rods.add(r); }
    hv.add(rods); hv.userData.rods = rods;
    this.harvester = hv; this.place(hv, 'field', -14, 7.6, Math.PI / 2); hv.userData.x0 = hv.position.x; hv.visible = false;
  }

  buildReception() {
    const g = new THREE.Group();
    // flotation tank with hopper
    g.add(this.box(3.4, 0.9, 1.6, this.M.concrete, 0, 0, 0));
    const wtr = this.mesh(new THREE.PlaneGeometry(3.1, 1.3), this.M.water); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.86; g.add(wtr);
    const fl = this.mesh(new THREE.PlaneGeometry(1.2, 1.2), this.layerMat('cherryDry', [1, 1]), false); fl.rotation.x = -Math.PI / 2; fl.position.set(-0.9, 0.87, 0); g.add(fl);
    const hop = this.mesh(new THREE.CylinderGeometry(1.1, 0.25, 1.1, 4, 1, true), this.mat('#8c949a', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide })); hop.rotation.y = Math.PI / 4; hop.position.set(1.0, 1.45, 0); g.add(hop);
    const fill = this.mesh(new THREE.PlaneGeometry(1.4, 1.4), this.layerMat('cherry', [1, 1])); fill.rotation.x = -Math.PI / 2; fill.position.set(1.0, 1.85, 0); g.add(fill);
    // scale & sacks
    g.add(this.box(0.8, 0.12, 0.8, this.M.steel, -2.8, 0, 1.6), this.box(0.08, 1.2, 0.08, this.M.steel, -2.8, 0.12, 1.25), this.box(0.4, 0.3, 0.08, this.M.white, -2.8, 1.3, 1.25));
    for (let i = 0; i < 4; i++) { const s = this.mesh(new THREE.CapsuleGeometry(0.3, 0.45, 4, 10), this.M.jute); s.position.set(-3.5 + (i % 2) * 0.7, 0.4, -0.6 - (i >> 1) * 0.7); s.rotation.z = Math.PI / 2; g.add(s); }
    // sorting tarp
    const t = this.mesh(new THREE.PlaneGeometry(2.6, 2), this.M.tarp); t.rotation.x = -Math.PI / 2; t.position.set(0.5, 0.04, 2.6); g.add(t);
    const c = this.mesh(new THREE.PlaneGeometry(2.2, 1.6), this.layerMat('cherry', [1.2, 1])); c.rotation.x = -Math.PI / 2; c.position.set(0.5, 0.07, 2.6); g.add(c);
    this.place(g, 'reception');
    this.addPerson('reception', -1.2, 2.6, 1.2, { type: 'sorter' });
    this.addPerson('reception', 2.2, 2.9, -1.4, { type: 'sorter' });
    this.addPerson('reception', -2.8, 0.7, 0.4, { type: 'idle', hat: 'straw' });
  }

  shed(w, d, h, x = 0, z = 0) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(this.box(0.18, h, 0.18, this.M.woodDark, sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1)));
    const r = this.mesh(new THREE.PlaneGeometry(w + 0.8, d + 0.8), this.M.roof); r.rotation.x = -Math.PI / 2 + 0.12; r.position.y = h + 0.1; g.add(r);
    g.position.set(x, 0, z);
    return g;
  }

  buildPulper() {
    const g = new THREE.Group();
    g.add(this.shed(5, 4.2, 3.2));
    const frame = this.mat('#3f6e8a', { roughness: 0.45, metalness: 0.2 });
    g.add(this.box(1.6, 0.9, 1.1, frame, 0, 0, 0));
    const drum = this.mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 20), this.M.drum); drum.rotation.z = Math.PI / 2; drum.position.set(0, 1.25, 0); g.add(drum); this.pulpDrum = drum;
    g.add(this.box(1.5, 0.25, 0.9, frame, 0, 1.55, 0));
    const hop = this.mesh(new THREE.CylinderGeometry(0.95, 0.3, 0.9, 4, 1, true), this.mat('#7f878c', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide })); hop.rotation.y = Math.PI / 4; hop.position.set(0, 2.25, 0); g.add(hop);
    const top = this.mesh(new THREE.PlaneGeometry(1.25, 1.25), this.layerMat('cherry', [0.8, 0.8])); top.rotation.x = -Math.PI / 2; top.position.set(0, 2.55, 0); g.add(top);
    g.add(this.box(0.6, 0.5, 0.5, this.M.paintGreen, 1.2, 0, 0.6));
    const chute = this.mesh(new THREE.BoxGeometry(0.5, 0.06, 1.2), this.M.steel); chute.position.set(0, 0.75, 0.9); chute.rotation.x = 0.4; g.add(chute);
    const chute2 = chute.clone(); chute2.position.set(-0.9, 0.75, -0.6); chute2.rotation.set(-0.4, 0.6, 0); g.add(chute2);
    // pulp pile
    const pile = this.mesh(new THREE.SphereGeometry(1.2, 16, 10, 0, 6.3, 0, 1.3), this.M.pulp); pile.scale.y = 0.45; pile.position.set(-1.8, 0, -1.6); g.add(pile);
    // parchment output bucket
    const bk = this.mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.45, 14, 1, true), this.mat('#2f6fa6', { side: THREE.DoubleSide })); bk.position.set(0, 0.22, 1.5); g.add(bk);
    const muc = this.mesh(new THREE.CircleGeometry(0.3, 14), this.layerMat('mucilage', [0.4, 0.4])); muc.rotation.x = -Math.PI / 2; muc.position.set(0, 0.4, 1.5); g.add(muc);
    this.place(g, 'pulper', 0, 0, -0.2);
    this.addPerson('pulper', 1.3, -1.2, -0.6, { type: 'operator' });
  }

  buildTanks() {
    const g = new THREE.Group();
    g.add(this.shed(7.4, 3.8, 3.4));
    this.fermLayers = [];
    for (let i = 0; i < 3; i++) {
      const x = -2.3 + i * 2.3;
      const t = new THREE.Group();
      t.add(this.box(2.1, 1.1, 0.12, this.M.tile, 0, 0, 0.94), this.box(2.1, 1.1, 0.12, this.M.tile, 0, 0, -0.94), this.box(0.12, 1.1, 2, this.M.tile, 1.0, 0, 0), this.box(0.12, 1.1, 2, this.M.tile, -1.0, 0, 0));
      const lay = this.mesh(new THREE.PlaneGeometry(1.9, 1.8), this.layerMat(i === 2 ? 'parchWet' : 'mucilage', [1.4, 1.4]), false); lay.rotation.x = -Math.PI / 2; lay.position.y = 0.75; t.add(lay);
      this.fermLayers.push(lay);
      if (i === 1) { const w = this.mesh(new THREE.PlaneGeometry(1.9, 1.8), this.M.water, false); w.rotation.x = -Math.PI / 2; w.position.y = 0.95; t.add(w); }
      t.position.x = x; g.add(t);
    }
    // bubbles in middle tank
    const bg = new THREE.SphereGeometry(0.03, 6, 4);
    this.bubbles = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), 40);
    this.bubbles.userData.p = Array.from({ length: 40 }, () => [(rnd() - 0.5) * 1.7, rnd(), (rnd() - 0.5) * 1.6]);
    g.add(this.bubbles);
    this.place(g, 'tanks');
    this.addPerson('tanks', 0.2, 1.8, 3.0, { type: 'operator', hat: 'cap' });
  }

  buildAnaer() {
    const g = new THREE.Group();
    const S = this.M.steel;
    const body = this.cyl(0.85, 0.85, 1.9, S, 0, 0.45, 0, 28); g.add(body);
    const cone = this.mesh(new THREE.CylinderGeometry(0.2, 0.85, 0.5, 28), S); cone.position.y = 2.6; g.add(cone);
    const bot = this.mesh(new THREE.CylinderGeometry(0.85, 0.25, 0.4, 28), S); bot.position.y = 0.25; g.add(bot);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; g.add(this.box(0.08, 0.5, 0.08, S, Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7)); }
    g.add(this.cyl(0.07, 0.07, 0.3, S, 0, 2.85, 0, 10));
    const gauge = this.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), this.M.white); gauge.rotation.x = Math.PI / 2; gauge.position.set(0, 1.7, 0.87); g.add(gauge);
    const valve = this.mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), this.M.paintRed); valve.position.set(0.5, 0.6, 0.72); g.add(valve);
    // airlock hose into bucket
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 3.0, 0), new THREE.Vector3(0.6, 3.2, 0.2), new THREE.Vector3(1.3, 1.6, 0.5), new THREE.Vector3(1.4, 0.55, 0.55)]);
    g.add(this.mesh(new THREE.TubeGeometry(curve, 24, 0.035, 6), this.mat('#e8e8e0', { transparent: true, opacity: 0.8 })));
    const bk = this.mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.5, 14, 1, true), this.mat('#eeeeee', { transparent: true, opacity: 0.6, side: THREE.DoubleSide })); bk.position.set(1.4, 0.25, 0.55); g.add(bk);
    // sealed barrels
    for (let i = 0; i < 3; i++) { const b = this.cyl(0.32, 0.32, 0.9, this.mat('#2f6fa6', { roughness: 0.4 }), -1.6 - (i % 2) * 0.75, 0, 0.4 - (i >> 1) * 0.75, 18); g.add(b); g.add(this.cyl(0.33, 0.33, 0.05, this.M.black, b.position.x, 0.9, b.position.z, 18)); }
    this.airBubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }), 10);
    this.airBubbles.position.set(1.4, 0, 0.55); this.airBubbles.userData.p = Array.from({ length: 10 }, () => rnd()); g.add(this.airBubbles);
    this.place(g, 'anaer');
    this.addPerson('anaer', 1.1, 1.4, -0.6, { type: 'operator', hat: 'cap' });
  }

  buildChannel() {
    const g = new THREE.Group();
    const L = 12;
    g.add(this.box(L, 0.6, 0.12, this.M.concrete, 0, 0, 0.55), this.box(L, 0.6, 0.12, this.M.concrete, 0, 0, -0.55), this.box(L, 0.1, 1.2, this.M.concrete, 0, 0, 0));
    this.waterTex = this.canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#4f8f9c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, i * 11 + 4); c.bezierCurveTo(20, i * 11, 40, i * 11 + 8, 64, i * 11 + 4); c.stroke(); } }, [12, 1]);
    const wm = new THREE.MeshStandardMaterial({ map: this.waterTex, transparent: true, opacity: 0.85, roughness: 0.1 });
    const w = this.mesh(new THREE.PlaneGeometry(L, 0.98), wm, false); w.rotation.x = -Math.PI / 2; w.position.y = 0.45; g.add(w);
    this.chanBeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshStandardMaterial({ color: '#e8d9b0', roughness: 0.5 }), 120);
    this.chanBeads.userData.p = Array.from({ length: 120 }, () => [rnd() * L - L / 2, (rnd() - 0.5) * 0.8]);
    g.add(this.chanBeads);
    // soaking tank at end
    const st = new THREE.Group();
    st.add(this.box(2, 1, 0.12, this.M.tile, 0, 0, 0.94), this.box(2, 1, 0.12, this.M.tile, 0, 0, -0.94), this.box(0.12, 1, 2, this.M.tile, 1, 0, 0), this.box(0.12, 1, 2, this.M.tile, -1, 0, 0));
    const sw = this.mesh(new THREE.PlaneGeometry(1.9, 1.8), this.M.water, false); sw.rotation.x = -Math.PI / 2; sw.position.y = 0.85; st.add(sw);
    const sl = this.mesh(new THREE.PlaneGeometry(1.9, 1.8), this.layerMat('parchWet', [1.2, 1.2]), false); sl.rotation.x = -Math.PI / 2; sl.position.y = 0.6; st.add(sl);
    st.position.x = L / 2 + 1.4; g.add(st);
    this.place(g, 'channel');
    this.addPerson('channel', -2, 1.0, Math.PI, { type: 'paddler', tool: 'paddle', hat: 'straw' });
    this.addPerson('channel', 2.5, -1.0, 0, { type: 'paddler', tool: 'paddle' });
  }

  bed(len, mat) {
    const g = new THREE.Group();
    for (let i = 0; i <= 4; i++) for (const s of [-0.45, 0.45]) g.add(this.box(0.07, 0.95, 0.07, this.M.woodDark, -len / 2 + i * len / 4, 0, s));
    g.add(this.box(len, 0.06, 1.0, this.M.net, 0, 0.92, 0));
    const lay = this.mesh(new THREE.BoxGeometry(len - 0.1, 0.05, 0.92), mat); lay.position.y = 1.0; lay.castShadow = false; g.add(lay);
    return g;
  }
  buildBeds() {
    const g = new THREE.Group();
    this.bedMat = this.layerMat('parch', [10, 1]);
    for (let r = 0; r < 6; r++) { const b = this.bed(10, this.bedMat); b.position.set(0, 0, -5 + r * 1.9); g.add(b); }
    this.place(g, 'beds');
    this.addPerson('beds', 1.5, -4.05, 0, { type: 'sorter', hat: 'cap' });
    this.addPerson('beds', -2.5, -0.25, Math.PI, { type: 'sorter' });
    this.addPerson('beds', 3.5, 3.55, 0, { type: 'sorter', hat: 'straw' });
    // parabolic dryer (marquesina)
    const mq = new THREE.Group();
    const tunnel = this.mesh(new THREE.CylinderGeometry(2.2, 2.2, 10, 24, 1, true, -Math.PI / 2, Math.PI), this.M.plastic, false); tunnel.rotation.z = Math.PI / 2; tunnel.position.y = 0; mq.add(tunnel);
    for (let i = 0; i <= 5; i++) { const arch = this.mesh(new THREE.TorusGeometry(2.2, 0.04, 6, 24, Math.PI), this.M.woodDark); arch.rotation.y = Math.PI / 2; arch.position.x = -5 + i * 2; mq.add(arch); }
    this.mqMat = this.layerMat('parch', [8, 3]);
    const fl = this.mesh(new THREE.PlaneGeometry(9.6, 3.4), this.mqMat, false); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.6; mq.add(fl);
    mq.add(this.box(9.6, 0.55, 3.6, this.M.concreteDark, 0, 0, 0));
    this.place(mq, 'beds', -9, 9, 0.2);
  }

  buildPatio() {
    const g = new THREE.Group();
    g.add(this.box(15, 0.16, 11, this.M.concrete, 0, -0.06, 0));
    const geo = new THREE.PlaneGeometry(14, 10, 140, 2); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, 0.13 + 0.035 * Math.sin(p.getX(i) * 6));
    geo.computeVertexNormals();
    this.patioMat = this.layerMat('cherry', [7, 5]);
    const lay = this.mesh(geo, this.patioMat, false); g.add(lay);
    this.place(g, 'patio');
    this.addPerson('patio', -2, 1, 1.4, { type: 'raker', tool: 'rake', hat: 'straw' });
    this.addPerson('patio', 3.5, -2.5, -1.6, { type: 'raker', tool: 'rake' });
  }

  buildDryer() {
    const g = new THREE.Group();
    g.add(this.shed(7, 5, 3.8));
    const drum = this.mesh(new THREE.CylinderGeometry(1.1, 1.1, 4.2, 28), this.M.drum); drum.rotation.z = Math.PI / 2; drum.position.y = 1.55; g.add(drum); this.dryDrum = drum;
    for (const x of [-1.6, 1.6]) { const ring = this.mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 32), this.M.black); ring.rotation.y = Math.PI / 2; ring.position.set(x, 1.55, 0); g.add(ring); g.add(this.box(0.3, 0.5, 1.8, this.M.paint, x, 0, 0)); }
    g.add(this.box(1.6, 1.8, 1.6, this.M.paintRed, 3.4, 0, 0.4));
    const ch = this.cyl(0.18, 0.18, 4.2, this.M.black, 3.6, 1.8, 0.6, 12); g.add(ch);
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ color: '#ff7a2a' })); fire.position.set(3.4, 0.45, 1.21); g.add(fire);
    this.place(g, 'dryer');
    this.smokeA = this.smoke(new THREE.Vector3(ST.dryer.a[0] + 3.6, this.h(...ST.dryer.a) + 6.2, ST.dryer.a[1] + 0.6));
    this.addPerson('dryer', -1, 2.2, 0.4, { type: 'operator', hat: 'cap' });
  }

  smoke(pos) {
    const tex = this.canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(230,230,230,0.8)'); gr.addColorStop(1, 'rgba(230,230,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const n = 24, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, map: tex, transparent: true, depthWrite: false, opacity: 0.55, color: '#d8d4cc' }));
    pts.userData = { base: pos, ph: Array.from({ length: n }, () => rnd()) };
    pts.frustumCulled = false;
    this.scene.add(pts); return pts;
  }

  buildWetHuller() {
    const g = new THREE.Group();
    g.add(this.shed(5, 4, 3));
    g.add(this.box(1.2, 1.1, 0.9, this.mat('#8a4a2a', { roughness: 0.5 }), 0, 0, 0));
    const hop = this.mesh(new THREE.CylinderGeometry(0.7, 0.2, 0.7, 4, 1, true), this.mat('#7f878c', { metalness: 0.5, side: THREE.DoubleSide })); hop.rotation.y = Math.PI / 4; hop.position.set(0, 1.45, 0); g.add(hop);
    const top = this.mesh(new THREE.PlaneGeometry(0.9, 0.9), this.layerMat('parchWet', [0.6, 0.6])); top.rotation.x = -Math.PI / 2; top.position.set(0, 1.75, 0); g.add(top);
    g.add(this.box(0.5, 0.45, 0.45, this.M.paintGreen, -1, 0, 0.3));
    const t = this.mesh(new THREE.PlaneGeometry(2.6, 2), this.M.tarp); t.rotation.x = -Math.PI / 2; t.position.set(0.5, 0.03, 1.9); g.add(t);
    const pile = this.mesh(new THREE.SphereGeometry(0.75, 14, 8, 0, 6.3, 0, 1.2), this.layerMat('greenWet', [1.2, 1.2])); pile.scale.y = 0.35; pile.position.set(0.6, 0.03, 1.9); g.add(pile);
    this.place(g, 'wethuller');
    this.addPerson('wethuller', 1.2, -0.6, -1.2, { type: 'operator', hat: 'cap' });
  }

  sackStack(mat, nx, ny, nz, label) {
    const g = new THREE.Group();
    const geo = new THREE.CapsuleGeometry(0.3, 0.42, 4, 10);
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
      const s = this.mesh(geo, mat); s.rotation.z = Math.PI / 2; s.scale.set(1, 1, 0.62);
      s.position.set(x * 1.0 + (y % 2) * 0.15, 0.42 + y * 0.42, z * 0.62); g.add(s);
    }
    g.add(this.box(nx * 1.0 + 0.2, 0.14, nz * 0.62 + 0.1, this.M.wood, (nx - 1) * 0.5, 0, (nz - 1) * 0.31));
    return g;
  }

  buildBodega() {
    const g = new THREE.Group();
    const W = 11, D = 8, H = 4;
    g.add(this.box(W, H, 0.25, this.M.plaster, 0, 0, -D / 2), this.box(0.25, H, D, this.M.plaster, -W / 2, 0, 0), this.box(0.25, H, D, this.M.plaster, W / 2, 0, 0));
    g.add(this.box(W, 0.15, D, this.M.concrete, 0, 0, 0));
    for (const s of [-1, 1]) { const r = this.mesh(new THREE.PlaneGeometry(W + 1, D / 2 + 0.9), this.M.roof); r.rotation.x = -Math.PI / 2 + s * 0.42; r.position.set(0, H + 0.85, s * D / 4); g.add(r); }
    const st1 = this.sackStack(this.M.sackWhite, 4, 4, 3); st1.position.set(-4.4, 0.15, -3); g.add(st1);
    const st2 = this.sackStack(this.M.sackWhite, 3, 3, 3); st2.position.set(1, 0.15, -3); g.add(st2);
    const l = this.mesh(new THREE.SphereGeometry(0.15, 10, 8), this.M.lamp, false); l.position.set(0, H - 0.3, 0); g.add(l);
    this.place(g, 'bodega');
    this.lampAt(new THREE.Vector3(ST.bodega.a[0], H - 0.6, ST.bodega.a[1]));
    this.addPerson('bodega', -1.5, 1.8, 0.2, { type: 'carrier', sack: true, path: [[ST.bodega.a[0] - 1.5, ST.bodega.a[1] + 1.8], [ST.bodega.a[0] + 1.5, ST.bodega.a[1] + 6]] });
  }

  lampAt(pos) {
    const pl = new THREE.PointLight('#ffb866', 0, 14, 1.6); pl.position.copy(pos); this.scene.add(pl); this.lamps.push(pl);
  }

  buildMill() {
    const g = new THREE.Group();
    const W = 14, D = 10, H = 5.5;
    g.add(this.box(W, 0.15, D, this.M.concrete, 0, 0, 0));
    for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) g.add(this.box(0.25, H, 0.25, this.M.tin, -W / 2 + i * W / 4, 0, s * D / 2));
    g.add(this.box(W, H, 0.15, this.mat('#c9c2b4'), 0, 0, -D / 2));
    for (const s of [-1, 1]) { const r = this.mesh(new THREE.PlaneGeometry(W + 1.2, D / 2 + 1), this.M.roof); r.rotation.x = -Math.PI / 2 + s * 0.3; r.position.set(0, H + 0.7, s * D / 4); g.add(r); }
    // huller
    g.add(this.box(1.6, 1.6, 1.2, this.M.paint, -3, 0.15, -1));
    g.add(this.cyl(0.5, 0.5, 1.2, this.M.steel, -3, 1.75, -1, 20));
    const hop = this.mesh(new THREE.CylinderGeometry(0.8, 0.25, 0.8, 4, 1, true), this.mat('#8c949a', { metalness: 0.5, side: THREE.DoubleSide })); hop.rotation.y = Math.PI / 4; hop.position.set(-3, 3.35, -1); g.add(hop);
    // bucket elevator
    g.add(this.box(0.5, 5, 0.5, this.M.paintGreen, -4.4, 0.15, -1), this.box(0.9, 0.5, 0.6, this.M.paintGreen, -4.0, 5.1, -1));
    // polisher
    g.add(this.box(1.2, 1.3, 1, this.M.paintRed, 0.5, 0.15, -1.5));
    g.add(this.cyl(0.35, 0.35, 0.9, this.M.steel, 0.5, 1.45, -1.5, 16));
    // cyclone outside
    const cy = new THREE.Group();
    cy.add(this.cyl(0.6, 0.6, 1.4, this.M.steel, 0, 2.4, 0, 20));
    const cone = this.mesh(new THREE.CylinderGeometry(0.6, 0.12, 1.6, 20), this.M.steel); cone.position.y = 1.6; cy.add(cone);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; cy.add(this.box(0.06, 3.0, 0.06, this.M.black, Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55)); }
    const duct = new THREE.CatmullRomCurve3([new THREE.Vector3(0.5, 3.2, 0), new THREE.Vector3(3, 4.2, 0.5), new THREE.Vector3(6.2, 2.5, 0.8)]);
    cy.add(this.mesh(new THREE.TubeGeometry(duct, 20, 0.16, 8), this.M.steel));
    const husk = this.mesh(new THREE.SphereGeometry(0.9, 12, 8, 0, 6.3, 0, 1.3), this.mat('#b08a55')); husk.scale.y = 0.4; cy.add(husk);
    cy.position.set(-9.6, 0, -1); g.add(cy);
    this.place(g, 'mill', 0, 0, 0);
    this.lampAt(new THREE.Vector3(ST.mill.a[0], H - 0.5, ST.mill.a[1]));
    this.addPerson('mill', -1.8, 1.2, -0.4, { type: 'operator', hat: 'cap' });
  }

  buildSorting() {
    const g = new THREE.Group();
    g.add(this.box(12, 0.15, 8, this.M.concrete, 0, 0, 0));
    g.add(this.shed(12, 8, 4.2));
    // gravity table
    const gt = new THREE.Group();
    gt.add(this.box(0.15, 0.9, 0.15, this.M.paint, -1.1, 0, -0.7), this.box(0.15, 0.9, 0.15, this.M.paint, 1.1, 0, -0.7), this.box(0.15, 0.9, 0.15, this.M.paint, -1.1, 0, 0.7), this.box(0.15, 0.9, 0.15, this.M.paint, 1.1, 0, 0.7));
    const deck = this.mesh(new THREE.BoxGeometry(2.6, 0.08, 1.8), this.layerMat('green', [2, 1.4])); deck.position.y = 1.05; deck.rotation.z = 0.08; deck.rotation.x = -0.05; gt.add(deck); this.gravDeck = deck;
    gt.position.set(-3.8, 0.15, -1.6); g.add(gt);
    // optical sorter
    const os = new THREE.Group();
    os.add(this.box(1.2, 2.2, 1.1, this.mat('#e9eef0', { roughness: 0.35 }), 0, 0, 0));
    os.add(this.box(1.22, 0.25, 0.4, this.M.black, 0, 1.6, 0.4));
    const oh = this.mesh(new THREE.CylinderGeometry(0.6, 0.2, 0.6, 4, 1, true), this.mat('#8c949a', { metalness: 0.5, side: THREE.DoubleSide })); oh.rotation.y = Math.PI / 4; oh.position.y = 2.5; os.add(oh);
    const scr = this.mesh(new THREE.PlaneGeometry(0.4, 0.28), new THREE.MeshBasicMaterial({ color: '#4ab3e0' })); scr.position.set(0.3, 1.2, 0.56); os.add(scr);
    os.position.set(0.2, 0.15, -2.2); g.add(os);
    this.puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 4), new THREE.MeshStandardMaterial({ color: '#2a3a2a' }), 20);
    this.puffs.userData.p = Array.from({ length: 20 }, () => rnd()); this.puffs.position.set(0.2, 0.15, -2.2); g.add(this.puffs);
    // belt with sorters
    this.beltMat = this.layerMat('green', [6, 0.5]);
    g.add(this.box(6.5, 0.85, 0.15, this.M.paint, 2.2, 0, 1.6));
    const belt = this.mesh(new THREE.BoxGeometry(6.5, 0.06, 0.7), this.beltMat); belt.position.set(2.2, 0.95, 1.85); g.add(belt);
    for (let i = 0; i < 3; i++) { const p = this.person({ type: 'sorter', shirt: ['#c2452d', '#e0b43a', '#3f7f5a'][i], hat: 'cap' }); p.position.set(0.4 + i * 1.7, 0.15, 2.65); p.rotation.y = Math.PI; g.add(p); p.userData.base = p.position.clone(); this.people.push(p); }
    // sacks waiting
    const st = this.sackStack(this.M.jute, 2, 2, 2); st.position.set(4.8, 0.15, -2.8); g.add(st);
    this.place(g, 'sorting');
  }

  sackTexture(text, sub) {
    return this.canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#b8935a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i += 4) { g.fillStyle = 'rgba(80,50,20,0.22)'; g.fillRect(i, 0, 2, h); }
      for (let i = 0; i < h; i += 4) { g.fillStyle = 'rgba(80,50,20,0.18)'; g.fillRect(0, i, w, 2); }
      g.fillStyle = 'rgba(40,20,10,0.85)'; g.textAlign = 'center';
      g.font = `64px "Saira Stencil One", Impact, sans-serif`;
      g.fillText(text, w / 2, h / 2 + 4, w - 40);
      g.font = `30px "Saira Stencil One", Impact, sans-serif`;
      g.fillText(sub, w / 2, h / 2 + 60, w - 40);
      g.strokeStyle = 'rgba(40,20,10,0.8)'; g.lineWidth = 5; g.strokeRect(30, 30, w - 60, h - 60);
    });
  }
  setSackLabel(text, sub) {
    const t = this.sackTexture(text, sub);
    t.repeat.set(1, 1);
    this.labelSackMat.map = t; this.labelSackMat.needsUpdate = true;
  }

  buildPort() {
    const g = new THREE.Group();
    g.add(this.box(46, 1.8, 10, this.M.concreteDark, 4, -1.5, 3));
    for (let i = 0; i < 8; i++) g.add(this.cyl(0.18, 0.22, 0.5, this.M.black, -16 + i * 5.5, 0.3, 7.6, 10));
    // jute sacks with label
    this.labelSackMat = this.mat('#ffffff', { roughness: 1, map: this.sackTexture('COFFEE', 'GREEN COFFEE · 60 KG') });
    const front = new THREE.Group();
    const geo = new RoundedBoxGeometry(0.98, 0.38, 0.62, 2, 0.08);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) {
      const s = this.mesh(geo, [this.M.jute, this.M.jute, this.M.jute, this.M.jute, z === 1 ? this.labelSackMat : this.M.jute, z === 0 ? this.labelSackMat : this.M.jute]);
      s.position.set(-12 + x * 1.02 + (y % 2) * 0.06, 0.5 + y * 0.38, -1.6 + z * 0.66); front.add(s);
    }
    g.add(front);
    g.add(this.box(4.4, 0.14, 2.2, this.M.wood, -10.4, 0.3, -0.6));
    // truck with container
    const tr = new THREE.Group();
    tr.add(this.box(2.3, 2.1, 2.3, this.mat('#2f6f8f', { roughness: 0.4 }), 3.6, 0.6, 0));
    tr.add(this.box(1.2, 0.8, 2.25, this.mat('#9fc8dc', { roughness: 0.1, metalness: 0.3 }), 4.25, 1.6, 0));
    tr.add(this.box(9, 0.3, 2.2, this.M.black, -1.4, 0.75, 0));
    const ctn = this.mesh(new THREE.BoxGeometry(6.06, 2.59, 2.44), this.mat('#b8452c', { map: this.M.container.map, roughness: 0.55, metalness: 0.25 })); ctn.position.set(-1.6, 2.35, 0); tr.add(ctn);
    for (const x of [3.8, -0.5, -4.5]) for (const z of [-1.05, 1.05]) { const wh = this.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), this.M.black); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.5, z); tr.add(wh); }
    tr.position.set(1, 0.3, -1); g.add(tr);
    this.addPerson('port', -7.2, -0.2, Math.PI / 2, { type: 'carrier', sack: true, sackMat: this.M.jute, path: [[ST.port.a[0] - 9, ST.port.a[1] - 0.5], [ST.port.a[0] - 3.4, ST.port.a[1] - 1]] });
    // container stacks
    const cols = ['#2f6f8f', '#b0302a', '#e0b43a', '#3f6e4a', '#7a4a8a', '#d8d8d0'];
    for (let i = 0; i < 10; i++) {
      const m = this.mat(cols[i % cols.length], { roughness: 0.5, metalness: 0.2, map: this.M.container.map });
      const c = this.mesh(new THREE.BoxGeometry(6.06, 2.59, 2.44), m); c.position.set(10 + (i % 3) * 6.4, 0.3 + 1.3 + Math.floor(i / 6) * 2.6, -2 + Math.floor((i % 6) / 3) * 2.6); g.add(c);
    }
    // gantry crane
    const cr = new THREE.Group(); const cm = this.mat('#e0b43a', { roughness: 0.45 });
    cr.add(this.box(0.6, 14, 0.6, cm, -3, 0, -3), this.box(0.6, 14, 0.6, cm, 3, 0, -3), this.box(0.6, 14, 0.6, cm, -3, 0, 3), this.box(0.6, 14, 0.6, cm, 3, 0, 3));
    cr.add(this.box(7, 0.8, 26, cm, 0, 14, 8));
    cr.add(this.box(2, 1.4, 2, this.M.white, 0, 12.6, 6));
    cr.position.set(13, 0.3, 4); g.add(cr);
    // ship
    const sh = new THREE.Group();
    const hull = this.mesh(new THREE.BoxGeometry(34, 4.5, 8), this.mat('#20303f', { roughness: 0.6 })); hull.position.y = 0.6; sh.add(hull);
    const bow = this.mesh(new THREE.CylinderGeometry(4, 4, 4.5, 3, 1, false, 0, Math.PI), this.mat('#20303f')); bow.rotation.y = Math.PI; bow.scale.set(1, 1, 1); bow.position.set(17, 0.6, 0); sh.add(bow);
    sh.add(this.box(34, 0.6, 8, this.M.paintRed, 0, -1.9, 0));
    sh.add(this.box(5, 5, 7, this.M.white, -13, 2.8, 0), this.box(4, 1.4, 7.6, this.mat('#9fc8dc', { metalness: 0.3, roughness: 0.1 }), -13, 7, 0));
    for (let i = 0; i < 12; i++) { const m = this.mat(cols[(i * 7) % cols.length], { map: this.M.container.map, roughness: 0.5 }); const c = this.mesh(new THREE.BoxGeometry(6.06, 2.59, 2.44), m); c.position.set(-6 + (i % 4) * 6.3, 4.2 + Math.floor(i / 8) * 2.6, -2.6 + (Math.floor(i / 4) % 2) * 2.6 + (i >= 8 ? 1.3 : 0)); sh.add(c); }
    sh.position.set(10, 0, 15.5); g.add(sh); this.ship = sh;
    this.place(g, 'port');
    g.position.y = 0.3;
    this.lampAt(new THREE.Vector3(ST.port.a[0] - 10, 4, ST.port.a[1]));
  }

  buildRoaster() {
    const g = new THREE.Group();
    g.add(this.box(12, 0.2, 9, this.M.concrete, 0, -0.05, 0));
    const wall = this.mat('#d8cdbd');
    g.add(this.box(12, 4.6, 0.2, wall, 0, 0, -4.4), this.box(0.2, 4.6, 9, wall, -6, 0, 0), this.box(12, 0.5, 0.22, this.mat('#7a3a2a'), 0, 0, -4.3));
    const roof = this.mesh(new THREE.PlaneGeometry(13, 6), this.M.roof); roof.rotation.x = -Math.PI / 2 + 0.12; roof.position.set(0, 5.0, -1.8); g.add(roof);
    // drum roaster
    const R = new THREE.Group();
    const body = this.mat('#7d1b1d', { metalness: 0.35, roughness: 0.32 }); const brass = this.mat('#c9a14a', { metalness: 0.9, roughness: 0.3 });
    R.add(this.box(1.6, 1.3, 1.4, body, 0, 0, 0));
    const drum = this.mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.4, 28), body); drum.rotation.x = Math.PI / 2; drum.position.set(0, 1.9, 0); R.add(drum);
    const face = this.mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.08, 28), brass); face.rotation.x = Math.PI / 2; face.position.set(0, 1.9, 0.72); R.add(face);
    const win = this.mesh(new THREE.CircleGeometry(0.14, 16), this.mat('#ffb04a', { emissive: '#ff7a1a', emissiveIntensity: 0.8 })); win.position.set(0.3, 2.05, 0.77); R.add(win);
    const hop = this.mesh(new THREE.CylinderGeometry(0.45, 0.12, 0.7, 20, 1, true), this.mat('#d5dade', { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })); hop.position.set(0, 3.0, -0.2); R.add(hop);
    const gb = this.mesh(new THREE.CircleGeometry(0.42, 18), this.layerMat('green', [0.4, 0.4])); gb.rotation.x = -Math.PI / 2; gb.position.set(0, 3.25, -0.2); R.add(gb);
    // cooling tray
    const tray = this.cyl(0.95, 0.95, 0.25, brass, 0, 0.75, 1.75, 32); R.add(tray);
    const roastLay = this.mesh(new THREE.CircleGeometry(0.88, 28), this.layerMat('roast', [0.8, 0.8])); roastLay.rotation.x = -Math.PI / 2; roastLay.position.set(0, 1.02, 1.75); R.add(roastLay);
    const arm = this.box(1.7, 0.06, 0.08, brass, 0, 1.04, 0); arm.position.set(0, 1.05, 1.75); R.add(arm); this.coolArm = arm;
    R.add(this.box(0.25, 0.75, 0.25, body, 0, 0, 1.75));
    R.add(this.cyl(0.14, 0.14, 2.2, this.M.steel, 0.6, 2.4, -0.5, 12));
    R.position.set(-1.2, 0.15, -1); g.add(R);
    g.add(this.box(2.2, 0.95, 0.8, this.M.wood, 3.2, 0.15, -2.6));
    this.place(g, 'roaster');
    this.smokeB = this.smoke(new THREE.Vector3(ST.roaster.a[0] - 0.6, this.h(...ST.roaster.a) + 5.4, ST.roaster.a[1] - 1.5));
    this.addPerson('roaster', 0.8, 0.9, -0.4, { type: 'operator', hat: false, shirt: '#2b2f3a' });
    this.lampAt(new THREE.Vector3(ST.roaster.a[0], this.h(...ST.roaster.a) + 3.6, ST.roaster.a[1]));
  }

  buildFlow() {
    this.beadCount = 70;
    this.beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.4 }), this.beadCount);
    this.beads.frustumCulled = false; this.beads.castShadow = true;
    this.scene.add(this.beads);
    this.flowMat = new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.6, transparent: true, opacity: 0.9 });
    this.flowLine = new THREE.Mesh(new THREE.BufferGeometry(), this.flowMat);
    this.scene.add(this.flowLine);
  }
  buildRing() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 64), new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; this.ring = ring; this.scene.add(ring);
  }

  // route: [{st, bean}] with current index
  setRoute(steps, idx, country) {
    this.route = steps;
    const pts = [];
    let last = null;
    for (const s of steps) { if (s.st === last) continue; last = s.st; const a = this.anchor(s.st); pts.push(new THREE.Vector3(a.x + 0.5, 0, a.z + 3.2)); }
    if (pts.length < 2) pts.push(pts[0].clone().add(new THREE.Vector3(1, 0, 0)));
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.max(2, Math.ceil(a.distanceTo(b) / 1.2));
      for (let k = 0; k < n; k++) {
        const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        dense.push(new THREE.Vector3(x, Math.max(this.h(x, z), -0.45) + 0.32, z));
      }
    }
    dense.push(pts[pts.length - 1].clone().setY(Math.max(this.h(pts[pts.length - 1].x, pts[pts.length - 1].z), -0.45) + 0.32));
    this.curve = new THREE.CatmullRomCurve3(dense, false, 'centripetal', 0.5);
    this.flowLine.geometry.dispose();
    this.flowLine.geometry = new THREE.TubeGeometry(this.curve, Math.min(1500, dense.length * 4), 0.04, 6, false);
    // states along the curve for bead colours
    this.routeStates = steps.map((s) => s.bean);
    this.stepIdx = idx;
    this.country = country;
    this.strip.visible = ['BR', 'VN', 'UG'].includes(country);
    this.harvester.visible = country === 'BR';
  }

  setStep(step, proc) {
    this.dryT = 0;
    this.curProc = proc;
    this.curStep = step;
    // layers on drying stations
    const dryKey = { washed: 'parch', natural: 'cherry', honey: 'honey', wethulled: 'parchWet', anaerobic: 'cherryMid' }[proc] || 'parch';
    this.dryFrom = dryKey; this.dryTo = { cherry: 'cherryDry', cherryMid: 'cherryDry', parch: 'parch', honey: 'honey', parchWet: 'greenWet' }[dryKey];
    if (step.id === 'dry_wh2') { this.dryFrom = 'greenWet'; this.dryTo = 'greenWet'; }
    for (const m of [this.bedMat, this.patioMat, this.mqMat]) this.setLayer(m, this.dryFrom);
    this.layerKey = this.dryFrom;
    this.goStation(step.st);
  }

  goStation(id) {
    this.station = id;
    const s = ST[id], a = this.anchor(id);
    const tgt = new THREE.Vector3(a.x + s.look[0], a.y + s.look[1], a.z + s.look[2]);
    const pos = new THREE.Vector3(a.x + s.cam[0], a.y + s.cam[1], a.z + s.cam[2]);
    if (this.opts.mobile) pos.sub(tgt).multiplyScalar(1.18).add(tgt);
    this.camAnim = { t: 0, from: { p: this.camera.position.clone(), t: this.controls.target.clone() }, to: { p: pos, t: tgt }, lift: Math.min(30, this.camera.position.distanceTo(pos) * 0.3) };
    this.controls.enabled = false;
    this.ring.position.set(a.x, Math.max(a.y, 0.31) + 0.06, a.z);
  }

  setTheme(theme) {
    const dark = theme === 'dark';
    this.dark = dark;
    const { sun, p } = applySky(this.sky, theme);
    this.env = envFromSky(this.renderer, this.sky, this.env);
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = dark ? 0.45 : 0.6;
    this.scene.fog.color.set(p.fog);
    this.hemi.intensity = dark ? 0.5 : 0.7;
    this.hemi.color.set(dark ? '#9fb2e0' : '#dcecff'); this.hemi.groundColor.set(dark ? '#4a3a3a' : '#6b5a3a');
    this.sun.intensity = dark ? 1.4 : 2.5;
    this.sun.color.set(dark ? '#ff9a6a' : '#fff4e0');
    this.sun.position.copy(sun).multiplyScalar(110).add(this.sun.target.position);
    for (const l of this.lamps) l.intensity = dark ? 30 : 0;
    this.M.lamp.emissiveIntensity = dark ? 2 : 0;
    this.ring.material.color.set(dark ? '#ffb05a' : '#e0302a');
    this.flowMat.color.set(dark ? '#ffd8a0' : '#fff4e0'); this.flowMat.emissive.set(dark ? '#ffb070' : '#ffffff'); this.flowMat.emissiveIntensity = dark ? 0.6 : 0.25;
  }

  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.w = w; this.h2 = h; }
  setActive(a) { this.active = a; this.controls.enabled = a && !this.camAnim; }

  update(dt) {
    this.t += dt;
    const T = this.t;
    if (this.camAnim) {
      const c = this.camAnim; c.t = Math.min(1, c.t + dt / 1.7);
      const e = ease(c.t);
      this.camera.position.lerpVectors(c.from.p, c.to.p, e); this.camera.position.y += Math.sin(Math.PI * e) * c.lift;
      this.controls.target.lerpVectors(c.from.t, c.to.t, e);
      this.camera.lookAt(this.controls.target);
      if (c.t >= 1) { this.camAnim = null; this.controls.enabled = this.active; }
    } else if (this.active) this.controls.update();
    // water waves
    const wp = this.waterGeo.attributes.position, b = this.waterBase;
    for (let i = 0; i < wp.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; wp.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(x * 0.12 + T * 0.9) * 0.12 + Math.cos(z * 0.15 + T * 0.7) * 0.1; }
    wp.needsUpdate = true;
    this.ship.position.y = Math.sin(T * 0.6) * 0.12; this.ship.rotation.z = Math.sin(T * 0.4) * 0.008;
    // machines
    this.pulpDrum.rotation.x += dt * 6;
    this.dryDrum.rotation.x += dt * 0.6;
    this.coolArm.rotation.y += dt * 1.5;
    this.waterTex.offset.x -= dt * 0.35;
    if (this.seaNormal) { this.seaNormal.offset.x += dt * 0.004; this.seaNormal.offset.y += dt * 0.0025; }
    this.beltMat.map.offset.x -= dt * 0.25;
    this.gravDeck.position.x = Math.sin(T * 40) * 0.012;
    if (this.harvester.visible) { const hv = this.harvester; hv.position.x = hv.userData.x0 + Math.sin(T * 0.15) * 9; hv.position.y = this.h(hv.position.x, hv.position.z) - 0.1; hv.userData.rods.position.x = Math.sin(T * 30) * 0.03; }
    const m4 = new THREE.Matrix4();
    this.bubbles.userData.p.forEach((p, i) => { const y = 0.75 + ((p[1] + T * 0.25) % 1) * 0.25; m4.makeTranslation(p[0], y, p[2]); this.bubbles.setMatrixAt(i, m4); });
    this.bubbles.position.set(0, 0, 0); this.bubbles.instanceMatrix.needsUpdate = true;
    this.airBubbles.userData.p.forEach((p, i) => { const y = 0.1 + ((p + T * 0.35) % 1) * 0.35; m4.makeTranslation((p - 0.5) * 0.2, y, 0); this.airBubbles.setMatrixAt(i, m4); });
    this.airBubbles.instanceMatrix.needsUpdate = true;
    this.chanBeads.userData.p.forEach((p, i) => { let x = ((p[0] + 6 + T * 0.8) % 12) - 6; m4.makeTranslation(x, 0.47 + Math.sin(T * 3 + i) * 0.01, p[1]); this.chanBeads.setMatrixAt(i, m4); });
    this.chanBeads.instanceMatrix.needsUpdate = true;
    this.puffs.userData.p.forEach((p, i) => { const k = (p + T * 1.3) % 1; m4.makeTranslation(0.65 + k * 0.8, 0.9 - k * k * 0.9, 0.2 + (p - 0.5) * 0.4); this.puffs.setMatrixAt(i, m4); });
    this.puffs.instanceMatrix.needsUpdate = true;
    for (const sm2 of [this.smokeA, this.smokeB]) {
      const pa = sm2.geometry.attributes.position, { base, ph } = sm2.userData;
      ph.forEach((p, i) => { const k = (p + T * 0.12) % 1; pa.setXYZ(i, base.x + k * 2.5 + Math.sin(i + T) * 0.3, base.y + k * 7, base.z + Math.cos(i * 1.7) * k * 1.2); });
      pa.needsUpdate = true;
    }
    // people
    for (const p of this.people) {
      const u = p.userData, ph = u.ph + T;
      switch (u.type) {
        case 'picker': u.armR.rotation.x = -2.2 + Math.sin(ph * 2.2) * 0.5; u.armL.rotation.x = -1.6 + Math.sin(ph * 2.2 + 1.5) * 0.4; u.body.rotation.y = Math.sin(ph) * 0.1; break;
        case 'stripper': u.armR.rotation.x = -1.9 + Math.sin(ph * 3) * 0.7; u.armL.rotation.x = -1.9 + Math.sin(ph * 3) * 0.7; break;
        case 'sorter': u.armR.rotation.x = -0.9 + Math.sin(ph * 2.6) * 0.25; u.armL.rotation.x = -0.9 + Math.cos(ph * 2.1) * 0.25; u.armR.rotation.z = Math.sin(ph * 1.3) * 0.25; break;
        case 'raker': { const s = Math.sin(ph * 1.4); u.armR.rotation.x = -0.75 + s * 0.08; u.armL.rotation.x = -0.9 + s * 0.08; p.position.x = u.base.x + Math.cos(u.ry) * s * 0.25; p.position.z = u.base.z - Math.sin(u.ry) * s * 0.25; break; }
        case 'paddler': { const s = Math.sin(ph * 1.6); u.armR.rotation.x = -0.9 + s * 0.4; u.armL.rotation.x = -1.1 + s * 0.4; break; }
        case 'operator': u.armR.rotation.x = -0.4 + Math.max(0, Math.sin(ph * 0.7)) * 0.8; break;
        case 'carrier': if (u.path) {
          const [[x0, z0], [x1, z1]] = u.path; const k = (Math.sin(ph * 0.25) + 1) / 2;
          const x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k; p.position.set(x, this.h(x, z), z);
          p.rotation.y = Math.atan2(x1 - x0, z1 - z0) + (Math.cos(ph * 0.25) < 0 ? Math.PI : 0);
          u.legL.rotation.x = Math.sin(ph * 6) * 0.4; u.legR.rotation.x = -Math.sin(ph * 6) * 0.4;
        } break;
        default: u.armR.rotation.x = Math.sin(ph * 0.5) * 0.1;
      }
    }
    // drying time-lapse
    if (this.curStep && this.curStep.chart === 'dry' && this.dryFrom !== this.dryTo) {
      this.dryT = Math.min(1, this.dryT + dt / 9);
      const key = this.dryT < 0.45 ? this.dryFrom : this.dryT < 0.8 && this.dryFrom === 'cherry' ? 'cherryMid' : this.dryTo;
      if (key !== this.layerKey) { this.layerKey = key; for (const m of [this.bedMat, this.patioMat, this.mqMat]) this.setLayer(m, key); }
    }
    // ring pulse
    this.ring.material.opacity = 0.45 + 0.35 * Math.sin(T * 3);
    this.ring.scale.setScalar(1 + 0.04 * Math.sin(T * 3));
    // flow beads
    if (this.curve) {
      const n = this.beadCount, col = new THREE.Color();
      const sts = this.routeStates; const segN = Math.max(1, this.uniqStations());
      for (let i = 0; i < n; i++) {
        const u = ((i / n) + T * 0.012) % 1;
        const p = this.curve.getPointAt(u);
        m4.makeTranslation(p.x, p.y + Math.sin(T * 3 + i) * 0.05, p.z);
        this.beads.setMatrixAt(i, m4);
        const si = Math.min(sts.length - 1, Math.floor(u * sts.length));
        col.set(BEANPAL[sts[si]] ? BEANPAL[sts[si]][1][0] : '#c8202a');
        this.beads.setColorAt(i, col);
      }
      this.beads.instanceMatrix.needsUpdate = true; if (this.beads.instanceColor) this.beads.instanceColor.needsUpdate = true;
    }
  }
  uniqStations() { return new Set(this.route.map((s) => s.st)).size; }

  projectLabels(ids) {
    const out = [];
    for (const id of ids) {
      const a = this.anchor(id); a.y = Math.max(a.y, 0) + (id === 'mill' || id === 'bodega' ? 6.5 : id === 'port' ? 8 : id === 'field' ? 4 : 3.6);
      const d = this.camera.position.distanceTo(a);
      const s = a.project(this.camera);
      out.push({ id, x: (s.x + 1) / 2 * this.w, y: (1 - s.y) / 2 * this.h2, vis: s.z < 1 && Math.abs(s.x) < 1.02 && Math.abs(s.y) < 1.02, d });
    }
    return out;
  }

  render(renderer) { renderer.render(this.scene, this.camera); }
}
