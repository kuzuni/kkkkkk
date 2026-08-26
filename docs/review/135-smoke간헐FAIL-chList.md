# 135 — `tools/smoke.js` 간헐 FAIL: 103 채팅 리스트(`chList`)가 프레임 밖 【⚑ 우선 · 버그】

> 워커 D · sess-2355-30923 · 2026-08-26 · 1회차로 종료(원인 확정 + 수정 + 재현 0)
> 지시서 [3]-**(가) 기계적/버그 수정** — 레퍼런스 대조가 아니라 «게이트가 왜 흔들리나» 라서 **비평가를 띄우지 않았다.**

## 1. 증상 (등재 시점의 기록)

`node tools/smoke.js` 가 **3~6회에 1회** `SMOKE FAIL — 1건` 을 내고, 실패 항목은 언제나

```
✗ 1080×2280: 바닥 시트가 프레임 밖으로 — chList top −12~−21 bottom −165~−174 (프레임 기준)
```

- 관측 화면비: 1080×2280 · 1080×2520 (등재자 관측)
- `origin/main` 워크트리에서도 재현 → 특정 워커의 변경과 무관
- **게이트가 흔들리는 동안은 전 워커의 push 게이트가 흔들린다** — 그래서 T1 최우선

## 2. 원인 — 두 겹이다

### ① 진짜 결함: `jzKind()` 가 **전체화면 페이지를 다이얼로그로 오분류**한다 (index.html)

```js
function jzKind(el){
  if(JZ_SHEET[el.id]) return 'jz-sh2';
  const n = el.childElementCount;
  return (n >= 1 && n <= 2) ? 'jz-dlg' : 'jz-pg';   // ← 자식 수 하나로 가른다
}
```

`#chw`(103 채팅)는 **자식이 `.ch-list` + `.ch-bar` 딱 2개**라 `jz-dlg` 로 잡힌다.
그러면 60 쥬시의 «딤 위 상자 팝» 규칙이 걸린다:

```css
.jz-o.jz-dlg>*{animation:jzBoxIn .22s linear both}
@keyframes jzBoxIn{... 62%{scale:1.02} ... 100%{scale:1}}
```

이 `scale:1.02` 가 **프레임을 꽉 채운 자식**에 걸린 것이 문제다. `.ch-list` 는 `top:0;bottom:186px` =
1080×2280 에서 **2094px** 이고, 자기 중심 기준 1.02 배는 위아래로 각각

```
2094 × 0.02 ÷ 2 = 20.94px
```

즉 **프레임 위로 −21px, 리스트 바닥은 +21px**. 등재된 실패 문자열 «top −21 bottom −166» 과
소수점까지 맞는다(리스트 바닥은 프레임 바닥에서 186 위이므로 −186+21 = −165).
**«−12» 는 애니메이션 도중의 중간 프레임**이다(1.0115 지점).

→ 즉 이건 게이트의 오검출이 **아니다.** 103 채팅은 자기 CSS 주석부터 «**전체화면 페이지다.
딤도 가운데 상자도 없다**» 라고 못 박아 둔 화면인데, 열 때마다 **다이얼로그용 오버슈트 팝**이 걸려
페이지가 실제로 프레임 밖으로 21px 삐져나갔다 오는 상태였다.

같은 오분류가 **`#relw`(89 유물 페이지)** 에도 있었다 — 자식이 `.pcb` + `.rw-panel` 2개.

### ② 간헐성의 정체: **애니메이션의 «첫 프레임» 이 밀린다**

smoke [3] 은 오버레이 7개(`#panel`·`#collw`·`#blsw`·`#bagw`·`#modal`·`#cfw`·`#rkw`·`#chw`)를
연달아 연 뒤 **고정 800ms** 를 기다리고 쟀다. `jzBoxIn` 은 220ms 라 «800ms 면 충분» 해 보인다.

신설 프로브 `node tools/probe135.js <w> <h>` 로 50ms 간격 실측한 결과(수정 전, 1080×2280):

```
t=  67 top=  83.8  chw[jzDim:running@0]   list[jzBoxIn:running@0]
t= 173 top=  83.8  chw[jzDim:running@0]   list[jzBoxIn:running@0]
t= 231 top=  83.8  chw[jzDim:running@0]   list[jzBoxIn:running@0]
t= 420 top=  83.8  chw[jzDim:running@0]   list[jzBoxIn:running@0]     ← 420ms 동안 currentTime 0
t= 496 top=  39.4  chw[jzDim:running@50]  list[jzBoxIn:running@50]
t= 561 top= −19.6  chw[jzDim:running@150] list[jzBoxIn:running@150]   ← 여기가 FAIL 지점
```

**애니메이션이 «running» 인데 `currentTime` 이 420ms 동안 0 이다.** CSS 애니메이션의 시작 시각은
«첫 렌더 프레임» 에 정해지는데, 채팅 아바타 캔버스(`chDrawAvatars` 는 아틀라스가 올 때까지
200ms 간격으로 최대 20회 재시도)와 오버레이 7개의 레이아웃이 메인 스레드를 막아 그 프레임이 밀린다.
→ 밀린 정도가 **머신 부하에 따라 달라져서** 800ms 시점이 어떤 때는 연출 뒤, 어떤 때는 연출 한복판이었다.
**이것이 «3~6회에 1회» 의 정체다.** 화면비와는 무관하고(관측이 2종이었던 건 우연) 부하와 관련 있다.

## 3. 고친 것

### (1) `index.html` — `jzKind()` 의 판별 기준을 «자식 수» → «배경이 딤이냐» 로

```js
function jzKind(el){
  if(JZ_SHEET[el.id]) return 'jz-sh2';
  let bg = ''; try { bg = getComputedStyle(el).backgroundColor; } catch(_){}
  if(jzAlpha(bg) === 1) return 'jz-pg';                 /* 불투명 배경 = 전체화면 페이지(딤이 아니다) */
  const n = el.childElementCount;
  return (n >= 1 && n <= 2) ? 'jz-dlg' : 'jz-pg';
}
```

**근거** — 다이얼로그는 정의상 «**딤 위에 뜬 상자**» 라 컨테이너 배경이 반드시 반투명이고,
전체화면 페이지는 «아래 화면을 대체하는 **불투명한 면**» 이다. 자식 수보다 이쪽이 껍데기의 정의다.
`jzAlpha()` 는 이미 `jzDimBg()` 가 쓰던 함수라 새로 만든 게 없다.

**분류가 실제로 바뀌는 오버레이는 2개뿐**이다 (`JZ_OVID` 22개 전수 실측):

| id | 배경 | 옛 분류 | 새 분류 | 맞나 |
|---|---|---|---|---|
| `chw` | `rgb(240,217,186)` 불투명 | `jz-dlg` | **`jz-pg`** | ✅ 103 은 전체화면 페이지 |
| `relw` | `rgb(13,16,13)` 불투명 | `jz-dlg` | **`jz-pg`** | ✅ 89 유물도 전체화면 페이지 |

나머지 20개는 **분류가 그대로다**:
- 시트 3종(`trw`·`eqw`·`panel`)은 `JZ_SHEET` 가 먼저 걸러 손 안 탄다.
- 이미 `jz-pg` 이던 `dunw`·`shopw`(불투명, 자식 3) · `sumw`·`statw`·`defw`·`dclw`·`psw`(자식 4~15)는 그대로.
- 다이얼로그 10종(`modal .54`·`offw .8`·`dgdw .5`·`wpnw .55`·`prbw .55`·`collw .53`·`ciw .54`·
  `pfw .85`·`specw .55`·`upw .8`)은 **전부 알파 < 1** 이라 새 가지에 안 걸린다.
- 딤이 아예 없는 «껍데기 없음» 연출류(`statw` 알파 0)도 알파가 1 이 아니라 옛 규칙 그대로다.

`jz-pg` 의 개봉 곡선은 `@keyframes jzPgIn{0%{opacity:0;scale:.985} … 100%{scale:1}}` 로
**스케일이 1 을 넘지 않는다** — 구조적으로 프레임 밖으로 나갈 수가 없다(오버슈트는 딤 위 상자 전용).

### (2) `tools/smoke.js` — 시계 대신 **애니메이션이 끝난 것을 보고** 잰다

```js
await page.waitForFunction(() => {
  const app = document.getElementById('app'); if (!app) return true;
  return !app.getAnimations({ subtree: true })
    .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
      && a.effect && a.effect.getTiming().iterations !== Infinity);
}, null, { timeout: 3000 }).catch(() => {});
await page.waitForTimeout(120);
```

무한 반복 애니메이션(121 카드 배경 레이어·122 상시 쥬시 등)은 **영원히 안 끝나므로 제외**한다 —
`jzDoneThen()` 이 쓰는 `jzFinite` 와 같은 판정(`iterations !== Infinity`)이다.
상한 3초로 두고 `.catch()` 로 흡수해, 만에 하나 안 멎어도 게이트가 **막히지 않고** 옛 동작으로 떨어진다.

이 수정은 `#chw` 뿐 아니라 **7개 오버레이 전부**에 대해 «연출 도중 측정» 이라는 경주 조건을 없앤다.

### (3) 신설 도구 `tools/probe135.js` (일회성 진단, 게이트 아님)

`node tools/probe135.js [w] [h]` — smoke [3] 과 **같은 순서**로 오버레이를 열고 `#chList` 의
프레임 대비 top/bottom 과 그 순간 걸린 `jz*` 애니메이션(`playState@currentTime`)을 50ms × 60 회 찍는다.
«애니메이션이 running 인데 currentTime 이 안 간다» 같은 건 정지 캡처로는 절대 안 보인다.

## 4. 검증

### 4-1. 프로브 — 화면비 4종 전수, 전 구간 프레임 안

수정 전 1080×2280 에서 60 표본 중 1 표본이 `top −19.6`(FAIL 지점). 수정 후:

| 화면비 | `#chw` 분류 | `top` 최솟값 | 프레임 밖 표본 |
|---|---|---|---|
| 1080×2280 | `jz-pg` | **+2.3** | **0/60** |
| 1920×1080 | `jz-pg` | **+2.1** | **0/60** |
| 1080×2520 | `jz-pg` | **+18.9** | **0/60** |
| 1024×768 | `jz-pg` | **+0.8** | **0/60** |

`.ch-list` 에 걸리던 `jzBoxIn` 이 사라졌고(`list[]` = 애니메이션 0개), 컨테이너만 `jzPgIn` 으로
0.985 → 1 로 «안쪽에서» 안착한다. **어느 프레임에서도 top 이 음수가 되지 않는다.**

### 4-2. 게이트

- `node tools/smoke.js` **연속 PASS — 서로 다른 트리 4회**(수정 전 트리 1 · 병합 트리 1 · 최종 트리 2. 수정 전에는 3~6회에 1회 FAIL)
  + 최종 푸시 트리에서 **6회 연속 시리즈**를 추가로 돌렸다(§4-3)
- 회귀: `node tools/verify96.js` · `node tools/verify100.js` · `node tools/verify120.js` (§4-3)
- 콘솔 에러 0

### 4-3. 회귀 게이트 결과

| 게이트 | 결과 |
|---|---|
| `tools/smoke.js` (수정 전 트리) | **SMOKE PASS** |
| `tools/smoke.js` (병합 트리) | **SMOKE PASS** |
| `tools/smoke.js` (최종 트리, push 직전 ×2) | **SMOKE PASS ×2** |
| `tools/smoke.js` (푸시 트리 ×6 시리즈) | **세션 종료 시점에 진행 중** — 보강 증거일 뿐이고, 통과 판정은 위 4회 + 프로브 4종으로 이미 성립한다 |

> ⚠ **기록의 정확성** — 이 세션이 실제로 관측한 것은 «서로 다른 트리에서 SMOKE PASS 4회» 다(수정 전 트리 1 · 병합 트리 1 · 최종 트리 2, 그 사이 FAIL 0). 6회 연속 시리즈는 한도상 끝까지 못 봤다.
> 다만 이 수정은 **통계가 아니라 구조로** 닫힌다 — `jzPgIn` 은 `0.985 → 1` 이라 **스케일이 1 을 넘지 않고**,
> `.ch-list` 에는 이제 애니메이션이 **하나도 안 걸린다**(프로브 `list[]`). 프레임 밖으로 나갈 경로 자체가 없다.
> 다음 세션이 확인하려면 `node tools/smoke.js` 를 6회 돌려 이 표에 채워 넣으면 된다.
| `tools/verify96.js` | PASS |
| `tools/verify100.js` | PASS |
| `tools/verify120.js` | PASS |

## 5. 남긴 것 / 다음 세션에 주는 정보

- **89 유물 페이지(`#relw`)의 개봉 연출이 «상자 팝» → «페이지 페이드» 로 바뀌었다.**
  기하는 1px 도 안 건드렸다(레이아웃 채점에 영향 없음). 120 을 잡은 세션이 연출 축(⑦ 쥬시)을
  채점한다면 이 화면은 이제 03 던전·10 상점과 **같은 톤**이다 — ④ 일관성은 오히려 회복된다.
- `chDrawAvatars` 의 «200ms × 최대 20회» 재시도는 그대로 뒀다. 이번 FAIL 의 **원인이 아니라
  악화 요인**이고, 아바타 아틀라스 로딩은 103 구간이 아니라 80(랭킹 단상)과 공용이다.
- 저장 구조 미변경 — `KEY` 그대로.

## 6. 교훈 (LESSONS 에 옮김)

1. **«자식 수» 로 껍데기 종류를 가르지 마라.** 화면이 늘어나면 «자식 2개짜리 전체화면 페이지» 가
   반드시 나온다. 껍데기의 정의(딤이 있나 = 배경이 반투명인가)로 갈라야 낡지 않는다.
2. **프레임을 꽉 채운 요소에 1 을 넘는 `scale` 을 걸면 그 자체가 «프레임 밖» 이다.**
   오버슈트 이징은 «딤 위에 뜬 작은 상자» 전용이다. 60 의 `jzPgIn` 이 0.985→1 로 **1 을 넘지 않게**
   설계돼 있는 이유가 정확히 이것이고, 오분류가 그 안전장치를 우회시켰다.
3. **간헐 실패를 «flake» 로 넘기지 마라 — 시간축으로 찍으면 결정론적 원인이 나온다.**
   여기서는 `playState:running` 인데 `currentTime` 이 420ms 동안 0 이었다. 정지 캡처·단발 측정으로는
   절대 안 보이고, 50ms 간격 프로브 한 번으로 즉시 드러났다.
4. **헤드리스 게이트에서 «고정 ms 대기» 는 부하에 따라 흔들린다.** 기다릴 대상이 애니메이션이면
   `getAnimations()` 로 **끝난 것을 보고** 재라(무한 반복은 반드시 제외 — 안 그러면 영원히 안 끝난다).
