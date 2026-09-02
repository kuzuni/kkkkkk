/* 151 검증 — 10 상점 «이용권» 탭 카드 3장 (레퍼런스 디자인 교체 + 기능 연결)
   실행: node tools/verify151.js [--broken]   (1080×2280 · 헤드리스)

   레이아웃 «닮았나» 는 비평가가 본다. 이 게이트가 지키는 것은 **기능과 불변식**이다:
     [A] 카드 3장 · 상품 데이터 · 원화 표기 · 마일리지 쿠폰 알약
     [B] 구매 한 번에 «차감 · 즉시 보석 · 쿠폰 · 효과» 가 한 벌로 움직인다 (같은 tick 안에서 Δ 측정)
     [C] 오프라인 보상 **×배율**(199 21회차 결3 ⓑ 이관 — 옛 «상한 6 → 10시간») · 1회 상한 폐지 · 01 팝업 문구
     [D] 매일 보석 — 시각 기준. 껐다 켠 시간만큼 정확히, 기간제는 만료 시각까지만
     [E] 세이브 — 신설 두 키 «없으면 기본값»(KEY 인상 없음) · 미래 dailyAt 폐기
     [F] **맞은 것을 지키는 칸**(LESSONS 164-4 · 156-4): 13 재화 탭·카테고리 3칸·152 타이틀 중앙·
         164 착지가 151 때문에 깨지지 않았는지
     [G] 기하 — 카드 3장 겹침 0 · 프레임 밖 이탈 0 · 가격 버튼이 실제로 눌리는 자리에 있다

   `--broken` 은 «이 게이트가 공허하지 않다» 를 보이기 위한 음성 테스트다(LESSONS 156-5):
   런타임에 151 의 연결을 하나씩 끊고 돌려 FAIL 이 나는지 본다.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const W = 1080, H = 2280;
const KEY = 'idle_hunter_save_v4';
const DAY = 24 * 3600 * 1000;
const BROKEN = process.argv.includes('--broken');
let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); }
};
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);
/* ⚠ 기대값은 게임 데이터에서 **파생하지 않고** 여기 다시 적는다 — `PASS_ITEMS` 로 기대값을 만들면
   그 배열이 통째로 0 이 돼도 «기대 0 = 실측 0» 으로 통과하는 공허한 게이트가 된다(음성 테스트로 확인). */
/* ⚠ **588(2026-08-31, 주인 «그 이용권들은 다이아로 못사게 하기») 이관** — `dia`(다이아 대체가)
   칸을 표에서 지웠다. 값을 0 으로 남기면 «아무도 안 읽는 기대값» 이 굳는다(295-② · 460 선례).
   대신 그 자리는 아래 [B] 가 **반대 명제**(«다이아가 1도 안 줄어든다»)로 지킨다. */
const EXPECT = {
  noads:   { won: 14900, cp: 1, daily: 1500, once: 10000, perm: true },
  abless:  { won: 22900, cp: 2, daily: 1500, once: 16000, perm: false },
  offplus: { won: 7500,  cp: 1, daily: 750,  once: 5000,  perm: true }
};
/* ⚑ 199 21회차 이관(333 처방 — 자리를 비우지 않고 방향을 뒤집었다). 옛 상수 `OFF_BASE_H 6`·
   `OFF_PLUS_H 4` 는 제품에서 **선언째** 사라졌다(결3 ⓑ: 1회 상한 6h → 하루 예산 1,440분).
   그 자리를 배율 축이 받는다 — 기대값은 제품에서 파생하지 않고 여기 다시 적는다(위 ⚠ 규약). */
/* ⚑ 199 25회차 — 하루 예산이 1,440분(24h) → **660분(11h)** 으로 내려갔다(`OFF_DAY_CAP_MIN` ·
   ④ 정책비 손잡이). 위 규약대로 값은 여기 다시 적는다 — 제품에서 파생하면 «제품이 뭘 적든
   자는 초록» 이 되어 C3 이 아무것도 안 지킨다. */
const OFF_MUL_ON = 1.2, OFF_DAY_H = 11, OFF_CLAIM_H = 10.5, DAILY_MAX_D = 60;   /* 199 22회차 — 1회 상한 10.5h · 25회차 — 하루 예산 11h */

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const boot = async () => { await page.goto(URL); await page.waitForTimeout(900); };
  await boot();
  if (BROKEN) {
    /* 음성 테스트 — 연결 3개를 끊는다: 즉시 보석 · 쿠폰 · 오프라인 상한 */
    await page.evaluate(() => {
      /* 데이터 연결(즉시 보석·쿠폰·매일 보석)과 정산 함수를 끊는다.
         `offMul`/`passOffPlus` 는 const 라 못 덮으므로 배율 쪽은 `passDailyTick` 무력화로 대신한다. */
      PASS_ITEMS.forEach(p => { p.once = 0; p.cp = 0; p.daily = 0; });
      window.passDailyTick = () => 0;
      /* ⚑ 199 21회차 — [C] 축이 «상한» 에서 «배율» 로 바뀌면서 옛 음성 테스트(passDailyTick 무력화)가
         [C] 를 더는 못 건드리게 됐다. 그래서 **21회차 이전의 제품**(1회 상한 6h · 배율 없음)을
         그대로 되살려 심는다 — C4·C5 가 빨개져야 이 절이 공허하지 않다. `offlineReward` 는 함수
         선언이라 전역으로 덮인다(`offMul` 은 const 라 못 덮는다). */
      window.offlineReward = function (lastTime) {
        if (!lastTime) return;
        let sec = Math.min((Date.now() - lastTime) / 1000, 6 * 3600);
        sec = Math.min(sec, Math.max(0, OFF_DAY_CAP_MIN - (S.daily.offMin || 0)) * 60);
        if (sec < 60) return;
        showOfflineReward(sec, eGold(S.stage) * stat.goldMul * 1.2 * sec * 0.5,
          Math.floor(sec * OFF_DIA_PM / 60));
        offPend.at = lastTime;
      };
    });
  }
  const openPass = async () => {
    await page.evaluate(() => { S.dia = 3e6; openShopTab('pass'); });
    await page.waitForTimeout(700);
    await page.evaluate(() => Promise.all(
      document.getElementById('shopw').getAnimations().map(a => a.finished.catch(() => {}))));
    await page.waitForTimeout(60);
  };

  /* ================= [A] 카드 3장 · 표기 ================= */
  console.log('\n[A] 카드 3장 · 상품 표기');
  await openPass();
  const A = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('.pvc')];
    return {
      n: cs.length,
      ids: cs.map(c => c.dataset.pv),
      won: cs.map(c => (c.querySelector('.bt>i') || {}).textContent || ''),
      pil: cs.map(c => (c.querySelector('.pil>i') || {}).textContent || ''),
      rb1: cs.map(c => (c.querySelector('.rb1') || {}).textContent || ''),
      rb2: cs.map(c => (c.querySelector('.rb2') || {}).textContent || ''),
      ti: cs.map(c => (c.querySelector('.pvt>i') || {}).textContent || ''),
      old: document.querySelectorAll('.cn-cd.pv').length,
      /* 588 — `dia` 는 상품표에서 사라졌다. «없다» 를 값이 아니라 **키의 유무**로 실어 보낸다
         (`dia: p.dia` 로 두면 undefined 가 직렬화에서 빠져 «없음» 과 «0» 을 못 가른다). */
      items: PASS_ITEMS.map(p => ({ id: p.id, won: p.won, cp: p.cp, daily: p.daily, once: p.once,
                                    hasDia: 'dia' in p }))
    };
  });
  ok('A1 카드 3장', A.n === 3, 'n=' + A.n);
  ok('A2 상품 순서 noads·abless·offplus', A.ids.join(',') === 'noads,abless,offplus', A.ids.join(','));
  ok('A3 124 의 옛 카드(.cn-cd.pv) 0개', A.old === 0, 'n=' + A.old);
  ok('A4 가격은 원화 표기', A.won.every(t => /원$/.test(t.trim())), A.won.join(' | '));
  ok('A5 원화가 14,900 / 22,900 / 7,500',
    A.won[0].includes('14,900') && A.won[1].includes('22,900') && A.won[2].includes('7,500'), A.won.join(' | '));
  ok('A6 마일리지 쿠폰 +1 / +2 / +1',
    /\+1$/.test(A.pil[0].trim()) && /\+2$/.test(A.pil[1].trim()) && /\+1$/.test(A.pil[2].trim()), A.pil.join(' | '));
  ok('A7 리본 2줄 — 매일 / 구매 즉시',
    A.rb1.every(t => t.includes('매일')) && A.rb2.every(t => t.includes('즉시')), A.rb1[0] + ' / ' + A.rb2[0]);
  ok('A8 리본 값 = 매일 1,500 / 즉시 16,000 (2번 카드)',
    A.rb1[0].replace(/[^0-9]/g, '') === String(EXPECT.noads.daily)
    && A.rb2[1].replace(/[^0-9]/g, '') === String(EXPECT.abless.once), A.rb1[0] + ' / ' + A.rb2[1]);
  ok('A11 상품 데이터가 지시서 값 그대로',
    A.items.every(it => { const e = EXPECT[it.id];
      return e && it.won === e.won && it.hasDia === false && it.cp === e.cp
        && it.daily === e.daily && it.once === e.once; }), JSON.stringify(A.items));
  ok('A9 3번 카드 = 오프라인 보상 증가', /오프라인/.test(A.ti[2]), A.ti[2]);
  ok('A10 2번 카드 불릿에 «4시간 증가» 없음 (효과 중복 판매 방지)',
    !/4시간 증가/.test(A.rb1[1] + A.rb2[1] + (A.ti[1] || '')) &&
    !(await page.evaluate(() => (PASS_ITEMS[1].bl || []).join('|'))).includes('4시간 증가'));

  /* ================= [B] 구매 한 벌 ================= */
  /* ⚠ 153(상점 구매품 우편 지급, 2026-08-27 주인 지시)이 **151 의 재화 지급 경로를 우편으로 옮겼다**.
     그래서 «구매 즉시 다이아가 늘어난다» 는 더 이상 참이 아니다 — 참인 것은
     ⓐ 정가만큼 차감 ⓑ 권한(광고 제거·자동 축복·오프라인 +4h)은 **즉시** ⓒ 쿠폰·즉시 보석은
     **우편 한 통**으로 가고, 그 우편을 수령하면 그때 재화가 된다. 세 층을 다 본다(LESSONS 156-2).
     ⚠ **588·589 가 ⓐ 를 뒤집었다** — 차감할 다이아가 없다.
     ⚠ **697(2026-09-02, 주인 «이용권도 즉시적용으로»)이 ⓒ 를 다시 뒤집었다** — 쿠폰·즉시 보석도
     우편을 안 지나고 **구매 그 틱에** 들어온다. 그래서 이 자리에서 재는 것은 «차감 0인데
     권한이 켜지고 재화가 그 자리에서 들어온다» 이고, 차감이 되살아나면 Δ가 표와 안 맞는다.
     ⚑ 무르게 푼 것이 아니다: 옛 «−75,000» 을 «0» 으로 고치기만 했으면 «구매가 통째로 사라져도
        초록» 이 된다 — 그래서 결제 이력(`S.cnt.paid` +1)을 같은 절에서 같이 묻는다(589). */
  console.log('\n[B] 구매 — 차감 0(588) · 결제 1건(589) · 권한·재화 둘 다 즉시(697)');
  for (const id of ['noads', 'abless', 'offplus']) {
    const r = await page.evaluate(i => {
      S.pass = { prem: {}, got: {}, noAds: false, autoBlessUntil: 0, offPlus: false, dailyAt: {} };
      S.dia = 3e6; S.mileage = 0; S.mailx = []; S.mail = S.mail || {};
      const d0 = S.dia, m0 = S.mileage | 0, p0 = S.cnt.paid | 0;
      /* 같은 tick 안에서 Δ 를 잰다 — 자동 전투가 재화를 흔들 수 없다(LESSONS 156-3) */
      const okr = buyPass(i);
      const mails = (S.mailx || []).map(m => ({ t: m.t, c: m.c, m: m.m, src: m.src }));
      const dBuy = S.dia - d0, mBuy = (S.mileage | 0) - m0;
      return { okr, dBuy, mBuy, mails,
        dPaid: (S.cnt.paid | 0) - p0,
        own: passOwned(i), twice: buyPass(i) };
    }, id);
    const e = EXPECT[id];
    ok('B:' + id + ' 588·697 — 차감 0 · 즉시 보석 +' + e.once + ' 이 그 틱에',
      r.okr === true && r.dBuy === e.once, 'Δ' + r.dBuy + ' (기대 +' + e.once + ') · 구매 ' + r.okr);
    ok('B:' + id + ' 589 — 결제 1건으로 세어진다(S.cnt.paid +1)', r.dPaid === 1, '+' + r.dPaid);
    ok('B:' + id + ' 697 — 쿠폰도 구매 시점에 +' + e.cp,
      r.mBuy === e.cp, 'Δ쿠폰 ' + r.mBuy + ' (기대 +' + e.cp + ')');
    ok('B:' + id + ' 697 — 새 우편 0통(수령 절차가 사라졌다)',
      r.mails.length === 0, JSON.stringify(r.mails));
    ok('B:' + id + ' 권한은 즉시 켜진다', r.own === true);
    ok('B:' + id + ' 중복 구매 차단', r.twice === false);
  }
  /* 588 이관 — 옛 «다이아가 모자라면 아무 일도 없다» 의 반대 명제. 다이아 0 에서도 다 된다.
     ⚠ 이 항이 «589 가 없어도 초록» 이 되지 않게 우편·권한까지 같이 묻는다. */
  const lack = await page.evaluate(() => {
    S.pass = { prem: {}, got: {}, noAds: false, autoBlessUntil: 0, offPlus: false, dailyAt: {} };
    S.dia = 0; S.mailx = []; S.mail = S.mail || {}; const d0 = S.dia; const r = buyPass('noads');
    return { r, dDia: S.dia - d0, own: passOwned('noads'), mails: (S.mailx || []).length,
             once: (PASS_ITEMS.find(x => x.id === 'noads') || {}).once | 0 };
  });
  /* 697 — «지급 우편 1통» 이 «즉시 보석 +once · 새 우편 0» 으로 뒤집혔다. 588 축(차감 0)은
     그대로 산다: 차감이 되살아나면 다이아 0 에서 Δ가 once 보다 작아진다. */
  ok('B:588·697 다이아 0 에서도 구매된다 — 즉시 보석 +once · 새 우편 0 · 권한 즉시',
    lack.r === true && lack.dDia === lack.once && lack.own === true && lack.mails === 0, JSON.stringify(lack));

  /* ================= [C] 오프라인 배율 · 1회 상한 폐지 ================= */
  console.log('\n[C] 오프라인 보상 ×배율 (199 21회차 — 옛 «상한 6 → 10시간»)');
  const C = await page.evaluate(() => {
    S.daily.offMin = 0;
    S.pass.offPlus = false; const mul0 = offMul();
    S.pass.offPlus = true;  const mul1 = offMul();
    /* 01 팝업 문구 — 156 «표기·지급 한 벌». 상한 줄은 이제 «하루 예산» 을 말하고,
       이용권을 갖고 있으면 그 배율이 같은 줄에 적혀야 한다. */
    S.pass.offPlus = false; showOfflineReward(3600, 1000, 10);
    const txtOff = document.getElementById('ofrMax').textContent; closeOfflineReward();
    S.pass.offPlus = true;  showOfflineReward(3600, 1000, 10);
    const txtOn = document.getElementById('ofrMax').textContent; closeOfflineReward();
    /* 12시간 자리비움 — 옛 게이트는 여기서 «6h 로 잘린다» 를 단언했다. 지금은 안 잘린다. */
    S.daily.offMin = 0; S.pass.offPlus = false;
    offlineReward(Date.now() - 12 * 3600 * 1000);
    const secOff = (offPend || {}).sec, diaOff = (offPend || {}).dia; closeOfflineReward();
    S.daily.offMin = 0; S.pass.offPlus = true;
    offlineReward(Date.now() - 12 * 3600 * 1000);
    const secOn = (offPend || {}).sec, diaOn = (offPend || {}).dia; closeOfflineReward();
    /* 하루 예산은 그대로 자른다 — 30시간 자리비움도 1,440분에서 멈춘다(199 3회차 불변식) */
    S.daily.offMin = 0; S.pass.offPlus = false;
    offlineReward(Date.now() - 30 * 3600 * 1000);
    const secLong = (offPend || {}).sec; closeOfflineReward();
    /* 배율은 «지급액» 에만 — 받고 나서 소비된 분 예산이 배율에 안 물려야 한다 */
    S.daily.offMin = 0; S.pass.offPlus = false;
    offlineReward(Date.now() - 3 * 3600 * 1000); claimOffline(1);
    const minOff = S.daily.offMin;
    S.daily.offMin = 0; S.pass.offPlus = true;
    offlineReward(Date.now() - 3 * 3600 * 1000); claimOffline(1);
    const minOn = S.daily.offMin;
    return { mul0, mul1, txtOff, txtOn, secOff, secOn, diaOff, diaOn, secLong, minOff, minOn };
  });
  ok('C1 offMul() 미보유 1', C.mul0 === 1, String(C.mul0));
  ok('C2 offMul() 보유 ' + OFF_MUL_ON, Math.abs(C.mul1 - OFF_MUL_ON) < 1e-9, String(C.mul1));
  /* ⚑ 199 22회차(정정5) — 1회 상한이 10.5h 로 되살아났다(구 6h 가 아니다 — `OFF_CLAIM_CAP_H`).
     C3 문구는 «1회 상한 + 하루 예산» 두 축을 다 적어야 하고(156 표기·지급 한 벌),
     C4 는 방향이 뒤집힌다(333 처방 — 항을 지우지 않는다): 12h 자리비움도 10.5h 에서 잘린다. */
  ok('C3 01 팝업 문구 — «1회 최대 10시간 30분» + «하루 ' + OFF_DAY_H + '시간» 두 축 · 보유는 «이용권 ×1.2» 를 같이 적는다',
    /1회 최대 10시간 30분/.test(C.txtOff) && new RegExp('하루 ' + OFF_DAY_H + '시간').test(C.txtOff)
    && !/이용권 ×/.test(C.txtOff) && /이용권 ×1\.2/.test(C.txtOn),
    C.txtOff + ' ‖ ' + C.txtOn);
  ok('C4 1회 적립 상한 10.5h — 12시간도 30시간도 한 번에는 10.5h 에서 잘린다 (옛 6h 도, 폐지도 아니다)',
    near(C.secOff, OFF_CLAIM_H * 3600, 2) && near(C.secLong, OFF_CLAIM_H * 3600, 2),
    '12h=' + C.secOff + 's · 30h=' + C.secLong + 's(1회 상한 ' + OFF_CLAIM_H + 'h 에서 멈춤)');
  ok('C5 배율은 «지급액» 에만 — 다이아 ×' + OFF_MUL_ON + ' 인데 소비된 분 예산은 Δ0',
    C.secOn === C.secOff && Math.abs(C.diaOn - Math.floor(C.diaOff * OFF_MUL_ON)) <= 1 &&
    Math.abs(C.minOn - C.minOff) < 1e-6,
    '다이아 ' + C.diaOff + ' → ' + C.diaOn + ' · 분예산 ' + C.minOff + ' → ' + C.minOn);

  /* ================= [D] 매일 보석 ================= */
  console.log('\n[D] 매일 보석 — 시각 기준(오프라인 포함)');
  const D = await page.evaluate(() => {
    const DAY = 24 * 3600 * 1000, out = {};
    S.pass = { prem: {}, got: {}, noAds: true, autoBlessUntil: 0, offPlus: true, dailyAt: {} };
    S.dia = 0;
    const p0 = PASS_ITEMS[0], p2 = PASS_ITEMS[2];
    S.pass.dailyAt = { noads: Date.now() - 3 * DAY - 1000, offplus: Date.now() - 3 * DAY - 1000 };
    out.g3 = passDailyTick();
    out.rest = Math.round((Date.now() - S.pass.dailyAt.noads) / 1000);   /* 남은 자투리(초) */
    /* 하루가 안 됐으면 0 */
    S.dia = 0; out.g0 = passDailyTick();
    /* 기간제 — 자리를 비운 사이에 만료됐어도 «만료 전까지» 는 받는다(그 뒤로는 0) */
    S.pass = { prem: {}, got: {}, noAds: false, offPlus: false, dailyAt: {},
      autoBlessUntil: Date.now() - 2 * DAY };                            /* 2일 전에 만료 */
    S.pass.dailyAt.abless = Date.now() - 5 * DAY - 1000;                 /* 5일 전에 샀다 */
    S.dia = 0; out.expired = passDailyTick();

    /* 깨진 세이브 방어 — 아주 오래된 시각이면 상한(60일)에서 잘린다 */
    S.pass = { prem: {}, got: {}, noAds: true, autoBlessUntil: 0, offPlus: false, dailyAt: { noads: 1 } };
    S.dia = 0; out.ancient = passDailyTick();
    out.wantAncient = PASS_DAILY_MAX_D * PASS_ITEMS[0].daily;
    /* 미보유 상품은 0 */
    S.pass = { prem: {}, got: {}, noAds: false, autoBlessUntil: 0, offPlus: false,
      dailyAt: { noads: Date.now() - 9 * DAY } };
    S.dia = 0; out.none = passDailyTick();
    return out;
  });
  const want3 = 3 * (EXPECT.noads.daily + EXPECT.offplus.daily);
  ok('D1 3일 자리비움 = 3일치', D.g3 === want3, D.g3 + ' (기대 ' + want3 + ')');
  ok('D2 자투리 시간은 다음 지급으로 이월', D.rest >= 0 && D.rest < 24 * 3600, D.rest + 's');
  ok('D3 하루 미만이면 0', D.g0 === 0, String(D.g0));
  const wantExp = 3 * EXPECT.abless.daily;
  ok('D4 기간제는 만료 시각까지만', D.expired === wantExp, D.expired + ' (기대 ' + wantExp + ')');
  ok('D5 미보유 상품은 0', D.none === 0, String(D.none));
  const wantAnc = DAILY_MAX_D * EXPECT.noads.daily;
  ok('D6 깨진 세이브의 아주 오래된 시각은 60일에서 잘린다', D.ancient === wantAnc,
    D.ancient + ' (기대 ' + wantAnc + ')');

  /* ================= [E] 세이브 ================= */
  console.log('\n[E] 세이브 — 없으면 기본값(KEY 유지) · 이상값 폐기');
  await page.evaluate(k => {
    const raw = JSON.parse(localStorage.getItem(k) || '{}');
    raw.pass = { prem: {}, got: {}, noAds: true, autoBlessUntil: 0 };   /* 구 세이브 = 신설 두 키 없음 */
    raw.dia = 12345;
    localStorage.setItem(k, JSON.stringify(raw));
    /* index.html 은 beforeunload 에 save() 를 걸어 둔다 — 심은 세이브가 덮이지 않게 쓰기를 막는다
       (124 교훈. 리스너가 함수 참조를 쥐고 있어 save 를 덮어써도 소용없다) */
    Storage.prototype.setItem = function () {};
  }, KEY);
  await page.reload(); await page.waitForTimeout(1100);
  const E1 = await page.evaluate(() => ({
    off: !!S.pass.offPlus, da: JSON.stringify(S.pass.dailyAt || null),
    noAds: !!S.pass.noAds, dia: S.dia, key: Object.keys(localStorage).length
  }));
  ok('E1 구 세이브 정상 로드(광고 제거 유지)', E1.noAds === true && E1.dia >= 12345, JSON.stringify(E1));
  ok('E2 offPlus 기본 false', E1.off === false);
  /* 구 세이브에는 dailyAt 이 없다 — 보유 중인 상품은 **로드 시각이 기산점**이 된다(그 전 일수는 안 준다) */
  ok('E3 구 세이브 — 보유 상품의 일일 기산점이 «지금» 으로 잡힌다',
    /^\{"noads":\d{13}\}$/.test(E1.da), E1.da);
  await page.evaluate(k => {
    const raw = JSON.parse(localStorage.getItem(k) || '{}');
    raw.pass = { prem: {}, got: {}, noAds: true, autoBlessUntil: 0, offPlus: true,
      dailyAt: { noads: Date.now() + 9 * 24 * 3600 * 1000, abless: 'x', offplus: 1 } };
    localStorage.setItem(k, JSON.stringify(raw));
    Storage.prototype.setItem = function () {};
  }, KEY);
  await page.reload(); await page.waitForTimeout(1100);
  const E2 = await page.evaluate(() => {
    const planted = Date.now() - 60000;
    /* 로드 때 이미 한 번 정산됐다 — 지급액을 다시 재려고 기산점을 1970 으로 되돌리고 한 번 더 돌린다 */
    S.pass.dailyAt.offplus = 1; S.dia = 0;
    const grant = passDailyTick();
    return { da: S.pass.dailyAt, off: !!S.pass.offPlus, planted, grant };
  });
  /* 미래 시각은 마이그레이션이 버린다 → 보유 상품이므로 로드 시각으로 다시 잡힌다(과거로 새지 않는다) */
  ok('E4 미래 시각 dailyAt 폐기', E2.da.noads > E2.planted, JSON.stringify(E2.da));
  ok('E5 문자열 dailyAt 폐기', E2.da.abless === undefined);
  /* 유효한 과거 값(1 = 1970)은 보존하되 지급은 60일에서 잘린다 — 값과 지급을 갈라서 본다 */
  const wantE6 = DAILY_MAX_D * EXPECT.offplus.daily;
  ok('E6 아주 오래된 과거 값은 폭탄 지급이 아니라 상한 지급', E2.grant === wantE6,
    E2.grant + ' (기대 ' + wantE6 + ')');
  ok('E7 offPlus 이월', E2.off === true);
  /* 세이브를 지우고 새로 뜬다. **쓰기를 막지 않으면** beforeunload 의 save() 가 지금 메모리의 S
     (E 가 심은 «광고 제거 보유» 상태)를 도로 써 넣어 뒤 단계가 «이미 보유» 로 시작한다. */
  await page.evaluate(k => { localStorage.removeItem(k); Storage.prototype.setItem = function () {}; }, KEY);
  await page.reload(); await page.waitForTimeout(1000);

  /* ================= [F] 맞은 것을 지키는 칸 ================= */
  console.log('\n[F] 151 이 깨뜨리면 안 되는 것 (124·152·164·13)');
  const F = await page.evaluate(() => {
    const out = {};
    openShopTab('pass');
    out.cats = [...document.querySelectorAll('#shopCats [data-cat]')].map(x => x.dataset.cat);
    const t = document.querySelector('.cn-wrap.pv .cn-ti>i');
    const A = document.getElementById('app').getBoundingClientRect();
    const r = t.getBoundingClientRect();
    out.tiMid = +(r.left + r.width / 2 - A.left).toFixed(1);
    out.tiLines = Math.round(r.height / 86);
    return out;
  });
  await page.waitForTimeout(500);
  ok('F1 카테고리 탭 3칸 유지(45·96·124)', F.cats.join(',') === 'summon,coin,pass', F.cats.join(','));
  ok('F2 152 — «이용권 상점» 타이틀 중앙 540±6', near(F.tiMid, 540, 6), String(F.tiMid));
  ok('F3 152 — 타이틀 한 줄', F.tiLines <= 1, 'lines=' + F.tiLines);
  const F2 = await page.evaluate(() => {
    /* 164 — 01 오프라인 [이동] 은 여전히 이용권 탭에 착지한다 */
    closeShopPage();
    showOfflineReward(3600, 1000, 10);
    document.getElementById('ofrGo').click();
    return { cat: shopCat, on: document.getElementById('shopw').classList.contains('on') };
  });
  ok('F4 164 — 01 [이동] → 이용권 탭 착지', F2.cat === 'pass' && F2.on, JSON.stringify(F2));
  const F3 = await page.evaluate(() => {
    openShopTab('coin');
    return { cards: document.querySelectorAll('.shp-list.coin .cn-cd').length,
      pvc: document.querySelectorAll('.shp-list.coin .pvc').length };
  });
  await page.waitForTimeout(400);
  ok('F5 13 재화 탭 카드는 그대로(.cn-cd 다수)', F3.cards >= 6, 'n=' + F3.cards);
  ok('F6 13 재화 탭에 이용권 카드가 새지 않는다', F3.pvc === 0, 'n=' + F3.pvc);

  /* ================= [G] 기하 ================= */
  console.log('\n[G] 기하 — 겹침·이탈·클릭');
  await openPass();
  const G = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const cs = [...document.querySelectorAll('.pvc')];
    const box = e => { const r = e.getBoundingClientRect();
      return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const cards = cs.map(box);
    const inner = cs.map(c => ['.pvt', '.rb1', '.rb2', '.bt', '.art'].map(s => {
      const e = c.querySelector(s); if (!e) return null;
      const b = box(e), cb = box(c);
      return { s, dx: +(b.x - cb.x).toFixed(1), dy: +(b.y - cb.y).toFixed(1), w: b.w, h: b.h };
    }).filter(Boolean));
    const li = document.getElementById('shopList');
    return { cards, inner, listW: li.clientWidth, scrollH: li.scrollHeight, clientH: li.clientHeight };
  });
  for (let i = 1; i < G.cards.length; i++) {
    const a = G.cards[i - 1], b = G.cards[i];
    ok('G1-' + i + ' 카드 ' + i + '↔' + (i + 1) + ' 겹침 0', b.y >= a.y + a.h, 'gap=' + (b.y - a.y - a.h).toFixed(1));
  }
  ok('G2 카드 폭 978 · 좌 51', G.cards.every(c => near(c.w, 978, 1) && near(c.x, 51, 1)),
    JSON.stringify(G.cards[0]));
  ok('G3 카드가 프레임(1080) 안', G.cards.every(c => c.x >= 0 && c.x + c.w <= 1080));
  G.inner.forEach((arr, i) => {
    const bad = arr.filter(e => e.dx < -4 || e.dy < -4 || e.dx + e.w > 978 + 4 || e.dy + e.h > 768 + 4);
    ok('G4-' + (i + 1) + ' 카드 ' + (i + 1) + ' 내부 요소가 카드 밖으로 안 나감', bad.length === 0,
      bad.map(b => b.s).join(',') || 'ok');
  });
  ok('G5 페이지가 리스트보다 길다(스크롤 가능)', G.scrollH > G.clientH,
    G.scrollH + ' > ' + G.clientH);
  /* 실제 클릭 경로 — 사용자와 같은 방식으로 첫 카드의 가격 버튼을 누른다 */
  const before = await page.evaluate(() => {
    S.pass = { prem: {}, got: {}, noAds: false, autoBlessUntil: 0, offPlus: false, dailyAt: {} };
    S.dia = 3e6; syncNoAds(); renderPassPage($('shopList')); return S.dia;
  });
  await page.waitForTimeout(120);
  await page.locator('.pvc[data-pv="noads"] .bt').click();
  await page.waitForTimeout(260);
  const after = await page.evaluate(() => ({ dia: S.dia, own: passOwned('noads'),
    once: (PASS_ITEMS.find(x => x.id === 'noads') || {}).once | 0,
    modal: document.querySelectorAll('.modal.on, #modal.on').length }));
  /* 588 — 클릭이 «샀다» 는 증거는 «다이아가 줄었다» 가 아니라 «권한이 켜졌다 + 차감 0» 이다.
     697 — 그 위에 즉시 보석이 얹혀 Δ가 «+once» 가 됐다(차감이 되살아나면 여기가 어긋난다). */
  ok('G6 가격 버튼 실제 클릭으로 구매된다(588 차감 0 · 697 즉시 보석 +' + after.once + ')',
    after.own === true && after.dia === before + after.once, 'dia ' + before + ' → ' + after.dia);
  const G7 = await page.evaluate(() => {
    renderPassPage($('shopList'));
    const c = document.querySelector('.pvc[data-pv="noads"]');
    return { own: c.classList.contains('own'), bt: (c.querySelector('.bt') || {}).className,
      stt: (c.querySelector('.stt>i') || {}).textContent };
  });
  ok('G7 보유 카드는 «이용 중» 상태 표기', G7.own && /on/.test(G7.bt) && /이용 중/.test(G7.stt),
    JSON.stringify(G7));

  /* ---- G8 (작업 207) 리본 금색 판 안에서 다이아 아이콘이 정확히 가운데 ----
     `#shopw i,em,b,u,s{display:inline-block}` 이라는 ID 특이도 태그 리셋이
     `.pvc>.rb>b{display:flex}` 를 이겨 버리면 아이콘이 판 좌상단으로 붙는다(Δ −9.5,−9.5).
     선택자에서 `#shopw` 가 빠지는 순간 되돌아오는 종류의 결함이라 게이트로 못 박는다. */
  const G8 = await page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('.pvc > .rb').forEach((rb) => {
      const pl = rb.querySelector(':scope > b'), ic = pl && pl.querySelector(':scope > .cic'),
            qt = rb.querySelector(':scope > u');
      if (!pl || !ic) return;
      const pr = pl.getBoundingClientRect(), ir = ic.getBoundingClientRect(),
            qr = qt ? qt.getBoundingClientRect() : null;
      rows.push({
        who: (rb.closest('.pvc') || {}).dataset ? rb.closest('.pvc').dataset.pv + '/' + rb.className.replace('rb ', '') : '?',
        dx: +((ir.left + ir.width / 2) - (pr.left + pr.width / 2)).toFixed(2),
        dy: +((ir.top + ir.height / 2) - (pr.top + pr.height / 2)).toFixed(2),
        qdx: qr ? +((qr.left + qr.width / 2) - (pr.left + pr.width / 2)).toFixed(2) : 0,
        disp: getComputedStyle(pl).display
      });
    });
    return rows;
  });
  ok('G8-a 리본 6줄(카드 3 × 2) 전부 잡힘', G8.length === 6, 'n=' + G8.length);
  G8.forEach((r) => {
    ok('G8 ' + r.who + ' 금색 판 = flex(태그 리셋에 안 짐)', r.disp === 'flex', r.disp);
    ok('G8 ' + r.who + ' 다이아 아이콘이 판 정중앙 (|Δ| ≤ 0.6)',
      Math.abs(r.dx) <= 0.6 && Math.abs(r.dy) <= 0.6, 'Δ=' + r.dx + ',' + r.dy);
    ok('G8 ' + r.who + ' 수량이 판과 같은 세로축 (|Δx| ≤ 0.6)', Math.abs(r.qdx) <= 0.6, 'Δx=' + r.qdx);
  });

  console.log('\n콘솔 에러: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 0));
  ok('Z 콘솔 에러 0', errs.length === 0);
  console.log('\nVERIFY151 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
