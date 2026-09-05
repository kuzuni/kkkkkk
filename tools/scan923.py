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

import numpy as np
from PIL import Image

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


MIN_EXT_OUR = 12.0                # «카드 재질» 로 인정할 최소 덩이 두께(**우리 px** — ref 에서는 /K)
GAP_OUR = 3.0                     # 덩이를 이어 붙일 수 있는 틈(우리 px · ref 1.45px) — 아래 ⚑


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
    if i + 1 >= len(d):
        return i + 0.5
    a, b = d[i], d[i + 1]
    if a == b:
        return i + 0.5
    return (i + 0.5) + (a - t) / (a - b)


def profile(a, y0, y1, x0, x1, bg, t, k=1.0):
    return [outer_x(a[y, x0:x1], bg, t, k) for y in range(y0, y1)]


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
        out.append(st)
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
        bg = a[(y0 + y1) // 2, W - 3].tolist()
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
        bg = a[y + h // 2, min(W - 3, x + w + 12)].tolist()
        res[f'card{i + 1}'] = scan(a, y, y + h, x, min(W, x + w + 6), bg, 1.0, t,
                                   f'cap card{i + 1} ({c.get("id", "")})  box {x},{y} {w}x{h}')
    return res


if __name__ == '__main__':
    t = float(sys.argv[sys.argv.index('--t') + 1]) if '--t' in sys.argv else T0
    ladder = [t * 0.8, t, t * 1.2] if '--ladder' in sys.argv else [t]
    did = False
    for tv in ladder:
        if '--ref' in sys.argv:
            report_ref(tv); did = True
        if '--cap' in sys.argv:
            png = sys.argv[sys.argv.index('--cap') + 1]
            geo = sys.argv[sys.argv.index('--geo') + 1]
            report_cap(png, geo, tv); did = True
    if not did:
        print(__doc__)
