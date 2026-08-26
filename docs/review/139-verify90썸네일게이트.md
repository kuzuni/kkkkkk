# 139 — `tools/verify90.js` 가 72 의 스프라이트 썸네일 교체 이후 FAIL(90/91)

- **티어**: T1 버그 · **세션**: sess-0156-4434 (워커 D, 2026-08-26) · **1회차에 종료**
- **검증 방식**: 지시서 [3]-**(가) 기계적 작업** — 게이트 판정식만 고치는 작업이라 **비평가를 띄우지 않았다.**
- **범위**: `tools/verify90.js` 한 파일. **`index.html` diff 0줄.**

## 1. 재현

```
$ node tools/verify90.js
  ✗ 72 카드 썸네일(.th) 6장 모두 채워짐 (실측 0)
VERIFY90 90/91  ✗ FAIL
```

등재(`d55ea4d`, 워커 A)가 이분법으로 특정한 원인 — 72 가 `6efe9e8` 에서
`.dnc>.th>em`(이모지) → `.dnc>.th>canvas.thcv`(스프라이트)로 갈았는데
`verify90.js:218` 은 사라진 `<em>` 을 계속 세고 있었다 — **그대로 맞았다.**

```js
thumbs: cards.filter(c => c.querySelector('.th em') && c.querySelector('.th em').textContent).length,
```

`.th` 안에 `<em>` 이 하나도 없으니 실측은 항상 0 이다. 72 는 자기 게이트(`verify72`)를
액자·스프라이트 판정으로 갈아 165/165 를 맞췄지만, **같은 것을 세는 verify90 은 같이 안 고쳤다.**

## 2. 등재가 짚지 않았던 두 번째 층 — 캔버스 오염

판정식만 `.th>canvas.thcv` 로 바꾸면 여전히 통과하지 않는다.
**`verify90` 의 브라우저에는 `--allow-file-access-from-files` 가 없어서** `file://` 로 그린
스프라이트가 캔버스를 오염시키고, 잉크를 읽는 `getImageData` 가 막힌다.
플래그 유무만 바꿔 같은 페이지를 두 번 읽어 확인했다:

| launch args | `getImageData` | 카드 6장 잉크 |
|---|---|---|
| (없음) | `SecurityError: Failed to execute 'getImageData'…` × 6 | 읽기 불가 |
| `--allow-file-access-from-files` | 정상 | 12928 / 25133 / 35569 / 30845 / 29944 / 35479 px |

`verify72` 는 이미 같은 이유로 그 플래그를 주고 있다(`verify72.js:19` 주석).
즉 «72 와 같은 판정» 을 쓰려면 **판정식과 실행 플래그를 같이** 가져와야 한다.

## 3. 고친 것 (3곳, `tools/verify90.js`)

1. **판정식** — 마크업 모양(`.th>em` 텍스트)이 아니라 «칸이 비었나» 를 묻게 좁혔다.
   `verify72` §1-2 가 쓰는 것과 같은 기준이다: `.th>canvas.thcv` 가 있고, 알파>8 픽셀이 하나라도 있으면 채워진 것.
   `getImageData` 가 던지면 «못 읽음 = 통과 아님» 으로 떨어뜨린다(오염을 통과로 삼키지 않는다).
2. **실행 플래그** — `launch(chromium, { args: ['--allow-file-access-from-files'] })`.
3. **부트스트랩** — 복붙돼 있던 `launchOpts()` 를 110 공용 `tools/pwlaunch.js` 로 치환했다.
   그 함수는 `/opt/pw-browsers/chromium` 하나만 봐서 빌드 번호가 붙은 디렉터리(`chromium-1194/…`)를 못 찾는다 —
   110 이 다른 게이트에서 이미 걷어낸 그 블록이 여기만 남아 있었다.

## 4. 결과 · 게이트

| 게이트 | 결과 |
|---|---|
| `node tools/verify90.js` | **91/91 ✓ PASS** (2회 연속 동일) |
| `node tools/verify72.js` | **165/165 PASS** (같은 것을 세는 형제 게이트 — 무회귀 확인) |
| `node tools/smoke.js` | **SMOKE PASS** |
| `index.html` | **무변경** |

## 5. 음성 대조 — 새 판정이 헛통과가 아님을 확인

같은 페이지에서 썸네일 캔버스만 건드려 판정값을 다시 읽었다(`scratchpad/neg139.js`):

| 상태 | 실측 thumbs |
|---|---|
| 그대로 | **6** |
| 캔버스 `clearRect` (칸은 있는데 그림이 없음) | **0** |
| 캔버스 제거 | **0** |

«캔버스가 있다» 가 아니라 «그려져 있다» 를 실제로 잡는다.

## 6. 남은 것

없음. 72 가 아트를 또 바꿔도 «칸이 채워졌나» 만 묻는 판정이라 이 항목은 다시 깨지지 않는다.
72 구간(`index.html` 의 썸네일 마크업)은 lock 생존 중이라 **손대지 않았다.**

## 7. 곁가지 등재 — 같은 원인, 다른 파일 (작업 140)

`grep -rl '\.th em' tools/` 로 «사라진 `<em>` 을 아직 세는» 자리를 전부 훑었다.

| 파일 | 상태 |
|---|---|
| `tools/verify90.js` | **이번에 고침** (91/91) |
| `tools/fnchk97.js:124` | **FNCHK97 19/20 FAIL** — `dn.em === 6 && dn.cv === 0` 판정이 뒤집혔다 → **작업 140 으로 등재** |
| `tools/verify72.js:300` | `em: !!c.querySelector('.th>em')` — «이모지가 아님» 을 확인하는 쪽이라 정상 (165/165 PASS) |
| `tools/verify121.js` | 이미 `':scope>.th>em, :scope>.th>canvas'` 로 둘 다 받는다 — 무해 |
| `tools/cap72.js` · `tools/probe121.js` | 게이트가 아니라 캡처·진단 보조 도구 (121 lock 생존 중, 72 구간) |

140 은 **손대지 않았다** — 139 의 lock 범위는 `verify90.js` 한 파일이고, 지시서 [1] «잡은 작업 단위 딱 1개» 규칙이다.
고칠 방향은 이 문서 §3 과 동일하다(판정식 + `--allow-file-access-from-files` 를 한 쌍으로).
