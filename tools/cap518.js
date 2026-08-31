/* 작업 518 — 4회차 «눈» 하네스: 비평가 2인에게 줄 **연속 프레임** 캡처.
 *
 * 지시서 [3]-(다) — 연출 작업은 정지 1장이 아니라 트리거 직후 **6~8장**(80~100ms 간격)을 준다.
 *
 * 장면(주인이 보고한 두 자리 + 4회차가 새로 그물에 넣은 자리):
 *   A 12 소환 결과 팝업(#sumw z37)          — 주인 보고 ①
 *   B 09 일괄 강화 결과 팝업(#upw)          — 주인 보고 ②(«장비 일괄강화할때도 골드 이펙트»)
 *   C 07 스킬 시트(#panel z9 — 화면을 «다» 덮지 않는 층)  — 4회차 스윕이 처음 본 자리
 *   D 21 도감 [일괄 강화] 팝업(#collw)      — 같은 지시의 세 번째 자리
 *
 * 각 장면: 화면을 연다 → 그 안의 «재화를 안 주는» 자리를 누른다 →
 *   **발원 표시가 없는 골드**(`S.gold += 54321` — 1회차가 22291·22316 에서 고친 그 꼴)를 넣고
 *   8프레임(100ms)을 찍는다. 재화를 **한 푼도 안 받은** 화면이므로 팝업/시트 «위» 에
 *   금화·`+n`·알약 반짝임이 보이면 그것이 주인이 말한 «쌩뚱맞은 골드 이펙트» 다.
 *
 * 실행: node tools/cap518.js [회차]        (기본 r4 · 캡처는 docs/shots/ — .gitignore 대상)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const R = process.argv[2] || 'r4';
const OUT = path.resolve(__dirname, '../docs/shots');
const N = 8, IV = 100;

const SCENES = [
  { id: 'A-소환결과', open: () => {
      const keys = Object.keys(BANNERS), res = [], sn = new Set();
      for (let i = 0; i < 4000 && res.length < 10; i++) { const o = summonOne(keys[i % keys.length]); if (sn.has(o.it.id)) continue; sn.add(o.it.id); res.push(o); }
      showSummonResult('weapon', 10, res, false);
    }, tap: '#sumGridIn > *' },
  { id: 'B-일괄강화결과', open: () => {
      EQUIPS.slice(0, 6).forEach(it => { S.own[it.id] = { n: 400, l: (S.own[it.id] || {}).l || 1 }; });
      const rr = levelUpAll(wpnList());
      openUpAll(rr.ups);
    }, tap: '#upw .upr-card, #upw' },
  { id: 'C-스킬시트', open: () => {
      document.querySelector('.tab[data-t="hero"]').click();
      setTimeout(() => { const e = document.querySelector('#eqTabs [data-eqtab="sk"]'); if (e) e.click(); }, 300);
    }, wait: 900, tap: '#panel .sk-slot, #panel button' },
  { id: 'D-도감일괄강화', open: () => {
      document.querySelector('.side .ibtn[data-pop="coll"]').click();
    }, wait: 700, tap: '#collAll, #collw button' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium);
  for (const sc of SCENES) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.waitForTimeout(1100);
    await page.evaluate(() => { S.bossFarm = true; S.dia = 1e9; });          /* 453 — 보스전이 서면 열기가 no-op */
    await page.evaluate(sc.open);
    await page.waitForTimeout(sc.wait || 700);
    const meta = await page.evaluate(({ tapSel }) => {
      document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());
      const covered = fxCovered();
      const el = document.querySelector(tapSel);
      let rect = null;
      if (el) {
        const r = el.getBoundingClientRect();
        rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      }
      const g0 = S.gold;
      S.gold += 54321;                       /* 발원 «표시가 없는» 골드 — 수리 전 22291·22316 의 꼴 */
      return { covered, rect, gold0: g0 };
    }, { tapSel: sc.tap });
    for (let i = 0; i < N; i++) {
      await page.screenshot({ path: path.join(OUT, `518-${R}-${sc.id}-f${i + 1}.png`) });
      await page.waitForTimeout(IV);
    }
    const after = await page.evaluate(() => ({
      fxl: document.querySelectorAll('#fxl .fx-fly, #fxl .fx-plus, #fxl .fx-lit, #fxl .fx-spark').length,
      fxlc: document.querySelectorAll('#fxlc .fx-fly, #fxlc .fx-plus, #fxlc .fx-lit, #fxlc .fx-spark').length,
    }));
    console.log(`${sc.id.padEnd(16)} 덮음 ${meta.covered ? 'O' : '·'} · 탭 ${JSON.stringify(meta.rect)} · 마지막 프레임 #fxl ${after.fxl} / #fxlc ${after.fxlc} · ${N}장`);
    await ctx.close();
  }
  console.log('캡처 → ' + OUT + '/518-' + R + '-*.png');
  await b.close();
})();
