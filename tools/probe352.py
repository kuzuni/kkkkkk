# 작업 352 — «337 이 남긴 넷» 을 ref/cap 에서 **같은 마스크로 동시에** 재는 재현기(픽셀 쪽).
#
#   338 규칙: 등재문의 처방을 따르기 전에 먼저 재현한다.
#   337 교훈 1: «같은 것» 을 재라 — 여기서는 같은 부품(.stabs 셸)의 **같은 칸·같은 면**이다.
#     07 스킬 시트는 ref 와 우리 양쪽에서 **가운데 칸(스킬)이 활성**이라 알약 자리가 1:1 이다.
#     03 은 209 로 칸이 2 → 3 이 됐고 ref 는 «오른쪽 칸» 이 활성이라 알약 대조에 못 쓴다.
#
#   좌표계: 서브탭 바는 하단 앵커(335 정오표) — cap_y = ref_y − 60. 가로는 1:1.
#
# ⚠ 검정 문턱이 둘이다 — **느슨(≤24)** 은 «어디가 테두리인가» 를 찾는 데 쓰고,
#   **순검정(≤4)** 은 «테두리가 몇 px 인가» 를 세는 데 쓴다. 이 둘을 안 가르면
#   JPEG AA 한 줄이 양쪽에 붙어 ref 테두리가 6 인데 **8 로 읽힌다**(ⓑ 의 정체).
#
# 사용:  python3 tools/probe352.py
from pydep937 import Image
import math

OFF = 60
LOOSE, PURE = 24, 4

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
REF3, CAP3 = 'docs/ref/03-던전-팝업.jpg', 'docs/review/96-full-dun.png'


def load(p):
    return Image.open(p).convert('RGB')


fmt = lambda c: '#%02X%02X%02X' % c


def runlen(px, x, y, dx, dy, thr, n=24):
    k = 0
    for i in range(n):
        if max(px[x + dx * i, y + dy * i]) <= thr:
            k += 1
        else:
            break
    return k


def strip(px, x, y, dx, dy, n=20):
    return ' '.join(fmt(px[x + dx * i, y + dy * i]) for i in range(n))


def first_black(px, y, xa, xb, thr):
    for x in range(xa, xb):
        if max(px[x, y]) <= thr:
            return x
    return None


def edge_v(px, x, ya, yb, thr):
    ys = [y for y in range(ya, yb) if max(px[x, y]) <= thr]
    return (min(ys), max(ys)) if ys else (None, None)


# ── ⓑ 테두리 두께 — 느슨/순검정 둘 다 ────────────────────────────────────
def border(tag, px, l, r, t, b, ycen, xcol):
    out = []
    for thr, nm in ((LOOSE, '느슨≤24'), (PURE, '순검정≤4')):
        # 순검정은 «가장자리 1px» 이 AA 라 안쪽으로 한 칸 들어가 세기 시작한다
        lo = runlen(px, l, ycen, 1, 0, thr) if thr == LOOSE else runlen(px, l + 1, ycen, 1, 0, thr)
        ro = runlen(px, r, ycen, -1, 0, thr) if thr == LOOSE else runlen(px, r - 1, ycen, -1, 0, thr)
        to = runlen(px, xcol, t, 0, 1, thr) if thr == LOOSE else runlen(px, xcol, t + 1, 0, 1, thr)
        bo = runlen(px, xcol, b, 0, -1, thr) if thr == LOOSE else runlen(px, xcol, b - 1, 0, -1, thr)
        out.append('%s 좌%d 우%d 상%d 하%d' % (nm, lo, ro, to, bo))
    print('   %-4s %s   |   %s' % (tag, out[0], out[1]))


# ── ⓐ 알약 코너 반경 — 원호 역산 ─────────────────────────────────────────
def radius(px, pill_l, pill_r, pill_t, tag, span=25):
    """상변에서 d 행 내려온 좌·우 인셋 ins → r = (d+ins) + √(2·d·ins).
       좌·우를 둘 다 재서 평균한다 — JPEG 가 좌 밴드를 얇게, 우 밴드를 두껍게 찍어
       검출 시작점이 양쪽 다 같은 방향으로 밀리므로 평균이 그 편향을 지운다."""
    est = {'L': [], 'R': []}
    prof = {'L': [], 'R': []}
    for d in range(1, span + 1):
        y = pill_t + d
        xs = [x for x in range(pill_l - 25, pill_r + 25) if max(px[x, y]) <= LOOSE]
        runs, cur = [], None
        for x in xs:
            if cur is None or x != cur[-1] + 1:
                if cur and len(cur) >= 3:
                    runs.append(cur)
                cur = [x]
            else:
                cur.append(x)
        if cur and len(cur) >= 3:
            runs.append(cur)
        if not runs:
            prof['L'].append('--'); prof['R'].append('--'); continue
        for side, ins in (('L', runs[0][0] - pill_l), ('R', pill_r - runs[-1][-1])):
            prof[side].append(str(ins))
            if ins > 0 and d >= 3:
                est[side].append((d + ins) + math.sqrt(2.0 * d * ins))
    med = {}
    for s in 'LR':
        v = sorted(est[s])
        med[s] = v[len(v) // 2] if v else float('nan')
    print('   %-4s 좌인셋 %s' % (tag, ' '.join(prof['L'][:16])))
    print('   %-4s 우인셋 %s' % ('', ' '.join(prof['R'][:16])))
    print('   %-4s r 좌 %.1f · 우 %.1f · **평균 %.1f**' % ('', med['L'], med['R'], (med['L'] + med['R']) / 2))
    return (med['L'] + med['R']) / 2


# ── ⓒ 구분선 ─────────────────────────────────────────────────────────────
def sep(px, x, ytop, tag):
    ys = [y for y in range(ytop, ytop + 97)
          if 45 <= px[x, y][0] <= 95 and 30 <= px[x, y][1] <= 80 and 20 <= px[x, y][2] <= 65
          and sum(px[x, y]) < 210]
    if not ys:
        print('   %-4s 구분선 표본 0' % tag); return None, None
    best = cur = [ys[0]]
    for y in ys[1:]:
        if y == cur[-1] + 1:
            cur.append(y)
        else:
            if len(cur) > len(best):
                best = cur
            cur = [y]
    if len(cur) > len(best):
        best = cur
    print('   %-4s y %d~%d (h %d) · 셸 바깥 상변에서 **+%d**' % (tag, best[0], best[-1], len(best), best[0] - ytop))
    return best[0] - ytop, len(best)


ref7, cap7 = load(REF7).load(), load(CAP7).load()
ref3, cap3 = load(REF3).load(), load(CAP3).load()

print('\n══════ 07 스킬 시트 — 4칸 · 활성 «스킬»(가운데) · 구분선 있음 ══════')
print(' ⓪ 셸 바깥 상자 (느슨 문턱으로 찾는다)')
print('   ref  x 66~1013 (w 948) · y 2021~2117 (h 97)')
print('   cap  x 65~1014 (w 950) · y 1960~2057 (h 98)   ← 437 로 상변이 1961 → 1960')

print('\n ⓑ 셸 검정 테두리 — «ref 8 ↔ 우리 6» 인가')
border('ref', ref7, 66, 1013, 2021, 2117, 2069, 663)
border('cap', cap7, 65, 1014, 1960, 2057, 2008, 663)   # 437 — 셸 98/테두리 7 로 상변 −1
print('   ref 좌 세로단면 %s' % strip(ref7, 66, 2069, 1, 0, 12))
print('   ref 상 가로단면 %s' % strip(ref7, 663, 2021, 0, 1, 12))
print('   ⇒ ref 의 순검정은 6 이고 그 바깥에 AA 가 한 줄씩 붙는다. 느슨 문턱으로 세면 8 이 된다.')
print('   ⚠ 437 (2026-08-30) 정오 — 이 두 줄의 결론은 **폐기**됐다. `probe437.py` 가 자 넷을')
print('     우리 캡처로 먼저 검산(넷 다 오차 0.00)한 뒤 ref 를 색 분류로 읽으니')
print('     K7 · B7 · F63 · B7 · D7 · K6(+AA) = 테두리 **7** · 칸 **84** · 바깥 **98** 이다.')
print('     «97 · 85 · 6» 은 정수 문턱이 부분화소를 버린 값이었다(부분화소 바깥 높이 ref 98.02).')

print('\n ⓓ 검정 안쪽 20px — 셸 좌·우 «밝은 림»')
print('   ref 좌 %s' % strip(ref7, 66, 2069, 1, 0))
print('   cap 좌 %s' % strip(cap7, 65, 2009, 1, 0))
print('   ref 우 %s' % strip(ref7, 1013, 2069, -1, 0))
print('   cap 우 %s' % strip(cap7, 1014, 2009, -1, 0))
print('   ref 03 좌 %s' % strip(ref3, 151, 2069, 1, 0))
print('   cap 03 좌 %s' % strip(cap3, 151, 2009, 1, 0))

print('\n ⓐ 활성 알약 «스킬» 코너 반경 — 원호 역산 (역산기는 우리 캡처로 검산한다)')
radius(ref7, 292, 551, 2027, 'ref')
radius(cap7, 291, 551, 1967, 'cap')

print('\n ⓒ `.stab-sep` 구분선 — x777(ref) / x775(cap)')
sep(ref7, 777, 2021, 'ref')
sep(cap7, 775, 1961, 'cap')
