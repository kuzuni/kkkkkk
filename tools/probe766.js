#!/usr/bin/env node
/* 766 재현 — `probe504` [A2] 가 실행마다 갈리는 뿌리 (338 규칙: 처방 전에 제품에게 직접 묻는다)
 *
 *   node tools/probe766.js
 *
 * 등재문(PROGRESS 766)이 남긴 갈래는 둘이었다:
 *   ⓐ **분포가 옮겨 갔다** — 스폰·리필·이동 계열 작업이 그 뒤 지나가 실제 판의 개체수가 커졌다.
 *   ⓑ **상한 32 가 원래 좁았다** — POP=23 에서 «같은 자리» 로 고른 값이라 잰 분포가 아니다.
 *
 * 이 자가 재는 것은 **셋째 갈래**이고, 아래 [1]~[3] 이 그것을 못박는다:
 *   ⓒ **장면의 시작 위상이 정의돼 있지 않다.** `probe504` [A] 는 판을 되돌리는 대신
 *     `enemies.length = 0` 한 줄만 쓴다. 그 순간 **`spawnQ` 는 그대로 남는다** — `goto` 뒤
 *     `waitForTimeout(500)` 동안 제품의 RAF 루프가 부팅 파도(`queueMobs()` 50마리,
 *     `delay = i*0.02 + rnd(0,0.3)`)를 **몇 마리까지 꺼냈는가**가 기계 속도로 정해지고,
 *     그 남은 큐가 첫 파도의 크기를 정한다. 판 위 마릿수는 «50까지 채운 뒤 처치로 빠지고
 *     비면 다시 채우는» 톱니(step ④ `enemies.length===0 && spawnQ.length===0` → `queueMobs()`)라,
 *     첫 파도가 작으면 60초 창이 **두 번째 톱니의 봉우리**를 덮어 중앙값이 통째로 올라간다.
 *   ⇒ 값이 아니라 **창의 위상**이 흔들린 것이므로, 고칠 자리는 문턱이 아니라 장면이다.
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

const RULE = require('./rul504');          /* POP 은 여기 한 곳에서만 선언된다(680) */
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* `probe504` [A2] 의 단언 밴드 — **여기서 다시 적지 않는다**. 자가 둘이 되면 한쪽만 늙는다(680). */
const A2 = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'probe504.js'), 'utf8');
  const m = src.match(/A\.nMed\s*>=\s*(\d+)\s*&&\s*A\.nMed\s*<=\s*(\d+)/);
  return m ? { lo: +m[1], hi: +m[2] } : null;
})();

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };

/* ── 관측 한 번 ────────────────────────────────────────────────────────────
   `scene`: 'old' = 옛 [A](손으로 `enemies.length = 0`) · 'new' = 620 규약(`spawnStage()` + `killed` 고정).
   나머지(60초·0.5초 표본·앞 5초 제외·중앙값)는 `probe504` [A] 와 **같은 산수**다. */
async function observe(browser, scene, waitMs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof makeEnemy === 'function');
  await page.waitForTimeout(waitMs);
  const r = await page.evaluate(({ scene }) => {
    S.stage = 20; S.eqSkill = ['slash']; markDirty();
    /* 장면을 잡기 **직전**의 부팅 상태 — 옛 장면에서 값을 정하는 것이 이것이다 */
    const pre = { en: enemies.length, q: spawnQ.length, killed: (typeof killed !== 'undefined' ? killed : -1) };
    if (scene === 'new') spawnStage(); else enemies.length = 0;
    const cnt = [], snaps = [], kind = {};
    const SNAP_AT = [15, 30, 45].map(t => t * 60);
    let bossFrames = 0;
    for (let f = 0; f < 60 * 60; f++) {
      step(1 / 60);
      if (scene === 'new') killed = 0;         /* 620 — 이 창은 «일반 전투» 다 */
      if (enemies.some(e => e.tk === 'boss')) bossFrames++;
      if (f % 30 === 0 && f > 60 * 5) {
        const live = enemies.filter(e => e.hp > 0);
        cnt.push(live.length);
        live.forEach(e => { kind[e.tk] = (kind[e.tk] || 0) + 1; });
      }
      if (SNAP_AT.indexOf(f) >= 0) snaps.push(enemies.filter(e => e.hp > 0).length);
    }
    const m = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
    return { pre, nMed: m(cnt), nMin: Math.min(...cnt), nMax: Math.max(...cnt),
             samples: cnt.length, snaps, bossFrames, kinds: Object.keys(kind).join(',') };
  }, { scene });
  await ctx.close();
  return r;
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const K = +(process.env.PROBE766_K || 5);       /* 실행 수 — 분포를 잡는 최소치(759 가 쓴 방법) */

  ok(!!A2, '0 `probe504` [A2] 의 밴드를 파일에서 그대로 읽었다(사본 0개)',
     A2 ? '[' + A2.lo + ', ' + A2.hi + '] · POP=' + RULE.POP : '정규식이 못 찾았다');
  const band = A2 || { lo: 12, hi: 32 };
  const outOf = v => v < band.lo || v > band.hi;

  /* ── [1] 옛 장면 재현 — 등재문의 «33·34» 가 다시 나오는가 ───────────────── */
  console.log('\n  [1] 옛 장면(`enemies.length = 0` — 부팅 큐가 남는다) × ' + K);
  const old = [];
  for (let i = 0; i < K; i++) {
    const r = await observe(browser, 'old', 500);
    old.push(r);
    console.log('      run' + (i + 1) + '  부팅(en ' + r.pre.en + ' · q ' + r.pre.q + ')  중앙값 '
      + r.nMed + '  범위 ' + r.nMin + '~' + r.nMax + '  스냅 ' + r.snaps.join('/')
      + (outOf(r.nMed) ? '   ⟵ [A2] 밖' : ''));
  }
  const oldOut = old.filter(r => outOf(r.nMed));
  /* ⚑ **«이번 K회에 빨강이 하나는 나온다» 로 물으면 그 물음 자신이 플레이키다** — 1회차에
     그렇게 적었다가 0/5 회로 기각당했다(등재문의 실측도 2/4 였다). 재현해야 할 것은
     «빨강이 났다» 가 아니라 **«상한에 붙어 산다»** 이고, 그것이 실행마다 갈리는 이유다. */
  const marginOf0 = v => Math.min(v - band.lo, band.hi - v);
  const mgOld5 = Math.min(...old.map(r => marginOf0(r.nMed)));
  ok(mgOld5 <= 2 && med(old.map(r => r.nMed)) > band.hi - 6,
     '1 옛 장면의 값은 [A2] 상한에 **붙어 산다** — 그래서 실행마다 갈린다(등재문 재현)',
     '중앙값 ' + old.map(r => r.nMed).join(',') + ' (상한 ' + band.hi + ') · 최소 여유 ' + mgOld5
     + ' · 이번 ' + K + '회 중 밴드 밖 ' + oldOut.length + '회');
  ok(old.every(r => r.pre.en + r.pre.q === 50) && old.some(r => r.pre.q > 0),
     '2 옛 장면의 시작점은 **부팅 파도가 반쯤 나온 상태**다(en + q = 50 · q > 0)',
     old.map(r => r.pre.en + '+' + r.pre.q).join(' · '));

  /* ── [2] 새 장면 — 620 규약(`spawnStage()` + `killed` 고정) ────────────── */
  console.log('\n  [2] 새 장면(`spawnStage()` — 판을 통째로 되돌린다) × ' + K);
  const neu = [];
  for (let i = 0; i < K; i++) {
    const r = await observe(browser, 'new', 500);
    neu.push(r);
    console.log('      run' + (i + 1) + '  부팅(en ' + r.pre.en + ' · q ' + r.pre.q + ')  중앙값 '
      + r.nMed + '  범위 ' + r.nMin + '~' + r.nMax + '  스냅 ' + r.snaps.join('/')
      + '  보스프레임 ' + r.bossFrames + (outOf(r.nMed) ? '   ⟵ [A2] 밖' : ''));
  }
  ok(neu.every(r => !outOf(r.nMed)), '3 새 장면은 [A2] 밴드 안에 전부 들어온다(문턱은 한 칸도 안 건드렸다)',
     '중앙값 ' + neu.map(r => r.nMed).join(',') + ' ⊂ [' + band.lo + ', ' + band.hi + ']');
  /* ⚑ **폭이 아니라 «자리» 다** — 1회차에 «새 장면의 폭이 더 좁다» 를 물었다가 기각당했다
     (옛 4 → 새 8). 옛 장면은 **좁게 뭉쳐 있되 그 뭉침이 상한에 붙어 있고**(29~33 · 천장 32),
     새 장면은 넓어도 밴드 한복판에 있다. 플레이키를 정하는 것은 흔들림의 폭이 아니라
     **가장자리까지의 여유**이므로 그것을 잰다. */
  const marginOf = v => Math.min(v - band.lo, band.hi - v);      /* 음수면 밴드 밖 */
  const mgOld = Math.min(...old.map(r => marginOf(r.nMed)));
  const mgNew = Math.min(...neu.map(r => marginOf(r.nMed)));
  ok(mgNew > mgOld, '4 새 장면은 밴드 가장자리에서 더 멀다(플레이키를 정하는 것은 폭이 아니라 여유다)',
     '최소 여유 — 옛 ' + mgOld + ' → 새 ' + mgNew
     + ' · 폭은 오히려 옛 ' + (Math.max(...old.map(r => r.nMed)) - Math.min(...old.map(r => r.nMed)))
     + ' < 새 ' + (Math.max(...neu.map(r => r.nMed)) - Math.min(...neu.map(r => r.nMed))));
  ok(neu.every(r => r.bossFrames === 0), '5 새 장면의 60초는 **끝까지 일반 전투**다(보스 국면 0프레임)',
     '옛 장면 보스프레임 ' + old.map(r => r.bossFrames).join(',') + ' → 새 ' + neu.map(r => r.bossFrames).join(','));
  ok(neu.every(r => r.snaps.every(n => n > 0)), '6 새 장면의 504-STD 세 프레임이 전부 비지 않았다([B] 재료)',
     neu.map(r => r.snaps.join('/')).join(' · '));

  /* ── [3] 뿌리 지목 — 옛 장면의 값은 «부팅 큐» 가 정한다 ─────────────────
     `waitForTimeout` 을 바꾸면 부팅 파도가 나온 만큼이 달라진다. 그것이 값을 움직이면
     흔들림의 원인은 제품의 개체수가 아니라 **하네스가 붙은 시점**이다. */
  console.log('\n  [3] 붙는 시점(`waitForTimeout`)을 바꾼다 — 값이 따라 움직이는가');
  /* ⚠ **한 시점에 한 번만 재면 시점 효과와 난수 잡음이 한 숫자에 섞인다** — 1회차에 그렇게
     물었다가 «옛 폭 5 · 새 폭 7» 로 기각당했다(그 폭은 둘 다 잡음이다). 시점마다 REP 회씩
     재서 **시점 사이의 흔들림**(시점별 중앙값의 폭)을 **같은 시점 안의 흔들림**(최악 폭)과
     견준다. 시점이 값을 움직이면 앞이 뒤보다 크다. */
  const WAITS = [200, 500, 1500, 3000];
  const REP = +(process.env.PROBE766_REP || 3);
  const w = { old: [], new: [] };
  const per = { old: [], new: [] };
  for (const ms of WAITS) {
    const row = { old: [], new: [], q: [] };
    for (let r = 0; r < REP; r++) {
      const a = await observe(browser, 'old', ms);
      const b = await observe(browser, 'new', ms);
      w.old.push({ ms, ...a }); w.new.push({ ms, ...b });
      row.old.push(a.nMed); row.new.push(b.nMed); row.q.push(a.pre.q);
    }
    per.old.push({ ms, q: med(row.q), med: med(row.old), rng: Math.max(...row.old) - Math.min(...row.old), each: row.old });
    per.new.push({ ms, q: med(row.q), med: med(row.new), rng: Math.max(...row.new) - Math.min(...row.new), each: row.new });
    console.log('      ' + String(ms + 'ms').padEnd(7) + '(남은 큐 q ' + String(med(row.q)).padStart(2) + ')'
      + '  옛 ' + row.old.join('/').padEnd(11) + '중앙값 ' + String(med(row.old)).padStart(2)
      + '    새 ' + row.new.join('/').padEnd(11) + '중앙값 ' + String(med(row.new)).padStart(2));
  }
  /* ⚠ **«시점 사이 폭 > 시점 안 폭» 으로 물으면 REP=3 짜리 표본에는 힘이 모자란다** —
     1회차에 그렇게 적었다가 «옛 8 > 안 7 · 새 5 ≤ 안 3» 으로 반쯤만 맞았다.
     시점은 **q 를 통해서만** 값에 닿으므로([3] 표의 q 열), 두 장면을 **같은 q 갈림**으로
     나란히 세운다 — 옛은 갈리고 새는 안 갈린다면 뿌리가 지목된 것이다. */
  const splitBy = pool => {
    const y = pool.filter(x => x.pre.q > 0).map(x => x.nMed);
    const n = pool.filter(x => x.pre.q === 0).map(x => x.nMed);
    return { y, n, d: (y.length && n.length) ? med(y) - med(n) : null };
  };
  const oldAll = old.concat(w.old), newAll = neu.concat(w.new);
  const sOld = splitBy(oldAll), sNew = splitBy(newAll);
  ok(sOld.d !== null && sNew.d !== null && sOld.d >= 4 && Math.abs(sNew.d) < sOld.d,
     '7 붙는 시점은 **q 를 통해서만** 값에 닿는다 — 옛 장면만 그 갈림에 끌려간다(뿌리 지목)',
     '옛 q>0 ' + med(sOld.y) + ' vs q=0 ' + med(sOld.n) + ' (Δ' + sOld.d + ')'
     + ' · 새 q>0 ' + med(sNew.y) + ' vs q=0 ' + med(sNew.n) + ' (Δ' + sNew.d + ')');
  const qGone = per.old.filter(x => x.q === 0);
  ok(qGone.length > 0 && per.old[0].q > 0,
     '8 오래 기다리면 부팅 큐가 다 빠진다 — 즉 q 는 **시계**이지 제품의 성질이 아니다',
     per.old.map(x => x.ms + 'ms→q' + x.q).join(' · '));

  /* ⚑ 뿌리를 한 줄로 — «남은 큐가 있는가» 로 옛 장면의 값이 갈린다.
     ⚠ 단조는 아니다(q 가 아주 크면 첫 파도가 아주 작아 두 번째 톱니가 창을 늦게 덮는다) —
     그래서 «q 의 크기» 가 아니라 **«q 가 남았는가»** 로만 가른다. */
  const qYes = oldAll.filter(x => x.pre.q > 0).map(x => x.nMed);
  const qNo  = oldAll.filter(x => x.pre.q === 0).map(x => x.nMed);
  ok(qNo.length > 0 && qYes.length > 0 && med(qNo) < med(qYes),
     '8-b 옛 장면의 값을 정하는 것은 **부팅 큐가 남았는가** 다',
     'q>0 ' + qYes.length + '회 중앙값 ' + med(qYes) + ' vs q=0 ' + qNo.length + '회 중앙값 ' + med(qNo));

  /* ── [4] 갈래 ⓐ 기각 — 제품의 개체수가 커진 것이 아니다 ─────────────────
     같은 트리·같은 제품에서 **장면만 바꿔** 밴드 안팎이 갈리면, 옮겨 간 것은 개체수가 아니라 창이다. */
  const mOld = med(old.map(r => r.nMed)), mNew = med(neu.map(r => r.nMed));
  ok(mOld > band.hi - 6 && mNew <= RULE.POP,
     '9 갈래 ⓐ(«분포가 옮겨 갔다») 기각 — 같은 트리에서 장면만 바꾸면 중앙값이 POP 자리로 돌아온다',
     '옛 중앙값의 중앙값 ' + mOld + ' · 새 ' + mNew + ' (POP ' + RULE.POP + ')');
  ok(Math.abs(mNew - RULE.POP) <= 6,
     '10 갈래 ⓑ(«상한이 원래 좁았다») 기각 — 새 장면의 값은 POP=' + RULE.POP + ' 과 «같은 자리» 다',
     '새 중앙값 ' + mNew + ' · |Δ| ' + Math.abs(mNew - RULE.POP));

  /* ── [R] 되돌림 시험 — 수리를 무르게 풀지 않았음 ─────────────────────────
     «`spawnStage()` 를 도로 빼면 같은 자가 다시 빨개진다» 를 **같은 트리·같은 실행기**에서
     못박는다. 짝 단위로 물으면 표본 운에 걸리므로([1]+[3] 의 옛 9회 중 밴드를 넘는 것은
     매번 1~3회다) **두 표본 전체**로 묻는다 — 옛에는 밴드 밖이 있고 새에는 없다. */
  const outOld = oldAll.filter(x => outOf(x.nMed)).length;
  const outNew = newAll.filter(x => outOf(x.nMed)).length;
  const mgOldAll = Math.min(...oldAll.map(x => marginOf(x.nMed)));
  const mgNewAll = Math.min(...newAll.map(x => marginOf(x.nMed)));
  /* ⚑ **크로싱 수로 묻지 않는다** — 한 판의 빨강 확률이 1/5~1/3 이라 «17회에 한 번은 넘는다»
     는 물음 자신이 플레이키다([1] 이 같은 이유로 다시 적혔다). 되돌림이 말해야 하는 것은
     «장면을 되돌리면 자가 다시 **가장자리에 붙는다**» 이고, 크로싱 수는 그 곁의 관측치로 찍는다. */
  /* ⚠ 새 쪽에 **절대 문턱을 새로 적지 않는다**(«여유 ≥ 4» 라고 적었다가 15 가 나와 기각당했다 —
     그것이야말로 «값을 밴드에 맞추는 짓» 이다). 되돌림은 **관계**로만 묻는다:
     새 표본은 한 번도 밴드를 안 넘고, 옛 표본은 그보다 가장자리에 가깝다. */
  ok(outNew === 0 && mgOldAll < mgNewAll, 'R 장면만 되돌리면 같은 자가 다시 밴드 가장자리에 붙는다(되돌림)',
     '최소 여유 옛 ' + mgOldAll + ' → 새 ' + mgNewAll
     + ' · 밴드 밖 옛 ' + outOld + '/' + oldAll.length + '회 · 새 ' + outNew + '/' + newAll.length + '회');

  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
