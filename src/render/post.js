import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const POST = {
  bloom: { strength: 0.9, radius: 0.5, threshold: 0.75 },
  tilt: { center: 0.5, band: 0.12, ramp: 0.3, maxBlur: 3.0 }, // screen-space 0..1; blur in pixels per tap
  grade: { lift: [0.02, 0.0, 0.05], gamma: [1.0, 1.0, 0.95], gain: [1.05, 1.0, 1.1], saturation: 1.15 },
  grain: 0.05,
  fringe: 0.0015, // chromatic offset at the screen edge, in uv
};

// Separable blur whose radius grows away from a sharp horizontal band (miniature look).
const TiltShift = {
  uniforms: {
    tDiffuse: { value: null }, dir: { value: new THREE.Vector2() },
    center: { value: 0 }, band: { value: 0 }, ramp: { value: 0 }, maxBlur: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 dir; uniform float center, band, ramp, maxBlur;
    varying vec2 vUv;
    void main() {
      float k = smoothstep(band, band + ramp, abs(vUv.y - center)) * maxBlur;
      vec4 sum = vec4(0.0); float wsum = 0.0;
      for (int i = -4; i <= 4; i++) {
        float w = exp(-float(i * i) / 8.0);
        sum += texture2D(tDiffuse, vUv + dir * float(i) * k) * w;
        wsum += w;
      }
      gl_FragColor = sum / wsum;
    }`,
};

// Lift/gamma/gain + saturation, film grain and a slight chromatic fringe toward the edges. Runs in display space.
const Grade = {
  uniforms: {
    tDiffuse: { value: null }, lift: { value: new THREE.Vector3() }, gamma: { value: new THREE.Vector3() },
    gain: { value: new THREE.Vector3() }, saturation: { value: 1 }, grain: { value: 0 }, fringe: { value: 0 }, time: { value: 0 },
  },
  vertexShader: TiltShift.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec3 lift, gamma, gain; uniform float saturation, grain, fringe, time;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 off = (vUv - 0.5) * fringe * 2.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      c = pow(max(gain * (c + lift * (1.0 - c)), 0.0), 1.0 / gamma);
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, saturation);
      c += (hash(vUv * 1000.0 + time) - 0.5) * grain;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createPost(renderer, scene, camera, quality) {
  const P = POST;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), P.bloom.strength, P.bloom.radius, P.bloom.threshold);
  composer.addPass(bloom);
  const tiltH = new ShaderPass(TiltShift), tiltV = new ShaderPass(TiltShift);
  composer.addPass(tiltH);
  composer.addPass(tiltV);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(Grade);
  composer.addPass(grade);

  const g = grade.uniforms;
  function applyUniforms() {
    for (const t of [tiltH, tiltV]) {
      t.uniforms.center.value = P.tilt.center; t.uniforms.band.value = P.tilt.band;
      t.uniforms.ramp.value = P.tilt.ramp; t.uniforms.maxBlur.value = P.tilt.maxBlur;
    }
    bloom.strength = P.bloom.strength; bloom.radius = P.bloom.radius; bloom.threshold = P.bloom.threshold;
    g.lift.value.set(...P.grade.lift); g.gamma.value.set(...P.grade.gamma); g.gain.value.set(...P.grade.gain);
    g.saturation.value = P.grade.saturation; g.grain.value = P.grain; g.fringe.value = P.fringe;
  }
  applyUniforms();

  return {
    composer,
    applyUniforms, // call after changing POST (debug sliders in 3B)
    setSize(w, h) {
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      bloom.setSize( // after composer.setSize, which sizes bloom at full res
w * pr * quality.bloomScale, h * pr * quality.bloomScale);
      tiltH.uniforms.dir.value.set(1 / (w * pr), 0);
      tiltV.uniforms.dir.value.set(0, 1 / (h * pr));
    },
    render(dt) {
      g.time.value = (g.time.value + dt) % 100;
      composer.render(dt);
    },
  };
}
