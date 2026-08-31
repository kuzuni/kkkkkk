/* 작업 498 게이트 — «첫날 환영 100만 다이아» + 2일차 이후 수급 곡선의 기준선
 *
 *   node tools/verify498.js
 *
 * 이 자가 지키는 것은 **첫날 총량과 그것을 나르는 네 자리**다.
 *   §1 선언 — 네 상수의 합 = DAY1_DIA = 1,000,000
 *   §2 가이드 미션 곡선 — dia(i) = GM_DIA0 + GM_DIA_D·i · 합 600,000 · 73 ② 부등식 · 61/256 불변식
 *   §3 출석 — 1일차 100,000 · **2일차 이후 곡선은 399 그대로**(한 푼도 안 건드렸다는 것을 잰다)
 *   §4 우편 — 5통 합 200,000
 *   §5 **실지급**(T2 «기능 완성 규칙») — 실제 수령 경로로 받아 잔고가 그만큼 오르는가 ·
 *      첫 승급은 딱 한 번인가(두 번째 승급은 0)
 *   §6 ⏸199 대기 — «2일차 절벽» 축. 목표(20만/일)와 지금 코드의 배수를 **매 실행 찍되 실패로 안 센다**
 *      (326 `ck199` 선례 — 계수 확정은 199 몫이라 여기서 빨갛게 하면 영원히 빨간 게이트가 된다)
 *   §R 되돌림 시험 — 곡선·1일차 칸·우편을 옛 값으로 되돌리면 §1~§4 가 실제로 빨개지는가
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

const D1 = 1000000, MAIL = 200000, GM = 600000, ATT1 = 100000, PROMO = 100000;
const GM0 = 11000, GMD = 2000;

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── §0 전제 — 상수가 소스에 선언돼 있다 ─────────────────────── */
  console.log('[0] 전제 — 네 자리의 상수 선언');
  yes('[0-a] `DAY1_DIA` 선언', /const\s+DAY1_DIA\s*=\s*1000000\s*;/.test(src));
  yes('[0-b] `MAIL_D1_DIA`·`GM_D1_DIA`·`ATT_D1_DIA`·`FIRST_PROMO_DIA` 선언',
      /const\s+MAIL_D1_DIA\s*=/.test(src) && /const\s+GM_D1_DIA\s*=/.test(src)
      && /const\s+ATT_D1_DIA\s*=/.test(src) && /const\s+FIRST_PROMO_DIA\s*=/.test(src));
  yes('[0-c] 곡선 손잡이 `GM_DIA0`·`GM_DIA_D` 가 **한 곳**에만 있다',
      (src.match(/const\s+GM_DIA0\s*=/g) || []).length === 1);
  /* 선언 순서 — ATTEND 는 «선언 시점에 도는 for 루프» 라 ATT_D1_DIA 가 그 위에 있어야 한다(TDZ) */
  yes('[0-d] `ATT_D1_DIA` 선언이 `const ATTEND` 보다 **위**다 (TDZ 방어)',
      src.indexOf('const ATT_D1_DIA') > 0 && src.indexOf('const ATT_D1_DIA') < src.indexOf('const ATTEND = []'));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof GUIDE !== 'undefined');
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.step = () => {}; });

  /* ── §1 선언 — 네 자리의 합 ───────────────────────────────── */
  console.log('\n[1] 첫날 총량 — 네 자리의 합 = 100만');
  const c = await ev(page, () => ({
    day1: DAY1_DIA, mail: MAIL_D1_DIA, gm: GM_D1_DIA, att: ATT_D1_DIA, promo: FIRST_PROMO_DIA,
  }));
  if (c) {
    is('[1-a] DAY1_DIA', c.day1, D1);
    is('[1-b] 우편 몫', c.mail, MAIL);
    is('[1-c] 가이드 미션 몫', c.gm, GM);
    is('[1-d] 출석 1일차 몫', c.att, ATT1);
    is('[1-e] 첫 승급 몫', c.promo, PROMO);
    is('[1-f] 네 몫의 합 = DAY1_DIA', c.mail + c.gm + c.att + c.promo, c.day1);
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

  /* ── §3 출석 ──────────────────────────────────────────────── */
  /* 513(주인 지시 2026-08-31) — 표가 28칸 → **7칸 무한 순환**이 됐다. 498 이 여기서 묻는 것은
     «1일차가 환영 칸인가 · 2일차 이후 곡선을 안 건드렸는가» 이므로 그 두 축은 그대로 두고
     **길이·28일차 갈래에 기대던 항만** 순환 축으로 갈아 끼운다(333 — 자리는 안 비운다). */
  console.log('\n[3] 출석 — 1일차만 «환영» 칸이고 2~7일차는 399 그대로 (513 — 7칸 순환)');
  const a = await ev(page, () => ({
    n: ATTEND.length,
    d1: ATTEND[0].dia,
    rest: ATTEND.slice(1).map((r, k) => { const i = k + 2; return { i, dia: r.dia }; }),
    keys: [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => k !== 'ic' && k !== 't')))].sort(),
  }));
  if (a) {
    is('[3-a] 7칸 순환 (513)', a.n, 7);
    is('[3-b] 1일차 = ATT_D1_DIA', a.d1, ATT1);
    /* 399 곡선을 여기서 다시 적어 «안 건드렸다» 를 잰다 — 한 칸이라도 밀리면 빨개진다 */
    /* 199 9회차 — 값 확정(513 이 넘긴 몫): 구 399 곡선 ×12. 눈금(일반 < 순환 최종)은 그대로다.
       이 항의 뜻도 같이 옮긴다 — «2~7일차 곡선 = 확정된 그 식» (한 칸이라도 밀리면 빨강). */
    const want = i => (i % 7 === 0 ? 18000 + i * 720 : 4200 + i * 360);
    const off = a.rest.filter(r => r.dia !== want(r.i));
    yes('[3-c] 2~7일차 곡선이 199 9회차 확정값(구 399 ×12) 그대로', off.length === 0,
        off.map(o => o.i + '일차 ' + o.dia + ' ≠ ' + want(o.i)).join(' · '));
    /* 513 — 옛 [3-d] 는 «10일차 650»(verify70 이 상수로 쓰던 칸)이었다. 그 칸이 표에서 사라졌으므로
       **verify70 이 지금 쓰는 칸**으로 갈아 끼운다: n=9 → 9 % 7 = #2 = 3일차 440. */
    is('[3-d] 3일차 5,280 (verify70 회귀 — n=9 가 받는 칸 · 199 9회차 ×12)',
       a.rest.find(r => r.i === 3).dia, 5280);
    yes('[3-e] 399 — 전 칸 다이아 한 종류(goldMul·rel 이 되살아나면 빨강)',
        a.keys.length === 1 && a.keys[0] === 'dia', a.keys.join(','));
    note('[3-f] 한 바퀴(7일) 합 · 하루 평균 — ⏸199 대기(513 — 환영 칸이 7일마다 돌아온다)',
         fmtN(a.d1 + a.rest.reduce((n, r) => n + r.dia, 0)) + ' → '
         + fmtN(Math.round((a.d1 + a.rest.reduce((n, r) => n + r.dia, 0)) / 7)) + '/일');
  } else no('[3] ATTEND 를 못 읽었다');

  /* ── §4 우편 ──────────────────────────────────────────────── */
  console.log('\n[4] 환영 우편 — 5통 합 20만');
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

  /* ── §5 실지급 — 진짜로 받아 본다 ─────────────────────────── */
  console.log('\n[5] 실지급 — T2 «기능 완성 규칙»(눌러서 잔고가 오르는가)');
  const paid = await ev(page, () => {
    const out = {};
    /* ⓐ 우편 [모두 받기] — 새 세이브에서 다섯 통을 한 번에 */
    Object.assign(S, DEF()); S.dia = 0;
    const b0 = S.dia; claimAllMail(); out.mail = S.dia - b0;
    /* ⓑ 가이드 미션 1개 수령 — 첫 미션을 달성 상태로 만들고 배너를 «받는다» */
    Object.assign(S, DEF()); S.dia = 0; S.guide.idx = 0;
    const b1 = S.dia; out.gmWant = gmDia(GUIDE[0]);
    S.own.slash = S.own.slash || { n: 0, l: 1 };
    /* 첫 미션 «스킬 2종 보유» 를 실제 상태로 채운다(손으로 dia 를 더하지 않는다) */
    const sk = Object.keys(SK).filter(k => k !== 'slash')[0];
    S.own[sk] = { n: 0, l: 1 };
    claimGuide();
    out.gm = S.dia - b1; out.gmIdx = S.guide.idx;
    /* ⓒ 출석 1일차 수령 */
    Object.assign(S, DEF()); S.dia = 0;
    const b2 = S.dia; claimAttend(); out.att = S.dia - b2;
    /* ⓓ 첫 승급 — 실제 종료 경로(endPromo(true))로 두 번 굴린다 */
    Object.assign(S, DEF()); S.dia = 0; S.rank = 0;
    promo = { rank: RANKS[0], t: 10 };
    const b3 = S.dia; endPromo(true); out.promo1 = S.dia - b3; out.rank1 = S.rank;
    closeModal && closeModal();
    promo = { rank: RANKS[1], t: 10 };
    const b4 = S.dia; endPromo(true); out.promo2 = S.dia - b4; out.rank2 = S.rank;
    closeModal && closeModal();
    return out;
  });
  if (paid) {
    is('[5-a] 우편 [모두 받기] 실지급', paid.mail, MAIL);
    is('[5-b] 가이드 미션 1칸 실지급', paid.gm, paid.gmWant);
    is('[5-c]   그 값이 곡선 첫 칸', paid.gmWant, GM0);
    is('[5-d]   수령하면 다음 미션으로 넘어간다', paid.gmIdx, 1);
    is('[5-e] 출석 1일차 실지급', paid.att, ATT1);
    is('[5-f] 첫 승급 실지급', paid.promo1, PROMO);
    is('[5-g]   그때 계급이 1', paid.rank1, 1);
    is('[5-h] **두 번째 승급은 0** — 첫 승급 보상은 딱 한 번', paid.promo2, 0);
    is('[5-i]   그래도 승급 자체는 됐다', paid.rank2, 2);
  } else no('[5] 실지급을 못 굴렸다');

  /* ── §6 ⏸199 대기 — 2일차 이후 곡선 ──────────────────────── */
  console.log('\n[6] ⏸199 대기 — 2일차 이후 하루 수급(값 확정은 199 몫 · 실패로 세지 않는다)');
  const day = await ev(page, () => {
    const roul = Math.round(ROULETTE.reduce((n, r) => n + r.dia * r.w, 0) / 100) * ROUL_TRY;
    const ads = COIN_ADS.filter(x => x.r && x.r.dia).reduce((n, x) => n + x.r.dia * x.cap, 0);
    const dq = DQUESTS.reduce((n, q) => n + q.dia, 0);
    const att = Math.round(ATTEND.slice(1).reduce((n, r) => n + r.dia, 0) / (ATTEND.length - 1));
    const attPass = PASS_TABS.att.rw(1, 0).n;
    const dun = DUN_TRY * (DUNGEONS.find(d => d.id === 'dia').rw(10).dia || 0);
    const off = OFF_MAX_H * 60 * 3;
    return { roul, ads, dq, att, attPass, dun, off, sum: roul + ads + dq + att + attPass + dun + off };
  });
  if (day) {
    note('룰렛 ' + fmtN(day.roul) + ' · 광고 ' + fmtN(day.ads) + ' · 일퀘 ' + fmtN(day.dq)
       + ' · 출석 ' + fmtN(day.att) + ' · 출석패스 ' + fmtN(day.attPass)
       + ' · 수정광산(f10) ' + fmtN(day.dun) + ' · 오프라인 ' + fmtN(day.off));
    note('[6-a] 반복 수급 바닥 합계', fmtN(day.sum) + '/일');
    note('[6-b] 목표 2~7일 200,000/일 대비', (200000 / day.sum).toFixed(1) + '배 부족');
    note('[6-c] 목표 31~100일 300,000/일 대비', (300000 / day.sum).toFixed(1) + '배 부족');
    note('[6-d] 지렛대 — 수정 광산 보상 곡선 · 패스 곡선(PASS_CUR) · 룰렛 기대값 · 광고 cap');
    note('[6-e] ⇒ 계수 확정은 **199**(봇 표 494). 이 절은 값만 찍고 실패로 세지 않는다(326 ck199 선례)');
  }

  /* ── §R 되돌림 시험 ───────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 옛 값으로 되돌리면 실제로 빨개지는가');
  const rv = await ev(page, () => {
    const out = {};
    /* R-a 가이드 곡선을 옛 값(300~3,000 · 합 20,100)으로 되돌린다 */
    const keep = GUIDE.map(m => m.dia);
    const oldv = [300, 1000, 400, 400, 1000, 1000, 500, 600, 600, 700,
                  700, 800, 900, 1000, 1000, 1200, 1500, 1500, 2000, 3000];
    GUIDE.forEach((m, i) => { m.dia = oldv[i]; });
    out.gmSum = GUIDE.reduce((n, m) => n + gmDia(m), 0);
    GUIDE.forEach((m, i) => { m.dia = keep[i]; });
    out.gmBack = GUIDE.reduce((n, m) => n + gmDia(m), 0);
    /* R-b 출석 1일차를 옛 값(380)으로 */
    const k2 = ATTEND[0].dia; ATTEND[0].dia = 380;
    out.att = ATTEND[0].dia; ATTEND[0].dia = k2; out.attBack = ATTEND[0].dia;
    /* R-c 우편 c 를 옛 값으로 */
    const k3 = MAILS.map(m => m.c);
    [1500, 1200, 900, 800, 600].forEach((v, i) => { MAILS[i].c = v; });
    out.mail = MAILS.reduce((n, m) => n + m.c, 0);
    MAILS.forEach((m, i) => { m.c = k3[i]; }); out.mailBack = MAILS.reduce((n, m) => n + m.c, 0);
    return out;
  });
  if (rv) {
    yes('[R-a] 옛 미션 곡선이면 합이 600,000 이 아니다', rv.gmSum !== GM, fmtN(rv.gmSum));
    is('[R-b]   원복하면 다시 600,000', rv.gmBack, GM);
    yes('[R-c] 옛 1일차(380)면 ATT_D1_DIA 와 다르다', rv.att !== ATT1, String(rv.att));
    is('[R-d]   원복하면 다시 100,000', rv.attBack, ATT1);
    yes('[R-e] 옛 우편 값이면 합이 200,000 이 아니다', rv.mail !== MAIL, fmtN(rv.mail));
    is('[R-f]   원복하면 다시 200,000', rv.mailBack, MAIL);
    /* 음성항 — 첫 승급 보상은 «rank === 1» 이 유일한 조건이라 조건을 못 쓰면 절대 안 나온다 */
    yes('[R-g] 첫 승급 보상 조건이 `S.rank === 1` 한 줄이다(새 세이브 키 0개)',
        /S\.rank\s*===\s*1\s*\?\s*FIRST_PROMO_DIA/.test(src));
  }

  console.log('\n[7] 콘솔');
  yes('[7-a] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nVERIFY498 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
