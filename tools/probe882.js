#!/usr/bin/env node
/* 작업 882 재현 — 「씬 A 산포 ×2.9 = 가둠 상자 종횡비 310÷106」 을 **찍힌 값**으로 확인하고,
 * 등재문이 남긴 지렛대 ⓐ(버튼 세로 확대) · ⓑ(「53」 가격을 버튼 밖으로) 를 **실제로 만들어** 잰다.
 *
 *   node tools/probe882.js
 *
 * 338 규칙 — 처방 전에 재현한다. 이 자가 묻는 것은 셋이다:
 *   [1] 항등식인가 — 산포(끝 반경 max÷min)가 정말 상자 종횡비를 따라가는가(현행 · 두 변형판)
 *   [2] 자리가 있는가 — 23 훈련 카드를 세로로 키울 **빈 세로**가 실제로 얼마인가(카드 바닥 ↔ 203 서브탭 바)
 *   [3] 대가가 얼마인가 — 키우면 레퍼런스(측정표 23 §6: 카드 326×510 · 하단 바 local 396..502 h107)에서
 *       무엇이 몇 px 어긋나는가. 잉크가 «따라 내려가는가» 까지 실측한다.
 *
 * ⚠ 자는 `tools/travel838.js` 한 벌을 그대로 쓴다(402 «두 벌 금지» — 838 이 아홉 회차 쓴 그 자다).
 * ⚠ 변형판은 임시 사본이고 크래시에도 지운다(810 — «남은 표본이 다음 자를 조용히 바꾼다»).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { runScene, SCENES } = require('./travel838');

const SRC = path.resolve(__dirname, '../index.html');
const p2 = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 카드 세로만 바꾼 사본 — `.tr-card`·`.tr-cards` 높이 한 값씩.
   `.cb` 는 `top:396px;bottom:8px` 이라 카드가 커지면 **버튼이 아래로** 그만큼 커진다(위 잉크 Δ0). */
function variantHeight(h) {
  const src = fs.readFileSync(SRC, 'utf8');
  const a = src.replace('.tr-cards{left:0;right:0;top:373px;height:510px}',
                        '.tr-cards{left:0;right:0;top:373px;height:' + h + 'px}');
  const b = a.replace('.tr-card{position:absolute;top:0;width:326px;height:510px;',
                      '.tr-card{position:absolute;top:0;width:326px;height:' + h + 'px;');
  if (a === src || b === a) throw new Error('변형 실패 — 원본 문자열이 안 맞는다(높이 ' + h + ')');
  return b;
}

/* 「53」 잉크 쐐기를 없앤 사본 — ⓑ 의 **상한**을 잰다(가격을 실제로 옮기지 않고 «구멍이 없으면»). */
function variantNoHole() {
  const src = fs.readFileSync(SRC, 'utf8');
  const out = src.replace('.tr-card>.cb{--burst-keep:i;', '.tr-card>.cb{');
  if (out === src) throw new Error('변형 실패 — `--burst-keep:i` 선언을 못 찾았다');
  return out;
}

function spread(A) {
  const rs = A.per.map(p => p.rE);
  const mn = Math.min(...rs), mx = Math.max(...rs);
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rs.length);
  return { mn, mx, ratio: mx / Math.max(1e-9, mn), cv: sd / Math.max(1e-9, mean) };
}

/* 한 판을 굴려 «상자 종횡비 ↔ 산포» 한 줄을 낸다 */
async function board(label, src, seed) {
  const A = await runScene(SCENES[0], src, seed === undefined ? undefined : { seed });
  if (A.err) throw new Error(label + ' — ' + A.err);
  const s = spread(A);
  const box = A.geo.bw / A.geo.bh;
  console.log('    · ' + label.padEnd(26)
    + '상자 ' + p2(A.geo.bw) + '×' + p2(A.geo.bh) + ' = ×' + p2(box)
    + ' | 산포 ×' + p2(s.ratio) + ' (끝반경 ' + p2(s.mn) + '..' + p2(s.mx) + ')'
    + ' | CV ' + p2(s.cv) + ' | 빈각 ' + p2(A.fanGap) + '°'
    + ' | 스필 ' + p2(A.spill) + ' | 붙박이 ' + A.stuck + ' | 몸길이 ' + p2(A.bodyMed));
  return { A, s, box };
}

/* 카드 안 잉크 자리 — 레퍼런스(측정표 23 §6) 대비 몇 px 어긋나는지 재려면 «그린 잉크» 를 봐야 한다 */
const GEO = (h) => {
  const q = s => document.querySelector(s);
  const card = q('#trCards .tr-card');
  const cr = card.getBoundingClientRect();
  const app = document.getElementById('app');
  const ar = app.getBoundingClientRect();
  const sc = (ar.width / (app.offsetWidth || ar.width)) || 1;
  const loc = (r) => ({ x: (r.x - cr.x) / sc, y: (r.y - cr.y) / sc, w: r.width / sc, h: r.height / sc });
  const box = document.querySelector('.tr-box').getBoundingClientRect();
  const subs = document.querySelector('.tr-subs');
  const sr = subs ? subs.getBoundingClientRect() : null;
  const cardsEl = document.querySelector('.tr-cards');
  const cardsR = cardsEl.getBoundingClientRect();
  return {
    frameH: h,
    card: { w: cr.width / sc, h: cr.height / sc, top: (cr.y - box.y) / sc, bottom: (cr.bottom - box.y) / sc },
    cards: { top: (cardsR.y - box.y) / sc, h: cardsR.height / sc },
    boxH: box.height / sc,
    subsTop: sr ? (sr.y - box.y) / sc : null,
    subsH: sr ? sr.height / sc : null,
    free: sr ? (sr.y - cr.bottom) / sc : null,
    ch: loc(q('#trCards .tr-card .ch').getBoundingClientRect()),
    ci: loc(q('#trCards .tr-card .ci').getBoundingClientRect()),
    cv: loc(q('#trCards .tr-card .cv').getBoundingClientRect()),
    cn: loc(q('#trCards .tr-card .cn').getBoundingClientRect()),
    cb: loc(q('#trCards .tr-card .cb').getBoundingClientRect()),
    coin: loc(q('#trCards .tr-card .cb > s').getBoundingClientRect()),
    cost: loc(q('#trCards .tr-card .cb > i').getBoundingClientRect()),
  };
};

async function geoOf(src, frameH) {
  const URL = 'file://' + path.resolve(src).replace(/\\/g, '/');
  const b = await launch(chromium);
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: frameH }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(700);
    await page.evaluate(() => { S.gold = 1e18; uiDirty = true; renderUI(); openTrain(); });
    await page.waitForTimeout(400);
    return await page.evaluate(GEO, frameH);
  } finally { await b.close(); }
}

(async () => {
  console.log('PROBE882 — 씬 A 산포의 뿌리(상자 종횡비)와 지렛대 ⓐ·ⓑ 의 실측');
  const tmp = [];
  const mk = (name, txt) => { const f = path.resolve(__dirname, '../.tmp882-' + name + '.html');
    fs.writeFileSync(f, txt); tmp.push(f); return f; };
  try {
    /* ── [1] 항등식인가 — 버튼 세로를 **한 칸씩** 올리며 산포를 잰다(등재문은 ×2.0 을 예측했다) ── */
    console.log('\n[1] 산포 ↔ 상자 종횡비 — 세로 스윕 (씬 A · 시드 고정 · 873 재시드)');
    const cur = await board('현행(카드 510 · 버튼 106)', null);
    const sweep = [];
    for (const bh of [118, 130, 142, 155, 167]) {
      const h = bh + 404;                                  /* `.cb` = top 396 · bottom 8 ⇒ 카드 = 버튼 + 404 */
      sweep.push({ h, bh, ...(await board('카드 ' + h + '(버튼 ' + bh + ')', mk('h' + h, variantHeight(h)))) });
    }
    const noh = await board('ⓑ 상한(구멍 없음 · 106)', mk('nohole', variantNoHole()));
    const best = sweep.reduce((a, b) => (b.s.ratio < a.s.ratio ? b : a));
    const v155 = sweep.find(v => v.bh === 155);

    /* ⚑ 한 시드의 **제비뽑기**를 구조로 읽지 않는다(872 교훈) — 위 스윕을 시드 둘로 더 돌린다.
       10알 표본이라 한 알이 얕은 방을 고르면 산포가 통째로 흔들린다. 셋의 **중앙값**으로 읽는다. */
    console.log('\n    ── 시드 재현(같은 스윕 · 시드 3장) — 산포 ×');
    const SEEDS = [20260902, 20260903, 20260904];
    const grid = {};
    for (const bh of [106, 118, 130, 142, 155]) {
      const h = bh + 404;
      const src = bh === 106 ? null : mk('h' + h, variantHeight(h));
      const rs = [];
      for (const sd of SEEDS) rs.push((await board('  버튼 ' + bh + ' · 시드 ' + sd, src, sd)).s.ratio);
      const med = [...rs].sort((a, b) => a - b)[1];
      grid[bh] = { rs, med };
      console.log('    · 버튼 ' + String(bh).padEnd(4) + ' 산포 ' + rs.map(p2).map(v => '×' + v).join(' / ')
        + '  ⇒ **중앙값 ×' + p2(med) + '**');
    }
    const nohSrc = mk('nohole2', variantNoHole());
    const nohRs = [];
    for (const sd of SEEDS) nohRs.push((await board('  ⓑ 구멍 없음 · 시드 ' + sd, nohSrc, sd)).s.ratio);
    const nohMed = [...nohRs].sort((a, b) => a - b)[1];
    console.log('    · ⓑ 구멍없음 산포 ' + nohRs.map(p2).map(v => '×' + v).join(' / ') + '  ⇒ **중앙값 ×' + p2(nohMed) + '**');
    const bestMed = Object.keys(grid).map(Number).reduce((a, b) => (grid[b].med < grid[a].med ? b : a));
    const rng = bh => [Math.min(...grid[bh].rs), Math.max(...grid[bh].rs)];

    ok(Math.abs(cur.box - 2.925) < 0.35, '[1-a] 현행 상자 종횡비 ≈ ×2.9 — ×' + p2(cur.box));
    ok(cur.s.ratio >= 2.3, '[1-b] 현행 산포 ≥ ×2.3(등재문 ×2.7~2.95를 그대로 재현) — ×' + p2(cur.s.ratio));
    ok(grid[155].med >= grid[106].med,
      '[1-c] ⚑⚑ **등재문 정정 ①** — 종횡비를 ×2.0 으로 만드는 버튼 155 는 산포를 **되레 키운다** — 중앙값 ×'
      + p2(grid[106].med) + ' → ×' + p2(grid[155].med), '«106 → 155 면 ×2.93 → ×2.0» 은 성립하지 않는다');
    ok(Math.min(...Object.values(grid).map(g => g.med)) > 2.2,
      '[1-d] 어느 세로도 예측값 ×2.0 근처에 못 간다 — 스윕 최저 중앙값 ×'
      + p2(Math.min(...Object.values(grid).map(g => g.med))));
    ok(rng(106)[0] <= rng(bestMed)[1] && rng(bestMed)[0] <= rng(106)[1],
      '[1-e] ⚑ 그리고 스윕 최저(버튼 ' + bestMed + ')의 이득은 **시드 산포 안**이다 — 106 [' + rng(106).map(p2).join('..')
      + '] ↔ ' + bestMed + ' [' + rng(bestMed).map(p2).join('..') + '] 이 겹친다', '구조가 아니라 제비뽑기');
    ok(nohMed < grid[106].med - 0.3,
      '[1-f] ⚑⚑ **등재문 정정 ②** — 실제 지렛대는 「53」 **구멍**이다: 상자를 한 픽셀도 안 바꾸고 중앙값 ×'
      + p2(grid[106].med) + ' → ×' + p2(nohMed));
    ok(noh.A.fanGap < cur.A.fanGap && noh.A.bodyMed > cur.A.bodyMed,
      '[1-g] 같은 판에서 빈 각·몸길이도 같이 좋아진다 — 빈각 ' + p2(cur.A.fanGap) + '° → ' + p2(noh.A.fanGap)
      + '° · 몸길이 ' + p2(cur.A.bodyMed) + ' → ' + p2(noh.A.bodyMed));
    ok(best.A.spill <= 0.01 && noh.A.spill <= 0.01,
      '[1-h] 어느 판에서도 스필은 0 이다(619 13·14회차 불변) — ' + p2(best.A.spill) + ' / ' + p2(noh.A.spill));

    /* ── [2] 자리: 카드 아래 빈 세로 ─────────────────────────────────────────── */
    console.log('\n[2] 세로 예산 — 카드 바닥 ↔ 203 서브탭 바 (두 프레임)');
    const g19 = await geoOf(SRC, 2280);
    const g133 = await geoOf(SRC, 1600);
    for (const [nm, g] of [['9:19 (2280)', g19], ['9:13.3 (1600)', g133]])
      console.log('    · ' + nm.padEnd(15) + ' 박스 ' + p2(g.boxH) + ' · 카드 ' + p2(g.card.top) + '..' + p2(g.card.bottom)
        + '(h' + p2(g.card.h) + ') · 서브탭 상변 ' + p2(g.subsTop) + ' ⇒ **빈 세로 ' + p2(g.free) + 'px**');
    ok(Math.abs(g19.free - g133.free) < 1.5, '[2-a] 두 프레임의 빈 세로가 같다(686 «행 기하 동일» 과 같은 꼴) — '
      + p2(g19.free) + ' / ' + p2(g133.free));
    ok(g19.free >= bestMed + 404 - 510, '[2-b] 최적 판이 요구하는 ' + (best.h - 510) + 'px 이 실제로 있는가 — 빈 ' + p2(g19.free) + 'px');

    /* ── [3] 대가: 레퍼런스에서 무엇이 몇 px 어긋나는가 ───────────────────────── */
    console.log('\n[3] 레퍼런스 대비 이탈 (측정표 23 §6 — 카드 326×510 · 하단 바 local 396..502 h107\n'
      + '     · 골드 잉크 local y424..468 · 비용 숫자 local x165..310)');
    const gv = await geoOf(mk('best', variantHeight(bestMed + 404)), 2280);
    console.log('    (변형판 = [1] 의 최적 판 — 카드 ' + (bestMed + 404) + ' · 버튼 ' + bestMed + ')');
    const row = (k, a, b) => console.log('    · ' + k.padEnd(10) + '현행 y' + p2(a.y) + '..' + p2(a.y + a.h)
      + '  →  변형 y' + p2(b.y) + '..' + p2(b.y + b.h) + '   Δ상변 ' + p2(b.y - a.y) + ' · Δ높이 ' + p2(b.h - a.h));
    row('.ch', g19.ch, gv.ch); row('.ci', g19.ci, gv.ci); row('.cv', g19.cv, gv.cv);
    row('.cn', g19.cn, gv.cn); row('.cb', g19.cb, gv.cb);
    row('코인', g19.coin, gv.coin); row('비용', g19.cost, gv.cost);
    ok(Math.abs(gv.ch.y - g19.ch.y) < 0.51 && Math.abs(gv.ci.y - g19.ci.y) < 0.51
      && Math.abs(gv.cv.y - g19.cv.y) < 0.51 && Math.abs(gv.cn.y - g19.cn.y) < 0.51,
      '[3-a] ⓐ 는 카드 **위쪽 잉크 넷**을 안 움직인다(헤더·아이콘·+값·라벨 Δ0)');
    ok(Math.abs(gv.cb.y - g19.cb.y) < 0.51, '[3-b] 버튼 **상변도** 안 움직인다 — Δ' + p2(gv.cb.y - g19.cb.y));
    ok(Math.abs(gv.coin.y - g19.coin.y) > 1,
      '[3-c] ⚠ 그러나 밴드 안 잉크는 «가운데 정렬» 이라 **따라 내려간다** — 코인 Δ' + p2(gv.coin.y - g19.coin.y)
      + ' · 비용 Δ' + p2(gv.cost.y - g19.cost.y), '이탈의 본체는 여기다');
    ok(Math.abs(gv.card.h - (bestMed + 404)) < 0.51, '[3-d] 카드 높이 510 → ' + p2(gv.card.h) + '(레퍼런스 510 대비 +'
      + p2(100 * (gv.card.h - 510) / 510) + '%)');
    ok(gv.free > 8, '[3-e] 변형판에서도 서브탭 바를 안 밟는다 — 남는 빈 세로 ' + p2(gv.free) + 'px');

    console.log('\nPROBE882 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
    process.exit(fail ? 1 : 0);
  } finally {
    for (const f of tmp) { try { fs.unlinkSync(f); } catch (e) {} }
  }
})().catch(e => { console.error(e); process.exit(1); });
