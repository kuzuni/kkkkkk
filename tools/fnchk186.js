#!/usr/bin/env node
/* 186 기능 체크 — «만들어 놓음» 이 아니라 «눌렀을 때 무엇이 바뀌는가»
 * (기능 완성 규칙 2026-08-25, 저장소 주인 지시 — T2 작업의 완료 조건).
 *
 *   node tools/fnchk186.js
 *
 * 05 장비 팝업이 8등급을 «미리» 보여주게 바뀐 뒤, 그 화면의 버튼·칸을 실제로 눌러
 * 결과가 게임 데이터(S)·HUD·다른 화면에 반영되는지 헤드리스로 확인하고 표로 남긴다.
 * 결과 표는 `docs/review/186-장비팝업8등급노출.md` 에 그대로 붙는다.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const rows = [];
let pass = 0, fail = 0;
const ok = (b, act, want, got) => {
  rows.push('| ' + rows.length + ' | ' + act + ' | ' + want + ' | ' + got + ' | ' + (b ? '✔' : '✘') + ' |');
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openWeapon === 'function');
  await page.waitForTimeout(800);

  /* 1 — 정식 진입점(06 장비 시트의 무기 슬롯)으로 연다. 팝업이 8등급 40칸을 담고 있어야 한다. */
  const f1 = await page.evaluate(() => {
    gmHero('eq');
    const slot = document.querySelector('#eqCards [data-eqslot="weapon"]');
    slot.click();
    const on = document.getElementById('wpnw').classList.contains('on');
    const cells = document.getElementById('wpnGrid').children.length;
    return { on, cells };
  });
  ok(f1.on && f1.cells === 40, '06 장비 시트 → 무기 슬롯 클릭',
    '05 팝업 열림 · 8등급 × 5칸 = 40칸', 'on=' + f1.on + ' 칸=' + f1.cells);

  /* 2 — 열자마자 «상위 4등급» 이 실제로 격자 안에 있는가(옛 2페이지 감금분). */
  const f2 = await page.evaluate(() => {
    const g = document.getElementById('wpnGrid');
    const rows = new Set([...g.children].map(c => Math.round((c.offsetTop - 32) / 190)));
    const upper = [4, 5, 6, 7].filter(r => rows.has(r));
    const last = g.children[g.children.length - 1];
    return { upper: upper.join(','), bottom: last.offsetTop + last.offsetHeight, scrollH: g.scrollHeight };
  });
  ok(f2.upper === '4,5,6,7' && f2.scrollH >= f2.bottom, '팝업을 열기만 한 상태',
    '전설·신화·초월·불멸 4행이 같은 격자 안(스크롤로 닿음)',
    '상위행=' + f2.upper + ' 마지막칸 bottom=' + f2.bottom + ' scrollH=' + f2.scrollH);

  /* 3 — 미해금 등급 잠금 칸이 «언제 열리는지» 를 말한다. */
  const f3 = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = 1;
    openWeapon(null, 'weapon');
    const t = [...document.querySelectorAll('#wpnGrid .ulk')].map(u => u.textContent.trim());
    const uniq = [...new Set(t)];
    S.sum.weapon.lv = o;
    return { n: t.length, uniq: uniq.join(' ') };
  });
  ok(f3.n === 30 && f3.uniq === '소환 Lv.5 소환 Lv.15 소환 Lv.30 소환 Lv.40 소환 Lv.55 소환 Lv.75',
    '소환 Lv 1 상태로 팝업을 봄', '미해금 6등급 × 5칸 = 30칸에 해금 레벨 표기',
    f3.n + '칸 · ' + f3.uniq);

  /* 4 — 소환 레벨이 올라가면 그 등급 안내가 사라진다(살아 있는 데이터를 읽는가). */
  const f4 = await page.evaluate(() => {
    const o = S.sum.weapon.lv;
    S.sum.weapon.lv = 30; openWeapon(null, 'weapon');
    const a = [...new Set([...document.querySelectorAll('#wpnGrid .ulk')].map(u => u.textContent.trim()))];
    S.sum.weapon.lv = o;
    return a.join(' ');
  });
  ok(f4 === '소환 Lv.40 소환 Lv.55 소환 Lv.75', '소환 Lv 를 30 으로 올린 뒤 다시 봄',
    '희귀·영웅·전설 안내는 사라지고 신화·초월·불멸만 남음', f4 || '(0건)');

  /* 5 — 잠금 칸 클릭은 아무 일도 하지 않는다(선택이 튀면 안 된다). */
  const f5 = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = 1;
    openWeapon(null, 'weapon');
    const before = document.getElementById('wpnName').textContent.trim();
    const lk = document.querySelector('#wpnGrid .wgc.lk');
    lk.click();
    const after = document.getElementById('wpnName').textContent.trim();
    S.sum.weapon.lv = o;
    return { before, after };
  });
  ok(f5.before === f5.after, '잠금(미보유) 칸 클릭', '선택이 바뀌지 않음',
    '"' + f5.before + '" → "' + f5.after + '"');

  /* 6 — 옛 2페이지에 있던 불멸 칸을 «스크롤만으로» 눌러 선택한다. */
  const f6 = await page.evaluate(() => {
    const g7 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 7);
    S.own[g7.id] = { n: 1, l: 1 };
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const cell = g.querySelector('[data-wpn="' + g7.id + '"]');
    g.scrollTop = cell.offsetTop - 100;
    cell.click();
    return { want: g7.n, nm: document.getElementById('wpnName').textContent.trim(),
             gd: document.getElementById('wpnGrade').textContent.trim() };
  });
  ok(f6.nm === f6.want && f6.gd === '불멸', '스크롤 → 불멸 칸 클릭',
    '상단 정보가 그 무기로 전환', '이름=' + f6.nm + ' 등급=' + f6.gd);

  /* 7 — [장착] → S 반영 · 칸에 «장착 중» · 전투력(HUD) 갱신.
     ⚠ HUD 의 `#cpN` 은 60(쥬시) 이후 `jzRollVal('cp', …)` 로 **표시값이 목표를 향해 굴러간다** —
     장착 직후 한 프레임만 보면 옛 숫자가 그대로다. 게임 값 `cp()` 로 판정하고, 표시값은
     롤링이 끝난 뒤 따라오는지 따로 본다(그게 «HUD 에 반영됨» 의 정확한 뜻이다). */
  const f7a = await page.evaluate(() => {
    const g7 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 7);
    S.eqSlot.weapon = 'weapon0';
    openWeapon(null, 'weapon'); renderUI();
    const cp0 = cp();
    document.querySelector('#wpnGrid [data-wpn="' + g7.id + '"]').click();
    document.getElementById('wpnBtnEq').onclick();
    renderUI();
    return { eq: S.eqSlot.weapon, want: g7.id, cp0, cp1: cp(),
             tag: !!document.querySelector('#wpnGrid [data-wpn="' + g7.id + '"] .eqt') };
  });
  await page.waitForTimeout(1200);                       /* 60 롤링이 목표에 닿을 시간 */
  const f7b = await page.evaluate(() => ({ hud: document.getElementById('cpN').textContent, cp: fmt(cp()) }));
  ok(f7a.eq === f7a.want && f7a.tag && f7a.cp1 > f7a.cp0 && f7b.hud === f7b.cp, '[장착] 버튼',
    'S.eqSlot.weapon 교체 · 칸에 «장착 중» · 전투력 상승이 HUD 까지 도달',
    'eqSlot=' + f7a.eq + ' 라벨=' + f7a.tag + ' cp ' + f7a.cp0 + '→' + f7a.cp1
    + ' · HUD ' + f7b.hud + ' (기대 ' + f7b.cp + ')');

  /* 8 — [일괄 강화] → 조각 소모 · 레벨 상승이 8등급 전 범위에 걸린다 */
  const f8 = await page.evaluate(() => {
    const l = EQUIPS.filter(e => e.slot === 'weapon');
    l.forEach(e => { S.own[e.id] = { n: 9999, l: 1 }; });
    openWeapon(null, 'weapon');
    const lv0 = l.map(e => oLv(e.id));
    document.getElementById('wpnBtnUp').onclick();
    const lv1 = l.map(e => oLv(e.id));
    const up = lv1.filter((v, i) => v > lv0[i]).length;
    const upHi = lv1.slice(4).filter((v, i) => v > lv0[4 + i]).length;   /* 전설~불멸 */
    const m = document.querySelector('#upaw.on, .modal.on');
    if (m) m.classList.remove('on');
    return { up, upHi, n: l.length };
  });
  ok(f8.up > 0 && f8.upHi > 0, '[일괄 강화] 버튼',
    '조각이 있는 장비 레벨 상승 — 상위 4등급(전설~불멸)도 포함',
    '오른 종수=' + f8.up + '/' + f8.n + ' (그중 상위등급 ' + f8.upHi + '종)');

  /* 9 — 부위를 바꿔도 같은 8행(방패·목걸이) */
  const f9 = await page.evaluate(() => {
    const r = {};
    for (const p of ['shield', 'amulet']) {
      openWeapon(null, p);
      const g = document.getElementById('wpnGrid');
      r[p] = g.children.length + '칸/' + new Set([...g.children].map(c => Math.round((c.offsetTop - 32) / 190))).size + '행';
    }
    closeWeapon();
    return r;
  });
  ok(f9.shield === '40칸/8행' && f9.amulet === '40칸/8행', '부위 전환(방패 · 목걸이)',
    '세 부위 모두 40칸 / 8행', '방패 ' + f9.shield + ' · 목걸이 ' + f9.amulet);

  /* 10 — 저장 → 재로드 후에도 그대로 (세이브 구조는 안 건드렸다) */
  await page.evaluate(() => { save(); });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openWeapon === 'function');
  await page.waitForTimeout(700);
  const f10 = await page.evaluate(() => {
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const r = { cells: g.children.length, eq: S.eqSlot.weapon,
                arrows: document.querySelectorAll('#wpnw .wm-ar').length };
    closeWeapon();
    return r;
  });
  ok(f10.cells === 40 && f10.arrows === 0, '저장 → 재로드',
    '40칸 유지 · 화살표 0개 · 장착 유지',
    '칸=' + f10.cells + ' 화살표=' + f10.arrows + ' 장착=' + f10.eq);

  ok(errs.length === 0, '전 과정 콘솔', '에러 0건', errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 80) : ''));

  await browser.close();
  console.log('| # | 누른 것 | 기대 | 실측 | 판정 |');
  console.log('|---|---|---|---|---|');
  rows.forEach(r => console.log(r));
  console.log('\nFNCHK186 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
