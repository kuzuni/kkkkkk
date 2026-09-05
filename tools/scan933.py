#!/usr/bin/env python3
"""작업 933 — 배지 «2000% / 가치» 노랑 **획(stem) 두께**와 **잉크 면적**을 ref 와 우리에게
같은 자로 묻는다.

왜 새 축인가 — `scan895.py` 가 내는 «두께» 는 **줄 전체의 u 스팬**(글자 높이)이고,
933 이 묻는 것은 그 안에서 **획 하나가 얼마나 굵은가**(그리고 그 합인 면적)다.
895 1회차 채점 2인이 «AABB 는 ±3% 로 맞는데 잉크가 −17~27%» 라고 같은 방향으로 냈고,
크기(폰트 크기·배율)는 이미 닫힌 자리라(833 [1-g]·[1-h]) 남는 축이 이것뿐이다.

**원리 — 문턱 하나(초록 채널 126)의 «교차점»만 쓴다.**
  노랑 #FFFC7E 는 G=252 · 검정 획은 G=0 · 분홍 판 #F43171 은 G=49 라
  **G=126 한 문턱이 노랑만 가른다**(895 2회차가 검정 획에 쓴 것과 같은 꼴).
  ⚠⚠ **정수로 세면 안 된다(932 교훈).** 화소를 한 칸씩 세면 값이 언제나 정수가 되고,
  ref 는 우리보다 K=2.0628 배 작아 그 바닥깎기가 **우리 px 로 2.06 씩** 손해다 —
  895 1회차가 그래서 획을 «맞췄다» 고 읽고 과교정했다. 그래서 여기서는
  ⓐ 획 두께 = 가로 스캔 줄에서 G 가 126 을 **오르내리는 교차점**을 선형 보간으로 찾은 런의 길이
  ⓑ 면적 = **부분 화소 커버리지** α = clip((G−126)/(252−126)) 의 합
  둘 다 해상도에 안 걸린다.

⚠ 두 줄은 +15° 로 기울어 있다. 가로 런은 세로 획을 `1/cosθ` 로 길게 읽지만 ref 와 우리가
   **같은 각**이라(각은 입력이 아니라 `scan895.best_theta` 의 결과다) 비교는 성립한다.
   그래도 절대값을 적을 때는 `×cosθ` 로 되돌린 값을 같이 낸다.

⚠ 런 길이는 **p25**(아래 사분위)를 대표값으로 쓴다 — 사선(«%» 의 빗금·«2» 의 어깨)이 가로로
   길게 읽히므로 평균·중앙값은 «획이 아니라 기울기» 를 잰다. 895 1회차 채점의 GI 와 같은 축이다.

실행:
    python3 tools/scan933.py --cap scratch/933-r1.png --geo scratch/geo933.json
    python3 tools/scan933.py --cap … --geo … --json      (게이트용 한 줄)
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

from scan895 import K, REF, REF_WIN, best_theta, yel_mask

G_MID = 126.0      # 초록 채널 문턱 — 노랑(252) ↔ 검정(0)·분홍(49)
G_HI = 252.0       # 노랑의 초록 값(커버리지 정규화)
RUN_MIN = 1.0      # 이보다 짧은 런은 잉크가 아니라 톱니다(우리 px 기준으로 환산해 건다)
PCTL = 25          # 런 길이 대표값(사분위)


def runs_row(g, y, x0, x1):
    """한 가로 줄에서 G>G_MID 인 구간의 (시작, 끝) 을 **부분 화소**로 돌려준다."""
    out = []
    prev = g[y, x0]
    start = None
    for x in range(x0 + 1, x1):
        cur = g[y, x]
        if prev <= G_MID < cur:                       # 올라감 = 잉크 시작
            start = x - 1 + (G_MID - prev) / max(cur - prev, 1e-6)
        elif start is not None and prev > G_MID >= cur:  # 내려감 = 잉크 끝
            end = x - 1 + (prev - G_MID) / max(prev - cur, 1e-6)
            out.append((start, end))
            start = None
        prev = cur
    return out


def measure(a, win, scale, tag, quiet=False):
    """한 창(카드 하나)의 두 줄에 대해 획 두께·면적·커버리지를 낸다."""
    x0, y0, y1 = win
    sub = a[y0:y1, x0:]
    ym = yel_mask(sub, 90)
    bt = best_theta(np.argwhere(ym))
    if bt is None:
        return None
    deg, cut = bt
    th = np.radians(deg)
    g = sub[..., 1].astype(float)
    H, W = g.shape

    # α = 부분 화소 커버리지(문턱 위쪽만 선형)
    alpha = np.clip((g - G_MID) / (G_HI - G_MID), 0.0, 1.0)
    yy, xx = np.mgrid[0:H, 0:W]
    u = -xx * np.sin(th) + yy * np.cos(th)

    # ⚠⚠ **G 문턱만으로는 흰색도 «노랑» 이다**(G=255). 창 안에는 카드의 흰 글자가 같이 들어오므로
    #    먼저 «노랑 색상» 마스크(scan895 와 같은 자)의 상자로 창을 줄이고, 그 안에서만 G 를 쓴다.
    #    상자 안은 노랑·검정 획·분홍 판뿐이라 그 셋을 G=126 한 문턱이 정확히 가른다.
    pts = np.argwhere(ym)
    up = -pts[:, 1] * np.sin(th) + pts[:, 0] * np.cos(th)
    bags, res = ([], []), []
    boxes = []
    for i in (0, 1):
        sel = pts[(up <= cut) if i == 0 else (up > cut)]
        if len(sel) < 40:
            return None
        boxes.append((max(int(sel[:, 0].min()) - 3, 0), min(int(sel[:, 0].max()) + 4, H),
                      max(int(sel[:, 1].min()) - 3, 0), min(int(sel[:, 1].max()) + 4, W)))

    for i, (ylo, yhi, xlo, xhi) in enumerate(boxes):
        for y in range(ylo, yhi):
            for s, e in runs_row(g, y, xlo, xhi):
                if (e - s) * scale < RUN_MIN:
                    continue
                uc = -((s + e) / 2) * np.sin(th) + y * np.cos(th)
                if (uc <= cut) != (i == 0):
                    continue
                bags[i].append(e - s)

    for i, (ylo, yhi, xlo, xhi) in enumerate(boxes):
        m = np.zeros_like(alpha, dtype=bool)
        m[ylo:yhi, xlo:xhi] = True
        m &= (u <= cut) if i == 0 else (u > cut)
        area = float((alpha * m).sum()) * scale * scale
        cov = area / max(float(m.sum()) * scale * scale, 1e-6)
        # ⚑ 둘째 획 추정기 — **표본 밀도에 안 걸린다.** 가늘고 긴 띠는 둘레 P ≈ 2×길이 이므로
        #    획 = 2·면적 ÷ 둘레 다. 둘레는 α 의 전변동 Σ|∇α| 로 부분 화소로 낸다.
        #    p25 런(위)은 «어느 화소 줄을 몇 개 얻었나» 에 흔들리는데 이 값은 안 흔들려서,
        #    둘이 같은 수를 내면 그 수는 자의 성질이 아니라 그림의 성질이다.
        am = np.where(m, alpha, 0.0)
        gy, gx = np.gradient(am)
        per = float(np.hypot(gy, gx).sum()) * scale
        r = np.array(bags[i], dtype=float)
        if len(r) < 10:
            return None
        res.append({
            'per': per,
            'ap': 2 * area / max(per, 1e-6),
            'run': float(np.percentile(r, PCTL)) * scale,
            'run_med': float(np.median(r)) * scale,
            'stem': float(np.percentile(r, PCTL)) * scale * float(np.cos(th)),
            'area': area,
            'cov': cov,
            'n': len(r),
        })
    if not quiet:
        print('  %-22s | 각 %+5.1f° | 획 p25 위 %5.2f 아래 %5.2f | 획 2A/P 위 %5.2f 아래 %5.2f '
              '| 면적 위 %7.0f 아래 %6.0f | 둘레 위 %6.0f 아래 %5.0f'
              % (tag, deg, res[0]['run'], res[1]['run'], res[0]['ap'], res[1]['ap'],
                 res[0]['area'], res[1]['area'], res[0]['per'], res[1]['per']))
    return {'deg': deg, 'up': res[0], 'lo': res[1]}


def our_windows(geo):
    for c in geo['cards']:
        b = c.get('bdg')
        if b is None:
            continue
        yield c['id'], (int(b['x']) - 20, int(b['y']) - 20, int(b['y'] + b['h']) + 20)


def main():
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'scratch/933-r1.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo933.json'
    as_json = '--json' in sys.argv

    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
    g = json.load(open(geo))

    if not as_json:
        print('=== 배지 노랑 «획» 두께 · 잉크 면적 (우리 px 환산 · ref×K=%.4f) ===' % K)
        print('  (획 = G>126 런의 p%d · 면적 = 부분 화소 커버리지 합 · 둘 다 정수 걸음 아님)' % PCTL)

    rr = [m for i, w in enumerate(REF_WIN)
          for m in [measure(ref, w, K, 'ref %s' % ('위 카드' if i == 0 else '아래 카드'), as_json)] if m]
    oo = []
    for cid, w in our_windows(ours if False else g):
        if yel_mask(ours[w[1]:w[2], w[0]:], 90).sum() < 200:
            continue
        m = measure(ours, w, 1.0, '우리 %s' % cid, as_json)
        if m:
            oo.append(m)
    if not rr or not oo:
        print('측정 실패 — 창에서 잉크를 못 찾았다', file=sys.stderr)
        sys.exit(3)

    out = {}
    for side in ('up', 'lo'):
        for k in ('run', 'stem', 'ap', 'per', 'area', 'cov'):
            out['ref_%s_%s' % (side, k)] = round(float(np.median([m[side][k] for m in rr])), 3)
            out['our_%s_%s' % (side, k)] = round(float(np.median([m[side][k] for m in oo])), 3)
    out['cards'] = len(oo)
    if as_json:
        print('JSON ' + json.dumps(out))
        return
    print()
    print('  %-14s | %10s | %10s | %s' % ('축', 'ref', '우리', 'Δ'))
    for side, sname in (('up', '윗줄'), ('lo', '아랫줄')):
        for k, kname in (('run', '획 p25'), ('stem', '획(×cosθ)'), ('ap', '획 2A/P'),
                         ('per', '잉크 둘레'), ('area', '잉크 면적'), ('cov', '커버리지')):
            r, o = out['ref_%s_%s' % (side, k)], out['our_%s_%s' % (side, k)]
            print('  %-14s | %10.2f | %10.2f | %+7.1f%%' % (kname + ' ' + sname, r, o, (o / r - 1) * 100))


if __name__ == '__main__':
    main()
