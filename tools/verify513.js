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
    /* ⚑ 739(주인 확정) — 규칙이 «표 + 1일차 첫 순환 한정 환영 칸» 에서 **«표 그대로(주인 상수)»**
       로 돌아왔다(333 처방: 항을 지우지 않고 방향만 갈아 끼운다). 자는 규칙을 직접 적는다 —
       1~6일차 1,000 · 7일차 10,000, 순환 위치 말고는 아무것도 지급을 가르지 않는다. */
    const idx = n % ATTEND.length;
    const want = idx === 6 ? 10000 : 1000;
    return { n, idx, want, got: S.dia - d0, nAfter: S.att.n };
  }), days);
  if (claims) {
    const bad = claims.filter(c => c.got !== c.want);
    ok(bad.length === 0, '[B-a] 전 표본에서 지급액 = 주인 상수(1~6일차 1,000 · 7일차 10,000)',
       bad.length ? bad.map(b => 'n' + b.n + ' ' + b.got + '≠' + b.want).join(' · ') : days.length + '개 표본 일치');
    /* [B-a2] 739 — «환영 잭팟이 출석에 없다» 를 못박는 음성항. 어느 순환의 1일차든 1,000 —
       구 «환영 100,000» 칸(498)이나 구 곡선(4,200+360i × 배수)이 되살아나면 곧바로 빨개진다.
       환영 몫은 이제 `WELCOME_DIA` 달력(verify498 §5)이 나른다. */
    const c0 = claims.filter(c => c.idx === 0);
    ok(c0.length > 0 && c0.every(c => c.got === 1000),
       '[B-a2] 1일차는 어느 순환이든 1,000 — 환영 잭팟 칸 0건 (739 · 결1 ⓑ 는 달력이 나른다)',
       c0.map(c => 'n' + c.n + '→' + c.got).join(' · ') || '표본 없음');
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
  const tmp = path.join(ROOT, 'tools', `.verify513-revert-${process.pid}.html`);
  const nowDecl = `for(let i=1;i<=7;i++){`;
  const oldDecl = `for(let i=1;i<=28;i++){`;
  /* 739 — «지금 소스» 표식이 주인 상수 push 한 줄이 됐다(되돌림 사본은 여전히 28칸 세계다).
     사본의 1일차 100,000 은 리터럴이다 — 현행 소스에 `ATT_D1_DIA` 선언이 없기 때문(739 ②). */
  const nowDia = `  ATTEND.push({ ic:curIc('dia'), t:'다이아', dia: i === 7 ? ATT_DIA7 : ATT_DIA });`;
  const oldDia = `  const dia = i === 1 ? 100000
            : (i % 28 === 0 ? 5000 : (i % 7 === 0 ? 1500 + i*60 : 350 + i*30));
  ATTEND.push({ ic:curIc('dia'), t:'다이아', dia });`;
  const nowView = `  const day = S.att.n % ATTEND.length, can = S.att.date !== today();
  const card = (i) => {`;
  const oldView = `  const day = S.att.n % 28, can = S.att.date !== today();
  const base = Math.floor(day / 7) * 7;
  const card = (i) => {`;
  /* 739 — 렌더는 표 직독이다(접근자 폐지). 되돌림 사본은 «base + i» 시절의 28칸 렌더로. */
  const nowIdx = `    const idx = i, r = ATTEND[idx], sev = i === 6;      /* 739 — 표시도 같은 표를 그대로 읽는다 */`;
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
        ok(r.idx !== 1000, '[R-d] 되돌린 사본은 [B-a] 가 빨갛다 (n=9 가 10일차 650 을 준다 — 3일차 1,000 이 아니라)',
           '지급 ' + r.idx);
      } else ok(false, '[R] 되돌림 사본을 못 읽었다');
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  }

  /* ── [R2] 되돌림 시험 — 739 주인 상수 자신 ─────────────────
     [B-a] 가 «무르게 푼 항» 이 아님을 못박는다: 표를 직전 회차 곡선(4,200+360i × 3.37)으로
     되돌린 사본에서는 3일차 지급이 1,000 이 아니다. 되돌리면 빨갛고 원복하면 초록이어야 자다. */
  const nowTbl = `dia: i === 7 ? ATT_DIA7 : ATT_DIA`;
  const oldTbl = `dia: Math.round((i % 7 === 0 ? 18000 + i*720 : 4200 + i*360) * 3.37)`;
  ok(src.includes(nowTbl), '[R2-a] [전제] 표가 주인 상수 두 개로 서 있다');
  if (src.includes(nowTbl)) {
    fs.writeFileSync(tmp, src.replace(nowTbl, oldTbl));
    try {
      const { page: p3 } = await open(browser, 'file://' + tmp);
      const r2 = await ev(p3, () => {
        S.att.n = 2; S.att.date = '';
        const d0 = S.dia; claimAttend(null);
        return { got: S.dia - d0 };
      });
      if (r2) ok(r2.got !== 1000,
        '[R2-b] 되돌린 사본은 [B-a] 가 빨갛다 (3일차가 옛 곡선값을 준다 — 1,000 이 아니라)',
        '지급 ' + r2.got);
      else ok(false, '[R2] 되돌림 사본을 못 읽었다');
    } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  }

  /* ── 739 뒤의 수급 각주 — 값은 주인 확정이라 199 «대기» 절이 닫혔다 ── */
  blk('[739] 수급 각주 — 값은 주인 확정(199 는 불변 제약으로 읽는다)');
  if (t) {
    const perDay = Math.round(t.total / CYCLE);
    note('출석 하루 평균', perDay.toLocaleString('en-US') + '/일  (직전 회차 ≈17,000/일 · '
         + Math.round((perDay / 17000 - 1) * 100) + '% — 주인 지시 «너무 과하게 많이 줌» 의 하향)');
    note('한 바퀴(7일) 합', t.total.toLocaleString('en-US') + ' (주인 확정 주간 16,000)');
    note('199 이관', '이 두 값은 DAY1_DIA 급 불변 제약 — 758 하향에서도 이 축은 손대지 않는다');
  }

  await browser.close();
  console.log('\nVERIFY513 ' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
