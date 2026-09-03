'use strict';
/* ==========================================================================
   verify758 — «무료 다이아 총 유입을 현행의 ½ 로» 의 자   (작업 758, 199 23회차)
   --------------------------------------------------------------------------
   무엇을 지키는가
     주인 지시(2026-09-02 06:05 · 정정 06:07)가 199 의 §0 과녁을 갈았다 —
     «하루 ≈27만 / 100일 2,720.5만» 은 무효, 새 과녁은 **무료 다이아 총 유입(부지런 기준)이
     하향 전 기준선의 1/2**(게이트 = bot199 30일 실측 총 유입이 기준선의 **50% ± 5%p**).
     같은 지시가 못박은 것 둘: **주인 확정 상수 축은 불변**(739 출석 {1,000×6 · 7일차 10,000} ·
     결1 총량 100만) · 도달일은 과녁이 아니라 **관측 보고**.

   왜 30일 봇을 자 안에서 안 돌리는가
     한 실행이 600초다. 그래서 이 자는 **이미 커밋된 두 측정표**(기준선 열 · 이 회차 열)를
     읽어 비율을 다시 잰다 — 자가 싼 대신 **표가 낡으면 못 잡는다**. 그 구멍을 [E] 가 막는다:
     측정표의 오프라인 하루 평균이 **지금 제품의 `OFF_DIA_PM` 으로 설명되는지**를 물어서,
     «상수만 바꾸고 봇을 안 돌린» 커밋은 [E] 가 빨개진다(측정표 ↔ 제품 정합).

   절
     [A] 정적 — 제품 상수(하향된 `OFF_DIA_PM` · 주인 확정 상수 불변 · 결3 ⓑ 축 생존)
     [B] 제품 실지급 — 페이지에서 오프라인 지급이 그 상수로 굴러가는가 (손 계산 금지)
     [C] 과녁 — 30일 총 유입 비율. **부지런이 판정**(45~55%) · 대충은 관측 보고
     [D] ② 한 축 ≤50% — §0 **원문 장부(유입 장부)** 로 잰다(23-2 정정11 · 되돌림은 그 문단)
     [E] 측정표 ↔ 제품 정합 — 표의 오프라인/일이 현 `OFF_DIA_PM` 으로 설명된다(그리고
         기준선 표는 **옛 계수**로 설명된다 = 두 표가 서로 다른 세대임을 자가 스스로 확인)
     [R] 되돌림 시험 — 측정표의 오프라인 축만 옛 계수로 되돌리면 [C]·[D] 가 **빨개진다**
         (334·348·364 규약 — 무르게 푼 수리가 아님을 못박는 자리)
     [S] 같은 자로 잰 비교인가(calib sha) · ② 를 **말미 창**에서도 잰다
     [T] **④ 두 정책 간격**(199 25회차 신설 · 24-7 3번) — 판정 줄(교차일 비 · 소환 예산 장부)이
         §0 창 1.8~2.0 안인가. ④ 는 758 하향이 만든 손해(24정정6)라 하향의 자가 같이 지킨다.
         음성항은 **커밋된 직전 세대 표**(r801-post · 같은 κ sha)다 — 그 표에서는 2.5 로 창 밖이다.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRCF = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(SRCF, 'utf8');

/* 표 두 장 — 기준선(하향 전) 과 이 회차. 파일 이름을 여기 한 곳에만 적는다.
   ⚠ **24정정7(AAO)** — 초판 주석은 «기준선은 .md 만 커밋돼 있다» 였는데 24회차가 기준선을
   재실행하며 **json 도 같이 커밋했다**. 그래서 이제는 **두 표 다 json 을 읽고**, [C1e] 는
   양쪽(json ↔ md [E] 표)을 **기준선·이 회차 모두**에서 대조한다(자가 자기 파서를 먼저 잰다).
   ⚑ **24회차(23정정10 · AAL 1순위) — 분모를 κ 맞춘 열로 갈았다.** 23회차의 판정 줄은
   calib sha 가 서로 다른 두 표의 나눗셈이었다(base 3cc6898718c1 ÷ r23 6a013a86ea41). 24회차가
   기준선 트리(`adeb739^` = 22회차 직전)를 **이 회차의 κ 캐시로** 다시 굴려 두 표의 sha 를 맞췄고,
   [S1] 이 그것을 자로 못박는다. */
const BASE_M = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r24-base-k.md');
const BASE_J = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r24-base-k.json');
/* ⚑ **199 25회차** — 이 회차 열을 r25 로 옮긴다(제품이 `OFF_DAY_CAP_MIN` 을 660 으로 내렸으므로
   r24 표는 더 이상 «지금 제품» 의 사진이 아니다 — 그대로 두면 [E1] 이 옳게 빨개진다). */
/* ⚑ **199 26회차** — 이 회차 열을 r26 으로 옮긴다. 판정 줄은 r25 와 자릿수까지 같지만
   (26회차 제품 변경은 **유료 축**이라 무과금 봇을 안 건드린다 — 그 «Δ0» 자체가 §26-4 의 주장이고,
   자가 그것을 재려면 **이 회차 트리로 찍은 표**를 봐야 한다), 표를 안 옮기면 [E1]·[E1b] 가
   «지금 제품» 이 아닌 사진을 재게 된다(25회차가 r24 표를 두고 겪을 뻔한 자리 · 같은 이유). */
const CUR_J  = path.join(ROOT, 'docs/review/199-bot-2026-09-03-r26.json');
/* ⚑ **199 27회차** — 이 회차는 **제품 계수를 한 줄도 안 건드렸다**(자·규약 회차). 그래서 표는
   새로 굴리지 않고 같은 스냅(`r26.json`)을 **리플레이**해 [E4]·[G] 의 신설 행만 얹었다 —
   26-10 1번의 «새 실행이 필요 없다 — 표는 이미 있다» 를 글자 그대로 따른 것이다.
   ⇒ `CUR_J` 는 그대로 두고 `CUR_M` 만 옮긴다(두 파일은 **같은 런**이다 · md 머리글이 리플레이
   출처를 스스로 적는다). 판정 줄의 수는 자릿수까지 r26 과 같아야 하고, 그것을 [U0] 이 지킨다. */
const CUR_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-03-r27.md');
const R26_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-03-r26.md');
/* 23회차 표 — [S4] 가 «이 자가 그 결함을 실제로 잡는가» 를 되돌림 표본으로 쓴다(PM=15 세대) */
const R23_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r23-both.md');
/* 801 직후 표(= 25회차 직전 세대 · calib sha 가 base-k 와 **같다**) — [T2] 의 빨강 표본 */
const PRE_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-02-r801-post.md');

/* 옛 계수 — 되돌림 시험의 «빨강 표본» 이자 [E2] 의 기준선 설명값 */
const OLD_PM = 75;
/* 기준선 트리(`adeb739^`)의 하루 예산 — [E2] 가 «기준선 표는 옛 세대» 를 확인할 때 쓰는 값이다.
   ⚠ 25회차가 제품의 `OFF_DAY_CAP_MIN` 을 1440 → 660 으로 내렸으므로 이 값을 소스에서 읽으면
   기준선 표를 660×75 로 설명하려다 **틀리게 빨개진다**(기준선은 1440 세대다). 세대 상수는
   세대와 함께 적는다. */
const BASE_CAP_MIN = 1440;
/* ④ 두 정책 간격 — §0 «비 1.8~2.0» (판정 줄 = 교차일 비 · 22정정4 · 24정정5) */
const RATIO_LO = 1.8, RATIO_HI = 2.0;
/* 과녁 창 — §0 개정(758): 50% ± 5%p */
const WIN_LO = 0.45, WIN_HI = 0.55;
/* ② — §0 원문 «한 축이 유입의 50% 를 넘지 않는다» */
const AXIS_CAP = 0.50;

const R = [];
const yes = (n, got, d) => R.push({ n: n + (d !== undefined && d !== '' ? ' — ' + d : ''), got: String(got), want: 'true', pass: got === true });
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const near = (n, got, want, tol, d) => {
  const ok = Number.isFinite(got) && Number.isFinite(want) && want !== 0 && Math.abs(got / want - 1) <= tol;
  R.push({ n: n + (d ? ' — ' + d : ''), got: fmt(got) + ' (비 ' + (got / want).toFixed(4) + ')', want: '≈' + fmt(want) + ' ±' + (tol * 100).toFixed(0) + '%', pass: ok });
};
const fmt = v => Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : String(v);
const pct = v => (v * 100).toFixed(2) + '%';

/* ── 측정표 읽기 ────────────────────────────────────────────────────────── */
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
/* 한 정책의 «시드 평균» 축별 유입 + 합. 보고서 [E] 표가 쓰는 것과 같은 자(30일 평균). */
function incOf(j, pol) {
  const seeds = Object.values(j.policies[pol]);
  const axes = {};
  seeds.forEach(s => Object.entries(s.diaIn || {}).forEach(([k, v]) => { axes[k] = (axes[k] || 0) + v; }));
  Object.keys(axes).forEach(k => { axes[k] /= seeds.length; });
  const total = Object.values(axes).reduce((a, b) => a + b, 0);
  return { axes, total, seeds: seeds.length, days: j.days };
}
/* [E] 표(마크다운)에서 축별 합계를 읽는다 — 기준선 열은 .md 만 있다. */
const POLNAME = { diligent: '부지런한 유저', casual: '대충 유저' };
function incOfMd(md, pol) {
  const head = '### [E] 다이아 유입/씽크 — ' + POLNAME[pol];
  const i = md.indexOf(head);
  if (i < 0) return null;
  const axes = {};
  let sum = null;
  for (const line of md.slice(i).split('\n').slice(1)) {
    if (/^\|\s*\*\*합\*\*/.test(line)) {
      sum = Number((line.split('|')[2] || '').replace(/[^\d]/g, ''));
      break;
    }
    const m = line.match(/^\|\s*([^|*]+?)\s*\|\s*([\d,]+)\s*\|/);
    if (m) axes[m[1]] = Number(m[2].replace(/,/g, ''));
  }
  const total = Object.values(axes).reduce((a, b) => a + b, 0);
  return { axes, total, sum };
}
/* [E3] «말미 창 축별 기울기» 표 — ② 를 **말미 창**에서도 재기 위해(23정정2·3).
   23회차가 값을 고른 부등식이 바로 이 창의 것이라, 이 표를 안 재면 자기 자로 자기를 안 잰 것이 된다. */
function tailOfMd(md, pol) {
  const head = '### [E3] ② 말미 창 안 **축별 기울기** — ' + POLNAME[pol];
  const i = md.indexOf(head);
  if (i < 0) return null;
  const axes = {};
  for (const line of md.slice(i).split('\n').slice(1)) {
    if (/^\|\s*\*\*합\*\*/.test(line)) break;
    const m = line.match(/^\|\s*([^|*_]+?)\s*\|\s*([\d,]+)\s*\|/);
    if (m) axes[m[1]] = Number(m[2].replace(/,/g, ''));
  }
  const total = Object.values(axes).reduce((a, b) => a + b, 0);
  return total ? { axes, total } : null;
}
function calShaOf(md) { return ((md.match(/calib sha\s+\*{0,2}([0-9a-f]{12})/) || [])[1]) || null; }
/* ⚑ **199 25회차 신설** — ④ 의 판정 줄을 표에서 읽는다.
   [G] 표의 «④ 교차일 … 〔소환 예산 장부…〕» 행이 그 줄이다(결2 ⓐ = ④ 의 판정 장부 · 22정정4
   «비는 판정, 도달일은 관측» · 24정정5 «말미 기울기 비·«참고» 행을 판정으로 읽지 마라»).
   같은 머리글이 정책별 [E2] 표에도 있으므로 **칸이 넷인 [G] 행**(라벨·부지런·대충·비)만 고른다 —
   비 칸은 안 읽고 두 값에서 다시 나눈다(표가 스스로 적은 수를 그대로 믿지 않는다). */
function crossOfMd(md) {
  for (const line of md.split('\n')) {
    if (!/④ 교차일/.test(line) || !/소환 예산 장부/.test(line)) continue;
    const c = line.split('|');
    if (c.length < 6) continue;                       /* 정책별 [E2] 행(칸 셋)은 건너뛴다 */
    const num = s => { const m = String(s).match(/([\d,]+(?:\.\d+)?)/); return m ? Number(m[1].replace(/,/g, '')) : NaN; };
    const d = num(c[2]), k = num(c[3]);
    if (Number.isFinite(d) && Number.isFinite(k) && d > 0) return { dil: d, cas: k, ratio: k / d };
  }
  return null;
}
function maxAxis(axes, total) {
  let name = null, v = -1;
  Object.entries(axes).forEach(([k, x]) => { if (x > v) { v = x; name = k; } });
  return { name, v, share: total ? v / total : 0 };
}

(async () => {
  /* ── [A] 정적 ─────────────────────────────────────────────────────────── */
  console.log('[A] 정적 — 제품 상수');
  const mPm = SRC.match(/const\s+OFF_DIA_PM\s*=\s*(\d+)\s*;/);
  yes('[A1] 제품에 `OFF_DIA_PM` 선언이 있다', !!mPm);
  const PM = mPm ? parseInt(mPm[1], 10) : NaN;
  /* ⚠ 23정정10 → **24정정6(AAO·AAQ 일치 — 초판의 주석이 코드가 안 하는 일을 적었다)**.
     이 항의 술어는 `PM < 75` 한 줄이라 **0~74 아무 값이나 통과**한다. 초판은 여기 주석에
     «상수와 표를 한 항 안에서 묶는다» 라고 적었는데 그것을 실제로 하는 항은 **[E1b]** 다.
     항을 없애지 않는 이유(333 처방): «하향이 살아 있는가» 는 [E1b] 와 **다른 것을 묻는다** —
     [E1b] 는 표와 상수가 **서로 맞는지**만 보므로 둘이 나란히 75 로 돌아가면 [E1b] 는 초록이고
     이 항만 빨개진다. ⇒ 술어는 그대로 두고 **이름표를 사실대로** 고친다(값은 [E1b] 가 못박는다). */
  yes('[A2] `OFF_DIA_PM` 이 옛 계수(' + OLD_PM + ')에서 내려왔다 — 758 하향이 살아 있다 (⚠ 값을 못박는 것은 [E1b] 다)',
      Number.isFinite(PM) && PM < OLD_PM, '현행 ' + PM);
  /* 오프라인 다이아의 분당 축은 이 상수 하나여야 한다 — 사본이 생기면 하향이 반쪽이 된다 */
  yes('[A3] 오프라인 다이아 지급식이 `OFF_DIA_PM` 하나만 읽는다 (분당 축 사본 0건)',
      /const\s+dia\s*=\s*Math\.floor\(\s*sec\s*\*\s*OFF_DIA_PM\s*\/\s*60\s*\*\s*om\s*\)/.test(SRC));
  /* 주인 확정 상수 — 758 문면이 «이 축들은 빼고 나머지로 맞춘다» 고 못박았다 */
  const mAtt = SRC.match(/const\s+ATT_DIA\s*=\s*(\d+)\s*;/);
  const mAtt7 = SRC.match(/const\s+ATT_DIA7\s*=\s*(\d+)\s*;/);
  eq('[A4] 주인 확정 상수 불변 — 출석 1~6일차 `ATT_DIA` (739)', mAtt && mAtt[1], '1000');
  eq('[A5] 주인 확정 상수 불변 — 출석 7일차 `ATT_DIA7` (739)', mAtt7 && mAtt7[1], '10000');
  /* 결3 ⓑ 축 — 이 줄을 내리면 151 이용권 상품 가치가 같이 내려간다. 보정 손잡이가
     살아 있는지만 여기서 확인한다(값 판정은 **[P1]·[P2]** 다 — 26회차가 세웠다). */
  yes('[A6] [전제] 결3 ⓑ 보정 손잡이 `PASS_OFF_MUL` 선언이 살아 있다 (값 판정은 **[P2]** — [P1] 은 세대 하한 · [P2b] 는 관측)',
      /const\s+PASS_OFF_MUL\s*=\s*[\d.]+\s*;/.test(SRC));
  /* ⚑⚑ **199 26회차 신설 — 결3 ⓑ «구 +4h 동급 이상» 을 자가 든다**(25-8 2번 · 세 회차 미뤄진 항).
     23정정11 → 24-5 3번 → 25정정8 이 세 회차 연속 «다음 회차 몫» 으로 넘겼고, 그 사이 25회차가
     하루 예산을 1,440 → 660분으로 내려 **상품 가치가 문면 아래로 내려간 채**였다. 여기서 못박는다.

     구 상품 = «1회 상한 +4h» ⇒ 하루에 나르던 다이아 = 240분 × `OFF_DIA_PM`.
     새 상품 = «오프라인 ×배율» ⇒ 증분 = (m − 1) × (그 정책의 **하루 오프라인 밑변** × PM).
     ⚑ 밑변은 정책마다 **다른 상수**가 정한다 — 그래서 하한이 둘이고, 값은 **큰 쪽**이 정한다:
       · 부지런 — 하루 예산 `OFF_DAY_CAP_MIN` 에 걸린다(로그인 4회라 예산을 꽉 채운다)
       · 대충   — 1회 상한 `OFF_CLAIM_CAP_H` 에 **먼저** 걸린다(로그인 1회 · 예산은 안 물린다)
     〔26정정1〕 25정정8 이 «26회차 2번의 값을 **1.364** 로 못박는다» 고 적은 것은 **부지런 기준
     하나**다. 대충 밑변(630분)이 더 작아 하한이 더 높고(1.3810), 두 부등식을 동시에 만족하는
     값은 max = **1.381** 이다. 1.364 를 채택하면 대충에게만 −1.2% 문면 미달이 남는다.
     ⚠ 이 항들은 **유료 축**이라 758 판정 줄(무과금 봇)과 독립이다 — 실제로 r26 표는 r26-base 와
     판정 줄이 자릿수까지 같다(§26-4). */
  const mMul  = SRC.match(/const\s+PASS_OFF_MUL\s*=\s*([\d.]+)\s*;/);
  const mClaimH = SRC.match(/const\s+OFF_CLAIM_CAP_H\s*=\s*([\d.]+)\s*;/);
  const MUL   = mMul ? Number(mMul[1]) : NaN;
  const mCapP = SRC.match(/const\s+OFF_DAY_CAP_MIN\s*=\s*(\d+)\s*;/);
  const CAPD  = mCapP ? Number(mCapP[1]) : NaN;              /* 부지런 밑변(분) */
  const CAPC  = mClaimH ? Number(mClaimH[1]) * 60 : NaN;     /* 대충 밑변(분) */
  const OLD_PLUS_MIN = 240;                                  /* 구 상품 «+4h» = 240분 */
  /* ⚑⚑ **26회차 채점 정정(AAW 정정6 · 초판의 [P1] 은 «허수 과녁» 위에 서 있었다)** —
     구 «+4h» 는 **1회 상한**을 240분 올리는 상품이라, 하루 예산이 먼저 자르는 정책에게는
     그만큼을 **못 나른다**. 실제로 나르는 양은 «상한을 올려서 늘어난 분» 이 아니라
     **예산 천장까지 남은 분**이다: `deliver = min(밑변 + 240, 하루 예산) − 밑변`.
       · 부지런 — 밑변이 곧 예산(660)이라 `min(900, 660) − 660` = **0분/일** ⇒ 하한 **1.000**
         (21회차 주석·`probe199r21` P2·P4 가 이미 «부지런은 상한에 한 번도 안 닿아 +0» 이라 적어 뒀다)
       · 대충   — 밑변 630, 예산 660 ⇒ `min(870, 660) − 630` = **30분/일** ⇒ 하한 **1.0476**
     초판은 두 정책에 240 을 똑같이 먹여 1.3636 / 1.3810 을 «하한» 이라고 불렀는데,
     그것은 **1,440분 세대의 상품 가치**(그 세대에선 둘 다 240분을 온전히 날랐다)다.
     ⚠ **채택값 1.381 은 그대로다** — 아래 [P2b] 가 그 근거를 든다(문면 과녁은 «구 상품이
     **자기 세대에서** 나르던 2,400/일» 이고, 그 해석이 23정정11 → 24-5 3번 → 25정정8 을 거쳐
     세 회차 동안 이 값을 가리켜 왔다). 다만 **자는 두 과녁을 갈라서** 든다:
       [P1]  = 이 세대에서 구 상품이 실제로 나르는 양(위 식) — **거짓 빨강이 구조적으로 불가능**
       [P2]  = 문면 과녁(2,400/일) 대비 **대충** 하한 — 값을 정하는 항
       [P2b] = 문면 과녁 대비 **부지런** 하한 — 관측(이 세대에선 [P2] 보다 항상 무르다)
     초판의 [P1] 을 그대로 뒀으면 25-8 1번의 대비책(«예산 660 → 600»)을 밟는 회차에서
     하한이 1.400 으로 올라 **제품을 안 건드렸는데 빨개진다**(AAW 실측). */
  const deliverOf = baseMin => Math.max(0, Math.min(baseMin + OLD_PLUS_MIN, CAPD) - baseMin);
  const lowNow = baseMin => 1 + deliverOf(baseMin) / baseMin;          /* 이 세대의 실제 전달분 */
  const lowSpec = baseMin => 1 + OLD_PLUS_MIN / baseMin;               /* 문면 과녁(구 세대 가치) */
  const loD = lowNow(CAPD), loC = lowSpec(CAPC), loDs = lowSpec(CAPD);
  yes('[P1] **`PASS_OFF_MUL` ≥ 이 세대의 구 상품 전달분 하한** (부지런 ' + deliverOf(CAPD) + '분/일 · 대충 ' + deliverOf(CAPC) + '분/일 — 예산이 1회 상한보다 먼저 자른다)',
      Number.isFinite(MUL) && MUL >= Math.max(loD, lowNow(CAPC)) - 1e-9,
      MUL + ' ≥ ' + Math.max(loD, lowNow(CAPC)).toFixed(4) + ' (부지런 ' + loD.toFixed(4) + ' · 대충 ' + lowNow(CAPC).toFixed(4) + ')');
  yes('[P2] **`PASS_OFF_MUL` ≥ 문면 과녁 하한 — 대충**(밑변 = 1회 상한 ' + (CAPC / 60) + 'h = ' + CAPC + '분) · 구 «+4h» 가 **자기 세대에서** 나르던 ' + fmt(OLD_PLUS_MIN * PM) + '/일 동급 이상 — **값을 정하는 항**',
      Number.isFinite(MUL) && Number.isFinite(loC) && MUL >= loC - 1e-9,
      MUL + ' ≥ ' + loC.toFixed(4) + ' (증분 ' + fmt((MUL - 1) * CAPC * PM) + '/일)');
  R.push({ n: '[P2b] 같은 과녁의 **부지런** 하한 — **관측**(이 세대에선 [P2] 보다 무르다 · 판정은 [P2])',
           got: MUL + ' vs ' + loDs.toFixed(4) + ' (증분 ' + fmt((MUL - 1) * CAPD * PM) + '/일)', want: '(기록)', pass: true });
  /* ⚑ **26회차 채점 정정(AAV 자 판정 · [R3]·[T2] 에 이은 세 번째 이름표 결함 — 방향만 반대)** —
     초판은 이 항을 «되돌림 시험» 이라 불렀는데, 술어가 `1.2 < 하한` 이라 **제품의
     `PASS_OFF_MUL` 을 아예 안 읽는다**. 사본에서 값을 1.2 로 되돌려도 이 항은 초록이고
     빨개지는 것은 [P2] 다(AAV 실측). 되돌림을 잡는 항은 [P2] 이고, 이 항이 실제로 재는 것은
     **«이 세대에서 옛 값이 문면을 만족하는가»** — 즉 세대 판정이다. 이름표를 사실대로 고친다. */
  yes('[P3] [전제] 이 세대에서 옛 값 **1.2** 는 문면 과녁(대충)을 못 넘는다 — 값을 올린 이유가 세대에 실재한다 (⚠ 제품의 `PASS_OFF_MUL` 을 안 읽는다 = 되돌림은 [P2] 가 잡는다)',
      1.2 < loC - 1e-9,
      '1.2 vs 대충 문면 하한 ' + loC.toFixed(4));
  /* 표기 사본 — 배율을 말하는 자리는 725 의 `fmtMul` 한 벌에서만 온다. 26회차가 이 자리를 고쳤다
     (`offMul().toFixed(1)` 은 1.381 을 «×1.4» 로 +1.4% 부풀려 적는다). */
  yes('[P4] 오프라인 팝업의 이용권 배율 표기가 `fmtMul` 한 벌에서 온다 (725 · `toFixed` 사본 0건)',
      /이용권 '\s*\+\s*fmtMul\(offMul\(\)\)/.test(SRC) && !/offMul\(\)\.toFixed\(/.test(SRC));
  /* ⚑ **199 25회차 신설(비평 AAS 정정6)** — 마크업의 **정적 기본값**이 예산 세대를 따라가야 한다.
     `#ofrMax` 는 팝업이 열릴 때 `showOfflineReward()` 가 덮어쓰지만, 그 전에 화면에 있는 것은
     마크업의 문자열이다. 25회차가 예산을 660 으로 내렸을 때 그 자리는 «하루 24시간» 인 채였고
     `verify151` C3 은 **팝업을 띄운 뒤**를 재서 이 자리를 못 본다(자가 둘인데 아무도 안 짖었다). */
  const mCapA = SRC.match(/const\s+OFF_DAY_CAP_MIN\s*=\s*(\d+)\s*;/);
  const capH = mCapA ? Math.floor(Number(mCapA[1]) / 60) : NaN;
  const mStatic = SRC.match(/<i id="ofrMax">([^<]*)<\/i>/);
  yes('[A7] 마크업의 정적 기본값 `#ofrMax` 가 현 하루 예산과 같은 세대다 (덮어쓰기 전 화면)',
      !!mStatic && new RegExp('하루 ' + capH + '시간').test(mStatic[1]),
      mStatic ? '«' + mStatic[1] + '» ↔ 예산 ' + (mCapA && mCapA[1]) + '분(' + capH + '시간)' : '(노드 없음)');

  /* ── [B] 제품 실지급 ──────────────────────────────────────────────────── */
  console.log('\n[B] 제품 실지급 — 페이지에서 잰다');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + SRCF);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof OFF_DIA_PM !== 'undefined');
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.step = () => {}; });
  let b = null;
  try {
    b = await page.evaluate(() => {
      Object.assign(S, DEF()); S.daily.offMin = 0;
      offlineReward(Date.now() - 1000 * 60 * 60 * 48);          /* 상한보다 길게 — 상한이 자른다 */
      const sec = offPend ? offPend.sec : null;
      const dia = offPend ? offPend.dia : null;
      return { sec, dia, pm: OFF_DIA_PM, mul: offMul() };
    });
  } catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); }
  yes('[B0] §B 가 실제로 돌았다 (evaluate 예외 0건)', b !== null);
  if (b) {
    eq('[B1] 페이지가 읽는 상수 = 소스의 상수', b.pm, PM);
    eq('[B2] 이용권 배율은 기본 ×1 (표본에 배율이 안 섞였다)', b.mul, 1);
    eq('[B3] **1회 수령 실지급 = floor(sec × OFF_DIA_PM / 60)** (제품 경로)',
       b.dia, Math.floor(b.sec * b.pm / 60));
    /* 음성항 — 옛 계수로 계산하면 실지급과 다르다. 이 항이 빨개지면 [B3] 이 아무것도 안 지킨다. */
    yes('[B4] 같은 sec 에서 옛 계수(' + OLD_PM + ')는 실지급과 **다르다** (자가 하향을 실제로 본다)',
        Math.floor(b.sec * OLD_PM / 60) !== b.dia,
        '옛 ' + fmt(Math.floor(b.sec * OLD_PM / 60)) + ' vs 현 ' + fmt(b.dia));
    eq('[B5] 콘솔 에러 0건', errs.length, 0);
  }
  await browser.close();

  /* ── [C] 과녁 ─────────────────────────────────────────────────────────── */
  console.log('\n[C] 과녁 — 30일 총 유입 비율 (부지런 = 판정 · 대충 = 관측 보고)');
  yes('[C0] 기준선 표가 있다 (' + path.basename(BASE_M) + ')', fs.existsSync(BASE_M));
  yes('[C0b] 이 회차 표가 있다 (' + path.basename(CUR_J) + ')', fs.existsSync(CUR_J) && fs.existsSync(CUR_M));
  let base = null, cur = null;
  if (fs.existsSync(BASE_M) && fs.existsSync(CUR_J) && fs.existsSync(CUR_M)) {
    const bmd = fs.readFileSync(BASE_M, 'utf8');
    const cmd = fs.readFileSync(CUR_M, 'utf8');
    const cj = readJson(CUR_J), bj = readJson(BASE_J);
    base = { d: incOf(bj, 'diligent'), c: incOf(bj, 'casual'), j: bj };
    cur  = { d: incOf(cj, 'diligent'), c: incOf(cj, 'casual'), j: cj };
    const curMd = { d: incOfMd(cmd, 'diligent'), c: incOfMd(cmd, 'casual') };
    const baseMd = { d: incOfMd(bmd, 'diligent'), c: incOfMd(bmd, 'casual') };
    /* 같은 자로 잰 두 표인가 — 일수·시드 수·정책이 갈리면 비율은 뜻이 없다 */
    eq('[C1] 두 표의 일수가 같다', cur.j.days, base.j.days);
    eq('[C1b] 두 표의 시드 수가 같다', cur.d.seeds, base.d.seeds);
    yes('[C1c] 기준선 표에 정책 둘이 다 실려 있다', base.d.seeds > 0 && base.c.seeds > 0,
        '부지런 ' + fmt(base.d.total) + ' · 대충 ' + fmt(base.c.total));
    eq('[C1d] 규칙 위반 0건 (등재문 ⑦ — 0 이어야 결과를 믿는다)', (cur.j.viol || []).length, 0);
    /* 자가 자기 파서를 먼저 잰다 — 같은 회차 표를 json 으로 읽은 값과 md 로 읽은 값이 같은가.
       (기준선은 md 로만 읽으므로, 이 항이 빨개지면 [C2] 의 분모·분자가 다른 자로 잰 것이 된다) */
    near('[C1e] [전제] 같은 표를 json 으로 읽은 합 = md [E] 표의 합 — 이 회차 (파서 대조)',
         cur.d.total, curMd.d ? curMd.d.sum : NaN, 0.001);
    near('[C1f] [전제] 같은 대조 — **기준선**(24정정7 — 분모도 양쪽 경로로 읽는다)',
         base.d.total, baseMd.d ? baseMd.d.sum : NaN, 0.001);

    const rD = cur.d.total / base.d.total, rC = cur.c.total / base.c.total;
    yes('[C2] **부지런 30일 총 유입 = 기준선의 50% ± 5%p** (§0 개정 판정 줄)',
        rD >= WIN_LO && rD <= WIN_HI,
        fmt(cur.d.total) + ' / ' + fmt(base.d.total) + ' = ' + pct(rD));
    /* 대충은 «관측 보고» 다 — 주인 문면이 «부지런 기준» 이라 창 밖이어도 빨강이 아니다.
       그래도 값을 못 박아 두어야 다음 회차가 방향을 읽는다(§0 «도달일은 관측» 과 같은 지위). */
    R.push({ n: '[C3] 대충 30일 총 유입 비율 — **관측 보고**(판정 아님)', got: pct(rC), want: '(기록)', pass: true });
    console.log('  · 대충 ' + fmt(cur.c.total) + ' / ' + fmt(base.c.total) + ' = ' + pct(rC));

    /* ── [D] ② 한 축 ≤50% ───────────────────────────────────────────────── */
    console.log('\n[D] ② 한 축 ≤50% — §0 원문 장부(유입 장부)');
    const mD = maxAxis(cur.d.axes, cur.d.total), mC = maxAxis(cur.c.axes, cur.c.total);
    yes('[D1] 부지런 최대 유입 축 ≤ 50%', mD.share <= AXIS_CAP, mD.name + ' ' + pct(mD.share));
    yes('[D2] 대충 최대 유입 축 ≤ 50%', mC.share <= AXIS_CAP, mC.name + ' ' + pct(mC.share));
    /* [전제] — 하향 전에는 이 자가 «오프라인» 을 최대 축으로 봤다(자가 축을 실제로 가른다) */
    const mB = maxAxis(base.d.axes, base.d.total);
    yes('[D3] [전제] 기준선 표에서는 최대 축이 «오프라인» 이다 (자가 축을 실제로 가른다)',
        mB.name === '오프라인', mB.name + ' ' + pct(mB.share));
    /* ⚑ 23-2 정정11 — ② 를 어느 장부로 읽는가. 22-0(정정10)이 ④ 에 맞춰 «소환 예산 장부»
       (= 지속 유입 − 소환 외 씽크)로 통일했는데, **758 아래에서 그 장부는 자로 못 쓴다**:
       유입을 반으로 줄여도 씽크는 안 따라 줄어서 **분모가 분자보다 빨리 무너지고**, 그러면
       ② 는 손잡이를 옳게 돌릴수록 나빠진다. 실측이 그 구조를 그대로 보여 준다 —
       대충의 최대 축은 이 장부에서 67.46% 로 읽히는데 같은 축의 **실제 유입 비중은 16.7%** 다.
       ⇒ ② 는 §0 **원문**(«한 축이 **유입**의 50% 를 넘지 않는다»)으로 되돌려 [D1]·[D2] 로 잰다.
       정정10 의 장부 값은 아래 한 줄에 **관측**으로 남긴다(판정 아님).
       되돌림 = 이 주석과 [D4] 를 지우고 [D1]·[D2] 의 장부를 소환 예산 장부로 바꾼다. */
    const gLine = (fs.readFileSync(CUR_M, 'utf8').match(/^\|[^\n]*최대 유입 축 비중[^\n]*소환 예산 장부[^\n]*$/m) || [])[0];
    R.push({ n: '[D4] 정정10 장부(소환 예산 = 유입 − 소환 외 씽크)의 최대 축 — **관측**(판정 아님 · 23-2 정정11)',
             got: gLine ? gLine.split('|').slice(2, 4).map(s => s.trim()).join(' / ') : '(표에 줄 없음)',
             want: '(기록)', pass: !!gLine });

    /* ── [E] 측정표 ↔ 제품 정합 ──────────────────────────────────────────── */
    console.log('\n[E] 측정표 ↔ 제품 정합 — «상수만 바꾸고 봇을 안 돌린» 커밋을 잡는다');
    const capMin = (SRC.match(/const\s+OFF_DAY_CAP_MIN\s*=\s*(\d+)\s*;/) || [])[1];
    const days = cur.j.days;
    const offDayCur = cur.d.axes['오프라인'] / days;
    const offDayBase = base.d.axes['오프라인'] / days;
    near('[E1] 이 회차 표의 부지런 오프라인/일이 **현 `OFF_DIA_PM`** 으로 설명된다',
         offDayCur, Number(capMin) * PM, 0.05, '하루 예산 ' + capMin + '분 × ' + PM);
    /* 23정정10 — [E1] 의 허용 오차(옛 6%)가 상수 한 눈금(1/15 = 6.67%)과 거의 같아 PM 이 한 칸
       흘러도 통과할 수 있었다. **정수로 못박는 항**을 따로 세운다 — 이 항이 [A2] 의 «75 미만»
       을 실제 값으로 좁히는 자리다(둘이 어긋나면 표나 상수 중 하나가 낡은 것이다). */
    eq('[E1b] 표에서 역산한 분당 값 = 제품 상수 (정수 일치 — 상수를 못박는 항)',
       Math.round(offDayCur / Number(capMin)), PM);
    near('[E2] [전제] 기준선 표의 오프라인/일은 **옛 계수(' + OLD_PM + ')·옛 예산(' + BASE_CAP_MIN + '분)** 로 설명된다 (두 표는 다른 세대다)',
         offDayBase, BASE_CAP_MIN * OLD_PM, 0.06, '하루 예산 ' + BASE_CAP_MIN + '분 × ' + OLD_PM);

    /* ── [R] 되돌림 시험 ────────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 — 오프라인 축만 옛 계수로 되돌린 표는 빨갛다');
    const k = OLD_PM / PM;
    const revAxes = Object.assign({}, cur.d.axes);
    revAxes['오프라인'] = cur.d.axes['오프라인'] * k;
    const revTotal = Object.values(revAxes).reduce((a, x) => a + x, 0);
    const rRev = revTotal / base.d.total;
    yes('[R1] 오프라인을 옛 계수로 되돌리면 부지런 비율이 창(55%)을 **넘는다**',
        rRev > WIN_HI, pct(rRev));
    /* ⚠ 초판은 여기서 «되돌리면 ② 도 위반으로 돌아간다» 를 단언했다가 빨개졌다 — 그 전제가
       틀렸다: §0 **원문 장부**(유입 장부)에서는 ② 가 하향 전에도 46.67% 로 이미 창 안이었다.
       ② 위반은 **정정10 의 장부**(소환 예산 = 유입 − 소환 외 씽크)에서만 성립했다.
       그래서 이 항은 «축 지배가 실제로 바뀌었는가» 만 묻는다 — 자가 못 지키는 것을 단언하지 않는다. */
    const mRev = maxAxis(revAxes, revTotal);
    yes('[R2] 되돌리면 최대 축이 «오프라인» 으로 돌아온다 (하향이 축 지배를 실제로 갈았다)',
        mRev.name === '오프라인' && mRev.share > maxAxis(cur.d.axes, cur.d.total).share,
        mRev.name + ' ' + pct(mRev.share) + ' ↔ 현행 ' + maxAxis(cur.d.axes, cur.d.total).name + ' ' + pct(maxAxis(cur.d.axes, cur.d.total).share));
    /* ⚠ 23정정10(AAM·AAN 일치) — 초판 [R3] 은 «[C2] 의 상한 ∧ [D1]» 을 글자 그대로 되풀이해
       독립 정보가 **0** 이었다(«음성항» 이라는 이름만 붙은 동어반복). 진짜 음성항으로 갈았다:
       **다른 세대의 실제 표**(r22 = 하향 중간 세대, 부지런 6,887,905)를 이 자에 대면 창 밖이다.
       손으로 만든 표본이 아니라 저장소에 커밋된 실측 표라, 이 항이 초록이면 자가 «세대를 실제로
       가른다» 는 뜻이고 빨개지면 자가 아무 표나 통과시킨다는 뜻이다. */
    const r22m = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r22-both.md');
    const r22 = fs.existsSync(r22m) ? incOfMd(fs.readFileSync(r22m, 'utf8'), 'diligent') : null;
    /* ⚠ **24정정8(AAO·AAQ 일치)** — 이 항은 커밋된 두 파일만 읽으므로 **제품 변경으로는 못 빨개진다**
       ([S4] 와 같은 구조 = [전제] 항이다. «진짜 음성항» 이라 부른 24-4 의 표기가 틀렸다).
       그리고 r22-both 의 calib sha 는 `48035eafe0b2` 로 base-k 와 **다르다** — [S1] 이 금지한
       «해시 다른 두 표의 나눗셈» 을 이 항이 자기 안에서 한다. 지우지 않는 이유: 이 항이 재는
       것은 «창이 다른 세대를 실제로 밀어내는가» 이고 그 여유(88% ↔ 상한 55% = 33%p)가 κ 효과
       (실측 4.34%)의 **7.6배**라 결론이 뒤집히지 않는다. ⇒ 이름표를 [전제]로 사실대로 고치고
       sha 가 다르다는 것을 라벨에 적는다(25회차가 κ 맞춘 표본으로 갈면 그때 [R3] 으로 승격). */
    yes('[R3] [전제] **다른 세대의 실제 표**(r22 · 하향 중간 · ⚠ sha 다름)를 이 자에 대면 창 밖이다',
        !!r22 && (r22.total / base.d.total) > WIN_HI,
        r22 ? fmt(r22.total) + ' / ' + fmt(base.d.total) + ' = ' + pct(r22.total / base.d.total)
              + ' (여유 33%p ≫ κ 효과 4.34%)' : '(r22 표 없음)');

    /* ── [S] κ 대조 + ② 말미 창 ──────────────────────────────────────────── */
    console.log('\n[S] 같은 자로 잰 비교인가 · ② 를 말미 창에서도 잰다 (23정정2·3·10)');
    const shaB = calShaOf(bmd), shaC = calShaOf(cmd);
    /* AAL 1순위 — 23회차의 판정 줄은 calib sha 가 다른 두 표의 나눗셈이었다(정정9 경고 위반).
       24회차가 기준선 트리를 이 회차의 κ 캐시로 다시 굴려 맞췄다. 그 사실을 자가 지킨다. */
    eq('[S1] **판정에 쓰는 두 표의 calib sha 가 같다** (정정9 — 해시가 같은 표끼리만 비교다)', shaC, shaB);
    /* ② 는 30일 누적 창만으로는 못 닫는다 — 23회차가 값을 고른 부등식이 말미 창의 것이다. */
    const tD = tailOfMd(cmd, 'diligent'), tC = tailOfMd(cmd, 'casual');
    const mtD = tD && maxAxis(tD.axes, tD.total), mtC = tC && maxAxis(tC.axes, tC.total);
    yes('[S2] ② **말미 창** — 부지런 최대 축 ≤ 50%', !!mtD && mtD.share <= AXIS_CAP,
        mtD ? mtD.name + ' ' + pct(mtD.share) : '(표 없음)');
    yes('[S3] ② **말미 창** — 대충 최대 축 ≤ 50%', !!mtC && mtC.share <= AXIS_CAP,
        mtC ? mtC.name + ' ' + pct(mtC.share) : '(표 없음)');
    /* [전제] — 이 자가 그 결함을 **실제로 잡는가**. 23회차 표(PM=15)에서는 두 항이 빨갛다
       (부지런 52.0% · 대충 56.1%). 이 항이 빨개지면 [S2]·[S3] 은 아무것도 안 지키는 것이다. */
    const r23m = fs.existsSync(R23_M) ? fs.readFileSync(R23_M, 'utf8') : null;
    const t3D = r23m && tailOfMd(r23m, 'diligent'), t3C = r23m && tailOfMd(r23m, 'casual');
    const m3D = t3D && maxAxis(t3D.axes, t3D.total), m3C = t3C && maxAxis(t3C.axes, t3C.total);
    yes('[S4] [전제] 23회차 표(PM=15)에서는 [S2]·[S3] 가 **빨갛다** (자가 그 결함을 실제로 잡는다)',
        !!m3D && !!m3C && m3D.share > AXIS_CAP && m3C.share > AXIS_CAP,
        m3D && m3C ? '부지런 ' + pct(m3D.share) + ' · 대충 ' + pct(m3C.share) : '(r23 표 없음)');

    /* ── [T] ④ 두 정책 간격 ─────────────────────────────────────────────────
       24-7 3번: «`verify758` 에 ④ 항을 세운다(현재 0개) — 비 1.8~2.0 을 판정 줄(교차일 비)로».
       ④ 는 758 이 만든 손해다(24정정6 — 하향 전 비 1.356 이 창 안이었다). 그래서 하향의 자가
       그것을 같이 지키는 것이 맞다. ⚠ 도달일 자체는 **관측**이라 여기서 판정하지 않는다(22-0). */
    console.log('\n[T] ④ 두 정책 간격 — 판정 줄(교차일 비 · 소환 예산 장부 · 22정정4·24정정5)');
    const crC = crossOfMd(cmd);
    yes('[T0] [전제] 이 회차 표에서 판정 줄(교차일 · 소환 예산 장부)을 두 정책 다 읽었다',
        !!crC, crC ? '부지런 ' + crC.dil + '일 · 대충 ' + crC.cas + '일' : '(행 없음)');
    yes('[T1] **④ 교차일 비(대충/부지런)가 §0 창(' + RATIO_LO + '~' + RATIO_HI + ') 안이다**',
        !!crC && crC.ratio >= RATIO_LO && crC.ratio <= RATIO_HI,
        crC ? crC.ratio.toFixed(3) : '(행 없음)');
    /* 표본은 손으로 만든 것이 아니라 **커밋된 직전 세대 표**이고 calib sha 도 base-k 와 같다
       (6a013a86ea41 — [S1] 이 금지한 «해시 다른 두 표» 문제는 없다).
       ⚠ **25회차 비평(AAS) 접수 — 이름표를 [전제]로 고친다.** 이 항은 커밋된 파일만 읽으므로
       **제품 변경으로는 못 빨개진다**(24정정8 이 [R3] 에 대해 내린 판정과 **같은 구조**다).
       초판이 «[음성항]» 이라 부르고 «24정정8 의 두 결함 중 뒤엣것만 없다» 고 적은 것은 반쯤만
       정직했다 — 앞엣것(영구 초록)은 그대로 있다. 항을 지우지 않는 이유는 [R3] 과 같다:
       재는 것이 «창이 다른 세대를 실제로 밀어내는가» 이고 그 여유(2.528 ↔ 상한 2.0 = 26.4%)가
       κ 효과(4.34%)의 6배라 결론이 안 뒤집힌다. 제품 되돌림을 잡는 것은 [E1]·[E1b] 다. */
    const preMd = fs.existsSync(PRE_M) ? fs.readFileSync(PRE_M, 'utf8') : null;
    const crP = preMd ? crossOfMd(preMd) : null;
    yes('[T2] [전제] **직전 세대 표**(r801-post · 같은 κ sha)를 이 자에 대면 창을 **넘는다** (⚠ 커밋된 표만 읽는다 = 제품 변경으로는 안 빨개진다)',
        !!crP && crP.ratio > RATIO_HI,
        crP ? crP.ratio.toFixed(3) + ' (' + calShaOf(preMd) + ')' : '(직전 표 없음)');
    /* 이 회차 손잡이의 주장 자체 — «하루 예산은 대충에 Δ0» (대충은 1회 상한 10.5h=630분에
       먼저 걸리므로 예산 660분은 대충을 안 자른다). 주장이 깨지면 ④ 도 ② 도 뜻이 달라진다. */
    const casCur = curMd.c && curMd.c.axes['오프라인'] / days;
    const preC = preMd ? incOfMd(preMd, 'casual') : null;
    const casPre = preC && preC.axes['오프라인'] / days;
    near('[T3] 대충 오프라인/일은 직전 세대와 **같다** (하루 예산 손잡이는 대충에 Δ0 · 1회 상한이 먼저 자른다)',
         casCur, casPre, 0.02, fmt(casCur) + ' ↔ ' + fmt(casPre));
    /* 그리고 부지런은 실제로 내려왔는가 — 예산 상수로 설명되는가([E1] 의 정책 쌍) */
    /* ⚑ **25회차 비평 3인 일치 접수(AAR·AAS·AAT)** — [T1] 은 **말미 창 W7 하나**에 걸려 있다.
       같은 표의 W 민감도로 다시 나누면 W3 3.080 · W7 1.960 · W14 1.265 · W29 1.266 으로 4개 창 중
       하나만 창 안이다. 지금 그 넷을 **판정**으로 세우면 이 회차를 포함해 **어느 세대도 못 지나므로**
       («자를 결과에 맞춘다» 의 반대 방향 잘못 — 지날 수 없는 자는 다음 회차를 통째로 막는다),
       26회차가 손잡이로 다룰 때까지 **관측 항**으로 찍어만 둔다(§0 «관측» 지위 = [C3]·[D4] 와 같다).
       ⇒ 26회차의 몫: W 축을 어떻게 판정으로 세울지(창을 넓히거나 W 를 규약으로 하나 고정하거나). */
    /* 정책별 [E2] 표에도 같은 머리글이 있으므로 **칸이 넷인 [G] 행**만 고른다(crossOfMd 와 같은 규칙) */
    const wLine = (cmd.split('\n').filter(l => /④ 교차일 —/.test(l) && /소환 예산 장부/.test(l) && l.split('|').length >= 6)[0]) || null;
    R.push({ n: '[T5] ④ 판정 줄의 **말미 창 W 민감도** — **관측**(판정 아님 · 25회차 비평 3인 일치)',
             got: wLine ? wLine.split('|').slice(2, 4).map(s => s.trim()).join(' ‖ ') : '(표에 줄 없음)',
             want: '(기록)', pass: !!wLine });
    yes('[T4] 부지런 오프라인/일은 **내려왔다** (같은 두 표 · 하루 예산이 실제로 자른 축)',
        Number.isFinite(offDayCur) && Number.isFinite(casPre) && offDayCur < (preMd ? incOfMd(preMd, 'diligent').axes['오프라인'] / days : Infinity),
        fmt(offDayCur) + ' ↔ 직전 ' + fmt(preMd ? incOfMd(preMd, 'diligent').axes['오프라인'] / days : NaN));
    /* ── [U] ④ 말미 창 **규약** — 27회차 신설 ────────────────────────────────
       26-10 1번·2번 · [T5] 가 26회차에 «관측» 으로만 찍어 두고 넘긴 자리다. 26-8 이
       «④ 의 통과(1.960)를 **패스 한 축**이 떠받친다» 를 커밋된 네 표만으로 보였으므로,
       이 절이 지키는 것은 값이 아니라 **장부와 창의 규약**이다:
         ⓐ 배제 목록이 코드에 선언돼 있고 «유한 트랙» 을 담는다        → [U1]
         ⓑ 표가 그 목록으로 지은 «말미 정상 장부» 를 스스로 싣는다     → [U2]·[U3]
         ⓒ 창은 규약(정상성)으로 고르고 문턱에 붙지 않는다             → [U4]
         ⓓ 그 장부의 ④ 비는 **관측**으로 찍는다                        → [U5]
       ⚠ [U5] 를 판정으로 올리지 않는 이유는 25-7 이 못박았다 — 지금 세대는 어느 후보도
       이 창을 못 지나므로, 판정으로 세우면 «지날 수 없는 자» 가 다음 회차를 통째로 막는다.
       판정 줄은 [T1] 그대로다. 이 절은 그 [T1] 이 **어느 장부의 수인지**를 표에 붙인다. */
    console.log('\n[U] ④ 말미 창 규약 — 말미 정상 장부(일회성 + 유한 트랙 제외 기울기) · 27회차');
    /* [U0] 이 회차 표는 r26 과 **같은 런의 리플레이**다 — 판정 줄이 자릿수까지 같아야 한다.
       (같지 않으면 «자·규약만 고쳤다» 는 이 회차의 주장이 거짓이다.) */
    const r26md = fs.existsSync(R26_M) ? fs.readFileSync(R26_M, 'utf8') : null;
    const cr26 = r26md ? crossOfMd(r26md) : null;
    yes('[U0] [전제] 이 회차 표는 r26 과 **같은 런**이다 — 판정 줄(교차일 비)이 자릿수까지 같다 (제품 계수 0줄의 증거)',
        !!crC && !!cr26 && crC.dil === cr26.dil && crC.cas === cr26.cas,
        crC && cr26 ? crC.dil + '/' + crC.cas + ' ↔ r26 ' + cr26.dil + '/' + cr26.cas : '(표 없음)');
    const botSrc = fs.readFileSync(path.join(ROOT, 'tools/bot199.js'), 'utf8');
    const mFin = botSrc.match(/const\s+FINITE_KEYS\s*=\s*\[([^\]]*)\]/);
    yes('[U1] 자에 **배제 목록 `FINITE_KEYS`** 선언이 있고 «패스» 를 담는다 (되돌림: 목록을 비우면 정상 장부 = 전체 장부)',
        !!mFin && /패스/.test(mFin[1]), mFin ? mFin[1].trim() : '(선언 없음)');
    /* [E4] 표 — 채택 행(✅)을 두 정책에서 다 읽는다. 표가 스스로 적은 네 수로 산술을 검산한다. */
    const e4Of = (md, pol) => {
      const head = '### [E4] ④ 말미 창 **규약**';
      const seg = md.split(head).filter(s => s.slice(0, 120).includes(POLNAME[pol]))[0];
      if (!seg) return null;
      const line = seg.split('\n').filter(l => /^\|\s*\*\*W\d+\*\*\s*✅/.test(l))[0];
      if (!line) return null;
      const c = line.split('|').map(s => s.trim());
      const num = s => Number(String(s).replace(/[^\d.]/g, ''));
      return { W: num(c[1]), full: num(c[2]), once: num(c[3]), fin: num(c[4]), cont: num(c[5]), cross: num(c[6]), stat: parseFloat(c[7]) };
    };
    const e4D = e4Of(cmd, 'diligent'), e4C = e4Of(cmd, 'casual');
    yes('[U2] 표 [E4] 가 **두 정책 다** 창을 규약으로 골랐다(✅ 채택 행이 있다)',
        !!e4D && !!e4C, e4D && e4C ? 'W' + e4D.W + ' · W' + e4C.W : '(채택 행 없음)');
    /* ⚠ **초판이 이 항을 «항등식» 으로 세웠다가 대충에서 빨개졌다**(24,738−3,794=20,944 ✅ ·
       21,307−5,804=15,503 ↔ 표 15,613 = +0.70%). 결함이 아니라 **네 칸이 각각 시드별 p50** 이라
       그렇다 — med(a−b) ≠ med(a) − med(b). [E3] 이 이미 같은 어긋남을 각주로 적어 둔 자리이고
       («med(합) ≠ Σ med(축)»), 교차일은 **시드별 정상 기울기**로 밀므로 판정에 쓰는 수는
       `cont` 칸이 맞다. ⇒ 항등식이 아니라 **정합 밴드**로 세운다(±2% — 이 세대 실측 0.70% 의
       세 배 미만이라 «맞춰 놓은 문턱» 이 아니다). 표도 그 사실을 각주로 스스로 적는다. */
    const identOff = (x) => Math.abs((x.full - x.once - x.fin) - x.cont) / Math.max(1, x.cont);
    yes('[U3] 채택 행의 **정합** — 정상 ≈ 전체 − 일회성 − 유한 (±2% · 네 칸이 각각 시드별 p50 이라 항등식이 아니다)',
        !!e4D && !!e4C && identOff(e4D) <= 0.02 && identOff(e4C) <= 0.02,
        e4D && e4C ? `부지런 ${fmt(e4D.full)}−${fmt(e4D.once)}−${fmt(e4D.fin)}=${fmt(e4D.full - e4D.once - e4D.fin)} ↔ ${fmt(e4D.cont)} (${(100 * identOff(e4D)).toFixed(2)}%) · 대충 ${fmt(e4C.full - e4C.once - e4C.fin)} ↔ ${fmt(e4C.cont)} (${(100 * identOff(e4C)).toFixed(2)}%)` : '(행 없음)');
    /* 문턱에 **붙지 않는다** — 574·709·825 가 겪은 «문턱 플레이키» 를 규약 자신이 되풀이하지
       않게 하는 항이다. 여유 2%p 는 이 세대 실측(10.0% vs 15%)의 절반보다 작은 값이다. */
    yes('[U4] 채택 창의 ⓑ 정상성이 문턱(15%)에 **붙지 않는다** — 여유 ≥ 2%p (문턱 플레이키 예방 · 574·709·825 계보)',
        !!e4D && !!e4C && e4D.stat <= 13 && e4C.stat <= 13,
        e4D && e4C ? e4D.stat + '% · ' + e4C.stat + '%' : '(행 없음)');
    /* [U5] 관측 — 정상 장부의 ④ 비. [G] 의 신설 행에서 읽는다(라벨에 «소환 예산 장부» 를
       안 쓰므로 crossOfMd 의 판정 줄과 섞이지 않는다). */
    const uLine = (cmd.split('\n').filter(l => /④ 교차일 — \*\*관측\*\*/.test(l) && /말미 정상 장부/.test(l) && l.split('|').length >= 6)[0]) || null;
    const uNum = s => { const m = String(s).match(/([\d,]+(?:\.\d+)?)/); return m ? Number(m[1].replace(/,/g, '')) : NaN; };
    const uD = uLine ? uNum(uLine.split('|')[2]) : NaN, uC = uLine ? uNum(uLine.split('|')[3]) : NaN;
    const uRatio = uD > 0 ? uC / uD : NaN;
    R.push({ n: '[U5] ④ 비 — **말미 정상 장부** 〔관측 · 판정은 [T1]〕 · §0 창 ' + RATIO_LO + '~' + RATIO_HI,
             got: Number.isFinite(uRatio) ? uRatio.toFixed(3) + (uRatio < RATIO_LO ? ` (창 밖 ${((uRatio / RATIO_LO - 1) * 100).toFixed(1)}%)` : '') : '(행 없음)',
             want: '(기록)', pass: !!uLine });
    /* [전제] — 이 회차의 발견 자체가 실재하는가. 전체 장부와 정상 장부의 ④ 비가 거의 같다면
       26-8 의 «패스가 떠받친다» 도, 이 절의 규약도 잴 것이 없다는 뜻이다. */
    yes('[U6] [전제] **장부를 바꾸면 ④ 비가 실제로 달라진다** — 전체 ↔ 정상 차 ≥ 10% (이 회차의 발견이 실재한다)',
        !!crC && Number.isFinite(uRatio) && Math.abs(crC.ratio - uRatio) / crC.ratio >= 0.10,
        crC && Number.isFinite(uRatio) ? crC.ratio.toFixed(3) + ' ↔ ' + uRatio.toFixed(3)
              + ' (' + (100 * (uRatio - crC.ratio) / crC.ratio).toFixed(1) + '%)' : '(행 없음)');

  }

  /* ── 결과 ─────────────────────────────────────────────────────────────── */
  console.log('');
  let ok = 0;
  R.forEach(r => {
    console.log((r.pass ? '  ✅ ' : '  ❌ ') + r.n + '  →  ' + r.got + (r.pass ? '' : '   (기대 ' + r.want + ')'));
    if (r.pass) ok++;
  });
  console.log('\nVERIFY758 ' + ok + '/' + R.length + (ok === R.length ? ' PASS' : ' FAIL'));
  process.exit(ok === R.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
