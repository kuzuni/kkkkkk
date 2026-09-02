#!/usr/bin/env node
/* 작업 797 재현기 — «배수 바 세 자리 중 둘이 «누른 그 칸» 을 클릭 한복판에 죽인다»
 *
 *   node tools/probe797.js
 *
 * 등재문(PROGRESS 797 · review 701 §5)의 주장은 셋이다:
 *   ⓐ 668·700 의 배수 바(`#sumMulBar` 상점 → 713 이 12 결과 팝업으로 옮김 · `#rwMulBar` 유물)는
 *      렌더마다 `bar.innerHTML = mulBarHTML(...)` 로 칸을 **통째로** 갈아 끼운다 ⇒ 누른 칸이
 *      pointerdown ~ click 사이에 사라진다(터치의 암묵적 포인터 캡처가 끊긴다 —
 *      64 교훈 1 · 262 ⓑ · LESSONS 50-①).
 *   ⓑ 701 이 같은 코드를 베꼈다가 `verify491` [2-a] 에 잡혀 «칸은 처음 한 번만 만들고 그 뒤로는
 *      클래스만 뒤집는다» 로 고쳤다(`renderTrMulBars`) ⇒ 훈련 팝업 두 자리는 **이미 초록**이다.
 *   ⓒ `verify488` [E1]·[E2] 가 «유물 홀드가 여러 번 시도한다» 를 **0회**로 읽는다 —
 *      700 이 `summonRelic` 을 `summonRelicBatch` 로 접으면서 남은 관측점 이관 누락.
 *
 * 이 재현기는 그 셋을 **수리 전 트리에서** 직접 잰다. 처방을 쓰기 전에 무엇이 참인지부터 못박는다
 * (338 규칙 — 등재문의 가설을 그대로 믿고 고치면 «이미 참인 것을 게이트로 굳히는» 일이 난다).
 *
 * 축 넷:
 *   [1] 노드 정체 — 자연스러운 재렌더 한 번 뒤에 **칸 노드가 같은 객체인가**(네 자리 전수)
 *   [2] 누른 채 재렌더 — 누른 그 노드가 살아남고 `jz-dn` 이 유지되는가(491 [2-a] 와 같은 물음)
 *   [3] 값 보존 — 재렌더 뒤에도 «켜진 칸» 이 현재 배수를 가리키는가(수리가 표시를 깨지 않았는지의 대조축)
 *   [4] 488 관측점 — 유물 홀드에서 `summonRelic` 과 `summonRelicBatch` 가 각각 몇 번 불리는가
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = path.join(path.resolve(__dirname, '..'), 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
    S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart();   /* 73 ③ */
  });
  return { ctx, page, errs };
}

/* 네 자리를 «열고 · 한 번 재렌더하고» 를 한 벌로 적어 둔다. `open` 은 그 화면을 띄우고,
   `rerender` 는 그 화면이 **평소에 스스로 부르는** 렌더다(자를 위해 새 경로를 만들지 않는다). */
const SITES = [
  { id: 'sumMulBar', n: '12 결과 팝업(713)',
    open: () => { const B = (typeof gmBan === 'function' && gmBan()) || 'weapon'; doSummon(B, 10); },
    rerender: () => syncSummonBtns(),                 /* 소환 버튼을 누를 때마다 지나는 길 */
    cur: () => sumMul, set: m => { sumMul = m; } },
  { id: 'rwMulBar', n: '89 유물 소환(700)',
    open: () => openRelw(),
    rerender: () => renderRelw(),                     /* 소환·던전 정산이 지나는 길 */
    cur: () => relMul, set: m => { relMul = m; } },
  { id: 'tpMulBar', n: '23 단련(701 · 대조군)',
    open: () => { openTrain(); setTrSub('temper'); renderTrain(); },
    rerender: () => renderTrain(),
    cur: () => trMul, set: m => { trMul = m; } },
  { id: 'rnMulBar', n: '23 룬(701 · 대조군)',
    open: () => { openTrain(); setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); },
    rerender: () => renderTrain(),
    cur: () => trMul, set: m => { trMul = m; } },
];

/* 화면을 처음부터 다시 세운다 — 앞 표본이 남긴 배수·팝업 상태가 다음 표본에 새지 않게(491 [2-a] 교훈) */
async function reset(page) {
  await page.evaluate(() => {
    try { closeSummonResult(); } catch (_) {}
    try { closeRelw(); } catch (_) {}
    try { closeTrain(); } catch (_) {}
    try { closeModal(); } catch (_) {}
    S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
  });
  await page.waitForTimeout(180);
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser);

  /* ── [1] 노드 정체 — 재렌더 한 번 뒤에 칸이 «같은 객체» 인가 ── */
  console.log('[1] 재렌더 한 번 뒤 칸 노드의 정체(네 자리 전수)');
  const idn = {};
  for (const s of SITES) {
    await reset(page);
    const r = await page.evaluate(S2 => {
      const s = eval('(' + S2 + ')');
      s.open();
      const bar = document.getElementById(s.id);
      if (!bar) return { miss: true };
      const before = [...bar.children];
      before.forEach((c, i) => { c.__p797 = i; });      /* 노드에 도장을 찍는다(셀렉터로 되찾으면 새 노드를 같은 것으로 착각한다) */
      const n0 = before.length;
      s.rerender();
      const after = [...bar.children];
      return { miss: false, n0, n1: after.length,
               same: after.length === n0 && after.every((c, i) => c.__p797 === i),
               kept: after.filter(c => c.__p797 !== undefined).length };
    }, `{id:${JSON.stringify(s.id)},open:${s.open},rerender:${s.rerender}}`);
    idn[s.id] = r;
    ok(!r.miss, '[1-' + s.id + '-0] 바가 실재한다 — ' + s.n);
    if (r.miss) continue;
    console.log('    · 칸 ' + r.n0 + ' → ' + r.n1 + ' · 살아남은 노드 ' + r.kept + '/' + r.n0
      + ' · 같은 객체 ' + r.same);
  }
  ok(idn.tpMulBar && idn.tpMulBar.same, '[1-a] ★ 대조군 — 701 의 단련 바는 재렌더 뒤에도 **같은 노드**다',
     idn.tpMulBar ? ('kept ' + idn.tpMulBar.kept + '/' + idn.tpMulBar.n0) : '—');
  ok(idn.rnMulBar && idn.rnMulBar.same, '[1-b] ★ 대조군 — 701 의 룬 바도 같은 노드다',
     idn.rnMulBar ? ('kept ' + idn.rnMulBar.kept + '/' + idn.rnMulBar.n0) : '—');
  ok(idn.sumMulBar && idn.sumMulBar.same,
     '[1-c] ★ 12 결과 팝업 바 — 재렌더 뒤에도 같은 노드인가(수리 전 = 빨강 예상)',
     idn.sumMulBar ? ('kept ' + idn.sumMulBar.kept + '/' + idn.sumMulBar.n0) : '—');
  ok(idn.rwMulBar && idn.rwMulBar.same,
     '[1-d] ★ 89 유물 바 — 재렌더 뒤에도 같은 노드인가(수리 전 = 빨강 예상)',
     idn.rwMulBar ? ('kept ' + idn.rwMulBar.kept + '/' + idn.rwMulBar.n0) : '—');

  /* ── [2] 누른 채 재렌더 — 491 [2-a] 와 같은 물음 ── */
  console.log('[2] 누른 채로 그 화면이 평소에 부르는 재렌더가 돌면, 누른 그 노드가 살아남는가');
  const prs = {};
  for (const s of SITES) {
    await reset(page);
    await page.evaluate(S2 => { eval('(' + S2 + ')').open(); }, `{open:${s.open}}`);
    /* ⚠ 팝업은 등장 애니메이션이 있다 — 열자마자 재면 칸이 아직 제자리에 없어 `elementFromPoint`
       가 칸을 못 잡는다(1회차에 훈련 두 자리가 «칸 잡힘 false» 로 그렇게 났다). 앉을 때까지 기다린다. */
    await page.waitForTimeout(600);
    const b = await page.evaluate(S2 => {
      const s = eval('(' + S2 + ')');
      const bar = document.getElementById(s.id); if (!bar) return null;
      /* 지금 켜져 있지 **않은** 칸을 고른다 — 켜진 칸은 누를 이유가 없어 클릭 핸들러가 바로 반려한다 */
      const c = [...bar.children].find(x => !x.classList.contains('on')) || bar.children[0];
      const r = c.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, `{id:${JSON.stringify(s.id)}}`);
    if (!b) { prs[s.id] = null; continue; }
    /* ⚠ 도장은 **칸 자신**(`[data-mul]`)에 찍는다 — `jzTarget()` 이 돌려주는 쥬시 호스트는 자리마다
       조상일 수 있고(그 조상은 재렌더에도 안 죽는다) 그것을 재면 «살아남았다» 는 헛초록이 난다.
       포인터 캡처를 끊는 것은 **누른 그 칸**이 사라지는 일이므로 축은 칸이어야 한다. */
    await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      window.__h797 = el ? el.closest('[data-mul]') : null;
      window.__j797 = (typeof jzTarget === 'function' && el) ? jzTarget(el) : null;
    }, [b.x, b.y]);
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    /* 누른 채로 그 화면의 평소 렌더를 한 번 태운다(홀드·정산·다른 버튼 누름이 실제로 지나는 길) */
    const r = await page.evaluate(S2 => {
      const s = eval('(' + S2 + ')');
      const h = window.__h797, j = window.__j797;
      const dn0 = !!(j && j.classList.contains('jz-dn'));
      s.rerender();
      return { had: !!h, dn0, jz: j ? (j.dataset && j.dataset.mul ? 'cell' : (j.id || j.className)) : '—',
               alive: !!(h && h.isConnected),
               dn: !!(h && h.isConnected && h.classList.contains('jz-dn')) };
    }, `{rerender:${s.rerender}}`);
    await page.mouse.up();
    await page.waitForTimeout(120);
    prs[s.id] = r;
    console.log('    · ' + s.id + ' — 칸 잡힘 ' + r.had + ' · 쥬시 호스트 ' + r.jz
      + ' · 누름 인식 ' + r.dn0 + ' · 재렌더 뒤 칸 살아있음 ' + r.alive);
  }
  ok(prs.tpMulBar && prs.tpMulBar.had && prs.tpMulBar.alive,
     '[2-a] ★ 대조군 — 단련 바는 누른 채 재렌더에도 **그 칸**이 살아남는다',
     prs.tpMulBar ? ('alive=' + prs.tpMulBar.alive) : '—');
  ok(prs.rnMulBar && prs.rnMulBar.had && prs.rnMulBar.alive,
     '[2-b] ★ 대조군 — 룬 바도 그렇다',
     prs.rnMulBar ? ('alive=' + prs.rnMulBar.alive) : '—');
  ok(prs.sumMulBar && prs.sumMulBar.had && prs.sumMulBar.alive,
     '[2-c] ★ 12 결과 팝업 바 — 누른 그 칸이 살아남는가(수리 전 = 빨강 예상)',
     prs.sumMulBar ? ('alive=' + prs.sumMulBar.alive) : '—');
  ok(prs.rwMulBar && prs.rwMulBar.had && prs.rwMulBar.alive,
     '[2-d] ★ 89 유물 바 — 누른 그 칸이 살아남는가(수리 전 = 빨강 예상)',
     prs.rwMulBar ? ('alive=' + prs.rwMulBar.alive) : '—');

  /* ── [3] 값 보존 — 노드를 살려 두는 처방이 «켜진 칸» 표시를 깨지 않는지의 대조축 ── */
  console.log('[3] 재렌더 뒤에도 «켜진 칸» 이 현재 배수를 가리킨다');
  for (const s of SITES) {
    await reset(page);
    const r = await page.evaluate(S2 => {
      const s = eval('(' + S2 + ')');
      s.open();
      const bar = document.getElementById(s.id); if (!bar) return null;
      const muls = [...bar.children].map(c => +c.dataset.mul);
      const target = muls.find(m => m !== s.cur()) ?? muls[0];
      s.set(target); s.rerender();
      const on = [...bar.children].filter(c => c.classList.contains('on')).map(c => +c.dataset.mul);
      const ink = [...bar.children].map(c => { const i = c.querySelector('i');
        return { m: +c.dataset.mul, ol4: !!(i && i.classList.contains('ol4')), ol3: !!(i && i.classList.contains('ol3')) }; });
      return { target, on, ol4: ink.filter(x => x.ol4).map(x => x.m), ol3n: ink.filter(x => x.ol3).length,
               txt: [...bar.children].map(c => (c.textContent || '').trim()).join(' ') };
    }, `{id:${JSON.stringify(s.id)},open:${s.open},rerender:${s.rerender},cur:${s.cur},set:${s.set}}`);
    if (!r) { ok(false, '[3-' + s.id + '] 바가 없다'); continue; }
    ok(r.on.length === 1 && r.on[0] === r.target && r.ol4.length === 1 && r.ol4[0] === r.target,
       '[3-' + s.id + '] 켜진 칸 하나 = 고른 배수 · 잉크도 ol4 하나',
       '×' + r.target + ' · on=[' + r.on + '] ol4=[' + r.ol4 + '] ol3=' + r.ol3n + ' · "' + r.txt + '"');
  }

  /* ── [4] 488 관측점 — 유물 홀드가 어느 이름을 지나는가 ── */
  console.log('[4] 유물 홀드가 지나는 «1 실행» 함수 이름(verify488 [E1]·[E2] 의 관측점)');
  await reset(page);
  await page.evaluate(() => {
    openRelw();
    window.__c797 = { summonRelic: 0, summonRelicBatch: 0, relicDrawOne: 0, hb: 0 };
    ['summonRelic', 'summonRelicBatch', 'relicDrawOne'].forEach(n => {
      const o = window[n];
      window[n] = function () { const r = o.apply(this, arguments); window.__c797[n]++; return r; };
    });
    const ohb = window.hbBeat;
    window.hbBeat = function () { window.__c797.hb++; return ohb.apply(this, arguments); };
  });
  await page.waitForTimeout(300);
  {
    const b = await page.evaluate(() => { const r = document.getElementById('rwBasin').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.waitForTimeout(2200);      /* verify488 의 HOLD 와 같은 값(그 자와 같은 눈금으로 센다) */
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  const c = await page.evaluate(() => window.__c797);
  console.log('    · summonRelic ' + c.summonRelic + ' · summonRelicBatch ' + c.summonRelicBatch
    + ' · relicDrawOne ' + c.relicDrawOne + ' · hbBeat ' + c.hb);
  ok(c.summonRelicBatch >= 4, '[4-a] ★ 홀드는 `summonRelicBatch` 를 여러 번 지난다(= 진짜 «시도» 축)',
     c.summonRelicBatch + '회');
  ok(c.summonRelic === 0, '[4-b] ★ 그런데 `summonRelic`(488 이 세던 옛 이름)은 **0회**다 — 관측점 이관 누락',
     c.summonRelic + '회');
  ok(c.hb === c.summonRelicBatch, '[4-c] 맥박 수 = `summonRelicBatch` 수(회당 피드백은 멀쩡하다)',
     c.hb + ' / ' + c.summonRelicBatch);
  ok(c.relicDrawOne === c.summonRelicBatch,
     '[4-d] ×1 에서는 «코어 1장 = 실행 1회» 라 두 축이 같다(자를 어느 쪽에 놓아도 ×1 눈금은 같다)',
     c.relicDrawOne + ' / ' + c.summonRelicBatch);

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  await ctx.close(); await browser.close();
  console.log('PROBE797 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
