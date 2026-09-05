#!/usr/bin/env python3
"""작업 151 — 우리 캡처의 «잉크» 를 재서 레퍼런스 환산값과 대조한다.

레이아웃 박스(DOM)는 `tools/cap151.js --geo` 가 준다. 그런데 «글자가 ref 만 한가» 는
DOM 박스로는 못 본다 — 실제로 찍힌 **잉크 bbox** 를 봐야 한다(LESSONS A3 ⓑ·ⓔ).
그래서 캡처 픽셀에서 요소별 창을 열어 흰 글자·노랑 글자의 bbox 를 잰다.

기준값은 레퍼런스 실측 → 카드 폭 978 환산(k = 978/474 = 2.0633)이다(측정표 §9).

실행: python3 tools/ink151.py docs/review/151-r2.png
"""
import sys
from pydep937 import np
from pydep937 import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/151-r2.png'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)

K = 978 / 474.0
# 카드 좌상단(프레임 좌표) — cap151 --geo 의 값. 카드 폭 978 · 좌 51 고정.
CARDS = {'noads': 574, 'abless': 1182, 'offplus': 1946}
CX = 51

# 요소별 (카드, 창 x0,y0,x1,y1 [카드 기준], 마스크, ref 잉크 w×h [카드 기준 환산])
def r(v):
    return round(v * K, 1)


ITEMS = [
    ('탭 글자',      'abless', (29, -56, 281, 10),  'light', (r(56), r(15))),
    ('배지 글자',    'abless', (819, -37, 1003, 145), 'yellow', (r(75), r(44))),
    ('타이틀(1장)',  'noads',  (60, 20, 600, 110),   'white',  (r(90), r(21))),
    ('타이틀(2장)',  'abless', (60, 20, 600, 110),   'white',  (r(135), r(23))),
    ('불릿 1행 글자', 'abless', (110, 140, 600, 215), 'white',  (r(219), r(13))),
    ('★ 불릿',       'abless', (45, 140, 105, 215),  'yellow', (r(17), r(16))),
    ('리본1 라벨',   'abless', (30, 420, 340, 500),  'yellow', (r(106), r(13))),
    ('배너 글자',    'noads',  (200, 160, 500, 230), 'core',   (r(114), r(14))),
    ('가격 글자',    'abless', (600, 550, 910, 670), 'white',  (r(105), r(20))),   # ⚠ 창을 짧게 잡으면 글리프 아래가 잘려 «작다» 로 오독한다(2회차 비평 C·D)
]


def mask(reg, kind):
    if kind == 'core':          # 크림 배경(#FDE7CF) 위의 흰 글자 — 순백만 남긴다
        return reg.min(2) > 246
    if kind == 'white':
        return reg.min(2) > 200
    if kind == 'yellow':
        return (reg[:, :, 0] > 180) & (reg[:, :, 1] > 165) & (reg[:, :, 2] < 150)
    return (np.abs(reg[:, :, 0] - reg[:, :, 1]) < 24) & (np.abs(reg[:, :, 1] - reg[:, :, 2]) < 24) \
        & (reg.min(2) > 120) & (reg.max(2) < 235)


print('캡처', SRC, '· k =', round(K, 4))
print(f'{"요소":14s} {"우리 w×h":>14s} {"ref 환산 w×h":>16s} {"Δw%":>7s} {"Δh%":>7s}')
for name, card, (x0, y0, x1, y1), kind, (rw, rh) in ITEMS:
    cy = CARDS[card]
    reg = a[cy + y0:cy + y1, CX + x0:CX + x1]
    m = mask(reg, kind)
    ys, xs = np.where(m)
    if not len(ys):
        print(f'{name:14s} {"잉크 없음":>14s}')
        continue
    w = xs.max() - xs.min() + 1
    h = ys.max() - ys.min() + 1
    print(f'{name:14s} {w:6d} x {h:5d} {rw:8.1f} x {rh:5.1f} '
          f'{(w / rw - 1) * 100:+6.1f}% {(h / rh - 1) * 100:+6.1f}%')
