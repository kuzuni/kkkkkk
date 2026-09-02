#!/usr/bin/env node
/* 작업 782 재현기 — 「09 일괄 강화 결과 격자는 «한 줄 몇 칸» 인가, 그리고 헤더는 참말인가」
 *
 *   node tools/probe782.js
 *
 * 등재문(782)은 `verify726` [D4] 가 «가려진 행이 있으므로 스크롤된다» 로 빨간 것을
 * «표본이 모자라다»(펫 35종) 로 읽었다. 이 자는 그 앞을 먼저 묻는다 —
 *
 *   [1] 한 줄에 실제로 몇 칸이 서는가  (JS 는 `UPR_COLS = 6` 으로 계산한다)
 *   [2] 그래서 `rows = ceil(n/6)` 과 **그려진 행 수**가 같은가
 *   [3] 헤더의 «밀어서 더 보기» 가 켜진 판에서 격자가 정말 넘치는가 (sh > ch)
 *   [4] 반대쪽 — 안 넘치는 판에서 그 말이 없는가
 *
 * 338 규칙: 처방 전에 재현한다. 등재문의 갈래가 맞는지도 여기서 갈린다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 표본 — 앞 n 종에 조각을 심고 나머지는 강화 불가로 눌러 둔다(verify726 SEED 와 같은 꼴) */
const SEED = ({ kind, n, frag }) => {
  const list = kind === 'skill' ? SKILLS : kind === 'pet' ? PETS : wpnList();
  const ids = list.slice(0, n).map(it => it.id);
  ids.forEach(id => { S.own[id] = { n: frag, l: 1 }; });
  list.slice(n).forEach(it => { if (S.own[it.id]) S.own[it.id].n = 0; });
  save();
  return { want: ids.length, listLen: list.length };
};

/* 그려진 격자를 «행» 으로 접어 읽는다 — 한 줄 칸수는 JS 상수가 아니라 **찍힌 좌표**로 센다 */
const READ = () => {
  const grid = document.getElementById('upCards');
  const cels = [...grid.querySelectorAll('.upr-cel')];
  /* ⚠ `getBoundingClientRect` 는 **안 된다** — 60 쥬시 등장 연출이 칸마다 다른 위상으로 scale 을
     걸어 같은 줄이 서로 다른 top 으로 읽힌다(1회차에 [1,6,1,1,…] 로 갈렸다). `offsetTop` 은
     레이아웃 값이라 transform 과 무관하다. */
  const tops = cels.map(c => c.offsetTop);
  const rowsMap = {};
  tops.forEach(t => { rowsMap[t] = (rowsMap[t] || 0) + 1; });
  const rowKeys = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);
  return {
    n: cels.length,
    drawnRows: rowKeys.length,
    perRow: rowKeys.map(k => rowsMap[k]),
    firstRow: rowKeys.length ? rowsMap[rowKeys[0]] : 0,
    sh: grid.scrollHeight, ch: grid.clientHeight,
    gw: Math.round(grid.getBoundingClientRect().width),
    many: document.getElementById('upw').classList.contains('many'),
    cntTxt: (document.getElementById('upCnt').textContent || '').trim(),
    says: /밀어서/.test(document.getElementById('upCnt').textContent || ''),
    cols: typeof UPR_COLS !== 'undefined' ? UPR_COLS : null,
    calcRows: typeof UPR_COLS !== 'undefined' ? Math.ceil(cels.length / UPR_COLS) : null
  };
};

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
    await ev(page, () => { openWeapon('wpn'); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.getElementById('wpnBtnUp').click(); });
  }
  await page.waitForTimeout(450);
};

async function boot(browser, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

/* 종수 — 표본 상한을 알아야 «정말 넘치는 판» 을 고를 수 있다 */
const COUNTS = () => ({
  skill: SKILLS.length, pet: PETS.length, wpn: wpnList().length
});

(async () => {
  const browser = await launch(chromium);
  const shots = [];

  blk('0 — 표본 상한(종수)');
  {
    const r0 = await boot(browser, 2280);
    const c = await ev(r0.page, COUNTS);
    info('스킬 / 펫 / 장비 종수', c ? c.skill + ' / ' + c.pet + ' / ' + c.wpn : 'n/a');
    ok(!!c, '0-a 종수를 읽었다');
    await r0.ctx.close();
    if (c) shots.push({ tag: 'counts', c });
  }

  /* ── [1] 한 줄 칸수 ─────────────────────────────────────────────── */
  blk('1 — 한 줄에 실제로 몇 칸이 서는가 (JS 는 UPR_COLS 로 계산한다)');
  {
    const r0 = await boot(browser, 2280);
    const seed = await ev(r0.page, SEED, { kind: 'pet', n: 14, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, READ);
    if (!r) ok(false, '1-0 읽기'); else {
      info('격자 폭 / 칸 137 / gap 14', r.gw + 'px ⇒ 산술 최대 ' + Math.floor((r.gw + 14) / 151) + '칸');
      info('그려진 행별 칸 수', JSON.stringify(r.perRow));
      ok(r.firstRow === r.cols,
         '1-a ★ 첫 줄 칸 수 = UPR_COLS(' + r.cols + ')',
         '실측 ' + r.firstRow + '칸');
      ok(r.drawnRows === r.calcRows,
         '1-b ★ 그려진 행 수 = ceil(n/UPR_COLS)',
         '그려짐 ' + r.drawnRows + ' vs 계산 ' + r.calcRows + ' (n=' + r.n + ')');
      shots.push({ tag: 'n14@2280', r });
    }
    await r0.ctx.close();
  }

  /* ── [2] verify726 [D] 가 쓰는 그 판 ────────────────────────────── */
  blk('2 — verify726 [D] 의 판(펫 전종 · 1080x1600): 헤더는 참말인가');
  {
    const r0 = await boot(browser, 1600);
    const seed = await ev(r0.page, SEED, { kind: 'pet', n: 36, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, READ);
    if (!r) ok(false, '2-0 읽기'); else {
      info('칸 ' + r.n + ' · 그려진 행 ' + r.drawnRows + ' · 행별 ' + JSON.stringify(r.perRow));
      info('격자 sh/ch', r.sh + '/' + r.ch);
      info('헤더', '"' + r.cntTxt + '"');
      ok(r.sh > r.ch + 1, '2-a [D4] 가 묻는 것 — 격자가 정말 넘친다', r.sh + '/' + r.ch);
      ok(r.says === (r.sh > r.ch + 1),
         '2-b ★ 헤더의 «밀어서 더 보기» 가 실제 넘침과 일치한다',
         '말함 ' + r.says + ' vs 넘침 ' + (r.sh > r.ch + 1));
      shots.push({ tag: 'pet-all@1600', r });
    }
    await r0.ctx.close();
  }

  /* ── [3] 반대쪽 — 안 넘치는 판에서 그 말이 없는가 ───────────────── */
  blk('3 — 음성항: 넘치지 않는 판(7칸 · 2280)에서 «밀어서» 가 없는가');
  {
    const r0 = await boot(browser, 2280);
    await ev(r0.page, SEED, { kind: 'pet', n: 7, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, READ);
    if (!r) ok(false, '3-0 읽기'); else {
      info('칸 ' + r.n + ' · 행별 ' + JSON.stringify(r.perRow) + ' · sh/ch ' + r.sh + '/' + r.ch);
      info('헤더', '"' + r.cntTxt + '"');
      ok(r.many, '3-a 7칸은 «many» 다(6칸 초과)', r.many);
      ok(r.says === (r.sh > r.ch + 1),
         '3-b ★ 안 넘치면 «밀어서» 도 없다',
         '말함 ' + r.says + ' vs 넘침 ' + (r.sh > r.ch + 1));
      shots.push({ tag: 'n7@2280', r });
    }
    await r0.ctx.close();
  }

  /* ── [4] 장비(종수가 가장 많은 배너)로 같은 것을 묻는다 ─────────── */
  blk('4 — 장비 전종 · 1080x1600');
  {
    const r0 = await boot(browser, 1600);
    const seed = await ev(r0.page, SEED, { kind: 'wpn', n: 999, frag: 30 });
    await OPEN(r0.page, 'wpn');
    const r = await ev(r0.page, READ);
    if (!r) ok(false, '4-0 읽기'); else {
      info('심은 종 ' + (seed ? seed.want + '/' + seed.listLen : '?') + ' · 칸 ' + r.n
           + ' · 행 ' + r.drawnRows + ' · sh/ch ' + r.sh + '/' + r.ch);
      info('헤더', '"' + r.cntTxt + '"');
      ok(r.sh > r.ch + 1, '4-a 장비 전종은 짧은 프레임에서 넘친다', r.sh + '/' + r.ch);
      ok(r.says === (r.sh > r.ch + 1), '4-b ★ 헤더가 그 사실과 일치한다',
         '말함 ' + r.says + ' vs 넘침 ' + (r.sh > r.ch + 1));
      shots.push({ tag: 'wpn-all@1600', r });
    }
    await r0.ctx.close();
  }

  await browser.close();
  console.log('\n요약');
  shots.forEach(s => console.log('  ' + s.tag + ' ' + JSON.stringify(s.r || s.c)));
  console.log('\nPROBE782 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
