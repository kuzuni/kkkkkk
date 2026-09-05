# 작업 335 — 03 서브탭 «블록» 을 레퍼런스와 **같은 마스크로 동시에** 재는 스캐너.
#
#   LESSONS(12 1차 라운드 3회차): «누구를 믿느냐» 가 아니라 «같은 마스크로 두 이미지를 동시에 재라».
#   72 17회차의 4인 일치 지적 다섯 줄이 전부 이 블록을 가리키는데, 그 수치가 서로 어긋난다
#   («바 높이 79→99» 인데 CSS 는 이미 99 · «+34px 하향» 인데 실측은 +24). 눈이 아니라 픽셀로 못박는다.
#
# 좌표계 — **앵커가 둘이다**(측정표 12 §10 과 같은 규약):
#   상단 앵커 요소(카드 리스트): cap_y = ref_y − 84
#   하단 앵커 요소(탭바·서브탭 바): cap_y = ref_y − 60   (ref 2340 ↔ cap 2280)
#   그 차이 24px 이 «카드 리스트 하단 ↔ 서브탭 상변» 이음매에 그대로 고인다 — 이 스캐너가 그것을 잰다.
#
# 사용:
#   python3 tools/scan335.py [캡처경로]
from pydep937 import Image
import sys

REF = 'docs/ref/03-던전-팝업.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/335-r0.png'

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')
print('ref', ref.size, '/ cap', cap.size)


def col(im, x, y0, y1):
    """세로 1픽셀 열을 «색이 바뀌는 지점» 으로 접어서 밴드 목록으로 준다."""
    px = im.load()
    bands, cur, start = [], None, y0
    for y in range(y0, y1):
        c = px[x, y]
        q = (c[0] // 12, c[1] // 12, c[2] // 12)     # JPEG 번짐 흡수 (12 계조 양자화)
        if q != cur:
            if cur is not None:
                bands.append((start, y - 1, y - start, prev))
            cur, start, = q, y
        prev = c
    bands.append((start, y1 - 1, y1 - start, prev))
    return [b for b in bands if b[2] >= 2]           # 1px 전이는 버린다


def show(title, bands, off=0):
    print('\n── ' + title)
    for y0, y1, h, c in bands:
        lum = (c[0] * 299 + c[1] * 587 + c[2] * 114) // 1000
        print('   y %4d ~ %4d  h%3d   rgb%-16s lum%4d%s'
              % (y0, y1, h, str(c), lum, ('   (→cap %d~%d)' % (y0 - off, y1 - off)) if off else ''))


def edge(im, x, y0, y1, lo):
    """열에서 «검정(lum<lo) 이 아닌» 첫/마지막 y."""
    px = im.load()
    ys = [y for y in range(y0, y1)
          if (px[x, y][0] * 299 + px[x, y][1] * 587 + px[x, y][2] * 114) // 1000 >= lo]
    return (ys[0], ys[-1]) if ys else (None, None)


# ── ① 활성 알약 세로 단면 ────────────────────────────────────────────────
# ref 활성 탭 «던전» 중심 x=734 (측정표 §4-3: 탭 524~944, 글자 중심 734.5)
# cap 활성 탭 = 3칸 중 가운데(sp3), 중심 x=540
show('ref 활성 탭 세로 단면 @x=734 (하단 앵커 → cap = ref−60)', col(ref, 734, 1990, 2140), 60)
show('cap 활성 탭 세로 단면 @x=540', col(cap, 540, 1930, 2080))

# ── ② 비활성 칸(= 바 껍데기) 세로 단면 ──────────────────────────────────
# ref 좌측 🔒 탭 중심 x=340 / cap 좌측 칸 중심 x=279
show('ref 비활성 칸 세로 단면 @x=340', col(ref, 340, 1990, 2140), 60)
show('cap 비활성 칸 세로 단면 @x=279', col(cap, 279, 1930, 2080))

# ── ③ 카드5 하변 ↔ 바 상변 이음매 ────────────────────────────────────────
# 카드 안쪽(x=540) 을 위에서 훑어 «카드 바닥 검정 → 페이지 바탕 → 바 검정» 을 찾는다
show('ref 이음매 @x=200 (카드5 하변 ~ 바 상변)', col(ref, 200, 2000, 2060), 60)
show('cap 이음매 @x=200', col(cap, 200, 1930, 1990))

# ── ④ 바 가로 범위(좌·우 검정 테두리) ────────────────────────────────────
def row(im, y, x0, x1, lo=28):
    px = im.load()
    xs = [x for x in range(x0, x1)
          if (px[x, y][0] * 299 + px[x, y][1] * 587 + px[x, y][2] * 114) // 1000 >= lo]
    return (xs[0], xs[-1]) if xs else (None, None)

ry = 2069          # ref 바 세로 중심
cy = 2009          # cap 바 세로 중심 (= ry − 60)
rl, rr = row(ref, ry, 60, 1020)
cl, cr = row(cap, cy, 60, 1020)
print('\n── ④ 바 가로 (lum>=28 = 검정 테두리 바깥)')
print('   ref @y%d  x %s ~ %s   w %s   중심 %.1f' % (ry, rl, rr, rr - rl + 1, (rl + rr) / 2))
print('   cap @y%d  x %s ~ %s   w %s   중심 %.1f' % (cy, cl, cr, cr - cl + 1, (cl + cr) / 2))
print('   화면 중심 539.5 대비 — ref %+.1f  /  cap %+.1f' % ((rl + rr) / 2 - 539.5, (cl + cr) / 2 - 539.5))
