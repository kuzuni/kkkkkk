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
    /* 613·614 — [충전](.cg)·[회수](.tp-ft)는 기능째 폐지돼 표본에서 뺐다 */
    { id: 'T-up',    tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb',       n: '단련 [단련] 버튼(홀드)' },
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

  /* ── [F] 회당 플로터 — 3회차 ⅰ «룬 [강화] 플로터가 0px» 의 재현 ────────────────────────
     비평가 BW·BX 가 2회차에 **독립으로** «down·up 어디에도 0px» 을 봤다. 338 규칙대로 새 연출을
     얹기 전에 제품에게 먼저 묻는다 — 갈래는 셋이고 처방이 전혀 다르다:
       ⓐ `hbFloat` 가 false 로 빠진다(`fxL()`·`hbHost()`·`FXMAX`) → 노드가 아예 없다
       ⓑ 노드는 생기는데 자리가 캡처 clip 밖이거나 남에게 가린다
       ⓒ 노드도 자리도 맞는데 **너무 빨리 진다**(캡처 한 장이 수백 ms 를 먹는다 — 2회차가 `-up` 에서
          이미 한 번 겪은 하네스 드리프트의 다른 얼굴)
     그래서 «몇 장인가 · 어디인가 · 언제까지 보이는가» 를 시각별로 갈라 적는다. */
  console.log('\n[F] 회당 플로터 — 한 발(lone) 수명 · 자리');
  await front();
  await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('rune'); renderTrain(); });
  await page.waitForTimeout(400);
  const fRect = await page.evaluate(() => {
    const b = document.querySelector('#trRunes .rbt.b1'), c = document.querySelector('#trRunes .tr-rn');
    return b && c ? { b: b.getBoundingClientRect().toJSON(), c: c.getBoundingClientRect().toJSON() } : null;
  });
  const fSnap = async () => await page.evaluate(() => {
    const L = document.getElementById('fxl'); if (!L) return [];
    return [...L.querySelectorAll('.fx-plus.hb')].map(n => {
      const r = n.getBoundingClientRect();
      return { t: n.textContent, a: +(+getComputedStyle(n).opacity).toFixed(2),
               x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
               lng: n.classList.contains('lng') };
    });
  });
  if (fRect) {
    await page.mouse.move(fRect.b.x + fRect.b.width / 2, fRect.b.y + fRect.b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);  const f60  = await fSnap();
    await page.mouse.up();          /* 한 발 — 홀드 반복이 안 끼게 곧바로 뗀다 */
    await page.waitForTimeout(95);  const f140 = await fSnap();
    await page.waitForTimeout(160); const f300 = await fSnap();
    await page.waitForTimeout(120); const f420 = await fSnap();
    const vis = a => a.filter(n => n.a > 0.08);
    for (const [nm, a] of [['60ms', f60], ['140ms', f140], ['300ms', f300], ['420ms', f420]])
      console.log('  · ' + nm.padStart(6) + ' — ' + vis(a).length + '장 보임 ' +
        JSON.stringify(vis(a).map(n => n.t + '@' + n.y + '(α' + n.a + (n.lng ? ',lng' : '') + ')')));
    ok(f60.length >= 2, '[F1] 한 발에 회당 플로터가 두 줄기(결과·비용) 다 생긴다', f60.length + '장');
    ok(f60.every(n => n.lng), '[F2] 한 발은 «lone» 으로 잡혀 긴 수명(.56s)을 받는다',
       f60.map(n => n.lng).join('·'));
    ok(f60.every(n => n.y > fRect.c.y && n.y + n.h < fRect.c.y + fRect.c.height),
       '[F3] 자리가 호스트(룬 카드) 안이다 — «캡처 clip 밖» 갈래를 기각한다',
       JSON.stringify(f60.map(n => n.y)) + ' in ' + Math.round(fRect.c.y) + '..' +
       Math.round(fRect.c.y + fRect.c.height));
    ok(vis(f140).length >= 2, '[F4] ★ 뗀 뒤 140ms(비평 캡처 시각)에도 두 장이 α>0.08 로 남아 있다',
       vis(f140).map(n => n.t + ' α' + n.a).join(' · '));
    ok(vis(f300).length >= 2, '[F5] ★ 300ms 에도 남아 있다 — 옛 .3s 는 여기서 이미 α 0 이었다(2회차 «0px» 의 정체)',
       vis(f300).map(n => n.t + ' α' + n.a).join(' · ') || '0장');
    /* ⚑ 5회차 — 수명이 .56s → 1.3s 로 바뀌어 불투명 구간이 **130~936ms** 다. 4회차까지 이 항이
       «420ms» 를 물었던 것은 .56s 의 꼬리(403ms) 바로 뒤라 하네스 누적 대기의 드리프트에 걸려
       기준선에서도 빨갛게 나던 자리다(4회차 착수 시 수리 전 트리에서 60/61 로 확인). 이제는
       그 시각이 불투명 구간 **한복판**이라 드리프트에 안 흔들린다. */
    ok(vis(f420).length >= 2, '[F6] 420ms 에 두 장 다 살아 있다(불투명 구간 130~936ms 의 한복판)',
       vis(f420).length + '장');
    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false); });
    await page.waitForTimeout(200);
  } else ok(false, '[F] 룬 [강화] 버튼/카드를 못 찾았다');

  /* ── [G] 4회차 — [충전] 이 «누른 손 밑에서 꺼진다» 의 경로 ─────────────────────────────────
     3회차 §13 이 시각별 표본으로 «400ms 에 노드가 교체되고 `.no` 회색이 입혀진다» 까지 찍었다.
     4회차는 그 앞의 **가정 하나**를 먼저 못박는다 — 처방(`jzDown` 하나로 갈래를 가른다)이
     그 가정 위에 서 있기 때문이다: 「정상 release 에서는 60 의 `jzRelease`(캡처)가 이 파일의
     `rtHoldStop`(버블)보다 **먼저** 돌아 `jzDown` 이 이미 비어 있다」.
     그래서 `renderTrain` 을 감싸 **호출 시각마다 `jzDown` 의 생사**를 적는다(제품은 안 건드린다).
       · 자멸(누른 채) 호출 → `dn:true`  = 손 밑에서 갈아 끼우는 그 호출
       · 정상 release 호출 → `dn:false` = 종전대로 그 자리에서 돌아야 하는 호출
     수리 전에는 앞의 것이 **있고**, 수리 뒤에는 **0건**이어야 한다(뒤의 것은 둘 다 있어야 한다).

     ⚑ 626(2026-09-01) — **표본을 [충전]에서 단련 [단련](`.tr-tp.k0 .tb`)으로 옮겼다.** 613 이
     [충전]을 기능째 폐지해 이 절의 `#trTemper .tp-hd .cg` 는 한 번도 안 맞았고, 87행 TARGETS 는
     613·614 때 따라왔는데 **여기만 안 따라와** `if(!b || !hd)` 가 받아 §G 본문이 통째로 생략됐다
     (626 재현: 겉으로는 `FAIL [G] … 못 찾았다` 한 줄이지만 실제로 사라진 것은 **판정 10개**라
     점수 자체가 49/50 으로 거짓말을 했다 — 조용한 쪽이 진짜 결함이다).
     ⚠ **절을 통째로 옮기지는 않았다** — 626 이 산 버튼으로 시험해 보니 갈래가 둘이었다:
       · [G1]~[G5](자멸 렌더 축 — 누른 노드 생존 · `jz-dn` 유지 · `.no` 미덮임 · `jzDown` 중 통짜
         렌더 0)는 **호스트와 무관한 계약**이라 산 버튼에서 그대로 성립한다 ⇒ 옮겨서 지킨다.
       · 옛 [G6]~[G10]은 **[충전] 고유의 재료**를 물고 있어 옮기면 뜻을 잃는다 ⇒ 걷어냈다
         (624 가 `cap491` 장면을 걷어낸 것과 같은 판단): [G6] «회당 플로터 한 줄기» 는 전환비 1:1
         이라 두 줄기가 한 줄기로 접힌 [충전] 전용 계약이고 산 버튼은 «+1 / −1» **두 줄기가 정상**
         이다(626 실측 FAIL) · [G7] 은 대조 상대가 «형제(단련 [투자])» 인데 옮기면 **자기 자신과
         비교**해 늘 100% 다 · [G8]·[G9]는 헤더 `.tp-hd`(998×88)와 «`.pv` 오른끝 ↔ 버튼 왼끝» 빈
         칸의 기하인데, 옮기면 밴드가 `0..673` 으로 벌어져 **무엇을 넣어도 통과하는 헛초록**이 된다
         (626 실측) · [G10] 은 그 플로터들의 fs 다. [충전] 시절의 실측·처방은
         `docs/review/491-UI쥬시루프.md` 3~8회차에 그대로 있다. */
  const G_BTN = '#trTemper .tr-tp.k0 .tb', G_HOST = '#trTemper .tr-tp.k0';
  console.log('\n[G] 자멸 렌더 — 누른 손 밑에서 노드가 갈리는가 (단련 [단련] · 626 이관)');
  await front();
  await page.evaluate(() => {
    if(!$('trw').classList.contains('on')) openTrain();
    setTrSub('temper'); S.tstone = 1e6; renderTrain();
    window.__p491g = [];
    const orig = window.renderTrain;
    window.__p491orig = orig;
    window.renderTrain = function(){
      window.__p491g.push({ t: Math.round(performance.now()),
                            dn: !!(typeof jzDown !== 'undefined' && jzDown),
                            hold: !!(typeof rtHold !== 'undefined' && rtHold) });
      return orig.apply(this, arguments);
    };
  });
  await page.waitForTimeout(300);
  const gRect = await page.evaluate(([bs, hs]) => {
    const b = document.querySelector(bs), hd = document.querySelector(hs);
    if(!b || !hd) return null;
    b.dataset.p491g = 'stamp';
    return { b: b.getBoundingClientRect().toJSON(), hd: hd.getBoundingClientRect().toJSON() };
  }, [G_BTN, G_HOST]);
  if (gRect) {
    const gAt = async () => await page.evaluate(bs => {
      const el = document.querySelector(bs);
      const fl = [...document.querySelectorAll('#fxl .fx-plus.hb')].map(n => {
        const r = n.getBoundingClientRect();
        return { t: n.textContent, a: +(+getComputedStyle(n).opacity).toFixed(2),
                 x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
                 /* ⚠ rect 는 «지금 걸린 변형» 을 물고 있다(키프레임 0% 가 scale .9) — 크기 축은
                    변형 밖의 레이아웃 상자(offsetW/H)와 실제 글자 크기로 잰다. 4회차에 rect 로만
                    쟀다가 같은 노드를 20 ↔ 24px 로 두 번 다르게 읽었다. */
                 ow: n.offsetWidth, oh: n.offsetHeight, fs: Math.round(parseFloat(getComputedStyle(n).fontSize)) };
      });
      return { same: !!(el && el.dataset && el.dataset.p491g === 'stamp'),
               dn: !!(el && el.classList.contains('jz-dn')),
               no: !!(el && el.classList.contains('no')),
               bg: el ? getComputedStyle(el).backgroundColor : null, fl };
    }, G_BTN);
    await page.mouse.move(gRect.b.x + gRect.b.width / 2, gRect.b.y + gRect.b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);  const g60  = await gAt();
    await page.waitForTimeout(140); const g200 = await gAt();
    await page.waitForTimeout(200); const g400 = await gAt();
    await page.waitForTimeout(300); const g700 = await gAt();
    await page.mouse.up();
    await page.waitForTimeout(400);                              /* 되튐(200) + 밀린 렌더(210) 뒤 */
    const gAfter = await gAt();
    const calls = await page.evaluate(() => { const a = window.__p491g.slice();
      window.renderTrain = window.__p491orig; return a; });
    for (const [nm, s] of [['60ms', g60], ['200ms', g200], ['400ms', g400], ['700ms', g700], ['뗀 뒤', gAfter]])
      console.log('  · ' + nm.padStart(6) + ' — 같은노드 ' + (s.same ? 'O' : '✗')
        + ' · jz-dn ' + (s.dn ? 'O' : '·') + ' · .no ' + (s.no ? 'O' : '·')
        + ' · ' + s.bg + ' · 플로터 ' + s.fl.filter(n => n.a > 0.08).length + '장');
    console.log('  · renderTrain 호출 ' + JSON.stringify(calls));
    ok(g400.same && g700.same, '[G1] ★ 누른 채 400·700ms 에도 **누른 그 노드**가 살아 있다(자멸 렌더가 안 갈아 끼운다)',
       '400=' + g400.same + ' 700=' + g700.same);
    ok(g400.dn && g700.dn, '[G2] ★ 그 사이 `jz-dn`(눌림)이 유지된다', '400=' + g400.dn + ' 700=' + g700.dn);
    ok(!g400.no && !g700.no, '[G3] 누르는 중에는 «회색(.no)» 이 안 덮인다(3회차 `jzNo` 회귀)',
       '400=' + g400.no + ' 700=' + g700.no);
    ok(calls.filter(c => c.dn).length === 0,
       '[G4] ★ `jzDown` 이 살아 있는 동안 통짜 렌더가 **한 번도** 안 돈다',
       JSON.stringify(calls.map(c => c.dn)));
    ok(calls.some(c => !c.dn), '[G5] 뗀 뒤에는 통짜 렌더가 돈다(정합 확인 · 밀린 것이 사라지지 않는다)',
       calls.length + '회');
    /* ⚑ 626 — 옛 [G6]~[G10](회당 플로터 줄기 수 · 형제 대비 잉크 · 헤더 안 · `.pv` 빈 칸 · fs)은
       [충전] 고유의 재료를 물고 있어 같이 옮기지 않고 걷어냈다 — 근거는 이 절 머리말에 있다.
       플로터 자체의 산 계약은 위 [F1]~[F6](룬 [강화] 한 발)이 이미 지킨다. */
    console.log('  · 60ms 플로터 ' + JSON.stringify(g60.fl.filter(n => n.a > 0.08)
      .map(n => n.t + '@' + n.x + ',' + n.y + ' box ' + n.ow + '×' + n.oh + ' fs' + n.fs)));
    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false); });
    await page.waitForTimeout(200);
  } else ok(false, '[G] 단련 [단련] 버튼/행을 못 찾았다');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  console.log('\nPROBE491 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
