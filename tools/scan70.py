#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan70.py — 70 출석보상 팝업 레퍼런스 픽셀 스캐너
레퍼런스: docs/ref/70-출석보상-팝업.jpg (1080x2340)
프레임 변환: frame y = ref y - 84  (가로 1:1)

사용법 (repo 루트에서):
  python3 tools/scan70.py row  <y> <x0> <x1> [th]     # 행 단면: x 방향 색전이 구간
  python3 tools/scan70.py col  <x> <y0> <y1> [th]     # 열 단면: y 방향 색전이 구간
  python3 tools/scan70.py rect <x0> <y0> <x1> <y1> [n]# 면적 히스토그램 상위 n색 (무늬/틴트 판정용)
  python3 tools/scan70.py rowmean <x0> <x1> <y0> <y1> # 행 평균밝기 프로파일 (변화점만)
  python3 tools/scan70.py colmean <y0> <y1> <x0> <x1> # 열 평균밝기 프로파일 (변화점만)
  python3 tools/scan70.py ink  <x0> <y0> <x1> <y1> <mode> [th]
        # 잉크 bbox. mode=dark(어두운 글자) | light(밝은 글자) | notbg(배경색과 다른 것)
  python3 tools/scan70.py maskbox <x0> <y0> <x1> <y1> <R> <G> <B> [tol]
        # 특정 색과 tol 이내인 픽셀의 bbox + 개수 (✔ 마크·왕관 등)
  python3 tools/scan70.py radius <x0> <y0> <x1> <y1> <corner>
        # 코너 반경 역산. corner=tl|tr|bl|br
  python3 tools/scan70.py px <x> <y>                  # 단일 픽셀
  python3 tools/scan70.py bright <x0> <y0> <x1> <y1>  # 영역 평균 RGB/휘도 (딤·수령완료 밝기비용)
  python3 tools/scan70.py edges <y> <x0> <x1> [th]    # 행 단면 중 «급격한» 경계 x 만 나열
"""
import sys, math, signal
from collections import Counter
from pydep937 import Image

# `| head` 로 잘라 볼 때 BrokenPipe 트레이스백이 뜨지 않게
try: signal.signal(signal.SIGPIPE, signal.SIG_DFL)
except (AttributeError, ValueError): pass

IMG = 'docs/ref/70-출석보상-팝업.jpg'
im = Image.open(IMG).convert('RGB')
W, H = im.size
px = im.load()

def hx(c): return '#%02X%02X%02X' % (c[0], c[1], c[2])
def lum(c): return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
def d(a, b): return max(abs(a[i]-b[i]) for i in range(3))

def seg_print(segs):
    for a, b, c in segs:
        print(f"{a}..{b} ({b-a+1}) {hx(c)}")

m = sys.argv[1]
A = sys.argv[2:]

if m == 'row':
    y, x0, x1 = int(A[0]), int(A[1]), int(A[2])
    th = int(A[3]) if len(A) > 3 else 18
    segs = []; s = x0; prev = px[x0, y]
    for x in range(x0+1, x1+1):
        c = px[x, y]
        if d(c, prev) > th:
            segs.append((s, x-1, prev)); s = x
        prev = c
    segs.append((s, x1, prev)); seg_print(segs)

elif m == 'col':
    x, y0, y1 = int(A[0]), int(A[1]), int(A[2])
    th = int(A[3]) if len(A) > 3 else 18
    segs = []; s = y0; prev = px[x, y0]
    for y in range(y0+1, y1+1):
        c = px[x, y]
        if d(c, prev) > th:
            segs.append((s, y-1, prev)); s = y
        prev = c
    segs.append((s, y1, prev)); seg_print(segs)

elif m == 'rect':
    x0, y0, x1, y1 = map(int, A[:4])
    n = int(A[4]) if len(A) > 4 else 12
    cnt = Counter()
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            c = px[x, y]; cnt[(c[0]//8*8, c[1]//8*8, c[2]//8*8)] += 1
    t = sum(cnt.values())
    for c, k in cnt.most_common(n):
        print(f"{hx(c)} {k*100/t:5.1f}%  ({k})")

elif m == 'rowmean':
    x0, x1, y0, y1 = map(int, A[:4])
    prev = None
    for y in range(y0, y1+1):
        s = sum(lum(px[x, y]) for x in range(x0, x1+1))/(x1-x0+1)
        if prev is None or abs(s-prev) > 5:
            print(f"y{y} {s:6.1f}"); prev = s

elif m == 'colmean':
    y0, y1, x0, x1 = map(int, A[:4])
    prev = None
    for x in range(x0, x1+1):
        s = sum(lum(px[x, y]) for y in range(y0, y1+1))/(y1-y0+1)
        if prev is None or abs(s-prev) > 5:
            print(f"x{x} {s:6.1f}"); prev = s

elif m == 'ink':
    x0, y0, x1, y1 = map(int, A[:4])
    mode = A[4] if len(A) > 4 else 'dark'
    th = int(A[5]) if len(A) > 5 else 110
    if mode == 'notbg':
        bg = Counter()
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                bg[px[x, y]] += 1
        base = bg.most_common(1)[0][0]
        test = lambda c: d(c, base) > th
        print(f"bg={hx(base)}")
    elif mode == 'dark':
        test = lambda c: lum(c) < th
    else:
        test = lambda c: lum(c) > th
    bx0 = by0 = 10**9; bx1 = by1 = -1; n = 0
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            if test(px[x, y]):
                n += 1
                bx0 = min(bx0, x); bx1 = max(bx1, x)
                by0 = min(by0, y); by1 = max(by1, y)
    if bx1 < 0: print("no ink"); sys.exit()
    print(f"ink bbox x {bx0}..{bx1} ({bx1-bx0+1}) · y {by0}..{by1} ({by1-by0+1})"
          f" · cx {(bx0+bx1)/2} cy {(by0+by1)/2} · px {n}")

elif m == 'maskbox':
    x0, y0, x1, y1, R, G, B = map(int, A[:7])
    tol = int(A[7]) if len(A) > 7 else 60
    tgt = (R, G, B)
    bx0 = by0 = 10**9; bx1 = by1 = -1; n = 0
    rows = {}
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            if d(px[x, y], tgt) <= tol:
                n += 1; rows[y] = rows.get(y, 0)+1
                bx0 = min(bx0, x); bx1 = max(bx1, x)
                by0 = min(by0, y); by1 = max(by1, y)
    if bx1 < 0: print("no match"); sys.exit()
    print(f"mask bbox x {bx0}..{bx1} ({bx1-bx0+1}) · y {by0}..{by1} ({by1-by0+1})"
          f" · cx {(bx0+bx1)/2} cy {(by0+by1)/2} · px {n}")

elif m == 'radius':
    # 코너 근처에서 «채움색과 같은» 첫 픽셀의 x 를 y 별로 뽑아 원 반경 역산
    x0, y0, x1, y1 = map(int, A[:4])
    corner = A[4]
    fill = px[(x0+x1)//2, (y0+y1)//2]
    pts = []
    if corner in ('tl', 'bl'):
        ys = range(y0, y0+60) if corner == 'tl' else range(y1, y1-60, -1)
        for y in ys:
            for x in range(x0, x0+80):
                if d(px[x, y], fill) < 40:
                    pts.append((x-x0, abs(y-(y0 if corner == 'tl' else y1)))); break
    else:
        ys = range(y0, y0+60) if corner == 'tr' else range(y1, y1-60, -1)
        for y in ys:
            for x in range(x1, x1-80, -1):
                if d(px[x, y], fill) < 40:
                    pts.append((x1-x, abs(y-(y0 if corner == 'tr' else y1)))); break
    print("fill", hx(fill))
    for dx, dy in pts[:40]:
        print(f"  d={dy:3d} inset={dx}")
    cand = [dy for dx, dy in pts if dx <= 1]
    if cand: print("r ≈", min(cand))

elif m == 'px':
    x, y = int(A[0]), int(A[1]); print(hx(px[x, y]), px[x, y])

elif m == 'bright':
    x0, y0, x1, y1 = map(int, A[:4])
    n = 0; r = g = b = 0.0; L = 0.0
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            c = px[x, y]; r += c[0]; g += c[1]; b += c[2]; L += lum(c); n += 1
    print(f"mean rgb ({r/n:.1f},{g/n:.1f},{b/n:.1f}) = {hx((int(r/n),int(g/n),int(b/n)))} · lum {L/n:.2f}")

elif m == 'edges':
    y, x0, x1 = int(A[0]), int(A[1]), int(A[2])
    th = int(A[3]) if len(A) > 3 else 40
    for x in range(x0+1, x1+1):
        if d(px[x, y], px[x-1, y]) > th:
            print(f"x{x}  {hx(px[x-1,y])} -> {hx(px[x,y])}")

else:
    print(__doc__)
