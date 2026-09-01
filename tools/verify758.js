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
const CUR_J  = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r24-both.json');
const CUR_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r24-both.md');
/* 23회차 표 — [S4] 가 «이 자가 그 결함을 실제로 잡는가» 를 되돌림 표본으로 쓴다(PM=15 세대) */
const R23_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r23-both.md');

/* 옛 계수 — 되돌림 시험의 «빨강 표본» 이자 [E2] 의 기준선 설명값 */
const OLD_PM = 75;
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
     살아 있는지만 여기서 확인한다(값 판정은 24회차 안건 · 23-6). */
  yes('[A6] 결3 ⓑ 보정 손잡이 `PASS_OFF_MUL` 선언이 살아 있다 (23-6 안건이 가리키는 자리)',
      /const\s+PASS_OFF_MUL\s*=\s*[\d.]+\s*;/.test(SRC));

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
    near('[E2] [전제] 기준선 표의 오프라인/일은 **옛 계수(' + OLD_PM + ')** 로 설명된다 (두 표는 다른 세대다)',
         offDayBase, Number(capMin) * OLD_PM, 0.06, '하루 예산 ' + capMin + '분 × ' + OLD_PM);

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
