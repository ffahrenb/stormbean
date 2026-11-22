// Climate: a model mountain coloured by Arabica temperature bands; warming shifts the bands upslope.
// 1 unit = 100 m horizontally; vertical exaggeration VX.
export const VX = 1.6;
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeSky, applySky, envFromSky } from './env.js';
import { CLIM_MODEL } from './climate.js';

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

export function elevation(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const n = fbm(x * 0.035 + 3.1, z * 0.035 - 1.7);
  const massif = 3150 * Math.exp(-Math.pow(r / 40, 1.9)) * (1 + 0.14 * Math.sin(5 * th + n * 2.2));
  const rid = 420 * fbm(x * 0.06, z * 0.06, 4) * Math.exp(-Math.pow(r / 60, 2));
  const floor = 160 + 110 * fbm(x * 0.02 - 5, z * 0.02 + 2, 3);
  const e = Math.max(floor, massif + rid + 40);
  const f = Math.min(1, Math.max(0, (r - 88) / 20));
  return e + (150 - e) * f * f * (3 - 2 * f);
}

export class ClimateView {
  constructor(renderer, opts = {}) {
    this.renderer = renderer; this.opts = opts;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 1, 3000);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 45, maxDistance: 340, maxPolarAngle: 1.42, enablePan: false, enabled: false, autoRotate: true, autoRotateSpeed: 0.25 });
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; this.userMoved = true; });
    this.controls.target.set(0, 9, 0);
    this.dT = 0; this.dTtarget = 0;
    this.sky = makeSky(1800); this.scene.add(this.sky);
    this.sun = new THREE.DirectionalLight('#fff3df', 2.6); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(opts.mobile ? 1024 : 2048, opts.mobile ? 1024 : 2048);
    Object.assign(this.sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 500 });
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.4;
    this.hemi = new THREE.HemisphereLight('#dfeaff', '#5a4a32', 0.5);
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.buildTerrain();
    this.buildPlots();
    this.setDT(0, true);
  }

  buildTerrain() {
    const S = 220, N = this.opts.mobile ? 170 : 260;
    const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const low = new THREE.Color('#8f9f4e'), forest = new THREE.Color('#3b6630'), high = new THREE.Color('#8a8558'), rock = new THREE.Color('#7b7266');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, elevation(x, z) / 100 * VX); }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    this.cells = []; // elevation samples for hypsometry (area per cell = (S/N*100 m)^2)
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) * 100 / VX, slope = 1 - nrm.getY(i);
      const n = fbm(p.getX(i) * 0.2, p.getZ(i) * 0.2, 3);
      c.copy(low).lerp(forest, THREE.MathUtils.smoothstep(y, 500, 1300)).lerp(high, THREE.MathUtils.smoothstep(y, 2500, 3100)).lerp(rock, THREE.MathUtils.clamp(slope * 2.2 - 0.25, 0, 0.8));
      c.offsetHSL(0, 0, n * 0.04);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      if (Math.hypot(p.getX(i), p.getZ(i)) < 95) this.cells.push(y);
    }
    this.cellKm2 = Math.pow(S / N * 0.1, 2);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const B = CLIM_MODEL.bands;
    this.uni = { uDT: { value: 0 }, uT0: { value: CLIM_MODEL.T0 }, uLapse: { value: CLIM_MODEL.lapse }, uTint: { value: 0.26 } };
    const cols = B.map((b) => new THREE.Color(b.c));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uni);
      sh.vertexShader = 'varying float vElev;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvElev = position.y * 100.0 / ' + VX.toFixed(3) + ';');
      const v3 = (cl) => `vec3(${cl.r.toFixed(4)},${cl.g.toFixed(4)},${cl.b.toFixed(4)})`;
      sh.fragmentShader = 'varying float vElev; uniform float uDT; uniform float uT0; uniform float uLapse; uniform float uTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float Tm = uT0 - uLapse * vElev / 1000.0 + uDT;
        vec3 bc = Tm > 24.0 ? ${v3(cols[0])} : Tm > 21.0 ? ${v3(cols[1])} : Tm > 18.0 ? ${v3(cols[2])} : Tm > 15.0 ? ${v3(cols[3])} : ${v3(cols[4])};
        float isOpt = step(18.0, Tm) * step(Tm, 21.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, bc, uTint + isOpt * 0.36);
        float e = min(min(abs(Tm - 24.0), abs(Tm - 21.0)), min(abs(Tm - 18.0), abs(Tm - 15.0)));
        float w = max(fwidth(Tm), 1e-4);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), (1.0 - smoothstep(0.0, w * 1.6, e)) * 0.9);
        float cl = abs(fract(vElev / 500.0 + 0.5) - 0.5) * 500.0; float cw = max(fwidth(vElev), 1e-3);
        diffuseColor.rgb *= 1.0 - (1.0 - smoothstep(0.0, cw * 1.1, cl)) * 0.3;`);
    };
    mat.customProgramCacheKey = () => 'clim-terrain';
    this.terrain = new THREE.Mesh(geo, mat); this.terrain.receiveShadow = true; this.terrain.castShadow = true;
    this.scene.add(this.terrain);
    // surrounding lowland to the horizon (same shader, constant 150 m)
    const og = new THREE.PlaneGeometry(4000, 4000, 8, 8); og.rotateX(-Math.PI / 2); og.translate(0, 1.5 * VX - 0.02, 0);
    const oc = new Float32Array(og.attributes.position.count * 3); for (let i = 0; i < oc.length; i += 3) { oc[i] = low.r; oc[i + 1] = low.g; oc[i + 2] = low.b; }
    og.setAttribute('color', new THREE.BufferAttribute(oc, 3));
    const outer = new THREE.Mesh(og, mat); outer.receiveShadow = true; this.scene.add(outer);
    // altitude label anchors along one flank
    this.levels = [];
    const th = 0.8;
    for (const lv of [500, 1000, 1500, 2000, 2500, 3000]) {
      for (let r = 95; r > 0; r -= 0.25) {
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        if (elevation(x, z) >= lv) { this.levels.push({ id: 'L' + lv, lv, p: new THREE.Vector3(x, lv / 100 * VX + 0.4, z) }); break; }
      }
    }
  }

  buildPlots() {
    // coffee plots: textured rectangles that follow the slope
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#8a6a44'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 5) { g.fillStyle = '#3f7a2e'; g.beginPath(); g.arc(x + (y % 16 ? 2.5 : 0), y + 4, 3.6, 0, 7); g.fill(); g.fillStyle = '#5d9a3e'; g.beginPath(); g.arc(x + (y % 16 ? 2.5 : 0) - 1, y + 3, 1.6, 0, 7); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(1.9, 1.3); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const N = this.opts.mobile ? 800 : 1300;
    this.plots = new THREE.InstancedMesh(geo, mat, N); this.plots.receiveShadow = true;
    this.cand = [];
    let tries = 0;
    while (this.cand.length < N && tries++ < 60000) {
      const r = Math.sqrt(Math.random()) * 85, a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const e = elevation(x, z);
      const ex = elevation(x + 1, z), ez = elevation(x, z + 1);
      const n = new THREE.Vector3(-(ex - e) / 100 * VX, 1, -(ez - e) / 100 * VX).normalize();
      if (n.y < 0.62 || e < 250 || r > 86) continue;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + Math.PI / 2));
      this.cand.push({ e, p: new THREE.Vector3(x, e / 100 * VX + 0.08, z), q, h: Math.random() });
    }
    this.scene.add(this.plots);
  }

  temp(e, dT = this.dT) { return CLIM_MODEL.T0 - CLIM_MODEL.lapse * e / 1000 + dT; }
  altFor(T, dT = this.dT) { return (CLIM_MODEL.T0 + dT - T) / CLIM_MODEL.lapse * 1000; }
  areaKm2(lo, hi, dT) { let n = 0; for (const e of this.cells) { const T = this.temp(e, dT); if (T >= lo && T <= hi) n++; } return n * this.cellKm2; }

  setDT(v, instant = false) { this.dTtarget = v; if (instant) { this.dT = v; this.applyDT(); } }
  applyDT() {
    this.uni.uDT.value = this.dT;
    const m = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0), s = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (const c of this.cand) {
      const T = this.temp(c.e);
      const show = (T >= 18 && T <= 21) || (((T > 21 && T <= 24) || (T >= 15.5 && T < 18)) && c.h < 0.22);
      this.plots.setMatrixAt(k++, show ? m.compose(c.p, c.q, s) : zero);
    }
    this.plots.instanceMatrix.needsUpdate = true;
  }

  setTheme(theme) {
    const { sun, p } = applySky(this.sky, theme);
    this.sun.position.copy(sun).multiplyScalar(260); this.sun.target.position.set(0, 0, 0);
    this.sun.color.set(p.sun); this.sun.intensity = p.sunI;
    this.hemi.intensity = p.hemi + 0.1;
    this.env = envFromSky(this.renderer, this.sky, this.env);
    this.scene.environment = this.env.texture; this.scene.environmentIntensity = theme === 'dark' ? 0.5 : 0.75;
    this.scene.fog = new THREE.Fog(p.fog, 240, 900);
    if (theme === 'dark') { this.sun.position.set(-180, 70, 160); }
  }
  frame() {
    const d = this.camera.aspect < 0.9 ? 300 : this.camera.aspect < 1.3 ? 235 : 205;
    this.camera.position.set(d * 0.55, d * 0.36, d * 0.72); this.controls.target.set(0, 12, 0); this.controls.update();
  }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.w = w; this.h = h; if (!this.userMoved) this.frame(); }
  setActive(a) { this.active = a; this.controls.enabled = a; if (a && !this.userMoved) this.frame(); }
  reset() { this.userMoved = false; this.controls.autoRotate = true; this.frame(); }
  update(dt) {
    if (Math.abs(this.dTtarget - this.dT) > 0.001) { this.dT += (this.dTtarget - this.dT) * Math.min(1, dt * 5); if (Math.abs(this.dTtarget - this.dT) < 0.01) this.dT = this.dTtarget; this.applyDT(); }
    if (this.active) this.controls.update();
  }
  projectLabels() {
    const out = new THREE.Vector3(), toCam = new THREE.Vector3();
    return this.levels.map((l) => {
      const s = l.p.clone().project(this.camera);
      out.set(l.p.x, 0, l.p.z).normalize(); toCam.copy(this.camera.position).sub(l.p).setY(0).normalize();
      const facing = out.dot(toCam) > 0.15;
      return { id: l.id, lv: l.lv, x: (s.x + 1) / 2 * this.w, y: (1 - s.y) / 2 * this.h, vis: facing && s.z < 1 && Math.abs(s.x) < 1 && Math.abs(s.y) < 1, d: this.camera.position.distanceTo(l.p) };
    });
  }
  render(renderer) { renderer.render(this.scene, this.camera); }
}
