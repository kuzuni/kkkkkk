#!/usr/bin/env node
/* 작업 630 재현 프로브 — `verify488` [J3] «진행 >200ms 표본 0개» 의 갈래를 가른다 (2026-09-01)
 *
 *   node tools/probe630.js
 *
 * 등재문(PROGRESS 630)의 세 갈래를 **살아 있는 홀드**에서 직접 잰다:
 *   ⓐ 제품 결함  — 노드가 실제로 수명 뒤쪽(>200ms)까지 못 산다(페이드아웃이 잘린다)
 *   ⓑ 자의 결함  — 노드는 끝까지 사는데 [J3] 의 스냅숏 4장이 위상에 물려 그 구간을 못 본다
 *   ⓒ 축 잔재    — 574 가 [J4] 를 위상 훑기로 옮길 때 [J3] 만 옛 «표본» 축에 남았다(ⓑ 의 기록 축)
 *
 * 재는 것 셋:
 *   [1] 노드별 실제 수명 — MutationObserver 로 «붙는 순간 / 떨어지는 순간» 을 직접 기록한다.
 *       스냅숏과 무관한 축이라 위상이 안 낀다. 수명 중앙값 ≈ HB_LIFE(310)+PAD 면 ⓐ 기각.
 *   [2] 게이트와 같은 스냅숏(900/1500/2100/2700ms) 의 ct 분포 — 게이트가 보는 그림 그대로.
 *   [3] 조밀 스냅숏(83ms 간격, 위상이 태어남 주기와 어긋나게) 의 ct 분포 — 같은 홀드에서
 *       «>200ms 구간이 실재하는가» 를 위상을 훑어 확인한다. [1]에서 살고 [3]에서 보이는데
 *       [2]에서만 0 이면 ⓑ 확정.
 * 홀드는 **판을 둘**로 돈다(LESSONS 627-② — 판을 새로 시작하면 위상차가 새로 뽑힌다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install } = require('./closers540');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await install(p, { arm: true });
  const cdp = await ctx.newCDPSession(p);

  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    runeRate = () => 1;
    try { closeModal(); closeRelw(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    /* [1] 수명 축 — 붙고/떨어지는 순간을 노드 단위로 기록(스냅숏 무관) */
    window.__L630 = [];
    const L = document.getElementById('fxl');
    const tag = new WeakMap(); let seq = 0;
    new MutationObserver(recs => {
      const now = performance.now();
      for (const r of recs) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1 || !/\bfx-plus\b/.test(n.className) || !/\bhb\b/.test(n.className)) continue;
          const id = ++seq; tag.set(n, id);
          window.__L630.push({ id, lng: /\blng\b/.test(n.className), dn: /\bdn\b/.test(n.className), born: now, died: null });
        }
        for (const n of r.removedNodes) {
          if (n.nodeType !== 1 || !tag.has(n)) continue;
          const row = window.__L630.find(x => x.id === tag.get(n));
          if (row && row.died == null) row.died = now;
        }
      }
    }).observe(L, { childList: true });
    /* 게이트와 같은 born 스탬프(ct 대조용) */
    const of = window.hbFloat;
    window.hbFloat = function () { const r = of.apply(this, arguments);
      const n = L.lastElementChild;
      if (n && /fx-plus/.test(n.className || '')) n.dataset.born = Math.round(performance.now());
      return r; };
  });
  await p.waitForTimeout(450);

  const snap = () => p.evaluate(() => {
    const now = performance.now();
    return [...document.querySelectorAll('#fxl .fx-plus.hb')].map(n => {
      const a = n.getAnimations()[0];
      return { lng: /\blng\b/.test(n.className), age: Math.round(now - (+n.dataset.born || now)),
               ct: a ? Math.round(a.currentTime || 0) : -1 };
    });
  });

  const rounds = [];
  for (let round = 0; round < 2; round++) {
    const c = await p.evaluate(() => {
      const el = document.querySelector('#trRunes .tr-rn[data-rune="r1"] .rbt.b1');
      const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    const gate = [], dense = [];
    const gateT = [900, 1500, 2100, 2700];                    /* [2] 게이트 그대로 */
    const denseT = []; for (let t = 700; t <= 2700; t += 83) denseT.push(t);  /* [3] 83ms — 600 의 약수가 아니다 */
    const all = [...new Set([...gateT, ...denseT])].sort((a, b) => a - b);
    for (const t of all) {
      while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 3));
      const rows = await snap();
      if (gateT.includes(t)) gate.push(...rows);
      dense.push(...rows);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    /* 꼬리 — 홀드가 끝나 새 스폰이 멎으면 마지막 노드들이 «온 수명» 을 산다. 여기가 상한 2 설계에서
       페이드아웃이 끝까지 도는 자리다. 40ms 폴링으로 죽을 때까지 ct 를 계속 읽는다(위상 무관). */
    const tail = [];
    for (let k = 0; k < 20; k++) {
      await p.waitForTimeout(40);
      const rows = await snap();
      tail.push(...rows.filter(r => !r.lng));
      if (!rows.length) break;
    }
    await p.waitForTimeout(300);
    rounds.push({ gate, dense, tail });
  }

  const lives = await p.evaluate(() => window.__L630);
  const hb = lives.filter(x => !x.lng && x.died != null).map(x => Math.round(x.died - x.born)).sort((a, b) => a - b);
  const lng = lives.filter(x => x.lng && x.died != null).map(x => Math.round(x.died - x.born)).sort((a, b) => a - b);
  const med = a => a.length ? a[Math.floor(a.length / 2)] : NaN;
  /* 줄기(결과 res / 비용 pay)별로 갈라 잰다 — 두 줄기가 한 beat 에 같이 태어나 전체 간격은 0 이 절반이다 */
  const perStream = (dn) => {
    const rows = lives.filter(x => !x.lng && x.dn === dn);
    const b = rows.map(x => x.born).sort((a, c) => a - c);
    const g = b.slice(1).map((v, i) => Math.round(v - b[i])).filter(v => v > 0 && v < 500).sort((a, c) => a - c);
    /* 동시 생존 최대 — 탄생·사망 이벤트 스위프 */
    const ev = [];
    for (const x of rows) { ev.push([x.born, 1]); if (x.died != null) ev.push([x.died, -1]); }
    ev.sort((a, c) => a[0] - c[0] || a[1] - c[1]);
    let cur = 0, mx = 0; for (const [, d] of ev) { cur += d; if (cur > mx) mx = cur; }
    return { gapMed: med(g), maxLive: mx, n: rows.length };
  };
  const res = perStream(false), pay = perStream(true);

  console.log('[1] 실제 수명(붙음→떨어짐 · 스냅숏 무관 축)');
  console.log('  · 반복분 .hb  n=' + hb.length + ' · 중앙 ' + med(hb) + 'ms · 최소 ' + hb[0] + ' · 최대 ' + hb[hb.length - 1] + '  (설계 HB_LIFE 310 + PAD)');
  console.log('  · 한 발 .lng n=' + lng.length + ' · 중앙 ' + med(lng) + 'ms  (설계 1300 + PAD)');
  console.log('  · 줄기별 — 결과: 간격 중앙 ' + res.gapMed + 'ms · 동시 생존 최대 ' + res.maxLive + '  |  비용: 간격 중앙 ' + pay.gapMed + 'ms · 동시 생존 최대 ' + pay.maxLive);
  const aLive = med(hb) >= 280;
  const capCut = !aLive && res.maxLive <= 2 && pay.maxLive <= 2 && med(hb) <= 2.5 * Math.max(res.gapMed, pay.gapMed);
  console.log('  ⇒ 갈래 ⓐ(수명이 잘린다)는 ' + (aLive ? '**기각** — 노드는 설계 수명을 산다' : '**확정** — 수명이 ' + med(hb) + 'ms 로 잘린다'));
  if (capCut) console.log('  ⇒ 자른 손은 **619 8회차 «줄기당 동시 생존 상한 2»** 다 — 동시 생존이 정확히 ≤2 이고 수명 ≈ 태어남 간격 ×2 (fxBye 가 아니라 3장째 스폰의 `q.shift()`)');

  for (let i = 0; i < rounds.length; i++) {
    const { gate, dense, tail } = rounds[i];
    const g200 = gate.filter(r => r.ct > 200).length, d200 = dense.filter(r => r.ct > 200).length;
    const t200 = tail.filter(r => r.ct > 200).length;
    const cts = a => { if (!a.length) return '—'; const s = a.map(r => r.ct).sort((x, y) => x - y); return s[0] + '..' + s[s.length - 1]; };
    console.log('[2/3] 판 ' + (i + 1) + ' — 게이트 스냅숏(4장): 표본 ' + gate.length + ' · ct>200 ' + g200 + '개 · ct 범위 ' + cts(gate));
    console.log('        조밀 스냅숏(83ms): 표본 ' + dense.length + ' · ct>200 ' + d200 + '개 · ct 범위 ' + cts(dense));
    console.log('        홀드 끝 꼬리(40ms): 표본 ' + tail.length + ' · ct>200 ' + t200 + '개 · ct 범위 ' + cts(tail) + '  ← 상한 2 설계에서 페이드가 끝까지 도는 자리');
  }
  const gAll = rounds.reduce((s, r) => s + r.gate.filter(x => x.ct > 200).length, 0);
  const dAll = rounds.reduce((s, r) => s + r.dense.filter(x => x.ct > 200).length, 0);
  const tAll = rounds.reduce((s, r) => s + r.tail.filter(x => x.ct > 200).length, 0);
  console.log('⇒ 갈래 판정: 수명 정상(' + (aLive ? 'O' : 'X') + ') · 게이트 축 ct>200 ' + gAll + '개 · 조밀 축 ' + dAll + '개 · 꼬리 축 ' + tAll + '개');
  if (!aLive && capCut) console.log('   = [J3] 을 뒤집은 것은 결함이 아니라 **[J3] 보다 뒤에 들어온 설계**(619 8회차 상한 2 — LESSONS 627-③ 꼴)다.\n' +
    '     홀드 «중» 은 ct>200 이 위상 운에 걸리고(게이트 축 ' + gAll + '개 = 플레이키의 정체), 페이드아웃이 확실히 보이는 자리는 **홀드 끝**(꼬리 축 ' + tAll + '개)이다.\n' +
    '     ⇒ [J3] 은 «홀드 끝에서 끝까지 돈다» 로 갈아 끼우고, «홀드 중 줄기당 ≤2» 를 [J3b] 래칫으로 옆에 세운다(627-④).');
  else if (aLive && dAll > 0) console.log('   = ⓑ **자의 표본 축이 위상에 물렸다** (제품은 무죄 · [J3] 을 갈아 끼울 것)');
  else console.log('   = 갈래 재검 필요');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
