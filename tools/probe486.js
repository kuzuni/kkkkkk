/* 작업 486 재현 프로브 — «23 훈련 카드 알약이 증가분(+20)이라 «지금 최종값» 을 어디서도 안 알려 준다»
 *
 *   node tools/probe486.js
 *
 * 338 규칙 — 등재문의 처방(«`.cv` 를 `stat.dmg/maxHp/regen` 으로 갈아 끼운다»)을 따르기 전에
 * **제품에게 직접 묻는다.** 등재문이 세운 것과 이 자리가 실제로 안고 있는 것을 한 자로 전부 굴린다:
 *
 *   §A 현행 표기 — 세 카드 `.cv` 가 정말 «증가분» 인가(수리 전엔 «+…» · 수리 후엔 최종값)
 *   §B 최종값 축 — `stat.dmg/maxHp/regen` 이 카드 3장과 1:1 로 대응하는가(장비·펫·축복 포함값)
 *   §C ⚠ 폭 — 최종값은 «9.99AA» 급 6글자까지 자란다. 알약(카드 내부 310px)에 들어오는가
 *              (등재문 처방 ③ «필요하면 font-size 한 단 아래» 가 실제로 필요한지 여기서 갈린다)
 *              ⇒ **필요 없었다**: 최장 «9.99AA» 잉크 146.88px / 예산 294px = 절반이다.
 *                 `font-size` 는 한 글자도 안 건드렸다(레이아웃 Δ0px).
 *   §D ⚠ 58 플로터 — `trDeltaTxt()` 가 `.cv` 텍스트를 그대로 읽어 «방금 얻은 양» 으로 띄운다.
 *              `.cv` 가 최종값이 되면 플로터가 «+9.64G 얻었다» 는 **거짓말**이 된다.
 *              등재문에 없는 자리이므로 수리 전 실측으로 못박는다.
 *   §E 갱신 — 구매 1회 뒤 같은 프레임에 값이 오르는가(가벼운 갱신 경로 renderTrainLive)
 *
 * ⚠ 수리 **전** 트리에서 §A 가 «+…» 로 · §C 가 «잰 값» 으로 · §D 가 «최종값을 읽는다» 로
 *    나오는 것이 재현이다. 수리 뒤에는 §A·§D·§E 가 뒤집힌다(각 절에 기대값을 적어 두었다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const info = m => console.log('  ·  ' + m);
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function');
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 루프를 세운다 */
  await page.waitForTimeout(600);
  return { ctx, page };
}
const evOf = (page) => async (fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await open(browser);
  const ev = evOf(page);

  /* ══════════════════════════════════════════════════════════════════════
     §A 현행 표기 — 카드 3장의 `.cv` 가 무엇을 말하고 있나
     ══════════════════════════════════════════════════════════════════════ */
  blk('§A 카드 3장 `.cv` 텍스트 (부팅 세이브 · x1)');
  const a = await ev(() => {
    S.gold = 1e12; S.buyQty = 1; S.trainStage = 3;
    S.lv.atk = 20; S.lv.hp = 20; S.lv.regen = 20;
    markDirty(); openTrain(); renderTrain();
    const t = k => (document.querySelector('#trCards [data-tr="' + k + '"] .cv i') || {}).textContent;
    return {
      atk: t('atk'), hp: t('hp'), regen: t('regen'),
      now: { atk: fmtB(stat.dmg), hp: fmtB(stat.maxHp), regen: fmtB(stat.regen) },
      data: trainCardData().map(c => ({ k: c.k, gain: c.gain })),
    };
  });
  /* 수리 «전» 실측(2026-08-30, 이 프로브 1회차):
       `.cv` = {atk:"+20", hp:"+100", regen:"+15"}  ·  같은 순간의 최종값 = {533, 2.67A, 364}
     = 세 칸 전부 «한 번 살 때 오르는 양» 이었고 최종값은 화면 어디에도 없었다(주인 보고 그대로). */
  if (a.__err) { ok(false, 'evaluate 예외: ' + a.__err); }
  else {
    info('`.cv` = ' + JSON.stringify(a));
    ok(!/^\+/.test(a.atk) && !/^\+/.test(a.hp) && !/^\+/.test(a.regen),
      '«+» 접두 0건 (수리 전엔 +20/+100/+15 로 셋 다 빨갛다)');
    ok(a.atk === a.now.atk && a.hp === a.now.hp && a.regen === a.now.regen,
      '세 칸이 stat.dmg/maxHp/regen 과 글자까지 같다 (' + a.atk + ' · ' + a.hp + ' · ' + a.regen + ')');
    ok(a.atk !== a.data[0].gain, '증가분(«' + a.data[0].gain + '»)은 더 이상 알약에 안 뜬다');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §B 최종값 축 — 카드 3장 ↔ stat.dmg/maxHp/regen 이 1:1 로 붙는가
     «순수 훈련분» 이 아니라 «지금 내 수치» 여야 한다(등재문 처방 ①) —
     장비/펫/축복 배수가 실제로 얹히는지 흔들어 본다.
     ══════════════════════════════════════════════════════════════════════ */
  blk('§B 최종값 축 — 배수(장비·도감·축복)가 얹히는가');
  const b = await ev(() => {
    S.lv.atk = 40; S.lv.hp = 40; S.lv.regen = 40; markDirty();
    const raw = { atk: U.atk.val(lv('atk')), hp: U.hp.val(lv('hp')), regen: U.regen.val(lv('regen')) };
    const now = { atk: stat.dmg, hp: stat.maxHp, regen: stat.regen };
    /* 훈련 «단계» 를 올리면 전 스탯 배수가 오른다(17 스탯업 축) — 최종값이 따라 움직여야 한다 */
    const st0 = stat.dmg;
    S.trainStage = 8; markDirty();
    const st1 = stat.dmg;
    S.trainStage = 3; markDirty();
    return { raw, now, st0, st1, mulAtk: mulAtk(), mulHp: mulHp(), mulRegen: mulRegen() };
  });
  if (b.__err) { ok(false, 'evaluate 예외: ' + b.__err); }
  else {
    info('raw ' + JSON.stringify(b.raw) + ' · now ' + JSON.stringify(b.now));
    ok(Math.abs(b.now.atk - b.raw.atk * b.mulAtk) < 1e-6, 'stat.dmg = U.atk.val(lv) × mulAtk (배수 포함)');
    ok(Math.abs(b.now.hp - b.raw.hp * b.mulHp) < 1e-6, 'stat.maxHp = U.hp.val(lv) × mulHp');
    ok(Math.abs(b.now.regen - b.raw.regen * b.mulRegen) < 1e-6, 'stat.regen = U.regen.val(lv) × mulRegen');
    ok(b.st1 > b.st0, '단계 3 → 8 로 최종값이 실제로 오른다 (' + b.st0.toFixed(1) + ' → ' + b.st1.toFixed(1) + ')');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §C ⚠ 폭 — 최종값 문자열이 알약 안에 들어오는가
     `fmtB`(= fmtG) 의 최장 꼴은 «99.9AA»/«9.99AA» = 6글자다.
     카드 326 · 안쪽 테두리 8px 두 겹 ⇒ 내부 310 · 규약 여백 8px 두 겹 ⇒ **잉크 예산 294px**.
     ══════════════════════════════════════════════════════════════════════ */
  blk('§C 폭 — 최장 문자열의 잉크가 알약(예산 294px) 안에 드는가');
  const c = await ev(() => {
    const el = document.querySelector('#trCards [data-tr="atk"] .cv i');
    const card = document.querySelector('#trCards [data-tr="atk"]');
    const cr = card.getBoundingClientRect();
    const keep = el.textContent;
    const meas = s => { el.textContent = s; const r = el.getBoundingClientRect();
      return { s, w: +r.width.toFixed(2), left: +(r.left - cr.left).toFixed(2), right: +(cr.right - r.right).toFixed(2) }; };
    const rows = ['+20', '+480', '999', '9.99K', '99.9K', '999K', '9.99AA', '99.9AA', '999AA'].map(meas);
    el.textContent = keep;
    return { cardW: +cr.width.toFixed(2), rows, fs: getComputedStyle(el).fontSize };
  });
  if (c.__err) { ok(false, 'evaluate 예외: ' + c.__err); }
  else {
    info('카드 폭 ' + c.cardW + ' · font-size ' + c.fs);
    c.rows.forEach(r => info('  «' + r.s + '» 잉크 w ' + r.w + ' · 좌여백 ' + r.left + ' · 우여백 ' + r.right));
    const worst = c.rows.reduce((m, r) => r.w > m.w ? r : m, c.rows[0]);
    info('최장 «' + worst.s + '» = ' + worst.w + 'px (예산 294px)');
    ok(worst.w <= 294, '최장 문자열 잉크가 예산 294px 안 (' + worst.w + ')');
    ok(worst.left >= 8 && worst.right >= 8,
      '최장 문자열 좌우 여백 ≥ 8px (' + worst.left + ' / ' + worst.right + ')');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §D ⚠ 58 플로터 — `trDeltaTxt()` 가 무엇을 읽나
     등재문에 없는 자리다. `.cv` 를 최종값으로 갈면 플로터가 «방금 얻은 양» 대신
     «지금 총량» 을 띄운다 = 58 26회차가 명시적으로 «거짓말» 이라 부른 것.
     ══════════════════════════════════════════════════════════════════════ */
  blk('§D 증가분 축 — 증가분을 말하는가 총량을 말하는가');
  /* ⚑ 749(2026-09-01) — 이 절은 `trDeltaTxt(card)` 를 불렀고, **660(주인 지시 «훈련 숫자 플로터 폐지»)이
     그 함수를 선언째 지웠다**(index.html 35210) ⇒ `ReferenceError` 로 11/12.
     707 처방 그대로 **«입은 폐지됐지만 축은 살아 있다»** 로 방향만 뒤집는다(486 의 뜻은 «플로터» 가
     아니라 «증가분과 총량은 서로 다른 두 축이고, 알약은 총량을 말한다» 다). 폐지된 입을 되살아나지
     않게 지키는 것은 `verify486` [F1]·`verify660` [D3] 몫이라 **여기서 겹쳐 세지 않는다**(708 규약).
     ⚠ 실제 증가분은 축과 **같은 식을 두 번 적지 않고** 알약이 쓰는 그 수(`TRAIN_NOW`)를 레벨 앞뒤로
        직접 읽어 잰다(628 이 «한 카드 안 두 자» 를 닫은 그 방법). */
  const d = await ev(() => {
    S.gold = 1e18; S.buyQty = 30; S.trainStage = 8;
    S.lv.atk = 30; markDirty(); renderTrain();
    const card = document.querySelector('#trCards [data-tr="atk"]');
    const cv = card.querySelector('.cv i').textContent;
    const bi = trainBuyInfo('atk');
    const axis = trainGainTxt('atk');                 /* 폐지된 입의 뜻을 물려받은 살아 있는 자리 */
    const before = TRAIN_NOW.atk(), keep = S.lv.atk;
    S.lv.atk = keep + bi.n; markDirty();
    const after = TRAIN_NOW.atk();
    S.lv.atk = keep; markDirty();
    return { mouth: typeof trDeltaTxt, axis, cv, n: bi.n,
      realTxt: '+' + fmtB(after - before), now: fmtB(before) };
  });
  if (d.__err) { ok(false, 'evaluate 예외: ' + d.__err); }
  else {
    info('폐지된 입 `trDeltaTxt` = ' + d.mouth + ' (660) · 증가분 축 «' + d.axis + '»'
      + ' · `.cv` «' + d.cv + '» · 알약의 자로 잰 실제 증분 ' + d.realTxt + ' (x' + d.n + ')'
      + ' · 지금 최종값 ' + d.now);
    ok(d.axis === d.realTxt,
      '증가분 축(`trainGainTxt`)이 «증가분» 을 말한다 — 알약이 쓰는 자로 잰 실제 증분과 같다(628)');
    ok(d.axis !== d.now && d.axis !== d.cv,
      '증가분 축이 «최종값» 을 띄우지 않는다 — 알약(`.cv`)과 분리돼 있다(486 의 뜻)');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §E 갱신 — 구매 1회 뒤 같은 프레임에 카드 값이 따라오는가
     ══════════════════════════════════════════════════════════════════════ */
  blk('§E 구매 직후 갱신 (가벼운 갱신 경로 renderTrainLive)');
  const e = await ev(() => {
    S.gold = 1e18; S.buyQty = 1; S.trainStage = 8; S.lv.atk = 30; markDirty(); renderTrain();
    const t = () => document.querySelector('#trCards [data-tr="atk"] .cv i').textContent;
    const before = t(), nowBefore = fmtB(stat.dmg);
    trainBuy('atk'); renderTrainLive();
    return { before, after: t(), nowBefore, nowAfter: fmtB(stat.dmg) };
  });
  if (e.__err) { ok(false, 'evaluate 예외: ' + e.__err); }
  else {
    info('`.cv` ' + e.before + ' → ' + e.after + ' · 최종값 ' + e.nowBefore + ' → ' + e.nowAfter);
    ok(e.nowAfter !== e.nowBefore, '구매로 최종값 자체는 오른다');
    ok(e.after === e.nowAfter, '수리 후: 카드가 같은 프레임에 새 최종값을 보인다 (수리 전엔 빨강)');
  }

  await ctx.close();
  await browser.close();
  console.log('\n' + (fail ? '❌' : '✅') + ' probe486  ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
