#!/usr/bin/env python3
# 작업 813 8회차 — **세 번째 자, 이번엔 «우리 렌더» 쪽**.
#
#   python3 tools/scan813d.py [캡처.png ...]     (기본: docs/shots/754-r7-89-2280.png)
#
# 왜 필요한가 — 6·7회차의 `scan813c` 는 **레퍼런스만** 쟀다(1.00 = 위 = 아래). 우리 렌더 쪽은
# `verify813` [3] 이 **DOM 상자에서 역산**해 «위 22.0 : 아래 22.0» 을 찍고 있었는데,
# 8회차 채점자 **둘이 각자** 찍힌 화소를 재 «위 23 : 아래 20 = **1.15**» 를 냈다.
# 두 사람이 독립으로 같은 값을 냈으므로 «채점자 대 채점자» 가 아니라 **«상자 대 화소»** 다.
# ⇒ 레퍼런스에 썼던 자(scan813c)를 **그대로** 우리 캡처에 대 본다. 같은 뜻의 자로 재야
#   «우리가 ref 의 1.00 을 지키는가» 라는 질문이 성립한다(A1 2차 라운드 교훈: 계측 정의가
#   다르면 값이 일치해도 틀린다).
#
# 재는 것(캡처 좌표, 폭 1080):
#   ⓐ 받침 밑판 아랫변 = 수반 아래 «가로로 가장 긴 밝은 줄»(scan813c 와 같은 규약 — 최장 = 아랫변)
#   ⓑ 안내문 잉크 상·하변 = 크림/탠골드 2줄 글자의 칠해지는 자리
#   ⓒ 패널 안쪽 하변 = 금테의 **안쪽** 첫 행(금테 자신은 제외)
# 출력은 «위 : 아래 : 아래/위» 와 ref(1.00) 대비.
import os
import sys

from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DEFAULT = ['docs/shots/754-r7-89-2280.png']
INK_TH = 110        # 안내문 글자 잉크 ↔ 배경 문턱 (scan813c 와 같은 값)
EDGE_TH = 12        # 배경 대비 이 계조 이상 밝으면 «칠해진 화소»
RUN_MIN = 120       # 외곽선으로 인정할 최소 가로 연속 길이(px) — 프레임 폭 1080 기준(ref 60 의 ×2.22)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def scan(path):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()

    # ── 패널 하단 «테두리 조립체» — 어두운 안쪽 선 + 금테 띠. 887 이 경계를 정정한 자리다 ──
    #    옛 판은 `inner_bottom = gold_bottom - 1`(아래에서 처음 만난 밝은 줄의 한 행 위)이었는데
    #    그 자리는 **금테 띠 «안»** 이다. 우리 캡처의 띠는 **5px**, 레퍼런스는 **2px** 이라
    #    같은 규약이 두 쪽에서 서로 다른 것을 잰다 — 그 비대칭이 «ref 1.00 ↔ 우리 0.96» 이라는
    #    거짓 일치를 만들었다(실제는 0.90 ↔ 0.76). 상세는 `tools/scan887.py` · 887 review.
    from scan887 import find_border                   # 자는 한 곳에서만 정의한다
    b = find_border(px, W, H)
    if not b:
        return None
    gold_bottom = b['gold_bot']
    inner_bottom = b['dark_top']                      # ⓒ 테두리 조립체의 최상단

    # ── ⓑ 안내문 잉크 — 금테 안쪽에서 위로 올라오며 밝은 글자 화소가 있는 행 ──
    #    ⚠ 금테(와 그 글로우)는 «가로로 꽉 찬 밝은 줄» 이라 문턱만으로는 글자와 안 갈린다 —
    #    글자 줄은 **성기다**(밝은 화소가 폭의 40% 미만). 그 상한이 없으면 잉크 하변이 금테로 붙어
    #    «아래 여백 0» 이 나온다(이 자의 1차 판이 실제로 그랬다).
    span = range(120, W - 120)

    def ink_row(y):
        n = sum(1 for x in span if lum(px[x, y]) > INK_TH)
        return 6 <= n < len(span) * 0.40

    ink_bot = None
    for y in range(inner_bottom, inner_bottom - 200, -1):
        if ink_row(y):
            ink_bot = y
            break
    ink_top = ink_bot
    blank = 0
    y = ink_bot
    while y > 0 and blank < 24:                       # 2줄 사이의 행간(≈10)은 건너뛴다
        y -= 1
        if ink_row(y):
            ink_top, blank = y, 0
        else:
            blank += 1

    # ── ⓐ 받침 밑판 아랫변 — 잉크 상변 위 창에서 «가장 긴 밝은 가로줄» ──
    #    배경 기준선은 같은 행의 좌우 여백 띠에서 뽑는다(scan813c 와 같은 규약).
    best = (0, None)
    for y in range(ink_top - 90, ink_top):
        side = [lum(px[x, y]) for x in list(range(40, 150)) + list(range(930, 1040))]
        base = sum(side) / len(side)
        run = cur = 0
        for x in range(300, 800):
            if lum(px[x, y]) - base > EDGE_TH:
                cur += 1
                run = max(run, cur)
            else:
                cur = 0
        if run >= RUN_MIN and run >= best[0]:
            best = (run, y)                            # «최장 줄» = 사다리꼴 아랫변
    base_u1 = best[1]
    # ── ⚑⚑ 905 — 위 끝점도 **한 곳**(scan887)에서 읽는다 ──
    #    U1(«최장 밝은 줄»)은 우리 캡처에서 밑판 검은 외곽선 바로 **위**(−2px · 다섯 프레임 전부)를
    #    짚는데 레퍼런스에서는 **아래**(+2px)를 짚는다 — 부호가 뒤집히면 같은 물체가 아니다.
    #    아래 끝점(ⓒ 조립체 최상단)과 같은 걷개로 맞춘 U3 이 약속의 자다. U1 은 대조용으로 남긴다.
    from scan887 import find_base_u3
    base_bot = find_base_u3(px, W, ink_top)
    return dict(path=path, base_bot=base_bot, base_u1=base_u1, run=best[0],
                ink_top=ink_top, ink_bot=ink_bot,
                inner_bottom=inner_bottom, gold=gold_bottom)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')] or DEFAULT
    print('SCAN813D — 안내문 위:아래 여백을 «우리 렌더의 화소» 로 (ref 과녁 0.750 — 905 정정)\n')
    bad = 0
    for p in args:
        r = scan(p)
        if not r or r['base_bot'] is None:
            print(f'  {p}: 랜드마크를 못 찾았다'); bad += 1; continue
        up = r['ink_top'] - r['base_bot']
        dn = r['inner_bottom'] - r['ink_bot']
        ratio = dn / up if up else 0
        mark = 'OK' if 0.67 <= ratio <= 0.83 else '❌'   # 과녁 0.750 ± 레퍼런스 한 눈금(±11%)
        print(f"  {p}")
        print(f"    받침 밑판 아랫변 y{r['base_bot']} (연속 {r['run']}px) · 잉크 {r['ink_top']}..{r['ink_bot']}"
              f" · 테두리 조립체 최상단 y{r['inner_bottom']}(금테 띠 하단 y{r['gold']})")
        print(f"    위 = {up}px · 아래 = {dn}px · 아래/위 = {ratio:.3f}  [{mark}]  (ref 0.750"
              f" · 옛 자 U1 y{r['base_u1']} 부호 {r['base_u1'] - r['base_bot']:+d})\n")
        if mark == '❌':
            bad += 1
    print('요약 — ' + ('전부 과녁 대역 안' if not bad else f'{bad}건이 대역 밖'))


if __name__ == '__main__':
    main()
