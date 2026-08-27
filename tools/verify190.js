/* 작업 190 게이트 — 10 소환 «매일 1회는 광고 없이» + 그때는 ▶AD 표시 없음.
   실행: node tools/verify190.js        → 마지막 줄 «VERIFY190 n/n PASS»

   주인 지시(2026-08-27): «광고 보고 소환하는 거 매일 1번씩은 광고 없이 소환할 수 있게,
   가독성 있게 그럴 때는 광고 표시 없게».

   구현 요약 (index.html)
     · `SHOP_NOAD = 1`            — 상자별 하루 «무광고» 무료 소환 횟수(SHOP_FREE 2 회 중 앞의 1 회)
     · `S.daily.noAdSum[b]`       — 남은 무광고 횟수. 없는 키는 cap 폴백(freeLeft 와 같은 규약)
     · `useFreeSum(b)`            — 무료 소환 1회 차감. **무광고분을 먼저** 태운다
     · `.shp-card.nofad>.adbadge{display:none}` — 남아 있는 동안 그 칸의 ▶AD 를 감춘다

   ⚠ 이 게이트가 재는 것은 «뱃지가 사라졌다» 가 아니라 **«상태를 따라 정확히 뒤집히는가»** 다.
      광고 SDK 는 없으므로(124 ②) 소환 «동작» 자체는 안 바뀐다 — 그래서 [C] 가 «소환은 그대로
      되는가»(결과 팝업·아이템·다이아·횟수)를, [G]·[H] 가 음성 대조와 되돌림 시험을 맡는다.
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const ok = (n, pass, got) => R.push({ n, pass: !!pass, got: got === undefined ? '' : String(got) });
const eq = (n, got, want) => ok(n, got === want, got + ' / 기대 ' + want);

/* 소환 탭을 열고 칸별 «뱃지가 보이는가 / .nofad 인가» 를 한 벌로 읽는다.
   ⚠ `display` 를 직접 재는 이유: `.nofad` 클래스만 봐서는 «CSS 규칙이 살아 있는가» 를 못 잰다
      (클래스는 붙었는데 규칙이 없으면 뱃지가 그대로 보인다 — [H] 가 정확히 그 경우를 만든다). */
const RD = `(() => {
  openShopPage();
  const cards = [...document.querySelectorAll('#shopList .shp-card')];
  return {
    n: cards.length,
    nofad: cards.map(c => c.classList.contains('nofad')),
    adShown: cards.map(c => { const e = c.querySelector('.adbadge');
      return !!e && getComputedStyle(e).display !== 'none'; }),
    noAd: SHOP_BOXES.map(x => noAdSumLeft(x.b)),
    free: SHOP_BOXES.map(x => freeLeft(x.b))
  };
})()`;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(HTML);
  await p.waitForTimeout(900);
  /* 73 ③ — 가이드 미션이 «지금은 저 상자만» 으로 다른 상자 소환을 막는다(gmBlocked).
     190 은 그 규칙과 무관하므로 가이드를 끝낸 상태로 두고 무료 소환만 본다(verify76 과 같은 셋업). */
  await p.evaluate('S.dia = 1e9; S.guide.idx = GUIDE.length;');

  /* ══ [A] 기본 상태 — 오늘 무광고 1회가 남아 있으므로 5칸 전부 ▶AD 없음 ══ */
  console.log('[A] 기본 상태 (오늘 무광고 1회 남음)');
  const A = await p.evaluate(RD);
  eq('상자 칸 5장', A.n, 5);
  eq('SHOP_NOAD = 1', await p.evaluate('SHOP_NOAD'), 1);
  ok('5칸 전부 noAdSumLeft = 1', A.noAd.every(v => v === 1), A.noAd.join(','));
  ok('5칸 전부 freeLeft = 2 (무료 횟수 자체는 안 건드린다)', A.free.every(v => v === 2), A.free.join(','));
  ok('5칸 전부 .nofad', A.nofad.every(Boolean), A.nofad.join(','));
  ok('5칸 전부 ▶AD 안 보임', A.adShown.every(v => v === false), A.adShown.join(','));

  /* ══ [B] 첫 무료 소환(제품의 문 = 카드 버튼 클릭) → 그 칸만 ▶AD 복귀 ══ */
  console.log('[B] 무기 상자 무료 소환 1회 → 그 칸만 ▶AD 복귀');
  const B = await p.evaluate(`(() => {
    openShopPage();
    const before = { noAd: noAdSumLeft('weapon'), free: freeLeft('weapon') };
    document.querySelector('#shopList .shp-card .cbtn[data-shfree]').click();
    const popped = document.getElementById('sumw').classList.contains('on');
    closeSummonResult();
    return { before, popped, r: ${RD} };
  })()`);
  eq('소환 전 weapon noAdSumLeft', B.before.noAd, 1);
  ok('무료 소환이 실제로 돌았다(12 결과 팝업이 떴다)', B.popped === true, String(B.popped));
  eq('weapon noAdSumLeft 1 → 0', B.r.noAd[0], 0);
  eq('weapon freeLeft 2 → 1 (무광고분은 무료분 «안에서» 나간다)', B.r.free[0], 1);
  ok('weapon 칸에 ▶AD 복귀', B.r.adShown[0] === true && B.r.nofad[0] === false,
    'ad=' + B.r.adShown[0] + ' nofad=' + B.r.nofad[0]);
  ok('나머지 4칸은 그대로 무광고(배너별 독립)',
    B.r.adShown.slice(1).every(v => v === false) && B.r.noAd.slice(1).every(v => v === 1),
    'ad=' + B.r.adShown.join(',') + ' noAd=' + B.r.noAd.join(','));

  /* ══ [C] 두 번째 무료 소환 = 광고분. 소환 동작은 1도 안 바뀐다 ══ */
  console.log('[C] 두 번째 무료 소환 (광고분) — 소환 동작 무회귀');
  const C = await p.evaluate(`(() => {
    openShopPage();
    /* «몇 개 들어왔나» 는 S.own 합으로 세면 안 된다 — 만렙 중복분이 조각으로 빠지는 경로가 있어
       10연이 +9 로도 읽힌다(실측). 소환 횟수 자체(S.summons)가 이 절이 재려는 값이다. */
    const sum0 = S.summons, own0 = Object.values(S.own).reduce((s, o) => s + (o.n | 0), 0);
    document.querySelector('#shopList .shp-card .cbtn[data-shfree]').click();
    const popped = document.getElementById('sumw').classList.contains('on');
    const cards = document.querySelectorAll('#sumGridIn > *').length;
    closeSummonResult();
    const own1 = Object.values(S.own).reduce((s, o) => s + (o.n | 0), 0);
    return { popped, cards, summons: S.summons - sum0, gained: own1 - own0,
      noAd: noAdSumLeft('weapon'), free: freeLeft('weapon'), dia: S.dia };
  })()`);
  ok('광고분도 그대로 소환된다(결과 팝업)', C.popped === true, String(C.popped));
  eq('10연이 10회로 세어진다(S.summons)', C.summons, 10);
  ok('결과 칸이 실제로 그려진다', C.cards > 0, C.cards + '칸');
  ok('아이템이 실제로 들어온다', C.gained > 0, '+' + C.gained + '개');
  eq('noAdSumLeft 는 0 에서 더 안 내려간다', C.noAd, 0);
  eq('freeLeft 1 → 0', C.free, 0);
  eq('무료 소환이라 다이아는 안 나간다', C.dia, 1e9);

  /* ══ [D] 12 결과 팝업의 무료 버튼(#sumBF)도 같은 문(useFreeSum)을 쓴다 ══ */
  console.log('[D] 12 결과 팝업 무료 버튼도 같은 문');
  const D = await p.evaluate(`(() => {
    S.daily.freeSum.shield = 2; S.daily.noAdSum.shield = 1;
    sumCtx = 'shield';
    document.getElementById('sumBF').onclick();
    const r = { noAd: noAdSumLeft('shield'), free: freeLeft('shield') };
    closeSummonResult();
    return r;
  })()`);
  eq('#sumBF 로도 무광고분이 먼저 나간다', D.noAd, 0);
  eq('#sumBF 로도 무료 횟수 2 → 1', D.free, 1);

  /* ══ [E] 저장·복원 — 리로드해도 «쓴 상태» 가 남는다 ══ */
  console.log('[E] 저장 → 리로드');
  await p.evaluate(`(() => {
    S.daily.noAdSum = { weapon:0, shield:0, amulet:1, skill:1, pet:1 };
    S.daily.freeSum = { weapon:1, shield:1, amulet:2, skill:2, pet:2 };
    save();
  })()`);
  await p.reload();
  await p.waitForTimeout(900);
  await p.evaluate('S.dia = 1e9; S.guide.idx = GUIDE.length;');
  const E = await p.evaluate(RD);
  eq('리로드 후 noAdSum 유지', E.noAd.join(','), '0,0,1,1,1');
  eq('리로드 후 뱃지도 그대로(앞 2칸만 ▶AD)', E.adShown.join(','), 'true,true,false,false,false');

  /* ══ [F] 일일 초기화 · 구 세이브 폴백 ══ */
  console.log('[F] 일일 초기화 · 구 세이브 폴백');
  const F = await p.evaluate(`(() => {
    S.daily.date = '1999-1-1'; dailyCheck();
    const after = SHOP_BOXES.map(x => noAdSumLeft(x.b));
    delete S.daily.noAdSum;                      /* 190 키가 없는 구 세이브 */
    const fallback = SHOP_BOXES.map(x => noAdSumLeft(x.b));
    S.daily.noAdSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = SHOP_NOAD, o), {});
    return { after, fallback };
  })()`);
  ok('날짜가 바뀌면 5칸 전부 1 로 충전', F.after.every(v => v === 1), F.after.join(','));
  ok('키 없는 구 세이브는 cap(1) 으로 폴백', F.fallback.every(v => v === 1), F.fallback.join(','));

  /* ══ [G] 음성 대조 + 124 이용권과의 합성 ══ */
  console.log('[G] 음성 대조 · 124 광고 제거 이용권과 합성');
  const G = await p.evaluate(`(() => {
    SHOP_BOXES.forEach(x => useFreeSum(x.b));    /* 무광고분 전부 소진 → .nofad 없음 */
    const mid = ${RD};
    S.pass.noAds = true; syncNoAds();
    const on = ${RD};
    S.pass.noAds = false; syncNoAds();
    const off = ${RD};
    return { mid, on, off };
  })()`);
  ok('소진 상태에서는 5칸 전부 ▶AD 가 보인다(음성 대조)',
    G.mid.adShown.every(v => v === true), G.mid.adShown.join(','));
  ok('이용권을 켜면 5칸 전부 다시 숨김(124)', G.on.adShown.every(v => v === false), G.on.adShown.join(','));
  ok('이용권을 끄면 다시 보인다', G.off.adShown.every(v => v === true), G.off.adShown.join(','));

  await p.close();

  /* ══ [H] 되돌림 시험 — `.nofad` 규칙을 죽이면 [A] 가 빨개져야 한다 ══ */
  console.log('[H] 되돌림 시험 (CSS 규칙 무력화)');
  const rc = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const rp = await rc.newPage();
  rp.on('pageerror', e => errs.push(String(e)));
  await rp.goto(HTML);
  await rp.waitForTimeout(900);
  await rp.addStyleTag({ content: '.shp-card.nofad>.adbadge{display:block !important}' });
  const H = await rp.evaluate(RD);
  ok('규칙을 되돌리면 기본 상태에서 ▶AD 가 보인다(= 옛 증상)',
    H.adShown.every(v => v === true), H.adShown.join(','));
  ok('되돌려도 .nofad 클래스는 그대로 붙는다(붙이는 쪽과 그리는 쪽이 갈려 있다)',
    H.nofad.every(Boolean), H.nofad.join(','));
  await rp.close();

  await b.close();

  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | ') || '0건');

  const bad = R.filter(r => !r.pass);
  R.forEach(r => console.log('  ' + (r.pass ? 'PASS' : 'FAIL') + ' ' + r.n + (r.got ? ' — ' + r.got : '')));
  console.log('VERIFY190 ' + (R.length - bad.length) + '/' + R.length + ' ' + (bad.length ? 'FAIL' : 'PASS'));
  process.exit(bad.length ? 1 : 0);
})();
