"""54 행 원시 덤프 — 지정 행의 x 구간 색을 그대로 찍는다(경계 판정용).
사용: python3 tools/dump54.py <이미지> <off> <y> <x0> <x1> [step]
"""
import sys
from pydep937 import Image

im = Image.open(sys.argv[1]).convert('RGB')
px = im.load()
off = int(sys.argv[2]); y = int(sys.argv[3]) + off
x0, x1 = int(sys.argv[4]), int(sys.argv[5])
step = int(sys.argv[6]) if len(sys.argv) > 6 else 1
for x in range(x0, x1 + 1, step):
    c = px[x, y]
    L = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    print(f"{x}\t{c[0]},{c[1]},{c[2]}\tL{L:.0f}")
