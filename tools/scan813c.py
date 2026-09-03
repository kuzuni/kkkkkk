#!/usr/bin/env python3
# 작업 813 6회차 — **세 번째 자**. 안내문 «위:아래» 여백의 레퍼런스 값을 화소로 가른다.
#
#   python3 tools/scan813c.py
#
# 왜 필요한가 — 이 값은 두 세대의 채점자 넷이 **2 대 2 로 갈렸다**:
#   · 1회차 CF·CG : 위 31~38 : 아래 18~23  ⇒ 아래/위 **0.58~0.62**  (게이트 [3] 이 이 대역을 쓴다)
#   · 5회차 CP·CQ : 위 26.7 / 24.4 : 아래 20.0 ⇒ 아래/위 **0.75 / 0.82**
# 둘 다 «잉크 fill · 외곽선 제외» 라고 잣대를 밝혔고 화소 도구로 쟀다. 5회차 §22 가
# «세 번째 자를 세워 갈라라 — 그 전에 값을 옮기면 833 8회차의 «흔들리는 경계» 를 되풀이한다»
# 로 놓은 자리다. 사람의 눈이 아니라 **파일의 화소**에 같은 질문을 다시 던진다.
#
# 재는 것(전부 `docs/ref/89-유물-팝업.png` 486×687 크롭의 원본 좌표) — r5 브리핑의 정의 그대로:
#   ⓐ 수반 하변  = 돌 수반 아래 **받침 밑판 외곽선의 최하단**(사발 바닥이 아니다).
#                  밑판은 원근이 있는 사다리꼴이라 **가로로 가장 긴 밝은 줄**이 그 아래변이다.
#   ⓑ 안내문 잉크 = 크림/탠골드 2줄 글자의 **칠해지는 자리**(상자가 아니다).
#   ⓒ 패널 안쪽 하변 = 하단 테두리 **조립체의 최상단**(어두운 안쪽 선 + 금테 띠가 다 테두리다).
#                     ⚑ 887 이 정정한 자리다 — 「금테의 안쪽 첫 행」 은 띠 두께가 두 이미지에서
#                       다르면 서로 다른 것을 잰다(아래 계보 주석).
# 그리고 프레임 환산은 813·859 가 쓴 것과 같은 k = 1080 / 486.
#
# ⚠ 이 자는 «어디가 밑판인가» 를 **인상으로 고르지 않는다** — 배경 결(스톤 텍스처)이 lum 20~40 로
#   깔려 있어 문턱 하나로는 못 가른다. 그래서 같은 행의 **좌우 여백 띠**(물체가 없는 자리)를
#   그 행의 배경 기준선으로 삼아 «중앙 띠가 배경보다 얼마나 밝은가» 로 묻고, 그 초과가
#   가로로 **길게 이어지는 줄**만 외곽선으로 인정한다. 밑판 아래의 그림자는 길이가 짧아 탈락한다.
import sys

try:
    from PIL import Image
except ImportError:                                   # 자가 환경 때문에 죽지 않게
    print('scan813c: Pillow 없음 — `pip install pillow` 후 다시 돌려라', file=sys.stderr)
    sys.exit(1)

REF = 'docs/ref/89-유물-팝업.png'
K = 1080 / 486.0            # 크롭 폭 → 프레임 폭 환산(859·813 이 쓴 것과 같은 상수)
SIDE = list(range(30, 110)) + list(range(380, 455))   # 배경 기준선용 좌우 띠
CENTER = (150, 340)         # 수반·받침이 들어 있는 중앙 띠
INK_TH = 110                # 안내문 글자 잉크(크림 #EFE... · 탠골드)와 배경을 가르는 문턱
EDGE_TH = 12                # 배경 대비 이 계조 이상 밝으면 «칠해진 화소»
RUN_MIN = 60                # 외곽선으로 인정할 최소 가로 연속 길이(px) — 그림자 배제


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def main():
    im = Image.open(REF).convert('RGB')
    W, H = im.size
    px = im.load()

    # ── ⓒ 패널 안쪽 하변 — 아래에서 올라오며 금테(가로로 꽉 찬 밝은 줄)를 찾고 그 위 첫 행 ──
    gold = None
    for y in range(H - 1, H // 2, -1):
        n = sum(1 for x in range(20, W - 20) if lum(px[x, y]) > 110)
        if n > (W - 40) * 0.9:
            gold = y
            break
    # ── 이 한 줄의 계보(세 판) — 887 이 세 번째로 고쳤다. 세 문장을 다 남긴다 ──
    #  · 6회차까지 : `inner = gold - 2` 계열(배경 마지막 행) ⇒ 아래 9 · 비 0.90
    #  · 7회차 정정: `inner = gold - 1` — CR·CS 가 각자 «아래 10» 을 내서 «내 자의 off-by-one»
    #                으로 읽고 안쪽 면을 «금테의 첫 행» 으로 옮겼다 ⇒ 아래 10 · 비 1.00
    #  · 887 재정정: **그 정정이 경계를 테두리 «안» 으로 밀어 넣은 것**이었다. 이 그림의 하단
    #                테두리는 한 줄이 아니라 **조립체**다 — 어두운 안쪽 선(ref y680 · 화소 0.0)
    #                위에 금테 띠(ref y681..682)가 얹힌다. `gold - 1` 은 그 **띠 안**을 가리킨다.
    #    ⚑ 왜 치명적인가 — 띠 두께가 두 이미지에서 다르다(레퍼런스 **2px** ↔ 우리 캡처 **5px**).
    #      그래서 같은 규약처럼 보이는 이 한 줄이 레퍼런스에서는 1 ref px(=2.2 프레임 px)만,
    #      우리 캡처에서는 **5px** 을 훔친다 ⇒ «ref 1.00 ↔ 우리 0.96 = 3% 차» 라는 **거짓 일치**가
    #      만들어졌다(실제는 0.90 ↔ 0.76 = 15.6% 차). 상세·표는 `tools/scan887.py` · 887 review.
    #    ⇒ 경계는 **테두리 조립체의 최상단**(어두운 안쪽 선의 첫 행)이다. 그래야 위 끝점
    #      («밑판 외곽선의 **최하단**» = 위 물체의 마지막 칠해진 행)과 같은 뜻의 자가 된다.
    from scan887 import find_border            # 자를 베끼지 않고 **한 곳**에서 읽는다(833 선례)
    b = find_border(px, W, H)
    inner = b['dark_top']                      # 패널 안쪽 면 = 테두리 조립체의 최상단

    # ── ⓑ 안내문 잉크 — 금테 바로 위에서 **올라오며** 글자 줄 뭉치 둘만 집는다 ──
    #    ⚠ 문턱만 걸면 수반의 하이라이트(같은 밝기)까지 «글자» 로 센다 — 그래서 위로 올라가다
    #      **셋째 빈 구간**을 만나면 멈춘다(빈 구간 둘 = 두 줄 사이 + 안내문 위 여백).
    lit = lambda y: sum(1 for x in range(20, W - 20) if lum(px[x, y]) > INK_TH) >= 20
    rows, gaps, run = [], 0, False
    for y in range(inner - 1, inner - 90, -1):
        if lit(y):
            rows.append(y)
            run = True
        elif run:
            gaps += 1
            run = False
            if gaps >= 2 and len(rows) > 12:
                break
    ink_top, ink_bot = min(rows), max(rows)

    # ── ⓐ 수반 하변 — 잉크 위쪽에서 «가장 긴 밝은 가로줄»(밑판 윗변·아랫변) ──
    runs = []
    for y in range(ink_top - 30, ink_top):
        base = sum(lum(px[x, y]) for x in SIDE) / len(SIDE)
        th, best, cur, start, bs = base + EDGE_TH, 0, 0, None, None
        for x in range(*CENTER):
            if lum(px[x, y]) > th:
                if cur == 0:
                    start = x
                cur += 1
                if cur > best:
                    best, bs = cur, start
            else:
                cur = 0
        runs.append((y, best, bs))
    edges = [r for r in runs if r[1] >= RUN_MIN]
    plate_top = min(edges)[0]
    plate_bot = max(e[0] for e in edges if e[1] == max(x[1] for x in edges))

    above, below = ink_top - plate_bot, inner - ink_bot
    ratio = below / above

    print('SCAN813C — 안내문 위:아래 여백의 «세 번째 자» (레퍼런스 %s · %dx%d)' % (REF, W, H))
    print()
    print('  [ⓐ] 받침 밑판 — 윗변 y%d · **아랫변 y%d**(가로 연속 %dpx = 최장)'
          % (plate_top, plate_bot, max(x[1] for x in edges)))
    print('       ⇒ 밑판은 아래로 넓어지는 사다리꼴이다(원근) — 최장 줄이 곧 아랫변.')
    print('  [ⓑ] 안내문 잉크 — 상변 y%d · 하변 y%d (2줄)' % (ink_top, ink_bot))
    print('  [ⓒ] 패널 안쪽 하변 — y%d = 테두리 조립체 최상단 (어두운 안쪽 선 y%d..%d · 금테 띠 y%d..%d)'
          % (inner, b['dark_top'], b['gold_top'] - 1, b['gold_top'], b['gold_bot']))
    print()
    print('  위(수반 하변 → 잉크 상변)   = %2d ref px  = **%.1f** 프레임 px' % (above, above * K))
    print('  아래(잉크 하변 → 금테 안쪽) = %2d ref px  = **%.1f** 프레임 px' % (below, below * K))
    print('  아래/위 = **%.2f**' % ratio)
    print()
    print('  대조 — 1회차 CF·CG 0.58~0.62 · 5회차 CP 0.75 · CQ 0.82 · 6·7회차 CR·CS 1.00 · **887 확정 0.90**')
    print('  ⚑ 887 재정정 — 7회차의 1.00 은 경계를 **금테 띠 «안»** 으로 잡은 값이다. 띠 두께가')
    print('    레퍼런스 2px ↔ 우리 캡처 5px 이라 그 규약은 두 쪽에서 서로 다른 것을 잰다(거짓 일치).')
    print('    테두리 조립체 최상단으로 맞추면 **위 10 : 아래 9 = 0.90** 이고, 같은 자를 우리 캡처에')
    print('    대면 **0.76** 이다(`tools/scan887.py` · `tools/scan813d.py`).')
    print('  ⇒ 1회차의 0.58~0.62 는 밑판 아랫변이 아니라 밑판 **안쪽**(y%d~%d 대)을 수반 하변으로' % (plate_top, plate_bot - 2))
    print('    읽은 값이다(그 자리로 재면 위 14~17 ref px) — 그 갈림은 5회차 쪽으로 닫혔다.')


if __name__ == '__main__':
    main()
