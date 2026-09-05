# 작업 437 — «서브탭 셸(`.stabs`) 검정 테두리가 ref 7.91 ↔ 우리 5.69~6.00 (−28%)» 재현기.
#
#   338 규칙: 처방을 따르기 전에 먼저 잰다. 이 자리는 **352 §2 가 한 번 기각했다**
#   («ref 의 순검정은 6, 그 바깥에 AA 한 줄 — 느슨 문턱으로 세면 8»). 3인(CV·CW·BB)이 다시 올린
#   근거는 «50% 부분화소 교차» 라는 다른 자였다. 그래서 이 자는 **문턱을 다투지 않는다**:
#
#     ⓐ **자를 먼저 검산한다** — 우리 캡처는 진실을 CSS 가 안다(`.stabs{border:6px}` ·
#        `.stab.on{box-shadow:inset 7px 0 0 #000}`). 6.00 / 7.00 을 못 돌려주는 자는 ref 를 읽을 자격이 없다.
#     ⓑ **ref 는 색으로 갈라 읽는다**(band map) — 문턱이 아니라 «무엇이 무엇인가» 로.
#        K 검정 · B 베벨 #634F37 · F 채움 #4B3E2D · D 바닥띠 #413122 · R 림 #705F4B ·
#        S 셸바닥 #61523D · W 시트 바깥. 이러면 «테두리 7 · 칸 84 · 바깥 98» 이 이름째 읽힌다.
#     ⓒ **세 스크린샷(06·07·23)** 으로 교차검증한다 — 한 JPEG 의 잡음이 아님을 못박는다.
#     ⓓ **활성 알약이 닿는 면 ↔ 안 닿는 면**을 갈라 잰다 — «7.91» 의 정체가 여기서 나온다.
#
#   좌표계: 서브탭 바는 하단 앵커(335 정오표) — cap_y = ref_y − 60. 가로는 1:1.
#
# 사용:  python3 tools/probe437.py     (캡처는 먼저 `node tools/cap96.js`)
from pydep937 import Image
import statistics as st

OFF = 60
REF_T, REF_B = 2021, 2117          # 셸 «정수 문턱» 바깥 상자 (352 §0)
CAP_T, CAP_B = REF_T - OFF, REF_B - OFF

REF = {'06': 'docs/ref/06-장비-팝업.jpg', '07': 'docs/ref/07-스킬-팝업.jpg',
       '23': 'docs/ref/23-훈련-팝업.jpg'}
CAP = {'06': 'docs/review/96-full-eq.png', '07': 'docs/review/96-full-hero.png',
       '23': None}                                     # 23 훈련은 96 하네스에 없다
# 활성 알약 «스킬»(07 가운데 칸) — 352 §3·§10 확정값
PILL = {'ref': (292, 551, 2027), 'cap': (291, 551, 1967)}
TRUTH_SHELL, TRUTH_PILL = 6.0, 7.0                     # 우리 CSS 가 아는 진실

PAL = [('K', (0, 0, 0)), ('B', (99, 79, 55)), ('F', (75, 62, 45)), ('D', (65, 49, 34)),
       ('R', (112, 95, 75)), ('S', (97, 82, 61)), ('W', (220, 220, 220))]


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def cls(c):
    return min(PAL, key=lambda p: sum((int(a) - int(b)) ** 2 for a, b in zip(c, p[1])))[0]


def prof(px, x, y, dx, dy, n=26):
    return [lum(px[x + dx * i, y + dy * i]) for i in range(n)]


# ── 자 넷 ────────────────────────────────────────────────────────────────
def _core(v, thr=40):
    """가장 긴 저휘도 런 (i0, i1)."""
    best, cur = None, None
    for i, x in enumerate(v):
        if x <= thr:
            cur = (cur[0], i) if cur else (i, i)
            if best is None or cur[1] - cur[0] > best[1] - best[0]:
                best = cur
        else:
            cur = None
    return best


def _sides(v, i0, i1):
    """검정 코어 바깥·안쪽의 «맞닿은 색» 기준 휘도 (AA 두 줄을 건너뛴다)."""
    o = v[max(0, i0 - 6):max(1, i0 - 2)]
    n = v[i1 + 3:i1 + 7]
    return (st.median(o) if o else 220.0), (st.median(n) if n else 98.0)


def r_run(v, thr):
    best = cur = 0
    for x in v:
        cur = cur + 1 if x <= thr else 0
        best = max(best, cur)
    return float(best)


def r_x50(v):
    c = _core(v)
    if not c:
        return float('nan')
    i0, i1 = c
    blk = min(v[i0:i1 + 1])
    lo, hi = _sides(v, i0, i1)

    def cross(a, b, tgt):
        step = 1 if b > a else -1
        i = a
        while i != b:
            if (v[i] - tgt) * (v[i + step] - tgt) <= 0:
                d = v[i] - v[i + step]
                return i + step * (0.0 if d == 0 else (v[i] - tgt) / d)
            i += step
        return float(b)
    return abs(cross(min(len(v) - 1, i1 + 4), i1, (hi + blk) / 2)
               - cross(max(0, i0 - 4), i0, (lo + blk) / 2))


def r_cov(v):
    """커버리지 적분 — 화소마다 «검정이 몇 % 덮었나» 를 더한다(잉크 총량)."""
    c = _core(v)
    if not c:
        return float('nan')
    i0, i1 = c
    blk = min(v[i0:i1 + 1])
    lo, hi = _sides(v, i0, i1)
    tot = 0.0
    for i in range(max(0, i0 - 4), min(len(v), i1 + 5)):
        ref = lo if i < i0 else (hi if i > i1 else min(lo, hi))
        if ref > blk:
            tot += min(1.0, max(0.0, (ref - v[i]) / (ref - blk)))
    return tot


RULERS = [('pure', lambda v: r_run(v, 4)), ('loose', lambda v: r_run(v, 24)),
          ('x50', r_x50), ('cov', r_cov)]


def all4(v):
    return [f(v) for _, f in RULERS]


def head(w=24):
    print(' ' * w + ' '.join('%6s' % n for n, _ in RULERS))


def row(tag, vals, w=24):
    print('%-*s' % (w, tag) + ' '.join('%6.2f' % x for x in vals))


# ── 바 검출 ──────────────────────────────────────────────────────────────
def bar_x(px, y):
    """바 세로 한복판 행에서 «가장 바깥» 검정 런 두 개 → 바 좌·우."""
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


def bandmap(px, x, y0, y1):
    s = ''.join(cls(px[x, y]) for y in range(y0, y1))
    out = []
    for i, ch in enumerate(s):
        if out and out[-1][0] == ch:
            out[-1][2] = y0 + i
        else:
            out.append([ch, y0 + i, y0 + i])
    return ' '.join('%s%d..%d(%d)' % (a, b, c, c - b + 1) for a, b, c in out if c - b + 1 >= 1)


def main():
    im = {}
    for k, p in REF.items():
        im[('ref', k)] = Image.open(p).convert('RGB').load()
    for k, p in CAP.items():
        if p:
            im[('cap', k)] = Image.open(p).convert('RGB').load()

    r7, c7 = im[('ref', '07')], im[('cap', '07')]
    pl, pr, pt_r = PILL['ref']
    _, _, pt_c = PILL['cap']

    print('\n══════ 437 재현 — 서브탭 셸 검정 테두리 ══════')
    print(' 07 스킬 시트 · 4칸 · 가운데 «스킬» 활성 · 하단 앵커 cap_y = ref_y − 60')

    # ⓐ 자 검산
    print('\n ⓐ 자 검산 — 우리 캡처는 진실을 CSS 가 안다 (셸 6.00 · 알약 7.00)')
    head()
    s = all4(prof(c7, 700, CAP_T - 6, 0, 1))
    p = all4(prof(c7, pl - 7, pt_c + 40, 1, 0))
    row('  cap 셸 상', s)
    row('  cap 셸 오차', [v - TRUTH_SHELL for v in s])
    row('  cap 알약 좌', p)
    row('  cap 알약 오차', [v - TRUTH_PILL for v in p])
    print('   ⇒ 넷 다 0 이면 문턱 논쟁은 **ref(JPEG) 쪽에서만** 벌어진다는 뜻이다.')

    # ⓑ band map
    print('\n ⓑ 색 분류(band map) — 문턱 없이 «무엇이 무엇인가» 로 읽는다')
    print('   K 검정 · B 베벨 · F 채움 · D 바닥띠 · R 림 · S 셸바닥 · W 바깥')
    print('   ref x330 (알약 열)  %s' % bandmap(r7, 330, REF_T - 5, REF_B + 7))
    print('   ref x700 (비알약)   %s' % bandmap(r7, 700, REF_T - 5, REF_B + 7))
    print('   cap x330 (알약 열)  %s' % bandmap(c7, 330, CAP_T - 5, CAP_B + 7))
    print('   cap x700 (비알약)   %s' % bandmap(c7, 700, CAP_T - 5, CAP_B + 7))

    # ⓒ 세 화면 교차
    print('\n ⓒ 세 화면 교차 — 바 안쪽 전 열 `cov` 중앙값')
    print('   %-6s %8s %8s   %-6s %8s %8s' % ('ref', '상', '하', 'cap', '상', '하'))
    for k in sorted(REF):
        def sweep(px, t, b, y):
            bb = bar_x(px, y)
            if not bb:
                return None, None
            l, r = bb
            cols = range(l + 55, r - 54, 7)
            up = [r_cov(prof(px, x, t - 6, 0, 1)) for x in cols]
            dn = [r_cov(prof(px, x, b + 6, 0, -1)) for x in cols]
            up = [v for v in up if v == v]
            dn = [v for v in dn if v == v]
            return st.median(up), st.median(dn)
        ru, rd = sweep(im[('ref', k)], REF_T, REF_B, (REF_T + REF_B) // 2)
        if ('cap', k) in im:
            cu, cd = sweep(im[('cap', k)], CAP_T, CAP_B, (CAP_T + CAP_B) // 2)
            print('   %-6s %8.2f %8.2f   %-6s %8.2f %8.2f' % (k, ru, rd, k, cu, cd))
        else:
            print('   %-6s %8.2f %8.2f   %-6s %8s %8s' % (k, ru, rd, k, '—', '—'))

    # ⓓ 활성 면 ↔ 비활성 면
    print('\n ⓓ «7.91» 의 정체 — 활성 알약이 닿는 면 ↔ 안 닿는 면 (좌·우 직선 구간 y 2064..2074)')
    print('   %-6s %8s %8s   (활성 칸이 닿는 면은 셸 안쪽 립을 알약이 덮는다)' % ('ref', '좌', '우'))
    for k in sorted(REF):
        px = im[('ref', k)]
        bb = bar_x(px, (REF_T + REF_B) // 2)
        l, r = bb
        lv = [r_cov(prof(px, l - 6, y, 1, 0)) for y in range(2064, 2075)]
        rv = [r_cov(prof(px, r + 6, y, -1, 0)) for y in range(2064, 2075)]
        print('   %-6s %8.2f %8.2f' % (k, st.median([v for v in lv if v == v]),
                                       st.median([v for v in rv if v == v])))
    print('   07 상변 — 알약 열 %.2f ↔ 비알약 열 %.2f'
          % (r_cov(prof(r7, 400, REF_T - 6, 0, 1)), r_cov(prof(r7, 700, REF_T - 6, 0, 1))))

    # ⓔ 내부 일관성
    print('\n ⓔ 등재문 ⓑ «셸 테두리 = 알약 좌우 검정» (같은 자 · cov)')
    print('   ref  셸 %.2f  알약 %.2f  비 %.3f'
          % (r_cov(prof(r7, 400, REF_T - 6, 0, 1)), r_cov(prof(r7, pl - 7, pt_r + 40, 1, 0)),
             r_cov(prof(r7, 400, REF_T - 6, 0, 1)) / r_cov(prof(r7, pl - 7, pt_r + 40, 1, 0))))
    print('   cap  셸 %.2f  알약 %.2f  비 %.3f'
          % (r_cov(prof(c7, 400, CAP_T - 6, 0, 1)), r_cov(prof(c7, pl - 7, pt_c + 40, 1, 0)),
             r_cov(prof(c7, 400, CAP_T - 6, 0, 1)) / r_cov(prof(c7, pl - 7, pt_c + 40, 1, 0))))

    # ⓕ 기하 검산
    print('\n ⓕ 기하 검산 — 테두리 + 칸 + 테두리 = 바 바깥 (자를 안 대는 자)')
    for tag, px, t, b in (('ref', r7, REF_T, REF_B), ('cap', c7, CAP_T, CAP_B)):
        v_up = prof(px, 330, t - 6, 0, 1, 30)
        v_dn = prof(px, 330, b + 6, 0, -1, 30)
        cu, cd = _core(v_up), _core(v_dn)
        # 정수 K 런 (알약 열 — 립이 덮여 순수 테두리만 읽힌다)
        ku = r_run(v_up, 24)
        kd = r_run(v_dn, 24)
        outer = (b + 6 - cd[0]) - (t - 6 + cu[0]) + 1
        print('   %-4s 상 검정 %.0f · 하 검정 %.0f · 바깥(정수) %d ⇒ 칸 = %d'
              % (tag, ku, kd, outer, outer - ku - kd))
    print('   부분화소 바깥 높이 — ref %.2f ↔ cap %.2f'
          % (r_x50_outer(r7, 330, REF_T, REF_B), r_x50_outer(c7, 330, CAP_T, CAP_B)))
    print()


def r_x50_outer(px, x, t, b):
    """바 바깥 상변↔하변 (50% 교차)."""
    def edge(y0, dy):
        v = prof(px, x, y0, 0, dy, 26)
        c = _core(v)
        blk = min(v[c[0]:c[1] + 1])
        lo = st.median(v[max(0, c[0] - 6):max(1, c[0] - 2)])
        tgt = (lo + blk) / 2
        i = max(0, c[0] - 4)
        while i < c[0]:
            if (v[i] - tgt) * (v[i + 1] - tgt) <= 0:
                d = v[i] - v[i + 1]
                return y0 + dy * (i + (0.0 if d == 0 else (v[i] - tgt) / d))
            i += 1
        return y0 + dy * c[0]
    return edge(b + 6, -1) - edge(t - 6, 1)


main()
