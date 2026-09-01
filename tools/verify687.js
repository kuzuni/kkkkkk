#!/usr/bin/env node
/* 게이트 — 작업 687 «룬 강화 화면에 보유 룬강화석 개수 표시» (2026-09-02, 저장소 주인 지시)
 *
 *   node tools/verify687.js
 *
 * 주인 원문: «룬강화 부분에 현재 갖고있는 룬강화석 개수 몇개인지 표시되게 해줘야함.
 *            일반룬 고급룬 천상룬 탭 위에 표시 되면 좋겟음»
 * 주인 보강(01:25): «(아이콘) 수량» 만 — 한글 «룬강화석» 라벨 금지 · 중앙 정렬.
 *
 * 절은 여섯 + 되돌림이다:
 *   [1] 전제   — 룬 탭이 열리고 헤더(#rnHd)와 그 안 아이콘·수가 실재한다
 *   [2] ★ 표시값 — 헤더의 수 = Math.floor(S.rstone) 그대로. 강화 1회(성공·실패 무관)로
 *                룬강화석이 나가면 **즉시** 줄어든 값이 찍힌다
 *   [3] ★ 표기 규약 — 아이콘(.cic img) 1장 + 수뿐이다(한글 라벨 0자) · 잉크가 헤더 가로 **중앙**
 *   [4] 자리   — 본문 머리(top 34)에 서고 하위 바(일반·고급·천상)가 그 **아래**로 · 겹침 0 ·
 *                훈련·단련 탭에서는 안 보인다 · 등급 탭을 갈아타도 값은 하나다(공용 재화)
 *   [5] 실시간 — 홀드 경로(liveRunes)가 통짜 렌더 없이도 헤더를 고쳐 쓴다(297 규약의 헤더판)
 *   [6] 두 프레임 — 9:19(2280)·9:13.3(1600) 모두 헤더가 시트 안에 온전하다(잘림 0)
 *   §R  되돌림 — 한글 라벨을 주입하면 [3]-라벨이, 아이콘을 빼면 [3]-아이콘이,
 *                헤더를 숨기면 [1]/[4] 가 **각각** 빨개진다(술어가 서로 다른 것을 잡는다)
 *
 * ⚑ 위임 규약(2026-09-01) 기록 — 룬강화석은 등급별 재화가 아니라 **공용 하나**(S.rstone)다.
 *   등재문 실측 순서 ① 의 답이 «전부 한 재화» 라 헤더도 하나·탭 전환 무관 같은 값이다([4-d]).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

const boot = async (browser, h) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  return { ctx, page, errs };
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, 2280);
  await page.evaluate(() => {
    S.gold = 1e12; S.dia = 1e6; S.rstone = 12345; S.tstone = 1e6; S.stage = 400;
    S.rune = { r1: 5, r2: 0, r3: 0 };
    markDirty(); openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await page.waitForTimeout(120);

  /* ══ [1] 전제 ═══════════════════════════════════════════════════════════ */
  console.log('[1] 전제 — 룬 탭 · 헤더 실재');
  const pre = await page.evaluate(() => {
    const hd = document.getElementById('rnHd');
    const i = hd && hd.querySelector('.pv i');
    return {
      hd: !!hd, disp: hd && getComputedStyle(hd).display,
      img: i ? i.querySelectorAll('img.cic').length : -1,
      txt: i ? i.textContent.replace(/\s+/g, ' ').trim() : null
    };
  });
  ok(pre.hd, '#rnHd 가 실재한다');
  ok(pre.disp === 'block', '룬 탭에서 헤더가 보인다', pre.disp);
  ok(pre.img === 1, '헤더 안 화폐 아이콘(.cic)이 정확히 1장', String(pre.img));

  /* ══ [2] ★ 표시값 = 실보유값 ════════════════════════════════════════════ */
  console.log('[2] ★ 표시값 — S.rstone 그대로 · 강화 1회 뒤 즉시 감소');
  const val = await page.evaluate(() => {
    const read = () => document.querySelector('#rnHd .pv i').textContent.replace(/\s+/g, ' ').trim();
    const t0 = read();
    S.rstone = 777; renderTrain();
    const t1 = read();
    /* 강화 1회 — 성공이든 실패든 비용은 나간다. runeBuy 가 renderTrain 을 부른다 */
    S.rstone = 5000; renderTrain();
    const cost = runeCost(RN.r1, runeLvOf('r1'));
    runeBuy('r1');
    const t2 = read();
    return { t0, t1, t2, cost, left: Math.floor(S.rstone), fmt777: fmt(777), fmtLeft: fmt(Math.floor(S.rstone)) };
  });
  ok(val.t0 === '12,345', '부팅 주입값 12,345 가 그대로 찍힌다(fmt · 150 규칙)', val.t0);
  ok(val.t1 === val.fmt777, '값을 바꾸면 따라 바뀐다(손으로 적은 수가 아니다)', val.t1);
  ok(val.t2 === val.fmtLeft && val.left === 5000 - val.cost,
    '★ 강화 1회 뒤 즉시 «5,000 − 비용» 이 찍힌다', val.t2 + ' (비용 ' + val.cost + ')');

  /* ══ [3] ★ 표기 규약 — 아이콘+수뿐 · 중앙 ═══════════════════════════════ */
  console.log('[3] ★ 표기 규약 — «(아이콘) 수량» 만 · 중앙 정렬(주인 보강 01:25)');
  const fmtc = await page.evaluate(() => {
    S.rstone = 12345; renderTrain();
    const hd = document.getElementById('rnHd');
    const i = hd.querySelector('.pv i');
    const hb = hd.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(i);
    const ib = rg.getBoundingClientRect();
    return {
      txt: i.textContent.replace(/\s+/g, ' ').trim(),
      hangul: (i.textContent.match(/[가-힣]/g) || []).length,
      imgs: i.querySelectorAll('img.cic').length,
      dCx: Math.abs((hb.left + hb.right) / 2 - (ib.left + ib.right) / 2),
      inX: ib.left >= hb.left && ib.right <= hb.right,
      inY: ib.top >= hb.top - 1 && ib.bottom <= hb.bottom + 1
    };
  });
  ok(/^[\d,]+$/.test(fmtc.txt), '★ 글자는 수(콤마 포함)뿐이다', '«' + fmtc.txt + '»');
  ok(fmtc.hangul === 0, '★ 한글 라벨 0자(«룬강화석» 금지 — 보강 01:25)', fmtc.hangul + '자');
  ok(fmtc.imgs === 1, '아이콘 1장(이모지 아님 — 125 규약 .cic)', String(fmtc.imgs));
  ok(fmtc.dCx <= 2, '★ 잉크(아이콘+수)가 헤더 가로 중앙이다(Δ≤2px)', 'Δ' + fmtc.dCx.toFixed(2) + 'px');
  ok(fmtc.inX && fmtc.inY, '잉크가 헤더 상자 안에 온전하다(잘림 0)');

  /* ══ [4] 자리 — 탭 «위» · 겹침 0 · 다른 탭에서는 없음 · 공용 재화 하나 ══ */
  console.log('[4] 자리 — 본문 머리 · 하위 바 위 · 탭별 가시성 · 공용 재화');
  const geo = await page.evaluate(() => {
    setTrSub('rune'); renderTrain();
    const box = document.querySelector('.tr-box').getBoundingClientRect();
    const R = s => { const e = document.querySelector(s); const r = e.getBoundingClientRect();
      return { x: r.x - box.x, y: r.y - box.y, w: r.width, h: r.height, bot: r.bottom - box.y }; };
    const hd = R('#rnHd'), bar = R('#rnSubs'), card = R('.tr-rn'),
          sum = R('.tr-runes>.rsum'), up = R('#trSubs');
    const ov = (a, b) => a.bot > b.y + 0.5 && b.bot > a.y + 0.5;
    const reads = [];
    ['r1', 'r2', 'r3'].forEach(id => {
      S.rune = { r1: 900, r2: 900, r3: 900 };   /* 셋 다 열어 탭 전환이 실제로 되게 */
      setRuneSub(id); renderTrain();
      reads.push(document.querySelector('#rnHd .pv i').textContent.trim());
    });
    setRuneSub('r1'); S.rune = { r1: 5, r2: 0, r3: 0 }; renderTrain();
    const vis = [];
    ['train', 'temper', 'rune'].forEach(t => { setTrSub(t); renderTrain();
      vis.push(getComputedStyle(document.getElementById('rnHd')).display); });
    return { hd, bar, ovHB: ov(hd, bar), ovHC: ov(hd, card),
             order: hd.bot <= bar.y + 0.5 && bar.bot <= card.y + 0.5
                    && card.bot <= sum.y + 0.5 && sum.bot <= up.y + 0.5,
             reads, vis };
  });
  ok(Math.round(geo.hd.y) === 24 && Math.round(geo.hd.h) === 88,
    '★ 헤더가 본문 머리(박스 local top 24 · h88 = .tp-hd 급)다', Math.round(geo.hd.y) + ' / ' + Math.round(geo.hd.h));
  ok(geo.hd.bot <= geo.bar.y + 0.5, '★ 하위 바(일반·고급·천상)가 헤더 **아래**다 — «탭 위에» 그대로',
    geo.hd.bot.toFixed(1) + ' ≤ ' + geo.bar.y.toFixed(1));
  ok(!geo.ovHB && !geo.ovHC, '헤더 ↔ 바 · 헤더 ↔ 카드 겹침 0');
  ok(geo.order, '세로 순서 — 헤더 → 하위 바 → 카드 → 요약 → 상위 바(침범 0)');
  ok(geo.reads[0] === geo.reads[1] && geo.reads[1] === geo.reads[2],
    '등급 탭을 갈아타도 값이 같다(룬강화석 = 등급 공용 재화 하나 — 위임 규약 기록)', geo.reads.join(' / '));
  ok(geo.vis[0] === 'none' && geo.vis[1] === 'none' && geo.vis[2] === 'block',
    '훈련·단련 탭에서는 없고 룬 탭에서만 보인다', geo.vis.join(' / '));

  /* ══ [5] 실시간 — 홀드 경로(liveRunes)가 헤더를 고쳐 쓴다 ═══════════════ */
  console.log('[5] 실시간 — liveRunes 경로(297 규약의 헤더판)');
  const live = await page.evaluate(() => {
    setTrSub('rune'); renderTrain();
    const read = () => document.querySelector('#rnHd .pv i').textContent.trim();
    S.rstone = 4444;            /* 통짜 렌더 없이 값만 바꾼다 */
    const before = read();
    liveRunes(curRuneId());     /* 홀드 중 «숫자만» 경로 */
    const after = read();
    renderTrain();
    return { before, after, want: fmt(4444) };
  });
  ok(live.before !== live.after && live.after === live.want,
    '★ 통짜 렌더 없이 liveRunes 만으로 헤더가 갱신된다(홀드 중 실시간 감소의 기계)',
    live.before + ' → ' + live.after);
  ok(/runeHeadPut\(\)/.test(CODE) && CODE.split('runeHeadPut()').length >= 3,
    '소스에 runeHeadPut() 호출이 두 경로(renderRunes · liveRunes) 이상에 있다');

  /* ══ [6] 두 프레임 ══════════════════════════════════════════════════════ */
  console.log('[6] 두 프레임 — 9:19(2280) · 9:13.3(1600)');
  const frame = async h => {
    const { ctx: c2, page: p2 } = await boot(browser, h);
    const r = await p2.evaluate(() => {
      S.rstone = 12345; openTrain(); setTrSub('rune'); renderTrain();
      const hd = document.getElementById('rnHd').getBoundingClientRect();
      const sheet = document.querySelector('.tr-sheet').getBoundingClientRect();
      const bar = document.getElementById('rnSubs').getBoundingClientRect();
      return { inSheet: hd.top >= sheet.top - 0.5 && hd.bottom <= sheet.bottom + 0.5,
               above: hd.bottom <= bar.top + 0.5,
               inView: hd.top >= 0 && hd.bottom <= innerHeight,
               y: hd.top, h: hd.height };
    });
    await c2.close();
    return r;
  };
  const f19 = await frame(2280), f13 = await frame(1600);
  ok(f19.inSheet && f19.above && f19.inView, '9:19 — 헤더가 시트·뷰포트 안 · 바 위', 'y ' + f19.y.toFixed(0));
  ok(f13.inSheet && f13.above && f13.inView, '9:13.3 — 헤더가 시트·뷰포트 안 · 바 위', 'y ' + f13.y.toFixed(0));
  ok(Math.round(f19.h) === Math.round(f13.h), '두 프레임에서 헤더 높이가 같다(UI 절대값 규약)',
    f19.h + ' / ' + f13.h);

  /* ══ §R 되돌림 — 술어가 서로 다른 것을 잡는다 ═══════════════════════════ */
  console.log('§R 되돌림 — 일부러 깨 보고 이 게이트가 잡는지(LESSONS 43-①)');
  const rev = await page.evaluate(() => {
    setTrSub('rune'); S.rstone = 12345; renderTrain();
    const hd = document.getElementById('rnHd');
    const i = hd.querySelector('.pv i');
    const keep = i.innerHTML;
    const read = () => ({ txt: i.textContent.replace(/\s+/g, ' ').trim(),
                          hangul: (i.textContent.match(/[가-힣]/g) || []).length,
                          imgs: i.querySelectorAll('img.cic').length });
    i.innerHTML = keep.replace('<b>', ' 룬강화석 <b>');   /* R1 — 한글 라벨 부활(613 옛 꼴) */
    const r1 = read();
    i.innerHTML = fmt(12345);                              /* R2 — 아이콘 없는 «수만» */
    const r2 = read();
    i.innerHTML = keep;
    hd.style.display = 'none';                             /* R3 — 헤더 소멸 */
    const r3 = getComputedStyle(hd).display;
    hd.style.display = '';
    return { r1, r2, r3, back: read(), backDisp: getComputedStyle(hd).display };
  });
  ok(rev.r1.hangul > 0, '[R-a] 한글 라벨을 주입하면 [3]-라벨 술어가 거짓이 된다', rev.r1.hangul + '자');
  ok(rev.r2.imgs === 0 && /^[\d,]+$/.test(rev.r2.txt),
    '[R-b] 아이콘을 빼면 [1]/[3]-아이콘 술어만 거짓이 된다', '아이콘 ' + rev.r2.imgs + '장');
  ok(rev.r3 === 'none', '[R-c] 헤더를 숨기면 [1]-표시 술어가 거짓이 된다', rev.r3);
  ok(rev.back.hangul === 0 && rev.back.imgs === 1 && rev.backDisp === 'block',
    '[R-d] 원복하면 다시 초록이다', '«' + rev.back.txt + '»');

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log(`\nVERIFY687 ${pass}/${pass + fail}` + (fail ? `  ← FAIL ${fail}건` : ''));
  await ctx.close(); await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
