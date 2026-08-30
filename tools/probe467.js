#!/usr/bin/env node
/* 467 재현/자 — 05 장비 세부 팝업(`#wpnw`)이 짧은 프레임에서 «주 행동 버튼을 스크롤 0 에서
 * 몇 % 보이는가» 와 «탭바·HUD 판때기·미션 배너를 몇 px 파고드는가» 를 프레임별로 잰다.
 *
 * 실행: node tools/probe467.js [--frames 2280,1920,1842,1805,1791,1600] [--json <경로>]
 *
 * 왜 자를 먼저 두는가(338·341·350·363·368 규칙): 351 14회차의 비평가 셋(DE·DF·DG)이 방향은
 * 맞고 **기전은 셋 다 틀렸다**(«버튼은 스크롤 그릇 밖의 고정 푸터라 스크롤로 회수 불가» —
 * 실제로는 `.wm-body` **안**이고 끝까지 내리면 100% 보인다). 처방을 그 기전 위에 세우면
 * 404 처방(버튼을 그릇 밖으로)으로 **없는 병을 고친다.** ⇒ 처방 전에 제품에게 직접 묻는다.
 *
 * 재는 것(프레임마다):
 *   ① `.wm` 상·하변 ↔ HUD 판때기 하변(142) · 탭바 상변(frameH − 180) 겹침 px
 *   ② `.wm-body` 뷰포트 · `scrollHeight/clientHeight`(넘침)
 *   ③ 두 버튼(`#wpnBtnEq`·`#wpnBtnUp`)의 **스크롤 0 에서 보이는 세로 비율**
 *   ④ `#tuto`(미션 배너)가 보이는가 · 팝업 상자와 겹치는가
 *   ⑤ 격자(`#wpnGrid`)에 보이는 행 수(피치 190)
 *
 * 세 슬롯(무기·방패·목걸이)은 내용만 다르고 기하는 픽셀 동일이다(351 14회차 실측) — 기본은
 * `weapon` 한 판만 재고, `--all` 을 주면 셋 다 재서 그 동일성을 확인한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = process.env.P467_FILE
  ? ('file://' + path.resolve(process.env.P467_FILE))
  : ('file://' + path.resolve(__dirname, '../index.html'));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const FRAMES = arg('--frames', '2280,1920,1842,1805,1791,1600').split(',').map(Number);
const SLOTS = process.argv.includes('--all') ? ['weapon', 'shield', 'amulet'] : ['weapon'];
const JSONOUT = arg('--json', null);

const R = (n) => Math.round(n * 10) / 10;

async function open(browser, h, slot) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(420);
  await page.evaluate((k) => {
    const e = document.querySelector(`#eqCards [data-eqslot="${k}"]`);
    if (e) e.click();
  }, slot);
  await page.waitForTimeout(520);
  return { ctx, page, errs };
}

async function measure(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const rc = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom, w: r.width, h: r.height }; };
    const app = q('#app').getBoundingClientRect();
    const tab = q('#tabbar').getBoundingClientRect();
    const ped = q('.pedge') ? q('.pedge').getBoundingClientRect() : null;
    const tuto = q('#tuto');
    const tutoVis = tuto ? (getComputedStyle(tuto).display !== 'none' && tuto.getBoundingClientRect().height > 0) : false;
    const body = q('.wm-body');
    const bodyR = body.getBoundingClientRect();
    const btn = (s) => {
      const e = q(s); const r = e.getBoundingClientRect();
      const top = Math.max(r.top, bodyR.top), bot = Math.min(r.bottom, bodyR.bottom);
      return { r: { y1: r.top, y2: r.bottom, h: r.height }, vis: Math.max(0, bot - top) };
    };
    const grid = q('#wpnGrid').getBoundingClientRect();
    return {
      app: { y1: app.top, y2: app.bottom, h: app.height },
      wm: rc('.wm'),
      body: { y1: bodyR.top, y2: bodyR.bottom, h: bodyR.height, sh: body.scrollHeight, ch: body.clientHeight, st: body.scrollTop },
      inH: q('.wm-in').getBoundingClientRect().height,
      grid: { y1: grid.top, y2: grid.bottom, h: grid.height, sh: q('#wpnGrid').scrollHeight },
      tot: rc('.wm-tot'),
      b1: btn('#wpnBtnEq'), b2: btn('#wpnBtnUp'),
      tabbarTop: tab.top, pedgeBot: ped ? ped.bottom : null,
      tuto: tutoVis ? (() => { const r = tuto.getBoundingClientRect(); return { y1: r.top, y2: r.bottom, x1: r.left, x2: r.right }; })() : null,
      open: q('#wpnw').classList.contains('on'),
    };
  });
}

(async () => {
  const browser = await launch(chromium);
  const out = [];
  let bad = 0;
  for (const slot of SLOTS) {
    for (const h of FRAMES) {
      const { ctx, page, errs } = await open(browser, h, slot);
      const m = await measure(page);
      if (!m.open) { console.log(`  ✖ ${slot} @${h} — #wpnw 가 안 열렸다(진입 실패)`); bad++; await ctx.close(); continue; }
      const covTab = R(Math.max(0, m.wm.y2 - m.tabbarTop));
      const covHud = R(Math.max(0, m.pedgeBot - m.wm.y1));
      const over = Math.max(0, m.body.sh - m.body.ch);
      const v1 = m.b1.r.h ? R(m.b1.vis / m.b1.r.h * 100) : 0;
      const v2 = m.b2.r.h ? R(m.b2.vis / m.b2.r.h * 100) : 0;
      const covTuto = m.tuto ? R(Math.max(0, Math.min(m.wm.y2, m.tuto.y2) - Math.max(m.wm.y1, m.tuto.y1))) : 0;
      const rows = R(m.grid.h / 190);
      const rec = { slot, frame: h, wm: [R(m.wm.y1), R(m.wm.y2)], wmH: R(m.wm.h),
        body: [R(m.body.y1), R(m.body.y2)], bodyH: R(m.body.h), sh: m.body.sh, ch: m.body.ch, over,
        btn: [R(m.b1.r.y1), R(m.b1.r.y2)], vis: [v1, v2], inH: R(m.inH),
        gridH: R(m.grid.h), rows, tot: R(m.tot.y1),
        tabbarTop: R(m.tabbarTop), covTab, pedgeBot: R(m.pedgeBot), covHud,
        tuto: m.tuto ? [R(m.tuto.y1), R(m.tuto.y2)] : null, covTuto, errs };
      out.push(rec);
      console.log(
        `  ${slot} @${h}  .wm ${rec.wm[0]}..${rec.wm[1]} (h${rec.wmH})  본문 ${rec.body[0]}..${rec.body[1]}` +
        `  sh/ch ${rec.sh}/${rec.ch} 넘침 ${over}\n` +
        `        버튼 ${rec.btn[0]}..${rec.btn[1]}  스크롤0 보임 ${v1}% / ${v2}%` +
        `  격자 h${rec.gridH}(${rows}행)  총효과 top ${rec.tot}\n` +
        `        탭바침범 ${covTab}  HUD침범 ${covHud}  배너 ${m.tuto ? '보임 ' + rec.tuto[0] + '..' + rec.tuto[1] + ' 침범 ' + covTuto : '숨김(419)'}` +
        (errs.length ? `\n        ⚠ pageerror ${errs.length}건: ${errs[0]}` : ''));
      if (errs.length) bad++;
      await ctx.close();
    }
  }
  await browser.close();
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
  console.log(`\n  판 ${out.length}개 · 문제 ${bad}건`);
  process.exit(bad ? 1 : 0);
})();
