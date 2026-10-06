import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const POST = {
  bloom: { strength: 0.6, radius: 0.35, threshold: 0.85 },
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
    echo: { value: 0 }, glitch: { value: 0 }, vhs: { value: 0 }, crt: { value: 0 },
  },
  vertexShader: TiltShift.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec3 lift, gamma, gain; uniform float saturation, grain, fringe, time, echo, glitch, vhs, crt;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      float edge = 0.0;
      if (crt > 0.0) { // playing inside a CRT monitor: the picture is shrunk, bulged, rounded and framed by a black bezel
        vec2 p = (vUv - 0.5) * (1.0 + crt * 0.18);
        p *= 1.0 + crt * 0.5 * dot(p, p);
        uv = p + 0.5;
        vec2 q = abs(p);
        edge = max(q.x, q.y);
        float d = max(edge - 0.5, length(max(q - 0.43, 0.0)) - 0.07); // > 0 outside the glass
        if (d > 0.0) { // fake beige plastic bezel: recessed lip, soft bevel lit from the top left, grain, dark room beyond it
          vec2 bp = (vUv - 0.5) * (1.0 + crt * 0.18);
          vec3 col = vec3(0.74, 0.69, 0.58) * (0.62 + 0.1 * (bp.x * -1.0 + bp.y) * 2.0);
          col = mix(vec3(0.12, 0.1, 0.08), col, smoothstep(0.0, 0.035, d));              // shadow in the recess around the glass
          col *= 1.0 - 0.35 * smoothstep(0.55, 0.66, max(abs(bp.x), abs(bp.y)));         // bezel falls off toward the edge
          col += (hash(vUv * 900.0) - 0.5) * 0.04;                                       // plastic grain
          if (max(abs(bp.x), abs(bp.y)) > 0.66) col = vec3(0.015, 0.015, 0.02);          // the dark room
          gl_FragColor = vec4(col, 1.0); return;
        }
      }
      if (glitch > 0.0) { // pixel tear: shift random horizontal bands
        float band = floor(vUv.y * 28.0), h = hash(vec2(band, floor(time * 40.0)));
        if (h > 0.72) uv.x += (h - 0.86) * 0.35 * glitch;
      }
      vec2 off = (vUv - 0.5) * (fringe + glitch * 0.01) * 2.0;
      if (vhs > 0.0) { // old VHS tape: line jitter, a rolling tracking-error band, strong colour bleed
        float row = floor(vUv.y * 240.0);
        uv.x += (hash(vec2(row, floor(time * 12.0))) - 0.5) * 0.004 * vhs;
        float d = abs(vUv.y - fract(time * 0.12));
        uv.x += smoothstep(0.07, 0.0, d) * 0.03 * vhs * sin(vUv.y * 90.0 + time * 30.0);
        off += vec2(0.004 * vhs, 0.0);
      }
      vec3 c =vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
      c = pow(max(gain * (c + lift * (1.0 - c)), 0.0), 1.0 / gamma);
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, saturation);
      if (echo > 0.0) { // echo mode: desaturated cyan, scanlines, slow vignette
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(c, vec3(l) * vec3(0.45, 0.95, 1.15) + vec3(0.0, 0.03, 0.05), echo * 0.88);
        c *= 1.0 - echo * (0.16 + 0.1 * glitch) * (0.5 + 0.5 * sin(gl_FragCoord.y * 1.6));
        c *= 1.0 - echo * 0.35 * smoothstep(0.35, 1.0, length(vUv - 0.5) * 1.5);
      }
      if (vhs > 0.0) {
        c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.0 - 0.35 * vhs) * vec3(1.04, 1.0, 0.92); // washed, slightly warm
        c *= 1.0 - vhs * 0.22 * (0.5 + 0.5 * sin(vUv.y * 720.0));                                       // scan lines
        c += smoothstep(0.07, 0.0, abs(vUv.y - fract(time * 0.12))) * 0.12 * vhs;                        // band glows
        if (vUv.y < 0.04) c = mix(c, vec3(hash(vUv * 500.0 + time)), 0.6 * vhs);                         // head-switching noise at the bottom
        c += (hash(vUv * 700.0 - time) - 0.5) * 0.14 * vhs;
      }
      if (crt > 0.0) {
        c *= 1.0 - crt * 0.35 * (0.5 + 0.5 * sin(gl_FragCoord.y * 2.4));                              // CRT scan lines
        c *= 1.0 - crt * 0.12 * step(1.5, mod(gl_FragCoord.x, 3.0));                                    // phosphor mask
        c *= 1.0 - crt * 0.7 * smoothstep(0.3, 0.52, edge);                                             // vignette toward the glass edge
        c += vec3(0.0, 0.03, 0.04) * crt;                                                               // faint glass glow
        c *= 1.0 + crt * 0.04 * sin(time * 110.0);                                                      // mains flicker
      }
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
    setEcho(a) { g.echo.value = a; },       // 0..1 echo-mode grade
    setCrt(a) { g.crt.value = a; },         // 0..1 CRT monitor frame (1 = small bulged screen in a bezel, 0 = full screen)
    setVhs(a) { g.vhs.value = a; },         // 0..1 old-VHS-tape look (cold open)
    setGlitch(a) { g.glitch.value = a; },   // 0..1 pixel-tear strength
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
