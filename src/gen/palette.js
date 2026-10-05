// 32-colour cyberpunk palette. Every generated pixel snaps to one of these.
export const PALETTE = {
  // deep shadows: indigo / teal
  ink: 0x07070f, night: 0x0f1024, indigo: 0x1c1a3d, violet: 0x2e2557,
  deepTeal: 0x0c2a33, teal: 0x14444f, seaGlass: 0x2a6b72,
  // concrete greys (cool to warm)
  grey0: 0x1d1e24, grey1: 0x2c2d35, grey2: 0x3d3e47, grey3: 0x52535c,
  grey4: 0x6b6c74, grey5: 0x8a8a90, grey6: 0xadabab, bone: 0xd6d1c4,
  // rust and brick
  rust0: 0x3a1a16, rust1: 0x5e2a1f, rust2: 0x84402a, rust3: 0xa65d36,
  // sodium / amber
  sodium0: 0x7a3e10, sodium: 0xd9771c, amber: 0xf2a93b, amberLight: 0xffd78a,
  // neon
  magentaDeep: 0x6a1050, magenta: 0xe0217d, pink: 0xff6fb5,
  cyanDeep: 0x0d5c74, cyan: 0x1fd6e8, cyanLight: 0x9ff4ff,
  // accents
  acid: 0xb6f23a, white: 0xf4f1ff,
};

const ENTRIES = Object.values(PALETTE).map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);

// Nearest palette colour (squared RGB distance). Takes and returns 0xRRGGBB.
export function snap(color) {
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < ENTRIES.length; i++) {
    const [er, eg, eb] = ENTRIES[i];
    const d = (r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  const [er, eg, eb] = ENTRIES[best];
  return (er << 16) | (eg << 8) | eb;
}
