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
from PIL import Image

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

# (키, 마스크, x0, x1, ref y0, ref y1, 세로오프셋)
INKS = [
    ('title',  WHITE, 400,  700,  735,  800, 84),   # «소환 결과»
    ('close',  WHITE, 350,  740, 2110, 2180, 60),   # «터치하여 닫기»
    ('lab1',   WHITE, 150,  340, 1790, 1835, 60),   # 버튼① «10회 소환»
    ('lab2',   WHITE, 450,  640, 1790, 1835, 60),   # 버튼② «10회 소환»
    ('lab3',   WHITE, 750,  940, 1790, 1835, 60),   # 버튼③ «30회 소환»
    ('badge0', WHITE, 100,  132, 1030, 1076, 84),   # 개수 배지 r0c0
    ('badge1', WHITE, 100,  132, 1200, 1245, 84),   # 개수 배지 r1c0
]


def measure(cap_path):
    ref = Image.open(REF).convert('RGB')
    cap = Image.open(cap_path).convert('RGB')
    m = {'ref': {}, 'cap': {}}

    for key, mask, x0, x1, ry0, ry1, off in INKS:
        m['ref'][key] = bbox(ref, mask, x0, x1, ry0, ry1)
        c = bbox(cap, mask, x0, x1, ry0 - off, ry1 - off)
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
    m['cap']['cardcols'] = [r[0] for r in hruns(cap, 856, BLACK, 0, 1080, 4)][:12]
    # 카드 행 상·하단 — 같은 이유로 아트가 닿지 않는 x=60 열(카드 좌단에서 24px)
    m['ref']['cardrows'] = [[a, b] for a, b in vruns(ref, 78, BLACK, 880, 1250)]
    m['cap']['cardrows'] = [[a + 84, b + 84] for a, b in vruns(cap, 78, BLACK, 796, 1166)]
    # 검은 패널 세로 (x=12 — 카드가 없는 열)
    pr = vruns(ref, 12, PANEL, 760, 1400)
    pc = vruns(cap, 12, PANEL, 676, 1316)
    m['ref']['panel'] = pr[0] if pr else None
    m['cap']['panel'] = [pc[0][0] + 84, pc[0][1] + 84] if pc else None
    # 리본 밴드 가로 (글자가 없는 행)
    m['ref']['band733'] = hruns(ref, 733, ORANGE, 0, 1080, 20)[-1]
    m['cap']['band733'] = hruns(cap, 649, ORANGE, 0, 1080, 20)[-1]
    # 버튼 검정 외곽 상단 (x=240/540/840)
    m['ref']['btntop'] = [vruns(ref, x, BLACK, 1740, 1940)[0] for x in (240, 540, 840)]
    m['cap']['btntop'] = [[a + 60, b + 60] for a, b in
                          [vruns(cap, x, BLACK, 1680, 1880)[0] for x in (240, 540, 840)]]
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
