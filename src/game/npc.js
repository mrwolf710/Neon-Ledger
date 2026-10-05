import * as THREE from 'three';
import { SPRITES, DIRS } from '../gen/sprites.js';
import { CAST, groundY } from '../world/district.js';

export const NPC = {
  brightness: 0.85,   // overall sprite brightness (sprites are unlit)
  tint: 0.35,         // how much nearby light colours the whole sprite
  rim: 0.6,           // how strongly it colours the silhouette edge on the side facing the light
  lightRange: 10,     // units; lights further away give no tint (falloff is (1 - d/range)^2)
  maxLight: 1.0,      // clamp on the summed light colour
  maxLum: 0.6,        // brightness cap per pixel, under POST.bloom.threshold so faces don't bloom into blobs
  rimMax: 0.55,       // most an edge texel can shift toward the light colour (keeps edges under the bloom threshold)
  shadow: { color: 0x000000, opacity: 0.55, size: 1.1, catSize: 0.7, texPx: 16 },
};

const PX = 16; // texture pixels per world unit

// Sprite shader: one frame of the sheet, alpha-tested, darkened to sit in the night scene, tinted by the
// summed nearby lights and rim-lit on edge texels on the side the light comes from (lightSide -1 left .. +1 right).
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */`
  uniform sampler2D map; uniform vec4 frame; uniform vec2 texel;
  uniform vec3 lightColor; uniform float brightness, tint, rim, rimMax, maxLum, lightSide;
  varying vec2 vUv;
  void main() {
    vec2 uv = frame.xy + vUv * frame.zw;
    vec4 c = texture2D(map, uv);
    if (c.a < 0.5) discard;
    float eL = 1.0 - texture2D(map, uv - vec2(texel.x, 0.0)).a;
    float eR = 1.0 - texture2D(map, uv + vec2(texel.x, 0.0)).a;
    float eT = 1.0 - texture2D(map, uv + vec2(0.0, texel.y)).a;
    float edge = max(eT * 0.5, mix(eL, eR, lightSide * 0.5 + 0.5) * (0.4 + 0.6 * abs(lightSide)));
    vec3 col = c.rgb * brightness + c.rgb * lightColor * tint;
    col = mix(col, lightColor, clamp(edge * rim * length(lightColor), 0.0, rimMax));
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (lum > maxLum) col *= maxLum / lum;
    gl_FragColor = vec4(col, 1.0);
  }`;

let shadowMat = null;
function shadowMaterial() {
  if (shadowMat) return shadowMat;
  const n = NPC.shadow.texPx, cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const ctx = cv.getContext('2d'), img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const o = (y * n + x) * 4;
      img.data[o + 3] = d < 0.6 ? 255 : d < 1 ? 128 : 0; // two pixel-art rings: core and soft edge
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  shadowMat = new THREE.MeshBasicMaterial({
    color: NPC.shadow.color, map, transparent: true, opacity: NPC.shadow.opacity, depthWrite: false, fog: false,
  });
  return shadowMat;
}

// One character: sheet from getSheets(), opts { x, z, facing, pose, path, speed }.
export function createBillboard(sheet, opts) {
  const fw = sheet.frameW, fh = sheet.frameH, W = sheet.canvas.width, H = sheet.canvas.height;
  const isCat = fw === SPRITES.cat.w;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: sheet.texture }, frame: { value: new THREE.Vector4(0, 0, fw / W, fh / H) },
      texel: { value: new THREE.Vector2(1 / W, 1 / H) }, lightColor: { value: new THREE.Color(0, 0, 0) },
      brightness: { value: NPC.brightness }, tint: { value: NPC.tint }, rim: { value: NPC.rim }, rimMax: { value: NPC.rimMax }, maxLum: { value: NPC.maxLum }, lightSide: { value: 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG,
  });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(fw / PX, fh / PX).translate(0, fh / PX / 2, 0), mat);
  const s = (isCat ? NPC.shadow.catSize : NPC.shadow.size);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.5).rotateX(-Math.PI / 2), shadowMaterial());
  shadow.position.y = 0.02;
  shadow.renderOrder = 1;
  const root = new THREE.Group();
  root.add(sprite, shadow);

  const pos = new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 0);
  let facing = opts.facing ?? 0, time = 0, leg = 0;
  const pose = opts.pose ?? 'idle';
  const path = opts.path, speed = opts.speed ?? 2;
  if (path) pos.set(path[0][0], 0, path[0][1]);

  function setFrame(row, col) {
    mat.uniforms.frame.value.set((col * fw) / W, 1 - ((row + 1) * fh) / H, fw / W, fh / H);
  }

  return {
    root,
    get position() { return pos; },
    // camYaw: camera yaw (radians); lights: registered lights [{ color, intensity, base, position }].
    update(dt, camYaw, lights) {
      time += dt;
      let anim = pose;
      if (path) { // walk the loop
        const [tx, tz] = path[(leg + 1) % path.length];
        const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz), step = speed * dt;
        if (d <= step) { pos.set(tx, 0, tz); leg = (leg + 1) % path.length; } else { pos.x += (dx / d) * step; pos.z += (dz / d) * step; }
        facing = Math.atan2(dx, dz);
        anim = 'walk';
      }
      pos.y = groundY(pos.z);
      root.position.copy(pos);
      sprite.rotation.y = camYaw; // Y-axis billboard: stays upright

      // Direction row: facing relative to the camera. 0 = toward the camera (down), +90 deg = screen right.
      if (sheet.rows[anim] !== undefined && !sheet.anims[anim]) setFrame(sheet.rows[anim], 0); // single-frame pose
      else {
        const rel = THREE.MathUtils.euclideanModulo(facing - camYaw + Math.PI / 4, Math.PI * 2);
        const dir = ['down', 'right', 'up', 'left'][Math.floor(rel / (Math.PI / 2))];
        const A = sheet.anims[anim] ?? sheet.anims.idle;
        const fps = SPRITES.fps[anim] ?? SPRITES.fps.idle;
        setFrame(sheet.rows[dir], A.start + (Math.floor(time * fps) % A.frames));
      }

      // Nearby lights (summed, squared falloff) tint the sprite; their screen-side picks which edge glows.
      const lc = mat.uniforms.lightColor.value.setRGB(0, 0, 0);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw); // camera right on the ground
      let side = 0, wsum = 0;
      for (const l of lights) {
        const d = l.position.distanceTo(pos);
        if (d >= NPC.lightRange || !l.base) continue;
        const w = (1 - d / NPC.lightRange) ** 2 * (l.intensity / l.base);
        lc.r += ((l.color >> 16) & 255) / 255 * w; lc.g += ((l.color >> 8) & 255) / 255 * w; lc.b += (l.color & 255) / 255 * w;
        side += w * ((l.position.x - pos.x) * rx + (l.position.z - pos.z) * rz) / Math.max(d, 0.001);
        wsum += w;
      }
      const m = Math.max(lc.r, lc.g, lc.b);
      if (m > NPC.maxLight) lc.multiplyScalar(NPC.maxLight / m);
      mat.uniforms.lightSide.value = wsum > 0 ? THREE.MathUtils.clamp(side / wsum, -1, 1) : 0;
    },
  };
}

// Places CAST in the scene. spots: district userData.spots. Returns { list, update(dt, camYaw, lights) }.
export function createCast(scene, sheets, spots) {
  const list = CAST.map((c) => {
    let x, z, facing = c.facing ?? 0;
    if (typeof c.at === 'string') {
      const s = spots.find((p) => p.name === c.at);
      [x, z] = s ? [s.x, s.z] : c.fallback;
      if (s) facing = s.facing;
    } else if (c.at) [x, z] = c.at;
    const b = createBillboard(sheets[c.id], { x, z, facing, pose: c.pose, path: c.path, speed: c.speed });
    scene.add(b.root);
    return b;
  });
  return { list, update: (dt, camYaw, lights) => list.forEach((b) => b.update(dt, camYaw, lights)) };
}
