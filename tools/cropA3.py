# A3 상단 HUD — 레퍼런스 HUD 밴드 잘라내기 (비평가용).
# 레퍼런스 1080x2340 의 y=84..244(=상태바 아래 160px) 를 잘라 우리 캡처 crop(1080x160, 프레임 y=0..160)과
# «같은 크기·같은 좌표계» 로 맞춘다 — 세로 변환 «ref y − 84 = cap y» 가 crop 안에서는 0 이 된다.
#   python3 tools/cropA3.py            → docs/review/A3-ref-hud.png
from pydep937 import Image

REF = 'docs/ref/02-기본-메인-화면.jpg'
OUT = 'docs/review/A3-ref-hud.png'
im = Image.open(REF).convert('RGB')
im.crop((0, 84, 1080, 244)).save(OUT)
print('cropA3 →', OUT, im.size)
