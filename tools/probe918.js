/* 재현 918 — «껍데기(#defw)가 측정 창을 덮는다» 를 갖춘 자가 몇이고, 걷개가 실제로 막는가
 *
 *   node tools/probe918.js            — [P1] 갈래 세기 + [P2] 루프 생존 + [R] 되돌림 시험
 *   node tools/probe918.js --scan     — [P3] 자동 대상 전수를 `PW_SHELL918=report` 로 돌려
 *                                        «루프를 세우지 않는 자» 를 실제로 센다(느리다 · 자당 25~120초)
 *
 * 914 가 남긴 숙제는 «30곳에 한 줄씩 적어라» 가 아니라 **«어느 갈래가 노출됐는지 먼저 세라»** 였다
 * (907 교훈 ③ — 33 은 상한이지 대상 수가 아니다). 이 파일이 그 세는 자다.
 *
 * ⚠ 반복으로 재현하려 들지 마라 — 914 가 31판 연속 «0/31» 을 찍고 멈춘 자리다(912 교훈 ①).
 *   판정은 **주입**이 맡는다: [R] 이 딤을 측정 창 한복판에 직접 심는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const raster907 = require('./raster907');
const shell918 = require('./shell918');
const { chromium } = pw();
const PNG = require('./png913').PNG();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const TOOLS = path.join(ROOT, 'tools');

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* ---- 갈래 나누기 (정적) ---------------------------------------------------- */
function census() {
  const files = fs.readdirSync(TOOLS).filter(f => /^(verify|probe).*\.js$/.test(f)).sort();
  const out = { all: [], manual: [], self: [], auto: [] };
  for (const f of files) {
    const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    if (!raster907.classifySource(src, f).hit) continue;
    out.all.push(f);
    const bare = raster907.stripComments(src);
    if (/closers540/.test(src)) out.manual.push(f);
    else if (shell918.RE_SELF.test(bare)) out.self.push(f);
    else out.auto.push(f);
  }
  return out;
}

/* ---- 화소 자 --------------------------------------------------------------- */
const shot = async (page, box) => PNG.sync.read(await page.screenshot({ clip: box }));
function diffPx(a, b, tol) {
  let n = 0, mx = 0;
  const len = Math.min(a.data.length, b.data.length);
  for (let i = 0; i < len; i += 4) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > mx) mx = d;
    if (d > tol) n++;
  }
  return { n, mx };
}

/* 걷개를 «명시한 모드로» 심는다. `armBrowser` 가 이미 한 번 지나가며 자기 판정(entry 규칙)으로
   깃발을 세워 두므로, 되돌림 시험은 그 표식을 걷고 자기가 정한 모드로 다시 심는다. */
async function armAs(page, m) {
  delete page.__shell918;
  await shell918.arm(page, { env: { PW_SHELL918: m } });
  return page;
}

async function boot(browser, m) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await armAs(page, m);
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(URL);
  await page.waitForTimeout(1400);
  return page;
}

(async () => {
  if (process.argv.includes('--scan')) return scan();

  const c = census();
  console.log('\n[P1] 갈래 세기 — 907 판별기(①∧②)를 갖춘 자와 그 안의 세 갈래');
  console.log('  ①∧② 전체 ' + c.all.length + '개 · 손으로 거는 자(closers540) ' + c.manual.length
    + '개 · 껍데기를 이름으로 말하는 자 ' + c.self.length + '개 · **자동 걷개 대상 ' + c.auto.length + '개**');
  console.log('  손으로: ' + c.manual.join(' ') + '\n  이름으로: ' + c.self.join(' '));

  ok('[P1-a] 자동 대상이 하나 이상이다', c.auto.length > 0, c.auto.length + '개');
  ok('[P1-b] 손으로 거는 자는 자동 대상에서 빠진다 (이중 무장 없음)',
    c.manual.every(f => !shell918.qualifies(path.join(TOOLS, f))), c.manual.join(' ') || '없음');
  ok('[P1-c] 껍데기를 여는 자(`verify356` — `js:openDefeat()` 로 18 패배 화면을 잰다)는 빠진다',
    c.self.includes('verify356.js') && !shell918.qualifies(path.join(TOOLS, 'verify356.js')));
  ok('[P1-d] 자동 대상은 규칙이 그대로 켠다',
    c.auto.every(f => shell918.qualifies(path.join(TOOLS, f))));
  ok('[P1-e] 조건 밖의 자는 안 켠다 (`verify540` — 걷개 규약 자신)',
    !shell918.qualifies(path.join(TOOLS, 'verify540.js')));
  ok('[P1-f] 목록이 아니라 규칙이다 — 손으로 적은 이름 배열 0개',
    !/\[\s*'verify\d/.test(fs.readFileSync(path.join(TOOLS, 'shell918.js'), 'utf8')));

  const browser = await launch(chromium);
  try {
    /* ---- [P2] 루프가 살아 있나 (걷개를 안 건 세상) ---- */
    console.log('\n[P2] 루프 생존 — 자동 대상이 서 있는 자리(부팅하고 기다리는 자)');
    const p2 = await boot(browser, 'report');
    await p2.waitForTimeout(3000);
    const st2 = await p2.shell918();
    console.log('  rAF ' + st2.raf + '틱 · S.playtime +' + st2.dt + 's · 벽시계 ' + st2.wall + 's');
    ok('[P2-a] 부팅만 한 판에서 게임 루프가 그대로 돈다 (= 자동 전투가 질 수 있다)',
      st2.dt > 1, 'S.playtime +' + st2.dt + 's');
    ok('[P2-b] report 모드는 걷지 않는다 (세기만)', st2.swept === 0, '막은 횟수 ' + st2.swept);
    await p2.close();

    /* ---- [R] 되돌림 시험 — 딤을 측정 창 한복판에 심는다 ---- */
    console.log('\n[R] 되돌림 시험 — 같은 제품 경로(`openDefeat()`)를 두 세상에서 부른다');
    const BOX = { x: 0, y: 1900, width: 1080, height: 260 };   /* 하단 탭바 — 정지 UI 구간 */
    const run = async m => {
      const page = await boot(browser, m);
      /* 자동 전투가 도는 판이라 **아무것도 안 해도** 200ms 사이에 조금은 바뀐다(바닥 잡음).
         그 바닥을 먼저 재고, 신호는 그 위에서 읽는다 — 463 [0] 이 `noise` 를 먼저 묻는 것과 같은 꼴. */
      const A = await shot(page, BOX);
      await page.waitForTimeout(200);
      const N = await shot(page, BOX);
      const noise = diffPx(A, N, 8).n;
      await page.evaluate(() => { openDefeat(); });
      await page.waitForTimeout(200);
      const B = await shot(page, BOX);
      const st = page.shell918 ? await page.shell918() : null;   /* 걷개 없는 세상엔 장부도 없다 */
      const on = await page.evaluate(() => {
        const d = document.getElementById('defw'); return !!d && d.classList.contains('on');
      });
      await page.close();
      return Object.assign({ on, noise }, diffPx(N, B, 8), st || {});
    };
    const off = await run('0');
    const on = await run('1');
    const area = BOX.width * BOX.height;
    console.log('  걷개 없음 — 바닥 잡음 ' + off.noise + ' → 신호 ' + off.n + ' ('
      + (off.n / area * 100).toFixed(1) + '% · 최대 Δ' + off.mx + ') · `#defw.on` ' + off.on);
    console.log('  걷개 있음 — 바닥 잡음 ' + on.noise + ' → 신호 ' + on.n + ' ('
      + (on.n / area * 100).toFixed(1) + '% · 최대 Δ' + on.mx + ') · 막은 횟수 ' + on.swept
      + ' · 켜진 채 남음 ' + on.stuck);

    ok('[R-a] 걷개 없는 세상에서는 창의 절반 이상이 «달라졌다» 로 세어진다',
      off.n > area * 0.5, off.n + 'px = ' + (off.n / area * 100).toFixed(1) + '%');
    ok('[R-b] 걷개 없는 세상에서는 딤이 켜진 채 남는다 (클릭 말고는 끄는 경로가 없다)', off.on === true);
    ok('[R-c] 걷개 있는 세상에서는 신호가 **바닥 잡음 수준**으로 내려간다 (딤 몫 0)',
      on.n <= Math.max(on.noise * 2, 2000) && on.n < off.n / 5,
      '신호 ' + on.n + ' vs 바닥 ' + on.noise + ' (걷개 없는 세상 ' + off.n + ')');
    ok('[R-d] 막은 횟수 ≥ 1 — 늘 0 인 팔은 아무것도 증명하지 않는다(353-④)', on.swept >= 1, '막은 횟수 ' + on.swept);
    ok('[R-e] 측정이 끝난 시점에 껍데기가 안 켜져 있다', on.stuck === false);
    ok('[R-f] 제품 경로는 그대로 불렸다 — 본 횟수 ≥ 1', on.seen >= 1, '본 횟수 ' + on.seen);
  } finally { await browser.close(); }

  console.log('\nPROBE918 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/* ---- [P3] 전수 세기 — 자동 대상을 report 모드로 돌려 «루프를 세우는가» 를 실제로 본다 ---- */
async function scan() {
  const c = census();
  const list = c.auto;
  const LOG = path.join(ROOT, 'docs', 'shots', 'shell918-scan.jsonl');
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, '');
  const LIMIT = +(process.env.SCAN_TIMEOUT || 300) * 1000;
  const JOBS = +(process.env.SCAN_JOBS || 3);
  const rows = [];
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const f = list[i++];
      const t0 = Date.now();
      const code = await new Promise(res => {
        const ch = spawn(process.execPath, [path.join(TOOLS, f)], {
          cwd: ROOT, stdio: 'ignore',
          env: Object.assign({}, process.env, { PW_SHELL918: 'report', SHELL918_LOG: LOG }),
        });
        const t = setTimeout(() => { try { ch.kill('SIGKILL'); } catch (_) {} }, LIMIT);
        ch.on('exit', c2 => { clearTimeout(t); res(c2); });
        ch.on('error', () => { clearTimeout(t); res(-1); });
      });
      rows.push({ f, code, sec: ((Date.now() - t0) / 1000).toFixed(0) });
      console.log('  · ' + f.padEnd(18) + ' 종료 ' + code + ' · ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));

  const log = fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const by = {};
  for (const l of log) {
    const b = (by[l.entry] = by[l.entry] || { pages: 0, dt: 0, seen: 0, stuck: 0, raf: 0 });
    b.pages++; b.dt = Math.max(b.dt, l.dt || 0); b.seen += l.seen || 0;
    b.raf = Math.max(b.raf, l.raf || 0); b.stuck += l.stuck ? 1 : 0;
  }
  console.log('\n| 자 | 판 | 최대 S.playtime 증가 | 본 횟수 | 켜진 채 끝난 판 | 종료 |');
  console.log('|---|---|---|---|---|---|');
  let live = 0, seen = 0;
  for (const r of rows) {
    const b = by[r.f] || { pages: 0, dt: 0, seen: 0, stuck: 0 };
    if (b.dt > 1) live++;
    if (b.seen > 0) seen++;
    console.log('| `' + r.f + '` | ' + b.pages + ' | ' + b.dt + 's | ' + b.seen + ' | ' + b.stuck + ' | ' + r.code + ' |');
  }
  console.log('\n자동 대상 ' + rows.length + '개 중 **루프가 살아 있는 자 ' + live + '개** · '
    + '이번 판에서 딤이 실제로 켜진 자 ' + seen + '개  (장부: ' + path.relative(ROOT, LOG) + ')');
}
