// Varieties: two procedural plants side by side, a 1.70 m person and a levelling staff for scale.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { plantData, buildPlants, disposePlants } from './plant.js';
import { makeSky, applySky, envFromSky } from './env.js';

const specOf = (v, seed) => ({ h: v.h, dwarf: v.stature === 'dwarf', tip: v.tip, cherry: v.cherry, cherry2: v.cherry2, leaf: v.leaf, leafW: v.id === 'stenophylla' ? 0.55 : v.id === 'geisha' ? 0.82 : 1, bean: v.bean || 'm', sp: v.sp ? v.id : null, seed });

export class VarietyView {
  constructor(renderer, opts = {}) {
    this.renderer = renderer; this.opts = opts;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 900);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 2.2, maxDistance: 18, maxPolarAngle: 1.5, enablePan: false, enabled: false });
    this.controls.target.set(0.45, 1.25, 0);
    this.controls.addEventListener('start', () => { this.userMoved = true; });
    this.t = 0;
    this.sky = makeSky(600); this.scene.add(this.sky);
    this.sun = new THREE.DirectionalLight('#fff3df', 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(opts.mobile ? 1024 : 2048, opts.mobile ? 1024 : 2048);
    Object.assign(this.sun.shadow.camera, { left: -4, right: 4, top: 4.5, bottom: -1, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.hemi = new THREE.HemisphereLight('#dfeaff', '#5a4a32', 0.5);
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.buildGround();
    this.buildStaff();
    this.person = this.buildPerson(); this.person.position.set(2.75, 0, 0.35); this.person.rotation.y = -0.5; this.scene.add(this.person);
    this.buildBackRows();
    this.plants = null;
    this.ids = [null, null];
  }

  buildGround() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#6d5136'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? `rgba(60,42,26,${Math.random() * 0.5})` : v < 0.8 ? `rgba(140,110,78,${Math.random() * 0.35})` : `rgba(96,104,48,${Math.random() * 0.5})`; g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3); }
    // leaf litter
    for (let i = 0; i < 160; i++) { g.save(); g.translate(Math.random() * 512, Math.random() * 512); g.rotate(Math.random() * 6.3); g.fillStyle = ['#7a5a2e', '#5d4a22', '#8d6b38'][i % 3]; g.beginPath(); g.ellipse(0, 0, 9, 3.5, 0, 0, 7); g.fill(); g.restore(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 10); tex.anisotropy = 8;
    const grass = document.createElement('canvas'); grass.width = grass.height = 256;
    const gg = grass.getContext('2d'); gg.fillStyle = '#5f7a34'; gg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { gg.fillStyle = `hsla(${70 + Math.random() * 30},${35 + Math.random() * 25}%,${22 + Math.random() * 22}%,0.7)`; gg.fillRect(Math.random() * 256, Math.random() * 256, 1, 2 + Math.random() * 4); }
    const gtex = new THREE.CanvasTexture(grass); gtex.colorSpace = THREE.SRGBColorSpace; gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(240, 240); gtex.anisotropy = 8;
    const outer = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ map: gtex, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01; outer.receiveShadow = true; this.scene.add(outer);
    // weeded soil strip under the plants (row), soft edges via alpha gradient
    const a = document.createElement('canvas'); a.width = 256; a.height = 64; const ag = a.getContext('2d');
    const grd = ag.createLinearGradient(0, 0, 0, 64); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.25, '#fff'); grd.addColorStop(0.75, '#fff'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ag.fillStyle = grd; ag.fillRect(0, 0, 256, 64);
    const g2 = ag.createLinearGradient(0, 0, 256, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.08, 'rgba(0,0,0,0)'); g2.addColorStop(0.92, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    ag.globalCompositeOperation = 'destination-out'; ag.fillStyle = g2; ag.fillRect(0, 0, 256, 64);
    const am = new THREE.CanvasTexture(a);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.2), new THREE.MeshStandardMaterial({ map: tex, alphaMap: am, transparent: true, roughness: 1, depthWrite: false }));
    tex.repeat.set(20, 1.6);
    strip.rotation.x = -Math.PI / 2; strip.position.y = 0.002; strip.receiveShadow = true; this.scene.add(strip);
  }

  buildStaff() {
    const c = document.createElement('canvas'); c.width = 32; c.height = 512;
    const g = c.getContext('2d');
    for (let i = 0; i < 30; i++) { g.fillStyle = i % 2 ? '#f3efe6' : '#c9241f'; g.fillRect(0, 512 - (i + 1) * 512 / 30, 32, 512 / 30); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const staff = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3, 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    staff.position.set(0.1, 1.5, -1.1); staff.castShadow = true; this.scene.add(staff);
    this.staff = staff;
  }

  buildPerson() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: '#8a5a3c', roughness: 0.65 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#4f6f8f', roughness: 0.9 });
    const pants = new THREE.MeshStandardMaterial({ color: '#3a3430', roughness: 0.95 });
    const boot = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.7 });
    const straw = new THREE.MeshStandardMaterial({ color: '#d8bf7e', roughness: 0.9 });
    const cap = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m);
    for (const s of [-1, 1]) {
      const leg = cap(0.068, 0.72, pants); leg.position.set(s * 0.095, 0.48, 0); g.add(leg);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.26), boot); b.position.set(s * 0.095, 0.04, 0.04); g.add(b);
      const arm = cap(0.05, 0.52, shirt); arm.position.set(s * 0.25, 1.17, 0); arm.rotation.z = s * 0.09; g.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 8), skin); hand.position.set(s * 0.275, 0.86, 0.01); g.add(hand);
    }
    const torso = cap(0.17, 0.4, shirt); torso.scale.set(1, 1, 0.68); torso.position.y = 1.2; g.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skin); neck.position.y = 1.5; g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 14), skin); head.scale.set(0.9, 1.08, 0.98); head.position.y = 1.6; g.add(head);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), straw); brim.position.y = 1.665; g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.07, 18), straw); crown.position.y = 1.705; g.add(crown);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  buildBackRows() {
    // background rows: generic compact Arabica, low density
    const items = [];
    const base = plantData({ h: 2.0, dwarf: true, tip: 'green', cherry: '#b5212c', leaf: 1, bean: 'm', seed: 99 }, { density: 0.55, cherries: 0.4 });
    const base2 = plantData({ h: 2.1, dwarf: true, tip: 'green', cherry: '#b5212c', leaf: 1, bean: 'm', seed: 123 }, { density: 0.55, cherries: 0.4 });
    for (let r = 0; r < 3; r++) for (let i = -7; i <= 8; i++) {
      const z = -3.2 - r * 2.6, x = i * 1.35 + (r % 2) * 0.6 + Math.sin(i * 3.1 + r) * 0.15;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7 + r), new THREE.Vector3(1, 0.92 + ((i + r) % 3) * 0.05, 1));
      items.push({ data: (i + r) % 2 ? base : base2, matrix: m });
    }
    this.back = buildPlants(items, { lowPoly: true, shadows: !this.opts.mobile });
    this.scene.add(this.back);
  }

  setVarieties(a, b) {
    if (this.ids[0] === a.id && this.ids[1] === (b && b.id)) return;
    this.ids = [a.id, b && b.id];
    if (this.plants) { this.scene.remove(this.plants); disposePlants(this.plants); }
    const items = [{ data: plantData(specOf(a, 11)), matrix: new THREE.Matrix4().makeTranslation(-0.95, 0, 0) }];
    if (b) items.push({ data: plantData(specOf(b, 29)), matrix: new THREE.Matrix4().compose(new THREE.Vector3(1.15, 0, 0.05), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7), new THREE.Vector3(1, 1, 1)) });
    this.plants = buildPlants(items, { shadows: true });
    this.scene.add(this.plants);
    this.heights = [a.h, b ? b.h : 0];
  }

  setTheme(theme) {
    const { sun, p } = applySky(this.sky, theme);
    this.sun.position.copy(sun).multiplyScalar(20); this.sun.target.position.set(0, 0, 0);
    this.sun.color.set(p.sun); this.sun.intensity = p.sunI * (theme === 'dark' ? 0.9 : 1);
    this.hemi.intensity = p.hemi;
    this.env = envFromSky(this.renderer, this.sky, this.env);
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = theme === 'dark' ? 0.55 : 0.8;
    this.scene.fog = new THREE.Fog(p.fog, 30, 160);
    this.theme = theme;
  }

  frame() {
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const needH = 3.3, needW = 4.9;
    const dist = Math.max(needH / 2 / Math.tan(fov / 2), needW / 2 / (Math.tan(fov / 2) * this.camera.aspect)) + 1.4;
    this.controls.target.set(0.85, 1.4, 0);
    this.camera.position.set(0.85 + dist * 0.16, 1.5 + dist * 0.05, dist);
    this.controls.update();
  }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.w = w; this.h = h; if (!this.userMoved) this.frame(); }
  setActive(a) { this.active = a; this.controls.enabled = a; if (a && !this.userMoved) this.frame(); }
  reset() { this.userMoved = false; this.frame(); }
  update(dt) {
    this.t += dt;
    if (this.plants) this.plants.rotation.z = Math.sin(this.t * 0.7) * 0.004;
    if (this.active) this.controls.update();
  }
  projectLabels() {
    const out = [];
    const pts = [['A', new THREE.Vector3(-0.95, (this.heights?.[0] || 2) + 0.18, 0)], ['B', new THREE.Vector3(1.15, (this.heights?.[1] || 2) + 0.18, 0.05)], ['H', new THREE.Vector3(2.75, 1.86, 0.35)], ['S', new THREE.Vector3(0.1, 3.08, -1.1)]];
    for (const [id, p] of pts) {
      if (id === 'B' && !this.heights?.[1]) continue;
      const s = p.clone().project(this.camera);
      out.push({ id, x: (s.x + 1) / 2 * this.w, y: (1 - s.y) / 2 * this.h, vis: s.z < 1 && Math.abs(s.x) < 1.02 && Math.abs(s.y) < 1.02 });
    }
    return out;
  }
  render(renderer) { renderer.render(this.scene, this.camera); }
}
