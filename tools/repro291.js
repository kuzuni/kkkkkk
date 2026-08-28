/* 작업 291 — «rect 를 등장 애니메이션 한복판에서 잰다» 를 **재현**하는 도구.
 *
 * 등재문(PROGRESS 291)이 못 박은 순서: «착수하면 먼저 부하를 걸고 재현할 것 —
 * 재현 없이 44개를 일괄 수정하면 되돌림 불가능한 변경이 된다».
 *
 * 이 도구는 «게이트가 빨개지나» 를 보지 않는다(그건 단언 허용오차에 가려진다).
 * **자를 댄 그 순간에 `jzPgIn`/`jzSheetIn` 이 아직 돌고 있었나** 를 직접 본다 —
 * 그것이 병 자체이고, 게이트가 빨개지는 것은 그 병의 (간헐적인) 증상일 뿐이다.
 *
 * 44개 게이트의 공통 지문을 그대로 흉내낸다:
 *   goto → waitForTimeout(부트) → 여는 동작(goTab/open*) → waitForTimeout(고정) → rect
 * 마지막 «고정 대기» 가 끝난 프레임에서
 *   ① 아직 안 끝난 `jzPg…`·`jzSheet…` 애니메이션 수와 진행률
 *   ② 그 때문에 생기는 계측 오차 — `scale` 이 1 이 아니면 rect 가 통째로 축소돼 있다.
 *      x' = 540 + (x−540)·s 이므로 s=.985 면 좌변이 **+8.2px** 밀린다(47 §221 선례).
 * 를 재서, 부하 없음 / 부하 있음을 나란히 찍는다.
 *
 * 실행:
 *   node tools/repro291.js                 # 부하 0 · 5회
 *   node tools/repro291.js --load 6 --runs 5
 *   node tools/repro291.js --load 6 --runs 5 --wait 900   # 게이트들이 실제로 쓰는 고정 대기
 *   node tools/repro291.js --parallel 3    # 브라우저를 3개 동시에 (서브에이전트 동시 실행 재현)
 */
const path = require('path');
const { spawn } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const argv = process.argv.slice(2);
const num = (flag, def) => { const i = argv.indexOf(flag); return i < 0 ? def : parseInt(argv[i + 1], 10); };
const LOAD = num('--load', 0);
const RUNS = num('--runs', 5);
const WAIT = num('--wait', 900);
const PAR = num('--parallel', 1);
const SRC = 'file://' + path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

/* 44개 후보에서 가장 흔한 여는 동작 4종 — 전부 60 의 페이지 등장 연출을 태운다 */
const OPENERS = [
  { key: 'adv', js: 'goTab("adv");', sel: '#dunw' },
  { key: 'shop', js: 'goTab("shop");', sel: '#shopw' },
  { key: 'hero', js: 'goTab("hero",true);', sel: '#eqw' },
  { key: 'train', js: 'goTab("grow"); if(window.openTrain) openTrain();', sel: '#trw' },
];

/* 고정 대기가 끝난 «그 프레임» 에서 재는 것 — 실행 중인 입장 연출과 그로 인한 축소율 */
const PROBE = `(sel) => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const live = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '') && a.playState === 'running');
  /* 지금 연출이 걸려 있는 요소를 우선 본다 — 게이트가 자를 대는 곳이 대개 그 안이다 */
  const el = document.querySelector(sel + '.jz-o') || document.querySelector(sel)
    || document.querySelector('.jz-o');
  let scale = 1, x = 0, w = 0;
  if (el) {
    const r = el.getBoundingClientRect();
    x = r.x; w = r.width;
    /* 실효 축소율 — jzPgIn 은 개별 속성 scale: 로 준다(transform 이 아니다).
       transform 만 읽으면 늘 1 이 나와 «정착됨» 으로 오판한다. 둘을 곱해서 본다. */
    const cs = getComputedStyle(el);
    const m = new DOMMatrix(cs.transform === 'none' ? '' : cs.transform);
    const sp = parseFloat(cs.scale);
    scale = (m.a || 1) * (isNaN(sp) ? 1 : sp);
    /* 오프셋 폭(레이아웃 폭)과 rect 폭이 다르면 그 비가 곧 실효 축소율이다 */
    if (el.offsetWidth > 0) scale = w / el.offsetWidth;
  }
  return { live: live.length,
    prog: live.map(a => Math.round(((a.currentTime || 0) /
      ((a.effect && a.effect.getTiming().duration) || 1)) * 100)),
    scale, x, w };
}`;

async function oneRun(tag) {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(SRC);
  await page.waitForTimeout(900);
  const out = [];
  for (const o of OPENERS) {
    await page.evaluate(js => eval(js), o.js);
    await page.waitForTimeout(WAIT);          /* ← 44개 게이트가 하는 것과 똑같은 «고정 대기» */
    const r = await page.evaluate(o2 => eval(o2[0])(o2[1]), [PROBE, o.sel]);
    out.push({ tag, key: o.key, ...r });
  }
  await browser.close();
  return out;
}

/* --- CPU 부하 --- */
function burners(n, ms) {
  const kids = [];
  for (let i = 0; i < n; i++) {
    kids.push(spawn(process.execPath,
      ['-e', `const t=Date.now();while(Date.now()-t<${ms}){Math.sqrt(Math.random())}`],
      { stdio: 'ignore' }));
  }
  return () => kids.forEach(k => { try { k.kill('SIGKILL'); } catch (_) {} });
}

(async () => {
  console.log('작업 291 — 등장 연출 한복판 계측 재현');
  console.log(`  고정 대기 ${WAIT}ms · ${RUNS}회 · 동시 브라우저 ${PAR} · CPU 부하 ${LOAD}`);
  console.log('');
  const stop = LOAD ? burners(LOAD, RUNS * PAR * 30000) : null;
  const rows = [];
  try {
    for (let i = 1; i <= RUNS; i++) {
      const batch = await Promise.all(
        Array.from({ length: PAR }, (_, j) => oneRun(`r${i}${PAR > 1 ? '-' + (j + 1) : ''}`)));
      batch.flat().forEach(r => rows.push(r));
    }
  } finally { if (stop) stop(); }

  let bad = 0;
  for (const r of rows) {
    const mid = r.live > 0 || Math.abs(r.scale - 1) > 1e-4;
    if (mid) bad++;
    console.log('  ' + (mid ? '⚠ 연출 중' : '  정착됨 ') + ' ' + r.tag.padEnd(7) + r.key.padEnd(7)
      + ' 진행중 ' + String(r.live).padStart(2)
      + (r.prog.length ? ' ' + r.prog.map(p => p + '%').join(',') : '')
      + ' · scale ' + r.scale.toFixed(4)
      + ' · x ' + r.x.toFixed(1) + ' w ' + r.w.toFixed(1)
      + (Math.abs(r.scale - 1) > 1e-4
        ? '  → 좌변 오차 ' + (540 * (1 / r.scale - 1)).toFixed(2) + 'px' : ''));
  }
  console.log('');
  console.log(`REPRO291  연출 한복판 ${bad}/${rows.length}회`);
  process.exit(0);
})();
