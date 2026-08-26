/* 47 게이트 — 서브탭 «칸 기하·정합» (2026-08-26 작업 134 로 되살림)
 *
 *   실행: node tools/verify47.js   (1080x2280 기준 · 헤드리스)
 *
 * 이력 — 왜 검사 대상이 바뀌었나:
 *   원래 47 은 «23 훈련 팝업 서브탭 4칸 → 2칸(훈련 · 스탯 훈련)» 게이트였다.
 *   작업 88 이 «스탯 훈련» 을 폐기하면서 훈련은 단일 화면이 됐고, `#trSub` 가 사라져
 *   이 게이트는 FAIL 도 아니고 **예외로 즉사**했다(`getElementById('trSub')` → null).
 *   즉 88 이후로 한 줄도 돈 적이 없다(작업 134 로 등재 — `docs/review/132-verify64죽은게이트.md` §7).
 *
 *   폐기된 절은 «지우기» 가 아니라 «같은 취지를 지금 있는 대상으로 옮기기» 다(LESSONS 132-3).
 *   47 이 지키던 성질은 «훈련» 이라는 화면이 아니라 **서브탭 바의 기하**였다 —
 *   칸이 균등한가 · 칸끼리 벌어지거나 겹치지 않는가 · 활성 알약이 칸을 넘지 않는가 ·
 *   라벨 잉크가 칸(활성이면 알약 «면») 안에 들어오는가 · 활성 칸이 정확히 1개인가 ·
 *   닫았다 다시 열어도 그대로인가. 이 성질들은 작업 96 이 서브탭을 공용 부품
 *   `.stabs > .stab` 으로 합친 뒤 **네 화면(07 영웅 시트 · 06 장비 · 03 던전 · 10 상점)** 에
 *   그대로 살아 있고, **아무 게이트도 보고 있지 않다**:
 *     · `tools/verify88.js` [B] = «훈련에 서브탭이 없다»(폐기 확인)  ← 47 의 옛 대상
 *     · `tools/verify96.js` ①  = «네 바의 색·테두리·폰트가 같다» — 주석에 «위치·폭은 화면별
 *                                실측이라 다르다» 고 적고 **기하를 일부러 뺐다**
 *   그래서 47 = «공용 서브탭 부품의 기하 게이트» 로 옮겼다. 파일명·ID 는 참조가 걸려 있어 유지한다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 DOM 실측 판정이라 비평가를 띄우지 않는다.
 *
 * 측정 주의 — **프레임 스케일**: 03·10 은 전체화면 페이지가 `transform:scale()` 로 앉으므로
 *   `getBoundingClientRect()` 값이 프레임 px 가 아니다(바 h 99 → 실측 97.5).
 *   바의 `rect.width / offsetWidth` 로 스케일을 구해 **프레임 px 로 환산한 뒤** 판정한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);

/* 96 이 못박은 부품 규격 (index.html `.stabs`/`.stab` — 호스트는 위치만 정한다) */
const BAR_H = 99, BAR_BORDER = 6, CELL_H = 85;
/* 활성 알약의 좌우 «검정 7 + 밝은 림 7» = 면이 시작되는 안쪽 여백 */
const PILL_LIP = 14;
/* 4칸 격자 — 바 콘텐츠 기준 상대 좌표(.stab-c1~c4) */
const GRID4 = [[0, 224], [220, 261], [481, 223], [709, 229]];

/* 본문 반응 probe — «지금 보이는 본문 컨테이너» 를 이름으로 돌려준다.
   `!!document.querySelector('#bSk')` 류는 노드가 늘 남아 있어 true→true 로 **아무것도 검사하지 않는다**. */
const BODY_VIS = 'JSON.stringify(["bSk","bPet","bCos","eqw"].filter(id => { const e = document.getElementById(id);'
  + ' return e && e.offsetParent !== null; }))';

/* 검사 대상 네 바. open/close/restore 는 페이지 컨텍스트에서 돈다 */
const BARS = [
  { key: 'sk', name: '07 영웅 시트(스킬)', sel: '#bSk .stabs', host: '#bSk', n: 4,
    open: 'goTab("hero",true); heroSubGo("sk");',
    click: '#bSk [data-sktab="cos"]', afterSel: '#bCos .stabs', afterLabel: '코스튬',
    body: BODY_VIS, restore: 'heroSubGo("sk");' },
  { key: 'eq', name: '06 장비', sel: '#eqTabs', host: '.eqp', n: 4,
    open: 'goTab("hero",true); heroSubGo("eq");',
    click: '#eqTabs [data-eqtab="sk"]', afterSel: '#bSk .stabs', afterLabel: '스킬',
    body: BODY_VIS, restore: 'heroSubGo("eq");' },
  { key: 'dun', name: '03 던전', sel: '#dunSub', host: '#dunw', n: 2,
    open: 'goTab("adv");', close: 'closeDungeon();',
    click: '#dunSub [data-dsub="raid"]', afterSel: '#dunSub', afterLabel: '레이드',
    body: 'document.getElementById("dunList").innerHTML.length', restore: 'document.querySelector(\'#dunSub [data-dsub="dun"]\').click();' },
  /* 124 — «이용권» 탭이 붙어 2칸 → 3칸(.sp3) */
  { key: 'shop', name: '10 상점', sel: '#shopCats', host: '#shopw', n: 3,
    open: 'goTab("shop");', close: 'closeShopPage();',
    click: '#shopCats [data-cat="coin"]', afterSel: '#shopCats', afterLabel: '재화',
    body: 'document.getElementById("shopList").innerHTML.length', restore: 'document.querySelector(\'#shopCats [data-cat="summon"]\').click();' },
];

/* 페이지 안에서 도는 실측기 — 프레임 px 로 환산해 돌려준다 */
const SNAP = `(sel, host) => {
  const bar = document.querySelector(sel);
  if (!bar) return { missing: true };
  const s = bar.getBoundingClientRect().width / bar.offsetWidth;   /* 프레임 스케일 */
  /* 숨은 바는 rect 0 → 0/0 = NaN 이라 «Δ NaN 인데 PASS» 가 나올 수 있다. 여기서 잘라낸다 */
  if (!isFinite(s) || s <= 0) return { missing: true, hidden: true };
  const R = e => { const b = e.getBoundingClientRect();
    return { x: b.x / s, y: b.y / s, w: b.width / s, h: b.height / s }; };
  const cs = getComputedStyle(bar);
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const ink = cells.map(c => { const i = c.querySelector('i'); if (!i) return null;
    const rg = document.createRange(); rg.selectNodeContents(i);
    const b = rg.getBoundingClientRect();
    return { x: b.x / s, w: b.width / s, ol4: i.classList.contains('ol4'), ol3: i.classList.contains('ol3') }; });
  const seps = [...bar.querySelectorAll(':scope > .stab-sep')].map(R);
  const hostEl = document.querySelector(host);
  const onIdx = cells.findIndex(c => c.classList.contains('on'));
  const onCs = onIdx >= 0 ? getComputedStyle(cells[onIdx]) : null;
  return {
    scale: s, bar: R(bar), radius: cs.borderRadius, bw: cs.borderTopWidth, bc: cs.borderTopColor,
    boxSizing: cs.boxSizing,
    cells: cells.map(R), cellTop: cells.map(c => getComputedStyle(c).top),
    onN: cells.filter(c => c.classList.contains('on')).length, onIdx,
    onRadius: onCs ? onCs.borderRadius : '', onShadow: onCs ? onCs.boxShadow : '',
    labels: cells.map(c => (c.querySelector('i') || {}).textContent || ''),
    ink, seps, host: hostEl ? R(hostEl) : null,
    bdg: [...bar.querySelectorAll('.bdg')].map(b => ({ cell: cells.findIndex(c => c.contains(b)), r: R(b) })),
  };
}`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(900);

  /* ---- 0. 47 의 «옛 대상» 은 폐기됐다 (88) ---- */
  console.log('\n[0] 옛 대상(23 훈련 서브탭) 폐기 확인 — 되살아나면 이 게이트의 전제가 깨진다');
  const old = await page.evaluate(() => {
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (_) { return []; } })
      .map(r => r.selectorText || '').join(' | ');
    return { trSub: !!document.getElementById('trSub'),
      trsub: document.querySelectorAll('[data-trsub]').length,
      css: /\.tr-sub/.test(css) };
  });
  ok('#trSub 노드 0 (88 폐기 — 상세 게이트는 verify88 [B])', old.trSub === false, String(old.trSub));
  ok('[data-trsub] 0개', old.trsub === 0, old.trsub + '개');
  ok('.tr-sub CSS 규칙 0건', old.css === false, String(old.css));

  const snaps = {};
  for (const b of BARS) {
    console.log('\n[1] ' + b.name + ' — 부품 규격 (' + b.sel + ')');
    await page.evaluate(o => eval(o), b.open);
    await page.waitForTimeout(650);
    const g = await page.evaluate(([fn, sel, host]) => eval(fn)(sel, host), [SNAP, b.sel, b.host]);
    snaps[b.key] = g;
    if (g.missing) { ok('바 존재', false, b.sel + ' 없음 — 이후 절 건너뜀'); continue; }

    ok('바 높이 ' + BAR_H, near(g.bar.h, BAR_H, 0.6), f1(g.bar.h));
    ok('바 radius 50 · border 6 #000 · border-box',
      g.radius === '50px' && g.bw === BAR_BORDER + 'px' && g.bc === 'rgb(0, 0, 0)' && g.boxSizing === 'border-box',
      g.radius + ' / ' + g.bw + ' ' + g.bc + ' / ' + g.boxSizing);
    ok('칸 ' + b.n + '개', g.cells.length === b.n, g.cells.length + '개');
    ok('칸 높이 85 · top 0 (바 안에 앉는다)',
      g.cells.every(c => near(c.h, CELL_H, 0.6)) && g.cellTop.every(t => t === '0px'),
      g.cells.map(c => f1(c.h)).join('/') + ' · top ' + [...new Set(g.cellTop)].join(','));

    /* ---- 2. 칸 격자 ---- */
    console.log('\n[2] ' + b.name + ' — 칸 격자');
    const cx = g.bar.x + BAR_BORDER, cw = g.bar.w - BAR_BORDER * 2;   /* 바 «콘텐츠» 상자 */
    /* 124 — 균등분할 바는 2칸(.sp2)·3칸(.sp3) 둘 다 «콘텐츠 상자 ÷ n» 규칙 하나로 본다 */
    if (b.n === 2 || b.n === 3) {
      const sw = cw / b.n;
      ok(b.n + '칸 균등 (Δ ≤ 0.5)', g.cells.every(c => near(c.w, g.cells[0].w, 0.5)),
        g.cells.map(c => f1(c.w)).join(' / '));
      ok('칸 폭 = 콘텐츠 ÷' + b.n + ' = ' + f1(sw), near(g.cells[0].w, sw, 0.6), f1(g.cells[0].w));
      for (let i = 1; i < b.n; i++) {
        ok('칸 경계' + i + ' 맞닿음 (빈틈·겹침 0)',
          near(g.cells[i - 1].x + g.cells[i - 1].w, g.cells[i].x, 0.5),
          'Δ' + f1(g.cells[i].x - g.cells[i - 1].x - g.cells[i - 1].w));
        ok('경계' + i + ' = 콘텐츠 ' + i + '/' + b.n + ' 지점', near(g.cells[i].x, cx + sw * i, 0.6),
          f1(g.cells[i].x - cx) + ' vs ' + f1(sw * i));
      }
      ok('마지막 칸 오른끝 = 콘텐츠 오른끝',
        near(g.cells[b.n - 1].x + g.cells[b.n - 1].w, cx + cw, 0.6),
        f1(g.cells[b.n - 1].x + g.cells[b.n - 1].w - cx) + ' vs ' + f1(cw));
      ok('구분선 0개 (균등분할 바는 구분선을 두지 않는다 — 96)', g.seps.length === 0, g.seps.length + '개');
    } else {
      GRID4.forEach(([l, w], i) => {
        ok('칸' + (i + 1) + ' 격자 left ' + l + ' · w ' + w,
          near(g.cells[i].x - cx, l, 0.6) && near(g.cells[i].w, w, 0.6),
          f1(g.cells[i].x - cx) + ' / ' + f1(g.cells[i].w));
      });
      ok('마지막 칸 오른끝 = 콘텐츠 오른끝',
        near(g.cells[3].x + g.cells[3].w, cx + cw, 0.6),
        f1(g.cells[3].x + g.cells[3].w - cx) + ' vs ' + f1(cw));
      ok('구분선 1개 · 5x54 · 3·4칸 사이(left 704)',
        g.seps.length === 1 && near(g.seps[0].w, 5, 0.6) && near(g.seps[0].h, 54, 0.6)
        && near(g.seps[0].x - cx, 704, 0.6),
        g.seps.length + '개 ' + (g.seps[0] ? f1(g.seps[0].w) + 'x' + f1(g.seps[0].h) + ' @' + f1(g.seps[0].x - cx) : ''));
    }
    ok('모든 칸이 바 콘텐츠 안 (돌출 0)',
      g.cells.every(c => c.x >= cx - 0.6 && c.x + c.w <= cx + cw + 0.6),
      g.cells.map(c => f1(c.x - cx) + '..' + f1(c.x + c.w - cx)).join(' '));

    /* ---- 3. 칸 안 정합 ---- */
    console.log('\n[3] ' + b.name + ' — 활성 알약 · 라벨 잉크');
    ok('활성 칸 정확히 1개', g.onN === 1, g.onN + '개');
    ok('활성 알약 radius 36 · 좌우 검정 7 + 림 14 (칸 안쪽에만)',
      g.onRadius === '36px' && /rgb\(0, 0, 0\) 7px 0px 0px 0px inset/.test(g.onShadow)
      && /rgb\(0, 0, 0\) -7px 0px 0px 0px inset/.test(g.onShadow)
      && /14px 0px 0px 0px inset/.test(g.onShadow) && /-14px 0px 0px 0px inset/.test(g.onShadow),
      g.onRadius + ' / ' + g.onShadow.slice(0, 60));
    g.cells.forEach((c, i) => {
      const k = g.ink[i];
      if (!k) { ok('칸' + (i + 1) + ' 라벨 <i> 존재', false); return; }
      const on = i === g.onIdx;
      ok('칸' + (i + 1) + '«' + g.labels[i] + '» 잉크 중심 = 칸 중심 (Δ ≤ 2)',
        near(k.x + k.w / 2, c.x + c.w / 2, 2), 'Δ' + f1(k.x + k.w / 2 - (c.x + c.w / 2)));
      /* 활성 칸은 «면» 안(좌우 림 14 침범 0), 비활성 칸은 칸 안 */
      const lo = c.x + (on ? PILL_LIP : 0), hi = c.x + c.w - (on ? PILL_LIP : 0);
      ok('칸' + (i + 1) + ' 잉크 ' + (on ? '알약 면' : '칸') + ' 안 (잘림 0)',
        k.x >= lo - 0.5 && k.x + k.w <= hi + 0.5,
        f1(k.x - c.x) + '..' + f1(k.x + k.w - c.x) + ' / ' + (on ? f1(PILL_LIP) + '..' + f1(c.w - PILL_LIP) : '0..' + f1(c.w)));
      ok('칸' + (i + 1) + ' 라벨 외곽선 = ' + (on ? 'ol4(활성)' : 'ol3(비활성)'),
        on ? (k.ol4 && !k.ol3) : (k.ol3 && !k.ol4), 'ol3=' + k.ol3 + ' ol4=' + k.ol4);
    });
    g.bdg.forEach(d => {
      const c = g.cells[d.cell];
      ok('레드닷 27x27 · 칸' + (d.cell + 1) + ' 안 (돌출 0)',
        near(d.r.w, 27, 0.8) && near(d.r.h, 27, 0.8)
        && d.r.x >= c.x - 0.5 && d.r.x + d.r.w <= c.x + c.w + 0.5,
        f1(d.r.w) + 'x' + f1(d.r.h) + ' @' + f1(d.r.x - c.x) + '..' + f1(d.r.x + d.r.w - c.x) + ' / 칸 ' + f1(c.w));
    });
    ok('바가 호스트(' + b.host + ') 안 (잘림 0)',
      !!g.host && g.bar.x >= g.host.x - 0.6 && g.bar.x + g.bar.w <= g.host.x + g.host.w + 0.6
      && g.bar.y + g.bar.h <= g.host.y + g.host.h + 0.6,
      g.host ? 'bar ' + f1(g.bar.x) + '+' + f1(g.bar.w) + ' y' + f1(g.bar.y + g.bar.h)
        + ' / host ' + f1(g.host.x) + '+' + f1(g.host.w) + ' y' + f1(g.host.y + g.host.h) : '호스트 없음');

    /* ---- 4. 실동작 — 칸을 누르면 활성이 옮겨가고 본문이 바뀐다 ---- */
    console.log('\n[4] ' + b.name + ' — 전환 실동작');
    const before = await page.evaluate(o => eval(o), b.body);
    const clicked = await page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; e.click(); return true; }, b.click);
    ok('비활성 칸 클릭 가능 (' + b.click + ')', clicked);
    await page.waitForTimeout(600);
    const g2 = await page.evaluate(([fn, sel, host]) => eval(fn)(sel, host), [SNAP, b.afterSel, b.host]);
    const after = await page.evaluate(o => eval(o), b.body);
    ok('활성이 «' + b.afterLabel + '» 칸으로 이동 · 활성 1개',
      !g2.missing && g2.onN === 1 && g2.labels[g2.onIdx] === b.afterLabel,
      g2.missing ? '바 없음' : g2.labels[g2.onIdx] + ' (.on ' + g2.onN + '개)');
    ok('본문이 실제로 반응했다', !!after && after !== before, String(before) + ' → ' + String(after));
    if (!g2.missing) {
      const c = g2.cells[g2.onIdx], k = g2.ink[g2.onIdx];
      /* 활성 스타일은 fs43→41 · scaleX .914→.893 으로 잉크가 바뀐다 — 옮겨간 칸에서 다시 잰다 */
      ok('옮겨간 활성 칸 잉크도 알약 면 안 (잘림 0)',
        k && k.x >= c.x + PILL_LIP - 0.5 && k.x + k.w <= c.x + c.w - PILL_LIP + 0.5,
        k ? f1(k.x - c.x) + '..' + f1(k.x + k.w - c.x) + ' / 면 ' + PILL_LIP + '..' + f1(c.w - PILL_LIP) : '잉크 없음');
      ok('옮겨간 활성 칸 라벨 외곽선 ol4 (stabInk 토글)', !!k && k.ol4 && !k.ol3,
        k ? 'ol3=' + k.ol3 + ' ol4=' + k.ol4 : '잉크 없음');
    }
    await page.evaluate(o => eval(o), b.restore);
    await page.waitForTimeout(500);
  }

  /* ---- 5. 닫았다 다시 열어도 그대로 (원래 47 §3 꼬리 — 잔존 상태 버그) ---- */
  console.log('\n[5] 닫기 → 재진입');
  for (const key of ['dun', 'shop']) {
    const b = BARS.find(x => x.key === key);
    await page.evaluate(o => eval(o), b.open);              /* 확실히 연 상태로 만든 뒤 */
    await page.waitForTimeout(400);
    await page.evaluate(o => eval(o), b.close);             /* 닫고 */
    await page.waitForTimeout(400);
    await page.evaluate(o => eval(o), b.open);              /* 다시 연다 */
    await page.waitForTimeout(650);
    const g = await page.evaluate(([fn, sel, host]) => eval(fn)(sel, host), [SNAP, b.sel, b.host]);
    const g0 = snaps[key];
    ok(b.name + ' 재진입 — 칸 ' + b.n + '개 · 활성 1개',
      !g.missing && g.cells.length === b.n && g.onN === 1,
      g.missing ? '바 없음' : g.cells.length + '칸 · .on ' + g.onN + '개');
    ok(b.name + ' 재진입 — 칸 폭·위치 그대로 (Δ ≤ 0.6)',
      !g.missing && g.cells.every((c, i) => near(c.x, g0.cells[i].x, 0.6) && near(c.w, g0.cells[i].w, 0.6)),
      g.missing ? '-' : g.cells.map((c, i) => 'Δ' + f1(c.x - g0.cells[i].x) + '/' + f1(c.w - g0.cells[i].w)).join(' '));
  }

  /* ---- 6. 콘솔 ---- */
  console.log('\n[6] 콘솔');
  ok('에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* 캡처 — 네 바를 한눈에 볼 수 있게 상점 바 주변만 잘라 남긴다 */
  const sc = snaps.shop;
  if (sc && !sc.missing) {
    await page.evaluate(o => eval(o), BARS.find(b => b.key === 'shop').open);
    await page.waitForTimeout(600);
    const r = await page.evaluate(sel => { const b = document.querySelector(sel).getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height }; }, '#shopCats');
    await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/47-subtab.png'),
      clip: { x: 0, y: Math.max(0, r.y - 40), width: W, height: Math.min(180, H - Math.max(0, r.y - 40)) } });
  }

  console.log('\nVERIFY47 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
