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
   ⚠ 기준선은 **.md 만** 커밋돼 있다(22회차가 격리 사본으로 굴린 열 — json 은 남기지 않았다).
   그래서 기준선은 [E] 표를 파싱해 읽고, 이 회차는 json 을 읽는다. 두 경로가 **같은 수**를
   내는지는 [C1e] 가 이 회차 표를 양쪽으로 읽어 대조한다(자가 자기 파서를 먼저 잰다). */
const BASE_M = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r22-base.md');
const CUR_J  = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r23-both.json');
const CUR_M  = path.join(ROOT, 'docs/review/199-bot-2026-09-01-r23-both.md');

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
  yes('[A2] `OFF_DIA_PM` 이 옛 계수(' + OLD_PM + ')에서 내려왔다 — 758 하향이 살아 있다',
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
    const cj = readJson(CUR_J);
    base = { d: incOfMd(bmd, 'diligent'), c: incOfMd(bmd, 'casual') };
    cur  = { d: incOf(cj, 'diligent'), c: incOf(cj, 'casual'), j: cj };
    const curMd = { d: incOfMd(cmd, 'diligent'), c: incOfMd(cmd, 'casual') };
    /* 같은 자로 잰 두 표인가 — 일수·시드 수·정책이 갈리면 비율은 뜻이 없다 */
    const bRun = (bmd.match(/--days=(\d+)\s+--seeds=(\d+)/) || []);
    eq('[C1] 두 표의 일수가 같다', cur.j.days, Number(bRun[1]));
    eq('[C1b] 두 표의 시드 수가 같다', cur.d.seeds, Number(bRun[2]));
    yes('[C1c] 기준선 표에 정책 둘이 다 실려 있다', !!(base.d && base.c),
        '부지런 ' + fmt(base.d && base.d.total) + ' · 대충 ' + fmt(base.c && base.c.total));
    eq('[C1d] 규칙 위반 0건 (등재문 ⑦ — 0 이어야 결과를 믿는다)', (cur.j.viol || []).length, 0);
    /* 자가 자기 파서를 먼저 잰다 — 같은 회차 표를 json 으로 읽은 값과 md 로 읽은 값이 같은가.
       (기준선은 md 로만 읽으므로, 이 항이 빨개지면 [C2] 의 분모·분자가 다른 자로 잰 것이 된다) */
    near('[C1e] [전제] 같은 표를 json 으로 읽은 합 = md [E] 표의 합 (파서 대조)',
         cur.d.total, curMd.d ? curMd.d.sum : NaN, 0.001);

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
         offDayCur, Number(capMin) * PM, 0.06, '하루 예산 ' + capMin + '분 × ' + PM);
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
    /* 음성항 — 되돌림이 «무엇이든 빨갛게 하는» 손이 아님을 보인다(현행 표는 [C2]·[D1] 초록) */
    yes('[R3] [음성항] 같은 산수를 현행 표에 대면 초록이다 (되돌림이 만능 빨강이 아니다)',
        (cur.d.total / base.d.total) <= WIN_HI && maxAxis(cur.d.axes, cur.d.total).share <= AXIS_CAP);
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
