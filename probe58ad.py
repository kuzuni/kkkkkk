#!/usr/bin/env python3
"""58 28회차 — `probe58ad.js` 가 받은 프레임에서 «계단 막대» 를 되읽어
«정답표 ↔ 프레임 페인트» 시계 어긋남(lag)을 낸다.

lag = (프레임 타임스탬프 T) − (그 프레임이 실제로 그리고 있는 계단의 DOM 시각)

lag 이 0 근처면 `cap58.js` 의 «T 이하의 마지막 표본» 규칙이 옳고,
lag 이 프레임 한 칸(≈16.7ms)보다 크면 **정답표가 그만큼 앞서 있다** —
비평가가 «카운터가 정답표보다 늦다» 로 읽는 것이 하네스 결함이라는 뜻이다.

사용: python3 probe58ad.py <manifest.json>
"""
import sys, json, statistics
from PIL import Image

man = json.load(open(sys.argv[1], encoding='utf-8'))
rows = man['rows']                      # [[계단번호, DOM Date.now()], ...]
t_of = {i: t for i, t in rows}
n_steps = len(rows)
STEP = man.get('step', 8)               # R 채널 계단 폭
CYCLE = man.get('cycle', 32)            # 되풀이 주기(계단 수)

# 계단은 (i % CYCLE) * STEP 이라 CYCLE 칸마다 되풀이한다 — 프레임 순서를 이용해 되감는다.
# 한 화소가 아니라 60×60 블록 평균을 쓴다: JPEG q55 로 캡처하는 `cap58` 교정 경로에서도
# 크로마 서브샘플링·블록 노이즈에 견뎌야 한다(단일 화소는 ±12 까지 튄다).
recs = []
for fr in man['frames']:
    im = Image.open(fr['file']).convert('RGB').crop((70, 70, 130, 130))
    px = list(im.getdata())
    n = len(px)
    r = sum(p[0] for p in px) / n
    g = sum(p[1] for p in px) / n
    b = sum(p[2] for p in px) / n
    if g > 40 or b > 40:                # 막대가 안 얹힌 프레임(계측 전/후)
        continue
    v = int(round(r / float(STEP)))
    if v > CYCLE - 1:
        continue
    recs.append({'t': fr['t'], 'v': v})

if not recs:
    print('probe58ad: 계단 막대를 읽은 프레임이 없다 — 막대 위치/색을 확인하라')
    sys.exit(1)

# v(0..31) → 실제 계단 번호. 프레임은 시간순이므로 되감기를 세면서 복원한다.
cyc, prev, idx = 0, None, []
for rc in recs:
    if prev is not None and rc['v'] < prev - CYCLE // 2:
        cyc += 1
    prev = rc['v']
    idx.append(cyc * 32 + rc['v'])

lags, pairs = [], []
for rc, i in zip(recs, idx):
    if i not in t_of:
        continue
    lag = rc['t'] - t_of[i]
    lags.append(lag)
    pairs.append((round(rc['t'] - rows[0][1]), i, round(lag, 1)))

if not lags:
    print('probe58ad: 계단 번호 복원 실패')
    sys.exit(1)

lags.sort()
med = statistics.median(lags)
frame_ms = statistics.median([rows[i + 1][1] - rows[i][1] for i in range(len(rows) - 1)]) if n_steps > 1 else 16.7

print(f'· rAF 표본 {n_steps}개 · 판독 프레임 {len(lags)}장 · rAF 중앙 간격 {frame_ms:.1f}ms')
print(f'· lag = 프레임 타임스탬프 − 그려진 DOM 시각')
print(f'   중앙값 {med:.1f}ms · 최소 {lags[0]:.1f} · 최대 {lags[-1]:.1f} · '
      f'p10 {lags[int(len(lags)*0.1)]:.1f} · p90 {lags[int(len(lags)*0.9)]:.1f}')
print(f'· rAF 칸수로 환산: 중앙 {med/frame_ms:.2f}칸 · 최대 {lags[-1]/frame_ms:.2f}칸')
over = sum(1 for l in lags if l > frame_ms)
print(f'· lag > rAF 한 칸({frame_ms:.1f}ms) 인 프레임: {over}/{len(lags)} ({over*100.0/len(lags):.1f}%)')
print()
print('  판정 —')
if med > frame_ms:
    print(f'  ⚠ 정답표가 프레임보다 **중앙 {med:.0f}ms({med/frame_ms:.1f} rAF 칸) 앞선다.**')
    print(f'    `cap58.js` 의 «T 이하의 마지막 표본» 을 «T − {med:.0f}ms 이하의 마지막 표본» 으로 보정해야')
    print(f'    비평가가 프레임에서 읽는 값과 정답표가 같아진다.')
else:
    print(f'  ✓ 중앙 lag {med:.1f}ms 는 rAF 한 칸({frame_ms:.1f}ms) 이하다 — 정답표 규칙은 옳다.')
    print(f'    «카운터가 늦다» 는 지적의 축은 하네스가 아니다.')
print()
print('  표본(프레임t / 그려진 계단 / lag): ' + '  '.join(f'{a}:{b}:{c}' for a, b, c in pairs[:24]))

# 기계 판독용 — `cap58.js` 의 정답표 보정이 이 줄을 읽는다.
# 막대는 rAF 콜백에서 색을 바꾸므로 그 페인트는 한 칸 뒤에 올라간다 → 그만큼 빼야 «프레임이
# 자기 타임스탬프보다 얼마나 낡았나» 가 된다(음수는 0 으로 눕힌다).
p10 = lags[int(len(lags) * 0.10)]
p90 = lags[int(len(lags) * 0.90)]
print(f'P58AD_LAG_LO={max(0.0, p10 - frame_ms):.1f} '
      f'P58AD_LAG_MED={max(0.0, med - frame_ms):.1f} '
      f'P58AD_LAG_HI={max(0.0, p90 - frame_ms):.1f} '
      f'P58AD_N={len(lags)}')
