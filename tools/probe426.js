/* 작업 426 재현 프로브 — «31 던전 클리어 «클리어 보상» 묶음의 앵커가 하단으로 몰린다»
 *
 *   node tools/probe426.js
 *
 * 주인 원문: «던전 클리어 보상 앵커? 피벗? 그거가 화면 중앙으로 되있어야할듯. 하단 말고».
 *
 * 이 파일은 «고쳤다» 를 재는 게이트(`verify426.js`)가 아니라 **무엇이 어떻게 어긋나는가를
 * 눈으로 보는** 자리다(338 규칙 — 처방을 따르기 전에 재현한다).
 * 프레임 3종(2280 = 9:19 기준 · 1920 = 9:16 · 1600 = 9:13.3, 351 루프의 최저 세로)에서
 *   ① `#dclw` 안 «클리어 보상» 묶음 11자리의 실측 rect
 *   ② 그 묶음의 합 bbox 와 **중심 y** — 프레임 중심(VH/2) 에서 몇 px 어긋나는가
 *   ③ 묶음 안 상대 Δ(리본 top ↔ 밴드 top 등)가 프레임마다 같은가 = «묶음이 안 찌그러지는가»
 *   ④ 묶음이 상단 HUD(`.pedge`)·하단 탭바(`#tabbar`)에 «닿나»(406 규약 — 덮였나가 아니라 닿나)
 *   ⑤ 339 «연속 도전» 토글·카운트다운이 묶음과 같이 움직이는가
 * 를 찍는다.
 *
 * ⚠ `#dclw` 는 딤 자신이 클릭 닫힘 대상이다(`e.target === #dclw`) — 묶음을 «높이 있는 상자» 로
 *    싸면 빈 면 클릭이 그 상자에 먹혀 닫힘이 죽는다. 그래서 ⑥ 으로 «빈 면 클릭 → 닫힘» 도 같이 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 묶음을 이루는 자리 — 측정표 31 §1-C 의 요소 전부. 셀렉터는 #dclw 안으로 스코프한다. */
const PARTS = [
  ['스파클', '.dcl-spk'],
  ['리본 그룹', '.upr-grp'],
  ['리본 몸통', '.upr-rb'],
  ['리본 꼬리 좌', '.upr-tl.l'],
  ['밴드', '.dcl-band'],
  ['보상 타일', '.dcl-tile'],
  ['보상 아이콘', '#dclIc'],
  ['수량', '.dcl-amt'],
  ['연속 도전 줄', '.dcl-auto'],
  ['카운트다운', '.dcl-cd'],
  ['알약 좌', '.dcl-pill.l'],
  ['티켓 좌', '.dcl-tk.l'],
  ['[재도전]', '#dclRe'],
  ['[확인]', '#dclOk'],
  ['[다음]', '#dclNx'],
];

const FRAMES = [2280, 1920, 1600];

(async () => {
  const browser = await launch(chromium);
  let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) bad++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
  const rows = {};

  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(URL);
    await page.waitForTimeout(1100);

    const ev = async (fn, arg) => {
      try { return await page.evaluate(fn, arg); }
      catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
    };

    /* 실제 진입점으로 연다 — 골드 던전 1층 클리어 + 339 «연속 도전» 켬(카운트다운이 떠야 ⑤ 를 잰다) */
    const open = await ev((parts) => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      const d = DUNGEONS[0];
      S.dunTk[d.id] = 9; S.dun[d.id] = 3;
      openDunClear(d, 1, false, true);
      /* ⚠ rect 와 캡처는 «같은 순간» 에 잡아야 한다(350 교훈) — 여기서는 rect 만 쓰므로
         연출 전 좌표로 충분하지만, 게이트(`verify426`)는 60 쥬시가 걷힐 때까지 700ms 기다린다. */
      const app = document.getElementById('app');
      const A = app.getBoundingClientRect();
      const q = (s) => {
        const el = document.querySelector('#dclw ' + s) || document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
                 w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      };
      const out = {};
      for (const [nm, sel] of parts) out[nm] = q(sel);
      /* 고정 내비 두 자리 — 406 규약의 «닿나» 판정 대상 */
      const pe = document.querySelector('.pedge'), tb = document.getElementById('tabbar');
      const rr = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
        return { y: +(r.top - A.top).toFixed(1), h: +r.height.toFixed(1) }; };
      return { VH: +A.height.toFixed(1), parts: out, pedge: rr(pe), tabbar: rr(tb),
               cd: (document.getElementById('dclCd') || {}).textContent || '' };
    }, PARTS);

    if (open.__err) { console.log('[' + H + '] 열기 실패: ' + open.__err); bad++; n++; await ctx.close(); continue; }

    /* ⑥ 빈 면 클릭 → 닫힘 (묶음 상자가 딤의 클릭을 가로채지 않는지) */
    const closeOk = await ev(() => {
      const w = document.getElementById('dclw');
      const app = document.getElementById('app').getBoundingClientRect();
      /* 프레임 좌상단 근처 — 묶음 어느 자리와도 안 겹치는 빈 딤 */
      const el = document.elementFromPoint(app.left + 40, app.top + 40);
      const hit = el ? (el.id || el.className || el.tagName) : 'none';
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { hit: String(hit), closed: !w.classList.contains('on') };
    });

    rows[H] = { open, closeOk, errs };
    await ctx.close();
  }

  await browser.close();

  /* ---------- 보고 ---------- */
  console.log('작업 426 재현 — 31 던전 클리어 «클리어 보상» 묶음 앵커\n');

  for (const H of FRAMES) {
    const r = rows[H]; if (!r) continue;
    const P = r.open.parts, VH = r.open.VH;
    let top = Infinity, bot = -Infinity;
    for (const [nm] of PARTS) { const p = P[nm]; if (!p || !p.h) continue; top = Math.min(top, p.y); bot = Math.max(bot, p.y + p.h); }
    const cy = (top + bot) / 2, fc = VH / 2;
    r.bbox = { top, bot, cy, fc, d: cy - fc, h: bot - top };
    console.log('── 프레임 ' + H + ' (VH ' + VH + ') ' + '─'.repeat(28));
    for (const [nm] of PARTS) {
      const p = P[nm];
      console.log('   ' + nm.padEnd(12) + (p ? ('y ' + String(p.y).padStart(7) + ' .. ' + String(+(p.y + p.h).toFixed(1)).padStart(7) + '  (h ' + p.h + ')') : '없음'));
    }
    console.log('   묶음 bbox   y ' + top.toFixed(1) + ' .. ' + bot.toFixed(1) + '  (h ' + (bot - top).toFixed(1) + ')');
    console.log('   묶음 중심   y ' + cy.toFixed(1) + '   프레임 중심 ' + fc.toFixed(1) +
                '   Δ ' + (cy - fc >= 0 ? '+' : '') + (cy - fc).toFixed(1) + 'px' +
                (Math.abs(cy - fc) <= 2 ? '  ← 중앙' : (cy > fc ? '  ← 아래로 몰림' : '  ← 위로 몰림')));
    console.log('   .pedge 하변 ' + (r.open.pedge ? (r.open.pedge.y + r.open.pedge.h).toFixed(1) : '없음') +
                ' · #tabbar 상변 ' + (r.open.tabbar ? r.open.tabbar.y.toFixed(1) : '없음') +
                ' · 카운트다운 «' + r.open.cd + '»');
    console.log('   빈 면 클릭 → elementFromPoint «' + r.closeOk.hit + '» · 닫힘 ' + (r.closeOk.closed ? 'O' : 'X'));
    if (r.errs.length) console.log('   콘솔 에러 ' + r.errs.length + '건: ' + r.errs[0]);
    console.log('');
  }

  console.log('── 판정 ' + '─'.repeat(44));
  for (const H of FRAMES) {
    const r = rows[H]; if (!r || !r.bbox) continue;
    ok(Math.abs(r.bbox.d) <= 2, '[' + H + '] 묶음 중심 = 프레임 중심 ±2px (실측 Δ ' + r.bbox.d.toFixed(1) + ')');
  }
  /* ③ 묶음 안 상대 Δ 는 프레임과 무관해야 한다(찌그러지지 않는다) */
  const base = rows[2280] && rows[2280].open.parts;
  if (base) for (const H of [1920, 1600]) {
    const r = rows[H]; if (!r) continue;
    let worst = 0, who = '';
    for (const [nm] of PARTS) {
      const a = base[nm], b = r.open.parts[nm]; if (!a || !b) continue;
      const da = (a.y - base['밴드'].y), db = (b.y - r.open.parts['밴드'].y);
      if (Math.abs(da - db) > Math.abs(worst)) { worst = da - db; who = nm; }
    }
    ok(Math.abs(worst) <= 0.6, '[' + H + '] 묶음 안 상대 Δ 가 2280 과 같다 (최악 ' + worst.toFixed(1) + 'px · ' + who + ')');
  }
  /* ④ 고정 내비에 «닿나» */
  for (const H of FRAMES) {
    const r = rows[H]; if (!r || !r.bbox) continue;
    const pe = r.open.pedge ? r.open.pedge.y + r.open.pedge.h : 0;
    const tb = r.open.tabbar ? r.open.tabbar.y : r.open.VH;
    ok(r.bbox.top >= pe && r.bbox.bot <= tb,
       '[' + H + '] 묶음이 HUD(.pedge 하변 ' + pe.toFixed(1) + ')·탭바(상변 ' + tb.toFixed(1) + ') 어느 것에도 안 닿는다');
  }
  /* ⑤ 카운트다운이 떠 있다 = 339 자리가 묶음 안이다 */
  for (const H of FRAMES) {
    const r = rows[H]; if (!r) continue;
    const cd = r.open.parts['카운트다운'], bd = r.open.parts['밴드'];
    ok(!!(cd && bd) && cd.y > bd.y, '[' + H + '] 339 카운트다운이 묶음 안(밴드 아래)에 있다');
  }
  /* ⑥ 빈 면 클릭 닫힘 */
  for (const H of FRAMES) {
    const r = rows[H]; if (!r) continue;
    ok(r.closeOk.closed, '[' + H + '] 딤 빈 면 클릭으로 닫힌다 (elementFromPoint «' + r.closeOk.hit + '»)');
  }

  console.log('\n' + (bad ? 'PROBE426 — ' + (n - bad) + '/' + n + ' (FAIL ' + bad + '건)' : 'PROBE426 — ' + n + '/' + n));
  process.exit(0);
})();
