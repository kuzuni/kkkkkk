# 53 가방 팝업 — 레퍼런스·캡처를 «같은 코드·같은 임계값» 으로 스캔하는 대조 스캐너.
# LESSONS 36-④ «비평가 수치는 같은 도구로 재현한 뒤에만 반영한다» 를 위한 것.
# scan53.py 는 레퍼런스 경로가 박혀 있어 캡처를 못 읽는다 — 이쪽은 이미지를 인자로 받는다.
#
# 세로 변환은 단일 규칙 «frame y = ref y − 84» (ROUTINE [2]) 이므로
# ref 좌표로 물어보면 캡처는 자동으로 −84 해서 같은 자리를 본다.
#
# 사용:
#   python3 tools/cmp53.py row  <refY> <x0> <x1> [th]     두 이미지의 같은 가로 단면
#   python3 tools/cmp53.py col  <x> <refY0> <refY1> [th]   두 이미지의 같은 세로 단면
#   python3 tools/cmp53.py bbox <x0> <refY0> <x1> <refY1> <hex> <tol>   색 마스크 bbox
#   python3 tools/cmp53.py ink  <x0> <refY0> <x1> <refY1> <minlum>      밝은 잉크 bbox
import sys
from pydep937 import Image

REF = 'docs/ref/53-가방팝업.jpg'
CAP = 'docs/review/53-r3.png'
DY = 84                                    # frame y = ref y - 84

IMGS = [('ref', Image.open(REF).convert('RGB'), 0),
        ('cap', Image.open(sys.argv[-1] if sys.argv[-1].endswith('.png') else CAP).convert('RGB'), DY)]
if sys.argv[-1].endswith('.png'):
    sys.argv = sys.argv[:-1]


def hx(c):
    return '#%02X%02X%02X' % c


def runs(vals, th):
    """색 전이 구간으로 자른다 — scan53.py 와 같은 규칙."""
    segs, s, prev = [], 0, vals[0]
    for i in range(1, len(vals)):
        c = vals[i]
        if max(abs(c[k] - prev[k]) for k in range(3)) > th:
            segs.append((s, i - 1, prev))
            s = i
        prev = c
    segs.append((s, len(vals) - 1, prev))
    return segs


mode = sys.argv[1]

if mode == 'row':
    ry, x0, x1 = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    th = int(sys.argv[5]) if len(sys.argv) > 5 else 18
    for name, im, dy in IMGS:
        px = im.load()
        y = ry - dy
        vals = [px[x, y] for x in range(x0, x1 + 1)]
        print(f"[{name}] y={y} (ref {ry})")
        for a, b, c in runs(vals, th):
            print(f"   {x0+a}..{x0+b} ({b-a+1}) {hx(c)}")

elif mode == 'col':
    x, ry0, ry1 = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    th = int(sys.argv[5]) if len(sys.argv) > 5 else 18
    for name, im, dy in IMGS:
        px = im.load()
        vals = [px[x, y] for y in range(ry0 - dy, ry1 - dy + 1)]
        print(f"[{name}] x={x} y {ry0-dy}..{ry1-dy} (ref {ry0}..{ry1}) — 아래 좌표는 ref 기준")
        for a, b, c in runs(vals, th):
            print(f"   {ry0+a}..{ry0+b} ({b-a+1}) {hx(c)}")

elif mode == 'bbox':
    x0, ry0, x1, ry1 = map(int, sys.argv[2:6])
    tgt = sys.argv[6].lstrip('#')
    tgt = tuple(int(tgt[i:i + 2], 16) for i in (0, 2, 4))
    tol = int(sys.argv[7])
    for name, im, dy in IMGS:
        px = im.load()
        bx0 = by0 = 10 ** 9
        bx1 = by1 = -1
        n = 0
        for y in range(ry0 - dy, ry1 - dy + 1):
            for x in range(x0, x1 + 1):
                c = px[x, y]
                if max(abs(c[k] - tgt[k]) for k in range(3)) <= tol:
                    n += 1
                    bx0 = min(bx0, x); bx1 = max(bx1, x)
                    by0 = min(by0, y); by1 = max(by1, y)
        if bx1 < 0:
            print(f"[{name}] 해당 색 없음")
        else:
            print(f"[{name}] x {bx0}..{bx1} ({bx1-bx0+1}) · refY {by0+dy}..{by1+dy} ({by1-by0+1}) · {n}px")

elif mode == 'ink':
    x0, ry0, x1, ry1 = map(int, sys.argv[2:6])
    ml = int(sys.argv[6])
    for name, im, dy in IMGS:
        px = im.load()
        bx0 = by0 = 10 ** 9
        bx1 = by1 = -1
        n = 0
        for y in range(ry0 - dy, ry1 - dy + 1):
            for x in range(x0, x1 + 1):
                c = px[x, y]
                if min(c) >= ml:
                    n += 1
                    bx0 = min(bx0, x); bx1 = max(bx1, x)
                    by0 = min(by0, y); by1 = max(by1, y)
        if bx1 < 0:
            print(f"[{name}] 잉크 없음")
        else:
            print(f"[{name}] x {bx0}..{bx1} ({bx1-bx0+1}) · refY {by0+dy}..{by1+dy} ({by1-by0+1}) · {n}px")

else:
    print(__doc__ or 'mode: row | col | bbox | ink')
