/* 재현 922 — 딤(`#defw`)의 조건은 «스타일을 갈아 끼우는가» 가 아니라 «화소를 재는가» 다
 *
 *   node tools/probe922.js            — [P1] 여집합 세기 + [P2] 노출 재현(주입) + [R] 규칙 되돌림
 *   node tools/probe922.js --scan     — [P3] 여집합(화소를 재는 자)을 `PW_SHELL918=report` 로 돌려
 *                                        «화소를 재는 순간에 루프가 사는가» 를 실제로 센다
 *                                        (느리다 · 자당 5~90초 · `SCAN_JOBS`/`SCAN_TIMEOUT` 로 조절)
 *
 * # 왜 이 자가 필요한가 (918 §6 이 등재한 자리)
 * 918 은 걷개를 **907 의 조건**(① 스타일 태그를 붙였다 뗀다 ② 그 판끼리 화소 차분)에 걸었다.
 * 그런데 그것은 **부분 리라스터의 조건**이지 **딤의 조건이 아니다** — 딤은 `inset:0 · z39 ·
 * rgba(0,0,0,.62)` 라 스타일 교체와 무관하게 **화소를 읽는 모든 자**를 어둡게 만든다.
 * 918 의 전수 실측에서 자동 대상 30 중 **24가 루프가 살아 있는 판**이었고 그 한 판에서
 * **2개가 실제로 딤에 덮인 채 끝났다**(`probe675`·`verify669`). 같은 노출이 조건 밖에도 있는가 —
 * 그것을 세는 자가 이 파일이다.
 *
 * ⚠ 반복으로 재현하려 들지 마라(912 교훈 ① · 914 가 31판 «0/31» 을 찍은 자리다).
 *   판정은 **주입**이 맡는다: [R] 이 «화소만 재는 자» 를 하나 지어 규칙에 묻는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const raster907 = require('./raster907');
const shell918 = require('./shell918');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* «화소를 잰다» — 규칙의 주인은 걷개 쪽이다. 여기서 다시 적지 않고 **그 자리를 읽는다**
   (402 «사본을 지운다» · `verify922` [5] 가 «사본 0» 을 묻는다). */
const RE_PX = shell918.RE_PX;
/* 918 이 쓰던 조건만 남긴 세상 — «오늘 노출돼 있었나» 를 물을 때 쓴다 */
const ENV918 = { PW_SHELL918_PX: '0' };

/* 여집합을 갈래로 나눈다(정적 · 브라우저 없이 돈다) */
function census() {
  const files = fs.readdirSync(TOOLS).filter(f => /^(verify|probe).*\.js$/.test(f)).sort();
  const out = { all: [], hit: [], manual: [], self: [], auto: [], px: [], pxManual: [], pxSelf: [], none: [] };
  for (const f of files) {
    const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    const bare = raster907.stripComments(src);
    const isManual = /closers540/.test(src);
    const isSelf = shell918.RE_SELF.test(bare);
    out.all.push(f);
    if (raster907.classifySource(src, f).hit) {
      out.hit.push(f);
      if (isManual) out.manual.push(f);
      else if (isSelf) out.self.push(f);
      else out.auto.push(f);
      continue;
    }
    if (!RE_PX.test(bare)) { out.none.push(f); continue; }
    if (isManual) out.pxManual.push(f);
    else if (isSelf) out.pxSelf.push(f);
    else out.px.push(f);
  }
  return out;
}

module.exports = { census, RE_PX };

if (require.main === module) {
  if (process.argv.includes('--scan')) scan();
  else main();
}

async function main() {
  const { pw, launch } = require('./pwlaunch');
  const { chromium } = pw();
  const PNG = require('./png913').PNG();
  const URL = 'file://' + path.join(ROOT, 'index.html');

  const c = census();
  console.log('\n[P1] 여집합 세기 — 딤의 조건과 907 의 조건은 다르다');
  console.log('  `verify*`/`probe*` 전체 ' + c.all.length + '개 · ①∧② ' + c.hit.length
    + '개(자동 걷개 ' + c.auto.length + ') · **여집합에서 화소를 재는 자 ' + c.px.length + '개**'
    + ' (그중 손으로 거는 자 ' + c.pxManual.length + ' · 껍데기를 이름으로 말하는 자 ' + c.pxSelf.length + ')'
    + ' · 화소를 안 재는 자 ' + c.none.length);

  ok('[P1-a] 여집합에서 화소를 재는 자가 918 등재문의 수(261) 규모다', c.px.length >= 200,
    c.px.length + '개');
  ok('[P1-b] 918 규칙(①∧②)만 있는 세상에서는 그 자들이 **한 개도 안 걸린다** (= 등재문의 노출)',
    c.px.every(f => !shell918.qualifies(path.join(TOOLS, f), ENV918)), '표본 ' + c.px.length + '개 전수');
  ok('[P1-b2] 922 규칙에서는 그 자들이 전부 걷개 대상이 된다',
    c.px.every(f => shell918.qualifies(path.join(TOOLS, f))), '표본 ' + c.px.length + '개 전수');
  ok('[P1-c] 갈래는 서로 겹치지 않는다 (한 자가 두 칸에 안 들어간다)',
    c.hit.length + c.px.length + c.pxManual.length + c.pxSelf.length + c.none.length === c.all.length,
    c.hit.length + '+' + c.px.length + '+' + c.pxManual.length + '+' + c.pxSelf.length + '+' + c.none.length
    + ' = ' + c.all.length);
  ok('[P1-d] 껍데기를 이름으로 말하는 자는 여집합에서도 스스로 빠진다 (`verify356` 자리)',
    c.pxSelf.length > 0 && c.pxSelf.every(f => shell918.RE_SELF.test(
      raster907.stripComments(fs.readFileSync(path.join(TOOLS, f), 'utf8')))),
    c.pxSelf.join(' '));

  const browser = await launch(chromium);
  try {
    /* ---- [P2] 화소를 재는 자가 서 있는 자리에서 루프가 사는가 ---- */
    console.log('\n[P2] 루프 생존 — 부팅하고 기다렸다가 캡처하는 자의 자리');
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    delete page.__shell918;
    await shell918.arm(page, { env: { PW_SHELL918: 'report' } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto(URL);
    await page.waitForTimeout(1400);
    await page.waitForTimeout(3000);
    const st = await page.shell918();
    console.log('  rAF ' + st.raf + '틱 · S.playtime +' + st.dt + 's · 벽시계 ' + st.wall + 's');
    ok('[P2-a] 게임 루프가 그대로 돈다 (= 자동 전투가 보스에게 질 수 있다)', st.dt > 1,
      'S.playtime +' + st.dt + 's');

    /* ---- [R] 규칙 되돌림 시험 — «화소만 재는 자» 를 지어 두 규칙에 묻는다 ---- */
    console.log('\n[R] 규칙 되돌림 시험 — 지어낸 자 셋을 918 규칙과 922 규칙에 각각 묻는다');
    /* ⚠ 이름이 `verify`/`probe` 로 시작해야 규칙의 첫 조건을 지난다 · 저장소 밖(os 임시 자리)에 짓는다 */
    const tmp = f => path.join(require('os').tmpdir(), 'probe922-' + f + '-' + process.pid + '.js');
    const mk = (name, src) => { const p = tmp(name); fs.writeFileSync(p, src); return p; };
    const files = [];
    try {
      /* ⓐ 화소만 재는 자 — 스타일을 갈아 끼우지 않으므로 907 조건 밖이다 */
      const A = mk('px', 'const b = await page.screenshot({ clip: box });\n');
      /* ⓑ 껍데기를 이름으로 말하는 자 — 어느 규칙에도 안 걸려야 한다(356 자리) */
      const B = mk('self', 'await page.evaluate(() => openDefeat());\nawait page.screenshot();\n');
      /* ⓒ 화소를 안 재는 자 — 규칙 밖의 세상은 한 칸도 안 바뀐다 */
      const C = mk('dom', 'const r = await page.evaluate(() => document.body.getBoundingClientRect());\n');
      files.push(A, B, C);
      const px = f => RE_PX.test(raster907.stripComments(fs.readFileSync(f, 'utf8')));
      ok('[R-a] «화소만 재는 자» — 918 규칙에서는 안 걸리고(노출) 922 규칙에서는 걸린다',
        px(A) && !shell918.qualifies(A, ENV918) && shell918.qualifies(A));
      ok('[R-b] «껍데기를 이름으로 말하는 자» 는 화소를 재도 두 규칙 모두에서 스스로 빠진다',
        px(B) && !shell918.qualifies(B) && !shell918.qualifies(B, ENV918));
      ok('[R-c] «화소를 안 재는 자» 의 세상은 한 칸도 안 바뀐다', !px(C) && !shell918.qualifies(C));
    } finally { files.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} }); }
    await page.close();
  } finally { await browser.close(); }

  console.log('\nPROBE922 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
}

/* ---- [P3] 전수 세기 — 여집합을 report 모드로 돌려 «루프가 사는가» 를 실제로 본다 ----
   report 모드는 **걷지 않는다** — 이 스캔은 어떤 자의 세상도 바꾸지 않는다(918 §4 손잡이 표). */
async function scan() {
  const c = census();
  const only = (process.env.SCAN_ONLY || '').trim();
  const list = only ? only.split(/[\s,]+/).filter(Boolean) : c.px;
  const LOG = path.join(ROOT, 'docs', 'shots', 'shell922-scan.jsonl');
  const ROWS = path.join(ROOT, 'docs', 'shots', 'shell922-rows.jsonl');
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  if (!process.env.SCAN_APPEND) { fs.writeFileSync(LOG, ''); fs.writeFileSync(ROWS, ''); }
  const LIMIT = +(process.env.SCAN_TIMEOUT || 90) * 1000;
  const JOBS = +(process.env.SCAN_JOBS || 4);
  let i = 0, done = 0;
  const worker = async () => {
    while (i < list.length) {
      const f = list[i++];
      const t0 = Date.now();
      const code = await new Promise(res => {
        const ch = spawn(process.execPath, [path.join(TOOLS, f)], {
          cwd: ROOT, stdio: 'ignore',
          env: Object.assign({}, process.env, { PW_SHELL918: 'report', SHELL918_LOG: LOG }),
        });
        const t = setTimeout(() => {
          try { ch.kill('SIGTERM'); } catch (_) {}
          setTimeout(() => { try { ch.kill('SIGKILL'); } catch (_) {} }, 5000);
        }, LIMIT);
        ch.on('exit', c2 => { clearTimeout(t); res(c2); });
        ch.on('error', () => { clearTimeout(t); res(-1); });
      });
      const sec = +((Date.now() - t0) / 1000).toFixed(0);
      const row = { f, code, sec, cut: sec * 1000 >= LIMIT };
      fs.appendFileSync(ROWS, JSON.stringify(row) + '\n');
      done++;
      console.log('  · [' + done + '/' + list.length + '] ' + f.padEnd(20) + ' 종료 ' + code + ' · ' + sec + 's'
        + (row.cut ? ' (상한)' : ''));
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  report(LOG, ROWS);
}

/* 장부 두 벌(자별 판 기록 · 실행 기록)을 합쳐 표로 낸다 — 스캔이 중간에 끊겨도 이 함수만 다시 부르면 된다.
   `node -e "require('./tools/probe922').report()"` 로 부분 결과를 읽는다. */
function report(LOG, ROWS) {
  LOG = LOG || path.join(ROOT, 'docs', 'shots', 'shell922-scan.jsonl');
  ROWS = ROWS || path.join(ROOT, 'docs', 'shots', 'shell922-rows.jsonl');
  const rd = f => { try { return fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (_) { return []; } };
  const log = rd(LOG), rows = rd(ROWS);
  const by = {};
  for (const l of log) {
    const b = (by[l.entry] = by[l.entry] || { pages: 0, dt: 0, seen: 0, stuck: 0, raf: 0 });
    b.pages++; b.dt = Math.max(b.dt, l.dt || 0); b.seen += l.seen || 0;
    b.raf = Math.max(b.raf, l.raf || 0); b.stuck += l.stuck ? 1 : 0;
  }
  let live = 0, seen = 0, stuck = 0, cut = 0, noLog = 0;
  const hot = [];
  console.log('\n| 자 | 판 | 최대 S.playtime 증가 | 본 횟수 | 켜진 채 끝난 판 | 벽시계 | 종료 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const b = by[r.f] || null;
    if (!b) noLog++;
    const dt = b ? b.dt : 0;
    if (dt > 1) live++;
    if (b && b.seen > 0) { seen++; hot.push(r.f); }
    if (b && b.stuck > 0) stuck++;
    if (r.cut) cut++;
    if (!b || b.seen > 0 || dt > 1) {
      console.log('| `' + r.f + '` | ' + (b ? b.pages : 0) + ' | ' + dt + 's | ' + (b ? b.seen : '-')
        + ' | ' + (b ? b.stuck : '-') + ' | ' + r.sec + 's' + (r.cut ? '(상한)' : '') + ' | ' + r.code + ' |');
    }
  }
  console.log('\n돈 자 ' + rows.length + '개 · **루프가 살아 있는 자 ' + live + '개** · '
    + '이번 판에서 딤이 실제로 켜진 자 ' + seen + '개(' + (hot.join(' ') || '없음') + ') · '
    + '켜진 채 끝난 자 ' + stuck + '개 · 상한에 걸린 자 ' + cut + '개 · 장부가 빈 자 ' + noLog + '개');
  return { rows: rows.length, live, seen, stuck, cut, noLog, hot };
}

module.exports.report = report;
module.exports.scan = scan;
