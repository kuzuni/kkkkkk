# .png 두 장 픽셀 대조. 인자: a b [x0 y0 x1 y1] ... (제외 박스 여러 개 가능)
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tools'))
from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»
a = Image.open(sys.argv[1]).convert('RGB').load()
b = Image.open(sys.argv[2]).convert('RGB').load()
W, H = Image.open(sys.argv[1]).size
nums = [int(v) for v in sys.argv[3:]]
boxes = [nums[i:i + 4] for i in range(0, len(nums) - 3, 4)]
n = 0
rows = {}
for y in range(H):
    for x in range(W):
        if any(bx[0] <= x <= bx[2] and bx[1] <= y <= bx[3] for bx in boxes):
            continue
        if a[x, y] != b[x, y]:
            n += 1
            r = rows.setdefault(y // 20 * 20, [0, W, 0])
            r[0] += 1; r[1] = min(r[1], x); r[2] = max(r[2], x)
print(n, 'px diff', ' '.join('y%d-%d:n%d x%d..%d' % (k, k + 19, v[0], v[1], v[2]) for k, v in sorted(rows.items())))
