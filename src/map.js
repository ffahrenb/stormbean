import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CLIM_COUNTRY, CLIM_CATS, CLIM_GAIN_ONLY } from './climate.js';

const R = 1;
const PI = Math.PI;
const D2R = PI / 180;
const wrapPi = (a) => { a = (a + PI) % (2 * PI); if (a < 0) a += 2 * PI; return a - PI; };
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

// CPU version of the unroll morph (must match GLSL below)
function morphPos(u, lat, t, out) {
  const k = Math.max(1 - t, 0.02);
  const Rk = R / k;
  const ax = u * k, ay = lat * k;
  const cx = Math.cos(ay);
  out.set(Rk * cx * Math.sin(ax), Rk * Math.sin(ay), R - Rk + Rk * cx * Math.cos(ax));
  const f = THREE.MathUtils.smoothstep(t, 0.98, 1.0);
  if (f > 0) { out.x += (R * u - out.x) * f; out.y += (R * lat - out.y) * f; out.z += (R - out.z) * f; }
  return out;
}
function morphNormal(u, lat, t, out) {
  const k = Math.max(1 - t, 0.02);
  const ax = u * k, ay = lat * k, cx = Math.cos(ay);
  out.set(cx * Math.sin(ax), Math.sin(ay), cx * Math.cos(ax));
  const f = THREE.MathUtils.smoothstep(t, 0.98, 1.0);
  if (f > 0) out.lerp(new THREE.Vector3(0, 0, 1), f).normalize();
  return out;
}

const GLSL_MORPH = `
uniform float uMorph; uniform float uLon0;
const float PI = 3.141592653589793;
vec3 mpos(vec2 a, float t){
  float k = max(1.0 - t, 0.02);
  float Rk = 1.0 / k;
  vec2 b = a * k;
  float c = cos(b.y);
  vec3 p = vec3(Rk * c * sin(b.x), Rk * sin(b.y), 1.0 - Rk + Rk * c * cos(b.x));
  float f = smoothstep(0.98, 1.0, t);
  return mix(p, vec3(a.x, a.y, 1.0), f);
}
vec3 mnorm(vec2 a, float t){
  float k = max(1.0 - t, 0.02);
  vec2 b = a * k; float c = cos(b.y);
  vec3 n = vec3(c * sin(b.x), sin(b.y), c * cos(b.x));
  float f = smoothstep(0.98, 1.0, t);
  return normalize(mix(n, vec3(0.0, 0.0, 1.0), f));
}
float wrapPi(float a){ return mod(a + PI, 2.0 * PI) - PI; }
`;

export class MapView {
  constructor(renderer, world, countries, opts = {}) {
    this.renderer = renderer;
    this.countries = countries; // [{id,k,ll,p26,ara,rob,...}]
    this.opts = opts;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.lon0 = 0;
    this.morph = 0;
    this.mode = 'globe';
    this.selected = null;
    this.hover = null;
    this.anim = null;
    this.onSelect = null;
    this.onHover = null;
    this.labels = [];
    this.theme = 'light';
    this.style = 'sat';
    this.layer = 'prod';

    this.decode(world);
    this.buildSurface();
    this.buildLines();
    this.buildAtmo();
    this.buildBars();

    this.loadEarth();
    this.amb = new THREE.AmbientLight(0xffffff, 1.2);
    this.dir = new THREE.DirectionalLight(0xffffff, 1.6);
    this.scene.add(this.amb, this.dir);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enabled = false;
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; this.userMoved = true; });
    this.setGlobeControls();
    this.camera.position.copy(this.sph(-28 * D2R, 6 * D2R, 3.7));
    this.controls.update();
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;
  }

  sph(lon, lat, r = R) { const c = Math.cos(lat); return new THREE.Vector3(r * c * Math.sin(lon), r * Math.sin(lat), r * c * Math.cos(lon)); }

  decode(world) {
    const q = world.q;
    this.world = world.c.map((c) => ({
      id: c.id, n: c.n,
      rings: c.r.map((e) => { const a = new Float32Array(e.length); let x = 0, y = 0; for (let i = 0; i < e.length; i += 2) { x += e[i]; y += e[i + 1]; a[i] = x / q; a[i + 1] = y / q; } return a; }),
    }));
    this.byId = new Map(this.world.map((c) => [c.id, c]));
    this.idx = new Map(this.countries.map((c, i) => [c.id, i + 1]));
  }

  // ---------- texture ----------
  drawTextures() {
    const max = this.renderer.capabilities.maxTextureSize;
    const big = max >= 16384 && !this.opts.mobile;
    const W = big ? 8192 : 4096, H = W / 2;
    const cv = this.texCanvas || (this.texCanvas = document.createElement('canvas'));
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const P = this.pal;
    g.fillStyle = P.ocean; g.fillRect(0, 0, W, H);
    // graticule
    g.strokeStyle = P.grat; g.lineWidth = W / 4096;
    for (let lon = -180; lon <= 180; lon += 15) { const x = (lon + 180) / 360 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { const y = (90 - lat) / 180 * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // coffee belt band
    const y1 = (90 - 23.44) / 180 * H, y2 = (90 + 23.44) / 180 * H;
    g.fillStyle = P.belt; g.fillRect(0, y1, W, y2 - y1);
    const path = (c, ctx, w, h) => {
      ctx.beginPath();
      for (const r of c.rings) {
        let prev = null, off = 0;
        const xs = [];
        for (let i = 0; i < r.length; i += 2) {
          let lon = r[i] + off;
          if (prev !== null) { if (lon - prev > 180) { off -= 360; lon -= 360; } else if (lon - prev < -180) { off += 360; lon += 360; } }
          prev = lon; xs.push(lon, r[i + 1]);
        }
        for (const shift of [0, -360, 360]) {
          let minX = Infinity, maxX = -Infinity;
          for (let i = 0; i < xs.length; i += 2) { const v = xs[i] + shift; if (v < minX) minX = v; if (v > maxX) maxX = v; }
          if (maxX < -180 || minX > 180) continue;
          for (let i = 0; i < xs.length; i += 2) {
            const x = (xs[i] + shift + 180) / 360 * w, y = (90 - xs[i + 1]) / 180 * h;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }
      }
    };
    this.pathFn = path;
    for (const c of this.world) { path(c, g, W, H); g.fillStyle = P.land; g.fill('evenodd'); }
    // borders
    g.strokeStyle = P.border; g.lineWidth = W / 4096 * 0.9;
    for (const c of this.world) { path(c, g, W, H); g.stroke(); }

    this.drawOverlay();
    if (!this.tex) {
      this.tex = new THREE.CanvasTexture(cv);
      this.tex.colorSpace = THREE.SRGBColorSpace;
      this.tex.wrapS = THREE.RepeatWrapping;
      this.tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.surf.material.uniforms.uMap.value = this.tex;
    } else this.tex.needsUpdate = true;

    if (!this.idTex) {
      const ic = document.createElement('canvas'); ic.width = 2048; ic.height = 1024;
      const ig = ic.getContext('2d');
      ig.fillStyle = '#000'; ig.fillRect(0, 0, 2048, 1024);
      for (const cc of this.countries) {
        const c = this.byId.get(cc.id); if (!c) continue;
        const i = this.idx.get(cc.id);
        path(c, ig, 2048, 1024); ig.fillStyle = `rgb(${i},0,0)`; ig.fill('evenodd');
      }
      this.idTex = new THREE.CanvasTexture(ic);
      this.idTex.magFilter = THREE.NearestFilter; this.idTex.minFilter = THREE.NearestFilter;
      this.idTex.generateMipmaps = false; this.idTex.wrapS = THREE.RepeatWrapping;
      this.surf.material.uniforms.uId.value = this.idTex;
    }
  }

  // data layer as an RGBA overlay (works on top of satellite and thematic base)
  drawOverlay() {
    const W = 4096, H = 2048;
    const cv = this.ovCanvas || (this.ovCanvas = Object.assign(document.createElement('canvas'), { width: W, height: H }));
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    const P = this.pal, path = this.pathFn;
    const hatch = (c, color, step = 6, lw = 1.6) => {
      g.save(); path(c, g, W, H); g.clip('evenodd');
      g.strokeStyle = color; g.lineWidth = lw * W / 4096;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const r of c.rings) for (let i = 0; i < r.length; i += 2) { const x = (r[i] + 180) / 360 * W, y = (90 - r[i + 1]) / 180 * H; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      if (maxX - minX > W / 2) { minX = 0; maxX = W; }
      const st = step * W / 4096;
      for (let d = minX - (maxY - minY); d < maxX; d += st) { g.beginPath(); g.moveTo(d, maxY); g.lineTo(d + (maxY - minY), minY); g.stroke(); }
      g.restore();
    };
    if (this.layer === 'prod') {
      const maxP = Math.max(...this.countries.map((c) => c.p26 || 0));
      for (const cc of this.countries) {
        const c = this.byId.get(cc.id); if (!c) continue;
        path(c, g, W, H);
        if (cc.p26 && !cc.ref) { g.fillStyle = mixHex(P.low, P.high, 0.15 + 0.85 * Math.sqrt(cc.p26 / maxP)); g.fill('evenodd'); }
        else { g.fillStyle = P.ref; g.fill('evenodd'); hatch(c, P.refHatch); }
      }
    } else {
      for (const cc of this.countries) {
        const c = this.byId.get(cc.id); if (!c) continue;
        const cat = CLIM_COUNTRY[cc.id] ? CLIM_COUNTRY[cc.id].cat : 'na';
        path(c, g, W, H); g.fillStyle = CLIM_CATS[cat].c; g.fill('evenodd');
        if (cat === 'na') hatch(c, 'rgba(255,255,255,0.45)', 7, 1.2);
      }
      for (const id of Object.keys(CLIM_GAIN_ONLY)) { const c = this.byId.get(+id); if (c) hatch(c, CLIM_CATS.gain.c, 7, 2.4); }
    }
    if (!this.ovTex) {
      this.ovTex = new THREE.CanvasTexture(cv); this.ovTex.wrapS = THREE.RepeatWrapping; this.ovTex.colorSpace = THREE.SRGBColorSpace;
      this.ovTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.surf.material.uniforms.uOver.value = this.ovTex;
    } else this.ovTex.needsUpdate = true;
  }
  setLayer(layer) { if (layer === this.layer) return; this.layer = layer; this.drawOverlay(); }

  loadEarth() {
    const L = new THREE.TextureLoader();
    const u = this.surf.material.uniforms;
    const done = () => { if (u.uSatTex.value && u.uBump.value && u.uWater.value) { this.satReady = true; this.applyStyle(); } };
    const ld = (file, key, srgb) => L.load(file, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()); u[key].value = t; done(); }, undefined, () => { this.satFailed = true; this.style = 'thema'; this.applyStyle(); this.onStyleFail && this.onStyleFail(); });
    ld('tex/earth-day.jpg', 'uSatTex', true); ld('tex/earth-bump.jpg', 'uBump', false); ld('tex/earth-water.jpg', 'uWater', false);
  }
  setStyle(st) { if (st === 'sat' && this.satFailed) st = 'thema'; this.style = st; this.applyStyle(); }
  applyStyle() {
    const sat = this.style === 'sat' && this.satReady;
    const u = this.surf.material.uniforms;
    u.uSat.value = sat ? 1 : 0;
    const dark = this.theme === 'dark';
    if (!this.borders) return;
    this.borders.material.uniforms.uColor.value.set(sat ? '#ffffff' : dark ? '#000000' : '#5a463a');
    this.borders.material.uniforms.uOpacity.value = sat ? 0.32 : dark ? 0.55 : 0.28;
    this.tropics.material.uniforms.uColor.value.set(sat ? '#ffd27a' : dark ? '#ffb27a' : '#a5141f');
    this.tropics.material.uniforms.uOpacity.value = sat ? 0.55 : dark ? 0.45 : 0.4;
    this.atmo.material.uniforms.uColor.value.set(sat ? '#8fc6ff' : dark ? '#ff7a5a' : '#ffffff');
    u.uOverAmt.value = sat ? 0.62 : 1.0;
  }

  buildSurface() {
    const NX = 360, NY = 180;
    const ll = new Float32Array((NX + 1) * (NY + 1) * 2);
    const pos = new Float32Array((NX + 1) * (NY + 1) * 3);
    let k = 0, m = 0;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const u = -PI + 2 * PI * i / NX, lat = -PI / 2 + PI * j / NY;
      ll[k++] = u; ll[k++] = lat;
      const c = Math.cos(lat); pos[m++] = c * Math.sin(u); pos[m++] = Math.sin(lat); pos[m++] = c * Math.cos(u);
    }
    const idx = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('ll', new THREE.BufferAttribute(ll, 2));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMorph: { value: 0 }, uLon0: { value: 0 }, uMap: { value: null }, uId: { value: null },
        uSel: { value: -1 }, uHover: { value: -1 }, uSelMask: { value: null }, uHiAmt: { value: 0.5 }, uLight: { value: new THREE.Vector3(0, 0, 1) }, uHi: { value: new THREE.Color('#ffffff') },
        uOver: { value: null }, uOverAmt: { value: 1 }, uSatTex: { value: null }, uBump: { value: null }, uWater: { value: null }, uSat: { value: 0 }, uDark: { value: 0 },
      },
      vertexShader: GLSL_MORPH + `
        attribute vec2 ll; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB;
        void main(){
          vec3 p = mpos(ll, uMorph); vec3 n = mnorm(ll, uMorph);
          vT = normalize(mat3(modelMatrix) * (mpos(ll + vec2(0.01, 0.0), uMorph) - mpos(ll - vec2(0.01, 0.0), uMorph)));
          vB = normalize(mat3(modelMatrix) * (mpos(ll + vec2(0.0, 0.01), uMorph) - mpos(ll - vec2(0.0, 0.01), uMorph)));
          vUv = vec2(fract((ll.x + uLon0) / (2.0 * PI) + 0.5), ll.y / PI + 0.5);
          vN = normalize(mat3(modelMatrix) * n);
          vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform sampler2D uId; uniform sampler2D uSelMask; uniform float uHiAmt; uniform float uSel; uniform float uHover; uniform vec3 uLight; uniform vec3 uHi;
        uniform sampler2D uOver; uniform float uOverAmt; uniform sampler2D uSatTex; uniform sampler2D uBump; uniform sampler2D uWater; uniform float uSat; uniform float uDark;
        varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB;
        void main(){
          vec4 c = texture2D(uMap, vUv);
          float id = floor(texture2D(uId, vUv).r * 255.0 + 0.5);
          vec3 n = normalize(vN);
          vec3 col = c.rgb;
          float water = 0.0;
          if (uSat > 0.5) {
            col = texture2D(uSatTex, vUv).rgb;
            float h0 = texture2D(uBump, vUv).r;
            float hx = texture2D(uBump, vUv + vec2(1.0 / 2048.0, 0.0)).r - h0;
            float hy = texture2D(uBump, vUv + vec2(0.0, 1.0 / 1024.0)).r - h0;
            n = normalize(n - (vT * hx + vB * hy) * 6.0);
            water = texture2D(uWater, vUv).r;
          }
          vec4 ov = texture2D(uOver, vUv);
          col = mix(col, ov.rgb, ov.a * uOverAmt);
          float sm = uSel > 0.0 ? texture2D(uSelMask, vUv).a : 0.0;
          col = mix(col, uHi, uHiAmt * sm);
          if (sm < 0.5 && id > 0.5 && abs(id - uHover) < 0.5) col = mix(col, uHi, 0.25);
          vec3 Ld = normalize(uLight);
          float d = max(dot(n, Ld), 0.0);
          if (uSat > 0.5) {
            col *= (0.3 + 0.95 * d) * (uDark > 0.5 ? 0.9 : 1.0);
            col *= 1.0 - water * 0.12;
          } else col *= 0.62 + 0.48 * d;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide,
    });
    this.surf = new THREE.Mesh(geo, mat);
    this.surf.frustumCulled = false;
    this.group.add(this.surf);
  }

  buildLines() {
    const ll = [], other = [];
    for (const c of this.world) for (const r of c.rings) {
      for (let i = 0; i + 3 < r.length; i += 2) {
        const a = r[i], b = r[i + 1], c2 = r[i + 2], d = r[i + 3];
        if (Math.abs(c2 - a) > 180) continue;
        ll.push(a * D2R, b * D2R, c2 * D2R, d * D2R); other.push(c2 * D2R, a * D2R);
      }
    }
    // tropics (dashed)
    const trop = [], trOther = [];
    for (const lat of [23.44, -23.44]) for (let lon = -180; lon < 180; lon += 3) { trop.push(lon * D2R, lat * D2R, (lon + 1.6) * D2R, lat * D2R); trOther.push((lon + 1.6) * D2R, lon * D2R); }
    const mk = (arr, oth, color, opacity, lift) => {
      const geo = new THREE.BufferGeometry();
      const n = arr.length / 2;
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('ll', new THREE.BufferAttribute(new Float32Array(arr), 2));
      geo.setAttribute('lo', new THREE.BufferAttribute(new Float32Array(oth), 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMorph: this.surf.material.uniforms.uMorph, uLon0: this.surf.material.uniforms.uLon0, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uLift: { value: lift } },
        vertexShader: GLSL_MORPH + `
          attribute vec2 ll; attribute float lo; uniform float uLift; varying float vHide;
          void main(){
            float u = wrapPi(ll.x - uLon0); float u2 = wrapPi(lo - uLon0);
            vHide = (uMorph > 0.001 && abs(u - u2) > 1.0) ? 1.0 : 0.0;
            vec2 a = vec2(u, ll.y);
            vec3 p = mpos(a, uMorph) + mnorm(a, uMorph) * uLift;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vHide;
          void main(){ if (vHide > 0.5) discard; gl_FragColor = vec4(uColor, uOpacity);
          #include <colorspace_fragment>
          }`,
        transparent: true, depthWrite: false,
      });
      const l = new THREE.LineSegments(geo, mat); l.frustumCulled = false; this.group.add(l); return l;
    };
    this.borders = mk(ll, other, '#000000', 0.35, 0.0015);
    this.tropics = mk(trop, trOther, '#000000', 0.5, 0.002);
  }

  buildAtmo() {
    const geo = new THREE.SphereGeometry(R * 1.02, 96, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#c62a2f') }, uOp: { value: 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOp; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(uColor, f * 0.55 * uOp);
      #include <colorspace_fragment>
      }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    });
    this.atmo = new THREE.Mesh(geo, mat);
    this.scene.add(this.atmo);
  }

  buildBars() {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false); geo.translate(0, 0.5, 0);
    const capGeo = new THREE.CylinderGeometry(1, 1, 1, 20); capGeo.translate(0, 0.5, 0);
    this.barMatA = new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.55, metalness: 0.05 });
    this.barMatR = new THREE.MeshStandardMaterial({ color: '#d98b1a', roughness: 0.55, metalness: 0.05 });
    this.bars = [];
    const maxP = Math.max(...this.countries.map((c) => c.p26 || 0));
    for (const c of this.countries) {
      if (!c.p26) continue;
      const H = 0.26;
      const hA = (c.ara || 0) / maxP * H, hR = (c.rob || 0) / maxP * H;
      const g = new THREE.Group();
      const r = c.ref ? 0.008 : 0.014;
      const mA = new THREE.Mesh(geo, this.barMatA.clone()); mA.scale.set(r, Math.max(hA, 1e-4), r); mA.visible = hA > 0;
      const mR = new THREE.Mesh(capGeo, this.barMatR.clone()); mR.scale.set(r, Math.max(hR, 1e-4), r); mR.position.y = hA; mR.visible = hR > 0;
      mA.userData.cid = c.id; mR.userData.cid = c.id;
      g.add(mA, mR);
      g.userData = { c, h: hA + hR, u0: c.ll[0] * D2R, lat: c.ll[1] * D2R };
      this.group.add(g); this.bars.push(g);
    }
  }

  setPalette(theme) {
    this.theme = theme;
    const dark = theme === 'dark';
    this.pal = dark ? {
      ocean: '#101a22', grat: 'rgba(255,255,255,0.05)', belt: 'rgba(255,170,90,0.07)', land: '#2d2824', border: 'rgba(0,0,0,0.6)',
      low: '#6b3a22', high: '#ff5a4a', ref: '#4a3b30', refHatch: 'rgba(255,190,140,0.55)',
    } : {
      ocean: '#cfdde3', grat: 'rgba(20,40,60,0.07)', belt: 'rgba(200,60,40,0.06)', land: '#ece4d6', border: 'rgba(60,40,30,0.45)',
      low: '#f1c27d', high: '#a5141f', ref: '#e2cdb5', refHatch: 'rgba(120,50,30,0.6)',
    };
    this.drawTextures();
    this.borders.material.uniforms.uColor.value.set(dark ? '#000000' : '#5a463a');
    this.borders.material.uniforms.uOpacity.value = dark ? 0.55 : 0.28;
    this.tropics.material.uniforms.uColor.value.set(dark ? '#ffb27a' : '#a5141f');
    this.tropics.material.uniforms.uOpacity.value = dark ? 0.45 : 0.4;
    this.surf.material.uniforms.uHi.value.set(dark ? '#ffe2b8' : '#4a0710'); this.surf.material.uniforms.uHiAmt.value = dark ? 0.32 : 0.5;
    this.surf.material.uniforms.uDark.value = dark ? 1 : 0;
    this.atmo.material.uniforms.uColor.value.set(dark ? '#ff7a5a' : '#ffffff');
    for (const b of this.bars) {
      b.children[0].material.color.set(dark ? '#ff5a4f' : '#a5141f');
      b.children[1].material.color.set(dark ? '#f0a83a' : '#d98b1a');
    }
    this.amb.intensity = dark ? 0.9 : 1.3;
    this.applyStyle();
  }

  setGlobeControls() {
    const c = this.controls;
    c.target.set(0, 0, 0);
    c.enablePan = false; c.enableRotate = true; c.enableZoom = true;
    c.minDistance = 1.22; c.maxDistance = 5.5;
    c.minPolarAngle = 0.05; c.maxPolarAngle = PI - 0.05;
    c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity;
    c.rotateSpeed = 0.45; c.zoomSpeed = 0.9;
    c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  }
  setFlatControls() {
    const c = this.controls;
    c.enablePan = true; c.screenSpacePanning = true; c.enableRotate = true; c.enableZoom = true;
    c.minDistance = 0.25; c.maxDistance = 6;
    c.minPolarAngle = PI / 2; c.maxPolarAngle = PI / 2 + 0.6;
    const az = wrapPi(this.lon0);
    c.minAzimuthAngle = az; c.maxAzimuthAngle = az;
    c.rotateSpeed = 0.5; c.panSpeed = 1;
    c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    c.autoRotate = false;
  }

  // world-space point for lon/lat (degrees) at current morph
  worldPoint(lonDeg, latDeg, lift = 0) {
    const u = wrapPi(lonDeg * D2R - this.lon0), lat = latDeg * D2R;
    const p = morphPos(u, lat, this.morph, new THREE.Vector3());
    if (lift) p.add(morphNormal(u, lat, this.morph, new THREE.Vector3()).multiplyScalar(lift));
    return p.applyMatrix4(this.group.matrixWorld);
  }

  centerLonLat() {
    if (this.morph < 0.5) {
      const d = this.camera.position.clone().normalize();
      return [Math.atan2(d.x, d.z), Math.asin(THREE.MathUtils.clamp(d.y, -1, 1))];
    }
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    const t = this.controls.target.clone().applyMatrix4(inv);
    return [t.x / R + this.lon0, THREE.MathUtils.clamp(t.y / R, -1.3, 1.3)];
  }

  setMode(mode, instant = false) {
    if (mode === this.mode && !instant) return;
    const [lonc, latc] = this.centerLonLat();
    const from = { morph: this.morph, pos: this.camera.position.clone(), tgt: this.controls.target.clone() };
    this.mode = mode;
    this.controls.autoRotate = false;
    if (mode === 'flat') {
      this.lon0 = lonc;
      this.group.rotation.y = this.lon0;
      this.surf.material.uniforms.uLon0.value = this.lon0;
      this.group.updateMatrixWorld(true);
      const rot = new THREE.Matrix4().makeRotationY(this.lon0);
      const tgt = new THREE.Vector3(0, R * THREE.MathUtils.clamp(latc, -1, 1), R).applyMatrix4(rot);
      const d = 2.2;
      const pos = new THREE.Vector3(0, R * latc - d * 0.42, R + d).applyMatrix4(rot);
      this.startAnim({ from, to: { morph: 1, pos, tgt }, dur: instant ? 0 : 1600, done: () => this.setFlatControls() });
    } else {
      const dist = THREE.MathUtils.clamp(from.pos.distanceTo(from.tgt) + 0.6, 2.2, 4);
      const pos = this.sph(lonc, latc, dist);
      this.setGlobeControls();
      this.controls.enabled = false;
      this.startAnim({ from, to: { morph: 0, pos, tgt: new THREE.Vector3() }, dur: instant ? 0 : 1600, done: () => { this.controls.enabled = this.active; } });
    }
  }

  startAnim(a) { a.t = 0; this.anim = a; this.controls.enabled = false; if (a.dur === 0) this.stepAnim(1); }
  stepAnim(dt) {
    const a = this.anim; if (!a) return;
    a.t = a.dur ? Math.min(1, a.t + dt * 1000 / a.dur) : 1;
    const e = ease(a.t);
    if (a.to.morph !== undefined) this.morph = a.from.morph + (a.to.morph - a.from.morph) * e;
    this.surf.material.uniforms.uMorph.value = this.morph;
    if (a.to.pos) {
      // arc around centre while in globe mode keeps the motion pleasing
      if (this.mode === 'globe' && a.to.morph === undefined) {
        const r0 = a.from.pos.length(), r1 = a.to.pos.length();
        const v = a.from.pos.clone().normalize().lerp(a.to.pos.clone().normalize(), e).normalize();
        this.camera.position.copy(v.multiplyScalar(r0 + (r1 - r0) * e));
      } else this.camera.position.lerpVectors(a.from.pos, a.to.pos, e);
      this.controls.target.lerpVectors(a.from.tgt, a.to.tgt, e);
    }
    if (a.t >= 1) { this.anim = null; this.controls.enabled = this.active; a.done && a.done(); }
  }

  flyTo(lonDeg, latDeg, dist) {
    this.controls.autoRotate = false;
    if (dist && this.camera.aspect < 0.9) dist *= 1.4;
    const from = { pos: this.camera.position.clone(), tgt: this.controls.target.clone() };
    if (this.mode === 'globe') {
      const d = dist || Math.min(from.pos.length(), 2.3);
      this.startAnim({ from, to: { pos: this.sph(lonDeg * D2R, latDeg * D2R, d), tgt: new THREE.Vector3() }, dur: 1100 });
    } else {
      const tgt = this.worldPoint(lonDeg, latDeg);
      const off = from.pos.clone().sub(from.tgt);
      const len = Math.min(off.length(), dist || 1.1);
      off.setLength(len);
      this.startAnim({ from, to: { pos: tgt.clone().add(off), tgt }, dur: 1100 });
    }
  }

  zoom(f) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance);
    const from = { pos: this.camera.position.clone(), tgt: this.controls.target.clone() };
    this.startAnim({ from, to: { pos: this.controls.target.clone().add(off.setLength(len)), tgt: this.controls.target.clone() }, dur: 350 });
  }

  reset() {
    this.select(null);
    if (this.mode === 'flat') { this.mode = 'globe'; this.setMode('flat', false); }
    else this.flyTo(-28, 6, this.camera.aspect >= 0.9 && this.camera.aspect < 1.2 ? 4.6 : 3.7);
  }

  setActive(a) { this.active = a; this.controls.enabled = a && !this.anim; }

  select(id) {
    this.selected = id;
    const i = id ? this.idx.get(id) : -1;
    this.surf.material.uniforms.uSel.value = i || -1;
    if (id) {
      const W = 4096, H = 2048;
      const cv = this.selCanvas || (this.selCanvas = Object.assign(document.createElement('canvas'), { width: W, height: H }));
      const g = cv.getContext('2d'); g.clearRect(0, 0, W, H);
      const c = this.byId.get(id);
      if (c) { g.fillStyle = '#fff'; this.pathFn(c, g, W, H); g.fill('evenodd'); }
      if (!this.selTex) { this.selTex = new THREE.CanvasTexture(cv); this.selTex.wrapS = THREE.RepeatWrapping; this.surf.material.uniforms.uSelMask.value = this.selTex; }
      this.selTex.needsUpdate = true;
    }
    for (const b of this.bars) {
      const on = b.userData.c.id === id;
      for (const m of b.children) m.material.emissive.set(on ? (this.theme === 'dark' ? '#553322' : '#3a0a0a') : '#000000');
    }
  }
  setHover(id) {
    this.hover = id;
    const i = id ? this.idx.get(id) : -1;
    this.surf.material.uniforms.uHover.value = i || -1;
  }

  // ---------- picking ----------
  pick(ndcX, ndcY) {
    if (this.anim || (this.morph > 0.02 && this.morph < 0.98)) return null;
    const rc = new THREE.Raycaster();
    rc.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const hits = rc.intersectObjects(this.bars.flatMap((b) => b.children.filter((m) => m.visible)), false);
    if (hits.length) return hits[0].object.userData.cid;
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    const o = rc.ray.origin.clone().applyMatrix4(inv);
    const d = rc.ray.direction.clone().transformDirection(inv);
    let lon, lat;
    if (this.morph < 0.5) {
      const b = o.dot(d), c = o.dot(o) - R * R, disc = b * b - c;
      if (disc < 0) return null;
      const t = -b - Math.sqrt(disc); if (t < 0) return null;
      const p = o.add(d.multiplyScalar(t));
      lon = Math.atan2(p.x, p.z) + this.lon0; lat = Math.asin(THREE.MathUtils.clamp(p.y / R, -1, 1));
    } else {
      if (Math.abs(d.z) < 1e-6) return null;
      const t = (R - o.z) / d.z; if (t < 0) return null;
      const p = o.add(d.multiplyScalar(t));
      lon = p.x / R + this.lon0; lat = p.y / R;
      if (Math.abs(p.x) > PI * R) return null;
    }
    lon = wrapPi(lon) / D2R; lat = lat / D2R;
    for (const cc of this.countries) {
      const c = this.byId.get(cc.id); if (!c) continue;
      let inside = false;
      for (const r of c.rings) {
        for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
          const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
          if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
        }
      }
      if (inside) return cc.id;
    }
    return null;
  }

  resize(w, h) {
    const first = !this.w;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.w = w; this.h = h;
    if (first && w / h < 1.2 && this.mode === 'globe') this.camera.position.setLength(w / h < 0.9 ? 5.2 : 4.6);
  }

  update(dt) {
    this.stepAnim(dt);
    if (this.active && !this.anim) this.controls.update();
    // flat mode: keep target inside the map
    if (this.mode === 'flat' && !this.anim) {
      const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
      const t = this.controls.target.clone().applyMatrix4(inv);
      const cx = THREE.MathUtils.clamp(t.x, -PI * R, PI * R), cy = THREE.MathUtils.clamp(t.y, -PI / 2 * R, PI / 2 * R);
      if (cx !== t.x || cy !== t.y || Math.abs(t.z - R) > 1e-4) {
        const fix = new THREE.Vector3(cx, cy, R).applyMatrix4(this.group.matrixWorld);
        const delta = fix.sub(this.controls.target);
        this.controls.target.add(delta); this.camera.position.add(delta);
      }
    }
    this.group.updateMatrixWorld(true);
    // bars follow the surface
    const n = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (const b of this.bars) {
      const { u0, lat } = b.userData;
      const u = wrapPi(u0 - this.lon0);
      morphPos(u, lat, this.morph, b.position);
      morphNormal(u, lat, this.morph, n);
      b.quaternion.setFromUnitVectors(up, n);
      const hidden = this.morph > 0.001 && this.morph < 0.999 && Math.abs(u) > 2.6;
      b.visible = !hidden;
    }
    this.atmo.visible = this.morph < 0.25;
    this.atmo.material.uniforms.uOp.value = 1 - this.morph * 4;
    // light from camera, slightly up/left
    const L = this.camera.position.clone().sub(this.controls.target).normalize();
    const right = new THREE.Vector3().crossVectors(this.camera.up, L).normalize();
    const lv = L.clone().multiplyScalar(1).add(this.camera.up.clone().multiplyScalar(0.5)).add(right.multiplyScalar(-0.35)).normalize();
    this.surf.material.uniforms.uLight.value.copy(lv);
    this.dir.position.copy(this.camera.position).add(this.camera.up.clone().multiplyScalar(1.5));
  }

  // label anchor positions in CSS px; returns [{c, x, y, vis, z}]
  projectLabels() {
    const out = [];
    const camDir = new THREE.Vector3();
    for (const b of this.bars.concat(this.countries.filter((c) => !c.p26).map((c) => ({ userData: { c, h: 0, u0: c.ll[0] * D2R, lat: c.ll[1] * D2R } })))) {
      const { c, h, u0, lat } = b.userData;
      const u = wrapPi(u0 - this.lon0);
      const p = morphPos(u, lat, this.morph, new THREE.Vector3());
      const nn = morphNormal(u, lat, this.morph, new THREE.Vector3());
      p.add(nn.clone().multiplyScalar(h + 0.012)).applyMatrix4(this.group.matrixWorld);
      const nw = nn.transformDirection(this.group.matrixWorld);
      camDir.copy(this.camera.position).sub(p).normalize();
      let vis = true;
      if (this.morph < 0.6 && nw.dot(camDir) < 0.12) vis = false;
      if (this.morph > 0.001 && this.morph < 0.999 && Math.abs(u) > 2.4) vis = false;
      const s = p.clone().project(this.camera);
      if (s.z > 1 || Math.abs(s.x) > 1.05 || Math.abs(s.y) > 1.05) vis = false;
      out.push({ c, x: (s.x + 1) / 2 * this.w, y: (1 - s.y) / 2 * this.h, vis, d: this.camera.position.distanceTo(p) });
    }
    return out;
  }

  render(renderer) { renderer.render(this.scene, this.camera); }
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${g},${bl})`;
}
