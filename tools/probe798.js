#!/usr/bin/env node
/* 작업 798 재현기 — 「안 넘치는 «한 줄» 판에서도 «밀어서 더 보기» 가 붙는가」
 *
 *   node tools/probe798.js
 *
 * 782 는 «밀어서 더 보기» 를 «계산한 행 수» 가 아니라 **그려진 격자**에게 묻게 바꿨다
 * (`gEl.scrollHeight > gEl.clientHeight + 1`). 그 판단이 옳은 자리는 `many`(7칸 이상)뿐이다 —
 * 거기서는 격자가 `height:var(--upr-ch)` + `overflow-y:auto` 라 sh/ch 가 같은 상자를 잰다.
 * **6칸 이하(`many` 아님)** 는 그 CSS 가 안 걸려 격자 높이가 «내용대로» 인데,
 * `.upr-lv` 의 검정 스트로크가 칸 밖으로 넘쳐(`UPR_SLACK` 8px) `scrollHeight` 만 더 크게 읽힌다
 * ⇒ 한 줄짜리 판이 «넘쳤다» 로 판정된다.
 *
 * 338 규칙: 처방 전에 재현한다. 이 자가 **빨가야** 재현 성공이다(수리 뒤엔 초록).
 *
 *   [1] 2칸(강화 경로)  — 한 줄인데 sh > ch + 1 인가 / 헤더가 그 말을 담는가
 *   [2] 1~6칸 스윕      — 어느 칸수부터 거짓이 되는가(넘침은 «칸수» 축이 아니다)
 *   [3] 2칸(합성 경로)  — 719 가 같은 껍데기를 쓰므로 같은 얼굴인가
 *   [4] 대조군          — `many` 판(7칸·전종)에서는 782 판정이 그대로 옳은가
 *   [5] 넘침의 정체     — sh − ch 가 `UPR_SLACK` 과 같은 수인가(뿌리 확인)
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

/* 표본 — probe782 SEED 와 같은 꼴(앞 n 종만 조각을 채우고 나머지는 눌러 둔다) */
const SEED = ({ kind, n, frag }) => {
  const list = kind === 'skill' ? SKILLS : kind === 'pet' ? PETS : wpnList();
  const ids = list.slice(0, n).map(it => it.id);
  ids.forEach(id => { S.own[id] = { n: frag, l: 1 }; });
  list.slice(n).forEach(it => { if (S.own[it.id]) S.own[it.id].n = 0; });
  save();
  return { want: ids.length, listLen: list.length };
};

/* ⚠ `getBoundingClientRect` 금지 — 60 쥬시 등장 연출의 scale 이 섞인다(probe782 1회차 교훈).
   `offsetTop`·`scrollHeight`·`clientHeight` 는 레이아웃 값이라 transform 과 무관하다. */
const READ = () => {
  const grid = document.getElementById('upCards');
  const cels = [...grid.querySelectorAll('.upr-cel')];
  const tops = cels.map(c => c.offsetTop);
  const rowsMap = {};
  tops.forEach(t => { rowsMap[t] = (rowsMap[t] || 0) + 1; });
  const rowKeys = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);
  const cnt = document.getElementById('upCnt');
  return {
    n: cels.length,
    drawnRows: rowKeys.length,
    perRow: rowKeys.map(k => rowsMap[k]),
    sh: grid.scrollHeight, ch: grid.clientHeight,
    many: document.getElementById('upw').classList.contains('many'),
    cntTxt: (cnt.textContent || '').trim(),
    /* 「말했는가」 = DOM 에 그 노드가 실제로 들어갔는가. 6칸 이하는 `.upr-cnt{display:none}` 이라
       눈에는 안 보이지만 **문자열은 붙는다** — 잠복 결함이라 텍스트로 묻는다. */
    says: /밀어서/.test(cnt.textContent || ''),
    saysNode: !!cnt.querySelector('s'),
    cntShown: getComputedStyle(cnt).display !== 'none',
    slack: typeof UPR_SLACK !== 'undefined' ? UPR_SLACK : null
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

(async () => {
  const browser = await launch(chromium);
  const shots = [];

  /* ── [1] 등재문 재현 — 2칸(강화 경로) ─────────────────────────────── */
  blk('1 — 등재문 재현: 2칸 = 한 줄인데 «넘쳤다» 로 읽히는가 (강화 경로)');
  {
    const r0 = await boot(browser, 2280);
    await ev(r0.page, SEED, { kind: 'pet', n: 2, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, READ);
    if (!r) ok(false, '1-0 읽기'); else {
      info('칸 ' + r.n + ' · 그려진 행 ' + r.drawnRows + ' · many ' + r.many);
      info('격자 sh/ch', r.sh + '/' + r.ch + '  (차 ' + (r.sh - r.ch) + ')');
      info('헤더 문자열', '"' + r.cntTxt + '"  (보이는가: ' + r.cntShown + ')');
      ok(r.n === 2 && r.drawnRows === 1, '1-a 표본이 «한 줄 2칸» 이다', r.n + '칸/' + r.drawnRows + '행');
      /* ⚠ 이 항은 «결함» 이 아니라 **사실**이다 — `sh > ch` 자체는 고칠 것이 아니다.
         격자를 실제로 5~7px 줄이는 처방 ⓑ 는 6칸 이하 레퍼런스 배치(726 [C] Δ0px)를 흔든다.
         고칠 것은 그 5~7px 을 «가려진 행» 으로 읽는 **판정**이고, 그 ★ 는 1-c 다. */
      ok(r.sh - r.ch <= r.slack,
         '1-b 한 줄 판의 넘침은 슬랙(' + r.slack + 'px) 안이다 = 가려진 행이 아니다',
         '차 ' + (r.sh - r.ch));
      ok(!r.says, '1-c ★ 그래서 헤더에 «밀어서 더 보기» 가 없어야 한다', '말함 ' + r.says);
      shots.push({ tag: 'pet-n2@2280', r });
    }
    await r0.ctx.close();
  }

  /* ── [2] 1~6칸 스윕 — 넘침은 «칸수» 축이 아니다 ───────────────────── */
  blk('2 — 1~6칸 스윕: 어느 칸수에서 거짓 양성이 나는가');
  {
    const r0 = await boot(browser, 2280);
    const rows = [];
    for (let n = 1; n <= 6; n++) {
      await ev(r0.page, SEED, { kind: 'pet', n, frag: 30 });
      await ev(r0.page, () => { closeUpAll(); });
      await OPEN(r0.page, 'pet');
      const r = await ev(r0.page, READ);
      if (r) rows.push({ n, sh: r.sh, ch: r.ch, d: r.sh - r.ch, says: r.says, many: r.many, drawn: r.drawnRows });
    }
    rows.forEach(x => info('n=' + x.n, 'sh ' + x.sh + ' / ch ' + x.ch + ' (차 ' + x.d + ') · 행 ' + x.drawn
                            + ' · many ' + x.many + ' · 말함 ' + x.says));
    const bad = rows.filter(x => x.says);
    ok(rows.length === 6, '2-a 여섯 판을 전부 읽었다', rows.length + '/6');
    ok(bad.length === 0, '2-b ★ 6칸 이하(한 줄)는 어느 칸수에서도 «밀어서» 가 없어야 한다',
       bad.length ? '거짓 양성 n=' + bad.map(x => x.n).join(',') : '0건');
    shots.push({ tag: 'sweep1-6@2280', rows });
  }

  /* ── [3] 합성 경로(719) — 같은 껍데기라 같은 얼굴인가 ─────────────── */
  blk('3 — 합성 경로(719 `opt.tail`)도 같은 얼굴인가');
  {
    const r0 = await boot(browser, 2280);
    const r = await ev(r0.page, () => {
      /* 719 는 같은 `openUpAll` 을 «합성» 낱말로 부른다 — 껍데기·기하가 한 벌인지 여기서 묻는다 */
      const two = [{ it: PETS[0].id, from: 1, to: 2 }, { it: PETS[1].id, from: 1, to: 2 }];
      openUpAll(two, { tail: '건 합성' });
      const grid = document.getElementById('upCards'), cnt = document.getElementById('upCnt');
      return {
        n: grid.querySelectorAll('.upr-cel').length,
        sh: grid.scrollHeight, ch: grid.clientHeight,
        many: document.getElementById('upw').classList.contains('many'),
        cntTxt: (cnt.textContent || '').trim(),
        says: /밀어서/.test(cnt.textContent || ''),
        tail: /합성/.test(cnt.textContent || '')
      };
    });
    if (!r) ok(false, '3-0 읽기'); else {
      info('칸 ' + r.n + ' · sh/ch ' + r.sh + '/' + r.ch + ' (차 ' + (r.sh - r.ch) + ')');
      info('헤더', '"' + r.cntTxt + '"');
      ok(r.tail, '3-a 합성 낱말이 붙는다(719 경로가 맞다)', r.cntTxt);
      ok(!r.says, '3-b ★ 합성 경로도 한 줄이면 «밀어서» 가 없어야 한다', '말함 ' + r.says);
      shots.push({ tag: 'craft-n2@2280', r });
    }
    await r0.ctx.close();
  }

  /* ── [4] 대조군 — `many` 판에서는 782 판정이 옳다 ─────────────────── */
  blk('4 — 대조군: many 판(7칸·전종)에서는 782 판정이 그대로 옳은가');
  {
    const r0 = await boot(browser, 2280);
    await ev(r0.page, SEED, { kind: 'pet', n: 7, frag: 30 });
    await OPEN(r0.page, 'pet');
    const a = await ev(r0.page, READ);
    await r0.ctx.close();

    const r1 = await boot(browser, 1600);
    await ev(r1.page, SEED, { kind: 'pet', n: 36, frag: 30 });
    await OPEN(r1.page, 'pet');
    const b = await ev(r1.page, READ);
    await r1.ctx.close();

    if (!a || !b) ok(false, '4-0 읽기'); else {
      info('7칸@2280', 'sh ' + a.sh + '/ch ' + a.ch + ' · 말함 ' + a.says);
      info('전종@1600', 'sh ' + b.sh + '/ch ' + b.ch + ' · 말함 ' + b.says);
      ok(a.many && !a.says, '4-a 안 넘치는 many 판은 조용하다(782 가 이미 옳다)', 'sh/ch ' + a.sh + '/' + a.ch);
      ok(b.many && b.says, '4-b ★ 정말 넘치는 판은 계속 말해야 한다(과교정 잠금)', 'sh/ch ' + b.sh + '/' + b.ch);
      shots.push({ tag: 'ctl-n7@2280', a }, { tag: 'ctl-all@1600', b });
    }
  }

  /* ── [5] 넘침의 정체 — 뿌리가 `UPR_SLACK` 인가 ────────────────────── */
  blk('5 — 뿌리 확인: 한 줄 판의 sh − ch 가 무엇인가');
  {
    const r0 = await boot(browser, 2280);
    await ev(r0.page, SEED, { kind: 'pet', n: 3, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, () => {
      const grid = document.getElementById('upCards');
      const cel = grid.querySelector('.upr-cel');
      const lv = cel && cel.querySelector('.upr-lv');
      const cs = lv ? getComputedStyle(lv) : null;
      return {
        sh: grid.scrollHeight, ch: grid.clientHeight,
        celH: cel ? cel.offsetHeight : null,
        lvH: lv ? lv.offsetHeight : null,
        stroke: cs ? cs.webkitTextStrokeWidth : null,
        slack: typeof UPR_SLACK !== 'undefined' ? UPR_SLACK : null,
        rowH: typeof UPR_ROW_H !== 'undefined' ? UPR_ROW_H : null,
        chVar: getComputedStyle(document.getElementById('upw')).getPropertyValue('--upr-ch').trim()
      };
    });
    if (!r) ok(false, '5-0 읽기'); else {
      info('격자 sh/ch', r.sh + '/' + r.ch + '  ⇒ 차 ' + (r.sh - r.ch));
      info('칸 높이 / `.upr-lv` 높이 / 스트로크', r.celH + ' / ' + r.lvH + ' / ' + r.stroke);
      info('상수', 'UPR_SLACK ' + r.slack + ' · UPR_ROW_H ' + r.rowH + ' · --upr-ch "' + r.chVar + '"');
      ok(r.sh - r.ch <= r.slack,
         '5-a ★ 한 줄 판의 넘침은 슬랙(' + r.slack + 'px) 안이다 — 가려진 행이 아니다',
         '차 ' + (r.sh - r.ch));
      shots.push({ tag: 'root-n3@2280', r });
    }
    await r0.ctx.close();
  }

  await browser.close();
  console.log('\n요약');
  shots.forEach(s => console.log('  ' + s.tag + ' ' + JSON.stringify(s.r || s.rows || s.a || s.b)));
  console.log('\nPROBE798 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
