#!/usr/bin/env node
/* 게이트 — 작업 526 「35/36 패스 리스트 창 가상화」
 *
 *   node tools/verify526.js
 *
 * 493 이 단계를 600 으로 늘리자 트랙이 14,044노드·137,910px 가 되어 팝업 열기가 27 → 303ms 가 됐다
 * (`tools/probe526.js` [1][2] · 상세 `docs/review/493-패스길이확장.md` §3 — DOM 을 안 줄이는 후보 셋은
 *  거기서 이미 «찍힌 픽셀» 로 기각됐다). 526 은 **창 가상화**로 DOM 자체를 줄인다.
 *
 *   [A] 예산 — 열기 중앙값 ≤ 150ms(600행) · 트랙 노드 수 · 창 행 수
 *   [B] 창 — 뷰포트를 덮는다 · **스크롤 전 구간 «빈 행 0»** · 트랙 높이·행 top 은 가상화 전과 같다
 *   [C] 모델 — 창 밖 단계도 `passReadyTab`·`passReadyCnt`·`passClaimAll` 이 **전부** 센다
 *       (창에 24행뿐이어도 일괄 받기는 240칸을 준다 — 여기가 이 작업의 «무르게 풀지 않았다» 증거다)
 *   [D] 깜빡임 0 — 창을 갈아 끼워도 **남는 행은 같은 노드**다(레드닷 등장 애니 `jzDotIn` 재시작 0 · 301/302 규약)
 *   [E] 찍힌 픽셀 — 가상화 on/off 가 같은 그림이다(탭 3 × 스크롤 3, Δ ≤ A/A 잡음)
 *   [R] 되돌림 — `passVirt = false` 로 되돌리면 [A] 가 실제로 빨개지고, 창 갱신을 끊으면 [B] 가 빨개진다
 *
 * [3]-(가) 기계적/기능 검증: 레퍼런스 대조가 아니라 «같은 그림을 더 적은 DOM 으로 그리는가» 라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const OPEN_MS = 150;                                   /* 등재문이 정한 예산 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* 두 PNG 를 페이지 안에서 캔버스로 되돌려 다른 픽셀을 센다(probe493c 선례 — 파일 의존성 0).
   ⚠ 픽셀 배열을 노드로 넘기면 안 된다(1080×2280×4 = 985만 칸) — 비교까지 페이지 안에서 끝낸다. */
async function diffIn(p, bufA, bufB) {
  return await p.evaluate(async ([x, y]) => {
    const load = b64 => new Promise((res, rej) => { const i = new Image();
      i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = 'data:image/png;base64,' + b64; });
    const grab = async b64 => { const im = await load(b64);
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      cv.getContext('2d').drawImage(im, 0, 0);
      return cv.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const a = await grab(x), b = await grab(y);
    if (a.length !== b.length) return -1;
    let n = 0;
    for (let i = 0; i < a.length; i += 4)
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
    return n;
  }, [bufA.toString('base64'), bufB.toString('base64')]);
}

/* 해금·미해금 / 수령·미수령이 한 화면에 같이 나오는 세이브 */
const SETUP = () => {
  S.best = 400; S.att.n = 40; S.tower = 41; S.tower2 = 31;
  S.pass.prem = { stage: 1, att: 1, tower: 1, tower2: 1 };
  S.pass.got = {};
};

(async () => {
  console.log('=== 526 패스 리스트 창 가상화 ===\n');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(SETUP);

  /* ══ [A] 예산 ═════════════════════════════════════════════════════ */
  console.log('[A] 예산 — 열기 ≤ ' + OPEN_MS + 'ms · DOM 이 실제로 줄었다');
  const budget = {};
  for (const t of ['stage', 'att', 'tower', 'tower2']) {
    budget[t] = await p.evaluate(([tab]) => {
      const ms = [];
      for (let r = 0; r < 15; r++) { closePass(); const a = performance.now(); openPass(tab); ms.push(performance.now() - a); }
      ms.sort((x, y) => x - y);
      const tk = document.getElementById('psTk');
      return { med: +ms[7].toFixed(1), nodes: tk.querySelectorAll('*').length,
               rows: tk.querySelectorAll('.ps-r:not(.ps-hr)').length, n: PASS_TABS[tab].n };
    }, [t]);
    const b = budget[t];
    ok(b.med <= OPEN_MS, '[A] ' + t + ' — 열기 중앙값 ' + b.med + 'ms ≤ ' + OPEN_MS,
       '창 ' + b.rows + '행 / ' + b.n + '단계 · 트랙 노드 ' + b.nodes);
  }
  ok(budget.stage.rows < 40 && budget.stage.nodes < 1200,
     '[A] 600행 탭의 DOM 이 «창» 이다 (수리 전 600행 14,044노드)',
     budget.stage.rows + '행 · ' + budget.stage.nodes + '노드');

  /* ══ [B] 창 ═══════════════════════════════════════════════════════ */
  console.log('\n[B] 창 — 뷰포트를 덮는다 · 빈 행 0 · 좌표는 가상화 전과 같다');
  for (const t of ['stage', 'att', 'tower', 'tower2']) {
    const r = await p.evaluate(([tab]) => {
      openPass(tab);
      const L = document.getElementById('psList'), T = PASS_TABS[tab];
      const off = T.head ? 226.5 : 0, max = L.scrollHeight - L.clientHeight;
      let miss = 0, topBad = 0, steps = 0, first = null;
      const probe = document.createElement('div');
      const norm = v => { probe.style.top = v.toFixed(2) + 'px'; return probe.style.top; };
      for (let s = 0; s <= max + 1; s += PASS_RH / 2) {
        const st = Math.min(s, max);
        L.scrollTop = st; passFillRows(); steps++;
        /* 뷰포트에 걸려야 하는 단계 번호는 **좌표로** 계산한다 — DOM 에 안 물어본다 */
        const a = Math.max(0, Math.floor((st - off) / PASS_RH));
        const b = Math.min(T.n - 1, Math.floor((st + L.clientHeight - off - 0.01) / PASS_RH));
        const have = new Map();
        document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').forEach(e => have.set(+e.dataset.pr, e));
        for (let i = a; i <= b; i++) {
          const el = have.get(i);
          if (!el) { miss++; if (!first) first = { st: +st.toFixed(1), i }; continue; }
          /* 가상화가 좌표를 안 건드렸는가 — 행 top 은 여전히 «off + i × pitch» 다.
             ⚠ **허용 오차로 풀지 않는다.** 브라우저가 인라인 길이를 유효숫자 6자리로 되돌려 주기 때문에
             (10343.25px → «10343.2px» · 137679.15px → «137679px») 숫자로 견주면 스테이지 탭 후반에서
             0.5px 까지 벌어진다 — 가상화 전에도 같았다. 그래서 **기대값도 같은 정규화를 태워** 문자열로
             정확히 견준다(오차 0). 1회차에 0.06 허용으로 풀려다 여기서 빨개졌고, 그게 옳았다. */
          if (el.style.top !== norm(off + i * PASS_RH)) topBad++;
        }
      }
      L.scrollTop = 0; passFillRows();
      return { miss, topBad, steps, first,
               trackH: +parseFloat(document.getElementById('psTk').style.height).toFixed(2),
               wantH: +(off + T.n * PASS_RH).toFixed(2) };
    }, [t]);
    ok(r.miss === 0, '[B] ' + t + ' — 스크롤 전 구간 «빈 행 0» (' + r.steps + '자리 표본)',
       r.first ? 'scrollTop ' + r.first.st + ' 에서 행#' + r.first.i + ' 없음' : '0건');
    ok(r.topBad === 0, '[B] ' + t + ' — 행 top = off + i × pitch (좌표 Δ0)', r.topBad + '건 어긋남');
    ok(Math.abs(r.trackH - r.wantH) < 0.5, '[B] ' + t + ' — 트랙 높이가 전 단계를 깐다',
       r.trackH + 'px (기대 ' + r.wantH + ')');
  }

  /* ══ [C] 모델 ═════════════════════════════════════════════════════ */
  console.log('\n[C] 모델 — 창 밖 단계도 전부 센다(레드닷·일괄 받기)');
  const model = await p.evaluate(() => {
    S.pass.got = {}; openPass('stage');
    const T = PASS_TABS.stage;
    let want = 0, cells = 0;
    for (let i = 0; i < T.n; i++) {
      if (!passOpen(i)) break;
      for (let c = 0; c < T.cols; c++) { want += passRw(i, c).n; cells++; }
    }
    const winCells = document.querySelectorAll('#psTk .ps-bx').length;
    const readyCnt = passReadyCnt(), readyTab = passReadyTab('stage'), any = passReadyAny();
    const before = S.dia;
    passClaimAll();
    const gotKeys = Object.keys(S.pass.got).filter(k => k.indexOf('stage:') === 0).length;
    return { cells, winCells, readyCnt, readyTab, any, want, got: S.dia - before, gotKeys,
             afterTab: passReadyTab('stage'), afterCnt: passReadyCnt() };
  });
  ok(model.readyCnt === model.cells && model.readyTab === true && model.any === true,
     '[C] passReadyCnt 가 창(' + model.winCells + '칸)이 아니라 **전 단계**를 센다',
     model.readyCnt + ' = 해금 240칸');
  ok(model.got === model.want && model.gotKeys === model.cells && model.cells > model.winCells,
     '[C] ★ [일괄 받기] 가 창 밖 단계까지 전부 지급한다',
     '다이아 Δ' + model.got + ' (기대 ' + model.want + ') · 세이브 ' + model.gotKeys + '칸 · 창은 ' + model.winCells + '칸뿐');
  ok(model.afterTab === false && model.afterCnt === 0,
     '[C] 전부 받으면 «받을 것 있음» 이 꺼진다(음성 대조)', model.afterCnt + '칸 남음');

  /* ══ [D] 깜빡임 0 ═════════════════════════════════════════════════ */
  console.log('\n[D] 깜빡임 0 — 창을 갈아 끼워도 남는 행은 «같은 노드»');
  const flick = await p.evaluate(() => {
    S.pass.got = {}; openPass('stage');
    const L = document.getElementById('psList');
    L.scrollTop = 20 * PASS_RH; passFillRows();
    const before = new Map();
    document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').forEach(e => before.set(+e.dataset.pr, e));
    /* 애니메이션 시계 — 노드가 다시 만들어지면 `jzDotIn` 이 0 부터 다시 돈다 */
    const dotT = () => { const d = document.querySelector('#psTk .ps-bx.alert>s.updot');
      const a = d && d.getAnimations ? d.getAnimations()[0] : null; return a ? a.currentTime : null; };
    const t0 = dotT();
    L.scrollTop = 22 * PASS_RH; passFillRows();          /* 두 행만큼 민다 = 대부분 살아남아야 한다 */
    const after = new Map();
    document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').forEach(e => after.set(+e.dataset.pr, e));
    let both = 0, same = 0;
    for (const [i, el] of before) if (after.has(i)) { both++; if (after.get(i) === el) same++; }
    const t1 = dotT();
    return { both, same, t0, t1, beforeN: before.size, afterN: after.size };
  });
  ok(flick.both > 15 && flick.same === flick.both,
     '[D] ★ 창이 겹치는 행은 **같은 노드로 살아남는다**(다시 그리면 레드닷이 스크롤 내내 깜빡인다)',
     flick.same + '/' + flick.both + '행 동일 노드 (창 ' + flick.beforeN + ' → ' + flick.afterN + ')');
  ok(flick.t0 !== null && flick.t1 !== null && flick.t1 >= flick.t0,
     '[D] 레드닷 등장 애니 시계가 뒤로 안 간다(= 재시작 0)', flick.t0 + ' → ' + flick.t1);

  /* ══ [E] 찍힌 픽셀 ════════════════════════════════════════════════ */
  console.log('\n[E] 찍힌 픽셀 — 가상화 on/off 가 같은 그림인가(Δ ≤ A/A 잡음)');
  /* ⚠ **전체 화면으로 재면 못 잰다** — 1회차에 여기서 한 번 빨개졌다. 잡음원이 둘이다:
       ⓐ HUD 재화 숫자가 방치 수급으로 계속 오른다(y303 근처 전폭 띠 · 98px)
       ⓑ 레드닷 맥박 `jzDotPulse` 가 2초 주기로 돈다(리스트 안 1.8만px)
     둘 다 526 이 건드리는 것이 아니므로 **리스트만 찍고 애니메이션을 멈춘 채** 잰다.
     멈춤은 양쪽에 똑같이 걸리므로 «같은 그림인가» 라는 질문은 그대로 산다(A/A 잡음이 0 인 것이 그 증거다). */
  await p.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
  const shotList = async () => await (await p.$('#psList')).screenshot();
  for (const tab of ['stage', 'att', 'tower']) {
    for (const st of [0, 1, 2]) {
      const place = async (virt) => await p.evaluate(([t, s, v]) => {
        S.best = 400; S.att.n = 40; S.tower = 41;
        S.pass.prem = { stage: 1, att: 1, tower: 1 };
        S.pass.got = { 'stage:0:0': 1, 'att:0:0': 1, 'tower:0:0': 1 };
        passVirt = v; passTab = t;
        const L = document.getElementById('psList');
        renderPass();
        L.scrollTop = s === 0 ? 0 : (s === 1 ? (L.scrollHeight - L.clientHeight) / 2 : L.scrollHeight);
        passFillRows();
      }, [tab, st, virt]);
      await place(true);  const a0 = await shotList();
      await place(true);  const a1 = await shotList();
      await place(false); const b = await shotList();
      const dom = await p.evaluate(() => document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').length);
      await place(true);
      const d = await diffIn(p, a1, b), noise = await diffIn(p, a0, a1);
      ok(d >= 0 && d <= noise, '[E] ' + tab + ' 스크롤' + st + ' — 다른 픽셀 ' + d + ' ≤ A/A 잡음 ' + noise,
         '가상화 끈 쪽 DOM ' + dom + '행');
    }
  }

  /* ══ [R] 되돌림 ═══════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험');
  const rev = await p.evaluate(() => {
    S.best = 400; S.pass.prem = { stage: 1 };
    /* ① 가상화를 끄면 [A] 가 빨개진다 */
    passVirt = false;
    const ms = [];
    for (let r = 0; r < 9; r++) { closePass(); const a = performance.now(); openPass('stage'); ms.push(performance.now() - a); }
    ms.sort((x, y) => x - y);
    const tk = document.getElementById('psTk');
    const off = { med: +ms[4].toFixed(1), nodes: tk.querySelectorAll('*').length,
                  rows: tk.querySelectorAll('.ps-r:not(.ps-hr)').length };
    passVirt = true; openPass('stage');
    /* ② 창 갱신을 끊으면(스크롤해도 안 채우면) [B] 의 «빈 행 0» 이 빨개진다 */
    const L = document.getElementById('psList');
    L.scrollTop = 300 * PASS_RH;                        /* passFillRows 를 **일부러 안 부른다** */
    const have = new Set([...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')].map(e => +e.dataset.pr));
    let miss = 0;
    for (let i = 300; i <= 305; i++) if (!have.has(i)) miss++;
    passFillRows();
    const fixed = [...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')].map(e => +e.dataset.pr);
    return { off, miss, fixedHas: fixed.includes(300) && fixed.includes(305) };
  });
  ok(rev.off.med > OPEN_MS && rev.off.rows === 600 && rev.off.nodes > 10000,
     '[R] ① passVirt = false 로 되돌리면 [A] 가 빨개진다 — 예산이 공짜가 아니다',
     rev.off.med + 'ms · ' + rev.off.rows + '행 · ' + rev.off.nodes + '노드');
  ok(rev.miss === 6 && rev.fixedHas === true,
     '[R] ② 창 갱신을 끊으면 «빈 행» 이 실제로 생기고, 다시 채우면 사라진다 — [B] 도 공짜가 아니다',
     '끊었을 때 ' + rev.miss + '행 없음 → 채운 뒤 있음 ' + rev.fixedHas);

  ok(errs.length === 0, '콘솔·런타임 에러 0', errs.slice(0, 3).join(' / ') || '없음');

  console.log('\nVERIFY526 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
