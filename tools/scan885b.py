#!/usr/bin/env python3
"""작업 885 3회차 — «2000% / 가치» 배지의 **세 번째 자**.

2회차 채점에서 DP·DQ 가 «배지 가로만 좁다» 에는 일치했는데 **자가 서로 달랐다**:

  · DP  **노랑 잉크 블록**(글자) — ref 154.7×88.7 ↔ 우리 143×88 ⇒ 폭 −7.6% · 높이 −0.8%
  · DQ  **분홍 실루엣**(별판)   — ref 169.1~171.2 ↔ 우리 160    ⇒ 폭 −5.4~6.5% · 높이 ≈0
  · ⚠ DP 자신이 «분홍 실루엣 폭» 을 **측정 한계로 기각**했다(임계 50/70/95/120 에서 부호가 뒤집혔다).
  · ⚠ 게이트 `verify833` [1-a] 는 ref 분홍 폭을 **160.90 / 158.84** 로 못박고 있다(`scan833.py` 값) —
    즉 **같은 «분홍 폭» 에 대해 게이트와 DQ 가 10px 다른 ref 를 들고 있다.**

⇒ 이 자는 «누가 옳은가» 를 **임계 스윕**으로 가른다(LESSONS A3-ⓑ — 임계를 흔들어 부호가
   안 바뀌는 지적만 믿는다). 두 축을 **같은 창·같은 문턱 사다리**로 나란히 잰다:

    ① 분홍 별판(plate)  — 배지의 실루엣
    ② 노랑 글자(glyph)  — «2000%» / «가치» 두 줄의 잉크 합 bbox

  ref 는 카드 폭 474.12 → 우리 978 이라 환산 K = 2.0628 을 곱해 **우리 px 로** 낸다(측정표 §9).
  ★ 창은 «카드 상변 위 ~40 ~ 배지 아래» 우상단 사분면으로 잡고, 카드마다 따로 낸다
    (ref 는 카드가 둘, 우리는 배지가 있는 카드가 둘 = 1:1 대응).

⚑ **3회차 추가 — `--glyph`**: 총폭만 보면 «글자가 좁다» 와 «글자 사이가 안 벌어졌다» 가 안 갈린다
   (LESSONS 92-곁가지3). 윗줄 «2000%» 를 **열 덩이**로 갈라 «글리프 폭 합» 과 «틈 합» 을 따로 낸다 —
   이 자가 3회차의 처방을 `scaleX` 에서 `letter-spacing` 으로 뒤집었다.

⚑⚑ **932 5회차 — `--glyph` 의 «틈» 이 정수 격자에서 풀렸다.**
   옛 걸음은 틈을 «잉크 없는 **열 개수**» 로 셌다(`runs[i+1][0] − runs[i][1] − 1`). ref 틈의 참값이
   **2~5 ref px** 인데 눈금이 1 ref px = **2.06 우리 px** 이라, 이 축의 값이 통째로 K 의 배수에 갇혀 있었다
   (932 등재문의 결함 조건 ①∧②ⓐ∧③ — 이 값이 885 3회차 처방을 `letter-spacing` 으로 뒤집은 근거였다).
   ⇒ **덩이(run)는 옛 마스크와 글자 그대로 같은 문턱으로 찾고**(창 불변 · 932 3회차 규칙 1),
     그 덩이의 **모서리만** 열 프로파일의 문턱 교차로 민다(처방 ⓐ · 선례 `scan667b.edge_sub`).
   ⚠ **여기는 «두께» 가 아니라 «두 모서리의 차» 라 ⓐ 가 맞는 자리다**(932 1회차 물리표 마지막 줄 ·
     4회차 `probe866` 이 같은 이유로 ⓐ 를 골랐다). 두께 자체를 내는 `scan885e`·`scan887` 에는 ⓑ 가 1순위다.
   ⚑ 좌표는 **모서리 좌표**로 적는다(화소 i 가 [i, i+1) 을 덮는다) — 교차가 화소 중심 사이 한가운데면
     옛 정수값이 **정확히** 되살아나므로 치우침이 0 이고, «글리프 폭 합 + 틈 합 = 총 bbox» 가
     두 해상도에서 그대로 닫힌다(장부 `probe932` 의 fix 칸이 요구한 항등식).

실행:
    python3 tools/scan885b.py                       ref + 기본 캡처
    python3 tools/scan885b.py --cap scratch/151-r37.png --geo scratch/geo37.json
    python3 tools/scan885b.py --glyph --cap ... --geo ...
    python3 tools/scan885b.py --glyph --ref-only     ref 절만 (캡처 없이 — `scan667b` 선례)
    python3 tools/scan885b.py --glyph --ref-only --int   옛 정수 걸음 (되돌림 시험)
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628

# ref 배지 창 (x, y0, y1) — 위 카드 / 아래 카드. 우상단 사분면만 문다.
REF_WIN = [(350, 0, 160), (350, 300, 420)]

# 문턱 사다리 — «얼마나 진한 분홍/노랑까지 잉크로 세는가».
# 분홍: R − max(G,B) 가 이 값 이상.        노랑: min(R,G) − B 가 이 값 이상.
PINK_STEPS = [40, 60, 80, 100, 120, 140]
YEL_STEPS = [30, 50, 70, 90, 110, 130]

# 932 5회차 — `--int` 면 옛 정수 걸음(덩이 모서리를 화소 경계에 그대로 둔다). 되돌림 시험용.
INT_STEP = '--int' in sys.argv


def pink_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (R - np.maximum(G, B) >= t) & (R > 120)


def yel_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(R, G) - B >= t) & (R > 140) & (G > 110)


def bbox(m):
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        return None
    return (xs.min(), xs.max(), ys.min(), ys.max(), int(len(ys)))


def measure(img, win, steps, mask_fn, scale):
    """창 안에서 문턱마다 bbox 를 재고 (폭, 높이) 를 «우리 px» 로 돌려준다."""
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    out = []
    for t in steps:
        b = bbox(mask_fn(sub, t))
        if b is None:
            out.append((t, None, None, 0))
            continue
        w = (b[1] - b[0] + 1) * scale
        h = (b[3] - b[2] + 1) * scale
        out.append((t, w, h, b[4]))
    return out


def yel_score(sub):
    """열 교차 보간이 타고 갈 **연속량** — `yel_mask` 의 주 조건 `min(R,G) − B` 그대로.

    ⚑ **문턱은 한 칸도 안 무르게 한다**(932 3회차 규칙 1) — 덩이(run)는 아래에서 여전히
      `yel_mask` **전체**(주 조건 + 색 자격 R>140·G>110)로 찾는다. 이 연속량은 이미 찾은
      덩이의 **모서리를 미는 데만** 쓴다.
    ⚠ 색 자격을 −∞ 로 눌러 넣으면 안 된다 — 그 두 조건은 «노랑인가» 를 묻는 자격이지
      이 얇은 축의 문턱이 아니어서, 눌러 넣으면 프로파일이 끊겨 교차가 화소 경계에 도로 붙는다
      (ref 아래카드 x81 실측: 주 조건 69 인데 자격이 깨져 −∞ ⇒ 교차가 0.63 px 밀린다).
    """
    R, G, B = sub[..., 0], sub[..., 1], sub[..., 2]
    return (np.minimum(R, G) - B).max(0)


def _edge(pc, i, j, t):
    """덩이 안쪽 열 i ↔ 바깥 열 j 사이에서 프로파일이 문턱 t 를 지나는 **모서리 좌표**.

    화소 i 는 [i, i+1) 을 덮으므로 중심은 i+0.5 다. 두 중심 사이를 선형 보간하고 +0.5 를 더해
    모서리 좌표로 돌려준다 ⇒ 교차가 한가운데면 옛 정수 모서리(왼쪽 a · 오른쪽 b+1)와 **정확히 같다**.
    못 재면 None — 억지로 밀지 않고 부르는 쪽이 옛 정수값을 쓴다(`scan667b._side` 규약).
    """
    if not (0 <= j < len(pc)):
        return None                                   # 창에 잘렸다
    v_in, v_out = float(pc[i]), float(pc[j])
    if not (v_out < t <= v_in):
        return None                                   # 자격만 깨진 이웃 등 — 옛 값을 쓴다
    f = (v_in - t) / (v_in - v_out)                   # 안쪽에서 바깥으로 나간 거리 (0,1]
    return (i + 0.5) + f * (j - i)


def glyph_split(img, win, t, scale, tag):
    """윗줄 한 줄을 **열 덩이**로 갈라 «글리프 폭 합» 과 «글리프 사이 틈 합» 을 따로 낸다.

    ⚠ 두 줄이 `rotate(-10deg)` 라 열 덩이는 글리프 높이만큼 옆으로 번진다(≈ H·sin10 ≈ 5px).
      ref·우리가 **같은 각도**라 그 번짐은 두 쪽에 똑같이 들어가고, «글리프끼리»·«틈끼리» 비교는
      그대로 성립한다(번짐은 글리프에 더하고 틈에서 같은 만큼 뺀다).
    ⚠ 창(y0..y1)은 **윗줄만** 물어야 한다 — 아랫줄이 섞이면 열 덩이가 붙어 버린다.

    ⚑ 932 5회차 — 모서리는 부분 화소(위 `_edge`), 덩이·창은 옛 마스크 그대로.
      항등식 «글리프 폭 합 + 틈 합 = 총 bbox» 는 모서리 좌표로 적으므로 **정의상** 닫힌다.
    """
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    m = yel_mask(sub, t)
    cols = m.sum(0)
    runs, cur = [], None
    for i, v in enumerate(cols):
        if v > 0 and cur is None:
            cur = i
        if v == 0 and cur is not None:
            runs.append((cur, i - 1))
            cur = None
    if cur is not None:
        runs.append((cur, len(cols) - 1))
    if not runs:
        print('  %s — 잉크 없음' % tag)
        return
    print('  %-22s 창(정수): %s' % (tag, ' '.join('[%d..%d]' % r for r in runs)))
    back = 0                                          # 부분 화소로 못 잰 모서리 — 밝히고 지나간다
    if INT_STEP:
        edges = [(float(a), float(b + 1)) for a, b in runs]
    else:
        pc = yel_score(sub)
        edges = []
        for a, b in runs:
            le = _edge(pc, a, a - 1, t)
            re_ = _edge(pc, b, b + 1, t)
            back += (le is None) + (re_ is None)
            edges.append((float(a) if le is None else le,
                          float(b + 1) if re_ is None else re_))
    ws = [(r - l) * scale for l, r in edges]
    gaps = [(edges[i + 1][0] - edges[i][1]) * scale for i in range(len(edges) - 1)]
    # ⚑ 932 5회차 — 소수 **두 자리**로 적는다. 0.1 우리 px 은 0.048 ref px 이라
    #   1 자리로 적으면 이 축에서 새로 얻은 정밀도의 절반을 출력에서 도로 버린다
    #   (게이트 [8-a]/[8-b] 가 «K 의 배수인가» 를 ÷K 로 묻는데 그 반올림이 곧 판정 여유를 먹는다).
    #   ⚠ 885 3회차 기록의 «틈 6.2 · 글리프 합 130.0» 은 같은 수의 1 자리 표기다(6.19 · 130.04).
    print('  %-22s 덩이 %d · 글리프 폭 합 **%.2f** (%s) · 틈 합 **%.2f** (%s) · 총 bbox %.2f%s'
          % (tag, len(runs), sum(ws), ' '.join('%.2f' % w for w in ws),
             sum(gaps), ' '.join('%.2f' % g for g in gaps),
             (edges[-1][1] - edges[0][0]) * scale,
             '' if back == 0 else ' · 옛 모서리 %d/%d' % (back, 2 * len(runs))))


def main():
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'scratch/151-r37.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo37.json'

    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    """⚑ 932 5회차 — `--ref-only` (선례 `scan667b`, 3회차 곁다리).
       ref 는 저장소 안에 있고 캡처는 커밋 금지 자산이라, ref 절만으로 돌 수 있어야
       게이트가 브라우저 없이 이 자를 부른다. 캡처가 없으면 곱게 끝낸다 — 즉사 금지(937 규약)."""
    if '--ref-only' in sys.argv:
        if '--glyph' not in sys.argv:
            print('(--ref-only 는 --glyph 절만 낸다 — 문턱 스윕은 우리 쪽 창이 있어야 한다)')
            return
        print('\n=== ⚑ 윗줄 «2000%%» 글리프/틈 분해 — ref 절만 (%s 걸음) ==='
              % ('정수' if INT_STEP else '부분 화소'))
        for t in (50, 90, 110):
            print(' 문턱 %d' % t)
            glyph_split(ref, (350, 330, 355), t, K, 'ref 아래카드 윗줄')
        return

    ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
    g = json.load(open(geo))

    # 우리 창 — 배지 상자 ±20 (배지가 있는 카드만; 세 번째 카드는 배지가 없다)
    our_wins = []
    for c in g['cards']:
        b = c['bdg']
        if b is None:
            continue
        x0 = int(b['x']) - 20
        y0, y1 = int(b['y']) - 20, int(b['y'] + b['h']) + 20
        # 배지가 실제로 그려졌는지(분홍이 있는지) 확인 — 3번 카드는 판이 없다
        if pink_mask(ours[y0:y1, x0:], 60).sum() < 200:
            continue
        our_wins.append((c['id'], (x0, y0, y1)))

    if '--glyph' in sys.argv:
        print('\n=== ⚑ 윗줄 «2000%» 글리프/틈 분해 (LESSONS 92-곁가지3) — 우리 px 환산 ===')
        for t in (50, 90, 110):
            print(' 문턱 %d' % t)
            # ref 윗줄만 — 아래 카드(초록)의 윗줄 행 범위
            glyph_split(ref, (350, 330, 355), t, K, 'ref 아래카드 윗줄')
            for cid, (wx, wy0, wy1) in our_wins:
                # 우리 윗줄 = 배지 상자 상변 + 48(top) 부터 line-height 48 + 여유
                glyph_split(ours, (wx, wy0 + 63, wy0 + 118), t, 1.0, '우리 %s 윗줄' % cid)
        return

    for axis, steps, fn in (('① 분홍 별판', PINK_STEPS, pink_mask),
                            ('② 노랑 글자', YEL_STEPS, yel_mask)):
        print('\n=== %s — 문턱 스윕 (우리 px 환산) ===' % axis)
        print('%-6s | %-27s | %-27s | %s' % ('문턱', 'ref 폭×높이 (위/아래 카드)',
                                             '우리 폭×높이', 'Δ폭 % (우리÷ref−1)'))
        refs = [measure(ref, w, steps, fn, K) for w in REF_WIN]
        caps = [measure(ours, w, steps, fn, 1.0) for _, w in our_wins]
        for i, t in enumerate(steps):
            rw = [r[i][1] for r in refs]
            rh = [r[i][2] for r in refs]
            cw = [c[i][1] for c in caps]
            ch = [c[i][2] for c in caps]
            rwm = np.mean([v for v in rw if v]) if any(rw) else float('nan')
            cwm = np.mean([v for v in cw if v]) if any(cw) else float('nan')
            print('%-6d | %-27s | %-27s | %+.1f%%' % (
                t,
                ' / '.join('%.1f×%.1f' % (w, h) if w else '—' for w, h in zip(rw, rh)),
                ' / '.join('%.1f×%.1f' % (w, h) if w else '—' for w, h in zip(cw, ch)),
                (cwm / rwm - 1) * 100 if rwm == rwm else float('nan')))

    print('\n(창: ref %s · 우리 %s)' % (REF_WIN, [w for _, w in our_wins]))


if __name__ == '__main__':
    main()
