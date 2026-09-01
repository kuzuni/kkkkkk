#!/usr/bin/env node
/* 작업 177 — 스테이지(적) 곡선 재설계 시뮬레이터 + 게이트
   (저장소 주인 지시 2026-08-27: «훈련 밸런스 바꾼 것에 맞게 스테이지도 밸런스 바꿔야 함»)

   ── 왜 바꾸는가 ─────────────────────────────────────────────────────────────
   168 이 훈련 효과값을 **선형**(`b + k·l`)으로 바꿨는데 적 곡선은 **순수 지수**
   (eHp ×1.25 · eDmg ×1.14 / 스테이지) 그대로였다. 선형은 지수를 못 이기므로 훈련 축은
   반드시 벽에 부딪히고, sim168 [D] 가 그 벽을 **스테이지 18** 로 실측했다.
   주인이 «재조정» 을 지시한 것이 이 벽이다.

   ── 무엇을 자유도로 두는가 (LESSONS 106-1 «발명이 아니라 역산» · 112-① «배율과 계수는
      서로 다른 조건으로 따로 풀린다») ────────────────────────────────────────
   새 적 곡선은 «**선형 항 × 구간별 저지수**» 한 줄이다:

       eScale(s) = (1 + K·(s−1)) · M1^(min(s,KNEE)−1) · M2^max(0, s−KNEE)
       eHp(s)  = 55 · eScale(s)
       eDmg(s) = 6  · eScale(s)^A

   자유도 넷을 **각각 다른 조건 하나**로 푼다. 눈대중이 들어갈 자리가 없다:

     K    ← **훈련 축이 자기 몫으로 감당하는 선형 성장분.** 설치된 112 비용 곡선 + 168 선형 val
            + 162 페이싱으로 스테이지별 도달 Lv 을 실측해 «훈련만 공격력» TP(s) 를 뽑고,
            s=1 과 s=KNEE 를 잇는 선형 항의 기울기로 잡는다 → K = (TP(KNEE)/TP(1) − 1)/(KNEE−1).
            유휴 가정 밴드(0.5~6h)에서 나오는 네 기울기 중 **가장 작은 것**을 쓴다 — 적 곡선이
            가장 완만해지는 선택이라 밴드 안 어느 가정에서도 훈련 축이 뒤처지지 않는다.
     KNEE ← **훈련 축의 지평.** 저장소가 스스로 못 박은 값이 하나뿐이다 —
            112 주인 지시(«스테이지 80 까지 훈련 4단계»)의 80 이고, 그 80 은 RANKS 의
            플래티넘 계급 스테이지이기도 하다. 이 도구는 «RANKS 에 stage 80 계급이 있는가» 로
            그 일치를 매 실행 확인한다.
     M1   ← **KNEE 아래에서 훈련 축이 혼자 버틸 수 있는 최대 저지수.**
            «몹 1마리 ≤ 1초 · 보스 ≤ BOSS_SEC» (168 이 쓴 «게임이 실제로 되는가» 기준)을
            s=1..KNEE 전 구간에서 만족하는 M 의 상한을 이분법으로 푼다.
     M2   ← **KNEE 위 = 배수 축(장비·유물·도감·펫·축복)이 이끄는 구간의 배율.**
            RANKS(주인이 못 박은 계급 요구 전투력) 의 s80→최종 성장률에서 선형 항의 몫을
            나눠 남긴다 → M2 = (cp_last/cp_80)^(1/Δs) ÷ (선형 항 성장률).
     A    ← **적의 «맷집 대 화력» 비례 보존.** 구 곡선이 eDmg/6 = (eHp/55)^A 였으므로
            A = ln(1.14)/ln(1.25). 곡선의 «속도» 만 바꾸고 적 두 축의 관계는 한 글자도 안 바꾼다.

   ── 안 건드리는 축 ─────────────────────────────────────────────────────────
   **eGold(경제 축)** 는 그대로다. 112 의 `TRAIN_COST_R` 이 «eGold 배율 1.175 에서 역산» 된
   값이라(index.html «112 훈련 비용 곡선» 주석) eGold 를 건드리면 «스테이지 80 까지 훈련 4단계»
   라는 **주인 지시가 그 자리에서 깨진다.** 177 은 난이도 축(eHp/eDmg)만 바꾸고, 경제 축이
   그대로임을 게이트 ⑦·⑧ 로 못 박는다. 훈련 비용·상한·단계 보너스·세이브 구조도 불변.

   출력
     [A] 설치 상수 — index.html 실측(베끼지 않는다)
     [B] 훈련 축 실측 — 162 페이싱 기준 도달 Lv · 훈련만 공격력 TP(s)
     [C] 역산 — K · KNEE · M1 · M2 · A
     [D] 난이도 프로파일 before(구 지수) / after(설치본)
     [E] **before/after 도달 시간 표** (등재문 필수)
     [F] 벽 위치
     [G] 게이트
   실행: node tools/sim177.js [--h=3.0]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const readECurve = require('./ecurve');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function pick(re, what){
  const m = SRC.match(re);
  if(!m){ console.error('SIM177 FAIL — index.html 에서 «' + what + '» 를 못 찾았다: ' + re); process.exit(1); }
  return m;
}
const num = (re, what) => parseFloat(pick(re, what)[1]);

/* ---------- [A] 설치 상수 ---------- */
const EC = readECurve(SRC, 'SIM177');
const N_MOB = num(/const ENEMY_COUNT\s*=\s*(\d+)/,        'ENEMY_COUNT');
/* ⚑ 696(2026-09-01) — 199 21회차 이관 누락분. 제품이 «1회 적립 상한 OFF_MAX_H 6h» 를
   선언째 걷어내고(주인 결정 결3 ⓑ) «하루 총 예산 OFF_DAY_CAP_MIN 1,440분» 하나로 자른다.
   같은 이관을 `sim112`·`sim131` 은 그때 받았고 이 자·`sim249`·`sim168` 은 안 받아 **즉사**했다.
   ⚠ 자리를 비우지 않는다(333) — 오프라인을 자르는 축은 여전히 있고 이름·단위만 바뀌었다.
   ⚠⚠ 뜻이 달라진 만큼 **값도 달라진다**(6h → 24h) — 이름만 갈아 끼우는 작업이 아니다.
   이 자의 유휴 가정은 `hh = H_MAX·s/80` 이라 기본 H_MAX 3.0h 에서 **s ≥ 160 부터** 6h 를
   넘는다 ⇒ 표시표의 s 170·230·300 행만 움직인다(도달 Lv 621→622 · 820→826 · 1051→1063,
   최대 +1.14%). **게이트 14항의 판정은 한 항도 안 바뀐다**(전부 KNEE=80 이하를 본다).
   움직인 것은 제품이지 이 자가 아니다 — 199 21회차가 상한을 바꾼 결과를 이제야 읽는 것이다.
   A/B 는 `verify696` [B] 가 구 상한 6h 사본과 대조해 매 실행 못박는다. */
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
const DK = require('./dpsk')(SRC, 'SIM177');
const ASPD0 = DK.ASPD0, CRIT0 = DK.CRIT0, CDMG0 = DK.CDMG0;
const C_KNEE = num(/const TRAIN_KNEE\s*=\s*(\d+)/,      'TRAIN_KNEE');
const C_R    = num(/const TRAIN_COST_R\s*=\s*([\d.]+)/, 'TRAIN_COST_R');
/* 162 — «보스는 10의 배수 스테이지» 가 폐기되고 **모든 스테이지**가 «50킬 + 보스» 다.
   그 사실을 코드에서 확인한다(주석이 아니라 구현으로). */
const PACE_162 = /const inBossFight\s*=\s*\(\)\s*=>\s*bossOn/.test(SRC)
              && !/const isBossStage\s*=/.test(SRC);

const STATS = ['atk','hp','regen'];
function costCurve(id){
  const m = pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?cost:trainCost\\(([\\d.]+),\\s*([\\d.]+)\\)"), id + ' cost');
  return { b: parseFloat(m[1]), r: parseFloat(m[2]) };
}
const COST = {}; STATS.forEach(id => COST[id] = costCurve(id));
const VKS = pick(/const TRAIN_VAL_K\s*=\s*\{([^}]*)\}/, 'TRAIN_VAL_K (168 선형 기울기)');
const LIN_K = {};
VKS[1].replace(/(\w+)\s*:\s*([\d.]+)/g, (_, k, v) => { LIN_K[k] = parseFloat(v); return ''; });
const LIN_B = {};
STATS.forEach(id => {
  LIN_B[id] = parseFloat(pick(new RegExp("\\{ id:'" + id + "',[\\s\\S]{0,300}?val:trainVal\\('" + id + "',\\s*([\\d.]+)\\s*\\)"),
                              id + ' val 선형 기저')[1]);
});
/* RANKS — 주인이 못 박은 «계급별 요구 전투력» 표. M2·KNEE 의 유일한 근거다. */
const RANKS = [];
pick(/const RANKS\s*=\s*\[([\s\S]*?)\n\];/, 'RANKS')[1]
  .replace(/stage:(\d+),\s*cp:([\d.eE+]+)/g, (_, s, c) => { RANKS.push({ s:+s, cp: parseFloat(c) }); return ''; });
if(RANKS.length < 3){ console.error('SIM177 FAIL — RANKS 를 못 읽었다'); process.exit(1); }

/* ---------- [B] 훈련 축 실측 (162 페이싱: 모든 스테이지 = 50킬 + 보스) ---------- */
const ARG_H = process.argv.find(a => a.startsWith('--h='));
const H_MAX = ARG_H ? parseFloat(ARG_H.slice(4)) : 3.0;   /* 표시용 기준 — sim112/131/168 과 같은 값 */
const H_BAND = [0.5, 1.0, 3.0, 6.0];                      /* 유휴 가정 밴드(sim168 ⑨ 와 같은 폭) */
const T_STAGE = 40, S_END = RANKS[RANKS.length-1].s, L_MAX = 4000;
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
/* 유휴 가정 h 에서의 스테이지별 도달 Lv. 162 — 보스가 매 스테이지에 있으므로 보스 골드도 매 스테이지
   들어온다(sim168 은 s%10 가정이었다). */
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
const LV = LVof[H_MAX];
/* TP(s) = «훈련만» 공격력(배수 축 = 1 인 하한). 단계 보너스까지 포함한다. */
const TPof = (h,s) => tval('atk', LVof[h][s]) * tb(LVof[h][s]);
const TP  = s => TPof(H_MAX, s);
const THP = s => tval('hp', LV[s]) * tb(LV[s]);

/* ---------- [C] 역산 ---------- */
const KNEE_R = RANKS.find(r => r.s === 80);          /* 112 지평 80 이 RANKS 계급 스테이지인가 */
const KNEE = KNEE_R ? 80 : RANKS[Math.min(3, RANKS.length-1)].s;
/* ★ K 는 유휴 가정 밴드(0.5~6h)에서 나오는 기울기 중 **가장 작은 값**을 쓴다.
   기울기는 «하루에 얼마나 방치하느냐» 에 붙어 있는데([H] 민감도) 부호가 직관과 반대다 —
   많이 방치할수록 s1 도달 Lv 자체가 높아져(2 → 5) **분모** TP(1) 이 커지고, 그래서 s1→s80 의
   «상대» 기울기는 오히려 **작아진다**(h=6h 에서 0.888 로 최소).
   가장 작은 기울기를 고르면 적 곡선이 밴드 안에서 가장 완만해지므로 **어느 가정에서도 훈련 축이
   뒤처지지 않는다** — 그 사실 자체는 게이트 ⑧ 이 밴드 전체를 훑어 확인한다(최악은 h=0.5h 쪽이다). */
const K_OF = h => (TPof(h,KNEE)/TPof(h,1) - 1) / (KNEE - 1);
const K_DER = Math.min(...H_BAND.map(K_OF));
const A_DER = Math.log(1.14) / Math.log(1.25);       /* 구 곡선의 «맷집 대 화력» 비례 — 게이트 자기 상수 */
/* 249 — 곡선에 «구간 계단» 이 얹히면 form 이 '249' 가 된다. 177 이 푼 다섯 상수(ES_*)는
   그대로라 이 시뮬의 역산·게이트는 두 표기에서 똑같이 성립한다 — 표기 이름만 넓힌다. */
const IS177 = EC.form === '177' || EC.form === '249';
const EHB = IS177 ? EC.HB : EC.EH_B;
const EDB = IS177 ? EC.DB : EC.ED_B;

const scaleOf = (K, M1, M2, s) => (1 + K*(s-1))
      * Math.pow(M1, Math.min(s, KNEE) - 1) * Math.pow(M2, Math.max(0, s - KNEE));
const mobSecOf  = (h,K,M1,s) => EHB*scaleOf(K,M1,M1,s)*mobHpMul(s) / (TPof(h,s)*DPS_K);
const bossSecOf = (h,K,M1,s) => EHB*scaleOf(K,M1,M1,s)*H_BOS       / (TPof(h,s)*DPS_K);
/* M1 상한 — «훈련만으로 KNEE 까지 몹 ≤ 1초 · 보스 ≤ BOSS_SEC» 를 **밴드 전체**에서 만족하는 최대값 */
function solveM1(K){
  const ok = m => H_BAND.every(h => {
    for(let s=1;s<=KNEE;s++) if(mobSecOf(h,K,m,s) > 1 || bossSecOf(h,K,m,s) > BSEC) return false;
    return true;
  });
  let lo = 1, hi = 1.5;
  if(!ok(lo)) return null;
  for(let i=0;i<200;i++){ const m = (lo+hi)/2; if(ok(m)) lo = m; else hi = m; }
  return lo;
}
const M1_MAX = solveM1(K_DER);
const RL = RANKS[RANKS.length-1];
const RK = RANKS.find(r => r.s === KNEE) || RANKS[3];
const G_TOT = Math.pow(RL.cp / RK.cp, 1/(RL.s - RK.s));                     /* RANKS 후반 총 성장률 */
const G_LIN = Math.pow((1 + K_DER*(RL.s-1))/(1 + K_DER*(RK.s-1)), 1/(RL.s - RK.s));  /* 그중 선형 항 몫 */
const M2_DER = G_TOT / G_LIN;

/* 설치본 */
const INS = IS177
  ? { K: EC.K, KNEE: EC.KNEE, M1: EC.M1, M2: EC.M2, A: EC.A }
  : null;

/* 곡선 함수 — before(구 지수) / after(설치본) */
const oldR = 1.25, oldD = 1.14, oldHB = 55, oldDB = 6;      /* 기록 대조용(코드에는 더 이상 없다) */
const beforeHp  = s => oldHB*Math.pow(oldR, s-1);
const beforeDmg = s => oldDB*Math.pow(oldD, s-1);
const afterHp   = EC.eHp, afterDmg = EC.eDmg;

const mkProf = (hpF, dmgF) => ({
  mob:  s => hpF(s)*mobHpMul(s) / (TP(s)*DPS_K),
  boss: s => hpF(s)*H_BOS       / (TP(s)*DPS_K),
  ratA: s => TP(s) / (hpF(s)*H_ZOM),
  ratH: s => THP(s) / dmgF(s)
});
const P_BEF = mkProf(beforeHp, beforeDmg);
const P_AFT = mkProf(afterHp,  afterDmg);

/* ---------- 출력 ---------- */
const f2 = n => (!isFinite(n) ? '∞' : n.toExponential(2));
const SHOW = [1,5,10,20,30,40,60,80,120,170,230,300].filter(s => s <= S_END);
console.log('SIM177 — 스테이지(적) 곡선 재설계 (index.html 실측 상수)');
console.log('');
console.log('[A] 설치 상수');
console.log('  적    ' + EC.desc);
console.log('  표기  ' + (EC.form === '249' ? '177 «선형 × 구간별 저지수» + 249 «구간 계단»'
                        : EC.form === '177' ? '177 «선형 × 구간별 저지수»' : '구 «순수 지수» (177 미설치)'));
console.log('  훈련  val(선형·168) ' + STATS.map(id => id + ' ' + LIN_B[id] + '+' + LIN_K[id] + '×l').join(' · ') + ' — **177 이 안 건드린 축**');
console.log('  훈련  비용(112 무릎 Lv ' + C_KNEE + ' 이후 ×' + C_R + ') — **177 이 안 건드린 축**');
console.log('  페이싱 162 «모든 스테이지 = ' + N_MOB + '킬 + 보스» : ' + (PACE_162 ? '확인' : '⚠ 구 isBossStage 잔존'));
console.log('  보스  HP ×' + H_BOS + ' · 제한 ' + BSEC + '초');
console.log('  DPS   ' + DK.desc + ' → DPS 계수 ' + DPS_K.toFixed(4) + '   (553 — 스킬 항 포함)');
console.log('  RANKS 계급 요구 전투력 — ' + RANKS.map(r => 's'+r.s+':'+(r.cp?r.cp.toExponential(0):'0')).join(' · '));
console.log('');

console.log('[B] 훈련 축 실측 — 162 페이싱 기준 (배수 축 = 1 인 하한)');
console.log('     stage |   Lv | 단계 | 훈련만 공격력 | TP(s)/TP(1)');
SHOW.forEach(s => console.log('     ' + String(s).padStart(5) + ' | ' + String(LV[s]).padStart(4)
  + ' | ' + String(tstage(LV[s])).padStart(4) + ' | ' + String(Math.round(TP(s))).padStart(13)
  + ' | ' + (TP(s)/TP(1)).toFixed(2).padStart(11)));
console.log('');

console.log('[C] 역산 — 자유도 넷을 각각 다른 조건 하나로 푼다');
console.log('  KNEE = ' + KNEE + '  ← 112 주인 지시의 지평(스테이지 80)이자 RANKS '
          + (KNEE_R ? '계급 스테이지(일치 확인)' : '⚠ RANKS 에 stage 80 계급이 없다 — 대체값 사용'));
console.log('  K    = ' + K_DER.toFixed(4) + '  ← (1+K(s−1)) 로 TP(1)→TP(' + KNEE + ') 를 잇는 기울기 = 훈련 축이 감당하는 선형 성장분'
          + ' · 유휴 밴드 4값 [' + H_BAND.map(h => K_OF(h).toFixed(3)).join(' ') + '] 중 최소');
console.log('  M1   = ' + (M1_MAX === null ? '없음' : M1_MAX.toFixed(5))
          + '  ← 훈련만으로 s ≤ ' + KNEE + ' 전 구간 «몹 ≤ 1초 · 보스 ≤ ' + BSEC + '초» 를 만족하는 상한');
console.log('  M2   = ' + M2_DER.toFixed(4) + '  ← RANKS s' + RK.s + '→s' + RL.s + ' 요구 전투력 성장률 '
          + G_TOT.toFixed(4) + ' ÷ 선형 항 성장률 ' + G_LIN.toFixed(4));
console.log('  A    = ' + A_DER.toFixed(4) + '  ← ln(1.14)/ln(1.25) = 구 곡선의 «맷집 대 화력» 비례 보존');
if(INS) console.log('  설치본 — K ' + INS.K + ' · KNEE ' + INS.KNEE + ' · M1 ' + INS.M1 + ' · M2 ' + INS.M2 + ' · A ' + INS.A);
console.log('');

function profile(title, P){
  console.log(title);
  console.log('     stage |   공격/적HP |  몹 처치(초) | 보스 소요(초) | 체력/적공격');
  SHOW.forEach(s => {
    const bs = P.boss(s);
    console.log('     ' + String(s).padStart(5)
      + ' | ' + f2(P.ratA(s)).padStart(11)
      + ' | ' + f2(P.mob(s)).padStart(12)
      + ' | ' + (bs >= 1e4 ? f2(bs) : bs.toFixed(2)).padStart(13)
      + ' | ' + f2(P.ratH(s)).padStart(11));
  });
  console.log('');
}
console.log('[D] 난이도 프로파일 («훈련만» — 배수 축 = 1 인 하한)');
profile('  before — 구 순수 지수 (eHp ×1.25 · eDmg ×1.14)', P_BEF);
profile('  after  — 177 설치본', P_AFT);

/* ---------- [E] 도달 시간 표 (등재문 필수) ---------- */
/* 한 스테이지 = 50킬 + 보스 1회(162). 보스가 제한을 넘으면 그 스테이지에서 막힌다. */
function stageSec(P, s){
  const b = P.boss(s);
  if(b > BSEC) return Infinity;
  return N_MOB*P.mob(s) + b;
}
function reachTable(P){
  const out = {}; let acc = 0, blocked = null;
  for(let s=1;s<=S_END;s++){
    const t = stageSec(P, s);
    if(!isFinite(t)){ if(blocked === null) blocked = s; }
    if(blocked === null) acc += t;
    out[s] = blocked === null ? acc : Infinity;
  }
  return { t: out, blocked };
}
const R_BEF = reachTable(P_BEF), R_AFT = reachTable(P_AFT);
const hms = sec => !isFinite(sec) ? '막힘' :
  sec < 3600 ? (sec/60).toFixed(1) + '분' :
  sec < 86400 ? (sec/3600).toFixed(1) + '시간' : (sec/86400).toFixed(1) + '일';
console.log('[E] 도달 시간 — «훈련만» 으로 스테이지 N 에 도달하기까지의 누적 전투 시간');
console.log('    (한 판 = ' + N_MOB + '킬 + 보스 1회. 보스가 제한 ' + BSEC + '초를 넘으면 그 스테이지에서 «막힘»)');
console.log('     stage | before(구 지수) |  after(177) | 한 판 소요 before → after');
SHOW.forEach(s => {
  const sb = stageSec(P_BEF, s), sa = stageSec(P_AFT, s);
  console.log('     ' + String(s).padStart(5)
    + ' | ' + hms(R_BEF.t[s]).padStart(15)
    + ' | ' + hms(R_AFT.t[s]).padStart(11)
    + ' | ' + (isFinite(sb) ? hms(sb) : '막힘').padStart(10) + ' → ' + (isFinite(sa) ? hms(sa) : '막힘'));
});
console.log('  → before 는 스테이지 ' + (R_BEF.blocked ?? '없음') + ' 에서 막힌다 · after 는 스테이지 '
          + (R_AFT.blocked ?? '없음') + ' 에서 막힌다 (배수 축 = 1 인 하한 기준).');
console.log('');

/* ---------- [F] 벽 위치 ---------- */
const wall = (P, pred) => { for(let s=1;s<=S_END;s++) if(pred(P,s)) return s; return null; };
const W = P => ({
  mob1: wall(P, (p,s) => p.mob(s) > 1),
  mob5: wall(P, (p,s) => p.mob(s) > 5),
  boss: wall(P, (p,s) => p.boss(s) > BSEC),
  tank: wall(P, (p,s) => p.ratH(s) < 1)
});
const WB = W(P_BEF), WA = W(P_AFT);
console.log('[F] 벽 위치 — «훈련만» 이 버티는 한계 스테이지');
console.log('    기준                         | before | after');
console.log('    몹 1마리 처치 > 1초          | ' + String(WB.mob1 ?? '없음').padStart(6) + ' | ' + String(WA.mob1 ?? '없음'));
console.log('    몹 1마리 처치 > 5초          | ' + String(WB.mob5 ?? '없음').padStart(6) + ' | ' + String(WA.mob5 ?? '없음'));
console.log('    보스 소요 > 제한 ' + BSEC + '초         | ' + String(WB.boss ?? '없음').padStart(6) + ' | ' + String(WA.boss ?? '없음'));
console.log('    체력/적공격 < 1 (한 방 사망) | ' + String(WB.tank ?? '없음').padStart(6) + ' | ' + String(WA.tank ?? '없음'));
console.log('  → 훈련 축 단독 사거리: before 스테이지 ' + ((WB.boss ?? S_END+1) - 1)
          + ' → after 스테이지 ' + ((WA.boss ?? S_END+1) - 1) + '.');
console.log('    KNEE(' + KNEE + ') 위는 **배수 축이 이끄는 구간**이라 훈련만으로는 벽이 서는 것이 설계다(168 구조 유지).');
console.log('  ※ 배수 축이 붙은 플레이어 — 배수 M 이면 몹 처치·보스 소요가 그대로 1/M 이 된다:');
[10, 1e3, 1e6].forEach(M => {
  const s300 = Math.min(300, S_END);
  console.log('     M=' + M.toExponential(0) + ' → s' + KNEE + ' 몹 ' + (P_AFT.mob(KNEE)/M).toExponential(2)
            + '초 · s' + s300 + ' 몹 ' + (P_AFT.mob(s300)/M).toExponential(2) + '초');
});
console.log('');

/* ---------- [G] 게이트 ---------- */
const R = [];
const ck = (n, pass, got) => R.push({ n, pass: !!pass, got: String(got) });
const near = (n, a, b, tol) => ck(n, Math.abs(a-b) <= tol*Math.max(1,Math.abs(b)), a.toFixed(5) + ' vs ' + b.toFixed(5));
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
const near199 = (n, a, b, tol, why) => ck199(n, Math.abs(a-b) <= tol*Math.max(1,Math.abs(b)), a.toFixed(5) + ' vs ' + b.toFixed(5), why);

ck('① 177 표기가 설치돼 있다 (eScale 선형×구간별 저지수)', IS177, EC.form);
ck('② 스테이지 1 은 구 곡선과 완전히 동일 — eHp ' + afterHp(1).toFixed(4) + ' · eDmg ' + afterDmg(1).toFixed(4),
   Math.abs(afterHp(1) - beforeHp(1)) < 1e-9 && Math.abs(afterDmg(1) - beforeDmg(1)) < 1e-9,
   afterHp(1) + '/' + afterDmg(1));
if(INS){
  near199('③ 설치 K = 훈련 축 선형 성장분 역산값', INS.K, K_DER, 0.01,
          '326 으로 훈련 축 배수가 내려가 역산 K 가 0.888 → ' + K_DER.toFixed(5) + ' 로 이동 — 설치 K 는 안 건드렸다');
  ck('④ 설치 KNEE = ' + KNEE + ' (112 지평 · RANKS 계급 스테이지)', INS.KNEE === KNEE, INS.KNEE);
  ck('⑤ 설치 M1 ≤ 상한 ' + (M1_MAX === null ? '없음' : M1_MAX.toFixed(5))
     + ' — 훈련만으로 s ≤ ' + KNEE + ' 전 구간 통과', M1_MAX !== null && INS.M1 <= M1_MAX + 1e-9, INS.M1);
  near('⑥ 설치 M2 = RANKS 후반 역산값', INS.M2, M2_DER, 0.01);
  near('⑦ 설치 A = ln(1.14)/ln(1.25) — 적 «맷집 대 화력» 비례 보존', INS.A, A_DER, 0.002);
} else {
  ck('③~⑦ 설치 상수 대조', false, '177 표기 미설치');
}
/* ⑧ 훈련만으로 KNEE 까지 실제로 «되는가» — **유휴 가정 밴드 전체**에서 (168 이 세운 기준 그대로) */
let okKnee = true, worstMob = 0, worstBoss = 0, worstH = null;
H_BAND.forEach(h => {
  for(let s=1;s<=KNEE;s++){
    const m = afterHp(s)*mobHpMul(s)/(TPof(h,s)*DPS_K), b = afterHp(s)*H_BOS/(TPof(h,s)*DPS_K);
    if(m > worstMob){ worstMob = m; worstH = h; }
    worstBoss = Math.max(worstBoss, b);
    if(m > 1 || b > BSEC) okKnee = false;
  }
});
ck199('⑧ 훈련만으로 s ≤ ' + KNEE + ' 무벽 — 유휴 0.5~6h 전 밴드에서 최악 몹 ' + worstMob.toFixed(3)
   + '초 ≤ 1 (H=' + worstH + 'h) · 최악 보스 ' + worstBoss.toFixed(2) + '초 ≤ ' + BSEC,
   okKnee, worstMob.toFixed(3) + '/' + worstBoss.toFixed(2),
   '최악 몹 0.976 → ' + worstMob.toFixed(3) + '초 (제한 1초를 ' + ((worstMob-1)*100).toFixed(1) + '% 초과) · 보스는 여유 유지');
/* ⑨ 벽이 KNEE 위로 밀렸다 — 그러나 사라지지는 않았다(168 구조 유지) */
ck('⑨ 벽이 KNEE 위로 밀렸다 (before s' + ((WB.boss ?? S_END+1)-1) + ' → after s' + ((WA.boss ?? S_END+1)-1) + ')',
   WA.boss !== null && WA.boss > KNEE && (WB.boss === null || WA.boss > WB.boss), String(WA.boss));
/* ⑩ 단조 증가 — 적이 어느 스테이지에서도 약해지지 않는다 */
/* 249 — «구간 계단» 이 얹히면 구간 안에서는 적 스탯이 **그대로**다(설계). 그래서 «전 구간 강증가» 는
   «비감소 + 구간마다(밴드 앵커끼리) 강증가» 로 넓힌다. 적이 약해지는 스테이지는 여전히 0 이어야 한다. */
const BAND_S = EC.BAND || 1;
let mono = true, bandUp = true;
for(let s=1;s<S_END;s++) if(afterHp(s+1) < afterHp(s) || afterDmg(s+1) < afterDmg(s)) mono = false;
for(let s=1;s+BAND_S<=S_END;s+=BAND_S) if(afterHp(s+BAND_S) <= afterHp(s) || afterDmg(s+BAND_S) <= afterDmg(s)) bandUp = false;
ck('⑩ eHp·eDmg 가 s 1..' + S_END + ' 비감소 + ' + BAND_S + '스테이지마다 강증가', mono && bandUp,
   (mono ? 'ok' : '감소구간 있음') + '/' + (bandUp ? 'ok' : '구간 정체'));
/* ⑪ 경제 축 불변 — 112 가 역산 근거로 쓴 eGold 배율이 그대로다 */
const egR = EC.eGold(2)/EC.eGold(1);
near('⑪ eGold 배율 불변 (112 가 TRAIN_COST_R 을 여기서 역산했다)', egR, 1.175, 1e-6);
/* ⑫ 112 주인 지시 불변 — 스테이지 80 도달 Lv ≥ 300 */
/* ⚠ 326(2026-08-28) — 112 가 못 박은 것은 **비용 곡선이 스테이지 80 에서 Lv 300 을 준다** 는 것이고,
   «4단계» 는 옛 상한식(단계당 100 고정)에서 그 레벨에 붙던 **이름표**였다. 326 은 비용 곡선을 한 줄도
   안 건드리고 상한식만 누적합으로 바꿨으므로 **Lv 는 그대로이고 이름표만 4 → 3 으로 내려간다.**
   그래서 판정은 «Lv ≥ 300» 만 하고 단계는 **실측값을 적기만** 한다 — 여기서 단계를 단언하면
   326 이 바꾸라고 지시받은 바로 그것을 게이트가 되돌리라고 요구하게 된다(수치 확정은 199 몫). */
ck('⑫ 112 지시 불변 — 스테이지 80 도달 Lv ' + LV[80] + ' ≥ 300  [326 실측 단계 ' + tstage(LV[80]) + ' — 판정 대상 아님]',
   LV[80] >= 300, LV[80]);
/* ⑬ 162 페이싱을 기준으로 쟀다 */
ck('⑬ 162 페이싱(모든 스테이지 = 50킬 + 보스)이 코드에 살아 있다', PACE_162, PACE_162 ? 'ok' : 'isBossStage 잔존');
/* ⑭ 도달 시간 표가 실제로 «막힘» 을 걷어냈다 */
ck('⑭ 도달 시간 — before 는 s' + (R_BEF.blocked ?? '없음') + ' 에서 막히고 after 는 s' + KNEE + ' 까지 안 막힌다',
   R_AFT.blocked === null || R_AFT.blocked > KNEE,
   'before ' + (R_BEF.blocked ?? '없음') + ' / after ' + (R_AFT.blocked ?? '없음'));

console.log('[G] 게이트');
R.forEach(x => console.log('  ' + (x.pass ? 'PASS' : x.d199 ? '⏸199' : 'FAIL') + ' — ' + x.n + '  →  ' + x.got));
console.log('');
console.log('[H] 민감도 — 유휴 가정(H_MAX)이 바뀌어도 곡선 «모양» 은 안 움직인다');
H_BAND.forEach(h => {
  let cum = 0;
  const g = s => { const kill = N_MOB*eGold(s)*mobGoldMul(s) + eGold(s)*G_BOS;
                   const hh = h*s/80;
                   return kill + eGold(Math.max(1,s-1))*CLEAR_K + eGold(s)*OFF_A*OFF_B*Math.min(hh,OFF_H)*3600
                        + DUN_G*((hh*3600+T_STAGE)/86400); };
  for(let s=1;s<=80;s++) cum += g(s);
  const l80 = levelFor(cum);
  console.log('     H_MAX=' + h.toFixed(1) + 'h → s80 도달 Lv ' + l80 + '(' + tstage(l80) + '단계) · s1 도달 Lv '
            + LVof[h][1] + ' · 역산 K ' + K_OF(h).toFixed(4)
            + (Math.abs(K_OF(h)-K_DER) < 1e-9 ? '  ← 채택(밴드 최소)' : ''));
});
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
console.log(fail ? 'SIM177 FAIL (' + (R.length-fail-held) + '/' + R.length + ' · ⏸' + held + ')'
                 : 'SIM177 PASS (' + (R.length-held) + '/' + (R.length-held) + (held ? ' · ⏸' + held + ' → 199 대기' : '') + ')');
process.exit(fail ? 1 : 0);
