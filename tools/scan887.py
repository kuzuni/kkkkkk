#!/usr/bin/env python3
# 작업 887 — 안내문 «위:아래» 여백의 **자를 정하는 자**.
#
#   python3 tools/scan887.py                     # 레퍼런스 + docs/shots 의 캡처 전부
#   python3 tools/scan887.py <캡처.png> ...      # 캡처를 지정
#   python3 tools/scan887.py --json
#
# ── 왜 또 자인가 ─────────────────────────────────────────────────────────────
# 이 한 값을 두고 채점자 넷이 **2 대 2** 로 갈렸다(879 3회차 §19):
#   DL 1.30 · DN 1.33(둘 다 «결함») ↔ DM 1.10 · DO 1.07(둘 다 «오차범위»)
# 그리고 저장소 안의 자 셋은 **또 다른 세 값**을 낸다:
#   · `verify813` [3]      아래/위 **1.00**  ← Range 상자(줄 상자)
#   · `tools/scan813d.py`  아래/위 **0.96**  ← 우리 캡처의 화소
#   · `tools/scan813c.py`  아래/위 **1.00**  ← 레퍼런스의 화소(과녁)
# 887 은 «누가 옳은가» 가 아니라 **«어느 자가 이 약속의 자인가»** 를 정하는 작업이다.
# 정하기 전에는 어느 쪽으로 제품을 고쳐도 반대편 자가 빨개진다(등재문).
#
# ── 이 자가 하는 일 ─────────────────────────────────────────────────────────
# 레퍼런스와 우리 캡처를 **한 벌의 규약**으로 재고, 그 규약 안에서 **끝점 선택 3종**을
# 나란히 찍는다. 갈림의 크기를 «누가 뭐라고 했다» 가 아니라 **px 로** 보이게 하는 것이 목적이다.
#
#   위   = 받침 밑판 외곽선 최하단 → 안내문 첫 줄 **잉크** 상변
#   아래 = 안내문 마지막 줄 **잉크** 하변 → 패널 하단 «테두리»
#          ⚑ 이 «테두리» 가 갈림의 전부다. 아래에서 위로 올라오며 만나는 것은 셋이다:
#            B1  금테 띠의 **아래쪽 안**(현행 scan813c/scan813d — 아래에서 처음 만난 밝은 줄의 한 행 위)
#            B2  금테 띠의 **첫 행**(띠의 위쪽 경계)
#            B3  금테 위 **어두운 안쪽 선**의 첫 행 = 테두리 부품의 최상단  ← 눈이 «패널 안» 이라고 보는 자리
#          B1 은 띠 «안» 을 가리키므로 띠가 두꺼울수록 아래 여백을 크게 본다.
#          레퍼런스 띠는 2px(≈4.4 프레임 px)이고 우리 띠는 5px 이라 **그 오차가 안 맞아떨어진다** —
#          같은 규약처럼 보이지만 두 쪽에서 서로 다른 값을 훔친다.
#
# 잉크 문턱은 sweep 한다(90·110·140). 문턱으로 답이 바뀌면 그 자는 이 약속을 못 맡는다
# (A3-ⓑ «임계 스윕 없는 크기 지적은 믿지 마라» 의 자기 적용).
import sys
import json
import glob

try:
    from PIL import Image
except ImportError:
    print('scan887: Pillow 없음 — `pip install pillow` 후 다시 돌려라', file=sys.stderr)
    sys.exit(1)

REF = 'docs/ref/89-유물-팝업.png'
REF_W = 486.0                 # 813·859 가 쓴 것과 같은 크롭 폭
FRAME_W = 1080.0
TH_SWEEP = (90, 110, 140)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def rows(px, W, y, x1, x2):
    return [lum(px[x, y]) for x in range(x1, x2)]


def find_border(px, W, H):
    """패널 하단 테두리 조립체를 아래에서 위로 찾는다.

    반환 — dict(gold_bot, gold_top, dark_top)
      gold_*  : 가로로 꽉 찬 밝은 띠(금테)의 아래·위 행
      dark_top: 그 띠 바로 위에 붙은 «어두운 안쪽 선» 의 첫 행(없으면 gold_top)
    ⚠ «꽉 찬» 의 기준은 폭이 아니라 **비율**이다 — 486 과 1080 을 같은 규약으로 재려면
      절대 px 상수를 쓰면 안 된다(A1 2차 라운드 교훈의 자기 적용).
    """
    x1, x2 = int(W * 0.12), int(W * 0.88)
    span = x2 - x1
    gold_bot = None
    for y in range(H - 1, H // 2, -1):
        r = rows(px, W, y, x1, x2)
        if sum(1 for v in r if v > 90) > span * 0.80:
            gold_bot = y
            break
    if gold_bot is None:
        return None
    gold_top = gold_bot
    y = gold_bot - 1
    while y > 0:
        r = rows(px, W, y, x1, x2)
        # 띠의 «위쪽 경계» — 여전히 가로로 꽉 차 있으면 아직 띠 안이다(어두운 쪽 끝도 띠다).
        if sum(1 for v in r if v > 55) > span * 0.80:
            gold_top = y
            y -= 1
        else:
            break
    # 어두운 안쪽 선 — 띠 바로 위에서 «배경보다 어둡고 가로로 꽉 찬» 행이 이어지는 동안
    dark_top = gold_top
    y = gold_top - 1
    while y > 0:
        r = rows(px, W, y, x1, x2)
        if max(r) < 12:                       # 검정에 가까운 줄(그림자·안쪽 선)
            dark_top = y
            y -= 1
        else:
            break
    return dict(gold_bot=gold_bot, gold_top=gold_top, dark_top=dark_top)


def find_ink(px, W, y_from, th):
    """y_from 에서 위로 올라오며 «성긴 밝은 줄»(글자)의 하변·상변을 찾는다.

    글자 줄은 가로로 성기다(밝은 화소가 폭의 40% 미만) — 이 상한이 없으면 금테가 글자로 읽힌다
    (scan813d 의 주석이 남긴 함정 그대로).
    """
    x1, x2 = int(W * 0.12), int(W * 0.88)
    span = x2 - x1
    lo = max(4, int(span * 0.008))            # 잡음 한 점을 글자로 읽지 않게

    def ink_row(y):
        n = sum(1 for v in rows(px, W, y, x1, x2) if v > th)
        return lo <= n < span * 0.40

    ink_bot = None
    for y in range(y_from, y_from - int(W * 0.25), -1):
        if ink_row(y):
            ink_bot = y
            break
    if ink_bot is None:
        return None, None
    ink_top, blank = ink_bot, 0
    gap = max(6, int(W * 0.022))              # 두 줄 사이 행간(ref 7 · 프레임 16)
    y = ink_bot
    while y > 0 and blank < gap:
        y -= 1
        if ink_row(y):
            ink_top, blank = y, 0
        else:
            blank += 1
    return ink_top, ink_bot


def find_base(px, W, ink_top):
    """받침 밑판 외곽선의 **최하단** — 잉크 위 창에서 «가장 긴 밝은 가로줄».

    밑판은 원근이 있는 사다리꼴이라 최장 줄이 곧 아랫변이다(scan813c 규약).
    배경 기준선은 같은 행의 좌우 여백 띠에서 뽑는다(스톤 텍스처가 문턱 하나로는 안 갈린다).
    """
    side = list(range(int(W * 0.04), int(W * 0.14))) + list(range(int(W * 0.86), int(W * 0.96)))
    cx1, cx2 = int(W * 0.28), int(W * 0.74)
    run_min = int(W * 0.115)                  # ref 56 · 프레임 124 — 밑판 그림자는 이보다 짧다
    # ⚠ 창을 넓히면 **사발**(밑판보다 넓다)이 «최장 줄» 을 가져간다 — 813 의 두 자와 같은 폭으로 좁힌다
    #   (scan813d 는 프레임 90px = 8.3%W · scan813c 는 ref 40px = 8.2%W).
    best = (0, None)
    for y in range(ink_top - int(W * 0.085), ink_top):
        base = sum(lum(px[x, y]) for x in side) / len(side)
        run = cur = 0
        for x in range(cx1, cx2):
            if lum(px[x, y]) - base > 12:
                cur += 1
                run = max(run, cur)
            else:
                cur = 0
        if run >= run_min and run >= best[0]:
            best = (run, y)                   # 최장 = 아랫변(같은 값이면 아래쪽을 남긴다)
    return best[1], best[0]


def measure(path, native_w):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    k = FRAME_W / native_w                    # 프레임 px 환산
    b = find_border(px, W, H)
    if not b:
        return None
    out = dict(path=path, W=W, H=H, k=k, border=b, th={})
    for th in TH_SWEEP:
        ink_top, ink_bot = find_ink(px, W, b['dark_top'] - 1, th)
        if ink_top is None:
            continue
        base, run = find_base(px, W, ink_top)
        if base is None:
            continue
        up = ink_top - base
        ends = dict(B1=b['gold_bot'] - 1, B2=b['gold_top'], B3=b['dark_top'])
        out['th'][th] = dict(ink_top=ink_top, ink_bot=ink_bot, base=base, run=run, up=up,
                             down={n: v - ink_bot for n, v in ends.items()},
                             ratio={n: round((v - ink_bot) / up, 3) for n, v in ends.items()})
    return out


def fmt(r):
    b = r['border']
    print(f"  {r['path']}  ({r['W']}x{r['H']} · 환산 ×{r['k']:.3f})")
    print(f"    테두리 — 어두운 안쪽 선 y{b['dark_top']} · 금테 띠 y{b['gold_top']}..{b['gold_bot']}"
          f" (띠 두께 {b['gold_bot'] - b['gold_top'] + 1}px)")
    for th, d in r['th'].items():
        up_f = d['up'] * r['k']
        print(f"    [문턱 {th}] 밑판 아랫변 y{d['base']}(연속 {d['run']}px) · 잉크 {d['ink_top']}..{d['ink_bot']}"
              f" · 위 {d['up']}px = {up_f:.1f} 프레임px")
        for n, label in (('B1', '금테 띠 «안»(현행 813 자)'), ('B2', '금테 띠 첫 행'),
                         ('B3', '어두운 안쪽 선 첫 행')):
            dn = d['down'][n]
            print(f"        {n} {label:<22} 아래 {dn}px = {dn * r['k']:5.1f} 프레임px"
                  f" · 아래/위 = {d['ratio'][n]:.3f} · 위/아래 = {(1 / d['ratio'][n] if d['ratio'][n] else 0):.3f}")
    print()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    shots = args or sorted(glob.glob('docs/shots/*-89-*.png'))
    shots = [s for s in shots if 'strip' not in s]
    print('SCAN887 — 안내문 위:아래 여백의 «자» 를 정하는 자 (레퍼런스와 캡처를 한 규약으로)\n')
    ref = measure(REF, REF_W)
    if not ref:
        print('  레퍼런스에서 테두리를 못 찾았다', file=sys.stderr)
        return 1
    print('■ 레퍼런스')
    fmt(ref)
    caps = []
    print('■ 우리 캡처')
    for s in shots:
        r = measure(s, FRAME_W)
        if not r:
            print(f'  {s}: 랜드마크를 못 찾았다')
            continue
        caps.append(r)
        fmt(r)
    if '--json' in sys.argv:
        print(json.dumps(dict(ref=ref, caps=caps), ensure_ascii=False, indent=1))
        return 0
    # ── 요약 — 끝점 선택이 답을 얼마나 흔드는가 ──
    print('■ 끝점 선택이 흔드는 폭 (문턱 110 · 아래/위)')
    th = 110
    print(f"    {'':22}{'레퍼런스':>10}{'우리(2280)':>12}{'차이':>10}")
    ours = next((c for c in caps if '2280' in c['path']), caps[0] if caps else None)
    for n, label in (('B1', '금테 띠 «안»'), ('B2', '금테 띠 첫 행'), ('B3', '어두운 안쪽 선')):
        rr = ref['th'][th]['ratio'][n]
        cc = ours['th'][th]['ratio'][n] if ours else 0
        print(f"    {n} {label:<19}{rr:>10.3f}{cc:>12.3f}{(cc - rr) / rr * 100:>9.1f}%")
    print()
    print('  ⚑ 레퍼런스 한 눈금 = 프레임 %.2f px 다 — 위·아래가 각 9~10 ref px 이므로' % (FRAME_W / REF_W))
    print('    ±1 눈금이 비를 ±10% 흔든다. 이보다 좁은 대역은 레퍼런스가 감당 못 하는 정밀도다.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
