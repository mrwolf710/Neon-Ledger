// node scripts/pngbox.mjs file.png — prints size, colour type, opaque bbox and the transparent/white hole around the centre.
import fs from 'fs'; import z from 'zlib';
const b = fs.readFileSync(process.argv[2]); let o = 8, w, h, ct, idat = [];
while (o < b.length) { const l = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8); if (t === 'IHDR') { w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12); ct = b[o + 17]; } if (t === 'IDAT') idat.push(b.slice(o + 8, o + 8 + l)); o += 12 + l; }
const raw = z.inflateSync(Buffer.concat(idat)), bpp = ct === 6 ? 4 : 3, st = w * bpp, px = Buffer.alloc(h * st);
for (let y = 0; y < h; y++) { const ft = raw[y * (st + 1)]; for (let x = 0; x < st; x++) { const v = raw[y * (st + 1) + 1 + x], a = x >= bpp ? px[y * st + x - bpp] : 0, u = y ? px[(y - 1) * st + x] : 0, c = (x >= bpp && y) ? px[(y - 1) * st + x - bpp] : 0; let r = v; if (ft === 1) r += a; else if (ft === 2) r += u; else if (ft === 3) r += (a + u) >> 1; else if (ft === 4) { const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c); r += (pa <= pb && pa <= pc) ? a : pb <= pc ? u : c; } px[y * st + x] = r & 255; } }
const at = (x, y) => px.slice(y * st + x * bpp, y * st + x * bpp + bpp);
let x0 = w, x1 = -1, y0 = h, y1 = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (bpp === 4 && px[y * st + x * 4 + 3] > 20) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
console.log({ w, h, ct, opaque: [x0, y0, x1, y1], corner: [...at(2, 2)], center: [...at(w / 2, h / 2)] });
// hole: pixels around the centre that are transparent or near white
const hole = (x, y) => { const p = at(x, y); return bpp === 4 && (p[3] < 20 || (p[0] > 235 && p[1] > 235 && p[2] > 235)); };
let hx0 = w / 2, hx1 = w / 2, hy0 = h / 2, hy1 = h / 2;
while (hole(hx0 - 1, h / 2)) hx0--; while (hole(hx1 + 1, h / 2)) hx1++; while (hole(w / 2, hy0 - 1)) hy0--; while (hole(w / 2, hy1 + 1)) hy1++;
console.log('hole along centre lines', { x: [hx0, hx1], y: [hy0, hy1] });
