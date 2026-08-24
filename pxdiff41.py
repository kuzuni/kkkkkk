# .png 두 장 픽셀 대조. 인자: a b [x0 y0 x1 y1 (제외 박스)]
import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert('RGB').load()
b = Image.open(sys.argv[2]).convert('RGB').load()
im = Image.open(sys.argv[1])
W, H = im.size
ex = [int(v) for v in sys.argv[3:7]] if len(sys.argv) >= 7 else None
n = 0
rows = {}
for y in range(H):
    for x in range(W):
        if ex and ex[0] <= x <= ex[2] and ex[1] <= y <= ex[3]:
            continue
        if a[x, y] != b[x, y]:
            n += 1
            r = rows.setdefault(y // 20 * 20, [0, W, 0])
            r[0] += 1; r[1] = min(r[1], x); r[2] = max(r[2], x)
print(n, 'px diff', ' '.join('y%d-%d:n%d x%d..%d' % (k, k + 19, v[0], v[1], v[2]) for k, v in sorted(rows.items())))
