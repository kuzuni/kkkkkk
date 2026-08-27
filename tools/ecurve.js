'use strict';
/* 적 곡선 «표기 독립» 리더 (작업 177 신설)
   ─────────────────────────────────────────────────────────────────────────────
   LESSONS 168-③ — «남의 시뮬이 내 상수를 정규식으로 읽고 있으면, 표기를 바꾸는 순간
   그 시뮬이 먼저 죽는다». 177 은 `eHp`/`eDmg` 의 **표기**를 바꾸므로
   (`55 * Math.pow(1.25, s-1)` → `55 * eScale(s)`), 그 표기를 정규식으로 읽던
   `sim112.js` · `sim168.js` 가 즉사한다. 168 이 sim112 를 «세 벌 표기» 로 넓혔던 것과
   같은 처방을 여기서는 **한 군데로 모아** 둔다 — 다음에 곡선을 또 갈아 끼우는 사람은
   이 파일 하나만 넓히면 된다.

   반환: { form, eHp, eDmg, eGold, desc }
     form  '177'(선형×구간별 저지수) | 'exp'(구 순수 지수)
     desc  [A] 절에 그대로 찍을 한 줄 설명

   ⚠ 이 파일은 **읽기 전용**이다. 판정(게이트)은 하지 않는다 — 각 시뮬이 자기 등식으로 한다. */

module.exports = function readECurve(SRC, tag){
  const T = tag || 'ECURVE';
  const one = (re) => { const m = SRC.match(re); return m ? parseFloat(m[1]) : null; };
  const die = (what) => { console.error(T + ' FAIL — index.html 에서 «' + what + '» 를 못 찾았다'); process.exit(1); };

  /* eGold 는 177 이 안 건드린 축이라 표기가 하나다(112 경제 축) */
  const EG_B = one(/const eGold\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/);
  const EG_R = one(/const eGold\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/);
  if(EG_B === null || EG_R === null) die('eGold 계수·배율');
  const eGold = s => EG_B * Math.pow(EG_R, s-1);

  /* ── 표기 ①: 177 «선형 × 구간별 저지수» (+ 249 «구간 계단» 이 얹히면 form '249') ── */
  const K = one(/const ES_K\s*=\s*([\d.]+)/);
  if(K !== null){
    const KNEE = one(/const ES_KNEE\s*=\s*(\d+)/);
    const M1   = one(/const ES_M1\s*=\s*([\d.]+)/);
    const M2   = one(/const ES_M2\s*=\s*([\d.]+)/);
    const A    = one(/const ES_A\s*=\s*([\d.]+)/);
    const HB   = one(/const eHp\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*eScale\(/);
    const DB   = one(/const eDmg\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(eScale\(/);
    if([KNEE,M1,M2,A,HB,DB].some(v => v === null)) die('177 적 곡선 상수(ES_KNEE·ES_M1·ES_M2·ES_A·eHp·eDmg 기저)');
    /* 249 — 구간 계단. `ES_BAND` 가 있으면 eScale 은 «구간 첫 스테이지(=벽)의 값» 을 구간 내내 든다.
       없으면(177 만 설치) 밴드 1 = 스테이지마다 오르는 매끈한 곡선 그대로다. */
    const BAND = one(/const ES_BAND\s*=\s*(\d+)/);
    const GATE_N  = one(/const BOSS_GATE_N\s*=\s*(?:ES_BAND|(\d+))/);
    const GATE_HP = one(/const BOSS_GATE_HP\s*=\s*([\d.]+)/);
    const band = BAND ? (s => Math.max(1, BAND*Math.floor(s/BAND))) : (s => s);
    const eSmooth = a => (1 + K*(a-1))
                      * Math.pow(M1, Math.min(a, KNEE) - 1)
                      * Math.pow(M2, Math.max(0, a - KNEE));
    const eScale = s => eSmooth(band(s));
    const gateN  = BAND ? (GATE_N || BAND) : null;
    return {
      form: BAND ? '249' : '177', K, KNEE, M1, M2, A, HB, DB, EG_B, EG_R,
      BAND, GATE_N: gateN, GATE_HP, eSmooth, eBand: band, eScale,
      eHp:  s => HB * eScale(s),
      eDmg: s => DB * Math.pow(eScale(s), A),
      /* 스테이지 보스의 실체력 배수 — 249 관문 스테이지에서만 1 이 아니다 */
      bossGateHp: s => (BAND && GATE_HP && gateN && s % gateN === 0) ? GATE_HP : 1,
      eGold,
      desc: 'eHp ' + HB + '×eScale(s) · eDmg ' + DB + '×eScale(s)^' + A
          + ' · eSmooth = (1+' + K + '(a-1))×' + M1 + '^min(a,' + KNEE + ')-1×' + M2 + '^max(0,a-' + KNEE + ')'
          + (BAND ? ' · a = eBand(s) = max(1,' + BAND + '×floor(s/' + BAND + ')) [249 구간 계단]'
                  + ' · 관문 보스 ×' + GATE_HP + ' (s%' + gateN + '===0)'
                  : ' · a = s [177 매끈]')
          + ' · eGold ' + EG_B + '×' + EG_R + '^(s-1)'
    };
  }

  /* ── 표기 ②: 구 «순수 지수» (177 이전) ── */
  const EH_B = one(/const eHp\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/);
  const EH_R = one(/const eHp\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/);
  const ED_B = one(/const eDmg\s*=\s*s\s*=>\s*([\d.]+)\s*\*\s*Math\.pow\(/);
  const ED_R = one(/const eDmg\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(([\d.]+),/);
  if([EH_B,EH_R,ED_B,ED_R].some(v => v === null)) die('eHp/eDmg 계수·배율(구 지수 표기)');
  return {
    form: 'exp', EH_B, EH_R, ED_B, ED_R, EG_B, EG_R,
    eScale: s => Math.pow(EH_R, s-1),
    eHp:  s => EH_B * Math.pow(EH_R, s-1),
    eDmg: s => ED_B * Math.pow(ED_R, s-1),
    eGold,
    desc: 'eHp ' + EH_B + '×' + EH_R + '^(s-1) · eDmg ' + ED_B + '×' + ED_R + '^(s-1)'
        + ' · eGold ' + EG_B + '×' + EG_R + '^(s-1)'
  };
};
