/* 598 공용 — 「스프라이트 뒤집힘 빈도」를 **재현 가능하게** 재는 자 한 벌.
   `probe598`(재현·분해)과 `verify587` §5·§R-b(게이트)가 **같은 함수**를 쓴다
   (385 «자매 자 드리프트» 대책 · 590 `size590lib.js` · 541 `size541lib.js` 가 깐 길).

   ── 왜 새 자가 필요한가 ────────────────────────────────────────────────
   587 은 «히스테리시스가 깜빡임을 줄인다» 를 실측으로 세웠지만(0.13 → 0.96 → 0.26회/s)
   그 값을 통과선으로 쓰려 하자 회차마다 0.26~1.04 로 춤췄고, 인구를 24마리로 고정한 뒤에도
   **고친 쪽이 뺀 쪽보다 높게 나오는 회차**가 나왔다(1.038 ↔ 1.022 · 0.885 ↔ 0.852).
   ⇒ 587 은 그 축을 판정에서 빼고 598 로 넘겼다.

   ── 축을 흔드는 것 넷(probe598 §B 가 하나씩 못박아 재서 확인한다) ──────
     ⓐ **프레임 시간**  — rAF 로 굴리면 dt 가 회차마다 다르다. 뒤집힘은 «부호가 바뀐 프레임 수»
                          라 분모(프레임)와 분자(전환)가 dt 에 서로 다르게 반응한다.
     ⓑ **난수**        — 스폰 좌표 · `e.ph`(스월 부호) · `dashCd` 가 전부 `Math.random` 이다.
                          돌진 예고 중에는 `spd = 0` 이라 규칙이 «이동 방향» 에서 «플레이어 쪽» 으로
                          갈아타므로, 돌진이 몇 번 나느냐가 곧 뒤집힘 수다.
     ⓒ **좌표 분포**   — 표본 가중이 «프레임 수» 라 플레이어 곁에 오래 머문 개체가 값을 끈다.
     ⓓ **살아 있는 마릿수** — 분리 힘은 O(n²) 이고 밀집도가 곧 가로 속도 떨림이다.

   ── 이 자가 하는 일 ────────────────────────────────────────────────────
     1. 게임 루프(rAF)를 **멈추고** `step(1/60)` 을 손으로 굴린다        → ⓐ 제거
     2. `Math.random` 을 시드 LCG 로 갈아 끼운다                          → ⓑ 제거
     3. 좌표·스월 부호를 링 위에 **못박고** 개체를 불사로 붙잡는다        → ⓒⓓ 제거
     같은 시드면 값이 **비트 단위로 같다**(probe598 §B S4 가 그것을 단언한다).

   ⚑ **두 트리를 견줄 수 있는 근거** — `flip` 은 그리기에만 쓰이고 물리로 되먹임되지 않는다
     (`index.html` 의 `.flip` 참조는 전부 `drawFrame`/`drawFrameC`/시체 승계다).
     그래서 히스테리시스를 뺀 사본도 **같은 시드에서 같은 궤적**을 그리고, 두 값의 차는
     궤적 차이가 아니라 **규칙 차이 하나**다. 587 이 못 잡던 «부호 뒤집힘» 이 여기서 사라진다.

   ⚠ 임계를 넉넉히 벌려 초록을 만드는 것은 답이 아니다(598 등재문) — 이 자의 판별력은
     «같은 시드 = 같은 값» 이라는 결정성 자체에서 나온다.                                   */

/* 결정적 깜빡임 측정 — page.evaluate(`(${FLAP_DET})(frames, seed)`)
   반환: { mob, flick, turns, ratio, frames, mobs } — 단위는 전부 «개체당 초당»
     mob   전체 뒤집힘
     flick **깜빡임** = 되돌아오기까지 FLICK_F 프레임 이하인 뒤집힘(= 왕복 한 쌍의 앞짝)
     turns 실제 가로 진행 방향이 바뀐 횟수(눈이 «돌아야 한다» 고 보는 사건)

   ⚠ **«전체 뒤집힘» 은 이 결손의 자가 아니다.** 결정적 시나리오에서 시드 5개를 견줘 보면
     뺀 사본이 더 적게 뒤집히는 시드가 절반이다(probe598 §C) — 임계 하나로 되돌아가면
     애매 구간에서 «플레이어 쪽(dx>0)» 을 보는데, 플레이어가 제자리면 그 값도 **안정** 이기 때문이다.
     주인이 본 병(587 §6)은 «많이 돈다» 가 아니라 «돌았다가 곧 되돌아온다» 다 ⇒ 그것만 센다.       */
const FLICK_F = 15;               /* 0.25초 — 이 안에 되돌아오면 «깜빡임» 한 번 */

/* ── 결정적 구동 조각 넷(606 이 뽑았다) ────────────────────────────────────
   598 이 §5 에서 쓴 손잡이 — ① 루프 정지 ② 시드 LCG ③ 판 비우기 ④ 배우 못박기 —
   를 **조각으로** 뽑아 §3·§4 하네스(`SOLO_DET`·`CROWD_DET`·`JOY_DET`·`CORPSE_DET`)도
   같은 것을 읽게 한다. 606 등재문의 처방이 그것이다: 흔들리는 것은 축이 아니라 **판**이고,
   §5 만 결정적이면 같은 파일 안에서 «절마다 다른 판» 이 된다(385 «자매 자 드리프트»의 내부 판).
   ⚠ 조각을 고치면 §5 의 값도 같이 움직인다 — `verify587` [5-a]·[5-b] 의 15.67 · 13.63 과
     `probe598` §B 가 그 앵커다. 바꿨으면 두 값이 **비트 단위로 같은지** 먼저 확인해라. */
const DET_HEAD = `
  /* ① 게임 루프를 멈춘다(rAF 재등록을 끊는다) */
  const rawRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  await new Promise(r => rawRaf(r));      /* 이미 예약된 마지막 콜백 한 장을 소진 */
  await new Promise(r => setTimeout(r, 60));
  /* ② 난수를 시드로 못박는다(LCG — Numerical Recipes) */
  const rawRnd = Math.random;
  let __s = (seed >>> 0) || 1;
  Math.random = () => { __s = (Math.imul(__s, 1664525) + 1013904223) >>> 0; return __s / 4294967296; };`;
const DET_TAIL = `Math.random = rawRnd; window.requestAnimationFrame = rawRaf;`;
/* ③ 판을 통째로 비운다 —
   ⚠ **부팅 뒤 상태를 그대로 두면 결정적이지 않다**(probe598 §B S4 1차안이 그래서 0.503~0.615 로
      흔들렸다): 워밍업 1.5초 동안 판이 제멋대로 굴러 플레이어 좌표·조준·스킬 쿨·투사체가
      회차마다 다르게 남는다. */
const DET_CLEAR = `
    enemies.length = 0; spawnQ.length = 0;
    for (const arr of [shots, parts, nums, corpses, zones, booms, bolts, drones, rings, ghosts, pets]) arr.length = 0;
    for (const k of Object.keys(skillCd)) skillCd[k] = 1e9;   /* 스킬 봉인 — 둔화가 걸리면 spd 가 흔들린다 */`;
/* ④ 배우를 선언으로 세운다(시작 자세) */
const DET_PIN = `
    player.x = WORLD.w / 2; player.y = WORLD.h / 2;
    player.vx = player.vy = 0; player.aim = -Math.PI / 2;
    player.hp = player.max = 1e9; player.dead = 0; player.inv = 1e9;
    player.flip = false;`;
/* 매 프레임 붙잡기 — 플레이어가 **움직이는** 하네스(조이스틱)용 */
const DET_HOLD = `
      spawnQ.length = 0;
      for (const k of Object.keys(skillCd)) skillCd[k] = 1e9;
      player.hp = player.max = 1e9; player.dead = 0; player.inv = 1e9;`;
/* 매 프레임 붙잡기 — 플레이어가 «놓인 표적» 인 하네스용(표적이 움직이면 그것이 곧 새 변수다) */
const DET_HOLD_PIN = `
      player.x = WORLD.w / 2; player.y = WORLD.h / 2;
      player.vx = player.vy = 0;` + DET_HOLD;

const FLAP_DET = `(async (frames, seed) => {${DET_HEAD}
  const FL = ${FLICK_F};
  try {
    /* ── 3. 판을 통째로 비우고 좌표·스월 부호를 못박는다 ── */${DET_CLEAR}${DET_PIN}

    const N = 24;
    for (let i = 0; i < N; i++) {
      makeEnemy('zombie');
      const e = enemies[enemies.length - 1];
      const a = i * (Math.PI * 2 / N), R = 240 + (i % 3) * 80;
      e.x = player.x + Math.cos(a) * R;
      e.y = player.y + Math.sin(a) * R;
      e.ph = i % 2;                 /* 스월 부호를 반씩 — 난수가 아니라 선언으로 */
      e.born = 1;                   /* 등장 팝인을 지나 보낸다(born < 0.3 은 무적·비활성 창) */
      e.hp = e.max = 1e9;
    }

    /* ── 4. 고정 dt 로 손수 굴린다. 플레이어는 «놓인 표적» 이다(598 등재문 ⓑ) ── */
    const tr = {};
    for (let f = 0; f < frames; f++) {
      step(1 / 60);${DET_HOLD_PIN}
      for (const e of enemies) {
        e.hp = e.max = 1e9;         /* 안 죽게 붙잡는다 — 인구가 흔들리면 축도 흔들린다 */
        if (!e.__id598) e.__id598 = 'e' + (++window.__n598 || (window.__n598 = 1));
        (tr[e.__id598] = tr[e.__id598] || []).push({ f: e.flip, x: e.x });
      }
    }

    let flips = 0, flick = 0, turns = 0, fr = 0, mobs = 0;
    for (const t of Object.values(tr)) {
      if (t.length < 60) continue;
      mobs++; fr += t.length;
      const at = [];                                  /* 뒤집힌 프레임 번호 */
      for (let i = 1; i < t.length; i++) if (t[i].f !== t[i - 1].f) { flips++; at.push(i); }
      for (let k = 0; k + 1 < at.length; k++) if (at[k + 1] - at[k] <= FL) flick++;
      /* 실제 가로 진행 방향 전환 — 한 프레임 잡음을 타지 않게 6프레임(0.1초) 이동 평균의 부호로 본다 */
      let prev = 0;
      for (let i = 6; i < t.length; i++) {
        const d = t[i].x - t[i - 6].x;
        if (Math.abs(d) < 1) continue;
        const sg = d > 0 ? 1 : -1;
        if (prev && sg !== prev) turns++;
        prev = sg;
      }
    }
    const secs = fr / 60;
    return {
      mob: secs ? flips / secs : null,
      flick: secs ? flick / secs : null,
      turns: secs ? turns / secs : null,
      ratio: turns ? flips / turns : null,
      frames, mobs, det: true
    };
  } finally { ${DET_TAIL} }
})`;

/* 결정적 **플레이어** 깜빡임 측정 — page.evaluate(`(${PLAY_DET})(frames, seed)`)
   잡몹과 달리 플레이어는 «가만히 서 있으면» 축이 죽으므로(뒤집힘 0) 손가락을 **각본대로** 꺾는다.
   각본은 0.75초마다 여섯 국면을 돈다 — 그 중 둘은 **세로로만** 가고 둘은 **가로 성분이 임계 언저리**다:
   히스테리시스가 일하는 자리가 정확히 그 넷이다(587 §6 «카이팅 중 vx 가 임계를 들락거린다»).      */
/* 손가락 각본 — [dx, dy] · 국면 하나가 45프레임(0.75초).
   ⚑ 한 바퀴(6국면)의 알짜 이동이 **정확히 0** 이라 몇 바퀴를 돌아도 판 한복판을 안 벗어난다
     (606 이 `CROWD_DET` 에서도 이 각본을 쓰는 이유 — 벽에 닿으면 «안 움직이는 프레임» 이 표본을 먹는다). */
const DET_PROG = `[[1, 0], [0, -1], [-1, 0], [0, 1], [0.2, -0.98], [-0.2, 0.98]]`;

const PLAY_DET = `(async (frames, seed) => {${DET_HEAD}
  const FL = ${FLICK_F};
  /* 각본 — [dx, dy] · 국면 하나가 45프레임(0.75초) */
  const PROG = ${DET_PROG};
  try {${DET_CLEAR}${DET_PIN}
    /* 표적 6마리를 좌우로 갈라 놓는다 — 조준이 좌우로 오가야 «조준 폴백» 이 드러난다 */
    for (let i = 0; i < 6; i++) {
      makeEnemy('zombie');
      const e = enemies[enemies.length - 1];
      e.x = player.x + (i % 2 ? 300 : -300) + (i - 3) * 40;
      e.y = player.y + (i - 3) * 70;
      e.ph = i % 2; e.born = 1; e.hp = e.max = 1e9;
    }
    const fl = [];
    for (let f = 0; f < frames; f++) {
      const p = PROG[Math.floor(f / 45) % PROG.length];
      joy.on = true; joy.dx = p[0]; joy.dy = p[1]; joy.mag = 1;
      step(1 / 60);${DET_HOLD}
      for (const e of enemies) e.hp = e.max = 1e9;
      fl.push(player.flip);
    }
    joy.on = false; joy.dx = joy.dy = 0; joy.mag = 0;
    let flips = 0, flick = 0; const at = [];
    for (let i = 1; i < fl.length; i++) if (fl[i] !== fl[i - 1]) { flips++; at.push(i); }
    for (let k = 0; k + 1 < at.length; k++) if (at[k + 1] - at[k] <= FL) flick++;
    const secs = fl.length / 60;
    return { player: flips / secs, flick: flick / secs, frames: fl.length };
  } finally { ${DET_TAIL} }
})`;

/* ══ 606 — §3·§4 실동작 하네스의 결정적 판 ═══════════════════════════════
   `verify587` §3·§4 는 598 때까지 **rAF 표본**이었다. 그래서 머신 부하가 곧 값이었다 —
   606 실측(같은 트리·같은 커밋): `[4-a:promo]` **2.1 · 2.9 · 4.7 · 5.7 · 6.6%**(바 4.0) ·
   `[4-a:arena]` 4.3% · `[4-b]` «시체 0구» 1회. 587 이 바를 4% 로 정할 때의 실측이
   «다크엘프 1.1 · 조이스틱 1.6 · 아레나 2.1%» 였으니 **판이 그만큼 시끄러워진 것**이다.
   ⚠ **바를 벌려 초록을 만드는 것은 답이 아니다**(606 등재문) — 4% 위로 올리면 «가끔 반대로
     도는» 회귀를 놓친다. 그래서 고치는 것은 임계가 아니라 **구동**이다.

   ⚑ **표본 규약은 한 줄도 안 바꿨다** — 옮긴 것은 «무엇을 세는가» 가 아니라 «무엇이 굴리는가» 다:
     · `SOLO_DET`   «플레이어와 같은 높이의 먼 자리로 되돌려 놓기» · 되돌린 뒤 4프레임 버리기 ·
                     `born > 0.35` 필터 — 셋 다 그대로.
     · `CROWD_DET`  개체별로 갈라 담기 · `born > 0.35` 필터 — 그대로.
     · `JOY_DET`    «꺾은 직후 0.5초 버리기» — 그대로(30프레임).
     · `CORPSE_DET` «죽는 순간의 alive 와 새로 생긴 시체를 x 로 짝짓기» — 그대로.
   ⚑ 표집 간격만 «벽시계 30ms» 에서 **«프레임 수»** 로 바뀐다(`every`). 뜻은 같고(30ms ≈ 2프레임)
     회차마다 달라지던 dt 가 사라진다. 그래서 최소 이동 눈금도 `MIN_VX * every / 60` 으로
     **간격에서 유도**한다 — 벽시계 상수 0.03 을 그대로 두면 간격과 눈금이 갈라진다.        */

/* 단독 직진 — 한 마리를 «플레이어와 같은 높이의 먼 자리» 에 되돌려 놓아 깨끗한 직진만 표집한다.
   ⚠ 첫 자리도 **선언**이다 — `makeEnemy` 의 스폰 링은 난수라 첫 왕복의 길이가 회차마다 달랐다. */
const SOLO_DET = `(async (tk, frames, seed) => {${DET_HEAD}
  try {${DET_CLEAR}${DET_PIN}
    makeEnemy(tk);
    if (!enemies[0]) return [];
    let side = 1;
    { const e = enemies[0];
      e.x = Math.max(90, player.x - 520); e.y = player.y;
      e.ph = 0;                              /* 스월 부호를 선언으로(난수가 아니라) */ }
    const out = []; let skip = 0;
    for (let f = 0; f < frames; f++) {
      step(1 / 60);${DET_HOLD_PIN}
      const e = enemies[0]; if (!e) break;
      e.hp = e.max = 1e9;
      if (Math.hypot(player.x - e.x, player.y - e.y) < 420) {
        side = -side;
        e.x = side > 0 ? Math.max(90, player.x - 520) : Math.min(WORLD.w - 90, player.x + 520);
        e.y = player.y; skip = 4; continue;
      }
      if (skip > 0) { skip--; continue; }
      if (e.born > 0.35) out.push({ x: e.x, flip: e.flip });
    }
    return out;
  } finally { ${DET_TAIL} }
})`;

/* 무리 — 개체별로 갈라 담는다.
   ⚠ **`queueMobs()` 를 쓰지 않는다.** 그 함수는 종을 `S.stage` 와 `Math.random` 으로 뽑으므로
     ① 부팅 세이브가 s<3 이면 **고블린·다크엘프가 한 마리도 안 나오고**(실측: 매 실행 zombie 한 종만
     채점됐다 — 항이 통째로 «없는» 것이라 빨개지지도 않는다) ② 마릿수가 회차마다 달랐다.
     세 종을 선언으로 세우면 항이 셋으로 고정되고 무리 밀집도(O(n²) 분리 힘)도 같아진다.
   ⚠⚠ **여기서는 플레이어를 못박으면 안 된다 — 1회차가 그것으로 헛빨강을 만들었다.**
     서 있는 표적에 24마리가 그대로 **쌓이면**(실측 고블린 거리 중앙값 **27px** · 다크엘프 91)
     `spd <= 0`(공격 모션)과 분리 힘이 판을 지배해서, 제품이 «밀치느라 흔들리는 구간에서는 돌지
     않는다» 는 규칙대로 방향을 붙잡고 있는데도 좌표만 흔들려 «반대» 로 세어진다
     (1회차 실측: 고블린 84/591 = **14.2%** 이고 그 84 프레임이 **전부** 플레이어 120px 안이었다).
     옛 rAF 판이 이 자리를 안 밟은 이유는 플레이어가 자동 전투로 **카이팅하고 있었기** 때문이다 —
     그래서 무리는 «쌓이는» 게 아니라 «쫓는다». ⇒ 그 장면을 각본(`DET_PROG`)으로 되살린다.
     ⚑ **표본 규약이 아니라 장면을 되살린 것**이다: 재는 규칙(steady 구간 · born 필터)은 그대로다. */
const CROWD_DET = `(async (frames, seed, every) => {${DET_HEAD}
  const PROG = ${DET_PROG};
  try {${DET_CLEAR}${DET_PIN}
    const KIND = ['zombie', 'goblin', 'dark'], N = 8, TOT = KIND.length * N;
    for (let i = 0; i < TOT; i++) {
      makeEnemy(KIND[i % KIND.length]);
      const e = enemies[enemies.length - 1];
      const a = i * (Math.PI * 2 / TOT), R = 240 + (i % 3) * 80;
      e.x = player.x + Math.cos(a) * R;
      e.y = player.y + Math.sin(a) * R;
      e.ph = i % 2; e.born = 1; e.hp = e.max = 1e9;
    }
    const out = {};
    for (let f = 0; f < frames; f++) {
      const p = PROG[Math.floor(f / 45) % PROG.length];      /* 카이팅을 각본으로 — 위 ⚠⚠ */
      joy.on = true; joy.dx = p[0]; joy.dy = p[1]; joy.mag = 1;
      step(1 / 60);${DET_HOLD}
      for (const e of enemies) {
        e.hp = e.max = 1e9;
        if (!e.__id587) e.__id587 = 'e' + (++window.__n587 || (window.__n587 = 1));
      }
      if (f % every) continue;
      for (const e of enemies) (out[e.__id587] = out[e.__id587] || []).push({ tk: e.tk, x: e.x, flip: e.flip, born: e.born });
    }
    joy.on = false; joy.dx = joy.dy = 0; joy.mag = 0;
    return out;
  } finally { ${DET_TAIL} }
})`;

/* 조이스틱 — 손가락을 좌·우로 꺾어 **수동 이동**의 방향을 본다.
   ⚠ 방향마다 출발점을 반대편 끝에 세운다 — 가운데에서 출발하면 4.5초(수동 이동 230px/s)에
     월드 벽(1920)에 닿아 «움직이지 않는 프레임» 이 표본의 뒤쪽 절반을 먹는다. */
const JOY_DET = `(async (frames, seed, every, warm) => {${DET_HEAD}
  try {${DET_CLEAR}${DET_PIN}
    for (let i = 0; i < 6; i++) {
      makeEnemy('zombie');
      const e = enemies[enemies.length - 1];
      e.x = player.x + (i % 2 ? 300 : -300) + (i - 3) * 40;
      e.y = player.y + (i - 3) * 70;
      e.ph = i % 2; e.born = 1; e.hp = e.max = 1e9;
    }
    const out = [];
    for (const dir of [1, -1]) {
      player.x = dir > 0 ? 300 : WORLD.w - 300; player.y = WORLD.h / 2;
      player.vx = player.vy = 0;
      joy.on = true; joy.dx = dir; joy.dy = 0; joy.mag = 1;
      for (let f = 0; f < frames; f++) {
        step(1 / 60);${DET_HOLD}
        for (const e of enemies) e.hp = e.max = 1e9;
        if (f < warm) continue;              /* 꺾은 직후 가감속 구간은 버린다(0.5초) */
        if ((f - warm) % every) continue;
        out.push({ dir, x: player.x, flip: player.flip });
      }
    }
    joy.on = false; joy.dx = joy.dy = 0; joy.mag = 0;
    return out;
  } finally { ${DET_TAIL} }
})`;

/* 시체 승계 — 죽는 순간의 방향을 그대로 물려받는가.
   ⚠ **«0구» 가 났던 자리다.** 옛 판은 `setTimeout(900)` 동안 판을 그대로 굴렸는데, 그 사이
     플레이어가 그 좀비를 **먼저 죽여** `enemies` 가 비면 새 시체가 0구가 된다(실측 1회).
     스킬 봉인 + 체력 붙잡기로 «내가 죽이는 순간» 말고는 아무도 안 죽는다.
   ⚑ 프레임을 기다릴 이유가 없다 — `hitEnemy → killEnemy → corpses.push` 는 **같은 호출 안**이다. */
const CORPSE_DET = `(async (seed) => {${DET_HEAD}
  try {${DET_CLEAR}${DET_PIN}
    makeEnemy('zombie');
    { const e = enemies[0]; e.x = player.x - 300; e.y = player.y; e.ph = 0; }
    for (let f = 0; f < 54; f++) {           /* 0.9초 — 등장 팝인(born)을 지나 보낸다 */
      step(1 / 60);${DET_HOLD_PIN}
      for (const e of enemies) e.hp = e.max = 1e9;
    }
    const n0 = corpses.length;
    const alive = enemies.map(e => ({ x: e.x, flip: e.flip }));
    for (const e of enemies.slice()) hitEnemy(e, e.hp + 1, false);
    const made = corpses.slice(n0).map(c => ({ x: c.x, flip: c.flip }));
    return { alive, made };
  } finally { ${DET_TAIL} }
})`;

/* 587 이 쓰던 «자연 상태» 측정 — 재현(§A)에서 **옛 축이 흔들린다**는 것을 보이는 데만 쓴다.
   ⚠ 새 판정에는 쓰지 마라. 여기 그대로 옮겨 둔 이유는 두 축을 같은 파일에서 나란히 보기 위해서다. */
const FLAP_NAT = `(async (ms) => {
  enemies.length = 0; spawnQ.length = 0;
  for (let i = 0; i < 24; i++) makeEnemy('zombie');
  const tr = {}, pl = [];
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < ms) {
    await new Promise(r => requestAnimationFrame(r));
    n++; pl.push(player.flip);
    for (const e of enemies) {
      e.hp = e.max = 1e9;
      if (!e.__id) e.__id = 'e' + (Math.random() * 1e9 | 0);
      (tr[e.__id] = tr[e.__id] || []).push(e.flip);
    }
  }
  let flips = 0, frames = 0;
  for (const t of Object.values(tr)) { if (t.length < 60) continue; frames += t.length; for (let i = 1; i < t.length; i++) if (t[i] !== t[i - 1]) flips++; }
  let pf = 0; for (let i = 1; i < pl.length; i++) if (pl[i] !== pl[i - 1]) pf++;
  return { mob: frames ? flips / (frames / 60) : null, player: pl.length ? pf / (pl.length / 60) : null, frames: pl.length, det: false };
})`;

/* 단계 분해용 — 축을 하나씩만 못박는다(§B). mode:
     'dt'   프레임만 고정(난수·좌표는 자연)
     'rng'  프레임 + 난수 시드
     'all'  = FLAP_DET (프레임 + 난수 + 좌표·스월) */
const FLAP_STAGE = `(async (frames, seed, mode) => {
  const rawRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  await new Promise(r => rawRaf(r));
  await new Promise(r => setTimeout(r, 60));
  const rawRnd = Math.random;
  if (mode !== 'dt') {
    let s = (seed >>> 0) || 1;
    Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  try {
    enemies.length = 0; spawnQ.length = 0;
    player.hp = player.max = 1e9; player.dead = 0;
    for (let i = 0; i < 24; i++) makeEnemy('zombie');
    if (mode === 'all') {
      player.x = WORLD.w / 2; player.y = WORLD.h / 2;
      enemies.forEach((e, i) => {
        const a = i * (Math.PI * 2 / 24), R = 240 + (i % 3) * 80;
        e.x = player.x + Math.cos(a) * R; e.y = player.y + Math.sin(a) * R;
        e.ph = i % 2; e.born = 1;
      });
    }
    const tr = {}, pl = [];
    for (let f = 0; f < frames; f++) {
      step(1 / 60);
      pl.push(player.flip);
      for (const e of enemies) {
        e.hp = e.max = 1e9;
        if (!e.__id598) e.__id598 = 'e' + (++window.__n598 || (window.__n598 = 1));
        (tr[e.__id598] = tr[e.__id598] || []).push(e.flip);
      }
      player.hp = player.max = 1e9;
    }
    let flips = 0, fr = 0;
    for (const t of Object.values(tr)) { if (t.length < 60) continue; fr += t.length; for (let i = 1; i < t.length; i++) if (t[i] !== t[i - 1]) flips++; }
    let pf = 0; for (let i = 1; i < pl.length; i++) if (pl[i] !== pl[i - 1]) pf++;
    return { mob: fr ? flips / (fr / 60) : null, player: pl.length ? pf / (pl.length / 60) : null, frames: pl.length };
  } finally { Math.random = rawRnd; window.requestAnimationFrame = rawRaf; }
})`;

/* 히스테리시스를 뺀 사본을 만드는 치환(= verify587 §R-b 의 SUB_B 와 **같은 문자열**).
   ⚠ 두 벌이 되면 앵커가 갈라진다 — verify587 은 이 표를 require 해서 쓴다. */
const SUB_HYST = [
  [`      spd <= 0        ? dx > 0        /* 멈춰 서서 때리는 중(대시 예고·공격 모션) → 상대를 본다 */
      : evx >  MOVE_EPS ? true
      : evx < -MOVE_EPS ? false
      :                   curRight);  /* 밀치느라 흔들리는 구간 — 돌지 않는다 */`,
   `      Math.abs(evx) > MOVE_EPS ? evx > 0 : dx > 0);`],
  [`        player.vx >  MOVE_EPS ? true
      : player.vx < -MOVE_EPS ? false
      : moving                ? faceR                      /* 세로로만 간다 — 돌지 않는다 */
      :                         Math.cos(player.aim) > 0); /* 제자리 — 표적을 본다 */`,
   `        Math.abs(player.vx) > MOVE_EPS ? player.vx > 0 : Math.cos(player.aim) > 0);`]
];

/* 통계 보조 */
const stat598 = xs => {
  const v = xs.filter(x => typeof x === 'number' && isFinite(x));
  if (!v.length) return { n: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  return { n: v.length, min: Math.min(...v), max: Math.max(...v), mean, sd, cv: mean ? sd / mean : 0 };
};

module.exports = { FLAP_DET, PLAY_DET, FLAP_NAT, FLAP_STAGE, SUB_HYST, stat598, FLICK_F,
                   /* 606 — §3·§4 실동작 하네스(결정적) */
                   SOLO_DET, CROWD_DET, JOY_DET, CORPSE_DET };
