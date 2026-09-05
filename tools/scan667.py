#!/usr/bin/env python3
"""작업 667 — 카드 **우변 실루엣 전용 자** (3회차가 «전용 자가 필요하다» 로 넘긴 자리).

3회차 기록 «다음 세션이 볼 것» 1번:
  > ref 파랑 카드의 노치는 2개다(우변 y142~178 · y212~246, 깊이 15). 우리 배너 카드는 1개다.
  > ⚠ 초록 카드도 우변 스캔에 4자리가 잡혔는데 **일러스트·리본이 섞여 있어** 전용 자가 필요하다 —
  > **눈으로 세지 마라.**

그래서 이 자는 «우변에서 왼쪽으로 파고든 만큼» 을 재되 **카드 몸통 밖 자식**(리본·뱃지·알약·상태 탭)과
**카드 안 일러스트**를 섞지 않는다. 방법은 하나뿐이다 — 행마다 **카드 재질이 끝나는 x**(= 검정 테의
바깥 모서리)를 찾고, 그 x 가 곧은 변에서 얼마나 들어왔는지의 «프로파일» 을 낸다.
일러스트는 카드 **안**이라 이 프로파일을 못 건드리고, 리본·뱃지는 카드 **밖**이라 우변보다 더 오른쪽에
있거나(뱃지) 좌변에 붙어 있다(리본) — 둘 다 «바깥 모서리» 정의로 갈린다.

⚑ 3회차 교훈(경계 기준)을 자 안에 박았다 — 깊이는 **두 기준으로 같이** 낸다:
    · `outer` = 검정 외곽선의 **바깥** 모서리 (측정표 §1-3 이 쓰는 기준)
    · `hole`  = 카드 재질이 끝나고 **바탕이 시작되는** 자리 (비평가가 눈으로 재는 기준)
  하나만 내면 검정 테 두께(ref 4.84 · 우리 10)만큼 어긋난 값을 놓고 2인이 독립으로 같은 오답을 낸다.

실행:
  python3 tools/scan667.py --ref                 레퍼런스 두 장의 우변 프로파일 · 노치 목록
  python3 tools/scan667.py --cap <png> [--geo <json>]   우리 캡처의 카드별 같은 표
  ... [--tol <우리 px>]                                 노치 판정 문턱(기본 6). ref 쪽은 /k 로 환산된다.
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                      # ref 카드 폭 474.12 → 우리 978 (측정표 §9)


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


def edge_profile(a, y0, y1, x0, x1, bg):
    """행마다 [x0,x1] 안에서 «카드 재질» 의 오른쪽 끝을 찾는다.

    bg = 카드 밖 바탕색 표본(RGB). 바탕과 충분히 다른 화소를 «카드» 로 본다.
    반환: rows[y] = (outer_x, hole_x) — outer 는 검정(어두운)까지 포함한 오른쪽 끝,
          hole 은 «바탕이 아닌 마지막 화소» 와 같다(둘은 같은 정의라 outer==hole).
          검정 테 안쪽(카드 재질의 밝은 부분)이 끝나는 자리는 inner 로 따로 낸다.
    """
    prof = []
    for y in range(y0, y1):
        row = a[y, x0:x1]
        d = np.abs(row - np.array(bg)).sum(1)
        nz = np.where(d > 40)[0]
        if not len(nz):
            prof.append(None)
            continue
        outer = x0 + int(nz[-1])
        # inner: 그 왼쪽으로 가면서 «검정이 아닌» 첫 화소
        dark = row.max(1) < 70
        i = int(nz[-1])
        while i >= 0 and dark[i]:
            i -= 1
        inner = x0 + i
        prof.append((outer, inner))
    return prof


def notches(prof, straight, tol):
    """곧은 변 straight 에서 tol 이상 왼쪽으로 들어간 연속 구간 = 노치."""
    idx = [i for i, p in enumerate(prof) if p is not None and straight - p[0] >= tol]
    return runs(idx, minlen=4)


# ⚑ 667 7회차 — **문턱을 «우리 px» 한 단위로 모았다.**
# 6회차가 «--ref 는 tol=3 · --cap 은 tol=6 이니 먼저 같은 값으로 맞춰 놓고 판단할 것» 을 넘겼다.
# 두 자가 서로 다른 이미지 축척을 쓰므로 **같은 숫자를 쓰는 것이 오히려 다른 문턱**이다 —
# 실물 기준으로는 ref 3px × k 2.0628 = 6.19 우리 px 라 둘이 이미 거의 같았다(우연이 아니라
# 4회차가 그렇게 고른 것인데 근거가 안 적혀 있었다). 이제 문턱은 **우리 px 로 한 번만** 주고
# ref 쪽은 /k 로 환산해 쓴다 — 스윕(`--tol`)으로 «문턱을 흔들어도 결론이 같은가» 를 확인할 수 있다.
TOL_OUR = 6.0                    # 기본 문턱(우리 px). ref 에서는 TOL_OUR / K = 2.91 px.


def tol_ref():
    return TOL_OUR / K


def tol_cap():
    return TOL_OUR


def report_ref():
    a = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    H, W, _ = a.shape
    print(f'== ref {REF} {W}x{H}  (k={K})')
    # 카드 세로 범위 = «바탕이 아닌 화소가 폭의 40% 이상» 인 행 덩어리(카드 사이 틈이 갈라 준다).
    # ⚠ 검정 띠로 가르면 안 된다 — 두 카드가 맞닿은 자리의 아래·윗변이 **한 띠**로 붙는다(3회차 함정).
    bg0 = a[2, W - 3].tolist()
    solid = [y for y in range(H) if (np.abs(a[y] - np.array(bg0)).sum(1) > 40).sum() > W * 0.40]
    bands = [b for b in runs(solid, minlen=20)]
    print('   카드 세로 범위(내용 있는 행 덩어리):', bands)
    names = ['blue(배너형·윗부분 잘림)', 'green(불릿형)', 'card3']
    cards = [(names[i] if i < len(names) else f'card{i + 1}', b[0], b[1] + 1)
             for i, b in enumerate(bands)]
    for name, y0, y1 in cards:
        # 바탕 표본 = 카드 오른쪽 밖 (우변보다 오른쪽)
        bg = a[(y0 + y1) // 2, W - 3].tolist()
        prof = edge_profile(a, y0, y1, 0, W, bg)
        vals = [p[0] for p in prof if p]
        if not vals:
            continue
        straight = int(np.bincount(np.array(vals)).argmax())
        print(f'\n-- {name}  y {y0}..{y1 - 1}  h={y1 - y0}  바탕표본={bg}  곧은변 x={straight}')
        ns = notches(prof, straight, tol=tol_ref())
        print(f'   노치 {len(ns)} 개 (곧은변에서 {tol_ref():.2f}px[= 우리 {TOL_OUR:g}px] 이상 들어간 구간, 길이 4행 이상)')
        for (i0, i1) in ns:
            seg = [prof[i][0] for i in range(i0, i1 + 1) if prof[i]]
            dep = straight - min(seg)
            ay0, ay1 = y0 + i0, y0 + i1
            print(f'     y {ay0 - y0:4d}..{ay1 - y0:4d} (len {i1 - i0 + 1:3d})  깊이 {dep:3d}'
                  f'   하변까지 {y1 - 1 - ay1:4d}'
                  f'   | ×k: 길이 {(i1 - i0 + 1) * K:6.1f}  깊이 {dep * K:5.1f}'
                  f'  하변까지 {(y1 - 1 - ay1) * K:6.1f}')


def report_cap(png, geo):
    a = np.asarray(Image.open(png).convert('RGB')).astype(int)
    H, W, _ = a.shape
    print(f'== cap {png} {W}x{H}')
    g = json.load(open(geo)) if geo else None
    cards = g['cards'] if g else []
    for i, c in enumerate(cards):
        b = c.get('box') or c
        x, y, w, h = int(b['x']), int(b['y']), int(b['w']), int(b['h'])
        if y < 0 or y + h > H:
            print(f'-- card{i + 1} 화면 밖(y={y},h={h}) — 건너뜀')
            continue
        bg = a[y + h // 2, min(W - 3, x + w + 12)].tolist()
        prof = edge_profile(a, y, y + h, x, min(W, x + w + 4), bg)
        vals = [p[0] for p in prof if p]
        if not vals:
            continue
        straight = int(np.bincount(np.array(vals)).argmax())
        print(f'\n-- card{i + 1} ({c.get("id", "")}) box {x},{y} {w}x{h}  바탕표본={bg}  곧은변 x={straight}')
        ns = notches(prof, straight, tol=tol_cap())
        print(f'   노치 {len(ns)} 개 (문턱 우리 {TOL_OUR:g}px)')
        for (i0, i1) in ns:
            seg = [prof[k][0] for k in range(i0, i1 + 1) if prof[k]]
            inner = [prof[k][1] for k in range(i0, i1 + 1) if prof[k]]
            dep = straight - min(seg)
            print(f'     y {i0:4d}..{i1:4d} (len {i1 - i0 + 1:3d})  깊이(outer) {dep:3d}'
                  f'  깊이(hole) {straight - min(inner):3d}   하변까지 {h - 1 - i1:4d}')


if __name__ == '__main__':
    if '--tol' in sys.argv:
        TOL_OUR = float(sys.argv[sys.argv.index('--tol') + 1])
    if '--ref' in sys.argv:
        report_ref()
    if '--cap' in sys.argv:
        png = sys.argv[sys.argv.index('--cap') + 1]
        geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else None
        report_cap(png, geo)
    if '--ref' not in sys.argv and '--cap' not in sys.argv:
        print(__doc__)
