#!/usr/bin/env python3
# 33 재화 정보 팝업 — 자체 캡처(docs/review/33-rN.png, 1080x1920)를 PIL 로 실측해
# 측정표 docs/measure/33-재화정보팝업.md (ref 1080x2340) 와 대조한다.
# 대조 규약: 가로 1:1 · 세로 `impl = ref - 210`.
# 문자열 «내용»은 우리 게임 용어라 레퍼런스와 다르다 → **폭은 참고만**, 판정은 높이·위치·pitch.
import sys
from PIL import Image

CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/33-r1.png'
im = Image.open(CAP).convert('RGB')
W, H = im.size
px = im.load()


def bbox(x0, y0, x1, y1, pred):
    xs, ys = [], []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if pred(px[x, y]):
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def near(c, t, tol=40):
    return all(abs(c[i] - t[i]) <= tol for i in range(3))


rows = []


def rep(name, got, want, axis='both'):
    """got/want = (x0,y0,x1,y1) or None"""
    if got is None:
        rows.append((name, '검출 실패', str(want), '—')); return
    gw, gh = got[2] - got[0] + 1, got[3] - got[1] + 1
    ww, wh = want[2] - want[0] + 1, want[3] - want[1] + 1
    d = []
    d.append('x%+d' % (got[0] - want[0]))
    d.append('y%+d' % (got[1] - want[1]))
    d.append('w%+d' % (gw - ww))
    d.append('h%+d' % (gh - wh))
    rows.append((name, '%d..%d / %d..%d (%dx%d)' % (got[0], got[2], got[1], got[3], gw, gh),
                 '%d..%d / %d..%d (%dx%d)' % (want[0], want[2], want[1], want[3], ww, wh),
                 ' '.join(d)))


R = lambda y: y - 210   # ref y -> impl y

# ── 껍데기 (검정 외곽 / 크림) ──────────────────────────────────────────
# 팝업 좌변: y=990(impl) 행에서 크림(240,217,186) 시작 x
y = R(1200)
crx = [x for x in range(200, 900) if near(px[x, y], (240, 217, 186), 12)]
rows.append(('크림 fill 좌우 (y=%d)' % y, '%d..%d (w %d)' % (crx[0], crx[-1], crx[-1] - crx[0] + 1),
             '261..818 (w 558)', 'x%+d / x%+d' % (crx[0] - 261, crx[-1] - 818)))

# ── §3 타이틀 코어 (#FED349) ─────────────────────────────────────────
rep('타이틀 코어 #FED349', bbox(250, R(790), 830, R(879), lambda c: near(c, (254, 211, 73), 45)),
    (502, R(813), 575, R(851)))

# ── §4 아이콘 박스 + 아트 ────────────────────────────────────────────
# 오렌지 fill 안쪽에서 «오렌지가 아닌» 픽셀 = 아트 실루엣(외곽선 포함)
rep('아이콘 아트 실루엣', bbox(474, R(915), 605, R(1046),
                        lambda c: not near(c, (211, 124, 19), 42) and not near(c, (252, 193, 50), 42)),
    (494, R(935), 585, R(1029)))

# ── §5 보유 라인 ─────────────────────────────────────────────────────
rep('보유 라인 코어 #B8FA5F', bbox(300, R(1060), 780, R(1128), lambda c: near(c, (184, 250, 95), 60)),
    (448, R(1080), 630, R(1112)))

# ── §6 설명 본문 2줄 (흰 코어) — 줄별로 나눠 잡는다 ───────────────────
def white(c):
    return c[0] > 225 and c[1] > 225 and c[2] > 225


# 줄 경계를 고정 밴드로 자르면 pitch 가 밴드값에 묶여 거짓으로 읽힌다(28 교훈의 «재현성» 문제).
# 흰 잉크의 «행 프로파일» 에서 빈 줄로 끊어 실제 줄 수를 센다.
DY0, DY1 = R(1136), R(1330)
rowhas = [any(white(px[x, y]) for x in range(292, 790)) for y in range(DY0, DY1 + 1)]
runs, st = [], None
for i, v in enumerate(rowhas):
    if v and st is None: st = i
    if not v and st is not None:
        runs.append((DY0 + st, DY0 + i - 1)); st = None
if st is not None: runs.append((DY0 + st, DY1))
rows.append(('본문 줄 수', str(len(runs)), '2', '%+d' % (len(runs) - 2)))
want_lines = [(321, R(1153), 759, R(1181)), (335, R(1190), 744, R(1218))]
for i, (a0, b0) in enumerate(runs[:2]):
    bb = bbox(292, a0, 789, b0, white)
    rep('본문 L%d 잉크행' % (i + 1), bb, want_lines[i])
if len(runs) >= 2:
    rows.append(('본문 줄 pitch(행 상단)', str(runs[1][0] - runs[0][0]), '37',
                 '%+d' % (runs[1][0] - runs[0][0] - 37)))

# ── §7 «획득처» 라벨 (#FEF7AC) ───────────────────────────────────────
rep('획득처 코어 #FEF7AC', bbox(300, R(1350), 780, R(1405), lambda c: near(c, (254, 247, 172), 22)),
    (496, R(1367), 582, R(1396)))

# ── §8 리스트 3행 ────────────────────────────────────────────────────
green = lambda c: near(c, (143, 252, 72), 60)
bands = [(1410, 1450), (1450, 1492), (1492, 1532)]
tops = []
for i, (a, b) in enumerate(bands):
    ck = bbox(292, R(a), 340, R(b), green)
    tx = bbox(336, R(a), 780, R(b), white)
    want_ck = [(300, 1420, 327, 1440), (300, 1461, 327, 1480), (300, 1500, 327, 1520)][i]
    rep('체크%d 코어' % (i + 1), ck, (want_ck[0], R(want_ck[1]), want_ck[2], R(want_ck[3])))
    if ck:
        tops.append(ck[1])
    if tx:
        rows.append(('항목%d 텍스트 좌단 x' % (i + 1), str(tx[0]), '342', '%+d' % (tx[0] - 342)))
if len(tops) == 3:
    rows.append(('행 pitch (체크 상단)', '%d / %d' % (tops[1] - tops[0], tops[2] - tops[1]),
                 '41 / 39', '%+d / %+d' % (tops[1] - tops[0] - 41, tops[2] - tops[1] - 39)))

w = max(len(r[0]) for r in rows) + 2
print('%-*s %-30s %-30s %s' % (w, '항목', '캡처(impl)', '목표(ref-210)', 'Δ'))
print('-' * (w + 95))
for r in rows:
    print('%-*s %-30s %-30s %s' % (w, r[0], r[1], r[2], r[3]))
