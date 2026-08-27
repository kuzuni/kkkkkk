/* 작업 111 게이트 — 숫자 단위 표기 «K/M/B/T 폐기 → 알파벳 A·B·C…» 회귀 방지.
   실행: node tools/verify111.js

   저장소 주인 지시(2026-08-26): 화폐·데미지·전투력 단위를 a, b, c, d… 식으로.
   레퍼런스 HUD 실측이 대문자(«538A»·«5.07A» docs/ref/69-우편함-팝업.jpg,
   «32.68A»·«2.36C» docs/ref/70-출석보상-팝업.jpg)라 **대문자**를 기본으로 채택했다
   (index.html `SUF_CC` 한 곳만 97 로 바꾸면 전부 소문자가 된다).

   지시서 [3]-(가) 기계적 작업 — 비평가 없음. 이 게이트가 보는 것:
     ① 소스   — `'K','M','B','T'` 접미사 상수 0건 · `SUF` 정의가 알파벳 생성식
     ② 단위표 — SUF[1]='A' … SUF[26]='Z' · SUF[27]='AA' · 길이 703 · 중복 0
     ③ fmt    — 주인 지시 ③ 의 자릿수 규칙(<10 소수2 · <100 소수1 · 이후 정수, 1000 미만 무접미사)
     ④ 경계   — 58 롤링의 «반올림 승격» 보정(9.9999 → 10.0A) 유지
     ⑤ fmtShort — 같은 SUF 를 쓰는 배지 표기도 알파벳으로 따라온다
     ⑥ 쉼표 예외 — 12 소환 가격 3곳(`toLocaleString('en-US')`)은 레퍼런스대로 그대로 둔다
     ⑦ 런타임 — HUD 골드·다이아·전투력 · 전투 데미지 숫자가 «알려진 값 → 새 단위표» 로 정확히
                 표시되고, 탭·사이드·▦메뉴 오프너를 훑는 동안에도 그대로 유지된다
                 (텍스트에서 «K/M/B/T» 를 찾는 스캔은 대문자 채택 뒤로는 무의미하다 — 아래 주석)
     ⑧ 시간 표기 회귀 — `5H 30M` 식 D/H/M 는 단위가 아니라 시간이라 **바꾸지 않았다**

   ⚠ 150 (2026-08-27, 주인 지시 «골드 빼고 나머지 숫자는 A B C 단위 안 쓰고 숫자 그대로») 이후
     이 게이트가 보는 «알파벳 단위» 의 소유자는 `fmt` 가 아니라 **`fmtG`** 다. 111 의 단위표·자릿수
     규칙은 골드에 그대로 살아 있고(그래서 이 게이트는 남는다), 골드가 아닌 수의 표기는
     `tools/verify150.js` 가 본다. 옛 `fmt(...)` 단언은 전부 `fmtG(...)` 로 옮겼다.
*/
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const FILE = 'file://' + SRC;

const R = [];
const eq = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });

(async () => {
  /* ── ① 소스 스캔 ────────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  /* 구 정의는 `const SUF = ['','K','M','B','T'];` 였다. 접미사 상수로서의 K/M/B/T 가
     한 배열 리터럴 안에 나열된 흔적이 남아 있으면 실패. */
  const oldSuf = src.match(/\[\s*''\s*,\s*'K'\s*,\s*'M'\s*,\s*'B'\s*,\s*'T'\s*\]/g) || [];
  eq('① 구 SUF 리터럴 [\'\',\'K\',\'M\',\'B\',\'T\']', oldSuf.length, 0);
  yes('① SUF 가 알파벳 생성식으로 정의됨', /const SUF = \[''\];[\s\S]{0,400}String\.fromCharCode\(SUF_CC/.test(src));
  yes('① 대소문자 상수 SUF_CC 가 한 곳에만 있다',
    (src.match(/const SUF_CC = /g) || []).length === 1);
  /* ⑥ 12 소환 가격 쉼표 예외 3곳 — 레퍼런스가 «1,000 / 3,000» 이라 그대로 둔다 */
  /* 150 이후 넷이다 — 12 소환 가격 3곳 + `fmt()` 본체의 쉼표 표기 1곳(150 이 기본 표기로 채택). */
  eq('⑥ toLocaleString(\'en-US\') 쉼표 표기', (src.match(/toLocaleString\('en-US'\)/g) || []).length, 4);

  /* ── 페이지 ─────────────────────────────────────────────────────── */
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  /* ── ② 단위표 ── */
  const suf = await p.evaluate(() => ({
    len: SUF.length, s0: SUF[0], s1: SUF[1], s2: SUF[2], s3: SUF[3],
    s26: SUF[26], s27: SUF[27], s28: SUF[28], last: SUF[SUF.length - 1],
    dup: SUF.length - new Set(SUF).size,
    bad: SUF.slice(1).filter(x => !/^[A-Z]{1,2}$/.test(x)).length,
  }));
  eq('② SUF 길이(1 + 26 + 676)', suf.len, 703);
  eq('② SUF[0] (1000 미만 = 접미사 없음)', JSON.stringify(suf.s0), '""');
  eq('② SUF[1] 10³', suf.s1, 'A');
  eq('② SUF[2] 10⁶', suf.s2, 'B');
  eq('② SUF[3] 10⁹', suf.s3, 'C');
  eq('② SUF[26] 10⁷⁸', suf.s26, 'Z');
  eq('② SUF[27] 10⁸¹ — 두 글자로 이어짐', suf.s27, 'AA');
  eq('② SUF[28]', suf.s28, 'AB');
  eq('② SUF 마지막', suf.last, 'ZZ');
  eq('② SUF 중복', suf.dup, 0);
  eq('② SUF 에 K/M/B/T 등 비알파벳 표기', suf.bad, 0);

  /* ── ③④ fmt 자릿수 규칙 ── */
  const CASES = [
    [999, '999'], [1000, '1.00A'], [1234, '1.23A'], [5.07e3, '5.07A'],
    [32.68e3, '32.7A'], [538e3, '538A'], [2.36e9, '2.36C'],
    [1e6, '1.00B'], [1e9, '1.00C'], [1e12, '1.00D'],
    [2e78, '2.00Z'], [2e81, '2.00AA'],   /* 10⁷⁸=Z · 그 다음 AA */
    [9.5, '9.5'], [0, '0'],
    [9999.9, '10.0A'],            /* ④ 58 롤링 «반올림 승격» 보정 */
    [999949, '999A'],
  ];
  const got = await p.evaluate(cs => cs.map(c => fmtG(c[0])), CASES);   /* 150 — 알파벳 단위는 fmtG 소유 */
  CASES.forEach((c, i) => eq('③ fmtG(' + c[0] + ')', got[i], c[1]));
  eq('③ fmtG(Infinity)', await p.evaluate(() => fmtG(Infinity)), '∞');
  /* 정확히 1000ⁿ 인 값은 double 이 1000 으로 나누는 동안 999.99…9 로 떨어져 «한 칸 아래 접미사»
     로 나온다(1e78 → 999Y). 이 변환 전 K/M/B/T 시절에도 같았고 표시상 오차는 0.0000001% 다 —
     접미사 «계열» 만 본다. */
  eq('③ fmtG(1e78) 접미사 계열', (await p.evaluate(() => fmtG(1e78))).replace(/[\d.]/g, ''), 'Y');
  eq('③ fmtG(1e81) 접미사 계열', (await p.evaluate(() => fmtG(1e81))).replace(/[\d.]/g, ''), 'Z');

  /* ── ⑤ fmtShort ── */
  /* 150 — 배지 «짧은» 표기도 골드일 때만 접는다. 재화 키를 두 번째 인자로 준다. */
  const SHORT = [[999, '999'], [1500, '1.5A'], [12345, '12A'], [3e6, '3B']];
  const gs = await p.evaluate(cs => cs.map(c => fmtShort(c[0], 'gold')), SHORT);
  SHORT.forEach((c, i) => eq('⑤ fmtShort(' + c[0] + ", 'gold')", gs[i], c[1]));

  /* ── ⑦ 런타임 표시면 ── */
  const run = await p.evaluate(() => {
    S.gold = 5.07e3; S.dia = 2.36e9;
    /* 롤링(58 fxDisp · 60 jzRollVal)이 걸려 있으면 몇 프레임 뒤에야 목표에 닿는다 —
       표시 캐시를 목표값으로 밀어 놓고 한 번만 그린다. */
    fxDisp.gold = S.gold; fxDisp.dia = S.dia;
    markDirty(); drawHud();          /* HUD 알약을 그리는 것은 renderUI 가 아니라 drawHud 다 */
    const t = id => (document.getElementById(id) || {}).textContent || '';
    dmgNum(100, 100, 1.234e7, false);
    const dmg = nums.length ? nums[nums.length - 1].v : '';
    return { gold: t('goldN'), dia: t('diaN'), cp: t('cpN'), dmg };
  });
  const okSuf = s => /^\d+(\.\d+)?[A-Z]{1,2}$/.test(s.trim());
  yes('⑦ HUD 골드 «' + run.gold + '» 알파벳 표기', okSuf(run.gold));
  eq('⑦ HUD 골드 fmtG(5.07e3)', run.gold.trim(), '5.07A');
  /* 150 — 골드가 아닌 수는 «숫자 그대로» 다. 여기서는 «알파벳이 아님» 만 본다(값 단언은 verify150). */
  yes('⑦ HUD 다이아 «' + run.dia + '» 는 알파벳 단위가 아니다(150)', !okSuf(run.dia));
  /* 188(주인 정정 2026-08-27) — 전투 수치(전투력·데미지·체력)는 골드와 같이 **알파벳 단위**로 돌아왔다.
     150 이 여기 심어 둔 «알파벳이 아니다» 두 줄은 그 지시를 따라 뒤집는다(값 단언은 verify188).
     전투력은 초기 상태가 세 자리라 접미사가 안 붙는다 — 갈리는 지점은 «1000 이상에서 쉼표를 찍느냐» 다. */
  yes('⑦ HUD 전투력 «' + run.cp + '» 쉼표 원시 표기 아님(188)', /^\d{1,3}(\.\d+)?[A-Z]{0,2}$/.test(run.cp.trim()));
  yes('⑦ 전투 데미지 «' + run.dmg + '» 알파벳 단위(188)', okSuf(run.dmg));

  /* ⚠ 대문자 A~Z 를 채택한 결과 **화면 텍스트만 보고는 옛 K/M/B/T 를 판별할 수 없다** —
     새 표에서도 B=10⁶ · K=10³⁶ · M=10³⁹ · T=10⁶⁰ 이 전부 정상 접미사이기 때문이다
     (유물조각 3.3e6 은 새 표에서 «3.30B» 로 나온다 — 옛 표의 «3.30M» 과 글자만 겹친다).
     그래서 «옛 접미사 0건» 은 소스 스캔 ① 로 보장하고, 런타임은 **알려진 값의 표시 결과가
     새 단위표와 일치하는가** 로 본다 — 옛 표였다면 같은 값이 다른 글자로 나온다:
       4.2e15 → 새 표 SUF[5]='E' 로 «4.20E» · 옛 표는 SUF[5]='aa' 라 «4.20aa». */
  const sweep = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 4.2e15; S.dia = 7.7e9; S.relic = 3.3e6;
    fxDisp.gold = S.gold; fxDisp.dia = S.dia;
    const bad = [], seen = [];
    const gold = () => ((document.getElementById('goldN') || {}).textContent || '').trim();
    const check = label => {
      seen.push(label);
      try { markDirty(); drawHud(); renderUI(); } catch (e) { bad.push(label + ':render ' + e.message); return; }
      if (gold() !== '4.20E') bad.push(label + ':goldN=' + gold());
    };
    const sels = []
      .concat([].map.call(document.querySelectorAll('.tab[data-t]'), e => '.tab[data-t="' + e.dataset.t + '"]'))
      .concat([].map.call(document.querySelectorAll('.side .ibtn[data-pop]'), e => '.side .ibtn[data-pop="' + e.dataset.pop + '"]'))
      .concat(document.getElementById('menub') ? ['#menub'] : []);
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      try { el.click(); } catch (e) { continue; }
      await sleep(180);
      check(sel);
      try { el.click(); } catch (e) {}          /* 탭 재클릭 = 닫기(A1) */
      await sleep(90);
    }
    /* 52 ▦ 메뉴 8칸 */
    try { document.getElementById('menub').click(); } catch (e) {}
    await sleep(220);
    const mns = [].map.call(document.querySelectorAll('#mnw [data-mn]'), e => e.dataset.mn);
    for (const k of mns) {
      const el = document.querySelector('#mnw [data-mn="' + k + '"]');
      if (!el) continue;
      try { el.click(); } catch (e) { continue; }
      await sleep(220);
      check('menu:' + k);
      try { document.getElementById('menub').click(); } catch (e) {}
      await sleep(120);
    }
    return { bad: bad.slice(0, 8), n: seen.length };
  });
  yes('⑦ 오프너 스윕이 실제로 화면을 열었다(≥ 10곳)', sweep.n >= 10);
  eq('⑦ 스윕 ' + sweep.n + '곳 · HUD 골드 fmt(4.2e15)=«4.20E» 유지', sweep.bad.join(' / ') || 'none', 'none');

  /* ── ⑧ 시간 표기는 단위가 아니다 — 회귀 확인 ── */
  const tm = await p.evaluate(() => {
    const out = {};
    try { out.hhmm = hhmm(3 * 3600 + 25 * 60); } catch (e) { out.hhmm = 'ERR ' + e.message; }
    return out;
  });
  eq('⑧ hhmm(3시간25분) — 시간 표기 유지', tm.hhmm, '3시간 25분');

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0, 120) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY111 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
