"""54 열 프로파일 — 한 열(x)의 색이 바뀌는 y 를 찍는다(밴드 경계 판정용).
사용: python3 tools/col54.py <이미지> <off> <x> <y0> <y1> [th]
"""
import sys
from pydep937 import Image

im = Image.open(sys.argv[1]).convert('RGB')
px = im.load()
off = int(sys.argv[2]); x = int(sys.argv[3])
y0, y1 = int(sys.argv[4]), int(sys.argv[5])
th = int(sys.argv[6]) if len(sys.argv) > 6 else 14

prev = None
start = y0
for fy in range(y0, y1 + 1):
    c = px[x, fy + off]
    if prev is None:
        prev = c; start = fy; continue
    d = abs(c[0] - prev[0]) + abs(c[1] - prev[1]) + abs(c[2] - prev[2])
    if d > th:
        print(f"{start}..{fy-1}\t({prev[0]},{prev[1]},{prev[2]})\th{fy-start}")
        start = fy
    prev = c
print(f"{start}..{y1}\t({prev[0]},{prev[1]},{prev[2]})\th{y1-start+1}")
