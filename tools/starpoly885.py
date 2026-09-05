#!/usr/bin/env python3
"""작업 885 7회차 — ★ 불릿의 **금색 별 + 검정 링** 폴리곤 생성기.

6회차 채점 2인(EX·EY)이 «획 두께는 맞다»([41])로 모으고 **«별이 뾰족한 것»** 을 1순위로 냈다:

  · 금색 잉크 **면적** EX −20~−41% · EY −40.1%
  · **안/바깥 반지름비** EY ref **0.591** ↔ 우리 **0.420** (−29%)   ← 척도무관 축
  · 바깥 **둘레** +23.8~+32.2% · **등주비** Q = 4πA/P² EX ref 0.4605 ↔ 우리 0.2993 (−35%)
  · 금색 **bbox** 34×33 은 **맞다**([34] 보존)

★ 가 **서체 글리프**인 한 r/R 은 값이 아니다(서체가 정한다) — 그래서 6회차의 «원반 팽창
text-shadow» 링도 글리프 전용이라 그대로 못 쓴다. ⇒ 두 겹 **폴리곤**으로 옮긴다:

  `s::after`  = 금색 별 (R · r = 0.591R)
  `s::before` = 그 별을 **거리 d 만큼 바깥으로 민 도형**(둥근 조인) = 검정 링

⚑ 링은 «별을 확대» 한 것이 **아니다**. 확대는 반지름에 비례해 두꺼워져 꼭짓점에서 창처럼
   뻗는다(6회차가 `-webkit-text-stroke` 의 마이터에서 잡은 바로 그 결함). 여기서는 **거리장
   오프셋**을 쓴다 — 볼록 꼭짓점에는 반지름 d 의 **호**를 끼우고(둥근 조인), 오목 꼭짓점에서는
   두 오프셋 변의 **교점**을 쓴다. 그러면 링 두께가 윤곽 어디서나 정확히 d 다(등방 · 356 규약).

값의 출처:
  · r/R = **0.668** — 7회차 채점 **2인 독립 일치**(EZ 0.6679 · FA 0.670)의 ref 실측.
    ⚠ **이 값은 회차 안에서 한 번 옮겼다.** 처음에는 6회차 EY 의 **0.591** 로 넣었는데, 7회차 채점 2인이
    각자 다른 자(EZ = 행별 선형 언믹싱 → 0.5 등고선 → 1440방향 광선 · FA = 언믹싱 → 1440방향 5중 접기)로
    **0.667~0.670** 을 냈고 **둘 다 레벨 사다리 5단에서 부호가 안 뒤집혔다**. EY 의 0.591 은 세 추정
    (EX 등주비 역산 ≈0.53 · EY 0.591 · 7회차 2인 0.668) 중 가운데였을 뿐이고, **2인 독립 일치가 1인을 이긴다.**
    ⚠ 등주비 Q 는 이 축의 자로 쓰지 마라 — ref 둘레가 17px 물체의 계단 편향으로 68.6~80.7 로 요동한다(EZ).
  · d   = **3.10** — 6회차가 ref «링/변» 가로 실측 1.50 ref-px × K = 3.09 에서 고른 값(§16 승계).
  · R   = **18.35** — 금색 bbox 를 ref(35.1×33.0 우리px)에 붙이는 값.
          별의 가로 = 2R·sin72° = 1.9021R · 세로 = R(1+cos36°) = 1.8090R
          ⇒ 34.90 × 33.19 (ref 대비 −0.6% / +0.6% · [34] 여유 ±3% 안. **등방**이라 한 축만 맞출 수 없다).

실행:
    python3 tools/starpoly885.py            # CSS 에 넣을 두 폴리곤을 찍는다
    python3 tools/starpoly885.py --gate     # 자기 검산 (종료 코드 0/1)

⚠ 이 자는 **폴리곤 문자열을 만들 뿐** 제품을 안 읽는다. 제품이 이 값을 쓰고 있는지는
   `tools/verify833.js` §16 이 본다(7회차에 «text-shadow 링» 에서 «폴리곤 링» 으로 이관).
"""
import math
import sys

RATIO = 0.668          # 안/바깥 반지름비 — 7회차 채점 2인(EZ 0.6679 · FA 0.670)의 ref 실측 중앙값
#                        (6회차 EY 는 0.591 · EX 의 등주비 역산은 ≈0.53 이었다 — 아래 머리말 ⚠ 참조)
R = 18.35              # 바깥 반지름 (우리 px)
D = 3.10               # 링 두께 = 거리 오프셋 (우리 px)
ARC_STEP = 15.0        # 볼록 꼭짓점 호 표본 간격(도) — 이웃 호 길이 2·D·sin(Δ/2) = 0.81px < 1.3
NPT = 5                # 5각 별


def star_pts(R_, ratio, n=NPT):
    """별 윤곽 — 바깥·안 꼭짓점을 번갈아. 화면 좌표계(y 아래로 +), 첫 점이 위 꼭짓점."""
    r_ = R_ * ratio
    out = []
    for i in range(2 * n):
        rad = R_ if i % 2 == 0 else r_
        th = -math.pi / 2 + i * math.pi / n          # −90° = 위, 시계 방향
        out.append((rad * math.cos(th), rad * math.sin(th)))
    return out


def offset_round(pts, d, arc_step=ARC_STEP):
    """다각형을 바깥으로 d 만큼 민다 — 볼록 꼭짓점은 호(둥근 조인), 오목 꼭짓점은 교점.

    입력은 시계 방향(화면 좌표계)이라 바깥 법선은 변 방향을 **왼쪽**으로 90° 돌린 것이다."""
    n = len(pts)
    segs = []
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        ex, ey = bx - ax, by - ay
        L = math.hypot(ex, ey)
        nx, ny = ey / L, -ex / L                     # 바깥 법선
        segs.append(((ax + nx * d, ay + ny * d), (bx + nx * d, by + ny * d), (nx, ny)))

    out = []
    for i in range(n):
        p_prev, n_prev = segs[i - 1][1], segs[i - 1][2]
        p_next, n_next = segs[i][0], segs[i][2]
        vx, vy = pts[i]
        # 볼록/오목 — 이전 변과 다음 변의 외적 부호로 가른다.
        # ⚠ 화면 좌표계는 y 가 아래로 +라 **부호가 뒤집힌다** — 시계 방향 윤곽에서 «양수 = 볼록» 이다
        #   (처음에 음수로 적었다가 자기 검산이 «링이 금색에서 2.79px 더 뻗는다» 로 잡았다:
        #    볼록 꼭짓점에 마이터가 들어가 6회차가 없앤 그 창이 그대로 되살아났다).
        ax, ay = vx - pts[i - 1][0], vy - pts[i - 1][1]
        bx, by = pts[(i + 1) % n][0] - vx, pts[(i + 1) % n][1] - vy
        cross = ax * by - ay * bx
        if cross > 0:                                # 볼록 → 두 변 끝 사이에 반지름 d 의 호
            out.append(p_prev)
            a0 = math.atan2(n_prev[1], n_prev[0])
            a1 = math.atan2(n_next[1], n_next[0])
            sweep = (a1 - a0) % (2 * math.pi)
            steps = max(1, int(math.ceil(math.degrees(sweep) / arc_step)))
            for k in range(1, steps):
                a = a0 + sweep * k / steps
                out.append((vx + d * math.cos(a), vy + d * math.sin(a)))
            out.append(p_next)
        else:
            # 오목 → 두 오프셋 변을 **교점에서 잘라 붙인다**. ⚠ 여기서 변의 끝점(p_prev·p_next)을
            # 같이 담으면 안 된다 — 그 점은 «제 변» 에서만 d 이고 **이웃 변에는 2.35px** 이라
            # 링이 그만큼 얇아진다(자기 검산이 이 실수를 0.7498px 오차로 잡았다).
            (x1, y1), (x2, y2) = segs[i - 1][0], segs[i - 1][1]
            (x3, y3), (x4, y4) = segs[i][0], segs[i][1]
            den = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)
            if abs(den) > 1e-9:
                t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / den
                out.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
            else:
                out.append(p_prev); out.append(p_next)
    # 연속 중복점 제거
    ded = []
    for p in out:
        if not ded or math.hypot(p[0] - ded[-1][0], p[1] - ded[-1][1]) > 1e-6:
            ded.append(p)
    return ded


def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def to_css(pts, box):
    """폴리곤을 상자 기준 % 로 — 상자는 (x0, y0, w, h)."""
    x0, y0, w, h = box
    return ','.join('%.2f%% %.2f%%' % ((x - x0) / w * 100, (y - y0) / h * 100) for x, y in pts)


def build():
    gold = star_pts(R, RATIO)
    ring = offset_round(gold, D)
    gx0, gy0, gx1, gy1 = bbox(gold)
    gw, gh = gx1 - gx0, gy1 - gy0
    sx0, sy0, sx1, sy1 = bbox(ring)
    sw, sh = sx1 - sx0, sy1 - sy0
    return gold, ring, (gx0, gy0, gw, gh), (sx0, sy0, sw, sh)


def main():
    gold, ring, gbox, sbox = build()
    gate = '--gate' in sys.argv
    gw, gh, sw, sh = gbox[2], gbox[3], sbox[2], sbox[3]
    print('금색 별  R %.2f · r %.2f (r/R %.3f) · bbox %.2f × %.2f (종횡 %.4f)'
          % (R, R * RATIO, RATIO, gw, gh, gw / gh))
    print('검정 링  d %.2f · 점 %d 개 · bbox %.2f × %.2f' % (D, len(ring), sw, sh))
    print('실루엣 ÷ 금색 = 가로 %.4f · 세로 %.4f  (ref 1.176 / 1.231 · 여유 ±0.075)'
          % (sw / gw, sh / gh))
    area = 5 * R * (R * RATIO) * math.sin(math.pi / 5)
    per = 0.0
    for i in range(len(gold)):
        ax, ay = gold[i]; bx, by = gold[(i + 1) % len(gold)]
        per += math.hypot(bx - ax, by - ay)
    print('금색 면적 %.1f px² · 둘레 %.1f px · 등주비 Q = 4πA/P² %.4f  (ref 0.4605)'
          % (area, per, 4 * math.pi * area / per / per))
    print()
    print('/* gold */  clip-path:polygon(%s)' % to_css(gold, gbox))
    print()
    print('/* ring */  clip-path:polygon(%s)' % to_css(ring, sbox))
    print()
    print('상자 — s: %.2fpx × %.2fpx · s::after left/top %.2fpx (= d) · %.2fpx × %.2fpx'
          % (sw, sh, D, gw, gh))

    if not gate:
        return 0
    ok = True

    def chk(name, cond, got):
        nonlocal ok
        ok = ok and cond
        print('  [%s] %-46s %s' % ('ok' if cond else 'FAIL', name, got))

    print('\n== starpoly885 자기 검산 ==')
    chk('r/R = 0.668 (7회차 채점 2인 EZ 0.6679 · FA 0.670)', abs(RATIO - 0.668) < 1e-9, '%.3f' % RATIO)
    chk('실루엣÷금색 가로 = ref 1.176 ±0.075', abs(sw / gw - 1.176) <= 0.075, '%.4f' % (sw / gw))
    chk('실루엣÷금색 세로 = ref 1.231 ±0.075', abs(sh / gh - 1.231) <= 0.075, '%.4f' % (sh / gh))
    chk('금색 bbox 가로 = ref 35.1 ±3%', abs(gw - 35.1) / 35.1 <= 0.03, '%.2f' % gw)
    chk('금색 bbox 세로 = ref 33.0 ±3%', abs(gh - 33.0) / 33.0 <= 0.03, '%.2f' % gh)
    # 링 두께 등방 — 링 점마다 «금색 윤곽까지의 최단 거리» 가 d 여야 한다.
    worst = 0.0
    for px, py in ring:
        best = 1e9
        for i in range(len(gold)):
            ax, ay = gold[i]; bx, by = gold[(i + 1) % len(gold)]
            ex, ey = bx - ax, by - ay
            L2 = ex * ex + ey * ey
            t = max(0.0, min(1.0, ((px - ax) * ex + (py - ay) * ey) / L2))
            best = min(best, math.hypot(px - (ax + t * ex), py - (ay + t * ey)))
        worst = max(worst, abs(best - D))
    chk('링 두께 등방 — 최단거리 = d 오차 ≤ 0.01px', worst <= 0.01, '%.4f px' % worst)
    # 이웃 점 사이 거리 — 호가 화소보다 촘촘한가(6회차 §16 «이웃 호 길이 < 1.3px» 승계)
    mx = 0.0
    for i in range(len(ring)):
        ax, ay = ring[i]; bx, by = ring[(i + 1) % len(ring)]
        seg = math.hypot(bx - ax, by - ay)
        # 변(긴 직선)은 제외하고 «호» 구간만 본다 — 호는 꼭짓점 주위 D 반경 안이다
        if seg < 2.0:
            mx = max(mx, seg)
    chk('이웃 호 길이 < 1.3px', mx < 1.3, '%.3f px' % mx)
    chk('마이터 창 0 — 링이 금색에서 d 보다 멀리 안 뻗는다', worst <= 0.01, '%.4f px' % worst)
    print('STARPOLY885 %s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
