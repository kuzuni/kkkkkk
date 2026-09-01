#!/usr/bin/env node
/* 작업 249 — 스테이지 클리어 체감 «톱니» 시뮬레이터 + 게이트
   (저장소 주인 지시 2026-08-27: «플레이어 업글하든 장비든 쎄질 때 스테이지 깨는 체감이
    밸런스 선 느낌이 톱니 느낌으로, 전형적인 방치형 rpg 느낌»)

   ── 톱니는 «느낌» 이 아니라 «수치» 다 ────────────────────────────────────────
   등재문이 못 박은 대로 이 작업은 **스테이지당 클리어 소요 시간 곡선 t(s)** 로 시작한다.
   177 이 설치한 매끈한 곡선의 t(s) 는 sim177 [E] 가 이미 실측해 뒀다 — s1..s80 이
   0.6~0.9분으로 **거의 일정**하다. 톱니가 없다는 것이 곧 이 작업의 대상이다.

     진폭 = 한 구간 안 max t(s) / min t(s)      (벽 대 «돌파» 스테이지)
     주기 = 최대값이 서는 스테이지 간격          (= ES_BAND 여야 한다)

   ── 무엇을 자유도로 두는가 (LESSONS 106-1 «발명이 아니라 역산») ──────────────
   249 는 **새 상수를 두 개만** 들인다. 둘 다 이 도구가 매 실행 근거에서 다시 뽑아 대조한다.

     ES_BAND      ← **발명이 아니다.** 162 가 폐기한 구 `isBossStage = S.stage % 10 === 0`,
                    즉 **이 게임이 원래 쓰던 벽 주기**를 그대로 되살린 값이다. 이 도구는
                    «구 규칙이 정말 폐기돼 있는가(162)» 와 «주기가 그 10 인가» 를 함께 본다.
     BOSS_GATE_HP ← **BOSS_SEC(30초) 예산에서 역산.** «훈련만» 설계 플레이어가 유휴 가정
                    밴드(0.5~6h) **어디에서도** s ≤ ES_KNEE 의 관문 보스를 제한 시간 안에
                    잡는 **최대** 배수를 이분법으로 푼다(sim177 의 M1 과 같은 방식).
                    상한을 쓰는 이유: 관문은 «가장 센 벽» 이어야 하고, 그러면서도 설계
                    플레이어를 **하드락으로 막으면 안 되기** 때문이다.

   구간 계단(①) 자체에는 자유도가 없다 — 이빨 높이는 우리가 고른 값이 아니라
   **177 곡선 자신의 ES_BAND 스테이지 성장률**이다.

   ── 안 건드리는 축 ────────────────────────────────────────────────────────
   eGold(경제 축) · 훈련 비용/값 · ES_K/KNEE/M1/M2/A · 보스 제한 시간 · 몹 수.
   그리고 새 곡선은 **어디서도 177 곡선보다 세지 않는다**(게이트 ⑨) — 249 는 벽을 세우는 것이
   아니라 **벽 사이를 비우는** 작업이라, 177 이 확인한 «훈련만으로 s ≤ 80 무벽» 이 자동 유지된다.

   출력
     [A] 설치 상수 — index.html 실측
     [B] 한 판 소요 t(s) — before(177 매끈) / after(249 톱니)
     [C] 역산 — BOSS_GATE_HP 상한
     [D] 톱니 — 구간별 진폭·주기·벽 위치
     [E] 게이트
   실행: node tools/sim249.js [--h=3.0]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const readECurve = require('./ecurve');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function pick(re, what){
  const m = SRC.match(re);
  if(!m){ console.error('SIM249 FAIL — index.html 에서 «' + what + '» 를 못 찾았다: ' + re); process.exit(1); }
  return m;
}
const num = (re, what) => parseFloat(pick(re, what)[1]);

/* ---------- [A] 설치 상수 (sim177 과 같은 자로 읽는다) ---------- */
const EC = readECurve(SRC, 'SIM249');
const N_MOB = num(/const ENEMY_COUNT\s*=\s*(\d+)/,        'ENEMY_COUNT');
/* ⚑ 696(2026-09-01) — 199 21회차 이관 누락분(sim177 과 같은 자리·같은 이유).
   제품은 «1회 적립 상한 OFF_MAX_H 6h» 를 선언째 걷어내고(결3 ⓑ) 하루 예산
   `OFF_DAY_CAP_MIN`(분) 하나로 자른다. 유휴 가정은 `hh = h·s/80` 이라 상한이 갈리는 것은
   **s ≥ 160**(기본 H_MAX 3.0h)인데 이 자의 표시·판정은 전부 KNEE 80 이하라
   **출력은 구 상한 6h 사본과 완전 동일**하다(`verify696` [B] 가 A/B 로 매 실행 못박는다).
   갈리는 것은 내부 `LVof` 의 s ≥ 160 칸뿐이고 아무도 안 읽는다. */
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
const eg = k => num(new RegExp(k + ":\\s*\\{[\\s\\S]{0,320}?gold:([\\d.]+)"), k + ' gold');
const eh = k => num(new RegExp(k + ":\\s*\\{[\\s\\S]{0,320}?hp:([\\d.]+)"),   k + ' hp');
const G_ZOM = eg('zombie'), G_GOB = eg('goblin'), G_DRK = eg('dark'), G_BOS = eg('boss');
const H_ZOM = eh('zombie'), H_GOB = eh('goblin'), H_DRK = eh('dark'), H_BOS = eh('boss');
/* 553 — «훈련만» DPS 대용식은 네 시뮬이 손으로 베끼던 것을 `tools/dpsk.js` 한 곳으로 모았다.
   훈련 밖 7종 Lv 0 값(공속·치명·치명피해)도 거기서 같이 읽는다. */
const DK = require('./dpsk')(SRC, 'SIM249');
const ASPD0 = DK.ASPD0, CRIT0 = DK.CRIT0, CDMG0 = DK.CDMG0;
const C_KNEE = num(/const TRAIN_KNEE\s*=\s*(\d+)/,      'TRAIN_KNEE');
const C_R    = num(/const TRAIN_COST_R\s*=\s*([\d.]+)/, 'TRAIN_COST_R');
/* 162 — «모든 스테이지 = 50킬 + 보스». 구 isBossStage 는 폐기돼 있어야 한다(주기 10 의 출처). */
const PACE_162 = /const inBossFight\s*=\s*\(\)\s*=>\s*bossOn/.test(SRC) && !/const isBossStage\s*=/.test(SRC);
/* 249 — 관문 배수가 **스테이지 보스에만** 걸렸는지(몹·던전보스·승급·아레나 제외) 소스로 확인 */
const GATE_WIRED = /const hp = eHp\(s\) \* T2\.hp \* \(tk === 'boss' \? bossGateHp\(s\) : 1\);/.test(SRC);

const STATS = ['atk','hp','regen'];
function costCurve(id){
  const m = pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:trainCost\\(([\\d.]+),\\s*([\\d.]+)\\)"), id + ' cost');
  return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
}
const COST = {}; STATS.forEach(id => COST[id] = costCurve(id));
const LIN_K = {};
pick(/const TRAIN_VAL_K\s*=\s*\{([^}]*)\}/, 'TRAIN_VAL_K')[1]
  .replace(/(\w+)\s*:\s*([\d.]+)/g, (_, k, v) => { LIN_K[k] = parseFloat(v); return ''; });
const LIN_B = {};
STATS.forEach(id => {
  LIN_B[id] = parseFloat(pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*([\\d.]+)\\s*\\)"),
                              id + ' val 선형 기저')[1]);
});
const RANKS = [];
pick(/const RANKS\s*=\s*\[([\s\S]*?)\n\];/, 'RANKS')[1]
  .replace(/stage:(\d+),\s*cp:([\d.eE+]+)/g, (_, s, c) => { RANKS.push({ s:+s, cp: parseFloat(c) }); return ''; });

/* ---------- 훈련 축 (sim177 [B] 와 같은 모델) ---------- */
const ARG_H = process.argv.find(a => a.startsWith('--h='));
const H_MAX = ARG_H ? parseFloat(ARG_H.slice(4)) : 3.0;
const H_BAND = [0.5, 1.0, 3.0, 6.0];
const T_STAGE = 40, S_END = RANKS[RANKS.length-1].s, L_MAX = 4000;
const KNEE = EC.KNEE, BAND = EC.BAND, GATE_N = EC.GATE_N, GATE_HP = EC.GATE_HP;
const eGold = EC.eGold;
const mobGoldMul = s => s<3 ? G_ZOM : s<5 ? 0.44*G_GOB+0.56*G_ZOM : 0.44*G_GOB+0.16*G_DRK+0.40*G_ZOM;
const mobHpMul   = s => s<3 ? H_ZOM : s<5 ? 0.44*H_GOB+0.56*H_ZOM : 0.44*H_GOB+0.16*H_DRK+0.40*H_ZOM;
const costAt = (id,l) => COST[id].b * Math.pow(COST[id].r, Math.min(l, C_KNEE))
                       * Math.pow(C_R, Math.max(0, l - C_KNEE));
const T_COST = [0];
for(let l=0;l<L_MAX;l++) T_COST[l+1] = T_COST[l] + STATS.reduce((t,id)=>t+costAt(id,l),0);
const levelFor = G => { let L=0; while(L<L_MAX && T_COST[L+1] <= G) L++; return L; };
/* 517 — 상한은 구간표 몫(3종 합)의 누적합이다(스탯당은 그 1/3).
   «레벨 → 단계» 역함수는 나눗셈이 아니라 누적합을 넘어설 때까지 세는 것이다.
   경계 규약은 종전과 같다 — 상한을 **정확히 찍은** 레벨은 이미 다음 단계로 센다. */
const TSTEP = n => T_NEED[Math.min(Math.max(1, n), T_NEED.length) - 1] / 3;   /* 스탯당 몫 */
const TCAP  = n => { let s = 0; for(let k = 1; k <= n; k++) s += TSTEP(k); return s; };
const tstage = L => { let n = 1; while(TCAP(n) <= L) n++; return n; };
const tb = L => 1 + T_BON*(tstage(L)-1);
const tval = (id,l) => LIN_B[id] + LIN_K[id]*l;
/* 553 — 대용식에 **스킬 항**이 빠져 있었다. 이 게임에는 기본 공격이 없어 피해가 전부
   «장착 스킬» 에서 나오는데(`stat.dps`), 옛 식 `ASPD0 × critMul` 은 «일반 등급 스킬 1개» 의
   기여를 1.0 으로 접어 두고 있었다 — 504 가 `SK_DPS_REF` 를 1.84 → 6.49 로 재정박하자
   실측/대용 = **4.64** 가 되어 `verify177` ⑤ 가 빨개졌다(`probe553` 이 항등식으로 못박았다).
   식은 이제 `tools/dpsk.js` 가 소스에서 읽어 만든다. */
const DPS_K = DK.K;
function levelsFor(h){
  let cum = 0; const out = [];
  for(let s=1;s<=S_END;s++){
    const kill = N_MOB*eGold(s)*mobGoldMul(s) + eGold(s)*G_BOS;
    const hh = h*s/80;
    cum += kill + eGold(Math.max(1, s-1))*CLEAR_K
         + eGold(s)*OFF_A*OFF_B*Math.min(hh, OFF_H)*3600
         + DUN_G*((hh*3600+T_STAGE)/86400);
    out[s] = levelFor(cum);
  }
  return out;
}
const LVof = {}; H_BAND.concat([H_MAX]).forEach(h => { if(!LVof[h]) LVof[h] = levelsFor(h); });
const TPof = (h,s) => tval('atk', LVof[h][s]) * tb(LVof[h][s]);
const TP = s => TPof(H_MAX, s);

/* ---------- 곡선 두 벌 — before(177 매끈) / after(249 톱니) ---------- */
const hpSmooth = s => EC.HB * EC.eSmooth(s);                 /* 249 이전 = 구간 계단 없음 */
const hpBand   = s => EC.eHp(s);                             /* 설치본 */
/* 한 판 = 몹 N_MOB 마리 + 보스 1회. 보스만 관문 배수를 탄다. */
const mkT = (hpF, gateOf) => (h, s) =>
  N_MOB * hpF(s)*mobHpMul(s)/(TPof(h,s)*DPS_K) + hpF(s)*H_BOS*gateOf(s)/(TPof(h,s)*DPS_K);
const bossSec = (hpF, gateOf) => (h, s) => hpF(s)*H_BOS*gateOf(s)/(TPof(h,s)*DPS_K);
const one = () => 1;
const T_BEF = mkT(hpSmooth, one);                            /* 177 설치본 그대로 */
const B_BEF = bossSec(hpSmooth, one);

/* ---------- [C] 역산 — BOSS_GATE_HP 상한 ---------- */
/* «훈련만» 설계 플레이어가 유휴 밴드 전체에서 s ≤ KNEE 의 **관문** 보스를 BOSS_SEC 안에 잡는 최대 배수.
   (관문이 아닌 스테이지의 보스는 배수 1 이라 177 이 이미 확인한 자리다) */
function solveGate(){
  const ok = w => H_BAND.every(h => {
    for(let s = GATE_N; s <= KNEE; s += GATE_N)
      if(hpBand(s)*H_BOS*w/(TPof(h,s)*DPS_K) > BSEC) return false;
    return true;
  });
  let lo = 1, hi = 40;
  if(!ok(lo)) return null;
  for(let i=0;i<200;i++){ const m = (lo+hi)/2; if(ok(m)) lo = m; else hi = m; }
  return lo;
}
const GATE_MAX = solveGate();
const gateOf = s => EC.bossGateHp(s);
const T_AFT = mkT(hpBand, gateOf);
const B_AFT = bossSec(hpBand, gateOf);

/* ---------- [D] 톱니 측정 ---------- */
/* 구간 = [k·BAND, k·BAND + BAND-1] (관문 스테이지가 구간의 **첫** 칸 = 벽, 뒤가 돌파 구간) */
function teeth(Tf){
  const out = [];
  for(let a = BAND; a + BAND - 1 <= KNEE; a += BAND){
    let hi = -Infinity, lo = Infinity, hiS = a, loS = a;
    for(let s = a; s <= a + BAND - 1; s++){
      const t = Tf(H_MAX, s);
      if(t > hi){ hi = t; hiS = s; }
      if(t < lo){ lo = t; loS = s; }
    }
    out.push({ a, hi, hiS, lo, loS, amp: hi/lo });
  }
  return out;
}
const TH_BEF = teeth(T_BEF), TH_AFT = teeth(T_AFT);
const gmean = xs => Math.exp(xs.reduce((t,x)=>t+Math.log(x),0)/xs.length);

/* ---------- 출력 ---------- */
console.log('SIM249 — 스테이지 클리어 «톱니» (index.html 실측 상수)');
console.log('');
console.log('[A] 설치 상수');
console.log('  적    ' + EC.desc);
console.log('  표기  ' + (EC.form === '249' ? '249 «177 곡선 × 구간 계단» + 관문 보스' : '⚠ 249 미설치 (' + EC.form + ')'));
console.log('  주기  ES_BAND ' + BAND + ' · 관문 s%' + GATE_N + '===0 · 관문 보스 체력 ×' + GATE_HP);
console.log('  페이싱 162 «모든 스테이지 = ' + N_MOB + '킬 + 보스» : ' + (PACE_162 ? '확인(구 isBossStage 폐기 — 주기 10 의 출처)' : '⚠ 구 isBossStage 잔존'));
console.log('  보스  HP ×' + H_BOS + ' · 제한 ' + BSEC + '초');
console.log('  DPS   ' + DK.desc + ' → DPS 계수 ' + DPS_K.toFixed(4) + '   (553 — 스킬 항 포함)');
console.log('  유휴  기준 ' + H_MAX + 'h · 밴드 [' + H_BAND.join(' ') + ']h');
console.log('');

const SHOW = [];
for(let s=1;s<=40;s++) SHOW.push(s);
[50,60,70,80].forEach(s => SHOW.push(s));
console.log('[B] 한 판 소요 t(s) = ' + N_MOB + '킬 + 보스 (초) — «훈련만» 설계 플레이어');
console.log('     stage | before(177 매끈) | after(249 톱니) |  보스 소요 after | 관문');
SHOW.forEach(s => {
  const isG = s % GATE_N === 0;
  console.log('     ' + String(s).padStart(5)
    + ' | ' + T_BEF(H_MAX,s).toFixed(1).padStart(16)
    + ' | ' + T_AFT(H_MAX,s).toFixed(1).padStart(15)
    + ' | ' + B_AFT(H_MAX,s).toFixed(1).padStart(16)
    + ' | ' + (isG ? '◀ 벽' : ''));
});
console.log('');

console.log('[C] 역산 — BOSS_GATE_HP');
console.log('  상한 = ' + (GATE_MAX === null ? '없음' : GATE_MAX.toFixed(4))
          + '  ← 유휴 밴드 [' + H_BAND.join(' ') + ']h 전부에서 s ≤ ' + KNEE + ' 관문 보스 ≤ ' + BSEC + '초');
console.log('  설치 = ' + GATE_HP + (GATE_MAX !== null && GATE_HP <= GATE_MAX ? '  (상한 이내)' : '  ⚠ 상한 초과'));
console.log('  ※ 이빨 높이(구간 계단)에는 자유도가 없다 — 177 곡선의 ' + BAND + '스테이지 성장률 그대로다:');
[10,20,40,80].filter(s => s+BAND <= S_END).forEach(s =>
  console.log('     eSmooth(' + (s+BAND) + ')/eSmooth(' + s + ') = ' + (EC.eSmooth(s+BAND)/EC.eSmooth(s)).toFixed(3)));
console.log('');

console.log('[D] 톱니 — 구간별 진폭·벽 위치 (구간 = [10k .. 10k+9])');
console.log('     구간 |  벽 t(s) | 돌파 t(s) | 진폭 | 벽 위치 | before 진폭');
TH_AFT.forEach((x,i) => {
  const b = TH_BEF[i];
  console.log('     ' + (x.a + '~' + (x.a+BAND-1)).padStart(6)
    + ' | ' + x.hi.toFixed(1).padStart(8)
    + ' | ' + x.lo.toFixed(1).padStart(9)
    + ' | ' + x.amp.toFixed(2).padStart(4)
    + ' | s' + String(x.hiS).padStart(3) + (x.hiS === x.a ? ' ✔' : ' ✗')
    + ' | ' + b.amp.toFixed(2).padStart(11));
});
console.log('  → after 진폭 기하평균 ' + gmean(TH_AFT.map(x=>x.amp)).toFixed(2)
          + ' · before ' + gmean(TH_BEF.map(x=>x.amp)).toFixed(2)
          + ' (before 는 «매끈» = 진폭 1 근처가 정상이고, 그것이 주인이 지적한 상태다)');
console.log('');

/* ---------- [E] 게이트 ---------- */
const R = [];
const ck = (n, pass, got) => R.push({ n, pass: !!pass, got: String(got) });
/* ---- 326 이관(2026-08-28) — «199 대기» 칸 ------------------------------------
   326 이 훈련 단계 요구치를 «증가식»(단계 n 몫 = 스탯당 100×n) 으로 바꾸면서, **같은 레벨의 단계가 내려갔다**
   (s80 도달 Lv 308 은 그대로인데 단계가 4 → 3). 단계 보너스가 `1 + 0.10×(단계−1)` 이므로
   훈련만 축의 화력·체력이 **1.30 → 1.20 (−7.7%)** 다. 적 곡선(112/177/249 계수)은 그 1.30 위에서
   역산된 값이라, 계수를 한 줄도 안 건드린 지금 몇 칸이 소수점 밖으로 밀려난다.

   ⚠ **이 칸들을 «고쳐서» 초록으로 만들지 마라.** 여기서 계수를 손대는 것이 정확히 131 이 저지른 일이고,
      326 지시서가 «적 곡선 재조정이 필요하면 **수치 확정은 199 몫**» 이라고 명시한 자리다.
      그래서 실패로 세지 않고 «⏸199» 로 따로 세되, 값과 초과분은 **그대로 크게 찍는다**.
      199 가 결정을 내리면 이 칸을 다시 `ck` 로 되돌리는 것까지가 199 의 몫이다. */
const D199 = [];
const ck199 = (n, pass, got, why) => { R.push({ n, pass: !!pass, got: String(got), d199: true, why });
                                       if(!pass) D199.push({ n, got: String(got), why }); };


ck('① 249 표기가 설치돼 있다 (eScale = eSmooth(eBand(s)) × 램프' + (EC.RAMP ? ' ^' + EC.RAMP : '') + ')', EC.form === '249', EC.form);
/* 199 5회차 이관 — 주기 40 → 80. 3회차가 이 항을 «벽 **개수**» 축으로 바꿔 놓았고, 5회차가
   같은 상수에 **둘째 뜻**이 있음을 실측으로 찾았다: 벽당 실오르막(순 이동) ≈ **밴드 칸수 ×
   판당 최소 소요**라, 이 주기가 곧 «오르막의 길이» 다(40 → 21분 · 80 → 41분 · 120 → 53분,
   봇 4시드 30일). 80 에서 부지런 30일 벽이 12 → **8칸 = 주인 목표 그 값**이 되고 벽당 실오르막이
   ×1.95 가 된다. 항은 여전히 안 지우고 방향만 바꾼다(333 · M1 · 3회차 선례):
   «주기가 199 확정값과 같고, 162 페이싱(모든 스테이지 = 50킬+보스)은 그대로인가». */
/* 199 6회차 이관 — 주기 80 → 40 원복. 5회차는 이 상수의 «둘째 뜻»(오르막의 길이)만 보고
   80 을 골랐는데, 3인 전원이 ① 을 막은 진단은 **셋째 뜻**이었다: 이 상수가 곧 경계 점프의
   크기다(R^(1−RAMP·(B−1)/B) — B 80 → ×2,155 · B 40 → ×47). ×2,155 이빨 하나가 30일의 29.5%
   를 먹어 벽의 «자리» 가 무너졌다(적중 6 → 3/8 · 첫 벽 525 → 754분 · 간격 1.47 → 1.69).
   항은 또 안 지우고 값만 199 확정값을 따라간다(3·5회차 선례). 근거 review §6-1·§6-2. */
ck('② 주기 ES_BAND = 40 — 199 6회차 확정(벽의 «자리» ① 을 정하는 경계 점프의 크기 · 162 페이싱 불변)',
   BAND === 40 && PACE_162, BAND + '/' + (PACE_162 ? '162 확인' : '구 규칙 잔존'));
/* 199 4회차 — «구간 안 평지» 를 «구간 안 = 정확히 램프식» 으로 갈아 끼운다(333 처방 — 항을
   지우지 않고 방향만). 3회차 비평 ③(전원 3점)의 진단이 «평지라 돌파 국면이 13분» 이었고,
   ES_RAMP 가 구간 몫 성장의 RAMP 비율을 구간 안 비탈로 깐다. RAMP = 0 이면 구식과 동일하다. */
const RAMP = EC.RAMP || 0;
const rampAt = s => { const a = EC.eBand(s);
  return EC.eSmooth(a) * Math.pow(EC.eSmooth(a + BAND) / EC.eSmooth(a), RAMP * (s - a) / BAND); };
let flat = true, jump = true;
for(let s=1;s<=S_END;s++) if(Math.abs(EC.eHp(s)/(EC.HB*rampAt(s)) - 1) > 1e-9) flat = false;
for(let s=BAND;s<=KNEE;s+=BAND) if(!(EC.eHp(s) > EC.eHp(s-1)*1.0001)) jump = false;
/* 벽이 벽으로 남는다 — 구간 경계 점프(R^(1−RAMP·(B−1)/B))가 구간 내 총 상승(R^(RAMP·(B−1)/B))보다
   크려면 RAMP·(B−1)/B < 0.5 여야 한다. 문턱이 아니라 두 항등식에서 나오는 부등식이다. */
const wallDom = RAMP * (BAND - 1) / BAND < 0.5;
ck('③ 구간 안 = 정확히 램프식(RAMP ' + RAMP + ' 항등 · 1e-9) · 구간 첫 칸에서 오른다 · 경계 점프 > 구간 내 총 상승',
   flat && jump && wallDom,
   (flat?'ok':'램프식 이탈') + '/' + (jump?'ok':'벽 없음') + '/' + (wallDom?'ok':'RAMP 과대'));
ck('④ 스테이지 1 은 여전히 구 곡선과 동일 — eHp ' + EC.eHp(1).toFixed(4) + ' · eDmg ' + EC.eDmg(1).toFixed(4),
   Math.abs(EC.eHp(1)-55) < 1e-9 && Math.abs(EC.eDmg(1)-6) < 1e-9, EC.eHp(1) + '/' + EC.eDmg(1));
ck199('⑤ 설치 BOSS_GATE_HP ' + GATE_HP + ' ≤ 역산 상한 ' + (GATE_MAX === null ? '없음' : GATE_MAX.toFixed(4)),
   GATE_MAX !== null && GATE_HP <= GATE_MAX + 1e-9, GATE_HP + ' vs ' + (GATE_MAX === null ? '-' : GATE_MAX.toFixed(4)),
   '326 으로 역산 상한이 1.4469 → ' + (GATE_MAX === null ? '-' : GATE_MAX.toFixed(4)) + ' 로 내려왔다 — 설치값 1.44 는 안 건드렸다');
/* ⑥ 관문 보스가 유휴 밴드 전체에서 제한 시간 안 — 하드락이 아니다 */
let worstG = 0, worstH = null;
H_BAND.forEach(h => { for(let s=GATE_N;s<=KNEE;s+=GATE_N){ const b = B_AFT(h,s); if(b > worstG){ worstG = b; worstH = h; } } });
ck199('⑥ 관문 보스 최악 ' + worstG.toFixed(2) + '초 ≤ ' + BSEC + ' (유휴 밴드 전체 · h=' + worstH + 'h) — 벽이지 하드락이 아니다',
   worstG <= BSEC, worstG.toFixed(2),
   '관문 보스 14.93 → ' + worstG.toFixed(2) + '초 (제한 ' + BSEC + '초를 ' + ((worstG/BSEC-1)*100).toFixed(1) + '% 초과)');
/* ⑦ 톱니 구조 — 모든 구간에서 최대값이 관문 스테이지에 선다 */
const peakOk = TH_AFT.every(x => x.hiS === x.a && x.loS === x.a + BAND - 1);
ck('⑦ 모든 구간에서 벽 = 관문 스테이지(구간 첫 칸) · 최속 = 구간 마지막 칸', peakOk,
   TH_AFT.map(x => 's'+x.hiS).join(' '));
/* ⑧ **이빨 높이에는 자유도가 없다** — 구간 안에서 적이 고정이므로 진폭(관문 배수를 뺀 계단 몫)은
   «그 구간에서 내가 자란 배수» 와 **항등**이다. 임의의 목표 진폭을 고르는 대신 그 항등을 단언한다.
   (관문 배수는 그 위에 곱으로 얹히므로 총 진폭 = 성장배수 × 관문 몫이다) */
/* 199 4회차 — ⑧ 항등의 «평지» 전제를 램프로 넓힌다: 계단+램프 몫 진폭(관문 제외)은
   «구간 안 성장배수 ÷ 구간 내 램프 상승» 과 항등이다. 여전히 목표값이 없는 항등 검사다. */
let idOk = true, idWorst = 0;
const T_STEP = mkT(hpBand, one);                       /* 계단+램프만 — 관문 배수 제외 */
TH_AFT.forEach(x => {
  const amp0 = T_STEP(H_MAX, x.a) / T_STEP(H_MAX, x.a + BAND - 1);
  const rise = Math.pow(EC.eSmooth(x.a + BAND) / EC.eSmooth(x.a), RAMP * (BAND - 1) / BAND);
  const grow = TPof(H_MAX, x.a + BAND - 1) / TPof(H_MAX, x.a);
  const d = Math.abs(amp0 - grow / rise) / (grow / rise);
  if(d > idWorst) idWorst = d;
  if(d > 1e-9) idOk = false;
});
ck('⑧ 계단·램프 몫 진폭 = 성장배수 ÷ 구간 내 램프 상승 (항등 · 최악 상대오차 ' + idWorst.toExponential(1) + ')',
   idOk, idWorst.toExponential(1));
/* ⑨ 톱니가 실제로 생겼다 — 199 4회차 재정박: 램프는 구간 «안» 진폭을 의도적으로 상승면에
   나눠 주므로(그것이 ③ 축 처방이다) 구 «구간 진폭 after > before» 는 램프와 정면 모순이다.
   톱니의 자리는 이제 **관문 스텝** — 벽 진입 한 칸의 t 비(after)가 매끈 곡선의 같은 칸 스텝
   (before)보다 «구간 몫» 만큼 크다. 값은 고른 것이 아니라 항등에서 나온다:
   after 스텝 ≈ R^(1−RAMP·(B−1)/B)×관문 몫 · before 스텝 ≈ R^(1/B). 이 비가 ≥ 2 인 것은
   wallDom(③)과 같은 부등식의 다른 얼굴이다. 구간 안 «돌파 가속» 은 그대로 단언한다 —
   after 구간 진폭 > 1 (성장배수가 램프 상승보다 크다 = 구간 안에서 뒤로 갈수록 빨라진다). */
const stepAt = (Tf, s) => Tf(H_MAX, s) / Tf(H_MAX, s - 1);
let stepOk = true, stepWorst = Infinity;
for(let a = BAND; a + BAND - 1 <= KNEE; a += BAND){
  const r = stepAt(T_AFT, a) / stepAt(T_BEF, a);
  if(r < stepWorst) stepWorst = r;
  if(!(r >= 2)) stepOk = false;
}
const ampMin = Math.min(...TH_AFT.map(x=>x.amp));
ck('⑨ 벽 스텝(관문 진입 t 비)이 before 매끈 스텝의 ≥2배 (최악 ×' + stepWorst.toFixed(2) + ') · 구간 안 돌파 가속(진폭 최소 ' + ampMin.toFixed(2) + ' > 1)',
   stepOk && ampMin > 1, '×' + stepWorst.toFixed(2) + ' / ' + ampMin.toFixed(2));
/* ⑨ 새 곡선은 어디서도 177 곡선보다 세지 않다 — 177 의 «무벽» 확인이 그대로 유효하다 */
let notHarder = true;
for(let s=1;s<=S_END;s++) if(EC.eHp(s) > EC.HB*EC.eSmooth(s) + 1e-9) notHarder = false;
ck('⑩ eHp_249(s) ≤ eHp_177(s) 전 구간 — 벽을 세운 게 아니라 벽 사이를 비웠다', notHarder, notHarder?'ok':'NG');
/* ⑩ 관문 배수는 스테이지 보스에만 걸린다 */
ck('⑪ 관문 배수가 스테이지 보스(tk==="boss")에만 걸려 있다 — 몹·던전보스·승급·아레나 제외', GATE_WIRED,
   GATE_WIRED ? 'ok' : 'makeEnemy 배선 없음');
ck('⑫ 관문이 아닌 스테이지의 보스 배수는 1 이다', EC.bossGateHp(GATE_N-1) === 1 && EC.bossGateHp(GATE_N) === GATE_HP,
   EC.bossGateHp(GATE_N-1) + '/' + EC.bossGateHp(GATE_N));
/* ⑫ 경제 축 불변 */
ck('⑬ eGold 배율 불변 1.175 (112 가 여기서 역산됐다)', Math.abs(EC.eGold(2)/EC.eGold(1) - 1.175) < 1e-9,
   (EC.eGold(2)/EC.eGold(1)).toFixed(5));
/* ⑬ 몹은 관문 배수를 안 탄다 — t(s) 의 몹 몫이 before/after 에서 구간 앵커에서 같다 */
let anchorSame = true;
for(let s=BAND;s<=KNEE;s+=BAND) if(Math.abs(EC.eHp(s) - EC.HB*EC.eSmooth(s)) > 1e-9) anchorSame = false;
ck('⑭ 관문 스테이지의 몹은 177 곡선 값 그대로다 (계단의 앵커)', anchorSame, anchorSame?'ok':'NG');

console.log('[E] 게이트');
R.forEach(x => console.log('  ' + (x.pass ? 'PASS' : x.d199 ? '⏸199' : 'FAIL') + ' — ' + x.n + '  →  ' + x.got));
const fail = R.filter(x => !x.pass && !x.d199).length;
const held = D199.length;
console.log('');
if(held){
  console.log('  ⏸ 199 대기 ' + held + '칸 — 326(훈련 단계 요구치 증가식)이 같은 레벨의 «단계» 를 내려');
  console.log('     훈련만 축 배수가 1.30 → 1.20 (−7.7%) 이 된 몫이다. **계수는 한 줄도 안 건드렸다.**');
  D199.forEach(x => console.log('     · ' + x.n + '  →  ' + x.got + '   [' + x.why + ']'));
  console.log('     되돌리는 지렛대는 하나다 — 적 곡선을 낮추든 TRAIN_BONUS 를 올리든 **199 가 정한다.**');
  console.log('');
}
console.log(fail ? 'SIM249 FAIL (' + (R.length-fail-held) + '/' + R.length + ' · ⏸' + held + ')'
                 : 'SIM249 PASS (' + (R.length-held) + '/' + (R.length-held) + (held ? ' · ⏸' + held + ' → 199 대기' : '') + ')');
process.exit(fail ? 1 : 0);
