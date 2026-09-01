#!/usr/bin/env node
/* 작업 723 재현기 — 「스킬 카드 보유 개수가 «3/3» 으로만 뜬다」(주인 보고 2026-09-02 04:00)
 *
 *   node tools/probe723.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 갈래 둘을 열어 뒀고, 그 둘은 처방이 완전히 다르다:
 *   ⓐ **표시만** 잘린다 — 저장값(`S.own[id].n`)은 실보유인데 그리는 자리에서 `Math.min` 이 눌렀다
 *      ⇒ 제품 수리는 그리는 줄 하나. 데이터 손실 0.
 *   ⓑ **저장 단계가 잘린다** — `save()`/`load()` 왕복에서 초과분이 소실된다
 *      ⇒ 「데이터 버그」 승격 · 719(합성 재료)·환급 계산 직결 · 세이브 이관 검토까지.
 *
 * 관측점 다섯 — 제품을 한 줄도 안 고치고 잰다:
 *   [1] 소스 — 07·26 격자와 05 장비 카드가 **같은 값을 다르게** 적는가(정규식으로 세 자리)
 *   [2] 화면 — 실보유 1002 · 요구 3 인 스킬 카드의 «n/m» 잉크와 게이지 폭
 *   [3] 저장 — `save()` → `load()` 왕복 뒤의 `frag(id)`(ⓐ/ⓑ 를 가르는 자리)
 *   [4] 대조 — 같은 상황의 **05 장비 카드**(주인이 «장비는 17/16 처럼 뜬다» 고 지목한 자리)
 *   [5] 26 펫 격자 — 07 과 같은 부품·같은 줄이므로 같이 잰다(스코프 판정 근거)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 카드 한 장에서 «보유/요구» 잉크와 게이지 폭을 읽는 한 벌 — 재현기와 자가 같은 눈을 쓴다 */
const READ_CARD = (sel) => {
  const c = document.querySelector(sel);
  if (!c) return null;
  const b = c.querySelector('.sk-bar b'), i = c.querySelector('.sk-bar i');
  const bar = c.querySelector('.sk-bar');
  /* ⚠ `<b>` 는 `inset:0` 전폭 상자다 — 그 bbox 로는 «잘렸는지» 를 영원히 못 잰다(늘 그릇과 같다).
     잉크는 `fitNum` 과 같은 눈(Range)으로 재야 한다. */
  let ink = -1;
  if (b) { const rg = document.createRange(); rg.selectNodeContents(b); ink = rg.getBoundingClientRect().width; }
  return {
    txt: b ? (b.textContent || '').trim() : '',
    w: i ? i.getBoundingClientRect().width : -1,
    barW: bar ? bar.getBoundingClientRect().width : -1,
    inkW: ink,
    fs: b ? getComputedStyle(b).fontSize : ''
  };
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  console.log('[1] 소스 — 같은 값을 세 자리가 다르게 적는가');
  const skLine = (code.match(/const need = fragNeed\(lv\), have = own \? ([^;]+);/) || [])[1];
  const clampCnt = (code.match(/have = own \? Math\.min\(frag\(it\.id\), need\) : 0/g) || []).length;
  const rawCnt   = (code.match(/have = own \? frag\(it\.id\) : 0/g) || []).length;
  ok(!!skLine, '1a 07·26 격자의 «보유» 식을 읽었다', skLine ? skLine.trim() : 'n/a');
  /* ⚠ 이 두 항은 «수리 전 ↔ 수리 후» 를 가르는 자리다 — 등재 시점(수리 전)에는 클램프 2 · 실보유 0
     이었고 그 값이 곧 등재문의 재현이다. 수리 후에는 뒤집혀야 한다. */
  ok(clampCnt === 0, '1b 요구치로 누르는 자리가 **0건**(수리 전 = 2건: 07·26)', 'n = ' + clampCnt);
  ok(rawCnt === 2, '1b2 실보유를 그대로 적는 자리가 **두 자리**(07 스킬 · 26 펫)', 'n = ' + rawCnt);
  const wpnLine = (code.match(/\$\('wpnBarT'\)\.innerHTML\s*=\s*([^;]+);/) || [])[1];
  ok(!!wpnLine, '1c 05 장비 카드의 같은 자리 식', wpnLine ? wpnLine.trim() : 'n/a');
  ok(!/Math\.min/.test(wpnLine || ''), '1d 05 장비는 **안 누른다**(대조군이 성립한다)',
     /Math\.min/.test(wpnLine || '') ? '누른다' : '누르지 않는다');
  /* ⓑ 를 소스에서 먼저 좁힌다 — 저장 단계에 `n` 을 자르는 자리가 있는가 */
  const saveClamp = /own\[[^\]]+\]\.n\s*=\s*Math\.min/.test(code)
                 || /\.n\s*=\s*Math\.min\(/.test(code);
  ok(true, '1e 저장 경로에 `n` 상한 클램프가 있는가(ⓑ 후보)', saveClamp ? '**있다**' : '없다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(600);

  /* 표본 — 주인 문면 그대로 «1002/3». Lv 1 이면 요구는 `FRAG_FIRST` 다.
     ⚠ `canLevel` 이 참이면 일괄 강화 레드닷이 뜨지만 표기와는 무관하다(카드 표기만 본다). */
  const setup = await page.evaluate(() => {
    const id = SKILLS[0].id, pid = PETS[0].id;
    S.own[id]  = { n: 1002, l: 1 };
    S.own[pid] = { n: 1002, l: 1 };
    save();
    goTab('hero'); heroSubGo('sk');
    return { id, pid, need: fragNeed(1), stored: frag(id), stored2: frag(pid) };
  });
  await page.waitForTimeout(400);

  console.log('\n[2] 화면 — 07 스킬 카드가 실보유를 적는가');
  console.log('     표본: ' + setup.id + ' n=1002 · Lv.1 · 요구 ' + setup.need);
  const sk = await page.evaluate(READ_CARD, '#bSk .sk-card[data-skit="' + setup.id + '"]');
  ok(!!sk, '2a 07 스킬 카드를 찾았다', sk ? 'txt = "' + sk.txt + '"' : 'n/a');
  const want = '1002/' + setup.need;
  ok(sk && sk.txt === want, '2b 잉크가 «실보유/요구» 다', '기대 "' + want + '" · 실측 "' + (sk ? sk.txt : 'n/a') + '"');
  ok(sk && sk.w > 0 && sk.w <= sk.barW + 0.5, '2c 게이지 바가 그릇 안에 있다(넘침 0)',
     sk ? sk.w.toFixed(2) + ' / ' + sk.barW.toFixed(2) : 'n/a');
  ok(sk && sk.inkW <= sk.barW + 0.5, '2d 잉크가 그릇 폭 안이다(자릿수 커져도 잘림 0 — 655 규약)',
     sk ? '잉크 ' + sk.inkW.toFixed(2) + ' ≤ 그릇 ' + sk.barW.toFixed(2) : 'n/a');

  console.log('\n[3] 저장 — 왕복해도 초과분이 남는가(ⓐ/ⓑ 를 가른다)');
  const rt = await page.evaluate((id) => {
    /* 363 교훈 — `reload` 로 재면 못 잰다(`beforeunload → save()` 가 되살린다). `load()` 를 직접 부른다. */
    save();
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const inStore = raw && raw.own && raw.own[id] ? raw.own[id].n : -1;
    load();
    return { inStore, afterLoad: frag(id) };
  }, setup.id);
  ok(rt.inStore === 1002, '3a `localStorage` 에 실보유 1002 가 그대로 있다', 'n = ' + rt.inStore);
  ok(rt.afterLoad === 1002, '3b `load()` 뒤에도 1002 다(저장 단계 클램프 없음)', 'n = ' + rt.afterLoad);
  const branch = (rt.inStore === 1002 && rt.afterLoad === 1002) ? 'ⓐ 표시만' : 'ⓑ 저장까지';
  console.log('     ⇒ 갈래 판정: **' + branch + '**');

  console.log('\n[4] 대조 — 05 장비 카드는 초과를 적는가(주인 지목 «장비는 17/16 처럼 뜬다»)');
  const wtxt = await page.evaluate(() => {
    const e = wpnList()[0];
    S.own[e.id] = { n: 1002, l: 1 };
    save();
    openWeapon(e.id);
    const t = document.getElementById('wpnBarT');
    return { id: e.id, txt: t ? (t.textContent || '').trim() : null,
             barW: parseFloat(document.getElementById('wpnBarF').style.width) };
  });
  ok(wtxt.txt === '1002/' + setup.need, '4a 05 장비는 실보유를 적는다(대조군)', '"' + wtxt.txt + '"');
  ok(wtxt.barW <= 100.001, '4b 05 장비 게이지 폭은 100% 로 가둬져 있다', wtxt.barW + '%');
  await page.evaluate(() => closeWeapon());

  console.log('\n[5] 26 펫 격자 — 같은 부품이므로 같이 잰다');
  await page.evaluate(() => { heroSubGo('pet'); });
  await page.waitForTimeout(400);
  const pt = await page.evaluate(READ_CARD, '#bPet .sk-card[data-ptit="' + setup.pid + '"]');
  ok(!!pt, '5a 26 펫 카드를 찾았다', pt ? 'txt = "' + pt.txt + '"' : 'n/a');
  ok(pt && pt.txt === want, '5b 잉크가 «실보유/요구» 다', '기대 "' + want + '" · 실측 "' + (pt ? pt.txt : 'n/a') + '"');

  console.log('\n[6] 자릿수 — 아주 큰 보유에서도 잘리지 않는가(655 규약)');
  await page.evaluate((id) => {
    S.own[id] = { n: 1234567890, l: 1 };
    save(); heroSubGo('sk'); uiDirty = true; renderUI();
  }, setup.id);
  await page.waitForTimeout(400);
  const big = await page.evaluate(READ_CARD, '#bSk .sk-card[data-skit="' + setup.id + '"]');
  ok(big && big.txt === '1234567890/' + setup.need, '6a 잉크가 실보유를 통째로 적는다(한 글자도 안 버린다)',
     big ? '"' + big.txt + '"' : 'n/a');
  ok(big && big.inkW <= big.barW + 0.5, '6b 잉크가 그릇 폭 안이다(잘림 0)',
     big ? '잉크 ' + big.inkW.toFixed(2) + ' ≤ 그릇 ' + big.barW.toFixed(2) + ' · fs ' + big.fs : 'n/a');
  ok(big && big.w <= big.barW + 0.5, '6c 게이지 폭이 그릇을 안 넘는다(요구 기준 가득)',
     big ? big.w.toFixed(2) + ' / ' + big.barW.toFixed(2) : 'n/a');
  ok(big && big.fs === '21px', '6d 아직 안 넘치므로 인라인 fs 를 안 남긴다(150 규약)', big ? big.fs : 'n/a');

  /* 그릇을 실제로 넘는 자리 — `skBarFit` 가 일하는지, 그리고 그래도 글자를 안 버리는지 */
  await page.evaluate((id) => {
    S.own[id] = { n: 1234567890123, l: 1 };
    save(); uiDirty = true; renderUI();
  }, setup.id);
  await page.waitForTimeout(400);
  const huge = await page.evaluate(READ_CARD, '#bSk .sk-card[data-skit="' + setup.id + '"]');
  ok(huge && huge.txt === '1234567890123/' + setup.need, '6e 15자에서도 한 글자도 안 버린다',
     huge ? '"' + huge.txt + '"' : 'n/a');
  ok(huge && huge.inkW <= huge.barW + 0.5, '6f 그래도 잉크가 그릇 안이다(잘림 0)',
     huge ? '잉크 ' + huge.inkW.toFixed(2) + ' ≤ 그릇 ' + huge.barW.toFixed(2) + ' · fs ' + huge.fs : 'n/a');
  ok(huge && huge.fs !== '21px', '6g 넘칠 때만 fs 를 눌렀다', huge ? huge.fs : 'n/a');

  ok(errs.length === 0, '9a 콘솔 에러 0', errs.length ? errs.slice(0, 3).join(' / ') : '0건');

  await browser.close();
  console.log('\nprobe723: ' + pass + '/' + (pass + fail) + (fail ? '  **FAIL**' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
