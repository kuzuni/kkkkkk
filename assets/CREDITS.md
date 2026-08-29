# 외부 리소스 출처 · 라이선스

이 저장소에 동봉된 서드파티 리소스 목록이다. **전부 재배포 가능한 라이선스만 쓴다.**
새 리소스를 넣으면 여기에 «무엇 · 어디서 · 어떤 라이선스 · 라이선스 원문 파일 위치» 4가지를 반드시 적는다.

## 서체

| 리소스 | 출처 | 라이선스 | 원문 |
|---|---|---|---|
| **Jua** (`assets/fonts/Jua-subset.woff2`) | Woowahan Brothers / Google Fonts — `github.com/google/fonts/tree/main/ofl/jua` | SIL Open Font License 1.1 | `assets/fonts/OFL.txt` |

- 원본 `Jua-Regular.ttf`(2.1MB)를 **서브셋**해서 넣었다 — ASCII(U+0020~U+007E) +
  KS X 1001 한글 2,350자 + UI 기호(`·×→←↑↓①②③…▦▶◀` 등) = **180KB woff2**(상한 400KB).
  서브셋 명령(재현용):

  ```
  pip install fonttools brotli
  python3 -m fontTools.subset Jua-Regular.ttf \
      --text-file=subset.txt --output-file=Jua-subset.woff2 \
      --flavor=woff2 --layout-features='' --no-hinting --desubroutinize \
      --drop-tables+=DSIG,GSUB,GPOS
  ```

  `subset.txt` = ASCII + KS X 1001 한글(EUC-KR 0xB0A1~0xC8FE 디코드) + 위 기호 + `힣`.
- **OFL 요구사항**: ① 원본 저작권/라이선스 고지 유지(`OFL.txt` 동봉) ② «Jua» 이름
  그대로 재배포하거나 개명 — 서브셋은 개명 없이 그대로 두었고, CSS 안에서만 `font-family:'GameKR'`
  로 참조한다(폰트 내부 이름 변경 아님) ③ 폰트를 **판매하지 않는다**.
- 탈락 후보 3종(Black Han Sans · Do Hyeon · Gothic A1 Black)의 채점과 근거는
  `docs/review/126-UI스타일폰트통일.md` §1.
- CDN 을 쓰지 않는 이유: README 의 «별도 서버 불필요»(`file://` 로 바로 열림) 를 지키기 위해서다.
  `@font-face` 의 `src` 는 저장소 안 상대경로 하나뿐이다.

## 오디오

`assets/audio/` — 출처·라이선스는 작업 78 기록(`docs/review/78-오디오.md`) 참고.

## UI — 화폐 아이콘 (`assets/ui/cur-*.svg`)

| 파일 | 쓰임 | 출처 | 라이선스 |
|---|---|---|---|
| `cur-gold.svg` | 골드 | 이 저장소에서 직접 그린 SVG (작업 125) | CC0 / 퍼블릭 도메인 |
| `cur-dia.svg` | 다이아 | 〃 | CC0 |
| `cur-relic.svg` | 유물조각 | 〃 | CC0 |
| `cur-mile.svg` | 마일리지 쿠폰 | 〃 | CC0 |
| `cur-ticket-gold.svg` | 골드 던전 입장권 | 〃 | CC0 |
| `cur-ticket-dia.svg` | 다이아 던전 입장권 | 〃 | CC0 |
| `cur-ticket-relic1.svg` | 유물 1단 던전 입장권 (402 — 색은 그 던전 카드의 두 톤) | 〃 | CC0 |
| `cur-ticket-relic2.svg` | 유물 2단 던전 입장권 (〃) | 〃 | CC0 |
| `cur-ticket-relic3.svg` | 유물 3단 던전 입장권 (〃) | 〃 | CC0 |
| `cur-ticket-relic4.svg` | 유물 4단 던전 입장권 (〃) | 〃 | CC0 |

**왜 직접 그렸나** — 지시(125 ②)는 Kenney 의 CC0 팩(«Generic Items»/«Puzzle Pack»)을 1순위로,
«못 받으면 인라인 SVG» 를 대안으로 뒀다. 이 세션의 실행 환경은 외부 다운로드가 막혀 있어
(`kenney.nl` → 프록시 403) 팩을 받을 수 없었고, 그래서 대안대로 SVG 를 직접 그렸다.
**교체 예정 자리다** — 나중에 아트 리소스가 들어오면 `CUR_ICON`(index.html) 의 경로 7개만 바꾸면
전 화면이 함께 바뀐다(호출부는 전부 `curIc()` 를 거친다). 크기·자리는 `docs/measure/125-화폐아이콘.md` 참조.
