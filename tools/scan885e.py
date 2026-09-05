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
   ≈0.5px 편향을 **구조적으로** 안 탄다. 실제로 문턱 사다리 네 단에서 ref 가 소수 셋째 자리까지
   안 움직인다(1.176 / 1.231). 거리장 분위(p50·p95)는 ×K 를 거치므로 **부호를 읽는 데만** 쓰고
   과녁으로는 쓰지 마라.

실행:
    python3 tools/scan885e.py --cap <우리 캡처.png>
    python3 tools/scan885e.py --cap <캡처> --dump      # 창·마스크 화소 수까지
    python3 tools/scan885e.py --cap <캡처> --gate      # 비 과녁 판정 (종료 코드 0/1)

종료 코드(939 사전 — `tools/pydep937.py`): 0 통과 · 1 FAIL · **2 = 환경에 없음(부트스트랩만)** ·
**3 = 이 자가 못 쟀다**(★ 창 자동 탐색 실패). ⚠ 옛 판은 3 자리에도 2 를 썼다 — 그러면 이 자를
`py()` 로 부른 노드가 «측정이 안 됐다» 를 **«환경에 없음»** 으로 읽어 스윕이 «없는 자» 로 지나간다.

되돌림 시험은 이 자가 겸한다 — 수리 전 판(6회차 이전 `-webkit-text-stroke:6px`, 마이터)에 `--gate` 를
걸면 **빨갛다**(실측 1.529~1.647 / 1.515~1.606). 수리 후 판은 1.235 / 1.242 로 초록이다.
"""
import argparse
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


def gold_mask(a, t):
    R, G, B = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (np.minimum(R, G) - B >= t) & (R > 150) & (G > 110)


def black_mask(a, t):
    return a.astype(int).max(axis=2) <= t


def ring_thickness(win, gt, bt, rmax):
    """창 하나에서 «금색에 붙은 검정 띠» 의 두께를 거리장으로 낸다.

    반환 (T_med, T_p95, ring_px, gold_px) — 화소 단위. 못 재면 None.
    """
    g = gold_mask(win, gt)
    if g.sum() < 12:
        return None
    b = black_mask(win, bt)
    # 금색까지의 거리장. 금색이 source 이므로 금색 밖에서만 값이 선다.
    d = ndimage.distance_transform_edt(~g)
    cand = b & (d > 0) & (d <= rmax)
    if cand.sum() < 4:
        return None
    # 금색에 «닿은» 연결 성분만 남긴다(판·글자 등 떨어져 있는 검정을 버린다).
    lab, n = ndimage.label(cand | g)
    keep = set(np.unique(lab[g]))
    keep.discard(0)
    ring = cand & np.isin(lab, list(keep))
    if ring.sum() < 4:
        return None
    dv = d[ring]
    return (2.0 * float(np.median(dv)), float(np.percentile(dv, 95)) + 0.5,
            int(ring.sum()), int(g.sum()))


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
    """«실루엣 ÷ 금색» 을 문턱 사다리로 낸다 — (가로 비 목록, 세로 비 목록)."""
    a = np.array(Image.open(img).convert('RGB'))
    rw, rh = [], []
    for bt in bsteps:
        gw, gh, sw, sh = [], [], [], []
        for (x0, x1, y0, y1) in stars:
            win = a[max(0, y0 - pad):y1 + 1 + pad, max(0, x0 - pad):x1 + 1 + pad]
            g = gold_mask(win, 60)
            s = black_mask(win, bt) | g
            gy, gx = np.nonzero(g)
            sy, sx = np.nonzero(s)
            gw.append(gx.max() - gx.min() + 1); gh.append(gy.max() - gy.min() + 1)
            sw.append(sx.max() - sx.min() + 1); sh.append(sy.max() - sy.min() + 1)
        rw.append(float(np.mean(sw)) / float(np.mean(gw)))
        rh.append(float(np.mean(sh)) / float(np.mean(gh)))
    return rw, rh


# 과녁 — ref 실측(1.176 / 1.231). 여유 ±0.075 = 실루엣 한 변에 화소 **1.3개**(2.55 ÷ 금색 34 ÷ 2).
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
    print('== 과녁 판정 «실루엣 ÷ 금색» (ref %0.3f / %0.3f · 여유 ±%0.3f) ==' % (TARGET_W, TARGET_H, TOL))
    for bt, w, h, rw_, rh_ in zip(BLK_STEPS_CAP, rw, rh, ref_w, ref_h):
        judged = bt in GATE_STEPS
        gw = abs(w - TARGET_W) <= TOL
        gh = abs(h - TARGET_H) <= TOL
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
    args = ap.parse_args()

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
