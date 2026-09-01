/* 재현 도구 — 작업 643: `verify169` C2 «이전 층 보상 실지급(골드)» 이 +36868 인데 기대는 36864.
 *
 * 등재문의 갈래는 셋이었다.
 *   ⓐ 199 밸런스 루프가 던전 보상 계수를 밀었다
 *   ⓑ 자가 기대값을 손으로 박아 뒀다
 *   ⓒ 반올림 경계(`Math.floor` ↔ `Math.round`)가 한 항 옮겨졌다
 *
 * 셋 다 «지급액이 36868 이다» 를 전제한다. 이 도구는 그 전제부터 묻는다 —
 * **소탕이 실제로 준 액수**와 **그 500ms 동안 저 혼자 늘어난 액수**를 갈라서 잰다.
 *
 * 자를 대는 자리는 넷이다.
 *   [1] 계수      — `DUNGEONS[0].rw(4).gold` 를 전부 정밀도로 읽는다(자가 쓰는 그 식 그대로).
 *   [2] 대조군    — 소탕을 **안 누르고** 같은 500ms 를 기다린다. 여기서 골드가 늘면 배경 방치 사냥이다.
 *   [3] 실험군    — 소탕을 누르고 같은 500ms. 지급 + 배경분이 섞인 값.
 *   [4] 순간 측정 — `giveReward` 직후(같은 tick)에 읽어 **배경분이 섞이기 전** 지급액만 본다.
 *
 * 실행: node tools/probe643.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (t, d) => { pass++; console.log(`PASS ${t}${d ? ' — ' + d : ''}`); };
const no = (t, d) => { fail++; console.log(`FAIL ${t}${d ? ' — ' + d : ''}`); };
const chk = (c, t, d) => (c ? ok : no)(t, d);

/* verify169 과 **같은** 씨앗·같은 대기 — 다른 조건에서 재면 다른 것을 재게 된다 */
const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

/* ⚠ verify169 [C] 와 **완전히 같은** 부팅·목록 열기를 쓴다. 다른 순서로 재면
   배경 방치 사냥의 위상이 달라져 «내 자리에서는 재현이 안 된다» 는 엉뚱한 결론이 나온다
   (첫 판에 실제로 그랬다 — 목록 대기를 뺀 사본에서는 3회 전부 표류 0 이었다). */
async function boot(b) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 } });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(SEED);
  await p.evaluate(() => { openDungeon(); });
  await p.waitForFunction(() => {
    const cs = [...document.querySelectorAll('#dunList canvas.thcv')];
    return cs.length >= 6 && cs.every(c => c._fr);
  }, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(250);
  return { ctx, p };
}

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* ── [1] 계수 — 자가 읽는 그 식을 전부 정밀도로 ── */
  {
    const { ctx, p } = await boot(b);
    const m = await p.evaluate(() => {
      const d = DUNGEONS[0], rw = d.rw(4);
      return { id: d.id, gold: rw.gold, int: Number.isInteger(rw.gold),
               keys: Object.keys(rw).join(','), rw3: d.rw(3).gold, rw5: d.rw(5).gold };
    });
    console.log(`[1] DUNGEONS[0]=${m.id} · rw(4)={${m.keys}} · rw(4).gold=${m.gold} (정수=${m.int}) · rw(3)=${m.rw3} · rw(5)=${m.rw5}`);
    /* 자는 «자기 자신이 계산한 값» 과 비교하므로(`before.want = DUNGEONS[0].rw(...).gold`)
       기대값이 손으로 박혀 있지 않다 = 갈래 ⓑ 는 코드를 읽는 것만으로 기각된다.
       ⓐ·ⓒ 는 값으로 기각한다 — 부동소수 꼬리(1e-11)는 자의 허용 오차 1 안이라 결함이 아니다. */
    chk(Math.abs(m.gold - 36864) < 1e-6,
      '[1-a] rw(4).gold 는 등재 시각의 36864 그대로다 — 199 계수 표류(ⓐ)·반올림 경계(ⓒ) 둘 다 기각',
      `${m.gold} (Δ ${(m.gold - 36864).toExponential(2)})`);
    chk(!Number.isInteger(m.gold) && Math.abs(m.gold - 36864) < 1e-6,
      '[1-b] 어긋남 +4 는 부동소수 꼬리로 설명되지 않는다 — 꼬리는 1e-11 이다', String(m.gold - 36864));
    await ctx.close();
  }

  /* ── [2] 대조군 — 소탕을 **안 누르고** 같은 500ms ── */
  let drift = [];
  for (let i = 0; i < 5; i++) {
    const { ctx, p } = await boot(b);
    await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(300);
    const d = await p.evaluate(async () => {
      const g0 = S.gold, k0 = S.totalKills;
      await new Promise(r => setTimeout(r, 500));
      return { d: +(S.gold - g0).toFixed(2), kills: S.totalKills - k0 };
    });
    drift.push(d);
    await ctx.close();
  }
  console.log(`[2] 대조군(소탕 없이 500ms) — ${drift.map(x => `+${x.d}(킬${x.kills})`).join(' / ')}`);
  chk(drift.some(x => x.d > 0),
    '[2-a] 소탕을 안 눌러도 골드가 저 혼자 는다 — 팝업 뒤에서 방치 사냥이 계속 돈다',
    drift.map(x => x.d).join('/'));
  chk(drift.every(x => (x.d > 0) === (x.kills > 0)),
    '[2-b] 그 증분은 예외 없이 «몹이 죽은 프레임» 에서만 나온다 — 출처가 방치 사냥임을 못박는다',
    drift.map(x => `${x.d}/${x.kills}`).join(' '));

  /* ── [3] 실험군 — verify169 C2 와 완전히 같은 순서(클릭 → 500ms → 읽기) ──
     지급분과 배경 사냥분이 한 값에 섞여 들어온다. */
  const EPS = 1e-6;
  let mix = [];
  for (let i = 0; i < 5; i++) {
    const { ctx, p } = await boot(b);
    await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(300);
    const g0 = await p.evaluate(() => ({ g: S.gold, k: S.totalKills }));
    await p.evaluate(() => document.getElementById('dgdSweep').click());
    await p.waitForTimeout(500);
    const g1 = await p.evaluate(() => ({ g: S.gold, k: S.totalKills }));
    mix.push({ d: +(g1.g - g0.g).toFixed(2), kills: g1.k - g0.k });
    await ctx.close();
  }
  console.log(`[3] 실험군(C2 와 같은 순서) — ${mix.map(x => `+${x.d}(킬${x.kills})`).join(' / ')}`);
  chk(mix.every(x => x.d >= 36864 - EPS),
    '[3-a] 실험군은 «기대값 미만» 이 한 번도 없다 — 모자라게 준 것이 아니다',
    mix.map(x => x.d).join('/'));
  chk(mix.every(x => (x.d > 36864 + 1) === (x.kills > 0)),
    '[3-b] 초과분이 나온 판은 예외 없이 «그 500ms 안에 몹이 죽은 판» 이다',
    mix.map(x => `${x.d}/킬${x.kills}`).join(' '));

  /* ── [4] 순간 측정 — 클릭과 **같은 tick** 에서 읽는다 ──
     `onclick → sweepDungeon → giveReward` 가 전부 동기라 사이에 프레임이 못 낀다. */
  let pure = [];
  for (let i = 0; i < 5; i++) {
    const { ctx, p } = await boot(b);
    await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(300);
    const d = await p.evaluate(() => {
      const g0 = S.gold;
      document.getElementById('dgdSweep').click();
      return S.gold - g0;
    });
    pure.push(d);
    await ctx.close();
  }
  console.log(`[4] 순간 측정(클릭과 같은 tick) 지급액 5회 — ${pure.join(' / ')}`);
  chk(pure.every(v => Math.abs(v - 36864) < EPS),
    '[4-a] 소탕이 실제로 준 액수는 5회 전부 정확히 rw(4).gold — **제품은 옳다**', pure.join('/'));
  chk(pure.every(v => Math.abs(v - 36864) < EPS) && mix.some(x => x.d > 36864 + 1),
    '[4-b] ⇒ C2 의 +4 는 지급액이 아니라 **500ms 동안 저 혼자 는 배경 사냥분**이다 (갈래 ⓐⓑⓒ 전부 기각 · 결함은 «자가 저절로 변하는 값을 잰다»)',
    `순간 ${pure[0]} · 500ms ${mix.map(x => x.d).join('/')}`);

  await b.close();
  console.log(`\nPROBE643 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
