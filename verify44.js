/* 44 검증 — 다이아 판매 상품 5종 + 마일리지 교환
   지시서 [3]-(가) 기계적/기능 작업: 비평가 없이 기하 단정 + T2 «기능 완성 규칙» 기능 체크 표.
   실행: node verify44.js   (playwright@1.56.0 · chromium 1194) */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'index.html');

const rows = [], fails = [];
const ok = (t, d) => { rows.push(['✓', t, d || '']); };
const bad = (t, d) => { rows.push(['✗', t, d || '']); fails.push(t + ' — ' + d); };
const near = (t, got, want, tol = 1) =>
  Math.abs(got - want) <= tol ? ok(t, got + ' (기대 ' + want + ')')
                              : bad(t, '실측 ' + got + ' / 기대 ' + want);
const eq = (t, got, want) =>
  String(got) === String(want) ? ok(t, String(got)) : bad(t, '실측 ' + got + ' / 기대 ' + want);

async function openCoin(page) {
  await page.click('.tab[data-t="shop"]', { force: true });
  await page.waitForTimeout(300);
  await page.$eval('#shopCats .shp-ct[data-cat="coin"]', el => el.click());
  await page.waitForTimeout(300);
}
/* 콘텐츠 좌표는 스크롤과 무관하게 .cn-wrap 기준 local px 로 잰다 */
const box = (page, sel, i) => page.evaluate(([s, n]) => {
  const w = document.querySelector('.cn-wrap');
  const el = document.querySelectorAll(s)[n || 0];
  if (!w || !el) return null;
  const W = w.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: Math.round(r.left - W.left), y: Math.round(r.top - W.top),
           w: Math.round(r.width), h: Math.round(r.height) };
}, [sel, i]);

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await openCoin(page);

  /* ---------- A. 기하 ---------- */
  /* 537 — A1 은 «3066» 이라는 상수를 들고 있었다. 그 값은 §9(유물조각 교환)까지의 껍데기이고,
     204 §10 이 «던전 입장권 교환» 을 붙이면서 높이를 **던전 수에서 계산**하게 바뀌었다
     (`index.html` renderCoinPage: `dxTop 3844 + (행−1)×319 + 309 + 57`).
     상수를 4848 로 갈아 끼우기만 하면 던전이 하나 늘 때마다 같은 자리가 또 빨개진다 —
     그래서 **제품과 같은 식**으로 묻고(A1), 지금 값(8던전 = 3행 = 4848)도 같이 못박는다(A1b). */
  const wrap = await box(page, '.cn-wrap');
  const wantH = await page.evaluate(() => 3844 + (Math.ceil(DUNGEONS.length / 3) - 1) * 319 + 309 + 57);
  near('A1 .cn-wrap 높이 = 던전 행수 식', wrap.h, wantH);
  eq('A1b 지금 던전 8종 → 3행 → 4848', wrap.h + '/' + await page.evaluate(() => DUNGEONS.length), '4848/8');
  near('A2 .cn-wrap 폭', wrap.w, 1080);

  const ribs = await page.$$eval('.cn-rb', els => {
    const W = document.querySelector('.cn-wrap').getBoundingClientRect();
    return els.map(e => { const r = e.getBoundingClientRect();
      return { y: Math.round(r.top - W.top), x: Math.round(r.left - W.left),
               w: Math.round(r.width), h: Math.round(r.height),
               t: (e.querySelector('i') || {}).textContent }; });
  });
  /* 537 — «리본 3개» 는 44 등재 당시의 구획 수다. 그 뒤 204 §10(던전 입장권)·유물조각 교환이
     붙어 **5개**가 됐다. 수만 5 로 올리면 «어느 구획이 사라져도 다른 게 생기면 초록» 이 되므로
     라벨 목록으로 묻는다(334 처방 ①). */
  eq('A3 리본 5구획(광고·다이아·마일리지·유물조각 교환·던전 입장권)',
     ribs.map(r => r.t).join('|'), '광고 상품|다이아 상품|마일리지 상품|유물조각 교환|던전 입장권');
  eq('A4 다이아 리본 문구', ribs[1] && ribs[1].t, '다이아 상품');
  near('A5 다이아 리본 y', ribs[1].y, 1698);
  eq('A6 마일리지 리본 문구', ribs[2] && ribs[2].t, '마일리지 상품');
  near('A7 마일리지 리본 y', ribs[2].y, 2587);
  ribs.forEach((r, i) => { near('A8-' + i + ' 리본 규격 x/w/h', r.x * 1000 + r.w, 227 * 1000 + 627, 0); });

  const cds = await page.$$eval('.cn-cd.dia', els => {
    const W = document.querySelector('.cn-wrap').getBoundingClientRect();
    return els.map(e => { const r = e.getBoundingClientRect();
      return { x: Math.round(r.left - W.left), y: Math.round(r.top - W.top),
               w: Math.round(r.width), h: Math.round(r.height),
               hd: e.querySelector('.hd>i').textContent,
               qt: e.querySelector('.qt').textContent,
               pr: e.querySelector('.bt.buy>.pr').textContent,
               cp: (e.querySelector('.cp>i') || {}).textContent || '',
               id: e.querySelector('[data-diabuy]').dataset.diabuy }; });
  });
  eq('A9 다이아 카드 5칸', cds.length, 5);
  const wantX = [111, 401, 691, 111, 401], wantY = [1884, 1884, 1884, 2203, 2203];
  const wantPr = ['1,000원', '5,000원', '11,000원', '55,000원', '110,000원'];
  /* 537 — A14 는 «×1만»(옛 한글 단위 표기)을 들고 있었다. 라벨 문자열은 표기 규약이 바뀔 때마다
     썩는데(지금은 `fmt()` 의 쉼표 표기 «×10,000»), 이 항이 정말 지키려던 것은 **수량**이다.
     ⇒ 라벨에서 숫자를 되읽어 497(팩 ×2)이 확정한 지급량과 맞댄다 — 표기가 바뀌어도 살아 있고
     수량이 바뀌면 빨개진다. 라벨이 «수를 담고 있다» 는 것 자체는 A14b 가 지킨다.
     537 — A15 는 «쿠폰 +n» 이었다. 200(주인 지시)이 뱃지 문구를 «마일리지 +n» 으로 바꿨다. */
  const wantDia = [10000, 70000, 150000, 900000, 2000000];
  const wantCp = ['', '', '', '마일리지 +1', '마일리지 +2'];
  cds.forEach((c, i) => {
    near('A10-' + i + ' 카드 x', c.x, wantX[i]);
    near('A11-' + i + ' 카드 y', c.y, wantY[i]);
    near('A12-' + i + ' 카드 w×h', c.w * 1000 + c.h, 278 * 1000 + 309, 0);
    eq('A13-' + i + ' 가격', c.pr, wantPr[i]);
    eq('A14-' + i + ' 수량(라벨이 실은 수)', Number(c.qt.replace(/[^0-9]/g, '')), wantDia[i]);
    eq('A14b-' + i + ' 수량 라벨 꼴 «×숫자»', /^×[0-9,]+$/.test(c.qt), true);
    eq('A15-' + i + ' 마일리지 뱃지', c.cp, wantCp[i]);
  });
  /* §5 광고 카드와 같은 규격인지 (설계: «카드 규격은 위 상품 그리드와 동일») */
  const ad0 = await box(page, '.cn-cd:not(.dia)');
  eq('A16 광고 카드와 같은 규격', ad0.w + '×' + ad0.h, cds[0].w + '×' + cds[0].h);

  const ml = await box(page, '.cn-ml');
  near('A17 마일리지 패널 x', ml.x, 66);
  near('A18 마일리지 패널 y', ml.y, 2773);
  near('A19 마일리지 패널 w×h', ml.w * 1000 + ml.h, 948 * 1000 + 236, 0);
  const a2 = await box(page, '.cn-a2');
  eq('A20 §6 배너와 같은 x·폭', a2.x + '/' + a2.w, ml.x + '/' + ml.w);

  /* 겹침·프레임 밖 이탈 0건 */
  const over = await page.evaluate(() => {
    const W = document.querySelector('.cn-wrap').getBoundingClientRect();
    const sel = '.cn-cd.dia, .cn-ml, .cn-rb, .cn-a2, .cn-hd';
    const els = [...document.querySelectorAll(sel)].map(e => {
      const r = e.getBoundingClientRect();
      return { n: e.className, l: r.left - W.left, t: r.top - W.top, r: r.right - W.left, b: r.bottom - W.top };
    });
    const out = [];
    for (const e of els) {
      if (e.l < -0.5 || e.r > W.width + 0.5) out.push('가로 이탈 ' + e.n);
      if (e.t < -0.5 || e.b > W.height + 0.5) out.push('세로 이탈 ' + e.n + ' b=' + Math.round(e.b));
    }
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j];
      const ow = Math.min(a.r, b.r) - Math.max(a.l, b.l), oh = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ow > 1 && oh > 1) out.push('겹침 ' + a.n + ' × ' + b.n + ' (' + Math.round(ow) + '×' + Math.round(oh) + ')');
    }
    return out;
  });
  over.length ? bad('A21 겹침·이탈', over.join(' / ')) : ok('A21 겹침·이탈 0건');
  /* 잉크(글자)가 카드 밖으로 나가지 않는지 — 수량·가격·헤더 */
  const ink = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.cn-cd.dia').forEach(c => {
      const R = c.getBoundingClientRect();
      c.querySelectorAll('.qt, .bt.buy>.pr, .cp').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.left < R.left - 0.5 || r.right > R.right + 0.5)
          out.push(e.className + ' ' + Math.round(r.left - R.left) + '..' + Math.round(r.right - R.left));
      });
    });
    return out;
  });
  ink.length ? bad('A22 잉크 카드 밖 이탈', ink.join(' / ')) : ok('A22 잉크 이탈 0건');
  /* 스크롤로 마지막 요소까지 닿는지
     537 — 이 항은 «마일리지 패널» 을 이름으로 박아 두고 «맨 끝» 이라고 가정했다. 204 §10 이
     그 아래에 던전 입장권 교환 칸을 붙이면서 마일리지 패널은 더는 마지막이 아니고(끝에서
     1839px 위), 그래서 «스크롤 끝에서 안 보인다» 로 빨개졌다 — 결함이 아니라 자가 뒤처진 것이다.
     ⇒ 이름 대신 **`.cn-wrap` 의 마지막 자식**을 묻는다. 무엇이 맨 밑에 붙든 «끝까지 닿는가» 는
     계속 지켜지고, 그 아래로 새 구획이 붙어도 이 자리는 다시 안 썩는다. */
  const reach = await page.evaluate(() => {
    const l = document.getElementById('shopList'), w = document.querySelector('.cn-wrap');
    l.scrollTop = l.scrollHeight;
    const el = w.children[w.children.length - 1];
    const r = el.getBoundingClientRect(), L = l.getBoundingClientRect();
    return { visible: r.bottom <= L.bottom + 1 && r.top >= L.top - 1,
             dy: Math.round(L.bottom - r.bottom), n: el.className };
  });
  reach.visible ? ok('A23 스크롤 끝에서 마지막 구획 전체 노출', reach.n + ' · bottom 여백 ' + reach.dy + 'px')
                : bad('A23 스크롤 끝에서 마지막 구획 전체 노출', reach.n + ' dy ' + reach.dy);
  /* A23b 음성항 — 마일리지 패널은 «맨 끝» 이 아니다(위 항이 옛 가정으로 되돌아가면 빨개진다) */
  const mlLast = await page.evaluate(() => {
    const w = document.querySelector('.cn-wrap');
    return w.children[w.children.length - 1].classList.contains('cn-ml');
  });
  eq('A23b 마일리지 패널은 마지막 구획이 아니다(204 §10 이 아래에 붙었다)', mlLast, false);

  /* ---------- B. 기능 (T2 기능 완성 규칙 — 버튼별 «눌렀을 때 무엇이 바뀌는지») ---------- */
  const st = () => page.evaluate(() => ({
    dia: S.dia, mil: S.mileage, paid: S.cnt.paid,
    saveDia: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}')).dia,
    saveMil: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}')).mileage,
    hud: document.getElementById('diaN').textContent,
    ct: (document.querySelector('.cn-ml>.ct') || {}).textContent,
    barW: Math.round((document.querySelector('.cn-ml>.bar>s') || {}).getBoundingClientRect().width),
    off: document.querySelector('.cn-ml').classList.contains('off'),
    exch: !!document.getElementById('cnExch'),
    /* 153 — 지급은 우편으로 간다. «무엇이 지급됐나» 는 이제 우편함이 들고 있다 */
    mails: (S.mailx || []).length,
    lastMail: (S.mailx || []).slice(-1)[0] || null
  }));
  /* 537 — 206(알림 전면 토스트화) 이후 «준비 중»·«발송»·«교환 결과» 는 전부 토스트다.
     팝업(`#modal`)·[확인](`#okBtn`) 을 묻던 옛 항이 그대로 남아 175행에서 즉사했다.
     ⇒ 토스트를 읽는 공용 두 줄(verify149 §2 선례). `okBtn` 은 **음성항**으로 같이 묻는다 —
     팝업으로 되돌아가면 그 자리가 빨개져야 하기 때문이다(무르게 풀지 않았다는 근거). */
  const clearFx = () => page.evaluate(() => {
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    try { closeModal(); } catch (e) {}
  });
  const seen = () => page.evaluate(() => {
    const t = [...document.querySelectorAll('#fxl .fx-toast')];
    const md = document.getElementById('modal');
    return { n: t.length, txt: t.map(e => e.textContent).join(' | '),
             modal: !!(md && md.classList.contains('on')), okBtn: !!document.getElementById('okBtn') };
  });
  /* 우편 수령 — 153 이후 «재화가 실제로 오르는» 유일한 지점.
     ⚠ 수령은 `renderCoinPage()` 를 안 부르고 `renderUI()`(0.35s)도 이 리스트는 안 다시 그린다 —
     그래서 열려 있던 재화 탭의 마일리지 패널은 수령 직후 옛 값 그대로다(**곁다리 545 로 등재**).
     이 자는 그 결함을 «없는 것» 으로 덮지 않고, 사용자가 실제로 밟는 길(탭을 다시 연다)로
     화면을 갱신한 뒤 읽는다. */
  /* ⚠ 재렌더에 `openCoin()` 을 쓰면 안 된다 — 그 함수는 **탭바 «상점» 을 누르는 것**으로 시작하고
     A1 규약상 열린 탭을 다시 누르면 패널이 **닫힌다**. 홀수 번 부르면 그 뒤 모든 rect 가 0 이 되어
     «진행바 0px» 같은 유령이 뜬다(1회차에 B8d·B11c 가 그렇게 빨개졌다). 카테고리만 갈아탄다. */
  const reopenCoin = async () => {
    await page.$eval('#shopCats .shp-ct[data-cat="summon"]', el => el.click());
    await page.waitForTimeout(200);
    await page.$eval('#shopCats .shp-ct[data-cat="coin"]', el => el.click());
    await page.waitForTimeout(250);
  };
  const claimAll = async () => {
    await page.evaluate(() => claimAllMail());
    await page.waitForTimeout(250);
    await reopenCoin();                         /* 545 — 목록 재렌더는 «다시 열기» 가 한다 */
  };
  /* 93 롤링 계단 — HUD 숫자는 목표값으로 «굴러간다». 찍는 순간이 계단 중간이면 1,309,375 처럼
     읽힌다(1회차 실측). 값이 멎을 때까지 기다렸다 읽는다 — 멎지 않으면 그대로 읽어 빨개진다. */
  const hudSettled = async () => {
    for (let i = 0; i < 40; i++) {
      const same = await page.evaluate(() => document.getElementById('diaN').textContent === fmt(S.dia));
      if (same) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };

  /* B0 — 부팅 세이브에는 이미 받을 우편이 들어 있다(환영·가이드 계열). 아래 항이 재는 것은
     «이 구매가 낸 우편» 이므로 기준선을 먼저 비운다. 안 비우면 첫 수령이 남의 보상까지 걷어
     Δ가 부풀고(1회차 실측 +31만), 그걸 기대값으로 적으면 그 우편이 바뀔 때마다 또 썩는다. */
  const drained = await page.evaluate(() => {
    const n = (S.mailx || []).filter(m => !S.mail[m.id]).length; claimAllMail(); return n;
  });
  await page.waitForTimeout(300);
  await reopenCoin();
  ok('B0 부팅 우편 비움(기준선)', drained + '통');

  const b0 = await st();
  eq('B1 기본 마일리지 = 0', b0.mil, 0);
  eq('B2 쿠폰 0 → 패널 비활성', b0.off + '/' + b0.exch, 'true/false');
  eq('B3 쿠폰 0 → 진행바 0px', b0.barW, 0);
  eq('B4 표시 «0 / 10»', b0.ct, '0 / 10');

  /* B5 구매 버튼 = 결제 준비 중 (206 — 팝업이 아니라 토스트 · 재화 변동 0) */
  await clearFx();
  await page.$eval('[data-diabuy="d1"]', el => el.click());
  await page.waitForTimeout(250);
  const mo = await seen();
  const b5 = await st();
  (mo.n === 1 && /준비 중/.test(mo.txt) && /1,000원/.test(mo.txt) && b5.dia === b0.dia)
    ? ok('B5 [1,000원] 클릭 → «준비 중» 토스트 · 다이아 변동 0', mo.txt)
    : bad('B5 [1,000원] 클릭', JSON.stringify(mo) + ' dia ' + b0.dia + '→' + b5.dia);
  eq('B5b 그 안내는 팝업을 안 연다(206 · 옛 `#okBtn` 경로가 없다)', mo.modal + '/' + mo.okBtn, 'false/false');
  eq('B5c 우편도 안 생긴다(«준비 중» 은 지급이 아니다)', b5.mails - b0.mails, 0);

  /* B6 쿠폰 상품 — 200(주인 지시) 이후 마일리지 안내는 **카드 뱃지**가 들고 있고
     토스트는 «상품명 + 가격 + 준비 중» 만 말한다. 둘을 따로 묻는다(하나로 묶으면 뱃지가
     사라져도 토스트만으로 초록이 된다). */
  await clearFx();
  await page.$eval('[data-diabuy="d5"]', el => el.click());
  await page.waitForTimeout(250);
  const mo5 = await seen();
  /110,000원/.test(mo5.txt) && /준비 중/.test(mo5.txt) && mo5.n === 1
    ? ok('B6 [110,000원] 토스트에 가격·«준비 중»', mo5.txt)
    : bad('B6 [110,000원] 토스트', JSON.stringify(mo5));
  eq('B6b 마일리지 +2 안내는 그 카드 뱃지가 든다(200)', cds[4].cp, '마일리지 +2');
  await clearFx();

  /* B7 디버그 지급(결제 대체) — 쿠폰 없는 상품
     153(주인 지시) — 지급은 **우편함**으로 간다. 재화는 여기서 안 오르고, 오르는 것은
     결제 카운터뿐이다. 옛 항(«다이아 +1만»)은 153 이전 모델이라 통째로 갈아 끼웠다. */
  await page.evaluate(() => window.devBuyDia('d1'));
  await page.waitForTimeout(400);
  const b7s = await seen();
  const b7 = await st();
  eq('B7 devBuyDia(d1) — 재화는 즉시 안 오른다(153 우편 지급)', b7.dia - b0.dia, 0);
  eq('B7b 우편 1통 신설 · 다이아 1만 · 마일리지 0', (b7.mails - b0.mails) + '/' + b7.lastMail.c + '/' + (b7.lastMail.m | 0), '1/10000/0');
  eq('B7c 결제 카운터만 즉시 +1', b7.paid - b0.paid, 1);
  /우편함으로 발송/.test(b7s.txt) && !b7s.modal
    ? ok('B7d 발송 통보도 토스트', b7s.txt) : bad('B7d 발송 통보', JSON.stringify(b7s));
  await claimAll();
  const b7c = await st();
  eq('B7e 우편 수령 → 다이아 +1만', b7c.dia - b0.dia, 10000);
  eq('B7f 쿠폰 없는 상품 → 마일리지 그대로', b7c.mil, 0);
  eq('B7g HUD 갱신(93 롤링이 멎은 뒤)', await hudSettled(), true);
  eq('B7h 저장 반영', b7c.saveDia, b7c.dia);

  /* B8 쿠폰 지급 — 90만(+1) · 200만(+2). 마일리지도 우편이 실어 나른다(153) */
  await page.evaluate(() => { window.devBuyDia('d4'); });
  await page.waitForTimeout(300);
  const b8p = await st();
  eq('B8 우편이 마일리지를 싣는다(다이아 90만 · 쿠폰 1)', b8p.lastMail.c + '/' + b8p.lastMail.m, '900000/1');
  eq('B8a 수령 전에는 마일리지 0', b8p.mil, 0);
  await claimAll();
  const b8 = await st();
  eq('B8b 수령 → 다이아 +90만', b8.dia - b7c.dia, 900000);
  eq('B8c 마일리지 +1', b8.mil, 1);
  eq('B8d 진행바 1/10 (410px×.1)', b8.barW, 41);
  eq('B8e 표시 «1 / 10»', b8.ct, '1 / 10');
  eq('B8f 10개 미만 → [교환] 비활성', b8.off + '/' + b8.exch, 'true/false');

  await page.evaluate(() => { window.devBuyDia('d5'); });
  await page.waitForTimeout(300);
  await claimAll();
  const b9 = await st();
  eq('B9 devBuyDia(d5) → 수령 뒤 다이아 +200만', b9.dia - b8.dia, 2000000);
  eq('B9b 마일리지 +2 (누적 3)', b9.mil, 3);
  eq('B9c 저장 반영', b9.saveMil, 3);

  /* B10 비활성 [교환] 클릭 → 아무 일도 없다 */
  await page.$eval('.cn-ml>.ex', el => el.click());
  await page.waitForTimeout(300);
  const b10 = await st();
  (b10.dia === b9.dia && b10.mil === b9.mil)
    ? ok('B10 비활성 [교환] 클릭 → 변동 0', 'dia ' + b10.dia + ' / 쿠폰 ' + b10.mil)
    : bad('B10 비활성 [교환] 클릭', 'dia ' + b9.dia + '→' + b10.dia + ' 쿠폰 ' + b9.mil + '→' + b10.mil);

  /* B11 쿠폰 10개 → 활성 */
  await page.evaluate(() => { for (let i = 0; i < 4; i++) window.devBuyDia('d5'); });  /* +8 → 11 */
  await page.waitForTimeout(400);
  await claimAll();
  const b11 = await st();
  eq('B11 쿠폰 11개', b11.mil, 11);
  eq('B11b 10 이상 → [교환] 활성', b11.off + '/' + b11.exch, 'false/true');
  eq('B11c 진행바 상한(10/10)', b11.barW, 410);

  /* B12 교환 실행 — 153 이후 보상 다이아도 **우편**으로 간다.
     쿠폰만 그 자리에서 빠지고(교환 행위), 다이아는 수령해야 오른다. */
  await clearFx();
  await page.$eval('#cnExch', el => el.click());
  await page.waitForTimeout(400);
  const b12 = await st();
  const mo12 = await seen();
  eq('B12 [교환] → 쿠폰 −10', b11.mil - b12.mil, 10);
  eq('B12b 다이아는 즉시 안 오른다(153 우편 지급)', b12.dia - b11.dia, 0);
  eq('B12c 우편 1통 신설 · 500만', (b12.mails - b11.mails) + '/' + b12.lastMail.c, '1/5000000');
  eq('B12d 저장 반영', b12.saveMil, b12.mil);
  eq('B12e 남은 쿠폰 1 → 다시 비활성', b12.off + '/' + b12.exch, 'true/false');
  /우편함으로 발송/.test(mo12.txt) && !mo12.modal && !mo12.okBtn
    ? ok('B12f 교환 결과도 토스트(206)', mo12.txt) : bad('B12f 교환 결과', JSON.stringify(mo12));
  await claimAll();
  const b12c = await st();
  eq('B12g 우편 수령 → 다이아 +500만', b12c.dia - b12.dia, 5000000);

  /* B13 HUD·다른 화면 반영 — 재화 탭을 닫고 10 소환 탭 HUD 에서 확인 */
  await page.$eval('#shopCats .shp-ct[data-cat="summon"]', el => el.click());
  await page.waitForTimeout(700);
  const b13 = await page.evaluate(() => ({ hud: document.getElementById('diaN').textContent, dia: fmt(S.dia) }));
  eq('B13 소환 탭 HUD 에도 반영', b13.hud, b13.dia);

  /* B14 새로고침 후에도 유지(저장 구조) */
  await page.reload();
  await page.waitForTimeout(1200);
  const b14 = await page.evaluate(() => ({ mil: S.mileage, dia: S.dia }));
  eq('B14 새로고침 후 마일리지 유지', b14.mil, b12c.mil);
  eq('B14b 새로고침 후 다이아 유지', b14.dia >= b12c.dia, true);

  /* C. 콘솔 에러 · NaN */
  const badtxt = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/NaN|undefined|Infinity/);
    return m ? m[0] : null;
  });
  badtxt ? bad('C1 화면 텍스트 NaN/undefined', badtxt) : ok('C1 NaN/undefined 없음');
  errs.length ? errs.forEach(e => bad('C2 콘솔 에러', e)) : ok('C2 콘솔 에러 0');
  await ctx.close();

  /* ---------- D. 구버전 세이브 마이그레이션 ----------
     주의: 게임 루프가 5초마다 자동 저장한다(`if(saveT > 5) save()`). 살아 있는 페이지에서
     localStorage 를 고친 뒤 reload 하면 그 사이 자동 저장이 옛 값을 되돌려 놓는다(1회차에 이걸로 오진).
     그래서 **addInitScript 로 페이지 스크립트보다 먼저** 세이브를 심어 결정적으로 만든다. */
  for (const [label, raw] of [
    ['D1 mileage 필드 없음', JSON.stringify({ gold: 500, dia: 777, relic: 0, stage: 3, time: Date.now() })],
    ['D2 mileage:null',      JSON.stringify({ dia: 777, mileage: null, time: Date.now() })],
    ['D3 mileage:"3"(문자열)', JSON.stringify({ dia: 777, mileage: '3', time: Date.now() })]
  ]) {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
    await c.addInitScript(v => { try { localStorage.setItem('idle_hunter_save_v4', v); } catch (e) {} }, raw);
    const p = await c.newPage();
    const er = []; p.on('pageerror', e => er.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1200);
    await openCoin(p);
    const r = await p.evaluate(() => ({ mil: S.mileage, dia: S.dia,
      ct: document.querySelector('.cn-ml>.ct').textContent,
      off: document.querySelector('.cn-ml').classList.contains('off') }));
    (r.mil === 0 && r.ct === '0 / 10' && r.off && r.dia === 777 && !er.length)
      ? ok(label + ' → 쿠폰 0 · 옛 진행도 보존', 'dia ' + r.dia + ' / ' + r.ct)
      : bad(label, JSON.stringify(r) + (er.length ? ' err:' + er[0] : ''));
    await c.close();
  }

  await browser.close();

  const w = [2, Math.max(...rows.map(r => r[1].length)), 0];
  rows.forEach(r => console.log(r[0] + ' ' + r[1].padEnd(w[1]) + '  ' + r[2]));
  console.log(fails.length ? '\nVERIFY44 FAIL — ' + fails.length + '건\n' + fails.join('\n')
                           : '\nVERIFY44 PASS — ' + rows.length + '항목');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
