/* 작업 645 재현기 — `verify69` [4] «✕ 가 안 닫힌다» 플레이키.
   실행: node tools/probe645.js [--runs N] [--load]
         --load  같은 브라우저에서 사본 3개를 동시에 굴린다(**재현 조건** — 단독으로는 안 난다).

   ⚠ 338 규칙 — 처방보다 재현이 먼저다. 이 파일이 답하는 것은 넷이다:
     [A] 클릭이 정말 갔는가 — 핸들러 결합 · `closeModal` 이 같은 tick 에 `on` 을 떼는가
     [B] 그 뒤 누가 `ml69` 를 **도로 붙이는가** — #modal class 변화 타임라인 + 변경자 스택
     [C] 껍데기가 얼마나 오래 붙어 있는가 — 자의 고정 대기 **200ms** 와 견준다
     [D] 제품의 «연출 중» 신호(`#modal.__jzBusy`)가 클릭과 **같은 tick** 에 서는가
         (638 처방대로 고정 대기를 폴링으로 갈 때, 폴링 시작이 그보다 빠르면 **헛초록**이 된다)

   등재문 갈래 ②(60 쥬시가 ✕ 를 덮어 `elementFromPoint` 가 빗나간다 · 350 교훈)는
   자가 `el.click()` 을 써서 좌표를 안 쓰므로 성립하지 않는다 — [A] 가 값으로 기각한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const argv = process.argv.slice(2);
const RUNS = (() => { const i = argv.indexOf('--runs'); return i >= 0 ? +argv[i + 1] : 2; })();
const LOAD = argv.includes('--load');
const GATE_WAIT = 200;            /* verify69 [4] 가 쓰던 고정 대기 */

let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log('  ✓ ' + m); };
const fail = (m) => { failed++; console.log('  ✗ ' + m); };

/* verify69 의 fresh() 와 같은 준비 — 같은 자리를 재는 것이 목적이다 */
async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(800);
  await page.evaluate(() => { if (typeof S === 'object') { S.autoBuy = false; S.spAuto = false; } });
  await page.evaluate(() => {
    if (typeof S !== 'object') return;
    S.mailx = []; S.mailSeq = 0; S.mail = {};
    const d = new Date();
    S.lastMonthly = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  });
  return { ctx, page };
}

/* #modal 의 class 를 «누가 바꿨는지» 까지 남긴다. MutationObserver 콜백에는 변경자의 스택이
   없으므로 그 인스턴스의 DOMTokenList add/remove 를 감싸 스택을 직접 채집한다. */
const HOOK = () => {
  const m = document.getElementById('modal');
  window.__p645 = { log: [], t0: performance.now() };
  const cl = m.classList;
  ['add', 'remove'].forEach((k) => {
    const orig = cl[k].bind(cl);
    cl[k] = function (...a) {
      window.__p645.log.push({ t: +(performance.now() - window.__p645.t0).toFixed(1), op: k, cls: a.join(' '),
        at: (new Error().stack || '').split('\n').slice(2, 4).map(s => (s.match(/index\.html:\d+/) || ['(자)'])[0]).join(' ← ') });
      return orig(...a);
    };
  });
};

/* verify69 [4] 의 «닫기» 자리를 그대로 밟는다 — 전체 수령·삭제·reload 까지 같은 순서다 */
async function tail(page) {
  await page.evaluate(() => openMail());
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.getElementById('mailBtn'); if (b && !b.disabled) b.click(); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const b = document.getElementById('mailDel'); if (b && !b.disabled) b.click(); });
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(900);

  await page.evaluate(HOOK);
  await page.evaluate(() => openMail());
  await page.waitForTimeout(250);

  /* 클릭과 관측을 **한 evaluate 안**에서 한다 — 사이에 Node 왕복이 끼면 그 왕복이 곧 대기가 된다 */
  return page.evaluate((gate) => new Promise((res) => {
    const m = document.getElementById('modal');
    const t0 = performance.now();
    const has = (c) => m.classList.contains(c);
    const r = { bound: typeof document.getElementById('mailX').onclick, frames: [] };

    document.getElementById('mailX').click();
    /* 같은 tick(동기) 상태 — 시간 축이 없다 */
    r.sync = { on: has('on'), ml69: has('ml69'), busy: +!!m.__jzBusy, t: +(performance.now() - t0).toFixed(1) };

    let tBusyOn = -1, tShellBack = -1, tRelease = -1, tBusyOff = -1;
    (function tick() {
      const t = +(performance.now() - t0).toFixed(1);
      const busy = +!!m.__jzBusy, ml = has('ml69'), on = has('on');
      if (busy && tBusyOn < 0) tBusyOn = t;
      if (ml && tShellBack < 0 && r.sync.ml69 === false) tShellBack = t;
      if (!busy && tBusyOn >= 0 && tBusyOff < 0) tBusyOff = t;
      if (!ml && tShellBack >= 0 && tRelease < 0) tRelease = t;
      if (r.frames.length < 6) r.frames.push({ t, busy, ml, on });
      const done = !on && !ml && !busy && (tBusyOn >= 0 || t > 600);
      if (done || t > 4000) {
        Object.assign(r, { tBusyOn, tShellBack, tRelease, tBusyOff, total: t,
          gateVerdict: (function () { return null; })() });
        return res(r);
      }
      requestAnimationFrame(tick);
    })();
  }), gate = GATE_WAIT);
}

/* 옛 자가 그 표본에서 무엇을 봤을지 — 고정 대기 200ms 시점의 판정을 재구성한다 */
const oldGateWouldPass = (r) => !(r.tRelease > GATE_WAIT || (r.tRelease < 0 && r.tShellBack >= 0));

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  try {
    for (let run = 1; run <= RUNS; run++) {
      const n = LOAD ? 3 : 1;
      const got = await Promise.all(Array.from({ length: n }, () => (async () => {
        const { ctx, page } = await fresh(browser);
        try { return await tail(page); } finally { await ctx.close(); }
      })()));
      got.forEach((r, i) => {
        rows.push(r);
        console.log(`\n── 표본 ${run}.${i + 1}${LOAD ? ' (3병렬)' : ' (단독)'}`);
        console.log(`   [A] mailX.onclick=${r.bound} · 클릭과 같은 tick: on=${r.sync.on} ml69=${r.sync.ml69} __jzBusy=${r.sync.busy}`);
        console.log(`   [C] 껍데기 되붙음 ${r.tShellBack}ms → 놓음 ${r.tRelease}ms (연출 ${r.tBusyOn}→${r.tBusyOff}ms)`
          + ` · 고정 대기 ${GATE_WAIT}ms 로 재면 ${oldGateWouldPass(r) ? '초록' : '**빨강**'}`);
        console.log(`   [D] ` + r.frames.map(f => `${f.t}ms{busy${f.busy} ml${+f.ml} on${+f.on}}`).join(' '));
      });
    }

    console.log('\n[B] #modal class 변화 — 마지막 표본의 타임라인(변경자 스택)');
    /* 마지막 표본의 로그는 컨텍스트가 닫혀 못 읽으므로, 대표 1건을 따로 떠서 찍는다 */
    {
      const { ctx, page } = await fresh(browser);
      await page.evaluate(HOOK);
      await page.evaluate(() => openMail());
      await page.waitForTimeout(250);
      await page.evaluate(() => { document.getElementById('mailX').click(); });
      await page.waitForTimeout(900);
      const log = await page.evaluate(() => window.__p645.log);
      log.filter(l => /\bon\b|ml69/.test(l.cls)).forEach(l =>
        console.log(`   ${String(l.t).padStart(7)}ms ${l.op.padEnd(6)} ${l.cls.padEnd(20)} ${l.at}`));
      await ctx.close();
    }

    /* ── 판정 ─────────────────────────────────────────────── */
    console.log('\n[판정]');
    rows.every(r => r.bound === 'function')
      ? ok('[A] mailX.onclick 이 표본 전부에서 function — «핸들러 미결합» 갈래 기각')
      : fail('[A] onclick 이 안 붙은 표본이 있다');
    rows.every(r => r.sync.on === false)
      ? ok('[A] 클릭과 **같은 tick** 에 on 이 떨어진다 — closeModal 은 매번 돌았다(제품 무죄)')
      : fail('[A] 클릭했는데 on 이 남은 표본이 있다 — closeModal 이 막힌다');
    rows.every(r => r.sync.ml69 === false)
      ? ok('[A] 같은 tick 에 ml69 도 떨어진다 — 뒤에 다시 붙는 것은 «남은 것» 이 아니라 «되붙인 것»')
      : fail('[A] 같은 tick 에 ml69 가 안 떨어진 표본이 있다');
    const backs = rows.filter(r => r.tShellBack >= 0);
    backs.length === rows.length
      ? ok(`[B] 표본 전부에서 ml69 가 되붙는다(${backs.map(r => r.tShellBack + 'ms').join(' · ')}) — 345 jzShellBack`)
      : fail(`[B] 되붙지 않은 표본 ${rows.length - backs.length}개 — 다른 뿌리다`);
    rows.every(r => r.tRelease >= 0)
      ? ok(`[C] 껍데기는 결국 전부 놓인다 — 놓는 시각 ${Math.min(...rows.map(r => r.tRelease))}~${Math.max(...rows.map(r => r.tRelease))}ms`)
      : fail('[C] 4000ms 안에 껍데기를 안 놓은 표본이 있다 — 진짜 «안 닫힘» 이다');
    const red = rows.filter(r => !oldGateWouldPass(r));
    console.log(`   → 고정 대기 ${GATE_WAIT}ms 로 재면 표본 ${rows.length}개 중 ${red.length}개가 빨강`);
    rows.every(r => r.sync.busy === 0)
      ? ok('[D] `__jzBusy` 는 클릭과 같은 tick 에는 **아직 0** — 폴링을 그때 시작하면 헛초록이다')
      : fail('[D] 같은 tick 에 이미 busy=1 인 표본이 있다');
    /* frames[0] 은 클릭과 같은 tick(동기), frames[1] 이 첫 rAF 다 */
    rows.every(r => r.tBusyOn >= 0 && r.frames.length > 1 && r.frames[1].busy === 1)
      ? ok(`[D] 첫 rAF 에는 이미 busy=1 (${rows.map(r => r.tBusyOn + 'ms').join(' · ')}) — 폴링은 rAF 부터 세면 된다`)
      : fail('[D] 첫 rAF 에 busy 가 안 선 표본이 있다 — 폴링 시작 조건을 다시 짜라');

    console.log(`\nPROBE645 ${failed ? 'FAIL' : 'PASS'} ${pass}/${pass + failed}`);
  } finally { await browser.close(); }
  process.exit(failed ? 1 : 0);
})();
