/* 작업 180 — «신규 유저 다이아 100만 + 매월 1회 우편 «월별 다이아» 10만» 회귀 게이트.
 *   node tools/verify180.js
 *
 * 주인 지시(2026-08-27) 원문: «신규 유저 다이아 100만, 한 달에 한 번 우편함으로 '월별 다이아' 10만».
 * 구현은 두 곳뿐이다 — `DEF().dia = NEW_DIA` · `monthlyCheck()`(dailyCheck 안에서 같이 돈다).
 * 지급은 153 규약대로 `sendMail()` **한 문**만 지난다(직접 가산 금지).
 *
 * 아홉 겹으로 본다:
 *   [A] 정적 — 상수 두 개가 그 값인가 · monthlyCheck 가 직접 가산 없이 sendMail 을 지나는가 ·
 *              dailyCheck 가 monthlyCheck 를 부르는가(호출이 끊기면 아래 [C]~[E] 가 전부 죽는다).
 *   [B] 신규 유저 — 세이브 없이 부팅하면 S.dia 가 정확히 1,000,000 이고 HUD 가 그 값을 그리는가.
 *   [C] 첫 달 우편 — 부팅 직후 src:'monthly' 우편이 **딱 1통**(c=100,000) 뜨고 ▦ 레드닷이 켜지는가.
 *   [D] 한 달에 한 통 — dailyCheck 를 여러 번 돌려도 통수가 안 늘고, 달이 바뀌면 한 통 더 오는가.
 *   [E] 밀린 달 소급 = 최근 1통 — 석 달 비운 세이브로 부팅해도 **1통**인가(3통이 아니다).
 *   [F] 실제 클릭 — 우편함 [받기] 를 진짜로 눌러 정확히 +100,000 이 들어오는가.
 *   [G] 구 세이브 — 소급 없음(dia 유지) + 달 열쇠가 없어도 이번 달 한 통.
 *   [H] 타입 방어 — lastMonthly 가 문자열이 아니면(손댄 세이브) 매 tick 우편이 쌓이지 않는가.
 *   [I] 과교정 잠금 — 73 ② 하한(초기 다이아 ≥ 1,000)과 153 «지급품은 우편함» 이 살아 있는가 · 에러 0.
 *
 * 기대값은 전부 이 파일의 자기 상수다(212-① — 제품에서 읽어 오면 둘이 같이 틀려도 초록이다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

/* ---- 게이트 자기 상수 (제품에서 읽지 않는다) ---- */
const WANT_NEW_DIA = 1000000;
const WANT_MON_DIA = 100000;
const WANT_TITLE   = '월별 다이아';
const WANT_SRC     = 'monthly';
const MIN_START_DIA = 1000;      /* 73 ② 하한 — 첫 가이드 미션이 스킬 10연(1,000) 이다 */

let pass = 0; const fails = [];
const ok   = (m) => { pass++; console.log('  ok   ' + m); };
const fail = (m) => { fails.push(m); console.log('  FAIL ' + m); };
const eq   = (label, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(`${label} = ${JSON.stringify(got)}`)
  : fail(`${label} = ${JSON.stringify(got)} — 기대 ${JSON.stringify(want)}`));

/* 소스에서 함수 본문 한 덩어리를 중괄호 짝으로 잘라 낸다(정적 검사 [A] 전용) */
function body(sig) {
  const i = SRC.indexOf(sig);
  if (i < 0) return null;
  const s = SRC.indexOf('{', i);
  let d = 0;
  for (let j = s; j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}' && --d === 0) return SRC.slice(s, j + 1);
  }
  return null;
}

/* save 를 심어 두고 연다. save 가 null 이면 «세이브 없는 신규 유저» 다.
   freezeClock=true 면 프레임 시계를 고정한다(790 — 아래 [G] 전용, 쓰는 자리에 이유가 적혀 있다). */
async function open(browser, save, freezeClock) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v, freeze]) => {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    /* 790 — 618 이 verify123 §10 에서 쓴 것과 같은 처방. 제품 loop 의 dt = (now-last)/1000 이 0 이 되어
       step(0) = 전투 정지, 렌더·부팅 지급(dailyCheck 월별 우편)은 그대로다 — probe790 [3] 이 대조로 못박았다.
       **기본값은 끔**: [B]~[F]·[H] 는 전투가 도는 채로 물어야 하는 절이라 이 절에만 켠다. */
    if (freeze) {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf(() => cb(0));
    }
  }, [KEY, save === null ? null : JSON.stringify(save), !!freezeClock]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}
/* 브라우저 안에서 «이번 달 열쇠» 를 만든다 — 게이트가 UTC 로 계산하면 월말 자정에 하루 어긋난다.
   제품과 **같은 로컬 시각** 규칙(YYYY-MM, 월 2자리)을 게이트 쪽에서 다시 적는다(212-①). */
const MK_JS = `(d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'))`;

(async () => {
  const browser = await launch(chromium);
  try {
    /* ================= [A] 정적 ================= */
    console.log('[A] 정적 — 상수 · 지급 경로 · 호출 사슬');
    const mNew = /const\s+NEW_DIA\s*=\s*(\d+)/.exec(SRC);
    const mMon = /const\s+MONTHLY_DIA\s*=\s*(\d+)/.exec(SRC);
    mNew ? eq('NEW_DIA 상수', Number(mNew[1]), WANT_NEW_DIA) : fail('NEW_DIA 상수를 못 찾았다');
    mMon ? eq('MONTHLY_DIA 상수', Number(mMon[1]), WANT_MON_DIA) : fail('MONTHLY_DIA 상수를 못 찾았다');
    /^[\s\S]*$/.test(SRC) && /gold:0,\s*dia:NEW_DIA/.test(SRC)
      ? ok('DEF() 의 dia 가 NEW_DIA 를 쓴다')
      : fail('DEF() 의 dia 가 NEW_DIA 가 아니다 — 리터럴로 되돌아갔다');

    const bMon = body('function monthlyCheck()');
    bMon ? ok('monthlyCheck 본문 확보') : fail('monthlyCheck 본문을 못 찾았다');
    if (bMon) {
      !/S\.dia\s*\+=/.test(bMon)
        ? ok('monthlyCheck — S.dia 직접 가산 없음(153 «지급품은 우편함»)')
        : fail('monthlyCheck 가 S.dia 를 직접 더한다 — 153 회귀');
      /sendMail\(/.test(bMon) ? ok('monthlyCheck — sendMail 경유') : fail('monthlyCheck 가 sendMail 을 안 쓴다');
      /S\.lastMonthly\s*===?\s*mk/.test(bMon)
        ? ok('monthlyCheck — 달 열쇠를 비교해 같은 달을 거른다')
        : fail('monthlyCheck 에 «같은 달이면 거른다» 가 없다');
    }
    const bDaily = body('function dailyCheck()');
    bDaily && /monthlyCheck\(\)/.test(bDaily)
      ? ok('dailyCheck 가 monthlyCheck 를 부른다')
      : fail('dailyCheck 가 monthlyCheck 를 안 부른다 — 월별 지급이 통째로 죽는다');
    /* 날짜 분기 «밖» 에서 불러야 한다 — 안에 넣으면 «날이 바뀐 tick» 에만 달을 본다 */
    if (bDaily) {
      const i0 = bDaily.indexOf('monthlyCheck()');
      const i1 = bDaily.lastIndexOf('}', i0);
      /* 날짜 if 블록이 닫힌 뒤에 있는가 = 그 앞 마지막 `}` 와 호출 사이에 `S.daily.` 가 없다 */
      i0 > 0 && !/S\.daily\./.test(bDaily.slice(i1, i0))
        ? ok('monthlyCheck 호출이 «날짜 바뀜» if 블록 밖에 있다')
        : fail('monthlyCheck 가 날짜 분기 안에서만 돈다 — 같은 날 달이 바뀌는 경계를 놓친다');
    }
    /* load() 가 달 열쇠 타입을 못박는가 */
    /typeof\s+d\.lastMonthly\s*===\s*'string'/.test(SRC)
      ? ok('load() 가 lastMonthly 타입을 못박는다')
      : fail('load() 에 lastMonthly 타입 가드가 없다');

    /* ================= [B] 신규 유저 — 다이아 100만 ================= */
    console.log('\n[B] 신규 유저 — 세이브 없이 부팅');
    const b = await open(browser, null);
    const bGot = await b.page.evaluate(() => ({
      dia: S.dia, hud: (document.getElementById('diaN') || {}).textContent || ''
    }));
    eq('신규 S.dia', bGot.dia, WANT_NEW_DIA);
    /* HUD 는 fmt() 를 지나 쉼표가 붙는다 — 숫자만 뽑아 비교한다(표기 규칙은 150 의 몫) */
    eq('HUD #diaN 의 숫자', Number(String(bGot.hud).replace(/[^\d]/g, '')), WANT_NEW_DIA);
    bGot.dia >= MIN_START_DIA
      ? ok(`[I] 73 ② 하한 유지 — 초기 다이아 ${bGot.dia} ≥ ${MIN_START_DIA}`)
      : fail(`[I] 73 ② 하한 붕괴 — 초기 다이아 ${bGot.dia} < ${MIN_START_DIA}`);
    /* ★ 자릿수가 4 → 7 로 늘었다. 「1,000,000」 이 HUD 알약을 넘거나 골드 알약과 겹치면
       그것은 이 작업이 만든 결함이다 — 화면비를 바꿔 가며 실측한다(수령 후 1,100,000 도 같은 자릿수). */
    for (const [w, h] of [[1080, 2280], [1080, 1920], [1024, 768]]) {
      await b.page.setViewportSize({ width: w, height: h });
      await b.page.waitForTimeout(300);
      const fit = await b.page.evaluate(() => {
        const box = document.querySelector('.cbox.cDia').getBoundingClientRect();
        const num = document.getElementById('diaN').getBoundingClientRect();
        const gold = document.querySelector('.cbox.cGold').getBoundingClientRect();
        return { over: +(num.right - box.right).toFixed(1), lap: +(gold.right - box.left).toFixed(1) };
      });
      fit.over <= 0 ? ok(`${w}×${h} — 다이아 숫자가 알약 안 (여백 ${-fit.over}px)`)
        : fail(`${w}×${h} — 다이아 숫자가 알약을 ${fit.over}px 넘친다`);
      fit.lap <= 0 ? ok(`${w}×${h} — 골드 알약과 겹침 0 (간격 ${-fit.lap}px)`)
        : fail(`${w}×${h} — 골드 알약과 ${fit.lap}px 겹친다`);
    }
    await b.page.setViewportSize({ width: 1080, height: 2280 });
    await b.page.waitForTimeout(200);

    /* ================= [C] 첫 달 우편 ================= */
    console.log('\n[C] 첫 달 «월별 다이아» 우편');
    const cGot = await b.page.evaluate((mkjs) => {
      const mk = eval(mkjs)(new Date());
      const ms = (S.mailx || []).filter(m => m.src === 'monthly');
      return { n: ms.length, t: ms[0] ? ms[0].t : '', c: ms[0] ? ms[0].c : -1,
               g: ms[0] ? ms[0].g : -1, r: ms[0] ? ms[0].r : -1, mi: ms[0] ? ms[0].m : -1,
               key: S.lastMonthly, mk,
               dot: document.getElementById('menub').classList.contains('alert'),
               dia: S.dia };
    }, MK_JS);
    eq('src:monthly 우편 통수', cGot.n, 1);
    cGot.t.indexOf(WANT_TITLE) >= 0
      ? ok(`우편 제목에 «${WANT_TITLE}» 포함 — "${cGot.t}"`)
      : fail(`우편 제목에 «${WANT_TITLE}» 가 없다 — "${cGot.t}"`);
    eq('우편 다이아 수량', cGot.c, WANT_MON_DIA);
    eq('우편의 다른 재화(골드·유물조각·쿠폰)', [cGot.g, cGot.r, cGot.mi], [0, 0, 0]);
    eq('S.lastMonthly = 이번 달', cGot.key, cGot.mk);
    cGot.dot ? ok('▦ 메뉴 레드닷이 켜졌다') : fail('▦ 메뉴 레드닷이 안 켜졌다');
    /* ★ 지급은 «수령 전» 이다 — 우편이 왔다고 다이아가 먼저 들어오면 안 된다(153) */
    eq('[I] 수령 전 S.dia 불변(우편만 왔다)', cGot.dia, WANT_NEW_DIA);

    /* ================= [D] 한 달에 한 통 ================= */
    console.log('\n[D] 한 달에 한 통 — 반복 tick · 달 바뀜');
    const dGot = await b.page.evaluate((mkjs) => {
      const cnt = () => (S.mailx || []).filter(m => m.src === 'monthly').length;
      for (let i = 0; i < 20; i++) dailyCheck();      /* 제품이 30초마다 부르는 그 문 */
      const same = cnt();
      S.lastMonthly = '2000-01';                      /* «달이 바뀌었다» 를 만든다 */
      dailyCheck();
      const next = cnt();
      const mk = eval(mkjs)(new Date());
      return { same, next, key: S.lastMonthly, mk };
    }, MK_JS);
    eq('같은 달 dailyCheck ×20 후 통수', dGot.same, 1);
    eq('달이 바뀐 뒤 통수', dGot.next, 2);
    eq('달 열쇠가 이번 달로 갱신', dGot.key, dGot.mk);
    await b.ctx.close();

    /* ================= [E] 밀린 달 소급 = 최근 1통 ================= */
    console.log('\n[E] 석 달 비운 세이브 — 소급은 최근 1통뿐');
    const e = await open(browser, { gold: 0, dia: 5000, lastMonthly: '2025-05', mailx: [], mailSeq: 0, mail: {} });
    const eGot = await e.page.evaluate(() => ({
      n: (S.mailx || []).filter(m => m.src === 'monthly').length,
      c: (S.mailx || []).filter(m => m.src === 'monthly').reduce((a, m) => a + m.c, 0)
    }));
    eq('석 달치 소급 통수', eGot.n, 1);
    eq('석 달치 소급 다이아 총액', eGot.c, WANT_MON_DIA);
    await e.ctx.close();

    /* ================= [F] 실제 클릭 수령 ================= */
    console.log('\n[F] 우편함 [받기] 를 진짜로 눌러 지급되는가');
    const f = await open(browser, null);
    const fSel = await f.page.evaluate(() => {
      const m = (S.mailx || []).find(x => x.src === 'monthly');
      if (!m) return null;
      openMail();
      window.__f180 = { id: m.id, d0: S.dia };
      return document.querySelector('#mbox [data-ml="' + m.id + '"]') ? m.id : null;
    });
    fSel ? ok('월별 우편 행의 [받기] 버튼이 렌더됐다') : fail('월별 우편 행 버튼이 없다');
    if (fSel) {
      await f.page.click('#mbox [data-ml="' + fSel + '"]');
      await f.page.waitForTimeout(1800);              /* 58/93 FXHOLD 를 넘긴다 */
      const fGot = await f.page.evaluate(() => ({
        dDia: S.dia - window.__f180.d0, state: S.mail[window.__f180.id], dia: S.dia
      }));
      eq('클릭 수령 ΔS.dia', fGot.dDia, WANT_MON_DIA);
      eq('클릭 수령 후 우편 상태', fGot.state, 1);
      eq('수령 후 S.dia 절대값', fGot.dia, WANT_NEW_DIA + WANT_MON_DIA);
      /* 세이브 라운드트립 — 수령분이 실제로 남는가 */
      const fSave = await f.page.evaluate((k) => {
        save(); return JSON.parse(localStorage.getItem(k)).dia;
      }, KEY);
      eq('세이브에 남은 dia', fSave, WANT_NEW_DIA + WANT_MON_DIA);
    }
    await f.ctx.close();

    /* ================= [G] 구 세이브 — 소급 없음 + 이번 달 한 통 ================= */
    console.log('\n[G] 구 세이브(lastMonthly 없음) — 신규분 소급 없음');
    /* 790 — 프레임 시계 고정(open 의 3번째 인자). 이 절이 묻는 것은 «load() 가 구 세이브 값을 지키는가» 인데,
       부팅 즉시 도는 자동 전투가 아래 900ms 대기 중 첫 킬 드랍을 내면 골드 표본이 오염된다 —
       probe790 [1] 실측: 첫 킬이 **정확히 900ms 창 끝자락**(t≈900ms 에 kills 0→1 · gold 12345 → 12354.66)이라
       실행마다 들락날락한다. stage 7 이라 드랍이 ~10 이고, 그것이 12355.737 의 정체다.
       오프라인 축은 결백(표본에 time 이 없어 offPend 자체가 안 생긴다 — probe790 [2]).
       ⚠ `12345` 엄격 비교를 «≈» 로 무르게 풀지 마라(등재문 반려 사유) — 그러면 «구 세이브 값이 그대로다»
       라는 단언이 뜻을 잃는다. 아래 «킬 0» 항이 이 고정을 지킨다(고정이 빠지면 골드 항보다 먼저,
       뜻이 보이는 이름으로 빨개진다). 지급 축이 안 멈추는 것은 probe790 [3] 이 대조로 확인했다. */
    const g = await open(browser, { gold: 12345, dia: 1000, stage: 7, best: 7, mailx: [], mailSeq: 0, mail: {} }, true);
    const gGot = await g.page.evaluate((mkjs) => ({
      dia: S.dia, key: S.lastMonthly, mk: eval(mkjs)(new Date()),
      n: (S.mailx || []).filter(m => m.src === 'monthly').length, gold: S.gold, stage: S.stage,
      kills: S.totalKills
    }), MK_JS);
    eq('구 세이브 dia — 소급 없이 그대로', gGot.dia, 1000);
    eq('골드 표본 창에 전투 수입이 안 섞였다(시계 고정 = 킬 0 — 790)', gGot.kills, 0);
    eq('구 세이브 gold·stage 불변', [gGot.gold, gGot.stage], [12345, 7]);
    eq('구 세이브도 이번 달 우편 1통', gGot.n, 1);
    eq('구 세이브 달 열쇠 채워짐', gGot.key, gGot.mk);
    await g.ctx.close();

    /* ================= [H] 타입 방어 ================= */
    console.log('\n[H] 손댄 세이브 — lastMonthly 가 문자열이 아니어도 폭탄이 안 된다');
    const h = await open(browser, { dia: 0, lastMonthly: null, mailx: [], mailSeq: 0, mail: {} });
    const hGot = await h.page.evaluate(() => {
      for (let i = 0; i < 20; i++) dailyCheck();
      return { key: S.lastMonthly, n: (S.mailx || []).filter(m => m.src === 'monthly').length };
    });
    eq('null 열쇠 → 문자열로 정화 후 통수', hGot.n, 1);
    typeof hGot.key === 'string' ? ok('lastMonthly 가 문자열이다') : fail('lastMonthly 가 문자열이 아니다');
    const hErr = h.errs.slice();
    await h.ctx.close();

    /* ================= [I] 에러 0 ================= */
    console.log('\n[I] 콘솔·런타임 에러');
    const allErr = b.errs.concat(e.errs, f.errs, g.errs, hErr);
    allErr.length === 0 ? ok('에러 0') : fail('에러 ' + allErr.length + '건 — ' + allErr.slice(0, 3).join(' | '));

  } catch (err) {
    fail('게이트 자체가 죽었다 — ' + err.message);
  } finally {
    await browser.close();
  }

  console.log('\nVERIFY180 ' + pass + '/' + (pass + fails.length) + (fails.length ? ' FAIL' : ' PASS'));
  if (fails.length) { fails.forEach(f => console.log('  · ' + f)); process.exit(1); }
})();
