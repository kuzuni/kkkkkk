#!/usr/bin/env python3
"""36 출석 패스 — 레퍼런스와 우리 캡처의 «잉크/코어 폭» 자체 대조.

비평가 수치는 «어디를 기준으로 쟀는지» 확인 전에는 반영하지 않는다(LESSONS 05-③ · 21-④).
이 스크립트가 그 «제3의 독립 검산» 이다 — 두 이미지를 같은 임계값·같은 창으로 스캔한다.

    python3 tools/scan36.py [캡처파일명]     기본 docs/review/36-r2.png

세로 변환은 «frame y = ref y − 84» 하나뿐이라, 창도 그렇게 옮겨 잡는다.
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/36-패스-출석패스.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/36-r2.png'

ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(int)

def core_box(img, x0, x1, y0, y1, thr=215, yellow=False):
    """밝은 «코어»(글자 속) bbox.

    흰 글자는 min(RGB)>thr 로 잡히지만 **노란 글자(#FFF268·#F0E861)는 B 가 97~104 라
    그 규칙으로는 한 픽셀도 안 잡힌다** — 부제·스탯이 그래서 «스캔 실패» 로 나왔다.
    노란 글자는 R·G 만 본다."""
    w = img[y0:y1, x0:x1]
    m = ((w[:, :, 0] > thr) & (w[:, :, 1] > thr - 25)) if yellow else (w.min(axis=2) > thr)
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (x0 + xs.min(), x0 + xs.max(), y0 + ys.min(), y0 + ys.max())

def show(name, rb, cb):
    if rb is None or cb is None:
        print(f'  {name:<22} ref={rb} cap={cb}  ← 스캔 실패')
        return
    rw, rh = rb[1] - rb[0] + 1, rb[3] - rb[2] + 1
    cw, ch = cb[1] - cb[0] + 1, cb[3] - cb[2] + 1
    print(f'  {name:<22} ref {rw:>4}×{rh:<3} @x{rb[0]:<4} | '
          f'cap {cw:>4}×{ch:<3} @x{cb[0]:<4} | '
          f'폭 {100*(cw/rw-1):+6.1f}%  높이 {100*(ch/rh-1):+6.1f}%  x {cb[0]-rb[0]:+4}')

print(f'REF {ref.shape[1]}×{ref.shape[0]}  CAP {cap.shape[1]}×{cap.shape[0]}   (frame y = ref y − 84)')
print('코어(min RGB > 215) bbox 대조 — 폭/높이 비율과 좌측 시작 x')

# (이름, x0, x1, ref y0, ref y1)  — 창은 이웃 요소를 물지 않게 넉넉하되 겹치지 않게 잡는다
ITEMS = [
    ('타이틀 출석패스1',   40,  420, 170, 270, False),
    ('부제 L1',            40,  560, 286, 328, True),
    ('부제 L2',           170,  420, 328, 372, True),
    ('스탯 라벨 접속일',  190,  340, 483, 535, True),
    ('스탯 값 2',         230,  300, 534, 580, True),
    ('가격 ₩5,900',       730,  910, 540, 585, False),
    ('선두 알약 글자',    470,  610, 878, 922, False),
]
for name, x0, x1, ry0, ry1, ye in ITEMS:
    show(name, core_box(ref, x0, x1, ry0, ry1, yellow=ye),
         core_box(cap, x0, x1, ry0 - 84, ry1 - 84, yellow=ye))

# 알약 캡슐 자체(검정 테두리 포함) — 어두운 픽셀로 잡는다
def dark_box(img, x0, x1, y0, y1, thr=70):
    w = img[y0:y1, x0:x1]
    m = w.max(axis=2) < thr
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (x0 + xs.min(), x0 + xs.max(), y0 + ys.min(), y0 + ys.max())

# 헤더 배지·자물쇠는 «밝은 잉크»(흰·금색 리본)라 밝기로 잡는다
def bright_box(img, x0, x1, y0, y1, thr=190):
    w = img[y0:y1, x0:x1]
    m = w.mean(axis=2) > thr
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (x0 + xs.min(), x0 + xs.max(), y0 + ys.min(), y0 + ys.max())

print('밝은 잉크(평균 RGB > 190) bbox 대조 — 배지·자물쇠')
for name, x0, x1, ry0, ry1 in [
        ('헤더 무료 배지',     10,  175,  660,  800),
        ('헤더 프리미엄 배지', 550, 715,  655,  800),
        ('자물쇠(R4 프리미엄)',825,  925, 1485, 1595)]:
    show(name, bright_box(ref, x0, x1, ry0, ry1), bright_box(cap, x0, x1, ry0 - 84, ry1 - 84))

print('잉크(max RGB < 70) bbox 대조')
show('선두 알약 캡슐', dark_box(ref, 430, 650, 855, 950), dark_box(cap, 430, 650, 855 - 84, 950 - 84))
