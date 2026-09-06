#!/usr/bin/env python3
"""작업 923 — 노치 «바닥 평탄부» 전용 자 (885 10회차 채점 GD·GG 가 넘긴 자리).

무엇을 묻는가 — 923 등재문 ①:
  > ref 는 **바닥이 평평한 «스타디움»**, 우리는 **순수한 반원**이다.
  > 평탄부(깊이 ≥ max−0.5): ref 배너 16.5~18.6 ↔ 우리 7.5~12.0 · ref 불릿 27.4~30.9 ↔ 우리 11.0~18.4

⚑ **«깊이» 를 재는 자가 아니다**(그건 [20] «43/40» 토큰이 정한 자리이고 정의가 다르다).
   이 자는 **바닥이 몇 px 동안 평평한가**와 **옆면이 원호인가**를 묻는다.

자 규약(885 브리핑 §2 그대로 · ref 와 우리에게 **같은 절차**):
  ⓐ 원점 = 카드 **곧은 우변**(각 캡처에서 실측한다 — 상수로 안 적는다).
  ⓑ 경계는 전부 **부분화소 50% 교차**(선형 보간) — 정수 마스크는 ref 쪽만 ×K 로 부푼다(895 교훈).
  ⓒ 평탄부의 여유 «0.5» 는 **우리 px 단위**다 — ref 에서는 0.5/K 로 환산해 같은 실물 길이를 쓴다.
  ⓓ 문턱 사다리 3단(±20%)을 같이 낸다. 부호가 뒤집히면 그 축은 «측정 한계» 다.
  ⓔ 옆면 원호 판정 = 깊이 30~80% 구간의 경계점에 **최소제곱 원**을 맞춰 R_fit 을 낸다.
     R_fit < D 이면 «원호로는 불가능» = 바닥에 곧은 구간이 있다는 뜻이다(GG 의 원리적 증거).

실행:
  python3 tools/scan923.py --ref                        레퍼런스 두 장
  python3 tools/scan923.py --cap <png> --geo <json>     우리 캡처(cap151.js --geo 가 낸 기하)
  ... [--t 40] 기본 문턱(|Δ바탕|₁) · 사다리는 ±20% 로 같이 찍는다
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                       # 우리 px = ref px × K (측정표 §9)
T0 = 40.0                        # 「카드 재질」 판정 문턱(|Δ바탕|₁)
TOL_OUR = 6.0                    # 노치 판정 문턱(우리 px · 667 규약)
FLAT_SLACK = 0.5                 # 평탄부 여유(우리 px · 등재문 정의)


def runs(vals, minlen=1):
    out, s, p = [], None, None
    for v in vals:
        if s is None:
            s = v
        elif v != p + 1:
            if p - s + 1 >= minlen:
                out.append((s, p))
            s = v
        p = v
    if s is not None and p - s + 1 >= minlen:
        out.append((s, p))
    return out


COV = '--nocov' not in sys.argv    # 4회차: 덮개 적분이 기본(--nocov 로 옛 문턱 자)
PED = '--ruler8' not in sys.argv   # 9회차 자 수리 둘(받침 빼기 · 안쪽 끝도 덮개)이 기본 — `--ruler8` 로 8회차 자
PED_W0, PED_W1 = 3, 9              # 받침 표본 창 — 경계 화소 i 에서 +3..+8(경계 번짐 두 화소를 건너뛴다)
COLSCAN = '--norow' not in sys.argv and '--nocol' not in sys.argv   # 9회차: 띠 점구름에 «열 스캔» 도 넣는다
# ── 10회차 신설 — «두께를 **어느 끝의 깊이**로 적는가» (`--uat outer|inner|mid`) ─────
#   9회차 채점(GX·GY)이 «남은 결함은 하나인데 자마다 −2.89 ↔ −0.41 ↔ +0.58 로 갈리고
#   기준점을 바꾸면 **부호까지 뒤집힌다**» 를 남겼다(GY 실측). 그 갈림은 자의 정밀도가 아니라
#   **이름표**다 — 한 두께 표본은 두 점(바탕 쪽 끝 · 림 쪽 끝)을 잇는데 그 둘의 깊이가
#   띠 두께만큼(≈10~14 우리px) 다르므로, 어느 쪽으로 적느냐가 표를 통째로 한 칸 반 민다.
#   ⚑ **고를 근거는 «자의 축 = 손잡이의 축» 이다** — 제품의 손잡이 `NTC_BAND` 는
#   `ntcOffset()` 이 **안쪽(실루엣) 표본의 깊이 px** 로 반지름을 읽는 표다. 그 실루엣이 곧
#   «검정↔바탕» 경계(= `outer_x`)이므로 `outer` 가 표와 같은 축이다. 축이 어긋난 자로 재면
#   `NTC_BAND[i]` 를 고쳐도 **그 칸이 안 움직여** 회차가 수렴하지 않는다.
#   ⚠ 이 말은 논증이지 측정이 아니다 — `tools/probe923.js` 가 **되찾기 시험**으로 못박는다:
#   우리 렌더는 선언표를 아는 유일한 그림이니, 셋 중 그 표를 되찾는 이름표가 옳은 것이다.
UAT = (sys.argv[sys.argv.index('--uat') + 1] if '--uat' in sys.argv else 'outer')
MIN_EXT_OUR = 12.0                # «카드 재질» 로 인정할 최소 덩이 두께(**우리 px** — ref 에서는 /K)
GAP_OUR = 3.0                     # 덩이를 이어 붙일 수 있는 틈(우리 px · ref 1.45px) — 아래 ⚑

# ── 바탕색은 «한 색» 이 아니라 **행마다** 잰다 (8회차 2단계, 2026-09-05) ──────────────
#   ⚑⚑ 8회차 1단계가 «ref 불릿 곧은변 11.81 ↔ 채점 2인 10.17~10.23» 을 남기며 뿌리를
#   «초록 카드 바깥의 그림자 경사» 로 지목했는데 **그 가설은 기각됐다**(338 — 처방 전에 재현).
#   같은 행을 손으로 재면 불릿 곧은변은 **10.35** 다. 어긋난 것은 그림자가 아니라 **바탕 표본**이다:
#   `report_ref` 가 바탕을 **카드 한복판 행의 화소 하나**(`a[(y0+y1)//2, W-3]`)로 잡는데,
#   초록 카드에서 그 행(y502)은 하필 ref 화면의 **밝은 파랑 패널 띠**(y454~512 · (45,46,66))
#   위에 앉는다. 참 바탕은 (39,39,49) 다.
#   ⇒ 덮개 적분의 분모 `full = |검정 − bg|₁` 이 127 → 157 로 부풀고, 참 바탕 화소마저
#   |Δbg|₁ = 30 을 얻어 α ≈ 0.19 씩 **바깥으로 세 화소** 더 쌓인다(+0.57 ref px = **+1.18 우리px**).
#   이 편향은 카드 전체(깊이·평탄부·입 폭·띠)에 같이 걸린다 — 바탕이 균일하다는 전제가
#   ref 화면에서는 거짓이기 때문이다.
#   ⇒ 자는 이제 **행마다** 오른쪽 여백 다섯 화소의 중앙값을 바탕으로 쓴다. 파랑 카드는
#   Δ+0.02(10.31 → 10.33) 로 사실상 불변이고, 초록 카드가 11.82 → **10.33** 으로 내려온다
#   (= 채점 2인 10.17~10.23 과 같은 자리).
BG_COLS = 5                        # 바탕 표본 폭(행마다 오른쪽 여백에서 중앙값)


def bg_rows(a, y0, y1, xr):
    """[y0,y1) 행마다 바탕색을 낸다 — xr 왼쪽 BG_COLS 화소의 **채널별 중앙값**.

    중앙값이라 여백에 잡티 한두 화소가 들어와도 안 흔들린다. 반환은 {y: [r,g,b]}.
    """
    x1 = int(max(1, min(a.shape[1], xr)))
    x0 = max(0, x1 - BG_COLS)
    return {y: np.median(a[y, x0:x1], axis=0).tolist() for y in range(y0, y1)}


def bg_of(bg, y):
    """bg 가 «한 색»(길이 3 리스트)이면 그대로, «행별 표»(dict)면 그 행의 색."""
    return bg[y] if isinstance(bg, dict) else bg


def outer_x(row, bg, t, k=1.0):
    """행에서 «카드 재질» 의 오른쪽 바깥 모서리를 **부분화소**로 낸다.

    d(x) = |row[x] − bg|₁ 가 오른쪽에서 왼쪽으로 오며 t 를 처음 넘는 자리. 화소 중심 기준 선형 보간.

    ⚑ **923 1회차 채점 GJ 관측 ㉮ — 노치 «안» 에 떠 있는 배경 장식(회색 점 ≈7 우리px)을 물면
    바닥이 10px 로 잘못 읽힌다**(그 자리가 브리핑 §1 표의 «19.0 / 17.0» 뒷값이었다). 그래서 «오른쪽 끝
    화소» 가 아니라 **카드 몸통에 이어진 덩이**의 오른쪽 끝을 쓴다 — 오른쪽에서 왼쪽으로 오며 덩이를
    모으되 **GAP 이하의 틈은 이어 붙이고**, 두께가 MIN_EXT 이상인 첫 덩이에서 멈춘다.
    ⚠ **틈을 이어 붙이는 것이 핵심**이다 — ref 카드의 검정 외곽선은 4 ref px 뿐이고 그 안쪽 경계에서
    |Δ바탕|₁ 가 한 화소 26 까지 떨어져(예: 파랑 카드 y120 의 x481) **몸통과 끊겨 보인다**.
    이어 붙이지 않으면 ref 의 곧은 변이 2px 안쪽으로 잘못 잡혀 깊이가 통째로 +3px 어긋난다(1회차 실측).
    길이·틈은 문턱과 같은 규약으로 **«우리 px» 한 단위**로 주고 ref 에서는 /K 로 환산한다.
    """
    d = np.abs(row - np.array(bg)).sum(1).astype(float)
    hit = d > t
    min_ext, gap = MIN_EXT_OUR / k, GAP_OUR / k
    i = None
    x = len(d) - 1
    while x >= 0:
        if not hit[x]:
            x -= 1
            continue
        e = x                      # 덩이의 오른쪽 끝
        left = x
        while left >= 0:
            if hit[left]:
                left -= 1
                continue
            j = left               # 틈의 시작
            while j >= 0 and not hit[j]:
                j -= 1
            if left - j <= gap and j >= 0:
                left = j           # 틈이 좁으면 건너뛰어 이어 붙인다
                continue
            break
        if e - left >= min_ext:
            i = e
            break
        x = left
    if i is None:
        return None
    if COV:
        # ⚑⚑ 4회차 — «문턱 50% 교차» 대신 **덮개 적분**(3회차 채점 GN·GO 가 각자 세운 자 · 942 처방).
        #   문턱 자는 **하드 에지에서 한쪽으로 치우친다**(우리 곧은변 참값 1017.50 ↔ 문턱 자 1017.95).
        #   ref 는 JPEG 라 경사면이 넓고 우리 렌더는 칼같아서, 그 치우침이 **두 그림에서 다르게** 걸린다
        #   ⇒ «ref 만 얇게 읽힌다»(942 등재). 경계 화소는 «검정 ↔ 바탕» 두 색의 섞임뿐이므로
        #   α = |p − bg|₁ / |검정 − bg|₁ 가 곧 **부분화소 덮개**다. 꽉 찬 마지막 화소부터 α 를 더한다.
        # ⚠ 분모는 «그 자리에서 가장 검은 화소 ↔ 바탕» 이다 — `d` 의 최댓값을 쓰면 안 된다.
        #   바탕이 어둡고(54,54,63) 카드 몸통은 크림이라 **몸통의 |Δ바탕|₁(≈579)이 검정의 것(≈171)보다
        #   세 배 크다** ⇒ 최댓값으로 나누면 «꽉 찬 화소» 가 몸통까지 밀려 경계가 4px 안으로 들어간다
        #   (4회차에 한 번 밟았다).
        w0 = max(0, i - 6)
        seg = row[w0:i + 1]
        blk = seg[int(np.argmin(seg.sum(1)))]
        full = float(np.abs(blk - np.array(bg)).sum())
        if full <= 0:
            return i + 0.5
        # ⚑⚑ **9회차 — 덮개 창의 오른쪽 꼬리가 «바탕이 아닌 바탕» 을 먹고 있었다.**
        #   8회차 채점 2인이 ref 곧은변 띠를 10.06~10.23 으로 읽는데 이 자만 10.32~10.34 였다
        #   (GV 진단 «창 오른쪽 꼬리를 한 화소 더 먹는다»). 뿌리는 **바탕 표본의 자리**다 —
        #   8회차 2단계가 세로 변화(행마다)를 고쳤지만 **가로 변화**가 남아 있었다:
        #   카드 바로 오른쪽은 그림자가 깔려 far-margin 바탕과 |Δ|₁ 가 **20~26** 이나 되는데
        #   (ref 초록 y400: 편평한 바탕이 19·26·26·22·23 으로 읽힌다) 덮개는 그 화소마다
        #   α = 26/127 ≈ 0.20 씩을 «부분 덮개» 로 세어 경계를 최대 **+0.56 우리px** 바깥으로 민다.
        #   ⇒ **바탕을 경계 바로 옆에서 다시 잰다**(단 두 줄): 받침 ped = 경계 밖 [i+3, i+9) 의
        #   |Δbg|₁ 중앙값이고 α = (d − ped)/(full − ped) 다. 우리 렌더는 경계 밖이 참 바탕이라
        #   ped = 0 → **한 값도 안 변한다**(실측 곧은변 10.00 그대로). ref 만 내려온다.
        #   ⚠ ped 는 full 의 절반으로 자른다 — 배지처럼 «오른쪽에 다른 부품» 이 서 있는 행에서
        #     받침이 폭주해 경계가 안으로 말려 들어가지 않게(그 행들은 최빈 곧은변에서 이미 빠진다).
        #   ⚠ 되돌리려면 `--ruler8`(자 자신의 회귀 `verify923` §R8 이 그 사본으로 ref 를 다시 읽는다).
        ped = 0.0
        if PED:
            pw = d[min(len(d), i + PED_W0):min(len(d), i + PED_W1)]
            if len(pw):
                ped = min(float(np.median(pw)), 0.5 * full)
        xs = i
        while xs > 0 and d[xs] < 0.95 * full:
            xs -= 1
        acc = 0.0
        for x in range(xs + 1, min(len(d), i + 4)):
            acc += min(1.0, max(0.0, (d[x] - ped) / (full - ped)))
        return xs + 0.5 + acc
    if i + 1 >= len(d):
        return i + 0.5
    a, b = d[i], d[i + 1]
    if a == b:
        return i + 0.5
    return (i + 0.5) + (a - t) / (a - b)


def profile(a, y0, y1, x0, x1, bg, t, k=1.0):
    return [outer_x(a[y, x0:x1], bg_of(bg, y), t, k) for y in range(y0, y1)]


def fit_circle(pts):
    """(x,y) 점들에 최소제곱 원 — 반환 (cx, cy, R). 3점 미만이면 None."""
    if len(pts) < 3:
        return None
    P = np.array(pts, dtype=float)
    x, y = P[:, 0], P[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(P))]
    b = x ** 2 + y ** 2
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy, c = sol
    R = float(np.sqrt(c + cx ** 2 + cy ** 2))
    return float(cx), float(cy), R


def notch_stats(prof, straight, i0, i1, k):
    """한 노치의 깊이·평탄부·원호 적합. 길이 단위는 «우리 px»(ref 는 k=K 로 환산)."""
    ys = [i for i in range(i0, i1 + 1) if prof[i] is not None]
    dep = {i: (straight - prof[i]) * k for i in ys}
    D = max(dep.values())
    slack = FLAT_SLACK
    flat = [i for i in ys if dep[i] >= D - slack]
    fl = runs(flat, minlen=1)
    flat_len = (max(e - s + 1 for s, e in fl) if fl else 0) * k
    # 옆면(깊이 30~80%)만 골라 원을 맞춘다 — 바닥(평탄부)과 입구(직선 합류)를 뺀다.
    side = [(prof[i], i) for i in ys if 0.30 * D <= dep[i] <= 0.80 * D]
    fc = fit_circle([(x * k, y * k) for x, y in side])
    R = fc[2] if fc else float('nan')
    return dict(D=D, flat=flat_len, R=R, n_side=len(side),
                y0=i0, y1=i1, length=(i1 - i0 + 1) * k)


# ── 3회차 신설 — «깊이별 세로 폭» 표 (2회차 채점 GL·GM 의 1순위가 이 축이다) ────────
#   2회차 채점이 «옆면 호가 각지다» 를 ②(상대 크기) 를 8 로 막은 유일한 항목으로 냈고,
#   둘 다 «깊이 25/50/75/90% 에서의 세로 폭» 표로 적었다. 그 표를 자 안으로 들여온다 —
#   회차마다 손으로 다시 만들면 «자·문턱·창» 이 회차마다 달라져 값이 못 이어진다(885 교훈).
#   ⚠ 폭도 **부분화소**로 잰다: 깊이 u 를 처음/마지막 넘는 두 행을 이웃 행과 선형 보간한다.


MARGIN = 3        # 노치 «밖» 으로 몇 행까지 이웃을 빌려 오는가 (4회차 ⓑ — 아래)


def width_at(prof, straight, i0, i1, k, u, margin=MARGIN):
    """깊이 u(우리 px) 에서의 세로 폭(우리 px). 못 재면 None.

    ⚑⚑ **3회차 채점 2인(GN·GO)이 이 함수의 결함 둘을 각자 찾아냈다 — 4회차가 고쳤다.**
    ⓐ **부호** — 아래쪽 끝은 `j = i+1`(노치 밖)에서 `i` 쪽으로 «올라와야» 하는데 `j + t` 로
       **내려가고** 있었다. 폭이 최대 2행 부풀고, **1행의 실물 길이가 그림마다 다르므로**
       (ref 1행 = 2.0628 우리px · 우리 1행 = 1 우리px) **ref 쪽이 두 배 더 부푸는 비대칭 편향**이다
       = «우리가 ref 보다 넓다» 를 키우고 «좁다» 를 감춘다. 3회차 `NTC_PROF` 가 이 값으로 만들어졌고,
       그래서 불릿형이 −2.8~3.1px **과교정**됐다(4회차 채점 표 참조).
    ⓑ **창** — 이웃을 `[i0, i1]`(= 깊이 ≥ 6 인 행) 안에서만 찾아, 입구 쪽 교차가 그 경계에 물리면
       보간을 못 하고 **행 경계로 잘렸다**(ref 불릿 25% 가 92.85 → 90.23 으로 읽혔다 — 자 둘이
       독립으로 92.85 를 냈다). ⇒ 노치 바깥 `margin` 행까지 **이웃만** 빌린다
       (안쪽 판정은 여전히 `[i0, i1]` 이라 옆 노치를 물지 않는다).
    """
    ys = [i for i in range(i0, i1 + 1) if prof[i] is not None]
    if not ys:
        return None
    dep = {i: (straight - prof[i]) * k for i in ys}
    inside = [i for i in ys if dep[i] >= u]
    if not inside:
        return None
    lo, hi = min(inside), max(inside)
    # ⚑⚑ **6회차 — 이 자에는 «천장» 이 있었다(셋째 결함).** 노치 창 `[i0,i1]` 은 «깊이 ≥ 6» 인 행이고,
    # 이웃은 그 밖으로 `margin`(3) 행까지만 빌렸다 ⇒ **얕은 u 의 폭이 «창 + 3행» 에서 잘린다.**
    # 배너에서 그 천장이 65.4(우리px)라 5회차가 «u1 = 64.5» 를 읽은 것은 실물이 아니라 **자의 상한**이었고,
    # 6회차가 표를 벌려 실물을 72.2 로 만들어도 자는 64.9 로 **거의 안 움직였다**(그래서 들켰다).
    # ⇒ 창 밖으로도 **깊이가 u 이상인 동안 걸어 나간다**(옆 노치를 물지 않게 피치의 절반에서 멈춘다).
    # 이 천장은 ref 도 같이 잘랐다 — 4·5회차의 «자 갈림»(ref u1 65.01 ↔ 채점 2인 72.07/116.5)의 뿌리다.
    span = i1 - i0 + 1
    walk = max(margin, span)          # 옆 노치까지 못 가는 한도(노치 길이 = 피치의 절반 이하다)
    # ⚠ 걸음은 «깊이가 얕아지는 동안» 만이다(단조 가드) — 안 걸면 ref 초록의 **티켓 톱니**처럼
    #   이웃한 오목부가 이어져 창이 통째로 합쳐진다(가드 없이 재면 폭이 음수로 나온다).
    while lo - 1 >= max(0, i0 - walk) and prof[lo - 1] is not None \
            and u <= (straight - prof[lo - 1]) * k <= (straight - prof[lo]) * k:
        lo -= 1
    while hi + 1 <= min(len(prof) - 1, i1 + walk) and prof[hi + 1] is not None \
            and u <= (straight - prof[hi + 1]) * k <= (straight - prof[hi]) * k:
        hi += 1
    lo_n, hi_n = max(0, lo - margin), min(len(prof) - 1, hi + margin)
    nb = {i: (straight - prof[i]) * k for i in range(lo_n, hi_n + 1) if prof[i] is not None}

    def cross(i, step):
        """행 i 에서 바깥쪽(step 방향) 이웃과의 사이에서 깊이 u 를 지나는 자리.

        step = +1 이면 이웃은 위(j = i−1) · step = −1 이면 아래(j = i+1) 다. 어느 쪽이든
        «j 에서 i 로 t 만큼 간 자리» 이므로 부호는 `j + t*step` 이다(ⓐ 가 여기서 틀렸다).
        """
        j = i - step
        if j not in nb:
            return float(i)
        a, b = nb[j], nb[i]
        if b == a:
            return float(i)
        t = (u - a) / (b - a)
        return j + t * step

    w = (cross(hi, -1) - cross(lo, 1)) * k
    # 오염된 창(ref 초록의 티켓 톱니 · 배지에 물린 배너 맨 위 자리)에서는 두 교차가 뒤집힌다.
    # 그때는 **못 쟀다(None)** 로 답한다 — 음수 폭을 숫자로 내면 그 창을 쓰는 자가 조용히 속는다(939).
    return w if w > 0 else None


def wprofile(prof, straight, i0, i1, k, fracs=(0.25, 0.50, 0.75, 0.90)):
    st = notch_stats(prof, straight, i0, i1, k)
    D = st['D']
    return [(f, width_at(prof, straight, i0, i1, k, f * D)) for f in fracs]


# ── 5회차 신설: «입(mouth)» 축 — 깊이를 **절대 px** 로 읽는다 ────────────────────
#   4회차까지의 `wprofile` 은 깊이를 **D 의 비율**(25·50·75·90%)로 읽는다. 그 격자는
#   입구 쪽 첫 8px 을 통째로 건너뛴다(배너 25% = 깊이 7.9px) — 4회차 채점 2인(GN·GO)이
#   공통 1순위로 낸 «노치 입 필렛»(ref 는 곧은변에 **접선**으로 스며들고 우리는 모서리로
#   꺾인다)이 사는 자리가 바로 그 건너뛴 구간이다.
#   ⚠ 비율이 아니라 절대 px 인 이유 — 두 그림의 D 가 0.3px 다르면 «같은 %» 가 서로 다른
#     실물 깊이를 가리켜, 램프가 가파른 입구에서는 그 차이가 폭 1px 로 증폭된다.
MOUTH_U = (1, 2, 3, 4, 6, 8, 10)


def mprofile(prof, straight, i0, i1, k, us=MOUTH_U):
    return [(u, width_at(prof, straight, i0, i1, k, u)) for u in us]


# ── ③ «검정 띠 두께» 축 (923 8회차 신설 — 7회차 채점 2인(GT·GU)이 각자 세운 자를 저장소로 들인다) ──
#   7회차까지 이 파일에는 **바깥 모서리 하나**(검정↔바탕 = 실루엣)밖에 없었다. 그래서 «띠가 얼마나
#   두꺼운가» 는 매 회차 비평가의 자에만 있었고, 그 자가 «ref 불릿은 어깨가 12.5~14.7» 을 냈을 때
#   저장소 안에서 재현할 방법이 없었다. 이 절이 그 축이다.
#
#   자 — 행마다 검정 띠의 **두 모서리**를 부분화소로 잡는다:
#     · 바깥 = 검정↔바탕  … `outer_x` (실루엣 · 위와 같은 자)
#     · 안쪽 = 검정↔밝은 림 … 그 자리에서 왼쪽으로 걸으며 밝기가 «밝은 쪽 고원의 절반» 을 넘는 자리
#   두 점구름을 만든 뒤 **안쪽 점 → 바깥 점구름 최소 유클리드 거리**를 두께로 쓴다.
#   ⚑ 가로 폭을 그대로 쓰면 안 된다 — 어깨에서 경계가 기울어 있어 1/cos 만큼 부풀고(45°면 √2),
#     그 편향이 «불릿이 두껍다» 를 통째로 만들 수 있다. 최소 거리는 참 두께의 **하한**이라
#     부호가 뒤집히지 않는다(7회차 채점 GT 와 같은 규약).
#   ⚠ 밝기는 `max(R,G,B)` 로 본다 — 림·몸통은 밝고 띠는 검정이라 채널 하나로는 카드 색에 흔들린다.
#   ⚑ **검정 상태(2026-09-05, 8회차 2단계) — 네 자리 전부 검정됐다.**
#     우리 곧은변 **10.05 / 10.06**(선언 10 · 채점 GT «정확히 10.000») · 우리 노치 전 구간 9.79~10.06 ·
#     **ref 배너** 곧은변 10.33 · **ref 불릿** 곧은변 **10.33**(= 채점 2인 10.17~10.23 과 같은 자리).
#     ⚠ 1단계의 «ref 불릿 11.81» 은 **자의 바탕 표본**이 낸 유령이었다(위 BG_COLS 절 ⚑⚑) —
#     «초록 카드 바깥의 그림자 경사» 라는 1단계 가설은 **기각**됐다(같은 행을 손으로 재면 10.35).
#     ⚠ 노치 «오염된 자리» 는 여전히 빼야 한다(배너 첫 자리 = 배지·탭 · 불릿 y188·y213 = 티켓 톱니).
DARK_F = 0.50        # «검정» 경계 준위(그 자리 밝은 고원의 비율) — 사다리는 --darkf 로 흔든다
BAND_MARGIN = 12     # 노치 창 밖으로 점구름에 넣는 이웃 행 수(얕은 깊이 칸을 채운다)
BAND_BINS = [(-2, 2), (2, 4), (4, 7), (7, 10), (10, 16), (16, 24), (24, 34)]


def inner_x(g, xo, x0, darkf=DARK_F):
    """행 밝기 g 에서 «검정 띠의 안쪽(림 쪽) 모서리» 를 부분화소로. 못 찾으면 None.

    xo(바깥 모서리)에서 왼쪽으로 걸으며 어두운 구간을 지나고, 밝은 쪽 고원 V 의 절반을 넘는
    첫 자리에서 선형 보간한다. V 는 그 자리 왼쪽 3화소의 최댓값(림 242 · 몸통 201 · ref 는 다른 값).
    """
    i = int(np.floor(xo))
    if i <= x0 + 2:
        return None
    # 어두운 구간부터 만난다(바깥 모서리 바로 안쪽은 검정이어야 한다)
    while i > x0 + 2 and g[i] > 60:
        i -= 1
    while i > x0 + 2 and g[i] <= 60:
        i -= 1
    # 이제 g[i] 가 «밝은 쪽» 첫 화소, g[i+1] 이 어두운 쪽
    v = float(max(g[max(x0, i - 3):i + 1].max(), g[i]))
    if COV and PED:
        # ⚑⚑ **9회차 — 띠의 두 끝을 «다른 자» 로 재고 있었다(8회차 채점이 남긴 +0.2 의 뿌리).**
        #   바깥 끝(`outer_x`)은 4회차에 **덮개 적분**으로 갈았는데(942 처방 — 문턱 자는 하드 에지에서
        #   한쪽으로 치우친다) 안쪽 끝은 그대로 **50% 교차**였다. 한 띠의 두 끝을 서로 다른 자로 재니
        #   그 편향 차가 통째로 두께에 실린다.
        #   실측(ref 초록 y660 · 곧은변): g = … 241 | 49 | 0 0 0 1 | 43 49 … 이고 검정 덮개는
        #   c(481) = (241−49)/241 = 0.797 · c(480) = 0 ⇒ 참 경계는 **480.70**(면적)인데
        #   50% 교차는 **480.63** 을 준다 ⇒ 두께가 10.15 대신 **10.28** 로 읽힌다.
        #   ⇒ 안쪽도 같은 자로: c = (V − g)/V 를 **꽉 찬 검정 화소 왼쪽 끝**에서 왼쪽으로 적분한다.
        #   ref 곧은변 10.33 → **10.15**(채점 GV 10.15 «반값» · GW 10.11 과 같은 자리) ·
        #   우리 렌더는 경계 화소가 한 장뿐이라 두 자의 값이 사실상 같다(10.00 그대로).
        #   ⚠ 되돌리려면 `--ruler8` — 그러면 이 함수도 8회차의 50% 교차로 돌아간다(§R8 이 그 사본을 쓴다).
        if v <= 0:
            return None
        xs = i + 1                                  # 첫 «어두운» 화소
        while xs + 1 < len(g) and (v - g[xs]) / v < 0.95:
            xs += 1                                 # 꽉 찬 검정을 만날 때까지
        acc = 0.0
        for x in range(max(x0, xs - 4), xs):
            acc += min(1.0, max(0.0, (v - float(g[x])) / v))
        return xs - 0.5 - acc
    lvl = v * darkf
    if g[i] < lvl or g[i + 1] >= lvl:
        return None
    f = (g[i] - lvl) / max(1e-6, (g[i] - g[i + 1]))
    return i + f


def band_prof(a, y0, y1, x0, x1, bg, t, k, straight, i0=None, i1=None, darkf=DARK_F):
    """[y0,y1) 행에서 (깊이 u, 띠 두께, 행) 을 낸다 — 둘 다 «우리 px».

    깊이는 **그 두께를 낸 바깥 점**의 깊이로 적는다(안쪽 점 자리로 적으면 어깨에서 한 칸 밀린다).
    i0·i1 을 주면 그 행 구간(노치)만 본다 — 이웃 `BAND_MARGIN` 행까지 점구름에 넣는다.
    ⚠ 이웃을 좁게 잡으면 **얕은 깊이 칸이 통째로 빈다** — 노치 창은 «깊이 ≥ 6» 이라
    u 2~6 은 창 밖 행에만 있고, 입에서는 한 행에 깊이가 여러 px 씩 뛴다(4행이면 0 → 6 을 건너뛴다).
    """
    g = a.max(2)
    outs, inns = [], []
    lo = y0 if i0 is None else y0 + i0
    hi = y1 if i1 is None else y0 + i1 + 1
    for y in range(max(y0, lo - BAND_MARGIN), min(y1, hi + BAND_MARGIN)):
        row = a[y, x0:x1]
        xo = outer_x(row, bg_of(bg, y), t, k)
        if xo is None:
            continue
        xi = inner_x(g[y], xo + x0, x0, darkf)
        outs.append((xo + x0, y))
        if xi is not None:
            inns.append((xi, y))
    # ⚑⚑ **9회차 — 얕은 깊이 칸은 «행» 으로는 못 채운다(8회차 2단계 §5 가 남긴 선행 과제).**
    #   입 근처에서 노치 경계는 곧은변과 거의 나란하다 — 한 행이 깊이를 여러 px 씩 건너뛰어
    #   u2~4 · u7~10 칸이 통째로 빈다(ref 불릿 y298 자리: 두 칸 다 표본 0). 같은 병목을
    #   6회차가 «입 폭» 축에서 이미 만났고 그 처방이 **행이 아니라 열로 읽는 것**이었다(REF_M 주석).
    #   ⇒ 여기서도 **열(세로) 스캔을 점구름에 더한다**: 한 열은 «몸통 → 검정 → 노치 속 바탕 →
    #   검정 → 몸통» 이라 위·아래 어깨가 각각 «재료 → 바탕» 한 번씩이다. 열을 그대로 `outer_x`·
    #   `inner_x` 에 먹이면(아래 어깨는 뒤집어서) 같은 자·같은 규약이 그대로 쓰인다.
    #   ⚠ 열 표본은 **점구름에 더할 뿐** 두께 계산 규약(안쪽 점 → 바깥 점구름 최소 거리)은 그대로다.
    if i0 is not None and COLSCAN and outs:
        ylo, yhi = max(y0, lo - BAND_MARGIN), min(y1, hi + BAND_MARGIN)
        ymid = (lo + hi) // 2
        bgm = np.median(np.array([bg_of(bg, y) for y in range(ylo, yhi)], float), axis=0)
        xmin = int(min(o[0] for o in outs)) - 2
        for x in range(max(x0 + 1, xmin), min(x1, int(straight + x0) + 2)):
            for side in (0, 1):
                s0, s1 = (ylo, ymid) if side == 0 else (ymid, yhi)
                if s1 - s0 < 6:
                    continue
                col = a[s0:s1, x]
                gc = g[s0:s1, x]
                if side == 1:                      # 아래 어깨 — «재료 → 바탕» 방향으로 뒤집는다
                    col, gc = col[::-1], gc[::-1]
                yo = outer_x(col, bgm, t, k)
                if yo is None:
                    continue
                yi = inner_x(gc, yo, 0, darkf)
                m = (lambda p: s0 + p) if side == 0 else (lambda p: s0 + (s1 - s0 - 1) - p)
                outs.append((float(x), m(yo)))
                if yi is not None:
                    inns.append((float(x), m(yi)))
    if not outs or not inns:
        return []
    O = np.array(outs, float)
    out = []
    for xi, y in inns:
        d = np.hypot(O[:, 0] - xi, O[:, 1] - y)
        j = int(d.argmin())
        # 10회차 — 이름표(위 UAT). `outer` 가 기본이자 «손잡이의 축» 이다.
        uo = (straight - (O[j, 0] - x0)) * k          # 바탕 쪽 끝(= 실루엣 = `NTC_BAND` 의 축)
        ui = (straight - (xi - x0)) * k               # 림 쪽 끝(= `oc` · 두께만큼 깊다)
        u = ui if UAT == 'inner' else (uo + ui) / 2 if UAT == 'mid' else uo
        out.append((u, float(d[j]) * k, y))
    return out


def band_table(rows, bins=BAND_BINS):
    """(u, 두께) 쌍을 깊이 칸으로 묶어 중앙값을 낸다."""
    out = []
    for a0, a1 in bins:
        vs = [d for u, d, _ in rows if a0 <= u < a1]
        out.append(((a0, a1), float(np.median(vs)) if vs else None, len(vs)))
    return out


# ── ② «마지막 알약 아랫변 ↔ 리본1 윗변» 틈 (923 1회차 신설 · 등재문 ②) ──────────
#   같은 절차를 ref 와 우리에게 쓴다: 알약 가로 구간의 **행 중앙값** 밝기로
#   「알약 채움(어둡다) → 카드 몸통(중간) → 리본 검정 테(가장 어둡다)」 를 가르고,
#   두 경계를 **부분화소 50% 교차**로 잡아 그 차이를 «우리 px» 로 낸다.
#   ⚠ 행 중앙값을 쓰는 이유 — 한 열로 재면 흰 글자·별표가 그 열을 지배한다(6회차 «오염된 창»).


def gap_pill_ribbon(img, x0, x1, y0, y1, k, label):
    """알약 아랫변 ↔ 리본1 윗변 틈. img = 밝기 배열 · [x0,x1) = 알약 가로 구간.

    창(y0,y1)은 **마지막 알약 안에서 시작해 리본1 검정 테 안에서 끝나야** 한다 —
    그래야 «채움 → 몸통 → 검정» 세 고원이 창 안에 한 번씩만 들어온다.
    """
    prof = [(y, float(np.median(img[y, x0:x1]))) for y in range(y0, y1)]
    v = [p[1] for p in prof]
    fill, body = v[0], max(v)
    t_up, t_dn = (fill + body) / 2, body / 2
    up = None
    for i in range(len(v) - 1):
        if v[i] < t_up <= v[i + 1]:
            up = prof[i][0] + (t_up - v[i]) / (v[i + 1] - v[i]) + 0.5
    dn = None
    if up is not None:
        for i in range(int(up) - y0, len(v) - 1):
            if v[i] > t_dn >= v[i + 1]:
                dn = prof[i][0] + (t_dn - v[i]) / (v[i + 1] - v[i]) + 0.5
                break
    if up is None or dn is None:
        print(f'-- {label}: 경계를 못 찾았다 (창을 다시 잡아라 — 채움 {fill:.0f} · 몸통 {body:.0f})')
        return None
    print(f'-- {label}  알약 아랫변 {up:.2f} · 리본1 윗변 {dn:.2f} · '
          f'틈 {(dn - up):.2f}(자기px) = **{(dn - up) * k:.2f} 우리px**  [채움 {fill:.0f} · 몸통 {body:.0f}]')
    return (dn - up) * k


def scan(a, y0, y1, x0, x1, bg, k, t, label):
    prof = profile(a, y0, y1, x0, x1, bg, t, k)
    vals = [p for p in prof if p is not None]
    if not vals:
        print(f'-- {label}: 프로파일 없음')
        return []
    # ⚑ 923 1회차 채점 GK 지적 — «상위 40% 의 중앙값» 은 **곧은 변보다 오른쪽에 있는 부품**에 진다.
    # ref 불릿 카드 창에는 분홍 배지가 x=498 까지 삐져나와 곧은변이 486.26 → 486.88 로 부풀었고,
    # 그 0.62 ref px 가 «ref 두 형의 깊이 차 0.52 우리px» 라는 **유령**을 통째로 만들었다
    # (GK 가 노치 없는 행만 골라 재니 ref 두 형의 차는 **0.01 우리px** 이다).
    # ⇒ 곧은 변은 **최빈값**으로 잡는다 — 노치(왼쪽으로 벗어남)도 배지(오른쪽으로 벗어남)도
    #   «몇 행 안 되는 소수» 라 최빈 구간을 못 흔든다. 0.25px 격자로 세고 그 봉우리 ±0.5px 안에서 중앙값.
    q = np.round(np.array(vals) * 4) / 4
    peak = float(np.bincount(((q - q.min()) * 4).astype(int)).argmax()) / 4 + float(q.min())
    near = [v for v in vals if abs(v - peak) <= 0.5]
    straight = float(np.median(near)) if near else float(np.median(vals))
    tol_img = TOL_OUR / k
    idx = [i for i, p in enumerate(prof) if p is not None and straight - p >= tol_img]
    ns = [r for r in runs(idx, minlen=4)]
    # 카드 위·아래 끝(모서리 라운드)은 노치가 아니다 — 끝에 닿은 구간은 뺀다.
    ns = [(s, e) for (s, e) in ns if s > 2 and e < len(prof) - 3]
    out = []
    print(f'-- {label}  곧은변 x={straight:.2f}  문턱 t={t:.0f}  노치 {len(ns)}개')
    print('     #  y구간(자기px)     길이     깊이D    평탄부F    R_fit   R−D   판정')
    for n, (s, e) in enumerate(ns):
        st = notch_stats(prof, straight, s, e, k)
        verdict = '반원' if st['R'] >= st['D'] - 0.6 else '스타디움(바닥 곧음)'
        print(f'    {n + 1:2d}  {s:4d}..{e:4d}  {st["length"]:8.1f} {st["D"]:8.2f}'
              f' {st["flat"]:9.2f} {st["R"]:8.2f} {st["R"] - st["D"]:6.2f}   {verdict}')
        if '--prof' in sys.argv:
            wp = wprofile(prof, straight, s, e, k)
            cells = '  '.join(f'{int(f * 100):3d}% {("  n/a" if w is None else f"{w:6.2f}")}'
                              for f, w in wp)
            print(f'        깊이별 폭(우리px) — {cells}   평탄부 {st["flat"]:.2f}')
        if '--mouth' in sys.argv:
            mp = mprofile(prof, straight, s, e, k)
            cells = '  '.join(f'u{u:<2d} {("  n/a" if w is None else f"{w:6.2f}")}'
                              for u, w in mp)
            print(f'        입 폭(우리px · 절대깊이) — {cells}')
        if '--band' in sys.argv:
            df = float(sys.argv[sys.argv.index('--darkf') + 1]) if '--darkf' in sys.argv else DARK_F
            bp = band_prof(a, y0, y1, x0, x1, bg, t, k, straight, s, e, df)
            bt = band_table(bp)
            cells = '  '.join(f'u{b0}~{b1} {("  n/a" if v is None else f"{v:6.2f}")}({n})'
                              for (b0, b1), v, n in bt)
            print(f'        띠 두께(우리px · 깊이칸) — {cells}')
            # 9회차 — 노드 게이트(`verify923` [B8])가 **같은 자·같은 칸**을 그대로 읽게 한다.
            st['band'] = [[b0, b1, v, n] for (b0, b1), v, n in bt]
        out.append(st)
    if '--band' in sys.argv:
        df = float(sys.argv[sys.argv.index('--darkf') + 1]) if '--darkf' in sys.argv else DARK_F
        # 곧은 변 — 노치 구간(±4행)을 뺀 행만이 두께의 기준선이다. 한 번에 재야
        # 점구름이 서고, 행마다 따로 부르면 «한 점까지의 거리» = 가로 폭이 되어 못 쓴다.
        inn = set()
        for (s0, e0) in ns:
            inn.update(range(max(0, s0 - BAND_MARGIN - 2), min(len(prof), e0 + BAND_MARGIN + 3)))
        rows = [r for r in band_prof(a, y0, y1, x0, x1, bg, t, k, straight, None, None, df)
                if (r[2] - y0) not in inn and abs(r[0]) <= 1.5]
        if rows:
            straight_th = float(np.median([d for _, d, _ in rows]))
            print(f'    곧은변 띠 두께(우리px) 중앙값 {straight_th:6.2f}'
                  f'  (표본 {len(rows)})')
            for st in out:
                st['straight_band'] = straight_th
    return out


def report_ref(t):
    a = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    H, W, _ = a.shape
    print(f'== ref {REF} {W}x{H}  (k={K} · 길이는 전부 «우리 px»)')
    bg0 = a[2, W - 3].tolist()
    solid = [y for y in range(H) if (np.abs(a[y] - np.array(bg0)).sum(1) > t).sum() > W * 0.40]
    bands = runs(solid, minlen=20)
    names = ['blue(배너형)', 'green(불릿형)']
    res = {}
    for i, (y0, y1) in enumerate(bands):
        name = names[i] if i < len(names) else f'card{i + 1}'
        bg = bg_rows(a, y0, y1 + 1, W - 1)   # 행마다 — 한 색으로 잡으면 밝은 패널 띠에 진다(위 ⚑⚑)
        res[name] = scan(a, y0, y1 + 1, 0, W, bg, K, t, f'ref {name}  y {y0}..{y1}')
    return res


def report_cap(png, geo, t):
    a = np.asarray(Image.open(png).convert('RGB')).astype(int)
    H, W, _ = a.shape
    print(f'== cap {png} {W}x{H}')
    g = json.load(open(geo))
    res = {}
    for i, c in enumerate(g['cards']):
        b = c.get('box') or c
        x, y, w, h = int(b['x']), int(b['y']), int(b['w']), int(b['h'])
        if y < 0 or y + h > H:
            print(f'-- card{i + 1} 화면 밖 — 건너뜀')
            continue
        bg = bg_rows(a, y, y + h, min(W, x + w + 13))   # 행마다(창 밖 오른쪽 여백) — ref 와 같은 규약
        res[f'card{i + 1}'] = scan(a, y, y + h, x, min(W, x + w + 6), bg, 1.0, t,
                                   f'cap card{i + 1} ({c.get("id", "")})  box {x},{y} {w}x{h}')
    return res


if __name__ == '__main__':
    t = float(sys.argv[sys.argv.index('--t') + 1]) if '--t' in sys.argv else T0
    ladder = [t * 0.8, t, t * 1.2] if '--ladder' in sys.argv else [t]
    did = False
    res = {}
    for tv in ladder:
        if '--ref' in sys.argv:
            res = report_ref(tv); did = True
        if '--cap' in sys.argv:
            png = sys.argv[sys.argv.index('--cap') + 1]
            geo = sys.argv[sys.argv.index('--geo') + 1]
            res = report_cap(png, geo, tv); did = True
    # 9회차 — 노드 게이트가 같은 자를 그대로 읽게 하는 통로(`verify923` [B8]).
    #   ⚠ 새 축을 여기서 «다시 계산» 하지 않는다 — 위 `scan()` 이 낸 것을 그대로 싣는다(사본 금지 · 402).
    if '--json' in sys.argv:
        # NaN 은 JSON 이 아니다(노드 `JSON.parse` 가 즉사한다 — 939 «자가 못 쟀다» 를 조용히 만든다).
        def clean(v):
            if isinstance(v, dict):
                return {a: clean(b) for a, b in v.items()}
            if isinstance(v, (list, tuple)):
                return [clean(x) for x in v]
            if isinstance(v, float) and not np.isfinite(v):
                return None
            return v
        print('@@JSON@@' + json.dumps(clean(res), ensure_ascii=False))
    if not did:
        print(__doc__)
