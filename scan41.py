# 41 — 팝업 내장 재화 바: 레퍼런스(1080x2340) vs 캡처(1080x1920) 픽셀 대조.
#   python3 scan41.py docs/review/41-r1-dun.png
# 세로 변환은 ref y - 84 (02 비고 1). 가로는 1:1.
import sys
from PIL import Image

CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/41-r1-dun.png'
OFF = 84


def load(p):
    return Image.open(p).convert('RGB').load()


ref = load('docs/ref/03-던전-팝업.jpg')
cap = load(CAP)


def col_transitions(p, x, y0, y1, thr=10):
    prev = None
    out = []
    for y in range(y0, y1):
        c = p[x, y]
        if prev is None or max(abs(a - b) for a, b in zip(c, prev)) > thr:
            out.append((y, c))
            prev = c
    return out


def bbox(p, x0, x1, y0, y1, fn):
    xs = []
    ys = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if fn(p[x, y]):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys), len(xs))


white = lambda c: c[0] > 195 and c[1] > 195 and c[2] > 195
gold = lambda c: c[0] > 140 and c[1] > 80 and c[2] < 120 and c[0] - c[2] > 70
cyan = lambda c: c[2] > 140 and c[2] - c[0] > 60
nonbg = lambda c: max(abs(c[0] - 35), abs(c[1] - 26), abs(c[2] - 19)) > 28

rows = []


def cmp(name, r, c, tol=2):
    """r/c = (x0,y0,x1,y1) ref 절대 / 캡처 프레임 좌표. ref y 는 -84 해서 비교."""
    if r is None or c is None:
        rows.append((name, r, c, 'MISSING'))
        return
    rr = (r[0], r[1] - OFF, r[2], r[3] - OFF)
    d = [c[i] - rr[i] for i in range(4)]
    dw = (c[2] - c[0]) - (rr[2] - rr[0])
    dh = (c[3] - c[1]) - (rr[3] - rr[1])
    st = 'OK' if max(abs(v) for v in d) <= tol else 'FAIL'
    rows.append((name, 'ref %s' % (rr,), 'cap %s' % (c,), '%s  d=%s dw=%+d dh=%+d' % (st, d, dw, dh)))


print('=== 바 배경 세로 프로파일 (x=200) ===')
print(' ref:', [(y - OFF, c) for y, c in col_transitions(ref, 200, 85, 195)])
print(' cap:', col_transitions(cap, 200, 0, 112))

# 알약(플레이트) 세로 범위 — 아이콘·글자가 없는 열에서 잰다
def plate_rows(p, x, y0, y1, bg):
    ys = [y for y in range(y0, y1) if max(abs(a - b) for a, b in zip(p[x, y], bg)) > 18]
    return (min(ys), max(ys)) if ys else None


rp = plate_rows(ref, 1000, 100, 182, (66, 54, 42))
cp = plate_rows(cap, 1000, 16, 98, (66, 54, 42))
print('\n=== 다이아 알약 세로(x=1000) ===')
print(' ref y %s (h=%d) → 프레임 %s' % (rp, rp[1] - rp[0] + 1, (rp[0] - OFF, rp[1] - OFF)))
print(' cap y %s (h=%d)' % (cp, cp[1] - cp[0] + 1))

# 알약 우단
def plate_right(p, y, x0, x1, bg):
    last = None
    for x in range(x0, x1):
        if max(abs(a - b) for a, b in zip(p[x, y], bg)) > 18:
            last = x
    return last


print('\n=== 알약 우단 ===')
for nm, rx, cx, ry, cy in (('골드', 700, 700, 139, 55), ('다이아', 1000, 1000, 139, 55)):
    r = plate_right(ref, ry, rx, 1079, (66, 54, 42))
    c = plate_right(cap, cy, cx, 1079, (66, 54, 42))
    print(' %s ref %s / cap %s  Δ%+d' % (nm, r, c, c - r))

print('\n=== 아이콘 잉크 bbox ===')
r = bbox(ref, 470, 600, 95, 185, gold)
c = bbox(cap, 470, 600, 11, 101, gold)
print(' 골드 ref', r, '→ 프레임', (r[0], r[1] - OFF, r[2], r[3] - OFF), 'w%d h%d' % (r[2] - r[0] + 1, r[3] - r[1] + 1))
print(' 골드 cap', c, 'w%d h%d' % (c[2] - c[0] + 1, c[3] - c[1] + 1))
cmp('골드아이콘', r[:4], c[:4], 3)
r = bbox(ref, 780, 880, 95, 185, cyan)
c = bbox(cap, 780, 880, 11, 101, cyan)
print(' 다이아 ref', r, '→ 프레임', (r[0], r[1] - OFF, r[2], r[3] - OFF), 'w%d h%d' % (r[2] - r[0] + 1, r[3] - r[1] + 1))
print(' 다이아 cap', c, 'w%d h%d' % (c[2] - c[0] + 1, c[3] - c[1] + 1))
cmp('다이아아이콘', r[:4], c[:4], 3)

print('\n=== 숫자 흰 잉크 bbox ===')
r = bbox(ref, 565, 760, 116, 162, white)
c = bbox(cap, 565, 760, 32, 78, white)
print(' 골드 ref', r, '→ 프레임', (r[0], r[1] - OFF, r[2], r[3] - OFF), 'w%d h%d' % (r[2] - r[0] + 1, r[3] - r[1] + 1))
print(' 골드 cap', c, 'w%d h%d' % (c[2] - c[0] + 1, c[3] - c[1] + 1))
cmp('골드숫자', r[:4], c[:4], 3)
r = bbox(ref, 865, 1060, 116, 162, white)
c = bbox(cap, 865, 1060, 32, 78, white)
print(' 다이아 ref', r, '→ 프레임', (r[0], r[1] - OFF, r[2], r[3] - OFF), 'w%d h%d' % (r[2] - r[0] + 1, r[3] - r[1] + 1))
print(' 다이아 cap', c, 'w%d h%d' % (c[2] - c[0] + 1, c[3] - c[1] + 1))
cmp('다이아숫자', r[:4], c[:4], 3)

print('\n=== 판정표 ===')
bad = 0
for n, a, b, s in rows:
    print(' %-14s %-28s %-28s %s' % (n, a, b, s))
    if 'FAIL' in s or 'MISSING' in s:
        bad += 1
print('\n%s (%d FAIL)' % ('SCAN41 PASS' if bad == 0 else 'SCAN41 FAIL', bad))
