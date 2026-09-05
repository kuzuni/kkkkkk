# 작업 337 — 공용 서브탭 부품 `.stabs`/`.stab` 의 **라벨 잉크**·**알약 여백**을
#             ref/cap 에서 «같은 마스크로 동시에» 재는 스캐너.
#
#   LESSONS(12 1차 라운드 3회차): «누구를 믿느냐» 가 아니라 «같은 마스크로 두 이미지를 동시에 재라».
#   337 등재문의 ①(라벨 잉크 −14~21%)은 비평가 넷이 일치했지만 수치가 −14.3 ~ −21% 로 갈린다.
#   눈이 아니라 픽셀로 못박는다.
#
# 좌표계 — 서브탭 바는 **하단 앵커**다(335 정오표): cap_y = ref_y − 60.
#
# 사용:
#   python3 tools/scan337.py [캡처경로]
from pydep937 import Image
import sys

REF = 'docs/ref/03-던전-팝업.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/337-r0.png'
OFF = 60                      # 하단 앵커

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')
print('ref', ref.size, '/ cap', cap.size, ' (하단 앵커 cap_y = ref_y − %d)' % OFF)


# ── 잉크 마스크 ────────────────────────────────────────────────────────────
# 활성 라벨 색은 ref #F3BC8C · 우리 #F2BC8D 로 사실상 같다. 바 면(#61503C·#4B3E2D)·
# 검정 외곽선과는 «밝고 붉은» 것으로 갈린다. JPEG 번짐을 먹으려면 문턱을 넉넉히 잡되
# 두 이미지에 **똑같이** 적용한다 — 그것이 이 스캐너의 존재 이유다.
def is_ink(c):
    r, g, b = c
    return r >= 150 and g >= 110 and b >= 70 and r > b + 25 and r >= g + 20


def ink_bbox(im, x0, x1, y0, y1):
    px = im.load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if is_ink(px[x, y]):
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), max(xs), min(ys), max(ys))


def report(name, bb):
    if bb is None:
        print('   %-28s 잉크 0px' % name)
        return None
    x0, x1, y0, y1 = bb
    print('   %-28s x %4d ~ %4d (w %3d)   y %4d ~ %4d (h %3d)   중심 (%.1f, %.1f)'
          % (name, x0, x1, x1 - x0 + 1, y0, y1, y1 - y0 + 1,
             (x0 + x1) / 2, (y0 + y1) / 2))
    return (x1 - x0 + 1, y1 - y0 + 1, (x0 + x1) / 2, (y0 + y1) / 2)


print('\n── ① 활성 칸 라벨 «던전» 잉크 bbox (같은 마스크)')
# ref: 활성 탭 524~944, 글자 x 701~768 / y 2047~2083  (측정표 03 §4-3)
r = report('ref  «던전»', ink_bbox(ref, 560, 940, 2030, 2100))
# cap: sp3 가운데 칸(«던전»), 칸 폭 (794−12)/3 = 260.7 · 중심 x=540
c = report('cap  «던전»', ink_bbox(cap, 420, 660, 1965, 2045))

if r and c:
    print('\n   폭   ref %5.1f  cap %5.1f   Δ %+.1f px  (%+.1f%%)'
          % (r[0], c[0], c[0] - r[0], (c[0] / r[0] - 1) * 100))
    print('   높이 ref %5.1f  cap %5.1f   Δ %+.1f px  (%+.1f%%)'
          % (r[1], c[1], c[1] - r[1], (c[1] / r[1] - 1) * 100))
    print('   중심 y  ref %.1f → cap 기대 %.1f   실제 %.1f   Δ %+.1f px'
          % (r[3], r[3] - OFF, c[3], c[3] - (r[3] - OFF)))
    print('   → 잉크를 ref 로 맞추는 배율: 폭 ×%.4f · 높이 ×%.4f'
          % (r[0] / c[0], r[1] / c[1]))


# ── ② 활성 알약 «위/아래 여백» — 바 검정 안쪽 ↔ 알약 면 ─────────────────────
# 등재문 ②(상단 여백 ref 14 vs 우리 16) · ③(알약 아래 바 면 2px 노출, ref 0) 을 잰다.
def vprofile(im, x, y0, y1, label, off=0):
    px = im.load()
    print('\n── %s  세로 단면 @x=%d' % (label, x))
    cur, start, prev = None, y0, None
    for y in range(y0, y1):
        c = px[x, y]
        q = (c[0] // 14, c[1] // 14, c[2] // 14)
        if q != cur:
            if cur is not None and y - start >= 2:
                lum = (prev[0] * 299 + prev[1] * 587 + prev[2] * 114) // 1000
                print('   y %4d ~ %4d  h%3d  rgb%-16s lum%4d%s'
                      % (start, y - 1, y - start, str(prev), lum,
                         ('  (→cap %d~%d)' % (start - off, y - 1 - off)) if off else ''))
            cur, start = q, y
        prev = c
    lum = (prev[0] * 299 + prev[1] * 587 + prev[2] * 114) // 1000
    print('   y %4d ~ %4d  h%3d  rgb%-16s lum%4d%s'
          % (start, y1 - 1, y1 - start, str(prev), lum,
             ('  (→cap %d~%d)' % (start - off, y1 - 1 - off)) if off else ''))


# 라벨 잉크를 피한 열에서 잰다: ref 활성 탭 x=680(글자 좌변 701 왼쪽) / cap 은 칸 중심−100
vprofile(ref, 660, 2010, 2125, 'ref 활성 알약(«던전» 칸, 글자 밖)', OFF)
vprofile(cap, 460, 1950, 2065, 'cap 활성 알약(«던전» 칸, 글자 밖)')
