/* 게이트 918 — «껍데기가 측정 창을 덮는다» 걷개가 **규칙으로** 걸려 있는가
 *
 *   node tools/verify918.js
 *
 * 무엇을 지키는가 —
 *   914 가 `verify463` 한 자리에서 찍은 병(자동 전투가 진 순간 `#defw`(inset:0 · z39)가 측정 창을
 *   통째로 덮는다)은 **한 자리의 병이 아니었다**. 907 판별기(① 스타일 태그를 붙였다 뗀다
 *   ② 그 판끼리 화소 차분)를 갖춘 자 34 중 걷개를 손으로 건 자는 3 뿐이고 나머지 30 이 같은
 *   자리에 서 있었다. 918 은 그 30곳에 한 줄씩 적는 대신 **규칙 하나**를 907 깃발·291 정착·
 *   731 소실 차단기와 같은 자리(`pwlaunch.launch()`)에 걸었다(`tools/shell918.js`).
 *
 * 절 —
 *   [1] 규칙   — 대상은 «목록» 이 아니라 «판별기» 다. 조건을 갖춘 자가 새로 생기면 자동으로 켜진다.
 *   [2] 그린 것 — 조건을 갖춘 자의 판에서 제품 경로(`openDefeat()`)를 불러도 껍데기가 **안 남는다**.
 *   [3] 음성항 — 껍데기를 **이름으로 말하는 자**(`verify356` 은 그 화면을 일부러 열어 잰다)의 판에서는
 *                걷개가 **안 돈다**. 여기가 초록이면 918 이 356 의 눈을 가린 것이다.
 *   [4] 판정 불변 — 제품 함수를 **감싸지 않는다**(540 의 `arm` 과 다른 점). 껍데기만 걷는다.
 *   [R] 되돌림 — `PW_SHELL918=0` 인 세상에서는 [2] 의 자리가 **켜진 채 남는다**(헛초록이 아님).
 *
 * 재현·전수 세기는 `tools/probe918.js`(`--scan`), 걷개 본체는 `tools/shell918.js`,
 * 걷개가 무엇을 치우는지의 규약은 `tools/closers540.js` 다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const shell918 = require('./shell918');
const closers540 = require('./closers540');
const raster907 = require('./raster907');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(__dirname);
const URL = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};
const T = f => path.join(TOOLS, f);

/* 조건(①∧②)을 갖춘 자를 규칙으로 다시 센다 — 자기 목록을 안 들고 있다는 증거이기도 하다 */
function census() {
  const out = { all: [], manual: [], self: [], auto: [] };
  for (const f of fs.readdirSync(TOOLS).filter(x => /^(verify|probe).*\.js$/.test(x)).sort()) {
    const src = fs.readFileSync(T(f), 'utf8');
    if (!raster907.classifySource(src, f).hit) continue;
    out.all.push(f);
    if (/closers540/.test(src)) out.manual.push(f);
    else if (shell918.RE_SELF.test(raster907.stripComments(src))) out.self.push(f);
    else out.auto.push(f);
  }
  return out;
}

async function boot(browser, ctx) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  delete page.__shell918;                      /* entry 규칙 대신 이 절이 정한 세상으로 심는다 */
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
  /* ---------------- [1] 규칙 ---------------- */
  console.log('\n[1] 규칙 — 대상은 목록이 아니라 판별기다');
  const c = census();
  console.log('  ①∧② ' + c.all.length + '개 = 손으로 ' + c.manual.length + ' + 이름으로 '
    + c.self.length + ' + 자동 ' + c.auto.length);

  ok('[1a] 조건을 갖춘 자가 자동 대상이다 (한 자 이상)', c.auto.length > 0, c.auto.length + '개');
  ok('[1b] 자동 대상 전부가 규칙으로 켜진다', c.auto.every(f => shell918.qualifies(T(f))),
    c.auto.filter(f => !shell918.qualifies(T(f))).join(' ') || '어긋남 0');
  ok('[1c] 손으로 거는 자(closers540)는 규칙이 안 켠다 — 이중 무장 0',
    c.manual.every(f => !shell918.qualifies(T(f))), c.manual.join(' '));
  ok('[1d] 껍데기를 이름으로 말하는 자는 규칙이 안 켠다', c.self.every(f => !shell918.qualifies(T(f))),
    c.self.join(' '));
  /* ⚑ 922 이관 — 입구가 둘이 되면서 이 항의 표본을 갈아 끼웠다. `verify540` 은 922 뒤에도 초록이지만
     그 이유가 «①∧② 밖» 이 아니라 «껍데기를 이름으로 말한다(`RE_SELF`)» 로 바뀌었다 —
     이유가 바뀐 표본을 그대로 두면 이 항은 «조건 밖» 을 안 묻는 헛초록이 된다(333 처방).
     ⇒ 두 입구 **모두**의 밖에 있는 자(`verify96` — 화소를 안 잰다)로 묻고, 540 자리는
     «이름으로 빠진다» 를 [1d] 옆에서 따로 말한다. */
  ok('[1e] 두 입구(①∧② · 화소를 잰다) 밖의 자는 안 켠다 — 세상이 한 칸도 안 바뀐다',
    !shell918.qualifies(T('verify96.js'))
    && !raster907.classifySource(fs.readFileSync(T('verify96.js'), 'utf8'), 'verify96.js').hit
    && !shell918.RE_PX.test(raster907.stripComments(fs.readFileSync(T('verify96.js'), 'utf8'))),
    'verify96 — hit 아님 · 화소 안 잼');
  ok('[1e2] `verify540`(걷개 규약 자신)은 **이름으로** 빠진다 (922 뒤 이유가 바뀐 자리)',
    !shell918.qualifies(T('verify540.js'))
    && shell918.RE_SELF.test(raster907.stripComments(fs.readFileSync(T('verify540.js'), 'utf8'))));
  ok('[1f] `cap*.js`(연출 캡처 하네스)는 조건을 갖춰도 안 켠다 — 907 이 그은 선과 같다',
    !shell918.qualifies(T('cap01.js')));
  ok('[1g] 손으로 적은 이름 배열이 없다 (조건이 늘면 자동으로 따라온다)',
    !/\[\s*'(verify|probe)\d/.test(fs.readFileSync(T('shell918.js'), 'utf8')));
  ok('[1h] 치우는 껍데기 목록을 베끼지 않고 540 에서 읽는다',
    shell918.SHELL_IDS === closers540.SHELL_IDS && closers540.SHELL_IDS.includes('defw'),
    closers540.SHELL_IDS.join(','));
  ok('[1i] 환경변수가 규칙을 이긴다 — 양방향',
    shell918.mode({ env: { PW_SHELL918: '0' }, entry: T('verify432.js') }) === 'off'
    && shell918.mode({ env: { PW_SHELL918: '1' }, entry: T('verify540.js') }) === 'sweep'
    && shell918.mode({ env: { PW_SHELL918: 'report' }, entry: T('verify540.js') }) === 'report');
  ok('[1j] 기본값은 entry 규칙이다',
    shell918.mode({ env: {}, entry: T(c.auto[0]) }) === 'sweep'
    && shell918.mode({ env: {}, entry: T('verify356.js') }) === 'off');
  const pl = fs.readFileSync(T('pwlaunch.js'), 'utf8');
  ok('[1k] `pwlaunch.launch()` 의 무장 사슬에 걸려 있다 (291·731 과 같은 자리)',
    /require\('\.\/shell918'\)/.test(pl) && /shell918\.armBrowser\(/.test(pl));

  /* ---------------- 브라우저 절 ---------------- */
  const browser = await launch(chromium);
  try {
    /* [2] 그린 것 — 조건을 갖춘 자의 세상 */
    console.log('\n[2] 그린 것 — 조건을 갖춘 자의 판에서 껍데기가 안 남는다');
    const pOn = await boot(browser, { env: {}, entry: T(c.auto[0]) });
    await pOn.evaluate(() => { openDefeat(); });
    await pOn.waitForTimeout(120);
    const stOn = await pOn.shell918();
    ok('[2a] 제품 경로가 켠 껍데기를 봤다 — 본 횟수 ≥ 1', stOn.seen >= 1, '본 횟수 ' + stOn.seen);
    ok('[2b] 그 자리에서 걷었다 — 막은 횟수 ≥ 1 (늘 0 인 팔은 아무것도 증명하지 않는다 · 353-④)',
      stOn.swept >= 1, '막은 횟수 ' + stOn.swept);
    ok('[2c] `#defw.on` 이 남아 있지 않다', (await defwOn(pOn)) === false);
    ok('[2d] 걷고 나서도 껍데기 노드 자신은 그대로다 (지우지 않는다)',
      await pOn.evaluate(() => !!document.getElementById('defw')));

    /* [4] 판정 불변 — 제품 함수를 감싸지 않는다 */
    const fn = await pOn.evaluate(() => String(window.openDefeat || openDefeat));
    ok('[4a] 제품 `openDefeat` 를 감싸지 않았다 (540 `arm` 과 다른 점 — 껍데기만 걷는다)',
      /classList\.add\('on'\)/.test(fn) && !/__def540|__shell918/.test(fn), fn.slice(0, 60) + '…');
    /* 걷개는 `SHELL_IDS` 밖의 화면을 한 장도 안 건드린다 */
    const other = await pOn.evaluate(() => {
      goTab('hero'); openDungeon();
      const d = document.getElementById('dunw');
      return { open: !!d && d.classList.contains('on') };
    });
    await pOn.waitForTimeout(200);
    const stOther = await pOn.shell918();
    ok('[4b] 목록 밖의 화면(03 던전 팝업)은 안 걷는다', other.open === true
      && stOther.swept === stOn.swept, '막은 횟수 ' + stOn.swept + ' → ' + stOther.swept);
    await pOn.close();

    /* [3] 음성항 — 껍데기를 이름으로 말하는 자의 세상에서는 안 돈다 */
    console.log('\n[3] 음성항 — 껍데기를 여는 자(`verify356`)의 판에서는 걷개가 안 돈다');
    const p356 = await boot(browser, { env: {}, entry: T('verify356.js') });
    await p356.evaluate(() => { openDefeat(); });
    await p356.waitForTimeout(200);
    ok('[3a] 그 판에는 걷개가 아예 안 심긴다', !p356.shell918);
    ok('[3b] 18 패배 화면이 열린 채 남는다 — 356 이 잴 것이 그대로 있다',
      (await defwOn(p356)) === true);
    ok('[3c] 그 판에 딤 아래 잴 것이 실제로 있다 (`#defw.on .df-card` — 356 의 표본 자리)',
      await p356.evaluate(() => document.querySelectorAll('#defw.on .df-card').length > 0));
    await p356.close();

    /* [R] 되돌림 — 걷개를 끄면 [2] 의 자리가 켜진 채 남는다 */
    console.log('\n[R] 되돌림 — `PW_SHELL918=0` 인 세상');
    const pOff = await boot(browser, { env: { PW_SHELL918: '0' }, entry: T(c.auto[0]) });
    await pOff.evaluate(() => { openDefeat(); });
    await pOff.waitForTimeout(200);
    ok('[R1] 같은 entry 인데 걷개가 안 심긴다', !pOff.shell918);
    ok('[R2] 껍데기가 켜진 채 남는다 — [2] 는 헛초록이 아니다', (await defwOn(pOff)) === true);
    ok('[R3] 그 딤은 실제로 화면 전체를 덮는 층이다 (inset:0 · z ≥ 30)',
      await pOff.evaluate(() => {
        const d = document.getElementById('defw'); const s = getComputedStyle(d);
        const r = d.getBoundingClientRect();
        return +s.zIndex >= 30 && r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
      }));
    await pOff.close();
  } finally { await browser.close(); }

  console.log('\nVERIFY918 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
