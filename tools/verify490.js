#!/usr/bin/env node
/* 게이트 — 작업 490 「룬 강화는 룬강화석으로만 · 교환 전부 1:1 · 입장권 전부 1,000 · 룬강화석 초록」
 *          (2026-08-30 저장소 주인 지시 · 203/204/44/430 개정)
 *
 *   node tools/verify490.js
 *
 * 지키는 성질 — 주인이 못박은 네 가지가 «값» 이 아니라 **구조**로 굳었는가:
 *   [A] 결제 한 갈래 — 룬은 룬강화석으로만 오른다. 다이아가 100만 개 있어도 룬강화석이 0 이면
 *       한 번도 안 오르고 다이아는 한 푼도 안 나간다 · 카드의 시도 버튼은 **하나**.
 *       `RUNE_DIA`·`RUNE_HOLD_DIA`·`data-pay` 가 제품 줄에 **0건**(295-② 두 벌 금지).
 *   [B] 교환 1:1 — 품목 2종(유물조각·룬강화석) · 수량 탭 4칸 · **고른 수량 n → 다이아 −n · 재화 +n**.
 *       유물조각은 우편(153), 룬강화석은 즉시(우편 스키마에 자리가 없다 — 204 입장권과 같은 처리).
 *       ⚠ 비율이 «표» 가 아니라 **구조**다 — 비율을 적을 자리가 아예 없다(`EXCHANGE` 에 수량 필드 없음).
 *   [C] 입장권 1,000 — 8종 **전부** 1,000 이고, 난이도 계수표(`DUN_EX_BASE`/`DUN_EX_K`)가 안 남아 있다.
 *   [D] 초록 — 룬강화석 **재화 아이콘**(`cur-rstone.svg`) 채움 hue 100~150° · 입장권도 초록 ·
 *       수정 광산 입장권은 하늘색(430 개정) · 03 카드 안개 `--bgc` 도 같이 왔다.
 *   [R] 되돌림 시험 — ⓐ 다이아 결제를 되살린 사본에서 [A] 가 · ⓑ 옛 계수표를 되살린 사본에서 [C] 가 빨개진다
 *       (334·338 교훈 — 이 절이 없으면 «이미 참인 것을 굳힌 게이트» 다).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «식·수치·식별자» 판정이라 비평가를 띄우지 않는다.
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
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 색 — 430 의 자와 같은 식(그 파일이 자산을 보고, 여기서는 «룬강화석 재화» 를 본다) */
const finv = t => (t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function hslH(rgb) {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  return (h + 360) % 360;
}
function lab(rgb) {
  const r = finv(rgb[0] / 255), g = finv(rgb[1] / 255), b = finv(rgb[2] / 255);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
  const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const k = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = k(X), fy = k(Y), fz = k(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/* SVG 의 «채움» = 두 번째 path 의 fill(430·412 규격: 첫 줄이 테, 둘째 줄이 채움) */
const fillOf = file => {
  const t = fs.readFileSync(path.join(ROOT, 'assets', 'ui', file), 'utf8');
  const m = t.match(/fill="(#[0-9A-Fa-f]{6})"/g) || [];
  return m.length >= 2 ? m[1].slice(6, 13).toUpperCase() : null;
};

async function boot(browser, url, save) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save || { gold: 5e7, dia: 5e6, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof runeTry === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { ctx, page, errs };
}

/* 한 트리에서 «다이아만 쥐여 주고 룬을 올려 보기» — 본체와 되돌림 사본이 같은 함수를 지난다 */
const diaOnly = page => ev(page, () => {
  S.rune = { r1: 5, r2: 0, r3: 0 }; S.rstone = 0; S.dia = 1e6;
  const d0 = S.dia, l0 = runeLvOf('r1');
  let up = 0;
  for (let i = 0; i < 50; i++) if (runeTry('r1').ok) up++;
  return { diaSpent: d0 - S.dia, tried: up, dLv: runeLvOf('r1') - l0 };
});

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const browser = await launch(chromium);
  const b = await boot(browser, 'file://' + SRC);
  const p = b.page;

  /* ================= [A] 결제 한 갈래 ================= */
  blk('[A] 결제 — 룬은 룬강화석으로만 오른다');
  {
    const d = await diaOnly(p);
    ok(d && d.diaSpent === 0 && d.tried === 0 && d.dLv === 0,
      '★ [A1] 룬강화석 0 · 다이아 100만 — 50회를 굴려도 **한 번도 안 통하고** 다이아는 한 푼도 안 나간다',
      d ? '다이아 Δ' + d.diaSpent + ' · 통과 ' + d.tried + '회 · Δlv ' + d.dLv : '못 읽음');
    const m = await ev(p, () => {
      S.rune = { r1: 5, r2: 0, r3: 0 }; S.rstone = 1e6; S.dia = 1e6;
      const d0 = S.dia, s0 = S.rstone, cost = runeCost(RN.r1, 5);
      const r = runeTry('r1');
      return { okr: r.ok, dia: d0 - S.dia, st: s0 - S.rstone, cost, pay: 'pay' in r };
    });
    ok(m && m.okr && m.dia === 0 && m.st === m.cost,
      '★ [A2] 룬강화석이 있으면 통하고, 나가는 것은 **룬강화석뿐**이다',
      m ? '다이아 Δ' + m.dia + ' · 룬강화석 −' + m.st + ' (1회분 ' + m.cost + ')' : '');
    ok(m && !m.pay, '[A3] `runeTry()` 결과에 `pay` 필드가 없다(갈래가 하나라 적을 자리가 없다)');
    const btn = await ev(p, () => {
      openTrain(); setTrSub('rune'); setRuneSub('r1'); S.rstone = 1e6; renderTrain();
      const bs = [...document.querySelectorAll('#trRunes .tr-rn .rbt')];
      return { n: bs.length, txt: bs.map(e => e.textContent.trim()).join(' | '),
        left: bs[0] ? bs[0].offsetLeft : -1, w: bs[0] ? bs[0].offsetWidth : -1,
        cardW: document.querySelector('#trRunes .tr-rn').offsetWidth };
    });
    ok(btn && btn.n === 1, '★ [A4] 룬 카드의 시도 버튼이 **하나**다(구 [다이아] 칸이 사라졌다)',
      btn ? btn.n + '개 · ' + btn.txt : '');
    ok(btn && btn.left * 2 + btn.w === btn.cardW,
      '[A5] 그 한 칸이 카드 가로 **정중앙**이다(빈 자리를 남긴 채 한쪽에 붙어 있지 않다)',
      btn ? 'left ' + btn.left + ' · w ' + btn.w + ' · 카드 ' + btn.cardW : '');
    const hits = (code.match(/RUNE_DIA|RUNE_HOLD_DIA|data-pay/g) || []).length;
    ok(hits === 0, '★ [A6] 제품 줄에 `RUNE_DIA`·`RUNE_HOLD_DIA`·`data-pay` **0건** (295-② 두 벌 금지)', hits + '건');
    const desc = await ev(p, () => (typeof CURINFO !== 'undefined' && CURINFO.rstone ? CURINFO.rstone.ways.join(' · ') : ''));
    ok(typeof desc === 'string' && desc.indexOf('다이아 50') < 0 && /교환/.test(desc),
      '[A7] 재화 안내의 획득처에서 «다이아 50개로 1회 대체» 가 빠지고 교환이 들어왔다', desc);
  }

  /* ================= [B] 교환 1:1 ================= */
  blk('[B] 교환 — 2종 · 수량 탭 · 1:1');
  {
    const shape = await ev(p, () => ({
      n: EXCHANGE.length, keys: EXCHANGE.map(x => x.k).join(','),
      fields: [...new Set(EXCHANGE.flatMap(x => Object.keys(x)))].sort().join(','),
      qtys: EX_QTYS.join(',')
    }));
    ok(shape && shape.n === 2 && shape.keys === 'relic,rstone',
      '★ [B1] 교환 품목이 **2종**(유물조각 · 룬강화석)이다 — 3단 묶음 카드 폐지', shape ? shape.keys : '');
    ok(shape && !/dia|rel\b|amount|qty/.test(shape.fields),
      '★ [B2] `EXCHANGE` 에 **수량·가격 필드가 없다** — 1:1 이 표가 아니라 구조다', shape ? shape.fields : '');
    ok(shape && shape.qtys === '1,10,100,MAX', '[B3] 수량 탭 4칸(×1 · ×10 · ×100 · MAX)', shape ? shape.qtys : '');
    const ui = await ev(p, () => {
      openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      const q = [...document.querySelectorAll('#shopList .cn-qty .q')];
      const cd = [...document.querySelectorAll('#shopList .cn-cd.rel')];
      return { q: q.length, on: q.filter(e => e.classList.contains('on')).length,
        cards: cd.length, lefts: cd.map(e => e.offsetLeft).join(','),
        tops: [...new Set(cd.map(e => e.offsetTop))].join(',') };
    });
    ok(ui && ui.q === 4 && ui.on === 1, '[B4] 화면에 수량 탭 4칸이 있고 **하나만** 켜져 있다',
      ui ? ui.q + '칸 · 켜짐 ' + ui.on : '');
    ok(ui && ui.cards === 2 && ui.lefts === '256,546',
      '[B5] 교환 카드가 2칸이고 **2열 중앙**(x256/546 — 365 선례)이다', ui ? ui.lefts : '');
    /* 실제 교환 — 수량을 ×10 으로 올리고 두 칸을 각각 누른다 */
    const buy = await ev(p, async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      S.dia = 1e6; S.relic = 0; S.rstone = 0; S.mailx = []; S.mailSeq = 0; S.mail = {};
      renderShopPage();
      document.querySelector('#shopList .cn-qty .q[data-exq="10"]').click();
      const n = exQtyN();
      /* ⓐ 유물조각 — **697 이후 룬강화석과 같은 처리**다(다이아 −n · 그 자리에서 +n · 우편 0).
         153 이 «유물조각만 우편» 으로 갈라 두었던 분기는 주인 지시로 사라졌다. */
      const d0 = S.dia, r0 = S.relic, m0 = S.mailx.length;
      document.querySelector('#shopList .bt.buy[data-ex="relic"]').click();
      await sleep(60);
      const relStep = { dia: d0 - S.dia, rel: S.relic - r0, mail: S.mailx.length - m0 };
      const relGot = relStep.rel;
      /* ⓑ 룬강화석 — 우편 스키마에 자리가 없어 즉시 지급(204 선례) */
      const d1 = S.dia, s0 = S.rstone, m1 = S.mailx.length;
      renderShopPage();
      document.querySelector('#shopList .bt.buy[data-ex="rstone"]').click();
      const stStep = { dia: d1 - S.dia, st: S.rstone - s0, mail: S.mailx.length - m1 };
      /* ⓒ 부족이면 한 푼도 안 나간다 */
      S.dia = 3; renderShopPage();
      const d2 = S.dia, s2 = S.rstone;
      document.querySelector('#shopList .bt.buy[data-ex="rstone"]').click();
      const poor = { dia: d2 - S.dia, st: S.rstone - s2 };
      return { n, relStep, relGot, stStep, poor };
    });
    ok(buy && buy.n === 10, '[B6] ×10 을 고르면 수량이 10 이다', buy ? String(buy.n) : '');
    ok(buy && buy.relStep.dia === buy.n && buy.relStep.rel === buy.n && buy.relStep.mail === 0,
      '★ [B7] 유물조각 — 다이아 −n · **그 자리에서** +n · 새 우편 0(697 — 153 의 갈래 폐지)',
      buy ? '다이아 −' + buy.relStep.dia + ' · 유물 +' + buy.relStep.rel + ' · 우편 ' + buy.relStep.mail : '');
    ok(buy && buy.relGot === buy.n, '[B8] 그 지급이 정확히 n 개다(1:1 완결)',
      buy ? '+' + buy.relGot : '');
    ok(buy && buy.stStep.dia === buy.n && buy.stStep.st === buy.n && buy.stStep.mail === 0,
      '★ [B9] 룬강화석 — 다이아 −n · **즉시** +n · 우편은 안 온다(697 이후 두 줄이 같은 처리다)',
      buy ? '다이아 −' + buy.stStep.dia + ' · 룬강화석 +' + buy.stStep.st : '');
    ok(buy && buy.poor.dia === 0 && buy.poor.st === 0,
      '[B10] 부족하면 다이아도 재화도 한 톨 안 움직인다', buy ? '다이아 Δ' + buy.poor.dia : '');
  }

  /* ================= [C] 입장권 1,000 ================= */
  blk('[C] 입장권 — 8종 전부 1,000 다이아');
  {
    const t = await ev(p, () => ({
      prices: DUNGEONS.map(d => dunExPrice(d.id)),
      ids: DUNGEONS.map(d => d.id).join(','),
      cst: typeof DUN_EX_PRICE === 'number' ? DUN_EX_PRICE : null,
      oldTab: typeof DUN_EX_BASE !== 'undefined' || typeof DUN_EX_K !== 'undefined'
    }));
    ok(t && t.prices.length === 8 && t.prices.every(v => v === 1000),
      '★ [C1] 8종 **전부** 1,000 다이아', t ? [...new Set(t.prices)].join(',') + ' (' + t.prices.length + '종)' : '');
    ok(t && t.cst === 1000, '[C2] 값의 출처가 상수 하나(`DUN_EX_PRICE`)다', t ? String(t.cst) : '');
    ok(t && !t.oldTab, '★ [C3] 구 계수표(`DUN_EX_BASE`/`DUN_EX_K`)가 런타임에 없다(295-② 두 벌 금지)');
    const buy = await ev(p, () => {
      S.dia = 5000; S.dunTk = S.dunTk || {};
      openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      const el = document.querySelector('#shopList .bt.buy[data-dunex]');
      const id = el.dataset.dunex, d0 = S.dia, k0 = S.dunTk[id] | 0;
      const shown = el.textContent.replace(/[^0-9]/g, '');
      el.click();
      return { shown, dia: d0 - S.dia, tk: (S.dunTk[id] | 0) - k0, id };
    });
    ok(buy && buy.dia === 1000 && buy.tk === 1,
      '[C4] 실제로 눌러도 1,000 이 나가고 입장권이 1장 는다', buy ? '−' + buy.dia + ' → +' + buy.tk + '장' : '');
    ok(buy && buy.shown === '1000', '[C5] 카드에 **찍힌 가격**도 1,000 이다(표기와 판정이 한 식)', buy ? buy.shown : '');
  }

  /* ================= [D] 초록 ================= */
  blk('[D] 색 — 룬강화석은 초록 · 수정 광산 입장권은 하늘색(430 개정)');
  {
    const cur = fillOf('cur-rstone.svg');
    const hc = cur ? hslH(rgbOf(cur)) : -1;
    ok(cur && hc >= 100 && hc <= 150,
      '★ [D1] 룬강화석 **재화 아이콘** 채움이 초록이다(hue 100~150°)', cur + ' h' + hc.toFixed(0) + '°');
    const tk = fillOf('cur-ticket-rstone.svg');
    const ht = tk ? hslH(rgbOf(tk)) : -1;
    ok(tk && ht >= 100 && ht <= 150, '[D2] 룬의 제단 **입장권**도 같은 초록 계열이다(430 개정)',
      tk + ' h' + ht.toFixed(0) + '°');
    const dia = fillOf('cur-ticket-dia.svg');
    const hd = dia ? hslH(rgbOf(dia)) : -1, ld = dia ? lab(rgbOf(dia))[0] : -1;
    ok(dia && hd >= 185 && hd <= 208, '★ [D3] 수정 광산 입장권이 **하늘색**이다(hue 185~208°)',
      dia + ' h' + hd.toFixed(0) + '° L*' + ld.toFixed(0));
    /* 초록끼리 서로 안 붙는가 — 룬 입장권 ↔ 룬강화석 재화는 «같은 계열» 이 맞지만
       룬 입장권 ↔ 수정 입장권은 이제 확실히 갈려야 한다(주인이 뒤집은 자리다) */
    const dE = (x, y) => { const a = lab(rgbOf(x)), c = lab(rgbOf(y)); return Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]); };
    ok(tk && dia && dE(tk, dia) >= 40, '[D4] 룬 초록 ↔ 수정 하늘색 ΔE ≥ 40', dE(tk, dia).toFixed(1));
    const bg = (src.match(/\.dnc\.bgm-rstone\{--bgc:(#[0-9A-Fa-f]{6})\}/) || [])[1];
    const hb = bg ? hslH(rgbOf(bg)) : -1;
    ok(bg && hb >= 100 && hb <= 150, '[D5] 03 던전 카드 안개(`--bgc`)도 같이 초록으로 왔다',
      bg + ' h' + hb.toFixed(0) + '°');
    /* 그려진 픽셀 — 선언이 아니라 화면이 초록인가(HUD 알약·13 교환 카드가 같은 파일을 읽는다) */
    const drawn = await ev(p, () => {
      openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      const n = document.querySelector('#shopList .cn-cd.rel [data-ex="rstone"], #shopList .cn-cd.rel .pn em');
      const img = document.querySelectorAll('#shopList .cn-cd.rel .pn em img.cic');
      return { n: img.length, srcs: [...img].map(e => (e.getAttribute('src') || '').split('/').pop()).join(',') };
    });
    ok(drawn && /cur-relic\.svg/.test(drawn.srcs) && /cur-rstone\.svg/.test(drawn.srcs),
      '[D6] 교환 카드 두 칸이 실제로 그 두 재화 아이콘을 그린다(125 단일 출처)', drawn ? drawn.srcs : '');
  }

  ok(b.errs.length === 0, '[Z1] 콘솔·페이지 에러 0건', b.errs.slice(0, 2).join(' | ') || '없음');
  await b.ctx.close();

  /* ================= [R] 되돌림 ================= */
  blk('[R] 되돌림 — 되살린 사본에서 [A]·[C] 가 빨개진다');
  {
    /* ⓐ 다이아 결제를 되살린다 — `runeTryOk`/`runeTry` 를 구 두 갈래로 */
    const A0 = `function runeTryOk(id){
  const r = RN[id];
  if(!r || !runeOpen(id) || runeMaxed(id)) return false;
  return S.rstone >= runeCost(r, runeLvOf(id));
}`;
    const A1 = `function runeTryOk(id){
  const r = RN[id];
  if(!r || !runeOpen(id) || runeMaxed(id)) return false;
  return S.dia >= 50 || S.rstone >= runeCost(r, runeLvOf(id));
}`;
    const B0 = `  const cost = runeCost(r, l);
  S.rstone -= cost;`;
    const B1 = `  const cost = runeCost(r, l);
  if(S.rstone >= cost) S.rstone -= cost; else S.dia -= 50;`;
    ok(src.indexOf(A0) >= 0 && src.indexOf(B0) >= 0, '[R0] 되돌림 앵커 둘이 제품에 있다(없으면 이 절이 공허하다)');
    const rev = src.replace(A0, A1).replace(B0, B1);
    const tmp = path.join(ROOT, `.v490-neg-${process.pid}.html`);
    fs.writeFileSync(tmp, rev);
    try {
      const b2 = await boot(browser, 'file://' + tmp);
      const d = await diaOnly(b2.page);
      ok(d && d.diaSpent > 0, '★ [R1] 다이아 결제를 되살린 사본에서는 다이아가 실제로 나간다(= [A1] 이 헛초록이 아니다)',
        d ? '다이아 Δ' + d.diaSpent + ' · 통과 ' + d.tried + '회' : '못 읽음');
      await b2.ctx.close();
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }

    /* ⓑ 옛 계수표를 되살린다 */
    const C0 = 'const DUN_EX_PRICE = 1000;\nconst dunExPrice = () => DUN_EX_PRICE;';
    const C1 = 'const DUN_EX_PRICE = 1000;\n'
      + 'const DUN_EX_BASE = 300;\n'
      + 'const DUN_EX_K = { gold:0.5, dia:0.8, relic1:1, relic2:Math.sqrt(2.5), relic3:Math.sqrt(6),'
      + ' relic4:Math.sqrt(15), stone:0.8, rstone:0.9 };\n'
      + 'const dunExPrice = id => Math.round(DUN_EX_BASE * (DUN_EX_K[id] || 1) / 10) * 10;';
    ok(src.indexOf(C0) >= 0, '[R2] 입장권 앵커가 제품에 있다');
    const rev2 = src.replace(C0, C1);
    const tmp2 = path.join(ROOT, `.v490-neg2-${process.pid}.html`);
    fs.writeFileSync(tmp2, rev2);
    try {
      const b3 = await boot(browser, 'file://' + tmp2);
      const t = await ev(b3.page, () => DUNGEONS.map(d => dunExPrice(d.id)));
      ok(t && !t.every(v => v === 1000),
        '★ [R3] 옛 계수표를 되살린 사본은 8종이 제각각이다(= [C1] 이 헛초록이 아니다)',
        t ? [...new Set(t)].sort((a, c) => a - c).join(',') : '못 읽음');
      await b3.ctx.close();
    } finally { try { fs.unlinkSync(tmp2); } catch (e) {} }
  }

  await browser.close();
  console.log('\nVERIFY490 ' + (fail ? 'FAIL — ' + fail + '건' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
