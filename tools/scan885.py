#!/usr/bin/env python3
"""작업 885 — «불릿 카드 아트 자리» 와 «불릿형 노치 세로 길이» 두 축의 자.

885 등재문의 ①·② 가 둘 다 «자를 먼저 세워라» 자리다.

  ① **아트 자리** — 9회차 비평 DH·DI 가 같은 자리를 반대편에서 봤다
     (DH «ref 일러스트 상자 458×272 · 카드 우단 밖으로 20.6px 돌출» ↔ DI «우리 456×303 백판은 ref 에 없다»).
     지시서 [3] «아트 자리 규칙» 이 판정한다 — 대체물은 **ref bbox(w×h·중심)를 정확히 차지**해야 한다.
     ⇒ 이 자는 **ref 초록 카드 안에서 «몸통도 무늬도 아닌» 화소 덩이**의 bbox 를 낸다.
     ⚠ 몸통은 두 톤 마름모 무늬(측정표 §12-2 · 비 0.912)라 «단색 = 몸통» 으로 잡으면 무늬가 통째로 잉크가 된다
       ⇒ 두 톤을 **둘 다** 몸통으로 등록하고, 검정 외곽선·크림 칸·★ 목록(좌측)은 창으로 뺀다.

  ② **노치 세로 길이** — DH(신뢰 상) ↔ DI(신뢰 하)가 정반대다. 8회차가 배너형에서 쓴 것과 **같은 자**
     (`tools/scan667.py`)를 **문턱 스윕**으로 돌려 부호가 뒤집히는지 본다(LESSONS A3-ⓑ).
     이 파일은 그 스윕 결과를 한 표로 모으기만 한다 — 자를 새로 만들지 않는다(402 «사본을 지운다»).

실행:
    python3 tools/scan885.py --art            ref 초록 카드의 아트 덩이 bbox (+ 우리 값과 대조)
    python3 tools/scan885.py --art --cap scratch/151-r31.png --geo scratch/geo31.json
    python3 tools/scan885.py --notch [--cap <png> --geo <json>]   문턱 스윕 표(② 판정)
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                       # 우리 px = ref px × K (측정표 §9)
GREEN_TOP, GREEN_BOT = 302, 701  # ref 초록 카드 세로 범위 (scan667 --ref 실측)
BODY_G = [(52, 178, 130), (47, 162, 119)]   # 몸통 두 톤 (§12-2 · 비 0.912)
HDR_G = (33, 145, 97)            # 헤더 밴드


def near(a, rgb, tol):
    return np.abs(a - np.array(rgb)).sum(2) < tol


def card_edges(a, y, bg_lum):
    """행 y 의 카드 좌·우 바깥 모서리 (50% 교차) — scan667 과 같은 정의."""
    L = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[y]
    thr = bg_lum / 2
    lo = hi = None
    for x in range(len(L) - 1):
        if L[x] > bg_lum - 8 and L[x + 1] < thr:
            lo = x + (L[x] - thr) / (L[x] - L[x + 1]); break
    for x in range(len(L) - 1, 0, -1):
        if L[x] > bg_lum - 8 and L[x - 1] < thr:
            hi = x - (L[x] - thr) / (L[x] - L[x - 1]); break
    return lo, hi


def art_ref(dg=(25, 15), dl=70, dbg=False):
    """ref 초록 카드의 «일러스트 덩이» bbox.

    ⚠ «몸통색이 아닌 화소» 로 잡으면 안 된다 — 몸통이 두 톤 마름모 무늬라 카드 전체가 잉크가 된다
       (실제로 한 번 그렇게 짰고 열 합이 어디서나 60~150 이었다).
    ⇒ **초록 계열인가**(G > R+dg0 · G > B+dg1)로 가른다. 일러스트(흰·하늘·노랑)만 여기서 빠진다.
    ⚠ ★ 목록의 흰 글자도 같이 빠지므로 **열 프로파일의 빈 골**로 좌우를 가른다(x≈258 에서 2 이하로 내려간다).
    ⚠ 세로도 «배지»(카드 상단 우측 별폭죽)를 빼야 한다 — 배지와 일러스트 사이에 y≈395 에서 빈 행이 있다."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    L = 0.299 * R + 0.587 * G + 0.114 * B
    bgl = float(np.median(L[:, :6]))
    lo, hi = card_edges(a, (GREEN_TOP + GREEN_BOT) // 2, bgl)
    ink = (~((G > R + dg[0]) & (G > B + dg[1]))) & (L >= dl)

    # ① 일러스트가 있는 «행» — 배지 아래(빈 행) ~ 리본 위
    y_lo = GREEN_TOP + 28
    band = ink[y_lo:GREEN_BOT - 60, int(hi) - 220:int(hi) + 14]
    rs = band.sum(1)
    rthr = max(3, 0.08 * rs.max())          # 상대 문턱 — 흐린 꼬리(AA·무늬 잔재)를 안 센다
    rows = [y_lo + i for i, v in enumerate(rs) if v >= rthr]
    # ⚠ 이 창에는 덩이가 **둘**이다 — 위가 별폭죽 배지(카드 상단 우측), 아래가 일러스트.
    #   빈 행 4칸 이상으로 끊어 «아래 덩이» 를 고른다(안 나누면 배지 상변이 아트 상변으로 읽힌다).
    grp, cur = [], [rows[0]]
    for y in rows[1:]:
        if y - cur[-1] <= 3:
            cur.append(y)
        else:
            grp.append(cur); cur = [y]
    grp.append(cur)
    ay0, ay1 = grp[-1][0], grp[-1][-1]
    # ② 그 행 안에서 «오른쪽 덩이» 의 좌우 — 빈 골(≤2)이 6칸 이어지면 거기가 ★ 목록과의 경계
    w = ink[ay0:ay1 + 1, :int(hi) + 18]
    cs = w.sum(0)
    cthr = max(3, 0.08 * cs.max())
    right = len(cs) - 1
    while right > 0 and cs[right] < cthr:
        right -= 1
    gap, left = 0, 0
    for x in range(right, -1, -1):
        if cs[x] < cthr:
            gap += 1
            if gap >= 6:
                left = x + gap
                break
        else:
            gap = 0
    ax0, ax1 = left, right
    print(f'== ref 초록 카드 — 카드 바깥선 x {lo:.1f}..{hi:.1f} (폭 {hi - lo:.1f})')
    print(f'   아트 덩이 bbox  x {ax0}..{ax1}  y {ay0}..{ay1}'
          f'  = {ax1 - ax0 + 1}×{ay1 - ay0 + 1} ref px')
    print(f'   ×k(우리 px)     = {(ax1 - ax0 + 1) * K:.1f}×{(ay1 - ay0 + 1) * K:.1f}'
          f'   · 카드 우단 밖 돌출 {(ax1 - hi) * K:.1f}')
    print(f'   카드-로컬(ref)  좌 {ax0 - lo:.1f}  상 {ay0 - GREEN_TOP:.1f}  하변까지 {GREEN_BOT - ay1:.1f}'
          f'   | ×k 좌 {(ax0 - lo) * K:.1f}  상 {(ay0 - GREEN_TOP) * K:.1f}  하변까지 {(GREEN_BOT - ay1) * K:.1f}')
    if dbg:
        print('   행 합(위→아래 20칸):', rs[:20].tolist())
    return dict(w=(ax1 - ax0 + 1) * K, h=(ay1 - ay0 + 1) * K,
                over=(ax1 - hi) * K, left=(ax0 - lo) * K, top=(ay0 - GREEN_TOP) * K,
                bot=(GREEN_BOT - ay1) * K)


def art_cap(png, geo):
    g = json.load(open(geo))
    c = [x for x in g['cards'] if x['id'] == 'abless'][0]
    b, box = c['art'], c
    print(f'== 우리 불릿 카드(abless) — 카드 {box["x"]},{box["y"]} {box["w"]}×{box["h"]}')
    print(f'   아트 판 bbox   {b["w"]}×{b["h"]} 우리 px'
          f'  · 우단 밖 돌출 {b["x"] + b["w"] - (box["x"] + box["w"]):.1f}')
    print(f'   카드-로컬      좌 {b["x"] - box["x"]:.1f}  상 {b["y"] - box["y"]:.1f}')
    print(f'   하변까지       {box["y"] + box["h"] - (b["y"] + b["h"]):.1f}')
    return dict(w=b['w'], h=b['h'], over=b['x'] + b['w'] - (box['x'] + box['w']),
                left=b['x'] - box['x'], top=b['y'] - box['y'],
                bot=box['y'] + box['h'] - (b['y'] + b['h']))


def notch_sweep(cap, geo):
    """② — scan667 을 문턱별로 돌려 «불릿 아래 노치» 길이를 ref ↔ 우리로 맞세운다."""
    tols = [2, 4, 6, 8, 12, 16, 20]
    print('| 문턱(우리 px) | ref 불릿 노치 길이(×k) | 우리 | Δ% |')
    print('|---|---|---|---|')
    for t in tols:
        r = subprocess.run([sys.executable, 'tools/scan667.py', '--ref', '--tol', str(t)],
                           capture_output=True, text=True).stdout
        g = r.split('green(불릿형)')[1].splitlines()
        rl = [l for l in g if '깊이' in l and '×k' in l]
        # 하변에 가장 가까운 «진짜» 노치 — 깊이 ×k 가 25~40 이고 **하변까지 ≥ 40**(우리 px).
        # ⚠ 하변까지 0 인 자리는 노치가 아니라 **카드 하단 모서리**다(라운드 코너가 같은 자로 잡힌다).
        def pick(lines, dep_lo=25, dep_hi=40):
            best = None
            for l in lines:
                p = l.split('×k:')[1]
                ln = float(p.split('길이')[1].split()[0])
                dp = float(p.split('깊이')[1].split()[0])
                bt = float(p.split('하변까지')[1].split()[0])
                if dep_lo <= dp <= dep_hi and bt >= 40 and (best is None or bt < best[1]):
                    best = (ln, bt)
            return best
        rv = pick(rl)
        o = subprocess.run([sys.executable, 'tools/scan667.py', '--cap', cap, '--geo', geo,
                            '--tol', str(t)], capture_output=True, text=True).stdout
        oc = o.split('card2')[1].splitlines()
        ov = None
        for l in oc:
            if '깊이(outer)' in l:
                dep = float(l.split('깊이(outer)')[1].split()[0])
                bt = float(l.split('하변까지')[1].split()[0])
                ln = float(l.split('(len')[1].split(')')[0])
                if 25 <= dep <= 40 and bt >= 40 and (ov is None or bt < ov[1]):
                    ov = (ln, bt)
        d = (ov[0] - rv[0]) / rv[0] * 100
        print(f'| {t} | {rv[0]:.1f} | {ov[0]:.0f} | {d:+.1f}% |')


if __name__ == '__main__':
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'scratch/151-r31.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo31.json'
    if '--art' in sys.argv:
        r = art_ref(dbg='--dbg' in sys.argv)
        if os.path.exists(geo):
            o = art_cap(cap, geo)
            print(f'\n== Δ (우리 − ref×k)  폭 {o["w"] - r["w"]:+.1f}  높이 {o["h"] - r["h"]:+.1f}'
                  f'  돌출 {o["over"] - r["over"]:+.1f}  좌 {o["left"] - r["left"]:+.1f}'
                  f'  상 {o["top"] - r["top"]:+.1f}  하변까지 {o["bot"] - r["bot"]:+.1f}')
    if '--notch' in sys.argv:
        notch_sweep(cap, geo)
    if '--art' not in sys.argv and '--notch' not in sys.argv:
        print(__doc__)
