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
  radius: 5.76,    // world units around the player (was 4.8, +20%)
  minY: 0.3,      // never cut below this height (street, sidewalks, curbs)
  margin: 0.8,    // only cut things at least this much closer to the camera than the player
  edge: 0.3,      // dithered fraction of the radius
  mode: 'roof', // 'circle' = the see-through circle around the player; 'roof' = a slot along the line of sight: anything above the sight line (and above roofFloor) is removed
  roofReach: 3.2, // roof mode: half-width of the slot around the line from the camera to the player (world units)
  roofFloor: 2.4, // roof mode: never cut below this height (a bit over Juno's head)
  roofClear: 0.6, // roof mode: cut this far under the sight line so her whole body is clear
};

// Height fog: scene.fog (FogExp2) supplies colour/density and the USE_FOG define; patched materials
// scale it by world height so it pools near the ground. Unpatched materials get plain (faint) exp2 fog.
const uniforms = {
  fogFalloff: { value: FOG.falloff }, fogHigh: { value: FOG.high }, fogGround: { value: FOG.ground }, fogStart: { value: 0 },
  cutCenter: { value: new THREE.Vector2(-1e4, -1e4) }, cutRadius: { value: 0 }, cutDepth: { value: 0 }, cutMinY: { value: CUTAWAY.minY },
  cutMode: { value: 0 }, roofSeg: { value: new THREE.Vector4() }, roofRay: { value: new THREE.Vector2() }, roofP: { value: new THREE.Vector4() },
};

const VERT = /* glsl */`
#ifdef USE_FOG
  vec4 fogWP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    fogWP = instanceMatrix * fogWP;
  #endif
  vec4 fogW = modelMatrix * fogWP;
  vFogWorldY = fogW.y; vFogWorldXZ = fogW.xz;
  vFogDepth = - mvPosition.z;
#endif`;

const FRAG = /* glsl */`
#ifdef USE_FOG
  #ifndef NO_CUT
  if (cutMode > 0.5) { // roof mode: above Juno on screen a slot along the camera-to-player line loses everything above the sight line (and above the floor height); below her it blends into the lower half of the old circle, which cuts deeper
    vec2 a = roofSeg.xy, ab = roofSeg.zw - a;
    float rt = clamp(dot(vFogWorldXZ - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float rd = length(vFogWorldXZ - (a + ab * rt)) / roofP.x;
    float cd = length(gl_FragCoord.xy - cutCenter) / cutRadius;
    float lowerT = smoothstep(0.0, 1.0, clamp((cutCenter.y - gl_FragCoord.y) / (cutRadius * 0.7) + 0.5, 0.0, 1.0));   // 0 above Juno's middle, 1 well below it
    float slotCov = (rt < roofP.w ? 1.0 : 0.0) * clamp(1.0 - (rd - 0.7) / 0.3, 0.0, 1.0);
    float circCov = (vFogDepth < cutDepth ? 1.0 : 0.0) * clamp(1.0 - (cd - 0.7) / 0.3, 0.0, 1.0);
    float cutY = mix(max(roofP.y, mix(roofRay.x, roofRay.y, rt) - roofP.z), cutMinY, lowerT);   // one height that slides from the roof cut down to the circle's, so there is no step between the two
    const float bayer2[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
    ivec2 bq = ivec2(mod(gl_FragCoord.xy, 4.0));
    if (vFogWorldY > cutY && mix(slotCov, circCov, lowerT) > (bayer2[bq.y * 4 + bq.x] + 0.5) / 16.0) discard;
  } else {
    float cutD = length(gl_FragCoord.xy - cutCenter) / cutRadius;
    if (cutD < 1.0 && vFogDepth < cutDepth && vFogWorldY > cutMinY) {
      const float bayer[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
      ivec2 bp = ivec2(mod(gl_FragCoord.xy, 4.0));
      float edgeT = (cutD - (1.0 - ${CUTAWAY.edge.toFixed(2)})) / ${CUTAWAY.edge.toFixed(2)};
      if (edgeT < (bayer[bp.y * 4 + bp.x] + 0.5) / 16.0) discard;
    }
  }
  #endif
  float fogH = exp(-max(vFogWorldY, 0.0) * fogFalloff);
  float fogFactor = (1.0 - exp(-fogDensity * max(vFogDepth - fogStart, 0.0))) * mix(fogHigh, 1.0, fogH) + fogGround * fogH;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, clamp(fogFactor, 0.0, 1.0));
#endif`;

function onBeforeCompile(this: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms) { // material.userData.noCut = a sign or prop the see-through circle must never remove
  Object.assign(shader.uniforms, uniforms);
  if (this.userData.noCut) shader.fragmentShader = '#define NO_CUT\n' + shader.fragmentShader;
  shader.vertexShader = shader.vertexShader
    .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\nvarying float vFogWorldY;\nvarying vec2 vFogWorldXZ;')
    .replace('#include <fog_vertex>', VERT);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nvarying float vFogWorldY;\nvarying vec2 vFogWorldXZ;\nuniform float cutMinY, fogFalloff, fogHigh, fogGround, fogStart, cutRadius, cutDepth, cutMode;\nuniform vec2 cutCenter, roofRay;\nuniform vec4 roofSeg, roofP;')
    .replace('#include <fog_fragment>', FRAG);
}

const v = new THREE.Vector3();

export type HeightFog = ReturnType<typeof createHeightFog>;

export function createHeightFog(scene: THREE.Scene) {
  scene.fog = new THREE.FogExp2(FOG.color, FOG.density);
  const done = new WeakSet();
  return {
    uniforms,
    // Distance fog starts just in front of what the camera looks at, so zoom does not change the haze much.
    update(camera: THREE.Camera, focus: THREE.Vector3) { uniforms.fogStart.value = camera.position.distanceTo(focus) - FOG.startOffset; },
    // Centres the cutaway on the player. bufferW/H: drawing-buffer pixels (gl_FragCoord space).
    cutaway(camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3, bufferW: number, bufferH: number) {
      camera.updateMatrixWorld(); // the camera moved this frame; the renderer would only refresh its matrix after this runs, which left the circle a frame behind (off-centre while moving)
      v.copy(playerPos).setY(playerPos.y + 1).applyMatrix4(camera.matrixWorldInverse);
      const depth = -v.z;
      uniforms.cutDepth.value = depth - CUTAWAY.margin;
      uniforms.cutMinY.value = CUTAWAY.minY; // main.js changes it per area (indoors tables and counters stay solid)
      uniforms.cutRadius.value = (CUTAWAY.radius / (2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * bufferH;
      uniforms.cutMode.value = CUTAWAY.mode === 'roof' ? 1 : 0;
      uniforms.roofSeg.value.set(camera.position.x, camera.position.z, playerPos.x, playerPos.z);
      uniforms.roofRay.value.set(camera.position.y, playerPos.y + 0.3);
      uniforms.roofP.value.set(CUTAWAY.roofReach, Math.max(CUTAWAY.minY, CUTAWAY.roofFloor), CUTAWAY.roofClear, 0.97);
      v.copy(playerPos).setY(playerPos.y + 1).project(camera);
      uniforms.cutCenter.value.set((v.x + 1) / 2 * bufferW, (v.y + 1) / 2 * bufferH);
    },
    // Patches every fogged material under root (call once per built group).
    patch(root: THREE.Object3D) {
      root.traverse((obj) => {
        const o = obj as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
        if (!o.isMesh || !(o.material as THREE.MeshBasicMaterial).fog || done.has(o.material)) return;
        done.add(o.material);
        o.material.onBeforeCompile = onBeforeCompile;
        const noCut = !!o.material.userData.noCut;
        o.material.customProgramCacheKey = () => (noCut ? 'heightFogNoCut' : 'heightFog');
      });
    },
  };
}
