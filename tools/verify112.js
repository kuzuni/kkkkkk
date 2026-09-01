/* 작업 112 게이트 — 23 훈련 비용 곡선 완화(구간별 지수)의 «실동작» 회귀 방지.
   실행: node tools/verify112.js

   저장소 주인 지시(2026-08-26): «훈련이 밸런스적으로 너무 가혹하다.
   스테이지 80 될 때까지 대충 훈련 4단계쯤 가는 곡선으로.»

   수치 판정(누적 골드 vs 누적 비용)은 `node tools/sim112.js` 가 본다.
   이 게이트는 그 곡선이 **게임 안에서 실제로 그렇게 동작하는지**를 본다(T2 «기능 완성 규칙»).
     ① 소스   — trainCost 정의 1곳 · TRAIN_KNEE/TRAIN_COST_R 존재 · 훈련 3종만 갈아탐
     ② 곡선   — U.atk/hp/regen.cost(l) 가 «무릎까지 구곡선 · 그 뒤 ×1.05» 식과 정확히 일치
     ③ 불변   — Lv 0~KNEE 비용이 112 이전(45·1.19^l 등)과 한 푼도 다르지 않다
     ④ 구매   — 훈련 팝업에서 카드를 누르면 Lv +1 · 골드가 정확히 그 비용만큼 줄고 HUD 도 따라온다
     ⑤ x10    — 배수 구매의 비용 = Σ cost, 레벨 +10
     ⑥ 단계   — 3종 모두 상한이면 ↑ 가 열리고, 누르면 단계 +1 · 상한 200 · 전 스탯 ×1.1
     ⑦ 자동   — 자동 구매가 새 곡선에서도 «가장 싼 것부터» 산다
     ⑧ 도달   — 게임의 살아 있는 U.cost 로 잰 Lv300×3 누적 비용이 sim112 의 값과 일치하고,
                 스테이지 80 누적 골드의 60~80% 안에 든다 (정규식 시뮬 ↔ 실코드 교차 검증)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const SRC = path.resolve(__dirname, '../index.html');
const FILE = 'file://' + SRC;

const R = [];
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });
const near = (n, got, want, tol) => R.push({
  n, got: Number(got).toExponential(6), want: '≈' + Number(want).toExponential(6),
  pass: Math.abs(got - want) <= Math.abs(want) * tol });

(async () => {
  /* ── ① 소스 ─────────────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  eq('① trainCost 정의 1곳', (src.match(/const trainCost = /g) || []).length, 1);
  eq('① TRAIN_KNEE 정의 1곳',   (src.match(/const TRAIN_KNEE\s*=/g) || []).length, 1);
  eq('① TRAIN_COST_R 정의 1곳', (src.match(/const TRAIN_COST_R\s*=/g) || []).length, 1);
  /* 훈련 3종만 갈아탄다 — 나머지 6종은 단일 지수 그대로(남의 스탯을 건드리지 않았다. 358 이 spd 를 지워 7 → 6) */
  eq('① cost:trainCost( 를 쓰는 UPG 행 = 훈련 3종', (src.match(/cost:trainCost\(/g) || []).length, 3);
  ['atk','hp','regen'].forEach(id =>
    yes('① ' + id + ' 가 trainCost 를 쓴다',
        new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:trainCost\\(").test(src)));
  /* 358 이관(2026-08-29) — «훈련 밖 7종» 이 **6종**이 됐다. `spd`(이동 속도)는 주인 지시로 축째 삭제.
     끄기(음성)와 켜기(양성)는 짝으로 넣는다(347 교훈 ②) — 목록에서 빼기만 하면
     «358 이 통째로 되돌아와도 초록인 게이트» 가 된다. */
  eq("① UPG 에 이동 속도(spd) 행 0곳 — 358 이 지운 축", (src.match(/\{ id:'spd',/g) || []).length, 0);
  /* 703 이관(2026-09-02) — «훈련 밖 6종» 이 **5종**이 됐다. 공격 속도 축은 주인 지시로 목걸이 전속이라
     이 표에서 사라졌다. 358 이 세운 «끄기·켜기 짝» 규칙을 그대로 따라 음성항을 한 줄 더 세운다 —
     목록에서 빼기만 하면 «703 이 통째로 되돌아와도 초록인 게이트» 가 된다. */
  eq("① UPG 에 공격 속도 행 0곳 — 703 이 목걸이로 옮긴 축",
     (src.match(/name:'공격 속도'/g) || []).length, 0);
  ['crit','cdmg','pierce','def','gold'].forEach(id =>
    yes('① ' + id + ' 는 단일 지수 유지',
        new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:l => [\\d.]+\\*Math\\.pow\\(").test(src)));

  /* ── 페이지 ─────────────────────────────────────────────────────── */
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  /* ── ②③ 곡선 ── */
  const cur = await p.evaluate(() => {
    const B = { atk:45, hp:30, regen:55 }, RR = { atk:1.19, hp:1.17, regen:1.19 };
    const out = { knee: TRAIN_KNEE, rt: TRAIN_COST_R, badNew: [], badOld: [] };
    for(const id of ['atk','hp','regen']){
      for(const l of [0,1,5,10,14,15,16,20,50,100,200,300]){
        const want = B[id] * Math.pow(RR[id], Math.min(l, TRAIN_KNEE))
                   * Math.pow(TRAIN_COST_R, Math.max(0, l - TRAIN_KNEE));
        const got = U[id].cost(l);
        if(Math.abs(got - want) > Math.abs(want) * 1e-12) out.badNew.push(id + '@' + l);
      }
      /* ③ 무릎 이하는 112 «이전» 곡선과 완전히 같아야 한다 */
      for(let l=0;l<=TRAIN_KNEE;l++){
        const old = B[id] * Math.pow(RR[id], l);
        if(Math.abs(U[id].cost(l) - old) > Math.abs(old) * 1e-12) out.badOld.push(id + '@' + l);
      }
    }
    return out;
  });
  eq('② 무릎 Lv', cur.knee, 15);
  eq('② 무릎 뒤 레벨당 배율', cur.rt, 1.05);
  eq('② U.cost(l) 가 구간별 지수 식과 일치', cur.badNew.join(',') || 'none', 'none');
  eq('③ Lv 0~무릎 비용이 112 이전과 동일', cur.badOld.join(',') || 'none', 'none');

  /* ── ④ 실제 구매 ──
     554(2026-08-31) — 이 창(pointerdown → 60ms → pointerup → 120ms = 180ms)에 **전투 킬 골드**가
     섞여 «골드가 정확히 비용만큼 감소» 가 플레이키였다(Δ골드 40.92 vs 비용 45 — 오차는 흔들리는
     값이 아니라 킬 한 번의 상수 4.08 이고, `probe554` 로 5회 중 2회 재현했다: 어긋난 회차는 예외
     없이 `S.totalKills` +1 이고 그 양이 `goldWin` 증가분과 한 푼도 안 틀렸다).
     처방 ⓐ — 다른 훈련 자들(`verify183`·`verify326`·`verify483`·`verify517`)의 setup 과 같이
     **측정 창에서 전투 루프를 세운다**(`step = () => {}`). 자를 무디게 푼 것이 아님은 probe554 [4]
     음성 대조가 못박는다 — 세운 창에도 골드가 들어오면 이 항은 도로 빨갛다(허용 오차 1e-9 불변).
     오염원이 사라진 것을 **이 자 스스로도** 보게 «창 안 킬·킬 골드 0» 항을 같이 둔다:
     정지가 풀리면 이 항이 «측정 창 오염» 이라는 이름으로 먼저 걸려 진단이 헷갈리지 않는다. */
  const buy1 = await p.evaluate(async () => {
    step = () => {};                      /* 킬 골드·자동 진행이 측정 창에 섞이지 않게 (554) */
    S.buyQty = 1; S.autoBuy = false;
    S.lv.atk = 0;
    S.gold = 1e6; fxDisp && (fxDisp.gold = S.gold);
    openTrain(); renderTrain();
    const before = { lv: lv('atk'), gold: S.gold, cost: U.atk.cost(lv('atk')), dmg: stat.dmg,
                     kills: S.totalKills, gw: (typeof goldWin === 'number' ? goldWin : 0) };
    document.querySelector('#trw [data-tr="atk"]').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    document.querySelector('#trw [data-tr="atk"]').dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    return { before, lv: lv('atk'), gold: S.gold, dmg: stat.dmg,
             dkills: S.totalKills - before.kills,
             dgw: (typeof goldWin === 'number' ? goldWin - before.gw : 0),
             card: (document.querySelector('#trw [data-tr="atk"] .ch i') || {}).textContent };
  });
  eq('④ 강화 클릭 → Lv +1', buy1.lv - buy1.before.lv, 1);
  eq('④ 측정 창이 깨끗하다 — 창 안 킬·킬 골드 0 (554 측정 창 오염 감지)',
     buy1.dkills + '/' + buy1.dgw, '0/0');
  near('④ 골드가 정확히 비용만큼 감소', buy1.before.gold - buy1.gold, buy1.before.cost, 1e-9);
  yes('④ 공격력(stat.dmg) 이 실제로 올랐다', buy1.dmg > buy1.before.dmg);
  eq('④ 카드 레벨 표기 갱신', buy1.card, 'Lv. 1');

  /* HUD 는 drawHud() 가 그린다 — 58 롤링 캐시를 밀어 놓고 한 프레임 그린다(LESSONS 111-2)
     212 — 작업 150 이 «골드만 알파벳 단위» 로 표기층을 갈라(`fmtG` 골드 전용 / `fmt` 나머지)
     HUD 를 `$('goldN').textContent = fmtG(fxVal('gold'))` 로 바꿨는데 이 단언만 `fmt(S.gold)`
     로 남아 게이트가 36/37 로 썩어 있었다(index.html 은 정상 — 게이트 부패).
     ⓐ 표시값 = `fmtG(S.gold)`. 값의 출처를 `fxVal('gold')` 가 아니라 `S.gold` 로 잡는 이유는
        바로 위에서 `fxDisp.gold = S.gold` 로 롤링 캐시를 밀어 둘이 같기 때문이고, 그래야
        fxVal 경로가 망가져도(= HUD 가 엉뚱한 값을 그려도) 이 단언이 잡는다.
     ⓑ 같은 부패가 다시 나면(표기가 `fmt` 로 되돌아가면) ⓐ 만으로도 잡히지만, 그때 «두 표기가
        애초에 같아서 통과» 하는 일이 없도록 두 표기가 실제로 갈리는 크기인지도 못 박는다. */
  const hud = await p.evaluate(() => { fxDisp.gold = S.gold; drawHud();
    return { txt: $('goldN').textContent, want: fmtG(S.gold),
             plain: fmt(S.gold), gold: S.gold }; });
  eq('④ HUD 골드 = fmtG(S.gold)', hud.txt, hud.want);
  yes('④ HUD 골드가 fmt 원시 표기와 갈린다(150 표기층 회귀 감지)',
      hud.gold >= 1000 && hud.txt !== hud.plain);

  /* ── ⑤ x10 ── */
  const buy10 = await p.evaluate(async () => {
    S.buyQty = 10; S.lv.hp = 0; S.gold = 1e9; renderTrain();
    let want = 0; for(let i=0;i<10;i++) want += U.hp.cost(i);
    const g0 = S.gold, l0 = lv('hp');
    trainBuy('hp');
    return { want, spent: g0 - S.gold, dl: lv('hp') - l0 };
  });
  eq('⑤ x10 레벨 +10', buy10.dl, 10);
  near('⑤ x10 비용 = Σ cost(l)', buy10.spent, buy10.want, 1e-9);

  /* ── ⑥ 단계 상승 ── */
  const up = await p.evaluate(() => {
    S.trainStage = 1;
    ['atk','hp','regen'].forEach(k => S.lv[k] = trainCap());
    renderTrain();
    const readyBefore = trainReady(), atkBefore = stat.dmg;
    const upBtnOn = !$('trUp').classList.contains('off') && !$('trUp').hasAttribute('disabled');
    trainUp();
    return { readyBefore, upBtnOn, stage: S.trainStage, cap: trainCap(),
             ratio: stat.dmg / atkBefore, ready: trainReady() };
  });
  yes('⑥ 3종 상한 → trainReady()', up.readyBefore === true);
  yes('⑥ ↑ 버튼이 눌리는 상태', up.upBtnOn);
  eq('⑥ trainUp() → 단계', up.stage, 2);
  /* 517(2026-08-31, 326 번복) — 상한은 «단계 몫 구간표(300/600/900, 스탯당 100/200/300)» 의 누적합이다.
     단계 2 = 100 + 100 = 200. 112 가 지키는 것은 «단계가 오르면 상한이 넓어진다» 이지 그 숫자가 아니다. */
  eq('⑥ 상한 재확장 (517 구간표 누적합 — 단계 2 = 100+100)', up.cap, 200);
  yes('⑥ 그래서 단계 1 상한(100)보다 넓다', up.cap > 100);
  near('⑥ 전 스탯 +10% 반영(단계 보너스)', up.ratio, 1.10 / 1.00, 1e-9);
  yes('⑥ 상한이 늘어 다시 미완료', up.ready === false);

  /* ── ⑦ 자동 구매는 가장 싼 것부터 ── */
  const auto = await p.evaluate(() => {
    S.trainStage = 1; S.lv.atk = 0; S.lv.hp = 0; S.lv.regen = 0; S.autoBuy = true;
    S.gold = U.hp.cost(0) + 1;                        /* hp(30) 만 살 수 있는 딱 그만큼 */
    autoT = 0; autoBuyTick(1);
    return { atk: lv('atk'), hp: lv('hp'), regen: lv('regen') };
  });
  eq('⑦ 자동 구매가 최저가(hp) 를 집었다', [auto.atk, auto.hp, auto.regen].join('/'), '0/1/0');

  /* ── ⑧ 살아 있는 U.cost 로 잰 Lv300×3 누적 비용 ↔ sim112 ── */
  const live = await p.evaluate(() => {
    let t = 0;
    for(const id of ['atk','hp','regen']) for(let l=0;l<300;l++) t += U[id].cost(l);
    let g = 0;                                        /* 참고용 — 스테이지 80 킬+클리어만 */
    for(let s=1;s<=80;s++) g += eGold(s) * (s % 10 === 0 ? 20 : 50 * 1.116) + eGold(s) * 12;
    return { cost300: t, activeGold80: g };
  });
  const simOut = execFileSync(process.execPath, [path.join(__dirname, 'sim112.js')], { encoding:'utf8' });
  const mCost = simOut.match(/Lv300×3 누적 비용\(설치\)\s*=\s*([\d.eE+]+)\s*\(누적 골드의 ([\d.]+)%/);
  yes('⑧ sim112 가 SIM112 PASS', /SIM112 PASS/.test(simOut));
  yes('⑧ sim112 출력에서 누적 비용을 읽었다', !!mCost);
  if(mCost){
    near('⑧ 실코드 Lv300×3 누적 비용 = sim112 값', live.cost300, parseFloat(mCost[1]), 5e-4);
    const use = parseFloat(mCost[2]);
    R.push({ n: '⑧ 누적 비용 / 스테이지 80 누적 골드 = ' + use + '% (목표 60~80%)',
             got: use + '%', want: '60~80%', pass: use >= 60 && use <= 80 });
  }
  /* 능동 수입(킬+클리어)만으로도 어디까지 가는지 — 참고 기록 */
  console.log('  · 참고: 스테이지 80 «능동만» 누적 골드 = ' + live.activeGold80.toExponential(3)
            + ' · Lv300×3 비용 = ' + live.cost300.toExponential(3));

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 140) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY112 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
