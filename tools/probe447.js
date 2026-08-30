#!/usr/bin/env node
/* 447 재현기 — «21 도감(`#collw`) 리본 상변 ↔ HUD 판때기(`.pedge`) 하변» 여유를 **프레임 축**으로 훑는다.
 *
 * 실행: node tools/probe447.js [--json <경로>]
 *
 * 왜 또 자를 만드나(385 «자매 자 드리프트» 를 알면서도):
 *   축이 다르다. `probe436` 은 «오버레이 **하변** ↔ 고정 내비 **상변**» 이고 이쪽은
 *   «오버레이 **상변** ↔ HUD **하변**» 이다. `probe390` 이 그 축을 갖고 있지만 **2280·1600 딱 둘**만
 *   재고, 이 결함은 양 끝이 둘 다 성하다(+120.5 · 0.0) — 436 이 등재한 것과 **같은 이유**로
 *   차분·양끝 표본에서 원리적으로 소거된다. ⇒ 빠진 것은 통과선이 아니라 **프레임 축**이다.
 *   진입·정착은 `probe351lib` 한 곳에서 가져다 쓴다(자기 사본을 만들지 않는다).
 *
 * 재는 것(모두 `#app` 로컬 좌표):
 *   · `padT/padB`  — `#collw` 의 계산된 패딩(= 띠를 만드는 선언)
 *   · `box`        — `.cl` 상자(translateY(−42) 뒤의 실제 자리)
 *   · `rib`        — `.cl-rib` 리본. **상자 위로 10px 삐져나오는 부품**이라 이 자리의 바깥선이다.
 *   · `ink`        — 오버레이 자손 전체의 union(딤 제외 · 클리핑 접기) — 390 처방. 리본만 보다가
 *                    다른 부품이 먼저 HUD 를 무는 것을 놓치지 않기 위한 그물이다.
 *   · `tabsBot`    — 깃발 서브탭(`.cl-tabs`) 하변. **436 이 갚은 반대쪽 끝**이라 같이 찍어
 *                    «위를 갚느라 아래가 깨지지 않았는지» 를 한 표에서 본다.
 *   · `bodyOver`   — `.cl-body` 넘침(scrollH − clientH). 패딩을 키우면 상자가 눌리므로
 *                    **반대급부**(351-③ «이중 차감»)를 같이 찍는다.
 *
 * 판정: gapTop = ribTop − pedgeBot ⇒ 음수 = HUD 침범 · gapBot = tabbarTop − tabsBot ⇒ 음수 = 탭바 침범.
 *       ⚠ 기준선(`.pedge`·`#tabbar`)이나 상자를 못 찾으면 «침범 없음» 이 아니라 **판정 불가**다(LESSONS 351-④).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

/* 프레임 표본 — `.shortf` 문턱(1842) · `.cl` 이 상한에 걸리는 문턱 · 처방의 clamp 경계를 전부 낀다.
   436 의 SWEEP_HS 를 기본으로 하되 이 축의 계산 문턱(1987 · 2013 · 2039)을 더 넣었다.
   ⚠ 1920 은 `smoke.js` 가 도는 화면비 4종 중 하나(9:16)라 반드시 표본에 있어야 한다. */
const FRAMES = [1600, 1700, 1841, 1842, 1900, 1920, 1987, 1998, 2009, 2013, 2020,
  2024, 2030, 2035, 2039, 2040, 2050, 2051, 2100, 2280, 2400, 2600];

/* 21 도감 오버레이의 자기 진입점 — 좌측 사이드 «도감» 버튼(probe390 과 같은 셀렉터). */
const OPENER = { sel: '.side .ibtn[data-pop="coll"]' };

const READ = () => {
  const A = document.getElementById('app').getBoundingClientRect();
  const L = (v) => Math.round((v - A.top) * 10) / 10;
  const R = (s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return { top: L(r.top), bot: L(r.bottom), h: Math.round(r.height * 10) / 10 };
  };
  /* 클리핑 조상을 접은 «지금 실제로 그려지는» 세로 구간(probe390·probe351 과 같은 접기). */
  const drawnOf = (n) => {
    const r = n.getBoundingClientRect();
    const d = { y1: r.top, y2: r.bottom };
    for (let p = n.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowY === 'visible' && cs.overflowX === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    return d;
  };
  const host = document.getElementById('collw');
  let ink = null, inkTopEl = null;
  if (host) {
    let y1 = Infinity, y2 = -Infinity, who = null;
    host.querySelectorAll('*').forEach((n) => {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
      const r = n.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const d = drawnOf(n);
      if (d.y2 - d.y1 < 2) return;
      if (d.y1 < y1) { y1 = d.y1; who = n.className || n.tagName; }
      y1 = Math.min(y1, d.y1); y2 = Math.max(y2, d.y2);
    });
    if (isFinite(y1)) { ink = { top: L(y1), bot: L(y2) }; inkTopEl = String(who).slice(0, 24); }
  }
  const cs = host ? getComputedStyle(host) : null;
  const body = document.querySelector('#collw .cl-body');
  const pedge = document.querySelector('.pedge');
  const tabs = document.getElementById('tabbar');
  return {
    frameH: Math.round(A.height),
    shortf: document.getElementById('app').classList.contains('shortf'),
    padT: cs ? Math.round(parseFloat(cs.paddingTop) * 10) / 10 : null,
    padB: cs ? Math.round(parseFloat(cs.paddingBottom) * 10) / 10 : null,
    box: R('#collw .cl'),
    rib: R('#collw .cl-rib'),
    tabsBox: R('#collw .cl-tabs'),
    ink, inkTopEl,
    bodyOver: body ? Math.round(body.scrollHeight - body.clientHeight) : null,
    bodyH: body ? Math.round(body.clientHeight) : null,
    pedgeBot: pedge ? Math.round((pedge.getBoundingClientRect().bottom - A.top) * 10) / 10 : null,
    tabsTop: tabs ? Math.round((tabs.getBoundingClientRect().top - A.top) * 10) / 10 : null,
  };
};

(async () => {
  const br = await launch(chromium);
  const rows = [];
  let bad = 0, undecidable = 0;

  for (const h of FRAMES) {
    const { ctx, page } = await fresh(br, 1080, h);
    await settle(page);
    await drive(page, OPENER);
    await page.waitForTimeout(220);
    const d = await page.evaluate(READ).catch(() => null);
    await ctx.close();
    rows.push(d ? { ...d, want: h } : { want: h, fail: true });
  }

  console.log('[447] `#collw` — 리본 상변 ↔ HUD 하변(142) · 깃발탭 하변 ↔ 탭바 상변\n');
  console.log('  frameH  shortf  pad(위/아래)   상자          리본상변  HUD여유   깃발탭하변 탭바여유  본문넘침');
  for (const d of rows) {
    if (d.fail || !d.box || !d.rib) {
      console.log(`  ${String(d.want).padStart(6)}  — 상자/리본이 안 열렸다 (판정 불가)`); undecidable++; continue;
    }
    if (typeof d.pedgeBot !== 'number' || typeof d.tabsTop !== 'number') {
      console.log(`  ${String(d.want).padStart(6)}  — 기준선(.pedge/#tabbar)을 못 찾았다 (판정 불가)`); undecidable++; continue;
    }
    const gT = Math.round((d.rib.top - d.pedgeBot) * 10) / 10;
    const gB = Math.round((d.tabsTop - (d.tabsBox ? d.tabsBox.bot : d.box.bot)) * 10) / 10;
    d.gapTop = gT; d.gapBot = gB;
    const flag = (gT < 0 || gB < 0) ? '✖' : '✔';
    if (gT < 0 || gB < 0) bad++;
    console.log(`  ${String(d.frameH).padStart(6)}  ${d.shortf ? '.shortf' : '       '} ` +
      `${String(d.padT).padStart(5)}/${String(d.padB).padStart(5)}  ` +
      `${String(d.box.top).padStart(6)}..${String(d.box.bot).padStart(6)}  ` +
      `${String(d.rib.top).padStart(7)}  ${String(gT).padStart(7)}  ` +
      `${String(d.tabsBox ? d.tabsBox.bot : '—').padStart(9)}  ${String(gB).padStart(7)}  ` +
      `${String(d.bodyOver).padStart(7)}  ${flag}`);
  }
  console.log(`\n[447] 침범 ${bad}건 / ${rows.length}프레임 · 판정 불가 ${undecidable}건`);
  console.log('  · 리본이 HUD 를 무는 구간이 있으면 447 결함이 살아 있는 것이다(수리 전 예상: 1842 ≤ h < 2039).');
  console.log('  · 깃발탭 여유가 음수면 436 이 갚은 아래쪽 끝이 깨진 것이다(위를 갚느라 아래를 깨면 안 된다).');
  if (JSONOUT) require('fs').writeFileSync(JSONOUT, JSON.stringify(rows, null, 2));
  await br.close();
  process.exit(bad + undecidable ? 1 : 0);
})();
