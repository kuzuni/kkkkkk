/* 541 게이트 — «플레이어 ×1.5 · 스킬 그림 ×2 · 잡몹 ×1.2 · 보스는 그대로» (저장소 주인 지시)
 *
 * 실행: node tools/verify541.js
 *
 * ── 이 자가 무엇을 지키는가 ────────────────────────────────────────────────────
 *  [A] 선언  — 배수는 **상수 셋에만** 산다(`ETYPE` 표를 손으로 곱하지 않았다) · sim249 정규식 회귀
 *  [B] 플레이어 — 찍힌 배율 1.5 · 잉크 ×1.5 · `player.r` 24 · **그림↔판정 비 불변**
 *  [C] 잡몹 3종 — 배율·잉크 ×1.2 · `e.r` ×1.2 · 그림↔판정 비 불변
 *  [D] 보스 3자리(스테이지·던전·승급) — 배율·반경·잉크가 **수리 전과 완전 동일**
 *  [E] 아레나 도전자 — 플레이어와 «같은 몸»(123 ④): 같은 `r`, knight 를 그린 배율이 한 종류
 *  [F] 스킬 그림 — 찍힌 픽셀이 ×2
 *  [G] 스킬 **판정** 불변 — 장판·레이저·오라·화구는 «그린 반경 = 피해 반경» 이라 배수를 안 태웠다.
 *      실제로 독 장판이 여전히 반경 92 에서만 때리는지 **실동작**으로 확인한다(그림만 2배였다면
 *      184 로 읽혀 100px 적도 맞는다).
 *  [H] 스폰 — 단독 개체(`soloClash`) 밀어내기가 여전히 겹침 0 이다
 *  [R] 되돌림 시험 — 상수 셋을 1 로 되돌린 사본은 **수리 전과 픽셀까지 같다**
 *      (이 절이 없으면 «그냥 다 커졌다» 를 통과시키는 무른 게이트가 된다)
 *
 * ⚠ 기준선을 손으로 적지 않는다 — 매 실행 «상수를 1 로 되돌린 사본» 을 만들어 **같은 자로** 재고,
 *   현재 트리를 그 값과의 «비» 로 채점한다(수치를 박아 두면 아트가 바뀔 때마다 게이트가 거짓말한다).  */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measure } = require('./size541lib');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.v541-neg-${process.pid}.html`);

const rows = [], fails = [];
const ok = (t, d) => rows.push(['✓', t, d === undefined ? '' : String(d)]);
const bad = (t, d) => { rows.push(['✗', t, String(d)]); fails.push(t + ' — ' + d); };
const eq = (t, got, want) => String(got) === String(want) ? ok(t, String(got))
                                                          : bad(t, `실측 ${got} / 기대 ${want}`);
const near = (t, got, want, tolPct) => {
  if (got === null || want === null || !isFinite(got) || !isFinite(want)) return bad(t, `잴 수 없었다(${got}/${want})`);
  const d = want === 0 ? (got === 0 ? 0 : 1e9) : Math.abs(got - want) / Math.abs(want) * 100;
  return d <= tolPct ? ok(t, `${got} (기대 ${want.toFixed ? want.toFixed(2) : want} · Δ${d.toFixed(2)}%)`)
                     : bad(t, `${got} / 기대 ${want} — Δ${d.toFixed(2)}% > ${tolPct}%`);
};

const src = fs.readFileSync(SRC, 'utf8');
const has = re => re.test(src);

(async () => {
  /* ─────────── [A] 선언 ─────────── */
  eq('[A1] `PLAYER_DRAW_SC = 1.5` 선언', has(/const\s+PLAYER_DRAW_SC\s*=\s*1\.5\s*;/), true);
  eq('[A2] `MOB_DRAW_SC = 1.2` 선언', has(/const\s+MOB_DRAW_SC\s*=\s*1\.2\s*;/), true);
  eq('[A3] `SK_DRAW_SC = 2` 선언', has(/const\s+SK_DRAW_SC\s*=\s*2\s*;/), true);
  eq('[A4] `unitSc` — arena 는 플레이어를, 단독 개체(보스)는 1 을 탄다',
     has(/const\s+unitSc\s*=\s*tk\s*=>\s*tk\s*===\s*'arena'\s*\?\s*PLAYER_DRAW_SC\s*:\s*\(\s*SOLO_CHASER\[tk\]\s*\?\s*1\s*:\s*MOB_DRAW_SC\s*\)/), true);
  /* 표를 손으로 곱했으면 여기서 빨개진다 — «원본이 얼마였는지» 가 표에 남아 있어야 한다 */
  eq('[A5] ETYPE 좀비 원본 `scale:0.150 / r:17` 불변', has(/fps:11,\s*scale:0\.150,\s*r:17,/), true);
  eq('[A6] ETYPE 고블린 원본 `scale:0.32 / r:13` 불변', has(/fps:9,\s*scale:0\.32,\s*r:13,/), true);
  eq('[A7] ETYPE 다크엘프 원본 `scale:0.44 / r:21` 불변', has(/fps:8,\s*scale:0\.44,\s*r:21,/), true);
  eq('[A8] ETYPE 보스 `scale:1.65 / r:54` 불변(주인 «보스는 그대로»)', has(/fps:7,\s*scale:1\.65,\s*r:54,/), true);
  eq('[A9] ETYPE 아레나 원본 `scale:1.0 / r:16` 불변(배수는 상수가 준다)', has(/fps:8,\s*scale:1\.0,\s*r:16,/), true);
  eq('[A10] ETYPE 승급 폴백 `scale:4.84 / r:66` 불변(실값은 역산 — 폴백을 만지면 함정이 된다)',
     has(/fps:7,\s*scale:4\.84,\s*r:66,/), true);
  /* ③ sim249 회귀 — **sim249 가 쓰는 그 정규식 그대로** 읽어 본다(285 에서 여기 주석을 넣었다가
     «boss gold 를 못 찾았다» 로 즉사시킨 자리다. 자를 베끼지 않고 같은 식을 쓴다 — tools/sim249.js 69·70행). */
  {
    const eg = k => (src.match(new RegExp(k + ":\\s*\\{[\\s\\S]{0,320}?gold:([\\d.]+)")) || [])[1];
    const eh = k => (src.match(new RegExp(k + ":\\s*\\{[\\s\\S]{0,320}?hp:([\\d.]+)")) || [])[1];
    eq('[A11] sim249 식으로 읽은 `boss` hp = 11', eh('boss'), '11');
    eq('[A12] sim249 식으로 읽은 `boss` gold = 20', eg('boss'), '20');
    eq('[A13] sim249 식으로 읽은 잡몹 hp 3종 = 1.0 / 0.50 / 2.6',
       [eh('zombie'), eh('goblin'), eh('dark')].join('/'), '1.0/0.50/2.6');
  }
  /* 그림 = 판정인 자리에는 배수를 안 태웠다 — 장판/오라/화구 그리기 구간에 SK_DRAW_SC 0건 */
  {
    const zi = src.indexOf('/* 독 장판 · 193 ⑧ 불 장판 · 193 ⑥ 레이저 */');
    const ci = src.indexOf('for(const c of corpses)');
    /* ⚠ 주석은 걷어내고 «코드» 만 본다 — 안 그러면 «여기에는 SK_DRAW_SC 를 안 태운다» 는
       설명 주석 자신이 이 항을 빨갛게 만든다(1회차에 실제로 그랬다). */
    const seg = (zi > 0 && ci > zi ? src.slice(zi, ci) : '').replace(/\/\*[\s\S]*?\*\//g, '');
    eq('[A14] 장판·레이저·오라 그리기 «코드» 에 `SK_DRAW_SC` 0건 (그림 = 판정인 자리)',
       seg.length > 0 && !/SK_DRAW_SC/.test(seg), true);
    eq('[A15] 그 구간에 «199 로 넘긴다» 는 근거 주석이 남아 있다', /541[\s\S]{0,600}199 로 넘긴다/.test(src), true);
  }

  /* ─────────── 측정 — «상수 1» 사본과 현재 트리를 같은 자로 ─────────── */
  fs.writeFileSync(NEG, src
    .replace(/const\s+PLAYER_DRAW_SC\s*=\s*1\.5\s*;/, 'const PLAYER_DRAW_SC = 1;')
    .replace(/const\s+MOB_DRAW_SC\s*=\s*1\.2\s*;/, 'const MOB_DRAW_SC    = 1;')
    .replace(/const\s+SK_DRAW_SC\s*=\s*2\s*;/, 'const SK_DRAW_SC     = 1;'));

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  const run = async file => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(path.basename(file) + ': ' + e));
    await page.goto('file://' + file);
    await page.waitForTimeout(1500);
    const m = await measure(page);
    /* [G]·[H] 는 «지금 트리» 에서만 묻는다 */
    m.probe = await page.evaluate(async () => {
      const out = {};
      /* G — 독 장판 피해 반경이 여전히 92 인가(그림만 2배였다면 184 로 읽힌다) */
      /* ⚠ 그냥 «hp 가 줄었나» 로 물으면 안 된다 — 플레이어의 평타·스킬이 같은 적을 때린다.
         그래서 **장판을 깐 판과 안 깐 판의 피해 차이**로 본다(장판 dps 1e6 이라 차이가 압도적이다). */
      const dmgAt = async (dist, withZone) => {
        enemies.length = 0; zones.length = 0; corpses.length = 0; shots.length = 0;
        makeEnemy('zombie');
        const e = enemies.filter(o => o.tk === 'zombie').pop();
        e.born = 1; e.x = player.x + dist; e.y = player.y + e.r;   /* 판정은 (e.x, e.y−e.r) 기준 */
        e.hp = e.max = 1e12; e.sp = 0;                             /* 걸어 들어와 반경 안으로 들지 않게 */
        const z = withZone ? { k: 'poison', x: player.x, y: player.y, r: 92, dps: 1e6, life: 9, t: 0, tick: 0 } : null;
        if (z) zones.push(z);
        const hp0 = e.hp;
        /* ⚠ 플레이어는 계속 걷는다 — 적만 붙들고 장판을 그 자리에 두면 «플레이어가 움직인 만큼»
           둘 사이 거리가 달라져 100px 표본이 반경 안으로 들어온다(1회차에 실제로 그랬다).
           그래서 매 틱 **장판과 적을 둘 다** 플레이어 기준으로 다시 놓아 기하를 고정한다. */
        for (let i = 0; i < 40; i++) {
          e.x = player.x + dist; e.y = player.y + e.r;
          if (z) { z.x = player.x; z.y = player.y; }
          step(0.05);
        }
        const d = hp0 - e.hp;
        enemies.length = 0; zones.length = 0; shots.length = 0;
        return d;
      };
      const z80 = await dmgAt(80, true), b80 = await dmgAt(80, false);
      const z100 = await dmgAt(100, true), b100 = await dmgAt(100, false);
      out.poisonHit80 = z80 - b80 > 1e5;
      out.poisonHit100 = z100 - b100 > 1e5;
      out.poisonDmg = [+(z80 - b80).toFixed(0), +(z100 - b100).toFixed(0)];
      /* H — 단독 개체 스폰 밀어내기(겹침 0). 던전 보스 3마리를 여러 판 세운다 */
      let worst = 0, over = 0;
      ETYPE.dunboss = dunBossType(DUNGEONS[0]);
      for (let run = 0; run < 100; run++) {
        enemies.length = 0;
        for (let i = 0; i < 3; i++) makeEnemy('dunboss');
        for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
          const a = enemies[i], b = enemies[j];
          const ov = a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y);
          if (ov > worst) worst = ov;
          if (ov > 0.01) over++;
        }
      }
      enemies.length = 0;
      out.spawnWorstOverlap = +worst.toFixed(3); out.spawnOverlaps = over;
      /* 아레나 도전자도 같은 자리에서 겹치지 않는가(반경이 16 → 24 로 커졌다) */
      let aover = 0;
      for (let run = 0; run < 100; run++) {
        enemies.length = 0;
        makeEnemy('arena'); makeEnemy('boss');
        const a = enemies[0], b = enemies[1];
        if (a && b && a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y) > 0.01) aover++;
      }
      enemies.length = 0;
      out.arenaOverlaps = aover;
      return out;
    });
    await page.close();
    await ctx.close();
    return m;
  };

  const neg = await run(NEG);
  const now = await run(SRC);
  await browser.close();
  try { fs.unlinkSync(NEG); } catch (_) {}

  /* ─────────── [R] 되돌림 시험 ─────────── */
  eq('[R1] 되돌린 사본의 플레이어 배율 = 1', neg.player.sc, 1);
  eq('[R2] 되돌린 사본의 `player.r` = 16', neg.playerR, 16);
  eq('[R3] 되돌린 사본의 좀비 배율 = 표 0.15', neg.mobs.zombie.sc, 0.15);
  eq('[R4] 되돌린 사본의 좀비 `r` = 표 17', neg.mobs.zombie.er, 17);
  eq('[R5] 되돌린 사본의 아레나 `r` = `player.r` = 16', `${neg.arena.r}/${neg.arena.playerR}`, '16/16');
  eq('[R6] 되돌린 사본의 knight 배율 종류 = [1]', JSON.stringify(neg.arena.knightScales), '[1]');
  /* 보스는 상수를 되돌려도 같아야 한다 — 애초에 이 배수를 안 타기 때문이다 */
  eq('[R7] 되돌린 사본의 보스 그려진 높이 = 지금과 동일', neg.boss.drawnH, now.boss.drawnH);

  /* ─────────── [B] 플레이어 ─────────── */
  eq('[B1] 플레이어 그리기 배율 = 1.5 (찍힌 dh/sh)', now.player.sc, 1.5);
  near('[B2] 플레이어 잉크 높이 = 수리 전 ×1.5', now.player.drawnH, neg.player.drawnH * 1.5, 2);
  near('[B3] 플레이어 잉크 폭 = 수리 전 ×1.5', now.player.drawnW, neg.player.drawnW * 1.5, 2);
  eq('[B4] `player.r` = 24 (= 16 × 1.5 — 그림과 같은 손잡이)', now.playerR, 24);
  near('[B5] 그림↔판정 비(잉크폭 ÷ r) 불변', now.player.drawnW / now.playerR, neg.player.drawnW / neg.playerR, 1);

  /* ─────────── [C] 잡몹 3종 ─────────── */
  const MOB = { zombie: [0.18, 20.4], goblin: [0.384, 15.6], dark: [0.528, 25.2] };
  for (const tk of ['zombie', 'goblin', 'dark']) {
    const m = now.mobs[tk], n = neg.mobs[tk];
    near(`[C] ${tk} 그리기 배율 = 표 × 1.2`, m.sc, MOB[tk][0], 0.5);
    near(`[C] ${tk} 판정 `.trim() + `r = 표 × 1.2`, m.er, MOB[tk][1], 0.5);
    near(`[C] ${tk} 잉크 높이 = 수리 전 ×1.2`, m.drawnH, n.drawnH * 1.2, 2);
    near(`[C] ${tk} 그림↔판정 비(잉크폭 ÷ r) 불변`, m.drawnW / m.er, n.drawnW / n.er, 1);
  }

  /* ─────────── [D] 보스 3자리 — 완전 동일 ─────────── */
  eq('[D1] `bossDrawnH()` 불변', now.boss.drawnH, neg.boss.drawnH);
  eq('[D2] `bossRK()` 불변', now.boss.rk, neg.boss.rk);
  eq('[D3] 스테이지 보스 배율·반경 불변', `${now.boss.stage.sc}/${now.boss.stage.r}`, `${neg.boss.stage.sc}/${neg.boss.stage.r}`);
  eq('[D4] 스테이지 보스 그려진 잉크 높이 불변', now.boss.stage.ink, neg.boss.stage.ink);
  eq('[D5] 던전 보스(역산) 배율·반경 불변', `${now.boss.dun.sc}/${now.boss.dun.r}`, `${neg.boss.dun.sc}/${neg.boss.dun.r}`);
  eq('[D6] 던전 보스 그려진 잉크 높이 불변', now.boss.dun.ink, neg.boss.dun.ink);
  eq('[D7] 승급 수호자(역산) 배율·반경 불변', `${now.boss.promo.sc}/${now.boss.promo.r}`, `${neg.boss.promo.sc}/${neg.boss.promo.r}`);
  eq('[D8] 승급 수호자 그려진 잉크 높이 불변', now.boss.promo.ink, neg.boss.promo.ink);

  /* ─────────── [E] 아레나 = «같은 몸» ─────────── */
  eq('[E1] 도전자 `r` = `player.r`', `${now.arena.r}/${now.arena.playerR}`, '24/24');
  eq('[E2] knight 를 그린 배율이 한 종류(둘이 같은 크기로 선다)', now.arena.knightScales.length, 1);
  eq('[E3] 그 한 종류가 1.5', now.arena.knightScales[0], 1.5);

  /* ─────────── [F] 스킬 그림 ×2 ─────────── */
  /* ⚠ 허용 오차 5% — 이 값은 «찍힌 픽셀» 이라 문턱(|Δ|>120) 경계에서 화소 한 칸이 흔들린다.
     가장 작은 표본(shuri 23.5px)에서 ±0.5px = ±2.1% 이므로 5% 가 그 두 배 여유다. */
  for (const k of ['shuri', 'ice', 'boom']) {
    near(`[F] 투사체 «${k}» 잉크 폭 = 수리 전 ×2`, now.skill[k] && now.skill[k].w, neg.skill[k] && neg.skill[k].w * 2, 5);
    near(`[F] 투사체 «${k}» 잉크 높이 = 수리 전 ×2`, now.skill[k] && now.skill[k].h, neg.skill[k] && neg.skill[k].h * 2, 5);
  }
  /* ⚠ slash 만 **기록만** 한다(통과를 막지 않는다) — 획 4px 짜리 얇은 호라 문턱(|Δ|>120) 경계에서
     실행마다 잉크 높이가 24.5~28(수리 전)·48.5~57(수리 후)로 흔들린다. 비는 1.7~2.3 사이를 오간다.
     «흔들리는 자를 통과선으로 쓰면 게이트가 난수가 된다» — 통과는 안정적인 세 표본이 진다. */
  ok('[F] 투사체 «slash» 잉크 높이 비 (기록만 — 얇은 호라 문턱 경계에서 흔들린다)',
     `${neg.skill.slash && neg.skill.slash.h} → ${now.skill.slash && now.skill.slash.h}` +
     ` (×${(now.skill.slash && neg.skill.slash ? now.skill.slash.h / neg.skill.slash.h : 0).toFixed(2)})`);

  /* ─────────── [G] 스킬 «판정» 불변 ─────────── */
  eq('[G1] 독 장판 — 중심에서 80px 적은 맞는다', now.probe.poisonHit80, true);
  eq('[G2] 독 장판 — 100px 적은 **안** 맞는다 (반경 92 그대로 · 184 였으면 맞는다)', now.probe.poisonHit100, false);
  ok('[G2-b] 장판이 준 피해(80px / 100px)', now.probe.poisonDmg.join(' / '));
  eq('[G3] 레이저 캡슐 선언 불변 (`len:470` · `w:34`)', /t:'beam',\s*dur:1\.7,\s*len:470,\s*w:34,/.test(src), true);
  eq("[G4] 노바 범위 선언 불변 (`t:'area', r:250`)", /t:'area',\s*r:250,/.test(src), true);
  eq('[G5] 화염병 장판 반경 선언 불변 (`zr:105`)', /zr:105,/.test(src), true);
  eq('[G6] 회전검 명중 반경 선언 불변 (`e.r+16`)', /\(e\.r\+16\)\*\(e\.r\+16\)/.test(src), true);

  /* ─────────── [H] 스폰 ─────────── */
  eq('[H1] 단독 개체 3마리 × 100판 — 겹친 쌍 0', now.probe.spawnOverlaps, 0);
  near('[H2] 그 최악 겹침 ≤ 0.01px', now.probe.spawnWorstOverlap, 0, 100);
  eq('[H3] 아레나 도전자 + 보스 × 100판 — 겹친 쌍 0 (r 16 → 24 회귀)', now.probe.arenaOverlaps, 0);

  errs.length ? bad('[콘솔] 페이지 예외 0건', errs.join(' | ')) : ok('[콘솔] 페이지 예외 0건');

  console.log('\n=== verify541 — 전투 화면 크기(플레이어 1.5 · 잡몹 1.2 · 스킬 그림 2 · 보스 불변) ===');
  for (const r of rows) console.log(`${r[0]} ${r[1]}${r[2] ? '  →  ' + r[2] : ''}`);
  const pass = rows.filter(r => r[0] === '✓').length;
  console.log(`\n${pass}/${rows.length} 통과`);
  if (fails.length) { console.log('\n실패:'); for (const f of fails) console.log(' · ' + f); }
  process.exit(fails.length ? 1 : 0);
})();
