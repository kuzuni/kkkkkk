#!/usr/bin/env python3
# 작업 866 — 89 유물 소환 «부품 치수» 의 **자 하나**.
#
#   python3 tools/probe866.py                             # 레퍼런스만 잰다
#   node tools/probe866.js                                # 우리 렌더를 캡처해 아래를 같이 돌린다
#   python3 tools/probe866.py --cap <png> --geo <json>    # 둘을 같은 자로 나란히
#
# ── 왜 자를 새로 세우는가 ────────────────────────────────────────────────────
# 813 5·6회차 채점자 넷이 이 세 자리를 각자 쟀는데 **자기 자를 밝히지 않은 값이 섞였다.**
# A1 2차 라운드의 «계측 정의가 다르면 일치해도 틀린다» 와 같은 자리라, 866 은
# **레퍼런스와 우리 렌더를 같은 함수로** 재고 그 정의를 여기에 적어 둔다(334 규약).
#
# 재는 것(정의) —
#   ⓐ 수반 잉크 상변 : 중앙 띠에서 «배경보다 12 계조 밝은» 화소가 가로로 60px 이상 이어지는
#                      행이 **8행 연속** 나타나는 첫 행. (한 줄만 보면 위쪽 바닥·계단 결이
#                      500~502·511~515 에서 같은 길이의 줄을 만든다 — 실측으로 확인했다.)
#   ⓑ 수반 잉크 하변 : 밑판 아랫변 — 813 6회차 `scan813c` 의 정의를 **그대로** 가져왔다
#                      (안내문 위 30행 창에서 «가장 긴 밝은 가로줄», 그림자는 짧아 탈락).
#   ⓒ 림 최대 폭     : 상변~(높이의 30%) 구간의 최장 가로 연속.
#   ⓓ 발(밑판) 폭    : ⓑ 행의 가로 연속 길이.
#   ⓔ 알약 바깥 잉크 : 내부 색(#191614 — 두 그림이 **같은 값**)의 최장 가로 연속을 씨앗으로
#                      좌·우·상·하로 걸어 나가며 **검정 테두리(lum < 25)의 바깥 모서리**를 잡는다.
#                      걸음은 **국면 셋**이다(ⓐ 속 → ⓑ 베벨 ≤2px → ⓒ 검정 테두리, ⓒ 가 끊기면 끝).
#                      ⚠ 그 바깥의 밝은 띠(ref x181~183 · 301~303)는 **알약이 아니다** —
#                      알약 하변보다 6~11행 더 내려가므로 [검산] 절이 그것을 같이 찍는다.
#                      ⚑ **904 가 이 두 줄을 고쳤다** — 옛 판은 국면이 없어 ⓒ 뒤의 밝은 한 칸까지
#                      건너뛰어 세로를 24 → 26 으로 읽었고, 속 «폭» 을 bbox 가 아니라 최장 연속으로
#                      재서 113 → 111 로 읽었다. 두 오차가 «테 3 ref px» 를 만들어 제품이 4.5+2.2 로
#                      두꺼워졌다. 지금 값은 **바깥 117×24 · 속 113×20 · 테 등방 2** 다.
#
# 환산은 813·859 가 쓴 것과 같은 k = 1080 / 486 (ref 크롭 폭 → 프레임 폭).
import json
import sys

from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»

REF = 'docs/ref/89-유물-팝업.png'
K = 1080 / 486.0
EDGE_TH = 12
RUN_TOP, PERSIST = 60, 8
RUN_MIN = 60
DARK_TH = 25
PILL_RGB = (0x19, 0x16, 0x14)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def bg_of(px, y, strips):
    """그 행의 배경 기준선 — **창의 바깥 양끝 띠**(두 그림 모두 수반 밖인 자리)의 중앙값.
       ⚠ 처음에는 화면 좌우 끝(ref x30~110 · 380~455)을 썼는데, 우리 렌더는 그 자리가
       레퍼런스보다 밝아 문턱이 올라가 **림이 341 → 284 로 잘려 보였다**(자가 두 그림에
       다른 기준선을 준 것). 창 안에서 뽑으면 두 그림이 같은 자리를 본다."""
    v = sorted(lum(px[x, y]) for a, b in strips for x in range(int(a), int(b)))
    return v[len(v) // 2]


def diff_box(pa, pb, win, th=8):
    """우리 렌더는 **차분**으로 잰다 — 부품을 `visibility:hidden` 으로 한 번 더 찍어
       달라진 화소가 곧 그 부품의 잉크다. 문턱·배경 추정이 아예 없어 마스크가 갈릴 자리가 없다.
       (레퍼런스는 그런 사본을 못 만드니 위의 문턱 자를 쓰고, 그 자는 `scan813c` 와 값이 같다.)"""
    x0, y0, x1, y1 = [int(v) for v in win]
    rows = {}
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if abs(lum(pa[x, y]) - lum(pb[x, y])) > th]
        if xs:
            rows[y] = (min(xs), max(xs), max(xs) - min(xs) + 1)
    if not rows:
        return None
    ys = sorted(rows)
    return {'top': ys[0], 'bot': ys[-1], 'h': ys[-1] - ys[0] + 1,
            'w': max(r[2] for r in rows.values()),
            'foot': rows[ys[-1]][2],
            'l': min(r[0] for r in rows.values()), 'r': max(r[1] for r in rows.values())}


def best_run(px, y, band, bg):
    """배경보다 EDGE_TH 이상 «밝은» 화소의 최장 가로 연속 (길이, 시작, 끝)."""
    th = bg + EDGE_TH
    best, cur, start, bs, be = 0, 0, None, None, None
    for x in range(int(band[0]), int(band[1])):
        if lum(px[x, y]) > th:
            if cur == 0:
                start = x
            cur += 1
            if cur > best:
                best, bs, be = cur, start, x
        else:
            cur = 0
    return best, bs, be


def measure_bowl(px, band, strips, y0, y1, cap_y):
    """y0..y1 = 수반이 들어 있는 세로 창 · cap_y = 안내문(캡션) 윗선."""
    runs = {y: best_run(px, y, band, bg_of(px, y, strips))[0] for y in range(y0, y1)}
    top = None
    for y in range(y0, y1 - PERSIST):
        if all(runs[y + i] >= RUN_TOP for i in range(PERSIST)):
            top = y
            break
    if top is None:
        return None
    # ⓑ scan813c 정의 — 캡션 위 30행 창의 «최장 줄», 같은 길이면 더 아래 행
    edges = [(y, runs[y]) for y in range(cap_y - 30, cap_y) if y in runs and runs[y] >= RUN_MIN]
    if not edges:
        return None
    mx = max(e[1] for e in edges)
    bot = max(e[0] for e in edges if e[1] == mx)
    rim = max(runs[y] for y in range(top, min(top + max(8, int((bot - top) * .30)), y1)))
    return {'top': top, 'bot': bot, 'h': bot - top + 1, 'rim': rim, 'foot': mx}


def measure_pill(px, band, y0, y1):
    def inside(x, y):
        p = px[x, y]
        return all(abs(p[i] - PILL_RGB[i]) <= 6 for i in range(3))

    best = (0, None, None)
    for y in range(y0, y1):
        cur = None
        for x in range(int(band[0]), int(band[1])):
            if inside(x, y):
                if cur is None:
                    cur = x
            else:
                if cur is not None and x - cur > best[0]:
                    best = (x - cur, cur, y)
                cur = None
        if cur is not None and int(band[1]) - cur > best[0]:
            best = (int(band[1]) - cur, cur, y)
    if best[0] < 20:
        return None
    w, sx, sy = best
    cx = sx + w // 2

    def edge(dx, dy, x, y):
        """씨앗에서 걸어 나가 «검정 테두리» 의 바깥 모서리를 잡는다 — **국면 셋**으로 걷는다.
             ⓐ 속(어두움) → ⓑ 안쪽 하이라이트/베벨(밝음, ≤2px) → ⓒ 검정 테두리(어두움)
           ⓒ 가 **끊기면 그것으로 끝**이다. 다시 어두워져도 안 돌아간다.

           ⚑⚑ 904 1회차 수리 — 옛 판은 국면이 없어 «밝은 화소를 2칸까지 건너뛴다» 를
           ⓒ **뒤에서도** 적용했다. 알약 하변(y618) 아래 **y619 한 행만 밝고 y620 이 다시
           어둡다**(수반 받침의 그늘 — 알약 폭 113열 중 6열에서). 그 한 칸이 다리가 되어
           걸음이 y620 을 하변으로 삼았고, ref 세로가 24 가 아니라 **26** 으로 읽혔다.
           866 은 그 26 을 과녁으로 제품을 57.8 로 키웠고 `verify866` [C1] 은 자기가 만든
           과녁을 다시 물어 초록이었다(813 10회차 채점 2인이 화소로 +8.8~13.5% 를 잡았다).
           같은 화소를 국면 걸음으로 다시 재면 **117×24 = 260.0×53.3**(측정표 89 §코스트 필
           행이 처음부터 적어 둔 값)이고, 테는 가로·세로 **둘 다 2 ref px = 4.44** 로 등방이다.
           회귀는 `node tools/probe904.js` 의 [R] 이 이 옛 걸음을 그 자리에서 재현한다."""
        inner, outer, phase, bright = (x, y), (x, y), 'a', 0
        for _ in range(200):   # 걸음 수는 알약 반폭(≈140)보다 넉넉해야 한다
            x, y = x + dx, y + dy
            dark = lum(px[x, y]) < DARK_TH
            if phase == 'a':
                if dark:
                    inner = (x, y)
                else:
                    phase, bright = 'b', 1
            elif phase == 'b':
                if dark:
                    phase, outer = 'c', (x, y)
                else:
                    bright += 1
                    if bright > 2:      # 베벨이 아니다 = 테가 없다 ⇒ 속 끝이 곧 바깥
                        return inner
            else:
                if dark:
                    outer = (x, y)
                else:
                    break
        return outer if phase == 'c' else inner
    l, r = edge(-1, 0, cx, sy)[0], edge(1, 0, cx, sy)[0]
    vx = l + 10                     # 세로는 «아이콘·숫자 잉크» 를 피해 왼쪽 끝 안쪽에서 잰다
    t, b = edge(0, -1, vx, sy)[1], edge(0, 1, vx, sy)[1]
    # ⚑ **주 눈금은 «속»(평평한 #191614 칠) 이다** — 두 그림이 같은 색을 쓰고 경계가 한 겹뿐이라
    #   마스크가 갈릴 자리가 없다. 바깥(검정 테두리) 은 아래쪽에서 돌기둥 그늘과 붙어 ±2px 흔들린다.
    iy0, iy1 = sy, sy
    while inside(vx, iy0 - 1):
        iy0 -= 1
    while inside(vx, iy1 + 1):
        iy1 += 1
    # ⚑ 904 — 속 «폭» 은 **최장 연속(w)이 아니라 bbox** 다. 알약 속에는 아이콘·숫자 잉크가
    #   있어 연속이 끊기므로 w 는 언제나 실제보다 좁다(111 vs 실측 113 = −1.8%). 그 −1.8% 가
    #   테 두께로 흡수돼 866 의 «테 3 ref px» 를 만든 나머지 절반이다(다른 절반은 edge() 의
    #   국면 누락). 가운데 행에서 **가장 바깥 속 화소**로 잰다 — `probe904.js` 와 같은 정의.
    iy = (iy0 + iy1) // 2
    ins = [x for x in range(int(band[0]), int(band[1])) if inside(x, iy)]
    ix0, ix1 = (min(ins), max(ins)) if ins else (sx, sx + w - 1)
    return {'l': l, 'r': r, 't': t, 'b': b, 'w': r - l + 1, 'h': b - t + 1,
            'iw': ix1 - ix0 + 1, 'ih': iy1 - iy0 + 1, 'run': w}


def side_bands(px, pill, y1):
    """[검산] 알약 좌우 바깥의 밝은 띠가 «알약의 일부인가» — 알약보다 아래로 더 가면 아니다."""
    out = []
    for x in (pill['l'] - 3, pill['r'] + 3):
        ys = [y for y in range(pill['t'] - 8, y1) if lum(px[x, y]) > 40]
        if ys:
            out.append((x, min(ys), max(ys), max(ys) - pill['b']))
    return out


def main():
    a = sys.argv[1:]
    cap = a[a.index('--cap') + 1] if '--cap' in a else None
    geo = json.load(open(a[a.index('--geo') + 1], encoding='utf-8')) if '--geo' in a else None

    rp = Image.open(REF).convert('RGB').load()
    strips = [(30, 110), (380, 455)]           # scan813c 가 쓰는 좌우 여백 띠 그대로
    rb = measure_bowl(rp, (150, 340), strips, 505, 640, 639)
    rq = measure_pill(rp, (170, 320), 585, 625)

    print('PROBE866 — 89 유물 소환 부품 치수 (자 하나로 ref ↔ 우리)')
    print()
    print('  [ref] %s (486x687 크롭 · k = %.4f)' % (REF, K))
    print('    ⓐ 잉크 상변 y%d · ⓑ 밑판 아랫변 y%d ⇒ 수반 높이 **%d ref px = %.1f 프레임 px**'
          % (rb['top'], rb['bot'], rb['h'], rb['h'] * K))
    print('    ⓒ 림 폭 %d ref px = %.1f · ⓓ 발 폭 %d ref px = %.1f'
          % (rb['rim'], rb['rim'] * K, rb['foot'], rb['foot'] * K))
    print('    ⓔ 알약 **속**(평평한 #191614 칠) %dx%d ref px = **%.1fx%.1f 프레임 px**  ← 주 눈금'
          % (rq['iw'], rq['ih'], rq['iw'] * K, rq['ih'] * K))
    print('       (참고) 검정 테두리 바깥 x%d..%d · y%d..%d = %dx%d ref px = %.1fx%.1f'
          % (rq['l'], rq['r'], rq['t'], rq['b'], rq['w'], rq['h'], rq['w'] * K, rq['h'] * K))
    for x, a0, b0, d in side_bands(rp, rq, 640):
        print('       [검산] x%d 의 밝은 띠 y%d..%d — 알약 하변보다 **%+d행**  ⇒ %s'
              % (x, a0, b0, d, '알약 아님(뒤 돌기둥)' if d > 2 else '알약의 일부'))

    if not cap:
        print()
        print('  (우리 렌더는 `node tools/probe866.js` 가 캡처·기하를 만들어 여기에 물린다)')
        return

    cp = Image.open(cap).convert('RGB').load()
    P = geo['panel']
    ox, oy = P['x'], P['y']                       # 패널 좌상단(프레임 좌표)
    nb = Image.open(cap.replace('.png', '-nostone.png')).convert('RGB').load()
    nq = Image.open(cap.replace('.png', '-nocost.png')).convert('RGB').load()
    b, c = geo['basin'], geo['cost']
    ob = diff_box(cp, nb, (ox + b['x'] - 30, oy + b['y'] - 30,
                           ox + b['x'] + b['w'] + 30, oy + b['y'] + b['h'] + 30))
    oq = diff_box(cp, nq, (ox + c['x'] - 24, oy + c['y'] - 24,
                           ox + c['x'] + c['w'] + 24, oy + c['y'] + c['h'] + 24))
    # 알약 속 — 차분 상자 안에서 평평한 #191614 칠의 가로·세로 최장 연속
    def flat(px_, box):
        def ins(x, y):
            p = px_[x, y]
            return all(abs(p[i] - PILL_RGB[i]) <= 6 for i in range(3))
        wid = hei = 0
        for y in range(box['top'], box['bot'] + 1):
            cur = 0
            for x in range(box['l'], box['r'] + 1):
                cur = cur + 1 if ins(x, y) else 0
                wid = max(wid, cur)
        for x in range(box['l'], box['r'] + 1):
            cur = 0
            for y in range(box['top'], box['bot'] + 1):
                cur = cur + 1 if ins(x, y) else 0
                hei = max(hei, cur)
        return wid, hei
    iw, ih = flat(cp, oq)

    def d(v, r):
        return (v / r - 1) * 100
    print()
    print('  [우리] %s (프레임 1080x2280 · **차분** — 부품을 숨긴 사본과의 다른 화소)' % cap)
    print('    ⓐⓑ 수반 잉크 %.0f..%.0f ⇒ 높이 **%d** (ref %.1f · Δ %+.1f%%)'
          % (ob['top'] - oy, ob['bot'] - oy, ob['h'], rb['h'] * K, d(ob['h'], rb['h'] * K)))
    print('    ⓒ 최대(림) 폭 **%d** (ref %.1f · Δ %+.1f%%) · ⓓ 발 폭 **%d** (ref %.1f · Δ %+.1f%%)'
          % (ob['w'], rb['rim'] * K, d(ob['w'], rb['rim'] * K),
             ob['foot'], rb['foot'] * K, d(ob['foot'], rb['foot'] * K)))
    print('    ⓔ 알약 속 **%dx%d** (ref %.1fx%.1f · Δ 폭 %+.1f%% · 세로 %+.1f%%)'
          % (iw, ih, rq['iw'] * K, rq['ih'] * K, d(iw, rq['iw'] * K), d(ih, rq['ih'] * K)))
    print('       바깥 **%dx%d** (ref %.1fx%.1f · Δ 폭 %+.1f%% · 세로 %+.1f%%)'
          % (oq['w'], oq['h'], rq['w'] * K, rq['h'] * K,
             d(oq['w'], rq['w'] * K), d(oq['h'], rq['h'] * K)))

    if geo.get('bar') and geo.get('rows'):
        bar, rows = geo['bar'], geo['rows']
        print()
        print('  [ⓕ 배수 바] 좌 %.1f · 우 %.1f · 폭 %.1f · 중심 %.1f'
              % (bar['x'], bar['x'] + bar['w'], bar['w'], bar['x'] + bar['w'] / 2))
        for k in sorted(rows):
            v = rows[k]
            print('      격자 %s 행 %.1f..%.1f (중심 %.1f) — 좌 Δ%+.1f · 우 Δ%+.1f'
                  % (k, v['x'], v['x'] + v['w'], v['x'] + v['w'] / 2,
                     bar['x'] - v['x'], (bar['x'] + bar['w']) - (v['x'] + v['w'])))
        if geo.get('tabs'):
            for t in geo['tabs']:
                print('      칸 «%s» 폭 %.1f · 라벨 잉크 %.1f ⇒ 여유 %.1f'
                      % (t['t'], t['w'], t['ink'], t['w'] - t['ink']))


if __name__ == '__main__':
    main()
