# 16 유물 세부 팝업 — ref/캡처를 같은 창·같은 임계값으로 스캔한다 (LESSONS 36-④).
#   python3 tools/scan16.py col <이미지> <x> [y0 y1]   → 그 열의 어두운 런(구간) 목록
#   python3 tools/scan16.py row <이미지> <y> [x0 x1]   → 그 행의 어두운 런 목록
#   python3 tools/scan16.py box <이미지> x0 y0 x1 y1   → 그 창 안 «어두운 픽셀» bbox + 채움률
#   python3 tools/scan16.py ink <이미지> x0 y0 x1 y1   → 밝은(흰 코어) 픽셀 bbox + 픽셀비
# 좌표는 이미지 원좌표. ref(1080x2340) ↔ cap(1080x2280) 대응은 «cap_y = ref_y − 84».
import sys
from pydep937 import Image

def lum(p): return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]

def runs(vals, thr, minlen=2):
    out, s = [], None
    for i, v in enumerate(vals):
        if v < thr and s is None: s = i
        elif v >= thr and s is not None:
            if i - s >= minlen: out.append((s, i - 1, i - s))
            s = None
    if s is not None and len(vals) - s >= minlen: out.append((s, len(vals) - 1, len(vals) - s))
    return out

def main():
    mode, path = sys.argv[1], sys.argv[2]
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    if mode == 'col':
        x = int(sys.argv[3]); y0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
        y1 = int(sys.argv[5]) if len(sys.argv) > 5 else H - 1
        vals = [lum(px[x, y]) for y in range(y0, y1 + 1)]
        print(path, W, 'x', H, 'col', x)
        for a, b, n in runs(vals, 60): print('  dark y%d..%d (h%d)' % (a + y0, b + y0, n))
    elif mode == 'row':
        y = int(sys.argv[3]); x0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
        x1 = int(sys.argv[5]) if len(sys.argv) > 5 else W - 1
        vals = [lum(px[x, y]) for x in range(x0, x1 + 1)]
        print(path, W, 'x', H, 'row', y)
        for a, b, n in runs(vals, 60): print('  dark x%d..%d (w%d)' % (a + x0, b + x0, n))
    elif mode in ('box', 'ink'):
        x0, y0, x1, y1 = map(int, sys.argv[3:7])
        want_dark = mode == 'box'
        xs, ys, cnt = [], [], 0
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                p = px[x, y]; L = lum(p)
                sat = max(p) - min(p)
                hit = (L < 60) if want_dark else (L > 225 and sat < 20)
                if hit: xs.append(x); ys.append(y); cnt += 1
        area = (x1 - x0 + 1) * (y1 - y0 + 1)
        if not xs: print('none in window'); return
        print('%s %s bbox x%d..%d (w%d) y%d..%d (h%d) 픽셀비 %.1f%%' %
              (path, mode, min(xs), max(xs), max(xs) - min(xs) + 1,
               min(ys), max(ys), max(ys) - min(ys) + 1, 100.0 * cnt / area))

main()
