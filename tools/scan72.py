#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan72.py — 72 «03 던전 카드 우측 썸네일» 레퍼런스 픽셀 스캐너
레퍼런스: docs/ref/03-던전-팝업.jpg (1080x2340)  ·  프레임 y = ref y - 84 (가로 1:1)

카드 5장의 우측 몬스터 일러스트 bbox 를 «구조(그라디언트) 밀도» 로 잡아낸다.
선버스트 배경은 큰 부채꼴이라 경사가 완만하고, 몬스터 아트는 외곽선·하이라이트로
국소 경사가 급하다 — 그 차이를 열/행 프로파일로 뽑는다.

사용법 (repo 루트에서):
  python3 tools/scan72.py grad <card 1..5> [T] [x0] [x1]   # 열/행 그라디언트 밀도 프로파일
  python3 tools/scan72.py box  <card 1..5> [T] [frac]      # 밀도 프로파일에서 bbox 자동 추출
  python3 tools/scan72.py dark <card 1..5> [L]             # 어두운(외곽선) 픽셀 밀도 bbox
  python3 tools/scan72.py rect <x0> <y0> <x1> <y1> [n]     # 영역 상위 n 색
  python3 tools/scan72.py px   <x> <y>
"""
import sys
from collections import Counter
from pydep937 import Image

IMG = 'docs/ref/03-던전-팝업.jpg'
im = Image.open(IMG).convert('RGB')
W, H = im.size
px = im.load()

# 카드 박스 (측정표 docs/measure/03-던전팝업.md §3-1)
CARD_TOP = [241, 601, 961, 1321, 1681]
CARD_BOT = [590, 950, 1310, 1670, 2030]
CARD_X0, CARD_X1 = 50, 1029          # 바깥(검정 테두리 포함)
IN_X0, IN_X1 = 57, 1022              # 테두리 안쪽
IN_PAD_T, IN_PAD_B = 8, 8


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def card_box(i):
    t = CARD_TOP[i - 1] + IN_PAD_T
    b = CARD_BOT[i - 1] - IN_PAD_B
    return IN_X0, t, IN_X1, b


def gradmap(x0, y0, x1, y1, T):
    """(x,y) -> 1 if 국소 경사(3px 간격)가 T 초과"""
    g = {}
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x + 3 > x1 or y + 3 > y1:
                continue
            a = px[x, y]
            bx = px[x + 3, y]
            by = px[x, y + 3]
            d = max(abs(a[0] - bx[0]) + abs(a[1] - bx[1]) + abs(a[2] - bx[2]),
                    abs(a[0] - by[0]) + abs(a[1] - by[1]) + abs(a[2] - by[2]))
            if d > T:
                g[(x, y)] = 1
    return g


def profiles(g, x0, y0, x1, y1):
    col = [0] * (x1 - x0 + 1)
    row = [0] * (y1 - y0 + 1)
    for (x, y) in g:
        col[x - x0] += 1
        row[y - y0] += 1
    return col, row


def show(name, prof, base, step):
    print(f'-- {name} (base={base}, step={step}) --')
    out = []
    for i in range(0, len(prof), step):
        s = sum(prof[i:i + step])
        out.append(f'{base + i}:{s}')
    print(' '.join(out))


def cmd_grad(argv):
    c = int(argv[0])
    T = int(argv[1]) if len(argv) > 1 else 60
    x0, y0, x1, y1 = card_box(c)
    if len(argv) > 3:
        x0, x1 = int(argv[2]), int(argv[3])
    g = gradmap(x0, y0, x1, y1, T)
    col, row = profiles(g, x0, y0, x1, y1)
    print(f'card{c} box=({x0},{y0})-({x1},{y1}) T={T} total={len(g)}')
    show('col', col, x0, 10)
    show('row', row, y0, 10)


def auto_box(c, T, frac):
    x0, y0, x1, y1 = card_box(c)
    g = gradmap(x0, y0, x1, y1, T)
    col, row = profiles(g, x0, y0, x1, y1)
    cm = max(col) if col else 0
    rm = max(row) if row else 0
    cx = [x0 + i for i, v in enumerate(col) if v >= cm * frac]
    ry = [y0 + i for i, v in enumerate(row) if v >= rm * frac]
    return (min(cx), min(ry), max(cx), max(ry), len(g)) if cx and ry else None


def cmd_box(argv):
    c = int(argv[0])
    T = int(argv[1]) if len(argv) > 1 else 60
    frac = float(argv[2]) if len(argv) > 2 else 0.25
    b = auto_box(c, T, frac)
    if not b:
        print('none')
        return
    x0, y0, x1, y1, n = b
    t = CARD_TOP[c - 1]
    print(f'card{c} T={T} frac={frac} bbox=({x0},{y0})-({x1},{y1}) '
          f'w={x1-x0+1} h={y1-y0+1} rel=({x0-CARD_X0},{y0-t}) n={n}')


def cmd_dark(argv):
    c = int(argv[0])
    L = int(argv[1]) if len(argv) > 1 else 40
    x0, y0, x1, y1 = card_box(c)
    col = [0] * (x1 - x0 + 1)
    row = [0] * (y1 - y0 + 1)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if lum(px[x, y]) < L:
                col[x - x0] += 1
                row[y - y0] += 1
    print(f'card{c} dark L={L} box=({x0},{y0})-({x1},{y1})')
    show('col', col, x0, 10)
    show('row', row, y0, 10)


def cmd_rect(argv):
    x0, y0, x1, y1 = map(int, argv[:4])
    n = int(argv[4]) if len(argv) > 4 else 8
    cnt = Counter()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            cnt[px[x, y]] += 1
    tot = sum(cnt.values())
    for col, k in cnt.most_common(n):
        print(f'#{col[0]:02X}{col[1]:02X}{col[2]:02X} {col} {k} ({100*k/tot:.1f}%)')


def cmd_px(argv):
    x, y = int(argv[0]), int(argv[1])
    c = px[x, y]
    print(f'({x},{y}) #{c[0]:02X}{c[1]:02X}{c[2]:02X} {c} lum={lum(c):.1f}')


CMDS = {'grad': cmd_grad, 'box': cmd_box, 'dark': cmd_dark, 'rect': cmd_rect, 'px': cmd_px}

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        print(__doc__)
        sys.exit(1)
    CMDS[sys.argv[1]](sys.argv[2:])
