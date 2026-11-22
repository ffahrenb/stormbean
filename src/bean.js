import * as THREE from 'three';

// Procedural coffee cherry / bean model with states and roast colour.
const ROAST_STOPS = [[20, '#8ea486'], [120, '#a7ad84'], [150, '#d6c47c'], [170, '#c49a58'], [190, '#9a6a3e'], [205, '#6e4528'], [215, '#573420'], [225, '#3b2214'], [240, '#22130b']];
export function roastColor(T) {
  const c = new THREE.Color();
  for (let i = 1; i < ROAST_STOPS.length; i++) {
    const [t1, c1] = ROAST_STOPS[i - 1], [t2, c2] = ROAST_STOPS[i];
    if (T <= t2) { return c.set(c1).lerp(new THREE.Color(c2), Math.max(0, (T - t1) / (t2 - t1))); }
  }
  return c.set(ROAST_STOPS[ROAST_STOPS.length - 1][1]);
}

function noiseTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  let s = 3;
  for (let i = 0; i < img.data.length; i += 4) { s = s * 16807 % 2147483647; const v = 205 + (s % 50); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.25;
  for (let i = 0; i < 300; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#9a9a9a'; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 6 + Math.random() * 14, Math.random() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function beanGeometry(seg = 64) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const p = g.attributes.position;
  const col = [];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    x *= 0.36; y *= 0.62; z *= 0.46;
    if (x < 0) x *= 0.2;
    // centre cut on the flat face (gently S-shaped)
    const zc = 0.05 * Math.sin(y * 5.5);
    const groove = Math.exp(-Math.pow((z - zc) / 0.06, 2)) * Math.max(0, 1 - Math.pow(y / 0.66, 2));
    if (x <= 0.001) x += 0.11 * groove;
    x += 0.075;
    p.setXYZ(i, x, y, z);
    const shade = x < 0.2 ? 1 - 0.55 * groove : 1;
    col.push(shade, shade, shade);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function shrivel(geo, amt) {
  const p = geo.attributes.position; const base = geo.userData.base || (geo.userData.base = Float32Array.from(p.array));
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
    const n = Math.sin(x * 13 + y * 7) * Math.cos(z * 11 - y * 5) + 0.5 * Math.sin(y * 23 + z * 17);
    const k = 1 - amt * (0.12 + 0.07 * n);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  p.needsUpdate = true; geo.computeVertexNormals();
}

export class BeanModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0.9, 0.5, 4.2);
    this.camera.lookAt(0, 0, 0);
    this.root = new THREE.Group(); this.scene.add(this.root);
    const hemi = new THREE.HemisphereLight('#ffffff', '#5a4a3a', 1.4);
    const key = new THREE.DirectionalLight('#fff3e0', 2.6); key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight('#c8dcff', 1.4); rim.position.set(-4, 2, -3);
    this.scene.add(hemi, key, rim);
    this.noise = noiseTex();
    this.build();
    this.state = 'cherry';
    this.roastT = 20;
    this.setState('cherry');
  }

  build() {
    const E = 1.12; // vertical elongation of cherry
    const half = (r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48, Math.PI, Math.PI), mat); m.scale.y = E; return m; };
    const cap = (ri, ro, mat, z) => { const m = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 72, 1), mat); m.scale.y = E; m.position.z = z; return m; };
    this.mSkin = new THREE.MeshPhysicalMaterial({ color: '#b5121f', roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
    this.mPulp = new THREE.MeshStandardMaterial({ color: '#e9a05c', roughness: 0.55, side: THREE.DoubleSide });
    this.mPulpCut = new THREE.MeshStandardMaterial({ color: '#f0b46e', roughness: 0.4 });
    this.mMuc = new THREE.MeshPhysicalMaterial({ color: '#f2df9a', roughness: 0.08, transmission: 0.35, transparent: true, opacity: 0.75, side: THREE.DoubleSide, thickness: 0.1 });
    this.mSkinCut = new THREE.MeshStandardMaterial({ color: '#8f0f18', roughness: 0.4 });
    this.cherry = new THREE.Group();
    this.cherry.add(half(1.0, this.mSkin), cap(0.955, 1.0, this.mSkinCut, 0.002));
    this.cherry.add(half(0.955, this.mPulp), cap(0.8, 0.955, this.mPulpCut, 0.004));
    this.cherry.add(half(0.8, this.mMuc), cap(0.72, 0.8, this.mMuc, 0.006));
    // stem & calyx
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.35, 8), new THREE.MeshStandardMaterial({ color: '#4a5a2a' })); stem.position.y = 1.25;
    const calyx = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 12), new THREE.MeshStandardMaterial({ color: '#3a2a1a' })); calyx.rotation.x = Math.PI / 2; calyx.position.y = -1.11;
    this.cherry.add(stem, calyx);
    this.root.add(this.cherry);

    // whole dried cherry (shrivelled)
    this.dryGeo = new THREE.SphereGeometry(1, 72, 54); this.dryGeo.scale(1, E, 1);
    this.mDry = new THREE.MeshStandardMaterial({ color: '#3a1712', roughness: 0.75, bumpMap: this.noise, bumpScale: 0.6 });
    this.dry = new THREE.Mesh(this.dryGeo, this.mDry);
    this.root.add(this.dry);

    // bean pair, parchment, mucilage coat, silverskin
    const bg = beanGeometry();
    this.mBean = new THREE.MeshStandardMaterial({ color: '#8ea486', roughness: 0.6, map: this.noise, bumpMap: this.noise, bumpScale: 0.25, vertexColors: true });
    this.mParch = new THREE.MeshStandardMaterial({ color: '#e7d6b4', roughness: 0.85, map: this.noise, bumpMap: this.noise, bumpScale: 0.4 });
    this.mCoat = new THREE.MeshPhysicalMaterial({ color: '#f2df9a', roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1 });
    this.mSilver = new THREE.MeshStandardMaterial({ color: '#e4e6dc', roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.35 });
    this.pair = new THREE.Group();
    const mk = (geo, mat, s, mirror) => { const m = new THREE.Mesh(geo, mat); m.scale.set(mirror ? -s : s, s, s); return m; };
    this.beans = [mk(bg, this.mBean, 1, false), mk(bg, this.mBean, 1, true)];
    this.silver = [mk(bg, this.mSilver, 1.02, false), mk(bg, this.mSilver, 1.02, true)];
    this.parch = [mk(bg, this.mParch, 1.08, false), mk(bg, this.mParch, 1.08, true)];
    this.coat = [mk(bg, this.mCoat, 1.16, false), mk(bg, this.mCoat, 1.16, true)];
    for (const arr of [this.beans, this.silver, this.parch, this.coat]) this.pair.add(...arr);
    this.root.add(this.pair);
    this.anchors = {
      exo: new THREE.Vector3(-0.62, 0.85, 0.003), meso: new THREE.Vector3(-0.8, -0.4, 0.005), muc: new THREE.Vector3(0.62, -0.48, 0.007),
      endo: new THREE.Vector3(0.3, 0.38, 0.38), silver: new THREE.Vector3(-0.36, 0.3, 0.3), bean: new THREE.Vector3(-0.24, -0.18, 0.4),
    };
  }

  setState(st) {
    this.state = st;
    const show = (o, v) => { (Array.isArray(o) ? o : [o]).forEach((m) => { m.visible = v; }); };
    const inCherry = st === 'cherry' || st === 'cherryAn';
    show(this.cherry, inCherry); show(this.dry, st === 'cherryDry');
    show(this.pair, !(st === 'cherryDry'));
    show(this.coat, inCherry || st === 'mucilage' || st === 'honey');
    show(this.parch, inCherry || ['mucilage', 'parchWet', 'parch', 'honey'].includes(st));
    show(this.silver, st === 'green' || st === 'greenWet');
    if (inCherry) { this.parch[1].visible = false; this.coat[1].visible = false; this.silver[1].visible = true; }
    this.pair.rotation.set(0, 0, 0);
    this.pair.position.set(0, 0, inCherry ? -0.06 : 0);
    this.beans.forEach((b, i) => { b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); });
    this.mSkin.color.set(st === 'cherryAn' ? '#6a0f2a' : '#b5121f');
    this.mCoat.color.set(st === 'honey' ? '#b8701f' : '#f2df9a');
    this.mCoat.opacity = st === 'honey' ? 0.85 : 0.55; this.mCoat.roughness = st === 'honey' ? 0.6 : 0.05;
    this.mParch.color.set(st === 'parchWet' || st === 'mucilage' ? '#d8c8a2' : '#e7d6b4');
    this.mParch.roughness = st === 'parchWet' ? 0.35 : 0.85;
    let s = 1;
    if (st === 'green' || st === 'greenWet' || st === 'roast') {
      // open the pair to show the flat side of one bean
      this.beans[0].position.set(-0.45, 0, 0.25); this.beans[0].rotation.set(0, Math.PI / 2 - 0.35, 0.12);
      this.beans[1].position.set(0.45, 0, 0.25); this.beans[1].rotation.set(0, Math.PI / 2 + 0.3, -0.12);
      this.silver.forEach((m, i) => { m.position.copy(this.beans[i].position); m.rotation.copy(this.beans[i].rotation); });
      s = 1.05;
    }
    if (st === 'cherryDry') shrivel(this.dryGeo, 1);
    this.pair.scale.setScalar(s);
    if (st === 'greenWet') this.mBean.color.set('#4f6e58');
    else if (st === 'roast') this.setRoast(this.roastT > 150 ? this.roastT : 212, true);
    else this.mBean.color.set('#8ea486');
    this.mBean.roughness = st === 'greenWet' ? 0.3 : 0.6;
  }

  setRoast(T, keepState) {
    this.roastT = T;
    if (!keepState && this.state !== 'roast' && this.state !== 'green') this.setState('green');
    this.mBean.color.copy(roastColor(T));
    this.mBean.roughness = T > 225 ? 0.28 : 0.6;
    const grow = 1 + 0.17 * THREE.MathUtils.smoothstep(T, 185, 212);
    const base = 1.05;
    this.pair.scale.setScalar(base * grow);
    this.silver.forEach((m) => { m.visible = T < 170; });
  }

  anchorScreen(key, w, h) {
    const v = this.anchors[key].clone().applyMatrix4(this.root.matrixWorld).project(this.camera);
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
  }

  update(dt, spin = true) {
    this.tt = (this.tt || 0) + dt;
    if (!spin) return;
    if (['cherry', 'cherryAn', 'green', 'greenWet', 'roast'].includes(this.state)) this.root.rotation.y = Math.sin(this.tt * 0.6) * 0.55;
    else this.root.rotation.y += dt * 0.35;
  }

  renderTo(renderer, x, y, w, h, clear) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
    if (clear) { renderer.setClearColor(new THREE.Color(clear), 1); renderer.clear(true, true, false); renderer.setClearColor(0x000000, 0); }
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
  }
}
