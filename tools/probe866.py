#!/usr/bin/env python3
# 작업 866 — 89 유물 소환 «부품 치수» 의 **자 하나**.
#
#   python3 tools/probe866.py                             # 레퍼런스만 잰다
#   node tools/probe866.js                                # 우리 렌더를 캡처해 아래를 같이 돌린다
#   python3 tools/probe866.py --cap <png> --geo <json>    # 둘을 같은 자로 나란히
#
# ── 왜 자를 새로 세우는가 ────────────────────────────────────────────────────
# 813 5·6회차 채점자 넷이 이 세 자리를 각자 쟀는데 **자기 자를 밝히지 않은 값이 섞였다.**
# A1 2차 라운드의 «계측 정의가 다르면 일치해도 틀린다» 와 같은 자리라, 866 은
# **레퍼런스와 우리 렌더를 같은 함수로** 재고 그 정의를 여기에 적어 둔다(334 규약).
#
# 재는 것(정의) —
#   ⓐ 수반 잉크 상변 : 중앙 띠에서 «배경보다 12 계조 밝은» 화소가 가로로 60px 이상 이어지는
#                      행이 **8행 연속** 나타나는 첫 행. (한 줄만 보면 위쪽 바닥·계단 결이
#                      500~502·511~515 에서 같은 길이의 줄을 만든다 — 실측으로 확인했다.)
#   ⓑ 수반 잉크 하변 : 밑판 아랫변 — 813 6회차 `scan813c` 의 정의를 **그대로** 가져왔다
#                      (안내문 위 30행 창에서 «가장 긴 밝은 가로줄», 그림자는 짧아 탈락).
#   ⓒ 림 최대 폭     : 상변~(높이의 30%) 구간의 최장 가로 연속.
#   ⓓ 발(밑판) 폭    : ⓑ 행의 가로 연속 길이.
#   ⓔ 알약 바깥 잉크 : 내부 색(#191614 — 두 그림이 **같은 값**)의 최장 가로 연속을 씨앗으로
#                      좌·우·상·하로 걸어 나가며 **검정 테두리(lum < 25)의 바깥 모서리**를 잡는다.
#                      걸음은 **국면 셋**이다(ⓐ 속 → ⓑ 베벨 ≤2px → ⓒ 검정 테두리, ⓒ 가 끊기면 끝).
#                      ⚠ 그 바깥의 밝은 띠(ref x181~183 · 301~303)는 **알약이 아니다** —
#                      알약 하변보다 6~11행 더 내려가므로 [검산] 절이 그것을 같이 찍는다.
#                      ⚑ **904 가 이 두 줄을 고쳤다** — 옛 판은 국면이 없어 ⓒ 뒤의 밝은 한 칸까지
#                      건너뛰어 세로를 24 → 26 으로 읽었고, 속 «폭» 을 bbox 가 아니라 최장 연속으로
#                      재서 113 → 111 로 읽었다. 두 오차가 «테 3 ref px» 를 만들어 제품이 4.5+2.2 로
#                      두꺼워졌다. 지금 값은 **바깥 117×24 · 속 113×20 · 테 등방 2** 다.
#                      ⚑ **945 가 «세로를 어디서 재는가» 를 고쳤다** — 옛 창은 `vx = l + 10`
#                      한 열이고 그 열은 둥근 캡의 어깨 위다(캡 반지름 ≈ 12 · 바깥 폭 117).
#                      부분 화소로 갈고 나서야 그 인공물이 드러났다(테 가로 2.31 ↔ 세로 2.65) —
#                      정수 격자는 캡 4.9 와 가운데 2.2 를 **둘 다 2** 로 뭉갰다. 이제 세로는
#                      **평평한 구간(`v_band` = 바깥 폭 18~82%) 열들의 중앙값**이고, 짝인 자
#                      `probe904.js` 의 `phase` 걸음(씨앗 행 span 전체)과 같은 자리를 본다.
#
# 환산은 813·859 가 쓴 것과 같은 k = 1080 / 486 (ref 크롭 폭 → 프레임 폭).
import json
import sys

from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»

REF = 'docs/ref/89-유물-팝업.png'
K = 1080 / 486.0
EDGE_TH = 12
RUN_TOP, PERSIST = 60, 8
RUN_MIN = 60
DARK_TH = 25
PILL_RGB = (0x19, 0x16, 0x14)
PILL_TOL = 6                                       # 속 판정 — `inside()` 가 쓰던 값 그대로
SUB = '--int' not in sys.argv                      # 932 4회차: 부분 화소가 기본(--int 로 옛 정수 자)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def pill_d(p):
    """«속(#191614) 인가» 의 투영 — `inside()` 가 쓰는 것과 **같은 판정**을 수로 낸다
       (채널별 절대차의 최댓값 · 문턱 PILL_TOL). `inside(x,y) ⟺ pill_d(p) <= PILL_TOL`."""
    return max(abs(p[i] - PILL_RGB[i]) for i in range(3))


def _cross(v_in, v_out, th):
    """마지막 «안» 화소(v_in)와 첫 «밖» 화소(v_out) 사이에서 문턱 th 를 지나는 자리 —
       안 화소 중심에서 **밖으로 몇 칸**인가(0..1). 못 가르면 None.

    ⚑⚑ 932 4회차 — **정의는 한 글자도 안 바꾸고 걸음만 정수에서 부분 화소로 간다.**
      선례는 이 저장소 안에 둘 있다: `scan667b.edge_sub`(932 3회차) · `scan667b.left_edge`(2회차).
      둘 다 «같은 투영·같은 문턱의 교차점 선형 보간» 이고, 여기도 그대로다 —
      바깥 모서리는 `lum` 과 `DARK_TH`, 속 모서리는 `pill_d` 와 `PILL_TOL` 로,
      **`edge()` 의 국면 걸음(904 수리)과 `inside()` 의 판정은 손대지 않는다.**

    ⚠ 왜 «두께 자체» 를 적분(ⓑ)하지 않는가 — 이 자의 얇은 축(테)은 두께를 직접 재는 것이
      아니라 **두 모서리의 차**(바깥 117 − 속 113)다. 932 1회차 물리표의 마지막 줄과
      3회차 ⓚ 가 그 자리를 갈라 두었다: ⓑ 는 두께 축, ⓐ 는 경계 위치 축.
      소속도·질량으로 갈면 베벨(속과 테 사이의 밝은 한두 칸)을 반쯤 세게 되어
      **재는 것이 바뀐다**(2회차가 금판에서 +10%, 3회차가 +13% 로 밟은 그 자리).

    ⚠ 남는 «번짐» 비대칭(ref 는 JPEG 라 경사면이 넓어 문턱 자가 ref 를 얇게 읽는다)은
      이 번호의 몫이 아니다 — **942** 로 따로 등재돼 있다. 여기서 없애는 것은 **격자**뿐이다.
    """
    if v_out == v_in:
        return None
    f = (th - v_in) / float(v_out - v_in)
    return min(1.0, max(0.0, f))


def out_f(px, x, y, dx, dy, val, th):
    """마지막 «안» 화소 (x,y) 에서 바깥(dx,dy) 쪽 부분 화소 여유(0..1) — 932 4회차.
       `--int` 면 옛 정수 자 그대로 0.5(= 화소 바깥 면)를 준다."""
    if not SUB:
        return 0.5
    try:
        f = _cross(val(px[x, y]), val(px[x + dx, y + dy]), th)
    except IndexError:
        return 0.5
    return 0.5 if f is None else f


def v_band(l, r):
    """[945] 세로를 재는 창 — 알약의 **평평한 가운데 구간**(바깥 폭의 18~82%).

    ⚑⚑ 945 — 옛 창은 `vx = l + 10` **한 열**이었고 그 열은 둥근 캡의 어깨 위다.
      알약 바깥 폭이 117 ref px 인데 캡 반지름이 12 안팎이라 l+10 은 이미 기울기 위이고,
      거기서 세로 자는 테를 **비스듬히** 가로지른다(같은 두께를 더 긴 선분으로 잰다) —
      부분 화소로 갈고 나니 그 인공물이 테를 가로 2.31 ↔ 세로 2.65 로 갈랐다(932 4회차 관측).
      ⚠ 옛 **정수** 자는 이것을 못 보여 줬다 — 격자가 캡(4.9)과 가운데(2.2)를 **둘 다 2** 로
      뭉갰다. 그래서 904 의 «등방 2» 는 맞았고, 부분 화소가 창을 처음으로 드러낸 것이다.
    ⚑ **짝인 자가 이미 이렇게 잰다** — `probe904.js` 의 `phase` 걸음은 세로를 씨앗 행 span
      전체(`rowBand`/`rowEdge`)로 재지 한 열로 재지 않는다. 945 는 두 자의 창을 맞춘 것이다.
    ⚠ 한 열이 아니라 **여러 열의 중앙값**인 이유 — 평평한 구간에도 숫자 잉크가 속 판정을
      끊는 열이 섞여 있다(스윕 최대 2.81 · 바깥 최대 26.58). 최대·단일 열은 그걸 밟는다."""
    w = r - l
    return range(l + int(w * .18), l + int(w * .82))


def col_v(px, vx, t, b):
    """[945] 한 열에서 «바깥 세로»·«속 세로» — `measure_pill` 과 `ring_sweep` 이 **같이** 쓴다.
       (402 «사본을 지운다» — 같은 걸음을 두 곳에 적으면 한쪽만 고쳐진다.)
       걸음은 `measure_pill.edge()` 의 국면 셋과 같고(904 수리), 모서리는 `out_f` 로 민다."""
    ys = [y for y in range(t, b + 1) if pill_d(px[vx, y]) <= PILL_TOL]
    if not ys:
        return None
    iy0, iy1 = min(ys), max(ys)
    if iy1 - iy0 < 5:                       # 속이 잉크로 통째로 끊긴 열
        return None

    def walk(y, step):
        phase, bright, outer = 'a', 0, y
        for _ in range(200):
            y += step
            dark = lum(px[vx, y]) < DARK_TH
            if phase == 'a':
                if not dark:
                    phase, bright = 'b', 1
            elif phase == 'b':
                if dark:
                    phase, outer = 'c', y
                else:
                    bright += 1
                    if bright > 2:
                        return None
            else:
                if dark:
                    outer = y
                else:
                    break
        return outer if phase == 'c' else None

    ot, ob = walk(iy0, -1), walk(iy1, 1)
    if ot is None or ob is None:
        return None
    oh = (ob + out_f(px, vx, ob, 0, +1, lum, DARK_TH)) - (ot - out_f(px, vx, ot, 0, -1, lum, DARK_TH))
    ih = (iy1 + out_f(px, vx, iy1, 0, +1, pill_d, PILL_TOL)) - (iy0 - out_f(px, vx, iy0, 0, -1, pill_d, PILL_TOL))
    return {'ot': ot, 'ob': ob, 'iy0': iy0, 'iy1': iy1, 'oh': oh, 'ih': ih, 'ring': (oh - ih) / 2}


def med(v):
    s = sorted(v)
    return s[len(s) // 2]


def bg_of(px, y, strips):
    """그 행의 배경 기준선 — **창의 바깥 양끝 띠**(두 그림 모두 수반 밖인 자리)의 중앙값.
       ⚠ 처음에는 화면 좌우 끝(ref x30~110 · 380~455)을 썼는데, 우리 렌더는 그 자리가
       레퍼런스보다 밝아 문턱이 올라가 **림이 341 → 284 로 잘려 보였다**(자가 두 그림에
       다른 기준선을 준 것). 창 안에서 뽑으면 두 그림이 같은 자리를 본다."""
    v = sorted(lum(px[x, y]) for a, b in strips for x in range(int(a), int(b)))
    return v[len(v) // 2]


def cov_f(val, i, step, th):
    """[947] 차분 마스크의 «마지막 안» 화소에서 **바깥으로** 민 부분 화소 (−0.5 … +0.5).
       `val(i)` = 그 자리의 차분 · `i` = 마지막 «안» 화소 · `step` = 바깥 방향(±1).

    ⚠⚠ **여기에는 `_cross` 를 못 쓴다 — 차분 경계는 램프가 아니라 계단이다.**
      바깥 화소의 차분은 «조금 다름» 이 아니라 **정확히 0**(두 사본이 같은 화소다)이라
      «문턱을 어디서 지나는가» 를 물을 이웃이 없다. 그 자리에 `_cross` 를 얹으면
      f = 1 − th/dv 가 되어 **경계 화소가 진할수록 더 밖으로 민다** — 소속도의 거의 반대다
      (947 1회차 재현: 진한 아래끝 0.744 · 옅은 좌끝 0.227 · 폭 262 → 261.69 · 세로 55 → 55.43).
      ⇒ 등재문 처방 ⓐ(«`flat()` 과 같은 `_cross`»)는 **재현이 기각**했다.

    ⇒ 차분 마스크에서 부분 화소를 얻는 축은 **소속도** 하나다. 경계 화소의 차분은
      그 화소가 부품에 덮인 넓이에 비례하므로 (숨긴 사본이 곧 배경이라 대비가 상쇄된다)

          α = dv(경계) / dv(안쪽 이웃)          # 안쪽 이웃 = 가득 찬 화소

      이고, 가장자리는 그 화소를 **안쪽부터** α 만큼 채운다 ⇒ 중심에서 밖으로 **α − 0.5**.
      α = 1(가득) 이면 +0.5 = 옛 정수 걸음 그대로라 `--int` 와 이어진다(가장 나쁜 경우가 옛 값).
    ⚠ 안쪽 이웃은 **세 칸까지의 중앙값**이다 — 속에는 아이콘·숫자 잉크가 있어 한 칸은
      대비가 0 으로 꺼질 수 있다(실측: 알약 아래끝 안쪽 y1950 의 차분이 0.0).
    ⚠ 남는 «어느 문턱에서 경계로 치는가» 비대칭(ref 는 JPEG 램프 위 lum=25, 우리는 소속도 0.5)은
      이 번호의 몫이 아니다 — **942** 로 따로 등재돼 있다. 여기서 없애는 것은 **격자**뿐이다.
    """
    if not SUB:
        return 0.5
    try:
        v = val(i)
        ins = [u for u in (val(i - step * k) for k in (1, 2, 3)) if u > th]
    except IndexError:
        return 0.5
    if not ins:
        return 0.5
    c = med(ins)
    return (min(1.0, v / c) - 0.5) if c > 0 else 0.5


def diff_box(pa, pb, win, th=8, sub=False):
    """우리 렌더는 **차분**으로 잰다 — 부품을 `visibility:hidden` 으로 한 번 더 찍어
       달라진 화소가 곧 그 부품의 잉크다. 문턱·배경 추정이 아예 없어 마스크가 갈릴 자리가 없다.
       (레퍼런스는 그런 사본을 못 만드니 위의 문턱 자를 쓰고, 그 자는 `scan813c` 와 값이 같다.)

    ⚑ [947] `sub=True` 면 **정수 상자는 그대로 두고** 부분 화소 폭·세로(`ws`·`hs`)를 더 얹는다.
      정의는 정수 쪽과 한 글자도 다르지 않다 — 폭은 «행마다의 span 중 최대», 세로는 «상자 높이» —
      이긴 자리의 **양 끝만** `cov_f` 로 민다(932 4회차가 `flat()` 에 한 것과 같은 꼴).
      ⇒ `--int` 면 `cov_f` 가 0.5 를 주므로 `ws`·`hs` 는 정수 `w`·`h` 와 **정확히 같다**.
    ⚠ **부르는 쪽이 고른다** — 짝인 ref 자가 정수로 세는 자리(수반: `best_run`·행 수)는
      `sub` 없이 부른다. 한쪽만 부분 화소로 갈면 거기에 **새 비대칭**이 생긴다(932 4회차 교훈)."""
    x0, y0, x1, y1 = [int(v) for v in win]
    rows = {}
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if abs(lum(pa[x, y]) - lum(pb[x, y])) > th]
        if xs:
            rows[y] = (min(xs), max(xs), max(xs) - min(xs) + 1)
    if not rows:
        return None
    ys = sorted(rows)
    box = {'top': ys[0], 'bot': ys[-1], 'h': ys[-1] - ys[0] + 1,
           'w': max(r[2] for r in rows.values()),
           'foot': rows[ys[-1]][2],
           'l': min(r[0] for r in rows.values()), 'r': max(r[1] for r in rows.values())}
    if not sub:
        return box

    def dv(x, y):
        return abs(lum(pa[x, y]) - lum(pb[x, y]))

    def span(y):
        a, z, _ = rows[y]
        row = lambda i: dv(i, y)                                      # noqa: E731
        return (z + cov_f(row, z, +1, th)) - (a - cov_f(row, a, -1, th))

    def edge_f(y, step):
        """상자의 위·아래 끝 — **945 규약 그대로 평평한 구간(`v_band`)의 중앙값**으로 민다.
           ⚠ 최댓값·단일 열은 못 쓴다: 끝 행의 양 끝은 둥근 어깨라 **안쪽 이웃도 덜 덮여**
             α 가 1 로 잘린다(실측 — 위 행 256열 중 250열이 0.302 인데 코너 네 열만 1.00).
             945 가 세로 테에서 그만둔 그 자리이고, 여기서도 답은 «거기서 재지 않는 것» 이다."""
        a, z, _ = rows[y]
        fs = [cov_f(lambda j: dv(x, j), y, step, th)
              for x in v_band(a, z) if dv(x, y) > th]
        return med(fs) if fs else 0.5

    box['ws'] = max(span(y) for y in rows)
    box['hs'] = (ys[-1] + edge_f(ys[-1], +1)) - (ys[0] - edge_f(ys[0], -1))
    return box


def best_run(px, y, band, bg):
    """배경보다 EDGE_TH 이상 «밝은» 화소의 최장 가로 연속 (길이, 시작, 끝)."""
    th = bg + EDGE_TH
    best, cur, start, bs, be = 0, 0, None, None, None
    for x in range(int(band[0]), int(band[1])):
        if lum(px[x, y]) > th:
            if cur == 0:
                start = x
            cur += 1
            if cur > best:
                best, bs, be = cur, start, x
        else:
            cur = 0
    return best, bs, be


def measure_bowl(px, band, strips, y0, y1, cap_y):
    """y0..y1 = 수반이 들어 있는 세로 창 · cap_y = 안내문(캡션) 윗선."""
    runs = {y: best_run(px, y, band, bg_of(px, y, strips))[0] for y in range(y0, y1)}
    top = None
    for y in range(y0, y1 - PERSIST):
        if all(runs[y + i] >= RUN_TOP for i in range(PERSIST)):
            top = y
            break
    if top is None:
        return None
    # ⓑ scan813c 정의 — 캡션 위 30행 창의 «최장 줄», 같은 길이면 더 아래 행
    edges = [(y, runs[y]) for y in range(cap_y - 30, cap_y) if y in runs and runs[y] >= RUN_MIN]
    if not edges:
        return None
    mx = max(e[1] for e in edges)
    bot = max(e[0] for e in edges if e[1] == mx)
    rim = max(runs[y] for y in range(top, min(top + max(8, int((bot - top) * .30)), y1)))
    return {'top': top, 'bot': bot, 'h': bot - top + 1, 'rim': rim, 'foot': mx}


def measure_pill(px, band, y0, y1):
    def inside(x, y):
        return pill_d(px[x, y]) <= PILL_TOL

    best = (0, None, None)
    for y in range(y0, y1):
        cur = None
        for x in range(int(band[0]), int(band[1])):
            if inside(x, y):
                if cur is None:
                    cur = x
            else:
                if cur is not None and x - cur > best[0]:
                    best = (x - cur, cur, y)
                cur = None
        if cur is not None and int(band[1]) - cur > best[0]:
            best = (int(band[1]) - cur, cur, y)
    if best[0] < 20:
        return None
    w, sx, sy = best
    cx = sx + w // 2

    def edge(dx, dy, x, y):
        """씨앗에서 걸어 나가 «검정 테두리» 의 바깥 모서리를 잡는다 — **국면 셋**으로 걷는다.
             ⓐ 속(어두움) → ⓑ 안쪽 하이라이트/베벨(밝음, ≤2px) → ⓒ 검정 테두리(어두움)
           ⓒ 가 **끊기면 그것으로 끝**이다. 다시 어두워져도 안 돌아간다.

           ⚑⚑ 904 1회차 수리 — 옛 판은 국면이 없어 «밝은 화소를 2칸까지 건너뛴다» 를
           ⓒ **뒤에서도** 적용했다. 알약 하변(y618) 아래 **y619 한 행만 밝고 y620 이 다시
           어둡다**(수반 받침의 그늘 — 알약 폭 113열 중 6열에서). 그 한 칸이 다리가 되어
           걸음이 y620 을 하변으로 삼았고, ref 세로가 24 가 아니라 **26** 으로 읽혔다.
           866 은 그 26 을 과녁으로 제품을 57.8 로 키웠고 `verify866` [C1] 은 자기가 만든
           과녁을 다시 물어 초록이었다(813 10회차 채점 2인이 화소로 +8.8~13.5% 를 잡았다).
           같은 화소를 국면 걸음으로 다시 재면 **117×24 = 260.0×53.3**(측정표 89 §코스트 필
           행이 처음부터 적어 둔 값)이고, 테는 가로·세로 **둘 다 2 ref px = 4.44** 로 등방이다.
           회귀는 `node tools/probe904.js` 의 [R] 이 이 옛 걸음을 그 자리에서 재현한다."""
        inner, outer, phase, bright = (x, y), (x, y), 'a', 0
        for _ in range(200):   # 걸음 수는 알약 반폭(≈140)보다 넉넉해야 한다
            x, y = x + dx, y + dy
            dark = lum(px[x, y]) < DARK_TH
            if phase == 'a':
                if dark:
                    inner = (x, y)
                else:
                    phase, bright = 'b', 1
            elif phase == 'b':
                if dark:
                    phase, outer = 'c', (x, y)
                else:
                    bright += 1
                    if bright > 2:      # 베벨이 아니다 = 테가 없다 ⇒ 속 끝이 곧 바깥
                        return inner
            else:
                if dark:
                    outer = (x, y)
                else:
                    break
        return outer if phase == 'c' else inner
    l, r = edge(-1, 0, cx, sy)[0], edge(1, 0, cx, sy)[0]
    # ⚑ 932 4회차 — 바깥 두 모서리를 **같은 lum·같은 DARK_TH** 의 교차점으로 민다.
    #   `edge()` 의 국면 걸음(904 수리)은 한 글자도 안 바뀐다 — 그 걸음이 준 화소에서
    #   «어디서 문턱을 지나는가» 만 더 묻는다.
    fl = out_f(px, l, sy, -1, 0, lum, DARK_TH)
    fr = out_f(px, r, sy, +1, 0, lum, DARK_TH)
    # ⚑⚑ 945 — 세로는 **한 열이 아니라 평평한 구간의 중앙값**이다(창은 `v_band`). 두 걸음이다:
    #   ⓐ **경계 열** `bx = l + 10` — 행 범위 t..b 를 얻는 데만 쓴다. 이 열이 남은 이유는
    #     옛 주석이 적어 둔 그것 그대로 «아이콘·숫자 잉크를 피한다» 이다(알약 한가운데 cx 는
    #     숫자 획을 통째로 지나가 lum 192 로 밝고, 거기서 걸으면 국면 b 가 즉시 끝난다).
    #     ⚠ **행 범위는 캡에서도 옳다** — 캡 열이 테를 비스듬히 읽는 것은 «두께» 이지 «어디까지가
    #     알약인가» 가 아니어서, 정수 행으로는 캡도 가운데도 똑같이 y595..618(24행)이다.
    #   ⓑ **재는 것**은 그 범위 안에서 `v_band` 열마다 `col_v` 로 잰 값들의 **중앙값**이다.
    #     옛 자는 ⓐ 의 열에서 재기까지 해서 캡 인공물을 «세로 테» 로 들고 있었다(945 등재문).
    bx = l + 10
    t, b = edge(0, -1, bx, sy)[1], edge(0, 1, bx, sy)[1]
    cols = [c for c in (col_v(px, vx, t, b) for vx in v_band(l, r)) if c]
    if not cols:
        return None
    ph, pih = med([c['oh'] for c in cols]), med([c['ih'] for c in cols])
    # ⚑ **주 눈금은 «속»(평평한 #191614 칠) 이다** — 두 그림이 같은 색을 쓰고 경계가 한 겹뿐이라
    #   마스크가 갈릴 자리가 없다. 바깥(검정 테두리) 은 아래쪽에서 돌기둥 그늘과 붙어 ±2px 흔들린다.
    # ⚑ 904 — 속 «폭» 은 **최장 연속(w)이 아니라 bbox** 다. 알약 속에는 아이콘·숫자 잉크가
    #   있어 연속이 끊기므로 w 는 언제나 실제보다 좁다(111 vs 실측 113 = −1.8%). 그 −1.8% 가
    #   테 두께로 흡수돼 866 의 «테 3 ref px» 를 만든 나머지 절반이다(다른 절반은 edge() 의
    #   국면 누락). 가운데 행에서 **가장 바깥 속 화소**로 잰다 — `probe904.js` 와 같은 정의.
    iy0, iy1 = sy, sy
    while inside(bx, iy0 - 1):
        iy0 -= 1
    while inside(bx, iy1 + 1):
        iy1 += 1
    iy = (iy0 + iy1) // 2
    ins = [x for x in range(int(band[0]), int(band[1])) if inside(x, iy)]
    ix0, ix1 = (min(ins), max(ins)) if ins else (sx, sx + w - 1)
    # ⚑ 932 4회차 — 속 좌·우 모서리도 **같은 `inside` 판정**(pill_d ≤ PILL_TOL)의 교차점으로.
    gl = out_f(px, ix0, iy, -1, 0, pill_d, PILL_TOL)
    gr = out_f(px, ix1, iy, +1, 0, pill_d, PILL_TOL)
    return {'l': l, 'r': r, 't': t, 'b': b,
            'w': (r + fr) - (l - fl), 'h': ph,
            'iw': (ix1 + gr) - (ix0 - gl), 'ih': pih, 'run': w, 'vn': len(cols)}


def side_bands(px, pill, y1):
    """[검산] 알약 좌우 바깥의 밝은 띠가 «알약의 일부인가» — 알약보다 아래로 더 가면 아니다."""
    out = []
    for x in (pill['l'] - 3, pill['r'] + 3):
        ys = [y for y in range(pill['t'] - 8, y1) if lum(px[x, y]) > 40]
        if ys:
            out.append((x, min(ys), max(ys), max(ys) - pill['b']))
    return out


def ring_sweep(px, q):
    """[945 근거] «세로 테» 를 알약 열마다 다시 잰다 — 창이 둥근 캡을 가로지르는가.

    ⚑⚑ 932 4회차 — 부분 화소로 갈고 나니 테가 **가로 2.31 · 세로 2.65** 로 갈렸다.
      `measure_pill` 은 세로를 `vx = l + 10` **한 열**에서 재는데, 알약은 이름 그대로
      알약(둥근 캡)이라 그 열은 이미 캡의 어깨 위다 — 거기서는 세로 자가 테를 **비스듬히**
      가로질러 두껍게 읽는다. 평평한 가운데 열에서는 가로와 같은 값이 나온다.
    ⇒ 904 의 «테는 등방 2» 판정은 **살아 있다.** 932 4회차가 `verify866` 의 과녁을 안 옮긴 이유이고,
      창을 옮기는 것은 «재는 것을 바꾸는» 일이라(3회차 규칙 2) **945** 로 따로 등재했다.
    ⚑⚑ **945 가 그 창을 옮겼다** — `measure_pill` 의 세로는 이제 `v_band` 의 중앙값이라
      이 스윕의 «가운데» 와 같은 자리를 본다. 이 함수는 그 근거를 **매 실행 다시 찍는** 자로 남는다
      (캡이 여전히 두껍게 읽히는 것은 그림의 사실이고, 945 는 거기서 재기를 그만둔 것이다).
    """
    l, r, t, b = q['l'], q['r'], q['t'], q['b']
    w = r - l
    at = lambda vx: (lambda c: c and c['ring'])(col_v(px, vx, t, b))
    mids = [v for v in (at(vx) for vx in v_band(l, r)) if v is not None]
    caps = [v for v in (at(l + o) for o in list(range(3, 8)) + list(range(w - 7, w - 2))) if v is not None]
    return mids, caps


def main():
    a = sys.argv[1:]
    cap = a[a.index('--cap') + 1] if '--cap' in a else None
    geo = json.load(open(a[a.index('--geo') + 1], encoding='utf-8')) if '--geo' in a else None

    rp = Image.open(REF).convert('RGB').load()
    strips = [(30, 110), (380, 455)]           # scan813c 가 쓰는 좌우 여백 띠 그대로
    rb = measure_bowl(rp, (150, 340), strips, 505, 640, 639)
    rq = measure_pill(rp, (170, 320), 585, 625)

    if '--ring-sweep' in a:
        mids, caps = ring_sweep(rp, rq)
        m = med(mids)
        print('RING-SWEEP — 세로 테를 열마다 (ref px · 창 `v_band` 가 어디에 놓이는가)')
        print('  가운데 중앙값 %.2f · 최소 %.2f · 최대 %.2f  (평평한 구간 %d열 — 최대는 숫자 잉크가'
              ' 속 판정을 끊는 열이다)' % (m, min(mids), max(mids), len(mids)))
        print('  캡 최대 %.2f  (둥근 끝 %d열 — **945 는 여기서 재기를 그만뒀다**)' % (max(caps), len(caps)))
        print('  가로 테 %.2f · `measure_pill` 의 세로 테 %.2f (창 = 평평한 구간 %d열의 중앙값 — 945)'
              % ((rq['w'] - rq['iw']) / 2, (rq['h'] - rq['ih']) / 2, rq['vn']))
        return

    print('PROBE866 — 89 유물 소환 부품 치수 (자 하나로 ref ↔ 우리)')
    print()
    print('  [ref] %s (486x687 크롭 · k = %.4f)' % (REF, K))
    print('    ⓐ 잉크 상변 y%d · ⓑ 밑판 아랫변 y%d ⇒ 수반 높이 **%d ref px = %.1f 프레임 px**'
          % (rb['top'], rb['bot'], rb['h'], rb['h'] * K))
    print('    ⓒ 림 폭 %d ref px = %.1f · ⓓ 발 폭 %d ref px = %.1f'
          % (rb['rim'], rb['rim'] * K, rb['foot'], rb['foot'] * K))
    print('    ⓔ 알약 **속**(평평한 #191614 칠) %.2fx%.2f ref px = **%.1fx%.1f 프레임 px**  ← 주 눈금'
          % (rq['iw'], rq['ih'], rq['iw'] * K, rq['ih'] * K))
    print('       (참고) 검정 테두리 바깥 x%d..%d · y%d..%d = %.2fx%.2f ref px = %.1fx%.1f'
          % (rq['l'], rq['r'], rq['t'], rq['b'], rq['w'], rq['h'], rq['w'] * K, rq['h'] * K))
    print('       테(속→바깥) 가로 %.2f · 세로 %.2f ref px = %.2f · %.2f 프레임 px  %s'
          % ((rq['w'] - rq['iw']) / 2, (rq['h'] - rq['ih']) / 2,
             (rq['w'] - rq['iw']) / 2 * K, (rq['h'] - rq['ih']) / 2 * K,
             '(부분 화소)' if SUB else '(옛 정수 걸음 — --int)'))
    for x, a0, b0, d in side_bands(rp, rq, 640):
        print('       [검산] x%d 의 밝은 띠 y%d..%d — 알약 하변보다 **%+d행**  ⇒ %s'
              % (x, a0, b0, d, '알약 아님(뒤 돌기둥)' if d > 2 else '알약의 일부'))

    if not cap:
        print()
        print('  (우리 렌더는 `node tools/probe866.js` 가 캡처·기하를 만들어 여기에 물린다)')
        return

    cp = Image.open(cap).convert('RGB').load()
    P = geo['panel']
    ox, oy = P['x'], P['y']                       # 패널 좌상단(프레임 좌표)
    nb = Image.open(cap.replace('.png', '-nostone.png')).convert('RGB').load()
    nq = Image.open(cap.replace('.png', '-nocost.png')).convert('RGB').load()
    b, c = geo['basin'], geo['cost']
    # ⚑ [947] 수반(ⓐⓑⓒⓓ)은 **정수 자 그대로** 부른다 — 짝인 ref 쪽 `measure_bowl` 도
    #   행 수·`best_run` 의 화소 «개수» 라 양쪽이 같은 격자다. 여기만 부분 화소로 갈면
    #   그때 새 비대칭이 생긴다(932 4회차 교훈 — 갈림은 한쪽만 갈 때 생긴다).
    ob = diff_box(cp, nb, (ox + b['x'] - 30, oy + b['y'] - 30,
                           ox + b['x'] + b['w'] + 30, oy + b['y'] + b['h'] + 30))
    # ⚑ [947] 알약 **바깥**은 짝인 ref(`measure_pill`)가 부분 화소라 여기도 부분 화소로 잰다.
    oq = diff_box(cp, nq, (ox + c['x'] - 24, oy + c['y'] - 24,
                           ox + c['x'] + c['w'] + 24, oy + c['y'] + c['h'] + 24), sub=True)
    # 알약 속 — 차분 상자 안에서 평평한 #191614 칠의 가로·세로 최장 연속
    # ⚑ 932 4회차 — **우리 쪽도 같이 부분 화소로 간다.** 안 그러면 ref 만 격자에서 풀리고
    #   우리는 정수에 갇힌 채 ×2.2222 로 견주게 되어 **새 비대칭**이 생긴다(장부의 fix 칸).
    #   최장 연속을 찾는 판정(`ins`)·창은 한 글자도 안 바뀐다 — 이긴 구간의 **양 끝만** 민다.
    def flat(px_, box):
        def ins(x, y):
            return pill_d(px_[x, y]) <= PILL_TOL

        def best_line(fixed, lo, hi, horiz):
            """한 줄에서 가장 긴 `ins` 연속을 (길이, 시작, 끝) 로."""
            bl, bs, be, cur = 0, None, None, None
            for i in range(lo, hi + 1):
                x, y = (i, fixed) if horiz else (fixed, i)
                if ins(x, y):
                    if cur is None:
                        cur = i
                    if i - cur + 1 > bl:
                        bl, bs, be = i - cur + 1, cur, i
                else:
                    cur = None
            return bl, bs, be

        def span(fixed, lo, hi, horiz):
            bl, bs, be = best_line(fixed, lo, hi, horiz)
            if not bl:
                return 0.0
            if not SUB:
                return float(bl)

            def at(i):
                return (i, fixed) if horiz else (fixed, i)

            def f_out(i, step):
                try:
                    v0, v1 = pill_d(px_[at(i)]), pill_d(px_[at(i + step)])
                except IndexError:
                    return 0.5
                f = _cross(v0, v1, PILL_TOL)
                return 0.5 if f is None else f

            return (be + f_out(be, 1)) - (bs - f_out(bs, -1))

        wid = max(span(y, box['l'], box['r'], True)
                  for y in range(box['top'], box['bot'] + 1))
        hei = max(span(x, box['top'], box['bot'], False)
                  for x in range(box['l'], box['r'] + 1))
        return wid, hei
    iw, ih = flat(cp, oq)

    def d(v, r):
        return (v / r - 1) * 100
    print()
    print('  [우리] %s (프레임 1080x2280 · **차분** — 부품을 숨긴 사본과의 다른 화소)' % cap)
    print('    ⓐⓑ 수반 잉크 %.0f..%.0f ⇒ 높이 **%d** (ref %.1f · Δ %+.1f%%)'
          % (ob['top'] - oy, ob['bot'] - oy, ob['h'], rb['h'] * K, d(ob['h'], rb['h'] * K)))
    print('    ⓒ 최대(림) 폭 **%d** (ref %.1f · Δ %+.1f%%) · ⓓ 발 폭 **%d** (ref %.1f · Δ %+.1f%%)'
          % (ob['w'], rb['rim'] * K, d(ob['w'], rb['rim'] * K),
             ob['foot'], rb['foot'] * K, d(ob['foot'], rb['foot'] * K)))
    print('    ⓔ 알약 속 **%.2fx%.2f** (ref %.1fx%.1f · Δ 폭 %+.1f%% · 세로 %+.1f%%)'
          % (iw, ih, rq['iw'] * K, rq['ih'] * K, d(iw, rq['iw'] * K), d(ih, rq['ih'] * K)))
    print('       바깥 **%.2fx%.2f** (ref %.1fx%.1f · Δ 폭 %+.1f%% · 세로 %+.1f%%)  %s'
          % (oq['ws'], oq['hs'], rq['w'] * K, rq['h'] * K,
             d(oq['ws'], rq['w'] * K), d(oq['hs'], rq['h'] * K),
             '(부분 화소 — 소속도)' if SUB else '(옛 정수 걸음 — --int)'))
    print('          [수반 ⓐⓑⓒⓓ 는 정수 자다 — ref 쪽도 행 수·화소 개수라 같은 격자다 · 947]')

    if geo.get('bar') and geo.get('rows'):
        bar, rows = geo['bar'], geo['rows']
        print()
        print('  [ⓕ 배수 바] 좌 %.1f · 우 %.1f · 폭 %.1f · 중심 %.1f'
              % (bar['x'], bar['x'] + bar['w'], bar['w'], bar['x'] + bar['w'] / 2))
        for k in sorted(rows):
            v = rows[k]
            print('      격자 %s 행 %.1f..%.1f (중심 %.1f) — 좌 Δ%+.1f · 우 Δ%+.1f'
                  % (k, v['x'], v['x'] + v['w'], v['x'] + v['w'] / 2,
                     bar['x'] - v['x'], (bar['x'] + bar['w']) - (v['x'] + v['w'])))
        if geo.get('tabs'):
            for t in geo['tabs']:
                print('      칸 «%s» 폭 %.1f · 라벨 잉크 %.1f ⇒ 여유 %.1f'
                      % (t['t'], t['w'], t['ink'], t['w'] - t['ink']))


if __name__ == '__main__':
    main()
