/* 작업 520 검증 — «코스튬 쪽 + − 표시 없애기» (저장소 주인 지시 2026-08-31)
 *
 *   node tools/verify520.js
 *
 * 주인 원문: «그 코스튬쪽에 + − 표시 없애셈». 어느 부호인지 지목이 없어 `probe520` 이 **찍힌 글자**로
 * 전수했고(코드 grep 이 아니라 그려진 텍스트 노드), 수리 전 코스튬 화면의 부호는 이랬다:
 *
 *   «+» 5자리 / 3코드자리 — 시트 `.sk-tot` «공격력 +39%» 1 · 상세 `.sk-db` «공격 +8.0% · 체력 +6.2% ·
 *                            골드 +4.0%» 3 · [강화] 꾹 누르기 회당 «+1» 플로터 n
 *   «−»(U+2212) — **0건**  ⇒ 등재문의 갈래 ⓐ(델타)·ⓒ(못 찾은 «−»)는 기각
 *   「가로 막대」 2자리 — 미보유 상세 «— 아직 지급되는 곳이 없는 외형입니다.»(275) · 도움말 «— 착용 중이…»
 *                        ⇒ 등재문 갈래 ⓑ 확정. 앞의 것은 보유 칸의 «+8.0%» 와 **같은 상자·같은 좌단**이다.
 *
 * 이 자가 지키는 것:
 *   [A] 시트(`#bCos`)   — 부호·막대 0건 · «총효과» 값은 근거 데이터(COS_OWN·COS_STEP)에서 그대로다
 *   [B] 상세·도움말      — 보유/미보유/[?] 셋 다 부호·막대 0건 · 세 축 값 = `cosOwnStep + lv×COS_LV`
 *                          (표기 = 실효 규약 156·346 — **부호만 뺐지 값은 0줄**임을 못박는 자리)
 *   [C] 275 뜻 보존      — 미보유 문구가 여전히 «추후 공개» 를 말하고 «…시 지급됩니다» 가 아니다
 *   [D] 꾹 누르기        — 488 «beat = 시도 수» 는 살아 있고(맥박 수 = 시도 수) **플로터만 0장**이며,
 *                          맥박 호스트가 «값이 바뀌는 줄»(`.sk-gr` 레벨 행)이고 그 숫자가 회당 오른다
 *   [E] 남의 자리 무변경  — `bindUpHold` 기본 문구는 여전히 «+1» 이다(08 세부 팝업 실측 · 룬·단련·훈련 동일)
 *   [R] 되돌림 시험      — 부호를 도로 넣은 사본에서 [A]·[B] 가 실제로 빨개지고,
 *                          `txt:''` 를 뺀 사본에서 «+1» 플로터가 되살아난다
 *   [F] 콘솔 에러 0
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 부호 세 벌. 「막대」는 진짜 «−» 가 아니지만 화면에서는 그렇게 읽힌다 — 따로 센다(probe520 과 같은 자). */
const SIGN = /[+＋−﹣－]/;
const DASH = /[—–―‐]/;
const signs = s => (String(s).match(/[+＋−﹣－]/g) || []).join('');
const dashes = s => (String(s).match(/[—–―‐]/g) || []).join('');

/* 페이지 안에서 «코스튬 화면 세 글자판» 을 읽는다 — 시트·상세(보유/미보유)·도움말 */
const READ = () => {
  const txt = sel => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
  const ownId = (AVATARS.find(a => cosOwn(a.id)) || {}).id;
  /* ⚠ «미출시» 와 «미보유» 는 다르다 — 보유 중인 칸도 `cosOff` 가 참일 수 있어(COS_OFF 42종은
     PROMO_COS 밖이라는 뜻뿐이다) 반드시 «미보유 ∧ 미출시» 로 골라야 275 분기가 그려진다. */
  const offId = (AVATARS.find(a => !cosOwn(a.id) && cosOff && cosOff(a.id))
              || AVATARS.find(a => !cosOwn(a.id)) || {}).id;
  renderCos();
  const sheet = txt('#bCos');
  const tot = txt('#bCos .sk-tot em');
  /* 기대값은 «화면이 쓴 함수» 가 아니라 근거 데이터에서 다시 만든다(LESSONS 212-①).
     ⚠ 835 — «값» 은 계속 근거 데이터에서 만들지만 «표기» 는 제품의 표기 부품에서 파생한다.
     725 가 표기 한 벌을 `pct` → `fmtEff` 로 갈았는데 이 자가 옛 문자열(«39%»)을 손으로 들고
     있어 [A3]·[B3] 이 부패했다(LESSONS 831 — «표기 한 벌을 갈면 기대 문자열을 든 자가 남는다»).
     `fmtEff` 를 부르는 것은 «화면이 쓴 함수를 그대로 베끼는 것» 이 아니다 — 값(m·cosLvVal)은
     여전히 상수표에서 독립으로 다시 만들고, 부르는 것은 «수 → 글자» 한 겹뿐이다.
     소환가 표기가 또 바뀌어도 이 자는 따라오고, 값이 틀어지면 그대로 빨개진다. */
  const n = AVATARS.filter(a => S.avatars[a.id]).length;
  /* ⚠ 835 — 여기에는 부패가 **한 겹 더** 있었다. 이 식은 «계단을 전부 곱하고 강화를 한 번 더 곱한다»
     (`Π(1+step) × (1+lv) − 1`) 는 194·197 시절 모델인데, **724**(주인 확정 «카테고리 안은 합»)가
     제품을 «계단을 더하고 강화를 더해 한 번만 곱한다» 로 바꿨다(`cosOwnSum` 선언 · `bonus()` ⑤절 ·
     `renderCos` 의 `tot`). 표본 4종·46Lv 에서 옛 모델 0.38512 vs 제품 0.344 라 [A3] 은 725 를
     고쳐도 값에서 다시 빨갰다. 여기서도 **값은 상수표에서 독립으로** 다시 만든다 —
     `cosOwnSum`·`cosLvVal` 를 부르면 제품 식을 베끼는 것이라 «식이 갈려도 초록» 이 된다. */
  const lvSum = AVATARS.reduce((s, a) => s + (S.avatars[a.id] ? (S.cosLv[a.id] || 0) : 0), 0);
  let step = 0;
  for (let i = 1; i <= n; i++) step += COS_OWN.atk * COS_STEP[Math.min(COS_STEP.length - 1, Math.floor((i - 1) / COS_STEP_EVERY))];
  const totVal  = step + lvSum * COS_LV.atk;
  const totWant = fmtEff(totVal);

  closeModal(); showCosDetail(ownId);
  const det = txt('#mbox');
  const db = txt('#mbox .sk-db p');
  const lv = cosLvOf(ownId), idx = cosOwnIdx(ownId);
  const dbVal  = ['atk', 'hp', 'gold'].map(k => cosOwnStep(k, idx) + lv * COS_LV[k]);
  const dbWant = dbVal.map(v => fmtEff(v));                      /* 835 — 표기만 제품 부품 파생 */

  closeModal(); showCosDetail(offId);
  const off = txt('#mbox');
  const offDb = txt('#mbox .sk-db p');

  closeModal(); cosHelp();
  const help = txt('.mwell .cos269') || txt('.mbody') || txt('.mwell');
  closeModal();
  return { ownId, offId, sheet, tot, totWant, totVal, fmtEffOne: fmtEff(0), det, db, dbWant, dbVal, off, offDb, help, lv, idx };
};

async function boot(url) {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showCosDetail === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    window.step = () => {};
    S.avatars = S.avatars || {};
    AVATARS.slice(0, 4).forEach(a => { S.avatars[a.id] = 1; });
    S.cosLv = S.cosLv || {};
    AVATARS.slice(0, 4).forEach((a, i) => { S.cosLv[a.id] = 10 + i; });
    S.stone = 5e7; S.dia = 5e7; S.rank = 3; save();
  });
  return { browser, page, errs };
}

(async () => {
  const { browser, page, errs } = await boot(URL);
  const R = await ev(page, READ);

  /* ══ [A] 시트 ═══════════════════════════════════════════════════════ */
  blk('A] 50 코스튬 시트 — 부호 0 · 값 불변');
  if (R) {
    ok(!SIGN.test(R.sheet), 'A1 시트 글자 전체에 «+»·«−» 가 0건이다', '남은 부호 «' + signs(R.sheet) + '»');
    ok(!DASH.test(R.sheet), 'A2 시트 글자 전체에 「가로 막대」가 0건이다', '남은 막대 «' + dashes(R.sheet) + '»');
    /* 835 [전제] — 기대 문자열이 «무른 통과» 가 될 수 없음을 먼저 못박는다.
       `fmtEff` 는 값이 0 이면 «×1배» 를 낸다: 그 상태로 [A3]·[B3] 을 통과시키면
       «효과가 통째로 사라져도 초록» 인 자가 된다(334 가 고른 처방 ①과 같은 이유). */
    ok(R.totVal > 0 && R.totWant !== R.fmtEffOne && R.dbVal.every(v => v > 0)
       && R.dbWant.every(v => v !== R.fmtEffOne),
       'A0 [전제] 기대값 네 개가 전부 0 이 아니다 — «×1배면 통과» 가 아니다',
       '총효과 ' + R.totWant + ' · 세 축 ' + R.dbWant.join('/') + ' (중립 표기 ' + R.fmtEffOne + ')');
    ok(R.tot === '공격력 ' + R.totWant,
       'A3 «총효과» 알약 = «공격력 ×N배»(부호 없음) · 값은 COS_OWN·COS_STEP 에서 그대로',
       R.tot + ' / 기대 공격력 ' + R.totWant);
    ok(/총효과/.test(R.sheet) && /보유 \d+\/\d+/.test(R.sheet) && /강화 \d+Lv/.test(R.sheet),
       'A4 «총효과» 줄이 통째로 사라진 게 아니다(부호만 뺐다)', (R.sheet.match(/보유 [^·]+· 강화 [^·]+· 총효과: *[^ ]+/) || [''])[0]);
  }

  /* ══ [B] 상세 팝업 · 도움말 ═════════════════════════════════════════ */
  blk('B] 상세 팝업(보유·미보유) · [?] 도움말 — 부호 0 · 값 불변');
  if (R) {
    ok(!SIGN.test(R.det), 'B1 보유 칸 상세에 «+»·«−» 0건', '남은 부호 «' + signs(R.det) + '»');
    ok(!DASH.test(R.det), 'B2 보유 칸 상세에 「가로 막대」 0건', '남은 막대 «' + dashes(R.det) + '»');
    ok(R.db && R.dbWant.every(v => R.db.includes(v)),
       'B3 ★ 세 축 값이 `cosOwnStep + lv×COS_LV` 그대로다 — **부호만 뺐지 값은 0줄**(156·346 규약)',
       R.db + ' vs ' + R.dbWant.join('/'));
    ok(R.db && /^공격 /.test(R.db) && /체력 /.test(R.db) && /골드 /.test(R.db),
       'B4 세 축 머리말(공격·체력·골드)이 그대로다', R.db);
    ok(!SIGN.test(R.off) && !DASH.test(R.off),
       'B5 미보유 칸 상세에 부호·막대 0건', '부호 «' + signs(R.off) + '» 막대 «' + dashes(R.off) + '»');
    ok(R.help != null && !SIGN.test(R.help) && !DASH.test(R.help),
       'B6 [?] 도움말(`cosHelp`)에 부호·막대 0건', '부호 «' + signs(R.help) + '» 막대 «' + dashes(R.help) + '»');
    ok(R.help != null && /영구 적용/.test(R.help) && /등급이 없/.test(R.help),
       'B7 도움말 본문이 통째로 사라진 게 아니다(269 의 일반 설명 지문이 남아 있다)',
       String(R.help).slice(0, 48) + '…');
  }

  /* ══ [C] 275 뜻 보존 ════════════════════════════════════════════════ */
  blk('C] 미보유(미출시) 문구 — 막대만 뺐고 뜻은 그대로');
  if (R) {
    ok(/추후 공개/.test(R.offDb || R.off || ''),
       'C1 여전히 «추후 공개» 라고 말한다(275 — 조건이 아니라 «경로 없음»)', R.offDb);
    ok(!/시 지급됩니다/.test(R.offDb || ''),
       'C2 미출시 칸이 «…시 지급됩니다» 로 되돌아가지 않았다(275)', R.offDb);
    ok(/외형입니다/.test(R.offDb || ''), 'C3 문장이 잘리지 않았다', R.offDb);
  }

  /* ══ [D] 꾹 누르기 — 488 «beat = 시도 수» 는 살아 있고 플로터만 0장 ═══ */
  blk('D] 상세 [강화] 꾹 누르기 — 맥박은 회당, 플로터는 0장');
  const D = await ev(page, async () => {
    closeModal();
    const id = (AVATARS.find(a => cosOwn(a.id)) || {}).id;
    S.stone = 5e7; S.cosLv[id] = 10;
    showCosDetail(id);
    /* 계측 — hbPulse/hbFloat 와 cosUpgrade 를 감싼다(제품은 안 건드린다) */
    const c = { pulse: [], float: [], tries: 0 };
    const p0 = window.hbPulse, f0 = window.hbFloat, u0 = window.cosUpgrade;
    window.hbPulse = (h, okv) => { c.pulse.push(String(h)); return p0(h, okv); };
    window.hbFloat = (h, t, k) => { c.float.push({ h: String(h), t: String(t), k: String(k) }); return f0(h, t, k); };
    window.cosUpgrade = x => { const r = u0(x); if (r !== false) c.tries++; return r; };
    const b = document.getElementById('mLv');
    const lv0 = cosLvOf(id);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    const grMid = (document.querySelector('#mbox .sk-gr b') || {}).textContent;
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    window.hbPulse = p0; window.hbFloat = f0; window.cosUpgrade = u0;
    /* ⚠ `.fx-plus` 만으로 잡으면 HUD 재화 획득 플로터(`.fx-plus.ui` — 58/512 소유)까지 딸려 온다.
       이 자가 묻는 것은 **회당 맥박 플로터**(`.hb`)뿐이다. */
    return { c, lv0, lv1: cosLvOf(id), grMid, fxTxt: Array.from(document.querySelectorAll('#fxl .fx-plus.hb')).map(e => e.textContent) };
  });
  if (D) {
    ok(D.c.tries >= 4, 'D1 홀드가 실제로 여러 번 강화한다(전제)', D.c.tries + '회 · Lv ' + D.lv0 + ' → ' + D.lv1);
    ok(D.c.pulse.length === D.c.tries,
       'D2 ★ 488 규약 유지 — 회당 맥박 수 = 시도 수(피드백을 없앤 게 아니라 «문구» 만 없앴다)',
       D.c.pulse.length + ' / ' + D.c.tries);
    ok(D.c.float.length === 0,
       'D3 ★ 플로터는 0장이다 — «+1» 도 «−n» 도 안 뜬다(주인 지시)',
       D.c.float.map(f => f.t).join(',') || '0장');
    ok(D.c.pulse.length > 0 && D.c.pulse.every(h => h === '#mbox .sk-gr'),
       'D4 ★ 맥박 호스트가 «값이 바뀌는 줄»(레벨 행 `.sk-gr`)이다 — 194 이후 코스튬의 레벨 자리',
       Array.from(new Set(D.c.pulse)).join(' · '));
    ok(/Lv\. \d+/.test(String(D.grMid)) && Number(String(D.grMid).replace(/\D/g, '')) > D.lv0,
       'D5 홀드 «중» 에 그 줄의 숫자가 실제로 올라 있다(맥박이 가리키는 값이 살아 있다)',
       'Lv0 ' + D.lv0 + ' → 홀드 중 «' + D.grMid + '»');
    ok(D.fxTxt.length === 0, 'D6 홀드 뒤 연출 레이어에 회당 맥박 플로터(`.fx-plus.hb`)가 한 장도 안 남는다', D.fxTxt.join(',') || '0장');
  }

  /* ══ [E] 남의 자리 — 기본 문구 «+1» 은 그대로 ═══════════════════════ */
  blk('E] 범위 — `bindUpHold` 기본 문구는 여전히 «+1»(08 세부 팝업 실측)');
  const E = await ev(page, async () => {
    closeModal();
    const id = SKILLS[0].id;
    S.own = S.own || {}; S.own[id] = { l: 1, n: 1e9 };
    showSkillDetail(id);
    const f0 = window.hbFloat, got = [];
    window.hbFloat = (h, t, k) => { got.push(String(t)); return f0(h, t, k); };
    const b = document.getElementById('mLv');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    window.hbFloat = f0;
    closeModal();
    return got;
  });
  ok(Array.isArray(E) && E.includes('+1'),
     'E1 ★ 08 세부 팝업(스킬)의 회당 문구는 «+1» 그대로 — 520 은 남의 자리를 안 건드렸다',
     (E || []).join(',') || '없음');

  /* ══ [F] 콘솔 ═══════════════════════════════════════════════════════ */
  blk('F] 콘솔');
  ok(errs.length === 0, 'F1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));
  await browser.close();

  /* ══ [R] 되돌림 시험 ════════════════════════════════════════════════ */
  blk('R] 되돌림 시험 — 520 을 되돌린 **사본**에서는 위 항이 빨개져야 한다');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    const SUBS = [
      /* 835 — 앵커 둘을 **725 뒤 문자열**로 갈았다(`pct` → `fmtEff`). 표기 한 벌이 갈리면
         제품 grep 은 통과해도 «기대 문자열을 든 자» 가 남는다는 것이 831·835 의 교훈이고,
         §R 의 앵커도 그 문자열이다 — 못 찾으면 [R0] 이 «2/4» 로 즉시 말한다(무언의 헛초록 아님). */
      ["+  '<em class=\"ol3\">공격력 ' + fmtEff(tot) + '</em></div>';",
       "+  '<em class=\"ol3\">공격력 +' + fmtEff(tot) + '</em></div>';"],
      ["  const cosEffTxt = () => '공격 <em>' + fmtEff(cosEffNow('atk')) + '</em> · 체력 <em>'   /* 725 */\n        + fmtEff(cosEffNow('hp')) + '</em> · 골드 <em>' + fmtEff(cosEffNow('gold')) + '</em>';",
       "  const cosEffTxt = () => '공격 <em>+' + fmtEff(cosEffNow('atk')) + '</em> · 체력 <em>+'   /* 725 */\n        + fmtEff(cosEffNow('hp')) + '</em> · 골드 <em>+' + fmtEff(cosEffNow('gold')) + '</em>';"],
      ["      : cosOff(id) ? '아직 지급되는 곳이 없는 <em>추후 공개</em> 외형입니다.'",
       "      : cosOff(id) ? '<em>추후 공개</em> — 아직 지급되는 곳이 없는 외형입니다.'"],
      ["    beat: '#mbox .sk-gr',\n    txt:  '',\n", ""],
    ];
    let rev = src, found = 0;
    SUBS.forEach(([a, b]) => { if (rev.indexOf(a) >= 0) { found++; rev = rev.replace(a, b); } });
    ok(found === SUBS.length, 'R0 되돌릴 자리 ' + SUBS.length + '곳을 전부 찾았다', found + '/' + SUBS.length);
    if (found !== SUBS.length) {
      console.log('\nVERIFY520 ' + pass + '/' + (pass + fail) + ' FAIL');
      process.exit(1);
    }
    /* ⚠ 저장소 루트에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 리소스가 통째로 404 다
       (360·367·410 자리와 같은 이유). .gitignore 에 등재한다. */
    const tmp = path.resolve(__dirname, '..', `.v520-rev-${process.pid}.html`);
    fs.writeFileSync(tmp, rev);
    try {
      const B = await boot('file://' + tmp.replace(/\\/g, '/'));
      const r = await ev(B.page, READ);
      ok(r && SIGN.test(r.sheet), 'R1 되돌리면 시트에 부호가 되살아난다([A1] 이 빨개진다)', r ? '«' + signs(r.sheet) + '»' : '읽기 실패');
      ok(r && SIGN.test(r.det), 'R2 되돌리면 보유 칸 상세에 부호가 되살아난다([B1])', r ? '«' + signs(r.det) + '»' : '읽기 실패');
      ok(r && DASH.test(r.off), 'R3 되돌리면 미보유 문구의 「막대」가 되살아난다([B5])', r ? r.offDb : '읽기 실패');
      ok(r && r.tot !== '공격력 ' + r.totWant, 'R4 되돌리면 «총효과» 문자열이 [A3] 기대와 다르다', r ? r.tot : '읽기 실패');
      const rd = await ev(B.page, async () => {
        closeModal();
        const id = (AVATARS.find(a => cosOwn(a.id)) || {}).id;
        S.stone = 5e7; S.cosLv[id] = 10; showCosDetail(id);
        const f0 = window.hbFloat, p0 = window.hbPulse, got = [], hosts = [];
        window.hbFloat = (h, t, k) => { got.push(String(t)); return f0(h, t, k); };
        window.hbPulse = (h, okv) => { hosts.push(String(h)); return p0(h, okv); };
        document.getElementById('mLv').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await new Promise(x => setTimeout(x, 800));
        dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        window.hbFloat = f0; window.hbPulse = p0;
        return { got, hosts };
      });
      ok(rd && rd.got.includes('+1'), 'R5 되돌리면 «+1» 플로터가 되살아난다([D3] 이 빨개진다)', rd ? rd.got.join(',') : '읽기 실패');
      ok(rd && rd.hosts.length > 0 && rd.hosts.every(h => h === '#mbox .sk-lv'),
         'R6 되돌리면 맥박이 다시 «착용 중» 알약(`.sk-lv`)에서 돈다([D4] 가 빨개진다)',
         rd ? Array.from(new Set(rd.hosts)).join(' · ') : '읽기 실패');
      await B.browser.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }

  console.log('\nVERIFY520 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); console.log('\nVERIFY520 FAIL (예외)'); process.exit(1); });
