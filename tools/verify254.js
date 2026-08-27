#!/usr/bin/env node
/* 254 검증 — «첫 강화» 1회만 조각 2개 (저장소 주인 지시 2026-08-27).
 *
 *   node tools/verify254.js
 *
 * 지시: «장비 등 **처음 강화 한 번** 할 때 필요량 2개».
 *   구: fragNeed(l) = min(5 + (l-1), 20) → Lv1→Lv2 가 5개.
 *   신: Lv1 → Lv2 만 FRAG_FIRST(2), Lv2 부터는 옛 곡선 그대로(6, 7, … 상한 20).
 *
 * ⚠ 이 게이트의 절반은 **음성항**이다. 「첫 강화만」 이라는 지시는 «2 로 내렸다» 만으로는
 *   지켜지지 않는다 — 곡선 전체가 같이 내려가면(FRAG_BASE = 2) 그것도 fragNeed(1) === 2 를
 *   만족한다. 그래서 [B] 가 **Lv2 이후가 옛 값 그대로인지**를 같이 못 박는다.
 *   되돌림(구 5)뿐 아니라 **과교정(곡선 전체 하향)** 도 여기서 빨개져야 한다.
 *
 * ⚠ fragNeed 는 «비용» 이자 «진행바 분모» 이자 «판정» 이다(등재문 경고). 셋을 따로 잰다:
 *   상수만 보고 통과시키면 표시가 옛 값을 물고 있어도 초록이 된다.
 *
 * 검사 항목:
 *   [A] 곡선     fragNeed(1)=2 · (2)=6 · (3)=7 … (16)=20 · (17)=20(상한) — 첫 칸만 바뀌었다
 *   [B] 음성항   FRAG_BASE=5 · FRAG_CAP=20 · CRAFT_NEED=5 불변 + Lv2~ 가 옛 공식과 완전 일치
 *   [C] 판정     Lv1 조각 1 → canLevel false · 조각 2 → true (경계가 정확히 2다)
 *   [D] 실동작   08 세부 [강화] **버튼 클릭** → Lv2 · 조각 0 · S.cnt.levelUps +1 · 저장 반영
 *   [E] 2회차    Lv2 는 여전히 6개 — 조각 5 → 버튼 disabled · 6 → 눌러서 Lv3
 *   [F] 일괄     Lv1 + 조각 8 에서 [최대 강화] → 2 + 6 = 8 을 다 써 **Lv3** (남은 조각 0)
 *   [G] 표시     미보유 세부 팝업 «0/2» 와 격자 카드 분모가 일치 (구: 팝업 0/4 · 카드 0/5)
 *   [H] 계열 전수  스킬 · 장비 · 펫 셋 다 첫 강화가 2다 (공용 함수를 우회한 계열이 없다)
 *   [I] 에러 0
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const fails = [];
let n = 0;
const fail = (m) => { n++; fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => { n++; console.log('  ✓ ' + m); };
const eq = (label, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(label + ' = ' + JSON.stringify(got))
  : fail(label + ' = ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(want) + ')'));

const settle = async (page) => {
  await page.evaluate(() => Promise.all(document.getAnimations({ subtree: true })
    .filter(a => { try { return a.effect && a.effect.getComputedTiming().iterations !== Infinity; } catch (e) { return false; } })
    .map(a => a.finished.catch(() => {}))).catch(() => {}));
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    if (typeof closeOfflineReward === 'function') closeOfflineReward();
    if (typeof closeModal === 'function') closeModal();
  });

  /* ---- [A] 곡선 ---- */
  console.log('[A] fragNeed 곡선 — 첫 칸만 2, 나머지는 옛 값');
  const curve = await page.evaluate(() => [0, 1, 2, 3, 4, 5, 15, 16, 17, 99].map(l => fragNeed(l)));
  /*      l =  0  1  2  3  4  5  15  16  17  99   */
  eq('  fragNeed(0,1,2,3,4,5,15,16,17,99)', curve, [2, 2, 6, 7, 8, 9, 19, 20, 20, 20]);
  eq('  첫 강화(Lv1→Lv2) 비용', curve[1], 2);

  /* ---- [B] 음성항 — 곡선 전체가 내려간 것이 아니다 ---- */
  console.log('[B] 음성항 — «첫 칸만» 인지 (전체 하향·되돌림 둘 다 잡는다)');
  const consts = await page.evaluate(() => ({
    base: typeof FRAG_BASE !== 'undefined' ? FRAG_BASE : null,
    cap: typeof FRAG_CAP !== 'undefined' ? FRAG_CAP : null,
    craft: typeof CRAFT_NEED !== 'undefined' ? CRAFT_NEED : null,
    first: typeof FRAG_FIRST !== 'undefined' ? FRAG_FIRST : null,
  }));
  eq('  FRAG_BASE(옛 곡선의 밑값) 불변', consts.base, 5);
  eq('  FRAG_CAP 불변', consts.cap, 20);
  eq('  CRAFT_NEED(합성 — 다른 축) 불변', consts.craft, 5);
  eq('  FRAG_FIRST', consts.first, 2);
  /* Lv2 부터 끝까지 옛 공식과 한 칸도 어긋나지 않는다 */
  const drift = await page.evaluate(() => {
    const old = l => Math.min(FRAG_BASE + (l - 1), FRAG_CAP);
    const bad = [];
    for (let l = 2; l <= MAX_LEVEL; l++) if (fragNeed(l) !== old(l)) bad.push(l + ':' + fragNeed(l) + '≠' + old(l));
    return bad;
  });
  eq('  Lv2~Lv100 이 옛 곡선과 어긋난 칸 수', drift.length, 0);
  if (drift.length) console.log('    ' + drift.slice(0, 8).join(' '));

  /* ---- [C] 판정 경계 ---- */
  console.log('[C] canLevel 경계 — 조각 1 은 안 되고 2 는 된다');
  const skId = await page.evaluate(() => SKILLS[0].id);
  const bound = await page.evaluate((id) => {
    const it = SK[id];
    S.own[id] = { l: 1, n: 1 }; const a = canLevel(it);
    S.own[id] = { l: 1, n: 2 }; const b = canLevel(it);
    return { a, b };
  }, skId);
  eq('  조각 1 → canLevel', bound.a, false);
  eq('  조각 2 → canLevel', bound.b, true);

  /* ---- [D] 실동작 — 버튼을 실제로 누른다 ---- */
  console.log('[D] 08 세부 [강화] 클릭 — 조각 2 로 Lv1 → Lv2');
  await page.evaluate((id) => {
    S.own[id] = { l: 1, n: 2 };
    S.cnt.levelUps = 0;
    showSkillDetail(id);
  }, skId);
  await page.waitForTimeout(150); await settle(page);
  const dBefore = await page.evaluate(() => {
    const b = document.getElementById('mLv');
    return { exists: !!b, disabled: b ? b.disabled : null };
  });
  eq('  [강화] 버튼이 살아 있다', dBefore.exists && dBefore.disabled === false, true);
  /* ⚠ 죽은 버튼을 `page.click` 하면 30초 타임아웃으로 **게이트가 죽는다** — 되돌림(첫 강화 5개)
     이 바로 그 모양이라, 그러면 «FAIL 한 줄» 대신 스택 트레이스가 나온다. 눌릴 때만 누르고
     아니면 아래 칸들이 스스로 빨개지게 둔다(예외로 죽는 게이트는 아무것도 못 재운다). */
  if (dBefore.exists && dBefore.disabled === false) {
    await page.click('#mLv');
    await page.waitForTimeout(220); await settle(page);
  }
  const dAfter = await page.evaluate((id) => ({
    lv: S.own[id].l, frag: S.own[id].n, ups: S.cnt.levelUps,
    saved: (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return null; } })(),
  }), skId);
  eq('  레벨', dAfter.lv, 2);
  eq('  남은 조각', dAfter.frag, 0);
  eq('  S.cnt.levelUps', dAfter.ups, 1);
  (dAfter.saved && dAfter.saved.own && dAfter.saved.own[skId] && dAfter.saved.own[skId].l === 2 ? ok : fail)(
    '  세이브(S)에 Lv2 가 반영됐다');

  /* ---- [E] 2회차는 옛 값 그대로 ---- */
  console.log('[E] 2회차(Lv2 → Lv3) 는 여전히 6개');
  await page.evaluate((id) => { S.own[id] = { l: 2, n: 5 }; showSkillDetail(id); }, skId);
  await page.waitForTimeout(150); await settle(page);
  const e5 = await page.evaluate(() => { const b = document.getElementById('mLv'); return b ? b.disabled : null; });
  eq('  조각 5 → [강화] disabled', e5, true);
  await page.evaluate((id) => { S.own[id] = { l: 2, n: 6 }; showSkillDetail(id); }, skId);
  await page.waitForTimeout(150); await settle(page);
  const e6 = await page.evaluate(() => { const b = document.getElementById('mLv'); return b ? b.disabled : null; });
  eq('  조각 6 → [강화] 활성', e6, false);
  if (e6 === false) {
    await page.click('#mLv');
    await page.waitForTimeout(220); await settle(page);
  }
  eq('  눌러서 Lv3', await page.evaluate((id) => S.own[id].l, skId), 3);

  /* ---- [F] 최대 강화 — 2 + 6 = 8 ---- */
  console.log('[F] [최대 강화] — Lv1 + 조각 8 → Lv3 (2 + 6 을 다 쓴다)');
  const eqId = await page.evaluate(() => (typeof EQUIPS !== 'undefined' && EQUIPS[0]) ? EQUIPS[0].id : null);
  (eqId ? ok : fail)('  장비 표본 확보: ' + eqId);
  if (eqId) {
    const f = await page.evaluate((id) => {
      S.own[id] = { l: 1, n: 8 };
      const cnt = levelUpMax(itemById(id));
      return { cnt, lv: S.own[id].l, frag: S.own[id].n };
    }, eqId);
    eq('  올라간 레벨 수', f.cnt, 2);
    eq('  레벨', f.lv, 3);
    eq('  남은 조각', f.frag, 0);
  }

  /* ---- [G] 표시 — 미보유 분모가 팝업·카드에서 같다 ---- */
  console.log('[G] 표시 분모 — 미보유 세부 팝업과 격자 카드가 같은 값을 쓴다');
  const g = await page.evaluate((id) => {
    delete S.own[id];
    showSkillDetail(id);
    const lab = document.querySelector('#mbox .sk-pb b');
    return {
      popup: lab ? lab.textContent.trim() : null,
      popupNeed: fragNeed(oLv(id)),          /* 미보유 → oLv 0 */
      cardNeed: fragNeed(1),                 /* 격자 카드는 own ? oLv : 1 */
    };
  }, skId);
  eq('  팝업 분모 = 카드 분모', g.popupNeed === g.cardNeed, true);
  eq('  미보유 팝업 라벨', g.popup, '0/2');

  /* ---- [H] 계열 전수 — 공용 함수를 우회한 계열이 없다 ---- */
  console.log('[H] 계열 전수 — 스킬 · 장비 · 펫 첫 강화가 모두 2');
  const h = await page.evaluate(() => {
    const pick = (arr) => (typeof arr !== 'undefined' && arr[0]) ? arr[0].id : null;
    const ids = { skill: pick(SKILLS), equip: pick(typeof EQUIPS !== 'undefined' ? EQUIPS : []), pet: pick(typeof PETS !== 'undefined' ? PETS : []) };
    const out = {};
    for (const k in ids) {
      const id = ids[k];
      if (!id) { out[k] = null; continue; }
      const it = itemById(id);
      S.own[id] = { l: 1, n: 1 }; const no = canLevel(it);
      S.own[id] = { l: 1, n: 2 }; const yes = canLevel(it);
      const before = S.own[id].l; levelUp(it);
      out[k] = { no, yes, rose: S.own[id].l === before + 1, left: S.own[id].n };
    }
    return out;
  });
  ['skill', 'equip', 'pet'].forEach(k => {
    const v = h[k];
    if (!v) { fail('  ' + k + ' 표본 없음'); return; }
    eq('  ' + k + ' 조각 1 → 불가', v.no, false);
    eq('  ' + k + ' 조각 2 → 가능·레벨 상승·조각 0', v.yes && v.rose && v.left === 0, true);
  });

  /* ---- 소스 잔재 — 옛 한 줄 공식이 남아 있지 않다 ---- */
  console.log('[H2] 소스 — 옛 fragNeed 한 줄이 남아 있지 않다');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  eq('  `const fragNeed = l => Math.min(` 잔재', /const fragNeed = l => Math\.min\(/.test(src), false);

  /* ---- [I] 에러 0 ---- */
  console.log('[I] 콘솔·페이지 에러');
  eq('  에러 건수', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('    ' + e));

  await browser.close();
  console.log('\nVERIFY254 ' + (n - fails.length) + '/' + n + (fails.length ? ' FAIL' : ' PASS'));
  if (fails.length) { fails.forEach(f => console.log(' - ' + f)); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
