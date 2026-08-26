#!/usr/bin/env python3
"""작업 A3 상단 HUD — 텍스트·아이콘 «잉크 bbox» 스캐너 (레퍼런스 ↔ 캡처, 완전히 같은 마스크).

126 이 시스템 서체를 웹폰트 `GameKR` 로 갈아끼우면서 **같은 font-size 가 다른 잉크 크기**를 낸다
(작업 13 이 6회차에 −13~19% 축소를 잡아냈다). A3 는 1차 라운드(2026-08-24)에 옛 서체 기준으로
fs 를 맞춰 놓았으므로 웹폰트 교체 뒤의 실제 잉크를 다시 재야 한다.

각 항목에 대해 출력한다:
    ref(w×h) · cap(w×h) · Δ% · **fs 배수 = ref_h/cap_h** · **sx 배수 = (ref_w/cap_w)/(fs 배수)**

창은 측정표(docs/measure/A3-상단HUD.md)의 ref 잉크 bbox 에 ±pad 를 준 것이고,
레퍼런스·캡처에 **똑같은 창(캡처는 y−84)** 과 **똑같은 임계**를 쓴다.

실행: python3 tools/inkA3.py [캡처경로]      (기본 docs/review/A3-r6.png)
"""
import sys
import numpy as np
from PIL import Image

REF = 'docs/ref/02-기본-메인-화면.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/A3-r6.png'
DY = 84
PAD = 10

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.int16)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(np.int16)

WHITE = ('흰', lambda w: w.min(axis=2) >= 200)
LIME = ('연두', lambda w: (w[:, :, 1] >= 210) & (w[:, :, 2] < 175) & (w[:, :, 0] > 130))
WARM = ('주황', lambda w: (w[:, :, 0] >= 150) & (w[:, :, 1] <= 200) & (w[:, :, 2] <= 110))
YEL = ('노랑', lambda w: (w[:, :, 0] > 195) & (w[:, :, 1] > 140) & (w[:, :, 2] < 125))
BLUE = ('파랑', lambda w: (w[:, :, 2] > 185) & (w[:, :, 1] > 135) & (w[:, :, 0] < 135))

#  이름,                     ref 잉크 bbox(x,y,w,h) — 측정표 값,   마스크,  pad
ITEMS = [
    ('닉네임 U_178750…',      (201, 103, 169, 16), WHITE, 8),
    ('칭호/계급',             (230, 141,  73, 21), WHITE, 9),
    ('전투력 1.33B',          (200, 183,  84, 25), LIME,  10),
    ('전투력 🔥',             (153, 176,  36, 37), WARM,   8),
    ('골드 39.20A',           (639, 127, 118, 25), WHITE, 12),
    ('젬 1,300',              (911, 127,  87, 28), WHITE, 12),
    ('코인 아이콘',           (552, 108,  63, 63), YEL,    8),
    ('젬 아이콘',             (812, 108,  63, 63), BLUE,   8),
]


def bb(img, y0, y1, x0, x1, pred):
    y0 = max(0, y0); x0 = max(0, x0)
    y1 = min(img.shape[0], y1); x1 = min(img.shape[1], x1)
    if y1 <= y0 or x1 <= x0:
        return None
    m = pred(img[y0:y1, x0:x1])
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (int(x0 + xs.min()), int(y0 + ys.min()),
            int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))


print('캡처:', CAP)
print('%-20s %-12s %-12s %-16s %-8s %-8s %s'
      % ('요소', 'ref(w×h)', 'cap(w×h)', 'Δw% / Δh%', 'fs×', 'sx×', 'Δx/Δy'))
print('-' * 100)
mult = {}
for name, (x, y, w, h), (mn, pred), pad in ITEMS:
    br = bb(ref, y - pad, y + h + pad, x - pad, x + w + pad, pred)
    bc = bb(cap, y - pad - DY, y + h + pad - DY, x - pad, x + w + pad, pred)
    if br is None or bc is None:
        print('%-20s %-12s %-12s  창 밖(마스크 0)' % (name, br, bc))
        continue
    dw = (bc[2] - br[2]) / br[2] * 100
    dh = (bc[3] - br[3]) / br[3] * 100
    fs = br[3] / bc[3]
    sx = (br[2] / bc[2]) / fs
    mult[name] = (fs, sx)
    dx = bc[0] - br[0]
    dy = (bc[1] + DY) - br[1]
    flag = '  <<' if (abs(dw) >= 4 or abs(dh) >= 4 or abs(dx) >= 4 or abs(dy) >= 4) else ''
    print('%-20s %-12s %-12s %+6.1f / %+6.1f   %-8.4f %-8.4f %+d/%+d%s'
          % (name, '%dx%d' % (br[2], br[3]), '%dx%d' % (bc[2], bc[3]),
             dw, dh, fs, sx, dx, dy, flag))
print('-' * 100)
if mult:
    txt = [v[0] for k, v in mult.items() if '아이콘' not in k]
    if txt:
        print('텍스트 fs 배수 중앙값 %.4f  (min %.4f / max %.4f)'
              % (float(np.median(txt)), min(txt), max(txt)))
