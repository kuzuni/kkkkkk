#!/usr/bin/env node
/* 게이트 — 작업 318 「출석 보상 레드닷 — 받을 수 있으면 «해당 버튼» 에」 (저장소 주인 지시 2026-08-28)
 *
 *   node tools/verify318.js
 *
 * 지키는 성질: **오늘 출석 보상을 받을 수 있으면 그 경로 전체에 레드닷이 뜨고, 받으면 전부 꺼진다.**
 *   ① 진입 버튼 — 좌측 사이드 «출석» 아이콘(`.ibtn[data-pop="attend"].on > .bdg`)
 *   ② 70 팝업 «오늘 카드»(`[data-att]`) — 293·294·301 규약: 진입 버튼 배지는 팝업을 여는 순간
 *      딤(`#modal` z30 > `.side` z3) 아래로 들어가 화면에서 사라진다. 경로의 다음 칸까지 잇는다.
 *   ③ 음성 — 수령하면 ①② 가 같은 틱에 꺼지고, 같은 날 다시 열어도 안 켜진다.
 *   ④ 166 규약 — «받을 수 없는 칸»(수령 완료 `got` · 미래 칸)에는 배지가 아예 없다.
 *   ⑤ 299 규약 — 배지 중심이 호스트(카드) 우상단 사분면.
 *
 * 판정은 «논리(class·computed display)» 와 «화소(배지 bbox 안 빨강 수)» 를 **같이** 본다 —
 * 292 «열렸는가 ≠ 보이는가» · 189-③ «헛초록» 처방. 클릭은 전부 진짜 포인터 클릭이다(LESSONS 65-②).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* 배지 하나의 «논리 + 화소» — 안 보이면 red = 0 이다.
   ⚠ 60 쥬시 `jzDotIn`(.3s, scale 0→1)이 방금 시작했으면 rect 가 0 으로 잡힌다(104·202 §3 함정).
   재기 전에 충분히 기다리고, 그래도 흔들리지 않게 `animation:none` 을 잠깐 강제한다. */
async function badge(page, sel) {
  const s = await page.evaluate((q) => {
    const e = document.querySelector(q);
    if (!e) return { exists: false };
    const prevA = e.style.animation; e.style.animation = 'none';
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const out = { exists: true, display: cs.display, opacity: +cs.opacity, visibility: cs.visibility,
                  rect: [r.left, r.top, r.width, r.height] };
    e.style.animation = prevA;
    return out;
  }, sel);
  if (!s.exists) return { exists: false, red: 0 };
  const [x, y, w, h] = s.rect;
  s.red = 0;
  if (w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H) {
    const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
    s.red = await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i+1] < 110 && d[i+2] < 130) n++;
      return n;
    }, buf.toString('base64'));
  }
  return s;
}

async function boot(browser, att) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 500, best: 30, totalKills: 500, att })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openAttend === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춰 화소 판정이 흔들리지 않게 한다(다른 게이트와 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; });
  return { page, errs };
}

const SIDE = '.side .ibtn[data-pop="attend"]';
const SIDE_BDG = SIDE + ' .bdg';
const CARD_DOT = '#mbox [data-att] > s.updot';

(async () => {
  const browser = await launch(chromium);

  /* ══ A. 그리드 칸(3일차) — 미출석 → 수령 → 같은 날 재확인 ══════════════════ */
  const { page, errs } = await boot(browser, { n: 3, date: '' });

  /* ── [1] 진입 버튼 ── */
  const st0 = await page.evaluate(() => ({
    can: S.att.date !== today(),
    on: document.querySelector('.side .ibtn[data-pop="attend"]').classList.contains('on'),
  }));
  const sb0 = await badge(page, SIDE_BDG);
  ok(st0.can === true, '[1] 오늘 미출석 상태다 (판정 재료)', 'can=' + st0.can);
  ok(st0.on === true, '[1] 사이드 «출석» 버튼에 `.on`');
  ok(sb0.display === 'block' && sb0.red > 100,
    '[1] 사이드 배지가 «논리 + 화소» 로 실제 보인다', 'display=' + sb0.display + ' 빨강=' + sb0.red + '화소');

  /* ── [2] 팝업을 열면 진입 버튼 배지는 딤 아래로 사라진다 (경로가 한 칸 짧았다는 근거) ── */
  await page.click(SIDE);
  await page.waitForTimeout(800);
  const covered = await page.evaluate((q) => {
    const e = document.querySelector(q), r = e.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { open: document.getElementById('modal').classList.contains('at70'),
             hit: top ? (top.id ? '#' + top.id : top.className) : null };
  }, SIDE_BDG);
  ok(covered.open === true, '[2] 사이드 버튼 클릭 → 70 출석 팝업이 열린다');
  ok(covered.hit === '#modal', '[2] 그 순간 사이드 배지는 딤 아래다 (신호가 화면에서 사라진다)', String(covered.hit));

  /* ── [3] 팝업 «오늘 카드» 배지 — 여기가 318 이 새로 잇는 칸 ── */
  const cards = await page.evaluate(() => {
    const all = [...document.querySelectorAll('#mbox .at-c, #mbox .at-c7')];
    const t = document.querySelector('#mbox [data-att]');
    return {
      n: all.length,
      todayIsAlert: t ? t.classList.contains('alert') : null,
      todayDots: t ? t.querySelectorAll('.updot').length : null,
      otherDots: all.filter(c => c !== t).reduce((s, c) => s + c.querySelectorAll('.updot').length, 0),
      gotN: all.filter(c => c.classList.contains('got')).length,
    };
  });
  ok(cards.todayIsAlert === true, '[3] «오늘 카드» 에 `.alert`');
  ok(cards.todayDots === 1, '[3] «오늘 카드» 에 레드닷 노드 1개', String(cards.todayDots));
  ok(cards.otherDots === 0 && cards.gotN === 3,
    '[3] 166 규약 — 받을 수 없는 칸(수령 완료·미래)에는 레드닷 0개',
    '수령완료 ' + cards.gotN + '칸 · 나머지 닷 ' + cards.otherDots);
  const cd = await badge(page, CARD_DOT);
  ok(cd.exists && cd.display === 'block' && cd.red > 100,
    '[3] 카드 배지가 «논리 + 화소» 로 실제 보인다', 'display=' + cd.display + ' 빨강=' + cd.red + '화소');

  /* ── [4] 299 규약 — 중심이 카드 우상단 사분면 ── */
  const quad = await page.evaluate(() => {
    const d = document.querySelector('#mbox [data-att] > s.updot'), h = d && d.closest('.at-c,.at-c7');
    if (!d || !h) return null;
    const pa = d.style.animation; d.style.animation = 'none';
    const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
    d.style.animation = pa;
    return { cx: dr.left + dr.width / 2 - hr.left, cy: dr.top + dr.height / 2 - hr.top,
             hw: hr.width, hh: hr.height };
  });
  ok(quad && quad.cx > quad.hw / 2 && quad.cy < quad.hh / 2,
    '[4] 299 규약 — 배지 중심이 카드 우상단 사분면',
    quad ? 'cx ' + quad.cx.toFixed(1) + '/' + quad.hw + ' · cy ' + quad.cy.toFixed(1) + '/' + quad.hh : '없음');

  /* ── [5] 166 호스트 감사 — 조건 클래스를 떼면 꺼지고 붙이면 켜진다 ── */
  const audit = await page.evaluate(() => {
    const h = document.querySelector('#mbox [data-att]'), e = h && h.querySelector('.updot');
    if (!e) return null;
    h.classList.remove('alert'); const off = getComputedStyle(e).display;
    h.classList.add('alert');    const on = getComputedStyle(e).display;
    return { off, on };
  });
  ok(audit && audit.off === 'none' && audit.on === 'block',
    '[5] 배지 «.at-c>.updot» — `.alert` 없으면 꺼짐 / 있으면 켜짐',
    audit ? audit.off + ' → ' + audit.on : '없음');

  /* ── [6] 음성 시험 — 수령하면 ①② 가 같이 꺼진다 ── */
  const before = await page.evaluate(() => ({ n: S.att.n, dia: S.dia }));
  await page.click('#mbox [data-att]');
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => ({
    n: S.att.n, dia: S.dia, date: S.att.date, today: today(),
    sideOn: document.querySelector('.side .ibtn[data-pop="attend"]').classList.contains('on'),
    popDots: document.querySelectorAll('#mbox .updot').length,
    todayCard: !!document.querySelector('#mbox [data-att]'),
  }));
  ok(after.n === before.n + 1 && after.date === after.today,
    '[6] 진짜 수령됐다 (S.att.n +1 · 날짜 기록)', 'n ' + before.n + '→' + after.n + ' · date=' + after.date);
  ok(after.popDots === 0 && after.todayCard === false,
    '[6] 음성 — 수령 즉시 팝업 안 레드닷 0개', '닷 ' + after.popDots + ' · 오늘칸 ' + after.todayCard);
  ok(after.sideOn === false, '[6] 음성 — 수령 즉시 사이드 «출석» 배지 꺼짐');
  const sb1 = await badge(page, SIDE_BDG);
  ok(sb1.display === 'none' && sb1.red === 0,
    '[6] 음성 — 사이드 배지 화소도 0', 'display=' + sb1.display + ' 빨강=' + sb1.red);

  /* ── [7] 같은 날 다시 열어도 안 켜진다 (renderUI 주기가 되살리지 않는지) ── */
  await page.evaluate(() => { closeModal(); uiDirty = true; renderUI(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => { uiDirty = true; renderUI(); });
  await page.waitForTimeout(400);
  await page.click(SIDE);
  await page.waitForTimeout(700);
  const again = await page.evaluate(() => ({
    sideOn: document.querySelector('.side .ibtn[data-pop="attend"]').classList.contains('on'),
    popDots: document.querySelectorAll('#mbox .updot').length,
    alerts: document.querySelectorAll('#mbox .at-c.alert, #mbox .at-c7.alert').length,
  }));
  ok(again.sideOn === false && again.popDots === 0 && again.alerts === 0,
    '[7] 같은 날 재진입 — 두 자리 다 꺼진 채다',
    '사이드 ' + again.sideOn + ' · 닷 ' + again.popDots + ' · alert칸 ' + again.alerts);
  await page.evaluate(() => closeModal());

  ok(errs.length === 0, '[8] 콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');
  await page.context().close();

  /* ══ B. 7일차 카드(.at-c7)도 같은 규약을 받는가 ═══════════════════════════ */
  const b = await boot(browser, { n: 6, date: '' });
  await b.page.click(SIDE);
  await b.page.waitForTimeout(900);
  const sev = await b.page.evaluate(() => {
    const t = document.querySelector('#mbox [data-att]');
    return { isC7: !!t && t.classList.contains('at-c7'), alert: !!t && t.classList.contains('alert'),
             dots: t ? t.querySelectorAll('.updot').length : 0,
             others: [...document.querySelectorAll('#mbox .at-c, #mbox .at-c7')]
               .filter(c => c !== t).reduce((s, c) => s + c.querySelectorAll('.updot').length, 0) };
  });
  ok(sev.isC7 === true && sev.alert === true && sev.dots === 1 && sev.others === 0,
    '[9] 7일차 카드(.at-c7)도 «오늘» 이면 레드닷 1개 (나머지 0)',
    'c7 ' + sev.isC7 + ' · alert ' + sev.alert + ' · 닷 ' + sev.dots + '/' + sev.others);
  const cd7 = await badge(b.page, CARD_DOT);
  ok(cd7.exists && cd7.display === 'block' && cd7.red > 100,
    '[9] 7일차 카드 배지가 화소로도 보인다 (mbody overflow:hidden 에 안 잘린다)',
    'display=' + cd7.display + ' 빨강=' + cd7.red + '화소');
  const q7 = await b.page.evaluate(() => {
    const d = document.querySelector('#mbox [data-att] > s.updot'), h = d && d.closest('.at-c7');
    if (!d || !h) return null;
    const pa = d.style.animation; d.style.animation = 'none';
    const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
    d.style.animation = pa;
    return { cx: dr.left + dr.width / 2 - hr.left, cy: dr.top + dr.height / 2 - hr.top, hw: hr.width, hh: hr.height };
  });
  ok(q7 && q7.cx > q7.hw / 2 && q7.cy < q7.hh / 2,
    '[9] 7일차 배지도 우상단 사분면',
    q7 ? 'cx ' + q7.cx.toFixed(1) + '/' + q7.hw + ' · cy ' + q7.cy.toFixed(1) + '/' + q7.hh : '없음');
  ok(b.errs.length === 0, '[9] 콘솔·런타임 에러 0 (7일차 경로)', b.errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY318 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
