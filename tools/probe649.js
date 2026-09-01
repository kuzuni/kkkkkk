/* 작업 649 재현기 — `tools/verify169.js` C8 «HUD 골드가 지급 후 값으로 정착» 플레이키.
 *
 * 등재문(PROGRESS 649)의 진단: C8 은 `hudStart` 를 **지급 뒤에** 읽고
 * `settled && hud.txt !== hudStart` 로 «시작값과 다른 값으로 정착했는가» 를 묻는다.
 * 58 재화 흡수 롤(`fxVal`)이 그 샘플 **전에** 끝나면 시작값이 이미 정착값이라 거짓 빨강이 된다.
 *
 * 이 자는 세 가지를 잰다.
 *   §1 재현 — 자를 K 병렬 × R 판 돌려 C8 실패율을 센다(현재 트리 = 수리 후).
 *   §2 대조 — 같은 자를 **문자열로 되돌린 사본**(hudStart 를 지급 뒤에 읽는 옛 판)으로 같은 K×R.
 *              두 값의 차가 «수리가 실제로 무엇을 고쳤는가» 다.
 *   §3 뿌리 — 브라우저 한 대에서 소탕 클릭 뒤 `#goldN` 을 촘촘히 샘플해
 *              ⓐ 롤이 몇 ms 만에 끝나는지 ⓑ 옛 자가 읽던 시점(클릭 + 500ms)에 이미 정착했는지를 찍는다.
 *              ⓑ 가 참이면 옛 축은 «굴러가는 것을 봤는가» 가 아니라 «내 샘플이 롤보다 빨랐는가» 를 물은 것이다.
 *
 * 실행: node tools/probe649.js            (기본 K=5 · R=5 · §3 포함)
 *       node tools/probe649.js --par 3 --rounds 2
 *       node tools/probe649.js --only 3   (§3 만 — 빠르다)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const GATE = path.join(__dirname, 'verify169.js');
const URL = 'file://' + path.join(ROOT, 'index.html');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAR = +arg('--par', 5), ROUNDS = +arg('--rounds', 5), ONLY = arg('--only', '');

let pass = 0, fail = 0;
const ok = (t, d) => { pass++; console.log(`PASS ${t}${d ? ' — ' + d : ''}`); };
const no = (t, d) => { fail++; console.log(`FAIL ${t}${d ? ' — ' + d : ''}`); };
const chk = (c, t, d) => (c ? ok : no)(t, d);

/* ── 수리 전 자 되돌리기 ────────────────────────────────────────────────────
   649 의 수리는 «읽는 시점» 하나다 — `hudStart` 한 줄을 지급 **앞** 으로 옮겼다.
   되돌림은 그 줄을 도로 지급 **뒤**(정착 확인 직전)로 옮기는 것이고,
   두 자리 다 앵커 주석으로 집으므로 자가 나중에 자라도 이 사본은 계속 유효하다.
   ⚠ 사본 이름에 `process.pid` 를 섞는다(646 교훈 — 고정 이름은 병렬에서 남의 사본을 지운다). */
const PRE_MARK = '/* 649-ANCHOR-PRE */';
const POST_MARK = '/* 649-ANCHOR-POST */';
function preTree(srcText) {
  const line = srcText.split('\n').find(l => l.includes(PRE_MARK));
  if (!line) return null;
  const body = line.replace(PRE_MARK, '').trimEnd();
  const without = srcText.split('\n').filter(l => !l.includes(PRE_MARK)).join('\n');
  if (!without.includes(POST_MARK)) return null;
  return without.replace(POST_MARK, POST_MARK + '\n' + body);
}

/* 한 판 = `node <gate>` 를 PAR 개 동시에. C8 줄만 걷어 온다. */
function runOnce(gatePath) {
  return new Promise(res => {
    execFile(process.execPath, [gatePath], { cwd: ROOT, maxBuffer: 1 << 24, timeout: 600000 },
      (err, stdout) => {
        const line = (stdout || '').split('\n').find(l => / C8 /.test(l)) || '';
        res({ c8: /^PASS/.test(line) ? 'PASS' : /^FAIL/.test(line) ? 'FAIL' : 'MISSING',
              detail: line.replace(/^(PASS|FAIL) /, '').slice(0, 160),
              died: !!err && !line });
      });
  });
}
async function sweep(gatePath, label) {
  const tally = { PASS: 0, FAIL: 0, MISSING: 0 }; const samples = [];
  for (let r = 0; r < ROUNDS; r++) {
    const out = await Promise.all(Array.from({ length: PAR }, () => runOnce(gatePath)));
    for (const o of out) { tally[o.c8]++; if (o.c8 === 'FAIL' && samples.length < 3) samples.push(o.detail); }
    console.log(`    ${label} ${r + 1}판/${ROUNDS} — PASS ${out.filter(o => o.c8 === 'PASS').length}/${PAR}` +
                ` · FAIL ${out.filter(o => o.c8 === 'FAIL').length} · 없음 ${out.filter(o => o.c8 === 'MISSING').length}`);
  }
  return { tally, samples, total: PAR * ROUNDS };
}

(async () => {
  const src = fs.readFileSync(GATE, 'utf8');

  /* ================= §3 뿌리 — 롤이 언제 끝나는가 ================= */
  if (!ONLY || ONLY === '3') {
    const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL); await p.waitForFunction(() => typeof S !== 'undefined' && !!S.dun, null, { timeout: 20000 });
    await p.evaluate(() => {
      S.guide.idx = 99; S.best = 99;
      DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
      S.gold = 0; openDunDetail(DUNGEONS[0]);
    });
    await p.waitForTimeout(300);
    const roll = await p.evaluate(async () => {
      const el = document.getElementById('goldN');
      const t0 = performance.now();
      const at0 = el.textContent;                       /* 지급 **전** 표기 — 649 가 쓰는 기준선 */
      document.getElementById('dgdSweep').click();
      const want = fmtG(S.gold);
      const trail = [];
      let settledAt = null;
      while (performance.now() - t0 < 4000) {
        const now = performance.now() - t0, txt = el.textContent;
        if (trail.length === 0 || trail[trail.length - 1].txt !== txt) trail.push({ ms: +now.toFixed(0), txt });
        if (settledAt === null && txt === want) settledAt = +now.toFixed(0);
        await new Promise(r => setTimeout(r, 16));
      }
      /* 옛 자가 «시작값» 이라고 부르던 것 = 롤이 끝난 뒤에 읽은 표기. 결정론적으로 재현한다. */
      const lateStart = el.textContent;
      return { at0, want, settledAt, lateStart, trail: trail.slice(0, 12), steps: trail.length,
               at500: trail.filter(t => t.ms <= 500).pop() };
    });
    console.log(`    롤 자취 — ${roll.trail.map(t => `${t.ms}ms«${t.txt}»`).join(' → ')}` +
                (roll.steps > 12 ? ` … (총 ${roll.steps}단)` : ''));
    chk(roll.at0 !== roll.want,
      '3-a 지급 전 HUD 표기와 지급 후 정착값은 서로 다르다 (649 가 세운 기준선이 살아 있다)',
      `«${roll.at0}» ≠ «${roll.want}»`);
    chk(roll.settledAt !== null && roll.steps >= 2,
      '3-b 롤은 여러 단을 거쳐 정착한다 (HUD 가 «안 움직이는» 것이 아니다)',
      `${roll.steps}단 · 정착 ${roll.settledAt}ms`);
    /* ⚑ 뿌리 — 결정론적 증명. «시작값» 을 롤이 끝난 뒤에 읽으면 시작 = 정착이 되어
       옛 축 `hud.txt !== hudStart` 는 **제품이 완벽한데도** 거짓이 된다. */
    chk(roll.lateStart === roll.want,
      '3-c ⚑ 뿌리 — 롤이 끝난 뒤에 «시작값» 을 읽으면 시작 = 정착이라 옛 축 `txt !== hudStart` 가 거짓이 된다',
      `늦은 시작값 «${roll.lateStart}» = 정착값 «${roll.want}» (지급은 정상)`);
    /* 왜 단독 실행에서는 안 보이는가 — 명목 대기(500ms)가 롤 정착보다 짧아 우연히 롤 한복판을 집는다.
       부하에서는 CDP 왕복이 그 500ms 를 벌려 3-c 의 자리로 밀어 넣는다(§2 의 실패 표본이 그 증거). */
    chk(roll.settledAt !== null && roll.settledAt > 500,
      '3-d 옛 자의 명목 대기(클릭 + 500ms)는 롤 정착보다 짧다 ⇒ 단독 실행은 우연히 통과한다 (한 번만 돌리면 안 보이는 이유)',
      `정착 ${roll.settledAt}ms > 500ms · 500ms 시점 표기 «${roll.at500 ? roll.at500.txt : '?'}»`);
    await ctx.close(); await b.close();
  }

  /* ================= §1·§2 재현·대조 ================= */
  if (!ONLY || ONLY === '1') {
    console.log(`\n  §1 재현 — 현재 트리(수리 후) · ${PAR}병렬 × ${ROUNDS}판`);
    const post = await sweep(GATE, '수리 후');
    chk(post.tally.FAIL === 0 && post.tally.MISSING === 0,
      `1-a 수리 후 C8 은 ${PAR}병렬 ${ROUNDS}판에서 한 번도 안 빨개진다`,
      `PASS ${post.tally.PASS}/${post.total} · FAIL ${post.tally.FAIL} · 없음 ${post.tally.MISSING}`);

    const pre = preTree(src);
    chk(!!pre, '2-a 되돌림 사본 — `hudStart` 앵커 두 자리를 찾았다', pre ? '찾음' : '못 찾음');
    if (pre) {
      const PRE_PATH = path.join(__dirname, `.v169-pre649-${process.pid}.js`);
      fs.writeFileSync(PRE_PATH, pre);
      try {
        console.log(`\n  §2 대조 — 되돌림 사본(옛 판: 지급 뒤에 읽는다) · ${PAR}병렬 × ${ROUNDS}판`);
        const old = await sweep(PRE_PATH, '수리 전');
        chk(old.tally.FAIL > 0,
          `2-b ⚑ 되돌림 시험 — 옛 판은 같은 부하에서 실제로 빨개진다 (수리가 무엇을 고쳤는지의 증거)`,
          `PASS ${old.tally.PASS}/${old.total} · FAIL ${old.tally.FAIL}` +
          (old.samples.length ? ` · 표본: ${old.samples[0]}` : ''));
      } finally {
        try { fs.unlinkSync(PRE_PATH); }
        catch (e) { if (e.code !== 'ENOENT') console.log(`WARN 사본 정리 실패 (${e.code})`); }
      }
    }
  }

  console.log(`\nPROBE649 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
