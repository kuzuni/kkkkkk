/* 작업 168 게이트 — 훈련 스탯(val) «지수 → 선형» 의 **실동작** 회귀 방지.
   실행: node tools/verify168.js

   주인 지시(2026-08-27): «훈련에 스탯 오르는 거 지수 말고 선형으로 올라야 함».
   수치 판정(난이도 프로파일·벽 위치)은 `node tools/sim168.js` 가 본다.
   이 게이트는 그 곡선이 **게임 안에서 실제로 그렇게 동작하는지** 를 본다(T2 «기능 완성 규칙»):
     ① 소스   — trainVal 정의 1곳 · TRAIN_VAL_K 존재 · **무릎 구조(KNEE/R) 완전 부재** · 훈련 3종만 갈아탐
     ② 곡선   — U.{atk,hp,regen}.val(l) 이 `b + k×l` 과 **정확히** 일치(전 구간, 1e-12)
     ③ 선형성 — 살아 있는 코드에서 1차 차분이 상수 k · 2차 차분이 0 (지수 잔재가 한 점도 없다)
     ④ 불변   — Lv 0 값(18·160·4) · 112 비용 곡선 · 상한 · 단계 보너스 · 세이브 구조
     ⑤ 구매   — 훈련 카드를 **실제로 눌러** Lv 를 올리면 stat.dmg·maxHp·regen 과 카드 문구·HUD 가 따라온다
                 (그리고 오른 폭이 «레벨당 정확히 k» 다 — 선형이 «표시»가 아니라 «전투 수치»에 닿는다)
     ⑥ 교차   — 살아 있는 코드로 잰 «공격/적HP» 가 sim168 [C] after 표와 일치(정규식 시뮬 ↔ 실코드)
     ⑦ 벽     — 훈련만으로 첫 보스(s10)는 나고, 그 위 어딘가에 벽이 실제로 선다(=설계, 177 의 입력)
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

const K = { atk:20, hp:100, regen:15 };      /* 주인 확정 기울기 */
const B = { atk:18, hp:160, regen:4 };       /* 기저 = 현행 Lv0 값 유지 */

(async () => {
  /* ── ① 소스 ─────────────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  eq('① trainVal 정의 1곳',       (src.match(/const trainVal = /g) || []).length, 1);
  eq('① TRAIN_VAL_K 정의 1곳',    (src.match(/const TRAIN_VAL_K\s*=/g) || []).length, 1);
  eq('① TRAIN_VAL_KNEE 잔재 0곳', (src.match(/TRAIN_VAL_KNEE/g) || []).length, 0);
  eq('① TRAIN_VAL_R 잔재 0곳',    (src.match(/TRAIN_VAL_R\b/g) || []).length, 0);
  eq('① val:trainVal( 를 쓰는 UPG 행 = 훈련 3종', (src.match(/val:trainVal\(/g) || []).length, 3);
  ['atk','hp','regen'].forEach(id =>
    yes('① ' + id + ' 가 인자 2개짜리(선형) trainVal 을 쓴다',
        new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*[\\d.]+\\s*\\)").test(src)));
  /* 훈련 밖 6종은 한 글자도 안 건드렸다 — 남의 스탯을 건드리지 않았다는 단언 */
  /* 358 이관(2026-08-29) — «훈련 밖 7종» 이 **6종**이 됐다. `spd`(이동 속도)는 주인 지시로 축째 삭제.
     끄기(음성)와 켜기(양성)는 짝으로 넣는다(347 교훈 ②) — 목록에서 빼기만 하면
     «358 이 통째로 되돌아와도 초록인 게이트» 가 된다. */
  eq("① UPG 에 이동 속도(spd) 행 0곳 — 358 이 지운 축", (src.match(/\{ id:'spd',/g) || []).length, 0);
  /* 703 이관(2026-09-02) — «훈련 밖 6종» 이 **5종**. 공격 속도 축은 주인 지시로 목걸이 전속이 되어
     이 표를 떠났고, 바닥값은 상수 `BASE_RATE` 로 내려갔다. 358 이 세운 «끄기·켜기 짝» 을 따라
     음성항(표에 0곳)과 양성항(바닥 상수는 살아 있다)을 같이 세운다. */
  eq("① UPG 에 공격 속도 행 0곳 — 703 이 목걸이로 옮긴 축",
     (src.match(/name:'공격 속도'/g) || []).length, 0);
  yes("① 그 축의 바닥값은 상수 BASE_RATE 로 살아 있다(703)", /const BASE_RATE\s*=\s*[\d.]+/.test(src));
  ['crit','cdmg','pierce','def','gold'].forEach(id =>
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

  /* ── ②③④ 곡선 · 선형성 · Lv0 ── */
  const cur = await p.evaluate(({K, B}) => {
    const out = { k: Object.assign({}, TRAIN_VAL_K), bad: [], d1bad: [], d2bad: [], base: [] };
    for(const id of ['atk','hp','regen']){
      for(const l of [0,1,5,10,33,50,100,200,300,500,999]){
        const want = B[id] + K[id]*l;
        if(Math.abs(U[id].val(l) - want) > Math.abs(want) * 1e-12) out.bad.push(id + '@' + l);
      }
      /* 1차 차분이 상수 k · 2차 차분이 0 — 지수라면 둘 다 깨진다 */
      for(let l=0;l<=400;l++){
        const d1 = U[id].val(l+1) - U[id].val(l);
        if(Math.abs(d1 - K[id]) > 1e-9) out.d1bad.push(id + '@' + l);
        const d2 = U[id].val(l+2) - 2*U[id].val(l+1) + U[id].val(l);
        if(Math.abs(d2) > 1e-9) out.d2bad.push(id + '@' + l);
      }
      out.base.push(id + '=' + U[id].val(0));
    }
    return out;
  }, {K, B});
  eq('② U.val(l) 이 b + k×l 과 일치(전 구간)', cur.bad.join(',') || 'none', 'none');
  eq('② TRAIN_VAL_K = 주인 확정값', JSON.stringify(cur.k), JSON.stringify(K));
  eq('③ 1차 차분이 레벨당 상수 k (Lv 0~400)', cur.d1bad.join(',') || 'none', 'none');
  eq('③ 2차 차분이 0 — 지수 잔재 없음 (Lv 0~400)', cur.d2bad.join(',') || 'none', 'none');
  eq('④ Lv 0 기본값 불변(기저를 안 건드렸다)', cur.base.join(' '), 'atk=18 hp=160 regen=4');

  /* ── ⑤ 실제 구매 → 전투 스탯·카드·HUD 반영 ── */
  for(const id of ['atk','hp','regen']){
    const buy = await p.evaluate(async (id) => {
      S.buyQty = 1; S.autoBuy = false;
      S.lv.atk = 120; S.lv.hp = 120; S.lv.regen = 120; S.trainStage = 2;
      S.gold = 1e12; if(typeof fxDisp !== 'undefined' && fxDisp) fxDisp.gold = S.gold;
      markDirty();
      openTrain(); renderTrain();
      const pickStat = () => ({ dmg: stat.dmg, hp: stat.maxHp, rg: stat.regen });
      const b = { lv: lv(id), gold: S.gold, cost: U[id].cost(lv(id)), val: U[id].val(lv(id)), st: pickStat() };
      const el = document.querySelector('#trw [data-tr="' + id + '"]');
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
      await new Promise(r => setTimeout(r, 60));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
      await new Promise(r => setTimeout(r, 120));
      return { b, lv: lv(id), gold: S.gold, val: U[id].val(lv(id)), st: pickStat(),
               card: (document.querySelector('#trw [data-tr="' + id + '"] .ch i') || {}).textContent };
    }, id);
    eq('⑤ ' + id + ' 카드 클릭 → Lv +1', buy.lv - buy.b.lv, 1);
    /* 전투가 뒤에서 계속 돌아 골드가 동시에 들어온다(대기 180ms 사이 몇 골드). 절대오차로 본다. */
    yes('⑤ ' + id + ' 골드가 정확히 비용만큼 감소 (오차 = 그 사이 전투 수입 ≤ 100)',
        Math.abs((buy.b.gold - buy.gold) - buy.b.cost) <= 100);
    near('⑤ ' + id + ' 효과값이 «정확히 +k» 만큼 오른다', buy.val - buy.b.val, K[id], 1e-9);
    eq('⑤ ' + id + ' 카드 레벨 표기 갱신', buy.card, 'Lv. 121');
    /* 그 스탯이 실제 전투 수치에 닿는다 — 훈련 단계 배율(×1.1)이 곱해진 만큼 오른다 */
    const field = id === 'atk' ? 'dmg' : id === 'hp' ? 'hp' : 'rg';
    yes('⑤ ' + id + ' → stat.' + field + ' 가 실제로 증가 (' + buy.b.st[field] + ' → ' + buy.st[field] + ')',
        buy.st[field] > buy.b.st[field]);
    near('⑤ ' + id + ' → stat.' + field + ' 증가분 = k × (그 스탯의 배율)',
         buy.st[field] - buy.b.st[field],
         K[id] * (buy.b.st[field] / buy.b.val), 5e-3);
  }

  /* HUD 골드는 `fmtG`(작업 150 — 골드만 A/B/C 알파벳 단위)로 찍힌다. `fmt` 가 아니다. */
  const hud = await p.evaluate(() => { if(typeof fxDisp !== 'undefined' && fxDisp) fxDisp.gold = S.gold; drawHud();
    return { gold: $('goldN').textContent, wantGold: fmtG(fxVal('gold')), cp: $('cpN').textContent }; });
  eq('⑤ HUD 골드 = fmtG(fxVal(gold)) (150 의 알파벳 단위)', hud.gold, hud.wantGold);
  yes('⑤ HUD 전투력이 비어 있지 않다', !!hud.cp && hud.cp !== 'NaN' && hud.cp !== 'undefined');

  /* ── ⑥ 실코드 ↔ sim168 교차 검증 ── */
  const simOut = execFileSync(process.execPath, [path.join(__dirname, 'sim168.js')], { encoding:'utf8' });
  yes('⑥ sim168 이 SIM168 PASS', /SIM168 PASS/.test(simOut));
  const after = simOut.split('after  — 168 선형')[1] || '';
  const rows = {};
  [...after.matchAll(/^\s+(\d+) \|\s+(\d+) \|\s+\d+ \|\s+([\d.e+-]+) \|\s+([\d.e+-]+) \|/gm)]
    .forEach(m => { if(!(m[1] in rows)) rows[m[1]] = { lv: +m[2], ratio: parseFloat(m[3]), mob: parseFloat(m[4]) }; });
  yes('⑥ sim168 [C] after 표에서 s20·s80 행을 읽었다', !!rows['20'] && !!rows['80']);
  if(rows['20'] && rows['80']){
    const fight = await p.evaluate(({ r20, r80 }) => {
      const tb = s => 1 + TRAIN_BONUS * (s - 1);
      const cap = n => trainCapAt(n);   /* 517 — 상한식은 제품(구간표 누적합)의 것이다 */
      const st = L => { let n = 1; while(cap(n) <= L) n++; return n; };
      const ZOM = 1;   /* sim168 의 몹 HP 배수 기준선(zombie)과 같은 정의 */
      return {
        /* 326 — 레벨 → 단계는 나눗셈이 아니라 «단계 몫 누적합» 의 역함수다. 제품의 trainCapAt 을
           빌리지 않고 여기서 다시 적는다(같은 함수를 불러 비교하면 아무것도 안 재게 된다). */
        s20: U.atk.val(r20.lv) * tb(st(r20.lv)) / (eHp(20)*ZOM),
        s80: U.atk.val(r80.lv) * tb(st(r80.lv)) / (eHp(80)*ZOM)
      };
    }, { r20: rows['20'], r80: rows['80'] });
    near('⑥ 실코드 s20 공격/적HP = sim168 [C] after 값', fight.s20, rows['20'].ratio, 5e-3);
    near('⑥ 실코드 s80 공격/적HP = sim168 [C] after 값', fight.s80, rows['80'].ratio, 5e-3);
    yes('⑦ 벽이 실제로 선다 — s80 은 훈련만으로 못 넘는다 (공격/적HP ' + fight.s80.toExponential(2) + ' < 1)',
        fight.s80 < 1);
    yes('⑦ 그러나 s20 이하가 통째로 막히지는 않는다 (s20 비 ' + fight.s20.toExponential(2) + ' > 0.1)',
        fight.s20 > 0.1);
  }
  yes('⑦ sim168 이 벽 위치를 수치로 집어냈다(177 의 입력)', /훈련 축 단독 사거리는 스테이지 \*\*\d+\*\*/.test(simOut));

  /* ── ④ 112·세이브 불변 ── */
  const keep = await p.evaluate(() => {
    S.lv.atk = S.lv.hp = S.lv.regen = 300; S.trainStage = 3;
    const cap = trainCap(), ready300 = trainReady();
    S.lv.atk = S.lv.hp = S.lv.regen = cap;                 /* 326 — 3단계 상한까지 채운 상태 */
    return { knee: TRAIN_KNEE, rt: TRAIN_COST_R, capStep: trainStepAt(1), bonus: TRAIN_BONUS,
             cap, ready: ready300, ready600: trainReady(), cost300: U.atk.cost(300) };
  });
  eq('④ 112 비용 무릎 Lv 불변', keep.knee, 15);
  eq('④ 112 비용 배율 불변', keep.rt, 1.05);
  eq('④ 단계당 상한 불변', keep.capStep, 100);
  eq('④ 단계당 보너스 불변', keep.bonus, 0.1);
  /* 517(326 번복) — 3단계 상한은 100+100+100 = 300 이다(주인 구간표 «1~4단계 300» 의 스탯당 몫).
     168 이 지키는 것은 «비용 곡선·보너스를 안 건드렸다» 이고, 상한 «식» 은 326·517 의 소관이다. */
  eq('④ 3단계 상한 = 구간표 누적합 100+100+100 (517)', keep.cap, 300);
  yes('④ 3종이 3단계 상한(300)이면 승급 준비 완료', keep.ready600 === true);
  yes('④ 517 방향 — 3단계에서 Lv 300 은 상한 «정확히» 다', keep.ready === true);
  near('④ Lv 300 비용은 168 전후 동일(45·1.19^15·1.05^285)',
       keep.cost300, 45 * Math.pow(1.19, 15) * Math.pow(1.05, 285), 1e-12);

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 140) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY168 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
