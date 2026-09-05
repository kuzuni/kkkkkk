#!/usr/bin/env python3
"""작업 895 — 배지 «2000% / 가치» 두 줄의 **잉크 두께**(그리고 그 짝인 «길이»·«검정 획»)를
ref 와 우리에게 **같은 자**로 묻는다.

왜 새 자인가 — 885 4회차가 각도·간격을 닫으면서(`tools/scan885c.py`) 남은 몫이
«우리 글자가 ref 보다 **두껍고 좁다**» 하나로 모였는데, 그 값(윗줄 +10% · 아랫줄 +19% ·
폭 −3.1%)은 회차 기록에 **손으로 적힌 수**였고 재현할 자가 저장소에 없었다.
338 규칙 — 처방 전에 자부터 세운다.

**원리 — 두께는 «베이스라인의 수직» 으로만 잰다.**
  두 줄은 기울어 있으므로 화면 y 로 재면 회전이 섞인다(W·sinθ). 그래서
  ⓐ `scan885c` 와 **같은 각도 추정기**로 θ 를 먼저 얻고(θ 는 입력이 아니라 결과다)
  ⓑ 그 θ 의 수직축 u 로 각 줄의 잉크를 투영해 **두께 = u 의 span**,
     줄 방향 v 로 투영해 **길이 = v 의 span** 을 낸다.
  ⇒ 두께와 길이가 **같은 좌표계**에서 나오므로 «두껍고 좁다» 를 한 표에서 읽을 수 있다.

⚠ **꼬리를 자르고 잰다** — 글리프 한 점(«%» 의 사선 끝, 쉼표)이 span 을 통째로 늘린다.
   그래서 두께는 백분위 **1~99**(`--pct`) span 을 기본으로 내고, 전 span 도 같이 적는다.

⚠ **아랫줄은 문구가 다르다**(ref «가치» ↔ 우리도 «가치» 지만 윗줄 문구 수가 형마다 다르다).
   그래서 **길이**는 형끼리만 견주고, **두께**는 문구와 무관한 축이라 그대로 견준다.

**검정 획** — 잉크 위·아래로 u 를 따라 나가며 «검정이 이어지는 길이» 를 센다.
   `-webkit-text-stroke` 는 획의 절반이 글리프 안쪽이라 **밖으로 나온 절반만** 보인다
   (그래서 CSS 8px 이면 자에는 4px 안팎으로 읽힌다 — ref 와 우리를 같은 자로 견주면 된다).

실행:
    python3 tools/scan895.py --cap scratch/151-r52.png --geo scratch/geo52.json
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628  # ref px → 우리 px

# ref 배지 창 (x0, y0, y1) — scan885c.py 와 같은 창을 쓴다(자끼리 어긋나지 않게).
REF_WIN = [(350, 0, 160), (350, 300, 420)]

YEL_STEPS = [30, 50, 70, 90, 110]
BLACK_T = 90          # 검정 판정(세 채널 전부 이 값 미만)
PCT = 1.0             # 두께 백분위 꼬리(양끝)


def yel_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(R, G) - B >= t) & (R > 140) & (G > 110)


def blk_mask(a):
    return (a[..., 0] < BLACK_T) & (a[..., 1] < BLACK_T) & (a[..., 2] < BLACK_T)


GAP = {}   # 마지막 추정의 «빈 띠» 두께 — run() 이 읽어 같이 적는다


def best_theta(pts, deg_lo=-30.0, deg_hi=30.0, step=0.25, share=0.12):
    """두 줄이 «가장 깨끗하게 갈리는» θ(도) 와 그 분할 문턱을 돌려준다.

    ⚠ **정규화 Otsu η 로는 못 고른다** — 895 1회차에 아랫줄을 줄이자(빈 띠가 넓어지자)
    η 최댓값이 **−24.5°** 로 달아나 두께가 +158% 로 읽혔다. η 는 «두 덩이의 거리 ÷ 퍼짐» 이라
    한 덩이를 아무 데서나 갈라도 커질 수 있고, 덩이 크기가 크게 갈리면 그 쪽이 이긴다.
    ⇒ 목적함수를 **«잉크가 한 점도 없는 빈 띠의 두께»** 로 바꿨다. 두 줄이 실제로 갈리는 각에서만
    빈 띠가 생기므로 가짜 분할이 원리적으로 못 이긴다(η 는 동점일 때 깨는 데만 쓴다).
    θ 는 여전히 **결과**다 — CSS 값도 채점자 값도 안 쓴다.
    """
    if len(pts) < 40:
        return None
    y = pts[:, 0].astype(float)
    x = pts[:, 1].astype(float)
    best = None
    d = deg_lo
    while d <= deg_hi + 1e-9:
        th = np.radians(d)
        u = -x * np.sin(th) + y * np.cos(th)
        lo, hi = u.min(), u.max()
        if hi - lo < 4:
            d += step
            continue
        bins = np.arange(np.floor(lo), np.ceil(hi) + 1.0, 1.0)
        cnt, edges = np.histogram(u, bins=bins)
        # 빈 칸의 연속 구간 중, 양쪽에 충분한 잉크가 남는 가장 두꺼운 것
        i = 0
        while i < len(cnt):
            if cnt[i] != 0:
                i += 1
                continue
            j = i
            while j < len(cnt) and cnt[j] == 0:
                j += 1
            n1 = cnt[:i].sum()
            n2 = cnt[j:].sum()
            if n1 >= share * len(u) and n2 >= share * len(u):
                gap = float(edges[j] - edges[i])
                cut = float((edges[i] + edges[j]) / 2)
                m = u <= cut
                tot = u.var()
                eta = (m.mean() * (~m).mean() * (u[m].mean() - u[~m].mean()) ** 2 / tot) if tot > 0 else 0.0
                key = (round(gap, 3), eta)
                if best is None or key > best[0]:
                    best = (key, d, cut)
            i = j
        d += step
    if best is None:
        return None
    GAP['g'] = best[0][0]
    return best[1], best[2]


def line_metrics(a, ymask, bmask, deg, cut):
    """θ 좌표계에서 두 줄을 갈라 각 줄의 두께·길이·검정 획을 낸다."""
    pts = np.argwhere(ymask)
    if len(pts) < 40:
        return None
    th = np.radians(deg)
    y = pts[:, 0].astype(float)
    x = pts[:, 1].astype(float)
    u = -x * np.sin(th) + y * np.cos(th)          # 베이스라인의 수직
    v = x * np.cos(th) + y * np.sin(th)           # 베이스라인 방향
    out = []
    for sel in (u <= cut, u > cut):
        if sel.sum() < 20:
            out.append(None)
            continue
        uu, vv = u[sel], v[sel]
        thk = np.percentile(uu, 100 - PCT) - np.percentile(uu, PCT)
        thk_full = uu.max() - uu.min()
        length = np.percentile(vv, 100 - PCT) - np.percentile(vv, PCT)
        out.append({
            'thk': float(thk), 'thk_full': float(thk_full), 'length': float(length),
            'n': int(sel.sum()), 'ucen': float(uu.mean()),
            'stroke': stroke_thk(a, bmask, ymask, th, uu, vv, pts[sel]),
        })
    return out


def _bilin(a, y, x):
    """빨강 채널 겹선형 표본 — 정수 격자 밖이면 nan."""
    H, W = a.shape[:2]
    if not (0 <= y <= H - 1.001 and 0 <= x <= W - 1.001):
        return float('nan')
    y0, x0 = int(y), int(x)
    fy, fx = y - y0, x - x0
    r = a[..., 0]
    return float((r[y0, x0] * (1 - fx) + r[y0, x0 + 1] * fx) * (1 - fy)
                 + (r[y0 + 1, x0] * (1 - fx) + r[y0 + 1, x0 + 1] * fx) * fy)


R_MID = 125.0     # 빨강 중간값 — 노랑(255)·분홍(244) ↔ 검정(0) 을 가르는 한 문턱
STEP = 0.1        # 걸음 (px)


def stroke_thk(a, bmask, ymask, th, uu, vv, sel_pts):
    """잉크 밖으로 나온 «검정 획» 길이 — u 를 따라 **부분 화소**로 잰다.

    ⚠⚠ **1회차의 자는 여기서 틀렸다(2회차 수리).** 옛 판은 «검정 화소를 한 칸씩 세는» 정수
    걸음이라 **값이 언제나 정수**였고, ref 는 우리보다 K=2.0628 배 작아 그 바닥깎기가
    **우리 px 로 2.06 씩** 손해였다. 실제로 1회차가 «ref» 라고 적은 2.063 · 4.126 은
    정수 **1 · 2 에 K 를 곱한 값** 그대로다(비평 GI 가 숫자만 보고 짚었고, GH 는
    «ref 의 얇은 안티에일리어스를 깎아 먹는다» 로 같은 곳을 짚었다). ⇒ 그 바닥값 위에서
    «아랫줄 획 +45%» 가 나왔고 **7 → 5px 과교정**을 낳았다.

    ⇒ 이제 **빨강 채널 한 문턱의 교차점**을 선형 보간으로 찾는다 — 노랑(r 255)·분홍(r 244) 은
    둘 다 높고 검정(r 0)만 낮으므로, 잉크에서 밖으로 걸으며
      ① r 이 R_MID 아래로 내려가는 자리 = 노랑 → 검정 경계
      ② 그 뒤 r 이 R_MID 위로 올라가는 자리 = 검정 → 분홍 경계
    두 교차점 사이가 «밖으로 나온 검정» 이다. 해상도에 안 걸리므로 ref 와 우리가 같은 자다.
    """
    cu, su = np.cos(th), np.sin(th)
    tops, bots = [], []
    vb = np.round(vv).astype(int)
    for b in np.unique(vb):
        m = vb == b
        if m.sum() < 3:
            continue
        for sgn, bag in ((-1, tops), (+1, bots)):
            i = np.argmin(uu[m]) if sgn < 0 else np.argmax(uu[m])
            py, px = sel_pts[m][i]
            t, prev, t_in, t_out = 0.0, None, None, None
            while t < 12.0:
                t += STEP
                r = _bilin(a, py + sgn * t * cu, px - sgn * t * su)
                if r != r:
                    break
                if prev is not None:
                    if t_in is None and prev >= R_MID > r:
                        t_in = t - STEP * (R_MID - r) / max(prev - r, 1e-6)
                    elif t_in is not None and prev < R_MID <= r:
                        t_out = t - STEP * (r - R_MID) / max(r - prev, 1e-6)
                        break
                prev = r
            if t_in is not None and t_out is not None:
                bag.append(t_out - t_in)
    return (float(np.median(tops)) if tops else float('nan'),
            float(np.median(bots)) if bots else float('nan'))


def aabb(ymask):
    pts = np.argwhere(ymask)
    if len(pts) < 40:
        return None
    return (float(np.ptp(pts[:, 1]) + 1), float(np.ptp(pts[:, 0]) + 1))


def run(img, win, scale, tag):
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    bm = blk_mask(sub)
    rows = []
    for t in YEL_STEPS:
        ym = yel_mask(sub, t)
        bt = best_theta(np.argwhere(ym))
        if bt is None:
            continue
        deg, cut = bt
        gap = GAP.get('g', float('nan'))
        lm = line_metrics(sub, ym, bm, deg, cut)
        if lm is None or lm[0] is None or lm[1] is None:
            continue
        box = aabb(ym)
        rows.append((t, deg, lm, box, gap))
    if not rows:
        print('  %-22s | —' % tag)
        return None
    med = {}
    for k, f in (('deg', lambda r: r[1]),
                 ('t_up', lambda r: r[2][0]['thk'] * scale),
                 ('t_lo', lambda r: r[2][1]['thk'] * scale),
                 ('l_up', lambda r: r[2][0]['length'] * scale),
                 ('l_lo', lambda r: r[2][1]['length'] * scale),
                 ('s_up', lambda r: np.nanmean(r[2][0]['stroke']) * scale),
                 ('s_lo', lambda r: np.nanmean(r[2][1]['stroke']) * scale),
                 ('bw', lambda r: r[3][0] * scale),
                 ('bh', lambda r: r[3][1] * scale),
                 ('gap', lambda r: r[4] * scale)):
        med[k] = float(np.median([f(r) for r in rows]))
    print('  %-22s | 각 %+5.1f° | 두께 위 %5.1f 아래 %5.1f | 길이 위 %6.1f 아래 %6.1f '
          '| 검정획 위 %4.1f 아래 %4.1f | 빈 띠 %4.1f | 노랑AABB %6.1f×%5.1f  (%d단)'
          % (tag, med['deg'], med['t_up'], med['t_lo'], med['l_up'], med['l_lo'],
             med['s_up'], med['s_lo'], med['gap'], med['bw'], med['bh'], len(rows)))
    return med


def main():
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'scratch/151-r52.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo52.json'

    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
    g = json.load(open(geo))

    print('=== 배지 두 줄 — 잉크 «두께»(베이스라인 수직) · 길이 · 검정 획 (우리 px 환산 · ref×K=%.4f) ===' % K)
    print('  (두께·길이는 백분위 %g~%g span · 검정획은 잉크 밖으로 나온 몫)' % (PCT, 100 - PCT))
    rr = []
    for i, w in enumerate(REF_WIN):
        m = run(ref, w, K, 'ref %s' % ('위 카드(배너형)' if i == 0 else '아래 카드(불릿형)'))
        if m:
            rr.append(m)

    oo = []
    for c in g['cards']:
        b = c.get('bdg')
        if b is None:
            continue
        x0 = int(b['x']) - 20
        y0, y1 = int(b['y']) - 20, int(b['y'] + b['h']) + 20
        if yel_mask(ours[y0:y1, x0:], 90).sum() < 200:
            continue
        m = run(ours, (x0, y0, y1), 1.0, '우리 %s' % c['id'])
        if m:
            oo.append(m)

    if rr and oo and '--json' in sys.argv:
        out = {}
        for k in ('t_up', 't_lo', 'l_up', 'l_lo', 's_up', 's_lo', 'gap', 'bw', 'bh', 'deg'):
            out['ref_' + k] = round(float(np.median([m[k] for m in rr])), 3)
            out['our_' + k] = round(float(np.median([m[k] for m in oo])), 3)
        out['cards'] = len(oo)
        print('JSON ' + json.dumps(out))
        return

    if rr and oo:
        print()
        print('  %-10s | %-18s | %-18s | %s' % ('축', 'ref', '우리', 'Δ'))
        for k, name in (('t_up', '두께 윗줄'), ('t_lo', '두께 아랫줄'),
                        ('l_up', '길이 윗줄'), ('l_lo', '길이 아랫줄'),
                        ('s_up', '검정획 윗줄'), ('s_lo', '검정획 아랫줄'),
                        ('gap', '두 줄 빈 띠'),
                        ('bw', '노랑 AABB 폭'), ('bh', '노랑 AABB 높이')):
            r = float(np.median([m[k] for m in rr]))
            o = float(np.median([m[k] for m in oo]))
            print('  %-10s | %18.2f | %18.2f | %+7.1f%%' % (name, r, o, (o / r - 1) * 100))


if __name__ == '__main__':
    main()
