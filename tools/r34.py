#!/usr/bin/env python3
"""34 축복 팝업 — «모서리 반경» 전용 결선 측정기 (13회차, 2026-08-26).

12회차까지 두 비평가가 **보너스 탭 상단 반경**과 **다이얼로그 외곽 반경**을
정반대로 지적해 계속 «엇갈림 → 유지» 로 남았다(review §10-3·10-4).
원인은 m34.py 의 `arc` 가 **모서리 창 안의 경계점 전체에 원을 최소자승** 하는
방식이라 창에 직선변이 섞이는 순간 반경이 통째로 흔들린다는 것(«창 편향»).

여기서는 LESSONS 20-2 처방대로 **행별 인셋 프로파일에 원을 피팅**한다:
  - 모서리에서 j 번째 행의 인셋 e(j) = 그 행에서 채워진 첫 픽셀까지의 거리
  - 반경 r 인 라운드 코너면  e(j) = r - sqrt(r^2 - (r-j)^2)   (j < r), 그 뒤 0
  - r 을 0.5px 격자에서 훑어 잔차제곱합이 최소인 값을 고른다
ref·cap 에 **같은 창 높이·같은 마스크·같은 코드**를 쓰므로 절대값 비교가 성립한다.

좌표계: ref = 1080x2340, cap = 1080x2280, cap y = ref y - 84 (가로 1:1).
인자는 «프레임 좌표»(= cap 좌표)로 준다.

사용:
  python3 tools/r34.py corner <x0> <y0> <x1> <y1> <mode> <corner> [win]   (ref·cap 같은 상자)
  python3 tools/r34.py all
환경변수 CAP 로 캡처 경로 지정 (기본 docs/review/34-r14.png).
"""
import sys, os
from pydep937 import np
from pydep937 import Image

REF_PATH = 'docs/ref/34-축복-버프팝업.jpg'
CAP_PATH = os.environ.get('CAP', 'docs/review/34-r14.png')
DY = 84

_cache = {}


def img(which):
    if which not in _cache:
        _cache[which] = np.asarray(Image.open(REF_PATH if which == 'ref' else CAP_PATH)
                                   .convert('RGB')).astype(int)
    return _cache[which]


def mask_of(a, mode):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = a.mean(axis=2)
    if mode == 'blk':      return lum < 15   # 팝업 검정 테두리 — 딤(ref 48 / cap 28~36)과 확실히 갈린다
    if mode == 'dark':     return lum < 70
    if mode == 'vdark':    return lum < 45
    if mode == 'notdark':  return lum >= 70
    if mode == 'bright':   return lum > 190
    if mode == 'cream':    return (r > 210) & (g > 185) & (b > 140) & (b < 225)
    if mode == 'green':    return (g > 110) & (g - r > 40) & (g - b > 40)
    if mode == 'tab':      return (abs(r - 62) < 26) & (abs(g - 48) < 24) & (abs(b - 45) < 24)
    if mode == 'headband': return (abs(r - 84) < 30) & (abs(g - 65) < 28) & (abs(b - 61) < 28)
    raise SystemExit('mode? ' + mode)


def inset_profile(which, x0, y0, x1, y1, mode, corner, win, minrun=4):
    """모서리 win 행의 인셋 e(j) 배열. corner: tl|tr|bl|br.
    `minrun` 연속 픽셀 이상만 «면» 으로 친다 — 딤 뒤 전투 씬의 흩어진 어두운 점을 걸러낸다."""
    a = img(which)
    o = DY if which == 'ref' else 0
    reg = mask_of(a[y0 + o:y1 + o, x0:x1], mode)
    if corner in ('bl', 'br'):
        reg = reg[::-1]
    if corner in ('tr', 'br'):
        reg = reg[:, ::-1]
    prof = []
    for j in range(min(win, reg.shape[0])):
        v, run = float('nan'), 0
        for k, on in enumerate(reg[j]):
            if on:
                run += 1
                if run >= minrun:
                    v = float(k - run + 1); break
            else:
                run = 0
        prof.append(v)
    return np.array(prof)


def fit_radius(prof):
    """e(j) = r - sqrt(r^2-(r-j)^2) (j<r) 모델에 r 을 0.5px 격자로 피팅."""
    j = np.arange(len(prof), dtype=float)
    ok = ~np.isnan(prof)
    if ok.sum() < 6:
        return None, None
    best, bestr = None, None
    for r in np.arange(2.0, len(prof) * 1.6, 0.5):
        d = np.where(j < r, r - np.sqrt(np.maximum(r * r - (r - j) ** 2, 0.0)), 0.0)
        e = float(((d[ok] - prof[ok]) ** 2).mean())
        if best is None or e < best:
            best, bestr = e, r
    return bestr, np.sqrt(best)


def corner_cmp(label, box_ref, box_cap, mode, corner, win=44, minrun=4):
    """box_* = (x0, y0, x1, y1). ref 와 cap 의 «상자 자체» 가 1~2px 어긋나 있을 수 있으므로
    각자의 실측 상자를 준다 — 원점이 어긋나면 인셋 프로파일이 통째로 밀려 반경이 틀린다."""
    out = []
    for w, bx in (('ref', box_ref), ('cap', box_cap)):
        p = inset_profile(w, *bx, mode, corner, win, minrun)
        r, rms = fit_radius(p)
        out.append((r, rms, p))
    (rr, rre, rp), (cr, cre, cp) = out
    d = (cr - rr) if (rr and cr) else float('nan')
    print(f'{label:22s} {corner}  ref r={rr:5.1f}(rms {rre:4.2f})   '
          f'cap r={cr:5.1f}(rms {cre:4.2f})   Δ={d:+.1f}')
    print(f'   ref e(j) {" ".join(f"{v:.0f}" if v == v else "-" for v in rp[:16])}')
    print(f'   cap e(j) {" ".join(f"{v:.0f}" if v == v else "-" for v in cp[:16])}')
    return rr, cr


def run_all():
    print(f'ref={REF_PATH}  cap={CAP_PATH}  (cap y = ref y - {DY})')
    print('=' * 104)
    # ── 보너스 탭(«보너스 축복») 상단 두 모서리 ──────────────────────────────
    # 탭 마스크 bbox 실측: ref x317..762 y1197.. / cap x317..762 y1195.. (ref 가 2px 아래)
    print('# 보너스 탭 — 우리 CSS 반경이 그대로 측정되는지(편향 0)까지 같이 본다')
    corner_cmp('보너스탭 상단', (317, 1197, 540, 1247), (317, 1195, 540, 1245), 'tab', 'tl', 30)
    corner_cmp('보너스탭 상단', (540, 1197, 763, 1247), (540, 1195, 763, 1245), 'tab', 'tr', 30)
    # ── 다이얼로그 외곽(검정 테두리 실루엣) ─────────────────────────────────
    # 위 두 모서리는 헤더 밴드·핑크 리본·딤 뒤 전투 씬이 창을 오염시켜 rms 가 3 이상으로 뛴다.
    # **아래 두 모서리만** 쓴다(양쪽 rms ≤ 1.0). 외곽 상자는 ref·cap 모두 x41..1038 · 바닥 1502.
    print('# 다이얼로그 외곽 — 아래 두 모서리만(위쪽은 헤더·리본 오염)')
    corner_cmp('다이얼로그 외곽', (41, 1442, 540, 1502), (41, 1442, 540, 1502), 'blk', 'bl', 46)
    corner_cmp('다이얼로그 외곽', (540, 1442, 1039, 1502), (540, 1442, 1039, 1502), 'blk', 'br', 46)


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] == 'all':
        run_all()
    elif sys.argv[1] == 'corner':
        x0, y0, x1, y1 = map(int, sys.argv[2:6])
        mode, corner = sys.argv[6], sys.argv[7]
        win = int(sys.argv[8]) if len(sys.argv) > 8 else 44
        corner_cmp('corner', (x0, y0, x1, y1), (x0, y0, x1, y1), mode, corner, win)
    else:
        raise SystemExit(__doc__)
