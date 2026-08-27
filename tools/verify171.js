/* 작업 171 — «가능한데 회색» 상태색 게이트 (지시서 [3]-(가): 레퍼런스 대조가 아니라 «동작·수치» 검사)
 *
 *   node tools/verify171.js
 *
 * 주인 보고(2026-08-27): «코스튬 구매 가능한데 버튼 회색 — 가독성 나쁨, 가능하면 초록 되든지 해야지».
 * 규칙: **가능 = 활성색(초록) · 불가 = 회색**. 부족값만 빨강(102 관례)이고, 회색이어도 클릭은 살아 있어야
 * «얼마 모자란지» 안내가 뜬다(102 의 «색(.lack/.no)» 과 «입력 차단(disabled)» 두 축 분리).
 *
 * 검사 항목
 *   §1 50 코스튬 시트 [승급전] — 도전 계급 남음/최고 계급 2상태의 «실제 렌더 색»
 *                 (182 — [구매] 4상태는 구매 폐지로 소멸했다. 171 이 확정한 규칙 «가능=초록 ·
 *                  불가=회색» 은 그 자리를 물려받은 [승급전] 버튼이 그대로 지킨다)
 *   §2 50 코스튬 시트 [착용] — 보유·미착용/착용 중/미보유 3상태
 *   §3 07 스킬 · 26 동료 [일괄 강화] — 강화 가능 유무로 초록↔회색 (같은 `.sk-btn` 부품)
 *   §4 08 세부 팝업 `.sk-u` — 50 [구매] 가능/부족/불가 · 08 [강화] 가능/불가
 *   §5 회귀 — 회색이어도 클릭이 살아 있고(안내), 상태가 바뀌면 색이 «실제로» 따라온다 · 콘솔 에러 0
 *   §6 05 무기 팝업 — 전역 감사(`tools/audit171.js`)가 잡은 두 번째 «가능한데 회색»
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

  /* ---------------- §1 50 코스튬 시트 [승급전] ---------------- */
  console.log('\n§1 50 코스튬 시트 [승급전] — 도전할 계급 남음=초록 · 최고 계급=회색');
  await page.evaluate(() => { S.dia = 5e7; S.best = 1; S.rank = 0; S.coll.skill = 0; S.coll.equip = 0; save(); });
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(500);

  /* (0) 182 — [구매] 버튼은 아예 없다(구버전 폐기 = 진입점까지) */
  ok(!(await page.$('#bCos [data-cosbuy]')), '[구매] 버튼이 시트에서 사라짐(182 — 구매 경로 폐기)');

  /* 194 — 시트 2번 칸은 [승급전] → **[강화]** 로 바뀌었다. 171 의 규칙(«지금 눌러서 되면 초록»)은
     그대로이고 «되는가» 의 조건만 바뀐다: 보유 + 만렙 아님 + 강화석 충분. */
  /* (1) 강화석이 충분하다 → 초록 */
  await page.evaluate(() => { S.stone = 1e9; S.cosLv = {}; cosSel = 'av0'; renderCos(); });
  await page.waitForTimeout(150);
  let bg = await face('#bCos [data-cosup]');
  ok(bg && bg.includes(GREEN_SK), '[강화] 강화석 충분 → 초록  (' + (bg || '').slice(0, 46) + '…)');

  /* (2) 강화석이 모자라면 회색 */
  await page.evaluate(() => { S.stone = 0; renderCos(); });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosup]');
  ok(bg && bg.includes(GRAY_SK), '[강화] 강화석 0 → 회색');

  /* (2c) 만렙이면 강화석이 넘쳐도 회색 */
  await page.evaluate(() => { S.stone = 1e9; S.cosLv = { av0: COS_MAXLV }; renderCos(); });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosup]');
  ok(bg && bg.includes(GRAY_SK), '[강화] 만렙(' + 500 + ') → 회색');

  /* (2b) 조건을 되돌리면 «실제로» 초록으로 돌아온다(정적 클래스가 아니라 상태를 본다) */
  await page.evaluate(() => { S.cosLv = {}; renderCos(); });
  await page.waitForTimeout(150);
  bg = await face('#bCos [data-cosup]');
  ok(bg && bg.includes(GREEN_SK), '[강화] 조건 복귀 → 초록으로 전환');

  /* ---------------- §2 50 코스튬 시트 [착용] ---------------- */
  console.log('\n§2 50 코스튬 시트 [착용]');
  const wearable = await page.evaluate(() => {
    const a = AVATARS.find(x => x.id !== 'av0');
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

  /* 182 — 이 자리의 `.sk-u` 는 [구매] 가 아니라 [승급전] 이다(미보유 칸).
     194 — **보유 칸에서는 [강화]** 로 갈린다. 두 갈래를 각각 잰다:
       미보유 → 도전 계급 남음 = 초록·활성 / 최고 계급 = 회색·비활성
       보유   → 강화석 충분 = 초록·활성 / 부족·만렙 = 회색·비활성(`.lack`) */
  const d1 = await page.evaluate(() => {
    const a = AVATARS.find(x => !S.avatars[x.id]);
    S.rank = 0; showCosDetail(a.id);
    const b = document.getElementById('mLv');
    return { id: a.id, dis: b.disabled, txt: b.textContent, bg: getComputedStyle(b).backgroundImage };
  });
  ok(!d1.dis && d1.bg.includes(GREEN_U), '[50 상세 승급전] 미보유 + 도전 계급 남음(' + d1.id + ') → 초록 · 활성');
  ok(d1.txt.indexOf('승급전') >= 0, '[50 상세] 두 번째 버튼 라벨이 «승급전» («' + d1.txt + '»)');

  const d2 = await page.evaluate(id => {
    S.rank = RANKS.length - 1; showCosDetail(id);
    const b = document.getElementById('mLv');
    return { dis: b.disabled, bg: getComputedStyle(b).backgroundImage };
  }, d1.id);
  ok(d2.dis && d2.bg.includes(GRAY_U), '[50 상세 승급전] 최고 계급 → 회색 · 비활성');

  /* 194 — 이미 보유한 코스튬의 상세 2번 버튼은 [승급전] 이 아니라 **[강화]** 다.
     171 규칙 그대로: 강화석이 모자라면 회색·비활성, 충분하면 초록·활성. */
  const d3 = await page.evaluate(id => {
    S.rank = 0; S.avatars[id] = 1; S.stone = 0; S.cosLv = {}; showCosDetail(id);
    const b = document.getElementById('mLv');
    return { dis: b.disabled, txt: b.textContent, bg: getComputedStyle(b).backgroundImage };
  }, d1.id);
  ok(d3.dis && d3.bg.includes(GRAY_U), '[50 상세 강화] 보유 + 강화석 0 → 회색 · 비활성');
  ok(d3.txt.indexOf('강화') >= 0, '[50 상세] 보유 칸의 두 번째 버튼 라벨이 «강화» («' + d3.txt + '»)');

  const d4 = await page.evaluate(id => {
    S.stone = 1e9; showCosDetail(id);
    const b = document.getElementById('mLv');
    return { dis: b.disabled, bg: getComputedStyle(b).backgroundImage };
  }, d1.id);
  ok(!d4.dis && d4.bg.includes(GREEN_U), '[50 상세 강화] 보유 + 강화석 충분 → 초록 · 활성');

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
  /* 182 — 옛 «회색 [구매] 를 눌러도 안내가 뜬다» 자리. 구매가 사라져 그 회귀는 없어졌고,
     같은 두 축(색 ≠ 입력 차단)을 [착용] 이 물려받았다: 미보유 코스튬을 «착용» 하려 하면
     회색이어도 클릭이 살아 있고 «승급전에서 획득해야 착용합니다» 안내가 떠야 한다. */
  const notified = await page.evaluate(() => {
    const a = AVATARS.find(x => !S.avatars[x.id]);
    cosSel = a.id; renderCos();
    const before = S.avatar;
    document.querySelector('#bCos [data-coswear]').click();
    /* 안내는 58 공용 모듈의 토스트(`.fx-toast`)로 뜬다 — 못 뜨면 `notify()` 가 «알림» 팝업으로 폴백한다 */
    const toast = document.querySelector('.fx-toast');
    const md = document.getElementById('modal');
    const txt = toast ? toast.textContent : (md && md.classList.contains('on') ? md.textContent : '');
    return { before, after: S.avatar, toastText: txt.replace(/\s+/g, ' ').trim().slice(0, 40) };
  });
  await page.waitForTimeout(250);
  ok(notified.before === notified.after, '[회색 착용 클릭] 미보유 코스튬이 «착용되지 않음»(무단 지급 없음)');
  ok(notified.toastText.length > 0, '[회색 착용 클릭] 안내가 뜸 («' + notified.toastText + '»)');

  /* `.sk-b1/.sk-b2` 의 «자리»(left) 는 상태색과 무관하게 그대로여야 한다 — 레이아웃 점수 보존 */
  /* 03 교훈 — 절대 배치 자식의 기준은 border box 가 아니라 **padding box** 다(시트 테두리 7px).
     화면 좌표로 재면 그 7px 이 얹히므로 `offsetLeft`(= 배치 기준 좌표) 로 본다. */
  const pos = await page.evaluate(() => {
    const w = document.querySelector('#bCos [data-coswear]');
    const b = document.querySelector('#bCos [data-cosup]');   /* 194 — 2번 칸이 [강화] */
    return { wx: w.offsetLeft, bx: b.offsetLeft, ww: w.offsetWidth, bw: b.offsetWidth, wy: w.offsetTop };
  });
  ok(pos.wx === 240 && pos.bx === 551,
    '[레이아웃 보존] 버튼 left = ' + pos.wx + ' / ' + pos.bx + ' (측정치 240 / 551)');
  ok(pos.ww === 275 && pos.bw === 275 && pos.wy === 1158,
    '[레이아웃 보존] 버튼 275x' + ' top ' + pos.wy + ' (측정치 275 wide · top 1158)');

  /* ---------------- §6 05 무기 팝업 ---------------- */
  console.log('\n§6 05 무기 팝업 [장착]·[일괄 강화] (전역 감사가 잡은 두 번째 건)');
  /* 202 (주인 확정 2026-08-27) — «장착 버튼은 초록». 171 이 세운 «장착=청록» 은 08 `.sk-e` 와
     짝을 맞춘 171 자체 판단이었고 레퍼런스 근거가 없었다(05 ref 는 두 버튼 다 회색 면).
     기대값을 청록 → 초록으로 옮긴다. `CYAN_W` 는 지우지 않고 **음성항**으로 남긴다 —
     되돌리면 그 자리에서 빨개진다(LESSONS 185-④ «이사», 219 N3·N4 관례). */
  const CYAN_W  = 'rgb(68, 218, 239)';    /* 202 이전 `.wm-b1:not(.off)` 값(#44DAEF) — 이제 나오면 안 된다 */
  const GREEN_W = 'rgb(143, 220, 51)';    /* .wm-b2:not(.off)·202 이후 `.wm-b1:not(.off)` 활성(#8FDC33) */
  const GRAY_W  = 'rgb(168, 168, 168)';   /* .wm-btn 회색(#A8A8A8) */

  const w1 = await page.evaluate(() => {
    S.gold = 1e18; EQUIPS.forEach(it => { S.own[it.id] = { l: 1, n: 1e12 }; });
    markDirty(); uiDirty = true; goTab('hero'); openWeapon(null, 'weapon');
    const eq = document.getElementById('wpnBtnEq'), up = document.getElementById('wpnBtnUp');
    return { n: EQUIPS.filter(canLevel).length,
             upTxt: up.textContent.trim(), upOff: up.classList.contains('off'),
             upBg: getComputedStyle(up).backgroundImage,
             eqOff: eq.classList.contains('off'), eqBg: getComputedStyle(eq).backgroundImage };
  });
  await page.waitForTimeout(200);
  ok(!w1.upOff && w1.upBg.includes(GREEN_W),
    '[05 일괄 강화] 강화 가능 ' + w1.n + '개(«' + w1.upTxt + '») → 초록');
  ok(w1.eqOff ? w1.eqBg.includes(GRAY_W) : w1.eqBg.includes(GREEN_W),
    '[05 장착] ' + (w1.eqOff ? '장착 중/미보유 → 회색' : '장착 가능 → 초록') + ' (202)');
  ok(!w1.eqBg.includes(CYAN_W),
    '[05 장착] 202 이전 청록(#44DAEF)이 한 곳도 안 남음 (되돌림 감지 음성항)');

  const w2 = await page.evaluate(() => {
    EQUIPS.forEach(it => { if (S.own[it.id]) S.own[it.id].n = 0; });
    renderWpn();
    const up = document.getElementById('wpnBtnUp');
    return { off: up.classList.contains('off'), bg: getComputedStyle(up).backgroundImage,
             txt: up.textContent.trim(), n: EQUIPS.filter(canLevel).length };
  });
  await page.waitForTimeout(200);
  ok(w2.n === 0 && w2.off && w2.bg.includes(GRAY_W),
    '[05 일괄 강화] 강화 가능 0개(«' + w2.txt + '») → 회색 (레퍼런스가 찍힌 그 상태)');

  /* 05 의 ①~④ 는 색만 바꿨으니 그대로여야 한다 — 버튼 자리·크기 재확인 */
  const wpos = await page.evaluate(() => {
    const a = document.getElementById('wpnBtnEq'), b = document.getElementById('wpnBtnUp');
    return { ax: a.offsetLeft, bx: b.offsetLeft, ay: a.offsetTop, aw: a.offsetWidth, ah: a.offsetHeight };
  });
  ok(wpos.ax === 137 && wpos.bx === 447 && wpos.ay === 1184 && wpos.aw === 274 && wpos.ah === 131,
    '[05 레이아웃 보존] 버튼 ' + wpos.aw + 'x' + wpos.ah + ' @ ' + wpos.ax + '/' + wpos.bx
    + ' top ' + wpos.ay + ' (측정치 274x131 · 137/447 · 1184)');

  ok(errs.length === 0, '콘솔·런타임 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\nVERIFY171 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
