#!/usr/bin/env python3
"""A2 좌측 사이드 아이콘 — 차분 잉크 스캐너.

  python3 tools/scanA2.py <회차>

capA2.js 가 뜬 4장의 차분으로 «순수 잉크 bbox» 를 낸다.
임계값 120 은 4회차 비평가 E·F 의 «배경 색거리 마스크» 를 재현하도록 맞춘 값이다
(같은 빌드에서 두 사람 수치와 ≤1px 일치. 26 으로 두면 소프트 섀도의 옅은 프린지를 물어 축당 6px 부푼다). 차분은 «그 종류의 요소만» 달라진 두 장을 쓰므로
밴드가 옆 행을 물어도 오염되지 않는다(단 같은 종류의 옆 행은 피한다).

  실루엣  = hard     − off        (아트 + 검정 외곽선. 소프트 드롭섀도는 뺀다 = 비평가 정의)
  글리프  = noshadow − off        (외곽선 없는 이모지 잉크)
  라벨    = full     − labeloff  (알림닷 상태가 같은 장끼리 뺀다)
"""
import sys, os, json
from pydep937 import Image

R = sys.argv[1] if len(sys.argv) > 1 else '4'
D = os.path.join(os.path.dirname(__file__), '..', 'docs', 'review')
img = lambda n: Image.open(os.path.join(D, f'A2-r{R}{n}.png')).convert('RGB')
full, off, nol, nsh, hard = img(''), img('-off'), img('-nolabel'), img('-noshadow'), img('-hard')
lbo = img('-labeloff')
box = json.load(open(os.path.join(D, f'A2-r{R}-box.json')))

# 레퍼런스 02(1080x2340) 좌측 스택 스프라이트 bbox — 측정표 §1-1. 캡처 y = ref y - 84.
# 48·71 이 우편(3행)·던전(5행)을 지웠으므로 남은 5칸이 ref 1~5행 자리를 그대로 쓴다.
REF = {
    'attend': (42, 148, 260, 360),   # ref1 자물쇠      107 x 101
    'roul':   (51, 142, 421, 499),   # ref2 패스         92 x 79
    'quest':  (47, 141, 556, 635),   # ref3 퀘스트       95 x 80
    'promo':  (53, 146, 686, 766),   # ref4 휴식 보너스  94 x 81 (4회차 정정: 표의 ~770/84 는 라벨을 문 값)
    'coll':   (58, 134, 820, 901),   # ref5 도감         77 x 82 (83 신설)
    'bless':  (43, 149, 958, 1043),  # ref6 길드        107 x 86(추정) — 83 이후 축복이 이 자리
}


def bbox(a, b, y0, y1, thr=120):
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
    r = bbox(hard, off, c['y'] - 25, c['y'] + 107)
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
print(f'=== A2 r{R} — 처방: 목표 bbox 를 맞추는 --sf/--sx/--dx/--dy ===')
print('외곽선 halo 는 --ih 고정값(2.3px x 4단)이라 글리프를 줄여도 거의 안 변한다 →')
print('  필요한 글리프 = 목표 − halo, kh = 그 높이/현재 글리프높이, kw = 목표폭/(현재폭 x kh)')
print('행     | 실루엣 기준(외곽선 포함=ref 정의)      | 글리프 기준(외곽선 제외)')
print('       | sf     sx     dx      dy              | sf     sx')
for row in rows:
    n = row['pop']; c = row['cell']
    rx0, rx1, ry0, ry1 = REF[n]
    tw, th, tcx, ttop = rx1 - rx0 + 1, ry1 - ry0 + 1, (rx0 + rx1) / 2, ry0 - 84
    sx0, sx1, sy0, sy1 = sil[n]
    gx0, gx1, gy0, gy1 = gly[n]
    Gw, Gh = gx1 - gx0 + 1, gy1 - gy0 + 1
    hw, hh = (sx1 - sx0 + 1) - Gw, (sy1 - sy0 + 1) - Gh
    sf0 = float(row['sf'] or .96); sxx0 = float(row['sx'] or 1.15)
    dx0 = float((row['dx'] or '0px').replace('px', '')); dy0 = float((row['dy'] or '0px').replace('px', ''))
    kh = (th - hh) / Gh; kw = (tw - hw) / (Gw * kh)
    # 크기를 바꾸면 중심·top 도 바뀐다 → 새 실루엣의 중심/ top 을 예측해 dx/dy 를 역산
    ncx = (sx0 + sx1) / 2   # 중심은 scale 로 거의 안 움직인다(박스 중앙 정렬)
    ntop = (sy0 + sy1) / 2 - (th / 2)
    print(f'{n:6} | {sf0*kh:.3f}  {sxx0*kw:.3f}  {dx0+(tcx-ncx):+6.1f}  {dy0+(ttop-ntop):+6.1f}        | '
          f'{sf0*th/Gh:.3f}  {sxx0*tw/(Gw*th/Gh):.3f}')

print()
print(f'=== A2 r{R} — 라벨 잉크 (ref: 받침 있음 26~27 · 없음 21~23 · 중심 x 95) ===')
print('행     | x0..x1   w  | y0..y1   h | 중심 x')
for row in rows:
    n = row['pop']; c = row['cell']
    if not row['sl']:
        continue
    r = bbox(full, lbo, c['y'] + 78, c['y'] + 132)
    if not r:
        print(f'{n:6} | (라벨 없음)'); continue
    x0, x1, y0, y1 = r
    print(f'{n:6} | {x0:3}..{x1:3} {x1-x0+1:4} | {y0:4}..{y1:4} {y1-y0+1:3} | {(x0+x1)/2:5.1f}')
