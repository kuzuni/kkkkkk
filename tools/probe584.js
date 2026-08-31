#!/usr/bin/env node
/* 작업 584 재현 프로브 — «23 훈련 팝업(훈련·룬·단련) 부품이 다른 팝업보다 현저히 작다»
 *
 *   node tools/probe584.js
 *
 * 338 규칙 — 등재문의 처방(`.tr-up` 확대 · 룬 아이콘 411 배율 · 화폐 «훈련 탭 기준선» ·
 * [투자] → [단련])을 따르기 전에 **제품에게 직접 묻는다.** 등재문이 세운 값이 실재하는지,
 * 그리고 «키울 자리» 가 실제로 얼마나 있는지를 한 자로 전부 굴린다:
 *
 *   §A `.tr-up` 과 이웃 — 상자·이웃 rect 로 «겹치지 않는 최대» 를 실측한다
 *       (등재문 ② «자리(838,139)는 격자에 물려 있다» 가 어느 변에서 참인지 갈린다)
 *   §B 화폐 아이콘 기준선 — 훈련 탭 카드 코인(`.tr-card>.cb>s .cic`)의 **찍힌 px** 과
 *       룬 [강화](`curIc('rstone',34)`) · 단련 헤더 [충전](26) · 회수(32) 를 나란히 잰다
 *   §C 룬·단련 아이콘 액자 — `.ri`(200) · `.ti`(104) 안 **이모지 잉크** 를 재고
 *       411 의 «그림 자리» 비(SLOT_ART.h / .sk-slot 115 = 0.696)와 견준다
 *   §D 단련 버튼 라벨 — «투자» 문자열이 몇 자리에 살아 있나(버튼 · 토스트)
 *   §E ⚠ 폭 예산 — 라벨이 «단련 · 🪨 n pt» 로 길어지면 `.tb`(300) 를 언제 넘치나
 *       (577 이 [충전]에서 겪은 «자릿수는 상한이 없다» 를 여기서 미리 잰다)
 *   §F 9:13.3(1080×1600) — 이 세 탭이 짧은 프레임에서 잘리는가(351 규약)
 *
 * ⚠ 수리 **전** 트리에서 §B 가 «훈련 54 ↔ 룬 34 ↔ 단련 0» 으로 · §C 가 «411 비보다 작다» 로
 *    · §D 가 «투자 2자리» 로 나오는 것이 재현이다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const JSONOUT = process.argv.includes('--json');

let pass = 0, fail = 0, pre = 0, post = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
/* 재현 항 — «수리 전이면 참» 인 관측이다. 수리 뒤에는 뒤집히는 것이 **정답**이므로 빨강으로 세지
   않고 어느 트리를 보고 있는지만 말한다(그래야 이 자가 수리 뒤에도 계속 도는 자로 남는다). */
const rep = (cPre, mPre, mPost) => {
  if (cPre) { pre++; console.log('  ⟳ 수리 전 — ' + mPre); }
  else { post++; console.log('  ✔ 수리 후 — ' + mPost); }
};
const info = m => console.log('  ·  ' + m);
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const r2 = v => (v == null ? null : Math.round(v * 100) / 100);

async function open(browser, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 루프를 세운다 */
  await page.waitForTimeout(500);
  return { ctx, page };
}
const evOf = (page) => async (fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
};

/* 페이지 안에서 쓰는 잉크 자 — saInk 와 같은 방식(캔버스 알파 bbox)이되 임의 폰트 크기로 잰다 */
const INK_FN = `
  window.__ink584 = function(ch, fs, fam){
    const P = 100, cv = document.createElement('canvas');
    cv.width = P * 3; cv.height = P * 3;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = P + 'px ' + fam;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(ch, cv.width / 2, Math.round(cv.height * 0.72));
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let y = 0; y < cv.height; y++)
      for(let x = 0; x < cv.width; x++)
        if(d[(y * cv.width + x) * 4 + 3] > 8){
          if(x < x0) x0 = x; if(x > x1) x1 = x;
          if(y < y0) y0 = y; if(y > y1) y1 = y;
        }
    if(x1 < 0) return null;
    const k = fs / P;
    return { w: +((x1 - x0 + 1) * k).toFixed(2), h: +((y1 - y0 + 1) * k).toFixed(2) };
  };`;

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await open(browser);
  const ev = evOf(page);
  await page.evaluate(INK_FN);
  const out = {};

  /* 세 탭이 다 열리는 세이브 — 룬·단련 해금 + 재화 */
  await ev(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6;
    S.stage = 400; S.trainStage = 3;
    markDirty(); openTrain(); setTrSub('train'); renderTrain();
  });
  await page.waitForTimeout(250);

  /* ══════════════════════════════════════════════════════════════════════
     §A `.tr-up` 과 이웃 — 키울 자리가 어느 변에 얼마나 있나
     ══════════════════════════════════════════════════════════════════════ */
  blk('§A ↑ 버튼(.tr-up) 과 이웃 rect');
  const A = await ev(() => {
    const rc = s => { const n = document.querySelector(s); if (!n) return null;
      const r = n.getBoundingClientRect(); const b = document.querySelector('#trw .tr-box').getBoundingClientRect();
      return { x: +(r.x - b.x).toFixed(1), y: +(r.y - b.y).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               x2: +(r.x - b.x + r.width).toFixed(1), y2: +(r.y - b.y + r.height).toFixed(1) }; };
    const box = document.querySelector('#trw .tr-box').getBoundingClientRect();
    return { box: { w: +box.width.toFixed(1), h: +box.height.toFixed(1) },
             up: rc('#trw .tr-up'), prog: rc('#trw .tr-prog'), rib: rc('#trw .tr-rib'),
             qty: rc('#trw .tr-qty'), cards: rc('#trw .tr-cards'),
             rbt: rc('#trw .tr-rn>.rbt') };
  });
  out.A = A;
  if (A.__err) { ok(false, 'evaluate 실패: ' + A.__err); }
  else {
    info(`.tr-box ${A.box.w}×${A.box.h}`);
    info(`.tr-up   ${A.up.w}×${A.up.h} @ (${A.up.x},${A.up.y}) → 우변 ${A.up.x2} · 하변 ${A.up.y2}`);
    info(`.tr-prog ${A.prog.w}×${A.prog.h} @ (${A.prog.x},${A.prog.y}) → 우변 ${A.prog.x2}`);
    info(`.tr-rib  ${A.rib.w}×${A.rib.h} @ (${A.rib.x},${A.rib.y}) → 우변 ${A.rib.x2} · 하변 ${A.rib.y2}`);
    info(`.tr-qty  ${A.qty.w}×${A.qty.h} @ (${A.qty.x},${A.qty.y})`);
    const right = A.box.w - A.up.x2, left = A.up.x - A.prog.x2, down = A.qty.y - A.up.y2, up = A.up.y - A.rib.y2;
    info(`여유 — 우 ${r2(right)} · 좌(진행바까지) ${r2(left)} · 아래(배수바까지) ${r2(down)} · 위(리본 하변까지) ${r2(up)}`);
    rep(A.up.w <= 120 && A.up.h <= 120,
        `↑ 버튼 ${A.up.w}×${A.up.h} (ref 108×107 · «존내 작다»)`,
        `↑ 버튼 ${A.up.w}×${A.up.h} (584 확대 · 하변 ${A.up.y2} ↔ .tr-qty 265)`);
    info(`면적비 — ↑ ${Math.round(A.up.w * A.up.h)} vs 룬 [강화] ${A.rbt ? Math.round(A.rbt.w * A.rbt.h) : '?'}` +
         (A.rbt ? ` = ${(A.rbt.w * A.rbt.h / (A.up.w * A.up.h)).toFixed(2)}배` : ''));
  }

  /* ══════════════════════════════════════════════════════════════════════
     §B 화폐 아이콘 — «훈련 탭 기준선» 은 몇 px 인가
     ══════════════════════════════════════════════════════════════════════ */
  blk('§B 화폐 아이콘 찍힌 크기 (훈련 기준선 ↔ 룬·단련)');
  const B = await ev(() => {
    const one = (s) => { const n = document.querySelector(s); if (!n) return null;
      const r = n.getBoundingClientRect();
      return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), cur: n.dataset.curIc || null }; };
    const res = { train: one('#trCards .tr-card .cb>s .cic') };
    setTrSub('rune'); renderTrain();
    res.rune = one('#trw .tr-rn>.rbt .cic');
    res.runeBtnTxt = (document.querySelector('#trw .tr-rn>.rbt') || {}).textContent;
    setTrSub('temper'); renderTrain();
    /* 613·614 — [충전]·[회수] 폐지: 그 두 표본은 죽었다 */
    res.tempUp = one('#trTemper .tr-tp .tb .cic');
    res.tempUpTxt = (document.querySelector('#trTemper .tr-tp .tb i') || {}).textContent;
    setTrSub('train'); renderTrain();
    return res;
  });
  out.B = B;
  if (B.__err) ok(false, 'evaluate 실패: ' + B.__err);
  else {
    const base = B.train ? B.train.w : null;
    info(`훈련 카드 코인(기준선) — ${B.train ? B.train.w + '×' + B.train.h + ' [' + B.train.cur + ']' : '없음'}`);
    info(`룬 [강화]            — ${B.rune ? B.rune.w + '×' + B.rune.h + ' [' + B.rune.cur + ']' : '없음'}` +
         (B.rune && base ? `  = 기준선의 ${(B.rune.w / base * 100).toFixed(1)}%` : ''));
    info(`단련 [충전](헤더)     — ${B.tempCharge ? B.tempCharge.w + '×' + B.tempCharge.h : '없음'}` +
         (B.tempCharge && base ? `  = ${(B.tempCharge.w / base * 100).toFixed(1)}%` : ''));
    info(`단련 [회수](바닥)     — ${B.tempReset ? B.tempReset.w + '×' + B.tempReset.h : '없음'}` +
         (B.tempReset && base ? `  = ${(B.tempReset.w / base * 100).toFixed(1)}%` : ''));
    info(`단련 [투자] 버튼 안   — ${B.tempUp ? B.tempUp.w + '×' + B.tempUp.h : '**아이콘 0장**'} · 라벨 «${B.tempUpTxt}»`);
    ok(!!B.train, '훈련 탭 기준선을 실제로 쟀다');
    rep(!!B.rune && !!base && B.rune.w < base * 0.9,
        '룬 화폐가 기준선보다 작다(34 = 64.2%)',
        '룬 화폐가 기준선과 같다(' + (B.rune && base ? (B.rune.w / base * 100).toFixed(1) : '?') + '%)');
    rep(!B.tempUp,
        '단련 [단련] 버튼에 화폐 아이콘이 **없다**(어떤 화폐인지 모른다)',
        '단련 [단련] 버튼이 쓰는 화폐를 아이콘으로 말한다(' + (B.tempUp ? B.tempUp.w : '?') + 'px)');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §C 아이콘 액자 안 이모지 잉크 ↔ 411 «그림 자리» 비
     ══════════════════════════════════════════════════════════════════════ */
  blk('§C 룬 `.ri`(200) · 단련 `.ti`(104) 잉크 ↔ 411 슬롯 비');
  const C = await ev(() => {
    const seen = {};
    /* 584 — «그림 자리» 를 쓰는 자리는 액자가 아니라 **안쪽 `.sa-e`** 가 자기 font-size 를 갖는다
       (411 규약). 있으면 그것을, 없으면 액자 자신을 잰다 — 그래야 수리 전·후를 같은 자로 본다. */
    const frame = (sel) => { const n = document.querySelector(sel); if (!n) return null;
      const r = n.getBoundingClientRect();
      const art = n.querySelector('i.sa-e'), src = art || n, cs = getComputedStyle(src);
      const ch = (src.textContent || '').trim();
      const ink = window.__ink584(ch, parseFloat(cs.fontSize), cs.fontFamily);
      return { box: +r.width.toFixed(1), boxH: +r.height.toFixed(1), fs: parseFloat(cs.fontSize),
               art: !!art, ch, ink }; };
    setTrSub('rune'); renderTrain();
    seen.rune = frame('#trw .tr-rn>.ri');
    setTrSub('temper'); renderTrain();
    seen.temp = frame('#trTemper .tr-tp .ti');
    setTrSub('train'); renderTrain();
    seen.slot = { art: SLOT_ART, slot: 115 };
    /* 훈련 카드 아이콘도 같은 계열이다(비교용) */
    seen.card = frame('#trCards .tr-card .ci');
    return seen;
  });
  out.C = C;
  if (C.__err) ok(false, 'evaluate 실패: ' + C.__err);
  else {
    const ref = C.slot.art.h / C.slot.slot;
    info(`411 기준 — SLOT_ART.h ${C.slot.art.h} / .sk-slot ${C.slot.slot} = **${ref.toFixed(4)}**`);
    ['rune', 'temp', 'card'].forEach(k => {
      const f = C[k]; if (!f || !f.ink) { info(`${k}: 못 쟀다`); return; }
      const rr = f.ink.h / f.boxH;
      info(`${k} «${f.ch}» 액자 ${f.box}×${f.boxH} · fs ${f.fs} · 잉크 ${f.ink.w}×${f.ink.h}` +
           ` ⇒ 비 ${rr.toFixed(4)} (411 대비 ${(rr / ref * 100).toFixed(1)}%)`);
    });
    const rr = C.rune && C.rune.ink ? C.rune.ink.h / C.rune.boxH : null;
    rep(rr != null && rr < ref * 0.97,
        '룬 아이콘이 411 «그림 자리» 비보다 작다(' + (rr != null ? (rr / ref * 100).toFixed(1) : '?') + '%)',
        '룬 아이콘이 411 비와 같다(' + (rr != null ? (rr / ref * 100).toFixed(1) : '?') + '%)');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §D «투자» 문자열이 살아 있는 자리
     ══════════════════════════════════════════════════════════════════════ */
  blk('§D «투자» 문자열 (버튼 · 토스트)');
  const D = await ev(() => {
    const t = TEMPERS[0];
    const btn = temperRowTxt(t).btn;
    /* 토스트 문자열은 rtTemperHold end 안이라 직접 못 부른다 — 소스 문자열로 센다 */
    return { btn, cost: temperRowTxt(t).cost, seg: temperRowTxt(t).seg };
  });
  out.D = D;
  if (D.__err) ok(false, 'evaluate 실패: ' + D.__err);
  else {
    info(`temperRowTxt().btn = «${D.btn}» · .cost = «${D.cost}»`);
    rep(/투자/.test(D.btn), '버튼 라벨이 «투자» 다', '버튼 라벨이 «단련» + 화폐 + pt 다');
  }
  const src = require('fs').readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const hits = src.split('\n').map((l, i) => ({ i: i + 1, l }))
    .filter(o => /'투자 |\(투자 /.test(o.l));
  hits.forEach(o => info(`  index.html:${o.i}  ${o.l.trim().slice(0, 90)}`));
  rep(hits.length >= 2, `«투자» 표기가 ${hits.length}자리다(등재문 «문자열이 두 곳»)`,
      `«투자» 표기 ${hits.length}건 — 버튼·토스트 둘 다 갈렸다`);
  out.D_hits = hits.map(o => o.i);

  /* ══════════════════════════════════════════════════════════════════════
     §E 폭 예산 — 라벨을 «단련 · 🪨 n pt» 로 늘리면 언제 넘치나
     ══════════════════════════════════════════════════════════════════════ */
  blk('§E `.tb`(300) 폭 예산 — 자릿수 스윕');
  const E = await ev(() => {
    setTrSub('temper'); renderTrain();
    const btn = document.querySelector('#trTemper .tr-tp .tb');
    const w = btn ? btn.getBoundingClientRect().width : null;
    const probe = document.createElement('span');
    const cs = btn ? getComputedStyle(btn) : null;
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:nowrap;' +
      (cs ? 'font-size:' + cs.fontSize + ';font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight : '');
    document.body.appendChild(probe);
    const rows = [];
    for (let d = 1; d <= 10; d++) {
      const n = Number('1'.repeat(d)).toLocaleString();
      /* 아이콘 몫은 글자가 아니므로 따로 더한다(기준선 폭 + margin 6) */
      probe.textContent = '단련 ' + n + ' pt';
      rows.push({ d, txt: probe.textContent, textW: +probe.getBoundingClientRect().width.toFixed(1) });
    }
    probe.remove();
    return { btnW: w, rows, td: (() => { const n = document.querySelector('#trTemper .tr-tp .td');
      const r = n && n.getBoundingClientRect(), b = document.querySelector('#trTemper .tr-tp').getBoundingClientRect();
      return n ? { x: +(r.x - b.x).toFixed(1), x2: +(r.x - b.x + r.width).toFixed(1) } : null; })() };
  });
  out.E = E;
  if (E.__err) ok(false, 'evaluate 실패: ' + E.__err);
  else {
    info('.tb 폭 ' + E.btnW + ' · 같은 행 .td 우변 ' + (E.td ? E.td.x2 : '?'));
    E.rows.forEach(r => info(`  ${r.d}자리 «${r.txt}» 글자 ${r.textW}px`));
  }

  /* ══════════════════════════════════════════════════════════════════════
     §F 9:13.3 — 짧은 프레임에서 세 탭이 잘리나 (351 규약)
     ══════════════════════════════════════════════════════════════════════ */
  blk('§F 9:13.3 (1080×1600) 잘림');
  const { ctx: ctx2, page: p2 } = await open(browser, 1600);
  const ev2 = evOf(p2);
  const F = await ev2(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400;
    markDirty(); openTrain();
    const sheet = document.querySelector('#trw .tr-sheet').getBoundingClientRect();
    const res = { sheet: { y: +sheet.y.toFixed(1), y2: +(sheet.y + sheet.height).toFixed(1) }, tabs: {} };
    ['train', 'rune', 'temper'].forEach(k => {
      setTrSub(k); renderTrain();
      const sels = k === 'train' ? ['#trw .tr-up', '#trw .tr-prog', '#trw .tr-cards']
        : k === 'rune' ? ['#trw .tr-rn>.ri', '#trw .tr-rn>.rbt']
        : ['#trTemper .tp-hd', '#trTemper .tr-tp .tb'];   /* 614 — 회수 줄 없음 */
      res.tabs[k] = sels.map(s => { const n = document.querySelector(s); if (!n) return { s, miss: 1 };
        const r = n.getBoundingClientRect();
        return { s, y: +r.y.toFixed(1), y2: +(r.y + r.height).toFixed(1),
                 out: +(Math.max(0, (r.y + r.height) - (sheet.y + sheet.height))).toFixed(1) }; });
    });
    setTrSub('train'); renderTrain();
    return res;
  });
  out.F = F;
  if (F.__err) ok(false, 'evaluate 실패: ' + F.__err);
  else {
    info(`시트 ${F.sheet.y}..${F.sheet.y2}`);
    let bad = 0;
    Object.keys(F.tabs).forEach(k => F.tabs[k].forEach(o => {
      if (o.miss) { info(`  ${k} ${o.s} — 노드 없음`); return; }
      if (o.out > 0) bad++;
      info(`  ${k} ${o.s} ${o.y}..${o.y2}` + (o.out > 0 ? `  ⚠ 시트 밖 ${o.out}px` : ''));
    }));
    ok(bad === 0, `9:13.3 에서 시트 밖으로 나간 요소 ${bad}건 (수리 전 기준선)`);
  }

  await ctx2.close(); await ctx.close(); await browser.close();
  if (JSONOUT) console.log('\n' + JSON.stringify(out, null, 1));
  console.log('\nPROBE584 ' + pass + '/' + (pass + fail) + ' PASS · 빨강 ' + fail
    + '  ·  재현 항: 수리 전 ' + pre + ' / 수리 후 ' + post
    + (pre === 0 ? '  ⇒ 이 트리는 584 수리가 들어간 트리다' :
       post === 0 ? '  ⇒ 이 트리는 수리 전 트리다(등재문 재현)' : '  ⇒ 섞여 있다 — 절별로 읽어라'));
  process.exit(0);
})();
