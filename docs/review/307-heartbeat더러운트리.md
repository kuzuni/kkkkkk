# 307 — `tools/claim.js --beat` 가 «작업 트리가 더러우면» heartbeat 를 조용히 안 쓴다

- 워커 C · `sess-0747-6451` · 2026-08-28
- 종류: **T1 버그(선점)** — 지시서 [3]-**(가) 기계적/게이트 작업**이므로 **비평가를 띄우지 않았다**.
  레퍼런스 대조가 필요 없는 도구 결함이고, 판정은 재현 → 수정 → 게이트로 한다.
- `index.html` **0줄** (제품 무변경). 건드린 것: `tools/claim.js` · `tools/verify307.js`(신설) ·
  `docs/PROGRESS.md` «병렬 세션 규칙» 2 · `docs/ROUTINE.md` [1].

---

## 1회차 — 재현 · 원인 · 수정 · 게이트

### ⓐ 재현 (등재문 그대로 · 3줄)

실제 저장소에서 lock 307 을 잡은 뒤 트리를 더럽히고 heartbeat 를 쳤다:

```
$ echo dirty >> docs/claims/README.md
$ node tools/claim.js --beat 307 sess-0747-6451 >/dev/null ; echo "exit=$?"
error: cannot pull with rebase: You have unstaged changes.
error: Please commit or stash them.
fatal: No rebase in progress?
exit=1
$ cat docs/claims/307.lock
2026-08-28T07:48:12Z sess-0747-6451     ← 시각 그대로. heartbeat 가 안 찍혔다.
```

`>/dev/null` 로 묶었으므로 **도구 자신의 «오류 — git pull --rebase 실패» 는 아예 안 보였다**
(그건 stdout 이었다). 남은 것은 git 이 stderr 로 흘린 줄뿐이고, 워커 입장에서는
«heartbeat 를 쳤다» 와 구분되지 않는다 — **조용한 no-op**.

### ⓑ 원인 (한 줄)

`claim.js` 본체 머리에서 **모드를 가리지 않고** `git pull --rebase` 를 돌았다(옛 94행:
`if (mode !== 'check' && gitQ('pull','--rebase',…) === null) die(1, …)`).
더러운 트리에서 git 은 rebase 를 **시작하기 전에** 거부하므로 `die(1)` 로 빠지고
`write()`(= lock 한 줄 쓰기)에 **도달하지 못한다**.

치명적인 이유는 타이밍이다 — 워커가 heartbeat 를 치는 순간은 규정상
**회차 기록(`docs/review/<ID>-*.md`)을 막 쓴 직후**, 즉 트리가 **반드시** 더러운 때다.
즉 도구가 «의도된 사용법 그 자체» 에서만 골라 실패한다.

### ⓒ 처방 — 등재문 후보 ⓐ + ⓒ 를 채택하고, 같은 결함의 **다른 출구 하나를 더** 막았다

| # | 무엇 | 왜 |
|---|---|---|
| 1 | **beat 는 `pull --rebase` 를 아예 안 돈다** | beat 는 «로컬 파일 한 줄 쓰기» 이고 커밋은 호출자가 한다. pull 이 애초에 필요 없다(등재문 후보 ⓐ). |
| 2 | 원격 판정은 `git show origin/main:<lock>`(`remoteLock()`) | 뺏겼는지는 **작업 트리를 건드리지 않고도** 알 수 있다. `fetch` 는 어떤 트리 상태에서도 안전하다. 뺏겼으면 heartbeat 가 아니라 **코드 2(포기)** 다 — 로컬만 갱신하고 넘어가면 «죽은 세션이 산 척» 하게 된다. |
| 3 | **실패는 전부 stderr**(`die` → `console.error`) | 워커들이 `--beat … >/dev/null` 로 묶어 쓴다. stdout 이면 exit 1 조차 안 보인다(등재문 후보 ⓒ). |
| 4 | claim/release 의 pull 은 `-c rebase.autoStash=true` | ⚠ **등재문이 «같이 볼 것» 이라 짚은 자리에서 실제로 같은 결함을 찾았다** — 아래 ⓓ. |

### ⓓ 등재문의 «⚠ 착수하면 claim·release 도 같은 경로를 타는지 볼 것» — 탔다. 그리고 더 나빴다

`--release` 도 같은 머리를 지난다. 그런데 release 를 치는 순간 역시 **마감 기록을 막 쓴 직후**라
트리가 더럽다. 결과는 beat 보다 나쁘다:

- beat 실패 = lock 시각이 안 늘어난다 → **90분 뒤**에 뺏길 위험.
- release 실패 = **lock 이 안 지워진다** → 그 작업이 **90분간 통째로 막힌다**(ROUTINE [-1] 5 가
  «빼먹으면 90분간 그 작업이 막힌다» 고 못박은 바로 그 상태를, 규칙을 지킨 워커가 당한다).

release·claim 은 커밋·push 를 하므로 pull 이 **정말로** 필요하다 — 그래서 없애는 대신
`rebase.autoStash` 로 돌려 더러운 트리에서도 죽지 않게 했다(작업 내용은 stash→복원되어 보존된다.
게이트 B7 이 «더럽힌 내용이 살아 있는가» 를 직접 잰다).

### ⓔ 게이트 — `node tools/verify307.js` **18/18 PASS**

`verify290` 처럼 **흉내가 아니라 진짜 git 으로** 잰다: 임시 bare 원격 1개 + 클론 3개
(A = 피해자 워커 · B = 경쟁 워커 · C = «그 사이 남이 push 했다» 를 만들어 pull 이 실제로 rebase 를
시도하게 하는 역할). 초 해상도 때문에 «같은 초» 로 변화를 못 재는 것을 피하려고 lock 을 40분 과거로
심어 두고 «앞으로 갔는가» 를 본다.

```
PASS A1~A8  소스 — beat 경로에 pull 없음 · 옛 형태 소멸 · die 가 stderr · remoteLock() · autoStash
PASS B0     선점 성공(전제)
PASS B1     더러운 트리에서 --beat 가 lock 시각을 실제로 갱신한다 — 07:11:47Z → 07:51:47Z
PASS B2     --beat 가 더럽힌 작업 내용을 건드리지 않는다
PASS B3     남의 SID 로 친 --beat 는 코드 2 + **stderr** 로 알린다
PASS B4     원격에서 뺏긴 lock 은 --beat 가 코드 2 로 알린다
PASS B5     선점 성공(전제 · 308)
PASS B6     더러운 트리에서 --release 가 lock 을 지우고 push 까지 간다
PASS B7     --release 의 autoStash 가 더럽힌 작업 내용을 잃지 않는다
PASS C1·C2  안내문(PROGRESS 규칙 2 · ROUTINE [1])이 «더러워도 된다 · 실패는 stderr» 를 적었다

VERIFY307 PASS 18/18
```

**게이트가 옛 결함을 실제로 잡는지도 쟀다** — `git stash` 로 claim.js 를 수정 전으로 되돌리고
같은 게이트를 돌리면 **VERIFY307 FAIL 9/18**, 그중 **B1 이 «코드 1 · 시각 그대로»** 로
등재문의 증상을 글자 그대로 재현한다(B6 도 같이 빨개진다 = ⓓ 가 실재한다는 독립 증거).

### ⓕ 회귀 — 기존 게이트

- `node tools/verify290.js` **14/15** — 떨어진 1건은 **B2 «등재 예외가 실제 이력에 있다»** 이고
  **307 과 무관하다**. B2 는 claim.js 를 읽지 않고 git 이력만 본다. 원인은 **저장소 이력이 재작성된 것**
  (이 세션의 첫 `git pull` 이 `+ d8ac8c2...c5669ea main (forced update)`): KNOWN 에 박힌 두 해시
  `8fcacb6`·`6e8a949` 가 **객체째 사라졌다**(`git cat-file -t` → 없음. 전체 lock 커밋도 38개뿐이라
  «400개 창 밖» 도 아니다). 내 구간이 아니라 **작업 311 로 등재**했다.
- `node tools/smoke.js` **SMOKE PASS** (index.html 무변경이지만 필수 게이트라 돌렸다).

### ⓖ 남긴 것

`--beat` 는 여전히 **커밋을 하지 않는다**(안내문·기존 호출부와의 계약 그대로 — 회차 커밋에 같이 담는다).
바뀐 것은 «그 한 줄이 실제로 써지는가» 뿐이다. 그래서 기존 워커 스크립트·습관을 하나도 안 깨뜨린다.
