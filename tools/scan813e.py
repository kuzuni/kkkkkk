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
#
# ── ⚑⚑ 949 — 905 가 이 자를 두고 갔다 (2026-09-05) ───────────────────────────
# 905 는 위 끝점을 다시 세우며 `find_base` 를 **`find_base_u1`** 로 개명하고(기각한 자를
# 지우지 않고 대조용으로 남기는 333 처방) 형제 둘(`scan813c`·`scan813d`)을 **U3** 으로 옮겼는데,
# **이 임포터만** 옛 이름을 든 채였다 ⇒ `AttributeError` 로 즉사(재현 `node tools/probe949.js`).
# 즉사의 값은 «빨강» 이 아니다 — 결과 줄이 **한 줄도 안 남아** 회귀 스윕이 이 자를
# **«없는 자»** 로 지나간다(913 pngjs · 937 numpy 와 **글자 그대로 같은 얼굴**).
#
# 고친 것은 이름 한 줄이 아니라 **이 자의 주제**다. 이 파일은 위 끝점 후보를 «나란히 놓고
# 견주는» 자인데, 905 가 그 사이에 **약속의 자(U3)** 를 세웠다. 그래서 셋을 다 찍는다:
#   U1  옛 자 — 887 의 «가장 긴 밝은 줄»(⛔ 905 기각 · 대조용으로 남는다)
#   U2  이 자의 것 — «밝든 어둡든 |Δ|>d 로 칠해진 마지막 행»(옆 대비 · 문턱 sweep)
#   U3  905 확정 — «절대 어둠으로 칠해진 마지막 행»(아래 끝점과 **같은 걷개**)
# ⚠ U2 와 U3 은 같은 말처럼 보이지만 자가 다르다 — U2 는 **옆(여백 띠) 대비**라
#   레퍼런스의 «아래로 갈수록 어두워지는 배경 기울기» 를 물체로 읽을 수 있고(905 가 U1 에서
#   찍어낸 바로 그 병), U3 은 **절대 어둠**이라 두 그림에서 같은 것을 가리킨다. 그 차를
#   보이게 하는 것이 이제 이 자의 일이다.
# 939 규약도 같이 태웠다 — 못 재면 스택 트레이스가 아니라 «무엇이 안 됐는지 — 할 일» 한 줄 + **코드 3**.
import sys
import json
import glob
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scan887 as S                                  # noqa: E402

from pydep937 import Image, fail                      # 937 — 없으면 «한 줄 + 코드 2» · 939 — 못 재면 코드 3

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
    if not os.path.exists(path):
        fail('scan813e: 그림이 없다 — %s' % path,
             '레퍼런스는 저장소 안에 있고 캡처는 커밋 금지 자산이다 — `node tools/cap813.js` 로 먼저 찍어라')
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    b = S.find_border(px, W, H)
    if not b:
        return None
    ink_top, ink_bot = S.find_ink(px, W, b['dark_top'] - 1, th)
    if ink_top is None:
        return None
    down = b['dark_top'] - ink_bot                            # = scan887 의 B3 (셋이 일치하는 끝점)
    out = dict(path=path, W=W, H=H, ink_top=ink_top, ink_bot=ink_bot,
               down=down, bright=None, u3=None, delta={})
    base, _run = S.find_base_u1(px, W, ink_top)              # U1 — 887 의 «가장 긴 밝은 줄»(⛔ 905 기각)
    if base is not None:
        out['bright'] = dict(row=base, up=ink_top - base,
                             ratio=round(down / (ink_top - base), 3))
    # ── ⚑⚑ 949 — 905 의 **약속의 자**(U3)를 같은 표에 올린다 ──
    #    U1 을 되살리는 것이 아니라, 기각된 자 옆에 확정된 자를 놓아 «갈림의 크기» 를 px 로 보인다.
    #    U3 은 아래 끝점(B3)과 같은 걷개(«절대 어둠으로 칠해진 행»)라 두 끝점이 같은 뜻을 갖는다.
    u3 = S.find_base_u3(px, W, ink_top)
    if u3 and ink_top - u3:
        out['u3'] = dict(row=u3, up=ink_top - u3, ratio=round(down / (ink_top - u3), 3))
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
        print(f"    U1 밝은 아랫변 규칙선(⛔905 기각) 행 {b['row']} · 위 {b['up']:>3} · 아래/위 = {b['ratio']:.3f}")
    for d, v in r['delta'].items():
        print(f"    U2 마지막 칠해진 행 (|Δ|>{d:>2})   행 {v['row']} · 위 {v['up']:>3} · 아래/위 = "
              f"{v['ratio']:.3f}   (연속 {v['run']}px)")
    if r['u3']:
        u = r['u3']
        sgn = (u['row'] - r['bright']['row']) if r['bright'] else 0
        print(f"    U3 절대 어둠(905 약속의 자)      행 {u['row']} · 위 {u['up']:>3} · 아래/위 = "
              f"{u['ratio']:.3f}   (U1 대비 {sgn:+d}행)")
    print()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    shots = args or sorted(glob.glob('docs/shots/*-89-*.png'))
    shots = [s for s in shots if 'strip' not in s]
    print('SCAN813E — 안내문 «위» 끝점을 정의대로(«마지막 칠해진 행») 재는 넷째 자\n')
    ref = measure(S.REF, S.REF_W)
    if not ref:
        # 939 — «자가 못 쟀다» 는 코드 3 이다(1 = 오류 · 2 = 환경에 없음). 조용히 죽지 않는다.
        fail('scan813e: 레퍼런스에서 랜드마크(테두리·잉크)를 못 찾았다 — %s' % S.REF,
             '`python3 tools/scan887.py` 로 같은 그림에서 랜드마크가 잡히는지 먼저 보라')
    print('■ 레퍼런스')
    fmt(ref)
    # ── 949 — 이 자가 스스로 세운 규칙(머리말)을 스스로에게 댄다:
    #    «문턱은 sweep 한다. 문턱으로 답이 바뀌면 그 자도 이 약속을 못 맡는다»(A3-ⓑ 자기 적용)
    rowsU2 = sorted({v['row'] for v in ref['delta'].values()})
    if len(ref['delta']) >= 2:
        print('■ 자기 판정 — U2(옆 대비) 문턱 sweep %s ⇒ 행 %s' %
              (list(DELTA_SWEEP), '·'.join(str(r) for r in rowsU2)))
        if len(rowsU2) > 1:
            print('    ⛔ **U2 는 자기 손잡이에서 움직인다**(폭 %d행) — 이 자의 규칙대로면 U2 도 약속을 못 맡는다.'
                  % (rowsU2[-1] - rowsU2[0]))
            print('       905 가 U1 에서 찍어낸 것과 같은 병이다(옆 대비 자는 배경 기울기를 물체로 읽는다).')
            print('       ⇒ 위 끝점의 약속의 자는 **U3**(절대 어둠)이다 — `verify905` [3] 이 그 불변을 지킨다.')
        else:
            print('    U2 는 문턱 전 구간에서 한 행도 안 움직였다.')
        print()
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
        for name, get in (('U1 밝은 아랫변(⛔기각)', lambda r: r['bright'] and r['bright']['ratio']),
                          ('U2 마지막 칠해진 행', lambda r: r['delta'].get(12, {}).get('ratio')),
                          ('U3 절대 어둠(905)', lambda r: r['u3'] and r['u3']['ratio'])):
            rr, cc = get(ref), get(ours)
            if rr and cc:
                print(f'    {name:<22} 레퍼런스 {rr:.3f} · 우리 {cc:.3f} · 차이 {(cc - rr) / rr * 100:+.1f}%')
    else:
        print('    캡처가 없다 — 레퍼런스만 쟀다(캡처 PNG 는 커밋 금지 자산이라 없는 것이 정상이다).')
        print('    캡처를 대려면 인자로 png 를 주거나 `docs/shots/*-89-*.png` 를 먼저 찍어라.')
    print()
    return 0


if __name__ == '__main__':
    sys.exit(main())
