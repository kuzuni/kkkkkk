#!/usr/bin/env python3
"""63 탭바 상단 검정 테두리 — 검증기 (지시서 [3]-(가) 기계적 작업)

  node cap63.js 63-before   # 수정 전 캡처
  ...수정...
  node cap63.js 63-after    # 수정 후 캡처
  python3 verify63.py

판정 3종:
  A. 레퍼런스 프로파일 일치 — 5개 상태 × 깨끗한 열에서 탭바 상단 0..9행이 ref 실측과 Δ≤2
  B. 밴드 시프트 0 — 탭바 내부 밴드(9행 이하)와 탭바 위 영역이 before/after 픽셀 동일
  C. 변경 구간 국한 — 달라진 행이 1740..1748(탭바 상단 9행) 안에만 있음
"""
import sys
from PIL import Image

TAB_TOP = 1740          # 캡처(1080x1920)에서 #tabbar 상단 y — cap63.js 실측
REF_TOP = 2161          # 레퍼런스(1080x2340)에서 같은 지점 (PROGRESS «확정(18)» 오프셋 421)

# 레퍼런스 5장을 깨끗한 열에서 스캔해 얻은 탭바 상단 프로파일 (상단 기준 상대 행 → RGB)
#  0..2 검정 / 3 전이 / 4..8 갈색 림(피크 2 + 감쇠 3) / 9.. 본문색
REF_PROFILE = [
    (0, (20, 16, 13)), (1, (20, 16, 13)), (2, (20, 16, 13)),
    (3, (36, 28, 17)),
    (4, (88, 77, 56)), (5, (99, 84, 58)), (6, (95, 80, 52)), (7, (83, 68, 46)), (8, (71, 58, 40)),
    (9, (66, 54, 40)),
]
TOL = 2          # 림·전이 허용 오차 (JPEG 노이즈)
TOL_BODY = 3     # 9행 본문색은 A1 이 정한 #42362A — 파랑 Δ2 는 기존값

STATES = ['main', 'train', 'shop', 'equip', 'skill']
COLS = {'main': [100, 700, 950], 'train': [100, 700, 950], 'shop': [100, 700],
        'equip': [700, 950], 'skill': [700, 950]}   # 각 상태에서 탭바가 가려지지 않는 열

fails, oks = [], 0


def fail(m):
    fails.append(m)
    print('  X ' + m)


def ok(m):
    global oks
    oks += 1
    print('  o ' + m)


# ---- A. 레퍼런스 프로파일 일치 -------------------------------------------------
print('A. 레퍼런스 프로파일 일치 (탭바 상단 0..9행)')
for st in STATES:
    im = Image.open(f'docs/review/63-after-{st}.png').convert('RGB')
    px = im.load()
    worst = 0
    bad = []
    for rel, want in REF_PROFILE:
        tol = TOL_BODY if rel == 9 else TOL
        for c in COLS[st]:
            got = px[c, TAB_TOP + rel]
            d = max(abs(a - b) for a, b in zip(got, want))
            worst = max(worst, d)
            if d > tol:
                bad.append(f'{rel}행 x{c} {got} vs ref {want} (Δ{d})')
    if bad:
        fail(f'{st}: ' + ' / '.join(bad[:4]))
    else:
        ok(f'{st}: 0..9행 전부 ref 프로파일과 일치 (최대 Δ{worst})')

# ---- B/C. 회귀 — before 대비 달라진 행이 탭바 상단 9행뿐 --------------------------
# 유휴 루프가 굴리는 값(닉네임·시설 타이머·스킬 슬롯 쿨다운)은 제외한다 — LESSONS 51-③.
# 사각형은 하드코딩이 아니라 cap63.js 가 DOM 에서 떠 준 것을 읽는다.
import json
GEO = json.load(open('docs/review/63-after-geo.json'))

print('B. 밴드 시프트 0 · C. 변경 구간 국한 (before vs after, 유휴값 제외)')
for st in STATES:
    vol = GEO[st].get('_volatile', [])

    def masked(x, y, _v=vol):
        return any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in _v)

    a = Image.open(f'docs/review/63-before-{st}.png').convert('RGB')
    b = Image.open(f'docs/review/63-after-{st}.png').convert('RGB')
    if a.size != b.size:
        fail(f'{st}: 캡처 크기가 다르다 {a.size} vs {b.size}')
        continue
    pa, pb = a.load(), b.load()
    W, H = a.size
    diff_rows = []
    for y in range(H):
        for x in range(W):
            if pa[x, y] != pb[x, y] and not masked(x, y):
                diff_rows.append(y)
                break
    outside = [y for y in diff_rows if not (TAB_TOP <= y < TAB_TOP + 9)]
    if outside:
        fail(f'{st}: 탭바 상단 9행 밖이 바뀌었다 — y{outside[:8]} ({len(outside)}행)')
    else:
        ok(f'{st}: 바뀐 행 {len(diff_rows)}개, 전부 y{TAB_TOP}..{TAB_TOP + 8} 안 '
           f'(탭바 내부 밴드·아이콘·라벨·시트 Δ0)')

print()
print(f'통과 {oks} / 실패 {len(fails)}')
print('VERIFY63 PASS' if not fails else 'VERIFY63 FAIL')
sys.exit(1 if fails else 0)
