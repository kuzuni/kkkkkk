#!/usr/bin/env node
/* 작업 726 재현 프로브 — «일괄 강화 결과 팝업이 20개+ 강화해도 6개밖에 안 뜬다»
 *
 *   node tools/probe726.js
 *
 * 338·341·350·363·372·429·654·683 규칙 — **처방을 따르기 전에 등재문의 주장이 참인지
 * 제품에게 직접 묻는다.** 주인 원문: «강화를 분명히 20개 넘게 일괄강화했는데 강화결과가
 * 6개밖에 안뜨더라 … 장비, 스킬, 펫 전부».
 *
 * 등재문이 가르라고 한 것은 **딱 하나** — «표시만 잘리는가, 결과 «데이터» 도 6개만 남는가»
 * (723 과 같은 질문). 그래서 이 자는 한 번의 일괄 강화에서 **세 수를 동시에** 찍는다:
 *   ⓐ 세이브가 실제로 올린 아이템 수  — `S.own[id].l` 을 강화 전후로 대조(제품의 진실)
 *   ⓑ `levelUpAll()` 이 만든 `ups` 길이 — 팝업에 넘어간 «데이터»(호출부를 감싸서 가로챈다)
 *   ⓒ `#upCards` 에 실제로 그려진 카드 수 — 주인이 센 그 숫자
 *
 * 절:
 *   [1] 장비(05 무기) — ⓐ=ⓑ=ⓒ 여야 한다 (**수리 전 ⓒ 만 6 = 등재문이 참**)
 *   [2] 스킬(07)      — 같은 축
 *   [3] 펫(26)        — 같은 축
 *   [4] 데이터는 안 잘린다 — ⓐ=ⓑ (**수리 전·후 같은 답** = 구조축. 여기가 빨가면
 *                          «표시 상한» 이 아니라 «데이터 상한» 이라 처방이 통째로 달라진다)
 *   [5] 잘림 — 그려진 카드가 프레임(1080x2280) 밖으로 나가지 않는가
 *   [6] 콘솔 에러 0
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다. [4]·[5]·[6] 은 구조축(양쪽 같은 답),
 *   [1-c]·[2-c]·[3-c] 는 «등재문이 참인가» 를 묻는 자리라 **수리 전에 빨간 것이 정상**이다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const SEED_FRAG = 30;      /* fragNeed 1→2,6,7,8 ⇒ 30 개면 Lv1 → Lv5 (건당 4레벨) */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* `openUpAll` 을 감싼다 — 넘어온 `ups` 길이(ⓑ)를 그 자리에서 받는다.
   `levelUpAll` 이 아니라 팝업 진입점을 감싸는 이유: «데이터가 팝업까지 도달한 수» 가
   ⓒ 와 짝을 이루는 값이라서다(중간에 자르는 자리가 있으면 여기서 이미 갈린다). */
const WATCH = () => {
  window.__p726 = { calls: [] };
  const orig = window.openUpAll;
  window.openUpAll = function (ups) {
    window.__p726.calls.push(ups ? ups.length : 0);
    return orig.apply(this, arguments);
  };
};

/* 한 시트분 표본 — 앞 `n` 종에 조각을 심고 레벨 1 로 맞춘다.
   `S.own` 을 비우지 않는다(부팅 지급분까지 세면 기대값이 흐려지므로 «심은 종» 만 센다). */
const SEED = ({ kind, n, frag }) => {
  const list = kind === 'skill' ? SKILLS : kind === 'pet' ? PETS : wpnList();
  const ids = list.slice(0, n).map(it => it.id);
  ids.forEach(id => { S.own[id] = { n: frag, l: 1 }; });
  /* 나머지 종은 강화 불가로 눌러 둔다 — 기대값 = 심은 종 수 */
  list.slice(n).forEach(it => { if (S.own[it.id]) S.own[it.id].n = 0; });
  save();
  window.__p726.before = {};
  ids.forEach(id => { window.__p726.before[id] = S.own[id].l; });
  window.__p726.ids = ids;
  window.__p726.calls = [];
  return { want: ids.length, listLen: list.length };
};

/* 강화 후 — 실제로 레벨이 오른 종 수(ⓐ) · 팝업에 그려진 카드 수(ⓒ) · 카드 bbox */
const READ = () => {
  const st = window.__p726;
  const raised = st.ids.filter(id => S.own[id] && S.own[id].l > st.before[id]).length;
  const cards = [...document.querySelectorAll('#upCards .upr-cel')];
  const app = document.getElementById('app').getBoundingClientRect();
  const boxes = cards.map(c => {
    const r = c.getBoundingClientRect();
    return { x: r.left - app.left, y: r.top - app.top, w: r.width, h: r.height };
  });
  const grid = document.getElementById('upCards');
  const g = grid.getBoundingClientRect();
  return {
    raised,
    ups: st.calls.length ? st.calls[st.calls.length - 1] : -1,
    drawn: cards.length,
    on: document.getElementById('upw').classList.contains('on'),
    boxes,
    grid: { x: g.left - app.left, y: g.top - app.top, w: g.width, h: g.height,
            sh: grid.scrollHeight, ch: grid.clientHeight },
    app: { w: app.width, h: app.height },
    lv: cards.map(c => (c.querySelector('.upr-lv') || {}).textContent || '')
  };
};

/* 시트별 실제 클릭 경로 — 주인이 누른 그 버튼이다(합성 호출이 아니다) */
/* ⚠ `goTab('hero')` 는 **이미 열린 탭을 다시 누르면 패널을 닫는다**(A1 규약) —
   시트를 연속으로 오갈 때 그냥 부르면 두 번째 시트가 통째로 안 열린다(1회차에 실제로 그랬다). */
const OPEN = async (page, kind) => {
  if (kind === 'skill') {
    await ev(page, () => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo('sk'); uiDirty = true; renderUI(); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.querySelector('#bSk [data-skup]').click(); });
  } else if (kind === 'pet') {
    await ev(page, () => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo('pet'); uiDirty = true; renderUI(); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.querySelector('#bPet [data-ptup]').click(); });
  } else {
    await ev(page, () => { openWeapon ? openWeapon('wpn') : 0; });
    await page.waitForTimeout(250);
    await ev(page, () => { document.getElementById('wpnBtnUp').click(); });
  }
  await page.waitForTimeout(400);
};

const CLOSE = page => ev(page, () => { closeUpAll(); });

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(700);
  await ev(page, WATCH);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser);

  const SHEETS = [
    { key: 'equip', ko: '장비(05 무기)', n: 24, sec: '1' },
    { key: 'skill', ko: '스킬(07)',      n: 24, sec: '2' },
    { key: 'pet',   ko: '펫(26)',        n: 24, sec: '3' }
  ];
  const seen = [];

  for (const s of SHEETS) {
    blk('[' + s.sec + '] ' + s.ko + ' — 20개+ 일괄 강화');
    const seed = await ev(page, SEED, { kind: s.key, n: s.n, frag: SEED_FRAG });
    if (!seed) { ok(false, '[' + s.sec + '-0] 표본 심기'); continue; }
    info('표본', '심은 종 ' + seed.want + ' / 목록 ' + seed.listLen + '종');
    await OPEN(page, s.key);
    const r = await ev(page, READ);
    if (!r) { ok(false, '[' + s.sec + '-0] 읽기'); continue; }
    seen.push({ s, r, want: seed.want });

    info('실측', 'ⓐ 세이브 상승 ' + r.raised + ' · ⓑ ups ' + r.ups + ' · ⓒ 그려진 카드 ' + r.drawn);
    ok(r.on, '[' + s.sec + '-a] 팝업이 떴다');
    ok(r.raised === seed.want,
       '[' + s.sec + '-b] ⓐ 강화 자체는 전부 적용됐다', 'raised ' + r.raised + ' / want ' + seed.want);
    ok(r.drawn === r.raised,
       '[' + s.sec + '-c] ⓒ 그려진 카드 = 실제 강화 건수  ★수리 전 빨강이 정상',
       '그림 ' + r.drawn + ' / 실제 ' + r.raised);
    await CLOSE(page);
    await page.waitForTimeout(120);
  }

  blk('[4] 데이터는 잘리지 않는다 (구조축 — 수리 전·후 같은 답)');
  for (const { s, r, want } of seen) {
    ok(r.ups === r.raised && r.ups === want,
       '[4-' + s.sec + '] ⓑ ups 길이 = ⓐ 실제 강화 건수 (' + s.ko + ')',
       'ups ' + r.ups + ' / raised ' + r.raised + ' / want ' + want);
  }
  info('판정', seen.every(x => x.r.ups === x.r.raised)
    ? '데이터는 온전하다 ⇒ 결손은 **표시 상한** 한 곳이다'
    : '⚠ 데이터도 잘린다 ⇒ 처방이 달라진다(팝업이 아니라 수집 경로)');

  blk('[5] 잘림 — 그려진 카드가 프레임 밖으로 나가지 않는다 (구조축)');
  for (const { s, r } of seen) {
    const out = r.boxes.filter(b => b.x < 0 || b.y < 0 || b.x + b.w > r.app.w + 0.5 || b.y + b.h > r.app.h + 0.5);
    ok(out.length === 0, '[5-' + s.sec + '] 프레임 밖 카드 0 (' + s.ko + ')',
       out.length ? JSON.stringify(out[0]) : '0/' + r.boxes.length);
    info('  격자', 'y ' + Math.round(r.grid.y) + ' h ' + Math.round(r.grid.h)
      + ' · scrollH ' + Math.round(r.grid.sh) + ' / clientH ' + Math.round(r.grid.ch)
      + (r.grid.sh > r.grid.ch + 1 ? ' (스크롤 있음)' : ' (스크롤 없음)'));
    if (r.lv.length) info('  첫 칸 «Lv a→b»', JSON.stringify(r.lv[0]));
  }

  blk('[6] 콘솔');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  console.log('\nPROBE726 ' + pass + '/' + (pass + fail) + (fail ? '  ❌ FAIL ' + fail : '  ✅'));
  await ctx.close(); await browser.close();
  process.exit(fail ? 1 : 0);
})();
