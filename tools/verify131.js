/* 작업 131 게이트 — 훈련 스탯(val) 곡선 재설계의 «실동작» 회귀 방지.
   실행: node tools/verify131.js

   112 가 비용 곡선을 완화해 «스테이지 80 = 훈련 4단계» 를 만들었더니, val 곡선이 그대로라
   «내 공격 / 적 HP» 가 스테이지당 계속 벌어졌다(s80 에서 훈련만으로 1.4e7배 — sim112 [D]).
   131 은 **배율만** 고쳐 그 비를 스테이지 불변으로 만든다.

   수치 판정(난이도 프로파일·역산)은 `node tools/sim131.js` 가 본다.
   이 게이트는 그 곡선이 **게임 안에서 실제로 그렇게 동작하는지** 를 본다(T2 «기능 완성 규칙»):
     ① 소스   — trainVal 정의 1곳 · TRAIN_VAL_KNEE/TRAIN_VAL_R 존재 · 훈련 3종만 갈아탐
     ② 곡선   — U.{atk,hp,regen}.val(l) 이 «무릎까지 구곡선 · 그 뒤 새 배율» 식과 정확히 일치
     ③ 불변   — Lv 0~무릎 스탯값이 131 이전(18·1.12^l 등)과 한 푼도 다르지 않다
     ④ 역산   — 설치된 배율이 «비 불변» 등식의 해와 일치한다(표를 베끼지 않는다)
     ⑤ 구매   — 훈련 카드를 실제로 눌러 Lv 를 올리면 stat.dmg·maxHp·regen 과 카드 문구가 따라온다
     ⑥ 전투   — 무릎 위 레벨에서 «내 공격 / 적 HP» 가 종전 대비 실제로 줄고, 살아 있는 코드로 잰
                 스테이지 20·80 의 비가 sim131 표와 일치한다(정규식 시뮬 ↔ 실코드 교차 검증)
     ⑦ 불변2  — 112 지시(상한 Lv 300 · 단계당 +10% · 비용 곡선)와 세이브 구조는 안 바뀌었다
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

  /* 168 이 설치되면 이 게이트는 스스로 물러난다 — sim131.js 와 같은 이유.
     131 이 단언하던 것(무릎 · 배율 · 무릎 아래 불변)은 168 이 구조째 폐기했다. */
  if(/const TRAIN_VAL_K\s*=/.test(src) && !/const TRAIN_VAL_KNEE\s*=/.test(src)){
    console.log('VERIFY131 SUPERSEDED — 작업 168 이 val 곡선을 선형(TRAIN_VAL_K)으로 교체했다.');
    console.log('  → 실동작은 `node tools/verify168.js` · 수치는 `node tools/sim168.js` 를 보라.');
    console.log('VERIFY131 PASS (대체됨)');
    process.exit(0);
  }

  eq('① trainVal 정의 1곳',        (src.match(/const trainVal = /g) || []).length, 1);
  eq('① TRAIN_VAL_KNEE 정의 1곳',  (src.match(/const TRAIN_VAL_KNEE\s*=/g) || []).length, 1);
  eq('① TRAIN_VAL_R 정의 1곳',     (src.match(/const TRAIN_VAL_R\s*=/g) || []).length, 1);
  eq('① val:trainVal( 를 쓰는 UPG 행 = 훈련 3종', (src.match(/val:trainVal\(/g) || []).length, 3);
  ['atk','hp','regen'].forEach(id =>
    yes('① ' + id + ' 가 trainVal 을 쓴다',
        new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "'").test(src)));
  /* 훈련 밖 6종은 한 글자도 안 건드렸다 — 남의 스탯을 건드리지 않았다는 단언 */
  /* 358 이관(2026-08-29) — «훈련 밖 7종» 이 **6종**이 됐다. `spd`(이동 속도)는 주인 지시로 축째 삭제.
     끄기(음성)와 켜기(양성)는 짝으로 넣는다(347 교훈 ②) — 목록에서 빼기만 하면
     «358 이 통째로 되돌아와도 초록인 게이트» 가 된다. */
  eq("① UPG 에 이동 속도(spd) 행 0곳 — 358 이 지운 축", (src.match(/\{ id:'spd',/g) || []).length, 0);
  ['aspd','crit','cdmg','pierce','def','gold'].forEach(id =>
    yes('① ' + id + ' 는 종전 val 식 유지',
        new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:l =>").test(src)));

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
    /* 131 «이전» 곡선 = 무릎 없는 단일 지수. 여기 적는 계수·배율은 index.html 의 UPG 행과 같아야 한다. */
    const B = { atk:18, hp:160, regen:4 }, RR = { atk:1.12, hp:1.10, regen:1.10 };
    const out = { knee: TRAIN_VAL_KNEE, rv: Object.assign({}, TRAIN_VAL_R), badNew: [], badOld: [], base: [] };
    for(const id of ['atk','hp','regen']){
      for(const l of [0,1,5,10,32,33,34,50,100,200,300,308]){
        const want = B[id] * Math.pow(RR[id], Math.min(l, TRAIN_VAL_KNEE))
                   * Math.pow(TRAIN_VAL_R[id], Math.max(0, l - TRAIN_VAL_KNEE));
        if(Math.abs(U[id].val(l) - want) > Math.abs(want) * 1e-12) out.badNew.push(id + '@' + l);
      }
      /* ③ 무릎 이하는 131 «이전» 곡선과 완전히 같아야 한다 */
      for(let l=0;l<=TRAIN_VAL_KNEE;l++){
        const old = B[id] * Math.pow(RR[id], l);
        if(Math.abs(U[id].val(l) - old) > Math.abs(old) * 1e-12) out.badOld.push(id + '@' + l);
      }
      out.base.push(id + '=' + U[id].val(0));
    }
    return out;
  });
  eq('② val 무릎 Lv', cur.knee, 33);
  eq('② U.val(l) 이 구간별 지수 식과 일치', cur.badNew.join(',') || 'none', 'none');
  eq('③ Lv 0~무릎 스탯값이 131 이전과 동일', cur.badOld.join(',') || 'none', 'none');
  eq('③ Lv 0 기본값 불변(계수를 안 건드렸다)', cur.base.join(' '), 'atk=18 hp=160 regen=4');

  /* ── ④ 배율 역산 — 표를 베끼지 않고 등식을 단언한다 ── */
  const inv = await p.evaluate(() => {
    /* dL/ds 는 «비용 곡선이 실제로 그리는» 기울기다. 살아 있는 U.cost 로 누적표를 만들어 잰다. */
    const T = [0];
    for(let l=0;l<1200;l++) T[l+1] = T[l] + U.atk.cost(l) + U.hp.cost(l) + U.regen.cost(l);
    return { T80: T[308], eh: eHp(2)/eHp(1), ed: eDmg(2)/eDmg(1),
             rv: Object.assign({}, TRAIN_VAL_R) };
  });
  /* dL/ds 는 sim131 이 같은 비용 곡선에서 실측해 출력한다 — 여기서는 그 값으로 등식만 확인한다 */
  const simOut = execFileSync(process.execPath, [path.join(__dirname, 'sim131.js')], { encoding:'utf8' });
  yes('④ sim131 이 SIM131 PASS', /SIM131 PASS/.test(simOut));
  const mD = simOut.match(/dL\/ds = \(Lv(\d+)−Lv(\d+)\)\/60 = ([\d.]+)/);
  yes('④ sim131 출력에서 dL/ds 를 읽었다', !!mD);
  if(mD){
    const dlds = parseFloat(mD[3]);
    near('④ atk 배율 = eHp배율^(1/dLds)',   inv.rv.atk,   Math.exp(Math.log(inv.eh)/dlds), 2e-4);
    near('④ hp 배율 = eDmg배율^(1/dLds)',   inv.rv.hp,    Math.exp(Math.log(inv.ed)/dlds), 2e-4);
    near('④ regen 배율 = eDmg배율^(1/dLds)', inv.rv.regen, Math.exp(Math.log(inv.ed)/dlds), 2e-4);
  }

  /* ── ⑤ 실제 구매 → 전투 스탯 반영 ── */
  const buy = await p.evaluate(async () => {
    S.buyQty = 1; S.autoBuy = false;
    S.lv.atk = 120; S.lv.hp = 120; S.lv.regen = 120; S.trainStage = 2;
    S.gold = 1e12; fxDisp && (fxDisp.gold = S.gold);
    markDirty();                     /* 단계 보너스 캐시를 밀어야 기준값이 «구매 전» 을 잰다 */
    openTrain(); renderTrain();
    const b = { lv: lv('atk'), gold: S.gold, cost: U.atk.cost(lv('atk')),
                dmg: stat.dmg, hp: stat.maxHp, rg: stat.regen };
    document.querySelector('#trw [data-tr="atk"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
    await new Promise(r => setTimeout(r, 60));
    document.querySelector('#trw [data-tr="atk"]').dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
    await new Promise(r => setTimeout(r, 120));
    return { b, lv: lv('atk'), gold: S.gold, dmg: stat.dmg,
             ratio: stat.dmg / b.dmg, want: TRAIN_VAL_R.atk,
             card: (document.querySelector('#trw [data-tr="atk"] .ch i') || {}).textContent };
  });
  eq('⑤ 무릎 위에서 강화 클릭 → Lv +1', buy.lv - buy.b.lv, 1);
  /* 전투가 뒤에서 계속 돌아 골드가 동시에 들어온다(클릭 대기 180ms 사이 몇 골드). 절대오차로 본다. */
  yes('⑤ 골드가 정확히 비용만큼 감소 (오차 = 그 사이 전투 수입 ≤ 100)',
      Math.abs((buy.b.gold - buy.gold) - buy.b.cost) <= 100);
  near('⑤ 피해가 «새 배율» 만큼만 오른다', buy.ratio, buy.want, 1e-9);
  eq('⑤ 카드 레벨 표기 갱신', buy.card, 'Lv. 121');

  /* HUD·전투력도 새 값을 따라온다 */
  const hud = await p.evaluate(() => { fxDisp.gold = S.gold; drawHud();
    return { gold: $('goldN').textContent, wantGold: fmt(S.gold), cp: $('cpN').textContent }; });
  eq('⑤ HUD 골드 = fmt(S.gold)', hud.gold, hud.wantGold);
  yes('⑤ HUD 전투력이 비어 있지 않다', !!hud.cp && hud.cp !== 'NaN' && hud.cp !== 'undefined');

  /* ── ⑥ 전투 — 살아 있는 코드로 «공격/적HP» 를 재고 sim131 표와 대조 ── */
  const fight = await p.evaluate(() => {
    /* 장비·스킬·펫 배율을 뺀 «훈련만» 비교라 U.val 을 직접 쓴다(sim131 과 같은 정의) */
    const tb = st => 1 + TRAIN_BONUS * (st - 1);
    const old = (id,l,b,r) => b * Math.pow(r, l);
    const at = (s, L, st) => ({
      now: U.atk.val(L) * tb(st) / eHp(s),
      was: old('atk', L, 18, 1.12) * tb(st) / eHp(s)
    });
    return { s20: at(20, 78, 1), s80: at(80, 308, 4) };
  });
  const mR = [...simOut.matchAll(/^\s+(20|80) \|\s+\d+ \|\s+\d+ \|\s+([\d.e+-]+) \|/gm)];
  const simR = {}; mR.forEach(m => { if(!(m[1] in simR)) simR[m[1]] = parseFloat(m[2]); });
  near('⑥ 실코드 s20 공격/적HP = sim131 [A] 값', fight.s20.now, simR['20'], 5e-3);
  near('⑥ 실코드 s80 공격/적HP = sim131 [A] 값', fight.s80.now, simR['80'], 5e-3);
  yes('⑥ s80 난이도가 131 이전보다 실제로 어려워졌다 (' + fight.s80.was.toExponential(2)
      + ' → ' + fight.s80.now.toExponential(2) + ')', fight.s80.now < fight.s80.was / 1e4);
  yes('⑥ 그래도 훈련만으로 s80 몹을 잡을 수 있다 (비 ≥ 0.5)', fight.s80.now >= 0.5);
  yes('⑥ s20 ↔ s80 난이도 표류 ≤ 3배',
      Math.max(fight.s80.now / fight.s20.now, fight.s20.now / fight.s80.now) <= 3);

  /* ── ⑦ 112·세이브 불변 ── */
  const keep = await p.evaluate(() => {
    S.lv.atk = S.lv.hp = S.lv.regen = 300; S.trainStage = 3;
    const ready = trainReady();
    return { knee: TRAIN_KNEE, rt: TRAIN_COST_R, capStep: TRAIN_CAP_STEP, bonus: TRAIN_BONUS,
             cap: trainCap(), ready, cost300: U.atk.cost(300) };
  });
  eq('⑦ 112 비용 무릎 Lv 불변', keep.knee, 15);
  eq('⑦ 112 비용 배율 불변', keep.rt, 1.05);
  eq('⑦ 단계당 상한 불변', keep.capStep, 100);
  eq('⑦ 단계당 보너스 불변', keep.bonus, 0.1);
  eq('⑦ 3단계 상한 = Lv 300', keep.cap, 300);
  yes('⑦ 3종 Lv 300 이면 승급 준비 완료', keep.ready === true);
  near('⑦ Lv 300 비용은 131 전후 동일(45·1.19^15·1.05^285)',
       keep.cost300, 45 * Math.pow(1.19, 15) * Math.pow(1.05, 285), 1e-12);

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 140) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY131 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
