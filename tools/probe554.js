/* 작업 554 재현 — `tools/verify112.js` ④ 「골드가 정확히 비용만큼 감소」 플레이키의 뿌리.
   실행: node tools/probe554.js

   등재문(PROGRESS 554): Δ골드 **40.92** vs 비용 45 — «흔들리는 값» 이 아니라 «섞이거나
   안 섞이거나» 하는 **상수 4.08**. 유력 뿌리: `④` 의 측정 창(pointerdown → 60ms →
   pointerup → 120ms = 180ms)에 **전투 킬 골드**(index.html 21081 `S.gold += g`)가 들어온다.
   다른 훈련 자들(`verify183`·`verify326`·`verify483`·`verify517`)은 setup 에서 `step = () => {}`
   로 전투 루프를 세우는데 112 의 ④ 만 안 세운다.

   338 규칙 — 처방 전에 제품에게 직접 묻는다. 여기서 재는 것 넷:
     [1] 수리 전 재현    — 지금 자와 같은 창으로 N 회, Δ골드·비용·오차
     [2] 뿌리            — 그 창에서 `S.totalKills`·`goldWin` 이 실제로 늘었는가, 늘어난 골드가 4.08 인가
     [3] 처방 ⓐ 검증     — `step = () => {}` 로 창을 세우면 N 회 전부 Δ = 비용(오차 0)
     [4] 음성 대조       — 루프를 세운 창에서도 «킬을 손으로 넣으면» 도로 어긋난다
                           (= 자가 무뎌진 것이 아니라 오염원이 사라진 것)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const N = 5;
const R = [];
const yes = (n, got, extra) => R.push({ n, got: String(got) + (extra ? ' :: ' + extra : ''), want: 'true', pass: got === true });
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });

/* 자의 ④ 와 «같은 창» 을 그대로 옮긴 것 — freeze 만 손잡이로 뺐다 */
async function buyWindow(p, freeze){
  return p.evaluate(async (fr) => {
    if (fr) step = () => {};
    S.buyQty = 1; S.autoBuy = false;
    S.lv.atk = 0;
    S.gold = 1e6; fxDisp && (fxDisp.gold = S.gold);
    openTrain(); renderTrain();
    const before = { lv: lv('atk'), gold: S.gold, cost: U.atk.cost(lv('atk')),
                     kills: S.totalKills, gw: (typeof goldWin === 'number' ? goldWin : NaN) };
    document.querySelector('#trw [data-tr="atk"]').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    document.querySelector('#trw [data-tr="atk"]').dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    return { cost: before.cost, dgold: before.gold - S.gold, dlv: lv('atk') - before.lv,
             dkills: S.totalKills - before.kills,
             dgw: (typeof goldWin === 'number' ? goldWin - before.gw : NaN) };
  }, freeze);
}

(async () => {
  const br = await launch(chromium);

  /* ── [1] 수리 전 재현 ── */
  const raw = [];
  for (let i = 0; i < N; i++) {
    const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
    await p.goto(FILE, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    raw.push(await buyWindow(p, false));
    await p.close();
  }
  const err = raw.map(r => +(r.cost - r.dgold).toFixed(6));
  const dirty = raw.filter((r, i) => err[i] !== 0);
  console.log('  · [1] 수리 전 ' + N + '회 — Δ골드: ' + raw.map(r => r.dgold.toFixed(2)).join(' / ')
            + '  (비용 ' + raw[0].cost + ')');
  console.log('  · [1] 오차(비용 − Δ골드): ' + err.join(' / ') + '  · 킬: ' + raw.map(r => r.dkills).join('/'));
  yes('[1] 수리 전 창에서 «비용 ≠ Δ골드» 가 실제로 난다(플레이키 재현)', dirty.length > 0,
      dirty.length + '/' + N + '회');
  yes('[1] 레벨은 매번 +1 이다(구매 자체는 정상 — 자가 잰 것은 골드뿐)', raw.every(r => r.dlv === 1));

  /* ── [2] 뿌리 — 그 창에 킬 골드가 들어온다 ── */
  yes('[2] 어긋난 회차는 예외 없이 창 안에서 적을 죽였다(S.totalKills 증가)',
      dirty.length > 0 && dirty.every(r => r.dkills > 0),
      dirty.map(r => 'kills+' + r.dkills).join(', ') || '표본 없음');
  yes('[2] 어긋난 양 = 그 창의 킬 골드(goldWin 증가분)와 같다',
      dirty.length > 0 && dirty.every(r => Math.abs((r.cost - r.dgold) - r.dgw) < 1e-9),
      dirty.map(r => (r.cost - r.dgold).toFixed(2) + ' vs goldWin+' + r.dgw.toFixed(2)).join(', ') || '표본 없음');
  yes('[2] 안 어긋난 회차는 킬이 0 이다(«섞이거나 안 섞이거나» — 값이 흔들리는 게 아니다)',
      raw.every((r, i) => (err[i] === 0) === (r.dkills === 0)));

  /* ── [3] 처방 ⓐ — 루프를 세운 창 ── */
  const fixed = [];
  for (let i = 0; i < N; i++) {
    const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
    await p.goto(FILE, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    fixed.push(await buyWindow(p, true));
    await p.close();
  }
  console.log('  · [3] step 정지 후 ' + N + '회 — Δ골드: ' + fixed.map(r => r.dgold.toFixed(2)).join(' / '));
  eq('[3] 루프를 세우면 ' + N + '회 전부 Δ골드 = 비용(오차 0)',
     fixed.filter(r => Math.abs(r.dgold - r.cost) <= r.cost * 1e-9).length, N);
  eq('[3] 루프를 세우면 창 안 킬이 0 이다', fixed.reduce((s, r) => s + r.dkills, 0), 0);
  yes('[3] 레벨 +1 은 그대로다(정지가 구매를 죽이지 않았다)', fixed.every(r => r.dlv === 1));

  /* ── [4] 음성 대조 — 정지한 창에 킬을 손으로 넣으면 도로 어긋난다 ── */
  const neg = await (async () => {
    const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
    await p.goto(FILE, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const o = await p.evaluate(async () => {
      step = () => {};
      S.buyQty = 1; S.autoBuy = false; S.lv.atk = 0;
      S.gold = 1e6; fxDisp && (fxDisp.gold = S.gold);
      openTrain(); renderTrain();
      const before = { gold: S.gold, cost: U.atk.cost(lv('atk')) };
      document.querySelector('#trw [data-tr="atk"]').dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      S.gold += 4.08;                                   /* 킬 골드 한 번을 손으로 흉내 */
      document.querySelector('#trw [data-tr="atk"]').dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      return { cost: before.cost, dgold: before.gold - S.gold };
    });
    await p.close();
    return o;
  })();
  yes('[4] 정지한 창에도 골드가 들어오면 자는 도로 빨갛다(자가 무뎌진 게 아니다)',
      Math.abs(neg.dgold - neg.cost) > neg.cost * 1e-9,
      'Δ' + neg.dgold.toFixed(2) + ' vs 비용 ' + neg.cost);

  await br.close();
  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nPROBE554 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
