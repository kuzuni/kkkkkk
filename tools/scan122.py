#!/usr/bin/env python3
"""작업 122 — «정지 섬» 실측 (13회차 신설).

UI-REFERENCE §122 체크리스트의 미완 항목:
    [ ] 정지 섬 제거 — 소환 카드 3버튼+Lv 게이지(본문의 21%) · 마일리지 패널 내부 430×170 · 재화 «상품» 헤더 바
비평가 넷(W·X·AA·AB·AC·AD)이 회차마다 ④ 로 같은 것을 짚는데, 지금까지 «어디가 몇 %» 를
**눈으로** 세고 있었다. 게이트가 못 재는 것은 회차마다 되살아난다 — 그래서 숫자로 만든다.

재는 법: 한 주기를 등간격으로 채운 프레임들을 겹쳐 **한 번도 안 변한 화소**를 모은다.
    · 임계 THR — 화소가 «변했다» 고 볼 최소 채널 차(캡처 노이즈·안티에일리어싱 흡수)
    · 그 정지 마스크에서 **최대 직사각형**을 뽑아 «어느 구역이 죽어 있는가» 를 좌표로 준다
      (probe122b.js 와 같은 히스토그램 최대 직사각형)

⚠ 마지막 «먼 위상» 대조 프레임(cap122 의 t=8300)은 **빼고** 센다 — 한 주기 안의 정지 섬을
  재는 것이 목적이라 다른 주기의 프레임이 섞이면 주기가 긴 연출(광선 20s)이 정지 섬을 지워 버린다.

실행: python3 tools/scan122.py docs/review/122-r12-sum-{1..9}.png
      python3 tools/scan122.py --top 6 docs/review/122-r12-coin-1.png ...
"""
import sys
from pydep937 import Image
from pydep937 import fail         # 939 — 사용법 오류는 코드 3(2 는 «환경에 없음» 전용)

THR = 6      # 채널 차 임계
G = 8        # 격자 (8px)
TOP = 4      # 뽑을 직사각형 수
MIN_AREA = 40000   # 이보다 작은 정지 구역은 «섬» 으로 보고하지 않는다 (≈200×200)


def largest_in_row(hist):
    st, best = [], (0, 0, 0, 0)   # area, h, x0, x1
    for i in range(len(hist) + 1):
        h = 0 if i == len(hist) else hist[i]
        while st and hist[st[-1]] >= h:
            top = st.pop()
            left = st[-1] + 1 if st else 0
            area = hist[top] * (i - left)
            if area > best[0]:
                best = (area, hist[top], left, i - 1)
        st.append(i)
    return best


def top_rects(mask, W, H, n):
    m = [row[:] for row in mask]
    out = []
    for _ in range(n):
        hist = [0] * W
        best = (0, 0, 0, 0, 0)   # area,x0,x1,y0,y1
        for y in range(H):
            for x in range(W):
                hist[x] = hist[x] + 1 if m[y][x] else 0
            area, h, x0, x1 = largest_in_row(hist)
            if area > best[0]:
                best = (area, x0, x1, y - h + 1, y)
        if not best[0]:
            break
        out.append(best)
        for y in range(best[3], best[4] + 1):
            for x in range(best[1], best[2] + 1):
                m[y][x] = False
    return out


def main(paths, top=TOP, box=None):
    ims = [Image.open(p).convert('RGB') for p in paths]
    if box:
        ims = [im.crop((box[0], box[1], box[0] + box[2], box[1] + box[3])) for im in ims]
        print('구역 한정 %d×%d @(%d,%d)' % (box[2], box[3], box[0], box[1]))
    W, H = ims[0].size
    base = ims[0].load()
    others = [im.load() for im in ims[1:]]
    gw, gh = W // G, H // G
    # 격자 칸이 «통째로 정지» 일 때만 정지로 본다 (한 화소라도 움직이면 그 칸은 살아 있다)
    still = [[True] * gw for _ in range(gh)]
    for gy in range(gh):
        for gx in range(gw):
            alive = False
            for y in range(gy * G, (gy + 1) * G):
                if alive:
                    break
                for x in range(gx * G, (gx + 1) * G):
                    b = base[x, y]
                    for o in others:
                        c = o[x, y]
                        if abs(b[0] - c[0]) > THR or abs(b[1] - c[1]) > THR or abs(b[2] - c[2]) > THR:
                            alive = True
                            break
                    if alive:
                        break
            still[gy][gx] = not alive

    nstill = sum(r.count(True) for r in still)
    print('프레임 %d장 %d×%d · 임계 ΔCH>%d · 격자 %dpx' % (len(ims), W, H, THR, G))
    print('정지 화소 비율 %.1f%%  (움직이는 %.1f%%)' % (100 * nstill / (gw * gh), 100 * (1 - nstill / (gw * gh))))
    print('가장 큰 정지 구역 %d개 (>%dpx²만):' % (top, MIN_AREA))
    for k, (area, x0, x1, y0, y1) in enumerate(top_rects(still, gw, gh, top)):
        x, y = x0 * G, y0 * G
        w, h = (x1 - x0 + 1) * G, (y1 - y0 + 1) * G
        if w * h < MIN_AREA:
            continue
        print('   %d: %d×%d @(%d,%d)  = 화면의 %.1f%%' % (k + 1, w, h, x, y, 100 * w * h / (W * H)))


if __name__ == '__main__':
    args = sys.argv[1:]
    top, box = TOP, None
    while args and args[0].startswith('--'):
        if args[0] == '--top':
            top = int(args[1]); args = args[2:]
        elif args[0] == '--box':          # x,y,w,h — 이 구역만 센다(탭바·HUD 등 남의 구간 제외용)
            box = [int(v) for v in args[1].split(',')]; args = args[2:]
        else:
            fail('알 수 없는 옵션 ' + args[0], '쓰는 법은 `python3 tools/scan122.py` 를 인자 없이 부르면 나온다')
    if not args:
        print(__doc__)
        fail('프레임 png 를 하나도 안 줬다', '위 «실행» 줄대로 프레임 목록을 인자로 줘라')
    main(args, top, box)
