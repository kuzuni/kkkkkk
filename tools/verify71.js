/* 작업 71 회귀 게이트 — 좌측 «우편» 아이콘 제거 + 레드닷 이관 + 52 메뉴 «공지·게임 라운지» 제거.
   지시서 [3]-(가) 기계적 작업 검증: 남은 요소의 좌표가 A2/52 측정 규격 그대로인지,
   지운 경로가 정말 사라졌는지, 대체 경로(▦ 메뉴 → 우편)가 실제로 동작하는지를 본다.
   사용: node tools/verify71.js
   브라우저: PW_CHROMIUM 또는 /opt/pw-browsers/chromium[-1194/chrome-linux/chrome] */
const fs = require('fs'), path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium',
                 '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
  for (const p of cands) { try { if (fs.statSync(p).isFile()) return { executablePath: p }; } catch (e) {} }
  return {};
}

const R = [];
const ok = (n, c, got) => { R.push({ n, c: !!c, got }); };
const near = (a, b, t) => Math.abs(a - b) <= t;

(async () => {
  /* ── 0. 소스 레벨: 지운 것이 정말 지워졌나 (죽은 데이터·분기 포함) ───────────── */
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  /* 주석은 빼고 «코드» 에만 남아 있는지 본다 — 주석의 «작업 71 로 지웠다» 설명은 잔여물이 아니다 */
  const code = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('src 좌측 data-pop="mail" 0건', !/data-pop="mail"/.test(code));
  ok('src data-mn="notice" 0건',     !/data-mn="notice"/.test(code));
  ok('src data-mn="lounge" 0건',     !/data-mn="lounge"/.test(code));
  ok('src NOTICE 배열·참조 0건',      !/NOTICE/.test(code));
  ok('src .mn-b.gl 규칙 0건',        !/mn-b\.gl|class="mn-b gl"/.test(code));
  /* CSS 주석 짝 — LESSONS 52-④ (주석 하나 어긋나면 다음 규칙 블록이 통째로 죽고 콘솔은 조용하다) */
  const css = src.slice(src.indexOf('<style'), src.indexOf('</style>'));
  let depth = 0, unmatched = 0;
  for (let i = 0; i < css.length - 1; i++) {
    if (css[i] === '/' && css[i + 1] === '*') { depth++; i++; }
    else if (css[i] === '*' && css[i + 1] === '/') { depth--; i++; if (depth < 0) { unmatched++; depth = 0; } }
  }
  ok('CSS 주석 짝 맞음', depth === 0 && unmatched === 0, `열림잔여 ${depth} / 짝없는닫힘 ${unmatched}`);

  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1200);
  /* 180 — 이 게이트의 레드닷·행수 단언은 전부 **고정 우편 `MAILS`** 를 표본으로 쓴다
     («전부 수령» 을 `MAILS.forEach` 로 만들고 `mailLeft()`(= allMails 기준) 으로 확인한다).
     180 이 부팅 직후 «월별 다이아» 동적 우편을 한 통 넣으면서 그 둘이 갈라졌다 —
     동적 우편은 `verify153`·`verify180` 의 몫이므로 여기서는 표본을 고정 우편으로 되돌린다.
     달 열쇠를 이번 달로 채워 두면 `monthlyCheck()` 가 다시 보내지 않는다. */
  await page.evaluate(() => {
    if (typeof S !== 'object') return;
    S.mailx = []; S.mailSeq = 0; S.mail = {};
    const d = new Date();
    S.lastMonthly = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    sideAlert('mail', mailLeft() > 0);
  });

  /* ── 1. 좌측 사이드 — 5행(우편 없음) · 남은 행 좌표가 A2 그리드 그대로 ────────── */
  const side = await page.evaluate(() => {
    const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
    const F = el => { const b = el.getBoundingClientRect();
      return { x: +((b.left - ar.left) / sc).toFixed(1), y: +((b.top - ar.top) / sc).toFixed(1),
               w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1) }; };
    const rows = [...document.querySelectorAll('#sideL .ibtn')].map(b => ({ k: b.dataset.pop, box: F(b) }));
    const cs = getComputedStyle(app);
    return { rows, vars: { ih: cs.getPropertyValue('--ih').trim(), igap: cs.getPropertyValue('--igap').trim(),
                           itop: cs.getPropertyValue('--itop').trim() },
             sideR: !!document.getElementById('sideR') };
  });
  const keys = side.rows.map(r => r.k);
  ok('#sideL 행 5개', side.rows.length === 5, keys.join(','));
  ok('#sideL 에 mail 없음', !keys.includes('mail'), keys.join(','));
  ok('#sideL 순서 = attend,roul,quest,promo,bless',
     keys.join(',') === 'attend,roul,quest,promo,bless', keys.join(','));
  /* A2 규격: 단독행 top 176(=--itop 72 + HUD 오프셋) · 라벨행 pitch 134. 제거 전 실측 y 와 같아야 한다. */
  const EXP = { attend: 176, roul: 337, quest: 471, promo: 605, bless: 739 };
  side.rows.forEach(r => ok(`행 ${r.k} y=${EXP[r.k]}`, near(r.box.y, EXP[r.k], 1.5), r.box.y));
  ok('행 그리드 변수 불변(--ih 82 · --igap 20 · --itop 72)',
     side.vars.ih === '82.00px' && side.vars.igap === '20.00px' && side.vars.itop === '72.00px',
     JSON.stringify(side.vars));
  ok('행 겹침 0건', side.rows.every((r, i) =>
     i === 0 || r.box.y >= side.rows[i - 1].box.y + side.rows[i - 1].box.h - 0.5));
  ok('#sideR 없음(작업 49)', !side.sideR);

  /* ── 2. 레드닷 이관 — 우편 미수령이면 ▦ 배지 ON, 전부 수령하면 OFF ────────────── */
  const dotOn = await page.evaluate(() => {
    const b = document.getElementById('menub');
    return { left: mailLeft(), alert: b.classList.contains('alert'),
             vis: getComputedStyle(b.querySelector('.bdg')).display };
  });
  ok('초기 상태에 미수령 우편 있음', dotOn.left > 0, dotOn.left);
  ok('미수령 → #menub.alert', dotOn.alert === true);
  ok('미수령 → 배지 보임', dotOn.vis === 'block', dotOn.vis);

  const dotOff = await page.evaluate(() => {
    MAILS.forEach(m => { S.mail[m.id] = 1; });      /* 전부 수령한 상태로 만든다 */
    sideAlert('mail', mailLeft() > 0);
    const b = document.getElementById('menub');
    return { left: mailLeft(), alert: b.classList.contains('alert'),
             vis: getComputedStyle(b.querySelector('.bdg')).display };
  });
  ok('전부 수령 → 미수령 0', dotOff.left === 0, dotOff.left);
  ok('전부 수령 → .alert 해제', dotOff.alert === false);
  ok('전부 수령 → 배지 숨김', dotOff.vis === 'none', dotOff.vis);
  await page.evaluate(() => { MAILS.forEach(m => { delete S.mail[m.id]; }); sideAlert('mail', mailLeft() > 0); });

  /* 갱신 루프(refreshAlerts)가 sideAlert('mail') 을 계속 부르므로 배지가 살아 돌아와야 한다 */
  await page.waitForTimeout(700);
  ok('유휴 갱신 뒤에도 배지 복구',
     await page.evaluate(() => document.getElementById('menub').classList.contains('alert')));

  /* ── 3. 52 메뉴 — 7칸(공지·라운지 없음) · 규격 유지 · 패널 안에 들어감 ────────── */
  await page.evaluate(() => { document.getElementById('menub').click(); });
  await page.waitForTimeout(350);
  const menu = await page.evaluate(() => {
    const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
    const F = el => { const b = el.getBoundingClientRect();
      return { x: +((b.left - ar.left) / sc).toFixed(1), y: +((b.top - ar.top) / sc).toFixed(1),
               w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1) }; };
    const col = document.querySelector('#mnw .mn-col');
    return { open: document.getElementById('mnw').classList.contains('on'),
             mnon: document.getElementById('menub').classList.contains('mnon'),
             badge: getComputedStyle(document.querySelector('#menub .bdg')).display,
             col: F(col), tail: F(document.querySelector('#mnw .mn-tail')),
             menub: F(document.getElementById('menub')),
             items: [...document.querySelectorAll('#mnw [data-mn]')].map(b => ({ k: b.dataset.mn, box: F(b) })) };
  });
  ok('메뉴 열림', menu.open && menu.mnon);
  ok('메뉴 열린 동안 배지 숨김(mnon 우선)', menu.badge === 'none', menu.badge);
  const mk = menu.items.map(i => i.k);
  ok('메뉴 칸 7개', menu.items.length === 7, mk.join(','));
  ok('메뉴 순서 = mail,rank,guide,bag,saver,conf,pass',
     mk.join(',') === 'mail,rank,guide,bag,saver,conf,pass', mk.join(','));
  ok('notice·lounge 칸 없음', !mk.includes('notice') && !mk.includes('lounge'));
  /* 검산식(LESSONS 52-①): 칸높이×N + 간격×(N−1) + 상하패딩 = 패널높이 */
  ok('패널 높이 800(=7×100 + 6×10 + 40.5)', near(menu.col.h, 800, 1), menu.col.h);
  ok('패널 폭 138 · left 761 · top 128.5 불변',
     near(menu.col.w, 138, 1) && near(menu.col.x, 761, 1) && near(menu.col.y, 128.5, 1),
     `${menu.col.x}/${menu.col.y}/${menu.col.w}`);
  menu.items.forEach((it, i) => {
    ok(`칸 ${it.k} 99×100`, near(it.box.w, 99, 1) && near(it.box.h, 100, 1), `${it.box.w}x${it.box.h}`);
    if (i) ok(`칸 ${it.k} pitch 110`, near(it.box.y - menu.items[i - 1].box.y, 110, 1),
              +(it.box.y - menu.items[i - 1].box.y).toFixed(1));
  });
  ok('첫 칸 상변 149(=ref 233 − 84)', near(menu.items[0].box.y, 149, 1), menu.items[0].box.y);
  const cb = menu.col.y + menu.col.h, lb = menu.items[6].box.y + menu.items[6].box.h;
  ok('마지막 칸이 패널 안 · 하패딩 20', lb <= cb + 0.5 && near(cb - lb, 20, 1.5), +(cb - lb).toFixed(1));
  ok('칸 겹침 0건', menu.items.every((it, i) =>
     i === 0 || it.box.y >= menu.items[i - 1].box.y + menu.items[i - 1].box.h - 0.5));
  /* 꼬리는 #menub 을 가리킨다 — 패널이 짧아져도 꼭짓점 y 가 버튼 세로 범위 안이어야 한다 */
  const tc = menu.tail.y + menu.tail.h / 2;
  ok('꼬리가 #menub 세로 범위 안', tc >= menu.menub.y && tc <= menu.menub.y + menu.menub.h,
     `tail ${tc.toFixed(1)} / menub ${menu.menub.y}~${(menu.menub.y + menu.menub.h).toFixed(1)}`);
  ok('꼬리가 패널 밖(x ≥ 패널 우변)', menu.tail.x >= menu.col.x + menu.col.w - 0.5,
     `${menu.tail.x} vs ${(menu.col.x + menu.col.w).toFixed(1)}`);

  /* ── 4. 대체 경로 실동작 — ▦ 메뉴 → 우편 → 우편함이 실제로 열리고 수령까지 된다 ── */
  await page.evaluate(() => document.querySelector('#mnw [data-mn="mail"]').click());
  await page.waitForTimeout(420);
  const mail = await page.evaluate(() => {
    const m = document.getElementById('modal');
    return { on: m.classList.contains('on'), ml69: m.classList.contains('ml69'),
             menuClosed: !document.getElementById('mnw').classList.contains('on'),
             title: document.getElementById('mtitle').textContent,
             rows: document.querySelectorAll('#mbox .ml-r').length,
             gold: S.gold, dia: S.dia };
  });
  ok('메뉴→우편: 우편함 모달 열림', mail.on && mail.ml69, `${mail.on}/${mail.ml69}`);
  ok('메뉴→우편: 메뉴 닫힘', mail.menuClosed);
  ok('메뉴→우편: 제목 «우편함»', mail.title === '우편함', mail.title);
  ok('메뉴→우편: 우편 5통 렌더', mail.rows === 5, mail.rows);
  await page.evaluate(() => document.getElementById('mailBtn').click());
  await page.waitForTimeout(700);
  const claimed = await page.evaluate(() => ({
    left: mailLeft(), gold: S.gold, dia: S.dia,
    alert: document.getElementById('menub').classList.contains('alert') }));
  ok('전체 수령: 미수령 0', claimed.left === 0, claimed.left);
  ok('전체 수령: 골드 증가', claimed.gold > mail.gold, `${mail.gold} → ${claimed.gold}`);
  ok('전체 수령: 다이아 증가', claimed.dia > mail.dia, `${mail.dia} → ${claimed.dia}`);
  ok('전체 수령: ▦ 레드닷 꺼짐', claimed.alert === false);

  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const bad = R.filter(r => !r.c);
  R.forEach(r => console.log((r.c ? '  ok ' : '  FAIL ') + r.n + (r.got === undefined ? '' : '  [' + r.got + ']')));
  console.log(`\nVERIFY71 ${bad.length ? 'FAIL' : 'PASS'} ${R.length - bad.length}/${R.length}`);
  process.exit(bad.length ? 1 : 0);
})();
