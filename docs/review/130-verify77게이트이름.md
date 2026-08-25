# 130 — `tools/verify77.js` 가 옛 유물 페이지 이름을 들고 있어 항상 FAIL

작업 종류: **버그(회귀 게이트 복구)**. 지시서 [3]-(가) «기계적 작업» — 레퍼런스 대조가 없으므로 **비평가 없음**.
세션 `sess-2140-28253` (워커 C, 2026-08-25). 1회차에 종료.

---

## §1 증상 재현 (수정 전)

```
node tools/verify77.js
  ✗ relicw: 프로브 불가 — Error: page.evaluate: ReferenceError: openRelicPage is not defined
VERIFY77 FAIL (1)
```

나머지 21항목은 전부 ✓. 즉 **딱 이 한 줄 때문에 77 게이트 전체가 빨간불**이었고,
`VERIFY77 PASS` 를 요구하는 push 게이트에서 77 은 사실상 «항상 실패» 였다.

## §2 원인 — 코드가 아니라 게이트가 틀렸다

`git log -S openRelicPage -- index.html` → **0건**. 그런 함수는 저장소 역사에 존재한 적이 없다.
89(«유물 시스템 전면 교체»)가 유물 페이지를 갈아 끼우면서 게이트를 안 고친 것이다.

| 게이트가 들고 있던 이름 | 실제 이름 (index.html) |
|---|---|
| `#relicw` | `#relw` (`index.html:7283`, CSS `2553`) |
| `openRelicPage()` | `openRelw()` (`index.html:12645`) |
| `closeRelicPage()` | `closeRelw()` (`index.html:12651`) |

고친 자리 3곳 — `verify77.js:93`(OVS 목록) · `136`(finally 의 닫기) · `202`([F] 오버레이 일괄 닫기 목록).

## §3 «이름만 고치면 PASS» 가 아니었다 (127 교훈 1)

이름을 갈자 곧바로 `VERIFY77 PASS` 가 떴다. 그러나 **그 프로브가 실제로 무엇을 재고 있는지**를
확인하려고 «오버레이가 정말로 그 점을 덮는가» 를 임시로 재 봤더니 [C] 7개 중 **3개가 헛돌고 있었다**:

```
✗ dunw: 오버레이가 그 점을 안 덮는다 (shown=false, hit=shopList)   ← 앞 항목(상점)을 재고 있었다
✗ relw: 오버레이가 그 점을 안 덮는다 (shown=false, hit=U)
```

원인은 **60(쥬시니스)의 개폐 페이드와 게이트의 고정 250ms 대기가 경합**하는 것이다. 실측:

| 시점 | shopw | relw | elementFromPoint(540,1102) |
|---|---|---|---|
| `openShopPage()` +100ms | block / **0.00** | none | shopList |
| `openShopPage()` +250ms | block / 1.00 | none | shopList |
| `closeShopPage(); openRelw()` +150ms | block / **1.00** (아직 닫히는 중) | block / **0.54** | I |
| 같은 경로 +250ms | none | block / 1.00 | I |

즉 250ms 지점에서는 **앞 오버레이가 아직 안 닫혔고 새 오버레이는 절반만 떠 있다.**
`underCovered` 는 «무언가에 가려짐» 만 보므로, 상점이 남아 있어도 dunw 검사가 조용히 통과했다.
**89 이후 77 의 유물 페이지 회귀가 검사된 적이 없다**는 등재 내용이 맞았을 뿐 아니라,
던전 오버레이 회귀도 사실상 상점을 재고 있었다.

## §4 처방

1. **고정 대기 → 가라앉을 때까지 폴링**(`settle`). 열기 전에는 «나 말고 다른 오버레이가 전부 안 보일 때까지»,
   연 뒤에는 «러닝 애니메이션 0개 + `opacity ≥ .95` 일 때까지»(각 최대 2500ms).
2. **폴링은 프레임을 넘겨 두 번 연속 참일 때만 인정**한다. 이게 없으면 자기 함정에 빠진다 —
   `classList.add('jz-o')` 직후 첫 스타일 계산에서는 애니메이션이 아직 «효과 밖» 이라 기저값 `opacity 1` 이
   읽히고, **다음 프레임에야** 0% 키프레임(`opacity 0`)이 걸린다. 한 번만 재면 그 «가짜 1» 을 붙잡아
   `settle=true@10ms` 로 즉시 빠져나온 뒤 정작 측정은 0% 프레임에서 하게 된다(실제로 그렇게 4항목이 헛나왔다).
3. **[C] 에 항목 1종 신설** — «그 오버레이가 실제로 그 점을 덮는가»
   (`display≠none` · `visibility≠hidden` · `opacity>.05` · `elementFromPoint` 결과가 target 안).
   이름이 틀린 게이트가 `skip` 으로 조용히 흘러가던 이번 사고의 재발 방지선이다.

## §5 결과

| | 수정 전 | 수정 후 |
|---|---|---|
| `node tools/verify77.js` | **FAIL (1)** · 22항목 | **PASS** · **28항목** (연속 3회 재현) |
| [C] 오버레이 7종 | relicw 프로브 불가, dunw/relw 는 헛돌음 | 7종 전부 «실제로 덮는다» ✓ + 상하 스태킹 ✓ |
| `node tools/smoke.js` | — | **SMOKE PASS** |

`index.html` 은 **한 글자도 안 고쳤다** — 제품 코드는 처음부터 멀쩡했고 게이트만 틀렸다는 등재 판단이 맞았다.
89 가 갈아 끼운 `#relw` 는 z-index 28 로 `#fxlc`(z7) 위 · `#fxl`(z60) 아래에 정확히 앉아 있다 =
**77 의 «전투 발 재화 연출은 팝업 아래» 규칙이 유물 페이지에서도 지켜지고 있음이 89 이후 처음으로 확인됐다.**

## §6 곁가지 — 손대지 않고 등재만 (133)

같은 «89 가 갈아 끼운 이름을 게이트가 안 따라감» 계열이 더 있다. **73·63 구간이라 이번엔 안 건드렸다.**

- `tools/verify73.js` — **실행 즉시 죽는다**: `TypeError: Cannot read properties of undefined (reading 'cost')`
  at `summonCost (index.html:10706)`. 89 가 `BANNERS.relic` 을 폐기(`index.html:8497`)했는데 게이트는
  아직 그 배너로 가격을 묻는다. 그래서 §1 에서 멈추고, 뒤에 있는 `relicw`(`:179`, `:209`, `:211`) 까지는
  가 보지도 못한다 — 73 회귀는 89 이후 **한 줄도 안 돌았다**.
- `tools/aspect63.js:41` — `{ id: '14', sel: '#relicw', open: 'openRelicPage()' }`. 보고 도구(합불 게이트 아님)라
  14 행만 조용히 빠진다.
- `docs/review/60-cap60.js:80` — 닫기 목록의 `'closeRelicPage'`. `typeof` 가드 안이라 무해하지만 죽은 이름.
