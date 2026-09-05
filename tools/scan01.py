# 01 오프라인 보상 팝업 — 레퍼런스와 캡처를 **같은 알고리즘·같은 창·같은 임계값**으로 스캔한다.
#   python3 tools/scan01.py [캡처경로]        (기본 docs/review/01-r5.png)
#
# 좌표: 레퍼런스 1080x2340 · 캡처 1080x2280 · 가로 1:1 · **cap y = ref y - 84**.
# 아래 창(win)은 전부 **레퍼런스 좌표**로 적고, 캡처를 읽을 때만 -84 한다.
#
# LESSONS 반영:
#   55-③ 잉크를 잴 땐 창을 넉넉히, 테두리를 잴 땐 창을 좁게.
#   55-④ 라운드 사각형의 폭·간격은 한 행이 아니라 **전 구간 투영**으로.
#   70-④ 두께는 «순색 코어» 끼리 비교(레퍼런스 JPEG 는 경계마다 AA 가 붙는다).
#   36-④ⓐ 노란 글자는 min(RGB) 로 안 잡힌다 — R·G 만 본다.
import sys
from pydep937 import Image

CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/01-r5.png'
REF = 'docs/ref/01-오프라인보상-팝업.jpg'
DY = 84                                   # ref y - DY = cap y

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')


def proj(img, win, test, dy):
    """창 안에서 test 를 만족하는 픽셀의 열별/행별 개수(전 구간 투영)."""
    x0, y0, x1, y1 = win
    y0, y1 = y0 - dy, y1 - dy
    px = img.load()
    cols = [0] * (x1 - x0)
    rows = [0] * (y1 - y0)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if test(px[x, y]):
                cols[x - x0] += 1
                rows[y - y0] += 1
    return cols, rows


def run(arr, origin, thr):
    idx = [i for i, v in enumerate(arr) if v >= thr]
    if not idx:
        return None
    return (origin + idx[0], origin + idx[-1], idx[-1] - idx[0] + 1)


def measure(name, win, test, thr=2, note=''):
    """ref/cap 을 같은 창·같은 test 로 재고 bbox 와 차이를 찍는다."""
    x0, y0, x1, y1 = win
    out = {}
    for key, img, dy in (('ref', ref, 0), ('cap', cap, DY)):
        cols, rows = proj(img, win, test, dy)
        cx = run(cols, x0, thr)
        cy = run(rows, y0, thr)
        out[key] = (cx, cy)
    (rx, ry), (kx, ky) = out['ref'], out['cap']
    if not (rx and ry and kx and ky):
        print(f'{name:22s} SCAN FAIL  ref={out["ref"]} cap={out["cap"]}')
        return None
    dw, dh = kx[2] - rx[2], ky[2] - ry[2]
    dcx = (kx[0] + kx[1]) / 2 - (rx[0] + rx[1]) / 2
    dcy = (ky[0] + ky[1]) / 2 - (ry[0] + ry[1]) / 2
    flag = '' if (abs(dw) <= 2 and abs(dh) <= 2 and abs(dcx) <= 2 and abs(dcy) <= 2) else '   <-- 편차'
    print(f'{name:22s} ref x{rx[0]}..{rx[1]} y{ry[0]}..{ry[1]} {rx[2]}x{ry[2]}'
          f' | cap x{kx[0]}..{kx[1]} y{ky[0]}..{ky[1]} {kx[2]}x{ky[2]}'
          f' | Δw{dw:+d}({dw/rx[2]*100:+.1f}%) Δh{dh:+d}({dh/ry[2]*100:+.1f}%)'
          f' Δcx{dcx:+.1f} Δcy{dcy:+.1f}{flag}')
    if note:
        print(f'{"":22s} {note}')
    return (rx, ry, kx, ky)


# ---- 픽셀 판정기 -------------------------------------------------------------
def ink_white(p):                    # 흰 글자 코어 (외곽선 검정 제외)
    r, g, b = p
    return r > 200 and g > 200 and b > 200


def ink_dark(p):                     # 검정 외곽선·테두리 코어
    r, g, b = p
    return r < 70 and g < 70 and b < 70


def not_beige(p):                    # 모달 본문 베이지(별무늬 포함) 가 아닌 것
    r, g, b = p
    return not (r > 195 and g > 165 and b > 135 and r > b + 25)


def not_green_frame(p):              # 초록 프레임(본체·밝은 안테) 가 아닌 것
    r, g, b = p
    body = g > r + 25 and g > b + 90
    lite = g > 200 and r > 165 and b < 130
    return not (body or lite)


def ink_yellow(p):                   # 크림·연노랑 글자 (36-④ⓐ — min(RGB) 로는 안 잡힌다)
    r, g, b = p
    return r > 190 and g > 180 and b < 175


def gold(p):                         # 금색 코인·시계 본체 (r 이 g 보다 크거나 같은 따뜻한 색)
    r, g, b = p
    return r >= g - 10 and r > 120 and b < g - 20


print(f'== 01 scan ==  ref={REF}  cap={CAP}  (cap y = ref y - {DY})\n')

print('-- 껍데기 (검정 코어) --')
# 창은 대상 «바깥» 으로 넉넉히 잡되 이웃한 검정(딤·배너 테두리·AD 뱃지)은 창에서 뺀다.
measure('받기 버튼 외곽',   (225, 1220, 505, 1400), ink_dark, thr=6)
measure('1.5배 버튼 외곽',  (600, 1220, 855, 1400), ink_dark, thr=6,
        note='AD 뱃지(x528..592)를 창에서 뺐다 — 뱃지가 버튼 하단 밖으로 나가 높이를 부풀린다')
measure('이동 버튼 외곽',   (640, 1580, 975, 1732), ink_dark, thr=6,
        note='배너 하단 검정 테두리(y1737~)는 창 밖')
measure('구매즉시 알약',    (100, 1665, 480, 1734), ink_dark, thr=6,
        note='배너 좌측(x66..72)·하단(y1737~) 검정 테두리는 창 밖')

print('\n-- 아트 자리 (이모지 잉크가 ref bbox 를 차지하는가) --')
measure('시계 잉크',        (330, 890, 411, 995), not_beige, thr=2,
        note='ref 측정표 §4-3 = 64x73 (356..419 / 905..977). 알약 좌변 411 에서 창을 끊는다')
measure('코인 금색',        (484, 1080, 596, 1180), gold, thr=2,
        note='ref 측정표 §7-2 = 75x76 (503..577 / 1099..1174). 초록 프레임 안이라 «금색» 으로 가른다')

print('\n-- 글자 잉크 (흰 코어) --')
measure('타이틀',           (380, 795, 700, 860), ink_white, thr=2)
measure('알약 텍스트',      (450, 930, 640, 972), ink_white, thr=2)
measure('안내 문구',        (290, 1010, 790, 1060), ink_white, thr=2)
measure('수량 6.49A',       (470, 1175, 610, 1215), ink_white, thr=2)
measure('받기',             (310, 1280, 420, 1335), ink_white, thr=2)
measure('1.5배 받기',       (580, 1280, 800, 1335), ink_white, thr=2)
measure('배너 헤드라인',    (450, 1466, 910, 1520), ink_white, thr=2)
measure('이동',             (745, 1628, 860, 1695), ink_white, thr=2)
measure('구매 즉시 반영!',  (190, 1688, 390, 1728), ink_yellow, thr=2)
