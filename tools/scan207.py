#!/usr/bin/env python3
"""작업 207 — 리본 금색 판 안 «다이아 잉크» 를 픽셀로 재서 판 중심과 대조한다.

DOM 상자(probe207)가 가운데라도, SVG 안에서 그림이 치우쳐 있으면 눈에는 여전히 밀려 보인다.
그래서 캡처 픽셀에서 판(주황 #D47D14 · 금테 #FDC532) 안의 «주황·금색이 아닌» 픽셀 =
다이아 잉크(하늘색 몸통 + 검정 외곽)의 bbox 를 재고, 판 중심과의 Δ 를 낸다.

기준(측정표 151 §7-1 · §10): 레퍼런스는 뱃지 44×43 안에 젬 25×24 가 «거의 정중앙»
(ref Δ = +0.5, +0.5). 카드 폭 환산 k = 978/474 = 2.0633 → 판 91 · 젬 잉크 52×50.

실행: python3 tools/scan207.py docs/review/207-r1.png
"""
import sys
from pydep937 import np
from pydep937 import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/207-r1.png'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = a.shape

# probe207 실측 판 rect(앱 좌표 = 프레임 좌표). 캡처 높이(2280) 밖은 건너뛴다.
PLATES = [
    ('noads/rb1',   361,  856, 91, 91),
    ('noads/rb2',   451,  974, 91, 91),
    ('abless/rb1',  401, 1587, 91, 91),
    ('abless/rb2',  457, 1721, 91, 91),
    ('offplus/rb1', 401, 2351, 91, 91),
    ('offplus/rb2', 457, 2485, 91, 91),
]

K = 978 / 474.0
REF_W, REF_H = 25 * K, 24 * K      # 젬 하늘색 코어 환산 (≈51.6 × 49.5)

print('src %s  %dx%d   ref 젬 잉크 ≈ %.1f × %.1f (측정표 §7-1 25×24 ×%.4f)'
      % (SRC, W, H, REF_W, REF_H, K))
print('%-13s %-22s %-22s %-16s %s' % ('리본', '판 중심', '잉크 bbox', '잉크 중심Δ', '잉크 크기'))

for name, x, y, w, h in PLATES:
    if y + h > H or x + w > W:
        print('%-13s (캡처 밖 — 스크롤 아래)' % name)
        continue
    # 테두리 6px 안쪽만 본다 — 금테를 잉크로 세지 않기 위해
    b = 6
    win = a[y + b:y + h - b, x + b:x + w - b]
    r, g, bl = win[:, :, 0], win[:, :, 1], win[:, :, 2]
    # 다이아 «하늘색 코어» 만 센다(#2FA7D8·#67D8F7·#CFF6FF — 전부 b ≫ r).
    # 검정 외곽은 빼야 한다: 판이 라운드(r20)라 안쪽 모서리로 뒤(리본 검정 테·카드 바탕)가
    # 비쳐 보여 검정을 세면 bbox 가 판 안쪽 상자 전체(79)로 벌어진다 — 실제로 그렇게 나왔다.
    # 레퍼런스 실측(§7-1 «젬 아이콘(하늘색) 25×24») 도 하늘색 코어 기준이라 축이 맞는다.
    ink = (bl > r + 30) & (bl > 110)
    ys, xs = np.nonzero(ink)
    if len(xs) == 0:
        print('%-13s 잉크 0 — 판 안이 비었다?' % name)
        continue
    ix0, ix1, iy0, iy1 = xs.min(), xs.max(), ys.min(), ys.max()
    iw, ih = ix1 - ix0 + 1, iy1 - iy0 + 1
    # 판 안쪽 상자(79×79) 중심 대비 잉크 중심 Δ
    dx = (ix0 + ix1 + 1) / 2 - (w - 2 * b) / 2
    dy = (iy0 + iy1 + 1) / 2 - (h - 2 * b) / 2
    print('%-13s (%6.1f,%6.1f)      x%3d..%3d y%3d..%3d   Δ %+5.1f,%+5.1f   %d × %d'
          % (name, x + w / 2, y + h / 2, ix0, ix1, iy0, iy1, dx, dy, iw, ih))
