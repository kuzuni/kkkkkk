/* 작업 441 — 순수 Node PNG 디코더 (bd8 · 비인터레이스 · ct 0/2/3/4/6 → RGBA 로 정규화).
 *
 * 왜 브라우저를 안 쓰는가: 이 작업이 묻는 것은 «시트에 찍힌 픽셀» 하나뿐이라
 * 캔버스·합성·DSF 가 낄 자리가 없다. 디코더가 곧 자이므로 결정적이어야 한다.
 * ⚠ `assets/*.png` 는 한 종류가 아니다 — dragon·bird 는 ct6(RGBA) 인데 knight 는 **ct3(팔레트+tRNS)** 다.
 *    ct6 만 받는 디코더로는 전수 스윕이 첫 시트에서 즉사한다(실제로 그랬다).
 */
const fs = require('fs');
const zlib = require('zlib');

function decodePNG(file) {
  const b = fs.readFileSync(file);
  let o = 8, w = 0, h = 0, bd = 0, ct = 0, inter = 0;
  const idat = [];
  let plte = null, trns = null;
  while (o < b.length) {
    const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8);
    if (t === 'IHDR') {
      w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12);
      bd = b[o + 16]; ct = b[o + 17]; inter = b[o + 20];
    } else if (t === 'IDAT') idat.push(b.slice(o + 8, o + 8 + len));
    else if (t === 'PLTE') plte = b.slice(o + 8, o + 8 + len);
    else if (t === 'tRNS') trns = b.slice(o + 8, o + 8 + len);
    o += 12 + len;
  }
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  if (bd !== 8 || inter !== 0 || !CH[ct]) {
    throw new Error(file + ': 지원 밖 PNG (bd=' + bd + ' ct=' + ct + ' interlace=' + inter + ')');
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = CH[ct], stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const row = y * stride, prev = row - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[p + i];
      const a = i >= bpp ? px[row + i - bpp] : 0;
      const bb = y > 0 ? px[prev + i] : 0;
      const c = (y > 0 && i >= bpp) ? px[prev + i - bpp] : 0;
      let v;
      switch (ft) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + bb; break;
        case 3: v = x + ((a + bb) >> 1); break;
        case 4: {
          const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
          v = x + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c));
          break;
        }
        default: throw new Error(file + ': 알 수 없는 필터 ' + ft);
      }
      px[row + i] = v & 255;
    }
    p += stride;
  }
  if (ct === 6) return { w, h, px };

  /* → RGBA 정규화 */
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    const s = i * bpp, d = i * 4;
    let r, g, bl, a = 255;
    if (ct === 0) { r = g = bl = px[s]; }
    else if (ct === 2) { r = px[s]; g = px[s + 1]; bl = px[s + 2]; }
    else if (ct === 4) { r = g = bl = px[s]; a = px[s + 1]; }
    else { /* ct 3 — 팔레트 */
      const idx = px[s];
      r = plte[idx * 3]; g = plte[idx * 3 + 1]; bl = plte[idx * 3 + 2];
      a = (trns && idx < trns.length) ? trns[idx] : 255;
    }
    out[d] = r; out[d + 1] = g; out[d + 2] = bl; out[d + 3] = a;
  }
  return { w, h, px: out };
}

module.exports = { decodePNG };
