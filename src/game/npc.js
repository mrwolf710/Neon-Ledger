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


// Sprite shader: one frame of the sheet, alpha-tested, darkened to sit in the night scene, tinted by the
// summed nearby lights (lightColor) and rim-lit by the strongest one (rimColor) on the side it comes from
// (lightSide -1 left .. +1 right). The rim sits just inside the ink outline, which stays dark.
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */`
  uniform sampler2D map; uniform vec4 frame; uniform vec2 texel;
  uniform vec3 lightColor, rimColor; uniform float brightness, tint, rim, rimMax, maxLum, lightSide, ghost, uTime;
  varying vec2 vUv;
  void main() {
    vec2 uv = frame.xy + vUv * frame.zw;
    vec4 c = texture2D(map, uv);
    if (c.a < 0.5) discard;
    bool outline = dot(c.rgb, vec3(1.0)) < 0.06;     // ink outline pixels keep their colour
    float eL = 1.0 - texture2D(map, uv - vec2(texel.x * 2.0, 0.0)).a;
    float eR = 1.0 - texture2D(map, uv + vec2(texel.x * 2.0, 0.0)).a;
    float eT = 1.0 - texture2D(map, uv + vec2(0.0, texel.y * 2.0)).a;
    float edge = max(eT * 0.5, mix(eL, eR, lightSide * 0.5 + 0.5) * (0.4 + 0.6 * abs(lightSide)));
    vec3 col = c.rgb * brightness + c.rgb * lightColor * tint;
    if (!outline) col = mix(col, rimColor, clamp(edge * rim * length(rimColor), 0.0, rimMax));
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (lum > maxLum) col *= maxLum / lum;
    if (ghost > 1.5) { // redacted figure: a faint, flat shape whose scanlines keep dropping out, like someone cut it from the video feed
      float row = floor(vUv.y * 48.0), tick = floor(uTime * 9.0);
      float n = fract(sin(row * 12.9898 + tick * 78.233) * 43758.5453), m = fract(sin(tick * 3.1 + floor(uTime * 0.7) * 17.0) * 9341.7);
      float gap = step(0.78, n) + step(0.93, m) * step(0.5, fract(row * 0.37));
      gl_FragColor = vec4(vec3(0.11, 0.15, 0.2) + 0.12 * n, gap > 0.5 ? 0.0 : 0.16 + 0.1 * n);
      return;
    }
    if (ghost > 0.5) { // echo ghost: cyan hologram
      float gl = dot(col, vec3(0.3, 0.59, 0.11));
      col = mix(col, vec3(0.35, 0.95, 1.1) * (gl + 0.3), 0.8);
    }
    gl_FragColor = vec4(col, ghost > 0.5 ? 0.62 : 1.0);
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

const NAMES8 = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']; // clockwise on screen, from facing the camera

// One character: sheet from getSheets(), opts { x, z, facing, pose, path, speed, ghost }.
export function createBillboard(sheet, opts) {
  const fw = sheet.frameW, fh = sheet.frameH, W = sheet.canvas.width, H = sheet.canvas.height;
  const isCat = fw === SPRITES.cat.w || !!sheet.small;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: sheet.texture }, frame: { value: new THREE.Vector4(0, 0, fw / W, fh / H) },
      texel: { value: new THREE.Vector2(1 / W, 1 / H) }, lightColor: { value: new THREE.Color(0, 0, 0) }, rimColor: { value: new THREE.Color(0, 0, 0) },
      brightness: { value: NPC.brightness }, tint: { value: NPC.tint }, rim: { value: NPC.rim }, rimMax: { value: NPC.rimMax }, maxLum: { value: NPC.maxLum }, lightSide: { value: 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, transparent: !!opts.ghost, depthWrite: !opts.ghost,
  });
  mat.uniforms.ghost = { value: opts.ghost === 2 ? 2 : opts.ghost ? 1 : 0 }; // 2 = redacted figure (see the shader)
  mat.uniforms.uTime = { value: 0 };
  const PX = sheet.pxPerUnit; // texture pixels per world unit (characters are double density)
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(fw / PX, fh / PX).translate(0, (fh / 2 - (sheet.footPx ?? 0)) / PX, 0), mat);
  const s = (isCat ? NPC.shadow.catSize : NPC.shadow.size);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.5).rotateX(-Math.PI / 2), shadowMaterial());
  shadow.position.y = 0.02;
  shadow.renderOrder = 1;
  const root = new THREE.Group();
  shadow.visible = !opts.ghost;
  if (opts.ghost) sprite.renderOrder = 2;
  root.add(sprite, shadow);

  const pos = new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 0);
  let time = 0, leg = 0, lastStep = -1;
  const path = opts.path, speed = opts.speed ?? 2;
  if (path) pos.set(path[0][0], 0, path[0][1]);

  function setFrame(row, col) {
    mat.uniforms.frame.value.set((col * fw) / W, 1 - ((row + 1) * fh) / H, fw / W, fh / H);
  }

  // facing (radians, 0 = +z), anim (idle | walk | pose name) and fpsScale can be driven from outside (player.js).
  const api = {
    root, position: pos, facing: opts.facing ?? 0, anim: opts.pose ?? 'idle', fpsScale: 1, follow: null, // follow: { target, dist, speed }
    // camYaw: camera yaw (radians); lights: registered lights [{ color, intensity, base, position }].
    update(dt, camYaw, lights) {
      time += dt * api.fpsScale;
      mat.uniforms.uTime.value = performance.now() / 1000;
      let { anim, facing } = api;
      if (api.follow) { // trail a target (Miso behind Juno), sitting when close
        const t = api.follow.target.position, dx = t.x - pos.x, dz = t.z - pos.z, d = Math.hypot(dx, dz);
        if (d > api.follow.dist) {
          const step = Math.min(d - api.follow.dist, api.follow.speed * dt);
          pos.x += (dx / d) * step; pos.z += (dz / d) * step;
          facing = api.facing = Math.atan2(dx, dz); anim = api.anim = 'walk';
        } else anim = api.anim = 'idle';
      }
      if (path) { // walk the loop
        const [tx, tz] = path[(leg + 1) % path.length];
        const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz), step = speed * dt;
        if (d <= step) { pos.set(tx, 0, tz); leg = (leg + 1) % path.length; } else { pos.x += (dx / d) * step; pos.z += (dz / d) * step; }
        facing = api.facing = Math.atan2(dx, dz);
        anim = api.anim = 'walk';
      }
      pos.y = groundY(pos.z, pos.x);
      root.position.copy(pos);
      sprite.rotation.y = camYaw; // Y-axis billboard: stays upright

      // Direction: facing relative to the camera. 0 = toward the camera (down / south), +90 deg = screen right (east).
      if (sheet.rows[anim] !== undefined && !sheet.anims[anim]) setFrame(sheet.rows[anim], 0); // single-frame pose
      else {
        const eight = sheet.dirs === 8;
        const rel = THREE.MathUtils.euclideanModulo(facing - camYaw + (eight ? Math.PI / 8 : Math.PI / 4), Math.PI * 2);
        const dir = eight ? NAMES8[Math.floor(rel / (Math.PI / 4))] : ['down', 'right', 'up', 'left'][Math.floor(rel / (Math.PI / 2))];
        const key = sheet.anims[anim] ? anim : 'idle';
        const A = sheet.anims[key];
        const fps = (key === 'idle' && sheet.fps) || (key === 'walk' && sheet.walkFps) || (SPRITES.fps[key] ?? SPRITES.fps.idle);
        const fi = Math.floor(time * fps) % A.frames, stepping = anim === 'walk' || anim === 'sneak';
        setFrame(sheet.animRows?.[key]?.[dir] ?? sheet.rows[dir], A.start + fi);
        if (stepping && fi !== lastStep) { lastStep = fi; if (fi % 2 === 0) api.onStep?.(fi, anim); } // footfall
        else if (!stepping) lastStep = -1;
      }

      // Nearby lights (summed, squared falloff) tint the sprite; the strongest one colours the rim on its side.
      const lc = mat.uniforms.lightColor.value.setRGB(0, 0, 0);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw); // camera right on the ground
      let side = 0, best = null, bestW = 0;
      for (const l of lights) {
        const d = l.position.distanceTo(pos);
        if (d >= NPC.lightRange || !l.base) continue;
        const w = (1 - d / NPC.lightRange) ** 2 * (l.intensity / l.base);
        lc.r += ((l.color >> 16) & 255) / 255 * w; lc.g += ((l.color >> 8) & 255) / 255 * w; lc.b += (l.color & 255) / 255 * w;
        if (w > bestW) { bestW = w; best = l; side = ((l.position.x - pos.x) * rx + (l.position.z - pos.z) * rz) / Math.max(d, 0.001); }
      }
      const m = Math.max(lc.r, lc.g, lc.b);
      if (m > NPC.maxLight) lc.multiplyScalar(NPC.maxLight / m);
      const rc = mat.uniforms.rimColor.value;
      if (best) rc.setHex(best.color).multiplyScalar(Math.min(1, bestW * 2)); else rc.setRGB(0, 0, 0);
      mat.uniforms.lightSide.value = THREE.MathUtils.clamp(side, -1, 1);
    },
  };
  return api;
}

// Places CAST in the scene. areas: { id: { spots } } from the world. Returns { list, byId, update, setArea, setHidden }.
export function createCast(scene, sheets, areas) {
  const list = CAST.map((c) => {
    const spots = areas[c.area ?? 'street']?.spots ?? [];
    let x, z, facing = c.facing ?? 0;
    if (typeof c.at === 'string') {
      const s = spots.find((p) => p.name === c.at);
      if (!s) console.warn('cast: no spot', c.at, 'in', c.area);
      [x, z] = s ? [s.x, s.z] : [0, 0];
      if (s && c.facing === undefined) facing = s.facing;
    } else [x, z] = c.at;
    const b = createBillboard(sheets[c.id], { x, z, facing, pose: c.pose, path: c.path, speed: c.speed, ghost: c.ghost });
    b.id = c.id; b.area = c.area ?? 'street'; b.ambient = !!c.ambient;
    scene.add(b.root);
    return b;
  });
  const byId = Object.fromEntries(list.map((b) => [b.id, b]));
  let areaId = null, hidden = false;
  const apply = () => list.forEach((b) => { b.root.visible = !hidden && !b.away && b.area === areaId; }); // away: held back by the story (Juno before the train arrives)
  return {
    list, byId, apply,
    update: (dt, camYaw, lights) => list.forEach((b) => { if (b.root.visible) b.update(dt, camYaw, lights); }),
    setArea(id) { areaId = id; apply(); },     // only characters of the current area are drawn
    setHidden(h) { hidden = h; apply(); },     // echo mode hides the real people
  };
}
