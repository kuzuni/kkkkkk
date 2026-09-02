#!/usr/bin/env node
/* 게이트 613 — 「단련석을 **직접 지불**해 단련한다 — «포인트» 중간 개념 폐지」
 * (주인 지시 2026-09-01 01:10 «단련석을 포인트로 바꿔서 강화가 아니라 걍 단련석으로 단련가능하게 해라»
 *  + 보강 01:12 «단련석 포인트 보여주는 부분 없애고 그부분에 현재 단련석 개수나 보여주게하셈»)
 *
 *   node tools/verify613.js
 *
 * 절 구성 — 큰 붓(장부·홀드·탑 순환)은 verify210 이 이관해 갖고 있다. 이 자는 613 고유 축만 잡는다:
 *   §1 직접 지불 — [단련] 1회가 단련석을 비용만큼 **직접** 뺀다(중간 재화 0) · 부족하면 막힌다
 *   §2 표시     — 헤더 = «현재 단련석 개수»(아이콘 + 숫자) · «포인트»·«pt» 라는 말이 화면에 없다 ·
 *                비용 열·버튼이 단련석 아이콘으로 화폐를 말한다(125)
 *   §3 세이브 이관 — 구 세이브의 pts 잔액이 **실로드**에서 단련석으로 1:1 환급 · pts 필드는 죽는다 ·
 *                KEY 는 안 올랐다(«구 전환비 1:1 = 값 손실 0» 이 그 근거)
 *   §4 죽은 코드 — 전환 계열(temperCharge/temperPts/TEMPER_PT_COST/data-tpchg)이 선언째 없다
 *   §R 되돌림   — 옛 «포인트 헤더» 를 주입하면 §2 의 식이 빨개진다(자가 공허하지 않다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const KEY = (CODE.match(/const KEY = '([^']+)'/) || [])[1];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  if (seed) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, seed]);
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.step = () => {}; openTrain(); setTrSub('temper'); renderTrain(); });
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  const h = await open(browser, null);
  const p = h.page;

  console.log('=== §1 직접 지불 ===');
  const pay = await p.evaluate(() => {
    S.tstone = 10; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } }; renderTrain();
    const c0 = temperCost('atk');
    const up1 = temperUp('atk');
    const after1 = { st: Math.floor(S.tstone), lv: temperLv('atk') };
    /* 구간을 넘긴 비용에서도 직접 지불이다 — Lv100 축은 3개를 뺀다 */
    S.tstone = 3; S.temper = { alloc: { atk: 100, hp: 0, regen: 0 } }; renderTrain();
    const c3 = temperCost('atk');
    const up2 = temperUp('atk');
    const after2 = { st: Math.floor(S.tstone), lv: temperLv('atk') };
    /* 부족이면 실제로 막힌다 — 잔액이 1도 안 움직인다 */
    S.tstone = 2; S.temper = { alloc: { atk: 100, hp: 0, regen: 0 } };
    const blocked = temperUp('atk') === false && Math.floor(S.tstone) === 2 && temperLv('atk') === 100;
    return { c0, up1, after1, c3, up2, after2, blocked };
  });
  ok(pay.c0 === 1 && pay.up1 && pay.after1.st === 9 && pay.after1.lv === 1,
    '[1-a] ★ 단련 1회 = 단련석 −비용 · Lv +1 (중간 재화 없음)', JSON.stringify(pay.after1));
  ok(pay.c3 === 3 && pay.up2 && pay.after2.st === 0 && pay.after2.lv === 101,
    '[1-b] 구간 비용(3)도 단련석에서 직접 나간다', JSON.stringify(pay.after2));
  ok(pay.blocked, '[1-c] 비용보다 적으면 막히고 잔액이 1도 안 움직인다');

  console.log('\n=== §2 표시 — 헤더 = 현재 단련석 개수(주인 보강 원문) ===');
  const disp = await p.evaluate(() => {
    S.tstone = 1234567; S.temper = { alloc: { atk: 150, hp: 0, regen: 0 } }; renderTrain();
    const w = document.getElementById('trTemper');
    const pv = w.querySelector('.tp-hd .pv i');
    const row = w.querySelector('.tr-tp[data-temper="atk"]');
    return {
      pvHtml: pv ? pv.innerHTML : '', pvTxt: pv ? pv.textContent : '',
      allTxt: w.textContent,
      /* 686 이관 — 비용 열(.tc)이 주인 지시로 사라졌다. 613 이 지키던 «화폐 자리는 아이콘으로
         말한다»(125)는 안 죽는다 — 남은 자리가 버튼 하나이므로 그쪽만 본다. `tcGone` 은
         되살아나면 빨개지는 짝이다(333 처방 — 항을 지우지 않고 방향을 뒤집는다). */
      tcGone: !row.querySelector('.tc'),
      tbIc: /cur-tstone\.svg/.test(row.querySelector('.tb i').innerHTML),
      hdKids: w.querySelectorAll('.tp-hd > *').length
    };
  });
  /* ⚑ 688 이관(2026-09-02, 주인 지시 «단련석이라고 한글로 표시 하지말기») — 333 처방대로
     **자리를 비우지 않고 방향만 뒤집었다**. 613 의 뜻(«아이콘 + 지금 보유 개수»)은 한 글자도
     안 죽는다: 아이콘 항·수 항은 그대로고, 라벨 항만 «있어야 한다» → «수(콤마)뿐이어야 한다»
     로 바뀌었다. 라벨이 되살아나면 이 항이 다시 빨개진다(옛 문구를 지키는 짝은 §R 이 겸한다). */
  ok(/cur-tstone\.svg/.test(disp.pvHtml) && /1,?234,?567/.test(disp.pvTxt)
     && /^[\d,]+$/.test(disp.pvTxt.trim()),
    '[2-a] ★ 헤더가 «(아이콘) 1,234,567» — 아이콘 + 현재 보유 개수뿐(688 — 한글 재화명 0자)',
    disp.pvTxt.trim());
  ok(!/포인트/.test(disp.allTxt) && !/\bpt\b/.test(disp.allTxt),
    '[2-b] ★ «포인트»·«pt» 라는 말이 단련 탭 어디에도 없다');
  ok(disp.tbIc, '[2-c] 버튼이 단련석 아이콘으로 화폐를 말한다(125 · 686 이후 유일한 자리)');
  ok(disp.tcGone, '[2-c2] 686 — 비용 열(.tc)은 없다(주인 지시 · 되살아나면 빨강)');
  ok(disp.hdKids === 1, '[2-d] 헤더 자식은 보유 줄 하나 — [충전] 버튼 자리가 비어 있다', disp.hdKids + '개');

  console.log('\n=== §3 세이브 이관 — 구 pts 잔액 → 단련석 1:1 (실로드) ===');
  await h.ctx.close();
  const seed = JSON.stringify({ tstone: 7, temper: { pts: 246, alloc: { atk: 3, hp: 0, regen: 0 } },
                                gold: 5, time: Date.now() });
  const h2 = await open(browser, seed);
  const mig = await h2.page.evaluate(() => ({
    st: Math.floor(S.tstone), lv: temperLv('atk'), hasPts: 'pts' in (S.temper || {}),
    /* save() 가 pts 를 되살리지 않는가 — 한 바퀴 돌려 저장분을 직접 읽는다 */
    saved: (function () { save(); const d = JSON.parse(localStorage.getItem(KEY));
                          return { st: d.tstone, t: JSON.stringify(d.temper) }; })()
  }));
  ok(mig.st === 253 && mig.lv === 3, '[3-a] ★ 실로드에서 pts 246 이 단련석으로 1:1 환급(7+246=253) · 레벨 보존',
    mig.st + ' / Lv' + mig.lv);
  ok(!mig.hasPts && mig.saved.t === '{"alloc":{"atk":3,"hp":0,"regen":0}}',
    '[3-b] pts 필드는 죽었고 저장 한 바퀴 뒤에도 안 되살아난다(402 죽은 필드 정리)', mig.saved.t);
  ok(mig.saved.st === 253, '[3-c] 환급분이 저장에도 남는다', String(mig.saved.st));
  const keySame = !/KEY = '[^']*613/.test(CODE);
  ok(keySame, '[3-d] KEY 는 안 올랐다 — 1:1 환급이라 값 손실 0 이 그 근거(LESSONS 44-② 반대 방향 방지)');

  console.log('\n=== §4 죽은 코드 — 전환 계열 선언째 부재 ===');
  const dead = await h2.page.evaluate(() => ({
    charge: typeof temperCharge, pts: typeof temperPts, cost: typeof TEMPER_PT_COST,
    chargeBtn: typeof temperChargeBtn, hold: typeof rtChargeHold,
    node: document.querySelectorAll('[data-tpchg]').length
  }));
  ok(dead.charge === 'undefined' && dead.pts === 'undefined' && dead.cost === 'undefined'
     && dead.chargeBtn === 'undefined' && dead.hold === 'undefined' && dead.node === 0,
    '[4-a] temperCharge/temperPts/TEMPER_PT_COST/temperChargeBtn/rtChargeHold/data-tpchg 전부 부재',
    JSON.stringify(dead));

  console.log('\n=== §R 되돌림 — 옛 «포인트 헤더» 를 주입하면 §2 식이 빨개진다 ===');
  const rev = await h2.page.evaluate(() => {
    S.tstone = 40; renderTrain();
    const pv = document.querySelector('#trTemper .tp-hd .pv i');
    const orig = pv.innerHTML;
    pv.innerHTML = '단련 포인트 <b>500</b>';                 /* 613 이전의 그 라벨 */
    const w = document.getElementById('trTemper');
    const red = /포인트/.test(w.textContent);
    pv.innerHTML = orig;
    const green = !/포인트/.test(w.textContent);
    return { red, green };
  });
  ok(rev.red, '[R-a] 옛 라벨을 주입하면 «포인트 0건» 식이 실제로 빨개진다(자가 공허하지 않다)');
  ok(rev.green, '[R-b] 원복하면 다시 초록 — 사본이 트리를 안 더럽혔다');

  ok(h2.errs.length === 0, '[Z] 콘솔 에러 0건', h2.errs.slice(0, 3).join(' / '));
  await browser.close();
  console.log('\nverify613: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
