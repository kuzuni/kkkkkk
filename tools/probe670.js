#!/usr/bin/env node
/* 재현 — 작업 670 «단련 버튼 비용 표기 간소화» (2026-09-02 주인 지시)
 *
 *   node tools/probe670.js
 *
 * 338 규칙: **처방 전에 재현한다.** 등재문의 읽기는 셋이고 이 자가 셋을 각각 확인/기각한다.
 *   ⓐ 단련 강화 버튼(`.tr-tp>.tb`)의 라벨이 «단련 (아이콘) n» 이다 — 주인이 지운 그 «단련» 이 여기 있다
 *   ⓑ 그 «단련» 을 빼도 버튼이 «무슨 버튼인지» 를 잃지 않는다 — 같은 행에 제목이 따로 있는가
 *      (등재문 ⚠ «버튼 자체 제목이 따로 있는지 확인»). 있으면 비용 줄만 간소화가 정답이다.
 *   ⓒ 라벨이 짧아져도 버튼 상자(584 가 300 → 340 으로 넓힌 것)를 다시 좁힐 이유가 있는가 —
 *      584 가 넓힌 근거는 «자릿수 최악에서 넘친다» 였으니 **자릿수 스윕**으로 여유를 잰다.
 *
 * 이 자는 «무엇이 지금 어떤가» 만 찍는다(합격/불합격 판정은 verify670).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });

  /* ── ⓐ 라벨 실측 ─────────────────────────────────────────────── */
  console.log('\n=== ⓐ 단련 버튼 라벨 — 지금 무엇이 찍혀 있는가 ===');
  const lab = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#trTemper .tr-tp')];
    return rows.map(r => {
      const b = r.querySelector('.tb i'), t = r.querySelector('.tn i'), c = r.querySelector('.tc i');
      return {
        k: r.dataset.temper,
        btn: b.textContent.replace(/\s+/g, ' ').trim(),
        btnHtml: b.innerHTML,
        imgs: b.querySelectorAll('img.cic').length,
        title: t ? t.textContent.replace(/\s+/g, ' ').trim() : null,
        cost: c ? c.textContent.replace(/\s+/g, ' ').trim() : null,
        cur: typeof temperCost === 'function' ? temperCost(r.dataset.temper) : null,
      };
    });
  });
  lab.forEach(r => console.log(`      ${r.k}: 버튼 «${r.btn}» · 행 제목 «${r.title}» · 비용 열 «${r.cost}» · 아이콘 ${r.imgs}장`));
  ok(lab.every(r => /단련/.test(r.btn)),
    'ⓐ 버튼 라벨에 «단련» 텍스트가 있다(주인이 지목한 그 자리)',
    lab.map(r => '«' + r.btn + '»').join(' · '));
  ok(lab.every(r => r.imgs === 1),
    'ⓐ2 라벨 안 화폐 아이콘은 행마다 1장(613·584 규약)');
  ok(lab.every(r => String(r.btn).replace(/[^\d]/g, '') === String(r.cur)),
    'ⓐ3 라벨의 수 = `temperCost()` 파생값',
    lab.map(r => r.btn.replace(/[^\d]/g, '') + '↔' + r.cur).join(' · '));

  /* ── ⓑ 버튼이 «무슨 버튼인지» 를 다른 데서 말하는가 ─────────────── */
  console.log('\n=== ⓑ 버튼 제목이 따로 있는가(«단련» 을 빼도 뜻이 남는가) ===');
  ok(lab.every(r => /단련/.test(r.title || '')),
    'ⓑ 같은 행의 제목 `.tn` 이 «<축> 단련» 이라고 이미 말한다 ⇒ 버튼의 «단련» 은 **중복**이다',
    lab.map(r => '«' + r.title + '»').join(' · '));
  const tab = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.stab[data-trsub]')].find(n => n.dataset.trsub === 'temper');
    return t ? t.textContent.trim() : null;
  });
  ok(/단련/.test(tab || ''), 'ⓑ2 서브탭 이름도 «단련» 이다(세 번째 말)', '«' + tab + '»');

  /* ── ⓒ 자릿수 스윕 — 넘침 여유 ───────────────────────────────── */
  console.log('\n=== ⓒ 자릿수 스윕 — 라벨 잉크가 버튼 안에 남는가(584 가 340 으로 넓힌 그 축) ===');
  const sweep = await page.evaluate(() => {
    const row = document.querySelector('#trTemper .tr-tp.k0');
    const b = row.querySelector('.tb'), i = row.querySelector('.tb i');
    const box = b.getBoundingClientRect();
    const out = [];
    const mk = (pre, digits) => {
      i.innerHTML = pre + curIc('tstone', TR_CUR_PX) + '9'.repeat(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const r = i.getBoundingClientRect();
      return { pre: pre ? 'with' : 'bare', digits, ink: +r.width.toFixed(2),
               room: +(box.width - 10 - r.width).toFixed(2) };
    };
    for (const pre of ['단련 ', '']) for (const d of [1, 4, 7, 10]) out.push(mk(pre, d));
    return { box: { w: +box.width.toFixed(1), h: +box.height.toFixed(1) }, out };
  });
  console.log(`      버튼 상자 ${sweep.box.w}×${sweep.box.h}`);
  sweep.out.forEach(r => console.log(`      ${r.pre.padEnd(4)} ${String(r.digits).padStart(2)}자리 · 라벨 잉크 ${r.ink} · 안쪽 여유 ${r.room}`));
  const w10 = sweep.out.find(r => r.pre === 'with' && r.digits === 10);
  const b10 = sweep.out.find(r => r.pre === 'bare' && r.digits === 10);
  ok(w10.room >= 0, 'ⓒ 수리 전에도 10자리까지는 안 넘친다(584 의 340 판단이 옳았다)', '여유 ' + w10.room);
  ok(b10.room > w10.room,
    'ⓒ2 «단련» 을 빼면 여유가 늘어난다 ⇒ 상자를 좁힐 «넘침» 근거는 안 생긴다(좁히면 여유만 되돌린다)',
    `${w10.room} → ${b10.room} (Δ+${p2(b10.room - w10.room)})`);

  console.log(`\nPROBE670 ${pass}/${pass + fail}` + (fail ? `  ← FAIL ${fail}건` : ''));
  await ctx.close(); await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
