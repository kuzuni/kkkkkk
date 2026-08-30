/* 547 재현 — «우편을 수령해도 열려 있는 13 재화 탭이 안 따라온다» 를 제품에게 직접 묻는다
   (338 규칙 — 등재문의 처방을 따르기 전에 재현부터).

   묻는 것 넷:
     [1] 결손 — 재화 탭을 연 채 `claimAllMail()` 을 부르면 `S.mileage` 는 오르는데
         `.cn-ml` 은 `off` 이고 `#cnExch` 가 없는가. 강제 재렌더로 «값은 옳고 그림만 낡았다» 를 가른다.
     [2] 사용자 경로 — 스크립트가 아니라 실제 버튼(▦ 우편함 → [일괄 읽기&수령] → 닫기)으로도 같은가.
     [3] 넓이(등재문 ⓑ) — 상점 3탭(소환·재화·이용권) 각각에서 «수령 뒤 DOM» 과 «강제 재렌더 뒤 DOM»
         을 문자열로 대조해 **어느 탭이 낡는지 센다.** 마일리지 하나만 고치면 재발할 자리를 미리 본다.
     [4] 대가 — 재렌더가 122 쥬시 위상을 처음부터 다시 시작시키는가(`--jz-k` 값 · 진행 중 애니 시각).

   실행: node tools/probe547.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const MILE = 10;                 /* MILE_NEED — 교환 문턱 */
const rows = [], fails = [];
const ok = (t, d) => rows.push(['✓', t, d || '']);
const bad = (t, d) => { rows.push(['✗', t, d || '']); fails.push(t + ' — ' + d); };
const eq = (t, got, want) => String(got) === String(want) ? ok(t, String(got))
                                                          : bad(t, '실측 ' + got + ' / 기대 ' + want);

/* 재화 탭 마일리지 패널의 «보이는 상태» 한 벌 */
const mlState = page => page.evaluate(() => {
  const p = document.getElementById('cnMile');
  const bar = p && p.querySelector('.bar>s');
  return { mil: S.mileage | 0,
           node: !!p,
           off: !!(p && p.classList.contains('off')),
           exch: !!document.getElementById('cnExch'),
           ct: p ? (p.querySelector('.ct') || {}).textContent : '',
           barW: bar ? Math.round(bar.getBoundingClientRect().width) : -1 };
});
const openCoin = async page => {
  await page.click('.tab[data-t="shop"]', { force: true });
  await page.waitForTimeout(250);
  await page.$eval('#shopCats .stab[data-cat="coin"]', el => el.click());
  await page.waitForTimeout(250);
};
/* ⚠ 세이브는 localStorage 라 `goto`·`reload` 로는 못 지운다 — 떠나는 페이지의
   `beforeunload → save()` 가 방금 지운 키를 되살린다(LESSONS 363-①). 절마다 **새 컨텍스트**를
   연다: 그래야 «쿠폰 n개» 가 앞 절의 잔고와 안 섞인다(1회차에 11 이 22 로 읽혔다). */
let ctxN = null;
const fresh = async browser => {
  if(ctxN) await ctxN.close();
  ctxN = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctxN.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);
  return page;
};
/* 등재문의 «쿠폰 11개» 를 만든다 — d4(마일리지 +1) 1통 + d5(+2) 5통 */
const buyPacks = page => page.evaluate(() => {
  window.devBuyDia('d4');
  for(let i = 0; i < 5; i++) window.devBuyDia('d5');
});

(async () => {
  const browser = await launch(chromium);
  let page = await fresh(browser);
  await openCoin(page);

  /* ---------- [1] 결손 (스크립트 경로) ---------- */
  const a0 = await mlState(page);
  eq('1-a 부팅 직후 마일리지 0 · 패널 off', a0.mil + '/' + a0.off + '/' + a0.exch, '0/true/false');
  await buyPacks(page);
  await page.waitForTimeout(300);
  const a1 = await mlState(page);
  eq('1-b 우편 3통 발송만으로는 마일리지 0 (153)', a1.mil, 0);
  await page.evaluate(() => claimAllMail());
  await page.waitForTimeout(500);          /* renderUI 주기 0.35s 를 넘겨 준다 */
  const a2 = await mlState(page);
  ok('1-c 수령 뒤 S.mileage', String(a2.mil));
  eq('1-d 교환 조건(≥10) 충족 — 등재문의 «쿠폰 11개»', a2.mil, 11);
  /* ★ 결손 자체 — 값은 올랐는데 그림이 낡았는가 */
  ok('1-e 수령 직후 화면', 'off=' + a2.off + ' · #cnExch=' + a2.exch + ' · ct="' + a2.ct + '" · bar ' + a2.barW + 'px');
  /* 강제 재렌더 — 같은 상태로 다시 그리면 무엇이 나오는지 */
  await page.evaluate(() => renderCoinPage(document.getElementById('shopList')));
  await page.waitForTimeout(200);
  const a3 = await mlState(page);
  ok('1-f 강제 재렌더 뒤', 'off=' + a3.off + ' · #cnExch=' + a3.exch + ' · ct="' + a3.ct + '" · bar ' + a3.barW + 'px');
  /* 이 항은 «맞다/틀리다» 가 아니라 **어느 쪽인지 적는** 자리다 —
     수리 전(2026-08-30)에는 «≠ 낡는다», 수리 후에는 «= 따라온다» 가 찍힌다.
     실패로 세면 수리하는 순간 이 재현기가 빨개져 대조 실행에 못 쓴다(338 규칙). */
  const stale1 = (a2.off !== a3.off || a2.exch !== a3.exch || a2.ct !== a3.ct || a2.barW !== a3.barW);
  ok('1-g ⇒ 수령 직후 vs 재렌더 뒤', stale1
       ? '≠ — 값은 옳고 «그림만» 낡는다(결손 재현)'
       : '= — 수령이 곧바로 화면에 온다(수리 후)');

  /* ---------- [2] 사용자 경로 (▦ 우편함 → [일괄 읽기&수령] → 닫기) ---------- */
  page = await fresh(browser);
  await openCoin(page);
  await buyPacks(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => openMail());
  await page.waitForTimeout(300);
  const btn = await page.evaluate(() => {
    const b = document.getElementById('mailBtn');
    return b ? { has:true, dis:b.disabled } : { has:false };
  });
  eq('2-a 우편함 [일괄 읽기&수령] 활성', btn.has + '/' + btn.dis, 'true/false');
  await page.$eval('#mailBtn', el => el.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(600);
  const b1 = await mlState(page);
  ok('2-b 닫은 뒤 재화 탭', 'mil=' + b1.mil + ' · off=' + b1.off + ' · #cnExch=' + b1.exch
     + ' · ct="' + b1.ct + '" · bar ' + b1.barW + 'px');
  ok('2-c ⇒ 사용자 경로', b1.mil >= MILE && (b1.off || !b1.exch)
       ? '재현 — 쿠폰 ' + b1.mil + '개인데 패널은 비활성'
       : '따라온다 — 쿠폰 ' + b1.mil + '개 · 패널 활성 · ct "' + b1.ct + '"');

  /* ---------- [3] 넓이 — 상점 3탭 중 어느 탭이 낡는가 ---------- */
  /* 각 탭에서: 수령 직후 innerHTML(A) ↔ 강제 재렌더 뒤 innerHTML(B). A≠B 면 그 탭이 낡은 것이다. */
  const cats = ['summon', 'coin', 'pass'];
  const wide = [];
  for(const cat of cats){
    page = await fresh(browser);
    await page.click('.tab[data-t="shop"]', { force: true });
    await page.waitForTimeout(250);
    await page.$eval('#shopCats .stab[data-cat="' + cat + '"]', el => el.click());
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      window.devBuyDia('d4');
      for(let i = 0; i < 5; i++) window.devBuyDia('d5');
      claimAllMail();
      const list = document.getElementById('shopList');
      const A = list.innerHTML;
      renderShopPage();
      const B = list.innerHTML;
      /* 다른 점을 «노드 이름» 으로 요약 — 문자열 diff 는 길어서 못 읽는다 */
      const norm = s => s.replace(/--jz-k:[^;"']*/g, '--jz-k:_');
      return { same: A === B, sameNoJz: norm(A) === norm(B), lenA: A.length, lenB: B.length,
               mil: S.mileage | 0, gold: Math.round(S.gold), dia: S.dia, relic: S.relic | 0 };
    });
    wide.push({ cat, ...r });
    ok('3-' + cat, (r.same ? '따라온다(같다)' : '낡는다(다르다)')
       + ' · --jz-k 무시하면 ' + (r.sameNoJz ? '같다' : '다르다')
       + ' · len ' + r.lenA + '→' + r.lenB);
  }
  const stale = wide.filter(w => !w.sameNoJz).map(w => w.cat);
  ok('3-계', '낡는 탭 ' + stale.length + '/3' + (stale.length ? ' — ' + stale.join(', ') : ''));

  /* ---------- [4] 대가 — 재렌더가 122 쥬시 위상을 되감는가 ---------- */
  page = await fresh(browser);
  await openCoin(page);
  await page.waitForTimeout(1500);         /* 애니가 충분히 진행되게 둔다 */
  const jz = await page.evaluate(() => {
    /* 애니는 카드 자신이 아니라 자손(.bg·.hd·em …)에 붙는다 — 문서 전체에서 리스트 안 것만 고른다 */
    const pick = () => {
      const list = document.getElementById('shopList');
      const cds = [...list.querySelectorAll('.cn-cd')].slice(0, 3);
      const anims = document.getAnimations();
      return cds.map(e => {
        const ts = anims.filter(a => a.effect && a.effect.target && e.contains(a.effect.target))
                        .map(a => Number(a.currentTime) || 0);
        return { k: e.style.getPropertyValue('--jz-k').trim(), n: ts.length,
                 t: Math.round(ts.length ? Math.max(...ts) : -1) };
      });
    };
    const before = pick();
    renderCoinPage(document.getElementById('shopList'));
    const after = pick();
    return { before, after };
  });
  ok('4-a 재렌더 전 --jz-k / 진행 시각', jz.before.map(x => x.k + '@' + x.t + 'ms').join(' · '));
  ok('4-b 재렌더 후 --jz-k / 진행 시각', jz.after.map(x => x.k + '@' + x.t + 'ms').join(' · '));
  const kSame = JSON.stringify(jz.before.map(x => x.k)) === JSON.stringify(jz.after.map(x => x.k));
  eq('4-c --jz-k(칸별 위상 오프셋)는 재렌더에도 같다', kSame, true);
  ok('4-d 진행 시각(ms) — 재렌더 전 → 후 = 깜빡임 대가',
     jz.before.map(x => x.t + '(' + x.n + '개)').join(' / ') + '  →  '
     + jz.after.map(x => x.t + '(' + x.n + '개)').join(' / '));

  await browser.close();
  const w1 = Math.max(...rows.map(r => r[1].length));
  rows.forEach(r => console.log(r[0] + ' ' + r[1].padEnd(w1) + '  ' + r[2]));
  console.log(fails.length ? '\nPROBE547 FAIL — ' + fails.length + '건\n' + fails.join('\n')
                           : '\nPROBE547 PASS — ' + rows.length + '항목');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
