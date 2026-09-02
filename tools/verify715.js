#!/usr/bin/env node
/* 게이트 — 작업 715 「재화 교환에 수량 슬라이더 — 클릭 후 개수 조절」
 *          (2026-09-02 저장소 주인 지시 03:10 · 보강 03:12 «x1 x10 x100 max방식말고»)
 *
 *   node tools/verify715.js
 *
 * 지키는 성질 — 주인이 못박은 것이 «값» 이 아니라 **구조**로 굳었는가:
 *   [A] 부품이 **하나** — 교환 세 자리(§9 재화 2종 · §10 입장권 8종 · §8 마일리지)가 모두 같은
 *       진입점 `exOpen()` 을 지나고 같은 마크업(`.ex715 .ex-tr`)을 그린다. 490 의 수량 탭
 *       (`EX_QTYS`/`exQty`/`exQtyN`/`.cn-qty`/`[data-exq]`)은 **제품 줄에 0건**(333·399 —
 *       죽는 분기를 남겨 두면 «두 벌» 이 된다) · 소환/강화의 배수 토글(`SUM_MULS`)을 재사용하지 않는다.
 *   [B] 상한 = **실제로 지불 가능한 최대** — `cost(max) ≤ have < cost(max+1)` · 1 미만·max 초과는
 *       클램프 · 확정해도 잔액이 음수가 되지 않는다 · 클램프를 뚫어도 `exRun()` 이 한 번 더 막는다.
 *   [C] 표시 총비용 = **과금액** = **Σ스텝** — 균일 단가의 지름길(`flat`)이 합산과 같은 답을 내고,
 *       **구간별 비용 표본**(step(i)=1+i)에서는 «단가 × N» 과 다른 값이 나온다(701 보강 규약).
 *   [D] 즉시 지급(697) — 세 자리 전부 그 틱에 잔액이 움직이고 **새 우편 0** 이다.
 *   [E] 조작감 — 트랙을 실제 포인터로 끌면 값이 따라오고(95 드래그 제외 목록에 `#exTrack`),
 *       ±1·±10 미세조절이 범위 밖에서 꺼진다. 확정 전에는 재화가 **한 톨도** 안 움직인다.
 *   [F] 두 프레임(1080×2280 · 1080×1600) — 팝업이 프레임 안에 들고 잘림·넘침 0.
 *   [R] 되돌림 시험 — ⓐ 과금을 0 으로 바꾼 사본에서 [C3] 이 · ⓑ 클램프를 없앤 사본에서 [B2] 가
 *       빨개진다(334·338 교훈 — 이 절이 없으면 «이미 참인 것을 굳힌 게이트» 다).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «식·수치·식별자» 판정이라 비평가를 띄우지 않는다
 * (팝업 생김새의 채점은 [3]-(나) 로 따로 돈다 — `docs/review/715-교환수량슬라이더.md`).
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

async function boot(browser, h, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save || { gold: 5e7, dia: 5e6, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof exOpen === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { ctx, page, errs };
}

/* 13 재화 탭을 열어 두는 공용 절차 — 세 자리가 전부 이 페이지에 있다 */
const openCoin = page => ev(page, () => {
  openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
  return true;
});

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');   /* 주석은 제외 — «되살리는 법» 이 적혀 있다 */
  const browser = await launch(chromium);
  const b = await boot(browser, 2280);
  const p = b.page;
  await openCoin(p);

  /* ================= [A] 부품이 하나 ================= */
  blk('[A] 부품 — 세 자리가 같은 슬라이더를 쓴다');
  {
    const dead = (code.match(/EX_QTYS|exQtyN|data-exq|cn-qty/g) || []).length;
    ok(dead === 0, '★ [A1] 제품 줄에 490 수량 탭(`EX_QTYS`·`exQtyN`·`data-exq`·`.cn-qty`) **0건** '
      + '— 주인 보강 «x1 x10 x100 max방식말고»', dead + '건');
    const share = (code.match(/SUM_MULS/g) || []).length;
    const shareEx = /exOpen\s*\(\s*exDef(Cur|Dun|Mile)/.test(code);
    ok(shareEx, '★ [A2] 세 자리 전부 `exOpen(exDef…)` 한 진입점을 부른다(자리마다 다시 그리지 않는다)');
    ok(share > 0 && !/ex(Open|Def)[\s\S]{0,200}SUM_MULS/.test(code),
      '[A3] 소환 배수 토글(`SUM_MULS`)을 교환 부품이 재사용하지 않는다(주인이 둘을 갈라 놓았다)');
    const three = await ev(p, () => {
      const seen = [];
      const shot = () => {
        const w = document.querySelector('#modal .ex715');
        return { open: !!w, tr: !!(w && w.querySelector('.ex-tr')),
          adj: w ? w.querySelectorAll('[data-exadj]').length : 0,
          title: (document.getElementById('mtitle') || {}).textContent || '' };
      };
      S.dia = 1e6; S.mileage = 50; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click(); seen.push(shot()); closeModal();
      renderShopPage();
      document.querySelector('#shopList .bt.buy[data-dunex]').click(); seen.push(shot()); closeModal();
      renderShopPage();
      document.querySelector('#cnExch').click(); seen.push(shot()); closeModal();
      return seen;
    });
    ok(three && three.length === 3 && three.every(s => s.open && s.tr && s.adj === 4),
      '★ [A4] §9 재화 · §10 입장권 · §8 마일리지 — 셋 다 같은 트랙 + 미세조절 4칸이 뜬다',
      three ? three.map(s => s.title + (s.tr ? '/트랙O' : '/트랙X') + '·±' + s.adj).join(' | ') : '못 읽음');
    const guide = await ev(p, () => {
      const g = document.querySelector('#shopList .cn-tknt.ex');
      return g ? { txt: g.textContent.trim(), top: g.offsetTop } : null;
    });
    ok(guide && guide.top === 3186 && /슬라이더/.test(guide.txt),
      '[A5] 수량 탭이 있던 94px 구간을 안내 한 줄이 받는다(자리를 비우지 않는다 · §10 좌표 불변)',
      guide ? 'top ' + guide.top + ' · ' + guide.txt : '없음');
  }

  /* ================= [B] 상한 = 지불 가능 최대 ================= */
  blk('[B] 상한 — 가진 것으로 살 수 있는 최대까지만');
  {
    const r = await ev(p, () => {
      const out = [];
      const probe = (name, open, unit) => {
        open();
        const d = exSel.d, max = exSel.max, have = d.have();
        out.push({ name, max, have, unit,
          cMax: exCost(d, max), cOver: exCost(d, max + 1),
          setOver: (exSet(max + 5), exSel.n), setUnder: (exSet(-3), exSel.n) });
        closeModal();
      };
      S.dia = 12345; S.mileage = 47; renderShopPage();
      probe('재화(1:1)', () => document.querySelector('#shopList .bt.buy[data-ex="relic"]').click(), 1);
      renderShopPage();
      probe('입장권(1000)', () => document.querySelector('#shopList .bt.buy[data-dunex]').click(), 1000);
      renderShopPage();
      probe('마일리지(10)', () => document.querySelector('#cnExch').click(), 10);
      return out;
    });
    const line = r ? r.map(x => x.name + ' max ' + x.max + '/' + x.have).join(' · ') : '';
    ok(r && r.every(x => x.cMax <= x.have && x.cOver > x.have),
      '★ [B1] `cost(max) ≤ 잔량 < cost(max+1)` — 상한이 «지불 가능한 최대» 그 자리다', line);
    ok(r && r.every(x => x.max === Math.floor(x.have / x.unit)),
      '[B2] 그 값이 «잔량 ÷ 단가» 와 같다(12345 다이아 → 1:1 12345 · 1000짜리 12 · 47 마일리지 → 4)',
      r ? r.map(x => x.max).join(',') : '');
    ok(r && r.every(x => x.setOver === x.max && x.setUnder === 1),
      '★ [B3] 상한 초과·1 미만은 **실시간 클램프**된다(넘었다가 되돌아오는 프레임이 없다)',
      r ? r.map(x => x.setOver + '/' + x.setUnder).join(' · ') : '');
    const guard = await ev(p, () => {
      S.dia = 5000; S.relic = 0; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSel.n = exSel.max + 777;                 /* 클램프를 뚫었다 치고 확정을 눌러 본다 */
      const d0 = S.dia, r0 = S.relic, res = exRun();
      const out = { res, dia: S.dia - d0, rel: S.relic - r0, neg: S.dia < 0 };
      closeModal();
      return out;
    });
    ok(guard && guard.res === false && guard.dia === 0 && guard.rel === 0 && !guard.neg,
      '★ [B4] 클램프를 뚫어도 `exRun()` 이 한 번 더 막는다 — 재화 Δ0 · 잔액 음수 0(이중 방어)',
      guard ? '결과 ' + guard.res + ' · 다이아 Δ' + guard.dia : '');
    const full = await ev(p, () => {
      S.dia = 7777; S.relic = 0; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSet(exSel.max);
      const n = exSel.n, d0 = S.dia;
      exRun();
      return { n, dia: S.dia, spent: d0 - S.dia, rel: S.relic };
    });
    ok(full && full.n === 7777 && full.dia === 0 && full.rel === 7777,
      '[B5] 최대치로 확정하면 잔액이 정확히 0 이다(음수 0 · 남기지도 않는다)',
      full ? 'n ' + full.n + ' · 잔액 ' + full.dia + ' · 유물조각 +' + full.rel : '');
  }

  /* ================= [C] 총비용 = 과금액 = Σ스텝 ================= */
  blk('[C] 비용 — 표시 = 과금 = 스텝 합산');
  {
    const same = await ev(p, () => {
      /* 구간별 비용 표본 — «단가 × N» 이면 여기서 갈린다(701 보강 규약의 그 자리) */
      const seg = { flat:false, step:i => 1 + i, have:() => 1e9, gain:n => n,
        ic:() => '', gic:() => '', t:'표본', run(){} };
      const sum = n => { let c = 0; for (let i = 0; i < n; i++) c += seg.step(i); return c; };
      const flat = { flat:true, step:() => 7, have:() => 1e9, gain:n => n,
        ic:() => '', gic:() => '', t:'표본', run(){} };
      const fs2 = n => { let c = 0; for (let i = 0; i < n; i++) c += flat.step(i); return c; };
      const ns = [1, 2, 3, 10, 57, 1000];
      return {
        segOk: ns.every(n => exCost(seg, n) === sum(n)),
        segDiff: ns.filter(n => n > 1).every(n => exCost(seg, n) !== seg.step(0) * n),
        segVals: ns.map(n => exCost(seg, n)).join(','),
        flatOk: ns.every(n => exCost(flat, n) === fs2(n)),
        /* 상한도 합산으로 센다: 누적 1,3,6,10,15 — 잔량 15 면 5개(15 ≤ 15) · 14 면 4개(10 ≤ 14 < 15) */
        segMax: (() => { const d = { flat:false, step:i => 1 + i, have:() => 15 }; return exMax(d); })(),
        segMax2: (() => { const d = { flat:false, step:i => 1 + i, have:() => 14 }; return exMax(d); })()
      };
    });
    ok(same && same.segOk, '★ [C1] 구간별 비용에서 `exCost()` 는 **스텝 합산**이다(1+2+3+…)', same ? same.segVals : '');
    ok(same && same.segDiff, '★ [C2] 그 값이 «단가 × N» 과 **다르다** — 곱으로 적었으면 여기서 빨개진다');
    ok(same && same.flatOk, '[C3] 균일 단가의 지름길(`flat`)은 합산과 **같은 답**을 낸다(사실은 검산된다)');
    ok(same && same.segMax === 5 && same.segMax2 === 4,
      '[C4] 구간별에서도 상한은 **합산**으로 센다(누적 1,3,6,10,15 — 잔량 15 → 5개 · 14 → 4개. '
      + '단가×N 으로 세면 15/1 = 15 가 나온다)', same ? same.segMax + ' · ' + same.segMax2 : '');
    const paid = await ev(p, () => {
      S.dia = 1e6; S.relic = 0; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSet(137);
      const shown = document.getElementById('exCost').textContent.replace(/[^0-9]/g, '');
      const aft = document.getElementById('exAft').textContent.replace(/[^0-9]/g, '');
      const gn = document.getElementById('exGn').textContent.replace(/[^0-9]/g, '');
      const d0 = S.dia;
      exRun();
      return { shown: +shown, aft: +aft, gn: +gn, spent: d0 - S.dia, rel: S.relic, left: S.dia };
    });
    ok(paid && paid.shown === 137 && paid.spent === 137 && paid.rel === 137,
      '★ [C5] 화면이 적은 총비용 = 실제 과금액 = 받은 양(1:1 · n=137)',
      paid ? '표시 ' + paid.shown + ' · 과금 ' + paid.spent + ' · 획득 ' + paid.rel : '');
    ok(paid && paid.aft === paid.left,
      '★ [C6] «교환 후 잔액» 이 실제 잔액과 같다', paid ? '표시 ' + paid.aft + ' · 실제 ' + paid.left : '');
    ok(paid && paid.gn === 137, '[C7] 위쪽 «×N» 이 받을 양이다', paid ? String(paid.gn) : '');
    const mile = await ev(p, () => {
      S.mileage = 35; S.dia = 0; renderShopPage();
      document.querySelector('#cnExch').click();
      exSet(3);
      const shown = +document.getElementById('exCost').textContent.replace(/[^0-9]/g, '');
      const gn = +document.getElementById('exGn').textContent.replace(/[^0-9]/g, '');
      const m0 = S.mileage;
      exRun();
      return { shown, gn, spent: m0 - S.mileage, dia: S.dia, want: MILE_DIA * 3, need: MILE_NEED * 3 };
    });
    ok(mile && mile.shown === mile.need && mile.spent === mile.need && mile.gn === mile.want && mile.dia === mile.want,
      '★ [C8] 지불 재화가 다이아가 아닌 자리(마일리지)도 같은 산수다 — 3회 = 마일리지 −30 · 다이아 +1,500만',
      mile ? '표시 ' + mile.shown + ' · 차감 ' + mile.spent + ' · 다이아 ' + mile.dia : '');
  }

  /* ================= [D] 즉시 지급(697) ================= */
  blk('[D] 지급 — 그 틱에 · 우편 0');
  {
    const d = await ev(p, () => {
      const run = (open, n) => {
        S.mailx = []; S.mailSeq = 0;
        renderShopPage(); open();
        exSet(n);
        const before = { dia: S.dia, mile: S.mileage | 0, mail: S.mailx.length };
        exRun();
        return { mail: S.mailx.length - before.mail, dDia: S.dia - before.dia };
      };
      S.dia = 1e6; S.relic = 0; S.rstone = 0; S.mileage = 60;
      const a = run(() => document.querySelector('#shopList .bt.buy[data-ex="relic"]').click(), 25);
      const relGot = S.relic;
      const b2 = run(() => document.querySelector('#shopList .bt.buy[data-ex="rstone"]').click(), 40);
      const stGot = S.rstone;
      const tk0 = JSON.stringify(S.dunTk);
      const c = run(() => document.querySelector('#shopList .bt.buy[data-dunex]').click(), 3);
      const tkGot = Object.keys(S.dunTk).reduce((s, k) => s + (S.dunTk[k] | 0), 0)
                  - Object.keys(JSON.parse(tk0)).reduce((s, k) => s + (JSON.parse(tk0)[k] | 0), 0);
      const e2 = run(() => document.querySelector('#cnExch').click(), 2);
      return { a, relGot, b2, stGot, c, tkGot, e2 };
    });
    ok(d && d.a.mail === 0 && d.relGot === 25, '★ [D1] 유물조각 25개 — 그 자리에서 지급 · 새 우편 0',
      d ? '유물 +' + d.relGot + ' · 우편 ' + d.a.mail : '');
    ok(d && d.b2.mail === 0 && d.stGot === 40, '[D2] 룬강화석 40개 — 같은 처리', d ? '룬석 +' + d.stGot : '');
    ok(d && d.c.mail === 0 && d.tkGot === 3, '[D3] 입장권 3장 — 한 번의 확정으로 3장(옛 «클릭 = 1장» 폐지)',
      d ? '입장권 +' + d.tkGot : '');
    ok(d && d.e2.mail === 0 && d.e2.dDia === 2 * 5000000,
      '[D4] 마일리지 2회 — 다이아가 그 틱에 들어온다', d ? '다이아 +' + d.e2.dDia : '');
  }

  /* ================= [E] 조작 — 드래그 + 미세조절 ================= */
  blk('[E] 조작 — 끌어서 · ± 로 한 개씩');
  {
    await ev(p, () => {
      S.dia = 1000; S.relic = 0; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSet(1);
    });
    const box = await p.evaluate(() => {
      const r = document.getElementById('exTrack').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await p.mouse.move(box.x + box.w * 0.5, box.y + box.h / 2);
    await p.mouse.down();
    await p.mouse.move(box.x + box.w * 0.75, box.y + box.h / 2, { steps: 6 });
    const mid = await ev(p, () => exSel && exSel.n);
    await p.mouse.move(box.x + box.w * 2, box.y + box.h / 2, { steps: 4 });   /* 트랙 밖까지 */
    const outN = await ev(p, () => exSel && exSel.n);
    await p.mouse.up();
    ok(typeof mid === 'number' && Math.abs(mid - 750) <= 12,
      '★ [E1] 트랙을 실제로 끌면 값이 따라온다(75% 지점 ≈ 750)', String(mid));
    ok(outN === 1000, '[E2] 트랙 **밖**까지 끌어도 포인터 캡처로 값이 상한에 붙는다(중간에 안 끊긴다)',
      String(outN));
    const adj = await ev(p, () => {
      const hit = v => document.querySelector('#modal [data-exadj="' + v + '"]').click();
      exSet(5); hit(-1); const a = exSel.n; hit(10); const b = exSel.n;
      exSet(1); hit(-1); hit(-10); const lo = exSel.n;
      const loOff = [...document.querySelectorAll('#modal [data-exadj]')]
        .filter(e => +e.dataset.exadj < 0).every(e => e.classList.contains('off'));
      exSet(exSel.max); hit(1); hit(10); const hi = exSel.n;
      const hiOff = [...document.querySelectorAll('#modal [data-exadj]')]
        .filter(e => +e.dataset.exadj > 0).every(e => e.classList.contains('off'));
      return { a, b, lo, loOff, hi, hiOff, max: exSel.max };
    });
    ok(adj && adj.a === 4 && adj.b === 14, '★ [E3] ±1 · ±10 미세조절이 한 개 단위로 듣는다',
      adj ? '5→' + adj.a + '→' + adj.b : '');
    ok(adj && adj.lo === 1 && adj.hi === adj.max,
      '[E4] 양 끝에서는 더 안 밀린다', adj ? '아래 ' + adj.lo + ' · 위 ' + adj.hi + '/' + adj.max : '');
    ok(adj && adj.loOff && adj.hiOff, '[E5] 못 미는 방향의 버튼은 꺼진 꼴(`.off`)로 보인다',
      adj ? '아래 ' + adj.loOff + ' · 위 ' + adj.hiOff : '');
    const quiet = await ev(p, () => {
      S.dia = 900; S.relic = 0; renderShopPage();
      const d0 = S.dia, r0 = S.relic;
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSet(300);
      document.querySelector('#modal [data-exadj="10"]').click();
      const mid = { dia: S.dia - d0, rel: S.relic - r0 };
      document.getElementById('exNo').click();
      /* ⚠ 노드 존재로 «열려 있다» 를 재면 안 된다 — `closeModal()` 은 본문을 지우지 않고 `.on` 만 뗀다 */
      return { mid, after: { dia: S.dia - d0, rel: S.relic - r0 },
        open: document.getElementById('modal').classList.contains('on'), sel: exSel !== null };
    });
    ok(quiet && quiet.mid.dia === 0 && quiet.mid.rel === 0,
      '★ [E6] 열고 끌고 눌러도 **확정 전에는** 재화가 한 톨도 안 움직인다(주인 «클릭하고나서»)',
      quiet ? '다이아 Δ' + quiet.mid.dia : '');
    ok(quiet && quiet.after.dia === 0 && !quiet.open && !quiet.sel,
      '[E7] [취소] 는 아무것도 안 하고 닫는다(열려 있던 교환도 같이 없앤다)',
      quiet ? '다이아 Δ' + quiet.after.dia + ' · 열림 ' + quiet.open + ' · exSel ' + quiet.sel : '');
    ok(/#exTrack/.test(code) && /DS_NO\s*=\s*'[^']*#exTrack/.test(code),
      '[E8] 95 드래그 스크롤 제외 목록(`DS_NO`)에 `#exTrack` 이 있다(LESSONS 95-② — 안 넣으면 값이 안 따라온다)');
  }

  /* ================= [R] 되돌림 시험 ================= */
  blk('[R] 되돌림 — 무르게 풀지 않았음을 못박는다');
  {
    const r1 = await ev(p, () => {
      const keep = window.exCost;
      window.exCost = () => 0;                        /* 과금을 0 으로 바꾼 사본 */
      S.dia = 1000; S.relic = 0; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSet(50);
      const shown = +document.getElementById('exCost').textContent.replace(/[^0-9]/g, '');
      const d0 = S.dia;
      exRun();
      const out = { shown, spent: d0 - S.dia };
      window.exCost = keep;
      return out;
    });
    ok(r1 && r1.spent === 0 && r1.shown === 0,
      '★ [R1] 과금을 0 으로 만든 사본에서는 [C5](표시 = 과금 = 획득)가 **빨개진다**',
      r1 ? '표시 ' + r1.shown + ' · 과금 ' + r1.spent + '(정상 트리는 50/50)' : '');
    const r2 = await ev(p, () => {
      const keep = window.exSet;
      window.exSet = v => { if (exSel) exSel.n = v; };   /* 클램프를 없앤 사본 */
      S.dia = 100; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      exSet(exSel.max + 5);
      const n = exSel.n, max = exSel.max;
      window.exSet = keep;
      closeModal();
      return { n, max };
    });
    ok(r2 && r2.n === r2.max + 5,
      '★ [R2] 클램프를 없앤 사본에서는 [B3](상한 초과 클램프)이 **빨개진다**',
      r2 ? 'n ' + r2.n + ' > max ' + r2.max : '');
  }

  /* ================= [F] 두 프레임 ================= */
  blk('[F] 두 프레임 — 1080×2280 · 1080×1600');
  /* ⚠ 기하는 **갓 띄운 페이지**에서 잰다 — 위 절들을 다 지난 페이지는 `fit()` 이 그 사이의
     레이아웃 사건(토스트·재렌더)에 반응해 `#app` 배율이 1 이 아닐 수 있고, 그러면 같은 트랙이
     772×50 대신 752×49 로 읽혀 «제품이 틀렸다» 는 착시가 난다(측정 자리의 함정이지 결함이 아니다). */
  for (const H of [2280, 1600]) {
    const bb = await boot(browser, H);
    const pp = bb.page;
    await openCoin(pp);
    const box = await ev(pp, () => {
      S.dia = 1e6; renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      const app = document.getElementById('app').getBoundingClientRect();
      const m = document.querySelector('#modal .mbox').getBoundingClientRect();
      const w = document.querySelector('#modal .ex715');
      const tr = w.querySelector('.ex-tr').getBoundingClientRect();
      const go = document.getElementById('exGo').getBoundingClientRect();
      const body = document.querySelector('#modal .mbody');
      return {
        in: m.top >= app.top - 0.6 && m.bottom <= app.bottom + 0.6,
        trW: Math.round(tr.width), trH: Math.round(tr.height),
        goIn: go.top >= app.top && go.bottom <= app.bottom + 0.6,
        clip: body.scrollHeight - body.clientHeight,
        knob: (() => { const k = document.getElementById('exKnob').getBoundingClientRect();
          return k.left >= tr.left - 0.6 && k.right <= tr.right + 0.6; })(),
        scale: +(document.getElementById('app').getBoundingClientRect().width / 1080).toFixed(3)
      };
    });
    ok(box && box.in, '[F' + (H === 2280 ? 1 : 2) + '-a] ' + H + ' — 팝업 상자가 프레임 안에 든다');
    ok(box && box.goIn, '[F' + (H === 2280 ? 1 : 2) + '-b] ' + H + ' — [교환] 버튼이 프레임 안이다(스크롤 없이 보인다)');
    ok(box && box.trH === 50 && box.trW > 600,
      '[F' + (H === 2280 ? 1 : 2) + '-c] ' + H + ' — 트랙 높이 50(55 볼륨 트랙 비례) · 폭 '
      + (box ? box.trW : '?') + ' · 배율 ' + (box ? box.scale : '?'));
    ok(box && box.knob, '[F' + (H === 2280 ? 1 : 2) + '-d] ' + H + ' — 노브가 트랙 밖으로 안 나간다');
    await bb.ctx.close();
  }

  const errs = b.errs.filter(t => !/favicon|ERR_FILE_NOT_FOUND/i.test(t));
  ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await b.ctx.close();
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + '  ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
