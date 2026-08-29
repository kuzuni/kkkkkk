#!/usr/bin/env node
/* 403 게이트 — 06 장비 시트가 **9:13.3(1600)에서 스크롤 없이 다 보인다**,
 *              그리고 **9:19·9:16 은 한 픽셀도 안 움직였다**.
 *
 * 이 자가 지키는 것은 «값» 이 아니라 «규칙» 이다. 403 은 상수 세 벌(콘텐츠 1418 · 카드 1284 ·
 * 슬롯 256/656/1056 · 알약 1330 …)을 **카드 높이에서 나오는 식**으로 바꿨고, 그 식은
 * P=1444 에서 옛 상수를 그대로 뱉도록 역산돼 있다. 그래서 절이 넷이다:
 *
 *   [A] 9:19·9:16 Δ0    — 시트 로컬 좌표가 옛 상수와 **정확히** 같은가(0.5px 이내)
 *   [B] 9:13.3 요구      — 시트 스크롤 여유 0 · 여섯 부품 전부 뷰포트 안 100%
 *   [C] 규칙 항등식      — 프레임과 무관하게 성립해야 하는 관계식(칸 228 고정 · 여백 비 · 지면 경계 …)
 *   [R] 되돌림 시험      — 옛 상수를 다시 박으면 **빨개지는가**(무르게 푼 수리가 아님을 못박는다)
 *
 * 실행: node tools/verify403.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');

/* 403 이전 커밋에서 실측한 9:19 시트 로컬 좌표 — 이 표가 «Δ0» 의 정의다 */
const REF = {
  card: [134, 1418], cardH: 1284,
  slots: [256, 656, 1056], slotH: 228,
  badges: [237, 637, 1037],
  pill: [1330, 1379], sw: 1317, hp: 1326,
  canvas: [495, 1326], ribbon: [167, 272],
  gnd: 880,            /* 카드 기준 지면 경계 */
  viewport: 1444,      /* .shsc 높이 = 시트 1584 − 서브탭 바 140 */
};

/* 옛 상수를 되돌리는 사본 — §R 에서만 주입한다 */
const REVERT_CSS = `
  .eqp .shsc-in{height:1418px !important}
  .eqc,.eqc-fr{height:1284px !important}
  .eqc-hl{height:1264px !important}
  .eqc .gnd{top:880px !important;bottom:auto !important;height:404px !important}
  .eqsl.s1{top:256px !important}  .eqsl.s2{top:656px !important}  .eqsl.s3{top:1056px !important}
  .eqbd.s1{top:237px !important}  .eqbd.s2{top:637px !important}  .eqbd.s3{top:1037px !important}
  .eqst{top:1330px !important;bottom:auto !important}
  .eqic.sw{top:1317px !important;bottom:auto !important}
  .eqic.hp{top:1326px !important;bottom:auto !important}
  .eqil-cv{top:495px !important;bottom:auto !important}
`;

let pass = 0, tot = 0;
const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.5 : tol);

async function open(browser, w, h, revert) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (revert) await page.addStyleTag({ content: revert });
  await page.click('.tab[data-t="hero"]', { timeout: 4000, force: true }).catch(() => {});
  await page.waitForTimeout(450);
  await page.evaluate(() => { const el = document.querySelector('#eqTabs [data-eqtab="eq"]'); if (el) el.click(); });
  await page.waitForTimeout(600);
  /* 60 쥬시 개봉 연출이 도는 동안 재면 scale 구간이 잡힌다 */
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true }).some(a => /^jz/.test(a.animationName || '')
      && a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(180);
  return { ctx, page, errs };
}

const measure = () => {
  const sheet = document.querySelector('.eqp');
  if (!sheet) return { err: 'no .eqp' };
  const sc = sheet.querySelector('.shsc');
  const bar = document.querySelector('#eqTabs');
  const sb = sheet.getBoundingClientRect();
  /* 시트 로컬 좌표 = 화면 좌표 − 시트 상변 (시트가 프레임 어디에 붙든 같은 값이 나온다) */
  const L = e => { if (!e) return null; const b = e.getBoundingClientRect();
    return { t: +(b.top - sb.top).toFixed(1), b: +(b.bottom - sb.top).toFixed(1), h: +b.height.toFixed(1) }; };
  const q = s => L(sheet.querySelector(s));
  const scL = L(sc), barL = L(bar);
  const slots = [...sheet.querySelectorAll('.eqsl')].map(L);
  const badges = [...sheet.querySelectorAll('.eqbd')].map(L);
  const vis = e => {           /* 뷰포트 안에 보이는 비율(서브탭 바가 덮는 부분은 뺀다) */
    const b = L(e); if (!b) return null;
    const v0 = Math.max(b.t, scL.t), v1 = Math.min(b.b, scL.b);
    const seen = Math.max(0, v1 - v0);
    const ov = barL ? Math.max(0, Math.min(v1, barL.b) - Math.max(v0, barL.t)) : 0;
    return +(b.h ? ((seen - ov) / b.h) * 100 : 0).toFixed(1);
  };
  const named = [
    ['이름 리본', sheet.querySelector('.eqrb')],
    ['부위 슬롯 1', sheet.querySelectorAll('.eqsl')[0]],
    ['부위 슬롯 2', sheet.querySelectorAll('.eqsl')[1]],
    ['부위 슬롯 3', sheet.querySelectorAll('.eqsl')[2]],
    ['스탯 알약 a', sheet.querySelector('.eqst.a')],
    ['스탯 알약 b', sheet.querySelector('.eqst.b')],
    ['카드 컨테이너', sheet.querySelector('.eqc')],
    ['캐릭터 캔버스', sheet.querySelector('.eqil-cv')],
  ];
  return {
    frameH: window.innerHeight,
    sheetH: +sb.height.toFixed(1),
    vp: scL.h, slack: sc.scrollHeight - sc.clientHeight,
    card: q('.eqc'), ribbon: q('.eqrb'), pill: q('.eqst.a'), sw: q('.eqic.sw'), hp: q('.eqic.hp'),
    canvas: q('.eqil-cv'), gnd: (() => { const g = sheet.querySelector('.eqc .gnd'), c = sheet.querySelector('.eqc');
      if (!g || !c) return null; return +(g.getBoundingClientRect().top - c.getBoundingClientRect().top).toFixed(1); })(),
    slots, badges,
    vis: named.map(([n, e]) => ({ n, p: vis(e) })),
  };
};

(async () => {
  const browser = await launch(chromium);
  const grab = async (w, h, revert) => {
    const { ctx, page, errs } = await open(browser, w, h, revert);
    const m = await page.evaluate(measure);
    await ctx.close();
    return { m, errs };
  };
  const r2280 = await grab(1080, 2280);
  const r1920 = await grab(1080, 1920);
  const r1600 = await grab(1080, 1600);
  const rev1600 = await grab(1080, 1600, REVERT_CSS);
  const rev2280 = await grab(1080, 2280, REVERT_CSS);
  await browser.close();

  /* ---------- [A] 9:19·9:16 Δ0 ---------- */
  console.log('[A] 9:19·9:16 Δ0 — 403 이 «레퍼런스 이탈» 이 아님을 시트 로컬 좌표로 못박는다');
  for (const [nm, r] of [['2280', r2280], ['1920', r1920]]) {
    const m = r.m;
    ck(`${nm} 본문 뷰포트 = ${REF.viewport}`, near(m.vp, REF.viewport), `${m.vp}`);
    ck(`${nm} 카드 ${REF.card[0]}..${REF.card[1]}`, near(m.card.t, REF.card[0]) && near(m.card.b, REF.card[1]), `${m.card.t}..${m.card.b}`);
    REF.slots.forEach((y, i) => ck(`${nm} 부위 슬롯 ${i + 1} top ${y}`, m.slots[i] && near(m.slots[i].t, y), m.slots[i] ? String(m.slots[i].t) : 'missing'));
    REF.badges.forEach((y, i) => ck(`${nm} 부위 뱃지 ${i + 1} top ${y}`, m.badges[i] && near(m.badges[i].t, y), m.badges[i] ? String(m.badges[i].t) : 'missing'));
    ck(`${nm} 스탯 알약 ${REF.pill[0]}..${REF.pill[1]}`, near(m.pill.t, REF.pill[0]) && near(m.pill.b, REF.pill[1]), `${m.pill.t}..${m.pill.b}`);
    ck(`${nm} 검 아이콘 top ${REF.sw}`, near(m.sw.t, REF.sw), `${m.sw.t}`);
    ck(`${nm} 하트 아이콘 top ${REF.hp}`, near(m.hp.t, REF.hp), `${m.hp.t}`);
    ck(`${nm} 캐릭터 캔버스 ${REF.canvas[0]}..${REF.canvas[1]}`, near(m.canvas.t, REF.canvas[0]) && near(m.canvas.b, REF.canvas[1]), `${m.canvas.t}..${m.canvas.b}`);
    ck(`${nm} 이름 리본 ${REF.ribbon[0]}..${REF.ribbon[1]}`, near(m.ribbon.t, REF.ribbon[0]) && near(m.ribbon.b, REF.ribbon[1]), `${m.ribbon.t}..${m.ribbon.b}`);
    ck(`${nm} 지면 경계 = 카드 +${REF.gnd}`, near(m.gnd, REF.gnd, 1), `${m.gnd}`);
    ck(`${nm} 시트 스크롤 여유 0`, m.slack === 0, `${m.slack}px`);
    ck(`${nm} 콘솔 에러 0`, r.errs.length === 0, r.errs.slice(0, 2).join(' / ') || '없음');
  }

  /* ---------- [B] 9:13.3 요구 ---------- */
  console.log('[B] 9:13.3(1600) — 주인 지시 «스크롤 안 해도 다 보이게»');
  {
    const m = r1600.m;
    ck('1600 시트 스크롤 여유 0(스크롤 자체가 없다)', m.slack === 0, `${m.slack}px · 뷰포트 ${m.vp}`);
    m.vis.forEach(v => ck(`1600 «${v.n}» 스크롤 전 100% 보임`, v.p >= 99.5, `${v.p}%`));
    ck('1600 카드 하변이 뷰포트 안', m.card.b <= m.vp + 0.5, `카드 하변 ${m.card.b} ≤ 뷰포트 ${m.vp}`);
    ck('1600 콘솔 에러 0', r1600.errs.length === 0, r1600.errs.slice(0, 2).join(' / ') || '없음');
  }

  /* ---------- [C] 규칙 항등식 ---------- */
  console.log('[C] 규칙 항등식 — 프레임과 무관하게 성립해야 하는 관계(값이 아니라 규칙을 지킨다)');
  for (const [nm, r] of [['2280', r2280], ['1920', r1920], ['1600', r1600]]) {
    const m = r.m;
    const C = m.card.b - m.card.t;
    ck(`${nm} 카드 하변 = 뷰포트 − 26`, near(m.card.b, m.vp - 26, 1), `${m.card.b} vs ${m.vp - 26}`);
    ck(`${nm} 알약 하변 = 카드 하변 − 39`, near(m.pill.b, m.card.b - 39, 1), `${m.pill.b} vs ${m.card.b - 39}`);
    ck(`${nm} 캔버스 하변 = 알약 상변 − 4`, near(m.canvas.b, m.pill.t - 4, 1), `${m.canvas.b} vs ${m.pill.t - 4}`);
    ck(`${nm} 부위 슬롯 칸 228 **고정**(카드가 줄어도 칸은 안 줄인다)`,
      m.slots.every(s => near(s.h, REF.slotH, 1)), m.slots.map(s => s.h).join('/'));
    ck(`${nm} 슬롯 피치 3칸 등간격`, near((m.slots[1].t - m.slots[0].t), (m.slots[2].t - m.slots[1].t), 1),
      `${(m.slots[1].t - m.slots[0].t).toFixed(1)} / ${(m.slots[2].t - m.slots[1].t).toFixed(1)}`);
    ck(`${nm} 블록 위 여백 = 0.09502·C`, near(m.slots[0].t - m.card.t, 0.09502 * C, 1.5), `${(m.slots[0].t - m.card.t).toFixed(1)} vs ${(0.09502 * C).toFixed(1)}`);
    ck(`${nm} 블록 아래 여백 = 0.10436·C`, near(m.card.b - m.slots[2].b, 0.10436 * C, 1.5), `${(m.card.b - m.slots[2].b).toFixed(1)} vs ${(0.10436 * C).toFixed(1)}`);
    ck(`${nm} 지면 경계 = 카드의 68.536%`, near(m.gnd, 0.68536 * C, 1.5), `${m.gnd} vs ${(0.68536 * C).toFixed(1)}`);
    ck(`${nm} 뱃지 = 슬롯 − 19`, m.badges.every((b, i) => near(b.t, m.slots[i].t - 19, 1)), m.badges.map((b, i) => (b.t - m.slots[i].t).toFixed(1)).join('/'));
    /* 351 이 두 번 올린 가드(142)·24 의 탭바(180)를 안 건드렸다는 증거 */
    ck(`${nm} 시트 높이 = min(1584, frameH − 322)`, near(m.sheetH, Math.min(1584, m.frameH - 322), 1),
      `${m.sheetH} vs ${Math.min(1584, m.frameH - 322)}`);
  }

  /* ---------- [R] 되돌림 시험 ---------- */
  console.log('[R] 되돌림 시험 — 옛 상수를 다시 박으면 빨개지는가(무르게 푼 수리가 아님)');
  {
    const m = rev1600.m;
    ck('[R-a 전제] 되돌림 CSS 가 실제로 먹었다(카드 1284 로 복귀)', near(m.card.b - m.card.t, REF.cardH, 1), `${(m.card.b - m.card.t).toFixed(1)}`);
    ck('[R-b] 되돌리면 1600 에서 시트 스크롤 280px 이 되살아난다', m.slack === 280, `${m.slack}px`);
    const bad = m.vis.filter(v => v.p < 99.5).map(v => v.n + ' ' + v.p + '%');
    ck('[R-c] 되돌리면 1600 에서 부품이 뷰포트 밖으로 나간다', bad.length > 0, bad.join(' · ') || '전부 100%(= 되돌림이 안 먹었다)');
    ck('[R-d] 되돌려도 **2280 은 같다**(9:19 는 애초에 Δ0 였다 = 이 수리가 9:19 를 안 건드렸다는 두 번째 증거)',
      near(rev2280.m.slots[0].t, REF.slots[0]) && near(rev2280.m.pill.t, REF.pill[0]) && rev2280.m.slack === 0,
      `슬롯1 ${rev2280.m.slots[0].t} · 알약 ${rev2280.m.pill.t} · 여유 ${rev2280.m.slack}`);
  }

  console.log(`\nVERIFY403 ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
  process.exit(pass === tot ? 0 : 1);
})();
