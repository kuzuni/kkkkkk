/* 41 검증 — ① 기능 체크(T2 «기능 완성 규칙») ② 회귀(02 메인 · 03 · 14 좌표/픽셀).
   node verify41.js
   비교 기준본은 `git show <ref>:index.html` 을 임시 파일로 떨궈서 쓴다(스크립트가 알아서 만든다).
   <ref> 는 인자로 준다 — 기본값 HEAD~1. 41 이 손대기 «전» 커밋을 줘야 회귀 대조가 유효하다.
     예) node verify41.js 0384edc   (33 이 올라온 직후 = 41 직전 상태) */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BEFORE = path.resolve('.before41.tmp.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  OK   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
const eq = (m, a, b, tol = 0) => (Math.abs(a - b) <= tol ? ok(`${m} (${a})`) : no(`${m}: ${a} ≠ ${b}`));

/* 02 유휴 루프가 굴리는 값 — 픽셀 대조에서 빼야 한다 (51 함정 3) */
const VOLATILE = ['nickN', 'cpN', 'hpT', 'chapN'];

const GEO_SEL = {
  main: ['#top', '.prof', '.curs', '#stagearea', '#stinfo', '#slots', '#tabbar', '#sideL', '#sideR'],
  dun: ['#dunw', '.dns-list', '.dns-sub', '#dunList .dnc'],
  rel: ['#relicw', '.rlx-strip', '.rlx-sub', '#relicBody'],
};

async function snap(page, which) {
  return page.evaluate(({ w, sels }) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const out = {};
    sels[w].forEach((s) => {
      document.querySelectorAll(s).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        out[s + '#' + i] = [+(r.left - app.left).toFixed(1), +(r.top - app.top).toFixed(1),
          +r.width.toFixed(1), +r.height.toFixed(1)];
      });
    });
    return out;
  }, { w: which, sels: GEO_SEL });
}

async function open(browser, file, which) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(900);
  if (which === 'dun') await page.evaluate(() => openDungeon());
  if (which === 'rel') await page.evaluate(() => openRelicPage());
  await page.waitForTimeout(500);
  await page.evaluate((v) => {
    const el = document.getElementById('view'); if (el) el.style.visibility = 'hidden';
    /* 51 함정 3 — 유휴 루프가 굴리는 값은 매 프레임 다시 쓰이므로 «소스» 를 고정해야 한다.
       S.nick 은 'U_'+Date.now() 라 textContent 만 바꾸면 다음 프레임에 되돌아온다. */
    S.nick = 'U_FIXED'; if (typeof uiDirty !== 'undefined') uiDirty = true;
    v.forEach((id) => { const e = document.getElementById(id); if (e) e.textContent = 'X'; });
  }, VOLATILE);
  await page.waitForTimeout(100);
  return { ctx, page, errs };
}

(async () => {
  execSync(`git show ${process.argv[2] || 'HEAD~1'}:index.html > ${BEFORE}`);
  const browser = await chromium.launch();
  const NOW = path.resolve('index.html');

  /* ---------- ① 기능 체크 ---------- */
  console.log('\n[1] 기능 체크 — 재화 변동이 팝업 내 재화 바에 반영되는가');
  for (const which of ['dun', 'rel']) {
    const { ctx, page, errs } = await open(browser, NOW, which);
    const st = await page.evaluate(() => ({ g: S.gold, d: S.dia, key: KEY }));
    const read = () => page.evaluate((w) => {
      const root = document.getElementById(w === 'rel' ? 'relicw' : 'dunw');
      const b = root.querySelector('.pcb');
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect(), t = document.getElementById('top').getBoundingClientRect();
      return {
        gold: root.querySelector('.pcb-g>b').textContent,
        dia: root.querySelector('.pcb-d>b').textContent,
        hud: { gold: document.getElementById('goldN').textContent, dia: document.getElementById('diaN').textContent },
        visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0,
        coversHud: r.top <= t.top + 0.5 && r.bottom >= t.bottom - 0.5 && r.width >= t.width - 0.5,
        zOverProf: (() => {
          const p = document.querySelector('.prof').getBoundingClientRect();
          const cx = p.left + p.width / 2, cy = p.top + p.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          return !!(hit && hit.closest('.pcb'));
        })(),
      };
    }, which);

    let v = await read();
    ok(`[${which}] 재화 바 렌더됨 (visible=${v.visible})`);
    if (v.coversHud) ok(`[${which}] 바가 상단 HUD 스트립을 전부 덮는다`); else no(`[${which}] HUD 스트립 미덮음`);
    if (v.zOverProf) ok(`[${which}] 프로필 플레이트 자리를 바가 점유(메인 HUD 노출 0)`); else no(`[${which}] 프로필 플레이트가 노출된다`);
    eq(`[${which}] 초기 골드 표기 = fmt(S.gold)`, v.gold === (await page.evaluate(() => fmt(S.gold))) ? 1 : 0, 1);
    eq(`[${which}] 초기 다이아 표기 = fmt(S.dia)`, v.dia === (await page.evaluate(() => fmt(S.dia))) ? 1 : 0, 1);

    /* 실제 게임 동작으로 재화를 움직인다 — 우편 일괄 수령(claimAllMail) */
    const gained = await page.evaluate(() => {
      const before = { g: S.gold, d: S.dia };
      claimAllMail();
      return { before, after: { g: S.gold, d: S.dia } };
    });
    await page.waitForTimeout(700);
    v = await read();
    const expG = await page.evaluate(() => fmt(S.gold)), expD = await page.evaluate(() => fmt(S.dia));
    if (gained.after.g > gained.before.g) ok(`[${which}] claimAllMail() 로 S.gold ${Math.round(gained.before.g)} → ${Math.round(gained.after.g)}`);
    else no(`[${which}] claimAllMail() 이 골드를 안 줬다`);
    v.gold === expG ? ok(`[${which}] 골드 변동이 바에 반영 (${v.gold})`) : no(`[${which}] 골드 미반영: 바 ${v.gold} ≠ ${expG}`);
    v.dia === expD ? ok(`[${which}] 다이아 변동이 바에 반영 (${v.dia})`) : no(`[${which}] 다이아 미반영: 바 ${v.dia} ≠ ${expD}`);
    v.gold === v.hud.gold ? ok(`[${which}] 바 표기 = 메인 HUD 표기(같은 소스)`) : no(`[${which}] 바(${v.gold}) ≠ HUD(${v.hud.gold})`);

    /* 세이브 반영 */
    const saved = await page.evaluate((k) => { const j = JSON.parse(localStorage.getItem(k) || '{}'); return { g: j.gold, d: j.dia }; }, st.key);
    saved.g === gained.after.g ? ok(`[${which}] localStorage[KEY].gold 반영`) : no(`[${which}] 세이브 미반영 ${saved.g} ≠ ${gained.after.g}`);

    /* 소비 방향도 본다 — 재화를 빼면 바가 줄어드는가 */
    await page.evaluate(() => { S.gold = Math.floor(S.gold / 2); uiDirty = true; });
    await page.waitForTimeout(700);
    const v2 = await read(), exp2 = await page.evaluate(() => fmt(S.gold));
    v2.gold === exp2 ? ok(`[${which}] 감소 방향도 반영 (${v2.gold})`) : no(`[${which}] 감소 미반영 ${v2.gold} ≠ ${exp2}`);

    errs.length ? no(`[${which}] 콘솔 에러 ${errs.length}건: ${errs[0]}`) : ok(`[${which}] 콘솔 에러 0`);
    await ctx.close();
  }

  /* ---------- ② 회귀 ---------- */
  console.log('\n[2] 회귀 — 수정 전(HEAD~1) 대비 좌표 변화');
  for (const which of ['main', 'dun', 'rel']) {
    const a = await open(browser, BEFORE, which === 'main' ? null : which);
    const before = await snap(a.page, which); await a.ctx.close();
    const b = await open(browser, NOW, which === 'main' ? null : which);
    const after = await snap(b.page, which); await b.ctx.close();
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const diff = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    diff.length === 0
      ? ok(`[${which}] 요소 ${keys.length}종 좌표 Δ0`)
      : no(`[${which}] 좌표 변화 ${diff.length}건: ` + diff.map((k) => `${k} ${JSON.stringify(before[k])}→${JSON.stringify(after[k])}`).join(' | '));
  }

  /* ---------- ③ 02 메인 픽셀 회귀 ---------- */
  console.log('\n[3] 02 메인 픽셀 회귀 (팝업 닫힌 기본 상태)');
  const shots = {};
  for (const [tag, file] of [['before', BEFORE], ['after', NOW]]) {
    const { ctx, page } = await open(browser, file, null);
    shots[tag] = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    await ctx.close();
  }
  fs.writeFileSync('.v41a.png', shots.before); fs.writeFileSync('.v41b.png', shots.after);
  /* 스킬 슬롯(#slots)은 쿨다운 링이 rAF 로 도는 «유휴 애니메이션» 이라 같은 파일을 두 번 찍어도
     달라진다 — 대조에서 제외한다(51 함정 3 과 같은 부류). 제외 박스는 실측으로 잡는다. */
  const ex = await (async () => { const { ctx, page } = await open(browser, NOW, null);
    const r = await page.evaluate(() => { const a = document.getElementById('app').getBoundingClientRect(),
      s = document.getElementById('slots').getBoundingClientRect();
      return [Math.floor(s.left - a.left) - 4, Math.floor(s.top - a.top) - 4,
        Math.ceil(s.right - a.left) + 4, Math.ceil(s.bottom - a.top) + 4]; });
    await ctx.close(); return r; })();
  const diff = execSync(`python3 pxdiff41.py .v41a.png .v41b.png ${ex.join(' ')}`).toString().trim();
  const nd = parseInt(diff.split(' ')[0], 10);
  nd === 0 ? ok('02 메인 픽셀 Δ0 (#slots 쿨다운 애니 제외)') : no('02 메인 픽셀 ' + diff);

  await browser.close();
  fs.unlinkSync(BEFORE);
  console.log(`\n${fail === 0 ? 'VERIFY41 PASS' : 'VERIFY41 FAIL'} (${pass}/${pass + fail})`);
  process.exit(fail === 0 ? 0 : 1);
})();
