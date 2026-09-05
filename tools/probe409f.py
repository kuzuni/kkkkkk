# 작업 409 10회차 — **«어깨» 를 한 숫자로 만드는 자.**
#
#   9회차 채점에서 두 비평가(DK·DL)가 독립으로 짚은 «남은 하나» 는 코너에서 검정이
#   직선부보다 얼마나 두꺼워지는가 — «어깨» 다. 그런데 8·9회차의 자는 둘 다
#   그것을 **못 센다**:
#     · `probe409e --rays` 는 코너 «중심» 에서 각도로 쏘므로 **접선 근처(0°)** 한 점만 본다.
#     · `probe409e`(열별 단면)는 런을 글자로 찍을 뿐이라 «몇 px 두꺼운가» 를 사람이 세야 한다.
#
#   이 자는 열마다 **바 아래 테두리를 품은 검정 기둥의 윗끝**을 재고, 직선부(x=39)를
#   기준선으로 삼아 **어깨 = 기준선 − 그 열의 윗끝** 을 낸다. ref 와 cap 의 셸 두께가
#   1px 다르므로(ref 85..91 · cap 84..91) 절대 y 가 아니라 **직선부 대비 증가분**으로 읽는다 —
#   그래야 두 그림을 같은 자로 비교할 수 있다.
#
#   출력 끝의 `L1` 이 이 회차의 판정값이다: 어깨 곡선의 |ref − cap| 합(x 18..39).
#
# ⚑⚑ **942 4회차(2026-09-05) — 기둥 윗끝을 «정수 while 걷기» 에서 문턱 교차 보간으로 갈아 끼웠다.**
#   932 전수가 이 자를 갈래 **B**(번짐 비대칭)로 적었다: `top_of_column` 이 `while y -= 1` 로
#   **정수 y 만** 잡아 윗끝이 언제나 «검정인 첫 화소» 에 스냅한다. ref 는 JPEG 이라 경계가
#   2~3px 번지고 cap 은 PNG 라 칼같으므로 그 스냅이 **ref 만** 깎는다 —
#   판정값(어깨)이 0~7px 이라 ±1px 이 곧 ±14~50% 다.
#   ⇒ 걸음도 문턱(`DARK_MAX 42`)도 탐침 행(`PROBE_Y 88`)도 기준선 열(x=39)도 **한 칸 안 바꾸고**,
#     «어두워지는 마지막 한 칸» 만 **부분 화소**로 민다 — 문턱을 지나는 자리를 선형 보간으로 잡는
#     932 처방 ⓐ(`scan895.stroke_thk`·`probe409i.cross()` 와 같은 꼴)다.
#   옛 자는 `--int` 로 그대로 산다.
#
# 사용:  python3 tools/probe409f.py [--x0 14] [--x1 40] [--int] [--physics]
import os
import sys
from pydep937 import Image
from probe409g import phys_cols as g_phys_cols

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
# 알약 상자 — probe409e 와 같은 값(352 §3·§10 · 7회차 §16-1 정정).
# ⚠⚠ **409 17회차 — 아래 `BOX['ref']` 의 x=292 는 1.32px 틀렸다(고치지 않고 남겨 둔다).**
#    ref 알약의 검정 링은 실제로 x 290.73..297.98 이라 **좌변은 290.7** 이다(측정표 07 정오표).
#    값을 그대로 두는 것은 이 파일들이 남긴 **옛 읽기를 재현할 수 있게** 하기 위해서다 —
#    새로 재는 자리에는 `tools/probe409i.py` 를 써라. 그것은 알약 네 변을 **그림에서** 직선
#    스캔해 상자를 잡고, cap 에서 DOM 실측과 0.14px 로 검산된다.
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
H = 84

# «검정» 판정 — 순검정(K)과 그 AA/반투명(S #2B231A)을 같이 센다.
# 어깨는 두께 축이라 AA 를 빼면 회차마다 ±1 이 흔들린다(16-1 의 1px 오차와 같은 함정).
DARK_MAX = 42          # RGB 평균이 이 값 이하면 «검정 기둥»(K 0 · S 34.7 는 포함 · D 49.3 · F 60.7 · B 77.7 은 제외)
PROBE_Y = 88           # 셸 아래 테두리 한복판(ref·cap 둘 다 검정)


MODE = 'cross'      # 942 4회차 — `--int` 면 옛 자(정수 while 걷기)가 그대로 돈다


def top_from(vals, y0, mode=None):
    """휘도 줄 `vals`(칸 = 국소 y) 에서 `y0` 을 품은 검정 기둥의 **윗끝**(국소 y · 실수).

    ⚑ 942 4회차 — 옛 자는 «검정인 첫 칸» 의 정수 y 를 돌려줬다. 참 경계는 그 칸과 위 칸
       **사이**에 있고(밝음 pv > 문턱 ≥ 어두움 v), 번진 판에서는 그 사이가 2~3칸으로 벌어진다.
       ⇒ 문턱을 지나는 자리를 선형으로 잡는다 — 걸음·문턱·창은 그대로다."""
    if y0 < 0 or y0 >= len(vals) or vals[y0] > DARK_MAX:
        return None
    y = y0
    while y - 1 >= 0 and vals[y - 1] <= DARK_MAX:
        y -= 1
    if (mode or MODE) == 'int' or y == 0:
        return float(y)
    pv, v = vals[y - 1], vals[y]
    f = (pv - DARK_MAX) / (pv - v) if pv != v else 0.0
    # ⚑ 좌표는 «화소의 윗변» — 표본은 화소 **중심**에서 오므로 교차 자리에 +0.5 를 더해야
    #   옛 자(= 검정인 첫 화소의 윗변)와 **같은 공간의 값**이 된다(합성 재현이 이것을 못박는다:
    #   +0.5 를 빼먹으면 칼같은 판에서 참값보다 언제나 0.5 작게 나온다).
    return (y - 1) + f + 0.5


def column(px, bx, by, x, lo=-10, hi=None):
    """열 하나의 휘도 줄(칸 = 국소 y · `lo` 부터). 자가 보는 화소는 옛 자와 **같은 자리**다."""
    ax = bx + x
    hi = H + 12 if hi is None else hi
    return [sum(px[ax, by + y]) / 3.0 for y in range(lo, hi)], -lo


def top_of_column(px, bx, by, x, y_probe, mode=None):
    """(bx+x, by+y_probe) 를 품은 검정 기둥의 **윗끝**(국소 y). 없으면 None."""
    vals, off = column(px, bx, by, x)
    t = top_from(vals, off + y_probe, mode)
    return None if t is None else t - off


def shoulder(who, im, x0, x1):
    bx, by = BOX[who]
    px = im.load()
    base = top_of_column(px, bx, by, 39, PROBE_Y)
    out = {}
    for x in range(x0, x1):
        t = top_of_column(px, bx, by, x, PROBE_Y)
        out[x] = None if (t is None or base is None) else base - t
    return base, out


def physics(sig=1.1, edges=(0.0, 0.20, 0.40, 0.55, 0.60, 0.80)):
    """**합성 재현(942 4회차)** — 그림도 브라우저도 안 쓴다. 판은 `probe409g.phys_cols` 가 그린다
       (셈은 저장소에 하나뿐이다). 검정 기둥의 참 윗끝을 0.05px 씩 옮겨 가며
       «칼같은 판(cap = PNG)» ↔ «번진 판(ref = JPEG)» 을 두 자로 읽는다."""
    print('══ 409-f/physics — 검정 기둥 윗끝을 «칼같은 판» ↔ «번진 판» 에서 두 자로 ══')
    print('   참값 = 밝은 띠(B) 다음에 검정(K) 7px · 번짐 σ %.1fpx · 걸음 1px(= 이 자의 열 걸음)\n' % sig)
    print('   %-8s %-6s %8s %8s %8s   %8s %8s %8s'
          % ('참 윗끝', '자', 'cap', 'ref', 'Δ(ref−cap)', '', '', ''))
    rows = []
    for e in edges:
        top = 6.0 + e
        cols = g_phys_cols(widths=(('B', top), ('K', 7.0), ('D', 4.0)), sig=sig, step=1.0)
        vals = {w: [sum(c) / 3.0 for c in cols[w]] for w in cols}
        for mode in ('int', 'cross'):
            got = {}
            for w in ('cap', 'ref'):
                y0 = int(top) + 3          # 기둥 한복판(참 윗끝 아래 3칸)
                t = top_from(vals[w], y0, mode)
                got[w] = float('nan') if t is None else t
            rows.append((top, mode, got['cap'], got['ref']))
            print('   %-8.2f %-6s %8.2f %8.2f %8.2f' % (top, mode, got['cap'], got['ref'],
                                                        got['ref'] - got['cap']))
    print('')
    for mode in ('int', 'cross'):
        rs = [r for r in rows if r[1] == mode]
        ecap = max(abs(r[2] - r[0]) for r in rs)
        eref = max(abs(r[3] - r[0]) for r in rs)
        d = max(abs(r[3] - r[2]) for r in rs)
        grid = all(abs(r[2] - round(r[2])) < 1e-9 and abs(r[3] - round(r[3])) < 1e-9 for r in rs)
        print('   %-6s 참값 대비 최대 오차  cap %.2f · ref %.2f   판 사이 최대 편차 %.2f%s'
              % (mode, ecap, eref, d, '   (값이 전부 정수 격자)' if grid else ''))
    return rows


def main():
    global MODE
    a = sys.argv[1:]
    MODE = 'int' if '--int' in a else 'cross'
    if '--physics' in a:
        physics()
        return

    def opt(n, d):
        return int(a[a.index(n) + 1]) if n in a else d

    x0, x1 = opt('--x0', 14), opt('--x1', 40)
    # ⚠ 캡처 PNG 는 **커밋 금지 자산**이라 없는 클론이 정상이다 — 없으면 ref 절만 돈다(409g·409c·409i 선례).
    ims = {'ref': Image.open(REF7).convert('RGB')}
    if os.path.exists(CAP7):
        ims['cap'] = Image.open(CAP7).convert('RGB')
    who_all = tuple(w for w in ('ref', 'cap') if w in ims)
    base, sh = {}, {}
    for who in who_all:
        base[who], sh[who] = shoulder(who, ims[who], x0, x1)

    print('══ 409-f — 어깨(직선부 대비 검정 기둥 증가분) · 알약 좌하 코너 ══')
    print('   자   %s' % ('**옛 정수 while 걷기**(--int · 값이 언제나 정수 — 942 4회차가 갈아 끼운 자리)'
                          if MODE == 'int' else '문턱 교차 보간(942 4회차 · 걸음·문턱·창 불변)'))
    if 'cap' not in ims:
        print('   ⚠ 캡처 없음(%s) — ref 절만 돈다. 만들려면 `node tools/cap96.js`.' % CAP7)
    print('   기준선(x=39 기둥 윗끝, 국소 y): %s'
          % ' · '.join('%s %.2f' % (w, base[w]) for w in who_all if base[w] is not None))
    print('   x   ref    cap    Δ')
    l1, n = 0.0, 0
    for x in range(x0, x1):
        r = sh['ref'][x]
        c = sh['cap'][x] if 'cap' in sh else None
        if r is None or c is None:
            print('  %3d   %-6s %-6s  —'
                  % (x, '%.2f' % r if r is not None else 'None',
                     '%.2f' % c if c is not None else 'None'))
            continue
        d = c - r
        if x >= 18:
            l1 += abs(d)
            n += 1
        print('  %3d   %-6.2f %-6.2f %+.2f' % (x, r, c, d))
    print('\n  L1(x 18..39) = %.2f   (평균 |Δ| = %.2f px)' % (l1, l1 / max(n, 1)))


main()
