#!/usr/bin/env python3
"""A2 좌측 사이드 아이콘 — 차분 잉크 스캐너.

  python3 tools/scanA2.py <회차>

capA2.js 가 뜬 4장의 차분으로 «순수 잉크 bbox» 를 낸다.
임계값 마스크는 드롭섀도·안티에일리어싱을 물어 수 px 틀린다(A2 3회차 교훈) —
숨긴 캡처와의 차분은 그 오차가 없다. 차분은 «그 종류의 요소만» 달라진 두 장을 쓰므로
밴드가 옆 행을 물어도 오염되지 않는다(단 같은 종류의 옆 행은 피한다).

  실루엣  = nolabel  − off        (아트 + 검정 외곽선 = 레퍼런스 스프라이트 bbox 와 같은 정의)
  글리프  = noshadow − off        (외곽선 없는 이모지 잉크)
  라벨    = full     − nolabel
"""
import sys, os, json
from PIL import Image

R = sys.argv[1] if len(sys.argv) > 1 else '4'
D = os.path.join(os.path.dirname(__file__), '..', 'docs', 'review')
img = lambda n: Image.open(os.path.join(D, f'A2-r{R}{n}.png')).convert('RGB')
full, off, nol, nsh = img(''), img('-off'), img('-nolabel'), img('-noshadow')
box = json.load(open(os.path.join(D, f'A2-r{R}-box.json')))

# 레퍼런스 02(1080x2340) 좌측 스택 스프라이트 bbox — 측정표 §1-1. 캡처 y = ref y - 84.
# 48·71 이 우편(3행)·던전(5행)을 지웠으므로 남은 5칸이 ref 1~5행 자리를 그대로 쓴다.
REF = {
    'attend': (42, 148, 260, 360),   # ref1 자물쇠      107 x 101
    'roul':   (51, 142, 421, 499),   # ref2 패스         92 x 79
    'quest':  (47, 141, 556, 635),   # ref3 퀘스트       95 x 80
    'promo':  (53, 146, 687, 770),   # ref4 휴식 보너스  94 x 84
    'bless':  (58, 134, 820, 901),   # ref5 도감         77 x 82
}


def bbox(a, b, y0, y1, thr=26):
    pa, pb = a.load(), b.load()
    x0, x1, yy0, yy1 = 10**9, -1, 10**9, -1
    for y in range(max(0, y0), min(a.height, y1)):
        for x in range(0, 280):
            pa_, pb_ = pa[x, y], pb[x, y]
            if abs(pa_[0] - pb_[0]) + abs(pa_[1] - pb_[1]) + abs(pa_[2] - pb_[2]) > thr:
                x0, x1 = min(x0, x), max(x1, x)
                yy0, yy1 = min(yy0, y), max(yy1, y)
    return None if x1 < 0 else (x0, x1, yy0, yy1)


rows = box['rows']
print(f'=== A2 r{R} — 실루엣(아트+외곽선) vs 레퍼런스 스프라이트 bbox ===')
print('행     | 캡처 x0..x1   w  cx   | ref  w  cx    | Δw   Δcx  | 캡처 y0..y1   h  | ref  h  top | Δh   Δtop')
sil = {}
for row in rows:
    n = row['pop']; c = row['cell']
    rx0, rx1, ry0, ry1 = REF[n]
    r = bbox(nol, off, c['y'] - 25, c['y'] + 107)
    sil[n] = r
    x0, x1, y0, y1 = r
    w, h, cx = x1 - x0 + 1, y1 - y0 + 1, (x0 + x1) / 2
    rw, rh, rcx, rtop = rx1 - rx0 + 1, ry1 - ry0 + 1, (rx0 + rx1) / 2, ry0 - 84
    print(f'{n:6} | {x0:3}..{x1:3} {w:4} {cx:5.1f} | {rw:4} {rcx:5.1f} | {w-rw:+4} {cx-rcx:+5.1f} | '
          f'{y0:4}..{y1:4} {h:4} | {rh:4} {rtop:4} | {h-rh:+4} {y0-rtop:+5}')

print()
print(f'=== A2 r{R} — 글리프(외곽선 제외) 와 외곽선 두께 ===')
print('행     | 글리프 w x h  | 실루엣 w x h  | 외곽선 좌/우/상/하')
gly = {}
for row in rows:
    n = row['pop']; c = row['cell']
    r = bbox(nsh, off, c['y'] - 25, c['y'] + 107)
    gly[n] = r
    gx0, gx1, gy0, gy1 = r
    sx0, sx1, sy0, sy1 = sil[n]
    print(f'{n:6} | {gx1-gx0+1:4} x {gy1-gy0+1:3}  | {sx1-sx0+1:4} x {sy1-sy0+1:3}  | '
          f'{gx0-sx0:2} / {sx1-gx1:2} / {gy0-sy0:2} / {sy1-gy1:2}')

print()
print(f'=== A2 r{R} — 라벨 잉크 (ref: 받침 있음 26~27 · 없음 21~23 · 중심 x 95) ===')
print('행     | x0..x1   w  | y0..y1   h | 중심 x')
for row in rows:
    n = row['pop']; c = row['cell']
    if not row['sl']:
        continue
    r = bbox(full, nol, c['y'] + 78, c['y'] + 132)
    if not r:
        print(f'{n:6} | (라벨 없음)'); continue
    x0, x1, y0, y1 = r
    print(f'{n:6} | {x0:3}..{x1:3} {x1-x0+1:4} | {y0:4}..{y1:4} {y1-y0+1:3} | {(x0+x1)/2:5.1f}')
