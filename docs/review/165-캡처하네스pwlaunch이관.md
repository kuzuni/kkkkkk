# 165 — 캡처 하네스 69개 `pwlaunch` 이관 (127 의 잔여분)

**분류**: T1 버그 · 지시서 [3]-(가) **기계적 작업** — 레퍼런스 대조가 없으므로 **비평가 없음**
**세션**: 2026-08-27 `sess-0216-2582` 워커 A · 1회차로 종료

---

## 1. 증상 재현

```
$ node -e "const{chromium}=require('playwright');chromium.launch()..."
bundled FAIL: Error: browserType.launch: Executable doesn't exist at
  /opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
```

컨테이너에 실제로 깔린 것:

```
$ ls /opt/pw-browsers
chromium  chromium-1194  chromium_headless_shell-1194  ffmpeg-1011
```

드라이버가 기대하는 빌드는 **1234**, 깔린 것은 **1194**. `chromium.launch()` 직결은
FAIL 도 아니고 **한 줄도 못 돈다**.

## 2. 범위 확정 — «68개» 의 정체

`tools/*.js` 248개 중 `require('playwright')` 를 쓰는 파일은 97개인데, 그 안에서
**줄 단독 `const { chromium } = require('playwright');` 가 정확히 68개**였다(PROGRESS 165 행의 숫자).

```
$ grep -h "require('playwright')" tools/*.js | sort | uniq -c | sort -rn
     68 const { chromium } = require('playwright');
     15   try { return require('playwright'); } catch (_) {}      ← 자체 리졸버(동작함)
     ...
      1 const { chromium } = require('playwright'); const fs = require('fs'); …   ← probe54.js
```

`probe54.js` 는 같은 직결인데 한 줄에 다른 선언이 붙어 68 집계에서 빠져 있었다.
**같은 증상이므로 함께 이관해 69개**를 고쳤다.

## 3. 수정 — 127·A4 선례 그대로 2줄 치환

```js
- const { chromium } = require('playwright');
+ const { pw, launch } = require('./pwlaunch');
+ const { chromium } = pw();

- await chromium.launch()          →  await launch(chromium)
- await chromium.launch(o)         →  await launch(chromium, o)
```

인자 형태가 17종(`()` · `(o)` · `(ARGS)` · `({ args })` · `({ ...ARGS, executablePath: cand })` ·
`(launchOpts()` · `(Object.assign({}, launchOpts()` · `(ep ? {…} : {})` 등)이라
**인자 없는 `()` 를 먼저 치환**한 뒤 나머지 `chromium.launch(` → `launch(chromium, ` 로 돌렸다.
괄호 접두만 바꾸므로 `Object.assign({}, launchOpts()` 같은 중첩도 균형이 유지된다.

식별자 충돌 확인: 이 69개 안의 지역 이름은 `launchOpts` · `launchAny` 뿐이라
새로 들어오는 `launch` 와 겹치지 않는다.

**기존 자체 폴백(`launchOpts()`)은 지우지 않고 남겼다.** `try { launch(chromium) } catch { launch(chromium, launchOpts()) }`
형태로 중복이 되지만 동작은 정확하고, 지우면 기계적 치환의 범위를 넘는다.

## 4. 검증

지시서 [3]-(가) 대로 **grep 미변환 계수 + 헤드리스 실기동**만 했다.

| 검사 | 결과 |
|---|---|
| `node --check` 전 파일 | **249/249 통과** (문법 깨짐 0) |
| 폴백 없는 `chromium.launch()` 잔여 | **0개** (신설 게이트 `verify165` 로 계수) |
| `node tools/smoke.js` (필수 게이트) | **SMOKE PASS** |
| `node tools/verify165.js` (신설) | **PASS 248/248** |

**실기동 확인** — 이관 전 «자체 폴백조차 없어 100% 즉사» 하던 20개 중에서 골랐고,
인자 형태가 서로 다른 것들을 섞었다. 전부 `[i] 번들 브라우저 없음 → /opt/pw-browsers/chromium 사용` 로 뜬다.

| 도구 | 인자 형태 | 결과 |
|---|---|---|
| `cap02.js` | `()` | ✅ `CAP02 r1 → 02-r1.png` · 콘솔 에러 0 |
| `cap10.js` | `()` | ✅ 콘솔 에러 0 |
| `cap30.js` | `()` | ✅ `captured docs/review/30-r1.png` · 콘솔 에러 0 |
| `cap50.js` | `()` | ✅ `CAP50 OK — 50-r1.png · 50-r2.png` |
| `cap87.js` | `{ ...ARGS, executablePath }` | ✅ `CAP87 OK — 87-r{1,2,3,4}.png` |
| `box52.js` | `()` | ✅ 판 8개 잉크 실측 출력 |
| `capA2.js` | `()` | ✅ JSON 출력 |
| `probe122st.js` | `()` | ✅ JSON 출력 |
| `probe147.js` | `(o)` | ✅ 잉크 bbox 출력 · 콘솔 에러 0 |
| `run52.js` | `()` | ✅ `RUN52 … 최빈 런 = 5px` (인자 필수 — 인자 없이 부르면 `path.resolve(undefined)` 로 죽는데 이건 원래 사양) |
| `verify10.js` | `()` | ✅ **VERIFY10 61/61 PASS** |
| `verify20.js` | `(o)` | ✅ **VERIFY20 PASS 32/32** |
| `dlg63.js` | `(launchOpts()` | 🟡 기동 성공, **DLG63 FAIL** (아래 5절) |
| `verify32.js` | `(o)` | 🟡 기동 성공, **VERIFY32 FAIL 1건 (32/33)** (아래 5절) |

## 5. 이관으로 «새로 보이게 된» 기존 실패 — 165 구간이 아니다

이 게이트들은 여태 **실행 자체가 안 돼서** 실패가 보이지 않았다. 기동이 살아나자 드러난 것이고
**내 치환이 만든 회귀가 아니다**(내 변경은 브라우저 실행 경로에만 닿는다). 해당 작업 단위의 주인이 잡아야 한다.

| 게이트 | 실패 내용 | 짐작되는 소유 구간 |
|---|---|---|
| `dlg63.js` | `16 유물세부 ** 측정 실패 ** {"err":"showRelicDetail is not defined"}` · `편차 |dev|>1 : 1개 [04(+47.5)]` | **89**(유물 시스템 전면 교체로 16 화면·`showRelicDetail` 자체가 폐기됨 → dlg63 의 대상 목록이 옛 화면을 물고 있다) · 04 |
| `verify32.js` | `FAIL 젬 transform 없음  got matrix(0.94, 0, 0, 0.79, 0, 0) / want none` | 32 (글리프 튠 `@32-GLYPH-TUNE` 계열) |

## 6. 신설 — `tools/verify165.js` 회귀 게이트

2줄 치환만 하면 **새 하네스를 옛 파일에서 복붙하는 순간 되살아난다**(실제로 127 뒤에 68개가 남은 게 그 증거다).
그래서 정적 게이트를 뒀다 — 브라우저를 안 띄우므로 1초 안에 끝난다.

통과 조건은 파일마다 둘 중 하나:
① `pwlaunch` 경유(권장) ② 자체 `executablePath`/`PW_CHROMIUM` 폴백 보유(127 이 «중복 코드지만 급하지 않음» 으로 남긴 16개).
주석 안의 `chromium.launch()` 언급은 세지 않는다(`await`/대입/`return` 앞에 붙은 실호출만 본다).

게이트가 실제로 잡는지 확인 — `cap02.js` 를 일부러 직결로 되돌리자:

```
  ✗ 폴백 없는 chromium.launch() : 1개
      cap02.js  → const { pw, launch } = require('./pwlaunch'); / await launch(chromium, …)
VERIFY165 FAIL 1건 (247/248)     exit=1
```

복구 후 `VERIFY165 PASS 248/248`.

**자체 폴백만 있는 16개**(허용, 이관 안 함 — 127 의 판단을 그대로 따랐다):
`smoke.js` `verify59` `verify64` `verify66` `verify77` `verify79` `verify80` `verify85` `verify88` `verify95`
`verify100` `verify104` `verify105` `verify107` `verify108` `verify158`

## 7. 바꾼 파일 (69 수정 + 1 신설)

`index.html` 은 **한 글자도 건드리지 않았다** — 도구 전용 변경이다.

```
aspect63 box52 cap01 cap02 cap05 cap10 cap103 cap16 cap30 cap31 cap32 cap32ready cap35 cap36
cap50 cap52 cap53 cap54 cap55 cap56 cap69 cap70 cap73 cap87 cap89 cap90 cap91 capA2
d52 dlg63 edge52 ink05 probe114b probe122ray probe122st probe135 probe147 probe147b probe54
rad52 run52 verify10 verify20 verify32 verify35 verify36 verify45 verify46 verify48 verify49
verify53 verify54 verify55 verify56 verify61 verify70 verify71 verify73 verify76 verify78
verify82 verify83 verify86 verify91 verify99 verify118 verify123 verify124 verify147
+ verify165 (신설)
```

## 8. 다음 세션에 남기는 것

- **화면 작업을 잡았는데 캡처 도구가 `Executable doesn't exist` 로 죽으면** 그 도구가 `tools/` 밖에 있거나
  새로 만든 것이다. `node tools/verify165.js` 로 먼저 계수하고, 2줄 치환으로 고친다.
- **새 하네스를 만들 때는 옛 파일이 아니라 `pwlaunch` 를 쓰는 파일에서 복붙한다.**
- 5절의 `dlg63`·`verify32` 실패 2건은 등재만 해 뒀다 — 잡는 워커가 각자 구간에서 처리할 것.
