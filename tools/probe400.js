#!/usr/bin/env node
/* 작업 400 재현기 — 55 설정 팝업(#cfw>.cf55)이 짧은 프레임에서 탭바·HUD 판때기를 파고드는가.
   338 규칙: 처방 전에 «찍힌 값» 으로 먼저 재현한다. probe351 D7 과 같은 축(클리핑 접은 drawn 상자)을
   쓰되, 이 작업이 실제로 고쳐야 하는 «띠»(위 .pedge 하변 · 아래 #tabbar 상변)와 본문 콘텐츠 하변까지
   같이 재서 «여백만 줄이면 본문이 잘리는가» 를 한 번에 답하게 한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HS = process.argv.includes('--all') ? [2280, 1920, 1600] : [2280, 1600];

const OPEN = async (page) => {
  await page.evaluate(() => document.querySelector('#menub').click());
  await page.waitForTimeout(340);
  await page.evaluate(() => { const e = document.querySelector('#mnw [data-mn="conf"]'); if (e) e.click(); });
  await page.waitForTimeout(600);
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 4000 }).catch(() => {});
};

(async () => {
  const b = await launch(chromium);
  const out = {};
  for (const H of HS) {
    const pg = await b.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    await pg.goto(FILE); await pg.waitForTimeout(1500);
    await OPEN(pg);
    out[H] = await pg.evaluate(() => {
      const R = (s) => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bot: +b.bottom.toFixed(1) }; };
      const app = document.getElementById('app');
      /* 본문 안 절대배치 자식의 «가장 아래» — 여백을 줄이면 여기가 먼저 잘린다 */
      const body = document.querySelector('.cf55-body');
      let ink = 0, inkOf = '';
      if (body) {
        const bb = body.getBoundingClientRect();
        for (const c of body.querySelectorAll('*')) {
          const r = c.getBoundingClientRect();
          if (!r.height) continue;
          const rel = r.bottom - bb.top;
          if (rel > ink) { ink = rel; inkOf = c.className || c.tagName; }
        }
      }
      return {
        frameH: +app.getBoundingClientRect().height.toFixed(1),
        shortf: app.classList.contains('shortf'),
        cfwPad: getComputedStyle(document.getElementById('cfw')).padding,
        cf55: R('.cf55'), body: R('.cf55-body'), pedge: R('.pedge'), tabbar: R('#tabbar'),
        bodyInkBottom: +ink.toFixed(1), bodyInkOf: inkOf,
        bodySlack: body ? +(body.getBoundingClientRect().height - ink).toFixed(1) : null,
      };
    });
    await pg.close();
  }
  await b.close();

  let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) bad++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
  for (const H of HS) {
    const r = out[H];
    const band = { top: r.pedge ? r.pedge.bot : 0, bot: r.tabbar ? r.tabbar.y : r.frameH };
    const overTab = r.tabbar ? +(r.cf55.bot - r.tabbar.y).toFixed(1) : 0;
    const overHud = r.pedge ? +(r.pedge.bot - r.cf55.y).toFixed(1) : 0;
    console.log(`\n[H=${H}] frameH=${r.frameH} shortf=${r.shortf} #cfw padding=${r.cfwPad}`);
    console.log(`  .cf55   ${r.cf55.y}..${r.cf55.bot} (h ${r.cf55.h})`);
    console.log(`  띠      ${band.top}..${band.bot} (h ${+(band.bot - band.top).toFixed(1)})  [.pedge 하변 ~ #tabbar 상변]`);
    console.log(`  본문    h ${r.body.h} · 잉크 하변 ${r.bodyInkBottom}(${r.bodyInkOf}) · 여유 ${r.bodySlack}`);
    console.log(`  침범    탭바 ${overTab > 0 ? '+' + overTab : overTab} · HUD ${overHud > 0 ? '+' + overHud : overHud}`);
    ok(overTab <= 0, `[${H}] .cf55 하변이 탭바 위 (침범 ${overTab})`);
    ok(overHud <= 0, `[${H}] .cf55 상변이 HUD 판때기 아래 (침범 ${overHud})`);
    ok(r.bodySlack >= 0, `[${H}] 본문이 안 잘린다 (여유 ${r.bodySlack})`);
  }
  console.log(`\n[probe400] ${n - bad}/${n} ${bad ? 'FAIL' : 'PASS'}`);
  process.exit(bad ? 1 : 0);
})();
