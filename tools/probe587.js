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
function scoreTrack(samples, faceRight, minDx) {
  /* samples: [{t,x,flip}] — 시간 순 */
  let moving = 0, wrong = 0, still = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    if (Math.abs(dx) < minDx) { still++; continue; }
    moving++;
    const drawnRight = (faceRight !== samples[i].flip);
    if (drawnRight !== (dx > 0)) wrong++;
  }
  return { moving, wrong, still, pct: moving ? Math.round(wrong / moving * 1000) / 10 : null };
}
function byId(list) {
  const m = new Map();
  for (const s of list) { if (!m.has(s.id)) m.set(s.id, []); m.get(s.id).push(s); }
  return m;
}
function scoreGroup(list, faceRight, minDx) {
  const agg = { moving: 0, wrong: 0, still: 0 };
  for (const track of byId(list).values()) {
    const r = scoreTrack(track, faceRight, minDx);
    agg.moving += r.moving; agg.wrong += r.wrong; agg.still += r.still;
  }
  agg.pct = agg.moving ? Math.round(agg.wrong / agg.moving * 1000) / 10 : null;
  return agg;
}

const MIN_DX = 1.2;      /* 표본 간격 ~33ms 에서 «가로로 뚜렷하게 움직였다» 는 임계(px) */

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
  const auto = await page.evaluate(`(${SAMPLER})(20000, 30)`);
  const pl = scoreTrack(auto.player.filter(s => s.dead <= 0), REF_FACE.knight, MIN_DX);
  (pl.pct === 0 ? ok : bad)('[B] 플레이어 — 이동 방향과 스프라이트가 반대인 프레임',
     `${pl.wrong}/${pl.moving} = ${pl.pct}% (정지 표본 ${pl.still})`);

  for (const tk of Object.keys(auto.mobs)) {
    const fk = TK_FACE[tk];
    if (!fk) { bad(`[C] ${tk}`, '원본 방향 표에 없는 종류'); continue; }
    const r = scoreGroup(auto.mobs[tk].filter(s => s.born > 0.35), REF_FACE[fk], MIN_DX);
    (r.pct === 0 ? ok : bad)(`[C] ${tk} — 이동 방향과 반대인 프레임`, `${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  /* ⚠ 자동 전투는 스테이지 1 이라 **좀비만** 나온다(`queueMobs` — 고블린 s≥3 · 다크엘프 s≥5).
     1회차에 [C] 가 좀비 한 줄뿐이었던 것이 그것이다. 나머지 둘은 직접 세워서 따로 잰다. */
  for (const tk of ['goblin', 'dark']) {
    const made = await page.evaluate((t) => {
      try { enemies.length = 0; spawnQ.length = 0; for (let i = 0; i < 6; i++) makeEnemy(t); return enemies.length; }
      catch (e) { return 'ERR ' + e.message; }
    }, tk);
    if (typeof made !== 'number' || !made) { bad(`[C] ${tk}`, `개체를 못 세웠다 (${made})`); continue; }
    const s = await page.evaluate(`(${SAMPLER})(8000, 30)`);
    const r = scoreGroup((s.mobs[tk] || []).filter(x => x.born > 0.35), REF_FACE[TK_FACE[tk]], MIN_DX);
    (r.pct === 0 ? ok : bad)(`[C] ${tk} — 이동 방향과 반대인 프레임`, `${r.wrong}/${r.moving} = ${r.pct}%`);
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
    (r.pct === 0 ? ok : bad)(`[D] ${tk}(knight 아틀라스) — 반대인 프레임`, `${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  /* ── [E] 시체 ─────────────────────────────────────────────────────── */
  /* ⚠ «죽이기 직전 표본 ↔ 시체» 를 x 로 짝짓지 마라 — 죽는 판정은 다음 step 에서 나므로 그 사이에
     좌표가 흐른다(1회차에 0/1 이 나왔다). 시체가 생기는 그 프레임에 원본 개체를 함께 붙잡는다. */
  const corpse = await page.evaluate(`(async () => {
    enemies.length = 0; spawnQ.length = 0; if (typeof corpses !== 'undefined') corpses.length = 0;
    for (let i = 0; i < 8; i++) makeEnemy('zombie');
    await new Promise(r => setTimeout(r, 900));
    const pairs = [];
    const n0 = corpses.length;
    /* 죽는 판정은 **다음 step** 에서 난다 — 그 사이 좌표가 흐르므로 «죽인 그 프레임» 의 개체를 붙잡고,
       시체가 실제로 생길 때까지 프레임을 돌린다(setTimeout 은 rAF 가 멈춘 탭에서 헛돈다). */
    const alive = enemies.map(e => ({ x: e.x, flip: e.flip, tk: e.tk }));
    for (const e of enemies) e.hp = -1;
    for (let k = 0; k < 20 && corpses.length === n0; k++) await new Promise(r => requestAnimationFrame(r));
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
      const t0 = performance.now();
      let last = -1e9;
      while (performance.now() - t0 < 2200) {
        await new Promise(r => requestAnimationFrame(r));
        const now = performance.now();
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
    (r.pct === 0 ? ok : bad)(`[G] 조이스틱 ${dir > 0 ? '오른쪽' : '왼쪽'} — 반대인 프레임`,
       `${r.wrong}/${r.moving} = ${r.pct}%`);
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
