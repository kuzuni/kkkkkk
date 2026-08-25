# 오디오 리소스 출처 · 라이선스 (작업 78)

모든 파일은 **CC0 1.0 Universal (Public Domain)** — 저작권 표기 의무 없음(자발적 크레딧).
각 원본은 아래 «입수 경로» 미러 저장소에서 받았고, 원 출처 페이지·작성자·라이선스를 파일별로 기록한다.
가공: 원본 wav 를 모노 다운믹스 후 ogg(Vorbis)·mp3 로 트랜스코드(libsndfile 1.2.2). BGM 은 mp3 원본 그대로.

## 소스 팩 4종

| 팩 | 작성자 | 라이선스 | 원 출처 | 입수 경로(미러) |
|---|---|---|---|---|
| Interface Sounds | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/interface-sounds | https://github.com/Calinou/kenney-interface-sounds (동봉 LICENSE.txt = CC0) |
| 512 Sound Effects (8-bit style) | Juhani Junkala (juhanijunkala.com) | CC0 1.0 | https://opengameart.org/content/512-sound-effects-8-bit-style | https://github.com/razorbeard/classic-games (README Credits 절) |
| NES Shooter Music (5 tracks, 3 jingles) | SketchyLogic | CC0 1.0 | https://opengameart.org/content/nes-shooter-music-5-tracks-3-jingles | https://github.com/razorbeard/classic-games (README Credits 절) |
| 4 Chiptunes (Adventure) | Juhani Junkala | CC0 1.0 | https://opengameart.org/content/4-chiptunes-adventure | https://github.com/leanderseige/clocksattack (README «CC0» 명기, dist/audio) |

## 파일별 대응 (게임 파일명 → 원본 파일)

| 게임 파일 (.ogg/.mp3) | 원본 | 팩 | 작성자 | 라이선스 | 용도 |
|---|---|---|---|---|---|
| tap | click_001.wav | Interface Sounds | Kenney | CC0 1.0 | 버튼 탭 |
| open | open_001.wav | Interface Sounds | Kenney | CC0 1.0 | 팝업 열기 |
| close | close_001.wav | Interface Sounds | Kenney | CC0 1.0 | 팝업 닫기 |
| flip | pluck_001.wav | Interface Sounds | Kenney | CC0 1.0 | 소환 카드 뒤집힘 |
| rare | glass_002.wav | Interface Sounds | Kenney | CC0 1.0 | 희귀 이상 등장 |
| up | confirmation_001.wav | Interface Sounds | Kenney | CC0 1.0 | 강화 성공 |
| train | select_002.wav | Interface Sounds | Kenney | CC0 1.0 | 훈련 ↑ 틱 |
| claim | confirmation_002.wav | Interface Sounds | Kenney | CC0 1.0 | 보상 수령 |
| revive | maximize_004.wav | Interface Sounds | Kenney | CC0 1.0 | 부활 |
| rtick | tick_001.wav | Interface Sounds | Kenney | CC0 1.0 | 룰렛 틱 |
| rstop | drop_002.wav | Interface Sounds | Kenney | CC0 1.0 | 룰렛 정지 |
| err | error_001.wav | Interface Sounds | Kenney | CC0 1.0 | 실패·재화 부족 |
| toggle | switch_001.wav | Interface Sounds | Kenney | CC0 1.0 | 설정 토글 |
| coin | collect_power_up.wav | 512 Sound Effects | Juhani Junkala | CC0 1.0 | 재화 획득(fxFly) |
| bosskill | explosion.wav | 512 Sound Effects | Juhani Junkala | CC0 1.0 | 보스 처치 |
| hit | block_hit.wav | 512 Sound Effects | Juhani Junkala | CC0 1.0 | 플레이어 피격 |
| death | game_over_jingle.wav | 512 Sound Effects | Juhani Junkala | CC0 1.0 | 사망 |
| clear | tetris_line_cleared.wav | 512 Sound Effects | Juhani Junkala | CC0 1.0 | 스테이지 클리어 |
| bossin | intro_jingle.wav | NES Shooter Music | SketchyLogic | CC0 1.0 | 보스 등장 |
| victory | win_jingle.wav | NES Shooter Music | SketchyLogic | CC0 1.0 | 던전 클리어·승급 승리 |
| bgm_main.mp3 | level1.mp3 (= Stage 1) | 4 Chiptunes (Adventure) | Juhani Junkala | CC0 1.0 | 메인 BGM 루프(41.1s) |
| bgm_boss.mp3 | level3.mp3 (= Boss Fight) | 4 Chiptunes (Adventure) | Juhani Junkala | CC0 1.0 | 보스전 BGM 루프(71.7s) |

- BGM 은 **mp3 단일 포맷**으로 넣었다(모든 브라우저·iOS 재생 가능). ogg 를 병행하면 총량이 4MB 예산을
  넘보므로 제외 — SFX 는 지시대로 ogg 우선 + mp3 폴백 2벌이다.
- Stage 1 확인 근거: classic-games README 가 tetris_theme.ogg(41.1s)를 «Stage 1» 로 명기, clocksattack
  level1.mp3 길이 41.1s 로 일치. level3(71.7s)은 인레벨 트랙 3종(Stage 1·2·Boss Fight) 중 Boss Fight.
