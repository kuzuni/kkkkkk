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

  /* 280 — 옛 「렌더 10곳」 리터럴이 굳어 빨간 채 방치됐다(실측 11곳). 늘어난 1곳은 **탑 카드**
     (`renderTowerPage()` — 209 가 신설하고 210 이 둘로 늘렸다)이고 조건부 렌더라 성질은 안 깨졌다.
     (280 등재문의 «던전 서브탭 1곳» 은 오기다 — 던전 서브탭 배지는 `class="bdg"` 라 이 정규식에 안 걸린다.)
     185-① 처방: **숫자를 «자리 목록» 에서 파생**시키고, 지키려는 **성질**을 직접 단언한다.
     자리는 두 갈래뿐이다 —
       ⓐ 정적 마크업: 도감 탭 `#collTabs .cltab` 칸마다 1개. 노드는 늘 있고 **CSS 가 껐다 켠다**
          (`.cltab.alert>s.dot`) → [8] 감사가 호스트 전수로 «조건 클래스 없으면 꺼짐» 을 본다.
       ⓑ 조건부 렌더: `(<조건> ? '…class="dot"…' : '')` 꼴. 조건이 거짓이면 **노드 자체가 없다.**
     둘 중 어디에도 안 들어가는 자리 = «조건 없이 늘 찍히는 배지» = 166 이 없앤 바로 그 병이다.
     그래서 숫자가 다시 늘어도 자리가 ⓐ·ⓑ 중 하나면 통과하고, 상시 렌더가 하나라도 생기면 빨개진다.
     ⚠ ⓑ 판정은 «한 줄 안에 `? '` … `: ''`» 로 본다(현재 4곳 전부 한 줄이다). 여러 줄로 쪼갠 삼항을
        새로 쓰면 여기서 «분류 불가» 로 빨개진다 — 그때는 한 줄로 모으거나 이 판정을 넓혀라. */
  const line = i => code.slice(code.lastIndexOf('\n', i) + 1, code.indexOf('\n', i) < 0 ? code.length : code.indexOf('\n', i));
  const dotAt = []; { const re = /class="dot"/g; let m; while ((m = re.exec(code))) dotAt.push(m.index); }
  const clTabN = (code.match(/<div class="cltab" data-ct="/g) || []).length;
  const dotStatic = dotAt.filter(i => /<div class="cltab" data-ct="/.test(line(i)));
  const dotCond = dotAt.filter(i => !/<div class="cltab" data-ct="/.test(line(i))
    && /\?\s*'[^']*class="dot"/.test(line(i)) && /class="dot"[\s\S]*?:\s*''/.test(line(i)));
  const dotLoose = dotAt.filter(i => !dotStatic.includes(i) && !dotCond.includes(i));
  ok('src `class="dot"` 정적 자리 = 도감 탭 칸 수 (리터럴이 아니라 `#collTabs .cltab` 에서 파생)',
    dotStatic.length === clTabN && clTabN > 0,
    '정적 ' + dotStatic.length + '곳 / `.cltab` ' + clTabN + '칸');
  ok('src `class="dot"` 나머지는 전부 조건부 렌더 — «조건 없이 상시 점등» 0건 (166 이 지키는 성질)',
    dotLoose.length === 0,
    '전체 ' + dotAt.length + '곳 = 정적(도감 탭) ' + dotStatic.length + ' + 조건부 ' + dotCond.length
      + ' + 분류불가 ' + dotLoose.length
      + (dotLoose.length ? ' → ' + dotLoose.map(i => line(i).trim().slice(0, 60)).join(' ⁄ ') : ''));
  ok('src 배수 탭 렌더에 dot 0건 (`data-trq=` 와 같은 문자열 안)',
    !/data-trq=[\s\S]{0,80}?class="dot"/.test(code));
  ok('src `.tr-qty .dot` CSS 규칙 0건 (죽은 선택자 금지 — 134 처리와 같음)',
    !/\.tr-qty[^{]*\.dot\s*\{/.test(code));
  ok('src `.stab>.bdg` 기본 display:none', /\.stab>\.bdg\{[^}]*display:none/.test(code));
  ok('src `.stab.alert>.bdg{display:block}` 존재', /\.stab\.alert>\.bdg\{display:block\}/.test(code));

  /* 298 — «판정이 틀렸다» 이전에 **부품이 없었다**. 소스에서 두 가지를 못 박는다:
     ⓐ `#dunSub` 세 칸 전부가 배지 노드를 갖는다(칸 수는 리터럴이 아니라 마크업에서 센다)
     ⓑ 점등 조건이 «카드가 dot 을 켜는 조건»과 **한 곳**에서 나온다 — 같은 식을 renderUI 에
        한 번 더 적으면(옛 `dunAlert`) 갈라진다. 실제로 `!dunLocked` 가 갈려 있었다. */
  const dunSubBar = (src.match(/<div class="dns-sub[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];
  const dsubCells = (dunSubBar.match(/data-dsub="/g) || []).length;
  const dsubBdg = (dunSubBar.match(/data-dsub="[^"]*"[^>]*>[\s\S]*?<s class="bdg"><\/s>/g) || []).length;
  ok('src `#dunSub` 칸마다 `<s class="bdg">` — 칸 수와 배지 수가 같다 (298: 종전 3칸 중 1칸만 있었다)',
    dsubCells === 3 && dsubBdg === dsubCells, '칸 ' + dsubCells + ' / 배지 ' + dsubBdg);
  ok('src 서브탭 토글이 칸 이름을 다시 판단하지 않는다 — `dunSubAlert(t.dataset.dsub)` 한 줄',
    /toggle\('alert',\s*dunSubAlert\(t\.dataset\.dsub\)\)/.test(code)
      && !/dataset\.dsub === 'dun' && dunAlert/.test(code));
  ok('src 카드 dot 4자리가 전부 판정 함수를 부른다 (식을 두 곳에 적지 않는다 — LESSONS 58-①)',
    /dunCardOk\(d\) \?/.test(code) && /raidCardOk\(r\) \?/.test(code)
      && /arenaCardOk\(\) \?/.test(code) && /ready = towerCardOk\(t\)/.test(code));
  ok('src 탭바 «모험» 칸 = `advAlert()` (293 «경로 전체» — 서브탭 3칸의 OR)',
    /k === 'adv'\s*\?\s*advAlert\(\)/.test(code)
      && /advAlert = \(\) =>[\s\S]{0,120}dunSubAlert\('tower'\)/.test(code));

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
    const want = DUNGEONS.filter(d => !dunLocked(d) && S.dunTk[d.id] > 0 && cp() >= d.req(S.dun[d.id])).length;
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
    return { want: DUNGEONS.filter(d => !dunLocked(d) && S.dunTk[d.id] > 0).length,
             got: document.querySelectorAll('#dunList .dnc > .dot').length };
  });
  ok('던전 카드 — 요구 충족 + 횟수 남으면 켜진다', dunOn.got === dunOn.want && dunOn.want > 0,
    'dot ' + dunOn.got + ' / 기대 ' + dunOn.want);
  /* (c) 입장 횟수를 다 쓰면 다시 꺼진다 */
  const dunUsed = await ev(() => {
    DUNGEONS.forEach(d => { S.dunTk[d.id] = 0; });
    renderDunPage();
    return document.querySelectorAll('#dunList .dnc > .dot').length;
  });
  ok('던전 카드 — 입장 횟수 0 이면 꺼진다', dunUsed === 0, 'dot ' + dunUsed);

  /* ── [4] 03 던전 «서브탭» 배지 — 마크업만 있고 토글이 없어 상시 점등이던 자리 ──── */
  /* ⚠ 280 — 여기가 «뜨고 지는 FAIL» 이었다(4회 중 1회 `block / .alert true`). 서브탭 `.alert` 는
     `renderDunPage()` 가 아니라 **`renderUI()`(0.35초 주기)** 가 건다. (c) 가 입장 횟수를 0 으로
     만든 직후 «켜짐» 은 (b) 의 «요구치 0 = 입장 가능» 상태에서 굳은 옛 값이고, 다음 틱이 오기
     전에 읽으면 그대로 잡힌다. 아래 sub1 은 이미 `uiDirty=true; renderUI()` + 대기를 쓰는데
     sub0 만 아무 대기 없이 읽고 있었다 — 짝을 맞춰 **읽기 전에 강제 갱신**한다.
     (LESSONS 21-(2) «브라우저 게이트의 가짜 회귀» 와 같은 계열 — 주기 렌더에 기대지 마라) */
  await ev(() => { uiDirty = true; renderUI(); });
  await wait(500);
  const sub0 = await ev(() => {
    const t = document.querySelector('#dunSub [data-dsub="dun"]');
    return { disp: getComputedStyle(t.querySelector('.bdg')).display, alert: t.classList.contains('alert') };
  });
  ok('던전 서브탭 배지 — 입장 횟수 0(=알림 없음)이면 꺼짐',
    sub0.disp === 'none' && sub0.alert === false, sub0.disp + ' / .alert ' + sub0.alert);
  await ev(() => { DUNGEONS.forEach(d => { S.dunTk[d.id] = 3; }); uiDirty = true; renderUI(); });
  await wait(500);
  const sub1 = await ev(() => {
    const t = document.querySelector('#dunSub [data-dsub="dun"]');
    return { disp: getComputedStyle(t.querySelector('.bdg')).display, alert: t.classList.contains('alert'),
             other: document.querySelector('#dunSub [data-dsub="raid"]').classList.contains('alert') };
  });
  ok('던전 서브탭 배지 — 입장 가능해지면 켜짐(탭바 «던전» 칸과 같은 기준)',
    sub1.disp === 'block' && sub1.alert === true, sub1.disp + ' / .alert ' + sub1.alert);
  await ev(() => { window.__req0.forEach((f, i) => { DUNGEONS[i].req = f; }); uiDirty = true; renderUI(); });

  /* ── [4b] 298 — 던전 서브탭 **3칸 전수** + 탭바 «모험» 칸까지 (2026-08-28, 저장소 주인 보고) ──
     종전 [4] 는 «던전» 칸 하나만 봤다. 그 옆 두 칸은 배지 **노드 자체가 없어서**(마크업에 `<s class="bdg">`
     가 «던전» 칸에만 있었다) 어떤 판정을 붙여도 화면에 안 나왔고, 게이트에는 그 사실을 볼 절이 없었다
     (오히려 «컨텐츠 칸에는 안 번진다» 가 «항상 꺼짐» 을 정답으로 굳혀 두고 있었다 — 결함을 지키는 단언).
     ⇒ 여기서는 칸마다 ⓐ 노드가 있나 ⓑ 제 조건이 참일 때 켜지나 ⓒ 거짓일 때 꺼지나
        ⓓ **다른 칸으로 번지지 않나**(한 칸만 참으로 만들고 셋을 같이 읽는다) 를 한 표에서 본다.
     조건 만들기는 [3]·[6b] 와 같은 요령 — `cp()` 는 const 화살표라 스텁이 안 되므로 요구치를 갈아 끼운다.
     상태는 전부 스냅샷 후 복구한다(뒤의 [5]·[6]·[6b] 가 이 절의 잔재를 물려받으면 안 된다). */
  const sub3 = await ev(() => {
    const KS = ['dun', 'raid', 'tower'];
    const cell = k => document.querySelector('#dunSub [data-dsub="' + k + '"]');
    const nodes = KS.filter(k => cell(k) && cell(k).querySelector('.bdg')).length;
    const snap = {
      best: S.best, tk: JSON.stringify(S.dunTk), rb: JSON.stringify(S.raidBest),
      arena: JSON.stringify(S.arena || { w: 0, l: 0 }),
      dr: S.daily.raid, da: S.daily.arena,
      dreq: DUNGEONS.map(d => d.req), treq: TOWERS.map(t => t.req),
    };
    /* 셋을 전부 «끈다» — 각 칸의 자기소멸 조건을 그대로 만족시킨다 */
    const allOff = () => {
      DUNGEONS.forEach(d => { S.dunTk[d.id] = 0; });                 /* 던전: 입장 횟수 소진 */
      RAIDS.forEach(r => { S.raidBest[r.id] = { dmg: 1, dps: 1 }; }); /* 컨텐츠: 이미 기록을 냈다 */
      S.arena = { w: 1, l: 0 };                                       /* 컨텐츠: 아레나 한 판 했다 */
      TOWERS.forEach(t => { t.req = () => Infinity; });               /* 탑: 요구 전투력 미달 */
      DUNGEONS.forEach((d, i) => { d.req = snap.dreq[i]; });
    };
    const read = () => {
      uiDirty = true; renderUI();
      return { on: KS.map(k => cell(k).classList.contains('alert')),
               /* ⚠ 배지 노드가 없는 칸(=298 이 고친 그 결함)에서 `getComputedStyle(null)` 로
                  **게이트가 죽어** FAIL 조차 못 찍는다 — 없으면 «없음» 이라고 적고 계속 간다. */
               disp: KS.map(k => { const e = cell(k).querySelector('.bdg');
                                   return e ? getComputedStyle(e).display : '노드없음'; }),
               adv: document.querySelector('.tab[data-t="adv"]').classList.contains('alert') };
    };
    allOff(); const off = read();
    /* 한 칸씩만 참으로 만든다 — 나머지 둘은 계속 꺼진 상태여야 한다(격리) */
    allOff(); S.best = 999; DUNGEONS.forEach(d => { S.dunTk[d.id] = 3; d.req = () => 0; });
    const onDun = read();
    allOff(); S.best = 999; S.daily.raid = 3; RAIDS.forEach(r => { S.raidBest[r.id] = { dmg: 0, dps: 0 }; });
    const onRaid = read();
    allOff(); TOWERS.forEach(t => { t.req = () => 0; });
    const onTower = read();
    /* 복구 */
    S.best = snap.best; S.dunTk = JSON.parse(snap.tk); S.raidBest = JSON.parse(snap.rb);
    S.arena = JSON.parse(snap.arena); S.daily.raid = snap.dr; S.daily.arena = snap.da;
    DUNGEONS.forEach((d, i) => { d.req = snap.dreq[i]; });
    TOWERS.forEach((t, i) => { t.req = snap.treq[i]; });
    uiDirty = true; renderUI(); renderDunPage();
    return { nodes, off, onDun, onRaid, onTower };
  });
  ok('298 서브탭 3칸 전부에 배지 노드가 있다 (종전엔 «던전» 칸에만 있었다 — 판정 이전의 결손)',
    sub3.nodes === 3, sub3.nodes + '/3칸');
  ok('298 세 조건이 전부 거짓이면 3칸 다 꺼짐 (① 상시 점등 0)',
    sub3.off.on.join() === 'false,false,false' && sub3.off.disp.join() === 'none,none,none',
    sub3.off.on.join('/') + ' · ' + sub3.off.disp.join('/'));
  ok('298 «던전» 조건만 참 → 던전 칸만 켜짐 (다른 칸으로 안 번진다)',
    sub3.onDun.on.join() === 'true,false,false' && sub3.onDun.disp[0] === 'block',
    sub3.onDun.on.join('/') + ' · ' + sub3.onDun.disp.join('/'));
  ok('298 «컨텐츠» 조건만 참(측정장 기록 없음) → 컨텐츠 칸만 켜짐',
    sub3.onRaid.on.join() === 'false,true,false' && sub3.onRaid.disp[1] === 'block',
    sub3.onRaid.on.join('/') + ' · ' + sub3.onRaid.disp.join('/'));
  ok('298 «탑» 조건만 참(요구 전투력 충족) → 탑 칸만 켜짐',
    sub3.onTower.on.join() === 'false,false,true' && sub3.onTower.disp[2] === 'block',
    sub3.onTower.on.join('/') + ' · ' + sub3.onTower.disp.join('/'));
  /* 293 «경로 전체» — 서브탭 어느 칸이 켜지든 탭바 «모험» 칸이 같이 켜져야 팝업을 열기 전에 보인다 */
  ok('298 탭바 «모험» 칸 — 세 칸 다 꺼지면 꺼지고, 어느 한 칸이라도 켜지면 켜진다 (293 «경로 전체»)',
    sub3.off.adv === false && sub3.onDun.adv === true && sub3.onRaid.adv === true
      && sub3.onTower.adv === true,
    '꺼짐 ' + sub3.off.adv + ' / 던전 ' + sub3.onDun.adv + ' / 컨텐츠 ' + sub3.onRaid.adv
      + ' / 탑 ' + sub3.onTower.adv);

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

  /* ── [6b] 탑 카드(209 신설 · 210 이 «시련·절망» 둘로) — 280 에서 드러난 «감사 밖 자리» ──────
     [0] 의 옛 리터럴이 10 에서 굳은 이유가 이 자리다: 배지가 하나 늘었는데 **거동을 보는 절이 없어**
     숫자만 빨개졌다. 166 의 규약(«새 배지를 만들면 감사에 그 호스트를 추가한다») 대로 여기 넣는다.
     조건은 `cp() >= t.req(towerFloor(t))` 하나뿐 — cp() 는 const 화살표라 스텁이 안 되므로
     [3] 과 같은 요령으로 **요구치 쪽**을 갈아 끼워 두 상태를 만들고 원래 함수를 복구한다. */
  await ev(() => { setDunSub('tower'); });
  await wait(500);
  const tw = await ev(() => {
    const q = () => document.querySelectorAll('#dunList .dnc[data-tcard] > .dot').length;
    const back = TOWERS.map(t => t.req);
    TOWERS.forEach(t => { t.req = () => Infinity; }); renderDunPage(); const poor = q();
    TOWERS.forEach(t => { t.req = () => 0; });        renderDunPage(); const rich = q();
    back.forEach((f, i) => { TOWERS[i].req = f; });   renderDunPage();
    return { poor, rich, n: TOWERS.length };
  });
  ok('탑 카드 — 요구 전투력 미달이면 dot 0 (② 불가능한데 뜨면 안 된다)', tw.poor === 0, 'dot ' + tw.poor);
  ok('탑 카드 — 요구 충족이면 탑 수만큼 켜진다 (③)', tw.rich === tw.n && tw.n > 0,
    'dot ' + tw.rich + ' / 탑 ' + tw.n);

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

  /* ── [7-b] 294 — 상점 «안» 의 두 자리: 10 소환 탭 배지 · 상자 카드 ────────────────
     주인 보고(2026-08-27): «광고 보고 무료 소환이 가능한 상황인데 레드닷이 없다».
     166 은 탭바 «상점» 칸까지만 켰고 상점을 열면 표시가 사라져 **어느 상자인지** 알 수 없었다.
     판정식은 하나다 — `sumFreeReady(b) = freeLeft(b) > 0`. «광고 보고 뽑기» 와 190 «오늘 무광고
     1회» 는 같은 재고(`S.daily.freeSum`)를 태우므로 두 경로가 한 조건으로 덮인다.
     ⚠ 166 규약 음성 시험 — 무료가 0 이면 **다이아를 아무리 많이 줘도** 꺼져 있어야 한다
        (유료 10·30연은 점등 대상이 아니다. 재화는 방치로 차오르므로 상시 점등이 된다). */
  /* 프로브는 **페이지 안에** 심는다 — page.evaluate 는 클로저를 못 넘긴다(함수 소스만 직렬화된다) */
  await ev(() => {
    window.__p294 = () => {
      const cards = [...document.querySelectorAll('#shopList .shp-card')];
      const cat = document.querySelector('#shopCats .stab[data-cat="summon"]');
      const cb = cat && cat.querySelector('.bdg');
      return {
        tab: document.querySelector('.tab[data-t="shop"]').classList.contains('alert'),
        cat: !!cat && cat.classList.contains('alert'),
        catVis: !!cb && getComputedStyle(cb).display !== 'none',
        n: cards.length,
        lit: cards.filter(c => c.classList.contains('alert')).length,
        /* 배지 «노드» 가 아니라 실제로 보이는지를 잰다 — `#shopw s{display:inline-block}`(ID 급)이
           `.updot{display:none}`(클래스 급)을 이기는 함정이 이 화면에 있다(166 ⓔ·202 §3 계열). */
        vis: cards.filter(c => { const e = c.querySelector('.updot'); return !!e && getComputedStyle(e).display !== 'none'; }).length,
      };
    };
    openShopPage();
  });
  await wait(600);
  const sumOn = await ev(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    uiDirty = true; renderUI(); renderShopPage();
    return window.__p294();
  });
  ok('294 상자 카드 — 무료 소환이 남으면 상자 수만큼 켜지고 배지가 보인다 (③)',
    sumOn.n > 0 && sumOn.lit === sumOn.n && sumOn.vis === sumOn.n,
    '카드 ' + sumOn.n + ' · alert ' + sumOn.lit + ' · 보임 ' + sumOn.vis);
  ok('294 10 소환 탭 배지 — 무료 소환이 남으면 켜진다 (③)',
    sumOn.cat === true && sumOn.catVis === true, 'alert ' + sumOn.cat + ' · 보임 ' + sumOn.catVis);
  ok('294 탭바 «상점» 칸 — 상점을 연 채로도 같은 조건 (166 과 한 벌)', sumOn.tab === true, String(sumOn.tab));

  const sumOff = await ev(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 0, o), {});
    S.dia = 1e12;                       /* 음성 시험 — 유료 10·30연은 얼마든지 되지만 점등 대상이 아니다 */
    uiDirty = true; renderUI(); renderShopPage();
    return window.__p294();
  });
  ok('294 음성 — 무료 0 이면 상자 카드가 전부 꺼진다 (다이아 1e12 여도) (②)',
    sumOff.n > 0 && sumOff.lit === 0 && sumOff.vis === 0,
    '카드 ' + sumOff.n + ' · alert ' + sumOff.lit + ' · 보임 ' + sumOff.vis);
  ok('294 음성 — 무료 0 이면 10 소환 탭 배지도 꺼진다 (②)',
    sumOff.cat === false && sumOff.catVis === false, 'alert ' + sumOff.cat + ' · 보임 ' + sumOff.catVis);
  ok('294 음성 — 무료 0 이면 탭바 «상점» 칸도 꺼진다 (②)', sumOff.tab === false, String(sumOff.tab));

  /* «상자별» 인가 — 한 상자만 남기면 그 칸 하나만 켜져야 한다(전부 켜지면 «어느 상자» 를 못 알린다) */
  const sumOne = await ev(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x, i) => (o[x.b] = i === 0 ? 1 : 0, o), {});
    uiDirty = true; renderUI(); renderShopPage();
    const p = window.__p294();
    const first = document.querySelector('#shopList .shp-card');
    p.firstLit = !!first && first.classList.contains('alert');
    return p;
  });
  ok('294 상자별 판정 — 첫 상자만 남기면 그 카드 하나만 켜진다',
    sumOne.lit === 1 && sumOne.firstLit === true && sumOne.cat === true && sumOne.tab === true,
    'alert ' + sumOne.lit + ' · 첫칸 ' + sumOne.firstLit + ' · 탭 ' + sumOne.cat);

  /* 호스트 전수 감사 — 조건 클래스를 떼면 꺼지고 붙이면 켜지는가([8] 과 같은 검사, 상점이 열려 있어야 한다) */
  const audit294 = await ev(() => {
    const SITES = [
      { n: '.shp-card>.updot (10 상자 카드)', host: '#shopList .shp-card', bdg: '.updot' },
      { n: '.stab>.bdg (10 소환 탭)',         host: '#shopCats .stab[data-cat="summon"]', bdg: '.bdg' },
    ];
    return SITES.map(s => {
      const hosts = [...document.querySelectorAll(s.host)].filter(h => h.querySelector(s.bdg));
      if (!hosts.length) return { n: s.n, missing: true };
      let offBad = 0, onBad = 0, off = '', on = '';
      hosts.forEach(h => {
        const e = h.querySelector(s.bdg), had = h.classList.contains('alert');
        h.classList.remove('alert');
        off = getComputedStyle(e).display; if (off !== 'none') offBad++;
        h.classList.add('alert');
        on = getComputedStyle(e).display; if (on === 'none') onBad++;
        if (!had) h.classList.remove('alert');
      });
      return { n: s.n, n2: hosts.length, offBad, onBad, off, on };
    });
  });
  audit294.forEach(a => {
    ok('배지 «' + a.n + '» — 조건 클래스 없으면 꺼짐 / 있으면 켜짐 (호스트 전수)',
      !a.missing && a.offBad === 0 && a.onBad === 0,
      a.missing ? '노드 없음'
        : a.n2 + '개 · 꺼짐 위반 ' + a.offBad + ' · 켜짐 위반 ' + a.onBad + ' (' + a.off + ' → ' + a.on + ')');
  });
  /* ⚠ 반드시 닫는다 — 열린 채로 [8] 을 돌리면 탭바 «상점» 칸이 `.tab.close`(✕)로 바뀌고
     `.tab.close .bdg{display:none}` 이라 `.tab .bdg` 절이 그 칸 하나 때문에 «켜짐 위반 1» 이 된다
     (202 가 영웅 패널에서 겪은 것과 같은 함정). 상태도 [8] 이 기대하는 «무료 0» 으로 되돌린다. */
  await ev(() => {
    closeShopPage();
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 0, o), {});
    uiDirty = true; renderUI();
  });
  await wait(400);

  /* ── 300 — 주인 지시 «룬은 빨간점 놓지 말기»: 룬 탭·룬 하위 탭에 배지 노드도 alert 도 없다.
     재료(룬강화석)가 넘치게 넣어도 켜지지 않아야 한다 — 재료 점등은 상시 점등이 돼 폐지됐다. ── */
  const rune300 = await ev(() => {
    openTrain(); setTrSub('rune');
    S.rstone = 1e9; renderTrain();
    const top = document.querySelector('#trSubs [data-trsub="rune"]');
    const subs = [...document.querySelectorAll('#rnSubs [data-runesub]')];
    const r = {
      topBdg: top ? top.querySelectorAll('.bdg').length : -1,
      topAlert: top ? top.classList.contains('alert') : null,
      subBdg: subs.reduce((n, el) => n + el.querySelectorAll('.bdg').length, 0),
      subAlert: subs.filter(el => el.classList.contains('alert')).length,
      subs: subs.length,
    };
    S.rstone = 0; setTrSub('train'); closeTrain();
    return r;
  });
  ok('300 — «룬» 탭에 배지 노드 0 · alert 없음(재료 1e9 에서도)',
    rune300.topBdg === 0 && rune300.topAlert === false,
    'bdg ' + rune300.topBdg + ' · alert ' + rune300.topAlert);
  ok('300 — 룬 하위 탭 ' + rune300.subs + '칸 전부 배지 노드 0 · alert 없음',
    rune300.subs === 3 && rune300.subBdg === 0 && rune300.subAlert === 0,
    'bdg ' + rune300.subBdg + ' · alert ' + rune300.subAlert);

  /* ── [8] 레드닷 전수 — «조건 클래스 없이 보이는 배지» 가 한 개도 없어야 한다 ──── */
  /* 새 세이브 + 아무 상태도 안 만든 화면에서, 켜져 있는 배지는 전부 «켤 이유» 를 가져야 한다.
     여기서는 더 강하게 «기본 CSS 가 꺼져 있는가» 를 본다 — 조건 클래스를 떼면 사라져야 한다. */
  /* ⚠ 한 칸만 표본으로 보면 안 된다 — 도감 탭 6칸은 «클래스 셀렉터가 ID 셀렉터에게 진» 사례였다
     (`#collw s{display:inline-block}` 이 `.cltab>s.dot{display:none}` 을 이겨 6칸 상시 점등).
     그래서 **호스트를 전수**로 돌린다. */
  /* 202 — 영웅 서브탭에도 배지가 생겼다(«일괄 강화 가능»). 그 바는 두 종류이고
     **07·26·50 시트 쪽이 이 감사의 재발 사례**였다: `:is(#bSk,#bPet,#bCos) s{display:block}`(ID 급)이
     `.stab>.bdg{display:none}`(클래스 급)을 이겨 도감 탭과 **똑같이** 상시 점등이었다.
     시트 안 바는 패널이 열려야 DOM 에 생기므로 감사 전에 한 번 열어 둔다. */
  await ev(() => { goTab('hero'); heroSubGo('sk'); renderUI(); });
  await wait(500);
  /* ⚠ 그리고 **패널을 다시 닫는다.** 열린 탭 칸은 `.tab.close` 로 ✕ 로 치환되고
     `.tab.close .bdg{display:none}` 이라, 열어 둔 채로 감사하면 `.tab .bdg` 절이 그 칸 하나 때문에
     «켜짐 위반 1» 로 빨개진다(실제로 그렇게 됐다 — 게이트를 넓힐 때의 함정). 시트 DOM 은
     닫아도 남으므로 서브탭 바는 그대로 잰다. */
  await ev(() => { const t = document.querySelector('#tabbar .tab[data-t="hero"]'); if (t) t.click(); });
  await wait(400);
  const audit = await ev(() => {
    const SITES = [
      { n: '#menub .bdg',  host: '#menub',                    bdg: '.bdg',   cls: 'alert' },
      { n: '.ibtn .bdg',   host: '.side .ibtn[data-pop]',     bdg: '.bdg',   cls: 'on' },
      { n: '.tab .bdg',    host: '#tabbar .tab[data-t]',      bdg: '.bdg',   cls: 'alert' },
      { n: '.stab>.bdg',   host: '#dunSub .stab',             bdg: '.bdg',   cls: 'alert' },
      { n: '.cltab>s.dot', host: '#collw .cltab',             bdg: 's.dot',  cls: 'alert' },
      /* 202 신설 — 영웅 서브탭 «일괄 강화 가능» 배지, 두 호스트를 각각 전수로 */
      { n: '.stab>.bdg (06 #eqTabs)',       host: '#eqTabs .stab[data-upk]',  bdg: '.bdg', cls: 'alert' },
      { n: '.stab>.bdg (07·26·50 시트 안)', host: ':is(#bSk,#bPet,#bCos) .stab[data-upk]', bdg: '.bdg', cls: 'alert' },
      /* 293 신설 — ▦ 메뉴 안 «우편» 칸 배지. `#mnw i,#mnw s,…{display:block}`(ID 급)이
         클래스 급 숨김을 이기는 166 ⓔ·202 와 똑같은 함정 자리라 여기서 먼저 빨개져야 한다. */
      { n: '#mnw .mn-b>.bdg',               host: '#mnw .mn-b[data-mn]',      bdg: '.bdg', cls: 'alert' },
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

  /* ── 276 — «일괄 강화 가능» 레드닷의 나머지 두 자리(카드·진입 버튼 · [일괄 강화] 버튼 자체) ──
     202 §7 이 남긴 규약 그대로다: **배지를 새로 달았으면 이 감사에 그 호스트를 추가한다.**
     새 부품은 `<s class="updot">` 이고 호스트에 `.alert` 를 건다. 이 부품은 «조건이 참일 때만»
     노드로 찍히므로(카드마다 달아 두고 숨기는 방식이 아니다) 감사 전에 재료를 채워 넣어야
     노드가 생긴다 — 재고는 감사 직후 원상 복구한다(뒤 도감 절이 이 상태를 안 물려받게).
     05 `#wpnw` 와 07·26 시트는 ID 급으로 `<s>` 를 켜 두는 화면이라 **바로 이 감사의 재발 후보**다. */
  const ownSnap = await ev(() => JSON.stringify(S.own));
  await ev(() => {
    [EQUIPS, SKILLS, PETS].forEach(L => L.forEach(it => { S.own[it.id] = { l: 1, n: 1e12 }; }));
    markDirty(); uiDirty = true; renderUI();
    goTab('hero'); heroSubGo('eq'); renderUI(); openWeapon(null, 'weapon');
  });
  await wait(700);
  await ev(() => { closeWeapon(); heroSubGo('sk'); renderUI(); });
  await wait(700);
  await ev(() => { heroSubGo('pet'); renderUI(); });
  await wait(700);
  const audit276 = await ev(() => {
    const SITES = [
      { n: '.eqsl>.updot (06 부위 슬롯 = 05 진입 버튼)', host: '#eqCards .eqsl' },
      { n: '.wgc>.updot (05 무기 격자 카드)',            host: '#wpnGrid .wgc' },
      { n: '.sk-card>.updot (07·26 카드)',               host: ':is(#bSk,#bPet) .sk-card' },
      { n: '.sk-btn>.updot (07·26 [일괄 강화])',         host: ':is(#bSk,#bPet) .sk-btn' },
      { n: '#wpnBtnUp>.updot (05 [일괄 강화])',          host: '#wpnBtnUp' },
    ];
    return SITES.map(s => {
      const hosts = [...document.querySelectorAll(s.host)].filter(h => h.querySelector('.updot'));
      if (!hosts.length) return { n: s.n, missing: true };
      let offBad = 0, onBad = 0, off = '', on = '';
      hosts.forEach(h => {
        const e = h.querySelector('.updot'), had = h.classList.contains('alert');
        h.classList.remove('alert');
        off = getComputedStyle(e).display; if (off !== 'none') offBad++;
        h.classList.add('alert');
        on = getComputedStyle(e).display; if (on === 'none') onBad++;
        if (!had) h.classList.remove('alert');
      });
      return { n: s.n, n2: hosts.length, offBad, onBad, off, on };
    });
  });
  audit276.forEach(a => {
    ok('배지 «' + a.n + '» — 조건 클래스 없으면 꺼짐 / 있으면 켜짐 (호스트 전수)',
      !a.missing && a.offBad === 0 && a.onBad === 0,
      a.missing ? '노드 없음'
        : a.n2 + '개 · 꺼짐 위반 ' + a.offBad + ' · 켜짐 위반 ' + a.onBad + ' (' + a.off + ' → ' + a.on + ')');
  });
  /* 276 «세 자리 동시 점등» — 한 상태에서 ① 탭 ② 카드 ③ 버튼이 같이 켜져 있는가.
     ⚠ 바로 위 감사가 호스트마다 `.alert` 를 뗐다 붙였다 한다 = 60 쥬시 `jzDotIn`(.3s, scale 0→1)이
     **다시 시작한다.** 기다리지 않고 재면 폭이 0 으로 잡혀 «안 켜졌다» 로 오독한다(202 §3 과 같은 함정). */
  await wait(700);
  const trio276 = await ev(() => {
    const vis = sel => [...document.querySelectorAll(sel)]
      .filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length;
    return {
      tab:  document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
      stab: vis(':is(#bSk,#bPet,#bCos) .stab[data-upk="pet"] .bdg'),
      card: vis('#bPet .sk-card.alert>.updot'),
      btn:  vis('#bPet [data-ptup]>.updot'),
    };
  });
  ok('276 «세 자리 동시 점등» — ① 탭바 영웅+서브탭 · ② 카드 · ③ [일괄 강화] 버튼이 같이 켜진다',
    trio276.tab && trio276.stab >= 1 && trio276.card >= 1 && trio276.btn >= 1,
    'tab=' + trio276.tab + ' stab=' + trio276.stab + ' card=' + trio276.card + ' btn=' + trio276.btn);
  /* 재고 원상 복구 — 뒤 절(도감)이 이 감사용 상태를 물려받지 않게 한다 */
  /* ⚠ 이 파일의 `ev()` 는 인자를 안 넘긴다(fn 하나만) — 스냅샷은 page.evaluate 로 직접 넘긴다 */
  await page.evaluate(snap => { S.own = JSON.parse(snap); markDirty(); uiDirty = true; renderUI(); }, ownSnap);
  await wait(400);

  /* 도감 탭 — 특이성을 고친 뒤 «조건»(collTabReady)이 실제로 화면에 반영되는지까지 본다 */
  await ev(() => { if (typeof openColl21 === 'function') openColl21(); });
  await wait(600);
  /* 280 — 여기도 [0] 과 같은 병이 있었다: 「6칸」이 리터럴이고, `s.dot` 이 없는 칸이 생기면
     `getComputedStyle(null)` 로 **게이트가 즉사**해 한 줄도 안 찍힌다(228·278 과 같은 계열).
     ⓐ 칸 수는 **`COLL_TABS` 에서 파생**(마크업과 데이터가 어긋나면 그 자체가 빨개진다) —
        [0] 의 «정적 dot = `.cltab` 칸 수» 와 물려서 «COLL_TABS → .cltab → s.dot» 사슬이 닫힌다.
     ⓑ `s.dot` 이 없으면 죽지 말고 `miss` 로 표시해 그 칸만 불일치로 잡는다. */
  const cl = await ev(() => {
    const tabs = [...document.querySelectorAll('#collTabs .cltab')];
    return { want: COLL_TABS.map(t => t.k), rows: tabs.map(t => {
      const e = t.querySelector('s.dot');
      return { k: t.dataset.ct, rdy: collTabReady(t.dataset.ct),
        miss: !e, shown: !!e && getComputedStyle(e).display !== 'none' };
    }) };
  });
  ok('도감 탭 ' + cl.want.length + '칸(= `COLL_TABS`) — 레드닷 = «강화 가능한 세트가 있다» 와 정확히 일치',
    cl.rows.length === cl.want.length
      && cl.rows.every((t, i) => t.k === cl.want[i])
      && cl.rows.every(t => !t.miss && t.rdy === t.shown),
    cl.rows.map(t => t.k + (t.rdy ? '✔' : '✘') + (t.miss ? '✖dot없음' : t.shown ? '●' : '○')).join(' ')
      + ' / 기대 ' + cl.want.join(' '));

  /* ── [8-2] 293 — 우편 레드닷은 «경로 전체» 에 뜬다 (저장소 주인 보고 2026-08-27) ──────
     ▦ 버튼 배지 하나만으로는 **누르는 순간 사라져서**(`#menub.mnon`) 메뉴를 연 사용자에게
     신호가 한 개도 안 남는다. 그래서 두 자리를 같이 단언한다 —
       ⓐ 받을 우편 있음 → `#menub.alert` **그리고** `#mnw .mn-b[data-mn=mail].alert`
       ⓑ 다 받음      → 둘 다 꺼짐
       ⓒ 새 우편 도착(`sendMail`) → 둘 다 다시 켜짐
     상태는 감사 뒤에 원래대로 되돌린다(뒤 절이 이 상태를 물려받지 않게).
     ⚠ **여기서 부를 것은 `renderUI()` 가 아니라 `drawHud()` 다.** 레드닷 토글
     (`sideAlert('attend'/'roul'/'mail'/…)`)은 `drawHud()` 안에 있고 `renderUI()` 는 그 줄을
     한 번도 안 지난다 — `renderUI()` 로 재면 «다 받았는데 안 꺼진다» 로 **가짜 FAIL** 이 난다
     (loop() 가 매 프레임 drawHud 를 돌리므로 실제 화면에서는 즉시 꺼진다. 실제로 이 게이트를
     쓰다가 한 번 걸렸다). 절전 모드(56)만 drawHud 를 통째로 건너뛴다. */
  const mailSnap = await ev(() => JSON.stringify({ mail: S.mail, mailx: S.mailx, seq: S.mailSeq }));
  const mailOn = await ev(() => {
    S.mail = {}; uiDirty = true; drawHud();
    return { left: mailLeft(),
      btn: document.getElementById('menub').classList.contains('alert'),
      cell: document.querySelector('#mnw .mn-b[data-mn="mail"]').classList.contains('alert') };
  });
  ok('293 ⓐ 받을 우편 있음 → ▦ 버튼 레드닷 켜짐',
    mailOn.left > 0 && mailOn.btn === true, 'left ' + mailOn.left + ' · btn ' + mailOn.btn);
  ok('293 ⓐ 받을 우편 있음 → ▦ 메뉴 «우편» 칸 레드닷 켜짐 (버튼 배지는 메뉴를 열면 사라진다)',
    mailOn.left > 0 && mailOn.cell === true, 'left ' + mailOn.left + ' · cell ' + mailOn.cell);
  const mailOff = await ev(() => {
    claimAllMail(); uiDirty = true; drawHud();
    return { left: mailLeft(),
      btn: document.getElementById('menub').classList.contains('alert'),
      cell: document.querySelector('#mnw .mn-b[data-mn="mail"]').classList.contains('alert') };
  });
  ok('293 ⓑ 다 받으면 두 자리 모두 꺼진다',
    mailOff.left === 0 && mailOff.btn === false && mailOff.cell === false,
    'left ' + mailOff.left + ' · btn ' + mailOff.btn + ' · cell ' + mailOff.cell);
  const mailNew = await ev(() => {
    sendMail({ t: '게이트', b: '', g: 100 }); uiDirty = true; drawHud();
    return { left: mailLeft(),
      btn: document.getElementById('menub').classList.contains('alert'),
      cell: document.querySelector('#mnw .mn-b[data-mn="mail"]').classList.contains('alert') };
  });
  ok('293 ⓒ 새 우편 1통 도착 → 두 자리 모두 다시 켜진다',
    mailNew.left === 1 && mailNew.btn === true && mailNew.cell === true,
    'left ' + mailNew.left + ' · btn ' + mailNew.btn + ' · cell ' + mailNew.cell);
  /* 메뉴를 «열었을 때» 두 배지가 서로를 대신하는지 — 버튼은 꺼지고 칸은 켜져 있어야 한다 */
  const mailOpen = await ev(() => {
    openMenu();
    const bd = document.querySelector('#menub .bdg');
    const cd = document.querySelector('#mnw .mn-b[data-mn="mail"] .bdg');
    const r = { btnDisp: getComputedStyle(bd).display, cellDisp: cd ? getComputedStyle(cd).display : '노드없음' };
    closeMenu();
    return r;
  });
  ok('293 메뉴 열림 — ▦ 버튼 배지는 숨고(레퍼런스 52) «우편» 칸 배지가 그 자리를 잇는다',
    mailOpen.btnDisp === 'none' && mailOpen.cellDisp === 'block',
    '버튼 ' + mailOpen.btnDisp + ' · 칸 ' + mailOpen.cellDisp);
  /* ⚠ 이 파일의 `ev` 는 인자를 안 넘긴다(`fn => page.evaluate(fn)`) — 스냅샷 복원은 직접 부른다. */
  await page.evaluate(snap => { const d = JSON.parse(snap); S.mail = d.mail; S.mailx = d.mailx; S.mailSeq = d.seq;
    uiDirty = true; drawHud(); }, mailSnap);

  /* ── [8-3] 318 — 출석 보상 레드닷도 «경로 전체» 다 (저장소 주인 지시 2026-08-28) ──────
     293(우편)과 **같은 형태**다: 진입 버튼(좌측 사이드 «출석»)의 배지는 정상이지만,
     70 팝업을 여는 순간 딤(`#modal` z30 > `.side` z3) 아래로 들어가 화면에서 사라진다.
     그래서 경로의 다음 칸(팝업 «오늘 카드» `[data-att]`)까지 같이 단언한다 —
       ⓐ 미출석 → 사이드 버튼 `.on` **그리고** 팝업 «오늘 카드» `.alert` + `s.updot` 1개
       ⓑ 166 규약 → 받을 수 없는 칸(수령 완료 `got` · 미래)에는 배지 0개
       ⓒ 호스트 감사 → `.alert` 떼면 꺼지고 붙이면 켜진다
       ⓓ 음성 → 수령하면 두 자리 모두 꺼진다
     ⚠ 여기도 `renderUI()` 가 아니라 **`drawHud()`** 다(위 293 절의 경고와 같은 이유).
     상태는 감사 뒤에 되돌린다. 전수 위치·화소 판정은 `tools/verify318.js` 가 따로 본다. */
  const attSnap = await ev(() => JSON.stringify(S.att));
  const attOn = await ev(() => {
    S.att = { n: 3, date: '' }; uiDirty = true; drawHud();
    openAttend();
    const t = document.querySelector('#mbox [data-att]');
    const all = [...document.querySelectorAll('#mbox .at-c, #mbox .at-c7')];
    return {
      side: document.querySelector('.side .ibtn[data-pop="attend"]').classList.contains('on'),
      alert: !!t && t.classList.contains('alert'),
      dots: t ? t.querySelectorAll('.updot').length : 0,
      others: all.filter(c => c !== t).reduce((s, c) => s + c.querySelectorAll('.updot').length, 0),
      cards: all.length,
    };
  });
  ok('318 ⓐ 미출석 → 사이드 «출석» 버튼 레드닷 켜짐',
    attOn.side === true, String(attOn.side));
  ok('318 ⓐ 미출석 → 70 팝업 «오늘 카드» 레드닷 켜짐 (사이드 배지는 팝업 딤 아래로 사라진다)',
    attOn.alert === true && attOn.dots === 1, 'alert ' + attOn.alert + ' · 닷 ' + attOn.dots);
  ok('318 ⓑ 166 규약 — 받을 수 없는 칸(수령 완료·미래)에는 레드닷 0개',
    attOn.others === 0 && attOn.cards === 7, '카드 ' + attOn.cards + '칸 · 나머지 닷 ' + attOn.others);
  const attAudit = await ev(() => {
    const h = document.querySelector('#mbox [data-att]'), e = h && h.querySelector('.updot');
    if (!e) return { miss: true };
    h.classList.remove('alert'); const off = getComputedStyle(e).display;
    h.classList.add('alert');    const on = getComputedStyle(e).display;
    return { off, on };
  });
  ok('318 ⓒ 배지 «.at-c>.updot» — `.alert` 없으면 꺼짐 / 있으면 켜짐',
    !attAudit.miss && attAudit.off === 'none' && attAudit.on === 'block',
    attAudit.miss ? '노드 없음' : attAudit.off + ' → ' + attAudit.on);
  const attOff = await ev(() => {
    const t = document.querySelector('#mbox [data-att]');
    if (t) t.click();                       /* 수령 → claimAttend + openAttend 재렌더 */
    uiDirty = true; drawHud();
    return {
      side: document.querySelector('.side .ibtn[data-pop="attend"]').classList.contains('on'),
      dots: document.querySelectorAll('#mbox .updot').length,
      today: !!document.querySelector('#mbox [data-att]'),
    };
  });
  ok('318 ⓓ 음성 — 수령하면 두 자리 모두 꺼진다',
    attOff.side === false && attOff.dots === 0 && attOff.today === false,
    '사이드 ' + attOff.side + ' · 팝업 닷 ' + attOff.dots + ' · 오늘칸 ' + attOff.today);
  await page.evaluate(snap => { S.att = JSON.parse(snap); closeModal(); uiDirty = true; drawHud(); }, attSnap);
  await wait(300);

  /* ── [9] 콘솔 ───────────────────────────────────────────────────────── */
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const bad = R.filter(r => !r.c);
  R.forEach(r => console.log((r.c ? '  ok   ' : '  FAIL ') + r.n + (r.got === undefined ? '' : '  [' + r.got + ']')));
  console.log('\nVERIFY166 ' + (bad.length ? 'FAIL' : 'PASS') + ' ' + (R.length - bad.length) + '/' + R.length);
  process.exit(bad.length ? 1 : 0);
})();
