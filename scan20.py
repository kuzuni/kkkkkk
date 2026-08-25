#!/usr/bin/env python3
# 20 스펙 정보 — ref(1080x2340) / cap(1080x2280) 자가 픽셀 스캔.
# 세로 변환: cap_y = ref_y - 84. 가로 1:1.
# 사용: python3 scan20.py [cap경로]
import sys
from PIL import Image

REF = 'docs/ref/20-프로필-팝업-플레이어-스펙-정보.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/20-r5.png'
DY = 84

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')


def px(im):
    return im.load()


R, C = px(ref), px(cap)


def dark(p, t=70):
    return p[0] < t and p[1] < t and p[2] < t


def col_scan(im, P, x, y0, y1, pred):
    """세로 1열에서 pred 를 만족하는 구간 목록"""
    runs, s = [], None
    for y in range(y0, y1):
        ok = pred(P[x, y])
        if ok and s is None:
            s = y
        elif not ok and s is not None:
            runs.append((s, y - 1))
            s = None
    if s is not None:
        runs.append((s, y1 - 1))
    return runs


def row_scan(im, P, y, x0, x1, pred):
    runs, s = [], None
    for x in range(x0, x1):
        ok = pred(P[x, y])
        if ok and s is None:
            s = x
        elif not ok and s is not None:
            runs.append((s, x - 1))
            s = None
    if s is not None:
        runs.append((s, x1 - 1))
    return runs


def ink_bbox(P, x0, x1, y0, y1, pred):
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pred(P[x, y]):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return (min(xs), max(xs), min(ys), max(ys), len(xs))


def sect(t):
    print('\n=== ' + t)


# --- 1. 다이얼로그 바깥 검정 박스 (세로 중앙열 x539)
sect('1. 다이얼로그 검정 외곽 (x=539 세로 스캔)')
for nm, P, y0, y1, off in (('ref', R, 400, 2050, 0), ('cap', C, 316, 1966, DY)):
    runs = col_scan(None, P, 539, y0, y1, lambda p: dark(p, 60))
    runs = [r for r in runs if r[1] - r[0] >= 3]
    print(nm, '검정 런(ref기준 환산):', [(a + off, b + off) for a, b in runs][:6])

# --- 2. 크림 박스 경계 (y=1000ref / 916cap 가로 스캔에서 크림색 구간)
sect('2. 크림 박스 좌우 (크림 #F0D9BA 계열)')


def cream(p):
    return abs(p[0] - 240) < 26 and abs(p[1] - 217) < 26 and abs(p[2] - 186) < 30


for nm, P, y in (('ref', R, 900), ('cap', C, 900 - DY)):
    runs = [r for r in row_scan(None, P, y, 60, 1020, cream) if r[1] - r[0] > 40]
    print(nm, 'y=%d' % y, runs)

# --- 3. 아바타 액자 bbox (검정 외곽)
sect('3. 아바타 액자 (검정 외곽, 탐색창 ref y580-790)')
for nm, P, y0, y1, off in (('ref', R, 580, 790, 0), ('cap', C, 580 - DY, 790 - DY, DY)):
    b = ink_bbox(P, 420, 660, y0, y1, lambda p: dark(p, 55))
    print(nm, 'bbox x%d-%d y%d-%d (w%d h%d) px%d' %
          (b[0], b[1], b[2] + off, b[3] + off, b[1] - b[0] + 1, b[3] - b[2] + 1, b[4]) if b else (nm, None))

# --- 4. 칭호 리본 밴드 (어두운 채움 #433A35)
sect('4. 칭호 리본 밴드 (y 탐색 ref 770-850)')


def rib(p):
    return abs(p[0] - 67) < 34 and abs(p[1] - 58) < 32 and abs(p[2] - 53) < 32


for nm, P, y0, y1, off in (('ref', R, 770, 855, 0), ('cap', C, 770 - DY, 855 - DY, DY)):
    b = ink_bbox(P, 340, 740, y0, y1, lambda p: rib(p) or dark(p, 60))
    print(nm, 'bbox x%d-%d y%d-%d (w%d h%d)' %
          (b[0], b[1], b[2] + off, b[3] + off, b[1] - b[0] + 1, b[3] - b[2] + 1) if b else (nm, None))

# --- 5. 닉네임 스트립 (크림보다 어두운 오버레이)
sect('5. 닉네임 스트립 (크림 대비 어두운 구간, y 중앙 행)')
for nm, P, y, off in (('ref', R, 870, 0), ('cap', C, 870 - DY, DY)):
    runs = [r for r in row_scan(None, P, y, 200, 800, lambda p: not cream(p)) if r[1] - r[0] > 4]
    print(nm, 'y=%d' % y, runs[:8])

# --- 6. 스탯 리스트 컨테이너 + 행 경계 (줄무늬 교대 y)
sect('6. 리스트 컨테이너 좌우 (x 스캔, 밝은 크림 #FEEFD2)')


def lite(p):
    return p[0] > 244 and p[1] > 228 and p[2] > 196


for nm, P, y, off in (('ref', R, 1020, 0), ('cap', C, 1020 - DY, DY)):
    runs = [r for r in row_scan(None, P, y, 100, 1000, lite) if r[1] - r[0] > 50]
    print(nm, 'y=%d' % y, runs)

sect('7. 행 줄무늬 경계 (x=940 근처 여백열 세로 스캔, 밝은/어두운 교대)')
for nm, P, y0, y1, off, xx in (('ref', R, 975, 1740, 0, 930), ('cap', C, 975 - DY, 1740 - DY, DY, 930)):
    edges = []
    prev = None
    for y in range(y0, y1):
        p = P[xx, y]
        cur = 'L' if lite(p) else 'D'
        if prev and cur != prev:
            edges.append(y + off)
        prev = cur
    print(nm, 'x=%d 교대 y:' % xx, edges[:16])

# --- 8. 하단 토글 탭 컨테이너 + 금색 배너
sect('8. 토글 탭 컨테이너 (검정 외곽, 탐색 ref y1760-1890)')
for nm, P, y0, y1, off in (('ref', R, 1755, 1890, 0), ('cap', C, 1755 - DY, 1890 - DY, DY)):
    b = ink_bbox(P, 120, 960, y0, y1, lambda p: dark(p, 60))
    print(nm, 'bbox x%d-%d y%d-%d (w%d h%d)' %
          (b[0], b[1], b[2] + off, b[3] + off, b[1] - b[0] + 1, b[3] - b[2] + 1) if b else (nm, None))

sect('9. 금색 활성 배너 (금색 채움)')


def gold(p):
    return p[0] > 205 and 130 < p[1] < 245 and p[2] < 140


for nm, P, y0, y1, off in (('ref', R, 1770, 1875, 0), ('cap', C, 1770 - DY, 1875 - DY, DY)):
    b = ink_bbox(P, 120, 700, y0, y1, gold)
    print(nm, 'bbox x%d-%d y%d-%d (w%d h%d) px%d' %
          (b[0], b[1], b[2] + off, b[3] + off, b[1] - b[0] + 1, b[3] - b[2] + 1, b[4]) if b else (nm, None))

# --- 10. Gamer Id 잉크
sect('10. Gamer Id 흰 잉크 bbox')


def white(p):
    return p[0] > 225 and p[1] > 225 and p[2] > 225


for nm, P, y0, y1, off in (('ref', R, 545, 585, 0), ('cap', C, 545 - DY, 585 - DY, DY)):
    b = ink_bbox(P, 150, 940, y0, y1, white)
    print(nm, 'bbox x%d-%d y%d-%d (w%d h%d) px%d' %
          (b[0], b[1], b[2] + off, b[3] + off, b[1] - b[0] + 1, b[3] - b[2] + 1, b[4]) if b else (nm, None))

# --- 11. 리스트 1행 좌 라벨 / 우 값 잉크
sect('11. 리스트 행 잉크 (row1 ref y1000-1060)')


def green(p):
    return p[1] > 175 and p[0] < 225 and p[2] < 150 and p[1] - p[2] > 60


for i in range(1, 4):
    ry0, ry1 = 1000 + 60 * (i - 1), 1000 + 60 * i
    for nm, P, off in (('ref', R, 0), ('cap', C, DY)):
        y0, y1 = ry0 - off, ry1 - off
        bl = ink_bbox(P, 150, 560, y0, y1, white)
        bg = ink_bbox(P, 560, 960, y0, y1, green)
        f = lambda b: ('x%d-%d y%d-%d h%d px%d' % (b[0], b[1], b[2] + off, b[3] + off, b[3] - b[2] + 1, b[4])) if b else 'none'
        print('row%d %s 좌:%s | 우:%s' % (i, nm, f(bl), f(bg)))
