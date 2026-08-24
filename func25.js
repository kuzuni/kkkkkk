#!/usr/bin/env node
/* 25 기능 체크 — ROUTINE «기능 완성 규칙»(T2, 2026-08-25 저장소 주인 지시)
 *
 * «만들어 놓음» 이 아니라 **실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영되는가** 를 본다.
 * 버튼별로 «눌렀을 때 무엇이 바뀌는지» 를 헤드리스로 실제 클릭해서 확인한다. `node func25.js`
 */
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

const rows = [], fails = [];
const row = (btn, expect, got, pass) => {
  rows.push([btn, expect, got, pass ? 'OK' : 'FAIL']);
  if (!pass) fails.push(btn + ' — ' + got);
  console.log((pass ? '  o ' : '  X ') + btn + ' → ' + got);
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p2 = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p2)) throw e;
    browser = await chromium.launch({ executablePath: p2 });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  /* 실제 게임 데이터를 만든다 — 부위별 아이템을 «보유» 시키고 저장까지 */
  const seed = await page.evaluate(() => {
    /* 보유 구조는 S.own[id] = {n, l} 다 — 숫자를 넣으면 oLv/보너스 계산이 통째로 NaN 이 된다.
       «지금 장착돼 있지 않은» 아이템을 부위마다 하나씩 골라 실제 보유 상태로 만든다. */
    /* 자동장착이 켜져 있으면 보유시키는 순간 게임이 알아서 끼워 버려서 [장착] 버튼이 no-op 이 된다.
       버튼 자체를 검사하려면 꺼야 한다(끄는 것도 실제 게임 설정이다). */
    S.autoEquip = false;
    const pick = {};
    ['weapon', 'shield', 'amulet'].forEach(k => {
      const list = EQUIPS.filter(e => e.slot === k);
      /* 그 부위 아이템을 앞에서부터 몇 개 실제로 보유시키고, 슬롯은 첫 번째로 채워 둔다.
         그래야 격자에 고를 수 있는 칸이 여러 개 생기고 [장착] 이 실제로 값을 바꾼다. */
      list.slice(0, 4).forEach(e => { if (!S.own[e.id]) S.own[e.id] = { n: 0, l: 1 }; });
      S.eqSlot[k] = list[0] ? list[0].id : null;
      pick[k] = list.slice(0, 4).map(e => e.id);
    });
    save(); markDirty(); uiDirty = true; renderUI();
    return { pick, before: JSON.parse(JSON.stringify(S.eqSlot)) };
  });
  console.log('  · 시드: ' + JSON.stringify(seed));

  console.log('[기능 체크] 06 장비 화면 — 실제 클릭');
  await page.click('.tab[data-t="hero"]'); await page.waitForTimeout(500);

  for (const part of ['weapon', 'shield', 'amulet']) {
    const nm = { weapon: '무기', shield: '방패', amulet: '목걸이' }[part];
    /* 1) 슬롯을 실제로 눌러 05 아이템 팝업 진입 */
    await page.evaluate(() => { eqPageOn = true; syncEquipPage(); });
    await page.$eval(`#eqCards [data-eqslot="${part}"]`, el => el.click());
    await page.waitForTimeout(350);
    let opened = await page.evaluate(() => ({
      on: $('wpnw').classList.contains('on'), part: wpnPart,
      dbg: { panelOpen, curTab, heroTab, eqPageOn, eqwOn: $('eqw').classList.contains('on') },
    }));
    if (!opened.on) {                      /* 패널이 닫혀 있었으면 열고 한 번 더 */
      await page.evaluate(() => { curTab = 'hero'; heroTab = 'eq'; panelOpen = true; eqPageOn = true; syncPanel(); syncEquipPage(); renderUI(); });
      await page.waitForTimeout(300);
      await page.$eval(`#eqCards [data-eqslot="${part}"]`, el => el.click());
      await page.waitForTimeout(350);
      opened = await page.evaluate(() => ({
        on: $('wpnw').classList.contains('on'), part: wpnPart,
        dbg: { panelOpen, curTab, heroTab, eqPageOn, eqwOn: $('eqw').classList.contains('on') },
      }));
    }
    row(`06 «${nm}» 슬롯 클릭`, `#wpnw 가 ${nm} 부위로 열림`,
        `on=${opened.on} wpnPart=${opened.part} ${JSON.stringify(opened.dbg)}`, opened.on && opened.part === part);
    if (!opened.on) { console.log('  ! #wpnw 가 안 열려 이 부위는 이후 단계를 건너뛴다'); continue; }

    /* 2) 격자에서 보유 아이템을 실제로 골라 [장착] 버튼을 누른다 */
    /* 화면에 실제로 보이는 격자 칸 중 «지금 장착된 것이 아닌» 것을 고른다.
       (격자도 renderWpn() 이 innerHTML 을 갈아끼우므로 페이지 안에서 resolve+click 한다) */
    const cells = await page.$$eval('#wpnw [data-wpn]', els => els.map(e => e.dataset.wpn));
    const target = await page.evaluate(cs => cs.find(id => id !== S.eqSlot[wpnPart]) || null, cells);
    if (!target) { row(`05 격자 선택 (${nm})`, '장착 안 된 보유 아이템 1칸 이상', `격자=${JSON.stringify(cells)}`, false); continue; }
    const picked = await page.$eval(`#wpnw [data-wpn="${target}"]`, el => { el.click(); return true; }).catch(() => false);
    await page.waitForTimeout(300);
    const sel = await page.evaluate(() => (typeof wpnSel !== 'undefined' ? wpnSel : null));
    row(`05 격자에서 «${target}» 선택`, `wpnSel = ${target} (격자 ${cells.length}칸 중)`,
        `클릭=${picked} wpnSel=${sel}`, picked && sel === target);
    await page.waitForTimeout(150);
    const pre = await page.evaluate(() => ({
      slot: JSON.parse(JSON.stringify(S.eqSlot)), dmg: stat.dmg, hp: stat.maxHp,
      cp: cp(),
      btn: $('wpnBtnEq').innerText.trim(), off: $('wpnBtnEq').classList.contains('off'),
    }));
    await page.click('#wpnBtnEq', { force: true });
    await page.waitForTimeout(400);
    const post = await page.evaluate(() => ({
      slot: JSON.parse(JSON.stringify(S.eqSlot)), dmg: stat.dmg, hp: stat.maxHp, cp: cp(),
      saved: (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}').eqSlot || null; } catch (e) { return 'ERR'; } })(),
      btn: $('wpnBtnEq').innerText.trim(),
    }));
    row(`05 [장착] 버튼 (${nm})`, `S.eqSlot.${part}: ${pre.slot[part]} → ${target} · 버튼이 «장착 중» 으로`,
        `${pre.slot[part]} → ${post.slot[part]} · 버튼 «${pre.btn}»→«${post.btn}»`,
        post.slot[part] === target && pre.slot[part] !== target && post.btn.includes('장착 중'));
    row(`└ 저장(localStorage ${'KEY'})`, `eqSlot.${part} 가 세이브에 기록`,
        `saved.${part} = ${post.saved && post.saved[part]}`,
        !!post.saved && post.saved[part] === target);
    const statChanged = post.cp !== pre.cp;
    row(`└ 스탯·전투력 재계산`, '장착 즉시 cp() 가 바뀐다',
        `dmg ${Math.round(pre.dmg)}→${Math.round(post.dmg)} · maxHp ${Math.round(pre.hp)}→${Math.round(post.hp)} · cp ${pre.cp}→${post.cp}`,
        statChanged && Number.isFinite(post.cp));
    row(`└ 다른 부위 미간섭`, '나머지 2부위 값 유지',
        JSON.stringify(post.slot), ['weapon', 'shield', 'amulet'].filter(k => k !== part)
          .every(k => post.slot[k] === pre.slot[k]));

    /* 3) 06 으로 돌아왔을 때 슬롯이 장착 상태로 그려지는가 */
    await page.evaluate(() => { $('wpnw').classList.remove('on'); eqPageOn = true; syncEquipPage(); });
    await page.waitForTimeout(300);
    const back = await page.evaluate(p => {
      const el = document.querySelector(`#eqCards [data-eqslot="${p}"]`);
      return { empty: el.classList.contains('empty'), ic: (el.querySelector('.fi em') || {}).textContent || '',
               lv: (el.querySelector('u i') || {}).textContent || '', own: JSON.stringify(S.own[S.eqSlot[p]] || null) };
    }, part);
    row(`└ 06 «${nm}» 슬롯 표시`, '아이콘 + «Lv. n» 표시 · empty 해제',
        `empty=${back.empty} ic=${back.ic || '(없음)'} «${back.lv}» own=${back.own}`,
        !back.empty && !!back.ic && /Lv\./.test(back.lv));
  }

  /* 4) HUD 전투력이 장착 결과를 반영하는가 */
  const TXT = () => document.getElementById('top').innerText.replace(/\s+/g, ' ').slice(0, 80);
  const h1 = await page.evaluate(() => ({ cp: cp(), keep: S.eqSlot.weapon,
    t: document.getElementById('top').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
  await page.evaluate(() => { S.eqSlot.weapon = null; markDirty(); uiDirty = true; renderUI(); });
  await page.waitForTimeout(600);                     /* HUD 는 렌더 루프에서 갱신된다 */
  const h0 = await page.evaluate(() => ({ cp: cp(),
    t: document.getElementById('top').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
  const keepId = h1.keep;
  await page.evaluate(k => { S.eqSlot.weapon = k; markDirty(); uiDirty = true; renderUI(); }, keepId);
  await page.waitForTimeout(600);
  const hb = await page.evaluate(() => ({ cp: cp(),
    t: document.getElementById('top').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
  const hud = { p1: h1.cp, p0: h0.cp, back: hb.cp, t1: h1.t, t0: h0.t };
  row('HUD 전투력 반영', '무기를 빼면 cp() 와 상단 HUD 표기가 같이 내려간다',
      `cp ${hud.p1} → ${hud.p0} → (원복) ${hud.back} · HUD «${hud.t1}» → «${hud.t0}»`,
      hud.p0 < hud.p1 && hud.back === hud.p1 && hud.t0 !== hud.t1);

  /* 5) 서브탭이 실제로 다른 화면을 연다 */
  for (const [k, want] of [['pet', 'pet'], ['sk', 'sk']]) {
    await page.evaluate(() => { heroTab = 'eq'; S.heroTab = 'eq'; eqPageOn = true; syncPanel(); syncEquipPage(); renderUI(); });
    await page.waitForTimeout(250);
    await page.click(`#eqTabs [data-eqtab="${k}"]`, { force: true });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ heroTab, eqw: $('eqw').classList.contains('on'),
      body: [...document.querySelectorAll('#panel .body.on')].map(e => e.id) }));
    row(`06 서브탭 «${k === 'pet' ? '동료' : '스킬'}»`, `heroTab=${want} · 해당 시트 열림 · #eqw 닫힘`,
        `heroTab=${r.heroTab} body=${JSON.stringify(r.body)} eqw=${r.eqw}`,
        r.heroTab === want && !r.eqw && r.body.length > 0);
  }

  if (errs.length) { errs.forEach(e => fails.push('console: ' + e)); console.log('  X 콘솔 에러 ' + errs.length + '건'); }
  else console.log('  o 콘솔 에러 0건');

  console.log('\n| 버튼/동작 | 기대 | 실제 | |');
  console.log('|---|---|---|---|');
  rows.forEach(r => console.log('| ' + r.join(' | ') + ' |'));

  await ctx.close(); await browser.close();
  console.log(fails.length ? '\nFUNC FAIL (' + fails.length + ')' : '\nFUNC PASS');
  process.exit(fails.length ? 1 : 0);
})();
