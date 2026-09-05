/* 게이트 922 — 딤의 조건은 «화소를 재는가» 다: 918 규칙의 **여집합 261** 이 걷개 안으로 들어왔는가
 *
 *   node tools/verify922.js
 *
 * 무엇을 지키는가 —
 *   918 은 걷개를 907 판별기(① 스타일 태그를 붙였다 뗀다 ② 그 판끼리 화소 차분)에 걸었다.
 *   그런데 그것은 **부분 리라스터의 조건**이지 **딤의 조건이 아니다** — `#defw` 는
 *   `inset:0 · z39 · rgba(0,0,0,.62)` 라 스타일 교체와 무관하게 **화소를 읽는 자를 전부** 덮는다.
 *   918 §6 의 실측: `verify*`/`probe*` 1,108 중 ①∧② 는 34, 그 여집합에서 **화소를 재는 자가 261**이었고
 *   그 261 은 걷개 밖이었다. 922 는 그 자리에 **입구를 하나 더**(`RE_PX`) 냈다.
 *
 * 절 —
 *   [1] 규칙   — 입구는 둘, 빼는 규칙(`RE_SELF`)은 하나다. 목록이 아니라 판별기다.
 *   [2] 전수   — 여집합에서 화소를 재는 자가 **한 자도 빠짐없이** 대상이다(갈래의 합 = 전체).
 *   [3] 음성항 — 껍데기를 이름으로 말하는 자 · `cap*.js` · 화소를 안 재는 자의 세상은 **한 칸도 안 바뀐다**.
 *   [4] 사본 0 — 조건을 두 곳에 적지 않는다(`RE_PX` 의 주인은 `shell918` 하나 · 402 규약).
 *   [5] 그린 것 — «화소만 재는 자» 의 판에서 걷개가 실제로 돈다(제품 경로를 불러도 딤이 안 남는다).
 *   [R] 되돌림 — `PW_SHELL918_PX=0` 이면 그 자가 **다시 노출된다**(= [5] 는 헛초록이 아니다).
 *
 * 재현·전수 세기는 `tools/probe922.js`(`--scan`), 걷개 본체는 `tools/shell918.js`,
 * 918 의 약속은 `tools/verify918.js` 가 그대로 지킨다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const shell918 = require('./shell918');
const raster907 = require('./raster907');
const { census } = require('./probe922');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const TOOLS = __dirname;
const URL = 'file://' + path.join(ROOT, 'index.html');
const T = f => path.join(TOOLS, f);
const ENV918 = { PW_SHELL918_PX: '0' };          /* 922 를 되돌린 세상(918 이 쓰던 조건만) */

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* 지어낸 자 — 규칙은 «내용» 으로 판정하므로 실물 없이도 물을 수 있다(918 [1] 과 같은 꼴).
   ⚠ 이름은 **`verify`/`probe` 로 시작해야** 규칙의 첫 조건을 지난다(`.v922-…` 로 지으면
   이름 규칙에 걸려 «조건을 안 갖춰서» 가 아니라 «이름이 아니라서» 빠진다 — 1회차에 실제로 겪었다).
   그래서 저장소가 아니라 **os 임시 자리**에 짓는다(추적·무시 규칙과 무관하고 census 도 안 본다). */
const os = require('os');
const tmp = n => path.join(os.tmpdir(), 'verify922-' + n + '-' + process.pid + '.js');
function mk(n, src) { const p = tmp(n); fs.writeFileSync(p, src); return p; }

async function boot(browser, ctx) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  delete page.__shell918;
  await shell918.arm(page, ctx);
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(URL);
  await page.waitForTimeout(1400);
  return page;
}
const defwOn = page => page.evaluate(() => {
  const d = document.getElementById('defw'); return !!d && d.classList.contains('on');
});

(async () => {
  const made = [];
  const c = census();
  /* ---------------- [1] 규칙 ---------------- */
  console.log('\n[1] 규칙 — 입구는 둘(①∧② · 화소를 잰다), 빼는 규칙은 하나');
  const A = mk('px', 'const b = await page.screenshot({ clip: box });\n');
  const G = mk('img', 'const d = ctx.getImageData(0, 0, w, h).data;\n');
  const B = mk('self', 'await page.evaluate(() => openDefeat());\nawait page.screenshot();\n');
  const D = mk('dom', 'const r = await page.evaluate(() => document.body.getBoundingClientRect());\n');
  const E = mk('cmt', '/* 이 자는 page.screenshot( 을 머리말에 적기만 한다 */\nconst r = 1;\n');
  made.push(A, G, B, D, E);

  ok('[1a] 캡처를 찍는 자는 걷개 대상이다', shell918.qualifies(A));
  ok('[1b] 화소 배열을 읽는 자도 대상이다 (`getImageData`)', shell918.qualifies(G));
  ok('[1c] 918 이 쓰던 입구(①∧②)는 그대로 남는다',
    shell918.qualifies(T('verify432.js')) && shell918.qualifies(T('verify432.js'), ENV918),
    'verify432');
  ok('[1d] 껍데기를 이름으로 말하는 자는 화소를 재도 빠진다 (356 자리 · 두 세상 모두)',
    !shell918.qualifies(B) && !shell918.qualifies(B, ENV918)
    && !shell918.qualifies(T('verify356.js')));
  ok('[1e] 화소를 안 재고 ①∧② 도 아닌 자는 안 켠다', !shell918.qualifies(D)
    && !shell918.qualifies(T('verify96.js')), 'verify96');
  ok('[1f] `cap*.js`(연출 캡처 하네스)는 화소를 재도 안 켠다 — 907 이 그은 선 그대로',
    !shell918.qualifies(T('cap01.js'))
    && shell918.RE_PX.test(raster907.stripComments(fs.readFileSync(T('cap01.js'), 'utf8'))));
  ok('[1g] 머리말에 적어 둔 말은 조건이 아니다 (주석을 걷고 묻는다)', !shell918.qualifies(E));
  ok('[1h] 손으로 적은 이름 배열이 없다 — 목록이 아니라 규칙이다',
    !/\[\s*'(verify|probe)\d/.test(fs.readFileSync(T('shell918.js'), 'utf8')));
  ok('[1i] 환경변수가 규칙을 이긴다 — 922 입구도 마찬가지',
    shell918.mode({ env: {}, entry: A }) === 'sweep'
    && shell918.mode({ env: ENV918, entry: A }) === 'off'
    && shell918.mode({ env: { PW_SHELL918: '0' }, entry: A }) === 'off'
    && shell918.mode({ env: { PW_SHELL918: 'report' }, entry: A }) === 'report');

  /* ---------------- [2] 전수 ---------------- */
  console.log('\n[2] 전수 — 여집합에서 화소를 재는 자');
  console.log('  전체 ' + c.all.length + ' = ①∧② ' + c.hit.length + ' + 화소를 재는 자 ' + c.px.length
    + '(손 ' + c.pxManual.length + ' · 이름 ' + c.pxSelf.length + ') + 안 재는 자 ' + c.none.length);
  ok('[2a] 여집합에서 화소를 재는 자가 918 등재문의 규모다 (261 ± 자 증감)', c.px.length >= 200,
    c.px.length + '개');
  ok('[2b] 그 자들이 **한 자도 빠짐없이** 대상이 됐다',
    c.px.every(f => shell918.qualifies(T(f))),
    c.px.filter(f => !shell918.qualifies(T(f))).join(' ') || '어긋남 0');
  ok('[2c] 918 만 있던 세상에서는 그 자들이 **한 개도** 대상이 아니었다 (= 등재문의 노출)',
    c.px.every(f => !shell918.qualifies(T(f), ENV918)),
    c.px.filter(f => shell918.qualifies(T(f), ENV918)).join(' ') || '어긋남 0');
  ok('[2d] 갈래는 서로 안 겹치고 합이 전체다',
    c.hit.length + c.px.length + c.pxManual.length + c.pxSelf.length + c.none.length === c.all.length);
  ok('[2e] 918 의 자동 대상 30 자리는 그대로 대상이다 (넓히면서 잃은 자 0)',
    c.auto.every(f => shell918.qualifies(T(f))), c.auto.length + '개');

  /* ---------------- [4] 사본 0 ---------------- */
  console.log('\n[4] 사본 0 — 조건은 한 곳에만 적혀 있다');
  const p922 = fs.readFileSync(T('probe922.js'), 'utf8');
  const v922 = fs.readFileSync(T('verify922.js'), 'utf8');
  const own = /const RE_PX = \/[^\n]*screenshot/;
  ok('[4a] `RE_PX` 의 주인은 `shell918` 하나다 — 재현자가 자기 사본을 안 든다',
    own.test(fs.readFileSync(T('shell918.js'), 'utf8')) && !own.test(p922) && !own.test(v922)
    && /shell918\.RE_PX/.test(p922));
  ok('[4b] 갈래 세기도 한 자리에서 읽는다 — 이 게이트는 `probe922.census` 를 부른다',
    /require\('\.\/probe922'\)/.test(v922));

  /* ---------------- 브라우저 절 ---------------- */
  const browser = await launch(chromium);
  try {
    /* [5] 그린 것 */
    console.log('\n[5] 그린 것 — «화소만 재는 자» 의 판에서 걷개가 돈다');
    const sample = c.px[0];
    console.log('  표본 entry: ' + sample + ' (①∧② 아님 · 화소를 잰다)');
    const pOn = await boot(browser, { env: {}, entry: T(sample) });
    ok('[5a] 그 판에 걷개가 심겼다', !!pOn.shell918);
    await pOn.evaluate(() => { openDefeat(); });
    await pOn.waitForTimeout(150);
    const st = await pOn.shell918();
    ok('[5b] 제품 경로가 켠 껍데기를 봤다 — 본 횟수 ≥ 1', st.seen >= 1, '본 횟수 ' + st.seen);
    ok('[5c] 그 자리에서 걷었다 — 막은 횟수 ≥ 1 (늘 0 인 팔은 아무것도 증명하지 않는다 · 353-④)',
      st.swept >= 1, '막은 횟수 ' + st.swept);
    ok('[5d] `#defw.on` 이 남아 있지 않다', (await defwOn(pOn)) === false);
    ok('[5e] 껍데기 노드 자신은 그대로다 (지우지 않는다)',
      await pOn.evaluate(() => !!document.getElementById('defw')));
    const fn = await pOn.evaluate(() => String(window.openDefeat || openDefeat));
    ok('[5f] 제품 `openDefeat` 를 감싸지 않았다 — 918 [4a] 그대로',
      /classList\.add\('on'\)/.test(fn) && !/__def540|__shell918/.test(fn));
    await pOn.close();

    /* [3] 음성항 — 껍데기를 여는 자의 세상 */
    console.log('\n[3] 음성항 — 껍데기를 여는 자(`verify356`)의 판은 안 바뀐다');
    const p356 = await boot(browser, { env: {}, entry: T('verify356.js') });
    await p356.evaluate(() => { openDefeat(); });
    await p356.waitForTimeout(150);
    ok('[3a] 그 판에는 걷개가 아예 안 심긴다', !p356.shell918);
    ok('[3b] 18 패배 화면이 열린 채 남는다 — 356 이 잴 것이 그대로 있다', (await defwOn(p356)) === true);
    await p356.close();

    /* [R] 되돌림 */
    console.log('\n[R] 되돌림 — `PW_SHELL918_PX=0` 인 세상(918 이 쓰던 조건만)');
    const pOff = await boot(browser, { env: ENV918, entry: T(sample) });
    await pOff.evaluate(() => { openDefeat(); });
    await pOff.waitForTimeout(150);
    ok('[R1] 같은 entry 인데 걷개가 안 심긴다', !pOff.shell918);
    ok('[R2] 껍데기가 켜진 채 남는다 — [5] 는 헛초록이 아니다', (await defwOn(pOff)) === true);
    ok('[R3] 그 딤은 화면 전체를 덮는 층이다 (inset:0 · z ≥ 30) — 화소를 재는 자가 이 아래에서 잰다',
      await pOff.evaluate(() => {
        const d = document.getElementById('defw'); const s = getComputedStyle(d);
        const r = d.getBoundingClientRect();
        return +s.zIndex >= 30 && r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
      }));
    ok('[R4] 918 의 자동 대상은 되돌린 세상에서도 그대로 대상이다 (되돌림이 918 을 안 끈다)',
      shell918.mode({ env: ENV918, entry: T(c.auto[0]) }) === 'sweep', c.auto[0]);
    await pOff.close();
  } finally {
    await browser.close();
    made.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
  }

  console.log('\nVERIFY922 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
