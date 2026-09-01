#!/usr/bin/env node
/* 356 21회차 재현·되돌림 — 전투 HUD 💀 두 자리가 «정말로 자의 눈에 들어왔는가»
 *
 *   node tools/probe356r21.js
 *
 * 이 자가 답하는 것은 둘이다.
 *   ① **수리**: `#bossHp u`·`#dunBar u` 의 누적 종횡(sx/sy)이 1.000 인가.
 *   ② **되돌림**: 옛 값(`scale(1.122,.824)`)을 도로 심으면 **같은 화면·같은 측정**이 1.362 로 빨개지는가.
 *
 * ②가 이 자의 본체다. ①만 있으면 «그 화면에 애초에 노드가 없어서 0건» 인 헛초록과 구분이 안 된다 —
 * 341 이 «부팅 직후 8장 소등이 정상» 을 [전제] 절로 갈라 놓은 것과 같은 이유다.
 * 스무 회차 동안 이 두 자리가 0건이었던 것이 바로 그 헛초록이었다(화면이 목록에 없었다).
 *
 * ⚠ 제품 파일은 한 바이트도 안 건드린다 — 되돌림은 스타일시트를 얹어서 만든다(cap356r12·r15 규율).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { STEP, URL } = require('./scan356.js');

const OLD = '#bossHp u,#dunBar u{transform:scale(1.122,.824) !important}';

/* 21회차에 SCREENS 로 들어간 두 줄과 **같은 단계**를 쓴다(자를 두 벌로 안 적는다 — 13회차 [R12]). */
const CASES = [
  { name: '39 보스전 HUD(레이드)', sel: '#bossHp u', steps: ['js:S.daily.raid = RAID_TRY', 'js:startRaid(RAIDS[0])'] },
  { name: '30 던전 런 HUD', sel: '#dunBar u', steps: ['js:S.dunTk[DUNGEONS[0].id] = 3', 'js:challengeDungeon(DUNGEONS[0])'] },
];

/* 조상까지 누적한 종횡 — scan356 과 같은 뜻을 재야 두 자가 같은 것을 본다 */
const MEASURE = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return { found: false };
  const vis = (n) => { const s = getComputedStyle(n); return s.display !== 'none' && s.visibility !== 'hidden'; };
  let sx = 1, sy = 1;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const m = new DOMMatrixReadOnly(getComputedStyle(n).transform === 'none' ? '' : getComputedStyle(n).transform);
    sx *= Math.hypot(m.a, m.b) || 1;
    sy *= Math.hypot(m.c, m.d) || 1;
  }
  const r = el.getBoundingClientRect();
  return { found: true, shown: vis(el) && r.width > 0, sx: +sx.toFixed(4), sy: +sy.toFixed(4),
           ratio: +(sx / sy).toFixed(4), box: [+r.width.toFixed(2), +r.height.toFixed(2)] };
};

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✓ ' + m); };
const no = (m) => { fail++; console.log('  ✗ ' + m); };

(async () => {
  const browser = await launch(chromium);
  for (const c of CASES) {
    for (const revert of [false, true]) {
      const tag = revert ? '되돌림(옛 값 주입)' : '현행';
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      if (revert) await page.addStyleTag({ content: OLD });
      let silent = 0;
      for (const s of c.steps) { if (!(await STEP(page, s))) silent++; await page.waitForTimeout(420); }
      await page.waitForTimeout(700);
      const m = await page.evaluate(MEASURE, c.sel);
      await ctx.close();

      const head = `[${c.name}] ${tag} \`${c.sel}\``;
      if (silent) { no(`${head} — 단계 ${silent}건이 무음 실패(화면에 못 갔다)`); continue; }
      if (!m.found) { no(`${head} — 노드가 DOM 에 없다`); continue; }
      /* ⚑ «보인다» 를 먼저 묻는다 — 안 보이는 노드의 종횡 1.000 은 헛초록이다(20회차가 그 상태였다) */
      if (!m.shown) { no(`${head} — 노드는 있는데 안 보인다(이 화면이 그 자리를 못 띄운다)`); continue; }
      ok(`${head} — 보인다 · 상자 ${m.box[0]}×${m.box[1]} · 누적 sx ${m.sx} / sy ${m.sy} · 종횡 ${m.ratio}`);

      if (!revert) {
        if (Math.abs(m.ratio - 1) <= 0.02) ok(`  └ 수리 — 종횡 ${m.ratio} (|종횡−1| ≤ 0.02 = 등방)`);
        else no(`  └ 수리 — 종횡 ${m.ratio} 가 아직 비균등이다`);
      } else {
        if (Math.abs(m.ratio - 1) > 0.02) ok(`  └ 되돌림 — 옛 값에서 종횡 ${m.ratio} 로 **빨개진다** (자가 이 자리를 실제로 본다)`);
        else no(`  └ 되돌림 — 옛 값을 심었는데도 ${m.ratio} 다. 이 측정은 그 자리를 안 보고 있다(헛초록)`);
      }
    }
  }
  await browser.close();
  console.log(`\nPROBE356R21 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
