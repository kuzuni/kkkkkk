/* 작업 180 — 되돌림 시험(음성 대조). `node tools/neg180.js`
 *
 * `verify180` 이 **항등식이 아님**을 증명한다. 손잡이 5개를 하나씩 되돌린 사본
 * `.v180-neg.html` 을 만들고 **새로 열어서**(LESSONS 191 — 살아 있는 페이지에 덧씌우면 거짓 초록)
 * «이 손잡이를 되돌리면 어떤 항목이 빨개지고, 어떤 항목은 초록으로 남아야 하는가» 를 둘 다 단언한다.
 * 177-④ — 다 빨개지는 시험은 자를 흐리게 한다. 그래서 손잡이마다 **초록이 정답인 항목**을 같이 둔다.
 *
 *   N1 신규 다이아를 1,000 으로 되돌림      → 신규분만 빨감. 월별 우편은 초록.
 *   N2 dailyCheck 의 monthlyCheck 호출 제거 → 월별만 빨감. 신규 다이아는 초록.
 *   N3 우편 대신 S.dia 직접 가산(153 회귀)  → «수령 전 불변» 이 빨감. 신규 다이아는 초록.
 *   N4 monthlyCheck 를 날짜 if 블록 «안» 으로 → 첫 통은 오지만 «달 바뀜» 을 놓친다.
 *   N5 월별 금액 10만 → 5만                 → 금액만 빨감. 통수는 초록.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NEG = path.join(ROOT, '.v180-neg.html');
const KEY = 'idle_hunter_save_v4';

const WANT_MON_DIA = 100000;

let pass = 0; const fails = [];
const ok   = (m) => { pass++; console.log('  ok   ' + m); };
const fail = (m) => { fails.push(m); console.log('  FAIL ' + m); };
const eq   = (label, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(`${label} = ${JSON.stringify(got)}`)
  : fail(`${label} = ${JSON.stringify(got)} — 기대 ${JSON.stringify(want)}`));

/* 치환이 실제로 일어났는지 확인한다 — 222-① «손잡이가 안 돌아갔는데 초록» 을 막는다 */
function patch(from, to) {
  if (SRC.indexOf(from) < 0) throw new Error('손잡이를 못 찾았다: ' + from.slice(0, 60));
  const out = SRC.replace(from, to);
  if (out === SRC) throw new Error('치환이 일어나지 않았다: ' + from.slice(0, 60));
  fs.writeFileSync(NEG, out);
}

/* 사본을 «새로 열어» 상태를 읽는다. save 가 null 이면 신규 유저. */
async function probe(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
  }, [KEY, save === null ? null : JSON.stringify(save)]);
  const page = await ctx.newPage();
  await page.goto('file://' + NEG);
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const cnt = () => (S.mailx || []).filter(m => m.src === 'monthly').length;
    const first = cnt();
    const c0 = (S.mailx || []).filter(m => m.src === 'monthly').reduce((a, m) => a + m.c, 0);
    const diaAtBoot = S.dia;
    for (let i = 0; i < 10; i++) dailyCheck();
    const same = cnt();
    S.lastMonthly = '2000-01';
    dailyCheck();
    return { first, c0, diaAtBoot, same, afterMonthTurn: cnt() };
  });
  await ctx.close();
  return got;
}

(async () => {
  const browser = await launch(chromium);
  try {
    /* ---- N1 신규 다이아 되돌림 ---- */
    console.log('[N1] 신규 다이아 100만 → 1,000 (73 ② 시절 값)');
    patch('gold:0, dia:NEW_DIA,', 'gold:0, dia:1000,');
    let r = await probe(browser, null);
    eq('N1 신규 S.dia — 빨개야 한다', r.diaAtBoot, 1000);
    eq('N1 월별 우편 통수 — 초록으로 남아야 한다', r.first, 1);
    eq('N1 월별 금액 — 초록으로 남아야 한다', r.c0, WANT_MON_DIA);

    /* ---- N2 호출 사슬 절단 ---- */
    console.log('\n[N2] dailyCheck 에서 monthlyCheck() 호출 제거');
    patch('  monthlyCheck();\n}', '  /* neg180: 호출 제거 */\n}');
    r = await probe(browser, null);
    eq('N2 월별 우편 통수 — 빨개야 한다', r.first, 0);
    eq('N2 tick 20회 후에도 0', r.same, 0);
    eq('N2 신규 S.dia — 초록으로 남아야 한다', r.diaAtBoot, 1000000);

    /* ---- N3 153 회귀 — 우편 대신 직접 가산 ---- */
    console.log('\n[N3] 우편 대신 S.dia 직접 가산 (153 «지급품은 우편함» 회귀)');
    patch("  const m = sendMail({ t:'📅 월별 다이아', c:MONTHLY_DIA, src:'monthly',\n    b:'이번 달 «월별 다이아» 입니다. 보관 기간은 없습니다.' });",
          '  S.dia += MONTHLY_DIA; const m = null;');
    r = await probe(browser, null);
    eq('N3 월별 우편 통수 — 빨개야 한다', r.first, 0);
    eq('N3 수령 전인데 S.dia 가 먼저 늘었다 — 빨개야 한다', r.diaAtBoot, 1000000 + WANT_MON_DIA);

    /* ---- N4 호출을 날짜 if 블록 «안» 으로 ---- */
    console.log('\n[N4] monthlyCheck 를 «날짜 바뀜» if 블록 안으로');
    patch('    uiDirty = true;\n  }\n  monthlyCheck();\n}',
          '    uiDirty = true;\n    monthlyCheck();\n  }\n}');
    r = await probe(browser, null);
    /* 첫 부팅은 날짜가 «바뀐» 것이라 한 통은 온다 — 그래서 통수만 보는 자로는 안 잡힌다 */
    eq('N4 첫 통은 그대로 온다 — 초록', r.first, 1);
    eq('N4 달이 바뀌어도 안 온다 — 빨개야 한다', r.afterMonthTurn, 1);

    /* ---- N5 금액 ---- */
    console.log('\n[N5] 월별 금액 10만 → 5만');
    patch('const MONTHLY_DIA = 100000;', 'const MONTHLY_DIA = 50000;');
    r = await probe(browser, null);
    eq('N5 월별 금액 — 빨개야 한다', r.c0, 50000);
    eq('N5 통수 — 초록으로 남아야 한다', r.first, 1);
    eq('N5 신규 S.dia — 초록으로 남아야 한다', r.diaAtBoot, 1000000);

  } catch (err) {
    fail('음성 시험 자체가 죽었다 — ' + err.message);
  } finally {
    await browser.close();
    try { fs.unlinkSync(NEG); } catch (e) {}
  }

  console.log('\nNEG180 ' + pass + '/' + (pass + fails.length) + (fails.length ? ' FAIL' : ' PASS'));
  if (fails.length) { fails.forEach(f => console.log('  · ' + f)); process.exit(1); }
})();
