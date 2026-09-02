#!/usr/bin/env node
/* 작업 832 — «`verify356` [S3] ③ 눈금 [전제] 가 34회차 등재 자리를 이번 실행이 안 잰다» 재현기
 *
 *   node tools/probe832.js
 *
 * 등재문(PROGRESS 832)이 남긴 물음은 하나다 — 자리
 *   `div#shopList>div.cn-wrap.pv>div.pvc.pb.ban1>div.rb.rb1>b>img.cic` (cap 1.5)
 * 가 «문턱 아래» 인가(정상) 아니면 **판정 스코프 밖** 인가(빨강의 원인).
 * 338 규칙대로 처방 전에 그 자리를 제품에게 직접 묻는다 — `probe418.COLLECT` 의 가시 조건
 * 다섯을 **한 조건씩** 재서, 노드가 어느 문에서 떨어지는지 이름으로 찍는다.
 *
 * ⚑ **등재문이 쓴 손잡이(`PROBE418_TOL=0`)로는 이 물음에 답할 수 없다.** probe418 의 판정은
 *   `Math.abs(dev) > TOL` 이라 **dev 가 정확히 0 인 자리는 TOL 0 에서도 안 나온다**(엄격 부등호).
 *   ⇒ «스코프 밖» 과 «dev = 0» 을 가르는 손잡이는 **음수 TOL** 이다:
 *       PROBE418_TOL=-1 node tools/probe418.js --screen "124 이용권 탭"
 *   그 실행이 판정된 노드를 편차와 함께 **전부** 인쇄한다(이 자리는 잉크 104×104 · dev 0.00%).
 *   이 자(§1)는 그것과 독립으로 «세 문(크기·뷰포트·보임)을 통과하는가» 를 직접 물어 같은 답을 낸다.
 *
 * ⚠ 이 자는 «통과/실패» 를 말하지 않는다(재현기). 판정은 `tools/verify356.js` [S3] 몫이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, URL, STEP } = require('./scan356');

const SEL = 'div#shopList>div.cn-wrap.pv>div.pvc.pb.ban1>div.rb.rb1>b>img.cic';
const SCREEN = process.env.PROBE832_SCREEN || '124 이용권 탭';
const DSF = Number(process.env.PROBE832_DSF || 2);

/* probe418.COLLECT 과 **같은** 순서로 문을 하나씩 연다 — 어느 문이 닫혔는지가 답이다. */
const GATES = function (sel) {
  const app = document.getElementById('app');
  const out = { app: !!app, found: 0, rows: [] };
  if (!app) return out;
  /* 등재문이 센 자리 — 셀렉터 사슬이 살아 있는지부터 */
  out.rb1 = app.querySelectorAll('#shopList .rb.rb1').length;
  out.rb1img = app.querySelectorAll('#shopList .rb.rb1 > b > img.cic').length;
  const all = [...app.querySelectorAll('img, canvas, svg')];
  out.imgTotal = all.length;
  for (const el of app.querySelectorAll('#shopList .rb.rb1 > b > img.cic')) {
    out.found++;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    /* pathOf — probe418 과 같은 산식(조상 6칸 · id 를 만나면 끊는다 · 클래스 3개) */
    const pathOf = (e0) => {
      const o = []; let e = e0, n = 0;
      while (e && e !== document.body && n++ < 6) {
        let s = e.tagName.toLowerCase();
        if (e.id) { s += '#' + e.id; o.unshift(s); break; }
        if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
        o.unshift(s); e = e.parentElement;
      }
      return o.join('>');
    };
    out.rows.push({
      sel: pathOf(el),
      match: pathOf(el) === sel,
      w: +r.width.toFixed(4), h: +r.height.toFixed(4),
      x: +r.left.toFixed(4), y: +r.top.toFixed(4),
      innerH: innerHeight, innerW: innerWidth,
      gate_size: !(r.width < 8 || r.height < 8),
      gate_view: !(r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth),
      gate_vis: !(cs.visibility === 'hidden' || +cs.opacity === 0),
      nat: el.naturalWidth && el.naturalHeight ? [el.naturalWidth, el.naturalHeight] : null,
      src: (el.currentSrc || el.src || '').split('/').pop().slice(0, 40),
      display: cs.display, fit: cs.objectFit,
    });
  }
  /* 그릇의 쪽 수 — 772 스크롤 루프가 이 자리를 데려올 수 있는가 */
  const pot = document.getElementById('shopList');
  if (pot) {
    const cs = getComputedStyle(pot);
    const r = pot.getBoundingClientRect();
    out.pot = { sh: pot.scrollHeight, ch: pot.clientHeight, ov: cs.overflowY,
      top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2),
      pages: Math.ceil(pot.scrollHeight / pot.clientHeight),
      visible: !(r.bottom < 0 || r.top > innerHeight) };
  }
  return out;
};

(async () => {
  const entry = SCREENS.find(([l]) => l.includes(SCREEN));
  if (!entry) { console.error(`[probe832] 화면 «${SCREEN}» 이 scan356.SCREENS 에 없다`); process.exit(1); }
  const [label, steps] = entry;
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000 * DSF);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  for (const s of steps) { await STEP(page, s); await page.waitForTimeout(420); }
  await page.waitForTimeout(350);

  console.log(`[probe832] 화면 «${label}» · DSF${DSF} · 자리 ${SEL}`);

  /* ── §1 첫 쪽(스크롤 0) ── */
  const g0 = await page.evaluate(GATES, SEL);
  console.log(`\n§1 첫 쪽 — #shopList .rb.rb1 ${g0.rb1}개 · 그 안 b>img.cic ${g0.rb1img}개 · 화면 전체 img/canvas/svg ${g0.imgTotal}개`);
  if (g0.pot) console.log(`   그릇 #shopList — scrollHeight ${g0.pot.sh} / clientHeight ${g0.pot.ch} = 쪽 ${g0.pot.pages} · overflowY ${g0.pot.ov} · 보임 ${g0.pot.visible}`);
  for (const r of g0.rows) {
    console.log(`   · ${r.sel}${r.match ? '  ← 등재된 이름과 같다' : '  ← 등재된 이름과 다르다'}`);
    console.log(`     상자 ${r.w}×${r.h} @ ${r.x},${r.y} (뷰포트 ${r.innerW}×${r.innerH}) · 원본 ${r.nat ? r.nat.join('×') : 'null'} · ${r.src}`);
    console.log(`     문: 크기≥8 ${r.gate_size} · 뷰포트 안 ${r.gate_view} · 보임 ${r.gate_vis} · display ${r.display} · object-fit ${r.fit}`);
  }

  /* ── §2 쪽을 굴리며(772 스윕과 같은 방식) 같은 자리를 다시 묻는다 ── */
  const pages = g0.pot ? Math.min(4, g0.pot.pages) : 1;
  for (let p = 1; p < pages; p++) {
    await page.evaluate((pp) => {
      const el = document.getElementById('shopList');
      if (el) el.scrollTop = el.clientHeight * pp;
    }, p);
    await page.waitForTimeout(300);
    const g = await page.evaluate(GATES, SEL);
    const inView = g.rows.filter((r) => r.gate_size && r.gate_view && r.gate_vis).length;
    console.log(`\n§2 쪽 ${p + 1}/${pages} — 세 문을 전부 통과한 노드 ${inView}/${g.rows.length}개`);
    for (const r of g.rows)
      console.log(`   · y ${r.y} (뷰포트 0..${r.innerH}) · 상자 ${r.w}×${r.h} · 뷰포트 안 ${r.gate_view}`);
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
