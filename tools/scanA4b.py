# A4 보조 스캐너 — [3] 노란 링 두께 임계 스윕 · [5] 슬롯별 아이콘 잉크 · [6] 하단 뱃지
#   python3 tools/scanA4b.py [회차]
# scanA4.py 와 같은 좌표 규약(cap y = ref y − 60).
import sys
from pydep937 import Image
from pydep937 import np

R = sys.argv[1] if len(sys.argv) > 1 else '6'
DY = 60
ref = np.asarray(Image.open('docs/ref/02-기본-메인-화면.jpg').convert('RGB')).astype(np.int32)
cap = np.asarray(Image.open('docs/review/A4-r' + R + '.png').convert('RGB')).astype(np.int32)
CX = [86, 216.5, 347, 476.5, 606, 736.5, 866.5, 996.5]
CY = 2074.0
ANG = np.arange(0, 360, 5) * np.pi / 180.0


def med(img, cx, cy, r):
    xs = np.clip(np.round(cx + r * np.cos(ANG)).astype(int), 0, img.shape[1] - 1)
    ys = np.clip(np.round(cy + r * np.sin(ANG)).astype(int), 0, img.shape[0] - 1)
    return np.median(img[ys, xs], axis=0)


print('[3b] 활성 슬롯 노란 밴드 — 임계 3종 스윕 (부호가 안 바뀌어야 믿을 수 있다)')
for gthr, bthr in ((150, 160), (170, 140), (190, 120)):
    for lbl, img, cy in (('REF', ref, CY), ('CAP', cap, CY - DY)):
        bands, cur = [], None
        for r in np.arange(30, 70, 0.5):
            c = med(img, CX[0], cy, r)
            y = c[0] > 200 and c[1] > gthr and c[2] < bthr
            if y and cur is None:
                cur = r
            elif not y and cur is not None:
                bands.append((cur, r - 0.5)); cur = None
        if cur is not None:
            bands.append((cur, 69.5))
        print('  G>%d,B<%d %s  ' % (gthr, bthr, lbl) + ' | '.join(
            'r%.1f~%.1f 두께%.1f' % (a, b, b - a + 0.5) for a, b in bands))
    print()

print('[5b] 슬롯별 스킬 아이콘 잉크 bbox (장착 1·2·3번 · well 중앙값 대비 Δ>60, well 원 안쪽만)')
yy, xx = np.mgrid[0:88, 0:88]
incircle = ((xx - 43.5) ** 2 + (yy - 43.5) ** 2) < 42 ** 2
for i in (0, 1, 2):
    for lbl, img, cy in (('REF', ref, CY), ('CAP', cap, CY - DY)):
        x0, y0 = int(CX[i] - 44), int(cy - 44)
        sub = img[y0:y0 + 88, x0:x0 + 88]
        well = np.median(sub[incircle].reshape(-1, 3), axis=0)
        m = (np.abs(sub - well).max(axis=2) > 60) & incircle
        if m.any():
            ys, xs = np.nonzero(m)
            w, h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            print('  %d번 %s  잉크 %dx%d  중심오프셋 x%+.1f y%+.1f  (well #%02x%02x%02x)' % (
                i + 1, lbl, w, h, (xs.min() + w / 2) - 43.5, (ys.min() + h / 2) - 43.5,
                int(well[0]), int(well[1]), int(well[2])))
    print()

print('[6b] 하단 뱃지 — 슬롯 하단 아래로 돌출한 덩어리 (슬롯 중심 ±34 열창, 배경 대비 Δ>50)')
for lbl, img, cy in (('REF', ref, CY), ('CAP', cap, CY - DY)):
    for i in (0, 1):
        bot = int(cy + 60)
        x0 = int(CX[i] - 34)
        # 배경 = 뱃지보다 훨씬 아래 20행
        bg = np.median(img[bot + 30:bot + 50, x0:x0 + 68].reshape(-1, 3), axis=0)
        sub = img[bot - 4:bot + 28, x0:x0 + 68]
        m = np.abs(sub - bg).max(axis=2) > 50
        if m.any():
            ys, xs = np.nonzero(m)
            print('  %s %d번  뱃지 폭 %d · 슬롯하단 아래 돌출 %d · x중심오프셋 %+.1f  (bg #%02x%02x%02x)' % (
                lbl, i + 1, xs.max() - xs.min() + 1, ys.max() - 4 + 1,
                (xs.min() + (xs.max() - xs.min() + 1) / 2) - 34,
                int(bg[0]), int(bg[1]), int(bg[2])))
        else:
            print('  %s %d번  돌출 없음' % (lbl, i + 1))
print()

print('[8] 행 bbox — 슬롯 외곽(어두운 링) 세로 투영으로 행 상단·하단 y')
for lbl, img, cy in (('REF', ref, CY), ('CAP', cap, CY - DY)):
    col = img[int(cy) - 80:int(cy) + 80, int(CX[4]) - 62:int(CX[4]) + 62]
    dark = (col.max(axis=2) < 95).sum(axis=1)
    idx = np.nonzero(dark >= 3)[0]
    print('  %s 5번 슬롯 세로 어두운 구간 y %d~%d (중심 %+.1f, 높이 %d)' % (
        lbl, int(cy) - 80 + idx.min(), int(cy) - 80 + idx.max(),
        (int(cy) - 80 + (idx.min() + idx.max()) / 2) - cy, idx.max() - idx.min() + 1))
