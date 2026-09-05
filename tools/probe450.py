# 작업 450 — «서브탭 셸(`.stabs`) 안쪽에 어두운 립 1.4px 이 없다» 재현기.
#
#   338 규칙: 처방을 따르기 전에 먼저 잰다. 437 이 남긴 곁다리 관측(«활성 알약이 닿는 면 7.0 ↔
#   안 닿는 면 8.4»)이 이 작업의 등재문이고, 여기서 확인할 것은 **그 1.4 가 무엇으로 이루어졌나** 다.
#
#     ⓐ **검정 두께**(cov 자 — probe437 과 같은 자를 그대로 쓴다) — 면마다 갈라 잰다.
#     ⓑ **띠 경계를 부분화소로 푼다** — 문턱이 아니라 «두 색 사이 어디냐» 로.
#        K(검정) → R(림 #705F4B) → S(셸바닥 #61523D) 순서라, 색을 두 축에 사영해 50% 교차를 찾는다:
#           t = |c| / |R|            (K↔R 축 — 검정 끝)
#           p = (c−S)·(R−S) / |R−S|² (R↔S 축 — 림 끝)
#        ⇒ **립 = 검정끝 − 테두리 7** · **림 = 림끝 − 검정끝** 이 «이름째» 읽힌다.
#     ⓒ **하변에는 립이 없다**(ref 6.97~6.98)는 것도 같은 자로 못박는다 — 립은 상·좌·우 세 면뿐이다.
#     ⓓ 세 스크린샷(06·07·23) 교차 — 한 JPEG 잡음이 아님을 못박는다.
#
#   좌표계: 서브탭 바는 하단 앵커(335 정오표) — cap_y = ref_y − 60. 가로는 1:1.
#
# 사용:  python3 tools/probe450.py     (캡처는 먼저 `node tools/cap96.js`)
from pydep937 import Image
import statistics as st

OFF = 60
REF_T, REF_B = 2021, 2117          # 셸 «정수 문턱» 바깥 상자 (352 §0)
CAP_T, CAP_B = REF_T - OFF, REF_B - OFF

REF = {'06': 'docs/ref/06-장비-팝업.jpg', '07': 'docs/ref/07-스킬-팝업.jpg',
       '23': 'docs/ref/23-훈련-팝업.jpg'}
CAP = {'06': 'docs/review/96-full-eq.png', '07': 'docs/review/96-full-hero.png'}

K = (0, 0, 0)
R = (112, 95, 75)                  # 림
S = (97, 82, 61)                   # 셸바닥
BORDER = 7.0                       # 437 이 확정한 셸 검정 테두리


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def prof(px, x, y, dx, dy, n=26):
    return [px[x + dx * i, y + dy * i] for i in range(n)]


# ── ⓐ 검정 두께 (probe437 의 cov 자 — 이식) ─────────────────────────────
def _core(v, thr=40):
    best, cur = None, None
    for i, x in enumerate(v):
        if x <= thr:
            cur = (cur[0], i) if cur else (i, i)
            if best is None or cur[1] - cur[0] > best[1] - best[0]:
                best = cur
        else:
            cur = None
    return best


def r_cov(vc):
    v = [lum(c) for c in vc]
    c = _core(v)
    if not c:
        return float('nan')
    i0, i1 = c
    blk = min(v[i0:i1 + 1])
    o = v[max(0, i0 - 6):max(1, i0 - 2)]
    n = v[i1 + 3:i1 + 7]
    lo = st.median(o) if o else 220.0
    hi = st.median(n) if n else 98.0
    tot = 0.0
    for i in range(max(0, i0 - 4), min(len(v), i1 + 5)):
        ref = lo if i < i0 else (hi if i > i1 else min(lo, hi))
        if ref > blk:
            tot += min(1.0, max(0.0, (ref - v[i]) / (ref - blk)))
    return tot


# ── ⓑ 띠 경계 (부분화소 · 색 사영) ──────────────────────────────────────
def _cross(f, i0, i1, tgt):
    """f(i) 가 tgt 를 지나는 자리 (i0 → i1 방향, 선형 보간)."""
    step = 1 if i1 > i0 else -1
    i = i0
    while i != i1:
        a, b = f(i), f(i + step)
        if (a - tgt) * (b - tgt) <= 0:
            d = a - b
            return i + step * (0.0 if d == 0 else (a - tgt) / d)
        i += step
    return float(i1)


def bands(vc, i_in):
    """i_in = 검정 코어 안쪽 한 점. (검정끝, 림끝) 을 프로파일 인덱스로 돌려준다.

    ⚠ K→R→S 를 «두 축» 으로 갈라 재면 안 된다 — ref 의 K↔R 경계 화소는 **K 와 R 의 섞임**이라
    R↔S 축에 사영하면 셸바닥(S)보다도 어두워 «림이 벌써 끝났다» 고 읽힌다(첫 판에서 ref 림이
    1.0 으로 나온 것이 이것이다). 세 색이 거의 한 직선(S ≈ 0.85·R) 위에 있으므로 **밝기 비율
    한 축**으로 읽는다: α = c·R / R·R  ⇒ 검정 0 · 림 1.00 · 셸바닥 0.85.
      검정끝 = α 가 0.5 를 지나는 자리 · 림끝 = α 가 (1+0.85)/2 = 0.925 를 **내려가며** 지나는 자리.
    """
    def a(i):
        c = vc[i]
        return sum(u * v for u, v in zip(c, R)) / sum(v * v for v in R)
    kend = _cross(a, i_in, min(len(vc) - 1, i_in + 14), 0.5)
    # ⚠ 검정끝 바로 다음 화소는 K·R 섞임(α≈0.78)이라 이미 0.925 아래다 — 거기서 내려가는 교차를
    #   찾으면 «림 1.0» 이라는 헛값이 나온다. **림 고원(α ≥ 0.95)에 먼저 올라선 뒤** 내려간다.
    i = int(kend) + 1
    top = min(len(vc) - 1, i_in + 22)
    while i < top and a(i) < 0.95:
        i += 1
    rend = _cross(a, i, top, (1 + 0.85) / 2) if i < top else float('nan')
    return kend, rend


def face(px, x, y, dx, dy, tag, out):
    """한 면을 잰다 — 프로파일은 «바 바깥 → 안쪽» 방향으로 6화소 앞에서 시작한다."""
    vc = prof(px, x, y, dx, dy, 26)
    cov = r_cov(vc)
    v = [lum(c) for c in vc]
    c = _core(v)
    if not c:
        return None
    kend, rend = bands(vc, c[1])
    kstart = kend - cov                       # 검정 시작(부분화소) = 끝 − 잉크 총량
    out.append((tag, cov, cov - BORDER, rend - kend))
    return cov, cov - BORDER, rend - kend


def bar_x(px, y):
    runs, cur = [], None
    for x in range(20, 1061):
        if lum(px[x, y]) <= 30:
            cur = (cur[0], x) if cur and x == cur[1] + 1 else (x, x)
            if cur[1] - cur[0] >= 4 and (not runs or runs[-1][0] != cur[0]):
                runs.append(cur)
            elif runs and runs[-1][0] == cur[0]:
                runs[-1] = cur
        else:
            cur = None
    return (runs[0][0], runs[-1][1]) if runs else None


# 활성 칸이 닿는 면 — 06·23 은 첫 칸(좌), 07 은 가운데 칸(좌·우 어느 쪽도 아니다)
PILL_COL = {'06': 400, '07': 400, '23': 400}      # 활성 알약 열 (상변용)
FREE_COL = {'06': 700, '07': 700, '23': 700}      # 알약 없는 열


def main():
    print('\n══════ 450 재현 — 셸 안쪽 어두운 립 ══════')
    print(' 자: cov(검정 잉크 총량) + 색 사영(K→R→S 경계). 테두리 진실값 = 7 (437 확정)')

    print('\n ⓐⓑ 면별 — 검정 두께 · 립(= 검정 − 7) · 림 두께')
    print('   %-22s %8s %8s %8s' % ('', '검정', '립', '림'))
    rows = []
    for k in sorted(REF):
        px = Image.open(REF[k]).convert('RGB').load()
        bb = bar_x(px, (REF_T + REF_B) // 2)
        l, r = bb
        o = []
        face(px, PILL_COL[k], REF_T - 6, 0, 1, 'ref %s 상(알약 열)' % k, o)
        face(px, FREE_COL[k], REF_T - 6, 0, 1, 'ref %s 상(비알약)' % k, o)
        face(px, FREE_COL[k], REF_B + 6, 0, -1, 'ref %s 하' % k, o)
        lv = [face(px, l - 6, y, 1, 0, '', []) for y in range(2064, 2075)]
        rv = [face(px, r + 6, y, -1, 0, '', []) for y in range(2064, 2075)]
        for tag, vals in (('ref %s 좌' % k, lv), ('ref %s 우' % k, rv)):
            vals = [v for v in vals if v and v[0] == v[0]]
            o.append((tag, st.median([v[0] for v in vals]), st.median([v[1] for v in vals]),
                      st.median([v[2] for v in vals])))
        rows += o
        for t, a, b, c in o:
            print('   %-22s %8.2f %8.2f %8.2f' % (t, a, b, c))

    for k in sorted(CAP):
        px = Image.open(CAP[k]).convert('RGB').load()
        bb = bar_x(px, (CAP_T + CAP_B) // 2)
        l, r = bb
        o = []
        face(px, PILL_COL[k], CAP_T - 6, 0, 1, 'cap %s 상(알약 열)' % k, o)
        face(px, FREE_COL[k], CAP_T - 6, 0, 1, 'cap %s 상(비알약)' % k, o)
        face(px, FREE_COL[k], CAP_B + 6, 0, -1, 'cap %s 하' % k, o)
        lv = [face(px, l - 6, y, 1, 0, '', []) for y in range(2064 - OFF, 2075 - OFF)]
        rv = [face(px, r + 6, y, -1, 0, '', []) for y in range(2064 - OFF, 2075 - OFF)]
        for tag, vals in (('cap %s 좌' % k, lv), ('cap %s 우' % k, rv)):
            vals = [v for v in vals if v and v[0] == v[0]]
            o.append((tag, st.median([v[0] for v in vals]), st.median([v[1] for v in vals]),
                      st.median([v[2] for v in vals])))
        for t, a, b, c in o:
            print('   %-22s %8.2f %8.2f %8.2f' % (t, a, b, c))

    print('\n ⓒ 판정 — ref 는 «상·좌·우에 립 · 하변에는 없다» 인가')
    up = [v for t, v, _, _ in rows if '상(비알약)' in t]
    dn = [v for t, v, _, _ in rows if t.endswith('하')]
    print('   ref 비알약 상 중앙값 %.2f ↔ 하 중앙값 %.2f  ⇒ 차 %.2f'
          % (st.median(up), st.median(dn), st.median(up) - st.median(dn)))
    print()


main()
