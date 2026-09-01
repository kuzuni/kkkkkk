'use strict';
/* ==========================================================================
   작업 731 — 게이트 공용 «조용한 소실» 차단기
   --------------------------------------------------------------------------
   병(712 가 표본이다)
     자가 `page.evaluate` 본문에서 읽던 **제품 전역이 폐지되면** 페이지 안에서
     `ReferenceError` 가 난다 → 자마다 손으로 적은 `ev()`(319 규약 «그 블록만 빨갛게»)가
     예외를 **삼킨다** → 뒤따르는 `if (x)` 가 조용히 건너뛴다 → 그 절이 통째로 빠진 채
     **종료 코드 0** 으로 끝난다. 696 은 «빨간 죽음»(정규식이 못 찾아 즉사), 712 는
     **«초록으로 읽히는 빨강»** 이다. 712 는 두 자에 위생 항([6-0]·[4-0])을 손으로 세웠지만
     같은 꼴이 나머지 몇 자에 더 있는지는 **아무도 모른다**(731 등재문).

   왜 정적 스윕이 아닌가
     712 세션이 시제품(evaluate 본문의 대문자 상수 ÷ 제품에 없는 이름)을 짜 보니
     **131 파일 · 수백 건**이 잡혔다 — 도구 자신의 상수·인자·문자열·정규식이 전부 섞인다.
     ⇒ 처방은 동적이다: **실제로 난 예외**만 본다.

   무엇을 하나 (자 400개를 한 줄도 안 고친다)
     `pwlaunch.launch()` 가 만든 브라우저의 모든 페이지에서 `evaluate`·`evaluateHandle` 을
     감싸, **예외를 그대로 다시 던지되**(자의 `catch` 는 종전대로 돈다) 한 건씩 적어 둔다.
     프로세스가 끝날 때 «미신고 예외» 가 있으면
       ① `⚠ evaluate 예외` 줄을 stdout 에 찍고  ② **종료 코드를 1 로 올린다**.
     삼켜서 초록으로 끝나는 길이 닫힌다. 291(settle) 이 `waitForTimeout` 한 곳에서
     게이트 44개를 동시에 고친 것과 **같은 자리·같은 꼴**이다.

   무엇을 «미신고» 로 보나 (거짓 빨강을 안 만드는 것이 이 부품의 전제다)
     ⓐ **치명(fatal)** — 이름·모양이 사라졌다는 지문만 센다:
        `... is not defined` · `is not a function` · `Cannot read propert…` ·
        `is not iterable` · `is not a constructor`.
     ⓑ **정상(infra)** — 네비게이션·닫힘·타임아웃·detached 는 **절대 안 센다**.
        게이트가 페이지를 갈아타는 중에 흔히 나고, 이것은 731 의 병이 아니다.
     ⓒ **신고(declared)** — 일부러 예외를 내는 자(probe319 [A] 처럼 «삼킴이 도는지» 를
        재는 자)는 `expect(/…/)` 로 미리 적는다. 적힌 것과 맞으면 세지 않는다.

   쓰는 법
     자동 — `pwlaunch.launch()` 를 쓰는 자는 아무것도 안 해도 걸린다.
     일부러 낼 때 —
       const evg = require('./evguard731');
       evg.expect(/bagUse is not defined/);        // 이 예외는 내 설계다
     공용 부품(선택) — 자마다 복붙하던 `ev()`/`blk()` 를 여기서 가져다 쓸 수 있다:
       const { ev, blk } = require('./evguard731').helpers(page, ok);

   스위치
     `EVGUARD=0`   — 통째로 끈다(되돌림 스위치. 이 값이면 731 이전과 동작이 **같다**).
     `EVGUARD=report` — 적고 찍기만 한다. **종료 코드는 안 건드린다**(도입·조사용).
     기본값(strict) — 미신고 치명 예외가 있으면 종료 코드 1.
   ========================================================================== */

const path = require('path');

/* ---- 모드 ---- */
function mode() {
  const v = String(process.env.EVGUARD || '').toLowerCase();
  if (v === '0' || v === 'off' || v === 'false') return 'off';
  if (v === 'report' || v === 'warn') return 'report';
  return 'strict';
}

/* ---- 지문 ---- */
/* 이름·모양이 사라졌다는 뜻인 것만 «치명» 이다. */
const FATAL = [
  /\bis not defined\b/,
  /\bis not a function\b/,
  /Cannot read propert(?:y|ies)\b/,
  /Cannot access '[^']*' before initialization/,
  /\bis not iterable\b/,
  /\bis not a constructor\b/,
  /\bundefined has no properties\b/,
];
/* 게이트가 페이지를 갈아타는 중에 나는 것 — 731 의 병이 아니다. */
const INFRA = [
  /Execution context was destroyed/i,
  /Target (?:page, context or browser has been )?closed/i,
  /Target crashed/i,
  /frame was detached/i,
  /Frame was detached/i,
  /navigat/i,
  /Timeout .* exceeded/i,
  /has been closed/i,
  /Protocol error/i,
];

function classify(msg) {
  if (INFRA.some(re => re.test(msg))) return 'infra';
  if (FATAL.some(re => re.test(msg))) return 'fatal';
  return 'other';
}

/* ---- 등록부 ---- */
const REC = [];            /* { msg, kind, at, n } — 같은 문구는 한 줄로 접고 n 을 센다 */
const EXPECT = [];         /* 신고된 지문 */
let hooked = false;

function expect(pat) {
  EXPECT.push(pat instanceof RegExp ? pat : new RegExp(String(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  return module.exports;
}
const declared = msg => EXPECT.some(re => re.test(msg));

/* 호출부 한 줄 — 자 파일 안의 자리를 이름으로 남긴다(tools/ 밖 프레임은 버린다). */
function callsite() {
  const st = String(new Error().stack || '').split('\n').slice(2);
  for (const l of st) {
    const m = l.match(/\(?([^()\s]+\.js):(\d+):\d+\)?\s*$/);
    if (!m) continue;
    const f = m[1];
    if (/node_modules|evguard731\.js|internal[\\/]/.test(f)) continue;
    return path.basename(f) + ':' + m[2];
  }
  return '?';
}

function record(err, at) {
  const msg = String((err && err.message) || err || '').split('\n')[0].trim();
  const kind = classify(msg);
  const hit = REC.find(r => r.msg === msg && r.at === at);
  if (hit) { hit.n++; return; }
  REC.push({ msg, kind, at, n: 1 });
  /* 난 자리에서 바로 한 줄 — «바뀐 것만 돌려 stdout 을 본다» 는 쓰임(731 처방 ①)도 이 줄을 읽는다. */
  if (kind === 'fatal' && !declared(msg)) {
    console.log('⚠ evaluate 예외 [' + at + '] ' + msg);
  }
}

/* ---- 한 페이지 감싸기 ---- */
function arm(page) {
  if (!page || page.__evguard731 || mode() === 'off') return page;
  page.__evguard731 = true;
  for (const name of ['evaluate', 'evaluateHandle']) {
    const orig = page[name];
    if (typeof orig !== 'function') continue;
    const bound = orig.bind(page);
    page[name] = function (...a) {
      const at = callsite();
      let r;
      try { r = bound(...a); } catch (e) { record(e, at); throw e; }
      if (!r || typeof r.then !== 'function') return r;
      /* 예외는 **그대로 다시 던진다** — 자의 종전 흐름(try/catch·.catch)을 한 줄도 안 바꾼다. */
      return r.then(undefined, e => { record(e, at); throw e; });
    };
  }
  return page;
}

/* ---- 브라우저가 만드는 모든 페이지 (settle291.armBrowser 와 같은 꼴) ---- */
function armBrowser(browser) {
  if (!browser || browser.__evguard731 || mode() === 'off') return browser;
  browser.__evguard731 = true;
  const wrapNewPage = obj => {
    const orig = obj.newPage.bind(obj);
    obj.newPage = async (...a) => arm(await orig(...a));
  };
  wrapNewPage(browser);
  const origNewCtx = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const ctx = await origNewCtx(...a);
    wrapNewPage(ctx);
    return ctx;
  };
  install();
  return browser;
}

/* ---- 마감 ---- */
function undeclared() {
  return REC.filter(r => r.kind === 'fatal' && !declared(r.msg));
}

function report() {
  const bad = undeclared();
  if (!bad.length) return 0;
  const tot = bad.reduce((s, r) => s + r.n, 0);
  console.log('');
  console.log('⚠ EVGUARD 731 — 삼켜진 evaluate 예외 ' + tot + '건 (' + bad.length + '종)');
  for (const r of bad) console.log('   · [' + r.at + '] ×' + r.n + '  ' + r.msg);
  console.log('   → 이 절은 «돌았다» 가 아니라 «건너뛰었다». 자의 판정은 그만큼 비어 있다.');
  console.log('   (일부러 낸 예외라면 자 머리에서 `require(\'./evguard731\').expect(/…/)` 로 신고한다 ·');
  console.log('    끄기 = EVGUARD=0 · 적기만 = EVGUARD=report)');
  return tot;
}

function install() {
  if (hooked || mode() === 'off') return;
  hooked = true;
  process.on('exit', () => {
    const tot = report();
    if (tot && mode() === 'strict' && !process.exitCode) process.exitCode = 1;
  });
}

/* ---- 선택 부품 — 자마다 복붙하던 ev()/blk() 의 공용 사본 ----
   319 규약 그대로: 예외는 `{ __err }` 로 돌려주고, `blk()` 이 **그 블록만** 한 항의 빨강으로 적는다.
   차이는 하나 — 여기 것은 위 등록부에도 남으므로 «적기를 빼먹어도» 마감에서 잡힌다. */
function helpers(page, ok) {
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0] }; }
  };
  const blk = (r, m) => {
    if (r && r.__err) { if (ok) ok(false, m + ' — 평가가 죽었다: ' + r.__err); return false; }
    return true;
  };
  return { ev, blk };
}

module.exports = { arm, armBrowser, expect, records: () => REC, undeclared, report, install, helpers, mode, classify };
