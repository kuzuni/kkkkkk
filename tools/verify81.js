/* 작업 81 — 10 상점 페이지 상단 41 재화 바(.pcb) 검증 (검증 (가): 비평가 없음).
   ① #shopw .pcb 가 #dunw .pcb 와 위치·크기 Δ0 (rect 비교 + 밴드 픽셀 diff)
   ② 첫 카드가 바에 가려지지 않음
   ③ 유료 10연 소환 → S.dia 즉시 감소 + 바 숫자 갱신
   ④ 재화 비행 도착지(fxPill)가 상점 바의 알약
   ⑤ 콘솔 에러 0
   실행: node tools/verify81.js   캡처: docs/review/81-shop.png · 81-dun.png */
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */

let pass = 0, fail = 0;
const ck = (name, ok, info) => {
  console.log((ok ? '  ✅ ' : '  ❌ ') + name + (info ? ' — ' + info : ''));
  ok ? pass++ : fail++;
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  /* 전투 킬 골드 «도착 펀치»(fx-punch, 420ms 펄스)가 캡처 타이밍에 따라 알약 픽셀을 바꾼다 —
     밴드 diff 의 결정성을 위해 하네스에서만 펄스를 끈다(제품 동작은 그대로). */
  await p.addStyleTag({ content: '.fx-punch{animation:none !important;outline:none !important}' });
  await p.waitForTimeout(900);

  /* ── 상점 페이지 열고 rect 채집 ── */
  const shop = await p.evaluate(() => {
    /* 자동 전투가 캡처 사이에 골드를 계속 올리므로, 킬 수입으로는 표시 자릿수(1.00B)가
       안 바뀌는 큰 값으로 고정한다 — 밴드 픽셀 diff 가 숫자 롤링에 오염되지 않게. */
    S.dia = 5000; S.gold = 5e9;   /* 5.00B — 표시가 5.01B 로 바뀌려면 +5M 필요, 킬 수입으로는 캡처 사이에 불변 */
    openShopPage();
    fxNow = true;
    const r = (el) => { const x = el.getBoundingClientRect(); return { x: x.x, y: x.y, w: x.width, h: x.height }; };
    const bar = document.querySelector('#shopw .pcb');
    const card = document.querySelector('#shopList .shp-card, #shopList > *');
    return {
      bar: r(bar), g: r(bar.querySelector('.pcb-g')), d: r(bar.querySelector('.pcb-d')),
      card: card ? r(card) : null,
      pillIsShop: !!(fxPill(FXCUR.dia) && fxPill(FXCUR.dia).closest('#shopw')),
    };
  });
  await p.waitForTimeout(2200);
  const diaTxtOk = await p.evaluate(() => {
    const t = document.querySelector('#shopw .pcb-d>b').textContent;
    return { t, want: fmt(S.dia), ok: t === fmt(S.dia) };
  });
  await p.screenshot({ path: 'docs/review/81-shop.png' });

  /* ── 던전 페이지로 전환해 같은 rect 채집 ── */
  const dun = await p.evaluate(() => {
    if (typeof closeShopPage === 'function') closeShopPage(); else document.getElementById('shopw').classList.remove('on');
    openDungeon();
    const r = (el) => { const x = el.getBoundingClientRect(); return { x: x.x, y: x.y, w: x.width, h: x.height }; };
    const bar = document.querySelector('#dunw .pcb');
    return { bar: r(bar), g: r(bar.querySelector('.pcb-g')), d: r(bar.querySelector('.pcb-d')),
      pillIsDun: !!(fxPill(FXCUR.dia) && fxPill(FXCUR.dia).closest('#dunw')) };
  });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: 'docs/review/81-dun.png' });

  const d0 = (a, c) => Math.abs(a.x - c.x) < 0.5 && Math.abs(a.y - c.y) < 0.5
    && Math.abs(a.w - c.w) < 0.5 && Math.abs(a.h - c.h) < 0.5;
  ck('바 rect Δ0 (#shopw vs #dunw)', d0(shop.bar, dun.bar), JSON.stringify(shop.bar) + ' vs ' + JSON.stringify(dun.bar));
  ck('골드 알약 rect Δ0', d0(shop.g, dun.g));
  ck('다이아 알약 rect Δ0', d0(shop.d, dun.d));
  ck('첫 카드가 바에 안 가림 (card.y ≥ bar.y+bar.h)', !!shop.card && shop.card.y >= shop.bar.y + shop.bar.h,
    shop.card && ('card.y=' + shop.card.y.toFixed(0) + ' barBottom=' + (shop.bar.y + shop.bar.h).toFixed(0)));
  ck('바 숫자 = fmt(S.dia)', diaTxtOk.ok, diaTxtOk.t + ' vs ' + diaTxtOk.want);
  ck('fxPill: 상점 열림 → 도착지가 #shopw 바', shop.pillIsShop);
  ck('fxPill: 던전 열림 → 도착지가 #dunw 바', dun.pillIsDun);

  /* ── 바 밴드 픽셀 diff (프레임 y0~112) ── */
  const A = PNG.sync.read(fs.readFileSync('docs/review/81-shop.png'));
  const B = PNG.sync.read(fs.readFileSync('docs/review/81-dun.png'));
  let diff = 0;
  for (let y = 0; y < 108; y++) for (let x = 0; x < 1080; x++) {
    const i = (y * A.width + x) * 4;
    if (Math.abs(A.data[i] - B.data[i]) > 6 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 6
      || Math.abs(A.data[i + 2] - B.data[i + 2]) > 6) diff++;
  }
  ck('바 밴드(1080×108) 픽셀 diff < 0.5%', diff < 1080 * 108 * 0.005, diff + 'px 다름');

  /* ── 유료 10연 소환 → 다이아 즉시 감소 + 바 갱신 ── */
  const sum = await p.evaluate(async () => {
    closeDungeon();
    openShopPage();
    const before = S.dia;
    /* 73 ③ — 가이드 소환 미션이 특정 배너만 허용하므로 그 배너의 유료 10연을 누른다 */
    const need = typeof gmBan === 'function' ? gmBan() : null;
    const btn = document.querySelector('#shopList .cbtn.b2[data-shsum' + (need ? '="' + need + '"' : '') + ']');
    if (!btn) return { err: 'b2 버튼 없음 (need=' + need + ')' };
    btn.click();
    await new Promise((r) => setTimeout(r, 1800));
    return { before, after: S.dia,
      barTxt: document.querySelector('#shopw .pcb-d>b').textContent,
      barWant: fmt(S.dia) };
  });
  ck('10연 소환 → S.dia 감소', !sum.err && sum.after < sum.before, sum.err || (sum.before + ' → ' + sum.after));
  ck('바 숫자 = 감소한 값', !sum.err && sum.barTxt === sum.barWant, 'bar=' + sum.barTxt + ' want=' + sum.barWant);

  ck('콘솔 에러 0', errs.length === 0, errs.join(' | ').slice(0, 300));
  console.log('VERIFY81 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
