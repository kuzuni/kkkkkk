/* 작업 547 게이트 — «우편을 수령하면 열려 있는 상점 시트가 그 자리에서 따라온다»
 *
 *   node tools/verify547.js   → 마지막 줄이 `VERIFY547 PASS n/n` 이어야 한다.
 *
 * 등재문(2026-08-30, sess-2101-22342 워커 D 곁다리 관측): 13 재화 탭을 연 채 우편을 수령하면
 * `S.mileage = 11` 인데 `.cn-ml` 은 `off` 이고 `#cnExch`(활성 [교환])가 없다 — 값은 옳고 그림만 낡는다.
 * 사용자 경로 «▦ 메뉴 → 우편함 → 수령 → 닫기» 는 재화 탭이 열린 채로 끝나므로 실제로 도달한다.
 * 재현·수리 전후 대조는 `tools/probe547.js`(수리 전 1-e `off=true·ct "0 / 10"·bar 0px`).
 *
 * 이 자가 묻는 것:
 *   [전제] 153 규약 — 구매는 우편으로만 나가고 마일리지는 «수령» 으로만 오른다(그래야 [A] 가 뜻을 갖는다)
 *   [A] 일괄 수령 — `claimAllMail()` 직후 패널이 이미 맞다 · 강제 재렌더 뒤와 **한 글자도 안 다르다**
 *   [B] 개별 수령 — `claimMail(id)` 도 같다(일괄만 고치면 행 [받기] 에서 재발한다)
 *   [C] 사용자 경로 — 우편함 [일괄 읽기&수령] 클릭 → **닫기 전에** 이미 아래 시트가 맞다
 *   [D] 판정은 한 곳 — 시트 판정은 `reShopIfOpen()` 하나 · 재화 탭 조건(`shopCat === 'coin'`)을
 *       부르는 쪽에 다시 적지 않는다 · **시트가 닫혀 있으면 한 번도 안 그린다**(쓸데없는 재렌더 0)
 *   [E] 넓이 — 소환·이용권 탭을 연 채 받아도 낡지 않는다(등재문 ⓑ «마일리지만 고치면 재발»)
 *   [R] 되돌림 — `reShopIfOpen()` 두 줄을 뺀 사본에서 [A]·[C] 가 **실제로 빨개진다**
 *
 * ⚑ 334 처방 — 되돌림 사본이 초록이면 이 자는 아무것도 안 묻는 것이다.
 * ⚑ 328 교훈 — «패널이 활성인가» 만 물으면 렌더를 통째로 지워도 초록일 수 있다(노드가 없으면 `.off` 도 없다).
 *   그래서 [A] 는 **존재(#cnMile)·클래스·문구·게이지 폭 네 가지를 같이** 묻고, 기준을 «강제 재렌더 뒤» 로 잡는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 * LESSONS 363-① — 세이브는 `reload` 로 못 지운다(beforeunload → save). 절마다 **새 컨텍스트**를 연다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRCP = path.join(ROOT, 'index.html');
const TMP = path.join(ROOT, `.verify547.tmp-${process.pid}.html`);
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m + (d !== undefined && d !== '' ? '  — ' + d : '')); };
const note = (m, d) => console.log('  ·  ' + m + (d !== undefined ? '  — ' + d : ''));
const blk = t => console.log('\n' + t);
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

async function open(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof claimAllMail === 'function'
                                && typeof renderShopPage === 'function');
  await page.waitForTimeout(700);
  /* 유휴 루프가 재화를 굴려 증분 비교를 망친다(verify513·verify70 과 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; S.autoBuy = false; });
  return page;
}

/* 상점 탭 열기 — 시트를 열고 카테고리를 고른다(`openShopPage` 는 열 때 탭을 강제로 되돌린다) */
const openCat = (page, cat) => ev(page, c => { openShopPage(null, c); }, cat);

/* «지금 보이는 마일리지 패널» 한 벌 + 강제 재렌더 뒤 같은 것 — 둘이 같아야 «따라온 것» 이다 */
const PANEL = () => {
  const read = () => {
    const p = document.getElementById('cnMile');
    const bar = p && p.querySelector('.bar>s');
    return { node: !!p,
             off: !!(p && p.classList.contains('off')),
             exch: !!document.getElementById('cnExch'),
             ct: p ? (p.querySelector('.ct') || {}).textContent.trim() : '',
             barW: bar ? Math.round(bar.getBoundingClientRect().width) : -1 };
  };
  const now = read();
  renderShopPage();                     /* 기준 — 같은 상태를 «지금» 그리면 무엇이 나오는가 */
  const ref = read();
  return { now, ref, mil: S.mileage | 0 };
};
const same = (a, b) => a && b && a.node === b.node && a.off === b.off && a.exch === b.exch
                    && a.ct === b.ct && a.barW === b.barW;
const show = s => s ? ('node=' + s.node + ' off=' + s.off + ' #cnExch=' + s.exch
                       + ' ct="' + s.ct + '" bar ' + s.barW + 'px') : '(없음)';
/* 등재문의 «쿠폰 11개» — d4(+1) 1통 + d5(+2) 5통.
   ⚑ **697(2026-09-02) 이관** — 구매는 더는 우편을 만들지 않는다(즉시 지급). 547 이 지키는 축은
   «구매» 가 아니라 **«우편을 수령하면 열려 있는 시트가 그 자리에서 따라온다»** 이므로, 표본을
   «사서 만든 통» 에서 **«옛 세이브에 남아 있는 미수령 통»** 으로 옮긴다(주인 «소급 삭제 금지» 가
   지키라고 한 바로 그 통이고, 그 위에서 수령 경로가 그대로 돈다). 통수·쿠폰 수는 그대로 11개다. */
const BUY11 = () => {
  const mk = m => window.sendMail({ t:'🛒 옛 상점 지급분', m:m, src:'shop', b:'697 이전 발송분' });
  mk(1); for(let i = 0; i < 5; i++) mk(2);
};

(async () => {
  const src = fs.readFileSync(SRCP, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */
  const browser = await launch(chromium);

  /* ── [전제] 153 규약 ────────────────────────────────────────── */
  blk('[전제] 697 — 구매는 그 자리에서 오르고, 옛 우편은 수령으로 오른다');
  let page = await open(browser, 'file://' + SRCP);
  await openCat(page, 'coin');
  const pre = await ev(page, () => {
    const m0 = S.mileage | 0;
    window.devBuyDia('d4');                 /* 697 — 구매가 곧 지급이다 */
    const m1 = S.mileage | 0;
    /* 옛 세이브의 미수령 통 — 이쪽은 여전히 «수령» 으로만 오른다(547 이 지키는 경로) */
    const m = window.sendMail({ t:'🛒 옛 상점 지급분', m:1, src:'shop', b:'697 이전 발송분' });
    const m2 = S.mileage | 0;
    claimMail(m.id);
    return { m0, m1, m2, m3: S.mileage | 0 };
  });
  if(pre){
    ok(pre.m0 === 0 && pre.m1 === 1, '[전제-a] 697 — 구매가 그 자리에서 쿠폰을 올린다', pre.m0 + ' → ' + pre.m1);
    ok(pre.m2 === pre.m1, '[전제-a2] 옛 통이 생기는 것만으로는 안 오른다', pre.m1 + ' → ' + pre.m2);
    ok(pre.m3 === pre.m2 + 1, '[전제-b] 그 통을 수령해야 오른다', pre.m2 + ' → ' + pre.m3);
  } else ok(false, '[전제] 못 읽었다');

  /* ── [A] 일괄 수령 ──────────────────────────────────────────── */
  blk('[A] `claimAllMail()` 직후 — 재화 탭이 그 자리에서 따라온다');
  page = await open(browser, 'file://' + SRCP);
  await openCat(page, 'coin');
  const A1 = await ev(page, buyFn => {
    eval(buyFn);                        /* BUY11 을 페이지 안에서 돌린다 */
    const before = (() => {
      const p = document.getElementById('cnMile');
      return { off: !!(p && p.classList.contains('off')), exch: !!document.getElementById('cnExch') };
    })();
    claimAllMail();
    const p = document.getElementById('cnMile');
    const bar = p && p.querySelector('.bar>s');
    const now = { node: !!p, off: !!(p && p.classList.contains('off')),
                  exch: !!document.getElementById('cnExch'),
                  ct: p ? (p.querySelector('.ct') || {}).textContent.trim() : '',
                  barW: bar ? Math.round(bar.getBoundingClientRect().width) : -1 };
    renderShopPage();
    const p2 = document.getElementById('cnMile'), bar2 = p2 && p2.querySelector('.bar>s');
    const ref = { node: !!p2, off: !!(p2 && p2.classList.contains('off')),
                  exch: !!document.getElementById('cnExch'),
                  ct: p2 ? (p2.querySelector('.ct') || {}).textContent.trim() : '',
                  barW: bar2 ? Math.round(bar2.getBoundingClientRect().width) : -1 };
    return { before, now, ref, mil: S.mileage | 0 };
  }, '(' + BUY11.toString() + ')()');
  if(A1){
    ok(A1.mil === 11, '[A-a] [전제] 쿠폰 11개를 수령했다', A1.mil + '개');
    ok(A1.before.off === true && A1.before.exch === false,
       '[A-b] [전제] 수령 전에는 잠긴 패널이다(자가 «항상 초록» 이 아니다)',
       'off=' + A1.before.off + ' · #cnExch=' + A1.before.exch);
    ok(A1.now.node === true, '[A-c] 패널 노드가 그대로 있다(렌더를 통째로 지운 게 아니다)');
    ok(A1.now.off === false, '[A-d] 수령 직후 `.cn-ml.off` 가 벗겨진다', show(A1.now));
    ok(A1.now.exch === true, '[A-e] 수령 직후 활성 [교환](`#cnExch`)이 있다');
    ok(A1.now.ct === '11 / 10', '[A-f] 수령 직후 «11 / 10»', A1.now.ct);
    ok(A1.now.barW > 0, '[A-g] 진행바가 0px 이 아니다', A1.now.barW + 'px');
    ok(same(A1.now, A1.ref), '[A-h] ★ 수령 직후 == 강제 재렌더 뒤 (낡은 자리 0)',
       show(A1.now) + '  vs  ' + show(A1.ref));
  } else ok(false, '[A] 못 읽었다');

  /* ── [B] 개별 수령 ──────────────────────────────────────────── */
  blk('[B] 행 [받기](`claimMail`) 도 같다 — 일괄만 고치면 행에서 재발한다');
  page = await open(browser, 'file://' + SRCP);
  await openCat(page, 'coin');
  const B = await ev(page, buyFn => {
    eval(buyFn);
    const ids = (S.mailx || []).map(m => m.id);
    ids.forEach(id => claimMail(id));           /* 한 통씩 */
    const p = document.getElementById('cnMile'), bar = p && p.querySelector('.bar>s');
    const now = { node: !!p, off: !!(p && p.classList.contains('off')),
                  exch: !!document.getElementById('cnExch'),
                  ct: p ? (p.querySelector('.ct') || {}).textContent.trim() : '',
                  barW: bar ? Math.round(bar.getBoundingClientRect().width) : -1 };
    renderShopPage();
    const p2 = document.getElementById('cnMile'), bar2 = p2 && p2.querySelector('.bar>s');
    const ref = { node: !!p2, off: !!(p2 && p2.classList.contains('off')),
                  exch: !!document.getElementById('cnExch'),
                  ct: p2 ? (p2.querySelector('.ct') || {}).textContent.trim() : '',
                  barW: bar2 ? Math.round(bar2.getBoundingClientRect().width) : -1 };
    return { now, ref, mil: S.mileage | 0 };
  }, '(' + BUY11.toString() + ')()');
  if(B){
    ok(B.mil === 11, '[B-a] [전제] 한 통씩 받아 쿠폰 11개', B.mil + '개');
    ok(B.now.off === false && B.now.exch === true && B.now.ct === '11 / 10',
       '[B-b] 마지막 [받기] 직후 이미 맞다', show(B.now));
    ok(same(B.now, B.ref), '[B-c] 개별 수령 뒤에도 낡은 자리 0', show(B.now) + '  vs  ' + show(B.ref));
  } else ok(false, '[B] 못 읽었다');

  /* ── [C] 사용자 경로 ────────────────────────────────────────── */
  blk('[C] ▦ 우편함 [일괄 읽기&수령] → **닫기 전에** 이미 아래 시트가 맞다');
  page = await open(browser, 'file://' + SRCP);
  await openCat(page, 'coin');
  await ev(page, buyFn => { eval(buyFn); openMail(); }, '(' + BUY11.toString() + ')()');
  const cBtn = await ev(page, () => {
    const b = document.getElementById('mailBtn');
    return { has: !!b, dis: !!(b && b.disabled), modal: !!document.querySelector('#modal.on.ml69') };
  });
  ok(!!cBtn && cBtn.has && !cBtn.dis && cBtn.modal,
     '[C-a] [전제] 우편함이 시트 «위» 에 떠 있고 [일괄 읽기&수령] 이 살아 있다',
     cBtn ? ('btn ' + cBtn.has + ' · disabled ' + cBtn.dis + ' · ml69 ' + cBtn.modal) : '');
  /* ⚠ `page.click` 은 60 쥬시의 열림 연출(딤·스케일) 중에 좌표가 딤으로 새어 **가끔 안 눌린다**
     (1회차에 [C-b] 가 «0개» 로 흔들렸다). 자가 묻는 것은 «좌표가 맞나» 가 아니라 «수령이 시트를
     따라오나» 이므로 노드에 직접 건다 — 같은 핸들러를 그대로 지난다. */
  await page.$eval('#mailBtn', el => el.click());
  await page.waitForTimeout(800);            /* fxThen(rAF ×2) + 토스트 */
  const C = await ev(page, () => {
    const p = document.getElementById('cnMile'), bar = p && p.querySelector('.bar>s');
    const now = { node: !!p, off: !!(p && p.classList.contains('off')),
                  exch: !!document.getElementById('cnExch'),
                  ct: p ? (p.querySelector('.ct') || {}).textContent.trim() : '',
                  barW: bar ? Math.round(bar.getBoundingClientRect().width) : -1 };
    const modalOn = !!document.querySelector('#modal.on.ml69');
    closeModal();
    const p2 = document.getElementById('cnMile'), bar2 = p2 && p2.querySelector('.bar>s');
    const after = { node: !!p2, off: !!(p2 && p2.classList.contains('off')),
                    exch: !!document.getElementById('cnExch'),
                    ct: p2 ? (p2.querySelector('.ct') || {}).textContent.trim() : '',
                    barW: bar2 ? Math.round(bar2.getBoundingClientRect().width) : -1 };
    return { now, after, modalOn, mil: S.mileage | 0, sheet: !!document.querySelector('#shopw.on') };
  });
  if(C){
    ok(C.mil === 11, '[C-b] [전제] 버튼 클릭으로 쿠폰 11개를 받았다', C.mil + '개');
    ok(C.modalOn, '[C-c] [전제] 그 시점에 우편함이 아직 열려 있다(«닫아서» 고쳐진 게 아니다)');
    ok(C.sheet, '[C-d] [전제] 상점 시트도 열린 채다');
    ok(C.now.off === false && C.now.exch === true && C.now.ct === '11 / 10',
       '[C-e] ★ 우편함을 닫기 전에 이미 아래 재화 탭이 맞다', show(C.now));
    ok(same(C.now, C.after), '[C-f] 닫아도 그대로다(닫기가 고치는 게 아니다)', show(C.after));
  } else ok(false, '[C] 못 읽었다');

  /* ── [D] 판정은 한 곳 ───────────────────────────────────────── */
  blk('[D] 시트 판정은 `reShopIfOpen()` 한 곳 — 부르는 쪽이 조건을 다시 안 적는다');
  const calls = (code.match(/reShopIfOpen\(\)/g) || []).length;
  ok(calls >= 4, '[D-a] `reShopIfOpen()` 선언 1 + 호출 3(claimMail·claimAllMail·grantDiaPack)',
     calls + '자리');
  ok(!/classList\.contains\('on'\)\s*&&\s*shopCat\s*===\s*'coin'/.test(code),
     '[D-b] 옛 이중 판정(`#shopw.on && shopCat === \'coin\'`)이 제품에 0건');
  page = await open(browser, 'file://' + SRCP);
  const D = await ev(page, buyFn => {
    /* 시트를 **안 열고** 받는다 — 그리면 안 된다(쓸데없는 재렌더는 122 쥬시 위상을 되감는다) */
    let n = 0;
    const real = window.renderShopPage;
    window.renderShopPage = function(){ n++; return real.apply(this, arguments); };
    eval(buyFn);
    claimAllMail();
    const closed = n;
    /* 시트를 열고 한 통 더 받으면 그때는 그린다 */
    openShopPage(null, 'coin');
    const base = n;
    /* 697 — 여기서 재는 것은 «우편이 생기는 단계에서는 안 그린다» 다. 구매는 이제 즉시 지급이라
       그 자체가 `reShopIfOpen()` 을 부르므로(547 축의 새 자리), 표본은 옛 통 주입으로 둔다. */
    window.sendMail({ t:'🛒 옛 상점 지급분', m:1, src:'shop', b:'697 이전 발송분' });
    const afterBuy = n;
    claimAllMail();
    const opened = n;
    window.renderShopPage = real;
    return { closed, base, afterBuy, opened, sheet: !!document.querySelector('#shopw.on') };
  }, '(' + BUY11.toString() + ')()');
  if(D){
    ok(D.closed === 0, '[D-c] 시트가 닫혀 있으면 한 번도 안 그린다', D.closed + '회');
    ok(D.opened > D.afterBuy, '[D-d] 시트가 열려 있으면 수령이 렌더를 부른다',
       '열기 ' + D.base + ' → 우편 발생 ' + D.afterBuy + ' → 수령 ' + D.opened + '회');
  } else ok(false, '[D] 못 읽었다');

  /* ── [E] 넓이 — 다른 탭도 낡지 않는다 ───────────────────────── */
  blk('[E] 소환·이용권 탭을 연 채 받아도 낡지 않는다 (등재문 ⓑ — 마일리지만 고치면 재발한다)');
  for(const cat of ['summon', 'coin', 'pass']){
    page = await open(browser, 'file://' + SRCP);
    await openCat(page, cat);
    const r = await ev(page, arg => {
      eval(arg.buy);
      claimAllMail();
      const list = document.getElementById('shopList');
      const A2 = list.innerHTML;
      renderShopPage();
      const B2 = list.innerHTML;
      return { same: A2 === B2, len: A2.length };
    }, { buy: '(' + BUY11.toString() + ')()' });
    ok(!!r && r.same, '[E-' + cat + '] 수령 뒤 DOM == 강제 재렌더 뒤 DOM',
       r ? ('len ' + r.len) : '');
  }

  /* ── [R] 되돌림 시험 ────────────────────────────────────────── */
  blk('[R] `reShopIfOpen()` 두 줄을 뺀 사본은 [A]·[C] 가 빨개진다');
  const L1 = "  reShopIfOpen();                             /* 547 — 재화 탭을 연 채 받으면 그 자리에서 따라온다 */\n";
  const L2 = "  reShopIfOpen();                             /* 547 — 우편함은 상점 시트 «위» 라 아래가 낡은 채 남는다 */\n";
  const found = [src.includes(L1), src.includes(L2)];
  ok(found.every(Boolean), '[R-a] [전제] 사본 편집 자리 2곳(claimMail·claimAllMail)을 소스에서 찾았다',
     found.map((f, i) => (f ? '○' : '✗') + ['claimMail', 'claimAllMail'][i]).join(' '));
  if(found.every(Boolean)){
    fs.writeFileSync(TMP, src.replace(L1, '').replace(L2, ''));
    try {
      const p2 = await open(browser, 'file://' + TMP);
      await openCat(p2, 'coin');
      const R = await ev(p2, buyFn => {
        eval(buyFn);
        claimAllMail();
        const p = document.getElementById('cnMile'), bar = p && p.querySelector('.bar>s');
        return { off: !!(p && p.classList.contains('off')),
                 exch: !!document.getElementById('cnExch'),
                 ct: p ? (p.querySelector('.ct') || {}).textContent.trim() : '',
                 barW: bar ? Math.round(bar.getBoundingClientRect().width) : -1,
                 mil: S.mileage | 0 };
      }, '(' + BUY11.toString() + ')()');
      if(R){
        ok(R.mil === 11, '[R-b] [전제] 사본에서도 쿠폰은 11개다(값은 원래 옳았다)', R.mil + '개');
        ok(R.off === true && R.exch === false,
           '[R-c] ★ 되돌린 사본은 [A-d]·[A-e] 가 빨갛다 (패널이 잠긴 채 남는다)',
           'off=' + R.off + ' · #cnExch=' + R.exch);
        ok(R.ct === '0 / 10' && R.barW === 0,
           '[R-d] ★ 되돌린 사본은 [A-f]·[A-g] 가 빨갛다 (문구·게이지가 옛 값)',
           'ct "' + R.ct + '" · bar ' + R.barW + 'px');
      } else ok(false, '[R] 되돌림 사본을 못 읽었다');
    } finally { try { fs.unlinkSync(TMP); } catch (e) {} }
  }

  note('깜빡임 대가(probe547 [4])', '재렌더는 122 쥬시 진행 시각을 0 으로 되감는다 — 칸별 오프셋 `--jz-k` 는 불변');
  await browser.close();
  const total = pass + fail;
  console.log('\n' + (fail ? 'VERIFY547 FAIL ' : 'VERIFY547 PASS ') + pass + '/' + total);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); try { fs.unlinkSync(TMP); } catch (x) {} process.exit(2); });
