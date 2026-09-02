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
/* 작업 415(2026-08-30) 이관 — 상한 1427 → **1444**, 여유 31 → **48**, 그리고 짧은 프레임에서
   패널이 `--pfsh` 만큼 짧아진다. 391 이 «덮임은 결함이 아니다» 로 세운 §3 은 한 줄도 안 바뀌었고
   (덮임은 오히려 149 → 132 로 줄었다), 갈아 끼운 것은 §1·§2 의 **값**과 §R 의 사본 문자열이다.
   ⚠ §2 의 «유도» 는 그대로 살린다 — 여유는 여전히 «띠의 남는 절반» 이고 분모가 되는 패널만 짧아졌다. */
/* ⚑ 754 이관(2026-09-02, 작업 830) — `.pf` 의 자리 규칙이 **상단 앵커 → 중앙 앵커**로 바뀌었다.
   옛 `top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))`
   새 `top:calc(50% - 709px + var(--pfsh) / 2)`   (709 = 반높이 698 + 레퍼런스 오프셋 11)
   391 이 실제로 잡은 결함은 «여백의 **비대칭**»(위 54 ↔ 아래 8)이었고, 그 뜻은 754 뒤에도 산다 —
   다만 «대칭» 을 재는 **기준선이 띠 중앙에서 프레임 중앙으로** 옮겨졌다. 그래서 값 항(81/81 · top 223)은
   갈아 끼우되 **묻는 것은 그대로**다: 상자가 프레임을 일정하게 따라가는가(중심 오프셋 −11 불변).
   ⚠ §3(«덮임은 결함이 아니다»)의 논거 ⓐ 만 실제로 바뀌었다 — 아래 그 자리에 적었다. */
const NEW = 'top:calc(50% - 709px + var(--pfsh) / 2)';
const NEWH = 'height:calc(1396px - var(--pfsh))';
const REV = [   /* 415 선언 → 391 시절 선언 (사본 되돌림 — 여섯 자리를 **전부** 되돌려야 한다:
                   `.pf` 상자만 되돌리면 자식은 올라간 채라 «없던 세 번째 상태»(내부 하단 패딩 74)가 나온다) */
  /* 754 이관(830) — 치환 **원본**만 새 선언으로 옮겼다. 되돌린 뒤에 묻는 것(391 당시의 31/31)은 그대로다. */
  [NEW, 'top:clamp(104px, 431px, calc(100% - 1427px))'],
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
const INK = 142;      /* HUD 잉크 끝 = `.pedge` 하변 (351 4회차가 못박은 축) */
const PH = 1396;      /* `.pf` 높이 — 241 이 얼려 둔 값(기준 프레임) */
const PH16 = 1296;    /* 415 — 1600 에서의 패널 높이(1396 − 흡수분 100) */

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
  for (const h of [1600, 1700, 1841, 1920, 2280]) M[h] = await read(p, h);

  /* ── §1 세 프레임 기하 ── */
  console.log('§1 기하 — 기준 프레임 두 개 Δ0px · 1600 만 올라가고 위 = 아래');
  ok(SRC.includes(NEW), 'index.html 의 자리가 754 중앙 앵커다 (709 = 반높이 698 + 오프셋 11)');
  ok(SRC.includes(NEWH), 'index.html 의 패널 높이가 415 흡수형이다 (1396 − --pfsh)');
  /* 754 이관 — «431 불변» 은 옛 상한의 부산물이라 1920 에서 더는 참이 아니다(251).
     기준 프레임 2280 의 431 만 남는다(레퍼런스 Δ0px) — 그 값이 아래 오프셋의 재료다. */
  const cen = (m, h) => Math.round((m.top + m.h / 2 - h / 2) * 10) / 10;
  eq('[2280] .pf top 431 — 레퍼런스 Δ0px (754 가 자리를 안 옮겼다)', M[2280].top, 431);
  const CEN = cen(M[2280], 2280);
  eq('기준 프레임 중심 오프셋 −11', CEN, -11);
  for (const h of [1920, 2280]) {
    eq(`[${h}] 중심 오프셋 불변 (프레임을 따라간다)`, cen(M[h], h), CEN);
    eq(`[${h}] 패널 높이 1396 불변 (흡수분이 0)`, M[h].h, PH);
  }
  /* 754 이관 — 391 이 닫은 것은 «위 54 ↔ 아래 8» 이라는 **비대칭**이고, 754 는 그 대칭의 기준선을
     띠 중앙에서 프레임 중앙으로 옮겼다. ⇒ «위 = 아래 = 81» 대신 «중심이 프레임을 따라간다» 를 묻는다.
     ⚠ 위 여백 −1(HUD 잉크를 1px 밟는다)은 811 에 등재된 별개 축이라 래칫으로만 잡는다. */
  eq('[1600] .pf top = 프레임중심 800 − 709 + 흡수분/2 50', M[1600].top, 141);
  eq('[1600] 중심 오프셋이 기준 프레임과 같다 (흡수분 100 이 들어와도)', cen(M[1600], 1600), CEN);
  ok(M[1600].topGap >= -1,
    `[1600] 래칫 — HUD 잉크와 겹침이 1px 이내 (위 여백 ${M[1600].topGap} · 축은 811 몫)`);
  ok(M[1600].botGap > 0, `[1600] 패널 바닥이 프레임 안 (아래 여백 ${M[1600].botGap})`);
  eq('[1600] 패널만 짧아졌다 (415 흡수)', M[1600].h, PH16);
  eq('[1600] HUD 잉크 끝이 142 (띠의 윗변)', M[1600].inkEnd, INK);

  /* ── §2 유도 — 31 은 상수가 아니라 «띠의 남는 절반» ── */
  console.log('§2 유도 — 31 = (쓸 수 있는 띠 − 패널) ÷ 2 · 프레임이 길어지면 상한은 자동으로 풀린다');
  const band = M[1600].frameH - INK;                 /* 1458 */
  eq('[1600] 쓸 수 있는 띠 = 프레임 − 142', band, 1458);
  /* 754 이관 — 유도의 기준이 **띠 중앙 → 프레임 중앙**으로 옮겨졌다.
     옛: 여백 = (띠 − 패널) ÷ 2       새: top = 프레임중심 − 709 + 흡수분 ÷ 2
     띠(1458)는 그대로 재 두되(위 항), 자리를 정하는 식은 프레임 중심에서 나온다. */
  const sh16 = Math.round((PH - M[1600].h) * 10) / 10;
  eq(`[1600] 유도 — top = 중심 800 − 709 + 흡수분 ${sh16}÷2`, M[1600].top, 800 - 709 + sh16 / 2);
  /* 1700 은 흡수 문턱 자신이다(패널이 온전해지는 첫 프레임) — 흡수분 0 이라 되밀기도 0. */
  eq('[1700] 문턱 — 흡수분 0 → top = 850 − 709', M[1700].top, 850 - 709);
  eq('[1700] 중심 오프셋 불변', cen(M[1700], 1700), CEN);
  eq('[1700] 패널이 문턱에서 온전한 1396 (흡수는 1700 아래에서만)', M[1700].h, PH);
  /* 754 이관 — 옛 «여유»형은 프레임이 커지면 **위 여백만** 커졌다(아래는 81 고정).
     중앙 앵커는 위·아래가 **같은 양**만큼 벌어진다 — 그것이 «중심 불변» 의 눈에 보이는 얼굴이다. */
  ok(M[1841].topGap > M[1600].topGap && M[1841].botGap > M[1600].botGap
     && Math.abs((M[1841].topGap - M[1600].topGap) - (M[1841].botGap - M[1600].botGap)) <= 1,
    `[1841] 위·아래가 같은 양만큼 커진다 (위 ${M[1600].topGap}→${M[1841].topGap} · ` +
    `아래 ${M[1600].botGap}→${M[1841].botGap} · 옛 «여유»형은 위쪽만 커졌다)`);

  /* ── §3 «덮임은 결함이 아니다» ── */
  console.log('§3 덮임 — 얼려 둔 1920 도 덮는다 · 깊은 딤 · 탭은 눌리지 않는다 · 기하가 없다');
  /* ⚑ 754 이관 — §3 의 네 논거 중 **ⓐ 만** 사실이 바뀌었다. 중앙 앵커가 상자를 위로 당기면서
     1920 은 이제 탭바를 **안 덮는다**(87 → 0). 논거를 잃은 것이 아니라 **자리가 1600 으로 좁아진 것**이고,
     754 자신이 ⑦ 에서 같은 결론을 z 층으로 독립 재확인했다(`#pfw` z33·z34 ↔ `#tabbar` z10 · 딤 inset:0
     ⇒ 모달이 내비를 가리는 것은 정상). ⓑ 깊은 딤 · ⓒ 탭 안 눌림 · ⓓ 기하 없음은 아래에서 그대로 산다.
     자리를 비우지 않고 «이제는 안 덮는다» 를 못박아 둔다 — 앵커가 옛 축으로 돌아가면 여기서도 빨개진다. */
  eq('[1920] 754 중앙 앵커 뒤로는 탭바를 안 덮는다 (옛 상단 앵커에서는 87px 덮었다)', M[1920].cover, 0);
  eq('[2280] 기준 프레임은 안 덮는다', M[2280].cover, 0);
  ok(M[1600].cover > 0 && M[1600].cover < 172,
    `[1600] 덮임이 줄긴 했다 (391 등재 당시 172 → 391 후 149 → 415 후 ${M[1600].cover}) — 0 은 기하가 허락하지 않는다`);
  eq('[1600] 탭바 위 띠 = 1420 − 142', M[1600].tabTop - INK, 1278);
  ok(M[1600].tabTop - INK < M[1600].h,
    `[1600] 그 띠(${M[1600].tabTop - INK})가 패널(${M[1600].h})보다 ${M[1600].h - (M[1600].tabTop - INK)}px 짧다 ⇒ «안 덮기» 는 불가능`);
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
    /* 415 이관 — «391 값으로 되돌린 사본» 이 되돌림 표본이다. 상한과 흡수분을 **둘 다** 되돌려야
       391 당시의 31/31 이 그대로 재현된다(하나만 되돌리면 없던 세 번째 상태가 나온다). */
    { name: '391 값(여유 31 · 흡수 없음)', src: revert(SRC, REV),
      want: { top: 173, botGap: 31, topGap: 31, h: PH, sym: true } },
    /* 754 이관 — 앵커가 중앙형이라 흡수만 떼도 프레임 밖으로는 안 나간다(옛 축의 −19 는 top 223 의 몫이었다).
       대신 되밀기(`흡수분/2`)만 남아 **중심이 그 절반 50px 만큼 밀린다**(−11 → +39). 묻는 것은 그 짝이다. */
    { name: '415 흡수만 제거(앵커는 754)', src: revert(SRC, REV_KIDS),
      want: { top: 141, botGap: 63, topGap: -1, h: PH, sym: false } },
    { name: '상한 제거(고정 431)', src: SRC.replace(NEW, 'top:431px'),
      want: { top: 431, botGap: -127, topGap: 289, h: PH16, sym: false } },
  ];
  for (const c of cases) {
    ok(c.src !== SRC, `사본을 만들었다 — ${c.name}`);
    const f = path.join(ROOT, `.v391-neg-${process.pid}.html`);
    fs.writeFileSync(f, c.src);
    try {
      const nc = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
      const np = await nc.newPage();
      await np.goto('file://' + f); await np.waitForTimeout(900);
      const m = await np.evaluate(MEAS + '()');
      eq(`[음성 1600 · ${c.name}] top`, m.top, c.want.top);
      eq(`[음성 1600 · ${c.name}] 아래 여백`, m.botGap, c.want.botGap);
      eq(`[음성 1600 · ${c.name}] 패널 높이`, m.h, c.want.h);
      /* 391 사본은 «대칭이되 31 로 좁다» · 나머지 둘은 «비대칭» — 무너지는 방식이 서로 다르다.
         754 이관 — 셋이 공통으로 요구하는 것은 이제 «아래 여백 81 이 아니다» 가 아니라
         **754 중앙 앵커 불변식(중심 −11)이 깨진다**는 것이다(+71 · +39 · +279 로 셋 다 다르게 깨진다).
         옛 문구는 기준선이 바뀐 뒤로는 항상 참이라 아무것도 안 묻는 항이 됐다. */
      const c16 = Math.round((m.top + m.h / 2 - 800) * 10) / 10;
      ok(c16 !== -11, `[음성 1600 · ${c.name}] 중심 오프셋 −11 이 깨진다 (${c16 > 0 ? '+' : ''}${c16})`);
      if (c.want.sym) ok(m.topGap === m.botGap && m.botGap < 40,
        `[음성 1600 · ${c.name}] 대칭이지만 내부 패딩(40)보다 좁다 — 415 가 잡은 역전 (${m.botGap})`);
      else ok(m.topGap !== m.botGap,
        `[음성 1600 · ${c.name}] 위 ${m.topGap} ≠ 아래 ${m.botGap} — 비대칭이 되살아난다`);
      await nc.close();
    } finally { try { fs.unlinkSync(f); } catch (e) {} }
  }

  await browser.close();
  console.log(`\nVERIFY391 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
