/* 작업 513 재현 프로브 — «출석 보상을 1~7일 무한 순환으로 · 8일차 이후 칸을 없앤다»
 *
 *   node tools/probe513.js
 *
 * 338·341·350·372·464 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * (338·341·377 은 여기서 등재문이 기각됐고, 350·363·455·464 는 확인됐다. 어느 쪽인지는 제품만 안다.)
 *
 * 등재문(PROGRESS 513)이 적은 다섯 자리:
 *   ⓐ `ATTEND`(~18369) = `for(i=1..28)` **28칸**
 *   ⓑ `claimAttend`(~24880) `const day = S.att.n % 28`
 *   ⓒ `openAttend`(~26866) `day = S.att.n % 28` · `base = Math.floor(day/7)*7` 로 **4주차 중 현재 주차**
 *   ⓓ 라벨은 `(idx+1)일 차` — 그래서 2주차에는 «8일 차»~«14일 차» 가 실제로 그려진다
 *   ⓔ 36 출석 패스(`PASS_TABS.att`)와 던전 입장권(+`DUN_TRY`)은 **누적 접속일** 축이라 순환과 무관
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464·498 규약).
 *   그래서 이 자의 `✅` 항은 **수리 전·후 둘 다 참인 불변식**만 묻는다:
 *     · 팝업이 그리는 칸은 언제나 «격자 6 + 전폭 1 = 7장» 이다(주차를 접든 순환하든 7장)
 *     · 받는 칸은 언제나 `ATTEND[S.att.n % ATTEND.length]` 다(«% 28» 은 그 식의 옛 특수형)
 *     · 36 패스 진행도와 던전 입장권은 **누적 n** 축이라 순환에 안 끌려간다
 *   갈리는 사실(칸 수 · 8일차 이상 칸의 실재 · 라벨 집합)은 `·` info 로만 찍는다 —
 *   수리 전 28/있음/«8~14일 차», 수리 후 7/없음/«1~7일 차» 로 **같은 줄이 다른 값**을 낸다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};
const fmtN = n => (n == null ? '?' : Number(n).toLocaleString('en-US'));

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof ATTEND !== 'undefined'
                                && typeof openAttend === 'function');
  await page.waitForTimeout(700);
  /* 유휴 루프가 재화를 굴려 증분 비교를 망친다(LESSONS 51-③·34-⑤ · verify70 과 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; S.autoBuy = false; });
  return { page, errs };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  const browser = await launch(chromium);
  const { page, errs } = await boot(browser);

  /* ------------------------------------------------------------------ */
  blk('[1] 표 — ATTEND 는 몇 칸이고 8일차 이후 칸이 실재하는가');
  const t = await ev(page, () => ({
    n: ATTEND.length,
    dias: ATTEND.map(r => r.dia),
    keys: [...new Set(ATTEND.flatMap(r => Object.keys(r).filter(k => k !== 'ic' && k !== 't')))].sort(),
    total: ATTEND.reduce((s, r) => s + (r.dia || 0), 0),
  }));
  if (t) {
    info('[1-a] ATTEND 칸 수 (수리 전 28 → 수리 후 7)', t.n + '칸');
    info('[1-b] 8일차 이후 칸 (수리 전 21칸 → 수리 후 0칸)', Math.max(0, t.n - 7) + '칸');
    info('[1-c] 1~7일차 값', t.dias.slice(0, 7).map(fmtN).join(' · '));
    if (t.n > 7) info('[1-d] 8일차 이후 값(사라질 몫)', fmtN(t.dias.slice(7).reduce((s, v) => s + v, 0)));
    info('[1-e] 한 바퀴 합계 · 하루 평균', fmtN(t.total) + ' 다이아 · ' + fmtN(Math.round(t.total / t.n)) + '/일');
    ok(t.keys.length === 1 && t.keys[0] === 'dia',
       '[1-f] 보상 키는 dia 하나뿐 (399 — 이 작업이 재화 갈래를 안 건드린다는 대조군)', '[' + t.keys.join(',') + ']');
    ok(t.dias.every(v => v > 0), '[1-g] 빈 칸 0건');
  }

  /* ------------------------------------------------------------------ */
  blk('[2] 수령 — 받는 칸은 언제나 ATTEND[n % length] 인가 (불변식)');
  const days = [0, 6, 7, 13, 14, 27, 28, 53, 99];
  const claims = await ev(page, ns => ns.map(n => {
    S.att.n = n; S.att.date = '';
    const want = ATTEND[n % ATTEND.length];
    const d0 = S.dia;
    claimAttend(null);
    const got = S.dia - d0;
    return { n, idx: n % ATTEND.length, want: want.dia, got, nAfter: S.att.n };
  }), days);
  if (claims) {
    const bad = claims.filter(c => c.got !== c.want || c.nAfter !== c.n + 1);
    ok(bad.length === 0,
       '[2-a] n = ' + days.join('/') + ' 실로드 → 받는 칸 = ATTEND[n % length] · n 은 +1 누적',
       bad.length ? bad.map(b => 'n' + b.n + ' ' + b.got + '≠' + b.want).join(' · ') : '전 표본 일치');
    info('[2-b] 표본별 칸 index (수리 전 n%28 → 수리 후 n%7)',
         claims.map(c => 'n' + c.n + '→#' + c.idx + '(' + fmtN(c.want) + ')').join(' · '));
    const over = claims.filter(c => c.idx >= 7);
    info('[2-c] «8일차 이후 칸» 을 실제로 받는 표본 (수리 후 0건)',
         over.length ? over.map(c => 'n' + c.n + '→#' + c.idx).join(' · ') : '0건');
  }

  /* ------------------------------------------------------------------ */
  blk('[3] 팝업 — 그려지는 칸 수와 라벨 (n=9 · 수리 전이면 2주차)');
  const view = await ev(page, () => {
    S.att.n = 9; S.att.date = '';
    openAttend();
    return {
      cards: document.querySelectorAll('#mbox .at-c').length,
      wide: document.querySelectorAll('#mbox .at-c7').length,
      labels: [...document.querySelectorAll('#mbox .at-bd>i')].map(e => e.textContent),
      today: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map(e => e.classList.contains('today')),
      got: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map(e => e.classList.contains('got')),
      dots: document.querySelectorAll('#mbox .updot').length,
      txt: document.getElementById('mbox').textContent,
    };
  });
  if (view) {
    ok(view.cards === 6 && view.wide === 1,
       '[3-a] 그려지는 칸은 언제나 «격자 6 + 전폭 1 = 7장» (주차를 접든 순환하든 7장)',
       view.cards + '+' + view.wide);
    ok(view.today.filter(Boolean).length === 1 && view.dots === 1,
       '[3-b] «오늘» 칸 1장 + 레드닷 1개 (318 규약)',
       '오늘 #' + view.today.indexOf(true) + ' · 닷 ' + view.dots);
    ok(!/NaN|undefined/.test(view.txt), '[3-c] NaN/undefined 없음');
    info('[3-d] 라벨 (수리 전 «8~14일 차» → 수리 후 «1~7일 차»)', view.labels.join(','));
    const over = view.labels.filter(s => (parseInt(s, 10) || 0) > 7);
    info('[3-e] «8일 차» 이상 라벨 (수리 후 0건)', over.length ? over.join(',') : '0건');
    info('[3-f] 수령 완료(✔) 칸 수 — n=9 에서 «오늘» 앞의 칸', view.got.filter(Boolean).length + '장');
  }

  /* ------------------------------------------------------------------ */
  blk('[4] 대조군 — 순환에 끌려가면 안 되는 두 축 (누적 접속일)');
  const keep = await ev(page, () => {
    S.att.n = 53; S.att.date = '';
    const before = DUNGEONS.map(x => S.dunTk[x.id] | 0);
    claimAttend(null);
    const after = DUNGEONS.map(x => S.dunTk[x.id] | 0);
    return {
      passProg: PASS_TABS.att.prog(),            /* 36 출석 패스 = 누적 접속일 */
      passN: PASS_TABS.att.n,
      attN: S.att.n,
      tkDelta: after.map((v, i) => v - before[i]),
      dunTry: DUN_TRY,
    };
  });
  if (keep) {
    ok(keep.passProg === keep.attN,
       '[4-a] 36 출석 패스 진행도 = 누적 `S.att.n` (순환과 독립 · 493 축)',
       keep.passProg + ' vs ' + keep.attN);
    ok(keep.tkDelta.every(v => v === keep.dunTry),
       '[4-b] 출석 수령 → 던전마다 입장권 +DUN_TRY (204 — 날짜와 무관한 «출석했다는 사실» 몫)',
       '+' + keep.dunTry + ' × ' + keep.tkDelta.length + '던전');
    info('[4-c] 누적 n 은 순환 뒤에도 계속 는다 (패스 100단 축이 이것을 읽는다)',
         'n = ' + keep.attN + ' · 패스 ' + keep.passN + '단');
  }

  /* ------------------------------------------------------------------ */
  blk('[5] 소스 — «28» 이 출석 절에 몇 번 적혀 있는가');
  const at1 = code.indexOf('const ATTEND = []');
  const at2 = code.indexOf('ATTEND.push');
  const decl = at1 >= 0 && at2 > at1 ? code.slice(at1, code.indexOf('\n', at2) + 1) : '';
  const mod28 = (code.match(/S\.att\.n\s*%\s*28/g) || []).length;
  const declHas28 = /28/.test(decl);
  info('[5-a] `S.att.n % 28` 리터럴 (수리 전 2건 → 수리 후 0건)', mod28 + '건');
  info('[5-b] `ATTEND` 선언 블록에 «28» (수리 전 있음 → 수리 후 없음)', declHas28 ? '있음' : '없음');
  info('[5-c] `Math.floor(day / 7) * 7` 주차 계산 (수리 후 0건)',
       (code.match(/Math\.floor\(day\s*\/\s*7\)\s*\*\s*7/g) || []).length + '건');
  ok(/S\.att\.n\s*%/.test(code), '[5-d] [전제] 수령·렌더가 «나머지» 로 칸을 고른다 (식의 모양만 바뀐다)');

  blk('[6] 콘솔');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE513 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
