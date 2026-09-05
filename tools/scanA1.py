#!/usr/bin/env python3
"""작업 A1 하단 탭바 — 차분 잉크 스캐너

실행:  python3 tools/scanA1.py <회차> [--thr N] [--sweep]

`tools/capA1.js` 가 뜬 단방향 5장을 차분해서 «그 부속만» 의 잉크 bbox 를 잰다.

    레드닷·리본 = dA − dB      라벨 = dB − dC
    아이콘      = dC − dD      바 껍데기 = dD − dE

면색 마스크가 아니라 **차분**을 쓰는 이유(LESSONS 144-②·A2-③):
탭바는 칸마다 배경 그라디언트·구분홈·베벨이 겹쳐 있어서 «배경과 다른 픽셀» 마스크를 쓰면
홈과 림이 통째로 잉크로 잡힌다. 차분은 «그 레이어를 껐을 때 실제로 바뀐 픽셀» 만 남긴다.

임계값은 A2-④ 대로 스윕해서 고정한다 — 채점자와 다른 자로 재면 처방이 통째로 어긋난다.
`--sweep` 은 임계 8/16/26/40/60 의 bbox 를 나란히 찍어 안정 구간을 보여 준다.

레퍼런스(측정표 `docs/measure/A1-탭바.md`, 재측정 금지)는 1080×2340 기준이고
탭바는 **바닥 고정**이므로 변환은 `프레임 y = 레퍼런스 y − 60` 이다
(레퍼런스 콘텐츠 2256 과 프레임 2280 의 24px 을 전투 캔버스가 흡수 — LESSONS 02-1).
"""
import sys, os, json
from pydep937 import Image

R = sys.argv[1] if len(sys.argv) > 1 else '1'
ARG = sys.argv[2:]
THR = 26
if '--thr' in ARG:
    THR = int(ARG[ARG.index('--thr') + 1])
SWEEP = '--sweep' in ARG

DIR = os.path.join(os.path.dirname(__file__), '..', 'docs', 'review')
BAR_TOP = 2100                      # 프레임에서의 탭바 상단 (= ref 2160 − 60)
CELLS = [('hero', '영웅', 0, 216), ('grow', '훈련', 216, 432), ('adv', '던전', 432, 648),
         ('box', '유물', 648, 864), ('shop', '상점', 864, 1080)]

# 측정표 §4 아이콘 / §3 라벨 — ref y 는 이미 프레임 좌표(−60)로 옮겨 적었다
# 측정표 §4. ⚠ box(보물상자) 높이 «96» 은 **§4-1 정오(A1 8회차)** 로 122 로 고쳤다 —
# 7회차 비평가 I(125)·J(122)가 독립적으로 «훨씬 높다» 로 일치했다. 원 측정은 라벨이 아이콘 하단을
# 덮는 구간에서 끊긴 값이다(§4 자신이 «아이콘 하단 경계 일부는 라벨이 덮어 ±3px 오차» 라고 적어 뒀다).
REF_ICON = {'hero': (121, 121, 2131), 'grow': (150, 100, 2147), 'adv': (109, 120, 2131),
# ⚠ box·shop 의 «폭» 은 **§4-2 정오(A1 11회차)**: 125→122 · 165→162.
# 비평가 O·P 가 독립적으로 유물을 «ref 122 vs 우리 125» 로 **수치까지 똑같이**, 상점을
# «ref 161 / 163 vs 우리 166» 으로 읽었다. 두 칸 다 세로는 ref 와 0% 라 폭만 정정한 것이다.
            'box': (122, 121, 2131), 'shop': (162, 113, 2134)}
# ⚠ 폭 대조가 유효한 칸은 «레퍼런스와 같은 단어» 인 **영웅·상점** 둘뿐이다.
# 24 가 모험→«던전», 88/89 가 성장→«훈련»·보물상자→«유물» 로 개칭해 글자 수·조합이 달라졌다.
# 특히 box 는 ref «보물상자»(4자, 121) vs 우리 «유물»(2자) 이라 폭을 그대로 비교하면 −50% 가 나온다.
REF_LABEL_W = {'hero': 56, 'grow': 62, 'adv': 55, 'box': 121, 'shop': 60}
LABEL_SAME_WORD = {'hero', 'shop'}             # 폭 대조가 성립하는 칸
# ⚠ 측정표 §3 의 «잉크 높이 32 · 폭 56/62/55/121/60» 은 **흰 코어** 값이고, 외곽선은 별도로 «≈4» 다.
# 이 스캐너의 차분은 **검정 외곽선까지** 잡으므로 우리 값에서 외곽선(현재 text-shadow 6px)을 양쪽
# 빼야 코어가 된다: 코어 = 차분 − 12. 그대로 대조하면 «높이 +44%» 같은 허수가 나온다(LESSONS 01).
REF_LABEL_TOP, REF_LABEL_H = 2224, 32          # ref +124 · **코어** 잉크 높이 32
LABEL_STROKE = 4                               # `.tab .tl` 의 text-shadow 두께(코어 환산용)


def load(tag):
    p = os.path.join(DIR, 'A1-r%s-%s.png' % (R, tag))
    return Image.open(p).convert('RGB')


def diff_bbox(a, b, x0, x1, y0, y1, thr):
    """a 에는 있고 b 에는 없는 픽셀의 bbox. 반환 (x0,y0,x1,y1,px) — x1/y1 은 배타."""
    pa, pb = a.load(), b.load()
    mnx, mny, mxx, mxy, n = 10 ** 9, 10 ** 9, -1, -1, 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            ra, ga, ba = pa[x, y]
            rb, gb, bb = pb[x, y]
            if abs(ra - rb) + abs(ga - gb) + abs(ba - bb) >= thr:
                n += 1
                if x < mnx: mnx = x
                if x > mxx: mxx = x
                if y < mny: mny = y
                if y > mxy: mxy = y
    if n == 0:
        return None
    return (mnx, mny, mxx + 1, mxy + 1, n)


def fmt(b):
    if not b:
        return 'n/a'
    return 'x%d..%d w%d · y%d..%d h%d (%d px)' % (b[0], b[2], b[2] - b[0], b[1], b[3], b[3] - b[1], b[4])


def pct(got, ref):
    return '%+.1f%%' % ((got - ref) / ref * 100) if ref else '—'


def main():
    A, B, C, D, E = (load(t) for t in ('dA', 'dB', 'dC', 'dD', 'dE'))
    y0, y1 = BAR_TOP - 20, 2280            # 리본은 바 위로 튀어나온다

    if SWEEP:
        print('== 임계값 스윕 (아이콘 = dC − dD) ==')
        for thr in (8, 16, 26, 40, 60, 90):
            row = []
            for k, name, cx0, cx1 in CELLS:
                b = diff_bbox(C, D, cx0, cx1, y0, y1, thr)
                row.append('%s %s' % (name, ('%dx%d' % (b[2] - b[0], b[3] - b[1])) if b else '-'))
            print('  thr %3d : %s' % (thr, '  '.join(row)))
        return

    out = {'round': R, 'thr': THR, 'cells': {}}
    print('== A1 r%s 차분 잉크 (임계 %d · 프레임 좌표 = 캡처 좌표) ==' % (R, THR))
    print('   레퍼런스 변환: 프레임 y = ref y − 60 (탭바는 바닥 고정)\n')

    print('-- 아이콘 (dC − dD) : ref = 측정표 §4 --')
    for k, name, cx0, cx1 in CELLS:
        b = diff_bbox(C, D, cx0, cx1, y0, y1, THR)
        rw, rh, rtop = REF_ICON[k]
        if b:
            w, h = b[2] - b[0], b[3] - b[1]
            cy = (b[1] + b[3]) / 2
            print('  %-4s %-28s | ref %3dx%-3d top %d  →  w %s · h %s · 중심y %.1f (ref +87..91 = 2187..2191)'
                  % (name, fmt(b), rw, rh, rtop, pct(w, rw), pct(h, rh), cy))
            out['cells'].setdefault(k, {})['icon'] = {'bbox': b[:4], 'w': w, 'h': h, 'cy': cy,
                                                      'refW': rw, 'refH': rh, 'refTop': rtop}
        else:
            print('  %-4s (잉크 없음)' % name)

    print('\n-- 라벨 (dB − dC) : ref 잉크 top 2224 · h 32 --')
    # 라벨은 바 아래쪽 밴드에만 있다. 창을 좁히지 않으면 영웅 칸 금색 링의 AA 가 몇 픽셀 물려
    # 잉크 높이가 46 대신 119 로 읽힌다(05 교훈 3-ⓒ «이모지 오염» 의 링 판).
    for k, name, cx0, cx1 in CELLS:
        b = diff_bbox(B, C, cx0, cx1, 2195, y1, THR)
        rw = REF_LABEL_W[k]
        if b:
            w, h = b[2] - b[0], b[3] - b[1]
            cw, ch = w - 2 * LABEL_STROKE, h - 2 * LABEL_STROKE     # 검정 외곽선을 벗긴 흰 코어
            wtxt = pct(cw, rw) if k in LABEL_SAME_WORD else '(개칭 — 대조 불가)'
            print('  %-4s %-28s | 코어 %dx%d (ref %dx%d)  →  w %s · h %s · 코어 top Δ%+d · 코어 바닥여백 %d (ref 24)'
                  % (name, fmt(b), cw, ch, rw, REF_LABEL_H, wtxt, pct(ch, REF_LABEL_H),
                     (b[1] + LABEL_STROKE) - REF_LABEL_TOP, 2280 - (b[3] - LABEL_STROKE)))
            out['cells'].setdefault(k, {})['label'] = {'bbox': b[:4], 'core': [cw, ch], 'refW': rw}
        else:
            print('  %-4s (잉크 없음)' % name)

    print('\n-- 레드닷·NEW 리본 (dA − dB) --')
    # 창을 칸 밖으로 넓히면 옆 칸의 레드닷·리본이 같이 잡혀 ⌀ 가 +440% 로 읽힌다.
    # 레드닷은 칸 안(오른쪽 −21)이므로 칸 경계 그대로, 리본만 왼쪽으로 넘칠 수 있어 −16 여유를 준다.
    for k, name, cx0, cx1 in CELLS:
        b = diff_bbox(A, B, cx0, cx1, y0, y1, THR)
        if not b:
            continue
        w, h = b[2] - b[0], b[3] - b[1]
        if k == 'shop':
            # 측정표 §7 정오표(A1 6회차): «w164 · h91» 은 주황 가게 아트를 문 값이다.
            # 초록을 묶은 마스크로 다시 재면 x864..980 (w117) · y2163..2241 (h79) → 프레임 y2103..2181
            print('  %-4s NEW 리본 %-28s | ref(정오) x864..980 w117 · y2103..2181 h79  →  w %s · h %s · top Δ%+d'
                  % (name, fmt(b), pct(w, 117), pct(h, 79), b[1] - 2103))
            out['ribbon'] = {'bbox': b[:4], 'w': w, 'h': h}
        else:
            cxm, cym = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            # 중심 y: ref 빨강 코어 2164..2195 → 2179.5(+19.5) · 검정 외곽 포함 2161..2201 → 2181(+21).
            # 우리 캡처도 «외곽 포함» 으로 재므로 기준은 외곽 중심 2181 − 60 = 2121 이다.
            print('  %-4s 레드닷  %-28s | ref 외곽포함 ⌀41 · 중심 x=%d y=2121  →  ⌀ %s · 중심 Δ(%+.1f, %+.1f)'
                  % (name, fmt(b), cx1 - 21, pct(max(w, h), 41), cxm - (cx1 - 21), cym - 2121))
            out['cells'].setdefault(k, {})['dot'] = {'bbox': b[:4], 'd': max(w, h)}

    print('\n-- 바 껍데기 (dD − dE) --')
    b = diff_bbox(D, E, 0, 1080, y0, y1, THR)
    print('  %s | ref y2100..2280 h180' % fmt(b))

    with open(os.path.join(DIR, 'A1-r%s-scan.json' % R), 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


main()
