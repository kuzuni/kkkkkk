#!/usr/bin/env node
/* 작업 168 — 훈련 `val` 곡선 «지수 → 선형» 시뮬레이터 + 게이트
   (저장소 주인 지시 2026-08-27: «훈련에 스탯 오르는 거 지수 말고 선형으로 올라야 함»)

   131 은 val 을 «구간별 지수»(무릎 Lv33 까지 ×1.12/1.10, 그 뒤 ×1.0599/1.0348)로 만들어
   «내 공격 / 적 HP» 를 스테이지 불변으로 맞췄다. 168 은 그 구조 자체를 폐기하고
   `b + k×l` 선형으로 간다 — 기울기는 **주인 확정값**(atk +20 · hp +100 · regen +15/Lv)이라
   역산 대상이 아니다. 그래서 이 도구가 하는 일은 «값 고르기» 가 아니라 **결과 재기** 다.

   ★ 이 교체의 본체는 «적 스케일과의 정합» 이다(PROGRESS 168 등재문의 ⚠).
     적 HP·공격이 스테이지당 지수인데 훈련 스탯이 선형이면, 훈련 축은
     **어느 스테이지에서든 반드시 벽에 부딪힌다** — 수학적으로 피할 수 없다.
     그러므로 이 시뮬의 판정 대상은 «벽이 있느냐»(있다. 설계다)가 아니라 **«벽이 어디에 서는가»** 다.
     그 지점을 실측해 작업 177(적 곡선 재조정 — 주인 확정 지시)의 입력으로 남긴다.
     ±10% 류 «변화량» 게이트는 이 건에 부적용이다(곡선 교체 자체가 목적 — 등재문 명시).

   출력
     [A] 설치 상수 — index.html 에서 실측(베끼지 않는다)
     [B] before(131 구간별 지수) / after(168 선형) 스탯값 대조 — Lv 0·10·33·100·300
     [C] 난이도 프로파일 before/after — 스테이지별 도달 Lv · 공격/적HP · 몹 처치 · 보스 소요
     [D] **벽 위치 실측** — 훈련만으로 몹 처치가 1초/보스가 제한시간을 넘는 첫 스테이지
     [E] 게이트
   실행: node tools/sim168.js [--h=3.0]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function pick(re, what){
  const m = SRC.match(re);
  if(!m){ console.error('SIM168 FAIL — index.html 에서 «' + what + '» 를 못 찾았다: ' + re); process.exit(1); }
  return m;
}
const num = (re, what) => parseFloat(pick(re, what)[1]);

/* ---------- [A] index.html 실측 상수 (sim112/sim131 과 같은 방식) ---------- */
const EG_B = num(/const eGold\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/,        'eGold 계수');
const EG_R = num(/const eGold\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/, 'eGold 배율');
/* 177 — 적 곡선의 «표기» 가 갈렸다(구 순수 지수 / 177 선형×구간별 저지수).
   정규식을 여기 두면 곡선을 갈아 끼울 때마다 이 시뮬이 먼저 죽는다(LESSONS 168-③) —
   표기 해석은 `tools/ecurve.js` 한 곳으로 모았다. 이 파일은 «값» 만 쓴다. */
const EC = require('./ecurve')(SRC, 'SIM168');
const N_MOB = num(/const ENEMY_COUNT\s*=\s*(\d+)/,        'ENEMY_COUNT');
/* ⚑ 696(2026-09-01) — 199 21회차 이관 누락분. 등재문이 센 셋(sim177·sim249·verify177) 밖에서
   **전수 스윕으로 하나 더** 나온 자리다(같은 선언·같은 한 줄). 제품은 «1회 적립 상한
   OFF_MAX_H 6h» 를 선언째 걷어내고(결3 ⓑ) 하루 예산 `OFF_DAY_CAP_MIN`(분)으로 자른다.
   이 자는 S_END 가 80 이라 유휴 가정이 `h = H_MAX·s/80 ≤ H_MAX` 이고 민감도 밴드 최댓값이
   **정확히 6.0h** 라 두 상한(6h·24h) 어느 쪽으로도 잘리는 값이 같다
   ⇒ 산출 수치 완전 불변(`verify696` [B] 가 A/B 로 못박는다). */
const OFF_H = num(/const OFF_DAY_CAP_MIN\s*=\s*(\d+)/, 'OFF_DAY_CAP_MIN') / 60;
/* 517 — 요구치가 «구간표» 가 됐다(326 의 «단계 몫 300n» 폐기). 제품의 표를 그대로 읽는다 —
   숫자를 여기 베끼면 표를 갈 때마다 이 시뮬이 조용히 갈라진다(LESSONS 168-③). 값은 3종 합이다. */
const T_NEED = pick(/const TRAIN_NEED\s*=\s*\[([^\]]+)\]/, 'TRAIN_NEED')[1]
  .split(',').map(s => parseFloat(s));
const T_BON = num(/const TRAIN_BONUS\s*=\s*([\d.]+)/,     'TRAIN_BONUS');
const BSEC  = num(/const BOSS_SEC\s*=\s*(\d+)/,           'BOSS_SEC');
const CLEAR_K = num(/const bonusG = eGold\(S\.stage-1\)\s*\*\s*(\d+)/, '클리어 보상 배수');
const OFF_A = num(/const gold = eGold\(S\.stage\)\s*\*\s*stat\.goldMul\s*\*\s*([\d.]+)/, '오프라인 계수 A');
const OFF_B = num(/const gold = eGold\(S\.stage\)[^;]*?\*\s*sec\s*\*\s*([\d.]+)/,        '오프라인 계수 B');
const DUN_G = num(/id:'gold'[\s\S]{0,220}?rw:f\s*=>\s*\(\{\s*gold:\s*(\d+)/, '골드 던전 보상');
const G_ZOM = num(/zombie:\s*\{[\s\S]{0,320}?gold:([\d.]+)/, 'zombie gold');
const G_GOB = num(/goblin:\s*\{[\s\S]{0,320}?gold:([\d.]+)/, 'goblin gold');
const G_DRK = num(/dark:\s*\{[\s\S]{0,320}?gold:([\d.]+)/,   'dark gold');
const G_BOS = num(/boss:\s*\{[\s\S]{0,320}?gold:([\d.]+)/,   'boss gold');
const H_ZOM = num(/zombie:\s*\{[\s\S]{0,320}?hp:([\d.]+)/,   'zombie hp');
const H_DRK = num(/dark:\s*\{[\s\S]{0,320}?hp:([\d.]+)/,     'dark hp');
const H_GOB = num(/goblin:\s*\{[\s\S]{0,320}?hp:([\d.]+)/,   'goblin hp');
const H_BOS = num(/boss:\s*\{[\s\S]{0,320}?hp:([\d.]+)/,     'boss hp');
/* 훈련이 못 파는 7종은 Lv 0 에 고정 — 그 «Lv 0 값» 이 전투 계산의 상수다 */
/* 553 — «훈련만» DPS 대용식은 네 시뮬이 손으로 베끼던 것을 `tools/dpsk.js` 한 곳으로 모았다.
   훈련 밖 7종 Lv 0 값(공속·치명·치명피해)도 거기서 같이 읽는다. */
const DK = require('./dpsk')(SRC, 'SIM168');
const ASPD0 = DK.ASPD0, CRIT0 = DK.CRIT0, CDMG0 = DK.CDMG0;

const STATS = ['atk','hp','regen'];

/* 비용 곡선(112) — 안 바뀌었다는 것까지가 게이트 대상이다 */
function costCurve(id){
  const m = pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:trainCost\\(([\\d.]+),\\s*([\\d.]+)\\)"), id + ' cost');
  return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
}
const COST = {}; STATS.forEach(id => COST[id] = costCurve(id));
const C_KNEE = num(/const TRAIN_KNEE\s*=\s*(\d+)/,      'TRAIN_KNEE');
const C_R    = num(/const TRAIN_COST_R\s*=\s*([\d.]+)/, 'TRAIN_COST_R');

/* ---- 설치된 val 곡선 = 168 선형 ---- */
const VKS = pick(/const TRAIN_VAL_K\s*=\s*\{([^}]*)\}/, 'TRAIN_VAL_K (168 선형 기울기)');
const LIN_K = {};
VKS[1].replace(/(\w+)\s*:\s*([\d.]+)/g, (_, k, v) => { LIN_K[k] = parseFloat(v); return ''; });
const LIN_B = {};
STATS.forEach(id => {
  LIN_B[id] = parseFloat(pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*([\\d.]+)\\s*\\)"),
                              id + ' val 선형 기저')[1]);
});
const HAS_KNEE = /const TRAIN_VAL_KNEE\s*=/.test(SRC) || /const TRAIN_VAL_R\s*=/.test(SRC);

/* ---- before = 131 이 설치했던 구간별 지수 (기록 대조용 상수. 코드에는 더 이상 없다) ----
   여기 적힌 값은 «옛 곡선» 이라 index.html 에서 읽을 수 없다 — 131 의 review·PROGRESS 기록값이다.
   게이트는 이 표를 판정 근거로 쓰지 않는다(대조 표시 전용). */
const OLD = { knee: 33,
              b: { atk:18, hp:160, regen:4 },
              r: { atk:1.12, hp:1.10, regen:1.10 },
              r2:{ atk:1.0599, hp:1.0348, regen:1.0348 } };
const oldVal = (id, l) => OLD.b[id] * Math.pow(OLD.r[id], Math.min(l, OLD.knee))
                        * Math.pow(OLD.r2[id], Math.max(0, l - OLD.knee));
const newVal = (id, l) => LIN_B[id] + LIN_K[id] * l;

/* ---------- 골드·레벨 모델 (sim112/sim131 과 동일 — 같은 가정 위에서 비교해야 한다) ---------- */
const ARG_H = process.argv.find(a => a.startsWith('--h='));
const H_MAX = ARG_H ? parseFloat(ARG_H.slice(4)) : 3.0;
const T_STAGE = 40, S_END = 80, L_MAX = 1200;
const eGold = s => EG_B*Math.pow(EG_R, s-1);
const eHp   = EC.eHp;
const eDmg  = EC.eDmg;
const isBoss = s => s % 10 === 0;
const mobGoldMul = s => s<3 ? G_ZOM : s<5 ? 0.44*G_GOB+0.56*G_ZOM : 0.44*G_GOB+0.16*G_DRK+0.40*G_ZOM;
const mobHpMul   = s => s<3 ? H_ZOM : s<5 ? 0.44*H_GOB+0.56*H_ZOM : 0.44*H_GOB+0.16*H_DRK+0.40*H_ZOM;
function stageGold(s){
  const kill  = isBoss(s) ? eGold(s)*G_BOS : N_MOB*eGold(s)*mobGoldMul(s);
  const h = H_MAX*s/S_END;
  const idle  = eGold(s)*OFF_A*OFF_B*Math.min(h, OFF_H)*3600;
  return kill + eGold(s)*CLEAR_K + idle + DUN_G*((h*3600+T_STAGE)/86400);
}
const CUM = [0];
for(let s=1;s<=S_END;s++) CUM[s] = CUM[s-1] + stageGold(s);
const costAt = (id,l) => COST[id].b * Math.pow(COST[id].r, Math.min(l, C_KNEE))
                       * Math.pow(C_R, Math.max(0, l - C_KNEE));
const T_COST = [0];
for(let l=0;l<L_MAX;l++) T_COST[l+1] = T_COST[l] + STATS.reduce((t,id)=>t+costAt(id,l),0);
const levelFor = G => { let L=0; while(L<L_MAX && T_COST[L+1] <= G) L++; return L; };
const LV = []; for(let s=1;s<=S_END;s++) LV[s] = levelFor(CUM[s]);
/* 517 — 상한은 구간표 몫(3종 합)의 누적합이다(스탯당은 그 1/3).
   «레벨 → 단계» 역함수는 나눗셈이 아니라 누적합을 넘어설 때까지 세는 것이다.
   경계 규약은 종전과 같다 — 상한을 **정확히 찍은** 레벨은 이미 다음 단계로 센다. */
const TSTEP = n => T_NEED[Math.min(Math.max(1, n), T_NEED.length) - 1] / 3;   /* 스탯당 몫 */
const TCAP  = n => { let s = 0; for(let k = 1; k <= n; k++) s += TSTEP(k); return s; };
const tstage = L => { let n = 1; while(TCAP(n) <= L) n++; return n; };
const tb = L => 1 + T_BON*(tstage(L)-1);

/* 전투 모델 — 훈련 3종만. 장비·스킬·펫 배율은 전부 1(«훈련만» 하한). */
/* 553 — 대용식에 **스킬 항**이 빠져 있었다. 이 게임에는 기본 공격이 없어 피해가 전부
   «장착 스킬» 에서 나오는데(`stat.dps`), 옛 식 `ASPD0 × critMul` 은 «일반 등급 스킬 1개» 의
   기여를 1.0 으로 접어 두고 있었다 — 504 가 `SK_DPS_REF` 를 1.84 → 6.49 로 재정박하자
   실측/대용 = **4.64** 가 되어 `verify177` ⑤ 가 빨개졌다(`probe553` 이 항등식으로 못박았다).
   식은 이제 `tools/dpsk.js` 가 소스에서 읽어 만든다. */
const DPS_K = DK.K;
const dps     = (V,s) => V('atk', LV[s]) * tb(LV[s]) * DPS_K;
const mobSec  = (V,s) => eHp(s)*mobHpMul(s) / dps(V,s);
const bossSec = (V,s) => eHp(s)*H_BOS      / dps(V,s);
const ratioA  = (V,s) => V('atk', LV[s])*tb(LV[s]) / (eHp(s)*H_ZOM);
const ratioH  = (V,s) => V('hp',  LV[s])*tb(LV[s]) / eDmg(s);

const f2 = n => n.toExponential(2);
console.log('SIM168 — 훈련 val 곡선 «지수 → 선형» (index.html 실측 상수)');
console.log('');
console.log('[A] 설치 상수');
console.log('  적    ' + EC.desc + ' · 보스 HP ×' + H_BOS + ' · 제한 ' + BSEC + '초');
console.log('  훈련  val(선형) ' + STATS.map(id => id + ' ' + LIN_B[id] + '+' + LIN_K[id] + '×l').join(' · '));
console.log('  훈련  비용(112 무릎 Lv ' + C_KNEE + ' 이후 ×' + C_R + ') — **168 이 안 건드린 축**');
console.log('  단계  몫(3종 합) ' + T_NEED.join('·') + '… · 단계당 전 스탯 +' + (T_BON*100) + '% — **168 이 안 건드린 축**');
console.log('  ' + DK.desc + ' → DPS 계수 ' + DPS_K.toFixed(4) + '   (553 — 스킬 항 포함)');
console.log('  무릎 구조(TRAIN_VAL_KNEE/TRAIN_VAL_R) 잔존: ' + (HAS_KNEE ? '있음 ← 폐기 미완료' : '없음 (폐기 완료)'));
console.log('');

console.log('[B] 스탯값 before(131 구간별 지수) → after(168 선형)');
console.log('        Lv |        공격력 before →  after |          체력 before →  after |     체력회복 before →  after');
[0,10,33,100,200,300].forEach(l => {
  const row = STATS.map(id => f2(oldVal(id,l)).padStart(8) + ' → ' + f2(newVal(id,l)).padStart(8));
  console.log('  ' + String(l).padStart(8) + ' | ' + row.join(' | '));
});
console.log('  (Lv 0 은 기저 b 를 그대로 물려받아 **셋 다 완전히 동일**하다 — 게이트 ①)');
console.log('');

function profile(title, V){
  console.log(title);
  console.log('     stage |  Lv | 단계 |   공격/적HP |  몹 처치(초) | 보스 소요(초) | 체력/적공격');
  [1,5,10,13,20,30,40,60,80].forEach(s => {
    const bs = bossSec(V,s);
    console.log('     ' + String(s).padStart(5) + ' | ' + String(LV[s]).padStart(3)
      + ' | ' + String(tstage(LV[s])).padStart(4)
      + ' | ' + f2(ratioA(V,s)).padStart(11)
      + ' | ' + f2(mobSec(V,s)).padStart(12)
      + ' | ' + (bs >= 1e4 ? f2(bs) : bs.toFixed(2)).padStart(13)
      + ' | ' + f2(ratioH(V,s)).padStart(11));
  });
  console.log('');
}
console.log('[C] 난이도 프로파일 («훈련만» — 장비·스킬·펫 배율 제외한 하한)');
profile('  before — 131 구간별 지수', oldVal);
profile('  after  — 168 선형 (설치본)', newVal);

/* ---------- [D] 벽 위치 실측 ---------- */
function wall(V, pred){ for(let s=1;s<=S_END;s++) if(pred(V,s)) return s; return null; }
const W_MOB1 = wall(newVal, (V,s) => mobSec(V,s) > 1);
const W_MOB5 = wall(newVal, (V,s) => mobSec(V,s) > 5);
const W_BOSS = wall(newVal, (V,s) => bossSec(V,s) > BSEC);
const W_TANK = wall(newVal, (V,s) => ratioH(V,s) < 1);
const O_MOB1 = wall(oldVal, (V,s) => mobSec(V,s) > 1);
const O_BOSS = wall(oldVal, (V,s) => bossSec(V,s) > BSEC);
console.log('[D] 벽 위치 — «훈련만으로» 버티는 한계 스테이지 (장비·유물·소환·펫 배율 = 1 가정)');
console.log('  선형은 지수 적 곡선을 이길 수 없다 — 벽은 **설계**이고, 이 표는 그 벽이 어디 서는지다.');
console.log('    기준                         | before(131) | after(168)');
console.log('    몹 1마리 처치 > 1초          | ' + String(O_MOB1 ?? '없음').padStart(11) + ' | ' + String(W_MOB1 ?? '없음').padStart(10));
console.log('    몹 1마리 처치 > 5초          | ' + String(wall(oldVal,(V,s)=>mobSec(V,s)>5) ?? '없음').padStart(11) + ' | ' + String(W_MOB5 ?? '없음').padStart(10));
console.log('    보스 소요 > 제한 ' + BSEC + '초         | ' + String(O_BOSS ?? '없음').padStart(11) + ' | ' + String(W_BOSS ?? '없음').padStart(10));
console.log('    체력/적공격 < 1 (한 방 사망) | ' + String(wall(oldVal,(V,s)=>ratioH(V,s)<1) ?? '없음').padStart(11) + ' | ' + String(W_TANK ?? '없음').padStart(10));
console.log('  → 훈련 축 단독 사거리는 스테이지 **' + (W_BOSS ? W_BOSS - 1 : S_END) + '** 까지다.');
console.log('    그 위는 장비·유물·소환·펫(지수 축)이 메워야 한다 = 주인이 의도한 구조.');
console.log('    적 곡선을 완화할지는 **작업 177**(주인 확정 지시)의 몫 — 168 은 손대지 않는다(곁가지 금지).');
console.log('    적 곡선을 어떻게 바꿨는지는 **작업 177 이 이미 처리**했다 — 지금 설치된 곡선은 «' + EC.form
          + '» 표기다. 이 시뮬은 그 곡선을 그대로 읽어 «훈련 축만» 의 사거리를 재는 도구로 남는다'
          + ' (177 의 판정은 `node tools/sim177.js`).');
console.log('');

/* ---------- [E] 게이트 — 등식을 단언한다(표를 베끼지 않는다. LESSONS 112-③) ---------- */
const g1 = STATS.every(id => Math.abs(newVal(id,0) - OLD.b[id]) < 1e-9);      /* Lv0 불변 */
const g2 = LIN_K.atk === 20 && LIN_K.hp === 100 && LIN_K.regen === 15;        /* 주인 확정 기울기 */
const g3 = !HAS_KNEE;                                                        /* 무릎 구조 폐기 */
/* ④ 선형성 — 2차 차분이 전 구간 0 이어야 한다(지수면 0 이 아니다) */
let lin = true;
STATS.forEach(id => { for(let l=0;l<=400;l++){
  const d2 = newVal(id,l+2) - 2*newVal(id,l+1) + newVal(id,l);
  if(Math.abs(d2) > 1e-9) lin = false;
} });
const g4 = lin;
/* ⑤ 단조 증가 — 어느 레벨에서도 스탯이 줄지 않는다 */
const g5 = STATS.every(id => { for(let l=0;l<400;l++) if(newVal(id,l+1) <= newVal(id,l)) return false; return true; });
/* ⑥ 112 지시 불변 — 스테이지 80 도달 Lv ≥ 300. 비용 곡선을 안 건드렸다는 실증 */
/* ⚠ 326(2026-08-28) — 112 가 못 박은 것은 **비용 곡선이 스테이지 80 에서 Lv 300 을 준다** 는 것이고,
   «4단계» 는 옛 상한식(단계당 100 고정)에서 그 레벨에 붙던 **이름표**였다. 326 은 비용 곡선을 한 줄도
   안 건드리고 상한식만 누적합으로 바꿨으므로 **Lv 는 그대로이고 이름표만 4 → 3 으로 내려간다.**
   그래서 판정은 «Lv ≥ 300» 만 하고 단계는 **실측값을 적기만** 한다 — 여기서 단계를 단언하면
   326 이 바꾸라고 지시받은 바로 그것을 게이트가 되돌리라고 요구하게 된다(수치 확정은 199 몫). */
const g6 = LV[80] >= 300;
/* ⑦ 훈련 축 단독으로 **첫 보스(스테이지 10)까지는 반드시 난다**.
   «before 보다 쉬워야 한다» 는 게이트가 아니다 — 기울기는 주인 확정값이라 협상 대상이 아니고,
   실제로 선형은 구곡선과 Lv ~28 부근에서 **교차**해 그 뒤로는 구곡선보다 낮다(아래 교차점 표).
   판정할 수 있는 것은 «곡선이 더 착한가» 가 아니라 «게임이 초반에 실제로 되는가» 뿐이다:
   훈련만으로 첫 보스가 제한시간 안에 잡히고 몹 처치가 1초를 안 넘으면 통과. */
const g7 = bossSec(newVal,10) < BSEC && mobSec(newVal,10) <= 1;
/* 교차점 — 선형이 구곡선 아래로 내려가는 첫 레벨 (기록용) */
const XOVER = {};
STATS.forEach(id => { XOVER[id] = null;
  for(let l=1;l<=400;l++) if(newVal(id,l) < oldVal(id,l)){ XOVER[id] = l; break; } });
/* ⑧ 이 항목의 **전제가 177 로 갈렸다**(LESSONS 168-②: 판정할 등식이 바뀌면 완화가 아니라 재정의다).
   168 이 쓴 원문은 «지수 적 곡선 앞에서 선형 훈련은 반드시 벽에 부딪힌다 — 그 위치를 177 에 넘긴다» 였다.
   177 이 그 입력을 받아 적 곡선을 «선형 항 × 구간별 저지수» 로 바꿨으므로, s ≤ 80 에서는 **무벽이 정상**이다.
   그래서 곡선 표기에 따라 **서로 반대 방향으로** 단언한다 — 어느 쪽이든 «집어낸 수치» 가 있어야 통과다.
     · 구 순수 지수 표기 → 벽이 반드시 있다(원문 그대로)
     · 177 표기        → s ≤ 80 에 벽이 없다(177 게이트 ⑧ 과 같은 사실을 훈련 축 쪽에서 본 것) */
/* 249 — 곡선에 «구간 계단» 이 얹히면 form 이 '249' 가 된다. 249 는 177 곡선을 구간 안에서
   **더 낮추기만** 하므로 «s ≤ 80 무벽» 이라는 이 항목의 단언은 그대로 성립한다(표기 이름만 넓힌다). */
const F177 = EC.form === '177' || EC.form === '249';
const g8 = F177 ? (W_BOSS === null && W_MOB1 === null)
                             : (W_BOSS !== null && W_MOB1 !== null);
console.log('[E] 게이트');
console.log('  ① Lv 0 스탯 불변 — ' + STATS.map(id => id + ' ' + newVal(id,0)).join(' · ') + ' : ' + (g1?'PASS':'FAIL'));
console.log('  ② 기울기 = 주인 확정 — atk +' + LIN_K.atk + ' · hp +' + LIN_K.hp + ' · regen +' + LIN_K.regen + '/Lv : ' + (g2?'PASS':'FAIL'));
console.log('  ③ 무릎 구조(TRAIN_VAL_KNEE·TRAIN_VAL_R) 완전 폐기 : ' + (g3?'PASS':'FAIL'));
console.log('  ④ 선형성 — Lv 0~400 2차 차분 전부 0 (지수 잔재 없음) : ' + (g4?'PASS':'FAIL'));
console.log('  ⑤ 단조 증가 — 어느 레벨에서도 스탯이 줄지 않는다 : ' + (g5?'PASS':'FAIL'));
console.log('  ⑥ 112 지시 불변 — 스테이지 80 도달 Lv ' + LV[80] + ' ≥ 300 : ' + (g6?'PASS':'FAIL')
          + '   [326 실측 단계 ' + tstage(LV[80]) + ' — 판정 대상 아님]');
console.log('  ⑦ 훈련만으로 첫 보스(s10) 통과 — 보스 ' + bossSec(newVal,10).toFixed(2) + '초 < 제한 ' + BSEC
          + '초 · 몹 처치 ' + mobSec(newVal,10).toFixed(3) + '초 ≤ 1초 : ' + (g7?'PASS':'FAIL'));
console.log('     ※ before 대비로는 s1~5 가 크게 쉬워지고(몹 처치 ' + mobSec(oldVal,1).toFixed(2) + '→'
          + mobSec(newVal,1).toFixed(2) + '초) s10 은 조금 빡빡해진다(' + mobSec(oldVal,10).toFixed(3) + '→'
          + mobSec(newVal,10).toFixed(3) + '초, +' + ((mobSec(newVal,10)/mobSec(oldVal,10)-1)*100).toFixed(1) + '%).');
console.log('     ※ 교차점(선형이 구곡선 아래로) — ' + STATS.map(id => id + ' Lv ' + (XOVER[id] ?? '없음')).join(' · ')
          + ' : 그 아래는 선형이 더 후하고 그 위는 더 박하다. 기울기가 주인 확정값이라 이는 «결과» 이지 «조절 대상» 이 아니다.');
console.log('  ⑧ ' + (F177
            ? '177 곡선 설치본 — s ≤ ' + S_END + ' 에 벽이 없다(몹>1초 ' + (W_MOB1 ?? '없음')
              + ' · 보스>' + BSEC + '초 ' + (W_BOSS ?? '없음') + ') : ' + (g8?'PASS':'FAIL')
            : '벽 위치가 수치로 잡힌다(177 입력) — 몹>1초 s' + W_MOB1 + ' · 보스>' + BSEC + '초 s' + W_BOSS
              + ' : ' + (g8?'PASS':'FAIL')));
console.log('  ⑨ 유휴 가정 민감도 — 선형이라 «도달 Lv» 만 움직이고 곡선 모양은 안 움직인다');
[0.5,1.0,3.0,6.0].forEach(h => {
  let cum = 0, l80 = 0;
  for(let s=1;s<=S_END;s++){
    const kill = isBoss(s) ? eGold(s)*G_BOS : N_MOB*eGold(s)*mobGoldMul(s);
    const hh = h*s/S_END;
    cum += kill + eGold(s)*CLEAR_K + eGold(s)*OFF_A*OFF_B*Math.min(hh,OFF_H)*3600 + DUN_G*((hh*3600+T_STAGE)/86400);
  }
  l80 = levelFor(cum);
  console.log('     H_MAX=' + h.toFixed(1) + 'h → 스테이지 80 도달 Lv ' + l80 + '(' + tstage(l80) + '단계) · 그때 공격력 '
            + f2(newVal('atk', l80)));
});
const pass = g1&&g2&&g3&&g4&&g5&&g6&&g7&&g8;
console.log(pass ? 'SIM168 PASS' : 'SIM168 FAIL');
process.exit(pass ? 0 : 1);
