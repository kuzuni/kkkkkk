#!/usr/bin/env node
/* 791 재현 — `probe695` [2]·[2-b] 가 왜 실행마다 갈렸는가 (T1 «버그(게이트 플레이키)»)
 *
 *   node tools/probe791.js [--reps N]      (기본 N = 2 · 한 회 ≈ 20초 — 자유·고정 두 장면을 잰다)
 *
 * ⚑ **«몇 번에 한 번 빨간가» 를 세지 않는다**(784 규약 · 766-④ · 775-④ · 779-②).
 *   확률을 확정으로 바꾸는 손잡이는 둘이다:
 *   ① **실측된 두 실행**(합성 강짜 아님)을 표본으로 박아 둔다 — 같은 제품·같은 자인데 옛 축이
 *      한쪽은 초록, 다른 쪽은 빨강이다. 그 자체가 «동전» 의 정의다.
 *   ② **장면을 바꾸면 그 갈림이 사라진다** — 자유 장면은 두 트리의 실제 차이를 잡음 아래로
 *      줄이고(Δ가 고정 장면의 0.19~0.37배), 고정 장면은 폭 3~13% 로 또렷이 가른다(≥1.76).
 *
 *   [0] 소스 — `probe695` [2] 절에 옛 두 축이 안 남아 있고 `RUL.treeSep` 를 부른다(779-③)
 *   [1] 재현 — 실측 두 실행에서 **옛 [2]·[2-b] 가 서로 반대 판정**(제품·자 불변)
 *   [2] 새 축은 그 두 실행에서 **같은 판정**이다(둘 다 «자유 장면에서는 못 가른다»)
 *   [3] 축 시험(784-①) — 옛 [2] 의 축은 «두 트리 관계» 를 아예 안 본다(선언만 움직여 확인)
 *   [4] 라이브 — 두 장면을 R회 재서 «자유가 실제 차이를 얼마나 줄이는가» 를 값으로 찍는다
 *   [5] 되돌림 — `RUL.treeSep` 이 «다 통과» 가 아니다(같은 구름 · 폭 ¼ · 폭 3벌 · 폭 0)
 *   [6] 기각 기록 — **첫 처방(양방향 `shakeSep` 의 min)을 값으로 기각한 그 표본**(784-②)
 *
 * ⚠ 문턱은 한 칸도 안 건드렸다 — `TOL_FLOOR` 0.40 · `K` 6 · `SHAKE_UNIT` 1 전부 불변.
 *   새 눈금 `treeSep` 의 널은 **그 실행이 스스로 잰 두 폭의 평균**이지 분포에서 뽑은 문턱이 아니다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const RUL = require('./rul504');

/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch: pwLaunch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const IDS = ['orbit', 'aura', 'whirl'];
const DONE504 = '023cd738';
const ai = process.argv.indexOf('--reps');
const REPS = ai > 0 ? Math.max(1, +process.argv[ai + 1] || 2) : 2;

let pass = 0, fail = 0, skip = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const na = (name, detail) => { console.log('⏸ SKIP ' + name + (detail ? ' — ' + detail : '')); skip++; };

/* ── 표본 — **실측된 두 실행**이다(2026-09-02, sess-0328-12297 · 같은 트리·같은 자) ──────
   `spread` 는 적지 않고 `measure()` 와 **같은 식**으로 여기서 뽑는다(손 전사 0칸). */
const row = (id, cd, decl, mean, each) => {
  const s = mean ? (Math.max(...each) - Math.min(...each)) / mean : 0;
  return { id, cd, decl, mean, each, spread: +s.toFixed(3),
           tol: +RUL.tolOf(+s.toFixed(3), RUL.K).toFixed(3), off: +RUL.offOf(mean, decl).toFixed(3) };
};
/* ⓐ 옛 [2] 가 **빨갛던** 실행 (probe695 자기 실행 · 504 트리 `aura` 평균이 6.113 으로 올라온 회) */
const RED = {
  now: [row('orbit', 0, 6.65, 1.54, [1.64, 1.08, 2.56, 2, 1.68, 0.28]),
        row('aura', 0, 9.4, 2.007, [3.04, 4.04, 1.16, 2.4, 0.76, 0.64]),
        row('whirl', 1.6, 17.88, 4.885, [4.06, 3.31, 4.75, 7, 4.56, 5.63])],
  old: [row('orbit', 0, 6.65, 1.287, [1.36, 1.64, 1.6, 1.4, 0.92, 0.8]),
        row('aura', 0, 9.4, 6.113, [4.92, 4.96, 10.72, 10.36, 3.04, 2.68]),
        row('whirl', 1.6, 17.88, 6.433, [4.06, 3.69, 7.79, 9.29, 4.56, 9.21])]
};
/* ⓑ 옛 [2] 가 **초록이던** 실행 (같은 코드 · 수집 10회 중 rep9) */
const GREEN = {
  now: [row('orbit', 0, 6.65, 1.273, [1.84, 0.56, 1.04, 1.44, 1.12, 1.64]),
        row('aura', 0, 9.4, 2.173, [4.44, 2.2, 0.52, 1.48, 0.96, 3.44]),
        row('whirl', 1.6, 17.88, 5.313, [5.63, 6.81, 4.81, 3.88, 4.81, 5.94])],
  old: [row('orbit', 0, 6.65, 1.427, [1.24, 0.84, 2.16, 1.56, 1.56, 1.2]),
        row('aura', 0, 9.4, 4.293, [1.72, 4.08, 6, 8.08, 2.48, 3.4]),
        row('whirl', 1.6, 17.88, 7.615, [15.92, 4.63, 6.21, 6.57, 7.36, 5])]
};
/* 옛 두 축 — 사본이 아니라 **지워진 그 식 그대로**다(이 자 안에서만 산다) */
const oldAxis2 = (s) => s.old.every(x => x.off > x.tol);
const oldAxis2b = (s) => IDS.every(id => {
  const a = s.now.find(x => x.id === id).mean, b = s.old.find(x => x.id === id).mean;
  return Math.max(a, b) / Math.max(1e-9, Math.min(a, b)) < 3;
});
const newFree = (s) => IDS.every(id =>
  !RUL.treeSep(s.now.find(x => x.id === id), s.old.find(x => x.id === id)).apart);
const newDir = (s) => s.old.every(x => x.mean < x.decl);

const open = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof skillHits === 'function'
    && typeof step === 'function' && typeof makeEnemy === 'function');
  return page;
};
const launch = async () => {
  return await pwLaunch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
};

(async () => {
  /* ── [0] 소스 ─────────────────────────────────────────── */
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'probe695.js'), 'utf8');
  const body = src.slice(src.indexOf('── [2]'), src.indexOf('── [3]'));
  ok(!/old\.every\(x => x\.off > x\.tol\)/.test(body) && !/< 3;/.test(body)
     && /RUL\.treeSep\(/.test(body),
     '0 소스 — [2] 절에 옛 두 축(밴드 멤버십 · 평균비 손 상수 3)이 안 남아 있고 판정은 `RUL.treeSep` 하나다(779-③)',
     '밴드 멤버십 ' + (/old\.every\(x => x\.off > x\.tol\)/.test(body) ? '남음' : '0건')
     + ' · 손 상수 3 ' + (/< 3;/.test(body) ? '남음' : '0건') + ' · treeSep 호출 ' + (body.match(/RUL\.treeSep\(/g) || []).length + '곳');

  /* ── [1] 재현 — 같은 코드가 두 실행에서 반대 판정 ────────── */
  ok(oldAxis2(GREEN) && !oldAxis2(RED),
     '1 재현 — **실측 두 실행**에서 옛 [2](«504 트리도 셋 다 밴드 밖»)가 서로 반대 판정이다 ⇒ 동전',
     '초록 실행 ' + GREEN.old.map(x => x.id + ' 이탈' + (x.off * 100).toFixed(0) + '/허용' + (x.tol * 100).toFixed(0)).join(' ')
     + ' ↔ 빨강 실행 ' + RED.old.map(x => x.id + ' 이탈' + (x.off * 100).toFixed(0) + '/허용' + (x.tol * 100).toFixed(0)).join(' '));
  ok(oldAxis2b(GREEN) && !oldAxis2b(RED),
     '1-b 옛 [2-b](«평균비 < 3» 손 상수)도 같은 두 실행에서 갈린다 — 문턱을 하나 더 놓은 것이지 두 겹이 아니었다(784-③)',
     'aura 평균비 초록 ×' + (GREEN.old[1].mean / GREEN.now[1].mean).toFixed(2)
     + ' ↔ 빨강 ×' + (RED.old[1].mean / RED.now[1].mean).toFixed(2) + ' (문턱 3)');
  ok(RED.old.find(x => x.id === 'aura').tol === RUL.TOL_FLOOR,
     '1-c 갈림의 자리는 **문턱이 아니라 평균**이다 — 빨강 실행에서도 허용은 바닥값 그대로였고 `aura` 평균만 밴드 안으로 올라왔다',
     'aura 허용 ' + RED.old.find(x => x.id === 'aura').tol + ' = TOL_FLOOR ' + RUL.TOL_FLOOR
     + ' · 밴드 경계 ' + (9.4 * (1 - RUL.TOL_FLOOR)).toFixed(2) + ' ↔ 평균 6.113');

  /* ── [2] 새 축은 두 실행에서 같은 판정 ─────────────────── */
  ok(newFree(RED) && newFree(GREEN) && newDir(RED) && newDir(GREEN),
     '2 새 축은 그 두 실행에서 **같은 판정**이다 — 자유 장면은 둘 다 «못 가른다», 방향은 둘 다 «선언에 못 미친다»',
     '갈림 빨강실행 ' + IDS.map(id => id + ' ×' + RUL.treeSep(RED.now.find(x => x.id === id), RED.old.find(x => x.id === id)).ratio.toFixed(2)).join('/')
     + ' · 초록실행 ' + IDS.map(id => id + ' ×' + RUL.treeSep(GREEN.now.find(x => x.id === id), GREEN.old.find(x => x.id === id)).ratio.toFixed(2)).join('/'));

  /* ── [3] 축 시험(784-①) — 옛 축이 무엇을 보고 있었나 ───── */
  /* 표본은 한 칸도 안 건드리고 **선언만** 옮긴다. 옛 [2] 는 판정이 뒤집히고(=선언에만 달렸다),
     [2] 가 이름으로 지고 있던 «두 트리가 같은 자리인가» 는 Δ0 이다(=그 관계를 안 본다). */
  const bend = (s, k) => ({ now: s.now.map(x => row(x.id, x.cd, +(x.decl * k).toFixed(3), x.mean, x.each)),
                            old: s.old.map(x => row(x.id, x.cd, +(x.decl * k).toFixed(3), x.mean, x.each)) });
  const bent = bend(GREEN, 0.5);
  const relSame = IDS.every(id =>
    RUL.treeSep(GREEN.now.find(x => x.id === id), GREEN.old.find(x => x.id === id)).ratio
    === RUL.treeSep(bent.now.find(x => x.id === id), bent.old.find(x => x.id === id)).ratio);
  ok(oldAxis2(GREEN) && !oldAxis2(bent) && relSame,
     '3 축 시험 — 표본을 그대로 두고 **선언만** 반으로 옮기면 옛 [2] 는 뒤집히는데 두 트리의 관계는 Δ0 ⇒ 옛 축은 «제품 드리프트» 를 아예 안 보고 있었다',
     '옛 [2] 초록→' + (oldAxis2(bent) ? '초록' : '빨강') + ' · treeSep Δ0 ' + (relSame ? '확인' : '아님'));

  /* ── [4] 라이브 — 두 장면 ─────────────────────────────── */
  let free = [], fix = [];
  const got = require('./gitrev756').show(DONE504, 'index.html');
  if (!got.ok) {
    na('4 라이브 — 두 장면을 R회', '504 트리를 못 꺼냈다(' + got.why + ')');
  } else {
    if (got.how) console.log('[i]' + got.how);
    const browser = await launch();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe791-'));
    const f = path.join(tmp, 'index.html');
    fs.writeFileSync(f, got.buf);
    for (let r = 0; r < REPS; r++) {
      for (const scene of [{ o: {}, box: free }, { o: { freeze: true }, box: fix }]) {
        const pN = await open(browser, URL);
        const n = await RUL.measure(pN, IDS, scene.o); await pN.context().close();
        const pO = await open(browser, 'file://' + f.replace(/\\/g, '/'));
        const o = await RUL.measure(pO, IDS, scene.o); await pO.context().close();
        for (const id of IDS) scene.box.push({ id, r: r + 1,
          v: RUL.treeSep(n.find(x => x.id === id), o.find(x => x.id === id)).ratio,
          d: Math.abs(n.find(x => x.id === id).mean - o.find(x => x.id === id).mean) });
      }
    }
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
    const fMax = Math.max(...free.map(x => x.v)), xMin = Math.min(...fix.map(x => x.v));
    /* ⚠ **«자유 장면은 못 가른다»(ratio < 1)를 단언하지 않는다** — 이 회차가 그 항을 먼저 세웠다가
       36표본 중 최대 1.17 로 단위를 넘는 것을 여기서 잡았다(784-② — 내가 옮겨 온 처방도 새 항이다).
       두 장면을 가르는 것은 **그 실행이 스스로 잰 두 값의 비교**다: 같은 종·같은 실행에서
       자유 장면의 두 트리 평균차가 고정 장면의 것보다 작다(실측 여유 ×2.7~5.3). */
    const dMin = {}, dMax = {};
    for (const x of fix) dMin[x.id] = Math.min(dMin[x.id] === undefined ? Infinity : dMin[x.id], x.d);
    for (const x of free) dMax[x.id] = Math.max(dMax[x.id] === undefined ? 0 : dMax[x.id], x.d);
    ok(IDS.every(id => dMax[id] < dMin[id]),
       '4 라이브 — 자유 장면은 두 트리의 실제 차이를 **잡음 아래로 줄인다**(그래서 그 장면의 판정은 동전이 된다)',
       IDS.map(id => id + ' 자유 Δ최대 ' + dMax[id].toFixed(2) + ' < 고정 Δ최소 ' + dMin[id].toFixed(2)
         + ' (×' + (dMax[id] / dMin[id]).toFixed(2) + ')').join(' / ')
       + ' · 참고 자유 갈림 최대 ×' + fMax.toFixed(2) + ' (단언 아님) · 고정 최소 ×' + xMin.toFixed(2));
    ok(fix.every(x => x.v >= RUL.SHAKE_UNIT),
       '4-b ⚑ 고정 장면의 갈림은 종마다 다 선다 — 제품은 504 이후 **실제로 움직였다**(옛 [2-b] 가 «안 움직였다» 를 단언하고 있었다)',
       fix.map(x => x.id + '@r' + x.r + ' ×' + x.v.toFixed(2)).join(' / '));
  }

  /* ── [5] 되돌림 ───────────────────────────────────────── */
  const base = GREEN.now.find(x => x.id === 'aura');
  const w = Math.max(...base.each) - Math.min(...base.each);
  const shift = (x, d) => ({ each: x.each.map(v => v + d), mean: x.mean + d });
  ok(!RUL.treeSep(base, base).apart
     && !RUL.treeSep(base, shift(base, w / 4)).apart
     && RUL.treeSep(base, shift(base, 3 * w)).apart
     && RUL.treeSep({ each: [2, 2], mean: 2 }, { each: [5, 5], mean: 5 }).apart,
     '5 되돌림 — `treeSep` 은 «다 통과» 가 아니다(같은 구름 ×0 · 폭 ¼ 이동 안 읽음 · 폭 3벌 이동 읽음 · 폭 0 인데 값이 다르면 ∞)',
     '같은 ×' + RUL.treeSep(base, base).ratio.toFixed(2)
     + ' / ¼폭 ×' + RUL.treeSep(base, shift(base, w / 4)).ratio.toFixed(2)
     + ' / 3폭 ×' + RUL.treeSep(base, shift(base, 3 * w)).ratio.toFixed(2)
     + ' / 폭0 ×' + RUL.treeSep({ each: [2, 2], mean: 2 }, { each: [5, 5], mean: 5 }).ratio);
  ok(RUL.treeSep({ each: [], mean: 0 }, base).ratio === 0 && !RUL.treeSep(base, { each: [], mean: 0 }).apart,
     '5-b 빈 표본은 «갈렸다» 로 안 샌다 — 표본이 굶은 실행이 조용히 초록/빨강을 만들지 않는다',
     '빈 표본 ×' + RUL.treeSep({ each: [], mean: 0 }, base).ratio);

  /* ── [6] 첫 처방 기각 기록(784-②) ─────────────────────── */
  /* 이 회차의 첫 꼴은 «양방향 `shakeSep` 의 min» 이었고 12표본에서 자유 ≤0.26 · 고정 ≥1.71 로
     갈려 보였다. 13번째 실행(아래 실측)에서 504 트리 `orbit` 구름만 넓게 나오자 0.74 로 내려앉았다. */
  const R4 = { now: { mean: 7.153, each: [6.92, 6.68, 7.28, 7, 7.44, 7.6] },
               old: { mean: 10.68, each: [10, 11.32, 10.24, 12.52, 9.44, 10.56] } };
  const minShake = Math.min(RUL.shakeSep({ each: R4.old.each, decl: R4.now.mean }).ratio,
                            RUL.shakeSep({ each: R4.now.each, decl: R4.old.mean }).ratio);
  ok(minShake < RUL.SHAKE_UNIT && RUL.treeSep(R4.now, R4.old).apart,
     '6 첫 처방 기각 — «양방향 shakeSep 의 min» 은 **넓게 나온 쪽 구름이 판정을 쥔다**(같은 실측에서 ×'
     + minShake.toFixed(2) + ') · 두 폭의 평균을 널로 쓰면 ×' + RUL.treeSep(R4.now, R4.old).ratio.toFixed(2),
     '고정 장면 `orbit` 실측 — 오늘 폭 ' + (Math.max(...R4.now.each) - Math.min(...R4.now.each)).toFixed(2)
     + ' ↔ 504 트리 폭 ' + (Math.max(...R4.old.each) - Math.min(...R4.old.each)).toFixed(2));

  console.log('');
  console.log((fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail) + (skip ? ' (⏸ ' + skip + ')' : ''));
  process.exit(fail ? 1 : 0);
})();
