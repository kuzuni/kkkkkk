/* 작업 28 검증 — 보스전 개편 ([3]-(가) 기계적 검증)
 * 헤드리스로 index.html 을 띄워 보스전 로직 5가지를 확인한다.
 *   1. 보스 스탯 = 일반(좀비) 대비 체력 ×22 · 공격력 ×22
 *   2. 보스전엔 보스만 스폰 (일반 몹 0)
 *   3. 제한 시간 30초 — 헤더에 남은 시간 표시
 *   4. 시간 초과 / 사망 → 스테이지 유지 + 일반 몹 파밍 + «재도전» 버튼
 *   5. 재도전 → 보스전 재시작, 클리어 → 자동 진행 재개
 */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', '..', '..', '..', 'home', 'user', 'kkkkkk', 'index.html');
const FILE = 'file://' + '/home/user/kkkkkk/index.html';

const fails = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const chk = (cond, m, extra) => cond ? ok(m) : fail(m + (extra ? '  — ' + extra : ''));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  /* ---- 1. 보스 스탯 배수 ---- */
  console.log('[1] 보스 스탯 ×22');
  const st = await page.evaluate(() => ({ hp: ETYPE.boss.hp, dmg: ETYPE.boss.dmg,
                                          zhp: ETYPE.zombie.hp, zdmg: ETYPE.zombie.dmg }));
  chk(st.hp / st.zhp === 22, '체력 배수 ×22', `hp ${st.hp} / zombie ${st.zhp}`);
  chk(st.dmg / st.zdmg === 22, '공격력 배수 ×22', `dmg ${st.dmg} / zombie ${st.zdmg}`);

  /* ---- 2. 보스전엔 보스만 ---- */
  console.log('[2] 보스전 단독 스폰');
  const s2 = await page.evaluate(async () => {
    S.stage = 10; S.bossFarm = false; spawnStage();
    await new Promise(r => setTimeout(r, 2600));   /* 보스 스폰 딜레이 1.4s */
    return { types: enemies.map(e => e.tk), q: spawnQ.map(x => x.t), total: stageTotal(),
             bossT: bossT, chap: document.getElementById('chapN').textContent };
  });
  chk(s2.types.length === 1 && s2.types[0] === 'boss', '적은 보스 1마리뿐', JSON.stringify(s2.types));
  chk(s2.q.length === 0, '대기열에 일반 몹 없음', JSON.stringify(s2.q));
  chk(s2.total === 1, '진행바 총량 = 1', String(s2.total));

  /* ---- 3. 30초 타이머 ---- */
  console.log('[3] 제한 시간 30초');
  chk(s2.bossT > 26 && s2.bossT <= 30, '보스전 시작 시 bossT ≈ 30', s2.bossT.toFixed(2));
  const t1 = await page.evaluate(() => bossT);
  await page.waitForTimeout(1500);
  const t2 = await page.evaluate(() => bossT);
  chk(t2 < t1 - 1.0, '시간이 실제로 흐른다', `${t1.toFixed(2)} → ${t2.toFixed(2)}`);
  const tmUI = await page.evaluate(() => {
    const el = document.getElementById('bossTm');
    if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { txt: el.textContent, vis: cs.display !== 'none' && r.width > 0,
             x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  chk(tmUI && tmUI.vis, '헤더에 ⏱ 타이머 표시', tmUI ? JSON.stringify(tmUI) : '#bossTm 없음');
  chk(tmUI && /\d/.test(tmUI.txt) && !/NaN|undefined/.test(tmUI.txt), '타이머 문자열 정상', tmUI && tmUI.txt);

  /* ---- 4. 시간 초과 → 파밍 + 재도전 버튼 ---- */
  console.log('[4] 시간 초과 → 스테이지 유지 · 파밍 · 재도전 버튼');
  const s4 = await page.evaluate(async () => {
    bossT = 0.05;                       /* 시간 초과를 즉시 유발 */
    await new Promise(r => setTimeout(r, 900));
    const btn = document.getElementById('bossRt');
    const r = btn ? btn.getBoundingClientRect() : null;
    return { stage: S.stage, farm: S.bossFarm, bossT,
             enemyTypes: [...new Set(enemies.map(e => e.tk).concat(spawnQ.map(x => x.t)))],
             queued: enemies.length + spawnQ.length, total: stageTotal(),
             btn: btn ? { txt: btn.textContent.trim(), vis: getComputedStyle(btn).display !== 'none',
                          x: Math.round(r.x), y: Math.round(r.y),
                          w: Math.round(r.width), h: Math.round(r.height) } : null };
  });
  chk(s4.stage === 10, '스테이지 유지 (되돌리지 않음)', 'stage=' + s4.stage);
  chk(s4.farm === true, '파밍 상태로 전환 (S.bossFarm)', String(s4.farm));
  chk(!s4.enemyTypes.includes('boss') && s4.queued > 0, '일반 몹 파밍 시작', JSON.stringify(s4.enemyTypes));
  chk(s4.total === 50, '진행바 총량 = 일반 파도 50', String(s4.total));
  chk(s4.btn && s4.btn.vis, '«재도전» 버튼 노출', s4.btn ? JSON.stringify(s4.btn) : '#bossRt 없음');
  chk(s4.btn && s4.btn.txt.includes('재도전'), '버튼 문구 «재도전»', s4.btn && s4.btn.txt);

  /* 보스전이 아닐 때 타이머는 숨어야 한다 */
  const tmHidden = await page.evaluate(() => {
    const el = document.getElementById('bossTm');
    return el ? getComputedStyle(el).display === 'none' || el.getBoundingClientRect().width === 0 : true;
  });
  chk(tmHidden, '파밍 중에는 타이머 숨김');

  /* ---- 5. 재도전 → 보스전 재시작 ---- */
  console.log('[5] 재도전 → 재시작 · 클리어 → 자동 진행');
  const s5 = await page.evaluate(async () => {
    document.getElementById('bossRt').click();
    await new Promise(r => setTimeout(r, 2600));
    return { farm: S.bossFarm, stage: S.stage, bossT,
             types: enemies.map(e => e.tk),
             btnVis: getComputedStyle(document.getElementById('bossRt')).display !== 'none' };
  });
  chk(s5.farm === false, '재도전 시 파밍 해제', String(s5.farm));
  chk(s5.stage === 10, '재도전은 같은 스테이지', 'stage=' + s5.stage);
  chk(s5.types.length === 1 && s5.types[0] === 'boss', '보스 재스폰(단독)', JSON.stringify(s5.types));
  chk(s5.bossT > 26, '타이머 30초로 리셋', s5.bossT.toFixed(2));
  chk(!s5.btnVis, '보스전 중에는 재도전 버튼 숨김');

  const s6 = await page.evaluate(async () => {
    const b = enemies.find(e => e.tk === 'boss');
    killEnemy(b);
    await new Promise(r => setTimeout(r, 900));
    return { stage: S.stage, farm: S.bossFarm, bossT, total: stageTotal(),
             types: [...new Set(enemies.map(e => e.tk).concat(spawnQ.map(x => x.t)))] };
  });
  chk(s6.stage === 11, '보스 클리어 → 다음 스테이지 자동 진행', 'stage=' + s6.stage);
  chk(s6.farm === false, '클리어 후 파밍 플래그 해제', String(s6.farm));
  chk(s6.bossT === 0, '클리어 후 타이머 정지', String(s6.bossT));
  chk(!s6.types.includes('boss') && s6.types.length > 0, '다음 스테이지는 일반 몹', JSON.stringify(s6.types));

  /* ---- 6. 사망 경로 ---- */
  console.log('[6] 보스전 중 사망 → 파밍 + 재도전');
  const s7 = await page.evaluate(async () => {
    S.stage = 20; S.bossFarm = false; spawnStage();
    await new Promise(r => setTimeout(r, 2400));
    const before = { stage: S.stage, types: enemies.map(e => e.tk) };
    /* 보스 접촉 피해로 죽는 상황을 그대로 재현하기 어려우므로, 사망 판정 경로를 직접 태운다 */
    player.hp = 0; player.dead = 2.4; failBoss('패배');
    await new Promise(r => setTimeout(r, 600));
    return { before, stage: S.stage, farm: S.bossFarm,
             btnVis: getComputedStyle(document.getElementById('bossRt')).display !== 'none',
             types: [...new Set(enemies.map(e => e.tk).concat(spawnQ.map(x => x.t)))] };
  });
  chk(s7.before.types.length === 1 && s7.before.types[0] === 'boss', '20 스테이지도 보스 단독', JSON.stringify(s7.before.types));
  chk(s7.stage === 20, '사망해도 스테이지 유지', 'stage=' + s7.stage);
  chk(s7.farm === true, '사망 → 파밍 전환', String(s7.farm));
  chk(s7.btnVis, '사망 후 «재도전» 버튼 노출');
  chk(!s7.types.includes('boss'), '사망 후 일반 몹만', JSON.stringify(s7.types));

  /* ---- 7. 저장/복원 ---- */
  console.log('[7] 저장 구조');
  const s8 = await page.evaluate(() => {
    save();
    const raw = JSON.parse(localStorage.getItem(KEY));
    return { key: KEY, hasFarm: 'bossFarm' in raw, farm: raw.bossFarm,
             defHasFarm: 'bossFarm' in DEF() };
  });
  chk(s8.defHasFarm && s8.hasFarm, 'S.bossFarm 이 세이브에 포함', JSON.stringify(s8));
  chk(s8.key === 'idle_hunter_save_v4', 'KEY 불변(기본값 병합으로 하위 호환)', s8.key);

  /* ---- 8. 콘솔 / 화면 텍스트 ---- */
  console.log('[8] 런타임');
  const bad = await page.evaluate(() => (document.body.innerText || '').match(/\bNaN\b|\bundefined\b|\bInfinity\b/));
  chk(!bad, '화면 텍스트에 NaN/undefined/Infinity 없음', bad && bad[0]);
  chk(errs.length === 0, '콘솔 에러 0', errs.join(' | '));

  await ctx.close(); await browser.close();
  console.log('');
  console.log(fails.length ? 'VERIFY28 FAIL (' + fails.length + ')\n - ' + fails.join('\n - ') : 'VERIFY28 PASS');
  process.exit(fails.length ? 1 : 0);
})();
