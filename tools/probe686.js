#!/usr/bin/env node
/* 재현 — 작업 686 «단련 «구간당 1레벨당 (단련석)n» 텍스트 제거 + 강화 버튼 세로 확대»
 *   (주인 지시 2026-09-02 00:50 · 670 과 같은 버튼)
 *
 *   node tools/probe686.js
 *
 * 338 규칙: **처방 전에 재현한다.** 등재문의 읽기는 셋이고 이 자가 셋을 각각 확인/기각한다.
 *   ⓐ 주인이 지목한 «구간당 1레벨당 (단련석)n» 이 **어느 노드**인가 — `.tc` 한 상자인가,
 *      아니면 흩어져 있는가(흩어져 있으면 «제거» 의 범위가 달라진다).
 *   ⓑ 그 텍스트가 **정말 중복**인가 — 같은 행 버튼(670)이 같은 수를 이미 말하고 있는가.
 *      아니면 `.tc` 만 아는 정보(구간 경계·«1레벨당»)가 있는가.
 *   ⓒ 제거로 **얼마가 비는가** — `.tc` 상자와 그 아래 틈을 실측해 버튼이 자랄 수 있는 세로 예산을
 *      찍는다(두 프레임 9:19·9:13.3 — 404 선례로 좁은 프레임에서 밀리면 무효다).
 *   ⓓ 라벨 잉크를 **키울 여지가 가로에 있는가** — 584 가 340 폭을 자릿수 최악으로 정했으므로
 *      «세로만 키운다» 가 맞는지 자릿수 스윕으로 잰다(위임 규약 결정의 근거).
 *
 * 이 자는 «무엇이 지금 어떤가» 만 찍는다(합격/불합격 판정은 verify686).
 *
 * ⚠ **수리 전·후 둘 다 초록으로 끝난다** — `.tc` 가 있으면 «수리 전» 갈래를, 없으면 «수리 후»
 *   갈래를 찍는다. 재현자를 «수리 전에만 초록» 으로 두면 다음 세션이 그 빨강을 게이트 부패로
 *   읽는다(702·730·732 가 그 자리였다). 어느 갈래를 걸었는지는 머리에 찍힌다.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 행 기준 좌표 — 행이 어느 프레임에 있든 같은 수가 나오게(절대 y 는 프레임마다 다르다) */
const REL = `window.__rel = (sel, host) => {
  const e = document.querySelector(sel), h = document.querySelector(host);
  if (!e || !h) return null;
  const a = e.getBoundingClientRect(), b = h.getBoundingClientRect();
  const r = n => Math.round(n * 10) / 10;
  return { x: r(a.x - b.x), y: r(a.y - b.y), w: r(a.width), h: r(a.height),
           x2: r(a.right - b.x), y2: r(a.bottom - b.y) };
};`;

async function openAt(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  await page.evaluate(REL);
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await openAt(browser, 2280);

  /* ── ⓐ 주인이 지목한 텍스트는 어느 노드인가 ───────────────────────── */
  console.log('\n=== ⓐ «구간당 1레벨당 (단련석)n» 은 어느 노드인가 ===');
  const nodes = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#trTemper .tr-tp')];
    return rows.map(r => {
      const t = s => { const n = r.querySelector(s); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; };
      return { k: r.dataset.temper, tc: t('.tc'), tci: t('.tc i'), tcs: t('.tc s'),
               tb: t('.tb'), tn: t('.tn'), td: t('.td'),
               tcIcons: r.querySelectorAll('.tc img.cic').length,
               tbIcons: r.querySelectorAll('.tb img.cic').length };
    });
  });
  const PRE = nodes.every(n => n.tc !== null);      /* `.tc` 가 살아 있으면 «수리 전» 트리다 */
  console.log('      ── 갈래: ' + (PRE ? '수리 **전**(.tc 있음)' : '수리 **후**(.tc 없음 — 686 적용됨)'));
  nodes.forEach(n => console.log(`      ${n.k}: .tc «${n.tc}» (i «${n.tci}» + s «${n.tcs}») · .tb «${n.tb}»`));
  if (PRE) {
    ok(nodes.every(n => /구간/.test(n.tcs) && /1레벨당/.test(n.tcs)),
      'ⓐ-1 «구간 · 1레벨당» 은 `.tc>s` 한 노드다',
      nodes.map(n => '«' + n.tcs + '»').join(' · '));
    ok(nodes.every(n => n.tcIcons === 1 && /^\d+$/.test(n.tci)),
      'ⓐ-2 «(단련석)n» 은 같은 상자의 `.tc>i` 다(아이콘 1 + 숫자) — 주인 문구는 `.tc` 한 상자를 가리킨다',
      nodes.map(n => '«' + n.tci + '»/아이콘' + n.tcIcons).join(' · '));
  } else {
    ok(nodes.every(n => n.tc === null),
      'ⓐ-1 686 이후 — 주인이 지목한 상자(`.tc`)가 통째로 없다');
    ok(nodes.every(n => n.tbIcons === 1 && /^\d+$/.test(n.tb)),
      'ⓐ-2 686 이후 — 그 정보(아이콘 + 수)는 버튼 라벨이 그대로 말한다',
      nodes.map(n => '«' + n.tb + '»/아이콘' + n.tbIcons).join(' · '));
  }

  /* ── ⓑ 정말 중복인가 ─────────────────────────────────────────────── */
  console.log('\n=== ⓑ 버튼(670)이 같은 수를 이미 말하는가 ===');
  const dup = await page.evaluate(() => {
    const out = [];
    [[0, 5], [150, 3], [250, 6]].forEach(([add]) => {
      TEMPERS.forEach(t => { S.temper.alloc[t.k] = add; });
      renderTrain();
      [...document.querySelectorAll('#trTemper .tr-tp')].forEach(r => {
        /* 686 이후에는 `.tc` 가 아예 없다 — 없는 노드를 읽어 예외로 죽으면 그 절이 통째로
           «건너뛴» 채 초록으로 보인다(731 EVGUARD 가 잡는 그 자리). null 로 받는다. */
        const num = s => { const n = r.querySelector(s);
          return n ? (n.textContent.match(/\d+/) || [null])[0] : null; };
        const ic = s => { const n = r.querySelector(s); return n ? /cur-tstone\.svg/.test(n.innerHTML) : null; };
        out.push({ lv: add, k: r.dataset.temper, cost: temperCost(r.dataset.temper),
                   tc: num('.tc i'), tb: num('.tb i'),
                   tbIc: ic('.tb i'), tcIc: ic('.tc i') });
      });
    });
    TEMPERS.forEach(t => { S.temper.alloc[t.k] = 0; }); renderTrain();
    return out;
  });
  dup.forEach(d => console.log(`      lv+${d.lv} ${d.k}: 비용 ${d.cost} · .tc «${d.tc}» · .tb «${d.tb}»`));
  ok(dup.every(d => String(d.cost) === d.tb && (PRE ? d.tc === d.tb : d.tc === null)),
    PRE ? 'ⓑ-1 ★ 같은 수를 두 자리가 말한다 — 제거해도 «지금 얼마인가» 는 버튼이 그대로 말한다'
        : 'ⓑ-1 ★ 686 이후 — 그 수를 버튼 혼자 말하고, 세 구간 전부 비용과 일치한다',
    dup.map(d => (d.tc === null ? '—' : d.tc) + '/' + d.tb).join(' · '));
  ok(dup.every(d => d.tbIc && (PRE ? d.tcIc : true)),
    'ⓑ-2 화폐 아이콘 — ' + (PRE ? '두 자리 다 있다' : '버튼에 남았다') + '(125 규약 — 단위를 안 잃는다)');
  const segOnly = await page.evaluate(() => {
    S.temper.alloc.atk = 150; renderTrain();
    const n = document.querySelector('#trTemper .tr-tp.k0 .tc s');
    const s = n ? n.textContent.trim() : null;
    S.temper.alloc.atk = 0; renderTrain();
    return s;
  });
  console.log(`      구간 문구 실측(Lv150): «${segOnly}»`);
  ok(PRE ? /^\d+~\d+ 구간 · 1레벨당$/.test(segOnly) : segOnly === null,
    PRE ? 'ⓑ-3 `.tc>s` 만 아는 정보는 «구간 경계» 뿐이다 — 값이 아니라 비용식 설명이라 주인 지시대로 지울 수 있다'
        : 'ⓑ-3 686 이후 — 그 비용식 설명 문구가 화면에 없다',
    '«' + segOnly + '»');

  /* ── ⓒ 비는 세로 예산 ───────────────────────────────────────────── */
  console.log('\n=== ⓒ 제거로 비는 세로 예산 — 두 프레임 ===');
  const geo = {};
  for (const H of [2280, 1600]) {
    const p = H === 2280 ? page : (await openAt(browser, H)).page;
    geo[H] = await p.evaluate(() => {
      const host = '#trTemper .tr-tp.k0';
      const g = s => window.__rel(host + ' ' + s, host);
      const row = window.__rel(host, '#trTemper');
      return { row, ti: g('.ti'), td: g('.td'), tc: g('.tc'), tb: g('.tb'),
               rowH: row.h };
    });
    const d = geo[H];
    console.log(`      ${H}: 행 ${d.rowH} · .ti ${d.ti.y}..${d.ti.y2}`
      + ` · .tc ${d.tc ? d.tc.y + '..' + d.tc.y2 : '없음(686)'} · .tb ${d.tb.y}..${d.tb.y2}`);
  }
  const A = geo[2280], B = geo[1600];
  ok(JSON.stringify(A) === JSON.stringify(B),
    'ⓒ-1 두 프레임에서 행 기하가 **같다**(404 선례의 «좁은 프레임에서 밀림» 이 여기엔 없다)');
  if (PRE) {
    const freed = p1(A.tb.y - A.tc.y);               /* .tc 상변 ~ 버튼 상변 = 버튼이 위로 자랄 수 있는 폭 */
    ok(freed > 0, 'ⓒ-2 버튼이 위로 자랄 수 있는 세로 예산',
      `.tc 상변 ${A.tc.y} → 버튼 상변 ${A.tb.y} = ${freed}px (현재 버튼 ${A.tb.h} → 최대 ${p1(A.tb.h + freed)})`);
  } else {
    ok(A.tb.h === 173 && A.tb.y === 22,
      'ⓒ-2 686 이후 — 버튼이 그 예산을 먹었다(74 → 코어 173 + 립 5 = 실루엣 178 · 상변 128 → 22)',
      `버튼 ${A.tb.y}..${A.tb.y2} (h ${A.tb.h})`);
  }
  ok(A.ti.y === 22 && A.ti.y2 === 200,
    'ⓒ-3 ★ 같은 행 아이콘 상자가 «행 222 − 위 22 − 아래 22 = 178» 로 이미 서 있다(자랄 목표치의 근거)',
    `.ti ${A.ti.y}..${A.ti.y2} (h ${A.ti.h})`);
  ok(A.td.x2 <= A.tb.x,
    'ⓒ-4 가로는 안 건드려도 된다 — `.td` 우변이 이미 버튼 좌변 왼쪽',
    `${A.td.x2} ≤ ${A.tb.x}`);

  /* ── ⓓ 라벨을 키울 가로 여지가 있는가 ───────────────────────────── */
  console.log('\n=== ⓓ 자릿수 스윕 — 라벨 잉크를 키울 가로 여지 (584 예산) ===');
  const sweep = await page.evaluate(() => {
    const row = document.querySelector('#trTemper .tr-tp.k0');
    const btn = row.querySelector('.tb'), ink = row.querySelector('.tb i');
    const box = btn.getBoundingClientRect();
    const inner = box.width - 5 * 2;                 /* 검정 링 5px 양쪽 */
    const base = getComputedStyle(btn).fontSize;
    const out = [];
    [31, 34, 38, 42].forEach(fs => {
      btn.style.fontSize = fs + 'px';
      let worst = 0, worstN = null;
      for (let d = 1; d <= 10; d++) {
        ink.innerHTML = curIc('tstone', TR_CUR_PX) + '9'.repeat(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const w = ink.getBoundingClientRect().width;
        if (w > worst) { worst = w; worstN = d; }
      }
      out.push({ fs, worst: Math.round(worst * 10) / 10, inner: Math.round(inner * 10) / 10,
                 slack: Math.round((inner - worst) * 10) / 10, digits: worstN });
    });
    btn.style.fontSize = base; renderTrain();
    return out;
  });
  sweep.forEach(s => console.log(`      fs ${s.fs}px: 최악(${s.digits}자리) 잉크 ${s.worst} · 내부 ${s.inner} · 여유 ${s.slack}`));
  const cur = sweep.find(s => s.fs === 31);
  ok(cur.slack > 0, 'ⓓ-1 현행 fs 31 은 자릿수 최악에서도 안 넘친다(584 예산이 지금 지켜지고 있다)',
    `여유 ${cur.slack}px`);
  const over = sweep.filter(s => s.slack <= 0).map(s => s.fs);
  ok(true, 'ⓓ-2 (기록) 라벨을 키우면 넘치기 시작하는 크기',
    over.length ? `fs ${over.join('·')} 에서 넘침 — «세로만» 이 안전한 이유` : '스윕 범위(31~42)에서는 안 넘침');

  console.log(`\nPROBE686 ${pass}/${pass + fail}` + (fail ? ' — FAIL ' + fail : ' PASS'));
  await ctx.close();
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
