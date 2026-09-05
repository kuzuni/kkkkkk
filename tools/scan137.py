# 137 — 19 프로필 «잠금 칭호» 카드에서 자물쇠와 칭호 글자의 관계를 레퍼런스에서 실측한다.
#   python3 tools/scan137.py                 → 레퍼런스 8칸 스캔
#   python3 tools/scan137.py <캡처.png>      → 캡처(1080x2280)도 같은 알고리즘으로 스캔
#   python3 tools/scan137.py dump <k> [cap]  → k 번 카드의 열별 프로파일 원자료
#
# 좌표: ref 1080x2340 · cap 1080x2280 · 가로 1:1 · cap y = ref y - 84.
# 카드 격자(measure/19 §5-2): 1열 x 180..529 · 2열 x 550..899 · 1행 y 1031..1107 · 세로 pitch 100.
# 배너(§5-3): 카드 상대 left 26 · top 11 · 298x57. 위·아래 6px 은 베벨/검정 외곽이라 뺀다.
#
# 자물쇠 몸통은 «세로로 굵은 흰 덩어리»(열별 흰 픽셀 ≥ 18), 글자 잉크는 그보다 얇다.
import sys
from pydep937 import Image

REF = 'docs/ref/19-프로필-팝업.jpg'
CARD_W, CARD_H = 350, 77
COLS = (180, 550)
ROW0, PITCH = 1031, 100
ROWS = 4
BN_X, BN_W = 26, 298            # 배너(카드 상대)
IN_Y0, IN_Y1 = 11 + 8, 11 + 57 - 8   # 배너 안쪽(베벨·외곽 제외)


def cards(dy):
    return [(COLS[c], ROW0 + PITCH * r - dy) for r in range(ROWS) for c in range(2)]


def profiles(img, x0, y0):
    """배너 안쪽에서 «흰 덩어리»(자물쇠)와 «잉크»(글자) 열 투영."""
    px, (W, H) = img.load(), img.size
    white = [0] * BN_W
    ink = [0] * BN_W
    for i in range(BN_W):
        x = x0 + BN_X + i
        if not (0 <= x < W):
            continue
        for y in range(y0 + IN_Y0, y0 + IN_Y1):
            if not (0 <= y < H):
                continue
            r, g, b = px[x, y][:3]
            mn, mx = min(r, g, b), max(r, g, b)
            if mn >= 200 and mx - mn <= 45:
                white[i] += 1
            # 글자 잉크: 배너 fill(가장 밝아야 132 수준) 보다 밝은 회색~흰색
            if mn >= 120:
                ink[i] += 1
    return white, ink


def span(prof, thr):
    idx = [i for i, v in enumerate(prof) if v >= thr]
    return (idx[0], idx[-1]) if idx else None


def scan(img, x0, y0, name):
    white, ink = profiles(img, x0, y0)
    lk = span(white, 18)
    print(f'{name}: card x{x0} y{y0}')
    if lk:
        w = lk[1] - lk[0] + 1
        # 카드 상대(배너 기준 → 카드 기준)
        print(f'   자물쇠 x(카드) {BN_X+lk[0]}..{BN_X+lk[1]} w{w} 중심 {BN_X+(lk[0]+lk[1])/2:.1f}')
    else:
        print('   자물쇠 없음')
    lo, hi = (lk if lk else (10**9, -1))
    txt = [i for i, v in enumerate(ink) if v >= 2 and not (lo - 2 <= i <= hi + 2)]
    if txt:
        # 연속 구간으로 묶어 글자 덩어리를 본다
        runs, s = [], txt[0]
        for a, b in zip(txt, txt[1:]):
            if b - a > 6:
                runs.append((s, a)); s = b
        runs.append((s, txt[-1]))
        runs = [r for r in runs if r[1] - r[0] >= 3]
        if runs:
            print('   글자 덩어리(카드 기준): ' + ' · '.join(f'{BN_X+a}..{BN_X+b}' for a, b in runs))
            a, b = runs[0][0], runs[-1][1]
            print(f'   글자 전체 {BN_X+a}..{BN_X+b} w{b-a+1} 중심 {BN_X+(a+b)/2:.1f}')
    return lk


def dump(img, x0, y0):
    white, ink = profiles(img, x0, y0)
    for i in range(BN_W):
        if white[i] or ink[i]:
            print(f'  카드x {BN_X+i:3d}  white {white[i]:3d}  ink {ink[i]:3d}')


def main():
    a = sys.argv[1:]
    if a and a[0] == 'dump':
        k = int(a[1])
        if len(a) > 2:
            im = Image.open(a[2]).convert('RGB'); x, y = cards(84)[k]
        else:
            im = Image.open(REF).convert('RGB'); x, y = cards(0)[k]
        dump(im, x, y)
        return
    ref = Image.open(REF).convert('RGB')
    print('=== REF (1080x2340) ===')
    for k, (x, y) in enumerate(cards(0)):
        scan(ref, x, y, f'ref#{k}')
    if a:
        im = Image.open(a[0]).convert('RGB')
        print(f'\n=== CAP {a[0]} ({im.size[0]}x{im.size[1]}) ===')
        for k, (x, y) in enumerate(cards(84)):
            scan(im, x, y, f'cap#{k}')


main()
