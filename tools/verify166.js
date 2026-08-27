/* 작업 166 회귀 게이트 — 레드닷(빨간점) «알림 조건부» 전역 규약
 *
 *   실행: node tools/verify166.js   (1080x2280 · 헤드리스)
 *
 * 지키는 성질 하나: **레드닷은 «누를 게/받을 게 있다» 일 때만 뜬다.**
 *   ① 조건 없이 상시 점등하는 배지가 0건일 것
 *   ② «불가능한 상태»(재화 부족 · 전투력 미달 · 횟수 소진 · 잠금)에서는 꺼질 것
 *   ③ «받을 게 있는» 상태에서는 켜질 것
 *
 * 주인 보고(2026-08-27)의 확정 사례는 23 훈련 배수 탭 x1/x10/x30 이었지만, 같은 계열이
 * 네 군데 더 있었다(던전 서브탭 · 던전 카드 · 측정장 카드 · 아레나 카드). 그래서 이 게이트는
 * «한 자리» 가 아니라 **레드닷 렌더 전수**를 본다 — 새 배지를 만들면 [7] 이 먼저 빨개진다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM» 판정이라 비평가를 띄우지 않는다.
 *
 * ⚠ 상태를 만드는 방법 — 전투력 cp() 는 `const` 화살표라 스텁이 안 된다(재할당 불가).
 *   대신 **요구치 쪽**(`DUNGEONS[i].req`)을 갈아 끼워 «충족/미달» 두 상태를 만든다.
 *   객체 프로퍼티라 자유롭게 바꿀 수 있고, 원래 함수는 복구해 둔다.
 */
const fs = require('fs'), path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;
const R = [];
const ok = (n, c, got) => { R.push({ n, c: !!c, got }); };

(async () => {
  /* ── [0] 소스 — 지운 것이 정말 지워졌나 (죽은 선택자 포함) ───────────────── */
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const code = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  ok('src `class="dot"` 렌더 10곳 (166 이전 11곳 — 배수 탭 1곳 제거)',
    (code.match(/class="dot"/g) || []).length === 10,
    (code.match(/class="dot"/g) || []).length + '곳');
  ok('src 배수 탭 렌더에 dot 0건 (`data-trq=` 와 같은 문자열 안)',
    !/data-trq=[\s\S]{0,80}?class="dot"/.test(code));
  ok('src `.tr-qty .dot` CSS 규칙 0건 (죽은 선택자 금지 — 134 처리와 같음)',
    !/\.tr-qty[^{]*\.dot\s*\{/.test(code));
  ok('src `.stab>.bdg` 기본 display:none', /\.stab>\.bdg\{[^}]*display:none/.test(code));
  ok('src `.stab.alert>.bdg{display:block}` 존재', /\.stab\.alert>\.bdg\{display:block\}/.test(code));

  /* CSS 주석 짝 — 하나 어긋나면 다음 규칙 블록이 통째로 죽는데 콘솔은 조용하다(LESSONS 52-④) */
  const css = src.slice(src.indexOf('<style'), src.indexOf('</style>'));
  let depth = 0, unmatched = 0;
  for (let i = 0; i < css.length - 1; i++) {
    if (css[i] === '/' && css[i + 1] === '*') { depth++; i++; }
    else if (css[i] === '*' && css[i + 1] === '/') { depth--; i++; if (depth < 0) { unmatched++; depth = 0; } }
  }
  ok('CSS 주석 짝 맞음', depth === 0 && unmatched === 0, '열림잔여 ' + depth + ' / 짝없는닫힘 ' + unmatched);

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1100);

  const ev = fn => page.evaluate(fn);
  const wait = ms => page.waitForTimeout(ms == null ? 500 : ms);

  /* ── [1] 23 훈련 배수 탭 — 알림 대상이 아니다(주인 확정 사례) ──────────────── */
  await ev(() => { openTrain(); });
  await wait(600);
  const q = await ev(() => ({
    cells: document.querySelectorAll('#trQty .q').length,
    dots: document.querySelectorAll('#trQty .dot').length,
  }));
  ok('배수 탭 3칸 그대로', q.cells === 3, q.cells + '칸');
  ok('배수 탭 레드닷 0개 (x1/x10/x30 상시 점등 제거)', q.dots === 0, q.dots + '개');

  /* ── [2] 23 훈련 «카드» dot — 강화 가능(비용 충족 + 캡 미달)일 때만 ───────── */
  const trPoor = await ev(() => {
    S.gold = 0; uiDirty = true; renderTrain();
    return { dots: document.querySelectorAll('#trCards .tr-card > .dot').length,
             okN: trainCardData().filter(c => c.ok).length };
  });
  ok('훈련 카드 — 골드 0 이면 dot 0개', trPoor.dots === 0 && trPoor.okN === 0,
    'dot ' + trPoor.dots + ' / 강화가능 ' + trPoor.okN);
  const trRich = await ev(() => {
    S.gold = 1e15; uiDirty = true; renderTrain();
    return { dots: document.querySelectorAll('#trCards .tr-card > .dot').length,
             okN: trainCardData().filter(c => c.ok).length };
  });
  ok('훈련 카드 — 골드가 넉넉하면 dot = 강화 가능 카드 수',
    trRich.dots === trRich.okN && trRich.okN > 0,
    'dot ' + trRich.dots + ' / 강화가능 ' + trRich.okN);
  await ev(() => { S.gold = 0; closeTrain(); });

  /* ── [3] 03 던전 카드 dot — «잠금 아님 + 남은 횟수 + 요구 전투력 충족» 과 정확히 일치 ── */
  await ev(() => { goTab('adv'); });
  await wait(700);
  /* (a) 새 세이브 그대로: cp 503 < 요구 2500 이라 **한 장도 켜지면 안 된다**(166 이전엔 2장이 켜졌다) */
  const dunFresh = await ev(() => {
    const want = DUNGEONS.filter(d => !dunLocked(d) && S.daily.dun[d.id] > 0 && cp() >= d.req(S.dun[d.id])).length;
    return { want, got: document.querySelectorAll('#dunList .dnc > .dot').length,
             cp: cp(), req: DUNGEONS[0].req(S.dun[DUNGEONS[0].id]) };
  });
  ok('던전 카드 — 전투력 미달이면 dot 0 (② 불가능한데 뜨던 자리)',
    dunFresh.got === 0 && dunFresh.want === 0,
    'dot ' + dunFresh.got + ' / cp ' + dunFresh.cp + ' vs 요구 ' + dunFresh.req);
  /* (b) 요구치를 0 으로 갈아 끼우면(=충족) 잠금 아닌 카드가 전부 켜져야 한다 */
  const dunOn = await ev(() => {
    window.__req0 = DUNGEONS.map(d => d.req);
    DUNGEONS.forEach(d => { d.req = () => 0; });
    renderDunPage();
    return { want: DUNGEONS.filter(d => !dunLocked(d) && S.daily.dun[d.id] > 0).length,
             got: document.querySelectorAll('#dunList .dnc > .dot').length };
  });
  ok('던전 카드 — 요구 충족 + 횟수 남으면 켜진다', dunOn.got === dunOn.want && dunOn.want > 0,
    'dot ' + dunOn.got + ' / 기대 ' + dunOn.want);
  /* (c) 입장 횟수를 다 쓰면 다시 꺼진다 */
  const dunUsed = await ev(() => {
    DUNGEONS.forEach(d => { S.daily.dun[d.id] = 0; });
    renderDunPage();
    return document.querySelectorAll('#dunList .dnc > .dot').length;
  });
  ok('던전 카드 — 입장 횟수 0 이면 꺼진다', dunUsed === 0, 'dot ' + dunUsed);

  /* ── [4] 03 던전 «서브탭» 배지 — 마크업만 있고 토글이 없어 상시 점등이던 자리 ──── */
  const sub0 = await ev(() => {
    const t = document.querySelector('#dunSub [data-dsub="dun"]');
    return { disp: getComputedStyle(t.querySelector('.bdg')).display, alert: t.classList.contains('alert') };
  });
  ok('던전 서브탭 배지 — 입장 횟수 0(=알림 없음)이면 꺼짐',
    sub0.disp === 'none' && sub0.alert === false, sub0.disp + ' / .alert ' + sub0.alert);
  await ev(() => { DUNGEONS.forEach(d => { S.daily.dun[d.id] = 3; }); uiDirty = true; renderUI(); });
  await wait(500);
  const sub1 = await ev(() => {
    const t = document.querySelector('#dunSub [data-dsub="dun"]');
    return { disp: getComputedStyle(t.querySelector('.bdg')).display, alert: t.classList.contains('alert'),
             other: document.querySelector('#dunSub [data-dsub="raid"]').classList.contains('alert') };
  });
  ok('던전 서브탭 배지 — 입장 가능해지면 켜짐(탭바 «던전» 칸과 같은 기준)',
    sub1.disp === 'block' && sub1.alert === true, sub1.disp + ' / .alert ' + sub1.alert);
  ok('«컨텐츠» 칸에는 안 번진다', sub1.other === false, String(sub1.other));
  await ev(() => { window.__req0.forEach((f, i) => { DUNGEONS[i].req = f; }); uiDirty = true; renderUI(); });

  /* ── [5] 측정장(컨텐츠 탭) 카드 — 입장 제한이 없어 `!lock` 만으로는 영영 안 꺼졌다 ──── */
  await ev(() => { setDunSub('raid'); });
  await wait(500);
  const raid0 = await ev(() => ({
    unlocked: RAIDS.filter(r => !raidLocked(r)).length,
    got: document.querySelectorAll('#dunList .dnc.rd:not(.arn2) > .dot').length,
  }));
  ok('측정장 — 기록이 없으면 켜짐 (③ 아직 안 해본 컨텐츠)',
    raid0.got === raid0.unlocked && raid0.unlocked > 0, 'dot ' + raid0.got + ' / 해금 ' + raid0.unlocked);
  const raid1 = await ev(() => {
    RAIDS.forEach(r => { S.raidBest[r.id] = { dmg: 1234, dps: 99 }; });
    renderDunPage();
    return document.querySelectorAll('#dunList .dnc.rd:not(.arn2) > .dot').length;
  });
  ok('측정장 — 한 번 재고 나면 꺼진다 (① 상시 점등 제거)', raid1 === 0, 'dot ' + raid1);

  /* ── [6] 아레나 카드 — 잠금 / 전적 0-0 / 전적 있음 세 상태 ─────────────────── */
  const arn = await ev(() => {
    const q = () => document.querySelectorAll('#dunList .dnc.arn2 > .dot').length;
    const b0 = S.best;
    S.best = 0; renderDunPage(); const lock = q();
    S.best = 99; S.arena = { w: 0, l: 0 }; renderDunPage(); const fresh = q();
    S.arena = { w: 1, l: 0 }; renderDunPage(); const played = q();
    S.best = b0; S.arena = { w: 0, l: 0 };
    return { lock, fresh, played };
  });
  ok('아레나 — 잠겨 있으면 dot 0', arn.lock === 0, 'dot ' + arn.lock);
  ok('아레나 — 해금 + 전적 0-0 이면 켜짐', arn.fresh === 1, 'dot ' + arn.fresh);
  ok('아레나 — 한 판 하고 나면 꺼진다', arn.played === 0, 'dot ' + arn.played);
  await ev(() => { closeDungeon(); });
  await wait(400);

  /* ── [7] 탭바 «상점» 칸 — 하루 무료 10연이 남았을 때 (③ 안 뜨던 자리) ──────── */
  const shop1 = await ev(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    uiDirty = true; renderUI();
    return document.querySelector('.tab[data-t="shop"]').classList.contains('alert');
  });
  ok('상점 탭 — 무료 소환이 남아 있으면 켜짐', shop1 === true, String(shop1));
  const shop0 = await ev(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 0, o), {});
    uiDirty = true; renderUI();
    return document.querySelector('.tab[data-t="shop"]').classList.contains('alert');
  });
  ok('상점 탭 — 무료 소환을 다 쓰면 꺼진다', shop0 === false, String(shop0));

  /* ── [8] 레드닷 전수 — «조건 클래스 없이 보이는 배지» 가 한 개도 없어야 한다 ──── */
  /* 새 세이브 + 아무 상태도 안 만든 화면에서, 켜져 있는 배지는 전부 «켤 이유» 를 가져야 한다.
     여기서는 더 강하게 «기본 CSS 가 꺼져 있는가» 를 본다 — 조건 클래스를 떼면 사라져야 한다. */
  /* ⚠ 한 칸만 표본으로 보면 안 된다 — 도감 탭 6칸은 «클래스 셀렉터가 ID 셀렉터에게 진» 사례였다
     (`#collw s{display:inline-block}` 이 `.cltab>s.dot{display:none}` 을 이겨 6칸 상시 점등).
     그래서 **호스트를 전수**로 돌린다. */
  const audit = await ev(() => {
    const SITES = [
      { n: '#menub .bdg',  host: '#menub',                    bdg: '.bdg',   cls: 'alert' },
      { n: '.ibtn .bdg',   host: '.side .ibtn[data-pop]',     bdg: '.bdg',   cls: 'on' },
      { n: '.tab .bdg',    host: '#tabbar .tab[data-t]',      bdg: '.bdg',   cls: 'alert' },
      { n: '.stab>.bdg',   host: '#dunSub .stab',             bdg: '.bdg',   cls: 'alert' },
      { n: '.cltab>s.dot', host: '#collw .cltab',             bdg: 's.dot',  cls: 'alert' },
    ];
    return SITES.map(s => {
      const hosts = [...document.querySelectorAll(s.host)].filter(h => h.querySelector(s.bdg));
      if (!hosts.length) return { n: s.n, missing: true };
      let offBad = 0, onBad = 0, off = '', on = '';
      hosts.forEach(h => {
        const e = h.querySelector(s.bdg), had = h.classList.contains(s.cls);
        h.classList.remove(s.cls);
        off = getComputedStyle(e).display; if (off !== 'none') offBad++;
        h.classList.add(s.cls);
        on = getComputedStyle(e).display; if (on === 'none') onBad++;
        if (!had) h.classList.remove(s.cls);
      });
      return { n: s.n, n2: hosts.length, offBad, onBad, off, on };
    });
  });
  audit.forEach(a => {
    ok('배지 «' + a.n + '» — 조건 클래스 없으면 꺼짐 / 있으면 켜짐 (호스트 전수)',
      !a.missing && a.offBad === 0 && a.onBad === 0,
      a.missing ? '노드 없음'
        : a.n2 + '개 · 꺼짐 위반 ' + a.offBad + ' · 켜짐 위반 ' + a.onBad + ' (' + a.off + ' → ' + a.on + ')');
  });

  /* 도감 탭 — 특이성을 고친 뒤 «조건»(collTabReady)이 실제로 화면에 반영되는지까지 본다 */
  await ev(() => { if (typeof openColl21 === 'function') openColl21(); });
  await wait(600);
  const cl = await ev(() => {
    const tabs = [...document.querySelectorAll('#collTabs .cltab')];
    return tabs.map(t => ({ k: t.dataset.ct, rdy: collTabReady(t.dataset.ct),
      shown: getComputedStyle(t.querySelector('s.dot')).display !== 'none' }));
  });
  ok('도감 탭 6칸 — 레드닷 = «강화 가능한 세트가 있다» 와 정확히 일치',
    cl.length === 6 && cl.every(t => t.rdy === t.shown),
    cl.map(t => t.k + (t.rdy ? '✔' : '✘') + (t.shown ? '●' : '○')).join(' '));

  /* ── [9] 콘솔 ───────────────────────────────────────────────────────── */
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const bad = R.filter(r => !r.c);
  R.forEach(r => console.log((r.c ? '  ok   ' : '  FAIL ') + r.n + (r.got === undefined ? '' : '  [' + r.got + ']')));
  console.log('\nVERIFY166 ' + (bad.length ? 'FAIL' : 'PASS') + ' ' + (R.length - bad.length) + '/' + R.length);
  process.exit(bad.length ? 1 : 0);
})();
