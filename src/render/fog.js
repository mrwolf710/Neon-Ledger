import * as THREE from 'three';

export const FOG = {
  color: 0x1a1430,
  density: 0.03,  // per unit of view depth beyond the focus (time of day overrides colour and density)
  startOffset: 8, // distance fog starts this many units in front of the camera focus
  ground: 0.2,    // extra low mist at ground level, independent of distance
  falloff: 0.35,  // how fast fog thins with height (per unit)
  high: 0.25,     // distance fog kept far above the ground (0..1)
};

// Height fog: scene.fog (FogExp2) supplies colour/density and the USE_FOG define; patched materials
// scale it by world height so it pools near the ground. Unpatched materials get plain (faint) exp2 fog.
const uniforms = {
  fogFalloff: { value: FOG.falloff }, fogHigh: { value: FOG.high }, fogGround: { value: FOG.ground }, fogStart: { value: 0 },
};

const VERT = /* glsl */`
#ifdef USE_FOG
  vec4 fogWP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    fogWP = instanceMatrix * fogWP;
  #endif
  vFogWorldY = (modelMatrix * fogWP).y;
  vFogDepth = - mvPosition.z;
#endif`;

const FRAG = /* glsl */`
#ifdef USE_FOG
  float fogH = exp(-max(vFogWorldY, 0.0) * fogFalloff);
  float fogFactor = (1.0 - exp(-fogDensity * max(vFogDepth - fogStart, 0.0))) * mix(fogHigh, 1.0, fogH) + fogGround * fogH;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, clamp(fogFactor, 0.0, 1.0));
#endif`;

function onBeforeCompile(shader) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\nvarying float vFogWorldY;')
    .replace('#include <fog_vertex>', VERT);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nvarying float vFogWorldY;\nuniform float fogFalloff, fogHigh, fogGround, fogStart;')
    .replace('#include <fog_fragment>', FRAG);
}

export function createHeightFog(scene) {
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density);
  const done = new WeakSet();
  return {
    uniforms,
    // Distance fog starts just in front of what the camera looks at, so zoom does not change the haze much.
    update(camera, focus) { uniforms.fogStart.value = camera.position.distanceTo(focus) - FOG.startOffset; },
    // Patches every fogged material under root (call once per built group).
    patch(root) {
      root.traverse((o) => {
        if (!o.isMesh || !o.material.fog || done.has(o.material)) return;
        done.add(o.material);
        o.material.onBeforeCompile = onBeforeCompile;
        o.material.customProgramCacheKey = () => 'heightFog';
      });
    },
  };
}
