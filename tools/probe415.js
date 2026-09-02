#!/usr/bin/env node
/* 재현기 — 작업 415 「19 프로필 팝업의 패널 1396 이 1600 프레임의 띠(1458)를 95.7% 먹는다」
 *
 *   node tools/probe415.js
 *
 * 338·341·350 규칙: **처방 전에 재현한다.** 등재문은 값(95.7% · 여백 각 31px)까지 적어 뒀지만
 * 그 31 이 «왜 결함인가» 는 두 비평가의 문장(CE «내부 상단 패딩 37 보다 좁다 — 6px 역전» ·
 * CF «패널 높이의 2.22% · 라이브 HUD 잉크 대비 최소선 40 에 9px 미달»)으로만 있었다.
 * 그래서 이 자는 «여백이 몇 px 인가» 가 아니라 **«그 여백이 무엇보다 좁은가»** 를 축으로 세운다.
 *
 *   ⓐ 띠·패널·여백 — `.pf` 상자와 위/아래 여백을 프레임 11종에서. 등재문의 1458 · 1396 · 95.7% 확인.
 *   ⓑ **역전** — 외곽 여백 ↔ 팝업 **내부** 패딩(상 = `.pf-gid` local 37 · 하 = 패널 − 토글 하변 40).
 *   ⓒ **구간** — 아래 여백 31 이 «1600 만의 값» 인가. (등재문은 «1600 프레임» 문제로 적었다)
 *   ⓓ 흡수 — 줄어든 만큼을 받는 그릇(`.pf-grid`)이 실제로 스크롤 그릇이고 잘림이 안 나는가.
 *   ⓔ 검산 — 1920·2280·2600 이 Δ0px 인가(241 이 얼려 둔 ①~④ 8점 통과 프레임).
 *
 * ⚠ 이 자는 **«수리 전» 사본**에서도 돈다 — `index.html` 을 391 시절 선언(상한 1427 · 고정 높이
 *   1396)으로 되돌린 임시 파일을 만들어 거기 붙는다(`verify348` §R 방식). 갈아 끼울 자리를
 *   못 찾으면 조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279 처방).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

const REV = [   /* 415 선언 → 391 시절 선언 (사본 되돌림 — 여섯 자리를 **전부** 되돌려야 한다:
                   `.pf` 상자만 되돌리면 자식은 올라간 채라 «없던 세 번째 상태»(내부 하단 패딩 74)가 나온다) */
  /* 754 이관(2026-09-02, 작업 830) — 치환 원본이 415 상한 clamp 에서 중앙 앵커로 바뀌었다.
     되돌린 뒤 재현하는 391 상태(31/31)는 그대로다. */
  ['top:calc(50% - 709px + var(--pfsh) / 2)', 'top:clamp(104px, 431px, calc(100% - 1427px))'],
  ['height:calc(1396px - var(--pfsh))', 'height:1396px'],
  ['height:calc(544px - var(--pfsh))', 'height:544px'],
  ['top:calc(1026px - var(--pfsh))', 'top:1026px'],
  ['top:calc(1089px - var(--pfsh))', 'top:1089px'],
  ['top:calc(1105px - var(--pfsh))', 'top:1105px'],
  ['top:calc(1261px - var(--pfsh))', 'top:1261px'],
];
/* 자식 흡수분만 되돌린다(상한은 415 그대로) — «패널만 안 짧아지면 어떻게 되나» 를 묻는 사본 */
const REV_KIDS = REV.slice(1);
const revert = (src, list) => list.reduce((s, [a, b]) => {
  if (!s.includes(a)) { console.error('갈아 끼울 자리를 못 찾았다: ' + a); process.exit(2); }
  return s.replace(a, b);
}, src);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = n => Math.round(n * 10) / 10;

const MEAS = `(function(){
  openProfile();
  void document.body.offsetHeight;
  const A  = document.getElementById('app').getBoundingClientRect();
  const P  = document.querySelector('#pfw .pf').getBoundingClientRect();
  const ink= document.querySelector('.pedge').getBoundingClientRect();
  const g  = document.querySelector('#pfw .pf-grid');
  const q = (s) => { const e = document.querySelector('#pfw ' + s); if(!e) return null;
    const r = e.getBoundingClientRect();
    return { ly: Math.round((r.top - P.top) * 10) / 10, h: Math.round(r.height * 10) / 10,
             out: Math.round((r.bottom - A.bottom) * 10) / 10 }; };
  const fill = document.querySelector('#pfw .pf-fill').getBoundingClientRect();
  const spill = [];
  document.querySelectorAll('#pfw .pf > *').forEach(e => {
    if (e.classList.contains('pf-ring') || e.classList.contains('pf-fill')) return;
    const r = e.getBoundingClientRect();
    if (r.bottom > fill.bottom + .5 || r.top < fill.top - .5) spill.push((e.className||'?').toString().split(' ')[0]);
  });
  return {
    frameH: Math.round(A.height),
    ink:    Math.round((ink.bottom - A.top) * 10) / 10,
    top:    Math.round((P.top - A.top) * 10) / 10,
    h:      Math.round(P.height * 10) / 10,
    topGap: Math.round((P.top - ink.bottom) * 10) / 10,
    botGap: Math.round((A.bottom - P.bottom) * 10) / 10,
    padTop: q('.pf-gid').ly,
    padBot: Math.round((P.height - (q('.pf-tgl').ly + q('.pf-tgl').h)) * 10) / 10,
    grid:   q('.pf-grid'), msn: q('.pf-msn'), btn: q('.pf-btn'), tgl: q('.pf-tgl'), tab: q('.pf-tab'),
    gScroll: g.scrollHeight, gClient: g.clientHeight,
    spill,
  };
})`;

async function read(browser, file, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  const m = await p.evaluate(MEAS + '()');
  m.errs = errs.length;
  await ctx.close();
  return m;
}

(async () => {
  /* 수리 전(391 선언) 사본 — 일곱 자리를 전부 되돌린다. 하나라도 못 찾으면 종료 코드 2(neg279). */
  const before = revert(SRC, REV);
  const BFILE = path.join(ROOT, `.probe415-before-${process.pid}.html`);
  fs.writeFileSync(BFILE, before);

  const browser = await launch(chromium);
  const HS = [1600, 1634, 1700, 1841, 1875, 1920, 2280, 2600];
  const B = {}, A = {};
  try {
    for (const H of HS) { B[H] = await read(browser, BFILE, H); A[H] = await read(browser, FILE, H); }
  } finally { try { fs.unlinkSync(BFILE); } catch (_) {} }

  console.log('\n── ⓐ 띠·패널·여백 (전 = 391 선언 / 후 = 415) ────────────────────────');
  console.log('frameH │ 띠   │ 패널 전→후 │ 위 여백 전→후 │ 아래 여백 전→후 │ 패널/띠 %');
  for (const H of HS) {
    const band = H - B[H].ink;
    console.log(`  ${H} │ ${band} │ ${B[H].h}→${A[H].h} │ ${B[H].topGap}→${A[H].topGap} │ ${B[H].botGap}→${A[H].botGap} │ ${(B[H].h / band * 100).toFixed(1)}%→${(A[H].h / band * 100).toFixed(1)}%`);
  }

  console.log('\n── 판정 ──────────────────────────────────────────────────────────');
  /* ⓐ 등재문 확인 */
  const band16 = 1600 - B[1600].ink;
  ok(B[1600].ink === 142, `[ⓐ] HUD 잉크 끝 142 (띠의 윗변) — 실측 ${B[1600].ink}`);
  ok(band16 === 1458, `[ⓐ 1600] 쓸 수 있는 띠 1458 — 실측 ${band16}`);
  ok(B[1600].h === 1396 && Math.abs(1396 / band16 * 100 - 95.7) < 0.1,
    `[ⓐ 1600] 등재문 «패널 1396 = 띠의 95.7%» 재현 — 실측 ${(B[1600].h / band16 * 100).toFixed(1)}%`);
  ok(B[1600].topGap === 31 && B[1600].botGap === 31,
    `[ⓐ 1600] 등재문 «위·아래 각 31px» 재현 — 실측 ${B[1600].topGap}/${B[1600].botGap}`);

  /* ⓑ 역전 — 등재문이 «상단 37» 만 적었는데 하단 40 이 더 크다 */
  ok(B[1600].padTop === 37 && B[1600].padBot === 40,
    `[ⓑ] 팝업 내부 패딩 상 37 · 하 40 — 실측 ${B[1600].padTop}/${B[1600].padBot}`);
  ok(B[1600].botGap < B[1600].padTop && B[1600].botGap < B[1600].padBot,
    `[ⓑ 수리 전] 외곽 31 이 내부 패딩 **둘 다** 밑돈다 (상 −${B[1600].padTop - B[1600].botGap} · 하 −${B[1600].padBot - B[1600].botGap}) ⇒ 등재문이 적은 «상단 6px» 은 절반이다`);
  ok(A[1600].botGap > A[1600].padTop && A[1600].botGap > A[1600].padBot,
    `[ⓑ 수리 후] 외곽 ${A[1600].botGap} 이 내부 패딩 둘 다 넘는다 (상 +${A[1600].botGap - A[1600].padTop} · 하 +${A[1600].botGap - A[1600].padBot})`);

  /* ⓒ 구간 — «1600 만» 이 아니다 */
  const pinned = HS.filter(H => B[H].botGap === 31);
  ok(pinned.length >= 4,
    `[ⓒ 수리 전] 아래 여백 31 은 1600 만의 값이 아니다 — ${pinned.join('·')} 가 전부 31 (상한 항이 이기는 구간 전체의 성질)`);
  ok(HS.every(H => A[H].botGap >= 81),
    `[ⓒ 수리 후] 같은 구간이 전부 81 이상 — ${HS.map(H => A[H].botGap).join('·')}`);

  /* ⓓ 흡수 — 그릇 하나만 짧아지고 잘림 0 */
  ok(A[1600].grid.h === B[1600].grid.h - 100 && A[1600].grid.ly === B[1600].grid.ly,
    `[ⓓ 1600] 흡수는 .pf-grid 높이에서만 (${B[1600].grid.h} → ${A[1600].grid.h} · top ${A[1600].grid.ly} 불변)`);
  for (const k of ['msn', 'btn', 'tgl'])
    ok(A[1600][k].ly === B[1600][k].ly - 100, `[ⓓ 1600] .pf-${k} 가 같은 100px 만큼 같이 올라간다 (${B[1600][k].ly} → ${A[1600][k].ly})`);
  ok(A[1600].padBot === B[1600].padBot, `[ⓓ 1600] 내부 하단 패딩 40 불변 (${A[1600].padBot})`);
  ok(A[1600].gScroll <= A[1600].gClient + 0.5,
    `[ⓓ 1600] 짧아진 그릇에서도 내용이 넘치지 않는다 (scroll ${A[1600].gScroll} ≤ client ${A[1600].gClient}) — 넘쳐도 overflow-y:auto 라 잘림이 아니라 스크롤이다`);
  ok(A[1600].spill.length === 0 && B[1600].spill.length === 0,
    `[ⓓ 1600] 자식이 크림 판(.pf-fill) 밖으로 안 나간다 (전 ${B[1600].spill.length}건 · 후 ${A[1600].spill.length}건)`);

  /* ⓔ 검산 — 얼려 둔 세 프레임 Δ0
     754 이관(2026-09-02, 작업 830) — 이 대조(A = 현행 · B = 391 시절 사본)는 **415 의 몫만 재던 자**인데,
     현행 트리에는 754(중앙 앵커)의 몫이 같이 들어 있어 `top` 한 칸이 A ≠ B 가 된다(1920 431→251 · 2600 431→591).
     ⚠ 그렇다고 이 항을 풀면 «415 가 얼려 둔 프레임의 **속**을 건드려도 초록» 이 된다. ⇒ 축을 둘로 가른다:
       · **속**(패널 높이 · 토글 local y · 그릇 높이)은 여전히 **Δ0px** — 415 도 754 도 안 건드렸다.
       · **자리**(top)는 754 가 옮긴 값이 맞는지 **중앙 앵커 식으로** 되묻는다(기준 프레임 2280 은 Δ0 그대로). */
  for (const H of [1920, 2280, 2600]) {
    ok(A[H].h === B[H].h && A[H].tgl.ly === B[H].tgl.ly && A[H].grid.h === B[H].grid.h,
      `[ⓔ ${H}] 얼려 둔 프레임의 **속**이 Δ0px (h ${A[H].h} · tgl local ${A[H].tgl.ly} · grid h ${A[H].grid.h})`);
    ok(Math.round((A[H].top + A[H].h / 2 - H / 2) * 10) / 10 === -11,
      `[ⓔ ${H}] 자리는 754 중앙 앵커 — 중심 오프셋 −11 (top ${B[H].top} → ${A[H].top})`);
  }
  ok(A[2280].top === B[2280].top && A[2280].top === 431,
    `[ⓔ 2280] 기준 프레임은 자리까지 Δ0px — 레퍼런스 그대로 (${A[2280].top})`);
  ok(HS.every(H => A[H].errs === 0 && A[H].tgl.out <= 1),
    '[ⓔ] 프레임 8종에서 콘솔 에러 0 · 토글이 프레임 안');

  await browser.close();
  console.log(`\nPROBE415 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
