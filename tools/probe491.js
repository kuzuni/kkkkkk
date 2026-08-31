#!/usr/bin/env node
/* 작업 491 — 「룬 강화·단련 버튼이 눌린 건지 안 눌린 건지 헷갈린다」 **재현**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다.)
 *
 *   node tools/probe491.js
 *
 * 등재문은 «60 쥬시가 팝업 껍데기·A5 공용 버튼에는 붙어 있으나 룬·단련 카드/버튼에는
 * 눌림 반응이 없거나 약하다» 고 적었다. 그런데 60 의 누름은 **개별 CSS 가 아니라**
 * `#app` pointerdown 위임 한 쌍(`jzTarget` → `jz-dn` scale .94 + `sfx('tap')`)이다.
 * 그러면 «룬·단련만 없다» 는 말은 셋 중 하나여야 한다:
 *   ⓐ `jzTarget` 이 그 버튼을 못 고른다(cursor:pointer 가 아니거나 엉뚱한 조상이 잡힌다)
 *   ⓑ 고르긴 하는데 **누른 노드가 곧바로 사라진다**(0.35초 주기 재렌더 · innerHTML 교체)
 *   ⓒ 노드도 클래스도 남는데 **눈에 보이는 변화가 없다**(scale .94 가 이 크기·이 배경에서 안 읽힌다)
 * 세 갈래는 처방이 전혀 다르므로 **먼저 가른다.**
 *
 * 그래서 층을 셋으로 갈라 잰다 — 셋을 한 항으로 묶으면 어느 층이 결손인지 못 가린다:
 *   [A] 선택   — `jzTarget()` 이 실제로 고르는 호스트 · computed cursor
 *   [B] 상태   — pointerdown 뒤 16/50/150/450ms 에 `jz-dn` 클래스 · computed scale · 노드 생존
 *   [C] 픽셀   — 그 버튼 bbox 를 **누르기 전 / 누른 50ms 뒤** 두 장 찍어 «달라진 픽셀 %»
 *                (「눌렀는지 알 수 있는가」는 결국 이것 하나다 — 350 처방 «찍힌 픽셀로 물어라»)
 *   [D] 유지   — 홀드 450ms 시점에 «눌린 채» 가 보이는가(등재문 «홀드는 유지 상태가 보이게»)
 *
 * 대조군을 반드시 같이 잰다(비교 없이는 «약하다» 가 수치가 안 된다):
 *   · 훈련 카드([data-tr]) — 같은 팝업 · 같은 홀드 상수(64) · 주인이 지적하지 않은 쪽
 *   · A5 공용 버튼(#trw 닫기) · 22 퀘스트 [모두 받기] — 60 이 «붙어 있다» 고 적은 쪽
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 두 PNG 버퍼의 «달라진 픽셀 %» — 캡처를 페이지로 되돌려 찍힌 픽셀을 읽는다(350 처방) */
async function diffPct(page2, a, b, tol) {
  return await page2.evaluate(async ([a, b, tol]) => {
    const load = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); return i; };
    const ia = await load(a), ib = await load(b);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    if (!w || !h) return { pct: 0, w, h, maxd: 0 };
    const px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      return x.getImageData(0, 0, w, h).data; };
    const A = px(ia), B = px(ib);
    let n = 0, maxd = 0;
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i+1] - B[i+1]), Math.abs(A[i+2] - B[i+2]));
      if (d > maxd) maxd = d;
      if (d > tol) n++;
    }
    return { pct: n / (w * h) * 100, w, h, maxd };
  }, [a.toString('base64'), b.toString('base64'), tol]);
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = await ctx.newPage();                     /* 픽셀 비교 전용 스크래치 */
  await shot.setContent('<body style="margin:0">');
  /* ⚠ 페이지가 둘이면 **뒤에 만든 쪽이 앞**이고, 뒤로 밀린 페이지는 크로미움이 애니메이션을 재운다 —
     그러면 팝업 열림 연출(`jz-sh2`)이 첫 프레임에 멈춰 있어 시트 안 좌표가 통째로 +1245px 어긋난다
     (1회차에 실제로 났다: 전 표본이 «화면 밖»). 잴 때는 항상 게임 페이지를 앞으로 되돌린다. */
  const front = async () => { await page.bringToFront(); await page.waitForTimeout(60); };
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  /* ── 상태: 룬·단련·훈련이 «지금 누를 수 있는» 자리 ── */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    if (S.temper) { S.temper.pts = 500; }
    openTrain();
  });
  await page.waitForTimeout(300);

  /* ── 잰다 ── */
  const TARGETS = [
    { id: 'R-buy',   tab: 'rune',   sel: '#trRunes .rbt.b1',              n: '룬 [강화] 버튼(홀드)' },
    { id: 'R-sub',   tab: 'rune',   sel: '#rnSubs [data-runesub]',        n: '룬 하위 탭 «일반룬»' },
    { id: 'T-chg',   tab: 'temper', sel: '#trTemper .tp-hd .cg',          n: '단련 [충전] 버튼' },
    { id: 'T-up',    tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb',       n: '단련 [투자] 버튼(홀드)' },
    { id: 'T-reset', tab: 'temper', sel: '#trTemper .tp-ft .rb',          n: '단련 [회수] 버튼' },
    { id: 'T-tab',   tab: 'temper', sel: '#trSubs [data-trsub="temper"]', n: '팝업 탭 «단련»' },
    /* ── 대조군 ── */
    { id: 'X-train', tab: 'train',  sel: '#trCards [data-tr]',            n: '★대조 훈련 카드(홀드·64)' },
    { id: 'X-tab',   tab: 'train',  sel: '#trSubs [data-trsub="train"]',  n: '★대조 팝업 탭 «훈련»' },
    { id: 'X-up',    tab: 'train',  sel: '#trUp',                         n: '★대조 [단계 ↑] 버튼' },
  ];

  const rows = [];
  await front();
  for (const t of TARGETS) {
    await front();
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, t.tab);
    await page.waitForTimeout(500);

    const info = await page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (!el) return { miss: true };
      const r = el.getBoundingClientRect();
      const host = (typeof jzTarget === 'function') ? jzTarget(el) : null;
      return {
        r: { x: r.x, y: r.y, w: r.width, h: r.height },
        cur: getComputedStyle(el).cursor,
        dead: (typeof jzDead === 'function') ? !!jzDead(el) : null,
        host: host ? (host.tagName + '.' + (host.className || '').toString().trim().split(/\s+/).join('.')) : null,
        same: host === el,
      };
    }, t.sel);
    if (info.miss) { rows.push({ ...t, miss: true }); ok(false, t.id + ' 요소 없음', t.sel); continue; }
    if (process.env.P491_DBG) {
      const g = await page.evaluate(() => ({
        trw: document.getElementById('trw').getBoundingClientRect().toJSON(),
        app: document.getElementById('app').getBoundingClientRect().toJSON(),
        sy: window.scrollY, cls: document.getElementById('trw').className }));
      console.log('    [dbg] ' + t.id + ' el=' + JSON.stringify(info.r) + ' ' + JSON.stringify(g));
    }

    /* 뷰포트 밖으로 넘치는 bbox 는 잘라서 찍는다 — 팝업 시트는 프레임보다 길다 */
    const VW = 1080, VH = 2280;
    const x0 = Math.max(0, Math.min(VW - 1, info.r.x - 4)), y0 = Math.max(0, Math.min(VH - 1, info.r.y - 4));
    const clip = { x: x0, y: y0,
                   width: Math.max(1, Math.min(info.r.w + 8, VW - x0)),
                   height: Math.max(1, Math.min(info.r.h + 8, VH - y0)) };
    if (info.r.w <= 0 || info.r.h <= 0 || info.r.y >= VH || info.r.y + info.r.h <= 0) {
      rows.push({ ...t, miss: true }); ok(false, t.id + ' bbox 가 화면 밖/0', JSON.stringify(info.r)); continue;
    }
    const before = await page.screenshot({ clip });

    /* ⚠ «살아 있다» 를 셀렉터로만 물으면 **헛초록**이다 — 재렌더가 같은 셀렉터의 **새 노드**를 놓으면
       질의는 그대로 맞는데 `jz-dn` 은 사라진 옛 노드와 함께 죽는다. 그래서 누르기 «전» 에 도장을 찍고
       나중에 그 도장이 살아 있는지로 «같은 노드인가» 를 묻는다(이 회차의 진짜 뿌리가 여기 있었다). */
    await page.evaluate(sel => { const el = document.querySelector(sel); if (el) el.dataset.p491 = 'stamp'; }, t.sel);

    /* 진짜 pointerdown — 합성 이벤트가 아니라 마우스로 눌러야 위임·캡처가 제품과 같다 */
    const cx = info.r.x + info.r.w / 2, cy = info.r.y + info.r.h / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();

    const at = async ms => {
      await page.waitForTimeout(ms);
      return await page.evaluate(sel => {
        const el = document.querySelector(sel);
        const dn = document.querySelector('.jz-dn');
        return {
          alive: !!el,
          same: !!(el && el.dataset && el.dataset.p491 === 'stamp'),
          dn: !!(el && el.classList.contains('jz-dn')),
          anyDn: !!dn,
          scale: el ? getComputedStyle(el).scale : null,
          bg: el ? getComputedStyle(el).backgroundColor : null,
          fil: el ? getComputedStyle(el).filter : null,
        };
      }, t.sel);
    };
    /* ⚠ 표본 순서가 곧 자의 정직성이다 — `page.screenshot` 은 수백 ms 를 먹으므로 그 «앞» 에서
       상태를 다 읽는다. 옛 순서(16ms → 캡처 → 50ms)는 «50ms» 라고 적힌 표본이 실제로는
       수백 ms 뒤였고, 홀드가 350ms 틱에서 스스로 멈춘 자리(단련 [충전])를 «재렌더로 노드가 죽었다» 로
       읽을 뻔했다. 상태 표본은 16·50ms 둘만 «약속한 시각» 이고, 캡처 뒤 표본은 «홀드 중» 으로만 읽는다. */
    const s16 = await at(16);
    const s50 = await at(34);
    const during = await page.screenshot({ clip });         /* 누른 채(≥50ms) — jz-dn 은 both 라 유지된다 */
    const s150 = await at(100);
    const s450 = await at(300);
    const held = await page.screenshot({ clip });
    await page.mouse.up();
    await page.waitForTimeout(120);

    const d50 = await diffPct(shot, before, during, 12);
    const d450 = await diffPct(shot, before, held, 12);
    await front();
    rows.push({ ...t, info, s16, s50, s150, s450, d50: d50.pct, d450: d450.pct, maxd: d50.maxd });

    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false);
                                if (typeof trHoldStop === 'function') trHoldStop(false); });
    await page.waitForTimeout(150);
  }

  /* ── 표 ── */
  console.log('\n[표] 누름 반응 실측 (bbox 안 «달라진 픽셀 %» · tol 12/255)\n');
  console.log('  id        호스트=자신 cursor   jz-dn 16/50ms  같은노드@50ms  Δpx 누른채  Δpx 홀드끝  이름');
  for (const r of rows) {
    if (r.miss) { console.log('  ' + r.id.padEnd(9) + ' —— 요소 없음'); continue; }
    console.log('  ' + r.id.padEnd(9)
      + String(r.info.same).padEnd(6) + '  ' + String(r.info.cur).padEnd(8)
      + [r.s16.dn, r.s50.dn].map(b => b ? 'O' : '·').join(' ').padEnd(9)
      + String(r.s50.same).padEnd(11)
      + (p2(r.d50) + '%').padStart(8) + (p2(r.d450) + '%').padStart(11)
      + '  ' + r.n);
  }

  console.log('');
  /* ── [A] 선택 층 ── */
  for (const r of rows) if (!r.miss)
    ok(r.info.cur === 'pointer', '[A] ' + r.id + ' cursor:pointer', r.info.cur);
  for (const r of rows) if (!r.miss)
    ok(r.info.same, '[A] ' + r.id + ' jzTarget 이 그 버튼 자신을 고른다', r.info.host || 'null');

  /* ── [B] 상태 층 ── */
  for (const r of rows) if (!r.miss)
    ok(r.s50.dn, '[B] ' + r.id + ' 누른 뒤 50ms 에 jz-dn 이 붙어 있다',
       'alive=' + r.s50.alive + ' anyDn=' + r.s50.anyDn + ' scale=' + r.s50.scale);
  for (const r of rows) if (!r.miss)
    ok(r.s50.same, '[B] ' + r.id + ' **누른 그 노드**가 50ms 뒤에도 그대로다(첫 렌더 생존)',
       'alive=' + r.s50.alive + ' same=' + r.s50.same);

  /* ── [C] 픽셀 층 — «눌렀는지 알 수 있는가» 의 유일한 자 ── */
  const CPCT = 3.0;                       /* 잠정 통과선. 대조군 실측으로 이 회차에 확정한다 */
  for (const r of rows) if (!r.miss)
    ok(r.d50 >= CPCT, '[C] ' + r.id + ' 누른 채 bbox 픽셀 ≥ ' + CPCT + '% 변한다', p2(r.d50) + '%');

  /* ── [D] 유지 층 ── */
  for (const r of rows) if (!r.miss)
    ok(r.d450 >= CPCT, '[D] ' + r.id + ' 홀드 끝(≈450ms+)에도 변화가 남아 있다', p2(r.d450) + '%');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  console.log('\nPROBE491 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
