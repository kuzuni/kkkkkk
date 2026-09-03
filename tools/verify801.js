'use strict';
/* ==========================================================================
   verify801 — 업적 퀘스트(799) 다이아 단가 재역산의 자        (작업 801 · 199 §0)
   --------------------------------------------------------------------------
   무엇을 지키는가
     799 가 22 퀘스트를 «수령 횟수» 에서 **«누적 플레이량»** 으로 바꾸면서 `QUESTS[].dia`
     다섯은 «칸값» 이 아니라 **플레이 한 단위의 단가**가 됐다(처치 1마리 = dia/100 ·
     강화 1회 = dia/10 · 소환 1회 = dia/15 · 스테이지 1칸 = dia · 도감 1종 = dia/5).
     799 는 그 다섯을 옛 0 번째 칸의 값(90·140·100·80·180) 그대로 두고 «수치 확정은 199 몫»
     이라고 넘겼고(PROGRESS 801), bot199 30일 실측이 그 값이 §0 과녁을 깬 것을 찍었다:

       퀘스트 축 133,538 → **935,755**(×7.01) · 부지런 총 유입 50.65% → **61.16%**
       (과녁 = 기준선의 **50% ± 5%p** — 758 이 세운 §0 개정판)

     801 은 다섯을 한 계수 **k = 133,538 ÷ 935,755 = 0.1427** 로 같이 눌러 축을
     «758 판정이 서 있던 크기» 로 되돌린다 ⇒ 13 · 20 · 14 · 11 · 26.

   왜 30일 봇을 자 안에서 안 돌리는가 (758 과 같은 이유)
     한 실행이 400~600초다. 그래서 이 자는 **커밋된 표 세 장**을 읽는다 —
     기준선(하향 전) · 이 회차(수리 후) · **수리 전(옛 단가)**. 세 번째가 [R] 의 빨강 표본이라
     «무르게 푼 수리가 아님» 이 표로 증명된다(334·348·364 규약).
     표가 낡으면 못 잡는 구멍은 [B] 가 막는다 — 표의 퀘스트 축이 **지금 제품의 다섯 값과
     그 표가 같이 실은 플레이량(qv·best·own)** 으로 재구성되는지 항등식으로 물어서,
     «상수만 바꾸고 봇을 안 돌린» 커밋은 [B] 에서 빨개진다.

   절
     [A] 정적 — 제품의 다섯 값 · 정수/양수 · 주인이 준 난도 순서 보존 · step 불변
     [B] 표 ↔ 제품 정합 — 이 회차 표의 퀘스트 축 = Σ(단가 × 플레이량) (파생 표 금지)
     [C] 과녁 — 30일 총 유입이 기준선의 45~55%. **부지런이 판정** · 대충은 관측 보고
     [D] ② 한 축 ≤50% (§0 원문 장부 = 유입 장부)
     [E] 세대 대조 — 세 표의 κ sha 가 같다(다른 세대끼리 나눈 판정이 아니다)
     [R] 되돌림 시험 — 옛 단가로 잰 표에서는 [C] 가 **빨갛다**(자가 그 결함을 실제로 잡는다)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* 표 세 장 — 파일 이름을 여기 한 곳에만 적는다.
   BASE = 하향 전 기준선(758 24회차가 이 회차의 κ 캐시로 다시 굴린 열 · 분모)
   CUR  = 801 수리 후(이 회차)
   PRE  = 801 수리 전(옛 단가 90·140·100·80·180 · [R] 의 빨강 표본) */
const BASE_J = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r24-base-k.json');
const BASE_M = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r24-base-k.md');
const CUR_J  = path.join(ROOT, 'docs/review/199-bot-2026-09-02-r801-post.json');
const CUR_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-02-r801-post.md');
const PRE_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-02-r801-pre.md');

/* 과녁 창 — §0 개정(758): 50% ± 5%p · ② 한 축 ≤ 50% */
const WIN_LO = 0.45, WIN_HI = 0.55, AXIS_CAP = 0.50;
/* 801 이 정한 단가와 그것을 낳은 계수 — 되돌림 값(799 세대)도 같이 적는다 */
const NEW = { kill: 13, stage: 20, summon: 14, upg: 11, coll: 26 };
const OLD = { kill: 90, stage: 140, summon: 100, upg: 80, coll: 180 };
/* 주인이 준 등차 수열(799 · 불변) — 단가를 눌러도 이 다섯은 그대로여야 한다 */
const STEP = { kill: 100, stage: 1, summon: 15, upg: 10, coll: 5 };

const R = [];
const yes = (n, got, d) => R.push({ n: n + (d !== undefined && d !== '' ? ' — ' + d : ''), got: String(got), want: 'true', pass: got === true });
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const near = (n, got, want, tol, d) => {
  const ok = Number.isFinite(got) && Number.isFinite(want) && want !== 0 && Math.abs(got / want - 1) <= tol;
  R.push({ n: n + (d ? ' — ' + d : ''), got: fmt(got) + ' (비 ' + (got / want).toFixed(4) + ')', want: '≈' + fmt(want) + ' ±' + (tol * 100).toFixed(1) + '%', pass: ok });
};
const fmt = v => Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : String(v);
const pct = v => (v * 100).toFixed(2) + '%';

/* ── 표 읽기 (758 과 같은 자) ───────────────────────────────────────────── */
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function incOf(j, pol) {
  const seeds = Object.values(j.policies[pol]);
  const axes = {};
  seeds.forEach(s => Object.entries(s.diaIn || {}).forEach(([k, v]) => { axes[k] = (axes[k] || 0) + v; }));
  Object.keys(axes).forEach(k => { axes[k] /= seeds.length; });
  return { axes, total: Object.values(axes).reduce((a, b) => a + b, 0), seeds: seeds.length, days: j.days };
}
const POLNAME = { diligent: '부지런한 유저', casual: '대충 유저' };
function incOfMd(md, pol) {
  const i = md.indexOf('### [E] 다이아 유입/씽크 — ' + POLNAME[pol]);
  if (i < 0) return null;
  const axes = {};
  for (const line of md.slice(i).split('\n').slice(1)) {
    if (/^\|\s*\*\*합\*\*/.test(line)) break;
    const m = line.match(/^\|\s*([^|*]+?)\s*\|\s*([\d,]+)\s*\|/);
    if (m) axes[m[1]] = Number(m[2].replace(/,/g, ''));
  }
  const total = Object.values(axes).reduce((a, b) => a + b, 0);
  return total ? { axes, total } : null;
}
const calShaOf = md => ((md.match(/calib sha\s+\*{0,2}([0-9a-f]{12})/) || [])[1]) || null;
function maxAxis(axes, total) {
  let name = null, v = -1;
  Object.entries(axes).forEach(([k, x]) => { if (x > v) { v = x; name = k; } });
  return { name, v, share: total ? v / total : 0 };
}

/* 제품에서 QUESTS 다섯 행을 읽는다 — 표를 손으로 옮겨 적지 않는다(402 규약). */
function questsOfSrc() {
  const i = SRC.indexOf('const QUESTS = [');
  if (i < 0) return null;
  const body = SRC.slice(i, SRC.indexOf('];', i));
  const out = {};
  body.replace(/\{\s*id:'([a-z]+)'[^}]*?step:(\d+)[^}]*?dia:(\d+)/g, (_, id, st, d) => {
    out[id] = { step: +st, dia: +d };
    return '';
  });
  return Object.keys(out).length ? out : null;
}

/* 제품에서 DQUESTS 의 하루 정액 합을 읽는다 — 같은 규약(402 «표를 손으로 옮겨 적지 않는다»).
   ⚑ 199 30회차 이관: [B3] 이 이 합을 **8500 이라는 손 상수**로 들고 있었는데, 30회차가 이관(29-5 ⓓ)
   으로 다섯을 ×2.6 하자 그 문턱이 제품보다 낮아져 **실재 값을 빨갛다고 말할 자**가 됐다.
   문턱을 새 숫자로 바꿔 적으면 다음 이관에서 똑같이 부패하므로 **제품에서 읽게** 바꾼다. */
function dqSumOfSrc() {
  const i = SRC.indexOf('const DQUESTS = [');
  if (i < 0) return null;
  const body = SRC.slice(i, SRC.indexOf('];', i));
  let sum = 0, n = 0;
  body.replace(/\{\s*id:'([a-z]+)'[^}]*?dia:(\d+)/g, (_, id, d) => { sum += +d; n++; return ''; });
  return n ? { sum, n } : null;
}

/* 퀘스트 축 이름 — 801 이 봇 장부에서 **업적**(누적 플레이량 × 단가)과 **일일**(하루 정액)을
   갈랐다. 801 이전 표(r24 · r801-pre)는 합본 한 축이라 이름이 하나다. 그래서 «퀘스트 몫» 은
   항상 아래 셋을 다 더해서 읽는다(어느 세대의 표든 같은 값이 나온다). */
const QKEYS = ['퀘스트', '퀘스트(업적)', '퀘스트(일일)'];
const qSum = axes => QKEYS.reduce((s, k) => s + (axes[k] || 0), 0);

/* [B] 항등식 — 표가 같이 실은 플레이량으로 **업적** 축을 재구성한다.
   한 시드의 30일 말 상태에서 받은 칸 수는 `floor(누적 ÷ step)` 이고(799 등차 · 절대 진행),
   축 합계는 그 칸 수 × 단가다. 봇은 매일 `claimAllQuests()` 를 부르므로 마지막 스냅의
   누적값 하나로 30일 총액이 그대로 설명된다 — 중간 수령이 칸을 앞당길 뿐 총량은 같다. */
function questModel(j, pol, price) {
  const seeds = Object.values(j.policies[pol]);
  if (!seeds.length) return null;
  let miss = 0, sum = 0;
  seeds.forEach(s => {
    const f = s.final || {};
    const q = f.qv;
    if (!q) { miss++; return; }
    sum += Math.floor((q.kills     | 0) / STEP.kill)   * price.kill
         + Math.floor((f.best      | 0) / STEP.stage)  * price.stage
         + Math.floor((q.summons   | 0) / STEP.summon) * price.summon
         + Math.floor((q.upgrades  | 0) / STEP.upg)    * price.upg
         + Math.floor((f.own       | 0) / STEP.coll)   * price.coll;
  });
  return miss ? null : sum / seeds.length;
}

(async () => {
  /* ── [A] 정적 — 제품의 다섯 값 ──────────────────────────────────────── */
  console.log('[A] 정적 — 제품 `QUESTS[].dia`');
  const Q = questsOfSrc();
  yes('[A0] 제품에서 `QUESTS` 표를 읽었다', !!Q, Q ? Object.keys(Q).join(' ') : '(못 읽음)');
  /* ⚑ 199 30회차 이관 — [B3] 의 상한을 제품에서 읽는다(손 상수 8,500 폐기) */
  const DQ = dqSumOfSrc();
  yes('[A3] [전제] 제품에서 `DQUESTS` 하루 정액 합을 읽었다 ([B3] 이 이 값을 상한으로 쓴다)',
      !!(DQ && DQ.n >= 5 && DQ.sum > 0), DQ ? DQ.n + '칸 · 합 ' + fmt(DQ.sum) + '/일' : '(못 읽음)');
  if (Q) {
    Object.keys(NEW).forEach(id => {
      eq('[A1:' + id + '] 단가 = 801 재정박 값', Q[id] && Q[id].dia, NEW[id]);
      /* 주인이 준 등차 수열은 801 이 건드리는 축이 아니다 — 단가만 눌렀음을 못박는다 */
      eq('[A2:' + id + '] `step` 은 799(주인 수열) 그대로', Q[id] && Q[id].step, STEP[id]);
    });
    const vals = Object.keys(NEW).map(id => Q[id] && Q[id].dia);
    yes('[A3] 다섯 다 정수 · 1 이상 (표기 = 지급 · 156 규약)',
        vals.every(v => Number.isInteger(v) && v >= 1), vals.join(' · '));
    /* 주인이 준 난도 순서 — 도감 > 스테이지 > 소환 > 처치 > 강화. 한 계수로 눌렀으므로
       순서는 보존돼야 한다. 이 항이 빨개지면 «눌렀다» 가 아니라 «다시 매겼다» 는 뜻이다. */
    const ordOK = Q.coll.dia > Q.stage.dia && Q.stage.dia > Q.summon.dia
               && Q.summon.dia > Q.kill.dia && Q.kill.dia > Q.upg.dia;
    yes('[A4] 난도 순서 보존 (도감 > 스테이지 > 소환 > 처치 > 강화)', ordOK,
        [Q.coll.dia, Q.stage.dia, Q.summon.dia, Q.kill.dia, Q.upg.dia].join(' > '));
    /* 되돌림 값이 살아 있으면 재정박이 안 된 것이다(799 세대 표본) */
    yes('[A5] 799 세대 값(90·140·100·80·180)이 하나도 안 남았다',
        Object.keys(OLD).every(id => Q[id].dia !== OLD[id]));
    /* 한 계수로 눌렀는가 — 반올림 여지(±5%)를 준 뒤 다섯이 같은 k 를 가리키는지 */
    const ks = Object.keys(NEW).map(id => Q[id].dia / OLD[id]);
    const kMin = Math.min(...ks), kMax = Math.max(...ks);
    yes('[A6] 다섯이 **한 계수**로 눌렸다 (반올림 폭 ≤ 6%)', kMax / kMin - 1 <= 0.06,
        'k ' + kMin.toFixed(4) + '~' + kMax.toFixed(4));
  }

  /* ── 표 ─────────────────────────────────────────────────────────────── */
  const haveAll = [BASE_J, BASE_M, CUR_J, CUR_M, PRE_M].every(p => fs.existsSync(p));
  yes('[C0] 표 세 장이 다 있다 (기준선 · 이 회차 · 수리 전)', haveAll,
      [BASE_M, CUR_M, PRE_M].map(p => path.basename(p) + (fs.existsSync(p) ? '' : ' ✗')).join(' · '));

  if (haveAll && Q) {
    const bj = readJson(BASE_J), cj = readJson(CUR_J);
    const bmd = fs.readFileSync(BASE_M, 'utf8');
    const cmd = fs.readFileSync(CUR_M, 'utf8');
    const pmd = fs.readFileSync(PRE_M, 'utf8');

    /* ── [E] 세대 대조 ─────────────────────────────────────────────────── */
    console.log('\n[E] 세대 대조 — 세 표가 같은 κ 로 굴렀는가');
    const shaB = calShaOf(bmd), shaC = calShaOf(cmd), shaP = calShaOf(pmd);
    eq('[E1] 기준선 ↔ 이 회차 κ sha 일치', shaC, shaB);
    eq('[E2] 수리 전 ↔ 이 회차 κ sha 일치 ([R] 이 같은 세대의 표를 쓴다)', shaP, shaC);
    eq('[E3] 세 표 다 30일', [bj.days, cj.days, 30].join('/'), '30/30/30');
    yes('[E4] 정책 둘이 다 실려 있다',
        !!(cj.policies && cj.policies.diligent && cj.policies.casual),
        cj.policies ? Object.keys(cj.policies).join(' · ') : '(없음)');

    /* ── [B] 표 ↔ 제품 정합 ────────────────────────────────────────────── */
    console.log('\n[B] 표 ↔ 제품 정합 — **업적** 축이 «단가 × 플레이량» 으로 재구성되는가');
    const NOW = { kill: Q.kill.dia, stage: Q.stage.dia, summon: Q.summon.dia, upg: Q.upg.dia, coll: Q.coll.dia };
    ['diligent', 'casual'].forEach(pol => {
      const ax = incOf(cj, pol).axes;
      const meas = ax['퀘스트(업적)'];
      const model = questModel(cj, pol, NOW);
      /* 봇의 마지막 수령 뒤에도 카운터가 도는 꼬리(그날 못 받은 칸)가 있어 모델이 살짝 크다.
         ±3% 는 그 꼬리의 폭이고, «상수만 바꾸고 봇을 안 돌린» 커밋은 이 폭을 한참 넘는다
         (801 의 재정박은 ×7 이다). */
      /* 합본 이름이 남아 있으면 표가 801 이전 세대다 — 그 표로는 [B1] 을 못 잰다.
         ⚠ «일일» 축은 **없을 수 있다**(대충 유저는 30일 동안 일일 퀘스트를 한 번도 못 채운다 —
         실측 0건). 그래서 [B0] 은 «업적이 있고 합본이 없다» 만 묻는다. */
      yes('[B0:' + pol + '] 이 회차 표가 **업적** 축을 따로 싣는다 (801 장부 분리 · 합본 잔재 0)',
          Number.isFinite(ax['퀘스트(업적)']) && ax['퀘스트'] === undefined,
          '업적 ' + fmt(ax['퀘스트(업적)']) + ' · 일일 ' + (ax['퀘스트(일일)'] === undefined ? '없음(수령 0건)' : fmt(ax['퀘스트(일일)'])));
      near('[B1:' + pol + '] 표의 **업적** 축 ≈ Σ(단가 × 플레이량)', meas, model, 0.03,
           '모델은 마지막 스냅(`qv`·best·own)으로 다시 센 값');
      /* 일일은 하루 정액(DQUESTS 합)이라 30일 상한이 있다 — 업적이 일일 자리로 새면 빨갛다.
         ⚑ 199 30회차 이관 — 상한을 **제품에서 읽는다**(옛 손 상수 8,500 은 30회차 이관으로 부패했다). */
      const dq = ax['퀘스트(일일)'] || 0;
      const dqCap = (DQ && DQ.sum) || 0;
      yes('[B3:' + pol + '] **일일** 축이 하루 정액 × 30일 상한 안이다 (두 축이 안 섞였다)',
          dqCap > 0 && dq >= 0 && dq <= dqCap * 30,
          fmt(dq) + ' ≤ ' + fmt(dqCap * 30) + ' (제품 DQUESTS ' + (DQ ? DQ.n : 0) + '칸 합 ' + fmt(dqCap) + '/일)');
    });
    /* [전제] — 옛 단가를 넣으면 이 항등식이 **깨져야** 한다. 안 깨지면 [B1] 은 아무것도 안 잰다. */
    const measD = incOf(cj, 'diligent').axes['퀘스트(업적)'];
    const modelOld = questModel(cj, 'diligent', OLD);
    yes('[B2] [전제] 같은 표에 **옛 단가**를 넣으면 [B1] 이 깨진다 (자가 제품을 실제로 읽는다)',
        Number.isFinite(modelOld) && Math.abs(modelOld / measD - 1) > 0.03,
        '옛 단가 모델 ' + fmt(modelOld) + ' vs 표 ' + fmt(measD));

    /* ── [C] 과녁 ──────────────────────────────────────────────────────── */
    console.log('\n[C] 과녁 — 30일 총 유입 ÷ 기준선 (§0 개정 · 45~55%)');
    const bD = incOf(bj, 'diligent'), cD = incOf(cj, 'diligent');
    const bC = incOf(bj, 'casual'),   cC = incOf(cj, 'casual');
    const shD = cD.total / bD.total, shC = cC.total / bC.total;
    yes('[C1] **부지런 30일 총 유입 = 기준선의 50% ± 5%p** (판정 줄)',
        shD >= WIN_LO && shD <= WIN_HI,
        fmt(cD.total) + ' ÷ ' + fmt(bD.total) + ' = ' + pct(shD));
    yes('[C2] 대충도 창 안 (관측 보고 — 판정은 [C1])', shC >= WIN_LO && shC <= WIN_HI,
        fmt(cC.total) + ' ÷ ' + fmt(bC.total) + ' = ' + pct(shC));
    /* json ↔ md 대조 — 자가 자기 파서를 먼저 잰다(758 [C1e] 규약) */
    const cmdD = incOfMd(cmd, 'diligent');
    near('[C3] 이 회차 표의 json ↔ md 합계 일치 (자가 자기 파서를 먼저 잰다)',
         cmdD ? cmdD.total : NaN, cD.total, 0.005);

    /* ── [D] ② 한 축 ≤50% ─────────────────────────────────────────────── */
    console.log('\n[D] ② 한 축 ≤50% — §0 원문 장부(유입 장부)');
    const mD = maxAxis(cD.axes, cD.total), mC = maxAxis(cC.axes, cC.total);
    yes('[D1] 부지런 최대 유입 축 ≤ 50%', mD.share <= AXIS_CAP, mD.name + ' ' + pct(mD.share));
    yes('[D2] 대충 최대 유입 축 ≤ 50%', mC.share <= AXIS_CAP, mC.name + ' ' + pct(mC.share));
    /* 801 이 실제로 누른 축이 그 자리에서 내려왔는가 — «총합만 맞추고 축은 그대로» 를 막는다.
       두 세대의 표를 같은 자로 읽으려고 합본·분리 세 이름을 다 더한다(QKEYS). */
    const qShareD = qSum(cD.axes) / cD.total;
    yes('[D3] 퀘스트 몫(업적+일일) ≤ 10% (재정박 전 19.6% 에서 내려왔다)', qShareD <= 0.10, pct(qShareD));

    /* ── [R] 되돌림 시험 ───────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 옛 단가로 잰 표에서는 [C1]·[D3] 이 빨갛다');
    const pD = incOfMd(pmd, 'diligent'), pC = incOfMd(pmd, 'casual');
    const pShD = pD ? pD.total / bD.total : NaN;
    yes('[R1] [전제] 수리 전 표에서는 **부지런이 창 밖**이다 (자가 그 결함을 실제로 잡는다)',
        !!pD && pShD > WIN_HI, pD ? fmt(pD.total) + ' ÷ ' + fmt(bD.total) + ' = ' + pct(pShD) : '(표 없음)');
    const pq = pD ? qSum(pD.axes) / pD.total : NaN;
    yes('[R2] [전제] 수리 전 퀘스트 몫이 10% 를 넘는다', !!pD && pq > 0.10,
        pD ? pct(pq) : '(표 없음)');
    /* 음성항 — 수리 전에도 퀘스트 **밖** 축은 안 움직였다. 801 이 다른 축을 건드리지 않았다는
       증거이고, 이 항이 빨개지면 [C1] 의 개선을 퀘스트 몫으로 읽으면 안 된다.
       ±2% 는 되먹임 폭이다(다이아가 줄면 소환이 줄고 스테이지 패스가 조금 늦다 — 실측 −0.50%). */
    if (pD) {
      const others = a => Object.entries(a).filter(([k]) => !QKEYS.includes(k)).reduce((x, [, v]) => x + v, 0);
      near('[R3] 음성항 — 퀘스트 **밖** 축 합계는 수리 전후가 같다 (801 은 한 축만 눌렀다)',
           others(cD.axes), others(pD.axes), 0.02);
    }
    yes('[R4] [전제] 대충도 수리 전에는 이 회차보다 컸다', !!pC && pC.total > cC.total,
        pC ? fmt(pC.total) + ' → ' + fmt(cC.total) : '(표 없음)');
  }

  /* ── 결과 ─────────────────────────────────────────────────────────────── */
  console.log('');
  let ok = 0;
  R.forEach(r => {
    console.log((r.pass ? '  ✅ ' : '  ❌ ') + r.n + '  →  ' + r.got + (r.pass ? '' : '   (기대 ' + r.want + ')'));
    if (r.pass) ok++;
  });
  console.log('\nVERIFY801 ' + ok + '/' + R.length + (ok === R.length ? ' PASS' : ' FAIL'));
  process.exit(ok === R.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
