# 작업 58 36회차 — `tools/p58ar.js` 가 찍은 «같은 프레임 두 장»을 «비평가 BF 의 자»로 비교한다.
#
#   가림률 = (코인 없는 그림의 글자 잉크 화소 중 코인 있는 그림에서 색이 바뀐 화소) / (그 잉크 화소)
#
# 글자 잉크 마스크는 «버튼 배경보다 밝은 화소»로 잡는다 — «모두 받기» 는 색 버튼 위 흰 글자다.
# 임계는 하나로 고정하지 않고 스윕한다(A3 8회차 «임계를 흔들어도 부호가 안 바뀌어야 진짜다»).
#
# 실행: python3 tools/p58ar.py <디렉터리>
import sys, os, glob
from pydep937 import Image

d = sys.argv[1] if len(sys.argv) > 1 else '.p58ar'


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


print('=== p58ar — «모두 받기» 글자 잉크 가림률 (BF 의 자: 화소) ===')
stops = sorted(int(os.path.basename(f)[5:-4]) for f in glob.glob(os.path.join(d, 'base-*.png')))
if not stops:
    print('  base-*.png 가 없다 — 먼저 node tools/p58ar.js 를 돌려라')
    sys.exit(1)
for thr in (170, 190, 210, 230):
    cells = []
    for t in stops:
        base = Image.open(os.path.join(d, 'base-%d.png' % t)).convert('RGB')
        im = Image.open(os.path.join(d, 'hold-%d.png' % t)).convert('RGB')
        if im.size != base.size:
            cells.append('%dms 크기불일치' % t)
            continue
        W, H = base.size
        bp, ip = base.load(), im.load()
        ink = ch = 0
        for y in range(H):
            for x in range(W):
                if lum(bp[x, y]) < thr:
                    continue
                ink += 1
                # «바뀌었다» = 채널 최대 차 24 이상 (PNG 라 압축 노이즈가 없다. 24 는 안티에일리어싱 몫)
                if max(abs(ip[x, y][c] - bp[x, y][c]) for c in range(3)) >= 24:
                    ch += 1
        cells.append('%4dms %5.1f%% (잉크 %d)' % (t, 100.0 * ch / ink if ink else 0.0, ink))
    print('  임계 %3d | %s' % (thr, ' | '.join(cells)))
