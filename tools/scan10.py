#!/usr/bin/env python3
"""작업 10 — 레퍼런스 vs 캡처 픽셀 실측 대조 (카드 1장 기준).

레퍼런스 docs/ref/10-상점-팝업-소환-탭.jpg (1080x2340) 와
캡처 docs/review/10-r*.jpg (1080x2280) 를 «프레임 y = ref y - 84» 로 맞춰 놓고
같은 요소의 bbox 를 색마스크로 각각 재서 Δ 를 낸다.

카드 좌상단 원점: ref (50,250) / 캡처는 --capcard 로 준다(기본 (50,163)).

실행:
  python3 tools/scan10.py [캡처경로]
  python3 tools/scan10.py docs/review/10-r4.jpg --capcard 50,166
"""
import sys
from pydep937 import np
from pydep937 import Image

cap_path = 'docs/review/10-r3.jpg'
cap_card = (50, 163)
args = sys.argv[1:]
for i, a in enumerate(args):
    if a == '--capcard':
        x, y = args[i + 1].split(',')
        cap_card = (int(x), int(y))
    elif not a.startswith('--') and (i == 0 or args[i - 1] != '--capcard'):
        cap_path = a

REF = np.asarray(Image.open('docs/ref/10-상점-팝업-소환-탭.jpg').convert('RGB')).astype(int)
CAP = np.asarray(Image.open(cap_path).convert('RGB')).astype(int)
REF_CARD = (50, 250)


def bbox(img, ox, oy, dx0, dy0, dx1, dy1, pred):
    """카드 원점(ox,oy) 기준 상대창 안에서 pred 를 만족하는 픽셀의 bbox(상대좌표)."""
    sub = img[oy + dy0: oy + dy1, ox + dx0: ox + dx1]
    m = pred(sub)
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (int(xs.min()) + dx0, int(ys.min()) + dy0,
            int(xs.max() - xs.min()) + 1, int(ys.max() - ys.min()) + 1)


def near(sub, rgb, tol):
    return (np.abs(sub - np.array(rgb)).max(axis=2) <= tol)


def bright(sub, thr):
    return sub.mean(axis=2) >= thr


def dark(sub, thr):
    return sub.mean(axis=2) <= thr


# (이름, 상대창 dx0,dy0,dx1,dy1, 판정함수, 측정표 기대 bbox 또는 None)
TESTS = [
    ('헤더밴드 하단경계(민트)', (0, 0, 980, 140), lambda s: near(s, (47, 173, 136), 46), (7, 8, 967, 96)),
    ('상자아트 잉크',           (60, 120, 420, 380), lambda s: bright(s, 150),            (103, 150, 274, 204)),
    ('🔍 버튼(회청 채움)',      (360, 110, 460, 200), lambda s: near(s, (157, 163, 184), 40), (381, 128, 59, 58)),
    ('Lv 알약(검정)',           (40, 350, 170, 420), lambda s: dark(s, 42),                (55, 363, 89, 44)),
    ('경험치바(검정 외곽)',     (100, 358, 440, 412), lambda s: dark(s, 42),               (113, 369, 307, 32)),
    ('시안 버튼(검정 외곽)',    (700, 130, 950, 260), lambda s: dark(s, 42),               (720, 146, 200, 98)),
    ('노랑 버튼(검정 외곽)',    (460, 250, 700, 400), lambda s: dark(s, 42),               (476, 262, 208, 127)),
    ('회색 버튼(검정 외곽)',    (700, 250, 940, 400), lambda s: dark(s, 42),               (717, 262, 206, 127)),
]

print(f'캡처: {cap_path}   캡처 카드원점 {cap_card}   ref 카드원점 {REF_CARD}')
print(f'{"요소":26s} {"ref 실측":>22s} {"cap 실측":>22s} {"Δ(x,y,w,h)":>22s}  측정표')
for name, win, pred, exp in TESTS:
    r = bbox(REF, REF_CARD[0], REF_CARD[1], *win, pred)
    c = bbox(CAP, cap_card[0], cap_card[1], *win, pred)
    if r is None or c is None:
        print(f'{name:26s} {"MISS" if r is None else str(r):>22s} {"MISS" if c is None else str(c):>22s}')
        continue
    d = tuple(c[i] - r[i] for i in range(4))
    print(f'{name:26s} {str(r):>22s} {str(c):>22s} {str(d):>22s}  {exp}')
