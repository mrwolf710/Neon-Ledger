import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { drawText, measure } from '../gen/pixelfont.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Fake monitor: brand plate (top right) and knobs / buttons (bottom), sizes as fractions of the screen height.
export const MONITOR = { brand: 'MANGAVOX', brandScale: 0.0045, brandPad: 0.02, side: 0.09, bottom: 0.2 }; // fake TV housing, as fractions of the screen height
function brandTexture() {
  const cv = Object.assign(document.createElement('canvas'), { width: measure(MONITOR.brand), height: 5 });
  drawText(cv.getContext('2d'), MONITOR.brand, 0, 0, '#ffffff');
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

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
const M = MONITOR;
const Grade = {
  uniforms: {
    tDiffuse: { value: null }, lift: { value: new THREE.Vector3() }, gamma: { value: new THREE.Vector3() },
    gain: { value: new THREE.Vector3() }, saturation: { value: 1 }, grain: { value: 0 }, fringe: { value: 0 }, time: { value: 0 },
    echo: { value: 0 }, glitch: { value: 0 }, vhs: { value: 0 }, crt: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, brand: { value: null }, brandSize: { value: new THREE.Vector2() },
  },
  vertexShader: TiltShift.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec3 lift, gamma, gain; uniform float saturation, grain, fringe, time, echo, glitch, vhs, crt; uniform vec2 res, brandSize; uniform sampler2D brand;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      float edge = 0.0;
      if (crt > 0.0) { // playing inside a CRT monitor: the picture is shrunk, bulged, rounded and framed by a black bezel
        vec2 p = (vUv - 0.5 - vec2(0.0, 0.055 * crt)) * (1.0 + crt * 0.28);
        p *= 1.0 + crt * 0.5 * dot(p, p);
        uv = p + 0.5;
        vec2 q = abs(p);
        edge = max(q.x, q.y);
        float d = max(edge - 0.5, length(max(q - 0.43, 0.0)) - 0.07); // > 0 outside the glass
        if (d > 0.0) { // dark pixel-art TV housing in nested frames with teal edge lines, a control panel underneath and a green glow around it
          vec2 bp = (vUv - 0.5 - vec2(0.0, 0.055 * crt)) * (1.0 + crt * 0.28);
          vec2 cp = bp / (1.0 + crt * 0.28) * res;                                       // pixels from the screen centre (y up)
          float H = res.y, f = 0.5 / (1.0 + crt * 0.125) / (1.0 + crt * 0.28), gx = f * res.x, gy = f * res.y;
          float dx = abs(cp.x) - gx, dyT = cp.y - gy, dyB = -cp.y - gy;
          bool low = cp.y < 0.0;
          float t = max(dx, low ? min(dyB, 0.06 * H) : dyT) / H;                         // distance from the glass, in screen heights
          float o = max(dx / H - ${M.side}, low ? dyB / H - ${M.bottom} : dyT / H - ${M.side}); // > 0 outside the case
          vec3 col;
          if (o > 0.0) { // green halo, blocky like the pixel art
            float h = exp(-o / 0.12) * (0.85 + 0.15 * hash(floor(cp / (0.008 * H))));
            col = vec3(0.01, 0.02, 0.03) + vec3(0.02, 0.5, 0.32) * (floor(h * 7.0) / 7.0) * 0.6;
          } else {
            col = vec3(0.035, 0.07, 0.08) * (1.0 + 0.25 * step(0.0, -bp.x - bp.y));
            if (t < 0.018) col = vec3(0.005, 0.02, 0.02);
            else if (t < 0.023) col = vec3(0.08, 0.4, 0.36);
            else if (t > 0.05 && t < 0.055) col = vec3(0.06, 0.26, 0.24);
            if (low && dyB / H > 0.06) { // control panel
              vec2 pp = vec2(cp.x, -cp.y - gy - 0.13 * H);
              col = vec3(0.04, 0.075, 0.085);
              if (dyB / H < 0.065) col = vec3(0.08, 0.4, 0.36);
              vec2 gr = abs(pp - vec2(-gx + 0.12 * H, 0.0)) / (vec2(0.1, 0.035) * H);       // speaker grille
              if (max(gr.x, gr.y) < 1.0) col = (mod(floor(cp.x / (0.007 * H)) + floor(cp.y / (0.007 * H)), 2.0) < 1.0) ? vec3(0.1, 0.2, 0.22) : vec3(0.02, 0.04, 0.05);
              vec2 dp = abs(pp) / (vec2(0.1, 0.025) * H);                                   // red display
              if (max(dp.x, dp.y) < 1.0) col = (max(dp.x, dp.y) > 0.85) ? vec3(0.1, 0.25, 0.25) : (mod(floor(cp.x / (0.006 * H)), 5.0) < 3.0 && abs(pp.y) < 0.006 * H) ? vec3(0.95, 0.12, 0.1) : vec3(0.12, 0.01, 0.02);
              float pr = length(pp - vec2(gx - 0.13 * H, 0.0)) / (0.022 * H);                // green power button
              if (pr < 1.0) col = pr > 0.75 ? vec3(0.08, 0.45, 0.4) : vec3(0.15, 0.85, 0.55);
              float kr = length(pp - vec2(gx - 0.06 * H, 0.0)) / (0.017 * H);               // knob
              if (kr < 1.0) col = kr > 0.75 ? vec3(0.07, 0.3, 0.28) : vec3(0.02, 0.04, 0.05);
              for (int i = 0; i < 2; i++) if (length(pp - vec2(-gx + 0.03 * H, (float(i) - 0.5) * 0.03 * H)) < 0.006 * H) col = vec3(0.1, 0.8, 0.9); // status dots
            }
            if (o > -0.004) col = vec3(0.08, 0.35, 0.3);                                // outer teal edge line
            vec2 bt = vec2(cp.x - (gx - ${M.brandPad} * H - brandSize.x * ${M.brandScale} * H), (gy + 0.0725 * H + 2.5 * ${M.brandScale} * H) - cp.y) / (${M.brandScale} * H); // brand text, in text pixels
            if (!low && bt.x >= 0.0 && bt.x < brandSize.x && bt.y >= 0.0 && bt.y < 5.0 && texture2D(brand, vec2(bt.x / brandSize.x, 1.0 - bt.y / 5.0)).a > 0.5) col = vec3(0.2, 0.75, 0.6);
          }
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
        c = mix(c, c * vec3(0.8, 1.0, 0.9) + vec3(0.0, 0.04, 0.03), crt);                                                               // faint glass glow
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
  g.brand.value = brandTexture(); g.brandSize.value.set(measure(MONITOR.brand), 5);
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
      g.res.value.set(w * pr, h * pr);
      tiltH.uniforms.dir.value.set(1 / (w * pr), 0);
      tiltV.uniforms.dir.value.set(0, 1 / (h * pr));
    },
    render(dt) {
      g.time.value = (g.time.value + dt) % 100;
      composer.render(dt);
    },
  };
}
