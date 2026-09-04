#!/usr/bin/env python3
# 작업 813 9회차 — **넷째 자**. 안내문 «위» 여백의 위 끝점을 «정의대로» 재는 자.
#
#   python3 tools/scan813e.py                       # 레퍼런스 + docs/shots 의 89 캡처 전부
#   python3 tools/scan813e.py <캡처.png> ...        # 캡처를 지정
#   python3 tools/scan813e.py --json
#
# ── 왜 자를 또 세우는가 ──────────────────────────────────────────────────────
# 9회차 채점 2인이 **같은 자리에서 갈렸다**. 두 사람 다 브리핑의 규약(«받침 밑판 외곽선의
# **최하단**» · «하단 테두리 **조립체 최상단**»)을 따랐다고 적었는데 답이 다르다:
#
#   · EF  위 22 · 아래 21 ⇒ 0.955  «대역 안 · 결함 아님»
#   · EE  위 20 · 아래 21 ⇒ 1.050  «대역 밖 · 결함»
#   · `scan887`(887 이 세운 자) 위 23 · 아래 21 ⇒ 0.913  «과녁 0.90 에 세웠다»
#
# **아래 끝점은 셋이 완전히 일치한다(21).** 갈리는 것은 **위 끝점 한 행**이고, 그 후보가 셋이다:
#
#   U1  밑판 **밝은 아랫변 규칙선**(= `scan887.find_base` — «가장 긴 밝은 가로줄»)
#   U2  그 아래 **검은 외곽선의 마지막 행**(EE 가 잰 자리)
#   U3  둘 사이 어딘가(EF — 문턱 차)
#
# ⚑ 정의는 이미 저장소 안에 적혀 있다. LESSONS 887 ② —
#     «끝점은 «훑는 방향» 이 아니라 **«그려진 것»** 으로 정의하라.
#      정의는 «아래 물체의 **첫 칠해진 행**» 이어야 하고, 그래야 위 끝점
#      («위 물체의 **마지막 칠해진 행**» = 받침 밑판 외곽선의 최하단)과 **같은 뜻의 자**가 된다.»
#
# 그런데 `scan887.find_base` 는 «가장 긴 **밝은** 줄» 을 찾는다 — **밝은 것만 칠해진 것으로 센다.**
# 검은 외곽선은 배경보다 **어둡기** 때문에 그 자에는 «안 칠해진 행» 으로 보인다. 887 이 아래 끝점에서
# 잡아낸 바로 그 비대칭(«검정 안쪽 선도 그려진 테두리다»)이 **위 끝점 쪽에 그대로 남아 있었다.**
#
# ⇒ 이 자는 위·아래를 **한 문장**으로 잰다:
#     위   = 안내문 잉크 위로 올라가며 만나는 «윗 물체의 **마지막 칠해진 행**»
#            (칠해짐 = 그 행의 좌우 여백 띠 밝기와 **밝든 어둡든** |Δ| > 문턱, 가로 연속 run_min 이상)
#     아래 = 안내문 잉크 아래로 내려가며 만나는 «아랫 물체의 **첫 칠해진 행**»
#            (= `scan887` 의 B3 «어두운 안쪽 선 첫 행» — 이미 같은 문장이라 그대로 쓴다)
#
# 문턱은 sweep 한다. 문턱으로 답이 바뀌면 그 자도 이 약속을 못 맡는다(A3-ⓑ 자기 적용).
#
# ⚠ 이 자는 `scan887` 을 **모듈로 재사용**한다(자를 베끼지 않는다 · 833 선례).
#   테두리·잉크 찾기는 887 의 것 그대로이고, 이 파일이 바꾸는 것은 **위 끝점 한 곳**뿐이다.
import sys
import json
import glob
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scan887 as S                                  # noqa: E402

try:
    from PIL import Image
except ImportError:
    print('scan813e: Pillow 없음 — `pip install pillow` 후 다시 돌려라', file=sys.stderr)
    sys.exit(1)

DELTA_SWEEP = (8, 12, 18)          # 배경 대비 |Δ| — 칠해진 것으로 셀 문턱


def find_last_painted(px, W, ink_top, delta):
    """안내문 잉크 위로 올라가며 만나는 **윗 물체의 마지막 칠해진 행**.

    «칠해짐» = 그 행 가운데 창에서, 같은 행 좌우 여백 띠의 평균 밝기와 **밝든 어둡든**
    |Δ| > delta 인 화소가 run_min 이상 **가로로 이어진다**.
    ⚠ `scan887.find_base` 와 창·run_min 은 **같은 값**을 쓴다(자의 폭이 달라지면 비교가 안 된다).
    바뀌는 것은 «밝은 것만» → «밝든 어둡든» 하나뿐이다.
    """
    side = list(range(int(W * 0.04), int(W * 0.14))) + list(range(int(W * 0.86), int(W * 0.96)))
    cx1, cx2 = int(W * 0.28), int(W * 0.74)
    run_min = int(W * 0.115)
    for y in range(ink_top - 1, ink_top - int(W * 0.085), -1):
        base = sum(S.lum(px[x, y]) for x in side) / len(side)
        run = cur = 0
        for x in range(cx1, cx2):
            if abs(S.lum(px[x, y]) - base) > delta:
                cur += 1
                run = max(run, cur)
            else:
                cur = 0
        if run >= run_min:
            return y, run
    return None, 0


def measure(path, native_w, th=110):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    b = S.find_border(px, W, H)
    if not b:
        return None
    ink_top, ink_bot = S.find_ink(px, W, b['dark_top'] - 1, th)
    if ink_top is None:
        return None
    out = dict(path=path, W=W, H=H, ink_top=ink_top, ink_bot=ink_bot,
               down=b['dark_top'] - ink_bot,                 # = scan887 의 B3 (셋이 일치하는 끝점)
               bright=None, delta={})
    base, _run = S.find_base(px, W, ink_top)                 # U1 — 887 의 «가장 긴 밝은 줄»
    if base is not None:
        out['bright'] = dict(row=base, up=ink_top - base,
                             ratio=round((b['dark_top'] - ink_bot) / (ink_top - base), 3))
    for d in DELTA_SWEEP:
        row, run = find_last_painted(px, W, ink_top, d)      # U2 — «마지막 칠해진 행»
        if row is None:
            continue
        up = ink_top - row
        out['delta'][d] = dict(row=row, run=run, up=up,
                               ratio=round((b['dark_top'] - ink_bot) / up, 3) if up else None)
    return out


def fmt(r):
    print(f"  {r['path']}  ({r['W']}x{r['H']})")
    print(f"    잉크 {r['ink_top']}..{r['ink_bot']} · 아래(= 조립체 최상단까지) **{r['down']}**")
    if r['bright']:
        b = r['bright']
        print(f"    U1 밝은 아랫변 규칙선(887 자)   행 {b['row']} · 위 {b['up']:>3} · 아래/위 = {b['ratio']:.3f}")
    for d, v in r['delta'].items():
        print(f"    U2 마지막 칠해진 행 (|Δ|>{d:>2})   행 {v['row']} · 위 {v['up']:>3} · 아래/위 = "
              f"{v['ratio']:.3f}   (연속 {v['run']}px)")
    print()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    shots = args or sorted(glob.glob('docs/shots/*-89-*.png'))
    shots = [s for s in shots if 'strip' not in s]
    print('SCAN813E — 안내문 «위» 끝점을 정의대로(«마지막 칠해진 행») 재는 넷째 자\n')
    ref = measure(S.REF, S.REF_W)
    if not ref:
        print('  레퍼런스에서 랜드마크를 못 찾았다', file=sys.stderr)
        return 1
    print('■ 레퍼런스')
    fmt(ref)
    caps = []
    print('■ 우리 캡처')
    for s in shots:
        r = measure(s, S.FRAME_W)
        if not r:
            print(f'  {s}: 랜드마크를 못 찾았다')
            continue
        caps.append(r)
        fmt(r)
    if '--json' in sys.argv:
        print(json.dumps(dict(ref=ref, caps=caps), ensure_ascii=False, indent=1))
        return 0
    print('■ 같은 문장을 두 그림에 댔을 때 (|Δ|>12)')
    ours = next((c for c in caps if '2280' in c['path']), caps[0] if caps else None)
    if ours:
        for name, get in (('U1 밝은 아랫변(887 자)', lambda r: r['bright'] and r['bright']['ratio']),
                          ('U2 마지막 칠해진 행', lambda r: r['delta'].get(12, {}).get('ratio'))):
            rr, cc = get(ref), get(ours)
            if rr and cc:
                print(f'    {name:<22} 레퍼런스 {rr:.3f} · 우리 {cc:.3f} · 차이 {(cc - rr) / rr * 100:+.1f}%')
    print()
    return 0


if __name__ == '__main__':
    sys.exit(main())
