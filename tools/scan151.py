#!/usr/bin/env python3
"""작업 151 — 레퍼런스 `docs/ref/151-이용권-카드.png` 계측기.

이 레퍼런스는 «전체 화면 스크린샷» 이 아니라 **카드 2장만 잘라 낸 504×709 크롭**이다.
그래서 지시서 [2] 의 «프레임 y = ref y − 84» 변환은 이 작업에 해당하지 않는다 —
비교 단위는 «카드 하나» 이고, 잰 값은 전부 **카드 외곽(검정 테 포함) 좌상단 기준 상대 px** 과
**카드 폭을 1 로 놓은 비율**로 적는다(측정표 §7). 우리 카드는 그 비율을 폭 978 로 환산해 만든다.

위쪽 카드(파랑)는 **윗부분이 잘려 있다** — 전체 규격은 아래 카드(초록)에서만 잰다.

실행: python3 tools/scan151.py [--map] [--card 1|2]
"""
import sys
from pydep937 import np
from pydep937 import Image

SRC = 'docs/ref/151-이용권-카드.png'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = a.shape

BLACK = a.max(2) < 50


def runs(idx):
    """정수 인덱스 배열 → 연속 구간 리스트"""
    out, s, p = [], None, None
    for v in idx:
        if s is None:
            s = v
        elif v != p + 1:
            out.append((s, p))
            s = v
        p = v
    if s is not None:
        out.append((s, p))
    return out


def mask_bbox(m):
    ys = np.where(m.any(1))[0]
    xs = np.where(m.any(0))[0]
    if not len(ys):
        return None
    return (int(xs[0]), int(ys[0]), int(xs[-1] - xs[0] + 1), int(ys[-1] - ys[0] + 1))


def near(c, ref, tol=90):
    return np.abs(c - np.array(ref)).sum(2) < tol


def card_frame(y0, y1):
    """검정 테 4변으로 카드 외곽 bbox 를 잡는다(테 두께 포함)."""
    band = BLACK[y0:y1]
    rows = [y0 + i for i, v in enumerate(band.sum(1)) if v > (W * 0.80)]
    cols = [x for x in range(W) if BLACK[y0:y1, x].sum() > (y1 - y0) * 0.55]
    return runs(rows), runs(cols)


def report():
    print('== 파일', SRC, W, 'x', H)
    # 카드 2(초록) — 규격 기준. 몸통 색 마스크로 외곽을 먼저 잡고 검정 테를 더한다.
    body2 = near(a, (57, 194, 141), 150) | near(a, (33, 145, 97), 150)
    body2[:300] = False
    b = mask_bbox(body2)
    print('카드2 몸통(초록) bbox', b)
    body1 = near(a, (67, 188, 245), 150) | near(a, (58, 134, 212), 150)
    body1[300:] = False
    print('카드1 몸통(파랑) bbox', mask_bbox(body1))
    for lbl, (y0, y1) in (('카드1', (0, 300)), ('카드2', (300, H))):
        r, c = card_frame(y0, y1)
        print(lbl, '검정 가로띠', r, '세로띠', c)
    # 빨강 리본
    red = near(a, (255, 86, 93), 90)
    for lbl, (y0, y1) in (('카드1', (0, 292)), ('카드2', (292, H))):
        m = red.copy()
        m[:y0] = False
        m[y1:] = False
        rr = runs([y for y in range(H) if m[y].sum() > 20])
        for (ra, rb) in rr:
            sub = m[ra:rb + 1]
            xs = np.where(sub.any(0))[0]
            print(lbl, '빨강 덩어리 y', ra, rb, 'x', int(xs[0]), int(xs[-1]),
                  'w', int(xs[-1] - xs[0] + 1), 'h', rb - ra + 1)
    # 노랑(별·수치) · 흰 글자
    yel = (a[:, :, 0] > 180) & (a[:, :, 1] > 165) & (a[:, :, 2] < 130)
    wht = a.min(2) > 200
    for lbl, (y0, y1) in (('카드1', (0, 292)), ('카드2', (292, H))):
        for nm, m in (('노랑', yel), ('흰글자', wht)):
            mm = m.copy()
            mm[:y0] = False
            mm[y1:] = False
            print(lbl, nm, 'bbox', mask_bbox(mm), '픽셀', int(mm.sum()))


def amap(y0, y1, x0, x1, cs=8):
    reg = a[y0:y1, x0:x1]

    def cls(c):
        r, g, bl = c
        mx, mn = max(c), min(c)
        if mx < 50:
            return 'K'
        if mn > 200:
            return 'W'
        if r > 180 and g < 130 and bl < 140:
            return 'R'
        if r > 180 and g > 165 and bl < 130:
            return 'Y'
        if g > 110 and g > r + 30 and g > bl + 20:
            return 'G'
        if bl > 150 and bl > r + 40:
            return 'B'
        if r > 150 and bl > 120 and g < 120:
            return 'P'
        if mx < 110:
            return 'd'
        return '.'
    from collections import Counter
    for gy in range(0, reg.shape[0], cs):
        line = ''
        for gx in range(0, reg.shape[1], cs):
            blk = reg[gy:gy + cs, gx:gx + cs].reshape(-1, 3)
            line += Counter(cls(tuple(p)) for p in blk).most_common(1)[0][0]
        print(f'{y0 + gy:4d}', line)


if __name__ == '__main__':
    if '--map' in sys.argv:
        amap(287, 709, 0, 504)
    else:
        report()
