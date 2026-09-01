#!/usr/bin/env node
/* 작업 723 게이트 — 「스킬·펫 카드의 «보유/요구» 는 **실보유**를 적는다」
 *
 *   node tools/verify723.js
 *
 * 지킬 것(등재문 게이트 문면 그대로):
 *   [A] 보유 > 요구 상태에서 **표기 = 실보유**            (07 스킬 · 26 펫)
 *   [B] 게이지 «폭» 은 요구 기준으로 가득                  (그릇을 안 넘는다)
 *   [C] 05 장비 카드와 **같은 규약**                       (같은 상황 · 같은 문자열)
 *   [D] 자릿수가 자라도 **잘림 0**                          (150 «한 글자도 안 버리고 폭에만 맞춘다»)
 *   [E] 보유 ≤ 요구 인 평범한 자리는 종전과 **한 글자도 안 달라진다**(회귀)
 *   [R] 되돌림 — 옛 `Math.min(frag, need)` 사본에서는 [A] 가 실제로 빨개진다
 *
 * ⚑ 왜 [R] 이 있는가 — [A] 는 «클램프가 없으면 그냥 참» 이라 무르게 잡기 쉽다.
 *   되돌린 사본이 빨개지는 것을 같이 못박아야 이 자가 «실보유를 적는다» 를 정말로 묻는 자가 된다.
 * ⚠ 잉크 폭은 `<b>`(inset:0 전폭 상자)의 bbox 로 재면 **영원히 그릇과 같다** — Range 로 잰다
 *   (`fitNum` 이 쓰는 눈과 같은 눈. probe723 §2 에 같은 함정이 적혀 있다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

const READ = (sel) => {
  const c = document.querySelector(sel);
  if (!c) return null;
  const b = c.querySelector('.sk-bar>b'), i = c.querySelector('.sk-bar>i'), bar = c.querySelector('.sk-bar');
  const rg = document.createRange(); rg.selectNodeContents(b);
  return {
    txt: (b.textContent || '').trim(),
    ink: rg.getBoundingClientRect().width,
    fill: i.getBoundingClientRect().width,
    box: bar.getBoundingClientRect().width,
    fs: getComputedStyle(b).fontSize
  };
};

/* 표본 한 벌 — 07·26 의 첫 칸에 «요구보다 훨씬 많은» 보유를 심는다 */
const SEED = (n) => {
  const sid = SKILLS[0].id, pid = PETS[0].id;
  S.own[sid] = { n, l: 1 };
  S.own[pid] = { n, l: 1 };
  save();
  goTab('hero'); heroSubGo('sk');
  uiDirty = true; renderUI();
  return { sid, pid, need: fragNeed(1) };
};

async function boot(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(600);
  return { ctx, page, errs };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  console.log('[S] 선언 — 소스에 «요구치로 누르는» 자리가 남아 있지 않다');
  ok(!/have = own \? Math\.min\(frag\(it\.id\), need\) : 0/.test(code),
     'S1 07·26 격자에 옛 클램프가 0건');
  ok((code.match(/have = own \? frag\(it\.id\) : 0/g) || []).length === 2,
     'S2 실보유를 그대로 읽는 자리가 정확히 두 곳(07 스킬 · 26 펫)');
  ok((code.match(/width:' \+ Math\.min\(100, have\/need\*100\)/g) || []).length === 2,
     'S3 게이지 «폭» 만 100 으로 가둔 자리가 두 곳 — 05 `wpnBarF` 와 같은 식');
  ok(/function skBarFit\(root\)/.test(code) && (code.match(/skBarFit\(/g) || []).length >= 3,
     'S4 잉크 폭 클램프(`skBarFit`)가 선언 1 + 호출 2(07·26)');

  const { ctx, page, errs } = await boot(browser, URL);
  const st = await page.evaluate(SEED, 1002);
  await page.waitForTimeout(400);
  const want = '1002/' + st.need;

  console.log('\n[A] 표기 = 실보유');
  const sk = await page.evaluate(READ, '#bSk .sk-card[data-skit="' + st.sid + '"]');
  ok(sk && sk.txt === want, 'A1 07 스킬 카드가 «' + want + '» 를 적는다', sk ? '"' + sk.txt + '"' : 'n/a');
  await page.evaluate(() => { heroSubGo('pet'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(400);
  const pt = await page.evaluate(READ, '#bPet .sk-card[data-ptit="' + st.pid + '"]');
  ok(pt && pt.txt === want, 'A2 26 펫 카드가 «' + want + '» 를 적는다', pt ? '"' + pt.txt + '"' : 'n/a');

  console.log('\n[B] 게이지 폭 = 요구 기준 가득(그릇 안)');
  ok(sk && sk.fill > 0 && sk.fill <= sk.box + 0.5, 'B1 07 채움이 그릇을 안 넘는다',
     sk ? sk.fill.toFixed(2) + ' / ' + sk.box.toFixed(2) : 'n/a');
  ok(sk && sk.fill >= sk.box - 0.5, 'B2 07 채움이 **가득**이다(초과 보유 = 다음 강화분 충족)',
     sk ? sk.fill.toFixed(2) + ' / ' + sk.box.toFixed(2) : 'n/a');
  ok(pt && pt.fill >= pt.box - 0.5 && pt.fill <= pt.box + 0.5, 'B3 26 채움도 같다',
     pt ? pt.fill.toFixed(2) + ' / ' + pt.box.toFixed(2) : 'n/a');

  console.log('\n[C] 05 장비 카드와 같은 규약');
  const w = await page.evaluate(() => {
    const e = wpnList()[0];
    S.own[e.id] = { n: 1002, l: 1 };
    save(); openWeapon(e.id);
    const r = { txt: (document.getElementById('wpnBarT').textContent || '').trim(),
                fill: parseFloat(document.getElementById('wpnBarF').style.width) };
    closeWeapon();
    return r;
  });
  ok(w.txt === want, 'C1 같은 상황의 05 장비도 «' + want + '» — 문자열이 한 글자도 안 다르다', '"' + w.txt + '"');
  ok(w.fill <= 100.001, 'C2 05 장비 게이지도 100% 로 가둬져 있다(같은 식)', w.fill + '%');

  console.log('\n[D] 자릿수 — 잘림 0(150 규약)');
  await page.evaluate(() => { heroSubGo('sk'); });
  for (const n of [1002, 1234567890, 1234567890123, 12345678901234567]) {
    await page.evaluate((v) => {
      S.own[SKILLS[0].id] = { n: v, l: 1 }; save(); uiDirty = true; renderUI();
    }, n);
    await page.waitForTimeout(300);
    const r = await page.evaluate(READ, '#bSk .sk-card[data-skit="' + st.sid + '"]');
    ok(r && r.txt === String(n) + '/' + st.need, 'D-' + String(n).length + 'a 한 글자도 안 버린다',
       r ? '"' + r.txt + '"' : 'n/a');
    ok(r && r.ink <= r.box + 0.5, 'D-' + String(n).length + 'b 잉크가 그릇 안이다',
       r ? r.ink.toFixed(2) + ' ≤ ' + r.box.toFixed(2) + ' · fs ' + r.fs : 'n/a');
  }
  /* 짧은 값에는 인라인 fs 를 남기지 않는다 — 104·141 같은 기존 잉크 자가 원본 CSS 를 읽어야 한다 */
  await page.evaluate(() => { S.own[SKILLS[0].id] = { n: 1, l: 1 }; save(); uiDirty = true; renderUI(); });
  await page.waitForTimeout(300);
  const shortR = await page.evaluate(READ, '#bSk .sk-card[data-skit="' + st.sid + '"]');
  ok(shortR && shortR.fs === '21px', 'D0 짧은 값에는 인라인 fs 를 안 남긴다', shortR ? shortR.fs : 'n/a');

  console.log('\n[E] 회귀 — 보유 ≤ 요구 인 평범한 자리는 종전 그대로');
  const nrm = await page.evaluate((sid) => {
    S.own[sid] = { n: 1, l: 1 }; save(); uiDirty = true; renderUI();
    const c = document.querySelector('#bSk .sk-card[data-skit="' + sid + '"]');
    const i = c.querySelector('.sk-bar>i'), bar = c.querySelector('.sk-bar');
    return { txt: (c.querySelector('.sk-bar>b').textContent || '').trim(),
             ratio: i.getBoundingClientRect().width / bar.getBoundingClientRect().width };
  }, st.sid);
  ok(nrm.txt === '1/' + st.need, 'E1 «1/' + st.need + '» 그대로', '"' + nrm.txt + '"');
  ok(Math.abs(nrm.ratio - 1 / st.need) < 0.02, 'E2 채움도 종전 비율(have/need) 그대로',
     nrm.ratio.toFixed(3) + ' ≈ ' + (1 / st.need).toFixed(3));
  ok(errs.length === 0, 'E3 콘솔 에러 0', errs.slice(0, 3).join(' | ') || '없음');
  await ctx.close();

  console.log('\n[R] 되돌림 — 옛 클램프를 되살린 사본은 [A] 가 빨개진다');
  {
    const rev = code.split('const need = fragNeed(lv), have = own ? frag(it.id) : 0;')
                    .join('const need = fragNeed(lv), have = own ? Math.min(frag(it.id), need) : 0;');
    ok(rev !== code, 'R0 되돌림 사본을 만들었다(실보유 → 옛 `Math.min(frag, need)`)');
    const tmp = path.resolve(__dirname, '../.rev723.html');
    fs.writeFileSync(tmp, rev);
    try {
      const r = await boot(browser, 'file://' + tmp);
      const st2 = await r.page.evaluate(SEED, 1002);
      await r.page.waitForTimeout(400);
      const bad = await r.page.evaluate(READ, '#bSk .sk-card[data-skit="' + st2.sid + '"]');
      ok(bad && bad.txt === st2.need + '/' + st2.need,
         'R1 ★ 되돌린 사본은 «' + st2.need + '/' + st2.need + '» 로 눌러 적는다 = [A1] 이 빨개진다',
         bad ? '"' + bad.txt + '"' : 'n/a');
      ok(bad && bad.txt !== want, 'R2 그 값은 실보유가 아니다', bad ? '"' + bad.txt + '" ≠ "' + want + '"' : 'n/a');
      await r.ctx.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

    /* 무르게 잡아 통과한 게 아님 — 같은 자로 원본이 다시 초록이어야 한다 */
    const r2 = await boot(browser, URL);
    const st3 = await r2.page.evaluate(SEED, 1002);
    await r2.page.waitForTimeout(400);
    const good = await r2.page.evaluate(READ, '#bSk .sk-card[data-skit="' + st3.sid + '"]');
    ok(good && good.txt === want, 'R3 원본은 같은 자로 다시 초록', good ? '"' + good.txt + '"' : 'n/a');
    await r2.ctx.close();
  }

  await browser.close();
  console.log('\nverify723: ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
