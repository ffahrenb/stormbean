// Physically based sky + image-based lighting, and optional GTAO post-processing.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const SKY_PRESETS = {
  light: { elev: 48, azim: 54, turbidity: 6, rayleigh: 1.4, mie: 0.004, g: 0.78, gain: 0.42, sun: '#fff3df', sunI: 2.6, hemi: 0.55, fog: '#d9dfe2' },
  dark: { elev: 11, azim: 293, turbidity: 9, rayleigh: 2.6, mie: 0.007, g: 0.86, gain: 0.3, sun: '#ff9a62', sunI: 1.7, hemi: 0.32, fog: '#6c6676' },
};

export function makeSky(size = 450) {
  const sky = new Sky();
  sky.scale.setScalar(size);
  sky.material.uniforms.uGain = { value: 0.45 };
  sky.material.onBeforeCompile = (sh) => {
    sh.uniforms.uGain = sky.material.uniforms.uGain;
    sh.fragmentShader = 'uniform float uGain;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uGain, 1.0 );');
  };
  sky.material.customProgramCacheKey = () => 'sky-gain';
  sky.frustumCulled = false;
  return sky;
}

// configure sky for a theme and return the sun direction (unit vector)
export function applySky(sky, theme) {
  const p = SKY_PRESETS[theme] || SKY_PRESETS.light;
  const u = sky.material.uniforms;
  u.turbidity.value = p.turbidity; u.rayleigh.value = p.rayleigh; u.mieCoefficient.value = p.mie; u.mieDirectionalG.value = p.g; u.uGain.value = p.gain;
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - p.elev), THREE.MathUtils.degToRad(p.azim));
  u.sunPosition.value.copy(sun);
  return { sun, p };
}

// render the sky alone into a PMREM environment map
export function envFromSky(renderer, sky, prev) {
  const pm = new THREE.PMREMGenerator(renderer);
  const sc = new THREE.Scene();
  const clone = new THREE.Mesh(sky.geometry, sky.material); clone.scale.copy(sky.scale);
  sc.add(clone);
  const rt = pm.fromScene(sc, 0, 0.1, 1000);
  pm.dispose();
  if (prev) prev.dispose();
  return rt;
}

// lazy composer with GTAO; one per (scene, camera)
export class Post {
  constructor(renderer, scene, camera, ao = {}) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.ao = ao;
    this.w = 1; this.h = 1; this.composer = null;
  }
  ensure(w, h) {
    const pr = this.renderer.getPixelRatio();
    if (!this.composer) {
      const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.gtao = new GTAOPass(this.scene, this.camera, w, h);
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.blendIntensity = this.ao.intensity ?? 0.85;
      this.gtao.updateGtaoMaterial({ radius: this.ao.radius ?? 0.6, distanceExponent: 1.6, thickness: this.ao.thickness ?? 1, scale: 1, samples: 12 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      this.composer.addPass(this.gtao);
      this.composer.addPass(new OutputPass());
    }
    if (w !== this.w || h !== this.h || pr !== this.pr) {
      this.w = w; this.h = h; this.pr = pr;
      this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
    }
  }
  render(w, h) { this.ensure(w, h); this.composer.render(); }
  dispose() { if (this.composer) { this.composer.passes.forEach((p) => p.dispose && p.dispose()); this.composer.dispose(); this.composer = null; } }
}
