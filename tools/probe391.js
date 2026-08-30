#!/usr/bin/env node
/* 재현기 — 작업 391 「19 프로필 팝업이 9:13.3 에서 하단 탭바를 172px 덮는다」
 *
 *   node tools/probe391.js
 *
 * 338·341·350 규칙: **처방 전에 재현한다.** 등재문은 값(172px)까지 적어 뒀지만
 * «그래서 그게 결함인가» 를 안 정하고 넘겼다(등재문 스스로 «착수하는 세션은 먼저 이것이
 * 진짜 결함인지부터 정할 것» 이라고 적어 뒀다 — 채점 규칙 2 는 «깊은 딤 위 가운데
 * 다이얼로그가 뒤 배경을 가리는 것» 을 감점에서 뺀다).
 *
 * 그래서 이 자는 «덮는가» 가 아니라 **«덮임이 무엇을 망가뜨리는가»** 를 축으로 세운다.
 *   ⓐ 기하 — `.pf` 상자 · 탭바 · HUD 잉크 끝(`.pedge` 142) · 위/아래 여백을 3프레임에서.
 *   ⓑ 가림의 성질 — 딤의 알파(깊은 딤인가) · 탭바 자리의 `elementFromPoint`.
 *   ⓒ 조작 — 팝업이 열린 채로 탭을 **실제로 클릭**하면 화면이 바뀌는가(= 덮임이 조작을 먹는가).
 *   ⓓ 잘림 — `.pf` 자식 중 프레임 밖으로 나간 것(= 241 이 고친 원 증상의 재발 감시).
 *   ⓔ **검산** — 같은 패널이 **1920 에서도 탭바를 덮는다**. 1920 은 241 이 «한 픽셀도 안 바뀌어야
 *      한다» 고 얼려 둔, ①~④ 8점 통과 상태의 프레임이다. 덮임이 결함이라면 그 화면이 먼저
 *      빨개져야 한다(335 의 «앱 탭바가 −60 으로 Δ0 인데 아무도 지적 안 했다» 와 같은 꼴의 검산).
 *
 * ⚠ 이 자는 **«수리 전» 사본**에서도 돈다 — `index.html` 의 상한 상수(1427)를 241 시절의 1404 로
 *   되돌린 임시 파일을 만들어 거기에 붙는다(`verify348` §R 방식). 그래야 수리가 들어간 뒤에도
 *   «수리 전에는 이랬다» 가 기록으로 계속 돈다. 갈아 끼울 자리를 못 찾으면 조용히 초록이 되지 않고
 *   그렇게 말하고 죽는다(neg279 처방).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');
/* 작업 415(2026-08-30) 이관 — 「수리 후」가 391(상한 1427 · 고정 높이 1396)에서
   415(상한 1444 · 짧은 프레임에서 패널이 `--pfsh` 만큼 짧아짐)로 갱신됐다.
   ⚠ 「수리 전」은 그대로 **241 선언**이다 — 이 자가 재현하려는 것은 391 등재문의 값
   (top 196 · 아래 여백 8 · 탭바 172)이고 그건 안 바뀌었다. 되돌릴 자리가 여섯으로 늘었을 뿐이다. */
const REV241 = [
  ['top:clamp(190px, 431px, calc(var(--frameh, 2280px) - 1444px))', 'top:clamp(104px, 431px, calc(100% - 1404px))'],
  ['height:calc(1396px - var(--pfsh))', 'height:1396px'],
  ['height:calc(544px - var(--pfsh))', 'height:544px'],
  ['top:calc(1026px - var(--pfsh))', 'top:1026px'],
  ['top:calc(1089px - var(--pfsh))', 'top:1089px'],
  ['top:calc(1105px - var(--pfsh))', 'top:1105px'],
  ['top:calc(1261px - var(--pfsh))', 'top:1261px'],
];
const NEW = REV241[0][0];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = n => Math.round(n * 10) / 10;

/* 한 프레임에서 19 프로필을 열고 ⓐ~ⓓ 를 잰다. */
async function measure(browser, file, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('#profBtn', { force: true }).catch(() => {});
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const pf = document.querySelector('#pfw .pf').getBoundingClientRect();
    const tb = document.getElementById('tabbar').getBoundingClientRect();
    const ink = document.querySelector('.pedge').getBoundingClientRect();
    const dim = getComputedStyle(document.getElementById('pfw')).backgroundColor;
    const tab = document.querySelector('.tab[data-t]');
    const tr = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2);
    const kids = [...document.querySelectorAll('#pfw .pf > *')].map((e) => {
      const r = e.getBoundingClientRect();
      return { c: (e.className || e.id || '?').toString().split(' ')[0],
        top: r.top - app.top, bot: r.bottom - app.top };
    });
    return {
      frameH: app.height,
      inkEnd: ink.bottom - app.top,
      pfTop: pf.top - app.top, pfBot: pf.bottom - app.top, pfH: pf.height,
      tabTop: tb.top - app.top, tabH: tb.height,
      topGap: pf.top - app.top - (ink.bottom - app.top),
      botGap: app.bottom - pf.bottom,
      cover: Math.max(0, pf.bottom - tb.top),
      dim,
      hit: hit ? (hit.id || hit.className || hit.tagName) : null,
      hitIsTab: !!(hit && hit.closest && hit.closest('.tab[data-t]')),
      out: kids.filter((k) => k.bot > app.height + 0.5 || k.top < -0.5).map((k) => k.c),
      tabName: tab.dataset.t,
      panelOpen: document.getElementById('pfw').classList.contains('on'),
    };
  });

  /* ⓒ 조작 — 팝업이 열린 채로 탭바의 탭을 실제로 클릭한다. */
  const tabs = await page.$$('.tab[data-t]');
  const before = await page.evaluate(() => ({
    pf: document.getElementById('pfw').classList.contains('on'),
    on: (document.querySelector('.tab.on') || {}).dataset ? document.querySelector('.tab.on').dataset.t : null,
    panel: (document.querySelector('#panel .pg.on') || {}).id || null,
  }));
  await tabs[1].click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => ({
    pf: document.getElementById('pfw').classList.contains('on'),
    on: document.querySelector('.tab.on') ? document.querySelector('.tab.on').dataset.t : null,
    panel: (document.querySelector('#panel .pg.on') || {}).id || null,
  }));
  m.tabClickChanged = JSON.stringify(before) !== JSON.stringify(after);
  m.errs = errs.length;
  await ctx.close();
  return m;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const pre = REV241.reduce((t, [a, b]) => {
    if (!t.includes(a)) {
      console.error('probe391: `.pf` 선언(415 값)을 못 찾았다 — 자리가 옮겨졌다. 갱신할 것: ' + a);
      process.exit(2);
    }
    return t.replace(a, b);
  }, src);
  const tmp = path.join(require('os').tmpdir(), 'probe391-pre.html');
  fs.writeFileSync(tmp, pre);

  const browser = await launch(chromium);
  const A = {}, B = {};
  for (const H of [2280, 1920, 1600]) {
    B[H] = await measure(browser, tmp, H);       /* 수리 전(241) */
    A[H] = await measure(browser, SRC, H);       /* 수리 후(391) */
  }
  await browser.close();

  console.log('\n── ⓐ 기하 (프레임 좌표) ─────────────────────────────────────────');
  console.log('  frameH │ HUD잉크 │ .pf top→bot          │ 위 여백 │ 아래 여백 │ 탭바 덮임');
  for (const H of [2280, 1920, 1600]) {
    for (const [tag, M] of [['전(241)', B[H]], ['후(415)', A[H]]]) {
      console.log(`  ${H} ${tag} │ ${r1(M.inkEnd)} │ ${r1(M.pfTop)}..${r1(M.pfBot)} (h${r1(M.pfH)}) │ `
        + `${r1(M.topGap)} │ ${r1(M.botGap)} │ ${r1(M.cover)}`);
    }
  }

  console.log('\n── 판정 ────────────────────────────────────────────────────────');
  /* ⓐ 기준 프레임 두 개는 한 픽셀도 안 움직인다 (241 이 못박은 조건) */
  for (const H of [2280, 1920]) {
    ok(A[H].pfTop === 431 && A[H].pfTop === B[H].pfTop,
      `[ⓐ ${H}] .pf top 431 불변 (수리 전 ${B[H].pfTop} → 후 ${A[H].pfTop})`);
  }
  ok(B[1600].pfTop === 196 && B[1600].botGap === 8,
    `[ⓐ 1600] 수리 전 = 등재문 값 (top 196 · 아래 여백 8) — 실측 top ${r1(B[1600].pfTop)} · 여백 ${r1(B[1600].botGap)}`);
  /* 415 이관 — 「띠 한가운데」라는 성질은 그대로이고 값만 173/31 → 190/48 로 옮겼다
     (패널이 34px 짧아진 만큼 남는 절반이 커졌다). 성질을 물으므로 상수를 안 적는다. */
  ok(Math.abs(A[1600].topGap - A[1600].botGap) <= 1 && A[1600].pfTop === Math.round(A[1600].inkEnd + A[1600].topGap),
    `[ⓐ 1600] 수리 후 = 띠 한가운데 (top ${r1(A[1600].pfTop)} · 위 ${r1(A[1600].topGap)} = 아래 ${r1(A[1600].botGap)})`);
  ok(A[1600].botGap > B[1600].botGap && A[1600].botGap >= 40,
    `[ⓐ 1600] 415 가 그 절반을 더 벌렸다 (241 ${r1(B[1600].botGap)} → 415 ${r1(A[1600].botGap)} · 내부 패딩 40 초과)`);
  ok(B[1600].cover === 172,
    `[ⓐ 1600] 등재문 «탭바 172px 덮음» 재현 — 실측 ${r1(B[1600].cover)}`);

  /* ⓔ 검산 — 1920 이 이미 덮고 있다 */
  ok(B[1920].cover > 0 && A[1920].cover === B[1920].cover,
    `[ⓔ 1920] 얼려 둔 «8점 통과» 프레임도 탭바를 덮는다 (${r1(B[1920].cover)}px · 수리 전후 동일) ⇒ «덮임» 자체는 결함이 아니다`);
  ok(A[2280].cover === 0, `[ⓔ 2280] 기준 프레임은 안 덮는다 (${r1(A[2280].cover)})`);

  /* ⓑ 가림의 성질 — 깊은 딤 + 탭 자리가 팝업/딤에 먹힌다 */
  for (const H of [2280, 1600]) {
    const a = (A[H].dim.match(/[\d.]+\)$/) || ['0)'])[0].replace(')', '') * 1;
    ok(a >= 0.8, `[ⓑ ${H}] #pfw 딤이 «깊은 딤» (alpha ${a} ≥ .8 · ${A[H].dim})`);
    ok(!A[H].hitIsTab, `[ⓑ ${H}] 탭 중심의 elementFromPoint 가 탭이 아니다 (${A[H].hit})`);
  }

  /* ⓒ 조작 — 덮인 탭은 애초에 눌리지 않는다 */
  for (const H of [2280, 1920, 1600]) {
    ok(!A[H].tabClickChanged && A[H].panelOpen,
      `[ⓒ ${H}] 팝업이 열린 채 탭을 클릭해도 아무것도 안 바뀐다 (팝업 유지 ${A[H].panelOpen})`);
  }

  /* ⓓ 잘림 0 — 241 원 증상 재발 감시 */
  for (const H of [2280, 1920, 1600]) {
    ok(A[H].out.length === 0 && A[H].errs === 0,
      `[ⓓ ${H}] .pf 자식이 프레임 밖으로 안 나간다 · 콘솔 에러 0 (밖 ${A[H].out.length}건 · err ${A[H].errs})`);
  }

  console.log(`\nPROBE391 ${pass}/${pass + fail}` + (fail ? ' — FAIL ' + fail : ''));
  process.exit(fail ? 1 : 0);
})();
