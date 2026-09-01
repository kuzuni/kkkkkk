#!/usr/bin/env node
/* 작업 112 — 23 훈련 밸런스 시뮬레이터 (헤드리스 불필요, 데이터 상수만 읽는다)
   지시(저장소 주인 2026-08-26): «훈련이 너무 가혹하다. 스테이지 80 될 때까지 대충 훈련 4단계까지».
   4단계 진입 = 3단계 상한(Lv 300) 을 3스탯 모두 달성.

   이 파일은 index.html 을 «읽어서» 상수를 뽑는다(베끼지 않는다).
   상수가 바뀌면 정규식이 못 찾고 즉시 죽는다 — 게이트가 조용히 늙지 않게.

   출력
     [A] 누적 골드(stage)  — 킬 · 클리어 · 오프라인 · 골드 던전(하루 1회)
     [B] 누적 비용(Lv)     — 현행 곡선 vs 새 곡선, 3스탯 합
     [C] 판정              — 스테이지 80 누적 골드 ≥ Lv300×3 누적 비용 / 0.8
                             + 20/40/60/80 중간 목표(±1단계)
     [D] 곁가지 — 훈련 Lv 별 스탯값 vs 스테이지 적 HP/공격 (곡선 val 은 이 작업 범위 밖)
   실행: node tools/sim112.js [--h=3.0] [--csv]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function pick(re, what){
  const m = SRC.match(re);
  if(!m) { console.error('SIM112 FAIL — index.html 에서 «' + what + '» 를 못 찾았다: ' + re); process.exit(1); }
  return m;
}
const num = (re, what) => parseFloat(pick(re, what)[1]);

/* ---------- index.html 에서 뽑는 상수 ---------- */
const EG_B = num(/const eGold\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/,        'eGold 계수');
const EG_R = num(/const eGold\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/, 'eGold 배율');
/* 177 — 적 곡선의 «표기» 가 갈렸다(구 순수 지수 / 177 선형×구간별 저지수).
   정규식을 여기 두면 곡선을 갈아 끼울 때마다 이 시뮬이 먼저 죽는다(LESSONS 168-③) —
   표기 해석은 `tools/ecurve.js` 한 곳으로 모았다. 이 파일은 «값» 만 쓴다. */
const EC = require('./ecurve')(SRC, 'SIM112');
const N_MOB = num(/const ENEMY_COUNT\s*=\s*(\d+)/,        'ENEMY_COUNT');
/* ⚑ 199 21회차 이관 — 제품이 «1회 적립 상한 OFF_MAX_H 6h» 를 선언째 걷어내고(결3 ⓑ)
   «하루 총 예산 OFF_DAY_CAP_MIN 1,440분» 하나로 자른다. 이 자는 그 값을 시간으로 읽는다.
   ⚠ 값은 여전히 min() 의 인자다(진짜 상한이 그것으로 바뀐 것뿐) — 유휴 h 는 H_MAX ≤ 3h 라
   두 상한 어느 쪽에도 안 닿으므로 이 이관으로 산출 수치는 한 칸도 안 움직인다. */
const OFF_H = num(/const OFF_DAY_CAP_MIN\s*=\s*(\d+)/, 'OFF_DAY_CAP_MIN') / 60;
/* 517 — 요구치가 «구간표» 가 됐다(326 의 «단계 몫 300n» 폐기). 제품의 표를 그대로 읽는다 —
   숫자를 여기 베끼면 표를 갈 때마다 이 시뮬이 조용히 갈라진다(LESSONS 168-③). 값은 3종 합이다. */
const T_NEED = pick(/const TRAIN_NEED\s*=\s*\[([^\]]+)\]/, 'TRAIN_NEED')[1]
  .split(',').map(s => parseFloat(s));
const T_BON = num(/const TRAIN_BONUS\s*=\s*([\d.]+)/,     'TRAIN_BONUS');
/* 클리어 보상 = eGold(직전 스테이지) × 이 배수 */
const CLEAR_K = num(/const bonusG = eGold\(S\.stage-1\)\s*\*\s*(\d+)/, '클리어 보상 배수');
/* 오프라인 = eGold × goldMul × A × sec × B  (index.html offlineReward) */
const OFF_A = num(/const gold = eGold\(S\.stage\)\s*\*\s*stat\.goldMul\s*\*\s*([\d.]+)/, '오프라인 계수 A');
const OFF_B = num(/const gold = eGold\(S\.stage\)[^;]*?\*\s*sec\s*\*\s*([\d.]+)/,        '오프라인 계수 B');
/* 골드 던전 1층 보상 */
const DUN_G = num(/id:'gold'[\s\S]{0,220}?rw:f\s*=>\s*\(\{\s*gold:\s*(\d+)/, '골드 던전 보상');
/* 몹 종류별 골드 배수 */
const G_ZOM = num(/zombie:\s*\{[\s\S]{0,320}?gold:([\d.]+)/, 'zombie gold');
const G_GOB = num(/goblin:\s*\{[\s\S]{0,320}?gold:([\d.]+)/, 'goblin gold');
const G_DRK = num(/dark:\s*\{[\s\S]{0,320}?gold:([\d.]+)/,   'dark gold');
const G_BOS = num(/boss:\s*\{[\s\S]{0,320}?gold:([\d.]+)/,   'boss gold');
const H_ZOM = num(/zombie:\s*\{[\s\S]{0,320}?hp:([\d.]+)/,   'zombie hp');
const H_BOS = num(/boss:\s*\{[\s\S]{0,320}?hp:([\d.]+)/,     'boss hp');

/* 훈련 3종의 비용·스탯 곡선 — «지금 index.html 에 들어 있는 값» 을 그대로 읽는다.
   비용은 두 표기를 모두 받는다: `cost:l => 45*Math.pow(1.19,l)` (무릎 없는 단일 지수)
   와 `cost:trainCost(45,1.19)` (112 의 구간별 지수). */
function upgCurve(id, field){
  const m = pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?" + field + ":l => ([\\d.]+)\\*Math\\.pow\\(([\\d.]+),l\\)"),
                 id + ' ' + field + ' 곡선');
  return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
}
function costCurve(id){
  const m = SRC.match(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:trainCost\\(([\\d.]+),\\s*([\\d.]+)\\)"));
  if(m) return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
  return upgCurve(id, 'cost');                       /* 112 이전 표기 */
}
/* val 은 표기 **세 벌**을 받는다(LESSONS 140 — 남이 내 구간을 고치면 내 게이트가 먼저 깨진다):
     · `val:l => 18*Math.pow(1.12,l)`   131 이전 = 단일 지수
     · `val:trainVal('atk',18,1.12)`    131 = 구간별 지수(무릎 위쪽은 [D] 표가 따로 센다)
     · `val:trainVal('atk',18)`         **168 = 선형** `b + TRAIN_VAL_K[id]×l` */
function valCurve(id){
  const lin = SRC.match(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*([\\d.]+)\\s*\\)"));
  if(lin) return { b: parseFloat(lin[1]), k: VAL_K[id], lin: true };
  const m = SRC.match(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*([\\d.]+),\\s*([\\d.]+)\\)"));
  if(m) return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
  return upgCurve(id, 'val');                        /* 131 이전 표기 */
}
/* 168 선형 기울기 (없으면 선형 미적용) */
const VKS = SRC.match(/const TRAIN_VAL_K\s*=\s*\{([^}]*)\}/);
const VAL_K = {};
if(VKS) VKS[1].replace(/(\w+)\s*:\s*([\d.]+)/g, (_, k, v) => { VAL_K[k] = parseFloat(v); return ''; });
const COST = { atk: costCurve('atk'), hp: costCurve('hp'), regen: costCurve('regen') };
const VAL  = { atk: valCurve('atk'),  hp: valCurve('hp'),  regen: valCurve('regen')  };
/* 131 이 설치한 val 무릎·배율(없으면 «131 미적용» = 단일 지수) */
const VK_SRC = SRC.match(/const TRAIN_VAL_KNEE\s*=\s*(\d+)/);
const VR_SRC = SRC.match(/const TRAIN_VAL_R\s*=\s*\{([^}]*)\}/);
const VAL_KNEE = VK_SRC ? parseInt(VK_SRC[1], 10) : Infinity;
const VAL_R = {};
if(VR_SRC) VR_SRC[1].replace(/(\w+)\s*:\s*([\d.]+)/g, (_, k, v) => { VAL_R[k] = parseFloat(v); return ''; });
const valAt = (id, l) => VAL[id].lin
  ? VAL[id].b + VAL[id].k * l                                   /* 168 선형 */
  : VAL[id].b * Math.pow(VAL[id].r, Math.min(l, VAL_KNEE))
    * Math.pow(VAL_R[id] || VAL[id].r, Math.max(0, l - VAL_KNEE));
const STATS = ['atk','hp','regen'];
/* 설치된 무릎·배율. 없으면 «무릎 없음»(112 이전 상태) 으로 본다. */
const K_SRC = SRC.match(/const TRAIN_KNEE\s*=\s*(\d+)/);
const R_SRC = SRC.match(/const TRAIN_COST_R\s*=\s*([\d.]+)/);
const INS_KNEE = K_SRC ? parseInt(K_SRC[1], 10) : Infinity;
const INS_R    = R_SRC ? parseFloat(R_SRC[1])   : null;

/* ---------- 플레이 모델 (문서화된 가정) ----------
   ① 능동: 스테이지마다 50마리 처치 + 클리어 보상 1회.
      10의 배수 스테이지는 28 «보스전» — 보스 1마리(골드 ×20)만.
   ② 유휴: 스테이지 s 에 머무는 유휴 시간 h(s) = H_MAX × s/80 (선형).
      «초반은 밀고 지나가고 후반에 벽에 붙어 기다린다» 를 가장 단순하게 편 것.
      오프라인 보상 공식(초당 eGold×1.2×0.5)을 그 시간에 그대로 적용하되 1회 상한은 OFF_MAX_H.
   ③ 골드 던전: 하루 1회 1층(9,000골드) — 층은 전투력에 걸려 있어 보수적으로 1층 고정.
      고스테이지에서는 무시할 수준이고 초반에만 의미가 있다.
   ④ goldMul(골드 획득 강화)은 1.0 — 23 훈련은 atk·hp·regen 3종만 판다.
   ⑤ 출석·룰렛·이벤트는 «여유»로 빼 둔다(지시서의 합산 목록에 없다).
   H_MAX 는 --h= 로 바꿀 수 있다. 이 값은 **누적 골드의 크기(=비용 계수)** 만 움직이고
   **곡선의 기울기(=레벨당 배율)** 는 건드리지 않는다 — [C] 의 민감도 표 참조. */
const ARG_H = process.argv.find(a => a.startsWith('--h='));
const H_MAX = ARG_H ? parseFloat(ARG_H.slice(4)) : 3.0;
const T_STAGE = 40;                 /* 스테이지 1개 능동 클리어 시간(초) — 50마리 × 0.8초 */
const S_END = 80;

const eGold = s => EG_B * Math.pow(EG_R, s-1);
const eHp   = EC.eHp;
const eDmg  = EC.eDmg;
const isBoss = s => s % 10 === 0;

/* 일반 파도의 몹 종류별 기대 골드 배수 (queueMobs 의 분기 그대로) */
function mobGoldMul(s){
  if(s < 3)  return G_ZOM;
  if(s < 5)  return 0.44*G_GOB + 0.56*G_ZOM;
  return 0.44*G_GOB + 0.16*G_DRK + 0.40*G_ZOM;
}
const idleH = s => H_MAX * s / S_END;

/* 스테이지 s 에 머무는 동안 버는 골드 */
function stageGold(s){
  const kill  = isBoss(s) ? eGold(s)*G_BOS : N_MOB * eGold(s) * mobGoldMul(s);
  const clear = eGold(s) * CLEAR_K;
  const h     = idleH(s);
  const idle  = eGold(s) * OFF_A * OFF_B * Math.min(h, OFF_H) * 3600;
  const days  = (h*3600 + T_STAGE) / 86400;
  const dun   = DUN_G * days;
  return { kill, clear, idle, dun, sum: kill + clear + idle + dun };
}
const CUM = [0];
for(let s=1;s<=S_END;s++) CUM[s] = CUM[s-1] + stageGold(s).sum;

/* ---------- 비용 곡선 ----------
   곡선은 «구간별 지수» 로 표현한다: l < knee 면 b·r^l, 그 뒤로는 무릎값에서 rt 배율로 이어진다.
   knee = Infinity 면 지금의 단일 지수 곡선(현행)과 같다. */
const curveOf = (id, knee, rt) => ({ b:COST[id].b, r:COST[id].r, knee, rt });
const costAt = (c, l) => c.b * Math.pow(c.r, Math.min(l, c.knee)) * Math.pow(c.rt, Math.max(0, l - c.knee));
const L_MAX = 1200;
function cumTable(curve){                      /* T[L] = 3스탯을 Lv L 까지 올리는 누적 비용 */
  const T = [0];
  for(let l=0;l<L_MAX;l++) T[l+1] = T[l] + STATS.reduce((t,id) => t + costAt(curve[id], l), 0);
  return T;
}
/* 누적 골드 G 로 3스탯을 «같은 레벨까지» 올릴 때 도달 레벨 */
function levelFor(T, G){ let L = 0; while(L < L_MAX && T[L+1] <= G) L++; return L; }
/* 517 — 상한은 구간표 몫(3종 합)의 누적합이다(스탯당은 그 1/3).
   «레벨 → 단계» 역함수는 나눗셈이 아니라 누적합을 넘어설 때까지 세는 것이다.
   경계 규약은 종전과 같다 — 상한을 **정확히 찍은** 레벨은 이미 다음 단계로 센다. */
const TSTEP = n => T_NEED[Math.min(Math.max(1, n), T_NEED.length) - 1] / 3;   /* 스탯당 몫 */
const TCAP  = n => { let s = 0; for(let k = 1; k <= n; k++) s += TSTEP(k); return s; };
const stageOf = L => { let n = 1; while(TCAP(n) <= L) n++; return n; };   /* 326 이후 Lv 300 → 3단계 */

/* ---------- 곡선 두 벌 ----------
   OLD = «무릎 없음» 기준선(112 이전 곡선. 왜 불가능했는지를 보여 준다)
   NEW = index.html 에 **실제로 설치된** 곡선. 게이트는 이쪽을 판정한다.
   ① 레벨당 배율 rt 는 «누적 골드의 스테이지당 성장률» 과 «목표 레벨/스테이지» 로만 결정된다:
        dL/ds = ln(eGold 배율) / ln(rt),  목표 = (300−100)레벨 / (80−20)스테이지
      유휴 가정(H_MAX)이 아무리 흔들려도 이 값은 안 움직인다([C]-④).
   ② 계수는 새로 뽑지 않는다 — 초반 체감을 안 바꾸려고 «무릎(knee)» 까지는 종전 곡선을
      그대로 태우고, 무릎부터 rt 로 갈아탄다. 남은 자유도는 무릎 위치 하나뿐이고,
      그것을 «Lv300×3 누적 비용 = 스테이지 80 누적 골드 × TARGET_USE» 로 푼다. */
const TARGET_USE = 0.70;
const R_NEW = Math.exp(Math.log(EG_R) / ((300-100)/(80-20)));
const R_PICK = INS_R || 1.05;
const OLD = {}; STATS.forEach(id => OLD[id] = curveOf(id, Infinity, COST[id].r));
const T_OLD = cumTable(OLD);
let KNEE_OPT = 1, kBest = Infinity;
for(let k=1;k<=60;k++){
  const c = {}; STATS.forEach(id => c[id] = curveOf(id, k, R_PICK));
  const use = cumTable(c)[300] / CUM[S_END];
  if(Math.abs(use - TARGET_USE) < kBest){ kBest = Math.abs(use - TARGET_USE); KNEE_OPT = k; }
}
const KNEE = INS_KNEE;
const NEW = {}; STATS.forEach(id => NEW[id] = curveOf(id, KNEE, R_PICK));
const T_NEW = cumTable(NEW);

/* ---------- 출력 ---------- */
const fx = n => n >= 1e6 ? n.toExponential(3) : Math.round(n).toLocaleString('en-US');
const csv = process.argv.includes('--csv');

console.log('SIM112 — 23 훈련 밸런스 (index.html 실측 상수)');
console.log('  ' + EC.desc);
console.log('  몹 ' + N_MOB + '마리/스테이지 · 클리어 ×' + CLEAR_K + ' · 오프라인 ' + OFF_A + '×' + OFF_B + '/초(상한 ' + OFF_H + 'h)'
          + ' · 골드던전 ' + fx(DUN_G) + '/일 · 유휴 h(s)=' + H_MAX + '×s/80');
console.log('  훈련 몫(3종 합) ' + T_NEED.join('·') + '… · 단계 보너스 +' + (T_BON*100) + '%');
console.log('');

console.log('[A] 누적 골드(stage) — 구성비');
console.log('  stage |     킬 |  클리어 |   오프라인 |   던전 |      스테이지 계 |        누적');
[1,5,10,20,30,40,50,60,70,80].forEach(s => {
  const g = stageGold(s);
  console.log('  ' + String(s).padStart(5) + ' | ' + fx(g.kill).padStart(6) + ' | ' + fx(g.clear).padStart(7)
    + ' | ' + fx(g.idle).padStart(10) + ' | ' + fx(g.dun).padStart(6)
    + ' | ' + fx(g.sum).padStart(16) + ' | ' + fx(CUM[s]).padStart(11));
});
console.log('');

console.log('[B] 누적 비용(3스탯 동일 Lv 까지) — 현행 vs 새 곡선');
console.log('  현행: ' + STATS.map(id => id + ' ' + COST[id].b + '×' + COST[id].r + '^l').join(' · '));
console.log('  설치: 위 곡선을 Lv ' + KNEE + ' 까지 그대로 태우고 그 뒤 ×' + R_PICK + '^(l−' + KNEE + ')'
          + (KNEE === Infinity ? '  ← 무릎 없음(112 미적용)' : ''));
console.log('     Lv |   무릎없음 1레벨 비용 |     설치 1레벨 비용 |        무릎없음 누적 |          설치 누적');
[0,5,10,15,20,50,100,150,200,250,300].forEach(L => {
  console.log('  ' + String(L).padStart(5)
    + ' | ' + STATS.reduce((t,id)=>t+costAt(OLD[id],L),0).toExponential(3).padStart(19)
    + ' | ' + STATS.reduce((t,id)=>t+costAt(NEW[id],L),0).toExponential(3).padStart(19)
    + ' | ' + T_OLD[L].toExponential(3).padStart(18) + ' | ' + T_NEW[L].toExponential(3).padStart(18));
});
console.log('');

console.log('[C] 판정');
const need = T_NEW[300], needOld = T_OLD[300];
const gate1 = CUM[S_END] >= need / 0.8;
console.log('  ① 스테이지 80 누적 골드      = ' + CUM[S_END].toExponential(4));
console.log('     Lv300×3 누적 비용(설치)   = ' + need.toExponential(4) + '  (누적 골드의 ' + (need/CUM[S_END]*100).toFixed(1) + '%)');
console.log('     Lv300×3 누적 비용(무릎없음)   = ' + needOld.toExponential(4) + '  (누적 골드의 ' + (needOld/CUM[S_END]).toExponential(2) + '배 — 불가능)');
console.log('     게이트 «누적 골드 ≥ 비용/0.8» : ' + (gate1 ? 'PASS' : 'FAIL'));
console.log('  ② 중간 목표(±1단계) — 그 스테이지까지의 누적 골드를 3스탯에 고르게 썼을 때 도달 레벨');
console.log('     stage | 목표 단계 | 무릎없음 Lv(단계) |   설치 Lv(단계) | 판정');
const GOAL = { 20:1, 40:2, 60:3, 80:4 };
let gate2 = true;
Object.keys(GOAL).forEach(k => {
  const s = +k, want = GOAL[k];
  const lo = levelFor(T_OLD, CUM[s]), ln_ = levelFor(T_NEW, CUM[s]);
  const got = stageOf(ln_), ok = Math.abs(got - want) <= 1;
  if(!ok) gate2 = false;
  console.log('     ' + String(s).padStart(5) + ' | ' + String(want).padStart(9) + ' | '
    + (Math.round(lo) + '(' + stageOf(lo) + '단계)').padStart(15) + ' | '
    + (Math.round(ln_) + '(' + got + '단계)').padStart(15) + ' | ' + (ok ? 'ok' : 'NG'));
});
console.log('  ③ 이론 배율 rt = ' + R_NEW.toFixed(4) + ' → 채택 ' + R_PICK
          + ' · 100레벨당 ×' + Math.pow(R_PICK,100).toFixed(0) + ' · 설치 무릎 Lv ' + KNEE + ' (이론 최적 ' + KNEE_OPT + ')');
console.log('  ④ H_MAX 민감도 — 유휴 가정은 «무릎 위치» 만 움직이고 «배율 rt» 는 안 움직인다');
[0.5, 1.0, 3.0, 6.0].forEach(h => {
  let cum = 0;
  for(let s=1;s<=S_END;s++){
    const kill = isBoss(s) ? eGold(s)*G_BOS : N_MOB*eGold(s)*mobGoldMul(s);
    const hh = h*s/S_END, idle = eGold(s)*OFF_A*OFF_B*Math.min(hh, OFF_H)*3600;
    cum += kill + eGold(s)*CLEAR_K + idle + DUN_G*((hh*3600+T_STAGE)/86400);
  }
  let k = 1, best = Infinity;
  for(let kk=1;kk<=60;kk++){
    const c = {}; STATS.forEach(id => c[id] = curveOf(id, kk, R_PICK));
    const d = Math.abs(cumTable(c)[300]/cum - TARGET_USE);
    if(d < best){ best = d; k = kk; }
  }
  const c2 = {}; STATS.forEach(id => c2[id] = curveOf(id, k, R_PICK));
  const T2 = cumTable(c2);
  console.log('     H_MAX=' + h.toFixed(1) + 'h → 누적 골드 ' + cum.toExponential(3)
            + ' · 최적 무릎 Lv ' + k + ' · 그때 도달 Lv(s80) ' + levelFor(T2, cum)
            + ' (' + stageOf(levelFor(T2, cum)) + '단계)');
});
console.log('');

console.log('[D] 훈련 Lv 의 스탯값 vs 그 스테이지 적 — val 곡선은 **작업 131** 이 고쳤다(`node tools/sim131.js`)');
console.log('     stage |    적 HP | 적 공격 |  훈련 Lv | 내 공격 | 공격/적HP |   내 체력 | 체력/적공격');
[20,40,60,80].forEach(s => {
  const L = levelFor(T_NEW, CUM[s]), tb = 1 + T_BON*(stageOf(L)-1);
  const atk = valAt('atk', L)*tb, hp = valAt('hp', L)*tb;
  const ehp = eHp(s)*H_ZOM, edmg = eDmg(s);
  console.log('     ' + String(s).padStart(5) + ' | ' + ehp.toExponential(2).padStart(8) + ' | ' + edmg.toExponential(2).padStart(7)
    + ' | ' + String(Math.round(L)).padStart(8) + ' | ' + atk.toExponential(2).padStart(7)
    + ' | ' + (atk/ehp).toExponential(2).padStart(9) + ' | ' + hp.toExponential(2).padStart(9)
    + ' | ' + (hp/edmg).toExponential(2).padStart(11));
});
console.log('     (장비·스킬·펫 배율 제외한 «훈련만» 수치. 보스 HP 는 ×' + H_BOS + ')');
console.log('');

if(csv){
  console.log('stage,kill,clear,idle,dun,sum,cum,lv_old,lv_new');
  for(let s=1;s<=S_END;s++){
    const g = stageGold(s);
    console.log([s,g.kill,g.clear,g.idle,g.dun,g.sum,CUM[s],levelFor(T_OLD,CUM[s]),levelFor(T_NEW,CUM[s])]
      .map(v => typeof v === 'number' ? v.toPrecision(6) : v).join(','));
  }
}

const pass = gate1 && gate2;
console.log(pass ? 'SIM112 PASS' : 'SIM112 FAIL');
process.exit(pass ? 0 : 1);
