"""54 bbox — 창(x0,y0,x1,y1) 안에서 «판 배경색과 다른» 화소의 bbox 를 잡는다.
사용: python3 tools/bbox54.py <이미지> <off> <x0> <y0> <x1> <y1> <bgx> <bgy> <tol>
bg 는 (bgx,bgy) 화소색으로 잡는다. off = 이미지 y − 프레임 y.
"""
import sys
from pydep937 import Image

im = Image.open(sys.argv[1]).convert('RGB')
px = im.load()
off = int(sys.argv[2])
x0, y0, x1, y1 = (int(sys.argv[i]) for i in range(3, 7))
bg = px[int(sys.argv[7]), int(sys.argv[8]) + off]
tol = int(sys.argv[9])
ax = bx = ay = by = -1
for y in range(y0, y1 + 1):
    for x in range(x0, x1 + 1):
        c = px[x, y + off]
        if max(abs(c[0] - bg[0]), abs(c[1] - bg[1]), abs(c[2] - bg[2])) > tol:
            if ax < 0 or x < ax: ax = x
            if x > bx: bx = x
            if ay < 0: ay = y
            by = y
print(f"bg={bg} tol={tol}  bbox x {ax}..{bx} (w{bx-ax+1})  y {ay}..{by} (h{by-ay+1})")
