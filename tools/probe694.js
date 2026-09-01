/* 작업 694 재현기 — «verify93 [7] 씬 C 델타 회랑» 이 무엇을 보고 있었나.

   694 등재문은 «verify93 3건 실패(23/26) — 비트 표본이 4 미만» 이었다. 그 3항은 **644 이관**으로
   이미 초록이다(`verify93.js` 352행 «하한 4 → 사양 밴드 3..6»). 지금 빨간 것은 **다른 한 항**이다:
     [7] 델타 플로터 표본 0 — 씬 C 가 안 났다
   338 규칙대로 처방 전에 제품에게 직접 묻는다. 가르는 질문은 둘이다.
     ⓐ 씬 C(훈련 카드 첫 발)가 **정말 안 나는가**, 아니면 **나는데 델타만 없는가**?
     ⓑ `fxDelta` 부품 자체가 죽었는가, 아니면 **훈련에서만** 걷혔는가(660 «숫자 플로터 폐지»)?
   ⓐ 는 «강화가 실제로 일어났나»(지출·버스트 아이콘)로, ⓑ 는 같은 부품을 쓰는 살아 있는
   자리로 묻는다.

   ⚠ 1회차에 **살아 있는 자리를 잘못 골랐다** — 08 세부 팝업 [강화]는 `bindUpHold` 의
      `fx: b => fxUpOk(…, b)` 인데 그 `b` 는 **버튼 노드**(27958 `o.fx(btn)`)라 `fxUpOk` 의
      셋째 인자 `txt` 가 아니다 → 거기서는 델타가 **원래부터** 안 뜬다. 소스 전수(6곳)로 다시 세면
      텍스트를 넘기는 호출부는 **50 코스튬 두 자리뿐**이다(33692·33818 `'Lv. ' + cosLvOf(...)`).
      그래서 양성항의 자리는 코스튬 [강화]다.

   실행: node tools/probe694.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 한 씬을 굴리고 «델타·버스트·상태 변화» 를 같이 걷어 온다.
   ⚠ 델타·버스트는 수명이 짧아 «끝난 뒤 세면» 지워져 있다 — 프레임마다 노드에 도장을 찍어
      **누적 개수**를 센다(666·488 이 쓴 방법). */
async function scene(kind, span) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  await p.evaluate((k) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (k === 'train') { openTrain(); }
    else {
      const a = AVATARS[0].id;
      S.avatars = S.avatars || {}; S.avatars[a] = 1; S.avatar = a;
      goTab('hero'); heroSubGo('cos');
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, kind);
  await p.waitForTimeout(500);
  if (kind !== 'train') {
    await p.evaluate(() => {
      const c = document.querySelector('#bCos [data-cosit]');
      if (c) c.click();
    });
    await p.waitForTimeout(300);
  }

  const data = await p.evaluate(async ({ k, span }) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const host = k === 'train'
      ? (document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card'))
      : document.querySelector('#bCos .sk-card.sel');
    const hostR = host ? rect(host) : null;
    /* «강화가 실제로 일어났나» — 제품 상태에서 직접 읽는다(연출이 아니라 판정) */
    const a0 = k === 'train' ? '' : String(cosLvOf(AVATARS[0].id));
    const g0 = k === 'train' ? S.gold : S.stone;

    if (k === 'train') {
      host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    } else {
      const b = document.querySelector('#bCos [data-cosup]');
      if (b) b.click();
    }

    const seen = { delta: new Set(), cic: new Set(), plus: new Set() };
    const dOff = [];      /* 델타 잉크 중심 − 호스트 좌상단 */
    const t0 = performance.now();
    await new Promise((res) => {
      const tick = () => {
        for (const el of document.querySelectorAll('.fx-delta')) {
          if (el.__p694 === undefined) el.__p694 = (window.__p694n = (window.__p694n || 0) + 1);
          seen.delta.add(el.__p694);
          if (hostR) {
            const r = el.getBoundingClientRect();
            dOff.push({ dx: r.left + r.width / 2 - hostR.x, dy: r.top + r.height / 2 - hostR.y });
          }
        }
        for (const el of document.querySelectorAll('.fx-cic')) {
          if (el.__p694 === undefined) el.__p694 = (window.__p694n = (window.__p694n || 0) + 1);
          seen.cic.add(el.__p694);
        }
        for (const el of document.querySelectorAll('.fx-plus')) {
          if (el.__p694 === undefined) el.__p694 = (window.__p694n = (window.__p694n || 0) + 1);
          seen.plus.add(el.__p694);
        }
        if (performance.now() - t0 >= span) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const a1 = k === 'train' ? '' : String(cosLvOf(AVATARS[0].id));
    return {
      host: !!host, hostR,
      delta: seen.delta.size, cic: seen.cic.size, plus: seen.plus.size,
      dOff, changed: k === 'train' ? (g0 - S.gold) > 0 : a0 !== a1,
      spent: (k === 'train' ? g0 - S.gold : g0 - S.stone),
      cards: document.querySelectorAll('.tr-card').length,
    };
  }, { k: kind, span });

  await b.close();
  return { ...data, errs };
}

(async () => {
  console.log('PROBE694 — «훈련 델타가 사라진 것은 씬이 안 나서인가, 660 이 걷어서인가»\n');

  const T = await scene('train', 1200);
  console.log('[1] 씬 C — 훈련 카드 첫 발');
  console.log(`  · 카드 ${T.cards}개 · 강화 판정 ${T.changed ? '성공' : '없음'} · 지출 ${T.spent}`
    + ` · 델타 ${T.delta}장 · 버스트 아이콘 ${T.cic}알 · fx-plus 계열 ${T.plus}장`);
  ok(T.host && T.cards > 0, `[1-a] 훈련 카드가 실재한다 (${T.cards}개)`);
  ok(T.changed && T.spent > 0, `[1-b] ★ 씬 C 는 **났다** — 강화가 실제로 일어났다(골드 지출 ${T.spent})`);
  ok(T.cic >= 3, `[1-c] ★ 그 자리는 «아이콘 버스트»가 말한다 (${T.cic}알 · 660)`);
  ok(T.delta === 0, `[1-d] ★ 그런데 델타 «+n» 은 0장이다 (${T.delta}) — 660 «숫자 플로터 폐지» 의 직접 결과`);

  const K = await scene('cos', 1200);
  console.log('\n[2] 살아 있는 델타 자리 — 50 코스튬 [강화](`fxUpOk(card, card, \'Lv. \' + cosLvOf(...))`)');
  const dy = K.dOff.map(o => o.dy), dx = K.dOff.map(o => o.dx);
  console.log(`  · 호스트 ${K.hostR ? Math.round(K.hostR.w) + '×' + Math.round(K.hostR.h) : '없음'}`
    + ` · 강화 판정 ${K.changed ? '성공' : '없음'} · 강화석 지출 ${K.spent}`
    + ` · 델타 ${K.delta}장 · 회랑 dy ${dy.length ? Math.min(...dy).toFixed(0) + '~' + Math.max(...dy).toFixed(0) : '—'}`
    + ` · dx ${dx.length ? Math.min(...dx).toFixed(0) + '~' + Math.max(...dx).toFixed(0) : '—'}`);
  ok(K.changed && K.spent > 0, `[2-a] 50 [강화] 가 실제로 레벨을 올린다(전제 · 지출 ${K.spent})`);
  ok(K.delta >= 1, `[2-b] ★ 부품 \`fxDelta\` 는 살아 있다 — 델타 ${K.delta}장`);
  ok(dy.length > 0, `[2-c] 그 델타의 회랑을 잴 표본이 있다 (${dy.length}프레임)`);

  console.log('\n[3] 소스 축 — «누가 델타를 부르는가»');
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  /* ⚠ «호출부» 만 센다 — `fxUpOk` 를 **이야기하는** 주석 줄이 저장소에 여럿이라
     `fxUpOk\(…\)` 로 느슨하게 잡으면 주석이 호출부로 섞여 든다(1회차에 12곳으로 부풀었다).
     실제 호출은 전부 `fxUpOk(…);` 한 문장이다. */
  const calls = [...src.matchAll(/fxUpOk\(([^\n;]*?)\)\s*;/g)].map(m => m[1]);
  const withTxt = calls.filter(a => {
    const p = a.split(',');
    return p.length >= 3 && p[2].trim() !== 'null';
  });
  const trainCalls = calls.filter(a => /bi0\.cur|PAY_CUR\.train/.test(a));
  console.log(`  · fxUpOk 호출부 ${calls.length}곳 · 그중 텍스트를 넘기는 곳 ${withTxt.length}곳`
    + ` [${withTxt.map(a => a.split(',')[2].trim()).join(' · ')}]`);
  ok(withTxt.length >= 1, `[3-a] 델타를 띄우는 호출부가 남아 있다 (${withTxt.length}곳)`);
  ok(trainCalls.length === 2 && trainCalls.every(a => /,\s*null\s*,/.test(a)),
    `[3-b] ★ 훈련 두 자리는 셋째 인자가 **null** 이다 (${trainCalls.length}곳 · 660 주석과 일치)`);

  const e = T.errs.length + K.errs.length;
  ok(e === 0, `[4] 두 씬 콘솔 에러 ${e}건`);

  console.log(`\nPROBE694 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
