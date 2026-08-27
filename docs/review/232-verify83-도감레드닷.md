# 232 — `tools/verify83.js` 8/10 FAIL: 도감 레드닷 절이 «죽은 키 모양» 위에 서 있다 «버그(게이트)»

- 담당: 2026-08-27, `sess-1346-15318` 워커 C · 1회차(1/5)
- 결과: **`VERIFY83` 8/10 → 14/14 PASS** · 되돌림 게이트 **`NEG232` 9/9** 신설 · **`SMOKE PASS`**
- **`index.html` 0줄.** 게이트(`tools/`)만 고쳤다 — 게임 코드는 정상이었고 게이트가 옛 키 모양에 굳어 있었다.

## 1. 재현

```
$ node tools/verify83.js
[4] 레드닷
  ✗ 스킬 3종 보유 → collReady(skill)
  ✗ 레드닷 on
  ✓ 수령 후 남은 보너스 없음      ← 헛초록
  ✓ 수령 후 레드닷 off             ← 헛초록
VERIFY83 8/10 — FAIL
```

## 2. 원인 — 결함은 **둘**이고, 등재문의 진단 중 하나는 틀렸다

### (가) 질의 키가 죽었다 (등재문대로)

91·118 이 도감을 «부위/등급 세트» 로 다시 키잉한 뒤 `COLL_SET` 의 키는
`skill:0`…`skill:5` · `equip:<슬롯>:<등급>` · `pet:<등급>` · `relic:0~2` 다(index.html ~14090).
게이트만 옛 **카테고리 이름**을 물고 있었다.

| 옛 코드 | 실제 값 | 결과 |
|---|---|---|
| `collReady('skill')` | `COLL_SET['skill'] === undefined` → **항상 false** | 빨강 2건 |
| `!['skill','equip','pet','relic'].some(collReady)` | 네 이름이 전부 없는 키 → `some` **항상 false** → 부정 **항상 참** | **헛초록 2건** |

카테고리 단위 질의는 `collReady` 가 아니라 **`collCatReady(cat)`**(index.html ~14127) 가 담당한다.

### (나) 셋업도 죽었다 — 다만 **«등급이 섞여» 가 아니라 «개수» 다** ⚑ 등재문 정정

PROGRESS 232 행은 «`SKILLS.slice(0,3)`(slash·shuri·stone)은 **등급이 섞여** 있어 올바른 키로
물어도 `skill:0..5` 전부 false» 라고 적었다. **사실이 아니다** — 실측 셋 다 `g:0` 이다.

진짜 원인은 **개수**다. 91 이후 세트 단계는 «보유 종 수 ≥ need» 가 아니라
**구성원 전원의 최저 Lv**(`collLv = Math.min(...st.it.map(oLv))`, index.html ~14122)다.

```
skill:0 = ["slash","shuri","stone","vigor"]   ← 4종
slice(0,3) 보유 → 미보유 ["vigor"] → collLv = min(1,1,1,0) = 0 → cap 0 → collReady false
```

«need 3» 은 91 이 폐기한 옛 규칙이고, 옛 셋업의 «3종» 은 그 규칙 시절의 잔재였다.
증상(항상 false)이 (가)와 같아서 등재자가 한 원인으로 뭉뚱그린 것으로 보인다.
**두 결함은 독립이다** — 키만 고치고 셋업을 3종으로 두면 여전히 빨갛다(NEG232 [N2] 가 이것을 못 박는다).

## 3. 고친 것 (`tools/verify83.js` §[4])

- 질의를 세트 키로: `collReady('skill')` → **`collReady(st.key)`**(= `skill:0`).
- 카테고리 질의를 제 함수로: `some(collReady)` → **`some(collCatReady)`**. 헛초록 2건이 이제 실제로 잰다.
- 셋업을 «그 세트의 **구성원 전원**» 으로: `SKILLS.slice(0,3)` → `COLL_SETS.find(s=>s.cat==='skill').it.forEach(...)`.
  **세트 구성을 데이터에서 읽는다** — 종수·등급이 늘어도 이 파일을 다시 안 고친다(LESSONS 91-4).
- 앵커 2건 신설(키 모양이 또 바뀌면 **여기가 먼저** 빨개진다 — 232 재발 방지):
  ① «세트 키가 `COLL_SET` 에 실재한다» ② «구성원 n종 전원 Lv1 → cap ≥1 / 받은 단계 0».
- 수령 직후 단언 1건 추가: «그 세트는 더 이상 ready 아님»(카테고리 질의와 별개로 세트 자신을 본다).

10 → **14 항목**.

## 4. 되돌림 검증 — `tools/neg232.js` (9/9)

게이트가 **정말 무언가를 재는지**를 못 박는다. 헛초록은 «초록» 이라 그냥 두면 다시 굳는다.

```
[N1] 옛 키가 정말 죽어 있었는가
  ✓ COLL_SET['skill'] === undefined
  ✓ collReady('skill') === false — 세트가 다 차 있어도 false
  ✓ some(collReady) === false → 옛 «수령 후» 단언은 수령 전에도 초록(헛초록)
[N2] 옛 설정이 세트를 못 채운다 — 원인은 «등급 혼합» 이 아니라 «개수»
  ✓ PROGRESS 232 의 «등급이 섞여» 는 사실이 아니다 — 앞 3종 등급 = [0,0,0]
  ✓ 진짜 원인: 세트 ["slash","shuri","stone","vigor"] 중 ["vigor"] 미보유
  ✓ collLv = min(전원) = 0 → cap 0 → collReady false (91 이 «need 3» 을 폐기했다)
[N3] 새 단언은 수령 전/후로 값이 «뒤집힌다» (= 실제로 잰다)
  ✓ collReady(skill:0) true → false
  ✓ some(collCatReady) true → false
  ✓ 옛 some(collReady) 는 전/후 모두 false (안 잰다)
NEG232 9/9
```

## 5. 게이트

| 게이트 | 전 | 후 |
|---|---|---|
| `node tools/verify83.js` | 8/10 FAIL | **14/14 PASS** |
| `node tools/neg232.js` | — | **9/9 PASS**(신설) |
| `node tools/smoke.js` | — | **SMOKE PASS** |

## 6. 교훈 (LESSONS 등재)

1. **«헛초록» 은 «빨강» 보다 오래 산다.** 같은 커밋에서 죽은 단언 4건 중 빨간 2건만 등재됐고,
   나머지 2건은 «항상 참인 부정» 이라 초록으로 몇 주를 버텼다. 키를 바꾸는 작업(91·118 같은 재키잉)은
   **그 키를 쓰는 게이트를 grep 으로 훑는 것까지가 범위**다.
2. **등재문의 «원인» 도 근거를 다시 재라.** 232 등재문은 증상(항상 false)에서 원인(등급 혼합)을
   추정했고 그 추정이 틀렸다 — 실측은 `[0,0,0]` 이었다. 진짜 원인(구성원 4종 중 1종 미보유)을
   못 봤으면 키만 고치고 여전히 빨간 채로 «고쳤다» 고 보고할 뻔했다.
3. **세트 구성을 게이트에 하드코딩하지 마라.** `slice(0,3)` 은 데이터가 3종이던 시절에만 맞았다.
   `COLL_SETS` 에서 읽으면 종수가 늘어도 따라온다.
