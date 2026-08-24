# 23 훈련 팝업 — 자체 검증 스캔 (비평가 H 지적 반증/확인용)
from PIL import Image
import statistics as st

ref = Image.open('docs/ref/23-훈련-팝업.jpg').convert('RGB')
cap = Image.open('docs/review/23-r4.png').convert('RGB')
OFF = 425  # cap_y = ref_y - 425


def med(img, x0, x1, y0, y1):
    px = [img.getpixel((x, y)) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    return tuple(round(st.median([p[i] for p in px])) for i in range(3))


def row(img, y, x0, x1):
    return [img.getpixel((x, y)) for x in range(x0, x1 + 1)]


print('=== 1. ↑ 버튼 (ref x855..962 y1203..1307 / cap y778..882) ===')
# 세로 프로파일: 버튼 중앙 컬럼 x=908
print('-- ref 세로 프로파일 x=908 --')
for y in range(1200, 1312, 6):
    print(' ref y%4d %s' % (y, ref.getpixel((908, y))))
print('-- cap 세로 프로파일 x=908 --')
for y in range(1200 - OFF, 1312 - OFF, 6):
    print(' cap y%4d %s' % (y, cap.getpixel((908, y))))

# 화살표를 피한 좌측 면/림 구간에서 가로 프로파일
print('-- ref 가로 프로파일 y=1255 (버튼 세로중앙) --')
for x in range(850, 970, 4):
    print(' ref x%4d %s' % (x, ref.getpixel((x, 1255))))
print('-- cap 가로 프로파일 y=830 --')
for x in range(850, 970, 4):
    print(' cap x%4d %s' % (x, cap.getpixel((x, 830))))

print()
print('=== 2. 배수탭 x10|x30 구분선 존재 여부 (ref x664..668) ===')
# 측정표는 구분선 있다고 함. H 는 y1392 에서 없다고 함.
for y in (1340, 1355, 1370, 1385, 1392, 1398):
    seg = row(ref, y, 655, 678)
    print(' ref y%4d  %s' % (y, ' '.join('%3d' % p[0] for p in seg)))
print(' -- cap 대응 --')
for y in (1340, 1355, 1370, 1385, 1392, 1398):
    seg = row(cap, y - OFF, 655, 678)
    print(' cap y%4d  %s' % (y - OFF, ' '.join('%3d' % p[0] for p in seg)))

print()
print('=== 3. 진행바 초록 채움 세로 그라데이션 (ref x300 y1235..1275) ===')
for y in range(1234, 1278, 4):
    print(' ref y%4d %s | cap y%4d %s' % (y, ref.getpixel((300, y)), y - OFF, cap.getpixel((300, y - OFF))))

print()
print('=== 4. 진행바 트랙 빈구간 세로 (ref x700) ===')
for y in range(1234, 1278, 4):
    print(' ref y%4d %s | cap y%4d %s' % (y, ref.getpixel((700, y)), y - OFF, cap.getpixel((700, y - OFF))))

print()
print('=== 5. 헤더 갈색 밴드 세로 (ref x800 y934..1024) ===')
for y in range(932, 1028, 6):
    print(' ref y%4d %s | cap y%4d %s' % (y, ref.getpixel((800, y)), y - OFF, cap.getpixel((800, y - OFF))))

print()
print('=== 6. 서브탭 바 세로 (ref x700 y2021..2118, 비선택 구간) ===')
for y in range(2018, 2124, 5):
    print(' ref y%4d %s | cap y%4d %s' % (y, ref.getpixel((700, y)), y - OFF, cap.getpixel((700, y - OFF))))

print()
print('=== 7. 서브탭 뱃지 원 지름 (ref 중심 ~ (292,2035)) ===')
for img, nm, dy in ((ref, 'ref', 0), (cap, 'cap', -OFF)):
    for y in (2035 + dy,):
        seg = [x for x in range(260, 330) if img.getpixel((x, y))[0] > 180 and img.getpixel((x, y))[1] < 110]
        print(' %s y%d  빨강 x %s..%s (w%s)' % (nm, y, min(seg) if seg else '-', max(seg) if seg else '-',
                                                (max(seg) - min(seg) + 1) if seg else '-'))
