/* 작업 371 — 좌측 사이드 «축복» 글리프 후보 실측 (차분법)
 *
 *   node tools/probe371.js            (전 후보)
 *   node tools/probe371.js ✨ 🍀      (지정 후보만)
 *
 * 왜 이 도구인가:
 *   371 의 처방은 «배율이 아니라 글리프를 갈아 끼운다»(360 의 🏅 → 🏆 선례)다. 그런데 «어느 글리프가
 *   형제 급 폭인가» 는 **잴 방법부터 고르는 문제**다 —
 *     · `canvas.measureText` 는 컬러 이모지에서 **전 글리프가 같은 em 상자**를 돌려준다(356 1회차 확인). 못 쓴다.
 *     · 잉크에는 `drop-shadow` 4겹 외곽선이 더해지는데 그 두께는 `--o = --ih × .028` 이라 **font-size 에
 *       비례하지 않는다**. 그래서 «자연 종횡비» 를 한 번 재서 나누는 닫힌 식이 성립하지 않는다(LESSONS 336-②).
 *   ⇒ cal360 과 같은 **실측 → 선형 보정 → 재측정**을 후보마다 돌리되, **`--sf` 하나만** 민다
 *      (356 규칙: `--sx` 를 다시 만들지 마라). 높이를 형제 급에 맞춘 **뒤의 폭**이 그 글리프의 답이다.
 *
 * 판정: 형제 4칸(룰렛·퀘스트·승급전·도감 — verify360 [3] 과 같은 기준. 출석·축복은 «주인이 이름을 댄»
 *       자리라 기준에서 뺀다) 평균 잉크 대비 폭 오차가 ±5%(verify360 BAND) 안에 드는 후보가 «합격» 이다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { plate } = require('./plate360');   /* 385 — 차분법의 공용 판(마젠타). 규약·근거는 그 파일 머리말 */
const { chromium } = pw();

const SRC = 'file://' + path.resolve(__dirname, '../index.html');
const CLIP = { x: 0, y: 0, width: 260, height: 1200 };
const BAND = 5;                       /* verify360 [3] 과 같은 허용폭 */
const REF_ROWS = ['roul', 'quest', 'promo', 'coll'];

/* 후보 — «축복» 의 뜻이 서는 글리프만. 순서는 뜻이 가까운 순이다. */
const CAND = process.argv.slice(2).filter(s => s && !s.startsWith('-'));
const POOL = CAND.length ? CAND : [
  '🙏', '😇', '🕊️', '✨', '🌟', '⭐', '💫', '🍀', '🔮', '🧿',
  '📿', '🕯️', '⛪', '🌈', '🎁', '💠', '🪬', '🙌', '💖', '🌠',
];

/* 한 바퀴 — 주어진 행들의 잉크 bbox 를 차분법으로 돌려준다 */
async function measure(p, rows) {
  const base = (await p.screenshot({ clip: CLIP })).toString('base64');
  const shots = [];
  for (const k of rows) {
    const st = await p.addStyleTag({ content:
      `#sideL .ibtn[data-pop="${k}"] .si{visibility:hidden!important}` });
    await p.waitForTimeout(70);
    shots.push((await p.screenshot({ clip: CLIP })).toString('base64'));
    await p.evaluate(el => el.remove(), st);
    await p.waitForTimeout(50);
  }
  return p.evaluate(async ({ base, shots, CLIP }) => {
    const load = b64 => new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64; });
    const px = async b64 => {
      const im = await load(b64);
      const c = document.createElement('canvas');
      c.width = CLIP.width; c.height = CLIP.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, CLIP.width, CLIP.height).data;
    };
    const A = await px(base), out = [];
    for (const s of shots) {
      const B = await px(s);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < CLIP.height; y++) for (let x = 0; x < CLIP.width; x++) {
        const i = (y * CLIP.width + x) * 4;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      out.push(x1 < 0 ? null : {
        w: x1 - x0 + 1, h: y1 - y0 + 1,
        cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, x0, y0, x1, y1 });
    }
    return out;
  }, { base, shots, CLIP });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(SRC);
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.stage = 37; S.best = 37; S.gold = 1234567; S.dia = 8900;
    S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0; S.totalKills = 500;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i); });
  await p.addStyleTag({ content:
    '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await p.waitForTimeout(250);
  /* ★ 385(2026-08-29) — **판을 깔고 잰다.** 382 가 `verify360` 에만 넣은 정착 두 줄이 이 자에는
     안 와서, 같은 차분법이 게이트와 다른 숫자를 돌려주고 있었다(게이트 attend 98×100 ↔ 여기
     96×99 · 로드마다 ±1~2px). 판 색 규약과 근거는 `tools/plate360.js` 머리말. */
  await plate(p);

  /* ── 1. 기준 — 형제 4칸 평균 잉크 ────────────────────────────────────────── */
  const refInk = await measure(p, REF_ROWS);
  if (refInk.some(m => !m)) { console.error('probe371: 형제 칸 측정 실패'); process.exit(2); }
  const TW = refInk.reduce((a, m) => a + m.w, 0) / refInk.length;
  const TH = refInk.reduce((a, m) => a + m.h, 0) / refInk.length;
  const TCX = refInk.reduce((a, m) => a + m.cx, 0) / refInk.length;
  /* 세로는 «절대 y» 로 비교할 수 없다(행마다 top 이 다르다) — **자기 행 top 기준 오프셋**으로 잰다. */
  const tops = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('#sideL .ibtn').forEach(e => {
      o[e.dataset.pop] = e.getBoundingClientRect().top; });
    return o;
  });
  const TDY = refInk.reduce((a, m, i) => a + (m.cy - tops[REF_ROWS[i]]), 0) / refInk.length;
  console.log('[기준] 형제 4칸(룰렛·퀘스트·승급전·도감) 평균 잉크 = ' +
    `${TW.toFixed(1)} × ${TH.toFixed(1)} · 잉크 중심 x ${TCX.toFixed(1)} · 행 top 기준 중심 y +${TDY.toFixed(1)}`);
  REF_ROWS.forEach((k, i) => console.log(
    `        ${k.padEnd(6)} ${refInk[i].w}×${refInk[i].h}  중심 ${refInk[i].cx.toFixed(1)}/${refInk[i].cy.toFixed(1)}` +
    `  (행 top ${tops[k]} → +${(refInk[i].cy - tops[k]).toFixed(1)})`));

  /* 축복 칸의 현재 --dx/--dy — 후보 비교는 «같은 손잡이» 위에서 한다 */
  const cur = await p.evaluate(() => {
    const e = document.querySelector('#sideL .ibtn[data-pop="bless"]');
    return { sf: parseFloat(e.style.getPropertyValue('--sf')),
             dx: e.style.getPropertyValue('--dx'), dy: e.style.getPropertyValue('--dy'),
             glyph: e.querySelector('.si').textContent };
  });
  console.log(`[현재] 축복 ${cur.glyph} --sf:${cur.sf} --dx:${cur.dx} --dy:${cur.dy}\n`);

  /* ── 2. 후보 — 높이를 형제 급으로 맞춘 «뒤의 폭» ─────────────────────────── */
  const set = (g, sf) => p.evaluate(({ g, sf }) => {
    const e = document.querySelector('#sideL .ibtn[data-pop="bless"]');
    e.querySelector('.si').textContent = g;
    e.style.setProperty('--sf', sf.toFixed(4));
  }, { g, sf });

  console.log('[후보] 높이를 형제 평균에 맞춘 뒤의 폭 (--sf 만 민다 — 356 규칙: --sx 금지)');
  const rows = [];
  for (const g of POOL) {
    let sf = cur.sf, m = null;
    for (let it = 0; it < 4; it++) {
      await set(g, sf);
      await p.waitForTimeout(120);
      m = (await measure(p, ['bless']))[0];
      if (!m) break;
      if (Math.abs(m.h / TH - 1) * 100 < 0.6) break;
      sf *= TH / m.h;
    }
    if (!m) { console.log(`    ${g}  측정 실패`); continue; }
    const dw = (m.w / TW - 1) * 100, dh = (m.h / TH - 1) * 100;
    /* 잉크 중심이 형제 공통 자리와 어긋난 만큼이 --dx/--dy 보정치다(현재 값에 더한다) */
    const ddx = TCX - m.cx;
    const ddy = TDY - (m.cy - tops.bless);
    rows.push({ g, sf, w: m.w, h: m.h, dw, dh, ddx, ddy });
    console.log(`    ${g}\t--sf ${sf.toFixed(4)}\t잉크 ${String(m.w).padStart(3)}×${String(m.h).padStart(3)}` +
      `\tΔ폭 ${dw.toFixed(1).padStart(6)}%\tΔ높이 ${dh.toFixed(1).padStart(5)}%` +
      `\t중심 ${m.cx.toFixed(1)}/+${(m.cy - tops.bless).toFixed(1)}` +
      `\t보정 dx${ddx >= 0 ? '+' : ''}${ddx.toFixed(1)} dy${ddy >= 0 ? '+' : ''}${ddy.toFixed(1)}` +
      `\t${Math.abs(dw) <= BAND ? '합격' : ''}`);
  }

  console.log(`\n[판정] 형제 평균 대비 폭 ±${BAND}% 안 = 합격 (verify360 [3] 과 같은 자)`);
  const pass = rows.filter(r => Math.abs(r.dw) <= BAND).sort((a, b) => Math.abs(a.dw) - Math.abs(b.dw));
  if (!pass.length) console.log('    합격 후보 없음 — 후보 풀을 넓혀라');
  pass.forEach(r => console.log(
    `    ${r.g}  Δ폭 ${r.dw.toFixed(1)}%  --sf:${r.sf.toFixed(3)}` +
    `  보정 --dx ${r.ddx >= 0 ? '+' : ''}${r.ddx.toFixed(1)}px · --dy ${r.ddy >= 0 ? '+' : ''}${r.ddy.toFixed(1)}px`));

  await b.close();
})().catch(e => { console.error('probe371 즉사:', e); process.exit(2); });
