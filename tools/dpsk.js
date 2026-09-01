'use strict';
/* «훈련만» DPS 대용식 리더 (작업 553 신설)
   ─────────────────────────────────────────────────────────────────────────────
   sim131·sim168·sim177·sim249 는 «장비·유물·도감·펫이 하나도 없고 훈련 3종만 올린 플레이어»
   의 DPS 를 대용식 하나로 잡는다. 그 대용식은 **네 파일에 손으로 베껴져** 있었다:

       const DPS_K = ASPD0 * (1 + CRIT0*(CDMG0-1));          // ← 553 이전, 4벌

   ⚑ **이 파일이 생긴 이유가 그 «4벌» 이다.** 위 식에는 **스킬 항이 없다** — 이 게임에는 기본
   공격이 없어서 피해가 전부 «장착 스킬» 에서 나오는데(`stat.dps`), 대용식은 «일반 등급 스킬
   1개» 의 기여를 `1.0` 으로 접어 두고 있었다. 그 접힘은 스킬 표가 안 움직이는 동안만 참이다:

     | 시점 | 일반 등급 스킬 1개의 기본 DPS(`m×hits/cd`) | 실측 `stat.dps` ÷ 대용식 |
     |---|---|---|
     | 484 이전 | slash 1.176 (m 1.00 ÷ cd 0.85) | 0.84 |
     | 484(등급 안 평탄화, `SK_DPS_REF` 1.84) | 1.84 | 1.31 |
     | **504**(발수 모델 통합, `SK_DPS_REF` **6.49**) | 6.49 | **4.64** ← 허용 0.5~2.0 밖 |

   `tools/verify177.js` ⑤ 가 그 4.64 로 빨개진 것이 작업 553 이다. 네 벌을 각자 고치면 다음
   `SK_DPS_REF` 이동에 또 세 벌이 뒤처지므로, **선언을 여기 한 곳으로 모은다**
   (402 «사본을 지운 것이 핵심» · 504 «읽는 문은 하나» 와 같은 처방).

   ── 무엇을 재현하는가 ────────────────────────────────────────────────────────
   `index.html` 의 `stat.dps` 게터가 스킬 1개에 대해 쓰는 식 그대로다:

       d = skillDmg(s) × skillHits(s) ÷ ( s.cd ÷ max(FLOOR, rate/BASE) )   … cd > 0
       dps = d × critMul
       skillDmg(s) = stat.dmg × s.m × gWear(s.g) × lvWear(oLv)

   «일반 등급(g0) · 강화 Lv 0» 이면 `gWear = 1`·`lvWear = 1` 이고, 504 이후 27종 전부
   `m × hits / cd = SK_DPS_REF` 다. 훈련 밖 7종은 Lv 0 고정이므로 `rate = ASPD0` 이다. ⇒

       DPS = stat.dmg × SK_DPS_REF × max(FLOOR, ASPD0/BASE) × (1 + CRIT0×(CDMG0−1))
                        └───────────────── 이 셋이 K ─────────────────┘

   ⚠ **`cd = 0` 지속형에는 이 K 를 쓰면 안 된다.** 실코드가 그 갈래에서는 공속 항을 아예 안
     곱하므로(`d += dmg*hits`) 비가 공속에 반비례한다(`probe553` [4-e]: aura 41.72 → 7.30).
     시뮬의 기준 스킬은 **부팅 스킬 `slash`(cd 0.85)** 라 지금은 정확하다 — 기준을 지속형으로
     옮기려면 이 파일을 먼저 넓혀라.
   ⚠ 이 파일은 **읽기 전용**이다. 판정(게이트)은 하지 않는다 — 각 시뮬이 자기 등식으로 한다.

   반환: { K, SK_REF, ASPD0, CRIT0, CDMG0, RATE_FLOOR, RATE_BASE, CRITMUL, RATE_TERM, desc } */

module.exports = function readDpsK(SRC, tag){
  const T = tag || 'DPSK';
  const die = what => {
    console.error(T + ' FAIL — index.html 에서 «' + what + '» 를 못 찾았다');
    process.exit(1);
  };
  const one = (re, what) => { const m = SRC.match(re); if(!m) die(what); return parseFloat(m[1]); };

  const SK_REF = one(/const SK_DPS_REF\s*=\s*([\d.]+)/, 'SK_DPS_REF (504 — 등급 기준 DPS)');
  /* 703 이관(2026-09-02) — 공속의 «훈련 Lv0 값» 이 **상수 `BASE_RATE`** 로 내려갔다
     (축이 훈련 → 목걸이로 옮겨졌고 바닥값은 그 행의 Lv0 그대로다). 읽는 자리만 옮기고
     쓰는 식은 한 줄도 안 바꿨다 — 이 자는 여전히 «성장 밖 상태의 공속» 을 소스에서 읽는다. */
  const ASPD0  = one(/const BASE_RATE\s*=\s*([\d.]+)/, '공속 바닥 상수 BASE_RATE');
  const CRIT0  = one(/\{ id:'crit'[\s\S]{0,300}?val:l => Math\.min\(([\d.]+)/, 'crit Lv0');
  const CDMG0  = one(/\{ id:'cdmg'[\s\S]{0,300}?val:l => ([\d.]+)\s*\+/,       'cdmg Lv0');

  /* 공속 항의 바닥(0.35)과 기준 공속(1.4)도 **소스에서** 읽는다 — 상수를 여기 또 적으면
     그 순간 이 파일이 5번째 사본이 된다. */
  const rt = SRC.match(/dmg\*hits\/\(s\.cd\/Math\.max\(([\d.]+),\s*this\.rate\/(BASE_RATE|[\d.]+)\)\)/);
  if(!rt) die('stat.dps 의 공속 항 (s.cd / Math.max(FLOOR, this.rate/BASE))');
  const RATE_FLOOR = parseFloat(rt[1]), RATE_BASE = rt[2] === 'BASE_RATE' ? ASPD0 : parseFloat(rt[2]);

  /* 일반 등급의 착용 계단이 1 이라는 전제 — 아니면 «g0 = 배수 1» 이 깨져 K 가 통째로 틀어진다. */
  const g0wear = one(/\{ n:'일반',[^}]*?wear:\s*([\d.]+)/, "GRADE[0].wear (일반 등급 착용 계단)");
  if(g0wear !== 1) die("GRADE[0].wear 가 1 이 아니다(" + g0wear + ") — 대용식의 «일반 = 배수 1» 전제가 깨졌다");

  const CRITMUL   = 1 + CRIT0*(CDMG0 - 1);
  const RATE_TERM = Math.max(RATE_FLOOR, ASPD0/RATE_BASE);
  const K = SK_REF * RATE_TERM * CRITMUL;

  return {
    K, SK_REF, ASPD0, CRIT0, CDMG0, RATE_FLOOR, RATE_BASE, CRITMUL, RATE_TERM,
    /* ⚠ desc 에 «DPS 계수» 라는 말을 넣지 마라 — `verify177` ⑤ 가 시뮬 출력에서 그 토큰으로
       **시뮬이 실제로 쓴 DPS_K** 를 읽는다. 여기서 K 를 그 이름으로 찍으면 시뮬이 딴 값을 써도
       게이트가 못 본다(553 되돌림 시험이 그 함정을 한 번 밟았다). 그 줄은 각 시뮬이 찍는다. */
    desc: '훈련 밖 7종 Lv 0 — 공속 ' + ASPD0 + '/s · 치명 ' + CRIT0 + '·×' + CDMG0
        + ' → 치명배수 ' + CRITMUL.toFixed(4)
        + ' · 일반 등급 스킬 1개 기본 DPS(SK_DPS_REF) ' + SK_REF
        + ' × 공속항 ' + RATE_TERM.toFixed(4)
  };
};
