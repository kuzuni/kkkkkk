#!/usr/bin/env node
/* 게이트 — 작업 493 「패스 길이 확장」 (저장소 주인 지시 2026-08-31)
 *
 *   node tools/verify493.js
 *
 * 주인 원문: «패스도 지금 보니까 200까지밖에 없고 그러더라 3000까지는 있어야할거같은디 /
 *             출석은 30까지 밖에 없더라 100일까지는 있어야할거같은데 / 탑종류도 패스 100까지 있어야하는데».
 *
 *   [A] 길이 — 탭 4개의 단계 수(600/100/100/100)와 **마지막 단계의 목표**(3000 스테이지 · 100일 · 100레벨).
 *       ⚑ 단계 수만 묻지 않고 «마지막 칸이 가리키는 값» 을 같이 묻는다 — 주인이 말한 것은 600 이 아니라
 *          **3000** 이고, `PASS_STEP` 이 흔들리면 단계 수가 맞아도 3000 이 아니게 된다.
 *   [B] 보상 곡선 — 전 단계 유한·양수·단조 증가 · 표기 7자 이하(`verify398` §1 과 같은 자) · 칸 안쪽 146px 이탈 0
 *   [C] 실동작 — 세 탭의 **마지막 단계**가 실제로 열리고, 받으면 `S.dia` 와 세이브에 남는다
 *   [D] 세이브 이관 **없음** — 40단 시절 구 세이브를 실로드해 `got` 키가 그대로 같은 칸을 가리키는가(KEY 안 올림)
 *   [E] 스크롤 — 600행에서도 `passScroll()` 이 마지막 해금 단계를 두 번째 행에 둔다(측정표 35 §11 규약)
 *   [F] 렌더 예산 — 600행이 «열리기는 하는가» 를 시간·노드로 못박는다(회귀 감지용 상한, 실측은 아래 출력)
 *   [R] 되돌림 시험 — 길이를 40/30/30 으로 되돌린 사본에서 [A]·[C] 가 **실제로 빨개진다**
 *
 * ⚠ **[F] 의 상한은 «좋다» 가 아니라 «10배 회귀를 잡는다» 는 뜻이다.** 실측은 600행에서
 *    열기 중앙값 약 300ms(40행 시절 27ms)이고, 이 비용을 없애는 가상화는 이번 회차에 **못 넣었다** —
 *    후보 둘이 «찍힌 픽셀» 로 기각됐다(`docs/review/493-패스길이확장.md` §3, 후속은 작업 526).
 *
 * [3]-(가) 기계적/기능 검증: 레퍼런스 대조가 아니라 «상수 → 동작» 판정이라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* 주인이 말한 값 — 이 표가 이 자의 전부다(길이는 여기 한 곳에만 적는다) */
const WANT = { stage: { n: 600, last: 3000 }, att: { n: 100, last: 100 },
               tower: { n: 100, last: 100 }, tower2: { n: 100, last: 100 } };

async function boot(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, save]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function');
  await p.waitForTimeout(900);
  return { p, errs, ctx };
}

(async () => {
  console.log('=== 493 패스 길이 확장 (스테이지 3000 · 출석 100일 · 탑 100레벨) ===\n');
  const browser = await launch(chromium);
  const { p, errs } = await boot(browser);

  /* ══ [A] 길이 ═════════════════════════════════════════════════════ */
  console.log('[A] 길이 — 단계 수와 «마지막 단계가 가리키는 값»');
  const len = await p.evaluate(() => {
    const o = { step: PASS_STEP, towerN: PASS_TOWER_N, tabs: {} };
    Object.keys(PASS_TABS).forEach(k => {
      const T = PASS_TABS[k];
      o.tabs[k] = { n: T.n, step: T.step, last: T.n * T.step };
    });
    return o;
  });
  Object.keys(WANT).forEach(k => {
    const t = len.tabs[k], w = WANT[k];
    ok(!!t && t.n === w.n, '[A] ' + k + ' 단계 수 = ' + w.n, t ? String(t.n) : '탭 없음');
    ok(!!t && t.last === w.last, '[A] ' + k + ' 마지막 단계 목표 = ' + w.last,
       t ? t.n + '단계 × step ' + t.step + ' = ' + t.last : '탭 없음');
  });
  ok(len.step === 5, '[A] PASS_STEP 은 5 그대로 (간격을 안 건드렸다 — 주인 원문은 «3000까지» 뿐)', String(len.step));
  ok(len.towerN === 100, '[A] PASS_TOWER_N = 100', String(len.towerN));
  ok(Object.keys(len.tabs).length === 4, '[A] 탭은 4개 그대로(428)', Object.keys(len.tabs).join(','));

  /* ══ [B] 보상 곡선 ════════════════════════════════════════════════ */
  console.log('\n[B] 보상 곡선 — 전 단계 유한·양수·단조 · 표기 7자 이하');
  const cur = await p.evaluate(() => {
    const out = {};
    Object.keys(PASS_TABS).forEach(k => {
      passTab = k;
      const T = PASS_TABS[k];
      let bad = 0, drop = 0, longest = '', prev = -Infinity, max = 0;
      for (let i = 0; i < T.n; i++) for (let c = 0; c < T.cols; c++) {
        const r = passRw(i, c);
        if (!(r.n > 0) || !isFinite(r.n) || r.k !== 'dia') bad++;
        if (c === 0) { if (r.n < prev) drop++; prev = r.n; }
        const s = won(r.n);
        if (s.length > longest.length) longest = s;
        if (r.n > max) max = r.n;
      }
      out[k] = { bad, drop, longest, max };
    });
    passTab = 'stage';
    return out;
  });
  Object.keys(WANT).forEach(k => {
    ok(cur[k].bad === 0, '[B] ' + k + ' — 전 칸이 유한·양수·다이아(398)', cur[k].bad + '건 이상');
    ok(cur[k].drop === 0, '[B] ' + k + ' — 무료 칸 수량이 단조 비감소', cur[k].drop + '건 역전');
    ok(cur[k].longest.length <= 7, '[B] ' + k + ' — 최장 표기 ≤ 7자 (verify398 §1 규약)',
       '«' + cur[k].longest + '» ' + cur[k].longest.length + '자 · 최대 ' + cur[k].max);
  });
  /* 표기가 칸 안쪽(146px)을 안 넘는가 — 실제로 그려서 잰다(자릿수만으로는 못 잰다) */
  const ink = await p.evaluate(() => {
    S.best = 3000; S.pass.prem = { stage: 1 }; openPass('stage');
    let w = 0, over = 0, worst = '';
    document.querySelectorAll('#psTk .ps-bx>b>em').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width > 146) over++;
      if (r.width > w) { w = r.width; worst = e.textContent; }
    });
    return { w: +w.toFixed(1), over, worst };
  });
  ok(ink.over === 0, '[B] 그려진 수량 잉크가 칸 안쪽 146px 을 안 넘는다',
     '최대 ' + ink.w + 'px («' + ink.worst + '») · 초과 ' + ink.over + '칸');

  /* ══ [C] 실동작 — 마지막 단계 ═════════════════════════════════════ */
  console.log('\n[C] 실동작 — 세 탭의 마지막 단계가 열리고 받으면 남는다');
  for (const [tab, setup] of [['stage', 'S.best = 3000'], ['att', 'S.att.n = 100'], ['tower', 'S.tower = 101']]) {
    const r = await p.evaluate(([t, code]) => {
      S.pass.got = {}; S.pass.prem = {};
      eval(code);
      openPass(t);
      const T = PASS_TABS[t], i = T.n - 1;
      const openLast = passOpen(i), tier = passTier(i);
      const before = S.dia;
      const want = passRw(i, 0).n;
      passClaim(i, 0);
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || 'null'); } catch (e) {}
      return { openLast, tier, got: S.dia - before, want,
               savedKey: saved && saved.pass && !!saved.pass.got[t + ':' + i + ':0'],
               hexOpen: !document.querySelectorAll('#psTk .ps-hex')[i].classList.contains('lk') };
    }, [tab, setup]);
    ok(r.openLast === true && r.hexOpen === true,
       '[C] ' + tab + ' — 마지막 단계(목표 ' + r.tier + ')가 실제로 해금된다', 'hex ' + (r.hexOpen ? '열림' : '잠김'));
    ok(r.got === r.want && r.want > 0,
       '[C] ' + tab + ' — 그 칸을 받으면 다이아 +' + r.want + ' 가 실제로 들어온다', 'Δ ' + r.got);
    ok(r.savedKey === true, '[C] ' + tab + ' — 수령이 세이브에 남는다 (' + tab + ':' + (WANT[tab].n - 1) + ':0)');
  }

  /* ══ [D] 세이브 이관 «없음» ═══════════════════════════════════════ */
  console.log('\n[D] 세이브 이관 없음 — 40단 시절 세이브를 실로드');
  ok(/idle_hunter_save_v4/.test(SRC) && !/idle_hunter_save_v5/.test(SRC),
     '[D] KEY 를 안 올렸다 (단계가 늘어도 «탭:단계:칸» 키가 그대로 가리킨다)');
  const oldSave = JSON.stringify({ gold: 5000, dia: 100, best: 200, tower: 31, tower2: 1,
    att: { n: 30, date: '' },
    pass: { got: { 'stage:0:0': 1, 'stage:39:0': 1, 'att:29:0': 1, 'tower:29:0': 1 }, prem: { stage: 1 } } });
  const b2 = await boot(browser, oldSave);
  const mig = await b2.p.evaluate(() => {
    openPass('stage');
    const cell = i => document.querySelectorAll('#psTk .ps-r')[i].querySelector('.ps-bx.c0');
    const r = { keys: Object.keys(S.pass.got).sort().join(','),
                got39: cell(39).classList.contains('dn'), got0: cell(0).classList.contains('dn'),
                got40: cell(40).classList.contains('dn'),
                rows: document.querySelectorAll('#psTk .ps-r').length,
                readyStage: passReadyTab('stage') };
    openPass('att');
    r.att29 = document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')[29].querySelector('.ps-bx.c0').classList.contains('dn');
    openPass('tower');
    r.tw29 = document.querySelectorAll('#psTk .ps-r')[29].querySelector('.ps-bx.c0').classList.contains('dn');
    return r;
  });
  ok(mig.keys === 'att:29:0,stage:0:0,stage:39:0,tower:29:0', '[D] 구 키가 한 자도 안 바뀐다', mig.keys);
  ok(mig.got0 && mig.got39 && mig.att29 && mig.tw29,
     '[D] 구 세이브가 받아 둔 칸이 **같은 칸**으로 그대로 표시된다(수령완료)',
     'stage0 ' + mig.got0 + ' · stage39 ' + mig.got39 + ' · att29 ' + mig.att29 + ' · tower29 ' + mig.tw29);
  ok(mig.got40 === false, '[D] 새로 생긴 단계(40)는 «안 받은» 상태다 — 옛 키가 새 칸으로 새지 않는다');
  ok(mig.rows === 600, '[D] 구 세이브에서도 리스트는 새 길이로 선다', String(mig.rows));
  ok(mig.readyStage === true, '[D] 늘어난 구간이 «받을 것 있음»(301)으로 잡힌다 — best 200 이라 40단계까지 열렸다');

  /* ══ [E] 스크롤 ═══════════════════════════════════════════════════ */
  console.log('\n[E] 스크롤 — 마지막 해금 단계를 두 번째 행에(측정표 35 §11)');
  const sc = await b2.p.evaluate(() => {
    S.best = 1500; openPass('stage'); passScroll();
    const L = document.getElementById('psList'), last = passLast();
    return { last, top: +L.scrollTop.toFixed(2), want: +((last - 1) * 229.85).toFixed(2),
             maxScroll: +(L.scrollHeight - L.clientHeight).toFixed(0) };
  });
  ok(sc.last === 299, '[E] S.best 1500 → 마지막 해금 단계 #299 (목표 1500)', String(sc.last));
  ok(Math.abs(sc.top - sc.want) < 1, '[E] 그 단계가 두 번째 행에 온다', sc.top + ' vs ' + sc.want);
  ok(sc.top < sc.maxScroll, '[E] 그 자리가 스크롤 끝이 아니다 — 아래로 더 남아 있다(600행)',
     sc.top + ' / ' + sc.maxScroll);

  /* ══ [F] 렌더 예산 ════════════════════════════════════════════════ */
  console.log('\n[F] 렌더 예산 — 600행이 열린다(회귀 감지 상한)');
  const perf = await b2.p.evaluate(() => {
    const a = [];
    for (let i = 0; i < 9; i++) { closePass(); const t = performance.now(); openPass('stage'); a.push(performance.now() - t); }
    a.sort((x, y) => x - y);
    const tk = document.getElementById('psTk');
    return { med: +a[4].toFixed(1), nodes: tk.querySelectorAll('*').length,
             rows: tk.querySelectorAll('.ps-r').length };
  });
  const perRow = perf.nodes / perf.rows;
  ok(perf.med < 1200, '[F] 열기 중앙값 < 1200ms (10배 회귀 감지선 — 실측 ' + perf.med + 'ms)', perf.med + 'ms');
  ok(perRow < 30, '[F] 행당 노드 < 30 (마크업이 더 무거워지면 여기서 잡힌다)',
     perRow.toFixed(1) + ' = ' + perf.nodes + ' / ' + perf.rows);

  /* ══ [R] 되돌림 시험 ══════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험 — 길이를 40/30/30 으로 되돌린 사본');
  const rev = await b2.p.evaluate(() => {
    PASS_TABS.stage.n = 40; PASS_TABS.att.n = 30;
    PASS_TABS.tower.n = 30; PASS_TABS.tower2.n = 30;
    S.best = 3000; openPass('stage');
    const T = PASS_TABS.stage;
    const r = { last: T.n * T.step, rows: document.querySelectorAll('#psTk .ps-r').length };
    /* 되돌린 사본에서 «3000 단계» 는 아예 없다 */
    r.has3000 = [...document.querySelectorAll('#psTk .ps-hex i b')].some(e => e.textContent === '3000');
    PASS_TABS.stage.n = 600; PASS_TABS.att.n = 100;
    PASS_TABS.tower.n = 100; PASS_TABS.tower2.n = 100;
    openPass('stage');
    r.has3000after = [...document.querySelectorAll('#psTk .ps-hex i b')].some(e => e.textContent === '3000');
    return r;
  });
  ok(rev.last === 200 && rev.rows === 40, '[R] 되돌린 사본은 [A] 가 빨개진다 (마지막 목표 200 · 40행)',
     rev.last + ' / ' + rev.rows + '행');
  ok(rev.has3000 === false && rev.has3000after === true,
     '[R] «3000» 육각은 되돌리면 사라지고 원복하면 돌아온다 — [A]·[C] 는 공짜가 아니다',
     '되돌림 ' + rev.has3000 + ' → 원복 ' + rev.has3000after);

  ok(errs.length === 0 && b2.errs.length === 0, '콘솔·런타임 에러 0',
     (errs[0] || b2.errs[0] || '없음'));

  await browser.close();
  console.log('\nVERIFY493 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
