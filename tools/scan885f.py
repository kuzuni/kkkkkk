#!/usr/bin/env python3
"""작업 885 8회차 — 리본 크림 «캡» 의 좌단·검정 립·우단을 **한 자로** ref 와 우리에게 같이 묻는다.

왜 새 자인가 — 7회차 채점 2인(EZ·FA)이 «리본 왼끝에 검정 립이 있고 크림 좌단은 카드 안쪽» 을
2인 일치로 냈고, 6회차의 내 자는 «리본 없는 행» 창이 카드 프레임(x11.4~16.3)까지 물어 오염됐다.
그런데 **같은 자리의 우단(빨강 시작)** 은 4회차 EU 가 «ref +18.6~20.6 우리px» 로 재고
6회차 내 자는 «중간 폭 Δ0.00» 이라 적었다 — 셋이 서로 다른 행·다른 문턱을 썼다(896 «자 갈림»).

⇒ 이 자는 축을 하나로 고정한다:
   ⓐ 좌표 원점은 **카드 바깥선**(ref·우리 각각 자기 캡처에서 실측한다 — 상수로 안 적는다).
   ⓑ 경계는 전부 **부분화소 50% 교차**(선형 보간). 문턱 사다리는 ±20% 로 같이 낸다.
   ⓒ 행은 캡의 **위·중·아래**(리본 띠 높이의 15% · 50% · 85%)로 세 줄 — 캡은 기울어 있어서
      «어느 행이냐» 가 값을 지배한다(6회차가 확인한 기울기 4 ref px).
   ⓓ ref 는 K 를 곱해 **우리 px** 로 낸다. 두 그림을 같은 단위로 나란히 적는다.

검정 립의 «두께» 는 폭이 아니라 **잉크 적분**으로 낸다 — ref 의 립은 2열에 걸쳐 부분화소로
깔려 있어서(x10 46% · x11 89%) «몇 열이냐» 로 세면 2 ref px, 잉크로 세면 0.8 ref px 라
7회차 채점이 «1.68~4.1 우리px» 라는 2.4배 창을 남겼다. 잉크 적분은 그 창을 하나로 좁힌다.

실행: python3 tools/scan885f.py [우리캡처.png]
"""
import sys

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                        # 우리 px = ref px × K (측정표 §9)

BG_T = 60.0                       # 배경(42~52)보다 밝으면 «크림/카드속» 쪽
CREAM = 250.0
RED = 144.7


def lum(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(int).mean(2)


def cross(row, x0, x1, lo, hi, frac=0.5):
    """[x0,x1) 구간에서 lo→hi 를 frac 비율로 처음 지나는 자리(부분화소, 화소 중심 기준)."""
    t = lo + (hi - lo) * frac
    up = hi > lo
    for x in range(x0, x1 - 1):
        a, b = row[x], row[x + 1]
        if (up and a < t <= b) or ((not up) and a > t >= b):
            if b == a:
                return x + 0.5
            return (x + 0.5) + (t - a) / (b - a)
    return None


def card_left(img, y):
    """카드 바깥선 — 배경에서 검정 프레임으로 떨어지는 50% 자리(리본 없는 행)."""
    row = img[y]
    bg = float(np.median(row[0:8]))
    return cross(row, 0, 60, bg, 0.0)


def bands(img, x0, x1, thr=40):
    """빨강 몸통이 있는 행 묶음 = 리본 띠."""
    a = np.asarray(Image.open.__self__, dtype=object) if False else None
    return None


def red_bands(path, x0, x1, minh):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    m = ((R - np.maximum(G, B)) >= 50) & (R > 110)
    c = m[:, x0:x1].sum(1)
    out, s, prev = [], None, 0
    for y in range(a.shape[0]):
        if c[y] > 40 and prev <= 40:
            s = y
        if c[y] <= 40 and prev > 40 and s is not None and y - s >= minh:
            out.append((s, y - 1))
        prev = c[y]
    return out


def cap_row(img, y, cl, scale, frac):
    """한 행에서 (립 좌단 · 크림 좌단 · 잉크두께 · 빨강 시작) 을 카드선 기준 «우리 px» 로."""
    row = img[y]
    bg = float(np.median(row[max(0, int(cl) - 12):max(1, int(cl) - 4)]))
    x0 = max(0, int(cl) - 10)
    lip_l = cross(row, x0, int(cl) + 6, bg, 0.0, frac)          # 배경 → 검정
    cream_l = cross(row, x0, int(cl) + 12, 0.0, CREAM, frac)    # 검정 → 크림
    red_s = cross(row, int(cl) + 4, int(cl) + 40, CREAM, RED, frac)
    # 잉크 적분 — 립 좌단부터 크림이 가득 찰 때까지 (CREAM - v)/CREAM 을 더한다
    ink = None
    if lip_l is not None and cream_l is not None:
        a, b = int(np.floor(lip_l)), int(np.ceil(cream_l)) + 3
        s = 0.0
        for x in range(a, b):
            v = row[x]
            if v >= CREAM - 1:
                break
            w = 1.0
            if x == a:
                w = (x + 1) - lip_l
            s += w * max(0.0, min(1.0, (CREAM - v) / CREAM)) if v < CREAM else 0.0
        # 배경 쪽(립 왼쪽)은 위 w 로 이미 잘렸다
        ink = s
    f = lambda v: None if v is None else round((v - cl) * scale, 2)
    return f(lip_l), f(cream_l), (None if ink is None else round(ink * scale, 2)), f(red_s)


def run(path, scale, x0, x1, minh, nonrib_y, label):
    img = lum(path)
    cl = card_left(img, nonrib_y)
    print('== %s   카드 바깥선 = %.3f (그림 px) · K=%.4f' % (label, cl, scale))
    for (y0, y1) in red_bands(path, x0, x1, minh):
        h = y1 - y0 + 1
        print('  띠 y%d..%d (h=%d · 우리px %.1f)' % (y0, y1, h, h * scale))
        for name, fr in (('위', .15), ('중', .50), ('아래', .85)):
            y = int(round(y0 + (h - 1) * fr))
            for frac, tag in ((0.5, '50%'), (0.3, '30%'), (0.7, '70%')):
                l, c, ink, r = cap_row(img, y, cl, scale, frac)
                if tag == '50%':
                    print('    %-4s y%4d  립좌단 %7s · 크림좌단 %7s · 립잉크 %6s · 빨강 %7s'
                          % (name, y, l, c, ink, r))
                else:
                    print('           %s      %7s        %7s          %6s        %7s'
                          % (tag, l, c, ink, r))
    print()


if __name__ == '__main__':
    our = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/151-r63.png'
    run(REF, K, 20, 200, 18, 620, 'ref  docs/ref/151-이용권-카드.png')
    run(our, 1.0, 51, 351, 36, 1300, 'our  ' + our)
