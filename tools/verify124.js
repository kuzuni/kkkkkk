/* 124 검증 — 10 상점 «이용권» 탭 (평생 광고 제거 · 자동 축복)
   [3]-(가) 기계적/기능 작업 검증: 비평가 없이 «DOM 실측 + 실동작 + 저장 반영» 으로 판정한다.
   실행: node tools/verify124.js   (1080x2280 · 헤드리스)

   자동 축복 오프라인 정산은 **여기서 독립적으로 다시 시뮬**해 기대값을 만든다(게임 코드를
   그대로 불러 쓰면 «자기 자신과 비교» 가 되어 아무것도 검증하지 못한다).
   시각 경계 문제: 페이지의 Date.now() 는 하네스가 세이브를 쓴 시각보다 수백 ms 뒤다.
   그래서 «마지막 발동 ~ 지금» 과 «지금 ~ 다음 발동» 이 **둘 다 90초 이상** 떨어지는
   경과시간을 후보 중에서 골라 쓴다(경계에 걸려 발동 수가 1 흔들리는 것을 원천 차단). */
const { chromium } = require('playwright');
const path = require('path');

const W = 1080, H = 2280;
const KEY = 'idle_hunter_save_v4';
const DAY = 24 * 3600 * 1000;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);
/* 122·60 — «300ms 면 열기 연출이 끝났겠지» 는 낡은 가정이다. 느린 러너에서는 페이지 등장 팝이
   300~520ms 뒤에 끝나고, 그 중간에 재면 `#shopCats` 가 0.985 로 줄어든 채 찍혀 124 와 무관한
   FAIL 이 뜬다(verify45 가 같은 이유로 먼저 겪었다). 애니메이션이 끝날 때까지 기다린다. */
const settled = async page => {
  await page.evaluate(() => Promise.all(
    document.getElementById('shopw').getAnimations().map(a => a.finished.catch(() => {}))));
  await page.waitForTimeout(60);
};

/* ── 게임과 **독립인** 축복 모델 (index.html 의 상수와 같은 값을 손으로 다시 적는다) ── */
const B_KEYS = ['atk', 'hp', 'rate'];
const B_BASE = 30 * 60 * 1000, B_PERLV = 5 * 60 * 1000, B_STEP = 4, B_MAXLV = 51;
const durAt = lv => B_BASE + B_PERLV * (Math.min(B_MAXLV, Math.max(1, lv)) - 1);
/* «가장 먼저 만료되는 축복 하나» 를 시간순으로 재발동. lastTime ~ min(now, until) 구간만. */
function sim(bless, lastTime, until, now) {
  let lv = bless.lv, prog = bless.prog, fires = 0;
  const t = {}; B_KEYS.forEach(k => t[k] = bless.exp[k] || 0);
  const end = Math.min(now, until);
  let last = -Infinity, next = Infinity;
  for (let g = 0; g < 20000; g++) {
    let k = null, tm = Infinity;
    B_KEYS.forEach(x => { if (t[x] < tm) { tm = t[x]; k = x; } });
    const at = Math.max(tm, lastTime);
    if (at > end) { next = at; break; }
    if (lv < B_MAXLV) { if (++prog >= B_STEP) { prog -= B_STEP; lv++; } } else prog = 0;
    t[k] = at + durAt(lv);
    last = at; fires++;
  }
  return { lv, prog, fires, exp: t, last, next };
}
/* 경계에서 90초 이상 떨어진 경과시간을 고른다 */
function safeElapsed(bless, until0, cands) {
  for (const ms of cands) {
    const now = 1e12, lastTime = now - ms;      /* 상대 관계만 보면 되므로 기준 시각은 아무 값 */
    const r = sim(bless, lastTime, lastTime + until0, now);
    if (r.fires > 0 && now - r.last > 90e3 && r.next - now > 90e3) return ms;
  }
  return cands[0];
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const boot = async () => { await page.goto(URL); await page.waitForTimeout(900); };
  const reboot = async () => { await page.reload(); await page.waitForTimeout(1100); };
  await boot();

  /* ================= 1. 탭 3칸 ================= */
  console.log('\n[1] 카테고리 탭 3칸 (소환 · 재화 · 이용권)');
  const mk = await page.evaluate(() => ({
    cats: [...document.querySelectorAll('#shopCats .shp-ct')].map(e => e.dataset.cat),
    labels: [...document.querySelectorAll('#shopCats .shp-ct>i')].map(e => e.textContent),
    sp3: document.getElementById('shopCats').classList.contains('sp3'),
    sp2: document.getElementById('shopCats').classList.contains('sp2'),
  }));
  ok('data-cat = summon,coin,pass', mk.cats.join(',') === 'summon,coin,pass', mk.cats.join(','));
  ok('라벨 = 소환,재화,이용권', mk.labels.join(',') === '소환,재화,이용권', mk.labels.join(','));
  ok('바가 .sp3 (.sp2 폐기)', mk.sp3 && !mk.sp2, 'sp3=' + mk.sp3 + ' sp2=' + mk.sp2);

  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300); await settled(page);
  const g = await page.evaluate(() => {
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, w: b.width, cx: b.x + b.width / 2 }; };
    const bar = document.getElementById('shopCats');
    return { bar: r(bar), bw: parseFloat(getComputedStyle(bar).borderTopWidth),
      cells: [...bar.querySelectorAll('.shp-ct')].map(r),
      inks: [...bar.querySelectorAll('.shp-ct>i')].map(e => {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const b = rg.getBoundingClientRect(); return { x: b.x, w: b.width, cx: b.x + b.width / 2 };
      }) };
  });
  const inner = g.bar.w - g.bw * 2, sw = inner / 3;
  ok('칸 3개', g.cells.length === 3, g.cells.length + '개');
  ok('칸 폭 = 패딩박스 ÷3 = ' + sw.toFixed(1), g.cells.every(c => near(c.w, sw)),
    g.cells.map(c => c.w.toFixed(1)).join(' / '));
  ok('칸 3개가 빈틈·겹침 없이 이어짐',
    near(g.cells[0].x + g.cells[0].w, g.cells[1].x) && near(g.cells[1].x + g.cells[1].w, g.cells[2].x),
    'Δ' + (g.cells[1].x - g.cells[0].x - g.cells[0].w).toFixed(2)
    + ' / Δ' + (g.cells[2].x - g.cells[1].x - g.cells[1].w).toFixed(2));
  ok('칸3 오른끝 = 바 안쪽 오른끝', near(g.cells[2].x + g.cells[2].w, g.bar.x + g.bar.w - g.bw),
    (g.cells[2].x + g.cells[2].w).toFixed(1));
  g.inks.forEach((l, i) => ok('라벨' + (i + 1) + ' 잉크가 칸 안 중앙 (±3px, 잘림 0)',
    near(l.cx, g.cells[i].cx, 3) && l.x >= g.cells[i].x - 0.5 && l.x + l.w <= g.cells[i].x + g.cells[i].w + 0.5,
    '잉크 ' + l.x.toFixed(1) + '~' + (l.x + l.w).toFixed(1) + ' / 칸 ' + g.cells[i].x.toFixed(1)
    + '~' + (g.cells[i].x + g.cells[i].w).toFixed(1)));

  /* ================= 2. 이용권 탭 — 카드 2장 ================= */
  console.log('\n[2] 이용권 탭 — 카드 2장 · 미보유 상태');
  await page.click('#shopCats .shp-ct[data-cat="pass"]');
  await page.waitForTimeout(350); await settled(page);
  const pv = await page.evaluate(() => {
    const cds = [...document.querySelectorAll('#shopList .cn-cd.pv')];
    const F = document.getElementById('app').getBoundingClientRect();
    const s = F.width / 1080;
    return {
      cat: shopCat, cls: document.getElementById('shopList').classList.contains('pass'),
      n: cds.length,
      names: cds.map(c => c.querySelector('.hd>i').textContent),
      st: cds.map(c => c.querySelector('.st>i').textContent),
      buy: cds.map(c => { const b = c.querySelector('[data-pvbuy]'); return b ? b.dataset.pvbuy : null; }),
      price: cds.map(c => { const b = c.querySelector('[data-pvbuy] .pr'); return b ? b.textContent : null; }),
      /* 카드 안 요소가 카드 밖으로 새지 않는지(잘림·삐져나옴 0) */
      spill: cds.map(c => {
        const cb = c.getBoundingClientRect();
        return [...c.querySelectorAll('*')].filter(e => {
          /* `.hd>i` 는 «박스를 글리프 advance 보다 넓게» 규약(A1 교훈)이라 일부러 카드보다 넓다 */
          if (e.parentElement && e.parentElement.classList.contains('hd')) return false;
          const b = e.getBoundingClientRect();
          return b.width > 0 && (b.x < cb.x - 1 || b.right > cb.right + 1 || b.y < cb.y - 1 || b.bottom > cb.bottom + 1);
        }).map(e => e.className || e.tagName);
      }),
      /* 상태 띠와 수량(.qt) 이 겹치지 않는지 */
      overlap: cds.map(c => {
        const a = c.querySelector('.st').getBoundingClientRect(), b = c.querySelector('.qt').getBoundingClientRect();
        return !(a.bottom <= b.y || b.bottom <= a.y || a.right <= b.x || b.right <= a.x);
      }),
      wrapH: Math.round(document.querySelector('#shopList .cn-wrap.pv').getBoundingClientRect().height / s),
    };
  });
  ok('shopCat = pass · #shopList.pass', pv.cat === 'pass' && pv.cls, pv.cat + ' / ' + pv.cls);
  ok('이용권 카드 2장', pv.n === 2, pv.n + '장');
  ok('카드 이름 = 광고 제거 · 자동 축복', pv.names.join(',') === '광고 제거,자동 축복', pv.names.join(','));
  ok('둘 다 «미보유»', pv.st.join(',') === '미보유,미보유', pv.st.join(','));
  ok('구매 버튼 2개 (noads · abless)', pv.buy.join(',') === 'noads,abless', pv.buy.join(','));
  ok('가격이 다이아로 표시된다', pv.price.every(p => p && p.indexOf('💎') === 0), JSON.stringify(pv.price));
  ok('카드 밖으로 새는 요소 0', pv.spill.every(a => a.length === 0), JSON.stringify(pv.spill));
  ok('상태 띠 ↔ 수량 겹침 0', pv.overlap.every(v => v === false), JSON.stringify(pv.overlap));
  ok('페이지 높이 = 카드·안내문·바를 담는다(≥1100)', pv.wrapH >= 1100, pv.wrapH + 'px');

  /* ================= 3. 다이아 부족 → 구매 거절 ================= */
  console.log('\n[3] 다이아 부족 시 구매 거절 (재화가 줄지 않는다)');
  const lack = await page.evaluate(() => {
    S.dia = 10; renderPassPage(document.getElementById('shopList'));
    const before = S.dia, r = buyPass('noads');
    return { r: r, dia: S.dia, before: before, noAds: !!S.pass.noAds };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('구매 실패(false) · 다이아 그대로 · noAds 미설정',
    lack.r === false && lack.dia === lack.before && lack.noAds === false,
    'r=' + lack.r + ' dia=' + lack.dia + ' noAds=' + lack.noAds);

  /* ================= 4. 광고 제거 구매 → 표식·문구·저장 ================= */
  console.log('\n[4] 평생 광고 제거 구매');
  const buy = await page.evaluate(() => {
    S.dia = 1e9;
    const p = PASS_ITEMS.find(x => x.id === 'noads'), d0 = S.dia;
    const r = buyPass('noads');
    return { r: r, cost: d0 - S.dia, price: p.dia, noAds: !!S.pass.noAds,
      cls: document.getElementById('app').classList.contains('noads'),
      saved: !!(JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').pass || {}).noAds };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('구매 성공 · 다이아가 정가만큼 빠짐', buy.r === true && buy.cost === buy.price,
    '차감 ' + buy.cost + ' / 정가 ' + buy.price);
  ok('S.pass.noAds = true', buy.noAds === true, String(buy.noAds));
  ok('#app.noads 클래스', buy.cls === true, String(buy.cls));
  ok('localStorage 에 저장됨', buy.saved === true, String(buy.saved));

  const adv = await page.evaluate(() => {
    document.querySelector('#shopCats [data-cat="coin"]').click();
    const cd = document.querySelector('#shopList .cn-cd:not(.done)');
    const badge = cd.querySelector('.bt>.ad');
    const mv = document.getElementById('cnMove');
    return { lab: cd.querySelector('.bt>.lab').textContent,
      adVis: badge ? getComputedStyle(badge).display : 'none',
      mv: mv.querySelector('i').textContent, mvOff: mv.classList.contains('off') };
  });
  ok('13 광고 상품 라벨 = «무료 수령»', adv.lab === '무료 수령', adv.lab);
  ok('13 ▶AD 뱃지 숨김', adv.adVis === 'none', adv.adVis);
  ok('13 §6 배너 = «구매 완료»(잠김)', adv.mv === '구매 완료' && adv.mvOff, adv.mv + ' off=' + adv.mvOff);

  /* 광고 상품 클릭 → 즉시 수령 · 일일 횟수는 그대로 줄어든다 */
  const claim = await page.evaluate(() => {
    const a = COIN_ADS[0];
    S.dia = 0; S.daily.adBuy = {};
    renderCoinPage(document.getElementById('shopList'));
    const before = S.dia, l0 = adLeft(a);
    document.querySelector('#shopList [data-cnad="' + a.id + '"]').click();
    return { got: S.dia - before, want: a.r.dia, l0: l0, l1: adLeft(a) };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('광고 상품 클릭 → 즉시 수령(재화 증가)', claim.got === claim.want, '+' + claim.got + ' / 기대 ' + claim.want);
  ok('일일 횟수 제한은 유지된다', claim.l1 === claim.l0 - 1, claim.l0 + ' → ' + claim.l1);

  const adOther = await page.evaluate(() => {
    document.querySelector('#shopCats [data-cat="summon"]').click();
    const b = document.querySelector('#shopList .shp-card .adbadge');
    const of = document.querySelector('.ofr-ad');
    return { sum: b ? getComputedStyle(b).display : 'missing',
      ofr: of ? getComputedStyle(of).display : 'missing' };
  });
  ok('10 무료 소환 ▶AD 숨김', adOther.sum === 'none', adOther.sum);
  ok('01 오프라인 «1.5배 받기» AD 숨김', adOther.ofr === 'none', adOther.ofr);

  /* ================= 5. 자동 축복 구매 → 즉시 3종 활성 ================= */
  console.log('\n[5] 자동 축복 이용권 구매');
  const ab = await page.evaluate(() => {
    S.dia = 1e9;
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    const t0 = Date.now(), r = buyPass('abless');
    return { r: r, until: S.pass.autoBlessUntil, t0: t0,
      on: BLESS.map(x => blessOn(x.k)), lv: S.bless.lv, prog: S.bless.prog,
      days: autoBlessDays() };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('구매 성공', ab.r === true, String(ab.r));
  ok('만료 = 지금 + 30일 (±5초)', Math.abs(ab.until - (ab.t0 + 30 * DAY)) < 5000,
    new Date(ab.until).toISOString());
  ok('구매 즉시 3종 축복이 켜진다', ab.on.every(Boolean), JSON.stringify(ab.on));
  ok('3회 발동분이 축복 경험치에 들어간다 (Lv1 · 3/4)', ab.lv === 1 && ab.prog === 3,
    'Lv' + ab.lv + ' · ' + ab.prog + '/4');
  ok('남은 일수 = 30', ab.days === 30, ab.days + '일');

  /* ================= 6. 오프라인 정산 — 12시간 ================= */
  console.log('\n[6] 오프라인 정산 — 이용권 유효 구간(12시간)');
  const bless0 = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
  /* 12h 근처에서 경계 90초 이상 떨어진 경과시간을 고른다 */
  const el12 = safeElapsed(bless0, 30 * DAY,
    [12 * 3600e3, 12 * 3600e3 + 137e3, 12 * 3600e3 + 311e3, 12 * 3600e3 + 523e3, 12 * 3600e3 + 907e3]);
  const r6 = await page.evaluate(async ([key, el, day, b0]) => {
    const now = Date.now();
    const raw = JSON.parse(localStorage.getItem(key));
    raw.time = now - el;                               /* «마지막 저장» 을 12시간 전으로 */
    raw.bless = b0;
    raw.pass = Object.assign({}, raw.pass, { noAds: true, autoBlessUntil: now + 30 * day });
    localStorage.setItem(key, JSON.stringify(raw));
    /* ⚠ index.html 은 beforeunload 에 save() 를 걸어 둔다 — reload 하면 «지금 메모리의 S» 가
       방금 심은 세이브를 덮는다(리스너가 함수 참조를 잡고 있어 save 를 덮어써도 소용없다).
       그래서 setItem 자체를 막는다. 새로 로드된 페이지에서는 프로토타입이 원래대로 돌아온다. */
    Storage.prototype.setItem = function () {};
    return { lastTime: raw.time, until: raw.pass.autoBlessUntil };
  }, [KEY, el12, DAY, bless0]);
  await reboot();
  const got6 = await page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog, exp: Object.assign({}, S.bless.exp),
    on: BLESS.map(x => blessOn(x.k)),
    line: (document.getElementById('ofrAuto') || {}).textContent,
    lineOn: !!(document.getElementById('ofrAuto') || { classList: { contains: () => false } }).classList.contains('on'),
    now: Date.now(),
  }));
  const want6 = sim(bless0, r6.lastTime, r6.until, got6.now);
  ok('축복 Lv 가 시뮬 기대값과 일치', got6.lv === want6.lv, '게임 Lv' + got6.lv + ' / 기대 Lv' + want6.lv);
  ok('축복 경험치(prog)가 시뮬 기대값과 일치', got6.prog === want6.prog,
    got6.prog + '/4 / 기대 ' + want6.prog + '/4');
  ok('발동 수 = (Lv−1)×4 + prog = ' + want6.fires,
    (got6.lv - 1) * 4 + got6.prog === want6.fires, ((got6.lv - 1) * 4 + got6.prog) + '회');
  ok('3종 만료 시각이 시뮬과 일치 (±0ms)',
    B_KEYS.every(k => got6.exp[k] === want6.exp[k]),
    B_KEYS.map(k => (got6.exp[k] - want6.exp[k])).join(' / ') + ' ms 차');
  ok('정산 후 3종이 전부 켜져 있다', got6.on.every(Boolean), JSON.stringify(got6.on));
  ok('01 오프라인 팝업에 «자동 축복 n회 발동 · 축복 Lv a→b» 한 줄', got6.lineOn
    && /자동 축복 \d+회 발동 · 축복 Lv \d+→\d+/.test(got6.line || ''), (got6.line || '(없음)').trim());

  /* ================= 7. 이용권 만료 이후 구간은 계산하지 않는다 ================= */
  console.log('\n[7] 이용권 만료 이후 구간 미계산');
  const r7 = await page.evaluate(async ([key, day, b0]) => {
    const now = Date.now();
    const raw = JSON.parse(localStorage.getItem(key));
    raw.time = now - 12 * 3600e3;                     /* 12시간 전에 저장 */
    raw.bless = b0;
    raw.pass = Object.assign({}, raw.pass, { autoBlessUntil: now - 6 * 3600e3 });  /* 6시간 전 만료 */
    localStorage.setItem(key, JSON.stringify(raw));
    Storage.prototype.setItem = function () {};      /* [6] 과 같은 이유 */
    return { lastTime: raw.time, until: raw.pass.autoBlessUntil };
  }, [KEY, DAY, bless0]);
  await reboot();
  const got7 = await page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog, exp: Object.assign({}, S.bless.exp),
    on: BLESS.map(x => blessOn(x.k)), now: Date.now(),
  }));
  const want7 = sim(bless0, r7.lastTime, r7.until, got7.now);
  const wantFull = sim(bless0, r7.lastTime, r7.lastTime + 99 * DAY, got7.now);
  ok('만료 시각까지만 발동 (Lv·prog 일치)', got7.lv === want7.lv && got7.prog === want7.prog,
    '게임 Lv' + got7.lv + '·' + got7.prog + '/4 / 기대 Lv' + want7.lv + '·' + want7.prog + '/4');
  ok('«만료 무시» 였다면 더 많이 발동했을 것 (' + want7.fires + ' < ' + wantFull.fires + ')',
    want7.fires < wantFull.fires && (got7.lv - 1) * 4 + got7.prog === want7.fires,
    got7.lv + '/' + got7.prog);
  ok('만료 6시간 뒤라 지금은 축복이 전부 꺼져 있다', got7.on.every(v => v === false), JSON.stringify(got7.on));

  /* ================= 8. 이용권 없으면 옛 동작 그대로 ================= */
  console.log('\n[8] 이용권 미보유 — 옛 동작 그대로');
  await page.evaluate(([key]) => {
    const raw = JSON.parse(localStorage.getItem(key));
    raw.time = Date.now() - 12 * 3600e3;
    raw.bless = { lv: 3, prog: 2, exp: { atk: 0, hp: 0, rate: 0 } };
    raw.pass = { prem: {}, got: {} };                 /* 두 이용권 키를 아예 지운다 */
    localStorage.setItem(key, JSON.stringify(raw));
    Storage.prototype.setItem = function () {};      /* [6] 과 같은 이유 */
  }, [KEY]);
  await reboot();
  const got8 = await page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog, on: BLESS.map(x => blessOn(x.k)),
    noAds: S.pass.noAds, until: S.pass.autoBlessUntil,
    cls: document.getElementById('app').classList.contains('noads'),
    lineOn: document.getElementById('ofrAuto').classList.contains('on'),
  }));
  ok('구 세이브(pass 키 없음) → noAds=false · autoBlessUntil=0',
    got8.noAds === false && got8.until === 0, 'noAds=' + got8.noAds + ' until=' + got8.until);
  ok('#app.noads 안 붙음', got8.cls === false, String(got8.cls));
  ok('자동 발동 0회 — 축복 Lv·prog 그대로(3 · 2/4)', got8.lv === 3 && got8.prog === 2,
    'Lv' + got8.lv + ' · ' + got8.prog + '/4');
  ok('축복은 꺼진 채로 남는다', got8.on.every(v => v === false), JSON.stringify(got8.on));
  ok('정산 한 줄도 숨김', got8.lineOn === false, String(got8.lineOn));
  const lab8 = await page.evaluate(() => {
    openShopPage();
    document.querySelector('#shopCats [data-cat="coin"]').click();
    const cd = document.querySelector('#shopList .cn-cd:not(.done)');
    return { lab: cd.querySelector('.bt>.lab').textContent,
      ad: getComputedStyle(cd.querySelector('.bt>.ad')).display,
      mv: document.getElementById('cnMove').querySelector('i').textContent };
  });
  ok('13 라벨 = «받기» · ▶AD 보임 · 배너 «이동»',
    lab8.lab === '받기' && lab8.ad !== 'none' && lab8.mv === '이동',
    lab8.lab + ' / ad=' + lab8.ad + ' / ' + lab8.mv);
  /* §6 배너 [이동] → 이용권 탭으로 간다 */
  const mv = await page.evaluate(() => { document.getElementById('cnMove').click(); return shopCat; });
  ok('§6 배너 [이동] → 이용권 탭', mv === 'pass', String(mv));

  /* ================= 9. 콘솔 ================= */
  console.log('\n[9] 콘솔');
  ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  await page.evaluate(() => { document.querySelector('#shopCats [data-cat="pass"]').click(); });
  await page.waitForTimeout(300); await settled(page);
  await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/124-r1.png') });
  await browser.close();
  console.log('\nVERIFY124 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' — PASS'));
  process.exit(fail ? 1 : 0);
})();
