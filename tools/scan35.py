#!/usr/bin/env python3
"""35 스테이지 패스 — 5회차 비평(G·H)의 «엇갈린 수치» 를 제3의 독립 검산으로 정리한다.

비평가 수치는 «어디를 기준으로 쟀는지» 확인 전에는 반영하지 않는다(LESSONS 05-③ · 21-④ · 70-④).
G 와 H 가 같은 요소를 다른 값으로 준 것이 4건 있었다:
  · 자물쇠 우리 값   H «52×38(너무 납작)» vs G «64×78(너무 길다)»  → 방향이 반대다
  · 육각 outer      H «ref 104×112 / 우리 108×113» vs G «ref 91~93×97 / 우리 96×101»
  · 리본            H «메달 ref 80×89» vs G «보라꼬리 ref 47×39»   → 서로 다른 부품
  · 탭 배지 우리 폭  H «무료 64» vs G «무료 96»
이 스크립트는 두 이미지를 **같은 창·같은 마스크**로 스캔해서 그 넷을 결정한다.

    python3 tools/scan35.py [캡처파일명]      기본 docs/review/35-r4.png

세로 변환:
  · 상단 고정 요소 =  frame y = ref y − 84
  · **하단 탭바는 바닥 앵커** 라 변환이 다르다: frame y = ref y − 60 (ref 2161 ↔ cap 2101).
    바 안쪽 상대 위치(«바 본체 상단에서 몇 px») 로 비교하면 이 차이가 사라진다.
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/35-패스-스테이지패스.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/35-r4.png'

ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(int)
REF_H, CAP_H = ref.shape[0], cap.shape[0]

REF_BAR = 2169   # ref 바 본체 상단 (검정 8px 아래)
CAP_BAR = CAP_H - 179 + 8   # 우리 바 본체 상단 (bottom 앵커 179 + 검정 8)


def bbox(img, x0, x1, y0, y1, mask_fn):
    w = img[y0:y1, x0:x1]
    m = mask_fn(w)
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (x0 + int(xs.min()), x0 + int(xs.max()), y0 + int(ys.min()), y0 + int(ys.max()))


def wh(b):
    return None if b is None else (b[1] - b[0] + 1, b[3] - b[2] + 1)


def row(name, rb, cb, ry_base=None, cy_base=None):
    """ry_base/cy_base 를 주면 «그 기준선에서 몇 px» 로 세로를 비교한다(바닥 앵커용)."""
    rw = wh(rb); cw = wh(cb)
    if rb is None or cb is None:
        print(f'  {name:<26} ref={rb} cap={cb}   ← 스캔 실패')
        return
    dw = (cw[0] - rw[0]) / rw[0] * 100
    dh = (cw[1] - rw[1]) / rw[1] * 100
    if ry_base is None:
        rtop, ctop = rb[2] - 84, cb[2]
        tag = 'top(frame)'
    else:
        rtop, ctop = rb[2] - ry_base, cb[2] - cy_base
        tag = 'top(기준선+)'
    print(f'  {name:<26} ref {rw[0]:>4}×{rw[1]:<4} cap {cw[0]:>4}×{cw[1]:<4} '
          f'Δw {dw:+6.1f}%  Δh {dh:+6.1f}%   {tag} ref {rtop:>5} cap {ctop:>5} '
          f'(Δ{ctop - rtop:+d})   cx ref {(rb[0] + rb[1]) / 2:.1f} cap {(cb[0] + cb[1]) / 2:.1f}')


# ── 마스크들 ────────────────────────────────────────────────────────────────
def bright(thr):
    return lambda w: w.min(axis=2) > thr


def notbg(bg, tol=60):
    """배경색에서 tol 이상 떨어진 픽셀 = 그려진 것."""
    bg = np.array(bg)
    return lambda w: np.abs(w - bg).sum(axis=2) > tol


def rowbg(tol=110):
    """**행별** 배경색(그 행의 중앙값)에서 떨어진 픽셀만 잉크로 본다.

    탭 셀·헤더 밴드는 배경이 세로 그라디언트(inset 그림자·톤 계단)라 단일 배경색으로 빼면
    아래쪽 행이 통째로 «잉크» 로 잡힌다(1차 스캔이 창 높이 105 를 그대로 돌려준 이유).
    """
    def f(w):
        # 배경 표본은 **창 좌우 가장자리 8열** 이다. 행 전체의 중앙값을 쓰면
        # 잉크가 행의 절반을 넘는 구간(ref 탭 아이콘이 그렇다)에서 «잉크 = 배경» 이 돼 마스크가 뒤집힌다.
        edge = np.concatenate([w[:, :8], w[:, -8:]], axis=1)
        med = np.median(edge, axis=1)[:, None, :]       # (h,1,3) 행별 배경
        return np.abs(w - med).sum(axis=2) > tol
    return f


def green(w):     # 체크 #8FFF45
    return (w[:, :, 1] > 170) & (w[:, :, 0] < w[:, :, 1] - 40) & (w[:, :, 2] < w[:, :, 1] - 40)


def gold(w):      # 육각 채움 #FDD41A / 메달 #FBCE1B
    return (w[:, :, 0] > 165) & (w[:, :, 1] > 105) & (w[:, :, 2] < 150)


def purple(w):    # 리본 꼬리 #7A3FD0
    return (w[:, :, 2] > 130) & (w[:, :, 2] > w[:, :, 1] + 45) & (w[:, :, 0] < 190)


print(f'REF {REF}  CAP {CAP}\n')

# ── 1. 하단 탭바 (바닥 앵커 — 바 본체 상단 기준 상대 비교) ───────────────────
print('[1] 하단 패스 탭바 — «바 본체 상단에서 몇 px» 로 비교 (24px 잔차 무관)')
BAR_CELLS = [   # 이름, x0, x1 (35 스테이지 활성 기준, 측정표 §3-1)
    ('스테이지(활성)', 200, 489),
    ('보물상자', 494, 684),
    ('시련의탑', 690, 880),
    ('출석', 884, 1075),
]
for nm, x0, x1 in BAR_CELLS:
    # 아이콘 구간: 바 본체 상단 +0..+105 / 라벨 구간: +105..+160
    rb = bbox(ref, x0, x1, REF_BAR, REF_BAR + 105, rowbg(120))
    cb = bbox(cap, x0, x1, CAP_BAR, CAP_BAR + 105, rowbg(120))
    row(f'아이콘 {nm}', rb, cb, REF_BAR, CAP_BAR)
for nm, x0, x1 in BAR_CELLS:
    rb = bbox(ref, x0, x1, REF_BAR + 105, REF_BAR + 166, bright(200))
    cb = bbox(cap, x0, x1, CAP_BAR + 105, CAP_BAR + 166, bright(200))
    row(f'라벨(흰코어) {nm}', rb, cb, REF_BAR, CAP_BAR)

# ── 2. 헤더 밴드 배지 (상단 고정 — ref−84) ──────────────────────────────────
print('\n[2] 무료/프리미엄 헤더 배지 (측정표 §3-2: 125×89 @cx82 / 125×108 @cx623)')
row('무료 배지', bbox(ref, 0, 210, 655, 788, rowbg(110)), bbox(cap, 0, 210, 571, 704, rowbg(110)))
row('프리미엄 배지', bbox(ref, 545, 710, 655, 788, rowbg(110)), bbox(cap, 545, 710, 571, 704, rowbg(110)))

# ── 3. 보상 칸 오버레이 (체크 · 자물쇠) ─────────────────────────────────────
print('\n[3] 보상 칸 오버레이 — R1 (ref 행 상단 787.7 → 칸 ref y823.7..980.7)')
row('수령완료 ✓ (무료 R1)', bbox(ref, 181, 339, 820, 990, green), bbox(cap, 181, 339, 736, 906, green))
# ⚠ 창을 칸 안쪽까지 넓히면 **칸 아이템 아이콘의 밝은 픽셀**이 같이 잡힌다(5회차에 우리 자물쇠가
# 67×73 → 76×77 로 «커졌다» 고 나온 원인). 아이콘 잉크는 칸 중심 ±44 이므로 x968 부터 스캔한다.
row('자물쇠 (프리미엄#2 R1)', bbox(ref, 968, 1045, 780, 880, bright(150)),
    bbox(cap, 968, 1045, 696, 796, bright(150)))

# ── 4. 육각 배지 (금색 채움) ────────────────────────────────────────────────
print('\n[4] 스파인 육각 — 금색 채움 bbox (검정 외곽선 제외)')
for i, ry in enumerate([847, 1077, 1307]):
    row(f'육각 R{i + 1} 채움', bbox(ref, 470, 610, ry - 70, ry + 70, gold),
        bbox(cap, 470, 610, ry - 84 - 70, ry - 84 + 70, gold))

# ── 5. 프리미엄 구매 버튼 리본 클러스터 ─────────────────────────────────────
print('\n[5] 리본 배지 (측정표 §1-5: 잉크 117×120 @ref x563..679 y440..559)')
row('리본 금메달', bbox(ref, 545, 700, 420, 580, gold), bbox(cap, 545, 700, 336, 496, gold))
row('리본 보라꼬리', bbox(ref, 545, 700, 420, 580, purple), bbox(cap, 545, 700, 336, 496, purple))
row('리본 흰날개', bbox(ref, 545, 700, 420, 580, bright(225)), bbox(cap, 545, 700, 336, 496, bright(225)))

# ── 6. 히어로 텍스트 (잉크 높이) ────────────────────────────────────────────
print('\n[6] 히어로 텍스트 코어 (흰 코어 / 노랑 코어)')
row('타이틀 «스테이지 패스 1»', bbox(ref, 40, 560, 175, 265, bright(225)),
    bbox(cap, 40, 560, 91, 181, bright(225)))
yellow = lambda w: (w[:, :, 0] > 200) & (w[:, :, 1] > 190) & (w[:, :, 2] < 170)
row('부제 L1', bbox(ref, 40, 560, 285, 329, yellow), bbox(cap, 40, 560, 201, 245, yellow))
row('부제 L2', bbox(ref, 40, 560, 330, 372, yellow), bbox(cap, 40, 560, 246, 288, yellow))
row('스탯 라벨', bbox(ref, 100, 430, 480, 534, yellow), bbox(cap, 100, 430, 396, 450, yellow))
row('스탯 값 79', bbox(ref, 200, 330, 535, 585, yellow), bbox(cap, 200, 330, 451, 501, yellow))
row('가격 ₩14,900', bbox(ref, 700, 950, 540, 585, bright(225)), bbox(cap, 700, 950, 456, 501, bright(225)))
row('라벨 프리미엄 활성화', bbox(ref, 630, 980, 476, 535, bright(225)),
    bbox(cap, 630, 980, 392, 451, bright(225)))
