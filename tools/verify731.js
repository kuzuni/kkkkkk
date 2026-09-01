'use strict';
/* ==========================================================================
   verify731 — «조용한 소실» 차단기의 자   (작업 731, 2026-09-01)
   --------------------------------------------------------------------------
   무엇을 지키는가
     자가 `page.evaluate` 본문에서 읽던 제품 전역이 폐지되면 페이지 안에서 `ReferenceError`
     가 나고, 자마다 복붙된 `ev()`(319 규약)가 그것을 **삼킨다**. 뒤따르는 `if (x)` 가 조용히
     건너뛰므로 그 절이 통째로 빠진 채 **종료 코드 0** 으로 끝난다 — 712 가 실제로 그랬다
     (다섯 줄이 사라진 채 46/46 «PASS»). 731 은 그 길을 자 400개를 한 줄도 안 고치고 닫는다:
     `pwlaunch.launch()` 가 만든 페이지의 `evaluate` 를 감싸 예외를 **그대로 다시 던지되**
     적어 두고, 마감에서 미신고 치명 예외가 있으면 종료 코드를 1 로 올린다.

   절
     [A] 배선 — 부품이 있고 `pwlaunch` 가 그것을 지난다(정적) · 모드 스위치 3종
     [B] 지문 — 무엇을 «치명» 으로 세고 무엇을 «정상» 으로 버리는가 (거짓 빨강의 전제)
     [C] 병 재현 + 닫힘 — 삼키는 사본 자를 실제로 돌린다.
         `EVGUARD=0` = 종전 = **초록 · 코드 0**(= 병이 여기 있다) ↔ 기본값 = **코드 1 + ⚠ 줄**
         ⚠ 사본은 끝에서 `process.exit(0)` 을 **명시로** 부른다 — 그 경로에서도 코드가 올라가야 한다
     [D] 무해함 — 예외가 0건인 자는 출력·코드가 그대로다 · 자의 판정 본문은 두 모드에서 **같다**
         (차단기가 자의 흐름을 바꾸지 않는다 = 예외를 다시 던진다는 것의 증거)
     [E] 신고 — 일부러 예외를 내는 자(`probe319`)는 `expect()` 로 신고했고 **초록 · 코드 0** 이다
     [R] 되돌림 시험 — 차단기 배선을 뺀 `pwlaunch` 사본에서는 [C] 가 **다시 조용히 초록**이 된다.
         이것이 «[C] 의 빨강이 차단기 덕분» 임을 못박는 자리다(334·348·364·368 규약)

   ⚠ 임시 사본은 전부 `.v731-*-<pid>.js`(648 — 고정 이름 사본은 병렬 실행에서 서로를 지운다).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOLS = __dirname;
const ROOT = path.resolve(__dirname, '..');
const GUARD = path.join(TOOLS, 'evguard731.js');
const PWL = path.join(TOOLS, 'pwlaunch.js');

const R = [];
const yes = (n, got, d) => R.push({ n: n + (d !== undefined && d !== '' ? ' — ' + d : ''), got: String(got), want: 'true', pass: got === true });
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });

const tmps = [];
function tmp(tag, body, ext) {
  const p = path.join(TOOLS, '.v731-' + tag + '-' + process.pid + (ext || '.js'));
  fs.writeFileSync(p, body);
  tmps.push(p);
  return p;
}
function run(file, env) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [file], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, env || {}), timeout: 180000,
    }), err: '' };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || ''), err: String(e.stderr || '') };
  }
}

/* 사본 자 — «삼키는 ev()» 한 줄이 전부다. 712 가 걸린 그 꼴 그대로.
   `dead` 가 undefined 라 `if (dead)` 가 조용히 건너뛰고, 자는 자기가 잰 줄만 세고 끝난다. */
function fixture(readGlobal) {
  return `'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  const ev = fn => p.evaluate(fn).catch(() => {});      /* ← 삼킨다 */
  const got = await ev(() => ({ v: ${readGlobal} }));
  if (got) ok(typeof got.v !== 'undefined', '[절] 제품 값을 읽었다 — ' + JSON.stringify(got));
  ok(true, '[다른 절] 이 항은 예외와 무관하게 돈다');
  await b.close();
  console.log('FIX731 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);                            /* ← 명시 종료 경로 */
})();
`;
}

(async () => {
  /* ---------- [A] 배선 ---------- */
  const gsrc = fs.readFileSync(GUARD, 'utf8');
  const psrc = fs.readFileSync(PWL, 'utf8');
  yes('[A1] 부품 파일이 있다 (tools/evguard731.js)', fs.existsSync(GUARD));
  yes('[A2] `pwlaunch` 가 부품을 부른다', /require\('\.\/evguard731'\)/.test(psrc));
  yes('[A3] `launch()` 가 만든 브라우저에 건다', /evguard\.armBrowser\(/.test(psrc));
  const g = require('./evguard731');
  yes('[A4] 감싸는 것은 `evaluate`·`evaluateHandle` 둘이다',
      /\['evaluate', 'evaluateHandle'\]/.test(gsrc));
  yes('[A5] 예외를 **다시 던진다**(자의 catch 가 종전대로 돈다)', /throw e;/.test(gsrc));
  const M = k => { const o = process.env.EVGUARD; process.env.EVGUARD = k; const m = g.mode(); if (o === undefined) delete process.env.EVGUARD; else process.env.EVGUARD = o; return m; };
  eq('[A6] 스위치 — EVGUARD=0', M('0'), 'off');
  eq('[A7] 스위치 — EVGUARD=report', M('report'), 'report');
  eq('[A8] 스위치 — 기본값', M(''), 'strict');

  /* ---------- [B] 지문 ---------- */
  eq('[B1] 폐지된 전역 — `is not defined`', g.classify('page.evaluate: ReferenceError: OFF_MAX_H is not defined'), 'fatal');
  eq('[B2] 폐지된 함수 — `is not a function`', g.classify('TypeError: bagUse is not a function'), 'fatal');
  eq('[B3] 모양이 사라짐 — `Cannot read properties`', g.classify("TypeError: Cannot read properties of undefined (reading 'x')"), 'fatal');
  eq('[B4] 네비게이션 중 — 안 센다', g.classify('page.evaluate: Execution context was destroyed, most likely because of a navigation'), 'infra');
  eq('[B5] 페이지 닫힘 — 안 센다', g.classify('page.evaluate: Target page, context or browser has been closed'), 'infra');
  eq('[B6] 타임아웃 — 안 센다', g.classify('page.evaluate: Timeout 30000ms exceeded'), 'infra');
  eq('[B7] 그 밖 — 치명도 정상도 아니다(안 센다)', g.classify('Error: 내가 던진 것'), 'other');

  /* ---------- [C] 병 재현 + 닫힘 ---------- */
  const fDead = tmp('dead', fixture('__NO_SUCH_GLOBAL_731__'));
  const off = run(fDead, { EVGUARD: '0' });
  const on = run(fDead, { EVGUARD: '' });
  yes('[C1] 종전(EVGUARD=0) — 자는 **초록으로** 끝난다', /FIX731 \d+\/\d+ PASS/.test(off.out), off.out.trim().split('\n').pop());
  eq('[C2] 종전(EVGUARD=0) — 종료 코드', off.code, 0);
  yes('[C3] 종전 — 사라진 절은 **한 줄도 안 남는다**', !/\[절\]/.test(off.out) && !/⚠/.test(off.out));
  yes('[C4] 차단기 — `⚠ evaluate 예외` 줄이 stdout 에 난다',
      /⚠ evaluate 예외 \[\.v731-dead-\d+\.js:\d+\] .*__NO_SUCH_GLOBAL_731__ is not defined/.test(on.out));
  yes('[C5] 차단기 — 마감 블록이 무엇이 비었는지 적는다', /⚠ EVGUARD 731 — 삼켜진 evaluate 예외 1건/.test(on.out));
  eq('[C6] 차단기 — 종료 코드가 1 이다 (`process.exit(0)` 명시 경로에서도)', on.code, 1);
  yes('[C7] 차단기 — 자 자신의 판정은 여전히 «PASS» 다(고쳐야 할 것은 자다)', /FIX731 \d+\/\d+ PASS/.test(on.out));

  /* ---------- [D] 무해함 ---------- */
  const fLive = tmp('live', fixture('DUNGEONS.length'));
  const lOff = run(fLive, { EVGUARD: '0' });
  const lOn = run(fLive, { EVGUARD: '' });
  eq('[D1] 예외 0건 — 종료 코드(종전)', lOff.code, 0);
  eq('[D2] 예외 0건 — 종료 코드(차단기)', lOn.code, 0);
  yes('[D3] 예외 0건 — ⚠ 줄이 하나도 안 난다', !/⚠/.test(lOn.out));
  yes('[D4] 살아 있는 전역은 실제로 읽힌다', /\[절\] 제품 값을 읽었다/.test(lOn.out));
  /* 차단기는 «마감» 만 바꾼다 — 자가 찍는 판정 본문은 두 모드에서 글자 그대로 같다. */
  const body = s => s.split('\n').filter(l => /^\s{2}(ok|FAIL)\s|^FIX731/.test(l)).join('\n');
  eq('[D5] 병든 자 — 판정 본문이 두 모드에서 같다', body(on.out) === body(off.out), true);
  eq('[D6] 성한 자 — 판정 본문이 두 모드에서 같다', body(lOn.out) === body(lOff.out), true);

  /* ---------- [E] 신고 ---------- */
  const p319 = run(path.join(TOOLS, 'probe319.js'), { EVGUARD: '' });
  yes('[E1] `probe319` 는 일부러 예외를 낸다 — 신고돼 있다',
      /require\('\.\/evguard731'\)\.expect\(/.test(fs.readFileSync(path.join(TOOLS, 'probe319.js'), 'utf8')));
  yes('[E2] 신고된 자는 초록으로 끝난다', /PROBE319 \d+\/\d+ PASS/.test(p319.out), p319.out.trim().split('\n').pop());
  eq('[E3] 신고된 자의 종료 코드', p319.code, 0);
  yes('[E4] 신고된 예외는 마감 블록에 안 실린다', !/EVGUARD 731 — 삼켜진/.test(p319.out));

  /* ---------- [R] 되돌림 시험 ---------- */
  /* 배선 한 줄을 뺀 `pwlaunch` 사본으로 [C] 를 다시 돌린다 — 조용한 초록으로 **되돌아가야** 한다.
     (안 되돌아가면 [C6] 의 빨강은 차단기가 아니라 다른 것 덕분이라는 뜻이다) */
  const pwOff = tmp('pwl', psrc.replace(/const arm = b => evguard\.armBrowser\(armBrowser\(b\)\);/,
                                        'const arm = b => armBrowser(b); /* 731 배선 제거(되돌림 시험) */'));
  yes('[R1] 사본에서 배선이 실제로 빠졌다', !/evguard\.armBrowser\(armBrowser/.test(fs.readFileSync(pwOff, 'utf8')));
  const fRev = tmp('rev', fixture('__NO_SUCH_GLOBAL_731__').replace("require('./pwlaunch')",
                                  "require('./" + path.basename(pwOff) + "')"));
  const rev = run(fRev, { EVGUARD: '' });
  eq('[R2] 배선을 빼면 종료 코드가 0 으로 되돌아간다', rev.code, 0);
  yes('[R3] 배선을 빼면 ⚠ 줄도 사라진다', !/⚠/.test(rev.out));
  yes('[R4] 그리고 그 절은 여전히 조용히 비어 있다(= 병 그대로)', !/\[절\]/.test(rev.out));

  for (const p of tmps) { try { fs.unlinkSync(p); } catch (_) {} }

  let pass = 0;
  for (const r of R) {
    if (r.pass) pass++;
    console.log((r.pass ? '  ok   ' : '  FAIL ') + r.n + (r.pass ? '' : '   got=' + r.got + ' want=' + r.want));
  }
  console.log('\nVERIFY731 ' + pass + '/' + R.length + (pass === R.length ? ' PASS' : ' FAIL'));
  process.exit(pass === R.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
