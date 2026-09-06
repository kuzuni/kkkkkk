/* 작업 993 재현기 — `tools/verify795.js` 가 «부하» 에서 «측정 0» 으로 빨개지는 이유를 손잡이로 잡는다
 *
 *   node tools/probe993.js                 (기본 — 무부하 대조 + 지연 사다리)
 *   node tools/probe993.js --stall 600     (한 지연만)
 *   node tools/probe993.js --load 4        (진짜 CPU 경쟁 — 자식 프로세스 n개로 코어를 태운다)
 *
 * **가설(등재문 993)**: 셋 다 «단언이 어긋난 것» 이 아니라 **잴 것이 없었던 것**이다 —
 *   ⓐ `[B2] flash idx -1` · ⓑ `[H1] 측정 실패` + `[H1b] 그릇 null` · ⓒ `[R1] 패치 0장 · 플래시 0장`.
 *
 * **이 자가 묻는 것은 «누가 노드를 걷는가» 하나다.** 제품은 연출 노드를 **벽시계 타이머**로 걷는다
 * (`fxBye` = `setTimeout(remove, fxAnimEnd(el) || life + FXBYE_PAD)`). 그런데 `verify795` 는
 * **FIRE 와 READ 를 서로 다른 `page.evaluate`** 로 나눠 부르고 그 사이에 `waitForTimeout(80)` 을 둔다 —
 * 즉 **읽는 시각이 노드 밖(Node 쪽 왕복 지연)에 달려 있다.** 부하가 걸려 왕복이 늘면 읽기가 수명 밖으로
 * 밀리고, 그때 나오는 얼굴이 정확히 위 셋이다(수명은 [1] 이 **폴링으로 잰다** — 상수로 적지 않는다):
 *
 *      경과 t < 플래시 수명   → 플래시·패치 둘 다 산다   (초록 — 무부하에서 늘 이 자리)
 *    플래시 ≤ t < 패치 수명   → 플래시만 죽는다          ⓐ `flash idx -1 < keep idx 0`
 *      t ≥ 패치 수명         → 둘 다 죽는다             ⓑ·ⓒ `측정 실패` · `그릇 null` · `0장 · 0장`
 *
 * ⚠ **수명은 «계산» 하면 틀린다** — 1회차가 `fxAnimEnd` 를 나중에 다시 불러 120ms 를 얻었는데
 *   실제 타이머는 생성 시각의 값(실측 ~290ms)이었다. 세워 둔 애니의 `activeDuration` 은 다른 수다.
 *
 * ⚠ **애니메이션을 세워도(`a.pause()`) 안 막힌다** — `fxBye` 는 애니가 아니라 `setTimeout` 이다.
 *   `verify795` 의 FIRE 가 애니를 세우는 것은 [C1] 의 «읽는 순간» 문제(344)를 막으려던 것이고,
 *   이번 것은 **다른 축**(노드가 아예 없어진다)이다.
 *
 * 즉 **제품이 아니라 자의 결함**이다(344 «플레이키는 제품이 아니라 자의 것일 수 있다»).
 * 990 의 변경과도 무관함을 [3] 이 같은 트리에서 못박는다.
 *
 * 종료 코드 — 0 재현 성공(세 얼굴을 다 찍었다) · 1 재현 실패 · 3 못 쟀다(939 규약).
 */
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;

const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d; };
const STALL = argOf('--stall', null);
const LOAD = argOf('--load', 0);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const r2 = v => Math.round(v * 100) / 100;

/* verify795 의 FIRE 와 **같은 경로**를 부른다(스텁 금지 — 자가 자기 사본을 재면 안 된다). */
const FIRE = () => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  const it = RELICS.filter(r => r.id === 'rl0')[0]; if (!it) return null;
  rwSummonFx(it, true, null);
  try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = 20; } catch (_) {} }); } catch (_) {}
  const L2 = document.getElementById('fxl');
  return { t0: performance.now(),
           flash: L2.querySelectorAll('.fx-flash').length,
           keep: L2.querySelectorAll('.fx-keep').length };
};

/* verify795 의 READ 가 보는 것과 **같은 세 축**만 뽑는다(ⓐⓑⓒ 의 얼굴). */
const READ = () => {
  const L = document.getElementById('fxl');
  const kids = Array.prototype.slice.call(L.children);
  const keeps = kids.filter(n => n.classList && n.classList.contains('fx-keep'));
  const kLab = keeps.filter(n => n.querySelector && n.querySelector('u'));
  const flash = kids.filter(n => n.classList && n.classList.contains('fx-flash'));
  return { t1: performance.now(),
           nFlash: flash.length, nLab: kLab.length,
           flashIdx: flash.length ? kids.indexOf(flash[0]) : -1,
           keepIdx: kLab.length ? kids.indexOf(kLab[0]) : -1,
           keepZ: kLab.length ? getComputedStyle(kLab[0]).zIndex : null,
           csPatch: kLab.length ? !!kLab[0].querySelector('u') : null };
};

/* 얼굴 판정 — 등재문 993 의 ⓐⓑⓒ 를 그대로 적는다. */
const face = r => {
  if (!r) return 'x 못 읽음';
  if (r.nFlash === 1 && r.nLab === 1) return '초록 (플래시 1 · 패치 1)';
  if (r.nFlash === 0 && r.nLab === 1) return 'ⓐ [B2] flash idx ' + r.flashIdx + ' < keep idx ' + r.keepIdx;
  if (r.nFlash === 0 && r.nLab === 0) return 'ⓑⓒ [H1] 측정 실패 · [H1b] 그릇 ' + r.keepZ + ' · [R1] 패치 0장 · 플래시 0장';
  return '기타 (플래시 ' + r.nFlash + ' · 패치 ' + r.nLab + ')';
};

/* 진짜 CPU 경쟁 — 990 회차가 관측한 «다른 브라우저가 같이 도는» 상황의 대역이다. */
const burners = [];
const loadOn = n => { for (let i = 0; i < n; i++) burners.push(spawn(process.execPath,
  ['-e', 'const t=Date.now();while(Date.now()-t<60000){Math.sqrt(Math.random()*1e9)}'], { stdio: 'ignore' })); };
const loadOff = () => { for (const b of burners) { try { b.kill('SIGKILL'); } catch (_) {} } burners.length = 0; };

(async () => {
  console.log('=== probe993 — verify795 의 «측정 0» 은 왕복 지연이 노드 수명을 넘긴 것이다 ===');
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await p.evaluate(() => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  const own = await p.evaluate(() => {
    for (let i = 0; i < 4000 && !(has('rl0') && has('rl1')); i++) summonRelic(true);
    renderRelw(); return { a: has('rl0'), b: has('rl1') };
  });
  if (!own || !own.a) { console.error('probe993: 대상 칸을 못 세웠다 — 잴 수 없다'); await browser.close(); process.exit(3); }

  blk('1] 수명 — 노드를 걷는 것은 애니가 아니라 **벽시계 타이머**(`fxBye`)다');
  /* ⚠ 계산하지 말고 **잰다** — `fxAnimEnd` 를 나중에 다시 부르면 세워 둔 애니의 값이 나와
     («120ms») 실제 타이머(생성 시각에 걸린 값)와 어긋난다. 그래서 폴링으로 사라지는 순간을 본다. */
  const life = await p.evaluate(() => new Promise(res => {
    const L = document.getElementById('fxl'); while (L.firstChild) L.removeChild(L.firstChild);
    rwSummonFx(RELICS.filter(r => r.id === 'rl0')[0], true, null);
    try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = 20; } catch (_) {} }); } catch (_) {}
    const t0 = performance.now(); let dFlash = null, dKeep = null;
    const tick = () => {
      const nf = L.querySelectorAll('.fx-flash').length, nk = L.querySelectorAll('.fx-keep').length;
      if (nf === 0 && dFlash === null) dFlash = performance.now() - t0;
      if (nk === 0 && dKeep === null) dKeep = performance.now() - t0;
      if ((dFlash !== null && dKeep !== null) || performance.now() - t0 > 2000) return res({ dFlash, dKeep });
      setTimeout(tick, 8);
    };
    tick();
  }));
  ok(!!life && life.dFlash > 0 && life.dKeep > 0,
     '1-a 애니를 **세워 둔 채로도** 플래시·패치가 스스로 사라진다 — 걷는 것은 애니가 아니라 `fxBye` 의 `setTimeout` 이다',
     life ? ('플래시 ' + r2(life.dFlash) + 'ms · 패치 ' + r2(life.dKeep) + 'ms 에 사라짐 (선언값 `fxAnimEnd`+`FXBYE_PAD`)') : '측정 실패');
  const LIFE_F = life && life.dFlash ? life.dFlash : 364, LIFE_K = life && life.dKeep ? life.dKeep : 524;

  blk('2] 지연 사다리 — 읽는 시각만 밀면 등재문의 세 얼굴이 **순서대로** 나온다');
  /* 사다리는 **잰 수명** 둘레로 세운다 — ⓐ 는 «플래시는 죽고 패치는 아직» 인 좁은 창이라
     고정 눈금(0·200·400…)으로는 건너뛴다(1회차에 실제로 건너뛰었다). */
  const ladder = STALL !== null ? [STALL]
    : [0, Math.round(LIFE_F * 0.5), Math.round(LIFE_F + 8), Math.round(LIFE_F + 24),
       Math.round((LIFE_F + LIFE_K) / 2), Math.round(LIFE_K + 60), 900];
  const seen = {};
  for (const ms of ladder) {
    await p.evaluate(FIRE);
    await p.waitForTimeout(ms);
    const r = await p.evaluate(READ);
    const f = face(r);
    seen[f.slice(0, 1)] = true;
    if (f[0] === 'ⓐ') seen['a'] = true; else if (f[0] === 'ⓑ') seen['b'] = true; else if (f[0] === '초') seen['g'] = true;
    console.log('  ·  지연 ' + String(ms).padStart(4) + 'ms → ' + f);
  }
  if (STALL === null) {
    ok(seen['g'], '2-a 지연 0 에서는 초록 — 무부하 순차 실행이 10판 10PASS 인 이유(등재문 실측)');
    ok(seen['a'] || seen['b'],
       '2-b ★ 지연이 수명(' + r2(LIFE_F) + 'ms)을 넘으면 «잴 것이 없는» 얼굴이 나온다 — 이것이 재현이다',
       (seen['a'] ? 'ⓐ ' : '') + (seen['b'] ? 'ⓑⓒ' : ''));
    ok(seen['b'], '2-c 지연이 패치 수명(' + r2(LIFE_K) + 'ms)까지 넘으면 **ⓑⓒ** 가 나온다 — `측정 실패` · `그릇 null` · `0장·0장`');
    /* ⚠ ⓐ(«플래시만 죽었다»)는 **불변식이 아니라 좁은 창**이다 — 패치는 플래시가 사라진 다음 rAF 에
       스스로 걷히므로 두 수명이 이 트리에서 거의 겹친다(실측 차 0~30ms). 사다리가 그 프레임에
       떨어져야 보이므로 «못 봤다» 를 빨강으로 세지 않는다(현장 990 회차는 이 얼굴을 봤다). */
    info('ⓐ(플래시만 죽은 좁은 창)를 이번 판에 봤나', seen['a'] ? '봤다' : '이번 판에는 안 떨어졌다 — 창이 한 프레임이라 정상이다');
  }

  blk('3] 제품이 아니라 **자**의 것이다 — 같은 트리에서 «읽는 시각» 만이 갈랐다');
  await p.evaluate(FIRE);
  const fast = await p.evaluate(READ);
  await p.evaluate(FIRE);
  await p.waitForTimeout(900);
  const slow = await p.evaluate(READ);
  ok(!!fast && fast.nFlash === 1 && fast.nLab === 1 && !!slow && slow.nFlash === 0,
     '3-a `index.html` 한 줄 안 바꾸고 **읽는 시각만** 바꿔 초록 ↔ 빨강을 오간다 — 990 의 변경과 무관하다',
     (fast ? ('빠른 읽기 플래시 ' + fast.nFlash + '·패치 ' + fast.nLab) : 'x') + ' ↔ ' + (slow ? ('늦은 읽기 플래시 ' + slow.nFlash + '·패치 ' + slow.nLab) : 'x'));

  blk('4] 진짜 부하 — 왕복 지연이 수명을 실제로 넘는가');
  /* ⚠ **Node 쪽 벽시계로 재면 틀린다**(1회차 함정) — FIRE 가 «시작되기까지» 기다린 시간까지 세어
     594ms 를 찍고도 놓친 판이 0 이었다. 노드를 걷는 타이머는 **페이지 안 시계**로 도니
     재야 할 것은 «`rwSummonFx` 가 돈 순간 → READ 가 읽은 순간» = `t1 − t0` 다. */
  const rt = [];
  if (LOAD > 0) loadOn(LOAD);
  for (let i = 0; i < 12; i++) {
    const f = await p.evaluate(FIRE);
    await p.waitForTimeout(80);                  /* verify795 가 실제로 쓰는 값 */
    const r = await p.evaluate(READ);
    rt.push({ gap: (f && r) ? r.t1 - f.t0 : null, flash: r ? r.nFlash : -1, lab: r ? r.nLab : -1 });
  }
  if (LOAD > 0) loadOff();
  const gaps = rt.map(x => x.gap).filter(v => v !== null);
  const miss = rt.filter(x => x.flash !== 1 || x.lab !== 1).length;
  info('FIRE → READ **페이지 안** 간격 12판',
       r2(Math.min(...gaps)) + '~' + r2(Math.max(...gaps)) + 'ms (부하 ' + (LOAD || 0) + ') · 수명 ' + r2(LIFE_F) + 'ms · 놓친 판 ' + miss + '/12');
  ok(gaps.length === 12,
     '4-a 페이지 안 간격을 찍는다 — 이 값이 ' + r2(LIFE_F) + 'ms 를 넘는 판이 곧 빨간 판이다',
     r2(Math.min(...gaps)) + '~' + r2(Math.max(...gaps)) + 'ms · 놓친 판 ' + miss + '/12');

  blk('5] 현장 재현 — `verify795` 를 **동시에** 여러 판 돌린다(990 회차가 본 그 상황)');
  const runs = Number(argOf('--runs', 6));
  const one = () => new Promise(res => {
    const c = spawn(process.execPath, [path.join(__dirname, 'verify795.js')], { cwd: path.resolve(__dirname, '..') });
    let out = '';
    c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d);
    c.on('close', code => res({ code, bad: (out.match(/^ {2}FAIL .*/gm) || []).map(s => s.trim().slice(5, 45)) }));
  });
  const results = await Promise.all(Array.from({ length: runs }, one));
  /* ⚠ 코드 **1**(단언 실패)만 빨강으로 센다. 코드 **3**은 «못 쟀다» 로, 이 수리가 만든 정직한 답이다
     (939 규약) — 부하가 극심하면 다섯 판을 다 놓칠 수 있고 그때 빨강으로 위장하지 않는 것이 요지다. */
  const red = results.filter(r => r.code === 1);
  const un = results.filter(r => r.code === 3);
  for (const r of red) console.log('  ·  빨간 판 — ' + (r.bad.join(' / ') || '(항목 없음)'));
  info('동시 ' + runs + '판 결과',
       (runs - red.length - un.length) + ' PASS · ' + red.length + ' FAIL · ' + un.length + ' 못 쟀다(코드 3)');
  ok(red.length === 0,
     '5-a ★ 동시 실행에서 «잴 것이 없어서» 빨개지는 판이 0 이다 — 수리 전 같은 부하에서 2/6·4/6 이었다',
     red.length + '/' + runs + ' FAIL · 못 쟀다 ' + un.length);

  await browser.close();
  console.log('\nPROBE993 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { loadOff(); console.error(e); process.exit(1); });
