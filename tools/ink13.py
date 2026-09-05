#!/usr/bin/env python3
"""작업 13 — 텍스트 «잉크 bbox» 전용 스캐너 (레퍼런스 ↔ 캡처, 완전히 같은 마스크).

126 이 시스템 서체를 웹폰트 `GameKR`(Jua) 로 갈아끼우면서 **같은 font-size 가 다른 잉크 크기**를
내게 됐다. 1차 라운드에 Δ≤2 로 맞춰 둔 13 의 fs·scaleX 는 전부 옛 서체 기준이라 다시 역산해야 한다
(A2 의 «칸이 바뀌면 --sf/--sx 를 다시 재라» 와 같은 규약).

각 항목에 대해 출력한다:
    ref(w×h) · cap(w×h) · Δ% · **fs 배수 = ref_h/cap_h** · **sx 배수 = (ref_w/cap_w)/(fs 배수)**

창은 측정표(docs/measure/13-상점팝업재화탭.md)의 ref 잉크 bbox 에 ±pad 를 준 것이고,
레퍼런스·캡처에 **똑같은 창(캡처는 y−84)** 과 **똑같은 임계**를 쓴다.

실행: python3 tools/ink13.py [캡처경로]
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/13-상점-팝업-재화-탭.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/13-r6.png'
DY = 84
PAD = 14
# 9회차 — 카드 헤더·×N 은 pad 6 으로 좁힌다. 아이콘 상자가 120×82 → 120×120 으로 회복되면서
# pad 14 창이 아이콘 잉크를 물어 «높이 +50~96%» 라는 없는 결함이 뜬다(9회차에 재현·확인).

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.int16)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(np.int16)

WHITE = ('흰', lambda w: w.min(axis=2) >= 238)
CREAMY = ('연노랑', lambda w: (w[:, :, 0] > 215) & (w[:, :, 1] > 200) & (w[:, :, 2] < 200))
GOLD = ('금', lambda w: (w[:, :, 0] > 205) & (w[:, :, 1] > 165) & (w[:, :, 2] < 185))

#  이름,            ref 잉크 bbox(x,y,w,h) — 측정표 값,       마스크
ITEMS = [
    ('재화 상점(타이틀)',      (686, 335, 268, 65), CREAMY),
    ('상품(밴드)',             (497, 576,  85, 46), CREAMY),
    ('광고 상품(리본)',        (466, 723, 148, 37), WHITE),
    ('마일리지 상품(리본)',    (430, 1918, 221, 36), WHITE),
    ('평생 광고 제거',         (584, 1604, 370, 55), GOLD),
    ('이동(버튼)',             (788, 1714,  82, 46), WHITE),
    ('구매 완료(①띠)',        (186, 1021, 127, 29), WHITE),
    ('카드① 보석',            (220, 904,  58, 31), WHITE, 6),
    ('카드② 공물',            (512, 906,  56, 33), WHITE, 6),
    ('카드③ 골드 상자',       (762, 906, 137, 32), WHITE, 6),
    ('카드④ 상자 열쇠',       (126, 1228, 247, 28), WHITE, 6),
    ('카드⑤ 강화석',          (419, 1225, 240, 33), WHITE, 6),
    ('카드⑥ 소환 열쇠',       (707, 1227, 246, 30), WHITE, 6),
    ('카드② ×50',             (572, 1052,  81, 30), WHITE, 6),
    ('카드③ ×1',              (862, 1048,  38, 33), WHITE, 6),
    ('카드⑤ ×30',             (572, 1371,  80, 31), WHITE, 6),
    ('카드② 받기',            (551, 1108,  47, 24), WHITE, 6),
    ('카드② (1/1)',           (547, 1139,  56, 21), WHITE, 6),
    ('초기화:',                (459, 793, 121, 20), WHITE, 6),
    ('5H 12M',                 (592, 795,  48, 18), WHITE, 6),
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


print('%-20s %-13s %-13s %-15s %-8s %-8s' % ('요소', 'ref(w×h)', 'cap(w×h)', 'Δw% / Δh%', 'fs×', 'sx×'))
print('-' * 88)
mult = {}
for it in ITEMS:
    name, (x, y, w, h), (mn, pred) = it[0], it[1], it[2]
    pad = it[3] if len(it) > 3 else PAD
    wx0, wx1 = x - pad, x + w + pad
    br = bb(ref, y - pad, y + h + pad, wx0, wx1, pred)
    bc = bb(cap, y - pad - DY, y + h + pad - DY, wx0, wx1, pred)
    if br is None or bc is None:
        print('%-20s %-13s %-13s  창 밖(마스크 0)' % (name, br, bc))
        continue
    dw = (bc[2] - br[2]) / br[2] * 100
    dh = (bc[3] - br[3]) / br[3] * 100
    fs = br[3] / bc[3]
    sx = (br[2] / bc[2]) / fs
    mult[name] = (fs, sx)
    flag = '  <<' if (abs(dw) >= 4 or abs(dh) >= 4) else ''
    print('%-20s %-13s %-13s %+6.1f / %+6.1f   %-8.4f %-8.4f%s'
          % (name, '%dx%d' % (br[2], br[3]), '%dx%d' % (bc[2], bc[3]), dw, dh, fs, sx, flag))
print('-' * 88)
if mult:
    fss = [v[0] for v in mult.values()]
    print('fs 배수 중앙값 %.4f  (min %.4f / max %.4f)'
          % (float(np.median(fss)), min(fss), max(fss)))
