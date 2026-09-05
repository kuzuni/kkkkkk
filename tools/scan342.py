# 작업 342 — 03 던전 카드 «내부 세로 리듬» 을 ref/cap 에서 **같은 마스크로 동시에** 재는 스캐너.
#
#   python3 tools/scan342.py [캡처경로]
#
# 왜 스캐너인가 — 등재문(72 18회차 AP·AQ)의 세 지적은 두 사람 수치가 갈린다
# (ⓐ «−5px» ↔ «−6px» · ⓑ «패딩 50→68» ↔ «52→87»). 338 규칙대로 **처방을 따르기 전에
# 재현**하고, 눈이 아니라 픽셀로 못박는다. 두 이미지에 **똑같은 마스크**를 쓰는 것이
# 이 파일의 존재 이유다(LESSONS 12 1차 3회차).
#
# 좌표계 — 카드 리스트는 **상단 앵커**다(335 «앵커가 둘» 정오표): cap_y = ref_y − 84.
#          (서브탭 바·앱 탭바만 −60 이다. 여기서는 쓰지 않는다.)
from pydep937 import Image
import sys

REF = 'docs/ref/03-던전-팝업.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/342-r0.png'
OFF = 84                              # 카드 리스트 = 상단 앵커

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')
print('ref', ref.size, '/ cap', cap.size, '  (카드 리스트 상단 앵커 cap_y = ref_y − %d)' % OFF)

# 카드 상변 (ref 절대) — 측정표 03 §3-1
CARD_REF = {1: 241, 2: 601}


# ── 마스크 ────────────────────────────────────────────────────────────────
# 던전명: #FDFF84 (253,255,132) 단색. 카드 배경(자주/초록)·검정 외곽선과 «밝고 노랗다» 로 갈린다.
def YELLOW(c):
    r, g, b = c
    # ⚠ «밝고 노랗다» 만으로는 모자란다 — 골드 던전의 배경 입자 레이어(121 `.bgm`, 레퍼런스에
    #   **없는** 우리 쪽 연출)가 (225,190,126) 같은 «따뜻한 금색» 이라 같이 걸린다(1회차 자체 오측).
    #   던전명 #FDFF84 는 g−b 가 123 인 **초록빛 노랑**이고 r≈g 다. 그 둘로 가른다.
    return r >= 190 and g >= 190 and g - b >= 90 and abs(r - g) <= 25


# 알약 라벨: 카드1 #BB89A4 (187,137,164) · 카드2 #A5CBB2 (165,203,178).
# 알약 면(카드1 #28121E · 카드2 #041F18)보다 **훨씬 밝다**. 외곽선 없음.
def PILLTXT(c):
    r, g, b = c
    return min(c) >= 105 and max(c) <= 245 and (r + g + b) >= 380


def bbox(im, x0, x1, y0, y1, f, minc=2):
    """열·행 각각 «잉크 minc 개 이상» 인 것만 남긴다 — JPEG 의 흩뿌린 1px 잡음을 버린다."""
    px = im.load()
    cols, rows = {}, {}
    for y in range(max(0, y0), min(im.size[1], y1)):
        for x in range(max(0, x0), min(im.size[0], x1)):
            if f(px[x, y]):
                cols[x] = cols.get(x, 0) + 1
                rows[y] = rows.get(y, 0) + 1
    cx = [x for x, n in cols.items() if n >= minc]
    ry = [y for y, n in rows.items() if n >= minc]
    if not cx or not ry:
        return None
    return (min(cx), max(cx), min(ry), max(ry))


def show(tag, bb, base_y, base_x=50):
    if bb is None:
        print('   %-22s 잉크 0px' % tag)
        return None
    x0, x1, y0, y1 = bb
    print('   %-22s x %4d~%4d (w %3d)  y %4d~%4d (h %3d)   카드기준 x+%d y+%d'
          % (tag, x0, x1, x1 - x0 + 1, y0, y1, y1 - y0 + 1, x0 - base_x, y0 - base_y))
    return bb


def delta(name, r, c, rb, cb):
    """ref/cap 를 카드 기준 상대좌표로 환산해 Δ 를 찍는다."""
    if r is None or c is None:
        print('   %-22s 비교 불가' % name)
        return
    rr = (r[0] - 50, r[1] - 50, r[2] - rb, r[3] - rb)
    cc = (c[0] - 50, c[1] - 50, c[2] - cb, c[3] - cb)
    dw = (cc[1] - cc[0]) - (rr[1] - rr[0])
    dh = (cc[3] - cc[2]) - (rr[3] - rr[2])
    print('   %-22s Δ좌%+d 우%+d 상%+d 하%+d   폭 %d→%d (%+.1f%%)  높이 %d→%d (%+.1f%%)'
          % (name, cc[0] - rr[0], cc[1] - rr[1], cc[2] - rr[2], cc[3] - rr[3],
             rr[1] - rr[0] + 1, cc[1] - cc[0] + 1, 100.0 * dw / (rr[1] - rr[0] + 1),
             rr[3] - rr[2] + 1, cc[3] - cc[2] + 1, 100.0 * dh / (rr[3] - rr[2] + 1)))


print('\n══ ⓐ 던전명 잉크(스트로크 포함 bbox — 노란 잉크만 세면 스트로크 밖은 안 든다) ══')
title = {}
for n, rb in CARD_REF.items():
    cb = rb - OFF
    print(' 카드%d' % n)
    # ⚠ 창을 좁게 잡는다 — y 를 +115 아래로 열면 **알약 안 골드 코인 링**(#FFE92D, ref y360~412)이
    #   같은 노랑 마스크에 걸려 카드1 이 오염된다(1회차 자체 오측). x 도 썸네일 액자(693~) 앞에서 끊는다.
    r = show('ref  던전명', bbox(ref, 60, 660, rb + 20, rb + 112, YELLOW), rb)
    c = show('cap  던전명', bbox(cap, 60, 660, cb + 20, cb + 112, YELLOW), cb)
    delta('Δ (카드기준)', r, c, rb, cb)
    title[n] = (r, c, rb, cb)

def pill_right(im, base_y):
    """알약 «면» 의 우단을 픽셀로 찾는다 — 342 이후 캡슐은 글자를 감싸며 자라므로
       «ref 429» 같은 상수로 재면 우리 쪽을 못 잰다.

       ⚠ 1회차 자체 오측 — 처음엔 «알약 중심 행이 그 위 40px 보다 어두운가» 로 쟀다.
       라벨 글자(밝은 잉크)와 카드 배경 그라데이션이 같이 걸려 453/602 처럼 엉뚱한 값이 나왔다.
       쓰는 것은 **알약 상변의 계단**이다 — 같은 열에서 알약 «안»(+126)이 알약 «위»(+114)보다
       어두우면 그 열은 캡슐 안이다. 면이 rgba(0,0,0,.58) 오버레이라 배경 무늬가 무엇이든
       그 계단은 남는다. 글자·무늬가 만드는 한두 칸 구멍은 «12px 이상 끊길 때만 끝» 으로 넘긴다."""
    px = im.load()
    yin, yout = base_y + 126, base_y + 114
    last, gap = None, 0
    for x in range(148, 720):
        if sum(px[x, yin]) + 40 < sum(px[x, yout]):
            last, gap = x, 0
        elif last is not None:
            gap += 1
            if gap >= 12:
                break
    return last


print('\n══ ⓑ 알약 라벨 잉크 + 우측 여백 (알약 «면» 우단은 픽셀로 찾는다 — 342 이후 캡슐은 가변) ══')
for n, rb in CARD_REF.items():
    cb = rb - OFF
    print(' 카드%d' % n)
    r = show('ref  알약 라벨', bbox(ref, 170, 470, rb + 118, rb + 168, PILLTXT), rb)
    c = show('cap  알약 라벨', bbox(cap, 170, 470, cb + 118, cb + 168, PILLTXT), cb)
    delta('Δ (카드기준)', r, c, rb, cb)
    pr, pc = pill_right(ref, rb), pill_right(cap, cb)
    print('   %-22s ref %s (카드+%s)   cap %s (카드+%s)'
          % ('알약 면 우단', pr, pr - 50 if pr else '?', pc, pc - 50 if pc else '?'))
    if r and c and pr and pc:
        print('   %-22s ref %3d px  →  cap %3d px  (%+d)'
              % ('알약 우측 여백', pr - r[1], pc - c[1], (pc - c[1]) - (pr - r[1])))

print('\n══ ⓐ-2 타이틀 하변 ↔ 알약 상변 간격 (등재문 «27 → 35px») ══')
for n, rb in CARD_REF.items():
    cb = rb - OFF
    t = title[n]
    # 알약 상변은 면(fill)의 상변 = 카드기준 +121 (측정표 §3-4) — 두 쪽 다 같은 규칙으로 잡는다.
    if t[0] and t[1]:
        print('   카드%d  ref %3d px   cap %3d px   (%+d)'
              % (n, (rb + 121) - t[0][3] - 1, (cb + 121) - t[1][3] - 1,
                 ((cb + 121) - t[1][3]) - ((rb + 121) - t[0][3])))
