#!/usr/bin/env python3
"""작업 667 — **10회차 전용 자**: «검정 외곽 두께» 하나만 잰다.

9회차가 마지막 회차에게 넘긴 문장 그대로다:

  > 이번 회차가 남긴 네 지적이 한 뿌리일 수 있다 — ⒝ 글자 폭 · BC [12] 불릿 띠 두께 ·
  > BD [3]·BE [4] 리본 크림 캡/빨강 시작점 · BD [5] 수량 세로. 넷 다 «우리 검정 외곽이
  > ref 보다 두껍다» 로 설명되고, 넷 다 지금 자로는 경계가 문턱에 흔들린다.
  > ⇒ ref 의 «검정 테» 와 «드롭섀도» 를 가르는 자를 먼저 세우고, 그 다음에 넷을 한 번에 보라.

⚑ **가르는 방법은 «문턱을 더 고르는 것» 이 아니라 «자리를 고르는 것» 이다.**
  ref 리본 아래에는 드롭섀도가 깔려 있어 «바탕(39,39,49)이 아닌 첫 화소» 로 재면 검정 테와
  그림자가 **같은 어둠**으로 뭉쳐 총두께가 ref 47~48 ↔ 우리 82~85 로 **거꾸로** 나온다(9회차 ⓒ).
  그런데 그림자는 **바탕 위에만** 깔린다 — 카드 몸통·헤더 밴드·크림 칸처럼 **밝은 host 위**에서는
  검정 테 바깥이 곧바로 밝은 화소다. ⇒ **밝은 것 ↔ 검정 ↔ 밝은 것** 인 자리에서만 재면
  그림자가 물리적으로 낄 자리가 없다.

⚑ **재는 방식은 «문턱 폭» 이 아니라 «검정 질량» 이다.**
  ref 는 AA 가 깔려 있고(가장자리 화소가 105.1 처럼 중간값) 우리 캡처는 경계가 딱 떨어진다.
  문턱으로 폭을 세면 그 차이가 그대로 ±1px 오차가 된다. 그래서 두 밝은 고원 사이에서
  **Σ(1 − L/L_고원)** 을 적분한다 — «완전한 검정 화소 몇 개 분량인가». AA 화소는 자기 비율만큼만
  세어지고, 우리처럼 AA 가 없으면 정수로 떨어진다(검증: 우리 리본 테 = 정확히 6.00).

재는 자리 넷:
    [A] 리본 띠 — 카드 몸통 위를 지나는 열에서 «몸통 ↔ 검정 ↔ 리본 속 ↔ 검정 ↔ 몸통»
    [B] 제목 글자 — 헤더 밴드 위 «밴드 ↔ 검정 ↔ 흰 잉크 ↔ 검정 ↔ 밴드»
    [C] 배너 라벨 — 노란 칸 위 같은 꼴 (배너형 카드만)
    [D] 리본 라벨 — 리본 속 위 같은 꼴
  글자 획은 `-webkit-text-stroke` 가 글리프 윤곽에 **중심**으로 걸리고 fill 이 안쪽 절반을 덮으므로
  이 자가 재는 것은 «획 굵기의 절반»(= 눈에 보이는 검정 띠)이다. ref 도 같은 것을 잰다.

실행:
  python3 tools/scan667c.py                       ref + 우리(기본 캡처 151-r16) 를 한 표로
  python3 tools/scan667c.py --cap docs/review/151-r16 --geo docs/review/151-r16.geo.json
"""
import json
import sys

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                      # ref 카드 폭 474.12 → 우리 978 (측정표 §9)

HDR = {'배너형(파랑)': (58, 134, 212), '불릿형(초록)': (33, 145, 97)}   # 헤더 밴드 #3A86D4 · #219161
GOLD_BAN = (243, 186, 79)       # 노란 배너 오른칸 #F3BA4F
DARK = 45                       # «검정» 판정 (그림자·어두운 채움과 안 겹치는 값 — 아래 PLAT 로 검산)
PLAT = 70                       # «밝은 고원» 최소 밝기


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def near(a, rgb, tol):
    return np.abs(a - np.array(rgb)).sum(2) < tol


def runs_below(prof, thr):
    """prof 에서 thr 미만인 연속 구간 목록 [(s, e)] (양끝 포함)."""
    idx = np.where(prof < thr)[0]
    if not len(idx):
        return []
    out, s, p = [], idx[0], idx[0]
    for v in idx[1:]:
        if v != p + 1:
            out.append((int(s), int(p)))
            s = v
        p = v
    out.append((int(s), int(p)))
    return out


def plateau(prof, i, step, n=4):
    """i 에서 step 방향으로 «밝은 고원» 값 — 밝은 화소 n 개의 중앙값. 없으면 None."""
    vals = []
    j = i
    while 0 <= j < len(prof) and len(vals) < n:
        if prof[j] >= PLAT:
            vals.append(prof[j])
        elif vals:
            break
        j += step
        if abs(j - i) > 20:
            break
    return float(np.median(vals)) if len(vals) >= 2 else None


def dark_mass(prof, s, e):
    """[s, e] 검정 띠 — 두께(검정 질량)와 **소수점 모서리**를 같이 낸다.

    두께 = Σ(1 − L/L_고원) — AA 화소는 자기 비율만큼만 세어진다.
    모서리 = (첫 검정 화소 − 0.5) − 바깥 어깨 질량 / (끝 검정 화소 + 0.5) + 안쪽 어깨 질량.
    이렇게 두면 «바깥 − 두께 둘 = 속» 이 **항등식**이라 세 값이 서로 안 어긋난다.
    양옆이 밝은 고원이 아니면 None(= 그림자 구간이라 이 자로는 안 잰다).
    """
    lo = plateau(prof, s - 1, -1)
    hi = plateau(prof, e + 1, +1)
    if lo is None or hi is None:
        return None
    ml = 0.0
    j = s - 1
    while j >= 0 and prof[j] < lo * 0.98 and s - j <= 6:
        ml += max(0.0, 1 - prof[j] / lo)
        j -= 1
    mr = 0.0
    j = e + 1
    while j < len(prof) and prof[j] < hi * 0.98 and j - e <= 6:
        mr += max(0.0, 1 - prof[j] / hi)
        j += 1
    mid = (lo + hi) / 2
    core = sum(max(0.0, 1 - prof[j] / mid) for j in range(s, e + 1))
    return dict(t=ml + mr + core, a=s - 0.5 - ml, b=e + 0.5 + mr)


def bands_in(prof):
    """양옆이 밝은 고원인 검정 띠들 — [dict(t, a, b, s, e)]."""
    out = []
    for (s, e) in runs_below(prof, DARK):
        d = dark_mass(prof, s, e)
        if d is not None and 0.4 < d['t'] < 30:
            d['s'], d['e'] = s, e
            out.append(d)
    return out


def ribbon_band(a, y0, y1, x0, x1, tag, scale, out):
    """[A] 가로 띠 — 열마다 «검정 띠가 정확히 둘» 인 열만 골라 위·아래 테와 속을 잰다."""
    y0, y1 = max(0, int(y0)), min(a.shape[0], int(y1))
    x0, x1 = max(0, int(x0)), min(a.shape[1], int(x1))
    L = lum(a[y0:y1, x0:x1].astype(float))
    T, B, F, O = [], [], [], []
    for c in range(L.shape[1]):
        bs = bands_in(L[:, c])
        if len(bs) != 2:
            continue
        d1, d2 = bs
        T.append(d1['t'])
        B.append(d2['t'])
        F.append(d2['a'] - d1['b'])          # 속 = 안쪽 모서리 사이
        O.append(d2['b'] - d1['a'])          # 바깥 = 바깥 모서리 사이 (= 속 + 테 둘)
    if len(T) < 6:
        print(f'  {tag}: 표본 부족 (열 {len(T)})')
        return
    t, b, f, o = np.median(T), np.median(B), np.median(F), np.median(O)
    print(f'  {tag}: 열 {len(T)} · 검정 테 위 **{t:.2f}** 아래 **{b:.2f}** (환산 {t*scale:.2f} / {b*scale:.2f}) · '
          f'속 {f:.2f} (환산 {f*scale:.2f}) · 바깥 {o:.1f} (환산 {o*scale:.1f})')
    out.setdefault(tag, {})['band'] = (t * scale, b * scale, f * scale, o * scale)


def glyph_stroke(a, y0, y1, x0, x1, tag, scale, out, ink=200):
    """[B][C][D] 글자 획 — 행마다 잉크 덩어리 양옆의 검정 띠를 가로로 잰다."""
    y0, y1 = max(0, int(y0)), min(a.shape[0], int(y1))
    x0, x1 = max(0, int(x0)), min(a.shape[1], int(x1))
    L = lum(a[y0:y1, x0:x1].astype(float))
    w = []
    for r in range(L.shape[0]):
        row = L[r]
        if not (row > ink).any():
            continue
        for d in bands_in(row):
            # 잉크에 붙은 띠만 — 한쪽 고원이 잉크(밝다)여야 한다
            l = plateau(row, d['s'] - 1, -1)
            h = plateau(row, d['e'] + 1, +1)
            if (l and l > ink) or (h and h > ink):
                w.append(d['t'])
    if len(w) < 8:
        print(f'  {tag}: 표본 부족 ({len(w)})')
        return
    med = float(np.median(w))
    print(f'  {tag}: n={len(w)} · 검정 획 **{med:.2f}** (환산 {med*scale:.2f}) · '
          f'사분위 {np.percentile(w, 25):.2f}~{np.percentile(w, 75):.2f}')
    out.setdefault(tag, {})['stroke'] = med * scale


def ref_band(ra, rgb):
    """헤더 밴드 — «그 색이 한 행에 250칸 넘게 깔린» 연속 행 묶음.

    ⚠ 색 bbox 로 잡으면 안 된다 — 같은 색이 카드 아래쪽 그늘에도 쓰여서 밴드가
    카드 절반 높이로 부풀고, 그러면 «헤더 아래에서 리본 찾기» 가 **다음 카드의 리본**을 집는다
    (10회차 1차 시도가 그렇게 파랑 카드 자리에 초록 카드 리본을 적었다).
    """
    m = near(ra, rgb, 40)
    cnt = m.sum(1)
    rows = [y for y in range(len(cnt)) if cnt[y] > 250]
    if not rows:
        return None
    grp, s, p = [], rows[0], rows[0]
    for y in rows[1:]:
        if y > p + 3:
            grp.append((s, p))
            s = y
        p = y
    grp.append((s, p))
    hy0, hy1 = max(grp, key=lambda g: g[1] - g[0])
    xs = np.where(m[hy0:hy1 + 1].any(0))[0]
    return int(xs.min()), int(xs.max()), hy0, hy1


def ref_scan(ra, R):
    """ref 두 카드 — 헤더 밴드로 카드를 자가 찾고 **그 카드 안에서만** 리본을 찾는다."""
    bands = {n: ref_band(ra, c) for n, c in HDR.items()}
    tops = sorted([b[2] for b in bands.values() if b])
    for name, rgb in HDR.items():
        if not bands[name]:
            continue
        hx0, hx1, hy0, hy1 = bands[name]
        # 이 카드의 세로 구간 = 자기 밴드부터 다음 카드 밴드(또는 그림 끝) 전까지
        nxt = [t for t in tops if t > hy0]
        cy1 = (nxt[0] - 12) if nxt else ra.shape[0]
        print(f'\n--- ref {name}  헤더 밴드 x{hx0}..{hx1} y{hy0}..{hy1} · 카드 구간 ..{cy1}')
        glyph_stroke(ra, hy0 + 2, hy1 - 1, hx0, hx1, f'{name} 제목 글자', K, R)
        if '배너' in name:
            g = near(ra[hy1:hy1 + 130, hx0:hx1], GOLD_BAN, 60)
            gy, gx = np.where(g.any(1))[0], np.where(g.any(0))[0]
            if len(gy):
                glyph_stroke(ra, hy1 + gy[0] + 4, hy1 + gy[-1] - 3,
                             hx0 + int(gx[0]), hx0 + int(gx[-1]), f'{name} 배너 라벨', K, R)
        # 리본 — 이 카드 안에서 «빨강 계열» 덩어리 두 개
        sub = ra[hy1:cy1, hx0:hx1]
        red = (sub[..., 0] > 150) & (sub[..., 1] < 150) & (sub[..., 2] < 150)
        rows = np.where(red.sum(1) > 30)[0]
        grp, s, p = [], None, None
        for v in rows:
            if s is None:
                s = v
            elif v > p + 4:
                grp.append((s, p))
                s = v
            p = v
        if s is not None:
            grp.append((s, p))
        for i, (a0, a1) in enumerate([g for g in grp if g[1] - g[0] > 12][:2], 1):
            ribbon_band(ra, hy1 + a0 - 14, hy1 + a1 + 16, hx0 + 46, hx0 + 150,
                        f'{name} 리본{i} 띠', K, R)
            glyph_stroke(ra, hy1 + a0 + 4, hy1 + a1 - 3, hx0 + 8, hx0 + 120,
                         f'{name} 리본{i} 라벨', K, R, ink=170)


def main():
    cap = 'docs/review/151-r16'
    geo = 'docs/review/151-r16.geo.json'
    if '--cap' in sys.argv:
        cap = sys.argv[sys.argv.index('--cap') + 1]
    if '--geo' in sys.argv:
        geo = sys.argv[sys.argv.index('--geo') + 1]

    R, O = {}, {}
    ra = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    print(f'== 레퍼런스 {REF} · K={K} (환산 = ref × K) — 검정 외곽은 «밝은 host 위» 에서만 잰다')
    ref_scan(ra, R)

    print(f'\n== 우리 {cap}-c*.png  (환산 = ×1)')
    for i, c in enumerate(json.load(open(geo))['cards'], 1):
        try:
            oa = np.asarray(Image.open(f'{cap}-c{i}.png').convert('RGB')).astype(int)
        except FileNotFoundError:
            print(f'\n(크롭 {cap}-c{i}.png 없음 — node tools/cap151.js {cap}.png --crop 먼저)')
            continue
        ban = 'ban1' in c['cls']
        kind = '배너형(파랑)' if ban else '불릿형(초록)'
        cx, cy = int(c['card']['x']), int(c['card']['y'])
        print(f"\n--- 우리 카드{i} [{c['id']} · {kind}]")
        hh = 96 if ban else 102
        glyph_stroke(oa, cy + 16, cy + 10 + hh - 6, cx + 30, cx + 620, f'{kind} 제목 글자', 1.0, O)
        if ban:
            g = near(oa[cy:cy + 420, cx:cx + 560], GOLD_BAN, 60)
            gy, gx = np.where(g.any(1))[0], np.where(g.any(0))[0]
            if len(gy):
                glyph_stroke(oa, cy + int(gy[0]) + 8, cy + int(gy[-1]) - 6,
                             cx + int(gx[0]), cx + int(gx[-1]), f'{kind} 배너 라벨', 1.0, O)
        for n, k in enumerate(('rb1', 'rb2'), 1):
            rb = c[k]
            ribbon_band(oa, rb['y'] - 14, rb['y'] + rb['h'] + 16, cx + 90, cx + 290,
                        f'{kind} 리본{n} 띠', 1.0, O)
            glyph_stroke(oa, rb['y'] + 10, rb['y'] + rb['h'] - 8, cx + 20, cx + 250,
                         f'{kind} 리본{n} 라벨', 1.0, O, ink=170)

    print('\n== 요약 (환산 px · ref 는 ×K · 우리는 세 카드 중앙값)')
    print('| 자리 | ref | 우리 | Δ | Δ% |')
    print('|---|---|---|---|---|')
    for tag in R:
        if tag not in O:
            continue
        for key, label in (('stroke', '검정 획'), ('band', '검정 테')):
            if key not in R[tag] or key not in O[tag]:
                continue
            if key == 'stroke':
                r_, o_ = R[tag][key], O[tag][key]
                print(f'| {tag} {label} | {r_:.2f} | {o_:.2f} | **{o_ - r_:+.2f}** | {100*(o_-r_)/r_:+.1f}% |')
            else:
                rt, rb_, rf, ro = R[tag][key]
                ot, ob, of, oo = O[tag][key]
                r_, o_ = (rt + rb_) / 2, (ot + ob) / 2
                print(f'| {tag} {label} | {r_:.2f} | {o_:.2f} | **{o_ - r_:+.2f}** | {100*(o_-r_)/r_:+.1f}% |')
                print(f'| {tag} 속(채움) | {rf:.1f} | {of:.1f} | **{of - rf:+.1f}** | {100*(of-rf)/rf:+.1f}% |')
                print(f'| {tag} 바깥 | {ro:.1f} | {oo:.1f} | **{oo - ro:+.1f}** | {100*(oo-ro)/ro:+.1f}% |')


if __name__ == '__main__':
    main()
