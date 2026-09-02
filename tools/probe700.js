#!/usr/bin/env node
/* 700 재현 — «유물 소환에 배수 토글을 놓을 자리가 실제로 어디인가» 를 **찍힌 좌표로** 묻는다
 *
 *   node tools/probe700.js
 *
 * 주인 지시(2026-09-02 02:10): «유물소환도 x1000 x100 x10 x1 이런모드 있게 해줘 아까 말했던거처럼 토글로해서».
 *
 * 338 규칙 — 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다. 이 자가 묻는 것은 다섯이다.
 *
 *   [1] 수리 전에 토글이 정말 **0개**인가 (등재문의 «없다»)
 *   [2] 등재문이 권한 «띠를 넓혀라» 를 **아래(안내문 밑 `--rw-g3`)** 로 풀 수 있는가
 *       ⚑ **처방을 가른 값이다** — 1600 에서 그 띠가 공용 셸 98 보다 작으면 아래로는 못 낸다.
 *   [3] 그러면 자리는 어디인가 — **격자 하변 ↔ 수반 상변** 빈 띠가 네 프레임 전부 118 이상인가
 *       (98 + 수반 위 여백 20). 여기라면 예산을 한 픽셀도 안 건드린다.
 *   [4] 수리 전에는 «한 번에 한 장» 뿐인가 — 배치 경로(`summonRelicBatch`)가 아예 없는가
 *   [5] ⚑ **등가성 재현** — 코어를 `relicDrawOne` 으로 가른 뒤에도 **×1 경로가 한 글자도 안 달라졌는가**.
 *       씨앗 고정 RNG 로 수리 전/후 트리에서 각각 100회 소환해 **뽑힌 순서·잔액·레벨**을 대조한다.
 *       (668 §1 의 ⓒ 축과 같은 자리 — 그것이 없으면 «이미 참인 것을 게이트로 굳히는» 338 전례가 된다)
 *
 * 756 — «수리 전 사본» 은 얕은 클론에서도 공용 사다리(`gitrev756`)가 알아서 판다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const G = require('./gitrev756');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const SHELL_H = 98;            /* 공용 서브탭 셸 `.stabs` 높이(96·437 규약 — 줄이지 않는다) */
const BASIN_GAP = 20;          /* 700 이 고른 «바 하변 ↔ 수반 상변» 여백 */
const FRAMES = [1600, 1920, 2280, 2600];

let pass = 0, fail = 0, hold = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const skip = (name, why) => { console.log('HOLD ' + name + ' — ' + why); hold++; };

/* 수리 전 사본 — 이 작업이 손대기 직전의 `index.html`.
   갈림점(merge-base)의 것을 쓴다: 내 회차 커밋이 쌓여도 «수리 전» 이 안 흔들린다.
   ⚠⚠ **사본은 저장소 루트에 둔다 — /tmp 는 오답이다**(360·367·438·439·453·467·471·541 선례).
      index.html 이 `assets/**` 와 웹폰트를 **상대 경로**로 물고 있어 /tmp 에서는 통째로 404 가 되고,
      서체가 폴백으로 갈리면 **글줄이 늘어난다** — 1회차에 실제로 그 함정을 밟았다:
      안내문(`.rw-cap`)이 2줄(88) 대신 3줄(132)이 되어 «안내문 밑 띠» 가 1600 에서 44 가 아니라
      **0** 으로 읽혔다. 값이 «더 나쁜 쪽» 이라 결론([2] 은 그래도 참)은 안 뒤집혔지만,
      그대로 뒀으면 이 자가 «없는 44px» 을 근거로 남겼을 것이다(A1 10회차와 같은 종류의 사고).
   이름에 pid 를 섞는다(648 규약 — 병렬 실행이 서로의 사본을 안 지운다). `.gitignore` 의
   `/.*.html` 이 이미 덮으므로 강제 종료로 남아도 커밋에 딸려 가지 않는다. */
function preTree() {
  let base;
  try {
    base = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) { return { ok: false, env: true, why: 'merge-base 를 못 읽는다(원격 참조 없음)' }; }
  const r = G.ensure(base);
  if (!r.ok) return { ok: false, env: !!r.env, why: r.why || ('객체 없음: ' + base) };
  let src;
  try {
    src = execFileSync('git', ['show', base + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) { return { ok: false, env: false, why: 'git show 실패: ' + e.message }; }
  const f = path.join(ROOT, '.p700-pre-' + process.pid + '.html');
  fs.writeFileSync(f, src);
  return { ok: true, sha: base, file: f, url: 'file://' + f.replace(/\\/g, '/') };
}
const cleanup = pre => { if (pre && pre.file) { try { fs.unlinkSync(pre.file); } catch (_) {} } };

async function open(browser, url, height) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.waitForTimeout(220);
  return { ctx, page };
}

/* 씨앗 고정 LCG — 두 트리에서 **같은 수열**을 준다(등가성 대조의 유일한 조건). */
const SEEDED = `(seed => { let s = seed >>> 0;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(20260902)`;

(async () => {
  const browser = await launch(chromium);
  const pre = preTree();

  /* ── [1]·[2]·[3] 자리 — 수리 전 트리에서 잰다 ─────────────────────────────── */
  if (!pre.ok) {
    if (pre.env) { skip('[1]~[3]·[5] 수리 전 사본', pre.why); }
    else { ok(false, '[1]~[3]·[5] 수리 전 사본을 못 꺼냈다', pre.why); }
  } else {
    const band = [];
    for (const H of FRAMES) {
      const { ctx, page } = await open(browser, pre.url, H);
      const r = await page.evaluate(() => {
        S.relic = 1e9; openRelw();
        const R = s => { const e = document.querySelector(s); const q = e.getBoundingClientRect();
          return { t: +q.top.toFixed(1), b: +q.bottom.toFixed(1) }; };
        return {
          toggles: document.querySelectorAll('#relw [data-mul]').length,
          below: +(R('.rw-panel').b - R('.rw-cap').b).toFixed(1),   /* 안내문 밑 띠 = --rw-g3 */
          free: +(R('.rw-mid').t - R('.rw-grid').b).toFixed(1)      /* 격자 ↔ 수반 빈 띠 */
        };
      });
      band.push({ H, ...r });
      await ctx.close();
    }
    ok(band.every(b => b.toggles === 0),
      '[1] 수리 전 — `#relw` 안 배수 토글 노드 0개',
      band.map(b => b.H + ':' + b.toggles).join(' · '));

    const tight = band.filter(b => b.below < SHELL_H);
    ok(tight.length > 0,
      '[2] 수리 전 — «안내문 밑으로 띠를 낸다» 가 **성립하지 않는 프레임이 있다**(셸 98 미만)',
      band.map(b => b.H + ':' + b.below).join(' · ') + ' — 셸 ' + SHELL_H);

    ok(band.every(b => b.free >= SHELL_H + BASIN_GAP),
      '[3] 수리 전 — «격자 ↔ 수반» 빈 띠가 네 프레임 전부 ' + (SHELL_H + BASIN_GAP) + ' 이상 = 자리가 이미 있다',
      band.map(b => b.H + ':' + b.free).join(' · '));
  }

  /* ── [4] 배치 경로가 없다 ────────────────────────────────────────────────── */
  if (pre.ok) {
    const { ctx, page } = await open(browser, pre.url, 2280);
    const r = await page.evaluate(() => ({
      batch: typeof summonRelicBatch, core: typeof relicDrawOne,
      one: typeof summonRelic, mul: typeof relMul
    }));
    ok(r.batch === 'undefined' && r.core === 'undefined' && r.mul === 'undefined' && r.one === 'function',
      '[4] 수리 전 — 배치·코어·배수 축이 전부 없다(«한 번에 한 장» 뿐)',
      'batch=' + r.batch + ' core=' + r.core + ' relMul=' + r.mul + ' one=' + r.one);
    await ctx.close();
  }

  /* ── [5] 등가성 — 수리 전/후에서 ×1 100회가 **완전히 같은가** ───────────── */
  const run100 = async url => {
    const { ctx, page } = await open(browser, url, 2280);
    const r = await page.evaluate(SEED => {
      eval(SEED);
      S.relic = 1e7; S.own = {}; S.summons = 0; S.cnt.sumRelic = 0;
      openRelw();
      const seq = [];
      for (let i = 0; i < 100; i++) { const it = summonRelic(true); seq.push(it ? it.id : '∅'); }
      return { seq: seq.join(','), relic: S.relic, sum: S.cnt.sumRelic,
        lv: Object.keys(S.own).sort().map(k => k + ':' + S.own[k].l).join(' ') };
    }, SEEDED);
    await ctx.close();
    return r;
  };
  const after1 = await run100(URL);
  if (pre.ok) {
    const before1 = await run100(pre.url);
    const same = before1.seq === after1.seq && before1.relic === after1.relic
      && before1.sum === after1.sum && before1.lv === after1.lv;
    const diff = before1.seq.split(',').filter((v, i) => v !== after1.seq.split(',')[i]).length;
    ok(same, '[5] ×1 100회 — 수리 전/후가 **완전히 같다**(코어를 갈랐어도 ×1 은 한 글자도 안 변했다)',
      '어긋난 칸 ' + diff + '/100 · 잔액 ' + before1.relic + '↔' + after1.relic);
  }

  /* ── [6] 수리 후 — ×100 한 번이 ×1 100번과 같은가(설계의 항등식) ────────── */
  const runMul = async () => {
    const { ctx, page } = await open(browser, URL, 2280);
    const r = await page.evaluate(SEED => {
      eval(SEED);
      S.relic = 1e7; S.own = {}; S.summons = 0; S.cnt.sumRelic = 0;
      openRelw();
      const seq = [];
      const push = it => seq.push(it ? it.id : '∅');
      /* 코어를 직접 100번 — «×100 한 번» 이 도는 그 자리 */
      relMul = 100;
      const before = S.relic;
      summonRelicBatch(100, true);
      return { relic: S.relic, spent: before - S.relic, sum: S.cnt.sumRelic,
        lv: Object.keys(S.own).sort().map(k => k + ':' + S.own[k].l).join(' ') };
    }, SEEDED);
    await ctx.close();
    return r;
  };
  const bulk = await runMul();
  ok(bulk.lv === after1.lv && bulk.relic === after1.relic && bulk.sum === after1.sum,
    '[6] 수리 후 — «×100 한 번» 이 «×1 을 100번» 과 **장부까지 같다**',
    '잔액 ' + bulk.relic + '↔' + after1.relic + ' · 소환수 ' + bulk.sum + '↔' + after1.sum
    + ' · 레벨 ' + (bulk.lv === after1.lv ? '일치' : bulk.lv + ' ↔ ' + after1.lv));
  ok(bulk.spent === 100 * 100,
    '[7] 수리 후 — ×100 한 번의 지불은 정확히 100 × 100', '지불 ' + bulk.spent);

  await browser.close();
  cleanup(pre);
  console.log('\nPROBE700 ' + pass + '/' + (pass + fail) + (hold ? ' (⏸ 보류 ' + hold + ')' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
