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
    /* ⚑ 199 32회차 — 밴드가 **사다리**가 됐다(31-5 결6): 초기 ES_BAND · 문턱(= 초기 폭의 관문
       번호 ES_BANDG) 위는 ES_BAND2. 둘이 없으면 종전 «상수 한 벌» 그대로다(되돌림도 이 분기다).
       ⚠ 사다리 위에서는 «관문 = 한 숫자의 배수» 가 아니다 — 관문은 **구간의 첫 칸**이고,
       그것이 제품 `isGateStage` 의 뜻이다. 아래 `isGate` 가 그 정의 그대로다. */
    const BAND2 = one(/const ES_BAND2\s*=\s*(\d+)/);
    const BANDG = one(/const ES_BANDG\s*=\s*(\d+)/);
    /* ⚑ 199 40회차 — 사다리가 **두 단**이 될 수 있다: 40 → `ES_BAND3`(전이 한 구간) → `ES_BAND2`.
       전이 폭이 0/없으면 SW2 === SW 라 분기가 통째로 접히고 종전 한 단과 **비트 동일**이다
       (되돌림 한 줄 = `ES_BAND3 = 0`). 문턱은 전이가 있으면 관문 한 칸 앞이다 —
       제품 `eBandSw = ES_BAND * (ES_BANDG - (ES_BAND3 ? 1 : 0))` 과 같은 식을 여기서도 쓴다. */
    const BAND3 = one(/const ES_BAND3\s*=\s*(\d+)/);
    const SW    = (BAND && BAND2 && BANDG) ? BAND * (BANDG - (BAND3 ? 1 : 0)) : null;  /* 사다리 문턱 스테이지 */
    const SW2   = SW ? SW + (BAND3 || 0) : null;                    /* 말미 구간(폭 BAND2) 시작 */
    const bandW = a => !SW ? BAND : (a < SW ? BAND : (a < SW2 ? BAND3 : BAND2));       /* 그 구간의 폭 */
    const band  = !BAND ? (s => s)
                : SW ? (s => s < SW  ? Math.max(1, BAND*Math.floor(s/BAND))
                            : s < SW2 ? SW
                                      : SW2 + BAND2*Math.floor((s - SW2)/BAND2))
                     : (s => Math.max(1, BAND*Math.floor(s/BAND)));
    const eSmooth = a => (1 + K*(a-1))
                      * Math.pow(M1, Math.min(a, KNEE) - 1)
                      * Math.pow(M2, Math.max(0, a - KNEE));
    /* 199 4회차 — 밴드 내 «상승면»(ES_RAMP). 구간 안이 완전 평지면 벽을 깬 순간 40칸이
       기계 시간(13분)으로 즉시 무너진다 — 돌파 국면이 없다(199 3회차 비평 ③ 전원 3점).
       eScale(s) = eSmooth(a) × (eSmooth(a+BAND)/eSmooth(a))^(RAMP·(s−a)/BAND), a = eBand(s).
       앵커(관문 스테이지)는 정확히 eSmooth(a) 그대로이고, RAMP = 0 이면 종전 계단과 동일하다. */
    const RAMP = one(/const ES_RAMP\s*=\s*([\d.]+)/) || 0;
    const eScale = (BAND && RAMP)
      ? (s => { const a = band(s), w = bandW(a); return eSmooth(a) * Math.pow(eSmooth(a + w) / eSmooth(a), RAMP * (s - a) / w); })
      : (s => eSmooth(band(s)));
    const gateN  = BAND ? (GATE_N || BAND) : null;
    /* 관문 = 구간의 첫 칸. 사다리가 없으면 «gateN 의 배수» 와 완전히 같은 집합이다
       (band(s) === s ⟺ s % BAND === 0, s ≥ BAND) — 그래서 이 한 정의로 두 세대를 다 센다. */
    const isGate = s => BAND ? (s >= BAND && band(s) === s) : false;
    return {
      form: BAND ? '249' : '177', K, KNEE, M1, M2, A, HB, DB, EG_B, EG_R,
      BAND, BAND2, BAND3, BANDG, SW, SW2, RAMP, GATE_N: gateN, GATE_HP, eSmooth, eBand: band, eBandW: bandW, eScale, isGate,
      eHp:  s => HB * eScale(s),
      eDmg: s => DB * Math.pow(eScale(s), A),
      /* 스테이지 보스의 실체력 배수 — 249 관문 스테이지에서만 1 이 아니다 */
      bossGateHp: s => (BAND && GATE_HP && isGate(s)) ? GATE_HP : 1,
      eGold,
      desc: 'eHp ' + HB + '×eScale(s) · eDmg ' + DB + '×eScale(s)^' + A
          + ' · eSmooth = (1+' + K + '(a-1))×' + M1 + '^min(a,' + KNEE + ')-1×' + M2 + '^max(0,a-' + KNEE + ')'
          + (BAND ? ' · a = eBand(s) = max(1,' + BAND + '×floor(s/' + BAND + ')) [249 구간 계단]'
                  + (SW ? ' · **사다리** s≥' + SW + '(= ' + BAND + '×관문 ' + (BANDG - (BAND3 ? 1 : 0)) + ')부터 폭 '
                          + (BAND3 ? BAND3 + ' → s≥' + SW2 + ' 부터 ' + BAND2 + ' [199 32·40회차 두 단]'
                                   : BAND2 + ' [199 32회차]') : '')
                  + (RAMP ? ' · 밴드 내 상승면 ^(RAMP ' + RAMP + '·(s−a)/폭) [199 4회차]' : '')
                  + ' · 관문 보스 ×' + GATE_HP + (SW ? ' (관문 = 구간 첫 칸)' : ' (s%' + gateN + '===0)')
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
