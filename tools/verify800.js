#!/usr/bin/env node
/* 800 검증 — «도감 완성» 소환 차단이 사라졌다.
 *
 *   node tools/verify800.js
 *
 * 주인 지시(2026-09-02): «스킬 환급 만들었으니까 뽑는거 막지마봐 도감완성으로».
 *   757(만렙 잉여 조각 환급)이 «만렙 뒤의 조각은 쓸 데가 없다» 는 전제를 없앴으므로,
 *   그 전제 위에 서 있던 차단(`allMaxed(B.list)` → 토스트 «재료를 환불하세요»)도 같이 없앤다.
 *   ⚠ 720(«스킬 Lock 기준을 도감 완성 → 최대치 달성») 은 이 지시가 **덮는다** — 기준을 바꾸는
 *     것이 아니라 잠금 자체가 없다.
 *
 * 검사 항목:
 *   [A] 유료 소환 — 배너가 전부 만렙이어도 실제로 뽑힌다(S.summons 증가 · 다이아 차감)
 *   [B] 무료 소환 — 만렙이어도 «무료» 다(무료 횟수만 줄고 다이아는 안 준다 — 옛 우회가 유료로 떨어뜨렸다)
 *   [C] 차단 토스트가 안 뜬다 — «재료를 환불하세요» 문구가 제품에서 사라졌다
 *   [D] 상점 카드 잠금 딤 부재 — `.clk` 노드도, 그 CSS 선언도 없다
 *   [E] 되돌림 감시 — `allMaxed` 를 보고 되돌아가는 분기가 소환 경로에 없다
 *   [F] 전제 보존 — 757 조각 환급 경로는 그대로 산다(차단을 없앤 근거이므로 같이 지킨다)
 *   [G] 콘솔·페이지 에러 0
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (m, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + m + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + m + (detail ? '  — ' + detail : '')); }
};
const eq = (m, got, want) => ok(m + ' = ' + JSON.stringify(got) + (got === want ? '' : ' (기대 ' + JSON.stringify(want) + ')'), got === want);

function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}

/* 배너를 통째로 만렙으로 만든다 — «도감 완성» 이 참인 상태가 이 게이트의 무대다 */
const maxBanner = (page, b) => page.evaluate(bk => {
  step = () => {};
  S.autoBuy = false;
  BANNERS[bk].list.forEach(it => { S.own[it.id] = { n: 0, l: maxLv(it) === Infinity ? 100 : maxLv(it) }; });
  S.dia = 1e9; S.relic = 1e9;
  S.guide.idx = GUIDE.length;                 /* 73 ③ 가이드 소환 차단은 이 게이트의 대상이 아니다 */
  save();
  return allMaxed(BANNERS[bk].list);
}, b);

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--no-sandbox'] }, launchOpts()));
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward(); });

  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  /* ⚠ 소스 단언은 **주석을 걷어낸 뒤** 한다 — 이 저장소는 «무엇을 왜 지웠는가» 를 주석으로 남기는
     규약이라(800 주석도 지운 토스트 문구·지운 분기를 그대로 인용한다) 원문에 대고 «그 낱말이
     없다» 를 물으면 «이력을 적었다» 는 이유로 빨개진다. 코드에서 살아 있는지만 본다. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ');

  /* ---- [A] 유료 소환 ---- */
  console.log('[A] 유료 소환 — 배너가 전부 만렙이어도 실제로 뽑힌다');
  /* ⚠ 무대가 되는 배너는 **스킬·펫뿐**이다 — 740 이후 불멸 «장비» 는 무한 강화(`maxLv` = Infinity)라
     `atMax` 가 영원히 거짓이고, 따라서 `allMaxed` 도 장비 배너에서는 구조적으로 참이 될 수 없다.
     그래도 세 배너를 다 굴리는 이유는 «차단이 없다» 가 배너를 안 가린다는 것까지 보기 위해서다. */
  const STAGE = { skill: true, pet: true, weapon: false };
  for (const b of ['skill', 'pet', 'weapon']) {
    const maxed = await maxBanner(page, b);
    eq('  ' + b + ' 배너의 «도감 완성»(allMaxed) 상태', maxed, STAGE[b]);
    const r = await page.evaluate(bk => {
      const s0 = S.summons, d0 = S.dia, cost = summonCost(bk, 10);
      doSummon(bk, 10);
      return { got: S.summons - s0, paid: d0 - S.dia, cost };
    }, b);
    eq('  ' + b + ' — 10연이 실제로 굴러갔다', r.got, 10);
    eq('  ' + b + ' — 정가만큼 차감됐다',      r.paid, r.cost);
  }

  /* ---- [B] 무료 소환은 무료다 ---- */
  console.log('[B] 무료 소환 — 만렙이어도 무료다(옛 우회는 유료 소환으로 떨어뜨렸다)');
  await maxBanner(page, 'skill');
  const fr = await page.evaluate(() => {
    S.shopFree = S.shopFree || {};
    /* 무료 재고를 확실히 만든 뒤 «상점 무료 버튼» 경로 그대로 밟는다 */
    const left0 = freeLeft('skill');
    const d0 = S.dia, s0 = S.summons;
    if (left0 <= 0) return { skip: true };
    useFreeSum('skill');
    doSummonFree('skill', 10);
    return { skip: false, got: S.summons - s0, paid: d0 - S.dia, left0, left1: freeLeft('skill') };
  });
  if (fr.skip) ok('  무료 재고가 없어 이 절은 건너뛴다(무대 없음)', false, '무료 재고 0 — 게이트 무대 실패');
  else {
    eq('  무료 10연이 굴러갔다', fr.got, 10);
    eq('  다이아는 한 톨도 안 나갔다', fr.paid, 0);
    eq('  무료 횟수만 줄었다', fr.left0 - fr.left1, 1);
  }

  /* ---- [C] 차단 토스트 부재 ---- */
  console.log('[C] 차단 토스트 — «재료를 환불하세요» 가 제품에서 사라졌다');
  ok('  코드에 «도감 완성 — 재료를 환불하세요» 토스트가 없다',
     !/재료를 환불하세요/.test(code));
  await maxBanner(page, 'skill');
  const toast = await page.evaluate(() => {
    doSummon('skill', 10);
    return document.body.innerText;
  });
  ok('  만렙 배너에서 10연을 굴려도 그 토스트가 안 뜬다', !/재료를 환불/.test(toast));

  /* ---- [D] 상점 카드 잠금 딤 부재 ---- */
  console.log('[D] 상점 카드 — «도감 완성 🏆» 잠금 딤이 없다');
  const shop = await page.evaluate(() => {
    /* 다섯 배너를 전부 만렙으로 만들고 상점 소환 탭을 그린다 */
    Object.keys(BANNERS).forEach(bk => BANNERS[bk].list.forEach(it => {
      S.own[it.id] = { n: 0, l: maxLv(it) === Infinity ? 100 : maxLv(it) }; }));
    save();
    goTab('shop'); shopCat = 'summon'; renderShopPage();
    return { cards: document.querySelectorAll('#shopList .shp-card').length,
             locks: document.querySelectorAll('#shopList .clk').length,
             txt: ($('shopList').textContent.match(/도감 완성/g) || []).length };
  });
  ok('  소환 카드가 그려졌다(무대 확인)', shop.cards > 0, '카드 ' + shop.cards);
  eq('  잠금 딤 노드 수', shop.locks, 0);
  eq('  «도감 완성» 글자 수', shop.txt, 0);
  ok('  `.shp-card .clk` CSS 선언도 없다', !/\.shp-card\s+\.clk\{/.test(src));

  /* ---- [E] 되돌림 감시 ---- */
  console.log('[E] 되돌림 감시 — 소환 경로에 `allMaxed` 분기가 없다');
  const paths = ['function doSummon\\(b, times\\)', 'function doSummonFree\\(b, times, viaReward\\)'];
  paths.forEach(sig => {
    const m = new RegExp(sig + '\\{[\\s\\S]{0,1600}?\\n\\}').exec(code);
    ok('  ' + sig.replace(/\\/g, '') + ' 안에 allMaxed 가 없다',
       !!m && !/allMaxed/.test(m[0]), m ? '' : '함수 본문을 못 찾았다');
  });
  ok('  «만렙이면 유료로 떨어뜨린다» 우회가 없다',
     !/allMaxed\([^)]*\)\)\s*\{\s*doSummon\(/.test(code));
  ok('  소환 경로 밖에서도 `allMaxed` 를 «막는 데» 쓰는 곳이 없다 — 남은 호출은 선언 한 줄뿐',
     (code.match(/allMaxed/g) || []).length === 1,
     '출현 ' + (code.match(/allMaxed/g) || []).length + '회');

  /* ---- [F] 전제 보존 — 757 환급 ---- */
  console.log('[F] 전제 보존 — 757 조각 환급 경로는 그대로 산다');
  const rf = await page.evaluate(() => {
    BANNERS.skill.list.forEach(it => { S.own[it.id] = { n: 0, l: maxLv(it) }; });
    S.own[BANNERS.skill.list[0].id].n = 100;
    S.dia = 0;
    const amt = refundAmount(BANNERS.skill.list), unit = summonCost('skill', 1);
    const got = doRefund('skill');
    return { amt, unit, got, dia: S.dia, left: frag(BANNERS.skill.list[0].id) };
  });
  eq('  조각 100개 × 소환 1회 단가 = 환급액', rf.amt, rf.unit * 100);
  eq('  실제 지급',   rf.got, rf.amt);
  eq('  다이아 반영', rf.dia, rf.amt);
  eq('  조각이 비었다', rf.left, 0);

  /* ---- [G] 에러 0 ---- */
  console.log('[G] 콘솔·페이지 에러');
  ok('  에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY800  ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
