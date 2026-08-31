/* 587 재현 — «스프라이트가 실제로 이동 방향과 반대로 찍히는가» 를 제품에게 직접 묻는다
   (338 규칙 — 처방 전에 재현. 등재문 가설을 믿고 코드부터 고치지 않는다).

   ⚑ 이 자는 **수리 전 기준선**과 **수리 후**를 같은 명령으로 잰다:
       node tools/probe587.js              작업 트리의 index.html
       node tools/probe587.js <파일>        사본(수리 전 기준선)
       node tools/probe587.js --json       수치만 JSON

   묻는 것:
     [A] 아틀라스 원본 방향 — 잉크 눈금(atlasface587) · ⚠ 눈금 자체의 교정 상태도 같이 찍는다
     [B] 플레이어 — 자동 전투에서 «가로로 움직이는 프레임» 중 스프라이트가 반대인 비율
     [C] 잡몹 3종(zombie·goblin·dark) — 같은 비율
     [D] knight 아틀라스를 쓰는 적 2종(promo 승급 수호자 · arena 도전자)
     [E] 시체(corpses) — 죽는 순간의 방향을 물려받는가
     [F] 펫 3종 — `faceRight` 거동(수리가 펫을 안 바꾼다는 기준선)
     [G] 조이스틱 수동 이동(42) — 손가락 방향과 스프라이트

   ── 판정 규약 ────────────────────────────────────────────────────────────
   `drawFrame(..., flip, ...)` 은 `flip` 이 참이면 `ctx.scale(-1,1)` 로 **좌우를 뒤집는다**(17581).
   따라서 **화면에 찍힌 방향**은
        drawnRight = (원본이 오른쪽을 본다) !== flip
   이고, 이 자는 그 `drawnRight` 와 **좌표 변화의 부호**를 견준다. 원본 방향은 [A] 가 준다.  */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measureAll, measureReach } = require('./atlasface587');
const path = require('path');

const args = process.argv.slice(2);
const JSON_ONLY = args.includes('--json');
const file = args.find(a => !a.startsWith('--'));
const TARGET = file ? path.resolve(file) : path.resolve(__dirname, '..', 'index.html');

/* 원본 방향 표 — **제품이 무엇을 선언하든 이 자는 안 흔들린다**(재현자가 제품을 베끼면 재현이 아니다).
   값의 출처는 셋이고 셋이 일치한다(상세 `docs/review/587-스프라이트방향.md` §2):
     ① 공격 뻗음 눈금(atlasface587 `measureReach`) — 무기는 보는 쪽으로 나간다. **기계적**이다.
     ② 비평가 2인 독립 육안(2026-08-31)
     ③ 펫 `PET_SP.faceRight` 의 기존 선언(bird·robo·dragon = 오른쪽) — ①②가 이 셋을 맞힌다.
   ⚠ `knight` 는 index.html 22136 의 주석 «기사 원본은 왼쪽을 봄» 과 **반대**다 — 그 주석이 틀렸다.
   ⚠ `elves` 시트는 초록(활 ←)과 파랑(지팡이 →)이 **서로 반대**라 «아틀라스 하나 = 방향 하나» 가 거짓이다.
   ⚠ `zombie` 는 **좌우 축이 아예 없다** — 위에서 내려다본 기는 자세라 머리가 아래를 보고 팔이 좌우
      대칭이다(비평가 3인 전원 «AMBIGUOUS» · 공격 애니가 walk 와 같아 뻗음 눈금도 못 쓴다).
      값은 «어느 쪽이든 찍히는 픽셀이 같다» 는 뜻이고, `true` 로 적은 근거는 **오늘 찍히던 그림을
      그대로 둔다** 는 것 하나다(현행 `e.flip = dx < 0` 이 곧 «원본이 오른쪽» 인 거동이다). */
const REF_FACE = { knight: true, zombie: true, elvesG: false, elvesB: true,
                   bird: true, robo: true, dragon: true };
/* 개체 종류 → 원본 방향 키 */
const TK_FACE = { zombie: 'zombie', goblin: 'elvesG', dark: 'elvesB', boss: 'elvesB',
                  promo: 'knight', arena: 'knight' };

const rows = [];
const ok  = (t, d) => rows.push(['✓', t, d === undefined ? '' : String(d)]);
const bad = (t, d) => rows.push(['✗', t, String(d)]);

/* 페이지 안에서 N 초 동안 좌표·flip 을 표집한다 */
const SAMPLER = `(async (ms, step) => {
  const out = { player: [], mobs: {}, pets: [], corpses: [] };
  const t0 = performance.now();
  const wait = () => new Promise(r => requestAnimationFrame(r));
  let last = -1e9;
  while (performance.now() - t0 < ms) {
    await wait();
    const now = performance.now();
    if (now - last < step) continue;
    last = now;
    out.player.push({ t: now, x: player.x, flip: player.flip, dead: player.dead });
    for (const e of enemies) {
      if (!e.__id) e.__id = 'e' + (Math.random() * 1e9 | 0);
      (out.mobs[e.tk] = out.mobs[e.tk] || []).push({ id: e.__id, t: now, x: e.x, flip: e.flip, born: e.born });
    }
    if (typeof pets !== 'undefined') for (const p of pets) {
      if (!p.__id) p.__id = 'p' + (Math.random() * 1e9 | 0);
      out.pets.push({ id: p.__id, t: now, x: p.x, flip: p.flip, key: p.sp && p.sp.anim ? (p.def && p.def.k) : null });
    }
    if (typeof corpses !== 'undefined') for (const c of corpses) out.corpses.push({ t: now, x: c.x, flip: c.flip, tk: c.tk || null });
  }
  return out;
})`;

/* 표집 → «가로로 뚜렷하게 움직인 구간» 중 스프라이트가 반대인 비율 */
/* ⚑ 이 자는 **앞 차분**(x[i+1] − x[i])으로 이동 방향을 잰다 — 뒤 차분이 아니다.
   `flip` 은 그 프레임의 속도로 정해지고 그 속도가 미는 것은 **다음 구간**이므로, 뒤 차분으로 견주면
   가속·감속 구간에서 한 칸씩 어긋난다(1회차에 그렇게 재서 수리 후에도 잔차 1% 가 남았고,
   «방향 전환 프레임» 을 의심했지만 전환은 **0건**이라 그 가설은 기각됐다 — 어긋난 것은 짝이었다).
   `wrongSt` 는 앞뒤 구간의 부호가 같은 «곧게 가는» 구간만 센다(전환 구간의 창 폭 효과 제거). */
function scoreTrack(samples, faceRight, minDx) {
  /* samples: [{t,x,flip}] — 시간 순.
     ⚑ **짝을 앞으로 맞춘다**(flip[i] ↔ x[i+1] − x[i]). 제품 코드만 보면 flip 은 좌표를 옮긴 **뒤**
        정해지니 뒤 차분이 맞을 것 같지만, **실측이 그 짐작을 기각했다** — 이 자의 rAF 콜백이
        게임 스텝보다 **먼저** 돌아서, 표본 i 에서 읽는 flip 은 직전 스텝의 값이고 그 값이 미는 것은
        i→i+1 구간이다. 뒤 차분으로 재면 단독 좀비가 **24%**(앞 차분 0%)로 나온다. */
  let moving = 0, wrong = 0, still = 0, steady = 0, wrongSt = 0, turns = 0;
  const sign = [], badAt = [], revAt = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const dx = samples[i + 1].x - samples[i].x;
    sign[i] = Math.abs(dx) < minDx ? 0 : (dx > 0 ? 1 : -1);
    if (!sign[i]) { still++; continue; }
    moving++;
    const drawnRight = (faceRight !== samples[i].flip);
    const bad = drawnRight !== (dx > 0);
    if (bad) { wrong++; badAt.push(i); }
    /* «곧게 가는» 구간 — 앞 구간도 같은 부호일 때만 센다(전환 창의 폭 효과를 뺀다) */
    const pd = i > 0 ? samples[i].x - samples[i - 1].x : 0;
    if (i > 0 && Math.abs(pd) >= minDx) {
      if ((pd > 0) === (dx > 0)) { steady++; if (bad) wrongSt++; }
      else turns++;
    }
  }
  /* ⚑ «틀린 프레임은 방향이 실제로 뒤집히는 자리에만 모여 있는가» — 히스테리시스의 값은 그것이다.
     마지막으로 부호가 있던 구간과 부호가 달라지는 지점을 «전환» 으로 잡고, 틀린 구간이 그
     전환에서 몇 칸 안에 있는지를 센다. 규칙이 틀렸다면 틀린 구간은 **전환과 무관하게 흩어진다**. */
  let lastSign = 0;
  for (let i = 0; i < sign.length; i++) {
    if (!sign[i]) continue;
    if (lastSign && sign[i] !== lastSign) revAt.push(i);
    lastSign = sign[i];
  }
  let far = 0, maxD = 0;
  for (const i of badAt) {
    let d = 1e9;
    for (const r of revAt) d = Math.min(d, Math.abs(r - i));
    if (d > HOLD_SPAN) far++;
    if (d < 1e9) maxD = Math.max(maxD, d);
  }
  return { moving, wrong, still, steady, wrongSt, turns, far, maxD, revs: revAt.length,
           pct: moving ? Math.round(wrong / moving * 1000) / 10 : null,
           pctSt: steady ? Math.round(wrongSt / steady * 1000) / 10 : null };
}
function byId(list) {
  const m = new Map();
  for (const s of list) { if (!m.has(s.id)) m.set(s.id, []); m.get(s.id).push(s); }
  return m;
}
function scoreGroup(list, faceRight, minDx) {
  const agg = { moving: 0, wrong: 0, still: 0, steady: 0, wrongSt: 0, turns: 0, far: 0, revs: 0, maxD: 0 };
  for (const track of byId(list).values()) {
    const r = scoreTrack(track, faceRight, minDx);
    for (const k of ['moving', 'wrong', 'still', 'steady', 'wrongSt', 'turns', 'far', 'revs']) agg[k] += r[k];
    agg.maxD = Math.max(agg.maxD, r.maxD);
  }
  agg.pct = agg.moving ? Math.round(agg.wrong / agg.moving * 1000) / 10 : null;
  agg.pctSt = agg.steady ? Math.round(agg.wrongSt / agg.steady * 1000) / 10 : null;
  return agg;
}

/* «가로로 뚜렷하게 움직였다» 는 임계를 **속도**로 적는다(px/s) — 표집 간격이 바뀌어도 뜻이 안 변한다.
   ⚠ 값이 36 인 이유: 제품이 방향을 바꿀 때 쓰는 `MOVE_EPS`(25px/s)보다 **위**여야 «제품의 규칙이
   실제로 작동한 구간» 만 채점하게 된다. 1회차에 이것을 px 상수 1.2 로 박았더니 느린 다크엘프
   (46px/s)가 33ms 창에서 임계에 걸려 **표본이 1개**밖에 안 잡혔다. */
const MIN_VX = 36;
const dxOf = (stepMs) => MIN_VX * stepMs / 1000;
const MIN_DX = dxOf(30);
/* 틀린 구간이 «전환에서 몇 칸 안» 인지는 **기록만** 한다 — 통과선으로 쓰지 않는다.
   외부 표집으로는 잔차를 0 으로 만들 수 없기 때문이다: 이 환경은 ~38fps 라 rAF 창 하나가
   게임 스텝 **둘**을 품는 일이 있고, 그때 창 평균 방향과 창 끝 flip 이 갈릴 수 있다.
   통과선은 «비율» 과 «되돌림» 으로 잡는다(verify587 §R) — 규칙이 틀렸다면 비율이 90% 대로 돌아온다. */
const HOLD_SPAN = 4;
const RESID = 1.0;      /* 단독·직선 표본의 잔차 허용 % — 수리 전 고블린 98.7 · 조이스틱 100/85.7 이었다 */
/* 무리·자동 AI 표본은 전환이 잦아 창 효과가 더 실린다. 실측 폭이 0.1~0.8% 라 2.0 으로 둔다 —
   수리 전 같은 자리가 **10.5%** 였으므로 여전히 한 자릿수 배가 아니라 열 배 이상 아래다. */
const RESID_ST = 2.0;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + TARGET);
  await page.waitForTimeout(2500);

  /* ── [A] 아틀라스 원본 방향 ─────────────────────────────────────────── */
  const face = await measureAll(page);
  const reach = await measureReach(page);
  for (const k of Object.keys(reach)) {
    const r = reach[k] || {};
    (r.faceRight === REF_FACE[k] ? ok : bad)(
      `[A1] ${k} — 공격 뻗음 오른쪽 ${r.reachR} / 왼쪽 ${r.reachL} (여유 ${r.margin})`,
      `${r.faceRight ? '오른쪽' : '왼쪽'} · 기준 ${REF_FACE[k] ? '오른쪽' : '왼쪽'}`);
  }
  for (const k of Object.keys(REF_FACE)) {
    const m = face[k] || {};
    ok(`[A2] ${k} — 머리 눈금 lean ${m.lean}`,
       `${m.faceRight ? '오른쪽' : '왼쪽'} · 기준 ${REF_FACE[k] ? '오른쪽' : '왼쪽'}${m.faceRight === REF_FACE[k] ? '' : ' ⚠ 불일치'}`);
  }
  /* ⚠ 머리 눈금은 **교정에 떨어졌다** — 펫 3종(faceRight:true 로 이미 선언돼 있다)을 1/3 만 맞힌다.
     robo·dragon 처럼 머리가 위가 아니라 «앞» 에 달린 몸에서는 위 1/3 이 머리가 아니기 때문이다.
     그래서 이 자는 머리 눈금을 **기록만** 하고 판정에는 안 쓴다(무른 자를 통과선으로 쓰지 않는다). */
  const calib = ['bird', 'robo', 'dragon'].filter(k => face[k] && face[k].faceRight === true).length;
  ok('[A0] 머리 눈금 교정(펫 3종을 맞히는가) — 판정에는 안 쓴다', `${calib}/3`);

  /* ── [B]·[C] 자동 전투 표집 ──────────────────────────────────────────── */
  const auto = await page.evaluate(`(${SAMPLER})(26000, 30)`);
  const pl = scoreTrack(auto.player.filter(s => s.dead <= 0), REF_FACE.knight, MIN_DX);
  /* ⚠ 자동 AI 플레이어는 카이팅이라 **서고 → 반대로 가고** 를 되풀이한다. 그래서
     «곧게 가는 구간»(앞뒤 구간의 부호가 같은 자리)만 통과선으로 쓴다 — 서다 출발하는 구간은
     33ms 창이 가속을 가로질러 창 평균과 창 끝 방향이 갈릴 수 있다.
     규칙 자체를 재는 자리는 [G](조이스틱 직선 · 0%)와 [C1](단독 직진 · 0%)이다. */
  (pl.pctSt !== null && pl.pctSt <= RESID_ST && pl.steady > 150 ? ok : bad)
    (`[B] 플레이어 — 곧게 가는 구간에서 반대인 프레임 ≤ ${RESID_ST}%`,
     `전환 제외 ${pl.wrongSt}/${pl.steady} = ${pl.pctSt}% · 날것 ${pl.wrong}/${pl.moving} = ${pl.pct}% (정지 ${pl.still})`);

  for (const tk of Object.keys(auto.mobs)) {
    const fk = TK_FACE[tk];
    if (!fk) { bad(`[C] ${tk}`, '원본 방향 표에 없는 종류'); continue; }
    const r = scoreGroup(auto.mobs[tk].filter(s => s.born > 0.35), REF_FACE[fk], MIN_DX);
    /* 무리 표본 — 위 [C1] 단독 대조가 규칙을 못박고, 여기는 «떼로 밀칠 때도 무너지지 않는다» 만 본다.
       잔차의 정체는 히스테리시스 유지 구간(|evx| ≤ MOVE_EPS)이라 결함이 아니다(review §5). */
    (r.pctSt !== null && r.pctSt <= RESID_ST ? ok : bad)(`[C2] ${tk} 무리(${byId(auto.mobs[tk]).size}마리) — 반대인 프레임 ≤ ${RESID_ST}%`,
       `전환 제외 ${r.wrongSt}/${r.steady} = ${r.pctSt}% · 날것 ${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  /* ⚠ 자동 전투는 스테이지 1 이라 **좀비만** 나온다(`queueMobs` — 고블린 s≥3 · 다크엘프 s≥5).
     1회차에 [C] 가 좀비 한 줄뿐이었던 것이 그것이다. 나머지 둘은 직접 세워서 따로 잰다. */
  /* ⚑ [C1] **한 마리만 세운 대조** — 이것이 규칙 자체를 재는 자리다.
     무리로 재면 분리 힘(위 ×2.9)이 가로 속도를 0 언저리에서 계속 흔들어, «움직인 방향» 이
     33ms 창 안에서도 바뀐다. 한 마리면 그 힘이 **정확히 0** 이라 잔차 없이 0% 가 나와야 한다. */
  for (const tk of ['zombie', 'goblin', 'dark']) {
    /* ⚠ 체력을 안 올리면 **플레이어가 곧바로 죽여** 표본이 5~6개로 끝난다(1회차에 그랬다).
       ⚠ 프레임마다 표집한다 — 100ms 창은 스텝 여섯을 뭉뚱그려 «창 안에서 방향이 바뀐 것» 을
          «어긋남» 으로 잘못 읽는다. 한 스텝 = 한 창이면 `flip` 과 이동이 **같은 벡터**라 정확하다. */
    /* ⚠ 세 겹으로 «깨끗한 직진» 을 만든다 — 안 그러면 표본이 흔들려 숫자가 회차마다 춤춘다:
         ⓐ 체력 1e9 — 안 그러면 플레이어가 곧바로 죽여 표본이 대여섯 개로 끝난다.
         ⓑ 플레이어에게 **가까워지면 멀리 되돌려 놓는다** — 코앞에서는 몹이 플레이어를 돌며
            쉬지 않고 방향을 트는데, 그 구간은 «규칙이 맞는가» 가 아니라 «전환 창» 을 재게 된다.
         ⓒ 되돌려 놓은 직후 몇 프레임은 버린다(순간이동은 이동이 아니다). */
    const made = await page.evaluate((t) => {
      try {
        enemies.length = 0; spawnQ.length = 0; makeEnemy(t);
        for (const e of enemies){ e.hp = e.max = 1e9; }
        return enemies.length;
      } catch (e) { return 'ERR ' + e.message; }
    }, tk);
    if (made !== 1) { bad(`[C1] ${tk} 단독`, `개체를 못 세웠다 (${made})`); continue; }
    const s = await page.evaluate(`(async () => {
      const out = { mobs: {} }, id = 'solo';
      let skip = 0, side = 1;
      const t0 = performance.now();
      while (performance.now() - t0 < 14000) {
        await new Promise(r => requestAnimationFrame(r));
        const e = enemies[0];
        if (!e) break;
        e.hp = e.max = 1e9;
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < 420) {
          /* ⓑ 멀리 되돌리되 **플레이어와 같은 높이**에 놓는다 — 그래야 접근이 거의 순수한 가로
             이동이 되어 |vx| 가 임계(MIN_VX)를 넉넉히 넘는다. 대각으로 놓으면 느린 다크엘프
             (46px/s)는 x 성분이 임계 아래로 깔려 **표본이 다섯 개**밖에 안 잡힌다(실측).
             좌우를 번갈아 놓아 «오른쪽으로 갈 때» 와 «왼쪽으로 갈 때» 를 둘 다 잰다. */
          side = -side;
          e.x = side > 0 ? Math.max(90, player.x - 520) : Math.min(WORLD.w - 90, player.x + 520);
          e.y = player.y;
          skip = 4;                                      /* ⓒ */
          continue;
        }
        if (skip > 0) { skip--; continue; }
        (out.mobs[e.tk] = out.mobs[e.tk] || []).push({ id, x: e.x, flip: e.flip, born: e.born });
      }
      return out;
    })()`);
    const r = scoreGroup((s.mobs[tk] || []).filter(x => x.born > 0.35), REF_FACE[TK_FACE[tk]], dxOf(1000 / 60));
    (r.moving > 100 && r.pct <= RESID ? ok : bad)(`[C1] ${tk} 단독(프레임마다) — 반대인 프레임 ≤ ${RESID}%`,
       `${r.wrong}/${r.moving} = ${r.pct}% · 전환 ±${HOLD_SPAN}칸 밖 ${r.far}건 (전환 ${r.revs} · 최대 거리 ${r.maxD})`);
  }

  /* ── [D] knight 아틀라스를 쓰는 적 2종 ──────────────────────────────── */
  for (const tk of ['promo', 'arena']) {
    const made = await page.evaluate((t) => {
      try { enemies.length = 0; spawnQ.length = 0; for (let i = 0; i < 2; i++) makeEnemy(t); return enemies.length; }
      catch (e) { return 'ERR ' + e.message; }
    }, tk);
    if (typeof made !== 'number' || !made) { bad(`[D] ${tk}`, `개체를 못 세웠다 (${made})`); continue; }
    const s = await page.evaluate(`(${SAMPLER})(8000, 30)`);
    const list = s.mobs[tk] || [];
    const r = scoreGroup(list.filter(x => x.born > 0.35), REF_FACE.knight, MIN_DX);
    (r.pctSt !== null && r.pctSt <= RESID ? ok : bad)(`[D] ${tk}(knight 아틀라스) — 반대인 프레임 ≤ ${RESID}%`,
       `전환 제외 ${r.wrongSt}/${r.steady} · 날것 ${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  /* ── [E] 시체 ─────────────────────────────────────────────────────── */
  /* ⚠ «죽이기 직전 표본 ↔ 시체» 를 x 로 짝짓지 마라 — 죽는 판정은 다음 step 에서 나므로 그 사이에
     좌표가 흐른다(1회차에 0/1 이 나왔다). 시체가 생기는 그 프레임에 원본 개체를 함께 붙잡는다. */
  const corpse = await page.evaluate(`(async () => {
    /* ⚠ 여럿을 한꺼번에 죽이면 스테이지가 넘어가고 spawnStage() 가 corpses 를 통째로 비운다
       (20767) — 1회차에 «시체 0구» 가 나온 것이 그것이다. **한 마리만** 죽인다.
       ⚠ 이 블록은 템플릿 리터럴 안이라 역따옴표를 쓰면 안 된다(즉사한다). */
    enemies.length = 0; spawnQ.length = 0; if (typeof corpses !== 'undefined') corpses.length = 0;
    makeEnemy('zombie');
    await new Promise(r => setTimeout(r, 900));
    const pairs = [];
    const n0 = corpses.length;
    /* 죽는 판정은 **다음 step** 에서 난다 — 그 사이 좌표가 흐르므로 «죽인 그 프레임» 의 개체를 붙잡고,
       시체가 실제로 생길 때까지 프레임을 돌린다(setTimeout 은 rAF 가 멈춘 탭에서 헛돈다). */
    const alive = enemies.map(e => ({ x: e.x, flip: e.flip, tk: e.tk }));
    /* ⚠ hp 를 직접 0 으로 내려도 **안 죽는다** — 죽음은 step 루프가 아니라 hitEnemy() 안에서만
       난다(21509 «if(e.hp <= 0) killEnemy(e)»). 1회차에 시체가 0~1구로 들쭉날쭉했던 것이 그것이고,
       가끔 1구가 나온 것은 마침 플레이어가 때렸기 때문이다. 피해 경로를 그대로 지나가게 한다. */
    for (const e of enemies.slice()) hitEnemy(e, e.hp + 1, false);
    for (let k = 0; k < 30 && corpses.length === n0; k++) await new Promise(r => requestAnimationFrame(r));
    for (let i = n0; i < corpses.length; i++) {
      const c = corpses[i];
      /* 가장 가까운 원본을 x 로 찾되 «죽는 프레임의 이동분» 만큼 여유를 준다(한 프레임 ≤ 6px) */
      let best = null, bd = 1e9;
      for (const a of alive) { const dd = Math.abs(a.x - c.x); if (dd < bd) { bd = dd; best = a; } }
      pairs.push({ dx: Math.round(bd * 10) / 10, same: !!best && best.flip === c.flip });
    }
    return { pairs, made: corpses.length - n0 };
  })()`);
  const matched = corpse.pairs.filter(p => p.same).length;
  (corpse.made > 0 && matched === corpse.pairs.length ? ok : bad)
    ('[E] 시체 — 죽는 순간의 flip 을 그대로 물려받는가', `${matched}/${corpse.pairs.length} (시체 ${corpse.made}구)`);

  /* ── [F] 펫 ───────────────────────────────────────────────────────── */
  const petS = await page.evaluate(`(${SAMPLER})(8000, 30)`);
  if (!petS.pets.length) ok('[F] 펫', '장착된 펫이 없다(기준선 표본 0)');
  else {
    /* 펫은 «이동» 이 아니라 «표적» 을 보는 것이 설계다(22290) — 여기서는 거동이 바뀌지 않았음을
       보이는 것이 목적이라 «flip 이 표적 쪽을 향하는 비율» 만 찍는다. */
    const flips = petS.pets.filter(p => p.flip).length;
    ok('[F] 펫 — flip 참 표본 / 전체', `${flips}/${petS.pets.length}`);
  }

  /* ── [G] 조이스틱 수동 이동 ─────────────────────────────────────────── */
  const joyR = await page.evaluate(`(async () => {
    enemies.length = 0; spawnQ.length = 0;
    for (let i = 0; i < 6; i++) makeEnemy('zombie');
    const out = [];
    for (const dir of [1, -1]) {
      joy.on = true; joy.dx = dir; joy.dy = 0; joy.mag = 1;
      /* ⚠ 손가락을 **반대로 꺾은 직후**의 가감속 구간은 버린다(0.5초). 그 구간은 «규칙이 맞나» 가
         아니라 관성이 방향을 뒤집는 과도 구간이고, 표본이 60개뿐이면 그 한 프레임이 통째로
         1.6% 가 되어 게이트가 3회 중 1회 빨개진다(실측). 표집 시간도 늘려 분모를 키운다. */
      const t0 = performance.now(); let last = -1e9;
      while (performance.now() - t0 < 4500) {
        await new Promise(r => requestAnimationFrame(r));
        const now = performance.now();
        if (now - t0 < 500) continue;
        if (now - last < 30) continue; last = now;
        out.push({ dir, t: now, x: player.x, flip: player.flip });
      }
    }
    joy.on = false; joy.dx = joy.dy = 0; joy.mag = 0;
    return out;
  })()`);
  for (const dir of [1, -1]) {
    const seq = joyR.filter(s => s.dir === dir);
    const r = scoreTrack(seq, REF_FACE.knight, MIN_DX);
    (r.pctSt !== null && r.pctSt <= RESID ? ok : bad)(`[G] 조이스틱 ${dir > 0 ? '오른쪽' : '왼쪽'} — 반대인 프레임 ≤ ${RESID}%`,
       `전환 제외 ${r.wrongSt}/${r.steady} · 날것 ${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  errs.length ? bad('[X] 콘솔 예외', errs.slice(0, 3).join(' | ')) : ok('[X] 콘솔 예외 0건');
  await browser.close();

  if (JSON_ONLY) { console.log(JSON.stringify({ rows, face }, null, 1)); return; }
  const nOk = rows.filter(r => r[0] === '✓').length;
  console.log(`\n== probe587 (${path.basename(TARGET)}) ==`);
  for (const [m, t, d] of rows) console.log(` ${m} ${t}${d ? '  — ' + d : ''}`);
  console.log(`\n ${nOk}/${rows.length}\n`);
  process.exit(nOk === rows.length ? 0 : 1);
})();
