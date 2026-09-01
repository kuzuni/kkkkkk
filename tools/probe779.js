#!/usr/bin/env node
/* 779 재현 — `probe766` [2] 가 4회 중 1회 빨간 뿌리 (338 규칙: 처방 전에 제품에게 직접 묻는다)
 *
 *   node tools/probe779.js
 *
 * 등재문이 남긴 것은 **관측 다섯**이었다 — `en + q` 가 `25+25 · 28+22 · 30+19 · 31+19 · 28+22`
 * 로, 셋째가 **49** 라 `probe766` [2] 의 전칭 `en + q === 50` 이 깨졌다. 등재문의 가설은
 * «부팅 파도가 나오는 도중에 한 마리가 이미 죽거나 판을 벗어난다» 였고, 이 자가 그것을
 * **못박거나 기각한다**.
 *
 * ⚑ **재현해야 할 것은 «빨강이 났다» 가 아니다.** 한 판의 빨강 확률이 1/4 이라
 *   «이번 N회에 하나는 깨진다» 로 물으면 **그 물음 자신이 플레이키다**(766 이 [1] 을 다시 적으며
 *   남긴 교훈 · 759·775 도 같은 자리). 재현해야 하는 것은 뿌리 쪽의 **결정적인 사실**이다:
 *     ⓐ 옛 단언이 실제로 재던 것은 «부팅 파도가 반쯤 나왔는가» 가 아니라 **«첫 킬이 아직 안 났는가»** 다.
 *     ⓑ 그래서 시계를 조금만 늘리면 그 단언은 **전칭으로 거짓**이 된다(확률이 아니라 확정이다).
 *     ⓒ 킬을 셈에 넣은 항등식 `en + q + killed === ENEMY_COUNT` 는 **전 시점·전 표본**에서 참이다.
 *   ⇒ 500ms 는 첫 킬 분포의 **어깨 위**에 놓인 시점이고, 그래서 실행마다 동전이 된다.
 *
 * 출력은 전부 수치다. 처방·수정은 하지 않는다.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };

/* ── 관측 한 번 — `probe766` 의 `pre` 스냅숏과 **같은 산수**다 ─────────────────
   (같은 시점·같은 네 값. 자를 베껴 적지 않기 위해 [0] 이 그 파일의 판정문을 직접 읽는다.) */
async function snap(browser, waitMs, drop) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof makeEnemy === 'function');
  await page.waitForTimeout(waitMs);
  const r = await page.evaluate(({ drop }) => {
    S.stage = 20; S.eqSkill = ['slash']; markDirty();
    /* [R] 음성항 — «죽이지 않고» 한 마리를 지운다(killEnemy 를 안 지나므로 killed 가 안 오른다) */
    if (drop) enemies.pop();
    return { en: enemies.length, q: spawnQ.length,
             killed: (typeof killed !== 'undefined' ? killed : -1),
             pop: (typeof ENEMY_COUNT !== 'undefined' ? ENEMY_COUNT : -1) };
  }, { drop: !!drop });
  await ctx.close();
  return r;
}

/* 첫 킬이 부팅 뒤 몇 ms 에 나는가 — 500ms 창의 «여유» 를 재는 자 */
async function firstKill(browser, capMs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof makeEnemy === 'function');
  const ms = await page.evaluate(({ capMs }) => new Promise(res => {
    const t0 = performance.now();
    const iv = setInterval(() => {
      if (typeof killed !== 'undefined' && killed > 0) { clearInterval(iv); res(Math.round(performance.now() - t0)); }
      else if (performance.now() - t0 > capMs) { clearInterval(iv); res(-1); }
    }, 20);
  }), { capMs });
  await ctx.close();
  return ms;
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const K = +(process.env.PROBE779_K || 6);

  /* ── [0] 자가 둘이 되지 않게 — `probe766` [2] 의 판정문을 **파일에서 그대로 읽는다** ─────
     680 규약(«자가 둘이 되면 한쪽만 늙는다»). 이 항은 수리 전에는 빨갛고 수리 뒤에 초록이며,
     `probe766` 을 되돌리면 다시 빨개진다 = 이 작업의 **되돌림 시험**이다. */
  const SRC = fs.readFileSync(path.join(__dirname, 'probe766.js'), 'utf8');
  const stmt = (() => {
    const i = SRC.indexOf("'2 옛 장면의 시작점");
    if (i < 0) return null;
    const s = SRC.lastIndexOf('ok(', i);
    return s < 0 ? null : SRC.slice(s, SRC.indexOf(';', i) + 1);
  })();
  ok(!!stmt && /pre\.killed/.test(stmt) && !/===\s*50\b/.test(stmt),
     '0 `probe766` [2] 는 손 상수 50 이 아니라 **`killed` 를 낀 항등식**으로 적혀 있다(사본 0개 · 되돌림 시험)',
     stmt ? (stmt.split('\n')[0].trim().slice(0, 96) + ' …') : '판정문을 못 찾았다');

  /* ── [1] 500ms 는 첫 킬 분포의 «어깨» 다 ─────────────────────────────────── */
  console.log('\n  [1] 부팅 뒤 첫 킬 시각 × ' + K + ' (probe766 이 붙는 시점은 500ms)');
  const fk = [];
  for (let i = 0; i < K; i++) {
    const ms = await firstKill(browser, 4000);
    fk.push(ms);
    console.log('      run' + (i + 1) + '  첫 킬 t=' + ms + 'ms');
  }
  const fkOk = fk.filter(x => x > 0);
  ok(fkOk.length === K && med(fkOk) < 1500,
     '1 부팅 파도는 **1.5초 안에 첫 킬이 난다** — 즉 «아직 아무도 안 죽었다» 는 상태는 수백 ms 짜리 창이다',
     '첫 킬 ' + fkOk.slice().sort((a, b) => a - b).join('/') + 'ms · 중앙값 ' + med(fkOk));
  ok(Math.min(...fkOk) - 500 < 500,
     '2 그 창의 **여유가 500ms 미만**이다 — probe766 이 붙는 500ms 는 분포의 어깨 위에 놓여 있다(동전이 되는 이유)',
     '최소 첫 킬 ' + Math.min(...fkOk) + 'ms − 창 500ms = 여유 ' + (Math.min(...fkOk) - 500) + 'ms');

  /* ── [2] 시계를 늘리면 옛 단언은 «전칭으로» 거짓 ────────────────────────────
     확률이 아니라 확정이다 — 그래서 이 항은 플레이키가 아니다. */
  console.log('\n  [2] 시점별 스냅숏(`en` · `q` · `killed`) × ' + K);
  const WAITS = [500, 1500, 3000];
  const rows = {};
  for (const ms of WAITS) {
    rows[ms] = [];
    for (let i = 0; i < K; i++) rows[ms].push(await snap(browser, ms));
    console.log('      ' + String(ms + 'ms').padEnd(7) + rows[ms]
      .map(r => r.en + '+' + r.q + '=' + (r.en + r.q) + ' k' + r.killed).join('  '));
  }
  const late = rows[1500].concat(rows[3000]);
  ok(late.every(r => r.en + r.q !== r.pop),
     '3 1500·3000ms 에서 옛 전칭 `en + q === ENEMY_COUNT` 은 **한 번도 안 맞는다** — 이 단언이 재던 것은 «부팅 파도» 가 아니라 «첫 킬이 아직 안 났는가» 다',
     late.map(r => (r.en + r.q)).join(',') + ' vs ' + late[0].pop + ' (killed ' + late.map(r => r.killed).join(',') + ')');

  /* ── [3] 킬을 셈에 넣으면 항등식이 된다 ─────────────────────────────────── */
  const all = WAITS.reduce((a, ms) => a.concat(rows[ms]), []);
  ok(all.every(r => r.killed >= 0 && r.pop > 0 && r.en + r.q + r.killed === r.pop),
     '4 **`en + q + killed === ENEMY_COUNT`** 는 전 시점·전 표본에서 참이다(부팅 파도는 «나왔거나 · 대기 중이거나 · 죽었거나» 셋뿐)',
     all.length + '/' + all.length + '회 · ' + WAITS.map(ms => ms + 'ms:' + rows[ms].map(r => r.en + '+' + r.q + '+' + r.killed).join(',')).join(' · '));
  ok(all.every(r => r.killed < r.pop),
     '5 이 창에서는 부팅 파도가 **다 죽기 전**이다 — 항등식이 리필(`queueMobs` 재예약)과 섞이지 않는다',
     'killed 최댓값 ' + Math.max(...all.map(r => r.killed)) + ' < ENEMY_COUNT ' + all[0].pop);

  /* ── [4] 뜻은 그대로 살아 있다 — 500ms 는 «부팅 파도 한복판» 이다 ───────────
     766 의 결론(«시작 위상이 정의 안 돼 있었다»)이 [2] 의 존재 이유다. 자리를 비우면 안 된다(333). */
  ok(rows[500].every(r => r.q > 0),
     '6 뜻 보존 — 500ms 스냅숏은 **부팅 파도가 반쯤 나온 상태**다(대기 큐 q > 0 이 전칭으로 참)',
     'q ' + rows[500].map(r => r.q).join(',') + ' · en ' + rows[500].map(r => r.en).join(','));

  /* ── [R] 음성항 — 새 항등식이 무르게 풀린 것이 아니다 ──────────────────────
     «죽이지 않고» 한 마리를 지우면(= 판이 정말로 새면) 항등식은 곧바로 깨져야 한다. */
  console.log('\n  [R] 음성항 — 부팅 파도에서 한 마리를 «죽이지 않고» 지운다');
  const dropped = [];
  for (let i = 0; i < Math.min(3, K); i++) dropped.push(await snap(browser, 500, true));
  console.log('      ' + dropped.map(r => r.en + '+' + r.q + '+' + r.killed + '=' + (r.en + r.q + r.killed)).join('  '));
  ok(dropped.every(r => r.en + r.q + r.killed !== r.pop),
     'R 한 마리를 **죽이지 않고** 지우면 새 항등식이 곧바로 깨진다(값을 밴드에 맞춘 것이 아니다)',
     dropped.map(r => (r.en + r.q + r.killed)).join(',') + ' ≠ ' + dropped[0].pop);

  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
