#!/usr/bin/env node
/* 작업 621 채점 캡처 — 「연속 강화 중 버튼 눌림 왕복」 연속 프레임
 * (지시서 [3]-(다) 연출 작업: 정지 1장이 아니라 **연속 프레임 6~8장**을 80~100ms 간격으로)
 *
 *   node tools/cap621.js [회차]
 *
 * 세 자리(훈련 카드 · 룬 [강화] · 단련 [단련]) × 「쉼(누르기 전) 1장 + 홀드 8장」.
 * 크롭 상자는 **누르기 전 배치 자리**로 고정한다 — 상자가 따라 커지면 크기 변화가 안 보인다.
 * 프레임마다 그 순간의 눌림 층(computed `scale`)과 그려진 폭을 같이 적어 `-frames.json` 으로 남긴다
 * (비평가에게는 **그림만** 주고, 수치는 review 표에 쓴다).
 *
 * ⚠ PNG 는 커밋하지 않는다 — `docs/review/*.png` 는 .gitignore 가 막는다(2026-08-30 이력 정리).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const IV = Number(process.env.C621_IV || 90);     /* 지시서 [3]-(다) — 80~100ms 간격 */
const N = Number(process.env.C621_N || 8);

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  const made = [], meta = {};
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(450);
    const r = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = (typeof jzRestRect === 'function') ? jzRestRect(el) : el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!r) { console.log('  ↯ ' + sp.id + ' 대상 없음'); continue; }

    /* 크롭 — 배치 자리 + 여백 24px(눌림 8px 이동과 1.06 맥박이 잘리지 않게) */
    const M = 24;
    const clip = { x: Math.max(0, r.x - M), y: Math.max(0, r.y - M), width: r.w + M * 2, height: r.h + M * 2 };
    const shot = async tag => {
      const f = path.join(OUT, '621-r' + R + '-' + sp.id + '-' + tag + '.png');
      await page.screenshot({ clip, path: f, animations: 'allow' });
      made.push(path.basename(f));
      return f;
    };
    const sample = () => page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      let sc = 'none'; try { sc = getComputedStyle(el).scale; } catch (_) {}
      return { sc, w: Math.round(el.getBoundingClientRect().width * 100) / 100 };
    }, sp.sel);

    meta[sp.id] = { n: sp.n, rest: r, frames: [] };
    await shot('rest');
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(420);                 /* 첫 발·350ms 대기를 지나 «반복» 구간에서 찍는다 */
    for (let i = 0; i < N; i++) {
      const m = await sample();
      await shot('f' + String(i + 1));
      meta[sp.id].frames.push({ i: i + 1, sc: m ? m.sc : 'n/a', w: m ? m.w : 0 });
      await page.waitForTimeout(IV);
    }
    await page.mouse.up();
    await page.waitForTimeout(320);
    await shot('after');
  }

  fs.writeFileSync(path.join(OUT, '621-r' + R + '-frames.json'), JSON.stringify(meta, null, 1));
  console.log(made.length + '장 — ' + OUT);
  for (const k of Object.keys(meta))
    console.log('  ' + k + ' ' + meta[k].frames.map(f => f.i + ':' + f.sc + '/' + f.w).join('  '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
