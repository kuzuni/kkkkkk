# 작업 152 — 10 상점 «이용권» 탭 타이틀 잉크 계측 (PIL 없이 순수 파이썬 PNG 디코드).
# 실행: python3 tools/scan152.py <png> [y0 y1]
#   타이틀 채움색 #FFF8AA 화소만 골라 잉크 bbox·행 분포를 낸다.
#   «줄 사이 빈 구간» 이 나오면 타이틀이 두 줄로 접힌 것이다(152 의 두 번째 증상).
import sys, struct, zlib


def read_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    i, w, h, idat, bitd, ct = 8, 0, 0, b'', 8, 6
    while i < len(d):
        ln = struct.unpack('>I', d[i:i + 4])[0]
        typ = d[i + 4:i + 8]
        body = d[i + 8:i + 8 + ln]
        if typ == b'IHDR':
            w, h, bitd, ct = struct.unpack('>IIBB', body[:10])
        elif typ == b'IDAT':
            idat += body
        elif typ == b'IEND':
            break
        i += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    stride = w * ch
    out = bytearray(w * h * ch)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        f = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos + stride]); pos += stride
        if f == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x - ch]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                c = prev[x - ch] if x >= ch else 0
                b = prev[x]
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, out


def main():
    png = sys.argv[1]
    y0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    y1 = int(sys.argv[3]) if len(sys.argv) > 3 else 800
    w, h, ch, px = read_png(png)
    y1 = min(y1, h)
    rows, cols = {}, set()
    for y in range(y0, y1):
        base = y * w * ch
        for x in range(w):
            o = base + x * ch
            r, g, b = px[o], px[o + 1], px[o + 2]
            # 타이틀 채움 #FFF8AA (스트로크 검정·배경은 제외)
            if r > 230 and g > 225 and 130 < b < 200:
                rows[y] = rows.get(y, 0) + 1
                cols.add(x)
    if not rows:
        print('%s: 타이틀 잉크 없음 (y%d..%d)' % (png, y0, y1))
        return
    ys, xs = sorted(rows), sorted(cols)
    print('%s' % png)
    print('  잉크 y%d..%d (높이 %d) · x%d..%d (폭 %d) · 중심 x=%.1f (프레임중앙 540 대비 %+.1f)'
          % (ys[0], ys[-1], ys[-1] - ys[0] + 1, xs[0], xs[-1], xs[-1] - xs[0] + 1,
             (xs[0] + xs[-1]) / 2, (xs[0] + xs[-1]) / 2 - 540))
    gaps = [(ys[i], ys[i + 1]) for i in range(len(ys) - 1) if ys[i + 1] - ys[i] > 8]
    print('  줄 사이 빈 구간: %s → %s'
          % (gaps if gaps else '없음', '두 줄 이상으로 접힘' if gaps else '한 줄'))


main()
