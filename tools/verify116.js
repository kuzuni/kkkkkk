#!/usr/bin/env node
/* 116 검증 — 13 재화 상점의 다이아 상품 5종 + 마일리지 교환 다이아가 전부 «÷2» 인가
 *
 *   node tools/verify116.js
 *
 * 지시서(PROGRESS 116 «검증 [3]-(가)») 가 요구한 항목 그대로. [3]-(가) 기계적 작업이므로 비평가는 띄우지 않는다.
 *   [A] 상수 — `DIA_PACKS.map(p=>p.dia)` = 5,000 / 35,000 / 75,000 / 450,000 / 1,000,000 · `MILE_DIA` = 2,500,000
 *       옛 값(10000·70000·150000·900000·2000000·5000000)·옛 라벨(«×1만»류) 소스 스캔 부재
 *   [B] 라벨 — 카드 수량 문자열이 111 알파벳 단위 규약(«×5.00A · ×35.0A · ×75.0A · ×450A · ×1.00B») 과 일치.
 *       라벨은 손으로 적은 문자열이 아니라 `fmt(dia)` 파생이어야 한다(값·라벨 동시 이동 보장)
 *   [C] 폭 — 13 재화 탭 실캡처에서 라벨이 카드 안쪽(`.bg` 264px)을 넘치는 칸 0
 *   [D] 구매 — 헤드리스 `devBuyDia(id)` 5종의 `S.dia` 증가분 = 새 값 · 쿠폰(cp) 지급 = 0/0/0/1/2
 *   [E] 교환 — 쿠폰 10개로 `mileageExchange()` → 다이아 **+2,500,000** · 쿠폰 −10 · 부족하면 false(Δ0)
 *   [F] 44 회귀 — 가격 `won`(1,000/5,000/11,000/55,000/110,000)·`MILE_NEED`=10 불변 ·
 *       카드 [구매] 클릭은 «준비 중» 팝업만(지급 0) · 쿠폰 10 미만이면 교환 버튼에 `#cnExch` 자체가 없음
 *   [G] 구 세이브 — 이미 받은 다이아는 안 건드린다(마이그레이션 없음). 44 교훈 1 대로 `addInitScript` 로 심는다
 *   [H] 콘솔 에러 0건 · 화면 텍스트에 NaN/undefined 0건
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const DIA = [5000, 35000, 75000, 450000, 1000000];
const WON = [1000, 5000, 11000, 55000, 110000];
const CP = [0, 0, 0, 1, 2];
const LAB = ['×5.00A', '×35.0A', '×75.0A', '×450A', '×1.00B'];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const openCoin = async page => page.evaluate(() => {
  openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderCoinPage === 'function');
  await page.waitForTimeout(400);

  /* ---- [A] 상수 ---- */
  const A = await page.evaluate(() => ({
    dia: DIA_PACKS.map(p => p.dia), won: DIA_PACKS.map(p => p.won), cp: DIA_PACKS.map(p => p.cp),
    ids: DIA_PACKS.map(p => p.id), mile: MILE_DIA, need: MILE_NEED,
  }));
  ok(JSON.stringify(A.dia) === JSON.stringify(DIA), 'A1 DIA_PACKS.dia = 5,000/35,000/75,000/450,000/1,000,000', A.dia.join('·'));
  ok(A.mile === 2500000, 'A2 MILE_DIA = 2,500,000', String(A.mile));
  ok(A.need === 10, 'A3 MILE_NEED = 10 유지(지시 ③)', String(A.need));
  ok(JSON.stringify(A.ids) === JSON.stringify(['d1', 'd2', 'd3', 'd4', 'd5']), 'A4 상품 id 5종 유지', A.ids.join('·'));
  /* 옛 값의 «부재» 는 런타임으로는 못 본다 — 소스 스캔이다(LESSONS 111-1 ⓐ) */
  const oldLit = [/dia:\s*10000\b/, /dia:\s*70000\b/, /dia:\s*150000\b/, /dia:\s*900000\b/, /dia:\s*2000000\b/,
    /MILE_DIA\s*=\s*5000000/];
  ok(oldLit.every(r => !r.test(SRC)), 'A5 옛 다이아 리터럴(1만·7만·15만·90만·200만·500만) 부재(소스 스캔)',
     oldLit.filter(r => r.test(SRC)).map(String).join(' ') || '0건');
  const oldLab = /q:\s*'×(1만|7만|15만|90만|200만)'/;
  ok(!oldLab.test(SRC), 'A6 옛 수량 라벨 문자열(«×1만»류) 부재(소스 스캔)');

  /* ---- [B] 라벨 — 값에서 파생되는가 ---- */
  const B = await page.evaluate(() => ({
    q: DIA_PACKS.map(p => p.q),
    derived: DIA_PACKS.every(p => p.q === '×' + fmt(p.dia)),
    name: diaPackName(DIA_PACKS[0]),
  }));
  ok(JSON.stringify(B.q) === JSON.stringify(LAB), 'B1 라벨 = ×5.00A/×35.0A/×75.0A/×450A/×1.00B', B.q.join(' '));
  ok(B.derived, 'B2 라벨은 손으로 적은 문자열이 아니라 fmt(dia) 파생');
  ok(B.name === '다이아 5.00A개', 'B3 구매 팝업 상품명도 같은 표기', B.name);

  /* ---- [C] 폭 — 실제 카드에서 안쪽(.bg 264px) 넘침 0 ---- */
  await openCoin(page);
  await page.waitForTimeout(200);
  const C = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#shopList .cn-cd.dia').forEach(cd => {
      const q = cd.querySelector('.qt'), bg = cd.querySelector('.bg');
      const qr = q.getBoundingClientRect(), br = bg.getBoundingClientRect();
      out.push({ t: q.textContent, w: +qr.width.toFixed(1),
        l: +(qr.left - br.left).toFixed(1), r: +(br.right - qr.right).toFixed(1) });
    });
    return out;
  });
  ok(C.length === 5, 'C1 다이아 카드 5칸 렌더', String(C.length));
  ok(JSON.stringify(C.map(c => c.t)) === JSON.stringify(LAB), 'C2 카드 DOM 라벨 문자열 일치', C.map(c => c.t).join(' '));
  const over = C.filter(c => c.l < 0 || c.r < 0);
  ok(over.length === 0, 'C3 라벨 카드 안쪽 넘침 0칸',
     over.length ? over.map(c => c.t + ' l' + c.l + '/r' + c.r).join(', ')
                 : 'left ' + Math.min(...C.map(c => c.l)).toFixed(1) + '~ · width ' + C.map(c => c.w).join('/'));
  /* 다섯 칸이 제각각 튀지 않는지(폭 편차 ≤ 6px) — qx 재보정의 목적 */
  const ws = C.map(c => c.w), dev = Math.max(...ws) - Math.min(...ws);
  ok(dev <= 6, 'C4 라벨 렌더 폭 편차 ≤ 6px(qx 재보정)', dev.toFixed(1) + 'px');

  /* ---- [D] 구매 지급 ---- */
  const D = await page.evaluate(ids => ids.map(id => {
    const d0 = S.dia, m0 = S.mileage || 0, p0 = S.cnt.paid || 0;
    devBuyDia(id);
    return { id, dDia: S.dia - d0, dCp: (S.mileage || 0) - m0, dPaid: (S.cnt.paid || 0) - p0 };
  }), ['d1', 'd2', 'd3', 'd4', 'd5']);
  D.forEach((r, i) => ok(r.dDia === DIA[i], 'D' + (i + 1) + ' ' + r.id + ' 구매 → S.dia +' + DIA[i], '+' + r.dDia));
  ok(JSON.stringify(D.map(r => r.dCp)) === JSON.stringify(CP), 'D6 쿠폰 지급 0/0/0/1/2 유지', D.map(r => r.dCp).join('/'));
  ok(D.every(r => r.dPaid === 1), 'D7 누적 결제수 S.cnt.paid 각 +1', D.map(r => r.dPaid).join('/'));

  /* ---- [E] 마일리지 교환 ---- */
  const E = await page.evaluate(() => {
    S.mileage = 3;
    const d0 = S.dia, r0 = mileageExchange(), lack = { r: r0, d: S.dia - d0, m: S.mileage };
    S.mileage = 10;
    const d1 = S.dia, r1 = mileageExchange();
    return { lack, okc: { r: r1, d: S.dia - d1, m: S.mileage } };
  });
  ok(E.lack.r === false && E.lack.d === 0 && E.lack.m === 3, 'E1 쿠폰 부족(3/10) → false · 다이아 Δ0',
     'r=' + E.lack.r + ' Δ' + E.lack.d);
  ok(E.okc.r === true && E.okc.d === 2500000, 'E2 쿠폰 10 → 다이아 +2,500,000', '+' + E.okc.d);
  ok(E.okc.m === 0, 'E3 쿠폰 −10', String(E.okc.m));
  /* 팝업 안내문도 새 값으로(문자열은 fmt 파생) */
  const E4 = await page.evaluate(() => {
    const t = document.body.innerText;
    return { has: t.includes('2.50B'), old: t.includes('5.00B') };
  });
  ok(E4.has && !E4.old, 'E4 교환 결과 팝업 안내문 «💎 2.50B»(옛 5.00B 부재)', JSON.stringify(E4));
  await page.evaluate(() => { document.querySelectorAll('.modal.on .x, .modal.on').forEach(m => m.classList && m.classList.remove('on')); });

  /* ---- [F] 44 회귀 ---- */
  ok(JSON.stringify(A.won) === JSON.stringify(WON), 'F1 가격(won) 1,000/5,000/11,000/55,000/110,000 불변', A.won.join('·'));
  ok(JSON.stringify(A.cp) === JSON.stringify(CP), 'F2 쿠폰(cp) 0/0/0/1/2 불변', A.cp.join('·'));
  const F = await page.evaluate(() => {
    S.mileage = 0; S.dia = 1000; renderCoinPage(document.getElementById('shopList'));
    const noEx = !document.getElementById('cnExch') && !!document.querySelector('#cnMile.off');
    const d0 = S.dia;
    document.querySelector('#shopList [data-diabuy="d5"]').click();
    const txt = document.body.innerText;
    return { noEx, dDia: S.dia - d0, ready: txt.includes('결제 준비 중'), won: txt.includes('110,000원') };
  });
  ok(F.noEx, 'F3 쿠폰 10 미만이면 교환 버튼 id(#cnExch) 자체가 없음(비활성 클릭 = Δ0)');
  ok(F.dDia === 0 && F.ready, 'F4 카드 [구매] 클릭 → «결제 준비 중» 팝업만, 지급 0', 'Δ' + F.dDia);
  ok(F.won, 'F5 구매 팝업에 원화가 «110,000원» 표기');

  /* ---- [G] 구 세이브 보존 — 이미 받은 다이아는 안 건드린다(지시 ④) ---- */
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx2.addInitScript(() => {
    /* 44 교훈 1 — 살아 있는 페이지에서 localStorage 를 고치면 5초 자동 저장이 옛 값을 되쓴다.
       페이지 스크립트보다 먼저 심어야 결정적이다. */
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({ dia: 987654321, mileage: 7, gold: 1000 }));
  });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto(URL);
  await p2.waitForFunction(() => typeof S !== 'undefined');
  await p2.waitForTimeout(400);
  const G = await p2.evaluate(() => ({ dia: S.dia, mile: S.mileage }));
  ok(G.dia === 987654321, 'G1 구 세이브의 보유 다이아 무변경(마이그레이션 없음)', String(G.dia));
  ok(G.mile === 7, 'G2 구 세이브의 마일리지 쿠폰 무변경', String(G.mile));
  ok(errs2.length === 0, 'G3 구 세이브 로드 시 런타임 에러 0건', errs2.join(' | '));

  /* ---- [H] 콘솔 에러 · NaN 스캔 ---- */
  const H = await p2.evaluate(() => {
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const t = document.getElementById('shopList').innerText;
    return { nan: (t.match(/NaN|undefined/g) || []).length, len: t.length };
  });
  ok(H.nan === 0, 'H1 13 재화 탭 텍스트에 NaN/undefined 0건', H.nan + '건 / ' + H.len + '자');
  ok(errs.length === 0, 'H2 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY116 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
