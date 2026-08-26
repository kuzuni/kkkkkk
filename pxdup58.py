#!/usr/bin/env python3
"""58 24회차 신설 — «부분 중복 페인트» 검출기.

23회차가 넣은 `cap58.js` 의 «⚠ 중복 페인트» 경고는 **프레임 전체가 바이트 동일** 할 때만 운다.
24회차에 비평가 AR 이 낸 ①-1(«gain 10↔11, 70ms 동안 비행 코인 6개 완전 정지 — HUD 는 4,092px
바뀌었으므로 캡처 중복이 아니다»)을 `probe58t` 로 DOM 에서 재니 **그 구간에 아이콘이 프레임마다
45~63px 씩 움직이고 있었다**(정지 프레임 0). 그런데 파일을 직접 재면 AR 이 맞다 —
비행 밴드 y400~800 변경 **0px** · HUD y0~160 변경 5,408px.

즉 CDP 스크린캐스트가 **레이어별로 부분 재합성**한 프레임을 내보낸다: HUD(자체 합성 레이어에서
CSS 애니메이션 중)는 새로 그리고 `#fxl` 오버레이의 페인트는 앞 프레임 것을 재사용한다.
프레임 전체는 서로 다르므로 md5 로는 절대 안 잡히고, 비평가는 «연출이 멈췄다» 로 정직하게 읽는다.
23회차·24회차 ① 감점의 상당 부분이 이 계열이다.

→ 인접 슬롯 쌍마다 **구역별로** 변경 픽셀을 세서, «연출 구역은 0 인데 다른 구역은 바뀐» 쌍을
  경고한다. 이 경고는 비평가 전달문에 그대로 옮겨야 한다(0번 규칙과 같다).

사용: python3 pxdup58.py r24
"""
import sys, os, glob, re

try:
    from PIL import Image, ImageChops
except ImportError:
    print('pxdup58: PIL 이 없다 — `pip install pillow` 후 다시 돌려라'); sys.exit(0)

TAG = sys.argv[1] if len(sys.argv) > 1 else 'r24'
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'review')

# 구역 — 연출이 사는 곳과 «그 프레임이 살아 있다» 는 증거가 되는 곳. 프레임은 1080x2280.
#   첫 판(24회차)은 «어느 구역이든 0 이면 경고» 였는데, 하단 탭바처럼 **원래 안 변하는** 구역이
#   매 쌍에서 걸려 15건 중 12건이 잡음이었다. 판정을 절대값이 아니라 **그 씬 자신의 중앙값 대비**로
#   바꾼다 — 연출 구역이 이웃 쌍들의 5% 밑으로 떨어지면서 다른 구역은 살아 있는 쌍만 운다.
ZONE_FX   = ('연출밴드', (0,  160, 1080, 1900))
ZONE_LIVE = ('HUD',      (0,    0, 1080,  160))
# 27회차 — 세 번째 구역 «복도». 26차 AU ①-1 이 «레인 x960~1080 변경 0px 인데 화면 전체 변경
#   bbox 는 토스트 하나» 로 quest 13↔14 를 잡았는데, ZONE_FX(0,160,1080,1900)는 그 **토스트**
#   (x432~647 y131~206)까지 품고 있어서 토스트 한 개의 변화가 구역 전체 비율을 임계 위로 밀어 올린다.
#   비행 스프라이트만 사는 좁은 띠를 따로 본다 — 패널 씬(quest)의 복도가 여기다.
#   ⚠ 띠의 왼쪽 끝은 **팝업 껍데기 밖**이어야 한다 — `.mbox` 우변이 989 라 940 으로 잡으면
#     팝업 테두리·행 갱신이 띠에 들어와 «점유» 판정이 항상 참이 되고, 퍼짐 구간(복도가 원래
#     비어 있는 때)까지 복도 중복으로 오검출한다(27회차 첫 판이 quest 3↔4 · 5↔6 을 그렇게 냈다).
ZONE_LANE = ('복도',     (995, 160, 1080, 1600))
# 27회차 — **임계 0.05 는 너무 빡빡했다.** 26차 비평가 두 사람이 quest f11↔f12(972→1041ms) ·
#   f13↔f14(1164→1217ms) 를 «스프라이트 bbox 가 화소 단위로 동일 · 중심 이동 0.0px» 로 각각
#   ① 최대 감점에 올렸는데, 이 검출기는 두 쌍 다 **경고하지 않았다**(AV 실측 그 쌍의 연출 구역
#   변경 = 씬 중앙값의 **12%** — 임계 5% 를 통과해 버렸다).
#   신설 `probe58ab.js` 로 같은 두 창을 DOM 에서 rAF 마다 재니 **게임은 멀쩡히 움직인다**:
#     960~1050ms  프레임간 최대 이동 **260.89px** · 정지 쌍 0
#     1155~1225ms 프레임간 최대 이동  **60.88px** · 정지 쌍 0
#   (`verify93` [2b] 의 «정지 프레임 0/348» 과도 일치한다.) 즉 두 쌍 다 **캡처가 연출 레이어의
#   앞 페인트를 재사용한 것**이고, 못 잡은 것은 게임이 아니라 이 임계다.
#   → 0.05 → **0.20**. 그리고 경고 여부와 무관하게 **낮은 쪽 3쌍의 비율을 항상 찍는다** —
#     다음 회차가 «임계 바로 위» 에서 또 같은 일을 당하지 않게 분포를 눈으로 보라는 뜻이다.
#   ⚠ 이 값을 다시 내리려면 먼저 `probe58ab` 로 그 창이 DOM 에서도 정지인지 확인해라.
#     이 씬들은 DOM 기준 정지 쌍이 **0** 이므로, 이미지에서 «거의 안 변한» 쌍은 캡처 결함이다.
RATIO     = 0.20     # 씬 중앙값 대비 이 비율 아래면 «페인트 재사용» 후보 (27회차: 0.05 → 0.20)
MINLIVE   = 400      # 다른 구역이 이만큼은 바뀌어야 «프레임 자체는 새것» 이다
THRESH = 12          # 채널 차 — JPEG 압축 잡음 위
STEP   = 2           # 2px 격자 표본(결과는 ×4 로 환산)

def changed(a, b, box):
    ca, cb = a.crop(box), b.crop(box)
    df = ImageChops.difference(ca, cb)
    px = df.load(); w, h = df.size
    n = 0
    for y in range(0, h, STEP):
        for x in range(0, w, STEP):
            if max(px[x, y]) > THRESH:
                n += 1
    return n * STEP * STEP

def main():
    scenes = {}
    for f in glob.glob(os.path.join(D, '58-%s-*.jpg' % TAG)):
        m = re.search(r'58-%s-([a-z]+)-(\d+)\.jpg$' % TAG, f)
        if m:
            scenes.setdefault(m.group(1), []).append((int(m.group(2)), f))
    if not scenes:
        print('pxdup58: docs/review/58-%s-*.jpg 를 못 찾았다' % TAG); return
    warned = 0
    for sc in sorted(scenes):
        files = [f for _, f in sorted(scenes[sc])]
        pairs = []
        for i in range(len(files) - 1):
            a = Image.open(files[i]).convert('RGB')
            b = Image.open(files[i + 1]).convert('RGB')
            pairs.append((i + 1, i + 2,
                          changed(a, b, ZONE_FX[1]), changed(a, b, ZONE_LIVE[1]),
                          changed(a, b, ZONE_LANE[1])))
        fx = sorted(p[2] for p in pairs)
        med = fx[len(fx) // 2] if fx else 0
        print('· %s %d장 — 연출 구역 프레임간 변경 중앙값 %dpx' % (sc, len(files), med))
        if med:
            low = sorted(pairs, key=lambda p: p[2])[:3]  # noqa
            print('    · 가장 낮은 3쌍: ' + ' · '.join(
                '%d↔%d %.1f%%' % (p[0], p[1], 100.0 * p[2] / med) for p in low)
                + '  (임계 %.0f%% — 임계 바로 위 쌍은 비평가가 «정지» 로 읽는다)' % (100 * RATIO))
        lanes = sorted(p[4] for p in pairs)
        lmed = lanes[len(lanes) // 2] if lanes else 0
        # 복도 판정은 «복도에 코인이 실제로 있을 때» 만 유효하다 — 퍼짐 구간(코인이 아직 출발점
        # 근처)에는 복도가 원래 비어 있어서 «변경 0» 이 정상이다(그대로 두면 27회차 첫 판이
        # quest 3↔4 · 5↔6 을 오검출했다). 기준 프레임(1번) 대비 복도 변화량으로 «점유» 를 잰다.
        base = Image.open(files[0]).convert('RGB')
        occ = [changed(base, Image.open(f).convert('RGB'), ZONE_LANE[1]) for f in files]
        omed = sorted(occ)[len(occ) // 2] if occ else 0
        # ── 30회차 신설 — «레이어가 여러 프레임 연속 낡은» 경우 ──
        # 위 쌍 검사는 **이웃 두 장**만 본다. 그래서 연출 레이어가 3~4장 연속 낡으면
        # (그 사이 HUD·팝업은 계속 갱신되므로) 쌍마다 «많이 바뀌었다» 로 통과해 버린다.
        # 30회차 실측이 그 경우다 — 씬 B 의 코인이 `page.screenshot()`(강제 합성)에는
        # **t=154ms 에 이미** 밴드에 골드 6311px 로 있는데, 스크린캐스트 f2(91)·f3(153)·f4(283)
        # 에는 607~622px(= 없음) 이고 f5(383)에서야 5110px 로 나타난다. 29차 AZ ①-3 과
        # 30차 BB ① 이 라운드를 건너 이것을 «트리거 후 무반응» 으로 감점했다.
        # → 각 프레임을 **기준(1번) 프레임과** 직접 비교해 시계열로 찍는다. 뒤 프레임이 큰데
        #   앞 프레임이 그 20% 밑이면 «그 구간은 레이어가 낡았다» 로 운다.
        bfx = [changed(base, Image.open(f).convert('RGB'), ZONE_FX[1]) for f in files]
        bmax = max(bfx) if bfx else 0
        print('    · 기준 대비 연출밴드 변화량: ' + ' '.join(
            '%d:%d' % (i + 1, v) for i, v in enumerate(bfx)))
        if bmax:
            # 임계 — r30 실측: quest 슬롯 2·3·4 가 최대치의 24~27%(체크·버스트·버튼 누름은
            # 제대로 그려지고 **재화만** 빠져 있어서 0 이 아니다), 슬롯 5 부터 96~100%.
            # 0.20 으로는 그 셋이 안 잡힌다 → 0.35. 오검출 확인: gain 슬롯 2 는 65%(안 걸림) ·
            # gain 뒤쪽·upg 뒤쪽은 낮지만 «뒤 슬롯이 다시 커지는» 조건에 안 걸린다(연출이 끝난 것).
            stale = [i for i in range(1, len(bfx))
                     if bfx[i] < bmax * 0.35 and max(bfx[i + 1:] or [0]) > bmax * 0.60]
            if stale:
                warned += 1
                print('  \u26a0 레이어 지연 %s: 슬롯 %s — 기준 대비 연출밴드 변화가 최대치의 20%% 미만인데'
                      ' **뒤 슬롯에서 갑자기 채워진다**. 강제 합성(`p58ai.js`)으로 같은 시각을 찍어'
                      ' 확인할 것 — 30회차에는 화면에 이미 있었고 캡처만 낡았다.'
                      % (sc, ', '.join(str(i + 1) for i in stale)))
                print('    \u2192 전달문: \u00ab%s 슬롯 %s 는 캡처가 연출 레이어를 아직 안 올린 것이다.'
                      ' 이 구간을 \u00ab트리거 후 무반응\u00bb\u00b7\u00ab재화가 안 나온다\u00bb 로 세지 말 것.\u00bb'
                      % (sc, ', '.join(str(i + 1) for i in stale)))
        busy = [o > max(400, omed * 0.5) for o in occ]
        for i1, i2, vfx, vlive, vlane in pairs:
            # ⓐ 전면 중복 — 두 구역이 **같이** 죽었다. 26차 quest 2↔3 이 이것이다(AU·AV 공통:
            #   «화소 최대차 4 · 임계 초과 0개 · HUD 포함 0px»). MINLIVE 조건이 있는 아래 ⓑ 로는
            #   절대 안 걸리는데(HUD 도 안 변했으니), 비평가에게는 «306ms 무반응» 으로 보인다.
            #   cap58 의 md5 검사도 못 잡는다 — 같은 페인트라도 JPEG 재인코딩이 바이트를 바꾼다.
            if med and vfx < med * RATIO and vlive < MINLIVE:
                warned += 1
                print('  ⚠ 전면 중복 페인트 %s: %d↔%d — 연출 구역 %dpx(중앙값의 %.1f%%) · HUD %dpx. '
                      '**두 장이 같은 페인트다**(md5 는 JPEG 재인코딩 때문에 못 잡는다)'
                      % (sc, i1, i2, vfx, 100.0 * vfx / med, vlive))
                print('    → 전달문: «%s 슬롯 %d↔%d 는 캡처가 같은 페인트를 두 번 쓴 것이다. '
                      '이 구간을 «무반응»·«정지» 로 세지 말 것 — 그 시각의 연출은 다음 슬롯에서 본다.»'
                      % (sc, i1, i2))
                continue
            # ⓒ 복도만 죽었다 — 토스트·HUD 가 살아 있어 ⓑ 의 구역 비율로는 안 걸리는 쌍
            if (lmed and vlane < lmed * RATIO and vfx >= med * RATIO and vlive >= MINLIVE
                    and busy[i1 - 1] and busy[i2 - 1]):
                warned += 1
                print('  ⚠ 복도 중복 페인트 %s: %d↔%d — 복도 띠(x%d~%d) 변경 %dpx '
                      '(이 씬 복도 중앙값 %dpx 의 %.1f%%) 인데 연출 구역 전체는 %dpx 바뀌었다 '
                      '(대개 토스트·HUD 몫이다)'
                      % (sc, i1, i2, ZONE_LANE[1][0], ZONE_LANE[1][2], vlane, lmed,
                         100.0 * vlane / max(1, lmed), vfx))
                print('    → 전달문: «%s 슬롯 %d↔%d 는 캡처가 **비행 스프라이트 레이어만** 앞 페인트를 '
                      '재사용한 것이다. 이 쌍에서 코인이 안 움직이는 것을 «정지» 로 세지 말 것 — '
                      '같은 창을 DOM 에서 재면(probe58ab) 프레임간 최대 이동이 60~261px 다.»'
                      % (sc, i1, i2))
                continue
            if med and vfx < med * RATIO and vlive >= MINLIVE:
                warned += 1
                print('  ⚠ 부분 중복 페인트 %s: %d↔%d — 연출 구역 변경 %dpx '
                      '(이 씬 중앙값의 %.1f%%) 인데 HUD 는 %dpx 바뀌었다'
                      % (sc, i1, i2, vfx, 100.0 * vfx / med, vlive))
                print('    → 전달문: «%s 슬롯 %d↔%d 는 캡처가 연출 레이어의 앞 프레임 페인트를 '
                      '재사용한 것이다(프레임 전체는 서로 다르므로 md5 로는 안 잡힌다). '
                      '이 쌍에서 연출이 안 움직이는 것을 «정지»·«무반응» 으로 세지 말 것.»'
                      % (sc, i1, i2))
    if not warned:
        print('\nPXDUP58 CLEAN — 부분 중복 페인트 없음')
    else:
        print('\nPXDUP58 %d건 — 위 전달문을 비평가 브리프에 그대로 옮겨라' % warned)

main()
