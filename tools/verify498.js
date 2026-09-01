/* 작업 498 게이트 — «환영 100만 다이아(기간 무관 총량)» + 2일차 이후 수급의 기준선
 *
 *   node tools/verify498.js
 *
 * ⚑ 199 22회차(결1 ⓑ — 주인 결정 2026-09-01) 이관: «첫날 합 100만» → **«총량 100만(기간 무관)»**.
 *   지급이 여러 날로 갈라졌다 — 설치 즉시(우편 10만) + 첫날 온보딩(가이드 25만·첫 승급 10만)
 *   + **환영 달력 55만(`WELCOME_DIA` — 출석 2~7일차, 첫 순환만, 우편으로)**. §5 가 시점 축을 잰다.
 * ⚑ 739(주인 확정 2026-09-02) 이관: 출석은 주인 상수 {1~6일차 1,000 · 7일차 10,000} — 곡선·배수
 *   (`ATT_DIA_K`)·1일차 «환영» 칸(`ATT_D1_DIA`)·접근자(`attRow`)는 선언째 사라졌다(§3 이 잰다).
 *
 *   §1 선언 — 다섯 몫의 합 = DAY1_DIA = 1,000,000 (기간 무관)
 *   §2 가이드 미션 곡선 — dia(i) = GM_DIA0 + GM_DIA_D·i · 합 250,000 · 73 ② 부등식 · 61/256 불변식
 *   §3 출석 — 739 주인 상수 {1,000×6 · 10,000} · 파생식(곡선·배수·접근자) 0건
 *   §4 우편 — 5통 합 100,000
 *   §5 **실지급 + 지급 시점**(T2 «기능 완성 규칙») — 실제 수령 경로로 받아 잔고가 그만큼 오르는가 ·
 *      환영 달력이 2~7일차에 정확히 한 통씩(1일차 0통 · 8일차 이후 0통) · 총량 100만(기간 무관) ·
 *      첫 승급은 딱 한 번인가
 *   §6 ⏸199 대기 — 반복 수급 바닥. 값만 찍고 실패로 안 센다(326 ck199 선례)
 *   §R 되돌림 시험 — 곡선·출석·우편·달력을 옛 값/무력 상태로 되돌리면 실제로 빨개지는가
 *      (무르게 푼 수리가 아님을 못박는 자리 — 334·348·364 규약)
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용. LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = m => { pass++; console.log('  ok   ' + m); };
const no = m => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const yes = (m, v, d) => (v ? ok(m) : no(m + (d !== undefined ? ' — ' + d : '')));
const note = (m, d) => console.log('   ·   ' + m + (d !== undefined ? ' — ' + d : ''));
const fmtN = n => Number(n).toLocaleString('en-US');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

const D1 = 1000000, MAIL = 100000, GM = 250000, PROMO = 100000;
const WELCOME = [75000, 75000, 75000, 100000, 100000, 125000];   /* 출석 2~7일차 — 합 550,000 */
const WSUM = WELCOME.reduce((a, b) => a + b, 0);
const GM0 = 7750, GMD = 500;
const ATT = 1000, ATT7 = 10000;                                   /* 739 주인 상수 */

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── §0 전제 — 상수가 소스에 선언돼 있다 ─────────────────────── */
  console.log('[0] 전제 — 다섯 자리의 상수 선언');
  yes('[0-a] `DAY1_DIA` 선언', /const\s+DAY1_DIA\s*=\s*1000000\s*;/.test(src));
  yes('[0-b] `MAIL_D1_DIA`·`GM_D1_DIA`·`FIRST_PROMO_DIA`·`WELCOME_DIA` 선언',
      /const\s+MAIL_D1_DIA\s*=/.test(src) && /const\s+GM_D1_DIA\s*=/.test(src)
      && /const\s+FIRST_PROMO_DIA\s*=/.test(src) && /const\s+WELCOME_DIA\s*=\s*\[/.test(src));
  yes('[0-c] 곡선 손잡이 `GM_DIA0`·`GM_DIA_D` 가 **한 곳**에만 있다',
      (src.match(/const\s+GM_DIA0\s*=/g) || []).length === 1);
  yes('[0-d] 환영 달력의 발송 자리는 `claimAttend` 하나다 — `WELCOME_DIA[` 참조가 정확히 1곳',
      (src.match(/WELCOME_DIA\[/g) || []).length === 1);

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof GUIDE !== 'undefined');
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.step = () => {}; });

  /* ── §1 선언 — 다섯 몫의 합(기간 무관 총량) ─────────────────── */
  console.log('\n[1] 환영 총량 — 다섯 몫의 합 = 100만 (결1 ⓑ — 기간 무관)');
  const c = await ev(page, () => ({
    day1: DAY1_DIA, mail: MAIL_D1_DIA, gm: GM_D1_DIA, promo: FIRST_PROMO_DIA,
    w: WELCOME_DIA.slice(), wsum: WELCOME_DIA.reduce((a, b) => a + b, 0),
  }));
  if (c) {
    is('[1-a] DAY1_DIA', c.day1, D1);
    is('[1-b] 우편 몫', c.mail, MAIL);
    is('[1-c] 가이드 미션 몫', c.gm, GM);
    is('[1-d] 첫 승급 몫', c.promo, PROMO);
    is('[1-e] 환영 달력 몫(합)', c.wsum, WSUM);
    is('[1-f] 다섯 몫의 합 = DAY1_DIA (기간 무관 총량 — 결1 ⓑ)', c.mail + c.gm + c.promo + c.wsum, c.day1);
    is('[1-g] 달력은 6칸(출석 2~7일차)', c.w.length, 6);
    yes('[1-h] 달력이 단조 비감소(뒤 칸이 앞 칸보다 작지 않다)',
        c.w.every((v, i) => i === 0 || v >= c.w[i - 1]), c.w.join(','));
  } else no('[1] 상수를 못 읽었다');

  /* ── §2 가이드 미션 곡선 ──────────────────────────────────── */
  console.log('\n[2] 가이드 미션 — 곡선 한 줄이 스무 칸을 정한다');
  const g = await ev(page, () => {
    const rows = GUIDE.map((m, i) => ({ i, n: m.n, dia: gmDia(m), fn: typeof m.dia === 'function' }));
    return {
      n: GUIDE.length, v: GUIDE_V, d0: GM_DIA0, dd: GM_DIA_D,
      rows, sum: rows.reduce((a, r) => a + r.dia, 0),
      /* 73 ② — «다음 미션이 소환이면 그 10연을 감당한다». 지금은 하한으로 남아 있다. */
      c10: BKEYS.reduce((o, b) => (o[b] = summonCost(b, 10), o), {}),
      bans: GUIDE.map((m, i) => ({ i, ban: m.ban || null })).filter(r => r.ban),
      abs: GUIDE.every(m => !!m.abs),
    };
  });
  if (g) {
    is('[2-a] 미션 수 (61/73/154/256 — 순서·개수 불변)', g.n, 20);
    is('[2-b] GUIDE_V (보상 «수량» 만 바뀌었으므로 올리지 않는다)', g.v, 6);
    is('[2-c] 곡선 손잡이 GM_DIA0', g.d0, GM0);
    is('[2-d] 곡선 손잡이 GM_DIA_D', g.dd, GMD);
    const bad = g.rows.filter(r => r.dia !== GM0 + GMD * r.i);
    yes('[2-e] 스무 칸 전부 dia(i) = ' + GM0 + ' + ' + GMD + '·i',
        bad.length === 0, bad.map(b => 'idx' + b.i + ' ' + b.dia).join(' · '));
    is('[2-f] 스무 칸 합', g.sum, GM);
    yes('[2-g] 보상이 **단조 증가**(뒤 미션이 앞 미션보다 작지 않다)',
        g.rows.every((r, i) => i === 0 || r.dia > g.rows[i - 1].dia));
    /* 73 ② 부등식 — `ban` 이 걸린 미션의 **앞 미션** 보상이 그 상자 10연을 감당해야 한다 */
    const short = g.bans.map(b => ({ b, prev: b.i > 0 ? g.rows[b.i - 1].dia : Infinity, cost: g.c10[b.ban] }))
      .filter(r => r.prev < r.cost);
    yes('[2-h] 73 ② — 소환 미션 앞 칸 보상 ≥ 그 상자 10연 정가',
        short.length === 0, short.map(s => 'idx' + s.b.i + ' ' + s.prev + ' < ' + s.cost).join(' · '));
    yes('[2-i] 256 ② — 전 미션 `abs:1`(델타형 0개)', g.abs);
    yes('[2-j] 73 ② 결합을 버리지 않았다 — 세 칸은 여전히 **함수**(하한 max)',
        g.rows.filter(r => r.fn).length === 3, g.rows.filter(r => r.fn).map(r => 'idx' + r.i).join(' · '));
    note('[2-k] 첫 칸 · 끝 칸', fmtN(g.rows[0].dia) + ' … ' + fmtN(g.rows[19].dia));
  } else no('[2] GUIDE 를 못 읽었다');

  /* ── §3 출석 — 739 주인 상수 ─────────────────────────────── */
  console.log('\n[3] 출석 — 739 주인 상수 {1~6일차 1,000 · 7일차 10,000} · 파생식 0건');
  const a = await ev(page, () => ({
    n: ATTEND.length,
    dias: ATTEND.map(r => r.dia),
    keys: [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => k !== 'ic' && k !== 't')))].sort(),
    cA: (typeof ATT_DIA === 'number' ? ATT_DIA : null),
    c7: (typeof ATT_DIA7 === 'number' ? ATT_DIA7 : null),
  }));
  if (a) {
    is('[3-a] 7칸 순환 (513)', a.n, 7);
    is('[3-b] 상수 ATT_DIA (1~6일차)', a.cA, ATT);
    is('[3-c] 상수 ATT_DIA7 (7일차)', a.c7, ATT7);
    yes('[3-d] 1~6일차 여섯 칸 전부 ' + fmtN(ATT),
        a.dias.slice(0, 6).every(v => v === ATT), a.dias.join(','));
    is('[3-e] 7일차(순환 최종)', a.dias[6], ATT7);
    yes('[3-f] 눈금(일반 < 순환 최종) 그대로', a.dias[6] > a.dias[0]);
    yes('[3-g] 399 — 전 칸 다이아 한 종류(goldMul·rel 이 되살아나면 빨강)',
        a.keys.length === 1 && a.keys[0] === 'dia', a.keys.join(','));
    /* 739 ② — 파생식 제거: 곡선·배수·1일차 환영 칸·2주차 접근자가 **선언째** 사라졌다.
       (333·399 — 죽은 코드를 남기지 않는다. 되살아나면 빨강 = 되돌림 게이트를 겸한다) */
    yes('[3-h] 파생식 0건 — `ATT_DIA_K`·`ATT_D1_DIA`·`ATT_D1_CURVE`·`attRow` 선언이 소스에 없다',
        !/const\s+ATT_DIA_K\s*=/.test(src) && !/const\s+ATT_D1_DIA\s*=/.test(src)
        && !/const\s+ATT_D1_CURVE\s*=/.test(src) && !/const\s+attRow\s*=/.test(src));
    note('[3-i] 한 바퀴(7일) 합 · 하루 평균 — 739 주인 확정',
         fmtN(a.dias.reduce((x, y) => x + y, 0)) + ' → '
         + fmtN(Math.round(a.dias.reduce((x, y) => x + y, 0) / 7)) + '/일');
  } else no('[3] ATTEND 를 못 읽었다');

  /* ── §4 우편 ──────────────────────────────────────────────── */
  console.log('\n[4] 환영 우편 — 5통 합 10만 (설치 즉시 몫)');
  const m = await ev(page, () => ({
    n: MAILS.length, rows: MAILS.map(x => ({ id: x.id, c: x.c || 0 })),
    sum: MAILS.reduce((n, x) => n + (x.c || 0), 0),
  }));
  if (m) {
    is('[4-a] 고정 우편 5통', m.n, 5);
    is('[4-b] `c` 합 = MAIL_D1_DIA', m.sum, MAIL);
    yes('[4-c] 다섯 통 전부 다이아가 들어 있다', m.rows.every(r => r.c > 0),
        m.rows.map(r => r.id + ':' + r.c).join(' · '));
  } else no('[4] MAILS 를 못 읽었다');

  /* ── §5 실지급 + 지급 시점 — 진짜로 받아 본다 ─────────────── */
  console.log('\n[5] 실지급·지급 시점 — T2 «기능 완성 규칙» + 결1 ⓑ 시점 축');
  const paid = await ev(page, () => {
    const out = {};
    /* ⓐ 우편 [모두 받기] — 새 세이브에서 다섯 통을 한 번에 */
    Object.assign(S, DEF()); S.dia = 0;
    const b0 = S.dia; claimAllMail(); out.mail = S.dia - b0;
    /* ⓑ 가이드 미션 1개 수령 — 첫 미션을 달성 상태로 만들고 배너를 «받는다» */
    Object.assign(S, DEF()); S.dia = 0; S.guide.idx = 0;
    const b1 = S.dia; out.gmWant = gmDia(GUIDE[0]);
    S.own.slash = S.own.slash || { n: 0, l: 1 };
    const sk = Object.keys(SK).filter(k => k !== 'slash')[0];
    S.own[sk] = { n: 0, l: 1 };
    claimGuide();
    out.gm = S.dia - b1; out.gmIdx = S.guide.idx;
    /* ⓒ 출석 + 환영 달력 — 7일을 실제 수령 경로로 굴린다(날짜 가드만 되감는다).
       달력 우편은 «출석 n일차 전이» 마다 정확히 한 통 — 1일차 0통 · 2~7일차 6통 · 8일차 0통. */
    Object.assign(S, DEF()); S.dia = 0; S.mailx = []; S.att = { n: 0, date: '' };
    const wm = () => (S.mailx || []).filter(x => x.src === 'welcome');
    const b2 = S.dia; claimAttend(); out.att1 = S.dia - b2;      /* 1일차 = 739 상수 1,000 */
    out.w1 = wm().length;                                        /* 1일차 — 달력 0통 */
    for (let d = 2; d <= 7; d++) { S.att.date = ''; claimAttend(); }
    out.attN = S.att.n;
    out.w7 = wm().length;                                        /* 2~7일차 — 6통 */
    out.wSum = wm().reduce((n, x) => n + (x.c || 0), 0);
    out.wDays = wm().map(x => x.t.match(/(\d+)일차/) ? +x.t.match(/(\d+)일차/)[1] : -1);
    S.att.date = ''; claimAttend();                              /* 8일차(2순환 1일차) */
    out.w8 = wm().length;                                        /* 더 안 는다 */
    const b3 = S.dia; claimAllMail(); out.wPaid = S.dia - b3 - 0; /* 달력 우편 실지급(다이아만 실림) */
    /* ⓓ 첫 승급 — 실제 종료 경로(endPromo(true))로 두 번 굴린다 */
    Object.assign(S, DEF()); S.dia = 0; S.rank = 0;
    promo = { rank: RANKS[0], t: 10 };
    const b4 = S.dia; endPromo(true); out.promo1 = S.dia - b4; out.rank1 = S.rank;
    closeModal && closeModal();
    promo = { rank: RANKS[1], t: 10 };
    const b5 = S.dia; endPromo(true); out.promo2 = S.dia - b5; out.rank2 = S.rank;
    closeModal && closeModal();
    return out;
  });
  if (paid) {
    is('[5-a] 우편 [모두 받기] 실지급 (설치 즉시 몫)', paid.mail, MAIL);
    is('[5-b] 가이드 미션 1칸 실지급', paid.gm, paid.gmWant);
    is('[5-c]   그 값이 곡선 첫 칸', paid.gmWant, GM0);
    is('[5-d]   수령하면 다음 미션으로 넘어간다', paid.gmIdx, 1);
    is('[5-e] 출석 1일차 실지급 = 739 상수(환영 잭팟 칸이 아니다)', paid.att1, ATT);
    is('[5-f] 1일차에는 달력 우편 0통 (결1 ⓑ — 설치일 잭팟 금지)', paid.w1, 0);
    is('[5-g] 2~7일차에 달력 우편 6통', paid.w7, 6);
    is('[5-h]   그 합 = 550,000', paid.wSum, WSUM);
    yes('[5-i]   통마다 제 날짜(2~7일차 각 1통)', String(paid.wDays) === '2,3,4,5,6,7', String(paid.wDays));
    is('[5-j] 8일차(2순환)에는 더 안 온다 — 첫 순환 한정', paid.w8, 6);
    yes('[5-k] 달력 우편 실지급(다이아) ≥ 550,000 — 실제 수령 경로로 잔고에 닿는다',
        paid.wPaid >= WSUM, fmtN(paid.wPaid));
    is('[5-l] 첫 승급 실지급', paid.promo1, PROMO);
    is('[5-m]   그때 계급이 1', paid.rank1, 1);
    is('[5-n] **두 번째 승급은 0** — 첫 승급 보상은 딱 한 번', paid.promo2, 0);
    is('[5-o]   그래도 승급 자체는 됐다', paid.rank2, 2);
    /* 결1 ⓑ 총량 항등 — 기간 무관: 우편 + 달력 + 가이드 20칸 + 첫 승급 = 100만 */
    is('[5-p] 총량(기간 무관) — 우편+달력+가이드+첫승급 = DAY1_DIA',
       paid.mail + paid.wSum + GM + paid.promo1, D1);
  } else no('[5] 실지급을 못 굴렸다');

  /* ── §6 ⏸199 대기 — 2일차 이후 곡선 ──────────────────────── */
  console.log('\n[6] ⏸199 대기 — 2일차 이후 하루 수급(값 확정은 199 몫 · 실패로 세지 않는다)');
  const day = await ev(page, () => {
    const roul = Math.round(ROULETTE.reduce((n, r) => n + r.dia * r.w, 0) / 100) * ROUL_TRY;
    const ads = COIN_ADS.filter(x => x.r && x.r.dia).reduce((n, x) => n + x.r.dia * x.cap, 0);
    const dq = DQUESTS.reduce((n, q) => n + q.dia, 0);
    const att = Math.round(ATTEND.reduce((n, r) => n + r.dia, 0) / ATTEND.length);
    const attPass = PASS_TABS.att.rw(1, 0).n;
    const dun = DUN_TRY * (DUNGEONS.find(d => d.id === 'dia').rw(10).dia || 0);
    /* ⚑ 712 — 자르는 축(분)과 분당 지급을 둘 다 제품에서 읽는다. 199 22회차 — 1회 상한
       (OFF_CLAIM_CAP_H)이 되살아났지만 **하루 바닥**은 여러 번 수령으로 여전히 예산 전부다
       (부지런 축 — 대충의 1회 수령은 §6 이 아니라 bot199 [G] 가 잰다). */
    const offCap = OFF_DAY_CAP_MIN, offPm = OFF_DIA_PM;
    const off = offCap * offPm;
    return { roul, ads, dq, att, attPass, dun, off, offCap, offPm,
             sum: roul + ads + dq + att + attPass + dun + off };
  });
  yes('[6-0] §6 이 실제로 돌았다 (evaluate 예외 0건)', day !== null,
      '`ev` 가 예외를 삼켜 [6-a]~[6-e] 다섯 줄이 조용히 사라졌다 — 위 ⚠ 줄을 보라');
  if (day) {
    note('룰렛 ' + fmtN(day.roul) + ' · 광고 ' + fmtN(day.ads) + ' · 일퀘 ' + fmtN(day.dq)
       + ' · 출석 ' + fmtN(day.att) + ' · 출석패스 ' + fmtN(day.attPass)
       + ' · 수정광산(f10) ' + fmtN(day.dun)
       + ' · 오프라인 ' + fmtN(day.off) + '(' + fmtN(day.offCap) + '분 × ' + day.offPm + '/분)');
    note('[6-a] 반복 수급 바닥 합계', fmtN(day.sum) + '/일');
    note('[6-b] ⚑ 758(주인 지시 2026-09-02) — «하루 27만» 과녁은 무효', '새 과녁 = 총 유입 ≈ 현행의 1/2');
    note('[6-c] 758 게이트는 bot199 30일 실측 — 하향 전 기준선의 50% ± 5%p (이 절이 아니라 199 회차 표가 잰다)');
    note('[6-d] 지렛대 — 수정 광산 보상 곡선 · 패스 곡선(PASS_CUR) · 룰렛 기대값 · 광고 cap');
    note('[6-e] ⇒ 계수 확정은 **199**(봇 표 494). 이 절은 값만 찍고 실패로 세지 않는다(326 ck199 선례)');
  }

  /* ── §R 되돌림 시험 ───────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 옛 값/무력 상태로 되돌리면 실제로 빨개지는가');
  const rv = await ev(page, () => {
    const out = {};
    /* R-a 가이드 곡선을 옛 값(11,000+2,000i · 합 600,000 — 결1 ⓑ 이전)으로 되돌린다 */
    const keep = GUIDE.map(m => m.dia);
    GUIDE.forEach((m, i) => { m.dia = 11000 + 2000 * i; });
    out.gmSum = GUIDE.reduce((n, m) => n + gmDia(m), 0);
    GUIDE.forEach((m, i) => { m.dia = keep[i]; });
    out.gmBack = GUIDE.reduce((n, m) => n + gmDia(m), 0);
    /* R-b 출석 1일차를 옛 «환영» 값(100,000)으로 */
    const k2 = ATTEND[0].dia; ATTEND[0].dia = 100000;
    out.att = ATTEND[0].dia; ATTEND[0].dia = k2; out.attBack = ATTEND[0].dia;
    /* R-c 우편 c 를 옛 값(합 200,000)으로 */
    const k3 = MAILS.map(m => m.c);
    [80000, 40000, 40000, 20000, 20000].forEach((v, i) => { MAILS[i].c = v; });
    out.mail = MAILS.reduce((n, m) => n + m.c, 0);
    MAILS.forEach((m, i) => { m.c = k3[i]; }); out.mailBack = MAILS.reduce((n, m) => n + m.c, 0);
    /* R-d 달력을 무력화(전 칸 0)하면 2일차에 우편이 안 온다 — 시점 축이 실제로 물린다 */
    const k4 = WELCOME_DIA.slice();
    for (let i = 0; i < WELCOME_DIA.length; i++) WELCOME_DIA[i] = 0;
    Object.assign(S, DEF()); S.dia = 0; S.mailx = []; S.att = { n: 0, date: '' };
    claimAttend(); S.att.date = ''; claimAttend();
    out.wOff = (S.mailx || []).filter(x => x.src === 'welcome').length;
    for (let i = 0; i < k4.length; i++) WELCOME_DIA[i] = k4[i];
    Object.assign(S, DEF()); S.dia = 0; S.mailx = []; S.att = { n: 0, date: '' };
    claimAttend(); S.att.date = ''; claimAttend();
    out.wOn = (S.mailx || []).filter(x => x.src === 'welcome').length;
    return out;
  });
  if (rv) {
    yes('[R-a] 옛 미션 곡선(합 600,000)이면 합이 250,000 이 아니다', rv.gmSum !== GM, fmtN(rv.gmSum));
    is('[R-b]   원복하면 다시 250,000', rv.gmBack, GM);
    yes('[R-c] 옛 1일차 «환영»(100,000)이면 739 상수와 다르다', rv.att !== ATT, String(rv.att));
    is('[R-d]   원복하면 다시 1,000', rv.attBack, ATT);
    yes('[R-e] 옛 우편 값이면 합이 100,000 이 아니다', rv.mail !== MAIL, fmtN(rv.mail));
    is('[R-f]   원복하면 다시 100,000', rv.mailBack, MAIL);
    is('[R-g] 달력을 무력화하면 2일차 우편 0통 (시점 축이 실제로 물린다)', rv.wOff, 0);
    is('[R-h]   원복하면 2일차 우편 1통', rv.wOn, 1);
    /* 음성항 — 첫 승급 보상은 «rank === 1» 이 유일한 조건이라 조건을 못 쓰면 절대 안 나온다 */
    yes('[R-i] 첫 승급 보상 조건이 `S.rank === 1` 한 줄이다(새 세이브 키 0개)',
        /S\.rank\s*===\s*1\s*\?\s*FIRST_PROMO_DIA/.test(src));
  }

  console.log('\n[7] 콘솔');
  yes('[7-a] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nVERIFY498 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
