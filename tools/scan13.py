#!/usr/bin/env python3
"""작업 13 (2차 폴리시 라운드) — 레퍼런스 ↔ 캡처를 **완전히 같은 마스크**로 재는 스캐너.

1차 라운드 교훈 2: 비평가 지적이 서로 반대 방향이면(«+34% 과대» ↔ «−12% 과소») 그건
마스크 기준 차이다. 양쪽에 똑같은 임계·똑같은 창을 적용한 값만 믿는다.

좌표: 레퍼런스(1080×2340)는 **ref y − 84** 로 프레임 좌표에 맞춘 뒤 비교한다.
      화면 바닥 고정 요소는 프레임이 24px 길어 **ref y − 60** 이므로 --bot 항목으로 따로 잰다.

실행: python3 tools/scan13.py [캡처경로]
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/13-상점-팝업-재화-탭.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/13-r6.png'
DY = 84          # 상단·콘텐츠 요소
DY_BOT = 60      # 바닥 고정 요소

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.int16)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(np.int16)


def bbox(img, y0, y1, x0, x1, pred):
    """창 [y0,y1)×[x0,x1) 안에서 pred 를 만족하는 픽셀의 bbox(전역 좌표)."""
    y0 = max(0, y0); x0 = max(0, x0)
    y1 = min(img.shape[0], y1); x1 = min(img.shape[1], x1)
    if y1 <= y0 or x1 <= x0:
        return None
    w = img[y0:y1, x0:x1]
    m = pred(w)
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (x0 + xs.min(), y0 + ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)


def near(c, tol=28):
    c = np.array(c, dtype=np.int16)
    return lambda w: (np.abs(w - c).sum(axis=2) <= tol * 3)


def white(th=238):
    """흰 잉크 코어 — 외곽선을 빼고 «채움» 만. 양쪽 동일 임계."""
    return lambda w: (w.min(axis=2) >= th)


def cream():
    return near((252, 234, 214), 26)


ROWS = []


def cmp(name, win_ref, pred, bottom=False, win_cap=None):
    """win_ref = (y0,y1,x0,x1) 레퍼런스 절대 창. 캡처 창은 같은 창을 dy 만큼 내린 것."""
    dy = DY_BOT if bottom else DY
    y0, y1, x0, x1 = win_ref
    br = bbox(ref, y0, y1, x0, x1, pred)
    wc = win_cap or (y0 - dy, y1 - dy, x0, x1)
    bc = bbox(cap, wc[0], wc[1], wc[2], wc[3], pred)
    if br is None or bc is None:
        ROWS.append((name, br, bc, None))
        return
    # 레퍼런스를 프레임 좌표로 환산
    br_f = (br[0], br[1] - dy, br[2], br[3])
    d = (bc[0] - br_f[0], bc[1] - br_f[1], bc[2] - br_f[2], bc[3] - br_f[3])
    ROWS.append((name, br_f, bc, d))


# ── §1 배너 파랑 (전출혈) ────────────────────────────────────────────────
cmp('배너 파랑 전체', (150, 600, 0, 1080), lambda w: (w[:, :, 2] > 150) & (w[:, :, 2] - w[:, :, 0] > 40))
# ── §3-1 갈색 «상품» 밴드 채움 ───────────────────────────────────────────
cmp('상품 밴드 채움', (540, 660, 0, 1080), near((125, 90, 68), 30))
cmp('상품 잉크(흰>238 아님 — 연노랑)', (560, 640, 400, 680), lambda w: (w[:, :, 0] > 200) & (w[:, :, 1] > 190) & (w[:, :, 2] < 200))
# ── §2 타이틀 «재화 상점» 연노랑 잉크 ────────────────────────────────────
cmp('재화 상점 잉크', (300, 430, 620, 1010), lambda w: (w[:, :, 0] > 215) & (w[:, :, 1] > 205) & (w[:, :, 2] < 205))
# ── §3-2 «광고 상품» 리본 몸통(청록 채움) ────────────────────────────────
cmp('광고 리본 몸통', (690, 800, 200, 880), lambda w: (w[:, :, 2] > 150) & (w[:, :, 1] > 130) & (w[:, :, 0] < 130))
cmp('광고 상품 흰잉크', (710, 775, 420, 660), white())
# ── §4 초기화 알약 흰 텍스트 ─────────────────────────────────────────────
cmp('초기화 텍스트 잉크', (785, 825, 420, 660), white(200))
# ── §5 카드 크림 패널 6칸 ────────────────────────────────────────────────
for i, (cx, cy) in enumerate([(111, 881), (401, 881), (691, 881), (111, 1200), (401, 1200), (691, 1200)]):
    cmp('카드%d 크림패널' % (i + 1), (cy + 55, cy + 240, cx, cx + 278), cream())
# ── §5-2 [받기] 버튼 face (청록) — ② 칸 ─────────────────────────────────
cmp('받기버튼 face(②)', (1090, 1180, 401, 679), lambda w: (w[:, :, 2] > 170) & (w[:, :, 1] > 150) & (w[:, :, 0] < 130))
cmp('받기 흰잉크(②)', (1100, 1150, 520, 660), white())
# ── §5-4 «구매 완료» 띠 + 흰 잉크 ───────────────────────────────────────
cmp('구매완료 흰잉크', (1005, 1065, 130, 380), white(200))
# ── §6 평생 광고 제거 배너 하늘색 ───────────────────────────────────────
cmp('평생광고 배너 하늘색', (1560, 1820, 50, 1030), near((67, 188, 245), 34))
cmp('평생광고 금색 잉크', (1590, 1670, 560, 980), lambda w: (w[:, :, 0] > 205) & (w[:, :, 1] > 170) & (w[:, :, 2] < 190))
cmp('이동 버튼 초록 face', (1685, 1795, 690, 970), lambda w: (w[:, :, 1] > 170) & (w[:, :, 0] < 190) & (w[:, :, 2] < 140))
cmp('이동 흰잉크', (1700, 1770, 760, 900), white())
# ── §7 마일리지 리본 보라 ───────────────────────────────────────────────
cmp('마일리지 리본 몸통', (1885, 1990, 200, 880), lambda w: (w[:, :, 0] > 130) & (w[:, :, 2] > 170) & (w[:, :, 1] < 110))
cmp('마일리지 흰잉크', (1910, 1965, 400, 680), white())

print('%-26s %-22s %-22s %s' % ('요소', 'ref→프레임 (x,y,w,h)', 'cap (x,y,w,h)', 'Δ(x,y,w,h)'))
print('-' * 96)
bad = 0
for name, br, bc, d in ROWS:
    if d is None:
        print('%-26s %-22s %-22s  ??' % (name, br, bc))
        continue
    mark = ''
    if max(abs(v) for v in d) >= 6:
        mark = '   <<'
        bad += 1
    print('%-26s %-22s %-22s %s%s' % (name, str(br), str(bc), str(d), mark))
print('-' * 96)
print('Δ 6px 이상 항목: %d / %d' % (bad, len(ROWS)))
