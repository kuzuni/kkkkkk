#!/usr/bin/env node
/* 404 게이트 — 07 스킬·26 동료·50 코스튬 시트의 액션 버튼이 **9:13.3(1600)에서 보인다**,
 *              그리고 **9:19·9:16 은 한 픽셀도 안 움직였다**.
 *
 * 403 과 같은 꼴의 자다(같은 처방을 두 화면에 썼으므로 자도 같은 모양이어야 한다):
 *   [A] 9:19·9:16 Δ0    — 시트 로컬 좌표가 옛 상수와 정확히 같은가
 *   [B] 9:13.3 요구      — 시트 스크롤 여유 0 · 다섯 부품 100% 보임 · 버튼이 **실제로 눌린다**
 *   [C] 규칙 항등식      — 격자만 흡수하고 나머지는 고정 · 격자는 그대로 스크롤러
 *   [D] 299 규약         — 자리를 옮긴 뒤에도 레드닷이 **버튼 상자 기준** 우상단 사분면인가(364 교훈)
 *   [R] 되돌림 시험      — 옛 상수를 다시 박으면 1600 에서 버튼 보임이 0% 로 돌아가는가
 *
 * 실행: node tools/verify404.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');

const TABS = [
  { key: 'sk', sheet: '#bSk', name: '스킬' },
  { key: 'pet', sheet: '#bPet', name: '펫' },
  { key: 'cos', sheet: '#bCos', name: '코스튬' },
];

/* 404 이전 커밋에서 실측한 9:19 시트 로컬 좌표 */
const REF = {
  head: [0, 114], eqp: [149, 346], gp: [387, 1067], tot: [1085, 1129], btn: [1158, 1289],
  viewport: 1337,   /* .shsc 높이 = 시트 1484 − 위 테두리 7 − 서브탭 바 140 */
};

const REVERT_CSS = `
  :is(#bSk,#bPet,#bCos) .shsc-in{height:1289px !important}
  .sk-gp{height:680px !important}
  .sk-tot{top:1085px !important;bottom:auto !important}
  .sk-btn{top:1158px !important;bottom:auto !important}
`;

let pass = 0, tot = 0;
const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.5 : tol);

async function open(browser, w, h, key, revert) {
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
  await page.evaluate(k => { const el = document.querySelector(`#eqTabs [data-eqtab="${k}"]`); if (el) el.click(); }, key);
  await page.waitForTimeout(600);
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true }).some(a => /^jz/.test(a.animationName || '')
      && a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(180);
  return { ctx, page, errs };
}

const measure = (sel) => {
  const sheet = document.querySelector(sel);
  if (!sheet) return { err: 'no ' + sel };
  const sc = sheet.querySelector('.shsc');
  const bar = sheet.querySelector('.stabs');
  const gp = sheet.querySelector('.sk-gp');
  const sb = sheet.getBoundingClientRect();
  const L = e => { if (!e) return null; const b = e.getBoundingClientRect();
    return { t: +(b.top - sb.top).toFixed(1), b: +(b.bottom - sb.top).toFixed(1), h: +b.height.toFixed(1) }; };
  const scL = L(sc), barL = L(bar);
  const vis = e => { const b = L(e); if (!b) return null;
    const v0 = Math.max(b.t, scL.t), v1 = Math.min(b.b, scL.b);
    const seen = Math.max(0, v1 - v0);
    const ov = barL ? Math.max(0, Math.min(v1, barL.b) - Math.max(v0, barL.t)) : 0;
    return +(b.h ? ((seen - ov) / b.h) * 100 : 0).toFixed(1); };
  const btns = [...sheet.querySelectorAll('.sk-btn')];
  /* 실제로 눌리는가 — 버튼 중심의 elementFromPoint 가 그 버튼 자신인가 */
  const hit = btns.map(x => { const r = x.getBoundingClientRect();
    const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return e ? (e.closest('.sk-btn') === x ? 'SELF' : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]) : 'null'; });
  /* 299 규약 — 버튼 상자 «안» 우상단 사분면에 닷이 앉는가(364 교훈: 기준 상자를 호스트로 읽는다) */
  const dot = (() => {
    const b = btns[0]; if (!b) return null;
    let s = b.querySelector('.updot'), made = 0;
    if (!s) { s = document.createElement('s'); s.className = 'updot'; b.appendChild(s); made = 1; }
    const pv = s.style.display; s.style.display = 'block';
    const br = b.getBoundingClientRect(), dr = s.getBoundingClientRect();
    const o = { cx: +(dr.x + dr.width / 2 - br.x).toFixed(1), cy: +(dr.y + dr.height / 2 - br.y).toFixed(1),
      w: +br.width.toFixed(1), h: +br.height.toFixed(1) };
    s.style.display = pv; if (made) s.remove();
    return o;
  })();
  return {
    frameH: window.innerHeight, sheetH: +sb.height.toFixed(1),
    /* ⚠ `sb` 는 `#bSk` 등 **본문**(= `#panel` 의 패딩 상자)이라 시트보다 위 테두리 7px 만큼 짧다.
       시트 자체의 상한(351 이 올린 가드 142 + 24 의 탭바 180)은 `#panel` 로 재야 한다. */
    panelH: (() => { const p = document.getElementById('panel'); return p ? +p.getBoundingClientRect().height.toFixed(1) : null; })(),
    vp: scL.h, slack: sc.scrollHeight - sc.clientHeight,
    gpSlack: gp ? gp.scrollHeight - gp.clientHeight : null,
    head: L(sheet.querySelector('.sk-head')), eqp: L(sheet.querySelector('.sk-eqp')),
    gp: L(gp), tot: L(sheet.querySelector('.sk-tot')), btn: L(btns[0]),
    hit, dot,
    vis: [['헤더', '.sk-head'], ['장착 패널', '.sk-eqp'], ['격자', '.sk-gp'], ['총효과', '.sk-tot']]
      .map(([n, s]) => ({ n, p: vis(sheet.querySelector(s)) }))
      .concat(btns.map((b, i) => ({ n: '액션 버튼 ' + (i + 1), p: vis(b) }))),
  };
};

(async () => {
  const browser = await launch(chromium);
  const grab = async (w, h, key, revert) => {
    const { ctx, page, errs } = await open(browser, w, h, key, revert);
    const m = await page.evaluate(measure, TABS.find(t => t.key === key).sheet);
    await ctx.close();
    return { m, errs };
  };
  const R = {};
  for (const t of TABS) {
    R[t.key] = { h2280: await grab(1080, 2280, t.key), h1920: await grab(1080, 1920, t.key), h1600: await grab(1080, 1600, t.key) };
  }
  const rev1600 = await grab(1080, 1600, 'sk', REVERT_CSS);
  const rev2280 = await grab(1080, 2280, 'sk', REVERT_CSS);
  await browser.close();

  console.log('[A] 9:19·9:16 Δ0 — 404 가 «레퍼런스 이탈» 이 아님을 시트 로컬 좌표로 못박는다');
  for (const t of TABS) {
    for (const [nm, r] of [['2280', R[t.key].h2280], ['1920', R[t.key].h1920]]) {
      const m = r.m;
      ck(`${nm} ${t.name} 본문 뷰포트 = ${REF.viewport}`, near(m.vp, REF.viewport), `${m.vp}`);
      for (const k of ['head', 'eqp', 'gp', 'tot', 'btn']) {
        ck(`${nm} ${t.name} ${k} ${REF[k][0]}..${REF[k][1]}`, m[k] && near(m[k].t, REF[k][0]) && near(m[k].b, REF[k][1]),
          m[k] ? `${m[k].t}..${m[k].b}` : 'missing');
      }
      ck(`${nm} ${t.name} 시트 스크롤 여유 0`, m.slack === 0, `${m.slack}px`);
      ck(`${nm} ${t.name} 콘솔 에러 0`, r.errs.length === 0, r.errs.slice(0, 2).join(' / ') || '없음');
    }
  }

  console.log('[B] 9:13.3(1600) — 주인 보고 «버튼이 한 픽셀도 안 보인다» 가 닫혔는가');
  for (const t of TABS) {
    const r = R[t.key].h1600, m = r.m;
    ck(`1600 ${t.name} 시트 스크롤 여유 0`, m.slack === 0, `${m.slack}px · 뷰포트 ${m.vp}`);
    m.vis.forEach(v => ck(`1600 ${t.name} «${v.n}» 스크롤 전 100% 보임`, v.p >= 99.5, `${v.p}%`));
    ck(`1600 ${t.name} 버튼 2개가 실제로 눌린다(포인터가 그 버튼 자신)`, m.hit.length === 2 && m.hit.every(x => x === 'SELF'), m.hit.join(' / '));
    ck(`1600 ${t.name} 콘솔 에러 0`, r.errs.length === 0, r.errs.slice(0, 2).join(' / ') || '없음');
  }

  console.log('[C] 규칙 항등식 — 격자 «하나만» 흡수하고 나머지는 고정');
  for (const t of TABS) {
    for (const [nm, r] of [['2280', R[t.key].h2280], ['1920', R[t.key].h1920], ['1600', R[t.key].h1600]]) {
      const m = r.m;
      ck(`${nm} ${t.name} 버튼 하변 = 뷰포트 − 48`, near(m.btn.b, m.vp - 48, 1), `${m.btn.b} vs ${m.vp - 48}`);
      ck(`${nm} ${t.name} 총효과 하변 = 뷰포트 − 208`, near(m.tot.b, m.vp - 208, 1), `${m.tot.b} vs ${m.vp - 208}`);
      ck(`${nm} ${t.name} 격자 상변 387 **고정**`, near(m.gp.t, REF.gp[0], 1), `${m.gp.t}`);
      ck(`${nm} ${t.name} 격자 높이 = 뷰포트 − 657`, near(m.gp.h, m.vp - 657, 1), `${m.gp.h} vs ${m.vp - 657}`);
      ck(`${nm} ${t.name} 헤더·장착 패널·버튼 높이는 프레임과 무관(114/197/131)`,
        near(m.head.h, 114, 1) && near(m.eqp.h, 197, 1) && near(m.btn.h, 131, 1),
        `${m.head.h}/${m.eqp.h}/${m.btn.h}`);
      ck(`${nm} ${t.name} 넘치는 칸은 **격자 안에서** 본다(격자가 그대로 스크롤러)`, m.gpSlack > 0, `격자 여유 ${m.gpSlack}px`);
      /* 351 이 두 번 올린 가드(142)·24 의 탭바(180)를 안 건드렸다는 증거 */
      ck(`${nm} ${t.name} 시트(#panel) 높이 = min(1484, frameH − 322)`, near(m.panelH, Math.min(1484, m.frameH - 322), 1),
        `${m.panelH} vs ${Math.min(1484, m.frameH - 322)}`);
      ck(`${nm} ${t.name} 본문 좌표계 = 시트 − 위 테두리 7`, near(m.sheetH, m.panelH - 7, 1), `${m.sheetH} vs ${m.panelH - 7}`);
    }
  }

  console.log('[D] 299 규약 — 자리를 옮긴 뒤에도 레드닷이 **버튼 상자 기준** 우상단 사분면인가(364 교훈)');
  for (const t of TABS) {
    for (const [nm, r] of [['2280', R[t.key].h2280], ['1600', R[t.key].h1600]]) {
      const d = r.m.dot;
      ck(`${nm} ${t.name} 닷 중심이 버튼의 우상단 사분면`, !!d && d.cx > d.w / 2 && d.cy < d.h / 2,
        d ? `중심 (${d.cx}, ${d.cy}) · 상자 ${d.w}x${d.h}` : 'missing');
    }
  }

  console.log('[R] 되돌림 시험 — 옛 상수를 다시 박으면 빨개지는가');
  {
    const m = rev1600.m;
    ck('[R-a 전제] 되돌림 CSS 가 실제로 먹었다(격자 680 로 복귀)', near(m.gp.h, 680, 1), `${m.gp.h}`);
    /* ⚠ 등재문(PROGRESS 404)의 «151px 부족» 은 뷰포트를 1138 로 잡은 값이다. 실제 뷰포트는
       **1131**(= 시트 1278 − 위 테두리 7 − 서브탭 바 140)이라 모자란 양은 **158px** 이다 —
       `probe351b` 가 수리 전에 이미 «여유 158px» 로 찍어 두고 있었다. 자는 실측 쪽을 따른다. */
    ck('[R-b] 되돌리면 1600 에서 시트 스크롤 158px 이 되살아난다', m.slack === 158, `${m.slack}px`);
    const btnVis = m.vis.filter(v => /액션 버튼/.test(v.n));
    ck('[R-c] 되돌리면 1600 에서 버튼이 «한 픽셀도» 안 보인다(주인 원문 그대로)',
      btnVis.length === 2 && btnVis.every(v => v.p === 0), btnVis.map(v => v.n + ' ' + v.p + '%').join(' · '));
    ck('[R-d] 되돌려도 **2280 은 같다**(9:19 는 애초에 Δ0)',
      near(rev2280.m.btn.t, REF.btn[0]) && near(rev2280.m.gp.h, 680, 1) && rev2280.m.slack === 0,
      `버튼 ${rev2280.m.btn.t} · 격자 ${rev2280.m.gp.h} · 여유 ${rev2280.m.slack}`);
  }

  console.log(`\nVERIFY404 ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
  process.exit(pass === tot ? 0 : 1);
})();
