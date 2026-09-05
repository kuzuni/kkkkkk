#!/usr/bin/env python3
"""작업 885 6회차 — ★ 불릿 글리프의 «검정 획 두께» 를 재는 **셋째 자**.

5회차 채점 2인이 «★ 검정 획이 두껍다» 로 처음 일치했는데 **크기가 2배 갈렸다**:

  · EV — 2성분 언믹싱 → 금색 코어에서 k 팽창 안의 검정 · **등가반지름** · 팽창 3단 : +57~64%
  · EW — 무게중심에서 0.1px 방사선 720방향 · 「금색 끝 → 검정 끝」 차의 **중앙값** · 문턱 6단 : +21~35%

두 자는 성질이 같은 쪽에 몰려 있다 — 둘 다 **한 점(중심)에서 밖으로 세는** 자라
별처럼 오목·볼록이 번갈아 나오는 형에서는 «어느 방향을 세느냐» 가 값을 지배한다
(EV 의 등가반지름은 방향 평균, EW 의 방사선은 방향 표본).

⇒ 이 자는 **중심을 안 쓴다.** 금색 채움을 원본(source)으로 놓고 **거리장(EDT)** 을 깔아
   검정 띠의 화소마다 «금색까지의 거리» 를 재고, 그 분포로 두께를 낸다.
   띠가 두께 T 로 금색 경계에 붙어 있으면 거리는 0..T 에 깔리므로
   **T ≈ 2 × median(d)** 이고 **T ≈ p95(d) + 0.5** 다(둘을 같이 낸다 — 갈리면 그대로 적는다).
   방향을 한 번도 안 고르므로 EV·EW 가 갈린 축(방향 표본)에 **구조적으로 안 걸린다.**

⚠ 브리핑 §5-1 «행 단위 가로 절단 자는 쓰지 마라» — EV 가 ref 행 사다리에서 부호 뒤집힘
   (+86%/+671%/+126%/+2%/−31%/+97%)을 실측했다. 이 자는 행을 한 번도 안 자른다.

⚠ **오염 하나를 반드시 배제한다** — ★ 가 앉은 불릿 판(`.pvb`)이 `rgba(61,20,10,.56)` 로
   **원래 어둡다**. 느슨한 «검정» 문턱을 쓰면 판이 통째로 획이 된다. 그래서
   ⓐ 검정 문턱 사다리를 돌리고 ⓑ 금색에서 `RMAX` 안쪽만 보고 ⓒ 금색에 닿은 연결 성분만 센다.

⚑ **과녁은 «비» 로 잡는다** — «실루엣 ÷ 금색» 은 ×K 환산을 안 거치므로 브리핑 §2-2 가 경고한
   ≈0.5px 편향을 **구조적으로** 안 탄다. 거리장 분위(p50·p95)는 ×K 를 거치므로 **부호를 읽는 데만** 쓰고
   과녁으로는 쓰지 마라.
   ⚠⚠ **정오표(932 6회차)** — 옛 머리말은 여기에 «실제로 문턱 사다리 네 단에서 ref 가 소수 셋째 자리까지
   안 움직인다(1.176 / 1.231)» 를 덧붙이고 그 부동을 손 상수 과녁의 근거로 삼았다. **그 부동이 곧 격자였다** —
   부분 화소로 재면 ref 는 단마다 움직인다(가로 1.136 → 1.169 → 1.199 → 1.228 · 세로 1.211 → 1.254 → 1.293 → 1.348).
   ⇒ 과녁은 이제 **같은 단의 ref** 다(손 상수 0). 옛 상수 판정은 `--int` 가 그대로 되살린다.

⚑⚑ **932 6회차 — 걸음이 1/4 px 이다.** 창·마스크·문턱은 한 글자도 안 바꾸고 창 안 그림만 겹선형으로
   4배 늘려 같은 판정을 더 곱게 한다(아래 `SS`·`upscale`). 옛 걸음은 두께를 정수 격자의 √합에만
   떨어뜨려 ref 가 {2.83, 3.41, 3.85, 4.00} 네 값에, 우리 쪽은 16단 **전부 2.24**(= √5)에 굳어 있었다.
   `--int` 로 SS=1 = 옛 자의 출력이 **한 글자도 안 틀리고** 돌아온다(자는 `verify932` §9).

실행:
    python3 tools/scan885e.py --cap <우리 캡처.png>
    python3 tools/scan885e.py --cap <캡처> --dump      # 창·마스크 화소 수까지
    python3 tools/scan885e.py --cap <캡처> --gate      # 비 과녁 판정 (종료 코드 0/1)
    python3 tools/scan885e.py --cap <캡처> --int       # 옛 정수 걸음 (되돌림 시험 · 932 6회차)

종료 코드(939 사전 — `tools/pydep937.py`): 0 통과 · 1 FAIL · **2 = 환경에 없음(부트스트랩만)** ·
**3 = 이 자가 못 쟀다**(★ 창 자동 탐색 실패). ⚠ 옛 판은 3 자리에도 2 를 썼다 — 그러면 이 자를
`py()` 로 부른 노드가 «측정이 안 됐다» 를 **«환경에 없음»** 으로 읽어 스윕이 «없는 자» 로 지나간다.

되돌림 시험은 이 자가 겸한다 — 수리 전 판(6회차 이전 `-webkit-text-stroke:6px`, 마이터)에 `--gate` 를
걸면 **빨갛다**(실측 1.529~1.647 / 1.515~1.606). 수리 후 판은 1.235 / 1.242 로 초록이다.
"""
import argparse
import os
import sys

from pydep937 import np
from pydep937 import Image
from pydep937 import ndimage      # 938 — 날 `from scipy import ndimage` 는 코드 1 로 즉사했다
from pydep937 import fail         # 939 — «자가 못 쟀다» 는 코드 3(2 는 «환경에 없음» 전용)

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                     # 우리 px = ref px × K (측정표 §9)

# ref ★ 불릿 넷 — 행 런/열 런으로 직접 찾은 자리(금색 잉크 x40..56).
# 창은 잉크에서 사방 PAD_REF 만 넓힌다(옆 글자·판 모서리를 안 물게).
REF_STARS = [(40, 56, 402, 417), (40, 56, 442, 457), (40, 56, 482, 497), (40, 56, 521, 536)]
PAD_REF = 9

# 검정 문턱 사다리 — 값은 «최대 채널» 기준(순검정 0, 불릿 판은 blend 라 60~90 대).
BLK_STEPS_REF = [40, 55, 70, 85]
BLK_STEPS_CAP = [40, 55, 70, 85]
# 금색 문턱 사다리 — (min(R,G) − B).
GOLD_STEPS = [40, 60, 80, 100]

RMAX_REF = 8.0                 # 금색에서 이만큼 밖까지만 «획» 후보 (ref px)

# ⚑⚑ 932 6회차 — **걸음만 1/SS px 로 곱게 한다(문턱·마스크·창은 한 글자도 안 바꾼다).**
#   옛 걸음은 이진 마스크에 `distance_transform_edt` 를 깔아 거리를 **정수 격자의 √합**에만 떨어뜨렸다
#   (실측: ref 두께가 문턱 사다리 16단에서 {5.83, 7.04, 7.95, 8.25} 네 값에만 앉고 — 5.83 = 2√2 × K —
#    우리 쪽은 16단 **전부 4.47** = 2√5 로 굳어 있었다). 참값이 ref 2.83~4.00 ref px 인 축에서
#   한 눈금이 곧 ref 1 px = 우리 **2.06 px** 이라, 이 자의 «−23~−46%» 는 그 격자 위의 수였다.
#   ⇒ 창(★ 상자)·마스크 함수·문턱 사다리는 그대로 두고, **창 안 그림만 겹선형으로 SS 배 늘려**
#     같은 문턱으로 같은 마스크를 세우고 EDT 를 깐 뒤 거리를 ÷SS 한다.
#     겹선형 확대 + 같은 문턱 = 색 경사면이 문턱을 지나는 자리를 1/SS px 로 집는 것(처방 ⓐ 의 2차원 꼴)이라
#     «문턱을 무르게 한다» 가 아니다(932 3회차 규칙 1). `--int` 로 SS=1 = 옛 걸음이 그대로 돌아온다.
#   ⚠ `grid_mode=True` 여야 한다 — 화소를 «단위 넓이 사각» 으로 보는 규약이라 SS 를 바꿔도 경계가 안 움직인다
#     (기본값 align-corners 는 SS 마다 그림이 0.5·(1−1/SS) px 씩 밀린다).
SS = 4                         # 부분 화소 걸음 = 1/4 px (0.25 ref px = 0.5 우리 px 보다 촘촘)
INT_STEP = '--int' in sys.argv  # 되돌림 시험 — 옛 정수 걸음


def upscale(win, ss):
    """창 하나를 겹선형으로 ss 배 — 화소를 «단위 넓이 사각» 으로 보는 규약(grid_mode)."""
    if ss == 1:
        return win.astype(float)
    return ndimage.zoom(win.astype(float), (ss, ss, 1), order=1, grid_mode=True, mode='nearest')


def gold_mask(a, t):
    R, G, B = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (np.minimum(R, G) - B >= t) & (R > 150) & (G > 110)


def black_mask(a, t):
    return a.astype(int).max(axis=2) <= t


def ring_thickness(win, gt, bt, rmax):
    """창 하나에서 «금색에 붙은 검정 띠» 의 두께를 거리장으로 낸다.

    반환 (T_med, T_p95, ring_px, gold_px) — **원래 화소 단위**(걸음만 1/ss). 못 재면 None.

    ⚑ 932 6회차 — 창·마스크·문턱은 그대로, 그림만 ss 배로 늘려 같은 판정을 더 곱게 한다.
      거리·넓이는 ÷ss · ÷ss² 로 되돌려 적으므로 **눈금 이름이 안 바뀐다**(SS=1 이면 옛 값 그대로).
    """
    ss = 1 if INT_STEP else SS
    w = upscale(win, ss)
    g = gold_mask(w, gt)
    if g.sum() < 12 * ss * ss:
        return None
    b = black_mask(w, bt)
    # 금색까지의 거리장. 금색이 source 이므로 금색 밖에서만 값이 선다.
    d = ndimage.distance_transform_edt(~g) / ss
    cand = b & (d > 0) & (d <= rmax)
    if cand.sum() < 4 * ss * ss:
        return None
    # 금색에 «닿은» 연결 성분만 남긴다(판·글자 등 떨어져 있는 검정을 버린다).
    # ⚑⚑ 6회차 — «닿았다» 를 **격자 인접**이 아니라 «금색까지 1 원래-화소 안» 으로 적는다.
    #   겹선형으로 늘리면 금색과 검정 사이에 «둘 다 아닌» 경사면 띠가 SS/2 눈금쯤 생겨
    #   `label(cand | g)` 의 인접 판정이 **띠 전체를 떨어진 것으로** 버린다(실측: ring 670 → 0).
    #   원래-화소 단위로 물으면 SS 가 몇이든 같은 것을 세고, **SS=1 이면 옛 판정과 글자 그대로 같다**
    #   (금색에 4-인접한 화소의 EDT 거리가 정확히 1.0 이고 대각선은 1.414 로 옛 4-연결과 같이 빠진다).
    lab, n = ndimage.label(cand)
    if n == 0:
        return None
    mins = np.atleast_1d(ndimage.minimum(d, lab, index=list(range(1, n + 1))))
    keep = [i for i, mn in enumerate(mins, start=1) if float(mn) <= 1.0]
    ring = cand & np.isin(lab, keep)
    if ring.sum() < 4 * ss * ss:
        return None
    dv = d[ring]
    # ⚠ p95 자의 «+0.5» 는 «마지막 화소의 바깥 반쪽» 을 더하는 항이라 **걸음에 매인다** —
    #   격자가 곱아지면 그 반쪽도 같이 작아진다(ss=1 이면 옛 값 그대로 +0.5).
    return (2.0 * float(np.median(dv)), float(np.percentile(dv, 95)) + 0.5 / ss,
            int(round(ring.sum() / (ss * ss))), int(round(g.sum() / (ss * ss))))


def find_cap_stars(a):
    """우리 캡처에서 ★ 불릿 넷을 찾는다 — 금색 잉크 덩이 중 «세로로 줄 선 넷».

    ⚠ 카드 좌표를 안 쓴다(«카드 상변이 어디냐» 축에 안 매달리려고 — scan885d 와 같은 이유).
    """
    g = gold_mask(a, 60)
    lab, n = ndimage.label(g)
    objs = ndimage.find_objects(lab)
    cand = []
    for i, sl in enumerate(objs, start=1):
        ys, xs = sl
        h, w = ys.stop - ys.start, xs.stop - xs.start
        px = int((lab[sl] == i).sum())
        # ★ 잉크는 ref 17×16 × K = 약 35×33, 화소 수는 약 165 × K² ≈ 700
        if 24 <= w <= 46 and 24 <= h <= 44 and 350 <= px <= 1200:
            cand.append((xs.start, xs.stop - 1, ys.start, ys.stop - 1, px))
    # 같은 x 열에 세로로 늘어선 넷을 고른다
    if not cand:
        return []
    from collections import defaultdict
    byx = defaultdict(list)
    for c in cand:
        byx[round(c[0] / 6)].append(c)
    best = max(byx.values(), key=len)
    return sorted(best, key=lambda c: c[2])


def run(img, stars, pad, gsteps, bsteps, rmax, label, dump):
    a = np.array(Image.open(img).convert('RGB'))
    rows = []
    for gt in gsteps:
        for bt in bsteps:
            med, p95, rp, gp = [], [], 0, 0
            for (x0, x1, y0, y1) in stars:
                win = a[max(0, y0 - pad):y1 + 1 + pad, max(0, x0 - pad):x1 + 1 + pad]
                r = ring_thickness(win, gt, bt, rmax)
                if r is None:
                    continue
                med.append(r[0]); p95.append(r[1]); rp += r[2]; gp += r[3]
            if not med:
                rows.append((gt, bt, None, None, 0, 0))
            else:
                rows.append((gt, bt, float(np.mean(med)), float(np.mean(p95)), rp, gp))
    print('== %s (%d 개 ★ · 창 pad %d · rmax %.1f) ==' % (label, len(stars), pad, rmax))
    print('  gold  blk |  T(2·중앙값)   T(p95+.5) | 띠화소  금색화소')
    for gt, bt, m, p, rp, gp in rows:
        if m is None:
            print('  %4d %4d |      —            —       |   —       —' % (gt, bt))
        else:
            print('  %4d %4d |    %6.2f       %6.2f     | %5d   %5d' % (gt, bt, m, p, rp, gp))
    ok = [(m, p) for _, _, m, p, _, _ in rows if m is not None]
    if ok:
        ms = [m for m, _ in ok]; ps = [p for _, p in ok]
        print('  → 중앙값 자: %.2f ~ %.2f (평균 %.2f) · p95 자: %.2f ~ %.2f (평균 %.2f)'
              % (min(ms), max(ms), float(np.mean(ms)), min(ps), max(ps), float(np.mean(ps))))
    if dump:
        print('  창:', stars)
    return rows


def sil_ratio(img, stars, pad, bsteps):
    """«실루엣 ÷ 금색» 을 문턱 사다리로 낸다 — (가로 비 목록, 세로 비 목록).

    ⚑ 932 6회차 — 여기도 같은 걸음이다. bbox 는 «(max − min + 1)» 인데 그 «+1» 이 한 눈금이라
      ss 배 격자에서는 +1/ss 다 ⇒ 폭을 ÷ss 해서 **원래 화소 단위**로 되돌린다(SS=1 이면 옛 값 그대로).
    ⚠ ★ 금색 잉크가 ref 17 px 이라 ±1 눈금이 폭의 ±6% 다 — 비(ratio)로 나눠도 반은 남는다
      (과녁 여유 ±0.075 의 절반). 이 축이 «얇지 않아 보이지만» 실제로는 결함 조건 ① 이 서는 자리다.
    """
    a = np.array(Image.open(img).convert('RGB'))
    ss = 1 if INT_STEP else SS
    rw, rh = [], []
    for bt in bsteps:
        gw, gh, sw, sh = [], [], [], []
        for (x0, x1, y0, y1) in stars:
            win = upscale(a[max(0, y0 - pad):y1 + 1 + pad, max(0, x0 - pad):x1 + 1 + pad], ss)
            g = gold_mask(win, 60)
            s = black_mask(win, bt) | g
            gy, gx = np.nonzero(g)
            sy, sx = np.nonzero(s)
            gw.append((gx.max() - gx.min() + 1) / ss); gh.append((gy.max() - gy.min() + 1) / ss)
            sw.append((sx.max() - sx.min() + 1) / ss); sh.append((sy.max() - sy.min() + 1) / ss)
        rw.append(float(np.mean(sw)) / float(np.mean(gw)))
        rh.append(float(np.mean(sh)) / float(np.mean(gh)))
    return rw, rh


# 과녁 — ref 실측(1.176 / 1.231). 여유 ±0.075 = 실루엣 한 변에 화소 **1.3개**(2.55 ÷ 금색 34 ÷ 2).
# ⚑⚑ **932 6회차 — 이 두 상수는 «옛 정수 걸음» 의 지문이다(`--int` 전용으로 남겼다).**
#   머리말이 «ref 가 문턱 네 단에서 소수 셋째 자리까지 안 움직인다(1.176/1.231)» 를 이 과녁의 근거로 들었는데,
#   **그 부동(不動)이 곧 격자였다** — 부분 화소로 재면 ref 는 단마다 움직인다:
#     가로 1.136 → 1.169 → 1.199 → 1.228 · 세로 1.211 → 1.254 → 1.293 → 1.348 (blk 40·55·70·85).
#   ⇒ 손 상수를 붙들지 말고 **같은 단의 ref 를 그 자리에서 과녁으로 쓴다**(자동 파생 · 손 상수 0).
#   자가 이미 «같은 단의 ref» 를 찍고 있었으므로 새로 재는 것도 없다. `--int` 면 옛 상수 과녁으로 판정한다.
TARGET_W, TARGET_H, TOL = 1.176, 1.231, 0.075

# ⚠ **판정은 엄한 두 단(40·55)에서만 한다.** 느슨한 두 단(70·85)은 «관측» 으로만 찍는다 —
#   우리 렌더는 crisp 라 링 바깥의 안티에일리어싱 테두리가 문턱이 풀리는 순간 통째로 들어오는데
#   (실측 +0.02~0.06), ref 는 축소본이라 그 테두리가 이미 어두운 판에 섞여 있어 **안 들어온다**
#   (ref 가로 비는 네 단에서 1.176 으로 안 움직인다). 같은 문턱이 두 그림에서 다른 것을 세는 자리다.
#   ⇒ 그 단까지 과녁에 넣으면 «우리 쪽에만 있는 편향» 을 수리로 갚게 되고, 편향폭(0.06)이 여유(0.075)에
#   맞먹어 **그 순간 이 자가 플레이키해진다**(344·902·903·906 계열). 브리핑 §2-2 와 같은 처분이다.
GATE_STEPS = [40, 55]


def gate(cap, stars):
    rw, rh = sil_ratio(cap, stars, int(round(PAD_REF * K)), BLK_STEPS_CAP)
    ref_w, ref_h = sil_ratio(REF, REF_STARS, PAD_REF, BLK_STEPS_REF)
    ok = True
    if INT_STEP:
        print('== 과녁 판정 «실루엣 ÷ 금색» (옛 손 상수 %0.3f / %0.3f · 여유 ±%0.3f · 정수 걸음) =='
              % (TARGET_W, TARGET_H, TOL))
    else:
        print('== 과녁 판정 «실루엣 ÷ 금색» (과녁 = **같은 단의 ref** · 여유 ±%0.3f) ==' % TOL)
    for bt, w, h, rw_, rh_ in zip(BLK_STEPS_CAP, rw, rh, ref_w, ref_h):
        judged = bt in GATE_STEPS
        tw, th = (TARGET_W, TARGET_H) if INT_STEP else (rw_, rh_)
        gw = abs(w - tw) <= TOL
        gh = abs(h - th) <= TOL
        if judged:
            ok = ok and gw and gh
            mark_w, mark_h = ('ok' if gw else 'FAIL'), ('ok' if gh else 'FAIL')
        else:
            mark_w = mark_h = '관측'
        print('  blk%3d : 가로 %5.3f %-4s   세로 %5.3f %-4s   (같은 단의 ref %5.3f / %5.3f)'
              % (bt, w, mark_w, h, mark_h, rw_, rh_))
    print('SCAN885E %s  (판정 단 %s · 나머지는 관측)'
          % ('PASS' if ok else 'FAIL', '·'.join(str(s) for s in GATE_STEPS)))
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cap', required=True)
    ap.add_argument('--dump', action='store_true')
    ap.add_argument('--gate', action='store_true')
    ap.add_argument('--int', action='store_true',
                    help='옛 정수 걸음(SS=1) — 되돌림 시험 (932 6회차)')
    args = ap.parse_args()

    # ⚑ 932 6회차 곁다리 — 캡처는 **커밋 금지 자산**이라 없는 것이 정상 상태다.
    #   없으면 추적 스택 + 코드 1(= «FAIL» 로 읽힌다)이 아니라 **코드 3(자가 못 쟀다)** 으로 곱게 끝낸다
    #   (939 사전 · `scan667b --ref-only` 와 같은 처분). 이 한 줄이 게이트가 SKIP 을 SKIP 으로 읽게 한다.
    if not os.path.exists(args.cap):
        fail('!! 캡처가 없다 — %s' % args.cap,
             'node tools/cap151.js %s 로 찍고 다시 돌려라(캡처는 커밋 금지 자산이다)' % args.cap)

    if args.gate:
        a = np.array(Image.open(args.cap).convert('RGB'))
        stars = find_cap_stars(a)
        if len(stars) < 3:
            fail('!! ★ 를 %d 개밖에 못 찾았다(창 자동 탐색 실패) — %s' % (len(stars), args.cap),
                 '10 이용권 카드가 열린 캡처인지 보고 다시 찍어라(`node tools/probe885.js`)')
        sys.exit(0 if gate(args.cap, [(s[0], s[1], s[2], s[3]) for s in stars]) else 1)

    ref_rows = run(REF, REF_STARS, PAD_REF, GOLD_STEPS, BLK_STEPS_REF, RMAX_REF,
                   'ref  %s' % REF, args.dump)

    a = np.array(Image.open(args.cap).convert('RGB'))
    stars = find_cap_stars(a)
    if len(stars) < 3:
        fail('!! 우리 캡처에서 ★ 를 %d 개밖에 못 찾았다 — 창 자동 탐색 실패(%s)' % (len(stars), args.cap),
             '10 이용권 카드가 열린 캡처인지 보고 다시 찍어라(`node tools/probe885.js`)')
    cap_rows = run(args.cap, [(s[0], s[1], s[2], s[3]) for s in stars],
                   int(round(PAD_REF * K)), GOLD_STEPS, BLK_STEPS_CAP, RMAX_REF * K,
                   'cap  %s' % args.cap, args.dump)

    print()
    print('== 비교 (ref 는 ×K=%.4f 로 우리 px 환산) ==' % K)
    for (gt, bt, rm, rp95, _, _), (_, _, cm, cp95, _, _) in zip(ref_rows, cap_rows):
        if rm is None or cm is None:
            print('  gold%3d blk%3d :  —' % (gt, bt)); continue
        rmk, rpk = rm * K, rp95 * K
        print('  gold%3d blk%3d :  중앙값 ref %5.2f ↔ 우리 %5.2f  (Δ %+6.1f%%)'
              '   |  p95 ref %5.2f ↔ 우리 %5.2f  (Δ %+6.1f%%)'
              % (gt, bt, rmk, cm, (cm - rmk) / rmk * 100, rpk, cp95, (cp95 - rpk) / rpk * 100))


if __name__ == '__main__':
    main()
