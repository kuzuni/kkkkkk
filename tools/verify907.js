#!/usr/bin/env node
/* 작업 907 — «판 결정성» 게이트
 *
 * 903 이 `verify432` 에서 찍은 뿌리: 한 페이지에서 **스타일 태그를 갈아 끼우며** 여러 판을 찍는 자는
 * Chromium 의 **부분 리라스터(타일 재사용)** 에 노출돼 같은 화면이 «±1~19 단위 두 얼굴» 을 갖는다.
 * 처방은 브라우저 깃발 `--disable-partial-raster` 한 줄인데, **자마다 손으로 적으면 빠져도 아무도 모른다**
 * (903 §5 가 그 자리에 `[0-g]` 를 세운 이유다). 907 은 그 처방을 **공용 부트스트랩 한곳**으로 옮기고,
 * 이 자가 그 약속을 이름으로 지킨다.
 *
 * 무엇을 묻나
 *   [1] 손잡이 — `tools/pwlaunch.js` 의 `resolveArgs()` 가 게이트(`verify*.js`)에 깃발을 **기본으로** 준다.
 *       캡처 하네스(`cap*.js`)는 안 준다(291 선례 — 연출 캡처는 일부러 한복판을 찍는다).
 *       `PW_NOPR=1/0` 이 양방향 되돌림 스위치다.
 *   [2] 실물 — 한 페이지에서 태그를 붙였다 떼는 순서를 그대로 밟고 **처음 상태로 돌아와 한 장 더** 찍어
 *       첫 판과 비교한다(903 `[0-g]` 를 공용으로). 깃발 아래에서는 K판 전부 **차분 0** 이어야 한다.
 *   [R] 되돌림 시험 — 같은 순서를 `PW_NOPR=0`(깃발 끔)으로 밟으면 그 차분이 **비영이 된다**.
 *       이 항이 없으면 [2] 는 «원래 늘 0인 것» 을 굳힌 헛초록일 수 있다.
 *   [3] 전수 — 조건 ①(태그 교체)∧②(화소 차분) 을 갖춘 자가 **전부 `verify*` 이름**이라, 중앙 기본값이
 *       목록을 자동으로 덮는다. 조건을 갖춘 자가 `cap*`·`probe*` 이름으로 새로 생기면 여기서 빨개진다
 *       (그때의 처방은 그 자에서 `launch(chromium, det(opts))` 로 부르는 것이다).
 *
 * ⚠ «자 플레이키» 를 한 뿌리로 보지 마라 — 902 는 정수 양자화, 906 은 표본 구성이었다(LESSONS 903-④).
 *    이 자가 지키는 것은 **부분 리라스터 축 하나**다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch, det, DET_ARGS, resolveArgs, detEnabled } = require('./pwlaunch');

const ROOT = path.join(__dirname, '..');
const FILE = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, total = 0;
const ok = (c, msg, extra) => {
  total++; if (c) pass++;
  console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + msg + (extra ? ' — ' + extra : ''));
};

/* ── 판 순서: 903 이 찍은 «태그를 붙였다 떼며 여러 판» 을 가장 짧게 재현한다 ──
   A(맨 처음) → 태그 1(칠이 바뀌는 것) → 뗌 → 태그 2 → 뗌 → 끝판(처음 상태) → A ↔ 끝판 을 잰다.
   태그는 **칠을 바꾸는 것**이어야 리라스터가 일어난다(903 §1 ② — `outline:0` 처럼 그림이 그대로면
   판 한 장도 못 소진한다). 903 [0-g] 를 «어느 화면에서나 도는 꼴» 로 옮긴 것이다. */
const TAGS = [
  '#app,#app *{letter-spacing:0.3px!important}',
  '#app,#app *{filter:saturate(1.35)!important}',
];

async function pixelDiff(page, a, b) {
  return await page.evaluate(async ([a, b]) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = A.width; c.height = A.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(B, 0, 0);
    const db = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, mx = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > 0) { n++; if (d > mx) mx = d; }
    }
    return { n, mx };
  }, [a, b]);
}

async function runOnce(chromium, opts) {
  const browser = await launch(chromium, opts);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  /* 시간·애니메이션 갈래를 미리 죽인다 — 903 §3 ⓒ 가 «태그를 안 붙이면 차분 0» 으로 기각한 축이지만,
     이 자는 그 전제 위에서만 뜻이 있다. rAF·전이·애니메이션을 멈춘 뒤에 찍는다. */
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(200);
  const clip = { x: 0, y: 0, width: 1080, height: 1200 };
  const shot = async () => (await page.screenshot({ clip })).toString('base64');

  const first = await shot();
  const mid = [];
  for (const css of TAGS) {
    const h = await page.addStyleTag({ content: css });
    await page.waitForTimeout(90);
    mid.push(await shot());
    await page.evaluate(el => el.remove(), h);
    await page.waitForTimeout(90);
    mid.push(await shot());
  }
  const last = await shot();
  const canary = await pixelDiff(page, first, last);
  /* 태그가 실제로 칠을 바꿨는지 — 안 바뀌면 이 순서는 리라스터를 안 일으켜 [R] 이 뜻을 잃는다. */
  const moved = await pixelDiff(page, first, mid[0]);
  await browser.close();
  return { canary, moved, errs };
}

(async () => {
  console.log('907 — 판 결정성(부분 리라스터) 게이트\n');

  /* ── [1] 손잡이 — 브라우저 없이 순수 함수로 묻는다 ───────────── */
  console.log('[1] 공용 부트스트랩의 깃발 규칙');
  const F = DET_ARGS[0];
  const R = (opts, entry, env) => resolveArgs(opts, { entry, env }).args || [];
  ok(R({}, 'verify432.js', {}).includes(F),
     '[1-a] 게이트(`verify*.js`)는 기본으로 깃발이 켜진다', F);
  ok(!R({}, 'cap12.js', {}).includes(F),
     '[1-b] 캡처 하네스(`cap*.js`)는 기본이 꺼짐 — 291 선례(연출은 한복판을 찍는다)');
  ok(R({}, 'cap12.js', { PW_NOPR: '1' }).includes(F),
     '[1-c] `PW_NOPR=1` 은 entry 무관 켠다(A/B 세기용 · probe907)');
  ok(!R({ args: [F] }, 'verify432.js', { PW_NOPR: '0' }).includes(F),
     '[1-d] `PW_NOPR=0` 은 자가 손으로 적어 둔 깃발까지 끈다(되돌림 스위치)');
  const dup = R(det({ args: [F] }), 'verify432.js', {}).filter(a => a === F);
  ok(dup.length === 1, '[1-e] 깃발이 두 번 안 붙는다(자가 손으로 적어도)', dup.length + '개');
  ok(R({ args: ['--font-render-hinting=none'] }, 'verify432.js', {}).includes('--font-render-hinting=none'),
     '[1-f] 자가 적어 둔 다른 args 는 그대로 남는다');

  /* ── [3] 전수 — 조건을 갖춘 «게이트» 가 전부 깃발 아래 있나 ───── */
  console.log('\n[3] 조건 ①(태그 교체)∧②(화소 차분) 전수 — 공용 부트스트랩이 덮는가');
  const { classify } = require('./raster907');
  const files = fs.readdirSync(__dirname).filter(f => /\.js$/.test(f));
  const hits = files.map(f => Object.assign(classify(f, __dirname), { name: f })).filter(r => r.hit);
  const gates = hits.filter(r => /^verify/.test(r.name) && r.name !== 'verify907.js');
  const missed = gates.filter(r => !detEnabled({ entry: path.join(__dirname, r.name), env: {} }));
  ok(gates.length > 0, '[3-a] 조건을 갖춘 게이트가 실제로 있다(전제 · 판별기가 죽으면 빨갛다)',
     gates.length + '개');
  ok(missed.length === 0,
     '[3-b] 그 게이트 전부가 깃발 아래다 — 새 게이트가 조건을 갖추면 자동으로 켜진다',
     missed.length ? missed.map(r => r.name).join(', ') : '0개');
  /* ⚑ 재현기(`probe*`·`cal*`)는 **일부러** 안 켠다 — 그들의 일이 «두 얼굴을 세는 것» 이라
     깃발을 기본으로 주면 `probe903`·`probe907` 이 자기가 세려던 것을 못 센다(자가 자기 눈을 가린다). */
  const probes = hits.filter(r => !/^verify/.test(r.name));
  const wrongOn = probes.filter(r => detEnabled({ entry: path.join(__dirname, r.name), env: {} }));
  ok(wrongOn.length === 0,
     '[3-c] 재현기(`probe*`·`cal*`)는 기본이 꺼짐 — 두 얼굴을 세는 것이 그들의 일이다',
     probes.length + '개 중 켜진 것 ' + wrongOn.length + '개');
  /* 조건 밖 게이트의 세상은 한 칸도 안 바뀐다 — 907 이 실측한 것은 조건 안 16개뿐이다. */
  const outside = files.filter(f => /^verify/.test(f) && !hits.some(h => h.name === f));
  const leaked = outside.filter(f => detEnabled({ entry: path.join(__dirname, f), env: {} }));
  ok(leaked.length === 0,
     '[3-d] 조건 밖 게이트 ' + outside.length + '개는 깃발이 안 켜진다(라스터 경로 불변 — 907 이 잰 것은 조건 안뿐)',
     leaked.length ? leaked.slice(0, 5).join(', ') : '0개');

  /* ── [2]·[R] 실물 ─────────────────────────────────────────── */
  const { chromium } = pw();
  console.log('\n[2] 깃발 아래 — 판 전체가 얼어 있다(903 `[0-g]` 를 공용으로)');
  const on = [];
  for (let i = 0; i < 2; i++) on.push(await runOnce(chromium, det({})));
  ok(on.every(r => r.moved.n > 0),
     '[2-a] 전제 — 주입한 태그가 실제로 칠을 바꾼다(안 바뀌면 이 순서는 리라스터를 안 일으킨다)',
     on.map(r => r.moved.n + 'px').join(' · '));
  ok(on.every(r => r.canary.n === 0),
     '[2-b] 태그를 다 붙였다 뗀 **뒤** 처음 상태로 돌아온 판 ↔ 첫 판 차분 = 0',
     on.map(r => r.canary.n + 'px').join(' · '));
  ok(on.every(r => r.errs.length === 0), '[2-c] 콘솔 에러 0건',
     on.reduce((a, r) => a + r.errs.length, 0) + '건');

  console.log('\n[R] 되돌림 시험 — 깃발을 끄면 그 차분이 되살아난다');
  const N = 4;
  const off = [];
  for (let i = 0; i < N; i++) {
    process.env.PW_NOPR = '0';
    off.push(await runOnce(chromium, det({})));
    delete process.env.PW_NOPR;
  }
  const revived = off.filter(r => r.canary.n > 0).length;
  ok(revived > 0,
     '[R-a] `PW_NOPR=0` 으로 같은 순서를 ' + N + '회 밟으면 «얼지 않은 판» 이 나온다(헛초록 방지)',
     revived + '/' + N + '회 비영 · ' + off.map(r => r.canary.n).join('/') + 'px');

  console.log('\nVERIFY907 ' + pass + '/' + total + (pass === total ? '  ALL PASS' : '  FAIL'));
  process.exit(pass === total ? 0 : 1);
})();
