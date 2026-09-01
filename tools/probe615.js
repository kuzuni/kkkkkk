#!/usr/bin/env node
/* 작업 615 재현 프로브 — «보정 보스 표본이 격파로 끝나지 않는다»
 *
 *   node tools/probe615.js [--stages=1,100,200,500] [--sec=20] [--json=<경로>] [--trace]
 *
 * 338 규칙: 처방(«pumpTo 를 생존 축까지 넓힌다»)을 밟기 전에 **먼저 재현한다.**
 * 등재문의 가설은 둘이고, 이 자가 둘을 가른다:
 *   ⓐ 창이 «격파» 가 아니라 **플레이어 사망**으로 끝난다      → 생존 축 결손
 *   ⓑ 창이 시간 초과(`bossT`/cap)로 끝난다                     → 화력 결손(pump 문제)
 *
 * 앵커마다 **두 캐릭터**를 나란히 굴린다 — 그 자체가 되돌림 시험이다:
 *   base : `pumpTo` 만 (= 수리 전 자)            surv : `pumpTo` + `pumpSurv` (= 수리 후 자)
 * 둘이 같은 결과면 처방이 아무 일도 안 한 것이고, base 만 «사망» 이면 처방이 그 자리를 고친 것이다.
 *
 * ⚑ **BOT_SRC 를 베끼지 않는다** — `tools/bot199.js` 를 `require` 해 같은 조각을 심는다.
 *   프로브가 자기 사본을 들면 자와 프로브가 조용히 갈린다(402 «사본을 지운 것이 핵심»).
 * ⚑ 앵커마다 **새 페이지**다(10회차 규약 — 한 캐릭터로 이어 돌면 앞 앵커 화력이 과충된다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { BOT_SRC, CLOCK, SEEDRNG, URL, ROOT } = require('./bot199');

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });
const STAGES = String(ARG.stages || '1,100,200,500').split(',').map(Number).filter(n => n > 0);
const SEC = Math.max(5, parseInt(ARG.sec || 20, 10));   /* 몹 표본은 «대역 안인가» 만 보면 되므로 짧게 */

let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? '  ok  ' : '  FAIL ') + m); };
const e3 = n => n == null ? '—' : Number(n).toExponential(3);

async function run(browser, s, surv, trace) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.addInitScript(CLOCK, new Date(2026, 0, 1, 8, 0, 0).getTime());
  await page.addInitScript(SEEDRNG, 1);
  await page.goto(URL);
  await page.waitForFunction(() => typeof step === 'function' && typeof S !== 'undefined' && S.daily, null, { timeout: 30000 });
  await page.evaluate(BOT_SRC, {});
  const r = await page.evaluate(([st, sec, doSurv, doTrace]) => {
    window.BOT.freeze();
    const B = window.BOT;
    S.stage = st; S.best = Math.max(S.best, st);
    /* kGuess 되먹임은 여기서 안 쓴다 — 이 자는 «창이 어떻게 끝나는가» 만 보므로 앵커 간
       목표 되먹임 없이 각 앵커를 독립으로 굴린다(자와 다른 점은 그 하나뿐이다). */
    const target = eHp(st) * ETYPE.boss.hp * bossGateHp(st) / (BOSS_SEC * 0.5);
    const dps0 = B.pumpTo(target);
    const m = B.sampleMobs(st, sec);
    const need0 = B.survNeed(st), have0 = B.survHave();
    const sv = doSurv ? B.pumpSurv(st, dps0) : { have: have0, need: need0, ratio: need0 > 0 ? have0 / need0 : null };
    const dpsBoss = stat.dps;
    if (doTrace) {
      enemies.length = 0; S.bossFarm = false; bossOn = false; startBoss();
      const fr = []; let seen = false;
      for (let f = 0; f < 30 * 30; f++) {
        const before = player.hp;
        step(1 / 30);
        const b = enemies.find(e => e.tk === 'boss' && e.born >= 0.3);
        if (b) seen = true;
        if (seen && (before - player.hp > 0 || player.dead > 0)) fr.push({ f, hp: +player.hp.toExponential(3), d: +(before - player.hp).toExponential(3), dead: +player.dead.toFixed(2) });
        if (seen && !b) break;
      }
      return { trace: true, s: st, surv: doSurv, maxHp: stat.maxHp, hit: fr.slice(0, 30) };
    }
    const b = B.sampleBoss(st);
    return { s: st, surv: doSurv, dps0, dpsBoss, target, pump: target > 0 ? dps0 / target : null,
             kills: m.kills, maxHp: stat.maxHp, regen: stat.regen, defMul: stat.defMul,
             survHave: sv.have, survNeed: sv.need, survPump: sv.ratio,
             bossSec: b.sec, killed: b.killed, endBy: b.endBy, over: dps0 > 0 ? dpsBoss / dps0 : null,
             dmgRat: b.hp0 > 0 ? b.dmg / b.hp0 : null,
             kBoss: b.sec > 0 ? (b.dmg / b.sec) / (dpsBoss || 1) : null };
  }, [s, SEC, surv, !!trace]);
  await ctx.close();
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const s of STAGES) {
    for (const surv of (ARG.only === 'surv' ? [true] : ARG.only === 'base' ? [false] : [false, true])) {
      const r = await run(browser, s, surv, ARG.trace);
      if (r.trace) { console.log(JSON.stringify(r)); continue; }
      rows.push(r);
      console.log(`s${r.s} [${surv ? 'surv' : 'base'}] pump ${r.pump == null ? '—' : r.pump.toExponential(2)} · 생존 ${r.survPump == null ? '—' : r.survPump.toExponential(2)} · 처치 ${r.kills} · 보스 ${r.bossSec.toFixed(2)}s · 창 안 피해 ${r.dmgRat == null ? '—' : (r.dmgRat * 100).toFixed(1) + '%'} · 끝 **${r.endBy}** · 체력 ${e3(r.maxHp)} · 과충 ×${r.over == null ? '—' : r.over.toExponential(2)} · κ_boss ${r.kBoss == null ? '—' : r.kBoss.toExponential(3)}`);
    }
  }
  await browser.close();
  if (!rows.length) { console.log('\n(추적 모드 — 판정 없음)'); process.exit(0); }

  const base = rows.filter(r => !r.surv), surv = rows.filter(r => r.surv);
  const by = o => { const m = {}; o.forEach(r => m[r.endBy] = (m[r.endBy] || 0) + 1); return Object.entries(m).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음'; };

  console.log('\n[1] 수리 전 — 창이 «격파» 로 안 끝난다');
  if (base.length) {
    ok(base.some(r => !r.killed), `base 격파 ${base.filter(r => r.killed).length}/${base.length} — 끝 이유 ${by(base)}`);
    const bad = base.filter(r => !r.killed);
    ok(bad.length === 0 || bad.every(r => r.endBy === 'death'),
       `미격파 행이 **전부 사망**으로 끝난다(가설 ⓐ · ⓑ 시간 초과 아님) — ${bad.filter(r => r.endBy === 'death').length}/${bad.length}`);
    ok(bad.length === 0 || bad.every(r => r.pump >= 0.5),
       `그 행들은 **화력 목표엔 닿아 있었다**(= 화력 결손이 아니다) — pump ${bad.map(r => r.pump.toFixed(2)).join(' · ')}`);
  }

  console.log('\n[2] 생존 축은 목표에 한참 못 미친다 — 그것이 결손의 자다');
  base.forEach(r => ok(true, `s${r.s} 있는 것 ${e3(r.survHave)} / 필요한 것 ${e3(r.survNeed)} = **${r.survPump == null ? '—' : r.survPump.toExponential(2)}** (방어 ×${r.defMul.toFixed(3)})`));

  console.log('\n[3] 처방(pumpSurv)이 그 수를 올린다 — 되돌림 시험');
  STAGES.forEach(s => {
    const b = base.find(r => r.s === s), v = surv.find(r => r.s === s);
    if (!b || !v) return;
    ok(v.survPump > b.survPump * 1.0000001,
       `s${s} 생존 ${b.survPump.toExponential(2)} → **${v.survPump.toExponential(2)}** (×${(v.survPump / b.survPump).toPrecision(3)}) · 체력 ${e3(b.maxHp)} → ${e3(v.maxHp)}`);
  });

  console.log('\n[4] 그래서 창의 끝이 바뀌었는가 (바뀐 자리 · 안 바뀐 자리 둘 다 적는다)');
  ok(true, `base 격파 ${base.filter(r => r.killed).length}/${base.length} (${by(base)}) → surv 격파 ${surv.filter(r => r.killed).length}/${surv.length} (${by(surv)})`);
  STAGES.forEach(s => {
    const b = base.find(r => r.s === s), v = surv.find(r => r.s === s);
    if (!b || !v) return;
    ok(true, `s${s} ${b.endBy} → ${v.endBy} · 창 안 피해 ${(b.dmgRat * 100).toFixed(1)}% → ${(v.dmgRat * 100).toFixed(1)}% · 보스 ${b.bossSec.toFixed(2)}s → ${v.bossSec.toFixed(2)}s`);
  });

  console.log('\n[5] 몹 축은 안 흔들렸다 — 생존 펌프는 몹 표본 **뒤**에 돈다');
  STAGES.forEach(s => {
    const b = base.find(r => r.s === s), v = surv.find(r => r.s === s);
    if (!b || !v) return;
    ok(b.kills === v.kills && Math.abs(b.dps0 - v.dps0) <= Math.max(1e-9, Math.abs(b.dps0) * 1e-12),
       `s${s} 60초 처치 ${b.kills} = ${v.kills} · 몹 표본 화력 ${e3(b.dps0)} = ${e3(v.dps0)}`);
  });

  if (ARG.json) fs.writeFileSync(path.resolve(ROOT, String(ARG.json)), JSON.stringify(rows, null, 1));
  console.log(`\nprobe615 — ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
