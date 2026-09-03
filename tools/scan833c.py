#!/usr/bin/env python3
"""작업 833 9회차 — **배너 라벨의 «가로 자리»** 자 (8회차 2인 일치 1번).

8회차 채점에서 DF·DG 가 «배너 라벨 잉크가 노란 필드 안에서 오른쪽으로 +11.6/+11.7px 밀렸다»
를 각자 다른 자로 냈는데, **둘의 ref 기대값이 서로 6px 어긋난다**(DF 카드-로컬 357.4 ·
DG «필드 중심 −0.9» = 363.3). 667 8회차가 자기 자로 낸 값은 또 다른 367.7 이다.
셋이 다른 것은 «무엇을 필드로 보는가»(노랑 채움만 ↔ 검정 테 포함)와 «무엇을 잉크로 보는가»
(순백 코어 ↔ 검정 외곽 포함)가 달라서다 — A3-ⓑ 그대로의 자리다.

⇒ 이 자는 **한 정의로 ref 와 우리를 같이 잰다**:
  · 필드 = 배너 판의 **노랑 채움**(크림 칸을 뺀 오른쪽 64%) 의 가로 bbox
  · 잉크 = 그 필드 행 안의 **순백 코어**(min 채널 > THR · 기본 246 = `ink151.py` 와 같은 마스크)
  · 값은 «잉크 중심 − 필드 중심» 하나로 낸다(양끝을 따로 보면 잉크 폭 차가 섞인다).
⚠ **문턱을 흔들어라**(`--thr`) — ref 는 JPEG/AA 번짐이 있고 우리 캡처는 경계가 딱 떨어진다.
   부호가 문턱에서 뒤집히면 그 지적은 신뢰 «하» 다(833 8회차 DF 5순위가 그렇게 내려갔다).

실행:
    python3 tools/scan833c.py [--cap <경로접두>] [--thr 246]
      (기본 접두 = 환경변수 CAP833 또는 docs/review/151-r30 · 크롭 `-c1.png` 를 읽는다)
"""
import os
import sys

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                      # ref 카드 폭 474.12 → 우리 978 (측정표 §9)

# 배너 판 노랑 채움 — 우리 #F3BA4F · ref 도 같은 계열(그러데이션이 아니라 단색 칸이다)
YEL = (243, 186, 79)
TOL_YEL = 46                    # 크림(#FDE7CF)·금 테를 뺀다(스윕으로 30~60 이 같은 답을 낸다)

# ref 카드1(배너형) 상자 — `tools/scan833b.py` 가 낸 값(카드 x 11.44..485.55 · 상변 32.42)
REF_CARD = (11.44, 32.42, 485.55)
# 배너 판 창 — 카드-로컬 우리 px (CSS `.pvc>.ban{left:50;top:138;height:113}`)
BAN_WIN = (30, 120, 540, 270)


def near(a, rgb, tol):
    return (np.abs(a - np.array(rgb)).max(2) <= tol)


def bbox(m):
    ys, xs = np.nonzero(m)
    if not len(xs):
        return None
    return xs.min(), ys.min(), xs.max(), ys.max()


def measure(a, ox, oy, scale, thr, tag):
    """ox,oy = 카드 좌상단(그림 좌표) · scale = 카드-로컬 우리px → 그림 px"""
    x0 = int(ox + BAN_WIN[0] / scale); y0 = int(oy + BAN_WIN[1] / scale)
    x1 = int(ox + BAN_WIN[2] / scale); y1 = int(oy + BAN_WIN[3] / scale)
    reg = a[y0:y1, x0:x1]
    fb = bbox(near(reg, YEL, TOL_YEL))
    if fb is None:
        print('  %s: 노랑 칸을 못 찾았다' % tag)
        return None
    fx0, fy0, fx1, fy1 = fb
    # 잉크 = 필드 행 안의 순백 코어
    sub = reg[fy0:fy1 + 1, fx0:fx1 + 1]
    ib = bbox(sub.min(2) > thr)
    if ib is None:
        print('  %s: 흰 잉크를 못 찾았다(문턱 %d)' % (tag, thr))
        return None
    ix0, iy0, ix1, iy1 = ib
    # 값은 «카드-로컬 우리 px» 로 낸다 — 창 원점(x0)과 카드 원점(ox)을 되돌려 더한다.
    # ⚠ 이 되돌림을 빼먹으면 ref·우리가 각자 다른 만큼(창 원점 int 절단) 밀려
    #    절대값이 28~30px 씩 어긋난다. «중심 − 중심» 은 그래도 성립하지만 좌·우 여백은 안 선다.
    f_l = (x0 + fx0 - ox) * scale; f_r = (x0 + fx1 + 1 - ox) * scale
    i_l = (x0 + fx0 + ix0 - ox) * scale; i_r = (x0 + fx0 + ix1 + 1 - ox) * scale
    fc = (f_l + f_r) / 2; ic = (i_l + i_r) / 2
    print('  %s: 노랑칸 %.1f..%.1f (폭 %.1f) · 잉크 %.1f..%.1f (폭 %.1f)' %
          (tag, f_l, f_r, f_r - f_l, i_l, i_r, i_r - i_l))
    print('      좌여백 %.1f · 우여백 %.1f · **잉크중심 − 칸중심 %+.1f**' %
          (i_l - f_l, f_r - i_r, ic - fc))
    return dict(fl=f_l, fr=f_r, il=i_l, ir=i_r, d=ic - fc)


def main():
    thr = 246
    if '--thr' in sys.argv:
        thr = int(sys.argv[sys.argv.index('--thr') + 1])
    cap = os.environ.get('CAP833', 'docs/review/151-r30')
    if '--cap' in sys.argv:
        cap = sys.argv[sys.argv.index('--cap') + 1]

    print('== 배너 라벨 가로 자 · 흰 코어 문턱 %d · K=%.4f (값은 카드-로컬 우리 px 환산)' % (thr, K))
    ra = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    print('-- ref 카드1(배너형)')
    r = measure(ra, REF_CARD[0], REF_CARD[1], K, thr, 'ref')

    ca = np.asarray(Image.open(cap + '-c1.png').convert('RGB')).astype(int)
    print('-- 우리 카드1 [%s-c1.png]' % os.path.basename(cap))
    o = measure(ca, 40, 80, 1.0, thr, '우리')          # 크롭 원점 = 카드 −40,−80

    if r and o:
        print('\n== 요약')
        print('| 자리 | ref | 우리 | Δ |')
        print('|---|---|---|---|')
        print('| 노랑칸 좌단 | %.1f | %.1f | %+.1f |' % (r['fl'], o['fl'], o['fl'] - r['fl']))
        print('| 노랑칸 우단 | %.1f | %.1f | %+.1f |' % (r['fr'], o['fr'], o['fr'] - r['fr']))
        print('| 잉크 폭 | %.1f | %.1f | %+.1f |' % (r['ir'] - r['il'], o['ir'] - o['il'],
                                                    (o['ir'] - o['il']) - (r['ir'] - r['il'])))
        print('| **잉크중심 − 칸중심** | %+.1f | %+.1f | **%+.1f** |' % (r['d'], o['d'], o['d'] - r['d']))


if __name__ == '__main__':
    main()
