/* 작업 171 — «가능한데 회색» 상태색 게이트 (지시서 [3]-(가): 레퍼런스 대조가 아니라 «동작·수치» 검사)
 *
 *   node tools/verify171.js
 *
 * 주인 보고(2026-08-27): «코스튬 구매 가능한데 버튼 회색 — 가독성 나쁨, 가능하면 초록 되든지 해야지».
 * 규칙: **가능 = 활성색(초록) · 불가 = 회색**. 부족값만 빨강(102 관례)이고, 회색이어도 클릭은 살아 있어야
 * «얼마 모자란지» 안내가 뜬다(102 의 «색(.lack/.no)» 과 «입력 차단(disabled)» 두 축 분리).
 *
 * 검사 항목
 *   §1 50 코스튬 시트 [구매] — 가능/다이아 부족/조건 미달/이미 보유 4상태의 «실제 렌더 색»
 *   §2 50 코스튬 시트 [착용] — 보유·미착용/착용 중/미보유 3상태
 *   §3 07 스킬 · 26 동료 [일괄 강화] — 강화 가능 유무로 초록↔회색 (같은 `.sk-btn` 부품)
 *   §4 08 세부 팝업 `.sk-u` — 50 [구매] 가능/부족/불가 · 08 [강화] 가능/불가
 *   §5 회귀 — 회색이어도 클릭이 살아 있고(안내), 상태가 바뀌면 색이 «실제로» 따라온다 · 콘솔 에러 0
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 렌더된 면 색으로 판정한다 — 클래스 이름이 아니라 «눈에 보이는 색» 이 이 작업의 대상이다 */
const GREEN_SK = 'rgb(120, 243, 75)';    /* .sk-btn.ok  면(#78F34B) */
const GRAY_SK  = 'rgb(168, 168, 168)';   /* .sk-btn.no  면(#A8A8A8) */
const GREEN_U  = 'rgb(143, 220, 51)';    /* .sk-act .sk-u 활성(#8FDC33) */
const GRAY_U   = 'rgb(169, 169, 169)';   /* .sk-act .sk-u 회색(#A9A9A9) */

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 헬퍼를 페이지에 심는다 — 버튼 면 색을 그대로 읽는다 */
  await page.evaluate(() => {
    window.__face = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return getComputedStyle(el).backgroundImage;
    };
  });
  const face = sel => page.evaluate(s => window.__face(s), sel);

  /* ---------------- §1 50 코스튬 시트 [구매] ---------------- */
  console.log('\n§1 50 코스튬 시트 [구매] — 가능=초록 · 불가=회색');
  await page.evaluate(() => { S.dia = 5e7; S.best = 1; S.rank = 0; S.coll.skill = 0; S.coll.equip = 0; save(); });
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(500);

  /* (1) 살 수 있는 상태 — 미보유 · 조건 없음 · 다이아 충분 */
  const rich = await page.evaluate(() => {
    const a = AVATARS.find(x => !S.avatars[x.id] && !x.req);
    S.dia = a.cost * 4; cosSel = a.id; renderCos();
    return { id: a.id, cost: a.cost };
  });
  await page.waitForTimeout(150);
  let bg = await face('#bCos [data-cosbuy]');
  ok(bg && bg.includes(GREEN_SK), '[구매] 미보유+다이아 충분(' + rich.id + ') → 초록  (' + (bg || '').slice(0, 46) + '…)');

  /* (2) 다이아 부족 */
  await page.evaluate(c => { S.dia = c - 1; renderCos(); }, rich.cost);
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosbuy]');
  ok(bg && bg.includes(GRAY_SK), '[구매] 다이아 부족 → 회색');

  /* (3) 조건 미달(해금 req) — 다이아가 넘쳐도 회색 */
  const lockd = await page.evaluate(() => {
    const a = AVATARS.find(x => x.req && x.req.k === 'stage' && !S.avatars[x.id]);
    S.dia = 1e9; S.best = 0; cosSel = a.id; renderCos();
    return { id: a.id, need: a.req.v };
  });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosbuy]');
  ok(bg && bg.includes(GRAY_SK), '[구매] 조건 미달(' + lockd.id + ' — 스테이지 ' + lockd.need + ') → 회색 (다이아 충분이어도)');

  /* (3b) 같은 코스튬, 조건을 채우면 초록으로 «실제로» 바뀐다 */
  await page.evaluate(n => { S.best = n; renderCos(); }, lockd.need);
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosbuy]');
  ok(bg && bg.includes(GREEN_SK), '[구매] 조건 충족 → 초록으로 전환 (같은 코스튬)');

  /* (4) 이미 보유 */
  const owned = await page.evaluate(() => {
    const a = AVATARS.find(x => !x.req);
    S.avatars[a.id] = 1; S.dia = 1e9; cosSel = a.id; renderCos();
    return a.id;
  });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosbuy]');
  ok(bg && bg.includes(GRAY_SK), '[구매] 이미 보유(' + owned + ') → 회색');

  /* ---------------- §2 50 코스튬 시트 [착용] ---------------- */
  console.log('\n§2 50 코스튬 시트 [착용]');
  const wearable = await page.evaluate(() => {
    const a = AVATARS.find(x => !x.req && x.id !== 'av0');
    S.avatars[a.id] = 1; S.avatar = 'av0'; cosSel = a.id; renderCos();
    return a.id;
  });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-coswear]');
  ok(bg && bg.includes(GREEN_SK), '[착용] 보유 + 착용 중 아님(' + wearable + ') → 초록');

  await page.evaluate(id => { S.avatar = id; cosSel = id; renderCos(); }, wearable);
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-coswear]');
  ok(bg && bg.includes(GRAY_SK), '[착용] 이미 착용 중 → 회색');

  await page.evaluate(() => {
    const a = AVATARS.find(x => !S.avatars[x.id]);
    cosSel = a.id; renderCos();
  });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-coswear]');
  ok(bg && bg.includes(GRAY_SK), '[착용] 미보유 코스튬 선택 → 회색');

  /* ---------------- §3 07 스킬 · 26 동료 [일괄 강화] ---------------- */
  console.log('\n§3 07 스킬 · 26 동료 [일괄 강화] (같은 `.sk-btn` 부품)');
  /* `SKILLS`·`PETS` 는 스크립트 블록의 const 라 window 에 없다 — 키로 받아 안에서 고른다 */
  for (const [tab, sheet, btn, list, label] of [
    ['sk',  '#bSk',  'data-skup', 'sk',  '07 스킬'],
    ['pet', '#bPet', 'data-ptup', 'pet', '26 동료']
  ]) {
    await page.evaluate(t => document.querySelector('#eqTabs [data-eqtab="' + t + '"]').click(), tab);
    await page.waitForTimeout(400);

    /* 강화 가능한 것이 하나도 없는 상태 */
    const none = await page.evaluate(k => {
      const L = k === 'sk' ? SKILLS : PETS;
      L.forEach(it => { const o = S.own[it.id]; if (o) o.n = 0; });
      uiDirty = true; renderUI();
      return L.some(canLevel);
    }, list);
    await page.waitForTimeout(200);
    bg = await face(sheet + ' [' + btn + ']');
    ok(!none && bg && bg.includes(GRAY_SK), '[' + label + ' 일괄 강화] 강화 가능 0개 → 회색');

    /* 재료를 부어 «가능» 으로 */
    const some = await page.evaluate(k => {
      const L = k === 'sk' ? SKILLS : PETS;
      if (!L.some(x => S.own[x.id])) S.own[L[0].id] = { l: 1, n: 0 };
      const t = L.find(x => S.own[x.id]);
      S.own[t.id].n = 1e12;
      uiDirty = true; renderUI();
      return { any: L.some(canLevel), id: t.id };
    }, list);
    await page.waitForTimeout(200);
    bg = await face(sheet + ' [' + btn + ']');
    ok(some.any && bg && bg.includes(GREEN_SK), '[' + label + ' 일괄 강화] 강화 가능 있음(' + some.id + ') → 초록');

    /* 소환 버튼은 «항상 되는» 이동 버튼이라 늘 초록이다 */
    bg = await face(sheet + ' .sk-b1');
    ok(bg && bg.includes(GREEN_SK), '[' + label + ' 소환] 상점 이동 버튼은 상시 초록');
  }

  /* ---------------- §4 08 세부 팝업 `.sk-u` ---------------- */
  console.log('\n§4 08 세부 팝업 `.sk-u`');
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(400);

  const d1 = await page.evaluate(() => {
    const a = AVATARS.find(x => !S.avatars[x.id] && !x.req);
    S.dia = a.cost * 3; showCosDetail(a.id);
    const b = document.getElementById('mLv');
    return { id: a.id, dis: b.disabled, lack: b.classList.contains('lack'), bg: getComputedStyle(b).backgroundImage };
  });
  ok(!d1.dis && !d1.lack && d1.bg.includes(GREEN_U), '[50 상세 구매] 살 수 있음(' + d1.id + ') → 초록 · 활성');

  const d2 = await page.evaluate(id => {
    const a = AV[id]; S.dia = a.cost - 1; showCosDetail(id);
    const b = document.getElementById('mLv');
    return { dis: b.disabled, lack: b.classList.contains('lack'), bg: getComputedStyle(b).backgroundImage };
  }, d1.id);
  ok(d2.lack && d2.bg.includes(GRAY_U), '[50 상세 구매] 다이아 부족 → 회색');
  ok(!d2.dis, '[50 상세 구매] 부족이어도 클릭은 살아 있음 («얼마 더 필요» 안내 경로 — 102 두 축 분리)');

  const d3 = await page.evaluate(id => {
    S.avatars[id] = 1; showCosDetail(id);
    const b = document.getElementById('mLv');
    return { dis: b.disabled, bg: getComputedStyle(b).backgroundImage };
  }, d1.id);
  ok(d3.dis && d3.bg.includes(GRAY_U), '[50 상세 구매] 이미 보유 → 회색 · 비활성');

  await page.evaluate(() => { document.getElementById('modal').classList.remove('on', 'sk8'); });

  /* 08 스킬 세부 — 같은 `.sk-u` 가 «강화» 로 쓰인다 */
  const s1 = await page.evaluate(() => {
    const it = SKILLS.find(x => S.own[x.id]) || SKILLS[0];
    if (!S.own[it.id]) S.own[it.id] = { l: 1, n: 0 };
    S.own[it.id].n = 1e12; showItem(it.id);
    const b = document.getElementById('mLv');
    return b ? { id: it.id, dis: b.disabled, bg: getComputedStyle(b).backgroundImage,
                 cls: b.className } : null;
  });
  ok(s1 && !s1.dis && s1.bg.includes(GREEN_U), '[08 스킬 강화] 재료 충분(' + (s1 && s1.id) + ') → 초록 · 활성');

  const s2 = await page.evaluate(id => {
    S.own[id].n = 0; showItem(id);
    const b = document.getElementById('mLv');
    return b ? { dis: b.disabled, bg: getComputedStyle(b).backgroundImage } : null;
  }, s1 && s1.id);
  ok(s2 && s2.dis && s2.bg.includes(GRAY_U), '[08 스킬 강화] 재료 부족 → 회색 · 비활성 (레퍼런스가 찍힌 그 상태)');

  await page.evaluate(() => { document.getElementById('modal').classList.remove('on', 'sk8'); });

  /* ---------------- §5 회귀 ---------------- */
  console.log('\n§5 회귀');
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(400);
  /* 회색 [구매] 도 눌리면 «부족» 안내가 떠야 한다 — 색만 죽이고 길을 막지 않았는지 */
  const notified = await page.evaluate(() => {
    const a = AVATARS.find(x => !S.avatars[x.id] && !x.req);
    S.dia = 0; cosSel = a.id; renderCos();
    const before = !!S.avatars[a.id];
    document.querySelector('#bCos [data-cosbuy]').click();
    /* 안내는 58 공용 모듈의 토스트(`.fx-toast`)로 뜬다 — 못 뜨면 `notify()` 가 «알림» 팝업으로 폴백한다 */
    const toast = document.querySelector('.fx-toast');
    const md = document.getElementById('modal');
    const txt = toast ? toast.textContent : (md && md.classList.contains('on') ? md.textContent : '');
    return { before, after: !!S.avatars[a.id], toastText: txt.replace(/\s+/g, ' ').trim().slice(0, 40) };
  });
  await page.waitForTimeout(250);
  ok(!notified.before && !notified.after, '[회색 구매 클릭] 다이아 0 에서 구매가 «되지 않음»(무단 지급 없음)');
  ok(notified.toastText.length > 0, '[회색 구매 클릭] 안내가 뜸 («' + notified.toastText + '»)');

  /* `.sk-b1/.sk-b2` 의 «자리»(left) 는 상태색과 무관하게 그대로여야 한다 — 레이아웃 점수 보존 */
  /* 03 교훈 — 절대 배치 자식의 기준은 border box 가 아니라 **padding box** 다(시트 테두리 7px).
     화면 좌표로 재면 그 7px 이 얹히므로 `offsetLeft`(= 배치 기준 좌표) 로 본다. */
  const pos = await page.evaluate(() => {
    const w = document.querySelector('#bCos [data-coswear]');
    const b = document.querySelector('#bCos [data-cosbuy]');
    return { wx: w.offsetLeft, bx: b.offsetLeft, ww: w.offsetWidth, bw: b.offsetWidth, wy: w.offsetTop };
  });
  ok(pos.wx === 240 && pos.bx === 551,
    '[레이아웃 보존] 버튼 left = ' + pos.wx + ' / ' + pos.bx + ' (측정치 240 / 551)');
  ok(pos.ww === 275 && pos.bw === 275 && pos.wy === 1158,
    '[레이아웃 보존] 버튼 275x' + ' top ' + pos.wy + ' (측정치 275 wide · top 1158)');

  ok(errs.length === 0, '콘솔·런타임 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\nVERIFY171 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
