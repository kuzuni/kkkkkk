#!/usr/bin/env python3
"""작업 932 ② — 배지 «검정 획» 을 **셋째 자**(질량 적분 ⓑ)로 잰다.

왜 셋째 자인가 — 932 등재문의 ② 짝 관측이다. 같은 자리(배지 **윗줄** 검정 획)를
자 셋이 재는데 **크기가 갈렸다**:

  · GH(비평, 서브픽셀 옆면)      ref 6.54 ↔ 우리 6.58  = **맞다**
  · GI(비평, 서브픽셀 g=126 교차) ref 4.7~5.2 ↔ 우리 4.0~4.2 = **−15%**
  · `scan895.stroke_thk`(2회차)   ref 5.393 ↔ 우리 4.299 = **−20.3%**

932 2회차(§ⓕ-2)가 그 갈림의 뿌리를 짚었다 — **셋이 전부 «교차점» 계열**이다.
윗줄 획의 ref 실측(4.7~6.5 우리 px)이 하필 교차점 자(ⓐ)가 흔들리기 시작하는 구간이라
셋이 서로를 못 가린다. ⇒ 셋째 자는 계열이 달라야 한다: **질량 적분(ⓑ)**.

**원리** — `scan667c.dark_mass` 와 같다. 두께 = Σ(1 − r/고원). 번짐 화소가 자기 비율만큼만
세어지므로 «어디서 반이 되는가» 를 안 묻는다 ⇒ **번짐이 좌우로 비대칭이어도 값이 안 밀린다**
(교차점 자는 밀린다 — 942 가 그 비대칭을 별도 번호로 쫓고 있다).

**이 자의 설계 하나** — ⓐ 와 ⓑ 를 **같은 광선·같은 표본** 위에서 낸다.
그래야 갈림이 «창이 달라서» 가 아니라 **«추정기가 달라서»** 임이 못박힌다.
광선은 `scan895.stroke_thk` 의 것을 그대로 쓰되(잉크 바깥쪽 끝점 · v 칸마다 하나),
안쪽 고원을 보려고 **t 를 잉크 안으로 2px 더 판다**(질량 적분은 양옆 고원이 있어야 선다).

⚠ **`verify833` [1-k] 의 «윗줄 8 불변» 선언은 건드리지 않는다.** 이 자는 값만 낸다
(932 2회차 ⓕ-2 의 지시 그대로 — 선언을 옮기는 것은 이 회차의 몫이 아니다).

실행:
    python3 tools/scan932.py --cap scratch/151-r52.png --geo scratch/geo52.json
    python3 tools/scan932.py ... --json
"""
import json
import sys

from pydep937 import np
from pydep937 import Image
from pydep937 import fail

import scan895 as S

K = S.K
STEP = 0.05          # 걸음(px) — 적분이라 잘게 뜬다
BACK = 2.0           # 잉크 «안» 으로 더 파는 길이(고원을 보려고)
OUT = 12.0           # 잉크 «밖» 으로 걷는 길이
SHOULDER = 6.0       # 어깨 적분 상한(px) — dark_mass 와 같은 규약
PLAT = 0.98          # 고원 판정(고원의 98% 위면 «고원 안»)


def ray(a, py, px, cu, su, sgn):
    """한 광선의 빨강 프로파일 — t = −BACK … +OUT, 걸음 STEP.

    돌려주는 것은 (t0, prof) 이고 prof[i] 의 t 는 t0 + i*STEP 이다.
    격자 밖으로 나가면 그 자리에서 끊는다(nan 을 섞지 않는다).
    """
    ts, ps = [], []
    t = -BACK
    while t <= OUT + 1e-9:
        r = S._bilin(a, py + sgn * t * cu, px - sgn * t * su)
        if r != r:
            break
        ts.append(t)
        ps.append(r)
        t += STEP
    return (ts, ps) if len(ps) > 20 else (None, None)


def cross_on(ts, ps):
    """ⓐ 교차점 — `scan895.stroke_thk` 와 같은 말(R_MID 두 교차 사이)."""
    a = b = None
    for i in range(1, len(ps)):
        if a is None and ps[i - 1] >= S.R_MID > ps[i]:
            a = ts[i - 1] + STEP * (ps[i - 1] - S.R_MID) / max(ps[i - 1] - ps[i], 1e-6)
        elif a is not None and b is None and ps[i - 1] < S.R_MID <= ps[i]:
            b = ts[i - 1] + STEP * (S.R_MID - ps[i - 1]) / max(ps[i] - ps[i - 1], 1e-6)
            break
    return None if a is None or b is None else b - a


def mass_on(ts, ps):
    """ⓑ 질량 적분 — `scan667c.dark_mass` 를 연속 걸음으로 옮긴 것.

      안쪽 고원 lo(노랑) · 바깥 고원 hi(분홍) 을 **각각** 잡고
      두께 = 어깨(안) + 속 + 어깨(밖) = Σ(1 − r/고원)·STEP.
    ⚠ 고원을 하나로 뭉개면 안 된다 — 노랑 255 과 분홍 244 는 다른 값이고,
      그 차이가 곧 895 2회차 ⓗ 가 «부분 화소는 문턱을 무르게 하는 일이 아니다» 로 적은 함정이다.
    """
    i_in = next((i for i in range(1, len(ps)) if ps[i] < S.R_MID <= ps[i - 1]), None)
    if i_in is None:
        return None
    i_out = next((i for i in range(i_in + 1, len(ps)) if ps[i] >= S.R_MID), None)
    if i_out is None:
        return None
    lo = max(ps[:i_in])
    hi = max(ps[i_out:i_out + int(2.5 / STEP)] or [0])
    if lo < 120 or hi < 120:
        return None                      # 한쪽이 고원이 아니다 = 이 자로는 안 잰다
    mid = (lo + hi) / 2.0

    ml = 0.0
    j = i_in - 1
    while j >= 0 and ps[j] < lo * PLAT and (ts[i_in] - ts[j]) <= SHOULDER:
        ml += max(0.0, 1 - ps[j] / lo) * STEP
        j -= 1
    mr = 0.0
    j = i_out
    while j < len(ps) and ps[j] < hi * PLAT and (ts[j] - ts[i_out]) <= SHOULDER:
        mr += max(0.0, 1 - ps[j] / hi) * STEP
        j += 1
    core = sum(max(0.0, 1 - ps[j] / mid) * STEP for j in range(i_in, i_out))
    return ml + core + mr


def strokes(a, ymask, th, uu, vv, sel_pts):
    """한 줄의 검정 획 — 같은 광선에서 ⓐ·ⓑ 를 같이 낸다.

    돌려주는 것: dict(cross=(위,아래), mass=(위,아래), n=(위,아래))
    """
    cu, su = np.cos(th), np.sin(th)
    bags = {'cross': ([], []), 'mass': ([], [])}
    vb = np.round(vv).astype(int)
    for bnum in np.unique(vb):
        m = vb == bnum
        if m.sum() < 3:
            continue
        for k, (sgn, slot) in enumerate(((-1, 0), (+1, 1))):
            i = np.argmin(uu[m]) if sgn < 0 else np.argmax(uu[m])
            py, px = sel_pts[m][i]
            ts, ps = ray(a, py, px, cu, su, sgn)
            if ts is None:
                continue
            c = cross_on(ts, ps)
            mm = mass_on(ts, ps)
            if c is not None:
                bags['cross'][slot].append(c)
            if mm is not None:
                bags['mass'][slot].append(mm)
    med = lambda z: float(np.median(z)) if z else float('nan')
    return {
        'cross': (med(bags['cross'][0]), med(bags['cross'][1])),
        'mass': (med(bags['mass'][0]), med(bags['mass'][1])),
        'n': (len(bags['mass'][0]), len(bags['mass'][1])),
    }


def run(img, win, scale, tag, verbose=True):
    """한 배지 — 윗줄·아랫줄의 검정 획을 ⓐ·ⓑ 두 자로 낸다(우리 px 환산)."""
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    rows = []
    for t in S.YEL_STEPS:
        ym = S.yel_mask(sub, t)
        bt = S.best_theta(np.argwhere(ym))
        if bt is None:
            continue
        deg, cut = bt
        pts = np.argwhere(ym)
        if len(pts) < 40:
            continue
        th = np.radians(deg)
        yy = pts[:, 0].astype(float)
        xx = pts[:, 1].astype(float)
        u = -xx * np.sin(th) + yy * np.cos(th)
        v = xx * np.cos(th) + yy * np.sin(th)
        line = []
        for sel in (u <= cut, u > cut):
            if sel.sum() < 20:
                line.append(None)
                continue
            line.append(strokes(sub, ym, th, u[sel], v[sel], pts[sel]))
        if line[0] is None or line[1] is None:
            continue
        rows.append(line)
    if not rows:
        if verbose:
            print('  %-24s | —' % tag)
        return None
    out = {}
    for key in ('cross', 'mass'):
        for li, ln in ((0, 'up'), (1, 'lo')):
            vals = [np.nanmean(r[li][key]) * scale for r in rows]
            out['%s_%s' % (key, ln)] = float(np.median(vals))
    out['rays'] = int(np.median([r[0]['n'][0] + r[0]['n'][1] for r in rows]))
    if verbose:
        print('  %-24s | ⓐ교차 위 %5.2f 아래 %5.2f | ⓑ질량 위 %5.2f 아래 %5.2f | 광선 %3d (%d단)'
              % (tag, out['cross_up'], out['cross_lo'], out['mass_up'], out['mass_lo'],
                 out['rays'], len(rows)))
    return out


def main():
    args = sys.argv
    cap = args[args.index('--cap') + 1] if '--cap' in args else 'scratch/151-r52.png'
    geo = args[args.index('--geo') + 1] if '--geo' in args else 'scratch/geo52.json'
    js = '--json' in args
    try:
        ref = np.asarray(Image.open(S.REF).convert('RGB')).astype(int)
        ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
        g = json.load(open(geo))
    except FileNotFoundError as e:
        fail('캡처·기하를 못 읽었다 (%s)' % e.filename,
             'node tools/verify932.js — 이 자는 캡처를 스스로 안 찍는다 (verify895 가 찍는다)')

    if not js:
        print('=== 배지 «검정 획» — 같은 광선 위의 두 자 (ⓐ 교차점 · ⓑ 질량 적분) · 우리 px 환산 (K=%.4f) ===' % K)

    rr = [m for i, w in enumerate(S.REF_WIN)
          for m in [run(ref, w, K, 'ref %s' % ('위 카드' if i == 0 else '아래 카드'), not js)] if m]
    oo = []
    for c in g['cards']:
        b = c.get('bdg')
        if b is None:
            continue
        x0 = int(b['x']) - 20
        y0, y1 = int(b['y']) - 20, int(b['y'] + b['h']) + 20
        if S.yel_mask(ours[y0:y1, x0:], 90).sum() < 200:
            continue
        m = run(ours, (x0, y0, y1), 1.0, '우리 %s' % c['id'], not js)
        if m:
            oo.append(m)
    if not rr or not oo:
        fail('배지를 못 물었다 (ref %d · 우리 %d)' % (len(rr), len(oo)),
             'verify895 가 찍는 캡처(이용권 탭)인지 확인하라')

    out = {}
    for k in ('cross_up', 'cross_lo', 'mass_up', 'mass_lo'):
        out['ref_' + k] = round(float(np.median([m[k] for m in rr])), 3)
        out['our_' + k] = round(float(np.median([m[k] for m in oo])), 3)
        out['d_' + k] = round((out['our_' + k] / out['ref_' + k] - 1) * 100, 2)
    out['cards'] = len(oo)
    if js:
        print('JSON ' + json.dumps(out))
        return
    print()
    print('  %-14s | %8s | %8s | %8s' % ('축', 'ref', '우리', 'Δ'))
    for k, name in (('cross_up', 'ⓐ 교차 윗줄'), ('mass_up', 'ⓑ 질량 윗줄'),
                    ('cross_lo', 'ⓐ 교차 아랫줄'), ('mass_lo', 'ⓑ 질량 아랫줄')):
        print('  %-14s | %8.3f | %8.3f | %+7.1f%%' % (name, out['ref_' + k], out['our_' + k], out['d_' + k]))


if __name__ == '__main__':
    main()
