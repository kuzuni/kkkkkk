#!/usr/bin/env node
/* 249 검증 — 스테이지 클리어 체감 «톱니» 가 **실제 게임에서** 동작한다
 *   (저장소 주인 지시 2026-08-27 · 지시서 «기능 완성 규칙»: 만들어 놓은 것이 아니라
 *    실제 게임 데이터로 동작하고 결과가 화면·판정에 반영돼야 완료다)
 *
 *   node tools/verify249.js
 *
 * 검사 항목 — 전부 **살아 있는 페이지**에서 잰다(정규식 대조는 [A] 한 절뿐이다).
 *   [A] 배선   — ES_BAND·eBand·eSmooth·eScale·BOSS_GATE_* 정의 각 1곳 · makeEnemy 의 관문 분기
 *   [B] 곡선   — 살아 있는 eHp/eDmg 가 «구간 계단 × 램프» 와 정확히 일치(1e-12) · 구간 안은 정확히 램프 비율로 오르고 앵커에서 점프
 *   [C] 개체   — 실제 스폰된 **몹**이 구간 안에서 램프 비율 그대로이고 관문에서 뛴다(표시가 아니라 개체)
 *   [D] 관문   — 관문 스테이지의 **스테이지 보스**만 체력 ×BOSS_GATE_HP · 비관문은 ×1 · 공격력은 불변
 *   [E] 파급   — 던전 보스(178)·승급 수호자(208)·아레나(123)는 관문 배수를 **안** 탄다
 *   [F] 실동작 — 관문 스테이지에서 보스를 실제로 격파하면 S.stage/S.best 가 오르고 다음 구간이 선다
 *   [G] 화면   — 재화 정보 팝업의 «현재 스테이지 적 체력» 이 새 곡선 값을 그대로 보여 준다
 *   [H] 음성   — ES_BAND=1 사본(=249 이전)에서는 구간 계단이 사라진다 ([B][C] 가 진짜로 계단을 본다는 증명)
 *   [I] 콘솔 에러 0
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRCF = path.resolve(__dirname, '..', 'index.html');
const NEG  = path.resolve(__dirname, '..', `.neg249-${process.pid}.html`);
const URL  = 'file://' + SRCF.replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (name, got, want, tol) =>
  ok(Math.abs(got - want) <= Math.abs(want)*tol + 1e-12, name,
     Number(got).toExponential(6) + ' vs ' + Number(want).toExponential(6));

/* 게이트 자기 상수 — 화면 식을 그대로 다시 부르는 «항등식» 을 피한다(LESSONS 212-①).
   설치본과 어긋나면 [A] 에서 먼저 빨개진다. */
/* 285 — 보스 체력 배수와 공격력 배수가 갈렸다(BOSS_MUL 하나로 둘 다 재던 자리). 보스전 제한 시간이
   30 → 15초로 반이 되면서 **체력만** ×22 → ×11 로 같이 내렸다 — 시간만 줄이면 «훈련만» 설계
   플레이어가 평범한 보스조차 못 잡는다(sim249 [C] 상한이 «없음» 으로 떨어진다). 공격력은 그대로다.
   ⚑ GATE_HP 1.44 는 **안 바뀐다**: 시간과 체력이 같은 비율로 줄어 역산 상한(1.4469)이 불변이다. */
/* ⚑ 199 1회차 이관(2026-08-31) — **M1 1.010 → 1.020.** 249 는 «ES_* 다섯 상수를 한 글자도
   안 건드린다» 를 자기 범위 제한으로 적어 두고 [A] 로 그것을 지켰는데, 199 의 손잡이 ①(적 체력
   지수)은 주인이 199 행에 명시로 열어 둔 축이다. 그래서 항을 **지우지 않고 방향만 바꿔** 갈아
   끼운다(333 처방) — ES_M1 은 «불변» 이 아니라 «199 가 정한 값과 같은가» 를 묻고, 나머지 넷은
   그대로 «불변(177)» 이다. 값의 근거는 sim177 ⑤(상한 1.03063)와 sim249 ⑨(톱니 진폭, 실측
   상한 ~1.024) 두 자를 **동시에** 통과하는 최대값이라는 것이다. */
/* ⚑ 199 3회차 이관(2026-08-31) — **BAND·GATE_N 10 → 40.** 10 은 «구 isBossStage 의 벽 주기» 에서
   온 값이었는데, 봇 실측(199 2회차)에서 30일 벽 32칸 = 주인 목표(간격 ×1.4 · 30일에 ~8칸)의
   4배였다. 주기는 199 행이 연 손잡이 ①(구간 점프)이라 M1 과 같은 꼴로 항을 지우지 않고 방향만
   바꾼다(333 처방) — BAND 는 «불변(162 잔재)» 이 아니라 «199 가 벽 개수에서 정한 값과 같은가»
   를 묻는다. 스윕 근거는 199 review §3(sim177 ⑧ 불변 · 진폭 1.98 → 2.42 · 관문 상한 3.2035). */
/* ⚑ 199 5회차 이관(2026-08-31) — **BAND·GATE_N 40 → 80.** 3회차가 이 항을 «벽 개수» 축으로
   돌려놓았고, 5회차가 같은 상수의 **둘째 뜻**을 실측으로 찾았다 — 벽당 실오르막(순 이동) ≈
   밴드 칸수 × 판당 최소 소요라, 주기가 곧 «오르막의 길이» 다(봇 4시드 30일: 40 → 21분 ·
   80 → 41분 · 120 → 53분). 80 에서 부지런 30일 벽이 12 → 8칸 = 주인 목표 그 값이다.
   방향은 3회차와 같다(«199 가 정한 값과 같은가») — 바뀐 것은 값과 표본 자리뿐이고, 표본은
   리터럴이 아니라 **C.BAND 에서 파생**시켜 다음 회차가 주기를 다시 돌려도 표본이 따라오게 했다.
   스윕 근거는 199 review §5-2. */
/* ⚑ 199 4회차 이관(2026-08-31) — **ES_RAMP 0.2 신설(밴드 내 상승면).** 구간 안이 완전 평지면
   벽을 깬 순간 40칸이 기계 시간 13분으로 무너져 «연속 돌파» 국면이 없다(3회차 비평 ③ 전원 3점).
   구간 몫 성장(R = eSmooth(a+40)/eSmooth(a))의 RAMP 비율을 구간 안 비탈로 깐다 —
   eScale(s) = eSmooth(a)·R^(RAMP·(s−a)/40). 앵커(관문 스테이지)는 정확히 eSmooth(a) 그대로라
   [D] 관문·[F] 실동작·sim249 ⑭ 는 값이 안 변하고, [B][C] 의 «구간 안 동일» 만 «구간 안 = 정확히
   램프 비율» 로 방향을 바꾼다(333 처방 — M1·BAND 와 같은 꼴). 스윕 근거는 199 review §4
   (γ 0→0.35 × GATE 스윕 · 상승면 0.36% → 9.33% · 벽 12 불변 · GATE↑ 기각). */
/* ⚑ 199 6회차 이관(2026-08-31) — **BAND·GATE_N 80 → 40 원복.** 5회차의 80 은 벽 «개수» 를
   목표에 맞췄지만 3인 전원이 ① 을 3·3·4 로 막았다: 이 상수는 경계 점프 R^(1−RAMP·(B−1)/B)
   (B 80 → ×2,155 · B 40 → ×47)를 통째로 정하고, ×2,155 이빨 하나(s640)가 30일의 29.5% 를
   먹어 «9일 칸» 을 삼켰다. 40 에서 ① 목표 칸 적중 3 → 6/8 · 첫 벽 754 → 525분 ·
   간격 기하평균 1.69 → 1.47. 항은 여기서도 안 지운다 — 값만 199 확정값을 따라간다
   (3·5회차 선례 · 표본은 아래에서 C.BAND 파생이라 자동으로 따라온다). 근거 review §6-1·§6-2. */
/* ⚑ 199 32회차 이관(2026-09-04) — **주기가 상수에서 «사다리» 로**(31-5 결6 마감). 31회차의 벽
   간격 항등식(`t_이탈/t_벽 = 장벽^(1/α)`)이 «한 상수로는 못 맞춘다» 를 구조로 보였다 — α 가
   초기 6.90 ↔ 말미 2.21 로 3.1배 꺾이므로 사다리가 요구하는 밴드 폭이 46.5 ↔ 14.9~15.5 다.
   ⇒ 초기 40 그대로 · 문턱(초기 폭의 관문 번호 `ES_BANDG`) 위는 `ES_BAND2` 16.
   항은 여기서도 안 지우고 **방향만 넓힌다**(M1·BAND·RAMP 와 같은 꼴 · 333 처방) —
   «ES_BAND 설치값» 은 이제 «**초기** 폭이 199 가 정한 값인가» 이고, 사다리의 두 상수와
   «관문 = 구간 첫 칸» 이 새 항으로 붙는다. 되돌림 시험은 [J] 가 실제로 굽는다. */
const C = { K:0.888, KNEE:80, M1:1.020, M2:1.127, A:0.5872, HB:55, DB:6,
            BAND:40, BAND2:16, BANDG:9, GATE_N:40, GATE_HP:1.44, BOSS_HP:11, BOSS_DMG:22, RAMP:0.2 };
C.SW = C.BAND * C.BANDG;                                      /* 사다리 문턱 스테이지 = 360 */
const smooth = a => (1 + C.K*(a-1)) * Math.pow(C.M1, Math.min(a, C.KNEE)-1) * Math.pow(C.M2, Math.max(0, a-C.KNEE));
const eband  = s => s < C.SW ? Math.max(1, C.BAND*Math.floor(s/C.BAND))
                             : C.SW + C.BAND2*Math.floor((s - C.SW)/C.BAND2);
const ebandW = a => a < C.SW ? C.BAND : C.BAND2;
const wScale = s => { const a = eband(s), w = ebandW(a);
  return smooth(a) * Math.pow(smooth(a + w) / smooth(a), C.RAMP * (s - a) / w); };
const wHp    = s => C.HB * wScale(s);
const wDmg   = s => C.DB * Math.pow(wScale(s), C.A);
/* 관문 = 구간의 첫 칸. 사다리 아래에서는 «GATE_N 의 배수» 와 같은 집합이다(옛 뜻 보존). */
const wGate  = s => (s >= C.BAND && eband(s) === s ? C.GATE_HP : 1);

/* 곡선을 볼 스테이지 — 구간 안(같아야 함) · 관문(올라야 함) · 무릎 앞뒤 */
/* 199 5회차 — 표본을 리터럴이 아니라 C.BAND 에서 파생시킨다(주기를 또 돌려도 자가 따라온다).
   경계 표본은 «관문 직전 칸»(BAND−1) 이고, 관문 표본은 GATE_N 의 배수 넷이다. */
const B1      = C.BAND - 1;                                   /* 첫 구간의 마지막 칸(경계 검사) */
const IN_BAND = [11, 13, 17, B1];   /* 전부 첫 구간(1..B1) 안 · B1 은 경계 검사용 */
/* 199 32회차 — 관문 표본에 **사다리 위의 관문 둘**을 더한다. 376 은 40 의 배수가 아니므로
   이 두 칸은 «관문 = 구간 첫 칸» 이라는 새 정의로만 관문이다(옛 정의로는 비관문 = 음성 표본). */
const GATES   = [1,2,3,4].map(k => k * C.GATE_N).concat([C.SW, C.SW + C.BAND2]);
/* ⚠ 표본은 **줄이지 않는다** — 파생만 하면 39/40 이 79/80 에 흡수돼 항이 4개 줄었다(103 → 99).
   옛 자리(주기 40 시절의 경계)도 그대로 두고 새 경계를 **더한다**: 옛 주기의 경계는 이제
   «구간 한복판» 이라 램프식이 거기서도 맞는지를 묻는 새 뜻을 얻는다. */
/* 199 32회차 — 사다리가 생겼으므로 **문턱 앞뒤와 좁은 구간 안**을 표본에 더한다(줄이지 않는다).
   문턱 직전 칸(SW−1)은 아직 넓은 폭의 램프 위이고, SW·SW+BAND2 는 새 앵커, 그 사이는 좁은 램프다. */
const LATE_S  = [C.SW - 1, C.SW, C.SW + 1, C.SW + C.BAND2 - 1, C.SW + C.BAND2, C.SW + 2 * C.BAND2];
const CURVE_S = Array.from(new Set([1, 2, 5, 9, 10, 11, 19, 20, 39, 40, 79, 80, 81, 89, 90, 120, 200,
                                    B1, C.BAND, C.BAND + 1, C.KNEE - 1, C.KNEE, C.KNEE + 1, 3 * C.BAND]
                                   .concat(LATE_S)))
                     .sort((a, b) => a - b);

(async () => {
  const src = fs.readFileSync(SRCF, 'utf8');

  /* ── [A] 배선 ─────────────────────────────────────────────── */
  const cnt = re => (src.match(re) || []).length;
  ok(cnt(/const ES_BAND\s*=/g) === 1,      '[A] ES_BAND 정의 1곳', cnt(/const ES_BAND\s*=/g));
  ok(cnt(/const eBand\s*=/g) === 1,        '[A] eBand 정의 1곳',   cnt(/const eBand\s*=/g));
  ok(cnt(/const eSmooth\s*=/g) === 1,      '[A] eSmooth 정의 1곳', cnt(/const eSmooth\s*=/g));
  ok(cnt(/const eScale = /g) === 1,        '[A] eScale 정의 1곳',  cnt(/const eScale = /g));
  ok(cnt(/const BOSS_GATE_HP\s*=/g) === 1, '[A] BOSS_GATE_HP 정의 1곳', cnt(/const BOSS_GATE_HP\s*=/g));
  ok(parseFloat((src.match(/const ES_BAND\s*=\s*(\d+)/) || [])[1]) === C.BAND,
     '[A] ES_BAND 설치값 = ' + C.BAND + ' (사다리의 **초기** 폭)', (src.match(/const ES_BAND\s*=\s*(\d+)/) || [])[1]);
  /* ── 199 32회차 신설 — 사다리 배선 ─────────────────────────── */
  ok(cnt(/const ES_BAND2\s*=/g) === 1,  '[A] ES_BAND2 정의 1곳',  cnt(/const ES_BAND2\s*=/g));
  ok(cnt(/const ES_BANDG\s*=/g) === 1,  '[A] ES_BANDG 정의 1곳',  cnt(/const ES_BANDG\s*=/g));
  ok(parseFloat((src.match(/const ES_BAND2\s*=\s*(\d+)/) || [])[1]) === C.BAND2,
     '[A] ES_BAND2 설치값 = ' + C.BAND2 + ' (말미 폭 — α 2.21 이 요구하는 14.9~15.5)',
     (src.match(/const ES_BAND2\s*=\s*(\d+)/) || [])[1]);
  ok(parseFloat((src.match(/const ES_BANDG\s*=\s*(\d+)/) || [])[1]) === C.BANDG,
     '[A] ES_BANDG 설치값 = ' + C.BANDG + ' (문턱을 **관문 번호**로 적었다 — 스테이지 리터럴 금지)',
     (src.match(/const ES_BANDG\s*=\s*(\d+)/) || [])[1]);
  ok(/const eBandSw\s*=\s*ES_BAND \* ES_BANDG;/.test(src),
     '[A] 문턱 스테이지 = ES_BAND × ES_BANDG — 손으로 적은 스테이지 상수가 아니다');
  ok(/const eBandW\s*=\s*a\s*=>\s*a < eBandSw \? ES_BAND : ES_BAND2;/.test(src),
     '[A] eBandW — 구간의 폭을 앵커에게 묻는다(사다리)');
  ok(/const eBand\s*=\s*s\s*=>\s*s < eBandSw \? Math\.max\(1, ES_BAND \* Math\.floor\(s \/ ES_BAND\)\)\s*\n\s*: eBandSw \+ ES_BAND2 \* Math\.floor\(\(s - eBandSw\) \/ ES_BAND2\);/.test(src),
     '[A] eBand — 문턱 아래는 옛 격자 그대로 · 위는 문턱에서 다시 세는 좁은 격자');
  /* ⚑ 사다리 위에서는 «관문 = 한 숫자의 배수» 가 거짓이다(376 은 40 의 배수가 아니다).
     구 `BOSS_GATE_N` 은 그 거짓을 조용히 들고 있을 사본이라 32회차가 지웠다 — 되살아나면 빨갛다. */
  ok(cnt(/const BOSS_GATE_N\s*=/g) === 0,
     '[A] 구 BOSS_GATE_N(= «관문은 한 숫자의 배수») 사본 0건 — 사다리 위에서 거짓이 되는 자리다',
     cnt(/const BOSS_GATE_N\s*=/g));
  ok(/const isGateStage\s*=\s*s => s >= ES_BAND && eBand\(s\) === s;/.test(src),
     '[A] isGateStage = «구간의 첫 칸» — 관문 판정의 단일 창구');
  ok(parseFloat((src.match(/const BOSS_GATE_HP\s*=\s*([\d.]+)/) || [])[1]) === C.GATE_HP,
     '[A] BOSS_GATE_HP 설치값 = ' + C.GATE_HP, (src.match(/const BOSS_GATE_HP\s*=\s*([\d.]+)/) || [])[1]);
  ok(/const eScale = s => \{ const a = eBand\(s\), w = eBandW\(a\);\s*\n\s*return eSmooth\(a\) \* Math\.pow\(eSmooth\(a \+ w\) \/ eSmooth\(a\), ES_RAMP \* \(s - a\) \/ w\); \};/.test(src),
     '[A] eScale = eSmooth(eBand(s)) × 램프(ES_RAMP) — 폭은 그 구간의 것(199 32회차 사다리 표기)');
  ok(cnt(/const ES_RAMP\s*=/g) === 1,      '[A] ES_RAMP 정의 1곳', cnt(/const ES_RAMP\s*=/g));
  ok(parseFloat((src.match(/const ES_RAMP\s*=\s*([\d.]+)/) || [])[1]) === C.RAMP,
     '[A] ES_RAMP 설치값 = ' + C.RAMP + ' (199 4회차 스윕 확정)', (src.match(/const ES_RAMP\s*=\s*([\d.]+)/) || [])[1]);
  ok(/const hp = eHp\(s\) \* T2\.hp \* \(tk === 'boss' \? bossGateHp\(s\) : 1\);/.test(src),
     '[A] makeEnemy 가 스테이지 보스에만 관문 배수를 건다');
  /* 177 이 푼 다섯 상수는 249 가 한 글자도 안 건드린다 */
  const M1_LBL = { ES_M1: ' = 199 1회차 확정값(sim177 ⑤ · sim249 ⑨ 동시 상한)' };
  [['ES_K',C.K],['ES_KNEE',C.KNEE],['ES_M1',C.M1],['ES_M2',C.M2],['ES_A',C.A]].forEach(([k,v]) =>
    ok(parseFloat((src.match(new RegExp('const ' + k + '\\s*=\\s*([\\d.]+)')) || [])[1]) === v,
       '[A] ' + k + (M1_LBL[k] || ' 불변(177)'), v));
  ok(/const eGold\s*=\s*s\s*=>\s*4\s*\*\s*Math\.pow\(1\.175,\s*s-1\)/.test(src), '[A] eGold(경제 축) 불변(112)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof eHp === 'function' && typeof makeEnemy === 'function');
  await page.waitForTimeout(700);

  /* ── [B] 곡선 ─────────────────────────────────────────────── */
  const live = await page.evaluate(ss => ss.map(s => ({ s, hp: eHp(s), dmg: eDmg(s), band: eBand(s) })), CURVE_S);
  live.forEach(r => {
    near('[B] eHp(' + r.s + ') = 55·eSmooth(eBand)', r.hp, wHp(r.s), 1e-12);
    near('[B] eDmg(' + r.s + ') = 6·eSmooth(eBand)^A', r.dmg, wDmg(r.s), 1e-12);
  });
  /* 199 4회차 — «구간 안 동일» 을 «구간 안 = 정확히 램프 비율» 로 갈아 끼운다(333 처방).
     구간 안 이웃 칸의 비가 R^(RAMP/BAND) 와 1e-9 로 같아야 한다 — 평지(비 1)도, 임의 기울기도 빨갛다. */
  /* 199 32회차 — 사다리를 게이트 쪽에서 **독립으로 다시 계산**해 스윕한다(항등식 회피 · 212-①).
     범위도 문턱 위 두 구간까지 넓혔다 — 안 넓히면 좁은 폭은 한 칸도 안 밟힌다. */
  const SWEEP_END = C.SW + 3 * C.BAND2;
  const bandFlat = await page.evaluate(([B, B2, SW, RAMP, END]) => {
    const bandOf = s => s < SW ? Math.max(1, B*Math.floor(s/B)) : SW + B2*Math.floor((s - SW)/B2);
    const wOf    = a => a < SW ? B : B2;
    let ramp = true, up = true, drop = false, narrow = 0;
    for(let s=1;s<END;s++){
      const a = bandOf(s), a2 = bandOf(s+1), w = wOf(a);
      if(w === B2) narrow++;                                             /* 좁은 폭 구간을 실제로 밟았는가 */
      if(a === a2){
        const want = Math.pow(eSmooth(a + w) / eSmooth(a), RAMP / w);
        if(Math.abs(eHp(s+1)/eHp(s) - want) > 1e-9) ramp = false;        /* 같은 구간이면 정확히 램프 비율 */
      }
      if(a !== a2 && !(eHp(s+1) > eHp(s)*1.0001)) up = false;            /* 구간이 바뀌면 뛰어야 한다 */
      if(eHp(s+1) < eHp(s) - 1e-9 || eDmg(s+1) < eDmg(s) - 1e-9) drop = true;
    }
    return { ramp, up, drop, narrow };
  }, [C.BAND, C.BAND2, C.SW, C.RAMP, SWEEP_END]);
  ok(bandFlat.ramp, '[B] 구간 안 이웃 칸 비 = R^(RAMP/폭) — 정확히 램프 비율로만 오른다 (s 1..' + SWEEP_END + ' · 두 폭 다)');
  ok(bandFlat.up,   '[B] 구간이 바뀌는 칸(관문)에서 반드시 뛴다 (s 1..' + SWEEP_END + ')');
  ok(!bandFlat.drop,'[B] 어느 스테이지에서도 적이 약해지지 않는다');
  ok(bandFlat.narrow >= 2 * C.BAND2,
     '[B] 스윕이 좁은 폭 구간을 실제로 밟았다 — 위 세 항이 공허참이 아니다', bandFlat.narrow + '칸');
  near('[B] 스테이지 1 은 여전히 55', live[0].hp, 55, 1e-12);
  near('[B] 스테이지 1 은 여전히 6',  live[0].dmg, 6, 1e-12);

  /* ── [C][D] 실제 스폰된 개체 ───────────────────────────────── */
  const spawn = await page.evaluate(async ss => {
    const out = [];
    for(const s of ss){
      S.stage = s; bossOn = false; enemies.length = 0; spawnQ.length = 0;
      spawnStage();
      for(let i=0;i<240 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
      const mob = enemies[0];
      startBoss();
      for(let i=0;i<300 && !enemies.some(e => e.tk === 'boss');i++) await new Promise(r => requestAnimationFrame(r));
      const boss = enemies.find(e => e.tk === 'boss');
      out.push({ s,
        mobMax: mob ? mob.max : null, mobMul: mob ? ETYPE[mob.tk].hp : null,
        bossMax: boss ? boss.max : null, bossDmg: boss ? boss.dmg : null });
      bossOn = false; enemies.length = 0; spawnQ.length = 0;
    }
    return out;
  }, IN_BAND.concat(GATES));
  const byS = {}; spawn.forEach(r => byS[r.s] = r);
  IN_BAND.forEach(s => {
    const r = byS[s];
    ok(r.mobMax !== null, '[C] s' + s + ' 몹이 실제로 스폰됐다');
    if(r.mobMax !== null) near('[C] s' + s + ' 스폰된 몹 체력 = 계단 eHp×종족배수', r.mobMax, wHp(s)*r.mobMul, 1e-9);
  });
  /* 199 4회차 — 구간 안 네 스테이지의 «같은 종족 기준» 체력이 서로 «램프 비율 그대로» 다.
     (구 «서로 같다» 는 평지 전제 — 개체로 본 계단이 이제 개체로 본 비탈이다) */
  const norm = s => byS[s].mobMax / byS[s].mobMul;
  ok(IN_BAND.every(s => Math.abs(norm(s) / norm(IN_BAND[0]) - wScale(s) / wScale(IN_BAND[0])) < 1e-9),
     '[C] 구간 안(s' + IN_BAND.join('·s') + ') 몹 체력 비 = 램프식 비 (개체로 본 상승면)',
     IN_BAND.map(s => norm(s).toExponential(4)).join(' '));
  ok(norm(C.BAND) > norm(B1) * 1.5, '[C] 구간 경계 s' + C.BAND + ' 에서 몹 체력이 뛴다 — 벽은 벽대로 남는다',
     (norm(C.BAND)/norm(B1)).toFixed(3) + '배');
  GATES.forEach(s => {
    const r = byS[s];
    ok(r.bossMax !== null, '[D] s' + s + ' 스테이지 보스가 실제로 스폰됐다');
    if(r.bossMax !== null){
      near('[D] s' + s + ' 관문 보스 체력 = eHp×' + C.BOSS_HP + '×' + C.GATE_HP,
           r.bossMax, wHp(s)*C.BOSS_HP*wGate(s), 1e-9);
      near('[D] s' + s + ' 관문 보스 **공격력은 불변** = eDmg×' + C.BOSS_DMG,
           r.bossDmg, wDmg(s)*C.BOSS_DMG, 1e-9);
    }
  });
  IN_BAND.forEach(s => {
    const r = byS[s];
    if(r.bossMax !== null)
      near('[D] s' + s + '(비관문) 보스 체력 = eHp×' + C.BOSS_HP + ' (배수 없음)',
           r.bossMax, wHp(s)*C.BOSS_HP, 1e-9);
  });

  /* ── [E] 파급 — 다른 «보스» 들은 관문 배수를 안 탄다 ───────────── */
  const ripple = await page.evaluate(async (a) => {
    S.stage = 20;
    const promoHp = eHp(S.stage)*60;                    /* 208 승급 수호자 식 */
    /* 던전 보스(178) — 요구 피해에서 나오므로 스테이지 곡선과 무관하다 */
    const dunK = typeof DUN_BOSS_HPK === 'number' ? DUN_BOSS_HPK : null;
    /* 아레나(123) — makeEnemy('arena') 는 tk 가 'arena' 라 관문 분기를 안 탄다 */
    bossOn = false; enemies.length = 0; spawnQ.length = 0;
    makeEnemy('arena');
    const ar = enemies.find(e => e.tk === 'arena');
    const arMax = ar ? ar.max : null, arMul = ar ? ETYPE.arena.hp : null;
    enemies.length = 0;
    return { promoHp, dunK, arMax, arMul, gate: bossGateHp(a.gate), notGate: bossGateHp(a.gate - 1) };  /* 관문 = GATE_N 배수 (199 5회차: 리터럴 대신 C 에서 받는다) */
  }, { gate: C.GATE_N });
  near('[E] 승급 수호자 체력 = eHp(s)×60 (관문 배수 없음)', ripple.promoHp, wHp(20)*60, 1e-9);
  near('[E] 아레나 도전자 체력 = eHp×ETYPE.arena.hp (관문 배수 없음)', ripple.arMax, wHp(20)*ripple.arMul, 1e-9);
  ok(ripple.dunK !== null, '[E] 던전 보스는 DUN_BOSS_HPK(요구 피해) 축이라 스테이지 곡선과 무관', ripple.dunK);
  ok(ripple.gate === C.GATE_HP && ripple.notGate === 1,
     '[E] bossGateHp — 관문 ' + C.GATE_HP + ' · 비관문 1', ripple.gate + '/' + ripple.notGate);

  /* ── [F] 실동작 — 관문 스테이지를 실제로 «격파해서» 넘는다 ──────── */
  const play = await page.evaluate(async (G) => {
    /* 관문(GATE_N 배수 — 199 5회차부터 80) 로 세팅하고 50킬을 채운 뒤 보스를 실제로 잡는다(판정은 건드리지 않는다) */
    S.stage = G; S.best = Math.max(S.best, G); S.bossFarm = false;
    bossOn = false; enemies.length = 0; spawnQ.length = 0;
    spawnStage();
    for(let i=0;i<120 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
    startBoss();
    for(let i=0;i<300 && !enemies.some(e => e.tk === 'boss');i++) await new Promise(r => requestAnimationFrame(r));
    const boss = enemies.find(e => e.tk === 'boss');
    const bossMax = boss ? boss.max : null;
    const before = S.stage, goldBefore = S.gold;
    /* 실제 처치 경로(hitEnemy → killEnemy)로 죽인다 — 스테이지 클리어 판정이 그 경로에 달려 있다 */
    if(boss) hitEnemy(boss, boss.hp * 10, false);
    for(let i=0;i<240 && S.stage === before;i++) await new Promise(r => requestAnimationFrame(r));
    return { bossMax, before, after: S.stage, best: S.best, goldUp: S.gold > goldBefore,
             newBand: eBand(S.stage), curHp: eHp(S.stage) };
  }, C.GATE_N).catch(e => ({ err: String(e) }));
  if(play.err){
    ok(false, '[F] 관문 보스 격파 실동작', play.err);
  } else {
    ok(play.after === play.before + 1, '[F] 관문 s' + C.GATE_N + ' 보스를 격파하니 스테이지가 올랐다',
       play.before + ' → ' + play.after);
    ok(play.best >= play.after, '[F] S.best 가 따라 올랐다 (세이브 반영)', play.best);
    ok(play.goldUp, '[F] 클리어 보상 골드가 들어왔다');
    ok(play.newBand === C.BAND, '[F] 다음 스테이지(' + (C.GATE_N + 1) + ')는 새 구간(앵커 ' + C.BAND + ') 안이다 — 계단이 실제 진행에 붙었다',
       play.newBand);
    near('[F] s' + (C.GATE_N + 1) + ' 적 체력 = 앵커 ' + C.BAND + ' × 램프 1칸 (상승면 첫 칸)', play.curHp, wHp(C.GATE_N + 1), 1e-9);
  }

  /* ── [G] 화면 반영 — 재화/정보 팝업의 «현재 스테이지 적 체력» ───── */
  const shown = await page.evaluate(() => {
    S.stage = 30; bossOn = false; enemies.length = 0; spawnQ.length = 0;
    renderSt();                                        /* 설정/정보 탭 본문을 실제로 그린다 */
    const el = document.getElementById('bSt');
    const txt = el ? el.innerText.replace(/\s+/g, ' ') : '';
    return { txt, hp: eHp(30), dmg: eDmg(30), want: fmtB(eHp(30)), wantD: fmtB(eDmg(30)) };
  });
  near('[G] 표기가 읽는 eHp(30) 가 계단 값이다',  shown.hp,  wHp(30),  1e-12);
  near('[G] 표기가 읽는 eDmg(30) 가 계단 값이다', shown.dmg, wDmg(30), 1e-12);
  ok(shown.txt.indexOf(shown.want) >= 0 && shown.txt.indexOf(shown.wantD) >= 0,
     '[G] «현재 스테이지» 절이 새 곡선 값을 실제로 찍는다 (' + shown.want + ' · ' + shown.wantD + ')');
  ok(shown.txt.indexOf(C.BAND + '스테이지') >= 0 && shown.txt.indexOf('관문') >= 0,
     '[G] «' + C.BAND + '스테이지마다 관문» 이 화면 문구로 나온다 (162 이전 «10스테이지마다 보스» 문구 교체)');
  ok(shown.txt.indexOf('10스테이지마다 보스') < 0, '[G] 구 문구(«10스테이지마다 보스»)가 화면에 없다');

  /* ── [H] 음성 — ES_BAND=1 사본(=249 이전)에서는 계단이 사라진다 ─── */
  /* 199 32회차 — 사다리가 생긴 뒤로는 **한 상수만 1 로 내리면 계단이 안 사라진다**(문턱이
     ES_BAND×ES_BANDG 라 같이 내려가고, 그 위는 여전히 폭 16 계단이다). 음성 사본은 두 폭을
     같이 1 로 내려야 «249 이전» 이 된다 — 안 그러면 [H] 가 조용히 공허참이 된다. */
  const negSrc = src.replace(/const ES_BAND  = \d+;/, 'const ES_BAND  = 1;')
                    .replace(/const ES_BAND2 = \d+;/, 'const ES_BAND2 = 1;');
  ok(negSrc !== src, '[H] 음성 사본에 «구간 계단 없음»(ES_BAND=ES_BAND2=1)을 실제로 심었다');
  fs.writeFileSync(NEG, negSrc);
  const np = await ctx.newPage();
  await np.goto('file://' + NEG.replace(/\\/g, '/'));
  await np.waitForFunction(() => typeof eHp === 'function');
  await np.waitForTimeout(600);
  const neg = await np.evaluate(() => ({
    same: Math.abs(eHp(19) - eHp(11)) < 1e-9, hp19: eHp(19), hp11: eHp(11), hp1: eHp(1)
  }));
  ok(!neg.same, '[H] N1 — 계단이 없으면 구간 안 s11 ≠ s19 (설치본에서는 램프 비율 차이)',
     neg.hp11.toExponential(4) + ' vs ' + neg.hp19.toExponential(4));
  near('[H] N2 — 그래도 s1 은 55 다 : [B] 의 s1 항목만으로는 회귀를 못 잡는다는 증명', neg.hp1, 55, 1e-12);
  await np.close();
  try{ fs.unlinkSync(NEG); }catch(e){}

  /* 199 4회차 — 되돌림 시험 둘째 벌: ES_RAMP=0 사본(= 3회차의 «평지 계단»)에서는 구간 안이
     도로 평지가 된다. [B][C] 의 램프 검사가 진짜로 램프를 보고 있다는 증명이다. */
  const negSrc2 = src.replace(/const ES_RAMP = [\d.]+;/, 'const ES_RAMP = 0;');
  ok(negSrc2 !== src, '[H] 음성 사본 2 에 «상승면 없음»(ES_RAMP=0)을 실제로 심었다');
  fs.writeFileSync(NEG, negSrc2);
  const np2 = await ctx.newPage();
  await np2.goto('file://' + NEG.replace(/\\/g, '/'));
  await np2.waitForFunction(() => typeof eHp === 'function');
  await np2.waitForTimeout(600);
  const neg2 = await np2.evaluate((a) => ({
    flatBack: Math.abs(eHp(a.mid) - eHp(a.lo)) < 1e-9, anchor: eHp(a.gate)
  }), { gate: C.GATE_N, lo: C.GATE_N + 1, mid: C.GATE_N + Math.floor(C.BAND / 2) });
  ok(neg2.flatBack, '[H] N3 — 램프를 빼면 구간 안이 도로 평지다 (설치본은 s'
     + (C.GATE_N + 1) + ' ≠ s' + (C.GATE_N + Math.floor(C.BAND / 2)) + ')');
  near('[H] N4 — 램프를 빼도 앵커(관문 s' + C.GATE_N + ')는 같은 값이다 : 램프가 앵커를 안 움직였다는 증명',
     neg2.anchor, wHp(C.GATE_N), 1e-12);
  await np2.close();
  try{ fs.unlinkSync(NEG); }catch(e){}

  /* ── [J] 되돌림 시험 — 199 32회차 사다리(31-5 결6) ────────────────
     사양이 «되돌림은 ES_BAND2 를 40 으로» 라고 적었으므로 그것을 **실제로 구워서** 확인한다.
     ① 좁은 폭을 초기 폭으로 되돌리면 사다리가 사라지고 문턱 위 값이 **옛 상수 40 모형과 정확히
     같아진다**(= r31-base 표의 곡선) · ② 설치본은 그 값과 다르다(= 사다리가 실재한다) ·
     ③ 문턱 **아래**는 설치본과 되돌림본이 한 비트도 안 다르다(= 사다리가 초기를 안 건드렸다).
     ①③ 이 같이 서야 «바꾼 것은 말미 한 자리뿐» 이라는 이 회차의 주장이 증명된다. */
  const oldBand = s => Math.max(1, C.BAND*Math.floor(s/C.BAND));
  const oldHp   = s => { const a = oldBand(s);
    return C.HB * smooth(a) * Math.pow(smooth(a + C.BAND) / smooth(a), C.RAMP * (s - a) / C.BAND); };
  const revSrc = src.replace(/const ES_BAND2 = \d+;/, 'const ES_BAND2 = ' + C.BAND + ';');
  ok(revSrc !== src, '[J] 되돌림 사본에 «사다리 없음»(ES_BAND2 = ES_BAND)을 실제로 심었다');
  fs.writeFileSync(NEG, revSrc);
  const rp = await ctx.newPage();
  await rp.goto('file://' + NEG.replace(/\\/g, '/'));
  await rp.waitForFunction(() => typeof eHp === 'function');
  await rp.waitForTimeout(600);
  /* ⚠ 표본에서 **두 격자의 공통 앵커**는 빼야 한다 — s360(=9×40) · s440(=11×40 = 360+5×16)은
     사다리 앞뒤로 둘 다 구간 첫 칸이라 값이 원래 같다. 그 칸을 R2 에 넣으면 «사다리가 없다» 로
     읽혀 자가 자기 주장을 반증한다(공통 앵커 자체는 R3 옆에서 «앵커는 안 움직였다» 로 쓴다). */
  const REV_S = [C.SW + 1, C.SW + C.BAND2 - 1, C.SW + C.BAND2, C.SW + 2 * C.BAND2, 10 * C.BAND, 10 * C.BAND + 20];
  const GATE_I = 2;                                   /* REV_S[2] = 376 — 새 정의로만 관문인 칸 */
  const EARLY_S = [1, 11, 39, 40, 41, 80, 200, C.SW - 1, C.SW];
  const rev = await rp.evaluate(ss => ({
    late:  ss.late.map(s => eHp(s)), early: ss.early.map(s => eHp(s)),
    gateNew: isGateStage(ss.gate)
  }), { late: REV_S, early: EARLY_S, gate: REV_S[GATE_I] });
  const liveLate = await page.evaluate(ss => ss.map(s => eHp(s)), REV_S);
  const liveEarly = await page.evaluate(ss => ss.map(s => eHp(s)), EARLY_S);
  REV_S.forEach((s, i) => near('[J] R1 — 되돌림본 s' + s + ' = 옛 «상수 ' + C.BAND + '» 모형', rev.late[i], oldHp(s), 1e-12));
  ok(REV_S.every((s, i) => Math.abs(liveLate[i] / rev.late[i] - 1) > 1e-6),
     '[J] R2 — 설치본은 문턱 위 **모든** 표본에서 되돌림본과 다르다 (사다리가 실재한다)',
     REV_S.map((s, i) => (liveLate[i] / rev.late[i]).toFixed(3)).join(' '));
  /* ⚠ R2 만으로는 무르다 — **구간 «안» 의 칸당 기울기는 폭과 거의 무관**하다(램프가 R^(RAMP/w)
     인데 R ≈ M2^w 라 w 가 약분된다: s361·s375 의 비가 1.000 인 것이 그 실측이다).
     사다리가 실제로 옮기는 것은 **경계 점프의 자리**이므로, 격자가 갈리는 칸에서 큰 차가
     나는지를 따로 묻는다 — 안 물으면 «폭을 바꿔도 곡선은 그대로» 인 사본도 R2 를 통과한다. */
  const bigGap = REV_S.filter((s, i) => Math.abs(Math.log(liveLate[i] / rev.late[i])) > Math.log(1.5));
  ok(bigGap.length >= 3,
     '[J] R2b — 그중 ≥3칸은 ×1.5 이상 갈린다 (경계 점프의 «자리» 가 실제로 옮겨졌다는 증거)',
     bigGap.map(s => 's' + s).join('·') + ' — ' + REV_S.map((s, i) => (liveLate[i] / rev.late[i]).toFixed(3)).join(' '));
  ok(EARLY_S.every((s, i) => Math.abs(liveEarly[i] - rev.early[i]) <= Math.abs(rev.early[i]) * 1e-12),
     '[J] R3 — 문턱 **아래와 문턱 자신**(s' + EARLY_S.join('·s') + ')은 설치본 = 되돌림본'
     + ' — 사다리가 초기를 안 건드렸고 문턱 앵커도 안 움직였다');
  ok(rev.gateNew === false,
     '[J] R4 — 되돌림본에서 s' + REV_S[GATE_I] + ' 는 관문이 **아니다** (설치본에서는 관문 — 관문 격자가 실제로 촘촘해졌다)');
  await rp.close();
  try{ fs.unlinkSync(NEG); }catch(e){}

  ok(errs.length === 0, '[I] 콘솔·런타임 에러 0', errs.length + (errs.length ? ' : ' + errs.slice(0,3).join(' | ') : ''));

  await browser.close();
  console.log('');
  console.log('VERIFY249 ' + pass + '/' + (pass+fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
