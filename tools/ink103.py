#!/usr/bin/env python3
"""103 이름줄·시각 «잉크» 자가 측정 — 비평 회차를 태우지 않고 수렴하기 위한 도구.

비평가가 재는 것은 CSS 박스가 아니라 **잉크 bbox** 다(LESSONS 05-3: 어디를 기준으로 쟀는지
모르는 수치는 반영하지 마라 → 그러면 우리가 같은 방식으로 재면 된다).
색 마스크로 [길드태그]·닉네임·성별기호·시각을 잡고, 배지는 «그 밴드에서 배경도 위 색도 아닌 픽셀»로 잡는다.

사용: python3 tools/ink103.py docs/review/103-r3.png
"""
import sys
from pydep937 import Image

PATH = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/103-r3.png'
im = Image.open(PATH).convert('RGB')
W, H = im.size
px = im.load()

NAME = (0xB4, 0x57, 0x1E)      # 길드태그 · 닉네임
SEXM = (0x2E, 0x6B, 0xD0)      # ♂
SEXF = (0xC2, 0x3A, 0x5B)      # ♀
TIME = (0x7A, 0x65, 0x50)      # 시각
BUB  = (0xD7, 0xC0, 0xA1)      # 말풍선


def near(c, t, tol=40):
    return abs(c[0]-t[0]) <= tol and abs(c[1]-t[1]) <= tol and abs(c[2]-t[2]) <= tol


def bbox(pred, x0, x1, y0, y1):
    xs, ys = [], []
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            if pred(px[x, y]):
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def bubble_tops():
    """말풍선 좌변(x=245)에서 말풍선 색이 시작하는 y 들 → 행 기준선"""
    tops, run = [], None
    for y in range(H - 190):
        hit = near(px[245, y], BUB, 12)
        if hit and run is None:
            run = y
        elif not hit and run is not None:
            if y - run > 30:
                tops.append((run, y - 1))
            run = None
    return tops


bt = bubble_tops()
print('말풍선 %d개 (top,bottom):' % len(bt), bt[:3], '...')

rows = []
for (top, bot) in bt:
    band = (top - 60, top - 8)          # 이름줄은 말풍선 위 ~49px 구간
    gd = bbox(lambda c: near(c, NAME, 45), 236, 340, band[0], band[1])
    nk = bbox(lambda c: near(c, NAME, 45), 340, 520, band[0], band[1])
    sm = bbox(lambda c: near(c, SEXM, 45), 480, 620, band[0], band[1])
    sf = bbox(lambda c: near(c, SEXF, 45), 480, 620, band[0], band[1])
    sx = sm or sf
    tm = bbox(lambda c: near(c, TIME, 30), 860, 980, band[0], band[1])
    # 배지 = 이름줄 밴드에서 배경/이름색/성별색이 아닌 픽셀 (성별기호 오른쪽만)
    if sx:
        def notbg(c):
            return not (near(c, (0xF0, 0xD9, 0xBA), 26) or near(c, (0xEC, 0xD3, 0xB4), 26)
                        or near(c, NAME, 75) or near(c, SEXM, 95) or near(c, SEXF, 95))
        # 성별 글리프의 안티에일리어싱 꼬리를 피하려고 «3열 연속으로 잉크가 있는» 첫 열부터 잡는다
        x0 = None
        for x in range(sx[2] + 1, min(W, sx[2] + 100)):
            run = all(any(notbg(px[x + k, y]) for y in range(max(0, band[0] - 12), min(H, band[1] + 6)))
                      for k in range(3))
            if run:
                x0 = x; break
        bd = bbox(notbg, x0, x0 + 80, band[0] - 12, band[1] + 6) if x0 else None
    else:
        bd = None
    rows.append(dict(top=top, gd=gd, nk=nk, sx=sx, sf=bool(sf), tm=tm, bd=bd))


def w(b):
    return None if not b else b[2] - b[0] + 1


def h(b):
    return None if not b else b[3] - b[1] + 1


print('\n행별 잉크 (기준: 태그↔닉 4.3 · 닉↔성별 7.6 · 성별↔배지 7.6 · ♂ 33x32 ♀ 28x38 · 배지 56x48 · 시각 87x23)')
g1 = g2 = g3 = 0; n1 = n2 = n3 = 0
for r in rows:
    gd, nk, sx, bd, tm = r['gd'], r['nk'], r['sx'], r['bd'], r['tm']
    a = (nk[0] - gd[2] - 1) if gd and nk else None
    b = (sx[0] - nk[2] - 1) if nk and sx else None
    c = (bd[0] - sx[2] - 1) if sx and bd else None
    if a is not None: g1 += a; n1 += 1
    if b is not None: g2 += b; n2 += 1
    if c is not None: g3 += c; n3 += 1
    print(' top%4d  태그↔닉 %s  닉↔성별 %s  성별↔배지 %s  |  %s %sx%s  배지 %sx%s  시각 %sx%s'
          % (r['top'], a, b, c, '♀' if r['sf'] else '♂', w(sx), h(sx), w(bd), h(bd), w(tm), h(tm)))

print('\n평균 gap — 태그↔닉 %.1f (4.3) · 닉↔성별 %.1f (7.6) · 성별↔배지 %.1f (7.6)'
      % (g1 / max(1, n1), g2 / max(1, n2), g3 / max(1, n3)))

# 이름줄 잉크의 행 top 기준 세로 위치 (행 top = 말풍선 top − 49)
vs = [(r['nk'][1] - (r['top'] - 49), r['nk'][3] - (r['top'] - 49)) for r in rows if r['nk']]
if vs:
    print('닉 잉크 top/bottom (행 top 기준) 평균 %.1f / %.1f  (레퍼런스 −2~+1 / +34~+38)'
          % (sum(v[0] for v in vs) / len(vs), sum(v[1] for v in vs) / len(vs)))
bdv = [(r['bd'][1] - r['nk'][1]) for r in rows if r['bd'] and r['nk']]
if bdv:
    print('배지 잉크 top − 닉 잉크 top 평균 %.1f  (레퍼런스 −10.8)' % (sum(bdv) / len(bdv)))
tmv = [(r['tm'][2] + 1) for r in rows if r['tm']]
if tmv:
    print('시각 잉크 우끝 평균 %.1f  (레퍼런스 967~970)' % (sum(tmv) / len(tmv)))

# 리스트 하단 여백: 마지막 말풍선 bottom → 입력바 top(2094)
print('\n리스트 하단 여백 = %d  (레퍼런스 13)' % (2094 - bt[-1][1] - 1))
