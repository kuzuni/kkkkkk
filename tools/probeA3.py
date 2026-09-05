#!/usr/bin/env python3
"""작업 A3 상단 HUD — «구조» 프로브 (텍스트 잉크는 tools/inkA3.py 담당).

inkA3.py 는 글자·아이콘의 **잉크** 를 재고, 이쪽은 그 글자를 담는 **판·알약·배너·플레이트**
자체의 bbox 를 잰다. 두 이미지에 **완전히 같은 창·같은 마스크**를 쓰고 캡처는 y−84 로 민다.

한 대상에 마스크를 **두 개 이상** 걸어 값이 갈리는지 같이 본다 —
«테두리를 포함하느냐» 로 6~8px 이 왔다갔다 하는 것이 A1 10~12회차의 오진 원인이었다
(LESSONS «A1 2차 라운드»). 갈리면 둘 다 적는다.

실행: python3 tools/probeA3.py [캡처경로]     (기본 docs/review/A3-r6.png)
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/02-기본-메인-화면.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/A3-r6.png'
DY = 84

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.int16)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(np.int16)


def lum(w):
    """휘도. **int16 그대로 곱하면 255*299 가 오버플로**해서 마스크가 통째로 뒤집힌다
    (첫 실행에서 «검정 마스크가 창 전체» · «밝음 마스크가 0» 로 나온 원인). int32 로 올린다."""
    w = w.astype(np.int32)
    return (w[:, :, 0] * 299 + w[:, :, 1] * 587 + w[:, :, 2] * 114) // 1000


MASKS = {
    # 어두운 판(검정 알약·재화 알약 배경). JPEG 번짐을 감안해 임계를 넉넉히.
    '검정<55': lambda w: lum(w) < 55,
    '검정<70': lambda w: lum(w) < 70,
    # 초상화 플레이트·칭호 배너의 갈색 계열: R>G>B 이면서 중간 밝기
    '갈색': lambda w: (w[:, :, 0] > w[:, :, 2] + 18) & (lum(w) >= 45) & (lum(w) <= 190),
    '밝음>60': lambda w: lum(w) >= 60,
    '밝음>90': lambda w: lum(w) >= 90,
    '흰>200': lambda w: w.min(axis=2) >= 200,
    '노랑': lambda w: (w[:, :, 0] > 195) & (w[:, :, 1] > 140) & (w[:, :, 2] < 125),
    '파랑': lambda w: (w[:, :, 2] > 185) & (w[:, :, 1] > 135) & (w[:, :, 0] < 135),
    '연두': lambda w: (w[:, :, 1] >= 210) & (w[:, :, 2] < 175) & (w[:, :, 0] > 130),
}

#  이름,                창(x0,x1, refY0,refY1),          쓸 마스크들
ITEMS = [
    ('초상화 플레이트 전체', (0, 500, 84, 250), ['밝음>60', '밝음>90', '갈색']),
    ('초상화 창(얼굴)',      (0, 150, 84, 240), ['밝음>90']),
    ('닉네임 검정 알약',     (145, 440, 88, 130), ['검정<55', '검정<70']),
    ('칭호 육각 배너',       (140, 400, 122, 178), ['검정<55', '갈색']),
    ('재화 알약 좌(골드)',   (560, 810, 100, 175), ['검정<55', '검정<70']),
    ('재화 알약 우(다이아)', (820, 1075, 100, 175), ['검정<55', '검정<70']),
    ('코인 아이콘',          (535, 630, 96, 185), ['노랑', '밝음>60']),
    ('젬 아이콘',            (795, 890, 96, 185), ['파랑', '밝음>60']),
    ('전투력 연두 숫자',     (185, 300, 170, 220), ['연두']),
]


def bb(img, x0, x1, y0, y1, pred):
    y0 = max(0, y0); x0 = max(0, x0)
    y1 = min(img.shape[0], y1); x1 = min(img.shape[1], x1)
    if y1 <= y0 or x1 <= x0:
        return None
    m = pred(img[y0:y1, x0:x1])
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (int(x0 + xs.min()), int(y0 + ys.min()),
            int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))


print('캡처:', CAP, '  (캡처 y = 레퍼런스 y − %d)' % DY)
print('%-22s %-9s %-22s %-22s %s' % ('대상', '마스크', 'ref x,y,w,h', 'cap x,y(+84),w,h', 'Δx/Δy/Δw/Δh'))
print('-' * 108)
for name, (x0, x1, ry0, ry1), masks in ITEMS:
    for mk in masks:
        pred = MASKS[mk]
        br = bb(ref, x0, x1, ry0, ry1, pred)
        bc = bb(cap, x0, x1, ry0 - DY, ry1 - DY, pred)
        if br is None or bc is None:
            print('%-22s %-9s %-22s %-22s  (마스크 0)' % (name, mk, br, bc))
            continue
        cy = bc[1] + DY
        print('%-22s %-9s %-22s %-22s  %+d/%+d/%+d/%+d'
              % (name, mk, '%d,%d,%d,%d' % br, '%d,%d,%d,%d' % (bc[0], cy, bc[2], bc[3]),
                 bc[0] - br[0], cy - br[1], bc[2] - br[2], bc[3] - br[3]))
    print()
