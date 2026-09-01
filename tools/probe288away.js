#!/usr/bin/env node
/* 작업 288 보조 실측 — `verify172` ③ «수렴 구간 멀어짐%» 가 288 이후 왜 올라가는가
 *   ⚠ 번호 이동(작업 286, 2026-08-28): 옛 `tools/probe185away.js`.
 *
 *   node tools/probe288away.js                 # after(작업트리)만
 *   P288_REF=<sha> node tools/probe288away.js  # before/after 비교
 *
 * verify172 ③ 은 «첫 접촉 이후 표본 중 직전보다 +2px 멀어진 표본의 비율» 이다. 288 로 넉백이
 * 사라지자 이 숫자가 3.0% → 11.8% 로 올라 게이트가 빨개졌다 — 그런데 **같은 표의 다른 열은 전부
 * 좋아졌다**(접촉까지 6.7s → 1.2s · 붙어있음 75.7% → 96.0% · 공격 20 → 30회 · 정렬 0.999 → 1.000).
 *
 * 가설: ③ 은 «멀어지는가» 가 아니라 **«어떤 표본이 창에 들어왔는가»** 에 지배된다.
 *   · 접근 구간(멀리서 다가오는 동안)은 거리가 단조 감소라 away 가 거의 0 이다.
 *   · 밀착 구간(사거리 안에서 플레이어의 카이팅과 함께 도는 동안)은 거리가 ±로 진동해 away 가 높다.
 *   288 은 접촉을 5.5초 앞당겨 **창의 대부분을 밀착 구간으로 바꿨다.** 분자가 아니라 분모가 바뀐 것이다.
 *
 * 이 자는 그래서 away% 를 **구간별로 쪼개서** 잰다. 가설이 맞으면
 *   · 밀착 구간 away% 는 before ≈ after (거동은 안 변했다)
 *   · 밀착 구간의 «표본 비중» 만 크게 오른다 (창의 구성이 변했다)
 * 가 나온다. verify172 는 남의 구간이라 한 줄도 건드리지 않는다 — 실측만 남긴다.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SEC = Number(process.env.P288_SEC || 30);
const REF = process.env.P288_REF || '';
const STAGE = Number(process.env.P288_STAGE || 30);
const ROOT = path.resolve(__dirname, '..');

const RUN = async ({ frames, sampleEvery, stage }) => {
  S.stage = stage; S.best = Math.max(S.best || 1, stage); S.bossFarm = false;
  spawnStage();
  S.rank = -1; startPromo();
  const find = () => enemies.find(e => e.tk === 'promo');
  const e0 = find();
  const reach = (e0 ? e0.r : ETYPE.promo.r) + player.r + 6;
  const NEAR = reach + 20;
  let prev = null, tClose = -1;
  /* 구간별 카운터: 0 = 접근(d > NEAR) · 1 = 밀착(d ≤ NEAR) */
  const n = [0, 0], away = [0, 0];
  let convN = 0, convAway = 0;                 /* verify172 ③ 과 «같은 정의» 의 대조군 */
  /* 「공격 모션 중에는 보스가 선다」(index.html ~16346 `if(e.atkT>0 && d<reach) spd=0`) 가
     away 표본을 만드는지 — 표본 구간에 공격 모션이 걸쳐 있었나로 쪼갠다 */
  let atkN = 0, atkAway = 0, idleN = 0, idleAway = 0, atkCnt = 0, atkFrames = 0;
  let sawAtk = false, cd0 = null;
  for (let f = 0; f < frames; f++) {
    const b0 = find();
    if (b0) b0.hp = b0.max;
    player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    bossT = 9999;
    if (typeof promo !== 'undefined' && promo) promo.t = 9999;
    const c0 = b0 ? b0.cd : null;
    window.__p288tick();
    const bf = find();
    if (bf) {
      if (bf.atkT > 0) { sawAtk = true; atkFrames++; }
      if (c0 !== null && bf.cd > c0) atkCnt++;      /* 쿨다운이 «올라간» 프레임 = 공격 시작 */
    }
    if (f % sampleEvery === 0) {
      const b = find();
      if (!b) { prev = null; sawAtk = false; continue; }
      const d = Math.hypot(player.x - b.x, player.y - b.y);
      const band = d <= NEAR ? 1 : 0;
      if (d <= NEAR && tClose < 0) tClose = f / 60;
      if (prev !== null) {
        const isAway = d > prev + 2;
        n[band]++; if (isAway) away[band]++;
        if (sawAtk) { atkN++; if (isAway) atkAway++; } else { idleN++; if (isAway) idleAway++; }
        if (tClose >= 0) { convN++; if (isAway) convAway++; }
      }
      prev = d; sawAtk = false;
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    reach, tClose,
    apprN: n[0], apprAway: n[0] ? away[0] / n[0] * 100 : 0,
    nearN: n[1], nearAway: n[1] ? away[1] / n[1] * 100 : 0,
    nearShare: (n[0] + n[1]) ? n[1] / (n[0] + n[1]) * 100 : 0,
    convN, convAwayPct: convN ? convAway / convN * 100 : 0,
    atkCnt, atkFrames,
    atkN, atkAwayPct: atkN ? atkAway / atkN * 100 : 0,
    idleN, idleAwayPct: idleN ? idleAway / idleN * 100 : 0,
    awayFromAtk: (away[0] + away[1]) ? atkAway / (away[0] + away[1]) * 100 : 0,
  };
};

async function runOne(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__p288tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__p288tick(); });
  const r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), sampleEvery: 6, stage: STAGE });
  await ctx.close();
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  let refFile = null;
  try {
    if (REF) {
      /* 756 — 얕은 클론이면 먼저 판다(규약 ①) · 못 가져오면 «환경/진짜 없음» 을 밝혀 던진다(규약 ②) */
      const got = require('./gitrev756').show(REF, 'index.html', { maxBuffer: 64 * 1024 * 1024 });
      if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
      if (got.how) console.log('[i]' + got.how);
      const out = got.buf;
      refFile = path.join(ROOT, `.p288-before-${REF.slice(0, 7)}-${process.pid}.html`);
      fs.writeFileSync(refFile, out);
    }
    const targets = [{ tag: 'after', file: path.join(ROOT, 'index.html') }];
    if (refFile) targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile });
    for (const t of targets) {
      process.stdout.write(`[·] ${t.tag} · 승급 수호자 · ${SEC}초 … `);
      const r = await runOne(browser, 'file://' + t.file.replace(/\\/g, '/'));
      rows.push({ tag: t.tag, ...r });
      console.log(`밀착 away ${r.nearAway.toFixed(1)}% · 밀착 비중 ${r.nearShare.toFixed(1)}%`);
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }
  console.log('\n| 빌드 | 접촉까지 | 접근 구간 표본 | 접근 away% | 밀착 구간 표본 | **밀착 away%** | **밀착 비중** | verify172 ③ |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.tClose < 0 ? '—' : r.tClose.toFixed(1) + 's'} | ${r.apprN} | ${r.apprAway.toFixed(1)}% | ${r.nearN} | `
      + `**${r.nearAway.toFixed(1)}%** | **${r.nearShare.toFixed(1)}%** | ${r.convAwayPct.toFixed(1)}% |`);

  console.log('\n| 빌드 | 공격 | 공격 모션 프레임 | 모션 걸친 표본 | **그중 away%** | 모션 없는 표본 | **그중 away%** | away 표본 중 «모션» 비중 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.atkCnt}회 | ${r.atkFrames} | ${r.atkN} | **${r.atkAwayPct.toFixed(1)}%** | ${r.idleN} | `
      + `**${r.idleAwayPct.toFixed(1)}%** | ${r.awayFromAtk.toFixed(0)}% |`);
})().catch(e => { console.error(e); process.exit(2); });
