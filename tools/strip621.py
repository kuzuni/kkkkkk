#!/usr/bin/env python3
# 작업 621 — 채점용 «필름 스트립» 합성
#
#   python3 tools/strip621.py [회차]
#
# ⚑ 1회차 교훈 — **스틸 여덟 장으로 «왕복» 을 채점시키면 자가 캡처 지연에 진다.**
#   `page.screenshot` 한 장이 수백 ms 를 먹는데 홀드 틱은 60~160ms 라, 실시간 표본은
#   ① 위상이 앨리어싱으로 한쪽에 몰리고 ② 로그(샘플 시각)와 그림(찍힌 시각)이 어긋난다.
#   비평가 CI·CJ 가 **같은 그림을 보고 서로 다른 장수**를 셌고(CJ 는 로그와도 어긋났다) 둘 다
#   «왕복이 안 보인다» 로 읽었다.
#   ⇒ 2회차는 «한 틱» 을 **위상 고정**(애니메이션을 pause 하고 currentTime 을 박아) 찍은 c1~c6 을
#     한 장에 이어 붙여 준다 — 그림과 위상이 1:1 이라 어긋날 자리가 없다.
#
# 결과: docs/review/621-r<n>-<자리>-strip.png (쉼 · 한 사이클 6위상 · 뗌 뒤)
import sys, os, json
from pydep937 import Image, ImageDraw

R = sys.argv[1] if len(sys.argv) > 1 else '2'
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'review')
SPOTS = ['train', 'rune', 'temper']
TAGS = [('rest', '쉼(누르기 전)'), ('c1', '0%'), ('c2', '15%'), ('c3', '30%'), ('c4', '45%'),
        ('c5', '60%'), ('c6', '80%'), ('c7', '100%'), ('after', '뗌 뒤')]
GAP, PAD, BAR = 14, 10, 26

meta = {}
mp = os.path.join(OUT, '621-r%s-frames.json' % R)
if os.path.exists(mp):
    meta = json.load(open(mp, encoding='utf-8'))

made = []
for sp in SPOTS:
    ims = []
    for tag, _ in TAGS:
        f = os.path.join(OUT, '621-r%s-%s-%s.png' % (R, sp, tag))
        if os.path.exists(f):
            ims.append((tag, Image.open(f).convert('RGB')))
    if not ims:
        continue
    w = max(i.width for _, i in ims)
    h = max(i.height for _, i in ims)
    W = PAD * 2 + len(ims) * w + (len(ims) - 1) * GAP
    H = PAD * 2 + h + BAR
    canvas = Image.new('RGB', (W, H), (24, 24, 28))
    d = ImageDraw.Draw(canvas)
    for k, (tag, im) in enumerate(ims):
        x = PAD + k * (w + GAP)
        canvas.paste(im, (x, PAD))
        # 상자 테두리 — «크롭 상자는 고정» 을 눈으로 확인할 수 있게
        d.rectangle([x, PAD, x + im.width - 1, PAD + im.height - 1], outline=(120, 120, 130))
        label = dict(TAGS)[tag]
        d.text((x + 4, PAD + h + 6), label, fill=(230, 230, 235))
    f = os.path.join(OUT, '621-r%s-%s-strip.png' % (R, sp))
    canvas.save(f)
    made.append(os.path.basename(f))
    if sp in meta and meta[sp].get('cycle'):
        print('  %-7s 사이클 폭 %s' % (sp, ' '.join('%s%%:%s' % (int(c['phase'] * 100), c['w']) for c in meta[sp]['cycle'])))

print('%d장 — %s' % (len(made), os.path.abspath(OUT)))
for m in made:
    print('  ' + m)
