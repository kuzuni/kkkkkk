#!/usr/bin/env node
/* 재현 — 작업 688 «재화 잔량 헤더 규약 통일» (주인 지시 2026-09-02 01:25)
 *
 *   node tools/probe688.js
 *
 * 338 규칙: 처방 전에 **현재 상태를 직접 잰다.** 등재문은 세 가지를 주장한다 —
 *   ⓐ 단련 헤더가 한글 «단련석» 라벨을 달고 있다
 *   ⓑ 그 헤더가 왼쪽 정렬이다(중앙이 아니다)
 *   ⓒ 룬(687)·단련(613) 두 헤더가 «한 부품» 이 아니다 — 아이콘 크기·글자 크기가 갈린다
 * 셋을 각각 수치로 찍는다. 수리 뒤 같은 자로 다시 재면 그대로 대조가 된다.
 *
 * 잉크 중앙은 **상자가 아니라 잉크**로 잰다(687 4회차 규약) — 아이콘 아트마다
 * 상자 대비 잉크 폭이 다르다: rstone viewBox 40/64 = **0.625** · tstone 48/48 = **1.0**.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = 'file://' + path.join(path.resolve(__dirname, '..'), 'index.html');

/* 아이콘 아트의 «상자 대비 잉크 폭» — SVG viewBox 에서 온 값이다(손 상수가 아니라 파생) */
const INK = { rstone: 40 / 64, tstone: 48 / 48 };

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

const read = async (page, ink) => page.evaluate(sel => {
  const one = (hostSel, ratio) => {
    const hd = document.querySelector(hostSel);
    if (!hd) return null;
    const i = hd.querySelector('.pv i') || hd.querySelector('.pv');
    const hb = hd.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(i);
    const ib = rg.getBoundingClientRect();
    const im = i.querySelector('img.cic');
    const mb = im ? im.getBoundingClientRect() : null;
    const inkL = mb ? mb.left + (mb.width - mb.width * ratio) / 2 : ib.left;
    const cs = getComputedStyle(i);
    return {
      txt: i.textContent.replace(/\s+/g, ' ').trim(),
      hangul: (i.textContent.match(/[가-힣]/g) || []).length,
      icon: mb ? Math.round(mb.width) : 0,
      fs: Math.round(parseFloat(cs.fontSize)),
      align: getComputedStyle(hd).textAlign,
      hd: { x: Math.round(hb.x), w: Math.round(hb.width), h: Math.round(hb.height) },
      boxCx: +((ib.left + ib.right) / 2 - (hb.left + hb.right) / 2).toFixed(2),
      inkCx: +((inkL + ib.right) / 2 - (hb.left + hb.right) / 2).toFixed(2)
    };
  };
  return { temper: one(sel.t, sel.rt), rune: one(sel.r, sel.rr) };
}, { t: '#trTemper .tp-hd', r: '#rnHd', rt: ink.tstone, rr: ink.rstone });

(async () => {
  const browser = await launch(chromium);
  const out = {};
  for (const h of [2280, 1600]) {
    const { ctx, page, errs } = await boot(browser, h);
    await page.evaluate(() => {
      S.gold = 1e12; S.dia = 1e6; S.rstone = 12345; S.tstone = 1234567; S.stage = 400;
      S.rune = { r1: 5, r2: 0, r3: 0 };
      markDirty(); openTrain(); setTrSub('temper'); renderTrain();
    });
    await page.waitForTimeout(120);
    const t = await read(page, INK);
    await page.evaluate(() => { setTrSub('rune'); setRuneSub('r1'); renderTrain(); });
    await page.waitForTimeout(120);
    const r = await read(page, INK);
    out[h] = { temper: t.temper, rune: r.rune, errs: errs.slice(0, 3) };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
  const t = out[2280].temper, r = out[2280].rune;
  console.log('\n— 요약(1080×2280) —');
  console.log('ⓐ 단련 헤더 한글 글자수 : ' + t.hangul + '자  («' + t.txt + '»)');
  console.log('ⓑ 단련 헤더 잉크 중앙 Δx : ' + t.inkCx + 'px  (0 이 중앙 · align=' + t.align + ')');
  console.log('ⓒ 아이콘 상자 단련/룬    : ' + t.icon + ' / ' + r.icon + 'px   글자 ' + t.fs + ' / ' + r.fs + 'px');
  console.log('   룬 헤더 한글/잉크Δx    : ' + r.hangul + '자 / ' + r.inkCx + 'px');
})().catch(e => { console.error(e); process.exit(1); });
