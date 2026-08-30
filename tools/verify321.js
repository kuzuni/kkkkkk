#!/usr/bin/env node
/* 게이트 — 작업 321 「[룰렛 돌리기] 버튼 레드닷 — 돌릴 수 있으면」 (저장소 주인 지시 2026-08-28)
 *
 *   node tools/verify321.js
 *
 * 지키는 성질: **오늘 남은 룰렛 횟수가 있으면 그 경로 전체에 레드닷이 뜨고, 소진하면 전부 꺼진다.**
 *   ① 진입 버튼 — 좌측 사이드 «룰렛» 아이콘(`.ibtn[data-pop="roul"].on > .bdg`) — `sideAlert('roul', …)`
 *   ② 29 팝업 [룰렛 돌리기] 버튼(`#rouBtn`) — 318·293·294·301 규약: 진입 버튼 배지는 팝업을 여는 순간
 *      딤(`#modal` z30 > `.side` z3) 아래로 들어가 화면에서 사라진다. 경로의 다음 칸까지 잇는다.
 *   ③ 음성 — 회전 중에는 꺼지고(누를 수 없는 동안 «누를 수 있다» 는 신호를 내지 않는다),
 *      마지막 1회를 소진하면 ①② 가 같이 꺼지며 다시 열어도 안 켜진다.
 *   ④ 166 규약 — 부품은 `<s class="updot">` 하나 · 점등은 호스트 `.alert` 로만. 클래스를 떼면 꺼진다.
 *   ⑤ 299 규약 — 배지 중심이 호스트(버튼) 우상단 사분면.
 *   ⑥ 267 [F] 회귀 — 배지 노드를 넣어도 라벨 `<b>` 규격(46.6px)이 안 깨진다(`rouBtnTx` 가 `<b>` 를 찾는다).
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

/* spins 는 `S.daily` 안이고 날짜 롤오버가 있는 값이라 세이브로 못 박기 어렵다 —
   부팅 뒤 직접 세팅하고 HUD 를 한 번 돌려 사이드 배지를 동기화한다. */
async function boot(browser, spins) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 500, best: 30, totalKills: 500 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춰 화소 판정이 흔들리지 않게 한다(다른 게이트와 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; });
  await page.evaluate(n => { S.daily.spins = n; uiDirty = true; renderUI(); }, spins);
  await page.waitForTimeout(600);
  return { page, errs };
}

const SIDE = '.side .ibtn[data-pop="roul"]';
const SIDE_BDG = SIDE + ' .bdg';
const BTN = '#rouBtn';
const BTN_DOT = '#rouBtn > s.updot';

(async () => {
  const browser = await launch(chromium);

  /* ══ A. 남은 횟수 1회 — 점등 → 회전 중 소등 → 소진 후 소등 ═══════════════════ */
  const { page, errs } = await boot(browser, 1);

  /* ── [1] 진입 버튼 ── */
  const st0 = await page.evaluate(() => ({
    spins: S.daily.spins,
    on: document.querySelector('.side .ibtn[data-pop="roul"]').classList.contains('on'),
  }));
  const sb0 = await badge(page, SIDE_BDG);
  ok(st0.spins === 1, '[1] 남은 횟수 1회 상태다 (판정 재료)', 'spins=' + st0.spins);
  /* 367 이관 — 이 표본(남은 1회)은 367 이후 «광고 구간» 이다. 321 의 계약은 «지금 누를 수 있으면 켠다»
     이고 광고 구간도 그 자리에서 돌아가므로 점등은 그대로 참이다. 그것을 **묻는 항**을 한 줄 넣는다:
     안 넣으면 이 게이트는 «표본이 어느 구간인지 모르는 채» 초록이고, 367 이 통째로 사라져도 초록이다
     (328·330 «이관» 교훈 — 누른 항을 묻는 항을 한 줄 더 넣는다). */
  const seg = await page.evaluate(() => ({ ad: roulAdNext(), free: ROUL_FREE, tot: ROUL_TRY }));
  ok(seg.ad === true && seg.tot === seg.free + 2,
    '★ [1] 367 — 이 표본은 «광고 구간» 인데도 켜지는 자리다 (레드닷 = 지금 누를 수 있다)',
    'roulAdNext=' + seg.ad + ' · 무료 ' + seg.free + ' / 총 ' + seg.tot);
  ok(st0.on === true, '[1] 사이드 «룰렛» 버튼에 `.on`');
  ok(sb0.display === 'block' && sb0.red > 100,
    '[1] 사이드 배지가 «논리 + 화소» 로 실제 보인다', 'display=' + sb0.display + ' 빨강=' + sb0.red + '화소');

  /* ── [2] 팝업을 열면 진입 버튼 배지는 딤 아래로 사라진다 (경로가 한 칸 짧았다는 근거) ── */
  await page.click(SIDE);
  await page.waitForTimeout(800);
  const covered = await page.evaluate((q) => {
    const e = document.querySelector(q), r = e.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { open: !!document.getElementById('rouBtn'),
             hit: top ? (top.id ? '#' + top.id : top.className) : null };
  }, SIDE_BDG);
  ok(covered.open === true, '[2] 사이드 버튼 클릭 → 29 룰렛 팝업이 열린다');
  ok(covered.hit === '#modal', '[2] 그 순간 사이드 배지는 딤 아래다 (신호가 화면에서 사라진다)', String(covered.hit));

  /* ── [3] 버튼 배지 — 여기가 321 이 새로 잇는 칸 ── */
  const b0 = await page.evaluate(() => {
    const b = document.getElementById('rouBtn');
    return { alert: b.classList.contains('alert'), dots: b.querySelectorAll('.updot').length,
             disabled: b.disabled,
             /* 267 규약 — 라벨은 `<b>`, 배지는 그 **형제**(라벨 안에 들어가면 규격이 깨진다) */
             firstIsB: b.firstElementChild && b.firstElementChild.tagName === 'B',
             dotInB: !!b.querySelector('b .updot'),
             fs: b.querySelector('b') ? parseFloat(getComputedStyle(b.querySelector('b')).fontSize) : 0 };
  });
  ok(b0.alert === true, '[3] [룰렛 돌리기] 버튼에 `.alert`');
  ok(b0.dots === 1, '[3] 버튼에 레드닷 노드 1개', String(b0.dots));
  ok(b0.disabled === false, '[3] 그 버튼은 실제로 누를 수 있다 (배지가 거짓말이 아니다)');
  const bd = await badge(page, BTN_DOT);
  ok(bd.exists && bd.display === 'block' && bd.red > 100,
    '[3] 버튼 배지가 «논리 + 화소» 로 실제 보인다', 'display=' + bd.display + ' 빨강=' + bd.red + '화소');

  /* ── [4] 267 [F] 회귀 — 라벨 `<b>` 규격이 안 깨진다 ── */
  ok(b0.firstIsB === true && b0.dotInB === false,
    '[4] 267 규약 — 배지는 `<b>` 의 형제다 (라벨 안이 아니다)',
    '첫자식 B=' + b0.firstIsB + ' · b안 닷=' + b0.dotInB);
  ok(Math.abs(b0.fs - 46.6) < 0.6, '[4] 라벨 46.6px 규격 유지', 'fs=' + b0.fs);

  /* ── [5] 299 규약 — 중심이 버튼 우상단 사분면 ── */
  const quad = await page.evaluate(() => {
    const d = document.querySelector('#rouBtn > s.updot'), h = d && d.closest('#rouBtn');
    if (!d || !h) return null;
    const pa = d.style.animation; d.style.animation = 'none';
    const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
    d.style.animation = pa;
    return { cx: dr.left + dr.width / 2 - hr.left, cy: dr.top + dr.height / 2 - hr.top,
             hw: hr.width, hh: hr.height,
             /* ⚑ 471(2026-08-30, 주인 보고) 이관 — 옛 항은 «링까지 버튼 **안**» 이었다.
                그 자는 471 규약(«중심이 호스트 코너에서 안쪽 `--dot-in`» = 점이 코너에 **걸친다**)과
                정면으로 반대라, 그대로 두면 «주인이 맞다고 한 모양이면 빨간 게이트» 가 된다.
                뜻(«닷이 잘려 보이면 안 된다»)은 그대로 두고 **자를 바꾼다**:
                  ⓐ 중심이 버튼 테두리 바깥 상자 우상단 코너에서 안쪽 `--dot-in`(±2px)
                  ⓑ 실제로 자르는 조상이 하나도 없다(overflow≠visible 조상들의 교집합 안).
                ⚠ ⓑ 를 빼면 «걸치기만 하면 초록» 이 되어 옛 결함(반달)이 되돌아온다. */
             dxR: hr.right - (dr.left + dr.width / 2),
             dyT: (dr.top + dr.height / 2) - hr.top,
             inset: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dot-in')),
             cut: (() => {
               const R = dr.width / 2 + 7.5, cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
               let l = -1e9, t = -1e9, r = 1e9, b = 1e9, p = d.parentElement;
               while (p && p !== document.documentElement) {
                 const cs = getComputedStyle(p);
                 if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
                   const q = p.getBoundingClientRect();
                   if (cs.overflowX !== 'visible') { l = Math.max(l, q.left); r = Math.min(r, q.right); }
                   if (cs.overflowY !== 'visible') { t = Math.max(t, q.top); b = Math.min(b, q.bottom); }
                 }
                 p = p.parentElement;
               }
               return Math.max(0, t - (cy - R), (cx + R) - r, (cy + R) - b, l - (cx - R));
             })() };
  });
  ok(quad && quad.cx > quad.hw / 2 && quad.cy < quad.hh / 2,
    '[5] 299 규약 — 배지 중심이 버튼 우상단 사분면',
    quad ? 'cx ' + quad.cx.toFixed(1) + '/' + quad.hw.toFixed(0) + ' · cy ' + quad.cy.toFixed(1) + '/' + quad.hh.toFixed(0) : '없음');
  ok(quad && Math.abs(quad.dxR - quad.inset) <= 2 && Math.abs(quad.dyT - quad.inset) <= 2,
    '[5] 471 규약 — 중심이 버튼 코너에서 안쪽 --dot-in (±2px)',
    quad ? 'dxR ' + quad.dxR.toFixed(1) + ' · dyT ' + quad.dyT.toFixed(1) + ' · 규약 ' + quad.inset : '없음');
  ok(quad && quad.cut === 0,
    '[5] 배지를 자르는 조상이 하나도 없다 («반달» 회귀 감시)',
    quad ? '최대 잘림 ' + quad.cut.toFixed(1) + 'px' : '없음');

  /* ── [6] 166 호스트 감사 — 조건 클래스를 떼면 꺼지고 붙이면 켜진다 ── */
  const audit = await page.evaluate(() => {
    const h = document.getElementById('rouBtn'), e = h && h.querySelector('.updot');
    if (!e) return null;
    h.classList.remove('alert'); const off = getComputedStyle(e).display;
    h.classList.add('alert');    const on = getComputedStyle(e).display;
    return { off, on };
  });
  ok(audit && audit.off === 'none' && audit.on === 'block',
    '[6] 배지 «.ifbtn.pbtn>.updot» — `.alert` 없으면 꺼짐 / 있으면 켜짐',
    audit ? audit.off + ' → ' + audit.on : '없음');

  /* ── [7] 회전 중 소등 — 진짜 포인터로 돌린다 ── */
  await page.click(BTN);
  await page.waitForTimeout(500);
  const mid = await page.evaluate(() => ({
    spinning: rouSpinning,
    alert: document.getElementById('rouBtn').classList.contains('alert'),
    disp: getComputedStyle(document.querySelector('#rouBtn > s.updot')).display,
    label: document.querySelector('#rouBtn b').textContent,
    fs: parseFloat(getComputedStyle(document.querySelector('#rouBtn b')).fontSize),
  }));
  ok(mid.spinning === true, '[7] 회전 중이다 (판정 재료)');
  ok(mid.alert === false && mid.disp === 'none',
    '[7] 회전 중에는 배지가 꺼진다 (누를 수 없는 동안 «누를 수 있다» 를 안 낸다)',
    'alert=' + mid.alert + ' display=' + mid.disp);
  ok(mid.label === '돌아가는 중…' && Math.abs(mid.fs - 46.6) < 0.6,
    '[7] 267 [F] 회귀 — 라벨을 바꿔도 `<b>` 46.6px 규격을 잃지 않는다',
    '«' + mid.label + '» fs=' + mid.fs);
  const bdMid = await badge(page, BTN_DOT);
  ok(bdMid.red === 0, '[7] 화소로도 0 (회전 중)', '빨강=' + bdMid.red);

  /* ── [8] 소진 — 회전이 끝나면 ①② 가 같이 꺼진다 ── */
  await page.waitForFunction(() => rouSpinning === false, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    spins: S.daily.spins,
    alert: document.getElementById('rouBtn').classList.contains('alert'),
    dots: document.querySelectorAll('#rouBtn .updot').length,
    disabled: document.getElementById('rouBtn').disabled,
    label: document.querySelector('#rouBtn b').textContent,
  }));
  ok(after.spins === 0, '[8] 진짜 돌았다 (남은 횟수 1 → 0)', 'spins=' + after.spins);
  ok(after.alert === false && after.disabled === true && after.label === '내일 다시 충전됩니다',
    '[8] 음성 — 소진 즉시 버튼 배지 소등 + 비활성 + 라벨 전환',
    'alert=' + after.alert + ' disabled=' + after.disabled + ' «' + after.label + '»');
  ok(after.dots === 1, '[8] 노드는 남아 있고 «점등만» 꺼진 것이다 (166 — 부품은 하나)', String(after.dots));
  const bd0 = await badge(page, BTN_DOT);
  ok(bd0.display === 'none' && bd0.red === 0, '[8] 화소도 0', 'display=' + bd0.display + ' 빨강=' + bd0.red);

  /* ── [9] 사이드도 같이 꺼진다 + 같은 날 재진입해도 안 켜진다 ── */
  /* ⚑ 455 이관(2026-08-30) — 회전 직후 «보상이 날아가는» 동안은 팝업이 **안 닫힌다**(주인 지시).
     위 [8] 의 `rouSpinning===false` + 900ms 로는 그 창(실측 +1193ms)을 아직 못 넘겨,
     닫기가 거부된 채 다음 줄의 사이드 클릭이 딤에 막혔다(1회차 TimeoutError).
     시간을 더 박지 않고 **제품에게 묻는다**(368 처방) — 잠금이 풀릴 때까지 기다렸다 닫는다.
     그리고 **누른 항을 묻는 항을 한 줄 넣는다**(LESSONS 329): 아래 [9-455]. */
  const lockedRightAfter = await page.evaluate(() => (typeof rouLocked === 'function') ? rouLocked() : null);
  await page.waitForFunction(() => (typeof rouLocked !== 'function') || !rouLocked(), null, { timeout: 15000 });
  const closedNow = await page.evaluate(() => { const r = closeModal(); uiDirty = true; renderUI(); return r; });
  ok(lockedRightAfter === true && closedNow !== false,
    '[9-455] 455 — 정지 직후엔 잠겨 있고(닫기 거부) 비행이 끝나면 닫힌다',
    '정지 직후 rouLocked=' + lockedRightAfter + ' · 풀린 뒤 closeModal()=' + closedNow);
  await page.waitForTimeout(700);
  const sideOff = await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="roul"]').classList.contains('on'));
  ok(sideOff === false, '[9] 음성 — 사이드 «룰렛» 배지도 꺼졌다');
  const sb1 = await badge(page, SIDE_BDG);
  ok(sb1.display === 'none' && sb1.red === 0, '[9] 사이드 배지 화소도 0', 'display=' + sb1.display + ' 빨강=' + sb1.red);
  await page.click(SIDE);
  await page.waitForTimeout(800);
  const again = await page.evaluate(() => ({
    alert: document.getElementById('rouBtn').classList.contains('alert'),
    disp: getComputedStyle(document.querySelector('#rouBtn > s.updot')).display,
  }));
  ok(again.alert === false && again.disp === 'none',
    '[9] 다시 열어도 꺼진 채다 (openRoulette 이 되살리지 않는다)',
    'alert=' + again.alert + ' display=' + again.disp);
  await page.evaluate(() => closeModal());

  ok(errs.length === 0, '[10] 콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');
  await page.context().close();

  /* ══ B. 남은 횟수 0 으로 열면 처음부터 안 켜진다 ═════════════════════════════ */
  const b = await boot(browser, 0);
  const sideB = await b.page.evaluate(() => document.querySelector('.side .ibtn[data-pop="roul"]').classList.contains('on'));
  ok(sideB === false, '[11] spins=0 — 사이드 배지 처음부터 꺼짐');
  await b.page.evaluate(() => openRoulette());
  await b.page.waitForTimeout(800);
  const zero = await b.page.evaluate(() => {
    const btn = document.getElementById('rouBtn');
    return { alert: btn.classList.contains('alert'), dots: btn.querySelectorAll('.updot').length,
             disp: getComputedStyle(btn.querySelector('s.updot')).display, disabled: btn.disabled };
  });
  ok(zero.dots === 1 && zero.alert === false && zero.disp === 'none' && zero.disabled === true,
    '[11] spins=0 — 노드는 있고 점등만 꺼짐 · 버튼도 비활성',
    '닷 ' + zero.dots + ' · alert ' + zero.alert + ' · ' + zero.disp + ' · disabled ' + zero.disabled);
  const bdz = await badge(b.page, BTN_DOT);
  ok(bdz.red === 0, '[11] spins=0 — 화소도 0', '빨강=' + bdz.red);

  /* ── [12] spins 를 되살리고 다시 열면 켜진다 (판정이 상태를 진짜 읽는가) ── */
  await b.page.evaluate(() => { closeModal(); S.daily.spins = 3; uiDirty = true; renderUI(); });
  await b.page.waitForTimeout(500);
  await b.page.evaluate(() => openRoulette());
  await b.page.waitForTimeout(800);
  const back = await b.page.evaluate(() => {
    const btn = document.getElementById('rouBtn');
    return { alert: btn.classList.contains('alert'),
             disp: getComputedStyle(btn.querySelector('s.updot')).display,
             side: document.querySelector('.side .ibtn[data-pop="roul"]').classList.contains('on') };
  });
  ok(back.alert === true && back.disp === 'block' && back.side === true,
    '[12] spins=3 — 두 자리 다 다시 켜진다', 'alert=' + back.alert + ' ' + back.disp + ' · 사이드 ' + back.side);
  const bdb = await badge(b.page, BTN_DOT);
  ok(bdb.red > 100, '[12] 화소로도 보인다', '빨강=' + bdb.red);
  ok(b.errs.length === 0, '[12] 콘솔·런타임 에러 0 (spins=0 경로)', b.errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY321 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
