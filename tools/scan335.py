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
# ── 958 4회차 (2026-09-06) — **정수 걸음을 부분 화소로 갈았다**(932 처방 ⓐ · 옛 자는 `--int`).
#
#   장부(`probe932.js` LEDGER)가 이 자를 **B**(깨진 자)로 세워 둔 까닭 그대로다:
#   «색 밴드 두께 h» 를 **정수 y 를 세어**(h = 끝 − 시작 + 1) 냈다. 1회차 판정자는
#   «축척이 같아 상쇄된다» 로 N 을 냈지만, 이 자가 부딪히는 것은 축척(②ⓐ)이 아니라
#   **번짐 비대칭(②ⓑ)** 이다 — ref 는 JPEG 사진이라 층 경계가 경사면이고 우리 PNG 는 계단이라,
#   같은 참값 두께를 «화소 개수» 로 세면 **ref 만** 한 화소 통째로 깎이거나 붙는다.
#   가로가 1:1(변환은 y−84 뿐) 이므로 상쇄될 축척이 애초에 없다.
#
#   ⇒ 처방 ⓐ(문턱 교차 보간): 두께를 «화소 개수» 가 아니라 **두 모서리의 차**로 낸다
#      (`probe866`·`probe384`·`probe352`·`probe449` 가 같은 판정을 내린 자리).
#      문턱은 이웃한 두 층의 **고원 밝기 한복판**이다 — 한복판이 아니면 칼같은 판은 계단이라
#      안 움직이고 번진 판만 밀려 **새 비대칭**이 생긴다(958 1회차 판정).
#
#   ⚑ **표본 자리·창·걸음(1px)·12계조 양자화·«h ≥ 2 만 남긴다» 규칙을 한 칸도 안 건드렸다** —
#      밴드를 «고르는» 셈은 옛 자 그대로이고 바뀐 것은 그 밴드를 **두께로 바꾸는 셈** 뿐이다.
#      `--int` 가 옛 값을 글자까지 되살린다.
#
#   ⚑ 좌표 규약 — 표본은 화소 **중심**에서 오므로 교차 자리에 **+0.5** 를 더해야 옛 자
#      (= 밴드 첫 화소의 윗변 … 끝 화소의 아랫변)와 같은 공간이다(942 4회차 [9-e] 와 같은 함정).
#      빼먹으면 칼같은 판이 참값보다 언제나 0.5 작게 나온다.
#
#   ⚑ **참값은 CSS 가 안다**(958 2회차가 표에 더한 줄) — 이 바의 세로 단면은 437 이 확정한
#      셸 98 = 검정 테두리 **7** · 알약 검정 **7** · 림 7 이고, `--physics` 가 그 더미를 그대로 그린다.
#
# ── 캡처가 없으면 **ref 절만** 돈다(958 등재문 · 942 2~5회차와 같은 얼굴로 **여덟째**).
#   캡처 PNG 는 커밋 금지 자산이라 **없는 클론이 정상**이다 — 즉사하면 스윕에 «빨강» 이 아니라
#   «없는 자» 로 지나간다(913 이 그 자리를 열일곱 개 고쳤다).
#
# 사용:
#   python3 tools/scan335.py [캡처경로]      # 부분 화소(기본)
#   python3 tools/scan335.py --int           # 옛 정수 자
#   python3 tools/scan335.py --physics       # 합성 재현(그림도 브라우저도 안 쓴다)
from pydep937 import Image, fail
import os
import sys

MODE = 'int' if '--int' in sys.argv else 'cov'
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]

REF = 'docs/ref/03-던전-팝업.jpg'
CAP = ARGS[0] if ARGS else 'docs/review/335-r0.png'


def _lum(c):
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000.0


# ── 자의 알맹이 ─────────────────────────────────────────────────────────────
# 표본 색줄 하나 → 밴드 목록. **그림 없이도(합성 프로파일로) 같은 자를 돌린다**
# (`probe409g.runs_from` 이 409 계열에서 맡는 자리와 같다 — 사본 0).
def bands_from(colors, y0, mode=MODE):
    """색줄 → [(y0, y1, 두께, 대표색)].  두께는 mode='cov' 면 부분 화소, 'int' 면 옛 정수."""
    raw, cur, start, prev = [], None, y0, None
    for i, c in enumerate(colors):
        y = y0 + i
        q = (c[0] // 12, c[1] // 12, c[2] // 12)     # JPEG 번짐 흡수 (12 계조 양자화)
        if q != cur:
            if cur is not None:
                raw.append([start, y - 1, prev])
            cur, start = q, y
        prev = c
    raw.append([start, y0 + len(colors) - 1, prev])

    # ① «어느 밴드인가» 는 옛 자 그대로 — 정수 h 로 고르고 h≥2 만 남긴다.
    keep = [b for b in raw if b[1] - b[0] + 1 >= 2]
    if mode == 'int' or len(keep) == 0:
        return [(b[0], b[1], b[1] - b[0] + 1, b[2]) for b in keep]

    # ② 바뀐 것은 두께를 내는 셈뿐 — 이웃한 두 밴드의 고원 밝기 **한복판**에서 교차 보간.
    lums = [_lum(c) for c in colors]

    def plateau(b):
        seg = lums[b[0] - y0:b[1] - y0 + 1]
        seg = sorted(seg)
        return seg[len(seg) // 2]                    # 중앙값 — 경사면 표본에 안 끌린다

    def cross(lo_b, hi_b):
        """두 밴드 사이 경계의 **모서리 공간** 좌표(화소 중심 + 0.5).

        ⚑ 두 밴드 사이에는 «h < 2 라 버린» 경사면 표본이 끼어 있을 수 있다(JPEG 베벨).
           끝점 둘만으로 선형 보간하면 그 경사면을 통째로 직선으로 뭉개므로,
           **문턱을 실제로 사이에 두는 이웃 한 쌍**을 찾아 거기서만 보간한다."""
        t = (plateau(lo_b) + plateau(hi_b)) / 2.0
        a, b = lo_b[1], hi_b[0]
        for p in range(a, b):
            va, vb = lums[p - y0], lums[p + 1 - y0]
            if (va - t) * (vb - t) <= 0.0 and va != vb:
                return p + (va - t) / (va - vb) + 0.5
        return (a + b) / 2.0 + 0.5                   # 문턱을 지나는 쌍이 없다 — 한가운데

    out = []
    for i, b in enumerate(keep):
        top = cross(keep[i - 1], b) if i > 0 else float(b[0])
        bot = cross(b, keep[i + 1]) if i + 1 < len(keep) else float(b[1] + 1)
        out.append((b[0], b[1], bot - top, b[2]))
    return out


def col(im, x, y0, y1):
    """세로 1픽셀 열을 «색이 바뀌는 지점» 으로 접어서 밴드 목록으로 준다."""
    px = im.load()
    return bands_from([px[x, y] for y in range(y0, y1)], y0)


def show(title, bands, off=0):
    print('\n── ' + title)
    for y0, y1, h, c in bands:
        hs = ('h%3d' % h) if MODE == 'int' else ('h%6.2f' % h)
        print('   y %4d ~ %4d  %s   rgb%-16s lum%4d%s'
              % (y0, y1, hs, str(c), int(_lum(c)),
                 ('   (→cap %d~%d)' % (y0 - off, y1 - off)) if off else ''))


def edge(im, x, y0, y1, lo):
    """열에서 «검정(lum<lo) 이 아닌» 첫/마지막 y — cov 모드는 문턱 교차 보간."""
    px = im.load()
    vs = [_lum(px[x, y]) for y in range(y0, y1)]
    ys = [y0 + i for i, v in enumerate(vs) if v >= lo]
    if not ys:
        return (None, None)
    if MODE == 'int':
        return (ys[0], ys[-1])
    return (_sub(vs, y0, ys[0], -1, lo), _sub(vs, y0, ys[-1], +1, lo))


def _sub(vs, base, hit, step, lo):
    """`hit` 에서 `step` 쪽 이웃과의 사이에서 문턱 `lo` 를 지나는 자리(모서리 공간)."""
    j = hit - base + step
    if j < 0 or j >= len(vs):
        return float(hit) + (0.5 if step > 0 else -0.5)
    va, vb = vs[hit - base], vs[j]
    if va == vb:
        return float(hit) + 0.5 * step
    f = (va - lo) / (va - vb)
    f = min(max(f, 0.0), 1.0)
    return hit + f * step


def row(im, y, x0, x1, lo=28):
    px = im.load()
    vs = [_lum(px[x, y]) for x in range(x0, x1)]
    xs = [x0 + i for i, v in enumerate(vs) if v >= lo]
    if not xs:
        return (None, None)
    if MODE == 'int':
        return (xs[0], xs[-1])
    return (_sub(vs, x0, xs[0], -1, lo), _sub(vs, x0, xs[-1], +1, lo))


def fmt(v):
    if v is None:
        return '  none'
    return ('%6d' % v) if MODE == 'int' else ('%8.2f' % v)


def width(a, b):
    """좌·우 끝의 폭. int 모드는 «화소 개수»(b−a+1) · cov 모드는 **모서리의 차**(b−a)."""
    if a is None or b is None:
        return None
    return (b - a + 1) if MODE == 'int' else (b - a)


# ── 합성 재현 ──────────────────────────────────────────────────────────────
# 같은 참값 층더미를 «칼같은 판»(cap = PNG)과 «번진 판»(ref = JPEG)으로 그려 두 자로 잰다.
# 판을 그리는 셈은 `probe409g._phys_sample` 하나뿐이다(402 «사본을 지운다»).
# 더미는 437 이 확정한 이 바의 세로 단면 — 검정 테두리 7 · 림 7 · 면 · 림 7 · 그늘 7 · 검정 7.
PHYS = ((( 0,  0,  0), 7.0), ((112, 95, 75), 7.0), ((98, 82, 61), 63.0),
        ((112, 95, 75), 7.0), (( 65, 49, 34), 7.0), (( 0,  0,  0), 7.0))


def physics():
    from probe409g import phys_cols
    print('합성 재현 — 참값 층더미 %s (합 %.0f px)'
          % (' '.join('%.0f' % w for _, w in PHYS), sum(w for _, w in PHYS)))
    print('위상 6개(참 경계를 1/6 화소씩 민다) · 판 = 칼같은(cap) ↔ 번진(ref, σ1.1)\n')
    rows = []
    for mode in ('int', 'cov'):
        acc = {'cap': [], 'ref': []}
        for ph in range(6):
            w = list(PHYS)
            w[0] = (w[0][0], PHYS[0][1] + ph / 6.0)   # 첫 층을 늘려 경계 위상을 민다
            cols = phys_cols(tuple(w), sig=1.1, step=1.0)
            for who in ('cap', 'ref'):
                bs = bands_from(cols[who], 0, mode=mode)
                # 판정 대상 = 참값 7px 인 «검정 테두리»(첫 밴드) 두께
                acc[who].append(bs[0][2] - w[0][1] if bs else float('nan'))
        rows.append((mode, sum(acc['cap']) / 6.0, sum(acc['ref']) / 6.0))
    print('   %-6s %10s %10s %10s' % ('자', 'cap 편향', 'ref 편향', '판 사이 |Δ|'))
    for mode, c, r in rows:
        print('   %-6s %10.3f %10.3f %10.3f' % (mode, c, r, abs(c - r)))
    print('\n   ⚑ 과녁은 «판 사이 |Δ|» 가 아니라 **번진 판 부호 편향**이다 —')
    print('     칼같은 판은 계단이라 어느 자로 재도 ±0.5 를 못 넘는다(942 4회차 [9-d]).')
    return rows


if '--physics' in sys.argv:
    physics()
    sys.exit(0)

if not os.path.exists(REF):
    fail('레퍼런스가 없다 — %s' % REF, '저장소 클론이 온전한지 보라')

ref = Image.open(REF).convert('RGB')
HAVE_CAP = os.path.exists(CAP)
cap = Image.open(CAP).convert('RGB') if HAVE_CAP else None
print('자 = %s' % ('옛 정수(--int)' if MODE == 'int' else '부분 화소(문턱 교차 보간)'))
print('ref', ref.size, '/ cap', (cap.size if HAVE_CAP else '없음 — ref 절만 돈다 (캡처 PNG 는 커밋 금지 자산)'))


# ── ① 활성 알약 세로 단면 ────────────────────────────────────────────────
# ref 활성 탭 «던전» 중심 x=734 (측정표 §4-3: 탭 524~944, 글자 중심 734.5)
# cap 활성 탭 = 3칸 중 가운데(sp3), 중심 x=540
show('ref 활성 탭 세로 단면 @x=734 (하단 앵커 → cap = ref−60)', col(ref, 734, 1990, 2140), 60)
if HAVE_CAP:
    show('cap 활성 탭 세로 단면 @x=540', col(cap, 540, 1930, 2080))

# ── ② 비활성 칸(= 바 껍데기) 세로 단면 ──────────────────────────────────
# ref 좌측 🔒 탭 중심 x=340 / cap 좌측 칸 중심 x=279
show('ref 비활성 칸 세로 단면 @x=340', col(ref, 340, 1990, 2140), 60)
if HAVE_CAP:
    show('cap 비활성 칸 세로 단면 @x=279', col(cap, 279, 1930, 2080))

# ── ③ 카드5 하변 ↔ 바 상변 이음매 ────────────────────────────────────────
# 카드 안쪽(x=540) 을 위에서 훑어 «카드 바닥 검정 → 페이지 바탕 → 바 검정» 을 찾는다
show('ref 이음매 @x=200 (카드5 하변 ~ 바 상변)', col(ref, 200, 2000, 2060), 60)
if HAVE_CAP:
    show('cap 이음매 @x=200', col(cap, 200, 1930, 1990))

# ── ④ 바 가로 범위(좌·우 검정 테두리) ────────────────────────────────────
ry = 2069          # ref 바 세로 중심
cy = 2009          # cap 바 세로 중심 (= ry − 60)
rl, rr = row(ref, ry, 60, 1020)
print('\n── ④ 바 가로 (lum>=28 = 검정 테두리 바깥)')
print('   ref @y%d  x %s ~ %s   w %s   중심 %.1f'
      % (ry, fmt(rl), fmt(rr), fmt(width(rl, rr)), (rl + rr) / 2))
print('   화면 중심 539.5 대비 — ref %+.1f' % ((rl + rr) / 2 - 539.5))
if HAVE_CAP:
    cl, cr = row(cap, cy, 60, 1020)
    print('   cap @y%d  x %s ~ %s   w %s   중심 %.1f'
          % (cy, fmt(cl), fmt(cr), fmt(width(cl, cr)), (cl + cr) / 2))
    print('   화면 중심 539.5 대비 — cap %+.1f' % ((cl + cr) / 2 - 539.5))
