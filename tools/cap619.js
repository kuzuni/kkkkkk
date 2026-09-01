#!/usr/bin/env node
/* 작업 619 — 「연속 강화 때 이펙트가 매 강화마다 터진다」 **연속 프레임 캡처** (지시서 [3]-(다))
 *
 *   node tools/cap619.js [회차]        기본 1
 *
 * 세 화면(훈련 카드 · 룬 [강화] · 단련 [단련])을 각각 **꾹 누른 채** 연속 8장 찍는다.
 * 첫 장은 «누르기 전»(대조) 이고 나머지 7장이 홀드 반복 구간이다 — 반복분에 이펙트가
 * «계속 터지는가» 는 정지 1장으로는 판단할 수 없다(그래서 (다) 가 연속 프레임을 요구한다).
 *
 * ⚠ 캡처는 **커밋하지 않는다**(ROUTINE 서두 2026-08-30 이력 정리 · `docs/review/*.png` 는 .gitignore).
 * ⚠ 클립은 호스트 bbox + 여유 140px — 버스트는 호스트 «테두리 바깥» 에서 태어난다(fxBurst 21회차).
 * ⚠ 전투 캔버스는 매 프레임 달라 판단을 오염시키므로 가린다(cap491 과 같은 규칙).
 * ⚠ 실제 촬영 간격은 스크린샷 비용 때문에 명목값보다 길다 — 장마다 «누른 뒤 경과 ms» 를 같이 찍어
 *   `docs/review/619-frames-r<n>.json` 에 남긴다(비평가에게 그 표를 준다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');
const GAP = Number(process.env.C619_GAP || 90);
const N = Number(process.env.C619_N || 7);

const SCENES = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',        n: '23 훈련 카드(64 홀드)' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',           n: '룬 [강화](297 홀드)' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0',       n: '단련 [단련](297 홀드)' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(500);

  const log = [];
  for (const sc of SCENES) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sc.tab);
    await page.waitForTimeout(450);
    const g = await page.evaluate(([sel, host]) => {
      const b = document.querySelector(sel), h = document.querySelector(host) || b;
      if (!b || !h) return null;
      const rb = b.getBoundingClientRect(), rh = h.getBoundingClientRect();
      return { bx: rb.x + rb.width / 2, by: rb.y + rb.height / 2,
               x: rh.x, y: rh.y, w: rh.width, h: rh.height };
    }, [sc.sel, sc.host]);
    if (!g) { console.log('  ✗ ' + sc.id + ' 대상 없음'); continue; }
    const M = 140, VW = 1080, VH = 2280;
    const x0 = Math.max(0, g.x - M), y0 = Math.max(0, g.y - M);
    const clip = { x: x0, y: y0,
                   width: Math.min(g.w + 2 * M, VW - x0),
                   height: Math.min(g.h + 2 * M, VH - y0) };

    const f0 = path.join(OUT, '619-' + sc.id + '-r' + R + '-f0.png');
    await page.screenshot({ path: f0, clip });
    log.push({ scene: sc.id, frame: 0, ms: -1, file: path.basename(f0), note: '누르기 전(대조)' });

    await page.mouse.move(g.bx, g.by);
    const t0 = Date.now();
    await page.mouse.down();
    for (let i = 1; i <= N; i++) {
      const want = t0 + i * GAP;
      const wait = want - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      const f = path.join(OUT, '619-' + sc.id + '-r' + R + '-f' + i + '.png');
      const at = Date.now() - t0;
      await page.screenshot({ path: f, clip });
      log.push({ scene: sc.id, frame: i, ms: at, file: path.basename(f), note: '홀드 중' });
    }
    await page.mouse.up();
    await page.waitForTimeout(420);
    console.log('  ✓ ' + sc.id + ' — 8장 (clip ' + Math.round(clip.width) + '×' + Math.round(clip.height) + ')');
  }

  fs.writeFileSync(path.join(OUT, '619-frames-r' + R + '.json'), JSON.stringify(log, null, 1));
  console.log('\n캡처 완료 — docs/review/619-*-r' + R + '-f*.png (커밋 금지) · 표 619-frames-r' + R + '.json');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
