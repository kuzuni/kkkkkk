/* 작업 43 — 18 패배 화면 카드 2 문구 개정 회귀 스크립트
   «골드로 햄지와 매옹이를 훈련시키세요» → «골드로 훈련하세요» (캐릭터 «용사» 1명 확정)
   지시서 [3]-(가) «기계적 작업» 검증: 비평가 없이 헤드리스로
   ① 문구 교체(본문 + 외곽선 .ov 두 겹) ② 카드 크기·배치 불변 ③ 세로 가운데 정렬 유지
   ④ 겹침·잘림 0건 ⑤ 콘솔/페이지 에러 0건 을 전수 확인한다.
   실행: node verify43.js   (playwright@1.56.0 필요)
   #defw / .df-txt 구간을 다시 손대는 세션은 손대기 전/후로 돌려 회귀 0 을 확인할 것.

   좌표는 전부 «프레임 px»(1080 기준)로 환산해서 본다 — #app 의 rect 를 원점·스케일로 쓴다. */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, 'index.html');
const OLD = '골드로 햄지와 매옹이를 훈련시키세요';
const NEW = '골드로 훈련하세요';

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '  OK   ' : '  FAIL ') + n + (d === undefined ? '' : '  → ' + d)); };
const near = (n, got, want, tol) => ok(n + ' = ' + want + ' ±' + tol, Math.abs(got - want) <= tol, Math.round(got * 10) / 10);

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 패배 화면을 «표시 전용» 으로 연다 (자동 부활 로직은 건드리지 않는다) */
  await page.evaluate(() => openDefeat());
  await page.waitForTimeout(400);

  /* 28-③ 교훈: 캔버스의 흰 데미지 숫자가 캡처를 오염시키므로 캡처 직전 #view 를 내린다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  const R = await page.evaluate(({ OLD, NEW }) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;
    const F = r => ({                       /* client rect → 프레임 px */
      x: (r.left - app.left) / sc, y: (r.top - app.top) / sc,
      w: r.width / sc, h: r.height / sc,
      r: (r.right - app.left) / sc, b: (r.bottom - app.top) / sc
    });
    const inkOf = el => {                   /* 29-③ 교훈: 박스가 아니라 «글자 실폭» 을 잰다 */
      const rg = document.createRange(); rg.selectNodeContents(el);
      return F(rg.getBoundingClientRect());
    };
    const card = n => {
      const c = document.querySelector('.df-card.c' + n);
      const txt = c.querySelector('.df-txt');
      const body = txt.querySelector('i:not(.ov)');
      const ov = txt.querySelector('i.ov');
      const btn = c.querySelector('.df-btn');
      const ic = c.querySelector('.df-ic,.df-ic1,.df-ic3');
      return {
        card: F(c.getBoundingClientRect()),
        txt: F(txt.getBoundingClientRect()),
        body: F(body.getBoundingClientRect()), bodyInk: inkOf(body),
        ov: F(ov.getBoundingClientRect()), ovInk: inkOf(ov),
        bodyTxt: body.textContent, ovTxt: ov.textContent,
        btn: btn ? F(btn.getBoundingClientRect()) : null,
        ic: ic ? F(ic.getBoundingClientRect()) : null,
        txtAlign: getComputedStyle(txt).alignItems,
        sx: getComputedStyle(body).transform
      };
    };
    return {
      sc, defwOn: document.getElementById('defw').classList.contains('on'),
      hasOld: document.getElementById('defw').textContent.includes(OLD),
      newCount: (document.getElementById('defw').innerHTML.split(NEW).length - 1),
      c1: card(1), c2: card(2), c3: card(3)
    };
  }, { OLD, NEW });

  console.log('\n[1] 문구 교체 (본문 + 외곽선 .ov 두 겹)');
  ok('#defw 가 열려 있다', R.defwOn);
  ok('구 문구 «' + OLD + '» 잔재 0건', !R.hasOld);
  ok('카드2 본문 i = «' + NEW + '»', R.c2.bodyTxt === NEW, JSON.stringify(R.c2.bodyTxt));
  ok('카드2 외곽선 i.ov = «' + NEW + '»', R.c2.ovTxt === NEW, JSON.stringify(R.c2.ovTxt));
  ok('두 겹 모두 교체 (문자열 등장 2회)', R.newCount === 2, R.newCount);
  ok('카드1 문구 불변', R.c1.bodyTxt === '상점에서 무기, 방어구, 스킬을 소환하세요', JSON.stringify(R.c1.bodyTxt));
  ok('카드3 문구 불변', R.c3.bodyTxt.startsWith('게임 속 UI의 레드닷'), JSON.stringify(R.c3.bodyTxt));

  /* ⚑ 작업 536 (2026-08-30) — 이 절의 기대 top 은 **705 / 885 / 1065** 였다(= ref y − 210).
     그 «−210» 은 1920 프레임 시절의 **화면별 변환**이고 지시서 [2] 가 2026-08-25 에 폐기했다
     (현행은 «프레임 y = 레퍼런스 y − 84» 하나뿐 — 상태바 84px). 제품은 그 개정을 따라갔는데
     (엠블럼 top 458 = 542−84 · 카드 831/1011/1191) 자만 옛 값에 굳어 «+126px 밀렸다» 로 읽혔다.
     **제품 0줄** — 재현·대조는 `node tools/probe536.js` (24/24: 앵커 5종이 전부 ref−84 ·
     측정표 §6 gap 표가 전부 생존 · 찍힌 픽셀 838/1018/1198 = outer+검정 6).
     그래서 숫자를 손으로 다시 적지 않고 **측정표 값에서 파생**한다 — 변환이 또 바뀌면 STATUS 한 개만
     움직이고, «어느 변환을 쓰는 자인가» 가 코드에 남는다(402 «표 두 벌» 부패 예방). */
  const REF_TOP = [915, 1095, 1275];  // 측정표 18 §4.1 «카드 outer 상변» (ref 1080×2340 절대 px)
  const STATUS = 84;                  // 지시서 [2] — 프레임 y = 레퍼런스 y − 84
  console.log('\n[2] 카드 크기·배치 불변 (측정표 18: left 91 · w 898 · h 166 · ref top '
    + REF_TOP.join('/') + ' − 상태바 ' + STATUS + ' = ' + REF_TOP.map(t => t - STATUS).join('/') + ')');
  for (const n of [1, 2, 3]) {
    const c = R['c' + n].card;
    near('c' + n + ' left', c.x, 91, 1); near('c' + n + ' top', c.y, REF_TOP[n - 1] - STATUS, 1);
    near('c' + n + ' width', c.w, 898, 1); near('c' + n + ' height', c.h, 166, 1);
  }
  /* 변환과 **무관한** 축 — 오프셋이 어떻게 바뀌어도 살아 있어야 하는 값이다(측정표 §4.1 pitch · §6 gap).
     536 이 «제품이 옳다» 를 이 축들로 갈랐으므로 자에도 남긴다: 다음에 그릇이 진짜로 옮기면
     top 만이 아니라 여기가 같이 빨개져 «변환 개정» 과 «회귀» 가 구별된다. */
  near('pitch c1→c2 (측정표 §4.1 «정확히 180»)', R.c2.card.y - R.c1.card.y, 180, 1);
  near('pitch c2→c3', R.c3.card.y - R.c2.card.y, 180, 1);
  near('카드1 하변 → 카드2 상변 gap (측정표 §6)', R.c2.card.y - (R.c1.card.y + R.c1.card.h), 14, 1);
  near('카드2 하변 → 카드3 상변 gap', R.c3.card.y - (R.c2.card.y + R.c2.card.h), 14, 1);

  console.log('\n[3] 세로 가운데 정렬 유지 · 두 겹 정합');
  ok('.df-txt align-items:center', R.c2.txtAlign === 'center', R.c2.txtAlign);
  const cyCard = R.c2.card.y + R.c2.card.h / 2, cyInk = R.c2.bodyInk.y + R.c2.bodyInk.h / 2;
  near('카드2 글자 잉크 중심 y − 카드 중심 y', cyInk - cyCard, 0, 2);
  near('본문/외곽선 잉크 left Δ', R.c2.ovInk.x - R.c2.bodyInk.x, 0, 0.5);
  near('본문/외곽선 잉크 width Δ', R.c2.ovInk.w - R.c2.bodyInk.w, 0, 0.5);
  near('본문/외곽선 잉크 top Δ', R.c2.ovInk.y - R.c2.bodyInk.y, 0, 0.5);
  ok('카드2 scaleX(.875) 유지', /matrix\(0\.875/.test(R.c2.sx), R.c2.sx);
  /* .df-txt{left:177} 은 카드의 «패딩 박스» 기준이다 (03 교훈: 테두리 두께만큼 자식이 밀린다).
     카드 border 7px 이라 프레임 절대 x 는 91+177+7 = 275 — 세 카드가 같은 값이어야 한다. */
  near('카드2 문구 시작 x = 카드1 과 동일 (좌정렬 축 유지)', R.c2.bodyInk.x, R.c1.bodyInk.x, 0.5);
  near('카드2 문구 시작 x = 카드3 과 동일', R.c2.bodyInk.x, R.c3.bodyInk.x, 0.5);
  near('문구 시작 x 절대값 (91 카드 + 7 테두리 + 177)', R.c2.bodyInk.x, 275, 2);

  console.log('\n[4] 겹침·잘림 0건');
  for (const n of [1, 2, 3]) {
    const c = R['c' + n];
    ok('c' + n + ' 글자가 카드 안 (right ' + Math.round(c.bodyInk.r) + ' < 카드 right ' + Math.round(c.card.r) + ')',
      c.bodyInk.r <= c.card.r + 0.5 && c.bodyInk.x >= c.card.x - 0.5);
    ok('c' + n + ' 글자 세로가 카드 안', c.bodyInk.y >= c.card.y - 0.5 && c.bodyInk.b <= c.card.b + 0.5,
      Math.round(c.bodyInk.y) + '..' + Math.round(c.bodyInk.b) + ' vs ' + Math.round(c.card.y) + '..' + Math.round(c.card.b));
    if (c.btn) ok('c' + n + ' 글자 ↔ [→] 버튼 겹침 0 (글자 right ' + Math.round(c.bodyInk.r) + ' ≤ 버튼 left ' + Math.round(c.btn.x) + ')',
      c.bodyInk.r <= c.btn.x + 0.5);
    if (c.ic) ok('c' + n + ' 글자 ↔ 아이콘 겹침 0 (아이콘 right ' + Math.round(c.ic.r) + ' ≤ 글자 left ' + Math.round(c.bodyInk.x) + ')',
      c.ic.r <= c.bodyInk.x + 0.5);
  }

  console.log('\n[5] 런타임 에러');
  ok('콘솔/페이지 에러 0건', errs.length === 0, errs.join(' | '));

  await page.screenshot({ path: 'shot43.png' });
  console.log('\n캡처: shot43.png (1080x2280)');

  /* T2 «기능 완성 규칙» — 버튼별 «눌렀을 때 무엇이 바뀌는지» 를 실제로 눌러 확인한다.
     문구가 «골드로 훈련하세요» 로 바뀌었으므로 그 카드의 [→] 는 훈련(23)으로 가야 말이 맞는다. */
  console.log('\n[6] 기능 체크 — 카드 [→] 버튼 동작 (25-⑤ 교훈: page.click 대신 $eval 로 클릭)');
  const state = () => page.evaluate(() => ({
    defw: document.getElementById('defw').classList.contains('on'),
    trw: document.getElementById('trw').classList.contains('on'),
    shop: document.getElementById('shopw').classList.contains('on')
  }));
  const reopen = async () => { await page.evaluate(() => { closeTrain(); closeShopPage(); openDefeat(); }); await page.waitForTimeout(250); };

  await page.$eval('.df-card.c2 .df-btn', el => el.click());
  await page.waitForTimeout(400);
  let s = await state();
  ok('카드2 [→] → 패배 화면 닫힘', !s.defw, JSON.stringify(s));
  ok('카드2 [→] → 23 훈련 시트(#trw) 열림  (문구 «골드로 훈련하세요» 와 일치)', s.trw, JSON.stringify(s));

  await reopen();
  await page.$eval('.df-card.c1 .df-btn', el => el.click());
  await page.waitForTimeout(400);
  s = await state();
  ok('카드1 [→] → 상점(#shopw) 열림 (회귀)', !s.defw && s.shop, JSON.stringify(s));

  await reopen();
  await page.$eval('#defw .upr-close', el => el.click());
  await page.waitForTimeout(300);
  s = await state();
  ok('«터치하여 닫기» → 패배 화면 닫힘 (회귀)', !s.defw, JSON.stringify(s));

  ok('기능 체크 후에도 콘솔/페이지 에러 0건', errs.length === 0, errs.join(' | '));

  /* [R] 되돌림 시험 (작업 536 신설) — 334 규칙: «무르게 푼 수리가 아님» 을 자 안에서 못박는다.
     [2] 의 기대값을 옛 변환(−210)으로 갈아 준 것이 «자리를 안 보는 항» 이 되지 않았는지,
     실제로 카드를 옛 자리로 밀어 보고 그 항이 빨개지는지 확인한다. 원복까지 한 벌이다. */
  console.log('\n[R] 되돌림 시험 — 옛 변환(−210) 자리로 밀면 [2] 가 빨개지는가');
  const topOf = n => page.evaluate((k) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;
    return (document.querySelector('.df-card.c' + k).getBoundingClientRect().y - app.y) / sc;
  }, n);
  await page.evaluate(() => {
    openDefeat();
    const st = document.createElement('style'); st.id = 'r536';
    st.textContent = '.df-card.c1{top:705px!important}.df-card.c2{top:885px!important}.df-card.c3{top:1065px!important}';
    document.head.appendChild(st);
  });
  await page.waitForTimeout(250);
  const moved = [await topOf(1), await topOf(2), await topOf(3)];
  ok('옛 자리로 밀면 [2] c1·c2·c3 top 항이 전부 빨개진다 (기대 ' + REF_TOP.map(t => t - STATUS).join('/') + ')',
    moved.every((v, i) => Math.abs(v - (REF_TOP[i] - STATUS)) > 1), moved.map(v => Math.round(v)).join('/'));
  ok('민 자리는 정확히 «ref − 210» 이다 (두 변환의 차 = 126)',
    moved.every((v, i) => Math.abs(v - (REF_TOP[i] - 210)) <= 1), moved.map(v => Math.round(v)).join('/'));
  await page.evaluate(() => { const st = document.getElementById('r536'); if (st) st.remove(); });
  await page.waitForTimeout(250);
  const back = [await topOf(1), await topOf(2), await topOf(3)];
  ok('원복하면 다시 초록이다 (제품 자리 = ref − 84)',
    back.every((v, i) => Math.abs(v - (REF_TOP[i] - STATUS)) <= 1), back.map(v => Math.round(v)).join('/'));

  console.log('\n' + (fail === 0 ? 'VERIFY43 PASS' : 'VERIFY43 FAIL') + '  ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
