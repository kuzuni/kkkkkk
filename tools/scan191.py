"""작업 191 — 유물 슬롯 안 «아이콘 잉크» 중심을 슬롯 중심과 비교한다.

캡처는 격자 클립 1장(cap191.js)이고, 슬롯 rect 는 같이 나온 JSON 을 쓴다.
잉크 마스크는 «슬롯 배경 radial 그라디언트가 아닌 것» 이라 색으로는 못 가른다 →
슬롯 내부에서 **행/열별 국소 대비**로 잡는다: 슬롯 안쪽(테두리 6px 제외) 영역에서
각 화소의 휘도가 «그 화소가 속한 열의 배경 추정치»(슬롯 상단 12행 = 아이콘이 없는 띠)와
Δ 이상 다르면 잉크로 센다. 이모지는 채도가 높아 채도 마스크도 같이 낸다(둘 다 찍는다).

⚠ 자가 두 개인 이유는 LESSONS «마스크가 다르면 다른 것을 잰다» 다 — 부호가 갈리면 믿지 않는다.

실행: python3 tools/scan191.py docs/review/191-r1.png [--d 26]
"""
import sys, json, zlib, struct, os

def read_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not png'
    i = 8; w = h = bd = ct = None; idat = b''
    while i < len(d):
        ln = struct.unpack('>I', d[i:i+4])[0]; typ = d[i+4:i+8]; body = d[i+8:i+8+ln]
        if typ == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', body[:10])
        elif typ == b'IDAT':
            idat += body
        elif typ == b'IEND':
            break
        i += 12 + ln
    assert bd == 8 and ct in (2, 6), f'unsupported png bd={bd} ct={ct}'
    ch = 3 if ct == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(w * h * ch); prev = bytearray(stride); pos = 0
    for y in range(h):
        f = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos+stride]); pos += stride
        if f == 1:
            for x in range(ch, stride): line[x] = (line[x] + line[x-ch]) & 255
        elif f == 2:
            for x in range(stride): line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x-ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x-ch] if x >= ch else 0
                b = prev[x]; c = prev[x-ch] if x >= ch else 0
                p = a + b - c; pa = abs(p-a); pb = abs(p-b); pc = abs(p-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out[y*stride:(y+1)*stride] = line; prev = line
    return w, h, ch, bytes(out)


def main():
    png = sys.argv[1]
    D = 26
    if '--d' in sys.argv: D = int(sys.argv[sys.argv.index('--d') + 1])
    meta = json.load(open(os.path.splitext(png)[0] + '.json'))
    w, h, ch, px = read_png(png)
    oy = meta['clip']['y']

    def rgb(x, y):
        o = (y * w + x) * ch
        return px[o], px[o+1], px[o+2]

    print(f'# {os.path.basename(png)} {w}x{h} · 배경Δ임계 {D}')
    print('id   ch   slotCx  inkCx  Δink   inkW  | satCx  Δsat  satW')
    tot = []
    for s in meta['slots']:
        L, T, W, H = s['rect']
        L = int(round(L)); T = int(round(T)) - oy; W = int(round(W)); H = int(round(H))
        x0, x1 = L + 7, L + W - 7          # 테두리 4 + inset 2 + 여유 1
        y0, y1 = T + 7, T + H - 7
        # 배경 추정: 슬롯 안쪽 상단 10행의 열별 중앙값(아이콘 잉크가 거의 안 닿는 띠)
        bg = {}
        for x in range(x0, x1):
            vs = sorted((rgb(x, y)[0]*299 + rgb(x, y)[1]*587 + rgb(x, y)[2]*114)//1000 for y in range(y0, y0+10))
            bg[x] = vs[len(vs)//2]
        ink = []; sat = []
        for y in range(y0, y1):
            for x in range(x0, x1):
                r, g, b = rgb(x, y)
                lum = (r*299 + g*587 + b*114)//1000
                if abs(lum - bg[x]) >= D: ink.append(x)
                mx, mn = max(r, g, b), min(r, g, b)
                if mx >= 60 and (mx - mn) >= 70: sat.append(x)
        scx = L + W / 2

        def rep(v):
            if not v: return (float('nan'), 0)
            return ((min(v) + max(v)) / 2 + .5, max(v) - min(v) + 1)
        icx, iw = rep(ink); acx, aw = rep(sat)
        tot.append((icx - scx, acx - scx))
        print(f"{s['id']} {s['ch']:<4} {scx:7.1f} {icx:6.1f} {icx-scx:6.2f} {iw:5d}  | {acx:6.1f} {acx-scx:6.2f} {aw:5d}")
    n = len(tot)
    print(f"\n평균 Δink {sum(t[0] for t in tot)/n:+.2f}px · 평균 Δsat {sum(t[1] for t in tot)/n:+.2f}px "
          f"· 부호 일치 {sum(1 for t in tot if t[0] > 0)}/{n} · {sum(1 for t in tot if t[1] > 0)}/{n}")


main()
