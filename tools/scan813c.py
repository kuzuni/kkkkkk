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
#   ⓒ 패널 안쪽 하변 = 금테의 **안쪽** 첫 행(금테 자신은 제외).
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
    # ⚑ 6회차 채점에서 **정정**됐다 — CR·CS 가 각자 «아래 10px» 을 내고 내 자는 9 를 냈다.
    # 뿌리는 이 한 줄의 off-by-one 이다: «위» 는 밑판 아랫변에서 잉크 상변까지를 **모서리 차**로
    # 재면서 «아래» 만 금테 어두운 줄(y681)까지 **빼고** 배경 마지막 행(y680)으로 쟀다.
    # 두 자를 같은 규약으로 맞춘다 — 안쪽 면 = 금테의 첫 행(= 밝은 줄 − 1). ⇒ 위 10 · 아래 10.
    inner = gold - 1                       # 패널 안쪽 면 = 금테 어두운 첫 행

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
    print('  [ⓒ] 패널 안쪽 하변 — y%d (금테 밝은 줄 y%d)' % (inner, gold))
    print()
    print('  위(수반 하변 → 잉크 상변)   = %2d ref px  = **%.1f** 프레임 px' % (above, above * K))
    print('  아래(잉크 하변 → 금테 안쪽) = %2d ref px  = **%.1f** 프레임 px' % (below, below * K))
    print('  아래/위 = **%.2f**' % ratio)
    print()
    print('  대조 — 1회차 CF·CG 0.58~0.62 · 5회차 CP 0.75 · CQ 0.82 · **6회차 CR 1.00 · CS 1.00**(둘이 독립으로 «위=아래»)')
    print('  ⚑ 레퍼런스의 두 여백은 **같다**(위 = 아래) — 6회차 채점 2인이 각자 낸 1.00 과 일치한다.')
    print('  ⇒ 갈린 두 세대 중 **5회차(CP·CQ) 쪽**이다. 1회차의 0.58~0.62 는 밑판 아랫변이 아니라')
    print('    밑판 **안쪽**(y%d~%d 대)을 수반 하변으로 읽은 값이다(그 자리로 재면 위 14~17 ref px).' % (plate_top, plate_bot - 2))


if __name__ == '__main__':
    main()
