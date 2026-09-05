# 12 소환 결과 팝업 — 레퍼런스와 캡처를 **같은 마스크로 동시에** 재는 스캐너.
#
#   «누구를 믿느냐»가 아니라 «같은 마스크로 두 이미지를 동시에 재라» (1차 라운드 3회차 교훈).
#   임계값을 서로 다르게 잡으면 같은 요소가 «−9%» 도 되고 «Δ0» 도 된다 — 실제로 비평가 둘이
#   정반대 결론을 낸 적이 있다.
#
#   ref 1080x2340 (최상단 84px 상태바) / cap 1080x2280
#   상단 앵커: cap_y = ref_y - 84   ·   하단 앵커: cap_y = ref_y - 60   (측정표 §10)
#
# 사용:
#   python3 tools/scan12r.py [캡처경로]            → 사람이 읽는 대조표
#   python3 tools/scan12r.py [캡처경로] --json     → tools/verify12.js 용 JSON
import json
import sys
from pydep937 import Image

REF = 'docs/ref/12-소환-결과-팝업.jpg'


def bbox(im, pred, x0, x1, y0, y1):
    xs = []
    ys = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pred(im.getpixel((x, y))):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return [min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1]


def hruns(im, y, pred, x0=0, x1=1080, minlen=4):
    out = []
    s = None
    for x in range(x0, x1):
        if pred(im.getpixel((x, y))):
            if s is None:
                s = x
        else:
            if s is not None:
                out.append([s, x - 1])
                s = None
    if s is not None:
        out.append([s, x1 - 1])
    return [r for r in out if r[1] - r[0] + 1 >= minlen]


def vruns(im, x, pred, y0, y1, minlen=3):
    out = []
    s = None
    for y in range(y0, y1):
        if pred(im.getpixel((x, y))):
            if s is None:
                s = y
        else:
            if s is not None:
                out.append([s, y - 1])
                s = None
    if s is not None:
        out.append([s, y1 - 1])
    return [r for r in out if r[1] - r[0] + 1 >= minlen]


WHITE = lambda p: min(p) > 175          # 흰 잉크 · 밝은 라벨(#DFDFDF) 공통
BLACK = lambda p: max(p) < 30           # 검정 외곽선
PANEL = lambda p: abs(p[0] - 42) <= 14 and abs(p[1] - 40) <= 14 and abs(p[2] - 53) <= 14
ORANGE = lambda p: p[0] > 170 and 90 < p[1] < 225 and p[2] < 140

# ── 작업 327(2026-08-28, 저장소 주인 지시 «창이 너무 작음 — 세로로 2배») ────────────────
#   결과 패널을 ref 539 → **고정 1080(2.00배)** 으로 키우면서 두 가지가 **의도적으로** ref 를 벗어난다.
#   둘 다 «순수 평행이동» 이라 오프셋만 갈아 끼우면 이 스캐너의 목적(잉크 크기·서체·계조 회귀 감시)은
#   그대로 산다 — 값을 지우지 않고 **오프셋을 옮긴다**(작업 310·333 의 게이트 이관 선례).
#
#   ① 리본·패널 상단 그룹 : 패널이 커진 만큼 84 앵커(버튼)를 안 밀치려고 **위로 103** 떴다
#                           (패널 top 709 → 606 · 리본 641 → 538). ⇒ cap 오프셋 84 → **187**
#   ② 카드·배지 그룹      : 빈 면을 없애려고 `.sm-grid-in` 이 **세로 중앙정렬**이 됐다.
#                           ref 케이스(2행)에서 (868 − 328)/2 = 270 만큼 그리드 안에서 내려가고
#                           그리드 자체는 103 올라갔으므로 순변화 **아래로 167**
#                           (카드 top 815 → 982). ⇒ cap 오프셋 84 → **−83**
#   ③ 버튼·닫기(오프셋 60)는 **한 픽셀도 안 움직인다** — 84 하단 앵커가 그대로다.
SM_TOP = 187   # ① 리본·패널 상단 그룹 (= 84 + 103)
SM_CARD = -83  # ② 카드·배지 그룹 (= 84 − 167)

# ── 작업 747(2026-09-02) — «창» 과 «환산» 을 가른다 ────────────────────────────────
#   713 이 배수 바를 받으려고 패널 아래 여백을 넓히면서 카드 그룹이 위 오프셋보다 **더** 떠 있다
#   (713 −11 · 747 이 여유 14 를 더 넣어 **−25**). 이 자는 그 이탈을 두 자리에 나눠 적는다:
#     · 환산(`SM_CARD`)은 **327 모델 그대로** 둔다 — cap 값을 ref 축으로 되돌리는 식이고,
#       여기에 이탈을 섞으면 «어긋난 만큼 창도 같이 따라가» 표류가 영영 안 보인다.
#     · 창(아래 `SM_DY`)만 실제 자리를 따라간다 — 창은 «어디를 보는가» 일 뿐이라
#       잉크가 잘려 읽히는 것(713 1회차: 10×26 → 5×11)을 막는 것이 전부다.
#   ⇒ 이탈은 `tools/verify12.js` 의 `DY` **한 상수**에만 살고, 그 이상 표류하면 그대로 빨개진다.
#   되돌리려면 `#sumw` 의 네 값(868/212/85/127)과 함께 여기 SM_DY 를 0(327 시절)으로 두면 된다.
SM_DY = -25    # 카드·배지 그룹의 «의도적 이탈»(713 −11 → 747 −25) — 창에만 얹는다

# (키, 마스크, x0, x1, ref y0, ref y1, 세로오프셋(환산), 창 이탈)
INKS = [
    ('title',  WHITE, 400,  700,  735,  800, SM_TOP,  0),      # «소환 결과»
    ('close',  WHITE, 350,  740, 2110, 2180, 60,      0),      # «터치하여 닫기»
    ('lab1',   WHITE, 150,  340, 1790, 1835, 60,      0),      # 버튼① «10회 소환»
    ('lab2',   WHITE, 450,  640, 1790, 1835, 60,      0),      # 버튼② «10회 소환»
    ('lab3',   WHITE, 750,  940, 1790, 1835, 60,      0),      # 버튼③ «30회 소환»
    ('badge0', WHITE, 100,  132, 1030, 1076, SM_CARD, SM_DY),  # 개수 배지 r0c0
    ('badge1', WHITE, 100,  132, 1200, 1245, SM_CARD, SM_DY),  # 개수 배지 r1c0
]


def measure(cap_path):
    ref = Image.open(REF).convert('RGB')
    cap = Image.open(cap_path).convert('RGB')
    m = {'ref': {}, 'cap': {}}

    for key, mask, x0, x1, ry0, ry1, off, dy in INKS:
        m['ref'][key] = bbox(ref, mask, x0, x1, ry0, ry1)
        # 창은 실제 자리(= ref − off + dy)를 보고, 환산은 off 만 쓴다(747 — 위 SM_DY 주석)
        c = bbox(cap, mask, x0, x1, ry0 - off + dy, ry1 - off + dy)
        if c:                       # 캡처 y 를 ref 좌표로 되돌려 같은 축에서 비교한다
            c = [c[0], c[1] + off, c[2], c[3]]
        m['cap'][key] = c

    # 카드 격자 — 검정 외곽선 좌단.
    # ⚠ 카드 «중앙» 행(y960 등)은 안 된다 — 카드 안 아트의 검정 외곽선이 같이 잡혀
    #   ref 쪽에만 없는 런이 끼어든다(아트는 무작위라 대조가 불가능하다).
    #   ⚠ 코너 원호 구간(y918 등)도 안 된다 — 104 통일 코너(--if-rr .233 → r 35.4)가
    #     ref(최소자승 r 32.1)보다 깊어 원호 안에서만 좌·우단이 ±3 벌어진다(설계 차이, 어긋남이 아니다).
    #   y940 은 **원호 아래 · 아트 위** 라 6칸 12런이 Δ≤1 로 깨끗하게 나온다.
    m['ref']['cardcols'] = [r[0] for r in hruns(ref, 940, BLACK, 0, 1080, 4)][:12]
    m['cap']['cardcols'] = [r[0] for r in hruns(cap, 940 - SM_CARD + SM_DY, BLACK, 0, 1080, 4)][:12]
    # 카드 행 상·하단 — 같은 이유로 아트가 닿지 않는 x=60 열(카드 좌단에서 24px)
    m['ref']['cardrows'] = [[a, b] for a, b in vruns(ref, 78, BLACK, 880, 1250)]
    m['cap']['cardrows'] = [[a + SM_CARD, b + SM_CARD] for a, b in
                            vruns(cap, 78, BLACK, 880 - SM_CARD + SM_DY, 1250 - SM_CARD + SM_DY)]
    # 검은 패널 세로 (x=12 — 카드가 없는 열)
    #   327 — 높이는 «2배» 라 ref 와 같을 수 없다. **상변만** ref 축으로 되돌려 대조하고
    #   높이는 verify12 가 327 상수(1080)로 따로 단언한다(«무엇이 왜 달라졌는지» 를 남긴다).
    pr = vruns(ref, 12, PANEL, 760, 1400)
    pc = vruns(cap, 12, PANEL, 500, 1800)
    m['ref']['panelTop'] = pr[0][0] if pr else None
    m['cap']['panelTop'] = pc[0][0] + SM_TOP if pc else None
    m['ref']['panelH'] = pr[0][1] - pr[0][0] + 1 if pr else None
    m['cap']['panelH'] = pc[0][1] - pc[0][0] + 1 if pc else None
    # 리본 밴드 가로 (글자가 없는 행)
    m['ref']['band733'] = hruns(ref, 733, ORANGE, 0, 1080, 20)[-1]
    m['cap']['band733'] = hruns(cap, 733 - SM_TOP, ORANGE, 0, 1080, 20)[-1]
    # 버튼 검정 외곽 상단 (x=240/540/840) — **런의 아래 끝만** 쓴다.
    #   런의 «시작» 은 버튼이 아니라 그 위 배경이 정한다: ref 는 딤(rgba(0,0,0,.8))이 이미 <30 이라
    #   창 시작에서 잘리고, cap 은 327 이후 패널 바닥 그림자(`box-shadow 0 5px 0 #000`)가 버튼
    #   외곽선과 **한 런으로 붙는다**(패널 하변 1686 ↔ 버튼 상변 1706, 84 가 정한 20px 간격).
    #   즉 시작값은 원래부터 «창 가장자리» 를 재고 있었다(327 이 만든 것이 아니다). 끝 1771 은
    #   버튼 상단 테두리의 아래 끝이라 두 이미지에서 같은 것을 가리킨다 → 그것만 대조한다.
    m['ref']['btntop'] = [vruns(ref, x, BLACK, 1740, 1940)[0][1] for x in (240, 540, 840)]
    m['cap']['btntop'] = [vruns(cap, x, BLACK, 1680, 1880)[0][1] + 60 for x in (240, 540, 840)]
    # 버튼 계조 — «부족» 상태는 ref 픽셀과 같아야 한다(disabled 필터 이중 감광 회귀 감시)
    m['ref']['btntone'] = [ref.getpixel((540, y))[0] for y in (1776, 1780, 1792, 1896)]
    m['cap']['btntone'] = [cap.getpixel((540, y - 60))[0] for y in (1776, 1780, 1792, 1896)]
    return m


def main():
    cap_path = 'docs/review/12-r4b.png'
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if args:
        cap_path = args[0]
    m = measure(cap_path)
    if '--json' in sys.argv:
        print(json.dumps(m))
        return
    print(f'ref = {REF}')
    print(f'cap = {cap_path}   (세로는 ref 좌표로 환산해 나란히 둔다)\n')
    for k in m['ref']:
        r, c = m['ref'][k], m['cap'][k]
        flag = '' if r == c else '   <-- 차이'
        print(f'{k:10s} ref={r}\n{"":10s} cap={c}{flag}')


if __name__ == '__main__':
    main()
