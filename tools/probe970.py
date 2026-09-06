# 작업 970 — 알약 코너 반경 **자기검산 자**(원점을 리터럴에서 빼고 그림에 묻는다).
#
#   968 이 남긴 과녁 «ref rx 32.7 ± 1.3» 의 오차막대는 통째로 **손으로 적은 원점 1px**
#   (`probe352.radius(ref7, 292, 551, 2027, 'ref')`)에 걸려 있었다. 970 등재문의 ⓐ 가
#   «437 로 맞춰 2028 로» 였는데, 재현해 보니 그 처방은 **절반만 옳다**:
#
#     ⚑ 2027 ↔ 2028 은 «어느 정수가 맞나» 가 아니라 **ref 와 cap 이 서로 다른 규칙을 쓰고
#       있었다**는 것이다 — cap 은 셸상변 1960 + 테두리 **7** = 1967 인데 ref 만 2021 + **6** = 2027 이다.
#       (직접 단면: ref x420 세로 y2021..2027 이 검정 7행 · cap x420 y1960..1966 이 검정 7행.)
#       958 2회차가 «두 자를 섞은 짝» 이라 부른 바로 그 얼굴이고, 968·970 이 세 번째다.
#
#     ⚑ 그런데 **정수로 맞춰도 자는 여전히 틀린다** — 대조군이 그렇게 말한다.
#       참값 rx 30 인 우리 캡처를 옛 자가 **28.1** 로 읽는다(−1.9). 뿌리는 좌표 규약 둘이다:
#         ① 깊이  — `y = pill_t + d` 로 잡고 깊이를 `d` 로 쓰는데, 행 y 의 **표본 중심은 y+0.5**
#                   이라 참깊이는 `d + 0.5` 다(언제나 0.5 얕게 잰다).
#         ② 가로  — `pill_l` 이 손으로 적은 **정수**다(cap 참값은 DOM 290.75 · 리터럴 291).
#       둘 다 인셋·깊이를 같은 방향으로 깎아 r 이 작게 나온다.
#
#   ⇒ 이 자는 **원점 셋(상변·좌변·우변)을 전부 그림에서 부분 화소로 찾고**, 깊이를 표본 중심으로
#      잡는다. 손으로 적는 값은 «어디쯤부터 훑을까» 하는 **탐색 시작점**뿐이다(368 처방 —
#      «자리를 상수에서 빼고 제품에게 묻는다»).
#
#   ✅ **자기검산**: 참값을 아는 우리 캡처에서 자가 그 참값을 돌려주는지 먼저 본다.
#      돌려주지 못하는 자로 ref 를 읽으면 그 차이는 ref 의 것이 아니라 자의 것이다.
#
# 사용:
#   python3 tools/probe970.py                 ref ↔ cap (대조군 검산 + ref 역산)
#   python3 tools/probe970.py --img <png> <rx>  임의 캡처 한 장을 참값 rx 와 함께 읽는다(교정 스윕)
#   python3 tools/probe970.py --sweep <manifest>  «파일 참값» 줄들을 읽어 교정 곡선을 낸다
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pydep937 import Image, fail
import probe352 as P

REF7 = 'docs/ref/07-스킬-팝업.jpg'
CAP7 = 'docs/review/96-full-hero.png'

# 탐색 **시작점**일 뿐이다 — 진짜 원점은 아래 세 함수가 그림에서 잰다.
SCAN = {
    'ref': dict(shell_top=2021, pill_l=292, pill_r=551),
    'cap': dict(shell_top=1960, pill_l=291, pill_r=551),
}
SPAN = 25          # 코너를 훑는 깊이(옛 자와 같다)
STRAIGHT = (40, 50)  # 직선부로 쓰는 깊이 구간 — 코너(ry≈33)보다 깊고 아래 코너보다 얕다


def _lum(c):
    return max(c[:3])


def top_edge(px, x, shell_top):
    """알약 **윗 바깥 모서리**의 부분 화소 y — 셸 검정(K) ↔ 알약 첫 층(밝은 림) 경계.

    옛 자의 «셸상변 + 테두리 정수» 를 대신한다. 문턱은 두 층 **설계 밝기의 한복판**이라
    `probe352._cross` 와 같은 규약이다(사본 0 — 그 함수를 그대로 부른다)."""
    y0 = shell_top - 4
    cols = [px[x, y] for y in range(y0, shell_top + 24)]
    # 검정 런을 찾는다: 순검정 문턱 이하가 이어지는 첫 구간
    dark = [i for i, c in enumerate(cols) if _lum(c) <= P.LOOSE]
    if not dark:
        return None
    runs, cur = [], None
    for i in dark:
        if cur is None or i != cur[-1] + 1:
            if cur and len(cur) >= 3:
                runs.append(cur)
            cur = [i]
        else:
            cur.append(i)
    if cur and len(cur) >= 3:
        runs.append(cur)
    if not runs:
        return None
    end = runs[0][-1] + 1          # 검정 런 다음 표본 = 알약 첫 층
    return _cross_v(cols, end, 'K', 'R') + y0


def _cross_v(cols, i, cha, chb):
    """세로 단면용 — `probe352._cross` 를 그대로 쓴다(좌표계도 같다: 경계 = i · 중심 = i+0.5)."""
    return P._cross(cols, i, cha, chb)


def side_edges(px, pill_l, pill_r, y):
    """행 y 에서 알약 좌·우 **바깥 모서리**의 부분 화소 x (경계 좌표계)."""
    x0 = int(pill_l) - 25
    x1 = int(pill_r) + 25
    cols = [px[x, y] for x in range(x0, x1)]
    xs = [i for i, c in enumerate(cols) if _lum(c) <= P.LOOSE]
    if not xs:
        return None, None
    runs, cur = [], None
    for i in xs:
        if cur is None or i != cur[-1] + 1:
            if cur and len(cur) >= 3:
                runs.append(cur)
            cur = [i]
        else:
            cur.append(i)
    if cur and len(cur) >= 3:
        runs.append(cur)
    if not runs:
        return None, None
    iL, iR = runs[0][0], runs[-1][-1] + 1
    s = ''.join(P.cls352(c) for c in cols)
    rs = P._runspan(s)
    rL = next((q for q, r in enumerate(rs) if r[2] <= iL < r[2] + r[1]), None)
    rR = next((q for q, r in enumerate(rs) if r[2] <= iR - 1 < r[2] + r[1]), None)
    eL = P._cross(cols, iL, (P._side(rs, rL, -1) if rL is not None else 'R') or 'R', 'K')
    eR = P._cross(cols, iR, 'K', (P._side(rs, rR, +1) if rR is not None else 'R') or 'R')
    return eL + x0, eR + x0


def origins(px, tag, scan):
    """원점 셋을 그림에서 찾는다 — 상변(코너 밖 기둥 3열의 중앙값) · 좌변 · 우변(직선부 중앙값)."""
    st = scan['shell_top']
    xs = [int((scan['pill_l'] + scan['pill_r']) / 2) + k for k in (-40, 0, 40)]
    tops = [t for t in (top_edge(px, x, st) for x in xs) if t is not None]
    if not tops:
        fail('알약 윗 모서리를 못 찾았다 (%s)' % tag, '탐색 시작점 shell_top 을 확인하라')
    top = sorted(tops)[len(tops) // 2]

    ls, rs_ = [], []
    for d in range(STRAIGHT[0], STRAIGHT[1] + 1):
        y = int(math.floor(top + d))
        eL, eR = side_edges(px, scan['pill_l'], scan['pill_r'], y)
        if eL is not None:
            ls.append(eL)
            rs_.append(eR)
    if not ls:
        fail('알약 좌·우 모서리를 못 찾았다 (%s)' % tag, '직선부 구간 STRAIGHT 를 확인하라')
    left = sorted(ls)[len(ls) // 2]
    right = sorted(rs_)[len(rs_) // 2]
    return top, left, right


def fit_ellipse(rows, verbose=False):
    """인셋 프로파일에 **타원 코너**를 최소제곱으로 맞춘다 — (rx, ry) 를 같이 낸다.

    ⚑ 이것이 968 이 «눈금은 rx 가 아니라 원 모델을 씌운 원호지수» 라고 적은 자리의 처방이다.
      제품 코너는 `border-radius: 30px / 33px` = **타원**인데 옛 자의 역산식
      `r = (d+ins) + √(2·d·ins)` 은 **원**(rx = ry)을 가정한다. 원 모델을 타원에 씌우면
      값이 rx 도 ry 도 아닌 그 사이 어딘가로 떨어지고, 그 편향이 대조군의 −1.4 다.

      깊이 d 에서 타원 윤곽의 인셋:  ins = rx·(1 − √(1 − ((ry−d)/ry)²))     (0 ≤ d ≤ ry)
    """
    samples = []
    for d, insL, insR, _a, _b in rows:
        for ins in (insL, insR):
            if ins == ins and ins > 0:
                samples.append((d, ins))
    if len(samples) < 6:
        return float('nan'), float('nan'), float('nan')

    def sse(rx, ry):
        s = 0.0
        for d, ins in samples:
            if d >= ry:
                continue
            u = (ry - d) / ry
            m = rx * (1.0 - math.sqrt(max(0.0, 1.0 - u * u)))
            s += (ins - m) ** 2
        return s

    best = None
    # 성긴 격자 → 세밀 격자 (파라미터가 둘뿐이라 훑는 것이 가장 정직하다)
    for step, span in ((0.5, None), (0.05, 1.0), (0.005, 0.1)):
        if best is None:
            rxs = [20 + i * step for i in range(int(30 / step) + 1)]
            rys = [20 + i * step for i in range(int(30 / step) + 1)]
        else:
            rxs = [best[0] - span + i * step for i in range(int(2 * span / step) + 1)]
            rys = [best[1] - span + i * step for i in range(int(2 * span / step) + 1)]
        cand = None
        for rx in rxs:
            for ry in rys:
                if rx <= 1 or ry <= 1:
                    continue
                e = sse(rx, ry)
                if cand is None or e < cand[2]:
                    cand = (rx, ry, e)
        best = cand
    rms = math.sqrt(best[2] / len(samples))
    return best[0], best[1], rms


def radius(px, tag, scan, verbose=True):
    """원호 역산 — 식은 옛 자 그대로 `r = (d+ins) + √(2·d·ins)` 이고, **깊이·인셋만**
       부분 화소 원점 위에서 다시 잡는다(표본 자리·창·문턱·«어느 런인가» 규칙 전부 옛 자 그대로)."""
    top, left, right = origins(px, tag, scan)
    est = {'L': [], 'R': []}
    rows = []
    for k in range(0, SPAN):
        y = int(math.floor(top)) + k
        d = (y + 0.5) - top                      # ⚑ 표본 **중심**까지의 참깊이
        if d < 3:                                # 옛 자와 같은 하한(얕은 행은 경사가 가팔라 못 쓴다)
            continue
        eL, eR = side_edges(px, scan['pill_l'], scan['pill_r'], y)
        if eL is None:
            continue
        insL, insR = eL - left, right - eR
        row = [d, insL, insR, float('nan'), float('nan')]
        for side, ins in (('L', insL), ('R', insR)):
            if ins > 0:
                r = (d + ins) + math.sqrt(2.0 * d * ins)
                est[side].append(r)
                row[3 if side == 'L' else 4] = r
        rows.append(row)
    med = {}
    for s in 'LR':
        v = sorted(est[s])
        med[s] = v[len(v) // 2] if v else float('nan')
    avg = (med['L'] + med['R']) / 2
    rx, ry, rms = fit_ellipse(rows)
    if verbose:
        print('   %-4s 원점(그림)  상변 %.2f · 좌변 %.2f · 우변 %.2f  (폭 %.2f)'
              % (tag, top, left, right, right - left))
        print('   %-4s 깊이  %s' % ('', ' '.join('%5.1f' % r[0] for r in rows[:12])))
        print('   %-4s 인셋좌 %s' % ('', ' '.join('%5.2f' % r[1] for r in rows[:12])))
        print('   %-4s 인셋우 %s' % ('', ' '.join('%5.2f' % r[2] for r in rows[:12])))
        print('   %-4s 원 모델(옛 눈금) 좌 %.2f · 우 %.2f · 평균 %.2f  (표본 %d·%d)'
              % ('', med['L'], med['R'], avg, len(est['L']), len(est['R'])))
        print('   %-4s ▸ **타원 맞춤  rx %.2f · ry %.2f**  (RMS %.3f)' % ('', rx, ry, rms))
    return rx, ry, rms, (top, left, right), avg



def profile(px, tag, scan):
    """깊이 → (좌인셋, 우인셋) 표. 원점은 그림에서 찾은 부분 화소다."""
    top, left, right = origins(px, tag, scan)
    out = []
    for k in range(0, SPAN):
        y = int(math.floor(top)) + k
        d = (y + 0.5) - top
        if d < 3:
            continue
        eL, eR = side_edges(px, scan['pill_l'], scan['pill_r'], y)
        if eL is None:
            continue
        out.append((d, eL - left, right - eR))
    return out, (top, left, right)


def _interp(prof, d, idx):
    """깊이 d 에서의 인셋을 선형 보간 — ref·cap 의 깊이 눈금이 부분 화소만큼 어긋나 있다."""
    for i in range(len(prof) - 1):
        d0, d1 = prof[i][0], prof[i + 1][0]
        if d0 <= d <= d1 and d1 > d0:
            t = (d - d0) / (d1 - d0)
            return prof[i][idx] + t * (prof[i + 1][idx] - prof[i][idx])
    return float('nan')


def ratio(ref_px, cap_px, lo=5.0, hi=20.0):
    """⚑ **모델 없는 비율 자** — 같은 깊이에서 «ref 인셋 ÷ 우리 인셋».

    타원 인셋은 `ins = rx · f(d, ry)` 라 **rx 에 대해 1차**다. 두 그림의 ry 가 같다면
    같은 깊이의 비율이 곧 `rx_ref / rx_cap` 이고, 우리 rx 는 선언으로 안다(30).
    원 모델도, 원호지수도, 절대 좌표계도 안 쓴다 — 그래서 968 이 «원 모델을 씌운 지수» 라고
    적은 편향과 좌표 규약 편향이 **분자·분모에서 상쇄된다**(970 등재문 ⓑ 의 뜻).

    ⚠ 얕은 깊이(<5)는 JPEG 경사면이 인셋을 부풀리고, 깊은 쪽(>20)은 인셋이 작아 비율의
      분모가 작다 — 그래서 창을 5..20 으로 잡고 **좌·우를 따로** 보고한다."""
    pr, _o1 = profile(ref_px, 'ref', SCAN['ref'])
    pc, _o2 = profile(cap_px, 'cap', SCAN['cap'])
    rows = []
    for d in [x * 0.5 for x in range(int(lo * 2), int(hi * 2) + 1)]:
        a = [_interp(pc, d, 1), _interp(pc, d, 2)]
        b = [_interp(pr, d, 1), _interp(pr, d, 2)]
        if any(v != v for v in a + b) or min(a) <= 0:
            continue
        rows.append((d, b[0] / a[0], b[1] / a[1]))
    return rows



def ratio_diff(ref_px, cap_px, lo=4.0, hi=22.0, gap=6.0):
    """⚑⚑ **원점에도 면역인 비율 자** — 인셋의 «차» 로 묻는다.

    원점이 e 만큼 틀리면 모든 인셋이 `ins + e` 로 **같이** 밀린다. 그래서 같은 그림 안에서
    두 깊이의 **차** `ins(d1) − ins(d2)` 는 e 가 소거된다. 그 차는 여전히 rx 에 1차이므로

        rx_ref / rx_cap = [ins_ref(d1) − ins_ref(d2)] ÷ [ins_cap(d1) − ins_cap(d2)]

    이고 **원점·원 모델·좌표 규약 셋 다 안 쓴다**. 970 등재문 ⓑ 가 «자기 직선부 대비 비율» 로
    노린 상쇄를 원점까지 넓힌 꼴이다.
    ⚠ 여전히 남는 전제는 «ref 와 우리의 ry 가 같다» 하나다(§ry 로 따로 검산한다)."""
    pr, _o1 = profile(ref_px, 'ref', SCAN['ref'])
    pc, _o2 = profile(cap_px, 'cap', SCAN['cap'])
    ds = [x * 0.5 for x in range(int(lo * 2), int(hi * 2) + 1)]
    out = {'L': [], 'R': []}
    for i, d1 in enumerate(ds):
        for d2 in ds[i:]:
            if d2 - d1 < gap:
                continue
            for side, idx in (('L', 1), ('R', 2)):
                a1, a2 = _interp(pc, d1, idx), _interp(pc, d2, idx)
                b1, b2 = _interp(pr, d1, idx), _interp(pr, d2, idx)
                if any(v != v for v in (a1, a2, b1, b2)):
                    continue
                da, db = a1 - a2, b1 - b2
                if da <= 0.5:
                    continue
                out[side].append(db / da)
    return out


def main():
    a = sys.argv[1:]

    if '--img' in a:
        i = a.index('--img')
        img = a[i + 1]
        truth = float(a[i + 2]) if len(a) > i + 2 else float('nan')
        px = P.load(img).load()
        print('\n── %s  (참값 rx %s) ──' % (img, truth))
        rx, ry, rms, _o, _avg = radius(px, 'cap', SCAN['cap'])
        print('   ⇒ 읽음 rx %.2f · 참값 %.2f · 오차 %+.2f' % (rx, truth, rx - truth))
        return

    if '--sweep' in a:
        man = a[a.index('--sweep') + 1]
        print('\n══ 970 교정 스윕 — 우리 제품의 선언 rx 를 바꿔 가며 자를 검산한다 ══\n')
        print('   %-34s %8s %8s %8s' % ('파일', '참값', '읽음', '오차'))
        errs = []
        for line in open(man, encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            f, t = line.rsplit(None, 1)
            px = P.load(f).load()
            rx, ry, rms, _o, _avg = radius(px, 'cap', SCAN['cap'], verbose=False)
            print('   %-34s %8.2f %8.2f %+8.2f   (ry %.2f · RMS %.3f)'
                  % (os.path.basename(f), float(t), rx, rx - float(t), ry, rms))
            errs.append(rx - float(t))
        if errs:
            m = sum(errs) / len(errs)
            print('\n   평균 오차 %+.3f · 최대 |오차| %.3f · 표본 %d' % (m, max(abs(e) for e in errs), len(errs)))
        return

    ref = P.load(REF7).load()
    print('\n══ 970 — 알약 코너 반경: 원점을 그림에 묻는 자 ══')
    print('\n ① 대조군 검산 — 참값을 아는 우리 캡처에서 자가 참값을 돌려주는가')
    if os.path.exists(CAP7):
        cap = P.load(CAP7).load()
        rx, ry, rms, _o, _avg = radius(cap, 'cap', SCAN['cap'])
        print('   ⇒ 제품 선언 **rx 30 / ry 33** ↔ 자 **rx %.2f / ry %.2f** (오차 %+.2f / %+.2f)'
              % (rx, ry, rx - 30.0, ry - 33.0))
    else:
        print('   ⚠ 캡처 없음 (%s) — 커밋 금지 자산이라 없는 클론이 정상이다.' % CAP7)
        print('     `node tools/cap96.js` 로 만들 수 있다. 대조군 없이 ref 만 읽는다.')

    print('\n ③ 모델 없는 비율 자 — 같은 깊이에서 ref 인셋 ÷ 우리 인셋')
    if os.path.exists(CAP7):
        rows = ratio(ref, P.load(CAP7).load())
        print('   깊이  %s' % ' '.join('%5.1f' % r[0] for r in rows))
        print('   좌비  %s' % ' '.join('%5.2f' % r[1] for r in rows))
        print('   우비  %s' % ' '.join('%5.2f' % r[2] for r in rows))
        vs = sorted([r[1] for r in rows] + [r[2] for r in rows])
        med = vs[len(vs) // 2]
        q1, q3 = vs[len(vs) // 4], vs[3 * len(vs) // 4]
        print('   ⇒ 비율 중앙값 **%.3f** (사분위 %.3f~%.3f · 표본 %d)' % (med, q1, q3, len(vs)))
        print('   ⇒ 우리 선언 rx 30 × %.3f = **rx %.2f** (사분위 %.2f~%.2f)'
              % (med, 30 * med, 30 * q1, 30 * q3))

    print('\n ④ 원점 면역 자 — 인셋 «차» 의 비율 (원점·원 모델 둘 다 안 쓴다)')
    if os.path.exists(CAP7):
        o = ratio_diff(ref, P.load(CAP7).load())
        for side in 'LR':
            v = sorted(o[side])
            if not v:
                continue
            m = v[len(v) // 2]
            q1, q3 = v[len(v) // 4], v[3 * len(v) // 4]
            print('   %s  비율 중앙값 %.3f (사분위 %.3f~%.3f · 표본 %d)  ⇒ rx %.2f'
                  % (side, m, q1, q3, len(v), 30 * m))
        allv = sorted(o['L'] + o['R'])
        m = allv[len(allv) // 2]
        q1, q3 = allv[len(allv) // 4], allv[3 * len(allv) // 4]
        print('   ⇒ 좌우 합친 중앙값 **%.3f** ⇒ **rx %.2f** (사분위 %.2f~%.2f · 표본 %d)'
              % (m, 30 * m, 30 * q1, 30 * q3, len(allv)))

    print('\n ② ref — 같은 자로 읽는다')
    rx, ry, rms, _o, _avg = radius(ref, 'ref', SCAN['ref'])
    print('   ⇒ ref **rx %.2f / ry %.2f**' % (rx, ry))


if __name__ == '__main__':
    main()
