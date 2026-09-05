#!/usr/bin/env python3
# 20 10회차 전용 스캔 — ref/cap 을 같은 코드로 잰다.
#  ① 액자 갈색 밴드 좌/우 폭(§3-6 재확인)  ② 금탭 4모서리 라운드  ③ 금탭 팁 앰버 쐐기
#  ④ 닉 스트립 좌측 페이드 50% 크로싱
# 세로 변환: cap_y = ref_y - 84 · 가로 1:1
# 사용: python3 s20b.py [cap경로]
import sys
from pydep937 import Image

REF = 'docs/ref/20-프로필-팝업-플레이어-스펙-정보.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/20-r10a.png'
DY = 84

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')
R, C = ref.load(), cap.load()


def runs(P, y, x0, x1, pred):
    out, s = [], None
    for x in range(x0, x1):
        ok = pred(P[x, y])
        if ok and s is None:
            s = x
        elif not ok and s is not None:
            out.append((s, x - 1))
            s = None
    if s is not None:
        out.append((s, x1 - 1))
    return out


def brown(p):                      # 액자 갈색 밴드 #715A4A 계열
    r, g, b = p
    return 85 < r < 145 and 62 < g < 118 and 50 < b < 105 and r > b + 12


def goldm(p):                      # Q 처방 마스크
    r, g, b = p
    return r > 140 and (r - b) > 85


def amber(p):                      # 앰버 그늘 (184,108,30) 계열
    r, g, b = p
    return 150 < r < 215 and 85 < g < 145 and b < 70


def sect(t):
    print('\n== ' + t)


def gold_edge(P, y, x0, x1, rev=False):
    """행 y 에서 금색 마스크의 좌(또는 우) 에지를 50% 크로싱 보간으로."""
    rr = [t for t in runs(P, y, x0, x1, goldm) if t[1] - t[0] > 4]
    if not rr:
        return None
    return rr[-1][1] if rev else rr[0][0]


# ── ① 액자 갈색 밴드 ────────────────────────────────────────────────
sect('① 액자 갈색 밴드 폭 (프레임 세로 중앙 3행 평균)')
for name, P, ys, x0, x1 in (('ref', R, (680, 690, 700), 430, 660),
                            ('cap', C, (596, 606, 616), 430, 660)):
    for y in ys:
        rr = [t for t in runs(P, y, x0, x1, brown) if t[1] - t[0] >= 3]
        print(' %s y%-5d %s' % (name, y, ' '.join('%d-%d(w%d)' % (a, b, b - a + 1) for a, b in rr)))

# ── ② 금탭 모서리 ──────────────────────────────────────────────────
sect('② 금탭 flat 좌/우 에지 — 코너 근방 행별 (라운드 검출)')
# ref 금 y1795..1850 / cap 1711..1766
for name, P, ytop in (('ref', R, 1795), ('cap', C, 1711)):
    print(' [%s] 상단 코너' % name)
    for d in range(0, 12):
        y = ytop + d
        l = gold_edge(P, y, 140, 300)
        r = gold_edge(P, y, 400, 560, rev=True)
        print('   +%-2d L=%s R=%s' % (d, l, r))
    print(' [%s] 하단 코너' % name)
    for d in range(0, 12):
        y = ytop + 55 - d
        l = gold_edge(P, y, 140, 300)
        r = gold_edge(P, y, 400, 560, rev=True)
        print('   -%-2d L=%s R=%s' % (d, l, r))

# ── ③ 팁 앰버 쐐기 ─────────────────────────────────────────────────
sect('③ 금탭 팁 근방 앰버 픽셀 (좌 x150-200 / 우 x500-545)')
for name, P, ytop in (('ref', R, 1795), ('cap', C, 1711)):
    for d in (18, 22, 26, 28, 30, 34, 38):
        y = ytop + d
        la = [t for t in runs(P, y, 150, 205, amber)]
        ra = [t for t in runs(P, y, 495, 545, amber)]
        print(' %s y+%-2d 좌%s 우%s' % (name, d, la, ra))

# ── ④ 닉 스트립 좌측 페이드 ────────────────────────────────────────
sect('④ 닉 스트립 좌측 페이드 밝기 프로파일 (ref y870 / cap y786)')
for name, P, y in (('ref', R, 870), ('cap', C, 786)):
    vals = []
    for x in range(318, 404, 4):
        p = P[x, y]
        vals.append((x, (p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000))
    print(' %s %s' % (name, ' '.join('%d:%d' % v for v in vals)))
    lo = min(v for _, v in vals)
    hi = max(v for _, v in vals)
    mid = (lo + hi) / 2
    cross = None
    for i in range(1, len(vals)):
        (x0, v0), (x1, v1) = vals[i - 1], vals[i]
        if (v0 - mid) * (v1 - mid) <= 0 and v0 != v1:
            cross = x0 + (v0 - mid) * (x1 - x0) / (v0 - v1)
            break
    print('   lo=%d hi=%d mid=%.0f 50%%크로싱 x=%.1f' % (lo, hi, mid, cross if cross else -1))
