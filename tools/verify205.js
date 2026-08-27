#!/usr/bin/env node
/* 작업 205 — DPS 측정장·아레나 «하루 딱 3회» 기능 검증 (ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify205.js
 *
 * 주인 지시(2026-08-27): «DPS 랑 아레나 하루 딱 3번만, 누적으로 쌓이는 거 없게».
 *   · 순수 리셋형 — 204 던전 입장권(적립·이월)과 **정반대**다. 안 쓰면 사라진다.
 *   · 아레나만 예외: 3회를 다 쓴 뒤에도 다이아 100 으로 추가 도전(상한 없음).
 *   · DPS 측정장은 예외 없이 3회 — 다이아 추가 도전이 없다.
 *
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영됨» 을 본다.
 * 지시서 [3]-(가) 기계적 작업 — 비평가 없이 이 게이트 + smoke 로 통과 판정한다.
 *
 * 검증 축:
 *   1. 상수·세이브 키          2. 03 컨텐츠 카드 «남은 도전 N/3»
 *   3. 04 세부 팝업 N/3        4. 입장 1회 = 1 차감 (카드·팝업에 반영)
 *   5. 측정장 소진 = 회색 + 입력 차단 + 토스트   6. 아레나 소진 = 가격 표시 모드(💎100)
 *   7. 다이아 부족 = 은색 면 + 빨간 가격 + 차단  8. 날짜가 바뀌면 3 «으로» 리셋(이월·적립 없음)
 *   9. 구 세이브(키 없음) 로드  10. 콘솔 에러 · NaN
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const fails = [];
let n = 0;
const chk = (name, cond, got) => {
  n++;
  if (cond) console.log(`  ✓ ${name}` + (got !== undefined ? ` — ${got}` : ''));
  else { fails.push(name); console.log(`  ✗ ${name}` + (got !== undefined ? ` — got ${JSON.stringify(got)}` : '')); }
};
const launchOpts = () => {
  const fs = require('fs');
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    if (fs.existsSync(p)) return { executablePath: p };
  return {};
};
const click = (page, sel) => page.$eval(sel, (el) => el.click());
/* 토스트 수명은 760ms 퇴장 시작 · 1060ms 제거다(149) — 300ms 안에 읽는다 */
const toast = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#fxl .fx-toast')].map((e) => e.textContent).join(' | '));
const clearToast = (page) => page.evaluate(() => {
  document.querySelectorAll('#fxl .fx-toast').forEach((e) => e.remove());
  document.querySelectorAll('#modal.on, .modal.on').forEach((m) => m.classList.remove('on'));
});
/* 03 «컨텐츠» 탭을 연다(측정장·아레나 카드가 있는 곳) */
async function openContents(page) {
  await page.evaluate(() => { closeDunDetail(); closeDungeon(); });
  await click(page, '.tab[data-t="adv"]');
  await page.waitForTimeout(350);
  await click(page, '#dunSub [data-dsub="raid"]');
  await page.waitForTimeout(350);
}
const cardInfo = (page) => page.$$eval('#dunList .dnc', (els) => els.map((e) => ({
  id: e.dataset.rcard || (e.dataset.arena ? 'arena' : '?'),
  pills: [...e.querySelectorAll('.pill > i')].map((i) => i.textContent.trim()),
  ic: [...e.querySelectorAll('.pill > i img.cic')].map((i) => i.dataset.curIc),
  out: e.classList.contains('out'),
  dot: !!e.querySelector('.dot'),
})));

(async () => {
  let browser;
  try { browser = await launch(chromium, {}); }
  catch (e) { browser = await launch(chromium, launchOpts()); }
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  /* 아레나는 스테이지 5 해금이다 — 잠금은 123 의 몫이라 여기서는 열어 두고 «횟수» 만 본다 */
  await page.evaluate(() => { S.best = 999; S.stage = 999; save(); });

  try {
    /* ---------- 1. 상수 · 세이브 키 ---------- */
    console.log('[1] 상수 3·3·100 과 S.daily 키');
    const c = await page.evaluate(() => ({
      raidTry: typeof RAID_TRY === 'number' ? RAID_TRY : null,
      arenaTry: typeof ARENA_TRY === 'number' ? ARENA_TRY : null,
      extra: typeof ARENA_EXTRA_DIA === 'number' ? ARENA_EXTRA_DIA : null,
      defRaid: DEF().daily.raid, defArena: DEF().daily.arena,
      sRaid: S.daily.raid, sArena: S.daily.arena,
      left: [raidLeft(), arenaLeft()],
    }));
    chk('RAID_TRY = 3 (주인 지시 «딱 3번»)', c.raidTry === 3, c.raidTry);
    chk('ARENA_TRY = 3', c.arenaTry === 3, c.arenaTry);
    chk('ARENA_EXTRA_DIA = 100 (아레나 추가 도전 1회)', c.extra === 100, c.extra);
    chk('DEF().daily 에 raid·arena 키가 3 으로 있다', c.defRaid === 3 && c.defArena === 3, `${c.defRaid}/${c.defArena}`);
    chk('현재 세이브도 3/3', c.sRaid === 3 && c.sArena === 3, `${c.sRaid}/${c.sArena}`);
    chk('raidLeft()·arenaLeft() = 3', c.left[0] === 3 && c.left[1] === 3, JSON.stringify(c.left));

    /* ---------- 2. 03 컨텐츠 카드 표기 ---------- */
    console.log('[2] 03 «컨텐츠» 카드 — «남은 도전 3/3»');
    await openContents(page);
    const cards = await cardInfo(page);
    chk('카드 2장(측정장 · 아레나)', cards.length === 2 && cards[0].id === 'r60' && cards[1].id === 'arena',
      JSON.stringify(cards.map((x) => x.id)));
    chk('측정장 카드에 «남은 3/3»', !!(cards[0] && /남은\s*3\/3/.test(cards[0].pills.join(' '))),
      cards[0] && cards[0].pills.join(' | '));
    chk('아레나 카드에 «남은 도전 3/3»', !!(cards[1] && /남은 도전\s*3\/3/.test(cards[1].pills.join(' '))),
      cards[1] && cards[1].pills.join(' | '));
    chk('둘 다 회색(.out)이 아니다', cards.every((x) => !x.out), JSON.stringify(cards.map((x) => x.out)));

    /* ---------- 3. 04 세부 팝업 ---------- */
    console.log('[3] 04 세부 팝업 «남은 횟수» 칸 = N/3 (종전 «∞» 자리)');
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    const dr = await page.evaluate(() => ({
      on: document.getElementById('dgdw').classList.contains('on'),
      try: document.getElementById('dgdTry').textContent.trim(),
      tki: document.getElementById('dgdTki').innerHTML.trim(),
      go: document.getElementById('dgdGo').textContent.trim(),
      dis: document.getElementById('dgdGo').disabled,
    }));
    chk('측정장 세부 팝업 «3/3» (∞ 아님)', dr.on && dr.try === '3/3', `${dr.on}/${dr.try}`);
    chk('입장«권» 아이콘은 비어 있다 (204 적립식과 혼동 금지)', dr.tki === '', dr.tki);
    chk('[도전] 활성 · 라벨 «도전»', dr.go === '도전' && dr.dis === false, `${dr.go}/${dr.dis}`);
    await page.evaluate(() => closeDunDetail());
    await page.waitForTimeout(200);
    await click(page, '#dunList [data-arena]');
    await page.waitForTimeout(300);
    const da = await page.evaluate(() => ({
      try: document.getElementById('dgdTry').textContent.trim(),
      go: document.getElementById('dgdGo').textContent.trim(),
      dis: document.getElementById('dgdGo').disabled,
      lack: document.getElementById('dgdGo').classList.contains('lack'),
    }));
    chk('아레나 세부 팝업 «3/3»', da.try === '3/3', da.try);
    chk('무료분이 남아 있으면 가격 표시가 아니다', da.go === '도전' && !da.lack && !da.dis, `${da.go}/${da.lack}`);
    await page.evaluate(() => closeDunDetail());

    /* ---------- 4. 입장 1회 = 1 차감 + 다른 화면 반영 ---------- */
    console.log('[4] 측정장 1회 입장 → 2/3 (S · 카드 · 팝업 셋 다)');
    const r1 = await page.evaluate(async () => {
      closeDungeon();
      const b = S.daily.raid;
      startRaid(RAIDS[0]);
      await new Promise((r) => setTimeout(r, 300));
      const on = !!raidOn;
      endRaid(false);
      await new Promise((r) => setTimeout(r, 300));
      return { b, a: S.daily.raid, on, saved: JSON.parse(localStorage.getItem(KEY)).daily.raid };
    });
    chk('측정장이 실제로 시작됐다', r1.on === true, r1.on);
    chk('S.daily.raid 3 → 2', r1.b === 3 && r1.a === 2, `${r1.b} → ${r1.a}`);
    chk('세이브(S)에도 즉시 반영된다', r1.saved === 2, r1.saved);
    await openContents(page);
    const c4 = await cardInfo(page);
    chk('03 카드가 «남은 2/3» 으로 갱신 (다른 화면 반영)',
      /남은\s*2\/3/.test(c4[0].pills.join(' ')), c4[0].pills.join(' | '));
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    const t4 = await page.$eval('#dgdTry', (e) => e.textContent.trim());
    chk('04 세부 팝업도 «2/3»', t4 === '2/3', t4);
    await page.evaluate(() => closeDunDetail());

    /* ---------- 5. 측정장 소진 = 회색 + 차단 ---------- */
    console.log('[5] 측정장 0/3 — 카드 회색 · [도전] 차단 · 토스트 · 시작 불가');
    await page.evaluate(() => { S.daily.raid = 0; save(); });
    await openContents(page);
    const c5 = await cardInfo(page);
    chk('측정장 카드가 회색(.out)', c5[0].out === true, c5[0].out);
    chk('레드닷도 꺼진다 (166 — 누를 게 없다)', c5[0].dot === false, c5[0].dot);
    chk('카드 표기 «남은 0/3»', /남은\s*0\/3/.test(c5[0].pills.join(' ')), c5[0].pills.join(' | '));
    await clearToast(page);
    await click(page, '#dunList [data-rcard="r60"]');
    await page.waitForTimeout(300);
    const g5 = await page.evaluate(() => ({
      dis: document.getElementById('dgdGo').disabled,
      f: document.getElementById('dgdGo').style.filter,
      try: document.getElementById('dgdTry').textContent.trim(),
    }));
    chk('세부 팝업 [도전] 비활성 + 회색 필터', g5.dis === true && /grayscale/.test(g5.f), `${g5.dis}/${g5.f}`);
    chk('세부 팝업 «0/3»', g5.try === '0/3', g5.try);
    const blocked = await page.evaluate(async () => {
      const b = { raid: !!raidOn, left: S.daily.raid };
      startRaid(RAIDS[0]);
      await new Promise((r) => setTimeout(r, 250));
      return { b, on: !!raidOn, left: S.daily.raid,
        toast: [...document.querySelectorAll('#fxl .fx-toast')].map((e) => e.textContent).join(' | ') };
    });
    chk('startRaid 로도 시작되지 않는다 (게이트가 함수 안에 있다)', blocked.on === false, blocked.on);
    chk('횟수가 음수로 내려가지 않는다', blocked.left === 0, blocked.left);
    chk('«내일 3회» 안내가 토스트로 뜬다 (149·206)', /내일/.test(blocked.toast) && /3/.test(blocked.toast), blocked.toast);
    await page.evaluate(() => closeDunDetail());
    await clearToast(page);

    /* ---------- 6. 아레나 소진 = 가격 표시 모드 ---------- */
    console.log('[6] 아레나 0/3 + 다이아 충분 → «💎100» 가격 모드 · 입장 시 100 차감');
    await page.evaluate(() => { S.daily.arena = 0; S.dia = 5000; save(); });
    await openContents(page);
    const c6 = await cardInfo(page);
    chk('아레나 카드는 회색이 아니다 (추가 도전이 남아 있다)', c6[1].out === false, c6[1].out);
    chk('카드 알약이 «추가 도전 💎100» 으로 바뀐다',
      /추가 도전/.test(c6[1].pills.join(' ')) && /100/.test(c6[1].pills.join(' ')), c6[1].pills.join(' | '));
    chk('가격 아이콘은 125 통일 화폐 이미지(dia)', c6[1].ic.indexOf('dia') >= 0, JSON.stringify(c6[1].ic));
    await click(page, '#dunList [data-arena]');
    await page.waitForTimeout(300);
    const g6 = await page.evaluate(() => ({
      txt: document.getElementById('dgdGo').textContent.trim(),
      img: document.querySelectorAll('#dgdGo img.cic').length,
      dis: document.getElementById('dgdGo').disabled,
      lack: document.getElementById('dgdGo').classList.contains('lack'),
    }));
    chk('[도전] 이 «💎100» 가격 버튼으로 바뀐다', g6.txt === '100' && g6.img === 1, `${g6.txt}/${g6.img}`);
    chk('다이아가 충분하면 활성(회색 아님) — 102 규칙', g6.dis === false && g6.lack === false, `${g6.dis}/${g6.lack}`);
    const p6 = await page.evaluate(async () => {
      const b = { dia: S.dia, left: S.daily.arena };
      document.getElementById('dgdGo').click();
      await new Promise((r) => setTimeout(r, 600));
      const out = { b, on: !!arena, dia: S.dia, left: S.daily.arena };
      endArena(null);
      await new Promise((r) => setTimeout(r, 400));
      return out;
    });
    chk('다이아로 추가 도전이 실제로 시작된다', p6.on === true, p6.on);
    chk('다이아가 정확히 100 깎인다', p6.b.dia - p6.dia === 100, `${p6.b.dia} → ${p6.dia}`);
    chk('무료 횟수는 0 그대로(음수 아님)', p6.left === 0, p6.left);
    await clearToast(page);

    /* ---------- 7. 다이아 부족 = 은색 면 + 빨간 가격 + 차단 ---------- */
    console.log('[7] 아레나 0/3 + 다이아 99 → 회색 카드 · .lack 버튼 · 입장 불가');
    await page.evaluate(() => { S.daily.arena = 0; S.dia = 99; save(); });
    await openContents(page);
    const c7 = await cardInfo(page);
    chk('아레나 카드가 회색(.out) — 171 «불가 = 회색»', c7[1].out === true, c7[1].out);
    chk('레드닷도 꺼진다', c7[1].dot === false, c7[1].dot);
    await click(page, '#dunList [data-arena]');
    await page.waitForTimeout(300);
    const g7 = await page.evaluate(() => {
      const b = document.getElementById('dgdGo'), st = getComputedStyle(b);
      return { dis: b.disabled, lack: b.classList.contains('lack'), color: st.color };
    });
    chk('[도전] 비활성 + .lack', g7.dis === true && g7.lack === true, `${g7.dis}/${g7.lack}`);
    chk('가격 글자가 빨강(102 #FC716C)', /252,\s*113,\s*108/.test(g7.color), g7.color);
    const b7 = await page.evaluate(async () => {
      const b = { dia: S.dia };
      startArena();
      await new Promise((r) => setTimeout(r, 300));
      return { b, on: !!arena, dia: S.dia,
        toast: [...document.querySelectorAll('#fxl .fx-toast')].map((e) => e.textContent).join(' | ') };
    });
    chk('startArena 로도 입장되지 않는다', b7.on === false, b7.on);
    chk('다이아가 깎이지 않는다', b7.dia === 99, b7.dia);
    chk('«다이아 부족» 안내가 토스트로 뜬다', /부족/.test(b7.toast), b7.toast);
    await page.evaluate(() => closeDunDetail());
    await clearToast(page);

    /* ---------- 8. 날짜 리셋 — «3 으로», «+3» 이 아니다 ---------- */
    console.log('[8] 자정 리셋 = 순수 리셋 (누적·이월 없음 — 주인 지시)');
    const reset = await page.evaluate(() => {
      /* ⓐ 다 쓴 채로 하루가 지나면 3 으로 돌아온다 */
      S.daily.date = '1999-01-01'; S.daily.raid = 0; S.daily.arena = 0;
      dailyCheck();
      const a = { raid: S.daily.raid, arena: S.daily.arena };
      /* ⓑ 하나도 안 쓴 채로 하루가 지나도 3 이다 — 6 이 되면 «적립»(204 규칙)이라 틀렸다 */
      S.daily.date = '1999-01-01'; S.daily.raid = 3; S.daily.arena = 3;
      dailyCheck();
      const b = { raid: S.daily.raid, arena: S.daily.arena };
      /* ⓒ 같은 날 안에서는 리셋되지 않는다 */
      S.daily.raid = 1; S.daily.arena = 1;
      dailyCheck();
      const c = { raid: S.daily.raid, arena: S.daily.arena };
      return { a, b, c };
    });
    chk('ⓐ 0 인 채 날짜가 바뀌면 3/3', reset.a.raid === 3 && reset.a.arena === 3, JSON.stringify(reset.a));
    chk('ⓑ 안 쓰고 넘겨도 3/3 (누적 금지 — 6 이면 실패)', reset.b.raid === 3 && reset.b.arena === 3, JSON.stringify(reset.b));
    chk('ⓒ 같은 날에는 리셋되지 않는다', reset.c.raid === 1 && reset.c.arena === 1, JSON.stringify(reset.c));

    /* ---------- 9. 구 세이브 ---------- */
    console.log('[9] 구 세이브(raid·arena 키 없음) 로드');
    const old = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem(KEY));
      delete d.daily.raid; delete d.daily.arena;
      d.daily.date = today();                 /* 오늘 날짜라 dailyCheck 가 덮지 않는다 */
      d.gold = 12345;
      localStorage.setItem(KEY, JSON.stringify(d));
      const b = load();
      return { raid: S.daily.raid, arena: S.daily.arena, gold: S.gold,
               left: [raidLeft(), arenaLeft()], b: b !== undefined };
    });
    chk('없는 키가 3/3 으로 채워진다 (KEY 안 올림 — 44 교훈 2)',
      old.raid === 3 && old.arena === 3, `${old.raid}/${old.arena}`);
    chk('raidLeft()·arenaLeft() 도 3 (NaN 없음)', old.left[0] === 3 && old.left[1] === 3, JSON.stringify(old.left));
    chk('구 세이브 값(골드)은 그대로', old.gold === 12345, old.gold);

    /* ---------- 10. 콘솔 에러 · NaN ---------- */
    console.log('[10] 콘솔 에러 · NaN/undefined');
    await openContents(page);
    const bad = await page.evaluate(() => {
      const t = document.getElementById('dunList').innerText || '';
      const m = t.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
      return m ? m[0] : null;
    });
    chk('컨텐츠 탭 텍스트에 NaN/undefined 없음', bad === null, bad);
    chk('콘솔 에러 0건', errs.length === 0, errs.join(' | '));
  } catch (e) {
    fails.push('EXCEPTION: ' + e.message);
    console.log('  ✗ EXCEPTION — ' + e.stack);
  }

  await browser.close();
  console.log('');
  if (fails.length) { console.log(`VERIFY205 FAIL ${n - fails.length}/${n}`); fails.forEach((f) => console.log('  - ' + f)); process.exit(1); }
  console.log(`VERIFY205 PASS ${n}/${n}`);
})();
