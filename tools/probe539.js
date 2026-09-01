#!/usr/bin/env node
/* 재현기 — 작업 539 「`verify398` §R [전제] 가 `✗ATTEND` 로 빨갛다 (게이트 부패)」
 *
 *   node tools/probe539.js
 *
 * 338 규칙: 처방을 따르기 전에 **재현**한다. 그리고 539 는 «지금 빨간 것을 초록으로» 가 아니라
 * «**다시 빨개지지 않게**» 가 본체라, 재현기도 두 절이다.
 *
 * §1 등재문 재현 — 539 등재 시점(513 직전) 트리에서 옛 §R 의 앵커 3개를 소스에 대 본다.
 *                 `✗ATTEND` 가 그대로 나와야 한다(498 이 `const dia = …` 에 한 항을 끼워 넣었다).
 * §2 미래 편집 시험 — 같은 루프·같은 표를 만지는 **다음 작업들의 편집**을 흉내 낸 사본 5종에
 *                 ⓐ 옛 방식(문자열 앵커)과 ⓑ 새 방식(페이지 주입, `tools/revert398.js`)을 둘 다 대 본다.
 *                 옛 방식은 부패하고 새 방식은 안 부패해야 «처방이 실재» 다.
 *                 ⚑ 762 — 그 «편집»과 ⓐ 가 대는 앵커를 **오늘 소스에서 구조로 캐낸다**(`pickToday`).
 *                 앞판은 513판 문자열(`HIST_ANCHORS`)을 재활용해서, 199·739 가 제품을 다시 적자
 *                 치환이 조용히 no-op 이 되어 §2 3건이 «거짓 빨강» 이 됐다. 이제 자리가 움직이면
 *                 no-op 대신 **§2 [전제] 가 빨개진다**. `HIST_ANCHORS` 는 §1 전용 박물관 조각이다.
 * §3 음성항 — 되돌림이 **안 물리는** 사본(제품 passRw 가 표를 안 읽는다)에서는 새 방식이
 *             조용히 초록이 되면 안 된다(`rwReads` 가 false = [전제] 빨강).
 *
 * [3]-(가) 기계적 검증 — 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { revertMeasure } = require('./revert398');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const G756 = require('./gitrev756');           /* 756 — 얕은 클론에서 고정 SHA 를 데려오는 공용 부품 */
const ROOT = path.resolve(__dirname, '..');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0, skip = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* 옛 §R 이 들고 있던 세 조각 — 513 이 갱신한 마지막 판(cdc4758) 그대로다.
   이 자는 이것을 «쓰지» 않는다. §1(513 직전 트리)에서만 대 보는 **박물관 조각**이라 글자 그대로 남긴다. */
const HIST_ANCHORS = {
  PASS_CUR: "const PASS_CUR = [\n  { k:'dia', ic:curIc('dia'), n:i => 100 + i * 50 }\n];",
  passRw: "  const cur = PASS_CUR[0], mul = c === 0 ? 1 : (c === 1 ? 3 : 2);",
  ATTEND: "  const dia = i === 1 ? ATT_D1_DIA : (i % 7 === 0 ? 1500 + i*60 : 350 + i*30);\n  ATTEND.push({ ic:curIc('dia'), t:'다이아', dia });"
};

const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ⚑ 762 — §2 가 쓰던 앵커·편집이 **HIST_ANCHORS 를 그대로 재활용**하고 있었다.
   제품이 움직이자(199 가 `PASS_CUR` 곡선을 · 739 가 `ATTEND` 를 다시 적었다) `replace` 가
   **조용히 no-op** 이 되어 «사본이 실제로 달라졌다» 3건이 거짓으로 빨개졌고, M2 의 «견딘다» 도
   뜻을 잃었다(옛 앵커는 편집 전부터 이미 ✗ 다). 539 의 주장(«문자열 앵커는 부패한다 ·
   페이지 주입은 안 부패한다»)은 그대로 두고, **§2 가 대는 앵커와 흉내 내는 편집을
   오늘 소스에서 «구조로» 캐낸다** — 자 안에 제품 문자열 상수가 0 개가 된다(등재문 처방 ⓑ).
   자리가 또 움직이면 no-op 이 되는 대신 §2 [전제] 가 **빨개진다**. 그것이 이 수리의 본체다. */
function pickToday(src) {
  const out = { miss: [] };
  const atI = src.indexOf('const ATTEND = [];');
  const atZone = atI < 0 ? '' : src.slice(atI, atI + 2000);
  const mHead = atZone.match(/for\(let i=1;i<=(\d+);i\+\+\)\{/);
  const mPush = atZone.match(/ATTEND\.push\(\{[\s\S]*?\}\);/);
  const mCur = src.match(/const PASS_CUR = \[[\s\S]*?\n\];/);
  const rwI = src.indexOf('function passRw(i, c){');
  const rwZone = rwI < 0 ? '' : src.slice(rwI, rwI + 1200);
  const mRw = rwZone.match(/[ \t]*const cur = PASS_CUR\[0\], mul = [^\n]*;/);
  out.ATTEND = mPush && mPush[0];
  out.attHead = mHead && mHead[0];
  out.attN = mHead && +mHead[1];
  out.PASS_CUR = mCur && mCur[0];
  out.passRw = mRw && mRw[0];
  out.curEntry = mCur && (mCur[0].match(/\{[^\n]*\}/) || [null])[0];
  for (const k of ['ATTEND', 'attHead', 'PASS_CUR', 'passRw', 'curEntry']) if (!out[k]) out.miss.push(k);
  return out;
}
const T = pickToday(SRC);

/* §2 의 ⓐ 축이 대는 앵커 = «오늘 판에서 떠낸» 세 조각. 매 실행 새로 캐므로 안 썩는다. */
const TODAY = { PASS_CUR: T.PASS_CUR, passRw: T.passRw, ATTEND: T.ATTEND };
const mark = (anchors, src) => Object.keys(anchors)
  .map(k => (anchors[k] && src.includes(anchors[k]) ? '○' : '✗') + k).join(' ');
const anchorMark = src => mark(TODAY, src);

/* 다음 작업들이 실제로 예고돼 있는 편집을 흉내 낸다(PROGRESS 517·499·497 행).
   ⚠ 치환 대상·치환문을 **오늘 소스에서 떠낸 조각으로** 만든다 — 글자 그대로 적지 마라(762). */
const MUT = [
  { id: 'M1 517 — 출석 곡선을 구간표로', touch: 'ATTEND', oldSurvives: false,
    f: s => s.replace(T.ATTEND, () =>
      "ATTEND.push({ ic:curIc('dia'), t:'다이아', dia: (i <= 4 ? 300 : (i <= 7 ? 600 : 900)) });") },
  /* M2 는 루프 «머리» 만 만져서 오늘 앵커(루프 본문)가 살아남는다 — 문자열 앵커가 늘 지는 게 아니라는 것도 같이 적는다 */
  { id: 'M2 칸 수 7 → 10', touch: 'ATTEND', oldSurvives: true,
    f: s => s.replace(T.attHead, () => T.attHead.replace(/i<=\d+/, 'i<=10')) },
  { id: 'M3 push 줄 재포맷(줄바꿈만)', touch: 'ATTEND', oldSurvives: false,
    f: s => s.replace(T.ATTEND, () => T.ATTEND
      .replace(/^ATTEND\.push\(\{[ \t]*/, 'ATTEND.push({\n    ')
      .replace(/[ \t]*\}\);$/, '\n  });')) },
  { id: 'M4 497 — 패스 곡선 계수 변경', touch: 'PASS_CUR', oldSurvives: false,
    f: s => s.replace(T.PASS_CUR, () =>
      "const PASS_CUR = [\n  { k:'dia', ic:curIc('dia'), n:i => Math.round(360 + 1320 * Math.sqrt(i)) }\n];") },
  { id: 'M5 passRw 한 줄을 두 줄로', touch: 'passRw', oldSurvives: false,
    f: s => s.replace(T.passRw, () => T.passRw
      .replace(/^([ \t]*)const cur = PASS_CUR\[0\], mul = ([^\n]*);$/, '$1const cur = PASS_CUR[0];\n$1const mul = $2;')) }
];

/* 음성항 — 제품이 표를 안 읽게 되면(=되돌림이 안 물린다) 새 방식은 반드시 빨개져야 한다.
   하드코딩할 값도 «오늘의 PASS_CUR 첫 칸» 을 그대로 떠서 쓴다(곡선이 바뀌어도 따라온다). */
const BLIND = { id: 'N1 passRw 가 표를 안 읽는다(하드코딩)',
  f: s => s.replace(T.passRw, () => T.passRw.replace('PASS_CUR[0]', () => T.curEntry)) };

const landed = rv => rv.curN === 3 && rv.rwReads && rv.atRel;
const redRv = rv => rv.passKeys.length > 1 && rv.passKeys.includes('gold')
  && rv.maxTxt.length > 7 && rv.atKeys.length > 1 && rv.atKeys.includes('rel');

(async () => {
  /* ══ §1 등재문 재현 — 513 직전 트리에서 옛 앵커가 부패해 있었다 ══════════ */
  console.log('§1 등재문 재현 — 539 등재 시점(513 직전) 트리의 옛 앵커');
  let old = null;
  /* 756 — 먼저 **판아 본다**(규약 ①). 얕다고 바로 건너뛰면 재현이 가능한 자리를 버리는 것이다.
     못 가져왔을 때만 «환경이면 보류 · 아니면 빨강» 으로 갈린다(규약 ②). */
  const got = G756.show('cdc4758^', 'index.html');
  if (got.ok) { old = got.buf.toString(); if (got.how) console.log('  [i]' + got.how); }
  if (!old) {
    if (got.env) { skip++; console.log('  ⏸  §1 보류(환경) — ' + got.why + ' · §1 4항을 세지 않는다'); }
    else ok(false, '§1 513 직전 트리를 못 읽었다', got.why);
  } else {
    /* 그 시점 §R 이 들고 있던 ATTEND 조각은 «i % 28 === 0 ? 5000» 판이다 */
    const atThen = "  const dia = i % 28 === 0 ? 5000 : (i % 7 === 0 ? 1500 + i*60 : 350 + i*30);\n  ATTEND.push({ ic:curIc('dia'), t:'다이아', dia });";
    ok(old.includes(HIST_ANCHORS.PASS_CUR), '§1 그 트리에서도 PASS_CUR 앵커는 맞았다(○)');
    ok(old.includes(HIST_ANCHORS.passRw), '§1 그 트리에서도 passRw 앵커는 맞았다(○)');
    ok(!old.includes(atThen), '§1 ★ ATTEND 앵커만 어긋나 있었다(✗) — 등재문 그대로',
      (old.match(/const dia = [^\n]*/) || [''])[0].trim());
    ok(/i === 1 \? ATT_D1_DIA/.test(old), '§1 어긋난 원인은 498 이 끼워 넣은 «첫날» 항이다');
  }

  const browser = await launch(chromium);
  const files = [];
  try {
    const run = async (file) => {
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
        [KEY, JSON.stringify({ gold: 1e6, dia: 1000, relic: 100, best: 200 })]);
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.goto('file://' + file);
      await page.waitForFunction(() => typeof S !== 'undefined' && typeof passRw === 'function' && typeof ATTEND !== 'undefined');
      await page.waitForTimeout(500);
      await page.evaluate(() => { window.step = () => {}; });
      const rv = await page.evaluate(revertMeasure);
      await ctx.close();
      return { rv, errs };
    };

    /* ══ §2 미래 편집 시험 ═══════════════════════════════════════════════ */
    console.log('§2 미래 편집 시험 — 같은 루프·표를 만지는 편집 5종');
    /* 762 — 편집이 no-op 이 되는 유일한 길목을 [전제] 로 막는다. 자리가 움직이면 여기가 빨개진다. */
    ok(T.miss.length === 0, '§2 [전제] 오늘 판에서 만질 자리를 구조로 캐냈다(글자 그대로 든 것 0개)',
      T.miss.length ? '못 찾음: ' + T.miss.join(',') : `ATTEND 루프 ${T.attN}칸 · push 문 · PASS_CUR 블록 · passRw cur/mul 줄`);
    /* 문자열 앵커가 실제로 썩는다는 자국 — 513판 조각을 오늘 소스에 대 본 결과(정보 · 세지 않는다) */
    console.log('  [i] 513판 옛 앵커를 오늘 소스에 대면 ' + mark(HIST_ANCHORS, SRC)
      + ' — 그래서 §2 는 오늘 조각으로 다시 뜬다(762)');
    const base = await run(path.join(ROOT, 'index.html'));
    ok(landed(base.rv) && redRv(base.rv), '§2 [기준] 무수정 트리에서 되돌림이 물리고 §1·§2 축이 전부 빨개진다',
      '[' + base.rv.passKeys.join(',') + '] · «' + base.rv.maxTxt + '» · [' + base.rv.atKeys.join(',') + ']');

    for (const m of MUT) {
      const src = m.f(SRC);
      ok(src !== SRC, '§2 ' + m.id + ' — 사본이 실제로 달라졌다');
      const file = path.join(ROOT, 'tools', '.probe539-' + m.id.split(' ')[0] + `-${process.pid}.html`);
      files.push(file);
      fs.writeFileSync(file, src);
      const oldHit = src.includes(TODAY[m.touch]);
      ok(oldHit === m.oldSurvives, '§2 ' + m.id + ' — ⓐ 옛 방식(문자열 앵커)은 '
        + (m.oldSurvives ? '이 편집은 견딘다' : '부패한다'), anchorMark(src));
      const { rv, errs } = await run(file);
      ok(errs.length === 0, '§2 ' + m.id + ' — 사본이 에러 없이 뜬다', errs[0] || '없음');
      ok(landed(rv) && redRv(rv), '§2 ' + m.id + ' — ⓑ 새 방식(페이지 주입)은 그대로 물린다',
        'ATTEND ' + rv.atN + '칸 · [' + rv.passKeys.join(',') + '] · «' + rv.maxTxt + '» · [' + rv.atKeys.join(',') + ']');
    }

    /* ══ §3 음성항 — 안 물리면 조용히 초록이 되면 안 된다 ═════════════════ */
    console.log('§3 음성항 — 되돌림이 안 물리는 사본');
    const bsrc = BLIND.f(SRC);
    const bfile = path.join(ROOT, 'tools', `.probe539-N1-${process.pid}.html`);
    files.push(bfile);
    fs.writeFileSync(bfile, bsrc);
    const b = await run(bfile);
    ok(!b.rv.rwReads, '§3 ' + BLIND.id + ' — [전제] 의 passRw 항이 false 로 답한다(= §R 이 빨개진다)',
      'rwReads=' + b.rv.rwReads + ' · [' + b.rv.passKeys.join(',') + ']');
    ok(b.rv.curN === 3 && b.rv.atRel, '§3 나머지 두 축은 여전히 물린다(빨간 항이 하나로 좁혀진다)',
      'curN=' + b.rv.curN + ' · atRel=' + b.rv.atRel);
  } finally {
    for (const f of files) { try { fs.unlinkSync(f); } catch (e) {} }
    await browser.close();
  }

  /* ══ §4 자 자신의 모양 — 소스 문자열 앵커가 한 개도 없다 ════════════════ */
  console.log('§4 verify398 §R 이 소스 문자열을 안 들고 있다');
  const gate = fs.readFileSync(path.join(ROOT, 'tools', 'verify398.js'), 'utf8');
  ok(!/src\.replace\(|writeFileSync\(tmp/.test(gate), '§4 사본 파일을 쓰던 자리가 사라졌다');
  ok(!Object.values(HIST_ANCHORS).concat(Object.values(TODAY).filter(Boolean))
    .some(a => gate.includes(a)), '§4 옛·오늘 앵커가 자에 남아 있지 않다');
  ok(/revertMeasure/.test(gate), '§4 되돌림은 재현기와 같은 한 벌(tools/revert398.js)을 쓴다');

  /* ══ §R 되돌림 시험 — 762 의 수리가 «무르게 푼 것» 이 아님을 못박는다 ═════════
     자리가 움직인 소스를 만들어 대 본다. 옛 방식이면 치환이 조용히 no-op 이 되던 자리에서
     새 [전제] 는 **반드시 빨개져야** 한다. 이게 초록으로 남으면 762 는 안 고쳐진 것이다. */
  console.log('§R 되돌림 시험 — 자리가 움직이면 [전제] 가 빨개지는가');
  const moved = SRC
    .replace('const ATTEND = [];', 'const ATTEND2 = [];')
    .replace(T.PASS_CUR, () => "const PASS_CUR = Object.freeze([\n  { k:'dia' }\n]);");
  const T2 = pickToday(moved);
  ok(T2.miss.length > 0, '§R 자리가 움직인 소스에서 [전제] 가 빨강으로 답한다',
    '못 찾음: ' + (T2.miss.join(',') || '없음 — 헛초록이다'));
  ok(T2.miss.includes('ATTEND') && T2.miss.includes('attHead') && T2.miss.includes('PASS_CUR'),
    '§R 움직인 세 자리를 이름으로 짚는다(어디가 썩었는지 다음 워커가 안다)', T2.miss.join(','));
  ok(pickToday(SRC).miss.length === 0, '§R 원복하면 다시 초록이다(자가 무른 게 아니라 자리가 문제였다)');
  /* 옛 방식이었다면 같은 자리에서 «조용히 no-op» 이었다는 것 — 762 가 고친 그 실패 모양이다 */
  ok(moved.replace(HIST_ANCHORS.ATTEND, 'X') === moved,
    '§R 대조: 같은 소스에 513판 문자열 앵커를 대면 치환이 no-op 이다(옛 실패 모양)');

  const total = pass + fail;
  const held = skip ? ` (\ubcf4\ub958 ${skip} \u2014 \ud658\uacbd)` : '';
  console.log(fail ? `\nPROBE539 ${pass}/${total}${held} FAIL` : `\nPROBE539 ${pass}/${total}${held} PASS`);
  process.exitCode = fail ? 1 : 0;
})();
