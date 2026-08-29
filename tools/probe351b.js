#!/usr/bin/env node
/* 351 5회차 프로브 — «08 시트 액션 버튼이 스크롤로 회수되나» 한 줄을 자로 못박는다.
 *
 * 4회차가 남긴 유일한 «사실이 안 갈린 자리»다:
 *   BT — «콘텐츠 끝단이라 스크롤로 못 올린다» (감점)
 *   BS — «스크롤로 회수 가능» (구조 한계로 뺌)
 * 2대1 로 감점에서 뺐지만 **둘이 사실에서 엇갈렸다** — 점수가 아니라 자로 답할 자리다.
 *
 * 재는 것 (스킬·코스튬·펫 시트 × 1600 / 2280):
 *   A 스크롤 «전»  — 버튼이 뷰포트(.shsc) 안에 보이는 비율 · 서브탭 바와 겹치는 px
 *   B 스크롤 «끝»  — 같은 값. 여기서 100% 가 되면 «스크롤로 회수» 가 참이다.
 *   C 스크롤 여유  — scrollHeight − clientHeight (0 이면 스크롤 자체가 없다 = 회수 불가)
 *   D 포인터       — 버튼 중심에 elementFromPoint 가 무엇을 돌려주나(실제로 눌리는가)
 *
 * ⚠ .shsc-in 은 height 가 **고정**(1289px)이다. 버튼 하변이 그 값을 넘으면 스크롤 끝에서도
 *   못 올라온다 — BT 가 옳은 경우가 바로 이것이라 C·D 를 같이 잰다.
 *
 * 실행: node tools/probe351b.js [--json <경로>]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

const SIZES = [[1080, 2280], [1080, 1600]];
const TABS = [
  { key: 'sk', sheet: '#bSk', name: '스킬' },
  { key: 'cos', sheet: '#bCos', name: '코스튬' },
  { key: 'pet', sheet: '#bPet', name: '펫' },
];

async function fresh(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page };
}

/* 60 쥬시 개봉 연출 중에 재면 scale 구간이 잡힌다(probe351 과 같은 처방) */
async function settle(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(180);
}

const measure = (sheetSel) => {
  const sheet = document.querySelector(sheetSel);
  if (!sheet) return { err: 'no sheet ' + sheetSel };
  const sc = sheet.querySelector('.shsc');
  const inn = sheet.querySelector('.shsc-in');
  /* 시트의 액션 버튼은 `.sk-btn`(= [스킬 소환] `.sk-b1` · [일괄 강화] `.sk-b2`)이다.
     `.sk-act` 는 08 «세부 팝업» 쪽 부품이라 시트에는 없다 — 처음에 그걸 물어 0/0 이 나왔다. */
  const btns = [...sheet.querySelectorAll('.sk-btn')];
  const bar = sheet.querySelector('.stabs') || document.querySelector('#eqTabs');
  if (!sc || !btns.length) return { err: 'no shsc/.sk-btn in ' + sheetSel };
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), b: +b.bottom.toFixed(1) }; };
  const scR = r(sc);
  /* 버튼 행 = 버튼들의 합집합 상자 */
  const rs = btns.map(r);
  const y0 = Math.min(...rs.map((b) => b.y)), y1 = Math.max(...rs.map((b) => b.b));
  const x0 = Math.min(...rs.map((b) => b.x)), x1 = Math.max(...rs.map((b) => b.x + b.w));
  const actR = { x: x0, y: y0, w: +(x1 - x0).toFixed(1), h: +(y1 - y0).toFixed(1), b: y1 };
  /* 뷰포트(.shsc) 안에 보이는 세로 비율 */
  const vis = Math.max(0, Math.min(actR.b, scR.b) - Math.max(actR.y, scR.y));
  const barR = bar ? r(bar) : null;
  /* 서브탭 바와의 겹침(바가 버튼 위를 덮는가) */
  const ov = barR ? Math.max(0, Math.min(actR.b, barR.b) - Math.max(actR.y, barR.y)) : null;
  const cx = actR.x + actR.w / 2, cy = actR.y + actR.h / 2;
  const hit = document.elementFromPoint(cx, cy);
  const hitBtn = (() => {
    const b0 = btns[0].getBoundingClientRect();
    const e = document.elementFromPoint(b0.x + b0.width / 2, b0.y + b0.height / 2);
    if (!e) return null;
    const own = e.closest('.sk-btn') ? 'SELF:' : '';
    return own + e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '');
  })();
  return {
    sheet: r(sheet),
    shsc: scR,
    innH: inn ? +inn.getBoundingClientRect().height.toFixed(1) : null,
    scrollTop: +sc.scrollTop.toFixed(1),
    scrollH: sc.scrollHeight, clientH: sc.clientHeight,
    slack: sc.scrollHeight - sc.clientHeight,
    act: actR,
    visPx: +vis.toFixed(1), visPct: +(actR.h ? (vis / actR.h) * 100 : 0).toFixed(1),
    bar: barR, barCls: bar ? bar.className : null, barOverlap: ov === null ? null : +ov.toFixed(1),
    hit: hit ? (hit.tagName.toLowerCase() + (hit.className ? '.' + String(hit.className).split(' ')[0] : '')) : null,
    hitBtn,
    btnLabels: btns.map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20)),
  };
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  for (const [w, h] of SIZES) {
    for (const t of TABS) {
      const { ctx, page } = await fresh(browser, w, h);
      await page.click('.tab[data-t="hero"]', { timeout: 4000, force: true }).catch(() => {});
      await page.waitForTimeout(450);
      await page.evaluate((k) => { const el = document.querySelector(`#eqTabs [data-eqtab="${k}"]`); if (el) el.click(); }, t.key);
      await page.waitForTimeout(500);
      await settle(page);
      const before = await page.evaluate(measure, t.sheet);
      /* 스크롤 끝까지 */
      await page.evaluate((s) => {
        const sc = document.querySelector(s + ' .shsc');
        if (sc) sc.scrollTop = sc.scrollHeight;
      }, t.sheet);
      await page.waitForTimeout(260);
      const after = await page.evaluate(measure, t.sheet);
      out.push({ frame: `${w}x${h}`, tab: t.key, name: t.name, before, after });
      await ctx.close();
    }
  }
  await browser.close();

  /* ---- 보고 ---- */
  let pass = 0, tot = 0;
  const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };
  console.log('[A] 스크롤 «전» — 액션 버튼 행(.sk-act)이 시트 뷰포트에 보이는 비율');
  for (const o of out) {
    const b = o.before;
    if (b.err) { console.log(`  ?? ${o.frame} ${o.name} — ${b.err}`); continue; }
    console.log(`  ${o.frame} ${o.name}: 버튼행 ${b.act.y}..${b.act.b} · 뷰포트 ${b.shsc.y}..${b.shsc.b} · 보임 ${b.visPct}% · 포인터 ${b.hit} · 라벨 ${JSON.stringify(b.btnLabels)}`);
  }
  console.log('[B] 스크롤 «끝» — 같은 값');
  for (const o of out) {
    const a = o.after;
    if (a.err) continue;
    console.log(`  ${o.frame} ${o.name}: scrollTop ${a.scrollTop}/${a.slack} · 버튼행 ${a.act.y}..${a.act.b} · 보임 ${a.visPct}% · 포인터 ${a.hit}`);
  }
  console.log('[C] 판정 — 1600 에서 스크롤 끝에 버튼이 온전히 보이나(= «스크롤로 회수» 가 참인가)');
  for (const o of out.filter((x) => x.frame === '1080x1600')) {
    if (o.after.err) continue;
    ck(`1600 ${o.name} 시트 액션 버튼 스크롤 끝 100% 보임`, o.after.visPct >= 99.5,
      `보임 ${o.before.visPct}% → ${o.after.visPct}% (여유 ${o.after.slack}px · scrollH ${o.after.scrollH} · clientH ${o.after.clientH})`);
    ck(`1600 ${o.name} 시트 액션 버튼이 실제로 눌린다(포인터가 그 버튼 자신)`, String(o.after.hitBtn).startsWith('SELF:'),
      `포인터 ${o.after.hitBtn}`);
  }
  console.log('[D] 2280 대조 — 9:19 에서는 처음부터 보이나');
  for (const o of out.filter((x) => x.frame === '1080x2280')) {
    if (o.before.err) continue;
    ck(`2280 ${o.name} 스크롤 전 100% 보임`, o.before.visPct >= 99.5, `보임 ${o.before.visPct}% (여유 ${o.before.slack}px)`);
  }
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
  console.log(`\nPROBE351B ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
})();
