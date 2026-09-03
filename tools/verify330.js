#!/usr/bin/env node
/* 게이트 — 작업 330 「89 유물 «소환» 수반 버튼 레드닷 — 소환 가능(유물조각 ≥ 100)이면」
 *          (저장소 주인 지시 2026-08-28 — «유물 소환버튼에도 빨간 점 알림있어야함 소환가능한상태면»)
 *
 *   node tools/verify330.js
 *
 * 지키는 성질: **유물조각이 비용(100) 이상이면 수반 버튼에 레드닷이 뜨고,
 *               소환해서 100 아래로 떨어지면 곧바로 꺼지며, 탭바 «유물» 칸까지 이어진다.**
 *   [A] 조각 99 — 소등(경계 바로 아래) · 코스트 알약은 `.lack`
 *   [B] 조각 100 — 점등(경계 정확히) · `.lack` 해제. 둘은 **같은 자의 앞뒤**여야 한다.
 *   [C] 실동작(기능 완성 규칙) — 수반을 **진짜로 눌러** 소환이 일어나고 조각이 100 줄고
 *       그 즉시 닷이 꺼지는 것까지 본다. 남는 조각이 100 이상이면 켜진 채여야 한다.
 *   [D] 경로 — 탭바 «유물»(`data-t="box"`) 칸도 같은 조건으로 켜진다(293 «경로 전체»).
 *       음성: 조각 0 이고 유물 강화도 불가면 꺼진다(330 이 `collCatReady('relic')` 를 안 덮는다 — OR).
 *   [E] 166 규약 — 부품은 `<s class="updot">` 하나 · 점등은 호스트 `#rwBasin` `.alert` 로만.
 *       ⚠ 되돌림 감시: `#relw i,…,#relw s{display:inline-block}`(ID 급, 4849행)가
 *       클래스 급 `.updot{display:none}` 을 이긴다 — 스코프 짝이 없으면 **조건과 무관하게 상시 점등**이다.
 *   [F] 299 규약 + 자리 — 중심이 수반 우상단 사분면 · 그릇 림(x32..368 · y4..64) 오른쪽 끝에 물린다
 *       (수반 SVG 는 우상단 코너가 투명이라 코너에 앉히면 허공에 뜬다) ·
 *       60 쥬시 봉우리(1.3)에서도 «유물 소환» 라벨과 코스트 알약을 안 밟는다.
 *   [G] 89 레이아웃 회귀 — 닷을 넣어도 수반 400×**226** · 라벨·코스트 알약 자리가 안 움직인다
 *       (866 이관 — 수반 구획 216 → 226 · 알약 278×53 @61 → 260×57.8 @70. 닷은 **림**(y4..64)에
 *        묶여 있어 캔버스가 길어져도 자리가 안 변한다 — [F] 가 그것을 따로 지킨다).
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
const px = n => Math.round(n * 100) / 100;

async function redAt(page, rect) {
  const [x, y, w, h] = rect;
  if (!(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H)) return 0;
  const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i+1] < 110 && d[i+2] < 130) n++;
    return n;
  }, buf.toString('base64'));
}

const MEAS = `
window.__rw = function(){
  const bs = document.getElementById('rwBasin'), cost = document.getElementById('rwCost');
  const d = bs.querySelector(':scope > .updot');
  const br = bs.getBoundingClientRect(), cr = cost.getBoundingClientRect();
  const lb = bs.querySelector('b'); const rg = document.createRange(); rg.selectNodeContents(lb);
  const lr = rg.getBoundingClientRect();
  let dot = null;
  if(d){ const prev = d.style.animation; d.style.animation = 'none';
    const dr = d.getBoundingClientRect(); d.style.animation = prev;
    dot = { rect:[dr.left,dr.top,dr.width,dr.height], display:getComputedStyle(d).display,
            pe:getComputedStyle(d).pointerEvents }; }
  return { alert: bs.classList.contains('alert'), node: !!d, dot,
    basin:[br.left,br.top,br.width,br.height], cost:[cr.left,cr.top,cr.width,cr.height],
    lab:[lr.left,lr.top,lr.width,lr.height],
    lack: cost.classList.contains('lack'), relic: S.relic,
    tab: document.querySelector('.tab[data-t="box"]').classList.contains('alert'),
    off: [bs.offsetWidth, bs.offsetHeight, cost.offsetLeft, cost.offsetTop, cost.offsetWidth, lb.offsetTop] };
};`;

const gap = (c, b) => {
  const dx = Math.max(b[0] - c[0], 0, c[0] - (b[0] + b[2]));
  const dy = Math.max(b[1] - c[1], 0, c[1] - (b[1] + b[3]));
  return Math.hypot(dx, dy);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 5000, best: 30, totalKills: 500 })]);
  await ctx.addInitScript(MEAS);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  const at = async n => {
    await page.evaluate(v => { S.relic = v; openRelw(); uiDirty = true; renderUI(); }, n);
    await page.waitForTimeout(450);
    return page.evaluate(() => __rw());
  };

  /* ══ [A] 조각 99 — 경계 바로 아래 ══════════════════════════════════════ */
  const s99 = await at(99);
  ok(s99.node === true, '[E] 부품 `<s class="updot">` 가 수반 안에 하나 있다 (판정 재료)');
  /* 278 — 부품이 없는 트리(되돌림 시험)에서도 즉사 대신 이 항만 빨개져야 한다 */
  const disp = d => (d && d.dot ? d.dot.display : '(부품 없음)');
  ok(s99.alert === false && disp(s99) === 'none',
    '[A] 조각 99 — 소등 (#relw ID 급 `s{display:inline-block}` 스코프 짝 되돌림 감시)',
    'alert=' + s99.alert + ' display=' + disp(s99));
  ok(s99.lack === true, '[A] 조각 99 — 코스트 알약은 `.lack`(빨강)');
  const red99 = s99.dot ? await redAt(page, s99.dot.rect) : 0;
  ok(red99 === 0, '[A] 화소 — 소등 국면에 닷 자리 빨강 0', red99 + 'px');

  /* ══ [B] 조각 100 — 경계 정확히 ══════════════════════════════════════ */
  const s100 = await at(100);
  ok(s100.alert === true && disp(s100) !== 'none' && disp(s100) !== '(부품 없음)', '[B] 조각 100 — 점등',
    'alert=' + s100.alert + ' display=' + disp(s100));
  ok(s100.lack === false, '[B] 조각 100 — `.lack` 해제 — 닷과 알약이 «같은 자의 앞뒤»다');
  ok(!!s100.dot && s100.dot.pe === 'none', '[B] 닷은 `pointer-events:none` — 수반 꾹 누르기(rwHold)를 안 가로챈다');
  const red100 = s100.dot ? await redAt(page, s100.dot.rect) : 0;
  ok(red100 > 200, '[B] 화소 — 점등 국면에 빨강이 실제로 찍힌다', red100 + 'px');

  /* ══ [F] 자리 ══════════════════════════════════════════════════════════ */
  if (!s100.dot) {
    ok(false, '[F] 우상단 사분면(299)', '부품 없음');
    ok(false, '[F] 그릇 림(x32..368 · y4..64) 오른쪽 끝에 물린다 — 투명한 코너에 안 뜬다', '부품 없음');
    ok(false, '[F] 봉우리 1.3 에서도 «유물 소환» 라벨·코스트 알약을 안 밟는다', '부품 없음');
  } else {
    const r = s100.dot.rect, c = [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const ring = (r[2] / 2 + 7.5) * 1.3;
    const q = [(c[0] - s100.basin[0]) / s100.basin[2], (c[1] - s100.basin[1]) / s100.basin[3]];
    const slack = px(Math.min(gap(c, s100.lab), gap(c, s100.cost)) - ring);
    /* 수반 로컬 좌표(400×226 기준 — 866) — 화면은 fit() 배율을 타므로 정규화해서 되돌린다 */
    const loc = [px(q[0] * 400), px(q[1] * 226)];
    ok(q[0] > 0.5 && q[1] < 0.5, '[F] 우상단 사분면(299)', q.map(v => v.toFixed(3)).join(','));
    ok(loc[0] >= 336 && loc[0] <= 372 && loc[1] >= 4 && loc[1] <= 56,
      '[F] 그릇 림(x32..368 · y4..64) 오른쪽 끝에 물린다 — 투명한 코너에 안 뜬다', JSON.stringify(loc));
    ok(slack > 0, '[F] 봉우리 1.3 에서도 «유물 소환» 라벨·코스트 알약을 안 밟는다', '여유 ' + slack + 'px');
  }

  /* ══ [G] 89 레이아웃 회귀 ═══════════════════════════════════════════════ */
  ok(JSON.stringify(s100.off) === JSON.stringify([400, 226, 70, 149, 260, 97]),
    '[G] 89 회귀 — 수반 400×226 · 코스트 알약 (70,149) 260w · 라벨 top 97 불변(닷은 절대배치)',
    JSON.stringify(s100.off));

  /* ══ [C] 실동작 — 진짜로 누른다 ═══════════════════════════════════════ */
  await page.evaluate(() => { S.relic = 250; renderRelw(); });
  await page.waitForTimeout(200);
  const b1 = await page.evaluate(() => ({ relic: S.relic, sum: S.cnt.sumRelic, alert: document.getElementById('rwBasin').classList.contains('alert') }));
  await page.locator('#rwBasin').click();
  await page.waitForTimeout(500);
  const a1 = await page.evaluate(() => __rw());
  ok(a1.relic === b1.relic - 100 && a1.alert === true,
    '[C] 실동작 — 250 → 150 으로 소환되고, 아직 100 이상이라 닷은 켜진 채',
    b1.relic + ' → ' + a1.relic + ' · alert ' + a1.alert);
  await page.locator('#rwBasin').click();
  await page.waitForTimeout(500);
  const a2 = await page.evaluate(() => __rw());
  ok(a2.relic === 50 && a2.alert === false && disp(a2) === 'none' && a2.lack === true,
    '[C] 실동작 — 150 → 50 이 되는 순간 닷이 즉시 꺼지고 알약이 `.lack` 으로 돌아간다',
    a2.relic + ' · alert ' + a2.alert + ' · lack ' + a2.lack);
  const redAfter = a2.dot ? await redAt(page, a2.dot.rect) : 0;
  ok(redAfter === 0, '[C] 화소 — 소환 직후 빨강 0', redAfter + 'px');
  const grew = await page.evaluate(() => S.cnt.sumRelic);
  ok(grew === b1.sum + 2, '[C] 실동작 — 소환 카운터가 실제로 2 올랐다(진짜 소환이었다)',
    b1.sum + ' → ' + grew);

  /* ══ [D] 경로 — 탭바 «유물» 칸 ═══════════════════════════════════════ */
  const t0 = await page.evaluate(() => {
    S.relic = 0; S.frag = {}; uiDirty = true; renderUI();
    return { tab: document.querySelector('.tab[data-t="box"]').classList.contains('alert'), rel: collCatReady('relic') };
  });
  ok(t0.tab === false || t0.rel === true,
    '[D] 음성 — 조각 0 이면 «유물» 칸은 (유물 강화가 가능하지 않은 한) 꺼진다',
    'tab=' + t0.tab + ' · collCatReady(relic)=' + t0.rel);
  const t1 = await page.evaluate(() => {
    S.relic = 100; uiDirty = true; renderUI();
    return document.querySelector('.tab[data-t="box"]').classList.contains('alert');
  });
  ok(t1 === true, '[D] 조각 100 — 탭바 «유물» 칸이 켜진다(293 «경로 전체»)', String(t1));

  /* ══ [E] 호스트 감사 ═══════════════════════════════════════════════════ */
  const audit = await page.evaluate(() => {
    const h = document.getElementById('rwBasin'), e = h.querySelector(':scope > .updot');
    if (!e) return { off: '(부품 없음)', on: '(부품 없음)', n: 0 };
    const had = h.classList.contains('alert');
    h.classList.remove('alert'); const off = getComputedStyle(e).display;
    h.classList.add('alert');    const on = getComputedStyle(e).display;
    if (!had) h.classList.remove('alert');
    return { off, on, n: h.querySelectorAll('.updot').length };
  });
  ok(audit.off === 'none' && audit.on !== 'none' && audit.n === 1,
    '[E] 호스트 — `.alert` 없으면 꺼짐 / 있으면 켜짐 · 부품은 하나뿐',
    audit.off + ' → ' + audit.on + ' · 노드 ' + audit.n);

  ok(errs.length === 0, '[전역] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY330 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
