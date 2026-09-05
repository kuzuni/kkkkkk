# 작업 337 — `.stab` 라벨 **잉크 bbox** 를 ref/캡처에서 «같은 마스크·같은 문자열» 로 재는 자.
#
#   python3 tools/ink337.py
#
# 등재문 ①(라벨 잉크 −14~21%)의 수치가 비평가마다 갈렸다(−14.3 ~ −21%). 서체가 다른 글자끼리
# 비교하면 갈릴 수밖에 없다 — 07 은 **같은 문자열**(«스킬» 활성 · «장비» 비활성)이 ref 와 우리
# 양쪽에 다 있으므로 서체 차이가 안 끼어드는 유일한 표본이다. 03 «던전» 도 같은 문자열이다.
#
# 좌표계: 서브탭 바는 **하단 앵커** — cap_y = ref_y − 60 (335 정오표).
from pydep937 import Image

OFF = 60

PEACH = lambda c: c[0] >= 150 and c[1] >= 110 and c[2] >= 70 and c[0] > c[2] + 25 and c[0] >= c[1] + 20
GRAY = lambda c: abs(c[0] - c[1]) <= 22 and abs(c[1] - c[2]) <= 22 and 120 <= c[0] <= 210


def bbox(im, x0, x1, y0, y1, f, minc=2):
    """열·행 각각 «잉크 픽셀 minc 개 이상» 인 것만 남긴다 — JPEG 의 흩뿌린 1px 잡음을 버린다."""
    px = im.load()
    cols, rows = {}, {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            if f(px[x, y]):
                cols[x] = cols.get(x, 0) + 1
                rows[y] = rows.get(y, 0) + 1
    cx = [x for x, n in cols.items() if n >= minc]
    ry = [y for y, n in rows.items() if n >= minc]
    if not cx:
        return None
    return (min(cx), max(cx), min(ry), max(ry))


# (이름, ref 파일, ref 창, 마스크, cap 파일, cap 창)
CASES = [
    ('07 활성 «스킬»',   'docs/ref/07-스킬-팝업.jpg', (300, 545, 2035, 2100), PEACH,
     'docs/review/96-full-hero.png', (300, 545, 1975, 2045)),
    ('07 비활성 «장비»', 'docs/ref/07-스킬-팝업.jpg', (80, 290, 2035, 2100), GRAY,
     'docs/review/96-full-hero.png', (80, 290, 1975, 2045)),
    ('03 활성 «던전»',   'docs/ref/03-던전-팝업.jpg', (690, 790, 2035, 2100), PEACH,
     'docs/review/96-full-dun.png', (430, 650, 1975, 2045)),
]

print('작업 337 — 서브탭 라벨 잉크 (ref ↔ cap, 같은 마스크·같은 문자열)')
print('%-18s %-26s %-26s %s' % ('', 'ref (y 는 −60 환산)', 'cap', 'Δ'))
worst = 0.0
for name, rf, rw, mask, cf, cw in CASES:
    ref = Image.open(rf).convert('RGB')
    cap = Image.open(cf).convert('RGB')
    r = bbox(ref, rw[0], rw[1], rw[2], rw[3], mask)
    c = bbox(cap, cw[0], cw[1], cw[2], cw[3], mask)
    if not r or not c:
        print('%-18s 잉크 검출 실패  ref=%s cap=%s' % (name, r, c))
        continue
    rw_, rh, rcy = r[1] - r[0] + 1, r[3] - r[2] + 1, (r[2] + r[3]) / 2 - OFF
    cw_, ch, ccy = c[1] - c[0] + 1, c[3] - c[2] + 1, (c[2] + c[3]) / 2
    dw, dh, dy = (cw_ / rw_ - 1) * 100, (ch / rh - 1) * 100, ccy - rcy
    worst = max(worst, abs(dw), abs(dh))
    print('%-18s w%3d h%3d cy%7.1f      w%3d h%3d cy%7.1f      폭 %+5.1f%%  높이 %+5.1f%%  중심y %+.1fpx'
          % (name, rw_, rh, rcy, cw_, ch, ccy, dw, dh, dy))
print('\n최대 크기 편차 %.1f%%   (목표 ±5%% 이내)' % worst)
