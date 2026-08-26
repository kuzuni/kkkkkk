# 작업 148 — «글씨 뭉개짐» 화소 계측.
# 실행: python3 tools/scan148.py <png> [x y w h]
# 흰 코어(채움) 화소 / (흰 코어 + 검정 스트로크) 화소 = «카운터 생존율».
# 검정 스트로크가 글자 속을 메울수록 이 값이 떨어진다.
import sys, struct, zlib

def read_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    i, w, h, idat, bitd, ct = 8, 0, 0, b'', 8, 6
    while i < len(d):
        ln = struct.unpack('>I', d[i:i+4])[0]; typ = d[i+4:i+8]; body = d[i+8:i+8+ln]
        if typ == b'IHDR':
            w, h, bitd, ct = struct.unpack('>IIBB', body[:10])
        elif typ == b'IDAT': idat += body
        elif typ == b'IEND': break
        i += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0:1, 2:3, 3:1, 4:2, 6:4}[ct]
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
                p = a + b - c
                pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out[y*stride:(y+1)*stride] = line; prev = line
    return w, h, ch, out

def main():
    path = sys.argv[1]
    w, h, ch, px = read_png(path)
    if len(sys.argv) >= 6:
        x0, y0, cw, cht = map(int, sys.argv[2:6])
    else:
        x0, y0, cw, cht = 0, 0, w, h
    white = black = other = 0
    rows = {}
    for y in range(y0, min(y0+cht, h)):
        rw = rb = 0
        for x in range(x0, min(x0+cw, w)):
            o = (y*w + x)*ch
            r, g, b = px[o], px[o+1], px[o+2]
            if r > 215 and g > 215 and b > 215: white += 1; rw += 1
            elif r < 45 and g < 45 and b < 45: black += 1; rb += 1
            else: other += 1
        if rw or rb: rows[y] = (rw, rb)
    ink = white + black
    print(f'파일 {path}  영역 {x0},{y0} {cw}x{cht}')
    print(f'흰 코어 {white} · 검정 {black} · 잉크합 {ink}')
    if ink: print(f'카운터 생존율(흰/잉크) = {white/ink:.3f}')
    ys = sorted(rows)
    if ys: print(f'잉크 행 {ys[0]}..{ys[-1]} ({ys[-1]-ys[0]+1}px)')

main()
