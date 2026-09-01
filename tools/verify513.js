/* 작업 513 게이트 — «출석 보상 1~7일 무한 순환 · 8일차 이후 칸 없음»
 *
 *   node tools/verify513.js   → 마지막 줄이 `VERIFY513 PASS n/n` 이어야 한다.
 *
 * 주인 지시(2026-08-31): «출석보상 1~7일로 순환하게 하고 8일이후를 넣지마 · 1부터 7일이 무한으로 순환».
 *
 * 이 자가 묻는 것은 **구조**다(값은 199 몫 — 326·331·398 과 같은 처리):
 *   [A] 표      — `ATTEND.length === 7` · 출석 절에 `% 28`·주차 계산 리터럴 0건
 *   [B] 수령    — `S.att.n` 을 0·6·7·13·14·27·28·53·99 로 실로드해 받는 칸 = `n % 7`
 *                 (8일차 이후 칸이 **한 번도** 안 나온다)
 *   [C] 팝업    — 언제나 7칸(격자 6 + 전폭 1) · 라벨 «1일 차»~«7일 차» · «8일 차» 이상 문구 0건
 *   [D] 구 세이브 — n=53 을 실로드해 수령 가능 · 칸 = 6일차(53 % 7 = 4 → #4)
 *   [E] 대조군  — 36 출석 패스 진행도는 **여전히 누적 n**(순환에 안 끌려간다) ·
 *                 던전 입장권 +`DUN_TRY` 불변(204)
 *   [R] 되돌림  — 28칸 사본을 만들어 [A]·[B]·[C] 가 **실제로 빨개지는지** 본다
 *
 * ⚑ 334 처방 — «무르게 푼 수리» 를 §R 이 못박는다. 되돌림 사본이 초록이면 이 자는 아무것도 안 묻는 것이다.
 * ⚑ 328 교훈 — 항을 눌러 초록으로 되돌리지 말고 «누른 항을 묻는 항» 을 둔다: [A-c] 가 그 자리다
 *   (`% ATTEND.length` 로 갈아 끼운 것을 «리터럴 0건» 만 물으면 상수를 7 로 박아도 초록이다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRCP = path.join(ROOT, 'index.html');
const W = 1080, H = 2280;
const CYCLE = 7;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m + (d !== undefined && d !== '' ? '  — ' + d : '')); };
const note = (m, d) => console.log('  ·  ' + m + (d !== undefined ? '  — ' + d : ''));
const blk = t => console.log('\n' + t);
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

async function open(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof ATTEND !== 'undefined'
                                && typeof openAttend === 'function');
  await page.waitForTimeout(700);
  /* 유휴 루프가 재화를 굴려 증분 비교를 망친다(LESSONS 51-③·34-⑤ · verify70 과 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; S.autoBuy = false; });
  return { page, errs };
}

/* 팝업을 열고 «무엇이 그려졌나» 를 한 번에 걷는다 — [C]·[R] 이 같은 자를 쓴다 */
const READ_VIEW = n => {
  S.att.n = n; S.att.date = '';
  openAttend();
  const cells = [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')];
  return {
    cards: document.querySelectorAll('#mbox .at-c').length,
    wide: document.querySelectorAll('#mbox .at-c7').length,
    labels: [...document.querySelectorAll('#mbox .at-bd>i')].map(e => e.textContent),
    today: cells.map(e => e.classList.contains('today')),
    got: cells.map(e => e.classList.contains('got')),
    dots: document.querySelectorAll('#mbox .updot').length,
    txt: document.getElementById('mbox').textContent,
  };
};

(async () => {
  const src = fs.readFileSync(SRCP, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  const browser = await launch(chromium);
  const { page, errs } = await open(browser, 'file://' + SRCP);

  /* ── [A] 표 ─────────────────────────────────────────────────── */
  blk('[A] 표 — 7칸 순환이고 «28» 은 출석 절에서 사라졌다');
  const t = await ev(page, () => ({
    n: ATTEND.length,
    dias: ATTEND.map(r => r.dia),
    keys: [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => k !== 'ic' && k !== 't')))].sort(),
    total: ATTEND.reduce((s, r) => s + (r.dia || 0), 0),
  }));
  if (t) {
    ok(t.n === CYCLE, '[A-a] `ATTEND.length` = 7 (8일차 이후 칸 0개)', t.n + '칸');
    ok(t.keys.length === 1 && t.keys[0] === 'dia',
       '[A-b] 보상 키는 dia 하나 — 399 를 안 건드렸다', '[' + t.keys.join(',') + ']');
    ok(t.dias.every(v => v > 0), '[A-c] 빈 칸 0건');
    note('[A-d] 1~7일차 · 한 바퀴 합계 · 하루 평균',
         t.dias.map(v => v.toLocaleString('en-US')).join(' · ') + ' = ' + t.total.toLocaleString('en-US')
         + ' → ' + Math.round(t.total / CYCLE).toLocaleString('en-US') + '/일');
    ok(t.dias[6] > t.dias[5],
       '[A-e] 눈금이 살아 있다 — 일반 < 순환 최종(7일차) (재화가 하나여도 마지막 칸 강조가 남는다)',
       t.dias[5] + ' < ' + t.dias[6]);
  } else ok(false, '[A] ATTEND 를 못 읽었다');

  ok(!/S\.att\.n\s*%\s*28/.test(code),
     '[A-f] 제품 줄에 `S.att.n % 28` 0건 (513 — 길이는 표가 정한다)',
     (code.match(/S\.att\.n\s*%\s*28/g) || []).length + '건');
  ok(!/Math\.floor\(day\s*\/\s*7\)\s*\*\s*7/.test(code),
     '[A-g] 주차 계산 `Math.floor(day/7)*7` 0건 (접을 것이 없어졌다 — 죽은 코드를 안 남긴다)');
  /* ⚑ 328 교훈 — «리터럴 0건» 만 물으면 `% 7` 로 상수를 박아도 초록이다. 표 길이를 실제로 읽는지 묻는다. */
  const modSites = (code.match(/S\.att\.n\s*%\s*ATTEND\.length/g) || []).length;
  ok(modSites === 2,
     '[A-h] 수령·렌더 **두 자리 모두** `S.att.n % ATTEND.length` 로 표 길이를 읽는다 (상수 재박기 금지)',
     modSites + '자리');
  const declM = /const ATTEND = \[\];[\s\S]{0,400}?\}/.exec(code);
  ok(!!declM && /for\(let i=1;i<=7;i\+\+\)/.test(declM[0]) && !/28/.test(declM[0]),
     '[A-i] `ATTEND` 선언 루프가 1..7 이고 블록 안에 «28» 0건 (28일차 5,000 갈래 폐지)',
     declM ? declM[0].split('\n')[1].trim() : '선언을 못 찾았다');

  /* ── [B] 수령 ───────────────────────────────────────────────── */
  blk('[B] 수령 — 받는 칸 = ATTEND[n % 7] · 8일차 이후 칸은 한 번도 안 나온다');
  const days = [0, 6, 7, 13, 14, 27, 28, 53, 99];
  const claims = await ev(page, ns => ns.map(n => {
    S.att.n = n; S.att.date = '';
    const d0 = S.dia;
    claimAttend(null);
    /* ⚑ 199 7회차 — 규칙이 «표 그대로» 에서 **«표 + 1일차 첫 순환 한정»** 으로 바뀌었다(333 처방:
       항을 지우지 않고 방향만 갈아 끼운다). 자는 `attRow()` 에게 되묻지 않고 **규칙을 직접 적는다** —
       접근자에게 물으면 «제품이 제 답을 채점하는» 항이 되어 되돌림 시험이 통과해 버린다. */
    const idx = n % ATTEND.length;
    const want = (idx === 0 && n >= ATTEND.length) ? ATT_D1_CURVE : ATTEND[idx].dia;
    return { n, idx, want, got: S.dia - d0, nAfter: S.att.n, d1: ATT_D1_DIA, cur: ATT_D1_CURVE };
  }), days);
  if (claims) {
    const bad = claims.filter(c => c.got !== c.want);
    ok(bad.length === 0, '[B-a] 전 표본에서 지급액 = 규칙값(표 · 단 1일차는 첫 순환만 «환영» 칸)',
       bad.length ? bad.map(b => 'n' + b.n + ' ' + b.got + '≠' + b.want).join(' · ') : days.length + '개 표본 일치');
    /* [B-a2] 199 7회차 — «1회성» 을 못박는 음성항. 2주차 이후의 1일차가 다시 «환영» 100,000 이 되면
       (= 513 이 만든 4배 재지급이 되살아나면) 이 항이 곧바로 빨개진다. */
    const c0 = claims.filter(c => c.idx === 0);
    const first = c0.filter(c => c.n < CYCLE), later = c0.filter(c => c.n >= CYCLE);
    ok(first.length > 0 && first.every(c => c.got === c.d1),
       '[B-a2] 첫 순환의 1일차는 «환영» 칸 그대로 (498 이 나르는 100,000)',
       first.map(c => 'n' + c.n + '→' + c.got).join(' · ') || '표본 없음');
    ok(later.length > 0 && later.every(c => c.got === c.cur && c.got !== c.d1),
       '[B-a3] 2주차 이후의 1일차는 곡선값 — «환영» 칸이 다시 안 돈다 (199 7회차 · ④ 지속 수급 축)',
       later.map(c => 'n' + c.n + '→' + c.got).join(' · ') || '표본 없음');
    const modOk = claims.every(c => c.idx === c.n % CYCLE && c.idx < CYCLE);
    ok(modOk, '[B-b] 칸 index 가 언제나 `n % 7` (8일차 이후 칸 0건)',
       claims.map(c => 'n' + c.n + '→#' + c.idx).join(' · '));
    ok(claims.every(c => c.nAfter === c.n + 1),
       '[B-c] `S.att.n` 은 순환과 무관하게 **누적**으로 +1 (36 패스·493 이 이 축을 읽는다)');
  } else ok(false, '[B] 수령을 못 돌렸다');

  /* ── [C] 팝업 ───────────────────────────────────────────────── */
  blk('[C] 팝업 — 언제나 1~7일 차 7칸');
  const views = [];
  for (const n of [0, 3, 9, 53]) {
    const v = await ev(page, READ_VIEW, n);
    if (v) views.push({ n, v });
  }
  if (views.length === 4) {
    ok(views.every(x => x.v.cards === 6 && x.v.wide === 1),
       '[C-a] 언제나 격자 6 + 전폭 1 = 7칸',
       views.map(x => 'n' + x.n + ' ' + x.v.cards + '+' + x.v.wide).join(' · '));
    const want = ['1일 차', '2일 차', '3일 차', '4일 차', '5일 차', '6일 차', '7일 차'].join(',');
    ok(views.every(x => x.v.labels.join(',') === want),
       '[C-b] 라벨은 언제나 «1일 차»~«7일 차» (n 이 얼마든 주차가 안 바뀐다)',
       views.map(x => 'n' + x.n + ' [' + x.v.labels[0] + '…' + x.v.labels[6] + ']').join(' · '));
    const over = views.flatMap(x => x.v.labels.filter(s => (parseInt(s, 10) || 0) > CYCLE));
    ok(over.length === 0, '[C-c] «8일 차» 이상 문구 0건', over.join(',') || '0건');
    ok(views.every(x => x.v.today.filter(Boolean).length === 1 && x.v.dots === 1),
       '[C-d] «오늘» 칸 1장 + 레드닷 1개 (318 규약 — 순환이 신호를 안 깬다)',
       views.map(x => 'n' + x.n + '→#' + x.v.today.indexOf(true)).join(' · '));
    const posOk = views.every(x => x.v.today.indexOf(true) === x.n % CYCLE);
    ok(posOk, '[C-e] «오늘» 칸의 자리 = `n % 7` (표와 그림이 같은 칸을 가리킨다)',
       views.map(x => 'n' + x.n + ' #' + x.v.today.indexOf(true) + ' vs ' + (x.n % CYCLE)).join(' · '));
    const gotOk = views.every(x => x.v.got.filter(Boolean).length === x.n % CYCLE);
    ok(gotOk, '[C-f] ✔ 칸 = «오늘» 앞의 칸 수 (미래 칸이 회색으로 안 죽는다)',
       views.map(x => 'n' + x.n + ' ✔' + x.v.got.filter(Boolean).length).join(' · '));
    ok(views.every(x => !/NaN|undefined/.test(x.v.txt)), '[C-g] NaN/undefined 없음');
  } else ok(false, '[C] 팝업을 못 읽었다');

  /* ── [D] 구 세이브 ──────────────────────────────────────────── */
  blk('[D] 구 세이브 — 세이브 이관 «없음» 이 정답인지 실로드로 못박는다');
  const old = await ev(page, () => {
    /* 28칸 시절의 세이브(n=53). `S.att.n` 은 «누적 접속일» 이라 구조가 바뀌어도 그대로 합법이다 —
       KEY 를 안 올린 근거가 이 항이다(326 «넘침이 구조적으로 없다» 와 같은 꼴). */
    localStorage.setItem(KEY, JSON.stringify({ att: { n: 53, date: '' }, dia: 1000, gold: 1e6 }));
    const d = load();
    return { n: S.att.n, idx: S.att.n % ATTEND.length, can: S.att.date !== today(), loaded: typeof d };
  });
  if (old) {
    ok(old.n === 53, '[D-a] 구 세이브(n=53)가 그대로 실린다 — `S.att.n` 은 손대지 않았다', 'n=' + old.n);
    ok(old.idx === 53 % CYCLE, '[D-b] 그 세이브가 받는 칸 = #' + (53 % CYCLE) + ' (6일차)', '#' + old.idx);
    ok(old.can === true, '[D-c] 수령 가능(오늘 안 받았다) — 구 세이브가 잠기지 않는다');
  } else ok(false, '[D] 구 세이브를 못 실었다');

  /* ── [E] 대조군 ────────────────────────────────────────────── */
  blk('[E] 대조군 — 순환에 끌려가면 안 되는 두 축');
  const keep = await ev(page, () => {
    S.att.n = 53; S.att.date = '';
    const before = DUNGEONS.map(x => S.dunTk[x.id] | 0);
    claimAttend(null);
    return {
      passProg: PASS_TABS.att.prog(), passN: PASS_TABS.att.n, attN: S.att.n,
      passStl: PASS_TABS.att.stl,
      tkDelta: DUNGEONS.map((x, i) => (S.dunTk[x.id] | 0) - before[i]),
      dunTry: DUN_TRY,
    };
  });
  if (keep) {
    ok(keep.passProg === keep.attN && keep.attN === 54,
       '[E-a] 36 출석 패스 진행도 = **누적** `S.att.n` (513 순환에 안 끌려간다 · 493 축)',
       keep.passProg + ' vs ' + keep.attN);
    ok(keep.passStl === '접속일', '[E-b] 그 패스의 축 이름이 여전히 «접속일»', keep.passStl);
    ok(keep.tkDelta.every(v => v === keep.dunTry),
       '[E-c] 출석 수령 → 던전마다 입장권 +DUN_TRY 불변 (204 — 날짜와 무관한 몫)',
       '+' + keep.dunTry + ' × ' + keep.tkDelta.length + '던전');
  } else ok(false, '[E] 대조군을 못 읽었다');

  ok(errs.length === 0, '[E-d] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  /* ── [R] 되돌림 시험 ───────────────────────────────────────── */
  blk('[R] 되돌림 — 28칸으로 되돌린 사본은 [A]·[B]·[C] 가 빨개진다');
  const tmp = path.join(ROOT, 'tools', '.verify513-revert.html');
  const nowDecl = `for(let i=1;i<=7;i++){`;
  const oldDecl = `for(let i=1;i<=28;i++){`;
  /* 199 9회차 — 곡선 ×12 확정에 맞춰 «지금 소스» 표식만 갱신(되돌림 사본은 여전히 28칸 세계다)
     199 14회차 — 배수가 상수 `ATT_DIA_K` 로 빠지면서 이 줄이 두 줄이 됐다. **되돌림 시험의 이빨은
     그대로다** — 바뀐 것은 «지금 소스» 를 가리키는 표식뿐이고, 사본이 되돌아가는 28칸 세계는 Δ0. */
  const nowDia = `  const dia = i === 1 ? ATT_D1_DIA
                      : Math.round((i % 7 === 0 ? 18000 + i*720 : 4200 + i*360) * ATT_DIA_K);`;
  const oldDia = `  const dia = i === 1 ? ATT_D1_DIA
            : (i % 28 === 0 ? 5000 : (i % 7 === 0 ? 1500 + i*60 : 350 + i*30));`;
  const nowView = `  const day = S.att.n % ATTEND.length, can = S.att.date !== today();
  const card = (i) => {`;
  const oldView = `  const day = S.att.n % 28, can = S.att.date !== today();
  const base = Math.floor(day / 7) * 7;
  const card = (i) => {`;
  /* 199 7회차 — 렌더가 표를 직접 읽지 않고 접근자 `attRow()` 를 읽는다. 되돌림 사본은
     그 자리를 «base + i» 시절의 표 직독으로 되돌린다(28칸 세계의 모양 그대로). */
  const nowIdx = `    const idx = i, r = attRow(idx), sev = i === 6;`;
  const oldIdx = `    const idx = base + i, r = ATTEND[idx], sev = i === 6;`;
  const found = [nowDecl, nowDia, nowView, nowIdx].map(x => src.includes(x));
  ok(found.every(Boolean), '[R-a] [전제] 사본 편집 자리 4곳을 소스에서 찾았다',
     found.map((f, i) => (f ? '○' : '✗') + ['선언', '곡선', '렌더', 'idx'][i]).join(' '));
  if (found.every(Boolean)) {
    const rv = src.replace(nowDecl, oldDecl).replace(nowDia, oldDia)
                  .replace(nowView, oldView).replace(nowIdx, oldIdx);
    fs.writeFileSync(tmp, rv);
    try {
      const { page: p2 } = await open(browser, 'file://' + tmp);
      const r = await ev(p2, () => {
        S.att.n = 9; S.att.date = '';
        openAttend();
        return {
          n: ATTEND.length,
          labels: [...document.querySelectorAll('#mbox .at-bd>i')].map(e => e.textContent),
          idx: (() => { S.att.n = 9; S.att.date = ''; const d0 = S.dia; claimAttend(null); return S.dia - d0; })(),
        };
      });
      if (r) {
        ok(r.n !== CYCLE, '[R-b] 되돌린 사본은 [A-a] 가 빨갛다 (칸 수가 7 이 아니다)', r.n + '칸');
        ok(r.labels.some(s => (parseInt(s, 10) || 0) > CYCLE),
           '[R-c] 되돌린 사본은 [C-b]·[C-c] 가 빨갛다 (8일 차 이상 라벨이 돌아온다)',
           r.labels.join(','));
        ok(r.idx !== 440, '[R-d] 되돌린 사본은 [B-a] 가 빨갛다 (n=9 가 10일차 650 을 준다 — 3일차 440 이 아니라)',
           '지급 ' + r.idx);
      } else ok(false, '[R] 되돌림 사본을 못 읽었다');
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  }

  /* ── [R2] 되돌림 시험 — 199 7회차의 «1회성» 자신 ─────────────────
     [B-a3] 이 «무르게 푼 항» 이 아님을 못박는다: 수령 경로의 접근자를 표 직독으로 되돌린 사본에서는
     2주차 1일차(n=7)가 다시 «환영» 100,000 을 준다. 되돌리면 빨갛고 원복하면 초록이어야 자다. */
  const nowClaim = `  const day = S.att.n % ATTEND.length, r = attRow(day);`;
  const oldClaim = `  const day = S.att.n % ATTEND.length, r = ATTEND[day];`;
  ok(src.includes(nowClaim), '[R2-a] [전제] 수령 경로가 접근자 `attRow(day)` 를 읽는다');
  if (src.includes(nowClaim)) {
    fs.writeFileSync(tmp, src.replace(nowClaim, oldClaim));
    try {
      const { page: p3 } = await open(browser, 'file://' + tmp);
      const r2 = await ev(p3, () => {
        S.att.n = 7; S.att.date = '';
        const d0 = S.dia; claimAttend(null);
        return { got: S.dia - d0, d1: ATT_D1_DIA, cur: ATT_D1_CURVE };
      });
      if (r2) ok(r2.got === r2.d1 && r2.got !== r2.cur,
        '[R2-b] 되돌린 사본은 [B-a3] 가 빨갛다 (n=7 이 다시 «환영» ' + (r2.d1 || '') + ' 을 준다)',
        '지급 ' + r2.got);
      else ok(false, '[R2] 되돌림 사본을 못 읽었다');
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  }

  /* ── ⏸199 대기 — 실패로 세지 않는다(326·331·398 과 같은 처리) ── */
  blk('[199] ⏸ 대기 — 수급 곡선(값 확정은 199 몫 · 실패로 안 센다)');
  if (t) {
    const perDay  = Math.round(t.total / CYCLE);                                   /* 첫 순환 */
    /* 199 7회차 — 1일차가 1회성이 된 뒤로 «하루 평균» 이 둘이다. ④ 가 읽는 것은 **지속** 쪽이다. */
    const steady  = Math.round((t.total - t.dias[0] + 4560) / CYCLE);   /* 199 9회차 — ATT_D1_CURVE 4,560 */
    note('출석 하루 평균 — 첫 순환', perDay.toLocaleString('en-US') + '/일  (28칸 시절 4,647/일 · +'
         + Math.round((perDay / 4647 - 1) * 100) + '%)');
    note('출석 하루 평균 — **지속(2주차 이후 · ④ 가 읽는 자)**',
         steady.toLocaleString('en-US') + '/일  (28칸 시절 4,647/일 대비 '
         + (steady >= 4647 ? '+' : '') + Math.round((steady / 4647 - 1) * 100) + '%)');
    note('뿌리는 «값» 이 아니라 «주기»', '1일차 = 498 «환영» 칸 ' + t.dias[0].toLocaleString('en-US')
         + ' 이 28일이 아니라 **7일마다** 돌아온다');
    note('지렛대 둘 — **199 7회차가 ⓐ 를 골랐다**',
         'ⓐ 1일차 «환영» 칸을 **첫 순환 1회성**으로(`attRow()`) · ⓑ 그대로 둔다 → **ⓐ 채택**, '
         + '2주차 이후 1일차 = 곡선값(199 9회차부터 4,560). 값이 아니라 **주기**를 고친 것이라 첫날 축(DAY1_DIA 100만)은 Δ0');
  }

  await browser.close();
  console.log('\nVERIFY513 ' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
