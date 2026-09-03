#!/usr/bin/env node
/* 작업 882 게이트 — 「씬 A 산포의 뿌리는 상자 종횡비」 라는 등재문을 **재현이 정정했고**(probe882),
 * 그 판정대로 **23 훈련 카드 기하를 한 픽셀도 안 바꿨다**는 것을 못박는 자.
 *
 *   node tools/verify882.js
 *
 * ⚑ **이 자는 «안 한 것» 을 지킨다.** 882 의 결론은 «상자를 키우지 않는다» 이고, 그 결론의 근거는
 *   `probe882` 가 찍은 스윕이다 — 버튼 세로 106 → 118 → 130 → 142 → 155 에서 산포 중앙값이
 *   **×2.80 → 2.41 → 2.65 → 2.99 → 3.00** 으로, 등재문이 예측한 «155 에서 ×2.0» 과 **반대**로 간다.
 *   래칫이 없으면 다음 세션이 등재문만 읽고 같은 실험을 처음부터 다시 한다(371·388 이 그 자리였다).
 *
 * ⚠ **버스트를 굴리지 않는다 — 일부러 그렇다.** 산포 축은 10알 표본이라 시드마다 ±0.5(최대 ×3.94)로
 *   흔들린다(probe882 [1-e]). 그 축을 게이트 문턱으로 쓰면 574·709·825·854·855·870·871·872·873 이
 *   줄줄이 겪은 «플레이키 자» 를 하나 더 만드는 것이다. 이 자가 지키는 것은 **결정적인 기하**뿐이고,
 *   흔들리는 축은 `probe882`(재현자)가 기록으로만 남긴다.
 *
 * [1] 카드·버튼 기하 = 레퍼런스(측정표 23 §6 — 카드 326×510 · 하단 바 local 396..502 h107)
 * [2] 밴드 안 잉크(코인·비용)가 밴드 **가운데**에 선다 = 카드를 키우면 이 값이 따라 내려간다(probe882 [3-c])
 * [3] 카드 바닥 ↔ 203 서브탭 바의 **빈 세로 70px** — 지렛대 ⓐ 가 쓸 수 있었던 예산(두 프레임 동일)
 * [R] 되돌림 시험 — 카드 높이를 534(버튼 130)로 올린 **사본**에서 [1]~[3] 이 실제로 빨개진다
 *     (문턱을 무르게 잡아 «아무것도 안 묻는 자» 가 되는 것을 막는다 · LESSONS 232-①)
 * ⚠ 사본은 임시 파일이고 크래시에도 지운다(810).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const TMP = path.resolve(__dirname, '../.tmp882-ratchet.html');
const p2 = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const near = (a, b, e) => Math.abs(a - b) <= e;

const READ = () => {
  const q = s => document.querySelector(s);
  const card = q('#trCards .tr-card');
  const cr = card.getBoundingClientRect();
  const app = document.getElementById('app');
  const ar = app.getBoundingClientRect();
  const sc = (ar.width / (app.offsetWidth || ar.width)) || 1;
  const loc = r => ({ x: (r.x - cr.x) / sc, y: (r.y - cr.y) / sc, w: r.width / sc, h: r.height / sc });
  const subs = q('.tr-subs');
  return {
    card: { w: cr.width / sc, h: cr.height / sc },
    cb: loc(q('#trCards .tr-card .cb').getBoundingClientRect()),
    coin: loc(q('#trCards .tr-card .cb > s').getBoundingClientRect()),
    cost: loc(q('#trCards .tr-card .cb > i').getBoundingClientRect()),
    free: subs ? (subs.getBoundingClientRect().y - cr.bottom) / sc : null,
    n: document.querySelectorAll('#trCards .tr-card').length,
  };
};

async function read(src, frameH) {
  const b = await launch(chromium);
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: frameH }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto('file://' + path.resolve(src).replace(/\\/g, '/'));
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(700);
    await page.evaluate(() => { S.gold = 1e18; uiDirty = true; renderUI(); openTrain(); });
    await page.waitForTimeout(350);
    return await page.evaluate(READ);
  } finally { await b.close(); }
}

/* [1][2][3] 을 한 벌로 — 되돌림 시험이 **같은 잣대**를 사본에 대야 한다(자를 두 벌로 적지 않는다) */
function judge(g) {
  return {
    cardH: near(g.card.h, 510, 0.5),
    cardW: near(g.card.w, 326, 0.5),
    cbBox: near(g.cb.y, 396, 0.5) && near(g.cb.h, 106, 0.5) && near(g.cb.w, 310, 0.5),
    /* 코인·비용 세로 중심이 밴드 중심(396 + 53 = 449)과 같다 — 「가운데 정렬」의 산수 */
    inkMid: near(g.coin.y + g.coin.h / 2, 449, 1.5) && near(g.cost.y + g.cost.h / 2, 449, 1.5),
    free70: near(g.free, 70, 1.5),
  };
}

(async () => {
  console.log('VERIFY882 — 23 훈련 카드 기하 래칫(882 는 상자를 안 바꾼다)');
  try {
    const g19 = await read(SRC, 2280);
    const g13 = await read(SRC, 1600);
    const j = judge(g19), j13 = judge(g13);

    console.log('\n[1] 카드·버튼 기하 = 레퍼런스(측정표 23 §6)');
    ok(g19.n === 3, '[1-a] 훈련 카드 3장 — ' + g19.n);
    ok(j.cardW && j.cardH, '[1-b] 카드 326×510 — ' + p2(g19.card.w) + '×' + p2(g19.card.h));
    ok(j.cbBox, '[1-c] 하단 바 `.cb` = local y396 · 310×106(종횡비 ×'
      + p2(g19.cb.w / g19.cb.h) + ') — y' + p2(g19.cb.y) + ' · ' + p2(g19.cb.w) + '×' + p2(g19.cb.h),
      '등재문 ⓐ 는 이 106 을 155 로 올리자는 것이었다 — probe882 가 기각했다');
    ok(j13.cardH && j13.cbBox, '[1-d] 9:13.3(1600)에서도 같은 값 — 카드 h' + p2(g13.card.h)
      + ' · 바 h' + p2(g13.cb.h));

    console.log('\n[2] 밴드 안 잉크가 밴드 가운데에 선다(카드를 키우면 이 값이 따라 내려간다)');
    ok(j.inkMid, '[2-a] 코인 중심 ' + p2(g19.coin.y + g19.coin.h / 2) + ' · 비용 중심 '
      + p2(g19.cost.y + g19.cost.h / 2) + ' = 밴드 중심 449');
    ok(near(g19.coin.y + g19.coin.h / 2, g19.cost.y + g19.cost.h / 2, 1.5),
      '[2-b] 둘이 같은 줄에 선다 — Δ' + p2((g19.coin.y + g19.coin.h / 2) - (g19.cost.y + g19.cost.h / 2)));

    console.log('\n[3] 카드 바닥 ↔ 203 서브탭 바 — 지렛대 ⓐ 가 쓸 수 있었던 세로 예산');
    ok(j.free70, '[3-a] 빈 세로 70px (9:19) — ' + p2(g19.free));
    ok(j13.free70, '[3-b] 9:13.3 도 같다(686 «행 기하 동일» 과 같은 꼴) — ' + p2(g13.free));

    console.log('\n[R] 되돌림 시험 — 카드 534(버튼 130 · 스윕 최저 판)를 실제로 만들어 본다');
    const txt = fs.readFileSync(SRC, 'utf8')
      .replace('.tr-cards{left:0;right:0;top:373px;height:510px}', '.tr-cards{left:0;right:0;top:373px;height:534px}')
      .replace('.tr-card{position:absolute;top:0;width:326px;height:510px;', '.tr-card{position:absolute;top:0;width:326px;height:534px;');
    fs.writeFileSync(TMP, txt);
    const gr = await read(TMP, 2280), jr = judge(gr);
    ok(!jr.cardH, '[R-a] 사본에서 [1-b] 가 빨갛다 — 카드 h' + p2(gr.card.h));
    ok(!jr.cbBox, '[R-b] 사본에서 [1-c] 가 빨갛다 — 바 ' + p2(gr.cb.w) + '×' + p2(gr.cb.h)
      + '(종횡비 ×' + p2(gr.cb.w / gr.cb.h) + ')');
    ok(!jr.inkMid, '[R-c] 사본에서 [2-a] 가 빨갛다 — 코인 중심 ' + p2(gr.coin.y + gr.coin.h / 2)
      + '(밴드가 커진 만큼 잉크가 따라 내려갔다)');
    ok(!jr.free70, '[R-d] 사본에서 [3-a] 가 빨갛다 — 빈 세로 ' + p2(gr.free));
    ok(near(gr.cb.y, 396, 0.5), '[R-e] 그 사본에서도 바 **상변**은 안 움직인다 — y' + p2(gr.cb.y),
      '이탈은 «아래로 자란다» 한 방향뿐이라는 probe882 [3-b] 의 재확인');

    console.log('\nVERIFY882 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
    process.exit(fail ? 1 : 0);
  } finally { try { fs.unlinkSync(TMP); } catch (e) {} }
})().catch(e => { console.error(e); process.exit(1); });
