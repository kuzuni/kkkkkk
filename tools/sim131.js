#!/usr/bin/env node
/* 작업 131 — 훈련 `val` 곡선 재설계 시뮬레이터 + 게이트
   (112 곁가지: «훈련 4단계까지 간다» 를 구현했더니 «전투가 압도적으로 쉬워졌다»)

   112 는 **비용** 곡선만 고쳤다. 그 결과 스테이지 80 도달 레벨이 105 → 308 이 됐는데
   `val` 곡선(레벨당 배율)은 그대로라, «내 공격 / 적 HP» 가 스테이지당 계속 벌어진다.
   131 은 **val 곡선의 배율**만 고쳐 그 비(比)를 스테이지 불변으로 만든다.

   LESSONS 106-1 «발명이 아니라 역산» · 112-1 «배율과 계수는 서로 다른 조건으로 따로 풀린다» 대로,
   자유도 두 개를 각각 따로 푼다:

     ① 배율  — «비가 스테이지 불변» 하나로 풀린다. 눈대중이 들어갈 자리가 없다.
                 r_atk = eHp배율^(1/(dL/ds))   ·   r_hp = r_regen = eDmg배율^(1/(dL/ds))
                 dL/ds 는 **설치된 비용 곡선에서 실측**한다(스테이지 20→80 회귀).
     ② 무릎  — 새 비를 «발명» 하지 않고, 게임이 이미 타고 있던 값(=112 가 안 건드린 초반 구간)
                 으로 되돌린다. 무릎 K 를 고르면 그 뒤의 평탄 비가 «오늘의 K 시점 비» 로 고정되므로,
                 K 는 곧 «어느 시점의 난이도로 평탄화할까» 다. 게임 자신의 빡빡함 정의
                 (작업 28 «보스 30초 제한») 로 푼다 — 보스전이 제한 30초의 목표 비율을 쓰게 하는 K.

   출력
     [A] 설치 곡선의 난이도 프로파일 — 스테이지별 도달 Lv · 공격/적HP · 몹 처치 시간 · 보스 소요
     [B] 배율 역산 (실측 dL/ds)
     [C] 무릎 후보별 평탄 비 · 보스 소요 — 채택 K 결정
     [D] 새 곡선의 난이도 프로파일 + 게이트 판정
   실행: node tools/sim131.js [--h=3.0] [--knee=N]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/* ---------- 168 이 설치되면 이 게이트는 스스로 물러난다 ----------
   131 은 «구간별 지수»(무릎 + 배율)를 판정하는 게이트다. 작업 168(주인 지시 2026-08-27)이
   그 구조 자체를 폐기하고 val 을 **선형**(`TRAIN_VAL_K`)으로 갈아치웠으므로, 131 의 등식
   (배율 역산 · 무릎 아래 불변 · 비 불변)은 판정할 대상이 없다 — «FAIL» 이 아니라 «대체됨» 이다.
   수치 판정은 `node tools/sim168.js` 가, 실동작은 `node tools/verify168.js` 가 이어받았다. */
if(/const TRAIN_VAL_K\s*=/.test(SRC) && !/const TRAIN_VAL_KNEE\s*=/.test(SRC)){
  console.log('SIM131 SUPERSEDED — 작업 168 이 val 곡선을 선형(TRAIN_VAL_K)으로 교체했다.');
  console.log('  131 의 «무릎 + 배율» 구조는 폐기됐으므로 판정할 등식이 없다.');
  console.log('  → 수치는 `node tools/sim168.js` · 실동작은 `node tools/verify168.js` 를 보라.');
  console.log('SIM131 PASS (대체됨)');
  process.exit(0);
}

function pick(re, what){
  const m = SRC.match(re);
  if(!m){ console.error('SIM131 FAIL — index.html 에서 «' + what + '» 를 못 찾았다: ' + re); process.exit(1); }
  return m;
}
const num = (re, what) => parseFloat(pick(re, what)[1]);

/* ---------- index.html 실측 상수 (sim112 와 같은 방식 — 베끼지 않는다) ---------- */
const EG_B = num(/const eGold\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/,        'eGold 계수');
const EG_R = num(/const eGold\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/, 'eGold 배율');
const EH_B = num(/const eHp\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/,          'eHp 계수');
const EH_R = num(/const eHp\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/,   'eHp 배율');
const ED_B = num(/const eDmg\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/,         'eDmg 계수');
const ED_R = num(/const eDmg\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/,  'eDmg 배율');
const N_MOB = num(/const ENEMY_COUNT\s*=\s*(\d+)/,        'ENEMY_COUNT');
const OFF_H = num(/const OFF_MAX_H\s*=\s*(\d+)/,          'OFF_MAX_H');
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
/* 훈련이 못 파는 7종은 Lv 0 에 고정돼 있다 — 그 «Lv 0 값» 이 전투 계산의 상수다 */
/* 553 — «훈련만» DPS 대용식은 네 시뮬이 손으로 베끼던 것을 `tools/dpsk.js` 한 곳으로 모았다.
   훈련 밖 7종 Lv 0 값(공속·치명·치명피해)도 거기서 같이 읽는다. */
const DK = require('./dpsk')(SRC, 'SIM131');
const ASPD0 = DK.ASPD0, CRIT0 = DK.CRIT0, CDMG0 = DK.CDMG0;

function upgCurve(id, field){
  const m = pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?" + field + ":l => ([\\d.]+)\\*Math\\.pow\\(([\\d.]+),l\\)"),
                 id + ' ' + field + ' 곡선');
  return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
}
function costCurve(id){
  const m = SRC.match(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:trainCost\\(([\\d.]+),\\s*([\\d.]+)\\)"));
  return m ? { b:parseFloat(m[1]), r:parseFloat(m[2]) } : upgCurve(id, 'cost');
}
function valCurve(id){       /* 131 설치 후에는 `val:trainVal('atk',18,1.12)` 표기가 된다 */
  const m = SRC.match(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*([\\d.]+),\\s*([\\d.]+)\\)"));
  return m ? { b:parseFloat(m[1]), r:parseFloat(m[2]) } : upgCurve(id, 'val');
}
const STATS = ['atk','hp','regen'];
const COST = {}, VAL = {};
STATS.forEach(id => { COST[id] = costCurve(id); VAL[id] = valCurve(id); });

const K_SRC = SRC.match(/const TRAIN_KNEE\s*=\s*(\d+)/);
const R_SRC = SRC.match(/const TRAIN_COST_R\s*=\s*([\d.]+)/);
const C_KNEE = K_SRC ? parseInt(K_SRC[1],10) : Infinity;
const C_R    = R_SRC ? parseFloat(R_SRC[1])  : null;
/* 131 이 설치하는 val 무릎·배율 (없으면 «131 미적용») */
const VK_SRC = SRC.match(/const TRAIN_VAL_KNEE\s*=\s*(\d+)/);
const VR_SRC = SRC.match(/const TRAIN_VAL_R\s*=\s*\{([^}]*)\}/);
const INS_VKNEE = VK_SRC ? parseInt(VK_SRC[1],10) : Infinity;
const INS_VR = {};
if(VR_SRC) VR_SRC[1].replace(/(\w+)\s*:\s*([\d.]+)/g, (_,k,v) => { INS_VR[k] = parseFloat(v); return ''; });

/* ---------- 골드·레벨 모델 (sim112 와 동일 — 같은 가정 위에서 비교해야 한다) ---------- */
const ARG_H = process.argv.find(a => a.startsWith('--h='));
const H_MAX = ARG_H ? parseFloat(ARG_H.slice(4)) : 3.0;
const T_STAGE = 40, S_END = 80, L_MAX = 1200;
const eGold = s => EG_B*Math.pow(EG_R, s-1);
const eHp   = s => EH_B*Math.pow(EH_R, s-1);
const eDmg  = s => ED_B*Math.pow(ED_R, s-1);
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
                       * Math.pow(C_R || COST[id].r, Math.max(0, l - C_KNEE));
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

/* ---------- val 곡선 (무릎 K 부터 배율 rv 로 갈아탐) ---------- */
const valAt = (id, l, K, RV) => VAL[id].b * Math.pow(VAL[id].r, Math.min(l, K))
                              * Math.pow(RV[id], Math.max(0, l - K));

/* 전투 모델 — 훈련 3종만. 장비·스킬·펫 배율은 전부 1(«훈련만» 하한).
   훈련이 못 파는 7종(aspd·crit·cdmg…)은 Lv 0 값에 고정돼 있다. */
/* 553 — 대용식에 **스킬 항**이 빠져 있었다. 이 게임에는 기본 공격이 없어 피해가 전부
   «장착 스킬» 에서 나오는데(`stat.dps`), 옛 식 `ASPD0 × critMul` 은 «일반 등급 스킬 1개» 의
   기여를 1.0 으로 접어 두고 있었다 — 504 가 `SK_DPS_REF` 를 1.84 → 6.49 로 재정박하자
   실측/대용 = **4.64** 가 되어 `verify177` ⑤ 가 빨개졌다(`probe553` 이 항등식으로 못박았다).
   식은 이제 `tools/dpsk.js` 가 소스에서 읽어 만든다. */
const DPS_K = DK.K;
const dps   = (L,K,RV) => valAt('atk',L,K,RV) * tb(L) * DPS_K;
const mobSec  = (s,K,RV) => eHp(s)*mobHpMul(s) / dps(LV[s],K,RV);
const bossSec = (s,K,RV) => eHp(s)*H_BOS       / dps(LV[s],K,RV);
const ratioA  = (s,K,RV) => valAt('atk',LV[s],K,RV)*tb(LV[s]) / (eHp(s)*H_ZOM);
const ratioH  = (s,K,RV) => valAt('hp', LV[s],K,RV)*tb(LV[s]) / eDmg(s);

/* ---------- [B] 배율 역산 ---------- */
/* dL/ds — 설치된 비용 곡선에서 «실측» 한다(스테이지 20→80 평균 기울기). */
const DLDS = (LV[80]-LV[20]) / (80-20);
const R_ATK = Math.exp(Math.log(EH_R)/DLDS);
const R_HP  = Math.exp(Math.log(ED_R)/DLDS);
const R_TGT = { atk:R_ATK, hp:R_HP, regen:R_HP };
const CUR   = { atk:VAL.atk.r, hp:VAL.hp.r, regen:VAL.regen.r };

const fx = n => n>=1e6||n<1e-3 ? n.toExponential(2) : (Math.round(n*1000)/1000).toLocaleString('en-US');
console.log('SIM131 — 훈련 val 곡선 (index.html 실측 상수)');
console.log('  eHp ' + EH_B + '×' + EH_R + '^(s-1) · eDmg ' + ED_B + '×' + ED_R + '^(s-1) · 보스 HP ×' + H_BOS + ' · 제한 ' + BSEC + '초');
console.log('  훈련 val  ' + STATS.map(id => id+' '+VAL[id].b+'×'+VAL[id].r+'^l').join(' · '));
console.log('  훈련 비용 무릎 Lv ' + C_KNEE + ' 이후 ×' + C_R + '  (112)');
console.log('  ' + DK.desc + ' → DPS 계수 ' + DPS_K.toFixed(4) + '   (553 — 스킬 항 포함)');
console.log('');

const INF = { atk:Infinity, hp:Infinity, regen:Infinity };
function profile(title, K, RV){
  console.log(title);
  console.log('     stage |  Lv | 단계 |   공격/적HP |  몹 처치(초) |  보스 소요(초) | 체력/적공격');
  [1,5,10,20,30,40,50,60,70,80].forEach(s => {
    const bs = bossSec(s,K,RV);
    console.log('     ' + String(s).padStart(5) + ' | ' + String(LV[s]).padStart(3)
      + ' | ' + String(tstage(LV[s])).padStart(4)
      + ' | ' + ratioA(s,K,RV).toExponential(2).padStart(11)
      + ' | ' + mobSec(s,K,RV).toExponential(2).padStart(12)
      + ' | ' + (bs > BSEC*1e3 ? bs.toExponential(2) : bs.toFixed(2)).padStart(14)
      + ' | ' + ratioH(s,K,RV).toExponential(2).padStart(11));
  });
  console.log('');
}
profile('[A] 지금 설치된 곡선 («훈련만» — 장비·스킬·펫 배율 제외)',
        INS_VKNEE, Object.keys(INS_VR).length ? INS_VR : CUR);

console.log('[B] 배율 역산 — «비가 스테이지 불변» 하나로 풀린다');
console.log('  ① 설치된 비용 곡선의 실측 기울기  dL/ds = (Lv' + LV[80] + '−Lv' + LV[20] + ')/60 = ' + DLDS.toFixed(4) + ' 레벨/스테이지');
console.log('  ② 균형 배율   r_atk = eHp배율^(1/dLds) = ' + EH_R + '^(1/' + DLDS.toFixed(3) + ') = ' + R_ATK.toFixed(4));
console.log('                r_hp  = eDmg배율^(1/dLds) = ' + ED_R + '^(1/' + DLDS.toFixed(3) + ') = ' + R_HP.toFixed(4));
console.log('  ③ 현행 배율   atk ' + CUR.atk + ' (균형 대비 ×' + (Math.log(CUR.atk)/Math.log(R_ATK)).toFixed(2)
          + ') · hp/regen ' + CUR.hp + ' (×' + (Math.log(CUR.hp)/Math.log(R_HP)).toFixed(2) + ')');
console.log('  ④ 현행 곡선의 균형점 = ln(eHp)/ln(atk배율) = ' + (Math.log(EH_R)/Math.log(CUR.atk)).toFixed(2)
          + ' 레벨/스테이지 — 지시가 요구하는 ' + DLDS.toFixed(2) + ' 과 어긋난 만큼이 스테이지당 난이도 하락분이다');
console.log('');

/* ---------- [C] 무릎 = «게임이 이미 타고 있던 난이도» 로 역산 ---------- */
/* 무릎 K 를 두면 K 이후의 «공격/적HP» 는 평탄해지고, 그 평탄값은 «오늘 Lv K 시점의 비» 다.
   즉 K 는 «어느 시점의 난이도로 평탄화할까» 이고, 게임 자신의 빡빡함 정의(28 보스 30초)로 푼다. */
const BOSS_TGT = BSEC/2;      /* 참고선: 보스가 제한의 절반을 쓰면 «빠듯하되 이긴다» */
console.log('[C] 무릎 역산 — 평탄 난이도를 «게임이 이미 타고 있던 값» 으로 되돌린다');
console.log('  무릎 K 를 두면 K 이후의 «공격/적HP» 가 평탄해지고, 그 평탄값은 «오늘 Lv K 시점의 비» 다.');
console.log('  즉 K 를 고르는 것은 곧 «어느 시점의 난이도로 평탄화할까» 다. 후보 둘:');
console.log('   (가) 채택 — **스테이지 10 = 첫 보스 도달 Lv**(= ' + LV[10] + '). 게임이 이미 타고 있던 값이라 발명이 0 이고,');
console.log('        스테이지 1~10 이 한 푼도 안 바뀐다. **어느 스테이지도 오늘보다 어려워지지 않는 유일한 후보**다.');
console.log('   (나) 참고 — 작업 28 «보스 ' + BSEC + '초 제한» 의 절반(' + BOSS_TGT + '초)에 맞추는 K. 더 «빠듯» 하지만');
console.log('        첫 보스(오늘 ' + bossSec(10,Infinity,CUR).toFixed(1) + '초)까지 같이 어려워진다 = 난이도 목표를 새로 정하는 것 → 저장소 주인 몫.');
console.log('    무릎 K | 평탄 공격/적HP | s20 보스(초) | s40 보스(초) | s80 보스(초) | s1~10 변화');
let KPICK = null, kBest = Infinity;
for(let K=5;K<=140;K+=5){
  const b20 = bossSec(20,K,R_TGT), b80 = bossSec(80,K,R_TGT);
  const d = Math.abs(Math.log(b80/BOSS_TGT));
  if(d < kBest){ kBest = d; KPICK = K; }
  if(K%20===0 || K<=20)
    console.log('    ' + String(K).padStart(6) + ' | ' + ratioA(80,K,R_TGT).toExponential(2).padStart(14)
      + ' | ' + b20.toFixed(2).padStart(12) + ' | ' + bossSec(40,K,R_TGT).toFixed(2).padStart(12)
      + ' | ' + b80.toFixed(2).padStart(12)
      + ' | ' + (K >= LV[10] ? '없음(Lv'+LV[10]+'<K)' : '있음').padStart(10));
}
const ARG_K = process.argv.find(a => a.startsWith('--knee='));
const KNEE = ARG_K ? parseInt(ARG_K.slice(7),10) : (INS_VKNEE !== Infinity ? INS_VKNEE : KPICK);
console.log('  → (가) 채택 K = ' + LV[10] + ' · (나) 참고 K = ' + KPICK + '(보스 ' + BOSS_TGT + '초) · 판정에 쓰는 K = ' + KNEE);
console.log('');

profile('[D] 새 곡선 (무릎 Lv ' + KNEE + ' 이후 atk ×' + R_ATK.toFixed(4) + ' · hp/regen ×' + R_HP.toFixed(4) + ')',
        KNEE, R_TGT);

/* ---------- 게이트 — «설치된 곡선» 만 판정한다. 표를 베끼지 않고 등식을 단언한다(LESSONS 112-③) ---------- */
const inst = Object.keys(INS_VR).length ? INS_VR : CUR;
const instK = INS_VKNEE;
const R10 = ratioA(10,instK,inst), R20 = ratioA(20,instK,inst), R80 = ratioA(80,instK,inst);
let drift = 0, floor = Infinity;
for(let s=10;s<=S_END;s++){
  const r = ratioA(s,instK,inst);
  drift = Math.max(drift, Math.max(r/R10, R10/r));
  floor = Math.min(floor, ratioA(s,instK,inst));
}
/* ⑥ 무릎 아래는 131 이전 곡선과 «한 푼도» 다르지 않아야 한다 */
let same = true;
for(let l=0;l<=instK && same;l++)
  STATS.forEach(id => { if(Math.abs(valAt(id,l,instK,inst) - VAL[id].b*Math.pow(VAL[id].r,l)) > 1e-9) same = false; });

const g1 = drift <= 3;                                    /* 첫 보스 대비 난이도 표류 3배 이내 */
const g2 = LV[10] <= instK;                               /* 첫 보스(스테이지 10)까지 값 불변 */
const g3 = Math.abs(Math.log(inst.atk)/Math.log(R_ATK) - 1) < 2e-3
        && Math.abs(Math.log(inst.hp )/Math.log(R_HP ) - 1) < 2e-3
        && Math.abs(Math.log(inst.regen)/Math.log(R_HP) - 1) < 2e-3;   /* 배율 = 역산값 */
/* ⚠ 326(2026-08-28) — 112 가 못 박은 것은 **비용 곡선이 스테이지 80 에서 Lv 300 을 준다** 는 것이고,
   «4단계» 는 옛 상한식(단계당 100 고정)에서 그 레벨에 붙던 **이름표**였다. 326 은 비용 곡선을 한 줄도
   안 건드리고 상한식만 누적합으로 바꿨으므로 **Lv 는 그대로이고 이름표만 4 → 3 으로 내려간다.**
   그래서 판정은 «Lv ≥ 300» 만 하고 단계는 **실측값을 적기만** 한다 — 여기서 단계를 단언하면
   326 이 바꾸라고 지시받은 바로 그것을 게이트가 되돌리라고 요구하게 된다(수치 확정은 199 몫). */
const g4 = LV[80] >= 300;                                 /* 112 주인 지시 «스테이지 80 → Lv 300» 불변 */
const g5 = floor >= 0.5;                                  /* 훈련만으로도 전 스테이지 처치 가능 */
const g6 = same;
console.log('[E] 게이트 — 설치된 곡선으로 판정');
console.log('  ① 난이도 표류 — 첫 보스(s10) 비 ' + R10.toExponential(2) + ' 대비 s10~80 최대 ×'
          + drift.toFixed(2) + '  (≤3) : ' + (g1?'PASS':'FAIL')
          + '   [s20 ' + R20.toExponential(2) + ' · s80 ' + R80.toExponential(2) + ']');
console.log('  ② 첫 보스(스테이지 10, Lv ' + LV[10] + ')까지 val 불변 — 설치 무릎 Lv ' + instK + ' : ' + (g2?'PASS':'FAIL'));
console.log('  ③ 배율이 역산값과 일치 — atk ' + inst.atk + '≈' + R_ATK.toFixed(4)
          + ' · hp ' + inst.hp + '≈' + R_HP.toFixed(4) + ' · regen ' + inst.regen + ' : ' + (g3?'PASS':'FAIL'));
console.log('  ④ 112 지시 불변 — 스테이지 80 도달 Lv ' + LV[80] + ' ≥ 300 : ' + (g4?'PASS':'FAIL')
          + '   [326 실측 단계 ' + tstage(LV[80]) + ' — 판정 대상 아님]');
console.log('  ⑤ 전 스테이지에서 훈련만으로 처치 가능 (공격/적HP 최저 ' + floor.toFixed(2) + ' ≥ 0.5) : ' + (g5?'PASS':'FAIL'));
console.log('  ⑥ Lv 0~' + instK + ' 가 131 이전 곡선과 완전히 동일 : ' + (g6?'PASS':'FAIL'));
console.log('  ⑦ 유휴 가정 민감도 — 무릎은 «스테이지 10 도달 Lv» 이라 H_MAX 에 따라 움직인다');
[0.5,1.0,3.0,6.0].forEach(h => {
  const save = CUM.slice();
  let cum = 0; const lv10 = [];
  for(let s=1;s<=S_END;s++){
    const kill = isBoss(s) ? eGold(s)*G_BOS : N_MOB*eGold(s)*mobGoldMul(s);
    const hh = h*s/S_END;
    cum += kill + eGold(s)*CLEAR_K + eGold(s)*OFF_A*OFF_B*Math.min(hh,OFF_H)*3600 + DUN_G*((hh*3600+T_STAGE)/86400);
    if(s===10) lv10.push(levelFor(cum));
  }
  console.log('     H_MAX=' + h.toFixed(1) + 'h → 스테이지 10 도달 Lv ' + lv10[0]
            + (lv10[0] <= instK ? '  (무릎 안 — 첫 보스 불변)' : '  (무릎 밖 — 첫 보스가 ' + (instK/lv10[0]*100|0) + '% 지점부터 완만)'));
  void save;
});
const pass = g1&&g2&&g3&&g4&&g5&&g6;
console.log(pass ? 'SIM131 PASS' : 'SIM131 FAIL');
process.exit(pass ? 0 : 1);
