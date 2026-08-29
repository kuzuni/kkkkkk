#!/usr/bin/env node
/* 작업 391 회귀 게이트 — 19 프로필 팝업의 «짧은 프레임 하단 여백»
 *   실행: node tools/verify391.js   → 마지막 줄이 `VERIFY391 n/n PASS` 여야 한다.
 *
 * 등재문은 «1600 에서 탭바를 172px 덮는다» 였고, `probe391` 이 그 값을 그대로 재현했다.
 * 그런데 **덮임은 결함이 아니다** — 세 가지가 같이 그것을 말한다.
 *   ⓐ 같은 패널이 **1920 에서도 탭바를 87px 덮는다.** 1920 은 241 이 «한 픽셀도 안 바뀌어야
 *      한다» 고 얼려 둔 ①~④ 8점 통과 상태다. 덮임이 감점이라면 그 화면이 먼저 빨개졌어야 한다.
 *   ⓑ `#pfw` 딤은 `rgba(0,20,50,.85)` = 채점 규칙 2 가 «감점 아님» 으로 빼 둔 **깊은 딤**이다.
 *   ⓒ 딤이 포인터를 다 먹어 **덮인 탭은 눌리지도 않는다**(팝업이 열린 채 탭 클릭 → 아무 변화 없음).
 *   ⓓ 기하가 아예 없다 — 탭바 위 띠(142..1420 = 1278)가 패널(1396)보다 **118px 짧다.**
 *
 * 실재한 결함은 **여백의 비대칭**이었다: 1600 에서 위 54 · 아래 **8**(3인이 각자 «가장 아슬한 값»
 * 으로 이 자리를 찍었다). ⇒ 상한 상수 하나(1404 → **1427**)로 위 31 = 아래 31 로 맞췄다.
 *
 * 본다:
 *   §1 세 프레임 기하 — 2280·1920 Δ0px · 1600 top 173 · 위 = 아래 = 31
 *   §2 상한의 «유도» — 31 은 상수가 아니라 띠의 남는 절반이다(프레임을 바꿔 가며 관계로 확인)
 *   §3 «덮임은 결함이 아니다» 를 자로 — 1920 도 덮는다 · 깊은 딤 · 탭 안 눌림 · 띠가 118px 짧다
 *   §4 잘림 0 — 241 원 증상(«장착 중»·하단 토글이 프레임 밖)이 안 돌아왔다
 *   §R 되돌림 시험 — 상한을 241 값(1404)으로 되돌린 **사본**에서 아래 여백이 8 로 무너지고
 *      위/아래 비대칭(54 ↔ 8)이 되살아난다. 반대로 상한을 통째로 뗀 사본은 227px 이 프레임 밖.
 *      (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');
const NEW = 'top:clamp(104px, 431px, calc(100% - 1427px))';
const OLD = 'top:clamp(104px, 431px, calc(100% - 1404px))';
const INK = 142;      /* HUD 잉크 끝 = `.pedge` 하변 (351 4회차가 못박은 축) */
const PH = 1396;      /* `.pf` 높이 — 241 이 얼려 둔 값 */

const MEAS = `(function(){
  openProfile();
  void document.body.offsetHeight;
  const A = document.getElementById('app').getBoundingClientRect();
  const pf = document.querySelector('#pfw .pf').getBoundingClientRect();
  const tb = document.getElementById('tabbar').getBoundingClientRect();
  const ink = document.querySelector('.pedge').getBoundingClientRect();
  const kid = (s) => { const e = document.querySelector(s); if(!e) return null;
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top - A.top), out: Math.round(r.bottom - A.bottom) }; };
  const tab = document.querySelector('.tab[data-t]');
  const tr = tab.getBoundingClientRect();
  const hit = document.elementFromPoint(tr.left + tr.width/2, tr.top + tr.height/2);
  return {
    frameH: Math.round(A.height),
    inkEnd: Math.round(ink.bottom - A.top),
    top: Math.round(pf.top - A.top),
    bot: Math.round(pf.bottom - A.top),
    h: Math.round(pf.height),
    tabTop: Math.round(tb.top - A.top),
    topGap: Math.round(pf.top - ink.bottom),
    botGap: Math.round(A.bottom - pf.bottom),
    cover: Math.max(0, Math.round(pf.bottom - tb.top)),
    dim: getComputedStyle(document.getElementById('pfw')).backgroundColor,
    hitIsTab: !!(hit && hit.closest && hit.closest('.tab[data-t]')),
    btn: kid('#pfw .pf-btn'), tgl: kid('#pfw .pf-tgl'),
  };
})`;

async function read(page, h) {
  await page.setViewportSize({ width: 1080, height: h });
  await page.waitForTimeout(360);
  return page.evaluate(MEAS + '()');
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + FILE); await p.waitForTimeout(900);

  const M = {};
  for (const h of [1600, 1700, 1920, 2280]) M[h] = await read(p, h);

  /* ── §1 세 프레임 기하 ── */
  console.log('§1 기하 — 기준 프레임 두 개 Δ0px · 1600 만 올라가고 위 = 아래');
  ok(SRC.includes(NEW), 'index.html 의 상한이 391 값이다 (1396 + 31)');
  for (const h of [1920, 2280]) {
    eq(`[${h}] .pf top 431 불변 (상한이 안 걸린다)`, M[h].top, 431);
    ok(M[h].frameH - PH - 431 > 0, `[${h}] 상한 항 ${M[h].frameH - 1427} > 431 이라 431 이 이긴다`);
  }
  eq('[1600] .pf top = 173', M[1600].top, 173);
  eq('[1600] 아래 여백 31', M[1600].botGap, 31);
  eq('[1600] 위 여백(HUD 잉크 142 기준) 31', M[1600].topGap, 31);
  eq('[1600] 위 여백 = 아래 여백 (등재문의 «8px 붕괴» 가 닫혔다)', M[1600].topGap - M[1600].botGap, 0);
  eq('[1600] HUD 잉크 끝이 142 (띠의 윗변)', M[1600].inkEnd, INK);

  /* ── §2 유도 — 31 은 상수가 아니라 «띠의 남는 절반» ── */
  console.log('§2 유도 — 31 = (쓸 수 있는 띠 − 패널) ÷ 2 · 프레임이 길어지면 상한은 자동으로 풀린다');
  const band = M[1600].frameH - INK;                 /* 1458 */
  eq('[1600] 쓸 수 있는 띠 = 프레임 − 142', band, 1458);
  eq('[1600] 여유 31 = (띠 − 패널) ÷ 2', Math.round((band - PH) / 2), M[1600].botGap);
  /* 1700 은 상한이 아직 걸리는 구간(1700 − 1427 = 273 < 431) — 아래 여백은 31 로 유지된다.
     «가운데 정렬»형 처방이었다면 여기서 여백이 벌어졌을 것이고 1920 도 같이 끌려갔다. */
  eq('[1700] 상한이 아직 걸린다 → top 273', M[1700].top, 273);
  eq('[1700] 아래 여백은 그대로 31 (여유형이라 커지는 쪽은 위 여백뿐)', M[1700].botGap, 31);
  ok(M[1700].topGap > M[1600].topGap, `[1700] 위 여백만 커진다 (${M[1600].topGap} → ${M[1700].topGap})`);

  /* ── §3 «덮임은 결함이 아니다» ── */
  console.log('§3 덮임 — 얼려 둔 1920 도 덮는다 · 깊은 딤 · 탭은 눌리지 않는다 · 기하가 없다');
  ok(M[1920].cover > 0, `[1920] 8점 통과 상태의 프레임도 탭바를 덮는다 (${M[1920].cover}px)`);
  eq('[2280] 기준 프레임은 안 덮는다', M[2280].cover, 0);
  ok(M[1600].cover > 0 && M[1600].cover < 172,
    `[1600] 덮임이 줄긴 했다 (등재 당시 172 → ${M[1600].cover}) — 0 은 기하가 허락하지 않는다`);
  eq('[1600] 탭바 위 띠 = 1420 − 142', M[1600].tabTop - INK, 1278);
  ok(M[1600].tabTop - INK < PH,
    `[1600] 그 띠(${M[1600].tabTop - INK})가 패널(${PH})보다 ${PH - (M[1600].tabTop - INK)}px 짧다 ⇒ «안 덮기» 는 불가능`);
  for (const h of [1600, 2280]) {
    const a = Number((M[h].dim.match(/([\d.]+)\)$/) || [0, 0])[1]);
    ok(a >= 0.8, `[${h}] #pfw 딤이 깊은 딤 — 채점 규칙 2 제외 대상 (alpha ${a})`);
    ok(!M[h].hitIsTab, `[${h}] 탭 중심의 hit-test 가 탭이 아니다 (딤/패널이 먹는다)`);
  }
  /* 실제 클릭 — 덮인 탭을 눌러도 화면이 안 바뀐다 */
  await p.setViewportSize({ width: 1080, height: 1600 }); await p.waitForTimeout(360);
  const before = await p.evaluate(() => { openProfile(); return document.getElementById('pfw').classList.contains('on'); });
  const tabs = await p.$$('.tab[data-t]');
  await tabs[1].click({ timeout: 1500 }).catch(() => {});
  await p.waitForTimeout(350);
  const after = await p.evaluate(() => document.getElementById('pfw').classList.contains('on'));
  ok(before && after, '[1600] 팝업이 열린 채 덮인 탭을 클릭해도 팝업이 유지된다 (조작이 안 먹힌다)');

  /* ── §4 잘림 0 (241 원 증상) ── */
  console.log('§4 잘림 — «장착 중» 버튼 · 하단 토글이 네 프레임 전부 프레임 안');
  for (const h of [1600, 1700, 1920, 2280]) {
    ok(M[h].btn.out <= 1 && M[h].btn.top >= 0, `[${h}] .pf-btn 프레임 안 (밖 ${M[h].btn.out})`);
    ok(M[h].tgl.out <= 1 && M[h].tgl.top >= 0, `[${h}] .pf-tgl 프레임 안 (밖 ${M[h].tgl.out})`);
  }
  ok(errs.length === 0, `콘솔·런타임 에러 0 (${errs.length})`);

  /* ── §R 되돌림 시험 ── */
  console.log('§R 되돌림 — 241 값 사본에서 8px 비대칭이 되살아나고, 상한을 떼면 227px 이 프레임 밖');
  const cases = [
    { name: '241 값(여유 8)', src: SRC.replace(NEW, OLD), want: { top: 196, botGap: 8, topGap: 54 } },
    { name: '상한 제거(고정 431)', src: SRC.replace(NEW, 'top:431px'), want: { top: 431, botGap: -227, topGap: 289 } },
  ];
  for (const c of cases) {
    ok(c.src !== SRC, `사본을 만들었다 — ${c.name}`);
    const f = path.join(ROOT, '.v391-neg.html');
    fs.writeFileSync(f, c.src);
    try {
      const nc = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
      const np = await nc.newPage();
      await np.goto('file://' + f); await np.waitForTimeout(900);
      const m = await np.evaluate(MEAS + '()');
      eq(`[음성 1600 · ${c.name}] top`, m.top, c.want.top);
      eq(`[음성 1600 · ${c.name}] 아래 여백`, m.botGap, c.want.botGap);
      ok(m.topGap !== m.botGap, `[음성 1600 · ${c.name}] 위 ${m.topGap} ≠ 아래 ${m.botGap} — 비대칭이 되살아난다`);
      await nc.close();
    } finally { fs.unlinkSync(f); }
  }

  await browser.close();
  console.log(`\nVERIFY391 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
