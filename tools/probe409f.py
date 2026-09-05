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
# 사용:  python3 tools/probe409f.py [--x0 14] [--x1 40]
import sys
from pydep937 import Image

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


def top_of_column(px, bx, by, x, y_probe):
    """(bx+x, by+y_probe) 를 품은 검정 기둥의 **윗끝**(국소 y). 없으면 None."""
    ax = bx + x
    y = by + y_probe
    c = px[ax, y]
    if sum(c) / 3.0 > DARK_MAX:
        return None
    while y - 1 >= by - 10 and sum(px[ax, y - 1]) / 3.0 <= DARK_MAX:
        y -= 1
    return y - by


def shoulder(who, im, x0, x1):
    bx, by = BOX[who]
    px = im.load()
    base = top_of_column(px, bx, by, 39, PROBE_Y)
    out = {}
    for x in range(x0, x1):
        t = top_of_column(px, bx, by, x, PROBE_Y)
        out[x] = None if (t is None or base is None) else base - t
    return base, out


def main():
    a = sys.argv[1:]

    def opt(n, d):
        return int(a[a.index(n) + 1]) if n in a else d

    x0, x1 = opt('--x0', 14), opt('--x1', 40)
    ims = {'ref': Image.open(REF7).convert('RGB'), 'cap': Image.open(CAP7).convert('RGB')}
    base, sh = {}, {}
    for who in ('ref', 'cap'):
        base[who], sh[who] = shoulder(who, ims[who], x0, x1)

    print('══ 409-f — 어깨(직선부 대비 검정 기둥 증가분) · 알약 좌하 코너 ══')
    print('   기준선(x=39 기둥 윗끝, 국소 y): ref %s · cap %s' % (base['ref'], base['cap']))
    print('   x   ref  cap   Δ')
    l1, n = 0, 0
    for x in range(x0, x1):
        r, c = sh['ref'][x], sh['cap'][x]
        if r is None or c is None:
            print('  %3d   %-4s %-4s  —' % (x, r, c))
            continue
        d = c - r
        if x >= 18:
            l1 += abs(d)
            n += 1
        print('  %3d   %-4d %-4d  %+d' % (x, r, c, d))
    print('\n  L1(x 18..39) = %d   (평균 |Δ| = %.2f px)' % (l1, l1 / max(n, 1)))


main()
