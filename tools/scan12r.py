# 12 2차 폴리시 라운드 — 레퍼런스와 캡처를 **같은 마스크**로 동시에 재는 스캐너.
# (LESSONS: «누구를 믿느냐»가 아니라 «같은 마스크로 두 이미지를 동시에 재라»)
#   ref  1080x2340 (상단 84px 상태바)  /  cap 1080x2280
#   상단 앵커: cap_y = ref_y - 84   ·   하단 앵커: cap_y = ref_y - 60
import sys
from PIL import Image

REF = 'docs/ref/12-소환-결과-팝업.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/12-r4b.png'

ref = Image.open(REF).convert('RGB'); cap = Image.open(CAP).convert('RGB')

def near(p, c, t):
    return abs(p[0]-c[0]) <= t and abs(p[1]-c[1]) <= t and abs(p[2]-c[2]) <= t

def runs_row(im, y, pred, x0=0, x1=1080):
    """y 행에서 pred 를 만족하는 최장 연속 구간 (좌, 우, 길이)"""
    best = None; s = None
    for x in range(x0, x1):
        if pred(im.getpixel((x, y))):
            if s is None: s = x
        else:
            if s is not None:
                if best is None or x-s > best[2]: best = (s, x-1, x-s)
                s = None
    if s is not None and (best is None or x1-s > best[2]): best = (s, x1-1, x1-s)
    return best

def runs_col(im, x, pred, y0, y1):
    best = None; s = None
    for y in range(y0, y1):
        if pred(im.getpixel((x, y))):
            if s is None: s = y
        else:
            if s is not None:
                if best is None or y-s > best[2]: best = (s, y-1, y-s)
                s = None
    if s is not None and (best is None or y1-s > best[2]): best = (s, y1-1, y1-s)
    return best

def bbox(im, pred, x0, x1, y0, y1):
    xs = []; ys = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pred(im.getpixel((x, y))): xs.append(x); ys.append(y)
    if not xs: return None
    return (min(xs), min(ys), max(xs)-min(xs)+1, max(ys)-min(ys)+1)

def show(name, r, c, off):
    """r=(ref 값 튜플) c=(cap 값) off=세로 보정(84 or 60). y 계열은 ref_y-off 로 비교."""
    print(f'{name:34s} ref={r}  cap={c}')

ORANGE = lambda p: p[0] > 200 and 130 < p[1] < 215 and p[2] < 130
PANEL  = lambda p: near(p, (42, 40, 53), 14)
BLACK  = lambda p: max(p) < 26
WHITEI = lambda p: min(p) > 175

print('== 리본 밴드 (주황) ==')
# ref 밴드 y 725~811 (=ref 641+84 ..) → 캡처 641~727. 밴드 중앙 행에서 가로 run.
rb_r = runs_row(ref, 770, ORANGE); rb_c = runs_row(cap, 770-84, ORANGE)
show('밴드 가로 run(중앙행)', rb_r, rb_c, 84)
# 밴드 세로: 밴드 중앙 x=540 열
rv_r = runs_col(ref, 540, ORANGE, 700, 860); rv_c = runs_col(cap, 540-84, ORANGE, 700-84, 860-84)
show('밴드 세로 run(x=540)', rv_r, rv_c, 84)

print('== 검은 결과 패널 ==')
# 패널: x=20 열(카드 없음)에서 세로 run
pv_r = runs_col(ref, 12, PANEL, 760, 1400); pv_c = runs_col(cap, 12, PANEL, 760-84, 1400-84)
show('패널 세로 run(x=12)', pv_r, pv_c, 84)

print('== 카드 그리드 (검정 외곽선 열 위치) ==')
for ry in (894, 1064):
    rr = [x for x in range(0, 1080) if BLACK(ref.getpixel((x, ry)))]
    cc = [x for x in range(0, 1080) if BLACK(cap.getpixel((x, ry-84)))]
    def edges(v):
        out = []; prev = -9
        for x in v:
            if x != prev+1: out.append(x)
            prev = x
        return out
    print(f'  y{ry}: ref 카드좌단 {edges(rr)[:8]}')
    print(f'         cap 카드좌단 {edges(cc)[:8]}')

print('== 하단 버튼 3개 (검정 외곽선 bbox) ==')
for i, cx in enumerate((240, 540, 840)):
    bv_r = runs_col(ref, cx, BLACK, 1740, 1940)
    bv_c = runs_col(cap, cx, BLACK, 1740-60, 1940-60)
    show(f'  btn{i+1} 상단 검정 run(x={cx})', bv_r, bv_c, 60)
for ry in (1840,):
    rr = runs_row(ref, ry, BLACK, 100, 1000); cc = runs_row(cap, ry-60, BLACK, 100, 1000)
    show(f'  y{ry} 최장 검정 run', rr, cc, 60)

print('== «터치하여 닫기» 잉크 ==')
br = bbox(ref, WHITEI, 350, 730, 2100, 2185)
bc = bbox(cap, WHITEI, 350, 730, 2100-60, 2185-60)
show('닫기 흰 잉크 bbox(x,y,w,h)', br, bc, 60)

print('== «소환 결과» 잉크 ==')
tr = bbox(ref, WHITEI, 400, 690, 730, 800)
tc = bbox(cap, WHITEI, 400, 690, 730-84, 800-84)
show('타이틀 흰 잉크 bbox', tr, tc, 84)
