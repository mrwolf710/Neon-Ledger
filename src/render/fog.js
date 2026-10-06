import * as THREE from 'three';

export const FOG = {
  color: 0x1a1430,
  density: 0.03,  // per unit of view depth beyond the focus (time of day overrides colour and density)
  startOffset: 8, // distance fog starts this many units in front of the camera focus
  ground: 0.2,    // extra low mist at ground level, independent of distance
  falloff: 0.35,  // how fast fog thins with height (per unit)
  high: 0.25,     // distance fog kept far above the ground (0..1)
};

// See-through cutaway: geometry in front of the player, inside a circle around them on screen and above
// street level, is discarded (dithered edge) so near buildings never hide Juno. Shares the fog patch.
export const CUTAWAY = {
  radius: 4.8,     // world units around the player
  minY: 0.3,      // never cut below this height (street, sidewalks, curbs)
  margin: 1.5,    // only cut things at least this much closer to the camera than the player
  edge: 0.3,      // dithered fraction of the radius
};

// Height fog: scene.fog (FogExp2) supplies colour/density and the USE_FOG define; patched materials
// scale it by world height so it pools near the ground. Unpatched materials get plain (faint) exp2 fog.
const uniforms = {
  fogFalloff: { value: FOG.falloff }, fogHigh: { value: FOG.high }, fogGround: { value: FOG.ground }, fogStart: { value: 0 },
  cutCenter: { value: new THREE.Vector2(-1e4, -1e4) }, cutRadius: { value: 0 }, cutDepth: { value: 0 },
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
  {
    float cutD = length(gl_FragCoord.xy - cutCenter) / cutRadius;
    if (cutD < 1.0 && vFogDepth < cutDepth && vFogWorldY > ${CUTAWAY.minY.toFixed(2)}) {
      const float bayer[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
      ivec2 bp = ivec2(mod(gl_FragCoord.xy, 4.0));
      float edgeT = (cutD - (1.0 - ${CUTAWAY.edge.toFixed(2)})) / ${CUTAWAY.edge.toFixed(2)};
      if (edgeT < (bayer[bp.y * 4 + bp.x] + 0.5) / 16.0) discard;
    }
  }
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
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nvarying float vFogWorldY;\nuniform float fogFalloff, fogHigh, fogGround, fogStart, cutRadius, cutDepth;\nuniform vec2 cutCenter;')
    .replace('#include <fog_fragment>', FRAG);
}

const v = new THREE.Vector3();

export function createHeightFog(scene) {
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density);
  const done = new WeakSet();
  return {
    uniforms,
    // Distance fog starts just in front of what the camera looks at, so zoom does not change the haze much.
    update(camera, focus) { uniforms.fogStart.value = camera.position.distanceTo(focus) - FOG.startOffset; },
    // Centres the cutaway on the player. bufferW/H: drawing-buffer pixels (gl_FragCoord space).
    cutaway(camera, playerPos, bufferW, bufferH) {
      v.copy(playerPos).setY(playerPos.y + 1).applyMatrix4(camera.matrixWorldInverse);
      const depth = -v.z;
      uniforms.cutDepth.value = depth - CUTAWAY.margin;
      uniforms.cutRadius.value = (CUTAWAY.radius / (2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * bufferH;
      v.copy(playerPos).setY(playerPos.y + 1).project(camera);
      uniforms.cutCenter.value.set((v.x + 1) / 2 * bufferW, (v.y + 1) / 2 * bufferH);
    },
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
