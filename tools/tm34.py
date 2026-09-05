#!/usr/bin/env python3
"""34 축복 팝업 — 카드 타이머 칩(시계 + 숫자) 전용 실측기 (13회차, 2026-08-26).

12회차까지 칩 내용이 `<i>` 하나에 «⏱ 00:01:20» 으로 뭉쳐 있어 시계와 숫자를 따로 못 쟀다.
13회차에 `<b class="ck">⏱</b>` + `<i>숫자</i>` 로 갈랐고, 이 스크립트가 그 둘을 분리 측정한다.

경계 판정: 칩 배경(#926A24) 위의 «잉크» = 아주 어둡거나(외곽선) 아주 밝은(흰 채움) 픽셀.
시계와 숫자는 x 방향 공백으로 나눈다 — 붙어 버리면 `--split <x>` 로 경계를 직접 준다.

사용: python3 tools/tm34.py [--cap <png>] [--split <x>]
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/34-축복-버프팝업.jpg'
CAP = 'docs/review/34-r14.png'
SPLIT = None
a = sys.argv[1:]
while a:
    if a[0] == '--cap': CAP = a[1]; a = a[2:]
    elif a[0] == '--split': SPLIT = int(a[1]); a = a[2:]
    else: raise SystemExit(__doc__)

# 카드 1(공격력) 타이머 칩 — 프레임 좌표 117,1045 214x97
# 칩 «안쪽» 만 본다 — 칩 밖은 노란 카드(lum>185)라 밝은-잉크 마스크에 통째로 걸린다.
X0, X1, Y0, Y1 = 124, 326, 1052, 1136


def ink(a, o):
    reg = a[Y0 + o:Y1 + o, X0:X1]
    lum = reg.mean(axis=-1)
    return (lum < 55) | (lum > 185)


def parts(name, path, o, split):
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    m = ink(im, o)
    cols = m.sum(axis=0)
    xs = [i for i, v in enumerate(cols) if v > 0]
    if not xs:
        print(name, '잉크 없음'); return
    if split is None:                       # 가장 넓은 공백에서 자른다
        gaps, st = [], None
        for i in range(xs[0], xs[-1] + 1):
            if cols[i] == 0 and st is None: st = i
            elif cols[i] and st is not None: gaps.append((st, i - 1)); st = None
        g = max(gaps, key=lambda t: t[1] - t[0]) if gaps else None
        cut = (g[0] + g[1]) // 2 if g else (xs[0] + xs[-1]) // 2
    else:
        cut = split - X0
    out = []
    for lab, lo, hi in (('시계', xs[0], cut), ('숫자', cut + 1, xs[-1])):
        sub = m[:, lo:hi + 1]
        cx = [i + lo for i, v in enumerate(sub.sum(axis=0)) if v > 0]
        cy = [i for i, v in enumerate(sub.sum(axis=1)) if v > 0]
        if not cx: out.append(None); continue
        out.append((cx[0] + X0, cx[-1] + X0, cy[0] + Y0, cy[-1] + Y0))
        print(f'  {lab}  x {cx[0]+X0}..{cx[-1]+X0} (w {cx[-1]-cx[0]+1})   '
              f'y {cy[0]+Y0}..{cy[-1]+Y0} (h {cy[-1]-cy[0]+1})  중심y {(cy[0]+cy[-1])/2+Y0:.1f}')
    if out[0] and out[1]:
        print(f'  간격 {out[1][0]-out[0][1]-1}   전체 x {out[0][0]}..{out[1][1]} '
              f'(w {out[1][1]-out[0][0]+1})  중심x {(out[0][0]+out[1][1])/2:.1f}')
    # 콜론 두 개의 중심 거리 — 같은 글리프끼리라 서체·자간 비교에 가장 안전하다
    lum = np.asarray(Image.open(path).convert('RGB')).astype(int)[Y0 + o:Y1 + o, X0:X1].mean(axis=-1)
    w = (lum > 185)
    colw = w.sum(axis=0)
    runs, st = [], None
    for i, v in enumerate(colw):
        if v and st is None: st = i
        elif not v and st is not None: runs.append((st + X0, i - 1 + X0)); st = None
    small = [r for r in runs if r[1] - r[0] <= 6 and r[0] > (cut + X0)]
    if len(small) >= 2:
        c = [(r[0] + r[1]) / 2 for r in small[:2]]
        print(f'  콜론 중심 {c[0]:.1f} · {c[1]:.1f}  거리 {c[1]-c[0]:.1f}')


# ref 의 시계·숫자 경계는 x166 로 고정이다(ref 시계 …162 · 숫자 169…). 캡처만 --split 로 준다.
print('ref'); parts('ref', REF, 84, 166)
print(f'cap ({CAP})'); parts('cap', CAP, 0, SPLIT)
